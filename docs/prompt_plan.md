# allmone Current Prompt Plan

Last updated: 2026-05-10

Specific version prompt plans live under `docs/version/<semver>/prompt_plan.md`.

## Active Version

Start v0.3.0 planning setup:

```text
Read CLAUDE.md.
Read docs/todo.md.
Read docs/spec.md.
Read docs/version/README.md.
Read docs/version/0.2.1/spec.md.
Read docs/version/0.2.1/prompt_plan.md.
Read docs/version/0.2.1/todo.md.
Create docs/version/0.3.0/spec.md, docs/version/0.3.0/prompt_plan.md, and docs/version/0.3.0/todo.md for Model Resource Inventory before implementation.
Update root docs to point at docs/version/0.3.0/ after the planning files exist.
```

Current next prompt:

- v0.3.0 Planning Setup: create version planning files for Model Resource Inventory.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read the active version files under `docs/version/<semver>/` when they exist.
4. If the active version files do not exist yet, create them from the current root next prompt before implementation.
5. Inspect the current diff with `git status --short`.
6. Preserve user changes and update the active version todo when a prompt is completed.
