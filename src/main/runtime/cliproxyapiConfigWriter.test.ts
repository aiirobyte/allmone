import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'

import { createAllmoneConfigStore } from './allmoneConfigStore'
import { createCliProxyApiConfigWriter } from './cliproxyapiConfigWriter'
import { ensureRuntimeHome, resolveRuntimeHome } from './runtimeHome'

async function withTempRuntimeHome<T>(
  fn: (homeDir: string) => Promise<T>
): Promise<T> {
  const homeDir = await mkdtemp(join(tmpdir(), 'allmone-managed-config-'))

  try {
    return await fn(homeDir)
  } finally {
    await rm(homeDir, { recursive: true, force: true })
  }
}

function existingCliProxyApiConfig(): string {
  return `host: 0.0.0.0
port: 9000
remote-management:
  allow-remote: true
  secret-key: existing-secret
openai-compatibility:
  - name: openrouter
    base-url: https://openrouter.ai/api/v1
    api-key-entries:
      - api-key: sk-provider-secret
payload:
  default:
    - models:
        - name: gpt-*
      params:
        reasoning.effort: high
unknown-section:
  keep: true
`
}

test('patches only allmone-owned CLIProxyAPI runtime fields', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const writer = createCliProxyApiConfigWriter({
      runtimeHome,
      configStore
    })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.runtimeConfigPath, existingCliProxyApiConfig())

    await writer.writeManagedConfig()

    const parsed = parse(await readFile(runtimeHome.runtimeConfigPath, 'utf8'))

    assert.equal(parsed.host, '127.0.0.1')
    assert.equal(parsed.port, 8317)
    assert.equal(parsed['auth-dir'], '~/.allmone/runtime/auth')
    assert.equal(parsed['logging-to-file'], true)
    assert.equal(parsed['remote-management']['allow-remote'], false)
    assert.equal(parsed['remote-management']['secret-key'], 'existing-secret')
    assert.equal(parsed['openai-compatibility'][0].name, 'openrouter')
    assert.equal(
      parsed['openai-compatibility'][0]['api-key-entries'][0]['api-key'],
      'sk-provider-secret'
    )
    assert.equal(parsed.payload.default[0].params['reasoning.effort'], 'high')
    assert.equal(parsed['unknown-section'].keep, true)
  })
})

test('saving the output port updates software config and CLIProxyAPI config', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'linux' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const writer = createCliProxyApiConfigWriter({
      runtimeHome,
      configStore
    })

    await writer.saveOutputPort(9444)

    const allmoneConfig = parse(await readFile(runtimeHome.configPath, 'utf8'))
    const cliProxyApiConfig = parse(
      await readFile(runtimeHome.runtimeConfigPath, 'utf8')
    )

    assert.equal(allmoneConfig.runtime.port, 9444)
    assert.equal(allmoneConfig.runtime.apiBaseUrl, 'http://127.0.0.1:9444/v1')
    assert.equal(
      allmoneConfig.runtime.managementBaseUrl,
      'http://127.0.0.1:9444/v0/management'
    )
    assert.equal(cliProxyApiConfig.port, 9444)
    assert.equal(cliProxyApiConfig.host, '127.0.0.1')
  })
})

test('invalid output ports do not write managed config files', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const writer = createCliProxyApiConfigWriter({
      runtimeHome,
      configStore
    })

    await writer.writeManagedConfig()

    const beforeAllmoneConfig = await readFile(runtimeHome.configPath, 'utf8')
    const beforeCliProxyApiConfig = await readFile(
      runtimeHome.runtimeConfigPath,
      'utf8'
    )

    await assert.rejects(() => writer.saveOutputPort(70_000), /Invalid port/)

    assert.equal(await readFile(runtimeHome.configPath, 'utf8'), beforeAllmoneConfig)
    assert.equal(
      await readFile(runtimeHome.runtimeConfigPath, 'utf8'),
      beforeCliProxyApiConfig
    )
  })
})
