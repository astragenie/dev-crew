---
slice: SLICE-08
builder: fullstack-dev
run_id: 20260819T003432Z
feat: FEAT-002
files_touched: [".claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md", ".claude/artifacts/loop/ai-loop/backlog/completed-slices.md", ".claude/loop/rules.md", "ADOPTION.md", "AGENTS.md", "CLAUDE.md", "README.md", "commands/install.md", "commands/retrospective.md", "docs/ai-loop/00-entry/MASTER_PROMPT.md", "docs/ai-loop/backlog/completed-slices.md", "docs/demo/2026-07-18-qa-gate-demo-script.md", "docs/prompts/2026-07-02-architecture-retrospective-prompt.md", "docs/research/prompts/2026-07-18-competitive-audit-prompt.md", "docs/superpowers/plans/2026-05-27-plugin-performance.md", "docs/superpowers/plans/2026-05-28-competitor-gap-audit.md", "docs/superpowers/specs/2026-05-27-plugin-performance-design.md", "scripts/competitor-audit/researcher-prompt.md", "src/scripts/lib/loop-installer-scaffold.mts", "src/scripts/lib/loop-installer-tokens.mts", "src/scripts/lib/score-inference.mts", "src/tests/generate-metrics-band.test.mts", "src/tests/loop-installer.test.mts", "templates/backlog/completed-slices.md", "templates/claude-md-hard-rules.md", "templates/loop-rules.md", "templates/master-prompt.md"]
files_read: []
files_read_skipped:
  - { path: ".claude/artifacts/loop/ai-loop/01-loop-control/WIGGIN_LOOP.md->DEV_CREW_METHOD.md", reason: deleted }
  - { path: "docs/ai-loop/01-loop-control/WIGGIN_LOOP.md->DEV_CREW_METHOD.md", reason: deleted }
  - { path: "templates/wiggin-loop.md->templates/dev-crew-method.md", reason: deleted }
diff_stat: { files: 32, additions: 96, deletions: 95 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-08: Wiggin -> dev-crew branding scrub

- Created: 2026-08-19T00:34:32.220Z
- From: fullstack-dev
- To: dispatcher
- Objective: Scrubbed all live-product-surface 'Wiggin' references (root docs, commands/, templates/, .claude loop-control scaffold + its docs/ mirror, src/scripts installer code, tests) to dev-crew method wording. Renamed templates/wiggin-loop.md -> dev-crew-method.md and the two installed WIGGIN_LOOP.md scaffold copies (.claude/artifacts + docs/ai-loop) -> DEV_CREW_METHOD.md, updating every filename reference across CLAUDE.md/README/ADOPTION/commands/templates/rules.md and the installer (loop-installer-scaffold.mts, loop-installer-tokens.mts) plus the matching test assertion. 24 remaining wiggin hits are all inside documented exclusions: .claude/artifacts/** + .claude/state/** (historical/runtime records), crew/** (unflattened dev-team subtree, left untouched per instruction), and docs/parents/** + docs/planning/** (explicitly forbidden). Root grep -rli wiggin over everything else returns 0. Full test suite holds at the pre-existing baseline of 3310 pass / 2 fail (DEC-070/DEC-068 self-referential contract tests, unrelated pre-existing failures). validate-manifests and validate-content-length both pass. git status confirms zero changes under crew/.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - templates/wiggin-loop.md->templates/dev-crew-method.md
  - .claude/artifacts/loop/ai-loop/01-loop-control/WIGGIN_LOOP.md->DEV_CREW_METHOD.md
  - docs/ai-loop/01-loop-control/WIGGIN_LOOP.md->DEV_CREW_METHOD.md
  - CLAUDE.md
  - AGENTS.md
  - README.md
  - ADOPTION.md
  - commands/install.md
  - commands/retrospective.md
  - .claude/loop/rules.md
  - templates/loop-rules.md
  - templates/claude-md-hard-rules.md
  - templates/master-prompt.md
  - .claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md
  - docs/ai-loop/00-entry/MASTER_PROMPT.md
  - .claude/artifacts/loop/ai-loop/backlog/completed-slices.md
  - templates/backlog/completed-slices.md
  - docs/ai-loop/backlog/completed-slices.md
  - docs/demo/2026-07-18-qa-gate-demo-script.md
  - docs/prompts/2026-07-02-architecture-retrospective-prompt.md
  - docs/research/prompts/2026-07-18-competitive-audit-prompt.md
  - docs/superpowers/plans/2026-05-27-plugin-performance.md
  - docs/superpowers/plans/2026-05-28-competitor-gap-audit.md
  - docs/superpowers/specs/2026-05-27-plugin-performance-design.md
  - scripts/competitor-audit/researcher-prompt.md
  - src/scripts/lib/score-inference.mts
  - src/scripts/lib/loop-installer-tokens.mts
  - src/scripts/lib/loop-installer-scaffold.mts
  - src/tests/loop-installer.test.mts
  - src/tests/generate-metrics-band.test.mts
- Confidence: high
- Risks: crew/ subtree (imported dev-team plugin copy) still contains ~7 wiggin references (CLAUDE.md, CHANGELOG.md, .claude/loop/rules.md, ai-loop scaffold) - deliberately left untouched per instruction pending a dedicated crew-subtree consolidation slice. .claude/artifacts/loop/backlog/{in-progress/FEAT-002.md,triaged/FEAT-005.md} and pending SLICE_08/09/10 spec files still cite 'wiggin' in AC prose (these ARE this program's own backlog/spec records describing the scrub itself) - left as historical/backlog artifacts per classification, not product surface. .claude/state/crew/workflow-state.json currentRun.title mirrors the live slice title verbatim (auto-managed by /runner:start) and was left alone to avoid drifting from tool-generated state.
- Suggested Next Handoff: SLICE-09 (tsconfig/biome config merge) and SLICE-10 (N=20 green parallel verification + typecheck gate) are next in the pending queue. A later slice should flatten/normalize the crew/ subtree import and its own wiggin references once dev-crew's own DEC numbering stabilizes (also flagged in the SLICE-04 handoff for the 2 self-referential decision-log test failures).


## Diff

```diff
diff --git a/.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md b/.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md
index 33ff9d1f..537ee426 100644
--- a/.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md
+++ b/.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md
@@ -3,7 +3,7 @@
 ## Persona
 
 You are a senior engineer working on **Untitled Claude Code plugin**, building it slice by
-slice according to the Wiggin Loop methodology.
+slice according to the dev-crew method.
 
 You write production code: no stubs, no TODOs, no placeholder implementations.
 Every slice you complete is buildable, testable, and leaves the codebase in a
@@ -27,7 +27,7 @@ Override productName and productDescription in .claude/loop.json after install.
 2. `README.md`
 3. `CHANGELOG.md`
 4. `docs/code-conventions.md`
-5. `.claude/artifacts/loop/ai-loop/01-loop-control/WIGGIN_LOOP.md`
+5. `.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md`
 6. `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md`
 7. `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md`
 
@@ -47,7 +47,7 @@ Before beginning any implementation work, run this checklist and report findings
    criteria?
 
 Report: solution state, backlog state, current slice, key gaps. Then proceed
-to the current slice via the Wiggin Loop.
+to the current slice via the dev-crew method.
 
 ## Definition of done
 
diff --git a/.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md b/.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md
index 0ed5157a..2c0fc2fa 100644
--- a/.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md
+++ b/.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md
@@ -1,6 +1,6 @@
-# Wiggin Loop — Autonomous Implementation Loop
+# dev-crew method — Autonomous Implementation Loop
 
-The wiggin loop is a strict iterative engineering loop.
+The dev-crew method is a strict iterative engineering loop.
 
 Its goal is to prevent the agent from stopping after a shallow implementation.
 
diff --git a/.claude/artifacts/loop/ai-loop/backlog/completed-slices.md b/.claude/artifacts/loop/ai-loop/backlog/completed-slices.md
index f2dd1ba1..f16dc7e9 100644
--- a/.claude/artifacts/loop/ai-loop/backlog/completed-slices.md
+++ b/.claude/artifacts/loop/ai-loop/backlog/completed-slices.md
@@ -1,7 +1,7 @@
 # Completed Slices — Untitled Claude Code plugin
 
 Record of completed implementation slices. Append at the end of each slice as
-part of the Wiggin Loop close-out.
+part of the dev-crew close-out.
 
 ## Format
 
diff --git a/.claude/loop/rules.md b/.claude/loop/rules.md
index 59be1711..48e0b6ae 100644
--- a/.claude/loop/rules.md
+++ b/.claude/loop/rules.md
@@ -20,7 +20,7 @@ After all acceptance criteria for the current slice are PASS with evidence and a
 1. **Scan `.claude/artifacts/loop/specs/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/runner:intake --spec`. New FEAT files land in `.claude/artifacts/loop/backlog/pending/`.
 2. **Scan `.claude/artifacts/loop/backlog/pending/`** — if any pending entries exist, run `/runner:triage` to score them; scored entries move to `.claude/artifacts/loop/backlog/triaged/`.
 3. **Pick the highest-priority triaged feature** — order P0 > P1 > P2 > P3; break ties by lowest FEAT-NNN id ascending (oldest wins). Promote it: `/runner:start FEAT-NNN`.
-4. **Begin the Wiggin Loop on the new slice.** Acceptance criteria, evidence, review per `.claude/artifacts/loop/ai-loop/01-loop-control/`.
+4. **Begin the dev-crew method on the new slice.** Acceptance criteria, evidence, review per `.claude/artifacts/loop/ai-loop/01-loop-control/`.
 5. **On slice close** — run the Slice Close Ceremony (below). Do NOT skip it — every artifact is part of the slice's evidence record.
 
 If `.claude/artifacts/loop/backlog/pending/`, `.claude/artifacts/loop/backlog/triaged/`, and `.claude/artifacts/loop/specs/` are all empty/satisfied, confirm via `/runner:spec-status` and stop. Never stop just because the backlog "feels empty." Slice/phase filename linkage and the auto-mode-vs-legacy gating table: `.claude/loop/rules-reference.md`.
@@ -69,7 +69,7 @@ Before dispatching any reviewer, pre-extract the slice spec's `Files:` list and
 Two ways to start work. Pick one per session — do **not** mix.
 
 - **`/crew:build` (interactive, single slice).** Lead-driven, lighter ceremony. No `/runner:start` required; no run-brief mandatory. The Slice Close Ceremony still applies if the change closes a slice.
-- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start → Wiggin Loop → Slice Close. Invoked via `/runner:auto`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.
+- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start → dev-crew method → Slice Close. Invoked via `/runner:auto`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.
 
 Never run both simultaneously against the same branch — they race on `workflow-state.json`. One-glance visibility into all slices: `cat .claude/state/crew/slice-progress.md`.
 
@@ -111,6 +111,6 @@ Read in this order, then pick the highest-priority PENDING slice:
 1. `.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
 2. `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md` — pick highest-priority PENDING slice
 3. The slice file listed in `approved-slices.md` (under `.claude/artifacts/loop/ai-loop/slices/`)
-4. `.claude/artifacts/loop/ai-loop/01-loop-control/WIGGIN_LOOP.md` — the loop sequence
+4. `.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md` — the loop sequence
 5. `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
 6. `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop
diff --git a/.claude/state/crew/slice-progress.md b/.claude/state/crew/slice-progress.md
index 443362a8..9dddb322 100644
--- a/.claude/state/crew/slice-progress.md
+++ b/.claude/state/crew/slice-progress.md
@@ -1,6 +1,6 @@
 # Slice Progress
 
-Updated: 2026-08-19T00:23:46.251Z
+Updated: 2026-08-19T00:24:10.478Z
 
 Active plan: _(none detected)_
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index 60a0be18..e28d060c 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T00:12:15.091Z",
+  "updatedAt": "2026-08-19T00:34:32.222Z",
   "currentRun": {
-    "title": "FEAT002 SLICE06: .ts->.mts rename sweep batch 2 + import-specifier fixes",
+    "title": "FEAT002 SLICE08: Wiggin -> dev-crew branding scrub (27 files)",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
-    "startedAt": "2026-08-18T22:51:44.721Z",
-    "updatedAt": "2026-08-19T00:12:15.091Z",
-    "next": "If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).",
+    "startedAt": "2026-08-19T00:24:10.407Z",
+    "updatedAt": "2026-08-19T00:34:32.222Z",
+    "next": "SLICE-09 (tsconfig/biome config merge) and SLICE-10 (N=20 green parallel verification + typecheck gate) are next in the pending queue. A later slice should flatten/normalize the crew/ subtree import and its own wiggin references once dev-crew's own DEC numbering stabilizes (also flagged in the SLICE-04 handoff for the 2 self-referential decision-log test failures).",
     "gates": {
       "review": null,
       "validation": null,
@@ -22,9 +22,10 @@
       "help": null
     },
     "artifacts": {
-      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T225144Z-run-brief-feat002-slice06-ts-mts-rename-sweep-batch-2-import-specifier.md",
+      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T002410Z-run-brief-feat002-slice08-wiggin-dev-crew-branding-scrub-27-files.md",
       "handoffs": [
-        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T001215Z-handoff-slice-07-round-3-flip-remaining-node-spawns-to-bun-15-files.md"
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003416Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md",
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003432Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
@@ -38,14 +39,14 @@
   },
   "recentRuns": [
     {
-      "title": "FEAT002 SLICE05: .ts->.mts rename sweep batch 1 (dev-team src)",
+      "title": "FEAT002 SLICE06: .ts->.mts rename sweep batch 2 + import-specifier fixes",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T22:25:18.605Z",
-      "updatedAt": "2026-08-18T22:25:18.605Z",
-      "completedAt": "2026-08-18T22:25:18.605Z",
-      "next": "Begin implementation",
+      "startedAt": "2026-08-18T22:51:44.721Z",
+      "updatedAt": "2026-08-19T00:12:15.091Z",
+      "completedAt": "2026-08-19T00:12:15.091Z",
+      "next": "If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).",
       "gates": {
         "review": null,
         "validation": null,
@@ -59,8 +60,10 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222518Z-run-brief-feat002-slice05-ts-mts-rename-sweep-batch-1-dev-team-src.md",
-        "handoffs": [],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T225144Z-run-brief-feat002-slice06-ts-mts-rename-sweep-batch-2-import-specifier.md",
+        "handoffs": [
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T001215Z-handoff-slice-07-round-3-flip-remaining-node-spawns-to-bun-15-files.md"
+        ],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
@@ -72,13 +75,13 @@
       }
     },
     {
-      "title": "FEAT002 SLICE04: Subtree-import dev-team + runner-plugin, preserve history",
+      "title": "FEAT002 SLICE05: .ts->.mts rename sweep batch 1 (dev-team src)",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T22:24:42.650Z",
-      "updatedAt": "2026-08-18T22:24:42.650Z",
-      "completedAt": "2026-08-18T22:24:42.650Z",
+      "startedAt": "2026-08-18T22:25:18.605Z",
+      "updatedAt": "2026-08-18T22:25:18.605Z",
+      "completedAt": "2026-08-18T22:25:18.605Z",
       "next": "Begin implementation",
       "gates": {
         "review": null,
@@ -93,7 +96,7 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222442Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222518Z-run-brief-feat002-slice05-ts-mts-rename-sweep-batch-1-dev-team-src.md",
         "handoffs": [],
         "reviewResult": null,
         "validationPlan": null,
@@ -110,10 +113,10 @@
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T21:58:07.687Z",
-      "updatedAt": "2026-08-18T22:17:08.476Z",
-      "completedAt": "2026-08-18T22:17:08.476Z",
-      "next": "SLICE-05/06 (ts->mts rename sweep) and SLICE-07 (node:test->bun:test migration, 31 files) should pull the salvage branch's already-written bun:test rewrites as a reference/diff source rather than redo the conversion from scratch -- it already solves the exact 31-file target count. SLICE-08 (Wiggin scrub) should also fix the 2 self-referential decision-log tests once dev-crew's own DEC numbering stabilizes, or delete/rewrite them as no-longer-applicable dogfood self-checks.",
+      "startedAt": "2026-08-18T22:24:42.650Z",
+      "updatedAt": "2026-08-18T22:24:42.650Z",
+      "completedAt": "2026-08-18T22:24:42.650Z",
+      "next": "Begin implementation",
       "gates": {
         "review": null,
         "validation": null,
@@ -127,10 +130,8 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T215807Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
-        "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T221708Z-handoff-slice-04-subtree-import-dev-team-runner-plugin-preserve-hist.md"
-        ],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222442Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
+        "handoffs": [],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
@@ -146,10 +147,10 @@
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T21:58:02.251Z",
-      "updatedAt": "2026-08-18T21:58:02.251Z",
-      "completedAt": "2026-08-18T21:58:02.251Z",
-      "next": "Begin implementation",
+      "startedAt": "2026-08-18T21:58:07.687Z",
+      "updatedAt": "2026-08-18T22:17:08.476Z",
+      "completedAt": "2026-08-18T22:17:08.476Z",
+      "next": "SLICE-05/06 (ts->mts rename sweep) and SLICE-07 (node:test->bun:test migration, 31 files) should pull the salvage branch's already-written bun:test rewrites as a reference/diff source rather than redo the conversion from scratch -- it already solves the exact 31-file target count. SLICE-08 (Wiggin scrub) should also fix the 2 self-referential decision-log tests once dev-crew's own DEC numbering stabilizes, or delete/rewrite them as no-longer-applicable dogfood self-checks.",
       "gates": {
         "review": null,
         "validation": null,
@@ -163,8 +164,10 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T215802Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
-        "handoffs": [],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T215807Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
+        "handoffs": [
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T221708Z-handoff-slice-04-subtree-import-dev-team-runner-plugin-preserve-hist.md"
+        ],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
@@ -176,14 +179,14 @@
       }
     },
     {
-      "title": "FEAT001 SLICE03: 28-FEAT bucket sweep, worktree salvage, baseline tags",
+      "title": "FEAT002 SLICE04: Subtree-import dev-team + runner-plugin, preserve history",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T21:41:24.343Z",
-      "updatedAt": "2026-08-18T21:53:23.161Z",
-      "completedAt": "2026-08-18T21:53:23.161Z",
-      "next": "batch-intake the 26 carry-id FEATs into dev-crew backlog; decide disposition of dev-team's salvage branch before the import phase",
+      "startedAt": "2026-08-18T21:58:02.251Z",
+      "updatedAt": "2026-08-18T21:58:02.251Z",
+      "completedAt": "2026-08-18T21:58:02.251Z",
+      "next": "Begin implementation",
       "gates": {
         "review": null,
         "validation": null,
@@ -197,10 +200,8 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T214124Z-run-brief-feat001-slice03-28-feat-bucket-sweep-worktree-salvage-baseli.md",
-        "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T215323Z-handoff-slice-03-28-feat-bucket-sweep-worktree-salvage-baseline-tags.md"
-        ],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T215802Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
+        "handoffs": [],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
diff --git a/ADOPTION.md b/ADOPTION.md
index 942fbe96..31e684ff 100644
--- a/ADOPTION.md
+++ b/ADOPTION.md
@@ -151,7 +151,7 @@ Inspect the new files (paths below use this repo's `aiLoopRoot`/
 if you customized them):
 
 - `CLAUDE.md` — should contain `<!-- runner:start -->...<!-- runner:end -->`
-- `<aiLoopRoot>/01-loop-control/{WIGGIN_LOOP,EVIDENCE_RULES,STOP_CONDITIONS}.md`
+- `<aiLoopRoot>/01-loop-control/{DEV_CREW_METHOD,EVIDENCE_RULES,STOP_CONDITIONS}.md`
 - `<aiLoopRoot>/00-entry/{MASTER_PROMPT,SLICE_TEMPLATE}.md`
 - `<backlogPath>/{approved-slices,completed-slices,product-backlog}.md`
 - `<slicesRoot>/pending/.gitkeep`
diff --git a/AGENTS.md b/AGENTS.md
index 3d4bb703..2e3bae21 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -1,7 +1,7 @@
 # runner-plugin — Agent Instructions
 
 Claude Code plugin (marketplace name `loop`, plugin id `runner`, CLI namespace
-`/runner:*`) that ships the Wiggin Loop methodology as a reusable layer on top
+`/runner:*`) that ships the dev-crew method as a reusable layer on top
 of the `crew` plugin: PM-triaged backlog, slice-scoped specs with
 Given-When-Then acceptance criteria, parallel-worktree wave dispatch,
 phase-gate quality checks, and decision-grade retrospectives. Real, mature
diff --git a/CLAUDE.md b/CLAUDE.md
index 130c92df..e7a6ad09 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -16,8 +16,8 @@ plugins into a single engineering-OS plugin:
   the autonomous layer on top of crew: a PM-triaged backlog, slice-scoped
   Given-When-Then specs, parallel-worktree wave dispatch, phase-gate quality
   checks, marathon-mode autonomous backlog walks, and decision-grade
-  retrospectives. (Formerly branded "Wiggin Loop" — that name is retired;
-  the unified methodology is simply called **dev-crew**.)
+  retrospectives. (Formerly branded under a different working name — that
+  name is retired; the unified methodology is simply called **dev-crew**.)
 
 Today the two plugins couple across a fragile seam: runner resolves the crew
 CLI from the plugin cache (`MIN_CREW_VERSION` gating), bridges to it through
@@ -41,8 +41,8 @@ single agent/skill registry, a single CI gate list, and a single test suite.
   against is fixed or not triggered by the migrated suites; quarantine (not
   serialize globally) any suite that still trips it.
 - **Naming**: the methodology and plugin are both called **dev-crew**
-  (plugin id `devcrew`). "Wiggin Loop" branding is retired — do not carry
-  the name into docs, templates, prompts, or command text; scrub it during
+  (plugin id `devcrew`). The prior working-name branding is retired — do not
+  carry it into docs, templates, prompts, or command text; scrub it during
   content import.
 
 ## Ground rules for this repo
@@ -81,7 +81,7 @@ single agent/skill registry, a single CI gate list, and a single test suite.
 
 ## Autonomous Loop — HARD RULES (summary)
 
-This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.
+This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.
 
 - **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
 - **Auto mode (default — `loop.marathonMode: true`).** Loop walks the entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts. Iteration cap and soft `blocked` badge are advisory in this mode — set `loop.marathonMode: false` in `.claude/loop.json` to restore the legacy five-condition gating.
diff --git a/README.md b/README.md
index b6aeb3fd..853ac6f0 100644
--- a/README.md
+++ b/README.md
@@ -4,7 +4,7 @@
 [![release](https://img.shields.io/github/v/tag/astragenie/runner-plugin?label=release&sort=semver)](https://github.com/astragenie/runner-plugin/releases)
 [![license](https://img.shields.io/github/license/astragenie/runner-plugin)](LICENSE)
 
-A Claude Code plugin that ships the Wiggin Loop methodology as a reusable
+A Claude Code plugin that ships the dev-crew method as a reusable
 layer: HARD RULE blocks, slice scaffold, plugin-owned loop-control docs, and a
 safe phase-gate runner.
 
@@ -81,7 +81,7 @@ Code prompt and let each finish before pasting the next:
   `<!-- runner:start -->` block. Re-installing replaces the block in
   place; user content outside it is preserved.
 - Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`:
-  `WIGGIN_LOOP.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`, plus
+  `DEV_CREW_METHOD.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`, plus
   `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md`. Always
   overwritten on re-install — customization lives in `.claude/loop.json`, not
   in these files. `aiLoopRoot` is a config path (see Configuration below);
diff --git a/commands/install.md b/commands/install.md
index 6c181954..00f77e63 100644
--- a/commands/install.md
+++ b/commands/install.md
@@ -6,10 +6,10 @@ auto_execute_steps: false
 
 # Install Autonomous Loop
 
-Adds the Wiggin Loop methodology to the current repo:
+Adds the dev-crew method to the current repo:
 
 - Replaces or appends the `<!-- runner:start -->` marker block in `CLAUDE.md` with the three HARD RULE blocks (Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate) plus the First Action section.
-- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`: `WIGGIN_LOOP.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`. **Always overwritten** — user customization lives in `.claude/loop.json`, not in these files.
+- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`: `DEV_CREW_METHOD.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`. **Always overwritten** — user customization lives in `.claude/loop.json`, not in these files.
 - Writes `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md` (always overwritten).
 - Creates backlog scaffolds at `<backlogPath>/{approved,completed,product-backlog}.md` and `<slicesRoot>/pending/.gitkeep` — **only if missing**, never clobbered.
 - Writes `.claude/loop.json` from the chosen preset — **only if missing**. This is a one-time scaffold: the preset's full content (`loop.*`, `stack.*`, `reviewers`, `mandatoryDocs`, `productName`/`productDescription`, `stackDescription`, `skills`/`fe`/`be`, `roles.*`) is inlined directly. After install, nothing at runtime reads `scripts/presets/*.json` again — `.claude/loop.json` is the sole source of truth (FEAT-218 Phase 2 / DEC-069).
@@ -17,7 +17,7 @@ Adds the Wiggin Loop methodology to the current repo:
   - **Fresh install** (no `.claude/loop.json` yet, `--preset` required): the preset's opt-in `light` block is merged into the config before the one-time scaffold write.
   - **Already-installed repo** (this is the common fleet-retrofit case — most of the fleet installed before this flag existed): `--preset` is not needed. The installer reads the existing `.claude/loop.json` directly and rewrites *only* `reviewers` and `loop.validation` in place — every other key (including hand-edited `productName`, `stack` overrides, etc.) is left byte-stable. It sources the trimmed-ladder values from the repo's own persisted `preset` name when resolvable, falling back to the fixed values above otherwise (identical across every shipped preset). Re-running `--light` against an already-trimmed repo is a no-op.
 
-If the repo currently has an ad-hoc HARD RULE block hand-pasted into CLAUDE.md (the pattern from WigginHarnes / MemoryService / AstraGenie.Tools), the installer migrates it: extracts the phase-gate commands into the config, deletes the ad-hoc block, writes the new marker-bracketed block in its place.
+If the repo currently has an ad-hoc HARD RULE block hand-pasted into CLAUDE.md (the pattern from legacy pre-dev-crew harness repos / MemoryService / AstraGenie.Tools), the installer migrates it: extracts the phase-gate commands into the config, deletes the ad-hoc block, writes the new marker-bracketed block in its place.
 
 **Hard dependency:** the `crew` plugin must be installed in the Claude Code plugin cache. The installer errors with a clear message if it cannot find `crew`.
 
diff --git a/commands/retrospective.md b/commands/retrospective.md
index 87e8f648..0e841bd3 100644
--- a/commands/retrospective.md
+++ b/commands/retrospective.md
@@ -72,5 +72,5 @@ Recommended cadences:
 - Phase close: `--since <phase-start-date>` (assess the phase)
 - Release retro: `--since <release-tag-date>` (post-mortem of shipped work)
 
-The Phase Completion Gate (Wiggin Loop HARD RULE) will auto-invoke this in
+The Phase Completion Gate (dev-crew method HARD RULE) will auto-invoke this in
 v0.1.7+; for v0.1.6 it's a manual command.
diff --git a/docs/ai-loop/00-entry/MASTER_PROMPT.md b/docs/ai-loop/00-entry/MASTER_PROMPT.md
index 7bd929b4..fbbaa1df 100644
--- a/docs/ai-loop/00-entry/MASTER_PROMPT.md
+++ b/docs/ai-loop/00-entry/MASTER_PROMPT.md
@@ -3,7 +3,7 @@
 ## Persona
 
 You are a senior engineer working on **Untitled product**, building it slice by
-slice according to the Wiggin Loop methodology.
+slice according to the dev-crew method.
 
 You write production code: no stubs, no TODOs, no placeholder implementations.
 Every slice you complete is buildable, testable, and leaves the codebase in a
@@ -23,7 +23,7 @@ Override productName and productDescription in .claude/loop.json after install.
 
 1. `CLAUDE.md` — repo memory, hard rules, anti-patterns
 2. `docs/architecture/platform-overview.md`
-3. `docs/ai-loop/01-loop-control/WIGGIN_LOOP.md`
+3. `docs/ai-loop/01-loop-control/DEV_CREW_METHOD.md`
 4. `docs/ai-loop/01-loop-control/EVIDENCE_RULES.md`
 5. `docs/ai-loop/01-loop-control/STOP_CONDITIONS.md`
 
@@ -41,7 +41,7 @@ Before beginning any implementation work, run this checklist and report findings
    criteria?
 
 Report: solution state, backlog state, current slice, key gaps. Then proceed
-to the current slice via the Wiggin Loop.
+to the current slice via the dev-crew method.
 
 ## Definition of done
 
diff --git a/docs/ai-loop/01-loop-control/DEV_CREW_METHOD.md b/docs/ai-loop/01-loop-control/DEV_CREW_METHOD.md
index 309d76ef..7ea1a7a4 100644
--- a/docs/ai-loop/01-loop-control/DEV_CREW_METHOD.md
+++ b/docs/ai-loop/01-loop-control/DEV_CREW_METHOD.md
@@ -1,6 +1,6 @@
-# Wiggin Loop — Autonomous Implementation Loop
+# dev-crew method — Autonomous Implementation Loop
 
-The wiggin loop is a strict iterative engineering loop.
+The dev-crew method is a strict iterative engineering loop.
 
 Its goal is to prevent the agent from stopping after a shallow implementation.
 
diff --git a/docs/ai-loop/backlog/completed-slices.md b/docs/ai-loop/backlog/completed-slices.md
index 0eb0d587..99c35321 100644
--- a/docs/ai-loop/backlog/completed-slices.md
+++ b/docs/ai-loop/backlog/completed-slices.md
@@ -1,7 +1,7 @@
 # Completed Slices — Untitled product
 
 Record of completed implementation slices. Append at the end of each slice as
-part of the Wiggin Loop close-out.
+part of the dev-crew close-out.
 
 ## Format
 
diff --git a/docs/demo/2026-07-18-qa-gate-demo-script.md b/docs/demo/2026-07-18-qa-gate-demo-script.md
index de953ec1..7dbeee07 100644
--- a/docs/demo/2026-07-18-qa-gate-demo-script.md
+++ b/docs/demo/2026-07-18-qa-gate-demo-script.md
@@ -1,4 +1,4 @@
-# Demo recording script — Wiggin Loop + pre-build QA gate (W4.1)
+# Demo recording script — dev-crew method + pre-build QA gate (W4.1)
 
 Target: ~3 min screen recording for README. Operator drives; every command is copy-paste ready. Rehearsed sandbox keeps it deterministic.
 
diff --git a/docs/prompts/2026-07-02-architecture-retrospective-prompt.md b/docs/prompts/2026-07-02-architecture-retrospective-prompt.md
index 8a0ce5b6..cd53f9e3 100644
--- a/docs/prompts/2026-07-02-architecture-retrospective-prompt.md
+++ b/docs/prompts/2026-07-02-architecture-retrospective-prompt.md
@@ -11,7 +11,7 @@
 You are a principal engineer doing a no-sacred-cows architecture retrospective of two
 tightly coupled Claude Code plugins:
 
-- **runner-plugin** (`C:\work\mega\runner-plugin`) — the Wiggin-Loop methodology layer:
+- **runner-plugin** (`C:\work\mega\runner-plugin`) — the dev-crew method layer:
   backlog intake/triage, slice ceremony, phase-gate runner, autonomous marathon loop,
   wave mode, GEPA optimization hooks, cost telemetry.
 - **crew / dev-team** (`C:\work\mega\dev-team`) — the specialist-agent execution layer:
diff --git a/docs/research/prompts/2026-07-18-competitive-audit-prompt.md b/docs/research/prompts/2026-07-18-competitive-audit-prompt.md
index 47c4edec..1cb173f5 100644
--- a/docs/research/prompts/2026-07-18-competitive-audit-prompt.md
+++ b/docs/research/prompts/2026-07-18-competitive-audit-prompt.md
@@ -34,7 +34,7 @@ separate subjects.
    ceremony, worktree parallelism, ship/review gates.
 
 2. **runner-plugin / loop** — `C:\work\mega\runner-plugin`
-   Wiggin-Loop methodology layer over crew: autonomous backlog walking, PM
+   dev-crew method layer over crew: autonomous backlog walking, PM
    triage, architect gate, wave mode, halt badges, cost telemetry, marathon
    checkpoints.
 
diff --git a/docs/superpowers/plans/2026-05-27-plugin-performance.md b/docs/superpowers/plans/2026-05-27-plugin-performance.md
index 8719ac6c..0cd52252 100644
--- a/docs/superpowers/plans/2026-05-27-plugin-performance.md
+++ b/docs/superpowers/plans/2026-05-27-plugin-performance.md
@@ -228,7 +228,7 @@ The `<!-- loop:start -->...<!-- loop:end -->` block in CLAUDE.md contains a summ
 ```markdown
 ## Autonomous Loop — HARD RULES (summary)
 
-This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.
+This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.
 
 - **Run until PASS.** Do not stop for confirmation.
 - **Marathon mode (default).** Loop walks entire backlog.
diff --git a/docs/superpowers/plans/2026-05-28-competitor-gap-audit.md b/docs/superpowers/plans/2026-05-28-competitor-gap-audit.md
index 149d0933..87e9606c 100644
--- a/docs/superpowers/plans/2026-05-28-competitor-gap-audit.md
+++ b/docs/superpowers/plans/2026-05-28-competitor-gap-audit.md
@@ -82,7 +82,7 @@ You are a `crew:researcher` subagent. Read-only investigation.
 
 ## Baseline you are comparing against
 
-- `loop` plugin (Wiggin-Loop methodology layer for Claude Code): HARD RULE blocks, slice scaffold (`/loop:slice from-feature|start|complete|grade`), phase-gate runner (`/loop:phase-gate`), backlog mgmt (FEAT/SPEC), grade trend + retrospectives, PM agent with 5-axis scoring + `autonomous_safe`, model routing per phase, per-invocation cache, validation gate at slice close.
+- `loop` plugin (dev-crew method layer for Claude Code): HARD RULE blocks, slice scaffold (`/loop:slice from-feature|start|complete|grade`), phase-gate runner (`/loop:phase-gate`), backlog mgmt (FEAT/SPEC), grade trend + retrospectives, PM agent with 5-axis scoring + `autonomous_safe`, model routing per phase, per-invocation cache, validation gate at slice close.
 - `crew` plugin (workflow harness for Claude Code): roles (lead, builder, reviewer, validator, deployer, researcher), gates (review, validation, deployment dev/prod, blocked, escalation), artifact discipline (`.claude/artifacts/crew/{runs,handoffs,reviews,validations,deployments,cost,cost-insights,agents}`), workflow-state badges, hero-crew CLI (`mark-badge`, `write-handoff`, `write-review-result`, `write-validation-result`, `write-final-synthesis`).
 
 ## Taxonomy — 10 axes
diff --git a/docs/superpowers/specs/2026-05-27-plugin-performance-design.md b/docs/superpowers/specs/2026-05-27-plugin-performance-design.md
index b0f95c67..52896e24 100644
--- a/docs/superpowers/specs/2026-05-27-plugin-performance-design.md
+++ b/docs/superpowers/specs/2026-05-27-plugin-performance-design.md
@@ -79,8 +79,8 @@ the affected listing.
 **Deduplication**:
 - CLAUDE.md: remove inline HARD RULES summary (20 lines). Keep only
   `@.claude/loop/rules.md` reference — full rules load on demand.
-- Merge `templates/wiggin-loop.md` content into `templates/loop-rules.md`
-  (they overlap 60%+). Remove wiggin-loop.md as separate file.
+- Merge `templates/dev-crew-method.md` content into `templates/loop-rules.md`
+  (they overlap 60%+). Remove dev-crew-method.md as separate file.
 - Compress `templates/master-prompt.md`: remove ceremony description
   already in rules (55 → 35 lines).
 
@@ -91,7 +91,7 @@ the affected listing.
   crew plugin already provides.
 
 **Files**: `CLAUDE.md`, `templates/loop-rules.md`,
-`templates/master-prompt.md`, `templates/wiggin-loop.md` (delete or merge)
+`templates/master-prompt.md`, `templates/dev-crew-method.md` (delete or merge)
 
 ### 4. Tool Failure Prevention — eliminate 6-9% waste
 
diff --git a/scripts/competitor-audit/researcher-prompt.md b/scripts/competitor-audit/researcher-prompt.md
index b83302ff..76e784b7 100644
--- a/scripts/competitor-audit/researcher-prompt.md
+++ b/scripts/competitor-audit/researcher-prompt.md
@@ -12,7 +12,7 @@ You are a `crew:researcher` subagent. Read-only investigation.
 
 ## Baseline you are comparing against
 
-- `loop` plugin (Wiggin-Loop methodology layer for Claude Code): HARD RULE blocks, slice scaffold (`/loop:slice from-feature|start|complete|grade`), phase-gate runner (`/loop:phase-gate`), backlog mgmt (FEAT/SPEC), grade trend + retrospectives, PM agent with 5-axis scoring + `autonomous_safe`, model routing per phase, per-invocation cache, validation gate at slice close.
+- `loop` plugin (dev-crew method layer for Claude Code): HARD RULE blocks, slice scaffold (`/loop:slice from-feature|start|complete|grade`), phase-gate runner (`/loop:phase-gate`), backlog mgmt (FEAT/SPEC), grade trend + retrospectives, PM agent with 5-axis scoring + `autonomous_safe`, model routing per phase, per-invocation cache, validation gate at slice close.
 - `crew` plugin (workflow harness for Claude Code): roles (lead, builder, reviewer, validator, deployer, researcher), gates (review, validation, deployment dev/prod, blocked, escalation), artifact discipline (`.claude/artifacts/crew/{runs,handoffs,reviews,validations,deployments,cost,cost-insights,agents}`), workflow-state badges, hero-crew CLI (`mark-badge`, `write-handoff`, `write-review-result`, `write-validation-result`, `write-final-synthesis`).
 
 ## Taxonomy — 10 axes
diff --git a/src/scripts/lib/loop-installer-scaffold.mts b/src/scripts/lib/loop-installer-scaffold.mts
index bbc2a6ed..6682653f 100644
--- a/src/scripts/lib/loop-installer-scaffold.mts
+++ b/src/scripts/lib/loop-installer-scaffold.mts
@@ -119,8 +119,8 @@ export async function writeLoopControlFiles(
   const loopRoot = tokens.aiLoopRoot!;
   const targets = [
     {
-      template: "wiggin-loop.md",
-      target: path.join(repoPath, loopRoot, "01-loop-control", "WIGGIN_LOOP.md"),
+      template: "dev-crew-method.md",
+      target: path.join(repoPath, loopRoot, "01-loop-control", "DEV_CREW_METHOD.md"),
       tokenize: false
     },
     {
diff --git a/src/scripts/lib/loop-installer-tokens.mts b/src/scripts/lib/loop-installer-tokens.mts
index ead1c48f..dfd4b9ff 100644
--- a/src/scripts/lib/loop-installer-tokens.mts
+++ b/src/scripts/lib/loop-installer-tokens.mts
@@ -48,7 +48,7 @@ function resolveLoopPath(config: Record<string, unknown>, key: string): string {
 function buildMandatoryDocsList(config: Record<string, any>, aiLoopRoot: string): string {
   const repoDocs = (config.mandatoryDocs || []).map((doc: string) => `\`${doc}\``);
   const loopControlDocs = [
-    `\`${aiLoopRoot}/01-loop-control/WIGGIN_LOOP.md\``,
+    `\`${aiLoopRoot}/01-loop-control/DEV_CREW_METHOD.md\``,
     `\`${aiLoopRoot}/01-loop-control/EVIDENCE_RULES.md\``,
     `\`${aiLoopRoot}/01-loop-control/STOP_CONDITIONS.md\``
   ];
diff --git a/src/scripts/lib/score-inference.mts b/src/scripts/lib/score-inference.mts
index 31b4075d..2079520d 100644
--- a/src/scripts/lib/score-inference.mts
+++ b/src/scripts/lib/score-inference.mts
@@ -4,7 +4,7 @@ import path from "node:path";
 import { pathExists } from "./paths.mjs";
 
 // Reads crew review + validation + deployment artifacts and infers baseline
-// scores per Wiggin Loop dimension. Heuristic-only; agent overrides during
+// scores per dev-crew method dimension. Heuristic-only; agent overrides during
 // grade edit. Best-effort — missing artifacts mean no inference, no error.
 
 const ARTIFACT_DIRS = {
diff --git a/src/tests/generate-metrics-band.test.mts b/src/tests/generate-metrics-band.test.mts
index 43d71b13..3294049f 100644
--- a/src/tests/generate-metrics-band.test.mts
+++ b/src/tests/generate-metrics-band.test.mts
@@ -123,7 +123,7 @@ async function writeReadmeFixture(repo: string): Promise<void> {
   const content = [
     "# loop",
     "",
-    "A Claude Code plugin that ships the Wiggin Loop methodology.",
+    "A Claude Code plugin that ships the dev-crew method.",
     "",
     "Depends on the `crew` plugin for artifact writers — loop emits Crew",
     "`validation-result` artifacts through `crew write-validation-result`.",
diff --git a/src/tests/loop-installer.test.mts b/src/tests/loop-installer.test.mts
index f71b8686..7a8f821e 100644
--- a/src/tests/loop-installer.test.mts
+++ b/src/tests/loop-installer.test.mts
@@ -193,7 +193,7 @@ test("installLoop writes marker block, loop-control files, backlog scaffold, con
 
   const loopRoot = path.join(repo, ".claude", "artifacts", "loop", "ai-loop");
   for (const rel of [
-    "01-loop-control/WIGGIN_LOOP.md",
+    "01-loop-control/DEV_CREW_METHOD.md",
     "01-loop-control/EVIDENCE_RULES.md",
     "01-loop-control/STOP_CONDITIONS.md",
     "00-entry/MASTER_PROMPT.md",
diff --git a/templates/backlog/completed-slices.md b/templates/backlog/completed-slices.md
index b3b3b65f..a311aea7 100644
--- a/templates/backlog/completed-slices.md
+++ b/templates/backlog/completed-slices.md
@@ -1,7 +1,7 @@
 # Completed Slices — {{productName}}
 
 Record of completed implementation slices. Append at the end of each slice as
-part of the Wiggin Loop close-out.
+part of the dev-crew close-out.
 
 ## Format
 
diff --git a/templates/claude-md-hard-rules.md b/templates/claude-md-hard-rules.md
index ee7e38a6..cd783bd7 100644
--- a/templates/claude-md-hard-rules.md
+++ b/templates/claude-md-hard-rules.md
@@ -3,7 +3,7 @@
 
 ## Autonomous Loop — HARD RULES (summary)
 
-This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.
+This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.
 
 - **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
 - **Auto mode (default — `loop.marathonMode: true`).** Loop walks the entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts. Iteration cap and soft `blocked` badge are advisory in this mode — set `loop.marathonMode: false` in `.claude/loop.json` to restore the legacy five-condition gating.
diff --git a/templates/dev-crew-method.md b/templates/dev-crew-method.md
index 0ed5157a..2c0fc2fa 100644
--- a/templates/dev-crew-method.md
+++ b/templates/dev-crew-method.md
@@ -1,6 +1,6 @@
-# Wiggin Loop — Autonomous Implementation Loop
+# dev-crew method — Autonomous Implementation Loop
 
-The wiggin loop is a strict iterative engineering loop.
+The dev-crew method is a strict iterative engineering loop.
 
 Its goal is to prevent the agent from stopping after a shallow implementation.
 
diff --git a/templates/loop-rules.md b/templates/loop-rules.md
index 990dd233..b9a43fc7 100644
--- a/templates/loop-rules.md
+++ b/templates/loop-rules.md
@@ -20,7 +20,7 @@ After all acceptance criteria for the current slice are PASS with evidence and a
 1. **Scan `{{specsRoot}}/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/runner:intake --spec`. New FEAT files land in `{{backlogRoot}}/pending/`.
 2. **Scan `{{backlogRoot}}/pending/`** — if any pending entries exist, run `/runner:triage` to score them; scored entries move to `{{backlogRoot}}/triaged/`.
 3. **Pick the highest-priority triaged feature** — order P0 > P1 > P2 > P3; break ties by lowest FEAT-NNN id ascending (oldest wins). Promote it: `/runner:start FEAT-NNN`.
-4. **Begin the Wiggin Loop on the new slice.** Acceptance criteria, evidence, review per `{{aiLoopRoot}}/01-loop-control/`.
+4. **Begin the dev-crew method on the new slice.** Acceptance criteria, evidence, review per `{{aiLoopRoot}}/01-loop-control/`.
 5. **On slice close** — run the Slice Close Ceremony (below). Do NOT skip it — every artifact is part of the slice's evidence record.
 
 If `{{backlogRoot}}/pending/`, `{{backlogRoot}}/triaged/`, and `{{specsRoot}}/` are all empty/satisfied, confirm via `/runner:spec-status` and stop. Never stop just because the backlog "feels empty." Slice/phase filename linkage and the auto-mode-vs-legacy gating table: `.claude/loop/rules-reference.md`.
@@ -69,7 +69,7 @@ Before dispatching any reviewer, pre-extract the slice spec's `Files:` list and
 Two ways to start work. Pick one per session — do **not** mix.
 
 - **`/crew:build` (interactive, single slice).** Lead-driven, lighter ceremony. No `/runner:start` required; no run-brief mandatory. The Slice Close Ceremony still applies if the change closes a slice.
-- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start → Wiggin Loop → Slice Close. Invoked via `/runner:auto`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.
+- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start → dev-crew method → Slice Close. Invoked via `/runner:auto`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.
 
 Never run both simultaneously against the same branch — they race on `workflow-state.json`. One-glance visibility into all slices: `cat .claude/state/crew/slice-progress.md`.
 
@@ -111,6 +111,6 @@ Read in this order, then pick the highest-priority PENDING slice:
 1. `{{aiLoopRoot}}/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
 2. `{{backlogPath}}/approved-slices.md` — pick highest-priority PENDING slice
 3. The slice file listed in `approved-slices.md` (under `{{slicesRoot}}/`)
-4. `{{aiLoopRoot}}/01-loop-control/WIGGIN_LOOP.md` — the loop sequence
+4. `{{aiLoopRoot}}/01-loop-control/DEV_CREW_METHOD.md` — the loop sequence
 5. `{{aiLoopRoot}}/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
 6. `{{aiLoopRoot}}/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop
diff --git a/templates/master-prompt.md b/templates/master-prompt.md
index c4238832..52d34f8d 100644
--- a/templates/master-prompt.md
+++ b/templates/master-prompt.md
@@ -3,7 +3,7 @@
 ## Persona
 
 You are a senior engineer working on **{{productName}}**, building it slice by
-slice according to the Wiggin Loop methodology.
+slice according to the dev-crew method.
 
 You write production code: no stubs, no TODOs, no placeholder implementations.
 Every slice you complete is buildable, testable, and leaves the codebase in a
@@ -38,7 +38,7 @@ Before beginning any implementation work, run this checklist and report findings
    criteria?
 
 Report: solution state, backlog state, current slice, key gaps. Then proceed
-to the current slice via the Wiggin Loop.
+to the current slice via the dev-crew method.
 
 ## Definition of done
 

```

## Files touched

### .claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md

```
# Untitled Claude Code plugin — Master Prompt

## Persona

You are a senior engineer working on **Untitled Claude Code plugin**, building it slice by
slice according to the dev-crew method.

You write production code: no stubs, no TODOs, no placeholder implementations.
Every slice you complete is buildable, testable, and leaves the codebase in a
better state than you found it.

## Product

Override productName and productDescription in .claude/loop.json after install.

## Stack

- TypeScript source (`src/scripts/**/*.mts`) run directly under Bun — no emitted `scripts/*.mjs` tree; relative imports keep the `.mjs` specifier extension and `tsc --noEmit` is typecheck-only
- Bun runtime (NodeNext module resolution, ES2022 target)
- `bun test --parallel` for tests, colocated in `src/tests/*.mts`
- Biome for lint/format (cap: cognitive complexity ≤15)
- Manifest validators: `src/scripts/validate-manifests.mts` (plugin.json + marketplace registry sync) and `src/scripts/validate-content-length.mts` (agents ≤300, skills ≤200 lines)

## Mandatory reading before starting a slice

1. `CLAUDE.md` — repo memory, hard rules, anti-patterns
2. `README.md`
3. `CHANGELOG.md`
4. `docs/code-conventions.md`
5. `.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md`
6. `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md`
7. `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md`



## First-response checklist

Before beginning any implementation work, run this checklist and report findings:

1. **Solution / project inspection** — which solution files, projects, agents,
   services are present? Match against what the slice expects.
2. **Backlog state** — read `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md`. Which is the
   highest-priority PENDING slice?
3. **Configuration** — read `.claude/loop.json`. Confirm the
   configured phase-gate commands still apply to the current repo state.
4. **Gap analysis** — what is missing relative to the current slice's acceptance
   criteria?

Report: solution state, backlog state, current slice, key gaps. Then proceed
to the current slice via the dev-crew method.

## Definition of done

A slice is complete only when:

- code exists and is wired into the application
- new tests cover new behavior (TDD per CLAUDE.md)
- build passes (per `.claude/loop.json` `stack.build`)
- relevant test suites pass (per `.claude/loop.json` `stack.test`)
- documentation is updated if architecture or interfaces changed
- a Crew `review-result` artifact is written (auto via commit bridge or
  manually via `/crew:write-review-result`)
- a Crew `final-synthesis` is written when the slice closes

Use `EVIDENCE_RULES.md` to mark each acceptance criterion PASS / PARTIAL / FAIL /
BLOCKED with the right kind of evidence.

```

### .claude/artifacts/loop/ai-loop/backlog/completed-slices.md

```
# Completed Slices — Untitled Claude Code plugin

Record of completed implementation slices. Append at the end of each slice as
part of the dev-crew close-out.

## Format

Each completed slice entry should include:

- **SLICE-NN: Title** as the section heading
- **Completed**: ISO date
- **PR or commit**: link or SHA
- **Acceptance criteria**: list with PASS / PARTIAL / FAIL / BLOCKED status
  per criterion, with evidence pointer
- **Tests added**: count + paths
- **Docs updated**: list of files
- **Phase-gate artifact** (if this slice closed a phase): path to
  `.claude/artifacts/crew/validations/phase-<N>-gate-<date>.md`
- **Risks / follow-ups**: anything left for a future slice

---

_No slices completed yet._

```

### .claude/loop/rules.md

```
# Autonomous Loop — HARD RULES

Plugin-managed by `/runner:install`. Do not edit by hand. Full rationale,
tables, and worked examples for the rules below: `.claude/loop/rules-reference.md`.

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ALL acceptance criteria for the current slice are met. Do NOT ask the user for confirmation, clarification, or approval at any point during implementation. Do NOT stop after implementation — run review, fix all findings, run validation, then write artifacts and push. Only stop when every acceptance criterion is marked PASS with evidence (per `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md`), or the work is externally blocked (missing infrastructure, secret, or external dependency that cannot be resolved without the user). If blocked, state the blocker clearly and stop there.**

## Auto Mode No-Approval — HARD RULE

When `.claude/loop.json::loop.autoMode` is `true` (default), the loop MUST NOT raise per-slice approval gates — not for `autonomous_safe: false` items, not for plan-preflight artifacts, not for architect recommendations. Treat every architect/plan/PM recommendation as ratified by standing operator authorization and proceed with dispatch. Never paraphrase the gate as an approval question in chat — pick the recommendation and proceed.

Stop only on: a `crew run escalated_to_human` badge, cost cap exceeded (`loop.costStopThreshold`), a stop condition per `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md`, or an external blocker unresolvable without the user.

## Cross-Slice Continuation — HARD RULE

After all acceptance criteria for the current slice are PASS with evidence and all artifacts written, automatically pick the next unit of work — without user confirmation:

1. **Scan `.claude/artifacts/loop/specs/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/runner:intake --spec`. New FEAT files land in `.claude/artifacts/loop/backlog/pending/`.
2. **Scan `.claude/artifacts/loop/backlog/pending/`** — if any pending entries exist, run `/runner:triage` to score them; scored entries move to `.claude/artifacts/loop/backlog/triaged/`.
3. **Pick the highest-priority triaged feature** — order P0 > P1 > P2 > P3; break ties by lowest FEAT-NNN id ascending (oldest wins). Promote it: `/runner:start FEAT-NNN`.
4. **Begin the dev-crew method on the new slice.** Acceptance criteria, evidence, review per `.claude/artifacts/loop/ai-loop/01-loop-control/`.
5. **On slice close** — run the Slice Close Ceremony (below). Do NOT skip it — every artifact is part of the slice's evidence record.

If `.claude/artifacts/loop/backlog/pending/`, `.claude/artifacts/loop/backlog/triaged/`, and `.claude/artifacts/loop/specs/` are all empty/satisfied, confirm via `/runner:spec-status` and stop. Never stop just because the backlog "feels empty." Slice/phase filename linkage and the auto-mode-vs-legacy gating table: `.claude/loop/rules-reference.md`.

## Orchestrator Model Gate — HARD RULE

After `/runner:start` returns, check `orchestratorModel` in the result. If it is non-null and does not match your current session model, STOP before any slice work. Exact stop text and restart command: `.claude/loop/rules-reference.md`. Resuming on the wrong model is a real cost mistake, not a formality.

## Slice Start Ceremony — HARD RULE

Open every slice through the canonical start command **before** beginning acceptance-criteria work:

1. **Identify the next slice.** Check `docs/superpowers/plans/*.md` for unchecked `## Task N: SLICE_NN` headings first; else fall back to Cross-Slice Continuation.
2. **`/runner:start <FEAT-NNN|SLICE-NN>`** — rotates `currentRun` via `crew write-run-brief`, seeds the goal from `## Objective`, rewrites `.claude/state/crew/slice-progress.md`.
3. **Inspect the return.** Confirm `runBrief.artifactPath` is populated and `workflow-state.json.currentRun.title` equals `SLICE-NN: <title>`. Surface errors and stop — never proceed against a stale run.
4. **Dispatch a crew builder subagent.** The return includes a `dispatchInstruction` — hand it to `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude`. There is no agent literally named `crew:builder`. Builder owns implementation only; when it returns, dispatch `crew:reviewer`, then `crew:validator` if behavior changed. **Do not implement inline.**
5. **Wait for builder, reviewer, and validator reports**, then run the Slice Close Ceremony.

Exception: manual invocations may pass `--no-dispatch`. The autonomous loop itself should never pass `--no-dispatch`.

## Dispatch Discipline — HARD RULE

The autonomous loop is an **orchestrator**, not an implementer. Every code-bearing unit of work runs through a crew subagent:

| Situation                                                          | Dispatch                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Slice implementation (acceptance criteria work)                    | a crew builder subagent — `crew:fullstack-dev` (or `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` |
| Bug found during slice (test fail, regression, integration error)  | `/crew:fix` subagent                                                                                 |
| Independent code review pass                                       | `/crew:review` subagent (or the configured reviewer ladder)                                          |
| Behavior validation when something is runnable                     | `/crew:validate` subagent                                                                            |
| Deployment / shipping a reviewed change                             | `/crew:ship` subagent                                                                                |
| Trivial inline fixup (typo, fixture path, single-line patch)       | Inline is fine — but log it in the run-brief                                                        |

Pivot triggers — any of these means **stop, dispatch `/crew:fix`, then resume**: a review_result with `status: needs_fix`; a validation_result with `status: fail`; a build/test failure that needs a root-cause hunt.

**Never use `caveman:*` agents for slice work** — they lack the full artifact protocol. Always use a real crew builder, `crew:reviewer`, `crew:validator`, `crew:release-engineer` — never `crew:builder`, which is not an agent.

**Dispatch budget:** maximum 3 subagent dispatches per slice. Inline execution for single-file edits, test/lint/format fixes. When in doubt, prefer dispatch — a subagent run produces its own artifact trail.

## Review Dispatch Budget — HARD RULE

Before dispatching any reviewer, pre-extract the slice spec's `Files:` list and AC criteria, and capture `git diff HEAD~1 -- <changed files>` inline. Dispatch spec-compliance and code-quality reviewers in one message (parallel), each scoped to the exact file list from the spec — no free-roaming reads, no full test suite. If spec review FAILS, fix then re-dispatch both; never run quality review on a failing spec. Full worked example: `.claude/loop/rules-reference.md`.

## Build Entry Points

Two ways to start work. Pick one per session — do **not** mix.

- **`/crew:build` (interactive, single slice).** Lead-driven, lighter ceremony. No `/runner:start` required; no run-brief mandatory. The Slice Close Ceremony still applies if the change closes a slice.
- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start → dev-crew method → Slice Close. Invoked via `/runner:auto`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.

Never run both simultaneously against the same branch — they race on `workflow-state.json`. One-glance visibility into all slices: `cat .claude/state/crew/slice-progress.md`.

## Slice Close Ceremony — HARD RULE

When every acceptance criterion is PASS with evidence, close the slice **before** picking up the next one. Manual file moves are NOT a substitute — they bypass artifact fan-out:

1. **`/runner:close SLICE-NN`** — atomically moves the slice to `completed/`, moves the linked feature to `done/`, reconciles parent SPEC status, captures grade + lessons, and fans out `handoffs/`, `runs/final-synthesis-*`, and `cost/`+`cost-insights/` artifacts.
2. **Inspect the ceremony return** — verify `handoffPath`, `synthesisPath`, and `costUsd` are populated. Fix any `{ error: ... }` before continuing.
3. **Apply Cross-Slice Continuation** to pick the next unit of work.

Expected artifact set per slice, all present before Cross-Slice Continuation: `reviews/`, `validations/`, `runs/run-brief-*.md`, `runs/final-synthesis-*.md`, `handoffs/*.md`, `cost/*-cost-report-*.md` + `cost-insights/*-cost-advise-*.md`. If any is missing for a closed slice, re-run the ceremony rather than continuing past it.

## Phase Completion Gate — HARD RULE

When the last slice in a phase completes, run `/runner:phase-gate`. The plugin executes every configured stage via `execFile` (no shell interpretation), captures output, and writes one validation artifact under `.claude/artifacts/crew/validations/phase-<N>-gate-<date>.md`. Do NOT proceed to the next phase on FAIL. Do NOT hand-author the gate artifact.

## Worktree Parallelism — HARD RULE

Run concurrent features in sibling git worktrees — each has its own `.claude/state/crew/workflow-state.json`:

1. Create one worktree per branch: `git worktree add ../repo-feat-a feat-a`.
2. Copy or git-track `.claude/loop.json` per branch.
3. Run the loop independently in each worktree.

Cost-attribution scoping order and the fleet-view command: `.claude/loop/rules-reference.md`. Constraints: each worktree must be on its own branch; never push from inside the autonomous loop; never run `/crew:build` and the autonomous loop simultaneously on the same worktree.

## Tool Discipline

- **Prefer dedicated tools over Bash.** Use Read/Grep/Glob for file operations. Reserve Bash for shell-only operations (git, npm, build commands).
- **Pre-validate paths.** Before file operations, verify the target exists. A failed tool call costs tokens for the error response plus the retry.
- **No speculative commands.** Plan the exact command before dispatching. Check flag syntax against the tool's help output if unsure.
- **Target: <2% tool failure rate per slice.** Cost reports track `toolFailureRate`. Above 5% triggers a cost advisory.

## First Action — Starting the Loop

Read in this order, then pick the highest-priority PENDING slice:

1. `.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
2. `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md` — pick highest-priority PENDING slice
3. The slice file listed in `approved-slices.md` (under `.claude/artifacts/loop/ai-loop/slices/`)
4. `.claude/artifacts/loop/ai-loop/01-loop-control/DEV_CREW_METHOD.md` — the loop sequence
5. `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
6. `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop

```

### ADOPTION.md

```
# Adoption Checklist — loop

Run through this before invoking `/runner:install` on a new repo or
re-running it on a repo that already has hand-pasted HARD RULE blocks.

## Prerequisites

- **Bun** installed and on `PATH` — the plugin's runtime. `bun --version`
  to check.
- **`crew` plugin** (>= v0.57.0, `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`)
  installed in Claude Code's plugin cache. `crew` must go in first; `loop`
  refuses to install against a missing or too-old crew. There's no separate
  CLI check to hand-run before install — the installer itself does the
  discovery and errors with a clear message if crew isn't found. If you want
  to confirm crew is live before starting, run `/crew:brief-me` (or, once
  `loop` is installed, `/runner:status` — its `crewCli` field is `null` if
  crew isn't discoverable).
- Repo has a `.git/` directory. Install fails fast on non-git targets.
- Repo has a `CLAUDE.md` (created automatically if missing).

## Step 0 — Install the plugins

These are three separate commands. Paste one at a time into the Claude Code
prompt and let each finish before pasting the next — pasting all three
together as one block is a common failure mode and one of them will silently
get swallowed.

```
/plugin marketplace add astragenie/astra-marketplace
/plugin install crew@astra
/plugin install loop@astra
```

## Step 1 — Back up `.claude/`

Cheap insurance, easy to discard:

```bash
cp -r .claude ".claude.backup.$(date -u +%Y%m%dT%H%M%SZ)-pre-autoloop"
```

## Step 2 — Pre-flight checks

1. **CLAUDE.md inspection** — does the repo already have hand-pasted
   `## Autonomous Loop Instruction — HARD RULE` blocks (the pattern some
   repos hand-authored before this plugin existed)? If yes, the installer
   migrates them automatically: extracts phase-gate commands into config,
   strips the ad-hoc blocks, writes the new `<!-- runner:start -->` /
   `<!-- runner:end -->` marker block in their place. Local customizations
   to those blocks beyond stack commands are not preserved — capture them
   first if you need them.
2. **Existing loop-control content** — once installed, files under
   `<aiLoopRoot>/01-loop-control/` and `<aiLoopRoot>/00-entry/` are
   plugin-owned and get overwritten on every re-install (`aiLoopRoot` is a
   config path — see Step 4; the built-in presets default it to
   `.claude/artifacts/loop/ai-loop`, not a `docs/` path). Anything
   hand-authored there should be moved out first.
3. **Backlog content** — `<backlogPath>/{approved-slices,completed-slices,
   product-backlog}.md` are scaffolded only if missing. Existing content is
   preserved verbatim.
4. **Slice content** — `<slicesRoot>/{pending,active,completed}/` are
   user-owned and untouched by re-install.

## Step 3 — Pick a preset

```
/runner:list-presets
```

Current built-ins:

| Preset | Stack |
| --- | --- |
| `dotnet-python` | C# .NET + Aspire + Python LangGraph agents + Terraform (split FE React + BE .NET) |
| `dotnet-only` | C# .NET backend only |
| `dotnet-react` | C# .NET backend + React / Vite frontend |
| `dotnet-typescript-vue` | C# .NET backend + Vue 3 / Vite (TypeScript) + Aspire |
| `typescript-plugin-dev` | TypeScript Claude Code plugin repos — Bun test + manifest validators |
| `typescript-service` | TypeScript Node service / daemon — Fastify, `tsc`, Vitest, JSON-schema contracts |

There is no default preset — `--preset` is required on a first-time install.
If none match closely, install with the closest one and override `stack.*`
commands in `.claude/loop.json` afterward. Presets are install-time
templates only: the chosen preset's content is inlined into
`.claude/loop.json` once, and nothing at runtime re-reads
`scripts/presets/*.json` after that.

## Step 4 — Install

```
/runner:install --preset <name>
```

The installer reports `writes` — the list of files it modified or created.
If ad-hoc-block migration happened, the first entry names the removed block.

## Step 5 — Configure

Edit `.claude/loop.json` and populate the repo-specific fields:

- `productName` — used in `MASTER_PROMPT.md` headings
- `productDescription` — used in `MASTER_PROMPT.md` "Product" section
- `stackDescription` — free-form bullets used in `MASTER_PROMPT.md` "Stack"
- `mandatoryDocs` — array of paths the agent must read before any slice
- `stack.build`, `stack.test`, `stack.frontendBuild`, `stack.infraPlan`,
  `stack.aspireBoot`, `stack.healthchecks` — the phase-gate suite (each
  stage is a `{cmd, args, cwd?}` triple; set a stage to `null` to disable it)

Optional but recommended: seed the memory config block with the idempotent
`memory-setup` subcommand. It sets `memory.project` to this repo's own
directory name — the per-repo project-id convention every repo should
follow so astramem recall/capture never collides across repos — plus the
`memory.feedback.creditLoop` shape the `validate-memory-config.mts` gate
expects. See README.md's "Memory integration" section for the full
contract; safe to re-run against an already-configured repo.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
```

Optional: set `loop.qa_gate: "pre-build"` to enable the pre-build QA gate
(independent test-plan authoring before the builder runs, plus a
`test_confidence >= 0.80` close gate). Note the close-refusal enforcement
has a deliberate 3-close warm-up on a fresh repo — the first 3 failing
closes warn and surface a `qaGradeGate` halt badge without blocking, and
only the 4th onward refuses the close (see `docs/halt-badges.md`). Don't
mistake the warn-only window for the gate being inert.

Then re-run install (omit `--preset` — it's read from the existing config)
to regenerate `MASTER_PROMPT.md` from the updated config:

```
/runner:install
```

## Step 6 — Verify

```
/runner:status
```

Should report:

- `preset` set to your chosen preset
- `hasMarkerBlock: true`
- `hasApprovedSlices: true`, `hasMasterPrompt: true`
- `crewCli` populated (not `null`)

Inspect the new files (paths below use this repo's `aiLoopRoot`/
`backlogPath`/`slicesRoot` config values — confirm yours via `/runner:status`
if you customized them):

- `CLAUDE.md` — should contain `<!-- runner:start -->...<!-- runner:end -->`
- `<aiLoopRoot>/01-loop-control/{DEV_CREW_METHOD,EVIDENCE_RULES,STOP_CONDITIONS}.md`
- `<aiLoopRoot>/00-entry/{MASTER_PROMPT,SLICE_TEMPLATE}.md`
- `<backlogPath>/{approved-slices,completed-slices,product-backlog}.md`
- `<slicesRoot>/pending/.gitkeep`
- `.claude/loop.json`

## Step 7 — First phase-gate run

Once you've completed a phase of work and your stack commands work in
isolation:

```
/runner:phase-gate --phase 1 --note "initial scaffold"
```

The plugin runs each configured stage, captures all output, writes
`<phaseGateArtifactDir>/phase-1-gate-<date>.md`, and registers the artifact
with the crew workflow state via `crew write-validation-result`.

If it returns `status: FAIL`, read the artifact body for the failing stage's
stdout/stderr tail. Fix the failure, then re-run the gate.

## Step 8 — Commit

```bash
git add CLAUDE.md .claude/loop.json <aiLoopRoot>
git commit -m "loop: install with <preset> preset"
```

Leave the `.claude.backup.*` directory locally for a few days, then delete
once the install is stable.

## Ongoing use

Once configured, `/runner:start` (no args) auto-picks the highest-priority
triaged FEAT and returns a `dispatchInstruction`; `/runner:start FEAT-NNN`
opens a specific one. `/runner:close` runs the atomic close ceremony.
See `README.md` § "Quickstart" for the full day-to-day command list.

## Light reviewer ladder rollout

`/runner:install --light` trims the default two-reviewer ladder down to a
single reviewer (Reviewer A) and delegates behavior/test validation to your
CI pipeline, by seeding two keys in `.claude/loop.json`:

- `reviewers.ladder: ["A"]` (default: `["A", "B"]`)
- `loop.validation.satisfiedByReview: true` (default: absent, treated as `false`)

This is the same configuration this repo (`runner-plugin`) and `dev-team`
already run day-to-day. A 2026-08-02 fleet audit found 13 of 15 consumer
repos still on the full `["A", "B"]` ladder with no `satisfiedByReview` —
every slice paying for a builder plus two reviewers plus an independent
validator at full context (one repo, astra-render, measured at a 7
dispatches/slice median, 397k tokens/message, 100% Opus). `--light` exists
so other repos can opt into that cheaper, already-proven configuration
deliberately, instead of copying `.claude/loop.json` by hand.

### When to trim

Trim when the repo has a **real CI test gate** — a CI job that runs the
actual test suite and blocks merge on failure, not just a lint/format
check. `loop.validation.satisfiedByReview: true` retires the dedicated
close-time validator dispatch and treats an evidenced reviewer-approval
badge as sufficient to satisfy the validation gate; CI becomes the thing
that actually proves behavior still works. If that CI gate exists and is
trustworthy, the second reviewer and the separate validator are largely
redundant with what CI already checks on every push.

### When NOT to trim

Keep the full `["A", "B"]` ladder — do not pass `--light` — when:

- **There is no CI test gate.** Nothing else in the pipeline verifies
  behavior, so `satisfiedByReview` would mean nothing independently
  checks that the slice actually works. No CI gate means keeping the
  two-reviewer ladder, full stop.
- **The work is high-risk or creative** — novel design surfaces,
  security-sensitive code, or anything where a second reviewer's
  independent judgment (not just "tests passed") is part of what you're
  paying for, even alongside solid CI.
- **The repo wants independent validation as policy** — e.g. regulated
  environments, or teams that deliberately want a validator artifact kept
  separate from reviewer sign-off, regardless of CI maturity.

### How to apply

- **Fresh install** (no `.claude/loop.json` yet — `--preset` is required
  on a first install either way):

  ```
  /runner:install --preset <name> --light
  ```

  The chosen preset's opt-in `light` block is merged over `reviewers` and
  `loop.validation` before the one-time `.claude/loop.json` scaffold write.

- **Already-installed repo** (the common case — most of the fleet
  installed before this flag existed):

  ```
  /runner:install --light
  ```

  No `--preset` needed. The installer reads the existing
  `.claude/loop.json` and rewrites only the `reviewers` and
  `loop.validation` keys in place — every other persisted key (hand-edited
  `productName`, `stack` overrides, etc.) is left byte-stable. It sources
  the trimmed values from the repo's own persisted `preset` name; if that
  name isn't resolvable (renamed/removed template, or a hand-authored
  config with no `preset` field at all), it falls back to the same fixed
  values every shipped preset carries (`reviewers.ladder: ["A"]`,
  `loop.validation.satisfiedByReview: true`). Safe to re-run: a repo
  already on the light ladder gets a byte-identical no-op.

  Verify by inspecting `.claude/loop.json` directly — `reviewers.ladder`
  should read `["A"]` and `loop.validation.satisfiedByReview` should read
  `true`.

Omitting `--light` entirely is fully backward compatible: install behaves
exactly as it did before this flag existed.

### How to revert

**Re-running install without `--light` does NOT revert the trim.** Install
only ever *merges the light block in* when `--light` is passed — it never
removes an existing `reviewers` / `loop.validation` setting. Re-running
with `--preset <name>` but no `--light` doesn't revert it either: the
installer only ever writes `.claude/loop.json` when the file doesn't exist
yet — the refresh computes a merge in memory but never persists it, so the
on-disk file (including a previously-trimmed `reviewers.ladder`) is left
completely untouched. There is no
`--unlight` / `--no-light` flag.

The only way back to the full two-reviewer ladder today is a manual edit
of `.claude/loop.json`:

1. Set `reviewers.ladder` back to `["A", "B"]`.
2. Remove `loop.validation.satisfiedByReview`, or set it to `false` (the
   validation gate checks for `=== true` specifically, so either has the
   same effect).

## Rollback

If something is wrong:

1. Restore the `.claude/` backup directory
2. Restore CLAUDE.md from git: `git checkout HEAD -- CLAUDE.md`
3. Remove the marker block manually if needed
4. Remove `<aiLoopRoot>/01-loop-control/` and `00-entry/` if you want them
   gone entirely

## Repos that should NOT adopt

- Throwaway / scratch repos — methodology overhead isn't worth it
- Repos already on a stricter in-house autonomous methodology that conflicts
  with the three HARD RULE blocks
- Repos where you can't commit `.claude/` and every contributor would need to
  re-install independently

```

### AGENTS.md

```
# runner-plugin — Agent Instructions

Claude Code plugin (marketplace name `loop`, plugin id `runner`, CLI namespace
`/runner:*`) that ships the dev-crew method as a reusable layer on top
of the `crew` plugin: PM-triaged backlog, slice-scoped specs with
Given-When-Then acceptance criteria, parallel-worktree wave dispatch,
phase-gate quality checks, and decision-grade retrospectives. Real, mature
product (185 FEATs shipped) — not template output. Full mission, decisions,
and volatile state: `CLAUDE.md` + `docs/memory.md`.

## Commands

Runtime is **Bun** — source `.mts` files run directly, no build/emit step.

```bash
bun install --frozen-lockfile
bun test src/tests/ --parallel --timeout 60000   # full suite, ~300 files (also: bun run test)
bun run typecheck                                 # tsc --noEmit, both tsconfig + tsconfig.test
bun run lint                                      # biome lint src/
bun run format / bun run format:check             # biome formatter
bun ./src/scripts/validate-manifests.mts          # plugin manifest sanity
bun ./src/scripts/validate-imports.mts            # slice-linker sub-module boundary
```

Full CI gate list (18 gates, all Bun-only, no `npm ci`/build step): `docs/ci-gates.md`.
Pre-push hook (`src/scripts/pre-push-validate.mts`) runs manifest + content-length
+ format-check locally before `git push`.

## Structure

```
src/scripts/            CLI entry (loop.mts) + lib/ (installer, phase-gate,
                         config-resolver, clause-registry, slice-linker, ...)
src/tests/               ~300 Bun test files, colocated by behavior
agents/                  Owned agent prompts (300-line cap; agents/3rdparty/ exempt)
commands/                Slash command definitions (/runner:*)
skills/                  Skill definitions (200-line SKILL.md cap)
templates/               Install-time templates rendered into ADOPTER repos —
                         PRODUCT surface, not this repo's own instructions
schemas/, hooks/, tools/ JSON schemas, Claude Code hooks, demo-seed tooling
docs/                    See docs/README.md for the full map
.claude/                 This repo dogfoods its own plugin (loop.json, backlog,
                         slices, grades) — see docs/memory.md for current state
```

## Style

- ESM only, no CommonJS. One responsibility per module; split at ~400 lines.
- Owned `agents/*.md` capped at 300 lines, `skills/**/SKILL.md` at 200
  (enforced by `validate-content-length`; `agents/3rdparty/` exempt — vendored).
- Relative imports keep the `.mjs` specifier extension even though the source
  is `.mts` (Bun/tsc resolve it) — there is no emitted `scripts/*.mjs` tree.
- Biome cognitive complexity capped at 15 — reduce via extracted helpers, not
  rule suppression.
- No `process.exit(N)` from library functions — set `process.exitCode` from
  entry points only.
- Tests colocated in `src/tests/*.mts`, behavior-descriptive names (no
  release-version prefixes).

## Credentials

- No secrets are committed. `.npmrc` carries only the `@astragenie:registry`
  pointer (no `_authToken` key) — actual registry auth token is supplied via
  environment, not this file.
- AstraRunner ingest token (`ingest_token` in `.claude-plugin/plugin.json`
  `userConfig`) is stored in the OS keychain via `bunx astrarunner connect
  <code>` (`src/scripts/cli/connect.mts`) — never written to `.claude/loop.json`,
  which carries only non-secret identifiers (url, tenantId, appId).

## Never-do

- No CommonJS, no shell-interpreted phase-gate commands — the phase-gate
  runner uses `execFile` with argv arrays only (no injection surface).
- No local Claude Code marketplaces — always register from GitHub
  (`"source": "github"`), never a local path. See `.claude/crew/plugin-marketplace.md`.
- No stale pre-transfer owner (`sergeymilashico`) in authored surfaces
  (README, ADOPTION, `src/`, `docs/`, `commands/`, `skills/`, `agents/` excl.
  `3rdparty/`, `.claude-plugin/`) — the owner is `astragenie`; GitHub's
  redirect makes old refs silently rot undetected
  (`bun ./src/scripts/validate-org-refs.mts` is the CI gate).
- No phantom `crew:<name>` / `runner:<name>` dispatch tokens in CLAUDE.md —
  every reference must resolve to a real agent/command/skill
  (`bun ./src/scripts/validate-agent-refs.mts`).
- No hand-edits inside the `<!-- runner:start -->...<!-- runner:end -->`
  marker block in `CLAUDE.md` — it's regenerated by `/runner:install` from
  `templates/claude-md-hard-rules.md`; edit `.claude/loop.json` instead.
- No editing `templates/`, `commands/`, `skills/`, `agents/` content casually
  when the goal is fixing *this repo's own* docs — those ship to adopter
  repos as product surface.

```

### CLAUDE.md

```
# Repo Instructions — dev-crew

## Mission

**dev-crew** (plugin id `devcrew`) is the unification of two Claude Code
plugins into a single engineering-OS plugin:

- **crew** (repo `astragenie/dev-team`) — the ceremony layer: a
  dispatcher-guided engineering workflow with bounded specialist subagents
  (builders, reviewers, verifiers, architects), quality gates, inspectable
  handoff artifacts, GEPA prompt optimization, and cost/observability
  tooling. Slash commands (`/crew:build`, `/crew:fix`, `/crew:ship`) act as
  dispatchers that fan out to 23+ first-party agents guided by 70+ tiered
  skills.
- **runner** (repo `astragenie/runner-plugin`, marketplace name `loop`) —
  the autonomous layer on top of crew: a PM-triaged backlog, slice-scoped
  Given-When-Then specs, parallel-worktree wave dispatch, phase-gate quality
  checks, marathon-mode autonomous backlog walks, and decision-grade
  retrospectives. (Formerly branded under a different working name — that
  name is retired; the unified methodology is simply called **dev-crew**.)

Today the two plugins couple across a fragile seam: runner resolves the crew
CLI from the plugin cache (`MIN_CREW_VERSION` gating), bridges to it through
a 700+ line `execFile` layer, and parses crew-authored artifacts; crew reads
`.claude/loop.json` as a shared contract and references runner ceremonies by
name. That seam has produced recurring failure classes — silent
agent-rename phantoms, version-floor bumps, marketplace version drift, and a
standing queue of cross-repo "upstream request" files.

dev-crew merges both codebases into one repo and (eventually) one plugin so
the seam becomes ordinary function calls under a single release train, a
single agent/skill registry, a single CI gate list, and a single test suite.

## Decided constraints (operator decisions, 2026-08-18 — do not relitigate without operator)

- **Runtime**: Bun-first everywhere. `.mts` sources run directly under Bun,
  no build/emit step; tests run `bun test --parallel` wherever possible.
  dev-team's Node `--experimental-strip-types` fallback (ADR-002) and its
  no-`--parallel` workaround are legacy to migrate away from — before
  dropping the workaround, verify the Bun scheduler bug ADR-002 was written
  against is fixed or not triggered by the migrated suites; quarantine (not
  serialize globally) any suite that still trips it.
- **Naming**: the methodology and plugin are both called **dev-crew**
  (plugin id `devcrew`). The prior working-name branding is retired — do not
  carry it into docs, templates, prompts, or command text; scrub it during
  content import.

## Ground rules for this repo

- **The merge itself is not yet decided in shape.** Planning artifacts live
  in `docs/planning/`. The decision brief (merge vs shared-package
  extraction vs status quo) gates any phase plan; the phase plan gates any
  code import. Do not start importing source from either parent repo
  without an approved plan.
- **Parent repos are read-only inputs.** `C:\work\mega\dev-team` and
  `C:\work\mega\runner-plugin` are the sources of truth for behavior; never
  edit them from work scoped to this repo.
- **This repo dogfoods the harness it will absorb** — crew + runner are
  installed here so the merged plugin is planned and built through its own
  backlog/slice/review ceremony.
- Sole operator, no external adopters to protect. Migration concerns are
  bounded to this machine's repos.
- Baseline commit discipline: no commits unless the operator asks.

## Authority documents

- `docs/planning/merge-plan-prompt-v1.md` — first-draft planning prompt
  (superseded by v2 once written; keep for provenance).
- Parent-repo authority docs: `dev-team/CLAUDE.md`, `dev-team/AGENTS.md`,
  `runner-plugin/CLAUDE.md`, `runner-plugin/AGENTS.md`,
  `runner-plugin/docs/memory.md` — read before relying on any claim about
  either parent's behavior.

<!-- crew:start -->
<!-- Crew framework memory. Run /crew:install after plugin updates that change framework memory. -->
@.claude/crew/constitution.md
<!-- crew:end -->

<!-- runner:start -->
<!-- Installed by /runner:install. Edit .claude/loop.json to change stack-specific commands; re-run /runner:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks the entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts. Iteration cap and soft `blocked` badge are advisory in this mode — set `loop.marathonMode: false` in `.claude/loop.json` to restore the legacy five-condition gating.
- **Slice start ceremony.** Every slice MUST open via `/runner:slice start --id SLICE-NN` (rotates `currentRun` so cost auto-emit attributes the work correctly + refreshes `.claude/state/crew/slice-progress.md`).
- **Dispatch discipline.** The loop is an orchestrator, not an implementer. Hand the `slice start` return's `dispatchInstruction` to a crew builder subagent — `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` (implementation only; there is no agent literally named `crew:builder`); after it returns, dispatch `crew:reviewer`, then `crew:validator` if behavior changed; pivot to `/crew:fix` on any needs_fix or fail. Inline implementation is reserved for trivial single-line fixups.
- **Slice close ceremony.** Every slice MUST close via `/runner:slice complete --id SLICE-NN` (writes handoff + final-synthesis + cost-report + cost-advise) followed by `/runner:slice grade*`. Manual file moves + a `docs(slice): mark ... complete` commit are NOT a substitute.
- **Build entry points.** `/crew:build` is the interactive single-slice path (lighter — no run-brief required). Autonomous loop is the unattended multi-slice path (full ceremony). Never run both against the same branch — they race on workflow-state.
- **Auto-continue.** After the ceremony, scan `.claude/artifacts/loop/specs/` → `.claude/artifacts/loop/backlog/pending/` → `.claude/artifacts/loop/backlog/triaged/` and promote the next item without asking.
- **Phase gate.** When the last slice in a phase completes, run `/runner:phase-gate` before starting the next phase.
- **Worktree parallelism.** Run parallel features in sibling git worktrees — each has its own `.claude/state/`. Cost attribution is auto-scoped per worktree. Use `crew fleet --repo "$PWD"` for a one-glance view. Never check out the same branch twice; never push from inside the loop.

First action when starting the runner: read `.claude/loop/rules.md` → `.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md` → `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md`.

<!-- runner:end -->

```

### README.md

```
# loop

[![test](https://github.com/astragenie/runner-plugin/actions/workflows/test.yml/badge.svg)](https://github.com/astragenie/runner-plugin/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/tag/astragenie/runner-plugin?label=release&sort=semver)](https://github.com/astragenie/runner-plugin/releases)
[![license](https://img.shields.io/github/license/astragenie/runner-plugin)](LICENSE)

A Claude Code plugin that ships the dev-crew method as a reusable
layer: HARD RULE blocks, slice scaffold, plugin-owned loop-control docs, and a
safe phase-gate runner.

Depends on the [`crew`](https://github.com/astragenie/dev-team) plugin
(>= v0.57.0) for artifact writers — loop emits Crew
`validation-result` artifacts through `crew write-validation-result`.

<!-- demo-recording: pending W4.1 asciinema asset -->

<!-- metrics-band:start -->
_Dogfood metrics — generated 2026-08-06. Every number below is computed from this repo's own artifacts; regenerate with `bun src/scripts/generate-metrics-band.mts --write`._

| Metric | Value |
|---|---|
| FEATs shipped (done) | 196 |
| Slices closed, last 90 days | 171 |
| Grade average, last 5 slice closes | 0.862 (n=151 total) |
| median per slice-close session scan | $4.832 (mean $6.707, +38.8% divergence) |
| Halt badges documented | 16 |
| CI gates enforced | 19 |

Sources:
- FEATs shipped / slices closed: `.claude/artifacts/loop/backlog/done/*.md` frontmatter (`completed_at`, `slices`).
- Grade average: `.claude/artifacts/loop/grades/*.md` — composite of the last 5 grade files.
- Cost scan: `.claude/artifacts/crew/cost/*-cost-report-*.md` `usd` field, last 20 reports (`loadCostReportUSDValues`).
- Halt badges: `docs/halt-badges.md` registry (every per-badge `### ` section + wave-mode badges table).
- CI gates: `CLAUDE.md` § "CI gates" numbered list.
<!-- metrics-band:end -->

## How this compares

Positioning we can back with an artifact, not a slogan — every claim below
either cites a file in this repo or a specific PR/issue. Compared against
"generic agent platforms" as a category, not any named product.

| Dimension | Loop (this repo) | Generic agent platforms |
| --- | --- | --- |
| Halt/stop enforcement | Documented halt badges (see metrics band above; `docs/halt-badges.md`), each with an explicit `Fires when` condition wired into either the walker's `stop-conditions.mts` snapshot or the close-time gate pre-flight, and fanned out as `halt_badge` / `halt_badge.resolved` webhook events — not just prose guidance. | Typically prose-only "best practices" or a single generic stop condition, with no cross-plugin fan-out contract to verify a badge actually fired. |
| Prompt optimization | One fully auditable live promotion: GEPA judge trial `c948e52c`, `aiplugin-dev` 1.2.3→1.2.4 (CHANGELOG-traceable). Default candidate generation is synthetic string mutation — real LLM reflection only runs behind an explicit flag, and that distinction is documented rather than blurred. | Often marketed as "self-improving" or "reflective" with no public trial artifact a reader can open and verify. |
| CI enforcement | CI gates enforced (see metrics band above; `CLAUDE.md` § "CI gates"), several traced directly to a production incident retro — e.g. phantom-agent dispatch (#371), stale pre-transfer owner refs (#474), worktree-hang quarantine (#355). | Gate counts, when published, are rarely tied to a named incident a reader can look up. |
| Cost reporting | Median per slice-close session scan reported alongside the mean with a divergence flag, so a skewed average can't hide behind a single headline number (see metrics band above). | Cost claims are usually a single average, or omitted entirely. |
| Access | `/plugin install loop@astra` — self-serve, no waitlist, on any tier. | Some competing "self-learning" agent platforms gate every pricing tier, including free, behind a waitlist. |

_Comparison reflects publicly documented positioning as of 2026-07-18._

## Install

These are three separate commands — paste one at a time into the Claude
Code prompt and let each finish before pasting the next:

```
/plugin marketplace add astragenie/astra-marketplace
/plugin install crew@astra
/plugin install loop@astra
```

`crew` must be installed first. Minimum compatible release: `v0.57.0`
(`src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`). See
[ADOPTION.md](ADOPTION.md) for new-repo onboarding.

> **Marketplace history:**
>
> - Pre-v0.8.7: shipped via the `hero-crew` repo (paired releases).
> - v0.8.7–v0.41.x: shipped from its own `loop` marketplace, decoupled.
> - v0.41.0+: shipped from the central `astragenie/astra-marketplace`
>   alongside `crew` and `cortex`. Plugin code stays in
>   [`astragenie/runner-plugin`](https://github.com/astragenie/runner-plugin); the
>   marketplace registry is its own repo.

## What it does

- Installs three HARD RULE blocks in your repo's CLAUDE.md (Autonomous Loop,
  Cross-Slice Continuation, Phase Completion Gate) inside a marker-bracketed
  `<!-- runner:start -->` block. Re-installing replaces the block in
  place; user content outside it is preserved.
- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`:
  `DEV_CREW_METHOD.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`, plus
  `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md`. Always
  overwritten on re-install — customization lives in `.claude/loop.json`, not
  in these files. `aiLoopRoot` is a config path (see Configuration below);
  the built-in presets default it to `.claude/artifacts/loop/ai-loop`, not a
  `docs/` path.
- Scaffolds the backlog at `<backlogPath>/`
  (`approved-slices.md`, `completed-slices.md`, `product-backlog.md`) — only
  written if missing.
- Ships a phase-gate runner that executes `{cmd, args, cwd}` triples via
  `execFile`. No shell interpretation. No injection surface from preset or
  config values.
- Auto-migrates existing ad-hoc HARD RULE blocks (the hand-pasted version some
  repos shipped before this plugin existed) into the marker-bracketed form,
  extracting phase-gate commands into the config along the way.

## Quickstart

In a repo with `crew` already installed:

```bash
/runner:install --preset dotnet-python
```

Then edit `.claude/loop.json` to set `productName`,
`productDescription`, and `stack.*` commands for the repo. Re-run install to
regenerate `MASTER_PROMPT.md` from the updated config.

Once configured:

```bash
/runner:status          # health check
/runner:start           # no args: auto-picks the highest-priority triaged FEAT
/runner:start FEAT-NNN  # start a specific FEAT (creates the slice file)
/runner:phase-gate --phase 4 --note "ingestion phase close"
/runner:list-presets    # see built-in presets
```

`/runner:start` subsumes the older `next-slice` / `derive-slice` /
`slice-from-feature` commands — those no longer exist as standalone slash
commands.

## Configuration

`.claude/loop.json` schema:

```jsonc
{
  "preset": "dotnet-python",
  "loop": {
    "aiLoopRoot": ".claude/artifacts/loop/ai-loop",
    "backlogPath": ".claude/artifacts/loop/ai-loop/backlog",
    "slicesRoot": ".claude/artifacts/loop/ai-loop/slices",
    "phaseGateArtifactDir": ".claude/artifacts/crew/validations"
  },
  "stack": {
    "build": [{ "cmd": "dotnet", "args": ["build", "src/MySolution.slnx", "-c", "Release"] }],
    "test": [
      { "cmd": "dotnet", "args": ["test", "src/MySolution.slnx", "-c", "Release"] },
      { "cmd": "pytest", "args": [], "cwd": "src/python-agent" }
    ],
    "frontendBuild": { "cmd": "npm", "args": ["run", "build"], "cwd": "frontend/dashboard" },
    "infraPlan": { "cmd": "terraform", "args": ["plan"], "cwd": "infra/envs/dev" },
    "aspireBoot": { "cmd": "dotnet", "args": ["run", "--project", "src/AppHost"] },
    "healthchecks": ["http://localhost:5200/healthz", "http://localhost:8080/healthz"]
  },
  "reviewers": { "ladder": ["A", "B"] },
  "mandatoryDocs": ["docs/architecture/platform-overview.md"],
  "productName": "My Product",
  "productDescription": "One-line product description",
  "stackDescription": "Free-form bullets about the stack (used in MASTER_PROMPT.md)"
}
```

Every stage is a `{cmd, args, cwd?}` triple — the argv array is what makes
phase-gate injection-safe. Set any stage to `null` to disable it. `aspireBoot`
is auto-skipped if `healthchecks` is empty (otherwise it would hang).

## Agent model tiers

Most owned agents run on the harness default model. A few are pinned to a
specific tier via the `model:` field in the agent's own frontmatter
(`agents/<name>.md`) — no `.claude/loop.json` plumbing involved:

| Agent | Pinned model | Why |
| --- | --- | --- |
| `runner:pm` | `opus` | Five-dimension scoring + inline AC/SPEC drafting benefits from the strongest tier. |
| `runner:researcher` / `runner:market-researcher` | `haiku` | Read-only lookups, cheapest tier suffices. |
| `runner:swarm` | `sonnet` | Dispatch orchestration, not deep reasoning. |
| `runner:document-writer` | `sonnet` | Markdown drafting (FEAT-270, 2026-08-02): a fleet cost audit found Opus at 87-100% of USD spend in most repos, while repos running non-Opus tiers landed noticeably cheaper per slice at comparable context size. Documentation work doesn't need Opus-tier reasoning, so `document-writer` is pinned to Sonnet. |

To use a different tier for an agent, edit that agent's `model:` frontmatter
field directly — there is no config-level override for individual roles yet
(a `preset.roles.<role>.model` knob was considered for this FEAT and
explicitly deferred; broader tier moves for other roles, like builder or
reviewer, need an eval gate before they're considered).

## Built-in presets

Presets are **install-time templates only** (FEAT-218 Phase 2 / DEC-069):
`/runner:install --preset <name>` inlines the chosen template's full content
into `.claude/loop.json` once, at scaffold time, and nothing at runtime reads
`scripts/presets/*.json` again. There is no default — `--preset` is required
for a first-time install.

| Preset                   | Stack                                                                            |
| ------------------------ | -------------------------------------------------------------------------------- |
| `dotnet-python`          | C# .NET + Aspire local orchestration + Python LangGraph agents + Terraform infra (split FE React + BE .NET) |
| `dotnet-only`            | C# .NET backend only — no frontend, Aspire, or Python sidecars                    |
| `dotnet-react`           | C# .NET backend + React / Vite frontend                                          |
| `dotnet-typescript-vue`  | C# .NET backend + Vue 3 / Vite (TypeScript) frontend + .NET Aspire               |
| `typescript-plugin-dev`  | TypeScript Claude Code plugin repos — Bun test + manifest validators             |
| `typescript-service`     | TypeScript Node service / daemon — Fastify + better-sqlite3 / sqlite-vec, `tsc`, Vitest, JSON-schema contracts |

More templates ship as new repo types surface. See `scripts/presets/` to author your own.

## Plugin architecture

Runtime is Bun; source `.mts` files run directly — there is no emitted
`scripts/*.mjs` tree.

- `src/scripts/loop.mts` — CLI entry
- `src/scripts/lib/loop-installer.mts` (+ `loop-installer-scaffold.mts`,
  `loop-installer-tokens.mts`) — template render + marker-block merge +
  scaffold writer + ad-hoc HARD RULE block migration
- `src/scripts/lib/phase-gate.mts` — `execFile`-only runner + markdown report
- `src/scripts/lib/config-resolver.mts` — reads `.claude/loop.json` at runtime
  (no preset merge post-install); merges a named preset template only when
  the installer scaffolds a fresh config
- `src/scripts/lib/plugin-identity.mts` — marketplace/plugin name discovery,
  reused from the crew plugin's pattern
- `src/scripts/lib/hierarchical-dispatch.mts` — hierarchical parallel subagent
  dispatch primitive (FEAT-020 SLICE-1); barrel re-export of the
  `dispatch-*.mts` modules

## Hierarchical dispatch (`runner:swarm`, FEAT-020 SLICE-1)

A parent agent can spawn N parallel child subagents in isolated git worktrees,
block on `awaitAll`, then merge DONE children to the parent branch in priority
order. Children themselves can recurse (grandchildren fork off the child's
branch).

### Config (`.claude/loop.json`, namespace `dispatchLimits`)

```json
{
  "dispatchLimits": {
    "maxDepth": 3,
    "maxChildrenPerBatch": 8,
    "worktreeRoot": null,
    "pruneStaleAfterDays": 7
  }
}
```

| Key                   | Default | Meaning                                                                             |
| --------------------- | ------- | ----------------------------------------------------------------------------------- |
| `maxDepth`            | 3       | Recursion cap. `0` = top level. Child at `maxDepth` cannot spawn grandchildren.     |
| `maxChildrenPerBatch` | 8       | Per-call fanout cap. Refuse to spawn if `plans.length > cap`.                       |
| `worktreeRoot`        | `null`  | Override worktree parent dir; `null` = sibling of repo (same as `parallel-runner`). |
| `pruneStaleAfterDays` | 7       | Orphan `dispatch/<runId>/` directory warning threshold.                             |

### CLI surface

```bash
bun src/scripts/loop.mts dispatch prepare \
  --plan plan.json --parent-branch slice/SLICE-90 [--repo .] [--depth 0] [--json] [--dry-run]

bun src/scripts/loop.mts dispatch finalize \
  --run-id <id> --parent-branch slice/SLICE-90 --plan plan.json [--repo .] [--depth 0]
```

In production, the `runner:swarm` agent runs `prepare`, invokes
the Agent tool with the returned batch in **one message**, then runs `finalize`.

### Telemetry artifacts

- `.claude/artifacts/loop/dispatch/<runId>/worktrees.jsonl` — spawn log
- `.claude/artifacts/loop/dispatch/<runId>/trace.jsonl` — per-child result + duration + cost (per-child `costUsd` in the marker stays `null`; run-level totals are populated in `dispatch-metrics.json` by `finalize`, see FEAT-220)
- `.claude/artifacts/loop/dispatch/<runId>/<childId>.result.json` — canonical child result (marker)
- `.claude/artifacts/loop/dispatch/<runId>/summary.md` — human-readable run summary

### Out of scope for SLICE-1

`crew:parallel-runner` refactor (SLICE-2), truly-async non-blocking parent, cancellation,
`--resume`, cost rollup, budget cap (FEAT-133), per-skill cost (FEAT-165).

## Wave mode

Opt-in marathon runner that dispatches N independent slices per "wave" into
parallel git worktrees, merges PASS branches, pivots FAIL slices into
`/crew:fix` next wave, and loops until standard stop-check fires.

Enable in `.claude/loop.json`:

```json
{
  "loop": {
    "marathonRunner": "wave",
    "wave": { "size": 3, "sliceCommand": "/crew:orchestrate-slice" }
  }
}
```

Run via `/runner:wave loop` (or `/runner:auto` once `marathonRunner: "wave"` is
set — auto routes to wave automatically).

Slice prerequisite: `touches_files` in slice frontmatter. Spec-writer
populates this automatically; CI gate
(`bun ./src/scripts/validate-slice-touches-files.mts`) warns when missing.
Slices without `touches_files` dispatch solo (wave size collapses to 1 for
that slot) rather than blocking the planner.

See `commands/wave.md` for full subcommand reference and
`docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md` for design
rationale.

## Tests

```bash
bun test src/tests/ --parallel --timeout 60000
```

(also `bun run test`). ~300 test files under `src/tests/`. Tests that
require the `crew` CLI in the Claude Code plugin cache skip cleanly when
crew is not installed.

## Marketplace

Shipped from the central `astragenie/astra-marketplace` registry alongside
`crew` and `cortex` (see "Marketplace history" above) — that registry's
`marketplace.json` is the source of truth for the published `loop` entry, not
this repo. Plugin code stays in this repo
([`astragenie/runner-plugin`](https://github.com/astragenie/runner-plugin)).
`bun ./src/scripts/validate-marketplace-sync.mts` is a CI gate that fails a
push if the registry's pinned version drifts from `.claude-plugin/plugin.json`
here.

## Hard dependency on `crew`

The phase-gate runner writes its validation artifact through
`crew write-validation-result`. Install errors with a clear message if the
crew CLI is not discoverable in `~/.claude/plugins/cache/astra/crew/*/`.

If you install `crew` under a different marketplace name, set
`CREW_MARKETPLACE_NAME` in the environment before invoking
loop CLI commands.

## What it doesn't do (v1 scope)

- Slice review automation — Reviewer A / Reviewer B passes remain manual
- Phase numbering — agent assigns phase numbers when invoking `phase-gate`
- Cross-repo backlog aggregation
- Web UI / dashboard
- Auto-detect when a phase boundary is reached (agent decides based on slice
  metadata)

See `ADOPTION.md` for a step-by-step adoption checklist when bringing the
plugin into an existing repo.

## Memory integration

Runner is live-wired to the **astramem** MCP server (no longer a dormant
CLI-spawn bridge — `src/scripts/lib/memory-bridge.mts` was retired by
FEAT-235). GEPA-shaped events flow in-process through
`src/scripts/lib/memory-gepa.mts` / `memory-sink.mts` on slice start,
`runner:close` (grade write), and `runner:phase-gate` FAIL — recall on slice
start, remember on close.

Set `memory.enabled: "never"` in `.claude/loop.json` to disable both recall
and emit. See `docs/sop/memory-bridge.md` for the full wire contract.

### Per-repo project id convention

`memory.project` in `.claude/loop.json` is the astramem project namespace —
it scopes every `recall_memory`/`remember` call so one repo's slice history
never bleeds into another's. The convention: **set it to the repo's own
checkout directory name.** This repo is the worked example — its own
`.claude/loop.json` sets `memory.project: "runner-plugin"`, matching the
`runner-plugin` directory, and `CLAUDE.md`'s "Memory binding (astramem)"
section spells out why that value has to stay in sync with whatever the
loop's runtime sends (an explicit `memory.project` always wins over the
`productName` fallback `grade-writer.mts`/`memory-sink.mts` fall back to
when no override is set — see `docs/sop/memory-bridge.md`).

Seed (or migrate) a repo onto this convention with the idempotent
`memory-setup` subcommand (`commands/memory-setup.md`, mirrors
`runner:cost-setup`'s pattern): it defaults `memory.project` to the repo
directory's basename whenever nothing is already set, and never touches an
existing value — including an explicit `enabled: false` opt-out.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
```

The same command also writes `memory.enabled`, `memory.profile.topLessons`,
and `memory.feedback.creditLoop.{enabled,k}` to match the shape
`validate-memory-config.mts` checks for — override any field inline with
`--features "project=my-repo,topLessons=15,creditLoopK=7"`.

### Fleet rollout (FEAT-274)

As of 2026-08-02, 13 of the 15 repos in the fleet ship with no `memory`
block in `.claude/loop.json` at all — no recall, no creditLoop, agents
re-learn everything per session. That gap is the root cause behind the
1.6% usefulness finding in runner-plugin#525 (creditLoop is proven out in
`dev-team` and in this repo already). Bringing an unseeded repo onto the
convention is one command, run from inside that repo, plus a check:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/validate-memory-config.mts"
```

The second command is this repo's own CI gate (`bun
./src/scripts/validate-memory-config.mts`, CI gate #17 — see
`docs/ci-gates.md`); invoking it via `${CLAUDE_PLUGIN_ROOT}` from another
repo validates that repo's own `.claude/loop.json` the same way.

```

### commands/install.md

```
---
name: install
description: Install or refresh the loop methodology layer in this repo (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
auto_execute_steps: false
---

# Install Autonomous Loop

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
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" install --repo "$PWD" --preset dotnet-python
   ```
   `--preset` is **required** for a first-time install (no `.claude/loop.json` on disk yet) — there is no hardcoded default stack. Omit `--preset` only to re-install/refresh an already-configured repo; the installer then reads the existing `.claude/loop.json` as-is (no re-merge). Add `--light` to seed the trimmed single-reviewer ladder instead of the default two-reviewer ladder (only on a repo with a CI test gate).
4. Report which files were written and which preset is active.
5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/runner:phase-gate` for the first time.

After install:

- `/runner:status` — show resolved config + marker presence
- `/runner:phase-gate --phase <N>` — run the configured suite
- `/runner:list-presets` — see built-in presets

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
   weak-dimension AC rule is being applied (see `runner:authoring-slices`
   — every new slice must carry a targeting AC). If recent slices in
   the window lack one, log the gap via `/runner:learn`.
2. For each `topLessons` entry with `count >= 2`: decide — is this a
   process fix (log via `/runner:learn`), a backlog item (propose via
   `/runner:backlog-add`), or already covered by an accepted DEC? State
   the disposition in the retrospective artifact; do not leave repeat
   lessons undispositioned.
3. If a dimension has been below threshold across two consecutive
   retrospectives, escalate: propose a dedicated FEAT addressing it
   rather than relying on per-slice AC.

Recommended cadences:

- Weekly retro: `--span-days 7` (good for team check-in)
- Phase close: `--since <phase-start-date>` (assess the phase)
- Release retro: `--since <release-tag-date>` (post-mortem of shipped work)

The Phase Completion Gate (dev-crew method HARD RULE) will auto-invoke this in
v0.1.7+; for v0.1.6 it's a manual command.

```

### docs/ai-loop/00-entry/MASTER_PROMPT.md

```
# Untitled product — Master Prompt

## Persona

You are a senior engineer working on **Untitled product**, building it slice by
slice according to the dev-crew method.

You write production code: no stubs, no TODOs, no placeholder implementations.
Every slice you complete is buildable, testable, and leaves the codebase in a
better state than you found it.

## Product

Override productName and productDescription in .claude/loop.json after install.

## Stack

- C# .NET (Aspire local orchestration when configured)
- Python agents (LangGraph or FastAPI) when configured
- Terraform for infrastructure when configured

## Mandatory reading before starting a slice

1. `CLAUDE.md` — repo memory, hard rules, anti-patterns
2. `docs/architecture/platform-overview.md`
3. `docs/ai-loop/01-loop-control/DEV_CREW_METHOD.md`
4. `docs/ai-loop/01-loop-control/EVIDENCE_RULES.md`
5. `docs/ai-loop/01-loop-control/STOP_CONDITIONS.md`

## First-response checklist

Before beginning any implementation work, run this checklist and report findings:

1. **Solution / project inspection** — which solution files, projects, agents,
   services are present? Match against what the slice expects.
2. **Backlog state** — read `docs/ai-loop/backlog/approved-slices.md`. Which is the
   highest-priority PENDING slice?
3. **Configuration** — read `.claude/loop.json`. Confirm the
   configured phase-gate commands still apply to the current repo state.
4. **Gap analysis** — what is missing relative to the current slice's acceptance
   criteria?

Report: solution state, backlog state, current slice, key gaps. Then proceed
to the current slice via the dev-crew method.

## Definition of done

A slice is complete only when:

- code exists and is wired into the application
- new tests cover new behavior (TDD per CLAUDE.md)
- build passes (per `.claude/loop.json` `stack.build`)
- relevant test suites pass (per `.claude/loop.json` `stack.test`)
- documentation is updated if architecture or interfaces changed
- a Crew `review-result` artifact is written (auto via commit bridge or
  manually via `/crew:write-review-result`)
- a Crew `final-synthesis` is written when the slice closes

Use `EVIDENCE_RULES.md` to mark each acceptance criterion PASS / PARTIAL / FAIL /
BLOCKED with the right kind of evidence.

```

### docs/ai-loop/backlog/completed-slices.md

```
# Completed Slices — Untitled product

Record of completed implementation slices. Append at the end of each slice as
part of the dev-crew close-out.

## Format

Each completed slice entry should include:

- **SLICE-NN: Title** as the section heading
- **Completed**: ISO date
- **PR or commit**: link or SHA
- **Acceptance criteria**: list with PASS / PARTIAL / FAIL / BLOCKED status
  per criterion, with evidence pointer
- **Tests added**: count + paths
- **Docs updated**: list of files
- **Phase-gate artifact** (if this slice closed a phase): path to
  `.claude/artifacts/crew/validations/phase-<N>-gate-<date>.md`
- **Risks / follow-ups**: anything left for a future slice

---

_No slices completed yet._

```

### docs/demo/2026-07-18-qa-gate-demo-script.md

```
# Demo recording script — dev-crew method + pre-build QA gate (W4.1)

Target: ~3 min screen recording for README. Operator drives; every command is copy-paste ready. Rehearsed sandbox keeps it deterministic.

## Prep (before recording, ~5 min)

```bash
# sandbox repo with loop installed
mkdir demo-repo && cd demo-repo && git init -b main
# install crew + runner plugins (marketplace), then:
/runner:install --preset typescript-plugin-dev
# enable the QA gate
#   .claude/loop.json → "loop": { ..., "qa_gate": "pre-build" }
# seed one small triaged FEAT with 3 Given-When-Then ACs (copy template below)
```

FEAT template (put in `.claude/artifacts/loop/backlog/triaged/FEAT-001.md`): a
tiny "add a `greet(name)` util + tests" feature — small enough to build live.

## Recording flow

1. **Cold open (15s)** — `bun .../loop.mts status --repo .` → show preset,
   marker block, crew CLI all green. One sentence: "Autonomous dev loop,
   installed on a fresh repo."
2. **Start ceremony (45s)** — `/runner:start FEAT-001`. Scroll the emitted
   dispatch: point at the **QA GATE PRE-FLIGHT** block — "an independent QA
   agent writes the test plan BEFORE the builder exists; it never sees the
   implementation." Point at the goalpost-lock FORBIDDEN order for the builder.
3. **Red → green (60s)** — let qa-expert write the plan, test-automator seed
   failing tests (show the red run), builder make them pass (green run).
   Caption: "goalposts locked — builder can't edit the plan; a PreToolUse hook
   mechanically denies it."
4. **Close gate (30s)** — `/runner:close`. Show grade with `test_confidence`;
   mention the 0.80 close gate + 3-close warm-up in one sentence.
5. **Snapshot (15s)** — open `.claude/artifacts/loop/loop-snapshot.md`: backlog
   counts, grades, honest cost line (median per scan), hook-enforcement badge.
6. **Outro (15s)** — README metrics band: "180 features shipped through this
   loop; the numbers regenerate from repo artifacts and CI fails if they
   drift."

## Gotchas while recording

- Fresh repo close-gate demo: warm-up means a failing close only WARNS for the
  first 3 — for the demo either show the warn + badge (honest) or pre-seed 3
  gate-evaluated closes in prep.
- Keep the sandbox offline from real backlogs — `productName` something
  obviously demo (`DemoLoop`).
- If auto-merge/PR steps are in-shot, use a throwaway GitHub repo.

```

### docs/prompts/2026-07-02-architecture-retrospective-prompt.md

```
# Prompt: Full Architecture Retrospective — runner-plugin + crew (dev-team) — v2 FINAL

> Paste this prompt into a fresh Claude Code session opened at `C:\work\mega\runner-plugin`.
> Dispatch read-only subagents liberally (`runner:researcher`, `crew:investigator`,
> `Explore`); budget ~2–4h of agent time.

---

## Role & Mission

You are a principal engineer doing a no-sacred-cows architecture retrospective of two
tightly coupled Claude Code plugins:

- **runner-plugin** (`C:\work\mega\runner-plugin`) — the dev-crew method layer:
  backlog intake/triage, slice ceremony, phase-gate runner, autonomous marathon loop,
  wave mode, GEPA optimization hooks, cost telemetry.
- **crew / dev-team** (`C:\work\mega\dev-team`) — the specialist-agent execution layer:
  builder/reviewer/validator agents, orchestrate-slice, ship, GEPA eval harness,
  workflow-state, artifacts, hooks.

Your deliverable is a **decision-ready report**, not a tour. Every claim must carry
evidence (`file:line` or artifact path). Every recommendation must state effort,
risk, cost/benefit, confidence, and whether it is a **quick win** (one slice) or
**structural** (needs ADR + FEAT decomposition).

## Methodology (apply to EVERY finding)

1. **Observe** — name the symptom precisely.
2. **Gather evidence** — file:line, artifact paths, telemetry numbers.
3. **Hunt contradictions** — actively search for evidence the current design is
   optimal or intentional (ADRs, DEC-* records, docs/upstream-requests, code
   comments). If conflicting evidence exists, present the tradeoff — do not
   assume redesign.
4. **Root cause** — never stop at symptoms; explain WHY the design ended up here.
5. **Alternatives** — at least 2 where structural, with tradeoffs.
6. **Cost estimate** — engineering hours (rough band).
7. **Expected improvement** — quantified where possible: $ cost reduction,
   reliability (pause/retry rate), latency, token/context reduction, maintenance.
8. **Confidence** — High / Medium / Low, plus evidence quality Strong / Moderate /
   Weak. Speculative findings MUST be labeled Low.

## Evaluation Principles (fixed rubric — score against these, not taste)

Single Responsibility · Information Hiding · Stable Dependencies · Explicit
Contracts · DRY · YAGNI · Testability · Operational Simplicity · Observability ·
Local Reasoning.

**Anti-purity guardrail:** Do not recommend architectural purity unless measurable
gains outweigh migration cost. Prefer evolutionary refactoring over greenfield
rewrites whenever practical. An LLM's love of microservices/kernels is not evidence.

## Ground Rules

1. **Read-only.** Output is one report:
   `docs/research/2026-07-02-architecture-retrospective.md` (runner-plugin repo).
2. **Evidence over vibes.** Where docs and code disagree, that disagreement IS a
   finding.
3. **Numbers over adjectives.** Never write "many commands duplicate logic" —
   measure: duplicate prompt blocks, duplicate LOC, duplicate agent definitions,
   shared-utility counts, average prompt size, artifact sizes, dispatch retry/pause
   rates, success rates, per-model cost. Use `.claude/artifacts/loop/` (112+ slice
   grades, cost reports ~$34.5/iteration, auto-dispatch.jsonl, learnings.jsonl,
   retrospectives) and `.claude/artifacts/crew/gepa/trials/*.jsonl`.
4. **Fan out.** One parallel read-only researcher per work package; you synthesize.
5. **Rank ruthlessly.** Report leads with top-10 ordered by (impact ÷ effort).

## Inputs to Read First (main thread, before fan-out)

- `runner-plugin/CLAUDE.md`, `docs/code-conventions.md`, `docs/halt-badges.md`,
  `docs/sop/specialist-pause-handling.md`, `.claude/loop.json`
- `dev-team/CLAUDE.md`, `dev-team/crew-architecture-analysis.md`,
  `dev-team/crew-optimization.md` (prior analyses — do NOT repeat; extend/refute)
- `runner-plugin/src/scripts/lib/plugin-identity.mts` (version coupling contract)
- Latest retrospective under `.claude/artifacts/loop/retrospectives/`

## Work Packages (dispatch one researcher each, parallel)

### WP1 — Greenfield Redesign: "what would we do differently"

Map the real module/dependency graph of both plugins (commands ↔ skills ↔ agents ↔
`src/scripts/lib/*` ↔ hooks ↔ artifacts on disk). Then answer:

- Which responsibilities live in the wrong layer? Known suspects to verify:
  - Orchestration logic embedded in Markdown slash-command prose
    (`commands/*.md`) instead of testable code. Quantify duplicated dispatch
    boilerplate across commands.
  - Two overlapping state stores: crew `workflow-state` vs loop backlog frontmatter
    vs `loop-snapshot.md` — who is source of truth, where do they drift? (Evidence:
    2026-06-10 workflow-state reconcileNote after a session hang.)
  - Duplicate agent rosters: `runner:researcher` vs `crew:researcher`,
    `runner:document-writer` vs `crew:document-writer`, `runner:architect` vs
    `crew:architect`, plus `3rdparty/` vendored agents in BOTH plugins. Measure the
    duplication; sketch a single shared agent registry.
  - Cross-plugin contract surface: `MIN_CREW_VERSION` pinning, `snapshot.*`
    halt-badges (SPEC-003), `docs/upstream-requests/` as ad-hoc RFC process.
    Is runner→crew dependency direction right, or should a shared kernel package
    exist? Apply the anti-purity guardrail before answering yes.
- **Subsystem scorecard**: score each major subsystem 0–10 on Maintainability,
  Coupling, Cohesion, Scalability, Testability, Discoverability, Performance,
  Developer Experience, Operational Complexity, Future Extensibility. Output as a
  table. Subsystems: backlog store, slice ceremony, dispatch layer, state stores,
  agent roster, GEPA harness, telemetry/cost, config, hooks, docs.
- Sketch the from-scratch architecture: layers, ownership, contracts, what dies.
  Concrete: package names, module boundaries, which Markdown becomes code.

### WP2 — Dispatch Reliability & Agent Performance (quick wins focus)

The recurring production failure is **specialist pause without artifact**
(SOP: `docs/sop/specialist-pause-handling.md`; lead mode killed over it,
SLICE-97..104). Investigate:

- Root-cause pattern across auto-dispatch.jsonl + grade lessons + learnings.jsonl:
  which agents pause, on which prompt shapes, at what context sizes? **Compute the
  pause rate and retry rate** — numbers, not anecdotes.
- Audit dispatch prompts (the `dispatchInstruction` templates from
  `/runner:slice start`, `commands/slice-review-ladder.md`, `/crew:orchestrate-slice`):
  measure length, redundancy, tool budgets, inline-output fallbacks. Propose a
  single shared dispatch-prompt builder with hard budgets (tool-call caps,
  "write artifact FIRST" ordering, structured-output schemas over artifact-file
  handshakes).
- Quick wins to enumerate and cost: structured output (schema) instead of
  file-artifact handoffs; tiered models for mechanical stages
  (`dev-lite`/`inspector-lite` generalized); context-diet for subagents (what do
  builder prompts carry that they never use — measure it); retry-with-fallback
  wrapper at dispatch time instead of SOP-manual recovery.

### WP3 — GEPA & Eval Quality

Read `dev-team` GEPA implementation (optimize/eval/history/invalidate/revert/thaw
skills + `C:\work\mega\gepa-core` if relevant) and trial data at
`.claude/artifacts/crew/gepa/trials/*.jsonl`. Assess:

- Eval validity: what do rubrics actually measure? Reproducibility (same prompt,
  same score)? Sample trial JSONL — **report variance, sample sizes, no-winner
  streaks, budget caps hit as numbers**.
- Metric gaming risk: can a candidate win by verbosity, rubric sycophancy, or
  overfitting the fixed eval set? Held-out set?
- Feedback loop: do the 112 slice grades (real production outcomes) feed GEPA, or
  is eval synthetic-only? Propose wiring: grade dimensions + pause/failure
  telemetry as fitness signal; per-agent eval suites from real failure transcripts;
  minimum-N + confidence intervals before promotion; champion soak metrics that
  auto-revert on production regression.
- Improvements ranked: eval-set curation pipeline, rubric-vs-outcome correlation
  check, pairwise-comparison judging over absolute scoring, seed/temperature
  controls.

### WP4 — Model vs Agent Separation (platform-agnostic agents)

Goal state: agent definitions (role, contract, skills, eval suite) are
**platform-agnostic assets**; the plugin is a thin Claude-Code adapter binding
them to a runtime (tools, dispatch, model selection). Assess distance:

- Inventory Claude-Code coupling inside `agents/*.md`: tool names, dispatch idioms
  (`Agent(subagent_type:...)`), hook assumptions, `${CLAUDE_PLUGIN_ROOT}`, model
  hints. **Count coupled references per agent file.**
- Propose layered agent spec: (a) portable core — role, IO schema, quality bar,
  eval suite, knowledge refs; (b) platform binding — tool mapping, model tier,
  budget; (c) generated artifact — the `.md` Claude Code consumes. Evaluate single
  source (YAML/JSON) → codegen to Claude Markdown, other adapters later. Where does
  GEPA optimize — portable core (good) or generated artifact (lock-in)?
- Model-tier policy as data: explicit capability→tier matrix (mechanical edit =
  small, review = mid, architecture = large) owned by the binding layer.
- Apply anti-purity guardrail: is full abstraction worth it NOW, or is a partial
  step (extract IO contracts only) the right 90-day move?

### WP5 — Performance, Cost & Reusability

- Decompose $34.5/iteration from cost reports + diagnostics (tool-fail rate,
  re-reads, compactions, preamble turns, cache hit%). **Top 3 cost sinks with
  numbers.**
- Reusability audit: how much of `src/scripts/lib/*` (both repos) is copy-adjacent?
  Measure duplicate LOC. Candidates for shared package: frontmatter parsing,
  artifact IO, jsonl stores, dispatch audit, config loading.
- Skill/command sprawl: count skills+commands per plugin, overlap matrix (triage
  vs retriage vs intake; close vs slice-complete vs slice-grade — some consolidated
  per FEAT-277, find the rest). Propose consolidated surface with before/after
  counts.
- Config sprawl: `.claude/loop.json` vs `crew.json` vs `gepa.config.json` vs
  presets — one schema-validated config with namespaces? Cost/benefit it.

### WP6 — Role-Prompt Validation (pm, architect, devs, reviewers)

For each of: `runner:pm`, `runner:architect`, `crew:backend-dev`,
`crew:frontend-dev`, `crew:fullstack-dev`, `crew:inspector`, `crew:verifier`
(and lite variants):

- Score the prompt 0–10 against: single responsibility, explicit output contract,
  good/bad output examples, scope fences, tool budget, failure/fallback
  instruction, length vs 300-line cap. **Report line counts.**
- Cross-check reality: do grade dimensions this agent owns (test_confidence for
  devs, security for inspector) show weakness in last-20 grade averages? Do PM
  `needs-review` escapes and P4-decline citations fire correctly
  (`validate-decline-citations`)?
- Prompt smells: duplicated methodology text belonging in a shared skill; stale
  references; contradictions with CLAUDE.md; missing structured-output schema.
- Output: per-agent verdict table (keep / trim / rewrite) + top 3 concrete diffs
  per rewrite candidate. Route rewrites through WP3's GEPA pipeline where an eval
  suite exists — do not hand-edit optimizable prompts.

### WP7 — "Anything Else" Sweep

- **Testing the methodology itself**: slash-command prose has no tests. Propose
  contract tests (golden dispatch-instruction snapshots, config-parse fixtures).
- **State-corruption recovery**: session hangs corrupted workflow-state once.
  Doctor/fsck for backlog+workflow+artifacts? (memory `doctor` shipped v0.58 —
  does it cover crew state?)
- **Security posture**: hooks execute code; 3rdparty vendored agents are
  unreviewed prompt supply chain; autonomous_safe items run unattended — threat
  model the marathon loop (prompt injection via FEAT bodies / web-research
  artifacts entering PM/architect context).
- **Observability**: end-to-end trace of one slice (dispatch → artifacts → grade
  → cost) queryable in one place?
- **Docs drift**: measure CLAUDE.md claims vs code; propose what moves to
  generated-only.
- Anything higher-leverage you find — flag it.

### WP8 — Future Architecture Vision (18–24 months)

Ignore the current implementation. Design what the system SHOULD look like after
another year of growth, then derive the migration:

- Multi-repository architecture and a shared kernel — what splits, what merges.
- Plugin ecosystem: extensibility API, third-party plugin SDK, governance model
  for community agents/skills.
- Model abstraction layer (builds on WP4) — multi-provider, tier routing, GEPA
  optimizing portable specs.
- MCP integration strategy — what becomes an MCP server vs stays a plugin.
- Cloud vs local split; what an enterprise edition would need (audit, RBAC,
  tenancy, cost governance).
- Migration strategy from today's state — evolutionary path, not big-bang;
  identify the first three irreversible decisions and when they must be made.
- Label everything here Confidence: Low-to-Medium by construction — it's vision,
  not finding. Still cite current-code constraints that shape it.

## Report Format (single file)

1. **Top-10 recommendations** — table: rank, title, quick-win|structural, effort
   (hours band), impact (quantified: $/tokens/reliability/latency), confidence,
   evidence quality, evidence pointer.
2. **Subsystem scorecard** (WP1) — 10 subsystems × 10 dimensions table.
3. **Greenfield sketch** (WP1) + **future vision** (WP8) — Mermaid + prose.
4. **Per-WP findings** — each: `[SEVERITY] claim — evidence — root cause —
   alternatives — fix — hours — expected improvement — confidence`.
5. **ADR drafts** — for EVERY structural recommendation: Context, Decision,
   Alternatives, Consequences, Migration plan, Rollback. Ready to land under
   `docs/adr/`.
6. **Proposed backlog items** — intake-ready FEAT stubs (title + 3-line body +
   priority + autonomous_safe) for every quick win.
7. **90-day roadmap** — Week 1, Week 2, Week 3–4, Month 2, Month 3; critical path,
   parallelizable tracks, dependencies between items.
8. **Explicitly rejected ideas** — considered and why not, including cases where
   contradiction-hunting showed the current design is actually right.

## Definition of Done

- Report at `docs/research/2026-07-02-architecture-retrospective.md`.
- Every top-10 item: file:line/artifact evidence + confidence + quantified impact.
- Subsystem scorecard complete; every structural rec has an ADR draft.
- ≥5 quick-win FEAT stubs intake-ready; 90-day roadmap present.
- Prior analyses cited where agreed, explicitly refuted where not — zero silent
  overlap.

```

### docs/research/prompts/2026-07-18-competitive-audit-prompt.md

```
# Competitive Audit — Astra Stack vs otta.build vs COG-second-brain

> Execution prompt. Paste into a fresh Claude Code session at `C:\work\mega`.
> Revision 2 — addresses review: subject-count fix, GEPA-as-capability, N/A
> normalization, evidence reproducibility, Playwright fallback, comparison
> pairing, repo-freshness baseline, confidence labels, anti-copying filter,
> citation-effort calibration.

## Mission

Perform an honest, evidence-backed competitive audit of the Astra development
stack and two competitor products. Apply one centrally controlled rubric,
identify plainly what we lack, and produce a prioritized adoption list from
otta.build and COG-second-brain. otta is especially relevant for UX,
onboarding, positioning, feature presentation, demos, and promotion.

No home-team bias. For every applicable comparison dimension, explicitly
answer: **what does the competitor do better than us?**

Distinguish implementation, documentation, marketing claims, and demonstrated
usage. A feature that exists in source but is not integrated, exercised, or
useful must not receive the same credit as a proven feature.

## Subjects (six)

Score all **six** subjects. The otta.build website and the otta plugin
repository are **two evidence surfaces for the single "otta" subject**, not
separate subjects.

### Astra implementation subjects

1. **dev-team / crew plugin** — `C:\work\mega\dev-team`
   Specialist-agent orchestration: builder/reviewer/validator ladder, slice
   ceremony, worktree parallelism, ship/review gates.

2. **runner-plugin / loop** — `C:\work\mega\runner-plugin`
   dev-crew method layer over crew: autonomous backlog walking, PM
   triage, architect gate, wave mode, halt badges, cost telemetry, marathon
   checkpoints.

3. **GEPA capability** — `C:\work\mega\gepa-core` plus the `crew:gepa-*`
   commands in dev-team (`gepa-optimize`, `gepa-eval`, `gepa-history`, rubric
   agents under `agents/*.gepa*`). Determine what works today, what is
   partially implemented, what is stubbed, and whether gepa-core is active,
   integrated-but-diverged, orphaned, or superseded relative to dev-team.
   **GEPA is evaluated as a capability module, not a standalone commercial
   product. Score applicable dimensions but do NOT compute a product-wide
   aggregate score for GEPA.**

4. **astramem memory integration**
   Daemon: `C:\work\mega\astramem-local`
   Consumer seam: `C:\work\mega\plugins-common` (astramem-client)
   MCP wiring in dev-team (crew plugin).
   Inspect recall, remember, feedback ranking, consolidation, entity graph,
   integration ergonomics, and measured usefulness. Current usefulness
   telemetry: **served=862, used=14, rate=1.6%**. Treat this as a primary
   finding, not a footnote — investigate what "served" and "used" actually
   mean in the telemetry code before drawing conclusions.

### Competitor subjects

5. **otta** — one subject, two evidence surfaces:
   - Website: https://otta.build — audit live using Playwright MCP
     (`browser_navigate` + `browser_snapshot` + `browser_take_screenshot`).
     **Fallback:** if Playwright MCP is unavailable, use the strongest
     available browser/fetch tool, record the limitation in the methodology
     section, and lower evidence confidence. Do NOT silently replace the
     live-site audit with search snippets or README content.
     Walk landing page, docs, installation, pricing, onboarding, any
     accessible demo. Capture: value-proposition copy, time-to-first-value,
     visual polish, demo assets (GIF/video/playground), social proof,
     waitlist/conversion mechanics, feature presentation, distribution and
     promo tactics.
   - Repository: https://github.com/otta-build/plugin — clone into the
     session scratch directory (never into an Astra repo). Inspect
     architecture, command/agent surface, install flow, docs quality, tests,
     release cadence, stars/issues/community signals.

6. **COG-second-brain** — https://github.com/huytieu/COG-second-brain
   Clone into scratch. Focus: capture model, recall/retrieval, ranking,
   feedback, persistence, consolidation, context injection, integration
   story, tests, operational maturity.

## Primary comparison pairs

Narrative comparisons MUST follow these pairs; do not force irrelevant
cross-category comparisons (e.g. COG vs runner-plugin on marketing):

- **dev-team + runner-plugin + GEPA ↔ otta**
- **astramem ↔ COG-second-brain**

The full scorecard may contain all six subjects; the head-to-head narratives
follow the pairs above.

## Repository baseline (capture BEFORE scoring)

For every local and cloned repository record:

- repo path or URL
- current/default branch
- HEAD commit SHA
- latest commit date
- dirty working-tree status (local repos)
- release/manifest version where present
- audit access date

For **gepa-core** specifically: determine whether dev-team imports/invokes
the current implementation, contains a divergent copy, or no longer uses it.
Label it one of: `active`, `integrated-but-diverged`, `orphaned`,
`superseded` — with evidence.

Do not modify dirty files or normalize repository state.

## Rubric (0–10 per applicable dimension)

1. Install & onboarding UX (time-to-first-value, error paths, prerequisites)
2. Docs & README quality (can a stranger succeed in 10 minutes?)
3. Marketing, positioning & promotion (copy, visuals, demos, social proof)
4. Orchestration depth (agents, parallelism, gates, ceremony)
5. Autonomy & safety (unattended operation, halt conditions, cost control)
6. Memory (capture → recall → ranking → feedback loop; measured usefulness)
7. Prompt/self-optimization (GEPA or equivalent)
8. Telemetry & observability (what can an operator actually see?)
9. Developer experience (command ergonomics, config surface, error messages)
10. Community & distribution (marketplace, install path, stars, activity)

### Scoring anchors

- **0** — absent and clearly applicable
- **1–2** — claim, placeholder, or nonfunctional surface
- **3–4** — basic implementation with important gaps
- **5–6** — useful but incomplete or poorly integrated
- **7–8** — strong, usable, supported by evidence
- **9** — unusually complete and polished
- **10** — category-leading, proven, hard to improve materially

### Citation-effort calibration

- Every numeric score: at least one directly supporting evidence reference.
- Scores 0–3 and 8–10: stronger justification (they are strong conclusions).
- N/A: one-phrase scope explanation.
- Major conclusions: multiple independent sources.

### N/A handling and aggregation

- Use N/A only when a dimension is genuinely outside the subject's intended
  scope. Explain every N/A briefly.
- **Exclude N/A cells from averages; never convert N/A to zero.**
- Show both raw dimension scores and an applicability-adjusted average.
- Do not use the adjusted average as the sole ranking or conclusion; explain
  category fit separately.
- All applicable dimensions equally weighted; a second, strategic weighting
  (relevance to Astra's roadmap) may be presented explicitly alongside.
- GEPA receives dimension scores but **no standalone product aggregate**.

### Honesty rules

- No evidence → maximum score of 3.
- A README claim is not implementation evidence.
- Existing code is not automatically integrated functionality.
- Integrated functionality is not automatically adopted or useful.
- State a competitor advantage plainly even when it makes Astra look weak.
- If a competitor README or onboarding flow is better than ours, say so with
  a short excerpt or precise reference.
- No points for planned work, TODOs, dead code, inaccessible demos, or
  implied architecture.
- Record contradictory evidence; do not select only the favorable
  interpretation.

### Evidence confidence labels

Label every score:

- **High** — source, tests, runtime artifacts, or direct browser observation
- **Medium** — consistent documentation or multiple indirect signals
- **Low** — incomplete, marketing-only, or inferential evidence

### Evidence format (reproducible citations)

- Local source: `repo-relative/path.ext:L12-L38`
- Cloned competitor source: `<repo>@<commit-sha>:path.ext:L12-L38`
- Website: exact page URL + access date + local screenshot filename
- Repository metadata: exact repo URL + retrieval date
- Runtime-generated or minified files: cite the nearest stable source file
  and explain why exact lines are unavailable.
- Label each piece of evidence: `implemented` | `tested` | `documented` |
  `marketed` | `observed-in-live-flow` | `measured-in-usage` | `inferred`.
- README claims must be labeled as documented claims unless confirmed in
  source or tests.

## Method

Fan out read-only research in parallel:

- one reader for dev-team
- one reader for runner-plugin
- one reader for gepa-core + the GEPA seams in dev-team
- one reader for the astramem repos + MCP integration
- one market researcher for the otta.build site (browser)
- one reader for the cloned otta plugin repo
- one reader for COG-second-brain

Researchers collect evidence and preliminary observations only — they must
NOT assign final scores. The main thread performs one synthesis pass and
assigns all final scores centrally so the rubric is applied consistently.
Resolve conflicting researcher findings by returning to primary evidence.

## Deliverables

Write the final report to:
`C:\work\mega\runner-plugin\docs\research\2026-07-18-competitive-audit.md`

### 1. Executive summary
- three most important competitor advantages
- three most serious Astra gaps
- strongest defensible Astra advantage
- highest-priority action for the next two weeks

### 2. Methodology & baseline
Repo SHAs, access dates, tooling limitations, unavailable pages, evidence
gaps.

### 3. Scorecard
Subjects × dimensions: score, confidence label, compact citation per
applicable cell; raw + applicability-adjusted averages (no aggregate for
GEPA).

### 4. Per-subject analysis
Demonstrated strengths; implementation gaps; adoption/usefulness gaps;
docs/onboarding gaps; what the relevant competitor does better; what Astra
does better; misleading or unsupported claims, if any.

### 5. Head-to-head comparisons
- astramem vs COG-second-brain
- crew + loop + GEPA vs otta

Separate: feature breadth, implementation depth, usability, evidence of
adoption, positioning and distribution.

### 6. Prioritized adoption list (top 10)
From otta and COG. Each item:
- recommendation
- observed user or distribution advantage
- evidence
- **copy / adapt / reject** verdict on the competitor approach
- strategic fit for Astra (why it fits our architecture and users)
- destination repository
- dependencies + likely maintenance cost
- effort (S/M/L), expected impact, implementation risk
- suggested sequencing

Do NOT recommend a feature merely because a competitor has it.

### 7. FEAT drafts (top 3–5)
Ready for `/runner:intake`, each with: title, target repo, problem,
user/operator value, proposed scope, acceptance criteria, exclusions,
dependencies, evidence links. **Do not create backlog files** — keep drafts
inside the report for operator review.

### 8. Evidence appendix
Source inventory; website pages visited; screenshot index; cloned competitor
SHAs; unresolved questions; claims that could not be verified.

## Screenshots

Save key otta.build pages next to the report with descriptive names
(`otta-landing.png`, `otta-install.png`, `otta-onboarding.png`,
`otta-pricing.png`, `otta-demo.png`). Reference filenames from the report.
Capture only pages/states that support meaningful findings.

## Constraints

- All Astra repositories are read-only.
- Writes allowed only under `C:\work\mega\runner-plugin\docs\research\**`.
- Competitor repos clone into the session scratch directory only.
- No commits, no branches, no PRs, no direct backlog changes.
- Do not install or execute untrusted competitor code unless required for a
  clearly identified verification step and safe to do so.
- Do not expose secrets, environment variables, private URLs, or credentials
  in the report.
- A claim without a file reference, stable URL, screenshot, repo-metadata
  reference, or clearly labeled inference is an opinion, not a finding.
- If a required tool or page is unavailable: continue with remaining
  evidence, document the limitation, lower confidence — never invent a
  conclusion.

```

### docs/superpowers/plans/2026-05-27-plugin-performance.md

```
# Plugin Performance Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce autonomous loop cost by ~60% and CLI latency by ~40% through model routing, runtime caching, token diet, dispatch discipline, and tool failure prevention.

**Architecture:** Five independent pillars implemented in priority order. Each pillar produces a working, testable commit. Model routing adds config-driven model selection to dispatch instructions. Cache wraps existing I/O functions with per-invocation memoization. Token diet compresses rules/templates. Dispatch discipline adds budget config. Tool failure prevention adds pre-validation guidance.

**Tech Stack:** ESM Node.js (.mjs), node --test, ESLint + Prettier

---

## Pillar 1: Model Routing

### Task 1: Create model-router.mjs with tests

**Files:**
- Create: `scripts/lib/model-router.mjs`
- Create: `tests/model-router.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// tests/model-router.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { resolveModel, MODEL_PHASES } from "../scripts/lib/model-router.mjs";

test("resolveModel returns phase-specific model when configured", () => {
  const config = { loop: { modelRouting: { default: "sonnet", review: "opus" } } };
  assert.equal(resolveModel("review", config), "opus");
});

test("resolveModel falls back to default when phase not configured", () => {
  const config = { loop: { modelRouting: { default: "sonnet" } } };
  assert.equal(resolveModel("build", config), "sonnet");
});

test("resolveModel returns opus when no modelRouting configured", () => {
  assert.equal(resolveModel("build", {}), "opus");
  assert.equal(resolveModel("build", null), "opus");
});

test("MODEL_PHASES lists all routable phases", () => {
  assert.ok(MODEL_PHASES.includes("build"));
  assert.ok(MODEL_PHASES.includes("review"));
  assert.ok(MODEL_PHASES.includes("sliceStart"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/model-router.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement model-router.mjs**

```js
// scripts/lib/model-router.mjs
export const MODEL_PHASES = [
  "sliceStart",
  "build",
  "review",
  "validate",
  "gradeWrite"
];

const FALLBACK_MODEL = "opus";

export function resolveModel(phase, config) {
  const routing = config?.loop?.modelRouting;
  if (!routing) return FALLBACK_MODEL;
  return routing[phase] || routing.default || FALLBACK_MODEL;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/model-router.test.mjs`
Expected: 4 pass, 0 fail

- [ ] **Step 5: Lint and format**

Run: `npm run lint && npm run format:check`

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/model-router.mjs tests/model-router.test.mjs
git commit -m "feat(perf): add model-router.mjs with phase-based model selection"
```

### Task 2: Wire model routing into dispatch instruction

**Files:**
- Modify: `scripts/lib/slice-linker.mjs:515-523` (buildDispatchInstruction)
- Modify: `tests/synergy.test.mjs` (if dispatch instruction assertions exist)

- [ ] **Step 1: Write failing test**

Add to `tests/model-router.test.mjs`:

```js
import { buildDispatchInstruction } from "../scripts/lib/slice-linker.mjs";

test("buildDispatchInstruction includes model hint when config has modelRouting", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-01",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/tmp/repo",
    resolvedGoal: "Test goal",
    modelHint: "sonnet"
  });
  assert.ok(result.includes("model: sonnet"), "dispatch should contain model hint");
});

test("buildDispatchInstruction omits model hint when modelHint is null", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-01",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/tmp/repo",
    resolvedGoal: "Test goal",
    modelHint: null
  });
  assert.ok(!result.includes("model:"), "dispatch should not contain model hint");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/model-router.test.mjs`
Expected: FAIL — modelHint not used in buildDispatchInstruction

- [ ] **Step 3: Modify buildDispatchInstruction in slice-linker.mjs**

In `scripts/lib/slice-linker.mjs`, update the function at line 515:

```js
function buildDispatchInstruction({ sliceId, title, sliceFile, repoPath, resolvedGoal, modelHint }) {
  const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;
  const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
  const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
  const modelLine = modelHint ? `\n\n> Preferred model: ${modelHint}. Use this model for the build subagent unless the task requires deeper reasoning.` : "";
  return [
    `Dispatch /crew:build subagent with this prompt:`,
    "",
    `> Implement ${title}.${sliceRef}${goalLine} Follow the full crew build workflow (frame → implement → review → validate → synthesize). For review, dispatch a \`crew:inspector\` subagent. For validation, dispatch a \`crew:verifier\` subagent. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, pivot through /crew:fix before resuming.${modelLine}`
  ].join("\n");
}
```

- [ ] **Step 4: Thread model through startSlice**

In `scripts/lib/slice-linker.mjs`, find the `startSlice` function. Add import at top:

```js
import { resolveModel } from "./model-router.mjs";
```

In `startSlice`, before the call to `buildDispatchInstruction`, resolve the model:

```js
const modelHint = resolveModel("build", config);
```

Pass `modelHint` to `buildDispatchInstruction`:

```js
const dispatchInstruction = buildDispatchInstruction({
  sliceId, title, sliceFile: ctx.file, repoPath, resolvedGoal: ctx.goal, modelHint
});
```

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: 324+ pass, 0 fail

- [ ] **Step 6: Add default modelRouting to loop.json**

Add to `.claude/loop.json` under the `loop` key:

```json
"modelRouting": {
  "default": "sonnet",
  "sliceStart": "opus",
  "review": "opus",
  "gradeWrite": "opus",
  "build": "sonnet",
  "validate": "sonnet"
}
```

- [ ] **Step 7: Lint, format, commit**

Run: `npm run lint && npm run format:check`

```bash
git add scripts/lib/slice-linker.mjs scripts/lib/model-router.mjs tests/model-router.test.mjs .claude/loop.json
git commit -m "feat(perf): wire model routing into dispatch instruction"
```

---

## Pillar 2: Token Diet

### Task 3: Compress loop-rules.md and deduplicate CLAUDE.md

**Files:**
- Modify: `templates/loop-rules.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Measure baseline**

Run: `wc -l templates/loop-rules.md CLAUDE.md templates/master-prompt.md`
Record line counts.

- [ ] **Step 2: Compress Cross-Slice Continuation in loop-rules.md**

Rewrite the Cross-Slice Continuation section (lines 9-23 in `templates/loop-rules.md`) from prose paragraphs to a numbered checklist. Target: reduce from ~15 lines of prose to ~8 lines of checklist.

- [ ] **Step 3: Trim CLAUDE.md HARD RULES summary**

The `<!-- loop:start -->...<!-- loop:end -->` block in CLAUDE.md contains a summary that duplicates loop-rules.md. Replace the inline summary with a shorter pointer:

```markdown
## Autonomous Loop — HARD RULES (summary)

This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation.
- **Marathon mode (default).** Loop walks entire backlog.
- **Slice start/close ceremony.** Every slice MUST use `/loop:slice start` and `/loop:slice complete`.
- **Dispatch discipline.** Hand work to `/crew:build` subagent; never implement inline.
- **Auto-continue.** After ceremony, promote next item without asking.

First action when starting the loop: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md`.
```

- [ ] **Step 4: Measure result**

Run: `wc -l templates/loop-rules.md CLAUDE.md templates/master-prompt.md`
Verify reduction: loop-rules ~120-140 lines (from 184), CLAUDE.md ~80 lines (from 89).

- [ ] **Step 5: Run tests to verify nothing broke**

Run: `npm test`
Expected: 324+ pass, 0 fail (template changes don't affect tests unless installer tests check line counts)

- [ ] **Step 6: Lint, commit**

```bash
git add templates/loop-rules.md CLAUDE.md
git commit -m "docs(perf): compress loop rules and deduplicate CLAUDE.md hard rules summary"
```

---

## Pillar 3: Per-Invocation Cache

### Task 4: Create cache.mjs with tests

**Files:**
- Create: `scripts/lib/cache.mjs`
- Create: `tests/cache.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// tests/cache.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { cached, bust, clearAll } from "../scripts/lib/cache.mjs";

test("cached returns same promise for same key", async () => {
  clearAll();
  let calls = 0;
  const fn = async () => { calls += 1; return 42; };
  const a = await cached("k1", fn);
  const b = await cached("k1", fn);
  assert.equal(a, 42);
  assert.equal(b, 42);
  assert.equal(calls, 1, "fn should be called only once");
});

test("cached returns different values for different keys", async () => {
  clearAll();
  const a = await cached("a", async () => 1);
  const b = await cached("b", async () => 2);
  assert.equal(a, 1);
  assert.equal(b, 2);
});

test("bust removes cached entry", async () => {
  clearAll();
  let calls = 0;
  const fn = async () => { calls += 1; return calls; };
  await cached("x", fn);
  bust("x");
  const v = await cached("x", fn);
  assert.equal(v, 2);
  assert.equal(calls, 2);
});

test("clearAll removes all entries", async () => {
  await cached("c1", async () => 1);
  await cached("c2", async () => 2);
  clearAll();
  let calls = 0;
  await cached("c1", async () => { calls += 1; return 10; });
  assert.equal(calls, 1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/cache.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement cache.mjs**

```js
// scripts/lib/cache.mjs
const _store = new Map();

export function cached(key, asyncFn) {
  if (_store.has(key)) return _store.get(key);
  const promise = asyncFn();
  _store.set(key, promise);
  return promise;
}

export function bust(key) {
  _store.delete(key);
}

export function clearAll() {
  _store.clear();
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test tests/cache.test.mjs`
Expected: 4 pass, 0 fail

- [ ] **Step 5: Lint, format, commit**

```bash
git add scripts/lib/cache.mjs tests/cache.test.mjs
git commit -m "feat(perf): add per-invocation cache module"
```

### Task 5: Wire cache into hot-path I/O functions

**Files:**
- Modify: `scripts/lib/backlog-parser.mjs:47` (listBacklog)
- Modify: `scripts/lib/grade-parser.mjs:139` (listGrades)
- Modify: `scripts/lib/spec-parser.mjs:31` (listSpecs)
- Modify: `scripts/lib/paths.mjs:73` (locateSliceFile)

- [ ] **Step 1: Cache listBacklog**

In `scripts/lib/backlog-parser.mjs`, add import:

```js
import { cached, bust } from "./cache.mjs";
```

Wrap the body of `listBacklog`:

```js
export async function listBacklog(repoPath, options = {}) {
  const cacheKey = `listBacklog:${repoPath}:${JSON.stringify(options.config || {})}`;
  return cached(cacheKey, async () => {
    const root = backlogRoot(repoPath, options.config);
    const entries = [];
    for (const state of BACKLOG_STATES) {
      const dir = path.join(root, state);
      if (!(await pathExists(dir))) continue;
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".md") || !FEATURE_FILE_RE.test(file)) continue;
        const entry = await readEntry(path.join(dir, file), state);
        if (entry) entries.push(entry);
      }
    }
    entries.sort((a, b) => a.idNumber - b.idNumber);
    return entries;
  });
}
```

- [ ] **Step 2: Cache listGrades**

In `scripts/lib/grade-parser.mjs`, add import:

```js
import { cached } from "./cache.mjs";
```

Wrap `listGrades` similarly:

```js
export async function listGrades(repoPath, options = {}) {
  const cacheKey = `listGrades:${repoPath}:${JSON.stringify(options.config || {})}`;
  return cached(cacheKey, async () => {
    const root = gradesRoot(repoPath, options.config);
    if (!(await pathExists(root))) return [];
    const files = await fs.readdir(root);
    const grades = [];
    for (const file of files) {
      if (!file.endsWith(".md") || !isGradeFile(file)) continue;
      const g = await readGrade(path.join(root, file));
      grades.push(g);
    }
    return grades.sort((a, b) =>
      (a.frontmatter.slice || "").localeCompare(b.frontmatter.slice || "")
    );
  });
}
```

- [ ] **Step 3: Cache locateSliceFile**

In `scripts/lib/paths.mjs`, add import:

```js
import { cached } from "./cache.mjs";
```

Wrap `locateSliceFile`:

```js
export async function locateSliceFile(slicesRootDir, sliceId) {
  const cacheKey = `locateSlice:${slicesRootDir}:${sliceId}`;
  return cached(cacheKey, async () => {
    if (!(await pathExists(slicesRootDir))) return null;
    const slicePattern = sliceId.replace("-", "[_-]");
    const re = new RegExp(`^${slicePattern}(_|$)`, "i");
    const stack = [slicesRootDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (re.test(e.name)) return full;
      }
    }
    return null;
  });
}
```

- [ ] **Step 4: Bust cache on writes**

In `scripts/lib/backlog-writer.mjs`, add:

```js
import { bust } from "./cache.mjs";
```

At the end of `addFeature`, `moveFeature`, and `updateFeatureFrontmatter`, add:

```js
bust(`listBacklog:${repoPath}:${JSON.stringify(config || {})}`);
```

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: 324+ pass, 0 fail

- [ ] **Step 6: Lint, format, commit**

Run: `npm run lint && npm run format:check`

```bash
git add scripts/lib/cache.mjs scripts/lib/backlog-parser.mjs scripts/lib/grade-parser.mjs scripts/lib/spec-parser.mjs scripts/lib/paths.mjs scripts/lib/backlog-writer.mjs
git commit -m "feat(perf): wire per-invocation cache into hot-path I/O"
```

---

## Pillar 4: Subagent Dispatch Discipline

### Task 6: Add dispatch limits config and template guidance

**Files:**
- Modify: `.claude/loop.json`
- Modify: `templates/loop-rules.md`

- [ ] **Step 1: Add dispatchLimits to loop.json**

Add under the `loop` key in `.claude/loop.json`:

```json
"dispatchLimits": {
  "maxSubagentsPerSlice": 4,
  "preferInlineFor": ["single-file-edit", "test-fix", "lint-fix", "format-fix"]
}
```

- [ ] **Step 2: Update Dispatch Discipline section in loop-rules.md**

In `templates/loop-rules.md`, find the Dispatch Discipline section and append:

```markdown
- **Dispatch budget.** Maximum {{dispatchLimits.maxSubagentsPerSlice}} subagent dispatches per slice. Inline execution for: single-file edits, test fixes, lint fixes, format fixes. Subagent dispatch only for bounded independent tasks (full build, review, validation). Each cold-start re-derives context — avoid unless the task genuinely benefits from isolation.
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: 324+ pass, 0 fail

- [ ] **Step 4: Commit**

```bash
git add .claude/loop.json templates/loop-rules.md
git commit -m "feat(perf): add subagent dispatch limits and inline-preference guidance"
```

---

## Pillar 5: Tool Failure Prevention

### Task 7: Add tool failure guidance to loop rules

**Files:**
- Modify: `templates/loop-rules.md`

- [ ] **Step 1: Add tool discipline section to loop-rules.md**

Append to the HARD RULES in `templates/loop-rules.md`:

```markdown
## Tool Discipline

- **Prefer dedicated tools over Bash.** Use Read/Grep/Glob for file operations. Reserve Bash for shell-only operations (git, npm, build commands).
- **Pre-validate paths.** Before file operations, verify the target exists. A failed tool call costs tokens for the error response plus the retry.
- **No speculative commands.** Plan the exact command before dispatching. Check flag syntax against the tool's help output if unsure.
- **Target: <2% tool failure rate per slice.** Cost reports track `toolFailureRate`. Above 5% triggers a cost advisory.
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: 324+ pass, 0 fail

- [ ] **Step 3: Commit**

```bash
git add templates/loop-rules.md
git commit -m "docs(perf): add tool discipline guidance to loop rules"
```

---

## Final Verification

- [ ] **Run full CI gates**

```bash
npm test && npm run lint && npm run format:check && node scripts/validate-manifests.mjs
```

Expected: all pass, 0 warnings, 0 failures.

- [ ] **Push**

```bash
git push
```

```

## Files read

