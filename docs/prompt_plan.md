# allmone Current Prompt Plan

Last updated: 2026-05-10

Specific version prompt plans live under `docs/version/<semver>/prompt_plan.md`.

## Active Version

Continue v0.2.1 from the active version prompt plan:

```text
Read CLAUDE.md.
Read docs/todo.md.
Read docs/spec.md.
Read docs/version/README.md.
Read docs/version/0.2.1/spec.md.
Read docs/version/0.2.1/prompt_plan.md.
Read docs/version/0.2.1/todo.md.
Start v0.2.1 Prompt 0: Persistent Local Output Key Bootstrap.
Add allmone-owned encrypted local output key persistence and startup bootstrap. If no persistent key exists, generate one and make it available to the managed CLIProxyAPI runtime.
Update root docs and docs/version/0.2.1/todo.md after the prompt is complete.
```

Current next prompt:

- v0.2.1 Prompt 0: Persistent Local Output Key Bootstrap.

## Operating Rule

Before starting any prompt:

1. Read `CLAUDE.md`.
2. Read `docs/todo.md`.
3. Read the active version files under `docs/version/<semver>/` when they exist.
4. If the active version files do not exist yet, create them from the current root next prompt before implementation.
5. Inspect the current diff with `git status --short`.
6. Preserve user changes and update the active version todo when a prompt is completed.
