# allmone Todo

Last updated: 2026-05-08

Use this file as the cross-session checklist. In a new AI window, start with:

```text
Read CLAUDE.md and docs/todo.md, then continue with the active version's next unchecked prompt. If the active version files do not exist yet, create them from the root Next Prompt first.
```

## Active Version

Active version: `0.1.5` planned

- Previous version: `docs/version/0.1.4/`
- Active version docs: `docs/version/0.1.5/`

## Current Target

Target: v0.1.5 Real Local Proxy Setup And Full CLIProxyAPI Upstream Catalog.

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
- [x] Launch, restart, and shutdown the allmone-managed CLIProxyAPI process.
- [x] Complete v0.1.4 managed runtime, tray, renderer controls, and build verification.
- [x] Create `docs/version/0.1.5/spec.md`.
- [x] Create `docs/version/0.1.5/prompt_plan.md`.
- [x] Create `docs/version/0.1.5/todo.md`.
- [ ] Add upstream provider catalog for every current CLIProxyAPI upstream family.

## Next Prompt

Start v0.1.5 Prompt 0 from `docs/version/0.1.5/prompt_plan.md`.

Expected next change:

- Add the complete provider catalog and upstream types.

## Version Roadmap

- [x] v0.1.0 Planning Baseline: product docs, README, and agent loop.
- [x] v0.1.1 Runtime Contract Spike: CLIProxyAPI management types, client, redaction, and tests.
- [x] v0.1.2 Runtime Service And Minimal Config Renderer: main-process status service, settings storage, typed IPC, and simple config UI.
- [x] v0.1.3 Runtime Connection GUI Hardening: diagnostics, endpoint copy, empty states, and editing affordances.
- [x] v0.1.4 Managed CLIProxyAPI Runtime, Software Config, And Tray MVP: YAML config, official download/update, process control, port ownership, tray status, and quick actions.
- [ ] v0.1.5 Real Local Proxy Setup And Full CLIProxyAPI Upstream Catalog: configure local client keys and every current CLIProxyAPI upstream family.
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
- 2026-05-08: Renderer Connection module was removed; Management API Test now lives inside Managed CLIProxyAPI. Management URL and timeout come from `~/.allmone/config.yaml`; the management key stays main-process-only.
- 2026-05-08: Encrypted Management API credential storage is `~/.allmone/runtime/cli-proxy-api/management-key.json`; old `runtime-settings.json` files are deleted without migration.
- 2026-05-08: CLIProxyAPI-managed runtime files now live under `~/.allmone/runtime/cli-proxy-api/`, leaving `~/.allmone/runtime/` as the parent for future third-party runtimes.
- 2026-05-08: `~/.allmone/config.yaml` stores CLIProxyAPI runtime settings under `cliproxyapi.runtime`; the old top-level `runtime` block is not supported.
- 2026-05-08: Startup install check now adopts an existing managed CLIProxyAPI executable without fetching release metadata; manual Check Update remains the network update path.
- 2026-05-08: Auto-start now enters `starting` immediately during install validation and only shows `installing` when the managed executable is missing.
- 2026-05-08: OpenAI-compatible provider creation now appends through CLIProxyAPI `GET` + `PUT`; existing providers still update through `PATCH`.
- Update this file and the active version todo after every meaningful coding session.
