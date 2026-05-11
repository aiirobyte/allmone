# allmone Todo

Last updated: 2026-05-11

Use this file as the cross-session checklist. In a new AI window, start with:

```text
Read CLAUDE.md and docs/todo.md, then continue with the active version's next unchecked prompt. If the active version files do not exist yet, create them from the root Next Prompt first.
```

## Active Version

Active version: `0.3.0` planning

- Previous version: `docs/version/0.2.2/`
- Active version docs: create `docs/version/0.3.0/` during planning setup.

## Current Target

Target: v0.3.0 Model Resource Inventory planning.

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
- [x] Add upstream provider catalog for every current CLIProxyAPI upstream family.
- [x] Complete v0.1.5 real local proxy setup, upstream services, IPC, renderer controls, login handoffs, and build verification.
- [x] Create `docs/version/0.1.6/spec.md`.
- [x] Create `docs/version/0.1.6/prompt_plan.md`.
- [x] Create `docs/version/0.1.6/todo.md`.
- [x] Add React and React DOM dependencies.
- [x] Change renderer entry point to `src/renderer/src/main.tsx`.
- [x] Add sidebar navigation with `Allmone`, `Providers`, and `Settings`.
- [x] Move Upstream Setup into `Providers`.
- [x] Move Managed CLIProxyAPI into `Settings`.
- [x] Remove the duplicate standalone `OpenAI-Compatible Providers` module.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Create `docs/version/0.2.0/spec.md`.
- [x] Create `docs/version/0.2.0/prompt_plan.md`.
- [x] Create `docs/version/0.2.0/todo.md`.
- [x] Add realtime Codex device login IPC and renderer display.
- [x] Show multiple auth-file summaries grouped by provider.
- [x] Add auth files through supported CLIProxyAPI login/import/management actions.
- [x] Delete individual auth files through CLIProxyAPI Management API.
- [x] Add and delete multiple provider entries through CLIProxyAPI-backed main-process services.
- [x] Refresh auth-file and provider summaries after add/delete operations.
- [x] Prove persisted auth/provider state reloads correctly after refresh/startup.
- [x] Keep token contents out of renderer state, logs, and durable storage.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Add Settings-side CLIProxyAPI output port connectivity and model output tests.
- [x] Create `docs/version/0.2.1/spec.md`.
- [x] Create `docs/version/0.2.1/prompt_plan.md`.
- [x] Create `docs/version/0.2.1/todo.md`.
- [x] Add a `Models` sidebar item above `Providers`.
- [x] Make `Models` the default renderer section.
- [x] List each provider successfully configured/imported through Provider workflows.
- [x] Show model IDs under Provider rows as child data from `/models`.
- [x] Show safe basic provider information for each provider row.
- [x] Show model ID lists from each Provider row's own CLIProxyAPI-owned model source.
- [x] Show explicit empty model states when configured providers have no `/models` records.
- [x] Persist multiple named local output keys as encrypted allmone config records.
- [x] On every startup, ensure a persistent default local output key exists and generate one if missing.
- [x] Let users create generated keys with names, rename keys, explicitly reveal keys, and delete keys.
- [x] Keep local output keys masked by default and reveal plaintext only after explicit user action.
- [x] Add `Providers`-side editing for existing API-key upstream entries.
- [x] Preserve provider API-key secrets in the main process when edits leave the API key blank.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, non-OpenAI-compatible provider model endpoint calls, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Create `docs/version/0.2.2/spec.md`.
- [x] Create `docs/version/0.2.2/prompt_plan.md`.
- [x] Create `docs/version/0.2.2/todo.md`.
- [x] Define the effective model ID contract for Provider alias rows.
- [x] Add Provider alias sync that writes missing identity aliases.
- [x] Add OpenAI-compatible upstream `/models` fallback when CLIProxyAPI cannot provide Provider-scoped discovery.
- [x] Preserve explicit aliases and `fork: true` final model ID behavior.
- [x] Make `Models` refresh sync aliases before displaying Provider model lists.
- [x] Add MIMO/Codex regressions proving each Provider shows its own final alias list.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.

## Next Prompt

Start v0.3.0 planning setup.

Expected next change:

- Create `docs/version/0.3.0/` planning files for deeper model resource inventory.

## Version Roadmap

- [x] v0.1.0 Planning Baseline: product docs, README, and agent loop.
- [x] v0.1.1 Runtime Contract Spike: CLIProxyAPI management types, client, redaction, and tests.
- [x] v0.1.2 Runtime Service And Minimal Config Renderer: main-process status service, settings storage, typed IPC, and simple config UI.
- [x] v0.1.3 Runtime Connection GUI Hardening: diagnostics, endpoint copy, empty states, and editing affordances.
- [x] v0.1.4 Managed CLIProxyAPI Runtime, Software Config, And Tray MVP: YAML config, official download/update, process control, port ownership, tray status, and quick actions.
- [x] v0.1.5 Real Local Proxy Setup And Full CLIProxyAPI Upstream Catalog: configure local client keys and every current CLIProxyAPI upstream family.
- [x] v0.1.6 React Renderer And Sidebar Navigation: migrate renderer to React, add Providers/Settings sidebar, and remove duplicate OpenAI-compatible provider surface.
- [x] v0.2.0 Auth Management Surface: multiple persisted auth files and providers through CLIProxyAPI.
- [x] v0.2.1 Models Module And Named Output Keys: model-first provider/model list plus persistent named local output keys.
- [x] v0.2.2 Provider Model Alias Sync: seed missing identity aliases per Provider and display final exposed model IDs.
- [ ] v0.3.0 Model Resource Inventory: deeper model resource inventory with backing provider/auth details.
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
- 2026-05-08: v0.1.5 Prompt 0 completed with data-only upstream catalog/types and tests; next prompt is Management API client expansion.
- 2026-05-08: v0.1.5 Prompt 1 completed with typed CLIProxyAPI Management API client upstream route methods and fake-fetch tests; next prompt is UpstreamService and redaction.
- 2026-05-08: v0.1.5 completed. Added full upstream catalog/types, typed Management API client routes, `UpstreamService`, API-key CRUD, local client key flow, Amp flow, auth-file summaries, managed auth-dir, provider login/import runner, upstream IPC/preload, compact renderer setup UI, and verification (`bun run test`, `bun run typecheck`, `bun run build`). Browser visual verification could not run because the Browser Node runner was not available through tool discovery.
- 2026-05-09: User inserted v0.1.6 before v0.2.0 for React renderer migration and sidebar navigation. Created `docs/version/0.1.6/` planning files and chose the lightweight page-state React approach.
- 2026-05-09: v0.1.6 Prompt 0 completed with React dependencies, TSX renderer entry, minimal `App` shell, a red/green renderer shell test, and `bun run typecheck`.
- 2026-05-09: v0.1.6 completed. Migrated renderer to React, split app state/types/shared UI/Providers/Settings surfaces, added sidebar navigation, removed the duplicate standalone OpenAI-compatible provider module, preserved main-process IPC contracts, and verified with `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-09: v0.2.0 Prompt 0 implemented realtime Codex device login IPC. CLIProxyAPI login stdout/stderr are piped, redacted, parsed for Codex device URL/code, forwarded to the invoking renderer, and shown in a transient Provider Login panel in Providers. Verified with `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-09: v0.2.0 planning recentered on multiple persisted auth files and providers with add/delete management; broad auth metadata editing is deferred unless required for add/delete.
- 2026-05-09: v0.2.0 Prompt 1 completed. Providers now groups multiple account auth-file summaries by provider, shows safe metadata only, reuses login/import add handoffs, deletes individual auth files through main-process IPC/CLIProxyAPI Management API, and refreshes upstream/auth summaries after add/delete.
- 2026-05-09: v0.2.0 completed. Provider entries now render with safe metadata and delete actions, add/delete flows refresh from CLIProxyAPI-backed state, reload/startup regressions prove persisted summaries are reread, and renderer durable-storage tests prevent auth/login data from entering `localStorage` or `sessionStorage`. Verified with focused red/green tests, `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-09: Added Settings output port tests after v0.2.0 completion: TCP connectivity against the final CLIProxyAPI service port plus a transient local-key `/v1/chat/completions` model output smoke test. allmone still does not proxy, adapt, or transform provider traffic.
- 2026-05-10: v0.2.1 planning created. Models moves above Providers as the model-first default module and lists successfully configured/imported providers. User clarified local output key values are allmone-owned, stored encrypted in allmone config, masked by default, and revealable through an explicit user action.
- 2026-05-10: User clarified model IDs must come from local CLIProxyAPI model endpoints, which require a persistent local output key. v0.2.1 now starts with key bootstrap: on each startup, allmone checks for a persistent default key and generates one if missing.
- 2026-05-10: v0.2.1 Prompt 0 completed. Added encrypted allmone-owned local output key records, startup default-key bootstrap, named-key main-process IPC/preload methods, and managed CLIProxyAPI `api-keys` config writing from decrypted main-process values. Verified with focused tests, `bun run test`, and `bun run typecheck`.
- 2026-05-10: v0.2.1 completed. Added the Models default module, main-process `/models` inventory projection, read-only provider/model rows, named local output key creation/save/rename/reveal/delete UI, provider/key refresh paths, and model/key secret-boundary coverage. Verified with `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-11: Adjusted Models inventory projection so a `/models` refresh sets fetched rows directly as Provider `models` state. `provider`, `source`, `channel`, and `owned_by` remain optional model metadata but do not decide whether a fetched model row is displayed. Amp integration remains excluded from the Models provider list because it is not a usable model provider. Verified with focused tests, `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-11: Added API-key provider editing in `Providers` rows. The UI writes provider name where supported, base URL, optional replacement API key, model aliases, and excluded-model patterns through CLIProxyAPI Management API routes while keeping existing raw provider API keys main-process-only. Verified with `bun test`, `bun run typecheck`, and `bun run build`.
- 2026-05-11: Corrected Models refresh after local verification showed CLIProxyAPI v6.10.9 returns the same merged models response for `/api/provider/{provider}/.../models`, even for unknown providers. Account rows still read CLIProxyAPI model output, while API-key/OpenAI-compatible rows now read only their configured `models` entries from CLIProxyAPI-backed provider config, so MIMO no longer inherits Codex's merged model list.
- 2026-05-11: User clarified the desired model behavior: each Provider's upstream models should be represented in that Provider's CLIProxyAPI alias config. Missing aliases should become identity aliases, explicit aliases should remain authoritative, and `Models` should display final exposed model IDs under the Provider row. Created `docs/version/0.2.2/` planning files and deferred broader v0.3.0 inventory work.
- 2026-05-11: Updated v0.2.2 planning so CLIProxyAPI remains the preferred Provider-scoped discovery source, but OpenAI-compatible Providers use a main-process upstream `/models` fallback when CLIProxyAPI cannot provide reliable Provider-scoped model discovery.
- 2026-05-11: v0.2.2 completed. Added effective alias projection, Provider alias sync, OpenAI-compatible fallback discovery, account/OAuth alias sync, sync-unavailable renderer state, and MIMO/Codex plus secret-boundary regressions. Next work returns to v0.3.0 planning.
- Update this file and the active version todo after every meaningful coding session.
