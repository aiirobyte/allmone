# allmone v0.1.4 Todo

Last updated: 2026-05-08
Status: Complete

## Version Target

Target: v0.1.4 Managed CLIProxyAPI Runtime, Software Config, And Tray MVP.

Definition of done:

- [x] Create `docs/version/0.1.4/spec.md`.
- [x] Create `docs/version/0.1.4/prompt_plan.md`.
- [x] Create `docs/version/0.1.4/todo.md`.
- [x] Create and use `~/.allmone` for managed runtime files.
- [x] Store non-secret software configuration in `~/.allmone/config.yaml`.
- [x] Store CLIProxyAPI download address and local executable path in software configuration.
- [x] Store install metadata at `~/.allmone/runtime/cli-proxy-api/install.json`.
- [x] Download missing CLIProxyAPI executable from official releases.
- [x] Check official release metadata and safely update stale managed executables.
- [x] Launch the managed executable from `~/.allmone/runtime/cli-proxy-api/bin/`.
- [x] Restart and shutdown the allmone-managed CLIProxyAPI process.
- [x] Generate and patch `~/.allmone/runtime/cli-proxy-api/config.yaml` without erasing provider config.
- [x] Let allmone own and save the API output port.
- [x] Derive and expose the safe OpenAI-compatible API base URL.
- [x] Add tray status and quick actions.
- [x] Keep secrets out of renderer localStorage/sessionStorage/IndexedDB/logs.
- [x] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [x] Run `bun run test`.
- [x] Run `bun run typecheck`.
- [x] Run `bun run build`.
- [x] Update root docs after implementation completion.

## Next Prompt

v0.1.4 is complete. Start v0.1.5 Prompt 0 from `docs/version/0.1.5/prompt_plan.md`.

Expected next change:

- Add the complete v0.1.5 upstream provider catalog and shared types.

## Guardrails

- Use `~/.allmone` as the allmone-owned runtime home.
- Use `~/.allmone/config.yaml` for non-secret software configuration.
- Do not store secrets in `~/.allmone/config.yaml`.
- Do not launch a configured CLIProxyAPI executable path outside `~/.allmone/runtime/cli-proxy-api/bin/` in v0.1.4.
- Do not take over PATH, Homebrew, systemd, launchd, Windows services, or external CLIProxyAPI processes.
- Do not perform privileged installation.
- Do not call a real CLIProxyAPI service from tests.
- Do not perform real GitHub downloads from tests.
- Do not replace a working managed executable after failed download, failed extraction, or failed checksum verification.
- Do not send plaintext generated Management API credentials, management keys, provider API keys, proxy credentials, or sensitive headers over IPC responses.
- Do not store secrets in renderer localStorage, sessionStorage, IndexedDB, DOM data attributes, logs, or checked-in files.
- Do not add OAuth login flows, auth-file management, client API key management, model inventory, usage views, local network sharing, or payload rule UI.
- Do not implement provider protocol parsing, API proxying, request routing, or request/response conversion inside allmone.

## Planning Notes

- Planning created on 2026-05-07.
- User-selected install strategy: allmone downloads and updates official CLIProxyAPI releases into `~/.allmone`, then manages that executable.
- Software config format: YAML at `~/.allmone/config.yaml`.
- Management key file: JSON at `~/.allmone/runtime/cli-proxy-api/management-key.json`; old `runtime-settings.json` files are deleted without migration.
- The YAML config includes CLIProxyAPI release metadata URL, release page URL, managed local executable path, and CLIProxyAPI runtime settings under `cliproxyapi.runtime`: host, port, Management API timeout, and config path. Safe API URLs are derived in memory.
- Discovery in v0.1.4 means discovering the managed executable and install metadata under `~/.allmone`, not scanning system installations.
- API output port is allmone-owned and should update CLIProxyAPI config plus derived safe URLs.
- Existing managed executable should launch even when update checks fail.
- Port changes should restart the managed process after writing config.

## Implementation Notes

- Prompt 0 completed on 2026-05-07: added runtime home resolution, directory creation, YAML software config defaults/validation, and old userData settings deletion.
- Prompt 0 verification passed: `bun run test`, `bun run typecheck`.
- Prompt 1 completed on 2026-05-07: added official CLIProxyAPI release asset matching, injected download/checksum/archive installation, safe executable replacement, and non-secret install metadata.
- Prompt 1 verification passed: `bun run test`, `bun run typecheck`.
- Prompt 2 completed on 2026-05-07: added managed CLIProxyAPI YAML config patching, output port validation/save flow, derived Management API base URL initialization, and provider/payload preservation tests.
- Prompt 2 verification passed: `bun run test`, `bun run typecheck`.
- Prompt 3 completed on 2026-05-08: added managed CLIProxyAPI process controller, generated main-process management key handling, startup install/launch wiring, and clean quit stop handling.
- Prompt 3 verification passed: `bun run test`, `bun run typecheck`.
- Prompt 4 completed on 2026-05-08: added managed runtime state, output-port save, start/restart/stop/update IPC, safe API-base clipboard IPC, preload bridge, and renderer global types.
- Prompt 4 verification passed: `bun run test`, `bun run typecheck`.
- Prompt 5 completed on 2026-05-08: added tray controller with status, API base/port, open/copy/start/restart/stop/update/quit actions, and Electron tray wiring.
- Prompt 5 verification passed: `bun run test`, `bun run typecheck`.
- Prompt 6 completed on 2026-05-08: added compact renderer managed-runtime panel with install/update/process/port/API base controls while preserving provider editing.
- Prompt 6 verification passed: `bun run typecheck`.
- Prompt 7 completed on 2026-05-08: reviewed compact responsive UI rules, ran final verification, and updated active-version docs.
- Prompt 7 verification passed: `bun run test`, `bun run typecheck`, `bun run build`.
