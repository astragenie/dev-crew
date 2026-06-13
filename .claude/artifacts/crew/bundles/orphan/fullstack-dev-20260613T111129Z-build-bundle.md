---
slice: unknown
builder: fullstack-dev
run_id: 20260613T111129Z
feat: FEAT-117
files_touched: ["commands/architect.md", "commands/auto.md", "commands/backlog-add.md", "commands/backlog-enrich.md", "commands/backlog-list.md", "commands/backlog-promote.md", "commands/brief.md", "commands/classify-slice-shape.md", "commands/competitor-audit.md", "commands/decisions-list.md", "commands/decisions-relevant.md", "commands/decisions-show.md", "commands/decisions-supersede.md", "commands/derive-slice.md", "commands/install.md", "commands/intake.md", "commands/learn.md", "commands/lessons-recent.md", "commands/list-presets.md", "commands/next-slice.md", "commands/phase-gate.md", "commands/pr-fix.md", "commands/release-plan.md", "commands/retriage.md", "commands/retrospective.md", "commands/slice-complete.md", "commands/slice-from-feature.md", "commands/slice-grade-write.md", "commands/slice-grade.md", "commands/slice-link.md", "commands/slice-plan.md", "commands/slice-post-builder-fanout.md", "commands/slice-review-ladder.md", "commands/slice-start.md", "commands/snapshot-memory.md", "commands/spec-add.md", "commands/spec-decompose.md", "commands/spec-list.md", "commands/spec-status.md", "commands/start.md", "commands/status.md", "commands/stop-check.md", "commands/sync-claims.md", "commands/triage.md", "src/scripts/validate-manifests.mts", "src/tests/command-frontmatter.test.mts"]
files_read: []
diff_stat: { files: 46, additions: 163, deletions: 102 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: FEAT-117: Markdown Workflow recipes frontmatter

- Created: 2026-06-13T11:11:29.747Z
- From: fullstack-dev
- To: lead
- Objective: Added name + auto_execute_steps: false frontmatter to all 44 commands/*.md files; exported validateCommandFrontmatter from validate-manifests.mts; created 6-test suite; fixed pre-existing complexity violation.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/validate-manifests.mts
  - src/tests/command-frontmatter.test.mts
  - commands/architect.md
  - commands/auto.md
  - commands/backlog-add.md
  - commands/backlog-enrich.md
  - commands/backlog-list.md
  - commands/backlog-promote.md
  - commands/brief.md
  - commands/classify-slice-shape.md
  - commands/competitor-audit.md
  - commands/decisions-list.md
  - commands/decisions-relevant.md
  - commands/decisions-show.md
  - commands/decisions-supersede.md
  - commands/derive-slice.md
  - commands/install.md
  - commands/intake.md
  - commands/learn.md
  - commands/lessons-recent.md
  - commands/list-presets.md
  - commands/next-slice.md
  - commands/phase-gate.md
  - commands/pr-fix.md
  - commands/release-plan.md
  - commands/retriage.md
  - commands/retrospective.md
  - commands/slice-complete.md
  - commands/slice-from-feature.md
  - commands/slice-grade-write.md
  - commands/slice-grade.md
  - commands/slice-link.md
  - commands/slice-plan.md
  - commands/slice-post-builder-fanout.md
  - commands/slice-review-ladder.md
  - commands/slice-start.md
  - commands/snapshot-memory.md
  - commands/spec-add.md
  - commands/spec-decompose.md
  - commands/spec-list.md
  - commands/spec-status.md
  - commands/start.md
  - commands/status.md
  - commands/stop-check.md
  - commands/sync-claims.md
  - commands/triage.md
- Confidence: high
- Risks: Pre-existing test failure: retriage-command.test.mts 'retriage.md documents the failure-escalation rule' checks for scopeNotes in the body — this test was already failing before this slice (confirmed by git stash test). Not caused by FEAT-117 changes.
- Suggested Next Handoff: crew:inspector review then crew:verifier; then /loop:slice complete --id SLICE-117


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-117.md b/.claude/artifacts/loop/backlog/triaged/FEAT-117.md
deleted file mode 100644
index 9ebf50b..0000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-117.md
+++ /dev/null
@@ -1,78 +0,0 @@
----
-id: FEAT-117
-status: triaged
-priority: P2
-category: competitor-gap
-target_release: null
-created: 2026-06-08
-updated: 2026-06-08
-depends_on: []
-slices: []
-derived_from: null
-composite_score: 7
-source_competitors: ["\"Windsurf (Codeium", "now Cognition)\""]
-autonomous_safe: false
-tags: [workflow, slash-commands, documentation]
-needs_contract: false
-needs_ux: false
-pm_customer_impact: 0.4
-pm_effort_estimate: 0.4
-pm_strategic_alignment: 0.65
-pm_technical_risk: 0.3
-pm_dependency_depth: 0.1
-triage_notes: "Composite 7. Markdown Workflow recipes with frontmatter + slash invocation. loop already has slash commands via commands/*.md files. The Windsurf-specific innovations are: ordered numbered steps, nested /workflow composition, and auto_execute_steps flag. The 4-tier scope precedence requires multi-environment install setup. Medium strategic alignment. autonomousSafe: false — needs AC definition for how auto_execute_steps interacts with autoMode."
-github_issue: 182
-github_milestone: null
-github_url: "https://github.com/sergeymilashico/loop/issues/182"
----
-# FEAT-117: Markdown Workflow recipes with frontmatter + slash invocation
-
-## Source
-
-Competitor gap audit (2026-05-28). Surfaced by:
-- Windsurf (Codeium, now Cognition)
-
-## Description
-
-`.windsurf/workflows/*.md` files with YAML frontmatter (`name`, `description`, `auto_execute_steps`), ordered numbered steps, nested workflow composition (`/workflow-a` calls `/workflow-b`), and a 4-tier scope precedence (system > workspace > global > built-in). Invoked via `/<workflow-name>` slash command. Workspace workflows are git-committed and travel with the codebase.
-
-## PM Scoring
-
-```json
-{
-  "featureId": "FEAT-117",
-  "scores": {
-    "customer_impact": 0.40,
-    "effort_estimate": 0.40,
-    "strategic_alignment": 0.65,
-    "technical_risk": 0.30,
-    "dependency_depth": 0.10
-  },
-  "compositePriority": "P2",
-  "autonomousSafe": false,
-  "demandEvidence": "none — inferred from Windsurf audit. Loop commands/*.md files already provide a similar pattern without the frontmatter schema or nested composition.",
-  "scopeNotes": "Minimum: add optional frontmatter to existing commands/*.md files (name, description, auto_execute_steps). Nested workflow composition (one command calling another via /command-name) is a separate higher-risk slice. 4-tier scope precedence is out of scope for single-developer plugin.",
-  "risks": [
-    "4-tier scope precedence implies multi-user/multi-environment setup not applicable here",
-    "Nested workflow composition could create infinite loops",
-    "auto_execute_steps interaction with autoMode: true needs careful design",
-    "Commands/*.md schema change affects all existing commands"
-  ],
-  "reasoning": "P2: existing commands/*.md pattern partially covers this; frontmatter enrichment is low-risk; nested composition is higher-risk separate slice."
-}
-```
-
-## Scoring
-
-- Impact: 2
-- Effort: 1
-- Fit: 3
-- Composite: 7 / 9
-
-## References
-
-- https://docs.devin.ai/desktop/cascade/workflows
-
-## Consider rejecting because
-
-loop already ships slash commands (commands/*.md) that travel with the codebase. The Windsurf-specific innovations (4-tier scope precedence, nested composition) require multi-environment setup that doesn't apply to a single-developer plugin. The auto_execute_steps flag in auto mode raises safety questions. Existing slash commands cover the most valuable subset already.
diff --git a/commands/architect.md b/commands/architect.md
index 2d9a8e4..5e3d258 100644
--- a/commands/architect.md
+++ b/commands/architect.md
@@ -1,5 +1,7 @@
 ---
+name: architect
 description: Run the codebase research pre-flight using the architect model (Opus) and return a two-model dispatch instruction.
+auto_execute_steps: false
 ---
 
 # Architect
diff --git a/commands/auto.md b/commands/auto.md
index 0995172..d2c73cf 100644
--- a/commands/auto.md
+++ b/commands/auto.md
@@ -1,5 +1,7 @@
 ---
+name: auto
 description: "Walk the triaged backlog and emit dispatch plans for all viable FEATs. Ranks by composite score, processes both autonomous_safe=true and autonomous_safe=false items with risk gate. Use --auto-mode to flip default to live dispatch (SLICE-C)."
+auto_execute_steps: false
 ---
 
 # Autonomous Backlog Walker
diff --git a/commands/backlog-add.md b/commands/backlog-add.md
index 51f6586..915fb08 100644
--- a/commands/backlog-add.md
+++ b/commands/backlog-add.md
@@ -1,5 +1,7 @@
 ---
+name: backlog-add
 description: Append a new feature to docs/backlog/pending/ with auto-assigned FEAT-NNN id.
+auto_execute_steps: false
 ---
 
 # Backlog Add
diff --git a/commands/backlog-enrich.md b/commands/backlog-enrich.md
index b048ba7..7552bc0 100644
--- a/commands/backlog-enrich.md
+++ b/commands/backlog-enrich.md
@@ -1,5 +1,7 @@
 ---
+name: backlog-enrich
 description: Classify every triaged feature — dispatch loop:architect inline for each, write tags / needs_contract / needs_ux into FEAT frontmatter so /crew:orchestrate-slice routes the full ladder.
+auto_execute_steps: false
 ---
 
 # Backlog Enrich
diff --git a/commands/backlog-list.md b/commands/backlog-list.md
index cc8bfa6..2931563 100644
--- a/commands/backlog-list.md
+++ b/commands/backlog-list.md
@@ -1,5 +1,7 @@
 ---
+name: backlog-list
 description: List backlog entries across all states with optional filters.
+auto_execute_steps: false
 ---
 
 # Backlog List
diff --git a/commands/backlog-promote.md b/commands/backlog-promote.md
index 8890f78..0746d26 100644
--- a/commands/backlog-promote.md
+++ b/commands/backlog-promote.md
@@ -1,5 +1,7 @@
 ---
+name: backlog-promote
 description: Move a triaged feature into in-progress and create a linked slice.
+auto_execute_steps: false
 ---
 
 # Backlog Promote
diff --git a/commands/brief.md b/commands/brief.md
index 4cdbe98..255f7d7 100644
--- a/commands/brief.md
+++ b/commands/brief.md
@@ -1,5 +1,7 @@
 ---
+name: brief
 description: Standalone loop situational report — backlog counts, top priorities, scores, decisions, pattern alerts. Complements crew brief-me.
+auto_execute_steps: false
 ---
 
 # Autonomous Loop Brief
diff --git a/commands/classify-slice-shape.md b/commands/classify-slice-shape.md
index 481ebbe..4d9391a 100644
--- a/commands/classify-slice-shape.md
+++ b/commands/classify-slice-shape.md
@@ -1,5 +1,7 @@
 ---
+name: classify-slice-shape
 description: Classify a slice's changed-file set into an inline-friendly shape.
+auto_execute_steps: false
 ---
 
 # Classify Slice Shape
diff --git a/commands/competitor-audit.md b/commands/competitor-audit.md
index 1677406..de30bf4 100644
--- a/commands/competitor-audit.md
+++ b/commands/competitor-audit.md
@@ -1,5 +1,7 @@
 ---
+name: competitor-audit
 description: Run a fresh competitor gap audit across all registered competitors, dispatch researchers to collect latest data, aggregate into ranked FEATs.
+auto_execute_steps: false
 ---
 
 # Competitor Audit
diff --git a/commands/decisions-list.md b/commands/decisions-list.md
index 63fff24..17149cc 100644
--- a/commands/decisions-list.md
+++ b/commands/decisions-list.md
@@ -1,5 +1,7 @@
 ---
+name: decisions-list
 description: List retrospective decisions captured from grade files — DEC-NNN entries with status, originating slice, supersession links.
+auto_execute_steps: false
 ---
 
 # Decisions List
diff --git a/commands/decisions-relevant.md b/commands/decisions-relevant.md
index c397305..f91367a 100644
--- a/commands/decisions-relevant.md
+++ b/commands/decisions-relevant.md
@@ -1,5 +1,7 @@
 ---
+name: decisions-relevant
 description: List retrospective decisions whose affects_files frontmatter matches any of the supplied changed files — surface prior architectural choices to reviewers.
+auto_execute_steps: false
 ---
 
 # Decisions Relevant
diff --git a/commands/decisions-show.md b/commands/decisions-show.md
index 0afea29..8161de2 100644
--- a/commands/decisions-show.md
+++ b/commands/decisions-show.md
@@ -1,5 +1,7 @@
 ---
+name: decisions-show
 description: Print the full body + frontmatter of a single decision by id.
+auto_execute_steps: false
 ---
 
 # Decisions Show
diff --git a/commands/decisions-supersede.md b/commands/decisions-supersede.md
index 578b875..412cfa1 100644
--- a/commands/decisions-supersede.md
+++ b/commands/decisions-supersede.md
@@ -1,5 +1,7 @@
 ---
+name: decisions-supersede
 description: Mark an existing decision as superseded by a newer one — updates both files atomically.
+auto_execute_steps: false
 ---
 
 # Decisions Supersede
diff --git a/commands/derive-slice.md b/commands/derive-slice.md
index 01c1921..ccd5b6a 100644
--- a/commands/derive-slice.md
+++ b/commands/derive-slice.md
@@ -1,5 +1,7 @@
 ---
+name: derive-slice
 description: Derive a new slice from the highest-priority unmet requirement in product-backlog.md when approved-slices.md is empty.
+auto_execute_steps: false
 ---
 
 # Derive Next Slice
diff --git a/commands/install.md b/commands/install.md
index 477c5da..c5028bf 100644
--- a/commands/install.md
+++ b/commands/install.md
@@ -1,5 +1,7 @@
 ---
+name: install
 description: Install or refresh the loop methodology layer in this repo (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
+auto_execute_steps: false
 ---
 
 # Install Autonomous Loop
diff --git a/commands/intake.md b/commands/intake.md
index 477ed34..36e2488 100644
--- a/commands/intake.md
+++ b/commands/intake.md
@@ -1,5 +1,7 @@
 ---
+name: intake
 description: Two-phase backlog intake. Phase 1 dispatches the PM agent to score every pending FEAT (5-dimension triage). Phase 2 dispatches loop:architect on each newly-triaged FEAT to classify tags / needs_contract / needs_ux. Replaces the manual /loop:triage + /loop:backlog-enrich split with one invocation.
+auto_execute_steps: false
 ---
 
 # Intake (FEAT-189 / SLICE-103)
diff --git a/commands/learn.md b/commands/learn.md
index c8c22d2..268b224 100644
--- a/commands/learn.md
+++ b/commands/learn.md
@@ -1,5 +1,7 @@
 ---
+name: learn
 description: Log an operational learning to the persistent learnings store (.claude/artifacts/loop/learnings.jsonl). Use mid-session when you observe something worth preserving for future sessions.
+auto_execute_steps: false
 ---
 
 # Loop Learn
diff --git a/commands/lessons-recent.md b/commands/lessons-recent.md
index a20e8c8..7a42d02 100644
--- a/commands/lessons-recent.md
+++ b/commands/lessons-recent.md
@@ -1,5 +1,7 @@
 ---
+name: lessons-recent
 description: Return the last N slice grades' lessons / surprises / followups as a feed-forward digest for the next-slice planner.
+auto_execute_steps: false
 ---
 
 # Lessons Recent
diff --git a/commands/list-presets.md b/commands/list-presets.md
index e86399b..ac2726b 100644
--- a/commands/list-presets.md
+++ b/commands/list-presets.md
@@ -1,5 +1,7 @@
 ---
+name: list-presets
 description: Show built-in loop presets with their stack defaults.
+auto_execute_steps: false
 ---
 
 # List Autonomous Loop Presets
diff --git a/commands/next-slice.md b/commands/next-slice.md
index 0b79a04..ac763e0 100644
--- a/commands/next-slice.md
+++ b/commands/next-slice.md
@@ -1,5 +1,7 @@
 ---
+name: next-slice
 description: Pick the next PENDING slice from approved-slices.md and surface it for implementation.
+auto_execute_steps: false
 ---
 
 # Pick Next Slice
diff --git a/commands/phase-gate.md b/commands/phase-gate.md
index 68adae9..375268d 100644
--- a/commands/phase-gate.md
+++ b/commands/phase-gate.md
@@ -1,5 +1,7 @@
 ---
+name: phase-gate
 description: Run the configured phase-gate test suite, capture all output, write the validation artifact via crew.
+auto_execute_steps: false
 ---
 
 # Run Phase Gate
diff --git a/commands/pr-fix.md b/commands/pr-fix.md
index de82935..8404d59 100644
--- a/commands/pr-fix.md
+++ b/commands/pr-fix.md
@@ -1,5 +1,7 @@
 ---
+name: pr-fix
 description: "Poll a PR's status, categorize unfixed issues (lint, test, review, CI, security), and emit fix plans with circuit breaker. Supports retried dispatches via priorAttempts tracking."
+auto_execute_steps: false
 ---
 
 # PR Issue Fixer
diff --git a/commands/release-plan.md b/commands/release-plan.md
index d92ded2..37daf1e 100644
--- a/commands/release-plan.md
+++ b/commands/release-plan.md
@@ -1,5 +1,7 @@
 ---
+name: release-plan
 description: Plan a release — collect all FEAT entries targeting a version, group by parent spec, write release notes to docs/releases/v<X.Y.Z>.md.
+auto_execute_steps: false
 ---
 
 # Release Plan
diff --git a/commands/retriage.md b/commands/retriage.md
index 879769b..bc70880 100644
--- a/commands/retriage.md
+++ b/commands/retriage.md
@@ -1,5 +1,7 @@
 ---
+name: retriage
 description: Opt-in higher-quality triage. Three-phase orchestrator — PM clarity check + score-or-flag, orchestrator fans out loop:spec-writer for flagged FEATs, PM re-scores against rewritten AC. Original /loop:triage stays unchanged (cheaper, faster, suitable when AC are already concrete).
+auto_execute_steps: false
 ---
 
 # Retriage (FEAT-193 / SLICE-109)
diff --git a/commands/retrospective.md b/commands/retrospective.md
index 1c78fbe..d3b9254 100644
--- a/commands/retrospective.md
+++ b/commands/retrospective.md
@@ -1,5 +1,7 @@
 ---
+name: retrospective
 description: Aggregate grades + decisions + backlog over a time window into docs/retrospectives/YYYY-MM-DD.md.
+auto_execute_steps: false
 ---
 
 # Retrospective
diff --git a/commands/slice-complete.md b/commands/slice-complete.md
index 35887fb..39fc028 100644
--- a/commands/slice-complete.md
+++ b/commands/slice-complete.md
@@ -1,5 +1,7 @@
 ---
+name: slice-complete
 description: Close a slice — move slice file to completed/, feature to done/, auto-roll satisfied specs, suggest grade as next action.
+auto_execute_steps: false
 ---
 
 # Slice Complete
diff --git a/commands/slice-from-feature.md b/commands/slice-from-feature.md
index 781b9cb..7c6644d 100644
--- a/commands/slice-from-feature.md
+++ b/commands/slice-from-feature.md
@@ -1,5 +1,7 @@
 ---
+name: slice-from-feature
 description: Promote a backlog feature into an engineering slice — moves the feature to in-progress/, creates the slice file under slicesRoot/pending/, and cross-links them.
+auto_execute_steps: false
 ---
 
 # Slice From Feature
diff --git a/commands/slice-grade-write.md b/commands/slice-grade-write.md
index a91a50d..d6ca152 100644
--- a/commands/slice-grade-write.md
+++ b/commands/slice-grade-write.md
@@ -1,5 +1,7 @@
 ---
+name: slice-grade-write
 description: Validate grade scores, extract DEC-TBD decisions into docs/decisions/, persist frontmatter linkage. Idempotent.
+auto_execute_steps: false
 ---
 
 # Slice Grade Write
diff --git a/commands/slice-grade.md b/commands/slice-grade.md
index 5513268..a70da61 100644
--- a/commands/slice-grade.md
+++ b/commands/slice-grade.md
@@ -1,5 +1,7 @@
 ---
+name: slice-grade
 description: Generate a pre-filled grade template at slice close — agent then edits scores, lessons, decisions, narrative.
+auto_execute_steps: false
 ---
 
 # Slice Grade
diff --git a/commands/slice-link.md b/commands/slice-link.md
index d72176e..e9a634d 100644
--- a/commands/slice-link.md
+++ b/commands/slice-link.md
@@ -1,5 +1,7 @@
 ---
+name: slice-link
 description: Append a crew artifact path (review/validation/deployment) to a slice's frontmatter linkage array — replaces regex auto-prefill with deterministic walk.
+auto_execute_steps: false
 ---
 
 # Slice Link
diff --git a/commands/slice-plan.md b/commands/slice-plan.md
index 5bbba1a..35122b1 100644
--- a/commands/slice-plan.md
+++ b/commands/slice-plan.md
@@ -1,5 +1,7 @@
 ---
+name: slice-plan
 description: Run the codebase research pre-flight for a slice and write an editable plan artifact under .claude/artifacts/loop/plans/.
+auto_execute_steps: false
 ---
 
 # Slice Plan
diff --git a/commands/slice-post-builder-fanout.md b/commands/slice-post-builder-fanout.md
index c26d7cc..fa2d578 100644
--- a/commands/slice-post-builder-fanout.md
+++ b/commands/slice-post-builder-fanout.md
@@ -1,5 +1,7 @@
 ---
+name: slice-post-builder-fanout
 description: Emit a single parallel-dispatch payload with reviewers A+B and the validator after builder PASS.
+auto_execute_steps: false
 ---
 
 # Slice — Post-Builder Fanout
diff --git a/commands/slice-review-ladder.md b/commands/slice-review-ladder.md
index 7c948f5..bc59448 100644
--- a/commands/slice-review-ladder.md
+++ b/commands/slice-review-ladder.md
@@ -1,5 +1,7 @@
 ---
+name: slice-review-ladder
 description: Emit structured Reviewer A + B (configurable) task prompts for parallel crew:inspector subagent dispatch.
+auto_execute_steps: false
 ---
 
 # Slice Review Ladder
diff --git a/commands/slice-start.md b/commands/slice-start.md
index 17fc887..04fb51a 100644
--- a/commands/slice-start.md
+++ b/commands/slice-start.md
@@ -1,5 +1,7 @@
 ---
+name: slice-start
 description: Open a slice — rotate workflow-state.currentRun via write-run-brief, refresh slice-progress dashboard.
+auto_execute_steps: false
 ---
 
 # Slice Start
diff --git a/commands/snapshot-memory.md b/commands/snapshot-memory.md
index c3cbe96..2834a90 100644
--- a/commands/snapshot-memory.md
+++ b/commands/snapshot-memory.md
@@ -1,5 +1,7 @@
 ---
+name: snapshot-memory
 description: Write docs/loop-snapshot.md — durable cross-session memory of backlog/specs/grades/decisions state. Reference from CLAUDE.md via `@`.
+auto_execute_steps: false
 ---
 
 # Snapshot Memory
diff --git a/commands/spec-add.md b/commands/spec-add.md
index 7567709..37272fc 100644
--- a/commands/spec-add.md
+++ b/commands/spec-add.md
@@ -1,5 +1,7 @@
 ---
+name: spec-add
 description: Create a new SPEC-NNN.md (PRD / user journey / SRE / research / ADR) under docs/specs/.
+auto_execute_steps: false
 ---
 
 # Spec Add
diff --git a/commands/spec-decompose.md b/commands/spec-decompose.md
index bb49f99..b302164 100644
--- a/commands/spec-decompose.md
+++ b/commands/spec-decompose.md
@@ -1,5 +1,7 @@
 ---
+name: spec-decompose
 description: Derive FEAT-NNN files from a spec and wire the SPEC↔FEAT linkage.
+auto_execute_steps: false
 ---
 
 # Spec Decompose
diff --git a/commands/spec-list.md b/commands/spec-list.md
index 8897f45..694e27b 100644
--- a/commands/spec-list.md
+++ b/commands/spec-list.md
@@ -1,5 +1,7 @@
 ---
+name: spec-list
 description: List specs with optional filters by status / type / priority / target_release.
+auto_execute_steps: false
 ---
 
 # Spec List
diff --git a/commands/spec-status.md b/commands/spec-status.md
index e54eb8c..9496256 100644
--- a/commands/spec-status.md
+++ b/commands/spec-status.md
@@ -1,5 +1,7 @@
 ---
+name: spec-status
 description: Report satisfaction state across all specs (% of derived features done) and auto-roll status to satisfied where appropriate.
+auto_execute_steps: false
 ---
 
 # Spec Status
diff --git a/commands/start.md b/commands/start.md
index f25b3b3..79d6f77 100644
--- a/commands/start.md
+++ b/commands/start.md
@@ -1,5 +1,7 @@
 ---
+name: start
 description: First action for a fresh loop session — read mandatory docs, pick highest-priority PENDING slice, run the first-response checklist.
+auto_execute_steps: false
 ---
 
 # Start Autonomous Loop Session
diff --git a/commands/status.md b/commands/status.md
index f23f4dc..0e39cbe 100644
--- a/commands/status.md
+++ b/commands/status.md
@@ -1,5 +1,7 @@
 ---
+name: status
 description: Report current loop install state for this repo — preset, paths, marker presence, crew dep.
+auto_execute_steps: false
 ---
 
 # Autonomous Loop Status
diff --git a/commands/stop-check.md b/commands/stop-check.md
index 1cdd2f4..1eb9b1b 100644
--- a/commands/stop-check.md
+++ b/commands/stop-check.md
@@ -1,5 +1,7 @@
 ---
+name: stop-check
 description: Unified stop-condition resolver — should the autonomous loop halt now? Returns reasons + blockers + suggestions.
+auto_execute_steps: false
 ---
 
 # Stop Check
diff --git a/commands/sync-claims.md b/commands/sync-claims.md
index 6969ee1..7449ccd 100644
--- a/commands/sync-claims.md
+++ b/commands/sync-claims.md
@@ -1,5 +1,7 @@
 ---
+name: sync-claims
 description: Reconcile crew claims with loop backlog state — promote claimed FEAT files to in-progress, warn on orphan in-progress without claim.
+auto_execute_steps: false
 ---
 
 # Sync Claims
diff --git a/commands/triage.md b/commands/triage.md
index 84a0144..7322c3a 100644
--- a/commands/triage.md
+++ b/commands/triage.md
@@ -1,5 +1,7 @@
 ---
+name: triage
 description: Triage every pending backlog FEAT using the PM agent (5-dimension scoring). PM-only — on PM error, validation failure, or budget exceedance, halt and surface to the operator.
+auto_execute_steps: false
 ---
 
 # Triage
diff --git a/src/scripts/validate-manifests.mts b/src/scripts/validate-manifests.mts
index c465573..6343e94 100644
--- a/src/scripts/validate-manifests.mts
+++ b/src/scripts/validate-manifests.mts
@@ -8,6 +8,7 @@ import { readdirSync, readFileSync, existsSync } from "node:fs";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
 import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";
+import { parseFrontmatter } from "./lib/frontmatter.mjs";
 
 const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
 
@@ -36,6 +37,44 @@ export function validateAllPresets(repoRoot: string): string[] {
   return errors;
 }
 
+export function validateCommandFrontmatter(repoRoot: string): string[] {
+  const dir = path.join(repoRoot, "commands");
+  const errors: string[] = [];
+  if (!existsSync(dir)) return errors;
+  for (const entry of readdirSync(dir)) {
+    if (!entry.endsWith(".md")) continue;
+    const stem = entry.slice(0, -".md".length);
+    const full = path.join(dir, entry);
+    const content = readFileSync(full, "utf8");
+    const { frontmatter } = parseFrontmatter(content);
+    // Validate name
+    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "name"))) {
+      errors.push(`commands/${entry}: missing required field "name"`);
+    } else if (typeof frontmatter["name"] !== "string" || frontmatter["name"] === "") {
+      errors.push(`commands/${entry}: "name" must be a non-empty string`);
+    } else if (frontmatter["name"] !== stem) {
+      errors.push(
+        `commands/${entry}: "name" must equal filename stem "${stem}", got "${frontmatter["name"]}"`
+      );
+    }
+    // Validate description
+    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "description"))) {
+      errors.push(`commands/${entry}: missing required field "description"`);
+    } else if (typeof frontmatter["description"] !== "string" || frontmatter["description"] === "") {
+      errors.push(`commands/${entry}: "description" must be a non-empty string`);
+    }
+    // Validate auto_execute_steps
+    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "auto_execute_steps"))) {
+      errors.push(`commands/${entry}: missing required field "auto_execute_steps"`);
+    } else if (typeof frontmatter["auto_execute_steps"] !== "boolean") {
+      errors.push(
+        `commands/${entry}: "auto_execute_steps" must be a boolean, got ${typeof frontmatter["auto_execute_steps"]}`
+      );
+    }
+  }
+  return errors;
+}
+
 function validateMarketplaceEntries(
   marketplace: Record<string, any>,
   fail: (msg: string) => void
@@ -51,6 +90,37 @@ function validateMarketplaceEntries(
   }
 }
 
+// marketplace.json moved to sergeymilashico/astra-marketplace (4a46687). When
+// a local copy exists (mirror or transitional setup), enforce lockstep with
+// plugin.json. When absent, treat as authoritative-elsewhere and skip.
+function validateMarketplaceJson(
+  marketplace: Record<string, any>,
+  plugin: Record<string, any>,
+  fail: (msg: string) => void
+): void {
+  for (const field of ["name", "owner", "plugins"]) {
+    if (
+      marketplace[field] === undefined ||
+      marketplace[field] === null ||
+      marketplace[field] === ""
+    ) {
+      fail(`marketplace.json: missing required field "${field}"`);
+    }
+  }
+  const ownEntry = marketplace.plugins.find(
+    (entry: { name: string; version: string; source?: string }) => entry.name === plugin.name
+  );
+  if (!ownEntry) {
+    fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
+  } else if (ownEntry.version !== plugin.version) {
+    fail(
+      `version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
+        `Run "npm run bump-version <new-version>" to sync.`
+    );
+  }
+  validateMarketplaceEntries(marketplace, fail);
+}
+
 export async function validateManifests(repoRoot: string) {
   const failures: string[] = [];
   const fail = (msg: string) => failures.push(msg);
@@ -69,31 +139,8 @@ export async function validateManifests(repoRoot: string) {
   if (!SEMVER_RE.test(plugin.version))
     fail(`plugin.json: version "${plugin.version}" is not parseable semver`);
 
-  // marketplace.json moved to sergeymilashico/astra-marketplace (4a46687). When
-  // a local copy exists (mirror or transitional setup), enforce lockstep with
-  // plugin.json. When absent, treat as authoritative-elsewhere and skip.
   if (marketplace) {
-    for (const field of ["name", "owner", "plugins"]) {
-      if (
-        marketplace[field] === undefined ||
-        marketplace[field] === null ||
-        marketplace[field] === ""
-      ) {
-        fail(`marketplace.json: missing required field "${field}"`);
-      }
-    }
-    const ownEntry = marketplace.plugins.find(
-      (entry: { name: string; version: string; source?: string }) => entry.name === plugin.name
-    );
-    if (!ownEntry) {
-      fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
-    } else if (ownEntry.version !== plugin.version) {
-      fail(
-        `version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
-          `Run "npm run bump-version <new-version>" to sync.`
-      );
-    }
-    validateMarketplaceEntries(marketplace, fail);
+    validateMarketplaceJson(marketplace, plugin, fail);
   }
 
   if (pkg.version !== plugin.version) {
@@ -107,6 +154,10 @@ export async function validateManifests(repoRoot: string) {
     fail(presetErr);
   }
 
+  for (const cmdErr of validateCommandFrontmatter(repoRoot)) {
+    fail(cmdErr);
+  }
+
   return { ok: failures.length === 0, failures, plugin, marketplace, pkg };
 }
 

```

## Files touched

### commands/architect.md

```
---
name: architect
description: Run the codebase research pre-flight using the architect model (Opus) and return a two-model dispatch instruction.
auto_execute_steps: false
---

# Architect

Runs the codebase research pre-flight pass using the architect model (Opus)
and returns a two-model dispatch instruction that names both the architect
(research/plan) and editor (implementation) models.

This command implements the **FEAT-005 two-model split**: a dedicated
research phase using the architect model, followed by a dispatch instruction
that directs the editor model to implement based on the generated plan
artifact.

## What it does

1. Resolves the configured architect and editor models from `loop.json`.
   - **Architect model:** `modelRouting.architect` → `modelRouting.sliceStart` → Opus (defaults to Opus for research/planning)
   - **Editor model:** `modelRouting.build` → `modelRouting.default` → Opus (Sonnet when using standard presets)

2. Calls `runPlanPreflight` to execute the codebase research pass:
   - Locates the slice file under `.claude/artifacts/loop/ai-loop/slices/`
   - Extracts in-scope file hints from slice frontmatter or body
   - Reads first 50 lines of each matched source file
   - Extracts exported symbol names

3. Writes the plan artifact to `.claude/artifacts/loop/plans/<TS>-plan-<sliceId>.md`

4. Returns a structured dispatch instruction that names both models explicitly
   and tells the agent to dispatch `/crew:build` for the editor phase.

## Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" architect \
  --repo "$PWD" \
  --id SLICE-NN
```

## Returns

```json
{
  "sliceId": "SLICE-10",
  "architectModel": "opus",
  "editorModel": "sonnet",
  "planPath": ".claude/artifacts/loop/plans/20260602T120000Z-plan-SLICE-10.md",
  "filesResearched": ["src/scripts/lib/slice-plan.mts", "commands/slice-plan.md"],
  "dispatchInstruction": "## Two-Model Split Dispatch\n\n**Architect Model (Research/Plan):** opus\n**Editor Model (Implementation):** sonnet\n\n..."
}
```

## When to use

Before dispatching `/crew:build` on a non-trivial slice that requires explicit
model routing. This command:

- **Complements Plan Mode** (FEAT-006): while Plan Mode adds an approval gate,
  the architect command adds explicit model naming.
- **Enables two-model workflows** where research (architect/Opus) and
  implementation (editor/Sonnet) are handled by different models.
- **Surfaces model decisions** so the dispatch instruction can be reviewed
  before `/crew:build` is invoked.

Typical flow:

```
1. loop architect --id SLICE-10          # Architect does research
2. [Review plan artifact]
3. /crew:build                           # Editor does implementation (per dispatch instruction)
```

## Relationship to other commands

- **`loop slice plan`**: The bare pre-flight primitive (no model routing).
  The architect command wraps this and adds explicit two-model coordination.
- **`loop slice start`**: Triggers the full ceremony (plan + dispatch).
  The architect command is a lower-level hook for explicit model routing control.

```

### commands/auto.md

```
---
name: auto
description: "Walk the triaged backlog and emit dispatch plans for all viable FEATs. Ranks by composite score, processes both autonomous_safe=true and autonomous_safe=false items with risk gate. Use --auto-mode to flip default to live dispatch (SLICE-C)."
auto_execute_steps: false
---

# Autonomous Backlog Walker

Reads the triaged backlog, ranks by composite score and priority, and emits
a structured dispatch plan for each candidate. Walks both `autonomous_safe: true`
and `autonomous_safe: false` FEATs (with risk gate). Respects cost cap and
escalation thresholds from loop.json.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" auto \
  --repo "$PWD" \
  [--dry-run] \
  [--auto-mode] \
  [--max-features N]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--dry-run` | boolean | false | Emit plans only; do not dispatch builder. When false with --auto-mode, triggers live dispatch. |
| `--auto-mode` | boolean | false | Include `autoMode: true` in all plans and `orchConfig.autoMode: true` to suppress per-plan approval gates (SLICE-C). |
| `--max-features N` | number | unlimited | Cap the number of plans returned. Walker stops after N plans regardless of remaining candidates. |

## Output shape

```json
{
  "walked":    3,
  "skipped":   [{ "id": "FEAT-002", "reason": "not_autonomous_safe" }],
  "planned":   2,
  "halted":    false,
  "stopReason": null,
  "summaryPath": ".claude/artifacts/loop/auto-runs/2026-06-03T12-34-56-789Z-auto-run.md",
  "orchConfig": {
    "costStopThreshold": 5,
    "escalationThreshold": 3,
    "autoMode": false
  },
  "plans": [
    {
      "featureId":          "FEAT-001",
      "suggestedSliceTitle": "Implement FEAT-001: My safe feature",
      "fromFeatureCmd":      "bun src/scripts/loop.mts slice from-feature --id FEAT-001",
      "startCmd":            "bun src/scripts/loop.mts slice start --id SLICE-<TBD>",
      "orchestratorMode":    "slice-build",
      "dispatchPrompt":      "Implement FEAT-001: My safe feature (feature) — see feature file for full acceptance criteria.",
      "builderPrompt":       "Implement FEAT-001: My safe feature (feature) — see feature file for full acceptance criteria.",
      "autoMode":            false
    }
  ]
}
```

### Fields

- `walked` — total number of triaged FEATs considered.
- `skipped` — FEATs excluded from planning; each entry has `id` and `reason`.
  Reason codes: `not_autonomous_safe`, `deferred`, `depends_on: [...]`, `risk gate blocked`.
- `planned` — count of dispatch plans emitted (equals `plans.length`).
- `halted` — `true` when a stop condition or cost cap fired mid-walk.
- `stopReason` — first stop reason string when `halted=true`; `null` otherwise.
- `summaryPath` — path to artifact under `.claude/artifacts/loop/auto-runs/` (SLICE-B).
- `orchConfig` — hints for orchestrator layer (SLICE-C):
  - `costStopThreshold`: from `loop.json` or option; plan-count cap for cost control.
  - `escalationThreshold`: 3 (hard-coded; 3 consecutive fails per FEAT → escalate).
  - `autoMode`: reflects the `--auto-mode` option.
- `plans` — ordered array of dispatch-plan objects.
  - `orchestratorMode`: which subagent the orchestrator should dispatch
    (`"lead"` default, `"orchestrate-slice"`, or `"direct-builder"`).
    Mirrors `loop.orchestratorMode` from `.claude/loop.json`.
  - `dispatchPrompt`: prompt for the dispatched agent. Framed as orchestration
    when mode is `"lead"`, as direct implementation when `"direct-builder"`,
    or as a `/crew:orchestrate-slice` invocation when `"orchestrate-slice"`.
  - `builderPrompt`: **deprecated** alias of `dispatchPrompt` retained for
    v0.38.x readers. New consumers should use `dispatchPrompt` and route
    based on `orchestratorMode`.
  - `requiresPlanPreflight`: true for `autonomous_safe: false` FEATs.
  - `riskGate`: populated when `pm_risk_level >= 0.7`.
  - `autoMode`: set when `--auto-mode` passed.

## Ranking order

Candidates are sorted before planning:
1. `composite_score` DESC (missing treated as `0`)
2. Priority ascending: P0 > P1 > P2 > P3 (missing treated as P3)
3. `pm_strategic_fit` DESC (missing treated as `0`)

## Filter rules

- Only `triaged` FEATs are considered (not pending, in-progress, or done).
- FEATs must have `autonomous_safe: true` or `autonomous_safe: false` (not null/undefined).
- `autonomous_safe: false` items are subject to risk gate (see below).
- Skipped due to risk gate if: `deferred: true`, `depends_on` incomplete, or other blockers.

## Stop conditions

After emitting each plan the walker checks two conditions:

1. **Cost cap (SLICE-C):** If `costStopThreshold` is set (from `--max-features`,
   `loop.json costStopThreshold`, or orchestrator layer), halt when
   `plans.length >= costStopThreshold` with `stopReason: "cost_cap: ..."`.

2. **Global stop (all slices):** Calls `checkStopConditions`. If any condition
   fires (`shouldStop: true`), halt immediately with `stopReason` from the first reason.

See `commands/stop-check.md` for the full list of stop conditions.

## Risk gate (autonomous_safe=false items)

When `autonomous_safe: false` is encountered, the walker evaluates:

| Condition | Action |
|---|---|
| `deferred: true` | Skip with reason `"deferred"` |
| `depends_on` non-empty (unfinished) | Skip, listing deps in reason |
| `pm_risk_level >= 0.7` | Include in plans with `riskGate.warn` (SPEC recommended) |
| Otherwise | Include in plans with `requiresPlanPreflight: true` |

## Roadmap

- **SLICE-A** — Backlog walker + auto-decisions for autonomous_safe=true items only. ✓ Shipped
- **SLICE-B** — Plan Mode pre-flight + risk gate + /crew:fix auto-pivot. ✓ Shipped
- **SLICE-C** — Stop-condition wiring + cost cap + escalation flag. ✓ Shipped

```

### commands/backlog-add.md

```
---
name: backlog-add
description: Append a new feature to docs/backlog/pending/ with auto-assigned FEAT-NNN id.
auto_execute_steps: false
---

# Backlog Add

Creates a new `FEAT-NNN.md` under `docs/backlog/pending/` with frontmatter
matching the canonical template. The next FEAT id is computed across all
state directories (no gaps reused).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog add \
  --repo "$PWD" \
  --title "Bulk delete memories from dashboard" \
  [--priority P1] [--category feature] [--target-release v1.1.0] \
  [--body "Optional full description"]
```

Or positional title (everything after the subcommand becomes the title):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog add \
  --repo "$PWD" -- Bulk delete memories from dashboard
```

Pre-fill from a GitHub Issue (requires `gh` CLI authenticated):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog add \
  --repo "$PWD" \
  --from-issue https://github.com/owner/repo/issues/42
```

When `--from-issue` is used the command calls `gh issue view <url> --json
title,body,number,url` and pre-fills:

- `title` — from the issue title (overridden by `--title` if also passed)
- `body` — from the issue body (overridden by `--body` if also passed)
- `github_issue` — the issue number, stored in FEAT frontmatter
- `github_url` — the canonical issue URL, stored in FEAT frontmatter

If `gh` is not installed, not authenticated, or the issue is private/
inaccessible, the command exits with a clear error and does **not** create
a partial FEAT file.

Returned JSON includes the new id, file path, and resolved frontmatter.

When --priority / --category / --target-release are omitted, the entry lands
in `pending/` with those fields null. The PM agent will fill them on the
next `/loop:triage` run (also invoked automatically by the Cross-Slice
Continuation HARD RULE when `pending/` is non-empty).

```

### commands/backlog-enrich.md

```
---
name: backlog-enrich
description: Classify every triaged feature — dispatch loop:architect inline for each, write tags / needs_contract / needs_ux into FEAT frontmatter so /crew:orchestrate-slice routes the full ladder.
auto_execute_steps: false
---

# Backlog Enrich

Sweeps `.claude/artifacts/loop/backlog/triaged/FEAT-*.md` (or the
configured backlog root) and, for every entry missing classification
fields, dispatches `loop:architect` from the current session, parses
the response, and writes `tags` + `needs_contract` + `needs_ux` into
the FEAT frontmatter.

Why this matters: `/crew:orchestrate-slice` reads those fields to
decide which specialists fire. Without them the ladder falls back to
AC-text heuristics and silently skips architect + uxdesigner.

Note: `stack` and `surface` are no longer FEAT-level fields. Project-level
stack identity now lives in `scripts/presets/*.json` (consumed by
`bun src/scripts/loop.mts resolve-skills`). Builder-variant routing is driven
from preset skill activation, not per-FEAT classification.

## Execution (Claude-driven, not CLI)

The Node CLI subcommand (`bun src/scripts/loop.mts backlog enrich`) only
writes pending-dispatch markers — it does NOT spawn subagents. See
`docs/code-conventions.md` and `auto-dispatch.mts` for the consumer
gap (tracked as a known followup). Use the slash flow below instead;
it dispatches inline and writes results synchronously.

Steps:

1. **List triaged FEATs.** Glob
   `.claude/artifacts/loop/backlog/triaged/FEAT-*.md` (or the path
   resolved via `loop.json::backlogRoot`). Read the frontmatter of
   each.
2. **Filter unclassified.** Skip entries where `tags` is non-empty
   OR `needs_contract` is set OR `needs_ux` is set. Already-tagged
   entries are left untouched.
3. **Resolve architect skills via preset.** Before dispatching, run:

   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" resolve-skills \
     --variant architect \
     --preset "${CLAUDE_PLUGIN_ROOT}/scripts/presets/$(jq -r .preset .claude/loop.json).json" \
     --override .claude/loop.json
   ```

   On exit 0, capture `.dispatchInstructionBlock` from the JSON
   output. On exit 2, proceed without the block (architect falls
   back to its baked-in routing table). On exit 1, halt and surface
   the stderr.

4. **Dispatch `loop:architect` in parallel.** Send all classify
   requests in a single message containing one `Agent` tool call
   per unclassified FEAT. Prepend the resolved-skills block (when
   present) to each prompt so the agent invokes the right Skill
   tools before classifying. Prompt template per FEAT:

   ```
   <dispatchInstructionBlock from step 3 — omit if exit was 2>

   Classify this feature for the orchestrate-slice router.
   Read <ABSOLUTE_PATH_TO_FEAT> for context. Respond with ONLY this
   key:value block — no preamble, no headings:
   tags: [<labels from: api-change, storage, workflow, ux, auth, infra, test, docs, refactor>]
   needs_contract: <true|false>
   needs_ux: <true|false>
   ```

5. **Parse responses.** For each architect response, extract the
   three fields tolerantly (ignore prose, headings, blank lines).
   Tags must be filtered to the known vocabulary; drop unknowns.
6. **Write frontmatter via `Edit`.** For each FEAT with at least
   one parsed field, edit the YAML frontmatter to insert / update
   `tags`, `needs_contract`, `needs_ux`. Preserve all other fields
   verbatim. If nothing parsed, skip the write.
7. **Report.** Print a one-line summary:
   `Enriched: <count> / Already tagged: <count> / Failed: <count>`.

## Idempotence

Re-running only hits FEATs that still lack tags. Already-classified
FEATs are filtered in step 2. Safe to run after every
`/loop:backlog-triage` sweep.

## Pass 2: contracts pre-population

Runs after pass 1 has written `needs_contract` into FEAT frontmatter for
every triaged entry. Pass 2 is independent — pass 1 must complete first so
`needs_contract` is set before this sweep reads it.

Steps:

1. **Glob the same triaged FEAT set** used in pass 1:
   `.claude/artifacts/loop/backlog/triaged/FEAT-*.md`.
2. **Filter to contract-needing FEATs.** Read `needs_contract` from each
   FEAT's frontmatter. Skip the FEAT if `needs_contract: false` or the field
   is absent.
3. **Check artifact existence.** For each remaining FEAT, check whether
   `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` already exists
   (the path returned by `getContractsPath` from
   `src/scripts/lib/contracts-artifact.mts` — that helper is the single
   source of truth for path resolution). If present, skip (idempotence —
   existing artifact is left untouched).
4. **Dispatch `crew:architect` inline.** For each missing artifact, dispatch
   `crew:architect` via the Agent tool using the canonical prompt at
   `${CLAUDE_PLUGIN_ROOT}/templates/contracts-architect-prompt.md` (plugin-root
   absolute path — consumer repos do not ship `templates/`). Parallel dispatches
   are allowed for batches of ≤5; above that, dispatch sequentially to avoid
   rate limits. If the template cannot be read, STOP and surface the error —
   do NOT fall back to ad-hoc sections (silent fallback masks plugin install
   drift).
5. **Validate and write.** Parse each response. If the response is empty OR
   does not contain all four required section headers
   (`## TypeScript Interfaces`, `## API Contracts`, `## Event Schemas`,
   `## Data Contracts`), log:

   ```
   WARNING: contracts artifact for <FEAT-ID> not written — architect response
   empty/malformed. Re-run /loop:backlog-enrich or rely on
   /crew:orchestrate-slice Step 1 retry.
   ```

   and continue without writing a partial file (fail-open per FEAT-049
   lesson). On a well-formed response: `mkdir -p .claude/artifacts/crew/designs/`
   then write the artifact via the Write tool (new file — Write, not Edit).

6. **Report.** Print:
   `Contracts written: <count> / Already present: <count> / Skipped (not needed): <count> / Failed: <count>`.

## Pass independence

Pass 1 (tag classification) and pass 2 (contracts pre-population) share no
state beyond `needs_contract` written by pass 1. An operator may:

- Re-run the full slash flow safely: pass 1 skips already-tagged FEATs (step
  2 filter); pass 2 skips already-present artifacts (step 3 check).
- Run only pass 2 after pass 1 has already classified: pass 1 becomes a
  no-op; pass 2 runs fresh against the `needs_contract: true` entries.
- Run only pass 1 to classify without triggering architect contract dispatch:
  stop after step 6 of pass 1 and do not proceed to pass 2.

This independence satisfies AC-8c — the operator can invoke either pass alone.

## CLI fallback (audit-only)

The CLI subcommand exists but its dispatch path writes markers to
`.claude/artifacts/loop/pending-dispatch/` without a consumer. Useful
only for audit-log trace via `.claude/artifacts/loop/auto-dispatch.jsonl`
when an outer harness is wired in future.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog enrich --repo "$PWD"
```

Until the consumer ships, the CLI reports `Enriched: 0` even when
markers are written. Prefer the slash flow above.

## Cost note

One `loop:architect` dispatch per unclassified FEAT (pass 1). Run on small
batches (≤10) or check cost-cap first. Each dispatch reads the FEAT file and
emits ~3 lines of structured output. Pass 2 adds one additional `crew:architect`
dispatch per `needs_contract: true` FEAT whose contracts artifact is missing;
each dispatch reads the full FEAT and emits a multi-section markdown document.

## Skip dispatch

The CLI accepts `--no-classify` to short-circuit (audit log only).
The slash flow has no skip — simply don't invoke it.

```

### commands/backlog-list.md

```
---
name: backlog-list
description: List backlog entries across all states with optional filters.
auto_execute_steps: false
---

# Backlog List

Walks `docs/backlog/{pending,triaged,in-progress,done}/` and returns one entry
per FEAT file, sorted by numeric id.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog list \
  --repo "$PWD" \
  [--status pending|triaged|in-progress|done] \
  [--priority P0|P1|P2|P3] \
  [--category feature|bugfix|ops|tech-debt] \
  [--target-release vX.Y.Z]
```

Returns JSON: `{ count, entries: [{ id, state, priority, category,
target_release, created, updated, derived_from, slices, filePath }, ...] }`.

Common patterns:

```bash
# Top-priority untriaged work
node ... backlog list --repo "$PWD" --status pending --priority P0

# Everything slated for the next release
node ... backlog list --repo "$PWD" --target-release v1.1.0

# Features derived from a specific spec (filter on derived_from manually in jq)
node ... backlog list --repo "$PWD" | jq '.entries[] | select(.derived_from == "SPEC-001")'
```

```

### commands/backlog-promote.md

```
---
name: backlog-promote
description: Move a triaged feature into in-progress and create a linked slice.
auto_execute_steps: false
---

# Backlog Promote

Promotes a feature from `triaged/` to `in-progress/`:

1. Looks up FEAT-NNN across backlog state dirs.
2. Moves file from current state to `in-progress/`.
3. Updates `status: in-progress`, `updated: <today>`.

Note: linking to a slice file in `ai-loop/slices/pending/` is a separate
manual step in v0.1.3 — author the slice using
`docs/ai-loop/00-entry/SLICE_TEMPLATE.md`, reference the FEAT id in the
slice file, and edit the feature's `slices: [SLICE-NN]` frontmatter. v0.1.4
will add `/loop:slice from-feature FEAT-NNN` to automate this.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog promote \
  --repo "$PWD" \
  --id FEAT-007
```

Returns `{ id, moved: { from, to } }`.

## Integration with the Wiggin Loop

Promotion is what bridges Tier 2 (backlog) and Tier 3 (engineering slices).
The Cross-Slice Continuation HARD RULE may invoke this automatically when
selecting the next work item; for hand-driven sessions, call it before
beginning slice work so brief-me reflects the in-flight state correctly.

```

### commands/brief.md

```
---
name: brief
description: Standalone loop situational report — backlog counts, top priorities, scores, decisions, pattern alerts. Complements crew brief-me.
auto_execute_steps: false
---

# Autonomous Loop Brief

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" brief --repo "$PWD"
```

Returns JSON with:

- `backlogCounts` — { pending, triaged, in_progress, done }
- `topTriaged` — highest-priority triaged features (next to slice)
- `inFlight` — in-progress features with linked slices
- `specsToDecompose` — approved specs without derived features
- `grades` — total count, last 5 with avg scores, avg of last 5
- `decisions` — total, accepted, superseded, reverted
- `alerts` — pattern alerts (low scores, decomposition issues, orphans, etc.)
- `recentEvents` — last 10 plugin command events from the telemetry log

## Pattern alerts

Triggered by `detectPatterns()`:

| Alert | Trigger |
|---|---|
| `score-trend` | Dimension < 0.80 across last 3 slices — suggest SPEC type=sre |
| `decomposition` | Feature has ≥3 linked slices — review scope |
| `spec-flow` | Spec approved but undecomposed |
| `backlog-flow` | ≥10 features pending triage |
| `in-progress-orphan` | Feature in-progress without a linked slice |

Each alert has `severity`, `category`, `message`, `suggested_action`.

## Relationship to crew brief-me

- `/crew:brief-me` covers Crew artifacts (runs, reviews, validations, workflow state)
- `/loop:brief` covers backlog, specs, grades, decisions, alerts

Run both at session start when picking up an in-flight repo. Crew tells you
"what's the active workflow run"; loop tells you "what's next in
the product pipeline + how are we doing".

```

### commands/classify-slice-shape.md

```
---
name: classify-slice-shape
description: Classify a slice's changed-file set into an inline-friendly shape.
auto_execute_steps: false
---

# Classify Slice Shape

Returns a shape tag describing what kind of edit a slice contains. The orchestrator uses the result to decide whether the inline path is appropriate.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" classify-slice-shape \
  --repo "$PWD" \
  --files "a.mts,b.md"
```

Returns JSON: `{ "shape": "...", "rationale": "..." }`.

Shapes: `doc-update`, `config-tweak`, `single-module-edit`, `test-only`, `none`.

See `docs/sop/inline-criteria.md` for the full rule set and the public-surface guard list.

```

### commands/competitor-audit.md

```
---
name: competitor-audit
description: Run a fresh competitor gap audit across all registered competitors, dispatch researchers to collect latest data, aggregate into ranked FEATs.
auto_execute_steps: false
---

# Competitor Audit

Refreshes the competitor gap registry by running market researchers on stale
competitors, then aggregates all briefs into a ranked FEAT backlog.

## Prerequisites

- `docs/research/competitors.json` — registry of competitors (auto-seeded from
  existing briefs).
- `scripts/competitor-audit/aggregate.mjs` — aggregation script (parameterized
  for repeatable runs).
- `loop:market-researcher` agent (requires loop plugin >= v0.36.0; shipped after
  release v0.35.0). Fallback: `crew:researcher` on older plugins.

## Workflow

Execute these steps in order:

1. **Read registry** — parse `docs/research/competitors.json` to extract
   competitor entries (each has `name`, `host`, `language`, `slug`,
   `suggested_sources`, `last_audited`).
2. **Identify stale competitors** — any where `(today - last_audited) > 30` days
   (or custom staleDays threshold).
3. **Create dated briefs directory** — `docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/`
   (use today's date).
4. **Dispatch researchers in parallel** — for each stale competitor, dispatch
   `loop:market-researcher` via the Agent tool. Fill in `scripts/competitor-audit/researcher-prompt.md`
   placeholders: `{{COMPETITOR_NAME}}`, `{{COMPETITOR_HOST}}`, `{{COMPETITOR_LANGUAGE}}`,
   `{{COMPETITOR_SLUG}}`, `{{SUGGESTED_SOURCES}}`. Each researcher writes one brief
   to the new briefs directory (e.g., `cursor-agents.md`).
5. **Aggregate** — run aggregation script. This idempotent script parses all
   briefs, builds the comparison matrix, and writes new FEAT files for gaps with
   `composite >= 6`.
6. **Update registry** — edit `docs/research/competitors.json` to set
   `last_audited` (today) and `last_audit_dir` for each refreshed competitor.
7. **Suggest next action** — propose `/loop:triage` to score the new pending FEATs.

## Steps 1–2: Read registry and identify stale competitors

```bash
# Parse docs/research/competitors.json and list any competitors with
# last_audited older than today - 30 days
cat docs/research/competitors.json | node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(0, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  const staleDays = 30;
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() - staleDays);
  data.competitors.forEach(c => {
    const lastAudited = new Date(c.last_audited);
    if (lastAudited < threshold) {
      console.log(c.slug);
    }
  });
"
```

For each stale competitor returned, note its `name`, `host`, `language`, `slug`,
and `suggested_sources`.

## Steps 3–4: Create briefs directory and dispatch researchers

Create the directory:

```bash
mkdir -p docs/research/$(date +%Y-%m-%d)-competitor-gap-audit/briefs
```

For each stale competitor, dispatch `loop:market-researcher` via the Agent tool
with this dispatch instruction (replace placeholders from the registry):

```
Dispatch loop:market-researcher with the researcher-prompt.md template filled in:
- {{COMPETITOR_NAME}} = <name from registry>
- {{COMPETITOR_HOST}} = <host from registry>
- {{COMPETITOR_LANGUAGE}} = <language from registry>
- {{COMPETITOR_SLUG}} = <slug from registry>
- {{SUGGESTED_SOURCES}} = <suggested_sources from registry>

Output target: docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/<slug>.md
```

For loop plugin < v0.36.0, fall back to `crew:researcher` with this dispatch
instruction:

```
Research and write a competitor brief for <COMPETITOR_NAME> at
docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/<COMPETITOR_SLUG>.md.
Use scripts/competitor-audit/researcher-prompt.md as the template. Fill in all
frontmatter (competitor, host, language, license, version_observed, sources,
brief_version), then complete the 10-axis matrix row and gap candidates.
Baseline: loop plugin (Wiggin-Loop) and crew plugin (workflow harness).
```

Dispatch all researchers in parallel (each writes a separate brief file).

## Step 5: Aggregate briefs into matrix and FEATs

```bash
node scripts/competitor-audit/aggregate.mjs --audit-dir docs/research/$(date +%Y-%m-%d)-competitor-gap-audit
```

This script:
- Parses all `briefs/*.md` files
- Builds a 10-axis comparison matrix
- Writes `matrix.md` to the audit directory
- Creates new FEAT files in `.claude/artifacts/loop/backlog/pending/` for each
  gap with `composite_score >= 6`
- Updates FEAT frontmatter on subsequent runs (idempotent)

## Step 6: Update registry

Edit `docs/research/competitors.json` to set `last_audited: "<YYYY-MM-DD>"` and
`last_audit_dir: "docs/research/<YYYY-MM-DD>-competitor-gap-audit"` for each
audited competitor.

## Step 7: Suggest triage

```
/loop:triage
```

This routes the newly written FEAT files through PM scoring (5-axis composite
priority, autonomous_safe flags, etc.).

## Output artifacts

- `docs/research/<YYYY-MM-DD>-competitor-gap-audit/matrix.md` — visual
  comparison grid (10 axes, loop+crew baseline, all competitors).
- `docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/*.md` — individual
  researcher briefs for each audited competitor.
- `.claude/artifacts/loop/backlog/pending/*.md` — new FEAT files (one per gap
  with composite >= 6; `autonomous_safe: false` pending PM triage).
- `docs/research/competitors.json` — updated registry (last_audited,
  last_audit_dir per audited competitor).

```

### commands/decisions-list.md

```
---
name: decisions-list
description: List retrospective decisions captured from grade files — DEC-NNN entries with status, originating slice, supersession links.
auto_execute_steps: false
---

# Decisions List

Walks `docs/decisions/*.md` and returns one entry per `DEC-NNN.md` file
with frontmatter parsed.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions list \
  --repo "$PWD" \
  [--status accepted|superseded|reverted]
```

Returns:

```json
{
  "count": 7,
  "decisions": [
    {
      "id": "DEC-001",
      "title": "Server-side pagination for ingestion jobs",
      "status": "accepted",
      "introduced_by_slice": "SLICE-52",
      "introduced_at": "2026-05-20",
      "superseded_by": null,
      "filePath": "docs/decisions/DEC-001.md"
    }
  ]
}
```

Filtering with `--status` is exact-match on the frontmatter field.

## Distinguishing decision types

- `docs/decisions/DEC-NNN.md` — **retrospective** decisions, captured during
  slice work via grade-write extraction
- `docs/specs/SPEC-NNN.md` with `type: adr` — **forward-looking** decisions
  made before work begins

Both are valid; they're separate stores intentionally. Use `decisions list`
for retrospective ADRs and `spec list --type adr` for forward-looking ones.

```

### commands/decisions-relevant.md

```
---
name: decisions-relevant
description: List retrospective decisions whose affects_files frontmatter matches any of the supplied changed files — surface prior architectural choices to reviewers.
auto_execute_steps: false
---

# Decisions Relevant

Finds `docs/decisions/DEC-NNN.md` files whose `affects_files: [...]`
frontmatter array matches any of the changed files passed in. Match is
literal path-suffix:

- decision `affects_files: ["src/auth/middleware.cs"]`
- changed file `src/auth/middleware.cs` or `astragenie/src/auth/middleware.cs`
- → match

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions relevant \
  --repo "$PWD" \
  --files "src/auth/middleware.cs,src/api/Controllers/AuthController.cs"
```

Returns:

```json
{
  "count": 2,
  "decisions": [
    {
      "id": "DEC-007",
      "title": "Server-side pagination for ingestion jobs",
      "status": "accepted",
      "introduced_by_slice": "SLICE-52",
      "filePath": "docs/decisions/DEC-007.md",
      "hits": [
        { "decisionFile": "src/auth/middleware.cs", "changedFile": "src/auth/middleware.cs" }
      ]
    }
  ]
}
```

## How to populate `affects_files`

When the agent extracts a decision via `slice grade-write`, the resulting
`docs/decisions/DEC-NNN.md` has no `affects_files` field. The agent should
edit the file post-extraction:

```yaml
---
id: DEC-007
title: Server-side pagination for ingestion jobs
status: accepted
introduced_by_slice: SLICE-52
affects_files:
  - src/MemoryService.Api/Controllers/IngestionJobsController.cs
  - src/MemoryService.Api/IngestionJobQueries.cs
---
```

Once populated, every future review touching those files surfaces this DEC
via `decisions relevant`.

## Reviewer workflow integration

The `/loop:slice review-ladder` prompts include a step:
"surface prior decisions relevant to changed files via `decisions relevant`".
Reviewers cite matching decisions in their verdict to prevent re-litigating
solved problems.

```

### commands/decisions-show.md

```
---
name: decisions-show
description: Print the full body + frontmatter of a single decision by id.
auto_execute_steps: false
---

# Decisions Show

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions show \
  --repo "$PWD" \
  --id DEC-001
```

Returns the parsed decision file: `{ id, title, status, introduced_by_slice,
introduced_at, superseded_by, filePath, frontmatter, body }`.

For cross-slice analysis (which slices introduced which decisions), use
`decisions list` to get the full inventory and grep / jq from there.

```

### commands/decisions-supersede.md

```
---
name: decisions-supersede
description: Mark an existing decision as superseded by a newer one — updates both files atomically.
auto_execute_steps: false
---

# Decisions Supersede

Sometimes a decision made in an earlier slice gets revisited and replaced.
This command records the relationship:

- Old decision: `status` → `superseded`, `superseded_by: DEC-NEW`
- New decision: unchanged (caller can add a `## Supersedes: DEC-OLD` line in
  body manually if desired)

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions supersede \
  --repo "$PWD" \
  --id DEC-005 \
  --by DEC-009
```

`--id` is the older decision being superseded. `--by` is the newer decision
that replaces it. Both files must already exist.

Returns `{ oldId, newId, alreadySuperseded }`. Idempotent — re-running with
same args is a no-op.

## When to supersede

- A retrospective decision was reverted in a later slice — supersede with a
  new DEC capturing the reversal + rationale
- An architectural choice was replaced by a better one
- A workaround was eliminated by a proper fix; new DEC documents the fix

Don't use supersede for minor edits to the same decision. Edit the existing
file in-place instead.

```

### commands/derive-slice.md

```
---
name: derive-slice
description: Derive a new slice from the highest-priority unmet requirement in product-backlog.md when approved-slices.md is empty.
auto_execute_steps: false
---

# Derive Next Slice

Implements the Cross-Slice Continuation HARD RULE's derivation path. Use when
`<backlogPath>/approved-slices.md` is empty but
`<backlogPath>/product-backlog.md` still has unmet requirements.

Workflow:

1. Pick the highest-priority unmet requirement from
   `<backlogPath>/product-backlog.md`. Read its category, user-visible outcome,
   and any context lines.
2. Author a slice file at `<slicesRoot>/pending/SLICE_<NN>_<SHORT_NAME>.md`
   using the canonical template at `<aiLoopRoot>/00-entry/SLICE_TEMPLATE.md`.
   - Fill objective, in-scope, out-of-scope, acceptance criteria, done-when,
     risks, open questions.
   - Reviewer A and Reviewer B are TBD at this stage (assigned during review).
3. Run Reviewer A pass:
   - Read the slice file as a senior engineer for the relevant area
   - Verify acceptance criteria are testable with evidence per EVIDENCE_RULES.md
   - Surface gaps; revise slice file inline
4. Run Reviewer B pass:
   - Read as a security / production-readiness reviewer
   - Verify hard rules from CLAUDE.md aren't violated
   - Verify the slice doesn't bypass architecture docs
   - Surface gaps; revise inline
5. After both reviews pass, move the slice file from
   `<slicesRoot>/pending/` to `<slicesRoot>/active/` and append an entry to
   `<backlogPath>/approved-slices.md` with status `Approved`.
6. Update the entry in `product-backlog.md` (strikethrough or remove) noting
   the slice number that now owns the requirement.
7. Hand off to `/loop:next-slice` (or just begin the loop
   immediately per the Cross-Slice Continuation HARD RULE).

Do NOT stop for user confirmation at any point in this derivation — the
autonomous rule applies. Only stop if the unmet requirement is itself
externally blocked or fundamentally underspecified, in which case mark it
BLOCKED in `product-backlog.md` and document the blocker.

```

### commands/install.md

```
---
name: install
description: Install or refresh the loop methodology layer in this repo (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
auto_execute_steps: false
---

# Install Autonomous Loop

Adds the Wiggin Loop methodology to the current repo:

- Replaces or appends the `<!-- loop:start -->` marker block in `CLAUDE.md` with the three HARD RULE blocks (Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate) plus the First Action section.
- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`: `WIGGIN_LOOP.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`. **Always overwritten** — user customization lives in `.claude/loop.json`, not in these files.
- Writes `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md` (always overwritten).
- Creates backlog scaffolds at `<backlogPath>/{approved,completed,product-backlog}.md` and `<slicesRoot>/pending/.gitkeep` — **only if missing**, never clobbered.
- Writes `.claude/loop.json` from the chosen preset — **only if missing**.

If the repo currently has an ad-hoc HARD RULE block hand-pasted into CLAUDE.md (the pattern from WigginHarnes / MemoryService / AstraGenie.Tools), the installer migrates it: extracts the phase-gate commands into the config, deletes the ad-hoc block, writes the new marker-bracketed block in its place.

**Hard dependency:** the `crew` plugin must be installed in the Claude Code plugin cache. The installer errors with a clear message if it cannot find `crew`.

Workflow:

1. Verify the workspace:
   - `pwd`
2. Optionally back up `.claude/` per the adoption checklist in the hero-crew docs:
   ```bash
   cp -r .claude ".claude.backup.$(date -u +%Y%m%dT%H%M%SZ)"
   ```
3. Run the installer:
   ```bash
   set -euo pipefail
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" install --repo "$PWD" --preset dotnet-aspire-python
   ```
   Omit `--preset` to use whatever preset is already recorded in `.claude/loop.json`, or the default if no config exists yet.
4. Report which files were written and which preset is active.
5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/loop:phase-gate` for the first time.

After install:

- `/loop:status` — show resolved config + marker presence
- `/loop:phase-gate --phase <N>` — run the configured suite
- `/loop:list-presets` — see built-in presets

```

### commands/intake.md

```
---
name: intake
description: Two-phase backlog intake. Phase 1 dispatches the PM agent to score every pending FEAT (5-dimension triage). Phase 2 dispatches loop:architect on each newly-triaged FEAT to classify tags / needs_contract / needs_ux. Replaces the manual /loop:triage + /loop:backlog-enrich split with one invocation.
auto_execute_steps: false
---

# Intake (FEAT-189 / SLICE-103)

Single slash command that runs the two-phase backlog intake in order. Replaces the manual sequence of `/loop:triage` followed by `/loop:backlog-enrich`. Both legacy commands remain for back-compat and partial-intake scenarios.

## When to use

- Fresh `pending/` FEATs that need scoring AND classification before slicing.
- After a `/loop:backlog-add` of multiple new FEATs.
- Any time you want one slash command to take the backlog from `pending/` all the way to `triaged/` with full routing metadata.

When to use the legacy split instead: only-score a batch (no classification yet), or only-classify already-triaged FEATs.

## Phase 1 — PM scoring

Run the full contract from `commands/triage.md` (which delegates to skill `loop:triage`). PM scores every pending FEAT across the 5 dimensions; writes `pm_*` + `composite_score` + `autonomous_safe` + `composite_priority` into each FEAT's frontmatter; moves files `pending/` → `triaged/`.

**Halt semantics**: if the PM phase halts for ANY reason (agent error, validation failure, budget exceedance, JSON contract violation), STOP. Do NOT proceed to phase 2. Surface the PM halt JSON exactly as `/loop:triage` would. Phase 2 only runs after a clean PM phase.

## Phase 2 — architect classification

After phase 1 returns success, list every FEAT that just landed in `triaged/`. For each, run the contract from `commands/backlog-enrich.md` (which dispatches `loop:architect`). Architect classifies `tags`, `needs_contract`, `needs_ux` and writes them to the FEAT's frontmatter.

**Decline filter**: skip the architect dispatch for any FEAT whose phase-1 `composite_priority` is `"P4"` — declined FEATs do not need routing tags because they will not be sliced. Count them and include `declined: <count>` in the final summary.

**Failure handling**: a per-FEAT architect failure (timeout, parse error, missing classification fields) does NOT roll back the phase-1 writes for that FEAT. The PM scoring stays. The architect failure is reported as `architect_failed: <count>`; those FEATs can be enriched later via `/loop:backlog-enrich`. Phase 2 continues processing the remaining FEATs.

## Final summary

After both phases complete, print one line:

```
Intake: triaged <N> / declined <D> / architect_classified <C> / architect_failed <F>
```

`N` is the count of FEATs that moved through phase 1 (regardless of outcome). `D` is the subset with `composite_priority: "P4"`. `C` is the subset that phase 2 successfully classified. `F` is the subset that phase 2 attempted but failed. Invariant: `N = D + C + F`.

## Why this command exists

The two-step backlog intake was a source of routing drift. Several FEATs (FEAT-167 documented) ended up triaged-but-not-enriched, which caused `/crew:orchestrate-slice` to fall back to AC-text heuristics instead of the FEAT's classification. One slash command kills that footgun.

## Back-compat

- `/loop:triage` — still works, PM-only path.
- `/loop:backlog-enrich` — still works, architect-only on already-triaged FEATs.
- `/loop:intake` — the new merged path, recommended default for fresh backlog intake.

## Refs

- `commands/triage.md` — phase 1 contract source.
- `commands/backlog-enrich.md` — phase 2 contract source.
- `skills/triage/SKILL.md` — phase 1 implementation skill.
- `agents/pm.md` — phase 1 agent.
- `agents/architect.md` (loop:architect) — phase 2 agent.

```

### commands/learn.md

```
---
name: learn
description: Log an operational learning to the persistent learnings store (.claude/artifacts/loop/learnings.jsonl). Use mid-session when you observe something worth preserving for future sessions.
auto_execute_steps: false
---

# Loop Learn

Log an operational learning to `.claude/artifacts/loop/learnings.jsonl`.
Use this mid-session whenever you observe something that would help future
agent sessions avoid a pitfall or use a better approach.

These learnings are automatically surfaced at slice start via `startSlice`
(in the `learningsDigest` field) so the agent inherits session-to-session
observations without manual recall.

## Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings log \
  --repo "$PWD" \
  --key "<short-key>" \
  --insight "<what you observed>" \
  [--confidence 0.0-1.0] \
  [--slice SLICE-NN]
```

## Parameters

- `--key` (required) — short machine-readable tag, e.g. `tsc-compile-drift`,
  `eslint-complexity-cap`, `test-isolation`
- `--insight` (required) — human-readable observation, one or two sentences
- `--confidence` (optional) — float 0–1 indicating how confident you are;
  omit when uncertain
- `--slice` (optional) — the slice ID where this learning was observed,
  e.g. `SLICE-08`

## Example

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings log \
  --repo "$PWD" \
  --key "tsc-compile-drift" \
  --insight "Always recompile after TypeScript edits; CI drift guard will fail otherwise" \
  --confidence 0.95 \
  --slice SLICE-08
```

Returns the written record with `{ id, timestamp, key, insight, confidence, source }`.

## Viewing recent learnings

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings recent \
  --repo "$PWD" \
  --limit 5
```

Returns `{ count, items, digest }` where `digest` is a markdown block ready
to paste into agent context.

## When to log a learning

- You discover a non-obvious constraint (lint cap, compile step, path pattern)
- A test or lint error reveals a repo-specific convention not documented elsewhere
- A subagent dispatch pattern works significantly better than another
- You resolve a blocker that took time to diagnose and want the next session
  to skip that investigation

```

### commands/lessons-recent.md

```
---
name: lessons-recent
description: Return the last N slice grades' lessons / surprises / followups as a feed-forward digest for the next-slice planner.
auto_execute_steps: false
---

# Lessons Recent

Pulls the last N grade files (default 5) and aggregates their `## Lessons`,
`## Surprises`, `## Followups` sections into a markdown digest the
researcher agent should read before drafting acceptance criteria for the
next slice. Prevents repeating known mistakes.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" lessons recent [N]
```

Default `N = 5`. Returns:

```json
{
  "count": 5,
  "items": [
    {
      "slice": "SLICE-52",
      "graded_at": "2026-05-20",
      "avg_score": 0.829,
      "lessons": ["OTel span naming inconsistencies"],
      "surprises": ["Aspire AppHost rebuild required when adding new ContainerApp env var"],
      "followups": ["Backport pagination pattern to memory-list endpoint"]
    }
  ],
  "digest": "# Lessons feed-forward — last 5 slice(s)\n\n## SLICE-52..."
}
```

## When to run

- Researcher reads this before drafting acceptance criteria for a new
  slice (referenced from Cross-Slice Continuation HARD RULE flow)
- Lead reads before promoting a feature to slice if last 3 grades had
  recurring surprises (pause + address vs charge ahead)
- Before a phase-gate planning session

The `digest` field is ready to paste into an agent context window.

```

### commands/list-presets.md

```
---
name: list-presets
description: Show built-in loop presets with their stack defaults.
auto_execute_steps: false
---

# List Autonomous Loop Presets

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" list-presets
```

Returns an array of `{ name, description }` for each `scripts/presets/*.json`
shipped by the plugin.

v1 ships:

- `dotnet-aspire-python` — C# .NET + Aspire local orchestration + Python
  LangGraph agents + Terraform infra. Default stack for AstraGenie-style
  monorepos.

Pick the preset closest to the repo's stack at install time, then override
specific stage commands in `.claude/loop.json`. Each stage in
`stack.*` accepts a `{ cmd, args, cwd? }` triple — the args array is what
makes the phase-gate runner injection-safe.

To add a new preset:

1. Author `scripts/presets/<name>.json` mirroring the structure of
   `dotnet-aspire-python.json`.
2. Reinstall the plugin so the cache picks up the new preset, or copy the
   preset file into the plugin cache directly during dev.
3. Reference the new preset with `--preset <name>` at install time.

```

### commands/next-slice.md

```
---
name: next-slice
description: Pick the next PENDING slice from approved-slices.md and surface it for implementation.
auto_execute_steps: false
---

# Pick Next Slice

Use after completing a slice (artifacts written, completed-slices.md updated)
or when starting a fresh session in a loop-enabled repo.

Workflow:

1. Read `<backlogPath>/approved-slices.md`. Pick the highest-priority slice
   whose status is PENDING.
2. Open the slice file referenced by that entry under `<slicesRoot>/`.
3. Report:
   - slice number + title
   - file path
   - priority
   - acceptance criteria count
   - any unresolved questions / risks in the slice file
4. Begin the Wiggin Loop on this slice. Do not pause for confirmation per the
   Autonomous Loop Instruction HARD RULE.

If `approved-slices.md` has no PENDING entries:

- If `<backlogPath>/product-backlog.md` still has unmet requirements, fall
  through to `/loop:derive-slice`.
- If both are exhausted and all gate sets in `<aiLoopRoot>/02-acceptance-gates/`
  are PASS, the loop's stop condition A is satisfied — stop.
- Otherwise the loop is in stop condition B (externally blocked) or the user
  needs to populate the backlog. Surface the situation explicitly.

```

### commands/phase-gate.md

```
---
name: phase-gate
description: Run the configured phase-gate test suite, capture all output, write the validation artifact via crew.
auto_execute_steps: false
---

# Run Phase Gate

Use at the end of a phase — after the last slice in a phase is marked
COMPLETED in `<backlogPath>/approved-slices.md`. The plugin runs every
configured stage (build, test, frontend build, infra plan, Aspire boot +
healthchecks), captures stdout/stderr/exit/duration for each, renders a
markdown report, writes it under
`<phaseGateArtifactDir>/phase-<N>-gate-<date>.md`, and registers the artifact
through `crew write-validation-result`.

Every command runs via `execFile` with an argv array — no shell
interpretation, no injection surface. Stages with `null` in config are
skipped. `aspireBoot` is skipped automatically when no `healthchecks` are
configured (otherwise it would hang).

Workflow:

1. Confirm the phase number to record. Phase numbering is user-assigned:
   pick the next integer beyond the last `phase-<N>-gate-*.md` in
   `<phaseGateArtifactDir>/`.
2. Run the gate:
   ```bash
   set -euo pipefail
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" phase-gate \
     --repo "$PWD" \
     --phase <N> \
     --note "<optional short context>"
   ```
3. Read the returned JSON. If `status` is `PASS`, append the entry in
   `<backlogPath>/completed-slices.md` for the closing slice with a link to
   the new phase-gate artifact, then `/loop:next-slice`.
4. If `status` is `FAIL`, do NOT proceed to the next phase. Read the artifact
   under `<phaseGateArtifactDir>/` to see which stage failed and the
   stdout/stderr tail. Fix the failure, then re-run the gate.
5. If `crewArtifactRegistered` is `false`, the artifact was written to disk
   but the crew workflow state was not updated. Read `crewArtifactError`,
   fix, and either re-run the gate or invoke
   `crew write-validation-result` manually with the same evidence path.

The plugin does NOT auto-detect phase boundaries. The agent decides when a
phase closes based on slice metadata in `approved-slices.md`.

## Parallel mode (SLICE-92)

When `.claude/loop.json` defines a top-level `phaseGate` block, the gate
runs each named group in parallel and fails-fast on the first non-zero exit.
Each group is itself a serial list of commands; within a group, the first
failing command stops the group. Output from every group is interleaved into
one combined log, with each line prefixed by `[<group>] ` so the agent can
grep for which group emitted what.

Default config (matches the loop repo itself):

```json
"phaseGate": {
  "parallel": true,
  "groups": {
    "lint": [
      { "cmd": "bun", "args": ["run", "lint"] },
      { "cmd": "bun", "args": ["run", "format:check"] },
      { "cmd": "bun", "args": ["./src/scripts/validate-manifests.mts"] },
      { "cmd": "bun", "args": ["./src/scripts/validate-content-length.mts"] }
    ],
    "typecheck": [
      { "cmd": "bunx", "args": ["tsc", "--project", "tsconfig.json", "--noEmit"] },
      { "cmd": "bunx", "args": ["tsc", "--project", "tsconfig.test.json", "--noEmit"] }
    ],
    "test": [
      { "cmd": "bun", "args": ["test", "src/tests/", "--parallel", "--timeout", "60000"] }
    ]
  }
}
```

CLI flags:

- `--serial` — force the legacy sequential path even when `phaseGate.groups`
  is configured. Useful when bisecting a flaky parallel run or when CI output
  needs unambiguous stage ordering.
- `--only <group>` — run a single group (e.g. `--only lint`, `--only test`).
  Skips every other configured group. Handy for rapid iteration.

If `phaseGate.groups` is missing, or `phaseGate.parallel: false` is set in
`loop.json`, the gate falls through to the original `stack.{build,test,
frontendBuild,infraPlan,aspireBoot}` runners — full back-compat.

```

### commands/pr-fix.md

```
---
name: pr-fix
description: "Poll a PR's status, categorize unfixed issues (lint, test, review, CI, security), and emit fix plans with circuit breaker. Supports retried dispatches via priorAttempts tracking."
auto_execute_steps: false
---

# PR Issue Fixer

Polls a PR's status from GitHub, categorizes unfixed issues, and emits a structured
fix plan for each category. Tracks attempt counts per category with a circuit breaker
(default: 3 attempts per category) to prevent infinite retry loops.

Designed to feed autonomous PR repair flows (FEAT-009): agents dispatch fixes, loop
tracks attempts, and circuit breaker halts after threshold.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" pr-fix \
  --repo "$PWD" \
  --pr <number> \
  [--body <priorAttemptsJson>]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--pr <number>` | string | required | PR number to poll and categorize. |
| `--body <json>` | string | null | JSON-encoded `priorAttempts` map; tracks previous attempt counts per category. Example: `{"lint":1,"test_failure":2}` |

## Output shape

```json
{
  "prNumber": 42,
  "ciGreen": false,
  "plans": [
    {
      "category": "lint",
      "description": "Fix lint issues in PR #42",
      "dispatchPrompt": "Fix lint issues in PR #42. Run the failing checks and apply fixes.",
      "attemptCount": 0,
      "circuitBroken": false
    },
    {
      "category": "test_failure",
      "description": "Fix test_failure issues in PR #42",
      "dispatchPrompt": "Fix test_failure issues in PR #42. Run the failing checks and apply fixes.",
      "attemptCount": 3,
      "circuitBroken": true
    }
  ],
  "haltReason": null,
  "walkedCategories": ["lint", "test_failure"]
}
```

### Fields

- `prNumber` — PR number (from `--pr`).
- `ciGreen` — `true` when CI is fully green (no FAILURE/ERROR checks).
- `plans` — array of fix plans, one per unique issue category found.
  - `category` — issue type: `"lint"`, `"test_failure"`, `"review_comment"`, `"ci_failure"`, or `"security"`.
  - `description` — human-readable summary.
  - `dispatchPrompt` — template for dispatching to fix agent.
  - `attemptCount` — previous attempts for this category (from `priorAttempts` or 0).
  - `circuitBroken` — `true` when `attemptCount >= 3` (or custom threshold).
- `haltReason` — why the command halted early: `"gh_unavailable"` or `"gh_error"` when gh CLI fails; `null` if normal.
- `walkedCategories` — list of categories found in this PR.

## Issue categories

The categorizer inspects the PR's status checks, reviews, and comments:

| Category | Detection | Example |
|---|---|---|
| `lint` | Failing check name contains "lint" | ESLint check failed |
| `test_failure` | Failing check name contains "test" | npm test failed |
| `ci_failure` | Any check with FAILURE or ERROR conclusion | General CI step failed |
| `review_comment` | Review with state `CHANGES_REQUESTED` | Reviewer requested changes |
| `security` | Failing check name contains "security" | Security scan failed |

Each category appears at most once in `walkedCategories`, even if multiple checks match.

## Circuit breaker

Each plan tracks `attemptCount` from `priorAttempts` (or 0 if not provided).
When `attemptCount >= maxAttemptsPerCategory` (default: 3), that plan's
`circuitBroken` is set to `true`. Orchestrators may skip dispatches with
`circuitBroken: true` to prevent infinite retry loops.

## gh CLI requirement

The command requires `gh` (GitHub CLI) to be installed and authenticated.
If gh is unavailable or fails, `haltReason` is set to `"gh_unavailable"` or `"gh_error"`
and `plans` is empty.

## Relationship to FEAT-009

This command is the core of FEAT-009 (autonomous PR repair flow):
- **SLICE-22** (this): Issue categorizer + fix plan emitter with circuit breaker.
- Later slices: orchestrator (try-catch loop), attempt tracker, escalation handler.

## Example flow

1. `/loop pr-fix --pr 42` — discovers lint + test_failure issues.
2. Orchestrator dispatches `/crew:fix` with lint fix prompt.
3. Fix agent commits; PR checks re-run.
4. `/loop pr-fix --pr 42 --body '{"lint":1}'` — lint category now has attemptCount=1; test_failure still 0.
5. Repeat until CI green or circuit breaker fires on any category.

```

### commands/release-plan.md

```
---
name: release-plan
description: Plan a release — collect all FEAT entries targeting a version, group by parent spec, write release notes to docs/releases/v<X.Y.Z>.md.
auto_execute_steps: false
---

# Release Plan

Generates a structured release report from backlog state. Includes everything
targeting the given version: `done` features (shipped), plus
`in-progress` / `triaged` / `pending` (in flight).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" release plan \
  --repo "$PWD" \
  --version v1.1.0
```

`--version` accepts `1.1.0` or `v1.1.0` (normalized to `v1.1.0`).

Returns JSON:

```json
{
  "version": "v1.1.0",
  "status": "READY" | "IN_PROGRESS" | "EMPTY",
  "artifactPath": "docs/releases/v1.1.0.md",
  "featureCount": 12,
  "shipped": 9,
  "inFlight": 3,
  "bySpec": ["SPEC-001", "SPEC-003"]
}
```

Side effect: writes / overwrites `docs/releases/v<X.Y.Z>.md`. The file groups
features under their parent spec (if any) and surfaces an "_standalone_"
section for features not tied to a spec. Shows badges per feature:
`✓ shipped`, `● in flight`, `○ triaged`, `○ pending`.

When `status: READY` the report also includes instructions for cutting the
release (tag, push, optionally archive done features into a version-stamped
subdir to keep `done/` short).

Use this:
- At the end of a sprint to see what's actually ready to ship
- During planning to confirm a target version has the right scope
- Auto-invoked by the Phase Completion Gate when a phase closes (v0.1.5 +)

For a leaner status check without writing a file, use:

```bash
node ... release status --repo "$PWD" --version v1.1.0
```

Returns just the counts (total / done / in-progress / triaged / pending) as
JSON. No artifact written.

```

### commands/retriage.md

```
---
name: retriage
description: Opt-in higher-quality triage. Three-phase orchestrator — PM clarity check + score-or-flag, orchestrator fans out loop:spec-writer for flagged FEATs, PM re-scores against rewritten AC. Original /loop:triage stays unchanged (cheaper, faster, suitable when AC are already concrete).
auto_execute_steps: false
---

# Retriage (FEAT-193 / SLICE-109)

Higher-quality alternative to `/loop:triage`. Same 5-dimension scoring contract, but the slash command orchestrator splits the work into three phases so PM never has to dispatch sibling agents itself. This works around the PM-subagent runtime surface bug where `Agent` is not loadable via `ToolSearch` from inside a subagent.

## When to use

- FEATs added from external drafts (`/loop:backlog-add --body "..."` with rough text).
- FEATs previously triaged with `composite_priority: "needs-review"` that were never re-scored.
- Any FEAT where the operator suspects AC are vague but doesn't want to hand-write a SPEC.

When the AC are already concrete (measurable values, Given-When-Then, edge cases covered), use `/loop:triage` instead — cheaper (one PM dispatch per FEAT, no rewrite hop).

## Usage

```bash
/loop:retriage
/loop:retriage --include-triaged    # also re-score FEATs already in triaged/
```

Default: reads `pending/` directory. With `--include-triaged`, also enumerates ids from `triaged/`. FEATs in `triaged/` STAY in `triaged/` (no state move).

## Orchestration model

The slash command is the orchestrator. PM and spec-writer are bounded specialists; neither dispatches the other. Three phases run per batch.

### Phase A — PM clarity check + score-or-flag

For each FEAT in scope, dispatch `loop:pm` with the prompt block below PREPENDED to the standard scoring prompt. PM either scores against clear AC OR flags `status: "needs-rewrite"` without dispatching anything.

```
## AC clarity gate (PHASE A — flag-or-score)

For THIS FEAT:

1. Read the FEAT body at <absolute path>.
2. Check AC clarity against the `loop:authoring-slices` checklist —
   testable with concrete values, evidence-backed, edge + error coverage.
3. If AC PASS: score the FEAT against the 5-dimension contract per
   `agents/pm.md`. Persist scoring frontmatter (pm_*, composite_score,
   composite_priority, autonomous_safe). Emit:
     { "id": "...", "status": "scored", "priority": "P0|P1|P2|P3|P4",
       "autonomous_safe": <bool>, "compositeScore": <num>,
       "acClarity": { "rewrite": false } }
4. If AC FAIL: DO NOT dispatch any other agent. DO NOT write scoring
   frontmatter. Persist only `ac_clarity_status: failed` and a short
   `triage_notes` line. Emit:
     { "id": "...", "status": "needs-rewrite",
       "reason": "<one-sentence: what AC dimension fails>",
       "absolutePath": "<absolute path to the FEAT file>" }
```

PM tools required for phase A: `Read`, `Edit`, `Write` (Markdown), nothing else. No `Agent` surface needed.

### Phase B — orchestrator fans out spec-writer

The orchestrator collects every phase-A result with `status: "needs-rewrite"`. If the set is empty, skip to phase C summary.

Otherwise, dispatch `loop:spec-writer` in ONE message with PARALLEL Agent tool calls — one per flagged FEAT. Per-FEAT prompt:

```
Rewrite the acceptance criteria for FEAT-NNN in Given-When-Then form
with concrete values, edge cases, and error coverage. Edit the FEAT
body in place at `<absolute path>`. Follow the
`loop:authoring-slices` checklist. Do NOT touch frontmatter. Return
when done with a short JSON summary:
  { "id": "FEAT-NNN", "rewriteOk": <bool>, "criteriaWritten": <int> }
```

Per-FEAT outcomes:

- `rewriteOk: true` — proceeds to phase C.
- `rewriteOk: false` (or dispatch error / timeout / no edits) — orchestrator writes `composite_priority: needs-review` + `acClarity: { rewrite: true, rewriteDispatchOk: false }` to the FEAT frontmatter directly (no PM round-trip). FEAT excluded from phase C.

### Phase C — PM re-score against rewritten AC

For each phase-B success, dispatch `loop:pm` with the prompt block below PREPENDED to the standard scoring prompt. PM re-reads the FEAT (now with Given-When-Then AC) and scores.

```
## Re-score (PHASE C — post-rewrite scoring)

For THIS FEAT:

1. Re-read the FEAT body at <absolute path>. AC have been rewritten
   by `loop:spec-writer` since the previous PM pass.
2. Score the FEAT against the 5-dimension contract per `agents/pm.md`.
   Persist scoring frontmatter (pm_*, composite_score,
   composite_priority, autonomous_safe).
3. Emit:
     { "id": "...", "status": "scored", "priority": "P0|P1|P2|P3|P4",
       "autonomous_safe": <bool>, "compositeScore": <num>,
       "acClarity": { "rewrite": true, "rewriteDispatchOk": true } }
```

## Returns

Final summary printed by orchestrator:

```json
{
  "triaged": <count>,
  "path": "retriage",
  "results": [
    {
      "id": "FEAT-NNN",
      "priority": "P1",
      "autonomous_safe": true,
      "compositeScore": 0.74,
      "acClarity": { "rewrite": false }
    },
    {
      "id": "FEAT-MMM",
      "priority": "P2",
      "autonomous_safe": true,
      "compositeScore": 0.68,
      "acClarity": { "rewrite": true, "rewriteDispatchOk": true }
    },
    {
      "id": "FEAT-OOO",
      "priority": "needs-review",
      "autonomous_safe": false,
      "acClarity": { "rewrite": true, "rewriteDispatchOk": false }
    }
  ],
  "phaseB": { "fannedOut": <int>, "rewriteOk": <int>, "rewriteFail": <int> }
}
```

Invariant: `triaged == sum(results)` and `phaseB.fannedOut == phaseB.rewriteOk + phaseB.rewriteFail`.

## Failure escalation

- Phase A failure (PM error, validation failure) for a FEAT → halt batch; surface PM halt JSON.
- Phase B failure for a single FEAT → orchestrator writes `composite_priority: needs-review` to that FEAT and CONTINUES processing the rest. Reported in `phaseB.rewriteFail`.
- Phase C failure for a single FEAT → orchestrator writes `composite_priority: needs-review`, `acClarity: { rewrite: true, rewriteDispatchOk: true, scoreOk: false }` and CONTINUES. Reported in results with `priority: needs-review`.

Walker does not auto-promote any FEAT with `composite_priority: needs-review` until an operator resolves manually or re-runs `/loop:retriage` after a fix.

## Cost guard

Same per-batch budget as `/loop:triage` (`.claude/loop.json::loop.triageBudgetUsdPerBatch`, default 5.0). Worst case per FEAT: PM phase-A + spec-writer phase-B + PM phase-C ≈ 3× single-PM cost. Halt fires on budget overrun.

## Why three phases instead of one PM dispatch

The original design had PM dispatch `loop:spec-writer` inline. That requires `Agent` tool surface inside the PM subagent. In the current Claude Code subagent runtime, `Agent` is a deferred tool that PM cannot load via `ToolSearch` — observed empirically on FEAT-020 retriage 2026-06-12. Pulling the dispatch up to the orchestrator removes the constraint and adds free parallelism on phase B.

## Back-compat with `/loop:triage` and prior `/loop:retriage`

- `/loop:triage` — unchanged cheap default, PM-only scoring on whatever AC exist.
- `/loop:retriage` — three-phase orchestrator (PM → spec-writer → PM). Replaces the prior single-PM-with-inline-dispatch model. Output schema is a superset of the prior shape (`phaseB` block is new).
- `/loop:intake` Phase 1 still calls `/loop:triage`. A future FEAT may swap it for `/loop:retriage` once we measure the cost vs. quality trade-off.

## Refs

- `agents/pm.md` — base PM agent contract.
- `agents/spec-writer.md` — spec-writer agent (Given-When-Then AC rewriter).
- `skills/authoring-slices/SKILL.md` — AC clarity checklist.
- `commands/triage.md` — legacy cheap path.
- `commands/intake.md` — Phase 1 / Phase 2 orchestration pattern this command mirrors.

```

### commands/retrospective.md

```
---
name: retrospective
description: Aggregate grades + decisions + backlog over a time window into docs/retrospectives/YYYY-MM-DD.md.
auto_execute_steps: false
---

# Retrospective

Reads `docs/grades/`, `docs/decisions/`, `docs/backlog/`, `docs/specs/` and
generates a markdown summary capturing:

- Slices graded in window
- Decisions captured in window
- Score averages per dimension (with ⚠ flag for any below 0.80)
- Top recurring lessons / surprises / followups (with repeat counts)
- Improvement opportunities derived from low-scoring dimensions
- Slice cadence (slices per week)

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" retrospective \
  --repo "$PWD" \
  --since 2026-05-01
```

Or use rolling-window syntax via `--span-days`:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" retrospective \
  --repo "$PWD" \
  --span-days 7
```

Returns:

```json
{
  "artifactPath": "docs/retrospectives/2026-05-20.md",
  "report": {
    "range": { "since": "2026-05-13", "until": "2026-05-20" },
    "counts": { "gradesInWindow": 4, "decisionsInWindow": 2, ... },
    "scoreAverages": { "architecture_quality": 0.85, ... },
    "dimensionsBelowThreshold": ["observability"],
    "topLessons": [{ "key": "...", "count": 3 }],
    "decisionsList": [...]
  }
}
```

## Synthesis step (after the CLI runs)

The CLI aggregates; the dispatching agent must synthesize. From the
returned report:

1. For each entry in `dimensionsBelowThreshold`: confirm the
   weak-dimension AC rule is being applied (see `loop:authoring-slices`
   — every new slice must carry a targeting AC). If recent slices in
   the window lack one, log the gap via `/loop:learn`.
2. For each `topLessons` entry with `count >= 2`: decide — is this a
   process fix (log via `/loop:learn`), a backlog item (propose via
   `/loop:backlog-add`), or already covered by an accepted DEC? State
   the disposition in the retrospective artifact; do not leave repeat
   lessons undispositioned.
3. If a dimension has been below threshold across two consecutive
   retrospectives, escalate: propose a dedicated FEAT addressing it
   rather than relying on per-slice AC.

Recommended cadences:

- Weekly retro: `--span-days 7` (good for team check-in)
- Phase close: `--since <phase-start-date>` (assess the phase)
- Release retro: `--since <release-tag-date>` (post-mortem of shipped work)

The Phase Completion Gate (Wiggin Loop HARD RULE) will auto-invoke this in
v0.1.7+; for v0.1.6 it's a manual command.

```

### commands/slice-complete.md

```
---
name: slice-complete
description: Close a slice — move slice file to completed/, feature to done/, auto-roll satisfied specs, suggest grade as next action.
auto_execute_steps: false
---

# Slice Complete

Atomic close ceremony at the end of a slice:

1. **Slice file** — moves from `<slicesRoot>/pending/` (or `active/`) to
   `<slicesRoot>/completed/`. Stamps frontmatter `status: completed`,
   `completed_at: <today>`. If the slice lives flat (LoopBrain-style
   `04-implementation-slices/`), updates frontmatter in place — no move.
2. **Feature file** — finds the slice's `feature: FEAT-NNN` back-ref,
   locates the feature in any backlog state, moves it to
   `docs/backlog/done/`. backlog-writer auto-stamps `completed_at`.
3. **Spec reconcile** — runs `reconcileSpecStatus` so any parent SPEC
   whose derived features are all `done` auto-rolls to `satisfied`.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice complete \
  --repo "$PWD" \
  --id SLICE-NN \
  [--keep-feature-open] \
  [--skip-validation-check "<reason>"]
```

### Validation gate (since v0.5.0)

`slice complete` now refuses to roll the parent feature to `done/` when
**no validation evidence** exists for the slice. The slice itself still
moves to `completed/` (the gate only holds the feature transition,
mirroring the existing blocked / simplify gates).

The gate is satisfied when **any** of these is true:

1. A validation artifact under `.claude/artifacts/crew/validations/`
   whose filename references the slice id (e.g. `*-slice03-*.md`,
   `validation-result-SLICE-03.md`).
2. The crew workflow-state has `currentRun.gates.validation.status` set
   to `passed` or `skipped` (via `crew mark-badge --badge
   validation_passed` or `validation_skipped --note "<reason>"`).
3. The slice file frontmatter contains `requires_validation: false`
   (explicit waiver — use sparingly; intended for doc-only slices).
4. `slice complete` is invoked with
   `--skip-validation-check "<reason>"` (the reason is written to
   workflow-state as a `validation_skipped` badge so the bypass is
   auditable).

When the gate is unmet, the return payload includes:

```json
{
  "feature": {
    "skipped": true,
    "reason": "validation-gate: no validation artifact under ...",
    "validationGate": { "satisfied": false, "reason": "...", "evidence": [] }
  },
  "validationGate": { "satisfied": false, ... }
}
```

The feature stays in `in-progress/`. To unblock, write the validation
artifact (e.g. via `crew write-validation-result`), set the badge, or
re-run with `--skip-validation-check "<reason>"`.

Returns:

```json
{
  "slice": { "id": "SLICE-52", "from": "docs/ai-loop/slices/pending/SLICE_52_X.md", "to": "docs/ai-loop/slices/completed/SLICE_52_X.md" },
  "feature": { "id": "FEAT-001", "from": "docs/backlog/in-progress/FEAT-001.md", "to": "docs/backlog/done/FEAT-001.md" },
  "specStatusChanges": [{ "id": "SPEC-001", "from": "decomposed", "to": "satisfied" }],
  "nextAction": "Run /loop:slice grade --id SLICE-52 to capture lessons + decisions."
}
```

## When to run

After acceptance criteria PASS with evidence and the slice's review +
validation artifacts are in Crew. The complete step is what bridges the
Wiggin Loop iteration to the next slice.

## What to do after

The returned `nextAction` is a literal prompt:

```bash
/loop:slice grade --id SLICE-52
# ...agent fills the grade...
/loop:slice grade-write --id SLICE-52
```

Grading at slice close is what feeds the retrospective + pattern alerts.
Skipping it leaves a hole in the self-improvement signal.

## Aggregation (post-builder fanout)

The `dispatchInstruction` emitted by `slice start` (mode `lead`) now directs the orchestrator to invoke the fanout CLI after builder PASS:

```bash
bun src/scripts/loop.mts slice post-builder-fanout --id <slice-id>
```

This writes a marker file at `.claude/artifacts/loop/fanout-markers/<slice-id>.json` (used by grade telemetry) and emits a 3-task parallel payload. The orchestrator dispatches all three in one message (reviewer-A, reviewer-B, validator). See `commands/slice-post-builder-fanout.md` for the full contract.

Aggregation rules:

- Wait for all three artifacts to land.
- Any reviewer FAIL halts the slice. Validator result preserved (informational).
- Validator FAIL halts the slice. Reviewer results preserved.
- All PASS continues to grade.

The validator prompt does not reference reviewer artifact paths — verdict is based on phase-gate evidence only.

The presence of the marker file is recorded in grade telemetry as `timing.post_builder_fanout: true` when the slice is graded.

```

### commands/slice-from-feature.md

```
---
name: slice-from-feature
description: Promote a backlog feature into an engineering slice — moves the feature to in-progress/, creates the slice file under slicesRoot/pending/, and cross-links them.
auto_execute_steps: false
---

# Slice From Feature

Bridges Tier 2 (backlog) and Tier 3 (engineering slices) per the Cross-Slice
Continuation HARD RULE. Atomic operation that:

1. Looks up `FEAT-NNN` across `docs/backlog/{pending,triaged,in-progress,done}/`.
2. Moves the feature file to `docs/backlog/in-progress/` (if not already
   there).
3. Allocates the next `SLICE-NN` id by scanning every `SLICE_NN_*.md` or
   `SLICE-NN-*.md` file under `<slicesRoot>` recursively (works whether
   the repo uses flat layout like LoopBrain's `04-implementation-slices/`
   or the nested `slices/{pending,active,completed}/` layout).
4. Writes the slice file at `<slicesRoot>/pending/SLICE_NN_<UPPER_SLUG>.md`
   with frontmatter referencing the parent feature, and a body seeded
   with sections matching `00-entry/SLICE_TEMPLATE.md`.
5. Cross-links: appends the slice id to the feature's `slices: [...]`
   frontmatter array (idempotent — won't add twice).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice from-feature \
  --repo "$PWD" \
  --id FEAT-007
```

Or positional:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice from-feature \
  --repo "$PWD" -- FEAT-007
```

Returns:

```json
{
  "slice": {
    "id": "SLICE-12",
    "path": "docs/ai-loop/slices/pending/SLICE_12_AUDIT_LOG_SEARCH.md",
    "title": "Audit log search"
  },
  "feature": {
    "id": "FEAT-007",
    "path": "docs/backlog/in-progress/FEAT-007.md",
    "fromState": "triaged",
    "toState": "in-progress"
  }
}
```

## Workflow integration

The Cross-Slice Continuation HARD RULE invokes this automatically when
selecting the next work item from `docs/backlog/triaged/`. Manual invocation
is the right call when:

- You want to skip queue order and start a specific feature first.
- A feature in `pending/` needs immediate slicing without going through
  triage (set its frontmatter manually then call this).
- Reproducing an engineering plan from an external roadmap reference.

## Contracts pre-population (when needs_contract: true)

After the CLI subcommand returns (slice file created, FEAT moved to
`in-progress/`), the calling agent MUST run this pre-population check before
dispatching any downstream specialist (`crew:fullstack-dev`, `crew:inspector`, etc.):

1. **Read FEAT frontmatter** at the path returned by the CLI in
   `feature.path`.
2. **Check the flag.** If `needs_contract: false` or the field is absent,
   stop — no architect dispatch needed.
3. **Check artifact existence.** Look up
   `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` (the path resolved
   by `getContractsPath` from `src/scripts/lib/contracts-artifact.mts`). If
   the artifact is already present, skip — do nothing (idempotence: this
   trigger fires on ANY slice for the FEAT, not just SLICE-1; the check is
   artifact existence, not slice index).
4. **Dispatch `crew:architect` inline.** Use the Agent tool with the
   canonical prompt from `${CLAUDE_PLUGIN_ROOT}/templates/contracts-architect-prompt.md`
   (plugin-root absolute path — consumer repos do not ship `templates/`).
   Single dispatch — one FEAT, one artifact. If the template cannot be read,
   STOP and surface the error — do NOT fall back to ad-hoc sections (silent
   fallback masks plugin install drift).
5. **Validate and write.** Parse the response. If the response is empty OR
   any of the four required section headers (`## TypeScript Interfaces`,
   `## API Contracts`, `## Event Schemas`, `## Data Contracts`) is missing,
   log:

   ```
   WARNING: contracts artifact for <FEAT-ID> not written — architect response
   empty/malformed. Re-run /loop:backlog-enrich or rely on
   /crew:orchestrate-slice Step 1 retry.
   ```

   and continue without writing a partial file (fail-open per FEAT-049
   lesson). On a well-formed response, write the artifact at
   `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` via the Write tool.
6. **Proceed.** Only after this check (whether artifact was written, was
   already present, or dispatch was skipped) proceed to downstream specialists.

## Slice file body

The generated slice file is a starter — fill in:

- **In scope** / **Out of scope** sections (the agent's bounds for this run)
- **Acceptance criteria** (testable, with evidence per `EVIDENCE_RULES.md`)
- **Reviewer ladder** (assign Reviewer A and Reviewer B)

The body inherits the feature's first non-heading paragraph as the
**Objective**. Tweak as needed.

## Closing a slice

When acceptance criteria PASS:

1. Update slice frontmatter `status: completed`.
2. Move the slice file from `<slicesRoot>/pending/` to
   `<slicesRoot>/completed/` (or wherever your slice layout puts done work).
3. Move the feature file from `docs/backlog/in-progress/` to
   `docs/backlog/done/` (manually via `git mv` or via a future
   `/loop:slice complete` command).
4. Run `/loop:spec status` to auto-roll parent SPEC to `satisfied`
   if all its features are done.
5. Write the Crew `final-synthesis` artifact.

```

### commands/slice-grade-write.md

```
---
name: slice-grade-write
description: Validate grade scores, extract DEC-TBD decisions into docs/decisions/, persist frontmatter linkage. Idempotent.
auto_execute_steps: false
---

# Slice Grade Write

Persists an edited grade file and extracts retrospective decisions into
`docs/decisions/`.

Pre-requisites: agent has run `/loop:slice grade --id SLICE-NN`
to generate the template and then edited the file to fill in real scores,
lessons, decisions, surprises, and narrative.

What grade-write does:

1. Parses `docs/grades/SLICE-NN-grade.md`.
2. Validates the 7 scores are floats in `[0, 1]`. Throws with a clear error
   listing every offending dimension if any are out of range, missing, or
   non-numeric.
3. Scans the `## Decisions` body section for `### DEC-TBD: <title>` blocks.
   For each:
   - Allocates the next `DEC-NNN` id (monotonic across `docs/decisions/`).
   - Writes a full ADR-style file at `docs/decisions/DEC-NNN.md` populated
     with the title + rationale + consequences from the grade.
   - Replaces `DEC-TBD` with the allocated id in the grade body.
4. Updates grade frontmatter:
   - `decisions: [DEC-NNN, ...]` array of allocated + previously-allocated ids.
   - `graded_at` if not already set.
5. Appends a telemetry event to `.claude/logs/loop.jsonl`.

Idempotent: re-running only extracts blocks still marked `DEC-TBD`.
Previously-allocated decisions stay where they are.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice grade-write \
  --repo "$PWD" \
  --id SLICE-52
```

Returns:

```json
{
  "gradePath": "docs/grades/SLICE-52-grade.md",
  "sliceId": "SLICE-52",
  "scoresAverage": 0.83,
  "decisionsAllocated": ["DEC-007"],
  "decisionsTotal": 1
}
```

## Score validation error mode

If a score is 1.5 or "high" or missing, command throws with `code: "SCORE_VALIDATION"`
and a multiline message naming each offending dimension. Agent should fix
the grade file and re-run.

## After grade-write

- Inspect extracted decisions: `/loop:decisions list`
- Move on to the next slice via the Cross-Slice Continuation rule

```

### commands/slice-grade.md

```
---
name: slice-grade
description: Generate a pre-filled grade template at slice close — agent then edits scores, lessons, decisions, narrative.
auto_execute_steps: false
---

# Slice Grade

Two-step ceremony for capturing what happened during a slice:

1. **Generate template** — `/loop:slice grade --id SLICE-NN`
   Plugin creates `docs/grades/SLICE-NN-grade.md` with frontmatter
   pre-filled from the linked feature + spec (target_release, phase,
   spec id). Body has section skeletons + score placeholders. Only-if-missing
   — won't clobber an existing grade.

2. **Agent edits the file inline:**
   - Replace the `0.00` score values with honest assessments (floats in [0, 1])
     for all 7 dimensions: architecture_quality, reliability, observability,
     production_readiness, security, test_confidence, product_completeness.
     Update both the frontmatter `scores:` and the `## Scores` body list.
   - Fill `## Lessons`, `## Surprises`, `## Followups`.
   - For each decision made during the slice, drop a `### DEC-TBD: <title>`
     block under `## Decisions` with **Rationale** + **Consequences**.
   - Fill narrative sections (What went well / wrong / differently).

3. **Persist + extract** — `/loop:slice grade-write --id SLICE-NN`
   (separate command — see slice-grade-write.md).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice grade \
  --repo "$PWD" \
  --id SLICE-52
```

Returns `{ gradePath, created, prefilled }`. If grade already exists,
`created: false` and `prefilled` is undefined — agent should edit the
existing file rather than re-running this command.

## When to grade

The Cross-Slice Continuation HARD RULE invokes this between "On slice close"
and "next slice". Specifically: after all acceptance criteria PASS, after
the feature has moved to `done/`, BEFORE picking the next slice. Grading
takes 5–10 minutes; that's the price of self-improvement.

## What plugin pre-fills

- `id`, `slice`, `feature`, `graded_at`
- `spec` and `target_release` if traceable through `feature → derived_from → spec`
- `phase` if the slice frontmatter has it

All scores start at 0 (placeholder — the agent MUST replace them).

```

### commands/slice-link.md

```
---
name: slice-link
description: Append a crew artifact path (review/validation/deployment) to a slice's frontmatter linkage array — replaces regex auto-prefill with deterministic walk.
auto_execute_steps: false
---

# Slice Link

After writing a crew artifact for a slice, run this so the slice file
gains a frontmatter cross-reference. The grading system then walks
linkage arrays instead of scraping artifact bodies for slice mentions.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice link \
  --repo "$PWD" \
  --id SLICE-52 \
  --kind reviews \
  --artifact .claude/artifacts/crew/reviews/20260520-slice52.md
```

`--kind` is one of `reviews`, `validations`, `deployments`. Idempotent —
re-linking the same path is a no-op.

After linking:

- Slice frontmatter gains/extends an array, e.g.:
  ```yaml
  reviews:
    - .claude/artifacts/crew/reviews/20260520-slice52.md
    - .claude/artifacts/crew/reviews/20260520-slice52-second-pass.md
  ```
- `slice grade --id SLICE-52` reads linked artifacts directly (faster +
  more reliable than the body-mention fallback).

## Reviewer / validator workflow

Pattern crew agents should follow:

```
1. write artifact via crew CLI -> get path
2. /loop:slice link --id SLICE-NN --kind <kind> --artifact <path>
3. (optional) continue work
```

Embedded in the Reviewer / Validator subagent prompts emitted by
`/loop:slice review-ladder`.

```

### commands/slice-plan.md

```
---
name: slice-plan
description: Run the codebase research pre-flight for a slice and write an editable plan artifact under .claude/artifacts/loop/plans/.
auto_execute_steps: false
---

# Slice Plan

Runs the codebase research pre-flight pass for a slice and writes an
editable plan artifact (Markdown) under `.claude/artifacts/loop/plans/`.

This is **FEAT-006 SLICE-A** — the bare pre-flight primitive. It has no
approval gate. The approval gate (keyed on `autonomous_safe`) is wired in
FEAT-006 SLICE-B.

## What it does

1. Locates the slice file under `.claude/artifacts/loop/ai-loop/slices/`
   (all sub-directories searched).
2. Parses the slice frontmatter for optional `in_scope_globs` and the
   `## In scope` body section to discover which source files to read.
3. **Codebase research pass** — for each in-scope file or glob:
   - Lists matching files under the repo root (skipping `node_modules`,
     `.git`, `dist`, `.claude`).
   - Reads the first 50 lines of each matched file.
   - Extracts exported symbol names via a regex pass
     (`export function|class|const`).
4. Writes `.claude/artifacts/loop/plans/<TS>-plan-<sliceId>.md` with:
   - Frontmatter: `slice`, `generated_at`, `files_count`.
   - Four editable sections: `## Context`, `## Files researched`,
     `## Open questions`, `## Proposed approach`.

## Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice plan \
  --repo "$PWD" \
  --id SLICE-NN
```

## Returns

```json
{
  "planPath": ".claude/artifacts/loop/plans/20260602T120000Z-plan-SLICE-10.md",
  "sections": {
    "context": "...",
    "filesResearched": "...",
    "openQuestions": "...",
    "proposedApproach": "..."
  },
  "filesResearched": ["src/scripts/lib/slice-plan.mts", "commands/slice-plan.md"]
}
```

## When to run

Before beginning implementation work on a new slice. The generated plan
artifact is the editable workspace for recording decisions, open questions,
and the proposed implementation approach.

FEAT-006 SLICE-B will wire `slice plan` into the `slice start` ceremony so
it runs automatically when `autonomous_safe: false` slices are started.

```

### commands/slice-post-builder-fanout.md

```
---
name: slice-post-builder-fanout
description: Emit a single parallel-dispatch payload with reviewers A+B and the validator after builder PASS.
auto_execute_steps: false
---

# Slice — Post-Builder Fanout

Replaces the serial reviewer-A -> reviewer-B -> validator sequence with a single parallel dispatch of all three.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice post-builder-fanout \
  --repo "$PWD" \
  --id SLICE-91
```

Returns `{ sliceId, tasks[3], instructions, aggregation }`. The orchestrator emits one message with three Agent tool calls — one per task.

Validator runs independently of reviewers; it does NOT read review artifacts. Wasted-dispatch cost on FAIL slices is acceptable per the design spec.

Config: `slice.postBuilderFanout` in `.claude/loop.json` (default `true`). Flip to `false` to revert to the serial ladder.

```

### commands/slice-review-ladder.md

```
---
name: slice-review-ladder
description: Emit structured Reviewer A + B (configurable) task prompts for parallel crew:inspector subagent dispatch.
auto_execute_steps: false
---

# Slice Review Ladder

Builds review-task prompts per the `reviewers.ladder` config (default
`["A", "B"]`). Plugin does not spawn agents — the orchestrator (typically
lead) reads the returned tasks and dispatches each via the Task tool with
`subagent_type: crew:inspector`.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice review-ladder \
  --repo "$PWD" \
  --id SLICE-52
```

Returns:

```json
{
  "sliceId": "SLICE-52",
  "ladder": ["A", "B"],
  "tasks": [
    {
      "reviewer": "A",
      "subagent_type": "crew:inspector",
      "description": "Reviewer A review of SLICE-52",
      "prompt": "You are Reviewer A on the Wiggin Loop ladder ...\n\n## Not checked\n- Performance characteristics of the implementation\n- Cross-platform compatibility beyond the CI test environment\n- Interaction with concurrent slice changes on other branches"
    },
    {
      "reviewer": "B",
      "subagent_type": "crew:inspector",
      "description": "Reviewer B review of SLICE-52",
      "prompt": "You are Reviewer B on the Wiggin Loop ladder ...\n\n## Not checked\n- Correctness of business logic and AC coverage (owned by Reviewer A)\n- Test case adequacy and branch coverage (multidim test-coverage reviewer)\n- Third-party dependency version compatibility outside the pinned lock file"
    }
  ],
  "instructions": "PARALLEL_DISPATCH_CONTRACT v1\nrequired: emit exactly ONE message containing N=2 Agent tool calls\nforbidden: send any message between dispatches\nforbidden: wait for one reviewer return before next dispatch\nviolation: serial-reviewer-warning badge logged to grade\n\nAggregate verdicts — slice passes when all reviewers return PASS or PASS with minor."
}
```

## Default focus areas

| Reviewer | Focus |
|---|---|
| A | Correctness, regressions, acceptance criteria coverage. Flag missing test cases. |
| B | Production-readiness, observability (OTel/logs), security posture, edge cases. |

## Not checked — required section in every reviewer prompt

Every Reviewer A and Reviewer B prompt template includes a `## Not checked` section.
Reviewers must populate this section with items they explicitly did NOT examine, so
the lead can assess residual blind spots before grading.

**Reviewer A prompt — `## Not checked` example:**

```
## Not checked
- Performance characteristics of the implementation (benchmarks, memory allocation patterns)
- Cross-platform compatibility beyond the CI test environment
- Interaction with concurrent slice changes on other branches
```

**Reviewer B prompt — `## Not checked` example:**

```
## Not checked
- Correctness of business logic and acceptance-criterion coverage (owned by Reviewer A)
- Test case adequacy and branch coverage (owned by test-coverage reviewer when multidim)
- Third-party dependency version compatibility outside the pinned lock file
```

Reviewers MUST include at least 2 items. Leaving the section empty causes the inspector
to surface a `not_checked_missing` warning in the review artifact, which the lead reads
during grade aggregation.

Override per repo in `.claude/loop.json`:

```jsonc
{
  "reviewers": {
    "ladder": ["A", "B", "Security"],
    "focus": {
      "Security": "Threat-model the new surface. Check auth, scope, audit log, secret handling, input validation. Review against SPEC-003 if present."
    }
  }
}
```

## Multidim preset

Set `reviewers.ladder` to an object with `preset: "multidim"` to expand the
ladder to three orthogonal narrow-dimension reviewers dispatched in parallel:

```jsonc
{
  "reviewers": {
    "ladder": { "preset": "multidim" }
  }
}
```

This resolves to ladder `["correctness", "test-coverage", "conventions"]`.
Each generated prompt:

- Declares **one dimension only** and explicitly forbids out-of-scope findings
  (scope-fence: "NOT in scope: …") to prevent overlap between parallel reviewers.
- Enforces a **hard budget** (≤15 tool calls, ≤8 min) with an inline-output
  fallback reminder per `docs/sop/specialist-pause-handling.md` — prevents
  the pause-without-artifact pattern seen in earlier demo runs.

### Multidim dimension focus areas

| Reviewer | Focus |
|---|---|
| correctness | Logic correctness, behavior preservation, race conditions, error-propagation. |
| test-coverage | Happy-path, partial-failure, and edge-case test coverage. Flag missing scenarios. |
| conventions | ESM/.mts parity, line caps, complexity ≤15, comment hygiene, banned patterns. |

### When to pick `multidim` vs default `["A", "B"]`

| Signal | Recommendation |
|---|---|
| Diff touches >5 files or >200 lines changed | Use `multidim` — parallel dimensions catch more in less wall-clock time. |
| Slice introduces new public API or schema | Use `multidim` — correctness + conventions reviewers both apply. |
| Large feature slice with complex acceptance criteria | Use `multidim` — test-coverage reviewer validates AC surface systematically. |
| Typo fix, single-line config change, doc-only update | Use default `["A", "B"]` — multidim cost overhead is not justified. |
| Quick iterative fixup (e.g. lint/format only) | Use default `["A", "B"]` or skip review ladder entirely (mark `review_skipped`). |

**Cost tradeoff**: multidim dispatches 3 concurrent reviewers (roughly 3× token
cost) but wall-clock time is `max(dim)` instead of `sum(dim)`. On large diffs
the quality gain outweighs the cost; on trivial diffs it is overkill.

The preset is opt-in per repo via `reviewers.ladder`. A follow-up CLAUDE.md
update will document the preset for autonomous-loop dispatch.

## Aggregation

Slice passes when all reviewers return `PASS` or `PASS with minor`. Any
single `FAIL` blocks slice complete. Orchestrator (lead) collects verdicts
+ summarizes before grading.

Each reviewer's prompt includes a step to:
1. Find prior decisions relevant to changed files (`/loop:decisions relevant --files`)
2. Link their review artifact back to the slice (`/loop:slice link`)

So the linkage arrays + decision-awareness build automatically as reviews
happen.

```

### commands/slice-start.md

```
---
name: slice-start
description: Open a slice — rotate workflow-state.currentRun via write-run-brief, refresh slice-progress dashboard.
auto_execute_steps: false
---

# Slice Start

Symmetric counterpart to `/loop:slice complete`. Run this
**before** beginning acceptance-criteria work on a new slice so cost
auto-emit windows attribute the session to the right slice.

What it does:

1. Looks up the slice's title from the active plan (newest
   `docs/superpowers/plans/*.md` by mtime, falling back to
   `docs/ai-loop/backlog/approved-slices.md`).
2. Reads the slice file's `## Objective` block (if present) to seed the
   run-brief goal.
3. Invokes `crew write-run-brief --title "<SLICE-NN>: <title>"` — this
   rotates `.claude/state/crew/workflow-state.json.currentRun` and sets
   `startedAt` to now. Subsequent cost-slice / cost-advise emits use
   this window.
4. Rewrites `.claude/state/crew/slice-progress.md` so the dashboard
   reflects the new IN_PROGRESS slice.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice start \
  --repo "$PWD" \
  --id SLICE-NN \
  [--goal "<one-line goal override>"] \
  [--no-dispatch]
```

`--no-dispatch` opts out of the dispatch instruction (used for manual /
debugging invocations where the agent is doing the slice work
in-conversation). The autonomous loop should always omit this flag so
implementation runs through a `crew:fullstack-dev` subagent (the parent loop
then drives the `crew:inspector` and `crew:verifier` gates separately
before closing the slice).

Returns:

```json
{
  "slice": { "id": "SLICE-18", "title": "SLICE-18: ICrewArtifactSource + ObservedApplication source fields" },
  "activePlan": { "source": "superpowers", "path": "docs/superpowers/plans/2026-05-22-crew-monitor-phase-2.md" },
  "runBrief": { "artifactPath": ".claude/artifacts/crew/runs/<stamp>-run-brief-slice-18-...md" },
  "sliceProgress": { "path": ".claude/state/crew/slice-progress.md", "completedCount": 17, "totalCount": 19 },
  "dispatchInstruction": "Dispatch crew:fullstack-dev subagent with this prompt:\n\n> Implement SLICE-18: ICrewArtifactSource + ObservedApplication source fields. See `docs/ai-loop/04-implementation-slices/SLICE_18_SOURCE_ABSTRACTION.md` for acceptance criteria. Goal: Add abstraction for artifact sources... You own implementation only — frame, edit, run the self-verify gates, and return a write-handoff artifact path. Do NOT dispatch crew:inspector or crew:verifier yourself; the parent loop drives those gates separately after you return. When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch crew:inspector, then crew:verifier if behavior changed, then run /loop:slice complete --id SLICE-18.",
  "nextAction": "Dispatch crew:fullstack-dev subagent for SLICE-18; then dispatch crew:inspector (and crew:verifier if behavior changed); close with /loop:slice complete --id SLICE-18."
}
```

`dispatchInstruction` is null when `--no-dispatch` was passed.

## When to run

Per `Slice Start Ceremony — HARD RULE` in `.claude/loop/rules.md`:
at the top of every slice, before any TDD / implementation work. Do
NOT begin a slice without rotating `currentRun` — a stale window makes
the close ceremony's cost auto-emit attribute work to the wrong slice.

## What to do after

The returned `nextAction` is a literal prompt to follow:

1. Dispatch `crew:fullstack-dev` subagent for slice implementation. Builder
   owns implementation only and returns a write-handoff artifact path
   when acceptance criteria PASS in its self-verify gates.
2. Dispatch `crew:inspector` subagent for the review gate. Pass it the
   builder's handoff artifact path and the slice file path.
3. If behavior changed, dispatch `crew:verifier` subagent for the
   validation gate.
4. Run `/loop:slice complete --id SLICE-NN` to close.

## Role glossary

Each slice passes through a fixed set of named roles. This table is the
canonical reference — descriptions match `constitution.md` (Team Roles)
and `CLAUDE.md` (Owned agents).

| Role | Agent ID | Responsibility |
|---|---|---|
| **builder** | `crew:fullstack-dev` / `crew:backend-dev` / `crew:frontend-dev` | Implements acceptance criteria in bounded scope; owns tests for changed behavior |
| **reviewer A** | `crew:inspector` | Correctness, logic, edge cases, AC coverage |
| **reviewer B** | `crew:inspector` | Production-readiness, observability, security |
| **validator** | `crew:verifier` | Behavior validation — runs or inspects the changed behavior against ACs |
| **deployer** | `crew:release-engineer` | Deployment and environment evidence; promotion to dev/prod |
| **researcher** | `loop:researcher` | Read-only code archaeology and fact gathering before a change is proposed |
| **pm** | `loop:pm` | Backlog scoring across 5 dimensions; AC clarity gate; `autonomous_safe` determination |
| **architect** | `loop:architect` | Read-only design and ADR authoring for structural changes; prepend before SLICE-A of new contracts |

```

### commands/snapshot-memory.md

```
---
name: snapshot-memory
description: Write docs/loop-snapshot.md — durable cross-session memory of backlog/specs/grades/decisions state. Reference from CLAUDE.md via `@`.
auto_execute_steps: false
---

# Snapshot Memory

Generates `docs/loop-snapshot.md` capturing current plugin
state in a form designed to be loaded at session start (or read by crew
brief-me as cross-session context).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" snapshot-memory \
  --repo "$PWD"
```

Returns `{ artifactPath, counts }`.

## What's in the snapshot

- Backlog counts by state
- In-flight features with linked slices (orphan warning if any)
- Top-priority triaged features (next to slice)
- Specs total + breakdown by status; ⚠ flag for approved-but-undecomposed
- Last 5 grade averages per dimension with ⚠ flag below 0.80
- Last 5 decisions captured

## How to use

Wire into `CLAUDE.md` so the snapshot is in agent context every session:

```markdown
## Project state (auto-generated)

@docs/loop-snapshot.md
```

Regenerate via this command whenever the picture shifts materially:

- After `slice complete`
- After `release plan` cuts a version
- After `spec status` rolls a spec to `satisfied`
- After a triage batch reorders priorities

Skip when work is purely tactical and state hasn't moved.

```

### commands/spec-add.md

```
---
name: spec-add
description: Create a new SPEC-NNN.md (PRD / user journey / SRE / research / ADR) under docs/specs/.
auto_execute_steps: false
---

# Spec Add

Creates a fresh spec file with frontmatter under `docs/specs/`. The next
SPEC-NNN id is computed across all existing specs (regardless of type).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" spec add \
  --repo "$PWD" \
  --type prd \
  --title "MemoryService v2 — multi-tenant + audio ingestion" \
  [--priority P0] [--target-release v2.0.0] \
  [--body "Optional full markdown body"]
```

`--type` must be one of: `prd`, `user-journey`, `sre`, `research`, `adr`,
`other`. The body is seeded from the matching template if `--body` is omitted.

Returns `{ id, filePath, frontmatter }`.

## After authoring

Once the spec body is fleshed out and reviewed:

1. Edit `status: draft` → `status: approved` in frontmatter (or via a future
   `/loop:spec approve` command).
2. Run `/loop:spec decompose --id SPEC-NNN --features "title1; title2"`
   to derive FEAT-NNN files in `docs/backlog/pending/` linked back to the spec.

```

### commands/spec-decompose.md

```
---
name: spec-decompose
description: Derive FEAT-NNN files from a spec and wire the SPEC↔FEAT linkage.
auto_execute_steps: false
---

# Spec Decompose

For an approved spec, creates one FEAT-NNN.md in `docs/backlog/pending/` per
feature title provided, with `derived_from: SPEC-NNN` in frontmatter, and
appends each FEAT id to the spec's `derived_features` array.

Plugin does not call an LLM for this — the AGENT identifies feature titles
(by reading the spec body) and supplies them on the command line. This keeps
the plugin deterministic and lets the agent do the semantic reasoning where
it belongs.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" spec decompose \
  --repo "$PWD" \
  --id SPEC-001 \
  --features "Audio ingestion pipeline; Multi-tenant key scoping; Health propagation"
```

`--features` is a semicolon-separated list of feature titles. Each title
becomes one FEAT-NNN file in `pending/`.

Returns `{ spec, created: [{ id, title, filePath }, ...], count }`.

Side effects:
- Spec frontmatter updated: `status: approved` → `status: decomposed`,
  `derived_features: [FEAT-007, FEAT-008, FEAT-009]`.
- Each new FEAT inherits the spec's `priority` and `target_release` as
  defaults (overridable by editing the FEAT file).

## Workflow

```
PM adds SPEC-001 (status: draft)
   ↓
PM (or reviewer) flips status to approved
   ↓
Agent reads SPEC-001 body, identifies 3-5 features
   ↓
/loop:spec decompose --id SPEC-001 --features "..."
   ↓
3-5 FEAT-NNN files appear in docs/backlog/pending/
   ↓
Cross-Slice Continuation HARD RULE picks them up:
   triage → promote → slice → ship
```

```

### commands/spec-list.md

```
---
name: spec-list
description: List specs with optional filters by status / type / priority / target_release.
auto_execute_steps: false
---

# Spec List

Walks `docs/specs/*.md` and returns one entry per SPEC file, sorted by
numeric id.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" spec list \
  --repo "$PWD" \
  [--status draft|approved|decomposed|satisfied|archived] \
  [--type prd|user-journey|sre|research|adr|other] \
  [--priority P0|P1|P2|P3] \
  [--target-release vX.Y.Z]
```

Returns JSON: `{ count, specs: [{ id, type, status, priority,
target_release, title, derived_features, filePath }, ...] }`.

Common patterns:

```bash
# What specs need decomposition?
node ... spec list --repo "$PWD" --status approved

# All PRDs targeting v2.0
node ... spec list --repo "$PWD" --type prd --target-release v2.0.0
```

```

### commands/spec-status.md

```
---
name: spec-status
description: Report satisfaction state across all specs (% of derived features done) and auto-roll status to satisfied where appropriate.
auto_execute_steps: false
---

# Spec Status

Reads all specs + all backlog features, computes per-spec satisfaction
metrics:

- `total` — number of derived features
- `done` — number of those in `done/`
- `pct` — completion percentage
- `state` — `satisfied` (all done) | `in-progress` (some done) | `no-features` (not yet decomposed)
- `missing` — derived FEAT ids that have no matching file (drift indicator)

Side effect: any spec whose derived features are all done has its frontmatter
auto-rolled from `decomposed` to `satisfied`. Idempotent — safe to run
repeatedly.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" spec status \
  --repo "$PWD"
```

Returns:

```json
{
  "satisfaction": [
    { "id": "SPEC-001", "state": "satisfied", "total": 3, "done": 3, "pct": 100, "missing": [] },
    { "id": "SPEC-002", "state": "in-progress", "total": 5, "done": 2, "pct": 40, "missing": [] }
  ],
  "statusChanges": [
    { "id": "SPEC-001", "from": "decomposed", "to": "satisfied" }
  ]
}
```

## When to run

- Inside Cross-Slice Continuation — plugin invokes this each iteration so
  satisfied specs roll forward.
- Before release planning — confirms which specs ship in the next release.
- In brief-me — surfaces in-flight specs + percent complete.

```

### commands/start.md

```
---
name: start
description: First action for a fresh loop session — read mandatory docs, pick highest-priority PENDING slice, run the first-response checklist.
auto_execute_steps: false
---

# Start Autonomous Loop Session

Use this once per session, before invoking `/crew:build` or `/crew:fix`. It
loads the Wiggin Loop entry sequence so the rest of the session inherits the
autonomous discipline.

Workflow:

1. Confirm the workspace and that the loop is installed:
   ```bash
   pwd
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" status --repo "$PWD"
   ```
2. If `status` reports no marker block, run `/loop:install` first.
3. Read in this order:
   - `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` (persona, stack, mandatory reading list)
   - `<backlogPath>/approved-slices.md` (pick highest-priority PENDING slice)
   - the slice file referenced by that entry
   - `<aiLoopRoot>/01-loop-control/WIGGIN_LOOP.md`
   - `<aiLoopRoot>/01-loop-control/EVIDENCE_RULES.md`
   - `<aiLoopRoot>/01-loop-control/STOP_CONDITIONS.md`
4. Run the first-response checklist from MASTER_PROMPT.md. Report findings:
   solution / project inventory, backlog state, current slice, key gaps.
5. Begin the slice. Do NOT stop for confirmation between Wiggin Loop steps
   (DISCOVER → PLAN → IMPLEMENT → BUILD → TEST → REVIEW → SCORE → FIX) per
   the Autonomous Loop Instruction HARD RULE.

If `<backlogPath>/approved-slices.md` is empty but `product-backlog.md` has
unmet requirements, follow the Cross-Slice Continuation HARD RULE: derive a
new slice into `<slicesRoot>/pending/`, run Reviewer A and Reviewer B, append
to `approved-slices.md`, then implement.

The plugin commands `/loop:next-slice` and `/loop:derive-slice`
are thin helpers around these flows.

```

### commands/status.md

```
---
name: status
description: Report current loop install state for this repo — preset, paths, marker presence, crew dep.
auto_execute_steps: false
---

# Autonomous Loop Status

Quick health check.

Workflow:

1. Run:
   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" status --repo "$PWD"
   ```
2. The output reports:
   - `preset` — active preset name
   - `aiLoopRoot`, `backlogPath`, `slicesRoot`, `phaseGateArtifactDir` — resolved paths
   - `hasMarkerBlock` — true if CLAUDE.md contains the loop marker block
   - `hasApprovedSlices`, `hasMasterPrompt` — scaffold presence
   - `crewCli` — path to the discovered crew CLI, or `null` if missing
3. If `hasMarkerBlock` is false or any path entry shows the scaffold missing,
   run `/loop:install`.
4. If `crewCli` is `null`, install the `crew` plugin first — phase-gate
   depends on it.

```

### commands/stop-check.md

```
---
name: stop-check
description: Unified stop-condition resolver — should the autonomous loop halt now? Returns reasons + blockers + suggestions.
auto_execute_steps: false
---

# Stop Check

Returns whether the autonomous loop has reached a stop condition:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" stop-check \
  --repo "$PWD"
```

Returns:

```json
{
  "shouldStop": true,
  "reasons": [
    "backlog empty + no undecomposed specs → no actionable work",
    "2 warn-severity alert(s) — resolve before rolling next slice"
  ],
  "blockers": [
    { "category": "score-trend", "message": "observability below 0.80 across last 3 slices", "suggestion": "Author a SPEC (type=sre or type=adr)..." }
  ],
  "suggestions": [
    "Author a new SPEC or FEAT to continue. Run /loop:spec add or /loop:backlog add."
  ],
  "snapshot": { "pendingOrTriaged": 0, "inProgress": 0, "approvedUndecomposed": 0, "totalAlerts": 2, "warnAlerts": 2 }
}
```

## Stop conditions

`loop.marathonMode` in `.claude/loop.json` (default `true` — "auto mode" in docs) controls which triggers gate vs. inform.

| Condition | Trigger | auto mode (default) | legacy (marathonMode=false) |
|---|---|---|---|
| Backlog exhausted | No pending/triaged/in-progress features AND no approved-undecomposed specs | halt | halt |
| Crew `escalated_to_human` | Crew workflow flagged for human attention | halt | halt |
| Warn pattern alerts | Any pattern alert with `severity: warn` (score-trend regression, in-progress orphan, decomposition explosion) | halt | halt |
| High-severity cost alerts | `loop.costStopThreshold` reached across last 3 slices | halt | halt |
| Iteration cap | `iteration.count >= loop.maxIterations` (default 25) | advisory | halt |
| Crew soft `blocked` badge | Crew workflow blocked waiting on artifact/badge | advisory | halt |

`shouldStop: true` when any gating trigger fires. Snapshot still reports `iterationCount`, `iterationCap`, `crewBlocked`, and `marathonMode` even when the iteration cap or blocked badge is advisory.

## How to use

The Cross-Slice Continuation HARD RULE calls this before selecting the
next slice:

- `shouldStop: true` → halt + ping user with `reasons` + `suggestions`
- `shouldStop: false` → proceed with normal slice selection

Crew brief surfaces in its output so user sees stop signal at session
start.

Phase-gate includes in retrospective body so post-phase planning sees it.

## Forcing past warn alerts

Pass `ignoreAlerts: true` (programmatic only — not a CLI flag) when the
user explicitly accepts known-poor signal and wants to roll the next
slice anyway.

## Forcing legacy bounded iteration

Set `loop.marathonMode: false` in `.claude/loop.json` to re-enable
gating on the iteration cap and crew `blocked` badge. Legacy mode is
useful when a repo needs guaranteed bounded token spend or strict
crew-gate enforcement per run.

```

### commands/sync-claims.md

```
---
name: sync-claims
description: Reconcile crew claims with loop backlog state — promote claimed FEAT files to in-progress, warn on orphan in-progress without claim.
auto_execute_steps: false
---

# Sync Claims

Bridges crew's file-ownership claims (`.claude/state/crew/claims.json`)
with loop's backlog state machine. Two directions of drift:

1. **Agent claimed a FEAT file but didn't run slice from-feature**
   → claim references the file, but feature is still in `pending/` or
   `triaged/`. Plugin moves it to `in-progress/`.

2. **Feature is in-progress with no claim**
   → orphan — file ownership isn't registered with crew. Plugin emits
   warning + suggests `crew claim <path>` command.

Plugin does NOT write to `claims.json` (that's crew's state, owned by
crew). Only adjusts the loop side.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" sync-claims \
  --repo "$PWD"
```

Returns:

```json
{
  "claimsTracked": 3,
  "claimedFeatureIds": ["FEAT-007", "FEAT-012"],
  "actions": [
    { "type": "promote-to-in-progress", "featureId": "FEAT-007", "from": "triaged", "to": "in-progress" },
    { "type": "in-progress-without-claim", "featureId": "FEAT-019", "suggestion": "crew claim docs/backlog/in-progress/FEAT-019.md so file ownership is registered" }
  ]
}
```

## Action types

- `promote-to-in-progress` — backlog state advanced to match claim
- `in-progress-without-claim` — orphan; suggest crew claim invocation
- `claim-without-feature` — claim references FEAT id whose file doesn't exist (stale claim)
- `would-promote` — dry-run output (when --apply=false)

## How feature ids are extracted from claims

- Direct path match: `FEAT-NNN` literal anywhere in the claimed file path
- Optional metadata: claim record has `feature: FEAT-NNN` field (crew can
  populate this when claim is opened via slice context)

## When to run

- At session start, after crew brief-me (catches drift from prior session)
- Before slice complete (ensures state is consistent before close ceremony)
- As part of Cross-Slice Continuation if needed

```

### commands/triage.md

```
---
name: triage
description: Triage every pending backlog FEAT using the PM agent (5-dimension scoring). PM-only — on PM error, validation failure, or budget exceedance, halt and surface to the operator.
auto_execute_steps: false
---

# Triage

Run the `loop:triage` skill: PM-only scoring. Single public triage command.

## Usage

```bash
/loop:triage
/loop:triage --include-triaged    # also re-score FEATs already in triaged/
```

Default: skill reads `pending/` directory, dispatches PM, halts on error. With `--include-triaged`, the skill also enumerates ids from `triaged/` and re-scores them in place — PM overwrites the existing `pm_*` fields + `composite_score` + `autonomous_safe` + `composite_priority`. FEATs in `triaged/` STAY in `triaged/` (no state move). Use after FEAT body edits, after upstream blockers clear, or to validate scoring quality. FEAT-194 / SLICE-110.

## Returns

```json
{
  "triaged": <count>,
  "path": "pm",
  "results": [{ "id": "FEAT-NNN", "priority": "P1", "autonomous_safe": true }]
}
```

On halt:

```json
{
  "triaged": <count-written-before-halt>,
  "path": "pm",
  "halted": true,
  "halt_reason": "<pm_error|budget_exceeded|validation_fail>",
  "halt_detail": "<stderr | dimension that failed validation | usd delta>",
  "results": [...written so far...]
}
```

## Auto-invocation

Cross-Slice Continuation HARD RULE invokes this command automatically when `pending/` is non-empty.

## Cost guard

Per-batch budget (`.claude/loop.json`):
- `loop.triageBudgetUsdPerBatch` (default 5.0)
- `loop.triageBudgetTokensPerBatch` (default 500000)

On exceedance the skill halts (no silent fallback). Operator decides: re-run with adjusted budget, switch PM model, or hand-score via `/loop:backlog pm-write`.

## Why no fallback

The regex fallback path (`bun src/scripts/loop.mts backlog triage`) was removed 2026-06-11. Defaulting every PM dimension to 0.5 produced meaningless signal that masked upstream failures and silently polluted slice routing. PM failure is now a surfaced halt; the operator sees it.

```

### src/scripts/validate-manifests.mts

```
#!/usr/bin/env node

// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export function validateAllPresets(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "scripts", "presets");
  const errors: string[] = [];
  if (!existsSync(dir)) return errors;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    const full = path.join(dir, entry);
    try {
      const raw = JSON.parse(readFileSync(full, "utf8"));
      validatePreset(raw);
    } catch (err: unknown) {
      if (err instanceof SchemaError || err instanceof SyntaxError) {
        errors.push(`presets/${entry}: ${(err as Error).message}`);
      } else {
        throw err;
      }
    }
  }
  return errors;
}

export function validateCommandFrontmatter(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "commands");
  const errors: string[] = [];
  if (!existsSync(dir)) return errors;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".md")) continue;
    const stem = entry.slice(0, -".md".length);
    const full = path.join(dir, entry);
    const content = readFileSync(full, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    // Validate name
    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "name"))) {
      errors.push(`commands/${entry}: missing required field "name"`);
    } else if (typeof frontmatter["name"] !== "string" || frontmatter["name"] === "") {
      errors.push(`commands/${entry}: "name" must be a non-empty string`);
    } else if (frontmatter["name"] !== stem) {
      errors.push(
        `commands/${entry}: "name" must equal filename stem "${stem}", got "${frontmatter["name"]}"`
      );
    }
    // Validate description
    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "description"))) {
      errors.push(`commands/${entry}: missing required field "description"`);
    } else if (typeof frontmatter["description"] !== "string" || frontmatter["description"] === "") {
      errors.push(`commands/${entry}: "description" must be a non-empty string`);
    }
    // Validate auto_execute_steps
    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "auto_execute_steps"))) {
      errors.push(`commands/${entry}: missing required field "auto_execute_steps"`);
    } else if (typeof frontmatter["auto_execute_steps"] !== "boolean") {
      errors.push(
        `commands/${entry}: "auto_execute_steps" must be a boolean, got ${typeof frontmatter["auto_execute_steps"]}`
      );
    }
  }
  return errors;
}

function validateMarketplaceEntries(
  marketplace: Record<string, any>,
  fail: (msg: string) => void
): void {
  for (const entry of marketplace.plugins) {
    if (!entry.name) fail(`marketplace.json: a plugins[] entry is missing "name"`);
    if (!entry.version || !SEMVER_RE.test(entry.version)) {
      fail(
        `marketplace.json: entry "${entry.name}" version "${entry.version}" is not parseable semver`
      );
    }
    if (!entry.source) fail(`marketplace.json: entry "${entry.name}" missing "source"`);
  }
}

// marketplace.json moved to sergeymilashico/astra-marketplace (4a46687). When
// a local copy exists (mirror or transitional setup), enforce lockstep with
// plugin.json. When absent, treat as authoritative-elsewhere and skip.
function validateMarketplaceJson(
  marketplace: Record<string, any>,
  plugin: Record<string, any>,
  fail: (msg: string) => void
): void {
  for (const field of ["name", "owner", "plugins"]) {
    if (
      marketplace[field] === undefined ||
      marketplace[field] === null ||
      marketplace[field] === ""
    ) {
      fail(`marketplace.json: missing required field "${field}"`);
    }
  }
  const ownEntry = marketplace.plugins.find(
    (entry: { name: string; version: string; source?: string }) => entry.name === plugin.name
  );
  if (!ownEntry) {
    fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
  } else if (ownEntry.version !== plugin.version) {
    fail(
      `version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
        `Run "npm run bump-version <new-version>" to sync.`
    );
  }
  validateMarketplaceEntries(marketplace, fail);
}

export async function validateManifests(repoRoot: string) {
  const failures: string[] = [];
  const fail = (msg: string) => failures.push(msg);

  const plugin = await readJson(path.join(repoRoot, ".claude-plugin", "plugin.json"));
  const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const marketplace = existsSync(marketplacePath) ? await readJson(marketplacePath) : null;
  const pkg = await readJson(path.join(repoRoot, "package.json"));

  for (const field of ["name", "version", "description", "author", "license"]) {
    if (plugin[field] === undefined || plugin[field] === null || plugin[field] === "") {
      fail(`plugin.json: missing required field "${field}"`);
    }
  }

  if (!SEMVER_RE.test(plugin.version))
    fail(`plugin.json: version "${plugin.version}" is not parseable semver`);

  if (marketplace) {
    validateMarketplaceJson(marketplace, plugin, fail);
  }

  if (pkg.version !== plugin.version) {
    fail(
      `version drift: plugin.json="${plugin.version}" vs package.json="${pkg.version}". ` +
        `Run "npm run bump-version <new-version>" to sync all three files.`
    );
  }

  for (const presetErr of validateAllPresets(repoRoot)) {
    fail(presetErr);
  }

  for (const cmdErr of validateCommandFrontmatter(repoRoot)) {
    fail(cmdErr);
  }

  return { ok: failures.length === 0, failures, plugin, marketplace, pkg };
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  const entryPath = path.resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

if (isMainEntry()) {
  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateManifests(repoRoot);
  if (!result.ok) {
    console.error("Manifest validation failed:");
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("Manifests OK:");
    console.log(`  plugin.json      ${result.plugin.name}@${result.plugin.version}`);
    console.log(`  package.json     ${result.pkg.name}@${result.pkg.version}`);
    if (result.marketplace) {
      console.log(`  marketplace.json (${result.marketplace.plugins.length} entries)`);
      for (const entry of result.marketplace.plugins) {
        console.log(`    - ${entry.name}@${entry.version}`);
      }
    } else {
      console.log(`  marketplace.json (absent — registry at sergeymilashico/astra-marketplace)`);
    }
  }
}

```

### src/tests/command-frontmatter.test.mts

```
import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  validateCommandFrontmatter,
  validateManifests
} from "../scripts/validate-manifests.mjs";

function tmpRepo(prefix: string): { root: string; commandsDir: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const commandsDir = path.join(root, "commands");
  mkdirSync(commandsDir, { recursive: true });
  return { root, commandsDir };
}

function writeCmd(commandsDir: string, name: string, content: string): void {
  writeFileSync(path.join(commandsDir, `${name}.md`), content, "utf8");
}

// Test 1 — Happy path: valid frontmatter returns no errors
test("validateCommandFrontmatter returns [] for valid frontmatter (happy path)", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-valid-");
  writeCmd(
    commandsDir,
    "my-cmd",
    "---\nname: my-cmd\ndescription: Does something useful\nauto_execute_steps: false\n---\n# Body\n"
  );
  writeCmd(
    commandsDir,
    "other-cmd",
    "---\nname: other-cmd\ndescription: Another command\nauto_execute_steps: true\n---\n# Body\n"
  );
  const errors = validateCommandFrontmatter(root);
  assert.deepEqual(errors, []);
});

// Test 2 — Missing required fields: all three fields absent
test("validateCommandFrontmatter reports 3 errors when frontmatter is absent", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-missing-");
  writeCmd(commandsDir, "bare", "# Bare Command\nSome body text.\n");
  const errors = validateCommandFrontmatter(root);
  assert.equal(errors.length, 3);
  const joined = errors.join("\n");
  assert.match(joined, /bare\.md.*"name"/);
  assert.match(joined, /bare\.md.*"description"/);
  assert.match(joined, /bare\.md.*"auto_execute_steps"/);
});

// Test 3 — Name mismatch: name field does not match filename stem
test("validateCommandFrontmatter reports name mismatch error", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-mismatch-");
  writeCmd(
    commandsDir,
    "slice-start",
    "---\nname: wrong-name\ndescription: Opens a slice\nauto_execute_steps: false\n---\n"
  );
  const errors = validateCommandFrontmatter(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /slice-start\.md.*"name".*"slice-start".*"wrong-name"/);
});

// Test 4 — Wrong type for auto_execute_steps: string instead of boolean
test("validateCommandFrontmatter reports type error for auto_execute_steps string", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-type-");
  writeCmd(
    commandsDir,
    "triage",
    '---\nname: triage\ndescription: Runs PM scoring\nauto_execute_steps: "yes"\n---\n'
  );
  const errors = validateCommandFrontmatter(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /triage\.md.*"auto_execute_steps".*boolean/);
});

// Test 5 — No commands directory: returns empty errors (no-op guard)
test("validateCommandFrontmatter returns [] when commands/ directory is absent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cmd-fm-no-dir-"));
  const errors = validateCommandFrontmatter(root);
  assert.deepEqual(errors, []);
});

// Test 6 — validateManifests integrates command validation
test("validateManifests propagates command frontmatter errors into result.failures", async () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-integrate-");
  // Write a minimal plugin.json and package.json so validateManifests can proceed
  const pluginDir = path.join(root, ".claude-plugin");
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    path.join(pluginDir, "plugin.json"),
    JSON.stringify({
      name: "test-plugin",
      version: "1.0.0",
      description: "Test plugin",
      author: "Tester",
      license: "MIT"
    }),
    "utf8"
  );
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "test-plugin", version: "1.0.0" }),
    "utf8"
  );
  // Write a command file missing the name field
  writeCmd(
    commandsDir,
    "cmd",
    "---\ndescription: Some command\nauto_execute_steps: false\n---\n"
  );
  const result = await validateManifests(root);
  assert.equal(result.ok, false);
  const joined = result.failures.join("\n");
  assert.match(joined, /cmd\.md.*"name"/);
});

```

## Files read

