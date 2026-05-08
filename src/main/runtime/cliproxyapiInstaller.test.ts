import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL,
  CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL,
  createAllmoneConfigStore
} from './allmoneConfigStore'
import {
  createCliProxyApiInstaller,
  createNodeFileSystemAdapter,
  selectCliProxyApiReleaseAsset,
  type CliProxyApiArchiveAdapter,
  type CliProxyApiFetchAdapter,
  type CliProxyApiReleaseMetadata
} from './cliproxyapiInstaller'
import { ensureRuntimeHome, resolveRuntimeHome } from './runtimeHome'

const DARWIN_ASSET = 'CLIProxyAPI_6.10.9_darwin_aarch64.tar.gz'
const LINUX_ASSET = 'CLIProxyAPI_6.10.9_linux_amd64.tar.gz'
const WINDOWS_ASSET = 'CLIProxyAPI_6.10.9_windows_amd64.zip'

async function withTempRuntimeHome<T>(
  fn: (homeDir: string) => Promise<T>
): Promise<T> {
  const homeDir = await mkdtemp(join(tmpdir(), 'allmone-installer-'))

  try {
    return await fn(homeDir)
  } finally {
    await rm(homeDir, { recursive: true, force: true })
  }
}

function releaseMetadata(assetNames: string[]): CliProxyApiReleaseMetadata {
  return {
    tag_name: 'v6.10.9',
    html_url: 'https://github.com/router-for-me/CLIProxyAPI/releases/tag/v6.10.9',
    assets: assetNames.map((name) => ({
      name,
      browser_download_url: `https://downloads.example/${name}`
    }))
  }
}

function successfulArchiveAdapter(content: string): CliProxyApiArchiveAdapter {
  return {
    async extractExecutable(input) {
      await writeFile(input.destinationPath, content)
    }
  }
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(buffer).set(bytes)
  return buffer
}

function fetchAdapter(
  responses: Record<string, string | Uint8Array | Error>
): CliProxyApiFetchAdapter {
  return async (url) => {
    const response = responses[url]

    if (response instanceof Error) {
      throw response
    }

    if (response === undefined) {
      return {
        ok: false,
        status: 404,
        text: async () => 'not found',
        arrayBuffer: async () => toArrayBuffer(textBytes('not found'))
      }
    }

    const bytes = typeof response === 'string' ? textBytes(response) : response

    return {
      ok: true,
      status: 200,
      text: async () => new TextDecoder().decode(bytes),
      arrayBuffer: async () => toArrayBuffer(bytes)
    }
  }
}

test('matches darwin, linux, and windows CLIProxyAPI release assets', () => {
  const metadata = releaseMetadata([
    DARWIN_ASSET,
    LINUX_ASSET,
    WINDOWS_ASSET,
    'checksums.txt'
  ])

  const darwin = selectCliProxyApiReleaseAsset(metadata, {
    platform: 'darwin',
    arch: 'arm64'
  })
  const linux = selectCliProxyApiReleaseAsset(metadata, {
    platform: 'linux',
    arch: 'x64'
  })
  const windows = selectCliProxyApiReleaseAsset(metadata, {
    platform: 'win32',
    arch: 'x64'
  })

  assert.equal(darwin.name, DARWIN_ASSET)
  assert.equal(linux.name, LINUX_ASSET)
  assert.equal(windows.name, WINDOWS_ASSET)
})

test('rejects unsupported CLIProxyAPI installer platforms', () => {
  assert.throws(
    () =>
      selectCliProxyApiReleaseAsset(releaseMetadata([LINUX_ASSET]), {
        platform: 'aix',
        arch: 'x64'
      }),
    /Unsupported platform/
  )
})

test('keeps the current executable when manual update checksum verification fails', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const archiveBytes = textBytes('downloaded archive')
    const metadata = releaseMetadata([DARWIN_ASSET, 'checksums.txt'])

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'current executable')

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'darwin',
      arch: 'arm64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: {
        async extractExecutable() {
          throw new Error('archive extraction should not run')
        }
      },
      fetchAdapter: fetchAdapter({
        [CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL]: JSON.stringify(metadata),
        [`https://downloads.example/${DARWIN_ASSET}`]: archiveBytes,
        'https://downloads.example/checksums.txt': `${'0'.repeat(64)}  ${DARWIN_ASSET}\n`
      })
    })

    await assert.rejects(
      () => installer.checkForUpdate(),
      /Checksum mismatch/
    )

    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'current executable'
    )
  })
})

test('uses an existing executable when manual update release metadata cannot be fetched', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'linux' })
    const configStore = createAllmoneConfigStore({ runtimeHome })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'linux',
      arch: 'x64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: successfulArchiveAdapter('updated binary'),
      readExecutableVersion: async () => '6.9.47',
      fetchAdapter: fetchAdapter({
        [CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL]: new Error('rate limited')
      })
    })

    const result = await installer.checkForUpdate()

    assert.equal(result.status, 'existing')
    assert.equal(result.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.match(result.metadataFetchError ?? '', /rate limited/)
    const installMetadata = JSON.parse(
      await readFile(runtimeHome.installMetadataPath, 'utf8')
    )
    assert.equal(installMetadata.version, 'v6.9.47')
    assert.equal(installMetadata.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(typeof installMetadata.check_at, 'number')
    assertNoUnneededInstallMetadataFields(installMetadata)
    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'existing binary'
    )
  })
})

test('uses an existing executable when release metadata fetch times out', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'linux' })
    const configStore = createAllmoneConfigStore({ runtimeHome })

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'linux',
      arch: 'x64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: successfulArchiveAdapter('updated binary'),
      readExecutableVersion: async () => '6.9.47',
      metadataFetchTimeoutMs: 1,
      fetchAdapter: async () => await new Promise(() => {})
    })

    const result = await installer.checkForUpdate()

    assert.equal(result.status, 'existing')
    assert.equal(result.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.match(result.metadataFetchError ?? '', /timed out/i)
    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'existing binary'
    )
  })
})

test('does not fetch release metadata on startup when install metadata has an executable path', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    let metadataFetchCount = 0

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')
    await writeFile(
      runtimeHome.installMetadataPath,
      `${JSON.stringify({
        version: 'v6.10.9',
        executablePath: runtimeHome.cliProxyApiExecutablePath,
        check_at: 1767225600000
      })}\n`
    )

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'darwin',
      arch: 'arm64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: successfulArchiveAdapter('updated binary'),
      fetchAdapter: async () => {
        metadataFetchCount += 1
        throw new Error('startup should not fetch release metadata')
      }
    })

    const result = await installer.ensureInstalled()

    assert.equal(result.status, 'existing')
    assert.equal(result.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(result.version, 'v6.10.9')
    assert.equal(metadataFetchCount, 0)
  })
})

test('does not fetch release metadata on startup when a local executable already exists', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    let metadataFetchCount = 0

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'darwin',
      arch: 'arm64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: successfulArchiveAdapter('updated binary'),
      readExecutableVersion: async () => '6.9.47',
      fetchAdapter: async () => {
        metadataFetchCount += 1
        throw new Error('startup should not fetch release metadata')
      }
    })

    const result = await installer.ensureInstalled()
    const installMetadata = JSON.parse(
      await readFile(runtimeHome.installMetadataPath, 'utf8')
    )

    assert.equal(result.status, 'existing')
    assert.equal(result.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(result.version, 'v6.9.47')
    assert.equal(metadataFetchCount, 0)
    assert.equal(installMetadata.version, 'v6.9.47')
    assert.equal(installMetadata.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'existing binary'
    )
  })
})

test('fetches release metadata on manual update even when install metadata exists', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const metadata = releaseMetadata([DARWIN_ASSET])
    let metadataFetchCount = 0

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')
    await writeFile(
      runtimeHome.installMetadataPath,
      `${JSON.stringify({
        version: 'v6.10.9',
        executablePath: runtimeHome.cliProxyApiExecutablePath,
        check_at: 1767225600000
      })}\n`
    )

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'darwin',
      arch: 'arm64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: {
        async extractExecutable() {
          throw new Error('archive extraction should not run')
        }
      },
      fetchAdapter: async (url) => {
        metadataFetchCount += 1
        return fetchAdapter({
          [CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL]: JSON.stringify(metadata)
        })(url)
      }
    })

    const result = await installer.checkForUpdate()

    assert.equal(result.status, 'up_to_date')
    assert.equal(metadataFetchCount, 1)
  })
})

test('refreshes install metadata for an existing up-to-date executable during manual update', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const metadata = releaseMetadata([DARWIN_ASSET])

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')
    await writeFile(
      runtimeHome.installMetadataPath,
      `${JSON.stringify({
        version: 'v6.10.9',
        executablePath: runtimeHome.cliProxyApiExecutablePath,
        check_at: 1767225600000
      })}\n`
    )

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'darwin',
      arch: 'arm64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: {
        async extractExecutable() {
          throw new Error('archive extraction should not run')
        }
      },
      now: () => new Date('2026-05-08T00:00:00.000Z'),
      fetchAdapter: fetchAdapter({
        [CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL]: JSON.stringify(metadata)
      })
    })

    const result = await installer.checkForUpdate()
    const installMetadata = JSON.parse(
      await readFile(runtimeHome.installMetadataPath, 'utf8')
    )

    assert.equal(result.status, 'up_to_date')
    assert.equal(installMetadata.version, 'v6.10.9')
    assert.equal(installMetadata.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(installMetadata.check_at, 1778198400000)
    assertNoUnneededInstallMetadataFields(installMetadata)
  })
})

test('records local executable metadata on startup when install metadata is missing', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'darwin' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    let metadataFetchCount = 0

    await ensureRuntimeHome(runtimeHome)
    await writeFile(runtimeHome.cliProxyApiExecutablePath, 'existing binary')

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'darwin',
      arch: 'arm64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: successfulArchiveAdapter('updated binary'),
      readExecutableVersion: async () => '6.10.9',
      fetchAdapter: async () => {
        metadataFetchCount += 1
        throw new Error('startup should not fetch release metadata')
      }
    })

    const result = await installer.ensureInstalled()
    const installMetadata = JSON.parse(
      await readFile(runtimeHome.installMetadataPath, 'utf8')
    )

    assert.equal(result.status, 'existing')
    assert.equal(result.version, 'v6.10.9')
    assert.equal(metadataFetchCount, 0)
    assert.equal(installMetadata.version, 'v6.10.9')
    assert.equal(installMetadata.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(typeof installMetadata.check_at, 'number')
    assertNoUnneededInstallMetadataFields(installMetadata)
    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'existing binary'
    )
  })
})

test('writes non-secret install metadata after a successful install', async () => {
  await withTempRuntimeHome(async (homeDir) => {
    const runtimeHome = resolveRuntimeHome({ homeDir, platform: 'win32' })
    const configStore = createAllmoneConfigStore({ runtimeHome })
    const archiveBytes = textBytes('windows archive')
    const metadata = releaseMetadata([WINDOWS_ASSET, 'checksums.txt'])
    const checksum = sha256Hex(archiveBytes)

    const installer = createCliProxyApiInstaller({
      runtimeHome,
      configStore,
      platform: 'win32',
      arch: 'x64',
      fileSystem: createNodeFileSystemAdapter(),
      archiveAdapter: successfulArchiveAdapter('installed executable'),
      fetchAdapter: fetchAdapter({
        [CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL]: JSON.stringify(metadata),
        [`https://downloads.example/${WINDOWS_ASSET}`]: archiveBytes,
        'https://downloads.example/checksums.txt': `${checksum}  ${WINDOWS_ASSET}\n`
      })
    })

    const result = await installer.ensureInstalled()
    const installMetadata = JSON.parse(
      await readFile(runtimeHome.installMetadataPath, 'utf8')
    )

    assert.equal(result.status, 'installed')
    assert.equal(result.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'installed executable'
    )
    assert.equal(installMetadata.version, 'v6.10.9')
    assert.equal(installMetadata.checksumSha256, checksum)
    assert.equal(installMetadata.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.equal(typeof installMetadata.check_at, 'number')
    assertNoUnneededInstallMetadataFields(installMetadata)
    assert(!JSON.stringify(installMetadata).includes('managementKey'))
    assert(!JSON.stringify(installMetadata).includes('api-key'))
    assert(!JSON.stringify(installMetadata).includes('password'))
  })
})

function assertNoUnneededInstallMetadataFields(
  metadata: Record<string, unknown>
): void {
  for (const field of [
    'platform',
    'arch',
    'assetName',
    'sourceType',
    'sourceUrl',
    'releasePageUrl',
    'releaseMetadataUrl',
    'installedAt',
    'installedAtTimestamp',
    'updatedAt',
    'updatedAtTimestamp'
  ]) {
    assert(!(field in metadata), `${field} should not be written`)
  }
}
