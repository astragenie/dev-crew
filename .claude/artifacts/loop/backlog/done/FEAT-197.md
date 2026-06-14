---
started_at: 2026-06-13
completed_at: 2026-06-13
status: done
updated: 2026-06-13
slices_complete: [SLICE-131]
target_release: 0.50.0
github_issue: 272
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/272"
---
---
id: FEAT-197
status: triaged
priority: P1
category: bug
target_release: null
created: 2026-06-12
updated: 2026-06-13
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
tags: [dispatch, worktree, contract, bug]
needs_contract: true
needs_ux: false
github_issue: 239
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/239"
pm_customer_impact: 0.85
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.85
pm_technical_risk: 0.45
pm_dependency_depth: 0.0
composite_priority: P1
demand_evidence: |
  User-witnessed 2026-06-12 (FEAT body "Repro" section): a 5-FEAT
  multi-worktree dispatch run had every child worktree write
  result.json to its own worktree CWD; main repo `dispatch finalize`
  found nothing and marked all 5 FEATs as `no marker`. Workaround
  required manual `cp` of 5 result.json files from child worktrees
  to main, then `finalize` re-run. Plugin version 0.43.1 confirmed
  affected; likely still present in 0.43.3/0.43.7 since no fix
  shipped (see Refs in FEAT body). GitHub issue 239 tracks the bug.
scopeNotes: |
  Bounded fix in src/scripts/dispatch.mts (215 lines). Two concrete
  code points: (1) prompt template emits absolute path to main
  repo's dispatch dir (AC-2); (2) finalize fallback scan over known
  child worktrees with copy-to-main before mark (AC-3). AC-4 fences
  double-count when child writes to both locations (main wins).
  AC-5 fences back-compat for single-worktree flow. No UX surface,
  no cross-plugin contract — the "contract" is loop-internal between
  the dispatch prompt template and the loop finalize scanner.
  Weak-dim check: observability avg 0.818 over last 5 grades is
  expected-low for plugin-dev stack per project memory; no
  observability AC required. All other dims >= 0.874. test_confidence
  0.902 — AC-3 explicit "Test covers the cross-worktree scan" closes
  the only obvious coverage gap (existing finalize tests are
  single-worktree). No cost analog: nearest dispatch slice in
  cost-report aggregates is SLICE-50 (CLI auto-dispatch removal,
  $117 / 29min) which was an architectural removal, not a comparable
  scope shape — this fix is additive and far smaller, supporting
  effort_estimate 0.35. Slice-from-feature should pre-flight check
  whether the worktree-list source (per-runId state) already tracks
  child paths; if not, slice plan must add that surface in AC-3.
risks:
  - "Pre-mortem (failure mode): AC-3 fallback scan needs an authoritative source of child-worktree paths per runId. If dispatch state doesn't persist that list, scan target enumeration is incomplete and finalize still misses results. Slice plan MUST verify (or add) the worktree-list source before AC-3 implementation."
  - "Pre-mortem (rollback): single-file revert of src/scripts/dispatch.mts is sufficient — no schema, no persisted state, no cross-plugin coordination."
  - "Pre-mortem (coverage gap): existing dispatch finalize tests are single-worktree fixtures. AC-3's required cross-worktree test fixture is the only safeguard against silent regression of the multi-worktree path."
  - "Contract drift: changing prompt-template path format from relative to absolute is a soft contract edge with child agents; AC-4 (main wins on duplicate) + AC-5 (single-worktree back-compat) fence both sides."
  - "Path-format portability: absolute paths must work on POSIX (/) and Windows (<drive>:\\) — AC-2 explicit test wording covers both, must be verified in the implementation."
reasoning: "P1 user-witnessed dispatch bug; bounded additive fix in 215-line dispatch.mts; AC concrete and testable; band 0.3-0.5 technical_risk (one module, no contract change, clean revert); autonomous_safe true with weak-dim caveat noted."
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
