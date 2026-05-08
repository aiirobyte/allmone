# Allmone - All llm in one.

All your LLM models in one place.

allmone is a cross-platform Electron desktop control plane for a user's AI model resources. It provides the GUI, tray controls, runtime status, auth/resource management, and usage views around CLIProxyAPI.

CLIProxyAPI is the runtime dependency for proxying, provider conversion, routing, OpenAI-compatible API output, logs, queueing, and auth enforcement. allmone should not reimplement those layers.

## Product Direction

- Model-first architecture: users manage model capabilities first, providers second.
- API/Auth compatible: expose and manage access through CLIProxyAPI-supported APIs.
- Unified API output: depend on CLIProxyAPI for compatible endpoints and transformations.
- Tray plus GUI: provide fast daily controls and a full management surface.
- Usage visibility: show recent requests, errors, queue health, and estimates where data exists.

## Planning Loop

This repo uses a fixed LLM codegen planning loop:

- `docs/spec.md`: current planning entry point.
- `docs/prompt_plan.md`: active version prompt entry point.
- `docs/todo.md`: cross-session checklist. In a new session, say: "read docs/todo.md and continue".
- `docs/version/<semver>/`: specific version plans, each with `spec.md`, `prompt_plan.md`, and `todo.md`.
- `CLAUDE.md`: agent startup instructions and project boundary rules.

## Scripts

Install dependencies:

```bash
bun install
```

Run the app in development mode:

```bash
bun run dev
```

Type-check and build production assets:

```bash
bun run build
```

Preview the production build with Electron:

```bash
bun run preview
```

Create distributables for the current platform:

```bash
bun run dist
```

Platform-specific packaging scripts:

```bash
bun run dist:mac
bun run dist:win
bun run dist:linux
```

## Project Structure

```text
src/
  main/       Electron main process, native app lifecycle, tray, IPC, runtime orchestration
  preload/    Typed bridge exposed to the renderer
  renderer/   Vite-powered GUI
docs/
  spec.md         Product spec and version targets
  prompt_plan.md  Step-by-step implementation prompts
  todo.md         Cross-session checklist
  version/         Specific version plans
```

## Current Target

Current roadmap target: v0.1.5 Real Local Proxy Setup And Full CLIProxyAPI Upstream Catalog.

See `docs/todo.md` for the next executable prompt.
