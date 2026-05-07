# allmone v0.1.1 Prompt Plan

Last updated: 2026-05-07
Status: Complete

This plan implements `docs/version/0.1.1/spec.md`.

## Operating Rule

Before starting:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read `docs/version/0.1.1/spec.md`.
4. Check `git status --short`.
5. Preserve user changes.

## Prompt 0: Test Harness Check

Goal: make sure the repo can run focused contract tests.

Prompt:

```text
Inspect package.json and the current TypeScript config.
If package.json has no test script, add "test": "bun test".
Do not add dependencies unless Bun's built-in test runner is insufficient.
Run bun run test and bun run typecheck.
Update docs/version/0.1.1/todo.md with the result.
```

Acceptance:

- `bun run test` is available.
- Empty or initial test run behavior is understood.
- `bun run typecheck` still passes.

## Prompt 1: Contract Types

Goal: define CLIProxyAPI Management API response types.

Prompt:

```text
Create src/main/cliproxyapi/types.ts.
Add types for client options, management check state, API key list, API key usage buckets, usage queue records, auth file records, OpenAI compatibility provider entries, latest version response, config response, and generic status response.
Represent unknown or provider-specific fields safely with Record<string, unknown>.
Do not model provider-specific request conversion or proxy behavior.
Add src/main/cliproxyapi/index.ts that exports the public contract types.
Run bun run typecheck.
Update docs/version/0.1.1/todo.md.
```

Acceptance:

- Types compile.
- Known fields from CLIProxyAPI docs are represented.
- Unknown provider fields remain possible.

## Prompt 2: Redaction And Error Mapping

Goal: protect secrets and normalize failure states before HTTP client work.

Prompt:

```text
Create src/main/cliproxyapi/redact.ts with helpers to redact API keys, management keys, and credentials embedded in URLs.
Create src/main/cliproxyapi/errors.ts with a CliProxyApiError class and a function that maps fetch/HTTP/parse failures into documented management states.
Add Bun tests covering short keys, long keys, bearer tokens, proxy URLs with userinfo, 404 management-disabled behavior, timeout, invalid JSON, and generic HTTP failures.
Run bun run test and bun run typecheck.
Update docs/version/0.1.1/todo.md.
```

Acceptance:

- Tests prove secrets are not echoed whole.
- 404 is mapped as `management_disabled` only for management check behavior.
- Error objects are useful for logs without exposing raw secrets.

## Prompt 3: Fetch Client

Goal: add the read-only CLIProxyAPI Management API client.

Prompt:

```text
Create src/main/cliproxyapi/client.ts.
Implement a fetch-based client that accepts baseUrl, managementKey, timeoutMs, and optional fetch implementation.
Default baseUrl to http://localhost:8317/v0/management.
Attach Authorization: Bearer <managementKey> when a key is present.
Implement getConfig, getLatestVersion, getUsageQueue, getUsageStatisticsEnabled, getApiKeys, getApiKeyUsage, getAuthFiles, getOpenAiCompatibilityProviders, and checkManagementApi.
Add Bun tests using an injected fake fetch. Cover URL joining, query params, auth header, successful responses, empty config, usage queue array responses, invalid JSON, non-2xx responses, timeout, and network failure.
Run bun run test and bun run typecheck.
Update docs/version/0.1.1/todo.md.
```

Acceptance:

- The client has no Electron or renderer dependency.
- Tests do not call a real network.
- Management key handling is internal to the client.

## Prompt 4: Version Completion Pass

Goal: close v0.1.1 cleanly.

Prompt:

```text
Review docs/version/0.1.1/spec.md against the implemented files.
Update docs/version/0.1.1/todo.md so completed items are checked and the next version points to v0.1.2.
Update docs/todo.md to point at the next active version after v0.1.1 is complete.
Run bun run test and bun run typecheck.
Summarize changed files and any known gaps.
```

Acceptance:

- v0.1.1 todo reflects reality.
- Root todo points to the correct next action.
- Tests and typecheck pass.

Completion notes:

- Completed on 2026-05-07.
- Prompt 0 through Prompt 4 were implemented in one development pass.
