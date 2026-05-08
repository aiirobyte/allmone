# allmone v0.2.0 Todo

Last updated: 2026-05-09
Status: Complete

## Version Target

Target: v0.2.0 Auth Management Surface for multiple persisted auth files and providers.

Definition of done:

- [x] Create `docs/version/0.2.0/spec.md`.
- [x] Create `docs/version/0.2.0/prompt_plan.md`.
- [x] Create `docs/version/0.2.0/todo.md`.
- [x] Add realtime Codex device login IPC from CLIProxyAPI child-process output.
- [x] Display Codex device URL/code in the renderer while login is running.
- [x] Redact login command output before renderer delivery.
- [x] Keep Codex login output transient in React state only.
- [x] Show multiple auth-file summaries grouped by provider.
- [x] Add auth files through supported CLIProxyAPI login/import/management actions.
- [x] Delete individual auth files through CLIProxyAPI Management API.
- [x] Add and delete multiple provider entries through CLIProxyAPI-backed main-process services.
- [x] Refresh auth-file and provider summaries after add/delete operations.
- [x] Prove persisted auth/provider state reloads correctly after refresh/startup.
- [x] Add Settings-side output port connectivity and model output tests.
- [x] Keep token contents out of renderer state, logs, and durable storage.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after Prompt 0 implementation.
- [x] Update root docs after Prompt 1 implementation.
- [x] Update root docs after v0.2.0 completion.

## Next Prompt

v0.2.0 is complete. Continue from root `docs/prompt_plan.md` to start v0.3.0 planning.

Expected next change:

- Create `docs/version/0.3.0/` planning files for Model Resource Inventory before implementation.

## Guardrails

- Do not implement OAuth, provider protocol parsing, or token exchange logic in allmone.
- Do not add a raw auth-file editor or token content viewer.
- Do not add arbitrary raw auth-file upload/copy outside supported CLIProxyAPI login/import/management actions.
- Do not store secrets, device codes, or login command output in renderer durable storage.
- Keep auth writes behind main-process IPC and CLIProxyAPI Management API.
- Preserve existing provider login handoff behavior.

## Planning Notes

- 2026-05-09: v0.2.0 planning files created.
- 2026-05-09: Prompt 0 implemented realtime Codex device login IPC. `ProviderLoginRunner` pipes and redacts CLIProxyAPI stdout/stderr, emits structured Codex device URL/code events, IPC forwards those events to the invoking renderer, preload exposes a subscription, and Providers renders a transient Provider Login panel.
- 2026-05-09: Prompt 0 verified with `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-09: Planning recentered on multiple persisted auth files and providers with add/delete management. Broad auth metadata editing is deferred unless required for add/delete.
- 2026-05-09: Prompt 1 completed. `UpstreamService` now returns multiple safe auth-file summaries with delete names and redacted paths/diagnostics, Providers groups auth files under account providers, supported login/import actions remain the add path, individual auth files delete through IPC/CLIProxyAPI Management API, and add/delete flows refresh auth/provider summaries. Verified with focused red/green tests, `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-09: Prompt 2 completed. Providers now renders multiple API-key/OpenAI-compatible provider entries with safe metadata and delete actions; delete operations route through renderer IPC to `UpstreamService`/CLIProxyAPI Management API and refresh summaries after writes. Added regression coverage for deleting one provider entry without touching unrelated providers.
- 2026-05-09: Prompt 3 completed. Added reload/startup regression coverage against current CLIProxyAPI-backed client state and a renderer durable-storage guard that rejects `localStorage`/`sessionStorage` usage for auth/login state. v0.2.0 is complete and verified with `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-09: Added a Settings output-port test panel after completion. The main process can probe the final CLIProxyAPI service port with a TCP connectivity test and run a one-shot OpenAI-compatible `/v1/chat/completions` model output test with a transient local client API key. Added fake connector/fetch coverage and kept local keys out of durable renderer storage.
