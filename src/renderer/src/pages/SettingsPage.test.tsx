import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import { SettingsPage } from './SettingsPage'
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
    outputPortTest: null,
    modelOutputTest: null,
    codexDeviceLogin: null,
    loginOutput: [],
    busyAction: null,
    notice: null,
    error: null,
    ...patch
  }
}

test('renders output port connectivity and model output test results', () => {
  const html = renderToStaticMarkup(
    <SettingsPage
      state={createState({
        outputPortTest: {
          ok: true,
          state: 'reachable',
          target: 'http://127.0.0.1:8317',
          host: '127.0.0.1',
          port: 8317,
          latencyMs: 4,
          checkedAt: '2026-05-09T00:00:00.000Z'
        },
        modelOutputTest: {
          ok: true,
          state: 'reachable',
          target: 'http://127.0.0.1:8317/v1/chat/completions',
          model: 'test-model',
          status: 200,
          latencyMs: 8,
          outputText: 'allmone port is working',
          checkedAt: '2026-05-09T00:00:00.000Z'
        }
      })}
      onSaveOutputPort={() => {}}
      onTestConnection={() => {}}
      onTestOutputPortConnectivity={() => {}}
      onTestModelOutput={() => {}}
      onInstallUpdate={() => {}}
      onCheckUpdate={() => {}}
      onStartRuntime={() => {}}
      onRestartRuntime={() => {}}
      onStopRuntime={() => {}}
      onCopyEndpoint={() => {}}
    />
  )

  assert.match(html, /Output Port Tests/)
  assert.match(html, /Test Port/)
  assert.match(html, /Run Model/)
  assert.match(html, /http:\/\/127\.0\.0\.1:8317/)
  assert.match(html, /test-model/)
  assert.match(html, /allmone port is working/)
})
