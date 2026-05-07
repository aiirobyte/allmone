---
name: git-usage
description: Git workflow discipline, use when the user asks to use git, create or manage worktrees, start feature or bugfix development, inspect git log conventions, split or make commits, decide when to commit, prepare PR-ready changes, or enforce branch/commit hygiene.
---

# Git Usage

Use this skill to keep git work deliberate, reviewable, and recoverable.

## First Checks

- Start with `git status --short --branch` and identify whether the worktree is clean.
- Treat existing unstaged, staged, and untracked files as user-owned until proven otherwise.
- Do not revert, overwrite, rebase, reset, remove, or force-push user work unless explicitly requested.
- Before staging or committing, inspect `git diff`, `git diff --staged`, and relevant untracked files.
- Prefer precise git commands over interactive flows.

## Worktree Development

Use a separate worktree for a new requirement when the task is more than a tiny local edit, when work may run in parallel, or when the current worktree has unrelated changes.

Recommended flow:

```bash
git status --short --branch
git branch --show-current
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || true
```

- Choose the base branch from the repo context. Prefer `origin/HEAD`, then `main`, then `master`, unless the user specifies another base.
- Name branches as `type/short-slug`, for example `feat/workspace-bash`, `fix/tool-registration`, `docs/git-skill`, `test/cli-bash`.
- Put worktrees in a predictable sibling or repo-local location. Prefer `../<repo>-<slug>` when working outside the repo root; prefer `.worktrees/<slug>` only if the project already uses that pattern.
- Create the worktree with one branch per requirement:

```bash
git worktree add -b feat/short-slug ../repo-short-slug origin/main
```

- Run implementation, tests, and commits inside the new worktree.
- When finished and merged, remove the worktree with `git worktree remove <path>` and prune stale metadata with `git worktree prune` if needed.
- Do not create a worktree just to satisfy a simple user request if the current worktree is clean and the change is obviously small.

## Commit Message Convention

Before committing in an unfamiliar repo, inspect local style:

```bash
git log --oneline --decorate -n 20
git log -n 5 --format=%B
```

Follow the repo's existing convention. If no clear style exists, use concise Conventional Commit style:

```text
type(scope): imperative summary
```

Types:

- `feat`: user-visible capability or new behavior
- `fix`: bug fix
- `docs`: documentation-only change
- `test`: tests-only change
- `refactor`: internal restructuring without behavior change
- `chore`: tooling, dependency, metadata, or maintenance work

Rules:

- Keep the subject specific and under about 72 characters.
- Use imperative mood: `add`, `fix`, `wire`, `document`.
- Include a body only when it explains non-obvious motivation, risk, migration, or test evidence.
- Do not add AI attribution trailers unless the repo already uses them or the user asks.

## Commit Timing

Commit only when the user asks, or when an explicit workflow such as ship/PR creation requires it.

Make a commit when:

- The change is a coherent, reviewable unit.
- Relevant tests or checks have passed, or the final message will clearly say what was not run.
- The staged diff contains only the intended files.
- Generated files, logs, secrets, local traces, and editor artifacts are excluded unless intentionally part of the change.

Do not commit when:

- The implementation is still speculative or known broken.
- The diff mixes unrelated features, fixes, docs, and formatting that can be separated.
- User-owned changes are present in the same files and have not been deliberately accounted for.
- Required context is missing and a reasonable assumption would be risky.

## Staging And Splitting

- Stage by logical unit, not by convenience. Use path-based staging first: `git add path/to/file`.
- Use `git add -p` only when a file contains separable changes and non-interactive staging is insufficient.
- For multi-commit requests, inspect the full diff first, then group files by intent before staging.
- After staging each commit, run `git diff --staged --stat` and `git diff --staged` to verify scope.
- Commit order should usually be: foundation/refactor, implementation, tests/docs, integration. Keep each commit buildable when practical.

## Final Reporting

After committing, report:

- Commit hash and subject.
- Tests or checks run.
- Any known risks, skipped checks, or uncommitted files.
