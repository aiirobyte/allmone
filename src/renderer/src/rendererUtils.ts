import type { RuntimeState } from '../../main/runtime/types'
import type {
  UpstreamLoginActionKind,
  UpstreamProviderKind
} from '../../main/upstreams'

export const API_KEY_PROVIDER_KINDS: UpstreamProviderKind[] = [
  'gemini-api-key',
  'codex-api-key',
  'claude-api-key',
  'vertex-api-key',
  'openai-compatibility'
]

export const ACCOUNT_PROVIDER_KINDS: UpstreamProviderKind[] = [
  'gemini-cli',
  'aistudio',
  'antigravity',
  'claude',
  'codex',
  'kimi',
  'vertex'
]

export function loginActionForProvider(
  providerKind: UpstreamProviderKind
): UpstreamLoginActionKind | null {
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

export function statusLabel(status: RuntimeState['status'] | undefined): string {
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

export function managedStatusLabel(status: string | undefined): string {
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

export function nextActionForStatus(
  status: RuntimeState['status'] | undefined
): string {
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

export function statusClass(status: RuntimeState['status'] | undefined): string {
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

export function managedStatusClass(status: string | undefined): string {
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

export function isRuntimeReachable(runtimeState: RuntimeState | null): boolean {
  return runtimeState?.status === 'reachable'
}

export function isManagedBusy(runtimeState: RuntimeState | null): boolean {
  const status = runtimeState?.managed?.status

  return status === 'installing' || status === 'starting' || status === 'stopping'
}

export function canStartManagedRuntime(runtimeState: RuntimeState | null): boolean {
  const status = runtimeState?.managed?.status

  return !isManagedBusy(runtimeState) && status !== 'running'
}

export function isActionBusy(
  busyAction: string | null,
  action: string
): boolean {
  return busyAction === action
}

export function formatCheckedAt(value: string | undefined): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString()
}

export function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : ''
}

export function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected runtime error'
}
