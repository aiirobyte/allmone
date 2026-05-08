import type {
  RuntimeConfigSummary,
  RuntimeState
} from '../../main/runtime/types'
import type {
  LocalConnectionOutput,
  ProviderLoginEvent,
  UpstreamAuthFileSummary,
  UpstreamProviderCatalogEntry,
  UpstreamProviderKind,
  UpstreamProviderSummary
} from '../../main/upstreams'

export type ActiveSection = 'providers' | 'settings'

export type ConfigLoadResult = {
  summary: RuntimeConfigSummary | null
  error: string | null
}

export type SafeEndpointKind = 'api'

export type UpstreamApiFormInput = {
  providerKind: UpstreamProviderKind
  apiKey: string
  providerName?: string
  baseUrl?: string
}

export type AmpFormInput = {
  upstreamUrl?: string
  upstreamApiKey?: string
}

export type CodexDeviceLoginState = Extract<
  ProviderLoginEvent,
  { type: 'codex-device-code' }
>

export type ViewState = {
  appVersion: string
  runtimeState: RuntimeState | null
  configSummary: RuntimeConfigSummary | null
  configLoadError: string | null
  upstreamCatalog: UpstreamProviderCatalogEntry[]
  upstreamSummaries: UpstreamProviderSummary[]
  authFiles: UpstreamAuthFileSummary[]
  localConnection: LocalConnectionOutput | null
  localKeyPlaintext: string | null
  codexDeviceLogin: CodexDeviceLoginState | null
  loginOutput: string[]
  busyAction: string | null
  notice: string | null
  error: string | null
}
