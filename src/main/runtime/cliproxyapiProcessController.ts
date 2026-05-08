import { spawn as nodeSpawn } from 'node:child_process'
import { isAbsolute, relative } from 'node:path'

import { redactCliProxyApiText } from '../cliproxyapi'
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

export interface CliProxyApiProcessControllerOptions {
  runtimeHome: RuntimeHomePaths
  configStore: AllmoneConfigStore
  configWriter: CliProxyApiConfigWriter
  installer: CliProxyApiInstaller
  getManagementKey: () => Promise<string | undefined>
  spawn?: CliProxyApiProcessSpawnAdapter
  now?: () => Date
  shutdownTimeoutMs?: number
}

export interface CliProxyApiProcessController {
  getState(): CliProxyApiProcessState
  start(): Promise<CliProxyApiProcessState>
  stop(): Promise<CliProxyApiProcessState>
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
    this.now = options.now ?? (() => new Date())
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 5_000
  }

  getState(): CliProxyApiProcessState {
    return copyState(this.state)
  }

  async ensureInstalledThenStart(): Promise<CliProxyApiProcessState> {
    this.state = {
      ...this.state,
      status: 'installing',
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

  async restart(): Promise<CliProxyApiProcessState> {
    await this.stop()
    return await this.start()
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
