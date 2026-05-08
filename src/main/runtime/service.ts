import { createConnection } from 'node:net'

import {
  createCliProxyApiClient,
  isCliProxyApiError,
  redactApiKey,
  redactCliProxyApiText,
  redactUrlCredentials,
  type CliProxyApiFetch,
  type CliProxyApiClientOptions,
  type CliProxyApiConfigResult,
  type CliProxyApiManagementCheckResult,
  type CliProxyApiOpenAiCompatibilityDeleteInput,
  type CliProxyApiOpenAiCompatibilityProviderInput,
  type CliProxyApiWriteResult
} from '../cli-proxy-api'
import type {
  AllmoneConfigStore,
  AllmoneSoftwareConfig
} from './allmoneConfigStore'
import type { CliProxyApiConfigWriter } from './cliproxyapiConfigWriter'
import type { CliProxyApiProcessController } from './cliproxyapiProcessController'
import type { RuntimeSettingsStore } from './settingsStore'
import type {
  RuntimeConfigSummary,
  RuntimeConnectionSettingsInput,
  RuntimeLoadedSettings,
  RuntimeModelOutputTestInput,
  RuntimeModelOutputTestResult,
  RuntimeOpenAiProviderInput,
  RuntimeOutputPortConnectivityResult,
  RuntimeProviderWriteResult,
  RuntimeState
} from './types'

export interface RuntimeCliProxyApiClient {
  checkManagementApi(): Promise<CliProxyApiManagementCheckResult>
  getConfig(): Promise<CliProxyApiConfigResult>
  upsertOpenAiCompatibilityProvider(
    input: CliProxyApiOpenAiCompatibilityProviderInput
  ): Promise<CliProxyApiWriteResult>
  deleteOpenAiCompatibilityProvider(
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ): Promise<CliProxyApiWriteResult>
}

export type RuntimeClientFactory = (
  options: CliProxyApiClientOptions
) => RuntimeCliProxyApiClient

export interface RuntimeOutputPortProbeInput {
  host: string
  port: number
  timeoutMs: number
}

export type RuntimeOutputPortConnector = (
  input: RuntimeOutputPortProbeInput
) => Promise<void>

export interface RuntimeServiceOptions {
  settingsStore: RuntimeSettingsStore
  allmoneConfigStore?: AllmoneConfigStore
  cliProxyApiConfigWriter?: CliProxyApiConfigWriter
  cliProxyApiProcessController?: CliProxyApiProcessController
  createClient?: RuntimeClientFactory
  connectToOutputPort?: RuntimeOutputPortConnector
  outputFetch?: CliProxyApiFetch
}

export interface RuntimeService {
  initialize(): Promise<void>
  getState(): RuntimeState
  saveConnectionSettings(
    input: RuntimeConnectionSettingsInput
  ): Promise<RuntimeState>
  saveOutputPort(port: number): Promise<RuntimeState>
  ensureInstalledThenStart(): Promise<RuntimeState>
  checkForUpdate(): Promise<RuntimeState>
  startManagedRuntime(): Promise<RuntimeState>
  restartManagedRuntime(): Promise<RuntimeState>
  stopManagedRuntime(): Promise<RuntimeState>
  testConnection(): Promise<CliProxyApiManagementCheckResult>
  testOutputPortConnectivity(): Promise<RuntimeOutputPortConnectivityResult>
  testModelOutput(
    input: RuntimeModelOutputTestInput
  ): Promise<RuntimeModelOutputTestResult>
  getConfigSummary(): Promise<RuntimeConfigSummary>
  upsertOpenAiCompatibilityProvider(
    input: RuntimeOpenAiProviderInput
  ): Promise<RuntimeProviderWriteResult>
  deleteOpenAiCompatibilityProvider(
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ): Promise<RuntimeProviderWriteResult>
}

export function createRuntimeService(
  options: RuntimeServiceOptions
): RuntimeService {
  return new DefaultRuntimeService(options)
}

class DefaultRuntimeService implements RuntimeService {
  private loadedSettings: RuntimeLoadedSettings | undefined
  private client: RuntimeCliProxyApiClient | undefined
  private state: RuntimeState | undefined
  private managedConfig: AllmoneSoftwareConfig | undefined
  private readonly settingsStore: RuntimeSettingsStore
  private readonly allmoneConfigStore: AllmoneConfigStore | undefined
  private readonly cliProxyApiConfigWriter: CliProxyApiConfigWriter | undefined
  private readonly cliProxyApiProcessController:
    | CliProxyApiProcessController
    | undefined
  private readonly createClient: RuntimeClientFactory
  private readonly connectToOutputPort: RuntimeOutputPortConnector
  private readonly outputFetch: CliProxyApiFetch | undefined

  constructor(options: RuntimeServiceOptions) {
    this.settingsStore = options.settingsStore
    this.allmoneConfigStore = options.allmoneConfigStore
    this.cliProxyApiConfigWriter = options.cliProxyApiConfigWriter
    this.cliProxyApiProcessController = options.cliProxyApiProcessController
    this.createClient = options.createClient ?? createCliProxyApiClient
    this.connectToOutputPort =
      options.connectToOutputPort ?? connectToTcpOutputPort
    this.outputFetch = options.outputFetch
  }

  async initialize(): Promise<void> {
    const loaded = await this.settingsStore.load()
    const managedConfig = await this.loadManagedConfig({ writeRuntimeConfig: true })

    this.applyLoadedSettings(
      managedConfig ? withManagedBaseUrl(loaded, managedConfig) : loaded
    )
  }

  getState(): RuntimeState {
    this.ensureInitialized()
    const state = this.state

    if (!state) {
      throw new Error('Runtime service is not initialized')
    }

    return copyRuntimeState({
      ...state,
      managed: this.cliProxyApiProcessController?.getState() ?? state.managed
    })
  }

  async saveConnectionSettings(
    input: RuntimeConnectionSettingsInput
  ): Promise<RuntimeState> {
    const loaded = await this.settingsStore.saveConnectionSettings(input)
    const managedConfig = await this.loadManagedConfig()

    this.applyLoadedSettings(
      managedConfig ? withManagedBaseUrl(loaded, managedConfig) : loaded
    )
    return this.getState()
  }

  async saveOutputPort(port: number): Promise<RuntimeState> {
    this.ensureInitialized()

    if (!this.cliProxyApiConfigWriter) {
      throw new Error('Managed runtime config writer is not available')
    }

    const config = await this.cliProxyApiConfigWriter.saveOutputPort(port)
    const loaded = this.loadedSettings

    if (!loaded) {
      throw new Error('Runtime service is not initialized')
    }

    this.managedConfig = config
    this.applyLoadedSettings(withManagedBaseUrl(loaded, config))
    const processState = this.cliProxyApiProcessController?.getState()

    if (processState?.status === 'running') {
      await this.cliProxyApiProcessController?.restart()
    }

    return this.getState()
  }

  async ensureInstalledThenStart(): Promise<RuntimeState> {
    await this.getManagedProcessController().ensureInstalledThenStart()
    return this.getState()
  }

  async checkForUpdate(): Promise<RuntimeState> {
    await this.getManagedProcessController().checkForUpdate()
    return this.getState()
  }

  async startManagedRuntime(): Promise<RuntimeState> {
    await this.getManagedProcessController().start()
    return this.getState()
  }

  async restartManagedRuntime(): Promise<RuntimeState> {
    await this.getManagedProcessController().restart()
    return this.getState()
  }

  async stopManagedRuntime(): Promise<RuntimeState> {
    await this.getManagedProcessController().shutdownAll()
    return this.getState()
  }

  async testConnection(): Promise<CliProxyApiManagementCheckResult> {
    const client = this.getClient()
    const result = await client.checkManagementApi()
    const redactedError = result.error
      ? redactCliProxyApiText(result.error)
      : undefined

    this.state = {
      ...this.getState(),
      status: result.state,
      lastError: redactedError,
      lastCheckedAt: new Date().toISOString(),
      lastHttpStatus: result.status
    }

    return {
      ...result,
      error: redactedError
    }
  }

  async testOutputPortConnectivity(): Promise<RuntimeOutputPortConnectivityResult> {
    this.ensureInitialized()

    const runtime = this.getState().software?.runtime
    const checkedAt = new Date().toISOString()

    if (!runtime) {
      return {
        ok: false,
        state: 'invalid_config',
        target: 'Unavailable',
        checkedAt,
        error: 'Local service origin is unavailable'
      }
    }

    const startedAt = Date.now()

    try {
      await this.connectToOutputPort({
        host: runtime.host,
        port: runtime.port,
        timeoutMs: runtime.timeoutMs
      })

      return {
        ok: true,
        state: 'reachable',
        target: runtime.serviceOrigin,
        host: runtime.host,
        port: runtime.port,
        latencyMs: Date.now() - startedAt,
        checkedAt
      }
    } catch (error) {
      return {
        ok: false,
        state: mapOutputTestError(error),
        target: runtime.serviceOrigin,
        host: runtime.host,
        port: runtime.port,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        error: redactRuntimeOutputError(error)
      }
    }
  }

  async testModelOutput(
    input: RuntimeModelOutputTestInput
  ): Promise<RuntimeModelOutputTestResult> {
    this.ensureInitialized()

    const runtime = this.getState().software?.runtime
    const model = input.model.trim()
    const apiKey = input.apiKey.trim()
    const prompt = input.prompt?.trim() || 'Reply with OK.'
    const checkedAt = new Date().toISOString()

    if (!model) {
      throw new Error('Model is required')
    }

    if (!apiKey) {
      throw new Error('Local API key is required')
    }

    if (!runtime) {
      return {
        ok: false,
        state: 'invalid_config',
        target: 'Unavailable',
        model,
        checkedAt,
        error: 'Local API base URL is unavailable'
      }
    }

    const target = buildChatCompletionsUrl(runtime.apiBaseUrl)
    const startedAt = Date.now()

    try {
      const response = await fetchOutputWithTimeout({
        fetchImpl: this.outputFetch,
        target,
        timeoutMs: runtime.timeoutMs,
        apiKey,
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }
      })
      const responseBody = await response.text()
      const latencyMs = Date.now() - startedAt

      if (!response.ok) {
        return {
          ok: false,
          state: response.status === 401 || response.status === 403
            ? 'auth_required'
            : 'unexpected_error',
          target,
          model,
          status: response.status,
          latencyMs,
          checkedAt,
          error: `Model output request failed with HTTP ${response.status}`
        }
      }

      const outputText = extractChatCompletionOutput(responseBody)

      if (!outputText) {
        return {
          ok: false,
          state: 'invalid_response',
          target,
          model,
          status: response.status,
          latencyMs,
          checkedAt,
          error: 'Model output response did not include message content'
        }
      }

      return {
        ok: true,
        state: 'reachable',
        target,
        model,
        status: response.status,
        latencyMs,
        outputText,
        checkedAt
      }
    } catch (error) {
      return {
        ok: false,
        state: mapOutputTestError(error),
        target,
        model,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        error: redactRuntimeOutputError(error, apiKey)
      }
    }
  }

  async getConfigSummary(): Promise<RuntimeConfigSummary> {
    try {
      const result = await this.getClient().getConfig()
      return sanitizeConfigSummary(result)
    } catch (error) {
      throw toRuntimeError(error)
    }
  }

  async upsertOpenAiCompatibilityProvider(
    input: RuntimeOpenAiProviderInput
  ): Promise<RuntimeProviderWriteResult> {
    try {
      const writeResult = await this.getClient().upsertOpenAiCompatibilityProvider(
        toCliProxyApiProviderInput(input)
      )
      const summary = await this.getConfigSummary()

      return {
        ok: writeResult.ok,
        status: writeResult.status,
        summary
      }
    } catch (error) {
      throw toRuntimeError(error)
    }
  }

  async deleteOpenAiCompatibilityProvider(
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ): Promise<RuntimeProviderWriteResult> {
    try {
      const writeResult =
        await this.getClient().deleteOpenAiCompatibilityProvider(input)
      const summary = await this.getConfigSummary()

      return {
        ok: writeResult.ok,
        status: writeResult.status,
        summary
      }
    } catch (error) {
      throw toRuntimeError(error)
    }
  }

  private applyLoadedSettings(loaded: RuntimeLoadedSettings): void {
    this.loadedSettings = loaded
    this.client = this.createClient({
      baseUrl: loaded.connection.baseUrl,
      managementKey: loaded.managementKey,
      timeoutMs: loaded.connection.timeoutMs
    })
    this.state = {
      status: loaded.connection.managementKeyConfigured
        ? 'unreachable'
        : 'auth_required',
      connection: loaded.connection,
      software: this.managedConfig
        ? toSoftwareConfigSummary(this.managedConfig)
        : this.state?.software,
      managed: this.cliProxyApiProcessController?.getState()
    }
  }

  private async loadManagedConfig(options: {
    writeRuntimeConfig?: boolean
  } = {}): Promise<AllmoneSoftwareConfig | undefined> {
    if (options.writeRuntimeConfig && this.cliProxyApiConfigWriter) {
      const config = await this.cliProxyApiConfigWriter.writeManagedConfig()
      this.applyManagedConfig(config)
      return config
    }

    const config = await this.allmoneConfigStore?.load()

    if (config) {
      this.applyManagedConfig(config)
    }

    return config
  }

  private getClient(): RuntimeCliProxyApiClient {
    this.ensureInitialized()
    const client = this.client

    if (!client) {
      throw new Error('Runtime service is not initialized')
    }

    return client
  }

  private getManagedProcessController(): CliProxyApiProcessController {
    if (!this.cliProxyApiProcessController) {
      throw new Error('Managed runtime process controller is not available')
    }

    return this.cliProxyApiProcessController
  }

  private applyManagedConfig(config: AllmoneSoftwareConfig): void {
    this.managedConfig = config

    if (!this.state) {
      return
    }

    this.state = {
      ...this.state,
      software: toSoftwareConfigSummary(config)
    }
  }

  private ensureInitialized(): void {
    if (!this.loadedSettings || !this.client || !this.state) {
      throw new Error('Runtime service is not initialized')
    }
  }
}

function toSoftwareConfigSummary(
  config: AllmoneSoftwareConfig
): RuntimeState['software'] {
  return {
    cliproxyapi: { ...config.cliproxyapi },
    runtime: { ...config.runtime }
  }
}

function copyRuntimeState(state: RuntimeState): RuntimeState {
  return {
    ...state,
    connection: { ...state.connection },
    software: state.software
      ? {
          cliproxyapi: { ...state.software.cliproxyapi },
          runtime: { ...state.software.runtime }
        }
      : undefined,
    managed: state.managed
      ? {
          ...state.managed,
          install: state.managed.install ? { ...state.managed.install } : undefined
        }
      : undefined
  }
}

function withManagedBaseUrl(
  loaded: RuntimeLoadedSettings,
  config: AllmoneSoftwareConfig
): RuntimeLoadedSettings {
  return {
    ...loaded,
    connection: {
      ...loaded.connection,
      baseUrl: config.runtime.managementBaseUrl,
      timeoutMs: config.runtime.timeoutMs
    }
  }
}

function sanitizeConfigSummary(result: CliProxyApiConfigResult): RuntimeConfigSummary {
  const config = result.config

  return {
    debug: typeof config.debug === 'boolean' ? config.debug : undefined,
    requestLog:
      typeof config['request-log'] === 'boolean'
        ? config['request-log']
        : undefined,
    requestRetry:
      typeof config['request-retry'] === 'number'
        ? config['request-retry']
        : undefined,
    apiKeysConfigured: Array.isArray(config['api-keys'])
      ? config['api-keys'].length
      : 0,
    openAiCompatibilityProviders: Array.isArray(
      config['openai-compatibility']
    )
      ? config['openai-compatibility'].map((provider) => ({
          name: provider.name ?? '',
          disabled: provider.disabled === true,
          baseUrl: provider['base-url'] ?? '',
          apiKeyEntries: Array.isArray(provider['api-key-entries'])
            ? provider['api-key-entries'].map((entry) => ({
                apiKey: redactApiKey(entry['api-key']),
                proxyUrl: entry['proxy-url']
                  ? redactUrlCredentials(entry['proxy-url'])
                  : undefined,
                authIndex: entry['auth-index']
              }))
            : [],
          models: Array.isArray(provider.models) ? provider.models : [],
          headers: sanitizeHeaders(provider.headers)
        }))
      : []
  }
}

function sanitizeHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers ?? {})) {
    sanitized[key] = /authorization|api-key|token|secret/i.test(key)
      ? '[REDACTED]'
      : value
  }

  return sanitized
}

function toCliProxyApiProviderInput(
  input: RuntimeOpenAiProviderInput
): CliProxyApiOpenAiCompatibilityProviderInput {
  const name = input.name.trim()
  const baseUrl = input.baseUrl.trim()

  if (!name) {
    throw new Error('Provider name is required')
  }

  if (!baseUrl) {
    throw new Error('Provider base URL is required')
  }

  const provider: CliProxyApiOpenAiCompatibilityProviderInput = {
    name,
    disabled: input.disabled === true,
    'base-url': baseUrl,
    models: sanitizeModelRows(input.models)
  }
  const apiKey = input.apiKey?.trim()

  if (apiKey) {
    provider['api-key-entries'] = [
      {
        'api-key': apiKey,
        'proxy-url': input.proxyUrl?.trim() ?? ''
      }
    ]
  }

  if (input.headers && Object.keys(input.headers).length > 0) {
    provider.headers = input.headers
  }

  return provider
}

function sanitizeModelRows(
  models: RuntimeOpenAiProviderInput['models']
): RuntimeOpenAiProviderInput['models'] {
  const rows: Array<{ name: string; alias?: string }> = (models ?? [])
    .map((model) => ({
      name: model.name?.trim(),
      alias: model.alias?.trim()
    }))
    .filter(
      (model): model is { name: string; alias: string | undefined } =>
        Boolean(model.name)
    )
    .map((model) =>
      model.alias ? model : { name: model.name }
    )

  return rows
}

function connectToTcpOutputPort(
  input: RuntimeOutputPortProbeInput
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: input.host,
      port: input.port
    })
    const timeout = setTimeout(() => {
      finish(() => {
        const error = new Error(`Timed out after ${input.timeoutMs}ms`)
        error.name = 'TimeoutError'
        socket.destroy()
        reject(error)
      })
    }, input.timeoutMs)
    let settled = false

    function finish(callback: () => void): void {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)
      callback()
    }

    socket.once('connect', () => {
      finish(() => {
        socket.end()
        resolve()
      })
    })
    socket.once('error', (error) => {
      finish(() => reject(error))
    })
  })
}

async function fetchOutputWithTimeout(input: {
  fetchImpl: CliProxyApiFetch | undefined
  target: string
  timeoutMs: number
  apiKey: string
  body: unknown
}): Promise<Response> {
  const fetchImpl = input.fetchImpl ?? getGlobalFetch()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs)

  try {
    return await fetchImpl(input.target, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input.body),
      signal: controller.signal
    })
  } catch (cause) {
    if (controller.signal.aborted || isAbortError(cause)) {
      const error = new Error(`Timed out after ${input.timeoutMs}ms`)
      error.name = 'TimeoutError'
      throw error
    }

    throw cause
  } finally {
    clearTimeout(timeout)
  }
}

function getGlobalFetch(): CliProxyApiFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('globalThis.fetch is not available')
  }

  return globalThis.fetch.bind(globalThis) as CliProxyApiFetch
}

function buildChatCompletionsUrl(apiBaseUrl: string): string {
  const normalized = apiBaseUrl.trim().replace(/\/+$/, '')
  return `${normalized}/chat/completions`
}

function extractChatCompletionOutput(responseBody: string): string | undefined {
  let raw: unknown

  try {
    raw = JSON.parse(responseBody)
  } catch {
    return undefined
  }

  if (!isRecord(raw) || !Array.isArray(raw.choices)) {
    return undefined
  }

  const firstChoice = raw.choices[0]

  if (!isRecord(firstChoice)) {
    return undefined
  }

  if (typeof firstChoice.text === 'string') {
    return firstChoice.text
  }

  const message = firstChoice.message

  if (!isRecord(message)) {
    return undefined
  }

  if (typeof message.content === 'string') {
    return message.content
  }

  if (Array.isArray(message.content)) {
    const parts = message.content
      .filter(isRecord)
      .map((part) =>
        typeof part.text === 'string'
          ? part.text
          : typeof part.content === 'string'
            ? part.content
            : ''
      )
      .filter(Boolean)

    return parts.length > 0 ? parts.join('') : undefined
  }

  return undefined
}

function mapOutputTestError(error: unknown): RuntimeOutputPortConnectivityResult['state'] {
  if (isAbortError(error) || getErrorName(error) === 'TimeoutError') {
    return 'timeout'
  }

  const code = getErrorCode(error)

  if (
    code === 'ECONNREFUSED' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENETUNREACH' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET'
  ) {
    return 'unreachable'
  }

  return 'unexpected_error'
}

function redactRuntimeOutputError(error: unknown, secret?: string): string {
  const message =
    error instanceof Error ? error.message : 'Runtime output test failed'
  const withoutSecret = secret ? message.split(secret).join('[REDACTED]') : message

  return redactCliProxyApiText(withoutSecret)
}

function isAbortError(value: unknown): boolean {
  return (
    value instanceof Error &&
    (value.name === 'AbortError' || value.name === 'TimeoutError')
  )
}

function getErrorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toRuntimeError(error: unknown): Error {
  if (isCliProxyApiError(error)) {
    return new Error(error.toLogObject().message)
  }

  if (error instanceof Error) {
    return new Error(redactCliProxyApiText(error.message))
  }

  return new Error('Runtime operation failed')
}
