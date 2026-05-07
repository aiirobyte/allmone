import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { parse, stringify } from 'yaml'

import type {
  AllmoneConfigStore,
  AllmoneSoftwareConfig
} from './allmoneConfigStore'
import { ensureRuntimeHome, type RuntimeHomePaths } from './runtimeHome'

export interface CliProxyApiConfigWriterOptions {
  runtimeHome: RuntimeHomePaths
  configStore: AllmoneConfigStore
}

export interface CliProxyApiConfigWriter {
  writeManagedConfig(
    config?: AllmoneSoftwareConfig
  ): Promise<AllmoneSoftwareConfig>
  saveOutputPort(port: number): Promise<AllmoneSoftwareConfig>
}

export function createCliProxyApiConfigWriter(
  options: CliProxyApiConfigWriterOptions
): CliProxyApiConfigWriter {
  return new FileCliProxyApiConfigWriter(options)
}

class FileCliProxyApiConfigWriter implements CliProxyApiConfigWriter {
  private readonly runtimeHome: RuntimeHomePaths
  private readonly configStore: AllmoneConfigStore

  constructor(options: CliProxyApiConfigWriterOptions) {
    this.runtimeHome = options.runtimeHome
    this.configStore = options.configStore
  }

  async writeManagedConfig(
    config?: AllmoneSoftwareConfig
  ): Promise<AllmoneSoftwareConfig> {
    await ensureRuntimeHome(this.runtimeHome)
    await mkdir(join(this.runtimeHome.runtimeDir, 'auth'), { recursive: true })

    const softwareConfig = config ?? await this.configStore.load()
    const current = await this.readRuntimeConfig()
    const next = patchManagedRuntimeConfig(
      current,
      softwareConfig,
      this.runtimeHome
    )

    await writeFile(
      softwareConfig.runtime.configPath,
      stringify(next, { lineWidth: 0 })
    )

    return softwareConfig
  }

  async saveOutputPort(port: number): Promise<AllmoneSoftwareConfig> {
    const normalizedPort = validateOutputPort(port)
    const config = await this.configStore.save({
      runtime: {
        port: normalizedPort
      }
    })

    await this.writeManagedConfig(config)
    return config
  }

  private async readRuntimeConfig(): Promise<Record<string, unknown>> {
    try {
      const parsed = parse(await readFile(this.runtimeHome.runtimeConfigPath, 'utf8'))

      if (parsed === null || parsed === undefined) {
        return {}
      }

      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid CLIProxyAPI config')
      }

      return parsed as Record<string, unknown>
    } catch (error) {
      if (isMissingFileError(error)) {
        return {}
      }

      throw error instanceof Error
        ? new Error(error.message)
        : new Error('Invalid CLIProxyAPI config YAML')
    }
  }
}

export function validateOutputPort(port: number): number {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid port')
  }

  return port
}

function patchManagedRuntimeConfig(
  current: Record<string, unknown>,
  config: AllmoneSoftwareConfig,
  runtimeHome: RuntimeHomePaths
): Record<string, unknown> {
  const remoteManagement = asRecord(current['remote-management'])

  return {
    ...current,
    host: config.runtime.host,
    port: config.runtime.port,
    'auth-dir': toHomePath(join(runtimeHome.runtimeDir, 'auth'), runtimeHome),
    'logging-to-file': true,
    'remote-management': {
      ...remoteManagement,
      'allow-remote': false
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function toHomePath(path: string, runtimeHome: RuntimeHomePaths): string {
  if (path === runtimeHome.rootDir) {
    return '~/.allmone'
  }

  if (!isPathInside(path, runtimeHome.rootDir)) {
    return path
  }

  return `~/.allmone/${relative(runtimeHome.rootDir, path)
    .split(sep)
    .join('/')}`
}

function isPathInside(path: string, parentDir: string): boolean {
  const relativePath = relative(parentDir, path)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  )
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
