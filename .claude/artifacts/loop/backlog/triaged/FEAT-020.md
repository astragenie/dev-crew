---
id: FEAT-020
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-05-28
updated: 2026-06-13
depends_on: []
slices: []
derived_from: null
composite_score: 0.72
composite_priority: P2
source_competitors: [Cursor agents]
autonomous_safe: false
deferred: false
defer_reason: "no longer blocked — FEAT-128 (pause/resume halt-badge) and FEAT-173 (auto-PR parallel worktree) are done as of 2026-06-13"
pm_customer_impact: 0.45
pm_effort_estimate: 0.78
pm_strategic_alignment: 0.55
pm_technical_risk: 0.68
pm_dependency_depth: 0.15
pm_strategic_fit: 0.55
pm_risk_level: 0.68
pm_implementation_confidence: 0.45
pm_demand_signal: 0.45
pm_reasoning: "Phase-C rescore 2026-06-13 (dependency-resolution rescore): FEAT-128 done (halt-badge contract now stable, docs/halt-badges.md registry has 8th entry for snapshot.pausedForExternalEvent) and FEAT-173 done (parallel-worktree namespacing reference exists). dep_depth 0.70→0.15 (only internal architect-spec sequencing remains, no cross-FEAT block). technical_risk 0.75→0.68 (still banded 0.6-0.8: multi-module + new schema, but cross-plugin halt-badge surface stabilized vs. fluid). Customer impact, strategic alignment, effort unchanged — FEAT body's own reject section still cites zero documented serial-dispatch bottleneck; 6-slice/~21-point decomposition still epic-sized. autonomous_safe stays false: effort 0.78 > 0.70 gate. Priority P3→P2 (composite 0.646→0.72) — no longer deferred, ready to slice when capacity opens. SLICE-A architect SPEC remains mandatory pre-flight per needs_contract:true."
ac_clarity_status: passed
needs_ac_rewrite: false
proposed_slices:
  - { id: SLICE-A, title: "architect SPEC (file-claim algo, depth contract, snapshot shape)", points: 3 }
  - { id: SLICE-B, title: "core dispatchHierarchical + depth + AC-001/002", points: 5 }
  - { id: SLICE-C, title: "file-claim ledger + AC-003", points: 3 }
  - { id: SLICE-D, title: "halt-cascade + AC-004 (blocked on FEAT-128)", points: 3 }
  - { id: SLICE-E, title: "rehydrate + retry + AC-005/006", points: 5 }
  - { id: SLICE-F, title: "audit schema + AC-007", points: 2 }
triage_notes: "PM re-scored 2026-06-05 for scale normalization: prior composite_score=6 was a raw 0-9 legacy value that broke walker numeric-sort against current 0.0-1.0 composites. Re-scored under the canonical five dimensions; composite 0.71; formula yields composite_priority=P2 (impact<0.7, alignment<0.8). User-facing priority=P3 kept. deferred=true and defer_reason preserved verbatim. autonomous_safe=true preserved; note formula would compute false (technical_risk, effort, dependency_depth all >0.6) — deferred flag is the active walker gate per FEAT-040 risk-gate fix. // 2026-06-12 retriage test pass 1: AC-clarity pre-flight FAILED — body had Description + numeric Scoring stub, zero Given-When-Then AC. Test surfaced PM-subagent runtime bug: Agent tool not loadable via ToolSearch from inside PM subagent → original inline-dispatch retriage design fails 100%. commands/retriage.md rewritten as three-phase orchestrator (PM clarity check → orchestrator fans out spec-writer → PM re-score) to work around the bug. // 2026-06-12 retriage three-phase test: Phase A PM flagged needs-rewrite without dispatch surface. Phase B orchestrator dispatched loop:spec-writer; 7 GWT AC + Edge Cases + Error Handling + Dependencies written. Phase C PM rescored: impact 0.55→0.45 (own-body counter-evidence), effort 0.85→0.78 (bounded), risk 0.85→0.75 (banded 0.6-0.8: cross-module + schema + cross-plugin halt-badge), align 0.6→0.55, dep_depth 0.70 unchanged (FEAT-128 still triaged). Composite 0.71→0.646. autonomous_safe formula-confirmed false; deferred flag preserved with updated reason (FEAT-128 dep). effort_points≈13 → decomposed into 6 proposed_slices. PM contract gap surfaced: agents/pm.md § Boundaries says read-only but commands/retriage.md Phase C step 3 says PM persists; orchestrator applied delta this run. Open FEAT to reconcile contract. // 2026-06-13 dependency-resolution rescore: FEAT-128 done (SLICE-118, halt-badge contract stabilized) + FEAT-173 done (parallel-worktree namespacing). dep_depth 0.70→0.15 (no remaining cross-FEAT block; only internal architect-SPEC sequencing). technical_risk 0.75→0.68 (cross-plugin halt-badge surface stabilized from fluid → contracted). composite 0.646→0.72, priority P3→P2, deferred true→false. autonomous_safe stays false: effort 0.78 still > 0.70 gate (6-slice/~21-point epic). Ready to slice when capacity opens — SLICE-A architect SPEC still mandatory pre-flight per needs_contract:true."
github_issue: 22
github_milestone: 2
phase: 2
tags: [infra, workflow]
needs_contract: true
needs_ux: false
github_url: "https://github.com/sergeymilashico/loop/issues/22"
---
# FEAT-020: Async hierarchical subagent dispatch

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Cursor agents

## Description

Parent agents (`crew:*` or `loop:*` subagents already dispatched from the
walker) spawn child subagents that execute in parallel and asynchronously;
child subagents may themselves spawn grandchildren. Enables concurrent
multi-file features and large refactors without blocking the parent on a
single-threaded `Agent(...)` round-trip.

The introduced contract lives at
`src/scripts/lib/hierarchical-dispatch.mts` and reuses the
`dispatchAgent` audit primitive in `src/scripts/lib/auto-dispatch.mts`
(append to `.claude/artifacts/loop/auto-dispatch.jsonl`). It adds three
artifacts:

- `.claude/artifacts/loop/dispatch-tree/<rootId>.json` — recursive parent
  → children record (one file per root dispatch).
- `.claude/artifacts/loop/file-claims/<rootId>.jsonl` — append-only
  per-child file-claim ledger; one JSON line per claim request /
  release.
- `snapshot.dispatchTree` — surfaces depth + open-children counts so the
  walker can detect runaway fanout.

Two contracts that the FEAT MUST resolve before any implementation slice
opens (called out in `triage_notes`):

1. **Depth limit** — bounded recursion, configurable via
   `loop.dispatchMaxDepth` in `.claude/loop.json` (default below).
2. **File-claim system** — parallel children must declare which files
   they intend to write and refuse to start if another live child holds
   an overlapping claim.

## Acceptance Criteria

Format: Given / When / Then. Each AC is independently testable; the
"Evidence" line names the proof artifact.

### AC-001 — Parent spawns N children in parallel (happy path)

- **Given** a parent subagent calls `dispatchHierarchical({ children: [c1, c2, c3], maxDepth: 3 })` from `src/scripts/lib/hierarchical-dispatch.mts`
  with three child specs each touching disjoint files (`src/a.mts`,
  `src/b.mts`, `src/c.mts`),
- **When** the parent awaits the returned `Promise<DispatchTreeResult>`,
- **Then** the result resolves with `children.length === 3`, every child
  carries `status: "completed"`, the wall-clock duration is `<= max(child_durations) + 500ms`
  (proves concurrency, not serialization), and
  `.claude/artifacts/loop/dispatch-tree/<rootId>.json` records all three
  children under the parent's `dispatchId`.
- **Evidence:** `src/tests/hierarchical-dispatch.parallel.test.mts ::
  "parent spawns three disjoint children in parallel"`.

### AC-002 — Grandchildren respect depth limit (edge case)

- **Given** `loop.dispatchMaxDepth: 2` in `.claude/loop.json` and a child
  at depth 2 attempts `dispatchHierarchical({ children: [...] })`,
- **When** the child invokes the dispatch primitive,
- **Then** the call rejects synchronously with
  `Error("dispatch-depth-exceeded: current=2 max=2")`, the rejection
  surfaces as `status: "failed", failureReason: "dispatch-depth-exceeded"`
  in the parent's `DispatchTreeResult`, and `snapshot.dispatchTree.depthExceeded`
  records the offending `dispatchId`.
- **Evidence:** `src/tests/hierarchical-dispatch.depth-limit.test.mts ::
  "child at maxDepth refuses to fan out"`.

### AC-003 — File-claim conflict short-circuits second child (error path)

- **Given** child `c1` has an active claim on `src/scripts/lib/halt-badges.mts`
  recorded in `.claude/artifacts/loop/file-claims/<rootId>.jsonl` and child `c2` is
  dispatched with a claim that overlaps the same path,
- **When** the dispatcher reads the claim ledger before starting `c2`,
- **Then** `c2` does NOT execute, the dispatcher returns
  `{ status: "blocked", blockingChildId: "c1", conflictingPaths: ["src/scripts/lib/halt-badges.mts"] }`,
  appends a `kind: "claim-rejected"` JSON line to the same ledger, and
  logs `[hierarchical-dispatch] file-claim conflict child=c2 blocked-by=c1 paths=src/scripts/lib/halt-badges.mts`
  to stderr at level `warn`.
- **Evidence:** `src/tests/hierarchical-dispatch.file-claim.test.mts ::
  "overlapping claim blocks second child"`.

### AC-004 — Halt-badge cascades through the tree (cross-cutting)

- **Given** an in-flight `dispatchTree` with one parent + two children +
  one grandchild, and `snapshot.mergeFailed` halt-badge is emitted by
  the grandchild,
- **When** the walker reads `snapshot.dispatchTree`,
- **Then** every ancestor in the tree carries
  `status: "halted", haltedByDescendantId: "<grandchildId>"`, the root's
  `dispatchTree.openChildren` count drops to zero (none remain
  in-flight), and the walker does NOT auto-continue (no new slice
  picked up) until `/loop:resume` clears the badge per the FEAT-128
  contract.
- **Evidence:** `src/tests/hierarchical-dispatch.halt-cascade.test.mts ::
  "halt-badge from grandchild halts entire tree"`.

### AC-005 — State-recovery rehydrates dispatch tree after session restart

- **Given** an in-progress tree persisted at
  `.claude/artifacts/loop/dispatch-tree/<rootId>.json` with three children
  in state `running` and the session terminates mid-run,
- **When** a new session calls `rehydrateDispatchTree(rootId)`,
- **Then** the returned tree has `children[*].status === "orphaned"` for
  every previously-running child, each orphaned entry carries
  `rehydratedAt: <ISO timestamp>`, the file-claim ledger entries owned
  by orphaned children are auto-released (one `kind: "claim-released-orphan"`
  line per claim), and the rehydrate call returns within `<= 2 s` for trees up
  to 50 nodes.
- **Evidence:** `src/tests/hierarchical-dispatch.rehydrate.test.mts ::
  "orphaned children are released on session restart"`.

### AC-006 — Retry of a failed child preserves siblings (error path)

- **Given** a `DispatchTreeResult` where `c1: completed`, `c2: failed`,
  `c3: completed`,
- **When** the operator runs
  `bun src/scripts/loop.mts dispatch retry --root <rootId> --child c2`,
- **Then** only `c2` is re-dispatched (verified by a new entry in
  `.claude/artifacts/loop/auto-dispatch.jsonl` with
  `parentDispatchId: <rootId>` and `retryOf: c2`), `c1` and `c3` are NOT
  re-run, the dispatch-tree JSON now records `c2` with `attempts: 2`,
  and the retry inherits the parent's `depth` (not `depth + 1`).
- **Evidence:** `src/tests/hierarchical-dispatch.retry.test.mts ::
  "retry of failed child does not restart siblings"`.

### AC-007 — Observability: every dispatch + claim event lands in audit log

- **Given** a dispatch tree of root + 2 children + 1 grandchild,
- **When** the tree completes successfully,
- **Then** `.claude/artifacts/loop/auto-dispatch.jsonl` contains exactly
  four JSON lines (one per node), every line includes
  `{dispatchId, parentDispatchId, depth, claimedPaths, durationMs,
  costUsd}`, and `.claude/artifacts/loop/file-claims/<rootId>.jsonl`
  contains paired `claim-acquired` + `claim-released` events for every
  declared path (no orphaned acquisitions). The log lines satisfy the
  `dispatchAudit` schema added to
  `src/scripts/lib/auto-dispatch.schema.mts`.
- **Evidence:** `src/tests/hierarchical-dispatch.audit-log.test.mts ::
  "every dispatch and claim emits a paired audit entry"`.

## Edge Cases

- **Empty children array.** `dispatchHierarchical({ children: [] })`
  resolves immediately with `{ children: [], status: "completed" }`. No
  log line, no audit entry beyond the parent's own.
- **Single child at root.** Behaves identically to current
  `dispatchAgent` — same audit shape, no new artifacts beyond the
  dispatch-tree JSON.
- **Wildcard / directory claims.** A child claiming
  `src/scripts/lib/**` blocks any sibling claiming a path under that
  glob; conflict detection uses minimatch semantics already in
  `src/scripts/lib/path-glob.mts`. Document explicitly in the SPEC: no
  "exclusive lock" claims — read-only siblings are still rejected
  because builders almost always write.
- **Depth limit at root.** `loop.dispatchMaxDepth: 0` disables hierarchical
  dispatch entirely; `dispatchHierarchical` rejects with
  `Error("hierarchical-dispatch-disabled")` and the call site falls back to
  serial `dispatchAgent`.
- **Default depth limit.** When `loop.dispatchMaxDepth` is unset, default
  to `3` (root → child → grandchild). Justification: empirically covers
  every observed multi-file refactor pattern; deeper trees historically
  correlate with runaway fanout.
- **Cycle detection.** A grandchild cannot dispatch a node whose
  `dispatchId` already appears in its ancestor chain (encoded in
  `parentChain: string[]` on every dispatch). Cycle attempt rejects with
  `Error("dispatch-cycle: dispatchId=<id>")`.
- **Overlap with FEAT-173 (auto-PR parallel worktree).** When the
  walker is in `parallel-worktree` mode, each child claims its own
  worktree path (`.git/worktrees/<id>/**`) rather than `src/**`. The
  file-claim system MUST treat worktree paths as a separate namespace —
  two children writing to the same file IN DIFFERENT WORKTREES do not
  conflict.

## Error Handling

| Failure mode | Detection | Recovery |
| --- | --- | --- |
| Depth exceeded | sync check before child dispatch | reject parent call; record in `snapshot.dispatchTree.depthExceeded`; do NOT mark tree halted |
| File-claim conflict | ledger scan before child start | return `status: "blocked"`; surface `blockingChildId`; operator decides whether to retry after the conflicting child completes |
| Child crash (uncaught throw) | promise rejection captured by `Promise.allSettled` | mark `status: "failed"` + `failureReason`; siblings continue; tree resolves with mixed statuses |
| Halt-badge from any descendant | walker reads `snapshot.dispatchTree` | cascade `status: "halted"` to all ancestors; siblings finish in flight but new children are NOT dispatched; entire tree blocks walker advance until `/loop:resume` |
| Orphan after session restart | `rehydrateDispatchTree` scans tree JSON | mark previously-running children as `orphaned`; release their claims; operator can retry orphans individually via `dispatch retry --child` |
| Cycle in `parentChain` | sync check in dispatcher | reject with `dispatch-cycle` error; no audit line written for the would-be cycle node |
| Audit-log write failure | exception from `appendAuditLog` | propagate as dispatch failure (do NOT silently swallow); parent dispatch fails fast so the audit trail is never partial |

## Dependencies

- **FEAT-128 (pause/resume halt-badge)** — `MUST land first or in
  parallel`. AC-004 cascades through `snapshot.mergeFailed` and the
  resumption contract; without `/loop:resume` semantics, a halt at depth
  ≥ 1 has no defined recovery path. SPEC for FEAT-020 cites FEAT-128's
  halt-badge schema and refuses to ship if the resume contract is still
  fluid.
- **FEAT-173 (auto-PR parallel worktree)** — `MAY land in parallel`.
  Worktree-aware claim namespacing (see Edge Cases) is mandatory only
  when FEAT-173's parallel-worktree mode is active. If FEAT-173 ships
  first, the file-claim AC includes a worktree-path test; if FEAT-020
  ships first, document the worktree extension as a
  forward-compatibility note in the SPEC.
- **Existing audit primitive** — reuse `dispatchAgent`,
  `appendAuditLog`, and `flushAuditLog` from
  `src/scripts/lib/auto-dispatch.mts`. Do NOT introduce a second audit
  path; extend the schema instead (see AC-007).
- **Snapshot writer** — extend `src/scripts/lib/loop-snapshot.mts` to
  surface `dispatchTree: { depth, openChildren, depthExceeded[],
  halted[] }` so existing dashboards pick it up without a new query
  endpoint.
- **Architect pre-flight required.** `needs_contract: true` already on
  frontmatter — first slice MUST be `crew:architect` producing the
  formal SPEC (file-claim algorithm, depth contract, snapshot shape)
  before any builder slice opens. PM rationale: technical_risk 0.85 +
  cascades through dispatch / halt / retry / state-recovery paths.

## References

- https://cursor.com/changelog/2-5
- `src/scripts/lib/auto-dispatch.mts` — audit primitive to reuse
- `src/scripts/lib/halt-badges.mts` — halt-badge cascade target
- `docs/halt-badges.md` — halt-badge registry; new
  `snapshot.dispatchTree.*` fields MUST be added here
- `FEAT-128.md` — pause/resume contract (hard dependency)
- `FEAT-173.md` — parallel-worktree namespacing (soft dependency)

## Consider rejecting because

The current serial-dispatch pattern (one `Agent(...)` per slice,
walker-driven) has never produced a documented multi-file bottleneck in
loop's own backlog (99 done slices, zero retros mentioning serial-dispatch
latency). Cursor's hierarchical-agent demo targets a different workload
(multi-repo refactor at human-IDE scale). The depth-limit + file-claim
machinery introduces meaningful state and recovery surface — every halt,
retry, and state-recovery code path doubles in branching complexity. If
empirical loop telemetry never shows serial-dispatch as the bottleneck,
the safer move is to defer indefinitely and let FEAT-173's
parallel-worktree mode handle the one concrete parallelism case (PR
batch).
