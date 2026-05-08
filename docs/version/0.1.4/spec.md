# allmone v0.1.4 Spec

Last updated: 2026-05-07
Status: Complete

## Version Goal

Make allmone the local owner of the CLIProxyAPI runtime: create and use `~/.allmone`, keep non-secret software configuration in YAML, download/update the official CLIProxyAPI executable into that directory, launch/restart/shutdown the managed process, own the output API port, and expose a tray menu for daily control.

## Why This Version Exists

v0.1.2 and v0.1.3 assumed the user already had CLIProxyAPI running. That made the first GUI useful, but left the daily desktop workflow incomplete: allmone could configure a runtime but could not install, start, stop, or summarize it from the tray.

v0.1.4 should close that gap without broadening into auth, model inventory, usage views, or API proxy implementation. CLIProxyAPI still owns all proxying, provider conversion, routing, OpenAI-compatible output, runtime logs, queueing, and auth enforcement. allmone owns local installation, process lifecycle, config file placement, port selection, and desktop controls around that runtime.

## Source Context

Use current official CLIProxyAPI sources during implementation:

- CLIProxyAPI repository: `https://github.com/router-for-me/CLIProxyAPI`
- Latest release page: `https://github.com/router-for-me/CLIProxyAPI/releases/latest`
- Latest release API: `https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest`
- GoReleaser asset naming config: `https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/.goreleaser.yml`
- Management API docs: `https://help.router-for.me/management/api`
- Configuration options: `https://help.router-for.me/configuration/options`
- Quick start: `https://help.router-for.me/introduction/quick-start`

The implementation must use official release metadata at runtime and should not hard-code a single release version in source. GitHub API failures must not prevent launching an already-installed binary.

## Baseline From v0.1.3

Implemented files that matter for this version:

- `src/main/cliproxyapi/`: typed Management API client, status mapping, write methods, and redaction helpers.
- `src/main/runtime/settingsStore.ts`: main-process settings persistence with `safeStorage` fallback.
- `src/main/runtime/service.ts`: runtime state, connection test, sanitized config summary, and provider writes.
- `src/main/runtime/ipc.ts`: narrow typed IPC handlers.
- `src/preload/index.ts`: `window.allmone.runtime` bridge.
- `src/main/index.ts`: Electron startup and main window lifecycle.
- `src/renderer/src/main.ts`: framework-free connection/provider screen.

Existing constraints still apply:

- Management keys, provider API keys, proxy credentials, sensitive headers, and generated runtime passwords must not cross IPC responses in plaintext.
- Renderer code must not store secrets in `localStorage`, `sessionStorage`, IndexedDB, logs, DOM data attributes, or durable client-side state.
- Tests must not call a real CLIProxyAPI service or perform real GitHub downloads.

## Runtime Home

allmone owns a single local runtime home:

```text
~/.allmone/
  config.yaml
  runtime/
    bin/
      cli-proxy-api
      cli-proxy-api.exe
    config.yaml
    downloads/
    install.json
    logs/
    tmp/
```

Rules:

- Resolve `~/.allmone` from the user home directory, not Electron `userData`.
- Create the directory on startup when missing.
- Store non-secret allmone software settings in `~/.allmone/config.yaml`.
- Keep allmone-managed CLIProxyAPI files under this directory.
- Keep downloads temporary until checksum verification and extraction succeed.
- Store install metadata separately from secrets.
- Continue using Electron `safeStorage` for generated management credentials where encryption is available.
- If old v0.1.2/v0.1.3 settings exist under Electron `userData`, delete the old runtime settings file without migrating values.

## Software Config

The allmone software config is a YAML file at `~/.allmone/config.yaml`. It is the source of truth for non-secret local runtime settings.

Initial shape:

```yaml
version: 1
cliproxyapi:
  releaseMetadataUrl: https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest
  releasePageUrl: https://github.com/router-for-me/CLIProxyAPI/releases/latest
  localExecutablePath: ~/.allmone/runtime/bin/cli-proxy-api
runtime:
  host: 127.0.0.1
  port: 8317
  configPath: ~/.allmone/runtime/config.yaml
  apiBaseUrl: http://127.0.0.1:8317/v1
  managementBaseUrl: http://127.0.0.1:8317/v0/management
```

Rules:

- Do not store Management API credentials, provider API keys, proxy credentials, sensitive headers, or generated runtime passwords in `config.yaml`.
- Use a structured YAML parser for reads and writes.
- Validate `version`, `cliproxyapi.releaseMetadataUrl`, `cliproxyapi.releasePageUrl`, `cliproxyapi.localExecutablePath`, `runtime.host`, `runtime.port`, and `runtime.configPath` before use.
- Default `releaseMetadataUrl` and `releasePageUrl` to the official CLIProxyAPI locations.
- For v0.1.4, `localExecutablePath` must resolve under `~/.allmone/runtime/bin/`; do not use it to take over external system installs.
- Store configured values in YAML; derived URLs may be cached but must be recomputed when `host` or `port` changes.

## Scope

### In Scope

- Add a main-process runtime-home resolver for `~/.allmone`.
- Add an allmone software config store for `~/.allmone/config.yaml`.
- Store CLIProxyAPI release metadata URL, release page URL, local executable path, runtime host, runtime port, runtime config path, and safe derived API URLs in the software config.
- Store install metadata at `~/.allmone/runtime/install.json`.
- Discover the managed CLIProxyAPI executable by checking the configured local executable path under `~/.allmone/runtime/bin/` and install metadata.
- Download from the configured official CLIProxyAPI release metadata URL when no managed executable exists.
- Check official latest release metadata on startup and download an update when a newer release is available.
- Select the release asset for the current platform and CPU architecture.
- Verify release downloads using the official checksum asset when available.
- Extract the executable into `~/.allmone/runtime/bin/` and make it executable on Unix-like platforms.
- Generate an allmone-owned CLIProxyAPI config at `~/.allmone/runtime/config.yaml`.
- Preserve CLIProxyAPI-managed config sections when allmone updates only its owned fields.
- Manage these allmone-owned config fields:
  - service host, default `127.0.0.1`
  - service output port, default `8317`
  - log/output directories under `~/.allmone/runtime/`
  - local management enablement needed for allmone to call Management API
- Generate and store the Management API credential in main process only.
- Pass the generated credential to the managed CLIProxyAPI process without exposing it to renderer state.
- Derive and save:
  - Management API base URL: `http://127.0.0.1:<port>/v0/management`
  - OpenAI-compatible API base: `http://127.0.0.1:<port>/v1`
- Launch, restart, and shutdown the allmone-managed CLIProxyAPI child process.
- Track install/update/process state in main process and expose a sanitized state through IPC.
- Add a tray menu with:
  - current runtime status
  - current API base and port
  - open main window
  - copy API base
  - start CLIProxyAPI
  - restart CLIProxyAPI
  - stop CLIProxyAPI
  - check for update
  - quit allmone
- Keep the existing renderer framework-free and add compact controls for:
  - install/update status
  - binary version/installed path summary
  - API output port
  - API base copy action
  - start/restart/stop
- Add focused tests for path resolution, software config defaults/validation, release asset matching, checksum handling, config writes, process state transitions, IPC validation, and tray menu command wiring.
- Run `bun run test`, `bun run typecheck`, and `bun run build`.
- Update root docs and this version todo after implementation.

### Out Of Scope

- No PATH, Homebrew, systemd, launchd, Windows service, or existing external CLIProxyAPI process takeover.
- No privileged installer or system-wide binary installation.
- No auto-start-on-login.
- No rollback UI beyond keeping a working installed binary when a download/update fails.
- No OAuth login flows, auth-file management, or client API key management UI.
- No full model inventory.
- No request logs, usage charts, queue views, or usage estimates.
- No local network sharing controls beyond binding the managed runtime to localhost.
- No payload rule management or raw YAML editor.
- No provider protocol parsing, API proxying, request routing, or request/response conversion inside allmone.
- No broad renderer framework migration.

## User Workflows

### First Launch With No Runtime

The user opens allmone. The app creates `~/.allmone`, writes the default `config.yaml` if missing, checks the configured official CLIProxyAPI release metadata URL, downloads the matching executable to the configured managed path, verifies it, writes an initial CLIProxyAPI config, and starts the managed process.

If download fails, the app remains usable enough to show:

- the failed phase
- a redacted error
- retry update/install
- the runtime home path

No secrets should be shown.

### Launch Existing Managed Runtime

If a managed executable already exists under `~/.allmone/runtime/bin/`, allmone starts that executable immediately. Release checks may happen in parallel, but an unreachable GitHub API must not block local launch.

If an update is available, allmone downloads it, replaces the managed executable only after verification, and restarts the process if needed.

### Configure Software Settings

The user or app can update non-secret allmone settings through `~/.allmone/config.yaml`. In v0.1.4, the supported configurable fields are:

- CLIProxyAPI release metadata URL
- CLIProxyAPI release page URL
- allmone-managed local executable path under `~/.allmone/runtime/bin/`
- runtime host
- runtime output port
- CLIProxyAPI config path

Invalid YAML or invalid values should leave the last valid in-memory config active and show a redacted config error.

### Set API Output Port

The user can set the output port from the main window. allmone writes the port to the allmone-owned CLIProxyAPI config, rebuilds the Management API base URL, and restarts the managed process for the change to take effect.

Port validation:

- integer only
- range `1` to `65535`
- default `8317`
- reject invalid input before writing config
- detect predictable port-in-use failures and show an actionable status

The renderer may display and copy the API base URL. It must not display or copy the Management API credential.

### Tray Control

The user can control the managed runtime without opening the main window:

- inspect status
- copy API base
- start/restart/stop CLIProxyAPI
- trigger update check
- open allmone
- quit

Tray actions must call the same main-process runtime manager used by the renderer, not duplicate process logic.

## Architecture

Add a small managed-runtime layer beside the existing Management API service:

- `RuntimeHome`: resolves and creates `~/.allmone` paths.
- `AllmoneConfigStore`: reads/writes `~/.allmone/config.yaml`, validates non-secret software settings, and computes derived URLs.
- `CliProxyApiInstaller`: fetches release metadata, matches assets, downloads, verifies, extracts, and records install metadata.
- `CliProxyApiConfigWriter`: reads/writes `~/.allmone/runtime/config.yaml`, updates only allmone-owned fields, and preserves provider/auth sections managed by CLIProxyAPI.
- `CliProxyApiProcessController`: owns the child process, starts/stops/restarts it, captures redacted lifecycle errors, and reports state.
- `RuntimeService`: continues to own Management API calls and config summaries, but receives the managed runtime's generated Management API URL and credential.
- `TrayController`: renders native tray menu state and dispatches commands into the managed runtime service.

The main process is the only process that may hold the generated Management API credential. The renderer and tray receive only sanitized status, paths, version labels, ports, and safe URLs.

## Data Flow

1. App startup resolves `~/.allmone` and initializes the YAML software config plus runtime install metadata.
2. Main process loads or generates the Management API credential.
3. Main process loads `~/.allmone/config.yaml`, validates host/port/download URL/local executable path, and derives Management/API base URLs.
4. Installer discovers the managed binary at the configured local executable path.
5. If missing or stale, installer downloads and verifies the official release.
6. Config writer writes or patches `~/.allmone/runtime/config.yaml`.
7. Process controller spawns CLIProxyAPI with the allmone config and generated credential.
8. Runtime service rebuilds its CLIProxyAPI Management API client from the managed URL and credential.
9. Renderer and tray request sanitized state through IPC/main-process callbacks.
10. Port changes write config, restart the managed process, and update copied URLs.

## Error Handling

- Existing binary launch takes priority over update checks when GitHub is unreachable.
- Failed downloads must leave the current executable untouched.
- Failed extraction must clean temporary files where practical.
- Failed checksum verification must reject the update.
- Child-process exit should be reflected as a stopped or crashed state with redacted diagnostics.
- Stop/restart must be idempotent when no child process is running.
- Invalid port input must not write config or restart the process.
- Invalid software config YAML or invalid configured paths must not launch an untrusted executable.
- Secrets must be redacted before state crosses IPC.

## Testing

- Unit-test release asset matching without network.
- Unit-test software config default creation, YAML parsing, validation, and invalid-config fallback.
- Unit-test checksum validation and failed-download behavior with fake fetch/files.
- Unit-test config writer updates to host/port while preserving unrelated config fields.
- Unit-test process controller state transitions with an injected spawn adapter.
- Unit-test IPC validation for start/restart/stop/update/port payloads.
- Unit-test tray menu command wiring with fake tray/menu adapters.
- Re-run existing runtime, IPC, settings, and CLIProxyAPI client tests.
- Run:
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`

## Acceptance

- `docs/version/0.1.4/` contains this spec, a prompt plan, and a todo file.
- allmone creates and uses `~/.allmone` for managed runtime files.
- allmone creates and uses `~/.allmone/config.yaml` for non-secret software configuration.
- CLIProxyAPI download address and local executable path are represented in software config.
- Missing managed CLIProxyAPI executable triggers official download/install.
- Existing managed executable can launch without network.
- Newer official releases trigger a safe update path.
- allmone can start, restart, and shutdown the managed CLIProxyAPI process.
- API output port is saved by allmone and reflected in copied API base URLs.
- Tray menu exposes runtime status and quick actions.
- Renderer and tray do not receive plaintext management credentials or provider secrets.
- allmone still contains no API proxying, provider adapter, routing, payload-rule, or request/response transformation code.
- Verification commands pass.

## Handoff To v0.2.0

v0.2.0 should build the auth management surface on top of a reliable allmone-managed CLIProxyAPI runtime.
