# allmone Upstream Catalog

Last updated: 2026-05-10
Status: Project planning reference

This document is the project-level catalog for CLIProxyAPI upstream families that allmone should expose over time. v0.1.5 is the first version that implements the complete current catalog named here.

Use this file as the source reference for catalog implementation, tests, IPC, renderer planning, and future version planning.

## Scope

The catalog is data-only. It records which CLIProxyAPI upstream families allmone should expose, what allmone may edit, which fields are secrets, and which UI actions are allowed.

allmone must not implement API proxying, provider adapters, routing, payload rules, OAuth protocol handling, or request/response transformation.

## Provider Kinds

The project catalog includes these upstream provider kinds:

- `api-keys`
- `gemini-api-key`
- `codex-api-key`
- `claude-api-key`
- `openai-compatibility`
- `vertex-api-key`
- `ampcode`
- `gemini-cli`
- `aistudio`
- `antigravity`
- `claude`
- `codex`
- `kimi`
- `vertex`

## CLIProxyAPI Output Types

CLIProxyAPI can expose multiple client-facing output protocol surfaces over the local runtime. allmone should present the local service origin, such as `http://127.0.0.1:<port>`, as the user-facing root for these routes and treat protocol-specific paths as CLIProxyAPI capabilities, not provider logic owned by allmone.

| Output type | Representative route shape | Client compatibility | allmone responsibility |
| --- | --- | --- | --- |
| OpenAI Chat Completions | `/v1/chat/completions` | OpenAI-compatible chat clients and SDKs | Show the path from the local service origin and local key; do not transform messages or responses |
| OpenAI Responses | `/v1/responses` | OpenAI Responses-compatible clients, including Codex-style clients | Show the path from the local service origin and local key; do not implement Responses translation |
| Model inventory | `/v1/models`, Provider-scoped CLIProxyAPI model discovery where available, configured provider `models` entries, and OpenAI-compatible upstream `/models` fallback | allmone Models module and local clients that inspect available model IDs | allmone may call local CLIProxyAPI model output for account/OAuth providers, may read configured API-key provider model entries from CLIProxyAPI-backed summaries, and may call OpenAI-compatible upstream `/models` from the main process when CLIProxyAPI cannot provide Provider-scoped discovery; do not call non-OpenAI-compatible upstream model endpoints |
| Gemini native generate content | `/v1beta/models/...` or provider-specific Gemini route shapes | Gemini/Google GenAI-compatible clients | Expose availability as CLIProxyAPI capability; do not implement Gemini protocol handling |
| Claude native messages | `/v1/messages` and `/v1/messages/count_tokens` where supported | Anthropic/Claude-compatible clients | Expose availability as CLIProxyAPI capability; do not implement Claude protocol handling or token counting |
| Image generation/editing | `/v1/images/generations`, `/v1/images/edits` where enabled | OpenAI-style image clients | Reflect enabled/disabled state when CLIProxyAPI exposes it; do not implement image generation |
| WebSocket responses | `/v1/ws` where supported | Clients that use CLIProxyAPI WebSocket streaming/interactive output | Surface auth requirement and connection hint only; do not proxy WebSocket traffic in allmone |
| Amp provider aliases | `/api/provider/{provider}/v1...` | Amp CLI/IDE provider-specific API patterns | Treat as Amp integration routing owned by CLIProxyAPI; configure only supported Amp settings |
| Amp management proxy output | `/api/auth`, `/api/user`, `/api/meta`, `/api/threads`, `/api/telemetry`, `/api/internal` when Amp upstream is configured | Amp CLI/IDE account and thread management flows | Configure `ampcode` settings and local key protection; do not inspect or persist proxied management payloads |

Notes:

- CLIProxyAPI routing is still resolved by model name, alias, prefix, credential selection, and channel rules inside CLIProxyAPI.
- Provider-specific paths select a protocol surface, but they are not a guarantee that allmone can pin or emulate a backend.
- allmone may present these output types as local connection options after the managed runtime is healthy.
- allmone must not parse, rewrite, or validate provider request/response bodies beyond its own narrow IPC payloads.

## Catalog Matrix

| Provider kind | Family | CLIProxyAPI section or channel | Management surface | allmone editable fields | Secret fields | Required redaction | UI capabilities |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `api-keys` | Local client API keys | allmone encrypted local output key config; CLIProxyAPI consumes keys for `/models` and proxy auth | allmone local key service; CLIProxyAPI runtime auth config where needed | Startup key bootstrap, generate name-only key, set key display name, reveal key, delete key by stable ID | Local API key plaintext and encrypted-at-rest key payloads | Mask stored keys by default; persist encrypted values; return plaintext only for immediate create/reveal responses; generate one persistent default key when none exists | Named local key setup, startup default key, local key reveal, local key delete, local key configured state, copy explicitly revealed key |
| `gemini-api-key` | API-key upstream | Config section `gemini-api-key` | `/gemini-api-key` | API key, base URL, prefix, disabled state where supported, headers, proxy URL, model aliases, excluded models | API key, proxy credentials, sensitive headers | Hide API key and sensitive header/proxy values in summaries and errors | Create, edit, delete, summarize |
| `codex-api-key` | API-key upstream | Config section `codex-api-key` | `/codex-api-key` | API key, base URL, prefix, disabled state where supported, headers, proxy URL, model aliases, excluded models | API key, proxy credentials, sensitive headers | Hide API key and sensitive header/proxy values in summaries and errors | Create, edit, delete, summarize |
| `claude-api-key` | API-key upstream | Config section `claude-api-key` | `/claude-api-key` | API key, base URL, prefix, disabled state where supported, headers, proxy URL, model aliases, excluded models | API key, proxy credentials, sensitive headers, hidden `cloak` secrets if present, hidden `experimental-cch-signing` secrets if present | Hide API key and sensitive header/proxy values; preserve existing `cloak` and `experimental-cch-signing` fields unless explicitly replaced through supported fields | Create, edit, delete, summarize |
| `openai-compatibility` | API-key upstream | Config section `openai-compatibility` | `/openai-compatibility` | Provider `name`, `disabled`, `api-key-entries`, base URL, prefix, headers, proxy URL, model aliases, excluded models | API keys inside `api-key-entries`, proxy credentials, sensitive headers | Hide API key entries and sensitive header/proxy values; use `api-key-entries`, not legacy `api-keys` | Create, edit, delete, summarize |
| `vertex-api-key` | API-key upstream | Config section `vertex-api-key` | `/vertex-api-key` | `x-goog-api-key`, optional base URL, prefix, disabled state where supported, headers, proxy URL, model aliases, excluded models | `x-goog-api-key`, proxy credentials, sensitive headers | Hide key and sensitive header/proxy values in summaries and errors | Create, edit, delete, summarize |
| `ampcode` | Amp integration | Config section `ampcode` | Supported `ampcode` management endpoints | `upstream-url`, `upstream-api-key`, `upstream-api-keys`, `restrict-management-to-localhost`, `force-model-mappings`, `model-mappings` | `upstream-api-key`, values in `upstream-api-keys`, proxy credentials if embedded in URLs | Hide upstream API keys and sensitive URL credentials in summaries and errors | View settings, edit settings, delete/reset supported fields, summarize |
| `gemini-cli` | Account/OAuth upstream | Channel `gemini-cli` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models`; login command `--login` | Auth-file disable/delete where supported, OAuth model aliases, OAuth excluded models | OAuth tokens, token files, bearer tokens, auth-file paths where sensitive | Hide token contents and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files, launch login handoff |
| `aistudio` | Account/channel upstream | Channel `aistudio` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models` where available | Auth-file safe actions where supported, OAuth model aliases, OAuth excluded models | Tokens, auth-file contents, bearer tokens, auth-file paths where sensitive | Hide token contents and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files where supported |
| `antigravity` | Account/OAuth upstream | Channel `antigravity` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models`; login command `--antigravity-login` | Auth-file disable/delete where supported, OAuth model aliases, OAuth excluded models | OAuth tokens, token files, bearer tokens, auth-file paths where sensitive | Hide token contents and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files, launch login handoff |
| `claude` | Account/OAuth upstream | Channel `claude` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models`; login command `--claude-login` | Auth-file disable/delete where supported, OAuth model aliases, OAuth excluded models | OAuth tokens, token files, bearer tokens, auth-file paths where sensitive | Hide token contents and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files, launch login handoff |
| `codex` | Account/OAuth upstream | Channel `codex` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models`; login commands `--codex-login`, `--codex-device-login` | Auth-file disable/delete where supported, OAuth model aliases, OAuth excluded models | OAuth tokens, token files, bearer tokens, auth-file paths where sensitive | Hide token contents and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files, launch browser/device login handoff |
| `kimi` | Account/OAuth upstream | Channel `kimi` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models`; login command `--kimi-login` | Auth-file disable/delete where supported, OAuth model aliases, OAuth excluded models | OAuth tokens, token files, bearer tokens, auth-file paths where sensitive | Hide token contents and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files, launch login handoff |
| `vertex` | Imported account upstream | Channel `vertex` | `/auth-files`, `/oauth-model-alias`, `/oauth-excluded-models`; import command `--vertex-import <json>` | Auth-file disable/delete where supported, OAuth model aliases, OAuth excluded models, service-account import handoff | Service-account JSON contents, token files, bearer tokens, auth-file paths where sensitive | Hide service-account contents, token contents, and filesystem-sensitive details | Show auth-file summaries, disable/delete auth files, launch import handoff |

## Shared Editable Field Vocabulary

Use one shared vocabulary in types and tests, then map it to each CLIProxyAPI section:

- `apiKey`: single upstream API key or local client API key.
- `localKeyName`: user-visible local client API key display name stored in allmone config.
- `localKeyCiphertext`: encrypted-at-rest local client API key value owned by allmone config.
- `apiKeyEntries`: multiple named or provider-specific API-key rows.
- `baseUrl`: provider endpoint base URL.
- `providerName`: required provider name, especially for OpenAI-compatible entries.
- `prefix`: optional model prefix where CLIProxyAPI supports it.
- `disabled`: provider or entry disabled state where CLIProxyAPI supports it.
- `headers`: user-supplied HTTP headers; sensitive names and values must be redacted.
- `proxyUrl`: upstream proxy URL; credentials inside the URL are secrets.
- `modelAliases`: model alias rows.
- `excludedModels`: excluded model rows.
- `upstreamUrl`: Amp upstream URL.
- `upstreamApiKey`: Amp single upstream API key.
- `upstreamApiKeys`: Amp key mapping rows.
- `restrictManagementToLocalhost`: Amp localhost management restriction.
- `forceModelMappings`: Amp model mapping enforcement flag.
- `modelMappings`: Amp model mapping rows.
- `authFileSummary`: sanitized auth-file metadata only.
- `loginAction`: explicit CLIProxyAPI one-shot login/import action.

## Shared Types To Add

The project catalog should drive shared upstream types covering:

- Provider catalog entries.
- Provider summaries.
- API-key credential inputs.
- Model alias rows.
- Excluded model rows.
- Header rows.
- Proxy URL values.
- Amp config.
- Auth-file summaries.
- Login/import actions.
- Named local output key encrypted state.

Recommended type boundaries:

- Main process may receive plaintext submitted keys.
- Renderer summaries must be sanitized.
- IPC responses must not include hidden upstream secrets except explicit local output key create/reveal responses.
- Local output key plaintext belongs only in transient main-process handling and explicit renderer reveal responses; persisted allmone config stores encrypted key values.
- Catalog metadata should identify secret fields so tests can assert no secret field is displayable.

## Required Tests

Catalog tests should prove:

- Every provider kind in this document exists in the catalog.
- Every provider kind from `docs/version/0.1.5/spec.md` is covered.
- Each catalog entry identifies its section or channel.
- Each secret field is marked non-displayable.
- No catalog entry introduces provider protocol logic or request/response transformation behavior.

Later prompts should add route, service, IPC, renderer, and redaction tests as their implementation surfaces appear.

## Implementation Guardrails

- Prefer CLIProxyAPI Management API writes.
- Local output keys are an exception: allmone owns their durable encrypted storage because CLIProxyAPI is only the proxy/runtime consumer.
- On startup, allmone should ensure at least one persistent local output key exists before calling local model output endpoints; it may generate and persist a default key when missing.
- If a CLIProxyAPI endpoint is unavailable, mark that operation unsupported instead of raw-editing YAML by string replacement.
- Preserve unknown CLIProxyAPI fields.
- Preserve hidden `claude-api-key` fields such as `cloak` and `experimental-cch-signing` unless a supported field explicitly replaces the row.
- For the allmone-managed runtime, keep OAuth and imported account material under `~/.allmone/runtime/cli-proxy-api/auth/`.
- Login/import handoffs must be explicit user actions and must not replace the managed runtime process.
