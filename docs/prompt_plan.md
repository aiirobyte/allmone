# allmone Current Prompt Plan

Last updated: 2026-05-11

Specific version prompt plans live under `docs/version/<semver>/prompt_plan.md`.

## Active Version

Start v0.2.2 implementation:

```text
Read CLAUDE.md.
Read docs/todo.md.
Read docs/spec.md.
Read docs/version/README.md.
Read docs/version/0.2.2/spec.md.
Read docs/version/0.2.2/prompt_plan.md.
Read docs/version/0.2.2/todo.md.
Implement Prompt 0: Effective Model Alias Contract.
```

Current next prompt:

- v0.2.2 Prompt 0: define and test the effective Provider model alias contract.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read the active version files under `docs/version/<semver>/` when they exist.
4. If the active version files do not exist yet, create them from the current root next prompt before implementation.
5. Inspect the current diff with `git status --short`.
6. Preserve user changes and update the active version todo when a prompt is completed.
