---
slice: SLICE-14
builder: fullstack-dev
run_id: 20260819T032404Z
feat: FEAT-004
files_touched: ["commands/3rdparty/refactor-code.md", "commands/adopt.md", "commands/architect-feature.md", "commands/audit-repo.md", "commands/brief.md", "commands/build.md", "commands/cost-setup.md", "commands/design.md", "commands/fix.md", "commands/gepa-eval.md", "commands/gepa-history.md", "commands/gepa-invalidate.md", "commands/incident.md", "commands/init.md", "commands/install.md", "commands/orchestrate-slice.md", "commands/parallel-review.md", "commands/parallel.md", "commands/prune-artifacts.md", "commands/quickwin.md", "commands/review.md", "commands/ship.md", "commands/validate.md", "commands/wake-up-brief.md"]
files_read: []
diff_stat: { files: 26, additions: 262, deletions: 163 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-14: command map application (structural half)

- Created: 2026-08-19T03:24:04.428Z
- From: fullstack-dev
- To: lead
- Objective: SLICE-14 structural half complete: command map applied per unification-plan.md sec.2. Scope was structural file moves/merges only -- dispatch-token rewrite sweep (crew:X/runner:X -> devcrew:X across body content) deliberately NOT done here; that is the parent loop's separate follow-up workflow (also covered by SLICE-14's shared AC-2, out of this handoff's scope).

DISPOSITION LEDGER -- all 58 parent command files accounted:

Crew-side (38 total: 34 in crew/commands/ + 4 in crew/commands/3rdparty/):
- Carried, git mv to commands/ + retrofitted frontmatter (20): adopt.md, architect-feature.md, audit-repo.md, build.md, design.md, fix.md, gepa-eval.md, gepa-history.md, gepa-invalidate.md, incident.md, init.md, orchestrate-slice.md, parallel-review.md, parallel.md, prune-artifacts.md, quickwin.md, review.md, ship.md, validate.md, wake-up-brief.md
- Dropped, git rm (11): claim-files.md, release-files.md, show-claims.md, show-conflicts.md, request-approval.md, resolve-approval.md, show-approvals.md, gepa-optimize.md, gepa-resume.md, gepa-revert.md, gepa-thaw.md
- Collision, merged then git rm (3): install.md -> folded into commands/install.md Step 1; cost-setup.md -> folded into commands/cost-setup.md Step 2; brief-me.md -> folded into commands/brief.md
- 3rdparty carried, git mv (1): refactor-code.md -> commands/3rdparty/refactor-code.md
- 3rdparty dropped, git rm (3): architecture-review.md, create-architecture-documentation.md, create-prd.md

Runner-side (20 total, pre-existing in root commands/ before this slice):
- Carried unchanged (16): auto.md, close.md, decisions.md, intake.md, learn.md, lessons-recent.md, list-presets.md, memory-setup.md, phase-gate.md, pr-fix.md, retrospective.md, spec-status.md, start.md, triage.md, watch.md, wave.md
- Collision-side, content merged in place (3): install.md, cost-setup.md, brief.md (all 3 kept their filenames, crew-side content folded in)
- Folded into brief.md then git rm (1): status.md

End state: 39 first-party command files in commands/ + 1 vendored in commands/3rdparty/ = 40 total. crew/commands/ and crew/commands/3rdparty/ no longer exist (emptied then auto-pruned by git).

MERGED-FILE SUMMARIES:
- commands/install.md: two-step workflow, Step 1 = former crew install-global (writes ~/.claude/crew/{constitution,workflow,metadata}.json via `node crew.ts install-global`), Step 2 = former runner repo-level install (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json via `bun loop.mts install`). Both original behaviors preserved verbatim; cross-references to /runner:status and /crew:brief-me rewritten to /devcrew:brief and /devcrew:install (new prose only, per task-scoped instruction to use devcrew: inside hand-merged files).
- commands/cost-setup.md: two-step workflow, Step 1 = former runner loop.json loop.cost.* seed/migrate (via `bun loop.mts cost-setup`), Step 2 = former crew .claude/crew.json features block seed (via `node crew.ts cost-setup`). Both scripts, defaults tables, and output-JSON shapes preserved verbatim.
- commands/brief.md: three-way merge of crew brief-me (workflow-state briefing) + runner brief (backlog/specs/grades/decisions/alerts) + runner status (install health: preset, paths, marker presence, crewCli). Runs all three underlying scripts, folds into one fixed-order briefing; Install Health section only renders when unhealthy (marker missing / crewCli null / scaffold path missing), recommending /devcrew:install. Pattern-alerts table and full cost-table rendering rules preserved from the runner brief source.

SELF-VERIFY GATES:
- validate-manifests.mts: FAILED on first pass (20 moved crew commands missing required "name"/"auto_execute_steps" frontmatter fields -- crew's command schema never had them, runner's does). Fixed by adding name:<stem> + auto_execute_steps:<bool> to all 20 (true only for the 3 mechanical no-judgment gepa-* wrappers; false for every dispatcher/judgment-gate command, matching the existing runner-side pattern where only memory-setup/cost-setup are true). Re-run: PASS.
- validate-content-length.mts: PASS (does not check commands/ at all in this repo -- only agents/**/*.md and skills/**/SKILL.md are capped; command files carry no line cap here despite the task brief's assumption).
- validate-agent-refs.mts: PASS (checks CLAUDE.md only for phantom crew:/runner: tokens; unaffected by this slice's scope).
- validate-imports.mts: PASS (no source touched).
- tsc --project tsconfig.json --noEmit: PASS
- tsc --project tsconfig.test.json --noEmit: PASS
- bun test src/tests/ --parallel --timeout 60000: 3316 pass, 7 skip, 2 FAIL, 1557 expect() calls, 3325 tests across 327 files.
  - The 2 failures are PRE-EXISTING and OUT OF THIS SLICE'S SCOPE: "DEC-070 contract record exists for FEAT-229" (learning-cycle.test.mts) and "DEC-068 contract record exists for FEAT-222" (eval-generator.test.mts) both assert .claude/artifacts/loop/decisions/DEC-070.md and DEC-068.md exist with status:accepted -- neither file exists on disk. Confirmed via git log these were committed historically (b17b8376, 8f7f7fd5) then removed by an earlier commit (at/before f2110e99, SLICE-13) that predates this slice; I never touched .claude/artifacts/loop/decisions/. Not fixed -- outside the structural command-map scope I was given; flagging for the backlog rather than silently patching decision-registry state.
- biome lint src/: baseline warnings only (61 warnings / 253 infos, pre-existing e.g. cli-args.mts complexity 16>15), nothing in commands/ or touched by this slice, not a regression.

COUNT GATES:
- ls commands/*.md | wc -l => 39
- ls commands/3rdparty/*.md | wc -l => 1
- crew/commands/ and crew/commands/3rdparty/ => both gone (git auto-pruned after last file left each dir)
- Allowed Scope:
  - Structural command-file moves/merges/deletes + frontmatter fixes only (no dispatch-token body rewrite -- that's the parent loop's follow-up workflow).
- Forbidden Scope: -
- Deliverable: Command map applied per unification-plan.md sec.2: 58 parent command files (34+4 crew, 20 runner) reconciled into 39 first-party + 1 vendored file under commands/. crew/commands/ removed.
- Changed Files:
  - commands/install.md
  - commands/cost-setup.md
  - commands/brief.md
  - commands/3rdparty/refactor-code.md
  - commands/adopt.md
  - commands/architect-feature.md
  - commands/audit-repo.md
  - commands/build.md
  - commands/design.md
  - commands/fix.md
  - commands/gepa-eval.md
  - commands/gepa-history.md
  - commands/gepa-invalidate.md
  - commands/incident.md
  - commands/init.md
  - commands/orchestrate-slice.md
  - commands/parallel-review.md
  - commands/parallel.md
  - commands/prune-artifacts.md
  - commands/quickwin.md
  - commands/review.md
  - commands/ship.md
  - commands/validate.md
  - commands/wake-up-brief.md
- Confidence: high
- Risks: 2 pre-existing unrelated test failures (DEC-070/DEC-068 contract-record assertions, decisions/ files missing since before this slice) left unfixed -- flagged, not silently patched. Dispatch-token rewrite sweep across all commands/agents/skills bodies still pending (separate workflow, tracked by SLICE-14's shared AC-2).
- Suggested Next Handoff: Run the dispatch-token rewrite sweep (crew:X/runner:X -> devcrew:X) across commands/, agents/, skills/, CLAUDE.md, AGENTS.md; then re-run validate-agent-refs.mts across the full merged tree; consider filing a FEAT for the 2 missing DEC files if they're expected to exist.


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-004.md b/.claude/artifacts/loop/backlog/triaged/FEAT-004.md
deleted file mode 100644
index 24f5aa1e..00000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-004.md
+++ /dev/null
@@ -1,78 +0,0 @@
----
-id: FEAT-004
-status: triaged
-priority: P2
-category: feature
-target_release: null
-created: 2026-08-18
-updated: 2026-08-18
-depends_on: [FEAT-003]
-slices: []
-derived_from: null
-pm_customer_impact: 0.55
-pm_effort_estimate: 0.65
-pm_strategic_alignment: 0.8
-pm_technical_risk: 0.65
-pm_dependency_depth: 0.75
-pm_composite_priority: P2
-pm_autonomous_safe: false
-pm_reviewed: 2026-08-18
-autonomous_safe: true
-triage_notes: "8-point epic (mandatory decomposition, 2-point cap per runner#393) covering the full command/agent/skill/hook surface; technical_risk banded 0.65 (cross-module reach across the whole surface, but the individual changes are mostly mechanical rename/dedupe with clean git-revert rollback -- kept below the 0.9+ band since nothing here is a schema or cross-plugin contract change); autonomousSafe=false given the dependency chain (3 unresolved predecessor phases) and the already-measured day-one CI-red risk from the agent-cap row."
-proposed_slices:
-  - id_suffix: -SLICE-1
-    title: Command map application + dispatch-token rewrite
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-2
-    title: Agent map merges (doc-writer/researcher/architect) + agent trims
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-3
-    title: Skill dedupe (7 pairs) + manifest rename to devcrew
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-4
-    title: "Hooks merge + matcher-scoped consolidation, <=150ms gate"
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-5
-    title: models.yaml/model-router single-source design merge
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-6
-    title: "Greenfield spikes + full /devcrew:* ceremony smoke test"
-    points: 1
-    estimated_tokens: 60000
-tags: ["stack:typescript", "area:plugin-surface", "concern:dispatch-routing"]
-needs_contract: true
-needs_ux: false
-arch_attempt: 0
-arch_status: approved
-arch_review: approved
----
-## Description
-
-P3 Surface merge: apply command map (54 parent commands -> 39 first-party /devcrew:* + 1 vendored; 11 crew commands dropped incl claims/approvals 7 and gepa-promotion 4), agent map (29 -> 26 owned, document-writer/researcher/architect merges), skill dedupe (7 verified pairs, dev-team superset wins, ~82 final); dispatch-token rewrite crew:X/runner:X -> devcrew:X; hooks merged + consolidated to matcher-scoped (exit gate measured <=150ms per Bash call); trim 4 over-cap agents to 300-line cap; models.yaml/model-router single-source design merge; manifest name devcrew. Includes greenfield candidates: prompt-based hooks spike, blank-page 39-command audit. Exit gates: validate-agent-refs green, every old token resolves per map, content-length green, one full slice ceremony under /devcrew:*. Full spec: unification-plan.md section 2 + P3 row.
-
-## Intake notes
-
-Created via free-text intake (`/runner:intake "<text>"`). Priority is
-unset — this FEAT has not been scored yet. Run `/runner:triage`
-(PM scoring + `backlog pm-apply`) to score it before slicing.
-## Acceptance criteria (Given-When-Then)
-
-- AC-1: Given the command map from unification-plan.md section 2 is applied, When `bun ./src/scripts/validate-agent-refs.mts` runs against the merged tree, Then it exits 0.
-- AC-2: Given the dispatch-token rewrite table (crew:X -> devcrew:X, runner:X -> devcrew:X), When every .md file under commands/, agents/, skills/, CLAUDE.md, and AGENTS.md is grepped for `\bcrew:[a-z-]+\b|\brunner:[a-z-]+\b`, Then every match resolves to an entry in the section-2 map -- zero unmapped tokens.
-- AC-3: Given 4 dev-team agents exceed the 300-line cap before trimming (architect 346, verifier 343, backend-dev 335, release-engineer 326 lines), When `bun ./src/scripts/validate-content-length.mts` runs after the trim slice, Then it exits 0 and each of the four files is <=300 lines.
-- AC-4: Given hooks are consolidated to matcher-scoped registrations, When a representative Bash tool call is measured end-to-end through the hook pipeline, Then the measured overhead is <=150ms -- a measurement above 150ms fails this AC (targets the ~540ms/Bash-call regression named in the plan's risk register).
-- AC-5: Given the merge completes, When one full slice ceremony runs end-to-end under the /devcrew:* namespace, Then it completes with a PASS badge and its artifacts contain zero references to the old /crew: or /runner: command namespaces.
-
-## Proposed slices (PM decomposition)
-
-- SLICE-1: Command map application + dispatch-token rewrite (2 pts)
-- SLICE-2: Agent map merges (doc-writer/researcher/architect) + agent trims (2 pts)
-- SLICE-3: Skill dedupe (7 pairs) + manifest rename to devcrew (2 pts)
-- SLICE-4: Hooks merge + matcher-scoped consolidation, <=150ms gate (2 pts)
-- SLICE-5: models.yaml/model-router single-source design merge (2 pts)
-- SLICE-6: Greenfield spikes + full /devcrew:* ceremony smoke test (1 pts)
diff --git a/.claude/state/crew/slice-progress.md b/.claude/state/crew/slice-progress.md
index 7e7c5ebf..1c8aa6c8 100644
--- a/.claude/state/crew/slice-progress.md
+++ b/.claude/state/crew/slice-progress.md
@@ -1,6 +1,6 @@
 # Slice Progress
 
-Updated: 2026-08-19T03:05:32.396Z
+Updated: 2026-08-19T03:07:55.600Z
 
 Active plan: _(none detected)_
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index 588f9262..9b50b621 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,21 +1,17 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T03:07:30.030Z",
+  "updatedAt": "2026-08-19T03:24:04.431Z",
   "currentRun": {
-    "title": "FEAT003 SLICE13: devcrew.json schemaVersion 2 merge + migrator",
+    "title": "FEAT004 SLICE14: Command map application + dispatch-token rewrite",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
-    "startedAt": "2026-08-19T02:32:45.400Z",
-    "updatedAt": "2026-08-19T03:07:30.030Z",
-    "next": "PM/architect close-out for FEAT-003 (all three P2 slices SLICE-11/12/13 now landed); P3 (FEAT-004 surface merge) is next in the backlog per loop-snapshot.md.",
+    "startedAt": "2026-08-19T03:07:55.529Z",
+    "updatedAt": "2026-08-19T03:24:04.431Z",
+    "next": "Run the dispatch-token rewrite sweep (crew:X/runner:X -> devcrew:X) across commands/, agents/, skills/, CLAUDE.md, AGENTS.md; then re-run validate-agent-refs.mts across the full merged tree; consider filing a FEAT for the 2 missing DEC files if they're expected to exist.",
     "gates": {
       "review": null,
-      "validation": {
-        "status": "failed",
-        "updatedAt": "2026-08-19T03:07:30.030Z",
-        "note": "phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"
-      },
+      "validation": null,
       "deployment": {
         "dev": null,
         "prod": null
@@ -26,13 +22,13 @@
       "help": null
     },
     "artifacts": {
-      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T023245Z-run-brief-feat003-slice13-devcrew-json-schemaversion-2-merge-migrator.md",
+      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T030755Z-run-brief-feat004-slice14-command-map-application-dispatch-token-rewri.md",
       "handoffs": [
-        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T025505Z-handoff-slice-13-devcrew-json-schema-v2-migrator-plugin-identity-arc.md"
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T032404Z-handoff-slice-14-command-map-application-structural-half.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
-      "validationResult": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\validations\\20260819T030730Z-validation-result-phase-unspecified-gate.md",
+      "validationResult": null,
       "deploymentChecks": {
         "dev": null,
         "prod": null
@@ -41,6 +37,46 @@
     }
   },
   "recentRuns": [
+    {
+      "title": "FEAT003 SLICE13: devcrew.json schemaVersion 2 merge + migrator",
+      "goal": "",
+      "mode": "autonomous",
+      "status": "active",
+      "startedAt": "2026-08-19T02:32:45.400Z",
+      "updatedAt": "2026-08-19T03:07:30.030Z",
+      "completedAt": "2026-08-19T03:07:30.030Z",
+      "next": "PM/architect close-out for FEAT-003 (all three P2 slices SLICE-11/12/13 now landed); P3 (FEAT-004 surface merge) is next in the backlog per loop-snapshot.md.",
+      "gates": {
+        "review": null,
+        "validation": {
+          "status": "failed",
+          "updatedAt": "2026-08-19T03:07:30.030Z",
+          "note": "phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"
+        },
+        "deployment": {
+          "dev": null,
+          "prod": null
+        },
+        "blocked": null,
+        "escalation": null,
+        "incident": null,
+        "help": null
+      },
+      "artifacts": {
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T023245Z-run-brief-feat003-slice13-devcrew-json-schemaversion-2-merge-migrator.md",
+        "handoffs": [
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T025505Z-handoff-slice-13-devcrew-json-schema-v2-migrator-plugin-identity-arc.md"
+        ],
+        "reviewResult": null,
+        "validationPlan": null,
+        "validationResult": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\validations\\20260819T030730Z-validation-result-phase-unspecified-gate.md",
+        "deploymentChecks": {
+          "dev": null,
+          "prod": null
+        },
+        "finalSynthesis": null
+      }
+    },
     {
       "title": "FEAT003 SLICE12: Fail-hard write-validation-result direct import",
       "goal": "",
@@ -185,42 +221,6 @@
         },
         "finalSynthesis": null
       }
-    },
-    {
-      "title": "FEAT002 SLICE09: Single tsconfig/tsconfig.test + biome config merge",
-      "goal": "",
-      "mode": "autonomous",
-      "status": "active",
-      "startedAt": "2026-08-19T00:40:33.000Z",
-      "updatedAt": "2026-08-19T00:47:57.617Z",
-      "completedAt": "2026-08-19T00:47:57.617Z",
-      "next": "P3 flattening will eventually dissolve the crew/ prefix and these two config files should merge into one at that point -- this slice deliberately kept them separate and coherent rather than merging early. Consider whether the root:false crew/biome.json should later gain extends://\" once P3 lands and rule sets are reconciled.",
-      "gates": {
-        "review": null,
-        "validation": null,
-        "deployment": {
-          "dev": null,
-          "prod": null
-        },
-        "blocked": null,
-        "escalation": null,
-        "incident": null,
-        "help": null
-      },
-      "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T004032Z-run-brief-feat002-slice09-single-tsconfig-tsconfig-test-biome-config-m.md",
-        "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T004757Z-handoff-slice-09-tsconfig-biome-config-unification.md"
-        ],
-        "reviewResult": null,
-        "validationPlan": null,
-        "validationResult": null,
-        "deploymentChecks": {
-          "dev": null,
-          "prod": null
-        },
-        "finalSynthesis": null
-      }
     }
   ]
 }
diff --git a/commands/adopt.md b/commands/adopt.md
index e4252a52..d43321b4 100644
--- a/commands/adopt.md
+++ b/commands/adopt.md
@@ -1,5 +1,7 @@
 ---
+name: adopt
 description: Preferred short entry point for adopting an existing repo into the workflow.
+auto_execute_steps: false
 ---
 
 # Adopt This Repo For Crew
diff --git a/commands/architect-feature.md b/commands/architect-feature.md
index b9cd4993..69ded03b 100644
--- a/commands/architect-feature.md
+++ b/commands/architect-feature.md
@@ -1,5 +1,7 @@
 ---
+name: architect-feature
 description: Feature-level researcher+architect pipeline — produces a contracts artifact and infers surface/stack/concern tags written back to FEAT frontmatter. Run once per FEAT before slice 1. Safe to re-run (additive). Optional --auto-start transitions to first pending slice.
+auto_execute_steps: false
 ---
 
 # Architect Feature
diff --git a/commands/audit-repo.md b/commands/audit-repo.md
index 76efbd1c..33406a3f 100644
--- a/commands/audit-repo.md
+++ b/commands/audit-repo.md
@@ -1,5 +1,7 @@
 ---
+name: audit-repo
 description: Internal setup/debug command to inspect whether the Crew harness is already present.
+auto_execute_steps: false
 ---
 
 # Audit Repo For Crew
diff --git a/commands/brief.md b/commands/brief.md
index dd2d2ec9..81b28285 100644
--- a/commands/brief.md
+++ b/commands/brief.md
@@ -1,27 +1,45 @@
 ---
 name: brief
-description: Standalone loop situational report — backlog counts, top priorities, scores, decisions, pattern alerts. Complements crew brief-me.
+description: Fixed-structure situational report combining workflow state (crew brief-me), backlog/specs/grades (loop brief), and install health (loop status) into one briefing.
 auto_execute_steps: false
 ---
 
-# Autonomous Loop Brief
+# Brief
 
-```bash
-bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" brief --repo "$PWD"
-```
+This is the preferred user-facing "where are we?" command. Use it when the
+user wants a fast, structured briefing before continuing work — it folds
+together three prior separate reports (crew `brief-me`, loop `brief`, loop
+`status`) into one.
 
-Returns JSON with:
+Workflow:
 
-- `backlogCounts` — { pending, triaged, in_progress, done }
-- `topTriaged` — highest-priority triaged features (next to slice)
-- `inFlight` — in-progress features with linked slices
-- `specsToDecompose` — approved specs without derived features
-- `grades` — total count, last 5 with avg scores, avg of last 5
-- `decisions` — total, accepted, superseded, reverted
-- `alerts` — pattern alerts (low scores, decomposition issues, orphans, etc.)
-- `recentEvents` — last 10 plugin command events from the telemetry log
+1. Verify the current workspace path with `pwd`.
+2. Sync remote state so the briefing reflects reality, not stale local refs:
+   - `git fetch --prune`
+3. Run the underlying reports:
+   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" brief-me --repo "$PWD"` — workflow-state / artifact-trail briefing.
+   - `bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" brief --repo "$PWD"` — backlog, specs, grades, decisions, pattern alerts.
+   - `bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" status --repo "$PWD"` — loop install health (preset, resolved paths, marker presence, crew dependency).
+4. Explicitly compare each report's `repoPath` (or equivalent) with the current working directory. If any do not match, stop and treat the briefing as invalid for this run.
+5. If they match, present the briefing in this fixed order:
+   - `Current Objective`
+   - `Recent Activity`
+   - `In Progress`
+   - `Run Health` — only if the crew report's `runHealth` field is non-null. Render as a one-line summary: `Run health: <runHealth value>`.
+   - `Install Health` — only if the loop `status` report shows `hasMarkerBlock: false`, `crewCli: null`, or any scaffold path missing. Otherwise omit this section entirely — a healthy install should not clutter the briefing. When shown, report `preset`, the resolved paths, and which check failed, then recommend `/devcrew:install`.
+   - `Blocked / Missing`
+   - `Important Reminders`
+   - `Autonomous Loop` — only if the loop `brief` report's data is non-null. Render: backlog counts by state (pending, triaged, in_progress, done), top-priority triaged features (next to slice), in-flight features with linked slices, specs awaiting decomposition, last 5 grade averages + per-dimension snapshot if any are below 0.80, decision tallies (total, accepted, superseded, reverted), pattern alerts, and the last 10 telemetry events.
+   - `Recent Costs (last 5)` — when cost data is available, as a Markdown table with columns `Slice | Duration | Msgs | Total (M) | I/O (M) | Cache R/W (M) | Cache hit | Dominant model`, sourced from each entry's `runTitle`, `durationMin`+"m", `messages`, `totalMillions`, `ioMillionsStr`, `cacheRWMillionsStr`, `cacheHitPct`+"%", `dominantModelStr`. Do not surface USD in the row. When a cost entry's `modelMix` array has more than one entry, render the `Dominant model` cell as a compact multi-model list (`model: msgPct% / $usd`, separated by ` · `) instead of the single `dominantModelStr`.
+   - `Cost Diagnostics` — when diagnostics data is non-empty, immediately after Recent Costs, with columns `Slice | Calls | Fails | %Fail | Compact | Subag | Reread | p90 (b) | Preamble | Skills | Sessions | Flags`, sourced from each entry's `toolCalls`, `toolFailures`, `toolFailureRate`+"%", `compactionCount`, `subagentDispatches`, `fileReReadCount`, `toolResultP90`, `turnsBeforeFirstTool`, `skillInvocations`, `sessionsScanned`, `flagsStr`. Skip this table when diagnostics is empty.
+   - `Model Burn (last N)` — when `modelBurn` has more than one entry, render after diagnostics with columns `Model | Slices | Messages | USD`, sourced from each entry's `model`, `slices`, `messages`, `usd`. Use it to surface "where the money went" across recent slices.
+   - `Recommended Next Step`
+   - `Secondary Options`
+6. Keep the report concise, concrete, and evidence-backed.
+7. Use the git activity, artifact trail, workflow state, and repo memory to produce one clear next-step recommendation.
+8. In `Recent Activity`, include the most relevant repo-memory starting points or retrieval hints, not just git or artifact counts.
 
-## Pattern alerts
+## Pattern alerts (loop brief)
 
 Triggered by `detectPatterns()`:
 
@@ -35,11 +53,18 @@ Triggered by `detectPatterns()`:
 
 Each alert has `severity`, `category`, `message`, `suggested_action`.
 
-## Relationship to crew brief-me
+## Why one command
 
-- `/crew:brief-me` covers Crew artifacts (runs, reviews, validations, workflow state)
-- `/runner:brief` covers backlog, specs, grades, decisions, alerts
+Previously `/crew:brief-me` (workflow state), `/runner:brief` (backlog,
+specs, grades, decisions, alerts), and `/runner:status` (loop install
+health) were three separate reports a session had to run in sequence to get
+the full picture. `/devcrew:brief` runs all three and folds them into one
+fixed-order briefing so "where are we?" is a single call. If `hasMarkerBlock`
+is false or a scaffold path is missing, the `Install Health` section
+recommends `/devcrew:install` instead of requiring a separate status check
+first.
 
-Run both at session start when picking up an in-flight repo. Crew tells you
-"what's the active workflow run"; loop tells you "what's next in
-the product pipeline + how are we doing".
+The point is not to dump raw JSON. The point is to give the user a calm,
+situational briefing with the most relevant status and one concrete
+recommendation.
+</content>
diff --git a/commands/build.md b/commands/build.md
index 37d3c7ca..8c7fdc2d 100644
--- a/commands/build.md
+++ b/commands/build.md
@@ -1,5 +1,7 @@
 ---
+name: build
 description: Preferred short entry point for building or extending capability in the current repo.
+auto_execute_steps: false
 ---
 
 # Build — Dispatcher Workflow
diff --git a/commands/cost-setup.md b/commands/cost-setup.md
index 1d1e6155..741226df 100644
--- a/commands/cost-setup.md
+++ b/commands/cost-setup.md
@@ -1,14 +1,19 @@
 ---
 name: cost-setup
-description: Seed or migrate the cost config block in .claude/loop.json. Idempotent. Auto-rewrites legacy flat keys (costSliceCeiling, costStopThreshold, costRegression*) into the nested loop.cost.* shape.
+description: Seed or migrate both cost-related config blocks in one pass — .claude/loop.json's loop.cost.* (ceiling + regression) and .claude/crew.json's features block (cost-hygiene, redundant-read-stop, shell-preflight, subagent-inline-warn). Idempotent.
 auto_execute_steps: true
 ---
 
-# Loop Cost Setup
+# Cost Setup
+
+Configure both of dev-crew's cost-related config surfaces for this repo in
+one pass.
+
+## Step 1 — Loop cost config (.claude/loop.json)
 
 Seed or migrate the cost-related config keys in `.claude/loop.json`.
 
-## What it does
+### What it does
 
 - Creates `loop.cost.ceilingUsd` and `loop.cost.regression.{multiplier,window,minSamples}` if missing.
 - Migrates legacy flat keys to the nested shape and deletes the originals:
@@ -25,7 +30,7 @@ Seed or migrate the cost-related config keys in `.claude/loop.json`.
   stop-conditions). The plan-count cap is gone; HIGH cost alerts are now
   advisory-only (mirror cost-regression).
 
-## Defaults applied when nothing set yet
+### Defaults applied when nothing set yet
 
 | Key | Default |
 |---|---|
@@ -34,7 +39,7 @@ Seed or migrate the cost-related config keys in `.claude/loop.json`.
 | `loop.cost.regression.window` | `5` |
 | `loop.cost.regression.minSamples` | `3` |
 
-## Usage
+### Usage
 
 Run once (idempotent — safe to re-run):
 
@@ -56,7 +61,7 @@ bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD" \
   --features "project=astrarunner,projectAliases=runner-hardening|runner-feat-202"
 ```
 
-## Output
+### Output
 
 JSON with four fields:
 
@@ -64,3 +69,66 @@ JSON with four fields:
 - `written` — `true` if the file changed, `false` if already current
 - `migratedLegacyKeys` — `string[]` of flat keys that were rewritten + deleted
 - `effective` — `{ ceilingUsd, regression: {...} }` final values
+
+## Step 2 — Crew gating features (.claude/crew.json)
+
+Configure the crew plugin's cost-hygiene and gating features for this repo.
+
+This writes `.claude/crew.json` with a `features` block that mirrors the
+defaults declared in the plugin's `FEATURES` registry. Features default to
+**on**. To disable one, pass `--features <name>=off`.
+
+Replaces the legacy env-var toggles (`CREW_COST_HYGIENE`,
+`CREW_TOOL_PREFLIGHT`, `CREW_SUBAGENT_INLINE_THRESHOLD`). Those env vars are
+gone — control is config-only now.
+
+### Usage
+
+1. Run the setup (idempotent — safe to re-run):
+   ```bash
+   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" cost-setup --repo "$PWD"
+   ```
+
+2. To override one or more feature defaults at the same time:
+   ```bash
+   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" cost-setup --repo "$PWD" --features "cost-hygiene=off,shell-preflight=off"
+   ```
+
+3. To inspect the current registry without writing:
+   ```bash
+   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" features-list
+   ```
+
+### Output
+
+JSON with three fields:
+
+- `configPath` — absolute path to `.claude/crew.json`
+- `written` — `true` if the file was changed, `false` if already current
+- `features` — `[{ name, enabled, default }]` for every registered feature
+
+### What gets written
+
+A `features` block in `.claude/crew.json`:
+
+```json
+{
+  "features": {
+    "cost-hygiene":         { "enabled": true },
+    "redundant-read-stop":  { "enabled": true },
+    "shell-preflight":      { "enabled": true },
+    "subagent-inline-warn": { "enabled": true }
+  }
+}
+```
+
+User-set values for fields outside `features` are preserved.
+
+## After running
+
+Both steps are independent and idempotent — running one does not require
+the other to have run first, but `/devcrew:cost-setup` runs both by
+default. Verify hooks pick up the change immediately — open a new tool call
+(Read, Edit, Bash, etc.) and check the `[features] <name>: enabled|disabled`
+line on stderr. No restart needed.
+</content>
diff --git a/commands/design.md b/commands/design.md
index dea6135b..8ef19a1c 100644
--- a/commands/design.md
+++ b/commands/design.md
@@ -1,5 +1,7 @@
 ---
+name: design
 description: Design a feature or service before build.
+auto_execute_steps: false
 ---
 
 # Design — Dispatcher Workflow
diff --git a/commands/fix.md b/commands/fix.md
index bc80c501..71615955 100644
--- a/commands/fix.md
+++ b/commands/fix.md
@@ -1,5 +1,7 @@
 ---
+name: fix
 description: Preferred short entry point for investigating and fixing broken behavior in the current repo.
+auto_execute_steps: false
 ---
 
 # Fix — Dispatcher Workflow
diff --git a/commands/gepa-eval.md b/commands/gepa-eval.md
index 450479b4..885e0b1b 100644
--- a/commands/gepa-eval.md
+++ b/commands/gepa-eval.md
@@ -1,5 +1,7 @@
 ---
+name: gepa-eval
 description: Run a per-agent eval suite under a fileLockManager guard. Wraps `bun run evals` so concurrent runs for the same agent cannot corrupt the trial JSONL store.
+auto_execute_steps: true
 allowed-tools: Bash
 ---
 
diff --git a/commands/gepa-history.md b/commands/gepa-history.md
index 255964ce..83f685ac 100644
--- a/commands/gepa-history.md
+++ b/commands/gepa-history.md
@@ -1,5 +1,7 @@
 ---
+name: gepa-history
 description: Print recent GEPA trials for an agent (from .claude/artifacts/crew/gepa/trials/<agent>.jsonl)
+auto_execute_steps: true
 allowed-tools: Bash
 ---
 
diff --git a/commands/gepa-invalidate.md b/commands/gepa-invalidate.md
index 5a02ef2d..8ed471d0 100644
--- a/commands/gepa-invalidate.md
+++ b/commands/gepa-invalidate.md
@@ -1,5 +1,7 @@
 ---
+name: gepa-invalidate
 description: Soft-delete GEPA trials for an agent. Supports filtering by ISO datetime (--since) and tag (--tag). Writes an audit row to events.jsonl with invalidated_by_pid, invalidated_at, and reason. Invalidated trials are excluded from future recall() calls but preserved on disk (soft-delete semantics).
+auto_execute_steps: true
 allowed-tools: Bash
 ---
 
diff --git a/commands/incident.md b/commands/incident.md
index 13aeb6a2..ba0e03e9 100644
--- a/commands/incident.md
+++ b/commands/incident.md
@@ -1,5 +1,7 @@
 ---
+name: incident
 description: Preferred short entry point for responding to a live incident or recovering from a broken release in the current repo.
+auto_execute_steps: false
 ---
 
 # Incident — Dispatcher Workflow
diff --git a/commands/init.md b/commands/init.md
index d9e8c79d..161bd062 100644
--- a/commands/init.md
+++ b/commands/init.md
@@ -1,5 +1,7 @@
 ---
+name: init
 description: Preferred short entry point for initializing a new repo with the workflow harness.
+auto_execute_steps: false
 ---
 
 # Initialize A New Crew Repo
diff --git a/commands/install.md b/commands/install.md
index 00f77e63..c487b67a 100644
--- a/commands/install.md
+++ b/commands/install.md
@@ -1,10 +1,41 @@
 ---
 name: install
-description: Install or refresh the loop methodology layer in this repo (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
+description: Install or refresh dev-crew end to end — global framework memory (~/.claude/crew/*) plus the repo-level method layer (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
 auto_execute_steps: false
 ---
 
-# Install Autonomous Loop
+# Install
+
+Installs dev-crew in one pass: global framework memory first, then the
+repo-level method layer. Both steps are idempotent — safe to re-run to
+refresh either layer independently.
+
+## Step 1 — Global framework memory
+
+Install or update the managed global dev-crew memory files. Skip this step
+only if global memory is already installed at the current plugin version
+(compare `~/.claude/crew/metadata.json`).
+
+This writes one global managed copy:
+
+- `~/.claude/crew/constitution.md`
+- `~/.claude/crew/workflow.md`
+- `~/.claude/crew/metadata.json`
+
+It also ensures global `~/.claude/CLAUDE.md` imports the constitution and workflow.
+
+Run:
+
+```bash
+set -euo pipefail
+node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" install-global
+```
+
+Report which files changed, whether global memory is installed, the
+installed global memory version, and whether the user should run
+`/reload-plugins`.
+
+## Step 2 — Repo-level method layer
 
 Adds the dev-crew method to the current repo:
 
@@ -19,7 +50,9 @@ Adds the dev-crew method to the current repo:
 
 If the repo currently has an ad-hoc HARD RULE block hand-pasted into CLAUDE.md (the pattern from legacy pre-dev-crew harness repos / MemoryService / AstraGenie.Tools), the installer migrates it: extracts the phase-gate commands into the config, deletes the ad-hoc block, writes the new marker-bracketed block in its place.
 
-**Hard dependency:** the `crew` plugin must be installed in the Claude Code plugin cache. The installer errors with a clear message if it cannot find `crew`.
+**Hard dependency:** Step 1 (global framework memory) must have already
+succeeded at least once for this plugin version — the installer errors with
+a clear message if it cannot find `crew`.
 
 Workflow:
 
@@ -36,10 +69,21 @@ Workflow:
    ```
    `--preset` is **required** for a first-time install (no `.claude/loop.json` on disk yet) — there is no hardcoded default stack. Omit `--preset` only to re-install/refresh an already-configured repo; the installer then reads the existing `.claude/loop.json` as-is (no re-merge). Add `--light` to seed the trimmed single-reviewer ladder instead of the default two-reviewer ladder (only on a repo with a CI test gate).
 4. Report which files were written and which preset is active.
-5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/runner:phase-gate` for the first time.
+5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/devcrew:phase-gate` for the first time.
+
+## After install
+
+- `/devcrew:brief` — show resolved config + marker presence (folds in the former `/runner:status` check)
+- `/devcrew:phase-gate --phase <N>` — run the configured suite
+- `/devcrew:list-presets` — see built-in presets
+
+End with a short welcome message:
 
-After install:
+- congratulate the user on the excellent life choice of installing dev-crew
+- keep it brief and slightly tongue-in-cheek
+- remind them of the next useful commands: `/devcrew:init`, `/devcrew:adopt`, and `/devcrew:brief`
 
-- `/runner:status` — show resolved config + marker presence
-- `/runner:phase-gate --phase <N>` — run the configured suite
-- `/runner:list-presets` — see built-in presets
+Do not delegate this to another command name or skill reference.
+`/devcrew:install` is the primary user-facing entry point for both the
+global and repo-level installs above.
+</content>
diff --git a/commands/orchestrate-slice.md b/commands/orchestrate-slice.md
index 65b87bcf..889c83c2 100644
--- a/commands/orchestrate-slice.md
+++ b/commands/orchestrate-slice.md
@@ -1,5 +1,7 @@
 ---
+name: orchestrate-slice
 description: Orchestrate the full specialist ladder for a slice — classify by FEAT tags, dispatch architect (contracts), uxdesigner (UI spec), builder, reviewer, validator, doc-writer in sequence. Every dispatch is visible in the main thread.
+auto_execute_steps: false
 ---
 
 # Orchestrate Slice
diff --git a/commands/parallel-review.md b/commands/parallel-review.md
index 68dea3cb..f4ca1ceb 100644
--- a/commands/parallel-review.md
+++ b/commands/parallel-review.md
@@ -1,5 +1,7 @@
 ---
+name: parallel-review
 description: Internal coordination command for cases where parallel ownership genuinely helps.
+auto_execute_steps: false
 ---
 
 # Run Parallel Review In Internal Coordination Mode
diff --git a/commands/parallel.md b/commands/parallel.md
index de632e30..9dbbb202 100644
--- a/commands/parallel.md
+++ b/commands/parallel.md
@@ -1,8 +1,10 @@
 ---
+name: parallel
 description: Run multiple autonomous-safe triaged features in parallel git worktrees
   using `crew:build` per-worktree dispatch (Path A, FEAT-136). Resolves loop CLI,
   spawns worktrees, dispatches N `crew:build` agents in one parallel block (each runs
   the slice ceremony), then merges DONE branches to main.
+auto_execute_steps: false
 ---
 
 # Parallel Feature Execution
diff --git a/commands/prune-artifacts.md b/commands/prune-artifacts.md
index 09bdf4fd..19da83fc 100644
--- a/commands/prune-artifacts.md
+++ b/commands/prune-artifacts.md
@@ -1,5 +1,7 @@
 ---
+name: prune-artifacts
 description: Delete crew artifact files older than a configurable age threshold.
+auto_execute_steps: false
 ---
 
 # Prune Artifacts
diff --git a/commands/quickwin.md b/commands/quickwin.md
index 07555673..f4eb0a3c 100644
--- a/commands/quickwin.md
+++ b/commands/quickwin.md
@@ -1,5 +1,7 @@
 ---
+name: quickwin
 description: Spawn or reuse a concurrent quick-win chore-branch worktree, disjoint from the active wave/slice, and claim files for it.
+auto_execute_steps: false
 argument-hint: [file paths to work on]
 ---
 
diff --git a/commands/review.md b/commands/review.md
index 77e8525a..54a263f5 100644
--- a/commands/review.md
+++ b/commands/review.md
@@ -1,5 +1,7 @@
 ---
+name: review
 description: Preferred short entry point for running the review phase on completed work.
+auto_execute_steps: false
 ---
 
 # Review — Dispatcher Workflow
diff --git a/commands/ship.md b/commands/ship.md
index 9c853d0a..8bce7435 100644
--- a/commands/ship.md
+++ b/commands/ship.md
@@ -1,5 +1,7 @@
 ---
+name: ship
 description: Auto-fix loop entry point for QA, verification, PR filing, and deployment evidence. Dispatches qa-expert + verifier in parallel; retries with a specialist builder on FAIL up to ship.fix_retry_limit times; files PR or escalates with a `blocked` badge.
+auto_execute_steps: false
 ---
 
 # Ship — Auto-Fix Loop
diff --git a/commands/validate.md b/commands/validate.md
index 7ac8846b..137a98ca 100644
--- a/commands/validate.md
+++ b/commands/validate.md
@@ -1,5 +1,7 @@
 ---
+name: validate
 description: Preferred short entry point for running the validation phase on runnable or observable behavior.
+auto_execute_steps: false
 ---
 
 # Validate — Dispatcher Workflow
diff --git a/commands/wake-up-brief.md b/commands/wake-up-brief.md
index ac361df4..7294ac8c 100644
--- a/commands/wake-up-brief.md
+++ b/commands/wake-up-brief.md
@@ -1,5 +1,7 @@
 ---
+name: wake-up-brief
 description: Internal startup/debug command for inspecting the raw Crew wake-up brief for this repo.
+auto_execute_steps: false
 ---
 
 # Read Engineering OS Wake-Up Brief

```

## Files touched

### commands/3rdparty/refactor-code.md

```
---
description: Intelligently refactor and improve code quality following a systematic multi-step process.
---

# Intelligently Refactor and Improve Code Quality

Follow this systematic approach to refactor code: **$ARGUMENTS**

1. **Pre-Refactoring Analysis**
   - Identify the code that needs refactoring and the reasons why
   - Understand the current functionality and behavior completely
   - Review existing tests and documentation
   - Identify all dependencies and usage points

2. **Test Coverage Verification**
   - Ensure comprehensive test coverage exists for the code being refactored
   - If tests are missing, write them BEFORE starting refactoring
   - Run all tests to establish a baseline
   - Document current behavior with additional tests if needed

3. **Refactoring Strategy**
   - Define clear goals for the refactoring (performance, readability, maintainability)
   - Choose appropriate refactoring techniques:
     - Extract Method/Function
     - Extract Class/Component
     - Rename Variable/Method
     - Move Method/Field
     - Replace Conditional with Polymorphism
     - Eliminate Dead Code
   - Plan the refactoring in small, incremental steps

4. **Environment Setup**
   - Create a new branch: `git checkout -b refactor/$ARGUMENTS`
   - Ensure all tests pass before starting
   - Set up any additional tooling needed (profilers, analyzers)

5. **Incremental Refactoring**
   - Make small, focused changes one at a time
   - Run tests after each change to ensure nothing breaks
   - Commit working changes frequently with descriptive messages
   - Use IDE refactoring tools when available for safety

6. **Code Quality Improvements**
   - Improve naming conventions for clarity
   - Eliminate code duplication (DRY principle)
   - Simplify complex conditional logic
   - Reduce method/function length and complexity
   - Improve separation of concerns

7. **Performance Optimizations**
   - Identify and eliminate performance bottlenecks
   - Optimize algorithms and data structures
   - Reduce unnecessary computations
   - Improve memory usage patterns

8. **Design Pattern Application**
   - Apply appropriate design patterns where beneficial
   - Improve abstraction and encapsulation
   - Enhance modularity and reusability
   - Reduce coupling between components

9. **Error Handling Improvement**
   - Standardize error handling approaches
   - Improve error messages and logging
   - Add proper exception handling
   - Enhance resilience and fault tolerance

10. **Documentation Updates**
    - Update code comments to reflect changes
    - Revise API documentation if interfaces changed
    - Update inline documentation and examples
    - Ensure comments are accurate and helpful

11. **Testing Enhancements**
    - Add tests for any new code paths created
    - Improve existing test quality and coverage
    - Remove or update obsolete tests
    - Ensure tests are still meaningful and effective

12. **Static Analysis**
    - Run linting tools to catch style and potential issues
    - Use static analysis tools to identify problems
    - Check for security vulnerabilities
    - Verify code complexity metrics

13. **Performance Verification**
    - Run performance benchmarks if applicable
    - Compare before/after metrics
    - Ensure refactoring didn't degrade performance
    - Document any performance improvements

14. **Integration Testing**
    - Run full test suite to ensure no regressions
    - Test integration with dependent systems
    - Verify all functionality works as expected
    - Test edge cases and error scenarios

15. **Code Review Preparation**
    - Review all changes for quality and consistency
    - Ensure refactoring goals were achieved
    - Prepare clear explanation of changes made
    - Document benefits and rationale

16. **Documentation of Changes**
    - Create a summary of refactoring changes
    - Document any breaking changes or new patterns
    - Update project documentation if needed
    - Explain benefits and reasoning for future reference

17. **Deployment Considerations**
    - Plan deployment strategy for refactored code
    - Consider feature flags for gradual rollout
    - Prepare rollback procedures
    - Set up monitoring for the refactored components

Remember: Refactoring should preserve external behavior while improving internal structure. Always prioritize safety over speed, and maintain comprehensive test coverage throughout the process.

```

### commands/adopt.md

```
---
name: adopt
description: Preferred short entry point for adopting an existing repo into the workflow.
auto_execute_steps: false
---

# Adopt This Repo For Crew

Prepare the current repository for the Crew workflow.

Before running for the first time on a repo that already has a pre-P3.1 install
(legacy `.claude/engineering-os/` paths, `<!-- engineering-os:start -->`
markers, or pre-rename `~/.claude/engineering-os/` globals), read `docs/process/adoption-checklist.md` for what gets created,
migrated, modified, and how to roll back.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

Goals:

- inspect existing Claude Code files before writing anything
- preserve repo-owned instructions and conventions
- create only the smallest framework-specific additions
- keep framework constitution and workflow in the one global managed copy
- make the result easy to inspect and easy to remove

Workflow:

1. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" bootstrap --repo "$PWD"`
2. Inspect `CLAUDE.md`, `.claude/`, `.mcp.json`, and other repo guidance before making additional changes.
3. If `CLAUDE.md` does not exist, create it.
4. If `CLAUDE.md` already exists, improve it conservatively and prefer `@path` imports instead of rewriting large sections.
5. Add repo-local framework files only where useful:
   - `.claude/agents/`
   - `.claude/commands/`
   - `.claude/hooks/`
   - `.claude/settings.json`
6. Keep framework-owned instructions isolated from repo-owned instructions.
7. Inspect obvious runtime and deployment clues that will matter later:
   - `README`
   - `.github/workflows/`
   - Docker / compose / infra files
8. If the repo already reveals useful deployment clues, write initial deployment guidance:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" discover-deployment --repo "$PWD"`
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-deployment-guidance --repo "$PWD" --title "<short title>" --discovery-status repo-derived ...`
9. If deployment is only partly clear, record the known build/deploy path and what still needs live verification instead of guessing.
10. If the installer reports missing or stale global memory, recommend `/crew:install`.
11. Explain any assumptions before editing if the repo shape makes the bootstrap risky.
12. End with a short welcome message:
   - congratulate the user on the suspiciously good choice of bringing this repo into Crew
   - keep it brief and slightly tongue-in-cheek
   - show the main commands to start with: `/crew:brief-me`, `/crew:build`, `/crew:fix`, and `/crew:ship`

Deliverable:

- a short summary of what was added
- file references for all changes
- initial deployment guidance when discoverable
- any follow-up needed to enable team mode or optional integrations

```

### commands/architect-feature.md

```
---
name: architect-feature
description: Feature-level researcher+architect pipeline — produces a contracts artifact and infers surface/stack/concern tags written back to FEAT frontmatter. Run once per FEAT before slice 1. Safe to re-run (additive). Optional --auto-start transitions to first pending slice.
auto_execute_steps: false
---

# Architect Feature

Run before the first slice to produce a feature-level contracts artifact and infer
dispatch tags. Tags are written back to the FEAT frontmatter additively — the loop
plugin propagates them to slices at creation time.

## Usage

    /crew:architect-feature FEAT-NNN
    /crew:architect-feature FEAT-NNN --auto-start

## Workflow

### Step 0 — Locate FEAT

Parse the argument to extract FEAT-ID (format: `FEAT-NNN`). Find the FEAT file in
order:
- `docs/backlog/triaged/<FEAT-ID>.md`
- `docs/backlog/in-progress/<FEAT-ID>.md`
- `docs/backlog/pending/<FEAT-ID>.md`
- `docs/backlog/done/<FEAT-ID>.md`

If not found: halt and print the four paths tried.

Read the FEAT file. Extract:
- `frontmatter.parent_spec` — path to linked spec (may be absent)
- `frontmatter.tags` — current tags array (may be absent; treat as `[]`)

Find existing slice files for this FEAT:
1. Glob `docs/ai-loop/slices/pending/*` — keep files where frontmatter `feat:` equals
   `<FEAT-ID>` OR filename contains `<FEAT-ID>`
2. Glob `docs/ai-loop/slices/completed/*` — same filter
3. Collect all matches as `SLICE_FILES` (may be empty — continue regardless)

---

### Step 1 — Research

Dispatch `crew:researcher` with:

````
FEAT: <FEAT-ID>
FEAT file: <absolute path>
Spec file: <absolute path from parent_spec, or "none — parent_spec not set">
Existing slice files: <newline-separated absolute paths, or "none found">

Read the FEAT file, any linked spec, and all existing slice files listed above.

Identify and summarise:
1. Surface types in scope — API routes, UI screens/components, schema changes, CLI output
2. Interface boundaries — what calls what, what data flows between layers
3. Behavior changes — observable outputs, side effects, events emitted
4. Data contracts — shapes passed between layers, stored, or returned to callers
5. Stack signals — language/framework indicators that imply surface:* or stack:* tags

Return findings artifact at:
  .claude/artifacts/crew/runs/<FEAT-ID>-arch-research.md

Return ONLY the artifact path on a single line.
````

Store the returned path as `RESEARCH_PATH`.

---

### Step 2 — Architecture

Dispatch `crew:architect` with:

````
FEAT: <FEAT-ID>
FEAT file: <absolute path>
Spec file: <absolute path, or "none">
Researcher findings: <RESEARCH_PATH>
Contract artifact target: .claude/artifacts/crew/designs/<FEAT-ID>-contracts.md

Read the researcher findings, FEAT file, and spec before producing anything.

Before deciding whether the contract artifact "already exists", READ it first if
present and check which schema it uses (companion-file clobber guard, SPIKE-1):

- **FEAT-level schema (this command's own)** — has a `## Inferred Tags` section
  alongside `## TypeScript Interfaces` / `## API Contracts` / `## Event Schemas` /
  `## Data Contracts`.
- **Companion schema (orchestrate-slice Step 1's)** — Decision rationale + Data
  Contracts + Revisions sections only, per
  `skills/domain/architecture/openapi-authoring/SKILL.md`, with NO `## Inferred
  Tags` section. This is orchestrate-slice's markdown companion to a FEAT's
  `<FEAT-ID>-contracts.openapi.yaml`, not a completed FEAT-level artifact.

If the file has the FEAT-level schema already: add a ## Feature Revision —
<today's date> subsection to each relevant section. Do NOT remove or overwrite
existing sections. (Use the "Feature Revision" prefix to distinguish from
orchestrate-slice's "## Revision — SLICE-NN" subsections.)

If the file is absent, OR present but only in the companion schema (no
`## Inferred Tags`): do NOT treat its presence as "already done" — a companion
file is not a substitute for the FEAT-level artifact. Preserve any existing
companion content (Decision rationale / Data Contracts / Revisions) verbatim,
and add the five FEAT-level sections around/after it (write "N/A — not
applicable." for any section that does not apply):
  ## TypeScript Interfaces
  ## API Contracts
  ## Event Schemas
  ## Data Contracts
  ## Inferred Tags

The ## Inferred Tags section MUST be a YAML list using values from
docs/standards/feat-tag-schema.md:
  tags:
    - surface:api
    - stack:typescript
    - concern:ux

Be concrete — use real type names, route paths, and field names from the researcher
findings and ACs. Avoid generic placeholders.
Return ONLY the artifact path on a single line.
````

Store the returned path as `CONTRACT_PATH`.

---

### Step 3 — Tag write-back

1. Read `CONTRACT_PATH`. Find the `## Inferred Tags` section.
2. Parse the `tags:` YAML list from that section.
   - If the section is absent AND the file otherwise matches the companion
     schema (Decision rationale + Data Contracts + Revisions, no FEAT-level
     sections at all — i.e. Step 2's merge did not run or was skipped): print
     `"Note: <CONTRACT_PATH> is orchestrate-slice's companion schema (no FEAT-level sections yet) — Step 2 should have merged in ## Inferred Tags; re-run architect-feature if it did not."`
     This is a distinct, documented case from a genuine missing-tags condition
     below — it means Step 2's merge guard was expected to add the section and
     didn't, not that no tags apply.
   - If the section is absent for any other reason (FEAT-level sections present
     but tags genuinely not inferred): print
     `"Warning: ## Inferred Tags not found in contracts artifact — FEAT frontmatter unchanged"`
     and continue to Step 4 (FEAT frontmatter unchanged). Exit 0 after Step 4.
3. Read the FEAT file frontmatter. If `tags:` key is absent, treat current value as `[]`.
4. Compute `net_new = inferred_tags - existing_tags` (set difference — additive only,
   never remove existing tags).
5. Write updated FEAT frontmatter with `tags: [<existing>, <net_new>]`.
6. Print: `Tags added to <FEAT-ID>: [<net_new list>]`
   Or: `No new tags inferred for <FEAT-ID>` when net_new is empty.

---

### Step 4 — Auto-start

**Skip when `--auto-start` flag is absent.**

Find the first pending slice for this FEAT:
1. Glob `docs/ai-loop/slices/pending/*` — return first file (alphabetical) where
   frontmatter `feat:` equals `<FEAT-ID>`
2. Fallback: glob `docs/ai-loop/slices/pending/*<FEAT-ID>*` — take first match
3. If still none: print
   `"No pending slices for <FEAT-ID> — create slices first, then re-run with --auto-start"`
   and exit 0.

Extract `SLICE_ID` from matched file's `id:` frontmatter field or its filename stem.

Run slice start ceremony:

    /loop:slice start --id <SLICE_ID>

If the command exits non-zero: halt and print the full error output. Do not proceed.

On success: invoke `/crew:orchestrate-slice --id <SLICE_ID>` from the main thread.

---

## Error handling

| Condition | Action |
|---|---|
| FEAT file not found | Halt, print four paths tried |
| No slice files found (Step 1) | Continue — researcher works from FEAT + spec alone |
| `parent_spec` absent | Continue — architect notes absence in contracts artifact |
| `## Inferred Tags` absent from contracts | Skip write-back, print warning, exit 0 |
| FEAT has no `tags:` key | Create `tags: []`, then merge |
| `loop.mjs slice start` fails | Halt, print error, do not invoke orchestrate-slice |
| No pending slice (`--auto-start`) | Print message, exit 0 |

## Idempotency

- **Contracts artifact:** architect adds `## Feature Revision — <date>` rather than overwriting.
- **Tag write-back:** additive merge — net-new tags only, never removes existing.
- **`--auto-start`:** safe re-run — only triggers if a pending slice exists.

```

### commands/audit-repo.md

```
---
name: audit-repo
description: Internal setup/debug command to inspect whether the Crew harness is already present.
auto_execute_steps: false
---

# Audit Repo For Crew

Use this workflow before adopting when you want to understand the current repo state.

Workflow:

1. Run the installer audit command:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" audit --repo "$PWD"`
2. Report whether the repo already has:
   - `CLAUDE.md`
   - `.claude/`
   - `.claude/settings.json`
   - `.claude/artifacts/crew/`
   - `.claude/state/crew/`
   - global Crew memory in `~/.claude/crew/`
3. If the harness is incomplete, recommend either:
   - `/crew:adopt` for adoption into this repo
   - `/crew:init` for a fresh repo instead

Deliverable:

- a short state report
- the recommended next step

```

### commands/brief.md

```
---
name: brief
description: Fixed-structure situational report combining workflow state (crew brief-me), backlog/specs/grades (loop brief), and install health (loop status) into one briefing.
auto_execute_steps: false
---

# Brief

This is the preferred user-facing "where are we?" command. Use it when the
user wants a fast, structured briefing before continuing work — it folds
together three prior separate reports (crew `brief-me`, loop `brief`, loop
`status`) into one.

Workflow:

1. Verify the current workspace path with `pwd`.
2. Sync remote state so the briefing reflects reality, not stale local refs:
   - `git fetch --prune`
3. Run the underlying reports:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" brief-me --repo "$PWD"` — workflow-state / artifact-trail briefing.
   - `bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" brief --repo "$PWD"` — backlog, specs, grades, decisions, pattern alerts.
   - `bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" status --repo "$PWD"` — loop install health (preset, resolved paths, marker presence, crew dependency).
4. Explicitly compare each report's `repoPath` (or equivalent) with the current working directory. If any do not match, stop and treat the briefing as invalid for this run.
5. If they match, present the briefing in this fixed order:
   - `Current Objective`
   - `Recent Activity`
   - `In Progress`
   - `Run Health` — only if the crew report's `runHealth` field is non-null. Render as a one-line summary: `Run health: <runHealth value>`.
   - `Install Health` — only if the loop `status` report shows `hasMarkerBlock: false`, `crewCli: null`, or any scaffold path missing. Otherwise omit this section entirely — a healthy install should not clutter the briefing. When shown, report `preset`, the resolved paths, and which check failed, then recommend `/devcrew:install`.
   - `Blocked / Missing`
   - `Important Reminders`
   - `Autonomous Loop` — only if the loop `brief` report's data is non-null. Render: backlog counts by state (pending, triaged, in_progress, done), top-priority triaged features (next to slice), in-flight features with linked slices, specs awaiting decomposition, last 5 grade averages + per-dimension snapshot if any are below 0.80, decision tallies (total, accepted, superseded, reverted), pattern alerts, and the last 10 telemetry events.
   - `Recent Costs (last 5)` — when cost data is available, as a Markdown table with columns `Slice | Duration | Msgs | Total (M) | I/O (M) | Cache R/W (M) | Cache hit | Dominant model`, sourced from each entry's `runTitle`, `durationMin`+"m", `messages`, `totalMillions`, `ioMillionsStr`, `cacheRWMillionsStr`, `cacheHitPct`+"%", `dominantModelStr`. Do not surface USD in the row. When a cost entry's `modelMix` array has more than one entry, render the `Dominant model` cell as a compact multi-model list (`model: msgPct% / $usd`, separated by ` · `) instead of the single `dominantModelStr`.
   - `Cost Diagnostics` — when diagnostics data is non-empty, immediately after Recent Costs, with columns `Slice | Calls | Fails | %Fail | Compact | Subag | Reread | p90 (b) | Preamble | Skills | Sessions | Flags`, sourced from each entry's `toolCalls`, `toolFailures`, `toolFailureRate`+"%", `compactionCount`, `subagentDispatches`, `fileReReadCount`, `toolResultP90`, `turnsBeforeFirstTool`, `skillInvocations`, `sessionsScanned`, `flagsStr`. Skip this table when diagnostics is empty.
   - `Model Burn (last N)` — when `modelBurn` has more than one entry, render after diagnostics with columns `Model | Slices | Messages | USD`, sourced from each entry's `model`, `slices`, `messages`, `usd`. Use it to surface "where the money went" across recent slices.
   - `Recommended Next Step`
   - `Secondary Options`
6. Keep the report concise, concrete, and evidence-backed.
7. Use the git activity, artifact trail, workflow state, and repo memory to produce one clear next-step recommendation.
8. In `Recent Activity`, include the most relevant repo-memory starting points or retrieval hints, not just git or artifact counts.

## Pattern alerts (loop brief)

Triggered by `detectPatterns()`:

| Alert | Trigger |
|---|---|
| `score-trend` | Dimension < 0.80 across last 3 slices — suggest SPEC type=sre |
| `decomposition` | Feature has ≥3 linked slices — review scope |
| `spec-flow` | Spec approved but undecomposed |
| `backlog-flow` | ≥10 features pending triage |
| `in-progress-orphan` | Feature in-progress without a linked slice |

Each alert has `severity`, `category`, `message`, `suggested_action`.

## Why one command

Previously `/crew:brief-me` (workflow state), `/runner:brief` (backlog,
specs, grades, decisions, alerts), and `/runner:status` (loop install
health) were three separate reports a session had to run in sequence to get
the full picture. `/devcrew:brief` runs all three and folds them into one
fixed-order briefing so "where are we?" is a single call. If `hasMarkerBlock`
is false or a scaffold path is missing, the `Install Health` section
recommends `/devcrew:install` instead of requiring a separate status check
first.

The point is not to dump raw JSON. The point is to give the user a calm,
situational briefing with the most relevant status and one concrete
recommendation.
</content>

```

### commands/build.md

```
---
name: build
description: Preferred short entry point for building or extending capability in the current repo.
auto_execute_steps: false
---

# Build — Dispatcher Workflow

You are the dispatcher for `/crew:build`. Detect light-path eligibility first; otherwise route via FEAT tag to the standard ladder.

## Light-path detection (run BEFORE FEAT-tag routing)

Match ALL of the following for the light path:

1. **Size**: `git diff --stat HEAD` → ≤2 files changed AND ≤50 lines added/removed
2. **No semantic markers** in the diff additions (escalates to standard ladder if matched):
   ```bash
   git diff HEAD | grep -E '^\+' | grep -vE '^\+\+\+' | \
     grep -qE '\b(async|await|Task|Promise|IQueryable|Include|use[A-Z][a-z]+)\b|\btry\s*\{|\bcatch\s*\('
   # exit 1 (no match) = light path eligible
   # Note: null-safety reads (?., ??) and replacement throws are allowed in light
   # path — dev-lite agent will catch the genuinely new exception-flow cases.
   ```
3. **No release-sensitive files**: diff does NOT touch `package.json` / `plugin.json` / `marketplace.json` / `hooks/**` / `.claude-plugin/**`
4. User did NOT pass `--full` flag

If matched → light path:

```
crew:dev-lite (mechanical 1-2 file edit, compressed diff receipt)
  ↓
crew:reviewer-lite (single review pass, auto-loads stack skill from diff extensions)
  ↓ PASS (decision: approved or approved_with_notes)
mark-badge review_passed
```

If `reviewer-lite` returns `rejected` with reason `semantic complexity detected` → fall through to the standard ladder below (re-dispatch via FEAT tag).

If not matched → standard ladder below.

## Collision pre-flight (WS-4 — run BEFORE write-run-brief / builder dispatch)

Git-native, no lock file: before this dispatcher writes its own run brief (step 7 below) or dispatches a builder, check whether another build/fix is already in progress on the branch currently checked out here. Run this check FIRST — `write-run-brief` archives the existing `currentRun` into `recentRuns` and starts a fresh one, which erases the very signal this check depends on, so the ordering matters.

```bash
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
collision_worktree=""
if [ -n "$current_branch" ]; then
  while IFS= read -r wt_path; do
    [ -z "$wt_path" ] && continue
    state_file="$wt_path/.claude/state/crew/workflow-state.json"
    [ -f "$state_file" ] || continue
    status=$(jq -r '.currentRun.status // empty' "$state_file" 2>/dev/null)
    if [ -n "$status" ] && [ "$status" != "completed" ]; then
      collision_worktree="$wt_path"
      break
    fi
  done < <(git worktree list --porcelain | awk -v b="refs/heads/$current_branch" \
      '/^worktree /{wt=$2} /^branch /{if ($2==b) print wt}')
fi
```

- Each worktree owns its own `.claude/state/crew/workflow-state.json` — there is no shared lock, so detection means reading a candidate worktree's own state file directly. This also covers the common case where the CURRENT directory is the only worktree entry on this branch and it already has an unfinished `currentRun` (status not `completed`) from an earlier, not-yet-closed build/fix.
- Fail-open: if `git`, `jq`, or the state file read fails for any reason, treat it as "no collision" and proceed normally — this is a collision *trigger*, not a hard gate.
- If `collision_worktree` is empty → no collision, proceed with the workflow below unchanged.
- If `collision_worktree` is non-empty → isolate THIS session into its own worktree before continuing:
  1. Pick (or reuse) a worktree path: `<parent-of-repo>/<repo-basename>-worktrees/<branch-name>` (same sibling convention the loop plugin's `worktree-manager` uses — keeps the two ceremonies consistent when both are installed in a repo).
  2. If that path is not already a registered worktree, create it: `git worktree add "<path>" -b "<branch-name>-<short-suffix>"` (or reuse the existing worktree/branch if `git worktree list` already shows it).
  3. Re-verify the workspace: `pwd` inside the new worktree, then re-run step 2 of the Workflow below (`crew.ts wake-up --repo "<new-worktree-path>"`) so the rest of this run's `--repo` / `$PWD` references point at the isolated worktree, not the original directory.
  4. Continue the rest of this workflow (framing, `write-run-brief`, builder dispatch, review, etc.) entirely inside the isolated worktree. Do not flip any global `worktreeMode`-style default for the repo — this isolation applies to this run only.

### Peer-dispatch isolation (distinct from the self-isolation above — dev-team#169)

The collision pre-flight above is this dispatcher session isolating **itself** into a worktree on branch collision. That is a different problem from this dispatcher **peer-dispatching a builder** into a separate tree — e.g. a background/parallel builder dispatch during a `team run` whose work should land in a worktree distinct from this dispatcher's own cwd.

When this ladder dispatches such a peer, the `Agent`-tool call MUST carry `isolation: "worktree"` — never a prompt-text instruction like "operate in `<path>`" alone. Prompt text cannot pin a subagent's cwd; only the harness's own `isolation:` parameter can. Note `isolation: "worktree"` is a bare enum: it takes no path argument and always creates a **fresh** temporary worktree for that dispatch — it cannot attach a subagent to a worktree that already exists. This ladder has no pre-existing worktree to attach to, so that's not a gap here; if a future ladder needs "attach to a specific pre-created tree," see `commands/parallel.md`'s "Attaching to a pre-created worktree" note — the mechanism is different (`EnterWorktree`, called by the dispatched subagent itself, not a dispatcher-side parameter). If the dispatch does not need a separate tree — the common case, most builder dispatches in this ladder run in the dispatcher's own cwd — omit `isolation:` entirely; do not add it defensively where it isn't needed.

## Standard ladder (FEAT-tag routing)

Builder routing: see `docs/routing-table.md` → "Builder routing matrix" (generated from `docs/routing-table.yaml` — the authoritative source; do not hand-copy the table here, edit the yaml and re-run `node scripts/render-routing-table.ts` instead). `commands/orchestrate-slice.md` "Builder routing" carries the full signal-level decision detail (`FE_ONLY`/`BE_ONLY`/`SPLIT_BUILD`/`TS_TOOLING_ONLY`) this matrix summarizes.

### Model tier resolution (REQUIRED — run before every builder Agent-tool dispatch)

**Do NOT inherit the session model for the builder dispatch.** Before invoking the `Agent` tool for the specialist builder, resolve its tier explicitly:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" resolve-model --repo "$PWD" --phase build
```

Pass the printed value (e.g. `sonnet`) as the Agent-tool dispatch's `model:` argument. **If it prints `inherit` (model routing disabled), OMIT the `model:` argument entirely** — the dispatched agent's own `model:` frontmatter (`agents/*.md`) then governs; do not substitute a model yourself. If the slice classifies as a trivial shape (`doc-update` / `config-tweak` / `test-only` / `single-module-edit`), pass `--shape <shape>` too — it overrides the phase tier. This mirrors the autonomous wave path's `resolveWaveDispatchModel`, which sets the model programmatically; here the resolution is honored by the orchestrator LLM, not enforced by a hook — see "Honest limitation" below.

**Honest limitation:** this instruction has no hard hook enforcement. The autonomous wave path (`runner-plugin`'s `model-router`) sets the dispatch model programmatically before the subagent spawns; the interactive path here relies on the dispatcher LLM (you) actually running `resolve-model` and actually passing its output as `model:`. A `PreToolUse` hook on `Agent` that injects the resolved model when `model:` is absent (S2b) would close this gap — not built in this slice.

After the builder returns PASS — parallel reviewer fan-out:

Dispatch Reviewer A and Reviewer B in a **single Agent-tool message** (two parallel invocations):

**Reviewer A — stack-specific reviewer:**
- diff contains `.cs` files → `crew:csharp-reviewer`
- diff contains `.ts` files (no `.cs`) → `crew:typescript-reviewer`
- no stack reviewer matches → **SKIP A** (no dispatch); promote B to `code-quality` lens

**Reviewer B — generalist + lens:**
Always dispatched as `crew:reviewer` with lens derived from FEAT concern tag:
- `concern:security` → `security` lens
- `concern:perf` → `performance` lens
- no concern tag or `concern:correctness` → `correctness` lens (default)
- when A is skipped → `code-quality` lens

After both (or only B when A skipped) return their review-result artifacts:
- Any `rejected` decision → stop; escalate to user with the artifact path(s) and findings
- Both `approved` or `approved_with_notes` (or only B approved when A skipped):
  ```
  node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge review_passed
  ```
- When A was skipped, `review_passed` requires only Reviewer B to approve.

**Reviewer fan-out watchdog (dev-team#199).** If one reviewer of the parallel fan-out is idle with no artifact after the other reviewer has already returned, send one `SendMessage` status-check nudge to the idle reviewer. If it is still silent after that single nudge, mark `blocked` (`mark-badge --badge blocked --note "reviewer <name> idle with no artifact after nudge"`) and proceed under the single-reviewer policy (A skipped / only B required) rather than waiting indefinitely. **Idle-ping guidance:** a `teammate_idle` notification (payload `{"type":"idle_notification"}`) from a reviewer that already delivered its artifact is noise, not a signal to act on — do not re-dispatch or nudge on it.

Run `/crew:ship` gates only on explicit user approval.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

Workflow:

1. First verify the current workspace path:
   - `pwd`
2. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"`
3. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
   For substantial work, do not start implementation until this step is complete.
   In an established same-repo session, do this quietly unless there is an actual mismatch or repo switch.
4. Follow this phase order:
   - frame
   - implement
   - review if code changed
   - validate if behavior can be exercised meaningfully
   - synthesize
5. Restate the feature goal and frame the task:
   - what the user wants
   - what is in scope
   - what is out of scope
   - what repo or external context matters
   - whether the work should stay whole or be split into bounded sub-tasks
   If this is a continuation of the same workstream, do not re-state the whole framing block unless scope materially changed.
6. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
7. If the task is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>"`
8. If using `single-session`, do the work directly and do not spawn helpers.
9. Use `assisted single-session` when a helper can reduce uncertainty or validate work without becoming a communicating team.
10. Only use a `team run` when ownership can be split cleanly.
11. If using a `team run`, claim files only when parallel work might collide, and open approvals only when scope or ownership boundaries must be crossed.
12. If using a `team run`, assign bounded work to:
   - builder for implementation — **resolve its model tier first** via "Model tier resolution" above, and pass it explicitly as the Agent-tool `model:` argument. Never let the builder dispatch silently inherit the session model.
   - reviewer for change review
   - validator for behavior checks when behavior can be exercised
   - researcher for uncertainty reduction if needed
12a. **Recall injection (FEAT-188 S3a).** Before dispatching the builder, fetch a recall block:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" recall-block --repo "$PWD" --agent <builder-agent-name> --tags "<FEAT tags csv>"`
   - If `.block` is non-empty, prepend it verbatim (it is already the `## Prior context (from astramem)` block) to the builder's dispatch instruction. If empty (memory not configured, or nothing recalled), omit — do not add any placeholder text.
12b. **Profile injection (agent-profile-load-feedback).** Immediately after the recall block, fetch the builder's track record (best-effort, empty when disabled):
   - Resolve `<runId>` from `.claude/state/crew/workflow-state.json` (`currentRun.slice`) — reuse this SAME value for the profile-feedback call in step 24a below.
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-block --repo "$PWD" --agent <builder-agent-name> --run-id <runId>`
   - If `.block` is non-empty, append it (it is already the `## Your track record (<agent>)` block) to the builder's dispatch instruction, after the recall block. If empty (profile disabled, or no track record yet), omit — do not add any placeholder text.
   - **Dispatch-memory-credit-loop (opt-in, `memory.feedback.creditLoop.enabled`).** When enabled, this block additionally carries a `## Recall (memory credit loop)` section — recall hits with `<!--atom:id-->` markers, same as the track-record atoms. Each carried id is a candidate for the builder's OPTIONAL `memories_used` report (see step 19). See `docs/contracts/dispatch-memory-credit-loop-v1.md`.
13. Keep ownership explicit and avoid same-file parallel editing.
   - Set a `size` on each dispatched task: use `size: light` for trivial tasks (one-line fixes, typo corrections, variable renames) — a light-close skips the `write-handoff` artifact but the teammate still returns the structured completion message. Use `size: standard` (default) for anything substantive — these REQUIRE a `write-handoff` artifact. Light is for noise reduction on trivial work; do not use it to skip audit trail on substantive changes.
14. Require structured acknowledgements and completion reports from every teammate or helper.
   After a subagent completes, read its full report from the artifact path it returned (via `Read` on the handoff path). Do NOT treat the inline return as the full report — agents return only path + headline by contract.
14a. If this run was driven by a design doc (from `/crew:design` or referenced by the user), pass the design doc path to both the builder and the reviewer in their handoffs so they work from the same spec — the explicit path is how specialists link work to a design. If no design doc applies, say "no design doc" explicitly so specialists know no conformance check applies.
15. If the implementation is split into code-bearing sub-tasks, make those sub-tasks independently reviewable and review them where practical before treating them as complete.
16. Substantial non-code deliverables should normally be reviewed before being treated as done.
17. For implementation work that changes code, independent review is the default. When code work is complete and waiting for review, record that gate in workflow state:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge review_required`
18. If you skip review, say so explicitly and record it in workflow state with a reason:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge review_skipped --note "<reason>"`
19. When a helper or teammate hands work back, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-handoff --repo "$PWD" --title "<short title>" --from <role> --to dispatcher --summary "<headline>" --scope "<in scope>" --deliverable "<what shipped>" --files "<changed files>" --confidence "<high|medium|low>" --risks "<risks or none>" --next "<next handoff or none>"`
   - **Optional `--memories-used <id1,id2>`**: if the teammate's report names specific memory ids it relied on (from step 12b's digest), pass them here — the CLI credits usefulness feedback for exactly those ids, best-effort. Omit entirely when the report names none; never required, never gated. See `docs/contracts/dispatch-memory-credit-loop-v1.md`.
20. When a reviewer materially reviews the change, write a review artifact immediately before you move on:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-review-result --repo "$PWD" --title "<short title>" --decision <approved|approved_with_notes|rejected> --author-id <builder-agent> --judge-id <reviewer-agent> --summary "<verdict>" --evidence "<files checked>" --files "<files in diff>" --test-summary "<test coverage>" --risks "<risks or none>" --next "<follow-up or none>"`
   - If `--summary` (or any prose flag) contains apostrophes/backticks, shell argv quoting can mangle or drop it (dev-team#152). Write the body to a temp file and pass `--summary-file <path>` (or any `--<flag>-file <path>`) instead.
21. If the changed behavior can be exercised meaningfully, define the validation scenario and run validation after review. When validation is expected, record that gate in workflow state:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge validation_expected`
22. When the scenario is substantial enough to preserve, write a validation plan:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-validation-plan --repo "$PWD" --title "<short title>" ...`
23. If you skip validation, say so explicitly and record it in workflow state with a reason:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge validation_skipped --note "<reason>"`
24. When a validator materially checks behavior, write a validation artifact immediately before you move on:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-validation-result --repo "$PWD" --title "<short title>" ...`
24a. **Auto-continue to dev ship (opt-in).** After review and validation are both resolved, check `.claude/crew/deployment.md` for a `dev.stable: true` setting. If present AND all build gates are green (review PASS or `review_skipped` with reason, validation PASS or `validation_skipped` with reason, no open `help_request`) AND the target environment is dev (not production), continue into the `/crew:ship` flow in this same session — do not return to the user at the review boundary. Production promotion still requires explicit user approval per `agents/release-engineer.md` rule 11. If `dev.stable: true` is absent or any gate is not green, stop at synthesis (step 25) as today and surface the unresolved gate.
   - **Profile feedback (agent-profile-load-feedback).** Also at this point (review and validation both resolved, one way or the other), record outcome-gated feedback for any track-record atoms injected in step 12b, best-effort — never blocks the synthesis or ship continuation:
     `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-feedback --repo "$PWD" --run-id <runId> --outcome <pass|fail>`
     Use the SAME `<runId>` from step 12b. `--outcome pass` when review is approved/approved_with_notes (or explicitly skipped with reason) AND validation passed (or explicitly skipped with reason); `--outcome fail` when review was rejected or validation failed.
25. End with a clear synthesis for the user:
   - what changed
   - what was reviewed
   - what was validated
   - risks or open questions
   - what happens next
    Use this pre-done checkpoint before you call the work complete:
    - did code change?
    - if yes, is review resolved or explicitly skipped?
    - if no, did a substantial non-code deliverable still get an appropriate review or explicit skip?
    - did behavior change?
    - if yes, is validation resolved or explicitly skipped?
    - did the run leave the artifact trail it should?
26. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --external-deltas "<off-repo changes required, or 'none'>"`
   - The CLI rejects missing `--external-deltas`. Enumerate sibling-config changes the synthesis depends on (env var renames in deploy manifests, terraform/helm updates, sibling-repo PRs, feature flags, DB migrations, IAM). Pass `--external-deltas none` explicitly if there are none. A silent default is how renamed env vars silently fall back to old defaults in prod.
   - For `--summary` prose with apostrophes/backticks, prefer `--summary-file <path>` over inlining it (dev-team#152).

```

### commands/cost-setup.md

```
---
name: cost-setup
description: Seed or migrate both cost-related config blocks in one pass — .claude/loop.json's loop.cost.* (ceiling + regression) and .claude/crew.json's features block (cost-hygiene, redundant-read-stop, shell-preflight, subagent-inline-warn). Idempotent.
auto_execute_steps: true
---

# Cost Setup

Configure both of dev-crew's cost-related config surfaces for this repo in
one pass.

## Step 1 — Loop cost config (.claude/loop.json)

Seed or migrate the cost-related config keys in `.claude/loop.json`.

### What it does

- Creates `loop.cost.ceilingUsd` and `loop.cost.regression.{multiplier,window,minSamples}` if missing.
- Migrates legacy flat keys to the nested shape and deletes the originals:
  - `loop.costSliceCeiling` → `loop.cost.ceilingUsd`
  - `loop.costRegressionMultiplier` → `loop.cost.regression.multiplier`
  - `loop.costRegressionWindow` → `loop.cost.regression.window`
  - `loop.costRegressionMinSamples` → `loop.cost.regression.minSamples`
  - `loop.costRegressionMode` → `loop.cost.regression.mode`
  - `loop.costMedianUsdPerPoint` → `loop.cost.regression.medianUsdPerPoint`
  - `loop.costProject` → `loop.cost.regression.project`
  - `loop.costProjectAliases` → `loop.cost.regression.projectAliases`
- Drops `loop.costStopThreshold` entirely. It had confusingly dual semantics
  (max plan count in auto-walker vs HIGH cost-alert tolerance in
  stop-conditions). The plan-count cap is gone; HIGH cost alerts are now
  advisory-only (mirror cost-regression).

### Defaults applied when nothing set yet

| Key | Default |
|---|---|
| `loop.cost.ceilingUsd` | `75` |
| `loop.cost.regression.multiplier` | `3.0` |
| `loop.cost.regression.window` | `5` |
| `loop.cost.regression.minSamples` | `3` |

### Usage

Run once (idempotent — safe to re-run):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD"
```

Override one or more values at the same time:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD" \
  --features "ceilingUsd=200,regressionMultiplier=2.5,regressionWindow=7"
```

Project-scope cost evaluation (multi-project workstation):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD" \
  --features "project=astrarunner,projectAliases=runner-hardening|runner-feat-202"
```

### Output

JSON with four fields:

- `configPath` — absolute path to `.claude/loop.json`
- `written` — `true` if the file changed, `false` if already current
- `migratedLegacyKeys` — `string[]` of flat keys that were rewritten + deleted
- `effective` — `{ ceilingUsd, regression: {...} }` final values

## Step 2 — Crew gating features (.claude/crew.json)

Configure the crew plugin's cost-hygiene and gating features for this repo.

This writes `.claude/crew.json` with a `features` block that mirrors the
defaults declared in the plugin's `FEATURES` registry. Features default to
**on**. To disable one, pass `--features <name>=off`.

Replaces the legacy env-var toggles (`CREW_COST_HYGIENE`,
`CREW_TOOL_PREFLIGHT`, `CREW_SUBAGENT_INLINE_THRESHOLD`). Those env vars are
gone — control is config-only now.

### Usage

1. Run the setup (idempotent — safe to re-run):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" cost-setup --repo "$PWD"
   ```

2. To override one or more feature defaults at the same time:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" cost-setup --repo "$PWD" --features "cost-hygiene=off,shell-preflight=off"
   ```

3. To inspect the current registry without writing:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" features-list
   ```

### Output

JSON with three fields:

- `configPath` — absolute path to `.claude/crew.json`
- `written` — `true` if the file was changed, `false` if already current
- `features` — `[{ name, enabled, default }]` for every registered feature

### What gets written

A `features` block in `.claude/crew.json`:

```json
{
  "features": {
    "cost-hygiene":         { "enabled": true },
    "redundant-read-stop":  { "enabled": true },
    "shell-preflight":      { "enabled": true },
    "subagent-inline-warn": { "enabled": true }
  }
}
```

User-set values for fields outside `features` are preserved.

## After running

Both steps are independent and idempotent — running one does not require
the other to have run first, but `/devcrew:cost-setup` runs both by
default. Verify hooks pick up the change immediately — open a new tool call
(Read, Edit, Bash, etc.) and check the `[features] <name>: enabled|disabled`
line on stderr. No restart needed.
</content>

```

### commands/design.md

```
---
name: design
description: Design a feature or service before build.
auto_execute_steps: false
---

# Design — Dispatcher Workflow

This is the preferred short entry point for the design phase.

Use it when the user wants to plan a feature or service before `/crew:build` starts. The output is a short, human-readable design doc artifact that the builder can implement from and the reviewer can review against.

For what counts as "substantial" below, see the canonical definition in `constitution.md`.

Workflow:

1. First verify the current workspace path:
   - `pwd`
2. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"`
3. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
4. If a recent design doc already exists under `.claude/artifacts/crew/designs/`, read it and decide whether this session is extending it or starting a fresh one.
5. Frame the design task with the user:
   - what the user wants built
   - rough scope tag: `greenfield`, `existing-feature`, or `small-change`
   - what is in and out of scope
   - who will use it and how
6. For structural change (new contract / provider / cross-module refactor), dispatch the **`crew:architect`** agent for read-only design work and ADR drafts. The architect produces an architecture sketch the design doc references; the dispatcher synthesizes both into the final design doc.
7. Design top-down, in conversation with the user:
   - start from the main thing the feature or service does
   - break it into components, then sub-components
   - describe how they work together — prefer a small visual (ASCII or mermaid block) over paragraphs of prose
   - list main technical decisions with one-line justifications
   - list edge cases the feature must handle
   - list fail modes and what happens when each fails
   - define what "working properly" means — observable signals
   - define what "done" means — a checklist the user can confirm against
   - collect any open questions that still need answers
8. Keep the detail proportional to the change:
   - `greenfield` → lighter, broader strokes, fewer decisions locked down
   - `existing-feature` → more detail on how it fits the current system
   - `small-change` → more specific, often a single component or contract
9. Take the user's perspective: give them what they need to know to trust the design, no more.

When the design is agreed, persist it:

1. Write the full design body to `.claude/artifacts/crew/designs/<short-slug>.md` using the structure described above. The slug should match the feature or service name and be filesystem-safe.
2. Record a run brief so the design surfaces in the next wake-up:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-run-brief --repo "$PWD" --title "design: <short title>" --goal "<one-paragraph summary>" --mode "assisted single-session"`
3. Reference the design doc path in any subsequent handoff instead of duplicating the design inline.

Design should be treated as a phase, not a ritual:

- the design doc is a mental model, not a spec dump — prefer clarity over completeness
- prefer visuals over code snippets
- keep the doc human readable; anyone picking up the repo later should understand the feature from this doc alone
- when the design is done, the recommended next step is usually `/crew:build`

The builder and reviewer read the design doc at the top of their run rather than expecting the handoff to duplicate it.

Design doc template (use as the structure of the persisted file):

- **Summary** — one paragraph: what and why
- **Mental Model** — plain-language description a user could read
- **Components** — top-down list (main components, then sub-components inline)
- **How It Works Together** — short prose plus a visual (ASCII / mermaid)
- **Key Technical Decisions** — each with a short justification
- **Edge Cases** — what unusual inputs or situations must be handled
- **Fail Modes** — what happens when each part breaks, and what the user sees
- **What Working Properly Means** — observable signals the feature is healthy
- **What Done Means** — a checklist a human can verify against
- **Open Questions** — what is not yet decided
- **Visuals** — ASCII diagrams, mermaid blocks, sketches

Note: `/crew:design` does NOT call `write-final-synthesis`. A pure design run terminates with the design doc + run brief. If the design is later promoted to implementation via `/crew:build` or `/crew:fix`, the synthesis gate applies there.

```

### commands/fix.md

```
---
name: fix
description: Preferred short entry point for investigating and fixing broken behavior in the current repo.
auto_execute_steps: false
---

# Fix — Dispatcher Workflow

You are the dispatcher for `/crew:fix`. Detect light-path eligibility first; otherwise route via investigator → builder → parallel reviewers.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

## Light-path detection (run BEFORE investigator dispatch)

Match ALL of the following for the light path:

1. **Size**: `git diff --stat HEAD` → ≤2 files changed AND ≤50 lines added/removed
2. **No semantic markers** in the diff additions (escalates to standard ladder if matched):
   ```bash
   git diff HEAD | grep -E '^\+' | grep -vE '^\+\+\+' | \
     grep -qE '\b(async|await|Task|Promise|IQueryable|Include|use[A-Z][a-z]+)\b|\btry\s*\{|\bcatch\s*\('
   # exit 1 (no match) = light path eligible
   ```
3. **No release-sensitive files**: diff does NOT touch `package.json` / `plugin.json` / `marketplace.json` / `hooks/**` / `.claude-plugin/**`
4. **Root cause is obvious from the diff** (typo / off-by-one / null check / wrong constant) — no upstream investigation needed
5. User did NOT pass `--full` flag

If matched → light path (no investigator, no parallel A+B fan-out):

```
crew:dev-lite (mechanical 1-2 file fix, compressed diff receipt)
  ↓
crew:reviewer-lite (single review pass, auto-loads stack skill from diff extensions)
  ↓ PASS (decision: approved or approved_with_notes)
mark-badge review_passed
mark-badge inspected
```

If `reviewer-lite` returns `rejected` (semantic complexity detected, MEDIUM+ finding requiring code change) → fall through to the standard ladder below (re-dispatch via investigator + FEAT tag).

If not matched → standard ladder below.

## Collision pre-flight (WS-4 — run BEFORE write-run-brief / builder dispatch)

Git-native, no lock file: before this dispatcher writes its own run brief (Workflow step 6 below) or dispatches investigator/builder, check whether another build/fix is already in progress on the branch currently checked out here. Run this check FIRST — `write-run-brief` archives the existing `currentRun` into `recentRuns` and starts a fresh one, which erases the very signal this check depends on, so the ordering matters.

```bash
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
collision_worktree=""
if [ -n "$current_branch" ]; then
  while IFS= read -r wt_path; do
    [ -z "$wt_path" ] && continue
    state_file="$wt_path/.claude/state/crew/workflow-state.json"
    [ -f "$state_file" ] || continue
    status=$(jq -r '.currentRun.status // empty' "$state_file" 2>/dev/null)
    if [ -n "$status" ] && [ "$status" != "completed" ]; then
      collision_worktree="$wt_path"
      break
    fi
  done < <(git worktree list --porcelain | awk -v b="refs/heads/$current_branch" \
      '/^worktree /{wt=$2} /^branch /{if ($2==b) print wt}')
fi
```

- Each worktree owns its own `.claude/state/crew/workflow-state.json` — there is no shared lock, so detection means reading a candidate worktree's own state file directly. This also covers the common case where the CURRENT directory is the only worktree entry on this branch and it already has an unfinished `currentRun` (status not `completed`) from an earlier, not-yet-closed build/fix.
- Fail-open: if `git`, `jq`, or the state file read fails for any reason, treat it as "no collision" and proceed normally — this is a collision *trigger*, not a hard gate.
- If `collision_worktree` is empty → no collision, proceed with the workflow below unchanged.
- If `collision_worktree` is non-empty → isolate THIS session into its own worktree before continuing:
  1. Pick (or reuse) a worktree path: `<parent-of-repo>/<repo-basename>-worktrees/<branch-name>` (same sibling convention the loop plugin's `worktree-manager` uses — keeps the two ceremonies consistent when both are installed in a repo).
  2. If that path is not already a registered worktree, create it: `git worktree add "<path>" -b "<branch-name>-<short-suffix>"` (or reuse the existing worktree/branch if `git worktree list` already shows it).
  3. Re-verify the workspace: `pwd` inside the new worktree, then re-run Workflow step 2 below (`crew.ts wake-up --repo "<new-worktree-path>"`) so the rest of this run's `--repo` / `$PWD` references point at the isolated worktree, not the original directory.
  4. Continue the rest of this workflow (investigator/researcher triage, `write-run-brief`, builder dispatch, review, etc.) entirely inside the isolated worktree. Do not flip any global `worktreeMode`-style default for the repo — this isolation applies to this run only.

### Peer-dispatch isolation (distinct from the self-isolation above — dev-team#169)

The collision pre-flight above is this dispatcher session isolating **itself** into a worktree on branch collision. That is a different problem from this dispatcher **peer-dispatching a builder** into a separate tree — e.g. a background/parallel builder dispatch whose work should land in a worktree distinct from this dispatcher's own cwd.

When this ladder dispatches such a peer, the `Agent`-tool call MUST carry `isolation: "worktree"` — never a prompt-text instruction like "operate in `<path>`" alone. Prompt text cannot pin a subagent's cwd; only the harness's own `isolation:` parameter can. Note `isolation: "worktree"` is a bare enum: it takes no path argument and always creates a **fresh** temporary worktree for that dispatch — it cannot attach a subagent to a worktree that already exists. This ladder has no pre-existing worktree to attach to, so that's not a gap here; if a future ladder needs "attach to a specific pre-created tree," see `commands/parallel.md`'s "Attaching to a pre-created worktree" note — the mechanism is different (`EnterWorktree`, called by the dispatched subagent itself, not a dispatcher-side parameter). If the dispatch does not need a separate tree — the common case, most builder dispatches in this ladder run in the dispatcher's own cwd — omit `isolation:` entirely; do not add it defensively where it isn't needed.

## Phase order (standard ladder)

### Triage step — pick the right investigation tool

Before dispatching anything, triage the bug report:

| Bug report state | Right dispatch |
|---|---|
| "Where is X called?" / "List every caller of Y" / "Map this module" — **location only, no causation reasoning** | `crew:investigator` (haiku, cheap, no handoff artifact, dies with turn) |
| "Why does this fail?" / "What's the root cause?" / multi-file causal reasoning / need confidence + evidence trail + reproduction path in a persistent artifact | `crew:researcher` (sonnet, scopes: normal/wide, writes findings with confidence + risks) |
| Root cause already obvious from bug report (typo, off-by-one, known regression in commit X) | **Skip both — go directly to builder** |
| Cause known, multi-site fix scope unknown | `crew:investigator` to enumerate sites, then builder |

**Common mistake:** dispatching `crew:investigator` for root cause analysis. Investigator's own prompt says: *"Refuses to suggest fixes; escalate to crew:researcher when findings must persist with confidence + risks."* The haiku model + `maxTurns: 12` + no-handoff design cannot deliver root-cause artifacts with confidence + evidence — it will die at the cap. Use researcher.

```
workspace verify + wake-up brief
   ↓
TRIAGE (table above) → investigator | researcher | skip
   ↓ optional finding artifact (researcher only — investigator output dies with turn)
specialist builder (FEAT tag → builder, same routing as /crew:build)
   ↓ PASS (builder writes handoff)
parallel fan-out — single Agent-tool message with N=2 invocations:
   Reviewer A (stack-specific)     Reviewer B (generalist + lens)
      diff has .cs → crew:csharp-reviewer   crew:reviewer with lens chosen by FEAT concern:*
      diff has .ts → crew:typescript-reviewer   concern:security → security
      no stack match → SKIP A, B uses code-quality lens   concern:perf → performance
   ↓                                         concern:correctness (default)
   └──────────────────┬───────────────────────┘
                      ↓ aggregate both decisions
   any rejected? ─── yes ─→ retry loop below
   both approved / approved_with_notes:
     mark-badge review_passed
     if Reviewer B next field names a tests-adequacy gap → dispatch crew:qa-expert
```

No verifier dispatch. Verifier defers to `/crew:ship`.

## Auto-fix retry loop (when Reviewer rejects)

Symmetric with `/crew:ship`'s auto-fix loop. When either Reviewer A or Reviewer B returns `rejected`:

1. Read both review-result artifacts for the aggregated FAIL findings.
2. Re-dispatch the same specialist builder with the findings as fix scope.
3. Increment retry counter.
4. Re-run the parallel reviewer fan-out.
5. Retry < N (default 2 from `.claude/crew/deployment.md` `fix.retry_limit`)? Loop. Else halt.

On N exhausted:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge blocked \
  --note "<aggregated FAIL summary>"
```

Escalate to user with both artifact paths + findings. Do not silently keep trying.

## Builder routing table

See `docs/routing-table.md` → "Builder routing matrix" (generated from `docs/routing-table.yaml` — the authoritative source; do not hand-copy the table here, edit the yaml and re-run `node scripts/render-routing-table.ts` instead). `commands/orchestrate-slice.md` "Builder routing" carries the full signal-level decision detail (`FE_ONLY`/`BE_ONLY`/`SPLIT_BUILD`/`TS_TOOLING_ONLY`) this matrix summarizes.

## Model tier resolution (REQUIRED — run before every builder Agent-tool dispatch)

**Do NOT inherit the session model for the builder dispatch.** Before invoking the `Agent` tool in step 7 below, resolve the builder's tier explicitly:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" resolve-model --repo "$PWD" --phase build
```

Pass the printed value (e.g. `sonnet`) as the Agent-tool dispatch's `model:` argument. **If it prints `inherit` (model routing disabled), OMIT the `model:` argument entirely** — the dispatched agent's own `model:` frontmatter (`agents/*.md`) then governs; do not substitute a model yourself. Add `--shape <shape>` when the fix classifies as a trivial shape (`doc-update` / `config-tweak` / `test-only` / `single-module-edit`) — it overrides the phase tier.

**Honest limitation:** no hard hook enforces this — unlike the autonomous wave path (`runner-plugin`'s `model-router`), which sets the dispatch model programmatically, this instruction only works if the dispatcher LLM actually runs `resolve-model` and actually passes its output as `model:`. A `PreToolUse` hook on `Agent` that injects the resolved model when absent (S2b) would close the gap — not built here.

## Workflow

1. Verify the current workspace path:
   - `pwd`
2. Read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"`
3. Confirm the returned `repoPath` matches `$PWD`. If not, stop and correct repo context before proceeding.
   For substantial work, do not start implementation until this step is complete.
4. Dispatch `crew:investigator` (read-only, no file changes):
   - Pass the bug description and any known repro path.
   - Read the returned finding artifact in full before proceeding.
5. Restate the root cause and frame the fix:
   - confirmed root cause (from investigator finding)
   - expected behavior
   - fix scope (in scope / out of scope)
   - whether the work should stay whole or be split into bounded sub-tasks
6. If the task is substantial enough that future wake-up context will matter, write a run brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "team run"`
7. Pick the specialist builder from the routing table above and dispatch via the `Agent` tool.
   - **Resolve the model tier first** via "Model tier resolution" above (`crew resolve-model --phase build`) and pass the printed value as the Agent-tool `model:` argument — do NOT inherit the session model.
   - **Recall injection (FEAT-188 S3a):** before dispatching, fetch a recall block:
     `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" recall-block --repo "$PWD" --agent <specialist-agent-name> --tags "<FEAT tags csv>"`
     If `.block` is non-empty, prepend it verbatim (it is already the `## Prior context (from astramem)` block) to the builder's dispatch instruction. If empty (memory not configured, or nothing recalled), omit — do not add any placeholder text.
   - **Profile injection (agent-profile-load-feedback):** immediately after the recall block, fetch the specialist's track record (best-effort, empty when disabled). Resolve `<runId>` from `.claude/state/crew/workflow-state.json` (`currentRun.slice`) — reuse this SAME value for the profile-feedback call in step 13a below:
     `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-block --repo "$PWD" --agent <specialist-agent-name> --run-id <runId>`
     If `.block` is non-empty, append it (it is already the `## Your track record (<agent>)` block) to the dispatch instruction, after the recall block. If empty (profile disabled, or no track record yet), omit — do not add any placeholder text.
     **Dispatch-memory-credit-loop (opt-in, `memory.feedback.creditLoop.enabled`):** when enabled, this block also carries a `## Recall (memory credit loop)` section with `<!--atom:id-->` markers — candidate ids for the specialist's OPTIONAL `memories_used` report at step 8. See `docs/contracts/dispatch-memory-credit-loop-v1.md`.
   - Set `size: standard` for substantive changes (requires `write-handoff` artifact).
   - Set `size: light` only for trivial one-line fixups (skips artifact, but builder still returns structured completion).
   - If this run references a design doc, pass the design doc path to the builder.
8. After the builder returns PASS, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-handoff --repo "$PWD" --title "<short title>" --from builder --to dispatcher --summary "<headline>" --scope "<in scope>" --deliverable "<what shipped>" --files "<changed files>" --confidence "<high|medium|low>" --risks "<risks or none>" --next "reviewer fan-out"`
   - Optional `--memories-used <id1,id2>` when the builder's report names ids it relied on — credits usefulness feedback best-effort; omit when none. See `docs/contracts/dispatch-memory-credit-loop-v1.md`.
9. Fan out two reviewers in a **single Agent-tool message** (parallel dispatch):
   - **Reviewer A** — stack-specific reviewer (see phase order diagram above for routing; skip A if no stack match).
   - **Reviewer B** — `crew:reviewer` with lens from FEAT concern tag (default: `correctness`).
   - Pass the builder handoff artifact path to both reviewers.
9a. **Reviewer fan-out watchdog (dev-team#199).** If one reviewer of the parallel fan-out is idle with no artifact after the other reviewer has already returned, send one `SendMessage` status-check nudge to the idle reviewer. If it is still silent after that single nudge, mark `blocked` (`mark-badge --badge blocked --note "reviewer <name> idle with no artifact after nudge"`) and proceed under the single-reviewer policy (step 12) rather than waiting indefinitely. **Idle-ping guidance:** a `teammate_idle` notification (payload `{"type":"idle_notification"}`) from a reviewer that already delivered its artifact is noise, not a signal to act on — do not re-dispatch or nudge on it.
10. After both reviewer artifacts land, write a review result for each:
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-review-result --repo "$PWD" --title "<short title>" --decision <approved|approved_with_notes|rejected> --author-id <builder-agent> --judge-id <reviewer-agent> --summary "<verdict>" --evidence "<files checked>" --files "<files in diff>" --test-summary "<test coverage>" --risks "<risks or none>" --next "<follow-up or none>"`
    - If `--summary` (or any prose flag) contains apostrophes/backticks, shell argv quoting can mangle or drop it (dev-team#152). Write the body to a temp file and pass `--summary-file <path>` (or any `--<flag>-file <path>`) instead.
11. If either reviewer returns `rejected`, stop. Surface the findings to the user. Do not emit `review_passed`.
    - **Profile feedback (agent-profile-load-feedback):** record the fail outcome, best-effort, using the SAME `<runId>` from step 7's profile injection:
      `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-feedback --repo "$PWD" --run-id <runId> --outcome fail`
12. If Reviewer A is skipped, `review_passed` requires only Reviewer B to approve.
13. If both approved (or `approved_with_notes`), emit the completion badge:
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge review_passed`
13a. **Profile feedback (agent-profile-load-feedback):** record the pass outcome, best-effort, using the SAME `<runId>` from step 7's profile injection:
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-feedback --repo "$PWD" --run-id <runId> --outcome pass`
14. Check Reviewer B's `next` field. If it names a tests-adequacy gap, dispatch `crew:qa-expert`:
    - Pass the finding artifact and the changed files list.
    - Wait for `crew:qa-expert` to return before closing the run.
15. End with a clear synthesis for the user:
    - confirmed root cause
    - what changed
    - what was reviewed (Reviewer A / B decisions)
    - residual risk
    - what happens next (e.g. `/crew:ship` when ready)
    Use this pre-done checkpoint before you call the fix complete:
    - did code change?
    - if yes, did both reviewers resolve (or A skipped + B approved)?
    - did the run leave the artifact trail it should?
16. For substantial work, write a final synthesis artifact:
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --external-deltas "<off-repo changes required, or 'none'>"`
    - The CLI rejects missing `--external-deltas`. Enumerate sibling-config changes the fix depends on. Pass `--external-deltas none` explicitly if there are none.
    - For `--summary` prose with apostrophes/backticks, prefer `--summary-file <path>` over inlining it (dev-team#152).

```

### commands/gepa-eval.md

```
---
name: gepa-eval
description: Run a per-agent eval suite under a fileLockManager guard. Wraps `bun run evals` so concurrent runs for the same agent cannot corrupt the trial JSONL store.
auto_execute_steps: true
allowed-tools: Bash
---

# /crew:gepa-eval

Run the eval suite for a single agent under a `fileLockManager` lock (from `@astragenie/gepa-core`). The lock prevents two concurrent runs writing the same `<agent>.jsonl` file in the trial store.

## Usage

```
/crew:gepa-eval <agent> [--live] [--judge <name>] [--validate] [--split N/M]
```

Flags:
- `<agent>` — required. Agent name (e.g. `fullstack-dev`, `reviewer`, `verifier`).
- `--live` — actually call the judge (vs. dry-run mode). Default: dry-run.
- `--judge <name>` — override the judge configured in `evals/agents/<agent>.yaml`.
- `--validate` — fire validate_with chain (cross-judge disagreement detection).
- `--split N/M` — split eval cases into train/heldOut tranches via deterministic hashing. `N` cases land in train, `M` in heldOut. See `scripts/lib/gepa/split-train-heldout.ts`.

## Behavior

1. Resolve `<agent>` to a spec file at `evals/agents/crew-<agent>.yaml`.
2. Acquire `fileLockManager.acquire(agent, "eval")` lock.
3. If lock returns `null` (another run holds it), exit code 2 with `lock_held_by_other_process`.
4. Run `bun run evals --prompt <agent>` with passed flags.
5. Release the lock on exit (success OR failure).

## Exit codes

- `0` — eval completed; result JSON written under `evals/runs/`.
- `1` — eval failed (judge error, fixture missing, etc.); lock released.
- `2` — bad args OR lock could not be acquired.

## See also

- `commands/gepa-history.md` — inspect recent trials.
- `evals/agents/crew-<agent>.yaml` — per-agent eval config.
- `scripts/lib/gepa/run-with-lock.ts` — lock-wrap implementation.
- `scripts/lib/gepa/split-train-heldout.ts` — train/heldOut splitter.

```

### commands/gepa-history.md

```
---
name: gepa-history
description: Print recent GEPA trials for an agent (from .claude/artifacts/crew/gepa/trials/<agent>.jsonl)
auto_execute_steps: true
allowed-tools: Bash
---

# /crew:gepa-history

Show recent GEPA trials for the named agent. Reads from the local fileStore JSONL log under `.claude/artifacts/crew/gepa/trials/`.

## Usage

```
/crew:gepa-history <agent> [--source eval|captured|soak] [--limit N]
```

## Behavior

The command shells to `node scripts/crew.ts gepa-history` with the given args. Output is one tabular line per trial, sorted by `created_at` desc:

```
trial_id | source | pass | score | cost_usd | latency_ms | created_at
```

Exits 0 on success, 2 on bad args, 1 on internal error.

```

### commands/gepa-invalidate.md

```
---
name: gepa-invalidate
description: Soft-delete GEPA trials for an agent. Supports filtering by ISO datetime (--since) and tag (--tag). Writes an audit row to events.jsonl with invalidated_by_pid, invalidated_at, and reason. Invalidated trials are excluded from future recall() calls but preserved on disk (soft-delete semantics).
auto_execute_steps: true
allowed-tools: Bash
---

# /crew:gepa-invalidate

Soft-delete GEPA trials for a named agent from the trial store. Useful when a batch of trials was collected under bad conditions (judge misconfiguration, eval fixture bug, etc.) and should be excluded from future optimization cycles.

## Usage

```
/crew:gepa-invalidate --agent <name> [--since <iso>] [--tag <tag>]
```

Flags:
- `--agent <name>` — required. Agent name (e.g. `fullstack-dev`).
- `--since <iso>` — only invalidate trials created at or after this ISO datetime (e.g. `2026-06-25T00:00:00Z`).
- `--tag <tag>` — only invalidate trials with this tag (fileStore: filter by tag field).

## Behavior

1. Opens the trial store at `.claude/artifacts/crew/gepa/trials/<agent>.jsonl`.
2. Calls `TrialStore.invalidate({ agent, since?, tag? })` — soft-delete semantics:
   - fileStore: rewrites the JSONL excluding matching rows.
3. Writes an audit row to `.claude/logs/events.jsonl`:
   - `event: "gepa_invalidate"`, `agent`, `since`, `tag`, `invalidated_count`, `invalidated_by_pid`, `invalidated_at`, `reason: "manual kill-switch via gepa-invalidate"`.
4. Prints `invalidated N trials for <agent> since <iso>` to stdout.

## Exit codes

- `0` — invalidation completed (count may be 0 if no rows matched).
- `1` — internal error.
- `2` — bad args (missing `--agent`).

## Example

```bash
# Invalidate all trials for fullstack-dev since June 25
node scripts/crew.ts gepa-invalidate --agent fullstack-dev --since 2026-06-25T00:00:00Z

# Invalidate all trials for fullstack-dev with tag "broken-judge"
node scripts/crew.ts gepa-invalidate --agent fullstack-dev --tag broken-judge
```

## See also

- `commands/gepa-revert.md` — revert a champion promotion.
- `commands/gepa-thaw.md` — thaw a frozen agent.
- `commands/gepa-resume.md` — clear no-winner streak or global pause.
- `scripts/lib/gepa/gepa-killswitch-cmds.ts` — implementation.

```

### commands/incident.md

```
---
name: incident
description: Preferred short entry point for responding to a live incident or recovering from a broken release in the current repo.
auto_execute_steps: false
---

# Incident — Dispatcher Workflow

You are the dispatcher for `/crew:incident`. The dispatcher routes between
researcher, investigator, specialist builder, and release-engineer
based on the incident shape — known cause vs unknown, code-level vs
release-ceremony, fix-forward vs rollback.

For what counts as "substantial" below, see the canonical definition in
`constitution.md` (`What "Substantial" Means`).

## Triage decision table

Match the incident shape against this table before any dispatch:

| Incident shape | Right dispatch |
|---|---|
| Unknown root cause, multi-file causal reasoning, needs persistent evidence trail ("Why does the dashboard return 500s after deploy?") | `crew:researcher` with `skills/workflow/release-recovery/` loaded |
| Code locations needed, no causation reasoning ("Which handlers touch the user-service table?") | `crew:investigator` (haiku locator, cheap, no handoff) |
| Root cause known, fix needed (regression in commit `<sha>`, off-by-one, null guard removed) | Specialist builder per FEAT-tag routing (same table as `/crew:build`) |
| Rollback needed (broken-tag release, post-deploy regression observed in dev / stage / prod) | `crew:release-engineer` with rollback procedure from `skills/workflow/release-recovery/` |
| Broken release ceremony (version bumped but underlying code missing, marketplace bumped but plugin tag didn't ship) | `crew:release-engineer` with release-recovery skill — covers no-ff merge / version-forward / paired-marketplace patterns |

**Important — do NOT use `crew:investigator` for root cause analysis.**
Investigator is haiku + maxTurns: 12 + no-handoff. It dies at the cap and
cannot deliver root-cause artifacts with confidence + evidence. Use
`crew:researcher` for causation.

## Phase order

```
/crew:incident
   ↓ workspace verify + wake-up brief
   ↓ collect symptom (user-supplied OR auto: tail recent logs / git log / metrics MCP)
   ↓
TRIAGE → pick branch (table above):
   • Unknown root cause           → crew:researcher (skills/workflow/release-recovery/)
                                     writes persistent finding with confidence + evidence
   • Code locations needed        → crew:investigator
                                     dies with turn, no handoff
   • Root cause known, fix needed → specialist builder (FEAT-tag routing)
                                     writes handoff
   • Rollback needed              → crew:release-engineer
                                     applies release-recovery patterns
   ↓ builder PASS or rollback PASS
   ↓ parallel reviewers (A + B same as /crew:fix)
   ↓ both approved (or A skipped + B approved)
crew:verifier (environment=staging or prod-readonly overlay)
   ↓ PASS
mark-badge incident_resolved
   ↓ if rollback executed instead of fix-forward: mark-badge rollback_executed
   ↓ optional: dispatch crew:document-writer for post-mortem
```

No fix_complete badge — the incident pipeline emits `incident_resolved`
(full pass) or `rollback_executed` (release-engineer reverted). Both
land in the `incident` gate slot.

## Auto-fix retry loop (when Reviewer rejects)

Symmetric with `/crew:fix` and `/crew:ship`. When either Reviewer A or
Reviewer B returns `rejected`:

1. Read both review-result artifacts for the aggregated FAIL findings.
2. Re-dispatch the same specialist builder (or release-engineer for rollback path) with findings as fix scope.
3. Increment retry counter.
4. Re-run the parallel reviewer fan-out.
5. Retry < N (default 2 from `.claude/crew/deployment.md` `fix.retry_limit`)? Loop. Else halt.

On N exhausted:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge incident_blocked \
  --note "<aggregated FAIL summary>"
```

Escalate to user with both artifact paths + findings.

## Builder routing table (fix-forward branch)

Same table as `/crew:build` and `/crew:fix`:

| FEAT tag                                            | Specialist          |
|-----------------------------------------------------|---------------------|
| stack:typescript + surface:ui                       | crew:frontend-dev   |
| stack:typescript + surface:backend                  | crew:backend-dev    |
| stack:typescript + surface:cross-layer              | crew:fullstack-dev  |
| stack:typescript + surface:plugin                   | crew:aiplugin-dev   |
| stack:csharp                                        | crew:backend-dev    |
| no clear tag                                        | crew:fullstack-dev  |

## Workflow

1. Verify the current workspace path:
   - `pwd`
2. Read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"`
3. Confirm the returned `repoPath` matches `$PWD`. If not, stop and correct repo context before proceeding.
4. Classify the incident against the triage table above. State the chosen branch explicitly.
5. Apply skills:
   - For release-ceremony recovery (broken tag / version mismatch / marketplace drift): load `skills/workflow/release-recovery/` before dispatch.
   - For prod incident (RCA / log reading / metric correlation / rollback decision): load `skills/workflow/incident-response/` before dispatch — covers the diagnosis triage table, log/metric/trace reading patterns, the rollback decision tree, common failure modes, and the post-mortem template.
6. Dispatch per triage branch:
   - **Unknown root cause**: `crew:researcher` with finding artifact required.
   - **Code locations needed**: `crew:investigator` (no artifact).
   - **Root cause known, fix needed**: specialist builder from routing table.
   - **Rollback needed**: `crew:release-engineer` with release-recovery skill loaded.
7. After builder / release-engineer returns PASS, write a handoff artifact if substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-handoff --repo "$PWD" --title "<short title>" --from <builder|release-engineer> --to dispatcher --summary "<headline>" --scope "<in scope>" --deliverable "<what shipped>" --files "<changed files>" --confidence "<high|medium|low>" --risks "<risks or none>" --next "reviewer fan-out"`
8. Fan out two reviewers in a **single Agent-tool message** (parallel dispatch), same routing as `/crew:fix`:
   - **Reviewer A** — stack-specific reviewer (skip if no stack match).
   - **Reviewer B** — `crew:reviewer` with lens from FEAT concern tag (default: `correctness`).
9. After both reviewer artifacts land, write a review result for each.
10. If either reviewer returns `rejected`, run the auto-fix retry loop above.
11. After both approve (or A skipped + B approved), run verifier with environment overlay:
    - `crew:verifier` with `--environment staging` or `--environment prod-readonly`.
12. If verifier PASS:
    - Fix-forward path: `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge incident_resolved`
    - Rollback path: `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge rollback_executed`
13. Optional post-mortem: dispatch `crew:document-writer` to author `.claude/artifacts/crew/incidents/<timestamp>-postmortem.md` covering timeline, contributing factors, action items.
14. End with synthesis for the user:
    - confirmed incident shape (which triage branch)
    - root cause (or "not yet determined" for in-flight)
    - what changed (fix or rollback)
    - residual risk
    - follow-ups (post-mortem, FEATs to file, monitoring to add)

## Notes

- Production promotion is NEVER unlocked by this dispatcher. Rollback path stops at staging-verify; prod rollback requires explicit user approval per deployer rules — mark `incident_blocked` and hand the decision to the user rather than guessing.
- `incident_blocked` badge: set on retry-exhaustion (auto-fix loop above) or when a rollback decision needs explicit user sign-off. Lands in the same `incident` gate slot as `incident_resolved` / `rollback_executed` — distinct from the generic `blocked` badge used elsewhere in the workflow.
- Skill content `skills/workflow/release-recovery/` is the authoritative reference for broken-tag / marketplace-drift / version-forward patterns. `skills/workflow/incident-response/` is the authoritative reference for prod-incident diagnosis, log/metric/trace reading, and rollback decision-making. The dispatcher is intentionally thin — routing only, details live in the skills.

```

### commands/init.md

```
---
name: init
description: Preferred short entry point for initializing a new repo with the workflow harness.
auto_execute_steps: false
---

# Initialize A New Crew Repo

Use this workflow when the user wants a fresh repository that starts with the harness already installed.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

Goals:

- create a clean repo shape with minimal friction
- add the repo-local harness layer from day one
- avoid migration complexity that only exists in older repos
- leave repo-owned files easy to edit and easy to understand

Workflow:

1. Determine whether the repository already exists or needs to be created.
2. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" init --repo "$PWD" --allow-existing`
3. Create the repository structure if needed.
4. Create `CLAUDE.md` with repo-owned rules and framework imports.
5. Add initial `.claude/` files that make the harness usable immediately.
6. Set up artifact directories for observability.
7. Inspect repo context that will matter later:
   - `README`
   - `.github/workflows/`
   - Docker / compose / infra files
   - obvious runtime or service entrypoints
8. If the repo already reveals useful deployment clues, write initial deployment guidance:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" discover-deployment --repo "$PWD"`
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-deployment-guidance --repo "$PWD" --title "<short title>" --discovery-status repo-derived ...`
9. If deployment is only partly clear, record the known build/deploy path and what still needs live verification instead of guessing.
10. If global Crew memory is missing or stale, recommend `/crew:install`.
11. Summarize what was created, what deployment memory was seeded, and how the user should start working.
12. End with a short welcome message:
   - congratulate the user on the excellent decision to use Crew
   - keep it brief and slightly tongue-in-cheek
   - show the main commands to start with: `/crew:brief-me`, `/crew:build`, `/crew:fix`, and `/crew:ship`

Deliverable:

- a ready-to-use repo with the Crew harness
- file references for the initial harness files
- initial deployment guidance when discoverable
- next-step guidance for starting the first task

```

### commands/install.md

```
---
name: install
description: Install or refresh dev-crew end to end — global framework memory (~/.claude/crew/*) plus the repo-level method layer (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
auto_execute_steps: false
---

# Install

Installs dev-crew in one pass: global framework memory first, then the
repo-level method layer. Both steps are idempotent — safe to re-run to
refresh either layer independently.

## Step 1 — Global framework memory

Install or update the managed global dev-crew memory files. Skip this step
only if global memory is already installed at the current plugin version
(compare `~/.claude/crew/metadata.json`).

This writes one global managed copy:

- `~/.claude/crew/constitution.md`
- `~/.claude/crew/workflow.md`
- `~/.claude/crew/metadata.json`

It also ensures global `~/.claude/CLAUDE.md` imports the constitution and workflow.

Run:

```bash
set -euo pipefail
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" install-global
```

Report which files changed, whether global memory is installed, the
installed global memory version, and whether the user should run
`/reload-plugins`.

## Step 2 — Repo-level method layer

Adds the dev-crew method to the current repo:

- Replaces or appends the `<!-- runner:start -->` marker block in `CLAUDE.md` with the three HARD RULE blocks (Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate) plus the First Action section.
- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`: `DEV_CREW_METHOD.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`. **Always overwritten** — user customization lives in `.claude/loop.json`, not in these files.
- Writes `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md` (always overwritten).
- Creates backlog scaffolds at `<backlogPath>/{approved,completed,product-backlog}.md` and `<slicesRoot>/pending/.gitkeep` — **only if missing**, never clobbered.
- Writes `.claude/loop.json` from the chosen preset — **only if missing**. This is a one-time scaffold: the preset's full content (`loop.*`, `stack.*`, `reviewers`, `mandatoryDocs`, `productName`/`productDescription`, `stackDescription`, `skills`/`fe`/`be`, `roles.*`) is inlined directly. After install, nothing at runtime reads `scripts/presets/*.json` again — `.claude/loop.json` is the sole source of truth (FEAT-218 Phase 2 / DEC-069).
- `--light` (FEAT-271): trims the reviewer ladder to a single reviewer plus CI-delegated validation — seeds `reviewers.ladder: ["A"]` and `loop.validation.satisfiedByReview: true` instead of the default two-reviewer ladder. **Only trim the ladder on a repo with a CI test gate** — see the ADOPTION.md rollout guidance for when to keep the full `["A", "B"]` ladder. Omitting `--light` is fully backward compatible: behavior is unchanged from before this flag existed. Two cases:
  - **Fresh install** (no `.claude/loop.json` yet, `--preset` required): the preset's opt-in `light` block is merged into the config before the one-time scaffold write.
  - **Already-installed repo** (this is the common fleet-retrofit case — most of the fleet installed before this flag existed): `--preset` is not needed. The installer reads the existing `.claude/loop.json` directly and rewrites *only* `reviewers` and `loop.validation` in place — every other key (including hand-edited `productName`, `stack` overrides, etc.) is left byte-stable. It sources the trimmed-ladder values from the repo's own persisted `preset` name when resolvable, falling back to the fixed values above otherwise (identical across every shipped preset). Re-running `--light` against an already-trimmed repo is a no-op.

If the repo currently has an ad-hoc HARD RULE block hand-pasted into CLAUDE.md (the pattern from legacy pre-dev-crew harness repos / MemoryService / AstraGenie.Tools), the installer migrates it: extracts the phase-gate commands into the config, deletes the ad-hoc block, writes the new marker-bracketed block in its place.

**Hard dependency:** Step 1 (global framework memory) must have already
succeeded at least once for this plugin version — the installer errors with
a clear message if it cannot find `crew`.

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
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" install --repo "$PWD" --preset dotnet-python
   ```
   `--preset` is **required** for a first-time install (no `.claude/loop.json` on disk yet) — there is no hardcoded default stack. Omit `--preset` only to re-install/refresh an already-configured repo; the installer then reads the existing `.claude/loop.json` as-is (no re-merge). Add `--light` to seed the trimmed single-reviewer ladder instead of the default two-reviewer ladder (only on a repo with a CI test gate).
4. Report which files were written and which preset is active.
5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/devcrew:phase-gate` for the first time.

## After install

- `/devcrew:brief` — show resolved config + marker presence (folds in the former `/runner:status` check)
- `/devcrew:phase-gate --phase <N>` — run the configured suite
- `/devcrew:list-presets` — see built-in presets

End with a short welcome message:

- congratulate the user on the excellent life choice of installing dev-crew
- keep it brief and slightly tongue-in-cheek
- remind them of the next useful commands: `/devcrew:init`, `/devcrew:adopt`, and `/devcrew:brief`

Do not delegate this to another command name or skill reference.
`/devcrew:install` is the primary user-facing entry point for both the
global and repo-level installs above.
</content>

```

### commands/orchestrate-slice.md

```
---
name: orchestrate-slice
description: Orchestrate the full specialist ladder for a slice — classify by FEAT tags, dispatch architect (contracts), uxdesigner (UI spec), builder, reviewer, validator, doc-writer in sequence. Every dispatch is visible in the main thread.
auto_execute_steps: false
---

# Orchestrate Slice

Run this after `/loop:slice start --id SLICE-NN`. It reads the slice file, classifies it by tags and frontmatter, then dispatches the right specialist ladder in sequence — all from the main thread, all visible.

## Workflow

### Step 0 — Read and classify slice

1. Find the slice file. Try these globs in order until a match is found:
   - `docs/ai-loop/slices/pending/*SLICE-NN*.md`
   - `docs/ai-loop/slices/completed/*SLICE-NN*.md`
   - `.claude/artifacts/loop/ai-loop/slices/**/*SLICE-NN*.md`
   - `docs/ai-loop/backlog/approved-slices.md` (inline slice entry)

2. Read the slice file. Extract:
   - `frontmatter.tags` — YAML array
   - `frontmatter.needs_contract` — bool or absent
   - `frontmatter.needs_ux` — bool or absent
   - `frontmatter.skip` — array or absent
   - Acceptance criteria section — all lines under `## Acceptance Criteria` or `## AC`
   - Linked FEAT ID (look for `feat:` or `feature:` in frontmatter, or `FEAT-NNN` in the title)

3. Classify using this priority order (explicit frontmatter wins over tag heuristics):

   **Explicit overrides (check first):**
   - `needs_contract: true` → `NEEDS_CONTRACT = true`
   - `needs_contract: false` → `NEEDS_CONTRACT = false` (suppresses all tag heuristics)
   - `needs_ux: true` → `NEEDS_UX = true`
   - `needs_ux: false` → `NEEDS_UX = false` (suppresses all tag heuristics)
   - `skip:` includes `"architect"` → force `NEEDS_CONTRACT = false`
   - `skip:` includes `"uxdesigner"` → force `NEEDS_UX = false`

   **Tag heuristics (when explicit override absent):**
   - tags include `surface:ui` AND (`surface:api` OR `surface:schema`) → `NEEDS_CONTRACT = true`, `NEEDS_UX = true`
   - tags include `surface:ui` OR `concern:ux` OR `concern:accessibility` → `NEEDS_UX = true`
   - tags include `surface:api` OR `surface:schema` → `NEEDS_CONTRACT = true`
   - tags include `stack:react` OR `stack:vue` → `NEEDS_UX = true`
   - tags include `surface:docs` only and no `surface:api`/`surface:ui` → `NEEDS_CONTRACT = false`, `NEEDS_UX = false`
   - tags include `stack:none` → `NEEDS_CONTRACT = false`, `NEEDS_UX = false`
   - tags include BOTH (`surface:ui` OR `stack:react`) AND (`surface:api` OR `surface:schema` OR `stack:csharp` OR `stack:node` OR `stack:python`) → `SPLIT_BUILD = true`
   - slice frontmatter `skip:` includes `"split-build"` → force `SPLIT_BUILD = false`
   - otherwise → `SPLIT_BUILD = false`

   **AC-text heuristics (fallback when no tags):**
   - ACs mention both "frontend" and "backend" or "API" → `NEEDS_CONTRACT = true`
   - ACs mention "UI", "screen", "page", "component", "user sees" → `NEEDS_UX = true`

   **Derive behavior/release flags:**
   - `BEHAVIOR_CHANGED = true` when: ACs mention "returns", "emits", "user sees", "command outputs", "test passes", "endpoint responds". Default: `true` (safer).
   - `RELEASE_CONTENT = true` when: tags include `surface:docs` OR ACs mention "CHANGELOG" or "release notes".
   - `DOCS_NEEDED = true` when: slice or FEAT body mentions "README", "architecture doc", "ADR", or "CHANGELOG" update required.

4. Print a one-line classification summary before any dispatch:
   ```
   Classification: SPLIT_BUILD=<true|false> NEEDS_CONTRACT=<true|false> NEEDS_UX=<true|false> BEHAVIOR_CHANGED=<true|false> RELEASE_CONTENT=<true|false> DOCS_NEEDED=<true|false>
   ```

The classification logic is also implemented in `scripts/orchestrate-slice-classify.mjs` (the source of truth for SPLIT_BUILD). When in doubt, run:
  node ./scripts/orchestrate-slice-classify.mjs <slice-path>
to see the deterministic answer.

---

### Step 1 — Architect (contract artifact)

**Skip when `NEEDS_CONTRACT = false`.**

Locate the FEAT ID from the slice frontmatter (`feat:` field or `FEAT-NNN` in the title). If none, derive from the slice ID (SLICE-NN → look up which FEAT owns this slice in the slice file body).

Check whether `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.openapi.yaml` already exists. The artifact is FEAT-scoped (shared across all slices of the FEAT) — loop's `/loop:backlog-enrich` pass 2 and `/loop:slice-from-feature` on-demand trigger pre-populate it when missing.

**Decision tree:**

1. **Artifact exists AND slice does NOT require a revision** → SKIP architect dispatch entirely. Set `CONTRACT_YAML_PATH = .claude/artifacts/crew/designs/<FEAT-ID>-contracts.openapi.yaml` from the existing file (derive `CONTRACT_MD_PATH` and `CONTRACT_TS_PATH` by replacing `.openapi.yaml` with `.md` / `-contracts.ts`) and continue to Step 2. Print:
   ```
   Step 1: contracts artifact already present at <CONTRACT_YAML_PATH>; skipping architect dispatch (no revision needed).
   ```

2. **Artifact exists AND slice DOES require a revision** → instruct architect to read it and append a `## Revision — SLICE-NN` subsection. Use the dispatch prompt below with the existence-known branch.

3. **Artifact does NOT exist** → instruct architect to create it from scratch. Use the dispatch prompt below with the creation branch.

**Companion-file clobber guard (SPIKE-1).** `<FEAT-ID>-contracts.md` has two possible producers with two different section schemas, and this step must never blind-overwrite the other producer's schema:

- `crew:architect-feature` Step 2 writes the FEAT-level schema: five sections `## TypeScript Interfaces` / `## API Contracts` / `## Event Schemas` / `## Data Contracts` / `## Inferred Tags`.
- This step (orchestrate-slice Step 1) writes the companion-to-YAML schema per `skills/domain/architecture/openapi-authoring/SKILL.md`: Decision rationale + Data Contracts + Revisions sections only — no wire-type duplication.

Before the architect touches `CONTRACT_MD_PATH` (whether the YAML exists or not), it MUST read the existing `.md` file first if one is present. If it contains a `## Inferred Tags` section, that is the signature of architect-feature's FEAT-level schema — preserve all five of its sections verbatim and APPEND a `## Revision — SLICE-NN` subsection below them rather than replacing the file. If no `## Inferred Tags` section is present (companion schema already, or file absent), proceed with the companion schema as normal. This instruction is embedded in the dispatch prompt below so the architect enforces it, not just this command doc.

**Revision-required heuristic.** A slice requires a contract revision when ANY of the following holds:

- Slice frontmatter has `revises_contract: true` (explicit, highest precedence)
- Slice AC text contains any of: `"new endpoint"`, `"new event"`, `"new schema"`, `"breaking change"`, `"new type"`, `"new interface"`, `"new field"`, `"rename field"`, `"remove field"` (case-insensitive)
- Slice introduces a new public surface called out in its `## In scope` bullets (look for terms like `"public API"`, `"export"`, `"interface"`, `"schema"`)

When in doubt, default to revision — a redundant `## Revision — SLICE-NN` block is cheap; a missing one drifts the contract.

Dispatch `crew:architect` with this prompt (fill in `<...>` placeholders from slice data):

```
Slice: <SLICE-NN title>
Slice file: <absolute path>
FEAT ID: <FEAT-ID or "unknown">
FEAT tags: <tags array as comma-separated string>
Acceptance criteria:
<paste the full AC section text>

Contract artifact target (canonical YAML): .claude/artifacts/crew/designs/<FEAT-ID>-contracts.openapi.yaml
Contract markdown companion:               .claude/artifacts/crew/designs/<FEAT-ID>-contracts.md
Derived TS (regenerated, committed):       .claude/artifacts/crew/designs/<FEAT-ID>-contracts.ts

If the YAML already exists: read it, then add the new operations / schemas for this slice. Bump `info.version` (semver) if any public operation changes.
If the YAML does not exist: create it from scratch following `skills/domain/architecture/openapi-authoring/SKILL.md`.

Before writing the markdown companion (`CONTRACT_MD_PATH`): READ it first if it already exists on disk. If it contains a `## Inferred Tags` section, it was authored by architect-feature's FEAT-level schema (`## TypeScript Interfaces` / `## API Contracts` / `## Event Schemas` / `## Data Contracts` / `## Inferred Tags`) — do NOT overwrite it. Preserve all five sections verbatim and APPEND a `## Revision — SLICE-NN` subsection below them. Otherwise (no `## Inferred Tags` — companion schema already in place, or file absent), write/extend it using only the companion schema: Decision rationale + Data Contracts + Revisions, per `skills/domain/architecture/openapi-authoring/SKILL.md` — no wire-type duplication.

After writing/revising the YAML, regenerate the TS:
  node ./scripts/validate-contracts.ts <yaml> --write

Then run the validator without --write to confirm clean:
  node ./scripts/validate-contracts.ts <yaml>
  (must exit 0; redocly lint + drift check must pass)

Return ONLY the YAML path on a single line.
```

Store the returned path as `CONTRACT_YAML_PATH`. Derive `CONTRACT_MD_PATH` and `CONTRACT_TS_PATH` from it (replace `.openapi.yaml` with `.md` / `-contracts.ts`).

---

### Step 2.5 — Resolve builder skills (optional, when loop plugin is installed)

If the `loop` plugin is installed at >= v0.27.0, resolve the builder skill
loadout from the repo preset BEFORE dispatching builder(s). The resolved
`## Required skills (resolved)` Markdown block is prepended to each builder
dispatch prompt so the builder invokes the right `Skill` tools as Step 0
before any code work. Falls back silently when loop is absent or returns no
match — builder uses its own baked-in routing table.

Locate the loop plugin root:

```bash
LOOP_ROOT="${LOOP_PLUGIN_ROOT:-$(find "${HOME}/.claude/plugins/cache/loop/loop" -maxdepth 1 -type d 2>/dev/null | sort -V | tail -1)}"
PRESET_NAME=$(grep -oP '"preset"\s*:\s*"\K[^"]+' .claude/loop.json 2>/dev/null)
```

If `LOOP_ROOT` is empty or `PRESET_NAME` is empty, SKIP this step — no
resolved block; proceed to Step 3 with the existing prompt shape.

Otherwise run, **per variant**:

```bash
# SPLIT_BUILD = true
FE_BLOCK=$(node "${LOOP_ROOT}/scripts/loop.mjs" resolve-skills \
  --variant fe \
  --preset "${LOOP_ROOT}/scripts/presets/${PRESET_NAME}.json" \
  --override .claude/loop.json 2>/dev/null | jq -r '.dispatchInstructionBlock // empty')

BE_BLOCK=$(node "${LOOP_ROOT}/scripts/loop.mjs" resolve-skills \
  --variant be \
  --preset "${LOOP_ROOT}/scripts/presets/${PRESET_NAME}.json" \
  --override .claude/loop.json 2>/dev/null | jq -r '.dispatchInstructionBlock // empty')

# SPLIT_BUILD = false
SINGLE_BLOCK=$(node "${LOOP_ROOT}/scripts/loop.mjs" resolve-skills \
  --variant single \
  --preset "${LOOP_ROOT}/scripts/presets/${PRESET_NAME}.json" \
  --override .claude/loop.json 2>/dev/null | jq -r '.dispatchInstructionBlock // empty')
```

Each block is empty string when:
- CLI exits 2 (split mismatch, empty skills, or no match)
- jq cannot find `.dispatchInstructionBlock`

Treat empty as "no block — proceed without it". The builder dispatch prompts
in Step 3 / 3a / 3b prepend the block when non-empty, omit it otherwise.

---

### Step 2.6 — Resolve builder model tier (REQUIRED — run before every builder dispatch below)

**Do NOT let Step 3 / 3a / 3b's Agent-tool dispatch inherit the session model.** Resolve the tier explicitly, once per orchestrate-slice run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" resolve-model --repo "$PWD" --phase build
```

Store the printed value (e.g. `sonnet`) as `BUILD_MODEL`. **If it prints `inherit` (model routing disabled), OMIT the `model:` argument on every builder dispatch** — each agent's own `model:` frontmatter (`agents/*.md`) then governs; do not substitute a model yourself. Otherwise pass `BUILD_MODEL` as the `model:` argument on every builder Agent-tool call in Steps 3 / 3a / 3b below (`crew:fullstack-dev`, `crew:frontend-dev`, `crew:backend-dev` — uxdesigner is not a builder and is unaffected). If a shape classifier is available for this slice (mechanical doc-only / config-only / test-only / single-module edit), pass `--shape <shape>` too — it overrides the phase tier and takes priority over `BUILD_MODEL`.

**Honest limitation:** this is an orchestrator-honored instruction, not a hook-enforced one. The autonomous wave path (`runner-plugin`'s `model-router`, `resolveWaveDispatchModel`) sets the dispatch model programmatically before the subagent spawns — there is no equivalent hard gate here. A `PreToolUse` hook on `Agent` that injects the resolved model when `model:` is absent (tracked as a possible S2b follow-up) would close this gap; it is intentionally out of scope for this instruction wiring.

### Step 2.7 — Recall injection (FEAT-188 S3a)

Fetch a recall block per builder variant BEFORE dispatching (same CLI surface
`commands/build.md` / `commands/fix.md` / `commands/ship.md` use):

```bash
# SPLIT_BUILD = true
FE_RECALL_BLOCK=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" recall-block \
  --repo "$PWD" --agent crew:frontend-dev --tags "<FEAT tags csv>" 2>/dev/null | jq -r '.block // empty')

BE_RECALL_BLOCK=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" recall-block \
  --repo "$PWD" --agent crew:backend-dev --tags "<FEAT tags csv>" 2>/dev/null | jq -r '.block // empty')

# SPLIT_BUILD = false
SINGLE_RECALL_BLOCK=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" recall-block \
  --repo "$PWD" --agent <resolved single-variant builder agent> --tags "<FEAT tags csv>" 2>/dev/null | jq -r '.block // empty')
```

Each block is `""` when memory is not configured (`provider:none` or
`recall.enabled:false`), nothing matched, or the CLI call fails — the CLI's
own best-effort guard (`scripts/lib/memory/inject-recall.ts`) never throws.
Treat empty as "no block — proceed without it". The builder dispatch prompts
in Step 3 / 3a / 3b prepend the block (already the shared
`## Prior context (from astramem)` format) when non-empty, after the Step
2.5 skills block, omit otherwise.

---

### Step 2.7a — Profile injection (agent-profile-load-feedback)

Immediately after the Step 2.7 recall blocks, fetch each builder variant's track record
(best-effort, empty when disabled), passing the current slice id as the run-id so the
later profile-feedback call (Conflict-rule section, Step 4 & 5) can attribute atoms back
to this run:

```bash
# SPLIT_BUILD = true
FE_PROFILE_BLOCK=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-block \
  --repo "$PWD" --agent crew:frontend-dev --run-id "<SLICE-NN>" 2>/dev/null | jq -r '.block // empty')

BE_PROFILE_BLOCK=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-block \
  --repo "$PWD" --agent crew:backend-dev --run-id "<SLICE-NN>" 2>/dev/null | jq -r '.block // empty')

# SPLIT_BUILD = false
SINGLE_PROFILE_BLOCK=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-block \
  --repo "$PWD" --agent <resolved single-variant builder agent> --run-id "<SLICE-NN>" 2>/dev/null | jq -r '.block // empty')
```

Each block is `""` when `memory.profile.enabled` is not `true`, the configured provider
has no `profile()` method (today's shipped `fileProvider` — see the CLI's own fail-silent
guard in `scripts/lib/memory/inject-profile.ts`), nothing matched, or the CLI call fails.
Treat empty as "no block — proceed without it". The builder dispatch prompts in Step 3 /
3a / 3b append the block (already the `## Your track record (<agent>)` format) after the
Step 2.7 recall block, when non-empty, omit otherwise.

**Dispatch-memory-credit-loop (opt-in, `memory.feedback.creditLoop.enabled`):** when
enabled, `profile-block`'s returned block additionally carries a `## Recall (memory
credit loop)` section — recall hits with `<!--atom:id-->` markers, k≤5. Each id is a
candidate for the specialist's OPTIONAL `memories_used` report; when a `write-handoff`
call in a later step names ids the specialist relied on, pass
`--memories-used <id1,id2>` to credit them. Never required, never gated. See
`docs/contracts/dispatch-memory-credit-loop-v1.md`.

---

### Steps 2 + 3 — UX designer + Builder (parallel when both fire)

`crew:uxdesigner` and `crew:fullstack-dev` both consume the FEAT-scoped contracts artifact (Step 1's `CONTRACT_YAML_PATH` + `CONTRACT_MD_PATH`) but NOT each other's output. Builder works from contracts + slice ACs; uxdesigner produces UX spec for reviewer to check separately. Both fire concurrently.

**Dispatch rules:**

**Builder routing (FEAT-170 SLICE-C — single-stack specialization):**

The classifier now exposes `FE_ONLY` and `BE_ONLY` alongside `SPLIT_BUILD`. Single-stack slices route to specialist builders; `crew:fullstack-dev` reserved for legitimately cross-cutting or untagged slices. This is the authoritative signal-level implementation of the policy summarized in `docs/routing-table.md`'s "Builder routing matrix" (generated from `docs/routing-table.yaml`) — keep both in sync when adding a new signal here.

| Signals | Builder dispatch |
|---|---|
| `SPLIT_BUILD = false` AND `NEEDS_UX = false` AND `BEHAVIOR_CHANGED = false` | No implementation. Skip Steps 2 + 3, jump to Step 4. |
| `SPLIT_BUILD = false` AND only `NEEDS_UX = true` | `crew:uxdesigner` only. |
| `BE_ONLY = true` AND `BEHAVIOR_CHANGED = true` | `crew:backend-dev` only (no UX needed). |
| `FE_ONLY = true` AND `BEHAVIOR_CHANGED = true` AND `NEEDS_UX = false` | `crew:frontend-dev` only. |
| `FE_ONLY = true` AND `NEEDS_UX = true` | `crew:uxdesigner` + `crew:frontend-dev` in single parallel message. |
| Untagged (`FE_ONLY = false` AND `BE_ONLY = false` AND `SPLIT_BUILD = false`) AND `TS_TOOLING_ONLY = true` AND `BEHAVIOR_CHANGED = true` | `crew:backend-dev` only (pure-TS tooling default — all changed files are `.ts`/`scripts/`/`tests/`/`evals/`, none are `.tsx`/`.css`/`src/components/`). |
| Untagged AND `TS_TOOLING_ONLY = false` AND `BEHAVIOR_CHANGED = true` | `crew:fullstack-dev` only (generalist path — agent/skill/script/hook/doc edits without surface tags). |
| Untagged AND BOTH `NEEDS_UX` + `BEHAVIOR_CHANGED` true | `crew:uxdesigner` + `crew:fullstack-dev` in single parallel message. |
| `SPLIT_BUILD = true` | Single parallel message with THREE Agent calls: `crew:uxdesigner` + `crew:frontend-dev` + `crew:backend-dev`. All consume the same FEAT-scoped OpenAPI YAML. Handoffs scoped by role: `builder-fe-<SLICE>.md` and `builder-be-<SLICE>.md`. |

Rationale: `fullstack-dev` previously ate every untagged slice + every single-stack slice — generalist agent paid the cost of every dispatch including ones a specialist handles better. SLICE-C routes specialists when the FEAT declares `surface:api / surface:schema / stack:csharp / stack:node / stack:python` (→ backend-dev) or `surface:ui / stack:react` (→ frontend-dev). For untagged slices, `classifyChangedFiles()` detects pure-TS-tooling work (scripts/tests/evals) and routes to backend-dev. fullstack-dev keeps the legitimate use case: untagged slices with agent/skill/hook/doc edits plus explicit cross-layer slices that skip SPLIT_BUILD.

Race-safety: each parallel agent writes its own artifact at a deterministic path. No shared mutable state. UX spec stays slice-scoped. OpenAPI YAML is read-only for both builders (drift → help_request).

#### Step 2 prompt — `crew:uxdesigner`

```
Slice: <SLICE-NN title>
Slice file: <absolute path>
FEAT tags: <tags array>
OpenAPI YAML: <CONTRACT_YAML_PATH or "none — no contract artifact for this slice">
Contract markdown: <CONTRACT_MD_PATH or "none — no contract artifact for this slice">
Acceptance criteria:
<paste the full AC section text>

UX spec target: .claude/artifacts/crew/designs/<FEAT-ID>-ux-<SLICE-NN>.md

Read the contract artifact (if provided) before designing. Your spec must be consistent with the interfaces and API shapes it defines.

Produce:
- Interaction flows (what the user does step by step)
- Component hierarchy (which components render on each screen/state)
- State transitions (loading / empty / error / success states for each component)
- Copy and labels for all user-visible text
- Accessibility requirements (keyboard nav, ARIA roles, color contrast notes)
- `## API touchpoints` section listing every user action that triggers a network call, with matching operationId from the OpenAPI YAML. Example:
    - "User clicks Save" → operationId `createThing`
    - "List page loads" → operationId `listThings`
- A YAML frontmatter block at the top of the file with `slice:`, `feat:`, and `contracts:` fields (where `contracts:` points to the FEAT YAML path).

After writing the spec, run:
  node ./scripts/validate-ux-spec.ts <ux-spec-path>
(must exit 0; every operationId referenced must exist in the FEAT YAML.)

Return ONLY the artifact path on a single line.
```

Store the returned path as `UX_SPEC_PATH`.

#### Step 3 prompt — `crew:fullstack-dev`

Prepend `${SINGLE_BLOCK}` from Step 2.5 when non-empty, then `${SINGLE_RECALL_BLOCK}` from Step 2.6 when non-empty, then `${SINGLE_PROFILE_BLOCK}` from Step 2.7a when non-empty. Omit any when empty.

**Agent-tool dispatch: pass `model: ${BUILD_MODEL}`** (from Step 2.6) explicitly — do not inherit the session model.

```
<SINGLE_BLOCK from Step 2.5 — omit when empty>

<SINGLE_RECALL_BLOCK from Step 2.6 — omit when empty>

<SINGLE_PROFILE_BLOCK from Step 2.7a — omit when empty>

Slice: <SLICE-NN title>
Slice file: <absolute path>
OpenAPI YAML: <CONTRACT_YAML_PATH or "none">
Contract markdown: <CONTRACT_MD_PATH or "none">

Read the contract artifact before writing any code. Your implementation must conform to it. If you find a gap, surface it in your handoff as a help_request — do not invent a resolution.

A UX spec is being authored concurrently by crew:uxdesigner if the slice needs UI. You do NOT block on it — work from contracts + slice ACs only. Reviewer will check UX-spec conformance separately in Step 4.

Implement all acceptance criteria in the slice file. Follow TDD: write failing tests first, then implementation. Return the handoff artifact path.
```

Store the returned path as `BUILDER_HANDOFF_PATH`.

When both branches fire, the orchestrator collects `UX_SPEC_PATH` AND `BUILDER_HANDOFF_PATH` before proceeding to Step 4.

#### Step 3 (SPLIT_BUILD=true) prompts

##### Step 3a — `crew:frontend-dev`

Prepend `${FE_BLOCK}` from Step 2.5 when non-empty, then `${FE_RECALL_BLOCK}` from Step 2.6 when non-empty, then `${FE_PROFILE_BLOCK}` from Step 2.7a when non-empty. Omit any when empty.

**Agent-tool dispatch: pass `model: ${BUILD_MODEL}`** (from Step 2.6) explicitly — do not inherit the session model.

```
<FE_BLOCK from Step 2.5 — omit when empty>

<FE_RECALL_BLOCK from Step 2.6 — omit when empty>

<FE_PROFILE_BLOCK from Step 2.7a — omit when empty>

Slice: <SLICE-NN title>
Slice file: <absolute path>
OpenAPI YAML: <CONTRACT_YAML_PATH>
Contract markdown: <CONTRACT_MD_PATH>
UX spec: <UX_SPEC_PATH or "none">

Read the OpenAPI YAML before writing any FE code. Your implementation must conform to it. Regenerate orval clients and openapi-msw handlers as your FIRST step (see skills/domain/contract-codegen/ FE recipes).

If you find a gap in the YAML, surface it as help_request — do not invent.

A BE builder is working concurrently on the BE side; do NOT block on it — work from contracts + UX spec only. Integrator will exercise the real wire later.

Implement all acceptance criteria related to FE. Follow TDD: write failing component tests first.

Return the handoff artifact path.
```

Store the returned path as `BUILDER_FE_HANDOFF_PATH`.

##### Step 3b — `crew:backend-dev`

Prepend `${BE_BLOCK}` from Step 2.5 when non-empty, then `${BE_RECALL_BLOCK}` from Step 2.6 when non-empty, then `${BE_PROFILE_BLOCK}` from Step 2.7a when non-empty. Omit any when empty.

**Agent-tool dispatch: pass `model: ${BUILD_MODEL}`** (from Step 2.6) explicitly — do not inherit the session model.

```
<BE_BLOCK from Step 2.5 — omit when empty>

<BE_RECALL_BLOCK from Step 2.6 — omit when empty>

<BE_PROFILE_BLOCK from Step 2.7a — omit when empty>

Slice: <SLICE-NN title>
Slice file: <absolute path>
OpenAPI YAML: <CONTRACT_YAML_PATH>
Contract markdown: <CONTRACT_MD_PATH>
Stack: <derived from FEAT stack:* tag>

Read the OpenAPI YAML before writing any BE code. Your implementation must conform to it. Regenerate native types/stubs as your FIRST step (see skills/domain/contract-codegen/ BE recipes for your stack).

If you find a gap in the YAML, surface it as help_request — do not invent.

A FE builder is working concurrently on the FE side; do NOT block on it — work from contracts only. Integrator will exercise the real wire later.

Implement all acceptance criteria related to BE + DB. Follow TDD: write failing tests first.

Return the handoff artifact path.
```

Store the returned path as `BUILDER_BE_HANDOFF_PATH`.

---

### Step 3.5 — Integrator (SPLIT_BUILD only)

**Skip when `SPLIT_BUILD = false`.**
**Skip when slice frontmatter `skip:` includes `"integrator"`.**

Pre-condition: both `BUILDER_FE_HANDOFF_PATH` and `BUILDER_BE_HANDOFF_PATH` must be set AND each handoff body's `## Self-Verify Gates` section must show PASS for all gates. If either side reports any FAIL: STOP. Print the failing handoff path; tell the user to run `/crew:fix` before re-running orchestrate-slice.

When both PASS, identify the happy-path AC from the slice's Acceptance Criteria — pick the first AC tagged `happy` or, if no explicit tag, the first AC that mentions a status code (e.g. "201", "200") or "shows" / "returns" / "creates".

Dispatch `crew:integrator` with this prompt:

```
Slice: <SLICE-NN title>
Slice file: <absolute path>
OpenAPI YAML: <CONTRACT_YAML_PATH>
Contract markdown: <CONTRACT_MD_PATH>
Builder-fe handoff: <BUILDER_FE_HANDOFF_PATH>
Builder-be handoff: <BUILDER_BE_HANDOFF_PATH>
happy_path_ac: <verbatim AC text>

Run the integration-smoke procedure (see skills/workflow/integration-smoke/). Validate every response against the OpenAPI schema at runtime. Write the artifact at .claude/artifacts/crew/integrations/<SLICE-NN>-integration.md.

Return the artifact path on a single line.
```

Store the returned path as `INTEGRATION_PATH`.

If the artifact's `Outcome:` line reads `FAIL`: STOP. Print the artifact path; tell the user to run `/crew:fix --target integration` before re-running orchestrate-slice.

If `Outcome: SKIP`: continue to Step 4. Reviewer marks Integration Conformance as `N/A — <SKIP reason>`.

If `Outcome: PASS`: continue to Step 4.

---

### Step 4.5 — Concurrent gate dispatch and tier classification

After builder PASS, determine slice tier and dispatch reviewer and validator.

**Compute `SHORT_SLICE`:**

A slice is short when EITHER gate passes (lower-bar wins):
- AC count ≤ 6 (count `[ ]` lines in the slice file's Acceptance Criteria section), OR
- Builder handoff changed-files count ≤ 10 (count the files listed under `## Changed files`
  or equivalent in `BUILDER_HANDOFF_PATH`).

Cross-plugin slices are always treated as long regardless of the counts above.

```
SHORT_SLICE = (acCount ≤ 6  OR  changedFilesCount ≤ 10)  AND  NOT cross_plugin
```

`isShortSlice()` in `scripts/orchestrate-slice-classify.ts` implements this logic and can
be called directly:

```bash
node -e "
  import('./scripts/orchestrate-slice-classify.ts').then(m =>
    console.log(m.isShortSlice({ acCount: <N>, changedFilesCount: <M> }))
  );
"
```

**Classify tier (telemetry only — does not change gate dispatch; see `RISK_GATE` below):**

- `tier: full` — long slices, cross-plugin, >10 changed files AND ≥7 ACs.
- `tier: light` — short slices with `SHORT_SLICE = true` AND `BEHAVIOR_CHANGED = true`.

Tier is recorded in the slice-progress tracking via `write-run-brief --tier <light|full>` (invoked by loop's internal machinery; may be logged for reference).

**Compute `RISK_GATE`** (FEAT-202 / SLICE-112 — lean review gate). Post-builder gate composition is governed by risk, not tier. `RISK_GATE = true` when ANY of:

- slice frontmatter `risk: high` (case-insensitive), OR
- FEAT tags include `concern:security` OR `concern:performance`, OR
- `SPLIT_BUILD = true` (from Step 0 classification)

`RISK_GATE = false` otherwise — the LOW/MEDIUM-risk common case.

Print the outcome before proceeding:

```
SHORT_SLICE=<true|false>  TIER=<light|full>  RISK_GATE=<true|false>
```

---

### Step 4 & 5 — Reviewer and Validator (risk-gated)

After builder PASS, dispatch the post-builder gate. Composition is governed by `RISK_GATE` (Step 4.5), not tier.

#### Dispatch selection

**`RISK_GATE = false` (LOW/MEDIUM risk — the default):** dispatch exactly **one** `crew:reviewer` (Step 4 prompt below). Do **not** dispatch a dedicated `crew:verifier`. Validation for the close-time gate is delegated to the reviewer's evidenced approval artifact plus the CI full-suite gate (`.github/workflows/test.yml`), which runs the whole-repo suite independently of this dispatch — see `.claude/loop.json` `loop.validation.satisfiedByReview: true` and `skills/workflow/validator-gate/SKILL.md`. (The `pre-push-verifier` hook only checks for a PASS artifact behind a default-off flag; CI is the actual full-suite runner.)

**`RISK_GATE = true` (HIGH risk, OR FEAT tags `concern:security` / `concern:performance`, OR `SPLIT_BUILD = true`):** dispatch the heavy path in one parallel message — a 2nd reviewer per `skills/workflow/fan-out-review/SKILL.md` AND/OR a dedicated `crew:verifier` (Step 5 prompt below). This is the explicit override condition for this gate; do not apply the heavy path outside these three signals. **Single-message contract (FEAT-203 / SLICE-113):** every reviewer (1st + 2nd, or up to 4 on the security+performance scale-up) AND the dedicated `crew:verifier` MUST be emitted in that ONE parallel Agent-tool message — no message between dispatches, no wait-for-one-before-dispatching-the-next.

**Stack-lens 2nd reviewer (FEAT-203 / SLICE-113).** When picking the 2nd reviewer for the heavy path, apply `skills/workflow/fan-out-review/SKILL.md`'s stack-lens rule instead of a second generic `crew:reviewer`: diff whose changed files are ≥60% `.cs` → `crew:csharp-reviewer`; ≥60% `.ts`/`.tsx` → `crew:typescript-reviewer`; otherwise fall back to generic `crew:reviewer`. The 1st reviewer is always `crew:reviewer` (correctness/regression lens); only the 2nd lens's identity changes.

**Parallel-dispatch telemetry (FEAT-203 / SLICE-113).** `.claude/loop.json` sets `reviewers.strictParallel: true` and `reviewers.serialTimingThresholdMs: 90000`. If the reviewer artifacts for this slice land more than `serialTimingThresholdMs` apart (timestamps parsed from the `.claude/artifacts/crew/reviews/` filenames), runner-plugin's `complete-slice` ceremony (`recordSerialReviewerWarning` in `slice-linker/complete-slice.mts`, reading `config.reviewers.serialTimingThresholdMs`) stamps a `serial-reviewer-warning` badge on slice close and appends a grade observation — silent serialization of this single-message contract is flagged automatically, not just documented as an intent. `reviewers.strictParallel` is declared in the shared preset schema (`preset-schema.mts`) as a forward-compat flag but has no runtime consumer branching on it yet in the installed runner-plugin version — it does not currently change dispatch or gating behavior; only `serialTimingThresholdMs` is live today.

(Historically both tiers always dispatched `crew:reviewer` + `crew:verifier` concurrently regardless of risk. FEAT-202 / SLICE-112 replaced that with the `RISK_GATE` switch above, ported from runner-plugin's lean post-builder-fanout model, which runs `reviewers.ladder: ["A"]` by default in production and delegates validation to `deriveValidationGate`'s `satisfiedByReview` path.)

#### Step 4 prompt — `crew:reviewer` (both tiers; parallel)

Dispatch with this prompt:

```
Slice: <SLICE-NN title>
Slice file: <absolute path>
Review lens: <correctness/regression | security | performance | tests-adequacy — omit for single-lens mode>
OpenAPI YAML: <CONTRACT_YAML_PATH or "none">
UX spec: <UX_SPEC_PATH or "none">
Integration artifact: <INTEGRATION_PATH or "none">

When SPLIT_BUILD=true:
  Builder-fe handoff: <BUILDER_FE_HANDOFF_PATH>
  Builder-be handoff: <BUILDER_BE_HANDOFF_PATH>
When SPLIT_BUILD=false:
  Builder handoff: <BUILDER_HANDOFF_PATH>

Review the implementation diff(s) for correctness, test coverage, regressions, and contract/UX/integration conformance per the rules in your agent prompt. Re-run the builder's affected-class test set (named in the handoff's `## Deferred to validator` line) to confirm it is green and covers the changed classes; the full suite runs at the CI gate (`.github/workflows/test.yml`) (or, when `RISK_GATE=true`, also at the dedicated verifier).

When `RISK_GATE=true` a dedicated `crew:verifier` is running concurrently and may provide evidence you can reference. When `RISK_GATE=false` (the default), your approval is the evidenced artifact the close-time validation gate delegates to (`loop.validation.satisfiedByReview: true`) — write it so it stands alone as proof of behavior, not just style.

Return the review-result artifact path.
```

Store the returned path(s) as `REVIEW_RESULT_PATH` (or the aggregated set when fanning out multi-lens).

#### Step 5 prompt — `crew:verifier` (RISK_GATE=true only)

**Dispatch only when `RISK_GATE = true`** (Step 4.5: HIGH risk, OR `concern:security` / `concern:performance` tags, OR `SPLIT_BUILD = true`). On the `RISK_GATE = false` default, skip this dispatch entirely — the mandatory full gate (whole-repo lint, `format:check`, the complete test suite, `verify:all`) is owned by CI (`.github/workflows/test.yml`) instead of a per-slice dedicated agent; see `skills/workflow/validator-gate/SKILL.md`.

Dispatch with this prompt:

```
Slice: <SLICE-NN title>
Slice file: <absolute path>

When SPLIT_BUILD=true:
  Builder-fe handoff: <BUILDER_FE_HANDOFF_PATH>
  Builder-be handoff: <BUILDER_BE_HANDOFF_PATH>
When SPLIT_BUILD=false:
  Builder handoff: <BUILDER_HANDOFF_PATH>

Integration artifact: <INTEGRATION_PATH or "none">

Run the mandatory full gate FIRST (lint, format:check, full test suite, verify:all) per your agent prompt — this is where the complete suite runs, since builders only ran affected-class tests. Then validate that the implementation satisfies all acceptance criteria in the slice file. If an Integration artifact is provided with Outcome: PASS, you may short-circuit the scenario set per your agent prompt's SPLIT_BUILD short-circuit rule (the full gate still runs regardless).

Concurrently, the reviewer is running code-quality checks; you focus on behavior and gates.

Return the validation artifact path.
```

Store the returned path as `VALIDATION_PATH`.

> **Tier no longer changes gate composition.** `RISK_GATE` (Step 4.5) is now the sole switch between the single-reviewer default and the heavy 2nd-reviewer/verifier path — light and full tier slices both use the same `RISK_GATE` dispatch selection above. The former combined `reviewer-validator` light-tier prompt was removed.

#### Conflict rule: reviewer needs_fix invalidates validation

If any dispatched reviewer returns `needs_fix`:

1. If `RISK_GATE = true` and a `VALIDATION_PATH` was produced: mark it stale — `node scripts/crew.ts mark-badge --repo "$PWD" --badge validation_stale --note "invalidated by review needs_fix"`. When `RISK_GATE = false` (no dedicated verifier ran), skip this sub-step — there is no separate validation artifact to invalidate; the reviewer's own `needs_fix` result is the signal.
2. **Profile feedback (agent-profile-load-feedback):** record the fail outcome for the builder(s) profile-blocked in Step 2.7a, best-effort, using the SAME `<SLICE-NN>` run-id:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-feedback --repo "$PWD" --run-id "<SLICE-NN>" --outcome fail`
3. Re-dispatch builder with review findings (run `/crew:fix` flow).
4. After builder PASS on the fix bounce: re-dispatch the same gate composition selected in Step 4.5 (single reviewer on `RISK_GATE = false`; reviewer + 2nd reviewer/verifier on `RISK_GATE = true`).
5. Proceed to Step 6 after all dispatched gates PASS.

If all dispatched gates return PASS (or approved_with_notes / passed_with_notes): record the pass outcome the same way (`--outcome pass`, same `<SLICE-NN>` run-id), then proceed to Step 6.

---

### Step 6 — Document writer (CHANGELOG)

**Skip when `RELEASE_CONTENT = false`.**

Dispatch `crew:document-writer` with this prompt:

```
Slice: <SLICE-NN title>
Slice file: <absolute path>
Builder handoff: <BUILDER_HANDOFF_PATH>

Draft the CHANGELOG entry and release-notes section for this slice. Follow the format in CHANGELOG.md. Return the artifact path.
```

Store the returned path as `CHANGELOG_WRITER_PATH`.

---

### Step 7 — Document writer

**Skip when `DOCS_NEEDED = false`.**

Dispatch `crew:document-writer` with this prompt:

```
Slice: <SLICE-NN title>
Slice file: <absolute path>
Builder handoff: <BUILDER_HANDOFF_PATH>

Update any README, CHANGELOG, or architecture docs that this slice requires. Return the artifact path.
```

Store the returned path as `DOCWRITER_PATH`.

---

### Step 8 — Final synthesis

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-final-synthesis \
  --repo "$PWD" \
  --title "orchestrate-slice: <SLICE-NN title>" \
  --summary "<one-paragraph summary of what shipped, which specialists ran, CONTRACT_YAML_PATH, CHANGELOG_WRITER_PATH, and DOCWRITER_PATH if set>" \
  --files "<comma-separated list of all files changed by builder>" \
  --external-deltas "none"
```

After the command succeeds, print:

```
Orchestration complete. Next: /loop:slice complete --id SLICE-NN
```

```

### commands/parallel-review.md

```
---
name: parallel-review
description: Internal coordination command for cases where parallel ownership genuinely helps.
auto_execute_steps: false
---

# Run Parallel Review In Internal Coordination Mode

Use this when parallelism helps and ownership can stay clean.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

Rules:

1. Do not spawn a team just because it sounds impressive.
2. Only parallelize when tasks can be separated by file, module, or question.
3. Keep one owner per task.
4. Use direct teammate messages when redirection is needed.
5. Keep the user informed at clear boundaries, not every micro-step.

Suggested team shapes:

- builder + reviewer
- researcher + builder
- builder + reviewer + researcher

Before starting, provide:

- chosen mode: `assisted single-session` or `team run`
- why parallelism or helper use helps here
- who owns what
- what is intentionally out of scope
- whether claims will be needed
- what artifact should exist at the end

For substantial work, write the matching artifacts during the run instead of only summarizing them at the end:

- `write-run-brief` near the start
- `write-handoff` when ownership changes
- `write-review-result` when review concludes
- `write-final-synthesis` when the run ends

```

### commands/parallel.md

```
---
name: parallel
description: Run multiple autonomous-safe triaged features in parallel git worktrees
  using `crew:build` per-worktree dispatch (Path A, FEAT-136). Resolves loop CLI,
  spawns worktrees, dispatches N `crew:build` agents in one parallel block (each runs
  the slice ceremony), then merges DONE branches to main.
auto_execute_steps: false
---

# Parallel Feature Execution

Dispatch isolated git worktrees for each autonomous-safe triaged FEAT, run the full
loop slice ceremony in each, and merge clean results back to main.

Flags:

- `--max-features N` — cap the number of parallel worktrees (default: `costStopThreshold`
  from `.claude/loop.json`, or 5 if unset).
- `--dry-run` — show the feature plan and projected cost without creating worktrees.
- `--repo <path>` — repository root (default: current working directory).

Workflow:

1. Verify workspace: `pwd` and confirm `git status` is clean on main.
2. Resolve the loop CLI path:
   - Check if `LOOP_ROOT` env var is set; use `${LOOP_ROOT}/scripts/loop.mjs`.
   - Otherwise read `~/.claude/plugins/installed_plugins.json` to find the `loop` plugin version
     and construct the path: `~/.claude/plugins/cache/loop/loop/<version>/scripts/loop.mjs`.
3. Read plans:
   ```
   node <loop-cli-path> auto --dry-run --repo "$PWD" --max-features N
   ```
4. Display the plan list (featureId, priority, builderPrompt preview).
5. Calculate projected cost: N × ~$40 at current opus rates. Show before proceeding.
6. If `--dry-run` is set, stop here and report the plan.
7. **Dispatch `crew:build` agents in parallel, one per worktree:**
   - Call `node <loop-cli> dispatch prepare --plan <plan-json> --parent-branch main --repo "$PWD" --json`
     to spawn worktrees and emit the Agent batch. This step returns the worktree path already created
     for each feature — do not re-derive or re-type that path in prose afterward.
   - In one message, invoke **N parallel Agent calls** with `subagent_type: crew:build`. See
     "Attaching to a pre-created worktree" below for the required isolation mechanism — do NOT pass
     `isolation: "worktree"` on these calls (dev-team#169 follow-up correction: that parameter always
     creates a **fresh** worktree, it does not take a path, and cannot attach to the tree `dispatch
     prepare` already created — see below for what to do instead).
   - Each `crew:build` executes: `slice start` → dispatch the routed specialist builder (`crew:fullstack-dev` /
     `crew:backend-dev` / `crew:frontend-dev` / `crew:dev-lite` per the builder routing matrix in
     `docs/routing-table.md`) → wait for PASS → dispatch `crew:reviewer` (+ stack reviewer fan-out if applicable)
     → wait for PASS → `slice complete` → `slice grade` → return result marker.
   - After all agents return, call `node <loop-cli> dispatch finalize --run-id <runId> --plan <plan-json> --repo "$PWD"`
     to merge DONE children to main and aggregate results.

### Attaching to a pre-created worktree (dev-team#169)

This is the one place in the crew dispatch-authoring docs where a peer must attach to a worktree
that already exists (the one `dispatch prepare` just created), rather than get a fresh one. The
`Agent` tool's `isolation` parameter cannot express this — it is a bare `"worktree" | "remote"`
enum with no path argument, and `"worktree"` always creates a **new**, disconnected temporary tree.
Pointing it "at" `dispatch prepare`'s path is not possible; doing so silently spins up a second tree
the merge flow in step 7's `dispatch finalize` call never sees, so the real work lands somewhere
`dispatch finalize` can't find it — strictly worse than the original #169 bug (a lost-work bug
instead of a cwd-discipline bug).

The correct mechanism: dispatch each `crew:build` Agent call with **no `isolation:` field at all**
(so it launches unpinned, at this dispatcher's own cwd), and make the FIRST instruction in that
agent's dispatch prompt an explicit directive to call the `EnterWorktree` tool itself, before any
other tool use, with `path` set to the worktree `dispatch prepare` returned for that feature:

```
Before anything else, call EnterWorktree with path: "<worktree-path-from-dispatch-prepare>" to
attach to your assigned worktree. Do this as your first tool call, before any Read/Edit/Bash.
```

This is harness-enforced by the `EnterWorktree` tool call itself (it switches that agent's actual
working directory), not by the surrounding prose — the prose only tells the agent which tool call
to make and with what argument; the cwd pin comes from the tool executing, exactly the same
distinction guard 2's fix draws everywhere else. `EnterWorktree` is a tool the dispatched subagent
calls on itself; it is not a parameter on the dispatcher's `Agent` call, and it cannot be set by the
dispatcher on the peer's behalf.

Deliverable:

- `.claude/artifacts/crew/runs/<timestamp>-parallel.md` — merged / conflicted / failed summary.
- One handoff artifact per completed worktree (written by each sub-agent's slice ceremony).

```

### commands/prune-artifacts.md

```
---
name: prune-artifacts
description: Delete crew artifact files older than a configurable age threshold.
auto_execute_steps: false
---

# Prune Artifacts

Use this command to remove stale crew artifacts from `.claude/artifacts/crew/`
subdirectories. Run in `--dry-run` mode first to see what would be deleted before
committing to a destructive pass.

Workflow:

1. Identify the target repo and desired retention window (default: 90 days).
2. Run a dry-run pass to preview files that would be deleted:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/prune-artifacts.ts" --dry-run --older-than <days> --repo "$PWD"`
3. If the list looks correct, run the destructive pass (omit `--dry-run`):
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/prune-artifacts.ts" --older-than <days> --repo "$PWD"`
4. Report the count of deleted files and any errors.

Flags:

- `--older-than <days>` — Age threshold in whole days (default: 90). Must be a
  positive integer. Rejects NaN, zero, and negative values with exit code 1.
- `--dry-run` — List matching files without deleting. Always safe to run.
- `--repo <path>` — Repository root path (default: current working directory).

Deliverable:

- a summary line: `deleted: N file(s) older than D day(s)` (or `dry-run:` prefix)
- any per-file lines written to stdout during the run

```

### commands/quickwin.md

```
---
name: quickwin
description: Spawn or reuse a concurrent quick-win chore-branch worktree, disjoint from the active wave/slice, and claim files for it.
auto_execute_steps: false
argument-hint: [file paths to work on]
---

# Quick-Win Parallel Lane

Cut small wins (doc drift, stale comments, dead pins, artifact hygiene) onto a
dedicated `chore/quickwins-<date>` worktree that commits, PRs, and merges
**independently of the active wave/slice branch** — instead of piling them onto
it and creating one fat PR with review scope creep (#163).

The lane is **date-keyed and reused**: every quick win harvested on the same day
lands on the same branch and ships as one PR (batching — issue ask #4).

Workflow:

1. **Spawn or reuse today's lane** (idempotent — safe to run repeatedly):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" quickwin-lane spawn --repo "$PWD" --json
   ```
   Returns `{ branch, worktreePath, base, reused }`. `reused: true` means today's
   lane already existed and you're joining it. Work happens in `worktreePath`.

2. **Check the file set is disjoint from the active wave lane** before claiming.
   Claim state is shared across worktrees (#163), so an overlap with the wave
   lane is detectable here:
   ```bash
   set -euo pipefail
   read -ra _args <<< "$ARGUMENTS"
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" claim-check --repo "<worktreePath>" --owner quickwin-lane -- "${_args[@]}"
   ```
   Returns `{ disjoint, overlaps, available }`.
   - `disjoint: true` → all files are free; proceed to claim `available`.
   - `disjoint: false` → each `overlaps[]` entry names a file owned by the wave
     lane (`owner`). Do **not** take those onto the quick-win lane — route them
     onto the wave branch instead (or wait for release). Take only `available`.

3. **Claim the disjoint file set** for the lane, from inside the lane worktree:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" claim --repo "<worktreePath>" --owner quickwin-lane -- <available files>
   ```

4. **Do the work** in `worktreePath`. Keep it small — docs / comments / artifact
   hygiene. Anything that touches runtime code belongs on a proper slice, not
   this lane.

5. **Right-sized gates** for docs/artifact/comment-only changes: route to
   `reviewer-lite` rather than the full verifier ceremony (see S3 of the #163
   plan — the pre-push gate accepts a docs-only validation-skip record).

6. **Ship the batch** as one PR per day/wave from the lane branch — not one PR
   per one-liner.

Status check (is today's lane live?):
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" quickwin-lane status --repo "$PWD" --json
```

Deliverable:

- the lane branch + worktree path
- the claimed (disjoint) file set, and any files bounced back to the wave lane
- a one-line note for the operator on what the lane is carrying today

```

### commands/review.md

```
---
name: review
description: Preferred short entry point for running the review phase on completed work.
auto_execute_steps: false
---

# Review — Dispatcher Workflow

This is the preferred short entry point for the review phase.

Use it when code-bearing work or a substantial non-code deliverable is complete and needs independent review.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

Expected shape:

1. verify the current workspace path with `pwd`
2. read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"`
3. explicitly confirm the returned `repoPath` matches the current working directory before trusting the brief
4. read the most relevant run and handoff context for the work under review:
   - latest run brief
   - latest relevant handoff
   - latest relevant review if one already exists
5. identify the completed work or artifact set under review
6. identify the standards that must be applied:
   - repo review policy
   - repo `CLAUDE.md` expectations
   - any repo-configured or globally configured review skills and standards that apply
     6a. preload builder context (build bundle): resolve the current slice id from `.claude/state/crew/workflow-state.json` (`currentRun.slice`) and call:
   - `node -e 'import("./scripts/lib/build-bundle/inline.ts").then(m => m.inlineLatestBundle({ sliceId: process.argv[1] })).then(s => process.stdout.write(s))' "<SLICE-NN>"`
     If the returned string is non-empty, include it verbatim in the reviewer dispatch prompt **before** the role-specific task body. If empty, dispatch the reviewer without preload (today's behavior) — bundle inline is non-blocking. The header inside the bundle (`## Builder context (preloaded — do not re-Read these files)`) is your signal to the reviewer that those files do not need to be re-Read.
7. dispatch the **`crew:reviewer`** agent for the independent review gate. Pass it: the diff or branch under review, the relevant run brief / handoff context, any applicable design doc path under `.claude/artifacts/crew/designs/` (so the reviewer can check conformance to the agreed design instead of inventing a spec from the diff), and which repo + global standards to apply. If no design doc applies, tell the reviewer "no design doc" explicitly. Do **not** dispatch `code-reviewer` or any other generically-named review agent here — those are scoped to ad-hoc spot-checks and do not honor the Crew review-artifact contract.
8. run the relevant review gates for the task and repo (the dispatched `crew:reviewer` owns this; the dispatcher supervises and synthesizes its output)
   - **Reviewer fan-out watchdog (dev-team#199).** This applies whenever more than one reviewer is dispatched for the same work (e.g. a stack reviewer alongside `crew:reviewer`, matching `commands/build.md` / `commands/fix.md`'s parallel fan-out): if one reviewer is idle with no artifact after the other has already returned, send one `SendMessage` status-check nudge. If still silent, mark `blocked` (`mark-badge --badge blocked --note "reviewer <name> idle with no artifact after nudge"`) and proceed under single-reviewer policy rather than waiting indefinitely.
   - **Idle-ping guidance:** a `teammate_idle` notification (payload `{"type":"idle_notification"}`) from a reviewer that already delivered its artifact is noise, not a signal to act on — do not re-dispatch or nudge on it.
9. record the review result and update workflow state immediately when review completes
10. return findings, risks, standards checked, configured review skills used, and the next recommended step

Review should be treated as a phase, not a courtesy:

- substantial non-code deliverables should normally be reviewed before they are treated as done
- if code changed, independent review is required unless explicitly skipped with a reason
- the reviewer should be independent from the implementing agent
- the review may include correctness, regressions, scope discipline, test gaps, repo standards, language-specific checks, or security review
- do not leave repo standards or language standards implicit in the review summary

When review materially completes, write the review artifact:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-review-result --repo "$PWD" --title "<short title>" --decision <approved|approved_with_notes|rejected> --author-id <builder-agent> --judge-id <reviewer-agent> --summary "<verdict>" --evidence "<files checked>" --files "<files in diff>" --test-summary "<test coverage>" --risks "<risks or none>" --next "<follow-up or none>"`
- If `--summary` (or any prose flag) contains apostrophes/backticks, shell argv quoting can mangle or drop it (dev-team#152). Write the body to a temp file and pass `--summary-file <path>` (or any `--<flag>-file <path>`) instead.

If review is intentionally skipped, record that explicitly in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge review_skipped --note "<reason>"`

```

### commands/ship.md

```
---
name: ship
description: Auto-fix loop entry point for QA, verification, PR filing, and deployment evidence. Dispatches qa-expert + verifier in parallel; retries with a specialist builder on FAIL up to ship.fix_retry_limit times; files PR or escalates with a `blocked` badge.
auto_execute_steps: false
---

# Ship — Auto-Fix Loop

`/crew:ship` is the structured path from reviewed, local-commit-ready work to a filed PR with
QA and verification evidence. It does not replace manual deployment steps; those remain in the
deployer skill and require explicit user approval before any production promotion.

## Step 1 — Workspace verify + wake-up context

```bash
pwd
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"
```

Verify the returned `repoPath` matches `$PWD` before trusting the brief.

## Step 2 — Deployment guidance

Run discovery and surface what is already known:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" discover-deployment --repo "$PWD"
```

If guidance is absent, stale, or incomplete, inspect CI/CD + infra files and write durable guidance:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-deployment-guidance --repo "$PWD" \
  --title "<short title>" \
  --discovery-status repo-derived   # or partial / live-verified
```

Distinguish trust levels:
- `repo-derived` — repo files only.
- `partial` — some live identifiers confirmed.
- `live-verified` — concrete deploy identifiers confirmed from the platform.

Read `ship.fix_retry_limit` from `.claude/crew/deployment.md` (default **2** when absent). This caps
the auto-fix retries below.

## Step 3 — Auto-fix loop

**RunId resolution (agent-profile-load-feedback).** Resolve `<runId>` once, up front, from `.claude/state/crew/workflow-state.json` (`currentRun.slice`) — mirrors `build.md` step 12b. Reuse this SAME value for every `profile-block` / `profile-feedback` call below (Step 3a, Both PASS path, and Step 4), including the immediate-pass case where no retry iteration occurs.

### Iteration 0 (and each retry)

Dispatch both agents **in a single Agent-tool message** (parallel fan-out):

| Agent | Role |
|---|---|
| `crew:qa-expert` | Functional correctness, test coverage, edge-case scenarios |
| `crew:verifier` | Behavioral validation against acceptance criteria |

Both agents write their result artifacts before this step completes.

### Aggregate decisions

Collect both results:

- `crew:qa-expert` → `qa_decision` (passed / failed)
- `crew:verifier` → `verifier_decision` (passed / failed)

### Both PASS path

```
qa_decision = passed AND verifier_decision = passed
```

1. Emit badge (one validation gate covers both agents — mark only after BOTH pass):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge validation_passed --note "qa-expert + verifier both passed"
   ```
   **Profile feedback (agent-profile-load-feedback):** if a retry dispatch fetched a profile block in Step 3, record the pass outcome, best-effort, using the SAME `<runId>` (no-op — empty `credited` — when no retry occurred, since no atoms were injected under that run):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-feedback --repo "$PWD" --run-id <runId> --outcome pass
   ```
2. File PR:
   ```bash
   gh pr create --title "<title>" --body "<summary>"
   ```
3. Write deployment check (this artifact is the PR-filed evidence — there is no `pr_filed` badge):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-deployment-check --repo "$PWD" \
     --title "Ship: PR filed" --decision passed --url "<PR URL>"
   ```
4. Exit — surface the PR URL to the user.

### Either FAIL path

1. Read the FEAT tag from the current slice context.
2. Map tag to specialist builder using the same FEAT-tag → builder routing as `/crew:build`:
   - `.cs` diff → `crew:backend-dev`
   - `.ts` + `surface:ui` → `crew:frontend-dev`
   - `.ts` + `surface:backend` → `crew:backend-dev`
   - `.ts` + `surface:cross-layer` → `crew:fullstack-dev`
   - `.ts` + `surface:plugin` → `crew:aiplugin-dev`
   - no clear tag → `crew:fullstack-dev`
3. **Recall injection (FEAT-188 S3a):** before dispatching, fetch a recall block:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" recall-block --repo "$PWD" --agent <specialist-builder-agent-name> --tags "<FEAT tags csv>"`
   If `.block` is non-empty, prepend it verbatim (it is already the `## Prior context (from astramem)` block) to the retry dispatch instruction, ahead of the aggregated FAIL findings. If empty (memory not configured, or nothing recalled), omit — do not add any placeholder text.
3a. **Profile injection (agent-profile-load-feedback):** immediately after the recall block, fetch the specialist builder's track record (best-effort, empty when disabled). Resolve `<runId>` from `.claude/state/crew/workflow-state.json` (`currentRun.slice`) — reuse this SAME value for the profile-feedback calls in Step 3 (Both PASS path) and Step 4 below:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-block --repo "$PWD" --agent <specialist-builder-agent-name> --run-id <runId>`
   If `.block` is non-empty, append it (it is already the `## Your track record (<agent>)` block) to the retry dispatch instruction, after the recall block. If empty (profile disabled, or no track record yet), omit — do not add any placeholder text.
4. Dispatch the specialist builder with the aggregated FAIL findings as fix scope. Builder produces
   a fix + handoff artifact.
5. Increment retry counter.

### Retry gate

```
retry_counter < ship.fix_retry_limit (default 2)?
  yes → return to Step 3, iteration N
  no  → goto Step 4 (blocked)
```

## Step 4 — Escalate on retry exhaustion

When retries are exhausted without both agents passing:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" \
  --badge blocked \
  --note "ship: <aggregated FAIL summary from qa-expert + verifier>"

node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-deployment-check --repo "$PWD" \
  --title "Ship: blocked after <N> retries" \
  --decision blocked
```

**Profile feedback (agent-profile-load-feedback):** record the fail outcome for the last retry's profile block, best-effort, using the SAME `<runId>` from Step 3a:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" profile-feedback --repo "$PWD" --run-id <runId> --outcome fail
```

Halt and escalate to the user with:
- the aggregated FAIL summary
- the retry count reached
- both agents' result artifact paths
- suggested next step (manual fix or scope reduction)

Do not attempt further automated fixes.

## Production promotion

Production promotion (tag pushes, force-pushes, live environment changes) **always requires
explicit user approval** regardless of `dev.stable` or any badge state.

Badge and deployment-check evidence is a prerequisite for requesting approval, not a substitute
for it.

Use the deployer for any environment transition requiring live infrastructure access:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge prod_deploy_expected
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge dev_deploy_expected
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge dev_skipped --note "<reason>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge prod_skipped --note "<reason>"
```

## Badge reference

All badge names here must exist in `docs/standards/badge-catalog.md` (generated from `BADGE_TABLE`) — do not invent ship-specific badges.

| Badge | When emitted |
|---|---|
| `validation_passed` | `crew:qa-expert` AND `crew:verifier` both returned passed |
| `blocked` | Retry limit exhausted, escalated to user (`--note "ship: ..."`) |
| `dev_deploy_expected` | Dev environment transition started |
| `prod_deploy_expected` | Production promotion requested |

PR filing is evidenced by the `write-deployment-check` artifact (`--url <PR URL>`), not a badge.

```

### commands/validate.md

```
---
name: validate
description: Preferred short entry point for running the validation phase on runnable or observable behavior.
auto_execute_steps: false
---

# Validate — Dispatcher Workflow

This is the preferred short entry point for the validation phase.

Use it when behavior can be exercised meaningfully after implementation and review.

For what counts as "substantial" below, see the canonical definition in `constitution.md` (`What "Substantial" Means`).

Expected shape:

1. verify the repo and read bounded wake-up context
2. identify the scenario, flow, or environment to validate
3. if the validation scenario is substantial, write a validation plan
3a. preload builder context (build bundle): resolve the current slice id from `.claude/state/crew/workflow-state.json` (`currentRun.slice`) and call:
   - `node -e 'import("./scripts/lib/build-bundle/inline.ts").then(m => m.inlineLatestBundle({ sliceId: process.argv[1] })).then(s => process.stdout.write(s))' "<SLICE-NN>"`
   If the returned string is non-empty, include it verbatim in the validator dispatch prompt **before** the role-specific task body. If empty, dispatch the validator without preload (today's behavior) — bundle inline is non-blocking. The header inside the bundle (`## Builder context (preloaded — do not re-Read these files)`) is your signal to the validator that those files do not need to be re-Read.
4. run the validation checks and collect evidence
5. write the validation result and update workflow state immediately when validation materially completes
6. return pass/fail evidence, residual risk, and the next recommended step

Validation should focus on behavior, not code style:

- APIs can be exercised with scripts or commands
- UI flows can be exercised in browser automation mode
- logs, screenshots, outputs, and telemetry can be used as evidence

When validation is expected, record that gate in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge validation_expected`

If the scenario is substantial, write a validation plan:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-validation-plan --repo "$PWD" --title "<short title>" ...`

When validation materially completes, write the validation result:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-validation-result --repo "$PWD" --title "<short title>" ...`

If validation is intentionally skipped, record that explicitly in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" mark-badge --repo "$PWD" --badge validation_skipped --note "<reason>"`

```

### commands/wake-up-brief.md

```
---
name: wake-up-brief
description: Internal startup/debug command for inspecting the raw Crew wake-up brief for this repo.
auto_execute_steps: false
---

# Read Engineering OS Wake-Up Brief

This is primarily internal workflow plumbing. Substantial workflows should already do this automatically; use it directly only for debugging, recovery, or explicit inspection.

If the user wants a friendly "where are we?" report, prefer `/crew:brief-me`.

Workflow:

1. First verify the current workspace path:
   - `pwd`
2. Sync remote state so the brief reflects reality, not stale local refs:
   - `git fetch --prune`
3. Then run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" wake-up --repo "$PWD"`
3. Explicitly compare the returned `repoPath` with the current working directory.
4. If they do not match, stop and treat the wake-up brief as invalid for this run.
5. Only if they match, summarize:
   - latest run memory
   - open approvals
   - active claims
   - anything that looks stale, blocked, or currently active
6. Use that to decide whether work should stay single-session, become assisted single-session, or become a team run.

```

## Files read

