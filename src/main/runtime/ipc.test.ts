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

test('copies only the safe OpenAI-compatible API base through main clipboard', async () => {
  const ipc = createFakeIpcMain()
  const service = createFakeService()
  const clipboard = createFakeClipboard()
  registerRuntimeIpcHandlers({
    ipcMain: ipc.ipcMain,
    runtimeService: service,
    clipboard
  })

  const result = await ipc.invoke(RUNTIME_IPC_CHANNELS.copyApiBase)

  assert.deepEqual(clipboard.writes, ['http://127.0.0.1:8317/v1'])
  assert.deepEqual(result, { value: 'http://127.0.0.1:8317/v1' })
})
