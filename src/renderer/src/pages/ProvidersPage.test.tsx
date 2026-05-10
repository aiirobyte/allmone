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
    modelInventory: null,
    modelInventoryError: null,
    localOutputKeys: [],
    localOutputKeyPlaintext: null,
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
      onSaveApiKeyUpstream={() => {}}
      onSaveAmp={() => {}}
      onResetAmp={() => {}}
      onLoginProvider={() => {}}
      onDeleteApiKeyUpstream={() => {}}
      onDeleteAuthFile={() => {}}
    />
  )

  assert.match(html, /Provider Login/)
  assert.match(html, /https:\/\/auth\.openai\.com\/codex\/device/)
  assert.match(html, /ABCD-1234/)
})

test('renders multiple auth files grouped under their account providers', () => {
  const html = renderToStaticMarkup(
    <ProvidersPage
      state={createState({
        upstreamSummaries: [
          {
            providerKind: 'codex',
            label: 'Codex OAuth',
            configured: true,
            redactedFields: ['authFileSummary']
          },
          {
            providerKind: 'claude',
            label: 'Claude Code OAuth',
            configured: true,
            redactedFields: ['authFileSummary']
          }
        ],
        authFiles: [
          {
            name: 'codex-work.json',
            providerKind: 'codex',
            label: 'Work Codex',
            status: 'ok',
            source: 'file',
            disabled: false,
            redactedPath: '[REDACTED_PATH]/codex-work.json'
          },
          {
            name: 'codex-personal.json',
            providerKind: 'codex',
            label: 'Personal Codex',
            status: 'expired',
            source: 'file',
            disabled: true,
            diagnostics: ['refresh failed']
          },
          {
            name: 'claude-work.json',
            providerKind: 'claude',
            label: 'Claude Work',
            status: 'ok',
            source: 'file',
            redactedPath: '[REDACTED_PATH]/claude-work.json'
          }
        ]
      })}
      runtimeReachable={true}
      onSaveApiKeyUpstream={() => {}}
      onSaveAmp={() => {}}
      onResetAmp={() => {}}
      onLoginProvider={() => {}}
      onDeleteApiKeyUpstream={() => {}}
      onDeleteAuthFile={() => {}}
    />
  )

  assert.match(html, /Codex OAuth/)
  assert.match(html, /2 auth files/)
  assert.match(html, /Work Codex/)
  assert.match(html, /Personal Codex/)
  assert.match(html, /expired/)
  assert.match(html, /disabled/)
  assert.match(html, /refresh failed/)
  assert.match(html, /\[REDACTED_PATH\]\/codex-work\.json/)
  assert.match(html, /Claude Code OAuth/)
  assert.match(html, /Claude Work/)
  assert.match(html, /Delete/)
  assert.doesNotMatch(html, /\/Users\/me\/.allmone/)
})

test('renders multiple provider entries with delete actions without raw secrets', () => {
  const html = renderToStaticMarkup(
    <ProvidersPage
      state={createState({
        upstreamSummaries: [
          {
            providerKind: 'gemini-api-key',
            label: 'Gemini API key',
            configured: true,
            redactedFields: ['apiKey', 'proxyUrl'],
            entries: [
              {
                'api-key': 'gemini-secret-one',
                'base-url': 'https://gemini.example.com',
                models: [{ name: 'gemini-2.5-pro', alias: 'pro' }],
                'excluded-models': ['gemini-1.0-pro']
              },
              {
                'api-key': '[REDACTED:gemi...two]',
                disabled: true,
                'proxy-url': 'https://[REDACTED]@proxy.example.com'
              }
            ]
          },
          {
            providerKind: 'openai-compatibility',
            label: 'OpenAI-compatible provider',
            configured: true,
            redactedFields: ['apiKeyEntries'],
            entries: [
              {
                name: 'openrouter',
                baseUrl: 'https://openrouter.ai/api/v1',
                apiKeyEntries: [{ 'api-key': '[REDACTED]' }]
              },
              {
                name: 'custom-openai',
                baseUrl: 'https://custom.example.com/v1',
                disabled: true
              }
            ]
          }
        ]
      })}
      runtimeReachable={true}
      onSaveApiKeyUpstream={() => {}}
      onSaveAmp={() => {}}
      onResetAmp={() => {}}
      onLoginProvider={() => {}}
      onDeleteApiKeyUpstream={() => {}}
      onDeleteAuthFile={() => {}}
    />
  )

  assert.match(html, /Gemini API key/)
  assert.match(html, /2 entries/)
  assert.match(html, /https:\/\/gemini\.example\.com/)
  assert.match(html, /Edit/)
  assert.match(html, /API Key/)
  assert.match(html, /Leave blank to keep current key/)
  assert.match(html, /gemini-2\.5-pro = pro/)
  assert.match(html, /gemini-1\.0-pro/)
  assert.match(html, /OpenAI-compatible provider/)
  assert.match(html, /Provider Name/)
  assert.match(html, /openrouter/)
  assert.match(html, /custom-openai/)
  assert.match(html, /https:\/\/custom\.example\.com\/v1/)
  assert.match(html, /disabled/)
  assert.match(html, /Delete/)
  assert.match(html, /Save Entry/)
  assert.doesNotMatch(html, /gemini-secret-one/)
})
