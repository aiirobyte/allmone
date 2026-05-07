# allmone v0.1.2 Todo

Last updated: 2026-05-07
Status: Complete

## Version Target

Target: v0.1.2 Runtime Service And Minimal Config Renderer.

Definition of done:

- [x] Create `docs/version/0.1.2/spec.md`.
- [x] Create `docs/version/0.1.2/prompt_plan.md`.
- [x] Create `docs/version/0.1.2/todo.md`.
- [x] Extend `src/main/cliproxyapi/` with required write methods.
- [x] Add main-process settings storage with safe management-key handling.
- [x] Add runtime service and sanitized state/config summaries.
- [x] Expose typed IPC for runtime status and simple configuration.
- [x] Replace renderer template with minimal connection/provider config UI.
- [x] Keep allmone free of API proxying, provider adapters, routing, and request/response transformation.
- [x] Keep secrets out of renderer localStorage/sessionStorage/logs.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after implementation completion.

## Next Prompt

v0.1.2 is complete.

Expected next change:

- Plan v0.1.3 Runtime Connection GUI Hardening under `docs/version/0.1.3/`.

## Guardrails

- Do not implement CLIProxyAPI process install, discovery, launch, restart, or shutdown in this version.
- Do not add tray behavior.
- Do not add OAuth login flows or auth-file management UI.
- Do not call the real CLIProxyAPI service from tests.
- Do not send plaintext management keys, provider API keys, or proxy credentials over IPC responses.
- Do not store secrets in renderer localStorage, sessionStorage, IndexedDB, or checked-in files.
- Do not add payload rule management, payload rule UI, or raw config YAML mutation.
- Do not implement provider protocol parsing, API proxying, request routing, or request/response conversion inside allmone.

## Resolved Checks

- Electron `safeStorage` is checked at runtime; when unavailable, management key persistence degrades to session-only.
- Provider headers are supported in the runtime summary sanitizer but deferred from the v0.1.2 renderer to keep the UI minimal.

## Completion Notes

- Planning created on 2026-05-07.
- Implementation completed on 2026-05-07.
- Added CLIProxyAPI provider write methods, settings storage, runtime service, typed IPC/preload, and the minimal runtime/provider configuration renderer.
- Verified with `bun run test`, `bun run typecheck`, and `bun run build`.
