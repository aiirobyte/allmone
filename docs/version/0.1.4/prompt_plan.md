# allmone v0.1.4 Prompt Plan

Last updated: 2026-05-08
Status: Complete

This plan implements `docs/version/0.1.4/spec.md`.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read `docs/version/0.1.4/spec.md`.
4. Check `git status --short`.
5. Preserve user changes.
6. Do not call a real CLIProxyAPI service from tests.
7. Do not perform real GitHub downloads from tests.
8. Do not move management credentials, provider API keys, proxy credentials, or sensitive headers into renderer storage.
9. Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.

## Prompt 0: Runtime Home And Software Config

Goal: move new managed-runtime state under `~/.allmone` and add YAML software configuration.

Prompt:

```text
Read docs/version/0.1.4/spec.md and src/main/runtime/.
Add a main-process runtime home module that resolves ~/.allmone from the user home directory and exposes paths for config.yaml, runtime/cli-proxy-api/bin, runtime/cli-proxy-api/downloads, runtime/cli-proxy-api/logs, runtime/cli-proxy-api/tmp, runtime/cli-proxy-api/config.yaml, runtime/cli-proxy-api/management-key.json, and runtime/cli-proxy-api/install.json.
Add an AllmoneConfigStore that creates, reads, validates, and writes ~/.allmone/config.yaml with a structured YAML parser.
Store non-secret source settings in config.yaml: CLIProxyAPI release metadata URL, release page URL, local executable path, and CLIProxyAPI runtime settings under cliproxyapi.runtime: host, output port, Management API timeout, and config path. Derive safe API URLs in memory.
Keep Management API credentials and other secrets out of config.yaml and continue using Electron safeStorage or main-process memory for secrets.
Delete old runtime-settings.json files during startup without migrating old values.
Add tests for path resolution, directory creation, default YAML creation, default port, invalid stored port normalization, invalid localExecutablePath rejection, invalid releaseMetadataUrl rejection, and old-settings deletion.
Run bun run test and bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- Non-secret software settings are under `~/.allmone/config.yaml`.
- Default output port is `8317`.
- CLIProxyAPI download address and local executable path are present in YAML config.
- The renderer never receives generated Management API credentials.

## Prompt 1: Official CLIProxyAPI Installer And Updater

Goal: download and update the managed CLIProxyAPI executable from official releases.

Prompt:

```text
Read docs/version/0.1.4/spec.md and the official CLIProxyAPI release sources listed there.
Create a main-process installer module for CLIProxyAPI release metadata, platform asset matching, checksum verification, download, extraction, executable permissions, and install metadata.
Read the release metadata URL and local executable path from AllmoneConfigStore, defaulting to official CLIProxyAPI release metadata and ~/.allmone/runtime/cli-proxy-api/bin.
Reject local executable paths outside ~/.allmone/runtime/cli-proxy-api/bin for v0.1.4.
Use injected fetch/filesystem/archive adapters in tests; tests must not perform network downloads.
Prefer launching an existing installed binary when release metadata cannot be fetched.
Keep failed downloads and failed checksum verification from replacing the current executable.
Add tests for darwin/linux/windows asset matching, unsupported platform handling, checksum mismatch, failed metadata fetch with existing binary, and successful install metadata write.
Run bun run test and bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- Missing managed binary can be installed from official release metadata.
- Existing managed binary survives failed update attempts.
- Download source and managed binary path come from validated software config.
- Install metadata contains no secrets.

## Prompt 2: Managed Config And Port Ownership

Goal: let allmone own CLIProxyAPI host/port config without overwriting provider data.

Prompt:

```text
Read docs/version/0.1.4/spec.md, src/main/runtime/service.ts, and src/main/cli-proxy-api/types.ts.
Add a config writer for ~/.allmone/runtime/cli-proxy-api/config.yaml.
Use a structured YAML parser instead of string replacement.
Write or patch only allmone-owned runtime fields: host, port, runtime/log directories, and local management enablement required for allmone.
Preserve existing openai-compatibility, api-keys, auth, payload, and unknown fields.
Load managed host/port/config path from AllmoneConfigStore's cliproxyapi.runtime settings and update runtime service initialization so the Management API base URL is derived from the managed host/port.
Validate port input before writing: integer, 1..65535.
When the user saves a new port, update config.yaml, recompute safe derived URLs, patch CLIProxyAPI config, and restart the managed process in the later process-control prompt.
Add tests proving port changes update config.yaml, preserve provider config, and invalid ports do not write files.
Run bun run test and bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- API base is derived as `http://127.0.0.1:<port>/v1`.
- Management base is derived as `http://127.0.0.1:<port>/v0/management`.
- Port changes do not erase provider configuration.

## Prompt 3: Process Launch, Restart, And Shutdown

Goal: manage the allmone-owned CLIProxyAPI child process.

Prompt:

```text
Read docs/version/0.1.4/spec.md and src/main/index.ts.
Create a process controller that launches only the managed binary under ~/.allmone/runtime/cli-proxy-api/bin with the allmone-owned config path.
Pass the generated Management API credential from main process to the child process without exposing it over IPC.
Track process states for missing, installing, ready, starting, running, stopping, stopped, crashed, update_failed, and launch_failed where useful.
Implement idempotent start, stop, restart, and ensureInstalledThenStart methods.
Wire app startup so allmone can install/update if needed, then launch the managed process.
Ensure app quit stops the managed child process cleanly.
Add tests with an injected spawn adapter for start, double-start, stop-without-process, restart, unexpected exit, and launch failure.
Run bun run test and bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- allmone starts the managed executable when present.
- allmone can stop and restart the managed process.
- Process diagnostics are redacted before IPC.

## Prompt 4: Runtime IPC And Preload Controls

Goal: expose managed runtime controls through a narrow typed bridge.

Prompt:

```text
Read docs/version/0.1.4/spec.md, src/main/runtime/ipc.ts, and src/preload/index.ts.
Add IPC handlers for reading managed runtime state, saving output port, ensuring install/update, start, restart, stop, and copying safe API base values where main-process clipboard access is needed.
Validate every payload before calling the service.
Expose sanitized software config fields needed by the renderer: release metadata URL, local executable path, `cliproxyapi.runtime.host`, `cliproxyapi.runtime.port`, API base URL, and Management API base URL without credentials.
Do not expose generated Management API credentials, provider API keys, proxy credentials, or sensitive headers.
Update preload and renderer global types.
Add IPC tests for valid commands, invalid port payloads, invalid command payloads, and state redaction.
Run bun run test and bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- Renderer can control the managed runtime without direct Node access.
- Invalid payloads fail without echoing secrets.
- Existing provider IPC still works.

## Prompt 5: Tray MVP

Goal: add native tray status and quick actions.

Prompt:

```text
Read docs/version/0.1.4/spec.md and src/main/index.ts.
Add a tray controller that receives sanitized managed runtime state and command callbacks.
Build a tray menu with status, API base/port, Open Allmone, Copy API Base, Start CLIProxyAPI, Restart CLIProxyAPI, Stop CLIProxyAPI, Check For Update, and Quit.
Keep tray process commands routed through the same managed runtime service used by IPC.
Ensure closing the main window leaves the app running with the tray where platform behavior allows.
Add tests with fake Tray/Menu/clipboard adapters for menu labels, enabled states, and command callback wiring.
Run bun run test and bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- Tray reflects running/stopped/installing/error states.
- Tray can start, restart, and stop the managed runtime.
- Copy action copies only the safe OpenAI-compatible API base.

## Prompt 6: Renderer Managed Runtime Controls

Goal: make the main window control install/update/process/port without a redesign.

Prompt:

```text
Read docs/version/0.1.4/spec.md and src/renderer/src/main.ts.
Add a compact managed runtime panel above or beside the existing connection/provider surface.
Show install/update status, binary version if known, managed runtime path, process state, output port, API base, and safe copy action.
Show configured CLIProxyAPI download source and local executable path as non-secret runtime details.
Add controls for install/update retry, start, restart, stop, and saving the output port.
Keep existing provider editing intact and continue using sanitized runtime state.
Do not add auth management, usage, logs, model inventory, local network sharing, or payload rule UI.
Run bun run typecheck.
Update docs/version/0.1.4/todo.md.
```

Acceptance:

- The user can set the API output port from the GUI.
- The user can copy `http://127.0.0.1:<port>/v1`.
- Runtime secrets are not stored in renderer durable state.

## Prompt 7: Visual Pass And Build Verification

Goal: finish the managed runtime and tray MVP safely.

Prompt:

```text
Review src/renderer/src/styles.css and tray behavior against docs/version/0.1.4/spec.md.
Keep the UI compact and desktop-control-plane oriented.
Check text overflow at the existing minimum window size and narrow browser widths.
Run bun run test.
Run bun run typecheck.
Run bun run build.
Update docs/version/0.1.4/todo.md with completed items, verification results, and known gaps.
Update root docs/spec.md, docs/prompt_plan.md, docs/todo.md, and docs/version/README.md if the active version status changes.
```

Acceptance:

- Build verification passes.
- Renderer has no obvious overlap or text overflow.
- Root docs point to the next correct prompt.
