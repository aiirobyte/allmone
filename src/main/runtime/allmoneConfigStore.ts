import { readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parse, stringify } from 'yaml'

import { ensureRuntimeHome, type RuntimeHomePaths } from './runtimeHome'

export const CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL =
  'https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest'
export const CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL =
  'https://github.com/router-for-me/CLIProxyAPI/releases/latest'

const CONFIG_VERSION = 1
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8317

export interface AllmoneSoftwareConfig {
  version: 1
  cliproxyapi: {
    releaseMetadataUrl: string
    releasePageUrl: string
    localExecutablePath: string
  }
  runtime: {
    host: string
    port: number
    configPath: string
    apiBaseUrl: string
    managementBaseUrl: string
  }
}

export interface AllmoneSoftwareConfigInput {
  version?: number
  cliproxyapi?: Partial<AllmoneSoftwareConfig['cliproxyapi']>
  runtime?: Partial<AllmoneSoftwareConfig['runtime']>
}

export interface AllmoneConfigStoreOptions {
  runtimeHome: RuntimeHomePaths
  legacySettingsFilePath?: string
}

export interface AllmoneConfigStore {
  load(): Promise<AllmoneSoftwareConfig>
  save(input: AllmoneSoftwareConfigInput): Promise<AllmoneSoftwareConfig>
}

interface LegacyRuntimeSettings {
  connection?: {
    baseUrl?: string
  }
}

export function createAllmoneConfigStore(
  options: AllmoneConfigStoreOptions
): AllmoneConfigStore {
  return new FileAllmoneConfigStore(options)
}

class FileAllmoneConfigStore implements AllmoneConfigStore {
  private readonly runtimeHome: RuntimeHomePaths
  private readonly legacySettingsFilePath: string | undefined

  constructor(options: AllmoneConfigStoreOptions) {
    this.runtimeHome = options.runtimeHome
    this.legacySettingsFilePath = options.legacySettingsFilePath
  }

  async load(): Promise<AllmoneSoftwareConfig> {
    await ensureRuntimeHome(this.runtimeHome)

    const raw = await this.readConfigFile()
    const config =
      raw === undefined
        ? await this.createDefaultConfig()
        : this.normalizeConfig(parseConfig(raw))

    await this.writeConfig(config)
    return config
  }

  async save(input: AllmoneSoftwareConfigInput): Promise<AllmoneSoftwareConfig> {
    const current = await this.load()
    const config = this.normalizeConfig({
      version: input.version ?? current.version,
      cliproxyapi: {
        ...current.cliproxyapi,
        ...input.cliproxyapi
      },
      runtime: {
        ...current.runtime,
        ...input.runtime
      }
    })

    await this.writeConfig(config)
    return config
  }

  private async readConfigFile(): Promise<string | undefined> {
    try {
      return await readFile(this.runtimeHome.configPath, 'utf8')
    } catch (error) {
      if (isMissingFileError(error)) {
        return undefined
      }

      throw error
    }
  }

  private async createDefaultConfig(): Promise<AllmoneSoftwareConfig> {
    const legacy = await this.readLegacyRuntimeSettings()
    const legacyRuntime = legacy?.connection?.baseUrl
      ? parseLegacyManagementBaseUrl(legacy.connection.baseUrl)
      : undefined

    return this.normalizeConfig({
      version: CONFIG_VERSION,
      cliproxyapi: {
        releaseMetadataUrl: CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL,
        releasePageUrl: CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL,
        localExecutablePath: this.runtimeHome.cliProxyApiExecutablePath
      },
      runtime: {
        host: legacyRuntime?.host ?? DEFAULT_HOST,
        port: legacyRuntime?.port ?? DEFAULT_PORT,
        configPath: this.runtimeHome.runtimeConfigPath
      }
    })
  }

  private async readLegacyRuntimeSettings(): Promise<LegacyRuntimeSettings | undefined> {
    if (!this.legacySettingsFilePath) {
      return undefined
    }

    try {
      const raw = await readFile(this.legacySettingsFilePath, 'utf8')
      const parsed = JSON.parse(raw) as LegacyRuntimeSettings

      return parsed && typeof parsed === 'object' ? parsed : undefined
    } catch {
      return undefined
    }
  }

  private normalizeConfig(value: unknown): AllmoneSoftwareConfig {
    const record = asRecord(value, 'config')
    const cliproxyapi = asRecord(record.cliproxyapi, 'cliproxyapi')
    const runtime = asRecord(record.runtime, 'runtime')
    const host = normalizeHost(runtime.host)
    const port = normalizePort(runtime.port)

    return {
      version: CONFIG_VERSION,
      cliproxyapi: {
        releaseMetadataUrl: validateHttpUrl(
          cliproxyapi.releaseMetadataUrl,
          'releaseMetadataUrl'
        ),
        releasePageUrl: validateHttpUrl(
          cliproxyapi.releasePageUrl,
          'releasePageUrl'
        ),
        localExecutablePath: validateManagedPath(
          cliproxyapi.localExecutablePath,
          'localExecutablePath',
          this.runtimeHome.runtimeBinDir,
          this.runtimeHome
        )
      },
      runtime: {
        host,
        port,
        configPath: validateRuntimeConfigPath(
          runtime.configPath,
          this.runtimeHome
        ),
        apiBaseUrl: buildApiBaseUrl(host, port),
        managementBaseUrl: buildManagementBaseUrl(host, port)
      }
    }
  }

  private async writeConfig(config: AllmoneSoftwareConfig): Promise<void> {
    await writeFile(
      this.runtimeHome.configPath,
      stringify(toConfigFile(config, this.runtimeHome), { lineWidth: 0 })
    )
  }
}

function parseConfig(raw: string): unknown {
  try {
    const parsed = parse(raw)

    if (parsed === null || parsed === undefined) {
      throw new Error('config.yaml is empty')
    }

    return parsed
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Invalid allmone config YAML'
    )
  }
}

function asRecord(
  value: unknown,
  field: string
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}`)
  }

  return value as Record<string, unknown>
}

function normalizeHost(value: unknown): string {
  if (value === '127.0.0.1' || value === 'localhost') {
    return value
  }

  return DEFAULT_HOST
}

function normalizePort(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 65_535
  ) {
    return DEFAULT_PORT
  }

  return value
}

function validateHttpUrl(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${field}`)
  }

  try {
    const url = new URL(value.trim())

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`Invalid ${field}`)
    }

    return url.toString()
  } catch {
    throw new Error(`Invalid ${field}`)
  }
}

function validateManagedPath(
  value: unknown,
  field: string,
  parentDir: string,
  runtimeHome: RuntimeHomePaths
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${field}`)
  }

  const expanded = expandHomePath(value.trim(), runtimeHome)

  if (!isPathInside(expanded, parentDir)) {
    throw new Error(`Invalid ${field}`)
  }

  return expanded
}

function validateRuntimeConfigPath(
  value: unknown,
  runtimeHome: RuntimeHomePaths
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Invalid configPath')
  }

  const expanded = expandHomePath(value.trim(), runtimeHome)

  if (expanded !== runtimeHome.runtimeConfigPath) {
    throw new Error('Invalid configPath')
  }

  return expanded
}

function expandHomePath(value: string, runtimeHome: RuntimeHomePaths): string {
  if (value === '~') {
    return runtimeHome.homeDir
  }

  if (value.startsWith('~/')) {
    return join(runtimeHome.homeDir, value.slice(2))
  }

  return resolve(value)
}

function toConfigFile(
  config: AllmoneSoftwareConfig,
  runtimeHome: RuntimeHomePaths
): AllmoneSoftwareConfigInput {
  return {
    version: config.version,
    cliproxyapi: {
      releaseMetadataUrl: config.cliproxyapi.releaseMetadataUrl,
      releasePageUrl: config.cliproxyapi.releasePageUrl,
      localExecutablePath: toHomePath(
        config.cliproxyapi.localExecutablePath,
        runtimeHome
      )
    },
    runtime: {
      host: config.runtime.host,
      port: config.runtime.port,
      configPath: toHomePath(config.runtime.configPath, runtimeHome),
      apiBaseUrl: config.runtime.apiBaseUrl,
      managementBaseUrl: config.runtime.managementBaseUrl
    }
  }
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

function buildApiBaseUrl(host: string, port: number): string {
  return `http://${host}:${port}/v1`
}

function buildManagementBaseUrl(host: string, port: number): string {
  return `http://${host}:${port}/v0/management`
}

function parseLegacyManagementBaseUrl(
  value: string
): { host: string; port: number } | undefined {
  try {
    const url = new URL(value)
    const port = Number(url.port)
    const host = normalizeHost(url.hostname)

    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      return undefined
    }

    return { host, port }
  } catch {
    return undefined
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
