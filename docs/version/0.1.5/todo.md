# allmone v0.1.5 Todo

Last updated: 2026-05-08
Status: Complete

## Version Target

Target: v0.1.5 Real Local Proxy Setup And Full CLIProxyAPI Upstream Catalog.

Definition of done:

- [x] Create `docs/version/0.1.5/spec.md`.
- [x] Create `docs/version/0.1.5/prompt_plan.md`.
- [x] Create `docs/version/0.1.5/todo.md`.
- [x] Finish v0.1.4 before implementation starts.
- [x] Add upstream provider catalog for every current CLIProxyAPI upstream family.
- [x] Add typed Management API client support for local api-keys.
- [x] Add typed Management API client support for Gemini API key upstreams.
- [x] Add typed Management API client support for Codex API key upstreams.
- [x] Add typed Management API client support for Claude API key upstreams.
- [x] Add typed Management API client support for OpenAI-compatible upstreams.
- [x] Add typed Management API client support for Vertex API key upstreams.
- [x] Add typed Management API client support for Amp integration.
- [x] Add typed Management API client support for auth-file summaries and safe auth-file actions.
- [x] Add typed Management API client support for OAuth model aliases and excluded models.
- [x] Add secret-safe upstream summaries.
- [x] Add API-key upstream create/edit/delete flows.
- [x] Add local client API key set/generate/delete/copy flow.
- [x] Add copyable local API base output.
- [x] Add Amp integration UI and service flow.
- [x] Add account/OAuth/imported upstream visibility.
- [x] Add and use `~/.allmone/runtime/cli-proxy-api/auth` as the managed CLIProxyAPI auth directory.
- [x] Add CLIProxyAPI login/import handoffs for supported account-backed upstreams.
- [x] Keep secrets out of renderer localStorage/sessionStorage/IndexedDB/logs/DOM data attributes.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after implementation completion.

## Next Prompt

v0.1.5 implementation is complete.

Expected next change:

- Start v0.2.0 planning for Auth Management Surface.

## Guardrails

- v0.1.5 builds on the allmone-managed CLIProxyAPI runtime from v0.1.4.
- Do not implement provider protocol parsing or proxying inside allmone.
- Do not call provider APIs from allmone tests.
- Do not call a real CLIProxyAPI service from tests.
- Do not expose plaintext upstream API keys, local API keys, management keys, proxy credentials, bearer tokens, sensitive headers, or token file contents over IPC summaries.
- Do not store secrets in renderer durable state.
- Do not raw-edit YAML with string replacement for provider configuration.
- Prefer CLIProxyAPI Management API writes. If an endpoint is missing, mark the operation unsupported rather than inventing allmone behavior.
- Preserve unknown CLIProxyAPI config fields.
- For the allmone-managed runtime, keep OAuth token files under `~/.allmone/runtime/cli-proxy-api/auth`.
- Login/import handoffs must be explicit user actions.
- One-shot login/import child processes must not replace the managed runtime child process.

## Planning Notes

- 2026-05-08: Renderer Connection module was removed; Management API Test now lives inside Managed CLIProxyAPI. Management URL and timeout come from `~/.allmone/config.yaml`; the management key stays main-process-only.
- 2026-05-08: Encrypted Management API credential storage is `~/.allmone/runtime/cli-proxy-api/management-key.json`; old `runtime-settings.json` files are deleted without migration.
- 2026-05-08: CLIProxyAPI-managed runtime files now live under `~/.allmone/runtime/cli-proxy-api/`, leaving `~/.allmone/runtime/` as the parent for future third-party runtimes.
- 2026-05-08: `~/.allmone/config.yaml` stores CLIProxyAPI runtime settings under `cliproxyapi.runtime`; the old top-level `runtime` block is not supported.
- 2026-05-08: Startup install check now adopts an existing managed CLIProxyAPI executable without fetching release metadata; manual Check Update remains the network update path.
- 2026-05-08: Auto-start now enters `starting` immediately during install validation and only shows `installing` when the managed executable is missing.
- 2026-05-08: OpenAI-compatible provider creation now appends through CLIProxyAPI `GET` + `PUT`; existing providers still update through `PATCH`.
- Planning created on 2026-05-08.
- User requested all current CLIProxyAPI upstreams, not only OpenAI-compatible and Anthropic.
- Current official CLIProxyAPI sources checked during planning:
  - `config.example.yaml` on `main`
  - README on `main`
  - Management API docs
  - Configuration options docs
- API-key/configured upstreams in scope: local `api-keys`, `gemini-api-key`, `codex-api-key`, `claude-api-key`, `openai-compatibility`, `vertex-api-key`, and `ampcode`.
- Account/OAuth/imported upstreams in scope for visibility and login/import handoff: `gemini-cli`, `aistudio`, `antigravity`, `claude`, `codex`, `kimi`, and `vertex`.
- Older localized docs mention Qwen/iFlow, but current `main` config and command flags checked on 2026-05-08 do not include them as current v0.1.5 catalog entries.
- 2026-05-08: Prompt 0 completed. Added data-only upstream catalog/types under `src/main/upstreams/`, covering all v0.1.5 provider kinds with section/channel metadata, editable fields, secret fields, redaction notes, and no provider protocol/proxying behavior. Verified with `bun run test` and `bun run typecheck`.
- 2026-05-08: Prompt 1 completed. Extended `CliProxyApiClient` typed methods for local `api-keys`, Gemini/Codex/Claude/Vertex API-key sections, Amp config, auth-file deletion, OAuth model aliases, and OAuth excluded models. Existing OpenAI-compatible methods remain in place. Verified with `bun run test` and `bun run typecheck`.
- 2026-05-08: Prompts 2-8 completed. Added `UpstreamService`, API-key CRUD with unknown-field preservation, local API key generation/set/delete and connection output, Amp validation/reset, auth-dir creation, provider login/import runner, upstream IPC/preload bindings, compact renderer upstream setup UI, and final verification. `bun run test`, `bun run typecheck`, and `bun run build` passed. Browser plugin runner was not available through tool discovery, so visual browser verification was not performed.
