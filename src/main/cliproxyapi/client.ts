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
  type CliProxyApiOpenAiCompatibilityDeleteInput,
  type CliProxyApiOpenAiCompatibilityProviderInput,
  type CliProxyApiOpenAiCompatibilityResponse,
  type CliProxyApiOpenAiCompatibilityResult,
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
