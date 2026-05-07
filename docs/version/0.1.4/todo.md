# allmone v0.1.4 Todo

Last updated: 2026-05-07
Status: Planned

## Version Target

Target: v0.1.4 Managed CLIProxyAPI Runtime, Software Config, And Tray MVP.

Definition of done:

- [x] Create `docs/version/0.1.4/spec.md`.
- [x] Create `docs/version/0.1.4/prompt_plan.md`.
- [x] Create `docs/version/0.1.4/todo.md`.
- [ ] Create and use `~/.allmone` for managed runtime files.
- [ ] Store non-secret software configuration in `~/.allmone/config.yaml`.
- [ ] Store CLIProxyAPI download address and local executable path in software configuration.
- [ ] Store install metadata at `~/.allmone/runtime/install.json`.
- [ ] Download missing CLIProxyAPI executable from official releases.
- [ ] Check official release metadata and safely update stale managed executables.
- [ ] Launch the managed executable from `~/.allmone/runtime/bin/`.
- [ ] Restart and shutdown the allmone-managed CLIProxyAPI process.
- [ ] Generate and patch `~/.allmone/runtime/config.yaml` without erasing provider config.
- [ ] Let allmone own and save the API output port.
- [ ] Derive and expose the safe OpenAI-compatible API base URL.
- [ ] Add tray status and quick actions.
- [ ] Keep secrets out of renderer localStorage/sessionStorage/IndexedDB/logs.
- [ ] Keep allmone free of API proxying, provider adapters, routing, payload rules, and request/response transformation.
- [ ] Run `bun run test`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Update root docs after implementation completion.

## Next Prompt

Start v0.1.4 Prompt 0 from `docs/version/0.1.4/prompt_plan.md`.

Expected next change:

- Implement runtime home resolution and YAML software config under `~/.allmone`.

## Guardrails

- Use `~/.allmone` as the allmone-owned runtime home.
- Use `~/.allmone/config.yaml` for non-secret software configuration.
- Do not store secrets in `~/.allmone/config.yaml`.
- Do not launch a configured CLIProxyAPI executable path outside `~/.allmone/runtime/bin/` in v0.1.4.
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
- The YAML config includes CLIProxyAPI release metadata URL, release page URL, managed local executable path, runtime host, runtime port, CLIProxyAPI config path, and derived safe API URLs.
- Discovery in v0.1.4 means discovering the managed executable and install metadata under `~/.allmone`, not scanning system installations.
- API output port is allmone-owned and should update CLIProxyAPI config plus derived safe URLs.
- Existing managed executable should launch even when update checks fail.
- Port changes should restart the managed process after writing config.
