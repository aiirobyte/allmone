# allmone v0.2.2 Todo

Last updated: 2026-05-11
Status: Complete

## Version Target

Target: v0.2.2 Provider model alias sync.

Definition of done:

- [x] Create `docs/version/0.2.2/spec.md`.
- [x] Create `docs/version/0.2.2/prompt_plan.md`.
- [x] Create `docs/version/0.2.2/todo.md`.
- [x] Define the effective model ID contract for Provider alias rows.
- [x] Treat missing Provider aliases as identity aliases.
- [x] Preserve explicit user aliases.
- [x] Preserve `fork: true` semantics when showing final model IDs.
- [x] Add main-process Provider alias sync for API-key upstream entries.
- [x] Add main-process Provider alias sync for OpenAI-compatible Providers.
- [x] Add main-process OpenAI-compatible upstream `/models` discovery fallback when CLIProxyAPI cannot provide Provider-scoped discovery.
- [x] Add account/OAuth alias map sync where CLIProxyAPI supports it.
- [x] Keep model lists nested under Provider rows.
- [x] Keep the `Models` refresh button and make it sync aliases before display.
- [x] Show final exposed model IDs rather than raw ownership-filtered `/models` rows.
- [x] Do not use `provider`, `source`, `channel`, or `owned_by` for Provider membership.
- [x] Do not use merged `/v1/models` output to populate API-key/OpenAI-compatible Provider rows.
- [x] Preserve provider secrets and unknown CLIProxyAPI config fields during alias writes.
- [x] Show safe sync-unavailable or empty states when Provider-scoped candidates are unavailable after all allowed discovery paths fail.
- [x] Add MIMO/Codex regressions proving each Provider shows its own final alias list.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, non-OpenAI-compatible direct upstream Provider model calls, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after Prompt 0 implementation.
- [x] Update root docs after Prompt 1 implementation.
- [x] Update root docs after Prompt 2 implementation.
- [x] Update root docs after Prompt 3 implementation.
- [x] Update root docs after v0.2.2 completion.

## Next Prompt

v0.2.2 implementation is complete. Start v0.2.3 Provider output model definition next.

Expected next change:

- Continue from `docs/version/0.2.3/prompt_plan.md`.

## Guardrails

- Do not infer Provider membership from model response metadata.
- Do not add a model ownership entity.
- Do not call upstream Provider `/models` endpoints directly from allmone except the explicit OpenAI-compatible fallback required by v0.2.2.
- Do not use merged CLIProxyAPI `/v1/models` output as Provider-scoped candidates.
- Do not overwrite user-defined aliases with identity aliases.
- Do not leak provider API keys, auth-file contents, management keys, bearer tokens, or local output key plaintext to renderer state.
- Do not implement non-OpenAI-compatible upstream discovery fallbacks.
- Keep Provider add/delete/login/import/edit workflows in `Providers`.

## Planning Notes

- 2026-05-11: User clarified that model display should not come from ownership fields. Any Provider's upstream models without explicit aliases should be configured as identity aliases, and explicit aliases should affect the final model ID list exposed through CLIProxyAPI.
- 2026-05-11: v0.2.2 planning files created to insert this narrower alias-sync fix before the broader v0.3.0 model resource inventory.
- 2026-05-11: User clarified that Provider rows should start from each Provider's original upstream model list, then show the CLIProxyAPI-exposed list after alias config. CLIProxyAPI remains preferred for discovery, but OpenAI-compatible Providers must use a main-process upstream `/models` fallback when CLIProxyAPI cannot provide Provider-scoped discovery.
- 2026-05-11: v0.2.2 completed implementation with Provider alias sync, OpenAI-compatible `/models` fallback, account/OAuth alias sync, sync-unavailable renderer state, and MIMO/Codex plus secret-boundary regressions.
- 2026-05-11: v0.2.3 was inserted before v0.3.0 to define API-key/OpenAI-compatible Provider output aliases and leave OAuth/auth-file aliases to CLIProxyAPI built-in rules.
- Update this file after every meaningful coding session.
