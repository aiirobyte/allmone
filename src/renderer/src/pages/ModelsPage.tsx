import type { FormEvent, ReactElement } from 'react'

import type {
  LocalOutputKeyActionInput,
  LocalOutputKeyCreateInput,
  LocalOutputKeyRenameFormInput,
  ViewState
} from '../rendererTypes'
import { isActionBusy, stringValue } from '../rendererUtils'

type ModelsPageProps = {
  state: ViewState
  runtimeReachable: boolean
  onRefresh: () => void
  onCreateGeneratedLocalOutputKey: (input: LocalOutputKeyCreateInput) => void
  onRenameLocalOutputKey: (input: LocalOutputKeyRenameFormInput) => void
  onRevealLocalOutputKey: (input: LocalOutputKeyActionInput) => void
  onDeleteLocalOutputKey: (input: LocalOutputKeyActionInput) => void
}

export function ModelsPage({
  state,
  runtimeReachable,
  onRefresh,
  onCreateGeneratedLocalOutputKey,
  onRenameLocalOutputKey,
  onRevealLocalOutputKey,
  onDeleteLocalOutputKey
}: ModelsPageProps): ReactElement {
  const inventory = state.modelInventory

  return (
    <section className="surface models-surface">
      <div className="section-heading">
        <h2>Model Inventory</h2>
        <span>{countModels(inventory?.providers ?? [])} models</span>
      </div>

      {state.modelInventoryError ? (
        <div className="diagnostic">
          <span>Models unavailable</span>
          <code>{state.modelInventoryError}</code>
        </div>
      ) : null}

      <LocalOutputKeys
        state={state}
        runtimeReachable={runtimeReachable}
        onCreateGeneratedLocalOutputKey={onCreateGeneratedLocalOutputKey}
        onRenameLocalOutputKey={onRenameLocalOutputKey}
        onRevealLocalOutputKey={onRevealLocalOutputKey}
        onDeleteLocalOutputKey={onDeleteLocalOutputKey}
      />

      <div className="models-header-row">
        <div>
          <h3>Providers</h3>
          <span>{inventory?.apiBaseUrl ?? 'Local API unavailable'}</span>
        </div>
        <button
          type="button"
          disabled={!runtimeReachable || isActionBusy(state.busyAction, 'refresh-models')}
          aria-busy={isActionBusy(state.busyAction, 'refresh-models') || undefined}
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="model-provider-list">
        {inventory?.providers.length ? (
          inventory.providers.map((provider) => (
            <article key={provider.id} className="model-provider-row">
              <div className="model-provider-main">
                <div>
                  <h3>{provider.label}</h3>
                  <span>{provider.providerKind} / {provider.family}</span>
                </div>
                <strong>{provider.disabled ? 'disabled' : 'configured'}</strong>
              </div>
              {provider.details.length > 0 ? (
                <div className="model-provider-details">
                  {provider.details.map((detail) => (
                    <code key={detail}>{detail}</code>
                  ))}
                </div>
              ) : null}
              <div className="model-chip-list">
                {provider.modelState === 'sync_unavailable' ? (
                  <span>{provider.emptyMessage ?? 'Model sync unavailable'}</span>
                ) : null}
                {provider.models.length > 0 ? (
                  provider.models.map((model) => (
                    <code key={model.id}>{model.id}</code>
                  ))
                ) : provider.modelState !== 'sync_unavailable' ? (
                  <span>{provider.emptyMessage ?? 'No models reported'}</span>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <strong>No configured providers</strong>
            <span>Provider resources added in Providers will appear here.</span>
          </div>
        )}
      </div>
    </section>
  )
}

function countModels(
  providers: Array<{ models: unknown[] }>
): number {
  return providers.reduce((count, provider) => count + provider.models.length, 0)
}

function LocalOutputKeys({
  state,
  runtimeReachable,
  onCreateGeneratedLocalOutputKey,
  onRenameLocalOutputKey,
  onRevealLocalOutputKey,
  onDeleteLocalOutputKey
}: Omit<ModelsPageProps, 'onRefresh'>): ReactElement {
  const keys = state.localOutputKeys

  function handleGenerate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onCreateGeneratedLocalOutputKey({
      name: stringValue(data.get('name')).trim()
    })
    event.currentTarget.reset()
  }

  return (
    <div className="local-output-keys">
      <div className="models-header-row">
        <div>
          <h3>Local Output Keys</h3>
          <span>{state.modelInventory?.serviceOrigin ?? 'Local service unavailable'}</span>
        </div>
      </div>

      <div className="key-form-grid">
        <form className="key-form" onSubmit={handleGenerate}>
          <label>
            <span>Name</span>
            <input name="name" required placeholder="Laptop client" />
          </label>
          <button
            type="submit"
            disabled={!runtimeReachable || isActionBusy(state.busyAction, 'create-local-output-key')}
          >
            Generate Key
          </button>
        </form>
      </div>

      {state.localOutputKeyPlaintext ? (
        <label className="one-time-key">
          <span>{state.localOutputKeyPlaintext.name}</span>
          <input readOnly value={state.localOutputKeyPlaintext.value} />
        </label>
      ) : null}

      <div className="key-list">
        {keys.map((key) => (
          <div key={key.id} className="key-row">
            <div>
              <strong>{key.name}</strong>
              <span>{key.isDefault ? 'default' : 'named'} / {key.preview}</span>
            </div>
            <div className="key-actions">
              <button
                type="button"
                disabled={!runtimeReachable}
                onClick={() => renameKey(key.id, key.name, onRenameLocalOutputKey)}
              >
                Rename
              </button>
              <button
                type="button"
                disabled={!runtimeReachable}
                onClick={() => onRevealLocalOutputKey({ id: key.id })}
              >
                Reveal
              </button>
              <button
                type="button"
                className="danger"
                disabled={!runtimeReachable}
                onClick={() => onDeleteLocalOutputKey({ id: key.id })}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function renameKey(
  id: string,
  currentName: string,
  onRenameLocalOutputKey: (input: LocalOutputKeyRenameFormInput) => void
): void {
  const name = window.prompt('Local output key name', currentName)

  if (!name) {
    return
  }

  onRenameLocalOutputKey({ id, name })
}
