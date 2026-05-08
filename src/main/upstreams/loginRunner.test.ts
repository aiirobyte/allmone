import assert from 'node:assert/strict'

import {
  createProviderLoginRunner,
  type ProviderLoginChildProcess,
  type ProviderLoginSpawnAdapter
} from './loginRunner'
import type { UpstreamLoginActionKind } from './types'

function createChild(options: {
  pid?: number
  exitCode?: number
  error?: Error
} = {}): ProviderLoginChildProcess {
  return {
    pid: options.pid ?? 1234,
    once(
      event: 'exit' | 'error',
      listener:
        | ((code: number | null, signal: NodeJS.Signals | null) => void)
        | ((error: Error) => void)
    ) {
      queueMicrotask(() => {
        if (event === 'error' && options.error) {
          ;(listener as (error: Error) => void)(options.error)
        }
        if (event === 'exit' && !options.error) {
          ;(listener as (
            code: number | null,
            signal: NodeJS.Signals | null
          ) => void)(options.exitCode ?? 0, null)
        }
      })
      return this
    }
  }
}

test('constructs CLIProxyAPI login and import commands for every account action', async () => {
  const calls: Array<{ command: string; args: string[]; cwd: string }> = []
  const spawn: ProviderLoginSpawnAdapter = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd })
    return createChild({ pid: calls.length })
  }
  const runner = createProviderLoginRunner({
    executablePath: '/tmp/allmone/cli-proxy-api',
    configPath: '/tmp/allmone/config.yaml',
    runtimeDir: '/tmp/allmone',
    spawn
  })
  const actions: Array<[UpstreamLoginActionKind, string[]]> = [
    ['gemini-cli-login', ['--login']],
    ['antigravity-login', ['--antigravity-login']],
    ['claude-login', ['--claude-login']],
    ['codex-login', ['--codex-login']],
    ['codex-device-login', ['--codex-device-login']],
    ['kimi-login', ['--kimi-login']],
    ['vertex-import', ['--vertex-import', '/tmp/service-account.json']]
  ]

  for (const [kind] of actions) {
    await runner.run({ kind, importPath: kind === 'vertex-import' ? '/tmp/service-account.json' : undefined })
  }

  assert.deepEqual(
    calls.map((call) => call.args),
    actions.map(([, flags]) => ['--config', '/tmp/allmone/config.yaml', ...flags])
  )
  assert(calls.every((call) => call.command === '/tmp/allmone/cli-proxy-api'))
  assert(calls.every((call) => call.cwd === '/tmp/allmone'))
})

test('validates Vertex import path and redacts one-shot failures', async () => {
  const runner = createProviderLoginRunner({
    executablePath: '/tmp/allmone/cli-proxy-api',
    configPath: '/tmp/allmone/config.yaml',
    runtimeDir: '/tmp/allmone',
    spawn: () => createChild({
      error: new Error('failed with api-key: vertex-secret Authorization: Bearer mgmt-secret')
    })
  })

  await assert.rejects(
    () => runner.run({ kind: 'vertex-import' }),
    /Vertex import path is required/
  )
  await assert.rejects(
    () => runner.run({ kind: 'claude-login' }),
    (error) =>
      error instanceof Error &&
      !error.message.includes('vertex-secret') &&
      !error.message.includes('mgmt-secret')
  )
})

test('reports non-zero login exit without stopping any managed process', async () => {
  let killCalled = false
  const runner = createProviderLoginRunner({
    executablePath: '/tmp/allmone/cli-proxy-api',
    configPath: '/tmp/allmone/config.yaml',
    runtimeDir: '/tmp/allmone',
    spawn: () => ({
      ...createChild({ exitCode: 2 }),
      kill() {
        killCalled = true
        return true
      }
    })
  })

  const result = await runner.run({ kind: 'codex-device-login' })

  assert.equal(result.ok, false)
  assert.equal(result.exitCode, 2)
  assert.equal(killCalled, false)
})
