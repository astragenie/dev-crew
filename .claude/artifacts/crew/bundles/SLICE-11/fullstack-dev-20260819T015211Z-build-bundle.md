---
slice: SLICE-11
builder: fullstack-dev
run_id: 20260819T015211Z
feat: FEAT-003
files_touched: ["crew/scripts/crew.mts", "crew/scripts/lib/cost-hygiene/cost-advise-writer.mts", "crew/scripts/lib/cost-hygiene/cost-slice-handler.mts", "docs/planning/p2-seam-contract.md", "src/scripts/lib/slice-linker/crew-bridge.mts", "src/tests/cost-project-slugify.test.mts", "src/tests/cost-scan-window-regression.test.mts", "tsconfig.json", "tsconfig.test.json"]
files_read: []
diff_stat: { files: 10, additions: 348, deletions: 651 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-11: fail-soft bridge calls -> direct imports

- Created: 2026-08-19T01:52:11.734Z
- From: fullstack-dev
- To: lead
- Objective: Replaced crew-bridge.mts's four fail-soft execFile calls (write-run-brief, cost-slice, cost-advise, mark-badge) with direct in-process imports of crew/scripts/lib functions. Extracted writeCostAdviseArtifact into a new exported module crew/scripts/lib/cost-hygiene/cost-advise-writer.mts (crew.mts now imports it too). Dropped rootDir from tsconfig.json + tsconfig.test.json per contract finding 1. Deleted findHeroCrewCli/HERO_CREW_PATH/runCrew/pushOptionalFlags/appendFeaturePhaseArgs from crew-bridge.mts (dead once execFile is gone); kept appendSourceProjectArgs (still exported+unit-tested, just unused internally now). Found and fixed two contract gaps not in the original doc: (1) the specifier depth was three ../ in the contract text but needed four (fixed + noted in contract); (2) tsconfig.test.json's strictNullChecks:false breaks Result<T,E> discriminated-union narrowing on !r.ok once crew files enter the same tsc program -- fixed by switching to r.ok === false (narrows correctly regardless of strictNullChecks) across crew-bridge.mts and the pre-existing cost-slice-handler.mts idiom, plus one WorkflowRun-to-Record cast needing an unknown intermediate. Rewrote two tests (cost-project-slugify.test.mts, cost-scan-window-regression.test.mts AC-1) off the now-defunct HERO_CREW_PATH fake-CLI-subprocess seam onto the real direct-import path, asserting on result.cost.sourceProject/window instead of fake argv.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/slice-linker/crew-bridge.mts
  - tsconfig.json
  - tsconfig.test.json
  - crew/scripts/lib/cost-hygiene/cost-advise-writer.mts
  - crew/scripts/crew.mts
  - crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
  - src/tests/cost-project-slugify.test.mts
  - src/tests/cost-scan-window-regression.test.mts
  - docs/planning/p2-seam-contract.md
- Confidence: high
- Risks: SLICE-12/13 will hit the same strictNullChecks narrowing wall (!result.ok idiom) the first time they cross-tree-import a Result-returning crew function -- flagged in the contract addendum so it isn't rediscovered. cost-advise artifact 'kind' resolution: confirmed there is NO 'cost-advise' entry in write.mts's SIMPLE_RENDERERS or artifact-schemas.mts -- writeCostAdviseArtifact is correctly a standalone writer (not routed through writeArtifact), matching the contract's fallback branch.
- Suggested Next Handoff: SLICE-12: write-validation-result fail-hard direct import + phase-gate call-site updates. Watch for the same strictNullChecks narrowing issue on the extracted ValidationArtifactSchema/resolveValidationVerdict module.


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-003.md b/.claude/artifacts/loop/backlog/triaged/FEAT-003.md
deleted file mode 100644
index cbd84c73..00000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-003.md
+++ /dev/null
@@ -1,63 +0,0 @@
----
-id: FEAT-003
-status: triaged
-priority: P2
-category: feature
-target_release: null
-created: 2026-08-18
-updated: 2026-08-18
-depends_on: [FEAT-002]
-slices: []
-derived_from: null
-pm_customer_impact: 0.5
-pm_effort_estimate: 0.45
-pm_strategic_alignment: 0.75
-pm_technical_risk: 0.7
-pm_dependency_depth: 0.6
-pm_composite_priority: P2
-pm_autonomous_safe: false
-pm_reviewed: 2026-08-18
-autonomous_safe: true
-triage_notes: "Directly retires the failure class dev-crew/CLAUDE.md itself names as the reason for the merge; technical_risk banded 0.7 (schema/data-shape change -- devcrew.json schemaVersion 2 -- rollback needs the migrator's .bak, not a plain revert) forces the mandatory pre-mortem; autonomousSafe=false given the fail-hard/fail-soft contract split is exactly the kind of dispatch/state-recovery-adjacent change the loop-discipline skill flags as cascade-risk."
-proposed_slices:
-  - id_suffix: -SLICE-1
-    title: Fail-soft bridge calls to direct imports (4 calls)
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-2
-    title: Fail-hard write-validation-result direct import
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-3
-    title: devcrew.json schemaVersion 2 merge + migrator
-    points: 2
-    estimated_tokens: 100000
-tags: ["stack:typescript", "area:plugin-config", "concern:seam-elimination"]
-needs_contract: true
-needs_ux: false
-arch_attempt: 0
-arch_status: approved
-arch_review: approved
----
-## Description
-
-P2 Seam elimination: replace crew-bridge.mts execFile layer with direct imports per the section-4 per-call table (write-run-brief, cost-slice, cost-advise fail-soft; mark-badge fail-soft; write-validation-result fail-hard); delete findCrewCli/crewCliRuntime/MIN_CREW_VERSION/CREW_MARKETPLACE_NAME from plugin-identity; delete artifact-as-IPC template writers under the bridge; merge .claude/loop.json + crew config into one .claude/devcrew.json (schemaVersion 2) with in-place migrator. Exit gates: zero execFile-crew hits, zero MIN_CREW_VERSION hits, ceremony e2e-smoke green. Full spec: unification-plan.md section 4 + P2 row.
-
-## Intake notes
-
-Created via free-text intake (`/runner:intake "<text>"`). Priority is
-unset — this FEAT has not been scored yet. Run `/runner:triage`
-(PM scoring + `backlog pm-apply`) to score it before slicing.
-## Acceptance criteria (Given-When-Then)
-
-- AC-1: Given crew-bridge.mts's execFile layer is replaced by direct imports, When `grep -rn execFile src/scripts | grep -i crew` runs on the merged tree, Then the match count is 0.
-- AC-2: Given findCrewCli/crewCliRuntime/MIN_CREW_VERSION/CREW_MARKETPLACE_NAME are deleted, When `grep -rw MIN_CREW_VERSION src/` runs, Then the match count is 0.
-- AC-3: Given the write-validation-result direct-import call fails (e.g. the validation-artifact writer throws), When a phase-gate run hits that failure, Then the phase-gate process exits non-zero and no validation artifact is written as PASS -- this is the fail-hard contract the plan's section 4 table requires, distinguishing it from the fail-soft calls.
-- AC-4: Given a fail-soft call (write-run-brief/cost-slice/cost-advise/mark-badge) throws internally, When the direct-import replacement catches it, Then a structured log line naming the failed call site is emitted before continuing -- a silent swallow-and-continue with no log line fails this AC (targets the observability dimension, the lowest-scoring analog dimension available at 0.82).
-- AC-5: Given .claude/loop.json + crew config are merged, When the installer's in-place migrator runs against a pre-merge adopter config, Then the output file has schemaVersion: 2 and a .bak of the original is present on disk.
-
-## Proposed slices (PM decomposition)
-
-- SLICE-1: Fail-soft bridge calls to direct imports (4 calls) (2 pts)
-- SLICE-2: Fail-hard write-validation-result direct import (2 pts)
-- SLICE-3: devcrew.json schemaVersion 2 merge + migrator (2 pts)
diff --git a/.claude/state/crew/slice-progress.md b/.claude/state/crew/slice-progress.md
index e3e9c929..242a965b 100644
--- a/.claude/state/crew/slice-progress.md
+++ b/.claude/state/crew/slice-progress.md
@@ -1,6 +1,6 @@
 # Slice Progress
 
-Updated: 2026-08-19T01:19:36.672Z
+Updated: 2026-08-19T01:20:30.701Z
 
 Active plan: _(none detected)_
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index e603f1ec..0758b14f 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,21 +1,17 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T01:19:11.167Z",
+  "updatedAt": "2026-08-19T01:52:11.737Z",
   "currentRun": {
-    "title": "FEAT002 SLICE10: N>=20 green --parallel verification wave + typecheck gate",
+    "title": "FEAT003 SLICE11: Fail-soft bridge calls to direct imports (4 calls)",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
-    "startedAt": "2026-08-19T00:53:00.579Z",
-    "updatedAt": "2026-08-19T01:19:11.167Z",
-    "next": "Begin implementation",
+    "startedAt": "2026-08-19T01:20:30.629Z",
+    "updatedAt": "2026-08-19T01:52:11.737Z",
+    "next": "SLICE-12: write-validation-result fail-hard direct import + phase-gate call-site updates. Watch for the same strictNullChecks narrowing issue on the extracted ValidationArtifactSchema/resolveValidationVerdict module.",
     "gates": {
       "review": null,
-      "validation": {
-        "status": "failed",
-        "updatedAt": "2026-08-19T01:19:11.167Z",
-        "note": "phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"
-      },
+      "validation": null,
       "deployment": {
         "dev": null,
         "prod": null
@@ -26,11 +22,14 @@
       "help": null
     },
     "artifacts": {
-      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T005300Z-run-brief-feat002-slice10-n-20-green-parallel-verification-wave-typech.md",
-      "handoffs": [],
+      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T012030Z-run-brief-feat003-slice11-fail-soft-bridge-calls-to-direct-imports-4-c.md",
+      "handoffs": [
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T015200Z-handoff-slice-11-fail-soft-bridge-calls-direct-imports.md",
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T015211Z-handoff-slice-11-fail-soft-bridge-calls-direct-imports.md"
+      ],
       "reviewResult": null,
       "validationPlan": null,
-      "validationResult": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\validations\\20260819T011911Z-validation-result-phase-unspecified-gate.md",
+      "validationResult": null,
       "deploymentChecks": {
         "dev": null,
         "prod": null
@@ -40,14 +39,14 @@
   },
   "recentRuns": [
     {
-      "title": "FEAT002 SLICE09: Single tsconfig/tsconfig.test + biome config merge",
+      "title": "FEAT003 SLICE11: Fail-soft bridge calls to direct imports (4 calls)",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-19T00:40:33.000Z",
-      "updatedAt": "2026-08-19T00:47:57.617Z",
-      "completedAt": "2026-08-19T00:47:57.617Z",
-      "next": "P3 flattening will eventually dissolve the crew/ prefix and these two config files should merge into one at that point -- this slice deliberately kept them separate and coherent rather than merging early. Consider whether the root:false crew/biome.json should later gain extends://\" once P3 lands and rule sets are reconciled.",
+      "startedAt": "2026-08-19T01:20:24.411Z",
+      "updatedAt": "2026-08-19T01:20:24.411Z",
+      "completedAt": "2026-08-19T01:20:24.411Z",
+      "next": "Begin implementation",
       "gates": {
         "review": null,
         "validation": null,
@@ -61,10 +60,8 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T004032Z-run-brief-feat002-slice09-single-tsconfig-tsconfig-test-biome-config-m.md",
-        "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T004757Z-handoff-slice-09-tsconfig-biome-config-unification.md"
-        ],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T012024Z-run-brief-feat003-slice11-fail-soft-bridge-calls-to-direct-imports-4-c.md",
+        "handoffs": [],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
@@ -76,17 +73,21 @@
       }
     },
     {
-      "title": "FEAT002 SLICE08: Wiggin -> dev-crew branding scrub (27 files)",
+      "title": "FEAT002 SLICE10: N>=20 green --parallel verification wave + typecheck gate",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-19T00:24:10.407Z",
-      "updatedAt": "2026-08-19T00:34:32.222Z",
-      "completedAt": "2026-08-19T00:34:32.222Z",
-      "next": "SLICE-09 (tsconfig/biome config merge) and SLICE-10 (N=20 green parallel verification + typecheck gate) are next in the pending queue. A later slice should flatten/normalize the crew/ subtree import and its own wiggin references once dev-crew's own DEC numbering stabilizes (also flagged in the SLICE-04 handoff for the 2 self-referential decision-log test failures).",
+      "startedAt": "2026-08-19T00:53:00.579Z",
+      "updatedAt": "2026-08-19T01:19:11.167Z",
+      "completedAt": "2026-08-19T01:19:11.167Z",
+      "next": "Begin implementation",
       "gates": {
         "review": null,
-        "validation": null,
+        "validation": {
+          "status": "failed",
+          "updatedAt": "2026-08-19T01:19:11.167Z",
+          "note": "phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"
+        },
         "deployment": {
           "dev": null,
           "prod": null
@@ -97,14 +98,11 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T002410Z-run-brief-feat002-slice08-wiggin-dev-crew-branding-scrub-27-files.md",
-        "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003416Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md",
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003432Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md"
-        ],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T005300Z-run-brief-feat002-slice10-n-20-green-parallel-verification-wave-typech.md",
+        "handoffs": [],
         "reviewResult": null,
         "validationPlan": null,
-        "validationResult": null,
+        "validationResult": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\validations\\20260819T011911Z-validation-result-phase-unspecified-gate.md",
         "deploymentChecks": {
           "dev": null,
           "prod": null
@@ -113,14 +111,14 @@
       }
     },
     {
-      "title": "FEAT002 SLICE06: .ts->.mts rename sweep batch 2 + import-specifier fixes",
+      "title": "FEAT002 SLICE09: Single tsconfig/tsconfig.test + biome config merge",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T22:51:44.721Z",
-      "updatedAt": "2026-08-19T00:12:15.091Z",
-      "completedAt": "2026-08-19T00:12:15.091Z",
-      "next": "If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).",
+      "startedAt": "2026-08-19T00:40:33.000Z",
+      "updatedAt": "2026-08-19T00:47:57.617Z",
+      "completedAt": "2026-08-19T00:47:57.617Z",
+      "next": "P3 flattening will eventually dissolve the crew/ prefix and these two config files should merge into one at that point -- this slice deliberately kept them separate and coherent rather than merging early. Consider whether the root:false crew/biome.json should later gain extends://\" once P3 lands and rule sets are reconciled.",
       "gates": {
         "review": null,
         "validation": null,
@@ -134,9 +132,9 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T225144Z-run-brief-feat002-slice06-ts-mts-rename-sweep-batch-2-import-specifier.md",
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T004032Z-run-brief-feat002-slice09-single-tsconfig-tsconfig-test-biome-config-m.md",
         "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T001215Z-handoff-slice-07-round-3-flip-remaining-node-spawns-to-bun-15-files.md"
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T004757Z-handoff-slice-09-tsconfig-biome-config-unification.md"
         ],
         "reviewResult": null,
         "validationPlan": null,
@@ -149,14 +147,14 @@
       }
     },
     {
-      "title": "FEAT002 SLICE05: .ts->.mts rename sweep batch 1 (dev-team src)",
+      "title": "FEAT002 SLICE08: Wiggin -> dev-crew branding scrub (27 files)",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T22:25:18.605Z",
-      "updatedAt": "2026-08-18T22:25:18.605Z",
-      "completedAt": "2026-08-18T22:25:18.605Z",
-      "next": "Begin implementation",
+      "startedAt": "2026-08-19T00:24:10.407Z",
+      "updatedAt": "2026-08-19T00:34:32.222Z",
+      "completedAt": "2026-08-19T00:34:32.222Z",
+      "next": "SLICE-09 (tsconfig/biome config merge) and SLICE-10 (N=20 green parallel verification + typecheck gate) are next in the pending queue. A later slice should flatten/normalize the crew/ subtree import and its own wiggin references once dev-crew's own DEC numbering stabilizes (also flagged in the SLICE-04 handoff for the 2 self-referential decision-log test failures).",
       "gates": {
         "review": null,
         "validation": null,
@@ -170,8 +168,11 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222518Z-run-brief-feat002-slice05-ts-mts-rename-sweep-batch-1-dev-team-src.md",
-        "handoffs": [],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T002410Z-run-brief-feat002-slice08-wiggin-dev-crew-branding-scrub-27-files.md",
+        "handoffs": [
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003416Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md",
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003432Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md"
+        ],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
@@ -183,14 +184,14 @@
       }
     },
     {
-      "title": "FEAT002 SLICE04: Subtree-import dev-team + runner-plugin, preserve history",
+      "title": "FEAT002 SLICE06: .ts->.mts rename sweep batch 2 + import-specifier fixes",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T22:24:42.650Z",
-      "updatedAt": "2026-08-18T22:24:42.650Z",
-      "completedAt": "2026-08-18T22:24:42.650Z",
-      "next": "Begin implementation",
+      "startedAt": "2026-08-18T22:51:44.721Z",
+      "updatedAt": "2026-08-19T00:12:15.091Z",
+      "completedAt": "2026-08-19T00:12:15.091Z",
+      "next": "If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).",
       "gates": {
         "review": null,
         "validation": null,
@@ -204,8 +205,10 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222442Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
-        "handoffs": [],
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T225144Z-run-brief-feat002-slice06-ts-mts-rename-sweep-batch-2-import-specifier.md",
+        "handoffs": [
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T001215Z-handoff-slice-07-round-3-flip-remaining-node-spawns-to-bun-15-files.md"
+        ],
         "reviewResult": null,
         "validationPlan": null,
         "validationResult": null,
diff --git a/crew/scripts/crew.mts b/crew/scripts/crew.mts
index 4dd55448..3045e74f 100644
--- a/crew/scripts/crew.mts
+++ b/crew/scripts/crew.mts
@@ -5,6 +5,7 @@ import path from "node:path";
 import { pathToFileURL } from "node:url";
 import { maybeEmitCostReport } from "./lib/cost-hygiene/emit-cost-report.mjs";
 import { costSliceHandler } from "./lib/cost-hygiene/cost-slice-handler.mjs";
+import { writeCostAdviseArtifact } from "./lib/cost-hygiene/cost-advise-writer.mjs";
 import { normalizeMsysPath } from "./lib/fs-utils.mjs";
 import { assertBunPresent } from "./lib/installer/bun-preflight.mjs";
 import {
@@ -499,54 +500,6 @@ function usage(target: string | null = null) {
   return ["Engineering OS installer", "", "Usage:", ...Object.values(subcommands)].join("\n");
 }
 
-// Slug source priority: explicit --title → advisor target slice → advisor
-// target runTitle → fallback "advise". --title lets the loop side pass the
-// enriched FEAT/PHASE/SLICE tag so cost-advise filenames match the rest of
-// the artifact surface.
-function buildCostAdviseSlug(title: string | null, advisor: Record<string, unknown> | null) {
-  const t = advisor?.["target"] as { sliceId?: string; runTitle?: string } | null | undefined;
-  const source = title || t?.sliceId || t?.runTitle || "advise";
-  return source
-    .toLowerCase()
-    .replace(/[^a-z0-9]+/g, "-")
-    .replace(/^-+|-+$/g, "")
-    .slice(0, 60);
-}
-
-// Optional YAML frontmatter block; "" when both feature + phase absent so
-// existing output stays byte-identical for legacy callers.
-function buildOptionalFrontmatter(feature: string | null, phase: string | null) {
-  const lines = [];
-  if (phase !== null && phase !== undefined && String(phase).length > 0) {
-    lines.push(`phase: ${JSON.stringify(String(phase))}`);
-  }
-  if (feature) lines.push(`feature: ${feature}`);
-  if (lines.length === 0) return "";
-  return ["---", ...lines, "---", ""].join("\n");
-}
-
-async function writeCostAdviseArtifact(
-  repoPath: string,
-  md: string,
-  advisor: Record<string, unknown> | null,
-  options: { title?: string | null; feature?: string | null; phase?: string | null } = {}
-) {
-  const fs = await import("node:fs/promises");
-  const pathMod = await import("node:path");
-  const { title = null, feature = null, phase = null } = options;
-  const dir = pathMod.join(repoPath, ".claude", "artifacts", "crew", "cost-insights");
-  await fs.mkdir(dir, { recursive: true });
-  const stamp = new Date()
-    .toISOString()
-    .replace(/[-:]/g, "")
-    .replace(/\.\d+Z$/, "Z");
-  const slug = buildCostAdviseSlug(title, advisor);
-  const fm = buildOptionalFrontmatter(feature, phase);
-  const file = pathMod.join(dir, `${stamp}-cost-advise-${slug}.md`);
-  await fs.writeFile(file, fm + md + "\n");
-  return file;
-}
-
 // Auto-emit a cost-report artifact when a run window is available. Designed
 // to be called immediately after write-final-synthesis. Failures here are
 // non-fatal: they return null so the synthesis result still surfaces.
diff --git a/crew/scripts/lib/cost-hygiene/cost-slice-handler.mts b/crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
index 775c4f05..de7df7cf 100644
--- a/crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
+++ b/crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
@@ -165,7 +165,7 @@ export async function costSliceHandler({
     }),
     collectDispatchBreakdown(
       repoPath,
-      (run as Record<string, unknown> | null)?.["runId"] as string | undefined
+      (run as unknown as Record<string, unknown> | null)?.["runId"] as string | undefined
     )
   ]);
   const outcome = (await collectOutcomeLinkage(repoPath, runTitle)) as unknown as Record<
@@ -182,7 +182,7 @@ export async function costSliceHandler({
     ...(phase != null ? { phase } : {}),
     ...(dispatchBreakdown != null ? { dispatchBreakdown } : {})
   });
-  if (!writeResult.ok) throw writeResult.error;
+  if (writeResult.ok === false) throw writeResult.error;
   const sliceArtifact: Record<string, unknown> = { ...writeResult.value };
   sliceArtifact["cost"] = sliceCost;
   sliceArtifact["outcome"] = outcome;
@@ -197,7 +197,7 @@ export async function costSliceHandler({
     fields: Record<string, unknown>
   ): Promise<Record<string, unknown>> => {
     const r = await writeArt(rp, kind, fields as import("../artifacts/write.mjs").ArtifactFields);
-    if (!r.ok) throw r.error;
+    if (r.ok === false) throw r.error;
     return r.value as unknown as Record<string, unknown>;
   };
 
diff --git a/src/scripts/lib/slice-linker/crew-bridge.mts b/src/scripts/lib/slice-linker/crew-bridge.mts
index 3385b404..af09279b 100644
--- a/src/scripts/lib/slice-linker/crew-bridge.mts
+++ b/src/scripts/lib/slice-linker/crew-bridge.mts
@@ -1,19 +1,28 @@
-// Bridge layer that hands slice-completion artifacts off to the hero-crew
-// plugin's `crew` CLI. Calls crew via execFile against the version installed
-// in Claude Code's plugin cache. Best-effort: missing crew is a soft no-op,
-// and any single failure (cost-report / handoff / final-synthesis) does not
-// block the others.
+// Bridge layer that hands slice-completion artifacts off to the crew
+// library. Direct in-process imports of crew/scripts/lib/** functions — no
+// more subprocess/execFile hop (P2 seam-elimination, SLICE-11). Best-effort:
+// any single failure (cost-report / handoff / final-synthesis) does not
+// block the others; each fail-soft call catches internally, logs a
+// structured line naming the call site (AC-4), and returns an `{ error }`
+// shape so callers' `bestEffort()` wrappers see identical behavior to the
+// old CLI-catch path.
 //
 // Extracted from slice-linker.mjs during the Tier B-8 split.
 
 import fs from "node:fs/promises";
 import path from "node:path";
-import { execFile as _execFile } from "node:child_process";
-import { promisify } from "node:util";
 
+import { writeArtifact } from "../../../../crew/scripts/lib/artifacts/write.mjs";
+import type { ArtifactFields } from "../../../../crew/scripts/lib/artifacts/write.mjs";
+import { costSliceHandler } from "../../../../crew/scripts/lib/cost-hygiene/cost-slice-handler.mjs";
+import { writeCostAdviseArtifact } from "../../../../crew/scripts/lib/cost-hygiene/cost-advise-writer.mjs";
+import {
+  buildCostAdvisor,
+  renderCostAdvisorMarkdown
+} from "../../../../crew/scripts/lib/cost-advisor.mjs";
+import { markWorkflowBadge } from "../../../../crew/scripts/lib/workflow-state.mjs";
 import { buildArtifactSlug, buildArtifactTitle } from "../artifact-naming.mjs";
-import { crewCliRuntime } from "../plugin-identity.mjs";
-import { pathExists, ensureDir, gradesRoot, decisionsRoot } from "../paths.mjs";
+import { ensureDir, gradesRoot, decisionsRoot } from "../paths.mjs";
 import { fanoutEnvelope } from "../webhook-fanout.mjs";
 import { gitTextOrThrow } from "../run-git.mjs";
 import { readCrewWorkflowState } from "../crew-workflow-reader.mjs";
@@ -25,43 +34,16 @@ import {
   writeCostScanCursor
 } from "./cost-scan-cursor.mjs";
 
-const execFile = promisify(_execFile);
-
-async function findHeroCrewCli() {
-  // Lookup order, most-specific-first:
-  // 1. $HERO_CREW_PATH env override (explicit user pin). This is the only
-  //    supported way to point at a local dev checkout — there is
-  //    deliberately no hardcoded author-machine absolute path here (a prior
-  //    version probed one unconditionally before the plugin cache, which
-  //    was wrong for anyone but the original author; see FEAT-236 B3).
-  // 2. Plugin cache (whatever version is installed).
-  if (process.env.HERO_CREW_PATH) {
-    const explicit = path.join(process.env.HERO_CREW_PATH, "scripts", "crew.mjs");
-    if (await pathExists(explicit)) return explicit;
-  }
-
-  // Fall back to the plugin cache (handles installs without a local checkout).
-  const { findCrewCli } = await import("../plugin-identity.mjs");
-  const cached = await findCrewCli();
-  if (cached) return cached;
-
-  return null;
-}
-
 // Writes both cost-report (cost/) and cost-advise (cost-insights/) so the
 // slice-close artifact set matches what `crew write-final-synthesis`
-// auto-emits. `--aggregate-all` mirrors maybeEmitCostReport's default in
-// crew.mjs so cross-repo sessions are captured. The advise step is
-// best-effort and reported in the return alongside the report.
-// Invokes `crew write-run-brief` to rotate workflow-state.currentRun to
-// the new slice. Best-effort: missing crew is a soft no-op so the agent
-// can still proceed; the loop driver inspects the return.
-function pushOptionalFlags(args: string[], pairs: [string, string | null | undefined][]) {
-  for (const [flag, value] of pairs) {
-    if (value) args.push(flag, String(value));
-  }
-}
-
+// auto-emits. `--aggregate-all` (aggregateAll flag) mirrors
+// maybeEmitCostReport's default in crew.mts so cross-repo sessions are
+// captured. The advise step is best-effort and reported in the return
+// alongside the report.
+// Direct-imports `writeArtifact("run-brief", ...)` to rotate
+// workflow-state.currentRun to the new slice. Best-effort: a write failure
+// is a soft no-op so the agent can still proceed; the loop driver inspects
+// the return.
 export async function writeCrewRunBrief(
   repoPath: string,
   {
@@ -86,8 +68,6 @@ export async function writeCrewRunBrief(
     outOfScope?: string | null;
   }
 ) {
-  const cli = await findHeroCrewCli();
-  if (!cli) return { skipped: "hero-crew CLI not found" };
   const titleSummary = title ? title.replace(/^SLICE-\d+:\s*/i, "") : null;
   const enrichedTitle = buildArtifactTitle({
     featureId,
@@ -95,40 +75,27 @@ export async function writeCrewRunBrief(
     sliceId,
     summary: titleSummary && titleSummary !== sliceId ? titleSummary : undefined
   });
-  const args = [
-    cli,
-    "write-run-brief",
-    "--repo",
-    repoPath,
-    "--title",
-    enrichedTitle,
-    "--owner",
-    "loop",
-    "--next",
-    "Begin implementation"
-  ];
-  pushOptionalFlags(args, [
-    ["--goal", goal],
-    ["--mode", mode],
-    ["--pace", pace],
-    ["--scope", scope],
-    ["--out-of-scope", outOfScope],
-    ["--feature", featureId],
-    ["--phase", phase !== null && phase !== undefined && String(phase).length > 0 ? phase : null]
-  ]);
+  const hasPhase = phase !== null && phase !== undefined && String(phase).length > 0;
+  const fields: ArtifactFields = {
+    title: enrichedTitle,
+    owner: "loop",
+    next: "Begin implementation",
+    ...(goal ? { goal } : {}),
+    ...(mode ? { mode } : {}),
+    ...(pace ? { pace } : {}),
+    ...(scope ? { scope } : {}),
+    ...(outOfScope ? { outOfScope } : {}),
+    ...(featureId ? { feature: featureId } : {}),
+    ...(hasPhase ? { phase: phase as string } : {})
+  };
   try {
-    const { stdout } = await execFile(crewCliRuntime(String(args[0])), args, {
-      maxBuffer: 1024 * 1024
-    });
-    let parsed;
-    try {
-      parsed = JSON.parse(stdout);
-    } catch {
-      return { stdout: stdout.slice(0, 500) };
-    }
-    return parsed;
+    const r = await writeArtifact(repoPath, "run-brief", fields);
+    if (r.ok === false) throw r.error;
+    return r.value;
   } catch (err: unknown) {
-    return { error: (err as Error).message };
+    const message = (err as Error).message;
+    console.error(`[crew-bridge] write-run-brief failed (slice=${sliceId}): ${message}`);
+    return { error: message };
   }
 }
 
@@ -174,36 +141,6 @@ export async function detectCostMode(repoPath: string, config: Record<string, an
 // phase } object. The structured form is preferred — it lets the cost-slice
 // run-title include the FEAT/phase tags so crew's slugifier writes them into
 // the cost-report filename.
-// Append --feature / --phase flags to a crew CLI arg list when present.
-// Keeps argv terse and the caller's branch count low.
-function appendFeaturePhaseArgs(
-  args: string[],
-  featureId: string | null | undefined,
-  phase: string | null | undefined
-) {
-  if (featureId) args.push("--feature", String(featureId));
-  if (phase !== null && phase !== undefined && String(phase).length > 0) {
-    args.push("--phase", String(phase));
-  }
-}
-
-// Spawn the crew CLI, return parsed JSON or fall back to a truncated stdout
-// envelope. Captures execFile errors as `{ error }` so the caller does not
-// need its own try/catch around every invocation.
-async function runCrew(args: string[]) {
-  try {
-    const { stdout } = await execFile(crewCliRuntime(String(args[0])), args, {
-      maxBuffer: 1024 * 1024
-    });
-    try {
-      return JSON.parse(stdout);
-    } catch {
-      return { stdout: stdout.slice(0, 500) };
-    }
-  } catch (err: unknown) {
-    return { error: (err as Error).message };
-  }
-}
 
 // Normalizes a human-readable project name or repo path into the slug form
 // crew's session scanner expects under ~/.claude/projects/<slug>/ — same
@@ -238,6 +175,92 @@ export function appendSourceProjectArgs(
   args.push("--source-project", primary);
 }
 
+// Builds the costSliceHandler flags record for the resolved mode/window.
+// Aliases (config.loop.costProjectAliases) only mattered for the old argv
+// path's last-flag-wins CLI parsing (appendSourceProjectArgs) — a
+// direct-call flags object has a single sourceProject key, so only the
+// primary project (the value that always won under argv too) needs to be
+// set here. See appendSourceProjectArgs' own tests for the argv-shape
+// behavior this replaces.
+function buildCostSliceFlags(
+  mode: "scoped" | "aggregate",
+  config: Record<string, any> | null,
+  repoPath: string,
+  window: { startedAt: string | null; completedAt: string },
+  featureId: string | null,
+  phase: string | null,
+  runTitle: string
+): Record<string, unknown> {
+  const flags: Record<string, unknown> = { runTitle };
+  if (window.startedAt) flags.startedAt = window.startedAt;
+  if (window.completedAt) flags.completedAt = window.completedAt;
+  if (mode === "scoped") {
+    flags.sourceProject = slugifyProjectSlug(config?.loop?.costProject ?? repoPath);
+  } else {
+    flags.aggregateAll = true;
+  }
+  if (featureId) flags.feature = featureId;
+  if (phase !== null && phase !== undefined && String(phase).length > 0) {
+    flags.phase = phase;
+  }
+  return flags;
+}
+
+// Direct-imports costSliceHandler. Fail-soft: catches internally, logs the
+// call site (AC-4), and returns `{ error }` so the cursor-advance-only-on-
+// success gate in tryWriteCostReport can inspect it the same way the old
+// execFile-catch path did.
+async function runCostSliceCall(
+  repoPath: string,
+  flags: Record<string, unknown>,
+  sliceId: string | null | undefined
+): Promise<Record<string, any>> {
+  try {
+    return await costSliceHandler({ repoPath, flags });
+  } catch (err: unknown) {
+    const message = (err as Error).message;
+    console.error(`[crew-bridge] cost-slice failed (slice=${sliceId ?? "unknown"}): ${message}`);
+    return { error: message };
+  }
+}
+
+// Direct-imports buildCostAdvisor/renderCostAdvisorMarkdown/
+// writeCostAdviseArtifact and mirrors crew.mts's own "cost-advise" CLI
+// handler return shape (target/recommendations/aggregateFlags/baseline/
+// reportsAnalyzed/artifactPath) so downstream consumers
+// (postCostAdviseEnvelope, slice-close consumers) see an identical object
+// either way. Fail-soft: catches internally, logs the call site (AC-4).
+async function runCostAdviseCall(
+  repoPath: string,
+  runTitle: string,
+  featureId: string | null,
+  phase: string | null,
+  sliceId: string | null | undefined
+): Promise<Record<string, any>> {
+  try {
+    const advisor = await buildCostAdvisor(repoPath, { limit: 10 });
+    const md = renderCostAdvisorMarkdown(advisor);
+    const artifactPath = await writeCostAdviseArtifact(
+      repoPath,
+      md,
+      advisor as unknown as Record<string, unknown>,
+      { title: runTitle, feature: featureId, phase }
+    );
+    return {
+      target: advisor.target?.sliceId || advisor.target?.runTitle || null,
+      recommendations: advisor.recommendations,
+      aggregateFlags: advisor.aggregateFlags || [],
+      baseline: advisor.baseline,
+      reportsAnalyzed: advisor.reports.length,
+      artifactPath
+    };
+  } catch (err: unknown) {
+    const message = (err as Error).message;
+    console.error(`[crew-bridge] cost-advise failed (slice=${sliceId ?? "unknown"}): ${message}`);
+    return { error: message };
+  }
+}
+
 export async function tryWriteCostReport(
   repoPath: string,
   sliceOrInfo: string | Record<string, any> | null,
@@ -245,8 +268,6 @@ export async function tryWriteCostReport(
 ) {
   const info = typeof sliceOrInfo === "string" ? { sliceId: sliceOrInfo } : sliceOrInfo || {};
   const { sliceId, featureId = null, phase = null } = info as Record<string, any>;
-  const cli = await findHeroCrewCli();
-  if (!cli) return { skipped: "hero-crew CLI not found" };
 
   const mode = await detectCostMode(repoPath, config);
   const runTitle = buildArtifactTitle({ featureId, phase, sliceId });
@@ -256,30 +277,20 @@ export async function tryWriteCostReport(
   // scan) instead of always relying on crew's shared currentRun fallback
   // — see cost-scan-cursor.mjs for the full root-cause rationale.
   const window = await resolveCostScanWindow(repoPath, sliceId, workflowState);
-  const reportArgs = [cli, "cost-slice", "--repo", repoPath, "--run-title", runTitle];
-  pushOptionalFlags(reportArgs, [
-    ["--started-at", window.startedAt],
-    ["--completed-at", window.completedAt]
-  ]);
-  if (mode === "scoped") {
-    const project = slugifyProjectSlug(config?.loop?.costProject ?? repoPath);
-    const rawAliases = config?.loop?.costProjectAliases;
-    const aliases = Array.isArray(rawAliases)
-      ? rawAliases.map((alias: unknown) =>
-          typeof alias === "string" ? slugifyProjectSlug(alias) : alias
-        )
-      : rawAliases;
-    appendSourceProjectArgs(reportArgs, project, aliases);
-  } else {
-    reportArgs.push("--aggregate-all");
-  }
-  appendFeaturePhaseArgs(reportArgs, featureId, phase);
-  const report = await runCrew(reportArgs);
+  const costSliceFlags = buildCostSliceFlags(
+    mode,
+    config,
+    repoPath,
+    window,
+    featureId,
+    phase,
+    runTitle
+  );
+  const report = await runCostSliceCall(repoPath, costSliceFlags, sliceId);
 
-  // Only advance the cursor when crew's CLI actually ran (no execFile
-  // error) — a failed invocation leaves the window untouched so the next
-  // attempt retries the same, still-valid span instead of silently
-  // skipping it.
+  // Only advance the cursor when the direct call actually succeeded — a
+  // failed invocation leaves the window untouched so the next attempt
+  // retries the same, still-valid span instead of silently skipping it.
   if (sliceId && !report?.error) {
     await writeCostScanCursor(repoPath, sliceId, window.completedAt);
   }
@@ -297,21 +308,7 @@ export async function tryWriteCostReport(
   // failure never blocks the cost-report/advise flow.
   const dedup = await sweepCostReportDedup(repoPath, config);
 
-  const adviseArgs = [cli, "cost-advise", "--repo", repoPath, "--title", runTitle];
-  appendFeaturePhaseArgs(adviseArgs, featureId, phase);
-  let advise: Record<string, any> | null = null;
-  try {
-    const { stdout } = await execFile(crewCliRuntime(String(adviseArgs[0])), adviseArgs, {
-      maxBuffer: 1024 * 1024
-    });
-    try {
-      advise = JSON.parse(stdout);
-    } catch {
-      advise = { stdout: stdout.slice(0, 500) };
-    }
-  } catch (err: unknown) {
-    advise = { error: (err as Error).message };
-  }
+  const advise = await runCostAdviseCall(repoPath, runTitle, featureId, phase, sliceId);
 
   // FEAT-234 (cross-repo): emit `cost.advise_recorded` envelope so the
   // runner-side handler can persist into jsonl_cost_advises + render via
@@ -437,25 +434,22 @@ function pickNumber(v: unknown): number | null {
   return typeof v === "number" && Number.isFinite(v) ? v : null;
 }
 
-// Invokes `crew mark-badge --badge validation_skipped --note <reason>` so
-// the skip is captured in workflow-state with an audit trail. Best-effort:
-// missing crew is reported via `{ skipped }`, identical to other bridge
-// calls. The slice close still proceeds — the bypass already passed the
-// gate in completeSlice; this call only records *why*.
+// Direct-imports `markWorkflowBadge({ badge: "validation_skipped", ... })`
+// so the skip is captured in workflow-state with an audit trail.
+// Best-effort: a write failure is reported via `{ error }`, identical to
+// the other bridge calls. The slice close still proceeds — the bypass
+// already passed the gate in completeSlice; this call only records *why*.
 export async function markValidationSkippedBadge(repoPath: string, reason: string) {
-  const cli = await findHeroCrewCli();
-  if (!cli) return { skipped: "hero-crew CLI not found" };
-  const args = [
-    cli,
-    "mark-badge",
-    "--repo",
-    repoPath,
-    "--badge",
-    "validation_skipped",
-    "--note",
-    reason || "validation_skipped via /loop:slice complete --skip-validation-check"
-  ];
-  return runCrew(args);
+  const note = reason || "validation_skipped via /loop:slice complete --skip-validation-check";
+  try {
+    const result = await markWorkflowBadge(repoPath, { badge: "validation_skipped", note });
+    if (result.ok === false) throw result.error;
+    return { badge: "validation_skipped", currentRun: result.value };
+  } catch (err: unknown) {
+    const message = (err as Error).message;
+    console.error(`[crew-bridge] mark-badge failed (badge=validation_skipped): ${message}`);
+    return { error: message };
+  }
 }
 
 function renderSynthesisScores(
diff --git a/src/tests/cost-project-slugify.test.mts b/src/tests/cost-project-slugify.test.mts
index eca0c600..cfa1dc60 100644
--- a/src/tests/cost-project-slugify.test.mts
+++ b/src/tests/cost-project-slugify.test.mts
@@ -11,10 +11,13 @@
 // surfaced (the citylive report's `usd: 0` / `Auto-detected: no`
 // fingerprint).
 //
-// These tests exercise the real `tryWriteCostReport` bridge function
-// against a fake `crew` CLI (same $HERO_CREW_PATH seam as
-// cost-scan-window-regression.test.mts) and assert on the argv the fake
-// CLI actually receives.
+// SLICE-11 (P2 seam-elimination): `tryWriteCostReport` no longer shells out
+// to a `crew` CLI subprocess, so these tests were rewritten off the
+// `$HERO_CREW_PATH` fake-CLI-plus-argv-inspection seam and now exercise the
+// real `costSliceHandler`/`computeSessionCost` direct-import path end to
+// end. `computeSessionCost`'s return echoes back the resolved slug as
+// `cost.sourceProject` (session-cost.mts's `assembleCostResult`), which is
+// what these tests assert on instead of inspecting a fake subprocess's argv.
 
 import fs from "node:fs/promises";
 import os from "node:os";
@@ -30,164 +33,74 @@ async function tmpRepo(prefix: string): Promise<string> {
   return repo;
 }
 
-/**
- * Writes a fake `crew` CLI at `<dir>/scripts/crew.mjs` that logs every
- * invocation's argv to `<dir>/calls.jsonl` and, for `cost-slice`, writes a
- * real cost-report markdown file into the target repo's
- * `.claude/artifacts/crew/cost/` directory — same shape as the fixture in
- * cost-scan-window-regression.test.mts, trimmed to what these tests need.
- */
-async function writeFakeCrewCli(dir: string): Promise<{ cliDir: string; logPath: string }> {
-  const scriptsDir = path.join(dir, "scripts");
-  await fs.mkdir(scriptsDir, { recursive: true });
-  const logPath = path.join(dir, "calls.jsonl");
-  const scriptPath = path.join(scriptsDir, "crew.mjs");
+// Seeds workflow-state.currentRun.startedAt so costSliceHandler has a
+// window to scan (it throws without one) — same fixture pattern as
+// cost-scan-window-regression.test.mts.
+async function seedWorkflowState(repo: string, startedAt: string): Promise<void> {
+  const dir = path.join(repo, ".claude", "state", "crew");
+  await fs.mkdir(dir, { recursive: true });
   await fs.writeFile(
-    scriptPath,
-    `import fs from "node:fs";
-import path from "node:path";
-
-const argv = process.argv.slice(2);
-fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(argv) + "\\n");
-
-function flag(name) {
-  const i = argv.indexOf(name);
-  return i >= 0 ? argv[i + 1] : null;
-}
-
-const cmd = argv[0];
-if (cmd === "cost-slice") {
-  const repo = flag("--repo");
-  const outDir = path.join(repo, ".claude", "artifacts", "crew", "cost");
-  fs.mkdirSync(outDir, { recursive: true });
-  const filename =
-    Date.now() + "-" + Math.random().toString(36).slice(2) + "-cost-report-fake.md";
-  const filePath = path.join(outDir, filename);
-  const body = [
-    "---",
-    "kind: cost-report",
-    "run_title: " + JSON.stringify(flag("--run-title") ?? ""),
-    "usd: 1.23",
-    "created_at: " + new Date().toISOString(),
-    "---",
-    "",
-    "# Fake Cost Report",
-    ""
-  ].join("\\n");
-  fs.writeFileSync(filePath, body);
-  console.log(JSON.stringify({ path: filePath }));
-} else if (cmd === "cost-advise") {
-  console.log(JSON.stringify({ recommendations: [] }));
-} else {
-  console.log(JSON.stringify({}));
-}
-`
+    path.join(dir, "workflow-state.json"),
+    JSON.stringify({ currentRun: { startedAt } })
   );
-  return { cliDir: dir, logPath };
 }
 
-async function readCalls(logPath: string): Promise<string[][]> {
-  try {
-    const raw = await fs.readFile(logPath, "utf8");
-    return raw
-      .split("\n")
-      .filter((l) => l.trim())
-      .map((l) => JSON.parse(l));
-  } catch {
-    return [];
-  }
-}
+const STARTED_AT = "2026-08-01T00:00:00.000Z";
 
-function sourceProjectValues(argv: string[]): string[] {
-  const values: string[] = [];
-  for (let i = 0; i < argv.length; i++) {
-    if (argv[i] === "--source-project") values.push(argv[i + 1]);
-  }
-  return values;
-}
-
-async function withHeroCrewPath<T>(cliDir: string, fn: () => Promise<T>): Promise<T> {
-  const saved = process.env.HERO_CREW_PATH;
-  process.env.HERO_CREW_PATH = cliDir;
-  try {
-    return await fn();
-  } finally {
-    if (saved === undefined) delete process.env.HERO_CREW_PATH;
-    else process.env.HERO_CREW_PATH = saved;
-  }
-}
-
-test("AC-2: an unslugified config.loop.costProject (citylive-shaped fixture) reaches the crew argv slugified", async () => {
+test("AC-2: an unslugified config.loop.costProject (citylive-shaped fixture) reaches computeSessionCost slugified", async () => {
   const repo = await tmpRepo("cps-citylive-repo-");
-  const cliHome = await tmpRepo("cps-citylive-cli-");
-  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);
-
-  await withHeroCrewPath(cliDir, async () => {
-    const config = { loop: { costProject: "AstraGenie.CityLive" } };
-    const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-1" }, config);
-    assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);
+  await seedWorkflowState(repo, STARTED_AT);
 
-    const calls = await readCalls(logPath);
-    const costSliceCall = calls.find((c) => c[0] === "cost-slice");
-    assert.ok(costSliceCall, "expected a cost-slice invocation");
+  const config = { loop: { costProject: "AstraGenie.CityLive" } };
+  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-1" }, config);
+  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);
 
-    const values = sourceProjectValues(costSliceCall!);
-    assert.deepEqual(
-      values,
-      ["AstraGenie-CityLive"],
-      "the raw human-readable project name must be slugified before it reaches --source-project"
-    );
-  });
+  assert.equal(
+    result.cost?.sourceProject,
+    "AstraGenie-CityLive",
+    "the raw human-readable project name must be slugified before it reaches the session scanner"
+  );
 });
 
 test("AC-4: an already-slugified config.loop.costProject is unchanged (idempotent, no regression for the standard-path case)", async () => {
   const repo = await tmpRepo("cps-idempotent-repo-");
-  const cliHome = await tmpRepo("cps-idempotent-cli-");
-  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);
+  await seedWorkflowState(repo, STARTED_AT);
 
-  await withHeroCrewPath(cliDir, async () => {
-    const alreadySlugged = "C--work-mega-runner-plugin";
-    const config = { loop: { costProject: alreadySlugged } };
-    const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-2" }, config);
-    assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);
+  const alreadySlugged = "C--work-mega-runner-plugin";
+  const config = { loop: { costProject: alreadySlugged } };
+  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-2" }, config);
+  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);
 
-    const calls = await readCalls(logPath);
-    const costSliceCall = calls.find((c) => c[0] === "cost-slice");
-    assert.ok(costSliceCall, "expected a cost-slice invocation");
-
-    const values = sourceProjectValues(costSliceCall!);
-    assert.deepEqual(
-      values,
-      [alreadySlugged],
-      "an already-slugified value must pass through unchanged"
-    );
-  });
+  assert.equal(
+    result.cost?.sourceProject,
+    alreadySlugged,
+    "an already-slugified value must pass through unchanged"
+  );
 });
 
-test("AC-2/AC-4 combined: costProjectAliases are normalized the same way, primary still pushed last", async () => {
+test("AC-2/AC-4 combined: costProjectAliases present in config does not change the primary project actually scanned", async () => {
   const repo = await tmpRepo("cps-aliases-repo-");
-  const cliHome = await tmpRepo("cps-aliases-cli-");
-  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);
-
-  await withHeroCrewPath(cliDir, async () => {
-    const config = {
-      loop: {
-        costProject: "AstraGenie.CityLive",
-        costProjectAliases: ["Old.Project.Name", "already-slugified-alias"]
-      }
-    };
-    const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-3" }, config);
-    assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);
-
-    const calls = await readCalls(logPath);
-    const costSliceCall = calls.find((c) => c[0] === "cost-slice");
-    assert.ok(costSliceCall, "expected a cost-slice invocation");
-
-    const values = sourceProjectValues(costSliceCall!);
-    assert.deepEqual(
-      values,
-      ["Old-Project-Name", "already-slugified-alias", "AstraGenie-CityLive"],
-      "aliases are slugified in place, order preserved, primary still last"
-    );
-  });
+  await seedWorkflowState(repo, STARTED_AT);
+
+  // Under the old CLI/argv seam, aliases were pushed before the primary and
+  // the CLI's last-flag-wins parser meant only the primary ever mattered
+  // (see appendSourceProjectArgs' own unit tests). The direct-import flags
+  // object never builds an argv array at all, so aliases have no
+  // representation there either — this test locks that the primary is
+  // still the one slugified value that reaches computeSessionCost,
+  // regardless of whatever aliases are configured alongside it.
+  const config = {
+    loop: {
+      costProject: "AstraGenie.CityLive",
+      costProjectAliases: ["Old.Project.Name", "already-slugified-alias"]
+    }
+  };
+  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-3" }, config);
+  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);
+
+  assert.equal(
+    result.cost?.sourceProject,
+    "AstraGenie-CityLive",
+    "the primary project must be slugified and used regardless of aliases present in config"
+  );
 });
diff --git a/src/tests/cost-scan-window-regression.test.mts b/src/tests/cost-scan-window-regression.test.mts
index 0d0ab817..23478d4d 100644
--- a/src/tests/cost-scan-window-regression.test.mts
+++ b/src/tests/cost-scan-window-regression.test.mts
@@ -4,10 +4,19 @@
 // in cost-scan-cursor.test.mts. This file adds the coverage that spike
 // flagged as still missing:
 //
-//  1. AC-1 at the INTEGRATION level: a real (fake) `crew` CLI subprocess
-//     spawned twice through the actual `tryWriteCostReport` bridge function,
-//     proving the fix end-to-end rather than only at the
-//     `resolveCostScanWindow` unit boundary.
+//  1. AC-1 at the INTEGRATION level: `tryWriteCostReport` invoked twice in a
+//     row, proving the window-advance fix end-to-end rather than only at
+//     the `resolveCostScanWindow` unit boundary. SLICE-11 (P2
+//     seam-elimination) removed `tryWriteCostReport`'s `crew` CLI subprocess
+//     hop entirely, so this test was rewritten off the old `$HERO_CREW_PATH`
+//     fake-CLI-plus-argv-inspection seam and now asserts on the real
+//     `costSliceHandler`/`computeSessionCost` direct-import return value
+//     (`result.cost.window.{start,end}`, echoed back by
+//     `session-cost.mts`'s `assembleCostResult`) instead of a fake
+//     subprocess's argv or a fabricated report file. `config.loop.costProject`
+//     is set so cost mode resolves to "scoped" (a single, fast, likely-empty
+//     directory scan) rather than "aggregate" (a real, slow scan of
+//     `~/.claude/projects/` on whatever machine runs the test).
 //  2. The `resolveCostScanWindow` falsy-sliceId defensive branch (LOW nit
 //     from the SLICE-162 review).
 //  3. AC-4: memory-snapshot.mts's dedup key (resolveCostReportUsd /
@@ -28,7 +37,6 @@ import {
 } from "../scripts/lib/slice-linker/cost-scan-cursor.mjs";
 import { tryWriteCostReport } from "../scripts/lib/slice-linker/crew-bridge.mjs";
 import { loadCostReportUSDValues } from "../scripts/lib/memory-snapshot.mjs";
-import { initGitRepo } from "./_fixtures.mjs";
 
 async function tmpRepo(prefix: string): Promise<string> {
   const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
@@ -45,182 +53,73 @@ async function seedWorkflowState(repo: string, startedAt: string): Promise<void>
   );
 }
 
-/**
- * Writes a fake `crew` CLI at `<dir>/scripts/crew.mjs` that logs every
- * invocation's argv to `<dir>/calls.jsonl` and, for `cost-slice`, writes a
- * real cost-report markdown file into the target repo's
- * `.claude/artifacts/crew/cost/` directory. `crew-bridge.mts::findHeroCrewCli`
- * resolves `$HERO_CREW_PATH/scripts/crew.mjs` BEFORE the plugin cache, so
- * pointing that env var here exercises `tryWriteCostReport`'s real
- * subprocess-spawn path rather than stubbing the function itself.
- */
-async function writeFakeCrewCli(dir: string): Promise<{ cliDir: string; logPath: string }> {
-  const scriptsDir = path.join(dir, "scripts");
-  await fs.mkdir(scriptsDir, { recursive: true });
-  const logPath = path.join(dir, "calls.jsonl");
-  const scriptPath = path.join(scriptsDir, "crew.mjs");
-  await fs.writeFile(
-    scriptPath,
-    `import fs from "node:fs";
-import path from "node:path";
-
-const argv = process.argv.slice(2);
-fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(argv) + "\\n");
-
-function flag(name) {
-  const i = argv.indexOf(name);
-  return i >= 0 ? argv[i + 1] : null;
-}
-
-const cmd = argv[0];
-if (cmd === "cost-slice") {
-  const repo = flag("--repo");
-  const startedAt = flag("--started-at");
-  const completedAt = flag("--completed-at");
-  const outDir = path.join(repo, ".claude", "artifacts", "crew", "cost");
-  fs.mkdirSync(outDir, { recursive: true });
-  const filename =
-    Date.now() + "-" + Math.random().toString(36).slice(2) + "-cost-report-fake.md";
-  const filePath = path.join(outDir, filename);
-  const body = [
-    "---",
-    "kind: cost-report",
-    "run_title: " + JSON.stringify(flag("--run-title") ?? ""),
-    "usd: 1.23",
-    "total_tokens: 1000",
-    "window_start: " + (startedAt ?? "null"),
-    "window_end: " + completedAt,
-    "created_at: " + new Date().toISOString(),
-    "---",
-    "",
-    "# Fake Cost Report",
-    ""
-  ].join("\\n");
-  fs.writeFileSync(filePath, body);
-  console.log(JSON.stringify({ path: filePath }));
-} else if (cmd === "cost-advise") {
-  console.log(JSON.stringify({ recommendations: [] }));
-} else {
-  console.log(JSON.stringify({}));
-}
-`
-  );
-  return { cliDir: dir, logPath };
-}
-
-async function readCalls(logPath: string): Promise<string[][]> {
-  try {
-    const raw = await fs.readFile(logPath, "utf8");
-    return raw
-      .split("\n")
-      .filter((l) => l.trim())
-      .map((l) => JSON.parse(l));
-  } catch {
-    return [];
-  }
-}
-
-function flagFromArgv(argv: string[], name: string): string | null {
-  const i = argv.indexOf(name);
-  return i >= 0 ? (argv[i + 1] ?? null) : null;
-}
-
-async function withHeroCrewPath<T>(cliDir: string, fn: () => Promise<T>): Promise<T> {
-  const saved = process.env.HERO_CREW_PATH;
-  process.env.HERO_CREW_PATH = cliDir;
-  try {
-    return await fn();
-  } finally {
-    if (saved === undefined) delete process.env.HERO_CREW_PATH;
-    else process.env.HERO_CREW_PATH = saved;
-  }
-}
-
 const STALE_STARTED_AT = "2026-07-03T10:50:26.134Z";
 
 // ---------------------------------------------------------------------------
-// AC-1, integration level: real tryWriteCostReport + fake crew subprocess
+// AC-1, integration level: real tryWriteCostReport, direct-import path
 // ---------------------------------------------------------------------------
 
 test("AC-1 integration: two consecutive tryWriteCostReport calls for the same slice in one session advance the window instead of freezing it", async () => {
   const repo = await tmpRepo("csw-int-repo-");
-  const cliHome = await tmpRepo("csw-int-cli-");
-  await initGitRepo(repo);
   await seedWorkflowState(repo, STALE_STARTED_AT);
-  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);
-
-  await withHeroCrewPath(cliDir, async () => {
-    const sliceId = "SLICE-CSW-INT";
+  const config = { loop: { costProject: "csw-int-fake-project" } };
+  const sliceId = "SLICE-CSW-INT";
 
-    const firstResult: any = await tryWriteCostReport(repo, { sliceId }, null);
-    assert.ok(!firstResult?.error, `first call must not error: ${JSON.stringify(firstResult)}`);
+  const firstResult: any = await tryWriteCostReport(repo, { sliceId }, config);
+  assert.ok(!firstResult?.error, `first call must not error: ${JSON.stringify(firstResult)}`);
 
-    const secondResult: any = await tryWriteCostReport(repo, { sliceId }, null);
-    assert.ok(!secondResult?.error, `second call must not error: ${JSON.stringify(secondResult)}`);
+  const secondResult: any = await tryWriteCostReport(repo, { sliceId }, config);
+  assert.ok(!secondResult?.error, `second call must not error: ${JSON.stringify(secondResult)}`);
 
-    const calls = await readCalls(logPath);
-    const costSliceCalls = calls.filter((c) => c[0] === "cost-slice");
-    assert.equal(costSliceCalls.length, 2, "expected exactly two cost-slice invocations");
+  const firstStartedAt = firstResult.cost?.window?.start;
+  const firstCompletedAt = firstResult.cost?.window?.end;
+  const secondStartedAt = secondResult.cost?.window?.start;
+  const secondCompletedAt = secondResult.cost?.window?.end;
 
-    const [firstArgv, secondArgv] = costSliceCalls as [string[], string[]];
-    const firstStartedAt = flagFromArgv(firstArgv, "--started-at");
-    const firstCompletedAt = flagFromArgv(firstArgv, "--completed-at");
-    const secondStartedAt = flagFromArgv(secondArgv, "--started-at");
-    const secondCompletedAt = flagFromArgv(secondArgv, "--completed-at");
-
-    assert.equal(
-      firstStartedAt,
-      STALE_STARTED_AT,
-      "first-ever scan for this slice has no cursor yet, so it falls back to currentRun.startedAt"
-    );
-    assert.ok(firstCompletedAt, "first call must supply --completed-at");
+  assert.equal(
+    firstStartedAt,
+    STALE_STARTED_AT,
+    "first-ever scan for this slice has no cursor yet, so it falls back to currentRun.startedAt"
+  );
+  assert.ok(firstCompletedAt, "first call must resolve a window end");
 
-    // The exact regression this slice exists to pin: the SECOND invocation's
-    // Window Start must be the FIRST invocation's Window End -- not the
-    // still-frozen currentRun value. workflow-state.json is never rewritten
-    // between the two calls here, which is exactly the "repeated
-    // same-session scan" failure mode from the root-cause spike.
-    assert.equal(
-      secondStartedAt,
-      firstCompletedAt,
-      "second scan's Window Start must advance to the first scan's Window End"
-    );
-    assert.notEqual(
-      secondStartedAt,
-      STALE_STARTED_AT,
-      "second scan must NOT re-read the frozen currentRun.startedAt"
-    );
-    assert.ok(secondCompletedAt, "second call must supply --completed-at");
-    assert.notEqual(
-      secondCompletedAt,
-      firstCompletedAt,
-      "the window must keep advancing, not repeat the same span"
-    );
+  // The exact regression this slice exists to pin: the SECOND invocation's
+  // Window Start must be the FIRST invocation's Window End -- not the
+  // still-frozen currentRun value. workflow-state.json is never rewritten
+  // between the two calls here, which is exactly the "repeated
+  // same-session scan" failure mode from the root-cause spike.
+  assert.equal(
+    secondStartedAt,
+    firstCompletedAt,
+    "second scan's Window Start must advance to the first scan's Window End"
+  );
+  assert.notEqual(
+    secondStartedAt,
+    STALE_STARTED_AT,
+    "second scan must NOT re-read the frozen currentRun.startedAt"
+  );
+  assert.ok(secondCompletedAt, "second call must resolve a window end");
+  assert.notEqual(
+    secondCompletedAt,
+    firstCompletedAt,
+    "the window must keep advancing, not repeat the same span"
+  );
 
-    // Cross-check against the actual written report files (not just argv) --
-    // proves the persisted cursor really drove what crew was told to scan,
-    // end to end through the bridge function under test.
-    assert.equal(
-      typeof firstResult.path,
-      "string",
-      "first result must carry a written report path"
-    );
-    assert.equal(
-      typeof secondResult.path,
-      "string",
-      "second result must carry a written report path"
-    );
-    const firstReport = await fs.readFile(firstResult.path, "utf8");
-    const secondReport = await fs.readFile(secondResult.path, "utf8");
-    assert.ok(firstReport.includes(`window_start: ${STALE_STARTED_AT}`));
-    assert.ok(secondReport.includes(`window_start: ${firstCompletedAt}`));
+  // Cross-check against the actual written report files -- proves the
+  // persisted cursor really drove what was scanned, end to end through the
+  // bridge function under test.
+  assert.equal(typeof firstResult.path, "string", "first result must carry a written report path");
+  assert.equal(
+    typeof secondResult.path,
+    "string",
+    "second result must carry a written report path"
+  );
 
-    // The persisted cursor must reflect the SECOND call's completedAt --
-    // ready to hand the next (third) invocation an even later window.
-    const cursor = await readCostScanCursor(repo, sliceId);
-    assert.ok(cursor, "cursor should exist after two successful scans");
-    assert.equal(cursor!.lastWindowEnd, secondCompletedAt);
-  });
+  // The persisted cursor must reflect the SECOND call's completedAt --
+  // ready to hand the next (third) invocation an even later window.
+  const cursor = await readCostScanCursor(repo, sliceId);
+  assert.ok(cursor, "cursor should exist after two successful scans");
+  assert.equal(cursor!.lastWindowEnd, secondCompletedAt);
 });
 
 // ---------------------------------------------------------------------------
diff --git a/tsconfig.json b/tsconfig.json
index c86162d1..dd6cc2db 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -3,7 +3,6 @@
     "target": "ES2022",
     "module": "NodeNext",
     "moduleResolution": "NodeNext",
-    "rootDir": "src",
     "strict": true,
     "noEmit": true,
     "declaration": false,
diff --git a/tsconfig.test.json b/tsconfig.test.json
index 39c2e120..27760f5e 100644
--- a/tsconfig.test.json
+++ b/tsconfig.test.json
@@ -1,7 +1,6 @@
 {
   "extends": "./tsconfig.json",
   "compilerOptions": {
-    "rootDir": "src",
     "strict": false,
     "noImplicitAny": false,
     "strictNullChecks": false,

```

## Files touched

### crew/scripts/crew.mts

```
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { maybeEmitCostReport } from "./lib/cost-hygiene/emit-cost-report.mjs";
import { costSliceHandler } from "./lib/cost-hygiene/cost-slice-handler.mjs";
import { writeCostAdviseArtifact } from "./lib/cost-hygiene/cost-advise-writer.mjs";
import { normalizeMsysPath } from "./lib/fs-utils.mjs";
import { assertBunPresent } from "./lib/installer/bun-preflight.mjs";
import {
  normalizeReviewDecision,
  normalizeValidationDecision,
  ReviewArtifactSchema,
  ValidationArtifactSchema
} from "./lib/artifact-schemas.mjs";

// Flag schema. Each entry maps a CLI flag to the flags-object key and the
// arity (whether it consumes a value). Aliases (e.g. `--verdict` → `decision`)
// are supported by giving two entries the same target key. parseArgs() drives
// off this table instead of a 350-line if-chain.
//
// Keep entries alphabetized within each arity group for diffability.
const FLAG_SPEC = {
  // Boolean flags (no value).
  "--aggregate-all": { key: "aggregateAll", boolean: true },
  "--allow-existing": { key: "allowExisting", boolean: true },
  "--artifact-only": { key: "artifactOnly", boolean: true },
  "--force": { key: "force", boolean: true },
  "--help": { key: "help", boolean: true },
  "-h": { key: "help", boolean: true },
  "--json": { key: "json", boolean: true },
  "--live": { key: "live", boolean: true },
  "--no-self": { key: "noSelf", boolean: true },
  "--non-code": { key: "nonCode", boolean: true },
  "--repo-context": { key: "repoContext", boolean: true },
  "--scaffold": { key: "scaffold", boolean: true },
  "--validate": { key: "validate", boolean: true },
  // Value-consuming flags.
  "--agent": { key: "agent" },
  "--alerts": { key: "alerts" },
  "--author-id": { key: "authorId" },
  "--budget": { key: "budget" },
  "--approver": { key: "approver" },
  "--badge": { key: "badge" },
  "--blocked-by": { key: "blockedBy" },
  "--build": { key: "build" },
  "--builder": { key: "builder" },
  "--clues": { key: "clues" },
  "--commit-pattern": { key: "commitPattern" },
  "--completed-at": { key: "completedAt" },
  "--confidence": { key: "confidence" },
  "--decision": { key: "decision" },
  "--deliverable": { key: "deliverable" },
  "--deploy": { key: "deploy" },
  "--deployer": { key: "deployer" },
  "--discovery-status": { key: "discoveryStatus" },
  "--environment": { key: "environment" },
  "--environments": { key: "environments" },
  "--evidence": { key: "evidence" },
  "--external-deltas": { key: "externalDeltas" },
  "--extra-root": { key: "extraRoot" },
  "--feat": { key: "feat" },
  "--feature": { key: "feature" },
  "--features": { key: "features" },
  "--files": { key: "files" },
  "--files-read": { key: "filesRead" },
  "--findings": { key: "findings" },
  "--from": { key: "from" },
  "--goal": { key: "goal" },
  "--handoff": { key: "handoff" },
  "--id": { key: "id" },
  "--k": { key: "gepaK" },
  "--kind": { key: "kind" },
  "--logs": { key: "logs" },
  "--memories-used": { key: "memoriesUsed" },
  "--metrics": { key: "metrics" },
  "--missing": { key: "missing" },
  "--mode": { key: "mode" },
  "--next": { key: "next" },
  "--note": { key: "note" },
  "--out-of-scope": { key: "outOfScope" },
  "--out": { key: "out" },
  "--outcome": { key: "outcome" },
  "--owner": { key: "owner" },
  "--pace": { key: "pace" },
  "--phase": { key: "phase" },
  "--preset": { key: "preset" },
  "--project": { key: "project" },
  "--reason": { key: "reason" },
  "--refresh-when": { key: "refreshWhen" },
  "--repo": { key: "repo" },
  "--requester": { key: "requester" },
  "--resolver": { key: "resolver" },
  "--resource": { key: "resource" },
  "--revision": { key: "revision" },
  "--reviewer": { key: "reviewer" },
  "--reviewer-label": { key: "reviewerLabel" },
  "--risks": { key: "risks" },
  "--run": { key: "run" },
  "--run-id": { key: "runId" },
  "--run-steps": { key: "runSteps" },
  "--run-title": { key: "runTitle" },
  "--source": { key: "gepaSource" },
  "--source-project": { key: "sourceProject" },
  "--scope": { key: "scope" },
  "--limit": { key: "limit" },
  "--token-cap": { key: "tokenCap" },
  "--judge": { key: "judge" },
  "--judge-id": { key: "judgeId" },
  "--not-checked": { key: "notChecked" },
  "--split": { key: "split" },
  "--severity": { key: "severity" },
  "--shape": { key: "shape" },
  "--skip-reason": { key: "skipReason" },
  "--slice": { key: "slice" },
  "--started-at": { key: "startedAt" },
  "--status": { key: "status" },
  "--summary": { key: "summary" },
  "--telemetry": { key: "telemetry" },
  "--test-summary": { key: "testSummary" },
  "--test-summary-skip-reason": { key: "testSummarySkipReason" },
  "--tier": { key: "tier" },
  "--title": { key: "title" },
  "--to": { key: "to" },
  "--trigger-filename": { key: "triggerFilename" },
  "--update": { key: "updatePath" },
  "--url": { key: "url" },
  "--validation-evidence": { key: "validationEvidence" },
  "--validator": { key: "validator" },
  "--verdict": { key: "decision" }, // alias of --decision
  "--verified-from": { key: "verifiedFrom" },
  "--weeks": { key: "weeks" },
  "--window": { key: "window" },
  "--role": { key: "role" },
  "--surface": { key: "surface" },
  "--stack": { key: "stack" },
  "--concern": { key: "concern" },
  "--date": { key: "date" },
  "--lens": { key: "lens" },
  "--since": { key: "since" },
  "--sibling": { key: "sibling" },
  "--tag": { key: "tag" },
  "--tags": { key: "tags" }
} as const;

type FlagSpecValues = (typeof FLAG_SPEC)[keyof typeof FLAG_SPEC];
type FlagKey = Exclude<FlagSpecValues["key"], "repo">;
type Flags = {
  [K in FlagKey]: Extract<FlagSpecValues, { key: K }> extends { boolean: true }
    ? boolean
    : string | null;
} & { repo: string } & { [key: string]: string | boolean | null };

function buildDefaultFlags(): Flags {
  return {
    repo: process.cwd(),
    allowExisting: false,
    help: false,
    force: false,
    owner: null,
    requester: null,
    approver: null,
    resolver: null,
    kind: null,
    severity: null,
    shape: null,
    summary: null,
    reason: null,
    note: null,
    status: "open",
    id: null,
    decision: null,
    title: null,
    goal: null,
    mode: null,
    pace: null,
    scope: null,
    outOfScope: null,
    files: null,
    evidence: null,
    externalDeltas: null,
    risks: null,
    runSteps: null,
    next: null,
    from: null,
    to: null,
    deliverable: null,
    confidence: null,
    reviewer: null,
    validator: null,
    deployer: null,
    environment: null,
    build: null,
    deploy: null,
    environments: null,
    logs: null,
    metrics: null,
    alerts: null,
    telemetry: null,
    clues: null,
    discoveryStatus: null,
    verifiedFrom: null,
    missing: null,
    refreshWhen: null,
    resource: null,
    url: null,
    revision: null,
    badge: null,
    preset: null,
    project: null,
    commitPattern: null,
    triggerFilename: null,
    reviewerLabel: null,
    startedAt: null,
    completedAt: null,
    runTitle: null,
    sourceProject: null,
    blockedBy: null,
    feature: null,
    features: null,
    nonCode: false,
    noSelf: false,
    aggregateAll: false,
    repoContext: false,
    scaffold: false,
    extraRoot: null,
    phase: null,
    testSummary: null,
    testSummarySkipReason: null,
    findings: null,
    validationEvidence: null,
    builder: null,
    feat: null,
    filesRead: null,
    handoff: null,
    run: null,
    slice: null,
    tier: null,
    updatePath: null,
    agent: null,
    window: null,
    role: null,
    surface: null,
    stack: null,
    concern: null,
    lens: null,
    gepaSource: null,
    limit: null,
    tokenCap: null,
    sibling: null,
    json: false,
    live: false,
    validate: false,
    judge: null,
    judgeId: null,
    authorId: null,
    notChecked: null,
    split: null,
    out: null,
    weeks: null,
    artifactOnly: false,
    budget: null,
    gepaK: null,
    since: null,
    tag: null,
    tags: null,
    skipReason: null,
    date: null,
    runId: null,
    outcome: null,
    memoriesUsed: null
  };
}

// Strip exactly one trailing newline (LF or CRLF) so file-authored bodies
// (which almost always end in a newline) round-trip the same as an
// equivalent argv string, without touching any internal newlines.
function stripSingleTrailingNewline(text: string): string {
  return text.replace(/\r?\n$/, "");
}

// Reads a `--<flag>-file <path>` value off disk (or stdin when path is "-",
// matching `gh issue create -F -` convention). Long prose bodies — review
// findings, synthesis summaries — routinely contain apostrophes and
// backticks that get mangled by shell quoting when passed as a literal
// argv string (astragenie/dev-team#152). Reading the same content from a
// file the caller wrote directly (no shell interpolation in between) sidesteps
// the whole class of quoting bugs.
function readFlagFileValue(filePath: string): string {
  const raw = filePath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(filePath, "utf8");
  return stripSingleTrailingNewline(raw);
}

// Generic `--<flag>-file <path|->` companion for every value-consuming flag
// in FLAG_SPEC (e.g. `--summary-file`, `--findings-file`): reads the value
// from disk/stdin instead of argv so prose bodies never ride shell quoting.
// Returns the next parse index when `value` is a recognized `-file`
// companion token, or null otherwise (not handled — caller falls through).
// See #152.
// FLAG_SPEC authors: never add a real flag whose name ends in `-file` —
// it would collide with this companion convention. Also note only one
// flag per invocation may read stdin via `-`; a second `-` read after
// EOF yields an empty string, not an error.
function tryApplyFileFlagToken(
  value: string,
  rest: string[],
  index: number,
  flags: Flags
): number | null {
  if (!value.startsWith("--") || !value.endsWith("-file")) return null;
  const baseFlag = value.slice(0, -"-file".length);
  const baseSpec = (FLAG_SPEC as Record<string, { key: string; boolean?: boolean }>)[baseFlag];
  if (!baseSpec || baseSpec.boolean) return null;
  const filePath = rest[index + 1];
  if (filePath === undefined) {
    throw new Error(`${value} requires a file path argument (use - to read from stdin)`);
  }
  const flagsRecord = flags as Record<string, string | boolean | null>;
  flagsRecord[baseSpec.key] = readFlagFileValue(filePath);
  return index + 2;
}

// Apply a single token to flags/positionals. Returns the next index to read
// (usually `index + 1` or `index + 2` for value-consuming flags) or -1 to
// signal "stop the parse loop" (encountered `--` end-of-flags separator).
function applyFlagToken(
  rest: string[],
  index: number,
  flags: Flags,
  positionals: string[]
): number {
  const value = rest[index];
  if (value === undefined) return index + 1;
  if (value === "--") {
    for (let tail = index + 1; tail < rest.length; tail += 1) {
      const tailVal = rest[tail];
      if (tailVal !== undefined) positionals.push(tailVal);
    }
    return -1;
  }
  const spec = (FLAG_SPEC as Record<string, { key: string; boolean?: boolean }>)[value];
  if (spec) {
    const flagsRecord = flags as Record<string, string | boolean | null>;
    if (spec.boolean) {
      flagsRecord[spec.key] = true;
      return index + 1;
    }
    flagsRecord[spec.key] = rest[index + 1] ?? null;
    return index + 2;
  }
  const fileFlagResult = tryApplyFileFlagToken(value, rest, index, flags);
  if (fileFlagResult !== null) return fileFlagResult;
  if (value.startsWith("--")) {
    throw new Error(`Unknown argument: ${value}`);
  }
  positionals.push(value);
  return index + 1;
}

function resolveCommand(
  command: string | undefined,
  flags: Flags,
  positionals: string[]
): { command: string; helpTarget: string | null; flags: Flags; positionals: string[] } {
  if (!command || command === "--help" || command === "-h") {
    return { command: "help", helpTarget: null, flags, positionals };
  }
  if (flags.help) {
    return { command: "help", helpTarget: command, flags, positionals };
  }
  return { command, helpTarget: null, flags, positionals };
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags = buildDefaultFlags();
  const positionals: string[] = [];

  let index = 0;
  while (index < rest.length) {
    const nextIndex = applyFlagToken(rest, index, flags, positionals);
    if (nextIndex === -1) break;
    index = nextIndex;
  }

  return resolveCommand(command, flags, positionals);
}

function usage(target: string | null = null) {
  const subcommands = {
    "install-global": "  node scripts/crew.mjs install-global",
    audit: "  node scripts/crew.mjs audit --repo <path>",
    bootstrap: "  node scripts/crew.mjs bootstrap --repo <path>",
    init: "  node scripts/crew.mjs init --repo <path> [--allow-existing]",
    claim: "  node scripts/crew.mjs claim --repo <path> [--owner <name>] <files...>",
    release: "  node scripts/crew.mjs release --repo <path> [--owner <name>] [files...]",
    "show-claims": "  node scripts/crew.mjs show-claims --repo <path>",
    "show-conflicts":
      "  node scripts/crew.mjs show-conflicts --repo <path> [--owner <name>] [files...]",
    "quickwin-lane":
      "  node scripts/crew.mjs quickwin-lane [spawn|status] --repo <path> [--date YYYY-MM-DD]",
    "claim-check": "  node scripts/crew.mjs claim-check --repo <path> [--owner <name>] <files...>",
    "request-approval":
      "  node scripts/crew.mjs request-approval --repo <path> --summary <text> [--kind <kind>] [--severity <level>] [--requester <name>] [--approver <name>] [--reason <text>]",
    "show-approvals":
      "  node scripts/crew.mjs show-approvals --repo <path> [--status open|resolved|all] [--approver <name>]",
    "resolve-approval":
      "  node scripts/crew.mjs resolve-approval --repo <path> --id <approval-id> --decision approved|rejected|canceled [--resolver <name>] [--note <text>]",
    "wake-up": "  node scripts/crew.mjs wake-up --repo <path>",
    "brief-me": "  node scripts/crew.mjs brief-me --repo <path>",
    "scope-estimate":
      "  node scripts/crew.mjs scope-estimate --files <path:lines[:eslintDisable],...>",
    "discover-deployment": "  node scripts/crew.mjs discover-deployment --repo <path>",
    "write-deployment-guidance":
      "  node scripts/crew.mjs write-deployment-guidance --repo <path> --title <text> [--discovery-status repo-derived|partial|live-verified] [--verified-from <a,b>] [--missing <a,b>] [--summary <text>] [--build <text>] [--deploy <text>]",
    "show-workflow-state": "  node scripts/crew.mjs show-workflow-state --repo <path>",
    "mark-badge":
      "  node scripts/crew.mjs mark-badge --repo <path> --badge review_required|review_passed|review_failed|review_skipped|validation_expected|validation_passed|validation_failed|validation_skipped|validation_stale|dev_deploy_expected|dev_checked|dev_failed|dev_skipped|prod_deploy_expected|prod_checked|prod_failed|prod_skipped|blocked|specialist_recommended|escalated_to_dispatcher|incident_resolved|rollback_executed|incident_blocked|help_request|help_resolved [--note <text>] [--blocked-by <artifact-id>] (escalated_to_lead accepted as backward-compat alias)",
    "write-run-brief":
      "  node scripts/crew.mjs write-run-brief --repo <path> --title <text> [--goal <text>] [--mode <mode>] [--pace <pace>]",
    "write-build-bundle":
      "  node scripts/crew.mts write-build-bundle --repo <path> --slice <SLICE-NN> --builder <builder|builder-be|builder-fe> --run <YYYYMMDDTHHMMSSZ> --handoff <path> [--feat <FEAT-NNN>] [--files <a,b>] [--files-read <c,d>]",
    "write-handoff-and-bundle":
      "  node scripts/crew.mts write-handoff-and-bundle --repo <path> --title <text> --summary <text> --files <a,b> --confidence <high|medium|low> [--builder builder|builder-be|builder-fe] [--slice <SLICE-NN>] [--run <YYYYMMDDTHHMMSSZ>] [--feat <FEAT-NNN>] [--files-read <c,d>] [--risks <text>] [--next <text>]",
    "write-handoff":
      "  node scripts/crew.mts write-handoff --repo <path> --title <text> [--from <role>] [--to <role>] [--goal <text>] [--summary <text>] [--scope <text>] [--out-of-scope <text>] [--deliverable <text>] [--files <a,b>] [--confidence high|medium|low] [--risks <text>] [--next <text>] [--feature <FEAT-NNN>] [--phase <name>] [--status <text>]",
    "write-review-result":
      "  node scripts/crew.mjs write-review-result --repo <path> --title <text> [--reviewer <role>] [--decision approved|approved_with_notes|rejected|needs_fix] [--verdict <decision>] [--not-checked <a,b,c>] [--author-id <id>] [--judge-id <id>]\n" +
      "    Prose bodies (--summary, --findings, --risks, --next, ...) accept a `--<flag>-file <path|->` companion\n" +
      "    (e.g. --summary-file /tmp/summary.md, or - for stdin) so apostrophes/backticks never ride shell argv (#152).",
    "write-validation-plan":
      "  node scripts/crew.mjs write-validation-plan --repo <path> --title <text> [--validator <role>] [--environment <name>]",
    "write-validation-result":
      "  node scripts/crew.mjs write-validation-result --repo <path> --title <text> [--validator <role>] [--environment <name>] [--decision pass|fail|skipped] [--skip-reason <text>]",
    "write-deployment-check":
      "  node scripts/crew.mjs write-deployment-check --repo <path> --title <text> [--deployer <role>] [--environment dev|prod] [--resource <name>] [--url <service-url>] [--revision <id>] [--decision <decision>]",
    "write-final-synthesis":
      "  node scripts/crew.mjs write-final-synthesis --repo <path> --title <text> --external-deltas <text|none> [--summary <text>] [--run-steps <a,b>] [--files <a,b>] [--force]\n" +
      "    --summary accepts a --summary-file <path|-> companion for prose with apostrophes/backticks (#152).",
    "cost-slice":
      "  node scripts/crew.mjs cost-slice --repo <path> [--started-at <iso>] [--completed-at <iso>] [--run-title <text>] [--source-project <slug>] [--aggregate-all]",
    "cost-advise": "  node scripts/crew.mjs cost-advise --repo <path>",
    "cost-watch":
      "  node scripts/crew.mts cost-watch --repo <path> [--limit N] [--token-cap N]\n" +
      "    Read-only operator burn-watch (FEAT-194 S4): recent per-dispatch agent/model/tokens\n" +
      "    (.claude/logs/dispatch-timing.jsonl) + recent per-slice usd/tokens/cache-hit%\n" +
      "    (.claude/artifacts/crew/cost/), with an advisory flag against loop.cost.ceilingUsd\n" +
      "    and a per-dispatch token cap (default 150000). No new telemetry pipeline.",
    "agent-stats":
      "  node scripts/crew.mts agent-stats [--agent <name>] [--window last_n_slices:<N>] [--repo <path>]",
    "agent-route":
      "  node scripts/crew.mts agent-route [--role <r>] [--surface <s>] [--stack <s>] [--concern <c>] [--lens <l>] [--scope <s>] [--repo <path>]",
    "gepa-history":
      "  node scripts/crew.mts gepa-history <agent> [--source eval|captured|soak] [--limit N] [--repo <path>]",
    "gepa-corpus-sync":
      "  node scripts/crew.mts gepa-corpus-sync [--sibling <p1,p2,...>] [--json] [--repo <path>]",
    "gepa-corpus-report":
      "  node scripts/crew.mts gepa-corpus-report [<agent>] [--json] [--repo <path>]",
    "gepa-corpus-optimize":
      "  node scripts/crew.mts gepa-corpus-optimize <agent> --budget <usd> [--k <int>] [--repo <path>]",
    "gepa-eval":
      "  node scripts/crew.mts gepa-eval <agent> [--live] [--judge <name>] [--validate] [--split N/M] [--repo <path>]",
    "gepa-mine-reviewer":
      "  node scripts/crew.mts gepa-mine-reviewer [--weeks N] [--out <dir>] [--repo <path>]",
    "gepa-optimize":
      "  node scripts/crew.mts gepa-optimize <agent> --budget <usd> [--k <int>] [--artifact-only] [--repo <path>]",
    "gepa-resume":
      "  node scripts/crew.mts gepa-resume [<agent>] [--repo <path>]\n" +
      "    With <agent>: clears the no-winner streak counter for that agent.\n" +
      "    Without <agent>: clears the global optimize.paused flag in gepa.config.json.",
    "gepa-invalidate":
      "  node scripts/crew.mts gepa-invalidate --agent <name> [--since <iso>] [--tag <tag>] [--repo <path>]",
    "gepa-revert": "  node scripts/crew.mts gepa-revert --agent <name> [--repo <path>]",
    "gepa-thaw": "  node scripts/crew.mts gepa-thaw <agent> [--repo <path>]",
    "recall-block":
      "  node scripts/crew.mts recall-block --repo <path> [--agent <name>] [--tags <a,b>] [--project <a,b>]\n" +
      "    --project accepts a comma-list (OR-composed, FEAT-423); omitted falls back\n" +
      "    to the configured memory.project in .claude/loop.json.",
    "memory-drift-check":
      "  node scripts/crew.mts memory-drift-check --repo <path> [--window <days>]\n" +
      "    Read-only: compares learnings.jsonl entries in the window against astramem's\n" +
      "    recall() results and reports entries not confirmed present remotely (S4\n" +
      "    accepted-risk drift note). Never writes to astramem.",
    "resolve-model":
      "  node scripts/crew.mts resolve-model --phase <build|architect|...> [--shape <shape>] [--repo <path>]\n" +
      "    Reads .claude/loop.json loop.modelRouting + the trivial-shape tier table and\n" +
      "    prints the resolved model string (e.g. sonnet). Falls back to opus only when\n" +
      "    no routing is configured. Prints the sentinel 'inherit' when routing is\n" +
      '    disabled (crew.json features["model-routing"].enabled: false or\n' +
      "    loop.modelRouting.enabled: false) — then OMIT the Agent-tool model: argument\n" +
      "    so the agent's own model: frontmatter governs. FEAT-194 S2."
  };

  const subcommandsMap = subcommands as Record<string, string | undefined>;
  if (target && subcommandsMap[target]) {
    return ["Engineering OS installer", "", "Usage:", subcommandsMap[target]].join("\n");
  }

  return ["Engineering OS installer", "", "Usage:", ...Object.values(subcommands)].join("\n");
}

// Auto-emit a cost-report artifact when a run window is available. Designed
// to be called immediately after write-final-synthesis. Failures here are
// non-fatal: they return null so the synthesis result still surfaces.
// Best-effort cost-advise emit. Returns a description object on success,
// `{ error }` on failure. Extracted from maybeEmitCostReport to keep its
// cyclomatic complexity under the eslint cap.
async function emitCostAdvise(
  repoPath: string,
  { title, feature, phase }: { title: string | null; feature: string | null; phase: string | null }
) {
  try {
    const { buildCostAdvisor, renderCostAdvisorMarkdown } = await import("./lib/cost-advisor.mjs");
    const advisor = await buildCostAdvisor(repoPath, { limit: 10 });
    const md = renderCostAdvisorMarkdown(advisor);
    const advisePath = await writeCostAdviseArtifact(
      repoPath,
      md,
      advisor as unknown as Record<string, unknown>,
      {
        title,
        feature,
        phase
      }
    );
    return {
      path: advisePath,
      recommendations: advisor.recommendations?.length || 0,
      aggregateFlags: advisor.aggregateFlags?.length || 0
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

// Pull a subset of string flags into an args object, mapping null/missing
// to undefined. Keeps dispatch lambdas under the biome cognitive-complexity
// cap by hoisting the `flags.x ?? undefined` chain into a single helper.
function pickFlags<K extends string>(
  flags: Flags,
  keys: readonly K[]
): { [P in K]: string | undefined } {
  const result = {} as { [P in K]: string | undefined };
  const view = flags as Record<string, unknown>;
  for (const key of keys) {
    const value = view[key];
    result[key] = typeof value === "string" ? value : undefined;
  }
  return result;
}

// Resolve a builder name from a flag value, exiting with code 2 if invalid.
// Centralizes the validation that several write-* commands repeat.
function assertBuilderName(
  builder: string,
  command: string
): "fullstack-dev" | "backend-dev" | "frontend-dev" {
  const validBuilders = new Set(["fullstack-dev", "backend-dev", "frontend-dev"]);
  if (!validBuilders.has(builder)) {
    process.stderr.write(
      `[crew] ${command} refused: --builder must be one of ${[...validBuilders].join(", ")}.\n`
    );
    process.exit(2);
  }
  return builder as "fullstack-dev" | "backend-dev" | "frontend-dev";
}

// Resolve --decision into the canonical review verdict enum, exiting with
// code 2 on an unrecognized value (needs_fix, needs_revision accepted as
// rejected aliases; approved_with_conditions accepted as an approved_with_notes
// alias — P1.3 D7, widened FIX-0 for agents/architect-reviewer.md's verdict
// vocab). Hoisted out of write-review-result to stay under the
// cognitive-complexity cap, mirroring assertBuilderName above.
function resolveReviewVerdict(rawDecision: string | null): string | undefined {
  if (!rawDecision) return undefined;
  const normalized = normalizeReviewDecision(rawDecision);
  if (!normalized) {
    process.stderr.write(
      `[crew] write-review-result refused: unknown decision "${rawDecision}". Valid values: approved, approved_with_notes, rejected ` +
        "(needs_fix, needs_revision accepted as aliases for rejected; approved_with_conditions accepted as an alias for approved_with_notes).\n"
    );
    process.exit(2);
  }
  return normalized.canonical;
}

// Resolve --decision into the canonical validation verdict enum, exiting with
// code 2 on an unrecognized value. Legacy values real callers already emit
// (passed, passed_with_notes, failed) normalize rather than refuse (P1.3).
function resolveValidationVerdict(rawDecision: string | null): string | undefined {
  if (!rawDecision) return undefined;
  const normalized = normalizeValidationDecision(rawDecision);
  if (!normalized) {
    process.stderr.write(
      `[crew] write-validation-result refused: unknown decision "${rawDecision}". Valid values: pass, fail, skipped (passed, passed_with_notes, failed accepted as legacy aliases).\n`
    );
    process.exit(2);
  }
  return normalized.canonical;
}

// Refuses (exit 2) an approved/approved_with_notes review of a code-bearing
// diff that carries neither --test-summary nor --test-summary-skip-reason.
// Hoisted out of write-review-result to stay under the complexity cap.
function refuseIfTestAdequacyMissing(verdict: string | undefined, flags: Flags): void {
  const isApproved = verdict === "approved" || verdict === "approved_with_notes";
  const isCodeBearing = !flags.nonCode;
  if (!isApproved || !isCodeBearing || flags.testSummary || flags.testSummarySkipReason) return;
  process.stderr.write(
    "[crew] write-review-result refused: --test-summary or --test-summary-skip-reason is required for approved code-bearing reviews. " +
      "Pass --non-code if the diff is doc-only.\n"
  );
  process.exit(2);
}

// Shared refusal path for ReviewArtifactSchema / ValidationArtifactSchema
// safeParse results (P1.3). Structural rather than importing zod's
// SafeParseReturnType — same shape either schema's safeParse returns.
function refuseIfSchemaInvalid(
  command: string,
  result: { success: boolean; error?: { issues: Array<{ message: string }> } }
): void {
  if (result.success) return;
  const messages = result.error?.issues.map((i) => i.message).join("; ") ?? "unknown error";
  process.stderr.write(`[crew] ${command} refused: schema validation failed: ${messages}\n`);
  process.exit(2);
}

// Split a comma-delimited flag into a trimmed, non-empty string list.
function splitCsv(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// dev-team#247: derive the optional review-metadata fields for
// write-review-result. Hoisted out of the dispatch lambda (same reasoning as
// pickFlags) to keep its cognitive complexity under the biome cap.
// selfApproval is DERIVED (not a flag): `authorId != null && authorId ===
// judgeId`, so it stays undefined — and self_approval never lands in
// frontmatter — when the caller doesn't pass --author-id.
function deriveReviewMetadataFields(flags: Flags): {
  notChecked: string[];
  authorId: string | undefined;
  judgeId: string | undefined;
  selfApproval: boolean | undefined;
} {
  const notChecked = splitCsv(flags.notChecked);
  const authorId = flags.authorId ?? undefined;
  const judgeId = flags.judgeId ?? undefined;
  const selfApproval = authorId !== undefined ? authorId === judgeId : undefined;
  return { notChecked, authorId, judgeId, selfApproval };
}

// Read currentRun.slice from workflow-state.json with a graceful fallback.
async function resolveSliceFromState(repoPath: string, sliceFlag: string | null): Promise<string> {
  if (sliceFlag) return sliceFlag;
  try {
    const fs = await import("node:fs/promises");
    const pathMod = await import("node:path");
    const statePath = pathMod.join(repoPath, ".claude", "state", "crew", "workflow-state.json");
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    return state?.currentRun?.slice ?? "unknown";
  } catch {
    return "unknown";
  }
}

// Generate an ISO-like run id when --run is not supplied.
function generateRunId(runFlag: string | null): string {
  if (runFlag) return runFlag;
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

// Assemble the build-bundle around a handoff, recovering gracefully if the
// bundle write fails (handoff path still returns successfully).
async function tryAssembleBundle(input: {
  repoPath: string;
  sliceId: string;
  builderName: "fullstack-dev" | "backend-dev" | "frontend-dev";
  runId: string;
  feat: string | null;
  handoffPath: string;
  filesTouched: string[];
  filesRead: string[];
}): Promise<{ path: string | null; error: string | null }> {
  try {
    const fs = await import("node:fs/promises");
    const { assembleBuildBundle } = await import("./lib/build-bundle/assemble.mjs");
    const handoffBody = await fs.readFile(input.handoffPath, "utf8");
    const bundle = await assembleBuildBundle({
      repoPath: input.repoPath,
      sliceId: input.sliceId,
      builderName: input.builderName,
      runId: input.runId,
      ...(input.feat !== null ? { feat: input.feat } : {}),
      handoffBody,
      filesTouched: input.filesTouched,
      filesRead: input.filesRead
    });
    return { path: bundle.path, error: null };
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// `write-handoff-and-bundle` body extracted from the dispatch lambda to keep
// cognitive complexity under the biome cap. Writes a handoff via writeArtifact,
// then assembles a build-bundle that references it (non-fatal on bundle error).
async function writeHandoffAndBundle({ repoPath, flags, positionals }: CommandContext): Promise<{
  kind: "handoff-and-bundle";
  handoff: string;
  bundle: string | null;
  bundleError: string | null;
}> {
  const { writeArtifact } = await import("./lib/artifacts/write.mjs");
  const r = await writeArtifact(repoPath, "handoff", {
    title: flags.title || positionals.join(" ") || "Task Handoff",
    from: flags.from || flags.owner || "fullstack-dev",
    to: flags.to ?? "lead",
    status: flags.status !== "open" ? (flags.status ?? undefined) : undefined,
    repoContext: flags.repoContext,
    ...pickFlags(flags, [
      "goal",
      "summary",
      "scope",
      "outOfScope",
      "deliverable",
      "files",
      "confidence",
      "risks",
      "next",
      "feature",
      "phase",
      "updatePath"
    ])
  });
  if (!r.ok) throw r.error;
  const handoff = r.value as { path: string };

  const slice = await resolveSliceFromState(repoPath, flags.slice);
  const runId = generateRunId(flags.run);
  const builder = assertBuilderName(flags.builder ?? "fullstack-dev", "write-handoff-and-bundle");

  const bundle = await tryAssembleBundle({
    repoPath,
    sliceId: slice,
    builderName: builder,
    runId,
    feat: flags.feat,
    handoffPath: handoff.path,
    filesTouched: splitCsv(flags.files),
    filesRead: splitCsv(flags.filesRead)
  });

  return {
    kind: "handoff-and-bundle",
    handoff: handoff.path,
    bundle: bundle.path,
    bundleError: bundle.error
  };
}

interface CommandContext {
  repoPath: string;
  flags: Flags;
  positionals: string[];
}

// Command registry. Each entry is `(ctx) => Promise<result>` where
// `ctx = { repoPath, flags, positionals }`. main() dispatches by name; the
// table replaces a 240-line else-if chain. Adding a command = one entry.
const COMMANDS = {
  "install-global": async () => {
    assertBunPresent();
    const { installGlobal } = await import("./lib/installer.mjs");
    return installGlobal();
  },
  audit: async ({ repoPath }: CommandContext) => {
    const { auditRepo } = await import("./lib/installer.mjs");
    return auditRepo(repoPath);
  },
  bootstrap: async ({ repoPath }: CommandContext) => {
    assertBunPresent();
    const { bootstrapRepo } = await import("./lib/installer.mjs");
    const result = await bootstrapRepo(repoPath);
    if (!result.ok) {
      console.error(`Repository path does not exist: ${repoPath}`);
      process.exit(1);
    }
    return result.value;
  },
  init: async ({ repoPath, flags }: CommandContext) => {
    assertBunPresent();
    const { initRepo } = await import("./lib/installer.mjs");
    return initRepo(repoPath, { allowExisting: flags.allowExisting });
  },

  claim: async ({ repoPath, flags, positionals }: CommandContext) => {
    const { claimFiles } = await import("./lib/claims.mjs");
    const result = await claimFiles(repoPath, positionals, {
      owner: flags.owner || "lead-session"
    });
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    return result.value;
  },
  release: async ({ repoPath, flags, positionals }: CommandContext) => {
    const { releaseFiles } = await import("./lib/claims.mjs");
    const result = await releaseFiles(
      repoPath,
      positionals,
      flags.owner !== null ? { owner: flags.owner } : {}
    );
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    return result.value;
  },
  "show-claims": async ({ repoPath }: CommandContext) => {
    const { listClaims } = await import("./lib/claims.mjs");
    return { claims: await listClaims(repoPath) };
  },
  "show-conflicts": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { inspectClaims } = await import("./lib/claims.mjs");
    return inspectClaims(repoPath, positionals, { owner: flags.owner || "lead-session" });
  },

  "claim-check": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { checkDisjoint } = await import("./lib/claims.mjs");
    return checkDisjoint(repoPath, positionals, {
      owner: flags.owner || "quickwin-lane"
    });
  },

  "quickwin-lane": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { spawnChoreLane, choreLaneStatus } = await import("./lib/worktree-manager.mjs");
    const dateOpt = flags.date ? { date: flags.date } : {};
    const action = positionals[0] ?? "spawn";
    if (action === "status") {
      const status = await choreLaneStatus(repoPath, dateOpt);
      if (!status.ok) {
        console.error(status.error.message);
        process.exit(1);
      }
      return status.value;
    }
    if (action !== "spawn") {
      console.error(`Unknown quickwin-lane action: ${action} (expected spawn|status)`);
      process.exit(1);
    }
    const result = await spawnChoreLane(repoPath, dateOpt);
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    return result.value;
  },

  "request-approval": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { requestApproval } = await import("./lib/approvals.mjs");
    return requestApproval(repoPath, {
      requester: flags.requester || "lead-session",
      approver: flags.approver ?? undefined,
      kind: flags.kind || "scope_change",
      severity: flags.severity || "medium",
      summary: flags.summary || positionals.join(" ") || "Approval requested",
      reason: flags.reason || ""
    });
  },
  "show-approvals": async ({ repoPath, flags }: CommandContext) => {
    const { listApprovals } = await import("./lib/approvals.mjs");
    return {
      approvals: await listApprovals(repoPath, {
        status: flags.status ?? undefined,
        approver: flags.approver
      })
    };
  },
  "resolve-approval": async ({ repoPath, flags }: CommandContext) => {
    const { resolveApproval } = await import("./lib/approvals.mjs");
    const result = await resolveApproval(repoPath, {
      id: flags.id ?? undefined,
      decision: flags.decision ?? undefined,
      resolver: flags.resolver || "lead-session",
      note: flags.note || ""
    });
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    return result.value;
  },

  "wake-up": async ({ repoPath }: CommandContext) => {
    const { buildWakeUpBrief } = await import("./lib/wakeup.mjs");
    return buildWakeUpBrief(repoPath);
  },
  "brief-me": async ({ repoPath }: CommandContext) => {
    const { buildBriefingReport } = await import("./lib/briefing.mjs");
    return buildBriefingReport(repoPath);
  },
  "scope-estimate": async ({ flags, positionals }: CommandContext) => {
    const { estimateScope } = await import("./lib/scope-estimate.mjs");
    const rawFiles = (flags.files || positionals.join(",") || "").split(",").filter(Boolean);
    const files = rawFiles.map((entry) => {
      const [p, linesStr, eslintDisableStr] = entry.split(":");
      return {
        path: p || "",
        lines: parseInt(linesStr ?? "0", 10) || 0,
        eslintDisable: eslintDisableStr === "true"
      };
    });
    return estimateScope({ files });
  },
  fleet: async ({ repoPath, flags }: CommandContext) => {
    const { buildFleetReport } = await import("./lib/fleet.mjs");
    return buildFleetReport(repoPath, {
      extraRoots: flags.extraRoot ? [flags.extraRoot] : [],
      includeSelf: !flags.noSelf
    });
  },
  "discover-deployment": async ({ repoPath }: CommandContext) => {
    const { discoverDeploymentClues } = await import("./lib/deployment-guidance/read.mjs");
    return discoverDeploymentClues(repoPath);
  },
  "write-deployment-guidance": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { writeDeploymentGuidance } = await import("./lib/deployment-guidance/write.mjs");
    const r = await writeDeploymentGuidance(repoPath, {
      title: flags.title || positionals.join(" ") || "Repo Deployment Model",
      owner: flags.owner || "lead-session",
      ...pickFlags(flags, [
        "summary",
        "build",
        "deploy",
        "environments",
        "logs",
        "metrics",
        "alerts",
        "telemetry",
        "clues",
        "discoveryStatus",
        "verifiedFrom",
        "missing",
        "refreshWhen",
        "next"
      ])
    });
    if (!r.ok) throw r.error;
    return r.value;
  },

  "show-workflow-state": async ({ repoPath }: CommandContext) => {
    const { loadWorkflowState, summarizeWorkflowState } = await import("./lib/workflow-state.mjs");
    const workflowState = await loadWorkflowState(repoPath);
    return { workflowState, summary: summarizeWorkflowState(workflowState) };
  },
  "mark-badge": async ({ repoPath, flags }: CommandContext) => {
    const { markWorkflowBadge } = await import("./lib/workflow-state.mjs");
    const result = await markWorkflowBadge(repoPath, {
      badge: flags.badge ?? undefined,
      note: flags.note || flags.reason || "",
      blockedBy: flags.blockedBy,
      title: flags.title ?? undefined,
      goal: flags.goal ?? undefined,
      mode: flags.mode ?? undefined,
      next: flags.next ?? undefined
    });
    if (!result.ok) {
      console.error(result.error.message);
      process.exit(1);
    }
    return { badge: flags.badge, currentRun: result.value };
  },

  "write-run-brief": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any = {
      title: flags.title || positionals.join(" ") || "Run Brief",
      owner: flags.owner || "lead-session",
      status: flags.status === "open" ? "active" : (flags.status ?? undefined),
      ...pickFlags(flags, [
        "goal",
        "mode",
        "pace",
        "summary",
        "scope",
        "outOfScope",
        "files",
        "next",
        "feature",
        "phase"
      ])
    };
    if (flags.tier === "full" || flags.tier === "light") {
      fields.tier = flags.tier;
    }
    const r = await writeArtifact(repoPath, "run-brief", fields);
    if (!r.ok) throw r.error;
    return r.value;
  },
  "write-build-bundle": async ({ repoPath, flags }: CommandContext) => {
    const { assembleBuildBundle } = await import("./lib/build-bundle/assemble.mjs");
    const fs = await import("node:fs/promises");

    const slice = flags.slice ?? "unknown";
    const builder = flags.builder;
    const run = flags.run;
    const handoffPath = flags.handoff;

    if (!builder || !run || !handoffPath) {
      process.stderr.write(
        "[crew] write-build-bundle refused: --builder, --run, and --handoff are required.\n"
      );
      process.exit(2);
    }
    const validBuilders = new Set(["fullstack-dev", "backend-dev", "frontend-dev"]);
    if (!validBuilders.has(builder)) {
      process.stderr.write(
        `[crew] write-build-bundle refused: --builder must be one of ${[...validBuilders].join(", ")}.\n`
      );
      process.exit(2);
    }

    const handoffBody = await fs.readFile(handoffPath, "utf8");
    const filesTouched = (flags.files ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const filesRead = (flags.filesRead ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const result = await assembleBuildBundle({
      repoPath,
      sliceId: slice,
      builderName: builder as "fullstack-dev" | "backend-dev" | "frontend-dev",
      runId: run,
      ...(flags.feat !== null ? { feat: flags.feat } : {}),
      handoffBody,
      filesTouched,
      filesRead
    });
    return result.path;
  },
  "write-handoff": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    // OPTIONAL dispatch-memory-credit-loop field (runner-plugin upstream
    // request 2026-07-16): --memories-used <csv> is the ids a specialist
    // self-reported it relied on. Absent/empty -> no key -> writeArtifact's
    // fireMemoriesUsedCreditSilent no-ops. See
    // docs/contracts/dispatch-memory-credit-loop-v1.md.
    const memoriesUsed = splitCsv(flags.memoriesUsed);
    const r = await writeArtifact(repoPath, "handoff", {
      title: flags.title || positionals.join(" ") || "Task Handoff",
      from: flags.from || flags.owner || "lead-session",
      // Only pass status if it's not the default "open" value from parseArgs
      // (the default "open" is for issue creation, not for artifacts).
      status: flags.status !== "open" ? (flags.status ?? undefined) : undefined,
      repoContext: flags.repoContext,
      ...(memoriesUsed.length > 0 ? { memoriesUsed } : {}),
      ...pickFlags(flags, [
        "to",
        "goal",
        "summary",
        "scope",
        "outOfScope",
        "deliverable",
        "files",
        "confidence",
        "risks",
        "next",
        "feature",
        "phase",
        "updatePath"
      ])
    });
    if (!r.ok) throw r.error;
    return r.value;
  },
  "write-handoff-and-bundle": async ({ repoPath, flags, positionals }: CommandContext) =>
    writeHandoffAndBundle({ repoPath, flags, positionals }),
  "write-review-result": async ({ repoPath, flags, positionals }: CommandContext) => {
    const rawDecision = flags.decision;
    // verdict is the canonical enum written to frontmatter; `decision` (below)
    // stays the raw value for body-prose back-compat.
    const verdict = resolveReviewVerdict(rawDecision);
    refuseIfTestAdequacyMissing(verdict, flags);
    const status = flags.status !== "open" ? (flags.status ?? undefined) : undefined;
    const { notChecked, authorId, judgeId, selfApproval } = deriveReviewMetadataFields(flags);
    refuseIfSchemaInvalid(
      "write-review-result",
      ReviewArtifactSchema.safeParse({
        decision: verdict,
        phase: flags.phase ?? undefined,
        feature: flags.feature ?? undefined,
        slice: flags.slice ?? undefined,
        findings: flags.findings ?? undefined,
        status,
        not_checked: notChecked.length > 0 ? notChecked : undefined,
        author_id: authorId,
        judge_id: judgeId,
        self_approval: selfApproval
      })
    );
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    const r = await writeArtifact(repoPath, "review-result", {
      title: flags.title || positionals.join(" ") || "Review Result",
      reviewer: flags.reviewer || flags.owner || "reviewer",
      decision: rawDecision ?? undefined,
      verdict,
      // Only pass status if it's not the default "open" value from parseArgs.
      status,
      nonCode: flags.nonCode ?? undefined,
      findings: flags.findings ?? null,
      scaffold: flags.scaffold ?? undefined,
      notChecked: notChecked.length > 0 ? notChecked : undefined,
      authorId,
      judgeId,
      selfApproval,
      ...pickFlags(flags, [
        "summary",
        "evidence",
        "files",
        "risks",
        "next",
        "feature",
        "phase",
        "testSummary",
        "testSummarySkipReason",
        "validationEvidence",
        "updatePath"
      ])
    });
    if (!r.ok) throw r.error;
    return r.value;
  },
  "write-validation-plan": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    const r = await writeArtifact(repoPath, "validation-plan", {
      title: flags.title || positionals.join(" ") || "Validation Plan",
      validator: flags.validator || flags.owner || "verifier",
      owner: flags.owner || "lead-session",
      ...pickFlags(flags, [
        "environment",
        "goal",
        "summary",
        "scope",
        "outOfScope",
        "evidence",
        "next",
        "feature",
        "phase"
      ])
    });
    if (!r.ok) throw r.error;
    return r.value;
  },
  "write-validation-result": async ({ repoPath, flags, positionals }: CommandContext) => {
    const rawDecision = flags.decision;
    // verdict is the canonical enum written to frontmatter; `decision` (below)
    // stays the raw value for body-prose back-compat.
    const verdict = resolveValidationVerdict(rawDecision);
    const status = flags.status !== "open" ? (flags.status ?? undefined) : undefined;
    refuseIfSchemaInvalid(
      "write-validation-result",
      ValidationArtifactSchema.safeParse({
        decision: verdict,
        skip_reason: flags.skipReason ?? undefined,
        phase: flags.phase ?? undefined,
        feature: flags.feature ?? undefined,
        slice: flags.slice ?? undefined,
        findings: flags.findings ?? undefined,
        status,
        validation_evidence: flags.validationEvidence ?? undefined
      })
    );
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    const r = await writeArtifact(repoPath, "validation-result", {
      title: flags.title || positionals.join(" ") || "Validation Result",
      validator: flags.validator || flags.owner || "verifier",
      decision: rawDecision ?? undefined,
      verdict,
      skipReason: flags.skipReason ?? undefined,
      // Only pass status if it's not the default "open" value from parseArgs.
      status,
      findings: flags.findings ?? null,
      scaffold: flags.scaffold ?? undefined,
      ...pickFlags(flags, [
        "environment",
        "goal",
        "summary",
        "evidence",
        "files",
        "risks",
        "next",
        "feature",
        "phase",
        "updatePath"
      ])
    });
    if (!r.ok) throw r.error;
    return r.value;
  },
  "write-deployment-check": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    const r = await writeArtifact(repoPath, "deployment-check", {
      title: flags.title || positionals.join(" ") || "Deployment Check",
      deployer: flags.deployer || flags.owner || "release-engineer",
      findings: flags.findings ?? null,
      ...pickFlags(flags, [
        "environment",
        "resource",
        "url",
        "revision",
        "decision",
        "goal",
        "summary",
        "evidence",
        "files",
        "risks",
        "next",
        "feature",
        "phase"
      ])
    });
    if (!r.ok) throw r.error;
    return r.value;
  },
  "write-final-synthesis": async ({ repoPath, flags, positionals }: CommandContext) => {
    if (flags.externalDeltas === null || flags.externalDeltas === undefined) {
      throw new Error(
        "write-final-synthesis requires --external-deltas. " +
          "Enumerate sibling-config changes the synthesis depends on " +
          "(env var renames, terraform/helm updates, sibling-repo PRs, feature flags, DB migrations, IAM). " +
          "Pass --external-deltas none explicitly if there are none. " +
          "A silent default is how renamed env vars silently fall back to old defaults in prod."
      );
    }
    const { writeArtifact } = await import("./lib/artifacts/write.mjs");
    const synthResult = await writeArtifact(repoPath, "final-synthesis", {
      title: flags.title || positionals.join(" ") || "Final Synthesis",
      owner: flags.owner || "lead-session",
      status: flags.status === "open" ? "completed" : (flags.status ?? undefined),
      force: flags.force ?? undefined,
      ...pickFlags(flags, [
        "summary",
        "files",
        "evidence",
        "externalDeltas",
        "runSteps",
        "risks",
        "next",
        "feature",
        "phase"
      ])
    });
    if (!synthResult.ok) throw synthResult.error;
    const synthesis = synthResult.value;
    const costArtifact = await maybeEmitCostReport(
      repoPath,
      {
        runTitle: flags.title || positionals.join(" ") || null,
        feature: flags.feature,
        phase: flags.phase
      },
      emitCostAdvise
    );
    return costArtifact ? { ...synthesis, costReport: costArtifact } : synthesis;
  },

  "cost-advise": async ({ repoPath, flags }: CommandContext) => {
    const { buildCostAdvisor, renderCostAdvisorMarkdown } = await import("./lib/cost-advisor.mjs");
    const advisor = await buildCostAdvisor(repoPath, { limit: 10 });
    const md = renderCostAdvisorMarkdown(advisor);
    const writePath = await writeCostAdviseArtifact(
      repoPath,
      md,
      advisor as unknown as Record<string, unknown>,
      {
        title: flags.title,
        feature: flags.feature,
        phase: flags.phase
      }
    );
    return {
      target: advisor.target?.sliceId || advisor.target?.runTitle || null,
      recommendations: advisor.recommendations,
      aggregateFlags: advisor.aggregateFlags || [],
      baseline: advisor.baseline,
      reportsAnalyzed: advisor.reports.length,
      artifactPath: writePath
    };
  },
  "cost-slice": ({ repoPath, flags }: CommandContext) => costSliceHandler({ repoPath, flags }),

  // Read-only operator burn-watch (FEAT-194 S4). Rides existing cost-report
  // artifacts + dispatch-timing.jsonl — no new telemetry pipeline.
  "cost-watch": async ({ repoPath, flags }: CommandContext) => {
    const { buildCostWatch, renderCostWatchReport } = await import("./lib/cost-watch.mjs");
    const limit = flags.limit ? parseInt(flags.limit, 10) : undefined;
    const tokenCap = flags.tokenCap ? parseInt(flags.tokenCap, 10) : undefined;
    const data = await buildCostWatch(repoPath, {
      ...(limit !== undefined && Number.isFinite(limit) ? { limit } : {}),
      ...(tokenCap !== undefined && Number.isFinite(tokenCap)
        ? { perDispatchTokenCap: tokenCap }
        : {})
    });
    return renderCostWatchReport(data);
  },

  "cost-setup": async ({ repoPath, flags }: CommandContext) => {
    const { parseFeatureOverrides, runCostSetup } = await import("./lib/cost-setup.mjs");
    const featuresFlag = typeof flags.features === "string" ? flags.features : null;
    const overrides = parseFeatureOverrides(featuresFlag);
    return runCostSetup(repoPath, overrides);
  },

  "features-list": async () => {
    const { listFeatures } = await import("./lib/features-service.mjs");
    return { features: listFeatures() };
  },

  "agent-stats": async ({ repoPath, flags }: CommandContext) => {
    const { aggregateAgentStats, writeAgentStatsArtifact, windowSlug } = await import(
      "./lib/agent-stats-aggregator.mjs"
    );

    // Parse --window flag (default: last_n_slices:10 or env override).
    const rawWindow =
      flags.window ?? `last_n_slices:${process.env["CREW_AGENT_STATS_WINDOW"] ?? "10"}`;
    const windowMatch = /^last_n_slices:(\d+)$/.exec(rawWindow);
    if (!windowMatch) {
      process.stderr.write(
        `[crew] agent-stats: unsupported window spec "${rawWindow}". Expected last_n_slices:<N>.\n`
      );
      process.exit(2);
    }
    const n = parseInt(windowMatch[1] ?? "10", 10);
    const window = { kind: "last_n_slices" as const, n };

    // Optional agent filter.
    const agentFilter = flags.agent ? [flags.agent] : undefined;

    const rows = await aggregateAgentStats(
      agentFilter ? { repo: repoPath, window, agents: agentFilter } : { repo: repoPath, window }
    );
    const artifactPath = await writeAgentStatsArtifact(repoPath, rows, window);

    // Pretty-print table to stdout.
    const slug = windowSlug(window);
    const lines: string[] = [
      `Agent stats — window: ${slug} (${rows.length} agent(s))`,
      "",
      "Agent".padEnd(30) +
        "N".padStart(4) +
        "  pass%".padStart(7) +
        "  wallMs".padStart(9) +
        "  tokens".padStart(9) +
        "  rework%".padStart(10) +
        "  valfail%".padStart(11) +
        "  medDisp".padStart(10),
      "-".repeat(90)
    ];
    for (const r of rows) {
      lines.push(
        r.agent.padEnd(30) +
          String(r.sample_count).padStart(4) +
          `  ${(r.pass_rate * 100).toFixed(1)}%`.padStart(7) +
          `  ${r.mean_wall_ms}`.padStart(9) +
          `  ${r.mean_tokens}`.padStart(9) +
          `  ${(r.review_rework_rate * 100).toFixed(1)}%`.padStart(10) +
          `  ${(r.validation_fail_rate * 100).toFixed(1)}%`.padStart(11) +
          `  ${r.median_dispatches_to_pass}`.padStart(10)
      );
    }
    lines.push("", `Artifact written: ${artifactPath}`);

    // Print the table directly (not via JSON.stringify).
    process.stdout.write(lines.join("\n") + "\n");
    return artifactPath;
  },

  "agent-route": async ({ repoPath, flags }: CommandContext) => {
    const { loadAgentRegistry, routeByTags } = await import("./lib/agent-registry.mjs");
    const registry = await loadAgentRegistry(repoPath);
    const query: import("./lib/agent-registry.mjs").RouteQuery = {};
    if (flags.role) query.role = flags.role;
    if (flags.surface) query.surface = flags.surface;
    if (flags.stack) query.stack = flags.stack;
    if (flags.concern) query.concern = flags.concern;
    if (flags.lens) query.lens = flags.lens;
    if (flags.scope) query.scope = flags.scope;
    const matches = routeByTags(registry, query);
    const askedFilters = Object.values(query).filter(Boolean).length;

    const lines: string[] = [
      `Agent route — query: ${askedFilters === 0 ? "(none — listing all)" : JSON.stringify(query)} (${matches.length} match(es))`,
      "",
      "Rank  Score  Agent".padEnd(60) + "Matched dimensions",
      "-".repeat(110)
    ];
    matches.slice(0, 20).forEach((m, i) => {
      lines.push(
        `${String(i + 1).padStart(4)}  ${String(m.score).padStart(5)}  ${m.entry.name.padEnd(40)} ${m.matched.join(", ")}`
      );
    });
    if (matches.length > 20) lines.push("", `... ${matches.length - 20} more not shown`);
    process.stdout.write(lines.join("\n") + "\n");
    return { registryCount: registry.length, matchCount: matches.length };
  },

  "gepa-history": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runGepaHistoryCmd } = await import("./lib/gepa/history.mjs");
    // Reconstruct raw-args array so history.ts can parse them uniformly.
    const rawArgs: string[] = [...positionals];
    if (flags.gepaSource) rawArgs.push("--source", flags.gepaSource);
    if (flags.limit) rawArgs.push("--limit", flags.limit);
    const result = await runGepaHistoryCmd(repoPath, rawArgs);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-corpus-sync": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runCorpusSyncCmd } = await import("./lib/gepa/corpus-sync.mjs");
    const rawArgs: string[] = [...positionals];
    // --sibling takes a comma-separated list of repo roots (the single-value
    // flag parser keeps only the last token, so siblings ride one flag).
    if (typeof flags.sibling === "string" && flags.sibling) {
      for (const s of flags.sibling
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)) {
        rawArgs.push("--sibling", s);
      }
    }
    if (flags.json === true) rawArgs.push("--json");
    const result = await runCorpusSyncCmd(repoPath, rawArgs);
    // Return-only: main console.log's the return value, so writing stdout here
    // too would double-print (breaks `--json | jq`).
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trimEnd();
  },

  "gepa-corpus-report": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runCorpusReportCmd } = await import("./lib/gepa/corpus-report.mjs");
    const rawArgs: string[] = [...positionals];
    if (flags.json === true) rawArgs.push("--json");
    const result = await runCorpusReportCmd(repoPath, rawArgs);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trimEnd();
  },

  "gepa-corpus-optimize": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runCorpusOptimizeCmd } = await import("./lib/gepa/corpus-optimize.mjs");
    const rawArgs: string[] = [...positionals];
    if (typeof flags.budget === "string" && flags.budget) rawArgs.push("--budget", flags.budget);
    if (typeof flags.gepaK === "string" && flags.gepaK) rawArgs.push("--k", flags.gepaK);
    const result = await runCorpusOptimizeCmd(repoPath, rawArgs);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trimEnd();
  },

  "gepa-eval": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runGepaEvalCmd } = await import("./lib/gepa/eval.mjs");
    const rawArgs: string[] = [...positionals];
    if (flags.live === true) rawArgs.push("--live");
    if (flags.validate === true) rawArgs.push("--validate");
    if (typeof flags.judge === "string" && flags.judge) rawArgs.push("--judge", flags.judge);
    if (typeof flags.split === "string" && flags.split) rawArgs.push("--split", flags.split);
    const result = await runGepaEvalCmd(repoPath, rawArgs);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-mine-reviewer": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runMineReviewerBugCorpus } = await import("./lib/gepa/mine-reviewer-bug-corpus.mjs");
    // Reconstruct raw-args for the mining module's own parser.
    const rawArgs: string[] = [...positionals];
    if (typeof flags.weeks === "string" && flags.weeks) rawArgs.push("--weeks", flags.weeks);
    if (typeof flags.out === "string" && flags.out) rawArgs.push("--out", flags.out);
    const result = await runMineReviewerBugCorpus(repoPath, rawArgs);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-optimize": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runGepaOptimizeCmd } = await import("./lib/gepa/gepa-optimize-cmd.mjs");
    const rawArgs: string[] = [...positionals];
    if (typeof flags.budget === "string" && flags.budget) rawArgs.push("--budget", flags.budget);
    if (typeof flags.gepaK === "string" && flags.gepaK) rawArgs.push("--k", flags.gepaK);
    if (typeof flags.split === "string" && flags.split) rawArgs.push("--split", flags.split);
    if (flags.artifactOnly === true) rawArgs.push("--artifact-only");
    const result = await runGepaOptimizeCmd(repoPath, rawArgs);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-resume": async ({ repoPath, positionals }: CommandContext) => {
    const { runGepaResumeCmdExtended } = await import("./lib/gepa/gepa-killswitch-cmds.mjs");
    const result = await runGepaResumeCmdExtended(repoPath, positionals);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-invalidate": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runGepaInvalidateCmd } = await import("./lib/gepa/gepa-killswitch-cmds.mjs");
    const rawArgs: string[] = [...positionals];
    if (typeof flags.agent === "string" && flags.agent) rawArgs.push("--agent", flags.agent);
    if (typeof flags.since === "string" && flags.since) rawArgs.push("--since", flags.since);
    if (typeof flags.tag === "string" && flags.tag) rawArgs.push("--tag", flags.tag);
    const result = await runGepaInvalidateCmd(repoPath, rawArgs);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-revert": async ({ repoPath, flags, positionals }: CommandContext) => {
    const { runGepaRevertCmd } = await import("./lib/gepa/gepa-killswitch-cmds.mjs");
    const rawArgs: string[] = [...positionals];
    if (typeof flags.agent === "string" && flags.agent) rawArgs.push("--agent", flags.agent);
    const result = await runGepaRevertCmd(repoPath, rawArgs);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  "gepa-thaw": async ({ repoPath, positionals }: CommandContext) => {
    const { runGepaThawCmd } = await import("./lib/gepa/gepa-killswitch-cmds.mjs");
    const result = await runGepaThawCmd(repoPath, positionals);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.exitCode !== 0) process.exit(result.exitCode);
    return result.stdout.trim();
  },

  // FEAT-188 S3a — the CLI surface dispatch-assembly commands (build.md,
  // fix.md, ship.md, orchestrate-slice.md) call to fetch a formatted recall
  // block before dispatching a subagent. Best-effort: returns { block: "" }
  // when memory/recall is disabled, no entries match, or anything fails.
  "recall-block": async ({ repoPath, flags }: CommandContext) => {
    const { buildRecallBlock } = await import("./lib/memory/inject-recall.mjs");
    const tags = splitCsv(flags.tags);
    // #159: --project accepts a comma-list (OR-composed, FEAT-423), same
    // convention as --tags. Omitted -> buildRecallBlock falls back to the
    // configured memory.project in .claude/loop.json.
    const projects = splitCsv(flags.project);
    const project: string | string[] | undefined =
      projects.length > 1 ? projects : (projects[0] ?? undefined);
    const block = await buildRecallBlock({
      repoPath,
      ...(typeof flags.agent === "string" && flags.agent ? { agent: flags.agent } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      ...(project !== undefined ? { project } : {})
    });
    return { block };
  },

  // Agent-profile load: records the injected atom ids for later feedback
  // (when --run-id is given) and returns the `## Your track record (<agent>)`
  // block. Injection responsibility is governed by memory.profile.injectVia:
  //   - "hook" (DEFAULT): the SubagentStart hook injects the block
  //     deterministically, so this CLI returns an EMPTY block — the command-md
  //     dispatch paths omit an empty block, avoiding a double-injection while
  //     the sidecar is still recorded for outcome-feedback.
  //   - "command": returns the real block, for clients WITHOUT the dispatch
  //     hook (the orchestrator appends it itself).
  //
  // Dispatch-memory-credit-loop (runner-plugin upstream request 2026-07-16):
  // resolves through buildHandoffDigest, not buildProfileBlock directly, so
  // this CLI surface gets the same recall-with-ids extension the SubagentStart
  // hook gets (extending the seam, not forking a parallel one). Byte-identical
  // to the pre-existing behavior when `memory.feedback.creditLoop.enabled` is false
  // (default) — see handoff-digest.ts.
  "profile-block": async ({ repoPath, flags }: CommandContext) => {
    const { buildHandoffDigest } = await import("./lib/memory/handoff-digest.mjs");
    const { loadMemoryConfig } = await import("./lib/memory/inject-recall.mjs");
    const { writeInjectedAtoms } = await import("./lib/memory/injected-atoms.mjs");
    const agent = typeof flags.agent === "string" ? flags.agent : "";
    if (!agent) return { block: "", injectedIds: [] };
    const projects = splitCsv(flags.project);
    const project: string | string[] | undefined =
      projects.length > 1 ? projects : (projects[0] ?? undefined);
    const { block, ids: injectedIds } = await buildHandoffDigest({
      repoPath,
      agent,
      ...(project !== undefined ? { project } : {})
    });
    if (typeof flags.runId === "string" && flags.runId) {
      await writeInjectedAtoms(repoPath, flags.runId, injectedIds);
    }
    const rawMemory = await loadMemoryConfig(repoPath);
    const injectVia = (rawMemory as { profile?: { injectVia?: unknown } } | undefined)?.profile
      ?.injectVia;
    return { block: injectVia === "command" ? block : "", injectedIds };
  },

  // Outcome-gated positive-only feedback for a run's profile-injected atoms.
  "profile-feedback": async ({ repoPath, flags }: CommandContext) => {
    const { submitOutcomeFeedback } = await import("./lib/memory/profile-feedback.mjs");
    const runId = typeof flags.runId === "string" ? flags.runId : "";
    const outcome = flags.outcome === "pass" ? "pass" : "fail";
    if (!runId) return { credited: [] };
    return submitOutcomeFeedback({ repoPath, runId, outcome });
  },

  // FEAT-188 S5 — read-only diagnostic comparing JSONL entries within a
  // window against astramem's recall() results (S4 accepted-risk note: the
  // dual-write fan-out is best-effort, so a silent astramem failure can leave
  // the JSONL derived-duplicate MORE complete than astramem's source of
  // truth). Never writes to astramem — surfaces candidates for an operator
  // to reconcile manually.
  "memory-drift-check": async ({ repoPath, flags }: CommandContext) => {
    const { resolveAstramemRemote } = await import("@astragenie/memory-provider");
    const { checkDrift } = await import("./lib/memory/drift-check.mjs");
    const remote = await resolveAstramemRemote();
    if (!remote) {
      return {
        paired: false,
        message: "astramem is unpaired — no drift check possible (nothing to compare against)."
      };
    }
    const windowDays = typeof flags.window === "string" ? Number(flags.window) : undefined;
    const report = await checkDrift(repoPath, remote, {
      ...(windowDays !== undefined && Number.isFinite(windowDays) ? { windowDays } : {})
    });
    return { paired: true, provider: remote.name, ...report };
  },

  // FEAT-194 S2 — resolves the model tier an interactive dispatch (Agent-tool
  // `model:` argument) should pass explicitly instead of inheriting the
  // session model. Reads .claude/loop.json loop.modelRouting (missing/invalid
  // file is non-fatal — treated as "no routing configured", which resolves to
  // the opus fallback). Pure resolution logic lives in
  // ./lib/models/resolve-model.ts; this handler owns the one bit of I/O.
  //
  // FEAT-194 S1 — gated behind the crew.json features["model-routing"]
  // toggle (default on), read via features-service.ts's isEnabled() —
  // the same helper the other three crew.json feature flags
  // (redundant-read-stop/subagent-inline-warn/shell-preflight) use. When
  // the operator flips it off (or sets loop.modelRouting.enabled: false),
  // routing is bypassed entirely and the sentinel "inherit" is printed:
  // the dispatcher must then OMIT the Agent-tool `model:` argument so the
  // agent's own `model:` frontmatter (agents/*.md) governs.
  "resolve-model": async ({ repoPath, flags }: CommandContext) => {
    const phase = typeof flags.phase === "string" ? flags.phase : null;
    if (!phase) {
      throw new Error("resolve-model refused: --phase <build|architect|...> is required.");
    }
    const shape = typeof flags.shape === "string" ? flags.shape : null;
    const { resolveDispatchModel } = await import("./lib/models/resolve-model.mjs");
    const { isEnabled, readCrewConfig } = await import("./lib/features-service.mjs");
    const fs = await import("node:fs/promises");
    const pathMod = await import("node:path");
    let config: { loop?: { modelRouting?: Record<string, string> } } | null = null;
    try {
      const raw = await fs.readFile(pathMod.join(repoPath, ".claude", "loop.json"), "utf8");
      config = JSON.parse(raw);
    } catch {
      config = null;
    }
    const crewConfig = await readCrewConfig(repoPath);
    const modelRoutingEnabled = isEnabled("model-routing", crewConfig);
    return resolveDispatchModel(phase, shape, config, modelRoutingEnabled) ?? "inherit";
  }
};

export async function runCrew(argv: string[]): Promise<{ code: number; output: string }> {
  try {
    const { command, helpTarget, flags, positionals } = parseArgs(argv);
    const repoPath = path.resolve(normalizeMsysPath(flags.repo));

    if (command === "help") {
      return { code: 0, output: usage(helpTarget) };
    }

    const handler = (COMMANDS as Record<string, (ctx: CommandContext) => Promise<unknown>>)[
      command
    ];
    if (!handler) {
      return { code: 1, output: `Unknown command: ${command}` };
    }

    const result = await handler({ repoPath, flags, positionals });
    // String results are printed as-is (e.g. file paths); everything else is JSON.
    const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { code: 0, output };
  } catch (error) {
    return { code: 1, output: (error as Error).message };
  }
}

async function main() {
  const { code, output } = await runCrew(process.argv.slice(2));
  if (code === 0) {
    console.log(output);
  } else {
    console.error(output);
    process.exitCode = 1;
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  void main();
}

```

### crew/scripts/lib/cost-hygiene/cost-advise-writer.mts

```
// Extracted from scripts/crew.mts's "cost-advise" command body (SLICE-11,
// P2 seam-elimination contract §1). Previously an unexported local helper
// inside crew.mts, reachable only via the CLI subprocess. Exported here so
// runner-plugin's crew-bridge.mts can call it as a direct import instead of
// shelling out to `crew cost-advise`. No behavior change from the original.

import fs from "node:fs/promises";
import path from "node:path";

// Slug source priority: explicit --title → advisor target slice → advisor
// target runTitle → fallback "advise". --title lets the loop side pass the
// enriched FEAT/PHASE/SLICE tag so cost-advise filenames match the rest of
// the artifact surface.
function buildCostAdviseSlug(title: string | null, advisor: Record<string, unknown> | null) {
  const t = advisor?.["target"] as { sliceId?: string; runTitle?: string } | null | undefined;
  const source = title || t?.sliceId || t?.runTitle || "advise";
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Optional YAML frontmatter block; "" when both feature + phase absent so
// existing output stays byte-identical for legacy callers.
function buildOptionalFrontmatter(feature: string | null, phase: string | null) {
  const lines = [];
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    lines.push(`phase: ${JSON.stringify(String(phase))}`);
  }
  if (feature) lines.push(`feature: ${feature}`);
  if (lines.length === 0) return "";
  return ["---", ...lines, "---", ""].join("\n");
}

export async function writeCostAdviseArtifact(
  repoPath: string,
  md: string,
  advisor: Record<string, unknown> | null,
  options: { title?: string | null; feature?: string | null; phase?: string | null } = {}
): Promise<string> {
  const { title = null, feature = null, phase = null } = options;
  const dir = path.join(repoPath, ".claude", "artifacts", "crew", "cost-insights");
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const slug = buildCostAdviseSlug(title, advisor);
  const fm = buildOptionalFrontmatter(feature, phase);
  const file = path.join(dir, `${stamp}-cost-advise-${slug}.md`);
  await fs.writeFile(file, fm + md + "\n");
  return file;
}

```

### crew/scripts/lib/cost-hygiene/cost-slice-handler.mts

```
// Extracted from scripts/crew.mjs — "cost-slice" command handler body.
// Kept in cost-hygiene/ because it emits per-slice and aggregate cost artifacts.
import path from "node:path";
import {
  aggregateDispatchTiming,
  aggregateBashGates,
  getLatestRunId
} from "../dispatch-timing-reader.mjs";
import type { DispatchBreakdown } from "../artifacts/types.mjs";

interface MaybeEmitAggregateSliceOpts {
  repoPath: string;
  startedAt: string;
  completedAt: string | null;
  runTitle: string;
  outcome: Record<string, unknown>;
  feature: string | null;
  phase: string | null;
  notes: string | null;
  sourceProject: string | null | undefined;
  writeArtifact: (
    repoPath: string,
    kind: string,
    fields: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  computeSessionCost: (
    repoPath: string,
    opts: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
}

async function maybeEmitAggregateSlice(
  opts: MaybeEmitAggregateSliceOpts
): Promise<Record<string, unknown> | null> {
  const {
    repoPath,
    startedAt,
    completedAt,
    runTitle,
    outcome,
    feature,
    phase,
    notes,
    sourceProject,
    writeArtifact,
    computeSessionCost
  } = opts;
  const aggregateCost = await computeSessionCost(repoPath, {
    startedAt,
    completedAt,
    sourceProject,
    aggregateAll: true
  });
  const sources = aggregateCost["sources"] as unknown[] | undefined;
  if (!sources || sources.length <= 1) return null;
  const artifact = await writeArtifact(repoPath, "cost-report-aggregate", {
    title: runTitle,
    runTitle,
    cost: aggregateCost,
    outcome,
    notes,
    feature,
    phase
  });
  artifact["cost"] = aggregateCost as unknown;
  artifact["outcome"] = outcome as unknown;
  return artifact;
}

export interface CostSliceContext {
  repoPath: string;
  flags: Record<string, unknown>;
}

interface CostSliceParams {
  startedAt: string | undefined;
  completedAt: string | null;
  runTitle: string;
  notes: string | null;
  feature: string | null | undefined;
  phase: string | null | undefined;
  sourceProject: string | null | undefined;
}

function resolveCostSliceParams(
  flags: Record<string, unknown>,
  run: { startedAt?: string; completedAt?: string | null; title?: string } | null
): CostSliceParams {
  return {
    startedAt: (flags["startedAt"] as string | undefined) || run?.startedAt,
    completedAt: (flags["completedAt"] as string | null) || run?.completedAt || null,
    runTitle:
      (flags["runTitle"] as string | undefined) ||
      (flags["title"] as string | undefined) ||
      run?.title ||
      "manual-cost-slice",
    notes: (flags["summary"] as string | null) || null,
    feature: flags["feature"] as string | null | undefined,
    phase: flags["phase"] as string | null | undefined,
    sourceProject: flags["sourceProject"] as string | null | undefined
  };
}

/**
 * Collect dispatch + bash-gate telemetry for the cost-report breakdown section (FEAT-151).
 * Non-fatal: returns undefined on any error so the rest of the report still renders.
 */
async function collectDispatchBreakdown(
  repoPath: string,
  runId: string | undefined
): Promise<DispatchBreakdown | undefined> {
  try {
    const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"] ?? repoPath;
    const dispatchLog =
      process.env["CREW_DISPATCH_TIMING_LOG"] ??
      path.join(pluginRoot, ".claude", "logs", "dispatch-timing.jsonl");
    const bashLog =
      process.env["CREW_BASH_GATE_LOG"] ??
      path.join(pluginRoot, ".claude", "logs", "bash-gates.jsonl");
    // Fall back to scanning the log for the most recent runId when not provided
    const resolvedRunId = runId ?? (await getLatestRunId(dispatchLog));
    const [dispatch, gates] = await Promise.all([
      resolvedRunId
        ? aggregateDispatchTiming(dispatchLog, resolvedRunId)
        : Promise.resolve({ rowCount: 0, totalWallMs: 0, topSlow: [], topTokens: [] }),
      aggregateBashGates(bashLog)
    ]);
    // Suppress if both sources are empty (nothing interesting to show)
    if (dispatch.rowCount === 0 && gates.rowCount === 0) return undefined;
    return { dispatch, gates };
  } catch {
    return undefined;
  }
}

/**
 * Handler for the "cost-slice" CLI command.
 */
export async function costSliceHandler({
  repoPath,
  flags
}: CostSliceContext): Promise<Record<string, unknown>> {
  const { loadWorkflowState } = await import("../workflow-state.mjs");
  const { computeSessionCost: computeCost } = await import("../session-cost.mjs");
  const { collectOutcomeLinkage } = await import("../outcome-linkage.mjs");
  const { writeArtifact: writeArt } = await import("../artifacts/write.mjs");
  // Cast to permissive signatures to avoid cross-.mjs JSDoc type mismatches.
  const computeSessionCost = computeCost as (
    repoPath: string,
    opts: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  const state = await loadWorkflowState(repoPath);
  const run = state?.currentRun || null;
  const { startedAt, completedAt, runTitle, notes, feature, phase, sourceProject } =
    resolveCostSliceParams(flags, run);
  if (!startedAt) {
    throw new Error("cost-slice requires --started-at or an active/last run with startedAt");
  }
  const [sliceCost, dispatchBreakdown] = await Promise.all([
    computeSessionCost(repoPath, {
      startedAt,
      completedAt,
      sourceProject,
      aggregateAll: false
    }),
    collectDispatchBreakdown(
      repoPath,
      (run as unknown as Record<string, unknown> | null)?.["runId"] as string | undefined
    )
  ]);
  const outcome = (await collectOutcomeLinkage(repoPath, runTitle)) as unknown as Record<
    string,
    unknown
  >;
  const writeResult = await writeArt(repoPath, "cost-report-slice", {
    title: runTitle,
    runTitle,
    cost: sliceCost,
    outcome,
    ...(notes != null ? { notes } : {}),
    ...(feature != null ? { feature } : {}),
    ...(phase != null ? { phase } : {}),
    ...(dispatchBreakdown != null ? { dispatchBreakdown } : {})
  });
  if (writeResult.ok === false) throw writeResult.error;
  const sliceArtifact: Record<string, unknown> = { ...writeResult.value };
  sliceArtifact["cost"] = sliceCost;
  sliceArtifact["outcome"] = outcome;

  if (flags["aggregateAll"] !== true) {
    return sliceArtifact;
  }

  const writeArtifact = async (
    rp: string,
    kind: string,
    fields: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const r = await writeArt(rp, kind, fields as import("../artifacts/write.mjs").ArtifactFields);
    if (r.ok === false) throw r.error;
    return r.value as unknown as Record<string, unknown>;
  };

  const aggregateArtifact = await maybeEmitAggregateSlice({
    repoPath,
    startedAt,
    completedAt,
    runTitle,
    outcome,
    feature: feature ?? null,
    phase: phase ?? null,
    notes: notes ?? null,
    sourceProject,
    writeArtifact,
    computeSessionCost
  });

  return aggregateArtifact ? { slice: sliceArtifact, aggregate: aggregateArtifact } : sliceArtifact;
}

```

### docs/planning/p2-seam-contract.md

```
# P2 seam-elimination contract — crew-bridge execFile → direct imports (FEAT-003)

Authoring dispatch, 2026-08-19. Scope: `unification-plan.md` §4's five bridge
calls. Read-only research; this file is the only write. All facts below are
verified against the live merged tree at `C:/mega/dev-crew` (post-P1 subtree
import) — grep line numbers and one live `tsc`/`bun` repro are cited per claim,
not inferred from the plan text alone.

**Two findings not yet in the plan, both load-bearing for slice sequencing:**

0. **strictNullChecks narrowing blocker (SLICE-11 builder addendum, not
   caught by the original research pass).** `tsconfig.test.json` sets
   `strictNullChecks: false` (and `strict: false`). Once a cross-tree import
   pulls a `crew/scripts/lib/**` file that uses the `Result<T,E>` idiom
   `if (!r.ok) throw r.error;` into the SAME tsc program as
   `tsconfig.test.json`, that idiom fails to narrow under relaxed settings —
   TS reports `Property 'error' does not exist on type '{ ok: true; ... }'`
   even inside the `!r.ok` branch. Reproduced in isolation
   (`tsc --strict false --strictNullChecks false`): `if (!r.ok) throw
   r.error` and `if (r.ok) {...} else { throw r.error }` BOTH fail to narrow;
   only explicit equality (`if (r.ok === false) throw r.error;`) narrows
   correctly regardless of strictNullChecks. A second, related failure:
   `(x as Record<string, unknown> | null)` direct-casts a plain interface
   (e.g. `WorkflowRun`) to `Record<string, unknown> | null` — passes under
   `strict: true` (crew's own tsconfig) but fails TS2352 under
   `strictNullChecks: false`; fix is `x as unknown as Record<string,
   unknown> | null` (cast through `unknown` first). SLICE-11 fixed the four
   occurrences this exposed (`crew-bridge.mts` × 2, `cost-slice-handler.mts`
   × 3) as mechanical, behavior-identical edits. **Any later slice
   (SLICE-12/13) that cross-tree-imports a crew function using the bare
   `!result.ok` / `if (r.ok) {...} else {...}` idiom will hit the same
   TS2339 wall** — check for it proactively rather than rediscovering it.
1. **tsconfig blocker (new).** Root `tsconfig.json` sets `"rootDir": "src"`.
   The instant any `src/scripts/**` file imports a `crew/scripts/lib/**`
   module, `bunx tsc --project tsconfig.json --noEmit` fails **TS6059** ("File
   is not under rootDir"), independent of `noEmit`. Reproduced live: adding a
   throwaway cross-tree import under `src/scripts/lib/` and running the real
   `tsconfig.json` produced 4 TS6059 errors; deleting `rootDir` from the same
   config made the identical import typecheck clean (exit 0, 0 errors). Bun's
   runtime resolution is unaffected either way (`bun run` executed the same
   import successfully with `rootDir` present). `tsconfig.test.json` **also**
   re-declares `"rootDir": "src"` in its own `compilerOptions` (not just
   inherited) — both files need the key dropped, or CI gate 6's second
   invocation (`--project tsconfig.test.json`) stays red after the first is
   fixed.
2. **`write-validation-result` is already silently fail-soft in practice**,
   contradicting the "fail-hard" label callers currently rely on. Neither
   `phase-gate.mts`'s serial path (`crewArtifactRegistered: crewResult.ok`,
   phase-gate.mts:301) nor the parallel path
   (`phase-gate/parallel-orchestrator.mts:115-123`) inspects `crewResult.ok`
   before returning `overallStatus` — a failed `recordWithCrew` call today
   just leaves `crewArtifactRegistered: false` in the returned object with no
   effect on control flow. **SLICE-12 is not "preserve fail-hard" — it is
   "introduce fail-hard for the first time,"** by making the caller check the
   direct-import result and throw/exit non-zero. Call this out to the
   builder; treating it as a preservation task will reproduce today's silent
   swallow.

## 1. Per-call import map

| Call | Today's CLI handler (`crew/scripts/crew.mts`) | Direct-import replacement | Today's caller(s) |
|---|---|---|---|
| `write-run-brief` | line 1029, delegates to `writeArtifact(repoPath, "run-brief", fields)` | `import { writeArtifact } from "../../../crew/scripts/lib/artifacts/write.mjs"` (export at `write.mts:949`) | `crew-bridge.mts:89-133` (`writeCrewRunBrief`), called from `start-slice.mts:680` |
| `cost-slice` | line 1350, `costSliceHandler({ repoPath, flags })` | `import { costSliceHandler } from "../../../crew/scripts/lib/cost-hygiene/cost-slice-handler.mjs"` (export at `cost-slice-handler.mts:139`) | `crew-bridge.mts:259-277` (inside `tryWriteCostReport`), called from `complete-slice.mts:537` |
| `cost-advise` | line 1327, `buildCostAdvisor` + `renderCostAdvisorMarkdown` from `lib/cost-advisor.mjs`, then a local `writeCostAdviseArtifact` helper (crew.mts, not exported — see note) | `import { buildCostAdvisor, renderCostAdvisorMarkdown } from "../../../crew/scripts/lib/cost-advisor.mjs"`; `writeCostAdviseArtifact` must be **extracted and exported** from `crew.mts` into `crew/scripts/lib/cost-hygiene/` (or reuse `writeArtifact(repoPath, "cost-advise", …)` if the artifact-registry already has a `cost-advise` kind — confirm kind name in `artifact-schemas.mts` before SLICE-11 starts) | `crew-bridge.mts:300-314` (inside `tryWriteCostReport`), called from `complete-slice.mts:537` |
| `mark-badge` | line 1011, `markWorkflowBadge(repoPath, {...})` | `import { markWorkflowBadge } from "../../../crew/scripts/lib/workflow-state.mjs"` (export at `workflow-state.mts:373`) | `crew-bridge.mts:445-459` (`markValidationSkippedBadge`), called from `complete-slice.mts:465-467` |
| `write-validation-result` | line 1214, schema-validates then `writeArtifact(repoPath, "validation-result", {...})` | `import { writeArtifact } from "../../../crew/scripts/lib/artifacts/write.mjs"` + `import { ValidationArtifactSchema, resolveValidationVerdict } from "./<wherever they move>.mjs"` — **the schema-refusal logic (`refuseIfSchemaInvalid`, `ValidationArtifactSchema.safeParse`, `resolveValidationVerdict`) currently lives inline in `crew.mts` (not exported)** and must be extracted to an importable module in the same slice, or the fail-hard replacement loses the shape validation crew's CLI currently enforces before writing | `phase-gate.mts:105-151` (`recordWithCrew`), called from `phase-gate.mts:260` (serial) and `phase-gate/parallel-orchestrator.mts:115` (parallel) — both funnel through the single `recordWithCrew` function, so fixing it once fixes both call sites |

**Argv → param mapping** (mechanical, same for every call — CLI flags map to
camelCase object fields 1:1 minus the `--repo`/leading-CLI-path positionals,
which become the function's first positional `repoPath` arg):

| CLI flag pattern | Direct-call equivalent |
|---|---|
| `--repo <path>` | first positional param `repoPath` (already held by the caller, no round-trip needed) |
| `--title / --goal / --mode / --pace / --scope / --out-of-scope / --feature / --phase / --owner / --next` | object field, camelCase (`outOfScope`, `sourceProject`, etc.) — mapping already fully spelled out in `crew-bridge.mts`'s existing `pushOptionalFlags`/`appendFeaturePhaseArgs` helpers; those helpers can be deleted once nothing builds an argv array from these fields |
| `--badge / --note / --reason` | `{ badge, note: note \|\| reason }` — `markWorkflowBadge`'s `BadgeOptions` (workflow-state.mts) |
| `--decision / --summary / --evidence / --skip-reason` | `{ decision, summary, evidence... , skipReason }` on `writeArtifact`'s `fields` |
| `--aggregate-all / --source-project` | `flags["aggregateAll"] boolean` / `flags["sourceProject"] string` on `CostSliceContext.flags` (costSliceHandler reads `flags["..."]` directly — the caller must build a `flags` record, not positional params) |

## 2. Error contract per call

| Call | Contract | Implementation note |
|---|---|---|
| `write-run-brief` | fail-soft (unchanged) | wrap `writeArtifact(...)` in try/catch; on catch, `console.error("[crew-bridge] write-run-brief failed:", err.message)` (structured log line naming the call site — AC-4 in the pending SLICE-11 file requires this, and today's execFile path has no equivalent log line at all, so this is a net-new observability improvement, not parity) |
| `cost-slice` / `cost-advise` | fail-soft (unchanged); cursor (`writeCostScanCursor`) only advances on success — preserve the existing `!report?.error` gate in `tryWriteCostReport` verbatim, just check `try/catch` success instead of an `.error` field on the return | same log-on-catch requirement as write-run-brief |
| `mark-badge` | fail-soft (unchanged) | same |
| `write-validation-result` | **fail-hard — new behavior, see finding 2 above.** `recordWithCrew` must `throw` (not return `{ok:false}`) on failure; `phase-gate.mts:260` and `parallel-orchestrator.mts:115` must NOT catch it — let it propagate so `runPhaseGate`/`runPhaseGateParallel` exit non-zero and no `PASS` artifact is written | this is the one call where removing the try/catch entirely (rather than converting it) is correct |

## 3. Return-value handling differences

Every existing call site (`start-slice.mts:680`, `complete-slice.mts:465-546`)
already wraps its `crew-bridge.mts` call in a local `bestEffort()` helper
(`complete-slice.mts:46-52`) that catches thrown errors into `{ error:
message }` and otherwise returns whatever the callee returned — **none of
these callers branch on the internal shape of a successful result**, they
just store it into an artifact-summary object. This makes the CLI-stdout→
direct-object switch low risk:

- Today: `execFile` → `JSON.parse(stdout)` (or `{ stdout: stdout.slice(0,
  500) }` on parse failure) → `bestEffort` catches only execFile-throw, not a
  `.error` field crew's CLI might embed in valid JSON.
- After: the direct function's return value (already a plain object, e.g.
  `Result<ArtifactRecord, Error>` from `writeArtifact`, or the JSON-shaped
  object `costSliceHandler`/`buildCostAdvisor` already construct in-process)
  passes straight through `bestEffort`. **`writeArtifact` returns a
  `Result<T, Error>` wrapper (`{ ok, value }` or `{ ok, error }`), not `T`
  directly** — every direct-import call site that replaces a `writeArtifact`-
  backed CLI subcommand (`write-run-brief`, `write-validation-result`) must
  unwrap `.ok`/`.value`/`.error` itself; `costSliceHandler` and
  `buildCostAdvisor`/`markWorkflowBadge` do not use this wrapper and return
  bare objects or `Result<WorkflowRun|null, Error>` respectively (`workflow-
  state.mts:376` — same unwrap requirement).
- `collectCostReportPaths` / `stampCostReportSessionId` in `crew-bridge.mts`
  (lines 333-363) read `report.path` / `report.slice.path` /
  `report.aggregate.path` off the `cost-slice` return — confirm these field
  names survive the switch from `JSON.parse(stdout)` to the direct
  `costSliceHandler` return (spot check: `cost-slice-handler.mts:186-218`
  returns `sliceArtifact`/`{slice, aggregate}` with `.path` coming from
  `writeResult.value` — field names match, no change needed here).

## 4. Cross-tree import rule

- **Bun resolves it today, verified live.** A relative `.mjs`-specifier
  import from a `src/scripts/lib/**` file into `crew/scripts/lib/**` (e.g.
  `../../../crew/scripts/lib/workflow-state.mjs`) resolves and runs correctly
  under `bun run` with zero config changes.
- **tsc does not, until `rootDir` is removed** — see finding 1. Prescribed
  fix, must land as part of SLICE-11 (the first slice to add a cross-tree
  import), not deferred to P3: delete `"rootDir": "src"` from both
  `tsconfig.json`'s `compilerOptions` and `tsconfig.test.json`'s own
  (re-declared) `compilerOptions.rootDir`. No other compiler option needs to
  change — `noEmit: true` on both means dropping `rootDir` has no effect on
  build output, only on the "must be under this dir" check. Re-verified: with
  `rootDir` absent, the real `tsconfig.json` typechecks a cross-tree import
  clean (exit 0).
- **Exact specifier form:** relative POSIX path, `.mjs` extension pointing at
  the `.mts` source file, no path alias / no `tsconfig.json` `"paths"` entry.
  Matches the zero-alias convention already used inside both `src/scripts/**`
  and `crew/scripts/**`. Depth varies by caller: from
  `src/scripts/lib/slice-linker/*.mts` it's `../../../../crew/scripts/lib/...`;
  from `src/scripts/lib/*.mts` (e.g. `phase-gate.mts`) it's
  `../../crew/scripts/lib/...`.
  **SLICE-11 correction (builder, 2026-08-18):** the original text above said
  three `../` (`../../../crew/...`) for the `slice-linker/` depth — that is
  wrong by one level. `src/scripts/lib/slice-linker/crew-bridge.mts`'s own
  directory is four segments below the repo root (`src` → `scripts` → `lib`
  → `slice-linker`), so reaching a repo-root-sibling `crew/` requires four
  `../`, not three. Verified live: `bunx tsc --project tsconfig.json --noEmit`
  failed TS2307 "Cannot find module" against all five crew-bridge.mts
  cross-tree imports at three `../`; changing to four `../` resolved clean
  (0 errors). The two-level case (`src/scripts/lib/*.mts` → `../../crew/...`)
  was not touched by this slice and is unverified by this correction.
- **`validate-imports.mts` (runner's slice-linker boundary gate) — verified
  no allowlist change needed.** Read the full file
  (`src/scripts/validate-imports.mts`): its `BOUNDARIES` array polices three
  intra-`src/scripts` barrels (`slice-linker.mts`/`slice-linker/`,
  `watch.mts`/`watch/`, `backlog-store.mts`/`backlog-store/`) — each entry's
  `blockedPatterns` only matches `slice-linker/...`, `watch/...`,
  `backlog-store/...` substrings. A `crew/scripts/lib/...` specifier matches
  none of them and is invisible to this gate today. No new boundary is
  declared for the crew/ tree in P2 — that's a P3/P4 decision (whether
  cross-tree imports should themselves be barrel-gated once the merge is
  further along), out of scope here.
- `crew/tsconfig.json` (separate project: `moduleResolution: "Bundler"`,
  `allowImportingTsExtensions: true`, `module: "ESNext"`) still diverges from
  root `tsconfig.json` (`moduleResolution: "NodeNext"`, `module: "NodeNext"`).
  This divergence is **not** a P2 blocker (crew/scripts files being imported
  don't need to typecheck differently when consumed from outside — NodeNext
  resolution followed the `.mjs` specifier to the `.mts` file without issue
  in the live repro), but the plan's §3 "one tsconfig" goal is not yet
  achieved despite P1 being marked complete — flag for P3/P4 rather than
  silently letting two divergent configs coexist indefinitely.

## 5. `devcrew.json` schema v2

Two source files today: `.claude/loop.json` (JSON, read via
`config-resolver.mts`, `CONFIG_FILENAME = ".claude/loop.json"`) and
`.claude/crew.json` (JSON, read via `features-service.mts:213`,
`.claude/<cwd>/.claude/crew.json`). **Neither of the five seam calls in §1
reads `crew.json` directly** — `crew.json`'s `features` block gates
PreToolUse/PostToolUse hooks (cost-hygiene, redundant-read-stop,
shell-preflight, subagent-inline-warn, push-verify, etc.), not the
artifact-writer functions being direct-imported. The schema merge is
therefore additive/parallel to SLICE-11/12, not a dependency of them — safe
to sequence as SLICE-13 independently.

| Field (source) | New key in `devcrew.json` | Notes |
|---|---|---|
| `loop.json` — every top-level key (`preset`, `presetName`, `schemaVersion`, `projectType`, `split`, `frontend`, `backend`, `contract`, `deployment`, `loop.*`, `stack.*`, `reviewers.*`, `mandatoryDocs`, `productName`, `productDescription`, `stackDescription`, `skills`, `roles.*`, `memory.*`) | same key, same nesting, unchanged | superset — nothing renamed |
| `crew.json` → `features` (14 flags: `cost-hygiene`, `redundant-read-stop`, `shell-preflight`, `subagent-inline-warn`, `push-verify`, `git-gate-block`, `otel-telemetry`, `bash-gate-telemetry`, `task-update-burst-warn`, `checkpoint-cadence`, `event-emit`, `model-routing`, `reviewer-decision-guard`, `builder-terminal-state-guard`, `dispatch-size-gate`) | new top-level `features` object, verbatim | `features-service.mts`'s `FEATURES` registry (source-of-truth metadata: version/default/description/scope/owner/since) stays in code, unchanged — only the on-disk enable/disable map merges |
| (new) | `schemaVersion: 2` at document root | `loop.json` already has an internal `schemaVersion: 1` field nested oddly at top level (line 4) — the migrator must not confuse the two; devcrew.json's `schemaVersion` is the document-format version, `loop.json`'s legacy field can be dropped or renamed `presetSchemaVersion` to disambiguate (builder's call, name it explicitly either way — do not leave two same-named fields with different meanings) |

**Migrator behavior:** read `.claude/loop.json` + `.claude/crew.json` if
present; write `.claude/devcrew.json` with the merged shape above +
`schemaVersion: 2`; write `.claude/loop.json.bak` and `.claude/crew.json.bak`
alongside the originals (do not delete the `.bak` files, do not delete the
originals either — leave them for one release as a rollback path per the
plan's "leaves a `.bak`" requirement); idempotent — a second run against a
repo that already has `devcrew.json` with `schemaVersion: 2` is a no-op
(check-then-write, not blind overwrite).

## 6. Deletion list

| Symbol / file | Consumers today | Disposition |
|---|---|---|
| `findCrewCli` (`plugin-identity.mts:19`) | `crew-bridge.mts:44` (`findHeroCrewCli`), `arch-gate.mts:465` (`isCrewAvailable`), `loop-installer.mts:101,216`, `phase-gate.mts:217` | delete — no "is crew installed" concept once crew/ is a permanent subtree |
| `crewCliRuntime` (`plugin-identity.mts:51`) | `crew-bridge.mts:120,195,304`, `phase-gate.mts:132` | delete — no more `execFile`, so no runtime-picker (`bun` vs `node`) needed |
| `MIN_CREW_VERSION` (`plugin-identity.mts:81`) + `getCrewVersion` (`plugin-identity.mts:85`) | `loop-installer.mts:14-15,111-116` | delete — version-floor check is meaningless inside one repo/one release train |
| `CREW_CLI_FILENAMES`, the `CREW_MARKETPLACE_NAME` env lookup (`plugin-identity.mts:15,24`) | internal to `findCrewCli` only | delete with `findCrewCli` |
| `isCrewAvailable` (`arch-gate.mts:464-467`) | `arch-gate.mts:496` (`deps.checkCrewAvailable` default) only | delete; `checkCrewAvailable` dep + its call site collapse (crew is always available) — confirm no test fixture pins `checkCrewAvailable` to `false` to exercise a "crew missing" branch that would need a new trigger |
| `runCrew` (`crew-bridge.mts:193-206`) | internal helper for `tryWriteCostReport`'s three `execFile` calls | delete once its three call sites are converted |
| `findHeroCrewCli` (`crew-bridge.mts:30-49`) + the `HERO_CREW_PATH` env override | every exported function in `crew-bridge.mts` | delete — with same-repo imports, "which crew build is installed" stops being a question; if a local-dev override is still wanted, it becomes an import of `../../../crew/scripts/lib/...` unconditionally, no override needed |
| **NOT deleted:** `compareSemver` (`plugin-identity.mts:104`), `checkBunVersion`/`getBunVersion`/`MIN_BUN_VERSION` (`plugin-identity.mts:121-141`) | `loop-installer.mts:87-93` (Bun version floor — unrelated to crew) | keep — these check the Bun runtime, not the crew plugin; `compareSemver` is generic and reused by the Bun check, don't delete it as a side effect of clearing crew-specific code |
| Artifact-as-IPC renderers in `crew-bridge.mts`: `renderSynthesisBody`, `renderSynthesisScores`, `renderSynthesisDecisions` (lines 461-540) | `writeCrewFinalSynthesis` only | **stay** for P2 — these render `.claude/artifacts/crew/runs/*-final-synthesis.md` directly on the loop side; they were never markdown round-tripped through crew's CLI (crew's own `write-final-synthesis` handler is a separate, unrelated artifact). The plan's §5 "artifact-as-IPC template writers go with the bridge" refers to a different set of writers — confirm scope with the plan owner before deleting these; deleting them would remove the loop-side final-synthesis feature entirely, which is not what §4's five-call table asks for |
| `crewCli` field surfaced in `loop-installer.mts`'s install-status return (lines 186, 216) | any command/status renderer reading `.crewCli` off install result (not traced in this pass — grep `\.crewCli\b` in `commands/`/`src/scripts/*.mts` before SLICE-11 closes) | repoint to a static marker or drop; low risk, display-only field |

## 7. Slice boundary map

Three pending slice stubs already exist (`SLICE-11/12/13` under
`.claude/artifacts/loop/ai-loop/slices/pending/`) with placeholder bullets and
identical, un-scoped ACs copied across all three — this section gives each a
disjoint `touches_files` list; the builder should also replace the generic
"bullet 1 / bullet 2" scope sections and split AC-1..5 per-slice rather than
repeating all five verbatim (AC-5 in particular belongs only to SLICE-13).

| Slice | Scope | `touches_files` |
|---|---|---|
| **SLICE-11** — fail-soft calls | `write-run-brief`, `cost-slice`, `cost-advise`, `mark-badge` → direct imports per §1/§2 tables; delete `runCrew`/`findHeroCrewCli`/`HERO_CREW_PATH` from `crew-bridge.mts`; **land the tsconfig `rootDir` fix from §4 in this slice** (it's the first cross-tree import) | `src/scripts/lib/slice-linker/crew-bridge.mts`, `tsconfig.json`, `tsconfig.test.json`, plus whichever `crew/scripts/lib/**` files need a new named export (`writeCostAdviseArtifact` extraction — see §1 `cost-advise` row) |
| **SLICE-12** — fail-hard call + phase-gate | `write-validation-result` → direct import with the new fail-hard contract (§2); extract `ValidationArtifactSchema`/`resolveValidationVerdict`/`refuseIfSchemaInvalid` from `crew.mts` into an importable module; update both call sites (`phase-gate.mts:260`, `phase-gate/parallel-orchestrator.mts:115`) to let the throw propagate; delete `findCrewCli`/`crewCliRuntime` usage in `phase-gate.mts` and the `if (!crewCli) throw "Hard dependency missing"` guard (crew is always present now) | `src/scripts/lib/phase-gate.mts`, `src/scripts/lib/phase-gate/parallel-orchestrator.mts`, new extracted validation-schema module under `crew/scripts/lib/artifacts/` (or wherever the extraction lands) |
| **SLICE-13** — config schema + migrator + `plugin-identity.mts`/`arch-gate.mts`/`loop-installer.mts` deletions | `devcrew.json` schemaVersion 2 per §5; migrator; delete `findCrewCli`/`MIN_CREW_VERSION`/`CREW_MARKETPLACE_NAME`/`getCrewVersion`/`CREW_CLI_FILENAMES` from `plugin-identity.mts` (keep `compareSemver`/Bun-version exports); delete `isCrewAvailable` from `arch-gate.mts`; strip the crew-version-floor block from `loop-installer.mts` (keep the Bun-version floor block) | `src/scripts/lib/plugin-identity.mts`, `src/scripts/lib/arch-gate.mts`, `src/scripts/lib/loop-installer.mts`, `.claude/loop.json`/`.claude/crew.json` → `.claude/devcrew.json` + migrator script, `config-resolver.mts` (`CONFIG_FILENAME` update) |

Disjoint by construction: SLICE-11 never touches `phase-gate*` or
`plugin-identity.mts`; SLICE-12 never touches `crew-bridge.mts`'s four
fail-soft calls or `devcrew.json`; SLICE-13 never touches `crew-bridge.mts` or
`phase-gate*`. Sequencing note: SLICE-11 should land first (it's the only one
that must fix the tsconfig blocker), but SLICE-13 has no code dependency on
either and could run in parallel with SLICE-11 if the wave planner prefers.

```

### src/scripts/lib/slice-linker/crew-bridge.mts

```
// Bridge layer that hands slice-completion artifacts off to the crew
// library. Direct in-process imports of crew/scripts/lib/** functions — no
// more subprocess/execFile hop (P2 seam-elimination, SLICE-11). Best-effort:
// any single failure (cost-report / handoff / final-synthesis) does not
// block the others; each fail-soft call catches internally, logs a
// structured line naming the call site (AC-4), and returns an `{ error }`
// shape so callers' `bestEffort()` wrappers see identical behavior to the
// old CLI-catch path.
//
// Extracted from slice-linker.mjs during the Tier B-8 split.

import fs from "node:fs/promises";
import path from "node:path";

import { writeArtifact } from "../../../../crew/scripts/lib/artifacts/write.mjs";
import type { ArtifactFields } from "../../../../crew/scripts/lib/artifacts/write.mjs";
import { costSliceHandler } from "../../../../crew/scripts/lib/cost-hygiene/cost-slice-handler.mjs";
import { writeCostAdviseArtifact } from "../../../../crew/scripts/lib/cost-hygiene/cost-advise-writer.mjs";
import {
  buildCostAdvisor,
  renderCostAdvisorMarkdown
} from "../../../../crew/scripts/lib/cost-advisor.mjs";
import { markWorkflowBadge } from "../../../../crew/scripts/lib/workflow-state.mjs";
import { buildArtifactSlug, buildArtifactTitle } from "../artifact-naming.mjs";
import { ensureDir, gradesRoot, decisionsRoot } from "../paths.mjs";
import { fanoutEnvelope } from "../webhook-fanout.mjs";
import { gitTextOrThrow } from "../run-git.mjs";
import { readCrewWorkflowState } from "../crew-workflow-reader.mjs";
import { renderIdentification } from "./agent-report-writer.mjs";
import { dedupeCostReportsInDir } from "./cost-report-dedup.mjs";
import {
  resolveCostScanWindow,
  resolveCostReportSessionId,
  writeCostScanCursor
} from "./cost-scan-cursor.mjs";

// Writes both cost-report (cost/) and cost-advise (cost-insights/) so the
// slice-close artifact set matches what `crew write-final-synthesis`
// auto-emits. `--aggregate-all` (aggregateAll flag) mirrors
// maybeEmitCostReport's default in crew.mts so cross-repo sessions are
// captured. The advise step is best-effort and reported in the return
// alongside the report.
// Direct-imports `writeArtifact("run-brief", ...)` to rotate
// workflow-state.currentRun to the new slice. Best-effort: a write failure
// is a soft no-op so the agent can still proceed; the loop driver inspects
// the return.
export async function writeCrewRunBrief(
  repoPath: string,
  {
    sliceId,
    title,
    goal,
    featureId,
    phase,
    mode,
    pace,
    scope,
    outOfScope
  }: {
    sliceId: string;
    title?: string | null;
    goal?: string | null;
    featureId?: string | null;
    phase?: string | null;
    mode?: string | null;
    pace?: string | null;
    scope?: string | null;
    outOfScope?: string | null;
  }
) {
  const titleSummary = title ? title.replace(/^SLICE-\d+:\s*/i, "") : null;
  const enrichedTitle = buildArtifactTitle({
    featureId,
    phase,
    sliceId,
    summary: titleSummary && titleSummary !== sliceId ? titleSummary : undefined
  });
  const hasPhase = phase !== null && phase !== undefined && String(phase).length > 0;
  const fields: ArtifactFields = {
    title: enrichedTitle,
    owner: "loop",
    next: "Begin implementation",
    ...(goal ? { goal } : {}),
    ...(mode ? { mode } : {}),
    ...(pace ? { pace } : {}),
    ...(scope ? { scope } : {}),
    ...(outOfScope ? { outOfScope } : {}),
    ...(featureId ? { feature: featureId } : {}),
    ...(hasPhase ? { phase: phase as string } : {})
  };
  try {
    const r = await writeArtifact(repoPath, "run-brief", fields);
    if (r.ok === false) throw r.error;
    return r.value;
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] write-run-brief failed (slice=${sliceId}): ${message}`);
    return { error: message };
  }
}

// Cost attribution mode:
// - "aggregate" (default): pass --aggregate-all so cross-repo session
//   work is captured (mirrors maybeEmitCostReport in crew.mjs).
// - "scoped": pass --source-project <slug> so concurrent loops in sibling
//   worktrees don't bleed into each other's cost windows.
// Config override: if config.loop.costProject is set, always use scoped
// with that value — avoids false-high alerts from aggregate mode when
// running a single repo alongside other active repos.
// Auto-detect fallback: linked worktree OR multiple worktrees → scoped.
export async function detectCostMode(repoPath: string, config: Record<string, any> | null) {
  if (config?.loop?.costProject) return "scoped";
  try {
    const { stdout: commonDir } = await gitTextOrThrow(["rev-parse", "--git-common-dir"], {
      cwd: repoPath,
      maxBuffer: 64 * 1024
    });
    const { stdout: gitDir } = await gitTextOrThrow(["rev-parse", "--git-dir"], {
      cwd: repoPath,
      maxBuffer: 64 * 1024
    });
    // Resolve both to absolute paths against repoPath before comparing —
    // git may emit one as relative and the other as absolute (Windows w/
    // home-dir git repo surfaced this), making string-equality false.
    const path = await import("node:path");
    const commonAbs = path.resolve(repoPath, commonDir.trim());
    const gitAbs = path.resolve(repoPath, gitDir.trim());
    if (commonAbs !== gitAbs) return "scoped";
    const { stdout: list } = await gitTextOrThrow(["worktree", "list", "--porcelain"], {
      cwd: repoPath,
      maxBuffer: 256 * 1024
    });
    const count = list.split(/\r?\n/).filter((l) => l.startsWith("worktree ")).length;
    return count > 1 ? "scoped" : "aggregate";
  } catch {
    return "aggregate";
  }
}

// Accepts either a bare sliceId (legacy callers) or a { sliceId, featureId,
// phase } object. The structured form is preferred — it lets the cost-slice
// run-title include the FEAT/phase tags so crew's slugifier writes them into
// the cost-report filename.

// Normalizes a human-readable project name or repo path into the slug form
// crew's session scanner expects under ~/.claude/projects/<slug>/ — same
// regex crew's own slugifyRepoPath uses (session-cost.ts). Idempotent: a
// dash already matches [^A-Za-z0-9] and maps to itself, so an
// already-slugified value passes through unchanged (SLICE-175 root-cause
// spike: docs/research/2026-08-02-citylive-zero-cost-telemetry.md — an
// unslugified config.loop.costProject bypasses crew's auto-detect fallback
// and silently zeroes the cost report).
function slugifyProjectSlug(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "-");
}

// Appends --source-project flags for the primary project and any aliases
// declared in config.loop.costProjectAliases. The crew CLI 0.9.0 parser
// uses last-one-wins when multiple --source-project flags are passed, so
// aliases are pushed FIRST and primary is pushed LAST — this ensures the
// primary wins in current crew builds while the full alias list is present
// for future crew versions that may support multi-source aggregation.
export function appendSourceProjectArgs(
  args: string[],
  primary: string,
  aliases: string[] | null | undefined
) {
  if (Array.isArray(aliases)) {
    for (const alias of aliases) {
      if (typeof alias === "string" && alias.length > 0) {
        args.push("--source-project", alias);
      }
    }
  }
  args.push("--source-project", primary);
}

// Builds the costSliceHandler flags record for the resolved mode/window.
// Aliases (config.loop.costProjectAliases) only mattered for the old argv
// path's last-flag-wins CLI parsing (appendSourceProjectArgs) — a
// direct-call flags object has a single sourceProject key, so only the
// primary project (the value that always won under argv too) needs to be
// set here. See appendSourceProjectArgs' own tests for the argv-shape
// behavior this replaces.
function buildCostSliceFlags(
  mode: "scoped" | "aggregate",
  config: Record<string, any> | null,
  repoPath: string,
  window: { startedAt: string | null; completedAt: string },
  featureId: string | null,
  phase: string | null,
  runTitle: string
): Record<string, unknown> {
  const flags: Record<string, unknown> = { runTitle };
  if (window.startedAt) flags.startedAt = window.startedAt;
  if (window.completedAt) flags.completedAt = window.completedAt;
  if (mode === "scoped") {
    flags.sourceProject = slugifyProjectSlug(config?.loop?.costProject ?? repoPath);
  } else {
    flags.aggregateAll = true;
  }
  if (featureId) flags.feature = featureId;
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    flags.phase = phase;
  }
  return flags;
}

// Direct-imports costSliceHandler. Fail-soft: catches internally, logs the
// call site (AC-4), and returns `{ error }` so the cursor-advance-only-on-
// success gate in tryWriteCostReport can inspect it the same way the old
// execFile-catch path did.
async function runCostSliceCall(
  repoPath: string,
  flags: Record<string, unknown>,
  sliceId: string | null | undefined
): Promise<Record<string, any>> {
  try {
    return await costSliceHandler({ repoPath, flags });
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] cost-slice failed (slice=${sliceId ?? "unknown"}): ${message}`);
    return { error: message };
  }
}

// Direct-imports buildCostAdvisor/renderCostAdvisorMarkdown/
// writeCostAdviseArtifact and mirrors crew.mts's own "cost-advise" CLI
// handler return shape (target/recommendations/aggregateFlags/baseline/
// reportsAnalyzed/artifactPath) so downstream consumers
// (postCostAdviseEnvelope, slice-close consumers) see an identical object
// either way. Fail-soft: catches internally, logs the call site (AC-4).
async function runCostAdviseCall(
  repoPath: string,
  runTitle: string,
  featureId: string | null,
  phase: string | null,
  sliceId: string | null | undefined
): Promise<Record<string, any>> {
  try {
    const advisor = await buildCostAdvisor(repoPath, { limit: 10 });
    const md = renderCostAdvisorMarkdown(advisor);
    const artifactPath = await writeCostAdviseArtifact(
      repoPath,
      md,
      advisor as unknown as Record<string, unknown>,
      { title: runTitle, feature: featureId, phase }
    );
    return {
      target: advisor.target?.sliceId || advisor.target?.runTitle || null,
      recommendations: advisor.recommendations,
      aggregateFlags: advisor.aggregateFlags || [],
      baseline: advisor.baseline,
      reportsAnalyzed: advisor.reports.length,
      artifactPath
    };
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] cost-advise failed (slice=${sliceId ?? "unknown"}): ${message}`);
    return { error: message };
  }
}

export async function tryWriteCostReport(
  repoPath: string,
  sliceOrInfo: string | Record<string, any> | null,
  config: Record<string, any> | null
) {
  const info = typeof sliceOrInfo === "string" ? { sliceId: sliceOrInfo } : sliceOrInfo || {};
  const { sliceId, featureId = null, phase = null } = info as Record<string, any>;

  const mode = await detectCostMode(repoPath, config);
  const runTitle = buildArtifactTitle({ featureId, phase, sliceId });
  const workflowState = await readCrewWorkflowState(repoPath);
  // SLICE-162: resolve this slice's OWN scan window (persisted cursor,
  // falling back to currentRun.startedAt only on the slice's first-ever
  // scan) instead of always relying on crew's shared currentRun fallback
  // — see cost-scan-cursor.mjs for the full root-cause rationale.
  const window = await resolveCostScanWindow(repoPath, sliceId, workflowState);
  const costSliceFlags = buildCostSliceFlags(
    mode,
    config,
    repoPath,
    window,
    featureId,
    phase,
    runTitle
  );
  const report = await runCostSliceCall(repoPath, costSliceFlags, sliceId);

  // Only advance the cursor when the direct call actually succeeded — a
  // failed invocation leaves the window untouched so the next attempt
  // retries the same, still-valid span instead of silently skipping it.
  if (sliceId && !report?.error) {
    await writeCostScanCursor(repoPath, sliceId, window.completedAt);
  }

  // AC-3: stamp the originating crew session/transcript id into the
  // written report's frontmatter — crew's own artifact writer has no
  // field for this today (see the root-cause spike), so this is a
  // best-effort loop-side post-write patch, not a dedup-fingerprint
  // change (resolveCostReportUsd/sliceKeyOf never read this field).
  await stampCostReportSessionId(report, resolveCostReportSessionId(workflowState));

  // FEAT-204: sweep the cost-report directory for shared-session
  // duplicates left by this (or a sibling wave FEAT's) invocation and
  // collapse them to shared_with references. Best-effort -- a sweep
  // failure never blocks the cost-report/advise flow.
  const dedup = await sweepCostReportDedup(repoPath, config);

  const advise = await runCostAdviseCall(repoPath, runTitle, featureId, phase, sliceId);

  // FEAT-234 (cross-repo): emit `cost.advise_recorded` envelope so the
  // runner-side handler can persist into jsonl_cost_advises + render via
  // the v2 read path when the per-app UseJsonlCostAdvises flag flips.
  // Fail-silent contract: webhook-fanout swallows transport errors; the
  // md file on disk remains authoritative.
  if (advise && !advise.error) {
    await postCostAdviseEnvelope(repoPath, { sliceId, featureId, runTitle, advise });
  }

  return { ...report, advise, costMode: mode, dedup };
}

// Collects every report file path a `crew cost-slice` JSON return can carry.
// The CLI's return shape varies: a plain slice report returns `{ path, ... }`
// at the top level; an aggregate-mode call that found multiple sources
// returns `{ slice: {...}, aggregate: {...} }`, each with their own `path`.
// Exported for direct unit coverage (SLICE-162).
export function collectCostReportPaths(report: Record<string, any> | null | undefined): string[] {
  if (!report) return [];
  const paths: string[] = [];
  if (typeof report.path === "string") paths.push(report.path);
  if (typeof report.slice?.path === "string") paths.push(report.slice.path);
  if (typeof report.aggregate?.path === "string") paths.push(report.aggregate.path);
  return paths;
}

// Best-effort post-write patch: adds `session_id` to a just-written cost
// report's frontmatter without disturbing any other field (in particular
// `slice` / `usd`, which resolveCostReportUsd/sliceKeyOf in
// memory-snapshot.mts key their dedup on — AC-4 requires those untouched).
// A stamp failure never blocks the cost-report/advise flow.
export async function stampCostReportSessionId(
  report: Record<string, any> | null | undefined,
  sessionId: string | null
): Promise<void> {
  if (!sessionId) return;
  const paths = collectCostReportPaths(report);
  if (paths.length === 0) return;
  const { mergeFrontmatter } = await import("../frontmatter.mjs");
  for (const reportPath of paths) {
    try {
      const raw = await fs.readFile(reportPath, "utf8");
      await fs.writeFile(reportPath, mergeFrontmatter(raw, { session_id: sessionId }));
    } catch {
      // best-effort — never blocks the cost-report/advise flow
    }
  }
}

// Resolves the cost-report directory used by `crew cost-slice` writes and
// runs the dedup sweep against it. A config override
// (config.loop.costReportsDir) is honored for parity with any future
// crew-side path customization; otherwise the standard
// .claude/artifacts/crew/cost/ location is used.
async function sweepCostReportDedup(
  repoPath: string,
  config: Record<string, any> | null
): Promise<{ groups: number; deduped: string[] } | { error: string }> {
  try {
    const costDir =
      typeof config?.loop?.costReportsDir === "string"
        ? path.join(repoPath, config.loop.costReportsDir)
        : path.join(repoPath, ".claude/artifacts/crew/cost");
    return await dedupeCostReportsInDir(costDir);
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

/**
 * Build a `cost.advise_recorded` envelope from the cost-advise CLI output
 * and ship it via the Pattern-B webhook-fanout (loop.notifications.webhook
 * in .claude/loop.json + ~/.astrarunner/tokens.json bearer lookup).
 *
 * Payload mirrors SPEC-FEAT-234 §4.1. Fields the CLI doesn't supply are
 * omitted — the runner handler validates only `sliceId` as required and
 * tolerates missing optional baselines.
 */
async function postCostAdviseEnvelope(
  repoPath: string,
  opts: {
    sliceId: string;
    featureId: string | null | undefined;
    runTitle: string;
    advise: Record<string, any>;
  }
): Promise<void> {
  const a = opts.advise;
  // The CLI's stdout JSON has historically nested findings under either
  // `recommendations`, `findings`, or `flags`. Accept all three keys with
  // `recommendations` taking precedence so future CLI renames are forward-
  // compatible without a runner-side change.
  const recommendations = pickArray(a.recommendations) ?? pickArray(a.findings) ?? [];
  const aggregateFlags =
    pickArray(a.aggregateFlags) ?? pickArray(a.aggregate_flags) ?? pickArray(a.flags) ?? [];
  const baselineUsdMedian = pickNumber(a.baselineUsdMedian) ?? pickNumber(a.baseline_usd_median);
  const baselineUsdP75 = pickNumber(a.baselineUsdP75) ?? pickNumber(a.baseline_usd_p75);
  const baselineCacheHitMedian =
    pickNumber(a.baselineCacheHitMedian) ?? pickNumber(a.baseline_cache_hit_median);

  const payload: Record<string, unknown> = {
    sliceId: opts.sliceId,
    targetSliceId: opts.sliceId,
    featureId: opts.featureId ?? null,
    runTitle: opts.runTitle,
    recommendations,
    aggregateFlags,
    baselineUsdMedian,
    baselineUsdP75,
    baselineCacheHitMedian,
    ts: new Date().toISOString()
  };

  await fanoutEnvelope(repoPath, "cost.advise_recorded", payload);
}

function pickArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function pickNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Direct-imports `markWorkflowBadge({ badge: "validation_skipped", ... })`
// so the skip is captured in workflow-state with an audit trail.
// Best-effort: a write failure is reported via `{ error }`, identical to
// the other bridge calls. The slice close still proceeds — the bypass
// already passed the gate in completeSlice; this call only records *why*.
export async function markValidationSkippedBadge(repoPath: string, reason: string) {
  const note = reason || "validation_skipped via /loop:slice complete --skip-validation-check";
  try {
    const result = await markWorkflowBadge(repoPath, { badge: "validation_skipped", note });
    if (result.ok === false) throw result.error;
    return { badge: "validation_skipped", currentRun: result.value };
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] mark-badge failed (badge=validation_skipped): ${message}`);
    return { error: message };
  }
}

function renderSynthesisScores(
  grade: Record<string, any> | null,
  sliceId: string,
  SCORE_DIMENSIONS: string[]
) {
  if (!grade) {
    return `_(no grade yet — run \`/loop:slice grade --id ${sliceId}\`)_`;
  }
  return SCORE_DIMENSIONS.map((dim) => `- ${dim}: ${grade.scores?.[dim] ?? "(unset)"}`).join("\n");
}

function renderSynthesisDecisions(grade: Record<string, any> | null) {
  const decisions = grade?.frontmatter?.decisions;
  if (!decisions || decisions.length === 0) return "_(no decisions captured)_";
  return decisions.map((d: string) => `- ${d}`).join("\n");
}

function renderSynthesisBody({
  sliceId,
  sliceRel,
  featureRel,
  specChanges,
  scoresBlock,
  decisionsBlock,
  grade,
  repoPath,
  config,
  featureId,
  phase
}: {
  sliceId: string;
  sliceRel: string;
  featureRel: string | null;
  specChanges: Record<string, any>[] | null | undefined;
  scoresBlock: string;
  decisionsBlock: string;
  grade: Record<string, any> | null;
  repoPath: string;
  config: Record<string, any> | null;
  featureId: string | null | undefined;
  phase: string | null | undefined;
}) {
  const gradeRel = path
    .relative(repoPath, path.join(gradesRoot(repoPath, config), `${sliceId}-grade.md`))
    .replace(/\\/g, "/");
  const id = renderIdentification(phase, featureId, sliceId);
  return [
    `# Final synthesis — ${sliceId}`,
    "",
    ...(id ? [id, ""] : []),
    "## What shipped",
    "",
    `- Slice: \`${sliceRel}\` (completed)`,
    featureRel ? `- Feature: \`${featureRel}\` (done)` : "",
    specChanges && specChanges.length > 0
      ? `- Spec status changes: ${specChanges.map((c) => `${c.id} → ${c.to}`).join(", ")}`
      : "",
    "",
    "## Grade",
    "",
    scoresBlock,
    "",
    "## Decisions captured",
    "",
    decisionsBlock,
    "",
    "## Continuity hooks",
    "",
    "- Next slice selection follows Cross-Slice Continuation HARD RULE",
    "- Researcher planning next slice should read this synthesis + recent grades for lessons-feed-forward",
    "",
    "## References",
    "",
    grade ? `- Grade file: \`${gradeRel}\`` : "- Grade missing — synthesis is incomplete",
    `- Slice handoff: \`.claude/artifacts/crew/handoffs/<timestamp>-${sliceId.toLowerCase()}-complete.md\``,
    ""
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeCrewFinalSynthesis(
  repoPath: string,
  {
    sliceId,
    slicePath,
    featureId,
    phase = null,
    featureResult,
    specChanges,
    config = null
  }: {
    sliceId: string;
    slicePath: string;
    featureId?: string | null;
    phase?: string | null;
    featureResult?: Record<string, any> | null;
    specChanges?: Record<string, any>[] | null;
    config?: Record<string, any> | null;
  }
) {
  const runsDir = path.join(repoPath, ".claude/artifacts/crew/runs");
  await ensureDir(runsDir);
  const slug = buildArtifactSlug({ featureId, phase, sliceId });
  // No timestamp — slice closes once per slice id, so the filename is
  // already unique. Re-running the close overwrites the previous artifact
  // (intentional — the latest state is authoritative).
  const target = path.join(runsDir, `${slug}-final-synthesis.md`);

  const { findGradeForSlice, SCORE_DIMENSIONS } = await import("../grade-parser.mjs");
  const grade = await findGradeForSlice(repoPath, sliceId);
  const fm = {
    kind: "final-synthesis",
    slice: sliceId,
    feature: featureId || null,
    phase: phase || null,
    grade: grade ? `GRADE-${sliceId}` : null,
    decisions: grade?.frontmatter?.decisions || [],
    created_at: new Date().toISOString().slice(0, 10)
  };

  const sliceRel = path.relative(repoPath, slicePath).replace(/\\/g, "/");
  const featureRel = featureResult?.to
    ? path.relative(repoPath, featureResult.to).replace(/\\/g, "/")
    : null;
  const body = renderSynthesisBody({
    sliceId,
    sliceRel,
    featureRel,
    specChanges: specChanges ?? null,
    scoresBlock: renderSynthesisScores(grade, sliceId, SCORE_DIMENSIONS),
    decisionsBlock: renderSynthesisDecisions(grade),
    grade,
    repoPath,
    config: config ?? null,
    featureId,
    phase
  });
  const { serializeFrontmatter } = await import("../frontmatter.mjs");
  await fs.writeFile(target, serializeFrontmatter(fm, body));
  return { synthesisPath: target, hasGrade: Boolean(grade) };
}

export async function tryWriteAgentReport(
  repoPath: string,
  {
    sliceId,
    featureId,
    phase,
    startedAt
  }: {
    sliceId: string;
    featureId?: string | null;
    phase?: string | null;
    startedAt?: string | null;
  }
) {
  const { writeAgentReport } = await import("./agent-report-writer.mjs");
  return writeAgentReport(repoPath, {
    sliceId,
    ...(featureId !== undefined ? { featureId } : {}),
    ...(phase !== undefined ? { phase } : {}),
    ...(startedAt !== undefined ? { startedAt } : {})
  });
}

export async function writeCrewHandoff(
  repoPath: string,
  {
    sliceId,
    slicePath,
    featureId,
    phase = null,
    featureResult,
    specChanges,
    config = null
  }: {
    sliceId: string;
    slicePath: string;
    featureId?: string | null;
    phase?: string | null;
    featureResult?: Record<string, any> | null;
    specChanges?: Record<string, any>[] | null;
    config?: Record<string, any> | null;
  }
) {
  const handoffDir = path.join(repoPath, ".claude/artifacts/crew/handoffs");
  await ensureDir(handoffDir);
  const slug = buildArtifactSlug({ featureId, phase, sliceId });
  // No timestamp — handoff is emitted once per slice close, slug already
  // unique. Re-running the close overwrites; latest is authoritative.
  const filename = `${slug}-complete.md`;
  const target = path.join(handoffDir, filename);
  const sliceRel = path.relative(repoPath, slicePath).replace(/\\/g, "/");
  const featureRel = featureResult?.to
    ? path.relative(repoPath, featureResult.to).replace(/\\/g, "/")
    : null;
  const today = new Date().toISOString().slice(0, 10);
  const fm = {
    kind: "handoff",
    objective: `Slice ${sliceId} complete — grade + start next slice`,
    owner: "parent-loop",
    slice: sliceId,
    feature: featureId || null,
    phase: phase || null,
    created_at: today,
    confidence: "high",
    next_handoff: "grade-and-continue"
  };
  const gradeRel = path
    .relative(repoPath, path.join(gradesRoot(repoPath, config), `${sliceId}-grade.md`))
    .replace(/\\/g, "/");
  const decisionsRel = path.relative(repoPath, decisionsRoot(repoPath, config)).replace(/\\/g, "/");
  const handoffId = renderIdentification(phase, featureId, sliceId);
  const body = [
    `# Handoff — ${sliceId} complete`,
    "",
    ...(handoffId ? [handoffId, ""] : []),
    "## Objective",
    "",
    `Slice ${sliceId} closed with acceptance criteria PASS. Capture lessons + decisions via grading, then resume Cross-Slice Continuation.`,
    "",
    "## Allowed scope",
    "",
    `- Run \`/loop:slice grade --id ${sliceId}\` to draft grade file.`,
    `- Edit \`${gradeRel}\` (scores, lessons, decisions, narrative).`,
    `- Run \`/loop:slice grade-write --id ${sliceId}\` to extract decisions + emit telemetry.`,
    "- Pick next slice via Cross-Slice Continuation HARD RULE.",
    "",
    "## Forbidden scope",
    "",
    "- Starting next slice before grade is written (loses self-improvement signal).",
    "",
    "## Deliverable",
    "",
    `- \`${gradeRel}\` populated + grade-write'd`,
    `- Any extracted \`${decisionsRel}/DEC-NNN.md\` files`,
    "",
    "## Changed files / evidence",
    "",
    `- slice file (completed): \`${sliceRel}\``,
    featureRel ? `- feature file (done): \`${featureRel}\`` : "",
    specChanges && specChanges.length > 0
      ? `- spec status changes: ${specChanges.map((c) => `${c.id} → ${c.to}`).join(", ")}`
      : "",
    "",
    "## Confidence",
    "",
    "High — slice + feature moves atomic; spec reconciliation idempotent.",
    "",
    "## Risks or open questions",
    "",
    "- Grading skipped → no retrospective signal for this slice.",
    "",
    "## Suggested next handoff",
    "",
    "After grade-write, lead picks next slice + opens new builder handoff.",
    ""
  ]
    .filter(Boolean)
    .join("\n");
  const { serializeFrontmatter } = await import("../frontmatter.mjs");
  await fs.writeFile(target, serializeFrontmatter(fm, body));
  return { handoffPath: target };
}

```

### src/tests/cost-project-slugify.test.mts

```
// SLICE-175: fixture coverage for the citylive zero-cost-telemetry root
// cause (docs/research/2026-08-02-citylive-zero-cost-telemetry.md).
//
// `tryWriteCostReport` (crew-bridge.mts) passed `config.loop.costProject`
// straight through to crew's `--source-project` flag with no
// normalization. Crew's session scanner uses that value verbatim as a
// `~/.claude/projects/<value>/` directory name and — because an explicit
// `sourceProject` is truthy — skips its own auto-detect safety net. A
// human-readable project name (e.g. "AstraGenie.CityLive") that was never
// slugified therefore silently scans zero session files, with no error
// surfaced (the citylive report's `usd: 0` / `Auto-detected: no`
// fingerprint).
//
// SLICE-11 (P2 seam-elimination): `tryWriteCostReport` no longer shells out
// to a `crew` CLI subprocess, so these tests were rewritten off the
// `$HERO_CREW_PATH` fake-CLI-plus-argv-inspection seam and now exercise the
// real `costSliceHandler`/`computeSessionCost` direct-import path end to
// end. `computeSessionCost`'s return echoes back the resolved slug as
// `cost.sourceProject` (session-cost.mts's `assembleCostResult`), which is
// what these tests assert on instead of inspecting a fake subprocess's argv.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { tryWriteCostReport } from "../scripts/lib/slice-linker/crew-bridge.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

// Seeds workflow-state.currentRun.startedAt so costSliceHandler has a
// window to scan (it throws without one) — same fixture pattern as
// cost-scan-window-regression.test.mts.
async function seedWorkflowState(repo: string, startedAt: string): Promise<void> {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ currentRun: { startedAt } })
  );
}

const STARTED_AT = "2026-08-01T00:00:00.000Z";

test("AC-2: an unslugified config.loop.costProject (citylive-shaped fixture) reaches computeSessionCost slugified", async () => {
  const repo = await tmpRepo("cps-citylive-repo-");
  await seedWorkflowState(repo, STARTED_AT);

  const config = { loop: { costProject: "AstraGenie.CityLive" } };
  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-1" }, config);
  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

  assert.equal(
    result.cost?.sourceProject,
    "AstraGenie-CityLive",
    "the raw human-readable project name must be slugified before it reaches the session scanner"
  );
});

test("AC-4: an already-slugified config.loop.costProject is unchanged (idempotent, no regression for the standard-path case)", async () => {
  const repo = await tmpRepo("cps-idempotent-repo-");
  await seedWorkflowState(repo, STARTED_AT);

  const alreadySlugged = "C--work-mega-runner-plugin";
  const config = { loop: { costProject: alreadySlugged } };
  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-2" }, config);
  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

  assert.equal(
    result.cost?.sourceProject,
    alreadySlugged,
    "an already-slugified value must pass through unchanged"
  );
});

test("AC-2/AC-4 combined: costProjectAliases present in config does not change the primary project actually scanned", async () => {
  const repo = await tmpRepo("cps-aliases-repo-");
  await seedWorkflowState(repo, STARTED_AT);

  // Under the old CLI/argv seam, aliases were pushed before the primary and
  // the CLI's last-flag-wins parser meant only the primary ever mattered
  // (see appendSourceProjectArgs' own unit tests). The direct-import flags
  // object never builds an argv array at all, so aliases have no
  // representation there either — this test locks that the primary is
  // still the one slugified value that reaches computeSessionCost,
  // regardless of whatever aliases are configured alongside it.
  const config = {
    loop: {
      costProject: "AstraGenie.CityLive",
      costProjectAliases: ["Old.Project.Name", "already-slugified-alias"]
    }
  };
  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-3" }, config);
  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

  assert.equal(
    result.cost?.sourceProject,
    "AstraGenie-CityLive",
    "the primary project must be slugified and used regardless of aliases present in config"
  );
});

```

## Files read

