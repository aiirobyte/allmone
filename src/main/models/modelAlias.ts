import type { ModelInventoryModelRow } from './types'

export interface ProviderModelAliasRow {
  name?: string
  alias?: string
  fork?: boolean
  [key: string]: unknown
}

export const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_]+$/

export interface ReconcileModelAliasesInput {
  existingAliases: ProviderModelAliasRow[]
  upstreamModelIds: string[]
}

export interface ReconcileGeneratedModelAliasesInput
  extends ReconcileModelAliasesInput {
  providerId: string
}

export interface ReconcileModelAliasesResult {
  aliases: ProviderModelAliasRow[]
  changed: boolean
}

export function isValidProviderId(value: unknown): value is string {
  return typeof value === 'string' && PROVIDER_ID_PATTERN.test(value)
}

export function validateProviderId(value: unknown): string {
  if (!isValidProviderId(value)) {
    throw new Error('Provider id must use only letters, numbers, and underscores')
  }

  return value
}

export function buildGeneratedModelAlias(
  providerId: string,
  rawModelId: string
): string {
  validateProviderId(providerId)
  return `${providerId}-${rawModelId}`
}

export function projectEffectiveModelRows(
  value: unknown
): ModelInventoryModelRow[] {
  if (!Array.isArray(value)) {
    return []
  }

  const rows: ModelInventoryModelRow[] = []
  const seen = new Set<string>()

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const name = getString(item.name)
    const alias = getString(item.alias)

    if (alias) {
      pushConfiguredRow(rows, seen, alias)
    }

    if (name && (!alias || item.fork === true)) {
      pushConfiguredRow(rows, seen, name)
    }
  }

  return rows
}

export function reconcileModelAliases(
  input: ReconcileModelAliasesInput
): ReconcileModelAliasesResult {
  const aliases = input.existingAliases.map((row) => ({ ...row }))
  const byName = new Set(
    aliases
      .map((row) => normalizeModelId(row.name))
      .filter((name): name is string => Boolean(name))
  )
  let changed = false

  for (let index = 0; index < aliases.length; index += 1) {
    const row = aliases[index]
    const name = normalizeModelId(row.name)

    if (name && normalizeModelId(row.alias) === undefined) {
      aliases[index] = { ...row, alias: name }
      changed = true
    }
  }

  for (const modelId of input.upstreamModelIds) {
    const name = normalizeModelId(modelId)

    if (!name || byName.has(name)) {
      continue
    }

    byName.add(name)
    aliases.push({ name, alias: name })
    changed = true
  }

  return {
    aliases,
    changed
  }
}

export function reconcileGeneratedModelAliases(
  input: ReconcileGeneratedModelAliasesInput
): ReconcileModelAliasesResult {
  const providerId = validateProviderId(input.providerId)
  const aliases = input.existingAliases.map((row) => ({ ...row }))
  const byName = new Map<string, number>()
  let changed = false

  aliases.forEach((row, index) => {
    const name = getModelId(row.name)

    if (name && !byName.has(name)) {
      byName.set(name, index)
    }
  })

  for (const modelId of input.upstreamModelIds) {
    const name = getModelId(modelId)

    if (!name) {
      continue
    }

    const alias = buildGeneratedModelAlias(providerId, name)
    const index = byName.get(name)

    if (index === undefined) {
      byName.set(name, aliases.length)
      aliases.push({ name, alias, fork: true })
      changed = true
      continue
    }

    const current = aliases[index]

    if (current.name !== name || current.alias !== alias || current.fork !== true) {
      aliases[index] = { ...current, name, alias, fork: true }
      changed = true
    }
  }

  return {
    aliases,
    changed
  }
}

function pushConfiguredRow(
  rows: ModelInventoryModelRow[],
  seen: Set<string>,
  id: string
): void {
  const key = id.toLowerCase()

  if (seen.has(key)) {
    return
  }

  seen.add(key)
  rows.push({
    id,
    source: 'configured'
  })
}

function normalizeModelId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getString(value: unknown): string | undefined {
  return normalizeModelId(value)
}

function getModelId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
