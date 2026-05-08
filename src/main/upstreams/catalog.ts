import type {
  UpstreamEditableFieldName,
  UpstreamProviderCapabilities,
  UpstreamProviderCatalogEntry,
  UpstreamProviderKind
} from './types'

export type { UpstreamProviderKind } from './types'

const noProviderLogic: Pick<
  UpstreamProviderCapabilities,
  'providerProtocolLogic' | 'requestTransformation' | 'responseTransformation'
> = {
  providerProtocolLogic: false,
  requestTransformation: false,
  responseTransformation: false
}

const apiKeyFields: UpstreamEditableFieldName[] = [
  'apiKey',
  'baseUrl',
  'prefix',
  'disabled',
  'headers',
  'proxyUrl',
  'modelAliases',
  'excludedModels'
]

function fields(
  names: UpstreamEditableFieldName[],
  options: {
    required?: UpstreamEditableFieldName[]
    secrets?: UpstreamEditableFieldName[]
  } = {}
): UpstreamProviderCatalogEntry['editableFields'] {
  return names.map((name) => ({
    name,
    required: options.required?.includes(name) ?? false,
    displayable: !(options.secrets?.includes(name) ?? false)
  }))
}

function apiKeyEntry(
  kind: UpstreamProviderKind,
  label: string,
  route: string,
  required: UpstreamEditableFieldName[] = ['apiKey']
): UpstreamProviderCatalogEntry {
  const secretFields: UpstreamEditableFieldName[] = [
    'apiKey',
    'headers',
    'proxyUrl'
  ]

  return {
    kind,
    label,
    family: 'api-key-upstream',
    cliproxyapi: {
      section: kind,
      managementRoutes: { config: route },
      loginCommands: []
    },
    editableFields: fields(apiKeyFields, {
      required,
      secrets: secretFields
    }),
    secretFields,
    redaction: [
      'upstream API key',
      'proxy URL credentials',
      'sensitive headers'
    ],
    capabilities: {
      summarize: true,
      create: true,
      edit: true,
      delete: true,
      disable: true,
      localKeyManagement: false,
      authFileManagement: false,
      loginHandoff: false,
      importHandoff: false,
      ...noProviderLogic
    }
  }
}

function accountEntry(
  kind: UpstreamProviderKind,
  label: string,
  loginCommands: string[] = [],
  importHandoff = false
): UpstreamProviderCatalogEntry {
  const secretFields: UpstreamEditableFieldName[] = ['authFileSummary']

  return {
    kind,
    label,
    family: importHandoff ? 'imported-account-upstream' : 'account-upstream',
    cliproxyapi: {
      channel: kind,
      managementRoutes: {
        authFiles: '/auth-files',
        oauthModelAlias: '/oauth-model-alias',
        oauthExcludedModels: '/oauth-excluded-models'
      },
      loginCommands
    },
    editableFields: fields(
      ['authFileSummary', 'modelAliases', 'excludedModels', 'loginAction'],
      {
        secrets: secretFields
      }
    ),
    secretFields,
    redaction: [
      'OAuth tokens',
      'token file contents',
      'bearer tokens',
      'filesystem-sensitive auth paths'
    ],
    capabilities: {
      summarize: true,
      create: false,
      edit: true,
      delete: true,
      disable: true,
      localKeyManagement: false,
      authFileManagement: true,
      loginHandoff: loginCommands.length > 0 && !importHandoff,
      importHandoff,
      ...noProviderLogic
    }
  }
}

export const UPSTREAM_PROVIDER_KINDS: UpstreamProviderKind[] = [
  'api-keys',
  'gemini-api-key',
  'codex-api-key',
  'claude-api-key',
  'openai-compatibility',
  'vertex-api-key',
  'ampcode',
  'gemini-cli',
  'aistudio',
  'antigravity',
  'claude',
  'codex',
  'kimi',
  'vertex'
]

export const UPSTREAM_PROVIDER_CATALOG: UpstreamProviderCatalogEntry[] = [
  {
    kind: 'api-keys',
    label: 'Local client API keys',
    family: 'local-client-key',
    cliproxyapi: {
      section: 'api-keys',
      managementRoutes: { config: '/api-keys' },
      loginCommands: []
    },
    editableFields: fields(['apiKey'], {
      required: ['apiKey'],
      secrets: ['apiKey']
    }),
    secretFields: ['apiKey'],
    redaction: ['local client API key values'],
    capabilities: {
      summarize: true,
      create: true,
      edit: true,
      delete: true,
      disable: false,
      localKeyManagement: true,
      authFileManagement: false,
      loginHandoff: false,
      importHandoff: false,
      ...noProviderLogic
    }
  },
  apiKeyEntry('gemini-api-key', 'Gemini API key', '/gemini-api-key'),
  apiKeyEntry('codex-api-key', 'Codex API key', '/codex-api-key'),
  apiKeyEntry('claude-api-key', 'Claude API key', '/claude-api-key'),
  {
    kind: 'openai-compatibility',
    label: 'OpenAI-compatible provider',
    family: 'api-key-upstream',
    cliproxyapi: {
      section: 'openai-compatibility',
      managementRoutes: { config: '/openai-compatibility' },
      loginCommands: []
    },
    editableFields: fields(
      [
        'providerName',
        'disabled',
        'apiKeyEntries',
        'baseUrl',
        'prefix',
        'headers',
        'proxyUrl',
        'modelAliases',
        'excludedModels'
      ],
      {
        required: ['providerName', 'baseUrl', 'apiKeyEntries'],
        secrets: ['apiKeyEntries', 'headers', 'proxyUrl']
      }
    ),
    secretFields: ['apiKeyEntries', 'headers', 'proxyUrl'],
    redaction: [
      'API keys inside api-key-entries',
      'proxy URL credentials',
      'sensitive headers'
    ],
    capabilities: {
      summarize: true,
      create: true,
      edit: true,
      delete: true,
      disable: true,
      localKeyManagement: false,
      authFileManagement: false,
      loginHandoff: false,
      importHandoff: false,
      ...noProviderLogic
    }
  },
  apiKeyEntry('vertex-api-key', 'Vertex API key', '/vertex-api-key'),
  {
    kind: 'ampcode',
    label: 'Amp integration',
    family: 'amp-integration',
    cliproxyapi: {
      section: 'ampcode',
      managementRoutes: { config: '/ampcode' },
      loginCommands: []
    },
    editableFields: fields(
      [
        'upstreamUrl',
        'upstreamApiKey',
        'upstreamApiKeys',
        'restrictManagementToLocalhost',
        'forceModelMappings',
        'modelMappings'
      ],
      {
        secrets: ['upstreamApiKey', 'upstreamApiKeys', 'upstreamUrl']
      }
    ),
    secretFields: ['upstreamApiKey', 'upstreamApiKeys', 'upstreamUrl'],
    redaction: [
      'Amp upstream API keys',
      'client API key mappings',
      'credentials embedded in upstream URLs'
    ],
    capabilities: {
      summarize: true,
      create: true,
      edit: true,
      delete: true,
      disable: false,
      localKeyManagement: false,
      authFileManagement: false,
      loginHandoff: false,
      importHandoff: false,
      ...noProviderLogic
    }
  },
  accountEntry('gemini-cli', 'Gemini CLI OAuth', ['--login']),
  accountEntry('aistudio', 'AI Studio channel'),
  accountEntry('antigravity', 'Antigravity OAuth', ['--antigravity-login']),
  accountEntry('claude', 'Claude Code OAuth', ['--claude-login']),
  accountEntry('codex', 'Codex OAuth', [
    '--codex-login',
    '--codex-device-login'
  ]),
  accountEntry('kimi', 'Kimi OAuth', ['--kimi-login']),
  accountEntry('vertex', 'Vertex service-account import', ['--vertex-import'], true)
]

export function getUpstreamProviderCatalogEntry(
  kind: UpstreamProviderKind
): UpstreamProviderCatalogEntry {
  const entry = UPSTREAM_PROVIDER_CATALOG.find((candidate) => candidate.kind === kind)

  if (!entry) {
    throw new Error(`Unsupported upstream provider kind: ${kind}`)
  }

  return entry
}
