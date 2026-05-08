import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path'
import { promisify } from 'node:util'

import type {
  AllmoneConfigStore,
  AllmoneSoftwareConfig
} from './allmoneConfigStore'
import { ensureRuntimeHome, type RuntimeHomePaths } from './runtimeHome'

const execFileAsync = promisify(execFile)

export interface CliProxyApiReleaseAsset {
  name: string
  browser_download_url: string
}

export interface CliProxyApiReleaseMetadata {
  tag_name: string
  html_url?: string
  assets: CliProxyApiReleaseAsset[]
}

export interface CliProxyApiSelectedReleaseAsset extends CliProxyApiReleaseAsset {
  archiveFormat: 'tar.gz' | 'zip'
}

export interface CliProxyApiFetchResponse {
  ok: boolean
  status: number
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

export type CliProxyApiFetchAdapter = (
  url: string
) => Promise<CliProxyApiFetchResponse>

export interface CliProxyApiArchiveExtractionInput {
  archivePath: string
  destinationPath: string
  destinationDir: string
  executableName: string
  format: 'tar.gz' | 'zip'
}

export interface CliProxyApiArchiveAdapter {
  extractExecutable(input: CliProxyApiArchiveExtractionInput): Promise<void>
}

export interface CliProxyApiFileSystemAdapter {
  exists(path: string): Promise<boolean>
  mkdir(path: string): Promise<void>
  readText(path: string): Promise<string>
  writeText(path: string, contents: string): Promise<void>
  writeBytes(path: string, contents: Uint8Array): Promise<void>
  remove(path: string): Promise<void>
  replaceFile(targetPath: string, replacementPath: string): Promise<void>
  chmod(path: string, mode: number): Promise<void>
}

export interface CliProxyApiInstallerOptions {
  runtimeHome: RuntimeHomePaths
  configStore: AllmoneConfigStore
  platform?: string
  arch?: string
  fetchAdapter?: CliProxyApiFetchAdapter
  metadataFetchTimeoutMs?: number
  fileSystem?: CliProxyApiFileSystemAdapter
  archiveAdapter?: CliProxyApiArchiveAdapter
  readExecutableVersion?: (executablePath: string) => Promise<string | undefined>
  now?: () => Date
}

export interface CliProxyApiInstallMetadata {
  version: string
  executablePath: string
  checksumSha256?: string
  check_at: number
}

export type CliProxyApiInstallStatus =
  | 'installed'
  | 'updated'
  | 'up_to_date'
  | 'existing'

export interface CliProxyApiInstallResult {
  status: CliProxyApiInstallStatus
  executablePath: string
  version?: string
  assetName?: string
  releasePageUrl?: string
  checksumSha256?: string
  metadataFetchError?: string
}

export interface CliProxyApiInstaller {
  ensureInstalled(): Promise<CliProxyApiInstallResult>
  checkForUpdate(): Promise<CliProxyApiInstallResult>
}

export function createCliProxyApiInstaller(
  options: CliProxyApiInstallerOptions
): CliProxyApiInstaller {
  return new DefaultCliProxyApiInstaller(options)
}

export function selectCliProxyApiReleaseAsset(
  metadata: CliProxyApiReleaseMetadata,
  target: { platform: string; arch: string } = {
    platform: process.platform,
    arch: process.arch
  }
): CliProxyApiSelectedReleaseAsset {
  const platform = toGoReleaserPlatform(target.platform)
  const arch = toGoReleaserArch(target.arch)
  const archiveFormat = platform === 'windows' ? 'zip' : 'tar.gz'
  const expectedSuffix =
    archiveFormat === 'zip'
      ? `_${platform}_${arch}.zip`
      : `_${platform}_${arch}.tar.gz`
  const asset = metadata.assets.find((candidate) => {
    const name = candidate.name.toLowerCase()

    return (
      !name.includes('checksum') &&
      name.endsWith(expectedSuffix.toLowerCase())
    )
  })

  if (!asset) {
    throw new Error(
      `No CLIProxyAPI release asset for ${target.platform}/${target.arch}`
    )
  }

  return {
    ...asset,
    archiveFormat
  }
}

export function createNodeFileSystemAdapter(): CliProxyApiFileSystemAdapter {
  return {
    async exists(path) {
      try {
        await stat(path)
        return true
      } catch (error) {
        if (isMissingFileError(error)) {
          return false
        }

        throw error
      }
    },
    async mkdir(path) {
      await mkdir(path, { recursive: true })
    },
    async readText(path) {
      return await readFile(path, 'utf8')
    },
    async writeText(path, contents) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, contents)
    },
    async writeBytes(path, contents) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, contents)
    },
    async remove(path) {
      await rm(path, { recursive: true, force: true })
    },
    async replaceFile(targetPath, replacementPath) {
      await replaceFile(targetPath, replacementPath)
    },
    async chmod(path, mode) {
      await chmod(path, mode)
    }
  }
}

export function createNodeArchiveAdapter(): CliProxyApiArchiveAdapter {
  return {
    async extractExecutable(input) {
      const extractDir = join(
        input.destinationDir,
        `extract-${Date.now()}-${randomUUID()}`
      )

      await mkdir(extractDir, { recursive: true })

      try {
        if (input.format === 'tar.gz') {
          await execFileAsync('tar', ['-xzf', input.archivePath, '-C', extractDir])
        } else if (process.platform === 'win32') {
          await execFileAsync('powershell', [
            '-NoProfile',
            '-Command',
            'Expand-Archive',
            '-LiteralPath',
            input.archivePath,
            '-DestinationPath',
            extractDir,
            '-Force'
          ])
        } else {
          await execFileAsync('unzip', ['-q', input.archivePath, '-d', extractDir])
        }

        const extractedExecutable = await findFileByName(
          extractDir,
          input.executableName
        )

        if (!extractedExecutable) {
          throw new Error(`CLIProxyAPI executable not found in ${input.archivePath}`)
        }

        await copyFile(extractedExecutable, input.destinationPath)
      } finally {
        await rm(extractDir, { recursive: true, force: true })
      }
    }
  }
}

class DefaultCliProxyApiInstaller implements CliProxyApiInstaller {
  private readonly runtimeHome: RuntimeHomePaths
  private readonly configStore: AllmoneConfigStore
  private readonly platform: string
  private readonly arch: string
  private readonly fetchAdapter: CliProxyApiFetchAdapter
  private readonly metadataFetchTimeoutMs: number
  private readonly fileSystem: CliProxyApiFileSystemAdapter
  private readonly archiveAdapter: CliProxyApiArchiveAdapter
  private readonly readExecutableVersion: (
    executablePath: string
  ) => Promise<string | undefined>
  private readonly now: () => Date

  constructor(options: CliProxyApiInstallerOptions) {
    this.runtimeHome = options.runtimeHome
    this.configStore = options.configStore
    this.platform = options.platform ?? process.platform
    this.arch = options.arch ?? process.arch
    this.fetchAdapter = options.fetchAdapter ?? defaultFetchAdapter
    this.metadataFetchTimeoutMs = options.metadataFetchTimeoutMs ?? 15_000
    this.fileSystem = options.fileSystem ?? createNodeFileSystemAdapter()
    this.archiveAdapter = options.archiveAdapter ?? createNodeArchiveAdapter()
    this.readExecutableVersion =
      options.readExecutableVersion ?? defaultReadExecutableVersion
    this.now = options.now ?? (() => new Date())
  }

  async ensureInstalled(): Promise<CliProxyApiInstallResult> {
    return await this.ensureInstalledInternal({ checkForUpdate: false })
  }

  async checkForUpdate(): Promise<CliProxyApiInstallResult> {
    return await this.ensureInstalledInternal({ checkForUpdate: true })
  }

  private async ensureInstalledInternal(options: {
    checkForUpdate: boolean
  }): Promise<CliProxyApiInstallResult> {
    await ensureRuntimeHome(this.runtimeHome)

    const config = await this.configStore.load()
    const executablePath = validateManagedExecutablePath(
      config.cliproxyapi.localExecutablePath,
      this.runtimeHome
    )
    const executableExists = await this.fileSystem.exists(executablePath)
    const installMetadata = await this.readInstallMetadata()

    if (!options.checkForUpdate && executableExists) {
      const metadata =
        installMetadata?.executablePath === executablePath
          ? installMetadata
          : await this.writeLocalExecutableMetadata({ executablePath })

      return {
        status: 'existing',
        executablePath,
        version: metadata.version,
        checksumSha256: metadata.checksumSha256
      }
    }

    let metadata: CliProxyApiReleaseMetadata

    try {
      metadata = await this.fetchReleaseMetadata(
        config.cliproxyapi.releaseMetadataUrl
      )
    } catch (error) {
      if (executableExists) {
        const installMetadata = await this.writeLocalExecutableMetadata({
          executablePath
        })

        return {
          status: 'existing',
          executablePath,
          version: installMetadata.version,
          checksumSha256: installMetadata.checksumSha256,
          metadataFetchError: toErrorMessage(error)
        }
      }

      throw error
    }

    const asset = selectCliProxyApiReleaseAsset(metadata, {
      platform: this.platform,
      arch: this.arch
    })

    if (!installMetadata && executableExists) {
      const executableVersion = await this.readExecutableVersion(executablePath)

      if (isSameVersion(executableVersion, metadata.tag_name)) {
        const adoptedMetadata = await this.writeInstallMetadata({
          config,
          metadata,
          asset,
          executablePath,
          checksumSha256: undefined
        })

        return {
          status: 'up_to_date',
          executablePath,
          version: adoptedMetadata.version,
          assetName: asset.name,
          releasePageUrl: config.cliproxyapi.releasePageUrl,
          checksumSha256: adoptedMetadata.checksumSha256
        }
      }
    }

    if (
      executableExists &&
      installMetadata?.version === metadata.tag_name
    ) {
      const refreshedMetadata = await this.writeInstallMetadata({
        config,
        metadata,
        asset,
        executablePath,
        checksumSha256: installMetadata.checksumSha256
      })

      return {
        status: 'up_to_date',
        executablePath,
        version: refreshedMetadata.version,
        assetName: asset.name,
        releasePageUrl: config.cliproxyapi.releasePageUrl,
        checksumSha256: refreshedMetadata.checksumSha256
      }
    }

    return await this.installRelease({
      config,
      metadata,
      asset,
      executablePath,
      status: executableExists ? 'updated' : 'installed'
    })
  }

  private async fetchReleaseMetadata(
    releaseMetadataUrl: string
  ): Promise<CliProxyApiReleaseMetadata> {
    const response = await withTimeout(
      this.fetchAdapter(releaseMetadataUrl),
      this.metadataFetchTimeoutMs,
      'CLIProxyAPI release metadata fetch timed out'
    )

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CLIProxyAPI release metadata: HTTP ${response.status}`
      )
    }

    return parseReleaseMetadata(await response.text())
  }

  private async installRelease(input: {
    config: AllmoneSoftwareConfig
    metadata: CliProxyApiReleaseMetadata
    asset: CliProxyApiSelectedReleaseAsset
    executablePath: string
    status: 'installed' | 'updated'
  }): Promise<CliProxyApiInstallResult> {
    const archivePath = join(
      this.runtimeHome.runtimeDownloadsDir,
      `${input.asset.name}.${Date.now()}.download`
    )
    const stagedExecutablePath = join(
      this.runtimeHome.runtimeTmpDir,
      `${basename(input.executablePath)}.${Date.now()}.staged`
    )

    try {
      const archiveBytes = await this.downloadBytes(
        input.asset.browser_download_url
      )
      const checksumSha256 = await this.verifyChecksumIfAvailable(
        input.metadata,
        input.asset,
        archiveBytes
      )

      await this.fileSystem.writeBytes(archivePath, archiveBytes)
      await this.archiveAdapter.extractExecutable({
        archivePath,
        destinationPath: stagedExecutablePath,
        destinationDir: this.runtimeHome.runtimeTmpDir,
        executableName: basename(input.executablePath),
        format: input.asset.archiveFormat
      })

      if (this.platform !== 'win32') {
        await this.fileSystem.chmod(stagedExecutablePath, 0o755)
      }

      await this.fileSystem.replaceFile(input.executablePath, stagedExecutablePath)

      const installMetadata = await this.writeInstallMetadata({
        config: input.config,
        metadata: input.metadata,
        asset: input.asset,
        executablePath: input.executablePath,
        checksumSha256
      })

      return {
        status: input.status,
        executablePath: input.executablePath,
        version: installMetadata.version,
        assetName: input.asset.name,
        releasePageUrl: input.config.cliproxyapi.releasePageUrl,
        checksumSha256
      }
    } finally {
      await Promise.all([
        this.fileSystem.remove(archivePath),
        this.fileSystem.remove(stagedExecutablePath)
      ])
    }
  }

  private async downloadBytes(url: string): Promise<Uint8Array> {
    const response = await withTimeout(
      this.fetchAdapter(url),
      this.metadataFetchTimeoutMs,
      'CLIProxyAPI release asset download timed out'
    )

    if (!response.ok) {
      throw new Error(`Failed to download CLIProxyAPI release asset: HTTP ${response.status}`)
    }

    return new Uint8Array(await response.arrayBuffer())
  }

  private async verifyChecksumIfAvailable(
    metadata: CliProxyApiReleaseMetadata,
    asset: CliProxyApiReleaseAsset,
    archiveBytes: Uint8Array
  ): Promise<string | undefined> {
    const checksumAsset = findChecksumAsset(metadata)

    if (!checksumAsset) {
      return undefined
    }

    const response = await withTimeout(
      this.fetchAdapter(checksumAsset.browser_download_url),
      this.metadataFetchTimeoutMs,
      'CLIProxyAPI checksum download timed out'
    )

    if (!response.ok) {
      throw new Error(`Failed to download CLIProxyAPI checksums: HTTP ${response.status}`)
    }

    const expectedChecksum = parseChecksum(await response.text(), asset.name)
    const actualChecksum = sha256Hex(archiveBytes)

    if (expectedChecksum !== actualChecksum) {
      throw new Error(`Checksum mismatch for ${asset.name}`)
    }

    return actualChecksum
  }

  private async readInstallMetadata(): Promise<CliProxyApiInstallMetadata | undefined> {
    try {
      const parsed = JSON.parse(
        await this.fileSystem.readText(this.runtimeHome.installMetadataPath)
      )

      if (
        typeof parsed.version === 'string' &&
        typeof parsed.executablePath === 'string'
      ) {
        return parsed as CliProxyApiInstallMetadata
      }

      return undefined
    } catch (error) {
      if (isMissingFileError(error) || error instanceof SyntaxError) {
        return undefined
      }

      throw error
    }
  }

  private async writeInstallMetadata(input: {
    config: AllmoneSoftwareConfig
    metadata: CliProxyApiReleaseMetadata
    asset: CliProxyApiSelectedReleaseAsset
    executablePath: string
    checksumSha256?: string
  }): Promise<CliProxyApiInstallMetadata> {
    const installMetadata: CliProxyApiInstallMetadata = {
      version: input.metadata.tag_name,
      executablePath: input.executablePath,
      checksumSha256: input.checksumSha256,
      check_at: this.now().getTime()
    }

    await this.fileSystem.writeText(
      this.runtimeHome.installMetadataPath,
      `${JSON.stringify(installMetadata, null, 2)}\n`
    )

    return installMetadata
  }

  private async writeLocalExecutableMetadata(input: {
    executablePath: string
  }): Promise<CliProxyApiInstallMetadata> {
    const executableVersion = await this.readExecutableVersion(input.executablePath)
    const installMetadata: CliProxyApiInstallMetadata = {
      version: executableVersion ? `v${normalizeVersion(executableVersion)}` : 'unknown',
      executablePath: input.executablePath,
      check_at: this.now().getTime()
    }

    await this.fileSystem.writeText(
      this.runtimeHome.installMetadataPath,
      `${JSON.stringify(installMetadata, null, 2)}\n`
    )

    return installMetadata
  }

}

function parseReleaseMetadata(raw: string): CliProxyApiReleaseMetadata {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid CLIProxyAPI release metadata JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid CLIProxyAPI release metadata')
  }

  const record = parsed as Record<string, unknown>

  if (typeof record.tag_name !== 'string' || !record.tag_name.trim()) {
    throw new Error('Invalid CLIProxyAPI release tag')
  }

  if (!Array.isArray(record.assets)) {
    throw new Error('Invalid CLIProxyAPI release assets')
  }

  return {
    tag_name: record.tag_name,
    html_url: typeof record.html_url === 'string' ? record.html_url : undefined,
    assets: record.assets.map(parseReleaseAsset)
  }
}

function parseReleaseAsset(value: unknown): CliProxyApiReleaseAsset {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid CLIProxyAPI release asset')
  }

  const record = value as Record<string, unknown>

  if (
    typeof record.name !== 'string' ||
    !record.name.trim() ||
    typeof record.browser_download_url !== 'string' ||
    !record.browser_download_url.trim()
  ) {
    throw new Error('Invalid CLIProxyAPI release asset')
  }

  return {
    name: record.name,
    browser_download_url: record.browser_download_url
  }
}

function toGoReleaserPlatform(platform: string): string {
  if (platform === 'darwin' || platform === 'linux') {
    return platform
  }

  if (platform === 'win32') {
    return 'windows'
  }

  throw new Error(`Unsupported platform: ${platform}`)
}

function toGoReleaserArch(arch: string): string {
  if (arch === 'x64' || arch === 'amd64') {
    return 'amd64'
  }

  if (arch === 'arm64') {
    return 'aarch64'
  }

  throw new Error(`Unsupported architecture: ${arch}`)
}

function findChecksumAsset(
  metadata: CliProxyApiReleaseMetadata
): CliProxyApiReleaseAsset | undefined {
  return metadata.assets.find((asset) => {
    const name = asset.name.toLowerCase()

    return name === 'checksums.txt' || name.endsWith('_checksums.txt')
  })
}

function parseChecksum(text: string, assetName: string): string {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    const [hash, ...filenameParts] = trimmed.split(/\s+/)
    const filename = filenameParts.join(' ').replace(/^\*/, '')

    if (
      /^[a-f0-9]{64}$/i.test(hash) &&
      basename(filename) === assetName
    ) {
      return hash.toLowerCase()
    }
  }

  throw new Error(`Checksum for ${assetName} not found`)
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
      })
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

function validateManagedExecutablePath(
  executablePath: string,
  runtimeHome: RuntimeHomePaths
): string {
  const resolved = resolve(executablePath)

  if (!isPathInside(resolved, runtimeHome.runtimeBinDir)) {
    throw new Error('Invalid localExecutablePath')
  }

  return resolved
}

function isPathInside(path: string, parentDir: string): boolean {
  const relativePath = relative(parentDir, path)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  )
}

async function replaceFile(
  targetPath: string,
  replacementPath: string
): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true })

  const backupPath = `${targetPath}.backup-${Date.now()}-${randomUUID()}`
  let hasBackup = false

  try {
    await rename(targetPath, backupPath)
    hasBackup = true
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error
    }
  }

  try {
    await rename(replacementPath, targetPath)

    if (hasBackup) {
      await rm(backupPath, { force: true })
    }
  } catch (error) {
    if (hasBackup) {
      try {
        await rename(backupPath, targetPath)
      } catch {
        // Preserve the original error; rollback is best-effort.
      }
    }

    throw error
  }
}

async function defaultReadExecutableVersion(
  executablePath: string
): Promise<string | undefined> {
  try {
    const { stdout, stderr } = await execFileAsync(executablePath, ['--version'])

    return parseExecutableVersion(`${stdout}\n${stderr}`)
  } catch (error) {
    const output =
      typeof error === 'object' && error !== null
        ? `${String((error as { stdout?: unknown }).stdout ?? '')}\n${String(
            (error as { stderr?: unknown }).stderr ?? ''
          )}`
        : ''

    return parseExecutableVersion(output)
  }
}

function parseExecutableVersion(output: string): string | undefined {
  const versionMatch =
    output.match(/CLIProxyAPI Version:\s*v?(\d+\.\d+\.\d+)/i) ??
    output.match(/\bv?(\d+\.\d+\.\d+)\b/)

  return versionMatch?.[1] ? `v${versionMatch[1]}` : undefined
}

function isSameVersion(
  executableVersion: string | undefined,
  releaseTag: string
): boolean {
  return normalizeVersion(executableVersion) === normalizeVersion(releaseTag)
}

function normalizeVersion(version: string | undefined): string {
  return version?.trim().replace(/^v/i, '') ?? ''
}

async function findFileByName(
  rootDir: string,
  filename: string
): Promise<string | undefined> {
  const entries = await readdir(rootDir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name)

    if (entry.isFile() && entry.name === filename) {
      return fullPath
    }

    if (entry.isDirectory()) {
      const found = await findFileByName(fullPath, filename)

      if (found) {
        return found
      }
    }
  }

  return undefined
}

async function defaultFetchAdapter(
  url: string
): Promise<CliProxyApiFetchResponse> {
  return await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'allmone'
    }
  })
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
