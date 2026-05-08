import { contextBridge, ipcRenderer } from 'electron'

import { RUNTIME_IPC_CHANNELS, RUNTIME_IPC_EVENTS } from '../main/runtime/ipc'
import type { CliProxyApiOpenAiCompatibilityDeleteInput } from '../main/cli-proxy-api'
import type {
  RuntimeConnectionSettingsInput,
  RuntimeModelOutputTestInput,
  RuntimeOpenAiProviderInput
} from '../main/runtime/types'
import type {
  ProviderLoginRunInput,
  ProviderLoginEvent,
  UpstreamAmpConfig,
  UpstreamApiKeyCredentialInput,
  UpstreamProviderKind
} from '../main/upstreams'

const electronAPI = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

contextBridge.exposeInMainWorld('allmone', {
  app: electronAPI,
  runtime: {
    getState: () => ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getState),
    saveConnectionSettings: (input: RuntimeConnectionSettingsInput) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.saveConnection, input),
    testConnection: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.testConnection),
    testOutputPortConnectivity: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.testOutputPortConnectivity),
    testModelOutput: (input: RuntimeModelOutputTestInput) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.testModelOutput, input),
    getConfigSummary: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getConfigSummary),
    saveOutputPort: (port: number) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.saveOutputPort, { port }),
    ensureInstalledThenStart: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.ensureInstalledThenStart),
    checkForUpdate: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.checkForUpdate),
    startManagedRuntime: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.startManagedRuntime),
    restartManagedRuntime: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.restartManagedRuntime),
    stopManagedRuntime: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.stopManagedRuntime),
    copyApiBase: () => ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.copyApiBase),
    upsertOpenAiCompatibilityProvider: (input: RuntimeOpenAiProviderInput) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.upsertOpenAiProvider, input),
    deleteOpenAiCompatibilityProvider: (
      input: CliProxyApiOpenAiCompatibilityDeleteInput
    ) => ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.deleteOpenAiProvider, input),
    getUpstreamCatalog: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getUpstreamCatalog),
    getUpstreamSummaries: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getUpstreamSummaries),
    getLocalConnectionOutput: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getLocalConnectionOutput),
    generateLocalApiKey: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.generateLocalApiKey),
    setLocalApiKey: (apiKey: string) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.setLocalApiKey, { apiKey }),
    deleteLocalApiKey: (input: { value: string } | { index: number }) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.deleteLocalApiKey, input),
    upsertApiKeyUpstream: (input: UpstreamApiKeyCredentialInput) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.upsertApiKeyUpstream, input),
    deleteApiKeyUpstream: (
      input: { providerKind: UpstreamProviderKind } & (
        | { apiKey: string }
        | { index: number }
      )
    ) => ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.deleteApiKeyUpstream, input),
    writeAmpConfig: (input: UpstreamAmpConfig) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.writeAmpConfig, input),
    resetAmpConfig: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.resetAmpConfig),
    getAuthFiles: () => ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getAuthFiles),
    deleteAuthFile: (input: { name: string } | { all: true }) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.deleteAuthFile, input),
    runLoginAction: (input: ProviderLoginRunInput) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.runLoginAction, input),
    onLoginEvent: (callback: (event: ProviderLoginEvent) => void) => {
      const listener = (_event: unknown, event: ProviderLoginEvent) => callback(event)
      ipcRenderer.on(RUNTIME_IPC_EVENTS.loginEvent, listener)

      return () => {
        ipcRenderer.removeListener(RUNTIME_IPC_EVENTS.loginEvent, listener)
      }
    }
  }
})
