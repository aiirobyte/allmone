import type { FormEvent, ReactElement } from 'react'

import type {
  RuntimeModelOutputTestResult,
  RuntimeOutputPortConnectivityResult,
  RuntimeState
} from '../../../main/runtime/types'
import { CopyRow } from '../components/CopyRow'
import { Diagnostic, RuntimeStatusPanel } from '../components/Status'
import type {
  ModelOutputTestFormInput,
  SafeEndpointKind,
  ViewState
} from '../rendererTypes'
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
  onTestOutputPortConnectivity: () => void
  onTestModelOutput: (input: ModelOutputTestFormInput) => void
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
  onTestOutputPortConnectivity,
  onTestModelOutput,
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
      <OutputPortTests
        state={state}
        onTestOutputPortConnectivity={onTestOutputPortConnectivity}
        onTestModelOutput={onTestModelOutput}
      />
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

function OutputPortTests({
  state,
  onTestOutputPortConnectivity,
  onTestModelOutput
}: {
  state: ViewState
  onTestOutputPortConnectivity: () => void
  onTestModelOutput: (input: ModelOutputTestFormInput) => void
}): ReactElement {
  function handleModelSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    onTestModelOutput({
      model: stringField(data.get('model')),
      apiKey: stringField(data.get('apiKey')),
      prompt: stringField(data.get('prompt')) || undefined
    })
  }

  return (
    <div className="output-test-panel">
      <div className="section-heading">
        <h3>Output Port Tests</h3>
        <span>{state.outputPortTest?.state ?? 'idle'}</span>
      </div>
      <div className="output-test-grid">
        <div className="output-test-card">
          <button
            type="button"
            disabled={isActionBusy(state.busyAction, 'test-output-port')}
            aria-busy={
              isActionBusy(state.busyAction, 'test-output-port') || undefined
            }
            onClick={onTestOutputPortConnectivity}
          >
            Test Port
          </button>
          <ConnectivityResult result={state.outputPortTest} />
        </div>

        <form className="output-test-card" onSubmit={handleModelSubmit}>
          <div className="compact-form-grid">
            <label>
              <span>Model</span>
              <input name="model" placeholder="model alias" required />
            </label>
            <label>
              <span>Local API Key</span>
              <input
                name="apiKey"
                type="password"
                placeholder="ak-..."
                autoComplete="off"
                required
              />
            </label>
            <label className="wide-field">
              <span>Prompt</span>
              <input name="prompt" placeholder="Reply with OK." />
            </label>
          </div>
          <button
            type="submit"
            disabled={isActionBusy(state.busyAction, 'test-model-output')}
            aria-busy={
              isActionBusy(state.busyAction, 'test-model-output') || undefined
            }
          >
            Run Model
          </button>
          <ModelOutputResult result={state.modelOutputTest} />
        </form>
      </div>
    </div>
  )
}

function ConnectivityResult({
  result
}: {
  result: RuntimeOutputPortConnectivityResult | null
}): ReactElement {
  if (!result) {
    return <p className="muted">Not tested</p>
  }

  return (
    <dl className="output-test-result">
      <div>
        <dt>Status</dt>
        <dd>{result.state}</dd>
      </div>
      <div>
        <dt>Target</dt>
        <dd>
          <code>{result.target}</code>
        </dd>
      </div>
      <div>
        <dt>Latency</dt>
        <dd>{formatLatency(result.latencyMs)}</dd>
      </div>
      {result.error ? (
        <div className="wide-detail">
          <dt>Error</dt>
          <dd>{result.error}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function ModelOutputResult({
  result
}: {
  result: RuntimeModelOutputTestResult | null
}): ReactElement {
  if (!result) {
    return <p className="muted">Not tested</p>
  }

  return (
    <dl className="output-test-result">
      <div>
        <dt>Status</dt>
        <dd>{result.state}</dd>
      </div>
      <div>
        <dt>Model</dt>
        <dd>{result.model}</dd>
      </div>
      <div>
        <dt>HTTP</dt>
        <dd>{result.status ?? 'None'}</dd>
      </div>
      <div>
        <dt>Latency</dt>
        <dd>{formatLatency(result.latencyMs)}</dd>
      </div>
      <div className="wide-detail">
        <dt>Target</dt>
        <dd>
          <code>{result.target}</code>
        </dd>
      </div>
      {result.outputText ? (
        <div className="wide-detail">
          <dt>Output</dt>
          <dd>{result.outputText}</dd>
        </div>
      ) : null}
      {result.error ? (
        <div className="wide-detail">
          <dt>Error</dt>
          <dd>{result.error}</dd>
        </div>
      ) : null}
    </dl>
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

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function formatLatency(value: number | undefined): string {
  return typeof value === 'number' ? `${value} ms` : 'Unknown'
}
