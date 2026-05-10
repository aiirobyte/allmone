import type {
  CliProxyApiManagementCheckResult,
  CliProxyApiOpenAiCompatibilityDeleteInput
} from '../../main/cli-proxy-api'
import type {
  LocalOutputKeyIdInput,
  LocalOutputKeyMutationResult,
  LocalOutputKeyNamedInput,
  LocalOutputKeyRenameInput,
  LocalOutputKeySummary,
  ModelInventory
} from '../../main/models'
import type {
  RuntimeConfigSummary,
  RuntimeConnectionSettingsInput,
  RuntimeModelOutputTestInput,
  RuntimeModelOutputTestResult,
  RuntimeOpenAiProviderInput,
  RuntimeOutputPortConnectivityResult,
  RuntimeProviderWriteResult,
  RuntimeState
} from '../../main/runtime/types'
import type {
  LocalApiKeyState,
  LocalConnectionOutput,
  ProviderLoginEvent,
  ProviderLoginRunInput,
  ProviderLoginRunResult,
  UpstreamAmpConfig,
  UpstreamApiKeyCredentialInput,
  UpstreamAuthFileSummary,
  UpstreamProviderCatalogEntry,
  UpstreamProviderKind,
  UpstreamProviderSummary
} from '../../main/upstreams'

export {}

interface AllmoneRuntimeApi {
  getState: () => Promise<RuntimeState>
  saveConnectionSettings: (
    input: RuntimeConnectionSettingsInput
  ) => Promise<RuntimeState>
  testConnection: () => Promise<CliProxyApiManagementCheckResult>
  testOutputPortConnectivity: () => Promise<RuntimeOutputPortConnectivityResult>
  testModelOutput: (
    input: RuntimeModelOutputTestInput
  ) => Promise<RuntimeModelOutputTestResult>
  getConfigSummary: () => Promise<RuntimeConfigSummary>
  saveOutputPort: (port: number) => Promise<RuntimeState>
  ensureInstalledThenStart: () => Promise<RuntimeState>
  checkForUpdate: () => Promise<RuntimeState>
  startManagedRuntime: () => Promise<RuntimeState>
  restartManagedRuntime: () => Promise<RuntimeState>
  stopManagedRuntime: () => Promise<RuntimeState>
  copyApiBase: () => Promise<{ value: string }>
  upsertOpenAiCompatibilityProvider: (
    input: RuntimeOpenAiProviderInput
  ) => Promise<RuntimeProviderWriteResult>
  deleteOpenAiCompatibilityProvider: (
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ) => Promise<RuntimeProviderWriteResult>
  getUpstreamCatalog: () => Promise<UpstreamProviderCatalogEntry[]>
  getUpstreamSummaries: () => Promise<UpstreamProviderSummary[]>
  getLocalConnectionOutput: () => Promise<LocalConnectionOutput>
  getLocalOutputKeys: () => Promise<LocalOutputKeySummary[]>
  getModelInventory: () => Promise<ModelInventory>
  createGeneratedLocalOutputKey: (
    input: LocalOutputKeyNamedInput
  ) => Promise<LocalOutputKeyMutationResult>
  renameLocalOutputKey: (
    input: LocalOutputKeyRenameInput
  ) => Promise<LocalOutputKeyMutationResult>
  revealLocalOutputKey: (
    input: LocalOutputKeyIdInput
  ) => Promise<LocalOutputKeyMutationResult>
  deleteLocalOutputKey: (
    input: LocalOutputKeyIdInput
  ) => Promise<{ keys: LocalOutputKeySummary[] }>
  generateLocalApiKey: () => Promise<LocalApiKeyState>
  setLocalApiKey: (apiKey: string) => Promise<LocalApiKeyState>
  deleteLocalApiKey: (input: { value: string } | { index: number }) => Promise<unknown>
  upsertApiKeyUpstream: (
    input: UpstreamApiKeyCredentialInput
  ) => Promise<unknown>
  deleteApiKeyUpstream: (
    input: { providerKind: UpstreamProviderKind } & (
      | { apiKey: string }
      | { index: number }
    )
  ) => Promise<unknown>
  writeAmpConfig: (input: UpstreamAmpConfig) => Promise<unknown>
  resetAmpConfig: () => Promise<unknown>
  getAuthFiles: () => Promise<UpstreamAuthFileSummary[]>
  deleteAuthFile: (input: { name: string } | { all: true }) => Promise<unknown>
  runLoginAction: (input: ProviderLoginRunInput) => Promise<ProviderLoginRunResult>
  onLoginEvent: (callback: (event: ProviderLoginEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
    }
    allmone: {
      app: {
        getVersion: () => Promise<string>
      }
      runtime: AllmoneRuntimeApi
    }
  }
}
