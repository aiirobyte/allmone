import assert from 'node:assert/strict'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ensureRuntimeHome, resolveRuntimeHome } from './runtimeHome'

async function withTempHome<T>(fn: (homeDir: string) => Promise<T>): Promise<T> {
  const homeDir = await mkdtemp(join(tmpdir(), 'allmone-home-'))

  try {
    return await fn(homeDir)
  } finally {
    await rm(homeDir, { recursive: true, force: true })
  }
}

test('resolves all managed runtime paths from the user home directory', () => {
  const homeDir = join(tmpdir(), 'allmone-runtime-paths')
  const paths = resolveRuntimeHome({ homeDir, platform: 'darwin' })

  assert.equal(paths.rootDir, join(homeDir, '.allmone'))
  assert.equal(paths.configPath, join(homeDir, '.allmone', 'config.yaml'))
  assert.equal(
    paths.runtimeDir,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api')
  )
  assert.equal(
    paths.runtimeBinDir,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'bin')
  )
  assert.equal(
    paths.runtimeDownloadsDir,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'downloads')
  )
  assert.equal(
    paths.runtimeLogsDir,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'logs')
  )
  assert.equal(
    paths.runtimeTmpDir,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'tmp')
  )
  assert.equal(
    paths.runtimeAuthDir,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'auth')
  )
  assert.equal(
    paths.runtimeConfigPath,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'config.yaml')
  )
  assert.equal(
    paths.managementKeyPath,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'management-key.json')
  )
  assert.equal(
    paths.installMetadataPath,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'install.json')
  )
  assert.equal(
    paths.cliProxyApiExecutablePath,
    join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'bin', 'cli-proxy-api')
  )
})

test('creates the runtime home directory tree', async () => {
  await withTempHome(async (homeDir) => {
    const paths = resolveRuntimeHome({ homeDir, platform: 'win32' })

    await ensureRuntimeHome(paths)

    for (const path of [
      paths.rootDir,
      paths.runtimeDir,
      paths.runtimeBinDir,
      paths.runtimeDownloadsDir,
      paths.runtimeLogsDir,
      paths.runtimeTmpDir,
      paths.runtimeAuthDir
    ]) {
      await access(path)
    }

    assert.equal(
      paths.cliProxyApiExecutablePath,
      join(homeDir, '.allmone', 'runtime', 'cli-proxy-api', 'bin', 'cli-proxy-api.exe')
    )
  })
})
