import { spawn as nodeSpawn } from 'node:child_process'

import { redactCliProxyApiText } from '../cli-proxy-api'
import type { UpstreamLoginActionKind } from './types'

export interface ProviderLoginChildProcess {
  pid?: number
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this
  once(event: 'error', listener: (error: Error) => void): this
}

export type ProviderLoginSpawnAdapter = (
  command: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string | undefined>
    stdio: 'ignore'
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

export interface ProviderLoginRunner {
  run(input: ProviderLoginRunInput): Promise<ProviderLoginRunResult>
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

  async run(input: ProviderLoginRunInput): Promise<ProviderLoginRunResult> {
    const args = ['--config', this.configPath, ...toActionArgs(input)]

    return await new Promise((resolve, reject) => {
      let settled = false

      try {
        const child = this.spawn(this.executablePath, args, {
          cwd: this.runtimeDir,
          env: { ...process.env },
          stdio: 'ignore'
        })

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

function defaultSpawn(
  command: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string | undefined>
    stdio: 'ignore'
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
