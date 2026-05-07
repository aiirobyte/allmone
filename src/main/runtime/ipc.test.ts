import assert from 'node:assert/strict'

import {
  REGISTERED_RUNTIME_CHANNELS,
  RUNTIME_IPC_CHANNELS,
  registerRuntimeIpcHandlers
} from './ipc'
import type { RuntimeService } from './service'

type Handler = (_event: unknown, payload?: unknown) => Promise<unknown> | unknown

function createFakeIpcMain() {
  const handlers = new Map<string, Handler>()

  return {
    ipcMain: {
      handle(channel: string, handler: Handler) {
        handlers.set(channel, handler)
      }
    },
    invoke(channel: string, payload?: unknown) {
      const handler = handlers.get(channel)

      if (!handler) {
        throw new Error(`Missing handler: ${channel}`)
      }

      return handler({}, payload)
    },
    handlers
  }
}

function createFakeService(): RuntimeService & {
  savedPayloads: unknown[]
  providerPayloads: unknown[]
  deletePayloads: unknown[]
} {
  return {
    savedPayloads: [],
    providerPayloads: [],
    deletePayloads: [],
    async initialize() {},
    getState() {
      return {
        status: 'reachable',
        connection: {
          baseUrl: 'http://localhost:8317/v0/management',
          timeoutMs: 5000,
          managementKeyConfigured: false,
          managementKeyPersisted: false
        }
      }
    },
    async saveConnectionSettings(input) {
      this.savedPayloads.push(input)
      return this.getState()
    },
    async saveOutputPort() {
      return this.getState()
    },
    async testConnection() {
      return { ok: true, state: 'reachable', status: 200 }
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

test('passes valid connection payloads to the runtime service', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await ipc.invoke(RUNTIME_IPC_CHANNELS.saveConnection, {
    baseUrl: 'http://localhost:9000/v0/management',
    managementKey: 'mgmt-secret',
    timeoutMs: 2500
  })

  assert.deepEqual(service.savedPayloads[0], {
    baseUrl: 'http://localhost:9000/v0/management',
    managementKey: 'mgmt-secret',
    timeoutMs: 2500
  })
})

test('rejects invalid IPC payloads without echoing secret values', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  registerRuntimeIpcHandlers({ ipcMain: ipc.ipcMain, runtimeService: service })

  await assert.rejects(
    async () => {
      await ipc.invoke(RUNTIME_IPC_CHANNELS.saveConnection, {
        baseUrl: 42,
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
