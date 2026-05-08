import assert from 'node:assert/strict'

import { CliProxyApiError, type CliProxyApiConfigResult } from '../cliproxyapi'
import type {
  AllmoneConfigStore,
  AllmoneSoftwareConfig
} from './allmoneConfigStore'
import type { CliProxyApiConfigWriter } from './cliproxyapiConfigWriter'
import type {
  CliProxyApiProcessController,
  CliProxyApiProcessState
} from './cliproxyapiProcessController'
import {
  createRuntimeService,
  type RuntimeCliProxyApiClient,
  type RuntimeClientFactory
} from './service'
import type { RuntimeLoadedSettings } from './types'
import type { RuntimeSettingsStore } from './settingsStore'

function loadedSettings(
  overrides: Partial<RuntimeLoadedSettings> = {}
): RuntimeLoadedSettings {
  return {
    connection: {
      baseUrl: 'http://localhost:8317/v0/management',
      timeoutMs: 5000,
      managementKeyConfigured: true,
      managementKeyPersisted: true
    },
    managementKey: 'mgmt-secret',
    ...overrides
  }
}

function createFakeStore(initial: RuntimeLoadedSettings): RuntimeSettingsStore & {
  nextSaved?: RuntimeLoadedSettings
} {
  return {
    nextSaved: undefined,
    async load() {
      return initial
    },
    async ensureManagementKey() {
      return initial
    },
    async saveConnectionSettings() {
      return this.nextSaved ?? initial
    }
  }
}

function createFakeClient(
  overrides: Partial<RuntimeCliProxyApiClient> = {}
): RuntimeCliProxyApiClient {
  return {
    async checkManagementApi() {
      return { ok: true, state: 'reachable', status: 200 }
    },
    async getConfig() {
      return { config: {}, raw: {} }
    },
    async upsertOpenAiCompatibilityProvider() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    async deleteOpenAiCompatibilityProvider() {
      return { ok: true, status: 200, raw: { status: 'ok' } }
    },
    ...overrides
  }
}

function managedSoftwareConfig(port = 9444): AllmoneSoftwareConfig {
  return {
    version: 1,
    cliproxyapi: {
      releaseMetadataUrl: 'https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest',
      releasePageUrl: 'https://github.com/router-for-me/CLIProxyAPI/releases/latest',
      localExecutablePath: '/tmp/allmone/runtime/bin/cli-proxy-api'
    },
    runtime: {
      host: '127.0.0.1',
      port,
      configPath: '/tmp/allmone/runtime/config.yaml',
      apiBaseUrl: `http://127.0.0.1:${port}/v1`,
      managementBaseUrl: `http://127.0.0.1:${port}/v0/management`
    }
  }
}

function createFakeAllmoneConfigStore(
  config: AllmoneSoftwareConfig
): AllmoneConfigStore {
  return {
    async load() {
      return config
    },
    async save() {
      return config
    }
  }
}

function createFakeProcessController(
  initial: CliProxyApiProcessState = { status: 'stopped' }
): CliProxyApiProcessController & { calls: string[] } {
  let state = initial

  return {
    calls: [],
    getState() {
      return state
    },
    async start() {
      this.calls.push('start')
      state = { status: 'running', pid: 1234 }
      return state
    },
    async stop() {
      this.calls.push('stop')
      state = { status: 'stopped' }
      return state
    },
    async restart() {
      this.calls.push('restart')
      state = { status: 'running', pid: 2345 }
      return state
    },
    async checkForUpdate() {
      this.calls.push('checkForUpdate')
      state = {
        status: 'ready',
        install: { status: 'up_to_date', version: 'v6.9.0' }
      }
      return state
    },
    async ensureInstalledThenStart() {
      this.calls.push('ensureInstalledThenStart')
      state = {
        status: 'running',
        pid: 3456,
        install: { status: 'existing', version: 'v6.9.0' }
      }
      return state
    }
  }
}

test('maps runtime connection checks into sanitized service state', async () => {
  const store = createFakeStore(loadedSettings())
  const client = createFakeClient({
    async checkManagementApi() {
      return {
        ok: false,
        state: 'auth_required',
        status: 401,
        error: 'Authorization: Bearer mgmt-secret'
      }
    }
  })
  const service = createRuntimeService({
    settingsStore: store,
    createClient: () => client
  })

  await service.initialize()
  const result = await service.testConnection()
  const state = service.getState()

  assert.equal(result.state, 'auth_required')
  assert.equal(state.status, 'auth_required')
  assert.equal(state.lastError, 'Authorization: Bearer [REDACTED]')
  assert.equal(state.lastHttpStatus, 401)
  assert.equal(typeof state.lastCheckedAt, 'string')
  assert(!Number.isNaN(Date.parse(state.lastCheckedAt ?? '')))
  assert(!JSON.stringify(state).includes('mgmt-secret'))
})

test('records diagnostic metadata for management check states', async () => {
  const cases = [
    { state: 'reachable', status: 200, error: undefined },
    { state: 'management_disabled', status: 404, error: 'Not found' },
    { state: 'timeout', status: undefined, error: 'Timed out after 5000ms' },
    {
      state: 'invalid_response',
      status: 200,
      error: 'Invalid JSON containing sk-live-abcdefghijklmnopqrstuvwxyz'
    },
    {
      state: 'unexpected_error',
      status: 500,
      error: 'provider-secret Authorization: Bearer mgmt-secret'
    }
  ] as const

  for (const item of cases) {
    const store = createFakeStore(loadedSettings())
    const service = createRuntimeService({
      settingsStore: store,
      createClient: () =>
        createFakeClient({
          async checkManagementApi() {
            return {
              ok: item.state === 'reachable',
              state: item.state,
              status: item.status,
              error: item.error
            }
          }
        })
    })

    await service.initialize()
    const result = await service.testConnection()
    const state = service.getState()
    const serialized = JSON.stringify({ result, state })

    assert.equal(state.status, item.state)
    assert.equal(state.lastHttpStatus, item.status)
    assert.equal(typeof state.lastCheckedAt, 'string')
    assert(!Number.isNaN(Date.parse(state.lastCheckedAt ?? '')))
    assert(!serialized.includes('sk-live-abcdefghijklmnopqrstuvwxyz'))
    assert(!serialized.includes('provider-secret'))
    assert(!serialized.includes('mgmt-secret'))
  }
})

test('rebuilds the CLIProxyAPI client after saving connection settings', async () => {
  const store = createFakeStore(loadedSettings())
  store.nextSaved = loadedSettings({
    connection: {
      baseUrl: 'http://localhost:9000/v0/management',
      timeoutMs: 2500,
      managementKeyConfigured: true,
      managementKeyPersisted: false
    },
    managementKey: 'new-management-key'
  })
  const seenOptions: Array<{
    baseUrl?: string
    managementKey?: string
    timeoutMs?: number
  }> = []
  const createClient: RuntimeClientFactory = (options) => {
    seenOptions.push(options)
    return createFakeClient()
  }
  const service = createRuntimeService({ settingsStore: store, createClient })

  await service.initialize()
  await service.saveConnectionSettings({
    baseUrl: 'http://localhost:9000/v0/management',
    managementKey: 'new-management-key',
    timeoutMs: 2500
  })

  assert.deepEqual(seenOptions.at(-1), {
    baseUrl: 'http://localhost:9000/v0/management',
    managementKey: 'new-management-key',
    timeoutMs: 2500
  })
})

test('derives the management base URL from managed software config', async () => {
  const store = createFakeStore(
    loadedSettings({
      connection: {
        baseUrl: 'http://localhost:8317/v0/management',
        timeoutMs: 5000,
        managementKeyConfigured: true,
        managementKeyPersisted: true
      },
      managementKey: 'mgmt-secret'
    })
  )
  const seenOptions: Array<{
    baseUrl?: string
    managementKey?: string
    timeoutMs?: number
  }> = []
  const createClient: RuntimeClientFactory = (options) => {
    seenOptions.push(options)
    return createFakeClient()
  }
  const configWriter: CliProxyApiConfigWriter = {
    async writeManagedConfig() {
      return managedSoftwareConfig(9444)
    },
    async saveOutputPort(port) {
      return managedSoftwareConfig(port)
    }
  }
  const service = createRuntimeService({
    settingsStore: store,
    allmoneConfigStore: createFakeAllmoneConfigStore(managedSoftwareConfig(9444)),
    cliProxyApiConfigWriter: configWriter,
    createClient
  })

  await service.initialize()

  assert.deepEqual(seenOptions.at(-1), {
    baseUrl: 'http://127.0.0.1:9444/v0/management',
    managementKey: 'mgmt-secret',
    timeoutMs: 5000
  })
  assert.equal(
    service.getState().connection.baseUrl,
    'http://127.0.0.1:9444/v0/management'
  )
  assert.equal(
    service.getState().software?.runtime.apiBaseUrl,
    'http://127.0.0.1:9444/v1'
  )
  assert.equal(
    service.getState().software?.cliproxyapi.localExecutablePath,
    '/tmp/allmone/runtime/bin/cli-proxy-api'
  )
})

test('saves managed output ports, rebuilds the runtime client, and restarts managed processes', async () => {
  const store = createFakeStore(loadedSettings())
  const processController = createFakeProcessController({ status: 'running' })
  const seenOptions: Array<{
    baseUrl?: string
    managementKey?: string
    timeoutMs?: number
  }> = []
  const createClient: RuntimeClientFactory = (options) => {
    seenOptions.push(options)
    return createFakeClient()
  }
  const configWriter: CliProxyApiConfigWriter = {
    async writeManagedConfig() {
      return managedSoftwareConfig(8317)
    },
    async saveOutputPort(port) {
      return managedSoftwareConfig(port)
    }
  }
  const service = createRuntimeService({
    settingsStore: store,
    allmoneConfigStore: createFakeAllmoneConfigStore(managedSoftwareConfig(8317)),
    cliProxyApiConfigWriter: configWriter,
    cliProxyApiProcessController: processController,
    createClient
  })

  await service.initialize()
  const state = await service.saveOutputPort(9555)

  assert.equal(state.connection.baseUrl, 'http://127.0.0.1:9555/v0/management')
  assert.deepEqual(seenOptions.at(-1), {
    baseUrl: 'http://127.0.0.1:9555/v0/management',
    managementKey: 'mgmt-secret',
    timeoutMs: 5000
  })
  assert.deepEqual(processController.calls, ['restart'])
})

test('routes managed process commands through the process controller', async () => {
  const store = createFakeStore(loadedSettings())
  const processController = createFakeProcessController()
  const service = createRuntimeService({
    settingsStore: store,
    allmoneConfigStore: createFakeAllmoneConfigStore(managedSoftwareConfig(8317)),
    cliProxyApiProcessController: processController
  })

  await service.initialize()
  await service.ensureInstalledThenStart()
  await service.startManagedRuntime()
  await service.restartManagedRuntime()
  await service.stopManagedRuntime()
  await service.checkForUpdate()

  assert.deepEqual(processController.calls, [
    'ensureInstalledThenStart',
    'start',
    'restart',
    'stop',
    'checkForUpdate'
  ])
  assert.equal(service.getState().managed?.status, 'ready')
  assert.equal(service.getState().software?.runtime.port, 8317)
})

test('returns sanitized config summaries without provider secrets', async () => {
  const store = createFakeStore(loadedSettings())
  const config: CliProxyApiConfigResult = {
    config: {
      debug: true,
      'api-keys': ['client-a', 'client-b'],
      'request-log': true,
      'request-retry': 3,
      'openai-compatibility': [
        {
          name: 'openrouter',
          disabled: false,
          'base-url': 'https://openrouter.ai/api/v1',
          'api-key-entries': [
            {
              'api-key': 'sk-live-abcdefghijklmnopqrstuvwxyz',
              'proxy-url': 'socks5://user:pass@proxy.example.com:1080',
              'auth-index': 'auth-1'
            }
          ],
          models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }],
          headers: { 'X-Team': 'core' }
        }
      ]
    },
    raw: {}
  }
  const service = createRuntimeService({
    settingsStore: store,
    createClient: () =>
      createFakeClient({
        async getConfig() {
          return config
        }
      })
  })

  await service.initialize()
  const summary = await service.getConfigSummary()
  const serialized = JSON.stringify(summary)

  assert.equal(summary.apiKeysConfigured, 2)
  assert.equal(summary.openAiCompatibilityProviders[0]?.name, 'openrouter')
  assert.equal(
    summary.openAiCompatibilityProviders[0]?.apiKeyEntries[0]?.proxyUrl,
    'socks5://[REDACTED]@proxy.example.com:1080'
  )
  assert(!serialized.includes('sk-live-abcdefghijklmnopqrstuvwxyz'))
  assert(!serialized.includes('user:pass'))
})

test('upserts and deletes providers through CLIProxyAPI and refreshes summaries', async () => {
  const store = createFakeStore(loadedSettings())
  const upserts: unknown[] = []
  const deletes: unknown[] = []
  const service = createRuntimeService({
    settingsStore: store,
    createClient: () =>
      createFakeClient({
        async getConfig() {
          return {
            config: {
              'openai-compatibility': [
                {
                  name: 'openrouter',
                  'base-url': 'https://openrouter.ai/api/v1'
                }
              ]
            },
            raw: {}
          }
        },
        async upsertOpenAiCompatibilityProvider(input) {
          upserts.push(input)
          return { ok: true, status: 200, raw: { status: 'ok' } }
        },
        async deleteOpenAiCompatibilityProvider(input) {
          deletes.push(input)
          return { ok: true, status: 200, raw: { status: 'ok' } }
        }
      })
  })

  await service.initialize()
  const upserted = await service.upsertOpenAiCompatibilityProvider({
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: 'provider-secret',
    proxyUrl: '',
    models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
  })
  const deleted = await service.deleteOpenAiCompatibilityProvider({
    name: 'openrouter'
  })

  assert.deepEqual(upserts[0], {
    name: 'openrouter',
    disabled: false,
    'base-url': 'https://openrouter.ai/api/v1',
    'api-key-entries': [{ 'api-key': 'provider-secret', 'proxy-url': '' }],
    models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
  })
  assert.deepEqual(deletes[0], { name: 'openrouter' })
  assert.equal(upserted.summary.openAiCompatibilityProviders[0]?.name, 'openrouter')
  assert.equal(deleted.status, 200)
})

test('throws sanitized errors for runtime operation failures', async () => {
  const store = createFakeStore(loadedSettings())
  const service = createRuntimeService({
    settingsStore: store,
    createClient: () =>
      createFakeClient({
        async getConfig() {
          throw new CliProxyApiError({
            kind: 'unexpected_http',
            state: 'unexpected_error',
            message: 'provider-secret Authorization: Bearer mgmt-secret'
          })
        }
      })
  })

  await service.initialize()

  await assert.rejects(
    () => service.getConfigSummary(),
    (error) =>
      error instanceof Error &&
      error.message.includes('[REDACTED]') &&
      !error.message.includes('provider-secret') &&
      !error.message.includes('mgmt-secret')
  )
})
