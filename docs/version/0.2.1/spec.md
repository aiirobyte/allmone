# allmone v0.2.1 Spec

Last updated: 2026-05-11
Status: Complete

## Version Goal

Add a model-first `Models` module above `Providers` in the sidebar. The page lists providers that the user has successfully configured or imported in `Providers`, shows each provider's safe basic information, and makes the provider's `/models` model IDs easy to inspect. This version also adds named, persistent local output keys so users do not need to regenerate a CLIProxyAPI output key every session.

## Why This Version Exists

v0.2.0 made provider/auth state persistent and manageable. The next user-facing gap is that configured providers are still provider-first: users can add credentials, but they do not have one place to see which model IDs are available for client calls.

v0.2.1 creates that model-first entry point without moving proxying, provider adapters, routing, or provider-specific model discovery into allmone. Model IDs come from CLIProxyAPI-owned model sources: account/OAuth providers use CLIProxyAPI model output, while API-key providers use their own configured `models` entries from CLIProxyAPI-backed provider config. The call requires a persistent local output key when allmone reads CLIProxyAPI model output, so this version also turns local output keys from a transient setup affordance into a durable, named key list owned by allmone's encrypted configuration. CLIProxyAPI consumes these keys for proxy authentication, but it is not the durable storage owner.

## Scope

### In Scope

- Add a `Models` sidebar item above `Providers`.
- Make `Models` the default renderer section unless a test or caller passes another initial section.
- Render `Models` as a list of successfully configured or imported providers from the existing Provider workflows.
- Show safe provider basics per list item:
  - Provider label and provider kind.
  - Provider family, such as API-key upstream, account upstream, imported account upstream, or Amp integration.
  - Configured/disabled state where available.
  - Safe base URL, source, auth-file count, or entry count when already available from CLIProxyAPI-backed summaries.
- Show model ID lists as child data under Provider rows from CLIProxyAPI-owned model sources.
- For account/OAuth Provider rows, call CLIProxyAPI model output from the main process with an allmone-managed persistent local output key.
- For API-key and OpenAI-compatible Provider rows, use only that Provider entry's configured `models` list from CLIProxyAPI-backed provider config.
- Do not copy merged `/v1/models` output into API-key/OpenAI-compatible Provider rows, because CLIProxyAPI v6.10.9 returns the same merged list even for unknown `/api/provider/{provider}/.../models` paths.
- On refresh, set each Provider row's `models` state from its own source rather than from a global model response.
- Preserve `provider`, `source`, `channel`, and `owned_by` as optional model metadata, but do not use those fields to decide whether a fetched model row is displayed.
- Show an explicit empty state when a Provider row has no `/models` child rows.
- Keep model data read-only in `Models`.
- Keep provider add/delete/login/import/edit workflows in `Providers`.
- Provide a `Providers`-side edit entry for existing API-key upstream rows.
- Let API-key upstream edits write provider name where supported, base URL, replacement API key, model aliases, and excluded-model patterns through CLIProxyAPI Management API routes where supported.
- Preserve existing API-key entry secrets in the main process when editing fields that do not replace the key; the renderer must not receive raw provider API keys for edits.
- Persist local output key values in allmone's encrypted configuration so configured output keys survive renderer reloads and app restarts.
- On every app start, check whether an allmone-managed persistent local output key exists.
- If no persistent local output key exists, generate one, encrypt it into allmone config, mark it as the default Models/runtime key, and make it available to CLIProxyAPI runtime configuration.
- Before fetching model IDs, ensure there is a usable default local output key.
- Support multiple local output keys.
- Support a user-visible name for each local output key.
- Store local output key records as allmone-owned config data with encrypted key values, stable IDs, names, and safe redacted previews.
- Show local output keys as hidden/redacted by default.
- Let users create a generated key with only a name, rename an existing key, delete a key, and explicitly reveal an existing key's plaintext.
- Generated keys are saved immediately after creation; users do not manually save generated plaintext.
- Return local key plaintext only in immediate create/reveal responses.
- Refresh Models and key summaries after provider/key writes.
- Keep key values, auth-file contents, management keys, bearer tokens, provider API keys, and device codes out of renderer durable storage and logs.
- Verify with focused tests, `bun run typecheck`, and `bun run build`.

### Out Of Scope

- No direct calls to upstream provider `/models` endpoints from allmone.
- No provider protocol parsing, request routing, payload-rule UI, request/response transformation, or model alias resolution inside allmone.
- No provider creation, deletion, login, import, or auth-file management from the `Models` page.
- No API-key provider editing from the `Models` page.
- No raw `config.yaml` editor.
- No automatic reveal/copy of stored local output key values without an explicit user action.
- No usage dashboard, request log, queue view, cost estimate, or local network sharing.

## User Experience

The sidebar order becomes:

1. `Models`
2. `Providers`
3. `Settings`

`Models` is a dense operational list, not a marketing page. Each row represents one provider resource that exists because the user configured it in `Providers`. The row should be scannable:

- Left side: provider label, provider kind, and configured state.
- Middle: safe backing details such as family, base URL, auth-file count, disabled state, or entry count.
- Right side or expanded row content: model IDs and aliases.

Model IDs should be displayed as exact strings users can copy into local clients under their Provider row. For API-key/OpenAI-compatible providers, configured `models` entries are the source of truth for that row's list; for account providers, CLIProxyAPI model output remains the source. When a configured provider has no row-specific model IDs, the row should stay visible with a short empty state so the user can distinguish "provider exists" from "no models reported".

The same page should include a compact `Local Output Keys` section because these keys are how clients call the listed models through CLIProxyAPI. It should show:

- Service origin and OpenAI-compatible base URL.
- Named local output keys with redacted key previews.
- Create generated key with name.
- Generate and save a key from a user-provided name.
- Rename key.
- Delete key.
- Explicit reveal for a stored key, showing plaintext only after the user clicks to view it.

The current Providers-side local service key card should move to `Models` or be reduced to a link/secondary hint so `Providers` remains focused on provider resources.

For API-key upstreams, `Providers` owns editing. Existing API-key entry rows can expose a compact editor for provider name where CLIProxyAPI supports it, base URL, replacement API key, model aliases, and excluded model patterns. The editor is intentionally tied to an existing provider row so it can reuse CLIProxyAPI-managed entry identity without asking the renderer to hold or replay raw provider API keys. Leaving the API key blank preserves the existing secret.

## Architecture

Add a main-process model inventory projection instead of deriving model rows ad hoc in React. The projection should combine account-provider model output with API-key provider configured model entries from existing CLIProxyAPI-backed provider summaries, then return sanitized renderer data.

Recommended boundaries:

- `src/main/models/types.ts`: renderer-safe model inventory and named local key types.
- `src/main/models/service.ts`: ensures a default local output key exists, reads account-provider model output where available, reads API-key provider configured `models` entries from `UpstreamService` provider summaries, and builds named local key summaries from allmone's encrypted local key configuration.
- `src/main/models/service.test.ts`: projection, filtering, redaction, and named-key metadata tests.
- `src/main/runtime/allmoneConfigStore.ts`: extend software config with allmone-owned local output key records, storing key values encrypted at rest and names/previews as safe metadata.
- `src/main/runtime/cliproxyapiConfigWriter.ts`: write allmone-managed local output keys into the managed CLIProxyAPI runtime config on start/restart so CLIProxyAPI can authenticate local model-inventory and proxy requests.
- `src/main/runtime/ipc.ts`: add narrow IPC handlers for model inventory, named local key creation, local key rename, local key reveal, and local key delete.
- `src/preload/index.ts` and `src/renderer/src/vite-env.d.ts`: expose only sanitized IPC methods.
- `src/renderer/src/pages/ModelsPage.tsx`: render provider/model list and local output key controls.
- `src/renderer/src/pages/ProvidersPage.tsx`: render API-key row edit affordances in `Providers`, not `Models`.
- `src/renderer/src/App.tsx`, `appState.ts`, `rendererTypes.ts`, and `components/Sidebar.tsx`: add the `models` section and load/refresh model inventory.

API-key provider edits should use the existing upstream service boundary. For edits that do not replace the API key, the renderer sends provider kind, entry index, and sanitized non-secret fields. The main process loads the current CLIProxyAPI entry, merges changes into the existing record, and writes the result through Management API routes so raw provider keys stay main-process-only. When the user enters a replacement API key, that new key is sent once through IPC and written immediately.

For v0.2.1, allmone is the source of truth for local output key persistence. CLIProxyAPI remains responsible for proxy enforcement, `/models`, and request handling, not for storing the user's named local output keys. allmone must not store plaintext local output keys in its config; persisted key values must be encrypted at rest and decrypted only in the main process for explicit reveal, `/models` calls, or runtime configuration.

## Testing

Required verification:

```bash
bun run test
bun run typecheck
bun run build
```

Focused tests should cover:

- Sidebar order is `Models`, `Providers`, `Settings`.
- `App` defaults to `models`.
- Startup/key bootstrap generates and persists an encrypted default local output key when none exists.
- Startup/key bootstrap does not regenerate a key when one already exists.
- Managed CLIProxyAPI runtime config receives the decrypted allmone-managed local output keys during start/restart setup.
- Model inventory does not copy merged CLIProxyAPI `/v1/models` output into API-key/OpenAI-compatible Provider rows.
- Model inventory includes configured/imported providers only.
- Model inventory excludes unconfigured provider catalog entries.
- Provider model IDs render as child rows from `/models` response records.
- Configured providers with no `/models` child rows show a non-destructive empty state.
- Renderer output never includes raw provider API keys, auth-file contents, management keys, bearer tokens, or local output key plaintext except in explicit create/reveal responses.
- Local output key values persist through allmone encrypted config and reload as redacted named summaries.
- Key names and encrypted key values persist in allmone config.
- Create, rename, reveal, and delete local output key flows refresh the model/key summary.
- Plaintext local output key values are returned only in immediate create/reveal responses.
- API-key row edits preserve existing raw provider API-key records in the main process unless the user explicitly enters a replacement key.

## Acceptance

- `docs/version/0.2.1/` contains this spec, a prompt plan, and a todo file.
- The sidebar shows `Models` above `Providers`.
- The default renderer section is `Models`.
- The `Models` page lists each successfully configured/imported provider from Provider workflows.
- Each provider row shows safe basic provider information.
- Each provider row shows its `/models` model ID child list or an explicit empty state.
- On startup, allmone ensures a persistent default local output key exists and generates one if missing.
- Local output keys can be created, named, renamed, explicitly revealed, deleted, and reloaded.
- Stored local output key values do not need to be regenerated after app restart.
- Stored local output key plaintext is hidden by default and can be shown again only after an explicit user reveal action.
- allmone remains free of provider adapters, routing, payload rules, provider protocol calls, and request/response transformation.
- `bun run test`, `bun run typecheck`, and `bun run build` pass.
