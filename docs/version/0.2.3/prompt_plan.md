# allmone v0.2.3 Prompt Plan

Last updated: 2026-05-11
Status: Complete

## Version Target

Implement Provider output model definition for API-key and OpenAI-compatible Providers. allmone should generate CLIProxyAPI model alias rows in the form `{ name: rawModelId, alias: "<provider_id>-<raw_model_id>", fork: true }`. OAuth/auth-file Providers should not receive allmone-generated aliases; they continue to use CLIProxyAPI built-in rules.

## Prompts

### Prompt 0: Provider Id Contract

Status: Complete

Goal: Define and test the Provider id contract before changing alias generation.

Expected next change:

1. Add failing tests for Provider id validation: non-empty, `^[A-Za-z0-9_]+$`, no spaces, no hyphens, no slashes.
2. Add failing tests for uniqueness across API-key and OpenAI-compatible Provider entries.
3. Define where Provider id is stored for API-key and OpenAI-compatible entries.
4. Prefer a CLIProxyAPI-preserved allmone metadata field only if tests prove it survives current Management API writes.
5. Fall back to allmone config sidecar storage if CLIProxyAPI does not reliably preserve the field.
6. Add renderer-safe types for Provider id in summaries and inputs.
7. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not add Provider id requirements to OAuth/auth-file Providers.
- Do not silently rewrite invalid Provider ids.
- Do not expose raw provider secrets while testing persistence.

### Prompt 1: Generated Alias Contract

Status: Complete

Goal: Replace API-key/OpenAI-compatible identity alias sync with generated Provider-specific aliases.

Expected next change:

1. Add failing tests for API-key alias generation: `alias === "<provider_id>-<raw_model_id>"`.
2. Add failing tests for OpenAI-compatible alias generation with upstream `/models` fallback.
3. Add failing tests proving `fork: true` is set on all allmone-generated alias rows.
4. Add tests that raw model IDs are preserved exactly in `name`, including `/`, `.`, `:`, and `-`.
5. Migrate existing identity aliases once Provider id is available.
6. Preserve user rows and unknown CLIProxyAPI config fields where they do not conflict with the generated contract.
7. Verify with focused tests and `bun run typecheck`.

Guardrails:

- Do not generate aliases for OAuth/auth-file Providers.
- Do not call merged `/v1/models` to decide Provider membership.
- Do not implement routing or load balancing in allmone.

### Prompt 2: Provider UI And IPC

Status: Complete

Goal: Add Provider id controls to API-key/OpenAI-compatible create and edit flows.

Expected next change:

1. Add main-process IPC validation for Provider id in create/edit payloads.
2. Add Provider id input controls to API-key Provider create/edit forms.
3. Add Provider id input controls to OpenAI-compatible Provider create/edit forms.
4. Show validation errors for invalid or duplicate Provider ids.
5. Refresh Provider and Models state after Provider id changes regenerate aliases.
6. Add renderer tests for valid saves, invalid format, duplicate id, and no OAuth/auth-file Provider id prompt.
7. Verify with focused tests, `bun run test`, and `bun run typecheck`.

Guardrails:

- Keep OAuth/auth-file Provider UI free of allmone alias controls.
- Keep Provider id separate from display labels and provider names.
- Do not ask the renderer to hold raw provider API keys while editing Provider id.

### Prompt 3: Regression, Docs, And Version Handoff

Status: Complete

Goal: Close v0.2.3 with regressions, full verification, and the v0.3.0 handoff.

Expected next change:

1. Add regression tests for two Providers exposing the same raw model ID.
2. Prove generated aliases enable specific calls while `fork: true` keeps the raw shared ID visible.
3. Prove OAuth/auth-file Providers are skipped by allmone alias generation.
4. Prove secret boundaries for provider API keys, auth-file contents, local output keys, and management keys.
5. Update `docs/version/0.2.3/todo.md` as prompts complete.
6. Update root docs and `docs/version/README.md` when v0.2.3 is complete, then return the roadmap to v0.3.0 planning.
7. Verify with `bun run test`, `bun run typecheck`, and `bun run build`.

Guardrails:

- Keep allmone inside the desktop control plane boundary.
- Treat CLIProxyAPI as the owner of routing, output model list generation, and load balancing.
- Do not broaden this version into deeper model resource inventory.

## Completion Checklist

- [x] Provider id contract and persistence.
- [x] Provider id validation and uniqueness.
- [x] Generated alias contract for API-key Providers.
- [x] Generated alias contract for OpenAI-compatible Providers.
- [x] `fork: true` on all allmone-generated API-key/OpenAI-compatible aliases.
- [x] OAuth/auth-file Providers skipped by allmone alias generation.
- [x] Provider id UI and IPC validation.
- [x] Same-raw-model duplicate Provider regressions.
- [x] Secret-boundary regressions.
- [x] Root docs updated for v0.2.3 completion and v0.3.0 handoff.
- [x] `bun run test`.
- [x] `bun run typecheck`.
- [x] `bun run build`.
