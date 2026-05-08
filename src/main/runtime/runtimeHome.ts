import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface RuntimeHomePaths {
  homeDir: string
  rootDir: string
  configPath: string
  runtimeDir: string
  runtimeBinDir: string
  runtimeDownloadsDir: string
  runtimeLogsDir: string
  runtimeTmpDir: string
  runtimeAuthDir: string
  runtimeConfigPath: string
  managementKeyPath: string
  installMetadataPath: string
  cliProxyApiExecutablePath: string
}

export interface RuntimeHomeOptions {
  homeDir?: string
  platform?: NodeJS.Platform
}

export function resolveRuntimeHome(
  options: RuntimeHomeOptions = {}
): RuntimeHomePaths {
  const homeDir = options.homeDir ?? homedir()
  const platform = options.platform ?? process.platform
  const rootDir = join(homeDir, '.allmone')
  const runtimeDir = join(rootDir, 'runtime', 'cli-proxy-api')
  const runtimeBinDir = join(runtimeDir, 'bin')
  const runtimeAuthDir = join(runtimeDir, 'auth')
  const executableName =
    platform === 'win32' ? 'cli-proxy-api.exe' : 'cli-proxy-api'

  return {
    homeDir,
    rootDir,
    configPath: join(rootDir, 'config.yaml'),
    runtimeDir,
    runtimeBinDir,
    runtimeDownloadsDir: join(runtimeDir, 'downloads'),
    runtimeLogsDir: join(runtimeDir, 'logs'),
    runtimeTmpDir: join(runtimeDir, 'tmp'),
    runtimeAuthDir,
    runtimeConfigPath: join(runtimeDir, 'config.yaml'),
    managementKeyPath: join(runtimeDir, 'management-key.json'),
    installMetadataPath: join(runtimeDir, 'install.json'),
    cliProxyApiExecutablePath: join(runtimeBinDir, executableName)
  }
}

export async function ensureRuntimeHome(
  paths: RuntimeHomePaths
): Promise<RuntimeHomePaths> {
  await Promise.all([
    mkdir(paths.runtimeBinDir, { recursive: true }),
    mkdir(paths.runtimeDownloadsDir, { recursive: true }),
    mkdir(paths.runtimeLogsDir, { recursive: true }),
    mkdir(paths.runtimeTmpDir, { recursive: true }),
    mkdir(paths.runtimeAuthDir, { recursive: true })
  ])

  return paths
}
