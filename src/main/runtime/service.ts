import {
  createCliProxyApiClient,
  isCliProxyApiError,
  redactApiKey,
  redactCliProxyApiText,
  redactUrlCredentials,
  type CliProxyApiClientOptions,
  type CliProxyApiConfigResult,
  type CliProxyApiManagementCheckResult,
  type CliProxyApiOpenAiCompatibilityDeleteInput,
  type CliProxyApiOpenAiCompatibilityProviderInput,
  type CliProxyApiWriteResult
} from '../cliproxyapi'
import type { RuntimeSettingsStore } from './settingsStore'
import type {
  RuntimeConfigSummary,
  RuntimeConnectionSettingsInput,
  RuntimeLoadedSettings,
  RuntimeOpenAiProviderInput,
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

export interface RuntimeServiceOptions {
  settingsStore: RuntimeSettingsStore
  createClient?: RuntimeClientFactory
}

export interface RuntimeService {
  initialize(): Promise<void>
  getState(): RuntimeState
  saveConnectionSettings(
    input: RuntimeConnectionSettingsInput
  ): Promise<RuntimeState>
  testConnection(): Promise<CliProxyApiManagementCheckResult>
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
  return new DefaultRuntimeService(
    options.settingsStore,
    options.createClient ?? createCliProxyApiClient
  )
}

class DefaultRuntimeService implements RuntimeService {
  private loadedSettings: RuntimeLoadedSettings | undefined
  private client: RuntimeCliProxyApiClient | undefined
  private state: RuntimeState | undefined

  constructor(
    private readonly settingsStore: RuntimeSettingsStore,
    private readonly createClient: RuntimeClientFactory
  ) {}

  async initialize(): Promise<void> {
    const loaded = await this.settingsStore.load()
    this.applyLoadedSettings(loaded)
  }

  getState(): RuntimeState {
    this.ensureInitialized()
    const state = this.state

    if (!state) {
      throw new Error('Runtime service is not initialized')
    }

    return { ...state, connection: { ...state.connection } }
  }

  async saveConnectionSettings(
    input: RuntimeConnectionSettingsInput
  ): Promise<RuntimeState> {
    const loaded = await this.settingsStore.saveConnectionSettings(input)
    this.applyLoadedSettings(loaded)
    return this.getState()
  }

  async testConnection(): Promise<CliProxyApiManagementCheckResult> {
    const client = this.getClient()
    const result = await client.checkManagementApi()

    this.state = {
      ...this.getState(),
      status: result.state,
      lastError: result.error ? redactCliProxyApiText(result.error) : undefined
    }

    return {
      ...result,
      error: result.error ? redactCliProxyApiText(result.error) : undefined
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
      connection: loaded.connection
    }
  }

  private getClient(): RuntimeCliProxyApiClient {
    this.ensureInitialized()
    const client = this.client

    if (!client) {
      throw new Error('Runtime service is not initialized')
    }

    return client
  }

  private ensureInitialized(): void {
    if (!this.loadedSettings || !this.client || !this.state) {
      throw new Error('Runtime service is not initialized')
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

function toRuntimeError(error: unknown): Error {
  if (isCliProxyApiError(error)) {
    return new Error(error.toLogObject().message)
  }

  if (error instanceof Error) {
    return new Error(redactCliProxyApiText(error.message))
  }

  return new Error('Runtime operation failed')
}
