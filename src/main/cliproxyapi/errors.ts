import type { CliProxyApiManagementState } from './types'
import { redactCliProxyApiText, redactUrlCredentials } from './redact'

export type CliProxyApiErrorKind =
  | 'connection'
  | 'auth'
  | 'management_disabled'
  | 'timeout'
  | 'invalid_json'
  | 'unexpected_http'
  | 'unexpected'

export interface CliProxyApiErrorOptions {
  kind: CliProxyApiErrorKind
  message: string
  state: CliProxyApiManagementState
  status?: number
  url?: string
  responseBody?: string
  cause?: unknown
}

export interface CliProxyApiLogObject {
  name: string
  kind: CliProxyApiErrorKind
  state: CliProxyApiManagementState
  message: string
  status?: number
  url?: string
  responseBody?: string
}

export class CliProxyApiError extends Error {
  readonly kind: CliProxyApiErrorKind
  readonly state: CliProxyApiManagementState
  readonly status?: number
  readonly url?: string
  readonly responseBody?: string
  override readonly cause?: unknown

  constructor(options: CliProxyApiErrorOptions) {
    super(options.message)
    this.name = 'CliProxyApiError'
    this.kind = options.kind
    this.state = options.state
    this.status = options.status
    this.url = options.url
    this.responseBody = options.responseBody
    this.cause = options.cause
  }

  toLogObject(): CliProxyApiLogObject {
    return {
      name: this.name,
      kind: this.kind,
      state: this.state,
      message: redactCliProxyApiText(this.message),
      status: this.status,
      url: this.url ? redactUrlCredentials(this.url) : undefined,
      responseBody: this.responseBody
        ? redactCliProxyApiText(this.responseBody)
        : undefined
    }
  }
}

export function isCliProxyApiError(value: unknown): value is CliProxyApiError {
  return value instanceof CliProxyApiError
}

export function mapHttpStatusToManagementState(
  status: number
): CliProxyApiManagementState {
  if (status === 401 || status === 403) {
    return 'auth_required'
  }

  if (status === 404) {
    return 'management_disabled'
  }

  return 'unexpected_error'
}

export function mapCliProxyApiErrorToManagementState(
  error: CliProxyApiError
): CliProxyApiManagementState {
  return error.state
}

export function createHttpCliProxyApiError(options: {
  status: number
  statusText: string
  url: string
  responseBody: string
  forManagementCheck?: boolean
}): CliProxyApiError {
  const checkState = mapHttpStatusToManagementState(options.status)
  const state = options.forManagementCheck
    ? checkState
    : checkState === 'auth_required'
      ? 'auth_required'
      : 'unexpected_error'
  const kind = getKindForState(state, 'unexpected_http')

  return new CliProxyApiError({
    kind,
    state,
    status: options.status,
    url: options.url,
    responseBody: options.responseBody,
    message: `CLIProxyAPI management request failed with HTTP ${options.status} ${options.statusText}`.trim()
  })
}

export function createConnectionCliProxyApiError(options: {
  url: string
  cause: unknown
}): CliProxyApiError {
  return new CliProxyApiError({
    kind: 'connection',
    state: 'unreachable',
    url: options.url,
    cause: options.cause,
    message: 'CLIProxyAPI management API is unreachable'
  })
}

export function createTimeoutCliProxyApiError(options: {
  url: string
  timeoutMs: number
  cause?: unknown
}): CliProxyApiError {
  return new CliProxyApiError({
    kind: 'timeout',
    state: 'timeout',
    url: options.url,
    cause: options.cause,
    message: `CLIProxyAPI management request timed out after ${options.timeoutMs}ms`
  })
}

export function createInvalidJsonCliProxyApiError(options: {
  url: string
  responseBody: string
  cause: unknown
}): CliProxyApiError {
  return new CliProxyApiError({
    kind: 'invalid_json',
    state: 'invalid_response',
    url: options.url,
    responseBody: options.responseBody,
    cause: options.cause,
    message: 'CLIProxyAPI management API returned invalid JSON'
  })
}

function getKindForState(
  state: CliProxyApiManagementState,
  fallback: CliProxyApiErrorKind
): CliProxyApiErrorKind {
  switch (state) {
    case 'auth_required':
      return 'auth'
    case 'management_disabled':
      return 'management_disabled'
    case 'timeout':
      return 'timeout'
    case 'invalid_response':
      return 'invalid_json'
    case 'unreachable':
      return 'connection'
    default:
      return fallback
  }
}
