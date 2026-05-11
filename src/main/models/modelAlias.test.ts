import assert from 'node:assert/strict'

import {
  projectEffectiveModelRows,
  reconcileModelAliases
} from './modelAlias'

test('projects effective model IDs from identity, explicit, fork, and legacy alias rows', () => {
  const rows = projectEffectiveModelRows([
    { name: 'identity-model', alias: 'identity-model' },
    { name: 'upstream-model', alias: 'public-model' },
    { name: 'fork-upstream', alias: 'fork-public', fork: true },
    { name: 'legacy-only-name' },
    { name: 'duplicate-upstream', alias: 'public-model' },
    { name: 'fork-upstream' }
  ])

  assert.deepEqual(
    rows.map((row) => row.id),
    [
      'identity-model',
      'public-model',
      'fork-public',
      'fork-upstream',
      'legacy-only-name'
    ]
  )
  assert(rows.every((row) => row.source === 'configured'))
})

test('model metadata never determines alias membership', () => {
  const rows = projectEffectiveModelRows([
    {
      id: 'metadata-id',
      provider: 'codex',
      source: 'merged',
      channel: 'openai',
      owned_by: 'openai'
    },
    {
      name: 'configured-name',
      alias: 'configured-alias',
      provider: 'other-provider',
      source: 'metadata',
      channel: 'other-channel',
      owned_by: 'other-owner'
    }
  ])

  assert.deepEqual(rows, [
    {
      id: 'configured-alias',
      source: 'configured'
    }
  ])
})

test('reconciles missing upstream candidates as identity aliases and preserves existing rows', () => {
  const explicit = {
    name: 'upstream-explicit',
    alias: 'public-explicit',
    fork: true,
    custom: 'preserved'
  }
  const legacy = { name: 'legacy-model', custom: 'legacy-field' }
  const result = reconcileModelAliases({
    existingAliases: [explicit, legacy],
    upstreamModelIds: [
      'upstream-explicit',
      'legacy-model',
      'missing-model',
      'missing-model'
    ]
  })

  assert.equal(result.changed, true)
  assert.deepEqual(result.aliases, [
    explicit,
    { ...legacy, alias: 'legacy-model' },
    { name: 'missing-model', alias: 'missing-model' }
  ])
})

test('does not report changes when all upstream candidates already have aliases', () => {
  const existingAliases = [
    { name: 'model-a', alias: 'public-a' },
    { name: 'model-b', alias: 'model-b' }
  ]
  const result = reconcileModelAliases({
    existingAliases,
    upstreamModelIds: ['model-a', 'model-b']
  })

  assert.equal(result.changed, false)
  assert.deepEqual(result.aliases, existingAliases)
})
