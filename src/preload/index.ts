import { contextBridge, ipcRenderer } from 'electron'

import { RUNTIME_IPC_CHANNELS } from '../main/runtime/ipc'
import type { CliProxyApiOpenAiCompatibilityDeleteInput } from '../main/cliproxyapi'
import type {
  RuntimeConnectionSettingsInput,
  RuntimeOpenAiProviderInput
} from '../main/runtime/types'

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
    getConfigSummary: () =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.getConfigSummary),
    upsertOpenAiCompatibilityProvider: (input: RuntimeOpenAiProviderInput) =>
      ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.upsertOpenAiProvider, input),
    deleteOpenAiCompatibilityProvider: (
      input: CliProxyApiOpenAiCompatibilityDeleteInput
    ) => ipcRenderer.invoke(RUNTIME_IPC_CHANNELS.deleteOpenAiProvider, input)
  }
})
