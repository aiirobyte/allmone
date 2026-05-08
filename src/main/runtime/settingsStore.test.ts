import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  createRuntimeSettingsStore,
  type RuntimeSafeStorageAdapter
} from './settingsStore'

function createFakeApp(userDataPath: string) {
  return {
    getPath(name: 'userData'): string {
      assert.equal(name, 'userData')
      return userDataPath
    }
  }
}

function createSafeStorage(
  available = true,
  options: { failDecrypt?: boolean } = {}
): RuntimeSafeStorageAdapter {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (value) => Buffer.from(`enc:${value}`, 'utf8'),
    decryptString: (value) => {
      if (options.failDecrypt) {
        throw new Error('decrypt failed')
      }

      const text = value.toString('utf8')
      if (!text.startsWith('enc:')) {
        throw new Error('bad ciphertext')
      }

      return text.slice(4)
    }
  }
}

async function withTempStore<T>(
  fn: (userDataPath: string) => Promise<T>
): Promise<T> {
  const path = await mkdtemp(join(tmpdir(), 'allmone-settings-'))

  try {
    return await fn(path)
  } finally {
    await rm(path, { recursive: true, force: true })
  }
}

test('loads default connection settings on first launch', async () => {
  await withTempStore(async (userDataPath) => {
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage()
    })

    const loaded = await store.load()

    assert.equal(loaded.connection.managementKeyConfigured, false)
    assert.equal(loaded.connection.managementKeyPersisted, false)
    assert.equal(loaded.managementKey, undefined)
  })
})

test('saves only the encrypted management key without software settings', async () => {
  await withTempStore(async (userDataPath) => {
    const filePath = join(
      userDataPath,
      '.allmone',
      'runtime',
      'cli-proxy-api',
      'management-key.json'
    )
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage(),
      filePath
    })

    const saved = await store.saveConnectionSettings({
      managementKey: 'mgmt-super-secret'
    })

    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)

    assert.equal(saved.connection.managementKeyConfigured, true)
    assert.equal(saved.connection.managementKeyPersisted, true)
    assert.equal(saved.managementKey, 'mgmt-super-secret')
    assert.deepEqual(Object.keys(parsed), ['managementKeyEncrypted'])
    assert(!raw.includes('mgmt-super-secret'))
    assert(raw.includes('managementKeyEncrypted'))
    assert(!raw.includes('baseUrl'))
    assert(!raw.includes('timeoutMs'))
  })
})

test('deletes old runtime settings files without migration', async () => {
  await withTempStore(async (userDataPath) => {
    const oldUserDataFilePath = join(userDataPath, 'runtime-settings.json')
    const oldManagedFilePath = join(
      userDataPath,
      '.allmone',
      'runtime',
      'runtime-settings.json'
    )
    const oldCliProxyApiManagedFilePath = join(
      userDataPath,
      '.allmone',
      'runtime',
      'cli-proxy-api',
      'runtime-settings.json'
    )
    const filePath = join(
      userDataPath,
      '.allmone',
      'runtime',
      'cli-proxy-api',
      'management-key.json'
    )

    await writeFile(
      oldUserDataFilePath,
      JSON.stringify({
        connection: {
          baseUrl: 'http://localhost:9000/v0/management',
          timeoutMs: 3000
        },
        managementKeyEncrypted: Buffer.from('enc:migrated-management-key')
          .toString('base64')
      })
    )
    await mkdir(join(userDataPath, '.allmone', 'runtime'), { recursive: true })
    await writeFile(
      oldManagedFilePath,
      JSON.stringify({
        managementKeyEncrypted: Buffer.from('enc:old-managed-key').toString(
          'base64'
        )
      })
    )
    await mkdir(join(userDataPath, '.allmone', 'runtime', 'cli-proxy-api'), {
      recursive: true
    })
    await writeFile(
      oldCliProxyApiManagedFilePath,
      JSON.stringify({
        managementKeyEncrypted: Buffer.from('enc:old-cliproxyapi-key').toString(
          'base64'
        )
      })
    )

    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage(),
      filePath,
      oldSettingsFilePaths: [
        oldUserDataFilePath,
        oldManagedFilePath,
        oldCliProxyApiManagedFilePath
      ]
    })

    const loaded = await store.load()

    assert.equal(loaded.connection.managementKeyConfigured, false)
    assert.equal(loaded.connection.managementKeyPersisted, false)
    assert.equal(loaded.managementKey, undefined)
    await assert.rejects(() => readFile(filePath, 'utf8'), /ENOENT/)
    await assert.rejects(() => readFile(oldUserDataFilePath, 'utf8'), /ENOENT/)
    await assert.rejects(() => readFile(oldManagedFilePath, 'utf8'), /ENOENT/)
    await assert.rejects(
      () => readFile(oldCliProxyApiManagedFilePath, 'utf8'),
      /ENOENT/
    )
  })
})

test('keeps management keys in memory when safe storage is unavailable', async () => {
  await withTempStore(async (userDataPath) => {
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage(false)
    })

    const saved = await store.saveConnectionSettings({
      managementKey: 'session-only-key'
    })
    const loadedAgain = await store.load()
    const raw = await readFile(join(userDataPath, 'management-key.json'), 'utf8')

    assert.equal(saved.connection.managementKeyConfigured, true)
    assert.equal(saved.connection.managementKeyPersisted, false)
    assert.equal(loadedAgain.managementKey, 'session-only-key')
    assert(!raw.includes('session-only-key'))
    assert(!raw.includes('managementKeyEncrypted'))
  })
})

test('generates a management key without writing it in plaintext', async () => {
  await withTempStore(async (userDataPath) => {
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage(),
      generateManagementKey: () => 'generated-management-key'
    })

    const generated = await store.ensureManagementKey()
    const loadedAgain = await store.ensureManagementKey()
    const raw = await readFile(join(userDataPath, 'management-key.json'), 'utf8')

    assert.equal(generated.managementKey, 'generated-management-key')
    assert.equal(generated.connection.managementKeyConfigured, true)
    assert.equal(generated.connection.managementKeyPersisted, true)
    assert.equal(loadedAgain.managementKey, 'generated-management-key')
    assert(!raw.includes('generated-management-key'))
    assert(raw.includes('managementKeyEncrypted'))
  })
})

test('reports no available key when decrypting persisted key fails', async () => {
  await withTempStore(async (userDataPath) => {
    await writeFile(
      join(userDataPath, 'management-key.json'),
      JSON.stringify({
        managementKeyEncrypted: Buffer.from('bad').toString('base64')
      })
    )
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage(true, { failDecrypt: true })
    })

    const loaded = await store.load()

    assert.equal(loaded.connection.managementKeyConfigured, false)
    assert.equal(loaded.connection.managementKeyPersisted, false)
    assert.equal(loaded.managementKey, undefined)
  })
})

test('clears a saved management key without writing software settings', async () => {
  await withTempStore(async (userDataPath) => {
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage()
    })

    await store.saveConnectionSettings({
      managementKey: 'mgmt-super-secret'
    })
    const cleared = await store.saveConnectionSettings({
      clearManagementKey: true
    })
    const raw = await readFile(join(userDataPath, 'management-key.json'), 'utf8')

    assert.equal(cleared.connection.managementKeyConfigured, false)
    assert.equal(cleared.connection.managementKeyPersisted, false)
    assert.equal(cleared.managementKey, undefined)
    assert.deepEqual(JSON.parse(raw), {})
    assert(!raw.includes('managementKeyEncrypted'))
    assert(!raw.includes('mgmt-super-secret'))
    assert(!raw.includes('baseUrl'))
    assert(!raw.includes('timeoutMs'))
  })
})
