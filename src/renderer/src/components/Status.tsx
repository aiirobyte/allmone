import type { ReactElement } from 'react'

import type {
  RuntimeConfigSummary,
  RuntimeState
} from '../../../main/runtime/types'
import {
  formatCheckedAt,
  managedStatusClass,
  managedStatusLabel,
  nextActionForStatus,
  statusClass,
  statusLabel
} from '../rendererUtils'

type ManagedStatusPillProps = {
  runtimeState: RuntimeState | null
  busyAction: string | null
}

type RuntimeStatusPanelProps = {
  runtimeState: RuntimeState | null
  configSummary: RuntimeConfigSummary | null
}

export function ManagedStatusPill({
  runtimeState,
  busyAction
}: ManagedStatusPillProps): ReactElement {
  const managedStatus = runtimeState?.managed?.status
  const label = busyAction === 'Loading' ? 'Loading renderer' : managedStatusLabel(managedStatus)

  return (
    <div className={`status-pill ${managedStatusClass(managedStatus)}`}>
      <span className="status-dot"></span>
      {label}
    </div>
  )
}

export function RuntimeStatusPanel({
  runtimeState,
  configSummary
}: RuntimeStatusPanelProps): ReactElement {
  return (
    <>
      <div className={`state-action ${statusClass(runtimeState?.status)}`}>
        <strong>{statusLabel(runtimeState?.status)}</strong>
        <span>{nextActionForStatus(runtimeState?.status)}</span>
      </div>
      <FirstLaunchHint runtimeState={runtimeState} />
      <dl className="status-grid">
        <div>
          <dt>Status</dt>
          <dd>{statusLabel(runtimeState?.status)}</dd>
        </div>
        <div>
          <dt>Key Storage</dt>
          <dd>{connectionKeyLabel(runtimeState)}</dd>
        </div>
        <div>
          <dt>HTTP Status</dt>
          <dd>{runtimeState?.lastHttpStatus ?? 'None'}</dd>
        </div>
        <div>
          <dt>Last Test</dt>
          <dd>{formatCheckedAt(runtimeState?.lastCheckedAt)}</dd>
        </div>
        <div>
          <dt>Client API Keys</dt>
          <dd>{configSummary?.apiKeysConfigured ?? 0}</dd>
        </div>
        <div>
          <dt>Request Log</dt>
          <dd>{configSummary?.requestLog === true ? 'Enabled' : 'Off'}</dd>
        </div>
      </dl>
      {runtimeState?.lastError ? (
        <Diagnostic message={runtimeState.lastError} />
      ) : null}
    </>
  )
}

export function Diagnostic({ message }: { message: string }): ReactElement {
  return (
    <div className="diagnostic">
      <span>Diagnostic</span>
      <code>{message}</code>
    </div>
  )
}

function FirstLaunchHint({
  runtimeState
}: {
  runtimeState: RuntimeState | null
}): ReactElement | null {
  if (runtimeState?.connection.managementKeyConfigured) {
    return null
  }

  return (
    <div className="empty-callout">
      <strong>No management key saved</strong>
      <span>
        Configure the CLIProxyAPI management key outside the renderer, then test.
      </span>
    </div>
  )
}

function connectionKeyLabel(runtimeState: RuntimeState | null): string {
  const connection = runtimeState?.connection

  if (!connection?.managementKeyConfigured) {
    return 'Key not saved'
  }

  return connection.managementKeyPersisted ? 'Key encrypted' : 'Key in memory'
}
