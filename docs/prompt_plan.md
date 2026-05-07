# allmone Current Prompt Plan

Last updated: 2026-05-07

Specific version prompt plans live under `docs/version/<semver>/prompt_plan.md`.

## Active Version

Plan v0.1.4 from the roadmap:

```text
Read docs/spec.md.
Read docs/todo.md.
Read docs/version/0.1.3/spec.md for the handoff.
Create docs/version/0.1.4/spec.md, prompt_plan.md, and todo.md.
Preserve user changes and keep secrets out of renderer storage.
```

Current next prompt:

- Create the v0.1.4 Tray MVP version plan from the roadmap and v0.1.3 handoff.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read the active version files under `docs/version/<semver>/` when they exist.
4. If the active version files do not exist yet, create them from the current root next prompt before implementation.
5. Inspect the current diff with `git status --short`.
6. Preserve user changes and update the active version todo when a prompt is completed.
