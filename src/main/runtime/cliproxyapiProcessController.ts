import { execFile, spawn as nodeSpawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { isAbsolute, relative } from 'node:path'
import { promisify } from 'node:util'

import { redactCliProxyApiText } from '../cli-proxy-api'
import type { AllmoneConfigStore } from './allmoneConfigStore'
import type { CliProxyApiConfigWriter } from './cliproxyapiConfigWriter'
import type {
  CliProxyApiInstallResult,
  CliProxyApiInstaller
} from './cliproxyapiInstaller'
import type { RuntimeHomePaths } from './runtimeHome'

export type CliProxyApiProcessStatus =
  | 'missing'
  | 'installing'
  | 'ready'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'crashed'
  | 'update_failed'
  | 'launch_failed'

export interface CliProxyApiProcessState {
  status: CliProxyApiProcessStatus
  executablePath?: string
  configPath?: string
  pid?: number
  startedAt?: string
  stoppedAt?: string
  lastExitCode?: number | null
  lastSignal?: NodeJS.Signals | string | null
  lastError?: string
  install?: {
    status: CliProxyApiInstallResult['status']
    version?: string
    assetName?: string
    releasePageUrl?: string
    checksumSha256?: string
    metadataFetchError?: string
  }
}

export interface ManagedCliProxyApiProcess {
  pid: number
  command: string
}

export interface CliProxyApiChildProcess {
  pid?: number
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this
  once(event: 'error', listener: (error: Error) => void): this
  kill(signal?: NodeJS.Signals): boolean
}

export type CliProxyApiProcessSpawnAdapter = (
  command: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string | undefined>
    stdio: 'ignore'
  }
) => CliProxyApiChildProcess

export type CliProxyApiPortInspector = (
  host: string,
  port: number
) => Promise<ManagedCliProxyApiProcess[]>

export type CliProxyApiManagedProcessFinder = (input: {
  executablePath: string
  configPath: string
  currentPid?: number
}) => Promise<ManagedCliProxyApiProcess[]>

export type CliProxyApiProcessKiller = (pid: number) => Promise<void>

export type CliProxyApiExecutableExists = (
  executablePath: string
) => Promise<boolean>

export interface CliProxyApiProcessControllerOptions {
  runtimeHome: RuntimeHomePaths
  configStore: AllmoneConfigStore
  configWriter: CliProxyApiConfigWriter
  installer: CliProxyApiInstaller
  getManagementKey: () => Promise<string | undefined>
  spawn?: CliProxyApiProcessSpawnAdapter
  inspectPort?: CliProxyApiPortInspector
  findManagedProcesses?: CliProxyApiManagedProcessFinder
  killProcess?: CliProxyApiProcessKiller
  executableExists?: CliProxyApiExecutableExists
  now?: () => Date
  shutdownTimeoutMs?: number
}

export interface CliProxyApiProcessController {
  getState(): CliProxyApiProcessState
  start(): Promise<CliProxyApiProcessState>
  stop(): Promise<CliProxyApiProcessState>
  shutdownAll(): Promise<CliProxyApiProcessState>
  restart(): Promise<CliProxyApiProcessState>
  checkForUpdate(): Promise<CliProxyApiProcessState>
  ensureInstalledThenStart(): Promise<CliProxyApiProcessState>
}

export function createCliProxyApiProcessController(
  options: CliProxyApiProcessControllerOptions
): CliProxyApiProcessController {
  return new DefaultCliProxyApiProcessController(options)
}

class DefaultCliProxyApiProcessController
  implements CliProxyApiProcessController
{
  private readonly runtimeHome: RuntimeHomePaths
  private readonly configStore: AllmoneConfigStore
  private readonly configWriter: CliProxyApiConfigWriter
  private readonly installer: CliProxyApiInstaller
  private readonly getManagementKey: () => Promise<string | undefined>
  private readonly spawn: CliProxyApiProcessSpawnAdapter
  private readonly inspectPort: CliProxyApiPortInspector
  private readonly findManagedProcesses: CliProxyApiManagedProcessFinder
  private readonly killProcess: CliProxyApiProcessKiller
  private readonly executableExists: CliProxyApiExecutableExists
  private readonly now: () => Date
  private readonly shutdownTimeoutMs: number
  private child: CliProxyApiChildProcess | undefined
  private state: CliProxyApiProcessState = { status: 'missing' }
  private stopWait:
    | {
        promise: Promise<CliProxyApiProcessState>
        resolve: (state: CliProxyApiProcessState) => void
      }
    | undefined
  private stopTimeout: ReturnType<typeof setTimeout> | undefined

  constructor(options: CliProxyApiProcessControllerOptions) {
    this.runtimeHome = options.runtimeHome
    this.configStore = options.configStore
    this.configWriter = options.configWriter
    this.installer = options.installer
    this.getManagementKey = options.getManagementKey
    this.spawn = options.spawn ?? defaultSpawn
    this.inspectPort = options.inspectPort ?? defaultInspectPort
    this.findManagedProcesses =
      options.findManagedProcesses ?? defaultFindManagedProcesses
    this.killProcess = options.killProcess ?? defaultKillProcess
    this.executableExists = options.executableExists ?? defaultExecutableExists
    this.now = options.now ?? (() => new Date())
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 5_000
  }

  getState(): CliProxyApiProcessState {
    return copyState(this.state)
  }

  async ensureInstalledThenStart(): Promise<CliProxyApiProcessState> {
    this.state = {
      ...this.state,
      status: 'starting',
      lastError: undefined
    }

    const executablePath = await this.getConfiguredExecutablePathOrUndefined()
    const hasExecutable = executablePath
      ? await this.executableExists(executablePath)
      : false

    this.state = {
      ...this.state,
      status: hasExecutable ? 'starting' : 'installing',
      executablePath,
      lastError: undefined
    }

    let install: CliProxyApiInstallResult

    try {
      install = await this.installer.ensureInstalled()
    } catch (error) {
      this.state = {
        ...this.state,
        status: 'update_failed',
        lastError: toRedactedMessage(error)
      }
      return this.getState()
    }

    this.state = {
      ...this.state,
      status: 'ready',
      executablePath: install.executablePath,
      install: sanitizeInstallResult(install),
      lastError: install.metadataFetchError
        ? redactCliProxyApiText(install.metadataFetchError)
        : undefined
    }

    return await this.start()
  }

  async checkForUpdate(): Promise<CliProxyApiProcessState> {
    const wasRunning = this.state.status === 'running' && Boolean(this.child)
    this.state = {
      ...this.state,
      status: 'installing',
      lastError: undefined
    }

    let install: CliProxyApiInstallResult

    try {
      install = await this.installer.checkForUpdate()
    } catch (error) {
      this.state = {
        ...this.state,
        status: 'update_failed',
        lastError: toRedactedMessage(error)
      }
      return this.getState()
    }

    this.state = {
      ...this.state,
      status: wasRunning ? 'running' : 'ready',
      executablePath: install.executablePath,
      install: sanitizeInstallResult(install),
      lastError: install.metadataFetchError
        ? redactCliProxyApiText(install.metadataFetchError)
        : undefined
    }

    if (wasRunning && install.status === 'updated') {
      return await this.restart()
    }

    return this.getState()
  }

  async start(): Promise<CliProxyApiProcessState> {
    if (this.child && isActiveProcessStatus(this.state.status)) {
      return this.getState()
    }

    let executablePath: string
    let configPath: string
    let managementKey: string

    try {
      const config = await this.configWriter.writeManagedConfig()
      const loadedConfig = await this.configStore.load()
      executablePath = validateManagedExecutablePath(
        loadedConfig.cliproxyapi.localExecutablePath,
        this.runtimeHome
      )
      configPath = config.runtime.configPath
      managementKey = (await this.getManagementKey())?.trim() ?? ''

      if (!managementKey) {
        throw new Error('Management key is not configured')
      }

      let portOccupants = await this.inspectPort(
        loadedConfig.runtime.host,
        loadedConfig.runtime.port
      )
      const managedPortOccupants = portOccupants.filter((processInfo) =>
        isMatchingManagedProcess(processInfo, executablePath, configPath)
      )

      if (
        managedPortOccupants.length > 0 &&
        managedPortOccupants.length === portOccupants.length
      ) {
        for (const managedProcess of managedPortOccupants) {
          await this.killProcess(managedProcess.pid)
        }

        portOccupants = await this.inspectPort(
          loadedConfig.runtime.host,
          loadedConfig.runtime.port
        )
      }

      if (portOccupants.length > 0) {
        throw new Error(
          formatPortInUseDiagnostic({
            host: loadedConfig.runtime.host,
            port: loadedConfig.runtime.port,
            executablePath,
            configPath,
            occupants: portOccupants
          })
        )
      }
    } catch (error) {
      this.state = {
        ...this.state,
        status: 'launch_failed',
        lastError: toRedactedMessage(error)
      }
      return this.getState()
    }

    this.state = {
      ...this.state,
      status: 'starting',
      executablePath,
      configPath,
      lastError: undefined
    }

    try {
      const child = this.spawn(
        executablePath,
        ['--config', configPath],
        {
          cwd: this.runtimeHome.runtimeDir,
          env: {
            ...process.env,
            MANAGEMENT_PASSWORD: managementKey
          },
          stdio: 'ignore'
        }
      )

      this.child = child
      child.once('exit', (code, signal) => this.handleExit(child, code, signal))
      child.once('error', (error) => this.handleLaunchError(child, error))

      this.state = {
        ...this.state,
        status: 'running',
        pid: child.pid,
        startedAt: this.now().toISOString(),
        stoppedAt: undefined,
        lastExitCode: undefined,
        lastSignal: undefined,
        lastError: undefined
      }
      return this.getState()
    } catch (error) {
      this.child = undefined
      this.state = {
        ...this.state,
        status: 'launch_failed',
        pid: undefined,
        lastError: toRedactedMessage(error)
      }
      return this.getState()
    }
  }

  async stop(): Promise<CliProxyApiProcessState> {
    const child = this.child

    if (!child) {
      this.state = {
        ...this.state,
        status: 'stopped',
        pid: undefined,
        stoppedAt: this.now().toISOString()
      }
      return this.getState()
    }

    if (this.stopWait) {
      return await this.stopWait.promise
    }

    this.state = {
      ...this.state,
      status: 'stopping'
    }

    let resolveStop: (state: CliProxyApiProcessState) => void = () => {}
    const promise = new Promise<CliProxyApiProcessState>((resolve) => {
      resolveStop = resolve
    })

    this.stopWait = { promise, resolve: resolveStop }
    this.stopTimeout = setTimeout(() => {
      child.kill('SIGKILL')
    }, this.shutdownTimeoutMs)
    child.kill('SIGTERM')

    return await promise
  }

  async shutdownAll(): Promise<CliProxyApiProcessState> {
    const executablePath =
      this.state.executablePath ??
      (await this.configStore.load()).cliproxyapi.localExecutablePath
    const configPath =
      this.state.configPath ??
      (await this.configWriter.writeManagedConfig()).runtime.configPath
    const stoppedState = await this.stop()
    const managedProcesses = await this.findManagedProcesses({
      executablePath,
      configPath,
      currentPid: process.pid
    })

    for (const managedProcess of managedProcesses) {
      await this.killProcess(managedProcess.pid)
    }

    return stoppedState
  }

  async restart(): Promise<CliProxyApiProcessState> {
    await this.stop()
    return await this.start()
  }

  private async getConfiguredExecutablePathOrUndefined(): Promise<
    string | undefined
  > {
    try {
      return validateManagedExecutablePath(
        (await this.configStore.load()).cliproxyapi.localExecutablePath,
        this.runtimeHome
      )
    } catch {
      return undefined
    }
  }

  private handleExit(
    child: CliProxyApiChildProcess,
    code: number | null,
    signal: NodeJS.Signals | null
  ): void {
    if (child !== this.child) {
      return
    }

    if (this.state.status === 'stopping') {
      this.finishStop(code, signal)
      return
    }

    this.child = undefined
    this.state = {
      ...this.state,
      status: code === 0 ? 'stopped' : 'crashed',
      pid: undefined,
      stoppedAt: this.now().toISOString(),
      lastExitCode: code,
      lastSignal: signal
    }
  }

  private handleLaunchError(
    child: CliProxyApiChildProcess,
    error: Error
  ): void {
    if (child !== this.child) {
      return
    }

    this.child = undefined
    this.state = {
      ...this.state,
      status: 'launch_failed',
      pid: undefined,
      lastError: toRedactedMessage(error)
    }
  }

  private finishStop(
    code: number | null,
    signal: NodeJS.Signals | null
  ): void {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout)
      this.stopTimeout = undefined
    }

    this.child = undefined
    this.state = {
      ...this.state,
      status: 'stopped',
      pid: undefined,
      stoppedAt: this.now().toISOString(),
      lastExitCode: code,
      lastSignal: signal
    }

    const stopWait = this.stopWait
    this.stopWait = undefined
    stopWait?.resolve(this.getState())
  }
}

function defaultSpawn(
  command: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string | undefined>
    stdio: 'ignore'
  }
): CliProxyApiChildProcess {
  return nodeSpawn(command, args, options)
}

const execFileAsync = promisify(execFile)

async function defaultInspectPort(
  host: string,
  port: number
): Promise<ManagedCliProxyApiProcess[]> {
  try {
    const { stdout } = await execFileAsync('lsof', [
      '-nP',
      `-iTCP@${host}:${port}`,
      '-sTCP:LISTEN',
      '-t'
    ])
    const pids = stdout
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)

    return await describeProcesses(pids)
  } catch {
    return []
  }
}

async function defaultFindManagedProcesses(input: {
  executablePath: string
  configPath: string
  currentPid?: number
}): Promise<ManagedCliProxyApiProcess[]> {
  try {
    const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,command='])

    return stdout
      .split('\n')
      .map(parseProcessLine)
      .filter((processInfo): processInfo is ManagedCliProxyApiProcess =>
        Boolean(processInfo)
      )
      .filter(
        (processInfo) =>
          processInfo.pid !== input.currentPid &&
          processInfo.command.includes(input.executablePath) &&
          processInfo.command.includes(input.configPath)
      )
  } catch {
    return []
  }
}

async function defaultKillProcess(pid: number): Promise<void> {
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // The process may already have exited.
  }
}

async function defaultExecutableExists(executablePath: string): Promise<boolean> {
  try {
    await access(executablePath)
    return true
  } catch {
    return false
  }
}

async function describeProcesses(
  pids: number[]
): Promise<ManagedCliProxyApiProcess[]> {
  const uniquePids = [...new Set(pids)]
  const processes: ManagedCliProxyApiProcess[] = []

  for (const pid of uniquePids) {
    try {
      const { stdout } = await execFileAsync('ps', [
        '-p',
        String(pid),
        '-o',
        'command='
      ])
      processes.push({
        pid,
        command: stdout.trim() || 'Unknown command'
      })
    } catch {
      processes.push({ pid, command: 'Unknown command' })
    }
  }

  return processes
}

function parseProcessLine(line: string): ManagedCliProxyApiProcess | undefined {
  const match = line.trim().match(/^(\d+)\s+(.+)$/)

  if (!match) {
    return undefined
  }

  return {
    pid: Number(match[1]),
    command: match[2] ?? ''
  }
}

function isMatchingManagedProcess(
  processInfo: ManagedCliProxyApiProcess,
  executablePath: string,
  configPath: string
): boolean {
  return (
    processInfo.command.includes(executablePath) &&
    processInfo.command.includes(configPath)
  )
}

function isActiveProcessStatus(status: CliProxyApiProcessStatus): boolean {
  return status === 'starting' || status === 'running' || status === 'stopping'
}

function sanitizeInstallResult(
  result: CliProxyApiInstallResult
): CliProxyApiProcessState['install'] {
  return {
    status: result.status,
    version: result.version,
    assetName: result.assetName,
    releasePageUrl: result.releasePageUrl,
    checksumSha256: result.checksumSha256,
    metadataFetchError: result.metadataFetchError
      ? redactCliProxyApiText(result.metadataFetchError)
      : undefined
  }
}

function formatPortInUseDiagnostic(input: {
  host: string
  port: number
  executablePath: string
  configPath: string
  occupants: ManagedCliProxyApiProcess[]
}): string {
  const occupants = input.occupants
    .map((processInfo) => `PID ${processInfo.pid}: ${processInfo.command}`)
    .join('; ')

  return [
    `Port ${input.port} on ${input.host} is already in use.`,
    `Occupying processes: ${occupants || 'unknown process'}.`,
    'Managed CLIProxyAPI was not started.',
    'Stop the listed process or choose another Output Port, then Start again.',
    `Executable: ${input.executablePath}.`,
    `Config: ${input.configPath}.`
  ].join(' ')
}

function validateManagedExecutablePath(
  executablePath: string,
  runtimeHome: RuntimeHomePaths
): string {
  if (!isPathInside(executablePath, runtimeHome.runtimeBinDir)) {
    throw new Error('Invalid localExecutablePath')
  }

  return executablePath
}

function isPathInside(path: string, parentDir: string): boolean {
  const relativePath = relative(parentDir, path)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  )
}

function toRedactedMessage(error: unknown): string {
  return redactCliProxyApiText(error instanceof Error ? error.message : String(error))
}

function copyState(state: CliProxyApiProcessState): CliProxyApiProcessState {
  return {
    ...state,
    install: state.install ? { ...state.install } : undefined
  }
}
