# allmone v0.1.5 Todo

Last updated: 2026-05-08
Status: Planned

## Version Target

Target: v0.1.5 Real Local Proxy Setup And Full CLIProxyAPI Upstream Catalog.

Definition of done:

- [x] Create `docs/version/0.1.5/spec.md`.
- [x] Create `docs/version/0.1.5/prompt_plan.md`.
- [x] Create `docs/version/0.1.5/todo.md`.
- [x] Finish v0.1.4 before implementation starts.
- [ ] Add upstream provider catalog for every current CLIProxyAPI upstream family.
- [ ] Add typed Management API client support for local api-keys.
- [ ] Add typed Management API client support for Gemini API key upstreams.
- [ ] Add typed Management API client support for Codex API key upstreams.
- [ ] Add typed Management API client support for Claude API key upstreams.
- [ ] Add typed Management API client support for OpenAI-compatible upstreams.
- [ ] Add typed Management API client support for Vertex API key upstreams.
- [ ] Add typed Management API client support for Amp integration.
- [ ] Add typed Management API client support for auth-file summaries and safe auth-file actions.
- [ ] Add typed Management API client support for OAuth model aliases and excluded models.
- [ ] Add secret-safe upstream summaries.
- [ ] Add API-key upstream create/edit/delete flows.
- [ ] Add local client API key set/generate/delete/copy flow.
- [ ] Add copyable local API base output.
- [ ] Add Amp integration UI and service flow.
- [ ] Add account/OAuth/imported upstream visibility.
- [ ] Add and use `~/.allmone/runtime/auth` as the managed CLIProxyAPI auth directory.
- [ ] Add CLIProxyAPI login/import handoffs for supported account-backed upstreams.
- [ ] Keep secrets out of renderer localStorage/sessionStorage/IndexedDB/logs/DOM data attributes.
- [ ] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [ ] Run `bun run test`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Update root docs after implementation completion.

## Next Prompt

Do not start v0.1.5 implementation until v0.1.4 is complete.

After v0.1.4 completion, start v0.1.5 Prompt 0 from `docs/version/0.1.5/prompt_plan.md`.

Expected first change:

- Add the complete provider catalog and upstream types.

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
- For the allmone-managed runtime, keep OAuth token files under `~/.allmone/runtime/auth`.
- Login/import handoffs must be explicit user actions.
- One-shot login/import child processes must not replace the managed runtime child process.

## Planning Notes

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
