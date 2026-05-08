import type { FormEvent, ReactElement } from 'react'

import type { RuntimeState } from '../../../main/runtime/types'
import { CopyRow } from '../components/CopyRow'
import { Diagnostic, RuntimeStatusPanel } from '../components/Status'
import type { SafeEndpointKind, ViewState } from '../rendererTypes'
import {
  canStartManagedRuntime,
  isActionBusy,
  isManagedBusy,
  managedStatusLabel
} from '../rendererUtils'

type SettingsPageProps = {
  state: ViewState
  onSaveOutputPort: (port: number) => void
  onTestConnection: () => void
  onInstallUpdate: () => void
  onCheckUpdate: () => void
  onStartRuntime: () => void
  onRestartRuntime: () => void
  onStopRuntime: () => void
  onCopyEndpoint: (kind: SafeEndpointKind) => void
}

export function SettingsPage({
  state,
  onSaveOutputPort,
  onTestConnection,
  onInstallUpdate,
  onCheckUpdate,
  onStartRuntime,
  onRestartRuntime,
  onStopRuntime,
  onCopyEndpoint
}: SettingsPageProps): ReactElement {
  const runtime = state.runtimeState
  const software = runtime?.software
  const managed = runtime?.managed
  const serviceOrigin = software?.runtime.serviceOrigin ?? ''
  const executablePath = software?.cliproxyapi.localExecutablePath ?? ''
  const releaseMetadataUrl = software?.cliproxyapi.releaseMetadataUrl ?? ''
  const installVersion = managed?.install?.version ?? 'Unknown'
  const managedStatus = managedStatusLabel(managed?.status)

  function handlePortSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    onSaveOutputPort(Number(data.get('port')))
  }

  return (
    <section className="surface managed-surface">
      <div className="section-heading">
        <h2>Managed CLIProxyAPI</h2>
        <span>{managedStatus}</span>
      </div>
      <div className="managed-grid">
        <form className="managed-port-form" onSubmit={handlePortSubmit}>
          <label>
            <span>Output Port</span>
            <input
              name="port"
              type="number"
              min="1"
              max="65535"
              step="1"
              defaultValue={software?.runtime.port ?? 8317}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isActionBusy(state.busyAction, 'save-output-port')}
            aria-busy={
              isActionBusy(state.busyAction, 'save-output-port') || undefined
            }
          >
            Save Port
          </button>
        </form>

        <ManagedActions
          runtime={runtime}
          busyAction={state.busyAction}
          onTestConnection={onTestConnection}
          onInstallUpdate={onInstallUpdate}
          onCheckUpdate={onCheckUpdate}
          onStartRuntime={onStartRuntime}
          onRestartRuntime={onRestartRuntime}
          onStopRuntime={onStopRuntime}
        />
      </div>

      <div className="managed-detail-grid">
        <div>
          <dt>Process</dt>
          <dd>{managedStatus}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{installVersion}</dd>
        </div>
        <div>
          <dt>Service Origin</dt>
          <dd>
            <code>{serviceOrigin || 'Unavailable'}</code>
          </dd>
        </div>
        <div>
          <dt>Executable</dt>
          <dd>
            <code>{executablePath || 'Unavailable'}</code>
          </dd>
        </div>
        <div className="wide-detail">
          <dt>Release Metadata</dt>
          <dd>
            <code>{releaseMetadataUrl || 'Unavailable'}</code>
          </dd>
        </div>
      </div>

      {managed?.lastError ? <Diagnostic message={managed.lastError} /> : null}
      <RuntimeStatusPanel
        runtimeState={state.runtimeState}
        configSummary={state.configSummary}
      />
      <div className="copy-panel">
        <CopyRow
          label="Service Origin"
          value={serviceOrigin || null}
          kind="api"
          busy={isActionBusy(state.busyAction, 'copy:api')}
          onCopy={onCopyEndpoint}
        />
      </div>
    </section>
  )
}

function ManagedActions({
  runtime,
  busyAction,
  onTestConnection,
  onInstallUpdate,
  onCheckUpdate,
  onStartRuntime,
  onRestartRuntime,
  onStopRuntime
}: {
  runtime: RuntimeState | null
  busyAction: string | null
  onTestConnection: () => void
  onInstallUpdate: () => void
  onCheckUpdate: () => void
  onStartRuntime: () => void
  onRestartRuntime: () => void
  onStopRuntime: () => void
}): ReactElement {
  const canControlRunning = runtime?.managed?.status === 'running'
  const canCheckUpdate = !isManagedBusy(runtime)

  return (
    <div className="managed-actions">
      <ActionButton
        action="test-connection"
        busyAction={busyAction}
        onClick={onTestConnection}
      >
        Test
      </ActionButton>
      <ActionButton
        action="install-update"
        busyAction={busyAction}
        onClick={onInstallUpdate}
      >
        Install / Retry
      </ActionButton>
      <ActionButton
        action="check-update"
        busyAction={busyAction}
        disabled={!canCheckUpdate}
        onClick={onCheckUpdate}
      >
        Check Update
      </ActionButton>
      <ActionButton
        action="start-runtime"
        busyAction={busyAction}
        disabled={!canStartManagedRuntime(runtime)}
        onClick={onStartRuntime}
      >
        Start
      </ActionButton>
      <ActionButton
        action="restart-runtime"
        busyAction={busyAction}
        disabled={!canControlRunning}
        onClick={onRestartRuntime}
      >
        Restart
      </ActionButton>
      <ActionButton
        action="stop-runtime"
        busyAction={busyAction}
        disabled={!canControlRunning}
        onClick={onStopRuntime}
      >
        Stop
      </ActionButton>
    </div>
  )
}

function ActionButton({
  action,
  busyAction,
  disabled = false,
  onClick,
  children
}: {
  action: string
  busyAction: string | null
  disabled?: boolean
  onClick: () => void
  children: string
}): ReactElement {
  const busy = isActionBusy(busyAction, action)

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
