# allmone v0.1.5 Prompt Plan

Last updated: 2026-05-08
Status: Planned

This plan implements `docs/version/0.1.5/spec.md`. Start only after v0.1.4 is complete.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read `docs/version/0.1.5/spec.md`.
4. Check `git status --short`.
5. Preserve user changes.
6. Do not call a real CLIProxyAPI service from tests.
7. Do not perform real provider network tests.
8. Do not move management credentials, upstream API keys, local API keys, proxy credentials, bearer tokens, token files, or sensitive headers into renderer storage.
9. Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.

## Prompt 0: Upstream Catalog And Types

Goal: define the complete v0.1.5 upstream catalog and shared types.

Prompt:

```text
Read docs/version/0.1.5/spec.md and current CLIProxyAPI official provider/config sources.
Add a main-process upstream provider catalog that includes local api-keys, gemini-api-key, codex-api-key, claude-api-key, openai-compatibility, vertex-api-key, ampcode, gemini-cli, aistudio, antigravity, claude, codex, kimi, and vertex.
Represent each provider kind with its CLIProxyAPI config section or channel, management route when available, editable fields, secret fields, redaction behavior, and UI capability flags.
Add shared upstream types for provider summaries, API-key credential inputs, model alias rows, excluded model rows, headers, proxy URL, Amp config, auth-file summaries, login/import actions, and local API key state.
Keep the catalog data-only and do not implement provider protocol logic.
Add tests proving every provider kind from docs/version/0.1.5/spec.md is covered and no secret field is marked displayable.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- The provider catalog covers all v0.1.5 upstream families.
- Secret fields are identified in catalog metadata.
- No proxying or request transformation code is introduced.

## Prompt 1: Management API Client Expansion

Goal: add typed CLIProxyAPI Management API reads and writes for upstream configuration.

Prompt:

```text
Read docs/version/0.1.5/spec.md, src/main/cliproxyapi/client.ts, and src/main/cliproxyapi/types.ts.
Extend the CLIProxyAPI client with typed methods for api-keys, gemini-api-key, codex-api-key, claude-api-key, vertex-api-key, oauth-model-alias, oauth-excluded-models, auth-files, and ampcode endpoints.
Reuse the existing openai-compatibility client methods where possible, but align types with the broader upstream catalog.
Support GET, PUT, PATCH, and DELETE only where CLIProxyAPI exposes them.
Use fake fetch tests for URL construction, auth headers, JSON bodies, query parameters, invalid JSON, non-2xx errors, and redaction.
Do not call a real CLIProxyAPI service.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- Management client supports every in-scope upstream route.
- Tests cover route construction without network.
- Errors remain redacted.

## Prompt 2: Upstream Service And Redaction

Goal: add a main-process service that maps catalog operations to CLIProxyAPI writes safely.

Prompt:

```text
Read docs/version/0.1.5/spec.md and src/main/runtime/service.ts.
Create an UpstreamService that depends on the CLIProxyAPI client and provider catalog.
Implement methods to get the provider catalog, get redacted upstream summaries, upsert/delete API-key upstream entries, read/write Amp config, read/manage auth-file summaries, read/write OAuth model aliases, and read/write OAuth excluded models.
Validate provider kinds and required fields before calling the CLIProxyAPI client.
Redact upstream API keys, local API keys, management keys, proxy credentials, bearer tokens, sensitive headers, token file details, and CLIProxyAPI error bodies.
Return only sanitized objects over service boundaries.
Add unit tests for validation, provider-kind mapping, redaction, and preservation of unknown fields.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- UpstreamService returns secret-free summaries.
- Invalid provider operations fail before writes.
- Existing runtime service behavior remains intact.

## Prompt 3: API-Key Upstream CRUD

Goal: support practical provider setup for all API-key upstream sections.

Prompt:

```text
Read docs/version/0.1.5/spec.md and the UpstreamService from the previous prompt.
Implement provider-specific mapping for gemini-api-key, codex-api-key, claude-api-key, openai-compatibility, and vertex-api-key.
Support fields listed in the spec: api key, base URL, provider name where required, prefix, disabled where supported, headers, proxy URL, model aliases, and excluded models where supported.
For claude-api-key, preserve existing cloak and experimental-cch-signing fields when editing a row unless the user explicitly replaces that row through a supported field.
For openai-compatibility, keep using api-key-entries rather than legacy api-keys.
Add tests for each provider kind covering create, edit, delete, redacted summary, missing required fields, and secret-free errors.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- Users can configure every API-key upstream family.
- OpenAI-compatible providers still work through CLIProxyAPI Management API.
- Provider secrets do not appear in summaries.

## Prompt 4: Local Client API Keys And Connection Output

Goal: let the user protect and copy the local API endpoint.

Prompt:

```text
Read docs/version/0.1.5/spec.md and the v0.1.4 managed runtime state.
Add local client API key management through CLIProxyAPI /api-keys.
Support generating a strong local key, setting a user-provided key, deleting by index/value where supported, and returning redacted local key state.
When allmone generates a key, return the plaintext key only in the immediate command response so the renderer can copy or display it once.
Expose safe local connection output: apiBaseUrl, port, key configured state, and short usage snippets that do not include hidden secrets.
Add tests for generation strength, one-time plaintext return, redacted summaries, delete behavior, and no storage in renderer durable state.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- The user can configure a local API key.
- The user can copy a working local API base URL.
- Hidden local keys are not sent back after the immediate creation response.

## Prompt 5: Amp Integration

Goal: support the CLIProxyAPI Amp configuration surface in scope.

Prompt:

```text
Read docs/version/0.1.5/spec.md and current CLIProxyAPI ampcode management routes.
Implement UpstreamService support for ampcode upstream-url, upstream-api-key, upstream-api-keys, restrict-management-to-localhost, force-model-mappings, and model-mappings.
Validate URL, key mapping rows, and model mapping rows before writes.
Redact upstream-api-key and upstream-api-keys in summaries.
Add fake-fetch tests for get/update/delete behavior and redaction.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- Amp settings can be viewed and edited through allmone.
- Amp upstream keys are never exposed in summaries.

## Prompt 6: Account Upstreams, Auth Files, And Login Handoffs

Goal: represent account-backed upstreams without implementing OAuth in allmone.

Prompt:

```text
Read docs/version/0.1.5/spec.md, v0.1.4 process controller, and CLIProxyAPI command flags.
Patch the allmone-managed CLIProxyAPI config so auth-dir points to ~/.allmone/runtime/auth, and create that directory through the runtime-home layer.
Add auth-file summary reads plus disable/delete operations through CLIProxyAPI Management API.
Add a ProviderLoginRunner that starts one-shot CLIProxyAPI commands with the allmone-managed binary and config path for --login, --antigravity-login, --claude-login, --codex-login, --codex-device-login, --kimi-login, and --vertex-import.
Use injected process, file-dialog, and shell/open adapters for tests.
Ensure login/import commands do not replace or stop the managed runtime process.
Expose safe progress and redacted failure state through IPC.
Add tests for command construction, no-browser/device-code options where supported, Vertex import path handling, auth-file redaction, and process failure redaction.
Run bun run test and bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- OAuth/account upstreams are visible in allmone.
- The allmone-managed runtime uses ~/.allmone/runtime/auth for token files.
- User-triggered login/import handoffs use CLIProxyAPI commands.
- Token file contents never cross IPC.

## Prompt 7: Upstream IPC, Preload, And Renderer UI

Goal: expose the complete provider setup workflow in the app UI.

Prompt:

```text
Read docs/version/0.1.5/spec.md, src/main/runtime/ipc.ts, src/preload/index.ts, and src/renderer/src/main.ts.
Add typed IPC handlers for provider catalog, upstream summaries, API-key upstream upsert/delete, local API key operations, Amp settings, auth-file operations, OAuth model controls, and login/import handoffs.
Validate every IPC payload before calling services.
Update preload and renderer global types.
Add a compact upstream setup surface that keeps the desktop control-plane style: local connection card, upstream catalog selector, provider form, redacted summaries, local key actions, Amp settings, and account-backed provider actions.
Keep existing runtime controls and provider editing intact during migration.
Do not add usage, logs, model inventory, local network sharing, raw YAML editing, or payload rule UI.
Run bun run typecheck.
Update docs/version/0.1.5/todo.md.
```

Acceptance:

- The renderer can configure every in-scope upstream family.
- Renderer state does not persist secrets durably.
- UI remains compact and usable at the existing minimum window size.

## Prompt 8: Verification And Docs

Goal: complete v0.1.5 safely.

Prompt:

```text
Review docs/version/0.1.5/spec.md against the implementation.
Run bun run test.
Run bun run typecheck.
Run bun run build.
Check the renderer for obvious text overflow at existing narrow widths.
Update docs/version/0.1.5/todo.md with completed items, verification results, and known gaps.
Update root docs/spec.md, docs/prompt_plan.md, docs/todo.md, and docs/version/README.md if the active version changes after v0.1.5 completion.
```

Acceptance:

- Verification commands pass or known failures are documented with exact causes.
- Root docs point to the correct next prompt.
- v0.1.5 acceptance criteria are checked off or explicitly deferred.
