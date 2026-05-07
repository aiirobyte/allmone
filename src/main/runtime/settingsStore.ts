import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL } from '../cliproxyapi'
import type {
  RuntimeConnectionSettings,
  RuntimeConnectionSettingsInput,
  RuntimeLoadedSettings
} from './types'

const SETTINGS_FILE_NAME = 'runtime-settings.json'
const DEFAULT_TIMEOUT_MS = 5_000

export interface RuntimeAppAdapter {
  getPath(name: 'userData'): string
}

export interface RuntimeSafeStorageAdapter {
  isEncryptionAvailable(): boolean
  encryptString(value: string): Buffer
  decryptString(value: Buffer): string
}

interface RuntimeSettingsStoreOptions {
  app: RuntimeAppAdapter
  safeStorage: RuntimeSafeStorageAdapter
}

interface PersistedRuntimeSettings {
  connection?: {
    baseUrl?: string
    timeoutMs?: number
  }
  managementKeyEncrypted?: string
}

export interface RuntimeSettingsStore {
  load(): Promise<RuntimeLoadedSettings>
  saveConnectionSettings(
    input: RuntimeConnectionSettingsInput
  ): Promise<RuntimeLoadedSettings>
}

export function createRuntimeSettingsStore(
  options: RuntimeSettingsStoreOptions
): RuntimeSettingsStore {
  return new FileRuntimeSettingsStore(options)
}

class FileRuntimeSettingsStore implements RuntimeSettingsStore {
  private readonly filePath: string
  private readonly safeStorage: RuntimeSafeStorageAdapter
  private memoryManagementKey: string | undefined

  constructor(options: RuntimeSettingsStoreOptions) {
    this.filePath = join(options.app.getPath('userData'), SETTINGS_FILE_NAME)
    this.safeStorage = options.safeStorage
  }

  async load(): Promise<RuntimeLoadedSettings> {
    const persisted = await this.readPersistedSettings()
    const decrypted = this.decryptManagementKey(
      persisted.managementKeyEncrypted
    )
    const managementKey = decrypted ?? this.memoryManagementKey

    return {
      connection: this.toConnectionSettings(
        persisted,
        managementKey,
        decrypted !== undefined
      ),
      managementKey
    }
  }

  async saveConnectionSettings(
    input: RuntimeConnectionSettingsInput
  ): Promise<RuntimeLoadedSettings> {
    const current = await this.readPersistedSettings()
    const currentLoaded = await this.load()
    const next: PersistedRuntimeSettings = {
      connection: {
        baseUrl: normalizeBaseUrl(
          input.baseUrl ?? current.connection?.baseUrl
        ),
        timeoutMs: normalizeTimeoutMs(
          input.timeoutMs ?? current.connection?.timeoutMs
        )
      },
      managementKeyEncrypted: current.managementKeyEncrypted
    }
    let managementKey = currentLoaded.managementKey
    let managementKeyPersisted = Boolean(current.managementKeyEncrypted)

    if (input.clearManagementKey) {
      managementKey = undefined
      managementKeyPersisted = false
      this.memoryManagementKey = undefined
      delete next.managementKeyEncrypted
    } else if (input.managementKey !== undefined) {
      const trimmedKey = input.managementKey.trim()

      if (trimmedKey) {
        managementKey = trimmedKey

        if (this.safeStorage.isEncryptionAvailable()) {
          next.managementKeyEncrypted = this.safeStorage
            .encryptString(trimmedKey)
            .toString('base64')
          managementKeyPersisted = true
          this.memoryManagementKey = undefined
        } else {
          delete next.managementKeyEncrypted
          managementKeyPersisted = false
          this.memoryManagementKey = trimmedKey
        }
      }
    }

    if (!managementKeyPersisted) {
      delete next.managementKeyEncrypted
    }

    await this.writePersistedSettings(next)

    return {
      connection: {
        baseUrl: next.connection?.baseUrl ?? normalizeBaseUrl(undefined),
        timeoutMs: next.connection?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        managementKeyConfigured: Boolean(managementKey),
        managementKeyPersisted
      },
      managementKey
    }
  }

  private async readPersistedSettings(): Promise<PersistedRuntimeSettings> {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as PersistedRuntimeSettings

      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (error) {
      if (isMissingFileError(error)) {
        return {}
      }

      return {}
    }
  }

  private async writePersistedSettings(
    settings: PersistedRuntimeSettings
  ): Promise<void> {
    await mkdir(join(this.filePath, '..'), { recursive: true })
    await writeFile(this.filePath, `${JSON.stringify(settings, null, 2)}\n`)
  }

  private decryptManagementKey(encrypted: string | undefined): string | undefined {
    if (!encrypted || !this.safeStorage.isEncryptionAvailable()) {
      return undefined
    }

    try {
      return this.safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      return undefined
    }
  }

  private toConnectionSettings(
    persisted: PersistedRuntimeSettings,
    managementKey: string | undefined,
    managementKeyPersisted: boolean
  ): RuntimeConnectionSettings {
    return {
      baseUrl: normalizeBaseUrl(persisted.connection?.baseUrl),
      timeoutMs: normalizeTimeoutMs(persisted.connection?.timeoutMs),
      managementKeyConfigured: Boolean(managementKey),
      managementKeyPersisted
    }
  }
}

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed =
    value?.trim() || CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function normalizeTimeoutMs(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.round(value)
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
