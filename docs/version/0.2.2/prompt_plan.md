# allmone v0.2.2 Prompt Plan

Last updated: 2026-05-11
Status: Planned

## Version Target

Implement Provider-scoped model alias sync so every configured Provider displays the final model IDs exposed by CLIProxyAPI. Missing aliases default to identity aliases, while explicit user aliases remain authoritative.

## Prompts

### Prompt 0: Effective Model Alias Contract

Status: Pending

Goal: Define and test the effective model ID contract before changing refresh behavior.

Expected next change:

1. Add failing tests for effective model ID projection from CLIProxyAPI alias rows.
2. Cover identity alias rows, explicit aliases, `fork: true`, duplicate suppression, and legacy rows with only `name`.
3. Add tests proving `provider`, `source`, `channel`, and `owned_by` metadata never determine Provider row membership.
4. Define the renderer-safe sync state needed for "ready", "empty", and "sync unavailable" Provider rows.
5. Keep the contract in `src/main/models` unless an existing upstream type already owns the shape.
6. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not call merged `/v1/models` to decide API-key/OpenAI-compatible Provider membership.
- Do not add a new ownership entity or global model registry.
- Do not expose raw provider secrets to satisfy tests.

### Prompt 1: Provider Alias Sync Service

Status: Pending

Goal: Add the main-process sync that writes missing identity aliases into Provider config and preserves explicit aliases.

Expected next change:

1. Add failing service tests for API-key upstream Provider entries.
2. Add failing service tests for OpenAI-compatible Providers.
3. Add account/OAuth alias map tests where the existing CLIProxyAPI Management API supports alias writes.
4. Implement a sync path that loads current Provider config, gets Provider-scoped model candidates from CLIProxyAPI-owned data, and appends identity aliases for missing candidate names.
5. Preserve existing alias rows, `fork`, disabled state, base URL, API key entries, headers, proxy URL, excluded models, and unknown fields.
6. Write only changed Provider configs through existing Management API boundaries.
7. Return a safe Provider-level sync status when Provider-scoped candidates are unavailable.
8. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not call upstream Provider `/models` endpoints directly from allmone.
- Do not reuse merged CLIProxyAPI `/v1/models` output as Provider-scoped candidates.
- Do not overwrite user aliases with identity aliases.
- Do not send raw provider API keys to the renderer.

### Prompt 2: Models Refresh Uses Effective Alias Lists

Status: Pending

Goal: Make the `Models` refresh button sync aliases first, then show the final configured model IDs per Provider.

Expected next change:

1. Update the model inventory flow so refresh runs Provider alias sync before building Provider rows.
2. Reload effective Provider config after any alias writes.
3. Build `Models` rows from final alias config rather than raw model candidate rows.
4. Keep each model list nested under its Provider row.
5. Keep the existing refresh button and loading/error states.
6. Add renderer tests for final alias display, identity alias display, `fork: true`, and sync-unavailable Provider rows.
7. Ensure Provider edit saves still refresh the `Models` state.
8. Verify with focused tests, `bun run test`, and `bun run typecheck`.

Guardrails:

- Do not make `Models` a broad Provider editor.
- Do not introduce model ownership filtering.
- Do not remove the Provider grouping or refresh control.

### Prompt 3: Regression, Docs, And Version Handoff

Status: Pending

Goal: Close v0.2.2 with regression coverage, full verification, and updated planning state.

Expected next change:

1. Add regression tests for the MIMO/Codex case: each Provider shows only its own final configured alias list.
2. Add regression tests that alias sync does not leak provider API keys or local output keys.
3. Confirm `Models` refresh does not display merged CLIProxyAPI rows for API-key/OpenAI-compatible Providers.
4. Update `docs/version/0.2.2/todo.md` as prompts complete.
5. Update root docs and `docs/version/README.md` when v0.2.2 is complete, then return the roadmap to v0.3.0 planning.
6. Verify with `bun run test`, `bun run typecheck`, and `bun run build`.

Guardrails:

- Keep allmone inside the desktop control plane boundary.
- Keep CLIProxyAPI as the source of truth for proxy output, routing, alias resolution, and Provider-scoped model discovery.
- Do not broaden the version into usage/log dashboards or model resource analytics.

## Completion Checklist

- [ ] Effective model alias contract.
- [ ] Provider alias sync service.
- [ ] `Models` refresh uses final alias lists.
- [ ] MIMO/Codex and secret-boundary regressions.
- [ ] Root docs updated for v0.2.2 completion and v0.3.0 handoff.
- [ ] `bun run test`.
- [ ] `bun run typecheck`.
- [ ] `bun run build`.
