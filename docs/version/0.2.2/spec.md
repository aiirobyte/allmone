# allmone v0.2.2 Spec

Last updated: 2026-05-11
Status: Planned

## Version Goal

Make each Provider row show the model IDs that CLIProxyAPI will actually expose for that Provider after model alias configuration is applied. When a Provider has upstream model IDs but no explicit alias configuration for them, allmone should write identity aliases so `name` and `alias` are the same model ID. When explicit aliases exist, the UI should show the final exposed model IDs.

## Why This Version Exists

v0.2.1 made the `Models` page visible, but the source-of-truth boundary still needs to be corrected. The UI should not infer Provider ownership from `/models` response fields such as `provider`, `source`, `channel`, or `owned_by`. Those fields can be metadata, and OpenAI-compatible upstreams are not necessarily OpenAI-owned.

The desired model is simpler: Provider rows are backed by Provider configuration and Provider-scoped model discovery. Refreshing models should reconcile each Provider's upstream model IDs into that Provider's CLIProxyAPI alias configuration, then display the effective model IDs exposed after that configuration.

CLIProxyAPI remains the preferred source for Provider-scoped model discovery and effective model output. However, current CLIProxyAPI releases do not reliably expose OpenAI-compatible Provider-scoped model discovery: `/api/provider/{provider}/v1/models` can return the same merged list even for unknown providers. For OpenAI-compatible Providers only, allmone should implement a narrow main-process fallback that calls the configured upstream OpenAI-compatible `/models` endpoint when CLIProxyAPI cannot provide the upstream model list.

## Core Behavior

- Keep `Models` grouped by configured Provider.
- On refresh, process each Provider independently.
- Obtain that Provider's upstream model IDs from the best Provider-scoped source:
  - Prefer a CLIProxyAPI-owned Provider-scoped model discovery or effective-model source when available.
  - For account/OAuth Providers, use CLIProxyAPI Management API model data such as auth-file scoped models where available.
  - For OpenAI-compatible Providers, if CLIProxyAPI cannot provide Provider-scoped upstream models, call that Provider's configured OpenAI-compatible `/models` endpoint from the main process as a narrow fallback.
- Do not use merged `/v1/models` output to populate API-key or OpenAI-compatible Provider rows.
- Do not use `provider`, `source`, `channel`, or `owned_by` response metadata to decide whether a model belongs to a Provider row.
- Reconcile upstream model IDs into the Provider's model alias configuration:
  - If a model ID already has an explicit alias row, preserve that row.
  - If a model ID has no alias row, add an identity alias row where `name` equals the upstream model ID and `alias` equals the same model ID.
  - Preserve unknown CLIProxyAPI config fields and existing secret material while writing alias updates.
  - Do not overwrite user-defined aliases.
- Display the final exposed model IDs for that Provider:
  - Prefer CLIProxyAPI Provider-scoped effective model output when available.
  - Otherwise derive the exposed IDs from the refreshed Provider alias config.
  - If an alias exists, show the alias.
  - If `fork: true` exists, show both the alias and the original `name`, because both are exposed by configuration.
  - For legacy rows without `alias`, show `name` as the effective model ID and normalize it to an identity alias on the next successful sync.
- After sync, CLIProxyAPI's OpenAI-compatible output should expose the same effective model IDs shown by allmone.

## Scope

### In Scope

- Add a main-process Provider model alias sync step used by the `Models` refresh flow.
- Support API-key upstream Provider entries that store alias rows under each entry's `models` field.
- Support OpenAI-compatible Providers that store alias rows under each Provider's `models` field.
- Add a main-process OpenAI-compatible `/models` discovery fallback for configured OpenAI-compatible Providers when CLIProxyAPI lacks Provider-scoped discovery.
- Support account/OAuth Providers through CLIProxyAPI's account-provider alias mechanism where available, such as `oauth-model-alias`.
- Treat CLIProxyAPI as the owner of alias resolution, routing, and OpenAI-compatible output.
- Keep the OpenAI-compatible discovery fallback narrow: `GET {base-url}/models` or equivalent URL resolution from the configured OpenAI-compatible base URL, using only main-process provider secrets, redacted errors, request timeout, configured headers, API-key entry selection, and proxy URL where supported.
- Keep model alias writes in the main process.
- Keep renderer payloads secret-safe and limited to effective model IDs plus safe metadata.
- Preserve existing alias rows, `fork` flags, disabled flags, headers, base URLs, API key entries, proxy URLs, and unknown fields.
- Report a clear Provider-level state when neither CLIProxyAPI nor the OpenAI-compatible fallback can provide Provider-scoped upstream model candidates.
- Verify that `Models` refresh writes missing identity aliases before displaying the effective rows.
- Verify that provider/source/channel/owned_by metadata never gates display.
- Verify with focused tests, `bun run test`, `bun run typecheck`, and `bun run build`.

### Out Of Scope

- No direct upstream Provider `/models` calls from allmone except the explicit OpenAI-compatible discovery fallback in this version.
- No provider protocol parsing, request routing, payload-rule UI, request/response transformation, or model alias resolution inside allmone.
- No non-OpenAI-compatible upstream model discovery fallback.
- No global model ownership registry in allmone.
- No filtering API-key/OpenAI-compatible Provider rows by merged `/v1/models` output.
- No broad `Models` page editing surface beyond refresh/sync and existing final model display.
- No raw `config.yaml` editor.
- No usage dashboard, request log, queue view, cost estimate, or local network sharing.

## Architecture

Add an explicit "effective Provider model IDs" boundary in the main process. The boundary has two phases:

1. Sync Provider aliases.
2. Read effective Provider model rows for renderer display.

Recommended changes:

- `src/main/models/types.ts`: add renderer-safe sync status and effective model row fields if the current types need them.
- `src/main/models/service.ts`: add a Provider alias sync path before building inventory rows and call the OpenAI-compatible discovery fallback only when CLIProxyAPI discovery is unavailable.
- `src/main/upstreams/service.ts`: add narrow methods for reading and writing Provider model alias config and for main-process-only OpenAI-compatible discovery without exposing raw secrets.
- `src/main/cli-proxy-api/client.ts`: reuse existing Management API config routes where possible; add only the minimal CLIProxyAPI client methods needed for account alias maps, auth-file models, model definitions, or future Provider-scoped candidates.
- `src/main/runtime/ipc.ts`: keep the renderer entry point as a single model refresh/inventory call unless separate sync status is necessary.
- `src/preload/index.ts` and `src/renderer/src/vite-env.d.ts`: expose only sanitized model inventory/sync data.
- `src/renderer/src/pages/ModelsPage.tsx`: keep Provider rows and refresh control, but render final exposed model IDs rather than raw candidate rows.

The sync algorithm should be deterministic:

1. Load current Provider summaries/config through the existing main-process services.
2. For each configured Provider, get its Provider-scoped upstream model IDs from CLIProxyAPI-owned data when available.
3. If an OpenAI-compatible Provider has no CLIProxyAPI discovery source, fetch upstream model IDs from that Provider's configured OpenAI-compatible `/models` endpoint in the main process.
4. Compare candidates with existing alias rows by upstream `name`.
5. Append identity alias rows for missing candidates.
6. Write back only Providers whose alias config changed.
7. Reload effective Provider config after writes.
8. Build renderer rows from CLIProxyAPI effective output when available, otherwise from effective alias config.

If neither CLIProxyAPI nor the OpenAI-compatible fallback can provide Provider-scoped candidates for a Provider, allmone should not substitute merged `/v1/models` rows. It should keep the Provider visible, show any existing configured aliases, and surface a safe "model sync unavailable" state for that Provider.

## Testing

Required verification:

```bash
bun run test
bun run typecheck
bun run build
```

Focused tests should cover:

- Missing alias rows become identity alias rows with `name === alias`.
- Existing user aliases are preserved.
- `fork: true` exposes both alias and original name in the final displayed list.
- Legacy configured rows with `name` and no `alias` still display the name and are normalized on sync.
- API-key upstream Provider entries write alias changes without requiring renderer API key access.
- OpenAI-compatible Provider entries write alias changes without losing API key entries, headers, disabled state, base URL, or unknown fields.
- OpenAI-compatible discovery fallback calls only the configured provider's `/models` endpoint, parses OpenAI-compatible `data[].id` rows, honors timeout/failure states, redacts secrets, and never sends raw provider credentials to the renderer.
- Account/OAuth Provider alias maps are preserved and extended through the CLIProxyAPI-owned alias mechanism where supported.
- Provider/source/channel/owned_by metadata does not decide display membership.
- Merged `/v1/models` output is not used to populate API-key/OpenAI-compatible Provider rows.
- The `Models` refresh button triggers sync, reloads effective Provider config, and shows final exposed IDs.
- Provider rows remain visible with a safe sync-unavailable or empty state when Provider-scoped candidates are unavailable after all allowed discovery paths fail.
- Renderer durable storage never receives raw provider API keys, auth-file contents, management keys, bearer tokens, or local output key plaintext except existing explicit local key reveal flows.

## Acceptance

- `docs/version/0.2.2/` contains this spec, a prompt plan, and a todo file.
- Refreshing `Models` reconciles Provider model IDs into CLIProxyAPI alias config.
- Missing aliases are written as identity aliases.
- Existing aliases are preserved and shown as final exposed model IDs.
- OpenAI-compatible Providers can discover upstream models through a main-process `/models` fallback when CLIProxyAPI lacks Provider-scoped discovery.
- The model list remains nested under each Provider row.
- allmone does not add model ownership filtering, provider adapters, non-OpenAI-compatible direct upstream model calls, or routing logic.
- `bun run test`, `bun run typecheck`, and `bun run build` pass.
