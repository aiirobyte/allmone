import assert from 'node:assert/strict'

import {
  CliProxyApiError,
  mapCliProxyApiErrorToManagementState,
  mapHttpStatusToManagementState
} from './errors'

test('maps documented 404 management responses to management_disabled', () => {
  assert.equal(mapHttpStatusToManagementState(404), 'management_disabled')
})

test('maps auth failures to auth_required', () => {
  assert.equal(mapHttpStatusToManagementState(401), 'auth_required')
  assert.equal(mapHttpStatusToManagementState(403), 'auth_required')
})

test('maps timeout errors to timeout state', () => {
  const error = new CliProxyApiError({
    kind: 'timeout',
    message: 'CLIProxyAPI management request timed out',
    state: 'timeout'
  })

  assert.equal(mapCliProxyApiErrorToManagementState(error), 'timeout')
})

test('maps invalid JSON errors to invalid_response state', () => {
  const error = new CliProxyApiError({
    kind: 'invalid_json',
    message: 'CLIProxyAPI returned invalid JSON',
    state: 'invalid_response'
  })

  assert.equal(mapCliProxyApiErrorToManagementState(error), 'invalid_response')
})

test('maps generic HTTP failures to unexpected_error state', () => {
  const error = new CliProxyApiError({
    kind: 'unexpected_http',
    message: 'CLIProxyAPI management request failed with HTTP 500',
    state: 'unexpected_error',
    status: 500,
    responseBody: '{"error":"boom"}'
  })

  assert.equal(mapCliProxyApiErrorToManagementState(error), 'unexpected_error')
  assert.equal(error.status, 500)
})

test('redacts secrets from log-safe error objects', () => {
  const error = new CliProxyApiError({
    kind: 'unexpected_http',
    message:
      'CLIProxyAPI request failed for https://user:pass@example.com/v0/management/config',
    state: 'unexpected_error',
    status: 502,
    url: 'https://user:pass@example.com/v0/management/config',
    responseBody: 'Authorization: Bearer mgmt-secret'
  })
  const logObject = error.toLogObject()

  assert.equal(
    logObject.url,
    'https://[REDACTED]@example.com/v0/management/config'
  )
  assert.equal(logObject.responseBody, 'Authorization: Bearer [REDACTED]')
  assert(!JSON.stringify(logObject).includes('user:pass'))
  assert(!JSON.stringify(logObject).includes('mgmt-secret'))
})
