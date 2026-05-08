# allmone v0.1.2 Spec

Last updated: 2026-05-07
Status: Complete

## Version Goal

Build the first usable allmone control loop: a main-process runtime service that talks to CLIProxyAPI, secure local connection settings, typed IPC, and a minimal renderer that can test the connection and save simple provider/model configuration.

## Why This Version Exists

v0.1.1 proved the TypeScript contract layer for read-only CLIProxyAPI Management API calls. v0.1.2 should turn that contract into a real desktop workflow without jumping ahead into a full management center. The user should be able to connect allmone to an existing CLIProxyAPI runtime and add or update an OpenAI-compatible provider with simple model name/alias configuration.

## Source Context

Current CLIProxyAPI behavior that matters for this version:

- Management API base path is `http://localhost:8317/v0/management`.
- Every management request, including localhost, requires a management key through `Authorization: Bearer <key>` or `X-Management-Key: <key>`.
- The Management API writes changes back to YAML config and hot-reloads the service.
- `GET /config` returns parsed config.
- `GET/PUT/PATCH/DELETE /openai-compatibility` manages OpenAI-compatible providers.
- `GET/PUT/PATCH/DELETE /oauth-model-alias` exists, but global OAuth aliases do not apply to OpenAI-compatible providers.
- Payload rules are valid CLIProxyAPI config fields, but v0.1.2 does not manage them. This version should only use documented Management API endpoints for simple configuration writes.

Sources:

- https://help.router-for.me/management/api
- https://help.router-for.me/configuration/options
- https://github.com/router-for-me/CLIProxyAPI

## Scope

### In Scope

- Extend the `src/main/cli-proxy-api/` client with the write calls needed for this version.
- Add a main-process runtime service that owns the CLIProxyAPI client, current connection state, settings loading/saving, and redacted error reporting.
- Store connection settings in main process only. The renderer may submit a management key, but it must never store one in localStorage, sessionStorage, logs, or DOM state beyond the active form field.
- Persist non-secret settings in a file under Electron `app.getPath('userData')`.
- Persist the management key with Electron `safeStorage` when encryption is available; otherwise keep the key only in memory and mark it as not persisted.
- Expose typed IPC through preload for:
  - reading runtime state
  - saving connection settings
  - testing the connection
  - reading a sanitized config summary
  - upserting/deleting one OpenAI-compatible provider
- Replace the template renderer with a minimal operational screen:
  - connection settings form
  - runtime status panel
  - OpenAI-compatible provider form and list
- Keep renderer implementation framework-free unless the repo adds a framework before this version starts.
- Add focused tests for client write methods, settings persistence, runtime service behavior, config sanitization, and renderer/preload type contracts where practical.
- Update active docs after implementation.

### Out Of Scope

- No CLIProxyAPI process install, discovery, launch, restart, or shutdown orchestration.
- No tray menu.
- No OAuth login flows, auth-file upload/download/delete, or API key management UI.
- No full model inventory.
- No usage charts, log streaming, request history, or Redis queue UI.
- No local network sharing controls.
- No arbitrary YAML editor.
- No payload rule management, payload rule UI, or raw `config.yaml` mutation.
- No provider protocol parsing, request routing, API proxying, or request/response transformation inside allmone.

## User Workflows

### Connect To Runtime

The user opens allmone, enters a Management API base URL and management key, saves them, and clicks test. The app reports one normalized state:

- `reachable`
- `auth_required`
- `management_disabled`
- `unreachable`
- `timeout`
- `invalid_response`
- `unexpected_error`

The renderer never receives the saved management key after it is stored.

### Configure An OpenAI-Compatible Provider

The user can list existing OpenAI-compatible providers, then add or update one provider with:

- provider name
- disabled toggle
- base URL
- provider API key
- optional proxy URL
- optional static model `name` and `alias` rows
- optional provider headers only if the implementation can keep the UI simple

The main process writes this through `PATCH /openai-compatibility` when updating by name. It can fall back to `PUT /openai-compatibility` only when replacing a locally merged list is safer for the current API shape. All API keys must be redacted in state returned to the renderer.

### Configure Simple Model Exposure

The user can configure model exposure on an OpenAI-compatible provider by editing static model rows:

- upstream model `name`
- optional client-facing `alias`

This is intentionally narrower than payload rules. v0.1.2 does not manage request/output payload rewriting rules; it only passes supported provider/model configuration to CLIProxyAPI through Management API endpoints.

## Planned File Boundaries

- `src/main/cli-proxy-api/types.ts`: add write response types and OpenAI-compatible provider input types.
- `src/main/cli-proxy-api/client.ts`: add `upsertOpenAiCompatibilityProvider()`, `deleteOpenAiCompatibilityProvider()`, and any small helper needed for JSON write requests.
- `src/main/cli-proxy-api/*.test.ts`: cover method, URL, body, auth, status, and secret redaction behavior for write calls.
- `src/main/runtime/types.ts`: exported runtime state, sanitized config summary, connection settings, and provider form input types.
- `src/main/runtime/settingsStore.ts`: main-process-only settings store using `app.getPath('userData')` and `safeStorage`.
- `src/main/runtime/service.ts`: runtime service that loads settings, creates clients, maps CLIProxyAPI failures, redacts returned data, and exposes high-level operations.
- `src/main/runtime/ipc.ts`: typed IPC channel registration and request validation.
- `src/main/index.ts`: initialize runtime service and register IPC handlers.
- `src/preload/index.ts`: expose typed runtime API through `contextBridge`.
- `src/renderer/src/main.ts`: minimal app state, form handling, IPC calls, and DOM rendering.
- `src/renderer/src/styles.css`: replace template styling with a compact operational desktop layout.
- `docs/version/0.1.2/todo.md`: track implementation completion.
- Root `docs/spec.md`, `docs/prompt_plan.md`, and `docs/todo.md`: keep active version pointers accurate.

## Runtime Architecture

The renderer talks only to preload. Preload exposes a narrow `window.allmone.runtime` API backed by `ipcRenderer.invoke`. IPC handlers call the runtime service. The runtime service owns the CLIProxyAPI client and settings store.

This keeps secrets and raw management responses out of the renderer. Renderer state is treated as display state and form drafts, not source of truth.

## Data Flow

1. App startup initializes `settingsStore` and `runtimeService`.
2. Renderer requests runtime state through typed IPC.
3. Runtime service loads saved base URL, timeout, and encrypted management key status.
4. User saves connection settings; main process persists them and rebuilds the client.
5. User tests connection; service calls `checkManagementApi()` and returns a normalized status.
6. User saves provider; service validates input and writes through CLIProxyAPI Management API.
7. Runtime service refreshes sanitized config summary for the renderer.

## Error Handling

- Management keys, provider API keys, and proxy credentials must be redacted before any value crosses IPC.
- Auth failures must map to `auth_required`.
- 404 from management check remains `management_disabled`.
- 400/422 from Management API writes should surface as validation errors with the upstream message redacted.
- Timeout and network failures should keep the app usable and preserve local settings.
- If `safeStorage` encryption is unavailable, saving a management key should succeed only for the current app session and report `managementKeyPersisted: false`.

## Testing

- Unit-test write methods using injected fake `fetch`; never call a real CLIProxyAPI service.
- Unit-test settings persistence with fake filesystem/app paths and fake encryption adapters.
- Unit-test runtime service status mapping and sanitized summaries.
- Typecheck preload/renderer global API types.
- Run `bun run test`.
- Run `bun run typecheck`.

## Acceptance

- `docs/version/0.1.2/` contains this spec, an implementation prompt plan, and a todo file.
- The app has a visible minimal renderer for connection and simple configuration.
- Connection settings can be saved and tested.
- The renderer can display normalized runtime state without receiving stored secrets.
- The user can add/update/delete one OpenAI-compatible provider through CLIProxyAPI Management API, including simple static model name/alias rows.
- Payload rules are not managed in this version.
- `bun run test` and `bun run typecheck` pass.

## Handoff To v0.1.3

v0.1.3 should deepen the runtime connection GUI after this first thin workflow exists: better empty states, connection diagnostics, endpoint copy helpers, safer editing affordances, and clearer next actions when CLIProxyAPI is not configured.
