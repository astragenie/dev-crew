---
id: FEAT-219
status: in-progress
priority: P1
category: platform
target_release: null
created: 2026-07-05
depends_on: []
slices: [SLICE-1, SLICE-2, SLICE-3, SLICE-5]
slices_complete: [SLICE-2, SLICE-5]
slices_partial: [SLICE-1, SLICE-3]
slices_deferred: [SLICE-4]
shipped_prs: [311, 306, 319, 317, 308]
derived_from: null
tags: [concern:memory, concern:dispatch, surface:plugin, stack:typescript]
autonomous_safe: false
pm_reviewed: 2026-07-05
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.65
pm_dependency_depth: 0.7
composite_score: 0.6225
proposed_slices:
  - id_suffix: -SLICE-1
    title: Write-side agent_type + failure-kind tagging (memory-sink + learnings)
    points: 2
    state: partial # shipped #311
    shipped_pr: 311
    residual: "memory-sink.mts fully done (MemoryKind incl. failure, agentType threaded, recordFailure); src/scripts/lib/learnings.mts logLearning still carries NO agent_type field — AC-1/AC-2 unmet for the learnings-store write path"
  - id_suffix: -SLICE-2
    title: buildMemoryContext helper (rank/lessons/decisions + optional recallPrior, noop-safe)
    points: 3
    state: shipped # shipped #306
    shipped_pr: 306
  - id_suffix: -SLICE-3
    title: Wire helper into start-slice + post-builder-fanout, completeness fitness test
    points: 3
    state: partial # shipped #319, #317
    shipped_prs: [319, 317]
    residual: "start-slice.mts half done (learningsDigest splice AC-7 + memory.recall.scopeByAgent gate); post-builder-fanout.mts has ZERO memory-context wiring (AC-8 unmet, reviewerPrompt/validatorPrompt carry no memory block) and no completeness fitness test exists anywhere under src/tests (AC-9 unmet)"
  - id_suffix: -SLICE-4
    title: PM/architect entry-point wiring + agent-type soft-boost scoring blend
    points: 3
    state: deferred # per PR #309
    note: "deferred per PR #309; not shipped, no code landed"
  - id_suffix: -SLICE-5
    title: Fix stale docs (commands/learn.md, commands/decisions.md)
    points: 1
    state: shipped # shipped #308
    shipped_pr: 308
triage_notes: "Free-text intake 2026-07-05. Role-scoped pre-work memory injection into dispatch prompts. Sibling/runner-side of dev-team FEAT-188 (MemoryProvider). Needs PM scope + ACs and architect approach review before slicing."
---

# FEAT-219: role-scoped pre-work memory injection into agent dispatch

## Shipped status (reconciled 2026-07-05)

Most of this FEAT shipped across four PRs on `main` after this record was
last touched. The tracking item was stale (`status: pending`, `slices: []`)
and would have caused the loop to re-slice already-merged work. Reconciled
below from `git log` on `main` plus direct code verification in this
worktree; residual work stays open under SLICE-1/SLICE-3 (partial) and
SLICE-4 (deferred).

| Slice | Status | PR(s) | Residual / note |
|---|---|---|---|
| SLICE-1 — write-side agent_type + failure-kind tagging | **partial** | #311 | `src/scripts/lib/memory-sink.mts` is fully done: `MemoryKind` includes `"failure"` (line 28), every write path threads an `agentType` field, and a dedicated `recordFailure` helper exists (lines 222–240). But `src/scripts/lib/learnings.mts`'s `logLearning` (lines 49–96) still has **no `agent_type` field at all** — grep for `agentType\|agent_type` returns zero matches. AC-1/AC-2 (every `logLearning` entry carries a non-empty `agent_type`, rejecting/defaulting when absent) are unmet. |
| SLICE-2 — `buildMemoryContext` helper | **shipped** | #306 | `src/scripts/lib/memory-context.mts` exists with `src/tests/memory-context.test.mts` covering the happy-path / noop / fail-open behavior (AC-4/5/6). No gaps found. |
| SLICE-3 — wire helper into start-slice + post-builder-fanout + completeness test | **partial** | #319, #317 | `start-slice.mts` half is done: `learningsDigest` is spliced into `result.dispatchInstruction` (AC-7, lines 490–491), and agent-scoped recall is gated by `memory.recall.scopeByAgent` (lines 860–866, PR #319). But `src/scripts/lib/post-builder-fanout.mts`'s `reviewerPrompt`/`validatorPrompt` (lines 69–124) carry **zero** memory-context content — no `buildMemoryContext` import or call anywhere in the file, and `src/tests/post-builder-fanout.test.mts` only imports `buildPostBuilderFanout`. AC-8 is unmet. The AC-9 completeness/fitness test (grep-based, "no dispatch site skips injection") does not exist anywhere under `src/tests/` — confirmed via repo-wide grep for `completeness`/`dispatch-assembly`/`fitness`. AC-9 is unmet. |
| SLICE-4 — PM/architect entry-point wiring + agent-type soft-boost blend | **deferred** | — | Deferred per PR #309; no code landed. Not started. |
| SLICE-5 — fix stale docs (`commands/learn.md`, `commands/decisions.md`) | **shipped** | #308 | Confirmed: repo-wide grep for `"automatically surfaced"` and the stale `reviewer-ladder` reference returns zero matches under `commands/`. |

**Net**: SLICE-2 and SLICE-5 are fully done. SLICE-1 and SLICE-3 each shipped
their code-assembly-side half but left their fanout/write-store half
unwired — the residual work is real, not a rename or no-op. SLICE-4 has not
started. `status` is set to `in-progress` (not `done`) so the loop treats
this as touched-with-open-residual rather than either untouched-pending or
fully closed.

## Problem

An agent (pm, architect, builder, reviewer, validator) starts each task
**blind** — it receives no recent relevant learnings, decisions, past failures,
or recorded issues before it works. The building blocks to fix this exist but
the "last mile" (splice knowledge into the actual dispatch prompt string, scoped
by the agent's role) was never wired. Several docs falsely claim it already
works.

## Evidence (two read-only audits, 2026-07-05)

runner-plugin read-side:
- The only mechanism that can inject prior-knowledge text into a dispatched
  prompt is `recallPrior`→`formatRecallBlock`, wired into `startSlice`
  (`src/scripts/lib/slice-linker/start-slice.mts:832`, `:483-485`). It is
  **builder-only** and query-generic (not role-scoped).
- `learningsDigest` (`recentLearnings`, `learnings.mts:100`) **is computed at
  slice start but returned as a sibling JSON field — never spliced into the
  `dispatchInstruction` string** (`start-slice.mts:535,553`). `commands/learn.md`
  claims it is "automatically surfaced"; that is false today.
- Reviewer/validator prompts carry **zero** prior-knowledge content
  (`post-builder-fanout.mts:38-65`). `findRelevantDecisions`
  (`decisions-store.mts:131`) is only reachable from a manual CLI, never the
  reviewer fanout; `commands/decisions.md:92-94` is stale (references the
  removed reviewer-ladder).
- FEAT-179 (done) claimed to embed lessons into `dispatchInstruction`; only the
  ranker/decay/citations utilities landed, wired to a manual CLI. The write-back
  half (`updateUtilityScoreInStore`/`appendCitation`) is also unwired.

dev-team (crew) read-side:
- crew injects **nothing** before work (SessionStart hook = telemetry only;
  wake-up-brief/brief-me are manual). No role-scoped injection anywhere.
- dev-team **FEAT-188** ("MemoryProvider — capture/recall learning loop", P1,
  pending) already specs the full provider + one injection helper wired into 6
  dispatch-assembly sites, top-K recency×severity, scoped by agent/tags. This
  FEAT-219 is the runner-side counterpart / adoption vehicle — the two MUST be
  reconciled (see Open questions).

## astramem status (2026-07-05)

astramem is **live on this machine** (contradicting the audits' "dormant"
note): CLI v0.5.2 on PATH, local daemon `http://127.0.0.1:7777` OK,
`MEMORY_BEARER` present (`astramem doctor`). So `resolveCli` now resolves and
the recall/write paths actually hit the daemon. astramem is a *source*, not a
blocker — the local learnings/lessons/decisions stores already work with no CLI.

## Reusable building blocks (all present, read-only)

`recentLearnings`/`searchLearnings` (`learnings.mts`), `recentLessons`
(`lessons-feed.mts`), `rankLearnings` (decay+utility, token budget —
`learnings-ranker.mts`), `findRelevantDecisions` (`decisions-store.mts:131`),
`recallPrior`+`formatRecallBlock` (astramem — `memory-recall.mts` /
`recall-injector.mts`).

## Proposed approach (for architect review; PM to slice)

1. **Write-side role+kind tags** (prereq): memory-sink + learnings tag each
   entry with `agent_type` + `kind` (`decision|lesson|failure|note`);
   auto-capture review-FAIL / validation-FAIL as `failure` entries. (The stale-
   learnings *capture* half is fixed by memory-sink #303 + P1.11, but PM
   verified that even on #303's branch `MemoryKind` is only
   `decision|lesson|note` — **no `failure` kind, no `agent_type` field** — so
   this tagging is real, uncompleted work, not a rename/no-op. #303 is also
   still open/unmerged.)
2. **One helper** `buildMemoryContext({ projectId, agentType, query, tags, k,
   tokenCap })` → Markdown block. Wrap the existing rank/lessons/decisions
   readers (work today, no astramem needed) and fold `recallPrior` in as an
   optional source. Noop + byte-identical dispatch when memory is off.
3. **Wire at every dispatch-assembly site**, guarded by a grep completeness
   test: `start-slice` (splice the already-computed digest), `post-builder-
   fanout` (reviewer+validator), pm (intake/triage), architect pre-flight; plus
   crew's build/fix/ship/orchestrate-slice.
4. **Agent-type scoping = soft boost, not hard filter.** Blend `semantic(query)
   + project_id filter + agent_type boost + per-role kind preference` (reviewer
   → failure/review-issue, builder → lesson/decision, architect → decision),
   with global fallback so cross-role knowledge still surfaces. A hard
   agent_type filter is a non-goal (sparse, siloed).
5. **Dispatch entry point**: prefer code injection at the assembly sites over a
   `SubagentStart`-style hook (no such Claude Code event; PreToolUse can't
   cleanly rewrite a subagent prompt).

## Open questions (for architect)

- **Consolidation**: runner already ships `memory-sink`/`memory-recall`/
  `recall-injector`; FEAT-188 proposes a crew-side `src/lib/memory/`
  MemoryProvider. One home or two? (crew is the base dependency.) Avoid two
  drifting memory stacks.
- Token budget per role; where the query string comes from for non-slice
  dispatches (pm/architect).
- Fix the stale docs (`commands/learn.md`, `commands/decisions.md`) as part of
  this or separately.

## Acceptance criteria

### SLICE-1 — Write-side agent_type + failure-kind tagging (prereq)
- AC-1: Given the `MemoryKind` type in `src/scripts/lib/memory-sink.mts` (branch
  `feat/memory-sink-and-ingest-hardening`, open PR #303) currently accepts only
  `"decision" | "lesson" | "note"`, When SLICE-1 lands, Then `MemoryKind` includes
  `"failure"` and every `logLearning` entry (`src/scripts/lib/learnings.mts`) and every
  memory-sink `remember` call carries a non-empty `agent_type` field
  (one of `pm|architect|builder|reviewer|validator`).
- AC-2 (edge/error): Given a caller invokes `logLearning` without an `agent_type`, When the
  entry is persisted, Then the write is rejected with a validation error (or explicitly
  defaulted to `"unknown"` per an architect decision) — it must NOT silently store an
  untagged entry that later scoping code treats as successfully scoped.
- AC-3: Given a review-FAIL or validation-FAIL artifact write occurs, When memory-sink
  mirrors it, Then the mirrored entry's `kind` is `"failure"` (not `"note"`), distinguishing
  it from ordinary lessons for downstream ranking.

### SLICE-2 — buildMemoryContext helper
- AC-4 (happy path): Given `buildMemoryContext({ projectId: "loop", agentType: "reviewer",
  query, tags, k: 5, tokenCap: 800 })` is called, When it wraps the existing
  `rankLearnings` (`learnings-ranker.mts:56`), `recentLessons` (`lessons-feed.mts:27`), and
  `findRelevantDecisions` (`decisions-store.mts:131`), Then it returns a single Markdown
  block (e.g. `## Recent context (top-5)`) with one line per entry
  (`[kind] summary — source`), never exceeding 800 tokens.
- AC-5 (noop / byte-identical dispatch): Given memory config is absent or disabled
  (today's default), When `buildMemoryContext` is called from any dispatch-assembly site,
  Then it returns `null`/empty and the resulting dispatch instruction is byte-identical to
  pre-FEAT-219 output — asserted by a golden dispatch-trace test run both with and without
  memory configured.
- AC-6 (edge/error): Given `recallPrior` (`memory-recall.mts:99`) throws or the astramem
  daemon is unreachable, When `buildMemoryContext` folds it in as an optional source, Then
  the helper still returns the non-astramem portion of the block (rank/lessons/decisions)
  without throwing — fail-open, matching the existing `bestEffort()` pattern already used at
  `start-slice.mts:535`.

### SLICE-3 — Injection wiring + completeness gate
- AC-7: Given `gatherSliceResources` in `start-slice.mts` already computes `learningsDigest`
  (line 470) today without splicing it into `dispatchInstruction`, When SLICE-3 lands, Then
  the digest (or `buildMemoryContext` output) is concatenated into `result.dispatchInstruction`
  the same way `recallBlock` already is at lines 483-485.
- AC-8: Given `buildPostBuilderFanout`'s `reviewerPrompt`/`validatorPrompt`
  (`post-builder-fanout.mts:38-65`) carry zero prior-knowledge content today, When SLICE-3
  lands, Then both prompts include a memory-context block scoped `agentType: "reviewer"` /
  `"validator"` respectively.
- AC-9 (completeness / error path — "no dispatch site skips injection"): Given a new
  dispatch-assembly function is added anywhere in the repo without calling the shared
  injection helper, When the completeness fitness test (grep-based, mirroring dev-team
  FEAT-188 S3's own completeness test) runs in CI, Then it FAILS and names the offending
  call site.

### SLICE-4 — Agent-type scoping (soft boost)
- AC-10: Given a `builder` dispatch and a `reviewer` dispatch query the same entry pool,
  When `buildMemoryContext` applies the blend `semantic(query) + project_id filter +
  agent_type boost + per-role kind preference`, Then reviewer-scoped calls rank
  `failure`-kind entries above same-recency `lesson`/`decision` entries, and builder-scoped
  calls rank `lesson`/`decision` above `failure`, WITHOUT excluding the other kind entirely
  (soft boost, not a hard filter).
- AC-11 (edge/empty result): Given an `agentType` with zero matching tagged entries (e.g. a
  brand-new role), When `buildMemoryContext` is called, Then it falls back to the global
  untagged ranked pool rather than returning an empty block.

### SLICE-5 — Docs fix
- AC-12: Given `commands/learn.md` currently claims learnings are "automatically surfaced" —
  a claim the 2026-07-05 audit handoff
  (`.claude/artifacts/crew/handoffs/20260705T092316Z-...md`) and this FEAT's own Evidence
  section show is false today — When SLICE-3's wiring (AC-7/AC-8) actually lands, Then
  `commands/learn.md` is corrected to describe the real injection path, and
  `commands/decisions.md:92-94`'s stale reference to the removed reviewer-ladder is fixed
  or removed.

_Follow-up flagged by PM pre-mortem (builder to add in SLICE-3): AC-9 verifies the helper
is CALLED at each site, not that its OUTPUT is well-formed. Add a golden content-shape /
snapshot test asserting the injected block never garbles the `PARALLEL_DISPATCH_CONTRACT v1`
wording in reviewer/validator prompts._

## Refs

- dev-team `FEAT-188` + `docs/superpowers/specs/2026-07-04-memory-provider-plan.md`
- Audit handoffs: `.claude/artifacts/crew/handoffs/20260705T09*-handoff-crew-pre-work-knowledge-injection-audit.md`
