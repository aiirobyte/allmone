import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'

import {
  CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL,
  CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL,
  createAllmoneConfigStore,
  type AllmoneConfigSafeStorageAdapter
} from './allmoneConfigStore'
import { ensureRuntimeHome, resolveRuntimeHome } from './runtimeHome'

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
  localExecutablePath: ~/.allmone/runtime/cli-proxy-api/bin/cli-proxy-api
  runtime:
    host: 127.0.0.1
    port: 8317
    timeoutMs: 5000
    configPath: ~/.allmone/runtime/cli-proxy-api/config.yaml
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
    assert.equal(config.runtime.timeoutMs, 5000)
    assert.equal(config.runtime.configPath, runtimeHome.runtimeConfigPath)
    assert.equal(config.runtime.serviceOrigin, 'http://127.0.0.1:8317')
    assert.equal(config.runtime.apiBaseUrl, 'http://127.0.0.1:8317/v1')
    assert.equal(
      config.runtime.managementBaseUrl,
      'http://127.0.0.1:8317/v0/management'
    )
    assert.equal(parsed.cliproxyapi.localExecutablePath, '~/.allmone/runtime/cli-proxy-api/bin/cli-proxy-api')
    assert.equal(parsed.cliproxyapi.runtime.timeoutMs, 5000)
    assert.equal(parsed.cliproxyapi.runtime.configPath, '~/.allmone/runtime/cli-proxy-api/config.yaml')
    assert(!('runtime' in parsed))
    assert(!('serviceOrigin' in parsed.cliproxyapi.runtime))
    assert(!('apiBaseUrl' in parsed.cliproxyapi.runtime))
    assert(!('managementBaseUrl' in parsed.cliproxyapi.runtime))
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
    assert.equal(config.runtime.serviceOrigin, 'http://127.0.0.1:8317')
    assert.equal(config.runtime.apiBaseUrl, 'http://127.0.0.1:8317/v1')
    assert(!('serviceOrigin' in parsed.cliproxyapi.runtime))
    assert(!('apiBaseUrl' in parsed.cliproxyapi.runtime))
    assert(!('managementBaseUrl' in parsed.cliproxyapi.runtime))
    assert.equal(parsed.cliproxyapi.runtime.port, 8317)
  })
})

test('normalizes invalid stored runtime timeouts back to the default timeout', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(
      runtimeHome.configPath,
      defaultConfigYaml('').replace('timeoutMs: 5000', 'timeoutMs: invalid')
    )

    const store = createAllmoneConfigStore({ runtimeHome })
    const config = await store.load()
    const parsed = parse(await readFile(runtimeHome.configPath, 'utf8'))

    assert.equal(config.runtime.timeoutMs, 5000)
    assert.equal(parsed.cliproxyapi.runtime.timeoutMs, 5000)
  })
})

test('rejects configured executable paths outside the managed runtime bin', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(
      runtimeHome.configPath,
      defaultConfigYaml('').replace(
        'localExecutablePath: ~/.allmone/runtime/cli-proxy-api/bin/cli-proxy-api',
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

test('keeps software config secret-free when old userData runtime settings exist', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const oldUserDataDir = join(homeDir, 'old-user-data')
    const oldSettingsFilePath = join(oldUserDataDir, 'runtime-settings.json')

    await mkdir(oldUserDataDir, { recursive: true })
    await writeFile(
      oldSettingsFilePath,
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

    const store = createAllmoneConfigStore({ runtimeHome })
    const config = await store.load()
    const raw = await readFile(runtimeHome.configPath, 'utf8')

    assert.equal(config.runtime.host, '127.0.0.1')
    assert.equal(config.runtime.port, 8317)
    assert.equal(config.runtime.timeoutMs, 5000)
    assert.equal(config.runtime.serviceOrigin, 'http://127.0.0.1:8317')
    assert.equal(config.runtime.apiBaseUrl, 'http://127.0.0.1:8317/v1')
    assert.equal(
      config.runtime.managementBaseUrl,
      'http://127.0.0.1:8317/v0/management'
    )
    assert(!raw.includes('encrypted-secret'))
    assert.deepEqual(JSON.parse(await readFile(oldSettingsFilePath, 'utf8')), {
      connection: {
        baseUrl: 'http://127.0.0.1:9001/v0/management',
        timeoutMs: 5000
      },
      managementKeyEncrypted: 'encrypted-secret'
    })
  })
})

test('persists encrypted local output key records without plaintext values', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const store = createAllmoneConfigStore({
      runtimeHome,
      safeStorage: createSafeStorage()
    })

    const encrypted = store.encryptLocalOutputKeyValue('ak-allmone-secret')
    await store.save({
      localOutputKeys: [
        {
          id: 'lok_default',
          name: 'Default local key',
          preview: 'ak-a...[REDACTED]...cret',
          valueEncrypted: encrypted,
          isDefault: true
        }
      ]
    })

    const loaded = await store.load()
    const raw = await readFile(runtimeHome.configPath, 'utf8')
    const parsed = parse(raw)

    assert.deepEqual(loaded.localOutputKeys, [
      {
        id: 'lok_default',
        name: 'Default local key',
        preview: 'ak-a...[REDACTED]...cret',
        valueEncrypted: encrypted,
        isDefault: true
      }
    ])
    assert.equal(
      store.decryptLocalOutputKeyValue(loaded.localOutputKeys[0].valueEncrypted),
      'ak-allmone-secret'
    )
    assert.equal(parsed.localOutputKeys[0].id, 'lok_default')
    assert.equal(parsed.localOutputKeys[0].isDefault, true)
    assert(!raw.includes('ak-allmone-secret'))
    assert(raw.includes('valueEncrypted'))
  })
})

test('persists non-secret Provider id sidecar records', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const store = createAllmoneConfigStore({ runtimeHome })

    await store.save({
      providerIds: [
        {
          providerKind: 'gemini-api-key',
          entryIndex: 0,
          providerId: 'gemini_work'
        },
        {
          providerKind: 'openai-compatibility',
          entryIndex: 1,
          providerId: 'openrouter_work'
        }
      ]
    })

    const loaded = await store.load()
    const raw = await readFile(runtimeHome.configPath, 'utf8')
    const parsed = parse(raw)

    assert.deepEqual(loaded.providerIds, [
      {
        providerKind: 'gemini-api-key',
        entryIndex: 0,
        providerId: 'gemini_work'
      },
      {
        providerKind: 'openai-compatibility',
        entryIndex: 1,
        providerId: 'openrouter_work'
      }
    ])
    assert.deepEqual(parsed.providerIds, loaded.providerIds)
    assert(!raw.includes('api-key:'))
    assert(!raw.includes('secret'))
  })
})
