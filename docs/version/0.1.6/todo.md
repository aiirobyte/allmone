# allmone v0.1.6 Todo

Last updated: 2026-05-09
Status: Complete

## Version Target

Target: v0.1.6 React Renderer And Sidebar Navigation.

Definition of done:

- [x] Create `docs/version/0.1.6/spec.md`.
- [x] Create `docs/version/0.1.6/prompt_plan.md`.
- [x] Create `docs/version/0.1.6/todo.md`.
- [x] Add React and React DOM dependencies.
- [x] Change renderer entry point to `src/renderer/src/main.tsx`.
- [x] Create a React app shell.
- [x] Add sidebar title `Allmone`.
- [x] Add sidebar items `Providers` and `Settings`.
- [x] Make `Providers` the default section.
- [x] Move current Upstream Setup into `Providers`.
- [x] Keep OpenAI-compatible provider setup as an upstream provider type.
- [x] Remove the duplicate standalone `OpenAI-Compatible Providers` top-level module.
- [x] Move current Managed CLIProxyAPI into `Settings`.
- [x] Preserve existing preload and IPC contracts.
- [x] Preserve existing runtime and upstream actions.
- [x] Keep secrets out of renderer durable storage.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after implementation completion.

## Next Prompt

v0.1.6 is complete. Continue with the root prompt plan for v0.2.0 planning.

Expected next change:

- Create `docs/version/0.2.0/` planning files for Auth Management Surface.

## Guardrails

- This version is a renderer architecture and information-architecture change.
- Do not implement the v0.2.0 auth management surface in v0.1.6.
- Do not add usage, logs, model inventory, local network sharing, raw YAML editing, or payload rule UI.
- Do not add a router unless implementation proves the two-section state is not enough.
- Do not change CLIProxyAPI Management API routes or payload semantics.
- Do not expose plaintext upstream API keys, local API keys, management keys, proxy credentials, bearer tokens, sensitive headers, or token file contents over renderer summaries.
- Do not store secrets in renderer durable state.
- Keep OpenAI-compatible providers inside upstream setup rather than as a duplicate module.

## Planning Notes

- 2026-05-09: User chose v0.1.6 as an inserted version before v0.2.0.
- 2026-05-09: User selected方案 A: React migration with lightweight page state.
- 2026-05-09: v0.1.6 should use sidebar navigation with `Providers` and `Settings`.
- 2026-05-09: `Providers` is the current Upstream Setup surface.
- 2026-05-09: `Settings` is the current Managed CLIProxyAPI surface.
- 2026-05-09: Prompt 0 completed. Added React/React DOM, TSX typecheck support, `src/renderer/src/main.tsx`, a minimal `App` shell, and a renderer shell test verified red/green with `bun test src/renderer/src/App.test.tsx`. `bun run typecheck` passed for the Prompt 0 slice.
- 2026-05-09: Prompts 1-5 completed in one implementation pass. Moved bootstrap, refresh, feedback, busy actions, Providers, and Settings into React components; removed the old hand-written DOM renderer and duplicate OpenAI-compatible provider surface; kept OpenAI-compatible setup in the upstream provider selector; preserved preload/main IPC behavior; verified with `bun run test`, `bun run typecheck`, and `bun run build`.
