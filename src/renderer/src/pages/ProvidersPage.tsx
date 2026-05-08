import type { FormEvent, ReactElement } from 'react'

import type {
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
  onGenerateLocalKey: () => void
  onSetLocalKey: () => void
  onSaveApiKeyUpstream: (input: UpstreamApiFormInput) => void
  onSaveAmp: (input: AmpFormInput) => void
  onResetAmp: () => void
  onLoginProvider: (kind: UpstreamLoginActionKind) => void
}

export function ProvidersPage({
  state,
  runtimeReachable,
  onGenerateLocalKey,
  onSetLocalKey,
  onSaveApiKeyUpstream,
  onSaveAmp,
  onResetAmp,
  onLoginProvider
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
        <LocalConnectionCard
          state={state}
          runtimeReachable={runtimeReachable}
          onGenerateLocalKey={onGenerateLocalKey}
          onSetLocalKey={onSetLocalKey}
        />
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
          <UpstreamSummary key={summary.providerKind} summary={summary} />
        ))}
      </div>
      <div className="summary-list account-list">
        {accountSummaries.map((summary) => (
          <AccountSummary
            key={summary.providerKind}
            summary={summary}
            busyAction={state.busyAction}
            runtimeReachable={runtimeReachable}
            onLoginProvider={onLoginProvider}
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

function LocalConnectionCard({
  state,
  runtimeReachable,
  onGenerateLocalKey,
  onSetLocalKey
}: {
  state: ViewState
  runtimeReachable: boolean
  onGenerateLocalKey: () => void
  onSetLocalKey: () => void
}): ReactElement {
  const local = state.localConnection

  return (
    <div className="upstream-block">
      <h3>Local Service</h3>
      <code>{local?.serviceOrigin ?? 'Unavailable'}</code>
      <span>{local?.localKeyConfigured ? 'Local key configured' : 'No local key'}</span>
      {state.localKeyPlaintext ? (
        <input readOnly value={state.localKeyPlaintext} />
      ) : null}
      <div className="button-row">
        <button
          type="button"
          disabled={!runtimeReachable || isActionBusy(state.busyAction, 'generate-local-key')}
          aria-busy={isActionBusy(state.busyAction, 'generate-local-key') || undefined}
          onClick={onGenerateLocalKey}
        >
          Generate Key
        </button>
        <button
          type="button"
          disabled={!runtimeReachable || isActionBusy(state.busyAction, 'set-local-key')}
          aria-busy={isActionBusy(state.busyAction, 'set-local-key') || undefined}
          onClick={onSetLocalKey}
        >
          Set Key
        </button>
      </div>
      <pre>{local?.snippets.openAiSdk ?? ''}</pre>
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
  summary
}: {
  summary: UpstreamProviderSummary
}): ReactElement {
  return (
    <article className="summary-row">
      <div>
        <h3>{summary.label}</h3>
        <span>{summary.configured ? 'configured' : 'empty'}</span>
      </div>
    </article>
  )
}

function AccountSummary({
  summary,
  busyAction,
  runtimeReachable,
  onLoginProvider
}: {
  summary: UpstreamProviderSummary
  busyAction: string | null
  runtimeReachable: boolean
  onLoginProvider: (kind: UpstreamLoginActionKind) => void
}): ReactElement {
  const loginAction = loginActionForProvider(summary.providerKind)
  const busy = loginAction ? isActionBusy(busyAction, `login:${loginAction}`) : false

  return (
    <article className="summary-row">
      <div>
        <h3>{summary.label}</h3>
        <span>{summary.configured ? 'auth present' : 'no auth file'}</span>
      </div>
      {loginAction ? (
        <button
          type="button"
          disabled={!runtimeReachable || busy}
          aria-busy={busy || undefined}
          onClick={() => onLoginProvider(loginAction)}
        >
          Login
        </button>
      ) : null}
    </article>
  )
}
