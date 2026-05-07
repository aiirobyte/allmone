# allmone v0.1.0 Prompt Plan

Last updated: 2026-05-07
Status: Complete

## Prompt 0: Planning Baseline

Goal: make the repo navigable for future AI sessions.

Prompt:

```text
Read README.md, CONTEXT.md, package.json, and the current source tree.
Create docs/spec.md, docs/prompt_plan.md, and docs/todo.md.
Add CLAUDE.md so future sessions know to read the planning docs first.
Update README.md so it describes allmone as a CLIProxyAPI-backed desktop control plane for AI model resources, not as an Electron template.
Do not add implementation code.
Run typecheck and update docs/todo.md with the next version target.
```

Acceptance:

- `docs/spec.md` explains product intent, scenarios, constraints, architecture boundary, and version targets.
- `docs/prompt_plan.md` contains executable prompts.
- `docs/todo.md` contains a cross-session checklist.
- `CLAUDE.md` documents the planning loop and CLIProxyAPI boundary.
- README matches the product direction.
- `bun run typecheck` passes.

Completion notes:

- Completed on 2026-05-07.
- No source implementation files were intentionally changed.

