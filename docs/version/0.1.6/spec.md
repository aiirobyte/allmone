# allmone v0.1.6 Spec

Last updated: 2026-05-09
Status: Planned

## Version Goal

Migrate the renderer to React and reorganize the desktop surface around a simple sidebar: `Providers` for upstream setup and `Settings` for the managed CLIProxyAPI runtime controls.

## Why This Version Exists

v0.1.5 added a practical upstream setup workflow, but the renderer is still a single large TypeScript file that manually builds DOM strings. That made the first GUI workable, but it is now too dense for the next product surfaces.

v0.1.6 creates a maintainable React renderer before adding larger v0.2.0 auth management features. It also resolves the current duplicate provider layout: OpenAI-compatible providers are one upstream family, so they should live inside the `Providers` surface instead of being repeated as a standalone module.

## Scope

### In Scope

- Add React and React DOM to the renderer.
- Change the renderer entry point from `main.ts` to `main.tsx`.
- Preserve the existing preload and IPC contracts.
- Split the renderer into focused React components for:
  - App shell and sidebar navigation.
  - `Providers` page.
  - `Settings` page.
  - Managed CLIProxyAPI runtime controls.
  - Upstream setup, local connection, API-key upstreams, Amp, and account-backed login handoffs.
  - Feedback, status, copy rows, summaries, and provider form pieces as needed.
- Add a sidebar with:
  - Title: `Allmone`
  - Items: `Providers`, `Settings`
- Make `Providers` the default view.
- Move the current `Upstream Setup` surface into `Providers`.
- Remove the duplicate standalone `OpenAI-Compatible Providers` module from the top-level layout.
- Keep OpenAI-compatible provider setup available as part of upstream setup.
- Move the current `Managed CLIProxyAPI` surface into `Settings`.
- Keep secrets out of renderer durable storage.
- Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- Run `bun run typecheck` and `bun run build`.
- Update root docs and this version todo after implementation.

### Out Of Scope

- No auth management surface. That remains v0.2.0.
- No model inventory, usage dashboard, request logs, queue view, cost estimates, local network sharing, or raw YAML editor.
- No new CLIProxyAPI Management API behavior.
- No route library unless the renderer grows beyond the two planned sections.
- No redesign of main-process runtime, upstream service, or IPC behavior.
- No migration of secrets into React state beyond transient form values already needed for submission.

## User Experience

The app opens into a two-column desktop control-plane layout.

The left sidebar is stable and compact:

- `Allmone` appears as the sidebar title.
- `Providers` is selected by default.
- `Settings` is the second navigation item.

The `Providers` page contains the upstream setup workflow:

- Local service and local client key state.
- API-key upstream form.
- Amp configuration.
- Account/OAuth/import-backed upstream login handoffs.
- Redacted upstream summaries.

The old top-level `OpenAI-Compatible Providers` module is removed. OpenAI-compatible remains available through the upstream provider type selector and redacted summaries.

The `Settings` page contains the managed CLIProxyAPI controls:

- Output port.
- Install/retry and update check.
- Start, restart, and stop.
- Runtime status, diagnostics, service origin, executable path, release metadata, and copyable service origin.

## Architecture

Use a light React renderer without a router. A top-level `App` component owns the active section state:

```text
Providers | Settings
```

The renderer keeps using `window.allmone` from preload. Data loading and command handlers stay in renderer land, but the UI should be split into components so future surfaces can be added without growing one large file.

Suggested renderer structure:

```text
src/renderer/src/
  main.tsx
  App.tsx
  appState.ts
  rendererTypes.ts
  components/
    Feedback.tsx
    Sidebar.tsx
    Status.tsx
  pages/
    ProvidersPage.tsx
    SettingsPage.tsx
  providers/
    UpstreamSetup.tsx
    LocalConnectionCard.tsx
    ApiKeyUpstreamForm.tsx
    AmpForm.tsx
    AccountUpstreamList.tsx
    UpstreamSummaryList.tsx
  settings/
    ManagedRuntimePanel.tsx
    RuntimeStatusPanel.tsx
```

This structure is guidance, not a mandate. Keep the split smaller if implementation shows a simpler boundary.

## Data Flow

1. `App` loads app version and runtime state through `window.allmone`.
2. If the Management API is reachable, `App` loads config summary, upstream catalog, upstream summaries, auth files, and local connection output.
3. `ProvidersPage` receives upstream data and action callbacks from `App`.
4. `SettingsPage` receives runtime data and managed-runtime callbacks from `App`.
5. User actions call existing preload methods.
6. After writes, `App` refreshes the relevant runtime or upstream state.

The main process remains the source of truth for runtime and upstream behavior.

## Error Handling

- Renderer command failures show the existing redacted error message.
- Runtime busy states disable only the relevant action.
- If the Management API is unreachable, `Providers` shows the existing unavailable/empty states and disables writes.
- If upstream loading fails, the failure is shown as config/upstream feedback without exposing secrets.
- React state must not be persisted to localStorage, sessionStorage, IndexedDB, DOM data attributes, or logs.

## Testing

v0.1.6 should favor compile/build verification and small pure helper tests only where they reduce risk.

Required verification:

```bash
bun run typecheck
bun run build
```

Optional verification when touched behavior justifies it:

```bash
bun run test
```

Manual/visual checks:

- Sidebar appears with `Allmone`, `Providers`, and `Settings`.
- `Providers` is default.
- `Providers` shows upstream setup and no duplicate top-level OpenAI-compatible module.
- `Settings` shows managed CLIProxyAPI controls.
- Text and controls fit at the current minimum desktop width.

## Acceptance

- `docs/version/0.1.6/` contains this spec, a prompt plan, and a todo file.
- Root docs point to v0.1.6 as the active version and keep v0.2.0 as the next auth-management version.
- Renderer uses React.
- Sidebar navigation works without adding a routing library.
- `Providers` owns upstream setup, including OpenAI-compatible provider setup as a provider type.
- `Settings` owns Managed CLIProxyAPI.
- Existing runtime and upstream IPC behavior is preserved.
- `bun run typecheck` passes.
- `bun run build` passes.
