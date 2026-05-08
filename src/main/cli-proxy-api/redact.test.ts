import assert from 'node:assert/strict'

import {
  redactApiKey,
  redactBearerToken,
  redactCliProxyApiText,
  redactManagementKey,
  redactUrlCredentials
} from './redact'

test('redacts short keys without echoing the original value', () => {
  const apiKey = 'sk-123'
  const managementKey = 'm-key'

  assert.equal(redactApiKey(apiKey), '[REDACTED]')
  assert.equal(redactManagementKey(managementKey), '[REDACTED]')
  assert(!redactApiKey(apiKey).includes(apiKey))
  assert(!redactManagementKey(managementKey).includes(managementKey))
})

test('redacts long keys while keeping only small identifying edges', () => {
  const key = 'sk-live-abcdefghijklmnopqrstuvwxyz'
  const redacted = redactApiKey(key)

  assert.notEqual(redacted, key)
  assert(redacted.startsWith('sk-l'))
  assert(redacted.endsWith('wxyz'))
  assert(!redacted.includes('live-abcdefghijklmnopqrstuv'))
})

test('redacts bearer tokens inside text', () => {
  const input = 'Authorization: Bearer mgmt-super-secret-token'
  const redacted = redactBearerToken(input)

  assert.equal(redacted, 'Authorization: Bearer [REDACTED]')
  assert(!redacted.includes('mgmt-super-secret-token'))
})

test('redacts credentials embedded in URLs', () => {
  const input = 'socks5://alice:correct-horse@example.com:1080/path?q=1'
  const redacted = redactUrlCredentials(input)

  assert.equal(redacted, 'socks5://[REDACTED]@example.com:1080/path?q=1')
  assert(!redacted.includes('alice'))
  assert(!redacted.includes('correct-horse'))
})

test('redacts secrets from mixed CLIProxyAPI log text', () => {
  const input =
    'GET https://user:pass@example.com/v1 Authorization: Bearer mgmt-secret'
  const redacted = redactCliProxyApiText(input)

  assert.equal(
    redacted,
    'GET https://[REDACTED]@example.com/v1 Authorization: Bearer [REDACTED]'
  )
  assert(!redacted.includes('user:pass'))
  assert(!redacted.includes('mgmt-secret'))
})
