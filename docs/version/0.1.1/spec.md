# allmone v0.1.1 Spec

Last updated: 2026-05-07
Status: Complete

## Version Goal

Define and implement the first allmone-to-CLIProxyAPI contract layer. v0.1.1 should leave the app visually close to the template, but add a tested TypeScript boundary that future runtime status, tray, auth, model inventory, and usage views can depend on.

## Why This Version Exists

The next product work depends on knowing what CLIProxyAPI exposes and how allmone should call it. Building GUI first would force renderer code to invent API shapes. v0.1.1 keeps the foundation narrow: source-backed types, a main-process-safe HTTP client, error mapping, and tests.

## Source Context

The current CLIProxyAPI Management API docs state:

- Base path: `http://localhost:8317/v0/management`.
- Every request, including localhost, needs a management key.
- The key can be sent with `Authorization: Bearer <plaintext-key>` or `X-Management-Key: <plaintext-key>`.
- The API manages runtime configuration and auth files, persists changes to YAML, and hot-reloads the service.
- `GET /config` returns full config.
- `GET /usage-queue?count=10` pops usage records from the queue.
- `GET /api-keys` lists proxy service API keys.
- `GET /api-key-usage` returns recent usage buckets grouped by provider and key.
- `GET /auth-files` lists runtime auth files when the auth manager is available.
- There is no documented `GET /models` endpoint; model inventory must be derived later from config/auth/provider data unless CLIProxyAPI adds a dedicated endpoint.

Sources:

- https://help.router-for.me/management/api
- https://help.router-for.me/introduction/what-is-cliproxyapi
- https://github.com/router-for-me/CLIProxyAPI

## Scope

### In Scope

- Add a focused `src/main/cli-proxy-api/` module.
- Add TypeScript types for the management API fields needed by the next versions.
- Add a thin HTTP client for read-only calls needed by early runtime and inventory work.
- Add error classes or discriminated error results for connection, auth, disabled-management, timeout, invalid JSON, and unexpected HTTP responses.
- Add Bun tests for URL building, auth headers, response normalization, redaction helpers, and error mapping.
- Add a `bun run test` script if absent.
- Update version todo after implementation.

### Out Of Scope

- No renderer GUI changes.
- No Electron IPC changes.
- No tray menu.
- No process start/stop orchestration.
- No write endpoints for auth or config.
- No model inventory UI.
- No API proxying, provider adapters, routing, or request/response conversion.

## Planned File Boundaries

- `src/main/cli-proxy-api/types.ts`: exported request/response and normalized domain types.
- `src/main/cli-proxy-api/errors.ts`: client error types and HTTP-to-state mapping.
- `src/main/cli-proxy-api/client.ts`: fetch-based management API client.
- `src/main/cli-proxy-api/redact.ts`: shared redaction helpers for keys and URLs.
- `src/main/cli-proxy-api/index.ts`: public exports for future main-process services.
- `src/main/cli-proxy-api/*.test.ts`: Bun tests for contract behavior.
- `package.json`: add `test` script only if needed.
- `docs/version/0.1.1/todo.md`: update completion state.

## Contract Shape

The client should expose read-only methods first:

- `getConfig()`
- `getLatestVersion()`
- `getUsageQueue(count)`
- `getUsageStatisticsEnabled()`
- `getApiKeys()`
- `getApiKeyUsage()`
- `getAuthFiles()`
- `getOpenAiCompatibilityProviders()`
- `checkManagementApi()`

`checkManagementApi()` should not need a dedicated upstream health endpoint. It can call a low-risk management endpoint and map the result into:

- `reachable`
- `auth_required`
- `management_disabled`
- `unreachable`
- `timeout`
- `invalid_response`
- `unexpected_error`

## Acceptance

- `src/main/cli-proxy-api/` exists with a clear public boundary.
- The client defaults to `http://localhost:8317/v0/management` but accepts an override base URL.
- Management keys are attached only inside the client and never logged by tests or helper output.
- Types preserve unknown CLIProxyAPI fields safely instead of throwing them away.
- Read methods normalize known fields and keep raw responses available where useful.
- Tests cover successful JSON, empty config, usage queue arrays, auth headers, redaction, network failure, timeout, invalid JSON, and documented 404 management-disabled behavior.
- `bun run test` and `bun run typecheck` pass.
- No renderer, preload, tray, or provider proxying implementation is added.

## Handoff To v0.1.2

v0.1.2 should build a main-process runtime service on top of this contract, store connection settings, expose typed IPC, and give the renderer runtime status states.

## Result

v0.1.1 is complete. The main-process CLIProxyAPI Management API contract layer now has typed responses, redaction helpers, error mapping, a fetch-based read-only client, and Bun coverage for the runtime contract behavior.
