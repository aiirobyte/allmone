import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const rendererSources = [
  'App.tsx',
  'appState.ts',
  'rendererTypes.ts',
  'rendererUtils.ts',
  'pages/ModelsPage.tsx',
  'pages/ProvidersPage.tsx',
  'pages/SettingsPage.tsx'
]

test('keeps auth and login state out of renderer durable browser storage', () => {
  for (const source of rendererSources) {
    const content = readFileSync(new URL(source, import.meta.url), 'utf8')

    assert(!content.includes('localStorage'), source)
    assert(!content.includes('sessionStorage'), source)
  }
})
