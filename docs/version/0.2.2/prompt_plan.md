# allmone v0.2.2 Prompt Plan

Last updated: 2026-05-11
Status: Complete

## Version Target

Implement Provider-scoped model alias sync so every configured Provider displays the final model IDs exposed through CLIProxyAPI. Missing aliases default to identity aliases, while explicit user aliases remain authoritative. Prefer CLIProxyAPI Provider-scoped discovery; for OpenAI-compatible Providers only, fall back to the configured upstream `/models` endpoint when CLIProxyAPI cannot provide the upstream model list.

## Prompts

### Prompt 0: Effective Model Alias Contract

Status: Complete

Goal: Define and test the upstream/effective model ID contract before changing refresh behavior.

Expected next change:

1. Add failing tests for effective model ID projection from CLIProxyAPI alias rows.
2. Cover identity alias rows, explicit aliases, `fork: true`, duplicate suppression, and legacy rows with only `name`.
3. Add tests proving `provider`, `source`, `channel`, and `owned_by` metadata never determine Provider row membership.
4. Define the renderer-safe sync state needed for "ready", "empty", and "sync unavailable" Provider rows.
5. Define separate concepts for upstream model candidates, alias rows, and effective exposed model IDs.
6. Keep the contract in `src/main/models` unless an existing upstream type already owns the shape.
7. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not call merged `/v1/models` to decide API-key/OpenAI-compatible Provider membership.
- Do not add a new ownership entity or global model registry.
- Do not expose raw provider secrets to satisfy tests.

### Prompt 1: Provider Alias Sync Service

Status: Complete

Goal: Add the main-process sync that discovers Provider upstream models, writes missing identity aliases into Provider config, and preserves explicit aliases.

Expected next change:

1. Add failing service tests for API-key upstream Provider entries.
2. Add failing service tests for OpenAI-compatible Providers using CLIProxyAPI discovery when available.
3. Add failing service tests for the OpenAI-compatible upstream `/models` fallback when CLIProxyAPI discovery is unavailable.
4. Add account/OAuth alias map tests where the existing CLIProxyAPI Management API supports alias writes.
5. Implement a sync path that loads current Provider config, gets Provider-scoped model candidates from CLIProxyAPI-owned data when available, and appends identity aliases for missing candidate names.
6. For OpenAI-compatible Providers without CLIProxyAPI discovery, fetch candidate names from the configured OpenAI-compatible `/models` endpoint in the main process.
7. Preserve existing alias rows, `fork`, disabled state, base URL, API key entries, headers, proxy URL, excluded models, and unknown fields.
8. Write only changed Provider configs through existing Management API boundaries.
9. Return a safe Provider-level sync status when Provider-scoped candidates are unavailable after all allowed discovery paths fail.
10. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not call upstream Provider `/models` endpoints directly from allmone except the OpenAI-compatible fallback required by v0.2.2.
- Do not reuse merged CLIProxyAPI `/v1/models` output as Provider-scoped candidates.
- Do not overwrite user aliases with identity aliases.
- Do not send raw provider API keys to the renderer.
- Do not implement non-OpenAI-compatible provider discovery fallbacks.

### Prompt 2: Models Refresh Uses Effective Alias Lists

Status: Complete

Goal: Make the `Models` refresh button sync aliases first, then show the final exposed model IDs per Provider.

Expected next change:

1. Update the model inventory flow so refresh runs Provider alias sync before building Provider rows.
2. Reload effective Provider config after any alias writes.
3. Build `Models` rows from CLIProxyAPI Provider-scoped effective output when available, otherwise from final alias config after sync.
4. Keep each model list nested under its Provider row.
5. Keep the existing refresh button and loading/error states.
6. Add renderer tests for final alias display, identity alias display, `fork: true`, OpenAI-compatible fallback results, and sync-unavailable Provider rows.
7. Ensure Provider edit saves still refresh the `Models` state.
8. Verify with focused tests, `bun run test`, and `bun run typecheck`.

Guardrails:

- Do not make `Models` a broad Provider editor.
- Do not introduce model ownership filtering.
- Do not remove the Provider grouping or refresh control.

### Prompt 3: Regression, Docs, And Version Handoff

Status: Complete

Goal: Close v0.2.2 with regression coverage, full verification, and updated planning state.

Expected next change:

1. Add regression tests for the MIMO/Codex case: each Provider shows only its own final exposed alias list.
2. Add regression tests that alias sync does not leak provider API keys or local output keys.
3. Confirm `Models` refresh does not display merged CLIProxyAPI rows for API-key/OpenAI-compatible Providers.
4. Add regression tests that the OpenAI-compatible fallback uses only that Provider's configured `/models` response and redacts all provider secrets from errors and renderer payloads.
5. Update `docs/version/0.2.2/todo.md` as prompts complete.
6. Update root docs and `docs/version/README.md` when v0.2.2 is complete, then hand off to v0.2.3 Provider output model definition.
7. Verify with `bun run test`, `bun run typecheck`, and `bun run build`.

Guardrails:

- Keep allmone inside the desktop control plane boundary.
- Keep CLIProxyAPI as the source of truth for proxy output, routing, and alias resolution; use allmone's upstream `/models` fallback only for OpenAI-compatible discovery when CLIProxyAPI lacks Provider-scoped discovery.
- Do not broaden the version into usage/log dashboards or model resource analytics.

## Completion Checklist

- [x] Effective model alias contract.
- [x] Provider upstream model discovery and alias sync service.
- [x] OpenAI-compatible upstream `/models` fallback.
- [x] `Models` refresh uses final exposed model lists.
- [x] MIMO/Codex and secret-boundary regressions.
- [x] Root docs updated for v0.2.2 completion and v0.2.3 handoff.
- [x] `bun run test`.
- [x] `bun run typecheck`.
- [x] `bun run build`.
