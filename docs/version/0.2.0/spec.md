# allmone v0.2.0 Spec

Last updated: 2026-05-09
Status: Complete

## Version Goal

Add a persistent management surface for multiple CLIProxyAPI-backed auth files and multiple providers. Users can add and delete supported auth/provider resources from allmone while durable writes stay in CLIProxyAPI-managed configuration or the allmone-managed runtime auth directory.

## Why This Version Exists

v0.1.5 added the full provider catalog, allmone-managed `auth-dir`, provider login/import handoffs, auth-file summaries, and typed management routes. v0.1.6 moved the renderer to React so larger auth workflows can be added without growing a single DOM script.

v0.2.0 turns those handoffs into day-to-day auth management. The user should be able to see several auth files across several providers, add new auth resources through supported provider actions, delete obsolete auth files or provider entries, and refresh back to the same persisted state after the renderer reloads.

Prompt 0 already handled the immediate Codex device-login need: when CLIProxyAPI prints a terminal device URL and code, allmone forwards that runtime output over IPC and displays the code in the renderer while the login command is still running.

## Scope

### In Scope

- Keep auth operations in the main process and CLIProxyAPI.
- Surface multiple CLIProxyAPI auth-file summaries grouped by provider in React.
- Support adding auth files through supported CLIProxyAPI login/import handoffs or management endpoints.
- Support deleting individual auth files through CLIProxyAPI Management API with an explicit user action.
- Support adding and deleting multiple provider entries through CLIProxyAPI-backed main-process services.
- Refresh auth-file and provider summaries after add/delete operations so persisted state is visible immediately.
- Support Settings-side CLIProxyAPI output-port diagnostics:
  - TCP connectivity test against the final local service origin and port.
  - One-shot OpenAI-compatible `/v1/chat/completions` model output test with a transient local client API key.
- Forward provider-login runtime events from the managed CLIProxyAPI child process to the invoking renderer.
- Display Codex device login URL, one-time code, and redacted command output while `--codex-device-login` is running.
- Keep login output transient in React state only.
- Keep token contents, API keys, management keys, bearer tokens, and auth-file contents out of renderer durable storage and logs.
- Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- Verify with focused tests, `bun run typecheck`, and `bun run build`.

### Out Of Scope

- No raw auth-file editor.
- No token content viewer.
- No arbitrary raw auth-file upload/copy workflow outside supported CLIProxyAPI login/import/management actions.
- No broad auth metadata editor beyond fields required for add/delete management.
- No provider protocol parsing or OAuth implementation inside allmone.
- No usage dashboard, model inventory, request logs, queue view, cost estimates, or local network sharing.
- No payload-rule UI.

## User Experience

The Providers page remains the entry point for account-backed upstreams and provider credentials. It should show:

- Provider groups for account-backed auth files such as Gemini CLI, Claude, Codex, Kimi, Antigravity, AI Studio, and Vertex.
- Multiple auth files per provider when CLIProxyAPI reports them.
- Safe auth-file metadata only: provider, label, status, source, disabled state, redacted path/diagnostics when available, and delete affordances.
- Add actions for providers that have supported login/import handoffs or CLIProxyAPI management actions.
- Delete actions for individual persisted auth files or provider entries.

Clicking Codex login starts the existing CLIProxyAPI login handoff. While the child process runs, allmone shows a transient Provider Login panel with:

- The device login URL.
- The device code from CLIProxyAPI stdout.
- Redacted command output for immediate feedback.

After any add/delete operation, the page refreshes auth-file and provider summaries from the main process. The panel clears after a successful login handoff and remains transient if the command fails so the user can see the redacted failure context.

## Architecture

`ProviderLoginRunner` owns child-process execution. It pipes stdout/stderr, redacts output, parses Codex device URL/code from CLIProxyAPI output, and emits structured login events.

`runtime/ipc` forwards login events to the renderer that invoked `runLoginAction` with a main-to-renderer event channel.

`preload` exposes a narrow `onLoginEvent` subscription API. Renderer code stores received events only in React state.

`ProvidersPage` renders the transient Provider Login panel from that state.

`UpstreamService` remains the main-process facade for provider/auth resources. It reads CLIProxyAPI summaries, executes add/delete operations through typed client methods or provider login/import handoffs, redacts errors, and returns only safe renderer data.

The renderer treats CLIProxyAPI summaries as the source of truth. It may keep form drafts and transient command output in React state, but it must not persist token contents, auth-file contents, API keys, management keys, or device codes in renderer durable storage.

## Testing

Required verification:

```bash
bun run test
bun run typecheck
bun run build
```

Focused tests should cover:

- Runner output streaming, redaction, and Codex device-code parsing.
- IPC forwarding through the invoking renderer sender.
- Renderer display of Codex login URL/code.
- Multiple auth files grouped by provider without token contents.
- Auth-file add/delete flows refreshing summaries after the write.
- Provider add/delete flows preserving unrelated providers.
- Main-process validation and redaction for auth/provider write failures.
- Output port connectivity and model output tests with fake connector/fetch adapters.

## Acceptance

- `docs/version/0.2.0/` contains this spec, a prompt plan, and a todo file.
- Codex device login events reach the renderer in real time.
- The Codex device URL and code are visible after clicking Codex login.
- Login command output shown in the renderer is redacted.
- Codex login state is transient and not persisted in renderer durable storage.
- Users can view multiple auth files grouped by provider.
- Users can add supported auth resources through login/import/management actions.
- Users can delete individual auth files.
- Users can add and delete supported provider entries without losing unrelated entries.
- Users can test whether the final CLIProxyAPI output port is reachable.
- Users can run a one-shot model output test through `/v1/chat/completions`.
- Auth/provider add/delete changes persist through CLIProxyAPI-managed configuration or the allmone-managed runtime auth directory and remain visible after refresh.
- Existing provider login handoff behavior remains intact.
- `bun run test`, `bun run typecheck`, and `bun run build` pass.
