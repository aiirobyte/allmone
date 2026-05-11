import { randomBytes } from 'node:crypto'

import {
  isCliProxyApiError,
  redactApiKey,
  redactCliProxyApiText,
  redactUrlCredentials,
  type CliProxyApiAmpCodeConfig,
  type CliProxyApiApiKeyDeleteInput,
  type CliProxyApiApiKeyPatchInput,
  type CliProxyApiAuthFileDeleteInput,
  type CliProxyApiAuthFileModelsResult,
  type CliProxyApiAuthFilesResult,
  type CliProxyApiKeysResult,
  type CliProxyApiModelDefinitionsResult,
  type CliProxyApiOauthExcludedModelsMap,
  type CliProxyApiOauthModelAliasMap,
  type CliProxyApiOpenAiCompatibilityDeleteInput,
  type CliProxyApiOpenAiCompatibilityProvider,
  type CliProxyApiOpenAiCompatibilityProviderInput,
  type CliProxyApiOpenAiCompatibilityResult,
  type CliProxyApiModelRecord,
  type CliProxyApiUpstreamApiKeyDeleteInput,
  type CliProxyApiUpstreamApiKeyEntry,
  type CliProxyApiUpstreamApiKeySectionResult,
  type CliProxyApiWriteResult
} from '../cli-proxy-api'
import {
  UPSTREAM_PROVIDER_CATALOG,
  UPSTREAM_PROVIDER_KINDS,
  getUpstreamProviderCatalogEntry
} from './catalog'
import type {
  LocalApiKeyState,
  LocalConnectionOutput,
  UpstreamAmpConfig,
  UpstreamApiKeyCredentialInput,
  UpstreamAuthFileSummary,
  UpstreamProviderCatalogEntry,
  UpstreamProviderKind,
  UpstreamProviderModelCandidateInput,
  UpstreamProviderSummary
} from './types'

export { UPSTREAM_PROVIDER_KINDS } from './catalog'

export interface UpstreamServiceClient {
  getApiKeys(): Promise<CliProxyApiKeysResult>
  putApiKeys(apiKeys: string[]): Promise<CliProxyApiWriteResult>
  patchApiKey(input: CliProxyApiApiKeyPatchInput): Promise<CliProxyApiWriteResult>
  deleteApiKey(input: CliProxyApiApiKeyDeleteInput): Promise<CliProxyApiWriteResult>

  getGeminiApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult>
  putGeminiApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult>
  patchGeminiApiKeyEntry(input: unknown): Promise<CliProxyApiWriteResult>
  deleteGeminiApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult>

  getCodexApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult>
  putCodexApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult>
  patchCodexApiKeyEntry(input: unknown): Promise<CliProxyApiWriteResult>
  deleteCodexApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult>

  getClaudeApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult>
  putClaudeApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult>
  patchClaudeApiKeyEntry(input: unknown): Promise<CliProxyApiWriteResult>
  deleteClaudeApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult>

  getVertexApiKeyEntries(): Promise<CliProxyApiUpstreamApiKeySectionResult>
  putVertexApiKeyEntries(
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult>
  patchVertexApiKeyEntry(input: unknown): Promise<CliProxyApiWriteResult>
  deleteVertexApiKeyEntry(
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult>

  getOpenAiCompatibilityProviders(): Promise<CliProxyApiOpenAiCompatibilityResult>
  putOpenAiCompatibilityProviders?(
    providers: CliProxyApiOpenAiCompatibilityProvider[]
  ): Promise<CliProxyApiWriteResult>
  upsertOpenAiCompatibilityProvider(
    provider: CliProxyApiOpenAiCompatibilityProviderInput
  ): Promise<CliProxyApiWriteResult>
  deleteOpenAiCompatibilityProvider(
    input: CliProxyApiOpenAiCompatibilityDeleteInput
  ): Promise<CliProxyApiWriteResult>

  getAmpCodeConfig(): Promise<{ config: CliProxyApiAmpCodeConfig; raw: unknown }>
  patchAmpCodeConfig(
    config: Partial<CliProxyApiAmpCodeConfig>
  ): Promise<CliProxyApiWriteResult>
  deleteAmpCodeConfig(): Promise<CliProxyApiWriteResult>

  getAuthFiles(): Promise<CliProxyApiAuthFilesResult>
  getAuthFileModels?(name: string): Promise<CliProxyApiAuthFileModelsResult>
  getModelDefinitions?(channel: string): Promise<CliProxyApiModelDefinitionsResult>
  deleteAuthFile(input: CliProxyApiAuthFileDeleteInput): Promise<CliProxyApiWriteResult>

  getOauthModelAlias(): Promise<{ aliases: CliProxyApiOauthModelAliasMap; raw: unknown }>
  putOauthModelAlias(
    aliases: CliProxyApiOauthModelAliasMap
  ): Promise<CliProxyApiWriteResult>
  getOauthExcludedModels(): Promise<{
    excludedModels: CliProxyApiOauthExcludedModelsMap
    raw: unknown
  }>
  putOauthExcludedModels(
    excludedModels: CliProxyApiOauthExcludedModelsMap
  ): Promise<CliProxyApiWriteResult>
}

export interface UpstreamServiceOptions {
  client: UpstreamServiceClient
}

export interface UpstreamService {
  getProviderCatalog(): UpstreamProviderCatalogEntry[]
  getLocalApiKeyState(): Promise<LocalApiKeyState>
  generateLocalApiKey(): Promise<LocalApiKeyState>
  setLocalApiKey(apiKey: string): Promise<LocalApiKeyState>
  deleteLocalApiKey(input: CliProxyApiApiKeyDeleteInput): Promise<CliProxyApiWriteResult>
  getLocalConnectionOutput(input: {
    serviceOrigin: string
    port: number
  }): Promise<LocalConnectionOutput>
  getUpstreamSummaries(): Promise<UpstreamProviderSummary[]>
  upsertApiKeyUpstream(
    input: UpstreamApiKeyCredentialInput
  ): Promise<CliProxyApiWriteResult>
  deleteApiKeyUpstream(
    providerKind: UpstreamProviderKind,
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult>
  getApiKeyUpstreamEntries?(
    providerKind: UpstreamProviderKind
  ): Promise<CliProxyApiUpstreamApiKeyEntry[]>
  writeApiKeyUpstreamEntries?(
    providerKind: UpstreamProviderKind,
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult>
  getOpenAiCompatibilityProviderConfigs?(): Promise<
    CliProxyApiOpenAiCompatibilityProvider[]
  >
  writeOpenAiCompatibilityProviderConfig?(
    index: number,
    provider: CliProxyApiOpenAiCompatibilityProvider
  ): Promise<CliProxyApiWriteResult>
  getProviderModelCandidates?(
    input: UpstreamProviderModelCandidateInput
  ): Promise<string[] | null>
  getAmpConfig(): Promise<UpstreamAmpConfig>
  writeAmpConfig(input: UpstreamAmpConfig): Promise<CliProxyApiWriteResult>
  resetAmpConfig(): Promise<CliProxyApiWriteResult>
  getAuthFileSummaries(): Promise<UpstreamAuthFileSummary[]>
  deleteAuthFile(input: CliProxyApiAuthFileDeleteInput): Promise<CliProxyApiWriteResult>
  getOauthModelAliases(): Promise<CliProxyApiOauthModelAliasMap>
  writeOauthModelAliases(
    input: CliProxyApiOauthModelAliasMap
  ): Promise<CliProxyApiWriteResult>
  getOauthExcludedModels(): Promise<CliProxyApiOauthExcludedModelsMap>
  writeOauthExcludedModels(
    input: CliProxyApiOauthExcludedModelsMap
  ): Promise<CliProxyApiWriteResult>
}

export function createUpstreamService(
  options: UpstreamServiceOptions
): UpstreamService {
  return new DefaultUpstreamService(options.client)
}

class DefaultUpstreamService implements UpstreamService {
  constructor(private readonly client: UpstreamServiceClient) {}

  getProviderCatalog(): UpstreamProviderCatalogEntry[] {
    return UPSTREAM_PROVIDER_CATALOG.map((entry) => ({
      ...entry,
      cliproxyapi: {
        ...entry.cliproxyapi,
        managementRoutes: { ...entry.cliproxyapi.managementRoutes },
        loginCommands: [...entry.cliproxyapi.loginCommands]
      },
      editableFields: entry.editableFields.map((field) => ({ ...field })),
      secretFields: [...entry.secretFields],
      redaction: [...entry.redaction],
      capabilities: { ...entry.capabilities }
    }))
  }

  async getLocalApiKeyState(): Promise<LocalApiKeyState> {
    return withSanitizedErrors(async () => {
      const result = await this.client.getApiKeys()
      return {
        configured: result.apiKeys.length > 0,
        count: result.apiKeys.length,
        redactedKeys: result.apiKeys.map(redactApiKey)
      }
    })
  }

  async generateLocalApiKey(): Promise<LocalApiKeyState> {
    const apiKey = `ak-allmone-${randomBytes(32).toString('base64url')}`
    return this.setLocalApiKey(apiKey)
  }

  async setLocalApiKey(apiKey: string): Promise<LocalApiKeyState> {
    return withSanitizedErrors(async () => {
      const trimmed = apiKey.trim()

      if (!trimmed) {
        throw new Error('Local API key is required')
      }

      const current = await this.client.getApiKeys()
      const next = current.apiKeys.includes(trimmed)
        ? current.apiKeys
        : [...current.apiKeys, trimmed]

      await this.client.putApiKeys(next)

      return {
        configured: true,
        count: next.length,
        redactedKeys: next.map(redactApiKey),
        oneTimePlaintextKey: trimmed
      }
    })
  }

  async deleteLocalApiKey(
    input: CliProxyApiApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(() => this.client.deleteApiKey(input))
  }

  async getLocalConnectionOutput(input: {
    serviceOrigin: string
    port: number
  }): Promise<LocalConnectionOutput> {
    return withSanitizedErrors(async () => {
      const state = await this.getLocalApiKeyState()
      const hiddenKey = state.configured ? '<local-api-key>' : '<set-a-local-api-key>'
      const openAiBaseUrl = `${input.serviceOrigin}/v1`

      return {
        serviceOrigin: input.serviceOrigin,
        port: input.port,
        localKeyConfigured: state.configured,
        snippets: {
          curl: `curl ${openAiBaseUrl}/chat/completions -H "Authorization: Bearer ${hiddenKey}" -H "Content-Type: application/json"`,
          openAiSdk: `base_url='${openAiBaseUrl}', api_key=os.environ['ALLMONE_API_KEY']`
        }
      }
    })
  }

  async getUpstreamSummaries(): Promise<UpstreamProviderSummary[]> {
    return withSanitizedErrors(async () => {
      const [
        localKeys,
        gemini,
        codex,
        claude,
        vertex,
        openaiCompatibility,
        amp,
        authFiles,
        oauthAliases,
        oauthExcluded
      ] = await Promise.all([
        this.getLocalApiKeyState(),
        this.client.getGeminiApiKeyEntries(),
        this.client.getCodexApiKeyEntries(),
        this.client.getClaudeApiKeyEntries(),
        this.client.getVertexApiKeyEntries(),
        this.client.getOpenAiCompatibilityProviders(),
        this.client.getAmpCodeConfig(),
        this.getAuthFileSummaries(),
        this.client.getOauthModelAlias(),
        this.client.getOauthExcludedModels()
      ])

      const summaries: UpstreamProviderSummary[] = [
        {
          providerKind: 'api-keys',
          label: getLabel('api-keys'),
          configured: localKeys.configured,
          redactedFields: ['apiKey'],
          entries: localKeys.redactedKeys
        },
        summarizeApiKeySection('gemini-api-key', gemini.entries),
        summarizeApiKeySection('codex-api-key', codex.entries),
        summarizeApiKeySection('claude-api-key', claude.entries),
        summarizeApiKeySection('vertex-api-key', vertex.entries),
        summarizeOpenAiCompatibility(openaiCompatibility),
        summarizeAmp(amp.config)
      ]

      for (const kind of accountProviderKinds) {
        summaries.push({
          providerKind: kind,
          label: getLabel(kind),
          configured:
            authFiles.some((file) => file.providerKind === kind) ||
            Object.hasOwn(oauthAliases.aliases, kind) ||
            Object.hasOwn(oauthExcluded.excludedModels, kind),
          redactedFields: ['authFileSummary'],
          entries: authFiles.filter((file) => file.providerKind === kind)
        })
      }

      return summaries
    })
  }

  async upsertApiKeyUpstream(
    input: UpstreamApiKeyCredentialInput
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(async () => {
      const providerKind = requireApiKeyProvider(input.providerKind)

      if (providerKind === 'openai-compatibility') {
        return this.client.upsertOpenAiCompatibilityProvider(
          await this.toOpenAiCompatibilityInput(input)
        )
      }

      if (typeof input.entryIndex !== 'number' && !input.apiKey?.trim()) {
        throw new Error('API key is required')
      }

      const current = await this.getApiKeyEntries(providerKind)
      const next = mergeApiKeyEntries(current, input)

      return this.putApiKeyEntries(providerKind, next)
    })
  }

  async deleteApiKeyUpstream(
    providerKind: UpstreamProviderKind,
    input: CliProxyApiUpstreamApiKeyDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(async () => {
      const kind = requireApiKeyProvider(providerKind)

      if (kind === 'openai-compatibility') {
        if ('index' in input && typeof input.index === 'number') {
          return this.client.deleteOpenAiCompatibilityProvider({ index: input.index })
        }

        return this.client.deleteOpenAiCompatibilityProvider({
          name: input.apiKey
        })
      }

      switch (kind) {
        case 'gemini-api-key':
          return this.client.deleteGeminiApiKeyEntry(input)
        case 'codex-api-key':
          return this.client.deleteCodexApiKeyEntry(input)
        case 'claude-api-key':
          return this.client.deleteClaudeApiKeyEntry(input)
        case 'vertex-api-key':
          return this.client.deleteVertexApiKeyEntry(input)
      }
    })
  }

  async getApiKeyUpstreamEntries(
    providerKind: UpstreamProviderKind
  ): Promise<CliProxyApiUpstreamApiKeyEntry[]> {
    return withSanitizedErrors(async () => {
      const kind = requireApiKeyProvider(providerKind)

      if (kind === 'openai-compatibility') {
        throw new Error('OpenAI-compatible providers are not API-key sections')
      }

      return (await this.getApiKeyEntries(kind)).entries
    })
  }

  async writeApiKeyUpstreamEntries(
    providerKind: UpstreamProviderKind,
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(async () => {
      const kind = requireApiKeyProvider(providerKind)

      if (kind === 'openai-compatibility') {
        throw new Error('OpenAI-compatible providers are not API-key sections')
      }

      return this.putApiKeyEntries(kind, entries)
    })
  }

  async getOpenAiCompatibilityProviderConfigs(): Promise<
    CliProxyApiOpenAiCompatibilityProvider[]
  > {
    return withSanitizedErrors(async () =>
      (await this.client.getOpenAiCompatibilityProviders()).providers
    )
  }

  async writeOpenAiCompatibilityProviderConfig(
    index: number,
    provider: CliProxyApiOpenAiCompatibilityProvider
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(async () => {
      const name = provider.name?.trim()
      const baseUrl = provider['base-url']?.trim()

      if (!name) {
        throw new Error('Provider name is required')
      }
      if (!baseUrl) {
        throw new Error('Base URL is required')
      }

      if (this.client.putOpenAiCompatibilityProviders) {
        const current = await this.client.getOpenAiCompatibilityProviders()

        if (index < 0 || index >= current.providers.length) {
          throw new Error('OpenAI-compatible provider entry not found')
        }

        const next = [...current.providers]
        next[index] = provider

        return this.client.putOpenAiCompatibilityProviders(next)
      }

      return this.client.upsertOpenAiCompatibilityProvider(
        provider as CliProxyApiOpenAiCompatibilityProviderInput
      )
    })
  }

  async getProviderModelCandidates(
    input: UpstreamProviderModelCandidateInput
  ): Promise<string[] | null> {
    return withSanitizedErrors(async () => {
      if (
        input.providerFamily === 'account-upstream' ||
        input.providerFamily === 'imported-account-upstream'
      ) {
        if (!this.client.getAuthFileModels) {
          return null
        }

        const authFileName =
          stringValue(input.entry.name) ??
          stringValue(input.entry.id) ??
          stringValue(input.entry.authIndex) ??
          stringValue(input.entry.auth_index)

        if (!authFileName) {
          return null
        }

        return modelIdsFromRecords(
          (await this.client.getAuthFileModels(authFileName)).models
        )
      }

      if (input.providerFamily !== 'api-key-upstream') {
        return null
      }

      if (input.providerKind === 'openai-compatibility') {
        return null
      }

      if (!this.client.getModelDefinitions) {
        return null
      }

      const channel =
        input.channel?.trim() || modelDefinitionChannel(input.providerKind)

      if (!channel) {
        return null
      }

      return modelIdsFromRecords(
        (await this.client.getModelDefinitions(channel)).models
      )
    })
  }

  async getAmpConfig(): Promise<UpstreamAmpConfig> {
    return withSanitizedErrors(async () => toUpstreamAmpConfig(
      (await this.client.getAmpCodeConfig()).config
    ))
  }

  async writeAmpConfig(input: UpstreamAmpConfig): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(async () =>
      {
        validateAmpConfig(input)
        return this.client.patchAmpCodeConfig(toCliProxyApiAmpConfig(input))
      }
    )
  }

  async resetAmpConfig(): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(() => this.client.deleteAmpCodeConfig())
  }

  async getAuthFileSummaries(): Promise<UpstreamAuthFileSummary[]> {
    return withSanitizedErrors(async () => {
      const result = await this.client.getAuthFiles()
      return result.files.map((file) => ({
        id: stringValue(file.id),
        name: stringValue(file.name),
        authIndex: stringValue(file.auth_index),
        providerKind: toProviderKind(file.provider),
        label: stringValue(file.label ?? file.email ?? file.account ?? file.name),
        status: stringValue(file.status),
        disabled: typeof file.disabled === 'boolean' ? file.disabled : undefined,
        source: stringValue(file.source),
        redactedPath: file.path ? redactPath(file.path) : undefined,
        diagnostics: file.status_message
          ? [redactCliProxyApiText(file.status_message)]
          : undefined
      }))
    })
  }

  async deleteAuthFile(
    input: CliProxyApiAuthFileDeleteInput
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(() => this.client.deleteAuthFile(input))
  }

  async getOauthModelAliases(): Promise<CliProxyApiOauthModelAliasMap> {
    return withSanitizedErrors(async () => (await this.client.getOauthModelAlias()).aliases)
  }

  async writeOauthModelAliases(
    input: CliProxyApiOauthModelAliasMap
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(() => this.client.putOauthModelAlias(input))
  }

  async getOauthExcludedModels(): Promise<CliProxyApiOauthExcludedModelsMap> {
    return withSanitizedErrors(async () =>
      (await this.client.getOauthExcludedModels()).excludedModels
    )
  }

  async writeOauthExcludedModels(
    input: CliProxyApiOauthExcludedModelsMap
  ): Promise<CliProxyApiWriteResult> {
    return withSanitizedErrors(() => this.client.putOauthExcludedModels(input))
  }

  private putApiKeyEntries(
    providerKind: Exclude<ApiKeyProviderKind, 'openai-compatibility'>,
    entries: CliProxyApiUpstreamApiKeyEntry[]
  ): Promise<CliProxyApiWriteResult> {
    switch (providerKind) {
      case 'gemini-api-key':
        return this.client.putGeminiApiKeyEntries(entries)
      case 'codex-api-key':
        return this.client.putCodexApiKeyEntries(entries)
      case 'claude-api-key':
        return this.client.putClaudeApiKeyEntries(entries)
      case 'vertex-api-key':
        return this.client.putVertexApiKeyEntries(entries)
    }
  }

  private getApiKeyEntries(
    providerKind: Exclude<ApiKeyProviderKind, 'openai-compatibility'>
  ): Promise<CliProxyApiUpstreamApiKeySectionResult> {
    switch (providerKind) {
      case 'gemini-api-key':
        return this.client.getGeminiApiKeyEntries()
      case 'codex-api-key':
        return this.client.getCodexApiKeyEntries()
      case 'claude-api-key':
        return this.client.getClaudeApiKeyEntries()
      case 'vertex-api-key':
        return this.client.getVertexApiKeyEntries()
    }
  }

  private async toOpenAiCompatibilityInput(
    input: UpstreamApiKeyCredentialInput
  ): Promise<CliProxyApiOpenAiCompatibilityProviderInput> {
    if (typeof input.entryIndex !== 'number') {
      return toOpenAiCompatibilityInput(input)
    }

    const current = await this.client.getOpenAiCompatibilityProviders()
    const existing = current.providers[input.entryIndex]

    if (!existing) {
      throw new Error('OpenAI-compatible provider entry not found')
    }

    return mergeOpenAiCompatibilityProvider(existing, input)
  }
}

const apiKeyProviderKinds = [
  'gemini-api-key',
  'codex-api-key',
  'claude-api-key',
  'openai-compatibility',
  'vertex-api-key'
] as const

type ApiKeyProviderKind = (typeof apiKeyProviderKinds)[number]

const accountProviderKinds: UpstreamProviderKind[] = [
  'gemini-cli',
  'aistudio',
  'antigravity',
  'claude',
  'codex',
  'kimi',
  'vertex'
]

function getLabel(providerKind: UpstreamProviderKind): string {
  return getUpstreamProviderCatalogEntry(providerKind).label
}

function requireApiKeyProvider(
  providerKind: UpstreamProviderKind
): ApiKeyProviderKind {
  if (apiKeyProviderKinds.includes(providerKind as ApiKeyProviderKind)) {
    return providerKind as ApiKeyProviderKind
  }

  throw new Error(`${providerKind} does not support API-key upstream writes`)
}

function modelDefinitionChannel(
  providerKind: UpstreamProviderKind
): string | undefined {
  switch (providerKind) {
    case 'gemini-api-key':
      return 'gemini'
    case 'codex-api-key':
      return 'codex'
    case 'claude-api-key':
      return 'claude'
    case 'vertex-api-key':
      return 'vertex'
    default:
      return undefined
  }
}

function modelIdsFromRecords(records: CliProxyApiModelRecord[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()

  for (const record of records) {
    const id =
      stringValue(record.id) ??
      stringValue(record.name) ??
      stringValue(record.model)

    if (!id) {
      continue
    }

    const key = id.toLowerCase()

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    ids.push(id)
  }

  return ids
}

function summarizeApiKeySection(
  providerKind: UpstreamProviderKind,
  entries: CliProxyApiUpstreamApiKeyEntry[]
): UpstreamProviderSummary {
  return {
    providerKind,
    label: getLabel(providerKind),
    configured: entries.length > 0,
    redactedFields: ['apiKey', 'headers', 'proxyUrl'],
    entries: entries.map(redactApiKeyEntry)
  }
}

function summarizeOpenAiCompatibility(
  result: CliProxyApiOpenAiCompatibilityResult
): UpstreamProviderSummary {
  return {
    providerKind: 'openai-compatibility',
    label: getLabel('openai-compatibility'),
    configured: result.providers.length > 0,
    redactedFields: ['apiKeyEntries', 'headers', 'proxyUrl'],
    entries: result.providers.map((provider) => ({
      name: provider.name,
      disabled: provider.disabled,
      baseUrl: provider['base-url'],
      apiKeyEntries: (provider['api-key-entries'] ?? []).map(redactApiKeyEntry),
      models: provider.models ?? [],
      headers: redactHeaders(provider.headers)
    }))
  }
}

function summarizeAmp(config: CliProxyApiAmpCodeConfig): UpstreamProviderSummary {
  return {
    providerKind: 'ampcode',
    label: getLabel('ampcode'),
    configured: Object.keys(config).length > 0,
    redactedFields: ['upstreamApiKey', 'upstreamApiKeys', 'upstreamUrl'],
    entries: [redactAmpConfig(config)]
  }
}

function toApiKeyEntry(
  input: UpstreamApiKeyCredentialInput
): CliProxyApiUpstreamApiKeyEntry {
  return compactObject({
    'api-key': input.apiKey,
    'base-url': input.baseUrl,
    prefix: input.prefix,
    disabled: input.disabled,
    headers: toHeaderRecord(input.headers),
    'proxy-url': input.proxyUrl,
    models: toCliProxyApiModelAliases(input.modelAliases),
    'excluded-models': input.excludedModels?.map((row) => row.pattern)
  })
}

function mergeApiKeyEntries(
  current: CliProxyApiUpstreamApiKeySectionResult,
  input: UpstreamApiKeyCredentialInput
): CliProxyApiUpstreamApiKeyEntry[] {
  const newEntry = toApiKeyEntry(input)
  const entries = [...current.entries]

  if (typeof input.entryIndex === 'number') {
    if (input.entryIndex < 0 || input.entryIndex >= entries.length) {
      throw new Error('API-key upstream entry not found')
    }

    entries[input.entryIndex] = compactObject({
      ...entries[input.entryIndex],
      ...newEntry
    })
    return entries
  }

  const index =
    input.matchApiKey
      ? entries.findIndex((entry) => entry['api-key'] === input.matchApiKey)
      : -1

  if (index >= 0) {
    entries[index] = compactObject({
      ...entries[index],
      ...newEntry
    })
    return entries
  }

  return [...entries, newEntry]
}

function toOpenAiCompatibilityInput(
  input: UpstreamApiKeyCredentialInput
): CliProxyApiOpenAiCompatibilityProviderInput {
  if (!input.providerName?.trim()) {
    throw new Error('Provider name is required')
  }
  if (!input.baseUrl?.trim()) {
    throw new Error('Base URL is required')
  }
  validateHttpUrl(input.baseUrl, 'OpenAI-compatible base URL')
  if (!input.apiKeyEntries?.some((entry) => entry.apiKey?.trim())) {
    throw new Error('At least one API key entry is required')
  }

  return {
    name: input.providerName,
    disabled: input.disabled,
    'base-url': input.baseUrl,
    'api-key-entries': toCliProxyApiKeyEntries(input.apiKeyEntries),
    headers: toHeaderRecord(input.headers),
    models: toCliProxyApiModelAliases(input.modelAliases)
  }
}

function mergeOpenAiCompatibilityProvider(
  existing: CliProxyApiOpenAiCompatibilityProvider,
  input: UpstreamApiKeyCredentialInput
): CliProxyApiOpenAiCompatibilityProviderInput {
  const name = input.providerName?.trim() || existing.name?.trim()
  const baseUrl = input.baseUrl?.trim() || existing['base-url']?.trim()

  if (!name) {
    throw new Error('Provider name is required')
  }
  if (!baseUrl) {
    throw new Error('Base URL is required')
  }

  return {
    name,
    disabled: input.disabled ?? existing.disabled,
    'base-url': baseUrl,
    'api-key-entries': input.apiKeyEntries?.some((entry) => entry.apiKey?.trim())
      ? toCliProxyApiKeyEntries(input.apiKeyEntries)
      : existing['api-key-entries'],
    headers: input.headers ? toHeaderRecord(input.headers) : existing.headers,
    models: toCliProxyApiModelAliases(input.modelAliases)
  }
}

function toCliProxyApiKeyEntries(
  entries: UpstreamApiKeyCredentialInput['apiKeyEntries']
): CliProxyApiOpenAiCompatibilityProviderInput['api-key-entries'] {
  return entries?.map((entry) =>
    compactObject({
      'api-key': entry.apiKey,
      'proxy-url': entry.proxyUrl,
      'auth-index': entry.authIndex
    })
  )
}

function toCliProxyApiModelAliases(
  rows: UpstreamApiKeyCredentialInput['modelAliases']
): CliProxyApiUpstreamApiKeyEntry['models'] {
  return rows?.map((row) =>
    compactObject({
      name: row.name,
      alias: row.alias,
      fork: row.fork
    })
  )
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T
}

function toHeaderRecord(
  rows: UpstreamApiKeyCredentialInput['headers']
): Record<string, string> | undefined {
  if (!rows?.length) {
    return undefined
  }

  return Object.fromEntries(
    rows
      .filter((row) => row.name.trim())
      .map((row) => [row.name.trim(), row.value])
  )
}

function redactApiKeyEntry(entry: CliProxyApiUpstreamApiKeyEntry): Record<string, unknown> {
  return {
    ...entry,
    'api-key': redactApiKey(entry['api-key']),
    'proxy-url': entry['proxy-url']
      ? redactUrlCredentials(entry['proxy-url'])
      : undefined,
    headers: redactHeaders(entry.headers)
  }
}

function redactHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      isSensitiveHeader(name) ? redactCliProxyApiText(value) : value
    ])
  )
}

function isSensitiveHeader(name: string): boolean {
  return /authorization|api[-_]?key|token|secret|cookie/i.test(name)
}

function redactAmpConfig(config: CliProxyApiAmpCodeConfig): Record<string, unknown> {
  return {
    ...config,
    'upstream-url': config['upstream-url']
      ? redactUrlCredentials(config['upstream-url'])
      : undefined,
    'upstream-api-key': config['upstream-api-key']
      ? redactApiKey(config['upstream-api-key'])
      : undefined,
    'upstream-api-keys': config['upstream-api-keys']?.map((entry) => ({
      ...entry,
      'upstream-api-key': redactApiKey(entry['upstream-api-key']),
      'api-keys': entry['api-keys']?.map(redactApiKey)
    }))
  }
}

function toUpstreamAmpConfig(config: CliProxyApiAmpCodeConfig): UpstreamAmpConfig {
  return {
    upstreamUrl: config['upstream-url']
      ? redactUrlCredentials(config['upstream-url'])
      : undefined,
    upstreamApiKey: config['upstream-api-key']
      ? redactApiKey(config['upstream-api-key'])
      : undefined,
    upstreamApiKeys: config['upstream-api-keys']?.map((entry) => ({
      upstreamApiKey: redactApiKey(entry['upstream-api-key']),
      apiKeys: entry['api-keys']?.map(redactApiKey) ?? []
    })),
    restrictManagementToLocalhost: config['restrict-management-to-localhost'],
    forceModelMappings: config['force-model-mappings'],
    modelMappings: config['model-mappings']?.map((entry) => ({
      from: entry.from ?? '',
      to: entry.to ?? ''
    }))
  }
}

function toCliProxyApiAmpConfig(input: UpstreamAmpConfig): CliProxyApiAmpCodeConfig {
  return compactObject({
    'upstream-url': input.upstreamUrl,
    'upstream-api-key': input.upstreamApiKey,
    'upstream-api-keys': input.upstreamApiKeys?.map((entry) => ({
      'upstream-api-key': entry.upstreamApiKey,
      'api-keys': entry.apiKeys
    })),
    'restrict-management-to-localhost': input.restrictManagementToLocalhost,
    'force-model-mappings': input.forceModelMappings,
    'model-mappings': input.modelMappings?.map((entry) => ({
      from: entry.from,
      to: entry.to
    }))
  })
}

function validateAmpConfig(input: UpstreamAmpConfig): void {
  if (input.upstreamUrl) {
    validateHttpUrl(input.upstreamUrl, 'Amp upstream URL')
  }

  for (const entry of input.upstreamApiKeys ?? []) {
    if (!entry.upstreamApiKey?.trim() || entry.apiKeys.length === 0) {
      throw new Error('Amp API key mapping requires an upstream key and local keys')
    }
  }

  for (const entry of input.modelMappings ?? []) {
    if (!entry.from.trim() || !entry.to.trim()) {
      throw new Error('Amp model mapping requires source and target models')
    }
  }
}

function validateHttpUrl(value: string, label: string): void {
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('invalid protocol')
    }
  } catch {
    throw new Error(`A valid ${label} is required`)
  }
}

function toProviderKind(value: unknown): UpstreamProviderKind {
  return typeof value === 'string' && isProviderKind(value) ? value : 'claude'
}

function isProviderKind(value: string): value is UpstreamProviderKind {
  return UPSTREAM_PROVIDER_KINDS.includes(value as UpstreamProviderKind)
}

function redactPath(path: string): string {
  const name = path.split(/[\\/]/).filter(Boolean).at(-1)
  return name ? `[REDACTED_PATH]/${name}` : '[REDACTED_PATH]'
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

async function withSanitizedErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isCliProxyApiError(error)) {
      const details = error.toLogObject()
      throw new Error(
        redactCliProxyApiText(
          JSON.stringify({
            name: details.name,
            kind: details.kind,
            state: details.state,
            status: details.status,
            url: details.url,
            responseBody: details.responseBody
          })
        )
      )
    }

    if (error instanceof Error) {
      throw new Error(redactCliProxyApiText(error.message))
    }

    throw new Error('Unexpected upstream service failure')
  }
}
