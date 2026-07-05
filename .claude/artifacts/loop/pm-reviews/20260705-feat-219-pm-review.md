# PM review: FEAT-219 (2026-07-05)

**Frontmatter to apply to `.claude/artifacts/loop/backlog/pending/FEAT-219.md`** (PM has no Edit/Write
grant on backlog files per `agents/pm.md` Boundaries — this artifact is the write-owning output;
`pm-apply` or an operator with Edit must commit it):

```yaml
priority: P1
autonomous_safe: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.65
pm_dependency_depth: 0.7
composite_score: 0.6225
pm_reviewed: 2026-07-05
proposed_slices:
  - id_suffix: -SLICE-1
    title: Write-side agent_type + failure-kind tagging (memory-sink + learnings)
    points: 2
  - id_suffix: -SLICE-2
    title: buildMemoryContext helper (rank/lessons/decisions + optional recallPrior, noop-safe)
    points: 3
  - id_suffix: -SLICE-3
    title: Wire helper into start-slice + post-builder-fanout, completeness fitness test
    points: 3
  - id_suffix: -SLICE-4
    title: PM/architect entry-point wiring + agent-type soft-boost scoring blend
    points: 3
  - id_suffix: -SLICE-5
    title: Fix stale docs (commands/learn.md, commands/decisions.md)
    points: 1
```

Verified via `bun -e` against `src/scripts/lib/pm-scorer.mts`:
`computeCompositePriority` → `P1`, `computeAutonomousSafe` → `false`,
`computeWeightedCompositeScore` → `0.6225`.
`mapEffortEstimateToPoints(0.65)` → `8` (band `0.6 ≤ x < 0.85`) → decomposition gate triggers;
`proposed_slices` above sums to `12 ≥ 8`, satisfying FEAT-168 Framework 6.

**"## Acceptance criteria" section to apply** (replaces `_To be authored by PM (runner:pm) at
scoping._`):

```markdown
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
```

---

## PM scoring (JSON)

```json
{
  "featureId": "FEAT-219",
  "scores": {
    "customer_impact": 0.75,
    "effort_estimate": 0.65,
    "strategic_alignment": 0.8,
    "technical_risk": 0.65,
    "dependency_depth": 0.7
  },
  "compositePriority": "P1",
  "autonomousSafe": false,
  "demandEvidence": "Internal stakeholder: every dispatched agent role (pm/architect/builder/reviewer/validator) in this repo's own autonomous loop. Verified citations, not the FEAT body's word: (1) src/scripts/lib/post-builder-fanout.mts:38-65 -- reviewerPrompt/validatorPrompt confirmed to carry zero prior-knowledge content, read directly. (2) src/scripts/lib/slice-linker/start-slice.mts:470 (learningsDigest computed in gatherSliceResources) vs :482-485 (only recallBlock, the astramem source, is spliced into dispatchInstruction) -- confirmed the digest-vs-splice gap the FEAT claims. (3) Grade-lesson evidence closing Framework 4's loop: SLICE-96's lesson ('Existing helper saved scope -- PM finding... Always grep existing lib/ before sizing structural FEATs') and SLICE-97's lesson ('FEAT promotion doesn't check whether the implementation is already on main... initial parent-loop reaction was to call this a lie') are exactly the class of blind-dispatch cost this FEAT proposes to close automatically instead of via manual PM/operator diligence. (4) dev-team sibling FEAT-188 (P1, composite 0.7, pending) already documents the identical capture/recall gap crew-side with quantified damage (learnings.jsonl stale since 2026-06-11, 27% of 78 grade files unfilled placeholders). Workaround today: manual grep/audit by PM or architect at triage time -- this session itself is an example (I had to manually cross-check PR #303's branch state to find the tagging gap; an automated recall block would have surfaced 'memory-sink PR open, agent_type missing' without a full archaeology pass). Frequency: every single dispatch, continuously, since the loop runs in marathon/auto mode.",
  "scopeNotes": "Smallest deliverable: SLICE-2 (helper) + SLICE-3 (wiring at start-slice + post-builder-fanout only) with a flat, untagged top-K digest -- no agent-type boost required for the helper to add value. If forced to halve scope, cut SLICE-1 (tagging) and SLICE-4 (soft-boost) first and ship the flat digest; defer tagging/scoping until the dev-team FEAT-188 consolidation question (one memory-stack home vs two) is resolved, since building agent_type tagging twice risks exactly the 'two drifting memory stacks' FEAT-219's own Open Questions section warns against. Overlap check: no duplication found -- this repo's own FEAT-188 (done) is an unrelated 'merge slice-complete+grade' feature (numeric ID collision with dev-team's FEAT-188, different repo/domain); the done FEAT-217 (memory-sink write-side capture) is a real prerequisite, not an overlap. AC clarity: original FEAT body had a placeholder ('_To be authored by PM_') -- P1 priority triggers FEAT-277 inline drafting, 12 GWT ACs authored above across the 5 requested slice groups, including a noop/byte-identical AC (AC-5) and a completeness-gate AC (AC-9). Weak-dimension check (Framework 4): loop-snapshot.md's last-5 grade averages are ALL >= 0.80 (observability lowest at 0.82) -- no mandatory weak-dimension AC triggered, though AC-9's completeness fitness test still closes a real observability-adjacent gap the 2026-07-05 audit found (stale commands/learn.md + commands/decisions.md claims). Effort calibration (Framework 5): no clean single-repo cost analog exists -- the closest candidate, FEAT-215/SLICE-140 (per-repo ingest config, similar multi-site config-threading shape), is an aggregate report spanning 5 unrelated repos/projects ($220.75 total, only $26.44 attributable to runner-plugin itself), so it is not a reliable per-slice signal; noting 'no clean cost analog' and scoring effort from the dimension table instead, calibrated against the comparable cross-cutting shape of dev-team FEAT-188's own 0.65 effort_estimate for its (larger, full-provider-build) S1-S5. Reconciliation note requested by the task: dev-team FEAT-188 (P1, composite 0.7, pending, unstarted) is the base/spec-owning epic; FEAT-219 is the narrower runner-side adoption/wiring vehicle reusing FEAT-219's own repo's already-existing readers (rankLearnings, recentLessons, findRelevantDecisions, recallPrior) rather than building a new MemoryProvider abstraction -- the two should NOT proceed independently; the 'Open questions' consolidation item in FEAT-219's own body (one home vs two) should be resolved via a recorded DEC (or an architect pre-flight) before SLICE-1 is dispatched, not discovered mid-slice.",
  "risks": [
    "Pre-mortem Q1 (two weeks later, review/validation failure): most likely cause is the injection helper's token-cap truncation or the agent-type soft-boost blend producing a malformed or oversized Markdown block that silently breaks the PARALLEL_DISPATCH_CONTRACT v1 wording baked into post-builder-fanout.mts's reviewerPrompt/validatorPrompt, causing Reviewer A/B verdict-parsing regressions across every slice in the pipeline, not just this one.",
    "Pre-mortem Q2 (rollback if this merged and broke the loop): the code side (new helper module, start-slice.mts/post-builder-fanout.mts splice points) is revert-only since additive. BUT the write-side tagging change (agent_type field on memory-sink/learnings entries, landing partly via the separate open PR #303) means already-captured untagged or mistagged historical entries cannot be cleanly reverted -- rollback needs either a backfill/migration pass over the existing learnings.jsonl store or an accepted-permanent gap where historical entries stay untagged (soft-fail scoping, not a hard block, but still a real state-recovery step beyond git revert).",
    "Pre-mortem Q3 (coverage gap): none of the current dispatch-assembly tests assert on full prompt CONTENT beyond structural fields (role/subagent_type/description) -- they don't snapshot the complete prompt string. A garbled or broken memory-context block concatenated into reviewerPrompt/validatorPrompt would pass every existing suite undetected. AC-9's completeness fitness test only verifies the injection helper is CALLED at each site, not that its OUTPUT is well-formed -- a golden content-shape/snapshot test (separate from AC-9) is required to close this gap, and is not yet in the AC list above; flagging as a follow-up the builder should add during SLICE-3.",
    "Verified prereq-claim gap (not an injection attempt, a factual correction): FEAT-219's own body states the write-side tagging half is '(already fixed by memory-sink #303 + P1.11)'. Direct verification (`gh pr list --head feat/memory-sink-and-ingest-hardening` -> PR #303 OPEN, plus `git show feat/memory-sink-and-ingest-hardening:src/scripts/lib/memory-sink.mts | grep 'agent_type|kind'`) shows PR #303 is unmerged, and even on that branch MemoryKind is only decision|lesson|note -- no failure kind, no agent_type field anywhere. SLICE-1 above is real, uncompleted work, not a rename/no-op as the FEAT body implies."
  ],
  "reasoning": "P1 (impact 0.75 >= 0.7 AND alignment 0.8 >= 0.6, per computeCompositePriority) -- closing the loop's most basic 'agents dispatch blind' gap is core to the autonomous-loop mission, with real evidence from two 2026-07-05 audits plus grade-lesson precedent of manual-workaround cost; technical_risk 0.65 sits in the 0.6-0.8 band (cross-module reach across slice-linker lib + post-builder-fanout lib + pm/architect command-markdown prompts + a memory-sink schema addition, no new external dependency, no cross-plugin published-contract break, clean revert for the code side) -- pre-mortem is mandatory and answered above, with a cascade risk named explicitly (malformed block breaks every reviewer/validator verdict downstream); effort_estimate 0.65 maps to effort_points=8 via pm-effort-mapper, triggering the FEAT-168 decomposition gate -- proposed_slices provided (sum 12) mirroring the task's requested write-tagging -> helper -> wiring -> scoping -> docs sequence; dependency_depth 0.7 reflects three concrete unresolved blockers verified this session (PR #303 open/unmerged, agent_type tagging absent even there, and the FEAT's own unresolved 'one memory-stack home vs two' consolidation question against dev-team FEAT-188); autonomousSafe=false per computeAutonomousSafe (effort > 0.6 and technical_risk > 0.6 both trip the threshold) and independently justified by the systemic blast radius across every role gate.",
  "acs": [
    "AC-1: Given the `MemoryKind` type in `src/scripts/lib/memory-sink.mts` (branch feat/memory-sink-and-ingest-hardening, open PR #303) currently accepts only \"decision\" | \"lesson\" | \"note\", When SLICE-1 lands, Then `MemoryKind` includes \"failure\" and every `logLearning` entry and memory-sink `remember` call carries a non-empty `agent_type` field (one of pm|architect|builder|reviewer|validator).",
    "AC-2: Given a caller invokes `logLearning` without an agent_type, When the entry is persisted, Then the write is rejected with a validation error (or explicitly defaulted to \"unknown\") -- it must NOT silently store an untagged entry that later scoping code treats as successfully scoped.",
    "AC-3: Given a review-FAIL or validation-FAIL artifact write occurs, When memory-sink mirrors it, Then the mirrored entry's kind is \"failure\" (not \"note\"), distinguishing it from ordinary lessons.",
    "AC-4: Given buildMemoryContext({ projectId: \"loop\", agentType: \"reviewer\", query, tags, k: 5, tokenCap: 800 }) is called, When it wraps rankLearnings (learnings-ranker.mts:56), recentLessons (lessons-feed.mts:27), and findRelevantDecisions (decisions-store.mts:131), Then it returns a single Markdown block with one line per entry ([kind] summary -- source), never exceeding 800 tokens.",
    "AC-5: Given memory config is absent or disabled (today's default), When buildMemoryContext is called from any dispatch-assembly site, Then it returns null/empty and the resulting dispatch instruction is byte-identical to pre-FEAT-219 output, asserted by a golden dispatch-trace test.",
    "AC-6: Given recallPrior (memory-recall.mts:99) throws or the astramem daemon is unreachable, When buildMemoryContext folds it in as an optional source, Then the helper still returns the non-astramem portion of the block without throwing -- fail-open, matching the existing bestEffort() pattern at start-slice.mts:535.",
    "AC-7: Given gatherSliceResources in start-slice.mts already computes learningsDigest (line 470) without splicing it into dispatchInstruction, When SLICE-3 lands, Then the digest (or buildMemoryContext output) is concatenated into result.dispatchInstruction the same way recallBlock already is at lines 483-485.",
    "AC-8: Given buildPostBuilderFanout's reviewerPrompt/validatorPrompt (post-builder-fanout.mts:38-65) carry zero prior-knowledge content today, When SLICE-3 lands, Then both prompts include a memory-context block scoped agentType: \"reviewer\" / \"validator\" respectively.",
    "AC-9: Given a new dispatch-assembly function is added anywhere in the repo without calling the shared injection helper, When the completeness fitness test (grep-based) runs in CI, Then it FAILS and names the offending call site.",
    "AC-10: Given a builder dispatch and a reviewer dispatch query the same entry pool, When buildMemoryContext applies the blend semantic(query) + project_id filter + agent_type boost + per-role kind preference, Then reviewer-scoped calls rank failure-kind entries above same-recency lesson/decision entries, and builder-scoped calls rank lesson/decision above failure, WITHOUT excluding the other kind entirely.",
    "AC-11: Given an agentType with zero matching tagged entries, When buildMemoryContext is called, Then it falls back to the global untagged ranked pool rather than returning an empty block.",
    "AC-12: Given commands/learn.md currently claims learnings are \"automatically surfaced\" -- shown false by the 2026-07-05 audit handoff and this FEAT's own Evidence section -- When SLICE-3's wiring (AC-7/AC-8) actually lands, Then commands/learn.md is corrected to describe the real injection path, and commands/decisions.md:92-94's stale reviewer-ladder reference is fixed or removed."
  ],
  "proposed_slices": [
    { "id_suffix": "-SLICE-1", "title": "Write-side agent_type + failure-kind tagging (memory-sink + learnings)", "points": 2 },
    { "id_suffix": "-SLICE-2", "title": "buildMemoryContext helper (rank/lessons/decisions + optional recallPrior, noop-safe)", "points": 3 },
    { "id_suffix": "-SLICE-3", "title": "Wire helper into start-slice + post-builder-fanout, completeness fitness test", "points": 3 },
    { "id_suffix": "-SLICE-4", "title": "PM/architect entry-point wiring + agent-type soft-boost scoring blend", "points": 3 },
    { "id_suffix": "-SLICE-5", "title": "Fix stale docs (commands/learn.md, commands/decisions.md)", "points": 1 }
  ]
}
```
