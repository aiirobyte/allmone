# allmone v0.1.6 Todo

Last updated: 2026-05-09
Status: Planned

## Version Target

Target: v0.1.6 React Renderer And Sidebar Navigation.

Definition of done:

- [x] Create `docs/version/0.1.6/spec.md`.
- [x] Create `docs/version/0.1.6/prompt_plan.md`.
- [x] Create `docs/version/0.1.6/todo.md`.
- [ ] Add React and React DOM dependencies.
- [ ] Change renderer entry point to `src/renderer/src/main.tsx`.
- [ ] Create a React app shell.
- [ ] Add sidebar title `Allmone`.
- [ ] Add sidebar items `Providers` and `Settings`.
- [ ] Make `Providers` the default section.
- [ ] Move current Upstream Setup into `Providers`.
- [ ] Keep OpenAI-compatible provider setup as an upstream provider type.
- [ ] Remove the duplicate standalone `OpenAI-Compatible Providers` top-level module.
- [ ] Move current Managed CLIProxyAPI into `Settings`.
- [ ] Preserve existing preload and IPC contracts.
- [ ] Preserve existing runtime and upstream actions.
- [ ] Keep secrets out of renderer durable storage.
- [ ] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Update root docs after implementation completion.

## Next Prompt

Start v0.1.6 implementation with Prompt 0 from `docs/version/0.1.6/prompt_plan.md`.

Expected next change:

- Add React renderer foundation without changing main-process runtime or upstream behavior.

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
