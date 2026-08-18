---
slice: unknown
builder: fullstack-dev
run_id: 20260818T213620Z
feat: FEAT-001
files_touched: ["C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-007.md", "C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-008.md", "C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-009.md", "C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-010.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-295.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-296.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-297.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-230.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-259.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-284.md", "C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-299.md"]
files_read: []
diff_stat: { files: 1, additions: 6, deletions: 4 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-02: disposition in-flight FEATs 230/259/284/295/296/297/299

- Created: 2026-08-18T21:36:20.853Z
- From: fullstack-dev
- To: dispatcher
- Objective: Wave-1 FEATs 295/296/297 (SLICE-205/206/208) verified merged to runner-plugin main (commits 8a498553/0df469ff/67017b5e) and moved to done/ with slice files reconciled to completed/. FEAT-230/259/284/299 stamped p0_disposition: carry in runner-plugin frontmatter, each with a reason naming shipped vs remaining slices and why the remainder is not seam-dependent. Four matching unscored FEATs filed into dev-crew pending/ via loop.mts intake from-text: FEAT-007 (from FEAT-230, skill resolver re-scoped for single-repo), FEAT-008 (from FEAT-259, receipt schema + idle-ping suppression), FEAT-009 (from FEAT-284, frontmatter migration + CLI escape hatch, notes open FEAT-294 dependency for AC-8b), FEAT-010 (from FEAT-299, trim asymmetry + duplicate validation, per dev-crew's own DEC-001). No new feature code built in runner-plugin; PM triage of the four carried FEATs deferred to later.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-295.md
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-296.md
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-297.md
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-230.md
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-259.md
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-284.md
  - C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-299.md
  - C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-007.md
  - C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-008.md
  - C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-009.md
  - C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-010.md
- Confidence: high
- Risks: FEAT-230 disposition (carry) required judgment call since the plan left it unscored by default -- documented reasoning in p0_reason rather than a hard rule. FEAT-284's AC-8b gap (blocked on separate FEAT-294) is carried forward as an explicit caveat so it is not silently claimed as done.
- Suggested Next Handoff: SLICE-03 owns AC-3 (28-triaged-FEAT three-bucket sweep, moot/carry/defer), AC-4 (stale worktree branch salvage-or-delete: backfill, feat-reconcile, fix-427, fix-481, fix-format, release-073), and AC-5 (pre-devcrew-baseline tags in both repos).


## Diff

```diff
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index 67928a3..fa07392 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-18T21:24:56.660Z",
+  "updatedAt": "2026-08-18T21:36:20.860Z",
   "currentRun": {
     "title": "FEAT001 SLICE02: Disposition in-flight FEATs 230/259/284/299",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
     "startedAt": "2026-08-18T21:24:56.660Z",
-    "updatedAt": "2026-08-18T21:24:56.660Z",
-    "next": "Begin implementation",
+    "updatedAt": "2026-08-18T21:36:20.859Z",
+    "next": "SLICE-03 owns AC-3 (28-triaged-FEAT three-bucket sweep, moot/carry/defer), AC-4 (stale worktree branch salvage-or-delete: backfill, feat-reconcile, fix-427, fix-481, fix-format, release-073), and AC-5 (pre-devcrew-baseline tags in both repos).",
     "gates": {
       "review": null,
       "validation": null,
@@ -23,7 +23,9 @@
     },
     "artifacts": {
       "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T212456Z-run-brief-feat001-slice02-disposition-in-flight-feats-230-259-284-299.md",
-      "handoffs": [],
+      "handoffs": [
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T213620Z-handoff-slice-02-disposition-in-flight-feats-230-259-284-295-296-297.md"
+      ],
       "reviewResult": null,
       "validationPlan": null,
       "validationResult": null,

```

## Files touched

### C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-007.md

```
---
id: FEAT-007
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-230 (task-driven skill selection, decommission presets as the skill source) after P0 parent-estate settlement. SLICE-195 (live crew skill catalog enumerator) already shipped in runner-plugin, evidenced at .claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md and src/scripts/lib/skill-catalog.mts. Remaining scope, re-framed for the merged repo where the crew<->runner seam this FEAT bridges no longer exists: build a task-signal (stack:*/concern:*/surface:*) to skill mapping/matcher table that resolves against the single merged skills/ tree (no more loop.crewRepoPath cross-plugin gating or skip-path posture), wire resolve-skills CLI (loop.mts resolve-skills, currently --variant fe|be|single preset-driven) to accept --slice/--tags with the old pickBlock path kept as fallback, add a resolve-time + CI fixture-snapshot validation gate so a resolved skill id absent from the live catalog fails loudly instead of silently no-oping (the original dead-ID defect: dotnet-only.json/dotnet-react.json/dotnet-typescript-vue.json referenced csharp-pro/react-engineering/frontend-advisory/a11y-advisory/vue-engineering, all removed when crew reorganized skills/domain/), and record a DEC for decommissioning preset.roles.*.skills/fe.skills/be.skills as the skill source. Carry a known correction forward: catalog enumeration must be recursive keyed on SKILL.md basename, not a flat top-level listing -- a flat lookup against crew's nested skills/domain tree produces false-negative 'missing' skills that are actually live but nested (see runner-plugin FEAT-230.md, 'Corrected drift measurement' section). Cross-plugin docs/upstream-request amendment work (the old SLICE-198) is largely moot post-merge and can be dropped from scope.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
```

### C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-008.md

```
---
id: FEAT-008
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-259 (agent SendMessage report-back enforcement) after P0 parent-estate settlement. Three of five slices already shipped in runner-plugin: SLICE-187 (SubagentStop report-gate hook, hooks/report-gate.mjs, shipped default-off with a known prompt-text-proximity false-positive risk documented in FEAT-259.md), SLICE-184 (mandatory final-act SendMessage line across owned agent templates), and SLICE-185 (orchestrator-watchdog decision logic in src/scripts/lib/orchestrator-watchdog.mts, shipped deliberately UNWIRED -- no production caller exists because nothing scriptable in runner-plugin can observe a live subagent idle/stop state; parseChangedPaths there also has a disclosed gap on quoted/renamed git paths that must be hardened before any execution point is added). Remaining scope, cheaper to build once crew and runner share one dispatch loop than to keep coordinating across the seam: (1) the structured receipt schema ({status, items[], commit_shas[], evidence_path, deviations[]}, target <=15 lines) documented and adopted by dispatch prompt templates, and (2) idle-ping suppression -- swallow bare idle_notification pings emitted after a report was already delivered and acknowledged (measured at 100% recurrence, 6-of-6 and 9-of-9 in two separate runner-plugin sessions, distinct from FEAT-259's already-fixed missing-report case) -- wired into the dispatch loop's context-budget hygiene. Note the FEAT's own finding that shipped SLICE-184 and SLICE-187 are independent, not reinforcing: an owned agent's .md template content never reaches the transcript first turn that the report-gate hook scans, so the receipt-schema and idle-suppression work still needs its own real coverage, not just closure.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
```

### C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-009.md

```
---
id: FEAT-009
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-284 (git-anchored slice completion silently drops planned work on prose-only commit matches) after P0 parent-estate settlement. 5 of 7 slices already shipped in runner-plugin (src/scripts/lib/slice-linker/git-anchored-completion.mts, src/scripts/lib/proposed-slices.mts): SLICE-188 (real file-touching test fixtures replacing --allow-empty), SLICE-189 (diff-level evidence requirement + AC-7 subject-only token-pair matching), SLICE-190 (downgrade text-only matches to operator-visible warnings), SLICE-192 (materializeProposedSlices rewritten to key off id_suffix identity instead of an existingSlices.length prefix index), and SLICE-194 (AC-8 squash-merge bullet-line matching). Remaining scope: SLICE-191 (migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape so stale legacy stamps are re-derived under the new rules rather than trusted) and SLICE-193 (CLI escape hatch to force-materialize one named proposed slice by id_suffix, so a gapped FEAT can be repaired without calling BacklogStore directly, as the original live repro required). Both are internal backlog-data-model logic, not crew-seam-dependent. Explicitly carry forward an open caveat from runner-plugin's FEAT-284.md 'AC-8b status' section: live-HEAD recognition of real squash-merge evidence (e.g. commit 859be561) is NOT yet satisfied -- commits.find() selects a newer narration commit and never continues to the qualifying one -- and that gap is tracked as a separate defect (runner-plugin's FEAT-294, itself triaged but not yet in-flight) rather than part of SLICE-191/193's scope. Do not treat AC-8b as closed when scoping this carried FEAT.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
```

### C:/mega/dev-crew/.claude/artifacts/loop/backlog/pending/FEAT-010.md

```
---
id: FEAT-010
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-299 (proposed-slices.mts validation gaps made load-bearing by SLICE-192's identity keying) after P0 parent-estate settlement, full scope -- SLICE-207 was never built in runner-plugin (verified: no worktree, no branch, no dispatch result, no merge commit on main), per dev-crew's own DEC-001 ('SLICE-207/FEAT-299 disposition is carry, not build'). Two gaps in src/scripts/lib/proposed-slices.mts, both now load-bearing because SLICE-192 (shipped, see FEAT-284) replaced count-based slice materialization with identity keying via a proposed_slice_id_suffix frontmatter stamp, with the ~200 pre-existing slices falling back to an exact title-match against proposed_slices[].title. Gap A: no uniqueness validation on proposed_slices[].title or id_suffix within a FEAT -- a duplicate title makes matchProposedIdSuffix's .find() collapse two legacy slices onto one id_suffix (recreating a FEAT-284-class duplicate-slice bug through a different door), while a duplicate id_suffix silently swallows one proposed entry so it is never created at all. Gap B (worse): clampSliceTitle trims whitespace before storing a slice's title, but proposed-slices.mts validates the raw untrimmed string, so a proposed title with leading/trailing whitespace can never === match its own stored entry on the legacy fallback -- causing an UNBOUNDED duplicate-recreation loop on every rerun of slice from-feature, each iteration publishing a fresh tracker issue (loop.mts:1567-1574), the same mechanism that turned the original FEAT-284 duplicate into GitHub issue 598. Acceptance direction: trim before validating/storing (or compare trimmed on the fallback path) plus a regression test asserting no growth across repeated reruns; add uniqueness validation on both title and id_suffix within a FEAT's proposed_slices, rejecting with a message naming the duplicate; scan the existing backlog for pre-existing duplicates before enabling the check so it does not fail CI on historical data unannounced.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-295.md

```
---
id: FEAT-295
status: done
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-205]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.75
pm_technical_risk: 0.3
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Twin of the review-gate.mts grandfather clause SLICE-202 deleted per explicit owner decision (unbounded, not date-bounded — covers an artifact written this minute): validation-gate.mts's resolveVerdictOutcome (~line 158) treats any validation artifact lacking a decision key as satisfied. Review and validation are the loop's two behavioral gates; leaving one hardened and one permissive means the permissive one sets the real floor, so this should track FEAT-283/SLICE-202's severity — P1. This repo's reviewers.ladder [A] + loop.validation.satisfiedByReview:true reduces local blast radius (validation gate is usually satisfied by the reviewer badge here) but the FEAT is explicit this is product surface for adopter repos with a different ladder, so priority isn't discounted. Playbook is already established (SLICE-202 did the equivalent for ReviewGateResult), and scale must be counted first (review corpus was 160/211 frontmatter-less) before deleting the branch, since any open slice relying solely on a frontmatter-less validation artifact needs re-validation or an explicit validation_skipped badge. Related: FEAT-283/SLICE-202, FEAT-291 (same gate area, different drift shape). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Delete validation-gate.mts's unbounded null-decision grandfather clause"
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given resolveVerdictOutcome in validation-gate.mts (around line 158) currently treats a validation artifact with no decision key as satisfied (legacy, no decision frontmatter, grandfathered pre-P1.3), When this slice ships, Then that branch is deleted so a decision-less validation artifact no longer satisfies the gate, mirroring SLICE-202's removal of the equivalent review-gate.mts branch.", "AC-2: Given the validation corpus under .claude/artifacts/crew/validations has not yet been counted for missing-decision-key coverage, When this slice starts, Then it counts the corpus first (matching how the review corpus's 160/211 frontmatter-less figure was produced) and reports the number before deleting the branch.", "AC-3: Given any currently-open slice whose only validation evidence is frontmatter-less, When the corpus count identifies it, Then each such slice is named so it can be re-validated or given an explicit validation_skipped badge before the branch is deleted.", "AC-4: Given this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview:true, When the branch is deleted, Then the module header comment documenting the grandfathering behavior is also updated, and any now-dead legacy flag and its consumers (the pattern SLICE-202 followed for ReviewGateResult) are removed."]
    touches_files: [src/scripts/lib/validation-gate.mts, .claude/artifacts/crew/validations, src/tests/validation-gate.test.mts]
started_at: 2026-08-06
completed_at: 2026-08-18
slices_complete: [SLICE-205]
github_issue: 627
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/627"
p0_merge_evidence: "8a498553 merge: SLICE-205 (delete unbounded validation-gate grandfather clause) — wave 1"
---
## Description

validation-gate.mts carries a second unbounded grandfather clause, twin of the one deleted from review-gate.mts.

SLICE-202 deleted review-gate.mts's null-decision grandfather branch on 2026-08-05, per an explicit owner decision to clean this code of arbitrary cutoff and legacy-tolerance special cases rather than bound them with a date. builder-202 found and correctly flagged, rather than silently fixing, that validation-gate.mts has its own equivalent: resolveVerdictOutcome around line 158 applies the same treatment to validation artifacts that lack a decision key.

The same reasoning applies without modification. The clause is unbounded, so it covers an artifact written this minute, not merely genuinely historical ones. A validation artifact with no decision key proves nothing about whether the behavior was actually validated, and treating its absence of a verdict as a pass means the validation gate can be satisfied by a file that never recorded an outcome. Review and validation are the two behavioral gates in the loop; leaving one hardened and the other permissive means the weaker one sets the real floor.

Scale is likely comparable and should be measured before the change, not assumed. The review corpus turned out to be 160 of 211 artifacts lacking a decision key, roughly 76 percent, of which 85 had no frontmatter block at all. The validations directory has not been counted. Do that first, because the number determines how much re-validation the change creates and whether any currently-open slice depends on a frontmatter-less validation artifact to close.

Relevant local context: this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview true, so the close-time validation gate is normally satisfied by the reviewer approval badge rather than by a validation artifact. That reduces the blast radius here relative to review-gate, but it does not remove it, and it does not hold for adopter repos that ship this plugin with a different ladder or without satisfiedByReview. This is product surface, not just this repo's own configuration.

Acceptance direction. Count the validation corpus and identify any open slice whose only validation evidence is frontmatter-less, naming each so it can be re-validated or given an explicit validation_skipped badge. Delete the null-decision branch so such artifacts are unproven rather than satisfied. Remove any now-dead legacy flag and its consumers, as SLICE-202 did for ReviewGateResult. Update the module header comment, which documents the grandfathering behavior. Then sweep for any third instance of this pattern in other gate modules rather than assuming these two were the only ones.

Consider also whether the two gates should share one resolution helper instead of carrying parallel implementations that drifted apart, since parallel copies diverging is what allowed one to be hardened while the other was not.

Related: FEAT-283 and its SLICE-202 (the review-gate half), FEAT-291 (code-versus-prose vocabulary drift in the same gate area).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Delete validation-gate.mts's unbounded null-decision grandfather clause (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given resolveVerdictOutcome in validation-gate.mts (around line 158) currently treats a validation artifact with no decision key as satisfied (legacy, no decision frontmatter, grandfathered pre-P1.3), When this slice ships, Then that branch is deleted so a decision-less validation artifact no longer satisfies the gate, mirroring SLICE-202's removal of the equivalent review-gate.mts branch.
- AC-2: Given the validation corpus under .claude/artifacts/crew/validations has not yet been counted for missing-decision-key coverage, When this slice starts, Then it counts the corpus first (matching how the review corpus's 160/211 frontmatter-less figure was produced) and reports the number before deleting the branch.
- AC-3: Given any currently-open slice whose only validation evidence is frontmatter-less, When the corpus count identifies it, Then each such slice is named so it can be re-validated or given an explicit validation_skipped badge before the branch is deleted.
- AC-4: Given this repo runs reviewers.ladder [A] with loop.validation.satisfiedByReview:true, When the branch is deleted, Then the module header comment documenting the grandfathering behavior is also updated, and any now-dead legacy flag and its consumers (the pattern SLICE-202 followed for ReviewGateResult) are removed.

```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-296.md

```
---
id: FEAT-296
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-208]
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.5
pm_technical_risk: 0.3
pm_dependency_depth: 0.2
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Slice-directory and slice-frontmatter are two independent state records with nothing reconciling them: SLICE_118 exists in both ai-loop/slices/pending/ and ai-loop/slices/completed/ with contradictory content (not just location), and SLICE_128/SLICE_130/SLICE_55 sit in pending/ while their own frontmatter says done/done/superseded. Already caused real damage this session, not merely theoretical: the wrong '28 pending slices' count fed FEAT-288's priority scoring, and builder-202's open-slice sweep for SLICE-202's gate change flagged SLICE-118 as open purely because it read the pending copy. Bounded to 4 known cases plus a new CI validator (same pattern as validate-slice-touches-files.mts), so effort and risk stay moderate; not elevated to P1 because, unlike FEAT-298/FEAT-297, no live gate-verdict misread has been traced directly to these four cases beyond the triage-input contamination already described. SLICE-118 resolution must precede FEAT-298's SLICE-2 (renumbering) touching the same file. Related: FEAT-284 (slice state drifting from reality, same family), FEAT-291, FEAT-288 (a second, feature-level instance with real data loss, documented in this FEAT's body), FEAT-298 (adjacent id-collision defect, distinct remedy). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Reconcile slice state drift and add directory/frontmatter consistency validator
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md exists in both ai-loop/slices/pending/ and ai-loop/slices/completed/ with divergent status frontmatter, When this slice reconciles it, Then the decision is made on evidence (git history, review/validation artifacts) rather than by picking a copy, and only one copy remains.", "AC-2: Given SLICE_128 and SLICE_130 (status: done) and SLICE_55 (status: superseded) sit in pending/ while their own frontmatter contradicts that filing, When this slice ships, Then each is moved (or otherwise reconciled) to match its frontmatter status so pending/ no longer overcounts open work.", "AC-3: Given no gate currently asserts that a slice id appears in only one state directory or that its frontmatter status agrees with its directory, When the new validator (src/scripts/validate-slice-state-consistency.mts) runs, Then it fails on a slice id present in more than one state directory, and separately fails on a frontmatter-status/directory disagreement, in the style of the existing validate-slice-touches-files.mts.", "AC-4: Given the validator is new, When CI runs, Then it is wired into CLAUDE.md's numbered CI gate list so the four known cases cannot recur unnoticed."]
    touches_files: [.claude/artifacts/loop/ai-loop/slices/pending/SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md, .claude/artifacts/loop/ai-loop/slices/completed/SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_128_GITHUB-CREW-PR-COMMENT-TEAMMATE.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_130_DECAY-RANKED-CITATION-TRACKED-LEARNINGS-RETRIEVAL-INJECTED-A.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_55_WORKTREE-CREATION-AT-SLICE-START.md, src/scripts/validate-slice-state-consistency.mts, CLAUDE.md]
started_at: 2026-08-06
completed_at: 2026-08-18
slices_complete: [SLICE-208]
github_issue: 633
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/633"
p0_merge_evidence: "67017b5e merge: SLICE-208 (reconcile slice-state drift + consistency validator) — wave 1"
---
## Description

Slice-state filing drift: one slice exists in two state directories at once, and three more sit in pending/ while their own frontmatter says they are finished.

Found 2026-08-05 while verifying which open slices are affected by SLICE-202's grandfather-clause deletion. The slice directory tree and slice frontmatter are two independent records of the same state, nothing reconciles them, and they have diverged.

Duplicate across directories. SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md exists in BOTH ai-loop/slices/pending/ and ai-loop/slices/completed/. The two files differ in content, not just location, and each is internally consistent with the directory it sits in: the pending copy says status pending, the completed copy says status completed. So SLICE-118 is simultaneously open and closed depending on which file a reader happens to find. A directory sweep finds it twice; a status query answers differently by path. Verified this is the only slice duplicated across those two directories.

Status-versus-directory drift. Three files sit in pending/ while their own frontmatter contradicts it: SLICE-128 (status done), SLICE-130 (status done), SLICE-55 (status superseded). These are not duplicates, just misfiled — but the effect is the same, any consumer that enumerates pending/ as the set of open work overcounts.

Consequences observed today. Every count of open slices this session was wrong. The figure 28 pending slices was quoted repeatedly, including into a PM triage brief that fed FEAT-288's priority scoring; the real number of genuinely open slices is at least four lower. builder-202, sweeping for open slices whose only review evidence lacks a decision key, reported SLICE-118 as open and needing re-review — it read the pending copy. The completed copy says otherwise. Only SLICE-119 is genuinely open and genuinely affected.

Defect class. Two representations of one fact with no gate asserting they agree. Same shape as FEAT-291 (verdict vocabulary duplicated between review-gate.mts and the reviewer skill prose) and FEAT-288 (touches_files written in one shape, read in another). Each half is individually well-formed and the disagreement is invisible until something depends on it.

Acceptance direction. Reconcile the four known cases first, deciding SLICE-118 on evidence rather than by picking a copy: check git history and any review or validation artifacts for it before deleting either file. Then add a validator, in the style of the existing validate-slice-touches-files.mts, that fails when a slice id appears in more than one state directory, and when a slice's frontmatter status disagrees with the directory it is filed under. Wire it into CI so the two records cannot drift again unnoticed.

Consider whether the directory should stop being a state record at all, with frontmatter as the single source and the directory purely an index — parallel records that must be manually kept in step are what produced this.

Related: FEAT-284 (slice state drifting from reality, same family), FEAT-291, FEAT-288, SLICE-202 (whose open-slice sweep surfaced it).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Live instance with data loss — FEAT-288, 2026-08-05

A second instance, caught the same day, this time at FEATURE level and involving
actual content loss. Worth recording in full because the mechanism is one an
agent or a human will hit again.

**What happened.** `slice from-feature --id FEAT-288` moved the file
`triaged/FEAT-288.md` → `in-progress/FEAT-288.md`. Later in the same session I
appended a correction with `cat >> .claude/artifacts/loop/backlog/triaged/FEAT-288.md`
— the stale path. `cat >>` does not fail on a missing file; it CREATES one. So a
phantom `triaged/FEAT-288.md` appeared containing only the appended text: no
`id`, no `priority`, no `slices`, no `proposed_slices`, no PM scores, no
`## Description`. 43 lines against the real file's 71.

`slice complete` then moved that phantom `triaged/` → `done/`, and the backlog
held two FEAT-288 files with divergent content in two state directories.

**The damage was not the duplicate — it was where the writes went.** The
correction I believed I had made to FEAT-288's scoring premise was never in the
real FEAT; it lived only in the phantom. Closing SLICE-204 then wrote
`slices_complete: [SLICE-204]` into the real file, which had no record of
SLICE-203, so the close gate refused with "SLICE-203 still pending" even though
SLICE-203 was genuinely completed. The completion record and the correction had
gone to different files.

Had the phantom been treated as authoritative and the other deleted, FEAT-288
would have lost its PM scores, slice list, and the per-slice `acceptance_criteria`
that were the point of FEAT-290's work that day.

**Two contributing failures, both mine.** Appending to a path without checking
the file still lived there, and staging with `git add -A` without inspecting the
file list — commit `bd5293d2` captured the phantom, and commit `41f232aa`
created it, neither noticed.

**Repair performed:** merged the phantom's correction text into the real file,
deleted the phantom, repaired `slices_complete` to `[SLICE-203, SLICE-204]`,
re-ran the close. FEAT-288 is now a single 110-line file in `done/` with all
frontmatter and both sections intact.

**Bearing on this FEAT's acceptance direction.** The proposed validator must
catch this shape too, not only slice-level drift: a FEAT id appearing in more
than one backlog state directory, and a file whose frontmatter is missing
required keys (`id`, `status`, `priority`) which is what a phantom looks like.
The second check is the stronger one — it catches the phantom at creation rather
than after a state move has propagated it.

## Separate finding — FEAT-240 is an ID COLLISION, not filing drift

Found in the same sweep and NOT the same defect. `done/FEAT-240.md` (P1,
`category: bug`) and `triaged/FEAT-240.md` (P3, `category: maintenance`) are two
genuinely different features that were allocated the same id. Pre-existing,
introduced in commit `b6b3562b` on 2026-07-18, unrelated to this session.

This belongs with the id-allocation work (DEC-079 / FEAT-257, collision-proof
allocation via fetch-scan max+1) rather than with directory/frontmatter
reconciliation. Recorded here only because the duplicate-id sweep surfaces both
and a validator written for one will report the other — it should distinguish
them, since the remedies differ: reconcile-and-delete for drift, renumber for a
collision.

## Open slices blocked by the SLICE-202 gate change — 2026-08-05

Three `status: pending` slices whose only review evidence lacks a `decision`
key, so they will not close under the deleted-grandfather rule until re-reviewed
or given an explicit `review_skipped` badge:

- **SLICE-119** — both matching artifacts frontmatter-less
- **SLICE-116** — four matching artifacts, all with a frontmatter block but no
  `decision:` key. **Missed by the builder's sweep; found by the reviewer's
  independent one.** Worth noting the builder's sweep looked for artifacts with
  no frontmatter block at all and did not catch block-present-but-key-absent,
  which is 75 of the 160 affected artifacts — the larger half.
- **SLICE-118** — reported as blocked, but see above: it is the directory-drift
  case, `completed/` copy says completed. Reconcile it rather than re-reviewing.

SLICE-128 and SLICE-130 were correctly excluded — `status: done` despite sitting
in `pending/`.

SLICE-116's four artifacts span TWO different parent FEATs (`feat-169-slice-116`
×2, `feat-183-slice-116` ×2), which is not a filing quirk — it is the signature
of the id collision recorded in FEAT-298. Artifacts for two unrelated slices are
pooled under one id token, so "SLICE-116's review evidence" is not a well-defined
set. Re-reviewing it requires resolving the collision first; a `review_skipped`
badge would apply to whichever slice wins the id lookup, which is not necessarily
the one anybody intended.

## Proposed slices (PM decomposition)

- SLICE-1: Reconcile slice state drift and add directory/frontmatter consistency validator (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md exists in both ai-loop/slices/pending/ and ai-loop/slices/completed/ with divergent status frontmatter, When this slice reconciles it, Then the decision is made on evidence (git history, review/validation artifacts) rather than by picking a copy, and only one copy remains.
- AC-2: Given SLICE_128 and SLICE_130 (status: done) and SLICE_55 (status: superseded) sit in pending/ while their own frontmatter contradicts that filing, When this slice ships, Then each is moved (or otherwise reconciled) to match its frontmatter status so pending/ no longer overcounts open work.
- AC-3: Given no gate currently asserts that a slice id appears in only one state directory or that its frontmatter status agrees with its directory, When the new validator (src/scripts/validate-slice-state-consistency.mts) runs, Then it fails on a slice id present in more than one state directory, and separately fails on a frontmatter-status/directory disagreement, in the style of the existing validate-slice-touches-files.mts.
- AC-4: Given the validator is new, When CI runs, Then it is wired into CLAUDE.md's numbered CI gate list so the four known cases cannot recur unnoticed.

```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/done/FEAT-297.md

```
---
id: FEAT-297
status: done
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-206]
derived_from: null
pm_customer_impact: 0.8
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.6
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Live, active blocker on in-flight FEAT-230: extractAcceptanceCriteriaDetailed (backlog-store/slice-store.mts) captures only the first physical line of each markdown AC bullet, and FEAT-230 wrapped its ACs across multiple lines (normal markdown), so SLICE-196 through SLICE-199 all carry ACs that end mid-clause with no Then clause — a builder handed these has nothing to build against or verify at close. Silent by construction (a truncated AC is still a well-formed checkbox item), and this same extractor also backs assertAcceptanceCriteria's presence gate, so the risk generalizes to any FEAT whose ACs wrap. High customer_impact because it directly blocks 4 already-scoped, in-flight slices right now, not a latent risk. Fix is a contained parsing change (accumulate continuation lines) plus a byte-for-byte fixture test and backfilling SLICE-197/198/199 (SLICE-196 already hand-corrected) — moderate effort, low-to-moderate risk, single module. Related: FEAT-290 (per-slice ACs never produced, the other half of why slices carry wrong ACs), FEAT-230 (the affected slices). No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Fix AC extractor line-truncation and backfill SLICE-197/198/199
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given extractAcceptanceCriteriaDetailed in slice-store.mts currently captures only the first physical line of each markdown bullet, When a FEAT's AC bullet wraps across multiple lines (the normal markdown shape), Then the extractor accumulates continuation lines until the next bullet, a blank line followed by a non-indented line, or the next heading.", "AC-2: Given a test fixture FEAT with deliberately wrapped ACs, When the extractor runs against it, Then the extracted text matches the source AC text in full, byte for byte, not truncated mid-clause.", "AC-3: Given assertAcceptanceCriteria (slice-store.mts:294) relies on the same extraction to decide whether a FEAT has real ACs at all, When this fix ships, Then a regression test confirms a FEAT whose ACs all wrap no longer risks passing the presence check while delivering fragments.", "AC-4: Given SLICE_197, SLICE_198, and SLICE_199 (SLICE_196 already hand-corrected) currently carry the truncated first-line-only ACs from FEAT-230, When this slice ships, Then all three are backfilled or regenerated with their complete acceptance criteria from FEAT-230."]
    touches_files: [src/scripts/lib/backlog-store/slice-store.mts, src/tests/extract-acceptance-criteria.test.mts, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_197_RESOLVE-SKILLS-CLI-SLICE-TAGS-INTEGRATION-PICKBLOCK-FALLBACK.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_198_CROSS-PLUGIN-DOCS-UPSTREAM-REQUEST-AMENDMENT.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_199_CI-FIXTURE-SNAPSHOT-GATE-DEC-071-WRITE-UP.md]
started_at: 2026-08-06
completed_at: 2026-08-18
slices_complete: [SLICE-206]
github_issue: 629
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/629"
p0_merge_evidence: "0df469ff merge: SLICE-206 (fix AC extractor CRLF/wrapped-bullet truncation) — wave 1"
---
## Description

Slice generator truncates multi-line acceptance criteria to their first physical line, producing ACs that end mid-clause.

Found 2026-08-05 while scoping SLICE-196. FEAT-230's acceptance criteria are written wrapped across several lines each, which is normal markdown. extractAcceptanceCriteriaDetailed, used by slice-store.mts when a proposed_slices entry carries no per-slice acceptance_criteria, captures only the first physical line of each bullet. The generated slice therefore contains fragments:

- AC-1: GIVEN a slice tagged stack:csharp + concern:security, WHEN the
- AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN the
- AC-3: GIVEN a repo with presets present, WHEN the dispatcher resolves skills,
- AC-4: GIVEN the resolver output, WHEN a builder is dispatched, THEN the

Every one ends mid-sentence. The real AC-1 continues THEN it returns only skill IDs that EXIST in the live crew catalog, matched to the task signals — the entire requirement is in the truncated part. A builder handed this slice sees a Given and a dangling When with no Then, so there is nothing to build against and nothing to verify at close.

This is distinct from the copied-sibling-ACs problem filed as FEAT-290, and it did not surface earlier because it depends on how the FEAT author wrapped their text. FEAT-283 and FEAT-284 wrote each AC as one long physical line, so their generated slices carried complete ACs. FEAT-230 wrapped, so its four slices — SLICE-196 through SLICE-199 — all carry truncated ones. The two defects compose badly: the shared-AC fallback copies the wrong ACs, and this then truncates them.

Silent by construction. A truncated AC is still a well-formed markdown checkbox item, so no gate notices, the slice file looks complete, and the loss is only visible by comparing against the source FEAT.

Acceptance direction. Teach the extractor to accumulate continuation lines: a bullet continues until the next bullet, a blank line followed by a non-indented line, or the next heading. Indented continuation lines are the normal markdown shape and are what it currently drops. Add a test whose fixture FEAT has deliberately wrapped ACs and assert the extracted text matches the source in full, byte for byte.

Then check the other consumers of the same extractor rather than assuming this is the only caller — the assertAcceptanceCriteria gate referenced in slice-store.mts:294 relies on the same extraction to decide whether a FEAT has real ACs at all, so a FEAT whose ACs all wrap could in principle pass a presence check while delivering fragments.

Backfill note: SLICE-196 through SLICE-199 already exist with truncated ACs. SLICE-196 has been hand-corrected. The other three need the same treatment or regeneration once this is fixed.

Related: FEAT-290 (per-slice ACs never produced — the other half of why slices carry wrong ACs), FEAT-230 (whose four slices are the affected set).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Fix AC extractor line-truncation and backfill SLICE-197/198/199 (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given extractAcceptanceCriteriaDetailed in slice-store.mts currently captures only the first physical line of each markdown bullet, When a FEAT's AC bullet wraps across multiple lines (the normal markdown shape), Then the extractor accumulates continuation lines until the next bullet, a blank line followed by a non-indented line, or the next heading.
- AC-2: Given a test fixture FEAT with deliberately wrapped ACs, When the extractor runs against it, Then the extracted text matches the source AC text in full, byte for byte, not truncated mid-clause.
- AC-3: Given assertAcceptanceCriteria (slice-store.mts:294) relies on the same extraction to decide whether a FEAT has real ACs at all, When this fix ships, Then a regression test confirms a FEAT whose ACs all wrap no longer risks passing the presence check while delivering fragments.
- AC-4: Given SLICE_197, SLICE_198, and SLICE_199 (SLICE_196 already hand-corrected) currently carry the truncated first-line-only ACs from FEAT-230, When this slice ships, Then all three are backfilled or regenerated with their complete acceptance criteria from FEAT-230.

```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-230.md

```
---
id: FEAT-230
status: in-progress
priority: P1
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-08-04
depends_on: [FEAT-218]
slices: [SLICE-195, SLICE-196, SLICE-197, SLICE-198, SLICE-199]
derived_from: null
tags: [architecture, backend, dispatch, cross-plugin, skills]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: 2026-08-02
triage_notes: "P1: real, evidenced fleet-wide skill-injection breakage with a contract already landed and de-risked into 5 slices; technical_risk lands in the 0.9-1.0 band per the rubric (public/cross-plugin contract change -- crew's orchestrate-slice consumer) since two plugins' output contracts must stay compatible or be jointly updated."
github_issue: 491
github_url: "https://github.com/astragenie/runner-plugin/issues/491"
pm_customer_impact: 0.6
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.75
pm_technical_risk: 0.9
pm_dependency_depth: 0.6
pm_composite_priority: P1
pm_autonomous_safe: false
proposed_slices:
  - id_suffix: -SLICE-1
    title: Live crew skill catalog enumerator
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Task-signal to skill mapping/matcher table
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: resolve-skills CLI --slice/--tags integration + pickBlock fallback
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Cross-plugin docs + upstream-request amendment
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-5
    title: CI fixture-snapshot gate + DEC-071 write-up
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-04
slices_complete: [SLICE-195]
p0_disposition: carry
p0_reason: "SLICE-195 (catalog enumerator) shipped; remaining SLICE-196-199 (mapping/matcher, CLI --slice/--tags integration, cross-plugin docs, CI fixture-snapshot gate) are cross-plugin/seam-dependent (loop.crewRepoPath gating, orchestrate-slice consumer contract) per the FEAT's own contract doc. Carry to dev-crew, where the merge collapses the crew<->runner seam this FEAT exists to bridge: the live-catalog skill resolver becomes a simpler in-repo lookup against one merged skills/ tree, with no crewRepoPath detection, no skip-path posture, and no cross-plugin docs/upstream-request slice needed. Re-scope SLICE-196/197 to drop the seam-crossing machinery before building in dev-crew; SLICE-198 (cross-plugin docs) is largely moot post-merge and SLICE-199's CI gate still applies in-repo."
---
# FEAT-230: task-driven skill selection — decommission presets as the skill source

## Contract landed (2026-07-08)

Architect design artifact:
`.claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md`
(5 decisions, Options-Considered each; verified live against `dev-team/skills/domain/*`).

- **Decision 1 (central):** enumerate `<crewRepoPath>/skills/domain/**` recursively
  at resolve time (marker `SKILL.md`), gated on `loop.crewRepoPath` (reuse
  `eval-generator.mts:65-69` pattern, DEC-068 precedent). **Rejected the
  hardcoded-allowlist** — `validate-agent-refs.mts`'s `CREW_KNOWN_TOKENS` is the
  *same* drift-failure shape this FEAT fixes, not a fix.
- **Decision 2:** explicit hand-authored `Record<tagToken, skillId[]>` table,
  validated (never derived) against the live catalog. Rejected trigger-frontmatter
  heuristic matching.
- **Decision 3 (gap the FEAT glossed):** `resolve-skills` CLI (`loop.mts:712-753`)
  has **no task/tag input today** — `--variant` selects a role only. The upstream
  "only the path changes" premise
  (`docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md:55`)
  is false once task-driven selection lands → add an additive `--slice`/`--tags`
  flag, keep the old `pickBlock` path as fallback (DEC-069 "demote don't delete").
- **Decision 4:** layered validation — resolve-time catalog check (load-bearing)
  + CI fixture-snapshot regression guard on the mapping table.
- **Present-day finding:** this repo's own `.claude/loop.json` has **no
  `crewRepoPath`**, and the default `slice-build` dispatch
  (`dispatch.mts:69-80`) never calls `resolve-skills` — so AC-3 is trivially true
  for this repo's own default path. Real integration point = the CLI/resolver core
  + crew's external `orchestrate-slice.md` consumer, NOT a new in-loop call site.

Proposed slices: SLICE-1 catalog enumerator → SLICE-2 mapping/matcher →
SLICE-3 CLI integration + fallback → SLICE-4 cross-plugin docs (amend the
upstream-request) → SLICE-5 CI gate + DEC-071. Still `autonomous_safe: false`
(cross-plugin) — build behind the contract with a review-heavy lane.

## Origin

Operator request, 2026-07-06. An upstream-request audit surfaced a concrete
failure: this repo's presets (`dotnet-only.json`, `dotnet-react.json`,
`dotnet-typescript-vue.json`) reference crew skill IDs that **no longer exist**
(`csharp-pro`, `react-engineering`, `frontend-advisory`, `a11y-advisory`,
`vue-engineering`, … removed when crew reorganized `skills/domain/` into
`architecture`/`backend`/`ui`/`security-advisory`/…). The dispatcher injects
those dead IDs → **skill injection silently no-ops for those stacks**.

Root cause is architectural, not a typo: skill selection is driven by a
**frozen, hand-maintained per-stack list** in the preset (`preset.roles.<role>.
skills`, `preset.fe/be.skills`), resolved via `loop.mts resolve-skills --variant
<fe|be|single>`. That list drifts from crew's live catalog with every crew
reorg. FEAT-218 already demoted presets to install-time-only templates; this FEAT
finishes the job — **remove presets as the skill source entirely** and select the
best-fit skill set from the LIVE catalog by task.

## Goal

At builder-dispatch time, the dispatcher picks the agent + skill set by matching
the **task's actual needs** (the slice/FEAT's `tags`: `stack:*`, `concern:*`,
`surface:*`) against the **skills that actually exist in the crew catalog** — not
a preset's frozen list. Dead/renamed IDs become impossible because selection only
ever returns real catalog entries.

## Scope

1. **Live skill catalog source.** Discover crew's real skill inventory at
   resolve time (enumerate `<crewRepoPath>/skills/domain/*` or a crew-published
   skill manifest — pin the exact source in the contract step; reuse the
   `loop.crewRepoPath` config from FEAT-222/DEC-068). READ-ONLY on crew.
2. **Task → skill resolver.** Replace `resolve-skills --variant <fe|be|single>`
   (preset-list-driven) with a resolver that maps slice/FEAT signals
   (`stack:csharp` → the C#/backend skills that exist; `concern:security` →
   `security-advisory`/`security-sweep`; `surface:frontend` → `ui`/`typescript-pro`;
   etc.) to the best-fit subset of the LIVE catalog. Deterministic + explainable
   (log which signals selected which skills).
3. **Decommission the preset skill role.** Remove `preset.roles.*.skills` /
   `preset.fe/be.skills` as the source of truth. Presets may still seed
   stack IDENTITY (build/test commands, contract/deployment) per FEAT-218's
   install-time-template model, but they no longer dictate skill IDs. Retire
   `--variant fe|be|single` skill semantics.
4. **Validation gate.** A check (CI + resolve-time) that every resolved skill ID
   exists in the live catalog — this would have caught the dead-ID drift. When a
   signal maps to nothing available, log a clear "no matching skill" rather than
   injecting a dead ID.
5. **Cross-plugin contract.** crew's `orchestrate-slice.md` consumes the resolved
   skills. Coordinate with the FEAT-218 slice-D upstream-request
   (`docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md`) —
   the resolver's OUTPUT contract (what the dispatch payload carries) must stay
   compatible or be jointly updated. Record a DEC.

## Acceptance criteria

- AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the
  dispatcher resolves skills, THEN it returns only skill IDs that EXIST in the
  live crew catalog (no `csharp-pro`/`react-engineering`-style dead IDs), matched
  to the task signals.
- AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN the
  resolver logs a clear "no matching skill for <signal>" and injects nothing for
  it — never a fabricated/dead ID (structural fix for the drift).
- AC-3: GIVEN a repo with presets present, WHEN the dispatcher resolves skills,
  THEN `preset.roles.*.skills` / `fe/be.skills` are NOT read as the skill source
  (grep proves no runtime read of preset skill lists in the dispatch path).
- AC-4: GIVEN the resolver output, WHEN a builder is dispatched, THEN the
  dispatch payload's skill block is compatible with what crew's `orchestrate-slice`
  consumes (contract preserved or jointly updated per the upstream-request).
- AC-5: A validation gate (CI + resolve-time) fails when a resolved/declared skill
  ID is absent from the live catalog.
- AC-6: Resolution is deterministic + explainable — a `--explain` (or log) shows
  which task signals selected which skills.
- AC-7: A DEC-* records the decommission-preset-skills decision + the live-catalog
  source + the task→skill mapping rules.
- AC-8: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Risks / open questions

- **Live-catalog source** — enumerate `skills/domain/*` directly vs a crew-published
  manifest. Directory enumeration is simplest but couples to crew's layout; a
  manifest is cleaner but doesn't exist yet (would be an upstream ask). Decide in
  the contract step.
- **Mapping rules** — `stack/concern/surface` → skills needs an explicit,
  reviewable table; avoid an opaque heuristic. Start from the tags the PM/architect
  already emit (FEAT-218 kept `tags`/`needs_contract`/`needs_ux`).
- **Cross-plugin timing** — crew's `orchestrate-slice` still hardcodes a preset
  path (slice-D, still open). This FEAT's resolver output must not break that
  during the migration window — sequence with the slice-D upstream request.
- **Offline / no-crew-repo** — when `loop.crewRepoPath` is unset, resolution must
  degrade gracefully (skip skill injection with a logged reason, never throw),
  mirroring FEAT-222's skip-path posture.

## Refs

- `src/scripts/lib/skill-resolver.mts` (`resolveSkills`) + `loop.mts resolve-skills`
  (the preset-driven resolver to replace).
- `scripts/presets/*.json` (`roles.*.skills`, `fe/be.skills` — the frozen lists to
  decommission as the skill source).
- FEAT-218 / DEC-069 (preset removal groundwork — presets already install-time-only).
- `loop.crewRepoPath` + DEC-068 (live crew-repo access, skip-path posture).
- `docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md` (slice-D — crew-side consumer).
- Evidence: upstream-request audit 2026-07-06 (dead skill IDs in this repo's presets).

## Proposed slices (PM decomposition)

- SLICE-1: Live crew skill catalog enumerator (2 pts)
- SLICE-2: Task-signal to skill mapping/matcher table (2 pts)
- SLICE-3: resolve-skills CLI --slice/--tags integration + pickBlock fallback (2 pts)
- SLICE-4: Cross-plugin docs + upstream-request amendment (1 pts)
- SLICE-5: CI fixture-snapshot gate + DEC-071 write-up (2 pts)

## Corrected drift measurement (2026-08-04) — flat listing undercounts the catalog

An earlier measurement in this session reported "13 live skills, 7 dead IDs".
**That was wrong**, and the error is instructive because it is the same
mistake the FEAT exists to fix.

The figure came from a flat `ls` of top-level `skills/domain/` directories.
crew's catalog is nested, and Decision 1 specifies a *recursive* walk with
`SKILL.md` as the marker. Enumerating properly (SLICE-195's enumerator, and
independently via `find ../dev-team/skills/domain -name SKILL.md`):

- **36 skills live**, not 13.
- **4 IDs genuinely dead**: `a11y-advisory`, `csharp-pro`,
  `frontend-advisory`, `vue-engineering`.
- **3 IDs previously called dead are live but nested**:
  `backend-advisory` (`architecture/backend-advisory`),
  `database-architecture` (`backend/database-architecture`),
  `react-engineering` (`ui/react-engineering`).

This strengthens the FEAT rather than weakening it. A flat lookup against a
nested catalog reports live skills as missing — which is precisely the
failure mode the preset drift produces, reproduced here by an operator doing
the check by hand. Resolving by basename regardless of nesting depth, as the
enumerator does, fixes both the original dead-ID problem and this
false-negative variant.

Still true and unchanged: `frontend-advisory` is genuinely dead AND declared
in this repo's own `.claude/loop.json`, so the drift is live here.

## Carried forward from SLICE-195 review: basename-collision guard

The catalog is keyed by skill basename (`out.set(entry.name, ...)`,
`skill-catalog.mts:105`). Two skills anywhere in the tree sharing a basename
would silently overwrite each other — no log, no error, last write wins.

Measured today: crew's real tree has **36 skills, 36 unique basenames**, so
this is latent, not live. Correctly out of scope for SLICE-195, which
implements Decision 1 only.

It should be caught by SLICE-196 (the mapping/matcher table) or SLICE-199
(the CI fixture-snapshot gate), whichever lands first. Recommended shape: log
a warning when `out.has(name)` is already true before overwriting, rather
than failing — a duplicate basename upstream in crew is not this repo's error
to block on, but it must not vanish silently.

The reason this matters more than an ordinary edge case: a silent overwrite
inside a catalog whose entire purpose is preventing silent skill-injection
failures would reproduce the FEAT's own defect one layer down. The same
observation applies to the flat-vs-nested lookup error recorded above.

Also noted by review, non-blocking: SLICE-195's fixtures cover 1-level
nesting only, while crew's real tree has 2-level nests
(`backend/dotnet/aspnetcore-patterns`, `csharp-conventions`,
`ef-core-patterns`). The reviewer verified those resolve correctly against
the real checkout, but a 2-level fixture would be worth adding when SLICE-199
builds its snapshot gate.

```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-259.md

```
---
id: FEAT-259
status: in-progress
priority: P1
category: enhancement
target_release: null
created: 2026-07-09
updated: 2026-08-04
depends_on: []
slices: [SLICE-187, SLICE-183, SLICE-184, SLICE-185, SLICE-186]
derived_from: null
tags: [be]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: 2026-08-03
triage_notes: "P1 (raised from the original P2): recurrence with zero decay after a month despite an existing documented lesson and active manual mitigation, unbounded and compounding operator/orchestrator attention cost as dispatch volume grows (wave mode expansion), and direct conflict with this repo's own 'do not stop for confirmation' autonomous-loop mission together outweigh the now-confirmed-smaller (but not zero) implementation surface. Pre-mortem completed above per the mandatory P1 trigger."
github_issue: 504
github_url: "https://github.com/astragenie/runner-plugin/issues/504"
pm_customer_impact: 0.68
pm_effort_estimate: 0.58
pm_strategic_alignment: 0.65
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
proposed_slices:
  - id_suffix: -SLICE-1
    title: "SubagentStop report-gate hook, registered into existing hooks.json array"
    points: 1
    estimated_tokens: 80000
  - id_suffix: -SLICE-2
    title: Structured receipt schema definition + docs
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Mandatory final-act line across all dispatch agent templates (batch)
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-4
    title: Orchestrator watchdog rule (auto-nudge-once + fresh-mtime guard)
    points: 2
    estimated_tokens: 120000
  - id_suffix: -SLICE-5
    title: Idle-ping suppression + context-budget wiring into dispatch loop
    points: 1
    estimated_tokens: 60000
proposed_slices_shipped: []
proposed_slices_shipped_commits: []
started_at: 2026-08-04
slices_complete: [SLICE-187, SLICE-184, SLICE-185]
p0_disposition: carry
p0_reason: "SLICE-187 (report-gate hook), SLICE-184 (final-act line), SLICE-185 (watchdog, shipped deliberately unwired) are shipped. Remaining SLICE-183 (structured receipt schema + docs) and SLICE-186 (idle-ping suppression + context-budget wiring) carry to dev-crew per the plan's explicit disposition: these are dispatch-loop mechanisms, cheaper to finish as an in-repo change once crew and runner share one dispatch loop than to keep coordinating across the seam. Note the FEAT's own finding that SLICE-184 and SLICE-187 are independent, not reinforcing (agent-definition content does not reach the report-gate hook's scanned transcript), so both remaining slices still need real coverage, not just closure."
---
## Description

Observed failure pattern (2026-07-09 wave run, 5 dispatched lane agents + 5 reviewers):
agents complete their task, write the report as plain final text (which is NOT delivered
to the orchestrator), then emit `idle_notification`. Orchestrator sees idle-without-report,
must nudge via SendMessage ("send your report now"), agent resends from live context.
Recovery is reliable (resume-not-respawn: same agent, context intact, ~1 message cost) but
100% manual, and the orchestrator inbox additionally accumulates redundant bare
`idle_notification` pings after reports were already received (~8 noise messages in one wave).

Root cause: nothing enforces "final act = SendMessage to main" for dispatched agents.
The existing lesson is already recorded (dev-team#162 / feedback_agent_dispatch_lessons:
"background agents must SendMessage before idle; nudging a RUNNING builder forks execution")
but only as memory prose, not as harness mechanism.

## Scope — four mechanisms

1. **SubagentStop report-gate hook** (highest ROI). Prompt-based SubagentStop hook shipped
   by the plugin: if the agent was dispatched with a report-back instruction and has not
   called SendMessage(to: main) this session, block the stop with reason
   "Send your report via SendMessage to main before stopping — plain final text is not
   delivered." Approve otherwise. Must not block agents that were NOT dispatched with a
   report-back contract (interactive/local agents).

2. **Agent template line.** All dispatch-style agent definitions (builder/reviewer/lane
   templates the plugin generates) gain one mandatory system-prompt line: "Your final plain
   text is not visible to the orchestrator. Your last action MUST be SendMessage to main
   with the structured receipt." Empirical note from the wave run: agents whose prompt had
   an explicit 'Return via SendMessage to main' line reported correctly; weaker phrasings
   ('report back', 'return findings') produced silent idles.

3. **Orchestrator watchdog rule** (dispatch loop): on `idle_notification` for an agent with
   no report logged → auto-nudge ONCE → still silent after nudge → fall back to reading the
   worktree directly (git log + artifacts = source of truth) and mark the lane
   report_missing. HARD GUARD: never nudge an agent whose worktree shows activity (fresh
   mtimes/commits) — nudging a running builder forks execution (dev-team#162).

4. **Context-budget hygiene** (keeps orchestrator context flat across waves):
   - Structured receipt schema instead of prose: {status, items[], commit_shas[],
     evidence_path, deviations[]} — target ≤ 15 lines. Full detail goes to an artifact file;
     the receipt carries the pointer.
   - Suppress/swallow bare idle_notification pings for agents whose report flag is already
     set — never surface them to the orchestrator context.

## Acceptance criteria

- AC1: Given a dispatched agent with a report-back contract that attempts to stop without
  having called SendMessage(to: main), when SubagentStop fires, then the stop is blocked
  with the corrective reason, and the agent's subsequent SendMessage+stop succeeds.
- AC2: Given an agent without a report-back contract, when it stops, the hook approves
  (no false-positive blocking).
- AC3: Plugin-generated dispatch agent templates contain the mandatory final-act line
  (grep-verifiable in generated .md).
- AC4: Watchdog: idle-without-report triggers exactly one auto-nudge; a second silent idle
  marks lane report_missing and the orchestrator proceeds from worktree evidence. A worktree
  with mtimes fresher than N minutes is never nudged.
- AC5: Receipt schema documented + adopted by the plugin's dispatch prompt templates;
  idle pings after receipt-received are not injected into orchestrator context.

## Non-goals

- No respawn-with-fresh-context flows (resume-not-respawn is the point).
- No changes to crew review/validation gates.
- Not adopting any external orchestration framework.

## Proposed slices (PM decomposition)

- SLICE-1: SubagentStop report-gate hook (report-back-contract detection) (2 pts)
- SLICE-2: Structured receipt schema definition + docs (2 pts)
- SLICE-3: Mandatory final-act line across all dispatch agent templates (batch) (1 pts)
- SLICE-4: Orchestrator watchdog rule (auto-nudge-once + fresh-mtime guard) (2 pts)
- SLICE-5: Idle-ping suppression + context-budget wiring into dispatch loop (1 pts)

## New evidence (2026-08-03 session) — scope refinement for SLICE-4 and SLICE-5

Observed across one multi-agent session (5 dispatched specialists), independent
of the 2026-07-09 wave run that motivated this FEAT:

**A third failure mode, not currently covered by any proposed slice.** SLICE-4's
watchdog is scoped to "idle-without-report". A worktree builder (SLICE-181) instead
stopped **mid-edit with work uncommitted** — `git log` HEAD still at main, 7 files
modified, live `exactOptionalPropertyTypes` type errors, and a final output that was
a severed sentence fragment rather than a report. This is strictly worse than a
missing report: an uncommitted worktree is **destroyed on prune**, so the work is
lost outright, not merely undelivered. SLICE-4 must therefore detect
`stopped && worktree has uncommitted changes` as its own condition, and the
correct recovery is a nudge to *commit*, not a respawn. The existing HARD GUARD
still applies — safe to nudge only because the agent was stopped; never nudge a
running builder (forks execution, dev-team#162).

**SLICE-5 (idle-ping suppression) confirmed with 9 occurrences in one session**,
all bare `idle_notification` pings emitted AFTER the agent's report had already
been delivered and acknowledged, several after explicit close-out. Sources were
varied (pm, reviewer, builder), so this is agent-type-independent. Confirms the
original ~8-noise-messages-per-wave observation at a comparable rate a month later.

**Related durable learnings** (`.claude/artifacts/loop/learnings.jsonl`):
`idle-ping-after-report`, `worktree-builder-stops-uncommitted`,
`worktree-artifact-loss` (subagent review artifacts land untracked inside the
worktree and die on prune — relevant to SLICE-2's receipt/evidence-path design).

**Downstream dependency discovered:** FEAT-275 (pause telemetry) cannot record
builder-tier dispatch outcomes at all until SLICE-1 lands. Builders emit no
artifact by design (`docs/sop/specialist-pause-handling.md` L128-131) and
`slice-linker/dispatch.mts` is pure prompt-string assembly with no execution or
observation machinery, so no builder-tier pause signal exists in default
(non-wave) orchestrator mode. FEAT-275 shipped narrowed to reviewer/validator +
wave coverage specifically because of this gap.

## SLICE-187 shipped with a known AC2 caveat (2026-08-04)

The report-gate hook detects "was this agent dispatched with a report-back
contract" by scanning the subagent's first transcript turn — its dispatch
prompt — for the literal tokens "SendMessage" and "main" within an 80-char
window. That is textual proximity, not semantic understanding: it cannot
distinguish an instruction addressed to *this* agent from prose merely
describing the mechanism.

Concrete false-positive shape, found in review:

> Investigate why FEAT-259's SubagentStop hook exists. Background: the fix
> requires the agent to call SendMessage(to: 'main', ...) before stopping.
> Read hooks/report-gate.mjs and summarize the detection regex. This is a
> foreground call — I will read your returned text directly, no need to send
> anything.

That trips the regex on an 8-char span while explicitly instructing the agent
NOT to send. The risk is elevated right now precisely because FEAT-259's own
description text (lines 71-72 of this file) contains the matching phrase, so
any dispatch that quotes this FEAT is a candidate.

This is FEAT-284's defect class — a regex over prose treated as evidence —
reappearing in a new place within the same session. The severity is not
comparable, and that distinction is the reason it shipped rather than being
rejected:

- FEAT-284 silently destroyed planned work with no symptom.
- This produces one extra visible retry turn, bounded by `stop_hook_active`
  (a second stop is always approved), and never loses data.

Shipped **default-OFF** (`features["report-gate"].enabled`, absent resolves
off), so nobody is blocked until they opt in. Before any wider rollout:
document operator-facing that detection is prompt-text proximity rather than
semantic, so an operator seeing an unexpected block understands why.

Two smaller review notes carried forward: `scanTranscript`'s read stream has
no explicit `.on('error')` handler, so a narrow TOCTOU race (stat succeeds,
read then fails) would surface as an uncaught stream error rather than a
caught rejection — AC2 still holds, since a crash cannot emit the block JSON
and therefore fails toward approve, just uninstrumented. And a nudge that the
agent ignores is silently approved on the second stop with no telemetry that
the nudge failed; that observability gap is FEAT-275's territory, not this
slice's.

## Measured: SLICE-184 and SLICE-187 are NOT coupled (2026-08-04)

builder-184 flagged honestly that it had not verified whether an owned
agent's `.md` content reaches the transcript first turn that
`hooks/report-gate.mjs` scans. Measured directly.

Dispatched `runner:researcher` with a prompt containing no mention of
SendMessage or main, then inspected its real subagent transcript:

```
agent-aprobe-firstturn-....jsonl
   first-turn bytes       : 677
   contains canonical line: false
   trips report-gate regex: false
```

For contrast, first turns of agents dispatched earlier today DO contain the
canonical line and DO trip the regex — but only because the operator's own
ad-hoc brief quoted it, not because the agent definition was folded in.

**Conclusion: agent-definition content does not reach the scanned first
turn.** SLICE-184's final-act line lives in the system prompt; the first user
turn carries only the caller's prompt text.

Two consequences, both of which correct earlier assumptions in this FEAT:

1. **SLICE-184 does not make the six owned agents contract-bearing under
   SLICE-187's hook.** builder-184 reasoned all six "become contract-bearing
   if their template content reaches the scanned transcript" — it does not,
   so they do not. The two slices are independent, not reinforcing.

2. **SLICE-187's AC1 coverage is narrower than it appears.** The hook can
   only detect a report-back contract that the *caller* wrote into the
   dispatch prompt. It therefore policies exactly the dispatches that already
   carry the instruction, and is blind to any dispatch relying on the agent
   definition to supply it — a false negative in the population most likely
   to need it, since a caller who remembered to write the instruction is also
   the caller least likely to be ignored.

This does not invalidate either slice. SLICE-184 still fixes the real gap it
targeted (no owned agent mentioned the delivery mechanism at all), and
SLICE-187 still blocks correctly on the contracts it can see. But the
combined effect is smaller than the two slices' ACs imply read together, and
closing FEAT-259 on AC1+AC3 alone would overstate coverage.

Worth considering for SLICE-185's watchdog scope: the watchdog observes from
the orchestrator side and does not depend on prompt text at all, so it is the
mechanism that actually covers the population these two miss.

## SLICE-185 shipped UNWIRED — deliberately, and what must happen before wiring

The watchdog decision logic (`src/scripts/lib/orchestrator-watchdog.mts`)
ships as a pure, tested function with **zero production callers**. That is
the FEAT-281 "tested but never wired" signature, and it is intentional here
rather than accidental — the distinction being that it is disclosed in the
module header and in this FEAT, not discovered later by someone counting
call sites.

The no-execution-point claim was verified independently by review, not taken
on the builder's word: `dispatch.mts` (543 lines) is pure prompt-string
assembly with no Monitor or idle handling; `dispatch-prune.mts` runs its own
mtime-staleness CLI check with no live-session observation; none of the 13
files under `wave/` reference Monitor, idle_notification or SendMessage; and
`hooks/report-gate.mjs` runs as a detached process with no Monitor/TaskList
handle. **Nothing scriptable in this repo can observe a subagent's live
idle/stop state today.** The only observer is the interactive orchestrator
turn itself.

So FEAT-259's decisive mechanism exists and is correct, but cannot run.
Closing this FEAT on AC1/AC3/AC4 satisfied would overstate what shipped:
AC1's hook only sees contracts the dispatcher wrote into the prompt, AC3's
final-act line does not feed that hook, and AC4's watchdog has no caller.
The three ship real value and none of them closes the loop alone.

**Required before wiring** (from review, and blocking):

`parseChangedPaths` uses a fixed `slice(3)` offset and does not handle git's
quoted paths (spaces or special characters) or rename-arrow remainders
(`old -> new`). Both are disclosed as accepted gaps in code comments. If the
sole uncommitted change in a tick is to such a path, its mtime is dropped and
freshness falls back to last-commit-time or directory mtime — which could
misclassify a genuinely *running* agent as `stopped_uncommitted`. That is not
a HARD GUARD defeat and cannot fire today with no caller, but it becomes a
live risk the moment this is wired: the whole point of the guard is that a
running builder is never nudged, because nudging one forks execution
(dev-team#162).

Harden the path parsing before adding any execution point.

## Fresh measurement — 2026-08-05 session

Six redundant post-report idle pings observed in a single session, from six
distinct agents: `pm-288-290`, `builder-200`, `builder-203`, `builder-201`,
`reviewer-201`, `reviewer-203`.

Every one followed the same sequence: the agent delivered a complete report via
`SendMessage(to: 'main')`, the orchestrator received and acted on it, and the
agent then emitted a bare `idle_notification` carrying no new information. 6 of
6 dispatches this session, i.e. a 100% rate.

This is the SECOND half of the FEAT-259 failure pattern and the one AC3's
final-act line does not address. AC3 fixes agents that stop WITHOUT reporting.
These agents reported correctly and pinged anyway. The orchestrator cost is
lower per event than a missed report (no nudge round-trip is needed) but it is
not zero: each ping is a message the orchestrator must read and classify as
redundant, and the classification is only cheap because a human is watching.

Relevant to SLICE-186 (idle-ping suppression) specifically: the suppression rule
needs to distinguish "idle after a delivered report" — safe to swallow — from
"idle without a report" — the case that must still surface. Today nothing
distinguishes them, because nothing tracks whether a report was delivered.

Prior comparable: 27 pings in the 2026-08-04 session. Rate is unchanged; only
the dispatch count differs.

```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-284.md

```
---
id: FEAT-284
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-05
depends_on: []
slices: [SLICE-188, SLICE-189, SLICE-190, SLICE-191, SLICE-192, SLICE-193, SLICE-194]
derived_from: null
pm_customer_impact: 0.9
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.8
pm_technical_risk: 0.7
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "Verified live silent-data-loss defect in a core cross-repo contract (git-anchored slice completion) that already dropped a FEAT's highest-value slice and produced a duplicate materialization + redundant GitHub issue with no CLI repair path; technical_risk banded 0.6-0.8 per the rubric because the fix is a schema/data-shape change to proposed_slices_shipped frontmatter with cross-module reach, and effort bumped to 0.7 because the existing test suite's --allow-empty fixtures (confirmed at git-anchored-completion.test.mts:55-64) must be rebuilt from scratch to give the new diff-corroboration logic any real coverage."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Rebuild git-anchored-completion test fixtures with real file-touching commits, not --allow-empty"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Require diff-level file-change evidence before recording a slice as git-shipped
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Downgrade text-only matches to warnings; emit operator-visible skip/downgrade lines
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-5
    title: "Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-6
    title: Add CLI escape hatch to force-materialize one named proposed slice by id_suffix
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-7
    title: Treat squash-body bullet lines as subject-equivalent match targets (AC-8)
    points: 2
    estimated_tokens: 60000
started_at: 2026-08-04
github_issue: 609
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/609"
slices_complete: [SLICE-188, SLICE-189, SLICE-190, SLICE-194, SLICE-192]
p0_disposition: carry
p0_reason: "5 of 7 slices shipped (fixtures, diff-evidence + AC-7 subject/body split, downgrade-to-warning, AC-8 bullet-line matching, identity-keyed materialization). Remaining SLICE-191 (migrate proposed_slices_shipped frontmatter to per-id_suffix keyed shape) and SLICE-193 (CLI escape hatch to force-materialize a named proposed slice) are internal backlog-data-model logic in slice-linker/proposed-slices.mts, not crew-seam-dependent -- carry to dev-crew rather than close. Also record: AC-8b (live-HEAD squash-merge recognition) is explicitly NOT satisfied per this FEAT's own 2026-08-05 note -- it is blocked on FEAT-294 (a separate triaged FEAT, commits.find() selecting the wrong commit), so the carried scope must not claim AC-8b as done and should note the FEAT-294 dependency."
---
## Description

git-anchored slice completion treats a prose mention of a slice in a commit message as proof that the slice shipped, silently dropping planned work. Reproduced live on 2026-08-04 against FEAT-259.

Mechanism. reconcileProposedSlicesAgainstGit in src/scripts/lib/slice-linker/git-anchored-completion.mts pre-filters commits with git log --grep <featureId>, then for each proposed slice builds the regex /FEAT-NNN[^\n]{0,80}?SLICE-<ordinal>\b|SLICE-<ordinal>\b[^\n]{0,80}?FEAT-NNN/i and tests it against the commit SUBJECT and BODY. Any match is recorded as shipped evidence. There is no examination of the commit's diff, no check that any file changed, and no check that the changed files bear any relationship to the slice. Commit text is the entire evidence base.

Live repro. Commit 71604bb4 is a docs-only commit: one new file under docs/research/ plus backlog frontmatter updates. It contains zero implementation. Its body includes the sentence 'run before committing FEAT-259's SLICE-1 to a design'. That single prose fragment matched the pattern, so reconcileProposedSlicesStartIndex advanced the materialization start index past -SLICE-1 and stamped proposed_slices_shipped: [-SLICE-1] with proposed_slices_shipped_commits: [71604bb4...] onto the FEAT. The subsequent slice from-feature run materialized only proposed slices 2 through 5 as SLICE-183 through SLICE-186. The SubagentStop report-gate hook -- the highest-ROI mechanism in the whole FEAT -- was never created, and nothing surfaced that it had been skipped. Independently verified that it had not shipped: no report-gate entry exists in .claude-plugin/hooks/hooks.json, whose SubagentStop array contains only emit-astrarunner-event.mjs and capture-at-close.mjs.

Why this is worse than an ordinary false positive. (a) It is silent -- the skip produces no warning, and a FEAT whose proposed slices were partly dropped looks fully sliced. (b) It is durable -- the stamp is deliberately written to FEAT frontmatter so the finding survives a fresh checkout, which means a wrong verdict also survives. (c) It is self-reinforcing -- discussing a slice in commit prose is exactly what planning, research and handoff commits do, so the more carefully a slice is designed before implementation, the more likely its design commits mark it shipped. (d) The prefix-advance model compounds it: a false positive on a low ordinal shifts the start index, so later legitimate slices materialize against the wrong proposed entries.

Secondary defect found in the same repro. materializeProposedSlices computes startAt = Math.max(existingSlices.length, opts.startIndex ?? 0), which assumes the Nth existing slice always corresponds to the Nth proposed entry. Once a middle entry is skipped that assumption breaks, and re-running slice from-feature re-materializes the LAST proposed slice as a duplicate rather than the missing one. Observed: a second from-feature invocation created a duplicate of -SLICE-5 (idle-ping suppression) and published a redundant GitHub issue for it, while -SLICE-1 remained missing. There is also no CLI flag to target a specific proposed slice, so this state cannot be repaired through the CLI at all -- the repair required calling createSlice through the BacklogStore API directly.

Proposed direction. Require diff-level corroboration before recording shipped evidence: a commit should only count if it actually modified files, and preferably files plausibly related to the slice (its touches_files when declared). Treat a text-only match as at most a warning that names the commit and asks for confirmation, never as a silent skip. Emit an explicit operator-visible line whenever any proposed slice is skipped, listing the ordinal, the title and the matched commit. Replace the contiguous-prefix start-index model with per-ordinal materialization keyed on id_suffix so a gap in the middle is repairable and re-runs are genuinely idempotent. Add a CLI escape hatch to materialize a named proposed slice.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.

## Additional evidence — the test suite structurally cannot catch this

Every fixture commit in `src/tests/git-anchored-completion.test.mts` is
created with `git commit --allow-empty` (the `tmpGitRepo` helper, lines
55-64). The entire existing suite therefore exercises the matcher against
commits that change **zero files**.

That is the structural reason diff-blindness was never caught: with no
fixture commit ever touching a file, the tests cannot distinguish a commit
that *implements* a slice from one that merely *mentions* it. The behavior
under test and the defect are indistinguishable by construction, so the
suite passes green while the matcher is wrong.

Consequence for scoping: any fix must rebuild these fixtures to produce real
file changes before the corroboration logic can be asserted at all. That is
genuine work, not incidental cleanup, and it belongs in the slice estimate.

This is a close relative of FEAT-281's tested-but-never-wired class — in both
cases the test is shaped so that writing it manufactures the evidence that
hides the gap.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a candidate commit whose subject/body matches a proposed slice's FEAT-id/SLICE-ordinal token pair, When reconcileProposedSlicesAgainstGit evaluates it, Then the commit is only recorded as shipped evidence if it actually changed at least one file — an `--allow-empty` commit must never produce shipped evidence, verified by a NEW fixture that creates a real file-touching commit alongside the existing empty-commit case in the same test. (Corrected 2026-08-04: this clause originally also claimed to exclude docs-only commits, which the "changed ≥1 file" rule does not do — a docs-only commit changes a file. That case is AC-6.)
- AC-2: Given a proposed slice declares touches_files, When a diff-corroborated candidate commit's changed paths share zero overlap with that list, Then the match is downgraded to a text-only warning and reported to the operator rather than recorded as shipped evidence that advances the start index.
- AC-3: Given any proposed slice is skipped or downgraded during a reconcile pass, When runner:start / slice from-feature runs, Then an explicit operator-visible line is printed naming the ordinal, the slice title, and the matched commit sha, so the FEAT-284 repro (SLICE-1 dropped via commit 71604bb4) surfaces a visible warning instead of silence.
- AC-4: Given a FEAT whose proposed_slices had ordinal 1 skipped while ordinals 2-5 are already materialized (the live FEAT-259 state), When slice from-feature is re-run, Then it materializes the missing ordinal 1 and does not create a duplicate of any already-materialized ordinal — a regression test must reproduce the observed duplicate -SLICE-5 + redundant GitHub issue and assert it no longer occurs.
- AC-5: Given an operator needs to repair a gapped FEAT by hand, When they invoke the new CLI escape hatch targeting a specific id_suffix, Then that exact proposed slice is materialized regardless of index position, without requiring direct BacklogStore API calls (the actual repair path used in the FEAT-284 live repro).
- AC-6: Given a proposed slice that declares NO `touches_files` (the live FEAT-259 repro shape — none of its five proposed entries declared any), When a matching candidate commit changed only non-implementing paths such as `docs/**` and `.claude/artifacts/**`, Then the match is downgraded to a text-only warning rather than recorded as shipped evidence. Both real offending commits are filtered by this rule and neither is filtered by AC-1 or AC-2: `71604bb4` touched only `docs/research/**` plus backlog frontmatter, and `c2e77fe7` touched only backlog artifacts. Asserted against the existing docs-only fixture at `src/tests/git-anchored-completion.test.mts:263-282`, whose expectation inverts from shipped==[1] to shipped==[].

- AC-7: Given a candidate commit whose FEAT-id/SLICE-ordinal token pair appears ONLY in the commit body and not in its subject, When reconcileProposedSlicesAgainstGit evaluates it, Then it is not recorded as shipped evidence (at most a text-only warning). Given a commit carrying the pair in its SUBJECT in the established convention (`feat(connectors): FEAT-312 SLICE-1 — bridge`), Then it still qualifies as evidence as today.

- AC-8: Given a squash-merge commit whose body contains bullet lines composed from the original commit subjects, When reconcileProposedSlicesAgainstGit evaluates it, Then each bullet line is treated as a subject-equivalent match target, so a genuine multi-slice squash merge is recognized as evidence. Prose mentions elsewhere in the body remain non-qualifying.

### Why AC-8 is required — AC-7 broke the dominant shipping shape

Found by review of SLICE-189 and confirmed independently. AC-7 is not merely
defense-in-depth; it is a net-new miss for this repo's most common real
shape. Verified live: PR #549 / commit `859be561` genuinely shipped both
SLICE-1 and SLICE-2 of FEAT-267 (confirmed via `gh pr view 549`), matched
correctly before SLICE-189, and now returns `shipped=[]` with both demoted to
`textOnlyMatches`. Squash-merged multi-slice PRs put the SLICE token only in
the body GitHub composes from the original commit subjects — never in the
subject, which is the PR title. Left as-is, AC-7 surrenders this module's
main practical benefit (auto-advance) for most multi-slice FEATs here.

AC-8 was measured against real commits before being adopted, because the
previous refinement attempt reinstated the defect (see the section above):

| commit class | recovered by AC-8 |
|---|---|
| the 3 known false positives | **0 of 3** |
| genuine body-only commits sampled | 2 of 4 |

None of `71604bb4`, `c2e77fe7`, `3bd6ab95` carries the token pair inside a
bullet line — their bodies are hand-written prose, and two have no bullets at
all. Both true squash merges do: `859be561` (12 bullets) and `f60fe60d`
(15 bullets). So AC-8 recovers the shape that matters without reopening the
hole AC-7 closed.

The two still-missed samples (`0786d9ce`, `453200c1`) mention the pair in
free prose rather than a bullet. That residue is acceptable and is precisely
what SLICE-190's operator warning exists to surface.

### Why AC-7 exists — AC-6 does not catch the third offender

Measured on live repo data 2026-08-04. The FEAT-259 false positive migrated
across three separate commits in a single day, the citation walking forward
to whichever commit most recently *discussed* the incident:

| commit | what it actually was | pair in subject | pair in body |
|---|---|---|---|
| `71604bb4` | research spike (docs only) | 0 | 1 |
| `c2e77fe7` | the repair commit (backlog only) | 0 | 2 |
| `3bd6ab95` | SLICE-188 test fixtures (`src/tests/**`) | 0 | 1 |

`3bd6ab95` defeats AC-1 (it changed files), AC-2 (FEAT-259's proposed slices
declare no `touches_files`) and AC-6 (it changed `src/tests/**`, not
`docs/**` or `.claude/artifacts/**`). Diff corroboration alone therefore does
not close the live repro.

The subject/body split does: all three false positives carry the token pair
exclusively in the body, none in the subject, while the genuine-evidence
convention already in use — and already encoded in the existing fixtures —
puts it in the subject. This is a cheaper and sharper discriminator than path
heuristics, because it keys on how humans actually write slice commits rather
than guessing which paths count as implementation.

AC-6 is still worth keeping: it independently kills the docs-only class, and
the two rules together degrade gracefully if either is bypassed.

Do NOT instead widen AC-6's non-implementing path set to include
`src/tests/**`. That would make test-only slices — SLICE-188 itself is one —
permanently undetectable, for a reason unrelated to the real discriminator.

### Note on AC-6's false-negative direction (deliberate)

AC-6 makes a genuinely docs-only slice — FEAT-259's own `-SLICE-2` (receipt
schema + docs) and `-SLICE-3` (final-act line across `.md` templates) are
real examples — undetectable as shipped by this check. That is the correct
trade, and it follows the module's existing stated contract: "Absence of a
match is NOT proof a slice is unshipped; it only means this check found no
evidence, so callers must treat 'not shipped' as the default, fail-open
outcome."

The two error directions are not symmetric. A false negative re-materializes
a slice that already shipped — visible immediately, cheap to discard. A false
positive silently drops planned work and stamps durable frontmatter asserting
it was done — which is the entire incident this FEAT exists to prevent, and
which went unnoticed until someone happened to count the materialized slices.
Bias the check toward re-doing work over silently skipping it.

## Proposed slices (PM decomposition)

- SLICE-1: Rebuild git-anchored-completion test fixtures with real file-touching commits, not --allow-empty (2 pts)
- SLICE-2: Require diff-level file-change evidence before recording a slice as git-shipped (2 pts)
- SLICE-3: Downgrade text-only matches to warnings; emit operator-visible skip/downgrade lines (2 pts)
- SLICE-4: Migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape (2 pts)
- SLICE-5: Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index (2 pts)
- SLICE-6: Add CLI escape hatch to force-materialize one named proposed slice by id_suffix (2 pts)

## The false positive is self-perpetuating (measured 2026-08-04, after repair)

Re-running `reconcileProposedSlicesAgainstGit` against FEAT-259 *after* the
repair still reports `-SLICE-1` as shipped — now citing `c2e77fe7`, the
commit that repaired and documented the original false positive. That commit
message necessarily contains both `FEAT-259` and `SLICE-1` in prose, which is
all the matcher requires.

So the defect regenerates its own evidence: the first false positive came
from a research commit that *designed* the slice, the second from a repair
commit that *documented* the first. Any commit that discusses the problem
re-creates it. Fixing the state without fixing the matcher is therefore not
durable — the stamp will simply be rewritten on the next reconcile pass.

FEAT-259 is currently unharmed only by accident: it is fully materialized
(5 of 5 slices), so `reconcileProposedSlicesStartIndex` short-circuits at
`if (existingCount >= proposed.length) return undefined` before reconcile is
consulted at all. Had it been 4 of 5, the false positive would have fired a
second time on the repair commit.

Two consequences for the fix:

- Diff-corroboration (AC-1) is load-bearing, not defense in depth. Both
  offending commits would be filtered by a "did this commit change files
  related to the slice" test: the first touched only `docs/research/**` plus
  backlog frontmatter, the second only backlog artifacts.
- The migration slice must re-derive stale stamps rather than trust them.
  A stamp written by the old text-only matcher carries no evidence that its
  cited commit did anything, so migration should re-evaluate each stamped
  entry under the new rules instead of carrying it forward.

## Measured cost of AC-7, and a refinement that must NOT be adopted

Measured against this repo's last 600 commits on 2026-08-04, after SLICE-189
landed.

| token-pair location | commits | of which squash-merges |
|---|---|---|
| subject (still detected) | 118 | 12 |
| body only (now undetected) | 29 | 11 |
| neither | 453 | — |

So AC-7 makes roughly 20% of previously-matching commits invisible to the
check, and at least one is genuine shipped evidence: `859be561`
"FEAT-267: wave worktree-placement fix + crash-recovery CLI (#549)", whose
subject carries the FEAT id while the SLICE token sits in the squash body.
This repo squash-merges, and GitHub composes the squash subject from the PR
title, so this shape recurs.

**The obvious refinement is a trap.** Loosening the rule to "the FEAT id OR a
SLICE token appears in the subject" recovers 20 of the 29 — but among the
recovered are all three original false positives:

- `3bd6ab95` `test(SLICE-188): rebuild git-anchored-completion fixtures...`
- `c2e77fe7` `chore(backlog): slice FEAT-259; repair git-anchored false-positive...`
- `71604bb4` `docs(research): architect classification for FEAT-281/282/283...`

Each carries *a* FEAT or SLICE token in its subject — just not the pair that
its body prose mentions. Under the loose rule `test(SLICE-188): ...` becomes
evidence for FEAT-259's SLICE-1 again, reinstating the exact defect this FEAT
exists to remove. Strict subject-pair matching is load-bearing; do not relax
it to a single-token subject anchor.

**Consequence for SLICE-190.** The residual false-negative rate is high
enough that the operator-visible warning is not polish — it is the safety net
that makes AC-7's trade acceptable. Every `textOnlyMatches` entry is a case
where the check saw prose evidence and declined to act on it; a human needs
to see those lines to catch the `859be561` shape. SLICE-190 should be treated
as required to complete AC-7, not as an independent nicety.

## AC-8b status — NOT fully satisfied (2026-08-05)

Recording this explicitly rather than letting SLICE-194's close imply the AC is
met.

AC-8b asked that the real squash-merge commit `859be561` be recognized as
shipped evidence when reconcile runs against LIVE repo history, not a fixture
alone. Independently verified by reviewer-194 with a standalone script:

- pinned to `f0ec093d` → recognized, `shipped=[1,2]` citing `859be561`
- at live HEAD → NOT recognized, both ordinals demoted at `3860269f`

**Verdict: met only up to the point before `3860269f` exists. Live-HEAD
recognition remains open.**

SLICE-194's own change is sound — the bullet-line matching works correctly once
the right commit is reached. What blocks AC-8b is `commits.find()` selecting a
newer narration commit and never continuing to the qualifying one. That is
`FEAT-294`, which predates SLICE-194 (it arrived with AC-7 in SLICE-189) and is
not AC-8 specific.

Failure direction is safe: a false "not shipped" causes a wasted re-check, not a
silent drop, so it does not reopen the FEAT-284 incident class. But FEAT-284
must not be moved to `done/` on the basis that AC-8b passed, because at live
HEAD it does not. Close FEAT-284 only after FEAT-294 lands, or close it with
AC-8b explicitly recorded as deferred to FEAT-294 — not ticked.

```

### C:/work/mega/runner-plugin/.claude/artifacts/loop/backlog/in-progress/FEAT-299.md

```
---
id: FEAT-299
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-06
depends_on: []
slices: [SLICE-207]
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.55
pm_technical_risk: 0.35
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-06
autonomous_safe: true
triage_notes: "Two gaps in the same validation hole in proposed-slices.mts, both made load-bearing by SLICE-192's identity keying. Gap B (trim asymmetry between clampSliceTitle, which trims before storing, and proposed-slices.mts, which validates the raw untrimmed string) is the one driving priority: a whitespace-padded proposed title can never match on the ~200-slice legacy title-match fallback, so slice from-feature recreates that slice on every single rerun — an unbounded duplicate loop, not a one-time miss — and each iteration publishes a fresh tracker issue via loop.mts:1567-1574, the same mechanism that turned the original FEAT-284 duplicate into GitHub issue 598. Trigger is trivially reachable (a PM emitting a trailing space, or a hand-edited entry), so this is treated as live-risk rather than theoretical, justifying P1 despite neither gap having fired yet in the current backlog. Gap A (no uniqueness enforcement on title or id_suffix) is lower-severity but same file, same slice. Fix is contained to proposed-slices.mts plus aligning with slice-title.mts/feature-lifecycle.mts's fallback comparison — moderate effort, moderate risk (adds validation-time rejection, must scan existing backlog first to avoid failing CI on historical duplicates). Related: FEAT-284/SLICE-192 (the identity contract), FEAT-298 (adjacent uniqueness failure, different layer), FEAT-296. No cost analog checked this pass."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Fix proposed-slices trim asymmetry and duplicate title/id_suffix validation
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given clampSliceTitle trims whitespace before storing a slice's title while proposed-slices.mts validates the raw untrimmed string, When a proposed title carries leading or trailing whitespace, Then proposed-slices.mts trims before validating and storing (or the legacy fallback in feature-lifecycle.mts's matchProposedIdSuffix compares trimmed values), so the stored trimmed title can match its own proposed entry.", "AC-2: Given a whitespace-padded proposed title previously caused the legacy fallback to never match, creating a new slice on every rerun of slice from-feature and publishing a fresh tracker issue each time (loop.mts:1567-1574), When this fix ships, Then a regression test with a whitespace-padded proposed title asserts a legacy slice matches and is NOT recreated across repeated runs, not only a single run.", "AC-3: Given proposed-slices.mts currently validates title non-emptiness/length (<=100 chars) and id_suffix shape but never uniqueness within a FEAT, When this slice ships, Then it rejects at validation time, with a message naming the duplicate, any FEAT whose proposed_slices contains a duplicate title or duplicate id_suffix.", "AC-4: Given the uniqueness check is new, When it is enabled, Then the existing backlog is scanned first and any FEAT already carrying duplicate titles or id_suffixes is reported, so turning the check on does not fail CI on historical data without warning."]
    touches_files: [src/scripts/lib/proposed-slices.mts, src/scripts/lib/slice-title.mts, src/scripts/lib/slice-linker/feature-lifecycle.mts, src/tests/proposed-slices.test.mts]
started_at: 2026-08-06
github_issue: 631
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/631"
p0_disposition: carry
p0_reason: "SLICE-207 was never built: no worktree, no branch, no dispatch result found in runner-plugin (verified via git worktree list / git branch -a / dispatch artifact search). No merge commit referencing SLICE-207 exists on main. Carry full scope (proposed-slices.mts trim asymmetry between clampSliceTitle and validation, plus duplicate title/id_suffix uniqueness enforcement) to dev-crew per dev-crew's DEC-001 (SLICE-207/FEAT-299 disposition is carry, not build)."
---
## Description

proposed_slices entries have no uniqueness validation on title or id_suffix, and the identity contract SLICE-192 just shipped now depends on both.

Both gaps found by the SLICE-192 reviewer, traced to concrete failure modes, and filed together because they are the same validation hole in proposed-slices.mts seen from two sides. Neither is a live incident — the current backlog has no duplicate proposed titles and no whitespace-padded ones — but SLICE-192 changed them from harmless to load-bearing.

Background. SLICE-192 replaced count-based materialization with identity keying. New slices carry a proposed_slice_id_suffix frontmatter stamp. The roughly 200 slices that predate the field fall back to an exact title match against proposed_slices[].title, so the fallback is what actually runs for all existing production data.

Gap A — no uniqueness enforcement. proposed-slices.mts validates that title is non-empty and at most 100 characters and that id_suffix matches the SLICE-N shape, but never that either is unique within a FEAT. Two failure modes, both silent. Duplicate titles: matchProposedIdSuffix uses .find(), so two legacy slices collapse onto the same id_suffix, leaving the other proposed entry looking unmaterialized, so it gets created again — a genuine duplicate slice, the same bug class FEAT-284 exists to eliminate, arriving through a different door. Duplicate id_suffix: one entry is silently swallowed and never created at all, which is the work-losing direction rather than the noisy one.

Gap B — trim asymmetry, and this is the worse of the two. clampSliceTitle trims whitespace before storing the title in slice frontmatter, while proposed-slices.mts validates the raw untrimmed string. A proposed title carrying leading or trailing whitespace is therefore stored trimmed and can never === match its own proposed entry on the legacy fallback path. Unlike an ordinary miss, which degrades to treating one entry as unmaterialized once, a legacy slice that can never match is recreated on EVERY rerun of slice from-feature. That is an unbounded duplicate loop, not a one-time miss, and each iteration also publishes a fresh tracker issue through loop.mts:1567-1574 — the mechanism that turned the original FEAT-284 duplicate into GitHub issue 598.

The trigger for B is trivially reachable: a PM emitting a title with a trailing space, or a hand-edited proposed_slices entry.

Acceptance direction. For B, make the two sides agree — trim in proposed-slices.mts before validating and storing, or compare trimmed on the fallback path; either closes it, and doing both is harmless. Add a regression test with a whitespace-padded proposed title asserting a legacy slice matches and is not recreated, and specifically assert the loop does not grow across repeated runs rather than only checking a single run.

For A, validate uniqueness of both title and id_suffix within a FEAT's proposed_slices and reject at validation time with a message naming the duplicate, since the alternative is discovering it as a duplicate slice or a missing one. Then scan the existing backlog and report any FEAT already carrying duplicates before the check is enforced, so turning it on does not fail CI on historical data without warning.

Consider whether the legacy title-match fallback should be retired once enough slices carry proposed_slice_id_suffix, since every one of these failure modes lives in the fallback rather than the stamp.

Related: FEAT-284 and its SLICE-192 (the identity contract), FEAT-298 (slice-id collisions, adjacent uniqueness failure at a different layer), FEAT-296.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Proposed slices (PM decomposition)

- SLICE-1: Fix proposed-slices trim asymmetry and duplicate title/id_suffix validation (2 pts)

## Acceptance criteria (Given-When-Then)

- AC-1: Given clampSliceTitle trims whitespace before storing a slice's title while proposed-slices.mts validates the raw untrimmed string, When a proposed title carries leading or trailing whitespace, Then proposed-slices.mts trims before validating and storing (or the legacy fallback in feature-lifecycle.mts's matchProposedIdSuffix compares trimmed values), so the stored trimmed title can match its own proposed entry.
- AC-2: Given a whitespace-padded proposed title previously caused the legacy fallback to never match, creating a new slice on every rerun of slice from-feature and publishing a fresh tracker issue each time (loop.mts:1567-1574), When this fix ships, Then a regression test with a whitespace-padded proposed title asserts a legacy slice matches and is NOT recreated across repeated runs, not only a single run.
- AC-3: Given proposed-slices.mts currently validates title non-emptiness/length (<=100 chars) and id_suffix shape but never uniqueness within a FEAT, When this slice ships, Then it rejects at validation time, with a message naming the duplicate, any FEAT whose proposed_slices contains a duplicate title or duplicate id_suffix.
- AC-4: Given the uniqueness check is new, When it is enabled, Then the existing backlog is scanned first and any FEAT already carrying duplicate titles or id_suffixes is reported, so turning the check on does not fail CI on historical data without warning.

```

## Files read

