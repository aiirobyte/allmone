# allmone v0.2.0 Prompt Plan

Last updated: 2026-05-09
Status: In Progress

## Version Target

Build the Auth Management Surface around multiple CLIProxyAPI-managed auth files and providers. Add/delete operations must persist through CLIProxyAPI-managed configuration or the allmone-managed runtime auth directory without exposing token contents to renderer durable state.

## Prompts

### Prompt 0: Realtime Codex Device Login IPC

Status: Complete

Goal: When the user clicks Codex login, show the CLIProxyAPI terminal device URL/code in the renderer while the login child process is still running.

Steps:

1. Add failing tests for provider-login output streaming, IPC forwarding, and renderer display.
2. Pipe login child-process stdout/stderr in `ProviderLoginRunner`.
3. Redact streamed output before sending it outside the runner.
4. Parse `Codex device URL` and `Codex device code` from CLIProxyAPI output.
5. Forward structured login events from main to the invoking renderer over IPC.
6. Add a preload subscription for login events.
7. Render a transient Provider Login panel in Providers.
8. Verify with focused tests, typecheck, and build.

Guardrails:

- Do not implement OAuth in allmone.
- Do not persist device codes or command output.
- Do not send raw token contents or auth-file contents to the renderer.

### Prompt 1: Multi Auth File Management Surface

Status: Pending

Goal: Show and manage multiple persisted auth files across multiple providers using CLIProxyAPI summaries plus supported add/delete handoffs.

Expected next change:

1. Add focused tests for rendering multiple auth files grouped by provider.
2. Render safe auth-file metadata only: provider, label, status, source, disabled state, redacted path, and diagnostics.
3. Add per-provider add actions by reusing supported login/import handoffs.
4. Delete individual auth files through existing main-process IPC and CLIProxyAPI Management API.
5. Refresh auth files and upstream summaries after add/delete.
6. Keep token file contents, device codes, and command output out of renderer durable storage.
7. Verify with focused tests, typecheck, and build.

Guardrails:

- Do not add a raw auth-file editor or token viewer.
- Do not mutate auth files directly from the renderer.
- Do not implement provider OAuth/token exchange logic inside allmone.

### Prompt 2: Multi Provider Persistent Add/Delete Surface

Status: Pending

Goal: Make provider add/delete management explicit for multiple provider entries while preserving CLIProxyAPI as the persistence source of truth.

Expected next change:

1. Review existing provider add/delete coverage for API-key upstreams, OpenAI-compatible providers, Amp, and account-backed providers.
2. Add focused tests for adding more than one provider entry and deleting one without losing unrelated entries.
3. Route provider writes through `UpstreamService` and typed CLIProxyAPI Management API client methods.
4. Refresh provider and auth-file summaries after successful writes.
5. Keep provider secrets, management keys, bearer tokens, and auth-file contents out of renderer state, logs, and storage.
6. Verify with focused tests, typecheck, and build.

Guardrails:

- Do not edit raw `config.yaml` from the renderer.
- Do not add provider adapter, routing, payload-rule, or request/response transformation logic.
- Do not add broad auth metadata editing unless it is required for add/delete.

### Prompt 3: Persistence And Secret Boundary Regression

Status: Pending

Goal: Close the version by proving auth/provider add/delete state reloads correctly and secret boundaries still hold.

Expected next change:

1. Add regression coverage for reload/startup paths that read persisted auth files and provider summaries.
2. Confirm add/delete operations leave unrelated provider/auth resources intact.
3. Confirm renderer durable storage never receives token contents, auth-file contents, API keys, management keys, bearer tokens, or device codes.
4. Update root docs and active version todo with the completed version state.
5. Verify with `bun run test`, `bun run typecheck`, and `bun run build`.

## Completion Checklist

- [x] Realtime Codex device login IPC.
- [ ] Multi auth-file management surface.
- [ ] Multi provider persistent add/delete surface.
- [ ] Persistence and secret-boundary regression coverage.
- [x] Root docs updated for v0.2.0 progress.
- [x] `bun run test`.
- [x] `bun run typecheck`.
- [x] `bun run build`.
