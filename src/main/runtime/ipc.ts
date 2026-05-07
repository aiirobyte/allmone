import type { RuntimeService } from './service'
import type {
  RuntimeConnectionSettingsInput,
  RuntimeOpenAiProviderInput
} from './types'
import type { CliProxyApiOpenAiCompatibilityDeleteInput } from '../cliproxyapi'

export const RUNTIME_IPC_CHANNELS = {
  getState: 'runtime:get-state',
  saveConnection: 'runtime:save-connection',
  testConnection: 'runtime:test-connection',
  getConfigSummary: 'runtime:get-config-summary',
  upsertOpenAiProvider: 'runtime:upsert-openai-provider',
  deleteOpenAiProvider: 'runtime:delete-openai-provider'
} as const

export const REGISTERED_RUNTIME_CHANNELS = Object.values(RUNTIME_IPC_CHANNELS)

export interface RuntimeIpcMain {
  handle(
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown
  ): void
}

export interface RuntimeIpcOptions {
  ipcMain: RuntimeIpcMain
  runtimeService: RuntimeService
}

export function registerRuntimeIpcHandlers(options: RuntimeIpcOptions): void {
  const { ipcMain, runtimeService } = options

  ipcMain.handle(RUNTIME_IPC_CHANNELS.getState, () => runtimeService.getState())
  ipcMain.handle(RUNTIME_IPC_CHANNELS.saveConnection, (_event, payload) =>
    runtimeService.saveConnectionSettings(validateConnectionPayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.testConnection, () =>
    runtimeService.testConnection()
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.getConfigSummary, () =>
    runtimeService.getConfigSummary()
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.upsertOpenAiProvider, (_event, payload) =>
    runtimeService.upsertOpenAiCompatibilityProvider(
      validateProviderPayload(payload)
    )
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.deleteOpenAiProvider, (_event, payload) =>
    runtimeService.deleteOpenAiCompatibilityProvider(validateDeletePayload(payload))
  )
}

function validateConnectionPayload(
  value: unknown
): RuntimeConnectionSettingsInput {
  assertRecord(value)
  assertOptionalString(value.baseUrl)
  assertOptionalString(value.managementKey)
  assertOptionalBoolean(value.clearManagementKey)

  if (
    value.timeoutMs !== undefined &&
    (typeof value.timeoutMs !== 'number' || !Number.isFinite(value.timeoutMs))
  ) {
    throwInvalidPayload()
  }

  const input: RuntimeConnectionSettingsInput = {}

  if (typeof value.baseUrl === 'string') {
    input.baseUrl = value.baseUrl
  }

  if (typeof value.timeoutMs === 'number') {
    input.timeoutMs = value.timeoutMs
  }

  if (typeof value.managementKey === 'string') {
    input.managementKey = value.managementKey
  }

  if (typeof value.clearManagementKey === 'boolean') {
    input.clearManagementKey = value.clearManagementKey
  }

  return input
}

function validateProviderPayload(value: unknown): RuntimeOpenAiProviderInput {
  assertRecord(value)

  if (typeof value.name !== 'string' || typeof value.baseUrl !== 'string') {
    throwInvalidPayload()
  }

  assertOptionalBoolean(value.disabled)
  assertOptionalString(value.apiKey)
  assertOptionalString(value.proxyUrl)

  if (value.models !== undefined && !isModelRows(value.models)) {
    throwInvalidPayload()
  }

  if (value.headers !== undefined && !isStringRecord(value.headers)) {
    throwInvalidPayload()
  }

  return {
    name: value.name,
    disabled:
      typeof value.disabled === 'boolean' ? value.disabled : undefined,
    baseUrl: value.baseUrl,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : undefined,
    proxyUrl: typeof value.proxyUrl === 'string' ? value.proxyUrl : undefined,
    models: isModelRows(value.models) ? value.models : undefined,
    headers: isStringRecord(value.headers) ? value.headers : undefined
  }
}

function validateDeletePayload(
  value: unknown
): CliProxyApiOpenAiCompatibilityDeleteInput {
  assertRecord(value)
  const hasName = typeof value.name === 'string'
  const hasIndex = typeof value.index === 'number' && Number.isInteger(value.index)

  if (hasName === hasIndex) {
    throwInvalidPayload()
  }

  return hasName
    ? { name: value.name as string }
    : { index: value.index as number }
}

function assertRecord(
  value: unknown
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throwInvalidPayload()
  }
}

function assertOptionalString(value: unknown): void {
  if (value !== undefined && typeof value !== 'string') {
    throwInvalidPayload()
  }
}

function assertOptionalBoolean(value: unknown): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throwInvalidPayload()
  }
}

function isModelRows(value: unknown): value is RuntimeOpenAiProviderInput['models'] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        !Array.isArray(row) &&
        typeof (row as Record<string, unknown>).name === 'string' &&
        ((row as Record<string, unknown>).alias === undefined ||
          typeof (row as Record<string, unknown>).alias === 'string')
    )
  )
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  )
}

function throwInvalidPayload(): never {
  throw new Error('Invalid runtime IPC payload')
}
