# allmone Current Prompt Plan

Last updated: 2026-05-09

Specific version prompt plans live under `docs/version/<semver>/prompt_plan.md`.

## Active Version

Continue v0.2.0 from the version prompt plan:

```text
Read CLAUDE.md.
Read docs/todo.md.
Read docs/version/0.2.0/spec.md.
Read docs/version/0.2.0/prompt_plan.md.
Read docs/version/0.2.0/todo.md.
Continue from the next unchecked v0.2.0 prompt.
Preserve user changes and keep token contents out of renderer storage.
```

Current next prompt:

- v0.2.0 Prompt 1: Multi Auth File Management Surface.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read the active version files under `docs/version/<semver>/` when they exist.
4. If the active version files do not exist yet, create them from the current root next prompt before implementation.
5. Inspect the current diff with `git status --short`.
6. Preserve user changes and update the active version todo when a prompt is completed.
