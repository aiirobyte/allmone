export interface LocalOutputKeySummary {
  id: string
  name: string
  preview: string
  isDefault: boolean
}

export interface LocalOutputKeyNamedInput {
  name: string
}

export interface LocalOutputKeyIdInput {
  id: string
}

export interface LocalOutputKeyRenameInput extends LocalOutputKeyIdInput {
  name: string
}

export interface LocalOutputKeyListResult {
  keys: LocalOutputKeySummary[]
}

export interface LocalOutputKeyMutationResult extends LocalOutputKeyListResult {
  key: LocalOutputKeySummary
  plaintext?: string
}

export interface ModelInventory {
  serviceOrigin: string
  apiBaseUrl: string
  fetchedAt: string
  localOutputKeys: LocalOutputKeySummary[]
  providers: ModelInventoryProviderRow[]
}

export interface ModelInventoryProviderRow {
  id: string
  providerKind: string
  label: string
  family: string
  configured: boolean
  disabled?: boolean
  details: string[]
  models: ModelInventoryModelRow[]
  modelState: 'ready' | 'empty' | 'sync_unavailable'
  emptyMessage?: string
}

export interface ModelInventoryModelRow {
  id: string
  provider?: string
  source?: string
  channel?: string
  ownedBy?: string
}
