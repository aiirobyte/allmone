import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'

import {
  CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL,
  CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL,
  createAllmoneConfigStore
} from './allmoneConfigStore'
import { ensureRuntimeHome, resolveRuntimeHome } from './runtimeHome'

async function withTempRuntimeHome<T>(
  fn: (homeDir: string) => Promise<T>
): Promise<T> {
  const homeDir = await mkdtemp(join(tmpdir(), 'allmone-config-'))

  try {
    return await fn(homeDir)
  } finally {
    await rm(homeDir, { recursive: true, force: true })
  }
}

function defaultConfigYaml(overrides: string): string {
  return `version: 1
cliproxyapi:
  releaseMetadataUrl: ${CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL}
  releasePageUrl: ${CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL}
  localExecutablePath: ~/.allmone/runtime/bin/cli-proxy-api
runtime:
  host: 127.0.0.1
  port: 8317
  configPath: ~/.allmone/runtime/config.yaml
  apiBaseUrl: http://127.0.0.1:8317/v1
  managementBaseUrl: http://127.0.0.1:8317/v0/management
${overrides}`
}

test('creates default non-secret YAML software config under runtime home', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const store = createAllmoneConfigStore({ runtimeHome })

    const config = await store.load()
    const raw = await readFile(runtimeHome.configPath, 'utf8')
    const parsed = parse(raw)

    assert.equal(config.version, 1)
    assert.equal(
      config.cliproxyapi.releaseMetadataUrl,
      CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL
    )
    assert.equal(
      config.cliproxyapi.releasePageUrl,
      CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL
    )
    assert.equal(config.cliproxyapi.localExecutablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(config.runtime.host, '127.0.0.1')
    assert.equal(config.runtime.port, 8317)
    assert.equal(config.runtime.configPath, runtimeHome.runtimeConfigPath)
    assert.equal(config.runtime.apiBaseUrl, 'http://127.0.0.1:8317/v1')
    assert.equal(
      config.runtime.managementBaseUrl,
      'http://127.0.0.1:8317/v0/management'
    )
    assert.equal(parsed.cliproxyapi.localExecutablePath, '~/.allmone/runtime/bin/cli-proxy-api')
    assert.equal(parsed.runtime.configPath, '~/.allmone/runtime/config.yaml')
    assert(!raw.includes('managementKey'))
    assert(!raw.includes('api-key'))
    assert(!raw.includes('password'))
  })
})

test('normalizes invalid stored ports back to the default port', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(
      runtimeHome.configPath,
      defaultConfigYaml('').replace('port: 8317', 'port: invalid')
    )

    const store = createAllmoneConfigStore({ runtimeHome })
    const config = await store.load()
    const parsed = parse(await readFile(runtimeHome.configPath, 'utf8'))

    assert.equal(config.runtime.port, 8317)
    assert.equal(config.runtime.apiBaseUrl, 'http://127.0.0.1:8317/v1')
    assert.equal(parsed.runtime.port, 8317)
  })
})

test('rejects configured executable paths outside the managed runtime bin', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(
      runtimeHome.configPath,
      defaultConfigYaml('').replace(
        'localExecutablePath: ~/.allmone/runtime/bin/cli-proxy-api',
        'localExecutablePath: /tmp/cli-proxy-api'
      )
    )

    const store = createAllmoneConfigStore({ runtimeHome })

    await assert.rejects(() => store.load(), /localExecutablePath/)
  })
})

test('rejects invalid release metadata URLs', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(
      runtimeHome.configPath,
      defaultConfigYaml('').replace(
        CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL,
        'not-a-url'
      )
    )

    const store = createAllmoneConfigStore({ runtimeHome })

    await assert.rejects(() => store.load(), /releaseMetadataUrl/)
  })
})

test('uses old userData runtime settings as a first-run fallback without deleting them', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const legacyDir = join(homeDir, 'legacy-user-data')
    const legacySettingsFilePath = join(legacyDir, 'runtime-settings.json')

    await mkdir(legacyDir, { recursive: true })
    await writeFile(
      legacySettingsFilePath,
      JSON.stringify(
        {
          connection: {
            baseUrl: 'http://127.0.0.1:9001/v0/management',
            timeoutMs: 5000
          },
          managementKeyEncrypted: 'encrypted-secret'
        },
        null,
        2
      )
    )

    const store = createAllmoneConfigStore({
      runtimeHome,
      legacySettingsFilePath
    })
    const config = await store.load()
    const raw = await readFile(runtimeHome.configPath, 'utf8')
    const legacyRaw = await readFile(legacySettingsFilePath, 'utf8')

    assert.equal(config.runtime.host, '127.0.0.1')
    assert.equal(config.runtime.port, 9001)
    assert.equal(config.runtime.apiBaseUrl, 'http://127.0.0.1:9001/v1')
    assert.equal(
      config.runtime.managementBaseUrl,
      'http://127.0.0.1:9001/v0/management'
    )
    assert(!raw.includes('encrypted-secret'))
    assert(legacyRaw.includes('encrypted-secret'))
  })
})
