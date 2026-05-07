import type {
  CliProxyApiManagementState,
  CliProxyApiModelAlias
} from '../cliproxyapi'

export interface RuntimeConnectionSettings {
  baseUrl: string
  timeoutMs: number
  managementKeyConfigured: boolean
  managementKeyPersisted: boolean
}

export interface RuntimeConnectionSettingsInput {
  baseUrl?: string
  timeoutMs?: number
  managementKey?: string
  clearManagementKey?: boolean
}

export interface RuntimeLoadedSettings {
  connection: RuntimeConnectionSettings
  managementKey?: string
}

export interface RuntimeState {
  status: CliProxyApiManagementState
  connection: RuntimeConnectionSettings
  lastError?: string
  lastCheckedAt?: string
  lastHttpStatus?: number
}

export interface RuntimeOpenAiProviderSummary {
  name: string
  disabled: boolean
  baseUrl: string
  apiKeyEntries: RuntimeProviderKeySummary[]
  models: CliProxyApiModelAlias[]
  headers: Record<string, string>
}

export interface RuntimeProviderKeySummary {
  apiKey: string
  proxyUrl?: string
  authIndex?: string
}

export interface RuntimeConfigSummary {
  debug?: boolean
  requestLog?: boolean
  requestRetry?: number
  apiKeysConfigured: number
  openAiCompatibilityProviders: RuntimeOpenAiProviderSummary[]
}

export interface RuntimeOpenAiProviderInput {
  name: string
  disabled?: boolean
  baseUrl: string
  apiKey?: string
  proxyUrl?: string
  models?: CliProxyApiModelAlias[]
  headers?: Record<string, string>
}

export interface RuntimeProviderWriteResult {
  ok: boolean
  status: number
  summary: RuntimeConfigSummary
}
