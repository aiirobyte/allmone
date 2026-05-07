# CLAUDE.md

This repo uses the LLM codegen planning loop:

1. `docs/spec.md` is the current planning entry point.
2. `docs/prompt_plan.md` points to the active version's executable prompt sequence.
3. `docs/todo.md` tracks cross-session progress and the active version.
4. Specific version plans live in `docs/version/<semver>/`.

## Session Startup

At the start of every coding session:

1. Read `docs/todo.md`.
2. Read `docs/spec.md`.
3. Read the active version's `spec.md`, `prompt_plan.md`, and `todo.md` under `docs/version/<semver>/` when those files exist.
4. If the active version is in planning setup and its version files do not exist yet, read the root `docs/prompt_plan.md` next prompt and create them first.
5. Read the active prompt in `docs/prompt_plan.md`.
6. Check `git status --short`.
7. Continue from the next unchecked item without reverting user changes.

## Project Boundary

allmone is an Electron desktop control plane for a user's AI model resources. It depends on CLIProxyAPI for API proxying, provider conversion, routing, OpenAI-compatible output, runtime logs, queueing, and auth enforcement.

Do not implement API proxying, provider adapters, or request/response transformation inside allmone. Build GUI, tray, local orchestration, secure preferences, and usage presentation around CLIProxyAPI.

## Completion Rule

After each session:

- Run the relevant verification command, usually `bun run typecheck` or `bun run build`.
- Update `docs/todo.md` and the active version's `todo.md` with completed work and the next prompt.
- Keep README, `CONTEXT.md`, and `docs/spec.md` consistent when the product direction changes.
