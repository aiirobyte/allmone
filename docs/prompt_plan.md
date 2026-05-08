# allmone Current Prompt Plan

Last updated: 2026-05-09

Specific version prompt plans live under `docs/version/<semver>/prompt_plan.md`.

## Active Version

Prepare v0.2.0 planning files:

```text
Read CLAUDE.md.
Read docs/todo.md.
Review docs/spec.md and docs/todo.md.
Create docs/version/0.2.0/spec.md, prompt_plan.md, and todo.md for Auth Management Surface.
Preserve user changes and keep secrets out of renderer storage.
```

Current next prompt:

- Create v0.2.0 planning files for Auth Management Surface.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read the active version files under `docs/version/<semver>/` when they exist.
4. If the active version files do not exist yet, create them from the current root next prompt before implementation.
5. Inspect the current diff with `git status --short`.
6. Preserve user changes and update the active version todo when a prompt is completed.
