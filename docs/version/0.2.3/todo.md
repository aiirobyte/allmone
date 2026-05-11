# allmone v0.2.3 Todo

Last updated: 2026-05-11
Status: Complete

## Version Target

Target: v0.2.3 Provider output model definition.

Definition of done:

- [x] Create `docs/version/0.2.3/spec.md`.
- [x] Create `docs/version/0.2.3/prompt_plan.md`.
- [x] Create `docs/version/0.2.3/todo.md`.
- [x] Define Provider id validation: non-empty and `^[A-Za-z0-9_]+$`.
- [x] Enforce Provider id uniqueness across API-key and OpenAI-compatible Provider entries.
- [x] Decide and implement Provider id persistence for API-key/OpenAI-compatible entries.
- [x] Generate API-key Provider aliases as `<provider_id>-<raw_model_id>`.
- [x] Generate OpenAI-compatible Provider aliases as `<provider_id>-<raw_model_id>`.
- [x] Set `fork: true` on all allmone-generated API-key/OpenAI-compatible model aliases.
- [x] Preserve raw upstream model IDs exactly in `name`.
- [x] Preserve Provider secrets, headers, base URL, disabled state, proxy URL, excluded models, and unknown fields.
- [x] Skip allmone alias generation for OAuth/auth-file Providers.
- [x] Keep OAuth/auth-file Provider alias behavior delegated to CLIProxyAPI.
- [x] Add Provider id controls to API-key Provider create/edit flows.
- [x] Add Provider id controls to OpenAI-compatible Provider create/edit flows.
- [x] Add renderer and IPC validation for invalid/duplicate Provider ids.
- [x] Show generated alias and raw shared model ID in `Models` when `fork: true` applies.
- [x] Add same-raw-model regressions for multiple Providers.
- [x] Keep allmone free of routing, load balancing, provider adapters, payload rules, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after Prompt 0 implementation.
- [x] Update root docs after Prompt 1 implementation.
- [x] Update root docs after Prompt 2 implementation.
- [x] Update root docs after Prompt 3 implementation.
- [x] Update root docs after v0.2.3 completion.

## Next Prompt

v0.2.3 complete. Next version: v0.3.0 Model Resource Inventory planning.

Expected next change:

- Create `docs/version/0.3.0/{spec.md,prompt_plan.md,todo.md}` before starting v0.3.0 implementation.

## Guardrails

- Do not generate aliases for OAuth/auth-file Providers.
- Do not require Provider id for OAuth/auth-file Providers.
- Do not use merged CLIProxyAPI `/v1/models` output as Provider-scoped candidates.
- Do not silently normalize invalid Provider ids.
- Do not expose provider API keys, auth-file contents, management keys, bearer tokens, or local output key plaintext to renderer state.
- Do not implement routing, load balancing, provider adapters, payload rules, or request/response transformation in allmone.
- Keep v0.3.0 model resource inventory out of this version.

## Planning Notes

- 2026-05-11: User clarified that all API-key/OpenAI-compatible Provider models should be written to CLIProxyAPI config with `name: <raw_model_id>`, `alias: <provider_id>-<raw_model_id>`, and `fork: true`.
- 2026-05-11: User clarified Provider id is user-entered, must support only letters, digits, and underscores, and should form the first segment of generated aliases.
- 2026-05-11: User clarified OAuth/auth-file Providers do not need allmone-generated aliases and should use CLIProxyAPI built-in rules.
- 2026-05-11: v0.2.3 completed. API-key/OpenAI-compatible Providers now require Provider ids, persist them in allmone config sidecar records, generate `<provider_id>-<raw_model_id>` aliases with `fork: true`, skip OAuth/auth-file alias injection, and hand root docs back to v0.3.0 planning.
- 2026-05-11: Fixed Provider id persistence after real CLIProxyAPI writes dropped unknown `allmone` metadata. allmone now saves Provider ids in `~/.allmone/config.yaml` and overlays them onto Provider summaries/configs for edit forms and alias sync.
- Update this file after every meaningful coding session.
