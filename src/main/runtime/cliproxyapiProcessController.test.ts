import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import type { AllmoneConfigStore } from './allmoneConfigStore'
import type { CliProxyApiConfigWriter } from './cliproxyapiConfigWriter'
import {
  createCliProxyApiProcessController,
  type CliProxyApiChildProcess,
  type CliProxyApiProcessSpawnAdapter
} from './cliproxyapiProcessController'
import type { CliProxyApiInstaller } from './cliproxyapiInstaller'
import { resolveRuntimeHome } from './runtimeHome'

class FakeChildProcess extends EventEmitter implements CliProxyApiChildProcess {
  pid = 1234
  killedWith: NodeJS.Signals | undefined

  kill(signal?: NodeJS.Signals): boolean {
    this.killedWith = signal
    return true
  }
}

function createHarness(options: {
  spawnThrows?: Error
  installerFails?: Error
  updateResult?: {
    status: 'installed' | 'updated' | 'up_to_date' | 'existing'
    version?: string
  }
  managementKey?: string
} = {}) {
  const runtimeHome = resolveRuntimeHome({
    homeDir: '/tmp/allmone-process-home',
    platform: 'darwin'
  })
  const children: FakeChildProcess[] = []
  const spawnCalls: Array<{
    command: string
    args: string[]
    options: {
      cwd: string
      env: Record<string, string | undefined>
      stdio: 'ignore'
    }
  }> = []
  const config = {
    version: 1 as const,
    cliproxyapi: {
      releaseMetadataUrl:
        'https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest',
      releasePageUrl: 'https://github.com/router-for-me/CLIProxyAPI/releases/latest',
      localExecutablePath: runtimeHome.cliProxyApiExecutablePath
    },
    runtime: {
      host: '127.0.0.1',
      port: 8317,
      configPath: runtimeHome.runtimeConfigPath,
      apiBaseUrl: 'http://127.0.0.1:8317/v1',
      managementBaseUrl: 'http://127.0.0.1:8317/v0/management'
    }
  }
  const configStore: AllmoneConfigStore = {
    async load() {
      return config
    },
    async save() {
      return config
    }
  }
  const configWriter: CliProxyApiConfigWriter = {
    async writeManagedConfig() {
      return config
    },
    async saveOutputPort() {
      return config
    }
  }
  const installer: CliProxyApiInstaller = {
    async ensureInstalled() {
      if (options.installerFails) {
        throw options.installerFails
      }

      return {
        status: 'existing',
        executablePath: runtimeHome.cliProxyApiExecutablePath,
        version: 'v6.9.0'
      }
    },
    async checkForUpdate() {
      if (options.installerFails) {
        throw options.installerFails
      }

      return {
        status: options.updateResult?.status ?? 'up_to_date',
        executablePath: runtimeHome.cliProxyApiExecutablePath,
        version: options.updateResult?.version ?? 'v6.9.0'
      }
    }
  }
  const spawn: CliProxyApiProcessSpawnAdapter = (command, args, spawnOptions) => {
    if (options.spawnThrows) {
      throw options.spawnThrows
    }

    spawnCalls.push({
      command,
      args,
      options: spawnOptions
    })
    const child = new FakeChildProcess()
    children.push(child)
    return child
  }
  const controller = createCliProxyApiProcessController({
    runtimeHome,
    configStore,
    configWriter,
    installer,
    spawn,
    getManagementKey: async () => options.managementKey ?? 'mgmt-secret',
    now: () => new Date('2026-05-08T00:00:00.000Z')
  })

  return {
    controller,
    runtimeHome,
    children,
    spawnCalls
  }
}

test('starts the managed CLIProxyAPI binary with config path and management password env', async () => {
  const harness = createHarness()

  const state = await harness.controller.start()

  assert.equal(state.status, 'running')
  assert.equal(state.pid, 1234)
  assert.equal(state.executablePath, harness.runtimeHome.cliProxyApiExecutablePath)
  assert.deepEqual(harness.spawnCalls, [
    {
      command: harness.runtimeHome.cliProxyApiExecutablePath,
      args: ['--config', harness.runtimeHome.runtimeConfigPath],
      options: {
        cwd: harness.runtimeHome.runtimeDir,
        env: {
          ...process.env,
          MANAGEMENT_PASSWORD: 'mgmt-secret'
        },
        stdio: 'ignore'
      }
    }
  ])
  assert(!JSON.stringify(state).includes('mgmt-secret'))
})

test('does not spawn twice when start is called while already running', async () => {
  const harness = createHarness()

  await harness.controller.start()
  const state = await harness.controller.start()

  assert.equal(state.status, 'running')
  assert.equal(harness.spawnCalls.length, 1)
})

test('stop is idempotent when no process is running', async () => {
  const harness = createHarness()

  const state = await harness.controller.stop()

  assert.equal(state.status, 'stopped')
  assert.equal(harness.spawnCalls.length, 0)
})

test('stops a running process and records the exit state', async () => {
  const harness = createHarness()

  await harness.controller.start()
  const stopPromise = harness.controller.stop()
  harness.children[0]?.emit('exit', 0, null)
  const state = await stopPromise

  assert.equal(harness.children[0]?.killedWith, 'SIGTERM')
  assert.equal(state.status, 'stopped')
  assert.equal(state.lastExitCode, 0)
})

test('restart stops the current process before starting a new one', async () => {
  const harness = createHarness()

  await harness.controller.start()
  const restartPromise = harness.controller.restart()
  harness.children[0]?.emit('exit', 0, null)
  const state = await restartPromise

  assert.equal(state.status, 'running')
  assert.equal(harness.spawnCalls.length, 2)
  assert.equal(harness.children[0]?.killedWith, 'SIGTERM')
  assert.equal(harness.children[1]?.pid, state.pid)
})

test('unexpected process exits become redacted crash diagnostics', async () => {
  const harness = createHarness()

  await harness.controller.start()
  harness.children[0]?.emit('exit', 1, 'SIGTERM')
  const state = harness.controller.getState()

  assert.equal(state.status, 'crashed')
  assert.equal(state.lastExitCode, 1)
  assert.equal(state.lastSignal, 'SIGTERM')
})

test('launch failures are redacted and do not throw secrets', async () => {
  const harness = createHarness({
    spawnThrows: new Error('spawn failed with Authorization: Bearer mgmt-secret')
  })

  const state = await harness.controller.start()

  assert.equal(state.status, 'launch_failed')
  assert.equal(state.lastError, 'spawn failed with Authorization: Bearer [REDACTED]')
  assert(!JSON.stringify(state).includes('mgmt-secret'))
})

test('ensureInstalledThenStart installs before launching and records install metadata', async () => {
  const harness = createHarness()

  const state = await harness.controller.ensureInstalledThenStart()

  assert.equal(state.status, 'running')
  assert.equal(state.install?.status, 'existing')
  assert.equal(state.install?.version, 'v6.9.0')
  assert.equal(harness.spawnCalls.length, 1)
})

test('ensureInstalledThenStart records update failures without launching', async () => {
  const harness = createHarness({
    installerFails: new Error('download failed with sk-provider-secret')
  })

  const state = await harness.controller.ensureInstalledThenStart()

  assert.equal(state.status, 'update_failed')
  assert.equal(state.lastError, 'download failed with [REDACTED]')
  assert.equal(harness.spawnCalls.length, 0)
})

test('checkForUpdate records update metadata and restarts a running process after update', async () => {
  const harness = createHarness({
    updateResult: { status: 'updated', version: 'v6.10.0' }
  })

  await harness.controller.start()
  const updatePromise = harness.controller.checkForUpdate()
  harness.children[0]?.emit('exit', 0, null)
  const state = await updatePromise

  assert.equal(state.status, 'running')
  assert.equal(state.install?.status, 'updated')
  assert.equal(state.install?.version, 'v6.10.0')
  assert.equal(harness.spawnCalls.length, 2)
})
