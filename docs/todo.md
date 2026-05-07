# allmone Todo

Last updated: 2026-05-07

Use this file as the cross-session checklist. In a new AI window, start with:

```text
Read CLAUDE.md and docs/todo.md, then continue with the active version's next unchecked prompt. If the active version files do not exist yet, create them from the root Next Prompt first.
```

## Active Version

Active version: `0.1.4` planned

- Previous version: `docs/version/0.1.3/`
- Active version docs: `docs/version/0.1.4/`

## Current Target

Target: v0.1.4 Managed CLIProxyAPI Runtime, Software Config, And Tray MVP.

Definition of done:

- [x] Create `docs/version/0.1.3/spec.md`.
- [x] Create `docs/version/0.1.3/prompt_plan.md`.
- [x] Create `docs/version/0.1.3/todo.md`.
- [x] Harden runtime connection diagnostics and empty states.
- [x] Add endpoint copy helpers and safer provider editing affordances.
- [x] Keep secrets out of renderer localStorage/sessionStorage/logs.
- [x] Keep allmone free of API proxying/provider adapter code.
- [x] Run the verification commands selected by the v0.1.3 plan.
- [x] Create `docs/version/0.1.4/spec.md`.
- [x] Create `docs/version/0.1.4/prompt_plan.md`.
- [x] Create `docs/version/0.1.4/todo.md`.
- [x] Create and use `~/.allmone` for managed runtime files.
- [x] Store non-secret software configuration in `~/.allmone/config.yaml`.
- [x] Store CLIProxyAPI download address and local executable path in software configuration.

## Next Prompt

Start v0.1.4 Prompt 3 from `docs/version/0.1.4/prompt_plan.md`.

Expected next change:

- Implement managed CLIProxyAPI process launch, restart, and shutdown.

## Version Roadmap

- [x] v0.1.0 Planning Baseline: product docs, README, and agent loop.
- [x] v0.1.1 Runtime Contract Spike: CLIProxyAPI management types, client, redaction, and tests.
- [x] v0.1.2 Runtime Service And Minimal Config Renderer: main-process status service, settings storage, typed IPC, and simple config UI.
- [x] v0.1.3 Runtime Connection GUI Hardening: diagnostics, endpoint copy, empty states, and editing affordances.
- [ ] v0.1.4 Managed CLIProxyAPI Runtime, Software Config, And Tray MVP: YAML config, official download/update, process control, port ownership, tray status, and quick actions.
- [ ] v0.2.0 Auth Management Surface: API/auth resources through CLIProxyAPI.
- [ ] v0.3.0 Model Resource Inventory: model-first inventory with backing provider/auth details.
- [ ] v0.4.0 Usage And Logs: request log, usage, queue, and error visibility.
- [ ] v0.5.0 Local Network Sharing: safe localhost/public-interface controls through CLIProxyAPI.
- [ ] v1.0.0 Stable Local Control Plane: packaging, docs, failure recovery, and cross-platform hardening.

## Decisions To Confirm

- [x] CLIProxyAPI install strategy: download/update official releases into `~/.allmone` and manage that executable.
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
