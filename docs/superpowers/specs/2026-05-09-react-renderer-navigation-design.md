# React Renderer Navigation Design

Last updated: 2026-05-09

## Decision

Use方案 A: migrate the renderer to React with lightweight page state. Do not add a route library for v0.1.6.

## Goal

Create a maintainable renderer foundation before v0.2.0 by splitting the current manual DOM renderer into React components and introducing a stable sidebar information architecture.

## Version Placement

Insert v0.1.6 between v0.1.5 and v0.2.0.

- v0.1.5 remains complete.
- v0.1.6 becomes the active planned version.
- v0.2.0 Auth Management Surface remains next after v0.1.6.

## Information Architecture

Sidebar:

- Title: `Allmone`
- Items: `Providers`, `Settings`
- Default: `Providers`

Pages:

- `Providers`: contains the current Upstream Setup workflow.
- `Settings`: contains the current Managed CLIProxyAPI workflow.

OpenAI-compatible provider setup is not a separate top-level module. It is one upstream provider type inside `Providers`.

## Architecture

Use React and React DOM in the renderer only. Keep the existing Electron preload API and main-process IPC behavior.

`App` owns:

- Active sidebar section.
- App version.
- Runtime state.
- Config summary.
- Upstream catalog.
- Upstream summaries.
- Auth-file summaries.
- Local connection output.
- Busy action.
- Notice and error feedback.

`ProvidersPage` receives upstream state and action callbacks. `SettingsPage` receives runtime state and managed-runtime callbacks.

No renderer durable storage is introduced.

## Component Direction

Prefer small, focused files when extracting from the current large renderer:

- App shell and sidebar.
- Feedback/status display.
- Providers page.
- Settings page.
- Upstream setup pieces.
- Managed runtime pieces.

Keep the split pragmatic. Avoid a large abstraction pass that does not directly support the migration.

## Data And Secret Handling

The renderer continues to call `window.allmone`. The main process stays responsible for management credentials, upstream secrets, provider writes, login/import handoffs, and redaction.

React state may hold transient form values during the current page lifetime. It must not write secrets to localStorage, sessionStorage, IndexedDB, logs, DOM data attributes, or checked-in files.

## Non-Goals

- No v0.2.0 auth management.
- No usage/log/model inventory surface.
- No router.
- No main-process refactor.
- No CLIProxyAPI behavior changes.
- No API proxying, provider adapter, routing, payload rule, or response transformation code.

## Verification

Required:

```bash
bun run typecheck
bun run build
```

Optional when behavior changes justify it:

```bash
bun run test
```

Manual checks:

- Sidebar renders with `Allmone`, `Providers`, and `Settings`.
- `Providers` is default.
- `Providers` shows Upstream Setup and does not show a duplicate standalone OpenAI-compatible module.
- `Settings` shows Managed CLIProxyAPI.
- Current provider/runtime actions still call the existing preload methods.
