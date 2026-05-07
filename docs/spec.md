# allmone Current Spec

Last updated: 2026-05-07

This file is the current planning entry point. Specific version plans live under `docs/version/<semver>/`.

## Active Version

Active version: `0.1.4` planned

- Previous version: `docs/version/0.1.3/`
- Active version docs: `docs/version/0.1.4/` pending

## Product Intent

allmone is an Electron desktop control plane for a user's AI model resources. It brings API keys, authenticated access, model inventory, usage visibility, and day-to-day controls into one local GUI and tray app.

The app is model-first rather than provider-first. allmone depends on CLIProxyAPI for proxying, provider conversion, routing, OpenAI-compatible API output, auth enforcement, runtime logs, and queueing. allmone owns the local desktop experience, tray, user management surface, configuration workflow, and usage presentation.

## Boundary Rule

If a feature would require allmone to parse provider protocols, route API traffic, or rewrite request/response formats, the feature belongs in CLIProxyAPI or must wait for CLIProxyAPI support.

## Version Index

- `0.1.0`: Planning Baseline. Complete.
- `0.1.1`: CLIProxyAPI Runtime Contract Spike. Complete.
- `0.1.2`: Runtime service and minimal config renderer. Complete.
- `0.1.3`: Runtime connection GUI hardening. Complete.
- `0.1.4`: Tray MVP. Planned.
- `0.2.0`: Auth management surface. Planned.
- `0.3.0`: Model-first resource inventory. Planned.
- `0.4.0`: Usage and logs. Planned.
- `0.5.0`: Local network sharing. Planned.
- `1.0.0`: Stable local control plane. Planned.
