import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'

import type { RuntimeState } from '../../main/runtime/types'
import type { ProviderLoginEvent, ProviderLoginRunInput } from '../../main/upstreams'
import { createInitialViewState } from './appState'
import { Feedback } from './components/Feedback'
import { Sidebar } from './components/Sidebar'
import { ManagedStatusPill } from './components/Status'
import { ModelsPage } from './pages/ModelsPage'
import { ProvidersPage } from './pages/ProvidersPage'
import { SettingsPage } from './pages/SettingsPage'
import type {
  ActiveSection,
  AmpFormInput,
  ConfigLoadResult,
  LocalOutputKeyActionInput,
  LocalOutputKeyActionResult,
  LocalOutputKeyCreateInput,
  LocalOutputKeyPlaintext,
  LocalOutputKeyRenameFormInput,
  ModelOutputTestFormInput,
  SafeEndpointKind,
  UpstreamApiFormInput,
  ViewState
} from './rendererTypes'
import {
  isManagedBusy,
  isRuntimeReachable,
  statusLabel,
  toMessage
} from './rendererUtils'

export type AppProps = {
  appVersion?: string
  initialSection?: ActiveSection
}

export function App({
  appVersion = '',
  initialSection = 'models'
}: AppProps): ReactElement {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>(initialSection)
  const [state, setState] = useState<ViewState>(() =>
    createInitialViewState(appVersion)
  )

  useEffect(() => {
    let mounted = true

    async function bootstrap(): Promise<void> {
      try {
        const [loadedAppVersion, runtimeState] = await Promise.all([
          window.allmone.app.getVersion(),
          window.allmone.runtime.getState()
        ])

        const check = await window.allmone.runtime.testConnection()
        const refreshedRuntimeState = await window.allmone.runtime.getState()
        const patch: Partial<ViewState> = {
          appVersion: loadedAppVersion,
          runtimeState: refreshedRuntimeState,
          error: null
        }

        if (check.state === 'reachable') {
          const config = await loadConfigSummary()
          Object.assign(patch, {
            configSummary: config.summary,
            configLoadError: config.error
          })
          Object.assign(patch, await loadUpstreams())
          Object.assign(patch, await loadModelInventory())
        } else {
          Object.assign(patch, {
            configSummary: null,
            configLoadError: null,
            upstreamCatalog: [],
            upstreamSummaries: [],
            authFiles: [],
            localConnection: null,
            modelInventory: null,
            modelInventoryError: null,
            localOutputKeys: [],
            localOutputKeyPlaintext: null
          })
        }

        if (mounted) {
          setState((current) => ({
            ...current,
            ...patch,
            busyAction: null
          }))
        }
      } catch (error) {
        if (mounted) {
          setState((current) => ({
            ...current,
            error: toMessage(error),
            busyAction: null
          }))
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return window.allmone.runtime.onLoginEvent((event) => {
      setState((current) => applyLoginEvent(current, event))
    })
  }, [])

  useEffect(() => {
    if (!isManagedBusy(state.runtimeState)) {
      return
    }

    const timer = window.setTimeout(() => {
      void refreshManagedState()
    }, 1_000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [state.runtimeState?.managed?.status])

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

  async function loadUpstreams(): Promise<Partial<ViewState>> {
    try {
      const [catalog, summaries, authFiles, localConnection] = await Promise.all([
        window.allmone.runtime.getUpstreamCatalog(),
        window.allmone.runtime.getUpstreamSummaries(),
        window.allmone.runtime.getAuthFiles(),
        window.allmone.runtime.getLocalConnectionOutput()
      ])

      return {
        upstreamCatalog: catalog,
        upstreamSummaries: summaries,
        authFiles,
        localConnection,
        configLoadError: null
      }
    } catch (error) {
      return {
        configLoadError: toMessage(error)
      }
    }
  }

  async function loadModelInventory(): Promise<Partial<ViewState>> {
    try {
      const inventory = await window.allmone.runtime.getModelInventory()

      return {
        modelInventory: inventory,
        localOutputKeys: inventory.localOutputKeys,
        modelInventoryError: null
      }
    } catch (error) {
      const patch: Partial<ViewState> = {
        modelInventoryError: toMessage(error)
      }

      try {
        patch.localOutputKeys =
          await window.allmone.runtime.getLocalOutputKeys()
      } catch {
        // Keep existing key summaries when the fallback read also fails.
      }

      return patch
    }
  }

  async function refreshManagedState(): Promise<void> {
    try {
      const runtimeState = await window.allmone.runtime.getState()
      const patch: Partial<ViewState> = {
        runtimeState,
        error: null
      }

      if (runtimeState.status === 'reachable') {
        Object.assign(patch, await loadUpstreams())
        Object.assign(patch, await loadModelInventory())
      }

      setState((current) => ({
        ...current,
        ...patch
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        error: toMessage(error)
      }))
    }
  }

  async function runAction(
    action: string,
    callback: () => Promise<Partial<ViewState>>
  ): Promise<void> {
    const resetLoginState = action.startsWith('login:')

    setState((current) => ({
      ...current,
      codexDeviceLogin: resetLoginState ? null : current.codexDeviceLogin,
      loginOutput: resetLoginState ? [] : current.loginOutput,
      busyAction: action,
      error: null,
      notice: null
    }))

    try {
      const patch = await callback()

      setState((current) => ({
        ...current,
        ...patch
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        error: toMessage(error)
      }))
    } finally {
      setState((current) => ({
        ...current,
        busyAction: null
      }))
    }
  }

  function saveApiKeyUpstream(input: UpstreamApiFormInput): void {
    void runAction('save-upstream-api', async () => {
      await window.allmone.runtime.upsertApiKeyUpstream({
        providerKind: input.providerKind,
        entryIndex: input.entryIndex,
        apiKey: input.apiKey,
        providerName: input.providerName,
        baseUrl: input.baseUrl,
        disabled: input.disabled,
        modelAliases: input.modelAliases,
        excludedModels: input.excludedModels,
        apiKeyEntries:
          input.providerKind === 'openai-compatibility' && input.apiKey
            ? [{ apiKey: input.apiKey }]
            : undefined
      })

      return {
        ...(await loadUpstreams()),
        ...(await loadModelInventory()),
        notice: 'Upstream saved'
      }
    })
  }

  function deleteApiKeyUpstream(
    providerKind: UpstreamApiFormInput['providerKind'],
    index: number
  ): void {
    if (!window.confirm('Delete this provider entry?')) {
      return
    }

    void runAction(`delete-upstream-api:${providerKind}:${index}`, async () => {
      await window.allmone.runtime.deleteApiKeyUpstream({
        providerKind,
        index
      })

      return {
        ...(await loadUpstreams()),
        ...(await loadModelInventory()),
        notice: 'Provider entry deleted'
      }
    })
  }

  function saveAmp(input: AmpFormInput): void {
    void runAction('save-amp', async () => {
      await window.allmone.runtime.writeAmpConfig(input)

      return {
        ...(await loadUpstreams()),
        ...(await loadModelInventory()),
        notice: 'Amp saved'
      }
    })
  }

  function saveOutputPort(port: number): void {
    void runAction('save-output-port', async () => ({
      runtimeState: await window.allmone.runtime.saveOutputPort(port),
      configSummary: null,
      configLoadError: null,
      modelInventory: null,
      modelInventoryError: null,
      notice: 'Output port saved'
    }))
  }

  function testConnection(): void {
    void runAction('test-connection', async () => {
      const result = await window.allmone.runtime.testConnection()
      const runtimeState = await window.allmone.runtime.getState()
      const patch: Partial<ViewState> = {
        runtimeState,
        notice: `Connection ${statusLabel(result.state).toLowerCase()}`
      }

      if (result.state === 'reachable') {
        const config = await loadConfigSummary()
        Object.assign(patch, {
          configSummary: config.summary,
          configLoadError: config.error
        })
        Object.assign(patch, await loadUpstreams())
        Object.assign(patch, await loadModelInventory())
      } else {
        Object.assign(patch, {
          configSummary: null,
          configLoadError: null,
          upstreamCatalog: [],
          upstreamSummaries: [],
          authFiles: [],
          localConnection: null,
          modelInventory: null,
          modelInventoryError: null,
          localOutputKeys: [],
          localOutputKeyPlaintext: null
        })
      }

      return patch
    })
  }

  function testOutputPortConnectivity(): void {
    void runAction('test-output-port', async () => {
      const result = await window.allmone.runtime.testOutputPortConnectivity()

      return {
        outputPortTest: result,
        notice: `Output port ${result.state}`
      }
    })
  }

  function testModelOutput(input: ModelOutputTestFormInput): void {
    void runAction('test-model-output', async () => {
      const result = await window.allmone.runtime.testModelOutput(input)

      return {
        modelOutputTest: result,
        notice: result.ok ? 'Model output received' : `Model output ${result.state}`
      }
    })
  }

  function managedCommand(
    action: string,
    command: () => Promise<RuntimeState>,
    notice: string
  ): void {
    void runAction(action, async () => {
      const runtimeState = await command()

      if (runtimeState.managed?.lastError) {
        return {
          runtimeState,
          error: runtimeState.managed.lastError
        }
      }

      return {
        runtimeState,
        notice
      }
    })
  }

  function installUpdate(): void {
    managedCommand(
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
  }

  function resetAmp(): void {
    void runAction('reset-amp', async () => {
      await window.allmone.runtime.resetAmpConfig()

      return {
        ...(await loadUpstreams()),
        ...(await loadModelInventory()),
        notice: 'Amp reset'
      }
    })
  }

  function loginProvider(kind: ProviderLoginRunInput['kind']): void {
    const importPath =
      kind === 'vertex-import'
        ? window.prompt('Vertex service-account JSON path') ?? undefined
        : undefined

    void runAction(`login:${kind}`, async () => {
      await window.allmone.runtime.runLoginAction({
        kind,
        importPath
      })

      return {
        ...(await loadUpstreams()),
        ...(await loadModelInventory()),
        codexDeviceLogin: null,
        loginOutput: [],
        notice: 'Login handoff finished'
      }
    })
  }

  function deleteAuthFile(name: string): void {
    if (!window.confirm('Delete this auth file?')) {
      return
    }

    void runAction(`delete-auth-file:${name}`, async () => {
      await window.allmone.runtime.deleteAuthFile({ name })

      return {
        ...(await loadUpstreams()),
        ...(await loadModelInventory()),
        notice: 'Auth file deleted'
      }
    })
  }

  function refreshModels(): void {
    void runAction('refresh-models', async () => ({
      ...(await loadModelInventory()),
      localOutputKeyPlaintext: null,
      notice: 'Models refreshed'
    }))
  }

  function createGeneratedLocalOutputKey(input: LocalOutputKeyCreateInput): void {
    void runAction('create-local-output-key', async () => {
      const result =
        await window.allmone.runtime.createGeneratedLocalOutputKey(input)

      return {
        ...(await loadModelInventory()),
        localOutputKeys: result.keys,
        localOutputKeyPlaintext: toLocalOutputKeyPlaintext(result),
        notice: 'Local output key generated and saved'
      }
    })
  }

  function renameLocalOutputKey(input: LocalOutputKeyRenameFormInput): void {
    void runAction(`rename-local-output-key:${input.id}`, async () => {
      const result = await window.allmone.runtime.renameLocalOutputKey(input)

      return {
        ...(await loadModelInventory()),
        localOutputKeys: result.keys,
        localOutputKeyPlaintext: null,
        notice: 'Local output key renamed'
      }
    })
  }

  function revealLocalOutputKey(input: LocalOutputKeyActionInput): void {
    void runAction(`reveal-local-output-key:${input.id}`, async () => {
      const result = await window.allmone.runtime.revealLocalOutputKey(input)

      return {
        ...(await loadModelInventory()),
        localOutputKeys: result.keys,
        localOutputKeyPlaintext: toLocalOutputKeyPlaintext(result),
        notice: 'Local output key revealed'
      }
    })
  }

  function deleteLocalOutputKey(input: LocalOutputKeyActionInput): void {
    if (!window.confirm('Delete this local output key?')) {
      return
    }

    void runAction(`delete-local-output-key:${input.id}`, async () => {
      const result = await window.allmone.runtime.deleteLocalOutputKey(input)

      return {
        ...(await loadModelInventory()),
        localOutputKeys: result.keys,
        localOutputKeyPlaintext: null,
        notice: 'Local output key deleted'
      }
    })
  }

  function copyEndpoint(kind: SafeEndpointKind): void {
    void runAction(`copy:${kind}`, async () => {
      const result = await window.allmone.runtime.copyApiBase()

      return {
        notice: `Copied ${result.value}`
      }
    })
  }

  const runtimeReachable = isRuntimeReachable(state.runtimeState)

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSelect={setActiveSection} />
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">allmone {state.appVersion || 'loading'}</p>
            <h1>Runtime Control</h1>
          </div>
          <ManagedStatusPill
            runtimeState={state.runtimeState}
            busyAction={state.busyAction}
          />
        </header>

        <Feedback error={state.error} notice={state.notice} />

        {activeSection === 'models' ? (
          <ModelsPage
            state={state}
            runtimeReachable={runtimeReachable}
            onRefresh={refreshModels}
            onCreateGeneratedLocalOutputKey={createGeneratedLocalOutputKey}
            onRenameLocalOutputKey={renameLocalOutputKey}
            onRevealLocalOutputKey={revealLocalOutputKey}
            onDeleteLocalOutputKey={deleteLocalOutputKey}
          />
        ) : activeSection === 'providers' ? (
          <ProvidersPage
            state={state}
            runtimeReachable={runtimeReachable}
            onSaveApiKeyUpstream={saveApiKeyUpstream}
            onSaveAmp={saveAmp}
            onResetAmp={resetAmp}
            onLoginProvider={loginProvider}
            onDeleteApiKeyUpstream={deleteApiKeyUpstream}
            onDeleteAuthFile={deleteAuthFile}
          />
        ) : (
          <SettingsPage
            state={state}
            onSaveOutputPort={saveOutputPort}
            onTestConnection={testConnection}
            onTestOutputPortConnectivity={testOutputPortConnectivity}
            onTestModelOutput={testModelOutput}
            onInstallUpdate={installUpdate}
            onCheckUpdate={() =>
              managedCommand(
                'check-update',
                () => window.allmone.runtime.checkForUpdate(),
                'Update check finished'
              )
            }
            onStartRuntime={() =>
              managedCommand(
                'start-runtime',
                () => window.allmone.runtime.startManagedRuntime(),
                'Runtime started'
              )
            }
            onRestartRuntime={() =>
              managedCommand(
                'restart-runtime',
                () => window.allmone.runtime.restartManagedRuntime(),
                'Runtime restarted'
              )
            }
            onStopRuntime={() =>
              managedCommand(
                'stop-runtime',
                () => window.allmone.runtime.stopManagedRuntime(),
                'Runtime stopped'
              )
            }
            onCopyEndpoint={copyEndpoint}
          />
        )}
      </main>
    </div>
  )
}

function applyLoginEvent(state: ViewState, event: ProviderLoginEvent): ViewState {
  if (event.type === 'codex-device-code') {
    return {
      ...state,
      codexDeviceLogin: event
    }
  }

  return {
    ...state,
    loginOutput: [...state.loginOutput, event.text].slice(-20)
  }
}

function toLocalOutputKeyPlaintext(
  result: LocalOutputKeyActionResult
): LocalOutputKeyPlaintext | null {
  return result.plaintext
    ? {
        id: result.key.id,
        name: result.key.name,
        value: result.plaintext
      }
    : null
}
