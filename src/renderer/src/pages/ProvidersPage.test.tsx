import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import { ProvidersPage } from './ProvidersPage'
import type { ViewState } from '../rendererTypes'

function createState(patch: Partial<ViewState> = {}): ViewState {
  return {
    appVersion: '0.2.0',
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
    busyAction: null,
    notice: null,
    error: null,
    ...patch
  }
}

test('renders Codex device login details from realtime IPC state', () => {
  const html = renderToStaticMarkup(
    <ProvidersPage
      state={createState({
        codexDeviceLogin: {
          type: 'codex-device-code',
          kind: 'codex-device-login',
          url: 'https://auth.openai.com/codex/device',
          code: 'ABCD-1234'
        },
        loginOutput: ['Codex device code: ABCD-1234\n']
      })}
      runtimeReachable={true}
      onGenerateLocalKey={() => {}}
      onSetLocalKey={() => {}}
      onSaveApiKeyUpstream={() => {}}
      onSaveAmp={() => {}}
      onResetAmp={() => {}}
      onLoginProvider={() => {}}
    />
  )

  assert.match(html, /Provider Login/)
  assert.match(html, /https:\/\/auth\.openai\.com\/codex\/device/)
  assert.match(html, /ABCD-1234/)
})
