import { randomBytes } from 'node:crypto'

import { redactApiKey, type CliProxyApiFetch } from '../cli-proxy-api'
import type {
  AllmoneConfigStore,
  AllmoneLocalOutputKeyConfigRecord
} from '../runtime/allmoneConfigStore'
import type { CliProxyApiConfigWriter } from '../runtime/cliproxyapiConfigWriter'
import type {
  UpstreamProviderCatalogEntry,
  UpstreamProviderFamily,
  UpstreamProviderSummary,
  UpstreamService
} from '../upstreams'
import type {
  LocalOutputKeyIdInput,
  LocalOutputKeyListResult,
  LocalOutputKeyMutationResult,
  LocalOutputKeyNamedInput,
  LocalOutputKeyRenameInput,
  LocalOutputKeySummary,
  ModelInventory,
  ModelInventoryModelRow,
  ModelInventoryProviderRow
} from './types'

const DEFAULT_LOCAL_OUTPUT_KEY_NAME = 'Default local key'
const MODEL_INVENTORY_FAMILIES: UpstreamProviderFamily[] = [
  'api-key-upstream',
  'account-upstream',
  'imported-account-upstream'
]

export interface ModelsServiceOptions {
  configStore: AllmoneConfigStore
  configWriter?: CliProxyApiConfigWriter
  upstreamService?: UpstreamService
  modelsFetch?: CliProxyApiFetch
  generateId?: () => string
  generateKey?: () => string
  now?: () => Date
}

export interface ModelsService {
  getModelInventory(): Promise<ModelInventory>
  ensureDefaultLocalOutputKey(): Promise<LocalOutputKeyListResult>
  getLocalOutputKeySummaries(): Promise<LocalOutputKeySummary[]>
  createGeneratedLocalOutputKey(
    input: LocalOutputKeyNamedInput
  ): Promise<LocalOutputKeyMutationResult>
  renameLocalOutputKey(
    input: LocalOutputKeyRenameInput
  ): Promise<LocalOutputKeyMutationResult>
  revealLocalOutputKey(
    input: LocalOutputKeyIdInput
  ): Promise<LocalOutputKeyMutationResult>
  deleteLocalOutputKey(
    input: LocalOutputKeyIdInput
  ): Promise<LocalOutputKeyListResult>
}

export function createModelsService(options: ModelsServiceOptions): ModelsService {
  return new DefaultModelsService(options)
}

class DefaultModelsService implements ModelsService {
  private readonly configStore: AllmoneConfigStore
  private readonly configWriter: CliProxyApiConfigWriter | undefined
  private readonly upstreamService: UpstreamService | undefined
  private readonly modelsFetch: CliProxyApiFetch
  private readonly generateId: () => string
  private readonly generateKey: () => string
  private readonly now: () => Date

  constructor(options: ModelsServiceOptions) {
    this.configStore = options.configStore
    this.configWriter = options.configWriter
    this.upstreamService = options.upstreamService
    this.modelsFetch = options.modelsFetch ?? getGlobalFetch()
    this.generateId = options.generateId ?? defaultGenerateId
    this.generateKey = options.generateKey ?? defaultGenerateKey
    this.now = options.now ?? (() => new Date())
  }

  async getModelInventory(): Promise<ModelInventory> {
    await this.ensureDefaultLocalOutputKey()

    const config = await this.configStore.load()
    const defaultKey = requireDefaultKey(config.localOutputKeys)
    const localOutputKey = this.configStore.decryptLocalOutputKeyValue(
      defaultKey.valueEncrypted
    )
    const [catalog, summaries] = await Promise.all([
      this.getUpstreamService().getProviderCatalog(),
      this.getUpstreamService().getUpstreamSummaries()
    ])
    const providers = await buildProviderRows({
      catalog,
      summaries,
      fetchModelRows: async (target) =>
        await this.fetchProviderModelRows(
          config.runtime.apiBaseUrl,
          localOutputKey,
          target
        )
    })

    return {
      serviceOrigin: config.runtime.serviceOrigin,
      apiBaseUrl: config.runtime.apiBaseUrl,
      fetchedAt: this.now().toISOString(),
      localOutputKeys: toSummaries(config.localOutputKeys),
      providers
    }
  }

  async ensureDefaultLocalOutputKey(): Promise<LocalOutputKeyListResult> {
    const config = await this.configStore.load()
    const defaultKey = config.localOutputKeys.find((key) => key.isDefault)

    if (defaultKey && this.canDecrypt(defaultKey)) {
      return { keys: toSummaries(config.localOutputKeys) }
    }

    const nextKey = this.toConfigRecord({
      id: this.nextUniqueId(config.localOutputKeys),
      name: DEFAULT_LOCAL_OUTPUT_KEY_NAME,
      value: this.generateKey(),
      isDefault: true
    })
    const nextConfig = await this.configStore.save({
      localOutputKeys: normalizeDefaultKey([
        nextKey,
        ...config.localOutputKeys.filter((key) => key.id !== defaultKey?.id)
      ])
    })

    await this.configWriter?.writeManagedConfig(nextConfig)

    return { keys: toSummaries(nextConfig.localOutputKeys) }
  }

  async getLocalOutputKeySummaries(): Promise<LocalOutputKeySummary[]> {
    const config = await this.configStore.load()
    return toSummaries(config.localOutputKeys)
  }

  async createGeneratedLocalOutputKey(
    input: LocalOutputKeyNamedInput
  ): Promise<LocalOutputKeyMutationResult> {
    return await this.createLocalOutputKey({
      name: input.name,
      value: this.generateKey()
    })
  }

  async renameLocalOutputKey(
    input: LocalOutputKeyRenameInput
  ): Promise<LocalOutputKeyMutationResult> {
    const config = await this.configStore.load()
    const id = normalizeId(input.id)
    const name = normalizeName(input.name)
    const found = findKey(config.localOutputKeys, id)
    const nextConfig = await this.configStore.save({
      localOutputKeys: config.localOutputKeys.map((key) =>
        key.id === id ? { ...key, name } : key
      )
    })
    const key = toSummary({ ...found, name })

    return {
      key,
      keys: toSummaries(nextConfig.localOutputKeys)
    }
  }

  async revealLocalOutputKey(
    input: LocalOutputKeyIdInput
  ): Promise<LocalOutputKeyMutationResult> {
    const config = await this.configStore.load()
    const key = findKey(config.localOutputKeys, normalizeId(input.id))
    const plaintext = this.configStore.decryptLocalOutputKeyValue(
      key.valueEncrypted
    )

    return {
      key: toSummary(key),
      keys: toSummaries(config.localOutputKeys),
      plaintext
    }
  }

  async deleteLocalOutputKey(
    input: LocalOutputKeyIdInput
  ): Promise<LocalOutputKeyListResult> {
    const config = await this.configStore.load()
    const id = normalizeId(input.id)

    findKey(config.localOutputKeys, id)

    const nextRecords = normalizeDefaultKey(
      config.localOutputKeys.filter((key) => key.id !== id)
    )
    const nextConfig = await this.configStore.save({
      localOutputKeys: nextRecords
    })

    await this.configWriter?.writeManagedConfig(nextConfig)

    return { keys: toSummaries(nextConfig.localOutputKeys) }
  }

  private async createLocalOutputKey(
    input: { name: string; value: string }
  ): Promise<LocalOutputKeyMutationResult> {
    const config = await this.configStore.load()
    const plaintext = normalizePlaintext(input.value)
    const key = this.toConfigRecord({
      id: this.nextUniqueId(config.localOutputKeys),
      name: normalizeName(input.name),
      value: plaintext,
      isDefault: config.localOutputKeys.length === 0
    })
    const nextConfig = await this.configStore.save({
      localOutputKeys: normalizeDefaultKey([...config.localOutputKeys, key])
    })

    await this.configWriter?.writeManagedConfig(nextConfig)

    return {
      key: toSummary(key),
      keys: toSummaries(nextConfig.localOutputKeys),
      plaintext
    }
  }

  private toConfigRecord(input: {
    id: string
    name: string
    value: string
    isDefault: boolean
  }): AllmoneLocalOutputKeyConfigRecord {
    return {
      id: input.id,
      name: input.name,
      preview: redactApiKey(input.value),
      valueEncrypted: this.configStore.encryptLocalOutputKeyValue(input.value),
      isDefault: input.isDefault
    }
  }

  private nextUniqueId(existing: AllmoneLocalOutputKeyConfigRecord[]): string {
    const existingIds = new Set(existing.map((key) => key.id))

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const id = normalizeId(this.generateId())

      if (!existingIds.has(id)) {
        return id
      }
    }

    throw new Error('Could not generate local output key ID')
  }

  private canDecrypt(key: AllmoneLocalOutputKeyConfigRecord): boolean {
    try {
      this.configStore.decryptLocalOutputKeyValue(key.valueEncrypted)
      return true
    } catch {
      return false
    }
  }

  private getUpstreamService(): UpstreamService {
    if (!this.upstreamService) {
      throw new Error('Upstream service is unavailable')
    }

    return this.upstreamService
  }

  private async fetchProviderModelRows(
    apiBaseUrl: string,
    localOutputKey: string,
    target: ProviderModelFetchTarget
  ): Promise<ModelInventoryModelRow[]> {
    const response = await this.modelsFetch(
      buildProviderModelsUrl(apiBaseUrl, getProviderModelHandle(target)),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${localOutputKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Model inventory request failed with HTTP ${response.status}`)
    }

    return parseModelRows(await response.text())
  }
}

async function buildProviderRows(input: {
  catalog: UpstreamProviderCatalogEntry[]
  summaries: UpstreamProviderSummary[]
  fetchModelRows: (
    target: ProviderModelFetchTarget
  ) => Promise<ModelInventoryModelRow[]>
}): Promise<ModelInventoryProviderRow[]> {
  const catalogByKind = new Map(
    input.catalog.map((entry) => [entry.kind, entry])
  )
  const rows: Array<Promise<ModelInventoryProviderRow>> = []

  for (const summary of input.summaries) {
    const catalog = catalogByKind.get(summary.providerKind)

    if (
      !summary.configured ||
      !catalog ||
      !MODEL_INVENTORY_FAMILIES.includes(catalog.family)
    ) {
      continue
    }

    const entries = Array.isArray(summary.entries) ? summary.entries : []

    if (entries.length === 0) {
      rows.push((async () => {
        const entry = {}
        const modelRows = await getProviderModelRows({
          summary,
          catalog,
          entry,
          fetchModelRows: input.fetchModelRows
        })

        return toProviderRow({
          summary,
          catalog,
          entry,
          index: 0,
          modelRows
        })
      })())
      continue
    }

    entries.forEach((entry, index) => {
      rows.push((async () => {
        const entryRecord = isRecord(entry) ? entry : {}
        const modelRows = await getProviderModelRows({
          summary,
          catalog,
          entry: entryRecord,
          fetchModelRows: input.fetchModelRows
        })

        return toProviderRow({
          summary,
          catalog,
          entry: entryRecord,
          index,
          modelRows
        })
      })())
    })
  }

  return await Promise.all(rows)
}

interface ProviderModelFetchTarget {
  summary: UpstreamProviderSummary
  catalog: UpstreamProviderCatalogEntry
  entry: Record<string, unknown>
}

async function getProviderModelRows(input: ProviderModelFetchTarget & {
  fetchModelRows: (
    target: ProviderModelFetchTarget
  ) => Promise<ModelInventoryModelRow[]>
}): Promise<ModelInventoryModelRow[]> {
  if (
    input.catalog.family === 'account-upstream' ||
    input.catalog.family === 'imported-account-upstream'
  ) {
    return await input.fetchModelRows(input)
  }

  return toConfiguredModelRows(input.entry.models)
}

function toProviderRow(input: {
  summary: UpstreamProviderSummary
  catalog: UpstreamProviderCatalogEntry | undefined
  entry: unknown
  index: number
  modelRows: ModelInventoryModelRow[]
}): ModelInventoryProviderRow {
  const entry = isRecord(input.entry) ? input.entry : {}
  const label = getProviderLabel(input.summary, entry, input.index)
  const models = input.modelRows
  const details = getProviderDetails(entry)

  return {
    id: `${input.summary.providerKind}:${input.index}`,
    providerKind: input.summary.providerKind,
    label,
    family: input.catalog?.family ?? 'unknown',
    configured: input.summary.configured,
    disabled: input.summary.disabled === true || entry.disabled === true,
    details,
    models,
    modelState: models.length > 0 ? 'ready' : 'empty',
    emptyMessage:
      models.length > 0
        ? undefined
        : getEmptyModelMessage(input.catalog?.family)
  }
}

function getEmptyModelMessage(family: UpstreamProviderFamily | undefined): string {
  return family === 'api-key-upstream'
    ? 'No configured models reported for this provider'
    : 'No models reported by /models'
}

function getProviderLabel(
  summary: UpstreamProviderSummary,
  entry: Record<string, unknown>,
  index: number
): string {
  return (
    getString(entry.label) ??
    getString(entry.name) ??
    getString(entry.providerName) ??
    (index === 0 ? summary.label : `${summary.label} ${index + 1}`)
  )
}

function getProviderDetails(entry: Record<string, unknown>): string[] {
  return [
    getString(entry.status),
    getString(entry.source),
    getString(entry['base-url']) ?? getString(entry.baseUrl),
    getString(entry.prefix),
    getString(entry.authIndex) ?? getString(entry.auth_index),
    entry.disabled === true ? 'disabled' : undefined,
    Array.isArray(entry.apiKeyEntries)
      ? `${entry.apiKeyEntries.length} key entries`
      : undefined
  ].filter((item): item is string => Boolean(item))
}

function parseModelRows(responseBody: string): ModelInventoryModelRow[] {
  let raw: unknown

  try {
    raw = JSON.parse(responseBody)
  } catch {
    throw new Error('Model inventory response was not valid JSON')
  }

  const records = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.data)
      ? raw.data
      : isRecord(raw) && Array.isArray(raw.models)
        ? raw.models
        : []

  return records
    .filter(isRecord)
    .map(toModelRow)
    .filter((row): row is ModelInventoryModelRow => row !== null)
}

function toModelRow(record: Record<string, unknown>): ModelInventoryModelRow | null {
  const id =
    getString(record.id) ??
    getString(record.name) ??
    getString(record.model)

  if (!id) {
    return null
  }

  return {
    id,
    provider:
      getString(record.provider) ??
      getString(record.providerKind) ??
      getString(record.provider_kind),
    source: getString(record.source),
    channel: getString(record.channel),
    ownedBy: getString(record.owned_by) ?? getString(record.ownedBy)
  }
}

function toConfiguredModelRows(value: unknown): ModelInventoryModelRow[] {
  if (!Array.isArray(value)) {
    return []
  }

  const rows: ModelInventoryModelRow[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const name = getString(item.name)
    const alias = getString(item.alias)

    if (alias) {
      rows.push({
        id: alias,
        source: 'configured'
      })
    }

    if (name && (!alias || item.fork === true)) {
      rows.push({
        id: name,
        source: 'configured'
      })
    }
  }

  return rows
}

function getProviderModelHandle(target: ProviderModelFetchTarget): string {
  if (
    target.catalog.family === 'account-upstream' ||
    target.catalog.family === 'imported-account-upstream'
  ) {
    return (
      target.catalog.cliproxyapi.channel ??
      target.catalog.cliproxyapi.section ??
      target.summary.providerKind
    )
  }

  return (
    getString(target.entry.name) ??
    getString(target.entry.providerName) ??
    target.catalog.cliproxyapi.section ??
    target.catalog.cliproxyapi.channel ??
    target.summary.providerKind
  )
}

function buildProviderModelsUrl(apiBaseUrl: string, provider: string): string {
  const origin = new URL(apiBaseUrl.trim()).origin

  return `${origin}/api/provider/${encodeURIComponent(provider)}/v1/models`
}

function requireDefaultKey(
  records: AllmoneLocalOutputKeyConfigRecord[]
): AllmoneLocalOutputKeyConfigRecord {
  const key = records.find((record) => record.isDefault)

  if (!key) {
    throw new Error('Default local output key is unavailable')
  }

  return key
}

function toSummaries(
  records: AllmoneLocalOutputKeyConfigRecord[]
): LocalOutputKeySummary[] {
  return records.map(toSummary)
}

function toSummary(record: AllmoneLocalOutputKeyConfigRecord): LocalOutputKeySummary {
  return {
    id: record.id,
    name: record.name,
    preview: record.preview,
    isDefault: record.isDefault
  }
}

function normalizeDefaultKey(
  records: AllmoneLocalOutputKeyConfigRecord[]
): AllmoneLocalOutputKeyConfigRecord[] {
  if (records.length === 0) {
    return []
  }

  let defaultSeen = false
  const normalized = records.map((record) => {
    if (record.isDefault && !defaultSeen) {
      defaultSeen = true
      return record
    }

    return { ...record, isDefault: false }
  })

  if (!defaultSeen) {
    normalized[0] = { ...normalized[0], isDefault: true }
  }

  return normalized
}

function findKey(
  records: AllmoneLocalOutputKeyConfigRecord[],
  id: string
): AllmoneLocalOutputKeyConfigRecord {
  const key = records.find((record) => record.id === id)

  if (!key) {
    throw new Error('Local output key not found')
  }

  return key
}

function normalizeId(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('Local output key ID is required')
  }

  return trimmed
}

function normalizeName(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('Local output key name is required')
  }

  return trimmed
}

function normalizePlaintext(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('Local output key is required')
  }

  return trimmed
}

function defaultGenerateId(): string {
  return `lok_${randomBytes(16).toString('hex')}`
}

function defaultGenerateKey(): string {
  return `ak-allmone-${randomBytes(32).toString('base64url')}`
}

function getGlobalFetch(): CliProxyApiFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('globalThis.fetch is not available')
  }

  return globalThis.fetch.bind(globalThis) as CliProxyApiFetch
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export type {
  LocalOutputKeyIdInput,
  LocalOutputKeyListResult,
  LocalOutputKeyMutationResult,
  LocalOutputKeyNamedInput,
  LocalOutputKeyRenameInput,
  LocalOutputKeySummary,
  ModelInventory,
  ModelInventoryModelRow,
  ModelInventoryProviderRow
} from './types'
