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

test('keeps the current executable when checksum verification fails', async () => {
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
      () => installer.ensureInstalled(),
      /Checksum mismatch/
    )

    assert.equal(
      await readFile(runtimeHome.cliProxyApiExecutablePath, 'utf8'),
      'current executable'
    )
  })
})

test('uses an existing executable when release metadata cannot be fetched', async () => {
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
      fetchAdapter: fetchAdapter({
        [CLI_PROXY_API_DEFAULT_RELEASE_METADATA_URL]: new Error('rate limited')
      })
    })

    const result = await installer.ensureInstalled()

    assert.equal(result.status, 'existing')
    assert.equal(result.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert.match(result.metadataFetchError ?? '', /rate limited/)
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
    assert.equal(installMetadata.assetName, WINDOWS_ASSET)
    assert.equal(
      installMetadata.releasePageUrl,
      CLI_PROXY_API_DEFAULT_RELEASE_PAGE_URL
    )
    assert.equal(installMetadata.checksumSha256, checksum)
    assert.equal(installMetadata.executablePath, runtimeHome.cliProxyApiExecutablePath)
    assert(!JSON.stringify(installMetadata).includes('managementKey'))
    assert(!JSON.stringify(installMetadata).includes('api-key'))
    assert(!JSON.stringify(installMetadata).includes('password'))
  })
})
