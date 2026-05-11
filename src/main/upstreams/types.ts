export type UpstreamProviderKind =
  | 'api-keys'
  | 'gemini-api-key'
  | 'codex-api-key'
  | 'claude-api-key'
  | 'openai-compatibility'
  | 'vertex-api-key'
  | 'ampcode'
  | 'gemini-cli'
  | 'aistudio'
  | 'antigravity'
  | 'claude'
  | 'codex'
  | 'kimi'
  | 'vertex'

export type UpstreamProviderFamily =
  | 'local-client-key'
  | 'api-key-upstream'
  | 'amp-integration'
  | 'account-upstream'
  | 'imported-account-upstream'

export type UpstreamEditableFieldName =
  | 'apiKey'
  | 'apiKeyEntries'
  | 'baseUrl'
  | 'providerName'
  | 'prefix'
  | 'disabled'
  | 'headers'
  | 'proxyUrl'
  | 'modelAliases'
  | 'excludedModels'
  | 'upstreamUrl'
  | 'upstreamApiKey'
  | 'upstreamApiKeys'
  | 'restrictManagementToLocalhost'
  | 'forceModelMappings'
  | 'modelMappings'
  | 'authFileSummary'
  | 'loginAction'

export interface UpstreamEditableField {
  name: UpstreamEditableFieldName
  required: boolean
  displayable: boolean
}

export interface UpstreamManagementRouteSet {
  config?: string
  authFiles?: string
  oauthModelAlias?: string
  oauthExcludedModels?: string
}

export interface UpstreamProviderCapabilities {
  summarize: boolean
  create: boolean
  edit: boolean
  delete: boolean
  disable: boolean
  localKeyManagement: boolean
  authFileManagement: boolean
  loginHandoff: boolean
  importHandoff: boolean
  providerProtocolLogic: false
  requestTransformation: false
  responseTransformation: false
}

export interface UpstreamProviderCatalogEntry {
  kind: UpstreamProviderKind
  label: string
  family: UpstreamProviderFamily
  cliproxyapi: {
    section?: string
    channel?: string
    managementRoutes: UpstreamManagementRouteSet
    loginCommands: string[]
  }
  editableFields: UpstreamEditableField[]
  secretFields: UpstreamEditableFieldName[]
  redaction: string[]
  capabilities: UpstreamProviderCapabilities
}

export interface UpstreamHeaderRow {
  name: string
  value: string
  sensitive?: boolean
}

export interface UpstreamModelAliasRow {
  name: string
  alias?: string
  fork?: boolean
}

export interface UpstreamExcludedModelRow {
  pattern: string
}

export interface UpstreamApiKeyEntryInput {
  apiKey?: string
  proxyUrl?: string
  authIndex?: string
}

export interface UpstreamApiKeyCredentialInput {
  providerKind: UpstreamProviderKind
  entryIndex?: number
  matchApiKey?: string
  apiKey?: string
  apiKeyEntries?: UpstreamApiKeyEntryInput[]
  baseUrl?: string
  providerName?: string
  prefix?: string
  disabled?: boolean
  headers?: UpstreamHeaderRow[]
  proxyUrl?: string
  modelAliases?: UpstreamModelAliasRow[]
  excludedModels?: UpstreamExcludedModelRow[]
}

export interface UpstreamProviderSummary {
  providerKind: UpstreamProviderKind
  label: string
  configured: boolean
  disabled?: boolean
  redactedFields: UpstreamEditableFieldName[]
  entries?: unknown[]
  diagnostics?: string[]
}

export interface UpstreamProviderModelCandidateInput {
  providerKind: UpstreamProviderKind
  providerFamily: UpstreamProviderFamily
  entryIndex: number
  entry: Record<string, unknown>
  providerName?: string
  channel?: string
}

export interface UpstreamProxyUrlValue {
  value: string
  redacted: boolean
}

export interface UpstreamAmpApiKeyMappingRow {
  upstreamApiKey?: string
  apiKeys: string[]
}

export interface UpstreamAmpModelMappingRow {
  from: string
  to: string
}

export interface UpstreamAmpConfig {
  upstreamUrl?: string
  upstreamApiKey?: string
  upstreamApiKeys?: UpstreamAmpApiKeyMappingRow[]
  restrictManagementToLocalhost?: boolean
  forceModelMappings?: boolean
  modelMappings?: UpstreamAmpModelMappingRow[]
}

export interface UpstreamAuthFileSummary {
  id?: string
  name?: string
  authIndex?: string
  providerKind: UpstreamProviderKind
  label?: string
  status?: string
  disabled?: boolean
  source?: string
  redactedPath?: string
  diagnostics?: string[]
}

export type UpstreamLoginActionKind =
  | 'gemini-cli-login'
  | 'antigravity-login'
  | 'claude-login'
  | 'codex-login'
  | 'codex-device-login'
  | 'kimi-login'
  | 'vertex-import'

export interface UpstreamLoginAction {
  kind: UpstreamLoginActionKind
  providerKind: UpstreamProviderKind
  commandFlag: string
  requiresImportPath: boolean
}

export interface LocalApiKeyState {
  configured: boolean
  count: number
  redactedKeys: string[]
  oneTimePlaintextKey?: string
}

export interface LocalConnectionOutput {
  serviceOrigin: string
  port: number
  localKeyConfigured: boolean
  snippets: {
    curl: string
    openAiSdk: string
  }
}
