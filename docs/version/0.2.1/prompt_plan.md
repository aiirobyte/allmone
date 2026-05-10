# allmone v0.2.1 Prompt Plan

Last updated: 2026-05-10
Status: Complete

## Version Target

Build the `Models` module as the model-first view over already configured Providers, and add named persistent local output keys backed by allmone-owned encrypted configuration.

## Prompts

### Prompt 0: Persistent Local Output Key Bootstrap

Status: Complete

Goal: Add allmone-owned encrypted local output key persistence and startup bootstrap so `/models` can always be called with a valid key.

Expected next change:

1. Add failing tests for encrypted named local key records in `AllmoneConfigStore`.
2. Extend `~/.allmone/config.yaml` schema with allmone-owned local output key records: stable ID, name, redacted preview, encrypted key value, and default-key marker.
3. Add failing service tests that startup/bootstrap generates one persistent key when none exists.
4. Add failing service tests that startup/bootstrap reuses the existing default key and does not regenerate on every launch.
5. Decrypt allmone-managed local output keys only in the main process.
6. Update managed CLIProxyAPI runtime config writing so allmone-managed output keys are available to CLIProxyAPI for local proxy auth.
7. Add IPC/preload methods for local key summaries, create generated key, set user key, rename key, reveal key by safe ID, and delete key by safe ID.
8. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not store local output key plaintext in allmone config; persist encrypted key values only.
- Do not regenerate a new key on every launch when a persistent key already exists.
- Do not send local output key plaintext to renderer except in immediate create/reveal responses.
- Do not use renderer `localStorage` or `sessionStorage` for local output keys or key names.

### Prompt 1: `/models` Model Inventory Contract

Status: Complete

Goal: Add a main-process, renderer-safe model inventory projection that reads row-specific model data from CLIProxyAPI-owned sources with the default allmone-managed local output key where model output is needed.

Expected next change:

1. Add failing tests for a model inventory service that receives fake `UpstreamService` data and a fake `/models` fetch adapter.
2. Create `src/main/models/types.ts` for provider rows with `/models` child rows and local output key summaries.
3. Create `src/main/models/service.ts` that ensures a default key exists before fetching model IDs.
4. Call CLIProxyAPI model output from the main process for account/OAuth Provider rows with `Authorization: Bearer <default-local-output-key>`.
5. For API-key and OpenAI-compatible Provider rows, read that Provider entry's configured `models` list from CLIProxyAPI-backed provider summaries instead of copying merged `/v1/models` rows.
6. Normalize each Provider row's own records into that row's `models` state directly, without gating display on provider/source/channel/owned_by metadata.
7. Preserve explicit empty model states for Provider rows with no model child rows.
8. Add IPC/preload contract for reading model inventory.
9. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not call upstream provider `/models` endpoints directly from allmone.
- Do not copy merged CLIProxyAPI `/v1/models` output into API-key/OpenAI-compatible Provider rows.
- Do not add routing, payload-rule, provider adapter, or request/response transformation logic.
- Do not expose raw provider API keys, auth-file contents, bearer tokens, or management keys to the renderer.

### Prompt 2: Models Sidebar And List UI

Status: Complete

Goal: Add the renderer `Models` module above `Providers` and render the model inventory as an operational provider list.

Expected next change:

1. Add failing renderer tests for sidebar order and default `models` section.
2. Extend `ActiveSection`, initial app state, and sidebar sections with `models`.
3. Load model inventory during bootstrap and after provider refreshes when the runtime is reachable; this should trigger local key bootstrap when needed.
4. Create `src/renderer/src/pages/ModelsPage.tsx`.
5. Render each configured/imported provider as a list row with safe basic information.
6. Render exact model IDs returned by `/models`, secondary alias/mapping hints when available, and explicit empty model states.
7. Keep provider add/delete/login/import controls out of `Models`.
8. Verify with focused renderer tests, `bun run typecheck`, and `bun run build`.

Guardrails:

- Keep the UI dense and task-focused.
- Do not turn `Models` into a provider editor.
- Do not duplicate large Provider management forms in `Models`.

### Prompt 3: Named Local Output Key Management UI

Status: Complete

Goal: Let users manage multiple allmone-owned local output keys after the startup bootstrap exists.

Expected next change:

1. Add renderer and service tests for generated name-only keys, renames, explicit reveals, deletes, reloads, and secret redaction.
2. Move or replace the Providers-side local service key card with a `Models` local output key section.
3. Render service origin, base URL, named redacted keys, default-key marker, name-only create form, rename, reveal, delete, and transient plaintext display after create/reveal.
4. Refresh CLIProxyAPI runtime key config after key create/delete operations where needed.
5. Verify with focused tests, `bun run test`, `bun run typecheck`, and `bun run build`.

Guardrails:

- Do not reveal previously stored local output key plaintext unless the user explicitly clicks to view it.
- Do not store local output key plaintext in allmone's software config; persist encrypted key values only.
- Do not send local output key plaintext to renderer except in immediate create/reveal responses.
- Do not use renderer `localStorage` or `sessionStorage` for local output keys or key names.

### Prompt 4: Refresh, Regression, And Version Handoff

Status: Complete

Goal: Close v0.2.1 by proving Models and named keys refresh correctly after writes and survive reload/startup.

Expected next change:

1. Add integration-style regressions for startup/reload reading model inventory and named key summaries.
2. Prove startup with no local output key creates exactly one persistent default key.
3. Prove provider add/delete flows refresh `Models` inventory by re-calling `/models` without requiring app restart.
4. Prove key create/rename/reveal/delete flows refresh the local output key section and keep plaintext transient.
5. Re-run renderer durable-storage secret-boundary tests with model/key state included.
6. Update `docs/version/0.2.1/todo.md` as prompts complete.
7. Update root docs and `docs/version/README.md` when v0.2.1 is complete.
8. Verify with `bun run test`, `bun run typecheck`, and `bun run build`.

Guardrails:

- Do not broaden the version into usage/log dashboards.
- Do not add live provider model discovery.
- Keep CLIProxyAPI as the source of truth for provider config, while allmone is the source of truth for local output key persistence.

## Completion Checklist

- [x] Persistent local output key bootstrap.
- [x] `/models` model inventory contract.
- [x] Models sidebar and list UI.
- [x] Named local output key management UI.
- [x] Refresh/reload regressions and secret-boundary checks.
- [x] Root docs updated for v0.2.1 progress and completion.
- [x] `bun run test`.
- [x] `bun run typecheck`.
- [x] `bun run build`.
