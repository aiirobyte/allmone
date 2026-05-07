import type {
  CliProxyApiManagementCheckResult,
  CliProxyApiOpenAiCompatibilityDeleteInput
} from '../../main/cliproxyapi'
import type {
  RuntimeConfigSummary,
  RuntimeConnectionSettingsInput,
  RuntimeOpenAiProviderInput,
  RuntimeProviderWriteResult,
  RuntimeState
} from '../../main/runtime/types'

export {}

interface AllmoneRuntimeApi {
  getState: () => Promise<RuntimeState>
  saveConnectionSettings: (
    input: RuntimeConnectionSettingsInput
  ) => Promise<RuntimeState>
  testConnection: () => Promise<CliProxyApiManagementCheckResult>
  getConfigSummary: () => Promise<RuntimeConfigSummary>
  upsertOpenAiCompatibilityProvider: (
    input: RuntimeOpenAiProviderInput
  ) => Promise<RuntimeProviderWriteResult>
  deleteOpenAiCompatibilityProvider: (
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ) => Promise<RuntimeProviderWriteResult>
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
