# allmone v0.1.3 Prompt Plan

Last updated: 2026-05-07
Status: Complete

This plan implements `docs/version/0.1.3/spec.md`.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read `docs/version/0.1.3/spec.md`.
4. Check `git status --short`.
5. Preserve user changes.
6. Do not call a real CLIProxyAPI service from tests.
7. Do not move management keys, provider API keys, proxy credentials, or sensitive headers into renderer storage.

## Prompt 0: Runtime Diagnostics Metadata

Goal: make connection test results more useful without widening the Management API contract.

Prompt:

```text
Read docs/version/0.1.3/spec.md and src/main/runtime/.
Add only the minimal optional fields needed on RuntimeState for connection diagnostics, such as lastCheckedAt and lastHttpStatus.
Update RuntimeService.testConnection so it records redacted lastError, status, and diagnostic metadata after each test.
Do not return plaintext management keys, provider API keys, proxy credentials, or sensitive headers.
Add or update tests for reachable, auth_required, management_disabled, timeout, invalid_response, and unexpected_error cases where practical.
Run bun run test and bun run typecheck.
Update docs/version/0.1.3/todo.md.
```

Acceptance:

- Runtime state remains small and serializable.
- Diagnostics do not introduce new upstream calls.
- Test failures include no full secrets.

## Prompt 1: Connection Panel Hardening

Goal: make every connection state understandable and actionable in the renderer.

Prompt:

```text
Read docs/version/0.1.3/spec.md and src/renderer/src/main.ts.
Update the connection area to show one short next action for each runtime status.
Show redacted diagnostic detail only when present.
Add safe copy helpers for the configured Management API URL and CLIProxyAPI service origin.
Use URL parsing for endpoint derivation; do not guess undocumented API paths.
Keep copy actions out of localStorage/sessionStorage and never copy secrets.
Run bun run typecheck.
Update docs/version/0.1.3/todo.md.
```

Acceptance:

- Users can copy safe endpoint values.
- Auth and unreachable states point to different next actions.
- Invalid URL handling is graceful.

## Prompt 2: Empty States And Refresh Flow

Goal: keep the app useful when config cannot load or providers do not exist yet.

Prompt:

```text
Improve renderer empty states for first launch, failed config summary load, and no providers.
Keep the text short and operational.
Disable provider writes when the runtime is not reachable if doing so avoids predictable failures.
Ensure Refresh retries config summary loading and clears stale errors/notices correctly.
Do not add tutorial, marketing, tray, auth management, usage, or model inventory UI.
Run bun run typecheck.
Update docs/version/0.1.3/todo.md.
```

Acceptance:

- Empty states have a direct next action.
- Config refresh does not leave misleading stale provider data.
- The app still starts on the operational screen.

## Prompt 3: Safer Provider Editing

Goal: reduce accidental destructive edits while preserving the existing simple provider workflow.

Prompt:

```text
Read src/renderer/src/main.ts and src/main/runtime/service.ts.
Make provider form mode explicit: new provider vs editing existing provider.
When editing, do not imply saved provider API keys are visible.
Only send a replacement provider API key when the user typed one.
If provider rename behavior is unclear, keep provider name stable while editing and treat rename as out of scope.
Add a delete confirmation before sending deleteOpenAiCompatibilityProvider.
Add focused tests only if runtime input behavior changes.
Run bun run test if main-process behavior changes; always run bun run typecheck.
Update docs/version/0.1.3/todo.md.
```

Acceptance:

- Existing provider edits do not accidentally expose secrets.
- Delete requires a deliberate confirmation.
- Name/identity behavior is clear in the UI.

## Prompt 4: Visual Pass And Build Verification

Goal: finish the hardening pass without broad redesign.

Prompt:

```text
Review src/renderer/src/styles.css against the updated renderer markup.
Keep the layout compact and desktop-control-plane oriented.
Check responsive behavior down to the existing 900px minimum window width and narrow browser widths.
Run bun run test.
Run bun run typecheck.
Run bun run build.
Update docs/version/0.1.3/todo.md with completed items, verification results, and any known gaps.
Update root docs/spec.md, docs/prompt_plan.md, docs/todo.md, and docs/version/README.md if the active version status changes.
```

Acceptance:

- The renderer has no obvious text overflow or incoherent overlap.
- Build verification passes.
- Docs accurately describe the next active prompt.
