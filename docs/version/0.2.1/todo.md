# allmone v0.2.1 Todo

Last updated: 2026-05-11
Status: Complete

## Version Target

Target: v0.2.1 Models module and named persistent local output keys.

Definition of done:

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
- [x] Keep provider management actions in `Providers`, not `Models`.
- [x] Persist local output key values as encrypted records in allmone config.
- [x] On every startup, ensure a persistent default local output key exists.
- [x] Generate and persist one default local output key when none exists.
- [x] Reuse an existing persistent default key instead of regenerating every launch.
- [x] Write allmone-managed local output keys into managed CLIProxyAPI runtime config so `/models` and proxy auth can use them.
- [x] Store local output key names, stable IDs, and redacted previews in allmone config.
- [x] Let users create multiple named generated keys.
- [x] Generate named keys from a Name-only form and save them immediately.
- [x] Let users rename, explicitly reveal, and delete local output keys.
- [x] Return plaintext local output keys only in immediate create/reveal responses.
- [x] Keep key values and auth/provider secrets out of renderer durable storage and logs.
- [x] Add a `Providers`-side edit entry for existing API-key upstream rows.
- [x] Write API-key provider name where supported, base URL, replacement API key, model aliases, and excluded-model patterns through CLIProxyAPI Management API routes.
- [x] Preserve existing raw provider API keys in the main process when an edit leaves the API key blank.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, provider model endpoint calls, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after Prompt 0 implementation.
- [x] Update root docs after Prompt 1 implementation.
- [x] Update root docs after Prompt 2 implementation.
- [x] Update root docs after Prompt 3 implementation.
- [x] Update root docs after Prompt 4 implementation.
- [x] Update root docs after v0.2.1 completion.

## Next Prompt

v0.2.1 is complete. Continue from root `docs/prompt_plan.md` for the active next version.

Expected next change:

- v0.2.2 was inserted after v0.2.1 to correct Provider model alias sync before the broader v0.3.0 inventory work.

## Guardrails

- Do not implement upstream-provider model discovery in allmone.
- Do not call upstream provider `/models` endpoints from allmone.
- Do not copy merged CLIProxyAPI `/v1/models` output into API-key/OpenAI-compatible Provider rows.
- Do not reveal previously stored local output key plaintext without an explicit user reveal action.
- Do not store local output key plaintext in allmone config; persist encrypted key values only.
- Do not put provider add/delete/login/import controls on the `Models` page.
- Keep local output key values behind main-process IPC and allmone encrypted config.
- Preserve existing Provider workflows.

## Planning Notes

- 2026-05-10: v0.2.1 planning files created. The version narrows the previously planned model resource inventory into a concrete `Models` module above `Providers`, with read-only provider/model rows and named persistent local output keys.
- 2026-05-10: User clarified that local output keys are persisted by allmone, not CLIProxyAPI. Updated scope so allmone stores encrypted key values in config, shows keys masked by default, and supports explicit reveal for plaintext display.
- 2026-05-10: User clarified model IDs must come from local CLIProxyAPI model endpoints. Updated v0.2.1 so startup ensures a persistent default key exists, generates one if missing, uses it for model inventory, and keeps upstream provider `/models` calls out of allmone.
- 2026-05-10: Prompt 0 completed. allmone now stores named local output keys as encrypted config records, bootstraps a persistent default key on startup, exposes sanitized key IPC/preload methods, writes decrypted local output keys into the managed CLIProxyAPI config in the main process, and returns plaintext only for create/reveal responses. Verified with focused tests, `bun run test`, and `bun run typecheck`.
- 2026-05-11: User clarified that local output keys should be generated from Name only and saved immediately after generation. Removed user-provided key value entry from the Models key management contract.
- 2026-05-10: Prompts 1-4 completed. Added main-process `/models` inventory projection, Models-first sidebar/default renderer flow, read-only provider/model rows, named local output key management in Models, refresh paths after provider/key writes, and secret-boundary regressions. v0.2.1 is complete and verified with `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-11: Adjusted the Models projection so a `/models` refresh sets fetched rows directly as Provider `models` state. `provider`, `source`, `channel`, and `owned_by` remain optional model metadata but do not decide whether a fetched model row is displayed. Amp integration stays out of the Models provider list because it is not a usable model provider. Verified with focused tests, `bun run test`, `bun run typecheck`, and `bun run build`.
- 2026-05-11: Added API-key provider editing in `Providers` entry rows. The renderer sends entry index plus edited fields, API key replacement is optional, and the main process merges changes into existing CLIProxyAPI records so raw provider keys stay out of renderer state unless explicitly replaced. Verified with `bun test`, `bun run typecheck`, and `bun run build`.
- 2026-05-11: Corrected Models refresh after local verification showed CLIProxyAPI v6.10.9 returns the same merged models response for `/api/provider/{provider}/.../models`, even for unknown providers. Account rows still read CLIProxyAPI model output, while API-key/OpenAI-compatible rows now read only their configured `models` entries from CLIProxyAPI-backed provider config, so MIMO no longer inherits Codex's merged model list.
- 2026-05-11: After v0.2.1 completion, v0.2.2 was inserted before v0.3.0 to plan Provider model alias sync: missing aliases become identity aliases, explicit aliases remain authoritative, and `Models` displays final configured model IDs under each Provider.
- Update this file after every meaningful coding session.
