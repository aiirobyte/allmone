import './styles.css'

import type {
  RuntimeConfigSummary,
  RuntimeOpenAiProviderSummary,
  RuntimeState
} from '../../main/runtime/types'
import type {
  LocalConnectionOutput,
  UpstreamAuthFileSummary,
  UpstreamProviderCatalogEntry,
  UpstreamProviderKind,
  UpstreamProviderSummary
} from '../../main/upstreams'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

const appRoot = app

type ModelDraft = {
  name: string
  alias: string
}

type ProviderDraft = {
  name: string
  baseUrl: string
  proxyUrl: string
  disabled: boolean
  models: ModelDraft[]
}

type ConfigLoadResult = {
  summary: RuntimeConfigSummary | null
  error: string | null
}

type SafeEndpointKind = 'api'

type ViewState = {
  appVersion: string
  runtimeState: RuntimeState | null
  configSummary: RuntimeConfigSummary | null
  configLoadError: string | null
  upstreamCatalog: UpstreamProviderCatalogEntry[]
  upstreamSummaries: UpstreamProviderSummary[]
  authFiles: UpstreamAuthFileSummary[]
  localConnection: LocalConnectionOutput | null
  localKeyPlaintext: string | null
  providerDraft: ProviderDraft
  selectedProviderName: string | null
  busyAction: string | null
  notice: string | null
  error: string | null
}

const emptyProviderDraft = (): ProviderDraft => ({
  name: '',
  baseUrl: '',
  proxyUrl: '',
  disabled: false,
  models: [{ name: '', alias: '' }]
})

const state: ViewState = {
  appVersion: '',
  runtimeState: null,
  configSummary: null,
  configLoadError: null,
  upstreamCatalog: [],
  upstreamSummaries: [],
  authFiles: [],
  localConnection: null,
  localKeyPlaintext: null,
  providerDraft: emptyProviderDraft(),
  selectedProviderName: null,
  busyAction: 'Loading',
  notice: null,
  error: null
}

let managedStateRefreshTimer: number | undefined

void bootstrap()

async function bootstrap(): Promise<void> {
  render()

  try {
    const [appVersion, runtimeState] = await Promise.all([
      window.allmone.app.getVersion(),
      window.allmone.runtime.getState()
    ])

    state.appVersion = appVersion
    state.runtimeState = runtimeState
    state.error = null

    const check = await window.allmone.runtime.testConnection()
    state.runtimeState = await window.allmone.runtime.getState()

    if (check.state === 'reachable') {
      const config = await loadConfigSummary()

      state.configSummary = config.summary
      state.configLoadError = config.error
      await loadUpstreams()
    } else {
      state.configSummary = null
      state.configLoadError = null
    }
  } catch (error) {
    state.error = toMessage(error)
  } finally {
    state.busyAction = null
    render()
    scheduleManagedStateRefresh()
  }
}

async function loadUpstreams(): Promise<void> {
  try {
    const [catalog, summaries, authFiles, localConnection] = await Promise.all([
      window.allmone.runtime.getUpstreamCatalog(),
      window.allmone.runtime.getUpstreamSummaries(),
      window.allmone.runtime.getAuthFiles(),
      window.allmone.runtime.getLocalConnectionOutput()
    ])

    state.upstreamCatalog = catalog
    state.upstreamSummaries = summaries
    state.authFiles = authFiles
    state.localConnection = localConnection
  } catch (error) {
    state.configLoadError = toMessage(error)
  }
}

async function loadConfigSummary(): Promise<ConfigLoadResult> {
  try {
    return {
      summary: await window.allmone.runtime.getConfigSummary(),
      error: null
    }
  } catch (error) {
    return {
      summary: null,
      error: toMessage(error)
    }
  }
}

function render(): void {
  appRoot.innerHTML = `
    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">allmone ${escapeHtml(state.appVersion || '0.1.3')}</p>
          <h1>Runtime Control</h1>
        </div>
        <div class="status-pill ${managedStatusClass(state.runtimeState?.managed?.status)}">
          <span class="status-dot"></span>
          ${escapeHtml(managedStatusLabel(state.runtimeState?.managed?.status))}
        </div>
      </header>

      ${renderFeedback()}

      ${renderManagedRuntimePanel()}

      ${renderUpstreamPanel()}

      <section class="surface provider-surface">
        <div class="section-heading">
          <h2>OpenAI-Compatible Providers</h2>
          <span>${providerCountLabel()}</span>
        </div>
        <div class="provider-grid">
          ${renderProviderList()}
          ${renderProviderForm()}
        </div>
      </section>
    </section>
  `

  bindEventHandlers()
}

function renderUpstreamPanel(): string {
  const local = state.localConnection
  const apiKeySummaries = state.upstreamSummaries.filter((summary) =>
    ['gemini-api-key', 'codex-api-key', 'claude-api-key', 'vertex-api-key', 'openai-compatibility'].includes(summary.providerKind)
  )
  const accountSummaries = state.upstreamSummaries.filter((summary) =>
    ['gemini-cli', 'aistudio', 'antigravity', 'claude', 'codex', 'kimi', 'vertex'].includes(summary.providerKind)
  )

  return `
    <section class="surface upstream-surface">
      <div class="section-heading">
        <h2>Upstream Setup</h2>
        <span>${state.upstreamCatalog.length || 0} supported</span>
      </div>

      <div class="upstream-grid">
        <div class="upstream-block">
          <h3>Local Service</h3>
          <code>${escapeHtml(local?.serviceOrigin ?? 'Unavailable')}</code>
          <span>${local?.localKeyConfigured ? 'Local key configured' : 'No local key'}</span>
          ${state.localKeyPlaintext ? `<input readonly value="${escapeHtml(state.localKeyPlaintext)}" />` : ''}
          <div class="button-row">
            <button type="button" data-action="generate-local-key" ${isRuntimeReachable() ? isBusy('generate-local-key') : 'disabled'}>Generate Key</button>
            <button type="button" data-action="set-local-key" ${isRuntimeReachable() ? isBusy('set-local-key') : 'disabled'}>Set Key</button>
          </div>
          <pre>${escapeHtml(local?.snippets.openAiSdk ?? '')}</pre>
        </div>

        <form id="upstream-api-form" class="upstream-block">
          <h3>API-Key Upstream</h3>
          <label>
            <span>Type</span>
            <select name="providerKind">
              ${apiKeyProviderOptions()}
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
            <input name="apiKey" type="password" autocomplete="off" required />
          </label>
          <button type="submit" ${isRuntimeReachable() ? isBusy('save-upstream-api') : 'disabled'}>Save Upstream</button>
        </form>

        <form id="amp-form" class="upstream-block">
          <h3>Amp</h3>
          <label>
            <span>Upstream URL</span>
            <input name="upstreamUrl" placeholder="https://..." />
          </label>
          <label>
            <span>Upstream Key</span>
            <input name="upstreamApiKey" type="password" autocomplete="off" />
          </label>
          <div class="button-row">
            <button type="submit" ${isRuntimeReachable() ? isBusy('save-amp') : 'disabled'}>Save Amp</button>
            <button type="button" data-action="reset-amp" ${isRuntimeReachable() ? isBusy('reset-amp') : 'disabled'}>Reset</button>
          </div>
        </form>
      </div>

      <div class="summary-list">
        ${apiKeySummaries.map(renderUpstreamSummary).join('')}
      </div>
      <div class="summary-list account-list">
        ${accountSummaries.map(renderAccountSummary).join('')}
      </div>
    </section>
  `
}

function apiKeyProviderOptions(): string {
  return ['gemini-api-key', 'codex-api-key', 'claude-api-key', 'vertex-api-key', 'openai-compatibility']
    .map((kind) => `<option value="${kind}">${escapeHtml(kind)}</option>`)
    .join('')
}

function renderUpstreamSummary(summary: UpstreamProviderSummary): string {
  return `
    <article class="summary-row">
      <div>
        <h3>${escapeHtml(summary.label)}</h3>
        <span>${summary.configured ? 'configured' : 'empty'}</span>
      </div>
    </article>
  `
}

function renderAccountSummary(summary: UpstreamProviderSummary): string {
  const loginAction = loginActionForProvider(summary.providerKind)

  return `
    <article class="summary-row">
      <div>
        <h3>${escapeHtml(summary.label)}</h3>
        <span>${summary.configured ? 'auth present' : 'no auth file'}</span>
      </div>
      ${loginAction ? `<button type="button" data-action="login-provider" data-login-kind="${loginAction}" ${isRuntimeReachable() ? isBusy(`login:${loginAction}`) : 'disabled'}>Login</button>` : ''}
    </article>
  `
}

function loginActionForProvider(providerKind: UpstreamProviderKind): string | null {
  switch (providerKind) {
    case 'gemini-cli':
      return 'gemini-cli-login'
    case 'antigravity':
      return 'antigravity-login'
    case 'claude':
      return 'claude-login'
    case 'codex':
      return 'codex-device-login'
    case 'kimi':
      return 'kimi-login'
    case 'vertex':
      return 'vertex-import'
    default:
      return null
  }
}

function renderFeedback(): string {
  if (state.error) {
    return `<div class="feedback feedback-error">${escapeHtml(state.error)}</div>`
  }

  if (state.notice) {
    return `<div class="feedback feedback-notice">${escapeHtml(state.notice)}</div>`
  }

  return ''
}

function renderManagedRuntimePanel(): string {
  const runtime = state.runtimeState
  const software = runtime?.software
  const managed = runtime?.managed
  const serviceOrigin = software?.runtime.serviceOrigin ?? ''
  const executablePath = software?.cliproxyapi.localExecutablePath ?? ''
  const releaseMetadataUrl = software?.cliproxyapi.releaseMetadataUrl ?? ''
  const installVersion = managed?.install?.version ?? 'Unknown'
  const managedStatus = managedStatusLabel(managed?.status)
  const canStart = canStartManagedRuntime()
  const canControlRunning = managed?.status === 'running'
  const canCheckUpdate = !isManagedBusy()

  return `
    <section class="surface managed-surface">
      <div class="section-heading">
        <h2>Managed CLIProxyAPI</h2>
        <span>${escapeHtml(managedStatus)}</span>
      </div>
      <div class="managed-grid">
        <form id="managed-runtime-form" class="managed-port-form">
          <label>
            <span>Output Port</span>
            <input
              name="port"
              type="number"
              min="1"
              max="65535"
              step="1"
              value="${software?.runtime.port ?? 8317}"
              required
            />
          </label>
          <button type="submit" ${isBusy('save-output-port')}>Save Port</button>
        </form>

        <div class="managed-actions">
          <button type="button" data-action="test-connection" ${isBusy('test-connection')}>
            Test
          </button>
          <button type="button" data-action="install-update" ${isBusy('install-update')}>
            Install / Retry
          </button>
          <button type="button" data-action="check-update" ${canCheckUpdate ? isBusy('check-update') : 'disabled'}>
            Check Update
          </button>
          <button type="button" data-action="start-runtime" ${canStart ? isBusy('start-runtime') : 'disabled'}>
            Start
          </button>
          <button type="button" data-action="restart-runtime" ${canControlRunning ? isBusy('restart-runtime') : 'disabled'}>
            Restart
          </button>
          <button type="button" data-action="stop-runtime" ${canControlRunning ? isBusy('stop-runtime') : 'disabled'}>
            Stop
          </button>
        </div>
      </div>

      <div class="managed-detail-grid">
        <div>
          <dt>Process</dt>
          <dd>${escapeHtml(managedStatus)}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>${escapeHtml(installVersion)}</dd>
        </div>
        <div>
          <dt>Service Origin</dt>
          <dd><code>${escapeHtml(serviceOrigin || 'Unavailable')}</code></dd>
        </div>
        <div>
          <dt>Executable</dt>
          <dd><code>${escapeHtml(executablePath || 'Unavailable')}</code></dd>
        </div>
        <div class="wide-detail">
          <dt>Release Metadata</dt>
          <dd><code>${escapeHtml(releaseMetadataUrl || 'Unavailable')}</code></dd>
        </div>
      </div>

      ${managed?.lastError ? renderDiagnostic(managed.lastError) : ''}
      ${renderStatusPanel()}
      <div class="copy-panel">
        ${renderCopyRow('Service Origin', serviceOrigin || null, 'api')}
      </div>
    </section>
  `
}

function renderStatusPanel(): string {
  const runtime = state.runtimeState

  return `
    <div class="state-action ${statusClass(runtime?.status)}">
      <strong>${escapeHtml(statusLabel(runtime?.status))}</strong>
      <span>${escapeHtml(nextActionForStatus(runtime?.status))}</span>
    </div>
    ${renderFirstLaunchHint()}
    <dl class="status-grid">
      <div>
        <dt>Status</dt>
        <dd>${escapeHtml(statusLabel(runtime?.status))}</dd>
      </div>
      <div>
        <dt>Key Storage</dt>
        <dd>${escapeHtml(connectionKeyLabel())}</dd>
      </div>
      <div>
        <dt>HTTP Status</dt>
        <dd>${runtime?.lastHttpStatus ?? 'None'}</dd>
      </div>
      <div>
        <dt>Last Test</dt>
        <dd>${escapeHtml(formatCheckedAt(runtime?.lastCheckedAt))}</dd>
      </div>
      <div>
        <dt>Client API Keys</dt>
        <dd>${state.configSummary?.apiKeysConfigured ?? 0}</dd>
      </div>
      <div>
        <dt>Request Log</dt>
        <dd>${state.configSummary?.requestLog === true ? 'Enabled' : 'Off'}</dd>
      </div>
    </dl>
    ${runtime?.lastError ? renderDiagnostic(runtime.lastError) : ''}
  `
}

function renderFirstLaunchHint(): string {
  const connection = state.runtimeState?.connection

  if (connection?.managementKeyConfigured) {
    return ''
  }

  return `
    <div class="empty-callout">
      <strong>No management key saved</strong>
      <span>Configure the CLIProxyAPI management key outside the renderer, then test.</span>
    </div>
  `
}

function renderDiagnostic(message: string): string {
  return `
    <div class="diagnostic">
      <span>Diagnostic</span>
      <code>${escapeHtml(message)}</code>
    </div>
  `
}

function renderCopyRow(
  label: string,
  value: string | null,
  kind: SafeEndpointKind
): string {
  return `
    <div class="copy-row">
      <div>
        <span>${escapeHtml(label)}</span>
        <code>${escapeHtml(value ?? 'Unavailable')}</code>
      </div>
      <button
        type="button"
        data-action="copy-endpoint"
        data-copy-kind="${kind}"
        ${value ? isBusy(`copy:${kind}`) : 'disabled'}
      >
        Copy
      </button>
    </div>
  `
}

function renderProviderList(): string {
  const providers = state.configSummary?.openAiCompatibilityProviders ?? []

  if (state.configLoadError) {
    return `
      <div class="empty-list">
        <strong>Config unavailable</strong>
        <span>Make the runtime reachable, then refresh.</span>
        <code>${escapeHtml(state.configLoadError)}</code>
      </div>
    `
  }

  if (!isRuntimeReachable() && !state.configSummary) {
    return `
      <div class="empty-list">
        <strong>Connect runtime</strong>
        <span>Save settings and test the Management API before editing providers.</span>
      </div>
    `
  }

  if (providers.length === 0) {
    return `
      <div class="empty-list">
        <strong>No providers</strong>
        <span>Add an OpenAI-compatible provider after the runtime is reachable.</span>
      </div>
    `
  }

  return `
    <div class="provider-list">
      ${providers.map(renderProviderItem).join('')}
    </div>
  `
}

function renderProviderItem(provider: RuntimeOpenAiProviderSummary): string {
  const active = provider.name === state.selectedProviderName
  const models = provider.models.length
  const keys = provider.apiKeyEntries.length
  const deleteDisabled = !isRuntimeReachable()
    ? 'disabled'
    : isBusy(`delete-provider:${provider.name}`)

  return `
    <article class="provider-row ${active ? 'selected' : ''}">
      <div>
        <h3>${escapeHtml(provider.name || 'Unnamed provider')}</h3>
        <p>${escapeHtml(provider.baseUrl || 'No base URL')}</p>
        <span>${models} models / ${keys} keys / ${provider.disabled ? 'disabled' : 'enabled'}</span>
      </div>
      <div class="row-actions">
        <button type="button" data-action="edit-provider" data-provider="${escapeHtml(provider.name)}">
          Edit
        </button>
        <button
          type="button"
          class="danger"
          data-action="delete-provider"
          data-provider="${escapeHtml(provider.name)}"
          ${deleteDisabled}
        >
          Delete
        </button>
      </div>
    </article>
  `
}

function renderProviderForm(): string {
  const draft = state.providerDraft
  const editing = Boolean(state.selectedProviderName)
  const providerWriteDisabled = !isRuntimeReachable()
  const submitDisabled = providerWriteDisabled
    ? 'disabled'
    : isBusy('save-provider')
  const nameReadonly = editing ? 'readonly' : ''
  const keyLabel = editing ? 'Replacement API Key' : 'Provider API Key'
  const proxyLabel = editing ? 'Proxy URL For Replacement' : 'Proxy URL'

  return `
    <form id="provider-form" class="provider-form">
      <div class="form-mode">
        <strong>${editing ? 'Editing provider' : 'New provider'}</strong>
        <span>${editing ? escapeHtml(state.selectedProviderName ?? '') : 'Ready for a new provider'}</span>
      </div>
      <div class="form-grid">
        <label>
          <span>${editing ? 'Provider Name (locked)' : 'Provider Name'}</span>
          <input name="name" value="${escapeHtml(draft.name)}" ${nameReadonly} required />
        </label>
        <label>
          <span>Base URL</span>
          <input name="baseUrl" type="url" value="${escapeHtml(draft.baseUrl)}" required />
        </label>
        <label>
          <span>${keyLabel}</span>
          <input
            name="apiKey"
            type="password"
            autocomplete="off"
            placeholder="${editing ? 'Type only to replace hidden saved keys' : 'Required when the provider needs a key'}"
          />
        </label>
        <label>
          <span>${proxyLabel}</span>
          <input name="proxyUrl" spellcheck="false" value="${escapeHtml(draft.proxyUrl)}" placeholder="Optional" />
        </label>
        <label class="checkbox-row">
          <input name="disabled" type="checkbox" ${draft.disabled ? 'checked' : ''} />
          <span>Disabled</span>
        </label>
      </div>

      <p class="form-note">
        ${editing ? 'Saved provider keys are hidden. A blank replacement key sends no key value.' : 'Provider secrets stay in the main process and are not stored in the renderer.'}
      </p>
      ${providerWriteDisabled ? '<p class="inline-warning">Provider writes are disabled until the runtime is reachable.</p>' : ''}

      <div class="models-header">
        <h3>Static Models</h3>
        <button type="button" data-action="add-model-row">Add Row</button>
      </div>
      <div class="model-rows">
        ${draft.models.map(renderModelRow).join('')}
      </div>

      <div class="button-row">
        <button type="submit" ${submitDisabled}>${editing ? 'Save Edits' : 'Add Provider'}</button>
        <button type="button" data-action="reset-provider">Reset</button>
      </div>
    </form>
  `
}

function renderModelRow(model: ModelDraft, index: number): string {
  return `
    <div class="model-row">
      <label>
        <span>Name</span>
        <input name="modelName" value="${escapeHtml(model.name)}" placeholder="upstream/model" />
      </label>
      <label>
        <span>Alias</span>
        <input name="modelAlias" value="${escapeHtml(model.alias)}" placeholder="client-facing name" />
      </label>
      <button
        type="button"
        class="icon-button"
        title="Remove model row"
        aria-label="Remove model row"
        data-action="remove-model-row"
        data-index="${index}"
      >
        x
      </button>
    </div>
  `
}

function bindEventHandlers(): void {
  document
    .querySelector<HTMLFormElement>('#managed-runtime-form')
    ?.addEventListener('submit', onManagedRuntimeSubmit)
  document
    .querySelector<HTMLFormElement>('#provider-form')
    ?.addEventListener('submit', onProviderSubmit)
  document
    .querySelector<HTMLFormElement>('#upstream-api-form')
    ?.addEventListener('submit', onUpstreamApiSubmit)
  document
    .querySelector<HTMLFormElement>('#amp-form')
    ?.addEventListener('submit', onAmpSubmit)
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', onActionClick)
  })
}

async function onUpstreamApiSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget

  if (!(form instanceof HTMLFormElement)) {
    return
  }

  const data = new FormData(form)
  const providerKind = stringValue(data.get('providerKind')) as UpstreamProviderKind
  const apiKey = stringValue(data.get('apiKey')).trim()

  await runAction('save-upstream-api', async () => {
    await window.allmone.runtime.upsertApiKeyUpstream({
      providerKind,
      apiKey,
      providerName: stringValue(data.get('providerName')).trim() || undefined,
      baseUrl: stringValue(data.get('baseUrl')).trim() || undefined,
      apiKeyEntries:
        providerKind === 'openai-compatibility'
          ? [{ apiKey }]
          : undefined
    })
    await loadUpstreams()
    state.notice = 'Upstream saved'
  })
}

async function onAmpSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget

  if (!(form instanceof HTMLFormElement)) {
    return
  }

  const data = new FormData(form)

  await runAction('save-amp', async () => {
    await window.allmone.runtime.writeAmpConfig({
      upstreamUrl: stringValue(data.get('upstreamUrl')).trim() || undefined,
      upstreamApiKey: stringValue(data.get('upstreamApiKey')).trim() || undefined
    })
    await loadUpstreams()
    state.notice = 'Amp saved'
  })
}

async function onManagedRuntimeSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget

  if (!(form instanceof HTMLFormElement)) {
    return
  }

  const data = new FormData(form)

  await runAction('save-output-port', async () => {
    state.runtimeState = await window.allmone.runtime.saveOutputPort(
      Number(data.get('port'))
    )
    state.configSummary = null
    state.configLoadError = null
    state.notice = 'Output port saved'
  })
}

async function onProviderSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget

  if (!(form instanceof HTMLFormElement)) {
    return
  }

  if (!isRuntimeReachable()) {
    state.error = 'Connect to CLIProxyAPI before saving providers'
    render()
    return
  }

  const data = new FormData(form)
  const apiKey = stringValue(data.get('apiKey')).trim()

  await runAction('save-provider', async () => {
    const result =
      await window.allmone.runtime.upsertOpenAiCompatibilityProvider({
        name: stringValue(data.get('name')).trim(),
        baseUrl: stringValue(data.get('baseUrl')).trim(),
        disabled: data.get('disabled') === 'on',
        apiKey: apiKey || undefined,
        proxyUrl: stringValue(data.get('proxyUrl')).trim(),
        models: readModelRows(form)
      })

    state.configSummary = result.summary
    state.configLoadError = null
    state.providerDraft = emptyProviderDraft()
    state.selectedProviderName = null
    state.notice = 'Provider saved'
  })
}

function onActionClick(event: Event): void {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  const action = target.dataset.action

  switch (action) {
    case 'test-connection':
      void testConnection()
      break
    case 'install-update':
      void managedCommand(
        'install-update',
        async () => {
          const updateState = await window.allmone.runtime.checkForUpdate()

          if (updateState.managed?.lastError) {
            return updateState
          }

          return await window.allmone.runtime.startManagedRuntime()
        },
        'Install/start requested'
      )
      break
    case 'check-update':
      void managedCommand(
        'check-update',
        () => window.allmone.runtime.checkForUpdate(),
        'Update check finished'
      )
      break
    case 'start-runtime':
      void managedCommand(
        'start-runtime',
        () => window.allmone.runtime.startManagedRuntime(),
        'Runtime started'
      )
      break
    case 'restart-runtime':
      void managedCommand(
        'restart-runtime',
        () => window.allmone.runtime.restartManagedRuntime(),
        'Runtime restarted'
      )
      break
    case 'stop-runtime':
      void managedCommand(
        'stop-runtime',
        () => window.allmone.runtime.stopManagedRuntime(),
        'Runtime stopped'
      )
      break
    case 'copy-endpoint':
      void copyEndpoint(target.dataset.copyKind)
      break
    case 'edit-provider':
      editProvider(target.dataset.provider ?? '')
      break
    case 'delete-provider':
      void deleteProvider(target.dataset.provider ?? '')
      break
    case 'add-model-row':
      state.providerDraft = readProviderDraftFromForm()
      state.providerDraft.models.push({ name: '', alias: '' })
      render()
      break
    case 'remove-model-row':
      state.providerDraft = readProviderDraftFromForm()
      state.providerDraft.models.splice(Number(target.dataset.index), 1)
      if (state.providerDraft.models.length === 0) {
        state.providerDraft.models.push({ name: '', alias: '' })
      }
      render()
      break
    case 'reset-provider':
      state.providerDraft = emptyProviderDraft()
      state.selectedProviderName = null
      render()
      break
    case 'generate-local-key':
      void generateLocalKey()
      break
    case 'set-local-key':
      void setLocalKey()
      break
    case 'reset-amp':
      void resetAmp()
      break
    case 'login-provider':
      void loginProvider(target.dataset.loginKind ?? '')
      break
  }
}

async function generateLocalKey(): Promise<void> {
  await runAction('generate-local-key', async () => {
    const result = await window.allmone.runtime.generateLocalApiKey()
    state.localKeyPlaintext = result.oneTimePlaintextKey ?? null
    await loadUpstreams()
    state.notice = 'Local key generated'
  })
}

async function setLocalKey(): Promise<void> {
  const apiKey = window.prompt('Local API key')

  if (!apiKey) {
    return
  }

  await runAction('set-local-key', async () => {
    const result = await window.allmone.runtime.setLocalApiKey(apiKey)
    state.localKeyPlaintext = result.oneTimePlaintextKey ?? null
    await loadUpstreams()
    state.notice = 'Local key saved'
  })
}

async function resetAmp(): Promise<void> {
  await runAction('reset-amp', async () => {
    await window.allmone.runtime.resetAmpConfig()
    await loadUpstreams()
    state.notice = 'Amp reset'
  })
}

async function loginProvider(kind: string): Promise<void> {
  if (!kind) {
    return
  }

  const importPath =
    kind === 'vertex-import'
      ? window.prompt('Vertex service-account JSON path') ?? undefined
      : undefined

  await runAction(`login:${kind}`, async () => {
    await window.allmone.runtime.runLoginAction({
      kind: kind as never,
      importPath
    })
    await loadUpstreams()
    state.notice = 'Login handoff finished'
  })
}

async function managedCommand(
  action: string,
  command: () => Promise<RuntimeState>,
  notice: string
): Promise<void> {
  await runAction(action, async () => {
    state.runtimeState = await command()
    if (state.runtimeState.managed?.lastError) {
      state.error = state.runtimeState.managed.lastError
      return
    }

    state.notice = notice
  })
}

async function testConnection(): Promise<void> {
  await runAction('test-connection', async () => {
    const result = await window.allmone.runtime.testConnection()

    state.runtimeState = await window.allmone.runtime.getState()
    if (result.state !== 'reachable') {
      state.configSummary = null
      state.configLoadError = null
      state.providerDraft = emptyProviderDraft()
      state.selectedProviderName = null
    }
    state.notice = `Connection ${statusLabel(result.state).toLowerCase()}`
  })
}

async function copyEndpoint(kind: string | undefined): Promise<void> {
  if (kind !== 'api') {
    return
  }

  await runAction(`copy:${kind}`, async () => {
    const result = await window.allmone.runtime.copyApiBase()
    state.notice = `Copied ${result.value}`
  })
}

function editProvider(name: string): void {
  const provider = state.configSummary?.openAiCompatibilityProviders.find(
    (item) => item.name === name
  )

  if (!provider) {
    return
  }

  state.providerDraft = {
    name: provider.name,
    baseUrl: provider.baseUrl,
    proxyUrl: '',
    disabled: provider.disabled,
    models:
      provider.models.length > 0
        ? provider.models.map((model) => ({
            name: model.name ?? '',
            alias: model.alias ?? ''
          }))
        : [{ name: '', alias: '' }]
  }
  state.selectedProviderName = provider.name
  render()
}

async function deleteProvider(name: string): Promise<void> {
  if (!name || !isRuntimeReachable()) {
    return
  }

  if (!window.confirm(`Delete provider "${name}"?`)) {
    return
  }

  await runAction(`delete-provider:${name}`, async () => {
    const result = await window.allmone.runtime.deleteOpenAiCompatibilityProvider({
      name
    })

    state.configSummary = result.summary
    state.configLoadError = null
    state.providerDraft = emptyProviderDraft()
    state.selectedProviderName = null
    state.notice = 'Provider deleted'
  })
}

async function runAction(
  action: string,
  callback: () => Promise<void>
): Promise<void> {
  state.busyAction = action
  state.error = null
  state.notice = null
  render()

  try {
    await callback()
  } catch (error) {
    state.error = toMessage(error)
  } finally {
    state.busyAction = null
    render()
    scheduleManagedStateRefresh()
  }
}

function scheduleManagedStateRefresh(): void {
  if (!isManagedBusy() || managedStateRefreshTimer) {
    return
  }

  managedStateRefreshTimer = window.setTimeout(async () => {
    managedStateRefreshTimer = undefined

    try {
      state.runtimeState = await window.allmone.runtime.getState()
      if (state.runtimeState.status === 'reachable') {
        await loadUpstreams()
      }
      state.error = null
    } catch (error) {
      state.error = toMessage(error)
    } finally {
      render()
      scheduleManagedStateRefresh()
    }
  }, 1_000)
}

function readProviderDraftFromForm(): ProviderDraft {
  const form = document.querySelector<HTMLFormElement>('#provider-form')

  if (!form) {
    return state.providerDraft
  }

  const data = new FormData(form)

  return {
    name: stringValue(data.get('name')).trim(),
    baseUrl: stringValue(data.get('baseUrl')).trim(),
    proxyUrl: stringValue(data.get('proxyUrl')).trim(),
    disabled: data.get('disabled') === 'on',
    models: readModelRows(form).map((model) => ({
      name: model.name ?? '',
      alias: model.alias ?? ''
    }))
  }
}

function readModelRows(form: HTMLFormElement): ModelDraft[] {
  const names = form.querySelectorAll<HTMLInputElement>('input[name="modelName"]')
  const aliases = form.querySelectorAll<HTMLInputElement>(
    'input[name="modelAlias"]'
  )
  const rows: ModelDraft[] = []

  names.forEach((input, index) => {
    const name = input.value.trim()
    const alias = aliases[index]?.value.trim() ?? ''

    if (name) {
      rows.push({ name, alias })
    }
  })

  return rows
}

function connectionKeyLabel(): string {
  const connection = state.runtimeState?.connection

  if (!connection?.managementKeyConfigured) {
    return 'Key not saved'
  }

  return connection.managementKeyPersisted ? 'Key encrypted' : 'Key in memory'
}

function providerCountLabel(): string {
  if (!state.configSummary) {
    return 'Config not loaded'
  }

  const count = state.configSummary.openAiCompatibilityProviders.length
  return `${count} provider${count === 1 ? '' : 's'}`
}

function statusLabel(status: RuntimeState['status'] | undefined): string {
  switch (status) {
    case 'reachable':
      return 'Reachable'
    case 'auth_required':
      return 'Auth Required'
    case 'management_disabled':
      return 'Management Disabled'
    case 'unreachable':
      return 'Unreachable'
    case 'timeout':
      return 'Timeout'
    case 'invalid_response':
      return 'Invalid Response'
    case 'unexpected_error':
      return 'Unexpected Error'
    default:
      return 'Loading'
  }
}

function managedStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'installing':
      return 'Installing'
    case 'ready':
      return 'Not started'
    case 'starting':
      return 'Starting'
    case 'running':
      return 'Running'
    case 'stopping':
      return 'Stopping'
    case 'stopped':
      return 'Not started'
    case 'crashed':
      return 'Not started'
    case 'update_failed':
      return 'Not installed'
    case 'launch_failed':
      return 'Not started'
    default:
      return 'Not installed'
  }
}

function nextActionForStatus(status: RuntimeState['status'] | undefined): string {
  switch (status) {
    case 'reachable':
      return 'Refresh config or edit providers.'
    case 'auth_required':
      return 'Enter or replace the management key, then test again.'
    case 'management_disabled':
      return 'Enable the CLIProxyAPI Management API before continuing.'
    case 'unreachable':
      return 'Confirm CLIProxyAPI is running and the URL is correct.'
    case 'timeout':
      return 'Increase the timeout or check whether the runtime is blocked.'
    case 'invalid_response':
      return 'Verify this URL points to the CLIProxyAPI Management API.'
    case 'unexpected_error':
      return 'Review the redacted diagnostic, then retry.'
    default:
      return 'Loading local runtime state.'
  }
}

function statusClass(status: RuntimeState['status'] | undefined): string {
  switch (status) {
    case 'reachable':
      return 'status-ok'
    case 'auth_required':
    case 'management_disabled':
      return 'status-warn'
    case 'unreachable':
    case 'timeout':
    case 'invalid_response':
    case 'unexpected_error':
      return 'status-error'
    default:
      return 'status-idle'
  }
}

function managedStatusClass(status: string | undefined): string {
  switch (status) {
    case 'running':
      return 'status-ok'
    case 'installing':
    case 'starting':
    case 'stopping':
      return 'status-warn'
    case 'ready':
    case 'stopped':
    case 'crashed':
    case 'launch_failed':
    case 'update_failed':
    default:
      return 'status-error'
  }
}

function isRuntimeReachable(): boolean {
  return state.runtimeState?.status === 'reachable'
}

function isManagedBusy(): boolean {
  const status = state.runtimeState?.managed?.status

  return status === 'installing' || status === 'starting' || status === 'stopping'
}

function canStartManagedRuntime(): boolean {
  const status = state.runtimeState?.managed?.status

  return !isManagedBusy() && status !== 'running'
}

function formatCheckedAt(value: string | undefined): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString()
}

function isBusy(action: string): string {
  return state.busyAction === action ? 'disabled aria-busy="true"' : ''
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected runtime error'
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : ''
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return character
    }
  })
}
