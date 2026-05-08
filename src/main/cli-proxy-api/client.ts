import {
  createConnectionCliProxyApiError,
  createHttpCliProxyApiError,
  createInvalidJsonCliProxyApiError,
  createTimeoutCliProxyApiError,
  isCliProxyApiError,
  type CliProxyApiError
} from './errors'
import {
  CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL,
  type CliProxyApiAmpCodeConfig,
  type CliProxyApiAmpCodeResponse,
  type CliProxyApiAmpCodeResult,
  type CliProxyApiApiKeyDeleteInput,
  type CliProxyApiApiKeyPatchInput,
  type CliProxyApiAuthFileDeleteInput,
  type CliProxyApiAuthFilesResponse,
  type CliProxyApiAuthFilesResult,
  type CliProxyApiClientOptions,
  type CliProxyApiConfigResponse,
  type CliProxyApiConfigResult,
  type CliProxyApiFetch,
  type CliProxyApiJsonObject,
  type CliProxyApiKeyUsageResponse,
  type CliProxyApiKeyUsageResult,
  type CliProxyApiKeysResponse,
  type CliProxyApiKeysResult,
  type CliProxyApiLatestVersionResponse,
  type CliProxyApiLatestVersionResult,
  type CliProxyApiManagementCheckResult,
  type CliProxyApiOauthExcludedModelsMap,
  type CliProxyApiOauthExcludedModelsPatchInput,
  type CliProxyApiOauthExcludedModelsResponse,
  type CliProxyApiOauthExcludedModelsResult,
  type CliProxyApiOauthModelAliasMap,
  type CliProxyApiOauthModelAliasPatchInput,
  type CliProxyApiOauthModelAliasResponse,
  type CliProxyApiOauthModelAliasResult,
  type CliProxyApiOauthProviderDeleteInput,
  type CliProxyApiOpenAiCompatibilityDeleteInput,
  type CliProxyApiOpenAiCompatibilityProviderInput,
  type CliProxyApiOpenAiCompatibilityResponse,
  type CliProxyApiOpenAiCompatibilityResult,
  type CliProxyApiUpstreamApiKeyDeleteInput,
  type CliProxyApiUpstreamApiKeyEntry,
  type CliProxyApiUpstreamApiKeyPatchInput,
  type CliProxyApiUpstreamApiKeySection,
  type CliProxyApiUpstreamApiKeySectionResult,
  type CliProxyApiUsageQueueResponse,
  type CliProxyApiUsageQueueResult,
  type CliProxyApiUsageStatisticsEnabledResponse,
  type CliProxyApiUsageStatisticsEnabledResult,
  type CliProxyApiWriteResult,
  type CliProxyApiWriteStatusResponse
} from './types'

const DEFAULT_TIMEOUT_MS = 5_000

interface JsonRequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  forManagementCheck?: boolean
}

type JsonRequestMethod = 'GET' | 'PUT' | 'PATCH' | 'DELETE'

interface WriteJsonOptions extends JsonRequestOptions {
  body?: unknown
}

interface JsonResponse<T> {
  value: T
  status: number
}

export class CliProxyApiClient {
  private readonly baseUrl: string
  private readonly managementKey?: string
  private readonly timeoutMs: number
  private readonly fetchImpl: CliProxyApiFetch

  constructor(options: CliProxyApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL
    )
    this.managementKey = options.managementKey
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.fetchImpl = options.fetch ?? getGlobalFetch()
  }

  async getConfig(): Promise<CliProxyApiConfigResult> {
    const raw = await this.getJsonValue<CliProxyApiConfigResponse>('config')

    return { config: raw, raw }
  }

  async getLatestVersion(): Promise<CliProxyApiLatestVersionResult> {
    const raw =
      await this.getJsonValue<CliProxyApiLatestVersionResponse>('latest-version')

    return {
      latestVersion:
        typeof raw['latest-version'] === 'string'
          ? raw['latest-version']
          : null,
      raw
    }
  }

  async getUsageQueue(count?: number): Promise<CliProxyApiUsageQueueResult> {
    const raw = await this.getJsonValue<CliProxyApiUsageQueueResponse>(
      'usage-queue',
      {
        query: { count }
      }
    )

    return {
      records: Array.isArray(raw) ? raw : [],
      raw: Array.isArray(raw) ? raw : []
    }
  }

  async getUsageStatisticsEnabled(): Promise<CliProxyApiUsageStatisticsEnabledResult> {
    const raw =
      await this.getJsonValue<CliProxyApiUsageStatisticsEnabledResponse>(
        'usage-statistics-enabled'
      )

    return {
      enabled:
        typeof raw['usage-statistics-enabled'] === 'boolean'
          ? raw['usage-statistics-enabled']
          : null,
      raw
    }
  }

  async getApiKeys(): Promise<CliProxyApiKeysResult> {
    const raw = await this.getJsonValue<CliProxyApiKeysResponse>('api-keys')

    return {
      apiKeys: Array.isArray(raw['api-keys']) ? raw['api-keys'] : [],
      raw
    }
  }

  async putApiKeys(apiKeys: string[]): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PUT',
      'api-keys',
      { body: apiKeys }
    )

    return toWriteResult(response)
  }

  async patchApiKey(
    input: CliProxyApiApiKeyPatchInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PATCH',
      'api-keys',
      { body: input }
    )

    return toWriteResult(response)
  }

  async deleteApiKey(
    input: CliProxyApiApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      'api-keys',
      { query: 'value' in input ? { value: input.value } : { index: input.index } }
    )

    return toWriteResult(response)
  }

  async getApiKeyUsage(): Promise<CliProxyApiKeyUsageResult> {
    const raw =
      await this.getJsonValue<CliProxyApiKeyUsageResponse>('api-key-usage')

    return { usage: raw, raw }
  }

  async getAuthFiles(): Promise<CliProxyApiAuthFilesResult> {
    const raw = await this.getJsonValue<CliProxyApiAuthFilesResponse>(
      'auth-files'
    )

    return {
      files: Array.isArray(raw.files) ? raw.files : [],
      raw
    }
  }

  async deleteAuthFile(
    input: CliProxyApiAuthFileDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      'auth-files',
      { query: 'name' in input ? { name: input.name } : { all: true } }
    )

    return toWriteResult(response)
  }

  async getGeminiApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult> {
    return this.getApiKeySection('gemini-api-key')
  }

  async putGeminiApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    return this.putApiKeySection('gemini-api-key', entries)
  }

  async patchGeminiApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyPatchInput
  ): Promise<CliProxyApiWriteResult> {
    return this.patchApiKeySection('gemini-api-key', input)
  }

  async deleteGeminiApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return this.deleteApiKeySection('gemini-api-key', input)
  }

  async getCodexApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult> {
    return this.getApiKeySection('codex-api-key')
  }

  async putCodexApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    return this.putApiKeySection('codex-api-key', entries)
  }

  async patchCodexApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyPatchInput
  ): Promise<CliProxyApiWriteResult> {
    return this.patchApiKeySection('codex-api-key', input)
  }

  async deleteCodexApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return this.deleteApiKeySection('codex-api-key', input)
  }

  async getClaudeApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult> {
    return this.getApiKeySection('claude-api-key')
  }

  async putClaudeApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    return this.putApiKeySection('claude-api-key', entries)
  }

  async patchClaudeApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyPatchInput
  ): Promise<CliProxyApiWriteResult> {
    return this.patchApiKeySection('claude-api-key', input)
  }

  async deleteClaudeApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return this.deleteApiKeySection('claude-api-key', input)
  }

  async getVertexApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult> {
    return this.getApiKeySection('vertex-api-key')
  }

  async putVertexApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    return this.putApiKeySection('vertex-api-key', entries)
  }

  async patchVertexApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyPatchInput
  ): Promise<CliProxyApiWriteResult> {
    return this.patchApiKeySection('vertex-api-key', input)
  }

  async deleteVertexApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return this.deleteApiKeySection('vertex-api-key', input)
  }

  async getAmpCodeConfig(): Promise<CliProxyApiAmpCodeResult> {
    const raw = await this.getJsonValue<CliProxyApiAmpCodeResponse>('ampcode')

    return {
      config: isJsonObject(raw.ampcode)
        ? (raw.ampcode as CliProxyApiAmpCodeConfig)
        : {},
      raw
    }
  }

  async putAmpCodeConfig(
    config: CliProxyApiAmpCodeConfig
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PUT',
      'ampcode',
      { body: config }
    )

    return toWriteResult(response)
  }

  async patchAmpCodeConfig(
    config: Partial<CliProxyApiAmpCodeConfig>
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PATCH',
      'ampcode',
      { body: config }
    )

    return toWriteResult(response)
  }

  async deleteAmpCodeConfig(): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      'ampcode'
    )

    return toWriteResult(response)
  }

  async getOauthModelAlias(): Promise<CliProxyApiOauthModelAliasResult> {
    const raw =
      await this.getJsonValue<CliProxyApiOauthModelAliasResponse>(
        'oauth-model-alias'
      )

    return {
      aliases: isRecord(raw['oauth-model-alias'])
        ? (raw['oauth-model-alias'] as CliProxyApiOauthModelAliasMap)
        : {},
      raw
    }
  }

  async putOauthModelAlias(
    aliases: CliProxyApiOauthModelAliasMap
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PUT',
      'oauth-model-alias',
      { body: aliases }
    )

    return toWriteResult(response)
  }

  async patchOauthModelAlias(
    input: CliProxyApiOauthModelAliasPatchInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PATCH',
      'oauth-model-alias',
      { body: input }
    )

    return toWriteResult(response)
  }

  async deleteOauthModelAlias(
    input: CliProxyApiOauthProviderDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      'oauth-model-alias',
      { query: { provider: input.provider } }
    )

    return toWriteResult(response)
  }

  async getOauthExcludedModels(): Promise<CliProxyApiOauthExcludedModelsResult> {
    const raw =
      await this.getJsonValue<CliProxyApiOauthExcludedModelsResponse>(
        'oauth-excluded-models'
      )

    return {
      excludedModels: isRecord(raw['oauth-excluded-models'])
        ? (raw['oauth-excluded-models'] as CliProxyApiOauthExcludedModelsMap)
        : {},
      raw
    }
  }

  async putOauthExcludedModels(
    excludedModels: CliProxyApiOauthExcludedModelsMap
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PUT',
      'oauth-excluded-models',
      { body: excludedModels }
    )

    return toWriteResult(response)
  }

  async patchOauthExcludedModels(
    input: CliProxyApiOauthExcludedModelsPatchInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PATCH',
      'oauth-excluded-models',
      { body: input }
    )

    return toWriteResult(response)
  }

  async deleteOauthExcludedModels(
    input: CliProxyApiOauthProviderDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      'oauth-excluded-models',
      { query: { provider: input.provider } }
    )

    return toWriteResult(response)
  }

  async getOpenAiCompatibilityProviders(): Promise<CliProxyApiOpenAiCompatibilityResult> {
    const raw =
      await this.getJsonValue<CliProxyApiOpenAiCompatibilityResponse>(
        'openai-compatibility'
      )

    return {
      providers: Array.isArray(raw['openai-compatibility'])
        ? raw['openai-compatibility']
        : [],
      raw
    }
  }

  private async getApiKeySection(
    section: CliProxyApiUpstreamApiKeySection
  ): Promise<CliProxyApiUpstreamApiKeySectionResult> {
    const raw = await this.getJsonValue<CliProxyApiJsonObject>(section)
    const entries = raw[section]

    return {
      entries: Array.isArray(entries) ? entries : [],
      raw
    }
  }

  private async putApiKeySection(
    section: CliProxyApiUpstreamApiKeySection,
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PUT',
      section,
      { body: entries }
    )

    return toWriteResult(response)
  }

  private async patchApiKeySection(
    section: CliProxyApiUpstreamApiKeySection,
    input: CliProxyApiUpstreamApiKeyPatchInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PATCH',
      section,
      { body: input }
    )

    return toWriteResult(response)
  }

  private async deleteApiKeySection(
    section: CliProxyApiUpstreamApiKeySection,
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      section,
      {
        query:
          'apiKey' in input
            ? { 'api-key': input.apiKey }
            : { index: input.index }
      }
    )

    return toWriteResult(response)
  }

  async upsertOpenAiCompatibilityProvider(
    provider: CliProxyApiOpenAiCompatibilityProviderInput
  ): Promise<CliProxyApiWriteResult> {
    const current = await this.getOpenAiCompatibilityProviders()

    if (
      !current.providers.some(
        (existing) => existing.name?.trim() === provider.name.trim()
      )
    ) {
      const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
        'PUT',
        'openai-compatibility',
        {
          body: [...current.providers, provider]
        }
      )

      return toWriteResult(response)
    }

    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'PATCH',
      'openai-compatibility',
      {
        body: {
          name: provider.name,
          value: provider
        }
      }
    )

    return toWriteResult(response)
  }

  async deleteOpenAiCompatibilityProvider(
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    const response = await this.writeJson<CliProxyApiWriteStatusResponse>(
      'DELETE',
      'openai-compatibility',
      {
        query:
          'name' in input ? { name: input.name } : { index: input.index }
      }
    )

    return toWriteResult(response)
  }

  async checkManagementApi(): Promise<CliProxyApiManagementCheckResult> {
    try {
      const response = await this.getJson<CliProxyApiJsonObject>('config', {
        forManagementCheck: true
      })

      return { ok: true, state: 'reachable', status: response.status }
    } catch (error) {
      if (isCliProxyApiError(error)) {
        return toManagementCheckResult(error)
      }

      return {
        ok: false,
        state: 'unexpected_error',
        error: 'Unexpected CLIProxyAPI management check failure'
      }
    }
  }

  private async getJsonValue<T>(
    path: string,
    options: JsonRequestOptions = {}
  ): Promise<T> {
    return (await this.getJson<T>(path, options)).value
  }

  private async getJson<T>(
    path: string,
    options: JsonRequestOptions = {}
  ): Promise<JsonResponse<T>> {
    const url = this.buildUrl(path, options.query)
    const response = await this.fetchWithTimeout(url, { method: 'GET' })
    const responseBody = await response.text()

    return parseJsonResponse<T>(response, responseBody, url, {
      forManagementCheck: options.forManagementCheck
    })
  }

  private async writeJson<T>(
    method: Exclude<JsonRequestMethod, 'GET'>,
    path: string,
    options: WriteJsonOptions = {}
  ): Promise<JsonResponse<T>> {
    const url = this.buildUrl(path, options.query)
    const response = await this.fetchWithTimeout(url, {
      method,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body)
    })
    const responseBody = await response.text()

    return parseJsonResponse<T>(response, responseBody, url)
  }

  private async fetchWithTimeout(
    url: string,
    init: { method: JsonRequestMethod; body?: BodyInit }
  ): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      return await this.fetchImpl(url, {
        method: init.method,
        headers: this.buildHeaders(init.body !== undefined),
        body: init.body,
        signal: controller.signal
      })
    } catch (cause) {
      if (controller.signal.aborted || isAbortError(cause)) {
        throw createTimeoutCliProxyApiError({
          url,
          timeoutMs: this.timeoutMs,
          cause
        })
      }

      throw createConnectionCliProxyApiError({ url, cause })
    } finally {
      clearTimeout(timeout)
    }
  }

  private buildHeaders(hasJsonBody = false): Headers {
    const headers = new Headers({ Accept: 'application/json' })

    if (hasJsonBody) {
      headers.set('Content-Type', 'application/json')
    }

    if (this.managementKey) {
      headers.set('Authorization', `Bearer ${this.managementKey}`)
    }

    return headers
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path.replace(/^\/+/, ''), this.baseUrl)

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }
}

export function createCliProxyApiClient(
  options: CliProxyApiClientOptions = {}
): CliProxyApiClient {
  return new CliProxyApiClient(options)
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function parseJsonResponse<T>(
  response: Response,
  responseBody: string,
  url: string,
  options: { forManagementCheck?: boolean } = {}
): JsonResponse<T> {
  if (!response.ok) {
    throw createHttpCliProxyApiError({
      status: response.status,
      statusText: response.statusText,
      url,
      responseBody,
      forManagementCheck: options.forManagementCheck
    })
  }

  try {
    return {
      value: JSON.parse(responseBody) as T,
      status: response.status
    }
  } catch (cause) {
    throw createInvalidJsonCliProxyApiError({
      url,
      responseBody,
      cause
    })
  }
}

function toWriteResult(
  response: JsonResponse<CliProxyApiWriteStatusResponse>
): CliProxyApiWriteResult {
  return {
    ok:
      response.value.status === 'ok' ||
      response.value.ok === true ||
      response.value.success === true,
    status: response.status,
    raw: response.value
  }
}

function isJsonObject(value: unknown): value is CliProxyApiJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isJsonObject(value)
}

function getGlobalFetch(): CliProxyApiFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('globalThis.fetch is not available')
  }

  return globalThis.fetch.bind(globalThis) as CliProxyApiFetch
}

function isAbortError(value: unknown): boolean {
  return (
    value instanceof Error &&
    (value.name === 'AbortError' || value.name === 'TimeoutError')
  )
}

function toManagementCheckResult(
  error: CliProxyApiError
): CliProxyApiManagementCheckResult {
  return {
    ok: false,
    state: error.state,
    status: error.status,
    error: error.toLogObject().message
  }
}
