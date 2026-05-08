import './styles.css'

import type {
  RuntimeConfigSummary,
  RuntimeOpenAiProviderSummary,
  RuntimeState
} from '../../main/runtime/types'

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

type SafeEndpointKind = 'management' | 'origin' | 'api'

type ViewState = {
  appVersion: string
  runtimeState: RuntimeState | null
  configSummary: RuntimeConfigSummary | null
  configLoadError: string | null
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
  providerDraft: emptyProviderDraft(),
  selectedProviderName: null,
  busyAction: 'Loading',
  notice: null,
  error: null
}

void bootstrap()

async function bootstrap(): Promise<void> {
  render()

  try {
    const [appVersion, runtimeState] = await Promise.all([
      window.allmone.app.getVersion(),
      window.allmone.runtime.getState()
    ])
    const config = await loadConfigSummary()

    state.appVersion = appVersion
    state.runtimeState = runtimeState
    state.configSummary = config.summary
    state.configLoadError = config.error
    state.error = null
  } catch (error) {
    state.error = toMessage(error)
  } finally {
    state.busyAction = null
    render()
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
        <div class="status-pill ${statusClass(state.runtimeState?.status)}">
          <span class="status-dot"></span>
          ${escapeHtml(statusLabel(state.runtimeState?.status))}
        </div>
      </header>

      ${renderFeedback()}

      ${renderManagedRuntimePanel()}

      <div class="layout">
        <section class="surface connection-surface">
          <div class="section-heading">
            <h2>Connection</h2>
            <span>${escapeHtml(connectionKeyLabel())}</span>
          </div>
          ${renderConnectionForm()}
          ${renderStatusPanel()}
        </section>

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
      </div>
    </section>
  `

  bindEventHandlers()
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
  const apiBaseUrl = software?.runtime.apiBaseUrl ?? ''
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
          <dt>API Base</dt>
          <dd><code>${escapeHtml(apiBaseUrl || 'Unavailable')}</code></dd>
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
      <div class="copy-panel">
        ${renderCopyRow('API Base', apiBaseUrl || null, 'api')}
      </div>
    </section>
  `
}

function renderConnectionForm(): string {
  const connection = state.runtimeState?.connection

  return `
    <form id="connection-form" class="form-grid">
      <label>
        <span>Management URL</span>
        <input
          name="baseUrl"
          type="url"
          spellcheck="false"
          value="${escapeHtml(connection?.baseUrl ?? 'http://localhost:8317/v0/management')}"
          required
        />
      </label>
      <label>
        <span>Timeout</span>
        <input
          name="timeoutMs"
          type="number"
          min="500"
          step="500"
          value="${connection?.timeoutMs ?? 5000}"
          required
        />
      </label>
      <label class="full-row">
        <span>Management Key</span>
        <input
          name="managementKey"
          type="password"
          autocomplete="off"
          placeholder="${connection?.managementKeyConfigured ? 'Saved key is kept in main process' : 'Required by CLIProxyAPI'}"
        />
      </label>
      <label class="checkbox-row">
        <input name="clearManagementKey" type="checkbox" />
        <span>Clear saved key</span>
      </label>
      <div class="button-row">
        <button type="submit" ${isBusy('save-connection')}>Save</button>
        <button type="button" data-action="test-connection" ${isBusy('test-connection')}>
          Test
        </button>
        <button type="button" data-action="refresh-config" ${isBusy('refresh-config')}>
          Refresh
        </button>
      </div>
    </form>
  `
}

function renderStatusPanel(): string {
  const runtime = state.runtimeState
  const connection = runtime?.connection
  const managementUrl = getSafeEndpoint('management')
  const serviceOrigin = getSafeEndpoint('origin')

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
    <div class="copy-panel">
      ${renderCopyRow('Management URL', managementUrl, 'management')}
      ${renderCopyRow('Service Origin', serviceOrigin, 'origin')}
    </div>
    ${connection && !managementUrl ? '<p class="inline-warning">Management URL is not a valid URL.</p>' : ''}
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
      <span>Enter the CLIProxyAPI management key, save, then test.</span>
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
    .querySelector<HTMLFormElement>('#connection-form')
    ?.addEventListener('submit', onConnectionSubmit)
  document
    .querySelector<HTMLFormElement>('#provider-form')
    ?.addEventListener('submit', onProviderSubmit)
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', onActionClick)
  })
}

async function onConnectionSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget

  if (!(form instanceof HTMLFormElement)) {
    return
  }

  const data = new FormData(form)
  const managementKey = stringValue(data.get('managementKey')).trim()

  await runAction('save-connection', async () => {
    state.runtimeState = await window.allmone.runtime.saveConnectionSettings({
      baseUrl: stringValue(data.get('baseUrl')).trim(),
      timeoutMs: Number(data.get('timeoutMs')),
      managementKey: managementKey || undefined,
      clearManagementKey: data.get('clearManagementKey') === 'on'
    })
    state.configSummary = null
    state.configLoadError = null
    state.providerDraft = emptyProviderDraft()
    state.selectedProviderName = null
    state.notice = 'Connection settings saved'
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
    case 'refresh-config':
      void refreshConfig()
      break
    case 'install-update':
      void managedCommand(
        'install-update',
        () => window.allmone.runtime.ensureInstalledThenStart(),
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
  }
}

async function managedCommand(
  action: string,
  command: () => Promise<RuntimeState>,
  notice: string
): Promise<void> {
  await runAction(action, async () => {
    state.runtimeState = await command()
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

async function refreshConfig(): Promise<void> {
  await runAction('refresh-config', async () => {
    const check = await window.allmone.runtime.testConnection()

    state.runtimeState = await window.allmone.runtime.getState()
    state.configSummary = null
    state.configLoadError = null

    if (check.state !== 'reachable') {
      throw new Error(nextActionForStatus(check.state))
    }

    const config = await loadConfigSummary()
    state.configSummary = config.summary
    state.configLoadError = config.error

    if (config.error) {
      throw new Error(`Config refresh failed: ${config.error}`)
    }

    state.notice = 'Configuration refreshed'
  })
}

async function copyEndpoint(kind: string | undefined): Promise<void> {
  if (kind !== 'management' && kind !== 'origin' && kind !== 'api') {
    return
  }

  await runAction(`copy:${kind}`, async () => {
    if (kind === 'api') {
      const result = await window.allmone.runtime.copyApiBase()
      state.notice = `Copied ${result.value}`
      return
    }

    const value = getSafeEndpoint(kind)

    if (!value) {
      throw new Error('Endpoint is unavailable')
    }

    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard is unavailable')
    }

    await navigator.clipboard.writeText(value)
    state.notice = `Copied ${kind === 'management' ? 'Management URL' : 'Service Origin'}`
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
  }
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
      return 'Ready'
    case 'starting':
      return 'Starting'
    case 'running':
      return 'Running'
    case 'stopping':
      return 'Stopping'
    case 'stopped':
      return 'Stopped'
    case 'crashed':
      return 'Crashed'
    case 'update_failed':
      return 'Update Failed'
    case 'launch_failed':
      return 'Launch Failed'
    default:
      return 'Missing'
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
      return 'Loading local runtime settings.'
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

function getSafeEndpoint(kind: SafeEndpointKind): string | null {
  const baseUrl = state.runtimeState?.connection.baseUrl.trim()

  if (!baseUrl) {
    return null
  }

  const url = toSafeUrl(baseUrl)

  if (!url) {
    return null
  }

  return kind === 'origin' ? url.origin : url.toString()
}

function toSafeUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    return url
  } catch {
    return null
  }
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
