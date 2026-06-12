---
id: FEAT-197
status: pending
priority: P1
category: bug
target_release: null
created: 2026-06-12
updated: 2026-06-12
depends_on: []
slices: []
derived_from: null
autonomous_safe: false
tags: [dispatch, worktree, contract, bug]
needs_contract: true
needs_ux: false
github_issue: 239
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/239"
---
# FEAT-197: BUG: dispatch result.json path is relative — child worktree CWD breaks finalize finder

## Problem

The loop dispatch prompt template tells each child agent to write a result file at a RELATIVE path:

```
Write a JSON file to .claude/artifacts/loop/dispatch/<runId>/FEAT-N.result.json
```

Each child agent runs inside its own git worktree (e.g. `cortex-FEAT-N-0`). Its CWD is the worktree root, NOT the main repo. So the result file lands at:

```
<worktree-root>/.claude/artifacts/loop/dispatch/<runId>/FEAT-N.result.json
```

The `dispatch finalize` step only scans the MAIN repo's `.claude/artifacts/loop/dispatch/<runId>/`. Found nothing → marks every FEAT as `no marker` even though the child agents successfully wrote their results.

## Repro (witnessed 2026-06-12)

1. Operator ran a multi-worktree dispatch (5 child agents, one per FEAT).
2. Each child wrote `result.json` to its own worktree's `.claude/...`.
3. `dispatch finalize` scanned main's `.claude/...` only — found nothing.
4. Marked all 5 FEATs as `no marker`.
5. Workaround: manually `cp` the 5 `result.json` files from each child worktree to main's `.claude/artifacts/loop/dispatch/<runId>/`, then re-ran `finalize`. Result: all 5 marked DONE.

## Root cause

`src/scripts/dispatch.mts` (or wherever the prompt template lives) emits the result-path as a relative string. Relative paths resolve to CWD. Child CWD ≠ main CWD when worktrees are used.

## Fix options

**Option A**: Prompt template emits the ABSOLUTE path to the main repo's dispatch dir. Each child writes there directly. Requires the template to know main repo's absolute path at dispatch-prompt-build time.

**Option B**: `dispatch finalize` falls back to scanning each child worktree's `.claude/artifacts/loop/dispatch/<runId>/` when the main scan finds nothing. More tolerant but two-pass.

**Option C** (best): both. Prompt emits absolute path (correctness), finalize also has the fallback scan (resilience against child agents that ignore the absolute path).

## Acceptance criteria

**AC-1**: All tests + lint + tsc clean.

**AC-2** (prompt absolute path): the dispatch prompt template emits an absolute path for the result.json target. Test verifies the prompt contains an absolute path (starts with `/` on POSIX or `<drive>:\` on Windows). The path resolves to `<mainRepo>/.claude/artifacts/loop/dispatch/<runId>/`.

**AC-3** (finalize fallback scan): `dispatch finalize` scans the main repo's dispatch dir first; if FEAT-N is not found there, also scans each known child worktree's `.claude/artifacts/loop/dispatch/<runId>/` and copies any found result.json into main before marking DONE/no-marker. Test covers the cross-worktree scan.

**AC-4** (no double-counting): if a child wrote to BOTH the main dir (because it followed the new absolute path) AND its own worktree (because the prompt was ambiguous), finalize must not process both — main wins.

**AC-5** (back-compat): existing single-worktree (no child worktree) dispatch flow stays green.

## Out of scope

- Reworking worktree-creation semantics.
- Adding a per-FEAT progress badge while dispatch is in flight.

## Refs

- `src/scripts/dispatch.mts` — prompt template + finalize finder.
- Witnessed 2026-06-12 by user — workaround applied (manual cp + re-finalize).
- Plugin version where bug confirmed: loop 0.43.1 (likely still present in 0.43.3 since no fix shipped).
