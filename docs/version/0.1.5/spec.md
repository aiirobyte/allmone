# allmone v0.1.5 Spec

Last updated: 2026-05-08
Status: Complete

## Version Goal

Make allmone useful for real local proxy setup: users can configure every currently supported CLIProxyAPI upstream family, configure local client API keys, and copy a working local OpenAI-compatible endpoint backed by the allmone-managed CLIProxyAPI runtime.

## Why This Version Exists

v0.1.4 makes allmone own installation, config, process lifecycle, port, and tray controls for CLIProxyAPI. That creates a managed runtime, but the product still needs the first practical workflow: add upstream credentials, protect the local proxy with a local key, then call the local API.

v0.1.5 should close that loop without implementing proxying, provider adapters, request routing, payload rules, or response conversion inside allmone. CLIProxyAPI remains the runtime source of truth for all provider behavior. allmone only writes supported configuration through CLIProxyAPI Management API or allmone-owned YAML patching, shows redacted summaries, starts explicit login/import handoffs, and gives the user copyable local connection values.

## Source Context

Use current official CLIProxyAPI sources during implementation:

- CLIProxyAPI repository: `https://github.com/router-for-me/CLIProxyAPI`
- Current config example: `https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/config.example.yaml`
- Management API docs: `https://help.router-for.me/management/api`
- Configuration options: `https://help.router-for.me/configuration/options`
- Provider docs:
  - `https://help.router-for.me/configuration/provider/gemini-cli`
  - `https://help.router-for.me/configuration/provider/antigravity`
  - `https://help.router-for.me/configuration/provider/claude-code`
  - `https://help.router-for.me/configuration/provider/codex`
  - `https://help.router-for.me/configuration/provider/ai-studio`
  - `https://help.router-for.me/configuration/provider/openai-compatibility`

As checked on 2026-05-08 against CLIProxyAPI `main`, current upstream support includes API-key configuration sections, Amp integration, OAuth/account channels, and Vertex service-account import. If CLIProxyAPI changes before implementation, update the provider catalog from official sources first.

## Baseline From v0.1.4

v0.1.5 assumes v0.1.4 is complete:

- allmone creates and owns `~/.allmone`.
- allmone stores non-secret software settings in `~/.allmone/config.yaml`.
- allmone stores CLIProxyAPI runtime settings under `cliproxyapi.runtime` in `~/.allmone/config.yaml`; the old top-level `runtime` block is not supported.
- allmone stores the encrypted Management API credential in `~/.allmone/runtime/cli-proxy-api/management-key.json`.
- allmone derives the Management API base URL and timeout from `~/.allmone/config.yaml`.
- allmone installs and updates the managed CLIProxyAPI binary under `~/.allmone/runtime/cli-proxy-api/bin/`.
- allmone writes and preserves `~/.allmone/runtime/cli-proxy-api/config.yaml`.
- allmone launches, restarts, stops, and tracks the managed CLIProxyAPI process.
- allmone owns the local output port and exposes the safe API base URL.
- allmone has tray controls and a compact managed-runtime renderer panel.

If v0.1.4 is not complete, finish it before implementing this version.

## Upstream Catalog

v0.1.5 must represent all current CLIProxyAPI upstream families.

### API-Key And Configured Upstreams

These support direct configuration from allmone:

- Local client API keys: `api-keys`
- Gemini API key: `gemini-api-key`
- Codex API key: `codex-api-key`
- Claude API key: `claude-api-key`
- OpenAI-compatible providers: `openai-compatibility`
- Vertex-compatible API key: `vertex-api-key`
- Amp integration: `ampcode`

Shared editable fields where supported:

- API key or upstream API key
- base URL or upstream URL
- provider name where the CLIProxyAPI section requires one
- prefix
- disabled state when the CLIProxyAPI section supports it
- headers
- proxy URL
- model aliases
- excluded models

Provider-specific fields:

- `openai-compatibility`: provider `name`, `disabled`, `api-key-entries`
- `claude-api-key`: `cloak` settings and `experimental-cch-signing` remain hidden in v0.1.5 unless already present; allmone should preserve them
- `ampcode`: `upstream-url`, `upstream-api-key`, `upstream-api-keys`, `restrict-management-to-localhost`, `force-model-mappings`, and `model-mappings`
- `vertex-api-key`: `x-goog-api-key` value and optional base URL

### Account/OAuth/Imported Upstreams

These are supported by CLIProxyAPI but are not simple endpoint/key rows:

- Gemini CLI OAuth: channel `gemini-cli`, command `--login`
- AI Studio channel: `aistudio`
- Antigravity OAuth: channel `antigravity`, command `--antigravity-login`
- Claude Code OAuth: channel `claude`, command `--claude-login`
- Codex OAuth: channel `codex`, commands `--codex-login` and `--codex-device-login`
- Kimi OAuth: channel `kimi`, command `--kimi-login`
- Vertex service-account import: channel `vertex`, command `--vertex-import <json>`

v0.1.5 should show these as supported upstream families, list their existing auth files through CLIProxyAPI Management API when available, allow disabling/deleting auth files, and provide explicit user-triggered login/import handoffs. It should not build custom OAuth protocol handlers in allmone.

## Runtime Auth Directory

v0.1.5 should add an allmone-owned CLIProxyAPI auth directory:

```text
~/.allmone/runtime/cli-proxy-api/auth/
```

Rules:

- Patch CLIProxyAPI `auth-dir` to this path in the allmone-managed runtime config.
- Store OAuth token files and imported Vertex service-account files only through CLIProxyAPI-supported commands or Management API upload/import flows.
- Do not copy token files into renderer-accessible state.
- Do not migrate or scan `~/.cli-proxy-api` by default.
- Preserve existing user-authored `auth-dir` only if allmone is not managing the runtime config. For the allmone-managed runtime, use the allmone-owned auth directory.

## Scope

### In Scope

- Add a canonical allmone upstream provider catalog for every current CLIProxyAPI upstream family listed above.
- Extend main-process CLIProxyAPI Management API client support for:
  - `GET/PUT/PATCH/DELETE /api-keys`
  - `GET/PUT/PATCH/DELETE /gemini-api-key`
  - `GET/PUT/PATCH/DELETE /codex-api-key`
  - `GET/PUT/PATCH/DELETE /claude-api-key`
  - `GET/PUT/PATCH/DELETE /openai-compatibility`
  - `GET/PUT/PATCH/DELETE /vertex-api-key`
  - `GET/PUT/PATCH/DELETE /oauth-model-alias`
  - `GET/PUT/PATCH/DELETE /oauth-excluded-models`
  - `GET/PUT/PATCH/DELETE /auth-files`
  - supported `ampcode` management endpoints
- Keep tests isolated with injected fetch, spawn, dialog, and filesystem adapters.
- Add a main-process upstream service that reads, writes, redacts, and summarizes upstream resources.
- Add local client API key management so the user can set, generate, delete, and copy a local key for the local API.
- Show local connection output:
  - API base: `http://127.0.0.1:<port>/v1`
  - local key state
  - curl/OpenAI SDK style connection hints without revealing hidden keys except immediately after generation or user entry
- Add API-key upstream CRUD for Gemini, Codex, Claude, OpenAI-compatible, and Vertex.
- Add Amp integration configuration for the supported fields above.
- Add account/OAuth upstream visibility through auth-file summaries.
- Add explicit login/import handoffs for Gemini CLI, Antigravity, Claude Code, Codex, Kimi, and Vertex service-account import by running the managed CLIProxyAPI binary in the relevant one-shot mode with the allmone-owned config path.
- Add and use `~/.allmone/runtime/cli-proxy-api/auth` as the allmone-managed CLIProxyAPI `auth-dir`.
- Preserve unknown CLIProxyAPI config fields and provider-specific fields that v0.1.5 does not edit.
- Redact upstream API keys, local API keys, management keys, proxy credentials, bearer tokens, and sensitive headers before state crosses IPC.
- Keep renderer durable storage free of secrets.
- Keep existing provider editing working while migrating it into the broader upstream surface.
- Add tests for provider catalog coverage, Management API client routes, redaction, payload validation, secret handling, login/import command construction, and renderer type coverage.
- Run `bun run test`, `bun run typecheck`, and `bun run build`.
- Update root docs and version todo after implementation.

### Out Of Scope

- No API proxying, provider adapter implementation, request routing, payload rules, or response conversion inside allmone.
- No provider network tests from allmone; upstream verification remains CLIProxyAPI behavior.
- No usage dashboards, request logs, queue views, or cost estimates.
- No full model inventory beyond user-entered aliases and redacted summaries returned by CLIProxyAPI.
- No local network sharing beyond the v0.1.4 localhost binding.
- No raw YAML editor.
- No automatic import from third-party provider accounts or browser extensions.
- No custom OAuth implementation in allmone. Login/import handoffs run CLIProxyAPI-supported commands only.
- No management of storage backends beyond the local allmone-managed runtime home.
- No payload rule UI.

## User Workflows

### First Working Local API

The user opens allmone after v0.1.4 has started CLIProxyAPI. allmone shows the local API base and prompts for a local client API key if none exists. The user generates or enters a local key, adds an upstream provider, and copies the local API base plus local key.

The resulting client target is:

```text
base_url: http://127.0.0.1:<port>/v1
api_key: <local client key>
```

### Add An API-Key Upstream

The user picks an upstream type from the complete catalog. allmone shows the fields supported by that type, validates required fields, sends the write through CLIProxyAPI Management API, refreshes the redacted summary, and never persists the entered upstream key in renderer storage.

For example, OpenAI-compatible uses `openai-compatibility`, Claude uses `claude-api-key`, Gemini uses `gemini-api-key`, Codex uses `codex-api-key`, and Vertex uses `vertex-api-key`.

### Configure Amp

The user can configure Amp upstream URL/API key and optional model mappings. allmone writes only the supported `ampcode` fields and redacts any upstream API key in summaries.

### Use OAuth Or Imported Accounts

The user selects an account-backed provider and chooses a login/import action. allmone starts a one-shot CLIProxyAPI command with the allmone config path and displays a safe progress state. After completion, allmone refreshes `auth-files` and shows the account source, provider, label/status, and redacted diagnostics.

### Manage Existing Upstreams

The user can disable/delete supported upstream records through CLIProxyAPI Management API. For auth files, allmone can disable/delete the file or edit safe metadata fields that CLIProxyAPI exposes. It must not expose token file contents.

## Architecture

Add a provider-management layer beside the managed runtime:

- `UpstreamProviderCatalog`: static catalog generated from current CLIProxyAPI support. Defines provider kind, storage section, management routes, editable fields, secret fields, and UI capabilities.
- `CliProxyApiClient`: expands typed read/write support for upstream sections, local API keys, auth files, OAuth model controls, and Amp endpoints.
- `UpstreamService`: main-process service that validates inputs, calls CLIProxyAPI Management API, redacts summaries, and keeps renderer-facing state secret-free.
- `ProviderLoginRunner`: starts one-shot CLIProxyAPI login/import commands with the managed binary, managed config path, and provider-specific flags.
- `RuntimeService`: remains responsible for runtime connection and process state, but delegates provider/upstream operations to `UpstreamService`.
- `Runtime IPC`: adds narrow, typed upstream commands with strict payload validation.
- `Renderer`: adds an upstream setup surface and local connection card without a framework migration.

The main process is the only process that handles plaintext upstream keys after submission. Renderer state may contain only user-entered form values during the current page lifetime and must not write secrets to localStorage, sessionStorage, IndexedDB, logs, DOM data attributes, or checked-in files.

## Data Flow

1. allmone starts the managed CLIProxyAPI runtime from v0.1.4.
2. Renderer asks main process for sanitized runtime state, provider catalog, upstream summaries, auth-file summaries, and local key state.
3. User submits a provider form.
4. IPC validates the payload and sends it to `UpstreamService`.
5. `UpstreamService` maps the provider kind to the CLIProxyAPI Management API route and request body.
6. CLIProxyAPI persists and hot-reloads the config.
7. allmone refreshes the relevant summary and returns redacted data.
8. User copies local API base and, only when explicitly generated or entered, the local client key.

## Error Handling

- Invalid provider kind must fail before any CLIProxyAPI write.
- Required-field validation must happen before IPC calls CLIProxyAPI.
- Failed provider writes must return redacted diagnostics.
- Secrets in CLIProxyAPI errors must be redacted before IPC responses.
- Login/import command failures must not stop the managed runtime.
- A running managed runtime should not be replaced by a login/import child process.
- Auth-file reads must hide token contents and filesystem-sensitive details where not needed.
- Deleting a provider or auth file should require an explicit user action.
- If a CLIProxyAPI version lacks one expected endpoint, allmone should show that provider operation as unsupported instead of falling back to YAML string manipulation.

## Testing

- Unit-test provider catalog coverage for every v0.1.5 provider kind.
- Unit-test Management API client route construction and auth headers with fake fetch.
- Unit-test provider input validation and request body mapping for each API-key upstream.
- Unit-test local API key generation, set, delete, redaction, and one-time copy behavior.
- Unit-test Amp config read/write and redaction.
- Unit-test auth-file summary redaction and disable/delete payloads.
- Unit-test login/import command construction using fake process adapters.
- Unit-test IPC payload validation for all upstream commands.
- Unit-test renderer types and no durable secret writes.
- Re-run existing runtime, installer, process, IPC, tray, and renderer type checks.
- Run:
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`

## Acceptance

- `docs/version/0.1.5/` contains this spec, a prompt plan, and a todo file.
- allmone exposes the complete current CLIProxyAPI upstream catalog.
- Users can configure API-key upstreams for Gemini, Codex, Claude, OpenAI-compatible, and Vertex.
- Users can configure Amp integration fields in scope.
- Users can view and manage account/OAuth/imported upstream auth-file summaries without seeing token contents.
- Users can launch CLIProxyAPI-supported login/import handoffs for account-backed upstreams.
- Users can configure a local client API key.
- Users can copy the local API base and local key for a working local OpenAI-compatible API call.
- Renderer and tray never receive plaintext management credentials or hidden upstream secrets.
- allmone still contains no proxying, provider adapter, routing, payload-rule, or request/response transformation code.
- Verification commands pass.

## Handoff To v0.2.0

v0.2.0 can build richer auth/account management, model inventory, and health presentation on top of the working v0.1.5 provider setup flow.
