import type { RuntimeService } from './service'
import type {
  RuntimeConnectionSettingsInput,
  RuntimeOpenAiProviderInput
} from './types'
import type { CliProxyApiOpenAiCompatibilityDeleteInput } from '../cli-proxy-api'
import type {
  ProviderLoginEvent,
  ProviderLoginRunner,
  ProviderLoginRunInput,
  UpstreamService
} from '../upstreams'
import type {
  UpstreamAmpConfig,
  UpstreamApiKeyCredentialInput,
  UpstreamProviderKind
} from '../upstreams/types'

export const RUNTIME_IPC_CHANNELS = {
  getState: 'runtime:get-state',
  saveConnection: 'runtime:save-connection',
  testConnection: 'runtime:test-connection',
  getConfigSummary: 'runtime:get-config-summary',
  saveOutputPort: 'runtime:save-output-port',
  ensureInstalledThenStart: 'runtime:ensure-installed-then-start',
  checkForUpdate: 'runtime:check-for-update',
  startManagedRuntime: 'runtime:start-managed-runtime',
  restartManagedRuntime: 'runtime:restart-managed-runtime',
  stopManagedRuntime: 'runtime:stop-managed-runtime',
  copyApiBase: 'runtime:copy-api-base',
  upsertOpenAiProvider: 'runtime:upsert-openai-provider',
  deleteOpenAiProvider: 'runtime:delete-openai-provider',
  getUpstreamCatalog: 'runtime:upstream-get-catalog',
  getUpstreamSummaries: 'runtime:upstream-get-summaries',
  getLocalConnectionOutput: 'runtime:upstream-get-local-connection',
  generateLocalApiKey: 'runtime:upstream-generate-local-key',
  setLocalApiKey: 'runtime:upstream-set-local-key',
  deleteLocalApiKey: 'runtime:upstream-delete-local-key',
  upsertApiKeyUpstream: 'runtime:upstream-upsert-api-key',
  deleteApiKeyUpstream: 'runtime:upstream-delete-api-key',
  writeAmpConfig: 'runtime:upstream-write-amp',
  resetAmpConfig: 'runtime:upstream-reset-amp',
  getAuthFiles: 'runtime:upstream-get-auth-files',
  deleteAuthFile: 'runtime:upstream-delete-auth-file',
  runLoginAction: 'runtime:upstream-run-login-action'
} as const

export const RUNTIME_IPC_EVENTS = {
  loginEvent: 'runtime:upstream-login-event'
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
  upstreamService?: UpstreamService
  providerLoginRunner?: ProviderLoginRunner
  clipboard?: {
    writeText(value: string): void
  }
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
  ipcMain.handle(RUNTIME_IPC_CHANNELS.saveOutputPort, (_event, payload) =>
    runtimeService.saveOutputPort(validatePortPayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.ensureInstalledThenStart, (_event, payload) => {
    validateNoPayload(payload)
    return runtimeService.ensureInstalledThenStart()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.checkForUpdate, (_event, payload) => {
    validateNoPayload(payload)
    return runtimeService.checkForUpdate()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.startManagedRuntime, (_event, payload) => {
    validateNoPayload(payload)
    return runtimeService.startManagedRuntime()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.restartManagedRuntime, (_event, payload) => {
    validateNoPayload(payload)
    return runtimeService.restartManagedRuntime()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.stopManagedRuntime, (_event, payload) => {
    validateNoPayload(payload)
    return runtimeService.stopManagedRuntime()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.copyApiBase, (_event, payload) => {
    validateNoPayload(payload)
    const serviceOrigin = runtimeService.getState().software?.runtime.serviceOrigin

    if (!serviceOrigin) {
      throw new Error('Local service origin is unavailable')
    }

    options.clipboard?.writeText(serviceOrigin)
    return { value: serviceOrigin }
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.upsertOpenAiProvider, (_event, payload) =>
    runtimeService.upsertOpenAiCompatibilityProvider(
      validateProviderPayload(payload)
    )
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.deleteOpenAiProvider, (_event, payload) =>
    runtimeService.deleteOpenAiCompatibilityProvider(validateDeletePayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.getUpstreamCatalog, (_event, payload) => {
    validateNoPayload(payload)
    return getUpstreamService(options).getProviderCatalog()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.getUpstreamSummaries, (_event, payload) => {
    validateNoPayload(payload)
    return getUpstreamService(options).getUpstreamSummaries()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.getLocalConnectionOutput, (_event, payload) => {
    validateNoPayload(payload)
    const software = runtimeService.getState().software?.runtime

    if (!software) {
      throw new Error('Local service origin is unavailable')
    }

    return getUpstreamService(options).getLocalConnectionOutput({
      serviceOrigin: software.serviceOrigin,
      port: software.port
    })
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.generateLocalApiKey, (_event, payload) => {
    validateNoPayload(payload)
    return getUpstreamService(options).generateLocalApiKey()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.setLocalApiKey, (_event, payload) =>
    getUpstreamService(options).setLocalApiKey(validateSetLocalKeyPayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.deleteLocalApiKey, (_event, payload) =>
    getUpstreamService(options).deleteLocalApiKey(validateLocalKeyDeletePayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.upsertApiKeyUpstream, (_event, payload) =>
    getUpstreamService(options).upsertApiKeyUpstream(validateApiKeyUpstreamPayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.deleteApiKeyUpstream, (_event, payload) => {
    const input = validateApiKeyUpstreamDeletePayload(payload)
    return getUpstreamService(options).deleteApiKeyUpstream(input.providerKind, input.delete)
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.writeAmpConfig, (_event, payload) =>
    getUpstreamService(options).writeAmpConfig(validateAmpPayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.resetAmpConfig, (_event, payload) => {
    validateNoPayload(payload)
    return getUpstreamService(options).resetAmpConfig()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.getAuthFiles, (_event, payload) => {
    validateNoPayload(payload)
    return getUpstreamService(options).getAuthFileSummaries()
  })
  ipcMain.handle(RUNTIME_IPC_CHANNELS.deleteAuthFile, (_event, payload) =>
    getUpstreamService(options).deleteAuthFile(validateAuthFileDeletePayload(payload))
  )
  ipcMain.handle(RUNTIME_IPC_CHANNELS.runLoginAction, (event, payload) =>
    getProviderLoginRunner(options).run(validateLoginActionPayload(payload), {
      onEvent: (loginEvent) => sendProviderLoginEvent(event, loginEvent)
    })
  )
}

function sendProviderLoginEvent(event: unknown, loginEvent: ProviderLoginEvent): void {
  if (
    typeof event !== 'object' ||
    event === null ||
    !('sender' in event) ||
    typeof event.sender !== 'object' ||
    event.sender === null ||
    !('send' in event.sender) ||
    typeof event.sender.send !== 'function'
  ) {
    return
  }

  event.sender.send(RUNTIME_IPC_EVENTS.loginEvent, loginEvent)
}

function getUpstreamService(options: RuntimeIpcOptions): UpstreamService {
  if (!options.upstreamService) {
    throw new Error('Upstream service is unavailable')
  }

  return options.upstreamService
}

function getProviderLoginRunner(options: RuntimeIpcOptions): ProviderLoginRunner {
  if (!options.providerLoginRunner) {
    throw new Error('Provider login runner is unavailable')
  }

  return options.providerLoginRunner
}

function validatePortPayload(value: unknown): number {
  assertRecord(value)

  if (
    typeof value.port !== 'number' ||
    !Number.isInteger(value.port) ||
    value.port < 1 ||
    value.port > 65_535
  ) {
    throwInvalidPayload()
  }

  return value.port
}

function validateNoPayload(value: unknown): void {
  if (value !== undefined) {
    throwInvalidPayload()
  }
}

function validateConnectionPayload(
  value: unknown
): RuntimeConnectionSettingsInput {
  assertRecord(value)
  assertOptionalString(value.managementKey)
  assertOptionalBoolean(value.clearManagementKey)

  if ('baseUrl' in value || 'timeoutMs' in value) {
    throwInvalidPayload()
  }

  const input: RuntimeConnectionSettingsInput = {}

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

function validateSetLocalKeyPayload(value: unknown): string {
  assertRecord(value)

  if (typeof value.apiKey !== 'string') {
    throwInvalidPayload()
  }

  return value.apiKey
}

function validateLocalKeyDeletePayload(value: unknown): { value: string } | { index: number } {
  assertRecord(value)
  const hasValue = typeof value.value === 'string'
  const hasIndex = typeof value.index === 'number' && Number.isInteger(value.index)

  if (hasValue === hasIndex) {
    throwInvalidPayload()
  }

  return hasValue ? { value: value.value as string } : { index: value.index as number }
}

function validateApiKeyUpstreamPayload(value: unknown): UpstreamApiKeyCredentialInput {
  assertRecord(value)

  if (!isProviderKind(value.providerKind)) {
    throwInvalidPayload()
  }

  assertOptionalString(value.apiKey)
  assertOptionalString(value.baseUrl)
  assertOptionalString(value.providerName)
  assertOptionalBoolean(value.disabled)

  if (value.entryIndex !== undefined && typeof value.entryIndex !== 'number') {
    throwInvalidPayload()
  }

  return {
    providerKind: value.providerKind,
    entryIndex: typeof value.entryIndex === 'number' ? value.entryIndex : undefined,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : undefined,
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : undefined,
    providerName: typeof value.providerName === 'string' ? value.providerName : undefined,
    disabled: typeof value.disabled === 'boolean' ? value.disabled : undefined,
    apiKeyEntries: Array.isArray(value.apiKeyEntries)
      ? value.apiKeyEntries
          .filter(isRecordValue)
          .map((entry) => ({
            apiKey: typeof entry.apiKey === 'string' ? entry.apiKey : undefined,
            proxyUrl: typeof entry.proxyUrl === 'string' ? entry.proxyUrl : undefined,
            authIndex: typeof entry.authIndex === 'string' ? entry.authIndex : undefined
          }))
      : undefined
  }
}

function validateApiKeyUpstreamDeletePayload(value: unknown): {
  providerKind: UpstreamProviderKind
  delete: { apiKey: string } | { index: number }
} {
  assertRecord(value)
  if (!isProviderKind(value.providerKind)) {
    throwInvalidPayload()
  }

  return {
    providerKind: value.providerKind,
    delete:
      typeof value.index === 'number'
        ? { index: value.index }
        : typeof value.apiKey === 'string'
          ? { apiKey: value.apiKey }
          : throwInvalidPayload()
  }
}

function validateAmpPayload(value: unknown): UpstreamAmpConfig {
  assertRecord(value)
  assertOptionalString(value.upstreamUrl)
  assertOptionalString(value.upstreamApiKey)
  assertOptionalBoolean(value.restrictManagementToLocalhost)
  assertOptionalBoolean(value.forceModelMappings)

  return {
    upstreamUrl: typeof value.upstreamUrl === 'string' ? value.upstreamUrl : undefined,
    upstreamApiKey: typeof value.upstreamApiKey === 'string' ? value.upstreamApiKey : undefined,
    restrictManagementToLocalhost:
      typeof value.restrictManagementToLocalhost === 'boolean'
        ? value.restrictManagementToLocalhost
        : undefined,
    forceModelMappings:
      typeof value.forceModelMappings === 'boolean'
        ? value.forceModelMappings
        : undefined
  }
}

function validateAuthFileDeletePayload(value: unknown): { name: string } | { all: true } {
  assertRecord(value)
  const hasName = typeof value.name === 'string'
  const hasAll = value.all === true

  if (hasName === hasAll) {
    throwInvalidPayload()
  }

  return hasName ? { name: value.name as string } : { all: true }
}

function validateLoginActionPayload(value: unknown): ProviderLoginRunInput {
  assertRecord(value)

  if (typeof value.kind !== 'string' || !isLoginActionKind(value.kind)) {
    throwInvalidPayload()
  }
  assertOptionalString(value.importPath)

  return {
    kind: value.kind,
    importPath: typeof value.importPath === 'string' ? value.importPath : undefined
  }
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

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProviderKind(value: unknown): value is UpstreamProviderKind {
  return (
    typeof value === 'string' &&
    [
      'api-keys',
      'gemini-api-key',
      'codex-api-key',
      'claude-api-key',
      'openai-compatibility',
      'vertex-api-key',
      'ampcode',
      'gemini-cli',
      'aistudio',
      'antigravity',
      'claude',
      'codex',
      'kimi',
      'vertex'
    ].includes(value)
  )
}

function isLoginActionKind(value: string): value is ProviderLoginRunInput['kind'] {
  return [
    'gemini-cli-login',
    'antigravity-login',
    'claude-login',
    'codex-login',
    'codex-device-login',
    'kimi-login',
    'vertex-import'
  ].includes(value)
}

function throwInvalidPayload(): never {
  throw new Error('Invalid runtime IPC payload')
}
