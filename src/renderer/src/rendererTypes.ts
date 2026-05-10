import type {
  RuntimeConfigSummary,
  RuntimeModelOutputTestInput,
  RuntimeModelOutputTestResult,
  RuntimeOutputPortConnectivityResult,
  RuntimeState
} from '../../main/runtime/types'
import type {
  LocalOutputKeyIdInput,
  LocalOutputKeyMutationResult,
  LocalOutputKeyNamedInput,
  LocalOutputKeyRenameInput,
  LocalOutputKeySummary,
  ModelInventory
} from '../../main/models'
import type {
  LocalConnectionOutput,
  ProviderLoginEvent,
  UpstreamExcludedModelRow,
  UpstreamAuthFileSummary,
  UpstreamModelAliasRow,
  UpstreamProviderCatalogEntry,
  UpstreamProviderKind,
  UpstreamProviderSummary
} from '../../main/upstreams'

export type ActiveSection = 'models' | 'providers' | 'settings'

export type ConfigLoadResult = {
  summary: RuntimeConfigSummary | null
  error: string | null
}

export type SafeEndpointKind = 'api'

export type UpstreamApiFormInput = {
  providerKind: UpstreamProviderKind
  entryIndex?: number
  apiKey?: string
  providerName?: string
  baseUrl?: string
  disabled?: boolean
  modelAliases?: UpstreamModelAliasRow[]
  excludedModels?: UpstreamExcludedModelRow[]
}

export type AmpFormInput = {
  upstreamUrl?: string
  upstreamApiKey?: string
}

export type ModelOutputTestFormInput = RuntimeModelOutputTestInput

export type LocalOutputKeyPlaintext = {
  id: string
  name: string
  value: string
}

export type LocalOutputKeyCreateInput = LocalOutputKeyNamedInput
export type LocalOutputKeyRenameFormInput = LocalOutputKeyRenameInput
export type LocalOutputKeyActionInput = LocalOutputKeyIdInput
export type LocalOutputKeyActionResult = LocalOutputKeyMutationResult

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
  modelInventory: ModelInventory | null
  modelInventoryError: string | null
  localOutputKeys: LocalOutputKeySummary[]
  localOutputKeyPlaintext: LocalOutputKeyPlaintext | null
  outputPortTest: RuntimeOutputPortConnectivityResult | null
  modelOutputTest: RuntimeModelOutputTestResult | null
  codexDeviceLogin: CodexDeviceLoginState | null
  loginOutput: string[]
  busyAction: string | null
  notice: string | null
  error: string | null
}
