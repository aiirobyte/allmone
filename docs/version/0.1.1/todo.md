# allmone v0.1.1 Todo

Last updated: 2026-05-07
Status: Complete

## Version Target

Target: v0.1.1 CLIProxyAPI Runtime Contract Spike.

Definition of done:

- [x] Add or confirm `bun run test`.
- [x] Add `src/main/cli-proxy-api/types.ts`.
- [x] Add `src/main/cli-proxy-api/redact.ts`.
- [x] Add `src/main/cli-proxy-api/errors.ts`.
- [x] Add `src/main/cli-proxy-api/client.ts`.
- [x] Add `src/main/cli-proxy-api/index.ts`.
- [x] Add Bun tests for redaction, error mapping, and client behavior.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Update root `docs/todo.md` after completion.

## Next Prompt

Plan v0.1.2 from the handoff in `docs/version/0.1.1/spec.md`.

Expected next change:

- Create `docs/version/0.1.2/spec.md`, `prompt_plan.md`, and `todo.md` for the Runtime Service version before implementation.

## Guardrails

- Do not change renderer UI.
- Do not add Electron IPC yet.
- Do not add tray behavior yet.
- Do not call the real CLIProxyAPI service from tests.
- Do not implement provider proxying, request routing, or response conversion.
- Do not log management keys, API keys, or URLs containing credentials.

## Open Checks

- Confirm whether CLIProxyAPI has a dedicated health endpoint before v0.1.2.
- Confirm whether `GET /usage-queue` popping records is acceptable for the first usage view, or whether allmone should prefer Redis-compatible queue access later.
- Confirm whether model inventory should derive from `/config`, `/auth-files`, and `/openai-compatibility` until a dedicated models endpoint exists.

## Completion Notes

- Added a tested main-process `src/main/cli-proxy-api/` contract module.
- Tests use injected fetch implementations and do not call the real CLIProxyAPI service.
- No renderer UI, preload bridge, Electron IPC, tray behavior, provider proxying, request routing, or response conversion was added.
