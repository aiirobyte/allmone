# allmone Todo

Last updated: 2026-05-07

Use this file as the cross-session checklist. In a new AI window, start with:

```text
Read CLAUDE.md and docs/todo.md, then continue with the active version's next unchecked prompt. If the active version files do not exist yet, create them from the root Next Prompt first.
```

## Active Version

Active version: `0.1.3` planned

- Previous version: `docs/version/0.1.2/`
- Active version docs: `docs/version/0.1.3/` not created yet

## Current Target

Target: v0.1.3 Runtime Connection GUI Hardening.

Definition of done:

- [ ] Create `docs/version/0.1.3/spec.md`.
- [ ] Create `docs/version/0.1.3/prompt_plan.md`.
- [ ] Create `docs/version/0.1.3/todo.md`.
- [ ] Harden runtime connection diagnostics and empty states.
- [ ] Add endpoint copy helpers and safer provider editing affordances.
- [ ] Keep secrets out of renderer localStorage/sessionStorage/logs.
- [ ] Keep allmone free of API proxying/provider adapter code.
- [ ] Run the verification commands selected by the v0.1.3 plan.

## Next Prompt

Start v0.1.3 planning from the roadmap.

Expected next change:

- Create `docs/version/0.1.3/` planning files before implementation.

## Version Roadmap

- [x] v0.1.0 Planning Baseline: product docs, README, and agent loop.
- [x] v0.1.1 Runtime Contract Spike: CLIProxyAPI management types, client, redaction, and tests.
- [x] v0.1.2 Runtime Service And Minimal Config Renderer: main-process status service, settings storage, typed IPC, and simple config UI.
- [ ] v0.1.3 Runtime Connection GUI Hardening: diagnostics, endpoint copy, empty states, and editing affordances.
- [ ] v0.1.4 Tray MVP: tray status and quick actions.
- [ ] v0.2.0 Auth Management Surface: API/auth resources through CLIProxyAPI.
- [ ] v0.3.0 Model Resource Inventory: model-first inventory with backing provider/auth details.
- [ ] v0.4.0 Usage And Logs: request log, usage, queue, and error visibility.
- [ ] v0.5.0 Local Network Sharing: safe localhost/public-interface controls through CLIProxyAPI.
- [ ] v1.0.0 Stable Local Control Plane: packaging, docs, failure recovery, and cross-platform hardening.

## Decisions To Confirm

- [ ] CLIProxyAPI install strategy: discover existing install, bundle binary, or both.
- [ ] Minimum supported CLIProxyAPI version and management API contract.
- [ ] Secure storage library for secrets.
- [ ] Which usage fields are authoritative versus estimates.
- [ ] Whether local-network sharing remains hidden behind advanced settings until v1.0.

## Working Notes

- Specific version planning belongs in `docs/version/<semver>/`.
- Root `docs/spec.md`, `docs/prompt_plan.md`, and `docs/todo.md` are current-session entry points.
- Treat CLIProxyAPI as the runtime and management API source of truth.
- Keep GUI model-first: provider is backing detail.
- Keep secrets out of renderer localStorage and checked-in files.
- Update this file and the active version todo after every meaningful coding session.
