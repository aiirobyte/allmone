import assert from 'node:assert/strict'

import {
  REGISTERED_RUNTIME_CHANNELS,
  RUNTIME_IPC_CHANNELS,
  registerRuntimeIpcHandlers
} from './ipc'
import type { ModelsService } from '../models'
import type { RuntimeService } from './service'
import type { ProviderLoginRunner, UpstreamService } from '../upstreams'

type Handler = (_event: unknown, payload?: unknown) => Promise<unknown> | unknown

function createFakeIpcMain() {
  const handlers = new Map<string, Handler>()

  return {
    ipcMain: {
      handle(channel: string, handler: Handler) {
        handlers.set(channel, handler)
      }
    },
    invoke(channel: string, payload?: unknown, event: unknown = {}) {
      const handler = handlers.get(channel)

      if (!handler) {
        throw new Error(`Missing handler: ${channel}`)
      }

      return handler(event, payload)
    },
    handlers
  }
}

function createFakeService(): RuntimeService & {
  savedPayloads: unknown[]
  savedPorts: unknown[]
  providerPayloads: unknown[]
  deletePayloads: unknown[]
  commandCalls: string[]
} {
  return {
    savedPayloads: [],
    savedPorts: [],
    providerPayloads: [],
    deletePayloads: [],
    commandCalls: [],
    async initialize() {},
    getState() {
      return {
        status: 'reachable',
        connection: {
          baseUrl: 'http://localhost:8317/v0/management',
          timeoutMs: 5000,
          managementKeyConfigured: false,
          managementKeyPersisted: false
        },
        software: {
          cliproxyapi: {
            releaseMetadataUrl:
              'https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest',
            releasePageUrl:
              'https://github.com/router-for-me/CLIProxyAPI/releases/latest',
            localExecutablePath: '/tmp/allmone/runtime/cli-proxy-api/bin/cli-proxy-api'
          },
          runtime: {
            host: '127.0.0.1',
            port: 8317,
            timeoutMs: 5000,
            configPath: '/tmp/allmone/runtime/cli-proxy-api/config.yaml',
            serviceOrigin: 'http://127.0.0.1:8317',
            apiBaseUrl: 'http://127.0.0.1:8317/v1',
            managementBaseUrl: 'http://127.0.0.1:8317/v0/management'
          }
        },
        managed: {
          status: 'running',
          pid: 1234
        }
      }
    },
    async saveConnectionSettings(input) {
      this.savedPayloads.push(input)
      return this.getState()
    },
    async saveOutputPort() {
      this.savedPorts.push(arguments[0])
      return this.getState()
    },
    async ensureInstalledThenStart() {
      this.commandCalls.push('ensureInstalledThenStart')
      return this.getState()
    },
    async checkForUpdate() {
      this.commandCalls.push('checkForUpdate')
      return this.getState()
    },
    async startManagedRuntime() {
      this.commandCalls.push('startManagedRuntime')
      return this.getState()
    },
    async restartManagedRuntime() {
      this.commandCalls.push('restartManagedRuntime')
      return this.getState()
    },
    async stopManagedRuntime() {
      this.commandCalls.push('stopManagedRuntime')
      return this.getState()
    },
    async testConnection() {
      return { ok: true, state: 'reachable', status: 200 }
    },
    async testOutputPortConnectivity() {
      return {
        ok: true,
        state: 'reachable',
        target: 'http://127.0.0.1:8317',
        host: '127.0.0.1',
        port: 8317,
        latencyMs: 3,
        checkedAt: '2026-05-09T00:00:00.000Z'
      }
    },
    async testModelOutput(input) {
      this.providerPayloads.push(input)
      return {
        ok: true,
        state: 'reachable',
        target: 'http://127.0.0.1:8317/v1/chat/completions',
        model: input.model,
        status: 200,
        latencyMs: 8,
        outputText: 'ok',
        checkedAt: '2026-05-09T00:00:00.000Z'
      }
    },
    async getConfigSummary() {
      return {
        apiKeysConfigured: 0,
        openAiCompatibilityProviders: []
      }
    },
    async upsertOpenAiCompatibilityProvider(input) {
      this.providerPayloads.push(input)
      return {
        ok: true,
        status: 200,
        summary: {
          apiKeysConfigured: 0,
          openAiCompatibilityProviders: []
        }
      }
    },
    async deleteOpenAiCompatibilityProvider(input) {
      this.deletePayloads.push(input)
      return {
        ok: true,
        status: 200,
        summary: {
          apiKeysConfigured: 0,
          openAiCompatibilityProviders: []
        }
      }
    }
  }
}

function createFakeClipboard() {
  const writes: string[] = []

  return {
    writes,
    writeText(value: string) {
      writes.push(value)
    }
  }
}

function createFakeUpstreamService(): UpstreamService & { calls: string[] } {
  return {
    calls: [],
    getProviderCatalog() {
      this.calls.push('catalog')
      return []
    },
    async getLocalApiKeyState() {
      return { configured: false, count: 0, redactedKeys: [] }
    },
    async generateLocalApiKey() {
      this.calls.push('generate-local')
      return {
        configured: true,
        count: 1,
        redactedKeys: ['[REDACTED]'],
        oneTimePlaintextKey: 'local-secret'
      }
    },
    async setLocalApiKey() {
      this.calls.push('set-local')
      return {
        configured: true,
        count: 1,
        redactedKeys: ['[REDACTED]'],
        oneTimePlaintextKey: 'local-secret'
      }
    },
    async deleteLocalApiKey() {
      this.calls.push('delete-local')
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getLocalConnectionOutput(input) {
      this.calls.push('connection-output')
      return {
        serviceOrigin: input.serviceOrigin,
        port: input.port,
        localKeyConfigured: true,
        snippets: { curl: 'curl', openAiSdk: 'base_url' }
      }
    },
    async getUpstreamSummaries() {
      this.calls.push('summaries')
      return []
    },
    async upsertApiKeyUpstream() {
      this.calls.push('upsert-api-key')
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteApiKeyUpstream() {
      this.calls.push('delete-api-key')
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getAmpConfig() {
      return {}
    },
    async writeAmpConfig() {
      this.calls.push('write-amp')
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async resetAmpConfig() {
      this.calls.push('reset-amp')
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getAuthFileSummaries() {
      this.calls.push('auth-files')
      return []
    },
    async deleteAuthFile() {
      this.calls.push('delete-auth-file')
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getOauthModelAliases() {
      return {}
    },
    async writeOauthModelAliases() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async getOauthExcludedModels() {
      return {}
    },
    async writeOauthExcludedModels() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    }
  }
}

function createFakeModelsService(): ModelsService & {
  calls: Array<{ name: string; payload?: unknown }>
} {
  return {
    calls: [],
    async ensureDefaultLocalOutputKey() {
      this.calls.push({ name: 'ensure' })
      return {
        keys: [
          {
            id: 'lok_default',
            name: 'Default local key',
            preview: '[REDACTED]',
            isDefault: true
          }
        ]
      }
    },
    async getModelInventory() {
      this.calls.push({ name: 'inventory' })
      return {
        serviceOrigin: 'http://127.0.0.1:8317',
        apiBaseUrl: 'http://127.0.0.1:8317/v1',
        fetchedAt: '2026-05-10T00:00:00.000Z',
        localOutputKeys: [
          {
            id: 'lok_default',
            name: 'Default local key',
            preview: '[REDACTED]',
            isDefault: true
          }
        ],
        providers: []
      }
    },
    async getLocalOutputKeySummaries() {
      this.calls.push({ name: 'summaries' })
      return [
        {
          id: 'lok_default',
          name: 'Default local key',
          preview: '[REDACTED]',
          isDefault: true
        }
      ]
    },
    async createGeneratedLocalOutputKey(input) {
      this.calls.push({ name: 'create', payload: input })
      return {
        key: {
          id: 'lok_generated',
          name: input.name,
          preview: '[REDACTED]',
          isDefault: false
        },
        keys: [],
        plaintext: 'ak-generated'
      }
    },
    async renameLocalOutputKey(input) {
      this.calls.push({ name: 'rename', payload: input })
      return {
        key: {
          id: input.id,
          name: input.name,
          preview: '[REDACTED]',
          isDefault: false
        },
        keys: []
      }
    },
    async revealLocalOutputKey(input) {
      this.calls.push({ name: 'reveal', payload: input })
      return {
        key: {
          id: input.id,
          name: 'Default local key',
          preview: '[REDACTED]',
          isDefault: true
        },
        keys: [],
        plaintext: 'ak-revealed'
      }
    },
    async deleteLocalOutputKey(input) {
      this.calls.push({ name: 'delete', payload: input })
      return { keys: [] }
    }
  }
}

function createFakeLoginRunner(): ProviderLoginRunner & { calls: unknown[] } {
  return {
    calls: [],
    async run(input, options) {
      this.calls.push(input)
      options?.onEvent?.({
        type: 'codex-device-code',
        kind: 'codex-device-login',
        url: 'https://auth.openai.com/codex/device',
        code: 'ABCD-1234'
      })
      return { ok: true, exitCode: 0, signal: null }
    }
  }
}

test('registers the centralized runtime IPC channels', () => {
  const ipc = createFakeIpcMain()

  registerRuntimeIpcHandlers({
    ipcMain: ipc.ipcMain,
    runtimeService: createFakeService()
  })

  assert.deepEqual([...ipc.handlers.keys()].sort(), [
    ...REGISTERED_RUNTIME_CHANNELS
  ].sort())
})

test('passes valid management key payloads to the runtime service', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.saveConnection, {
    managementKey: 'mgmt-secret'
  })

  assert.deepEqual(service.savedPayloads[0], {
    managementKey: 'mgmt-secret'
  })
})

test('rejects invalid IPC payloads without echoing secret values', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await assert.rejects(
    async () => {
      await ipc.invoke(RUNTIME_IPC_CHANNELS.saveConnection, {
        timeoutMs: 2500,
        managementKey: 'mgmt-secret'
      })
    },
    (error) =>
      error instanceof Error &&
      error.message === 'Invalid runtime IPC payload' &&
      !error.message.includes('mgmt-secret')
  )
})

test('validates provider upsert and delete payloads before calling service', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.upsertOpenAiProvider, {
    name: 'openrouter',
    providerId: 'openrouter_work',
    disabled: false,
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: 'provider-secret',
    proxyUrl: '',
    models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.deleteOpenAiProvider, {
    name: 'openrouter'
  })
  await assert.rejects(async () => {
    await ipc.invoke(RUNTIME_IPC_CHANNELS.deleteOpenAiProvider, {
      name: 'openrouter',
      index: 0
    })
  })

  assert.equal(service.providerPayloads.length, 1)
  assert.equal(service.deletePayloads.length, 1)
})

test('validates managed runtime port and command IPC payloads', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.saveOutputPort, { port: 9444 })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.ensureInstalledThenStart)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.checkForUpdate)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.startManagedRuntime)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.restartManagedRuntime)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.stopManagedRuntime)

  await assert.rejects(async () => {
    await ipc.invoke(RUNTIME_IPC_CHANNELS.saveOutputPort, { port: 70_000 })
  })
  await assert.rejects(async () => {
    await ipc.invoke(RUNTIME_IPC_CHANNELS.startManagedRuntime, {
      managementKey: 'mgmt-secret'
    })
  })

  assert.deepEqual(service.savedPorts, [9444])
  assert.deepEqual(service.commandCalls, [
    'ensureInstalledThenStart',
    'checkForUpdate',
    'startManagedRuntime',
    'restartManagedRuntime',
    'stopManagedRuntime'
  ])
})

test('validates output port test IPC payloads without echoing local keys', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.testOutputPortConnectivity)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.testModelOutput, {
    model: 'test-model',
    apiKey: 'local-secret',
    prompt: 'say ok'
  })

  await assert.rejects(
    async () => {
      await ipc.invoke(RUNTIME_IPC_CHANNELS.testModelOutput, {
        model: 'test-model',
        apiKey: 'local-secret',
        prompt: 123
      })
    },
    (error) =>
      error instanceof Error &&
      error.message === 'Invalid runtime IPC payload' &&
      !error.message.includes('local-secret')
  )
  await assert.rejects(async () => {
    await ipc.invoke(RUNTIME_IPC_CHANNELS.testOutputPortConnectivity, {
      apiKey: 'local-secret'
    })
  })

  assert.deepEqual(service.providerPayloads[0], {
    model: 'test-model',
    apiKey: 'local-secret',
    prompt: 'say ok'
  })
})

test('copies only the safe local service origin through main clipboard', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  const clipboard = createFakeClipboard()
  registerRuntimeIpcHandlers({
    ipcMain: ipc.ipcMain,
    runtimeService: service,
    clipboard
  })

  const result = await ipc.invoke(RUNTIME_IPC_CHANNELS.copyApiBase)

  assert.deepEqual(clipboard.writes, ['http://127.0.0.1:8317'])
  assert.deepEqual(result, { value: 'http://127.0.0.1:8317' })
})

test('validates upstream IPC payloads before calling upstream services', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  const upstreamService = createFakeUpstreamService()
  const providerLoginRunner = createFakeLoginRunner()
  registerRuntimeIpcHandlers({
    ipcMain: ipc.ipcMain,
    runtimeService: service,
    upstreamService,
    providerLoginRunner
  })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.getUpstreamCatalog)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.getUpstreamSummaries)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.getLocalConnectionOutput)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.generateLocalApiKey)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.setLocalApiKey, { apiKey: 'local-secret' })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.deleteLocalApiKey, { value: 'local-secret' })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.upsertApiKeyUpstream, {
    providerKind: 'gemini-api-key',
    entryIndex: 0,
    providerId: 'gemini_work',
    apiKey: 'provider-secret',
    modelAliases: [{ name: 'gemini-2.5-pro', alias: 'pro' }],
    excludedModels: [{ pattern: 'gemini-1.0-pro' }]
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.deleteApiKeyUpstream, {
    providerKind: 'gemini-api-key',
    apiKey: 'provider-secret'
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.writeAmpConfig, {
    upstreamUrl: 'https://amp.example.com'
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.resetAmpConfig)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.getAuthFiles)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.deleteAuthFile, { name: 'claude.json' })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.runLoginAction, { kind: 'claude-login' })

  await assert.rejects(
    async () => {
      await ipc.invoke(RUNTIME_IPC_CHANNELS.upsertApiKeyUpstream, {
        providerKind: 'bad-kind',
        apiKey: 'provider-secret'
      })
    },
    (error) =>
      error instanceof Error &&
      error.message === 'Invalid runtime IPC payload' &&
      !error.message.includes('provider-secret')
  )
  await assert.rejects(async () => {
    await ipc.invoke(RUNTIME_IPC_CHANNELS.upsertApiKeyUpstream, {
      providerKind: 'gemini-api-key',
      providerId: 'bad-id',
      apiKey: 'provider-secret'
    })
  })

  assert.deepEqual(upstreamService.calls, [
    'catalog',
    'summaries',
    'connection-output',
    'generate-local',
    'set-local',
    'delete-local',
    'upsert-api-key',
    'delete-api-key',
    'write-amp',
    'reset-amp',
    'auth-files',
    'delete-auth-file'
  ])
  assert.deepEqual(providerLoginRunner.calls, [{ kind: 'claude-login', importPath: undefined }])
})

test('forwards provider login events to the invoking renderer', async () => {
  const ipc = createFakeIpcMain()
  const sent: Array<{ channel: string; payload: unknown }> = []
  registerRuntimeIpcHandlers({
    ipcMain: ipc.ipcMain,
    runtimeService: createFakeService(),
    providerLoginRunner: createFakeLoginRunner()
  })

  await ipc.invoke(
    RUNTIME_IPC_CHANNELS.runLoginAction,
    { kind: 'codex-device-login' },
    {
      sender: {
        send(channel: string, payload: unknown) {
          sent.push({ channel, payload })
        }
      }
    }
  )

  assert.deepEqual(sent, [
    {
      channel: 'runtime:upstream-login-event',
      payload: {
        type: 'codex-device-code',
        kind: 'codex-device-login',
        url: 'https://auth.openai.com/codex/device',
        code: 'ABCD-1234'
      }
    }
  ])
})

test('validates name-only local output key IPC payloads without echoing plaintext', async () => {
  const ipc = createFakeIpcMain()
  const modelsService = createFakeModelsService()
  registerRuntimeIpcHandlers({
    ipcMain: ipc.ipcMain,
    runtimeService: createFakeService(),
    modelsService
  })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.getLocalOutputKeys)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.getModelInventory)
  await ipc.invoke(RUNTIME_IPC_CHANNELS.createGeneratedLocalOutputKey, {
    name: 'Generated key'
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.renameLocalOutputKey, {
    id: 'lok_generated',
    name: 'Renamed key'
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.revealLocalOutputKey, {
    id: 'lok_generated'
  })
  await ipc.invoke(RUNTIME_IPC_CHANNELS.deleteLocalOutputKey, {
    id: 'lok_generated'
  })

  await assert.rejects(
    async () => {
      await ipc.invoke(RUNTIME_IPC_CHANNELS.createGeneratedLocalOutputKey, {
        name: ''
      })
    },
    (error) =>
      error instanceof Error &&
      error.message === 'Invalid runtime IPC payload' &&
      !error.message.includes('Generated key')
  )

  assert.deepEqual(modelsService.calls, [
    { name: 'summaries' },
    { name: 'inventory' },
    { name: 'create', payload: { name: 'Generated key' } },
    { name: 'rename', payload: { id: 'lok_generated', name: 'Renamed key' } },
    { name: 'reveal', payload: { id: 'lok_generated' } },
    { name: 'delete', payload: { id: 'lok_generated' } }
  ])
})
