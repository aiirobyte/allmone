# allmone v0.1.6 Prompt Plan

Last updated: 2026-05-09
Status: Planned

This plan implements `docs/version/0.1.6/spec.md`. Start only after v0.1.5 is complete.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read `docs/version/0.1.6/spec.md`.
4. Check `git status --short`.
5. Preserve user changes.
6. Do not change main-process CLIProxyAPI behavior unless required to preserve existing renderer behavior.
7. Do not move management credentials, upstream API keys, local API keys, proxy credentials, bearer tokens, token files, or sensitive headers into renderer durable storage.
8. Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.

## Prompt 0: React Renderer Foundation

Goal: install React and create the minimum renderer entry point.

Prompt:

```text
Read docs/version/0.1.6/spec.md, src/renderer/src/main.ts, src/renderer/index.html, package.json, and tsconfig.web.json.
Add React and React DOM dependencies with the matching type packages.
Change the renderer entry point to src/renderer/src/main.tsx.
Create a minimal App component that renders the current app shell placeholder through React.
Preserve the existing preload API and do not change main-process behavior.
Run bun run typecheck.
Update docs/version/0.1.6/todo.md.
```

Acceptance:

- React renderer boots from `main.tsx`.
- Typecheck passes.
- No runtime/upstream IPC contract changes are introduced.

## Prompt 1: App State And Shared UI Components

Goal: move the existing renderer state and common UI pieces into React.

Prompt:

```text
Read docs/version/0.1.6/spec.md and the current renderer main.ts.
Create focused renderer modules for app state types, HTML/string utilities that still apply, feedback display, status labels/classes, sidebar, and reusable copy/status rows.
Move the existing bootstrap, refresh, busy-action, notice, and error flow into React state.
Keep durable renderer storage free of secrets.
Run bun run typecheck.
Update docs/version/0.1.6/todo.md.
```

Acceptance:

- Existing app data loads through React state.
- Feedback and busy states still work.
- Secret-handling rules remain unchanged.

## Prompt 2: Providers Page

Goal: make `Providers` the default page and move upstream setup into it.

Prompt:

```text
Read docs/version/0.1.6/spec.md and current upstream setup renderer code.
Create a Providers page that contains the current Upstream Setup workflow: local service/key state, API-key upstream form, Amp settings, account-backed login handoffs, and redacted upstream summaries.
Make OpenAI-compatible provider setup available only through the upstream provider type selector.
Remove the duplicate standalone OpenAI-Compatible Providers top-level module from the rendered layout.
Preserve existing upstream actions and refresh behavior.
Run bun run typecheck.
Update docs/version/0.1.6/todo.md.
```

Acceptance:

- `Providers` is the default selected sidebar item.
- Upstream setup remains functional.
- There is no duplicate standalone OpenAI-compatible provider module.

## Prompt 3: Settings Page

Goal: move managed CLIProxyAPI controls into `Settings`.

Prompt:

```text
Read docs/version/0.1.6/spec.md and current managed runtime renderer code.
Create a Settings page that contains the Managed CLIProxyAPI surface: output port, install/retry, check update, start, restart, stop, runtime details, diagnostics, status grid, and service-origin copy.
Preserve managed runtime command behavior and polling while busy.
Run bun run typecheck.
Update docs/version/0.1.6/todo.md.
```

Acceptance:

- `Settings` shows the managed CLIProxyAPI module.
- Runtime commands and copy action behave as before.
- Busy polling still refreshes runtime state.

## Prompt 4: Layout, CSS, And Responsive Polish

Goal: finish the sidebar layout and keep the existing compact desktop feel.

Prompt:

```text
Read docs/version/0.1.6/spec.md and src/renderer/src/styles.css.
Update CSS for a two-column app shell with a compact sidebar and content area.
Keep cards at 8px radius or less, avoid nested cards, avoid marketing-style hero sections, and preserve readable dense control-plane layout.
Ensure controls and text do not overlap at narrow desktop/mobile widths.
Run bun run typecheck.
Update docs/version/0.1.6/todo.md.
```

Acceptance:

- Sidebar title is `Allmone`.
- Sidebar items are `Providers` and `Settings`.
- The layout remains usable at current narrow widths.

## Prompt 5: Verification And Docs

Goal: complete v0.1.6 safely.

Prompt:

```text
Review docs/version/0.1.6/spec.md against the implementation.
Run bun run typecheck.
Run bun run build.
Run bun run test only if implementation added or changed covered behavior.
Check the renderer for obvious layout overflow in Providers and Settings.
Update docs/version/0.1.6/todo.md with completed items, verification results, and known gaps.
Update root docs/spec.md, docs/prompt_plan.md, docs/todo.md, and docs/version/README.md if the active version changes after v0.1.6 completion.
```

Acceptance:

- Verification commands pass or known failures are documented with exact causes.
- Root docs point to the correct next prompt.
- v0.1.6 acceptance criteria are checked off or explicitly deferred.
