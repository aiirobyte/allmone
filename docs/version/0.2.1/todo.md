# allmone v0.2.1 Todo

Last updated: 2026-05-10
Status: Planned

## Version Target

Target: v0.2.1 Models module and named persistent local output keys.

Definition of done:

- [x] Create `docs/version/0.2.1/spec.md`.
- [x] Create `docs/version/0.2.1/prompt_plan.md`.
- [x] Create `docs/version/0.2.1/todo.md`.
- [ ] Add a `Models` sidebar item above `Providers`.
- [ ] Make `Models` the default renderer section.
- [ ] List each provider successfully configured/imported through Provider workflows.
- [ ] Show safe basic provider information for each provider row.
- [ ] Show model ID lists from the local CLIProxyAPI `/models` endpoint.
- [ ] Show explicit empty model states when configured providers have no `/models` records.
- [ ] Keep provider management actions in `Providers`, not `Models`.
- [ ] Persist local output key values as encrypted records in allmone config.
- [ ] On every startup, ensure a persistent default local output key exists.
- [ ] Generate and persist one default local output key when none exists.
- [ ] Reuse an existing persistent default key instead of regenerating every launch.
- [ ] Write allmone-managed local output keys into managed CLIProxyAPI runtime config so `/models` and proxy auth can use them.
- [ ] Store local output key names, stable IDs, and redacted previews in allmone config.
- [ ] Let users create multiple named generated keys.
- [ ] Let users save user-provided keys with names.
- [ ] Let users rename, explicitly reveal, and delete local output keys.
- [ ] Return plaintext local output keys only in immediate create/set/reveal responses.
- [ ] Keep key values and auth/provider secrets out of renderer durable storage and logs.
- [ ] Keep allmone free of API proxying, provider adapters, routing, payload rules, provider model endpoint calls, and request/response transformation.
- [ ] Run `bun run test`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Update root docs after Prompt 0 implementation.
- [ ] Update root docs after Prompt 1 implementation.
- [ ] Update root docs after Prompt 2 implementation.
- [ ] Update root docs after Prompt 3 implementation.
- [ ] Update root docs after Prompt 4 implementation.
- [ ] Update root docs after v0.2.1 completion.

## Next Prompt

Start v0.2.1 Prompt 0: Persistent Local Output Key Bootstrap.

Expected next change:

- Add allmone-owned encrypted local output key persistence and startup bootstrap. If no persistent key exists, generate one and make it available to the managed CLIProxyAPI runtime.

## Guardrails

- Do not implement upstream-provider model discovery in allmone.
- Do not call upstream provider `/models` endpoints from allmone; only call the local CLIProxyAPI `/models` output endpoint.
- Do not reveal previously stored local output key plaintext without an explicit user reveal action.
- Do not store local output key plaintext in allmone config; persist encrypted key values only.
- Do not put provider add/delete/login/import controls on the `Models` page.
- Keep local output key values behind main-process IPC and allmone encrypted config.
- Preserve existing Provider workflows.

## Planning Notes

- 2026-05-10: v0.2.1 planning files created. The version narrows the previously planned model resource inventory into a concrete `Models` module above `Providers`, with read-only provider/model rows and named persistent local output keys.
- 2026-05-10: User clarified that local output keys are persisted by allmone, not CLIProxyAPI. Updated scope so allmone stores encrypted key values in config, shows keys masked by default, and supports explicit reveal for plaintext display.
- 2026-05-10: User clarified model IDs must come from the local CLIProxyAPI `/models` endpoint. Updated v0.2.1 so startup ensures a persistent default key exists, generates one if missing, uses it for `/models`, and keeps upstream provider `/models` calls out of allmone.
- Update this file after every meaningful coding session.
