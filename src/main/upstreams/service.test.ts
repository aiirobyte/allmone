import assert from 'node:assert/strict'

import {
  CliProxyApiError,
  type CliProxyApiUpstreamApiKeyEntry
} from '../cli-proxy-api'
import {
  UPSTREAM_PROVIDER_KINDS,
  createUpstreamService,
  type UpstreamServiceClient
} from './service'
import type { UpstreamProviderKind } from './types'

function createFakeClient(
  overrides: Partial<UpstreamServiceClient> = {}
): UpstreamServiceClient {
  return {
    async getApiKeys() {
      return { apiKeys: ['local-secret-key'], raw: { 'api-keys': ['local-secret-key'] } }
    },
    async putApiKeys() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async patchApiKey() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteApiKey() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getGeminiApiKeyEntries() {
      return { entries: [], raw: {} }
    },
    async putGeminiApiKeyEntries() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async patchGeminiApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteGeminiApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getCodexApiKeyEntries() {
      return { entries: [], raw: {} }
    },
    async putCodexApiKeyEntries() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async patchCodexApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteCodexApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getClaudeApiKeyEntries() {
      return { entries: [], raw: {} }
    },
    async putClaudeApiKeyEntries() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async patchClaudeApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteClaudeApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getVertexApiKeyEntries() {
      return { entries: [], raw: {} }
    },
    async putVertexApiKeyEntries() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async patchVertexApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteVertexApiKeyEntry() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getOpenAiCompatibilityProviders() {
      return { providers: [], raw: {} }
    },
    async upsertOpenAiCompatibilityProvider() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteOpenAiCompatibilityProvider() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getAmpCodeConfig() {
      return { config: {}, raw: {} }
    },
    async patchAmpCodeConfig() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteAmpCodeConfig() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getAuthFiles() {
      return { files: [], raw: {} }
    },
    async deleteAuthFile() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getOauthModelAlias() {
      return { aliases: {}, raw: {} }
    },
    async putOauthModelAlias() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getOauthExcludedModels() {
      return { excludedModels: {}, raw: {} }
    },
    async putOauthExcludedModels() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    ...overrides
  }
}

test('returns a complete secret-safe catalog snapshot', () => {
  const service = createUpstreamService({ client: createFakeClient() })
  const catalog = service.getProviderCatalog()

  assert.deepEqual(
    catalog.map((entry) => entry.kind),
    UPSTREAM_PROVIDER_KINDS
  )
  assert.equal(catalog.length, 14)

  for (const entry of catalog) {
    for (const secretField of entry.secretFields) {
      assert.notEqual(
        entry.editableFields.find((field) => field.name === secretField)?.displayable,
        true
      )
    }
  }
})

test('summarizes every upstream family without leaking secrets', async () => {
  const client = createFakeClient({
    async getApiKeys() {
      return { apiKeys: ['local-secret-key'], raw: { 'api-keys': ['local-secret-key'] } }
    },
    async getGeminiApiKeyEntries() {
      return {
        entries: [
          {
            'api-key': 'gemini-secret-key',
            'base-url': 'https://gemini.example.com',
            'proxy-url': 'socks5://user:pass@proxy.example.com',
            headers: { Authorization: 'Bearer gemini-token', 'x-safe': 'ok' }
          }
        ],
        raw: {}
      }
    },
    async getCodexApiKeyEntries() {
      return { entries: [{ 'api-key': 'codex-secret-key' }], raw: {} }
    },
    async getClaudeApiKeyEntries() {
      return {
        entries: [
          {
            'api-key': 'claude-secret-key',
            cloak: { hidden: 'preserved but not shown' }
          }
        ],
        raw: {}
      }
    },
    async getVertexApiKeyEntries() {
      return { entries: [{ 'api-key': 'vertex-secret-key' }], raw: {} }
    },
    async getOpenAiCompatibilityProviders() {
      return {
        providers: [
          {
            name: 'openrouter',
            'base-url': 'https://openrouter.ai/api/v1',
            'api-key-entries': [
              {
                'api-key': 'openai-compatible-secret',
                'proxy-url': 'https://u:p@proxy.example.com'
              }
            ],
            headers: { Authorization: 'Bearer openrouter-token' }
          }
        ],
        raw: {}
      }
    },
    async getAmpCodeConfig() {
      return {
        config: {
          'upstream-url': 'https://amp-user:amp-pass@amp.example.com',
          'upstream-api-key': 'amp-secret',
          'upstream-api-keys': [
            { 'upstream-api-key': 'amp-mapped-secret', 'api-keys': ['local-a'] }
          ]
        },
        raw: {}
      }
    },
    async getAuthFiles() {
      return {
        files: [
          {
            name: 'claude.json',
            provider: 'claude',
            label: 'work',
            path: '/Users/me/.allmone/runtime/cli-proxy-api/auth/claude.json',
            status: 'ok',
            disabled: false
          }
        ],
        raw: {}
      }
    },
    async getOauthModelAlias() {
      return { aliases: { claude: [{ name: 'claude-3-5', alias: 'sonnet' }] }, raw: {} }
    },
    async getOauthExcludedModels() {
      return { excludedModels: { claude: ['bad-model'] }, raw: {} }
    }
  })
  const service = createUpstreamService({ client })

  const result = await service.getUpstreamSummaries()
  const serialized = JSON.stringify(result)

  for (const kind of UPSTREAM_PROVIDER_KINDS) {
    assert(result.some((summary) => summary.providerKind === kind), kind)
  }

  for (const secret of [
    'local-secret-key',
    'gemini-secret-key',
    'codex-secret-key',
    'claude-secret-key',
    'vertex-secret-key',
    'openai-compatible-secret',
    'amp-secret',
    'amp-mapped-secret',
    'user:pass',
    'amp-user:amp-pass',
    'gemini-token',
    'openrouter-token',
    '/Users/me/.allmone/runtime/cli-proxy-api/auth/claude.json'
  ]) {
    assert(!serialized.includes(secret), secret)
  }
})

test('returns multiple auth-file summaries with delete names and redacted metadata', async () => {
  const service = createUpstreamService({
    client: createFakeClient({
      async getAuthFiles() {
        return {
          files: [
            {
              name: 'codex-work.json',
              auth_index: 'codex-work',
              provider: 'codex',
              label: 'Work Codex',
              path: '/Users/me/.allmone/runtime/cli-proxy-api/auth/codex-work.json',
              status: 'ok',
              source: 'file',
              disabled: false
            },
            {
              name: 'codex-personal.json',
              provider: 'codex',
              account: 'personal@example.com',
              status: 'expired',
              status_message: 'Authorization: Bearer codex-token-secret expired',
              source: 'file',
              disabled: true
            },
            {
              name: 'claude-work.json',
              provider: 'claude',
              email: 'claude-work@example.com',
              path: '/Users/me/.allmone/runtime/cli-proxy-api/auth/claude-work.json',
              status: 'ok'
            }
          ],
          raw: {}
        }
      }
    })
  })

  const result = await service.getAuthFileSummaries()
  const serialized = JSON.stringify(result)

  assert.deepEqual(
    result.map((file) => ({
      name: file.name,
      authIndex: file.authIndex,
      providerKind: file.providerKind,
      label: file.label,
      status: file.status,
      source: file.source,
      disabled: file.disabled,
      redactedPath: file.redactedPath
    })),
    [
      {
        name: 'codex-work.json',
        authIndex: 'codex-work',
        providerKind: 'codex',
        label: 'Work Codex',
        status: 'ok',
        source: 'file',
        disabled: false,
        redactedPath: '[REDACTED_PATH]/codex-work.json'
      },
      {
        name: 'codex-personal.json',
        authIndex: undefined,
        providerKind: 'codex',
        label: 'personal@example.com',
        status: 'expired',
        source: 'file',
        disabled: true,
        redactedPath: undefined
      },
      {
        name: 'claude-work.json',
        authIndex: undefined,
        providerKind: 'claude',
        label: 'claude-work@example.com',
        status: 'ok',
        source: undefined,
        disabled: undefined,
        redactedPath: '[REDACTED_PATH]/claude-work.json'
      }
    ]
  )
  assert(!serialized.includes('/Users/me/.allmone/runtime'))
  assert(!serialized.includes('codex-token-secret'))
})

test('maps API-key upstream writes and deletes by provider kind', async () => {
  const calls: string[] = []
  const client = createFakeClient({
    async putGeminiApiKeyEntries(entries) {
      calls.push(`gemini:${entries[0]?.['api-key']}`)
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async putCodexApiKeyEntries(entries) {
      calls.push(`codex:${entries[0]?.['api-key']}`)
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async putClaudeApiKeyEntries(entries) {
      calls.push(`claude:${entries[0]?.['api-key']}`)
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async putVertexApiKeyEntries(entries) {
      calls.push(`vertex:${entries[0]?.['api-key']}`)
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteGeminiApiKeyEntry(input) {
      calls.push(`delete-gemini:${'apiKey' in input ? input.apiKey : input.index}`)
      return { ok: true, status: 200, raw: { status: 'ok' } }
    }
  })
  const service = createUpstreamService({ client })
  const kinds: Array<[UpstreamProviderKind, string]> = [
    ['gemini-api-key', 'gemini-key'],
    ['codex-api-key', 'codex-key'],
    ['claude-api-key', 'claude-key'],
    ['vertex-api-key', 'vertex-key']
  ]

  for (const [providerKind, apiKey] of kinds) {
    await service.upsertApiKeyUpstream({ providerKind, apiKey })
  }
  await service.deleteApiKeyUpstream('gemini-api-key', { apiKey: 'gemini-key' })

  assert.deepEqual(calls, [
    'gemini:gemini-key',
    'codex:codex-key',
    'claude:claude-key',
    'vertex:vertex-key',
    'delete-gemini:gemini-key'
  ])
})

test('validates provider kind and required fields before writes', async () => {
  const calls: string[] = []
  const service = createUpstreamService({
    client: createFakeClient({
      async putGeminiApiKeyEntries() {
        calls.push('write')
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await assert.rejects(
    () => service.upsertApiKeyUpstream({ providerKind: 'gemini-api-key' }),
    /API key is required/
  )
  await assert.rejects(
    () => service.upsertApiKeyUpstream({ providerKind: 'api-keys', apiKey: 'x' }),
    /does not support API-key upstream writes/
  )
  await assert.rejects(
    () =>
      service.upsertApiKeyUpstream({
        providerKind: 'openai-compatibility',
        providerName: 'MIMO',
        baseUrl: 'api.mimo.example/v1',
        apiKeyEntries: [{ apiKey: 'provider-secret' }]
      }),
    /valid OpenAI-compatible base URL/
  )

  assert.deepEqual(calls, [])
})

test('redacts CLIProxyAPI errors before crossing the service boundary', async () => {
  const service = createUpstreamService({
    client: createFakeClient({
      async putGeminiApiKeyEntries() {
        throw new CliProxyApiError({
          kind: 'unexpected_http',
          state: 'unexpected_error',
          status: 500,
          responseBody: 'api-key: gemini-secret-key Authorization: Bearer mgmt-secret',
          message: 'provider-secret gemini-secret-key'
        })
      }
    })
  })

  await assert.rejects(
    () =>
      service.upsertApiKeyUpstream({
        providerKind: 'gemini-api-key',
        apiKey: 'gemini-secret-key'
      }),
    (error) =>
      error instanceof Error &&
      !error.message.includes('gemini-secret-key') &&
      !error.message.includes('mgmt-secret') &&
      !error.message.includes('provider-secret')
  )
})

test('creates API-key upstream entries by appending to each current provider list', async () => {
  const written: Record<string, unknown[]> = {}
  const client = createFakeClient({
    async getGeminiApiKeyEntries() {
      return { entries: [{ 'api-key': 'existing-gemini', custom: true }], raw: {} }
    },
    async putGeminiApiKeyEntries(entries) {
      written.gemini = entries
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getCodexApiKeyEntries() {
      return { entries: [{ 'api-key': 'existing-codex' }], raw: {} }
    },
    async putCodexApiKeyEntries(entries) {
      written.codex = entries
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getClaudeApiKeyEntries() {
      return { entries: [{ 'api-key': 'existing-claude' }], raw: {} }
    },
    async putClaudeApiKeyEntries(entries) {
      written.claude = entries
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getVertexApiKeyEntries() {
      return { entries: [{ 'api-key': 'existing-vertex' }], raw: {} }
    },
    async putVertexApiKeyEntries(entries) {
      written.vertex = entries
      return { ok: true, status: 200, raw: { status: 'ok' } }
    }
  })
  const service = createUpstreamService({ client })

  await service.upsertApiKeyUpstream({
    providerKind: 'gemini-api-key',
    apiKey: 'new-gemini',
    baseUrl: 'https://gemini.example.com',
    headers: [{ name: 'x-test', value: 'ok' }]
  })
  await service.upsertApiKeyUpstream({ providerKind: 'codex-api-key', apiKey: 'new-codex' })
  await service.upsertApiKeyUpstream({ providerKind: 'claude-api-key', apiKey: 'new-claude' })
  await service.upsertApiKeyUpstream({ providerKind: 'vertex-api-key', apiKey: 'new-vertex' })

  assert.deepEqual(written.gemini, [
    { 'api-key': 'existing-gemini', custom: true },
    {
      'api-key': 'new-gemini',
      'base-url': 'https://gemini.example.com',
      headers: { 'x-test': 'ok' }
    }
  ])
  assert.deepEqual(written.codex?.at(-1), { 'api-key': 'new-codex' })
  assert.deepEqual(written.claude?.at(-1), { 'api-key': 'new-claude' })
  assert.deepEqual(written.vertex?.at(-1), { 'api-key': 'new-vertex' })
})

test('deletes provider entries by index without touching unrelated providers', async () => {
  let geminiEntries = [
    { 'api-key': 'gemini-one' },
    { 'api-key': 'gemini-two' }
  ]
  let codexEntries = [{ 'api-key': 'codex-one' }]
  let openAiProviders = [
    { name: 'openrouter', 'base-url': 'https://openrouter.ai/api/v1' },
    { name: 'custom-openai', 'base-url': 'https://custom.example.com/v1' }
  ]
  const service = createUpstreamService({
    client: createFakeClient({
      async getGeminiApiKeyEntries() {
        return { entries: geminiEntries, raw: {} }
      },
      async getCodexApiKeyEntries() {
        return { entries: codexEntries, raw: {} }
      },
      async getOpenAiCompatibilityProviders() {
        return { providers: openAiProviders, raw: {} }
      },
      async deleteGeminiApiKeyEntry(input) {
        geminiEntries = geminiEntries.filter((_, index) =>
          'index' in input ? index !== input.index : true
        )
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async deleteOpenAiCompatibilityProvider(input) {
        openAiProviders = openAiProviders.filter((provider, index) =>
          'index' in input ? index !== input.index : provider.name !== input.name
        )
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await service.deleteApiKeyUpstream('gemini-api-key', { index: 1 })
  await service.deleteApiKeyUpstream('openai-compatibility', { index: 0 })

  assert.deepEqual(geminiEntries, [{ 'api-key': 'gemini-one' }])
  assert.deepEqual(codexEntries, [{ 'api-key': 'codex-one' }])
  assert.deepEqual(openAiProviders, [
    { name: 'custom-openai', 'base-url': 'https://custom.example.com/v1' }
  ])
})

test('reloads provider and auth summaries from current persisted client state', async () => {
  let geminiEntries: CliProxyApiUpstreamApiKeyEntry[] = [
    { 'api-key': 'persisted-gemini-one' }
  ]
  let codexEntries: CliProxyApiUpstreamApiKeyEntry[] = [
    { 'api-key': 'persisted-codex-one' }
  ]
  let authFiles = [
    {
      name: 'codex-work.json',
      provider: 'codex',
      label: 'Codex Work',
      path: '/Users/me/.allmone/runtime/cli-proxy-api/auth/codex-work.json',
      status: 'ok'
    },
    {
      name: 'claude-work.json',
      provider: 'claude',
      label: 'Claude Work',
      status: 'ok'
    }
  ]
  const client = createFakeClient({
    async getGeminiApiKeyEntries() {
      return { entries: geminiEntries, raw: {} }
    },
    async putGeminiApiKeyEntries(entries) {
      geminiEntries = entries
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getCodexApiKeyEntries() {
      return { entries: codexEntries, raw: {} }
    },
    async deleteCodexApiKeyEntry(input) {
      codexEntries = codexEntries.filter((entry, index) =>
        'index' in input ? index !== input.index : entry['api-key'] !== input.apiKey
      )
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getAuthFiles() {
      return { files: authFiles, raw: {} }
    },
    async deleteAuthFile(input) {
      authFiles = authFiles.filter((file) =>
        'name' in input ? file.name !== input.name : false
      )
      return { ok: true, status: 200, raw: { status: 'ok' } }
    }
  })

  const firstService = createUpstreamService({ client })
  await firstService.upsertApiKeyUpstream({
    providerKind: 'gemini-api-key',
    apiKey: 'persisted-gemini-two'
  })
  authFiles = [
    ...authFiles,
    {
      name: 'codex-personal.json',
      provider: 'codex',
      label: 'Codex Personal',
      status: 'ok'
    }
  ]
  await firstService.deleteApiKeyUpstream('codex-api-key', { index: 0 })
  await firstService.deleteAuthFile({ name: 'codex-work.json' })

  const reloadedService = createUpstreamService({ client })
  const [summaries, reloadedAuthFiles] = await Promise.all([
    reloadedService.getUpstreamSummaries(),
    reloadedService.getAuthFileSummaries()
  ])
  const geminiSummary = summaries.find(
    (summary) => summary.providerKind === 'gemini-api-key'
  )
  const codexApiKeySummary = summaries.find(
    (summary) => summary.providerKind === 'codex-api-key'
  )
  const codexAccountSummary = summaries.find(
    (summary) => summary.providerKind === 'codex'
  )

  assert.equal(geminiSummary?.configured, true)
  assert.equal(geminiSummary?.entries?.length, 2)
  assert.equal(codexApiKeySummary?.configured, false)
  assert.equal(codexAccountSummary?.configured, true)
  assert.deepEqual(
    reloadedAuthFiles.map((file) => file.name),
    ['claude-work.json', 'codex-personal.json']
  )
  assert(!JSON.stringify(summaries).includes('persisted-gemini-two'))
  assert(!JSON.stringify(reloadedAuthFiles).includes('/Users/me/.allmone/runtime'))
})

test('edits API-key upstream entries by index and preserves unknown fields', async () => {
  let writtenClaude: unknown[] = []
  const service = createUpstreamService({
    client: createFakeClient({
      async getClaudeApiKeyEntries() {
        return {
          entries: [
            {
              'api-key': 'old-claude',
              cloak: { enabled: true },
              'experimental-cch-signing': { enabled: true }
            }
          ],
          raw: {}
        }
      },
      async putClaudeApiKeyEntries(entries) {
        writtenClaude = entries
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await service.upsertApiKeyUpstream({
    providerKind: 'claude-api-key',
    entryIndex: 0,
    apiKey: 'new-claude',
    baseUrl: 'https://claude.example.com'
  })

  assert.deepEqual(writtenClaude, [
    {
      'api-key': 'new-claude',
      cloak: { enabled: true },
      'experimental-cch-signing': { enabled: true },
      'base-url': 'https://claude.example.com'
    }
  ])
})

test('updates API-key provider model fields without requiring renderer API key access', async () => {
  let writtenGemini: CliProxyApiUpstreamApiKeyEntry[] = []
  const service = createUpstreamService({
    client: createFakeClient({
      async getGeminiApiKeyEntries() {
        return {
          entries: [
            {
              'api-key': 'existing-gemini-secret',
              'base-url': 'https://gemini.example.com',
              models: [{ name: 'old-model', alias: 'old' }],
              'excluded-models': ['old-excluded']
            }
          ],
          raw: {}
        }
      },
      async putGeminiApiKeyEntries(entries) {
        writtenGemini = entries
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await service.upsertApiKeyUpstream({
    providerKind: 'gemini-api-key',
    entryIndex: 0,
    modelAliases: [{ name: 'gemini-2.5-pro', alias: 'pro' }],
    excludedModels: [{ pattern: 'gemini-1.0-pro' }]
  })

  assert.deepEqual(writtenGemini, [
    {
      'api-key': 'existing-gemini-secret',
      'base-url': 'https://gemini.example.com',
      models: [{ name: 'gemini-2.5-pro', alias: 'pro' }],
      'excluded-models': ['gemini-1.0-pro']
    }
  ])
})

test('edits API-key provider base URL and API key while preserving other fields', async () => {
  let writtenGemini: CliProxyApiUpstreamApiKeyEntry[] = []
  const service = createUpstreamService({
    client: createFakeClient({
      async getGeminiApiKeyEntries() {
        return {
          entries: [
            {
              'api-key': 'old-gemini-secret',
              'base-url': 'https://old-gemini.example.com',
              models: [{ name: 'gemini-2.5-pro', alias: 'pro' }],
              'excluded-models': ['gemini-1.0-pro']
            }
          ],
          raw: {}
        }
      },
      async putGeminiApiKeyEntries(entries) {
        writtenGemini = entries
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await service.upsertApiKeyUpstream({
    providerKind: 'gemini-api-key',
    entryIndex: 0,
    apiKey: 'new-gemini-secret',
    baseUrl: 'https://new-gemini.example.com'
  })

  assert.deepEqual(writtenGemini, [
    {
      'api-key': 'new-gemini-secret',
      'base-url': 'https://new-gemini.example.com',
      models: [{ name: 'gemini-2.5-pro', alias: 'pro' }],
      'excluded-models': ['gemini-1.0-pro']
    }
  ])
})

test('edits OpenAI-compatible provider name, base URL, and API key by index', async () => {
  const upserts: unknown[] = []
  const service = createUpstreamService({
    client: createFakeClient({
      async getOpenAiCompatibilityProviders() {
        return {
          providers: [
            {
              name: 'old-openrouter',
              'base-url': 'https://old-openrouter.example.com/v1',
              'api-key-entries': [{ 'api-key': 'old-openrouter-secret' }],
              models: [{ name: 'old-model', alias: 'old' }]
            }
          ],
          raw: {}
        }
      },
      async upsertOpenAiCompatibilityProvider(input) {
        upserts.push(input)
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await service.upsertApiKeyUpstream({
    providerKind: 'openai-compatibility',
    entryIndex: 0,
    providerName: 'new-openrouter',
    baseUrl: 'https://new-openrouter.example.com/v1',
    apiKeyEntries: [{ apiKey: 'new-openrouter-secret' }]
  })

  assert.deepEqual(upserts[0], {
    name: 'new-openrouter',
    disabled: undefined,
    'base-url': 'https://new-openrouter.example.com/v1',
    'api-key-entries': [{ 'api-key': 'new-openrouter-secret' }],
    headers: undefined,
    models: undefined
  })
})

test('generates, sets, deletes, and summarizes local client API keys safely', async () => {
  let apiKeys = ['existing-local-key']
  const service = createUpstreamService({
    client: createFakeClient({
      async getApiKeys() {
        return { apiKeys, raw: { 'api-keys': apiKeys } }
      },
      async putApiKeys(next) {
        apiKeys = next
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async deleteApiKey(input) {
        apiKeys = apiKeys.filter((key, index) =>
          'value' in input ? key !== input.value : index !== input.index
        )
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  const generated = await service.generateLocalApiKey()
  assert.match(generated.oneTimePlaintextKey ?? '', /^ak-allmone-[A-Za-z0-9_-]{43}$/)
  assert(apiKeys.includes(generated.oneTimePlaintextKey ?? ''))
  assert(!JSON.stringify(await service.getLocalApiKeyState()).includes(generated.oneTimePlaintextKey ?? ''))

  const setResult = await service.setLocalApiKey('user-provided-local-key')
  assert.equal(setResult.oneTimePlaintextKey, 'user-provided-local-key')
  assert(apiKeys.includes('user-provided-local-key'))

  await service.deleteLocalApiKey({ value: 'existing-local-key' })
  assert(!apiKeys.includes('existing-local-key'))
})

test('returns local connection output without hidden key material', async () => {
  const service = createUpstreamService({
    client: createFakeClient({
      async getApiKeys() {
        return { apiKeys: ['hidden-local-key'], raw: { 'api-keys': ['hidden-local-key'] } }
      }
    })
  })

  const output = await service.getLocalConnectionOutput({
    serviceOrigin: 'http://127.0.0.1:9444',
    port: 9444
  })
  const serialized = JSON.stringify(output)

  assert.equal(output.serviceOrigin, 'http://127.0.0.1:9444')
  assert.equal(output.port, 9444)
  assert.equal(output.localKeyConfigured, true)
  assert(serialized.includes('/v1/chat/completions'))
  assert(!serialized.includes('hidden-local-key'))
})

test('validates and writes Amp config mappings safely', async () => {
  let written: unknown
  let deleted = false
  const service = createUpstreamService({
    client: createFakeClient({
      async patchAmpCodeConfig(config) {
        written = config
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async deleteAmpCodeConfig() {
        deleted = true
        return { ok: true, status: 200, raw: { status: 'ok' } }
      }
    })
  })

  await service.writeAmpConfig({
    upstreamUrl: 'https://amp.example.com',
    upstreamApiKey: 'amp-secret',
    upstreamApiKeys: [{ upstreamApiKey: 'mapped-secret', apiKeys: ['local-key'] }],
    forceModelMappings: true,
    modelMappings: [{ from: 'gpt-5', to: 'claude-sonnet' }]
  })
  await service.resetAmpConfig()

  assert.deepEqual(written, {
    'upstream-url': 'https://amp.example.com',
    'upstream-api-key': 'amp-secret',
    'upstream-api-keys': [
      { 'upstream-api-key': 'mapped-secret', 'api-keys': ['local-key'] }
    ],
    'force-model-mappings': true,
    'model-mappings': [{ from: 'gpt-5', to: 'claude-sonnet' }]
  })
  assert.equal(deleted, true)

  await assert.rejects(
    () => service.writeAmpConfig({ upstreamUrl: 'not a url' }),
    /valid Amp upstream URL/
  )
  await assert.rejects(
    () => service.writeAmpConfig({ upstreamApiKeys: [{ upstreamApiKey: '', apiKeys: [] }] }),
    /Amp API key mapping/
  )
  await assert.rejects(
    () => service.writeAmpConfig({ modelMappings: [{ from: '', to: 'target' }] }),
    /Amp model mapping/
  )
})
