# allmone v0.2.0 Todo

Last updated: 2026-05-09
Status: In Progress

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
- [ ] Show multiple auth-file summaries grouped by provider.
- [ ] Add auth files through supported CLIProxyAPI login/import/management actions.
- [ ] Delete individual auth files through CLIProxyAPI Management API.
- [ ] Add and delete multiple provider entries through CLIProxyAPI-backed main-process services.
- [ ] Refresh auth-file and provider summaries after add/delete operations.
- [ ] Prove persisted auth/provider state reloads correctly after refresh/startup.
- [ ] Keep token contents out of renderer state, logs, and durable storage.
- [ ] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after Prompt 0 implementation.

## Next Prompt

Continue v0.2.0 Prompt 1: Multi Auth File Management Surface.

Expected next change:

- Show multiple auth-file summaries grouped by provider, add auth through supported handoffs, delete individual auth files, and refresh summaries without exposing token contents.

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
