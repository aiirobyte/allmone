import type {
  CliProxyApiManagementState,
  CliProxyApiModelAlias
} from '../cli-proxy-api'
import type { CliProxyApiProcessState } from './cliproxyapiProcessController'

export interface RuntimeSoftwareConfigSummary {
  cliproxyapi: {
    releaseMetadataUrl: string
    releasePageUrl: string
    localExecutablePath: string
  }
  runtime: {
    host: string
    port: number
    timeoutMs: number
    configPath: string
    apiBaseUrl: string
    managementBaseUrl: string
  }
}

export interface RuntimeConnectionSettings {
  baseUrl: string
  timeoutMs: number
  managementKeyConfigured: boolean
  managementKeyPersisted: boolean
}

export interface RuntimeConnectionSettingsInput {
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
  software?: RuntimeSoftwareConfigSummary
  managed?: CliProxyApiProcessState
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
