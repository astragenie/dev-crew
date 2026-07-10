# CI docs-only fast-path

Docs-only PRs (changes limited to `docs/`, `*.md`, or `**/backlog/`) skip the
test suite and merge on a lightweight `gate` check.

## How it works

- `changes` job classifies the diff. Non-docs file → `code=true`.
- `fast-gate` / `slow-tests` / `worktree-quarantine` run only when `code=true`.
- `gate` always runs and is the required status check:
  - docs-only → passes immediately (no tests)
  - code → passes only if `fast-gate` passed

To force the full suite on a docs PR, include any non-docs file in the PR.
