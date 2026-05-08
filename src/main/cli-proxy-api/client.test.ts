import assert from 'node:assert/strict'

import { CliProxyApiError } from './errors'
import {
  CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL,
  type CliProxyApiFetch
} from './types'
import { createCliProxyApiClient } from './client'

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' }
  })
}

function textResponse(value: string, status = 200): Response {
  return new Response(value, {
    status,
    statusText: status === 200 ? 'OK' : 'Error'
  })
}

function inputToUrl(input: string | URL | Request): string {
  return input instanceof Request ? input.url : input.toString()
}

function headerValue(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name)
}

test('uses the default management base URL', async () => {
  let seenUrl = ''
  const fetch: CliProxyApiFetch = async (input) => {
    seenUrl = inputToUrl(input)
    return jsonResponse({})
  }
  const client = createCliProxyApiClient({ fetch })

  await client.getConfig()

  assert.equal(seenUrl, `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/config`)
})

test('joins override base URLs and query params correctly', async () => {
  let seenUrl = ''
  const fetch: CliProxyApiFetch = async (input) => {
    seenUrl = inputToUrl(input)
    return jsonResponse([])
  }
  const client = createCliProxyApiClient({
    baseUrl: 'http://localhost:9999/custom/management/',
    fetch
  })

  const result = await client.getUsageQueue(10)

  assert.equal(
    seenUrl,
    'http://localhost:9999/custom/management/usage-queue?count=10'
  )
  assert.deepEqual(result.records, [])
})

test('attaches the management key as an Authorization bearer header', async () => {
  let authorization: string | null = null
  const fetch: CliProxyApiFetch = async (_input, init) => {
    authorization = headerValue(init, 'authorization')
    return jsonResponse({})
  }
  const client = createCliProxyApiClient({
    managementKey: 'mgmt-secret',
    fetch
  })

  await client.getConfig()

  assert.equal(authorization, 'Bearer mgmt-secret')
})

test('normalizes successful read responses and keeps raw responses', async () => {
  const fetch: CliProxyApiFetch = async (input) => {
    const url = new URL(inputToUrl(input))

    switch (url.pathname) {
      case '/v0/management/config':
        return jsonResponse({ debug: true, extra: 'kept' })
      case '/v0/management/latest-version':
        return jsonResponse({ 'latest-version': 'v1.2.3' })
      case '/v0/management/usage-statistics-enabled':
        return jsonResponse({ 'usage-statistics-enabled': true })
      case '/v0/management/api-keys':
        return jsonResponse({ 'api-keys': ['k1'] })
      case '/v0/management/api-key-usage':
        return jsonResponse({
          openai: {
            'https://openrouter.ai/api/v1|k1': {
              success: 1,
              failed: 0,
              recent_requests: [{ time: '12:00-12:10', success: 1, failed: 0 }]
            }
          }
        })
      case '/v0/management/auth-files':
        return jsonResponse({ files: [{ name: 'acc.json', source: 'file' }] })
      case '/v0/management/openai-compatibility':
        return jsonResponse({
          'openai-compatibility': [{ name: 'openrouter', models: [] }]
        })
      default:
        throw new Error(`Unexpected URL: ${url.pathname}`)
    }
  }
  const client = createCliProxyApiClient({ fetch })

  assert.deepEqual(await client.getConfig(), {
    config: { debug: true, extra: 'kept' },
    raw: { debug: true, extra: 'kept' }
  })
  assert.deepEqual(await client.getLatestVersion(), {
    latestVersion: 'v1.2.3',
    raw: { 'latest-version': 'v1.2.3' }
  })
  assert.deepEqual(await client.getUsageStatisticsEnabled(), {
    enabled: true,
    raw: { 'usage-statistics-enabled': true }
  })
  assert.deepEqual(await client.getApiKeys(), {
    apiKeys: ['k1'],
    raw: { 'api-keys': ['k1'] }
  })
  assert.equal(
    (await client.getApiKeyUsage()).usage.openai[
      'https://openrouter.ai/api/v1|k1'
    ].success,
    1
  )
  assert.equal((await client.getAuthFiles()).files[0]?.name, 'acc.json')
  assert.equal(
    (await client.getOpenAiCompatibilityProviders()).providers[0]?.name,
    'openrouter'
  )
})

test('normalizes empty config responses', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => jsonResponse({})
  })

  const result = await client.getConfig()

  assert.deepEqual(result.config, {})
  assert.deepEqual(result.raw, {})
})

test('normalizes usage queue array responses', async () => {
  const record = {
    timestamp: '2026-05-05T12:00:00Z',
    provider: 'openai',
    model: 'gpt-5.4',
    tokens: { input_tokens: 10, output_tokens: 20, total_tokens: 30 }
  }
  const client = createCliProxyApiClient({
    fetch: async () => jsonResponse([record])
  })

  const result = await client.getUsageQueue(1)

  assert.deepEqual(result.records, [record])
  assert.deepEqual(result.raw, [record])
})

test('maps invalid JSON responses to invalid_response errors', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => textResponse('{bad json')
  })

  await assert.rejects(
    () => client.getConfig(),
    (error) =>
      error instanceof CliProxyApiError &&
      error.kind === 'invalid_json' &&
      error.state === 'invalid_response'
  )
})

test('maps non-2xx read responses to unexpected HTTP errors', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => textResponse('Authorization: Bearer mgmt-secret', 500)
  })

  await assert.rejects(
    () => client.getConfig(),
    (error) =>
      error instanceof CliProxyApiError &&
      error.kind === 'unexpected_http' &&
      error.state === 'unexpected_error' &&
      error.status === 500 &&
      !JSON.stringify(error.toLogObject()).includes('mgmt-secret')
  )
})

test('maps 404 management checks to management_disabled', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => textResponse('not found', 404)
  })

  const result = await client.checkManagementApi()

  assert.deepEqual(result, {
    ok: false,
    state: 'management_disabled',
    status: 404,
    error: 'CLIProxyAPI management request failed with HTTP 404 Error'
  })
})

test('maps timeout failures to timeout management checks', async () => {
  const fetch: CliProxyApiFetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('aborted')
        error.name = 'AbortError'
        reject(error)
      })
    })
  const client = createCliProxyApiClient({ fetch, timeoutMs: 1 })

  const result = await client.checkManagementApi()

  assert.equal(result.ok, false)
  assert.equal(result.state, 'timeout')
})

test('maps network failures to unreachable management checks', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => {
      throw new Error('ECONNREFUSED')
    }
  })

  const result = await client.checkManagementApi()

  assert.equal(result.ok, false)
  assert.equal(result.state, 'unreachable')
})

test('maps successful management checks to reachable', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => jsonResponse({})
  })

  const result = await client.checkManagementApi()

  assert.deepEqual(result, { ok: true, state: 'reachable', status: 200 })
})

test('creates OpenAI-compatible providers by appending to the current list', async () => {
  const seenRequests: Array<{ url: string; method: string; body?: unknown }> = []
  const fetch: CliProxyApiFetch = async (input, init) => {
    const method = init?.method ?? ''
    seenRequests.push({
      url: inputToUrl(input),
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined
    })

    if (method === 'GET') {
      return jsonResponse({
        'openai-compatibility': [
          {
            name: 'existing',
            'base-url': 'https://example.com/v1'
          }
        ]
      })
    }

    return jsonResponse({ status: 'ok' })
  }
  const client = createCliProxyApiClient({
    baseUrl: 'http://localhost:8317/v0/management',
    managementKey: 'mgmt-secret',
    fetch
  })

  const result = await client.upsertOpenAiCompatibilityProvider({
    name: 'openrouter',
    disabled: false,
    'base-url': 'https://openrouter.ai/api/v1',
    'api-key-entries': [{ 'api-key': 'provider-secret', 'proxy-url': '' }],
    models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
  })

  assert.deepEqual(seenRequests, [
    {
      url: 'http://localhost:8317/v0/management/openai-compatibility',
      method: 'GET',
      body: undefined
    },
    {
      url: 'http://localhost:8317/v0/management/openai-compatibility',
      method: 'PUT',
      body: [
        {
          name: 'existing',
          'base-url': 'https://example.com/v1'
        },
        {
          name: 'openrouter',
          disabled: false,
          'base-url': 'https://openrouter.ai/api/v1',
          'api-key-entries': [
            { 'api-key': 'provider-secret', 'proxy-url': '' }
          ],
          models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
        }
      ]
    }
  ])
  assert.deepEqual(result, { ok: true, status: 200, raw: { status: 'ok' } })
})

test('patches existing OpenAI-compatible providers by name with JSON and auth headers', async () => {
  const seenRequests: Array<{ url: string; method: string; body?: unknown }> = []
  let authorization: string | null = null
  let contentType: string | null = null
  const fetch: CliProxyApiFetch = async (input, init) => {
    const method = init?.method ?? ''
    seenRequests.push({
      url: inputToUrl(input),
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined
    })
    authorization = headerValue(init, 'authorization')
    contentType = headerValue(init, 'content-type')

    if (method === 'GET') {
      return jsonResponse({
        'openai-compatibility': [
          {
            name: 'openrouter',
            'base-url': 'https://old.example.com/v1'
          }
        ]
      })
    }

    return jsonResponse({ status: 'ok' })
  }
  const client = createCliProxyApiClient({
    baseUrl: 'http://localhost:8317/v0/management',
    managementKey: 'mgmt-secret',
    fetch
  })

  const result = await client.upsertOpenAiCompatibilityProvider({
    name: 'openrouter',
    disabled: false,
    'base-url': 'https://openrouter.ai/api/v1',
    'api-key-entries': [{ 'api-key': 'provider-secret', 'proxy-url': '' }],
    models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
  })

  assert.equal(seenRequests[0]?.method, 'GET')
  assert.equal(seenRequests[1]?.url, 'http://localhost:8317/v0/management/openai-compatibility')
  assert.equal(seenRequests[1]?.method, 'PATCH')
  assert.equal(authorization, 'Bearer mgmt-secret')
  assert.equal(contentType, 'application/json')
  assert.deepEqual(seenRequests[1]?.body, {
    name: 'openrouter',
    value: {
      name: 'openrouter',
      disabled: false,
      'base-url': 'https://openrouter.ai/api/v1',
      'api-key-entries': [
        { 'api-key': 'provider-secret', 'proxy-url': '' }
      ],
      models: [{ name: 'moonshotai/kimi-k2:free', alias: 'kimi-k2' }]
    }
  })
  assert.deepEqual(result, { ok: true, status: 200, raw: { status: 'ok' } })
})

test('deletes OpenAI-compatible providers by name with auth headers', async () => {
  let seenUrl = ''
  let seenMethod = ''
  let seenBody: BodyInit | null | undefined
  let authorization: string | null = null
  const fetch: CliProxyApiFetch = async (input, init) => {
    seenUrl = inputToUrl(input)
    seenMethod = init?.method ?? ''
    seenBody = init?.body
    authorization = headerValue(init, 'authorization')
    return jsonResponse({ status: 'ok' })
  }
  const client = createCliProxyApiClient({
    managementKey: 'mgmt-secret',
    fetch
  })

  const result = await client.deleteOpenAiCompatibilityProvider({
    name: 'openrouter'
  })

  assert.equal(
    seenUrl,
    `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/openai-compatibility?name=openrouter`
  )
  assert.equal(seenMethod, 'DELETE')
  assert.equal(seenBody, undefined)
  assert.equal(authorization, 'Bearer mgmt-secret')
  assert.deepEqual(result, { ok: true, status: 200, raw: { status: 'ok' } })
})

test('writes local API keys with documented array route shapes', async () => {
  const seenRequests: Array<{ url: string; method: string; body?: unknown }> = []
  const fetch: CliProxyApiFetch = async (input, init) => {
    seenRequests.push({
      url: inputToUrl(input),
      method: init?.method ?? '',
      body: init?.body ? JSON.parse(String(init.body)) : undefined
    })
    return jsonResponse({ status: 'ok' })
  }
  const client = createCliProxyApiClient({ fetch })

  await client.putApiKeys(['k1', 'k2'])
  await client.patchApiKey({ index: 0, value: 'k1b' })
  await client.deleteApiKey({ value: 'k2' })

  assert.deepEqual(seenRequests, [
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/api-keys`,
      method: 'PUT',
      body: ['k1', 'k2']
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/api-keys`,
      method: 'PATCH',
      body: { index: 0, value: 'k1b' }
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/api-keys?value=k2`,
      method: 'DELETE',
      body: undefined
    }
  ])
})

test('reads and writes every API-key upstream section with fake fetch', async () => {
  const seenRequests: Array<{ url: string; method: string; body?: unknown }> = []
  const fetch: CliProxyApiFetch = async (input, init) => {
    const url = new URL(inputToUrl(input))
    const method = init?.method ?? ''
    seenRequests.push({
      url: inputToUrl(input),
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined
    })

    if (method === 'GET') {
      const section = url.pathname.split('/').at(-1) ?? ''
      return jsonResponse({
        [section]: [{ 'api-key': `${section}-secret`, 'base-url': 'https://example.com' }]
      })
    }

    return jsonResponse({ status: 'ok' })
  }
  const client = createCliProxyApiClient({ fetch })

  assert.equal(
    (await client.getGeminiApiKeyEntries()).entries[0]?.['api-key'],
    'gemini-api-key-secret'
  )
  await client.putCodexApiKeyEntries([{ 'api-key': 'codex-secret' }])
  await client.patchClaudeApiKeyEntry({
    match: 'old-secret',
    value: { 'api-key': 'new-secret' }
  })
  await client.deleteVertexApiKeyEntry({ index: 1 })

  assert.equal(
    seenRequests[0]?.url,
    `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/gemini-api-key`
  )
  assert.deepEqual(seenRequests.slice(1), [
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/codex-api-key`,
      method: 'PUT',
      body: [{ 'api-key': 'codex-secret' }]
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/claude-api-key`,
      method: 'PATCH',
      body: { match: 'old-secret', value: { 'api-key': 'new-secret' } }
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/vertex-api-key?index=1`,
      method: 'DELETE',
      body: undefined
    }
  ])
})

test('reads and writes ampcode, oauth controls, and auth file routes', async () => {
  const seenRequests: Array<{ url: string; method: string; body?: unknown }> = []
  const fetch: CliProxyApiFetch = async (input, init) => {
    const url = new URL(inputToUrl(input))
    const method = init?.method ?? ''
    seenRequests.push({
      url: inputToUrl(input),
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined
    })

    if (method === 'GET' && url.pathname.endsWith('/ampcode')) {
      return jsonResponse({ ampcode: { 'upstream-url': 'https://ampcode.com' } })
    }
    if (method === 'GET' && url.pathname.endsWith('/oauth-model-alias')) {
      return jsonResponse({ 'oauth-model-alias': { claude: [] } })
    }
    if (method === 'GET' && url.pathname.endsWith('/oauth-excluded-models')) {
      return jsonResponse({ 'oauth-excluded-models': { claude: ['c1'] } })
    }

    return jsonResponse({ status: 'ok' })
  }
  const client = createCliProxyApiClient({ fetch })

  assert.equal((await client.getAmpCodeConfig()).config['upstream-url'], 'https://ampcode.com')
  assert.deepEqual(await client.getOauthModelAlias(), {
    aliases: { claude: [] },
    raw: { 'oauth-model-alias': { claude: [] } }
  })
  assert.deepEqual(await client.getOauthExcludedModels(), {
    excludedModels: { claude: ['c1'] },
    raw: { 'oauth-excluded-models': { claude: ['c1'] } }
  })
  await client.patchAmpCodeConfig({ 'upstream-api-key': 'amp-secret' })
  await client.putOauthModelAlias({ codex: [{ name: 'gpt-5', alias: 'g5' }] })
  await client.patchOauthExcludedModels({ provider: 'claude', models: [] })
  await client.deleteAuthFile({ name: 'claude.json' })

  assert.deepEqual(seenRequests.slice(3), [
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/ampcode`,
      method: 'PATCH',
      body: { 'upstream-api-key': 'amp-secret' }
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/oauth-model-alias`,
      method: 'PUT',
      body: { codex: [{ name: 'gpt-5', alias: 'g5' }] }
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/oauth-excluded-models`,
      method: 'PATCH',
      body: { provider: 'claude', models: [] }
    },
    {
      url: `${CLI_PROXY_API_DEFAULT_MANAGEMENT_BASE_URL}/auth-files?name=claude.json`,
      method: 'DELETE',
      body: undefined
    }
  ])
})

test('maps non-2xx write responses to redacted CLIProxyAPI errors', async () => {
  const client = createCliProxyApiClient({
    fetch: async () =>
      textResponse(
        'Authorization: Bearer mgmt-secret provider-secret socks5://u:p@example.com',
        422
      )
  })

  await assert.rejects(
    () =>
      client.upsertOpenAiCompatibilityProvider({
        name: 'openrouter',
        'base-url': 'https://openrouter.ai/api/v1',
        'api-key-entries': [{ 'api-key': 'provider-secret' }]
      }),
    (error) =>
      error instanceof CliProxyApiError &&
      error.kind === 'unexpected_http' &&
      error.state === 'unexpected_error' &&
      error.status === 422 &&
      !JSON.stringify(error.toLogObject()).includes('mgmt-secret') &&
      !JSON.stringify(error.toLogObject()).includes('provider-secret') &&
      !JSON.stringify(error.toLogObject()).includes('u:p')
  )
})

test('maps invalid JSON write responses to invalid_response errors', async () => {
  const client = createCliProxyApiClient({
    fetch: async () => textResponse('{bad json')
  })

  await assert.rejects(
    () => client.deleteOpenAiCompatibilityProvider({ name: 'openrouter' }),
    (error) =>
      error instanceof CliProxyApiError &&
      error.kind === 'invalid_json' &&
      error.state === 'invalid_response'
  )
})
