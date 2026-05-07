# allmone v0.1.0 Spec

Last updated: 2026-05-07
Status: Complete

## Version Goal

Create the first planning baseline for allmone so future AI coding sessions can resume from durable project context instead of rediscovering intent.

## Product Intent Captured

allmone is an Electron desktop control plane for a user's AI model resources. The app is model-first, supports API/Auth workflows, provides GUI and tray management, and shows usage. CLIProxyAPI owns API proxying, provider conversion, routing, OpenAI-compatible output, auth enforcement, logs, and queueing.

## Scope

- Create the LLM codegen planning loop.
- Document product goals, boundaries, version targets, constraints, and scenarios.
- Create a cross-session todo file.
- Add agent startup instructions.
- Update README from template language to product language.

## Non-Goals

- No Electron source implementation.
- No CLIProxyAPI client code.
- No tray, GUI redesign, auth management, usage view, or packaging work.
- No provider adapter or API proxy implementation inside allmone.

## Deliverables

- `docs/spec.md`
- `docs/prompt_plan.md`
- `docs/todo.md`
- `CLAUDE.md`
- `README.md`

## Acceptance

- The repo explains what allmone is.
- The CLIProxyAPI boundary is explicit.
- A new AI session can read the docs and know the next action.
- `bun run typecheck` passes.

## Result

v0.1.0 is complete. The planning baseline now exists and has been migrated into the versioned planning structure introduced for v0.1.1.
