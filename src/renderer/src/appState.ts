import type { ViewState } from './rendererTypes'

export function createInitialViewState(appVersion = ''): ViewState {
  return {
    appVersion,
    runtimeState: null,
    configSummary: null,
    configLoadError: null,
    upstreamCatalog: [],
    upstreamSummaries: [],
    authFiles: [],
    localConnection: null,
    localKeyPlaintext: null,
    codexDeviceLogin: null,
    loginOutput: [],
    busyAction: 'Loading',
    notice: null,
    error: null
  }
}
