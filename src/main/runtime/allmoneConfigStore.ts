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
const DEFAULT_TIMEOUT_MS = 5_000

export interface AllmoneSoftwareConfig {
  version: 1
  cliproxyapi: {
    releaseMetadataUrl: string
    releasePageUrl: string
    localExecutablePath: string
  }
  localOutputKeys: AllmoneLocalOutputKeyConfigRecord[]
  runtime: {
    host: string
    port: number
    timeoutMs: number
    configPath: string
    serviceOrigin: string
    apiBaseUrl: string
    managementBaseUrl: string
  }
}

export interface AllmoneSoftwareConfigInput {
  version?: number
  cliproxyapi?: Partial<AllmoneSoftwareConfig['cliproxyapi']> & {
    runtime?: Partial<AllmoneSoftwareConfig['runtime']>
  }
  localOutputKeys?: AllmoneLocalOutputKeyConfigRecord[]
  runtime?: Partial<AllmoneSoftwareConfig['runtime']>
}

export interface AllmoneLocalOutputKeyConfigRecord {
  id: string
  name: string
  preview: string
  valueEncrypted: string
  isDefault: boolean
}

export interface AllmoneConfigSafeStorageAdapter {
  isEncryptionAvailable(): boolean
  encryptString(value: string): Buffer
  decryptString(value: Buffer): string
}

export interface AllmoneConfigStoreOptions {
  runtimeHome: RuntimeHomePaths
  safeStorage?: AllmoneConfigSafeStorageAdapter
}

export interface AllmoneConfigStore {
  load(): Promise<AllmoneSoftwareConfig>
  save(input: AllmoneSoftwareConfigInput): Promise<AllmoneSoftwareConfig>
  encryptLocalOutputKeyValue(value: string): string
  decryptLocalOutputKeyValue(valueEncrypted: string): string
}

export function createAllmoneConfigStore(
  options: AllmoneConfigStoreOptions
): AllmoneConfigStore {
  return new FileAllmoneConfigStore(options)
}

class FileAllmoneConfigStore implements AllmoneConfigStore {
  private readonly runtimeHome: RuntimeHomePaths
  private readonly safeStorage: AllmoneConfigSafeStorageAdapter | undefined

  constructor(options: AllmoneConfigStoreOptions) {
    this.runtimeHome = options.runtimeHome
    this.safeStorage = options.safeStorage
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
        ...input.cliproxyapi,
        runtime: {
          ...current.runtime,
          ...input.cliproxyapi?.runtime,
          ...input.runtime
        }
      },
      localOutputKeys: input.localOutputKeys ?? current.localOutputKeys
    })

    await this.writeConfig(config)
    return config
  }

  encryptLocalOutputKeyValue(value: string): string {
    const trimmed = value.trim()

    if (!trimmed) {
      throw new Error('Local output key is required')
    }

    const safeStorage = this.requireSafeStorage()
    return safeStorage.encryptString(trimmed).toString('base64')
  }

  decryptLocalOutputKeyValue(valueEncrypted: string): string {
    const safeStorage = this.requireSafeStorage()
    return safeStorage.decryptString(Buffer.from(valueEncrypted, 'base64'))
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
    return this.normalizeConfig({
      version: CONFIG_VERSION,
      cliproxyapi: {
        releaseMetadataUrl: CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL,
        releasePageUrl: CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL,
        localExecutablePath: this.runtimeHome.cliProxyApiExecutablePath,
        runtime: {
          host: DEFAULT_HOST,
          port: DEFAULT_PORT,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          configPath: this.runtimeHome.runtimeConfigPath
        }
      }
    })
  }

  private normalizeConfig(value: unknown): AllmoneSoftwareConfig {
    const record = asRecord(value, 'config')
    const cliproxyapi = asRecord(record.cliproxyapi, 'cliproxyapi')
    const runtime = asRecord(cliproxyapi.runtime, 'cliproxyapi.runtime')
    const host = normalizeHost(runtime.host)
    const port = normalizePort(runtime.port)
    const timeoutMs = normalizeTimeoutMs(runtime.timeoutMs)
    const localOutputKeys = normalizeLocalOutputKeys(record.localOutputKeys)

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
      localOutputKeys,
      runtime: {
        host,
        port,
        timeoutMs,
        configPath: validateRuntimeConfigPath(
          runtime.configPath,
          this.runtimeHome
        ),
        serviceOrigin: buildServiceOrigin(host, port),
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

  private requireSafeStorage(): AllmoneConfigSafeStorageAdapter {
    if (!this.safeStorage?.isEncryptionAvailable()) {
      throw new Error('Encrypted local output key storage is unavailable')
    }

    return this.safeStorage
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

function normalizeTimeoutMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.round(value)
}

function normalizeLocalOutputKeys(value: unknown): AllmoneLocalOutputKeyConfigRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()
  const records: AllmoneLocalOutputKeyConfigRecord[] = []

  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue
    }

    const record = item as Record<string, unknown>
    const id = normalizeTrimmedString(record.id)
    const name = normalizeTrimmedString(record.name)
    const preview = normalizeTrimmedString(record.preview)
    const valueEncrypted = normalizeTrimmedString(record.valueEncrypted)

    if (!id || !valueEncrypted || seenIds.has(id)) {
      continue
    }

    seenIds.add(id)
    records.push({
      id,
      name: name || 'Local output key',
      preview: preview || '[REDACTED]',
      valueEncrypted,
      isDefault: record.default === true || record.isDefault === true
    })
  }

  if (records.length === 0) {
    return records
  }

  let defaultSeen = false
  const normalized = records.map((record) => {
    if (record.isDefault && !defaultSeen) {
      defaultSeen = true
      return record
    }

    return {
      ...record,
      isDefault: false
    }
  })

  if (!defaultSeen) {
    normalized[0] = {
      ...normalized[0],
      isDefault: true
    }
  }

  return normalized
}

function normalizeTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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
  const fileConfig: AllmoneSoftwareConfigInput = {
    version: config.version,
    cliproxyapi: {
      releaseMetadataUrl: config.cliproxyapi.releaseMetadataUrl,
      releasePageUrl: config.cliproxyapi.releasePageUrl,
      localExecutablePath: toHomePath(
        config.cliproxyapi.localExecutablePath,
        runtimeHome
      ),
      runtime: {
        host: config.runtime.host,
        port: config.runtime.port,
        timeoutMs: config.runtime.timeoutMs,
        configPath: toHomePath(config.runtime.configPath, runtimeHome)
      }
    }
  }

  if (config.localOutputKeys.length > 0) {
    fileConfig.localOutputKeys = config.localOutputKeys.map((key) => ({
      id: key.id,
      name: key.name,
      preview: key.preview,
      valueEncrypted: key.valueEncrypted,
      isDefault: key.isDefault
    }))
  }

  return fileConfig
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
  return `${buildServiceOrigin(host, port)}/v1`
}

function buildServiceOrigin(host: string, port: number): string {
  return `http://${host}:${port}`
}

function buildManagementBaseUrl(host: string, port: number): string {
  return `http://${host}:${port}/v0/management`
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
