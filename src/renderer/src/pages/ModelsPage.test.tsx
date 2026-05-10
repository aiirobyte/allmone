import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import { ModelsPage } from './ModelsPage'
import type { ViewState } from '../rendererTypes'

function createState(patch: Partial<ViewState> = {}): ViewState {
  return {
    appVersion: '0.2.1',
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

test('renders provider model IDs as child rows and keeps refresh control', () => {
  const html = renderToStaticMarkup(
    <ModelsPage
      state={createState({
        localOutputKeys: [
          {
            id: 'lok_default',
            name: 'Default local key',
            preview: 'ak-a...[REDACTED]...ault',
            isDefault: true
          }
        ],
        modelInventory: {
          serviceOrigin: 'http://127.0.0.1:8317',
          apiBaseUrl: 'http://127.0.0.1:8317/v1',
          fetchedAt: '2026-05-10T00:00:00.000Z',
          localOutputKeys: [
            {
              id: 'lok_default',
              name: 'Default local key',
              preview: 'ak-a...[REDACTED]...ault',
              isDefault: true
            }
          ],
          providers: [
            {
              id: 'gemini-api-key:0',
              providerKind: 'gemini-api-key',
              label: 'Gemini API key',
              family: 'api-key-upstream',
              configured: true,
              details: ['https://generativelanguage.googleapis.com/v1beta'],
              modelState: 'ready',
              models: [
                { id: 'gemini-2.5-pro', provider: 'gemini-api-key' },
                { id: 'gpt-5.4-mini', ownedBy: 'openai' }
              ]
            },
            {
              id: 'codex:0',
              providerKind: 'codex',
              label: 'Work Codex',
              family: 'account-upstream',
              configured: true,
              details: ['file', 'ok'],
              modelState: 'empty',
              emptyMessage: 'No models reported by /models',
              models: []
            }
          ]
        }
      })}
      runtimeReachable={true}
      onRefresh={() => {}}
      onCreateGeneratedLocalOutputKey={() => {}}
      onRenameLocalOutputKey={() => {}}
      onRevealLocalOutputKey={() => {}}
      onDeleteLocalOutputKey={() => {}}
    />
  )

  assert.match(html, /Model Inventory/)
  assert.match(html, /http:\/\/127\.0\.0\.1:8317\/v1/)
  assert.match(html, /Refresh/)
  assert.match(html, /Gemini API key/)
  assert.match(html, /gemini-2\.5-pro/)
  assert.match(html, /gpt-5\.4-mini/)
  assert.match(html, /Work Codex/)
  assert.match(html, /No models reported by \/models/)
  assert.match(html, /Default local key/)
  assert.match(html, /ak-a\.\.\.\[REDACTED\]\.\.\.ault/)
  assert.doesNotMatch(html, /ak-allmone/)
})

test('renders local output key controls with plaintext only when supplied', () => {
  const html = renderToStaticMarkup(
    <ModelsPage
      state={createState({
        localOutputKeys: [
          {
            id: 'lok_default',
            name: 'Default local key',
            preview: 'ak-v...[REDACTED]...once',
            isDefault: true
          }
        ],
        localOutputKeyPlaintext: {
          id: 'lok_default',
          name: 'Default local key',
          value: 'ak-visible-once'
        },
        modelInventory: {
          serviceOrigin: 'http://127.0.0.1:8317',
          apiBaseUrl: 'http://127.0.0.1:8317/v1',
          fetchedAt: '2026-05-10T00:00:00.000Z',
          localOutputKeys: [
            {
              id: 'lok_default',
              name: 'Default local key',
              preview: 'ak-v...[REDACTED]...once',
              isDefault: true
            }
          ],
          providers: []
        }
      })}
      runtimeReachable={true}
      onRefresh={() => {}}
      onCreateGeneratedLocalOutputKey={() => {}}
      onRenameLocalOutputKey={() => {}}
      onRevealLocalOutputKey={() => {}}
      onDeleteLocalOutputKey={() => {}}
    />
  )

  assert.match(html, /Local Output Keys/)
  assert.match(html, /Generate Key/)
  assert.doesNotMatch(html, /Save Key/)
  assert.doesNotMatch(html, /type="password"/)
  assert.match(html, /Reveal/)
  assert.match(html, /Delete/)
  assert.match(html, /ak-visible-once/)
})

test('renders local output key summaries when model inventory is unavailable', () => {
  const html = renderToStaticMarkup(
    <ModelsPage
      state={createState({
        modelInventoryError: 'Model inventory request failed with HTTP 503',
        localOutputKeys: [
          {
            id: 'lok_default',
            name: 'Default local key',
            preview: 'ak-k...[REDACTED]...down',
            isDefault: true
          }
        ]
      })}
      runtimeReachable={true}
      onRefresh={() => {}}
      onCreateGeneratedLocalOutputKey={() => {}}
      onRenameLocalOutputKey={() => {}}
      onRevealLocalOutputKey={() => {}}
      onDeleteLocalOutputKey={() => {}}
    />
  )

  assert.match(html, /Models unavailable/)
  assert.match(html, /Default local key/)
  assert.match(html, /ak-k\.\.\.\[REDACTED\]\.\.\.down/)
})
