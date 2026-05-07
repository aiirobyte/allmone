import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

    assert.equal(loaded.connection.baseUrl, 'http://localhost:8317/v0/management')
    assert.equal(loaded.connection.timeoutMs, 5000)
    assert.equal(loaded.connection.managementKeyConfigured, false)
    assert.equal(loaded.connection.managementKeyPersisted, false)
    assert.equal(loaded.managementKey, undefined)
  })
})

test('saves non-secret settings without writing a plaintext management key', async () => {
  await withTempStore(async (userDataPath) => {
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage()
    })

    const saved = await store.saveConnectionSettings({
      baseUrl: ' http://localhost:9000/v0/management ',
      timeoutMs: 3000,
      managementKey: 'mgmt-super-secret'
    })

    const raw = await readFile(join(userDataPath, 'runtime-settings.json'), 'utf8')
    assert.equal(saved.connection.baseUrl, 'http://localhost:9000/v0/management')
    assert.equal(saved.connection.timeoutMs, 3000)
    assert.equal(saved.connection.managementKeyConfigured, true)
    assert.equal(saved.connection.managementKeyPersisted, true)
    assert.equal(saved.managementKey, 'mgmt-super-secret')
    assert(!raw.includes('mgmt-super-secret'))
    assert(raw.includes('managementKeyEncrypted'))
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
    const raw = await readFile(join(userDataPath, 'runtime-settings.json'), 'utf8')

    assert.equal(saved.connection.managementKeyConfigured, true)
    assert.equal(saved.connection.managementKeyPersisted, false)
    assert.equal(loadedAgain.managementKey, 'session-only-key')
    assert(!raw.includes('session-only-key'))
    assert(!raw.includes('managementKeyEncrypted'))
  })
})

test('reports no available key when decrypting persisted key fails', async () => {
  await withTempStore(async (userDataPath) => {
    await writeFile(
      join(userDataPath, 'runtime-settings.json'),
      JSON.stringify({
        connection: {
          baseUrl: 'http://localhost:8317/v0/management',
          timeoutMs: 5000
        },
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

test('clears a saved management key without losing base settings', async () => {
  await withTempStore(async (userDataPath) => {
    const store = createRuntimeSettingsStore({
      app: createFakeApp(userDataPath),
      safeStorage: createSafeStorage()
    })

    await store.saveConnectionSettings({
      baseUrl: 'http://localhost:9000/v0/management',
      managementKey: 'mgmt-super-secret'
    })
    const cleared = await store.saveConnectionSettings({
      clearManagementKey: true
    })
    const raw = await readFile(join(userDataPath, 'runtime-settings.json'), 'utf8')

    assert.equal(cleared.connection.baseUrl, 'http://localhost:9000/v0/management')
    assert.equal(cleared.connection.managementKeyConfigured, false)
    assert.equal(cleared.connection.managementKeyPersisted, false)
    assert.equal(cleared.managementKey, undefined)
    assert(!raw.includes('managementKeyEncrypted'))
    assert(!raw.includes('mgmt-super-secret'))
  })
})
