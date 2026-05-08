# allmone v0.1.3 Spec

Last updated: 2026-05-07
Status: Complete

## Version Goal

Harden the v0.1.2 runtime connection GUI so the first control surface is safer and clearer in daily use: better diagnostics, stronger empty states, copyable endpoints, and provider editing affordances that avoid accidental secret or config loss.

## Why This Version Exists

v0.1.2 created the thin end-to-end workflow: save CLIProxyAPI management settings, test the connection, summarize sanitized config, and add/update/delete one OpenAI-compatible provider.

v0.1.3 should not broaden the product surface. It should make the existing workflow trustworthy before tray behavior, auth management, model inventory, and usage views build on top of it.

## Baseline From v0.1.2

Implemented files that matter for this version:

- `src/main/cli-proxy-api/`: typed Management API client, status mapping, write methods, and redaction helpers.
- `src/main/runtime/settingsStore.ts`: main-process settings persistence with `safeStorage` fallback.
- `src/main/runtime/service.ts`: runtime state, connection test, sanitized config summary, and provider writes.
- `src/main/runtime/ipc.ts`: narrow typed IPC handlers.
- `src/preload/index.ts`: `window.allmone.runtime` bridge.
- `src/renderer/src/main.ts`: framework-free connection/provider screen.
- `src/renderer/src/styles.css`: compact desktop layout.

Existing constraints still apply:

- CLIProxyAPI remains the runtime source of truth.
- allmone must not implement API proxying, provider adapters, routing, payload rules, or request/response transformation.
- Management keys, provider API keys, proxy credentials, and sensitive headers must not cross IPC responses in plaintext.
- Renderer code must not store secrets in `localStorage`, `sessionStorage`, IndexedDB, logs, or durable client-side state.

## Scope

### In Scope

- Improve connection diagnostics for the existing management status states:
  - `reachable`
  - `auth_required`
  - `management_disabled`
  - `unreachable`
  - `timeout`
  - `invalid_response`
  - `unexpected_error`
- Add state-specific next actions in the connection panel.
- Preserve and display redacted `lastError` information where useful.
- Add minimal runtime state metadata if needed, such as last test time and HTTP status.
- Add copy helpers for safe endpoints:
  - configured Management API URL
  - CLIProxyAPI service origin derived from the configured Management API URL
  - documented OpenAI-compatible API base only if it can be derived without guesswork
- Add renderer-only copy feedback without copying secrets.
- Improve empty states for:
  - first launch with no management key
  - failed config summary load
  - no OpenAI-compatible providers
  - provider form reset/new/edit mode
- Make provider editing safer:
  - clearly distinguish new provider mode from edit mode
  - keep provider API key replacement explicit
  - avoid implying the renderer can read saved provider API keys
  - confirm deletes
  - avoid accidental provider rename semantics unless the Management API behavior is explicit
- Add focused tests for any runtime state or sanitizer changes.
- Run `bun run test`, `bun run typecheck`, and `bun run build`.
- Update root docs and this version todo after implementation.

### Out Of Scope

- No CLIProxyAPI install, discovery, process launch, restart, or shutdown.
- No tray menu or background quick actions.
- No auth-file management, OAuth login, or client API key management UI.
- No full model inventory.
- No request logs, usage charts, queue views, or usage estimates.
- No local network sharing controls.
- No payload rule management or raw YAML editor.
- No provider protocol parsing, proxying, routing, or response conversion in allmone.
- No broad renderer framework migration.

## User Workflows

### Diagnose Runtime Connection

The user opens allmone and sees a connection panel that explains the current state with a short next action:

- `reachable`: config can be refreshed and provider editing is available.
- `auth_required`: enter or replace the management key.
- `management_disabled`: enable CLIProxyAPI Management API before continuing.
- `unreachable`: confirm CLIProxyAPI is running and the URL is correct.
- `timeout`: increase timeout or check whether the runtime is blocked.
- `invalid_response`: verify the URL points to CLIProxyAPI Management API.
- `unexpected_error`: show a redacted diagnostic and allow retry.

The renderer may show redacted error text and HTTP status. It must not show secrets.

### Copy Safe Endpoints

The user can copy safe connection values from the connection panel. Copy actions must never include management keys, provider API keys, proxy credentials, or sensitive headers.

If the OpenAI-compatible API base cannot be derived confidently from the configured management URL, the UI should copy only the management URL and service origin, then avoid inventing a proxy endpoint.

### Recover From Empty States

The screen should remain useful when CLIProxyAPI is not configured, not reachable, or returns no provider config. Empty states should be short and action-oriented, not tutorial copy.

### Edit Provider Safely

When editing an existing provider, the user should understand which fields are editable and that saved secrets are not visible. Leaving the provider API key blank should be presented as keeping the existing key only if the write path actually preserves omitted key entries.

Deleting a provider should require confirmation in the renderer before the IPC write is sent.

## Planned File Boundaries

- `src/main/runtime/types.ts`: add only the minimal optional runtime state fields needed for diagnostics.
- `src/main/runtime/service.ts`: update connection test state with redacted diagnostic metadata; preserve existing sanitization rules.
- `src/main/runtime/service.test.ts`: cover new diagnostic metadata and secret redaction.
- `src/main/runtime/ipc.test.ts`: update expected runtime state shapes if types change.
- `src/renderer/src/main.ts`: add diagnostic rendering, copy helpers, stronger empty states, edit mode labels, delete confirmation, and provider key affordances.
- `src/renderer/src/styles.css`: refine compact layout states without a redesign.
- `docs/version/0.1.3/todo.md`: track implementation progress.
- Root `docs/spec.md`, `docs/prompt_plan.md`, `docs/todo.md`, and `docs/version/README.md`: keep active version pointers current.

## Implementation Notes

- Prefer renderer helpers over new IPC channels for copy-to-clipboard unless browser clipboard support fails during verification.
- Derive copyable endpoint values from the configured URL with structured `URL` parsing, not string slicing.
- Keep provider editing conservative. If rename behavior is unclear, do not implement rename in this version.
- Keep hidden form fields and DOM attributes free of secret values.
- Keep errors redacted before they cross IPC, then render them as plain text.
- Use existing plain TypeScript and DOM rendering patterns.

## Testing

- Unit-test runtime diagnostic state changes if `RuntimeState` changes.
- Unit-test any endpoint derivation helper if it is extracted outside renderer event code.
- Re-run existing IPC and runtime tests.
- Use typecheck as the main renderer contract check.
- Run:
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`

## Acceptance

- `docs/version/0.1.3/` contains this spec, a prompt plan, and a todo file.
- Connection status states have clear next actions and redacted diagnostics.
- Copy helpers copy only safe endpoint values.
- Empty states explain what the user can do next without adding a tutorial surface.
- Provider edit mode reduces accidental key overwrite, rename confusion, and unconfirmed deletes.
- Renderer still does not persist secrets in browser storage.
- allmone still contains no API proxying, provider adapter, routing, payload-rule, or transformation code.
- Verification commands pass.

## Handoff To v0.1.4

v0.1.4 should add the tray MVP after the main window's runtime state and connection actions are reliable enough to summarize in a tray menu.
