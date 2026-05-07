# allmone v0.1.3 Todo

Last updated: 2026-05-07
Status: Complete

## Version Target

Target: v0.1.3 Runtime Connection GUI Hardening.

Definition of done:

- [x] Create `docs/version/0.1.3/spec.md`.
- [x] Create `docs/version/0.1.3/prompt_plan.md`.
- [x] Create `docs/version/0.1.3/todo.md`.
- [x] Improve runtime connection diagnostics without leaking secrets.
- [x] Add safe endpoint copy helpers.
- [x] Improve first-launch, config-load-failed, and no-provider empty states.
- [x] Add safer provider editing affordances.
- [x] Keep secrets out of renderer localStorage/sessionStorage/IndexedDB/logs.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after implementation completion.

## Next Prompt

v0.1.3 is complete.

Expected next change:

- Plan v0.1.4 Tray MVP under `docs/version/0.1.4/`.

## Guardrails

- Do not implement CLIProxyAPI process install, discovery, launch, restart, or shutdown.
- Do not add tray behavior.
- Do not add OAuth login flows, auth-file management, or client API key management UI.
- Do not call the real CLIProxyAPI service from tests.
- Do not send plaintext management keys, provider API keys, proxy credentials, or sensitive headers over IPC responses.
- Do not store secrets in renderer localStorage, sessionStorage, IndexedDB, DOM data attributes, logs, or checked-in files.
- Do not add payload rule management, payload rule UI, or raw `config.yaml` mutation.
- Do not implement provider protocol parsing, API proxying, request routing, or request/response conversion inside allmone.
- Do not invent undocumented CLIProxyAPI endpoint paths for copy helpers.

## Planning Notes

- Planning created on 2026-05-07.
- v0.1.3 should harden the existing v0.1.2 GUI rather than expand scope.
- Provider editing should stay conservative until CLIProxyAPI rename and patch semantics are explicit.
- Copy helpers should use structured URL parsing and copy only safe values.

## Completion Notes

- Added `lastCheckedAt` and `lastHttpStatus` runtime diagnostics with redacted `lastError`.
- Added renderer next actions for every runtime status and safe copy helpers for Management URL and service origin.
- Added config-load, first-launch, no-provider, and provider-form mode empty states.
- Locked provider name during edits, made API key replacement explicit, and confirmed provider deletes before IPC.
- Verification passed on 2026-05-07:
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`
