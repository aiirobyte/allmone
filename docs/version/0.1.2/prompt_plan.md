# allmone v0.1.2 Prompt Plan

Last updated: 2026-05-07
Status: Complete

This plan implements `docs/version/0.1.2/spec.md`.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read `docs/version/0.1.2/spec.md`.
4. Check `git status --short`.
5. Preserve user changes.
6. Do not call a real CLIProxyAPI service from tests.
7. Do not move management keys, provider API keys, or proxy credentials into renderer storage.

## Prompt 0: Contract Writes And Provider Types

Goal: extend the v0.1.1 CLIProxyAPI contract from read-only status calls to the write calls needed by v0.1.2.

Prompt:

```text
Read docs/version/0.1.2/spec.md and src/main/cli-proxy-api/.
Extend src/main/cli-proxy-api/types.ts with:
- status response result types for write calls
- OpenAI-compatible provider upsert/delete input types
Extend src/main/cli-proxy-api/client.ts with JSON request support for PUT/PATCH/DELETE.
Implement upsertOpenAiCompatibilityProvider and deleteOpenAiCompatibilityProvider.
Keep Authorization bearer header handling inside the client.
Add Bun tests using injected fake fetch for method, URL, body, auth header, non-2xx errors, invalid JSON errors, and redaction.
Run bun run test and bun run typecheck.
Update docs/version/0.1.2/todo.md.
```

Acceptance:

- Write calls compile and are exported from `src/main/cli-proxy-api/index.ts`.
- Tests do not call a real service.
- No test output includes a whole management key or provider API key.

## Prompt 1: Main-Process Settings Store

Goal: keep connection settings out of renderer storage and persist secrets only when Electron safe storage is available.

Prompt:

```text
Create src/main/runtime/settingsStore.ts and src/main/runtime/types.ts.
Implement a settings store that persists non-secret settings under app.getPath('userData').
Persist baseUrl, timeoutMs, and metadata in JSON.
Persist managementKey through an injectable safeStorage adapter that wraps Electron safeStorage.
When encryption is unavailable, keep managementKey in memory and return managementKeyPersisted: false.
Add tests with fake app paths, fake safeStorage adapters, and temporary directories.
Cover first launch, save without key, save with encryptable key, decrypt failure, safeStorage unavailable, and clearing a key.
Run bun run test and bun run typecheck.
Update docs/version/0.1.2/todo.md.
```

Acceptance:

- Renderer code is not involved.
- Stored JSON never contains the plaintext management key.
- The store can report whether a management key exists and whether it was persisted.

## Prompt 2: Runtime Service And Sanitized State

Goal: create the main-process service that owns CLIProxyAPI interaction.

Prompt:

```text
Create src/main/runtime/service.ts.
Runtime service operations:
- initialize from settings
- getState
- saveConnectionSettings
- testConnection
- getConfigSummary
- upsertOpenAiCompatibilityProvider
- deleteOpenAiCompatibilityProvider
Sanitize all provider API keys, management state, proxy URLs, and upstream errors before returning data.
Do not add payload rule management or raw config YAML editing in this version.
Add tests for status mapping, client rebuilding after settings changes, sanitized config summary, and provider upsert/delete calls.
Run bun run test and bun run typecheck.
Update docs/version/0.1.2/todo.md.
```

Acceptance:

- Main-process runtime operations are testable without Electron windows.
- No operation returns plaintext secrets to callers.

## Prompt 3: Typed IPC And Preload Bridge

Goal: expose the runtime service to the renderer through a typed, narrow IPC surface.

Prompt:

```text
Create src/main/runtime/ipc.ts.
Register IPC handlers for runtime:get-state, runtime:save-connection, runtime:test-connection, runtime:get-config-summary, runtime:upsert-openai-provider, and runtime:delete-openai-provider.
Update src/main/index.ts to create the settings store, runtime service, and IPC handlers before creating the main window.
Update src/preload/index.ts to expose window.allmone.runtime with typed invoke wrappers.
Add or update global renderer type declarations so TypeScript knows the preload API shape.
Validate IPC payloads before calling runtime service; reject invalid shapes with non-secret errors.
Run bun run test and bun run typecheck.
Update docs/version/0.1.2/todo.md.
```

Acceptance:

- Renderer has no direct `ipcRenderer` access.
- IPC channel names are centralized.
- Typecheck proves the renderer can call the exposed runtime API.

## Prompt 4: Minimal Renderer Configuration Screen

Goal: replace the template screen with the first usable control surface.

Prompt:

```text
Read docs/version/0.1.2/spec.md and the existing renderer files.
Update src/renderer/src/main.ts with a framework-free state/render loop for:
- connection settings form
- runtime status panel
- OpenAI-compatible provider list and edit form
Update src/renderer/src/styles.css for a compact desktop control-plane layout.
Keep forms ergonomic but minimal; do not add marketing copy or tutorial text.
Do not store management keys or provider API keys in localStorage/sessionStorage.
After save/test operations, refresh state from runtime.
Run bun run typecheck.
Run bun run build if typecheck passes.
Update docs/version/0.1.2/todo.md.
```

Acceptance:

- First screen is the operational app, not a landing page.
- Users can save connection settings, test connection, and edit OpenAI-compatible providers with simple static model rows.
- Secrets typed into forms are not written to browser storage.
- Layout works down to the existing 900px minimum window width and reasonable narrow viewports.

## Prompt 5: Version Completion Pass

Goal: close v0.1.2 cleanly and prepare v0.1.3.

Prompt:

```text
Review docs/version/0.1.2/spec.md against implemented files.
Run bun run test.
Run bun run typecheck.
Run bun run build.
Update docs/version/0.1.2/todo.md with completed items and completion notes.
Update docs/spec.md, docs/prompt_plan.md, docs/todo.md, and docs/version/README.md so v0.1.2 is complete and v0.1.3 is active.
Summarize changed files, verification results, and known gaps.
```

Acceptance:

- v0.1.2 todo reflects reality.
- Root docs point to v0.1.3 only after implementation passes verification.
- Known gaps are explicitly handed off.
