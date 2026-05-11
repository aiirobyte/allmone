import assert from 'node:assert/strict'

import {
  buildGeneratedModelAlias,
  isValidProviderId,
  projectEffectiveModelRows,
  reconcileGeneratedModelAliases,
  reconcileModelAliases
} from './modelAlias'

test('validates Provider ids without silent rewrites', () => {
  for (const value of ['mimo_a', 'OpenRouter_1', 'A0_']) {
    assert.equal(isValidProviderId(value), true, value)
  }

  for (const value of ['', 'mimo-a', 'mimo a', 'mimo/a', ' mimo_a', 'mimo_a ']) {
    assert.equal(isValidProviderId(value), false, value)
  }
})

test('builds Provider-specific aliases while preserving raw model IDs exactly', () => {
  assert.equal(
    buildGeneratedModelAlias('openrouter_work', 'moonshotai/kimi-k2:free'),
    'openrouter_work-moonshotai/kimi-k2:free'
  )
  assert.equal(
    buildGeneratedModelAlias('mimo_a', 'gpt-5.5-mini'),
    'mimo_a-gpt-5.5-mini'
  )
})

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

test('reconciles generated Provider aliases with fork enabled', () => {
  const preservedUserRow = {
    name: 'user-only-model',
    alias: 'user-public',
    custom: 'preserved'
  }
  const result = reconcileGeneratedModelAliases({
    providerId: 'mimo_a',
    existingAliases: [
      { name: 'gpt-5.5', alias: 'gpt-5.5' },
      { name: 'moonshotai/kimi-k2:free', alias: 'old-public', custom: true },
      preservedUserRow
    ],
    upstreamModelIds: [
      'gpt-5.5',
      'moonshotai/kimi-k2:free',
      'claude-3.5-sonnet',
      'claude-3.5-sonnet'
    ]
  })

  assert.equal(result.changed, true)
  assert.deepEqual(result.aliases, [
    { name: 'gpt-5.5', alias: 'mimo_a-gpt-5.5', fork: true },
    {
      name: 'moonshotai/kimi-k2:free',
      alias: 'mimo_a-moonshotai/kimi-k2:free',
      custom: true,
      fork: true
    },
    preservedUserRow,
    {
      name: 'claude-3.5-sonnet',
      alias: 'mimo_a-claude-3.5-sonnet',
      fork: true
    }
  ])
})
