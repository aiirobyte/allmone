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
  disabled: boolean
  models: ModelDraft[]
}

type ViewState = {
  appVersion: string
  runtimeState: RuntimeState | null
  configSummary: RuntimeConfigSummary | null
  providerDraft: ProviderDraft
  selectedProviderName: string | null
  busyAction: string | null
  notice: string | null
  error: string | null
}

const emptyProviderDraft = (): ProviderDraft => ({
  name: '',
  baseUrl: '',
  disabled: false,
  models: [{ name: '', alias: '' }]
})

const state: ViewState = {
  appVersion: '',
  runtimeState: null,
  configSummary: null,
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
    const [appVersion, runtimeState, configSummary] = await Promise.all([
      window.allmone.app.getVersion(),
      window.allmone.runtime.getState(),
      loadConfigSummary()
    ])

    state.appVersion = appVersion
    state.runtimeState = runtimeState
    state.configSummary = configSummary
    state.error = null
  } catch (error) {
    state.error = toMessage(error)
  } finally {
    state.busyAction = null
    render()
  }
}

async function loadConfigSummary(): Promise<RuntimeConfigSummary | null> {
  try {
    return await window.allmone.runtime.getConfigSummary()
  } catch {
    return null
  }
}

function render(): void {
  appRoot.innerHTML = `
    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">allmone ${escapeHtml(state.appVersion || '0.1.2')}</p>
          <h1>Runtime Control</h1>
        </div>
        <div class="status-pill ${statusClass(state.runtimeState?.status)}">
          <span class="status-dot"></span>
          ${escapeHtml(statusLabel(state.runtimeState?.status))}
        </div>
      </header>

      ${renderFeedback()}

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
  const connection = state.runtimeState?.connection

  return `
    <dl class="status-grid">
      <div>
        <dt>Status</dt>
        <dd>${escapeHtml(statusLabel(state.runtimeState?.status))}</dd>
      </div>
      <div>
        <dt>Key Storage</dt>
        <dd>${escapeHtml(connectionKeyLabel())}</dd>
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
  `
}

function renderProviderList(): string {
  const providers = state.configSummary?.openAiCompatibilityProviders ?? []

  if (providers.length === 0) {
    return `
      <div class="empty-list">
        <strong>No providers</strong>
        <span>Add an OpenAI-compatible provider to expose static model aliases.</span>
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

  return `
    <article class="provider-row ${active ? 'selected' : ''}">
      <div>
        <h3>${escapeHtml(provider.name || 'Unnamed provider')}</h3>
        <p>${escapeHtml(provider.baseUrl || 'No base URL')}</p>
        <span>${models} models · ${keys} keys · ${provider.disabled ? 'disabled' : 'enabled'}</span>
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
          ${isBusy(`delete-provider:${provider.name}`)}
        >
          Delete
        </button>
      </div>
    </article>
  `
}

function renderProviderForm(): string {
  const draft = state.providerDraft

  return `
    <form id="provider-form" class="provider-form">
      <div class="form-grid">
        <label>
          <span>Provider Name</span>
          <input name="name" value="${escapeHtml(draft.name)}" required />
        </label>
        <label>
          <span>Base URL</span>
          <input name="baseUrl" type="url" value="${escapeHtml(draft.baseUrl)}" required />
        </label>
        <label>
          <span>Provider API Key</span>
          <input
            name="apiKey"
            type="password"
            autocomplete="off"
            placeholder="Required for add/update"
          />
        </label>
        <label>
          <span>Proxy URL</span>
          <input name="proxyUrl" spellcheck="false" placeholder="Optional" />
        </label>
        <label class="checkbox-row">
          <input name="disabled" type="checkbox" ${draft.disabled ? 'checked' : ''} />
          <span>Disabled</span>
        </label>
      </div>

      <div class="models-header">
        <h3>Static Models</h3>
        <button type="button" data-action="add-model-row">Add Row</button>
      </div>
      <div class="model-rows">
        ${draft.models.map(renderModelRow).join('')}
      </div>

      <div class="button-row">
        <button type="submit" ${isBusy('save-provider')}>Save Provider</button>
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
        ×
      </button>
    </div>
  `
}

function bindEventHandlers(): void {
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
    state.notice = 'Connection settings saved'
  })
}

async function onProviderSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget

  if (!(form instanceof HTMLFormElement)) {
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
      void runAction('test-connection', async () => {
        const result = await window.allmone.runtime.testConnection()
        state.runtimeState = await window.allmone.runtime.getState()
        state.notice = `Connection ${statusLabel(result.state).toLowerCase()}`
      })
      break
    case 'refresh-config':
      void refreshConfig()
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

async function refreshConfig(): Promise<void> {
  await runAction('refresh-config', async () => {
    state.runtimeState = await window.allmone.runtime.getState()
    state.configSummary = await window.allmone.runtime.getConfigSummary()
    state.notice = 'Configuration refreshed'
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
  if (!name) {
    return
  }

  await runAction(`delete-provider:${name}`, async () => {
    const result = await window.allmone.runtime.deleteOpenAiCompatibilityProvider({
      name
    })

    state.configSummary = result.summary
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
  const count = state.configSummary?.openAiCompatibilityProviders.length ?? 0
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
