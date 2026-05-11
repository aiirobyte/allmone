import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createAllmoneConfigStore,
  type AllmoneConfigSafeStorageAdapter
} from '../runtime/allmoneConfigStore'
import type { CliProxyApiConfigWriter } from '../runtime/cliproxyapiConfigWriter'
import { resolveRuntimeHome } from '../runtime/runtimeHome'
import { createModelsService } from './service'
import type { UpstreamService } from '../upstreams'

function createSafeStorage(): AllmoneConfigSafeStorageAdapter {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`enc:${value}`, 'utf8'),
    decryptString: (value) => {
      const text = value.toString('utf8')

      if (!text.startsWith('enc:')) {
        throw new Error('bad ciphertext')
      }

      return text.slice(4)
    }
  }
}

function createFakeConfigWriter(): CliProxyApiConfigWriter & { writes: number } {
  return {
    writes: 0,
    async writeManagedConfig(config) {
      this.writes += 1
      if (!config) {
        throw new Error('Expected config')
      }

      return config
    },
    async saveOutputPort() {
      throw new Error('not used')
    }
  }
}

function createFakeUpstreamService(): UpstreamService {
  return {
    getProviderCatalog() {
      return [
        {
          kind: 'api-keys',
          label: 'Local client API keys',
          family: 'local-client-key',
          cliproxyapi: { section: 'api-keys', managementRoutes: {}, loginCommands: [] },
          editableFields: [],
          secretFields: [],
          redaction: [],
          capabilities: {
            summarize: true,
            create: true,
            edit: true,
            delete: true,
            disable: false,
            localKeyManagement: true,
            authFileManagement: false,
            loginHandoff: false,
            importHandoff: false,
            providerProtocolLogic: false,
            requestTransformation: false,
            responseTransformation: false
          }
        },
        {
          kind: 'gemini-api-key',
          label: 'Gemini API key',
          family: 'api-key-upstream',
          cliproxyapi: { section: 'gemini-api-key', managementRoutes: {}, loginCommands: [] },
          editableFields: [],
          secretFields: [],
          redaction: [],
          capabilities: {
            summarize: true,
            create: true,
            edit: true,
            delete: true,
            disable: true,
            localKeyManagement: false,
            authFileManagement: false,
            loginHandoff: false,
            importHandoff: false,
            providerProtocolLogic: false,
            requestTransformation: false,
            responseTransformation: false
          }
        },
        {
          kind: 'codex',
          label: 'Codex OAuth',
          family: 'account-upstream',
          cliproxyapi: { channel: 'codex', managementRoutes: {}, loginCommands: [] },
          editableFields: [],
          secretFields: [],
          redaction: [],
          capabilities: {
            summarize: true,
            create: false,
            edit: true,
            delete: true,
            disable: true,
            localKeyManagement: false,
            authFileManagement: true,
            loginHandoff: true,
            importHandoff: false,
            providerProtocolLogic: false,
            requestTransformation: false,
            responseTransformation: false
          }
        },
        {
          kind: 'ampcode',
          label: 'Amp integration',
          family: 'amp-integration',
          cliproxyapi: { section: 'ampcode', managementRoutes: {}, loginCommands: [] },
          editableFields: [],
          secretFields: [],
          redaction: [],
          capabilities: {
            summarize: true,
            create: true,
            edit: true,
            delete: true,
            disable: false,
            localKeyManagement: false,
            authFileManagement: false,
            loginHandoff: false,
            importHandoff: false,
            providerProtocolLogic: false,
            requestTransformation: false,
            responseTransformation: false
          }
        },
        {
          kind: 'claude-api-key',
          label: 'Claude API key',
          family: 'api-key-upstream',
          cliproxyapi: { section: 'claude-api-key', managementRoutes: {}, loginCommands: [] },
          editableFields: [],
          secretFields: [],
          redaction: [],
          capabilities: {
            summarize: true,
            create: true,
            edit: true,
            delete: true,
            disable: true,
            localKeyManagement: false,
            authFileManagement: false,
            loginHandoff: false,
            importHandoff: false,
            providerProtocolLogic: false,
            requestTransformation: false,
            responseTransformation: false
          }
        }
      ]
    },
    async getUpstreamSummaries() {
      return [
        {
          providerKind: 'api-keys',
          label: 'Local client API keys',
          configured: true,
          redactedFields: ['apiKey'],
          entries: ['[REDACTED]']
        },
        {
          providerKind: 'gemini-api-key',
          label: 'Gemini API key',
          configured: true,
          redactedFields: ['apiKey'],
          entries: [
            {
              'base-url': 'https://generativelanguage.googleapis.com/v1beta',
              disabled: false
            }
          ]
        },
        {
          providerKind: 'codex',
          label: 'Codex OAuth',
          configured: true,
          redactedFields: ['authFileSummary'],
          entries: [
            {
              name: 'codex-work.json',
              label: 'Work Codex',
              source: 'file',
              status: 'ok'
            }
          ]
        },
        {
          providerKind: 'ampcode',
          label: 'Amp integration',
          configured: true,
          redactedFields: ['upstreamApiKey', 'upstreamApiKeys', 'upstreamUrl'],
          entries: [
            {
              'upstream-url': 'https://amp.example.com'
            }
          ]
        },
        {
          providerKind: 'claude-api-key',
          label: 'Claude API key',
          configured: false,
          redactedFields: ['apiKey'],
          entries: []
        }
      ]
    },
    async getLocalApiKeyState() {
      throw new Error('not used')
    },
    async generateLocalApiKey() {
      throw new Error('not used')
    },
    async setLocalApiKey() {
      throw new Error('not used')
    },
    async deleteLocalApiKey() {
      throw new Error('not used')
    },
    async getLocalConnectionOutput() {
      throw new Error('not used')
    },
    async upsertApiKeyUpstream() {
      throw new Error('not used')
    },
    async deleteApiKeyUpstream() {
      throw new Error('not used')
    },
    async getAmpConfig() {
      throw new Error('not used')
    },
    async writeAmpConfig() {
      throw new Error('not used')
    },
    async resetAmpConfig() {
      throw new Error('not used')
    },
    async getAuthFileSummaries() {
      throw new Error('not used')
    },
    async deleteAuthFile() {
      throw new Error('not used')
    },
    async getOauthModelAliases() {
      throw new Error('not used')
    },
    async writeOauthModelAliases() {
      throw new Error('not used')
    },
    async getOauthExcludedModels() {
      throw new Error('not used')
    },
    async writeOauthExcludedModels() {
      throw new Error('not used')
    }
  }
}

function createFakeOpenAiCompatibilityUpstreamService(): UpstreamService {
  const base = createFakeUpstreamService()

  return {
    ...base,
    getProviderCatalog() {
      return [
        ...base.getProviderCatalog(),
        {
          kind: 'openai-compatibility',
          label: 'OpenAI-compatible provider',
          family: 'api-key-upstream',
          cliproxyapi: {
            section: 'openai-compatibility',
            managementRoutes: {},
            loginCommands: []
          },
          editableFields: [],
          secretFields: [],
          redaction: [],
          capabilities: {
            summarize: true,
            create: true,
            edit: true,
            delete: true,
            disable: true,
            localKeyManagement: false,
            authFileManagement: false,
            loginHandoff: false,
            importHandoff: false,
            providerProtocolLogic: false,
            requestTransformation: false,
            responseTransformation: false
          }
        }
      ]
    },
    async getUpstreamSummaries() {
      return [
        {
          providerKind: 'openai-compatibility',
          label: 'OpenAI-compatible provider',
          configured: true,
          redactedFields: ['apiKeyEntries'],
          entries: [
            {
              name: 'MIMO',
              disabled: false,
              baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
              apiKeyEntries: [{ 'api-key': '[REDACTED]' }],
              models: []
            }
          ]
        }
      ]
    }
  }
}

function createFakeOpenAiCompatibilityAndCodexUpstreamService(): UpstreamService {
  const base = createFakeOpenAiCompatibilityUpstreamService()

  return {
    ...base,
    async getUpstreamSummaries() {
      return [
        {
          providerKind: 'openai-compatibility',
          label: 'OpenAI-compatible provider',
          configured: true,
          redactedFields: ['apiKeyEntries'],
          entries: [
            {
              name: 'MIMO',
              disabled: false,
              baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
              apiKeyEntries: [{ 'api-key': '[REDACTED]' }],
              models: []
            }
          ]
        },
        {
          providerKind: 'codex',
          label: 'Codex OAuth',
          configured: true,
          redactedFields: ['authFileSummary'],
          entries: [
            {
              name: 'codex-work.json',
              label: 'Work Codex',
              source: 'file',
              status: 'ok'
            }
          ]
        }
      ]
    }
  }
}

async function withTempHome<T>(fn: (homeDir: string) => Promise<T>): Promise<T> {
  const homeDir = await mkdtemp(join(tmpdir(), 'allmone-models-'))

  try {
    return await fn(homeDir)
  } finally {
    await rm(homeDir, { recursive: true, force: true })
  }
}

test('startup bootstrap creates exactly one encrypted default local output key', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const configWriter = createFakeConfigWriter()
    const service = createModelsService({
      configStore,
      configWriter,
      generateId: () => 'lok_generated',
      generateKey: () => 'ak-allmone-generated'
    })

    const first = await service.ensureDefaultLocalOutputKey()
    const second = await service.ensureDefaultLocalOutputKey()
    const config = await configStore.load()

    assert.deepEqual(first.keys, [
      {
        id: 'lok_generated',
        name: 'Default local key',
        preview: 'ak-a...[REDACTED]...ated',
        isDefault: true
      }
    ])
    assert.deepEqual(second.keys, first.keys)
    assert.equal(config.localOutputKeys.length, 1)
    assert.equal(
      configStore.decryptLocalOutputKeyValue(
        config.localOutputKeys[0].valueEncrypted
      ),
      'ak-allmone-generated'
    )
    assert.equal(configWriter.writes, 1)
  })
})

test('generated local key operations auto-save and expose plaintext only for create and reveal', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const service = createModelsService({
      configStore,
      generateId: () => 'lok_user',
      generateKey: () => 'ak-generated-client'
    })

    const created = await service.createGeneratedLocalOutputKey({
      name: 'Laptop client'
    })
    const renamed = await service.renameLocalOutputKey({
      id: 'lok_user',
      name: 'Renamed client'
    })
    const revealed = await service.revealLocalOutputKey({ id: 'lok_user' })
    const deleted = await service.deleteLocalOutputKey({ id: 'lok_user' })

    assert.equal(created.plaintext, 'ak-generated-client')
    assert.equal(created.key.name, 'Laptop client')
    assert(!JSON.stringify(created.keys).includes('ak-generated-client'))
    assert.equal(renamed.key.name, 'Renamed client')
    assert.equal('plaintext' in renamed, false)
    assert.equal(revealed.plaintext, 'ak-generated-client')
    assert.equal(deleted.keys.length, 0)
    assert.equal('plaintext' in deleted, false)
  })
})

test('generated local output keys support multiple names and reload as redacted summaries', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const ids = ['lok_first', 'lok_second']
    const keys = ['ak-first-generated', 'ak-second-generated']
    const service = createModelsService({
      configStore,
      generateId: () => ids.shift() ?? 'lok_extra',
      generateKey: () => keys.shift() ?? 'ak-extra-generated'
    })

    const first = await service.createGeneratedLocalOutputKey({
      name: 'First client'
    })
    const second = await service.createGeneratedLocalOutputKey({
      name: 'Second client'
    })
    const reloaded = createModelsService({ configStore })

    assert.equal(first.plaintext, 'ak-first-generated')
    assert.equal(second.plaintext, 'ak-second-generated')
    assert.deepEqual(await reloaded.getLocalOutputKeySummaries(), [
      {
        id: 'lok_first',
        name: 'First client',
        preview: 'ak-f...[REDACTED]...ated',
        isDefault: true
      },
      {
        id: 'lok_second',
        name: 'Second client',
        preview: 'ak-s...[REDACTED]...ated',
        isDefault: false
      }
    ])
    assert(!JSON.stringify(await reloaded.getLocalOutputKeySummaries()).includes('ak-first-generated'))
  })
})

test('model inventory fetches account models and does not fetch api-key provider models', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const requests: Array<{
      url: string
      authorization: string | null
      method?: string
    }> = []
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const upstreamService = createFakeUpstreamService()
    const service = createModelsService({
      configStore,
      upstreamService: {
        ...upstreamService,
        async getUpstreamSummaries() {
          const summaries = await upstreamService.getUpstreamSummaries()

          return summaries.map((summary) =>
            summary.providerKind === 'gemini-api-key'
              ? {
                  ...summary,
                  entries: [
                    {
                      'base-url': 'https://generativelanguage.googleapis.com/v1beta',
                      disabled: false,
                      models: [{ name: 'gemini-2.5-pro' }]
                    }
                  ]
                }
              : summary
          )
        }
      },
      modelsFetch: async (input, init) => {
        const url = input instanceof Request ? input.url : input.toString()
        requests.push({
          url,
          method: init?.method,
          authorization: new Headers(init?.headers).get('authorization')
        })
        const path = new URL(url).pathname
        const data =
          path === '/api/provider/codex/v1/models'
            ? [
                {
                  id: 'codex-mini-latest',
                  object: 'model',
                  channel: 'codex',
                  owned_by: 'openai'
                }
              ]
            : [
                { id: 'gemini-2.5-pro' },
                { id: 'codex-mini-latest', owned_by: 'openai' },
                { id: 'unconfigured-claude' }
              ]

        return new Response(JSON.stringify({ data }), { status: 200 })
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.deepEqual(requests, [
      {
        url: 'http://127.0.0.1:8317/api/provider/codex/v1/models',
        method: 'GET',
        authorization: 'Bearer ak-allmone-default'
      }
    ])
    assert.equal(inventory.serviceOrigin, 'http://127.0.0.1:8317')
    assert.equal(inventory.apiBaseUrl, 'http://127.0.0.1:8317/v1')
    assert.deepEqual(
      inventory.providers.map((provider) => provider.providerKind),
      ['gemini-api-key', 'codex']
    )
    assert.equal(inventory.providers[0].family, 'api-key-upstream')
    assert.deepEqual(
      inventory.providers[0].models.map((model) => model.id),
      ['gemini-2.5-pro']
    )
    assert.equal(inventory.providers[1].family, 'account-upstream')
    assert.equal(inventory.providers[1].label, 'Work Codex')
    assert.deepEqual(
      inventory.providers[1].models.map((model) => model.id),
      ['codex-mini-latest']
    )
    assert.equal(
      inventory.providers[1].models.find((model) => model.id === 'codex-mini-latest')?.ownedBy,
      'openai'
    )
    assert(!inventory.providers.some((provider) => provider.providerKind === 'ampcode'))
    assert(!JSON.stringify(inventory).includes('ak-allmone-default'))
    assert(!inventory.providers.some((provider) => provider.providerKind === 'api-keys'))
    assert(!inventory.providers.some((provider) => provider.providerKind === 'claude-api-key'))
  })
})

test('model inventory uses configured OpenAI-compatible models instead of merged output models', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const service = createModelsService({
      configStore,
      upstreamService: {
        ...createFakeOpenAiCompatibilityUpstreamService(),
        async getUpstreamSummaries() {
          return [
            {
              providerKind: 'openai-compatibility',
              label: 'OpenAI-compatible provider',
              configured: true,
              redactedFields: ['apiKeyEntries'],
              entries: [
                {
                  name: 'MIMO',
                  disabled: false,
                  baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
                  apiKeyEntries: [{ 'api-key': '[REDACTED]' }],
                  models: [
                    { name: 'gpt-5.4-mini' },
                    { name: 'gpt-5.5-upstream', alias: 'gpt-5.5' },
                    {
                      name: 'forked-upstream',
                      alias: 'forked-alias',
                      fork: true
                    }
                  ]
                }
              ]
            }
          ]
        }
      },
      modelsFetch: async () => {
        throw new Error('OpenAI-compatible models must not use merged /models')
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.equal(inventory.providers.length, 1)
    assert.equal(inventory.providers[0].providerKind, 'openai-compatibility')
    assert.deepEqual(
      inventory.providers[0].models.map((model) => model.id),
      ['gpt-5.4-mini', 'gpt-5.5', 'forked-alias', 'forked-upstream']
    )
  })
})

test('model inventory does not copy account model output into OpenAI-compatible rows', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const service = createModelsService({
      configStore,
      upstreamService: createFakeOpenAiCompatibilityAndCodexUpstreamService(),
      modelsFetch: async (input) => {
        const path = new URL(input instanceof Request ? input.url : input.toString()).pathname
        const data =
          path === '/api/provider/codex/v1/models'
            ? [
                {
                  id: 'codex-mini-latest',
                  channel: 'codex',
                  owned_by: 'openai'
                }
              ]
            : [
                { id: 'unexpected-global-model' }
              ]

        return new Response(JSON.stringify({ data }), { status: 200 })
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()
    const mimo = inventory.providers.find(
      (provider) => provider.providerKind === 'openai-compatibility'
    )
    const codex = inventory.providers.find(
      (provider) => provider.providerKind === 'codex'
    )

    assert.equal(inventory.providers.length, 2)
    assert.deepEqual(
      mimo?.models.map((model) => model.id),
      []
    )
    assert.deepEqual(
      codex?.models.map((model) => model.id),
      ['codex-mini-latest']
    )
  })
})

test('model inventory does not copy merged output models into empty api-key providers', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const upstreamService = createFakeOpenAiCompatibilityUpstreamService()
    const service = createModelsService({
      configStore,
      upstreamService: {
        ...upstreamService,
        async getUpstreamSummaries() {
          return [
            {
              providerKind: 'gemini-api-key',
              label: 'Gemini API key',
              configured: true,
              redactedFields: ['apiKey'],
              entries: [
                {
                  'base-url': 'https://generativelanguage.googleapis.com/v1beta',
                  disabled: false,
                  models: [{ name: 'gemini-2.5-pro' }]
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
                  name: 'MIMO',
                  disabled: false,
                  baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
                  apiKeyEntries: [{ 'api-key': '[REDACTED]' }],
                  models: []
                }
              ]
            }
          ]
        }
      },
      modelsFetch: async () => {
        throw new Error('API-key providers must not use merged /models')
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.equal(inventory.providers.length, 2)
    assert.deepEqual(
      inventory.providers.map((provider) => provider.models.map((model) => model.id)),
      [
        ['gemini-2.5-pro'],
        []
      ]
    )
  })
})

test('model inventory keeps configured providers visible when /models has no rows', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const service = createModelsService({
      configStore,
      upstreamService: createFakeUpstreamService(),
      modelsFetch: async () =>
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.equal(inventory.providers.length, 2)
    assert.equal(inventory.providers[0].models.length, 0)
    assert.equal(inventory.providers[0].modelState, 'empty')
    assert.match(
      inventory.providers[0].emptyMessage ?? '',
      /No configured models/
    )
  })
})

test('model inventory syncs API-key provider candidates into identity aliases', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    let writtenEntries: unknown[] | undefined
    const upstreamService = {
      ...createFakeUpstreamService(),
      async getUpstreamSummaries() {
        return [
          {
            providerKind: 'gemini-api-key',
            label: 'Gemini API key',
            configured: true,
            redactedFields: ['apiKey'],
            entries: [
              {
                'base-url': 'https://generativelanguage.googleapis.com/v1beta',
                disabled: false,
                models: [{ name: 'gemini-existing', alias: 'public-existing' }]
              }
            ]
          }
        ]
      },
      async getApiKeyUpstreamEntries(providerKind: string) {
        assert.equal(providerKind, 'gemini-api-key')
        return [
          {
            'api-key': 'gemini-secret',
            'base-url': 'https://generativelanguage.googleapis.com/v1beta',
            custom: true,
            models: [{ name: 'gemini-existing', alias: 'public-existing' }]
          }
        ]
      },
      async writeApiKeyUpstreamEntries(providerKind: string, entries: unknown[]) {
        assert.equal(providerKind, 'gemini-api-key')
        writtenEntries = entries
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async getProviderModelCandidates() {
        return ['gemini-existing', 'gemini-new']
      }
    } as UpstreamService
    const service = createModelsService({
      configStore,
      upstreamService,
      modelsFetch: async () => {
        throw new Error('API-key sync must not use merged /models')
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.deepEqual(writtenEntries, [
      {
        'api-key': 'gemini-secret',
        'base-url': 'https://generativelanguage.googleapis.com/v1beta',
        custom: true,
        models: [
          { name: 'gemini-existing', alias: 'public-existing' },
          { name: 'gemini-new', alias: 'gemini-new' }
        ]
      }
    ])
    assert.deepEqual(
      inventory.providers[0].models.map((model) => model.id),
      ['public-existing', 'gemini-new']
    )
    assert(!JSON.stringify(inventory).includes('gemini-secret'))
  })
})

test('model inventory prefers CLIProxyAPI OpenAI-compatible candidates when available', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    let writtenProvider: unknown
    const upstreamService = {
      ...createFakeOpenAiCompatibilityUpstreamService(),
      async getOpenAiCompatibilityProviderConfigs() {
        return [
          {
            name: 'MIMO',
            'base-url': 'https://mimo.example.com/v1',
            'api-key-entries': [{ 'api-key': 'mimo-secret' }],
            models: [{ name: 'mimo-explicit', alias: 'mimo-public' }]
          }
        ]
      },
      async writeOpenAiCompatibilityProviderConfig(index: number, provider: unknown) {
        assert.equal(index, 0)
        writtenProvider = provider
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async getProviderModelCandidates() {
        return ['mimo-explicit', 'mimo-cli']
      }
    } as UpstreamService
    const service = createModelsService({
      configStore,
      upstreamService,
      openAiCompatibleModelsFetch: async () => {
        throw new Error('OpenAI-compatible fallback must not run')
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.deepEqual(writtenProvider, {
      name: 'MIMO',
      'base-url': 'https://mimo.example.com/v1',
      'api-key-entries': [{ 'api-key': 'mimo-secret' }],
      models: [
        { name: 'mimo-explicit', alias: 'mimo-public' },
        { name: 'mimo-cli', alias: 'mimo-cli' }
      ]
    })
    assert.deepEqual(
      inventory.providers[0].models.map((model) => model.id),
      ['mimo-public', 'mimo-cli']
    )
    assert(!JSON.stringify(inventory).includes('mimo-secret'))
  })
})

test('model inventory falls back to OpenAI-compatible upstream /models and writes identities', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const requests: Array<{
      url: string
      authorization: string | null
      headerValue: string | null
    }> = []
    let writtenProvider: unknown
    const upstreamService = {
      ...createFakeOpenAiCompatibilityUpstreamService(),
      async getUpstreamSummaries() {
        return [
          {
            providerKind: 'openai-compatibility',
            label: 'OpenAI-compatible provider',
            configured: true,
            redactedFields: ['apiKeyEntries', 'headers'],
            entries: [
              {
                name: 'MIMO',
                disabled: false,
                baseUrl: 'https://mimo.example.com/v1',
                apiKeyEntries: [{ 'api-key': '[REDACTED]' }],
                headers: { 'X-Safe': 'visible' },
                models: [{ name: 'mimo-explicit', alias: 'mimo-public' }]
              }
            ]
          }
        ]
      },
      async getOpenAiCompatibilityProviderConfigs() {
        return [
          {
            name: 'MIMO',
            disabled: false,
            'base-url': 'https://mimo.example.com/v1',
            'api-key-entries': [{ 'api-key': 'mimo-secret', 'proxy-url': '' }],
            headers: { 'X-Safe': 'visible' },
            custom: 'preserved',
            models: [{ name: 'mimo-explicit', alias: 'mimo-public' }]
          }
        ]
      },
      async writeOpenAiCompatibilityProviderConfig(index: number, provider: unknown) {
        assert.equal(index, 0)
        writtenProvider = provider
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async getProviderModelCandidates() {
        return null
      }
    } as UpstreamService
    const service = createModelsService({
      configStore,
      upstreamService,
      openAiCompatibleModelsFetch: async (input, init) => {
        const headers = new Headers(init?.headers)
        requests.push({
          url: input instanceof Request ? input.url : input.toString(),
          authorization: headers.get('authorization'),
          headerValue: headers.get('x-safe')
        })
        return new Response(
          JSON.stringify({
            object: 'list',
            data: [{ id: 'mimo-explicit' }, { id: 'mimo-new' }]
          }),
          { status: 200 }
        )
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.deepEqual(requests, [
      {
        url: 'https://mimo.example.com/v1/models',
        authorization: 'Bearer mimo-secret',
        headerValue: 'visible'
      }
    ])
    assert.deepEqual(writtenProvider, {
      name: 'MIMO',
      disabled: false,
      'base-url': 'https://mimo.example.com/v1',
      'api-key-entries': [{ 'api-key': 'mimo-secret', 'proxy-url': '' }],
      headers: { 'X-Safe': 'visible' },
      custom: 'preserved',
      models: [
        { name: 'mimo-explicit', alias: 'mimo-public' },
        { name: 'mimo-new', alias: 'mimo-new' }
      ]
    })
    assert.deepEqual(
      inventory.providers[0].models.map((model) => model.id),
      ['mimo-public', 'mimo-new']
    )
    assert(!JSON.stringify(inventory).includes('mimo-secret'))
  })
})

test('model inventory redacts OpenAI-compatible fallback failures in renderer payloads', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const upstreamService = {
      ...createFakeOpenAiCompatibilityUpstreamService(),
      async getOpenAiCompatibilityProviderConfigs() {
        return [
          {
            name: 'MIMO',
            'base-url': 'https://mimo.example.com/v1',
            'api-key-entries': [{ 'api-key': 'mimo-secret' }],
            models: [{ name: 'mimo-explicit', alias: 'mimo-public' }]
          }
        ]
      },
      async writeOpenAiCompatibilityProviderConfig() {
        throw new Error('write should not run')
      },
      async getProviderModelCandidates() {
        return null
      }
    } as UpstreamService
    const service = createModelsService({
      configStore,
      upstreamService,
      openAiCompatibleModelsFetch: async () =>
        new Response('upstream rejected mimo-secret', { status: 500 }),
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.equal(inventory.providers[0].modelState, 'sync_unavailable')
    assert.match(inventory.providers[0].emptyMessage ?? '', /\[REDACTED\]/)
    assert.deepEqual(
      inventory.providers[0].models.map((model) => model.id),
      ['mimo-public']
    )
    assert(!JSON.stringify(inventory).includes('mimo-secret'))
  })
})

test('model inventory writes account OAuth identity aliases when candidates are available', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    let writtenAliases: unknown
    const upstreamService = {
      ...createFakeUpstreamService(),
      async getOauthModelAliases() {
        return {
          codex: [{ name: 'codex-existing', alias: 'codex-public' }]
        }
      },
      async writeOauthModelAliases(input: unknown) {
        writtenAliases = input
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async getProviderModelCandidates() {
        return ['codex-existing', 'codex-new']
      }
    } as UpstreamService
    const service = createModelsService({
      configStore,
      upstreamService,
      modelsFetch: async () => {
        throw new Error('Account sync should use CLIProxyAPI candidate data')
      },
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()

    assert.deepEqual(writtenAliases, {
      codex: [
        { name: 'codex-existing', alias: 'codex-public' },
        { name: 'codex-new', alias: 'codex-new' }
      ]
    })
    assert.deepEqual(
      inventory.providers[1].models.map((model) => model.id),
      ['codex-public', 'codex-new']
    )
  })
})

test('model inventory keeps MIMO fallback aliases separate from Codex account aliases', async () => {
  await withTempHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({
      homeDir,
      platform: 'darwin'
    })
    const configStore = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })
    const upstreamService = {
      ...createFakeOpenAiCompatibilityAndCodexUpstreamService(),
      async getOpenAiCompatibilityProviderConfigs() {
        return [
          {
            name: 'MIMO',
            'base-url': 'https://mimo.example.com/v1',
            'api-key-entries': [{ 'api-key': 'mimo-secret' }],
            models: []
          }
        ]
      },
      async writeOpenAiCompatibilityProviderConfig() {
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async getOauthModelAliases() {
        return {}
      },
      async writeOauthModelAliases() {
        return { ok: true, status: 200, raw: { status: 'ok' } }
      },
      async getProviderModelCandidates(input: { providerKind: string }) {
        return input.providerKind === 'codex'
          ? ['codex-mini-latest']
          : null
      }
    } as UpstreamService
    const service = createModelsService({
      configStore,
      upstreamService,
      modelsFetch: async () => {
        throw new Error('Merged /models must not decide MIMO/Codex membership')
      },
      openAiCompatibleModelsFetch: async () =>
        new Response(
          JSON.stringify({ data: [{ id: 'mimo-only-model' }] }),
          { status: 200 }
        ),
      generateId: () => 'lok_default',
      generateKey: () => 'ak-allmone-default'
    })

    const inventory = await service.getModelInventory()
    const mimo = inventory.providers.find(
      (provider) => provider.providerKind === 'openai-compatibility'
    )
    const codex = inventory.providers.find(
      (provider) => provider.providerKind === 'codex'
    )

    assert.deepEqual(
      mimo?.models.map((model) => model.id),
      ['mimo-only-model']
    )
    assert.deepEqual(
      codex?.models.map((model) => model.id),
      ['codex-mini-latest']
    )
    assert(!JSON.stringify(inventory).includes('mimo-secret'))
  })
})
