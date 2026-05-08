import assert from 'node:assert/strict'

import {
  UPSTREAM_PROVIDER_CATALOG,
  UPSTREAM_PROVIDER_KINDS,
  getUpstreamProviderCatalogEntry,
  type UpstreamProviderKind
} from './catalog'

const expectedProviderKinds: UpstreamProviderKind[] = [
  'api-keys',
  'gemini-api-key',
  'codex-api-key',
  'claude-api-key',
  'openai-compatibility',
  'vertex-api-key',
  'ampcode',
  'gemini-cli',
  'aistudio',
  'antigravity',
  'claude',
  'codex',
  'kimi',
  'vertex'
]

test('covers every v0.1.5 upstream provider kind', () => {
  assert.deepEqual(UPSTREAM_PROVIDER_KINDS, expectedProviderKinds)
  assert.equal(UPSTREAM_PROVIDER_CATALOG.length, expectedProviderKinds.length)

  for (const kind of expectedProviderKinds) {
    assert.equal(getUpstreamProviderCatalogEntry(kind).kind, kind)
  }
})

test('identifies the CLIProxyAPI config section or channel for each entry', () => {
  for (const entry of UPSTREAM_PROVIDER_CATALOG) {
    assert.ok(entry.cliproxyapi.section || entry.cliproxyapi.channel)
    assert.notEqual(entry.cliproxyapi.section, '')
    assert.notEqual(entry.cliproxyapi.channel, '')
  }

  assert.equal(
    getUpstreamProviderCatalogEntry('openai-compatibility').cliproxyapi.section,
    'openai-compatibility'
  )
  assert.equal(
    getUpstreamProviderCatalogEntry('gemini-cli').cliproxyapi.channel,
    'gemini-cli'
  )
})

test('marks all secret fields as non-displayable', () => {
  for (const entry of UPSTREAM_PROVIDER_CATALOG) {
    for (const secretField of entry.secretFields) {
      const field = entry.editableFields.find(({ name }) => name === secretField)
      assert.notEqual(
        field?.displayable,
        true,
        `${entry.kind} must not display ${secretField}`
      )
    }
  }
})

test('does not introduce provider protocol or proxying behavior', () => {
  for (const entry of UPSTREAM_PROVIDER_CATALOG) {
    assert.equal(entry.capabilities.providerProtocolLogic, false)
    assert.equal(entry.capabilities.requestTransformation, false)
    assert.equal(entry.capabilities.responseTransformation, false)
  }
})
