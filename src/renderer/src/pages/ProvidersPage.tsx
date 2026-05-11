import type { FormEvent, ReactElement } from 'react'

import type {
  UpstreamAuthFileSummary,
  UpstreamLoginActionKind,
  UpstreamProviderKind,
  UpstreamProviderSummary
} from '../../../main/upstreams'
import type {
  AmpFormInput,
  UpstreamApiFormInput,
  ViewState
} from '../rendererTypes'
import {
  ACCOUNT_PROVIDER_KINDS,
  API_KEY_PROVIDER_KINDS,
  isActionBusy,
  loginActionForProvider,
  stringValue
} from '../rendererUtils'

type ProvidersPageProps = {
  state: ViewState
  runtimeReachable: boolean
  onSaveApiKeyUpstream: (input: UpstreamApiFormInput) => void
  onSaveAmp: (input: AmpFormInput) => void
  onResetAmp: () => void
  onLoginProvider: (kind: UpstreamLoginActionKind) => void
  onDeleteApiKeyUpstream: (
    providerKind: UpstreamProviderKind,
    index: number
  ) => void
  onDeleteAuthFile: (name: string) => void
}

export function ProvidersPage({
  state,
  runtimeReachable,
  onSaveApiKeyUpstream,
  onSaveAmp,
  onResetAmp,
  onLoginProvider,
  onDeleteApiKeyUpstream,
  onDeleteAuthFile
}: ProvidersPageProps): ReactElement {
  const apiKeySummaries = state.upstreamSummaries.filter((summary) =>
    API_KEY_PROVIDER_KINDS.includes(summary.providerKind)
  )
  const accountSummaries = state.upstreamSummaries.filter((summary) =>
    ACCOUNT_PROVIDER_KINDS.includes(summary.providerKind)
  )

  return (
    <section className="surface upstream-surface">
      <div className="section-heading">
        <h2>Upstream Setup</h2>
        <span>{state.upstreamCatalog.length || 0} supported</span>
      </div>

      {state.configLoadError ? (
        <div className="diagnostic">
          <span>Config unavailable</span>
          <code>{state.configLoadError}</code>
        </div>
      ) : null}

      {state.codexDeviceLogin || state.loginOutput.length > 0 ? (
        <ProviderLoginPanel state={state} />
      ) : null}

      <div className="upstream-grid">
        <ApiKeyUpstreamForm
          busyAction={state.busyAction}
          runtimeReachable={runtimeReachable}
          onSubmit={onSaveApiKeyUpstream}
        />
        <AmpForm
          busyAction={state.busyAction}
          runtimeReachable={runtimeReachable}
          onSubmit={onSaveAmp}
          onReset={onResetAmp}
        />
      </div>

      <div className="summary-list">
        {apiKeySummaries.map((summary) => (
          <UpstreamSummary
            key={summary.providerKind}
            summary={summary}
            busyAction={state.busyAction}
            runtimeReachable={runtimeReachable}
            onSaveApiKeyUpstream={onSaveApiKeyUpstream}
            onDeleteApiKeyUpstream={onDeleteApiKeyUpstream}
          />
        ))}
      </div>
      <div className="summary-list account-list">
        {accountSummaries.map((summary) => (
          <AccountSummary
            key={summary.providerKind}
            summary={summary}
            authFiles={state.authFiles.filter(
              (file) => file.providerKind === summary.providerKind
            )}
            busyAction={state.busyAction}
            runtimeReachable={runtimeReachable}
            onLoginProvider={onLoginProvider}
            onDeleteAuthFile={onDeleteAuthFile}
          />
        ))}
      </div>
    </section>
  )
}

function ProviderLoginPanel({ state }: { state: ViewState }): ReactElement {
  const deviceLogin = state.codexDeviceLogin

  return (
    <div className="upstream-block login-event-panel" aria-live="polite">
      <h3>Provider Login</h3>
      {deviceLogin ? (
        <>
          <a href={deviceLogin.url} target="_blank" rel="noreferrer">
            {deviceLogin.url}
          </a>
          <label>
            <span>Device Code</span>
            <input readOnly value={deviceLogin.code} />
          </label>
        </>
      ) : null}
      {state.loginOutput.length > 0 ? (
        <pre>{state.loginOutput.join('')}</pre>
      ) : null}
    </div>
  )
}

function ApiKeyUpstreamForm({
  busyAction,
  runtimeReachable,
  onSubmit
}: {
  busyAction: string | null
  runtimeReachable: boolean
  onSubmit: (input: UpstreamApiFormInput) => void
}): ReactElement {
  const busy = isActionBusy(busyAction, 'save-upstream-api')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    onSubmit({
      providerKind: stringValue(data.get('providerKind')) as UpstreamProviderKind,
      providerId: stringValue(data.get('providerId')),
      apiKey: stringValue(data.get('apiKey')).trim(),
      providerName: stringValue(data.get('providerName')).trim() || undefined,
      baseUrl: stringValue(data.get('baseUrl')).trim() || undefined
    })
    event.currentTarget.reset()
  }

  return (
    <form className="upstream-block" onSubmit={handleSubmit}>
      <h3>API-Key Upstream</h3>
      <label>
        <span>Type</span>
        <select name="providerKind">
          {API_KEY_PROVIDER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Provider ID</span>
        <input
          name="providerId"
          required
          pattern="[A-Za-z0-9_]+"
          autoComplete="off"
        />
      </label>
      <label>
        <span>Provider Name</span>
        <input name="providerName" placeholder="OpenAI-compatible only" />
      </label>
      <label>
        <span>Base URL</span>
        <input name="baseUrl" placeholder="Optional for most providers" />
      </label>
      <label>
        <span>API Key</span>
        <input name="apiKey" type="password" autoComplete="off" required />
      </label>
      <button
        type="submit"
        disabled={!runtimeReachable || busy}
        aria-busy={busy || undefined}
      >
        Save Upstream
      </button>
    </form>
  )
}

function AmpForm({
  busyAction,
  runtimeReachable,
  onSubmit,
  onReset
}: {
  busyAction: string | null
  runtimeReachable: boolean
  onSubmit: (input: AmpFormInput) => void
  onReset: () => void
}): ReactElement {
  const saveBusy = isActionBusy(busyAction, 'save-amp')
  const resetBusy = isActionBusy(busyAction, 'reset-amp')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    onSubmit({
      upstreamUrl: stringValue(data.get('upstreamUrl')).trim() || undefined,
      upstreamApiKey:
        stringValue(data.get('upstreamApiKey')).trim() || undefined
    })
    event.currentTarget.reset()
  }

  return (
    <form className="upstream-block" onSubmit={handleSubmit}>
      <h3>Amp</h3>
      <label>
        <span>Upstream URL</span>
        <input name="upstreamUrl" placeholder="https://..." />
      </label>
      <label>
        <span>Upstream Key</span>
        <input name="upstreamApiKey" type="password" autoComplete="off" />
      </label>
      <div className="button-row">
        <button
          type="submit"
          disabled={!runtimeReachable || saveBusy}
          aria-busy={saveBusy || undefined}
        >
          Save Amp
        </button>
        <button
          type="button"
          disabled={!runtimeReachable || resetBusy}
          aria-busy={resetBusy || undefined}
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </form>
  )
}

function UpstreamSummary({
  summary,
  busyAction,
  runtimeReachable,
  onSaveApiKeyUpstream,
  onDeleteApiKeyUpstream
}: {
  summary: UpstreamProviderSummary
  busyAction: string | null
  runtimeReachable: boolean
  onSaveApiKeyUpstream: (input: UpstreamApiFormInput) => void
  onDeleteApiKeyUpstream: (
    providerKind: UpstreamProviderKind,
    index: number
  ) => void
}): ReactElement {
  const entries = Array.isArray(summary.entries) ? summary.entries : []
  const statusText =
    entries.length === 0
      ? summary.configured ? 'configured' : 'empty'
      : entries.length === 1
        ? '1 entry'
        : `${entries.length} entries`

  return (
    <article className="summary-row provider-summary-row">
      <div className="provider-summary-header">
        <div>
          <h3>{summary.label}</h3>
          <span>{statusText}</span>
        </div>
      </div>
      {entries.length > 0 ? (
        <div className="provider-entry-list">
          {entries.map((entry, index) => (
            <ProviderEntryRow
              key={`${summary.providerKind}-${index}`}
              summary={summary}
              entry={entry}
              index={index}
              busyAction={busyAction}
              runtimeReachable={runtimeReachable}
              onSaveApiKeyUpstream={onSaveApiKeyUpstream}
              onDeleteApiKeyUpstream={onDeleteApiKeyUpstream}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function ProviderEntryRow({
  summary,
  entry,
  index,
  busyAction,
  runtimeReachable,
  onSaveApiKeyUpstream,
  onDeleteApiKeyUpstream
}: {
  summary: UpstreamProviderSummary
  entry: unknown
  index: number
  busyAction: string | null
  runtimeReachable: boolean
  onSaveApiKeyUpstream: (input: UpstreamApiFormInput) => void
  onDeleteApiKeyUpstream: (
    providerKind: UpstreamProviderKind,
    index: number
  ) => void
}): ReactElement {
  const action = `delete-upstream-api:${summary.providerKind}:${index}`
  const busy = isActionBusy(busyAction, action)
  const record = isRecord(entry) ? entry : {}
  const label =
    summary.providerKind === 'openai-compatibility'
      ? stringField(record, 'name') ?? `Provider ${index + 1}`
      : `${summary.label} ${index + 1}`
  const metadata = [
    stringField(record, 'providerId'),
    stringField(record, 'baseUrl') ?? stringField(record, 'base-url'),
    stringField(record, 'prefix'),
    stringField(record, 'proxy-url'),
    record.disabled === true ? 'disabled' : null,
    Array.isArray(record.apiKeyEntries)
      ? `${record.apiKeyEntries.length} keys`
      : null
  ].filter(Boolean)

  return (
    <div className="provider-entry-row">
      <div className="provider-entry-header">
        <div>
          <strong>{label}</strong>
          {metadata.length > 0 ? <span>{metadata.join(' / ')}</span> : null}
        </div>
        <button
          type="button"
          className="danger"
          disabled={!runtimeReachable || busy}
          aria-busy={busy || undefined}
          onClick={() => onDeleteApiKeyUpstream(summary.providerKind, index)}
        >
          Delete
        </button>
      </div>
      <ProviderEntryEditor
        summary={summary}
        record={record}
        index={index}
        runtimeReachable={runtimeReachable}
        busyAction={busyAction}
        onSaveApiKeyUpstream={onSaveApiKeyUpstream}
      />
    </div>
  )
}

function ProviderEntryEditor({
  summary,
  record,
  index,
  runtimeReachable,
  busyAction,
  onSaveApiKeyUpstream
}: {
  summary: UpstreamProviderSummary
  record: Record<string, unknown>
  index: number
  runtimeReachable: boolean
  busyAction: string | null
  onSaveApiKeyUpstream: (input: UpstreamApiFormInput) => void
}): ReactElement {
  const busy = isActionBusy(busyAction, 'save-upstream-api')
  const supportsExcludedModels = summary.providerKind !== 'openai-compatibility'
  const supportsProviderName = summary.providerKind === 'openai-compatibility'

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const apiKey = stringValue(data.get('apiKey')).trim()

    onSaveApiKeyUpstream({
      providerKind: summary.providerKind,
      entryIndex: index,
      providerId: stringValue(data.get('providerId')),
      providerName: supportsProviderName
        ? stringValue(data.get('providerName')).trim()
        : undefined,
      baseUrl: stringValue(data.get('baseUrl')).trim() || undefined,
      apiKey: apiKey || undefined,
      disabled: record.disabled === true ? true : undefined,
      modelAliases: parseModelAliases(stringValue(data.get('modelAliases'))),
      excludedModels: supportsExcludedModels
        ? parseExcludedModels(stringValue(data.get('excludedModels')))
        : undefined
    })
  }

  return (
    <details className="provider-model-editor">
      <summary>Edit</summary>
      <form onSubmit={handleSubmit}>
        {supportsProviderName ? (
          <label>
            <span>Provider Name</span>
            <input
              name="providerName"
              defaultValue={stringField(record, 'name') ?? ''}
              required
            />
          </label>
        ) : null}
        <label>
          <span>Provider ID</span>
          <input
            name="providerId"
            defaultValue={stringField(record, 'providerId') ?? ''}
            required
            pattern="[A-Za-z0-9_]+"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Base URL</span>
          <input
            name="baseUrl"
            defaultValue={stringField(record, 'baseUrl') ?? stringField(record, 'base-url') ?? ''}
            placeholder="Optional for most providers"
          />
        </label>
        <label>
          <span>API Key</span>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder="Leave blank to keep current key"
          />
        </label>
        <label>
          <span>Model Aliases</span>
          <textarea
            name="modelAliases"
            rows={3}
            defaultValue={formatModelAliases(record)}
            placeholder="upstream-model = local-alias"
          />
        </label>
        {supportsExcludedModels ? (
          <label>
            <span>Excluded Models</span>
            <textarea
              name="excludedModels"
              rows={2}
              defaultValue={formatExcludedModels(record)}
              placeholder="deprecated-model"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={!runtimeReachable || busy}
          aria-busy={busy || undefined}
        >
          Save Entry
        </button>
      </form>
    </details>
  )
}

function AccountSummary({
  summary,
  authFiles,
  busyAction,
  runtimeReachable,
  onLoginProvider,
  onDeleteAuthFile
}: {
  summary: UpstreamProviderSummary
  authFiles: UpstreamAuthFileSummary[]
  busyAction: string | null
  runtimeReachable: boolean
  onLoginProvider: (kind: UpstreamLoginActionKind) => void
  onDeleteAuthFile: (name: string) => void
}): ReactElement {
  const loginAction = loginActionForProvider(summary.providerKind)
  const busy = loginAction ? isActionBusy(busyAction, `login:${loginAction}`) : false
  const authCount = authFiles.length
  const statusText =
    authCount === 0
      ? 'no auth file'
      : authCount === 1
        ? '1 auth file'
        : `${authCount} auth files`

  return (
    <article className="summary-row account-summary-row">
      <div className="account-summary-header">
        <div>
          <h3>{summary.label}</h3>
          <span>{statusText}</span>
        </div>
        {loginAction ? (
          <button
            type="button"
            disabled={!runtimeReachable || busy}
            aria-busy={busy || undefined}
            onClick={() => onLoginProvider(loginAction)}
          >
            {loginAction === 'vertex-import' ? 'Import' : 'Add Auth'}
          </button>
        ) : null}
      </div>
      {authFiles.length > 0 ? (
        <div className="auth-file-list">
          {authFiles.map((file, index) => (
            <AuthFileRow
              key={file.name ?? file.id ?? `${file.providerKind}-${index}`}
              file={file}
              busyAction={busyAction}
              runtimeReachable={runtimeReachable}
              onDeleteAuthFile={onDeleteAuthFile}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function AuthFileRow({
  file,
  busyAction,
  runtimeReachable,
  onDeleteAuthFile
}: {
  file: UpstreamAuthFileSummary
  busyAction: string | null
  runtimeReachable: boolean
  onDeleteAuthFile: (name: string) => void
}): ReactElement {
  const deleteAction = file.name ? `delete-auth-file:${file.name}` : null
  const busy = deleteAction ? isActionBusy(busyAction, deleteAction) : false
  const metadata = [
    file.status,
    file.source,
    file.disabled ? 'disabled' : null,
    file.redactedPath
  ].filter(Boolean)

  return (
    <div className="auth-file-row">
      <div>
        <strong>{file.label ?? file.name ?? 'Auth file'}</strong>
        {metadata.length > 0 ? <span>{metadata.join(' / ')}</span> : null}
        {file.diagnostics?.length ? (
          <code>{file.diagnostics.join(' / ')}</code>
        ) : null}
      </div>
      {file.name ? (
        <button
          type="button"
          className="danger"
          disabled={!runtimeReachable || busy}
          aria-busy={busy || undefined}
          onClick={() => onDeleteAuthFile(file.name as string)}
        >
          Delete
        </button>
      ) : null}
    </div>
  )
}

function formatModelAliases(record: Record<string, unknown>): string {
  return arrayField(record.models)
    .map((item) => {
      const model = isRecord(item) ? item : {}
      const name = stringField(model, 'name')
      const alias = stringField(model, 'alias')

      if (!name) {
        return null
      }

      return alias ? `${name} = ${alias}` : name
    })
    .filter((item): item is string => Boolean(item))
    .join('\n')
}

function formatExcludedModels(record: Record<string, unknown>): string {
  return arrayField(record['excluded-models'])
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .join('\n')
}

function parseModelAliases(value: string): UpstreamApiFormInput['modelAliases'] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.match(/\s*(?:=>|=)\s*/)

      if (!separator || separator.index === undefined) {
        return { name: line }
      }

      const name = line.slice(0, separator.index).trim()
      const alias = line.slice(separator.index + separator[0].length).trim()

      return alias ? { name, alias } : { name }
    })
    .filter((row) => Boolean(row.name))
}

function parseExcludedModels(value: string): UpstreamApiFormInput['excludedModels'] {
  return value
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((pattern) => ({ pattern }))
}

function arrayField(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(
  value: Record<string, unknown>,
  field: string
): string | undefined {
  const item = value[field]
  return typeof item === 'string' && item.trim() ? item : undefined
}
