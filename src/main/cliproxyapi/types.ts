export const CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL =
  'http://localhost:8317/v0/management'

export type CliProxyApiJsonObject = Record<string, unknown>

export type CliProxyApiFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export interface CliProxyApiClientOptions {
  baseUrl?: string
  managementKey?: string
  timeoutMs?: number
  fetch?: CliProxyApiFetch
}

export type CliProxyApiManagementState =
  | 'reachable'
  | 'auth_required'
  | 'management_disabled'
  | 'unreachable'
  | 'timeout'
  | 'invalid_response'
  | 'unexpected_error'

export interface CliProxyApiManagementCheckResult {
  ok: boolean
  state: CliProxyApiManagementState
  status?: number
  error?: string
}

export interface CliProxyApiStatusResponse extends CliProxyApiJsonObject {
  status?: string
  ok?: boolean
  success?: boolean
  message?: string
}

export interface CliProxyApiLatestVersionResponse extends CliProxyApiJsonObject {
  'latest-version'?: string
}

export interface CliProxyApiLatestVersionResult {
  latestVersion: string | null
  raw: CliProxyApiLatestVersionResponse
}

export interface CliProxyApiModelAlias extends CliProxyApiJsonObject {
  name?: string
  alias?: string
}

export interface CliProxyApiKeyEntry extends CliProxyApiJsonObject {
  'api-key'?: string
  'proxy-url'?: string
  'auth-index'?: string
}

export interface CliProxyApiOpenAiCompatibilityProvider extends CliProxyApiJsonObject {
  name?: string
  disabled?: boolean
  'base-url'?: string
  'api-key-entries'?: CliProxyApiKeyEntry[]
  models?: CliProxyApiModelAlias[]
  headers?: Record<string, string>
}

export interface CliProxyApiOpenAiCompatibilityProviderInput
  extends CliProxyApiJsonObject {
  name: string
  disabled?: boolean
  'base-url': string
  'api-key-entries'?: CliProxyApiKeyEntry[]
  models?: CliProxyApiModelAlias[]
  headers?: Record<string, string>
}

export type CliProxyApiOpenAiCompatibilityDeleteInput =
  | { name: string; index?: never }
  | { index: number; name?: never }

export interface CliProxyApiConfigResponse extends CliProxyApiJsonObject {
  debug?: boolean
  'proxy-url'?: string
  'api-keys'?: string[]
  'request-log'?: boolean
  'request-retry'?: number
  'openai-compatibility'?: CliProxyApiOpenAiCompatibilityProvider[]
}

export interface CliProxyApiConfigResult {
  config: CliProxyApiConfigResponse
  raw: CliProxyApiConfigResponse
}

export interface CliProxyApiUsageTokenCounts extends CliProxyApiJsonObject {
  input_tokens?: number
  output_tokens?: number
  reasoning_tokens?: number
  cached_tokens?: number
  total_tokens?: number
}

export interface CliProxyApiUsageQueueRecord extends CliProxyApiJsonObject {
  timestamp?: string
  latency_ms?: number
  source?: string
  auth_index?: string
  tokens?: CliProxyApiUsageTokenCounts
  failed?: boolean
  provider?: string
  model?: string
  alias?: string
  endpoint?: string
  auth_type?: string
  api_key?: string
  request_id?: string
}

export type CliProxyApiUsageQueueResponse = CliProxyApiUsageQueueRecord[]

export interface CliProxyApiUsageQueueResult {
  records: CliProxyApiUsageQueueRecord[]
  raw: CliProxyApiUsageQueueResponse
}

export interface CliProxyApiUsageStatisticsEnabledResponse
  extends CliProxyApiJsonObject {
  'usage-statistics-enabled'?: boolean
}

export interface CliProxyApiUsageStatisticsEnabledResult {
  enabled: boolean | null
  raw: CliProxyApiUsageStatisticsEnabledResponse
}

export interface CliProxyApiKeysResponse extends CliProxyApiJsonObject {
  'api-keys'?: string[]
}

export interface CliProxyApiKeysResult {
  apiKeys: string[]
  raw: CliProxyApiKeysResponse
}

export interface CliProxyApiRequestBucket extends CliProxyApiJsonObject {
  time?: string
  success?: number
  failed?: number
}

export interface CliProxyApiKeyUsageEntry extends CliProxyApiJsonObject {
  success?: number
  failed?: number
  recent_requests?: CliProxyApiRequestBucket[]
}

export type CliProxyApiKeyUsageProvider = Record<
  string,
  CliProxyApiKeyUsageEntry
>

export type CliProxyApiKeyUsageResponse = Record<
  string,
  CliProxyApiKeyUsageProvider
>

export interface CliProxyApiKeyUsageResult {
  usage: CliProxyApiKeyUsageResponse
  raw: CliProxyApiKeyUsageResponse
}

export type CliProxyApiAuthFileSource = 'file' | 'memory' | string

export interface CliProxyApiAuthFileRecord extends CliProxyApiJsonObject {
  id?: string
  auth_index?: string
  name?: string
  provider?: string
  label?: string
  status?: string
  status_message?: string
  disabled?: boolean
  unavailable?: boolean
  runtime_only?: boolean
  source?: CliProxyApiAuthFileSource
  path?: string
  size?: number
  modtime?: string
  type?: string
  success?: number
  failed?: number
  recent_requests?: CliProxyApiRequestBucket[]
  email?: string
  account_type?: string
  account?: string
  created_at?: string
  updated_at?: string
  last_refresh?: string
}

export interface CliProxyApiAuthFilesResponse extends CliProxyApiJsonObject {
  files?: CliProxyApiAuthFileRecord[]
}

export interface CliProxyApiAuthFilesResult {
  files: CliProxyApiAuthFileRecord[]
  raw: CliProxyApiAuthFilesResponse
}

export interface CliProxyApiOpenAiCompatibilityResponse
  extends CliProxyApiJsonObject {
  'openai-compatibility'?: CliProxyApiOpenAiCompatibilityProvider[]
}

export interface CliProxyApiOpenAiCompatibilityResult {
  providers: CliProxyApiOpenAiCompatibilityProvider[]
  raw: CliProxyApiOpenAiCompatibilityResponse
}

export interface CliProxyApiWriteStatusResponse extends CliProxyApiJsonObject {
  status?: string
  ok?: boolean
  success?: boolean
  message?: string
}

export interface CliProxyApiWriteResult {
  ok: boolean
  status: number
  raw: CliProxyApiWriteStatusResponse
}
