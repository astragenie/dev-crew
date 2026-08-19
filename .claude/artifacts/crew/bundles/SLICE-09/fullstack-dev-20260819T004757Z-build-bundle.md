---
slice: SLICE-09
builder: fullstack-dev
run_id: 20260819T004757Z
feat: FEAT-002
files_touched: ["crew/biome.json", "crew/package.json", "crew/tests/enum-verdicts.test.mts", "crew/tests/prune-artifacts.test.mts", "crew/tests/validate-all.test.mts", "crew/tests/validate-slices.test.mts", "crew/tsconfig.json", "package.json"]
files_read: []
diff_stat: { files: 10, additions: 57, deletions: 69 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-09: tsconfig + biome config unification

- Created: 2026-08-19T00:47:57.615Z
- From: fullstack-dev
- To: lead
- Objective: Unified crew/ and root configs without pre-empting P3 flattening. 1) Biome nested-root conflict fixed: crew/biome.json now declares root:false (Biome 2.5 monorepo convention, no extends since crew rule sets genuinely diverge from root); bunx biome check . from repo root now runs clean of config errors (pre-existing lint/format findings remain, 88 errors/70 warnings/253 infos, acceptable per gate). 2) crew/tsconfig.json types array corrected from stale bun-types to bun, matching the @types/bun devDependency crew actually installs (bun-types was only resolving via a transitive dependency of @types/bun, a fragile coincidence); widened include to skills/**/*.mts to close a coverage gap for 3 orphaned .mts files, verified zero new errors via a throwaway probe tsconfig before committing the change. cd crew && bunx tsc --noEmit is 0. 3) Dropped the inert --experimental-strip-types flag from 4 test files that spawn via process.execPath (Bun itself under bun test, so the Node-only flag was a no-op): enum-verdicts.test.mts, validate-all.test.mts, validate-slices.test.mts, prune-artifacts.test.mts (3 call sites). hook-cold-start-bench.test.mts left untouched -- it correctly branches on RUNTIME===node before adding the flag. 4) package.json coherence: removed crew/package.json test:node escape hatch (DEC-007 bun-only, git history preserves it); swapped evals:view from node -e to bun -e for run-under-bun coherence (this script has a pre-existing unrelated regex-escaping bug that already fails identically under node before my change -- left unfixed, out of scope as a source-logic defect, not a config/flag issue); added root test:all running bun run test then bun run test:crew, and added --parallel to test:crew so both suites run in parallel mode as the gate expects.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/biome.json
  - crew/tsconfig.json
  - crew/package.json
  - crew/tests/enum-verdicts.test.mts
  - crew/tests/validate-all.test.mts
  - crew/tests/validate-slices.test.mts
  - crew/tests/prune-artifacts.test.mts
  - package.json
- Confidence: high
- Risks: evals:view (crew/package.json) has a pre-existing regex-escaping bug unrelated to this slice -- fails identically under node and bun, not fixed here since it is source-logic not config. test:all is defined as a strict && chain (bun run test && bun run test:crew) so it will not reach the crew suite while the 2 known-pre-existing root failures (DEC-070/DEC-068 contract-record ENOENT in learning-cycle.test.mts and eval-generator.test.mts) remain red -- both suites were verified green independently in this session (root 3310 pass/2 known-fail, crew 1971/0) but test:all itself has not been observed to complete end-to-end without those 2 pre-existing failures resolved first.
- Suggested Next Handoff: P3 flattening will eventually dissolve the crew/ prefix and these two config files should merge into one at that point -- this slice deliberately kept them separate and coherent rather than merging early. Consider whether the root:false crew/biome.json should later gain extends://" once P3 lands and rule sets are reconciled.


## Diff

```diff
diff --git a/.claude/state/crew/slice-progress.md b/.claude/state/crew/slice-progress.md
index 1063381a..92125a68 100644
--- a/.claude/state/crew/slice-progress.md
+++ b/.claude/state/crew/slice-progress.md
@@ -1,6 +1,6 @@
 # Slice Progress
 
-Updated: 2026-08-19T00:39:38.064Z
+Updated: 2026-08-19T00:40:33.084Z
 
 Active plan: _(none detected)_
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index e28d060c..d6034c50 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T00:34:32.222Z",
+  "updatedAt": "2026-08-19T00:47:57.618Z",
   "currentRun": {
-    "title": "FEAT002 SLICE08: Wiggin -> dev-crew branding scrub (27 files)",
+    "title": "FEAT002 SLICE09: Single tsconfig/tsconfig.test + biome config merge",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
-    "startedAt": "2026-08-19T00:24:10.407Z",
-    "updatedAt": "2026-08-19T00:34:32.222Z",
-    "next": "SLICE-09 (tsconfig/biome config merge) and SLICE-10 (N=20 green parallel verification + typecheck gate) are next in the pending queue. A later slice should flatten/normalize the crew/ subtree import and its own wiggin references once dev-crew's own DEC numbering stabilizes (also flagged in the SLICE-04 handoff for the 2 self-referential decision-log test failures).",
+    "startedAt": "2026-08-19T00:40:33.000Z",
+    "updatedAt": "2026-08-19T00:47:57.617Z",
+    "next": "P3 flattening will eventually dissolve the crew/ prefix and these two config files should merge into one at that point -- this slice deliberately kept them separate and coherent rather than merging early. Consider whether the root:false crew/biome.json should later gain extends://\" once P3 lands and rule sets are reconciled.",
     "gates": {
       "review": null,
       "validation": null,
@@ -22,10 +22,9 @@
       "help": null
     },
     "artifacts": {
-      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T002410Z-run-brief-feat002-slice08-wiggin-dev-crew-branding-scrub-27-files.md",
+      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T004032Z-run-brief-feat002-slice09-single-tsconfig-tsconfig-test-biome-config-m.md",
       "handoffs": [
-        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003416Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md",
-        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003432Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md"
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T004757Z-handoff-slice-09-tsconfig-biome-config-unification.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
@@ -39,14 +38,14 @@
   },
   "recentRuns": [
     {
-      "title": "FEAT002 SLICE06: .ts->.mts rename sweep batch 2 + import-specifier fixes",
+      "title": "FEAT002 SLICE08: Wiggin -> dev-crew branding scrub (27 files)",
       "goal": "",
       "mode": "autonomous",
       "status": "active",
-      "startedAt": "2026-08-18T22:51:44.721Z",
-      "updatedAt": "2026-08-19T00:12:15.091Z",
-      "completedAt": "2026-08-19T00:12:15.091Z",
-      "next": "If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).",
+      "startedAt": "2026-08-19T00:24:10.407Z",
+      "updatedAt": "2026-08-19T00:34:32.222Z",
+      "completedAt": "2026-08-19T00:34:32.222Z",
+      "next": "SLICE-09 (tsconfig/biome config merge) and SLICE-10 (N=20 green parallel verification + typecheck gate) are next in the pending queue. A later slice should flatten/normalize the crew/ subtree import and its own wiggin references once dev-crew's own DEC numbering stabilizes (also flagged in the SLICE-04 handoff for the 2 self-referential decision-log test failures).",
       "gates": {
         "review": null,
         "validation": null,
@@ -60,9 +59,10 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T225144Z-run-brief-feat002-slice06-ts-mts-rename-sweep-batch-2-import-specifier.md",
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260819T002410Z-run-brief-feat002-slice08-wiggin-dev-crew-branding-scrub-27-files.md",
         "handoffs": [
-          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T001215Z-handoff-slice-07-round-3-flip-remaining-node-spawns-to-bun-15-files.md"
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003416Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md",
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T003432Z-handoff-slice-08-wiggin-dev-crew-branding-scrub.md"
         ],
         "reviewResult": null,
         "validationPlan": null,
@@ -75,14 +75,14 @@
       }
     },
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
@@ -96,8 +96,10 @@
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
@@ -109,13 +111,13 @@
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
@@ -130,7 +132,7 @@
         "help": null
       },
       "artifacts": {
-        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222442Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T222518Z-run-brief-feat002-slice05-ts-mts-rename-sweep-batch-1-dev-team-src.md",
         "handoffs": [],
         "reviewResult": null,
         "validationPlan": null,
@@ -147,10 +149,10 @@
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
@@ -164,10 +166,8 @@
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
@@ -183,10 +183,10 @@
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
@@ -200,8 +200,10 @@
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
diff --git a/crew/biome.json b/crew/biome.json
index 1bbed558..3ea1643c 100644
--- a/crew/biome.json
+++ b/crew/biome.json
@@ -1,5 +1,6 @@
 {
   "$schema": "https://biomejs.dev/schemas/2.5.0/schema.json",
+  "root": false,
   "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
   "files": {
     "ignoreUnknown": false,
diff --git a/crew/package.json b/crew/package.json
index a998b11e..57313806 100644
--- a/crew/package.json
+++ b/crew/package.json
@@ -17,7 +17,6 @@
     "test": "bun test --timeout 60000 tests/",
     "test:shard": "bun scripts/test-shard.mts",
     "test:agents": "CREW_AGENT_EVAL=1 bun test tests/agent-eval/",
-    "test:node": "node --test --experimental-strip-types",
     "validate:manifests": "bun ./scripts/validate-manifests.mts",
     "lint": "biome lint scripts/ hooks/",
     "typecheck": "tsc --noEmit",
@@ -40,7 +39,7 @@
     "e2e:smoke:ux": "bun ./scripts/e2e-smoke-ux.mts",
     "evals": "bun evals/cli.mts",
     "evals:memory-delta": "bun evals/memory-delta.mts",
-    "evals:view": "node -e \"console.log('Open in your browser: file://' + require('path').resolve('evals/viewer/index.html').replace(/\\\\/g,'/'))\""
+    "evals:view": "bun -e \"console.log('Open in your browser: file://' + require('path').resolve('evals/viewer/index.html').replace(/\\\\/g,'/'))\""
   },
   "dependencies": {
     "@astragenie/astramem-client": "^0.3.0",
diff --git a/crew/tests/enum-verdicts.test.mts b/crew/tests/enum-verdicts.test.mts
index 681d5ed9..049a0493 100644
--- a/crew/tests/enum-verdicts.test.mts
+++ b/crew/tests/enum-verdicts.test.mts
@@ -24,7 +24,7 @@ import { makeTempDir, loadState, cliPath } from "./helpers/cli-fixtures.mjs";
 // in-process runCrew() would kill the test runner itself (same reason
 // tests/crew-write-review-result.test.ts uses spawnSync for its exit-2 cases).
 function runCli(args: string[]) {
-  const result = spawnSync(process.execPath, ["--experimental-strip-types", cliPath, ...args], {
+  const result = spawnSync(process.execPath, [cliPath, ...args], {
     encoding: "utf8",
     timeout: 30_000
   });
diff --git a/crew/tests/prune-artifacts.test.mts b/crew/tests/prune-artifacts.test.mts
index 19a7ff44..25d1981c 100644
--- a/crew/tests/prune-artifacts.test.mts
+++ b/crew/tests/prune-artifacts.test.mts
@@ -98,15 +98,7 @@ test("--dry-run: prints would-delete list and does NOT delete the file", async (
 
   const { stdout } = await execFile(
     process.execPath,
-    [
-      "--experimental-strip-types",
-      pruneScript,
-      "--dry-run",
-      "--older-than",
-      "1",
-      "--repo",
-      repoDir
-    ],
+    [pruneScript, "--dry-run", "--older-than", "1", "--repo", repoDir],
     { encoding: "utf8" }
   );
 
@@ -126,15 +118,7 @@ test("--dry-run: exits 0 even when files are found", async () => {
 
   const result = await execFile(
     process.execPath,
-    [
-      "--experimental-strip-types",
-      pruneScript,
-      "--dry-run",
-      "--older-than",
-      "1",
-      "--repo",
-      repoDir
-    ],
+    [pruneScript, "--dry-run", "--older-than", "1", "--repo", repoDir],
     { encoding: "utf8" }
   );
 
@@ -147,7 +131,7 @@ test("without --dry-run: actually deletes old files", async () => {
 
   const { stdout } = await execFile(
     process.execPath,
-    ["--experimental-strip-types", pruneScript, "--older-than", "1", "--repo", repoDir],
+    [pruneScript, "--older-than", "1", "--repo", repoDir],
     { encoding: "utf8" }
   );
 
diff --git a/crew/tests/validate-all.test.mts b/crew/tests/validate-all.test.mts
index 82f7493a..87fc5492 100644
--- a/crew/tests/validate-all.test.mts
+++ b/crew/tests/validate-all.test.mts
@@ -7,7 +7,7 @@ const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
 const scriptPath = path.join(repoRoot, "scripts", "validate-all.mts");
 
 function runValidateAll(cwd = repoRoot) {
-  const result = spawnSync(process.execPath, ["--experimental-strip-types", scriptPath], {
+  const result = spawnSync(process.execPath, [scriptPath], {
     encoding: "utf8",
     timeout: 60_000,
     cwd
diff --git a/crew/tests/validate-slices.test.mts b/crew/tests/validate-slices.test.mts
index 1e913caf..d5c150d0 100644
--- a/crew/tests/validate-slices.test.mts
+++ b/crew/tests/validate-slices.test.mts
@@ -15,7 +15,7 @@ async function makeFixture(prefix: string) {
 }
 
 function runValidator(repoPath: string) {
-  const result = spawnSync(process.execPath, ["--experimental-strip-types", scriptPath], {
+  const result = spawnSync(process.execPath, [scriptPath], {
     encoding: "utf8",
     timeout: 30_000,
     cwd: repoPath,
diff --git a/crew/tsconfig.json b/crew/tsconfig.json
index cf04fd95..af7d8df6 100644
--- a/crew/tsconfig.json
+++ b/crew/tsconfig.json
@@ -22,7 +22,7 @@
     "allowImportingTsExtensions": true,
     "types": [
       "node",
-      "bun-types"
+      "bun"
     ]
   },
   "include": [
@@ -33,7 +33,8 @@
     "hooks/**/*.ts",
     "hooks/**/*.mts",
     "evals/**/*.ts",
-    "evals/**/*.mts"
+    "evals/**/*.mts",
+    "skills/**/*.mts"
   ],
   "exclude": [
     "node_modules",
diff --git a/package.json b/package.json
index 04516eb9..fd8b5d67 100644
--- a/package.json
+++ b/package.json
@@ -9,7 +9,8 @@
   "scripts": {
     "typecheck": "tsc --project tsconfig.json --noEmit && tsc --project tsconfig.test.json --noEmit",
     "test": "bun test src/tests/ --parallel --timeout 60000",
-    "test:crew": "cd crew && bun test --timeout 60000 tests/",
+    "test:crew": "cd crew && bun test --timeout 60000 tests/ --parallel",
+    "test:all": "bun run test && bun run test:crew",
     "bench": "bun src/tests/perf/bench-runner.mts",
     "validate:event-schemas": "bun ./src/scripts/validate-event-schemas.mts",
     "validate:manifests": "bun ./src/scripts/validate-manifests.mts",

```

## Files touched

### crew/biome.json

```
{
  "$schema": "https://biomejs.dev/schemas/2.5.0/schema.json",
  "root": false,
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "scripts/**",
      "tests/**",
      "hooks/**",
      "evals/**",
      "!node_modules/**",
      "!.claude/worktrees/**"
    ]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100,
    "attributePosition": "auto",
    "bracketSameLine": false,
    "bracketSpacing": true,
    "expand": "auto",
    "useEditorconfig": true,
    "includes": ["**", "!tests/fixtures/openapi/*-contracts.ts"]
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "none",
      "complexity": {
        "noAdjacentSpacesInRegex": "error",
        "noExtraBooleanCast": "error",
        "noUselessCatch": "error",
        "noUselessEscapeInRegex": "error",
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 15 }
        }
      },
      "correctness": {
        "noConstAssign": "error",
        "noConstantCondition": "error",
        "noEmptyCharacterClassInRegex": "error",
        "noEmptyPattern": "error",
        "noGlobalObjectCalls": "error",
        "noInvalidBuiltinInstantiation": "error",
        "noInvalidConstructorSuper": "error",
        "noNonoctalDecimalEscape": "error",
        "noPrecisionLoss": "error",
        "noSelfAssign": "error",
        "noSetterReturn": "error",
        "noSwitchDeclarations": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnreachableSuper": "error",
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error",
        "noUnusedLabels": "error",
        "noUnusedPrivateClassMembers": "error",
        "noUnusedVariables": "warn",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useValidTypeof": "error",
        "useYield": "error"
      },
      "style": { "useConst": "error" },
      "suspicious": {
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCompareNegZero": "error",
        "noConsole": "off",
        "noConstantBinaryExpressions": "error",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDoubleEquals": {
          "level": "error",
          "options": { "ignoreNull": true }
        },
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateElseIf": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "error",
        "noFallthroughSwitchClause": "error",
        "noFunctionAssign": "error",
        "noGlobalAssign": "error",
        "noImportAssign": "error",
        "noIrregularWhitespace": "error",
        "noMisleadingCharacterClass": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noShadowRestrictedNames": "error",
        "noSparseArray": "error",
        "noUnsafeNegation": "error",
        "noUselessRegexBackrefs": "error",
        "noVar": "error",
        "noWith": "error",
        "useGetterReturn": "error"
      }
    },
    "includes": ["**", "!tests/fixtures/**", "!**/*.openapi.yaml"]
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "none",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSameLine": false,
      "quoteStyle": "double",
      "attributePosition": "auto",
      "bracketSpacing": true
    },
    "globals": ["exports"]
  },
  "html": { "formatter": { "indentScriptAndStyle": false, "selfCloseVoidElements": "always" } },
  "overrides": [
    {
      "includes": ["tests/**/*.{mjs,ts}"],
      "linter": {
        "rules": {
          "complexity": {
            "noExcessiveCognitiveComplexity": "off"
          }
        }
      }
    },
    {
      "includes": ["evals/lib/**", "evals/providers/**"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "patterns": [
                  {
                    "group": ["**/agents/**", "**/scripts/**", "**/src/**", "**/hooks/**", "**/commands/**"],
                    "message": "evals/lib and evals/providers must not import from agents/, scripts/, src/, hooks/, or commands/ — module boundary violation (FEAT-169)"
                  }
                ]
              }
            }
          }
        }
      }
    }
  ],
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "off" } } }
}

```

### crew/package.json

```
{
  "name": "crew-plugin",
  "version": "0.66.0",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@biomejs/biome": "^2.5.0",
    "@redocly/cli": "^1.34.15",
    "@types/bun": "^1.3.14",
    "@types/node": "^25.9.1",
    "openapi-typescript": "^7.13.0",
    "typescript": "^6.0.3",
    "yaml": "^2.9.0",
    "zod": "^3.25.76"
  },
  "scripts": {
    "test": "bun test --timeout 60000 tests/",
    "test:shard": "bun scripts/test-shard.mts",
    "test:agents": "CREW_AGENT_EVAL=1 bun test tests/agent-eval/",
    "validate:manifests": "bun ./scripts/validate-manifests.mts",
    "lint": "biome lint scripts/ hooks/",
    "typecheck": "tsc --noEmit",
    "validate:skills": "bun ./scripts/validate-skills.mts",
    "validate:agents": "bun ./scripts/validate-agents.mts",
    "validate:contracts": "bun ./scripts/validate-contracts.mts",
    "validate:routing-table": "bun ./scripts/validate-routing-table.mts",
    "validate:slices": "bun ./scripts/validate-slices.mts",
    "verify:all": "bun scripts/validate-all.mts",
    "validate:all": "bun scripts/validate-all.mts",
    "validate:bundles": "bun ./scripts/validate-bundles.mts",
    "validate:ux-spec": "bun ./scripts/validate-ux-spec.mts",
    "format": "biome format --write scripts/ tests/",
    "format:check": "biome format scripts/ tests/",
    "installer:install-global": "bun ./scripts/crew.mts install-global",
    "installer:bootstrap": "bun ./scripts/crew.mts bootstrap",
    "installer:init": "bun ./scripts/crew.mts init",
    "installer:audit": "bun ./scripts/crew.mts audit",
    "e2e:smoke": "bun ./scripts/e2e-smoke.mts",
    "e2e:smoke:ux": "bun ./scripts/e2e-smoke-ux.mts",
    "evals": "bun evals/cli.mts",
    "evals:memory-delta": "bun evals/memory-delta.mts",
    "evals:view": "bun -e \"console.log('Open in your browser: file://' + require('path').resolve('evals/viewer/index.html').replace(/\\\\/g,'/'))\""
  },
  "dependencies": {
    "@astragenie/astramem-client": "^0.3.0",
    "@astragenie/astramem-plugin": "git+https://github.com/astragenie/astramem-plugin.git#e851f19c7a8d89bd88c62d392918aa78aebf2184",
    "@astragenie/gepa-core": "0.10.1",
    "@astragenie/memory-provider": "^0.2.1",
    "@astragenie/plugin-std": "^0.5.0",
    "@aws-sdk/client-bedrock-runtime": "^3",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.53.0",
    "@opentelemetry/sdk-node": "^0.53.0"
  }
}

```

### crew/tests/enum-verdicts.test.mts

```
// P1.3 — enum verdict frontmatter + fail-open badge fix.
// Covers: writer rejects invalid enum, needs_fix normalizes to rejected,
// skipped without skip_reason throws, handler throws on unknown verdict
// (not just the CLI refusal), approved_with_notes -> review_passed, legacy
// artifacts (no verdict) keep the old default-pass behavior, and the
// artifact-schemas.ts schemas round-trip real writer output.
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test, expect } from "bun:test";
import { runCrew } from "../scripts/crew.mjs";
import { registerWorkflowArtifact } from "../scripts/lib/workflow-state.mjs";
import type { ArtifactRef } from "../scripts/lib/workflow-state.mjs";
import {
  normalizeReviewDecision,
  normalizeValidationDecision,
  ReviewArtifactSchema,
  ValidationArtifactSchema
} from "../scripts/lib/artifact-schemas.mjs";
import { parseFrontmatterBlock } from "../scripts/lib/briefing/collect-cost-parser.mjs";
import { makeTempDir, loadState, cliPath } from "./helpers/cli-fixtures.mjs";

// process.exit(2) refusal paths must run out-of-process — calling them via the
// in-process runCrew() would kill the test runner itself (same reason
// tests/crew-write-review-result.test.ts uses spawnSync for its exit-2 cases).
function runCli(args: string[]) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    timeout: 30_000
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

async function cleanup(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// normalize* helpers
// ---------------------------------------------------------------------------

test("normalizeReviewDecision: needs_fix normalizes to rejected (aliasOf recorded)", () => {
  const result = normalizeReviewDecision("needs_fix");
  expect(result).toEqual({ canonical: "rejected", aliasOf: "needs_fix" });
});

// FIX-0: architect-reviewer.md emits approved_with_conditions / needs_revision,
// neither of which was in REVIEW_DECISION_ALIASES — every non-approved
// architect-reviewer verdict hit the unrecognized-value branch and exit(2)'d
// before anything was written. Widen the alias map, not the canonical enum.
test("normalizeReviewDecision: approved_with_conditions normalizes to approved_with_notes (aliasOf recorded)", () => {
  const result = normalizeReviewDecision("approved_with_conditions");
  expect(result).toEqual({
    canonical: "approved_with_notes",
    aliasOf: "approved_with_conditions"
  });
});

test("normalizeReviewDecision: needs_revision normalizes to rejected (aliasOf recorded)", () => {
  const result = normalizeReviewDecision("needs_revision");
  expect(result).toEqual({ canonical: "rejected", aliasOf: "needs_revision" });
});

test("normalizeReviewDecision: canonical values pass through with no aliasOf", () => {
  for (const value of ["approved", "approved_with_notes", "rejected"] as const) {
    const result = normalizeReviewDecision(value);
    expect(result).toEqual({ canonical: value });
  }
});

test("normalizeReviewDecision: unrecognized value returns null (fail closed, not open)", () => {
  expect(normalizeReviewDecision("lgtm")).toBe(null);
  expect(normalizeReviewDecision(undefined)).toBe(null);
  expect(normalizeReviewDecision("")).toBe(null);
});

test("normalizeValidationDecision: legacy passed/passed_with_notes/failed normalize to canonical", () => {
  expect(normalizeValidationDecision("passed")).toEqual({ canonical: "pass", aliasOf: "passed" });
  expect(normalizeValidationDecision("passed_with_notes")).toEqual({
    canonical: "pass",
    aliasOf: "passed_with_notes"
  });
  expect(normalizeValidationDecision("failed")).toEqual({ canonical: "fail", aliasOf: "failed" });
});

test("normalizeValidationDecision: unrecognized value returns null", () => {
  expect(normalizeValidationDecision("banana")).toBe(null);
});

// ---------------------------------------------------------------------------
// write-review-result CLI
// ---------------------------------------------------------------------------

test("write-review-result: needs_fix input is accepted, normalized to rejected in frontmatter, and fails the review gate", async () => {
  const repoPath = await makeTempDir("enum-verdicts-needs-fix-");
  try {
    const { status, stdout } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Needs fix review",
      "--decision",
      "needs_fix",
      "--summary",
      "missing null guard"
    ]);
    expect(status, "needs_fix must be accepted, not refused").toBe(0);
    const result = JSON.parse(stdout);
    const body = await fs.readFile(result.path, "utf8");
    // Canonical value lands in frontmatter; the alias is documented in code,
    // not necessarily preserved in the artifact (needs_fix has no pre-P1.3
    // callers, so there's no back-compat body-prose burden here).
    expect(body, "frontmatter must carry the canonical value").toMatch(/^decision: rejected$/m);

    const state = await loadState(repoPath);
    expect(
      state.currentRun.gates.review.status,
      "needs_fix must fail the review gate exactly like rejected"
    ).toBe("failed");
  } finally {
    await cleanup(repoPath);
  }
});

test("write-review-result: approved_with_notes (with test-summary) writes canonical frontmatter and passes the review gate", async () => {
  const repoPath = await makeTempDir("enum-verdicts-awn-");
  try {
    const { status, stdout } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Minor nits",
      "--decision",
      "approved_with_notes",
      "--summary",
      "minor nits only",
      "--test-summary",
      "covered"
    ]);
    expect(status).toBe(0);
    const result = JSON.parse(stdout);
    const body = await fs.readFile(result.path, "utf8");
    expect(body).toMatch(/^decision: approved_with_notes$/m);

    const state = await loadState(repoPath);
    expect(state.currentRun.gates.review.status).toBe("passed");
  } finally {
    await cleanup(repoPath);
  }
});

test("write-review-result: approved_with_conditions (architect-reviewer.md verdict) is accepted and normalized to approved_with_notes in frontmatter", async () => {
  const repoPath = await makeTempDir("enum-verdicts-awc-");
  try {
    const { status, stdout } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Architecture review with conditions",
      "--decision",
      "approved_with_conditions",
      "--summary",
      "acceptable pending follow-up",
      "--test-summary",
      "covered"
    ]);
    expect(status, "approved_with_conditions must be accepted, not refused").toBe(0);
    const result = JSON.parse(stdout);
    const body = await fs.readFile(result.path, "utf8");
    expect(body, "frontmatter must carry the canonical value").toMatch(
      /^decision: approved_with_notes$/m
    );

    const state = await loadState(repoPath);
    expect(state.currentRun.gates.review.status).toBe("passed");
  } finally {
    await cleanup(repoPath);
  }
});

test("write-review-result: needs_revision (architect-reviewer.md verdict) is accepted, normalized to rejected in frontmatter, and fails the review gate", async () => {
  const repoPath = await makeTempDir("enum-verdicts-needs-revision-");
  try {
    const { status, stdout } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Architecture review needs revision",
      "--decision",
      "needs_revision",
      "--summary",
      "service boundary unclear"
    ]);
    expect(status, "needs_revision must be accepted, not refused").toBe(0);
    const result = JSON.parse(stdout);
    const body = await fs.readFile(result.path, "utf8");
    expect(body, "frontmatter must carry the canonical value").toMatch(/^decision: rejected$/m);

    const state = await loadState(repoPath);
    expect(
      state.currentRun.gates.review.status,
      "needs_revision must fail the review gate exactly like rejected"
    ).toBe("failed");
  } finally {
    await cleanup(repoPath);
  }
});

test("write-review-result: unrecognized decision (not an alias) still exits 2", async () => {
  const repoPath = await makeTempDir("enum-verdicts-bogus-review-");
  try {
    const { status, stderr } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Bogus",
      "--decision",
      "lgtm",
      "--summary",
      "x"
    ]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/unknown decision/i);
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// write-validation-result CLI
// ---------------------------------------------------------------------------

test("write-validation-result: legacy 'passed_with_notes' normalizes to canonical 'pass' in frontmatter but keeps raw body prose", async () => {
  const repoPath = await makeTempDir("enum-verdicts-legacy-validation-");
  try {
    const { status, stdout } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Legacy decision",
      "--decision",
      "passed_with_notes",
      "--summary",
      "all good"
    ]);
    expect(status).toBe(0);
    const result = JSON.parse(stdout);
    const body = await fs.readFile(result.path, "utf8");
    expect(body, "frontmatter carries the canonical value, not the legacy alias").toMatch(
      /^decision: pass$/m
    );
    expect(body, "body prose keeps the raw legacy value for back-compat").toMatch(
      /Decision: passed_with_notes/
    );

    const state = await loadState(repoPath);
    expect(state.currentRun.gates.validation.status).toBe("passed");
  } finally {
    await cleanup(repoPath);
  }
});

test("write-validation-result: skipped without --skip-reason is refused (exit 2)", async () => {
  const repoPath = await makeTempDir("enum-verdicts-skip-no-reason-");
  try {
    const { status, stderr } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Skip without reason",
      "--decision",
      "skipped",
      "--summary",
      "env unavailable"
    ]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/skip_reason/);
  } finally {
    await cleanup(repoPath);
  }
});

test("write-validation-result: skipped with --skip-reason succeeds, sets validation_skipped, and records the reason", async () => {
  const repoPath = await makeTempDir("enum-verdicts-skipped-");
  try {
    const { status, stdout } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Skip with reason",
      "--decision",
      "skipped",
      "--skip-reason",
      "staging environment unavailable"
    ]);
    expect(status).toBe(0);
    const result = JSON.parse(stdout);
    const body = await fs.readFile(result.path, "utf8");
    expect(body).toMatch(/^decision: skipped$/m);
    expect(body).toMatch(/^skip_reason: "staging environment unavailable"$/m);

    const state = await loadState(repoPath);
    expect(state.currentRun.gates.validation.status).toBe("skipped");
    expect(state.currentRun.gates.validation.note).toMatch(/staging environment unavailable/);
  } finally {
    await cleanup(repoPath);
  }
});

test("write-validation-result: unrecognized decision exits 2", async () => {
  const repoPath = await makeTempDir("enum-verdicts-bogus-validation-");
  try {
    const { status, stderr } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Bogus",
      "--decision",
      "banana"
    ]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/unknown decision/i);
  } finally {
    await cleanup(repoPath);
  }
});

// FEAT-188 S1a AC-2: a "fail" validation-result write auto-captures a
// failure-kind entry into the legacy learnings store.
test("write-validation-result: fail decision captures a failure entry in learnings.jsonl", async () => {
  const repoPath = await makeTempDir("enum-verdicts-fail-capture-");
  try {
    const { status } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Failed validation",
      "--validator",
      "verifier",
      "--decision",
      "fail",
      "--summary",
      "build broke on clean checkout"
    ]);
    expect(status).toBe(0);
    const raw = await fs.readFile(
      path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl"),
      "utf8"
    );
    const lines = raw
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
    expect(lines.length).toBe(1);
    expect(lines[0].kind).toBe("failure");
    expect(lines[0].agent).toBe("verifier");
    expect(lines[0].source).toBe("validation_fail");
    expect(lines[0].summary).toMatch(/build broke on clean checkout/);
  } finally {
    await cleanup(repoPath);
  }
});

// "pass" must NOT trigger failure capture.
test("write-validation-result: pass decision does not write learnings.jsonl", async () => {
  const repoPath = await makeTempDir("enum-verdicts-pass-no-capture-");
  try {
    const { status } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Passed validation",
      "--decision",
      "pass",
      "--summary",
      "all good"
    ]);
    expect(status).toBe(0);
    await expect(
      fs.readFile(path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl"), "utf8")
    ).rejects.toThrow();
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// workflow-state handler: throws on unknown verdict, not just CLI-level
// ---------------------------------------------------------------------------

test("registerWorkflowArtifact: unrecognized review verdict throws instead of failing open to review_passed", async () => {
  const repoPath = await makeTempDir("enum-verdicts-handler-review-");
  try {
    const artifact: ArtifactRef = { kind: "review-result", path: "fake-path.md", title: "t" };
    await expect(
      registerWorkflowArtifact(repoPath, artifact, { verdict: "lgtm", summary: "bad" })
    ).rejects.toThrow(/unrecognized review verdict/);
  } finally {
    await cleanup(repoPath);
  }
});

test("registerWorkflowArtifact: unrecognized validation verdict throws instead of failing open to validation_passed", async () => {
  const repoPath = await makeTempDir("enum-verdicts-handler-validation-");
  try {
    const artifact: ArtifactRef = { kind: "validation-result", path: "fake-path.md", title: "t" };
    await expect(
      registerWorkflowArtifact(repoPath, artifact, { verdict: "kinda", summary: "bad" })
    ).rejects.toThrow(/unrecognized validation verdict/);
  } finally {
    await cleanup(repoPath);
  }
});

test("registerWorkflowArtifact: absent verdict (legacy artifact / caller never set --decision) preserves the old default-pass behavior", async () => {
  const repoPath = await makeTempDir("enum-verdicts-legacy-absent-");
  try {
    const artifact: ArtifactRef = { kind: "review-result", path: "fake-path.md", title: "t" };
    // No `verdict` field at all — must NOT throw, must default to review_passed
    // exactly like it did before P1.3 (this is the documented back-compat path).
    const run = await registerWorkflowArtifact(repoPath, artifact, {
      summary: "no decision given"
    });
    expect(run?.gates.review?.status).toBe("passed");
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// Zod schemas round-trip real writer output
// ---------------------------------------------------------------------------

test("ReviewArtifactSchema / ValidationArtifactSchema round-trip write-review-result / write-validation-result output", async () => {
  const repoPath = await makeTempDir("enum-verdicts-schema-roundtrip-");
  try {
    const reviewResult = await runCrew([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Schema round-trip review",
      "--decision",
      "approved",
      "--summary",
      "looks good",
      "--test-summary",
      "all pass",
      "--feature",
      "FEAT-999",
      "--slice",
      "SLICE-1"
    ]);
    expect(reviewResult.code).toBe(0);
    const reviewPath = JSON.parse(reviewResult.output).path;
    const reviewBody = await fs.readFile(reviewPath, "utf8");
    const reviewFm = parseFrontmatterBlock(reviewBody);
    expect(ReviewArtifactSchema.safeParse(reviewFm).success).toBe(true);

    const validationResult = await runCrew([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Schema round-trip validation",
      "--decision",
      "skipped",
      "--skip-reason",
      "no staging slot",
      "--feature",
      "FEAT-999"
    ]);
    expect(validationResult.code).toBe(0);
    const validationPath = JSON.parse(validationResult.output).path;
    const validationBody = await fs.readFile(validationPath, "utf8");
    const validationFm = parseFrontmatterBlock(validationBody);
    // parseFrontmatterBlock doesn't JSON-unescape quoted values; skip_reason
    // is JSON.stringify'd in the artifact so it round-trips as a quoted,
    // still-non-empty string — sufficient for the schema's truthiness check.
    expect(ValidationArtifactSchema.safeParse(validationFm).success).toBe(true);

    // And the schema still catches the invalid case: skipped with no skip_reason.
    const invalid = ValidationArtifactSchema.safeParse({ decision: "skipped" });
    expect(invalid.success).toBe(false);
  } finally {
    await cleanup(repoPath);
  }
});

```

### crew/tests/prune-artifacts.test.mts

```
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, expect } from "bun:test";

import { isOlderThan, validateDays } from "../scripts/prune-artifacts.mjs";

const execFile = promisify(execFileCallback);
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pruneScript = path.join(repoRoot, "scripts", "prune-artifacts.mts");

const DAY_MS = 86_400_000;
const NOW = 1_000_000 * DAY_MS; // arbitrary fixed "now"

// isOlderThan(mtimeMs, nowMs, days) — true when file is beyond threshold

test("isOlderThan: returns true when file is exactly one day older than threshold", () => {
  const mtime = NOW - 91 * DAY_MS; // 91 days old, threshold 90
  expect(isOlderThan(mtime, NOW, 90)).toBe(true);
});

test("isOlderThan: returns false when file is newer than threshold", () => {
  const mtime = NOW - 30 * DAY_MS; // 30 days old, threshold 90
  expect(isOlderThan(mtime, NOW, 90)).toBe(false);
});

test("isOlderThan: returns false when file mtime equals the threshold boundary", () => {
  const mtime = NOW - 90 * DAY_MS; // exactly at the boundary — not older
  expect(isOlderThan(mtime, NOW, 90)).toBe(false);
});

test("isOlderThan: returns true for very old files (mtime = 0)", () => {
  expect(isOlderThan(0, NOW, 90)).toBe(true);
});

test("isOlderThan: returns false when mtime equals nowMs (file from now)", () => {
  expect(isOlderThan(NOW, NOW, 1)).toBe(false);
});

test("isOlderThan: works with threshold of 1 day", () => {
  const mtime = NOW - 2 * DAY_MS; // 2 days old, threshold 1
  expect(isOlderThan(mtime, NOW, 1)).toBe(true);
});

test("isOlderThan: works with large threshold (365 days)", () => {
  const mtime = NOW - 364 * DAY_MS; // 364 days old, threshold 365
  expect(isOlderThan(mtime, NOW, 365)).toBe(false);
});

test("isOlderThan: works with large threshold when file is past it", () => {
  const mtime = NOW - 366 * DAY_MS; // 366 days old, threshold 365
  expect(isOlderThan(mtime, NOW, 365)).toBe(true);
});

// validateDays — float and invalid input rejection
test("validateDays: accepts positive integer", () => {
  expect(validateDays(90)).toBe(null);
});

test("validateDays: rejects float (1.5)", () => {
  expect(validateDays(1.5)).not.toBe(null);
});

test("validateDays: rejects zero", () => {
  expect(validateDays(0)).not.toBe(null);
});

test("validateDays: rejects negative", () => {
  expect(validateDays(-5)).not.toBe(null);
});

test("validateDays: rejects NaN", () => {
  expect(validateDays(NaN)).not.toBe(null);
});

// ---------------------------------------------------------------------------
// --dry-run integration tests (spawns the actual CLI)
// ---------------------------------------------------------------------------

// Helper: create a temp artifacts/crew/<subdir> tree with one old file.
async function setupArtifactsDir(prefix: string): Promise<{ repoDir: string; oldFile: string }> {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const crewDir = path.join(repoDir, ".claude", "artifacts", "crew", "handoffs");
  await fs.mkdir(crewDir, { recursive: true });
  const oldFile = path.join(crewDir, "old-handoff.md");
  await fs.writeFile(oldFile, "# old handoff\n");
  // Back-date the file by 200 days (well past the 1-day threshold used in tests).
  const oldMtime = new Date(Date.now() - 200 * 86_400_000);
  await fs.utimes(oldFile, oldMtime, oldMtime);
  return { repoDir, oldFile };
}

test("--dry-run: prints would-delete list and does NOT delete the file", async () => {
  const { repoDir, oldFile } = await setupArtifactsDir("prune-dryrun-");

  const { stdout } = await execFile(
    process.execPath,
    [pruneScript, "--dry-run", "--older-than", "1", "--repo", repoDir],
    { encoding: "utf8" }
  );

  // Should mention the file path
  expect(stdout, "--dry-run output should contain 'would delete'").toMatch(/would delete/);
  expect(stdout, "--dry-run output should list the file name").toMatch(/old-handoff\.md/);
  // Summary line
  expect(stdout, "--dry-run summary should report 1 file").toMatch(/dry-run.*1 file/);

  // File must still exist
  const stat = await fs.stat(oldFile);
  expect(stat.isFile(), "--dry-run must NOT delete the file").toBeTruthy();
});

test("--dry-run: exits 0 even when files are found", async () => {
  const { repoDir } = await setupArtifactsDir("prune-dryrun-exit-");

  const result = await execFile(
    process.execPath,
    [pruneScript, "--dry-run", "--older-than", "1", "--repo", repoDir],
    { encoding: "utf8" }
  );

  // execFile resolves (does not throw) only when exit code is 0
  expect(result, "process should exit 0 in --dry-run mode").toBeTruthy();
});

test("without --dry-run: actually deletes old files", async () => {
  const { repoDir, oldFile } = await setupArtifactsDir("prune-nodryrun-");

  const { stdout } = await execFile(
    process.execPath,
    [pruneScript, "--older-than", "1", "--repo", repoDir],
    { encoding: "utf8" }
  );

  expect(stdout, "destructive run should report 1 deleted file").toMatch(/deleted.*1 file/);

  // File must be gone
  let caughtErr: NodeJS.ErrnoException | undefined;
  try {
    await fs.stat(oldFile);
  } catch (err) {
    caughtErr = err as NodeJS.ErrnoException;
  }
  expect(caughtErr?.code, "file should have been deleted").toBe("ENOENT");
});

```

### crew/tests/validate-all.test.mts

```
import path from "node:path";
import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scriptPath = path.join(repoRoot, "scripts", "validate-all.mts");

function runValidateAll(cwd = repoRoot) {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    timeout: 60_000,
    cwd
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

test("validate-all: exits 0 on clean repo and reports all validators passed", () => {
  const { status, stdout } = runValidateAll();
  expect(status, `expected exit 0 but got ${status}`).toBe(0);
  expect(stdout).toMatch(/All 4 validators passed\./);
});

test("validate-all: stdout contains a check mark for each validator on success", () => {
  const { status, stdout } = runValidateAll();
  expect(status).toBe(0);
  expect(stdout).toMatch(/✓ validate-manifests\.mts/);
  expect(stdout).toMatch(/✓ validate-skills\.mts/);
  expect(stdout).toMatch(/✓ validate-agents\.mts/);
  expect(stdout).toMatch(/✓ validate-slices\.mts/);
});

```

### crew/tests/validate-slices.test.mts

```
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scriptPath = path.join(repoRoot, "scripts", "validate-slices.mjs");

async function makeFixture(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(dir, "docs", "ai-loop", "slices", "pending"), { recursive: true });
  return dir;
}

function runValidator(repoPath: string) {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    timeout: 30_000,
    cwd: repoPath,
    env: { ...process.env, CREW_SLICE_LINT_REPO: repoPath }
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

async function cleanup(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

test("validate-slices: empty pending dir exits 0", async () => {
  const dir = await makeFixture("vs-empty-");
  try {
    const { status } = runValidator(dir);
    expect(status, "expected exit 0 for empty pending dir").toBe(0);
  } finally {
    await cleanup(dir);
  }
});

test("validate-slices: slice with concrete ACs exits 0", async () => {
  const dir = await makeFixture("vs-concrete-");
  try {
    const body = [
      "# SLICE-99: Test slice",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] AC-1: Validator script exits non-zero when placeholder ACs are present",
      "- [ ] AC-2: Validator script exits zero when all ACs are concrete and verifiable",
      ""
    ].join("\n");
    await fs.writeFile(
      path.join(dir, "docs", "ai-loop", "slices", "pending", "SLICE_99_TEST.md"),
      body
    );
    const { status, stderr } = runValidator(dir);
    expect(status, `expected exit 0, got ${status}, stderr: ${stderr}`).toBe(0);
  } finally {
    await cleanup(dir);
  }
});

test("validate-slices: literal AC-N: ... placeholder exits 1", async () => {
  const dir = await makeFixture("vs-dot-placeholder-");
  try {
    const body = [
      "# SLICE-99: Placeholder slice",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] AC-1: ...",
      "- [ ] AC-2: ...",
      ""
    ].join("\n");
    await fs.writeFile(
      path.join(dir, "docs", "ai-loop", "slices", "pending", "SLICE_99_PH.md"),
      body
    );
    const { status, stderr } = runValidator(dir);
    expect(status, "expected exit 1 for literal dot placeholder").toBe(1);
    expect(stderr, "stderr must name offending file").toMatch(/SLICE_99_PH\.md/);
    expect(stderr, "stderr must name the placeholder AC bullet").toMatch(/AC-1/);
  } finally {
    await cleanup(dir);
  }
});

test("validate-slices: angle-bracket template placeholder exits 1", async () => {
  const dir = await makeFixture("vs-angle-placeholder-");
  try {
    const body = [
      "# SLICE-99: Angle slice",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] AC-1: <concrete, verifiable outcome>",
      ""
    ].join("\n");
    await fs.writeFile(
      path.join(dir, "docs", "ai-loop", "slices", "pending", "SLICE_99_ANGLE.md"),
      body
    );
    const { status, stderr } = runValidator(dir);
    expect(status, "expected exit 1 for angle-bracket placeholder").toBe(1);
    expect(stderr, "stderr must name the placeholder AC bullet").toMatch(/AC-1/);
  } finally {
    await cleanup(dir);
  }
});

test("validate-slices: empty AC bullet exits 1", async () => {
  const dir = await makeFixture("vs-empty-bullet-");
  try {
    const body = [
      "# SLICE-99: Empty AC",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] AC-1: ",
      ""
    ].join("\n");
    await fs.writeFile(
      path.join(dir, "docs", "ai-loop", "slices", "pending", "SLICE_99_EMPTY.md"),
      body
    );
    const { status, stderr } = runValidator(dir);
    expect(status, "expected exit 1 for empty AC bullet").toBe(1);
    expect(stderr, "stderr must name the empty AC bullet").toMatch(/AC-1/);
  } finally {
    await cleanup(dir);
  }
});

test("validate-slices: completed/ slices are NOT scanned", async () => {
  const dir = await makeFixture("vs-completed-skip-");
  try {
    await fs.mkdir(path.join(dir, "docs", "ai-loop", "slices", "completed"), { recursive: true });
    const body = ["## Acceptance criteria", "", "- [ ] AC-1: ...", ""].join("\n");
    await fs.writeFile(
      path.join(dir, "docs", "ai-loop", "slices", "completed", "SLICE_88_OLD.md"),
      body
    );
    const { status } = runValidator(dir);
    expect(status, "expected exit 0 — completed slices are immutable history").toBe(0);
  } finally {
    await cleanup(dir);
  }
});

test("validate-slices: missing slices dir exits 0", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vs-missing-"));
  try {
    const { status } = runValidator(dir);
    expect(status, "expected exit 0 when docs/ai-loop/slices/pending is absent").toBe(0);
  } finally {
    await cleanup(dir);
  }
});

```

### crew/tsconfig.json

```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": false,
    "isolatedModules": false,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "types": [
      "node",
      "bun"
    ]
  },
  "include": [
    "scripts/**/*.ts",
    "scripts/**/*.mts",
    "scripts/**/*.mjs",
    "tests/**/*.ts",
    "hooks/**/*.ts",
    "hooks/**/*.mts",
    "evals/**/*.ts",
    "evals/**/*.mts",
    "skills/**/*.mts"
  ],
  "exclude": [
    "node_modules",
    "tests/fixtures"
  ]
}

```

### package.json

```
{
  "name": "devcrew",
  "version": "0.78.0",
  "private": true,
  "type": "module",
  "bin": {
    "astrarunner": "src/scripts/cli/connect.mts"
  },
  "scripts": {
    "typecheck": "tsc --project tsconfig.json --noEmit && tsc --project tsconfig.test.json --noEmit",
    "test": "bun test src/tests/ --parallel --timeout 60000",
    "test:crew": "cd crew && bun test --timeout 60000 tests/ --parallel",
    "test:all": "bun run test && bun run test:crew",
    "bench": "bun src/tests/perf/bench-runner.mts",
    "validate:event-schemas": "bun ./src/scripts/validate-event-schemas.mts",
    "validate:manifests": "bun ./src/scripts/validate-manifests.mts",
    "validate:lengths": "bun ./src/scripts/validate-content-length.mts",
    "bump-version": "bun ./src/scripts/bump-version.mts",
    "lint": "biome lint src/",
    "format": "biome format --write src/",
    "format:check": "biome format src/",
    "validate:imports": "bun ./src/scripts/validate-imports.mts"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.5.0",
    "@types/node": "^25.9.1",
    "bun-types": "^1.3.14",
    "typescript": "^7.0.0"
  },
  "dependencies": {
    "@astragenie/astramem-client": "^0.3.0",
    "@astragenie/plugin-std": "^0.5.0",
    "ajv": "^8.17",
    "ajv-formats": "^3.0"
  }
}

```

## Files read

