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

export interface CliProxyApiUpstreamApiKeyEntry extends CliProxyApiJsonObject {
  'api-key'?: string
  'auth-index'?: string
  'base-url'?: string
  prefix?: string
  disabled?: boolean
  headers?: Record<string, string>
  'proxy-url'?: string
  models?: CliProxyApiModelAlias[]
  'excluded-models'?: string[]
}

export type CliProxyApiApiKeyPatchInput =
  | { old: string; new: string; index?: never; value?: never }
  | { index: number; value: string; old?: never; new?: never }

export type CliProxyApiApiKeyDeleteInput =
  | { value: string; index?: never }
  | { index: number; value?: never }

export type CliProxyApiUpstreamApiKeyPatchInput =
  | { index: number; value: CliProxyApiUpstreamApiKeyEntry; match?: never }
  | { match: string; value: CliProxyApiUpstreamApiKeyEntry; index?: never }

export type CliProxyApiUpstreamApiKeyDeleteInput =
  | { apiKey: string; index?: never }
  | { index: number; apiKey?: never }

export type CliProxyApiUpstreamApiKeySection =
  | 'gemini-api-key'
  | 'codex-api-key'
  | 'claude-api-key'
  | 'vertex-api-key'

export interface CliProxyApiUpstreamApiKeySectionResult {
  entries: CliProxyApiUpstreamApiKeyEntry[]
  raw: CliProxyApiJsonObject
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

export type CliProxyApiAuthFileDeleteInput =
  | { name: string; all?: never }
  | { all: true; name?: never }

export interface CliProxyApiOpenAiCompatibilityResponse
  extends CliProxyApiJsonObject {
  'openai-compatibility'?: CliProxyApiOpenAiCompatibilityProvider[]
}

export interface CliProxyApiOpenAiCompatibilityResult {
  providers: CliProxyApiOpenAiCompatibilityProvider[]
  raw: CliProxyApiOpenAiCompatibilityResponse
}

export interface CliProxyApiModelRecord extends CliProxyApiJsonObject {
  id?: string
  name?: string
  model?: string
  display_name?: string
  type?: string
  owned_by?: string
}

export interface CliProxyApiAuthFileModelsResponse extends CliProxyApiJsonObject {
  models?: CliProxyApiModelRecord[]
}

export interface CliProxyApiAuthFileModelsResult {
  models: CliProxyApiModelRecord[]
  raw: CliProxyApiAuthFileModelsResponse
}

export interface CliProxyApiModelDefinitionsResponse
  extends CliProxyApiJsonObject {
  channel?: string
  models?: CliProxyApiModelRecord[]
}

export interface CliProxyApiModelDefinitionsResult {
  channel: string
  models: CliProxyApiModelRecord[]
  raw: CliProxyApiModelDefinitionsResponse
}

export interface CliProxyApiAmpCodeApiKeyMapping extends CliProxyApiJsonObject {
  'upstream-api-key'?: string
  'api-keys'?: string[]
}

export interface CliProxyApiAmpCodeModelMapping extends CliProxyApiJsonObject {
  from?: string
  to?: string
}

export interface CliProxyApiAmpCodeConfig extends CliProxyApiJsonObject {
  'upstream-url'?: string
  'upstream-api-key'?: string
  'upstream-api-keys'?: CliProxyApiAmpCodeApiKeyMapping[]
  'restrict-management-to-localhost'?: boolean
  'force-model-mappings'?: boolean
  'model-mappings'?: CliProxyApiAmpCodeModelMapping[]
}

export interface CliProxyApiAmpCodeResponse extends CliProxyApiJsonObject {
  ampcode?: CliProxyApiAmpCodeConfig
}

export interface CliProxyApiAmpCodeResult {
  config: CliProxyApiAmpCodeConfig
  raw: CliProxyApiAmpCodeResponse
}

export interface CliProxyApiOauthModelAliasRow extends CliProxyApiJsonObject {
  name?: string
  alias?: string
  fork?: boolean
}

export type CliProxyApiOauthModelAliasMap = Record<
  string,
  CliProxyApiOauthModelAliasRow[]
>

export interface CliProxyApiOauthModelAliasResponse extends CliProxyApiJsonObject {
  'oauth-model-alias'?: CliProxyApiOauthModelAliasMap
}

export interface CliProxyApiOauthModelAliasResult {
  aliases: CliProxyApiOauthModelAliasMap
  raw: CliProxyApiOauthModelAliasResponse
}

export interface CliProxyApiOauthModelAliasPatchInput extends CliProxyApiJsonObject {
  provider: string
  models: CliProxyApiOauthModelAliasRow[]
}

export type CliProxyApiOauthExcludedModelsMap = Record<string, string[]>

export interface CliProxyApiOauthExcludedModelsResponse
  extends CliProxyApiJsonObject {
  'oauth-excluded-models'?: CliProxyApiOauthExcludedModelsMap
}

export interface CliProxyApiOauthExcludedModelsResult {
  excludedModels: CliProxyApiOauthExcludedModelsMap
  raw: CliProxyApiOauthExcludedModelsResponse
}

export interface CliProxyApiOauthExcludedModelsPatchInput
  extends CliProxyApiJsonObject {
  provider: string
  models: string[]
}

export interface CliProxyApiOauthProviderDeleteInput {
  provider: string
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
