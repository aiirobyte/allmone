import { spawn as nodeSpawn } from 'node:child_process'

import { redactCliProxyApiText } from '../cli-proxy-api'
import type { UpstreamLoginActionKind } from './types'

type ProviderLoginOutputChunk = Buffer | string

export interface ProviderLoginOutputStream {
  on(event: 'data', listener: (chunk: ProviderLoginOutputChunk) => void): this
}

export interface ProviderLoginChildProcess {
  pid?: number
  stdout?: ProviderLoginOutputStream | null
  stderr?: ProviderLoginOutputStream | null
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this
  once(event: 'error', listener: (error: Error) => void): this
}

export type ProviderLoginSpawnAdapter = (
  command: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string | undefined>
    stdio: ['ignore', 'pipe', 'pipe']
  }
) => ProviderLoginChildProcess

export interface ProviderLoginRunnerOptions {
  executablePath: string
  configPath: string
  runtimeDir: string
  spawn?: ProviderLoginSpawnAdapter
}

export interface ProviderLoginRunInput {
  kind: UpstreamLoginActionKind
  importPath?: string
}

export interface ProviderLoginRunResult {
  ok: boolean
  pid?: number
  exitCode: number | null
  signal: NodeJS.Signals | null
}

export type ProviderLoginEvent =
  | {
      type: 'output'
      kind: UpstreamLoginActionKind
      stream: 'stdout' | 'stderr'
      text: string
    }
  | {
      type: 'codex-device-code'
      kind: 'codex-device-login'
      url: string
      code: string
    }

export interface ProviderLoginRunOptions {
  onEvent?: (event: ProviderLoginEvent) => void
}

export interface ProviderLoginRunner {
  run(
    input: ProviderLoginRunInput,
    options?: ProviderLoginRunOptions
  ): Promise<ProviderLoginRunResult>
}

export function createProviderLoginRunner(
  options: ProviderLoginRunnerOptions
): ProviderLoginRunner {
  return new DefaultProviderLoginRunner(options)
}

class DefaultProviderLoginRunner implements ProviderLoginRunner {
  private readonly executablePath: string
  private readonly configPath: string
  private readonly runtimeDir: string
  private readonly spawn: ProviderLoginSpawnAdapter

  constructor(options: ProviderLoginRunnerOptions) {
    this.executablePath = options.executablePath
    this.configPath = options.configPath
    this.runtimeDir = options.runtimeDir
    this.spawn = options.spawn ?? defaultSpawn
  }

  async run(
    input: ProviderLoginRunInput,
    options: ProviderLoginRunOptions = {}
  ): Promise<ProviderLoginRunResult> {
    const args = ['--config', this.configPath, ...toActionArgs(input)]

    return await new Promise((resolve, reject) => {
      let settled = false
      let codexOutput = ''
      let codexDeviceCodeEmitted = false

      try {
        const child = this.spawn(this.executablePath, args, {
          cwd: this.runtimeDir,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe']
        })

        const onOutput = (stream: 'stdout' | 'stderr', chunk: ProviderLoginOutputChunk) => {
          const text = redactCliProxyApiText(chunk.toString())

          options.onEvent?.({
            type: 'output',
            kind: input.kind,
            stream,
            text
          })

          if (input.kind !== 'codex-device-login' || codexDeviceCodeEmitted) {
            return
          }

          codexOutput = `${codexOutput}${text}`.slice(-2_000)
          const codexDeviceCode = parseCodexDeviceCode(codexOutput)

          if (!codexDeviceCode) {
            return
          }

          codexDeviceCodeEmitted = true
          options.onEvent?.(codexDeviceCode)
        }

        child.stdout?.on('data', (chunk) => onOutput('stdout', chunk))
        child.stderr?.on('data', (chunk) => onOutput('stderr', chunk))

        child.once('exit', (exitCode, signal) => {
          if (settled) {
            return
          }
          settled = true
          resolve({
            ok: exitCode === 0,
            pid: child.pid,
            exitCode,
            signal
          })
        })
        child.once('error', (error) => {
          if (settled) {
            return
          }
          settled = true
          reject(new Error(redactCliProxyApiText(error.message)))
        })
      } catch (error) {
        reject(toRedactedError(error))
      }
    })
  }
}

function toActionArgs(input: ProviderLoginRunInput): string[] {
  switch (input.kind) {
    case 'gemini-cli-login':
      return ['--login']
    case 'antigravity-login':
      return ['--antigravity-login']
    case 'claude-login':
      return ['--claude-login']
    case 'codex-login':
      return ['--codex-login']
    case 'codex-device-login':
      return ['--codex-device-login']
    case 'kimi-login':
      return ['--kimi-login']
    case 'vertex-import':
      if (!input.importPath?.trim()) {
        throw new Error('Vertex import path is required')
      }
      return ['--vertex-import', input.importPath]
  }
}

function parseCodexDeviceCode(output: string): ProviderLoginEvent | null {
  const url = output.match(/Codex device URL:\s*(https?:\/\/\S+)/i)?.[1]
  const code = output.match(/Codex device code:\s*([A-Za-z0-9-]+)/i)?.[1]

  if (!url || !code) {
    return null
  }

  return {
    type: 'codex-device-code',
    kind: 'codex-device-login',
    url,
    code
  }
}

function defaultSpawn(
  command: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string | undefined>
    stdio: ['ignore', 'pipe', 'pipe']
  }
): ProviderLoginChildProcess {
  return nodeSpawn(command, args, options)
}

function toRedactedError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(redactCliProxyApiText(error.message))
  }

  return new Error('Provider login command failed')
}
