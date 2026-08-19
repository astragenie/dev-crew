---
slice: unknown
builder: fullstack-dev
run_id: 20260819T001215Z
files_touched: ["crew/package.json", "crew/tests/artifact-stub-and-update.test.mts", "crew/tests/build-bundle-cli.test.mts", "crew/tests/cli-smoke.test.mts", "crew/tests/cost-hygiene-hook.test.mts", "crew/tests/crew-write-review-result.test.mts", "crew/tests/dispatch-size-gate.test.mts", "crew/tests/gepa-corpus-optimize.test.mts", "crew/tests/gepa-corpus-sync.test.mts", "crew/tests/hook-feature-gating.test.mts", "crew/tests/preflight-shell.test.mts", "crew/tests/regression.test.mts", "crew/tests/subagent-return.test.mts", "crew/tests/telemetry-cli.test.mts", "crew/tests/tier-in-run-brief.test.mts"]
files_read: []
diff_stat: { files: 155, additions: 3946, deletions: 4833 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-07 round 3: flip remaining node spawns to bun (15 files)

- Created: 2026-08-19T00:12:15.088Z
- From: fullstack-dev
- To: lead
- Objective: Flipped the last node-spawn class to bun per the unification plan Sec3. In 14 crew/tests/*.test.mts files, changed every spawn/execFile/spawnSync/execFileSync of literal node (with or without --experimental-strip-types) targeting a repo .mts script to bun, dropping the strip-types flag; also dropped the stale --experimental-strip-types flag from 3 files (artifact-stub-and-update, tier-in-run-brief, crew-write-review-result) that use spawnSync(process.execPath, ...) -- process.execPath already resolves to the running bun binary under bun test, it was just carrying an incompatible node-only flag. Updated 2 ADR-002 comments (gepa-corpus-optimize, gepa-corpus-sync) to cite the unification plan instead. In crew/package.json flipped node ./scripts/*.mts invocations (validate:*, installer:*, e2e:smoke*, test:shard, verify:all, validate:all, validate:bundles) to bun, dropping strip-types. Left test:node and evals:view untouched (not node-./scripts/*.mts-script invocations). Deliberately did not touch hook-cold-start-bench.test.mts (its node/bun RUNTIME comparison toggle is intentional) or four out-of-scope files that share the same stale process.execPath+strip-types pattern (enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts) since they were not named in this round's scope.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/tests/artifact-stub-and-update.test.mts
  - crew/tests/build-bundle-cli.test.mts
  - crew/tests/cli-smoke.test.mts
  - crew/tests/cost-hygiene-hook.test.mts
  - crew/tests/crew-write-review-result.test.mts
  - crew/tests/dispatch-size-gate.test.mts
  - crew/tests/gepa-corpus-optimize.test.mts
  - crew/tests/gepa-corpus-sync.test.mts
  - crew/tests/hook-feature-gating.test.mts
  - crew/tests/preflight-shell.test.mts
  - crew/tests/regression.test.mts
  - crew/tests/subagent-return.test.mts
  - crew/tests/telemetry-cli.test.mts
  - crew/tests/tier-in-run-brief.test.mts
  - crew/package.json
- Confidence: high
- Risks: 4 files outside this round's named scope (enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts) still spawn CLI children via process.execPath with a stale --experimental-strip-types flag -- same latent issue, unfixed by design (not in the 15-file scope). Root suite's pre-existing 2 fails (DEC-070/DEC-068 contract-record ENOENT in learning-cycle.test.mts and eval-generator.test.mts) are unrelated to this change and were already failing before this round.
- Suggested Next Handoff: If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).


## Diff

```diff
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index bff423de..60a0be18 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-18T22:51:44.721Z",
+  "updatedAt": "2026-08-19T00:12:15.091Z",
   "currentRun": {
     "title": "FEAT002 SLICE06: .ts->.mts rename sweep batch 2 + import-specifier fixes",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
     "startedAt": "2026-08-18T22:51:44.721Z",
-    "updatedAt": "2026-08-18T22:51:44.721Z",
-    "next": "Begin implementation",
+    "updatedAt": "2026-08-19T00:12:15.091Z",
+    "next": "If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).",
     "gates": {
       "review": null,
       "validation": null,
@@ -23,7 +23,9 @@
     },
     "artifacts": {
       "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T225144Z-run-brief-feat002-slice06-ts-mts-rename-sweep-batch-2-import-specifier.md",
-      "handoffs": [],
+      "handoffs": [
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T001215Z-handoff-slice-07-round-3-flip-remaining-node-spawns-to-bun-15-files.md"
+      ],
       "reviewResult": null,
       "validationPlan": null,
       "validationResult": null,
diff --git a/crew/package.json b/crew/package.json
index de623724..a998b11e 100644
--- a/crew/package.json
+++ b/crew/package.json
@@ -15,29 +15,29 @@
   },
   "scripts": {
     "test": "bun test --timeout 60000 tests/",
-    "test:shard": "node --experimental-strip-types scripts/test-shard.mts",
+    "test:shard": "bun scripts/test-shard.mts",
     "test:agents": "CREW_AGENT_EVAL=1 bun test tests/agent-eval/",
     "test:node": "node --test --experimental-strip-types",
-    "validate:manifests": "node ./scripts/validate-manifests.mts",
+    "validate:manifests": "bun ./scripts/validate-manifests.mts",
     "lint": "biome lint scripts/ hooks/",
     "typecheck": "tsc --noEmit",
-    "validate:skills": "node ./scripts/validate-skills.mts",
-    "validate:agents": "node ./scripts/validate-agents.mts",
-    "validate:contracts": "node ./scripts/validate-contracts.mts",
-    "validate:routing-table": "node ./scripts/validate-routing-table.mts",
-    "validate:slices": "node ./scripts/validate-slices.mts",
-    "verify:all": "node --experimental-strip-types scripts/validate-all.mts",
-    "validate:all": "node --experimental-strip-types scripts/validate-all.mts",
-    "validate:bundles": "node --experimental-strip-types ./scripts/validate-bundles.mts",
-    "validate:ux-spec": "node ./scripts/validate-ux-spec.mts",
+    "validate:skills": "bun ./scripts/validate-skills.mts",
+    "validate:agents": "bun ./scripts/validate-agents.mts",
+    "validate:contracts": "bun ./scripts/validate-contracts.mts",
+    "validate:routing-table": "bun ./scripts/validate-routing-table.mts",
+    "validate:slices": "bun ./scripts/validate-slices.mts",
+    "verify:all": "bun scripts/validate-all.mts",
+    "validate:all": "bun scripts/validate-all.mts",
+    "validate:bundles": "bun ./scripts/validate-bundles.mts",
+    "validate:ux-spec": "bun ./scripts/validate-ux-spec.mts",
     "format": "biome format --write scripts/ tests/",
     "format:check": "biome format scripts/ tests/",
-    "installer:install-global": "node ./scripts/crew.mts install-global",
-    "installer:bootstrap": "node ./scripts/crew.mts bootstrap",
-    "installer:init": "node ./scripts/crew.mts init",
-    "installer:audit": "node ./scripts/crew.mts audit",
-    "e2e:smoke": "node ./scripts/e2e-smoke.mts",
-    "e2e:smoke:ux": "node ./scripts/e2e-smoke-ux.mts",
+    "installer:install-global": "bun ./scripts/crew.mts install-global",
+    "installer:bootstrap": "bun ./scripts/crew.mts bootstrap",
+    "installer:init": "bun ./scripts/crew.mts init",
+    "installer:audit": "bun ./scripts/crew.mts audit",
+    "e2e:smoke": "bun ./scripts/e2e-smoke.mts",
+    "e2e:smoke:ux": "bun ./scripts/e2e-smoke-ux.mts",
     "evals": "bun evals/cli.mts",
     "evals:memory-delta": "bun evals/memory-delta.mts",
     "evals:view": "node -e \"console.log('Open in your browser: file://' + require('path').resolve('evals/viewer/index.html').replace(/\\\\/g,'/'))\""
diff --git a/crew/scripts/test-shard.mts b/crew/scripts/test-shard.mts
index eda027d4..580784fc 100644
--- a/crew/scripts/test-shard.mts
+++ b/crew/scripts/test-shard.mts
@@ -39,7 +39,7 @@ export async function discoverTestFiles(
       const full = path.join(current, entry.name);
       if (entry.isDirectory()) {
         await walk(full);
-      } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
+      } else if (entry.isFile() && entry.name.endsWith(".test.mts")) {
         out.push(path.relative(root, full).split(path.sep).join("/"));
       }
     }
diff --git a/crew/scripts/validate-all.mts b/crew/scripts/validate-all.mts
index c177a397..bb58505d 100644
--- a/crew/scripts/validate-all.mts
+++ b/crew/scripts/validate-all.mts
@@ -25,7 +25,7 @@ interface ValidatorResult {
 
 function runValidator(script: string): Promise<ValidatorResult> {
   return new Promise((resolve) => {
-    const proc = spawn(process.execPath, ["--experimental-strip-types", join(__dirname, script)], {
+    const proc = spawn("bun", [join(__dirname, script)], {
       stdio: "pipe"
     });
     let output = "";
diff --git a/crew/skills/workflow/test-quality/scripts/analyze.mts b/crew/skills/workflow/test-quality/scripts/analyze.mts
index ca16ff8a..29510d6e 100644
--- a/crew/skills/workflow/test-quality/scripts/analyze.mts
+++ b/crew/skills/workflow/test-quality/scripts/analyze.mts
@@ -12,7 +12,7 @@ import * as path from "node:path";
 type Sev = "HIGH" | "MEDIUM" | "ADVISORY";
 interface Finding { severity: Sev; file: string; line: number; description: string; }
 
-const TEST_FILE_RE = /\.(test|spec|fixture)\.[jt]sx?$|_test\.py$|^test_.*\.py$/;
+const TEST_FILE_RE = /\.(test|spec|fixture)\.m?[jt]sx?$|_test\.py$|^test_.*\.py$/;
 
 // Lens 1 — hard flaky patterns → HIGH
 const FLAKY_HARD: Array<{ label: string; re: RegExp }> = [
diff --git a/crew/tests/agent-prompt-content.test.mts b/crew/tests/agent-prompt-content.test.mts
index 647eb6f6..ffb2bb16 100644
--- a/crew/tests/agent-prompt-content.test.mts
+++ b/crew/tests/agent-prompt-content.test.mts
@@ -2,8 +2,7 @@
 // Keyword assertions for agent prompts. Tests catch semantic drift that
 // structural validators (line count, sections) miss — e.g. a prompt that
 // drops a required gate keyword or names the wrong skill.
-import { test, describe } from "node:test";
-import assert from "node:assert/strict";
+import { test, describe, expect } from "bun:test";
 import { readFileSync } from "node:fs";
 import { resolve, dirname } from "node:path";
 import { fileURLToPath } from "node:url";
@@ -24,33 +23,21 @@ const builder = readAgent("fullstack-dev");
 // beyond that. Future shrinks may lower further; relax this test in tandem.
 test("fullstack-dev.md stays under 330 line cap (FEAT-170 SLICE-D)", () => {
   const lines = builder.split(/\r?\n/).length;
-  assert.ok(
-    lines <= 330,
-    `fullstack-dev.md is ${lines} lines, exceeds 330-line cap (FEAT-170 SLICE-D regression gate)`
-  );
+  expect(lines <= 330, `fullstack-dev.md is ${lines} lines, exceeds 330-line cap (FEAT-170 SLICE-D regression gate)`).toBeTruthy();
 });
 
 test("fullstack-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
-  assert.ok(
-    builder.includes("root-cause-discipline"),
-    "fullstack-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
-  );
+  expect(builder.includes("root-cause-discipline"), "fullstack-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)").toBeTruthy();
 });
 
 test("backend-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
   const be = readAgent("backend-dev");
-  assert.ok(
-    be.includes("root-cause-discipline"),
-    "backend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
-  );
+  expect(be.includes("root-cause-discipline"), "backend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)").toBeTruthy();
 });
 
 test("frontend-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
   const fe = readAgent("frontend-dev");
-  assert.ok(
-    fe.includes("root-cause-discipline"),
-    "frontend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
-  );
+  expect(fe.includes("root-cause-discipline"), "frontend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)").toBeTruthy();
 });
 
 // FEAT-170 SLICE-D drift prevention: "lead" mentions in builder prompts are
@@ -95,29 +82,17 @@ function leadDriftScan(content: string, file: string): string[] {
 
 test("fullstack-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
   const drifts = leadDriftScan(builder, "agents/fullstack-dev.md");
-  assert.equal(
-    drifts.length,
-    0,
-    `fullstack-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist (use 'orchestrator' instead):\n${drifts.join("\n")}`
-  );
+  expect(drifts.length, `fullstack-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist (use 'orchestrator' instead):\n${drifts.join("\n")}`).toBe(0);
 });
 
 test("backend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
   const drifts = leadDriftScan(readAgent("backend-dev"), "agents/backend-dev.md");
-  assert.equal(
-    drifts.length,
-    0,
-    `backend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`
-  );
+  expect(drifts.length, `backend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`).toBe(0);
 });
 
 test("frontend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
   const drifts = leadDriftScan(readAgent("frontend-dev"), "agents/frontend-dev.md");
-  assert.equal(
-    drifts.length,
-    0,
-    `frontend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`
-  );
+  expect(drifts.length, `frontend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`).toBe(0);
 });
 
 // Obsoleted 2026-06-21: scope-cross + cross-layer-split handling centralized in
@@ -125,17 +100,11 @@ test("frontend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)",
 // no longer carries an inline "## Cross-layer split detection" section by
 // design. Keep the skip marker as a documented archaeology pointer.
 test.skip("fullstack-dev.md declares Cross-layer split detection section (FEAT-170 SLICE-B)", () => {
-  assert.ok(
-    builder.includes("## Cross-layer split detection") || builder.includes("SPLIT_BUILD"),
-    "fullstack-dev.md missing SPLIT_BUILD signal guidance (FEAT-170 SLICE-B)"
-  );
+  expect(builder.includes("## Cross-layer split detection") || builder.includes("SPLIT_BUILD"), "fullstack-dev.md missing SPLIT_BUILD signal guidance (FEAT-170 SLICE-B)").toBeTruthy();
 });
 
 test("fullstack-dev.md declares Forbidden block (FEAT-170 SLICE-B)", () => {
-  assert.ok(
-    builder.includes("## Forbidden"),
-    "fullstack-dev.md missing ## Forbidden block (FEAT-170 SLICE-B)"
-  );
+  expect(builder.includes("## Forbidden"), "fullstack-dev.md missing ## Forbidden block (FEAT-170 SLICE-B)").toBeTruthy();
 });
 
 test("builder-mindset skill lists expanded leak phrases (extracted from per-agent identity anchors in v0.43)", () => {
@@ -155,35 +124,32 @@ test("builder-mindset skill lists expanded leak phrases (extracted from per-agen
     "Let me re-read",
     "As the orchestrator"
   ]) {
-    assert.ok(skill.includes(phrase), `builder-mindset/SKILL.md missing leak phrase "${phrase}"`);
+    expect(skill.includes(phrase), `builder-mindset/SKILL.md missing leak phrase "${phrase}"`).toBeTruthy();
   }
 });
 
 test("fullstack-dev.md loads builder-mindset for identity anchor", () => {
-  assert.ok(
-    builder.includes("skills/universal/builder-mindset/"),
-    "fullstack-dev.md must reference skills/universal/builder-mindset/ for leak phrases"
-  );
+  expect(builder.includes("skills/universal/builder-mindset/"), "fullstack-dev.md must reference skills/universal/builder-mindset/ for leak phrases").toBeTruthy();
 });
 
 test("builder.md contains TDD policy reference", () => {
-  assert.ok(builder.includes("TDD"), "builder.md missing TDD");
+  expect(builder.includes("TDD"), "builder.md missing TDD").toBeTruthy();
 });
 
 test("builder.md references crew:reviewer dispatch", () => {
-  assert.ok(builder.includes("crew:reviewer"), "builder.md missing crew:reviewer");
+  expect(builder.includes("crew:reviewer"), "builder.md missing crew:reviewer").toBeTruthy();
 });
 
 test("builder.md contains write-handoff instruction", () => {
-  assert.ok(builder.includes("write-handoff"), "builder.md missing write-handoff");
+  expect(builder.includes("write-handoff"), "builder.md missing write-handoff").toBeTruthy();
 });
 
 test("builder.md contains validation_skipped badge reference", () => {
-  assert.ok(builder.includes("validation_skipped"), "builder.md missing validation_skipped");
+  expect(builder.includes("validation_skipped"), "builder.md missing validation_skipped").toBeTruthy();
 });
 
 test("builder.md references mark-badge", () => {
-  assert.ok(builder.includes("mark-badge"), "builder.md missing mark-badge");
+  expect(builder.includes("mark-badge"), "builder.md missing mark-badge").toBeTruthy();
 });
 
 // FEAT-170 SLICE-D follow-up: fullstack-dev's ceremony moved to
@@ -191,10 +157,7 @@ test("builder.md references mark-badge", () => {
 // self-verify-gate skill). The builder prompt now points at builder-ceremony
 // instead of carrying the self-verify reference inline.
 test("builder.md points at builder-ceremony skill (which carries self-verify reference)", () => {
-  assert.ok(
-    builder.includes("skills/workflow/builder-ceremony"),
-    "builder.md must point at builder-ceremony skill"
-  );
+  expect(builder.includes("skills/workflow/builder-ceremony"), "builder.md must point at builder-ceremony skill").toBeTruthy();
 });
 
 // FEAT-170 SLICE-D follow-up, superseded by dev-team#227: builders MUST NOT
@@ -205,23 +168,14 @@ test("builder.md points at builder-ceremony skill (which carries self-verify ref
 // + "Narration without a posted PR report = contract violation" guardrail.
 // "NEVER invoke write-handoff" stays as the protective guardrail unchanged.
 test("builder.md prohibits write-handoff CLI invocation (FEAT-170 SLICE-D / dev-team#227)", () => {
-  assert.ok(
-    builder.includes("Narration without a posted PR report = contract violation"),
-    "fullstack-dev.md must contain the report-to-PR contract-violation guardrail"
-  );
-  assert.ok(
-    builder.includes("NEVER invoke `write-handoff`") ||
-      builder.includes("NEVER invoke write-handoff"),
-    "fullstack-dev.md must contain the 'NEVER invoke write-handoff' guardrail"
-  );
+  expect(builder.includes("Narration without a posted PR report = contract violation"), "fullstack-dev.md must contain the report-to-PR contract-violation guardrail").toBeTruthy();
+  expect(builder.includes("NEVER invoke `write-handoff`") ||
+      builder.includes("NEVER invoke write-handoff"), "fullstack-dev.md must contain the 'NEVER invoke write-handoff' guardrail").toBeTruthy();
 });
 
 test("builder.md declares the STATUS-token follow-up format (FEAT-170 SLICE-D)", () => {
   for (const token of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
-    assert.ok(
-      builder.includes(token),
-      `fullstack-dev.md missing STATUS token "${token}" — see Report contract section`
-    );
+    expect(builder.includes(token), `fullstack-dev.md missing STATUS token "${token}" — see Report contract section`).toBeTruthy();
   }
 });
 
@@ -231,17 +185,11 @@ const selfVerifySkill = readFileSync(
 );
 
 test("self-verify-gate skill is scoped to affected-class tests", () => {
-  assert.ok(
-    selfVerifySkill.includes("Affected-class tests only"),
-    "self-verify-gate skill missing scoped affected-class test gate"
-  );
+  expect(selfVerifySkill.includes("Affected-class tests only"), "self-verify-gate skill missing scoped affected-class test gate").toBeTruthy();
 });
 
 test("self-verify-gate skill defers the full suite to the validator", () => {
-  assert.ok(
-    selfVerifySkill.includes("Deferred to validator"),
-    "self-verify-gate skill missing Deferred to validator handoff line"
-  );
+  expect(selfVerifySkill.includes("Deferred to validator"), "self-verify-gate skill missing Deferred to validator handoff line").toBeTruthy();
 });
 
 // ── reviewer ─────────────────────────────────────────────────────────────────
@@ -249,33 +197,27 @@ test("self-verify-gate skill defers the full suite to the validator", () => {
 const reviewer = readAgent("reviewer");
 
 test("reviewer.md references write-review-result", () => {
-  assert.ok(reviewer.includes("write-review-result"), "reviewer.md missing write-review-result");
+  expect(reviewer.includes("write-review-result"), "reviewer.md missing write-review-result").toBeTruthy();
 });
 
 test("reviewer.md contains Test Adequacy section", () => {
-  assert.ok(reviewer.includes("Test Adequacy"), "reviewer.md missing Test Adequacy");
+  expect(reviewer.includes("Test Adequacy"), "reviewer.md missing Test Adequacy").toBeTruthy();
 });
 
 test("reviewer.md dropped --validation-evidence bundling (validator now mandatory)", () => {
-  assert.ok(
-    !reviewer.includes("--validation-evidence"),
-    "reviewer.md should no longer emit --validation-evidence — the validator owns the mandatory full gate"
-  );
+  expect(!reviewer.includes("--validation-evidence"), "reviewer.md should no longer emit --validation-evidence — the validator owns the mandatory full gate").toBeTruthy();
 });
 
 test("reviewer.md re-runs the builder's affected-class test set", () => {
-  assert.ok(
-    reviewer.includes("Affected-test re-run"),
-    "reviewer.md missing affected-test re-run gate"
-  );
+  expect(reviewer.includes("Affected-test re-run"), "reviewer.md missing affected-test re-run gate").toBeTruthy();
 });
 
 test("reviewer.md contains rejected decision option", () => {
-  assert.ok(reviewer.includes("rejected"), "reviewer.md missing rejected decision");
+  expect(reviewer.includes("rejected"), "reviewer.md missing rejected decision").toBeTruthy();
 });
 
 test("reviewer.md addresses regression concerns", () => {
-  assert.ok(reviewer.includes("regression"), "reviewer.md missing regression");
+  expect(reviewer.includes("regression"), "reviewer.md missing regression").toBeTruthy();
 });
 
 // ── validator ────────────────────────────────────────────────────────────────
@@ -283,37 +225,28 @@ test("reviewer.md addresses regression concerns", () => {
 const validator = readAgent("verifier");
 
 test("validator.md contains validation_skipped badge", () => {
-  assert.ok(validator.includes("validation_skipped"), "validator.md missing validation_skipped");
+  expect(validator.includes("validation_skipped"), "validator.md missing validation_skipped").toBeTruthy();
 });
 
 test("validator.md routes UI/UX scope to crew:qa-expert", () => {
-  assert.ok(
-    validator.includes("crew:qa-expert"),
-    "validator.md missing crew:qa-expert routing for UI/UX scope"
-  );
-  assert.ok(
-    validator.includes("UI/UX/a11y is NOT verifier's scope"),
-    "verifier.md missing explicit UI/UX-out-of-scope guard"
-  );
+  expect(validator.includes("crew:qa-expert"), "validator.md missing crew:qa-expert routing for UI/UX scope").toBeTruthy();
+  expect(validator.includes("UI/UX/a11y is NOT verifier's scope"), "verifier.md missing explicit UI/UX-out-of-scope guard").toBeTruthy();
 });
 
 test("validator.md requires evidence gathering", () => {
-  assert.ok(validator.includes("evidence"), "validator.md missing evidence");
+  expect(validator.includes("evidence"), "validator.md missing evidence").toBeTruthy();
 });
 
 test("validator.md addresses scenario execution", () => {
-  assert.ok(validator.includes("scenario"), "validator.md missing scenario");
+  expect(validator.includes("scenario"), "validator.md missing scenario").toBeTruthy();
 });
 
 test("validator.md contains mark-badge reference", () => {
-  assert.ok(validator.includes("mark-badge"), "validator.md missing mark-badge");
+  expect(validator.includes("mark-badge"), "validator.md missing mark-badge").toBeTruthy();
 });
 
 test("validator.md owns the mandatory full gate (lint + format:check)", () => {
-  assert.ok(
-    validator.includes("Mandatory final gate") && validator.includes("format:check"),
-    "validator.md missing mandatory full gate with format:check"
-  );
+  expect(validator.includes("Mandatory final gate") && validator.includes("format:check"), "validator.md missing mandatory full gate with format:check").toBeTruthy();
 });
 
 // ── deployer ─────────────────────────────────────────────────────────────────
@@ -321,26 +254,23 @@ test("validator.md owns the mandatory full gate (lint + format:check)", () => {
 const deployer = readAgent("release-engineer");
 
 test("deployer.md references write-deployment-check", () => {
-  assert.ok(
-    deployer.includes("write-deployment-check"),
-    "deployer.md missing write-deployment-check"
-  );
+  expect(deployer.includes("write-deployment-check"), "deployer.md missing write-deployment-check").toBeTruthy();
 });
 
 test("deployer.md addresses environment transitions", () => {
-  assert.ok(deployer.includes("environment"), "deployer.md missing environment");
+  expect(deployer.includes("environment"), "deployer.md missing environment").toBeTruthy();
 });
 
 test("deployer.md requires evidence gathering", () => {
-  assert.ok(deployer.includes("evidence"), "deployer.md missing evidence");
+  expect(deployer.includes("evidence"), "deployer.md missing evidence").toBeTruthy();
 });
 
 test("deployer.md contains mark-badge reference", () => {
-  assert.ok(deployer.includes("mark-badge"), "deployer.md missing mark-badge");
+  expect(deployer.includes("mark-badge"), "deployer.md missing mark-badge").toBeTruthy();
 });
 
 test("deployer.md contains write-handoff reference", () => {
-  assert.ok(deployer.includes("write-handoff"), "deployer.md missing write-handoff");
+  expect(deployer.includes("write-handoff"), "deployer.md missing write-handoff").toBeTruthy();
 });
 
 // lead.md removed in v0.41 hard cut — orchestration is now a concept (the slash
@@ -400,31 +330,19 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
   describe("fullstack-dev (already compliant)", () => {
     const content = readAgent("fullstack-dev");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "fullstack-dev.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "fullstack-dev.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "fullstack-dev.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "fullstack-dev.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "fullstack-dev.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "fullstack-dev.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "fullstack-dev.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "fullstack-dev.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "fullstack-dev.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "fullstack-dev.md missing FEAT-161 cite-back").toBeTruthy();
     });
     // FEAT-180 (v2.0.0 builder rewrite): Identity anchor stays at the FRONT
     // (per user "you are builder / fullstack-developer up top"), HARD
@@ -432,193 +350,118 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
     test("placement: Identity anchor present + HARD CONTRACT present", () => {
       const identityIdx = content.indexOf("## Identity anchor");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      assert.ok(contractIdx !== -1, "fullstack-dev.md HARD CONTRACT heading not found");
-      assert.ok(identityIdx !== -1, "fullstack-dev.md missing Identity anchor");
-      assert.ok(
-        identityIdx < contractIdx,
-        "fullstack-dev.md Identity anchor must appear before HARD CONTRACT"
-      );
+      expect(contractIdx !== -1, "fullstack-dev.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(identityIdx !== -1, "fullstack-dev.md missing Identity anchor").toBeTruthy();
+      expect(identityIdx < contractIdx, "fullstack-dev.md Identity anchor must appear before HARD CONTRACT").toBeTruthy();
     });
   });
 
   describe("frontend-dev (already compliant)", () => {
     const content = readAgent("frontend-dev");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "frontend-dev.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "frontend-dev.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "frontend-dev.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "frontend-dev.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "frontend-dev.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "frontend-dev.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "frontend-dev.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "frontend-dev.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "frontend-dev.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "frontend-dev.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: after Identity anchor, before first tactical heading", () => {
       const identityIdx = content.indexOf("## Identity anchor");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      assert.ok(contractIdx !== -1, "frontend-dev.md HARD CONTRACT heading not found");
-      assert.ok(identityIdx !== -1, "frontend-dev.md missing Identity anchor");
-      assert.ok(
-        contractIdx > identityIdx,
-        "frontend-dev.md HARD CONTRACT must appear after Identity anchor"
-      );
-      assert.ok(
-        contractIdx < firstTacticalIdx(content),
-        "frontend-dev.md HARD CONTRACT must appear before first tactical heading"
-      );
+      expect(contractIdx !== -1, "frontend-dev.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(identityIdx !== -1, "frontend-dev.md missing Identity anchor").toBeTruthy();
+      expect(contractIdx > identityIdx, "frontend-dev.md HARD CONTRACT must appear after Identity anchor").toBeTruthy();
+      expect(contractIdx < firstTacticalIdx(content), "frontend-dev.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
     });
   });
 
   describe("backend-dev (already compliant)", () => {
     const content = readAgent("backend-dev");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "backend-dev.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "backend-dev.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "backend-dev.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "backend-dev.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "backend-dev.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "backend-dev.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "backend-dev.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "backend-dev.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "backend-dev.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "backend-dev.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: after Identity anchor, before first tactical heading", () => {
       const identityIdx = content.indexOf("## Identity anchor");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      assert.ok(contractIdx !== -1, "backend-dev.md HARD CONTRACT heading not found");
-      assert.ok(identityIdx !== -1, "backend-dev.md missing Identity anchor");
-      assert.ok(
-        contractIdx > identityIdx,
-        "backend-dev.md HARD CONTRACT must appear after Identity anchor"
-      );
-      assert.ok(
-        contractIdx < firstTacticalIdx(content),
-        "backend-dev.md HARD CONTRACT must appear before first tactical heading"
-      );
+      expect(contractIdx !== -1, "backend-dev.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(identityIdx !== -1, "backend-dev.md missing Identity anchor").toBeTruthy();
+      expect(contractIdx > identityIdx, "backend-dev.md HARD CONTRACT must appear after Identity anchor").toBeTruthy();
+      expect(contractIdx < firstTacticalIdx(content), "backend-dev.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
     });
   });
 
   describe("reviewer (already compliant)", () => {
     const content = readAgent("reviewer");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "reviewer.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "reviewer.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "reviewer.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "reviewer.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "reviewer.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "reviewer.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-review-result keyword", () => {
-      assert.ok(
-        content.includes("write-review-result"),
-        "reviewer.md HARD CONTRACT missing write-review-result keyword"
-      );
+      expect(content.includes("write-review-result"), "reviewer.md HARD CONTRACT missing write-review-result keyword").toBeTruthy();
     });
     test("no backlog ids (FEAT-NNN / DEC-NNN / SLICE-NN)", () => {
       const ids = content.match(/\b(FEAT-\d+|DEC-\d+|SLICE-\d+)\b/g);
-      assert.ok(
-        !ids || ids.length === 0,
-        `reviewer.md must not contain backlog ids; found: ${ids?.join(", ")}`
-      );
+      expect(!ids || ids.length === 0, `reviewer.md must not contain backlog ids; found: ${ids?.join(", ")}`).toBeTruthy();
     });
     // Lead-agent removed in v0.41 (hard cut). Body-text gate is enforced repo-wide
     // by NO_LEAD_REF_REQUIRED in scripts/validate-agents.ts — see the parametrized
     // describe block "no lead refs across active agents" below.
     test("SLICE_BASE fallback — uses git merge-base, not fixed HEAD~1", () => {
-      assert.ok(
-        content.includes("git merge-base"),
-        "reviewer.md SLICE_BASE computation must use git merge-base, not hardcoded HEAD~1"
-      );
+      expect(content.includes("git merge-base"), "reviewer.md SLICE_BASE computation must use git merge-base, not hardcoded HEAD~1").toBeTruthy();
     });
     test("placement before first tactical heading", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      assert.ok(contractIdx !== -1, "reviewer.md HARD CONTRACT heading not found");
-      assert.ok(
-        contractIdx < firstTacticalIdx(content),
-        "reviewer.md HARD CONTRACT must appear before first tactical heading"
-      );
+      expect(contractIdx !== -1, "reviewer.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(contractIdx < firstTacticalIdx(content), "reviewer.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
     });
   });
 
   describe("verifier (already compliant)", () => {
     const content = readAgent("verifier");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "verifier.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "verifier.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "verifier.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "verifier.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "verifier.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "verifier.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-validation-result keyword", () => {
-      assert.ok(
-        content.includes("write-validation-result"),
-        "verifier.md HARD CONTRACT missing write-validation-result keyword"
-      );
+      expect(content.includes("write-validation-result"), "verifier.md HARD CONTRACT missing write-validation-result keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "verifier.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "verifier.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement before first tactical heading (Golden Path)", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      assert.ok(contractIdx !== -1, "verifier.md HARD CONTRACT heading not found");
-      assert.ok(
-        contractIdx < firstTacticalIdx(content),
-        "verifier.md HARD CONTRACT must appear before first tactical heading"
-      );
+      expect(contractIdx !== -1, "verifier.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(contractIdx < firstTacticalIdx(content), "verifier.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
     });
   });
 
@@ -627,75 +470,45 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
   describe("architect (newly added)", () => {
     const content = readAgent("architect");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "architect.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "architect.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "architect.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "architect.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "architect.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "architect.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "architect.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "architect.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("role-specific: Agent dispatch keyword", () => {
-      assert.ok(
-        content.includes("Agent"),
-        "architect.md HARD CONTRACT missing Agent dispatch keyword"
-      );
+      expect(content.includes("Agent"), "architect.md HARD CONTRACT missing Agent dispatch keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "architect.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "architect.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: after Custom instructions, before Golden Path (tactical heading)", () => {
       const customIdx = content.indexOf("## Custom instructions");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       const goldenPathIdx = content.indexOf("## Golden Path");
-      assert.ok(contractIdx !== -1, "architect.md HARD CONTRACT heading not found");
-      assert.ok(customIdx !== -1, "architect.md missing Custom instructions section");
-      assert.ok(goldenPathIdx !== -1, "architect.md missing Golden Path heading");
-      assert.ok(
-        contractIdx > customIdx,
-        "architect.md HARD CONTRACT must appear after Custom instructions"
-      );
-      assert.ok(
-        contractIdx < goldenPathIdx,
-        "architect.md HARD CONTRACT must appear before Golden Path"
-      );
+      expect(contractIdx !== -1, "architect.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(customIdx !== -1, "architect.md missing Custom instructions section").toBeTruthy();
+      expect(goldenPathIdx !== -1, "architect.md missing Golden Path heading").toBeTruthy();
+      expect(contractIdx > customIdx, "architect.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
+      expect(contractIdx < goldenPathIdx, "architect.md HARD CONTRACT must appear before Golden Path").toBeTruthy();
     });
   });
 
   describe("reviewer-lite (renamed from reviewer-verifier, validation stripped)", () => {
     const content = readAgent("reviewer-lite");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "reviewer-lite.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "reviewer-lite.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("write-review-result keyword present", () => {
-      assert.ok(
-        content.includes("write-review-result"),
-        "reviewer-lite.md HARD CONTRACT missing write-review-result keyword"
-      );
+      expect(content.includes("write-review-result"), "reviewer-lite.md HARD CONTRACT missing write-review-result keyword").toBeTruthy();
     });
     test("no validation-result dispatch (validation moved to pre-push hook + /crew:ship)", () => {
-      assert.ok(
-        !content.includes("write-validation-result"),
-        "reviewer-lite.md must NOT call write-validation-result — validation belongs to verifier + hook"
-      );
+      expect(!content.includes("write-validation-result"), "reviewer-lite.md must NOT call write-validation-result — validation belongs to verifier + hook").toBeTruthy();
     });
     test("no full validation gate (lint/format:check/tests/verify:all) inline", () => {
       const validationMarkers = [
@@ -705,10 +518,7 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
         "parallel-gates.ts"
       ];
       for (const marker of validationMarkers) {
-        assert.ok(
-          !content.includes(marker),
-          `reviewer-lite.md must NOT run validation gate inline; found "${marker}"`
-        );
+        expect(!content.includes(marker), `reviewer-lite.md must NOT run validation gate inline; found "${marker}"`).toBeTruthy();
       }
     });
   });
@@ -716,179 +526,110 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
   describe("integrator (newly added)", () => {
     const content = readAgent("integrator");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "integrator.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "integrator.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "integrator.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "integrator.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "integrator.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "integrator.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "integrator.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "integrator.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "integrator.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "integrator.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: after Custom instructions, before Procedure of record (tactical heading)", () => {
       const customIdx = content.indexOf("## Custom instructions");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       const procedureIdx = content.indexOf("## Procedure of record");
-      assert.ok(contractIdx !== -1, "integrator.md HARD CONTRACT heading not found");
-      assert.ok(customIdx !== -1, "integrator.md missing Custom instructions section");
-      assert.ok(procedureIdx !== -1, "integrator.md missing Procedure of record heading");
-      assert.ok(
-        contractIdx > customIdx,
-        "integrator.md HARD CONTRACT must appear after Custom instructions"
-      );
-      assert.ok(
-        contractIdx < procedureIdx,
-        "integrator.md HARD CONTRACT must appear before Procedure of record"
-      );
+      expect(contractIdx !== -1, "integrator.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(customIdx !== -1, "integrator.md missing Custom instructions section").toBeTruthy();
+      expect(procedureIdx !== -1, "integrator.md missing Procedure of record heading").toBeTruthy();
+      expect(contractIdx > customIdx, "integrator.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
+      expect(contractIdx < procedureIdx, "integrator.md HARD CONTRACT must appear before Procedure of record").toBeTruthy();
     });
   });
 
   describe("release-engineer (newly added)", () => {
     const content = readAgent("release-engineer");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "release-engineer.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "release-engineer.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "release-engineer.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "release-engineer.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "release-engineer.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "release-engineer.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-deployment-check keyword", () => {
-      assert.ok(
-        content.includes("write-deployment-check"),
-        "release-engineer.md HARD CONTRACT missing write-deployment-check keyword"
-      );
+      expect(content.includes("write-deployment-check"), "release-engineer.md HARD CONTRACT missing write-deployment-check keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "release-engineer.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "release-engineer.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: after Custom instructions, before deployment-specific content", () => {
       const customIdx = content.indexOf("## Custom instructions");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      assert.ok(contractIdx !== -1, "release-engineer.md HARD CONTRACT heading not found");
-      assert.ok(customIdx !== -1, "release-engineer.md missing Custom instructions section");
-      assert.ok(
-        contractIdx > customIdx,
-        "release-engineer.md HARD CONTRACT must appear after Custom instructions"
-      );
+      expect(contractIdx !== -1, "release-engineer.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(customIdx !== -1, "release-engineer.md missing Custom instructions section").toBeTruthy();
+      expect(contractIdx > customIdx, "release-engineer.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
     });
   });
 
   describe("document-writer (newly added)", () => {
     const content = readAgent("document-writer");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "document-writer.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "document-writer.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "document-writer.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "document-writer.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "document-writer.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "document-writer.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "document-writer.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "document-writer.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "document-writer.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "document-writer.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: before Your output contract section", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       const outputContractIdx = content.indexOf("## Your output contract");
-      assert.ok(contractIdx !== -1, "document-writer.md HARD CONTRACT heading not found");
-      assert.ok(
-        outputContractIdx !== -1,
-        "document-writer.md missing Your output contract heading"
-      );
-      assert.ok(
-        contractIdx < outputContractIdx,
-        "document-writer.md HARD CONTRACT must appear before Your output contract section"
-      );
+      expect(contractIdx !== -1, "document-writer.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(outputContractIdx !== -1, "document-writer.md missing Your output contract heading").toBeTruthy();
+      expect(contractIdx < outputContractIdx, "document-writer.md HARD CONTRACT must appear before Your output contract section").toBeTruthy();
     });
   });
 
   describe("refactor (newly added)", () => {
     const content = readAgent("refactor");
     test("heading present", () => {
-      assert.ok(
-        content.includes(HARD_CONTRACT_HEADING),
-        "refactor.md missing HARD CONTRACT heading"
-      );
+      expect(content.includes(HARD_CONTRACT_HEADING), "refactor.md missing HARD CONTRACT heading").toBeTruthy();
     });
     test("required preamble phrase", () => {
-      assert.ok(
-        hasPreamble(content),
-        "refactor.md missing LAST action/tool call before returning preamble"
-      );
+      expect(hasPreamble(content), "refactor.md missing LAST action/tool call before returning preamble").toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      assert.ok(
-        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
-        "refactor.md missing narration/contract-violation phrases"
-      );
+      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "refactor.md missing narration/contract-violation phrases").toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      assert.ok(
-        content.includes("write-handoff"),
-        "refactor.md HARD CONTRACT missing write-handoff keyword"
-      );
+      expect(content.includes("write-handoff"), "refactor.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "refactor.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "refactor.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("placement: after Custom instructions, before Concern areas content", () => {
       const customIdx = content.indexOf("## Custom instructions");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       const concernIdx = content.indexOf("## Concern areas");
-      assert.ok(contractIdx !== -1, "refactor.md HARD CONTRACT heading not found");
-      assert.ok(customIdx !== -1, "refactor.md missing Custom instructions section");
-      assert.ok(concernIdx !== -1, "refactor.md missing Concern areas heading");
-      assert.ok(
-        contractIdx > customIdx,
-        "refactor.md HARD CONTRACT must appear after Custom instructions"
-      );
-      assert.ok(
-        contractIdx < concernIdx,
-        "refactor.md HARD CONTRACT must appear before Concern areas"
-      );
+      expect(contractIdx !== -1, "refactor.md HARD CONTRACT heading not found").toBeTruthy();
+      expect(customIdx !== -1, "refactor.md missing Custom instructions section").toBeTruthy();
+      expect(concernIdx !== -1, "refactor.md missing Concern areas heading").toBeTruthy();
+      expect(contractIdx > customIdx, "refactor.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
+      expect(contractIdx < concernIdx, "refactor.md HARD CONTRACT must appear before Concern areas").toBeTruthy();
     });
   });
 });
@@ -924,7 +665,7 @@ describe.skip("## First action — Prong B coverage", () => {
     // negative-pattern lines; assert FEAT-161 cite still present (pause-detection
     // semantics now carried by badge state).
     test("FEAT-161 cite-back (pause-detection now via badge state)", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "fullstack-dev.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "fullstack-dev.md missing FEAT-161 cite-back").toBeTruthy();
     });
   });
 
@@ -940,22 +681,16 @@ describe.skip("## First action — Prong B coverage", () => {
     describe(`${agentName} (no-handoff contract — FEAT-170 SLICE-D)`, () => {
       const content = readAgent(agentName);
       test("FEAT-161 cite-back (pause-detection via badge state)", () => {
-        assert.ok(content.includes(FEAT_161_CITE), `${agentName}.md missing FEAT-161 cite-back`);
+        expect(content.includes(FEAT_161_CITE), `${agentName}.md missing FEAT-161 cite-back`).toBeTruthy();
       });
       test("prohibits write-handoff CLI invocation", () => {
-        assert.ok(
-          content.includes("do NOT write handoff") || content.includes("DO NOT write handoff"),
-          `${agentName}.md must contain "do NOT write handoff" guardrail`
-        );
-        assert.ok(
-          content.includes("NEVER invoke `write-handoff`") ||
-            content.includes("NEVER invoke write-handoff"),
-          `${agentName}.md must contain "NEVER invoke write-handoff" guardrail`
-        );
+        expect(content.includes("do NOT write handoff") || content.includes("DO NOT write handoff"), `${agentName}.md must contain "do NOT write handoff" guardrail`).toBeTruthy();
+        expect(content.includes("NEVER invoke `write-handoff`") ||
+            content.includes("NEVER invoke write-handoff"), `${agentName}.md must contain "NEVER invoke write-handoff" guardrail`).toBeTruthy();
       });
       test("declares STATUS-token follow-up format", () => {
         for (const token of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
-          assert.ok(content.includes(token), `${agentName}.md missing STATUS token "${token}"`);
+          expect(content.includes(token), `${agentName}.md missing STATUS token "${token}"`).toBeTruthy();
         }
       });
     });
@@ -964,165 +699,144 @@ describe.skip("## First action — Prong B coverage", () => {
   describe("reviewer", () => {
     const content = readAgent("reviewer");
     test("stub heading present", () => {
-      assert.ok(content.includes(STUB_HEADING), "reviewer.md missing stub artifact heading");
+      expect(content.includes(STUB_HEADING), "reviewer.md missing stub artifact heading").toBeTruthy();
     });
     test("--scaffold flag present", () => {
-      assert.ok(content.includes(SCAFFOLD_FLAG), "reviewer.md missing --scaffold flag");
+      expect(content.includes(SCAFFOLD_FLAG), "reviewer.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      assert.ok(content.includes(STATUS_IN_PROGRESS), "reviewer.md missing --status in-progress");
+      expect(content.includes(STATUS_IN_PROGRESS), "reviewer.md missing --status in-progress").toBeTruthy();
     });
     test("--update flag present", () => {
-      assert.ok(content.includes(UPDATE_FLAG), "reviewer.md missing --update flag");
+      expect(content.includes(UPDATE_FLAG), "reviewer.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-review-result command", () => {
-      assert.ok(content.includes("write-review-result"), "reviewer.md missing write-review-result");
+      expect(content.includes("write-review-result"), "reviewer.md missing write-review-result").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "reviewer.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "reviewer.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("DEC-019 reference", () => {
-      assert.ok(content.includes(DEC_019), "reviewer.md missing DEC-019 reference");
+      expect(content.includes(DEC_019), "reviewer.md missing DEC-019 reference").toBeTruthy();
     });
   });
 
   describe("reviewer-lite (single-stub — validation stripped in v0.41.x rename)", () => {
     const content = readAgent("reviewer-lite");
     test("--scaffold flag present", () => {
-      assert.ok(content.includes(SCAFFOLD_FLAG), "reviewer-lite.md missing --scaffold flag");
+      expect(content.includes(SCAFFOLD_FLAG), "reviewer-lite.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      assert.ok(
-        content.includes(STATUS_IN_PROGRESS),
-        "reviewer-lite.md missing --status in-progress"
-      );
+      expect(content.includes(STATUS_IN_PROGRESS), "reviewer-lite.md missing --status in-progress").toBeTruthy();
     });
     test("--update flag present", () => {
-      assert.ok(content.includes(UPDATE_FLAG), "reviewer-lite.md missing --update flag");
+      expect(content.includes(UPDATE_FLAG), "reviewer-lite.md missing --update flag").toBeTruthy();
     });
     test("write-review-result present", () => {
-      assert.ok(
-        content.includes("write-review-result"),
-        "reviewer-lite.md missing write-review-result"
-      );
+      expect(content.includes("write-review-result"), "reviewer-lite.md missing write-review-result").toBeTruthy();
     });
     test("write-validation-result absent (validation moved to hook + ship)", () => {
-      assert.ok(
-        !content.includes("write-validation-result"),
-        "reviewer-lite.md must NOT call write-validation-result"
-      );
+      expect(!content.includes("write-validation-result"), "reviewer-lite.md must NOT call write-validation-result").toBeTruthy();
     });
   });
 
   describe("verifier", () => {
     const content = readAgent("verifier");
     test("stub heading present", () => {
-      assert.ok(content.includes(STUB_HEADING), "verifier.md missing stub artifact heading");
+      expect(content.includes(STUB_HEADING), "verifier.md missing stub artifact heading").toBeTruthy();
     });
     test("--scaffold flag present", () => {
-      assert.ok(content.includes(SCAFFOLD_FLAG), "verifier.md missing --scaffold flag");
+      expect(content.includes(SCAFFOLD_FLAG), "verifier.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      assert.ok(content.includes(STATUS_IN_PROGRESS), "verifier.md missing --status in-progress");
+      expect(content.includes(STATUS_IN_PROGRESS), "verifier.md missing --status in-progress").toBeTruthy();
     });
     test("--update flag present", () => {
-      assert.ok(content.includes(UPDATE_FLAG), "verifier.md missing --update flag");
+      expect(content.includes(UPDATE_FLAG), "verifier.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-validation-result command", () => {
-      assert.ok(
-        content.includes("write-validation-result"),
-        "verifier.md missing write-validation-result"
-      );
+      expect(content.includes("write-validation-result"), "verifier.md missing write-validation-result").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "verifier.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "verifier.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("DEC-019 reference", () => {
-      assert.ok(content.includes(DEC_019), "verifier.md missing DEC-019 reference");
+      expect(content.includes(DEC_019), "verifier.md missing DEC-019 reference").toBeTruthy();
     });
   });
 
   describe("integrator", () => {
     const content = readAgent("integrator");
     test("stub heading present", () => {
-      assert.ok(content.includes(STUB_HEADING), "integrator.md missing stub artifact heading");
+      expect(content.includes(STUB_HEADING), "integrator.md missing stub artifact heading").toBeTruthy();
     });
     test("--scaffold flag present", () => {
-      assert.ok(content.includes(SCAFFOLD_FLAG), "integrator.md missing --scaffold flag");
+      expect(content.includes(SCAFFOLD_FLAG), "integrator.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      assert.ok(content.includes(STATUS_IN_PROGRESS), "integrator.md missing --status in-progress");
+      expect(content.includes(STATUS_IN_PROGRESS), "integrator.md missing --status in-progress").toBeTruthy();
     });
     test("--update flag present", () => {
-      assert.ok(content.includes(UPDATE_FLAG), "integrator.md missing --update flag");
+      expect(content.includes(UPDATE_FLAG), "integrator.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-handoff command", () => {
-      assert.ok(content.includes("write-handoff"), "integrator.md missing write-handoff");
+      expect(content.includes("write-handoff"), "integrator.md missing write-handoff").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "integrator.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "integrator.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("DEC-019 reference", () => {
-      assert.ok(content.includes(DEC_019), "integrator.md missing DEC-019 reference");
+      expect(content.includes(DEC_019), "integrator.md missing DEC-019 reference").toBeTruthy();
     });
   });
 
   describe("release-engineer", () => {
     const content = readAgent("release-engineer");
     test("stub heading present", () => {
-      assert.ok(
-        content.includes(STUB_HEADING),
-        "release-engineer.md missing stub artifact heading"
-      );
+      expect(content.includes(STUB_HEADING), "release-engineer.md missing stub artifact heading").toBeTruthy();
     });
     test("--scaffold flag present", () => {
-      assert.ok(content.includes(SCAFFOLD_FLAG), "release-engineer.md missing --scaffold flag");
+      expect(content.includes(SCAFFOLD_FLAG), "release-engineer.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      assert.ok(
-        content.includes(STATUS_IN_PROGRESS),
-        "release-engineer.md missing --status in-progress"
-      );
+      expect(content.includes(STATUS_IN_PROGRESS), "release-engineer.md missing --status in-progress").toBeTruthy();
     });
     test("--update flag present", () => {
-      assert.ok(content.includes(UPDATE_FLAG), "release-engineer.md missing --update flag");
+      expect(content.includes(UPDATE_FLAG), "release-engineer.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-deployment-check command", () => {
-      assert.ok(
-        content.includes("write-deployment-check"),
-        "release-engineer.md missing write-deployment-check"
-      );
+      expect(content.includes("write-deployment-check"), "release-engineer.md missing write-deployment-check").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "release-engineer.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "release-engineer.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("DEC-019 reference", () => {
-      assert.ok(content.includes(DEC_019), "release-engineer.md missing DEC-019 reference");
+      expect(content.includes(DEC_019), "release-engineer.md missing DEC-019 reference").toBeTruthy();
     });
   });
 
   describe("refactor", () => {
     const content = readAgent("refactor");
     test("stub heading present", () => {
-      assert.ok(content.includes(STUB_HEADING), "refactor.md missing stub artifact heading");
+      expect(content.includes(STUB_HEADING), "refactor.md missing stub artifact heading").toBeTruthy();
     });
     test("--scaffold flag present", () => {
-      assert.ok(content.includes(SCAFFOLD_FLAG), "refactor.md missing --scaffold flag");
+      expect(content.includes(SCAFFOLD_FLAG), "refactor.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      assert.ok(content.includes(STATUS_IN_PROGRESS), "refactor.md missing --status in-progress");
+      expect(content.includes(STATUS_IN_PROGRESS), "refactor.md missing --status in-progress").toBeTruthy();
     });
     test("--update flag present", () => {
-      assert.ok(content.includes(UPDATE_FLAG), "refactor.md missing --update flag");
+      expect(content.includes(UPDATE_FLAG), "refactor.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-handoff command", () => {
-      assert.ok(content.includes("write-handoff"), "refactor.md missing write-handoff");
+      expect(content.includes("write-handoff"), "refactor.md missing write-handoff").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      assert.ok(content.includes(FEAT_161_CITE), "refactor.md missing FEAT-161 cite-back");
+      expect(content.includes(FEAT_161_CITE), "refactor.md missing FEAT-161 cite-back").toBeTruthy();
     });
     test("DEC-019 reference", () => {
-      assert.ok(content.includes(DEC_019), "refactor.md missing DEC-019 reference");
+      expect(content.includes(DEC_019), "refactor.md missing DEC-019 reference").toBeTruthy();
     });
   });
 });
@@ -1151,36 +865,24 @@ describe("## Structural deviation rule — extracted to builder-ceremony skill i
   const skill = readFileSync(skillPath, "utf8");
 
   test("structural deviation heading present in skill", () => {
-    assert.ok(
-      skill.includes(STRUCTURAL_DEVIATION_HEADING),
-      `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_HEADING}" heading`
-    );
+    expect(skill.includes(STRUCTURAL_DEVIATION_HEADING), `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_HEADING}" heading`).toBeTruthy();
   });
 
   test("structural-deviation return instruction present in skill (BLOCKED form)", () => {
     const usesBlockedFollowUp =
       skill.includes("BLOCKED: structural-deviation") ||
       skill.includes("BLOCKED: structural deviation");
-    assert.ok(
-      usesBlockedFollowUp,
-      `builder-ceremony/SKILL.md missing structural-deviation return instruction (BLOCKED follow-up form)`
-    );
+    expect(usesBlockedFollowUp, `builder-ceremony/SKILL.md missing structural-deviation return instruction (BLOCKED follow-up form)`).toBeTruthy();
   });
 
   test("structural-deviation: risks-field prefix present in skill", () => {
-    assert.ok(
-      skill.includes(STRUCTURAL_DEVIATION_PREFIX),
-      `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_PREFIX}" risks-field prefix convention`
-    );
+    expect(skill.includes(STRUCTURAL_DEVIATION_PREFIX), `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_PREFIX}" risks-field prefix convention`).toBeTruthy();
   });
 
   test("anti-silent-workaround warning present in skill", () => {
     const hasWarning =
       skill.includes(ANTI_SILENT_WORKAROUND_A) || skill.includes(ANTI_SILENT_WORKAROUND_B);
-    assert.ok(
-      hasWarning,
-      `builder-ceremony/SKILL.md missing anti-silent-workaround warning ("silently drop" or "silent workaround")`
-    );
+    expect(hasWarning, `builder-ceremony/SKILL.md missing anti-silent-workaround warning ("silently drop" or "silent workaround")`).toBeTruthy();
   });
 
   // Per-agent assertion: each builder must reference the ceremony skill (so the
@@ -1196,10 +898,7 @@ describe("## Structural deviation rule — extracted to builder-ceremony skill i
     describe(agentName, () => {
       const content = readAgent(agentName);
       test("references builder-ceremony skill", () => {
-        assert.ok(
-          content.includes("skills/workflow/builder-ceremony/"),
-          `${agentName}.md must reference skills/workflow/builder-ceremony/ for structural deviation rule`
-        );
+        expect(content.includes("skills/workflow/builder-ceremony/"), `${agentName}.md must reference skills/workflow/builder-ceremony/ for structural deviation rule`).toBeTruthy();
       });
     });
   }
@@ -1242,10 +941,7 @@ describe("No lead refs across active agents", () => {
       const content = readAgent(name);
       const body = content.replace(/^---[\s\S]*?---\n/, "");
       const matches = body.match(/\bthe lead\b|\bto the lead\b|\bby the lead\b|\bcrew:lead\b/gi);
-      assert.ok(
-        !matches || matches.length === 0,
-        `${name}.md must not reference removed 'lead' agent; found: ${matches?.join(", ")}`
-      );
+      expect(!matches || matches.length === 0, `${name}.md must not reference removed 'lead' agent; found: ${matches?.join(", ")}`).toBeTruthy();
     });
   }
 });
diff --git a/crew/tests/agent-registry.test.mts b/crew/tests/agent-registry.test.mts
index 35cb55ee..0301ae9b 100644
--- a/crew/tests/agent-registry.test.mts
+++ b/crew/tests/agent-registry.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/lib/agent-registry.ts (FEAT-160 partial — registry layer only,
  * lead.md slim deferred to a separate autonomous_safe=false slice).
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -36,16 +35,16 @@ test("loadAgentRegistry: parses capabilities frontmatter from each agent file",
       `---\ncapabilities:\n  role: [reviewer]\n  concerns: [security, refactor]\n  lens: [correctness, regressions]\n  priority: 8\n---\n# reviewer\n`
     );
     const reg = await loadAgentRegistry(repo);
-    assert.equal(reg.length, 2, "should load 2 agents");
+    expect(reg.length, "should load 2 agents").toBe(2);
     const be = reg.find((e) => e.name === "backend-dev");
-    assert.ok(be);
-    assert.deepEqual(be.capabilities.role, ["implementer"]);
-    assert.deepEqual(be.capabilities.surfaces, ["api", "schema"]);
-    assert.deepEqual(be.capabilities.stacks, ["typescript", "python"]);
-    assert.equal(be.priority, 10);
+    expect(be).toBeTruthy();
+    expect(be.capabilities.role).toEqual(["implementer"]);
+    expect(be.capabilities.surfaces).toEqual(["api", "schema"]);
+    expect(be.capabilities.stacks).toEqual(["typescript", "python"]);
+    expect(be.priority).toBe(10);
     const ins = reg.find((e) => e.name === "reviewer");
-    assert.ok(ins);
-    assert.deepEqual(ins.capabilities.concerns, ["security", "refactor"]);
+    expect(ins).toBeTruthy();
+    expect(ins.capabilities.concerns).toEqual(["security", "refactor"]);
   } finally {
     await cleanup();
   }
@@ -63,8 +62,8 @@ test("loadAgentRegistry: skips files without capabilities frontmatter", async ()
       `---\ncapabilities:\n  role: [implementer]\n---\n# has-caps\n`
     );
     const reg = await loadAgentRegistry(repo);
-    assert.equal(reg.length, 1, "only agent with capabilities is loaded");
-    assert.equal(reg[0]?.name, "has-caps");
+    expect(reg.length, "only agent with capabilities is loaded").toBe(1);
+    expect(reg[0]?.name).toBe("has-caps");
   } finally {
     await cleanup();
   }
@@ -82,10 +81,10 @@ test("loadAgentRegistry: walks nested directories (e.g. 3rdparty/)", async () =>
       `---\ncapabilities:\n  role: [reviewer]\n---\n`
     );
     const reg = await loadAgentRegistry(repo);
-    assert.equal(reg.length, 2);
+    expect(reg.length).toBe(2);
     const nested = reg.find((e) => e.name === "nested");
-    assert.ok(nested);
-    assert.ok(nested.path.includes("3rdparty"), "path should preserve nested dir");
+    expect(nested).toBeTruthy();
+    expect(nested.path.includes("3rdparty"), "path should preserve nested dir").toBeTruthy();
   } finally {
     await cleanup();
   }
@@ -108,10 +107,10 @@ test("routeByTags: single-dimension query returns matches sorted by score desc",
     );
     const reg = await loadAgentRegistry(repo);
     const matches = routeByTags(reg, { role: "implementer" });
-    assert.equal(matches.length, 2, "only 2 implementers");
-    assert.equal(matches[0]?.entry.name, "a", "priority 10 ranks above priority 5");
-    assert.equal(matches[1]?.entry.name, "b");
-    assert.ok(matches[0]?.matched.includes("role:implementer"));
+    expect(matches.length, "only 2 implementers").toBe(2);
+    expect(matches[0]?.entry.name, "priority 10 ranks above priority 5").toBe("a");
+    expect(matches[1]?.entry.name).toBe("b");
+    expect(matches[0]?.matched.includes("role:implementer")).toBeTruthy();
   } finally {
     await cleanup();
   }
@@ -130,9 +129,9 @@ test("routeByTags: multi-dimension query requires ALL filters match", async () =
     );
     const reg = await loadAgentRegistry(repo);
     const matches = routeByTags(reg, { role: "implementer", stack: "typescript" });
-    assert.equal(matches.length, 1);
-    assert.equal(matches[0]?.entry.name, "fullstack-ts");
-    assert.equal(matches[0]?.matched.length, 2, "both dimensions matched");
+    expect(matches.length).toBe(1);
+    expect(matches[0]?.entry.name).toBe("fullstack-ts");
+    expect(matches[0]?.matched.length, "both dimensions matched").toBe(2);
   } finally {
     await cleanup();
   }
@@ -147,7 +146,7 @@ test("routeByTags: empty query returns empty list (no filters → no matches)",
     );
     const reg = await loadAgentRegistry(repo);
     const matches = routeByTags(reg, {});
-    assert.equal(matches.length, 1, "empty query returns all (no filter to reject)");
+    expect(matches.length, "empty query returns all (no filter to reject)").toBe(1);
   } finally {
     await cleanup();
   }
@@ -170,8 +169,8 @@ test("routeByTags: ranking uses matched-count * 10 + priority", async () => {
     // high-prio with 1 match  = 1*10+99 = 109 — but only if it matched; it didn't
     // because high-prio doesn't have stacks. So only low-prio matches.
     // Adjust: filter requires BOTH match. high-prio fails stack filter → not in result.
-    assert.equal(matches.length, 1, "only low-prio matches BOTH filters");
-    assert.equal(matches[0]?.entry.name, "low-prio-2-match");
+    expect(matches.length, "only low-prio matches BOTH filters").toBe(1);
+    expect(matches[0]?.entry.name).toBe("low-prio-2-match");
   } finally {
     await cleanup();
   }
diff --git a/crew/tests/agent-stats-aggregator.test.mts b/crew/tests/agent-stats-aggregator.test.mts
index e5ec719a..c8f7e55c 100644
--- a/crew/tests/agent-stats-aggregator.test.mts
+++ b/crew/tests/agent-stats-aggregator.test.mts
@@ -1,6 +1,6 @@
 /**
  * Tests for scripts/lib/agent-stats-aggregator.ts (FEAT-159 SLICE-84).
- * Uses node:test + node:assert/strict (bun-runnable).
+ * Uses bun:test (bun-runnable).
  *
  * Fixtures: tests/fixtures/agent-stats/
  *   dispatch-timing-seed.jsonl  — 3 agents × 5 slices
@@ -14,8 +14,7 @@
  * AC-T6: empty window → returns [] + writes artifact with rows: [].
  * AC-T7: --agent filter returns only that agent.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -77,35 +76,35 @@ test("AC-T1: 3 agents × 5 dispatches each, window last_5_slices", async () => {
   });
 
   // 3 distinct agents.
-  assert.equal(rows.length, 3, "should return 3 agents");
+  expect(rows.length, "should return 3 agents").toBe(3);
 
   const builder = rows.find((r) => r.agent === "crew:builder");
   const reviewer = rows.find((r) => r.agent === "crew:reviewer");
   const verifier = rows.find((r) => r.agent === "crew:verifier");
-  assert.ok(builder, "builder row must be present");
-  assert.ok(reviewer, "reviewer row must be present");
-  assert.ok(verifier, "verifier row must be present");
+  expect(builder, "builder row must be present").toBeTruthy();
+  expect(reviewer, "reviewer row must be present").toBeTruthy();
+  expect(verifier, "verifier row must be present").toBeTruthy();
 
   // sample_count: 5 dispatches per agent across 5 slices.
-  assert.equal(builder.sample_count, 5, "builder sample_count == 5");
-  assert.equal(reviewer.sample_count, 5);
-  assert.equal(verifier.sample_count, 5);
+  expect(builder.sample_count, "builder sample_count == 5").toBe(5);
+  expect(reviewer.sample_count).toBe(5);
+  expect(verifier.sample_count).toBe(5);
 
   // mean_wall_ms: builder = (40000+55000+35000+60000+48000)/5 = 47600
-  assert.equal(builder.mean_wall_ms, 47600, "builder mean_wall_ms");
+  expect(builder.mean_wall_ms, "builder mean_wall_ms").toBe(47600);
 
   // mean_tokens: builder tokenIn+tokenOut per dispatch = 38k,50k,32k,57k,44k
   // → (38000+50000+32000+57000+44000)/5 = 221000/5 = 44200
-  assert.equal(builder.mean_tokens, 44200, "builder mean_tokens");
+  expect(builder.mean_tokens, "builder mean_tokens").toBe(44200);
 
   // pass_rate: all 5 slices have avg score ≥ 0.7 except none here (all > 0.7)
   // SLICE-S04 avg ~ 0.671 < 0.7 → 4/5 pass
-  assert.equal(builder.pass_rate, 0.8, "builder pass_rate = 4/5 slices passing");
+  expect(builder.pass_rate, "builder pass_rate = 4/5 slices passing").toBe(0.8);
 
   // No rework/fail without review/validation artifacts present.
-  assert.equal(builder.review_rework_rate, 0, "builder review_rework_rate == 0 (no artifacts)");
-  assert.equal(builder.validation_fail_rate, 0, "builder validation_fail_rate == 0 (no artifacts)");
-  assert.equal(builder.window, "last_n_slices_5");
+  expect(builder.review_rework_rate, "builder review_rework_rate == 0 (no artifacts)").toBe(0);
+  expect(builder.validation_fail_rate, "builder validation_fail_rate == 0 (no artifacts)").toBe(0);
+  expect(builder.window).toBe("last_n_slices_5");
 
   await fs.rm(repo, { recursive: true, force: true });
 });
@@ -123,15 +122,15 @@ test("AC-T2: window last_2_slices narrows result to most-recent 2 slices", async
   });
 
   // Most-recent 2 grades: SLICE-S05 (2026-06-05) and SLICE-S04 (2026-06-04).
-  assert.equal(rows.length, 3, "still 3 agents but only 2-slice window");
+  expect(rows.length, "still 3 agents but only 2-slice window").toBe(3);
   const builder = rows.find((r) => r.agent === "crew:builder");
-  assert.ok(builder);
+  expect(builder).toBeTruthy();
   // 2 dispatches in the window (one per slice).
-  assert.equal(builder.sample_count, 2, "builder sample_count == 2 in last_2_slices window");
-  assert.equal(builder.window, "last_n_slices_2");
+  expect(builder.sample_count, "builder sample_count == 2 in last_2_slices window").toBe(2);
+  expect(builder.window).toBe("last_n_slices_2");
 
   // mean_wall_ms: (60000 + 48000) / 2 = 54000 (S04 + S05)
-  assert.equal(builder.mean_wall_ms, 54000, "builder mean_wall_ms in 2-slice window");
+  expect(builder.mean_wall_ms, "builder mean_wall_ms in 2-slice window").toBe(54000);
 
   await fs.rm(repo, { recursive: true, force: true });
 });
@@ -166,15 +165,15 @@ Needs fix.
   });
 
   const builder = rows.find((r) => r.agent === "crew:builder");
-  assert.ok(builder);
+  expect(builder).toBeTruthy();
   // 1 of 5 builder slices had a needs_fix → 0.2
-  assert.equal(builder.review_rework_rate, 0.2, "builder rework_rate = 1/5");
+  expect(builder.review_rework_rate, "builder rework_rate = 1/5").toBe(0.2);
 
   // reviewer and verifier are on the same slices but rework_rate tracks
   // the slice-level needs_fix (all agents who worked on SLICE-S02 share the flag).
   const reviewer = rows.find((r) => r.agent === "crew:reviewer");
-  assert.ok(reviewer);
-  assert.equal(reviewer.review_rework_rate, 0.2, "reviewer rework_rate = 1/5");
+  expect(reviewer).toBeTruthy();
+  expect(reviewer.review_rework_rate, "reviewer rework_rate = 1/5").toBe(0.2);
 
   await fs.rm(repo, { recursive: true, force: true });
 });
@@ -209,9 +208,9 @@ slice: SLICE-S03
   });
 
   const builder = rows.find((r) => r.agent === "crew:builder");
-  assert.ok(builder);
+  expect(builder).toBeTruthy();
   // 1 of 5 slices failed validation → 0.2
-  assert.equal(builder.validation_fail_rate, 0.2, "builder validation_fail_rate = 1/5");
+  expect(builder.validation_fail_rate, "builder validation_fail_rate = 1/5").toBe(0.2);
 
   await fs.rm(repo, { recursive: true, force: true });
 });
@@ -274,9 +273,9 @@ test("AC-T5: median_dispatches_to_pass with extra fix dispatches", async () => {
   });
 
   const builder = rows.find((r) => r.agent === "crew:builder");
-  assert.ok(builder, "builder row exists");
+  expect(builder, "builder row exists").toBeTruthy();
   // Per-slice dispatches: SLICE-S04=1, SLICE-S05=3 → median([1,3])=2
-  assert.equal(builder.median_dispatches_to_pass, 2, "median of [1,3] = 2");
+  expect(builder.median_dispatches_to_pass, "median of [1,3] = 2").toBe(2);
 
   await fs.rm(repo, { recursive: true, force: true });
 });
@@ -295,15 +294,15 @@ test("AC-T6: empty window returns empty array and writes artifact with rows: []"
     grades: [] // empty — no window
   });
 
-  assert.deepEqual(rows, [], "empty window returns empty array");
+  expect(rows, "empty window returns empty array").toEqual([]);
 
   const artifactPath = await writeAgentStatsArtifact(repo, rows, window);
   const raw = await fs.readFile(artifactPath, "utf-8");
   const parsed = JSON.parse(raw);
-  assert.deepEqual(parsed.rows, [], "artifact rows field is empty array");
-  assert.ok(parsed.generated_at, "artifact has generated_at");
-  assert.equal(parsed.window.kind, "last_n_slices");
-  assert.equal(parsed.window.n, 5);
+  expect(parsed.rows, "artifact rows field is empty array").toEqual([]);
+  expect(parsed.generated_at, "artifact has generated_at").toBeTruthy();
+  expect(parsed.window.kind).toBe("last_n_slices");
+  expect(parsed.window.n).toBe(5);
 
   await fs.rm(repo, { recursive: true, force: true });
 });
@@ -321,9 +320,9 @@ test("AC-T7: agent filter returns only the specified agent", async () => {
     grades: SEED_GRADES
   });
 
-  assert.equal(rows.length, 1, "only 1 agent returned");
-  assert.equal(rows[0]?.agent, "crew:builder", "returned agent is crew:builder");
-  assert.equal(rows[0]?.sample_count, 5);
+  expect(rows.length, "only 1 agent returned").toBe(1);
+  expect(rows[0]?.agent, "returned agent is crew:builder").toBe("crew:builder");
+  expect(rows[0]?.sample_count).toBe(5);
 
   await fs.rm(repo, { recursive: true, force: true });
 });
diff --git a/crew/tests/agent-topology.test.mts b/crew/tests/agent-topology.test.mts
index 5b73cdb6..021aafd3 100644
--- a/crew/tests/agent-topology.test.mts
+++ b/crew/tests/agent-topology.test.mts
@@ -1,8 +1,7 @@
 // tests/agent-topology.test.mjs — pin the exact set of first-party agents.
 // Fails if an agent is added without updating EXPECTED_AGENTS,
 // or if any expected agent is removed or renamed.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -63,26 +62,16 @@ test("agents/ root contains exactly the expected first-party agents", async () =
 
   // Every expected agent must exist
   for (const expected of EXPECTED_AGENTS) {
-    assert.ok(
-      foundSet.has(expected),
-      `Expected agent "${expected}" is missing from agents/ root. Add it or update EXPECTED_AGENTS.`
-    );
+    expect(foundSet.has(expected), `Expected agent "${expected}" is missing from agents/ root. Add it or update EXPECTED_AGENTS.`).toBeTruthy();
   }
 
   // No unexpected agents allowed
   for (const found of foundSet) {
-    assert.ok(
-      EXPECTED_AGENTS.has(found),
-      `Unexpected agent "${found}" found in agents/ root. Add it to EXPECTED_AGENTS if intentional.`
-    );
+    expect(EXPECTED_AGENTS.has(found), `Unexpected agent "${found}" found in agents/ root. Add it to EXPECTED_AGENTS if intentional.`).toBeTruthy();
   }
 
   // Exact count
-  assert.equal(
-    names.length,
-    EXPECTED_AGENTS.size,
-    `Expected ${EXPECTED_AGENTS.size} agents, found ${names.length}: [${names.join(", ")}]`
-  );
+  expect(names.length, `Expected ${EXPECTED_AGENTS.size} agents, found ${names.length}: [${names.join(", ")}]`).toBe(EXPECTED_AGENTS.size);
 });
 
 test("no .md files at agents/ root belong to 3rdparty/ subdirectory", async () => {
@@ -96,11 +85,8 @@ test("no .md files at agents/ root belong to 3rdparty/ subdirectory", async () =
   for (const name of rootMdFiles) {
     const agentName = await readAgentName(path.join(AGENTS_ROOT, `${name}.md`));
     if (agentName) {
-      assert.ok(
-        EXPECTED_AGENTS.has(agentName),
-        `Root-level agent "${agentName}" is not in the expected topology. ` +
-          "3rdparty agents must live under agents/3rdparty/, not agents/ root."
-      );
+      expect(EXPECTED_AGENTS.has(agentName), `Root-level agent "${agentName}" is not in the expected topology. ` +
+          "3rdparty agents must live under agents/3rdparty/, not agents/ root.").toBeTruthy();
     }
   }
 });
diff --git a/crew/tests/apply-model-profile.test.mts b/crew/tests/apply-model-profile.test.mts
index 14429a53..df6f48c3 100644
--- a/crew/tests/apply-model-profile.test.mts
+++ b/crew/tests/apply-model-profile.test.mts
@@ -1,6 +1,5 @@
 // tests/apply-model-profile.test.ts — FEAT-crew-architecture-review Section 7, Decision 4
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -44,8 +43,8 @@ You are the fake-agent.
 test("loadModelsConfig parses a well-formed models.yaml", async () => {
   const { modelsYamlPath } = await makeFixture();
   const config = await loadModelsConfig(modelsYamlPath);
-  assert.equal(config.default_profile, "claude");
-  assert.equal(Object.keys(config.profiles).length, 2);
+  expect(config.default_profile).toBe("claude");
+  expect(Object.keys(config.profiles).length).toBe(2);
 });
 
 test("loadModelsConfig rejects malformed yaml (missing tier)", async () => {
@@ -56,13 +55,13 @@ test("loadModelsConfig rejects malformed yaml (missing tier)", async () => {
     'version: "1.0.0"\ndefault_profile: claude\nprofiles:\n  claude:\n    reasoning: opus\n    standard: sonnet\n',
     "utf8"
   );
-  await assert.rejects(() => loadModelsConfig(modelsYamlPath));
+  await expect(loadModelsConfig(modelsYamlPath)).rejects.toThrow();
 });
 
 test("resolveProfile returns the named profile", async () => {
   const { modelsYamlPath } = await makeFixture();
   const config = await loadModelsConfig(modelsYamlPath);
-  assert.deepEqual(resolveProfile(config, "claude"), {
+  expect(resolveProfile(config, "claude")).toEqual({
     reasoning: "opus",
     standard: "sonnet",
     light: "haiku"
@@ -72,23 +71,23 @@ test("resolveProfile returns the named profile", async () => {
 test("resolveProfile throws on an unknown profile name", async () => {
   const { modelsYamlPath } = await makeFixture();
   const config = await loadModelsConfig(modelsYamlPath);
-  assert.throws(() => resolveProfile(config, "nonexistent"));
+  expect(() => resolveProfile(config, "nonexistent")).toThrow();
 });
 
 test("tierForModel reverse-maps a concrete model to its tier", async () => {
   const { modelsYamlPath } = await makeFixture();
   const config = await loadModelsConfig(modelsYamlPath);
   const claudeProfile = resolveProfile(config, "claude");
-  assert.equal(tierForModel(claudeProfile, "sonnet"), "standard");
-  assert.equal(tierForModel(claudeProfile, "opus"), "reasoning");
-  assert.equal(tierForModel(claudeProfile, "haiku"), "light");
+  expect(tierForModel(claudeProfile, "sonnet")).toBe("standard");
+  expect(tierForModel(claudeProfile, "opus")).toBe("reasoning");
+  expect(tierForModel(claudeProfile, "haiku")).toBe("light");
 });
 
 test("tierForModel returns null for an unrecognized model value", async () => {
   const { modelsYamlPath } = await makeFixture();
   const config = await loadModelsConfig(modelsYamlPath);
   const claudeProfile = resolveProfile(config, "claude");
-  assert.equal(tierForModel(claudeProfile, "gpt-4"), null);
+  expect(tierForModel(claudeProfile, "gpt-4")).toBe(null);
 });
 
 test("applyModelProfile is a no-op when target profile equals source (dry-run)", async () => {
@@ -100,8 +99,8 @@ test("applyModelProfile is a no-op when target profile equals source (dry-run)",
     agentsDir,
     dryRun: true
   });
-  assert.equal(result.changes.length, 0);
-  assert.equal(result.skipped.length, 0);
+  expect(result.changes.length).toBe(0);
+  expect(result.skipped.length).toBe(0);
 });
 
 test("applyModelProfile computes changes per-tier without writing in dry-run mode", async () => {
@@ -117,15 +116,15 @@ test("applyModelProfile computes changes per-tier without writing in dry-run mod
     dryRun: true
   });
 
-  assert.equal(result.changes.length, 3);
+  expect(result.changes.length).toBe(3);
   const byTier = Object.fromEntries(result.changes.map((c) => [c.tier, c.toModel]));
-  assert.equal(byTier["reasoning"], "reasoning-model");
-  assert.equal(byTier["standard"], "standard-model");
-  assert.equal(byTier["light"], "light-model");
+  expect(byTier["reasoning"]).toBe("reasoning-model");
+  expect(byTier["standard"]).toBe("standard-model");
+  expect(byTier["light"]).toBe("light-model");
 
   // dry-run must not have written anything
   const stillOriginal = await fs.readFile(path.join(agentsDir, "standard-agent.md"), "utf8");
-  assert.match(stillOriginal, /model: sonnet/);
+  expect(stillOriginal).toMatch(/model: sonnet/);
 });
 
 test("applyModelProfile writes the new model when dryRun is false", async () => {
@@ -135,8 +134,8 @@ test("applyModelProfile writes the new model when dryRun is false", async () =>
   await applyModelProfile({ profileName: "other", modelsYamlPath, agentsDir, dryRun: false });
 
   const updated = await fs.readFile(path.join(agentsDir, "standard-agent.md"), "utf8");
-  assert.match(updated, /model: standard-model/);
-  assert.doesNotMatch(updated, /model: sonnet/);
+  expect(updated).toMatch(/model: standard-model/);
+  expect(updated).not.toMatch(/model: sonnet/);
 });
 
 test("applyModelProfile skips an agent whose model doesn't map to a known tier", async () => {
@@ -150,14 +149,14 @@ test("applyModelProfile skips an agent whose model doesn't map to a known tier",
     dryRun: true
   });
 
-  assert.equal(result.changes.length, 0);
-  assert.equal(result.skipped.length, 1);
-  assert.match(result.skipped[0]?.reason ?? "", /not a recognized/);
+  expect(result.changes.length).toBe(0);
+  expect(result.skipped.length).toBe(1);
+  expect(result.skipped[0]?.reason ?? "").toMatch(/not a recognized/);
 });
 
 test("applyModelProfile throws for an unknown --profile name", async () => {
   const { modelsYamlPath, agentsDir } = await makeFixture();
-  await assert.rejects(() =>
+  await expect(
     applyModelProfile({ profileName: "nonexistent", modelsYamlPath, agentsDir, dryRun: true })
-  );
+  ).rejects.toThrow();
 });
diff --git a/crew/tests/architect-feature.test.mts b/crew/tests/architect-feature.test.mts
index c13f4b08..5fbd4e04 100644
--- a/crew/tests/architect-feature.test.mts
+++ b/crew/tests/architect-feature.test.mts
@@ -1,6 +1,5 @@
 // tests/architect-feature.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -9,68 +8,52 @@ const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
 const CMD = path.join(repoRoot, "commands", "architect-feature.md");
 
 test("commands/architect-feature.md exists", async () => {
-  await assert.doesNotReject(fs.access(CMD), "command file must exist");
+  await expect(fs.access(CMD)).resolves.toBeFalsy();
 });
 
 test("architect-feature has description frontmatter", async () => {
   const text = await fs.readFile(CMD, "utf8");
   const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
-  assert.ok(match, "file must start with YAML frontmatter");
-  assert.match(match[1]!, /^description:\s*.+/m, "frontmatter must have non-empty description:");
+  expect(match, "file must start with YAML frontmatter").toBeTruthy();
+  expect(match[1]!, "frontmatter must have non-empty description:").toMatch(/^description:\s*.+/m);
 });
 
 test("architect-feature references crew:researcher in Phase 1", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(text, /crew:researcher/, "command must dispatch crew:researcher");
+  expect(text, "command must dispatch crew:researcher").toMatch(/crew:researcher/);
 });
 
 test("architect-feature references crew:architect in Phase 2", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(text, /crew:architect/, "command must dispatch crew:architect");
+  expect(text, "command must dispatch crew:architect").toMatch(/crew:architect/);
 });
 
 test("architect-feature documents ## Inferred Tags section requirement", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(text, /Inferred Tags/, "command must reference ## Inferred Tags");
+  expect(text, "command must reference ## Inferred Tags").toMatch(/Inferred Tags/);
 });
 
 test("architect-feature documents tag write-back as additive", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(
-    text,
-    /additive|never remove|net.new/i,
-    "command must document that tag write-back never removes existing tags"
-  );
+  expect(text, "command must document that tag write-back never removes existing tags").toMatch(/additive|never remove|net.new/i);
 });
 
 test("architect-feature documents --auto-start flag", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(text, /--auto-start/, "command must document --auto-start flag");
+  expect(text, "command must document --auto-start flag").toMatch(/--auto-start/);
 });
 
 test("architect-feature documents FEAT-not-found error handling", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(
-    text,
-    /not found|paths tried|halt/i,
-    "command must document FEAT-not-found error case"
-  );
+  expect(text, "command must document FEAT-not-found error case").toMatch(/not found|paths tried|halt/i);
 });
 
 test("architect-feature documents re-run idempotency (Feature Revision prefix)", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(
-    text,
-    /Feature Revision/,
-    "command must use 'Feature Revision' prefix to distinguish re-run sections from orchestrate-slice Revision sections"
-  );
+  expect(text, "command must use 'Feature Revision' prefix to distinguish re-run sections from orchestrate-slice Revision sections").toMatch(/Feature Revision/);
 });
 
 test("architect-feature documents --auto-start clean exit when no pending slice", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  assert.match(
-    text,
-    /exit 0/,
-    "command must document exit 0 when no pending slice found under --auto-start"
-  );
+  expect(text, "command must document exit 0 when no pending slice found under --auto-start").toMatch(/exit 0/);
 });
diff --git a/crew/tests/artifact-cache.test.mts b/crew/tests/artifact-cache.test.mts
index 79df5c07..079db55a 100644
--- a/crew/tests/artifact-cache.test.mts
+++ b/crew/tests/artifact-cache.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -19,10 +18,10 @@ test("getCachedArtifact: returns parsed frontmatter and body", async () => {
   );
   try {
     const result = await getCachedArtifact(filePath);
-    assert.equal(result.fm.id, "SLICE-1");
-    assert.equal(result.fm.title, "Test");
-    assert.ok(result.body.includes("# Heading"));
-    assert.ok(typeof result.mtimeMs === "number");
+    expect(result.fm.id).toBe("SLICE-1");
+    expect(result.fm.title).toBe("Test");
+    expect(result.body.includes("# Heading")).toBeTruthy();
+    expect(typeof result.mtimeMs === "number").toBeTruthy();
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -36,7 +35,7 @@ test("getCachedArtifact: second call returns cached result without re-reading",
     const first = await getCachedArtifact(filePath);
     const second = await getCachedArtifact(filePath);
     // Same object reference means cache was hit
-    assert.strictEqual(first, second);
+    expect(first).toBe(second);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -46,26 +45,25 @@ test("getCachedArtifact: cache invalidated when file changes (mtime advances)",
   const { dir, filePath } = await writeTmp("---\nid: OLD\n---\nOld body");
   try {
     const first = await getCachedArtifact(filePath);
-    assert.equal(first.fm.id, "OLD");
+    expect(first.fm.id).toBe("OLD");
 
     // Write new content and force a new mtime by delaying slightly
     await new Promise((r) => setTimeout(r, 10));
     await fs.writeFile(filePath, "---\nid: NEW\n---\nNew body", "utf8");
 
     const second = await getCachedArtifact(filePath);
-    assert.equal(second.fm.id, "NEW");
-    assert.notStrictEqual(first, second);
+    expect(second.fm.id).toBe("NEW");
+    expect(first).not.toBe(second);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
 });
 
 test("getCachedArtifact: throws for missing file", async () => {
-  await assert.rejects(
-    () => getCachedArtifact("/nonexistent/path/missing.md"),
-    (err) => {
-      assert.equal((err as NodeJS.ErrnoException).code, "ENOENT");
-      return true;
-    }
-  );
+  try {
+    await getCachedArtifact("/nonexistent/path/missing.md");
+    throw new Error("expected getCachedArtifact to reject");
+  } catch (err) {
+    expect((err as NodeJS.ErrnoException).code).toBe("ENOENT");
+  }
 });
diff --git a/crew/tests/artifact-stub-and-update.test.mts b/crew/tests/artifact-stub-and-update.test.mts
index bf5f8e92..e763328d 100644
--- a/crew/tests/artifact-stub-and-update.test.mts
+++ b/crew/tests/artifact-stub-and-update.test.mts
@@ -1,8 +1,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
 import { execFile as execFileCallback } from "node:child_process";
@@ -14,7 +13,7 @@ const cliPath = path.join(repoRoot, "scripts", "crew.mts");
 
 async function makeTempRepo(prefix: string) {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", dir]);
+  await execFile("bun", [cliPath, "init", "--repo", dir]);
   return dir;
 }
 
@@ -24,7 +23,7 @@ async function cleanup(dir: string) {
 
 // Helper: invoke CLI synchronously and return { status, stdout, stderr }
 function runCli(args: string[]) {
-  const result = spawnSync(process.execPath, ["--experimental-strip-types", cliPath, ...args], {
+  const result = spawnSync(process.execPath, [cliPath, ...args], {
     encoding: "utf8",
     timeout: 30_000
   });
@@ -50,10 +49,10 @@ test("artifact status renders in output when --status is set", async () => {
       "--summary",
       "test status field"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /Status: in-progress/, "artifact must contain 'Status: in-progress'");
+    expect(body, "artifact must contain 'Status: in-progress'").toMatch(/Status: in-progress/);
   } finally {
     await cleanup(repoPath);
   }
@@ -72,13 +71,13 @@ test("artifact status omitted when --status is not set", async () => {
       "--summary",
       "no status field"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
     // Should not have "Status:" line (but may have other fields)
     const lines = body.split("\n");
     const statusLines = lines.filter((l) => l.startsWith("- Status:"));
-    assert.equal(statusLines.length, 0, "artifact should not contain '- Status:' when not set");
+    expect(statusLines.length, "artifact should not contain '- Status:' when not set").toBe(0);
   } finally {
     await cleanup(repoPath);
   }
@@ -100,13 +99,13 @@ test("write-handoff with --update overwrites stub in place, no second file creat
       "--summary",
       "initial stub"
     ]);
-    assert.equal(stubResult.status, 0);
+    expect(stubResult.status).toBe(0);
     const stubArtifact = JSON.parse(stubResult.stdout);
     const stubPath = stubArtifact.path;
 
     // Verify stub exists and contains in-progress
     let stubBody = await fs.readFile(stubPath, "utf8");
-    assert.match(stubBody, /Status: in-progress/, "stub should contain 'Status: in-progress'");
+    expect(stubBody, "stub should contain 'Status: in-progress'").toMatch(/Status: in-progress/);
 
     // List files before update
     const dirBefore = path.dirname(stubPath);
@@ -129,24 +128,20 @@ test("write-handoff with --update overwrites stub in place, no second file creat
       "--deliverable",
       "completed work"
     ]);
-    assert.equal(finalResult.status, 0);
+    expect(finalResult.status).toBe(0);
 
     // List files after update
     const filesAfter = await fs.readdir(dirBefore);
     const handoffCountAfter = filesAfter.filter((f) => f.includes("handoff")).length;
 
     // Verify only ONE handoff file exists (no second file created)
-    assert.equal(
-      handoffCountAfter,
-      handoffCountBefore,
-      "should not create a second file; update should overwrite"
-    );
+    expect(handoffCountAfter, "should not create a second file; update should overwrite").toBe(handoffCountBefore);
 
     // Verify the file was updated with new content
     stubBody = await fs.readFile(stubPath, "utf8");
-    assert.match(stubBody, /Status: completed/, "updated stub should contain 'Status: completed'");
-    assert.match(stubBody, /final artifact/, "updated stub should contain 'final artifact'");
-    assert.match(stubBody, /completed work/, "updated stub should contain 'completed work'");
+    expect(stubBody, "updated stub should contain 'Status: completed'").toMatch(/Status: completed/);
+    expect(stubBody, "updated stub should contain 'final artifact'").toMatch(/final artifact/);
+    expect(stubBody, "updated stub should contain 'completed work'").toMatch(/completed work/);
   } finally {
     await cleanup(repoPath);
   }
@@ -168,7 +163,7 @@ test("write-review-result with --update overwrites stub in place", async () => {
       "--summary",
       "initial review"
     ]);
-    assert.equal(stubResult.status, 0);
+    expect(stubResult.status).toBe(0);
     const stubArtifact = JSON.parse(stubResult.stdout);
     const stubPath = stubArtifact.path;
 
@@ -190,13 +185,13 @@ test("write-review-result with --update overwrites stub in place", async () => {
       "--test-summary",
       "all pass"
     ]);
-    assert.equal(finalResult.status, 0);
+    expect(finalResult.status).toBe(0);
 
     // Verify content
     const body = await fs.readFile(stubPath, "utf8");
-    assert.match(body, /Status: completed/, "should have updated status");
-    assert.match(body, /final review/, "should have updated summary");
-    assert.match(body, /Decision: approved/, "should have decision");
+    expect(body, "should have updated status").toMatch(/Status: completed/);
+    expect(body, "should have updated summary").toMatch(/final review/);
+    expect(body, "should have decision").toMatch(/Decision: approved/);
   } finally {
     await cleanup(repoPath);
   }
@@ -218,7 +213,7 @@ test("write-validation-result with --update overwrites stub in place", async ()
       "--summary",
       "initial validation"
     ]);
-    assert.equal(stubResult.status, 0);
+    expect(stubResult.status).toBe(0);
     const stubArtifact = JSON.parse(stubResult.stdout);
     const stubPath = stubArtifact.path;
 
@@ -240,13 +235,13 @@ test("write-validation-result with --update overwrites stub in place", async ()
       "--environment",
       "prod"
     ]);
-    assert.equal(finalResult.status, 0);
+    expect(finalResult.status).toBe(0);
 
     // Verify content
     const body = await fs.readFile(stubPath, "utf8");
-    assert.match(body, /Status: completed/, "should have updated status");
-    assert.match(body, /final validation/, "should have updated summary");
-    assert.match(body, /Decision: passed_with_notes/, "should have decision");
+    expect(body, "should have updated status").toMatch(/Status: completed/);
+    expect(body, "should have updated summary").toMatch(/final validation/);
+    expect(body, "should have decision").toMatch(/Decision: passed_with_notes/);
   } finally {
     await cleanup(repoPath);
   }
@@ -281,15 +276,11 @@ test("artifact write without --update creates new timestamped file (backward com
     const artifact2 = JSON.parse(result2.stdout);
 
     // Verify two different files exist
-    assert.notEqual(
-      artifact1.path,
-      artifact2.path,
-      "should create two separate files without --update"
-    );
+    expect(artifact1.path, "should create two separate files without --update").not.toBe(artifact2.path);
     const exists1 = await fs.stat(artifact1.path);
     const exists2 = await fs.stat(artifact2.path);
-    assert.ok(exists1, "first artifact should exist");
-    assert.ok(exists2, "second artifact should exist");
+    expect(exists1, "first artifact should exist").toBeTruthy();
+    expect(exists2, "second artifact should exist").toBeTruthy();
   } finally {
     await cleanup(repoPath);
   }
@@ -307,21 +298,21 @@ test("write-review-result --scaffold emits skeleton with empty judgment fields",
       "Scaffold test",
       "--scaffold"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /## Verdict/, "must have Verdict section");
-    assert.match(body, /decision:/, "must have decision field");
-    assert.match(body, /## Test Summary/, "must have Test Summary section");
-    assert.match(body, /## Changed Files/, "must have Changed Files section");
-    assert.match(body, /## Findings/, "must have Findings section");
+    expect(body, "must have Verdict section").toMatch(/## Verdict/);
+    expect(body, "must have decision field").toMatch(/decision:/);
+    expect(body, "must have Test Summary section").toMatch(/## Test Summary/);
+    expect(body, "must have Changed Files section").toMatch(/## Changed Files/);
+    expect(body, "must have Findings section").toMatch(/## Findings/);
     // dev-team#247 / FEAT-180: scaffold always prompts a Not-checked
     // declaration, unconditionally (scaffold mode never receives CLI flags,
     // so there's nothing to gate on) — locking the intended behavior so a
     // future diff to renderReviewResultScaffold can't drop it silently.
-    assert.match(body, /## Not checked/, "must have Not checked section");
-    assert.match(body, /## Risks/, "must have Risks section");
-    assert.match(body, /## Notes/, "must have Notes section");
+    expect(body, "must have Not checked section").toMatch(/## Not checked/);
+    expect(body, "must have Risks section").toMatch(/## Risks/);
+    expect(body, "must have Notes section").toMatch(/## Notes/);
   } finally {
     await cleanup(repoPath);
   }
@@ -339,16 +330,16 @@ test("write-validation-result --scaffold emits skeleton with empty judgment fiel
       "Scaffold validation",
       "--scaffold"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /## Environment/, "must have Environment section");
-    assert.match(body, /## Scenario/, "must have Scenario section");
-    assert.match(body, /## Gates/, "must have Gates section");
-    assert.match(body, /## Evidence/, "must have Evidence section");
-    assert.match(body, /## Findings/, "must have Findings section");
-    assert.match(body, /## Risks/, "must have Risks section");
-    assert.match(body, /## Decision/, "must have Decision section");
+    expect(body, "must have Environment section").toMatch(/## Environment/);
+    expect(body, "must have Scenario section").toMatch(/## Scenario/);
+    expect(body, "must have Gates section").toMatch(/## Gates/);
+    expect(body, "must have Evidence section").toMatch(/## Evidence/);
+    expect(body, "must have Findings section").toMatch(/## Findings/);
+    expect(body, "must have Risks section").toMatch(/## Risks/);
+    expect(body, "must have Decision section").toMatch(/## Decision/);
   } finally {
     await cleanup(repoPath);
   }
@@ -367,13 +358,13 @@ test("scaffold-then-update: scaffold review, then update with decision, finalize
       "Review scaffold-update",
       "--scaffold"
     ]);
-    assert.equal(scaffoldResult.status, 0);
+    expect(scaffoldResult.status).toBe(0);
     const scaffoldArtifact = JSON.parse(scaffoldResult.stdout);
     const scaffoldPath = scaffoldArtifact.path;
 
     // Verify scaffold has skeleton
     let body = await fs.readFile(scaffoldPath, "utf8");
-    assert.match(body, /decision:/, "scaffold must have empty decision field");
+    expect(body, "scaffold must have empty decision field").toMatch(/decision:/);
 
     // Second: finalize with --update
     const finalResult = runCli([
@@ -395,14 +386,14 @@ test("scaffold-then-update: scaffold review, then update with decision, finalize
       "--files",
       "src/foo.ts,src/bar.ts"
     ]);
-    assert.equal(finalResult.status, 0);
+    expect(finalResult.status).toBe(0);
 
     // Verify finalized artifact has the update
     body = await fs.readFile(scaffoldPath, "utf8");
-    assert.match(body, /Status: completed/, "finalized must have completed status");
-    assert.match(body, /Decision: approved/, "finalized must have decision");
-    assert.match(body, /All checks pass/, "finalized must have summary");
-    assert.match(body, /100% coverage/, "finalized must have test summary");
+    expect(body, "finalized must have completed status").toMatch(/Status: completed/);
+    expect(body, "finalized must have decision").toMatch(/Decision: approved/);
+    expect(body, "finalized must have summary").toMatch(/All checks pass/);
+    expect(body, "finalized must have test summary").toMatch(/100% coverage/);
   } finally {
     await cleanup(repoPath);
   }
diff --git a/crew/tests/backend-dev-prompt.test.mts b/crew/tests/backend-dev-prompt.test.mts
index eff2e78a..c8311711 100644
--- a/crew/tests/backend-dev-prompt.test.mts
+++ b/crew/tests/backend-dev-prompt.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -9,45 +8,45 @@ const AGENT_PATH = path.join(REPO_ROOT, "agents", "backend-dev.md");
 
 test("backend-dev.md exists and has frontmatter name=backend-dev", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /^---/);
-  assert.match(md, /name:\s*backend-dev/);
+  expect(md).toMatch(/^---/);
+  expect(md).toMatch(/name:\s*backend-dev/);
 });
 
 test("backend-dev.md declares server + DB scope and forbids FE code", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /Owned scope/);
-  assert.match(md, /api\//);
-  assert.match(md, /Forbidden/);
-  assert.match(md, /\*\.tsx/);
-  assert.match(md, /UX spec files/i);
+  expect(md).toMatch(/Owned scope/);
+  expect(md).toMatch(/api\//);
+  expect(md).toMatch(/Forbidden/);
+  expect(md).toMatch(/\*\.tsx/);
+  expect(md).toMatch(/UX spec files/i);
 });
 
 test("backend-dev.md declares csharp stack capability", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /stacks:\s*\[csharp\]/);
-  assert.match(md, /\.NET/);
-  assert.match(md, /ASP\.NET Core/);
+  expect(md).toMatch(/stacks:\s*\[csharp\]/);
+  expect(md).toMatch(/\.NET/);
+  expect(md).toMatch(/ASP\.NET Core/);
 });
 
 test("backend-dev.md mandates OpenAPI codegen as FIRST step", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /contract-codegen/);
-  assert.match(md, /FIRST step/i);
+  expect(md).toMatch(/contract-codegen/);
+  expect(md).toMatch(/FIRST step/i);
 });
 
 test("backend-dev.md mandates drift handling via help_request", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /help_request/);
-  assert.match(md, /do not invent/i);
+  expect(md).toMatch(/help_request/);
+  expect(md).toMatch(/do not invent/i);
 });
 
 test("backend-dev.md references the shared self-verify-gate skill", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /skills\/workflow\/self-verify-gate/);
+  expect(md).toMatch(/skills\/workflow\/self-verify-gate/);
 });
 
 test("self-verify-gate skill covers per-stack BE test runners", async () => {
   const skillPath = path.join(REPO_ROOT, "skills", "workflow", "self-verify-gate", "SKILL.md");
   const md = await fs.readFile(skillPath, "utf8");
-  assert.match(md, /dotnet test|pytest|bun test/);
+  expect(md).toMatch(/dotnet test|pytest|bun test/);
 });
diff --git a/crew/tests/bash-gate-timer.test.mts b/crew/tests/bash-gate-timer.test.mts
index 39c240d4..75686dee 100644
--- a/crew/tests/bash-gate-timer.test.mts
+++ b/crew/tests/bash-gate-timer.test.mts
@@ -1,68 +1,67 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { promises as fs } from "node:fs";
 import os from "node:os";
 import path from "node:path";
 import { classifyBashGate, startGateTimer, endGateTimer } from "../scripts/lib/bash-gate-timer.mjs";
 
 test("classifyBashGate returns correct gate for bun run typecheck", () => {
-  assert.equal(classifyBashGate("bun run typecheck"), "typecheck");
+  expect(classifyBashGate("bun run typecheck")).toBe("typecheck");
 });
 
 test("classifyBashGate returns correct gate for bun run lint", () => {
-  assert.equal(classifyBashGate("bun run lint"), "lint");
+  expect(classifyBashGate("bun run lint")).toBe("lint");
 });
 
 test("classifyBashGate returns correct gate for bun run format:check", () => {
-  assert.equal(classifyBashGate("bun run format:check"), "format:check");
+  expect(classifyBashGate("bun run format:check")).toBe("format:check");
 });
 
 test("classifyBashGate returns correct gate for bun audit", () => {
-  assert.equal(classifyBashGate("bun audit"), "audit");
+  expect(classifyBashGate("bun audit")).toBe("audit");
 });
 
 test("classifyBashGate returns correct gate for bun run verify:all", () => {
-  assert.equal(classifyBashGate("bun run verify:all"), "verify:all");
+  expect(classifyBashGate("bun run verify:all")).toBe("verify:all");
 });
 
 test("classifyBashGate returns test for bun test", () => {
-  assert.equal(classifyBashGate("bun test"), "test");
+  expect(classifyBashGate("bun test")).toBe("test");
 });
 
 test("classifyBashGate returns test for bun run test", () => {
-  assert.equal(classifyBashGate("bun run test"), "test");
+  expect(classifyBashGate("bun run test")).toBe("test");
 });
 
 test("classifyBashGate returns npm-ci for npm ci", () => {
-  assert.equal(classifyBashGate("npm ci"), "npm-ci");
+  expect(classifyBashGate("npm ci")).toBe("npm-ci");
 });
 
 test("classifyBashGate returns null for ls -la", () => {
-  assert.equal(classifyBashGate("ls -la"), null);
+  expect(classifyBashGate("ls -la")).toBe(null);
 });
 
 test("classifyBashGate returns null for bun run test:node (Node fallback — must not contaminate test bucket)", () => {
-  assert.equal(classifyBashGate("bun run test:node"), null);
+  expect(classifyBashGate("bun run test:node")).toBe(null);
 });
 
 test("classifyBashGate returns null for bun audit-fix (colon-suffixed variant)", () => {
-  assert.equal(classifyBashGate("bun audit-fix"), null);
+  expect(classifyBashGate("bun audit-fix")).toBe(null);
 });
 
 test("classifyBashGate returns null for bun run typecheck:strict (colon-suffixed variant)", () => {
-  assert.equal(classifyBashGate("bun run typecheck:strict"), null);
+  expect(classifyBashGate("bun run typecheck:strict")).toBe(null);
 });
 
 test("classifyBashGate returns test for bun run test (regression — still classifies correctly)", () => {
-  assert.equal(classifyBashGate("bun run test"), "test");
+  expect(classifyBashGate("bun run test")).toBe("test");
 });
 
 test("classifyBashGate returns audit for bun audit (regression — still classifies correctly)", () => {
-  assert.equal(classifyBashGate("bun audit"), "audit");
+  expect(classifyBashGate("bun audit")).toBe("audit");
 });
 
 test("startGateTimer returns null for unknown command", () => {
-  assert.equal(startGateTimer("ls -la"), null);
+  expect(startGateTimer("ls -la")).toBe(null);
 });
 
 test("end-to-end: startGateTimer + endGateTimer writes JSONL row with correct fields", async () => {
@@ -71,7 +70,7 @@ test("end-to-end: startGateTimer + endGateTimer writes JSONL row with correct fi
   process.env["CREW_BASH_GATE_LOG"] = logPath;
   try {
     const handle = startGateTimer("bun run lint");
-    assert.ok(handle !== null, "startGateTimer should return a handle for known command");
+    expect(handle !== null, "startGateTimer should return a handle for known command").toBeTruthy();
     // Sleep 15ms
     await new Promise<void>((r) => setTimeout(r, 15));
     endGateTimer(handle, 0);
@@ -79,12 +78,9 @@ test("end-to-end: startGateTimer + endGateTimer writes JSONL row with correct fi
     await new Promise<void>((r) => setTimeout(r, 50));
     const raw = await fs.readFile(logPath, "utf-8");
     const row = JSON.parse(raw.trim()) as Record<string, unknown>;
-    assert.equal(row["gate"], "lint");
-    assert.equal(row["exitCode"], 0);
-    assert.ok(
-      typeof row["durationMs"] === "number" && row["durationMs"] >= 10,
-      `durationMs ${row["durationMs"]} below floor`
-    );
+    expect(row["gate"]).toBe("lint");
+    expect(row["exitCode"]).toBe(0);
+    expect(typeof row["durationMs"] === "number" && row["durationMs"] >= 10, `durationMs ${row["durationMs"]} below floor`).toBeTruthy();
   } finally {
     delete process.env["CREW_BASH_GATE_LOG"];
     await fs.rm(tmp, { recursive: true, force: true });
diff --git a/crew/tests/branch-cleanup.test.mts b/crew/tests/branch-cleanup.test.mts
index f07c6dd4..469082d7 100644
--- a/crew/tests/branch-cleanup.test.mts
+++ b/crew/tests/branch-cleanup.test.mts
@@ -7,13 +7,12 @@
 // git diff <branch> <base> --stat (two-dot, reversed) is empty, so
 // isBranchMerged correctly returns true.
 
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
 import { execFile as execFileCallback } from "node:child_process";
 import { promisify } from "node:util";
-import test from "node:test";
-import assert from "node:assert/strict";
 
 import { isStandardMerged, isSquashMerged, isBranchMerged } from "../scripts/lib/branch-cleanup.mjs";
 
@@ -85,7 +84,7 @@ test("isStandardMerged: returns false for squash-merged branch", async () => {
 
   const result = await isStandardMerged(dir, "feat/squash", "main");
   // Squash merge does NOT make the branch appear in `git branch --merged`
-  assert.equal(result, false, "squash-merged branch should NOT appear in standard merged check");
+  expect(result, "squash-merged branch should NOT appear in standard merged check").toBe(false);
 });
 
 test("isSquashMerged: returns true for squash-merged branch (empty two-dot diff)", async () => {
@@ -93,7 +92,7 @@ test("isSquashMerged: returns true for squash-merged branch (empty two-dot diff)
   await createSquashMergedBranch(dir, "feat/squash");
 
   const result = await isSquashMerged(dir, "feat/squash", "main");
-  assert.equal(result, true, "squash-merged branch should have empty diff vs main");
+  expect(result, "squash-merged branch should have empty diff vs main").toBe(true);
 });
 
 test("isBranchMerged: returns true for squash-merged branch", async () => {
@@ -101,7 +100,7 @@ test("isBranchMerged: returns true for squash-merged branch", async () => {
   await createSquashMergedBranch(dir, "feat/squash");
 
   const result = await isBranchMerged(dir, "feat/squash", "main");
-  assert.equal(result, true, "isBranchMerged should detect squash-merged branch as merged");
+  expect(result, "isBranchMerged should detect squash-merged branch as merged").toBe(true);
 });
 
 test("isStandardMerged: returns true for standard-merged branch", async () => {
@@ -109,7 +108,7 @@ test("isStandardMerged: returns true for standard-merged branch", async () => {
   await createStandardMergedBranch(dir, "feat/standard");
 
   const result = await isStandardMerged(dir, "feat/standard", "main");
-  assert.equal(result, true, "standard-merged branch should appear in git branch --merged");
+  expect(result, "standard-merged branch should appear in git branch --merged").toBe(true);
 });
 
 test("isSquashMerged: returns true for standard-merged branch (diff also empty)", async () => {
@@ -121,7 +120,7 @@ test("isSquashMerged: returns true for standard-merged branch (diff also empty)"
 
   const result = await isSquashMerged(dir, "feat/standard", "main");
   // After standard merge, two-dot diff is empty (branch already in main).
-  assert.equal(result, true, "standard-merged branch also has empty three-dot diff");
+  expect(result, "standard-merged branch also has empty three-dot diff").toBe(true);
 });
 
 test("isBranchMerged: returns true for standard-merged branch", async () => {
@@ -129,7 +128,7 @@ test("isBranchMerged: returns true for standard-merged branch", async () => {
   await createStandardMergedBranch(dir, "feat/standard");
 
   const result = await isBranchMerged(dir, "feat/standard", "main");
-  assert.equal(result, true, "standard-merged branch should be detected as merged");
+  expect(result, "standard-merged branch should be detected as merged").toBe(true);
 });
 
 test("isStandardMerged: returns false for unmerged branch", async () => {
@@ -137,7 +136,7 @@ test("isStandardMerged: returns false for unmerged branch", async () => {
   await createUnmergedBranch(dir, "feat/wip");
 
   const result = await isStandardMerged(dir, "feat/wip", "main");
-  assert.equal(result, false, "unmerged branch should NOT appear in git branch --merged");
+  expect(result, "unmerged branch should NOT appear in git branch --merged").toBe(false);
 });
 
 test("isSquashMerged: returns false for unmerged branch", async () => {
@@ -145,7 +144,7 @@ test("isSquashMerged: returns false for unmerged branch", async () => {
   await createUnmergedBranch(dir, "feat/wip");
 
   const result = await isSquashMerged(dir, "feat/wip", "main");
-  assert.equal(result, false, "unmerged branch should have non-empty diff vs main");
+  expect(result, "unmerged branch should have non-empty diff vs main").toBe(false);
 });
 
 test("isBranchMerged: returns false for unmerged branch", async () => {
@@ -153,19 +152,19 @@ test("isBranchMerged: returns false for unmerged branch", async () => {
   await createUnmergedBranch(dir, "feat/wip");
 
   const result = await isBranchMerged(dir, "feat/wip", "main");
-  assert.equal(result, false, "unmerged branch should not be detected as merged");
+  expect(result, "unmerged branch should not be detected as merged").toBe(false);
 });
 
 test("isSquashMerged: returns false for unknown branch ref", async () => {
   const dir = await initRepo();
 
   const result = await isSquashMerged(dir, "nonexistent/branch", "main");
-  assert.equal(result, false, "unknown branch ref should not be detected as squash-merged");
+  expect(result, "unknown branch ref should not be detected as squash-merged").toBe(false);
 });
 
 test("isBranchMerged: returns false for unknown branch ref", async () => {
   const dir = await initRepo();
 
   const result = await isBranchMerged(dir, "nonexistent/branch", "main");
-  assert.equal(result, false, "unknown branch ref should not be detected as merged");
+  expect(result, "unknown branch ref should not be detected as merged").toBe(false);
 });
diff --git a/crew/tests/brief-me-hook-health.test.mts b/crew/tests/brief-me-hook-health.test.mts
index bd6eb3f1..017f1edd 100644
--- a/crew/tests/brief-me-hook-health.test.mts
+++ b/crew/tests/brief-me-hook-health.test.mts
@@ -1,6 +1,5 @@
 // tests/brief-me-hook-health.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import { formatHookHealthSection } from "../scripts/lib/briefing.mjs";
 
@@ -14,9 +13,9 @@ test("formatHookHealthSection returns green header when all hooks clean", () =>
     ]
   };
   const section = formatHookHealthSection(health);
-  assert.match(section, /##\s+Hook health/);
-  assert.match(section, /all hooks clean/i);
-  assert.doesNotMatch(section, /yellow/i);
+  expect(section).toMatch(/##\s+Hook health/);
+  expect(section).toMatch(/all hooks clean/i);
+  expect(section).not.toMatch(/yellow/i);
 });
 
 test("formatHookHealthSection shows error count for yellow hooks", () => {
@@ -27,6 +26,6 @@ test("formatHookHealthSection shows error count for yellow hooks", () => {
     ]
   };
   const section = formatHookHealthSection(health);
-  assert.match(section, /preflight-shell/);
-  assert.match(section, /3/);
+  expect(section).toMatch(/preflight-shell/);
+  expect(section).toMatch(/3/);
 });
diff --git a/crew/tests/briefing-cost-health.test.mts b/crew/tests/briefing-cost-health.test.mts
index 46efbf58..1c0c3efb 100644
--- a/crew/tests/briefing-cost-health.test.mts
+++ b/crew/tests/briefing-cost-health.test.mts
@@ -3,8 +3,7 @@
 // Written BEFORE the implementation. All tests should fail initially until
 // collectCostHealth is exported and wired into buildBriefingReport.
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -104,14 +103,11 @@ test("collectCostHealth: returns costHealth with grade and topConcern when cost
   const tmpDir = await makeTempRepo([reportText]);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected costHealth to be non-null when reports exist");
-    assert.ok(typeof result.grade === "string", "grade must be a string");
-    assert.ok(result.reportCount >= 1, "reportCount must be >= 1");
+    expect(result !== null, "Expected costHealth to be non-null when reports exist").toBeTruthy();
+    expect(typeof result.grade === "string", "grade must be a string").toBeTruthy();
+    expect(result.reportCount >= 1, "reportCount must be >= 1").toBeTruthy();
     // topConcern can be null (no rules fired) or a string
-    assert.ok(
-      result.topConcern === null || typeof result.topConcern === "string",
-      "topConcern must be string or null"
-    );
+    expect(result.topConcern === null || typeof result.topConcern === "string", "topConcern must be string or null").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -125,7 +121,7 @@ test("collectCostHealth: returns null when no cost reports exist", async () => {
   const tmpDir = await makeTempRepo([]); // no reports
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.equal(result, null, "Expected null when no cost reports present");
+    expect(result, "Expected null when no cost reports present").toBe(null);
   } finally {
     await cleanup(tmpDir);
   }
@@ -141,8 +137,8 @@ test("collectCostHealth: grade is a valid A-F letter", async () => {
   const tmpDir = await makeTempRepo([reportText]);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null result");
-    assert.ok(validGrades.has(result.grade), `grade '${result.grade}' must be one of A,B,C,D,F`);
+    expect(result !== null, "Expected non-null result").toBeTruthy();
+    expect(validGrades.has(result.grade), `grade '${result.grade}' must be one of A,B,C,D,F`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -158,11 +154,8 @@ test("collectCostHealth: topConcern is string or null", async () => {
   const tmpDir = await makeTempRepo([reportText]);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null result");
-    assert.ok(
-      result.topConcern === null || typeof result.topConcern === "string",
-      `topConcern must be string or null, got ${typeof result.topConcern}`
-    );
+    expect(result !== null, "Expected non-null result").toBeTruthy();
+    expect(result.topConcern === null || typeof result.topConcern === "string", `topConcern must be string or null, got ${typeof result.topConcern}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -184,8 +177,8 @@ test("collectCostHealth: grade is A when all metrics are excellent", async () =>
   const tmpDir = await makeTempRepo([reportText]);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null result");
-    assert.equal(result.grade, "A", `Expected A grade for excellent metrics, got ${result.grade}`);
+    expect(result !== null, "Expected non-null result").toBeTruthy();
+    expect(result.grade, `Expected A grade for excellent metrics, got ${result.grade}`).toBe("A");
   } finally {
     await cleanup(tmpDir);
   }
@@ -200,13 +193,10 @@ test("collectCostHealth: grade downgrades when cache hit is below A threshold",
   const tmpDir = await makeTempRepo([reportText]);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null result");
+    expect(result !== null, "Expected non-null result").toBeTruthy();
     const gradeOrder = ["A", "B", "C", "D", "F"];
     const gradeIdx = gradeOrder.indexOf(result.grade);
-    assert.ok(
-      gradeIdx >= gradeOrder.indexOf("D"),
-      `Expected grade D or worse for cache hit 85%, got ${result.grade}`
-    );
+    expect(gradeIdx >= gradeOrder.indexOf("D"), `Expected grade D or worse for cache hit 85%, got ${result.grade}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -222,11 +212,8 @@ test("collectCostHealth: topConcern is a non-empty string when a rule fires", as
   const tmpDir = await makeTempRepo([reportText]);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null result");
-    assert.ok(
-      typeof result.topConcern === "string" && result.topConcern.length > 0,
-      `Expected non-empty topConcern string when cache-busted rule fires, got: ${JSON.stringify(result.topConcern)}`
-    );
+    expect(result !== null, "Expected non-null result").toBeTruthy();
+    expect(typeof result.topConcern === "string" && result.topConcern.length > 0, `Expected non-empty topConcern string when cache-busted rule fires, got: ${JSON.stringify(result.topConcern)}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -245,8 +232,8 @@ test("collectCostHealth: reportCount reflects number of cost reports found", asy
   const tmpDir = await makeTempRepo(reports);
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null result");
-    assert.equal(result.reportCount, 3, `Expected reportCount 3, got ${result.reportCount}`);
+    expect(result !== null, "Expected non-null result").toBeTruthy();
+    expect(result.reportCount, `Expected reportCount 3, got ${result.reportCount}`).toBe(3);
   } finally {
     await cleanup(tmpDir);
   }
@@ -263,10 +250,10 @@ test("buildBriefingReport: summary.costHealth is present when cost reports exist
   // Need a minimal git repo for buildBriefingReport to not fail
   try {
     const result = await buildBriefingReport(tmpDir);
-    assert.ok("costHealth" in result, "Expected costHealth field in buildBriefingReport output");
+    expect("costHealth" in result, "Expected costHealth field in buildBriefingReport output").toBeTruthy();
     // When reports exist, costHealth should be non-null
     if (result.costHealth != null) {
-      assert.ok(typeof (result.costHealth as { grade: string }).grade === "string");
+      expect(typeof (result.costHealth as { grade: string }).grade === "string").toBeTruthy();
     }
   } finally {
     await cleanup(tmpDir);
@@ -282,11 +269,8 @@ test("buildBriefingReport: costHealth is null when no cost reports exist", async
   const tmpDir = await makeTempRepo([]); // no reports
   try {
     const result = await buildBriefingReport(tmpDir);
-    assert.ok(
-      "costHealth" in result,
-      "Expected costHealth key to be present in result (even if null)"
-    );
-    assert.equal(result.costHealth, null, "Expected costHealth to be null when no reports exist");
+    expect("costHealth" in result, "Expected costHealth key to be present in result (even if null)").toBeTruthy();
+    expect(result.costHealth, "Expected costHealth to be null when no reports exist").toBe(null);
   } finally {
     await cleanup(tmpDir);
   }
@@ -438,9 +422,9 @@ test("collectCostHealth: per-slice-only world uses slice file for costHealth", a
   const tmpDir = await makeTempRepoWithVariants({ sliceFiles: [sliceText] });
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null costHealth when slice file exists");
-    assert.ok(typeof result.grade === "string", "grade must be a string");
-    assert.ok(result.reportCount >= 1, "reportCount must be >= 1");
+    expect(result !== null, "Expected non-null costHealth when slice file exists").toBeTruthy();
+    expect(typeof result.grade === "string", "grade must be a string").toBeTruthy();
+    expect(result.reportCount >= 1, "reportCount must be >= 1").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -452,7 +436,7 @@ test("collectCostAggregate: returns null when no aggregate-variant file exists",
   const tmpDir = await makeTempRepoWithVariants({ sliceFiles: [sliceText] });
   try {
     const result = await collectCostAggregate(tmpDir);
-    assert.equal(result, null, "Expected null costAggregate when no aggregate file exists");
+    expect(result, "Expected null costAggregate when no aggregate file exists").toBe(null);
   } finally {
     await cleanup(tmpDir);
   }
@@ -468,8 +452,8 @@ test("collectCostAggregate: returns aggregate data when aggregate-variant file e
   });
   try {
     const result = await collectCostAggregate(tmpDir);
-    assert.ok(result !== null, "Expected non-null costAggregate when aggregate file exists");
-    assert.ok(typeof result.grade === "string", "grade must be a string");
+    expect(result !== null, "Expected non-null costAggregate when aggregate file exists").toBeTruthy();
+    expect(typeof result.grade === "string", "grade must be a string").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -487,16 +471,12 @@ test("collectCostHealth: grade uses slice reread count (9), not aggregate reread
   });
   try {
     const sliceHealth = await collectCostHealth(tmpDir);
-    assert.ok(sliceHealth !== null, "Expected non-null costHealth");
+    expect(sliceHealth !== null, "Expected non-null costHealth").toBeTruthy();
     // If grade is derived from slice (9 rereads) → C at worst for that metric
     // If grade is derived from aggregate (114 rereads) → F
     // Grade must NOT be F when using the per-slice file.
     // (cacheHitPct=99 → A; 9 rereads → C-band worst case for that metric alone)
-    assert.notEqual(
-      sliceHealth.grade,
-      "F",
-      `costHealth.grade should not be F when slice has only 9 rereads (expected C or better), got ${sliceHealth.grade}`
-    );
+    expect(sliceHealth.grade, `costHealth.grade should not be F when slice has only 9 rereads (expected C or better), got ${sliceHealth.grade}`).not.toBe("F");
   } finally {
     await cleanup(tmpDir);
   }
@@ -508,8 +488,8 @@ test("collectCostHealth: falls back to legacy file when no slice-variant exists"
   const tmpDir = await makeTempRepoWithVariants({ legacyFiles: [legacyText] });
   try {
     const result = await collectCostHealth(tmpDir);
-    assert.ok(result !== null, "Expected non-null costHealth from legacy fallback");
-    assert.ok(typeof result.grade === "string", "grade must be a string");
+    expect(result !== null, "Expected non-null costHealth from legacy fallback").toBeTruthy();
+    expect(typeof result.grade === "string", "grade must be a string").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -520,11 +500,7 @@ test("collectCostAggregate: returns null in legacy-only world (no aggregate-vari
   const tmpDir = await makeTempRepoWithVariants({ legacyFiles: [legacyText] });
   try {
     const result = await collectCostAggregate(tmpDir);
-    assert.equal(
-      result,
-      null,
-      "Expected null costAggregate when only legacy (non-infixed) files exist"
-    );
+    expect(result, "Expected null costAggregate when only legacy (non-infixed) files exist").toBe(null);
   } finally {
     await cleanup(tmpDir);
   }
@@ -537,12 +513,9 @@ test("buildBriefingReport: exposes costAggregate field at top level", async () =
   const tmpDir = await makeTempRepoWithVariants({ sliceFiles: [sliceText] });
   try {
     const result = await buildBriefingReport(tmpDir);
-    assert.ok(
-      "costAggregate" in result,
-      "Expected costAggregate key in buildBriefingReport output"
-    );
+    expect("costAggregate" in result, "Expected costAggregate key in buildBriefingReport output").toBeTruthy();
     // With no aggregate file, costAggregate should be null
-    assert.equal(result.costAggregate, null, "Expected costAggregate null when no aggregate file");
+    expect(result.costAggregate, "Expected costAggregate null when no aggregate file").toBe(null);
   } finally {
     await cleanup(tmpDir);
   }
diff --git a/crew/tests/briefing-cost-rollup-dedupe.test.mts b/crew/tests/briefing-cost-rollup-dedupe.test.mts
index 37d1372e..29c76d2c 100644
--- a/crew/tests/briefing-cost-rollup-dedupe.test.mts
+++ b/crew/tests/briefing-cost-rollup-dedupe.test.mts
@@ -4,8 +4,7 @@
 // modelBurn, and dedupedCount are computed over a deduped set of cost reports,
 // while recent[] still exposes all raw reports for per-row table rendering.
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -167,17 +166,11 @@ test("collectRecentCosts dedupe: all-aggregate same window → sumUsdRecent = la
 
     const result = await collectRecentCosts(tmpDir, 5);
 
-    assert.equal(result.recent.length, 3, "recent[] must contain all 3 raw reports");
-    assert.equal(result.totalReports, 3, "totalReports must be 3");
-    assert.equal(result.dedupedCount, 1, "dedupedCount must be 1 (latest aggregate only)");
-    assert.ok(
-      Math.abs(result.sumUsdRecent! - 3995.81) < 0.01,
-      `sumUsdRecent must be ~3995.81, got ${result.sumUsdRecent}`
-    );
-    assert.ok(
-      Math.abs(result.avgUsdRecent! - 3995.81) < 0.01,
-      `avgUsdRecent must divide by dedupedCount (1), got ${result.avgUsdRecent}`
-    );
+    expect(result.recent.length, "recent[] must contain all 3 raw reports").toBe(3);
+    expect(result.totalReports, "totalReports must be 3").toBe(3);
+    expect(result.dedupedCount, "dedupedCount must be 1 (latest aggregate only)").toBe(1);
+    expect(Math.abs(result.sumUsdRecent! - 3995.81) < 0.01, `sumUsdRecent must be ~3995.81, got ${result.sumUsdRecent}`).toBeTruthy();
+    expect(Math.abs(result.avgUsdRecent! - 3995.81) < 0.01, `avgUsdRecent must divide by dedupedCount (1), got ${result.avgUsdRecent}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -219,12 +212,9 @@ test("collectRecentCosts dedupe: aggregate + nested slice same window → sumUsd
 
     const result = await collectRecentCosts(tmpDir, 5);
 
-    assert.equal(result.recent.length, 2, "recent[] must contain both raw reports");
-    assert.equal(result.dedupedCount, 1, "dedupedCount must be 1 (aggregate wins)");
-    assert.ok(
-      Math.abs(result.sumUsdRecent! - 3995.81) < 0.01,
-      `sumUsdRecent must be aggregate usd ~3995.81, got ${result.sumUsdRecent}`
-    );
+    expect(result.recent.length, "recent[] must contain both raw reports").toBe(2);
+    expect(result.dedupedCount, "dedupedCount must be 1 (aggregate wins)").toBe(1);
+    expect(Math.abs(result.sumUsdRecent! - 3995.81) < 0.01, `sumUsdRecent must be aggregate usd ~3995.81, got ${result.sumUsdRecent}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -265,12 +255,9 @@ test("collectRecentCosts dedupe: disjoint historical windows → sumUsdRecent =
 
     const result = await collectRecentCosts(tmpDir, 5);
 
-    assert.equal(result.recent.length, 2, "recent[] must contain both raw reports");
-    assert.equal(result.dedupedCount, 2, "dedupedCount must be 2 (both disjoint windows)");
-    assert.ok(
-      Math.abs(result.sumUsdRecent! - 300) < 0.01,
-      `sumUsdRecent must be plain sum 300, got ${result.sumUsdRecent}`
-    );
+    expect(result.recent.length, "recent[] must contain both raw reports").toBe(2);
+    expect(result.dedupedCount, "dedupedCount must be 2 (both disjoint windows)").toBe(2);
+    expect(Math.abs(result.sumUsdRecent! - 300) < 0.01, `sumUsdRecent must be plain sum 300, got ${result.sumUsdRecent}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -338,17 +325,10 @@ test("collectRecentCosts dedupe: mixed scenario → sum = latest aggregate + dis
 
     const result = await collectRecentCosts(tmpDir, 5);
 
-    assert.equal(result.recent.length, 4, "recent[] must contain all 4 raw reports");
-    assert.equal(
-      result.dedupedCount,
-      2,
-      "dedupedCount must be 2 (latest agg + disjoint historical)"
-    );
+    expect(result.recent.length, "recent[] must contain all 4 raw reports").toBe(4);
+    expect(result.dedupedCount, "dedupedCount must be 2 (latest agg + disjoint historical)").toBe(2);
     const expected = 3995.81 + 50;
-    assert.ok(
-      Math.abs(result.sumUsdRecent! - expected) < 0.01,
-      `sumUsdRecent must be ${expected}, got ${result.sumUsdRecent}`
-    );
+    expect(Math.abs(result.sumUsdRecent! - expected) < 0.01, `sumUsdRecent must be ${expected}, got ${result.sumUsdRecent}`).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -394,12 +374,8 @@ test("collectRecentCosts dedupe: modelBurn only counts deduped reports", async (
 
     // modelBurn.slices for opus should be 1 (one deduped report), not 2
     const opusBurn = result.modelBurn?.find((m) => m.model === opusModel);
-    assert.ok(opusBurn != null, `Expected modelBurn entry for ${opusModel}`);
-    assert.equal(
-      opusBurn.slices,
-      1,
-      `modelBurn.slices for ${opusModel} must be 1 (deduped), got ${opusBurn.slices}`
-    );
+    expect(opusBurn != null, `Expected modelBurn entry for ${opusModel}`).toBeTruthy();
+    expect(opusBurn.slices, `modelBurn.slices for ${opusModel} must be 1 (deduped), got ${opusBurn.slices}`).toBe(1);
   } finally {
     await cleanup(tmpDir);
   }
@@ -416,11 +392,8 @@ test("collectRecentCosts: dedupedCount field is present on result", async () =>
 
     const result = await collectRecentCosts(tmpDir, 5);
 
-    assert.ok(
-      "dedupedCount" in result,
-      "dedupedCount field must be present on collectRecentCosts result"
-    );
-    assert.ok(typeof result.dedupedCount === "number", "dedupedCount must be a number");
+    expect("dedupedCount" in result, "dedupedCount field must be present on collectRecentCosts result").toBeTruthy();
+    expect(typeof result.dedupedCount === "number", "dedupedCount must be a number").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -434,7 +407,7 @@ test("collectRecentCosts: dedupedCount = 0 when no reports exist", async () => {
   const { tmpDir } = await makeTempCostDir();
   try {
     const result = await collectRecentCosts(tmpDir, 5);
-    assert.equal(result.dedupedCount, 0, "dedupedCount must be 0 when no reports");
+    expect(result.dedupedCount, "dedupedCount must be 0 when no reports").toBe(0);
   } finally {
     await cleanup(tmpDir);
   }
@@ -476,8 +449,8 @@ test("collectRecentCosts dedupe: recent[] contains all raw reports for table ren
     const result = await collectRecentCosts(tmpDir, 5);
 
     // recent[] must contain all 3 even though dedupedCount = 1
-    assert.equal(result.recent.length, 3, "recent[] must contain all 3 raw reports");
-    assert.equal(result.dedupedCount, 1, "dedupedCount must be 1 after dedupe");
+    expect(result.recent.length, "recent[] must contain all 3 raw reports").toBe(3);
+    expect(result.dedupedCount, "dedupedCount must be 1 after dedupe").toBe(1);
   } finally {
     await cleanup(tmpDir);
   }
diff --git a/crew/tests/briefing-module-imports.test.mts b/crew/tests/briefing-module-imports.test.mts
index 502bec02..5ea62bff 100644
--- a/crew/tests/briefing-module-imports.test.mts
+++ b/crew/tests/briefing-module-imports.test.mts
@@ -1,5 +1,4 @@
-import assert from "node:assert";
-import { test } from "node:test";
+import { test, expect } from "bun:test";
 
 test("briefing modules can be imported independently", async () => {
   // Import each module independently to verify no circular dependencies
@@ -11,82 +10,34 @@ test("briefing modules can be imported independently", async () => {
   await import("../scripts/lib/briefing/collect.mjs");
 
   // Verify core functions exist in their home modules
-  assert.ok(typeof git.collectGitActivity === "function", "git.collectGitActivity exists");
-  assert.ok(typeof cost.collectRecentCosts === "function", "cost.collectRecentCosts exists");
-  assert.ok(typeof cost.collectCostHealth === "function", "cost.collectCostHealth exists");
-  assert.ok(typeof cost.collectCostAggregate === "function", "cost.collectCostAggregate exists");
-  assert.ok(
-    typeof cost.computeModelCompliance === "function",
-    "cost.computeModelCompliance exists"
-  );
-  assert.ok(
-    typeof cost.collectModelCompliance === "function",
-    "cost.collectModelCompliance exists"
-  );
-  assert.ok(
-    typeof workflow.collectRelevantArtifacts === "function",
-    "workflow.collectRelevantArtifacts exists"
-  );
-  assert.ok(
-    typeof workflow.fetchAutonomousLoopBrief === "function",
-    "workflow.fetchAutonomousLoopBrief exists"
-  );
-  assert.ok(
-    typeof workflow.findAutonomousLoopCli === "function",
-    "workflow.findAutonomousLoopCli exists"
-  );
-  assert.ok(typeof hook.collectHookHealth === "function", "hook.collectHookHealth exists");
-  assert.ok(typeof bundle.collectBundleStats === "function", "bundle.collectBundleStats exists");
+  expect(typeof git.collectGitActivity === "function", "git.collectGitActivity exists").toBeTruthy();
+  expect(typeof cost.collectRecentCosts === "function", "cost.collectRecentCosts exists").toBeTruthy();
+  expect(typeof cost.collectCostHealth === "function", "cost.collectCostHealth exists").toBeTruthy();
+  expect(typeof cost.collectCostAggregate === "function", "cost.collectCostAggregate exists").toBeTruthy();
+  expect(typeof cost.computeModelCompliance === "function", "cost.computeModelCompliance exists").toBeTruthy();
+  expect(typeof cost.collectModelCompliance === "function", "cost.collectModelCompliance exists").toBeTruthy();
+  expect(typeof workflow.collectRelevantArtifacts === "function", "workflow.collectRelevantArtifacts exists").toBeTruthy();
+  expect(typeof workflow.fetchAutonomousLoopBrief === "function", "workflow.fetchAutonomousLoopBrief exists").toBeTruthy();
+  expect(typeof workflow.findAutonomousLoopCli === "function", "workflow.findAutonomousLoopCli exists").toBeTruthy();
+  expect(typeof hook.collectHookHealth === "function", "hook.collectHookHealth exists").toBeTruthy();
+  expect(typeof bundle.collectBundleStats === "function", "bundle.collectBundleStats exists").toBeTruthy();
 });
 
 test("collect.ts re-exports all functions from modules", async () => {
   const collect = await import("../scripts/lib/briefing/collect.mjs");
 
   // Verify all functions are re-exported from collect.ts
-  assert.ok(
-    typeof collect.collectGitActivity === "function",
-    "collect.collectGitActivity re-exported"
-  );
-  assert.ok(
-    typeof collect.collectRecentCosts === "function",
-    "collect.collectRecentCosts re-exported"
-  );
-  assert.ok(
-    typeof collect.collectCostHealth === "function",
-    "collect.collectCostHealth re-exported"
-  );
-  assert.ok(
-    typeof collect.collectCostAggregate === "function",
-    "collect.collectCostAggregate re-exported"
-  );
-  assert.ok(
-    typeof collect.computeModelCompliance === "function",
-    "collect.computeModelCompliance re-exported"
-  );
-  assert.ok(
-    typeof collect.collectModelCompliance === "function",
-    "collect.collectModelCompliance re-exported"
-  );
-  assert.ok(
-    typeof collect.collectRelevantArtifacts === "function",
-    "collect.collectRelevantArtifacts re-exported"
-  );
-  assert.ok(
-    typeof collect.fetchAutonomousLoopBrief === "function",
-    "collect.fetchAutonomousLoopBrief re-exported"
-  );
-  assert.ok(
-    typeof collect.findAutonomousLoopCli === "function",
-    "collect.findAutonomousLoopCli re-exported"
-  );
-  assert.ok(
-    typeof collect.collectHookHealth === "function",
-    "collect.collectHookHealth re-exported"
-  );
-  assert.ok(
-    typeof collect.collectBundleStats === "function",
-    "collect.collectBundleStats re-exported"
-  );
+  expect(typeof collect.collectGitActivity === "function", "collect.collectGitActivity re-exported").toBeTruthy();
+  expect(typeof collect.collectRecentCosts === "function", "collect.collectRecentCosts re-exported").toBeTruthy();
+  expect(typeof collect.collectCostHealth === "function", "collect.collectCostHealth re-exported").toBeTruthy();
+  expect(typeof collect.collectCostAggregate === "function", "collect.collectCostAggregate re-exported").toBeTruthy();
+  expect(typeof collect.computeModelCompliance === "function", "collect.computeModelCompliance re-exported").toBeTruthy();
+  expect(typeof collect.collectModelCompliance === "function", "collect.collectModelCompliance re-exported").toBeTruthy();
+  expect(typeof collect.collectRelevantArtifacts === "function", "collect.collectRelevantArtifacts re-exported").toBeTruthy();
+  expect(typeof collect.fetchAutonomousLoopBrief === "function", "collect.fetchAutonomousLoopBrief re-exported").toBeTruthy();
+  expect(typeof collect.findAutonomousLoopCli === "function", "collect.findAutonomousLoopCli re-exported").toBeTruthy();
+  expect(typeof collect.collectHookHealth === "function", "collect.collectHookHealth re-exported").toBeTruthy();
+  expect(typeof collect.collectBundleStats === "function", "collect.collectBundleStats re-exported").toBeTruthy();
 });
 
 test("collect.ts re-exports all interfaces from modules", async () => {
@@ -95,7 +46,7 @@ test("collect.ts re-exports all interfaces from modules", async () => {
   // Verify all type exports are available (these are types, not functions)
   // We can't directly check if a type exists at runtime, but we can verify
   // they're not undefined if they were somehow exported as values.
-  assert.ok(collect, "collect module exports exist");
+  expect(collect, "collect module exports exist").toBeTruthy();
 
   // Check that we can import the types without error (TypeScript check happens at compile time)
   // This is more of a compile-time verification, but we can at least verify the module is importable.
@@ -113,10 +64,10 @@ test("no circular imports between modules", async () => {
   const collect = await import("../scripts/lib/briefing/collect.mjs");
 
   // If we got here, all modules loaded successfully with no circular imports
-  assert.ok(git, "git module loaded");
-  assert.ok(cost, "cost module loaded");
-  assert.ok(workflow, "workflow module loaded");
-  assert.ok(hook, "hook module loaded");
-  assert.ok(bundle, "bundle module loaded");
-  assert.ok(collect, "collect module loaded");
+  expect(git, "git module loaded").toBeTruthy();
+  expect(cost, "cost module loaded").toBeTruthy();
+  expect(workflow, "workflow module loaded").toBeTruthy();
+  expect(hook, "hook module loaded").toBeTruthy();
+  expect(bundle, "bundle module loaded").toBeTruthy();
+  expect(collect, "collect module loaded").toBeTruthy();
 });
diff --git a/crew/tests/build-bundle-assemble.test.mts b/crew/tests/build-bundle-assemble.test.mts
index 17116679..eeb1003b 100644
--- a/crew/tests/build-bundle-assemble.test.mts
+++ b/crew/tests/build-bundle-assemble.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -35,29 +34,27 @@ test("assembleBuildBundle: happy path writes bundle with frontmatter and four se
     filesRead: ["c.md"]
   });
 
-  assert.ok(
-    result.path.endsWith("SLICE-99/backend-dev-20260608T223000Z-build-bundle.md") ||
-      result.path.endsWith("SLICE-99\\backend-dev-20260608T223000Z-build-bundle.md")
-  );
-  assert.equal(result.truncated, false);
-  assert.deepEqual(result.filesReadSkipped, []);
+  expect(result.path.endsWith("SLICE-99/backend-dev-20260608T223000Z-build-bundle.md") ||
+      result.path.endsWith("SLICE-99\\backend-dev-20260608T223000Z-build-bundle.md")).toBeTruthy();
+  expect(result.truncated).toBe(false);
+  expect(result.filesReadSkipped).toEqual([]);
 
   const text = await fs.readFile(result.path, "utf8");
-  assert.match(text, /^---\nslice: SLICE-99\n/);
-  assert.match(text, /builder: backend-dev/);
-  assert.match(text, /run_id: 20260608T223000Z/);
-  assert.match(text, /feat: FEAT-999/);
-  assert.match(text, new RegExp(`schema_version: ${SCHEMA_VERSION}`));
-  assert.ok(text.includes("## Handoff"));
-  assert.ok(text.includes("## Diff"));
-  assert.ok(text.includes("## Files touched"));
-  assert.ok(text.includes("## Files read"));
+  expect(text).toMatch(/^---\nslice: SLICE-99\n/);
+  expect(text).toMatch(/builder: backend-dev/);
+  expect(text).toMatch(/run_id: 20260608T223000Z/);
+  expect(text).toMatch(/feat: FEAT-999/);
+  expect(text).toMatch(new RegExp(`schema_version: ${SCHEMA_VERSION}`));
+  expect(text.includes("## Handoff")).toBeTruthy();
+  expect(text.includes("## Diff")).toBeTruthy();
+  expect(text.includes("## Files touched")).toBeTruthy();
+  expect(text.includes("## Files read")).toBeTruthy();
   // Section ordering is fixed:
-  assert.ok(text.indexOf("## Handoff") < text.indexOf("## Diff"));
-  assert.ok(text.indexOf("## Diff") < text.indexOf("## Files touched"));
-  assert.ok(text.indexOf("## Files touched") < text.indexOf("## Files read"));
+  expect(text.indexOf("## Handoff") < text.indexOf("## Diff")).toBeTruthy();
+  expect(text.indexOf("## Diff") < text.indexOf("## Files touched")).toBeTruthy();
+  expect(text.indexOf("## Files touched") < text.indexOf("## Files read")).toBeTruthy();
   // INLINE_HEADER never appears in raw bundle (it is only added by inliner).
-  assert.ok(!text.includes(INLINE_HEADER));
+  expect(!text.includes(INLINE_HEADER)).toBeTruthy();
 });
 
 test("assembleBuildBundle: deleted file in files_read is recorded in files_read_skipped", async () => {
@@ -75,9 +72,9 @@ test("assembleBuildBundle: deleted file in files_read is recorded in files_read_
     filesRead: ["missing.md"]
   });
 
-  assert.deepEqual(result.filesReadSkipped, [{ path: "missing.md", reason: "deleted" }]);
+  expect(result.filesReadSkipped).toEqual([{ path: "missing.md", reason: "deleted" }]);
   const text = await fs.readFile(result.path, "utf8");
-  assert.match(text, /files_read_skipped:/);
+  expect(text).toMatch(/files_read_skipped:/);
 });
 
 test("assembleBuildBundle: outside-repo path in files_read is dropped", async () => {
@@ -94,9 +91,7 @@ test("assembleBuildBundle: outside-repo path in files_read is dropped", async ()
     filesRead: ["../outside.txt"]
   });
 
-  assert.ok(
-    result.filesReadSkipped.some((s) => s.path === "../outside.txt" && s.reason === "outside-repo")
-  );
+  expect(result.filesReadSkipped.some((s) => s.path === "../outside.txt" && s.reason === "outside-repo")).toBeTruthy();
 });
 
 test("assembleBuildBundle: binary file in files_touched is replaced with placeholder", async () => {
@@ -115,7 +110,7 @@ test("assembleBuildBundle: binary file in files_touched is replaced with placeho
   });
 
   const text = await fs.readFile(result.path, "utf8");
-  assert.match(text, /<binary file, 7 bytes, sha=[0-9a-f]{16}>/);
+  expect(text).toMatch(/<binary file, 7 bytes, sha=[0-9a-f]{16}>/);
 });
 
 test("assembleBuildBundle: soft cap drops files_read LRU first", async () => {
@@ -140,10 +135,10 @@ test("assembleBuildBundle: soft cap drops files_read LRU first", async () => {
     sizeCapBytes: 60_000
   });
 
-  assert.equal(result.truncated, true);
+  expect(result.truncated).toBe(true);
   const text = await fs.readFile(result.path, "utf8");
   // old.md (older) dropped first; new.md should still be present.
-  assert.ok(!text.includes("old.md\n\n```\n" + padding));
+  expect(!text.includes("old.md\n\n```\n" + padding)).toBeTruthy();
 });
 
 test("assembleBuildBundle: orphan bundle path when slice is 'unknown'", async () => {
@@ -160,7 +155,7 @@ test("assembleBuildBundle: orphan bundle path when slice is 'unknown'", async ()
     filesRead: []
   });
 
-  assert.ok(result.path.includes(`${path.sep}orphan${path.sep}`));
+  expect(result.path.includes(`${path.sep}orphan${path.sep}`)).toBeTruthy();
 });
 
 test("assembleBuildBundle: deterministic output across two identical runs", async () => {
@@ -180,5 +175,5 @@ test("assembleBuildBundle: deterministic output across two identical runs", asyn
   const first = await fs.readFile(r1.path, "utf8");
   const r2 = await assembleBuildBundle(inputs);
   const second = await fs.readFile(r2.path, "utf8");
-  assert.equal(first, second);
+  expect(first).toBe(second);
 });
diff --git a/crew/tests/build-bundle-cli.test.mts b/crew/tests/build-bundle-cli.test.mts
index 087dc1b1..32fa10f9 100644
--- a/crew/tests/build-bundle-cli.test.mts
+++ b/crew/tests/build-bundle-cli.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -25,9 +24,8 @@ test("crew.ts write-build-bundle: writes bundle artifact, prints path", async ()
 
   const crewScript = path.resolve(import.meta.dirname, "..", "scripts", "crew.mts");
   const out = execFileSync(
-    "node",
+    "bun",
     [
-      "--experimental-strip-types",
       crewScript,
       "write-build-bundle",
       "--repo",
@@ -51,7 +49,7 @@ test("crew.ts write-build-bundle: writes bundle artifact, prints path", async ()
   );
 
   const printedPath = out.trim().split(/\r?\n/).pop() ?? "";
-  assert.ok(printedPath.endsWith("build-bundle.md"), `got: ${printedPath}`);
+  expect(printedPath.endsWith("build-bundle.md"), `got: ${printedPath}`).toBeTruthy();
   const stat = await fs.stat(printedPath);
-  assert.ok(stat.size > 0);
+  expect(stat.size > 0).toBeTruthy();
 });
diff --git a/crew/tests/build-bundle-inline.test.mts b/crew/tests/build-bundle-inline.test.mts
index bb076e5c..7c76d57b 100644
--- a/crew/tests/build-bundle-inline.test.mts
+++ b/crew/tests/build-bundle-inline.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -60,8 +59,8 @@ test("inlineLatestBundle: returns header + body when bundle present", async () =
     sliceId: "SLICE-99",
     bundlesRoot: root
   });
-  assert.ok(result.startsWith(INLINE_HEADER));
-  assert.ok(result.includes("body"));
+  expect(result.startsWith(INLINE_HEADER)).toBeTruthy();
+  expect(result.includes("body")).toBeTruthy();
 });
 
 test("inlineLatestBundle: empty string when no bundle present", async () => {
@@ -71,7 +70,7 @@ test("inlineLatestBundle: empty string when no bundle present", async () => {
     sliceId: "SLICE-99",
     bundlesRoot: root
   });
-  assert.equal(result, "");
+  expect(result).toBe("");
 });
 
 test("inlineLatestBundle: empty when frontmatter unparseable", async () => {
@@ -86,7 +85,7 @@ test("inlineLatestBundle: empty when frontmatter unparseable", async () => {
     sliceId: "SLICE-99",
     bundlesRoot: root
   });
-  assert.equal(result, "");
+  expect(result).toBe("");
 });
 
 test("inlineLatestBundle: empty when schema_version too high", async () => {
@@ -98,7 +97,7 @@ test("inlineLatestBundle: empty when schema_version too high", async () => {
     bundlesRoot: root,
     supportedSchemaVersion: 1
   });
-  assert.equal(result, "");
+  expect(result).toBe("");
 });
 
 test("inlineLatestBundle: alphabetically-last filename wins on identical mtime tiebreak", async () => {
@@ -124,8 +123,8 @@ test("inlineLatestBundle: alphabetically-last filename wins on identical mtime t
     sliceId: "SLICE-99",
     bundlesRoot: root
   });
-  assert.ok(result.includes("second"));
-  assert.ok(!result.includes("first"));
+  expect(result.includes("second")).toBeTruthy();
+  expect(!result.includes("first")).toBeTruthy();
 });
 
 test("inlineLatestBundle: truncation warning appended when bundle is size-capped", async () => {
@@ -139,5 +138,5 @@ test("inlineLatestBundle: truncation warning appended when bundle is size-capped
     sliceId: "SLICE-99",
     bundlesRoot: root
   });
-  assert.ok(result.includes(INLINE_TRUNCATION_WARNING));
+  expect(result.includes(INLINE_TRUNCATION_WARNING)).toBeTruthy();
 });
diff --git a/crew/tests/bun-preflight.test.mts b/crew/tests/bun-preflight.test.mts
index ef8a1225..da28aaec 100644
--- a/crew/tests/bun-preflight.test.mts
+++ b/crew/tests/bun-preflight.test.mts
@@ -1,11 +1,10 @@
 // tests/bun-preflight.test.ts
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { assertBunPresent } from "../scripts/lib/installer/bun-preflight.mjs";
 
 test("assertBunPresent: returns the detected bun version when bun is on PATH", () => {
   const got = assertBunPresent({ env: process.env });
-  assert.match(got.version, /^\d+\.\d+\.\d+/);
+  expect(got.version).toMatch(/^\d+\.\d+\.\d+/);
 });
 
 test("assertBunPresent: throws with an install URL when bun is missing", () => {
@@ -16,9 +15,6 @@ test("assertBunPresent: throws with an install URL when bun is missing", () => {
   } catch (e) {
     err = e;
   }
-  assert.ok(err instanceof Error, "expected an Error to be thrown");
-  assert.ok(
-    String(err).includes("https://bun.sh"),
-    `error message should reference bun.sh: ${String(err)}`
-  );
+  expect(err instanceof Error, "expected an Error to be thrown").toBeTruthy();
+  expect(String(err).includes("https://bun.sh"), `error message should reference bun.sh: ${String(err)}`).toBeTruthy();
 });
diff --git a/crew/tests/capture-learning.test.mts b/crew/tests/capture-learning.test.mts
index ea43c698..51198e50 100644
--- a/crew/tests/capture-learning.test.mts
+++ b/crew/tests/capture-learning.test.mts
@@ -4,11 +4,10 @@
 // capture. Not the S2 MemoryProvider (doesn't exist yet) — this writes
 // straight to .claude/artifacts/loop/learnings.jsonl in a shape S2's Zod
 // schema can adopt without a migration (kind/severity/tags/summary/source).
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
 import { captureFailureLearning } from "../scripts/lib/memory/capture-learning.mjs";
 
 async function makeTempRepo(prefix: string) {
@@ -41,16 +40,16 @@ test("captureFailureLearning appends a failure-kind entry with the forward-compa
       source: "review_fail"
     });
     const lines = await readLearningsLines(repo);
-    assert.equal(lines.length, 1);
+    expect(lines.length).toBe(1);
     const entry = lines[0]!;
-    assert.equal(entry.kind, "failure");
-    assert.equal(entry.agent, "reviewer");
-    assert.equal(entry.severity, "high");
-    assert.equal(entry.summary, "review rejected: missing null guard");
-    assert.deepEqual(entry.tags, ["review-result", "SLICE-01"]);
-    assert.equal(entry.source, "review_fail");
-    assert.equal(typeof entry.ts, "string");
-    assert.ok(!Number.isNaN(Date.parse(entry.ts as string)));
+    expect(entry.kind).toBe("failure");
+    expect(entry.agent).toBe("reviewer");
+    expect(entry.severity).toBe("high");
+    expect(entry.summary).toBe("review rejected: missing null guard");
+    expect(entry.tags).toEqual(["review-result", "SLICE-01"]);
+    expect(entry.source).toBe("review_fail");
+    expect(typeof entry.ts).toBe("string");
+    expect(!Number.isNaN(Date.parse(entry.ts as string))).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -64,10 +63,10 @@ test("captureFailureLearning creates the parent directory when missing", async (
       source: "validation_fail"
     });
     const lines = await readLearningsLines(repo);
-    assert.equal(lines.length, 1);
-    assert.equal(lines[0]!.agent, null);
-    assert.equal(lines[0]!.severity, "medium", "default severity is medium when unspecified");
-    assert.deepEqual(lines[0]!.tags, [], "default tags is empty array when unspecified");
+    expect(lines.length).toBe(1);
+    expect(lines[0]!.agent).toBe(null);
+    expect(lines[0]!.severity, "default severity is medium when unspecified").toBe("medium");
+    expect(lines[0]!.tags, "default tags is empty array when unspecified").toEqual([]);
   } finally {
     await cleanup(repo);
   }
@@ -79,9 +78,9 @@ test("captureFailureLearning appends (does not overwrite) across multiple calls"
     await captureFailureLearning(repo, { summary: "first", source: "review_fail" });
     await captureFailureLearning(repo, { summary: "second", source: "validation_fail" });
     const lines = await readLearningsLines(repo);
-    assert.equal(lines.length, 2);
-    assert.equal(lines[0]!.summary, "first");
-    assert.equal(lines[1]!.summary, "second");
+    expect(lines.length).toBe(2);
+    expect(lines[0]!.summary).toBe("first");
+    expect(lines[1]!.summary).toBe("second");
   } finally {
     await cleanup(repo);
   }
@@ -93,7 +92,7 @@ test("captureFailureLearning truncates an over-long summary to 280 chars", async
     const longSummary = "x".repeat(500);
     await captureFailureLearning(repo, { summary: longSummary, source: "review_fail" });
     const lines = await readLearningsLines(repo);
-    assert.equal((lines[0]!.summary as string).length, 280);
+    expect((lines[0]!.summary as string).length).toBe(280);
   } finally {
     await cleanup(repo);
   }
@@ -108,9 +107,7 @@ test("captureFailureLearning degrades safely (never throws) when the target path
     const blockerPath = path.join(repo, ".claude", "artifacts", "loop");
     await fs.mkdir(path.dirname(blockerPath), { recursive: true });
     await fs.writeFile(blockerPath, "not a directory", "utf8");
-    await assert.doesNotReject(
-      captureFailureLearning(repo, { summary: "should not throw", source: "review_fail" })
-    );
+    await expect(captureFailureLearning(repo, { summary: "should not throw", source: "review_fail" })).resolves.toBeUndefined();
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/check-builder-terminal-state.test.mts b/crew/tests/check-builder-terminal-state.test.mts
index 2cd7a1da..303000b5 100644
--- a/crew/tests/check-builder-terminal-state.test.mts
+++ b/crew/tests/check-builder-terminal-state.test.mts
@@ -4,8 +4,7 @@
 // tests/check-task-update-burst.test.ts; the runCheckXHook(raw) contract
 // mirrors hooks/lib/check-reviewer-decision.ts's runCheckReviewerDecisionHook
 // (dev-team#199 precedent this guard generalizes to builder tier).
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -65,10 +64,10 @@ test("builder-tier stop with no STATUS marker and no artifact path → block", a
       last_assistant_message: "Now let's open the PR."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.ok(out !== null);
+    expect(out !== null).toBeTruthy();
     const parsed = JSON.parse(out as string);
-    assert.equal(parsed.decision, "block");
-    assert.match(parsed.reason, /STATUS/);
+    expect(parsed.decision).toBe("block");
+    expect(parsed.reason).toMatch(/STATUS/);
   } finally {
     await cleanup(repo);
   }
@@ -84,7 +83,7 @@ test("builder-tier stop with a BLOCKED: line → pass (blocked is itself a valid
       last_assistant_message: "BLOCKED: waiting on external API credentials."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -101,7 +100,7 @@ test("builder-tier stop with only an artifact path (no STATUS line) → pass", a
         "Wrote the handoff: .claude/artifacts/crew/handoffs/20260712T000000Z-handoff-slice.md"
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -117,7 +116,7 @@ test("non-builder-tier agent (reviewer) → pass, untouched (scope check only)",
       last_assistant_message: "Now let's open the PR."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -134,7 +133,7 @@ test("stop_hook_active true → pass regardless of content", async () => {
       stop_hook_active: true
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -143,7 +142,7 @@ test("stop_hook_active true → pass regardless of content", async () => {
 // (f) malformed / missing last_assistant_message → pass + logged, never guess
 test("malformed JSON → pass, no throw", async () => {
   const out = await runCheckBuilderTerminalStateHook("not json");
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("missing agent_name → pass (fail-open, untyped payload)", async () => {
@@ -151,7 +150,7 @@ test("missing agent_name → pass (fail-open, untyped payload)", async () => {
   try {
     const raw = JSON.stringify({ session_id: "s1", cwd: repo });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -162,16 +161,16 @@ test("missing last_assistant_message → pass + logged, never guess", async () =
   try {
     const raw = payload({ cwd: repo, agent_name: "crew:fullstack-dev" });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
     const events = await readEvents(repo);
-    assert.ok(
+    expect(
       events.some(
         (e) =>
           typeof e.event === "string" &&
           e.event.includes("builder-terminal-state-guard") &&
           e.event.includes("no-message")
       )
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -194,7 +193,7 @@ test("builder-terminal-state-guard feature disabled → pass unconditionally", a
       last_assistant_message: "Now let's open the PR."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -209,9 +208,9 @@ test("missing crew.json → builder-terminal-state-guard defaults enabled, still
       last_assistant_message: "Done editing."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.ok(out !== null);
+    expect(out !== null).toBeTruthy();
     const parsed = JSON.parse(out as string);
-    assert.equal(parsed.decision, "block");
+    expect(parsed.decision).toBe("block");
   } finally {
     await cleanup(repo);
   }
@@ -227,7 +226,7 @@ test("builder-tier stop with a DONE: line → pass", async () => {
       last_assistant_message: "DONE: shipped the guard.\nFiles: hooks/foo.ts"
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -244,12 +243,11 @@ test("builder-tier stop with a DONE: line → pass", async () => {
 // ──────────────────────────────────────────────────────────────────────────
 
 test("dev-lite is excluded from TERMINAL_STATE_GUARD_AGENTS", () => {
-  assert.deepEqual(
-    [...TERMINAL_STATE_GUARD_AGENTS].sort(),
+  expect([...TERMINAL_STATE_GUARD_AGENTS].sort()).toEqual(
     ["aiplugin-dev", "backend-dev", "frontend-dev", "fullstack-dev"].sort()
   );
-  assert.equal(isInTerminalStateGuardScope("crew:dev-lite"), false);
-  assert.equal(isInTerminalStateGuardScope("dev-lite"), false);
+  expect(isInTerminalStateGuardScope("crew:dev-lite")).toBe(false);
+  expect(isInTerminalStateGuardScope("dev-lite")).toBe(false);
 });
 
 test("dev-lite's REAL success receipt (agents/dev-lite.md:90-94 shape) → pass, not blocked", async () => {
@@ -261,7 +259,7 @@ test("dev-lite's REAL success receipt (agents/dev-lite.md:90-94 shape) → pass,
       last_assistant_message: "hooks/lib/foo.ts:12-14 — fix null check.\nverified: re-read OK."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -277,7 +275,7 @@ test("dev-lite's REAL refusal line (too-big.) → pass, not blocked", async () =
       last_assistant_message: "too-big. split: 3 one-line tasks."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -292,7 +290,7 @@ test("dev-lite's REAL refusal line (escalate:) → pass, not blocked", async ()
       last_assistant_message: "escalate: public-surface. needs full builder."
     });
     const out = await runCheckBuilderTerminalStateHook(raw);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/check-task-update-burst.test.mts b/crew/tests/check-task-update-burst.test.mts
index 036ed17d..d9a4fc2d 100644
--- a/crew/tests/check-task-update-burst.test.mts
+++ b/crew/tests/check-task-update-burst.test.mts
@@ -1,6 +1,5 @@
 // FEAT-155: in-process tests for check-task-update-burst hook core.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -37,7 +36,7 @@ test("FEAT-155: 1 TaskUpdate → no burst row", async () => {
   try {
     await runCheckTaskUpdateBurstHook(makePayload("s1", repo));
     const lines = await readBurstLog(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
   } finally {
     await cleanup(repo);
   }
@@ -49,7 +48,7 @@ test("FEAT-155: 2 consecutive TaskUpdates → no burst row (below threshold)", a
     await runCheckTaskUpdateBurstHook(makePayload("s2", repo));
     await runCheckTaskUpdateBurstHook(makePayload("s2", repo));
     const lines = await readBurstLog(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
   } finally {
     await cleanup(repo);
   }
@@ -62,10 +61,10 @@ test("FEAT-155: 3 consecutive TaskUpdates → burst row written", async () => {
     await runCheckTaskUpdateBurstHook(makePayload("s3", repo));
     await runCheckTaskUpdateBurstHook(makePayload("s3", repo));
     const lines = await readBurstLog(repo);
-    assert.equal(lines.length, 1);
+    expect(lines.length).toBe(1);
     const row: unknown = JSON.parse(lines[0]!);
-    assert.equal((row as Record<string, unknown>).event, "task-update-burst");
-    assert.equal((row as Record<string, unknown>).consecutive_count, 3);
+    expect((row as Record<string, unknown>).event).toBe("task-update-burst");
+    expect((row as Record<string, unknown>).consecutive_count).toBe(3);
   } finally {
     await cleanup(repo);
   }
@@ -78,8 +77,8 @@ test("FEAT-155: 5 consecutive TaskUpdates → 3 burst rows (>=3, >=4, >=5)", asy
       await runCheckTaskUpdateBurstHook(makePayload("s4", repo));
     }
     const lines = await readBurstLog(repo);
-    assert.equal(lines.length, 3);
-    assert.equal((JSON.parse(lines[2]!) as Record<string, unknown>).consecutive_count, 5);
+    expect(lines.length).toBe(3);
+    expect((JSON.parse(lines[2]!) as Record<string, unknown>).consecutive_count).toBe(5);
   } finally {
     await cleanup(repo);
   }
@@ -98,7 +97,7 @@ test("FEAT-155: cost-hygiene config feature disabled → no burst row, no state
     await runCheckTaskUpdateBurstHook(makePayload("s5", repo));
     await runCheckTaskUpdateBurstHook(makePayload("s5", repo));
     const lines = await readBurstLog(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
     const stateFile = path.join(repo, ".claude", "state", "task-update-burst", "s5.json");
     let stateExists = false;
     try {
@@ -107,7 +106,7 @@ test("FEAT-155: cost-hygiene config feature disabled → no burst row, no state
     } catch {
       stateExists = false;
     }
-    assert.equal(stateExists, false);
+    expect(stateExists).toBe(false);
   } finally {
     await cleanup(repo);
   }
@@ -119,7 +118,7 @@ test("FEAT-155: malformed payload → no throw, no burst row", async () => {
     await runCheckTaskUpdateBurstHook("not-json");
     await runCheckTaskUpdateBurstHook(JSON.stringify({ session_id: 123 }));
     const lines = await readBurstLog(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/checkpoint-cadence.test.mts b/crew/tests/checkpoint-cadence.test.mts
index c2c34e0c..3086f96a 100644
--- a/crew/tests/checkpoint-cadence.test.mts
+++ b/crew/tests/checkpoint-cadence.test.mts
@@ -1,6 +1,5 @@
 // dev-team#174: checkpoint-cadence PostToolUse hook tests.
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -22,7 +21,7 @@ test("does not nudge before the first Edit/Write (read-heavy phase)", async () =
     process.env["CREW_CHECKPOINT_CADENCE_N"] = "3";
     for (let i = 0; i < 10; i++) {
       const out = await runCheckpointCadenceHook(input(repo, "Read"));
-      assert.equal(out, null, `Read #${i} must not nudge before any edit`);
+      expect(out, `Read #${i} must not nudge before any edit`).toBe(null);
     }
   } finally {
     delete process.env["CREW_CHECKPOINT_CADENCE_N"];
@@ -35,14 +34,14 @@ test("nudges once the threshold of post-edit tool calls is reached", async () =>
   try {
     process.env["CREW_CHECKPOINT_CADENCE_N"] = "3";
     // First Edit arms the counter and is itself call #1.
-    assert.equal(await runCheckpointCadenceHook(input(repo, "Write")), null);
-    assert.equal(await runCheckpointCadenceHook(input(repo, "Read")), null);
+    expect(await runCheckpointCadenceHook(input(repo, "Write"))).toBe(null);
+    expect(await runCheckpointCadenceHook(input(repo, "Read"))).toBe(null);
     const out = await runCheckpointCadenceHook(input(repo, "Bash")); // call #3 → fire
-    assert.ok(out, "expected a nudge at the threshold");
+    expect(out, "expected a nudge at the threshold").toBeTruthy();
     const parsed = JSON.parse(out!);
-    assert.equal(parsed.decision, "approve");
-    assert.match(parsed.systemMessage, /checkpoint/i);
-    assert.ok(!("hookSpecificOutput" in parsed), "must not use hookSpecificOutput (#176 trap)");
+    expect(parsed.decision).toBe("approve");
+    expect(parsed.systemMessage).toMatch(/checkpoint/i);
+    expect(!("hookSpecificOutput" in parsed), "must not use hookSpecificOutput (#176 trap)").toBeTruthy();
   } finally {
     delete process.env["CREW_CHECKPOINT_CADENCE_N"];
     await cleanup(repo);
@@ -55,11 +54,11 @@ test("counter resets after firing — nudges on a fixed cadence, not every call"
     process.env["CREW_CHECKPOINT_CADENCE_N"] = "2";
     await runCheckpointCadenceHook(input(repo, "Edit")); // #1
     const first = await runCheckpointCadenceHook(input(repo, "Bash")); // #2 → fire
-    assert.ok(first, "first nudge at call 2");
+    expect(first, "first nudge at call 2").toBeTruthy();
     const between = await runCheckpointCadenceHook(input(repo, "Bash")); // #1 after reset
-    assert.equal(between, null, "no nudge immediately after reset");
+    expect(between, "no nudge immediately after reset").toBe(null);
     const second = await runCheckpointCadenceHook(input(repo, "Bash")); // #2 → fire again
-    assert.ok(second, "second nudge one cadence later");
+    expect(second, "second nudge one cadence later").toBeTruthy();
   } finally {
     delete process.env["CREW_CHECKPOINT_CADENCE_N"];
     await cleanup(repo);
@@ -77,7 +76,7 @@ test("respects the disable flag in crew.json", async () => {
     );
     await runCheckpointCadenceHook(input(repo, "Edit"));
     const out = await runCheckpointCadenceHook(input(repo, "Edit"));
-    assert.equal(out, null, "disabled feature must never nudge");
+    expect(out, "disabled feature must never nudge").toBe(null);
   } finally {
     delete process.env["CREW_CHECKPOINT_CADENCE_N"];
     await cleanup(repo);
@@ -85,6 +84,6 @@ test("respects the disable flag in crew.json", async () => {
 });
 
 test("malformed input returns null (never throws)", async () => {
-  assert.equal(await runCheckpointCadenceHook("not json"), null);
-  assert.equal(await runCheckpointCadenceHook(JSON.stringify({ foo: 1 })), null);
+  expect(await runCheckpointCadenceHook("not json")).toBe(null);
+  expect(await runCheckpointCadenceHook(JSON.stringify({ foo: 1 }))).toBe(null);
 });
diff --git a/crew/tests/claims-worktree-canonical.test.mts b/crew/tests/claims-worktree-canonical.test.mts
index e3acbefb..8a730bbe 100644
--- a/crew/tests/claims-worktree-canonical.test.mts
+++ b/crew/tests/claims-worktree-canonical.test.mts
@@ -22,8 +22,7 @@ import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
 import { execFileSync } from "node:child_process";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import { claimFiles, releaseFiles, listClaims, checkDisjoint } from "../scripts/lib/claims.mjs";
 import { startWorkflowRun, loadWorkflowState } from "../scripts/lib/workflow-state.mjs";
@@ -71,17 +70,17 @@ test("claiming the same file from the wave worktree and a concurrent chore-branc
   const { wave, chore } = await setupWaveAndChoreLane("conflict");
 
   const waveClaim = await claimFiles(wave, ["src/shared.ts"], { owner: "wave-builder" });
-  assert.equal(waveClaim.ok, true);
-  assert.deepEqual(waveClaim.ok ? waveClaim.value.claimed : [], ["src/shared.ts"]);
+  expect(waveClaim.ok).toBe(true);
+  expect(waveClaim.ok ? waveClaim.value.claimed : []).toEqual(["src/shared.ts"]);
 
   // Same file, claimed from the OTHER worktree by a different owner — this
   // is exactly the "file-claim check between lanes" the issue asks for.
   const choreClaim = await claimFiles(chore, ["src/shared.ts"], { owner: "chore-lane" });
-  assert.equal(choreClaim.ok, true);
+  expect(choreClaim.ok).toBe(true);
   if (!choreClaim.ok) return;
-  assert.deepEqual(choreClaim.value.claimed, [], "conflicting file must not be re-claimed");
-  assert.equal(choreClaim.value.conflicts.length, 1);
-  assert.equal(choreClaim.value.conflicts[0]?.owner, "wave-builder");
+  expect(choreClaim.value.claimed, "conflicting file must not be re-claimed").toEqual([]);
+  expect(choreClaim.value.conflicts.length).toBe(1);
+  expect(choreClaim.value.conflicts[0]?.owner).toBe("wave-builder");
 });
 
 test("disjoint files claimed from each worktree are both visible via listClaims from either worktree (clean cross-lane listing)", async () => {
@@ -95,7 +94,7 @@ test("disjoint files claimed from each worktree are both visible via listClaims
 
   for (const claims of [fromWave, fromChore]) {
     const paths = claims.map((c) => c.path).sort();
-    assert.deepEqual(paths, ["docs/quickwin.md", "src/wave-only.ts"]);
+    expect(paths).toEqual(["docs/quickwin.md", "src/wave-only.ts"]);
   }
 });
 
@@ -104,12 +103,12 @@ test("releasing a claim from the chore-branch worktree is visible from the wave
 
   await claimFiles(wave, ["src/temp.ts"], { owner: "wave-builder" });
   const release = await releaseFiles(chore, ["src/temp.ts"], { owner: "wave-builder" });
-  assert.equal(release.ok, true);
+  expect(release.ok).toBe(true);
   if (!release.ok) return;
-  assert.deepEqual(release.value.released, ["src/temp.ts"]);
+  expect(release.value.released).toEqual(["src/temp.ts"]);
 
   const remaining = await listClaims(wave);
-  assert.deepEqual(remaining, []);
+  expect(remaining).toEqual([]);
 });
 
 test("starting a workflow run in the wave worktree does not create or touch workflow-state in the chore-branch worktree (currentRun stays per-worktree)", async () => {
@@ -118,18 +117,18 @@ test("starting a workflow run in the wave worktree does not create or touch work
   await startWorkflowRun(wave, { title: "Wave slice run" });
 
   const waveState = await loadWorkflowState(wave);
-  assert.equal(waveState.currentRun?.title, "Wave slice run");
+  expect(waveState.currentRun?.title).toBe("Wave slice run");
 
   // The chore worktree must not see the wave's currentRun, and must not
   // even have a workflow-state.json written by the wave's run.
   const choreStateFile = path.join(chore, ".claude", "state", "crew", "workflow-state.json");
-  await assert.rejects(
+  await expect(
     fs.access(choreStateFile),
     "chore worktree must have no workflow-state.json yet"
-  );
+  ).rejects.toThrow();
 
   const choreState = await loadWorkflowState(chore, { createIfMissing: false });
-  assert.equal(choreState.currentRun, null);
+  expect(choreState.currentRun).toBe(null);
 });
 
 test("checkDisjoint flags a quick-win candidate that overlaps the active wave lane, and passes a disjoint set (#163 S2)", async () => {
@@ -143,21 +142,18 @@ test("checkDisjoint flags a quick-win candidate that overlaps the active wave la
   const overlapping = await checkDisjoint(chore, ["docs/readme.md", "src/wave-a.ts"], {
     owner: "quickwin-lane"
   });
-  assert.equal(overlapping.disjoint, false);
-  assert.deepEqual(
-    overlapping.overlaps.map((o) => o.path),
-    ["src/wave-a.ts"]
-  );
-  assert.equal(overlapping.overlaps[0]?.owner, "wave-builder");
-  assert.deepEqual(overlapping.available, ["docs/readme.md"]);
+  expect(overlapping.disjoint).toBe(false);
+  expect(overlapping.overlaps.map((o) => o.path)).toEqual(["src/wave-a.ts"]);
+  expect(overlapping.overlaps[0]?.owner).toBe("wave-builder");
+  expect(overlapping.available).toEqual(["docs/readme.md"]);
 
   // A fully disjoint candidate set passes.
   const clean = await checkDisjoint(chore, ["docs/readme.md", "docs/guide.md"], {
     owner: "quickwin-lane"
   });
-  assert.equal(clean.disjoint, true);
-  assert.deepEqual(clean.overlaps, []);
-  assert.deepEqual(clean.available, ["docs/guide.md", "docs/readme.md"]);
+  expect(clean.disjoint).toBe(true);
+  expect(clean.overlaps).toEqual([]);
+  expect(clean.available).toEqual(["docs/guide.md", "docs/readme.md"]);
 });
 
 test("checkDisjoint does not count the quick-win lane's own prior claims as overlaps (idempotent re-check)", async () => {
@@ -168,33 +164,36 @@ test("checkDisjoint does not count the quick-win lane's own prior claims as over
   const recheck = await checkDisjoint(chore, ["docs/quickwin.md", "docs/new.md"], {
     owner: "quickwin-lane"
   });
-  assert.equal(recheck.disjoint, true);
-  assert.deepEqual(recheck.available, ["docs/new.md", "docs/quickwin.md"]);
+  expect(recheck.disjoint).toBe(true);
+  expect(recheck.available).toEqual(["docs/new.md", "docs/quickwin.md"]);
 });
 
 test("claiming from the main repo path itself (no active worktree) is unaffected — regression guard", async () => {
   const { repo } = await setupWaveAndChoreLane("main-direct");
 
   const result = await claimFiles(repo, ["src/main-direct.ts"], { owner: "solo" });
-  assert.equal(result.ok, true);
+  expect(result.ok).toBe(true);
   if (!result.ok) return;
-  assert.deepEqual(result.value.claimed, ["src/main-direct.ts"]);
+  expect(result.value.claimed).toEqual(["src/main-direct.ts"]);
 
   const claims = await listClaims(repo);
-  assert.deepEqual(
-    claims.map((c) => c.path),
-    ["src/main-direct.ts"]
-  );
+  expect(claims.map((c) => c.path)).toEqual(["src/main-direct.ts"]);
 });
 
 test("claiming against a plain non-git directory falls back to repoPath unchanged (test-fixture safety)", async () => {
   const plain = await makeTempDir("claims-plain-");
 
   const result = await claimFiles(plain, ["a.ts"], { owner: "solo" });
-  assert.equal(result.ok, true);
+  expect(result.ok).toBe(true);
   if (!result.ok) return;
-  assert.deepEqual(result.value.claimed, ["a.ts"]);
+  expect(result.value.claimed).toEqual(["a.ts"]);
 
   const claimsPath = path.join(plain, ".claude", "state", "crew", "claims.json");
-  await assert.doesNotReject(fs.access(claimsPath));
+  let accessErr: unknown;
+  try {
+    await fs.access(claimsPath);
+  } catch (e) {
+    accessErr = e;
+  }
+  expect(accessErr).toBeUndefined();
 });
diff --git a/crew/tests/cli-approvals.test.mts b/crew/tests/cli-approvals.test.mts
index 5a4a1cfd..c1c67f28 100644
--- a/crew/tests/cli-approvals.test.mts
+++ b/crew/tests/cli-approvals.test.mts
@@ -1,12 +1,11 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 
 test("CLI approval requests can be listed and resolved", async () => {
   const repoPath = await makeTempDir("crew-cli-approvals-");
   const initResult = await runCrew(["init", "--repo", repoPath]);
-  assert.equal(initResult.code, 0, "init should exit with code 0");
+  expect(initResult.code, "init should exit with code 0").toBe(0);
 
   const requestResult = await runCrew([
     "request-approval",
@@ -19,16 +18,16 @@ test("CLI approval requests can be listed and resolved", async () => {
     "--requester",
     "fullstack-dev"
   ]);
-  assert.equal(requestResult.code, 0, "request-approval should exit with code 0");
+  expect(requestResult.code, "request-approval should exit with code 0").toBe(0);
   const requestOutput = JSON.parse(requestResult.output);
-  assert.equal(requestOutput.status, "open");
-  assert.equal(requestOutput.approver, "user");
+  expect(requestOutput.status).toBe("open");
+  expect(requestOutput.approver).toBe("user");
 
   const openResult = await runCrew(["show-approvals", "--repo", repoPath]);
-  assert.equal(openResult.code, 0, "show-approvals should exit with code 0");
+  expect(openResult.code, "show-approvals should exit with code 0").toBe(0);
   const openOutput = JSON.parse(openResult.output);
-  assert.equal(openOutput.approvals.length, 1);
-  assert.equal(openOutput.approvals[0].id, requestOutput.id);
+  expect(openOutput.approvals.length).toBe(1);
+  expect(openOutput.approvals[0].id).toBe(requestOutput.id);
 
   const resolveResult = await runCrew([
     "resolve-approval",
@@ -41,9 +40,9 @@ test("CLI approval requests can be listed and resolved", async () => {
     "--resolver",
     "user"
   ]);
-  assert.equal(resolveResult.code, 0, "resolve-approval should exit with code 0");
+  expect(resolveResult.code, "resolve-approval should exit with code 0").toBe(0);
   const resolveOutput = JSON.parse(resolveResult.output);
-  assert.equal(resolveOutput.status, "approved");
+  expect(resolveOutput.status).toBe("approved");
 
   const resolvedResult = await runCrew([
     "show-approvals",
@@ -52,8 +51,8 @@ test("CLI approval requests can be listed and resolved", async () => {
     "--status",
     "resolved"
   ]);
-  assert.equal(resolvedResult.code, 0, "show-approvals with --status should exit with code 0");
+  expect(resolvedResult.code, "show-approvals with --status should exit with code 0").toBe(0);
   const resolvedOutput = JSON.parse(resolvedResult.output);
-  assert.equal(resolvedOutput.approvals.length, 1);
-  assert.equal(resolvedOutput.approvals[0].status, "approved");
+  expect(resolvedOutput.approvals.length).toBe(1);
+  expect(resolvedOutput.approvals[0].status).toBe("approved");
 });
diff --git a/crew/tests/cli-artifacts.test.mts b/crew/tests/cli-artifacts.test.mts
index e430d699..ac58c042 100644
--- a/crew/tests/cli-artifacts.test.mts
+++ b/crew/tests/cli-artifacts.test.mts
@@ -1,14 +1,13 @@
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 
 test("CLI artifact writers create markdown artifacts", async () => {
   const repoPath = await makeTempDir("crew-cli-artifacts-");
   const initResult = await runCrew(["init", "--repo", repoPath]);
-  assert.equal(initResult.code, 0, "init should exit with code 0");
+  expect(initResult.code, "init should exit with code 0").toBe(0);
 
   const runBriefResult = await runCrew([
     "write-run-brief",
@@ -25,11 +24,11 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "--files",
     "app/templates/create.html,static/js/create.js"
   ]);
-  assert.equal(runBriefResult.code, 0, "write-run-brief should exit with code 0");
+  expect(runBriefResult.code, "write-run-brief should exit with code 0").toBe(0);
   const runBriefOutput = JSON.parse(runBriefResult.output);
   const runBriefBody = await fs.readFile(runBriefOutput.path, "utf8");
-  assert.match(runBriefBody, /# Run Brief: Platform guidance feature/);
-  assert.match(runBriefBody, /single-session/);
+  expect(runBriefBody).toMatch(/# Run Brief: Platform guidance feature/);
+  expect(runBriefBody).toMatch(/single-session/);
 
   const reviewResult = await runCrew([
     "write-review-result",
@@ -45,11 +44,11 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "app/templates/create.html",
     "--non-code"
   ]);
-  assert.equal(reviewResult.code, 0, "write-review-result should exit with code 0");
+  expect(reviewResult.code, "write-review-result should exit with code 0").toBe(0);
   const reviewOutput = JSON.parse(reviewResult.output);
   const reviewBody = await fs.readFile(reviewOutput.path, "utf8");
-  assert.match(reviewBody, /# Review Result: Platform guidance review/);
-  assert.match(reviewBody, /approved/);
+  expect(reviewBody).toMatch(/# Review Result: Platform guidance review/);
+  expect(reviewBody).toMatch(/approved/);
 
   const reviewAliasResult = await runCrew([
     "write-review-result",
@@ -61,14 +60,10 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "approved_with_notes",
     "--non-code"
   ]);
-  assert.equal(
-    reviewAliasResult.code,
-    0,
-    "write-review-result with --verdict should exit with code 0"
-  );
+  expect(reviewAliasResult.code, "write-review-result with --verdict should exit with code 0").toBe(0);
   const reviewAliasOutput = JSON.parse(reviewAliasResult.output);
   const reviewAliasBody = await fs.readFile(reviewAliasOutput.path, "utf8");
-  assert.match(reviewAliasBody, /approved_with_notes/);
+  expect(reviewAliasBody).toMatch(/approved_with_notes/);
 
   const validationPlanResult = await runCrew([
     "write-validation-plan",
@@ -85,11 +80,11 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "--evidence",
     "vite build,playwright smoke"
   ]);
-  assert.equal(validationPlanResult.code, 0, "write-validation-plan should exit with code 0");
+  expect(validationPlanResult.code, "write-validation-plan should exit with code 0").toBe(0);
   const validationPlanOutput = JSON.parse(validationPlanResult.output);
   const validationPlanBody = await fs.readFile(validationPlanOutput.path, "utf8");
-  assert.match(validationPlanBody, /# Validation Plan: Platform guidance validation plan/);
-  assert.match(validationPlanBody, /Exercise the create flow and collect smoke evidence/);
+  expect(validationPlanBody).toMatch(/# Validation Plan: Platform guidance validation plan/);
+  expect(validationPlanBody).toMatch(/Exercise the create flow and collect smoke evidence/);
 
   const validationResult = await runCrew([
     "write-validation-result",
@@ -108,12 +103,12 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "--files",
     "http://localhost:5173,app/templates/create.html"
   ]);
-  assert.equal(validationResult.code, 0, "write-validation-result should exit with code 0");
+  expect(validationResult.code, "write-validation-result should exit with code 0").toBe(0);
   const validationOutput = JSON.parse(validationResult.output);
   const validationBody = await fs.readFile(validationOutput.path, "utf8");
-  assert.match(validationBody, /# Validation Result: Platform guidance validation/);
-  assert.match(validationBody, /local/);
-  assert.match(validationBody, /passed/);
+  expect(validationBody).toMatch(/# Validation Result: Platform guidance validation/);
+  expect(validationBody).toMatch(/local/);
+  expect(validationBody).toMatch(/passed/);
 
   const deploymentCheckResult = await runCrew([
     "write-deployment-check",
@@ -138,23 +133,23 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "--files",
     "https://platform-guidance-dev.example.com"
   ]);
-  assert.equal(deploymentCheckResult.code, 0, "write-deployment-check should exit with code 0");
+  expect(deploymentCheckResult.code, "write-deployment-check should exit with code 0").toBe(0);
   const deploymentCheckOutput = JSON.parse(deploymentCheckResult.output);
   const deploymentCheckBody = await fs.readFile(deploymentCheckOutput.path, "utf8");
-  assert.match(deploymentCheckBody, /# Deployment Check: Platform guidance dev deploy/);
-  assert.match(deploymentCheckBody, /cloud-run:platform-guidance-dev/);
-  assert.match(deploymentCheckBody, /https:\/\/platform-guidance-dev\.example\.com/);
-  assert.match(deploymentCheckBody, /platform-guidance-dev-00012-abc/);
+  expect(deploymentCheckBody).toMatch(/# Deployment Check: Platform guidance dev deploy/);
+  expect(deploymentCheckBody).toMatch(/cloud-run:platform-guidance-dev/);
+  expect(deploymentCheckBody).toMatch(/https:\/\/platform-guidance-dev\.example\.com/);
+  expect(deploymentCheckBody).toMatch(/platform-guidance-dev-00012-abc/);
 
   await fs.mkdir(path.join(repoPath, ".github", "workflows"), { recursive: true });
   await fs.writeFile(path.join(repoPath, ".github", "workflows", "deploy.yml"), "name: deploy\n");
   await fs.writeFile(path.join(repoPath, "Dockerfile"), "FROM node:20\n");
 
   const discoverResult = await runCrew(["discover-deployment", "--repo", repoPath]);
-  assert.equal(discoverResult.code, 0, "discover-deployment should exit with code 0");
+  expect(discoverResult.code, "discover-deployment should exit with code 0").toBe(0);
   const discoverOutput = JSON.parse(discoverResult.output);
-  assert.ok(discoverOutput.clues.includes(".github/workflows/deploy.yml"));
-  assert.ok(discoverOutput.clues.includes("Dockerfile"));
+  expect(discoverOutput.clues.includes(".github/workflows/deploy.yml")).toBeTruthy();
+  expect(discoverOutput.clues.includes("Dockerfile")).toBeTruthy();
 
   const guidanceResult = await runCrew([
     "write-deployment-guidance",
@@ -185,22 +180,22 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "--missing",
     "staging playground service url"
   ]);
-  assert.equal(guidanceResult.code, 0, "write-deployment-guidance should exit with code 0");
+  expect(guidanceResult.code, "write-deployment-guidance should exit with code 0").toBe(0);
   const guidanceOutput = JSON.parse(guidanceResult.output);
   const guidanceBody = await fs.readFile(guidanceOutput.path, "utf8");
-  assert.match(guidanceBody, /# Deployment Guidance: Platform guidance deployment model/);
-  assert.match(guidanceBody, /- Discovery Status: live-verified/);
-  assert.match(guidanceBody, /- Verified From:/);
-  assert.match(guidanceBody, /GitHub Actions builds the image/);
-  assert.match(guidanceBody, /Cloud Logging service logs/);
-  assert.match(guidanceBody, /staging playground service url/);
-  assert.match(guidanceBody, /\.github\/workflows\/deploy\.yml/);
+  expect(guidanceBody).toMatch(/# Deployment Guidance: Platform guidance deployment model/);
+  expect(guidanceBody).toMatch(/- Discovery Status: live-verified/);
+  expect(guidanceBody).toMatch(/- Verified From:/);
+  expect(guidanceBody).toMatch(/GitHub Actions builds the image/);
+  expect(guidanceBody).toMatch(/Cloud Logging service logs/);
+  expect(guidanceBody).toMatch(/staging playground service url/);
+  expect(guidanceBody).toMatch(/\.github\/workflows\/deploy\.yml/);
 });
 
 test("write-* commands embed --feature and --phase in frontmatter", async () => {
   const repoPath = await makeTempDir("crew-cli-feature-phase-");
   const initResult = await runCrew(["init", "--repo", repoPath]);
-  assert.equal(initResult.code, 0, "init should exit with code 0");
+  expect(initResult.code, "init should exit with code 0").toBe(0);
 
   // run-brief with feature + phase
   const runBriefResult = await runCrew([
@@ -214,11 +209,11 @@ test("write-* commands embed --feature and --phase in frontmatter", async () =>
     "--phase",
     "3"
   ]);
-  assert.equal(runBriefResult.code, 0, "write-run-brief should exit with code 0");
+  expect(runBriefResult.code, "write-run-brief should exit with code 0").toBe(0);
   const briefPath = JSON.parse(runBriefResult.output).path;
   const briefBody = await fs.readFile(briefPath, "utf8");
-  assert.match(briefBody, /^---\nphase: "3"\nfeature: FEAT-021\nstatus: \w+\n---\n/);
-  assert.match(briefBody, /# Run Brief: Tagged brief/);
+  expect(briefBody).toMatch(/^---\nphase: "3"\nfeature: FEAT-021\nstatus: \w+\n---\n/);
+  expect(briefBody).toMatch(/# Run Brief: Tagged brief/);
 
   // review-result without feature/phase: P1.3 (2026-07-04) now always emits a
   // canonical `decision:` frontmatter line when --decision is set, so "no
@@ -234,14 +229,10 @@ test("write-* commands embed --feature and --phase in frontmatter", async () =>
     "approved",
     "--non-code"
   ]);
-  assert.equal(reviewResult.code, 0, "write-review-result should exit with code 0");
+  expect(reviewResult.code, "write-review-result should exit with code 0").toBe(0);
   const reviewPath = JSON.parse(reviewResult.output).path;
   const reviewBody = await fs.readFile(reviewPath, "utf8");
-  assert.match(
-    reviewBody,
-    /^---\ndecision: approved\n---\n/,
-    "review-result with feature/phase absent still carries the canonical decision frontmatter (P1.3)"
-  );
+  expect(reviewBody, "review-result with feature/phase absent still carries the canonical decision frontmatter (P1.3)").toMatch(/^---\ndecision: approved\n---\n/);
 
   // review-result with only feature emits frontmatter without phase line
   const reviewFeatResult = await runCrew([
@@ -256,15 +247,11 @@ test("write-* commands embed --feature and --phase in frontmatter", async () =>
     "FEAT-007",
     "--non-code"
   ]);
-  assert.equal(
-    reviewFeatResult.code,
-    0,
-    "write-review-result with feature should exit with code 0"
-  );
+  expect(reviewFeatResult.code, "write-review-result with feature should exit with code 0").toBe(0);
   const reviewFeatPath = JSON.parse(reviewFeatResult.output).path;
   const reviewFeatBody = await fs.readFile(reviewFeatPath, "utf8");
-  assert.match(reviewFeatBody, /^---\nfeature: FEAT-007\ndecision: approved\n---\n/);
-  assert.ok(!reviewFeatBody.includes("phase:"), "no phase key when phase omitted");
+  expect(reviewFeatBody).toMatch(/^---\nfeature: FEAT-007\ndecision: approved\n---\n/);
+  expect(!reviewFeatBody.includes("phase:"), "no phase key when phase omitted").toBeTruthy();
 });
 
 test("write-handoff --repo-context appends ## Repo Layout section", async () => {
@@ -282,12 +269,12 @@ test("write-handoff --repo-context appends ## Repo Layout section", async () =>
     "lead",
     "--repo-context"
   ]);
-  assert.equal(result.code, 0, "write-handoff should exit with code 0");
+  expect(result.code, "write-handoff should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
-  assert.ok(output.path, "should return artifact path");
+  expect(output.path, "should return artifact path").toBeTruthy();
   const content = await fs.readFile(output.path, "utf8");
-  assert.match(content, /## Repo Layout/);
-  assert.match(content, /npm scripts:/);
+  expect(content).toMatch(/## Repo Layout/);
+  expect(content).toMatch(/npm scripts:/);
 });
 
 test("write-handoff without --repo-context has no ## Repo Layout section", async () => {
@@ -304,10 +291,10 @@ test("write-handoff without --repo-context has no ## Repo Layout section", async
     "--to",
     "lead"
   ]);
-  assert.equal(result.code, 0, "write-handoff should exit with code 0");
+  expect(result.code, "write-handoff should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  assert.ok(!content.includes("## Repo Layout"), "should not contain Repo Layout without flag");
+  expect(!content.includes("## Repo Layout"), "should not contain Repo Layout without flag").toBeTruthy();
 });
 
 test("write-review-result with --validation-evidence emits frontmatter field and body section", async () => {
@@ -327,20 +314,12 @@ test("write-review-result with --validation-evidence emits frontmatter field and
     "--validation-evidence",
     evidenceText
   ]);
-  assert.equal(result.code, 0, "write-review-result should exit with code 0");
+  expect(result.code, "write-review-result should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  assert.match(
-    content,
-    /validation_evidence:/,
-    "frontmatter should contain validation_evidence key"
-  );
-  assert.ok(content.includes(evidenceText), "frontmatter or body should contain the evidence text");
-  assert.match(
-    content,
-    /## Validation Evidence/,
-    "body should contain ## Validation Evidence section"
-  );
+  expect(content, "frontmatter should contain validation_evidence key").toMatch(/validation_evidence:/);
+  expect(content.includes(evidenceText), "frontmatter or body should contain the evidence text").toBeTruthy();
+  expect(content, "body should contain ## Validation Evidence section").toMatch(/## Validation Evidence/);
 });
 
 test("write-review-result without --validation-evidence emits no frontmatter field and no body section", async () => {
@@ -356,17 +335,11 @@ test("write-review-result without --validation-evidence emits no frontmatter fie
     "approved",
     "--non-code"
   ]);
-  assert.equal(result.code, 0, "write-review-result should exit with code 0");
+  expect(result.code, "write-review-result should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  assert.ok(
-    !content.includes("validation_evidence"),
-    "artifact should have no validation_evidence field when flag omitted"
-  );
-  assert.ok(
-    !content.includes("## Validation Evidence"),
-    "artifact should have no Validation Evidence section when flag omitted"
-  );
+  expect(!content.includes("validation_evidence"), "artifact should have no validation_evidence field when flag omitted").toBeTruthy();
+  expect(!content.includes("## Validation Evidence"), "artifact should have no Validation Evidence section when flag omitted").toBeTruthy();
 });
 
 test("write-review-result with --validation-evidence empty string treats it as omitted", async () => {
@@ -384,17 +357,11 @@ test("write-review-result with --validation-evidence empty string treats it as o
     "--validation-evidence",
     ""
   ]);
-  assert.equal(result.code, 0, "write-review-result should exit with code 0");
+  expect(result.code, "write-review-result should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  assert.ok(
-    !content.includes("validation_evidence"),
-    "artifact should have no validation_evidence field when flag is empty string"
-  );
-  assert.ok(
-    !content.includes("## Validation Evidence"),
-    "artifact should have no Validation Evidence section when flag is empty string"
-  );
+  expect(!content.includes("validation_evidence"), "artifact should have no validation_evidence field when flag is empty string").toBeTruthy();
+  expect(!content.includes("## Validation Evidence"), "artifact should have no Validation Evidence section when flag is empty string").toBeTruthy();
 });
 
 test("write-validation-result: --findings persisted in frontmatter", async () => {
@@ -414,14 +381,13 @@ test("write-validation-result: --findings persisted in frontmatter", async () =>
       "--findings",
       "pass:2,partial:0,fail:1"
     ]);
-    assert.equal(result.code, 0, "write-validation-result should exit with code 0");
+    expect(result.code, "write-validation-result should exit with code 0").toBe(0);
     const output = JSON.parse(result.output);
     const body = await fs.readFile(output.path, "utf8");
-    assert.match(
+    expect(
       body,
-      /findings:.*pass:2,partial:0,fail:1/,
       "validation artifact must contain findings"
-    );
+    ).toMatch(/findings:.*pass:2,partial:0,fail:1/);
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
@@ -446,14 +412,13 @@ test("write-deployment-check: --findings persisted in frontmatter", async () =>
       "--findings",
       "healthy:1,degraded:0,down:0"
     ]);
-    assert.equal(result.code, 0, "write-deployment-check should exit with code 0");
+    expect(result.code, "write-deployment-check should exit with code 0").toBe(0);
     const output = JSON.parse(result.output);
     const body = await fs.readFile(output.path, "utf8");
-    assert.match(
+    expect(
       body,
-      /findings:.*healthy:1,degraded:0,down:0/,
       "deployment artifact must contain findings"
-    );
+    ).toMatch(/findings:.*healthy:1,degraded:0,down:0/);
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
diff --git a/crew/tests/cli-claims.test.mts b/crew/tests/cli-claims.test.mts
index d123a456..2cda44c0 100644
--- a/crew/tests/cli-claims.test.mts
+++ b/crew/tests/cli-claims.test.mts
@@ -1,7 +1,6 @@
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 
@@ -9,16 +8,16 @@ test("CLI init creates a harnessed repo", async () => {
   const rootPath = await makeTempDir("crew-cli-init-");
   const repoPath = path.join(rootPath, "app");
   const { code, output } = await runCrew(["init", "--repo", repoPath]);
-  assert.equal(code, 0, "init should exit with code 0");
+  expect(code, "init should exit with code 0").toBe(0);
   const result = JSON.parse(output);
 
-  assert.equal(result.mode, "init");
-  assert.equal(result.audit.hasHarnessLayer, true);
-  assert.match(result.welcome.headline, /Crew/);
-  assert.ok(result.welcome.commands.includes("/crew:brief-me"));
+  expect(result.mode).toBe("init");
+  expect(result.audit.hasHarnessLayer).toBe(true);
+  expect(result.welcome.headline).toMatch(/Crew/);
+  expect(result.welcome.commands.includes("/crew:brief-me")).toBeTruthy();
 
   const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
-  assert.match(claudeMd, /crew:start/);
+  expect(claudeMd).toMatch(/crew:start/);
 });
 
 test("CLI bootstrap preserves existing CLAUDE.md content", async () => {
@@ -26,15 +25,15 @@ test("CLI bootstrap preserves existing CLAUDE.md content", async () => {
   await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Existing\n");
 
   const { code, output } = await runCrew(["bootstrap", "--repo", repoPath]);
-  assert.equal(code, 0, "bootstrap should exit with code 0");
+  expect(code, "bootstrap should exit with code 0").toBe(0);
   const result = JSON.parse(output);
   const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
 
-  assert.equal(result.mode, "bootstrap");
-  assert.match(result.welcome.headline, /Crew/);
-  assert.ok(result.welcome.commands.includes("/crew:build"));
-  assert.match(claudeMd, /# Existing/);
-  assert.match(claudeMd, /crew:start/);
+  expect(result.mode).toBe("bootstrap");
+  expect(result.welcome.headline).toMatch(/Crew/);
+  expect(result.welcome.commands.includes("/crew:build")).toBeTruthy();
+  expect(claudeMd).toMatch(/# Existing/);
+  expect(claudeMd).toMatch(/crew:start/);
 });
 
 test("CLI claim and release manage repo-local claims", async () => {
@@ -49,9 +48,9 @@ test("CLI claim and release manage repo-local claims", async () => {
     "fullstack-dev",
     "src/example.ts"
   ]);
-  assert.equal(claimResponse.code, 0, "claim should exit with code 0");
+  expect(claimResponse.code, "claim should exit with code 0").toBe(0);
   const claimResult = JSON.parse(claimResponse.output);
-  assert.deepEqual(claimResult.claimed, ["src/example.ts"]);
+  expect(claimResult.claimed).toEqual(["src/example.ts"]);
 
   const conflictsResponse = await runCrew([
     "show-conflicts",
@@ -61,12 +60,12 @@ test("CLI claim and release manage repo-local claims", async () => {
     "lead-session",
     "src/example.ts"
   ]);
-  assert.equal(conflictsResponse.code, 0, "show-conflicts should exit with code 0");
+  expect(conflictsResponse.code, "show-conflicts should exit with code 0").toBe(0);
   const conflictsResult = JSON.parse(conflictsResponse.output);
-  assert.equal(conflictsResult.conflicts.length, 1);
-  assert.equal(conflictsResult.conflicts[0].owner, "fullstack-dev");
-  assert.equal(conflictsResult.owned.length, 0);
-  assert.equal(conflictsResult.available.length, 0);
+  expect(conflictsResult.conflicts.length).toBe(1);
+  expect(conflictsResult.conflicts[0].owner).toBe("fullstack-dev");
+  expect(conflictsResult.owned.length).toBe(0);
+  expect(conflictsResult.available.length).toBe(0);
 
   const ownedResponse = await runCrew([
     "show-conflicts",
@@ -77,15 +76,15 @@ test("CLI claim and release manage repo-local claims", async () => {
     "src/example.ts",
     "src/free.ts"
   ]);
-  assert.equal(ownedResponse.code, 0, "show-conflicts should exit with code 0");
+  expect(ownedResponse.code, "show-conflicts should exit with code 0").toBe(0);
   const ownedResult = JSON.parse(ownedResponse.output);
-  assert.equal(ownedResult.owned.length, 1);
-  assert.equal(ownedResult.owned[0].path, "src/example.ts");
-  assert.equal(ownedResult.conflicts.length, 0);
-  assert.deepEqual(ownedResult.available, [{ path: "src/free.ts" }]);
+  expect(ownedResult.owned.length).toBe(1);
+  expect(ownedResult.owned[0].path).toBe("src/example.ts");
+  expect(ownedResult.conflicts.length).toBe(0);
+  expect(ownedResult.available).toEqual([{ path: "src/free.ts" }]);
 
   const releaseResponse = await runCrew(["release", "--repo", repoPath, "src/example.ts"]);
-  assert.equal(releaseResponse.code, 0, "release should exit with code 0");
+  expect(releaseResponse.code, "release should exit with code 0").toBe(0);
   const releaseResult = JSON.parse(releaseResponse.output);
-  assert.deepEqual(releaseResult.released, ["src/example.ts"]);
+  expect(releaseResult.released).toEqual(["src/example.ts"]);
 });
diff --git a/crew/tests/cli-recall-block.test.mts b/crew/tests/cli-recall-block.test.mts
index d171e36e..c0f4b998 100644
--- a/crew/tests/cli-recall-block.test.mts
+++ b/crew/tests/cli-recall-block.test.mts
@@ -9,8 +9,7 @@
 // buildRecallBlock() plumbing (single value + comma-list -> OR array).
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 import { fileProvider } from "@astragenie/memory-provider";
@@ -23,9 +22,9 @@ import {
 test("CLI recall-block returns an empty block when no memory config exists", async () => {
   const repoPath = await makeTempDir("crew-cli-recall-block-none-");
   const { code, output } = await runCrew(["recall-block", "--repo", repoPath]);
-  assert.equal(code, 0);
+  expect(code).toBe(0);
   const result = JSON.parse(output);
-  assert.equal(result.block, "");
+  expect(result.block).toBe("");
 });
 
 test("CLI recall-block returns the bridge-format block scoped by --agent/--tags", async () => {
@@ -54,10 +53,10 @@ test("CLI recall-block returns the bridge-format block scoped by --agent/--tags"
     "--tags",
     "stack:typescript"
   ]);
-  assert.equal(code, 0);
+  expect(code).toBe(0);
   const result = JSON.parse(output);
-  assert.match(result.block, /## Prior context \(from astramem\)/);
-  assert.match(result.block, /prior review rejected a missing null guard/);
+  expect(result.block).toMatch(/## Prior context \(from astramem\)/);
+  expect(result.block).toMatch(/prior review rejected a missing null guard/);
 });
 
 test("CLI recall-block forwards a single --project value to the wire provider (#159)", async () => {
@@ -86,8 +85,8 @@ test("CLI recall-block forwards a single --project value to the wire provider (#
 
   try {
     const { code } = await runCrew(["recall-block", "--repo", repoPath, "--project", "dev-team"]);
-    assert.equal(code, 0);
-    assert.equal(capturedReq?.project, "dev-team");
+    expect(code).toBe(0);
+    expect(capturedReq?.project).toBe("dev-team");
   } finally {
     _setWireProvider(null);
     _resetResolveCache();
@@ -126,8 +125,8 @@ test("CLI recall-block forwards a comma-list --project as an OR array (#159)", a
       "--project",
       "dev-team,runner-plugin"
     ]);
-    assert.equal(code, 0);
-    assert.deepEqual(capturedReq?.project, ["dev-team", "runner-plugin"]);
+    expect(code).toBe(0);
+    expect(capturedReq?.project).toEqual(["dev-team", "runner-plugin"]);
   } finally {
     _setWireProvider(null);
     _resetResolveCache();
diff --git a/crew/tests/cli-resolve-model.test.mts b/crew/tests/cli-resolve-model.test.mts
index fc232909..62c2732f 100644
--- a/crew/tests/cli-resolve-model.test.mts
+++ b/crew/tests/cli-resolve-model.test.mts
@@ -7,8 +7,7 @@
 // itself lives in tests/resolve-model.test.ts.
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 
@@ -37,8 +36,8 @@ test("CLI resolve-model: toggle absent (no crew.json) defaults to routing-on —
   await writeLoopModelRouting(repoPath);
 
   const { code, output } = await runCrew(["resolve-model", "--repo", repoPath, "--phase", "build"]);
-  assert.equal(code, 0);
-  assert.equal(output, "sonnet");
+  expect(code).toBe(0);
+  expect(output).toBe("sonnet");
 });
 
 test("CLI resolve-model: toggle explicitly enabled — behaves as today, build resolves to sonnet", async () => {
@@ -47,8 +46,8 @@ test("CLI resolve-model: toggle explicitly enabled — behaves as today, build r
   await writeCrewFeatureToggle(repoPath, true);
 
   const { code, output } = await runCrew(["resolve-model", "--repo", repoPath, "--phase", "build"]);
-  assert.equal(code, 0);
-  assert.equal(output, "sonnet");
+  expect(code).toBe(0);
+  expect(output).toBe("sonnet");
 });
 
 test("CLI resolve-model: toggle disabled — prints the inherit sentinel (omit model:, agent frontmatter governs)", async () => {
@@ -57,8 +56,8 @@ test("CLI resolve-model: toggle disabled — prints the inherit sentinel (omit m
   await writeCrewFeatureToggle(repoPath, false);
 
   const { code, output } = await runCrew(["resolve-model", "--repo", repoPath, "--phase", "build"]);
-  assert.equal(code, 0);
-  assert.equal(output, "inherit");
+  expect(code).toBe(0);
+  expect(output).toBe("inherit");
 });
 
 test("CLI resolve-model: toggle disabled also bypasses the trivial-shape override", async () => {
@@ -75,14 +74,14 @@ test("CLI resolve-model: toggle disabled also bypasses the trivial-shape overrid
     "--shape",
     "doc-update"
   ]);
-  assert.equal(code, 0);
-  assert.equal(output, "inherit");
+  expect(code).toBe(0);
+  expect(output).toBe("inherit");
 });
 
 test("CLI resolve-model: no loop.json and no crew.json — default-on routing falls back to opus (no routing configured)", async () => {
   const repoPath = await makeTempDir("crew-cli-resolve-model-none-");
 
   const { code, output } = await runCrew(["resolve-model", "--repo", repoPath, "--phase", "build"]);
-  assert.equal(code, 0);
-  assert.equal(output, "opus");
+  expect(code).toBe(0);
+  expect(output).toBe("opus");
 });
diff --git a/crew/tests/cli-smoke.test.mts b/crew/tests/cli-smoke.test.mts
index b740363d..59f35ff0 100644
--- a/crew/tests/cli-smoke.test.mts
+++ b/crew/tests/cli-smoke.test.mts
@@ -1,23 +1,21 @@
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { execFile, cliPath, makeTempDir } from "./helpers/cli-fixtures.mjs";
 
 test("smoke: claims family (init)", async () => {
   const rootPath = await makeTempDir("crew-smoke-claims-");
   const repoPath = path.join(rootPath, "app");
 
-  const { stdout, stderr } = await execFile("node", [
-    "--experimental-strip-types",
+  const { stdout, stderr } = await execFile("bun", [
     cliPath,
     "init",
     "--repo",
     repoPath
   ]);
 
-  assert.match(stderr, /^(\s*)$/, "stderr should be empty on success");
+  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
-  assert.equal(result.mode, "init", "result should have mode=init");
+  expect(result.mode, "result should have mode=init").toBe("init");
 });
 
 test("smoke: approvals family (request-approval)", async () => {
@@ -25,10 +23,9 @@ test("smoke: approvals family (request-approval)", async () => {
   const repoPath = path.join(rootPath, "app");
 
   // Init first
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", repoPath]);
+  await execFile("bun", [cliPath, "init", "--repo", repoPath]);
 
-  const { stdout, stderr } = await execFile("node", [
-    "--experimental-strip-types",
+  const { stdout, stderr } = await execFile("bun", [
     cliPath,
     "request-approval",
     "--repo",
@@ -39,9 +36,9 @@ test("smoke: approvals family (request-approval)", async () => {
     "smoke"
   ]);
 
-  assert.match(stderr, /^(\s*)$/, "stderr should be empty on success");
+  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
-  assert.ok(result.id, "result should have an id field");
+  expect(result.id, "result should have an id field").toBeTruthy();
 });
 
 test("smoke: artifacts family (write-handoff)", async () => {
@@ -49,10 +46,9 @@ test("smoke: artifacts family (write-handoff)", async () => {
   const repoPath = path.join(rootPath, "app");
 
   // Init first
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", repoPath]);
+  await execFile("bun", [cliPath, "init", "--repo", repoPath]);
 
-  const { stdout, stderr } = await execFile("node", [
-    "--experimental-strip-types",
+  const { stdout, stderr } = await execFile("bun", [
     cliPath,
     "write-handoff",
     "--repo",
@@ -61,9 +57,9 @@ test("smoke: artifacts family (write-handoff)", async () => {
     "smoke"
   ]);
 
-  assert.match(stderr, /^(\s*)$/, "stderr should be empty on success");
+  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
-  assert.ok(result.path, "result should have path field");
+  expect(result.path, "result should have path field").toBeTruthy();
 });
 
 test("smoke: synthesis family (write-final-synthesis)", async () => {
@@ -72,12 +68,11 @@ test("smoke: synthesis family (write-final-synthesis)", async () => {
   const tempProjRoot = await makeTempDir("crew-smoke-proj-");
 
   // Init first
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", repoPath]);
+  await execFile("bun", [cliPath, "init", "--repo", repoPath]);
 
   const { stdout, stderr } = await execFile(
-    "node",
+    "bun",
     [
-      "--experimental-strip-types",
       cliPath,
       "write-final-synthesis",
       "--repo",
@@ -92,9 +87,9 @@ test("smoke: synthesis family (write-final-synthesis)", async () => {
     }
   );
 
-  assert.match(stderr, /^(\s*)$/, "stderr should be empty on success");
+  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
-  assert.ok(result.path, "result should have path field");
+  expect(result.path, "result should have path field").toBeTruthy();
 });
 
 test("smoke: cost family (cost-advise)", async () => {
@@ -103,17 +98,17 @@ test("smoke: cost family (cost-advise)", async () => {
   const tempProjRoot = await makeTempDir("crew-smoke-cost-proj-");
 
   // Init first
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", repoPath]);
+  await execFile("bun", [cliPath, "init", "--repo", repoPath]);
 
   const { stdout, stderr } = await execFile(
-    "node",
-    ["--experimental-strip-types", cliPath, "cost-advise", "--repo", repoPath],
+    "bun",
+    [cliPath, "cost-advise", "--repo", repoPath],
     {
       env: { ...process.env, CREW_PROJECTS_ROOT: tempProjRoot }
     }
   );
 
-  assert.match(stderr, /^(\s*)$/, "stderr should be empty on success");
+  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
-  assert.ok(result.artifactPath, "result should have artifactPath field");
+  expect(result.artifactPath, "result should have artifactPath field").toBeTruthy();
 });
diff --git a/crew/tests/cli-synthesis-cost.test.mts b/crew/tests/cli-synthesis-cost.test.mts
index bc11d90f..aa298ae5 100644
--- a/crew/tests/cli-synthesis-cost.test.mts
+++ b/crew/tests/cli-synthesis-cost.test.mts
@@ -1,8 +1,6 @@
 import fs from "node:fs/promises";
 import path from "node:path";
-import { before, after } from "node:test";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect, beforeAll, afterAll } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 
@@ -14,7 +12,7 @@ import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 let fixtureRoot: string;
 let savedProjectsRoot: string | undefined;
 
-before(async () => {
+beforeAll(async () => {
   savedProjectsRoot = process.env.CREW_PROJECTS_ROOT;
   fixtureRoot = await makeTempDir("crew-cost-fixture-");
   // Create a minimal fixture project with a session.jsonl that the cost scanner will find
@@ -36,7 +34,7 @@ before(async () => {
   process.env.CREW_PROJECTS_ROOT = fixtureRoot;
 });
 
-after(async () => {
+afterAll(async () => {
   if (savedProjectsRoot === undefined) delete process.env.CREW_PROJECTS_ROOT;
   else process.env.CREW_PROJECTS_ROOT = savedProjectsRoot;
   await fs.rm(fixtureRoot, { recursive: true, force: true });
@@ -73,8 +71,8 @@ test("CLI blocks final synthesis when workflow badges are still pending", async
     "--external-deltas",
     "none"
   ]);
-  assert.notEqual(rejectResult.code, 0, "should reject when review_required is pending");
-  assert.match(rejectResult.output, /pending: review_required/);
+  expect(rejectResult.code).not.toBe(0);
+  expect(rejectResult.output).toMatch(/pending: review_required/);
 
   await runCrew([
     "mark-badge",
@@ -97,10 +95,10 @@ test("CLI blocks final synthesis when workflow badges are still pending", async
     "--external-deltas",
     "none"
   ]);
-  assert.equal(allowResult.code, 0, "should allow when review is skipped with reason");
+  expect(allowResult.code).toBe(0);
   const finalResult = JSON.parse(allowResult.output);
   const finalBody = await fs.readFile(finalResult.path, "utf8");
-  assert.match(finalBody, /Allowed final synthesis/);
+  expect(finalBody).toMatch(/Allowed final synthesis/);
 });
 
 test("write-final-synthesis rejects when --external-deltas is missing", async () => {
@@ -127,8 +125,8 @@ test("write-final-synthesis rejects when --external-deltas is missing", async ()
     "--summary",
     "Should reject because --external-deltas absent"
   ]);
-  assert.notEqual(result.code, 0, "should reject when --external-deltas is missing");
-  assert.match(result.output, /requires --external-deltas/);
+  expect(result.code).not.toBe(0);
+  expect(result.output).toMatch(/requires --external-deltas/);
 });
 
 test("write-final-synthesis accepts --external-deltas none and renders the section", async () => {
@@ -166,11 +164,11 @@ test("write-final-synthesis accepts --external-deltas none and renders the secti
     "--external-deltas",
     "none"
   ]);
-  assert.equal(result.code, 0, "should succeed with --external-deltas none");
+  expect(result.code).toBe(0);
   const parsed = JSON.parse(result.output);
   const body = await fs.readFile(parsed.path, "utf8");
-  assert.match(body, /External Deltas/);
-  assert.match(body, /none/);
+  expect(body).toMatch(/External Deltas/);
+  expect(body).toMatch(/none/);
 });
 
 test("final-synthesis blocked when escalated_to_lead set; --force overrides", async () => {
@@ -207,8 +205,8 @@ test("final-synthesis blocked when escalated_to_lead set; --force overrides", as
     "--external-deltas",
     "none"
   ]);
-  assert.notEqual(blockResult.code, 0, "should reject when escalated_to_lead");
-  assert.match(blockResult.output, /escalated_to_lead|pending|escalated to lead/i);
+  expect(blockResult.code).not.toBe(0);
+  expect(blockResult.output).toMatch(/escalated_to_lead|pending|escalated to lead/i);
 
   const forceResult = await runCrew([
     "write-final-synthesis",
@@ -222,9 +220,9 @@ test("final-synthesis blocked when escalated_to_lead set; --force overrides", as
     "none",
     "--force"
   ]);
-  assert.equal(forceResult.code, 0, "should allow with --force flag");
+  expect(forceResult.code).toBe(0);
   const result = JSON.parse(forceResult.output);
-  assert.ok(result.path);
+  expect(result.path).toBeTruthy();
 });
 
 test("cost-advise accepts --title --feature --phase and slugs filename + emits frontmatter", async () => {
@@ -255,20 +253,12 @@ test("cost-advise accepts --title --feature --phase and slugs filename + emits f
     "--phase",
     "3"
   ]);
-  assert.equal(adviseResult.code, 0, "cost-advise should succeed");
+  expect(adviseResult.code).toBe(0);
   const adviseOutput = JSON.parse(adviseResult.output);
-  assert.ok(adviseOutput.artifactPath);
-  assert.match(
-    path.basename(adviseOutput.artifactPath),
-    /-cost-advise-phase3-feat021-slice36\.md$/,
-    "cost-advise filename includes the --title slug"
-  );
+  expect(adviseOutput.artifactPath).toBeTruthy();
+  expect(path.basename(adviseOutput.artifactPath)).toMatch(/-cost-advise-phase3-feat021-slice36\.md$/);
   const body = await fs.readFile(adviseOutput.artifactPath, "utf8");
-  assert.match(
-    body,
-    /^---\nphase: "3"\nfeature: FEAT-021\n---\n/,
-    "cost-advise body starts with phase/feature frontmatter"
-  );
+  expect(body).toMatch(/^---\nphase: "3"\nfeature: FEAT-021\n---\n/);
 });
 
 test("cost-slice embeds --feature and --phase in cost-report frontmatter", async () => {
@@ -290,11 +280,11 @@ test("cost-slice embeds --feature and --phase in cost-report frontmatter", async
     "beta",
     "--aggregate-all"
   ]);
-  assert.equal(result.code, 0, "cost-slice should succeed");
+  expect(result.code).toBe(0);
   const costResult = JSON.parse(result.output);
   const body = await fs.readFile(costResult.path, "utf8");
-  assert.match(body, /\nfeature: FEAT-100\n/);
-  assert.match(body, /\nphase: "beta"\n/);
+  expect(body).toMatch(/\nfeature: FEAT-100\n/);
+  expect(body).toMatch(/\nphase: "beta"\n/);
 });
 
 // ── FEAT-151: Per-dispatch breakdown section ──────────────────────────────
@@ -363,19 +353,15 @@ test("cost-slice renders ## Per-dispatch breakdown when dispatch log has matchin
       "--run-title",
       "dispatch-breakdown-test"
     ]);
-    assert.equal(result.code, 0, "cost-slice should succeed");
+    expect(result.code).toBe(0);
     const costResult = JSON.parse(result.output);
     const body = await fs.readFile(costResult.path, "utf8");
-    assert.match(body, /## Per-dispatch breakdown/, "should include dispatch section header");
-    assert.match(body, /crew:reviewer/, "should include the slower dispatch (crew:reviewer)");
-    assert.match(body, /13000ms/, "should show total wall-clock (5000 + 8000)");
-    assert.match(body, /typecheck/, "should include bash gate breakdown");
-    assert.match(body, /\| Skills \|/, "dispatch table should include Skills column header");
-    assert.match(
-      body,
-      /\| 2 \|/,
-      "dispatch table should include non-zero skill-count value (skillLoadCount=2)"
-    );
+    expect(body).toMatch(/## Per-dispatch breakdown/);
+    expect(body).toMatch(/crew:reviewer/);
+    expect(body).toMatch(/13000ms/);
+    expect(body).toMatch(/typecheck/);
+    expect(body).toMatch(/\| Skills \|/);
+    expect(body).toMatch(/\| 2 \|/);
   } finally {
     if (savedDispatchLog === undefined) delete process.env["CREW_DISPATCH_TIMING_LOG"];
     else process.env["CREW_DISPATCH_TIMING_LOG"] = savedDispatchLog;
diff --git a/crew/tests/cli-workflow.test.mts b/crew/tests/cli-workflow.test.mts
index 45bc041d..87f37fa9 100644
--- a/crew/tests/cli-workflow.test.mts
+++ b/crew/tests/cli-workflow.test.mts
@@ -1,8 +1,6 @@
 import fs from "node:fs/promises";
 import path from "node:path";
-import { before, after } from "node:test";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect, beforeAll, afterAll } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 
@@ -14,13 +12,13 @@ import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 let fixtureRoot: string;
 let savedProjectsRoot: string | undefined;
 
-before(async () => {
+beforeAll(async () => {
   savedProjectsRoot = process.env.CREW_PROJECTS_ROOT;
   fixtureRoot = await makeTempDir("crew-workflow-fixture-");
   process.env.CREW_PROJECTS_ROOT = fixtureRoot;
 });
 
-after(async () => {
+afterAll(async () => {
   if (savedProjectsRoot === undefined) delete process.env.CREW_PROJECTS_ROOT;
   else process.env.CREW_PROJECTS_ROOT = savedProjectsRoot;
   await fs.rm(fixtureRoot, { recursive: true, force: true });
@@ -129,38 +127,36 @@ test("CLI wake-up brief summarizes repo memory and state", async () => {
   ]);
 
   const wakeUpResult = await runCrew(["wake-up", "--repo", repoPath]);
-  assert.equal(wakeUpResult.code, 0, "wake-up should exit with code 0");
+  expect(wakeUpResult.code).toBe(0);
   const wakeUp = JSON.parse(wakeUpResult.output);
 
-  assert.equal(wakeUp.summary.memoryPolicy, "bounded-v1");
-  assert.equal(wakeUp.summary.activeClaims, 1);
-  assert.equal(wakeUp.summary.openApprovals, 1);
-  assert.equal(wakeUp.summary.hasActiveWorkflow, true);
-  assert.deepEqual(wakeUp.summary.pendingWorkflowBadges, ["review_required"]);
-  assert.equal(wakeUp.summary.hasDeploymentGuidance, true);
-  assert.equal(wakeUp.summary.repoMemoryFiles >= 1, true);
-  assert.equal(wakeUp.summary.hasRecentRunMemory, true);
-  assert.match(wakeUp.repoGuidance.deployment.title, /Wake-up deployment model/);
-  assert.equal(wakeUp.repoGuidance.deployment.discoveryStatus, "repo-derived");
-  assert.match(wakeUp.latestArtifacts.runBrief.title, /Wake-up test run/);
-  assert.match(wakeUp.latestArtifacts.validationPlan.title, /Wake-up validation plan/);
-  assert.match(wakeUp.latestArtifacts.validationResult.title, /Wake-up validation result/);
-  assert.match(wakeUp.latestArtifacts.deploymentCheck.title, /Wake-up deployment check/);
-  assert.match(wakeUp.memory.hot.repoGuidance.deployment.title, /Wake-up deployment model/);
-  assert.ok(
-    wakeUp.memory.hot.repoMemory.some((entry: { path: string }) => entry.path.endsWith("CLAUDE.md"))
-  );
-  assert.match(wakeUp.memory.hot.latestArtifacts.runBrief.title, /Wake-up test run/);
-  assert.match(wakeUp.memory.hot.latestArtifacts.validationPlan.title, /Wake-up validation plan/);
-  assert.match(wakeUp.memory.hot.latestArtifacts.deploymentCheck.title, /Wake-up deployment check/);
-  assert.match(wakeUp.memory.warm.validation.title, /Wake-up validation result/);
-  assert.equal(wakeUp.memory.hot.claims.length, 1);
-  assert.equal(wakeUp.memory.hot.openApprovals.length, 1);
-  assert.equal(wakeUp.memory.hot.workflow.currentRun.gates.review.status, "required");
-  assert.ok(wakeUp.memory.cold.archiveCounts.runs >= 1);
-  assert.ok(wakeUp.memory.cold.archiveCounts.validations >= 2);
-  assert.ok(wakeUp.memory.cold.archiveCounts.deployments >= 1);
-  assert.deepEqual(wakeUp.memory.cold.omittedByDefault, [
+  expect(wakeUp.summary.memoryPolicy).toBe("bounded-v1");
+  expect(wakeUp.summary.activeClaims).toBe(1);
+  expect(wakeUp.summary.openApprovals).toBe(1);
+  expect(wakeUp.summary.hasActiveWorkflow).toBe(true);
+  expect(wakeUp.summary.pendingWorkflowBadges).toEqual(["review_required"]);
+  expect(wakeUp.summary.hasDeploymentGuidance).toBe(true);
+  expect(wakeUp.summary.repoMemoryFiles >= 1).toBe(true);
+  expect(wakeUp.summary.hasRecentRunMemory).toBe(true);
+  expect(wakeUp.repoGuidance.deployment.title).toMatch(/Wake-up deployment model/);
+  expect(wakeUp.repoGuidance.deployment.discoveryStatus).toBe("repo-derived");
+  expect(wakeUp.latestArtifacts.runBrief.title).toMatch(/Wake-up test run/);
+  expect(wakeUp.latestArtifacts.validationPlan.title).toMatch(/Wake-up validation plan/);
+  expect(wakeUp.latestArtifacts.validationResult.title).toMatch(/Wake-up validation result/);
+  expect(wakeUp.latestArtifacts.deploymentCheck.title).toMatch(/Wake-up deployment check/);
+  expect(wakeUp.memory.hot.repoGuidance.deployment.title).toMatch(/Wake-up deployment model/);
+  expect(wakeUp.memory.hot.repoMemory.some((entry: { path: string }) => entry.path.endsWith("CLAUDE.md"))).toBeTruthy();
+  expect(wakeUp.memory.hot.latestArtifacts.runBrief.title).toMatch(/Wake-up test run/);
+  expect(wakeUp.memory.hot.latestArtifacts.validationPlan.title).toMatch(/Wake-up validation plan/);
+  expect(wakeUp.memory.hot.latestArtifacts.deploymentCheck.title).toMatch(/Wake-up deployment check/);
+  expect(wakeUp.memory.warm.validation.title).toMatch(/Wake-up validation result/);
+  expect(wakeUp.memory.hot.claims.length).toBe(1);
+  expect(wakeUp.memory.hot.openApprovals.length).toBe(1);
+  expect(wakeUp.memory.hot.workflow.currentRun.gates.review.status).toBe("required");
+  expect(wakeUp.memory.cold.archiveCounts.runs >= 1).toBeTruthy();
+  expect(wakeUp.memory.cold.archiveCounts.validations >= 2).toBeTruthy();
+  expect(wakeUp.memory.cold.archiveCounts.deployments >= 1).toBeTruthy();
+  expect(wakeUp.memory.cold.omittedByDefault).toEqual([
     "older_artifacts",
     "resolved_approvals",
     "full_event_log",
@@ -231,34 +227,30 @@ test("CLI brief-me synthesizes workflow state, git activity, and next step", asy
   await fs.writeFile(path.join(repoPath, "notes.txt"), "untracked\n");
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
 
-  assert.equal(brief.repoPath, repoPath);
-  assert.equal(brief.summary.isGitRepo, true);
-  assert.equal(brief.summary.hasActiveWorkflow, true);
-  assert.deepEqual(brief.summary.pendingWorkflowBadges, ["review_required"]);
-  assert.equal(brief.sections.currentObjective.title, "Brief me test run");
-  assert.equal(brief.sections.currentObjective.goal, "Exercise repo briefing");
-  assert.equal(brief.sections.recentActivity.git.workingTree.branch, "main");
-  assert.equal(brief.sections.recentActivity.git.workingTree.hasChanges, true);
-  assert.ok(brief.sections.recentActivity.git.workingTree.untrackedCount >= 1);
-  assert.ok(brief.sections.recentActivity.git.workingTree.changedPaths.includes("notes.txt"));
-  assert.equal(brief.sections.recentActivity.latestArtifacts[0].label.length > 0, true);
-  assert.ok(
-    brief.sections.recentActivity.repoMemory.some((entry: { path: string }) =>
+  expect(brief.repoPath).toBe(repoPath);
+  expect(brief.summary.isGitRepo).toBe(true);
+  expect(brief.summary.hasActiveWorkflow).toBe(true);
+  expect(brief.summary.pendingWorkflowBadges).toEqual(["review_required"]);
+  expect(brief.sections.currentObjective.title).toBe("Brief me test run");
+  expect(brief.sections.currentObjective.goal).toBe("Exercise repo briefing");
+  expect(brief.sections.recentActivity.git.workingTree.branch).toBe("main");
+  expect(brief.sections.recentActivity.git.workingTree.hasChanges).toBe(true);
+  expect(brief.sections.recentActivity.git.workingTree.untrackedCount >= 1).toBeTruthy();
+  expect(brief.sections.recentActivity.git.workingTree.changedPaths.includes("notes.txt")).toBeTruthy();
+  expect(brief.sections.recentActivity.latestArtifacts[0].label.length > 0).toBe(true);
+  expect(brief.sections.recentActivity.repoMemory.some((entry: { path: string }) =>
       entry.path.endsWith("CLAUDE.md")
-    )
-  );
-  assert.ok(
-    brief.sections.recentActivity.retrievalGuide.some((entry: { path: string }) =>
+    )).toBeTruthy();
+  expect(brief.sections.recentActivity.retrievalGuide.some((entry: { path: string }) =>
       entry.path.endsWith("CLAUDE.md")
-    )
-  );
-  assert.match(brief.sections.blockedOrMissing.join("\n"), /Independent review is still required/);
-  assert.match(brief.sections.importantReminders.join("\n"), /Working tree has/);
-  assert.match(brief.sections.recommendedNextStep, /Run independent review next/);
-  assert.ok(brief.sections.secondaryOptions.length >= 1);
+    )).toBeTruthy();
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/Independent review is still required/);
+  expect(brief.sections.importantReminders.join("\n")).toMatch(/Working tree has/);
+  expect(brief.sections.recommendedNextStep).toMatch(/Run independent review next/);
+  expect(brief.sections.secondaryOptions.length >= 1).toBeTruthy();
 });
 
 test("CLI brief-me is read-only for an uninitialized repo", async () => {
@@ -266,12 +258,12 @@ test("CLI brief-me is read-only for an uninitialized repo", async () => {
   await fs.writeFile(path.join(repoPath, "README.md"), "# Plain repo\n");
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
 
-  assert.equal(brief.repoPath, repoPath);
-  await assert.rejects(fs.access(path.join(repoPath, ".claude")));
-  assert.match(brief.sections.recommendedNextStep, /\/crew:adopt/);
+  expect(brief.repoPath).toBe(repoPath);
+  await expect(fs.access(path.join(repoPath, ".claude"))).rejects.toThrow();
+  expect(brief.sections.recommendedNextStep).toMatch(/\/crew:adopt/);
 });
 
 test("CLI brief-me surfaces failed gates before generic next steps", async () => {
@@ -305,14 +297,11 @@ test("CLI brief-me surfaces failed gates before generic next steps", async () =>
   ]);
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
 
-  assert.match(
-    brief.sections.blockedOrMissing.join("\n"),
-    /Independent review failed: Missing null guard/
-  );
-  assert.match(brief.sections.recommendedNextStep, /Address the failed review findings/);
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/Independent review failed: Missing null guard/);
+  expect(brief.sections.recommendedNextStep).toMatch(/Address the failed review findings/);
 });
 
 test("CLI workflow state tracks gate badges and artifact progress", async () => {
@@ -334,11 +323,11 @@ test("CLI workflow state tracks gate badges and artifact progress", async () =>
   await runCrew(["mark-badge", "--repo", repoPath, "--badge", "review_required"]);
 
   let workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   let workflow = JSON.parse(workflowResult.output);
-  assert.equal(workflow.summary.currentRun.gates.review.status, "required");
-  assert.deepEqual(workflow.summary.pendingBadges, ["review_required"]);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, []);
+  expect(workflow.summary.currentRun.gates.review.status).toBe("required");
+  expect(workflow.summary.pendingBadges).toEqual(["review_required"]);
+  expect(workflow.summary.missingArtifactWrites).toEqual([]);
 
   await runCrew([
     "write-review-result",
@@ -362,12 +351,12 @@ test("CLI workflow state tracks gate badges and artifact progress", async () =>
   ]);
 
   workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   workflow = JSON.parse(workflowResult.output);
-  assert.equal(workflow.summary.currentRun.gates.review.status, "passed");
-  assert.equal(workflow.summary.currentRun.gates.validation.status, "expected");
-  assert.deepEqual(workflow.summary.pendingBadges, ["validation_expected"]);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, []);
+  expect(workflow.summary.currentRun.gates.review.status).toBe("passed");
+  expect(workflow.summary.currentRun.gates.validation.status).toBe("expected");
+  expect(workflow.summary.pendingBadges).toEqual(["validation_expected"]);
+  expect(workflow.summary.missingArtifactWrites).toEqual([]);
 
   await runCrew([
     "write-validation-result",
@@ -380,20 +369,20 @@ test("CLI workflow state tracks gate badges and artifact progress", async () =>
   ]);
 
   workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   workflow = JSON.parse(workflowResult.output);
-  assert.equal(workflow.summary.currentRun.gates.validation.status, "passed");
-  assert.deepEqual(workflow.summary.pendingBadges, []);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, ["final_synthesis_missing"]);
+  expect(workflow.summary.currentRun.gates.validation.status).toBe("passed");
+  expect(workflow.summary.pendingBadges).toEqual([]);
+  expect(workflow.summary.missingArtifactWrites).toEqual(["final_synthesis_missing"]);
 
   await runCrew(["mark-badge", "--repo", repoPath, "--badge", "dev_deploy_expected"]);
 
   workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   workflow = JSON.parse(workflowResult.output);
-  assert.equal(workflow.summary.currentRun.gates.deployment.dev.status, "expected");
-  assert.deepEqual(workflow.summary.pendingBadges, ["dev_deploy_expected"]);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, []);
+  expect(workflow.summary.currentRun.gates.deployment.dev.status).toBe("expected");
+  expect(workflow.summary.pendingBadges).toEqual(["dev_deploy_expected"]);
+  expect(workflow.summary.missingArtifactWrites).toEqual([]);
 
   await runCrew([
     "write-deployment-check",
@@ -414,11 +403,11 @@ test("CLI workflow state tracks gate badges and artifact progress", async () =>
   ]);
 
   workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   workflow = JSON.parse(workflowResult.output);
-  assert.equal(workflow.summary.currentRun.gates.deployment.dev.status, "passed");
-  assert.deepEqual(workflow.summary.pendingBadges, []);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, ["final_synthesis_missing"]);
+  expect(workflow.summary.currentRun.gates.deployment.dev.status).toBe("passed");
+  expect(workflow.summary.pendingBadges).toEqual([]);
+  expect(workflow.summary.missingArtifactWrites).toEqual(["final_synthesis_missing"]);
 });
 
 test("CLI workflow state and brief-me surface missing artifact write-backs after a completed phase", async () => {
@@ -448,19 +437,16 @@ test("CLI workflow state and brief-me surface missing artifact write-backs after
   ]);
 
   const workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   const workflow = JSON.parse(workflowResult.output);
-  assert.deepEqual(workflow.summary.pendingBadges, []);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, ["review_result_missing"]);
+  expect(workflow.summary.pendingBadges).toEqual([]);
+  expect(workflow.summary.missingArtifactWrites).toEqual(["review_result_missing"]);
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
-  assert.match(
-    brief.sections.blockedOrMissing.join("\n"),
-    /review artifact write-back is still missing/
-  );
-  assert.match(brief.sections.recommendedNextStep, /Write the review-result artifact now/);
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/review artifact write-back is still missing/);
+  expect(brief.sections.recommendedNextStep).toMatch(/Write the review-result artifact now/);
 });
 
 test("CLI workflow state and brief-me surface missing run briefs after meaningful progress starts", async () => {
@@ -478,23 +464,23 @@ test("CLI workflow state and brief-me surface missing run briefs after meaningfu
   ]);
 
   const workflowResult = await runCrew(["show-workflow-state", "--repo", repoPath]);
-  assert.equal(workflowResult.code, 0, "show-workflow-state should exit with code 0");
+  expect(workflowResult.code).toBe(0);
   const workflow = JSON.parse(workflowResult.output);
-  assert.deepEqual(workflow.summary.pendingBadges, ["review_required"]);
-  assert.deepEqual(workflow.summary.missingArtifactWrites, []);
+  expect(workflow.summary.pendingBadges).toEqual(["review_required"]);
+  expect(workflow.summary.missingArtifactWrites).toEqual([]);
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
-  assert.match(brief.sections.blockedOrMissing.join("\n"), /Independent review is still required/);
-  assert.match(brief.sections.recommendedNextStep, /Run independent review next/);
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/Independent review is still required/);
+  expect(brief.sections.recommendedNextStep).toMatch(/Run independent review next/);
 });
 
 test("CLI subcommand help works without error", async () => {
   const helpResult = await runCrew(["write-review-result", "--help"]);
-  assert.equal(helpResult.code, 0, "help should exit with code 0");
-  assert.match(helpResult.output, /write-review-result/);
-  assert.match(helpResult.output, /--decision|--verdict/);
+  expect(helpResult.code).toBe(0);
+  expect(helpResult.output).toMatch(/write-review-result/);
+  expect(helpResult.output).toMatch(/--decision|--verdict/);
 });
 
 test("CLI install-global writes managed global memory into HOME", async () => {
@@ -508,15 +494,15 @@ test("CLI install-global writes managed global memory into HOME", async () => {
     process.env.USERPROFILE = homePath;
 
     const installResult = await runCrew(["install-global"]);
-    assert.equal(installResult.code, 0, "install-global should exit with code 0");
+    expect(installResult.code).toBe(0);
     const result = JSON.parse(installResult.output);
 
-    assert.equal(result.mode, "install-global");
-    assert.match(result.welcome.headline, /Crew/);
-    assert.ok(result.welcome.commands.includes("/crew:init"));
-    assert.equal(result.global.hasGlobalMemory, true);
-    assert.equal(result.global.globalMemoryStale, false);
-    assert.deepEqual(result.writes, [
+    expect(result.mode).toBe("install-global");
+    expect(result.welcome.headline).toMatch(/Crew/);
+    expect(result.welcome.commands.includes("/crew:init")).toBeTruthy();
+    expect(result.global.hasGlobalMemory).toBe(true);
+    expect(result.global.globalMemoryStale).toBe(false);
+    expect(result.writes).toEqual([
       "~/.claude/crew/constitution.md",
       "~/.claude/crew/workflow.md",
       "~/.claude/crew/metadata.json",
@@ -524,9 +510,9 @@ test("CLI install-global writes managed global memory into HOME", async () => {
     ]);
 
     const repeatResult = await runCrew(["install-global"]);
-    assert.equal(repeatResult.code, 0, "install-global repeat should exit with code 0");
+    expect(repeatResult.code).toBe(0);
     const repeatOutput = JSON.parse(repeatResult.output);
-    assert.deepEqual(repeatOutput.writes, []);
+    expect(repeatOutput.writes).toEqual([]);
   } finally {
     // Restore original env vars
     if (savedHome !== undefined) process.env.HOME = savedHome;
@@ -566,9 +552,9 @@ test("mark-badge blocked persists note + blockedBy", async () => {
   const stateContent = await fs.readFile(stateFile, "utf8");
   const state = JSON.parse(stateContent);
 
-  assert.equal(state.currentRun.gates.blocked.status, "blocked");
-  assert.equal(state.currentRun.gates.blocked.note, "Waiting on upstream API spec");
-  assert.equal(state.currentRun.gates.blocked.blockedBy, "ART-2025-12-12-spec-q");
+  expect(state.currentRun.gates.blocked.status).toBe("blocked");
+  expect(state.currentRun.gates.blocked.note).toBe("Waiting on upstream API spec");
+  expect(state.currentRun.gates.blocked.blockedBy).toBe("ART-2025-12-12-spec-q");
 });
 
 test("mark-badge escalated_to_lead persists note", async () => {
@@ -599,11 +585,8 @@ test("mark-badge escalated_to_lead persists note", async () => {
   const stateContent = await fs.readFile(stateFile, "utf8");
   const state = JSON.parse(stateContent);
 
-  assert.equal(state.currentRun.gates.escalation.status, "escalated");
-  assert.equal(
-    state.currentRun.gates.escalation.note,
-    "Scope ambiguous; need stakeholder sign-off"
-  );
+  expect(state.currentRun.gates.escalation.status).toBe("escalated");
+  expect(state.currentRun.gates.escalation.note).toBe("Scope ambiguous; need stakeholder sign-off");
 });
 
 test("brief-me surfaces blocked in pending badges", async () => {
@@ -623,14 +606,11 @@ test("brief-me surfaces blocked in pending badges", async () => {
   await runCrew(["mark-badge", "--repo", repoPath, "--badge", "blocked", "--note", "Reason"]);
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
 
-  assert.ok(
-    (brief.pendingBadges || brief.workflow?.pendingBadges || []).includes("blocked") ||
-      JSON.stringify(brief).includes("blocked"),
-    "brief-me output should mention blocked"
-  );
+  expect((brief.pendingBadges || brief.workflow?.pendingBadges || []).includes("blocked") ||
+      JSON.stringify(brief).includes("blocked")).toBeTruthy();
 });
 
 test("brief-me reports routingTableStale=false when file recent or absent", async () => {
@@ -639,22 +619,22 @@ test("brief-me reports routingTableStale=false when file recent or absent", asyn
 
   // file absent
   let briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   let brief = JSON.parse(briefResult.output);
   let summary = brief.summary || {};
-  assert.equal(summary.routingTablePresent, false);
-  assert.equal(summary.routingTableStale, false);
+  expect(summary.routingTablePresent).toBe(false);
+  expect(summary.routingTableStale).toBe(false);
 
   // file present + fresh
   await fs.mkdir(path.join(repoPath, "docs"), { recursive: true });
   await fs.writeFile(path.join(repoPath, "docs", "routing-table.md"), "# Routing table\n");
 
   briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   brief = JSON.parse(briefResult.output);
   summary = brief.summary || {};
-  assert.equal(summary.routingTablePresent, true);
-  assert.equal(summary.routingTableStale, false);
+  expect(summary.routingTablePresent).toBe(true);
+  expect(summary.routingTableStale).toBe(false);
 });
 
 test("brief-me reports routingTableStale=true when mtime > 30 days old", async () => {
@@ -667,15 +647,12 @@ test("brief-me reports routingTableStale=true when mtime > 30 days old", async (
   await fs.utimes(filePath, oldTime, oldTime);
 
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
-  assert.equal(briefResult.code, 0, "brief-me should exit with code 0");
+  expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
   const summary = brief.summary || {};
-  assert.equal(summary.routingTableStale, true);
-  assert.ok(summary.routingTableAgeDays >= 30);
+  expect(summary.routingTableStale).toBe(true);
+  expect(summary.routingTableAgeDays >= 30).toBeTruthy();
 
   const reminders = brief.sections?.importantReminders || [];
-  assert.ok(
-    reminders.some((r: string) => r.includes("Routing table") && r.includes("stale")),
-    "reminders should mention routing-table staleness"
-  );
+  expect(reminders.some((r: string) => r.includes("Routing table") && r.includes("stale"))).toBeTruthy();
 });
diff --git a/crew/tests/collect-hook-health.test.mts b/crew/tests/collect-hook-health.test.mts
index 3adbe715..2437db36 100644
--- a/crew/tests/collect-hook-health.test.mts
+++ b/crew/tests/collect-hook-health.test.mts
@@ -1,6 +1,5 @@
 // tests/collect-hook-health.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -19,10 +18,7 @@ import { collectHookHealth } from "../scripts/lib/briefing/collect.mjs";
 test("collectHookHealth returns empty hooks array when no events.jsonl", async () => {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hook-health-empty-"));
   const result = await collectHookHealth(dir);
-  assert.deepEqual(
-    result.hooks.map((h) => h.errorCount24h),
-    [0, 0, 0, 0]
-  );
+  expect(result.hooks.map((h) => h.errorCount24h)).toEqual([0, 0, 0, 0]);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -38,10 +34,10 @@ test("collectHookHealth counts hook_error events per hook in last 24h", async ()
   ]);
   const result = await collectHookHealth(dir);
   const ps = result.hooks.find((h) => h.name === "preflight-shell");
-  assert.ok(ps, "must include preflight-shell");
-  assert.equal(ps.errorCount24h, 2);
+  expect(ps).toBeTruthy();
+  expect(ps.errorCount24h).toBe(2);
   const crr = result.hooks.find((h) => h.name === "check-redundant-read");
-  assert.ok(!crr || crr.errorCount24h === 0, "old events must be excluded");
+  expect(!crr || crr.errorCount24h === 0).toBeTruthy();
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -52,8 +48,8 @@ test("collectHookHealth marks hooks with errors as yellow", async () => {
   ]);
   const result = await collectHookHealth(dir);
   const h = result.hooks.find((h) => h.name === "record-read-content");
-  assert.ok(h, "must find hook");
-  assert.equal(h.status, "yellow");
+  expect(h).toBeTruthy();
+  expect(h.status).toBe("yellow");
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -64,6 +60,6 @@ test("collectHookHealth returns green status for hooks with no errors", async ()
   ]);
   const result = await collectHookHealth(dir);
   const noErrors = result.hooks.filter((h) => h.errorCount24h === 0);
-  noErrors.forEach((h) => assert.equal(h.status, "green"));
+  noErrors.forEach((h) => expect(h.status).toBe("green"));
   await fs.rm(dir, { recursive: true, force: true });
 });
diff --git a/crew/tests/collect-model-compliance.test.mts b/crew/tests/collect-model-compliance.test.mts
index 794f932a..8c2b36b9 100644
--- a/crew/tests/collect-model-compliance.test.mts
+++ b/crew/tests/collect-model-compliance.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import { computeModelCompliance } from "../scripts/lib/briefing/collect.mjs";
 
@@ -7,7 +6,7 @@ import { computeModelCompliance } from "../scripts/lib/briefing/collect.mjs";
 // briefing/collect.mjs). All test data below uses that scale.
 
 test("computeModelCompliance returns null for empty cost reports", () => {
-  assert.equal(computeModelCompliance([]), null);
+  expect(computeModelCompliance([])).toBe(null);
 });
 
 test("computeModelCompliance averages sonnetPct across reports", () => {
@@ -26,9 +25,9 @@ test("computeModelCompliance averages sonnetPct across reports", () => {
     }
   ];
   const result = computeModelCompliance(reports);
-  assert.ok(result, "must return result");
-  assert.ok(Math.abs(result.sonnetPct - 70) < 1, `expected ~70, got ${result.sonnetPct}`);
-  assert.equal(result.sliceCount, 2);
+  expect(result).toBeTruthy();
+  expect(Math.abs(result.sonnetPct - 70) < 1).toBeTruthy();
+  expect(result.sliceCount).toBe(2);
 });
 
 test("computeModelCompliance flags non-compliant when sonnetPct < 60", () => {
@@ -47,7 +46,7 @@ test("computeModelCompliance flags non-compliant when sonnetPct < 60", () => {
     }
   ];
   const result = computeModelCompliance(reports);
-  assert.equal(result!.compliant, false);
+  expect(result!.compliant).toBe(false);
 });
 
 test("computeModelCompliance flags compliant when sonnetPct >= 60", () => {
@@ -60,15 +59,15 @@ test("computeModelCompliance flags compliant when sonnetPct >= 60", () => {
     }
   ];
   const result = computeModelCompliance(reports);
-  assert.equal(result!.compliant, true);
+  expect(result!.compliant).toBe(true);
 });
 
 test("computeModelCompliance skips reports without modelMix", () => {
   const reports = [{ modelMix: null }, { modelMix: [{ model: "claude-sonnet-4-6", usdPct: 75 }] }];
   const result = computeModelCompliance(reports);
-  assert.ok(result !== null);
-  assert.equal(result.sliceCount, 1);
-  assert.equal(result.sonnetPct, 75);
+  expect(result !== null).toBeTruthy();
+  expect(result.sliceCount).toBe(1);
+  expect(result.sonnetPct).toBe(75);
 });
 
 test("computeModelCompliance returns 0 sonnetPct when no sonnet entry present", () => {
@@ -78,6 +77,6 @@ test("computeModelCompliance returns 0 sonnetPct when no sonnet entry present",
     }
   ];
   const result = computeModelCompliance(reports);
-  assert.equal(result!.sonnetPct, 0);
-  assert.equal(result!.compliant, false);
+  expect(result!.sonnetPct).toBe(0);
+  expect(result!.compliant).toBe(false);
 });
diff --git a/crew/tests/cost-advisor-grade.test.mts b/crew/tests/cost-advisor-grade.test.mts
index 25d7acaa..e1e9f55b 100644
--- a/crew/tests/cost-advisor-grade.test.mts
+++ b/crew/tests/cost-advisor-grade.test.mts
@@ -3,8 +3,7 @@
 // Written BEFORE the implementation. All tests should fail initially until
 // computeGrade is exported and grade is wired into buildCostAdvisor.
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { computeGrade } from "../scripts/lib/cost-advisor.mjs";
 
 // Grade thresholds (from SLICE-05 spec):
@@ -27,7 +26,7 @@ test("computeGrade returns A when all metrics are excellent", () => {
     fileRereadCount: 2,
     toolFailureRate: 0.01 // 1%
   };
-  assert.equal(computeGrade(target), "A");
+  expect(computeGrade(target)).toBe("A");
 });
 
 test("computeGrade returns A at exact A-band boundaries", () => {
@@ -38,7 +37,7 @@ test("computeGrade returns A at exact A-band boundaries", () => {
     fileRereadCount: 3,
     toolFailureRate: 0.03 // 3%
   };
-  assert.equal(computeGrade(target), "A");
+  expect(computeGrade(target)).toBe("A");
 });
 
 // ---------------------------------------------------------------------------
@@ -52,7 +51,7 @@ test("computeGrade returns B when cache hit is in B band (95-97%)", () => {
     fileRereadCount: 2,
     toolFailureRate: 0.01
   };
-  assert.equal(computeGrade(target), "B");
+  expect(computeGrade(target)).toBe("B");
 });
 
 test("computeGrade returns B at exact B-band boundaries", () => {
@@ -63,7 +62,7 @@ test("computeGrade returns B at exact B-band boundaries", () => {
     fileRereadCount: 8,
     toolFailureRate: 0.05 // 5%
   };
-  assert.equal(computeGrade(target), "B");
+  expect(computeGrade(target)).toBe("B");
 });
 
 // ---------------------------------------------------------------------------
@@ -77,7 +76,7 @@ test("computeGrade returns C when good cache but compactions in C band", () => {
     fileRereadCount: 2, // A
     toolFailureRate: 0.01 // A
   };
-  assert.equal(computeGrade(target), "C");
+  expect(computeGrade(target)).toBe("C");
 });
 
 test("computeGrade returns C at exact C-band boundaries", () => {
@@ -88,7 +87,7 @@ test("computeGrade returns C at exact C-band boundaries", () => {
     fileRereadCount: 15,
     toolFailureRate: 0.08 // 8%
   };
-  assert.equal(computeGrade(target), "C");
+  expect(computeGrade(target)).toBe("C");
 });
 
 // ---------------------------------------------------------------------------
@@ -102,7 +101,7 @@ test("computeGrade returns D when cache hit is in D band", () => {
     fileRereadCount: 2,
     toolFailureRate: 0.01
   };
-  assert.equal(computeGrade(target), "D");
+  expect(computeGrade(target)).toBe("D");
 });
 
 test("computeGrade returns D at exact D-band boundaries", () => {
@@ -113,7 +112,7 @@ test("computeGrade returns D at exact D-band boundaries", () => {
     fileRereadCount: 30,
     toolFailureRate: 0.15 // 15%
   };
-  assert.equal(computeGrade(target), "D");
+  expect(computeGrade(target)).toBe("D");
 });
 
 // ---------------------------------------------------------------------------
@@ -127,7 +126,7 @@ test("computeGrade returns F when all metrics are terrible", () => {
     fileRereadCount: 50, // above D max of 30
     toolFailureRate: 0.3 // 30%, above D max of 15%
   };
-  assert.equal(computeGrade(target), "F");
+  expect(computeGrade(target)).toBe("F");
 });
 
 test("computeGrade returns F when cache hit is just below D threshold", () => {
@@ -138,7 +137,7 @@ test("computeGrade returns F when cache hit is just below D threshold", () => {
     fileRereadCount: 2,
     toolFailureRate: 0.01
   };
-  assert.equal(computeGrade(target), "F");
+  expect(computeGrade(target)).toBe("F");
 });
 
 // ---------------------------------------------------------------------------
@@ -152,7 +151,7 @@ test("worst band wins: single F metric downgrades A-level everything else to F",
     fileRereadCount: 0, // A
     toolFailureRate: 0.5 // F (50%)
   };
-  assert.equal(computeGrade(target), "F");
+  expect(computeGrade(target)).toBe("F");
 });
 
 test("worst band wins: single D metric downgrades otherwise-A grade to D", () => {
@@ -163,7 +162,7 @@ test("worst band wins: single D metric downgrades otherwise-A grade to D", () =>
     fileRereadCount: 1, // A
     toolFailureRate: 0.01 // A
   };
-  assert.equal(computeGrade(target), "D");
+  expect(computeGrade(target)).toBe("D");
 });
 
 test("worst band wins: B cache + C subagents = C overall", () => {
@@ -174,7 +173,7 @@ test("worst band wins: B cache + C subagents = C overall", () => {
     fileRereadCount: 2, // A
     toolFailureRate: 0.02 // A
   };
-  assert.equal(computeGrade(target), "C");
+  expect(computeGrade(target)).toBe("C");
 });
 
 // ---------------------------------------------------------------------------
@@ -189,7 +188,7 @@ test("computeGrade handles zero cacheHitPct (no data) as F", () => {
     toolFailureRate: 0
   };
   // cacheHitPct=0 is below the D threshold of 80%, so should grade F
-  assert.equal(computeGrade(target), "F");
+  expect(computeGrade(target)).toBe("F");
 });
 
 test("computeGrade handles missing optional fields without throwing", () => {
@@ -201,5 +200,5 @@ test("computeGrade handles missing optional fields without throwing", () => {
     fileRereadCount: 0
     // toolFailureRate absent
   };
-  assert.doesNotThrow(() => computeGrade(target));
+  expect(() => computeGrade(target)).not.toThrow();
 });
diff --git a/crew/tests/cost-advisor-trends.test.mts b/crew/tests/cost-advisor-trends.test.mts
index 3ecf70c0..fb1107c6 100644
--- a/crew/tests/cost-advisor-trends.test.mts
+++ b/crew/tests/cost-advisor-trends.test.mts
@@ -3,8 +3,7 @@
 // Written BEFORE the implementation. All tests should fail initially until
 // detectTrends is exported from cost-advisor.mjs.
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { detectTrends } from "../scripts/lib/cost-advisor.mjs";
 import type { SummaryRecord } from "../scripts/lib/cost-advisor-rules.mjs";
 
@@ -67,7 +66,7 @@ test("detectTrends: compaction-drift fires when compactionCount increases across
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(ids.includes("compaction-drift"), `Expected compaction-drift, got: ${ids.join(", ")}`);
+  expect(ids.includes("compaction-drift")).toBeTruthy();
 });
 
 test("detectTrends: compaction-drift does NOT fire when compactionCount is stable", () => {
@@ -78,7 +77,7 @@ test("detectTrends: compaction-drift does NOT fire when compactionCount is stabl
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(!ids.includes("compaction-drift"), "Should not fire on stable compaction counts");
+  expect(!ids.includes("compaction-drift")).toBeTruthy();
 });
 
 test("detectTrends: compaction-drift does NOT fire when compactionCount decreases", () => {
@@ -89,7 +88,7 @@ test("detectTrends: compaction-drift does NOT fire when compactionCount decrease
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(!ids.includes("compaction-drift"), "Should not fire on decreasing compaction counts");
+  expect(!ids.includes("compaction-drift")).toBeTruthy();
 });
 
 // ---------------------------------------------------------------------------
@@ -105,7 +104,7 @@ test("detectTrends: subagent-creep fires when subagentDispatches increases acros
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(ids.includes("subagent-creep"), `Expected subagent-creep, got: ${ids.join(", ")}`);
+  expect(ids.includes("subagent-creep")).toBeTruthy();
 });
 
 test("detectTrends: subagent-creep does NOT fire when subagentDispatches is stable", () => {
@@ -116,7 +115,7 @@ test("detectTrends: subagent-creep does NOT fire when subagentDispatches is stab
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(!ids.includes("subagent-creep"), "Should not fire on stable subagent dispatch counts");
+  expect(!ids.includes("subagent-creep")).toBeTruthy();
 });
 
 // ---------------------------------------------------------------------------
@@ -132,7 +131,7 @@ test("detectTrends: cost-regression fires when current usd is >20% above median
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(ids.includes("cost-regression"), `Expected cost-regression, got: ${ids.join(", ")}`);
+  expect(ids.includes("cost-regression")).toBeTruthy();
 });
 
 test("detectTrends: cost-regression does NOT fire when current usd is within 20% of median", () => {
@@ -144,7 +143,7 @@ test("detectTrends: cost-regression does NOT fire when current usd is within 20%
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(!ids.includes("cost-regression"), "Should not fire when increase is <=20%");
+  expect(!ids.includes("cost-regression")).toBeTruthy();
 });
 
 test("detectTrends: cost-regression does NOT fire when current usd is cheaper than median", () => {
@@ -155,7 +154,7 @@ test("detectTrends: cost-regression does NOT fire when current usd is cheaper th
   ];
   const trends = detectTrends(reports);
   const ids = trends.map((t) => t.id);
-  assert.ok(!ids.includes("cost-regression"), "Should not fire when cost decreases");
+  expect(!ids.includes("cost-regression")).toBeTruthy();
 });
 
 // ---------------------------------------------------------------------------
@@ -169,7 +168,7 @@ test("detectTrends: returns empty array when all metrics are stable and cost is
     makeReport({ compactionCount: 1, subagentDispatches: 2, usd: 10 })
   ];
   const trends = detectTrends(reports);
-  assert.equal(trends.length, 0, `Expected no trends, got: ${trends.map((t) => t.id).join(", ")}`);
+  expect(trends.length).toBe(0);
 });
 
 // ---------------------------------------------------------------------------
@@ -177,9 +176,9 @@ test("detectTrends: returns empty array when all metrics are stable and cost is
 // ---------------------------------------------------------------------------
 
 test("detectTrends: returns empty array when fewer than 3 reports provided", () => {
-  assert.deepEqual(detectTrends([]), []);
-  assert.deepEqual(detectTrends([makeReport()]), []);
-  assert.deepEqual(detectTrends([makeReport(), makeReport()]), []);
+  expect(detectTrends([])).toEqual([]);
+  expect(detectTrends([makeReport()])).toEqual([]);
+  expect(detectTrends([makeReport(), makeReport()])).toEqual([]);
 });
 
 // ---------------------------------------------------------------------------
@@ -193,21 +192,12 @@ test("detectTrends: each finding has id, severity, message, suggestion fields",
     makeReport({ compactionCount: 1 })
   ];
   const trends = detectTrends(reports);
-  assert.ok(trends.length > 0, "Expected at least one trend finding");
+  expect(trends.length > 0).toBeTruthy();
   for (const t of trends) {
-    assert.ok(typeof t.id === "string" && t.id.length > 0, "id must be non-empty string");
-    assert.ok(
-      ["low", "medium", "high"].includes(t.severity),
-      `severity must be low/medium/high, got ${t.severity}`
-    );
-    assert.ok(
-      typeof t.message === "string" && t.message.length > 0,
-      "message must be non-empty string"
-    );
-    assert.ok(
-      typeof t.suggestion === "string" && t.suggestion.length > 0,
-      "suggestion must be non-empty string"
-    );
+    expect(typeof t.id === "string" && t.id.length > 0).toBeTruthy();
+    expect(["low", "medium", "high"].includes(t.severity)).toBeTruthy();
+    expect(typeof t.message === "string" && t.message.length > 0).toBeTruthy();
+    expect(typeof t.suggestion === "string" && t.suggestion.length > 0).toBeTruthy();
   }
 });
 
@@ -223,8 +213,8 @@ test("detectTrends: compaction-drift has severity medium", () => {
   ];
   const trends = detectTrends(reports);
   const drift = trends.find((t) => t.id === "compaction-drift");
-  assert.ok(drift, "Expected compaction-drift finding");
-  assert.equal(drift.severity, "medium");
+  expect(drift).toBeTruthy();
+  expect(drift.severity).toBe("medium");
 });
 
 test("detectTrends: subagent-creep has severity medium", () => {
@@ -235,14 +225,14 @@ test("detectTrends: subagent-creep has severity medium", () => {
   ];
   const trends = detectTrends(reports);
   const creep = trends.find((t) => t.id === "subagent-creep");
-  assert.ok(creep, "Expected subagent-creep finding");
-  assert.equal(creep.severity, "medium");
+  expect(creep).toBeTruthy();
+  expect(creep.severity).toBe("medium");
 });
 
 test("detectTrends: cost-regression has severity high", () => {
   const reports = [makeReport({ usd: 25 }), makeReport({ usd: 10 }), makeReport({ usd: 10 })];
   const trends = detectTrends(reports);
   const reg = trends.find((t) => t.id === "cost-regression");
-  assert.ok(reg, "Expected cost-regression finding");
-  assert.equal(reg.severity, "high");
+  expect(reg).toBeTruthy();
+  expect(reg.severity).toBe("high");
 });
diff --git a/crew/tests/cost-hygiene-decide.test.mts b/crew/tests/cost-hygiene-decide.test.mts
index 4667f9e2..dd5f2bb9 100644
--- a/crew/tests/cost-hygiene-decide.test.mts
+++ b/crew/tests/cost-hygiene-decide.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { decide } from "../scripts/lib/cost-hygiene/decide.mjs";
 
 const T0 = "2026-05-28T18:00:00.000Z";
@@ -14,8 +13,8 @@ test("first read of path (no stored entry) → pass", () => {
     currentSize: 1000,
     now: NOW
   });
-  assert.equal(result.action, "pass");
-  assert.equal(result.message, null);
+  expect(result.action).toBe("pass");
+  expect(result.message).toBe(null);
 });
 
 test("reread, mtime unchanged, content stored → warn with quoted content", () => {
@@ -34,14 +33,14 @@ test("reread, mtime unchanged, content stored → warn with quoted content", ()
     currentSize: 100,
     now: NOW
   });
-  assert.equal(result.action, "warn");
-  assert.match(result.message!, /<system-reminder>/);
-  assert.match(result.message!, /already loaded/);
-  assert.match(result.message!, /1 time/);
-  assert.match(result.message!, /Prior content:/);
-  assert.match(result.message!, /hello world/);
-  assert.match(result.message!, /Do not re-issue the Read/);
-  assert.match(result.message!, /<\/system-reminder>/);
+  expect(result.action).toBe("warn");
+  expect(result.message!).toMatch(/<system-reminder>/);
+  expect(result.message!).toMatch(/already loaded/);
+  expect(result.message!).toMatch(/1 time/);
+  expect(result.message!).toMatch(/Prior content:/);
+  expect(result.message!).toMatch(/hello world/);
+  expect(result.message!).toMatch(/Do not re-issue the Read/);
+  expect(result.message!).toMatch(/<\/system-reminder>/);
 });
 
 test("reread, mtime newer than stored → pass (Q7 edit exception)", () => {
@@ -60,8 +59,8 @@ test("reread, mtime newer than stored → pass (Q7 edit exception)", () => {
     currentSize: 200,
     now: NOW
   });
-  assert.equal(result.action, "pass");
-  assert.equal(result.message, null);
+  expect(result.action).toBe("pass");
+  expect(result.message).toBe(null);
 });
 
 test("5th reread, content stored → warn with read_count 4 in message", () => {
@@ -80,8 +79,8 @@ test("5th reread, content stored → warn with read_count 4 in message", () => {
     currentSize: 100,
     now: NOW
   });
-  assert.equal(result.action, "warn");
-  assert.match(result.message!, /4 times/);
+  expect(result.action).toBe("warn");
+  expect(result.message!).toMatch(/4 times/);
 });
 
 test("reread with content omitted (>50KB) → warn says content omitted with KB", () => {
@@ -100,8 +99,8 @@ test("reread with content omitted (>50KB) → warn says content omitted with KB"
     currentSize: 87234,
     now: NOW
   });
-  assert.equal(result.action, "warn");
-  assert.match(result.message!, /content omitted, file size 87 KB/);
+  expect(result.action).toBe("warn");
+  expect(result.message!).toMatch(/content omitted, file size 87 KB/);
 });
 
 test("reread, mtime unchanged + size changed → warn (mtime is the gate)", () => {
@@ -120,7 +119,7 @@ test("reread, mtime unchanged + size changed → warn (mtime is the gate)", () =
     currentSize: 150,
     now: NOW
   });
-  assert.equal(result.action, "warn");
+  expect(result.action).toBe("warn");
 });
 
 // ─── FEAT-156: Edit verify-loop checks ──────────────────────────────────────
@@ -147,9 +146,9 @@ test("FEAT-156: Read within 30s of successful Edit (unchanged mtime) → warn (v
     currentSize: 100,
     now: READ_WITHIN_WINDOW
   });
-  assert.equal(result.action, "warn");
-  assert.match(result.message!, /Edit\/Write'd/);
-  assert.match(result.message!, /force.*true/);
+  expect(result.action).toBe("warn");
+  expect(result.message!).toMatch(/Edit\/Write'd/);
+  expect(result.message!).toMatch(/force.*true/);
 });
 
 test("FEAT-156: Read with mtime newer than last edit → pass (file modified externally)", () => {
@@ -170,7 +169,7 @@ test("FEAT-156: Read with mtime newer than last edit → pass (file modified ext
     currentSize: 100,
     now: READ_WITHIN_WINDOW
   });
-  assert.equal(result.action, "pass");
+  expect(result.action).toBe("pass");
 });
 
 test("FEAT-156: Read with force: true → pass (override)", () => {
@@ -192,7 +191,7 @@ test("FEAT-156: Read with force: true → pass (override)", () => {
     now: READ_WITHIN_WINDOW,
     force: true
   });
-  assert.equal(result.action, "pass");
+  expect(result.action).toBe("pass");
 });
 
 test("FEAT-156: Read after window elapsed → pass (no verify-loop warn)", () => {
@@ -213,7 +212,7 @@ test("FEAT-156: Read after window elapsed → pass (no verify-loop warn)", () =>
     currentSize: 100,
     now: READ_OUTSIDE_WINDOW
   });
-  assert.equal(result.action, "pass");
+  expect(result.action).toBe("pass");
 });
 
 test("FEAT-156: Read of file with prior read + recent edit → verify-loop wins (more specific)", () => {
@@ -234,6 +233,6 @@ test("FEAT-156: Read of file with prior read + recent edit → verify-loop wins
     currentSize: 100,
     now: READ_WITHIN_WINDOW
   });
-  assert.equal(result.action, "warn");
-  assert.match(result.message!, /Edit\/Write'd/);
+  expect(result.action).toBe("warn");
+  expect(result.message!).toMatch(/Edit\/Write'd/);
 });
diff --git a/crew/tests/cost-hygiene-hook.test.mts b/crew/tests/cost-hygiene-hook.test.mts
index 73449a43..104fa23d 100644
--- a/crew/tests/cost-hygiene-hook.test.mts
+++ b/crew/tests/cost-hygiene-hook.test.mts
@@ -1,6 +1,5 @@
-// tests/cost-hygiene-hook.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+// tests/cost-hygiene-hook.test.mts
+import { test, expect } from "bun:test";
 import { spawn } from "node:child_process";
 import fs from "node:fs/promises";
 import os from "node:os";
@@ -9,7 +8,7 @@ import url from "node:url";
 import { runCheckRedundantReadHook } from "../hooks/lib/check-redundant-read.mjs";
 
 const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
-const HOOK_PATH = path.join(__dirname, "..", "hooks", "check-redundant-read.ts");
+const HOOK_PATH = path.join(__dirname, "..", "hooks", "check-redundant-read.mts");
 
 async function makeRepo() {
   return await fs.mkdtemp(path.join(os.tmpdir(), "cost-hygiene-hook-"));
@@ -35,7 +34,7 @@ function runHookSpawn(
   stdin: string
 ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
   return new Promise((resolve) => {
-    const proc = spawn("node", ["--experimental-strip-types", HOOK_PATH], {
+    const proc = spawn("bun", [HOOK_PATH], {
       env: { ...process.env }
     });
     let stdout = "";
@@ -58,8 +57,8 @@ test("hook exits 0 silently on missing file (default-on)", async () => {
         cwd: repo
       })
     );
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -78,11 +77,11 @@ test("hook fires and writes state (default-on)", async () => {
         cwd: repo
       })
     );
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     const stateFile = path.join(repo, ".claude", "state", "cost-hygiene", "s_default.json");
     const raw = await fs.readFile(stateFile, "utf8");
     const state = JSON.parse(raw);
-    assert.equal(state.entries[file].read_count, 1);
+    expect(state.entries[file].read_count).toBe(1);
   } finally {
     await cleanup(repo);
   }
@@ -101,12 +100,12 @@ test("hook with first-read stdin emits empty stdout, writes state", async () =>
         cwd: repo
       })
     );
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
     const stateFile = path.join(repo, ".claude", "state", "cost-hygiene", "s2.json");
     const raw = await fs.readFile(stateFile, "utf8");
     const state = JSON.parse(raw);
-    assert.equal(state.entries[file].read_count, 1);
+    expect(state.entries[file].read_count).toBe(1);
   } finally {
     await cleanup(repo);
   }
@@ -136,11 +135,11 @@ test("smoke: hook with reread stdin emits decision + systemMessage with content"
 
     // Second read attempt → should warn
     const result = await runHookSpawn(stdin);
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
-    assert.match(parsed.systemMessage, /<system-reminder>/);
-    assert.match(parsed.systemMessage, /snowflake/);
+    expect(parsed.decision).toBe("approve");
+    expect(parsed.systemMessage).toMatch(/<system-reminder>/);
+    expect(parsed.systemMessage).toMatch(/snowflake/);
   } finally {
     await cleanup(repo);
   }
@@ -148,15 +147,15 @@ test("smoke: hook with reread stdin emits decision + systemMessage with content"
 
 test("hook with malformed stdin exits 0 silently", async () => {
   const result = await runHook("not json at all");
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
-const POST_HOOK_PATH = path.join(__dirname, "..", "hooks", "record-read-content.ts");
+const POST_HOOK_PATH = path.join(__dirname, "..", "hooks", "record-read-content.mts");
 
 function runPostHook(stdin: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
   return new Promise((resolve) => {
-    const proc = spawn("node", ["--experimental-strip-types", POST_HOOK_PATH], {
+    const proc = spawn("bun", [POST_HOOK_PATH], {
       env: { ...process.env }
     });
     let stdout = "";
@@ -190,12 +189,12 @@ test("post-hook captures Read tool result content into state", async () => {
       cwd: repo
     });
     const result = await runPostHook(postStdin);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
     const state = JSON.parse(
       await fs.readFile(path.join(repo, ".claude", "state", "cost-hygiene", "s4.json"), "utf8")
     );
-    assert.equal(state.entries[file].content, "wisp");
+    expect(state.entries[file].content).toBe("wisp");
   } finally {
     await cleanup(repo);
   }
@@ -222,11 +221,11 @@ test("post-hook fires by default and writes state", async () => {
       cwd: repo
     });
     const result = await runPostHook(postStdin);
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     const state = JSON.parse(
       await fs.readFile(path.join(repo, ".claude", "state", "cost-hygiene", "s5.json"), "utf8")
     );
-    assert.equal(state.entries[file].content, "bloom");
+    expect(state.entries[file].content).toBe("bloom");
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/cost-hygiene-state.test.mts b/crew/tests/cost-hygiene-state.test.mts
index bf5debe5..886edbf3 100644
--- a/crew/tests/cost-hygiene-state.test.mts
+++ b/crew/tests/cost-hygiene-state.test.mts
@@ -1,6 +1,5 @@
-// tests/cost-hygiene-state.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+// tests/cost-hygiene-state.test.mts
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -24,11 +23,11 @@ test("loadSession returns empty shape when file absent", async () => {
   const repo = await makeRepo();
   try {
     const state = await loadSession(repo, "sess-abc");
-    assert.equal(state.session_id, "sess-abc");
-    assert.equal(state.total_bytes, 0);
-    assert.deepEqual(state.entries, {});
-    assert.ok(state.first_seen);
-    assert.ok(state.last_seen);
+    expect(state.session_id).toBe("sess-abc");
+    expect(state.total_bytes).toBe(0);
+    expect(state.entries).toEqual({});
+    expect(state.first_seen).toBeTruthy();
+    expect(state.last_seen).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -50,9 +49,9 @@ test("saveSession then loadSession round-trip preserves entries", async () => {
     state.total_bytes = 5;
     await saveSession(repo, "sess-xyz", state);
     const reloaded = await loadSession(repo, "sess-xyz");
-    assert.equal(reloaded.entries["/abs/foo"]!.read_count, 2);
-    assert.equal(reloaded.entries["/abs/foo"]!.content, "hello");
-    assert.equal(reloaded.total_bytes, 5);
+    expect(reloaded.entries["/abs/foo"]!.read_count).toBe(2);
+    expect(reloaded.entries["/abs/foo"]!.content).toBe("hello");
+    expect(reloaded.total_bytes).toBe(5);
   } finally {
     await cleanup(repo);
   }
@@ -66,7 +65,7 @@ test("saveSession atomic — no .tmp.<pid> left on success", async () => {
     const dir = path.join(repo, ".claude", "state", "cost-hygiene");
     const files = await fs.readdir(dir);
     const tempFiles = files.filter((f) => f.includes(".tmp."));
-    assert.deepEqual(tempFiles, []);
+    expect(tempFiles).toEqual([]);
   } finally {
     await cleanup(repo);
   }
@@ -83,8 +82,8 @@ test("recordRead increments read_count, updates last_read_at, preserves first_re
       100,
       "2026-05-28T18:00:00.000Z"
     );
-    assert.equal(state.entries["/abs/p"]!.read_count, 1);
-    assert.equal(state.entries["/abs/p"]!.first_read_at, "2026-05-28T18:00:00.000Z");
+    expect(state.entries["/abs/p"]!.read_count).toBe(1);
+    expect(state.entries["/abs/p"]!.first_read_at).toBe("2026-05-28T18:00:00.000Z");
 
     state = recordRead(
       state,
@@ -93,9 +92,9 @@ test("recordRead increments read_count, updates last_read_at, preserves first_re
       100,
       "2026-05-28T18:05:00.000Z"
     );
-    assert.equal(state.entries["/abs/p"]!.read_count, 2);
-    assert.equal(state.entries["/abs/p"]!.first_read_at, "2026-05-28T18:00:00.000Z");
-    assert.equal(state.entries["/abs/p"]!.last_read_at, "2026-05-28T18:05:00.000Z");
+    expect(state.entries["/abs/p"]!.read_count).toBe(2);
+    expect(state.entries["/abs/p"]!.first_read_at).toBe("2026-05-28T18:00:00.000Z");
+    expect(state.entries["/abs/p"]!.last_read_at).toBe("2026-05-28T18:05:00.000Z");
   } finally {
     await cleanup(repo);
   }
@@ -107,9 +106,9 @@ test("recordReadContent stores content when <=50KB, updates total_bytes", async
     let state = await loadSession(repo, "sess-cnt");
     state = recordRead(state, "/abs/p", "2026-05-28T17:00:00.000Z", 5, "2026-05-28T18:00:00.000Z");
     state = recordReadContent(state, "/abs/p", "hello");
-    assert.equal(state.entries["/abs/p"]!.content, "hello");
-    assert.equal(state.entries["/abs/p"]!.content_bytes, 5);
-    assert.equal(state.total_bytes, 5);
+    expect(state.entries["/abs/p"]!.content).toBe("hello");
+    expect(state.entries["/abs/p"]!.content_bytes).toBe(5);
+    expect(state.total_bytes).toBe(5);
   } finally {
     await cleanup(repo);
   }
@@ -128,9 +127,9 @@ test("recordReadContent caps content at 50KB, sets content:null when oversized",
       "2026-05-28T18:00:00.000Z"
     );
     state = recordReadContent(state, "/abs/p", big);
-    assert.equal(state.entries["/abs/p"]!.content, null);
-    assert.equal(state.entries["/abs/p"]!.content_bytes, 0); // noUncheckedIndexedAccess
-    assert.equal(state.total_bytes, 0);
+    expect(state.entries["/abs/p"]!.content).toBe(null);
+    expect(state.entries["/abs/p"]!.content_bytes).toBe(0); // noUncheckedIndexedAccess
+    expect(state.total_bytes).toBe(0);
   } finally {
     await cleanup(repo);
   }
@@ -174,9 +173,9 @@ test("evictLRU drops least-recently-read on session-cap overflow", () => {
   };
   const protectedPath = "/c";
   const result = evictLRU(state, protectedPath);
-  assert.ok(!("/a" in result.entries), "least-recently-read /a should be evicted");
-  assert.ok("/c" in result.entries, "currently-being-recorded /c must not be evicted");
-  assert.ok(result.total_bytes <= 2_000_000);
+  expect(!("/a" in result.entries)).toBeTruthy();
+  expect("/c" in result.entries).toBeTruthy();
+  expect(result.total_bytes <= 2_000_000).toBeTruthy();
 });
 
 test("evictLRU never drops the entry being recorded even if it is the LRU", () => {
@@ -207,7 +206,7 @@ test("evictLRU never drops the entry being recorded even if it is the LRU", () =
     }
   };
   const result = evictLRU(state, "/oldest");
-  assert.ok("/oldest" in result.entries, "protected /oldest must survive eviction");
+  expect("/oldest" in result.entries).toBeTruthy();
 });
 
 test("loadSession on corrupt JSON returns empty + does not throw", async () => {
@@ -217,8 +216,8 @@ test("loadSession on corrupt JSON returns empty + does not throw", async () => {
     await fs.mkdir(dir, { recursive: true });
     await fs.writeFile(path.join(dir, "sess-corrupt.json"), "{not valid json}", "utf8");
     const state = await loadSession(repo, "sess-corrupt");
-    assert.equal(state.session_id, "sess-corrupt");
-    assert.deepEqual(state.entries, {});
+    expect(state.session_id).toBe("sess-corrupt");
+    expect(state.entries).toEqual({});
   } finally {
     await cleanup(repo);
   }
@@ -237,8 +236,8 @@ test("loadSession cleans up stale .tmp.<pid> files older than 60s", async () =>
     await fs.writeFile(fresh, "{}", "utf8");
     await loadSession(repo, "sess-x");
     const after = await fs.readdir(dir);
-    assert.ok(!after.includes("sess-x.json.tmp.99999"), "stale tmp should be deleted");
-    assert.ok(after.includes("sess-x.json.tmp.88888"), "fresh tmp should remain");
+    expect(!after.includes("sess-x.json.tmp.99999")).toBeTruthy();
+    expect(after.includes("sess-x.json.tmp.88888")).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/cost-report-agent-stats-section.test.mts b/crew/tests/cost-report-agent-stats-section.test.mts
index c5cd1737..4ad09af0 100644
--- a/crew/tests/cost-report-agent-stats-section.test.mts
+++ b/crew/tests/cost-report-agent-stats-section.test.mts
@@ -2,8 +2,7 @@
  * Tests for the ## Agent stats (rolling) cost-report section (FEAT-159 SLICE-B).
  * Covers renderCostReportAgentStats + the regex extension in decisionSet.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { writeArtifact } from "../scripts/lib/artifacts/write.mjs";
 import fs from "node:fs/promises";
 import path from "node:path";
@@ -34,9 +33,9 @@ test("AC-T1: empty agentStats omits the section entirely", async () => {
     outcome: null,
     agentStats: []
   });
-  assert.ok(r.ok, "write should succeed");
+  expect(r.ok).toBeTruthy();
   const md = await fs.readFile((r.value as { path: string }).path, "utf-8");
-  assert.ok(!md.includes("## Agent stats (rolling)"), "section must not appear when rows empty");
+  expect(!md.includes("## Agent stats (rolling)")).toBeTruthy();
   await fs.rm(tmp, { recursive: true, force: true });
 });
 
@@ -58,23 +57,23 @@ test("AC-T2: 7 agents → table shows top-5 by sample_count desc with header + s
     outcome: null,
     agentStats: rows
   });
-  assert.ok(r.ok);
+  expect(r.ok).toBeTruthy();
   const md = await fs.readFile((r.value as { path: string }).path, "utf-8");
-  assert.ok(md.includes("## Agent stats (rolling)"), "section header present");
-  assert.ok(md.includes("Window: `last_n_slices_10`"), "window slug present");
-  assert.ok(md.includes("| Agent | N |"), "table header present");
-  assert.ok(md.includes("|---|---:|"), "alignment row present");
+  expect(md.includes("## Agent stats (rolling)")).toBeTruthy();
+  expect(md.includes("Window: `last_n_slices_10`")).toBeTruthy();
+  expect(md.includes("| Agent | N |")).toBeTruthy();
+  expect(md.includes("|---|---:|")).toBeTruthy();
 
   // Top 5 by sample_count desc: 12, 9, 8, 7, 4 → fullstack-dev, document-writer, reviewer, verifier, backend-dev
-  assert.ok(md.includes("| crew:fullstack-dev | 12 |"), "rank 1");
-  assert.ok(md.includes("| crew:document-writer | 9 |"), "rank 2");
-  assert.ok(md.includes("| crew:reviewer | 8 |"), "rank 3");
-  assert.ok(md.includes("| crew:verifier | 7 |"), "rank 4");
-  assert.ok(md.includes("| crew:backend-dev | 4 |"), "rank 5");
+  expect(md.includes("| crew:fullstack-dev | 12 |")).toBeTruthy();
+  expect(md.includes("| crew:document-writer | 9 |")).toBeTruthy();
+  expect(md.includes("| crew:reviewer | 8 |")).toBeTruthy();
+  expect(md.includes("| crew:verifier | 7 |")).toBeTruthy();
+  expect(md.includes("| crew:backend-dev | 4 |")).toBeTruthy();
 
   // Below top-5 → must NOT appear
-  assert.ok(!md.includes("| crew:frontend-dev |"), "rank 6 excluded");
-  assert.ok(!md.includes("| crew:architect |"), "rank 7 excluded");
+  expect(!md.includes("| crew:frontend-dev |")).toBeTruthy();
+  expect(!md.includes("| crew:architect |")).toBeTruthy();
 
   await fs.rm(tmp, { recursive: true, force: true });
 });
@@ -93,13 +92,13 @@ test("AC-T3: section ordering — agent-stats appears AFTER Per-dispatch breakdo
     },
     agentStats: [mkRow("crew:builder", 5)]
   });
-  assert.ok(r.ok);
+  expect(r.ok).toBeTruthy();
   const md = await fs.readFile((r.value as { path: string }).path, "utf-8");
   const dispatchIdx = md.indexOf("## Per-dispatch breakdown");
   const statsIdx = md.indexOf("## Agent stats (rolling)");
-  assert.ok(dispatchIdx > 0, "Per-dispatch breakdown section present");
-  assert.ok(statsIdx > 0, "Agent stats section present");
-  assert.ok(statsIdx > dispatchIdx, "agent-stats MUST follow Per-dispatch");
+  expect(dispatchIdx > 0).toBeTruthy();
+  expect(statsIdx > 0).toBeTruthy();
+  expect(statsIdx > dispatchIdx).toBeTruthy();
   await fs.rm(tmp, { recursive: true, force: true });
 });
 
@@ -139,7 +138,7 @@ test("AC-T4: regex extension — `rejected` review decision counts toward rework
     validationsDir: path.join(tmp, "validations-empty")
   });
   const builder = rows.find((r) => r.agent === "crew:builder");
-  assert.ok(builder, "builder row present");
-  assert.equal(builder.review_rework_rate, 1, "rejected counts toward rework (1 of 1)");
+  expect(builder).toBeTruthy();
+  expect(builder!.review_rework_rate).toBe(1);
   await fs.rm(tmp, { recursive: true, force: true });
 });
diff --git a/crew/tests/cost-report-emission.test.mts b/crew/tests/cost-report-emission.test.mts
index d6bab8f9..7d2ffcc4 100644
--- a/crew/tests/cost-report-emission.test.mts
+++ b/crew/tests/cost-report-emission.test.mts
@@ -5,8 +5,7 @@
 // AC-3: single-source emission does NOT write an aggregate file
 // AC-4: legacy cost-report files continue to parse (no-change test)
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -98,11 +97,11 @@ test("cost-report-slice: single-source emission writes only the slice file", asy
     });
 
     const files = await listCostDir(tmpDir);
-    assert.equal(files.length, 1, `Expected 1 file, got: ${files.join(", ")}`);
-    assert.ok(
+    expect(files.length, `Expected 1 file, got: ${files.join(", ")}`).toBe(1);
+    expect(
       files[0]!.includes("-cost-report-slice-"),
       `Expected filename to include '-cost-report-slice-', got: ${files[0]!}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -120,11 +119,10 @@ test("cost-report-slice: single-source emission does NOT write an aggregate file
 
     const files = await listCostDir(tmpDir);
     const aggregateFiles = files.filter((f) => f.includes("-cost-report-aggregate-"));
-    assert.equal(
+    expect(
       aggregateFiles.length,
-      0,
       `Expected no aggregate file; found: ${aggregateFiles.join(", ")}`
-    );
+    ).toBe(0);
   } finally {
     await cleanup(tmpDir);
   }
@@ -145,15 +143,15 @@ test("cost-report-slice: slice file has aggregate_all: false in frontmatter", as
     });
 
     const files = await listCostDir(tmpDir);
-    assert.equal(files.length, 1, "Expected 1 file");
+    expect(files.length, "Expected 1 file").toBe(1);
     const content = await fs.readFile(
       path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
       "utf8"
     );
-    assert.ok(
+    expect(
       content.includes("aggregate_all: false"),
       `Expected 'aggregate_all: false' in frontmatter.\nContent:\n${content.slice(0, 400)}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -174,10 +172,10 @@ test("cost-report-slice: slice file has source_count: 1 in frontmatter", async (
       path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
       "utf8"
     );
-    assert.ok(
+    expect(
       content.includes("source_count: 1"),
       `Expected 'source_count: 1' in frontmatter.\nContent:\n${content.slice(0, 400)}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -198,11 +196,11 @@ test("cost-report-aggregate: multi-source emission writes aggregate file", async
     });
 
     const files = await listCostDir(tmpDir);
-    assert.equal(files.length, 1, `Expected 1 file, got: ${files.join(", ")}`);
-    assert.ok(
+    expect(files.length, `Expected 1 file, got: ${files.join(", ")}`).toBe(1);
+    expect(
       files[0]!.includes("-cost-report-aggregate-"),
       `Expected filename to include '-cost-report-aggregate-', got: ${files[0]!}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -223,10 +221,10 @@ test("cost-report-aggregate: aggregate file has aggregate_all: true in frontmatt
       path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
       "utf8"
     );
-    assert.ok(
+    expect(
       content.includes("aggregate_all: true"),
       `Expected 'aggregate_all: true' in frontmatter.\nContent:\n${content.slice(0, 400)}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -247,10 +245,10 @@ test("cost-report-aggregate: aggregate file has correct source_count in frontmat
       path.join(tmpDir, ".claude", "artifacts", "crew", "cost", files[0]!),
       "utf8"
     );
-    assert.ok(
+    expect(
       content.includes("source_count: 2"),
       `Expected 'source_count: 2' in frontmatter.\nContent:\n${content.slice(0, 400)}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -271,12 +269,12 @@ test("cost-report: legacy kind still emits a file with -cost-report- in name", a
     });
 
     const files = await listCostDir(tmpDir);
-    assert.equal(files.length, 1, `Expected 1 file, got: ${files.join(", ")}`);
+    expect(files.length, `Expected 1 file, got: ${files.join(", ")}`).toBe(1);
     // Legacy pattern: includes -cost-report- but NOT -cost-report-slice- or -cost-report-aggregate-
-    assert.ok(
+    expect(
       files[0]!.includes("-cost-report-"),
       `Expected '-cost-report-' in filename, got: ${files[0]!}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -308,20 +306,20 @@ for (const kind of ["cost-report", "cost-report-slice", "cost-report-aggregate"]
         outcome: null,
         updatePath: historicalPath
       });
-      assert.ok(result.ok, "writeArtifact should still succeed");
+      expect(result.ok, "writeArtifact should still succeed").toBeTruthy();
+      if (!result.ok) throw new Error("unreachable: asserted above");
 
       // Historical file is byte-preserved — not clobbered.
       const after = await fs.readFile(historicalPath, "utf8");
-      assert.equal(after, SENTINEL, "historical cost-report file must be preserved intact");
+      expect(after, "historical cost-report file must be preserved intact").toBe(SENTINEL);
 
       // The emit still landed — as a NEW timestamped file, not at updatePath.
-      assert.notEqual(
+      expect(
         result.value.path,
-        historicalPath,
         "cost-report emit must mint a fresh path, never reuse updatePath"
-      );
+      ).not.toBe(historicalPath);
       const files = await listCostDir(tmpDir);
-      assert.equal(files.length, 2, `Expected historical + fresh file, got: ${files.join(", ")}`);
+      expect(files.length, `Expected historical + fresh file, got: ${files.join(", ")}`).toBe(2);
     } finally {
       await cleanup(tmpDir);
     }
@@ -412,26 +410,29 @@ test("maybeEmitCostReport: stale/wide currentRun does not touch historical cost-
       );
       const result = await maybeEmitCostReport(tmpDir, { runTitle: "stale-currentrun-emit" });
 
-      assert.ok(result, "emitter should return a result for a stale-but-present currentRun");
-      assert.ok(
+      expect(
+        result,
+        "emitter should return a result for a stale-but-present currentRun"
+      ).toBeTruthy();
+      expect(
         !("error" in (result as Record<string, unknown>)),
         `emitter errored: ${JSON.stringify(result)}`
-      );
+      ).toBeTruthy();
 
       // Both historical files are byte-preserved — the stale/wide window
       // never rewrote them, and never rewrote them into lossy stubs.
       for (const [i, p] of historicalPaths.entries()) {
         const after = await fs.readFile(p, "utf8");
-        assert.equal(after, sentinels[i]!, `historical file ${p} must be preserved intact`);
+        expect(after, `historical file ${p} must be preserved intact`).toBe(sentinels[i]!);
       }
 
       // The emit landed as a fresh file alongside the historical set, not by
       // touching it.
       const filesAfter = await listCostDir(tmpDir);
-      assert.ok(
+      expect(
         filesAfter.length > historicalPaths.length,
         `expected at least one fresh file alongside the ${historicalPaths.length} historical files, got: ${filesAfter.join(", ")}`
-      );
+      ).toBeTruthy();
     });
   } finally {
     await cleanup(tmpDir);
@@ -467,21 +468,20 @@ test("maybeEmitCostReport: normal (fresh) currentRun emission preserves historic
       );
       const result = await maybeEmitCostReport(tmpDir, { runTitle: "fresh-currentrun-emit" });
 
-      assert.ok(result, "emitter should return a result for a fresh currentRun");
-      assert.ok(
+      expect(result, "emitter should return a result for a fresh currentRun").toBeTruthy();
+      expect(
         !("error" in (result as Record<string, unknown>)),
         `emitter errored: ${JSON.stringify(result)}`
-      );
+      ).toBeTruthy();
 
       const after = await fs.readFile(historicalPath, "utf8");
-      assert.equal(after, sentinel, "unrelated historical file must be untouched");
+      expect(after, "unrelated historical file must be untouched").toBe(sentinel);
 
       const filesAfter = await listCostDir(tmpDir);
-      assert.equal(
+      expect(
         filesAfter.length,
-        2,
         `expected historical + exactly one fresh report, got: ${filesAfter.join(", ")}`
-      );
+      ).toBe(2);
     });
   } finally {
     await cleanup(tmpDir);
diff --git a/crew/tests/cost-report-role-breakdown.test.mts b/crew/tests/cost-report-role-breakdown.test.mts
index 8476adc7..f45f2555 100644
--- a/crew/tests/cost-report-role-breakdown.test.mts
+++ b/crew/tests/cost-report-role-breakdown.test.mts
@@ -4,8 +4,7 @@
 // AC-2: cost-report artifact renders the role breakdown section
 // AC-3: briefing rollup aggregates role dispatches across recent slices
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -138,19 +137,20 @@ test("cost-report-slice: renders subagent_dispatches_by_role section when presen
     });
 
     const content = await readCostReport(tmpDir);
-    assert.ok(content, "Expected cost report to be written");
-    assert.ok(
+    expect(content, "Expected cost report to be written").toBeTruthy();
+    if (!content) throw new Error("Expected cost report to be written");
+    expect(
       content.includes("subagent_dispatches_by_role"),
       `Expected 'subagent_dispatches_by_role' section in body.\nContent:\n${content.slice(0, 800)}`
-    );
-    assert.ok(
+    ).toBeTruthy();
+    expect(
       content.includes("crew:fullstack-dev: 3"),
       `Expected 'crew:fullstack-dev: 3' in role breakdown.\nContent:\n${content.slice(0, 1000)}`
-    );
-    assert.ok(
+    ).toBeTruthy();
+    expect(
       content.includes("crew:reviewer: 1"),
       `Expected 'crew:reviewer: 1' in role breakdown.\nContent:\n${content.slice(0, 1000)}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -167,11 +167,12 @@ test("cost-report-slice: omits role breakdown section when subagentDispatchesByR
     });
 
     const content = await readCostReport(tmpDir);
-    assert.ok(content, "Expected cost report to be written");
-    assert.ok(
+    expect(content, "Expected cost report to be written").toBeTruthy();
+    if (!content) throw new Error("Expected cost report to be written");
+    expect(
       !content.includes("subagent_dispatches_by_role"),
       `Expected no role breakdown section when field absent.\nContent:\n${content.slice(0, 800)}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -188,15 +189,16 @@ test("cost-report-slice: renders entries sorted by count descending", async () =
     });
 
     const content = await readCostReport(tmpDir);
-    assert.ok(content, "Expected cost report to be written");
+    expect(content, "Expected cost report to be written").toBeTruthy();
+    if (!content) throw new Error("Expected cost report to be written");
 
     const builderIdx = content.indexOf("crew:fullstack-dev: 3");
     const reviewerIdx = content.indexOf("crew:reviewer: 1");
-    assert.ok(builderIdx > -1 && reviewerIdx > -1, "Expected both role entries");
-    assert.ok(
+    expect(builderIdx > -1 && reviewerIdx > -1, "Expected both role entries").toBeTruthy();
+    expect(
       builderIdx < reviewerIdx,
       `Expected crew:fullstack-dev (3) to appear before crew:reviewer (1) (sorted by count desc)`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -323,22 +325,19 @@ test("collectRecentCosts: aggregates roleDispatches across recent slices", async
     const result = await collectRecentCosts(tmpDir, 5);
     const roleDispatches = result.roleDispatches;
 
-    assert.ok(roleDispatches, `Expected roleDispatches in rollup result`);
-    assert.equal(
+    expect(roleDispatches, `Expected roleDispatches in rollup result`).toBeTruthy();
+    expect(
       roleDispatches["crew:fullstack-dev"],
-      5,
       `Expected crew:fullstack-dev: 5 (3 + 2), got ${roleDispatches["crew:fullstack-dev"]}`
-    );
-    assert.equal(
+    ).toBe(5);
+    expect(
       roleDispatches["crew:reviewer"],
-      1,
       `Expected crew:reviewer: 1, got ${roleDispatches["crew:reviewer"]}`
-    );
-    assert.equal(
+    ).toBe(1);
+    expect(
       roleDispatches["crew:verifier"],
-      2,
       `Expected crew:verifier: 2, got ${roleDispatches["crew:verifier"]}`
-    );
+    ).toBe(2);
   } finally {
     await cleanup(tmpDir);
   }
@@ -361,8 +360,8 @@ test("collectRecentCosts: roleDispatches is empty object when no reports have ro
     const result = await collectRecentCosts(tmpDir, 5);
     const roleDispatches = result.roleDispatches;
 
-    assert.ok(roleDispatches !== undefined, `Expected roleDispatches field to exist`);
-    assert.deepEqual(roleDispatches, {}, `Expected empty object when no role data present`);
+    expect(roleDispatches !== undefined, `Expected roleDispatches field to exist`).toBeTruthy();
+    expect(roleDispatches, `Expected empty object when no role data present`).toEqual({});
   } finally {
     await cleanup(tmpDir);
   }
diff --git a/crew/tests/cost-setup.test.mts b/crew/tests/cost-setup.test.mts
index abded5bc..bc4c733c 100644
--- a/crew/tests/cost-setup.test.mts
+++ b/crew/tests/cost-setup.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -18,14 +17,14 @@ async function cleanup(dir: string): Promise<void> {
 }
 
 test("parseFeatureOverrides: empty input returns empty array", () => {
-  assert.deepEqual(parseFeatureOverrides(null), []);
-  assert.deepEqual(parseFeatureOverrides(""), []);
-  assert.deepEqual(parseFeatureOverrides(undefined), []);
+  expect(parseFeatureOverrides(null)).toEqual([]);
+  expect(parseFeatureOverrides("")).toEqual([]);
+  expect(parseFeatureOverrides(undefined)).toEqual([]);
 });
 
 test("parseFeatureOverrides: parses on|off|true|false|1|0", () => {
   const out = parseFeatureOverrides("cost-hygiene=on,shell-preflight=off,subagent-inline-warn=1");
-  assert.deepEqual(out, [
+  expect(out).toEqual([
     { feature: "cost-hygiene", enabled: true },
     { feature: "shell-preflight", enabled: false },
     { feature: "subagent-inline-warn", enabled: true }
@@ -33,29 +32,27 @@ test("parseFeatureOverrides: parses on|off|true|false|1|0", () => {
 });
 
 test("parseFeatureOverrides: unknown feature throws", () => {
-  assert.throws(() => parseFeatureOverrides("not-a-real-feature=on"), /Unknown feature/);
+  expect(() => parseFeatureOverrides("not-a-real-feature=on")).toThrow(/Unknown feature/);
 });
 
 test("parseFeatureOverrides: invalid value throws", () => {
-  assert.throws(() => parseFeatureOverrides("cost-hygiene=maybe"), /Invalid value/);
+  expect(() => parseFeatureOverrides("cost-hygiene=maybe")).toThrow(/Invalid value/);
 });
 
 test("parseFeatureOverrides: missing = throws", () => {
-  assert.throws(() => parseFeatureOverrides("cost-hygiene"), /Expected NAME=on\|off/);
+  expect(() => parseFeatureOverrides("cost-hygiene")).toThrow(/Expected NAME=on\|off/);
 });
 
 test("runCostSetup: writes default features block on empty repo", async () => {
   const repo = await makeRepo();
   try {
     const result = await runCostSetup(repo);
-    assert.equal(result.written, true);
+    expect(result.written).toBe(true);
     const config = await readCrewConfigOrEmpty(repo);
-    assert.ok(config.features);
+    expect(config.features).toBeTruthy();
     for (const name of Object.keys(FEATURES)) {
-      assert.equal(
-        config.features![name]?.enabled,
-        FEATURES[name as keyof typeof FEATURES]!.default,
-        `${name} should match registry default`
+      expect(config.features![name]?.enabled, `${name} should match registry default`).toBe(
+        FEATURES[name as keyof typeof FEATURES]!.default
       );
     }
   } finally {
@@ -67,9 +64,9 @@ test("runCostSetup: idempotent — second call writes nothing", async () => {
   const repo = await makeRepo();
   try {
     const first = await runCostSetup(repo);
-    assert.equal(first.written, true);
+    expect(first.written).toBe(true);
     const second = await runCostSetup(repo);
-    assert.equal(second.written, false, "second call should detect no change");
+    expect(second.written, "second call should detect no change").toBe(false);
   } finally {
     await cleanup(repo);
   }
@@ -79,10 +76,10 @@ test("runCostSetup: overrides flip a feature off", async () => {
   const repo = await makeRepo();
   try {
     const result = await runCostSetup(repo, [{ feature: "cost-hygiene", enabled: false }]);
-    assert.equal(result.written, true);
+    expect(result.written).toBe(true);
     const config = await readCrewConfigOrEmpty(repo);
-    assert.equal(config.features!["cost-hygiene"]!.enabled, false);
-    assert.equal(config.features!["shell-preflight"]!.enabled, true);
+    expect(config.features!["cost-hygiene"]!.enabled).toBe(false);
+    expect(config.features!["shell-preflight"]!.enabled).toBe(true);
   } finally {
     await cleanup(repo);
   }
@@ -99,9 +96,9 @@ test("runCostSetup: preserves user-set fields outside features", async () => {
     );
     await runCostSetup(repo);
     const config = await readCrewConfigOrEmpty(repo);
-    assert.equal((config as Record<string, unknown>).customKey, "preserved");
-    assert.deepEqual((config as Record<string, unknown>).nested, { foo: 1 });
-    assert.ok(config.features);
+    expect((config as Record<string, unknown>).customKey).toBe("preserved");
+    expect((config as Record<string, unknown>).nested).toEqual({ foo: 1 });
+    expect(config.features).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -120,13 +117,9 @@ test("runCostSetup: existing feature override is preserved when not in overrides
     );
     const result = await runCostSetup(repo);
     const config = await readCrewConfigOrEmpty(repo);
-    assert.equal(config.features!["cost-hygiene"]!.enabled, false, "user's off should stick");
-    assert.equal(
-      config.features!["shell-preflight"]!.enabled,
-      true,
-      "missing entries get defaults"
-    );
-    assert.equal(result.written, true, "missing default entries triggered a write");
+    expect(config.features!["cost-hygiene"]!.enabled, "user's off should stick").toBe(false);
+    expect(config.features!["shell-preflight"]!.enabled, "missing entries get defaults").toBe(true);
+    expect(result.written, "missing default entries triggered a write").toBe(true);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/cost-watch.test.mts b/crew/tests/cost-watch.test.mts
index 2fb479a2..f933a5fb 100644
--- a/crew/tests/cost-watch.test.mts
+++ b/crew/tests/cost-watch.test.mts
@@ -1,9 +1,8 @@
+import { test, expect } from "bun:test";
 // tests/cost-watch.test.ts — FEAT-194 S4: operator burn-watch CLI.
 // Covers the pure summarize/render functions plus an end-to-end
 // buildCostWatch() read over fixture dispatch-timing.jsonl + cost-report
 // artifacts + loop.json.
-import { test } from "node:test";
-import assert from "node:assert/strict";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -38,10 +37,10 @@ function row(overrides: Partial<DispatchRow>): DispatchRow {
 test("summarizeDispatchBurn sums tokens and flags none under the default cap", () => {
   const rows = [row({ tokenIn: 1000, tokenOut: 200 }), row({ tokenIn: 2000, tokenOut: 300 })];
   const summary = summarizeDispatchBurn(rows);
-  assert.equal(summary.rollingTotalTokens, 3500);
-  assert.equal(summary.flaggedCount, 0);
-  assert.equal(summary.perDispatchTokenCap, DEFAULT_PER_DISPATCH_TOKEN_CAP);
-  assert.equal(summary.rows[0]?.totalTokens, 1200);
+  expect(summary.rollingTotalTokens).toBe(3500);
+  expect(summary.flaggedCount).toBe(0);
+  expect(summary.perDispatchTokenCap).toBe(DEFAULT_PER_DISPATCH_TOKEN_CAP);
+  expect(summary.rows[0]?.totalTokens).toBe(1200);
 });
 
 test("summarizeDispatchBurn flags a dispatch crossing the per-dispatch token cap", () => {
@@ -50,16 +49,16 @@ test("summarizeDispatchBurn flags a dispatch crossing the per-dispatch token cap
     row({ agent: "crew:reviewer", tokenIn: 5000, tokenOut: 1000 })
   ];
   const summary = summarizeDispatchBurn(rows);
-  assert.equal(summary.flaggedCount, 1);
-  assert.equal(summary.rows[0]?.flagged, true);
-  assert.equal(summary.rows[1]?.flagged, false);
+  expect(summary.flaggedCount).toBe(1);
+  expect(summary.rows[0]?.flagged).toBe(true);
+  expect(summary.rows[1]?.flagged).toBe(false);
 });
 
 test("summarizeDispatchBurn respects a custom token cap", () => {
   const rows = [row({ tokenIn: 500, tokenOut: 200 })];
   const summary = summarizeDispatchBurn(rows, 500);
-  assert.equal(summary.rows[0]?.flagged, true);
-  assert.equal(summary.perDispatchTokenCap, 500);
+  expect(summary.rows[0]?.flagged).toBe(true);
+  expect(summary.perDispatchTokenCap).toBe(500);
 });
 
 test("summarizeDispatchBurn defaults missing model to 'unknown'", () => {
@@ -78,14 +77,14 @@ test("summarizeDispatchBurn defaults missing model to 'unknown'", () => {
     }
   ];
   const summary = summarizeDispatchBurn(rows);
-  assert.equal(summary.rows[0]?.model, "unknown");
+  expect(summary.rows[0]?.model).toBe("unknown");
 });
 
 test("summarizeDispatchBurn handles an empty row set", () => {
   const summary = summarizeDispatchBurn([]);
-  assert.equal(summary.rollingTotalTokens, 0);
-  assert.equal(summary.flaggedCount, 0);
-  assert.deepEqual(summary.rows, []);
+  expect(summary.rollingTotalTokens).toBe(0);
+  expect(summary.flaggedCount).toBe(0);
+  expect(summary.rows).toEqual([]);
 });
 
 // ── summarizeSliceBurn ──────────────────────────────────────────────────────
@@ -145,24 +144,24 @@ function costReport(overrides: Partial<CostReport>): CostReport {
 test("summarizeSliceBurn flags a single report whose own usd exceeds the ceiling", () => {
   const reports = [costReport({ path: "/a.md", usd: 80 })];
   const summary = summarizeSliceBurn(reports, 80, 75);
-  assert.equal(summary.ceilingExceeded, true);
-  assert.equal(summary.flaggedPaths.has("/a.md"), true);
-  assert.equal(summary.rollingUsd, 80);
-  assert.equal(summary.ceilingUsd, 75);
+  expect(summary.ceilingExceeded).toBe(true);
+  expect(summary.flaggedPaths.has("/a.md")).toBe(true);
+  expect(summary.rollingUsd).toBe(80);
+  expect(summary.ceilingUsd).toBe(75);
 });
 
 test("summarizeSliceBurn does not flag when every report is within the ceiling", () => {
   const reports = [costReport({ path: "/a.md", usd: 20 })];
   const summary = summarizeSliceBurn(reports, 20, 75);
-  assert.equal(summary.ceilingExceeded, false);
-  assert.equal(summary.flaggedPaths.size, 0);
+  expect(summary.ceilingExceeded).toBe(false);
+  expect(summary.flaggedPaths.size).toBe(0);
 });
 
 test("summarizeSliceBurn treats a null ceiling as no flag possible", () => {
   const reports = [costReport({ usd: 999 })];
   const summary = summarizeSliceBurn(reports, 999, null);
-  assert.equal(summary.ceilingExceeded, false);
-  assert.equal(summary.ceilingUsd, null);
+  expect(summary.ceilingExceeded).toBe(false);
+  expect(summary.ceilingUsd).toBe(null);
 });
 
 test("summarizeSliceBurn does NOT flag on a rolling-sum-only breach — the ceiling is per-report", () => {
@@ -171,9 +170,9 @@ test("summarizeSliceBurn does NOT flag on a rolling-sum-only breach — the ceil
   // redesign guards against (see summarizeSliceBurn's doc comment).
   const reports = [costReport({ path: "/a.md", usd: 70 }), costReport({ path: "/b.md", usd: 70 })];
   const summary = summarizeSliceBurn(reports, 140, 75);
-  assert.equal(summary.rollingUsd, 140);
-  assert.equal(summary.ceilingExceeded, false);
-  assert.equal(summary.flaggedPaths.size, 0);
+  expect(summary.rollingUsd).toBe(140);
+  expect(summary.ceilingExceeded).toBe(false);
+  expect(summary.flaggedPaths.size).toBe(0);
 });
 
 // ── readLoopCostCeiling ──────────────────────────────────────────────────────
@@ -187,7 +186,7 @@ test("readLoopCostCeiling reads loop.cost.ceilingUsd from .claude/loop.json", as
       JSON.stringify({ loop: { cost: { ceilingUsd: 42 } } })
     );
     const ceiling = await readLoopCostCeiling(tmp);
-    assert.equal(ceiling, 42);
+    expect(ceiling).toBe(42);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -197,7 +196,7 @@ test("readLoopCostCeiling returns null when loop.json is missing", async () => {
   const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cost-watch-ceiling-missing-"));
   try {
     const ceiling = await readLoopCostCeiling(tmp);
-    assert.equal(ceiling, null);
+    expect(ceiling).toBe(null);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -209,7 +208,7 @@ test("readLoopCostCeiling returns null when ceilingUsd is absent", async () => {
     await fs.mkdir(path.join(tmp, ".claude"), { recursive: true });
     await fs.writeFile(path.join(tmp, ".claude", "loop.json"), JSON.stringify({ loop: {} }));
     const ceiling = await readLoopCostCeiling(tmp);
-    assert.equal(ceiling, null);
+    expect(ceiling).toBe(null);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -228,13 +227,13 @@ test("renderCostWatchReport renders dispatch + slice tables and a cap warning",
       75
     )
   });
-  assert.match(report, /crew:aiplugin-dev/);
-  assert.match(report, /opus/);
-  assert.match(report, /OVER CAP/);
-  assert.match(report, /SLICE99/);
-  assert.match(report, /OVER CEILING/);
-  assert.match(report, /exceeded loop\.cost\.ceilingUsd/);
-  assert.match(report, /Data-gap notes/);
+  expect(report).toMatch(/crew:aiplugin-dev/);
+  expect(report).toMatch(/opus/);
+  expect(report).toMatch(/OVER CAP/);
+  expect(report).toMatch(/SLICE99/);
+  expect(report).toMatch(/OVER CEILING/);
+  expect(report).toMatch(/exceeded loop\.cost\.ceilingUsd/);
+  expect(report).toMatch(/Data-gap notes/);
 });
 
 test("renderCostWatchReport degrades gracefully with no data", () => {
@@ -242,8 +241,8 @@ test("renderCostWatchReport degrades gracefully with no data", () => {
     dispatch: summarizeDispatchBurn([]),
     slice: summarizeSliceBurn([], 0, null)
   });
-  assert.match(report, /no dispatch-timing data/);
-  assert.match(report, /no cost-report-slice artifacts/);
+  expect(report).toMatch(/no dispatch-timing data/);
+  expect(report).toMatch(/no cost-report-slice artifacts/);
 });
 
 // ── buildCostWatch (end-to-end read) ────────────────────────────────────────
@@ -295,17 +294,17 @@ test("buildCostWatch reads dispatch-timing.jsonl + cost reports + loop.json ceil
       dispatchTimingLogPath: path.join(tmp, ".claude", "logs", "dispatch-timing.jsonl")
     });
 
-    assert.equal(data.dispatch.rows.length, 1);
-    assert.equal(data.dispatch.rows[0]?.agent, "crew:fullstack-dev");
-    assert.equal(data.slice.reports.length, 1);
-    assert.equal(data.slice.reports[0]?.runTitle, "SLICE1");
-    assert.equal(data.slice.ceilingUsd, 1);
-    assert.equal(data.slice.ceilingExceeded, true); // 2.5 > 1
+    expect(data.dispatch.rows.length).toBe(1);
+    expect(data.dispatch.rows[0]?.agent).toBe("crew:fullstack-dev");
+    expect(data.slice.reports.length).toBe(1);
+    expect(data.slice.reports[0]?.runTitle).toBe("SLICE1");
+    expect(data.slice.ceilingUsd).toBe(1);
+    expect(data.slice.ceilingExceeded).toBe(true); // 2.5 > 1
 
     const rendered = renderCostWatchReport(data);
-    assert.match(rendered, /crew:fullstack-dev/);
-    assert.match(rendered, /SLICE1/);
-    assert.match(rendered, /exceeded loop\.cost\.ceilingUsd/);
+    expect(rendered).toMatch(/crew:fullstack-dev/);
+    expect(rendered).toMatch(/SLICE1/);
+    expect(rendered).toMatch(/exceeded loop\.cost\.ceilingUsd/);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
diff --git a/crew/tests/crew-profile-cli.test.mts b/crew/tests/crew-profile-cli.test.mts
index 9555785f..72ceda62 100644
--- a/crew/tests/crew-profile-cli.test.mts
+++ b/crew/tests/crew-profile-cli.test.mts
@@ -2,8 +2,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { buildProfileBlock } from "../scripts/lib/memory/index.mjs";
 import { readInjectedAtoms } from "../scripts/lib/memory/injected-atoms.mjs";
 
@@ -13,17 +12,17 @@ async function tmp(p: string) {
 
 test("barrel re-exports buildProfileBlock and injected-atoms/feedback helpers", async () => {
   const mod = await import("../scripts/lib/memory/index.mjs");
-  assert.equal(typeof mod.buildProfileBlock, "function");
-  assert.equal(typeof mod.submitOutcomeFeedback, "function");
-  assert.equal(typeof mod.writeInjectedAtoms, "function");
+  expect(typeof mod.buildProfileBlock).toBe("function");
+  expect(typeof mod.submitOutcomeFeedback).toBe("function");
+  expect(typeof mod.writeInjectedAtoms).toBe("function");
 });
 
 test("buildProfileBlock via barrel is byte-silent when disabled (integration guard)", async () => {
   const repo = await tmp("cli-profile-off-");
   try {
     const r = await buildProfileBlock({ repoPath: repo, agent: "crew:reviewer", rawConfig: {} });
-    assert.equal(r.block, "");
-    assert.deepEqual(await readInjectedAtoms(repo, "any"), []);
+    expect(r.block).toBe("");
+    expect(await readInjectedAtoms(repo, "any")).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/crew-write-review-result.test.mts b/crew/tests/crew-write-review-result.test.mts
index 19c4a251..d432e97f 100644
--- a/crew/tests/crew-write-review-result.test.mts
+++ b/crew/tests/crew-write-review-result.test.mts
@@ -1,8 +1,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
 import { execFile as execFileCallback } from "node:child_process";
@@ -28,7 +27,7 @@ await import("@astragenie/gepa-core");
 
 async function makeTempRepo(prefix: string) {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", dir]);
+  await execFile("bun", [cliPath, "init", "--repo", dir]);
   return dir;
 }
 
@@ -38,7 +37,7 @@ async function cleanup(dir: string) {
 
 // Helper: invoke CLI synchronously and return { status, stdout, stderr }
 function runCli(args: string[]) {
-  const result = spawnSync(process.execPath, ["--experimental-strip-types", cliPath, ...args], {
+  const result = spawnSync(process.execPath, [cliPath, ...args], {
     encoding: "utf8",
     timeout: 30_000
   });
@@ -64,9 +63,9 @@ test("write-review-result: approved code-bearing review without test flags exits
       "--summary",
       "looks good"
     ]);
-    assert.equal(status, 2, "expected exit code 2 when approved + no test flags");
-    assert.match(stderr, /refused/, "stderr must mention 'refused'");
-    assert.match(stderr, /--test-summary/, "stderr must mention '--test-summary'");
+    expect(status, "expected exit code 2 when approved + no test flags").toBe(2);
+    expect(stderr, "stderr must mention 'refused'").toMatch(/refused/);
+    expect(stderr, "stderr must mention '--test-summary'").toMatch(/--test-summary/);
   } finally {
     await cleanup(repoPath);
   }
@@ -88,10 +87,10 @@ test("write-review-result: approved + --non-code exits 0 and writes Non-Code Rev
       "doc change only",
       "--non-code"
     ]);
-    assert.equal(status, 0, "expected exit 0 with --non-code");
+    expect(status, "expected exit 0 with --non-code").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /Non-Code Review: yes/, "artifact must contain 'Non-Code Review: yes'");
+    expect(body, "artifact must contain 'Non-Code Review: yes'").toMatch(/Non-Code Review: yes/);
   } finally {
     await cleanup(repoPath);
   }
@@ -115,13 +114,11 @@ test("write-review-result: approved + --test-summary exits 0 and writes Test Ade
       "--test-summary",
       summaryText
     ]);
-    assert.equal(status, 0, "expected exit 0 with --test-summary");
+    expect(status, "expected exit 0 with --test-summary").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(
-      body,
-      /Test Adequacy: covered by N tests/,
-      "artifact must contain Test Adequacy field"
+    expect(body, "artifact must contain Test Adequacy field").toMatch(
+      /Test Adequacy: covered by N tests/
     );
   } finally {
     await cleanup(repoPath);
@@ -143,9 +140,9 @@ test("write-review-result: rejected decision bypasses the test-adequacy gate", a
       "--summary",
       "missing null guard"
     ]);
-    assert.equal(status, 0, "expected exit 0 for rejected decision");
+    expect(status, "expected exit 0 for rejected decision").toBe(0);
     const result = JSON.parse(stdout);
-    assert.ok(result.path, "artifact path must be present");
+    expect(result.path, "artifact path must be present").toBeTruthy();
   } finally {
     await cleanup(repoPath);
   }
@@ -169,7 +166,7 @@ test("write-review-result: rejected decision captures a failure entry in learnin
       "--summary",
       "missing null guard"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const raw = await fs.readFile(
       path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl"),
       "utf8"
@@ -178,11 +175,11 @@ test("write-review-result: rejected decision captures a failure entry in learnin
       .split("\n")
       .filter((l) => l.trim().length > 0)
       .map((l) => JSON.parse(l));
-    assert.equal(lines.length, 1);
-    assert.equal(lines[0].kind, "failure");
-    assert.equal(lines[0].agent, "reviewer");
-    assert.equal(lines[0].source, "review_fail");
-    assert.match(lines[0].summary, /missing null guard/);
+    expect(lines.length).toBe(1);
+    expect(lines[0].kind).toBe("failure");
+    expect(lines[0].agent).toBe("reviewer");
+    expect(lines[0].source).toBe("review_fail");
+    expect(lines[0].summary).toMatch(/missing null guard/);
   } finally {
     await cleanup(repoPath);
   }
@@ -229,7 +226,7 @@ test("write-review-result: rejected decision also dual-writes a failing GEPA tri
     ]);
     // Regression guard: the CLI must always succeed, cold-gepa-core-load or
     // not (this is what timed out / exited non-zero pre-fix).
-    assert.equal(status, 0);
+    expect(status).toBe(0);
 
     const trialPath = path.join(
       repoPath,
@@ -251,14 +248,14 @@ test("write-review-result: rejected decision also dual-writes a failing GEPA tri
       .catch(() => []); // guard legitimately dropped the trial under a slow/cold load — acceptable.
 
     if (trialLines.length > 0) {
-      assert.equal(trialLines.length, 1);
-      assert.equal(trialLines[0].agent, "reviewer");
-      assert.equal(trialLines[0].phase, "review");
-      assert.equal(trialLines[0].source, "captured");
-      assert.equal(trialLines[0].score.pass, false);
-      assert.equal(trialLines[0].score.score, 0);
-      assert.match(trialLines[0].score.rationale, /missing null guard/);
-      assert.equal(trialLines[0].input.capture_origin, "production_failure");
+      expect(trialLines.length).toBe(1);
+      expect(trialLines[0].agent).toBe("reviewer");
+      expect(trialLines[0].phase).toBe("review");
+      expect(trialLines[0].source).toBe("captured");
+      expect(trialLines[0].score.pass).toBe(false);
+      expect(trialLines[0].score.score).toBe(0);
+      expect(trialLines[0].score.rationale).toMatch(/missing null guard/);
+      expect(trialLines[0].input.capture_origin).toBe("production_failure");
     }
   } finally {
     await cleanup(repoPath);
@@ -282,10 +279,10 @@ test("write-review-result: approved decision does not write learnings.jsonl", as
       "--test-summary",
       "covered"
     ]);
-    assert.equal(status, 0);
-    await assert.rejects(
+    expect(status).toBe(0);
+    await expect(
       fs.readFile(path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl"), "utf8")
-    );
+    ).rejects.toThrow();
   } finally {
     await cleanup(repoPath);
   }
@@ -306,8 +303,8 @@ test("write-review-result: approved_with_notes without test flags also exits 2",
       "--summary",
       "minor nits"
     ]);
-    assert.equal(status, 2, "expected exit 2 for approved_with_notes without test flags");
-    assert.match(stderr, /refused/, "stderr must mention 'refused'");
+    expect(status, "expected exit 2 for approved_with_notes without test flags").toBe(2);
+    expect(stderr, "stderr must mention 'refused'").toMatch(/refused/);
   } finally {
     await cleanup(repoPath);
   }
@@ -330,9 +327,9 @@ test("write-review-result: unknown decision exits 2", async () => {
       "--test-summary",
       "n/a"
     ]);
-    assert.equal(status, 2, "expected exit 2 for unknown decision");
-    assert.match(stderr, /unknown.*decision/i, "stderr must mention unknown decision");
-    assert.match(stderr, /approved/, "stderr must list valid decisions");
+    expect(status, "expected exit 2 for unknown decision").toBe(2);
+    expect(stderr, "stderr must mention unknown decision").toMatch(/unknown.*decision/i);
+    expect(stderr, "stderr must list valid decisions").toMatch(/approved/);
   } finally {
     await cleanup(repoPath);
   }
@@ -355,13 +352,11 @@ test("write-review-result: approved + --test-summary-skip-reason exits 0 and wri
       "--test-summary-skip-reason",
       "doc-only refactor"
     ]);
-    assert.equal(status, 0, "expected exit 0 with --test-summary-skip-reason");
+    expect(status, "expected exit 0 with --test-summary-skip-reason").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(
-      body,
-      /Test Adequacy Skip Reason: doc-only refactor/,
-      "artifact must contain 'Test Adequacy Skip Reason: doc-only refactor'"
+    expect(body, "artifact must contain 'Test Adequacy Skip Reason: doc-only refactor'").toMatch(
+      /Test Adequacy Skip Reason: doc-only refactor/
     );
   } finally {
     await cleanup(repoPath);
@@ -387,10 +382,10 @@ test("write-review-result: --findings persisted in artifact frontmatter", async
       "--findings",
       "🔴:1,🟡:2,❓:0"
     ]);
-    assert.equal(status, 0, "expected exit 0 with --findings");
+    expect(status, "expected exit 0 with --findings").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /findings:.*🔴:1,🟡:2,❓:0/, "artifact must contain findings frontmatter");
+    expect(body, "artifact must contain findings frontmatter").toMatch(/findings:.*🔴:1,🟡:2,❓:0/);
   } finally {
     await cleanup(repoPath);
   }
@@ -420,19 +415,17 @@ test("write-review-result: --not-checked / --author-id / --judge-id round-trip i
       "--judge-id",
       "reviewer-1"
     ]);
-    assert.equal(status, 0, "expected exit 0 with the new optional flags");
+    expect(status, "expected exit 0 with the new optional flags").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(
-      body,
-      /not_checked:.*\["perf","i18n","a11y"\]/,
-      "frontmatter must list not_checked"
+    expect(body, "frontmatter must list not_checked").toMatch(
+      /not_checked:.*\["perf","i18n","a11y"\]/
     );
-    assert.match(body, /author_id: builder-1/, "frontmatter must contain author_id");
-    assert.match(body, /judge_id: reviewer-1/, "frontmatter must contain judge_id");
-    assert.match(body, /Not Checked:/, "body must surface a Not Checked section");
-    assert.match(body, /Author: builder-1/, "body must surface Author");
-    assert.match(body, /Judge: reviewer-1/, "body must surface Judge");
+    expect(body, "frontmatter must contain author_id").toMatch(/author_id: builder-1/);
+    expect(body, "frontmatter must contain judge_id").toMatch(/judge_id: reviewer-1/);
+    expect(body, "body must surface a Not Checked section").toMatch(/Not Checked:/);
+    expect(body, "body must surface Author").toMatch(/Author: builder-1/);
+    expect(body, "body must surface Judge").toMatch(/Judge: reviewer-1/);
   } finally {
     await cleanup(repoPath);
   }
@@ -459,11 +452,11 @@ test("write-review-result: self_approval derives true when author-id equals judg
       "--judge-id",
       "same-agent"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /self_approval: true/, "frontmatter must record self_approval: true");
-    assert.match(body, /self-approval/i, "body must surface the self-approval marker");
+    expect(body, "frontmatter must record self_approval: true").toMatch(/self_approval: true/);
+    expect(body, "body must surface the self-approval marker").toMatch(/self-approval/i);
   } finally {
     await cleanup(repoPath);
   }
@@ -491,11 +484,11 @@ test("write-review-result: self_approval derives false when author-id and judge-
       "--judge-id",
       "reviewer-1"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /self_approval: false/, "frontmatter must record self_approval: false");
-    assert.doesNotMatch(body, /⚠/, "body must NOT surface the self-approval warning marker");
+    expect(body, "frontmatter must record self_approval: false").toMatch(/self_approval: false/);
+    expect(body, "body must NOT surface the self-approval warning marker").not.toMatch(/⚠/);
   } finally {
     await cleanup(repoPath);
   }
@@ -520,21 +513,17 @@ test("write-review-result: self_approval is absent when neither author-id nor ju
       "--test-summary",
       "all pass"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.doesNotMatch(
-      body,
-      /self_approval:/,
-      "self_approval must not appear when author-id is absent"
+    expect(body, "self_approval must not appear when author-id is absent").not.toMatch(
+      /self_approval:/
     );
-    assert.doesNotMatch(
-      body,
-      /not_checked:/,
-      "not_checked must not appear when --not-checked is absent"
+    expect(body, "not_checked must not appear when --not-checked is absent").not.toMatch(
+      /not_checked:/
     );
-    assert.doesNotMatch(body, /author_id:/, "author_id must not appear when --author-id is absent");
-    assert.doesNotMatch(body, /judge_id:/, "judge_id must not appear when --judge-id is absent");
+    expect(body, "author_id must not appear when --author-id is absent").not.toMatch(/author_id:/);
+    expect(body, "judge_id must not appear when --judge-id is absent").not.toMatch(/judge_id:/);
   } finally {
     await cleanup(repoPath);
   }
@@ -566,13 +555,13 @@ test("write-review-result: --summary-file round-trips apostrophes, backticks, an
       "--test-summary",
       "all pass"
     ]);
-    assert.equal(status, 0, `expected exit 0 with --summary-file, stderr: ${stderr}`);
+    expect(status, `expected exit 0 with --summary-file, stderr: ${stderr}`).toBe(0);
     const result = JSON.parse(stdout);
     const artifactBody = await fs.readFile(result.path, "utf8");
-    assert.ok(
+    expect(
       artifactBody.includes(bodyText),
       `artifact must contain the exact file-sourced body verbatim, got:\n${artifactBody}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repoPath);
   }
@@ -587,7 +576,6 @@ test("write-review-result: --summary-file - reads the body from stdin", async ()
     const result = spawnSync(
       process.execPath,
       [
-        "--experimental-strip-types",
         cliPath,
         "write-review-result",
         "--repo",
@@ -603,13 +591,13 @@ test("write-review-result: --summary-file - reads the body from stdin", async ()
       ],
       { encoding: "utf8", timeout: 30_000, input: `${bodyText}\n` }
     );
-    assert.equal(result.status, 0, `expected exit 0 reading stdin, stderr: ${result.stderr}`);
+    expect(result.status, `expected exit 0 reading stdin, stderr: ${result.stderr}`).toBe(0);
     const parsed = JSON.parse(result.stdout);
     const artifactBody = await fs.readFile(parsed.path, "utf8");
-    assert.ok(
+    expect(
       artifactBody.includes(bodyText),
       `artifact must contain the exact stdin-sourced body verbatim, got:\n${artifactBody}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repoPath);
   }
@@ -637,25 +625,23 @@ test("write-review-result: backward compat — no new flags leaves output byte-i
     ];
     const first = runCli(argsFor(repoA));
     const second = runCli(argsFor(repoB));
-    assert.equal(first.status, 0);
-    assert.equal(second.status, 0);
+    expect(first.status).toBe(0);
+    expect(second.status).toBe(0);
     const bodyA = await fs.readFile(JSON.parse(first.stdout).path, "utf8");
     const bodyB = await fs.readFile(JSON.parse(second.stdout).path, "utf8");
     // Strip the one field that legitimately varies run-to-run (Created: <iso>).
     const normalize = (body: string) => body.replace(/- Created: .*/g, "- Created: <ts>");
-    assert.equal(
-      normalize(bodyA),
-      normalize(bodyB),
-      "identical inputs must produce identical shape"
+    expect(normalize(bodyA), "identical inputs must produce identical shape").toBe(
+      normalize(bodyB)
     );
     for (const body of [bodyA, bodyB]) {
-      assert.doesNotMatch(body, /not_checked:/);
-      assert.doesNotMatch(body, /author_id:/);
-      assert.doesNotMatch(body, /judge_id:/);
-      assert.doesNotMatch(body, /self_approval:/);
-      assert.doesNotMatch(body, /Not Checked:/);
-      assert.doesNotMatch(body, /^Author:/m);
-      assert.doesNotMatch(body, /^Judge:/m);
+      expect(body).not.toMatch(/not_checked:/);
+      expect(body).not.toMatch(/author_id:/);
+      expect(body).not.toMatch(/judge_id:/);
+      expect(body).not.toMatch(/self_approval:/);
+      expect(body).not.toMatch(/Not Checked:/);
+      expect(body).not.toMatch(/^Author:/m);
+      expect(body).not.toMatch(/^Judge:/m);
     }
   } finally {
     await cleanup(repoA);
diff --git a/crew/tests/dir-cache.test.mts b/crew/tests/dir-cache.test.mts
index cdb037c0..6ab4db35 100644
--- a/crew/tests/dir-cache.test.mts
+++ b/crew/tests/dir-cache.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -20,8 +19,8 @@ test("getCachedDirFiles: second call with unchanged dir returns same array refer
   try {
     const first = await getCachedDirFiles(dir, (n) => n.endsWith(".jsonl"));
     const second = await getCachedDirFiles(dir, (n) => n.endsWith(".jsonl"));
-    assert.strictEqual(first, second, "cache hit must return same array reference");
-    assert.equal(first.length, 2);
+    expect(first, "cache hit must return same array reference").toBe(second);
+    expect(first.length).toBe(2);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -34,15 +33,15 @@ test("getCachedDirFiles: cache invalidated when mtime advances", async () => {
   cache.delete(dir);
   try {
     const first = await getCachedDirFiles(dir, (n) => n.endsWith(".jsonl"));
-    assert.equal(first.length, 1);
+    expect(first.length).toBe(1);
 
     // Wait to ensure mtime advances on the directory
     await new Promise((r) => setTimeout(r, 20));
     await fs.writeFile(path.join(dir, "b.jsonl"), "");
 
     const second = await getCachedDirFiles(dir, (n) => n.endsWith(".jsonl"));
-    assert.ok(second.length >= 2, "cache should refresh after new file added");
-    assert.notStrictEqual(first, second, "must be a new array after mtime change");
+    expect(second.length >= 2, "cache should refresh after new file added").toBeTruthy();
+    expect(first, "must be a new array after mtime change").not.toBe(second);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -50,7 +49,7 @@ test("getCachedDirFiles: cache invalidated when mtime advances", async () => {
 
 test("getCachedDirFiles: returns empty array for missing directory", async () => {
   const result = await getCachedDirFiles("/nonexistent/path/dir", () => true);
-  assert.deepEqual(result, []);
+  expect(result).toEqual([]);
 });
 
 test("getCachedDirFiles: files returned in descending order", async () => {
@@ -61,7 +60,7 @@ test("getCachedDirFiles: files returned in descending order", async () => {
   try {
     const files = await getCachedDirFiles(dir);
     const names = files.map((f) => path.basename(f));
-    assert.deepEqual(names, ["c.txt", "b.txt", "a.txt"]);
+    expect(names).toEqual(["c.txt", "b.txt", "a.txt"]);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
diff --git a/crew/tests/dispatch-handle-store.test.mts b/crew/tests/dispatch-handle-store.test.mts
index 0f1c7967..0bada3b3 100644
--- a/crew/tests/dispatch-handle-store.test.mts
+++ b/crew/tests/dispatch-handle-store.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -28,12 +27,12 @@ test("persist + load returns the handle and deletes the file", async () => {
       "session-A.json"
     );
     const stat = await fs.stat(stateFile);
-    assert.ok(stat.isFile(), "state file should exist after persist");
+    expect(stat.isFile(), "state file should exist after persist").toBeTruthy();
 
     const loaded = await loadAndDeleteDispatchHandle("session-A", tmp);
-    assert.deepEqual(loaded, handle);
+    expect(loaded).toEqual(handle);
 
-    await assert.rejects(fs.stat(stateFile));
+    await expect(fs.stat(stateFile)).rejects.toThrow();
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -43,7 +42,7 @@ test("loadAndDelete returns null when no handle persisted", async () => {
   const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "dispatch-store-"));
   try {
     const loaded = await loadAndDeleteDispatchHandle("nonexistent", tmp);
-    assert.equal(loaded, null);
+    expect(loaded).toBe(null);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -64,7 +63,7 @@ test("persist with empty session_id is a no-op", async () => {
       tmp
     );
     const dir = path.join(tmp, ".claude", "state", "crew", "dispatch-timing");
-    await assert.rejects(fs.stat(dir));
+    await expect(fs.stat(dir)).rejects.toThrow();
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -84,7 +83,7 @@ test("sanitizes session_id with unsafe characters", async () => {
     await persistDispatchHandle(unsafe, handle, tmp);
 
     const loaded = await loadAndDeleteDispatchHandle(unsafe, tmp);
-    assert.deepEqual(loaded, handle);
+    expect(loaded).toEqual(handle);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
diff --git a/crew/tests/dispatch-size-gate.test.mts b/crew/tests/dispatch-size-gate.test.mts
index ef124152..c195a97b 100644
--- a/crew/tests/dispatch-size-gate.test.mts
+++ b/crew/tests/dispatch-size-gate.test.mts
@@ -1,3 +1,4 @@
+import { test, expect } from "bun:test";
 // tests/dispatch-size-gate.test.ts
 // A3 — the dispatch size gate (8 agent deaths, all from oversized dispatches).
 // Unit tests on hooks/lib/dispatch-size-estimate.ts's pure functions and the
@@ -5,8 +6,6 @@
 // mirrors tests/check-builder-terminal-state.test.ts), plus a handful of
 // shim-level subprocess tests (mirroring tests/hook-feature-gating.test.ts's
 // runHook helper) for the env kill-switch and non-Agent/malformed pass-through.
-import { test } from "node:test";
-import assert from "node:assert/strict";
 import { spawn } from "node:child_process";
 import fs from "node:fs/promises";
 import os from "node:os";
@@ -25,7 +24,7 @@ import {
 } from "../hooks/lib/dispatch-size-estimate.mjs";
 
 const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
-const SHIM_PATH = path.join(__dirname, "..", "hooks", "pre-tool-use-dispatch-size.ts");
+const SHIM_PATH = path.join(__dirname, "..", "hooks", "pre-tool-use-dispatch-size.mts");
 
 async function makeRepo(): Promise<string> {
   return await fs.mkdtemp(path.join(os.tmpdir(), "dispatch-size-gate-test-"));
@@ -72,7 +71,7 @@ function runHook(
   env: Record<string, string> = {}
 ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
   return new Promise((resolve) => {
-    const proc = spawn("node", ["--experimental-strip-types", SHIM_PATH], {
+    const proc = spawn("bun", [SHIM_PATH], {
       env: { ...process.env, ...env }
     });
     let stdout = "";
@@ -97,42 +96,42 @@ function deathModePrompt(): string {
 // ── pure estimator ──────────────────────────────────────────────────────
 
 test("baseTokensForTier: light tier (investigator/dev-lite/reviewer-lite) → 15000", () => {
-  assert.equal(baseTokensForTier("crew:investigator"), 15_000);
-  assert.equal(baseTokensForTier("dev-lite"), 15_000);
-  assert.equal(baseTokensForTier("crew:reviewer-lite"), 15_000);
+  expect(baseTokensForTier("crew:investigator")).toBe(15_000);
+  expect(baseTokensForTier("dev-lite")).toBe(15_000);
+  expect(baseTokensForTier("crew:reviewer-lite")).toBe(15_000);
 });
 
 test("baseTokensForTier: mid tier (researcher/reviewer/architect) → 30000", () => {
-  assert.equal(baseTokensForTier("crew:researcher"), 30_000);
-  assert.equal(baseTokensForTier("crew:reviewer"), 30_000);
-  assert.equal(baseTokensForTier("architect"), 30_000);
+  expect(baseTokensForTier("crew:researcher")).toBe(30_000);
+  expect(baseTokensForTier("crew:reviewer")).toBe(30_000);
+  expect(baseTokensForTier("architect")).toBe(30_000);
 });
 
 test("baseTokensForTier: builder tier → 35000", () => {
-  assert.equal(baseTokensForTier("crew:fullstack-dev"), 35_000);
-  assert.equal(baseTokensForTier("crew:aiplugin-dev"), 35_000);
+  expect(baseTokensForTier("crew:fullstack-dev")).toBe(35_000);
+  expect(baseTokensForTier("crew:aiplugin-dev")).toBe(35_000);
 });
 
 test("baseTokensForTier: unknown subagent_type → 25000 default", () => {
-  assert.equal(baseTokensForTier("crew:some-new-agent"), 25_000);
+  expect(baseTokensForTier("crew:some-new-agent")).toBe(25_000);
 });
 
 test("fileMentionCount: counts file-path-like tokens and bare dir mentions (additively, no de-dup)", () => {
-  assert.equal(fileMentionCount("no files here"), 0);
+  expect(fileMentionCount("no files here")).toBe(0);
   // Each "<dir>/<file>.<ext>" mention fires BOTH regexes (a file-path match
   // and a bare-dir match) by design — the formula sums them rather than
   // de-duplicating overlaps, matching the architect's spec literally
   // (2026-07-12-reviewchannel-and-dispatch-gate.md Blocker 2): "hooks/hooks.json"
   // = 1 file match + 1 dir match, same for "agents/reviewer.md" → 4 total.
-  assert.equal(fileMentionCount("edit hooks/hooks.json and agents/reviewer.md"), 4);
-  assert.equal(fileMentionCount("scan commands/ and skills/ directories"), 2);
+  expect(fileMentionCount("edit hooks/hooks.json and agents/reviewer.md")).toBe(4);
+  expect(fileMentionCount("scan commands/ and skills/ directories")).toBe(2);
 });
 
 test("hasWideScopeMarker: matches the incident's over-broad review shape", () => {
-  assert.equal(hasWideScopeMarker("review all files in the repo"), true);
-  assert.equal(hasWideScopeMarker("review every file in the codebase"), true);
-  assert.equal(hasWideScopeMarker("read the entire whole repo directories"), true);
-  assert.equal(hasWideScopeMarker("fix the bug in hooks/foo.ts"), false);
+  expect(hasWideScopeMarker("review all files in the repo")).toBe(true);
+  expect(hasWideScopeMarker("review every file in the codebase")).toBe(true);
+  expect(hasWideScopeMarker("read the entire whole repo directories")).toBe(true);
+  expect(hasWideScopeMarker("fix the bug in hooks/foo.ts")).toBe(false);
 });
 
 test("estimateDispatchSize: under-cap, light tier, no mentions → well under threshold", () => {
@@ -140,19 +139,22 @@ test("estimateDispatchSize: under-cap, light tier, no mentions → well under th
     subagentType: "crew:investigator",
     prompt: "Find where parseAgentDispatchSizeInput is defined."
   });
-  assert.equal(est.estimatedTokens, 15_000);
-  assert.equal(est.overThreshold, false);
+  expect(est.estimatedTokens).toBe(15_000);
+  expect(est.overThreshold).toBe(false);
 });
 
 test("estimateDispatchSize: death-mode prompt (wide-scope + 40 file mentions) → over threshold", () => {
   const est = estimateDispatchSize({ subagentType: "crew:reviewer", prompt: deathModePrompt() });
-  assert.equal(est.wideScope, true);
-  assert.ok(est.fileMentions >= 27, `expected >=27 file mentions, got ${est.fileMentions}`);
-  assert.ok(
+  expect(est.wideScope).toBe(true);
+  expect(
+    est.fileMentions >= 27,
+    `expected >=27 file mentions, got ${est.fileMentions}`
+  ).toBeTruthy();
+  expect(
     est.estimatedTokens > DISPATCH_SIZE_THRESHOLD,
     `expected >${DISPATCH_SIZE_THRESHOLD}, got ${est.estimatedTokens}`
-  );
-  assert.equal(est.overThreshold, true);
+  ).toBeTruthy();
+  expect(est.overThreshold).toBe(true);
 });
 
 // ── parse ────────────────────────────────────────────────────────────────
@@ -161,10 +163,10 @@ test("parseAgentDispatchSizeInput: valid Agent payload → parsed", () => {
   const result = parseAgentDispatchSizeInput(
     agentPayload({ cwd: "/repo", subagentType: "crew:fullstack-dev", prompt: "do the thing" })
   );
-  assert.ok(result !== null);
-  assert.equal(result.subagentType, "crew:fullstack-dev");
-  assert.equal(result.prompt, "do the thing");
-  assert.equal(result.cwd, "/repo");
+  expect(result !== null).toBeTruthy();
+  expect(result!.subagentType).toBe("crew:fullstack-dev");
+  expect(result!.prompt).toBe("do the thing");
+  expect(result!.cwd).toBe("/repo");
 });
 
 test("parseAgentDispatchSizeInput: non-Agent tool_name → null (untouched)", () => {
@@ -174,62 +176,62 @@ test("parseAgentDispatchSizeInput: non-Agent tool_name → null (untouched)", ()
     tool_input: { command: "ls" },
     cwd: "/repo"
   });
-  assert.equal(parseAgentDispatchSizeInput(raw), null);
+  expect(parseAgentDispatchSizeInput(raw)).toBe(null);
 });
 
 test("parseAgentDispatchSizeInput: malformed JSON → null, no throw", () => {
-  assert.equal(parseAgentDispatchSizeInput("not json at all"), null);
-  assert.equal(parseAgentDispatchSizeInput("{broken:"), null);
-  assert.equal(parseAgentDispatchSizeInput(""), null);
+  expect(parseAgentDispatchSizeInput("not json at all")).toBe(null);
+  expect(parseAgentDispatchSizeInput("{broken:")).toBe(null);
+  expect(parseAgentDispatchSizeInput("")).toBe(null);
 });
 
 test("parseAgentDispatchSizeInput: missing subagent_type → null", () => {
   const raw = JSON.stringify({ tool_name: "Agent", tool_input: { prompt: "x" }, cwd: "/repo" });
-  assert.equal(parseAgentDispatchSizeInput(raw), null);
+  expect(parseAgentDispatchSizeInput(raw)).toBe(null);
 });
 
 // ── decide + build output ───────────────────────────────────────────────
 
 test("decideDispatchSizeAction: under threshold → none regardless of mode", () => {
   const est = estimateDispatchSize({ subagentType: "crew:investigator", prompt: "small task" });
-  assert.equal(decideDispatchSizeAction(est, false).action, "none");
-  assert.equal(decideDispatchSizeAction(est, true).action, "none");
+  expect(decideDispatchSizeAction(est, false).action).toBe("none");
+  expect(decideDispatchSizeAction(est, true).action).toBe("none");
 });
 
 test("decideDispatchSizeAction: over threshold + warn mode (flag off) → warn", () => {
   const est = estimateDispatchSize({ subagentType: "crew:reviewer", prompt: deathModePrompt() });
-  assert.equal(decideDispatchSizeAction(est, false).action, "warn");
+  expect(decideDispatchSizeAction(est, false).action).toBe("warn");
 });
 
 test("decideDispatchSizeAction: over threshold + block mode (flag on) → block", () => {
   const est = estimateDispatchSize({ subagentType: "crew:reviewer", prompt: deathModePrompt() });
-  assert.equal(decideDispatchSizeAction(est, true).action, "block");
+  expect(decideDispatchSizeAction(est, true).action).toBe("block");
 });
 
 test("buildDispatchSizeOutput: none → null", () => {
   const est = estimateDispatchSize({ subagentType: "crew:investigator", prompt: "small" });
-  assert.equal(buildDispatchSizeOutput(decideDispatchSizeAction(est, false)), null);
+  expect(buildDispatchSizeOutput(decideDispatchSizeAction(est, false))).toBe(null);
 });
 
 test("buildDispatchSizeOutput: warn → allow + systemMessage nudging a split", () => {
   const est = estimateDispatchSize({ subagentType: "crew:reviewer", prompt: deathModePrompt() });
   const out = buildDispatchSizeOutput(decideDispatchSizeAction(est, false));
-  assert.ok(out !== null);
+  expect(out !== null).toBeTruthy();
   const parsed = JSON.parse(out as string);
-  assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
-  assert.equal(parsed.hookSpecificOutput.permissionDecision, "allow");
-  assert.match(parsed.systemMessage, /split/i);
-  assert.match(parsed.systemMessage, /dispatch-size-gate/);
+  expect(parsed.hookSpecificOutput.hookEventName).toBe("PreToolUse");
+  expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
+  expect(parsed.systemMessage).toMatch(/split/i);
+  expect(parsed.systemMessage).toMatch(/dispatch-size-gate/);
 });
 
 test("buildDispatchSizeOutput: block → {decision:'block'} with an actionable split message", () => {
   const est = estimateDispatchSize({ subagentType: "crew:reviewer", prompt: deathModePrompt() });
   const out = buildDispatchSizeOutput(decideDispatchSizeAction(est, true));
-  assert.ok(out !== null);
+  expect(out !== null).toBeTruthy();
   const parsed = JSON.parse(out as string);
-  assert.equal(parsed.decision, "block");
-  assert.match(parsed.reason, /split/i);
-  assert.match(parsed.reason, /8 agents have died/);
+  expect(parsed.decision).toBe("block");
+  expect(parsed.reason).toMatch(/split/i);
+  expect(parsed.reason).toMatch(/8 agents have died/);
 });
 
 // ── runDispatchSizeGateHook (full orchestration, in-process) ──────────────
@@ -242,7 +244,7 @@ test("runDispatchSizeGateHook: under-cap dispatch → pass (null)", async () =>
       subagentType: "crew:investigator",
       prompt: "Find where X is defined."
     });
-    assert.equal(await runDispatchSizeGateHook(raw), null);
+    expect(await runDispatchSizeGateHook(raw)).toBe(null);
   } finally {
     await cleanup(repo);
   }
@@ -257,10 +259,10 @@ test("runDispatchSizeGateHook: over-cap + no crew.json (default warn) → warn o
       prompt: deathModePrompt()
     });
     const out = await runDispatchSizeGateHook(raw);
-    assert.ok(out !== null);
+    expect(out !== null).toBeTruthy();
     const parsed = JSON.parse(out as string);
-    assert.equal(parsed.hookSpecificOutput.permissionDecision, "allow");
-    assert.ok(parsed.systemMessage);
+    expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
+    expect(parsed.systemMessage).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -276,9 +278,9 @@ test("runDispatchSizeGateHook: over-cap + dispatch-size-gate enabled → block o
       prompt: deathModePrompt()
     });
     const out = await runDispatchSizeGateHook(raw);
-    assert.ok(out !== null);
+    expect(out !== null).toBeTruthy();
     const parsed = JSON.parse(out as string);
-    assert.equal(parsed.decision, "block");
+    expect(parsed.decision).toBe("block");
   } finally {
     await cleanup(repo);
   }
@@ -294,9 +296,9 @@ test("runDispatchSizeGateHook: dispatch-size-gate explicitly disabled → still
       prompt: deathModePrompt()
     });
     const out = await runDispatchSizeGateHook(raw);
-    assert.ok(out !== null);
+    expect(out !== null).toBeTruthy();
     const parsed = JSON.parse(out as string);
-    assert.equal(parsed.hookSpecificOutput.permissionDecision, "allow");
+    expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
   } finally {
     await cleanup(repo);
   }
@@ -311,15 +313,15 @@ test("runDispatchSizeGateHook: non-Agent tool → untouched (null)", async () =>
       tool_input: { command: "ls" },
       cwd: repo
     });
-    assert.equal(await runDispatchSizeGateHook(raw), null);
+    expect(await runDispatchSizeGateHook(raw)).toBe(null);
   } finally {
     await cleanup(repo);
   }
 });
 
 test("runDispatchSizeGateHook: malformed payload → pass (null), no throw", async () => {
-  assert.equal(await runDispatchSizeGateHook("not json at all"), null);
-  assert.equal(await runDispatchSizeGateHook("{broken:"), null);
+  expect(await runDispatchSizeGateHook("not json at all")).toBe(null);
+  expect(await runDispatchSizeGateHook("{broken:")).toBe(null);
 });
 
 test("runDispatchSizeGateHook: every valid dispatch is logged to events.jsonl for calibration", async () => {
@@ -333,10 +335,10 @@ test("runDispatchSizeGateHook: every valid dispatch is logged to events.jsonl fo
     await runDispatchSizeGateHook(raw);
     const events = await readEvents(repo);
     const row = events.find((e) => e.event === "dispatch-size-gate");
-    assert.ok(row, "expected a dispatch-size-gate calibration row");
-    assert.equal(row?.action, "none");
-    assert.equal(row?.subagentType, "crew:investigator");
-    assert.equal(typeof row?.estimatedTokens, "number");
+    expect(row, "expected a dispatch-size-gate calibration row").toBeTruthy();
+    expect(row?.action).toBe("none");
+    expect(row?.subagentType).toBe("crew:investigator");
+    expect(typeof row?.estimatedTokens).toBe("number");
   } finally {
     await cleanup(repo);
   }
@@ -353,8 +355,8 @@ test("shim: CREW_DISPATCH_SIZE_GATE=0 → pass unconditionally, even over-cap",
       prompt: deathModePrompt()
     });
     const result = await runHook(raw, { CREW_DISPATCH_SIZE_GATE: "0" });
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -362,8 +364,8 @@ test("shim: CREW_DISPATCH_SIZE_GATE=0 → pass unconditionally, even over-cap",
 
 test("shim: malformed stdin → exit 0, no crash, no stdout", async () => {
   const result = await runHook("not json at all");
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("shim: non-Agent tool event → untouched, exit 0, no stdout", async () => {
@@ -376,8 +378,8 @@ test("shim: non-Agent tool event → untouched, exit 0, no stdout", async () =>
       cwd: repo
     });
     const result = await runHook(raw);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -392,10 +394,10 @@ test("shim: over-cap dispatch via subprocess → warn JSON on stdout, exit 0", a
       prompt: deathModePrompt()
     });
     const result = await runHook(raw);
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.hookSpecificOutput.permissionDecision, "allow");
+    expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/dispatch-timing-pre-tap.test.mts b/crew/tests/dispatch-timing-pre-tap.test.mts
index c1ce2e59..5403a4b4 100644
--- a/crew/tests/dispatch-timing-pre-tap.test.mts
+++ b/crew/tests/dispatch-timing-pre-tap.test.mts
@@ -1,7 +1,6 @@
 // tests/dispatch-timing-pre-tap.test.ts
-// Unit tests for hooks/lib/dispatch-timing-pre-tap.ts (FEAT-149)
-import { test } from "node:test";
-import assert from "node:assert/strict";
+// Unit tests for hooks/lib/dispatch-timing-pre-tap.mjs (FEAT-149)
+import { test, expect } from "bun:test";
 import { promises as fs } from "node:fs";
 import os from "node:os";
 import path from "node:path";
@@ -28,10 +27,10 @@ test("parseAgentPreInput: valid Agent PreToolUse payload → object", () => {
     }
   });
   const result = parseAgentPreInput(payload);
-  assert.ok(result !== null);
-  assert.equal(result.session_id, "s1");
-  assert.equal(result.subagent_type, "crew:fullstack-dev");
-  assert.equal(result.description, "implement the feature");
+  expect(result !== null).toBeTruthy();
+  expect(result!.session_id).toBe("s1");
+  expect(result!.subagent_type).toBe("crew:fullstack-dev");
+  expect(result!.description).toBe("implement the feature");
 });
 
 test("parseAgentPreInput: non-Agent tool_name → null", () => {
@@ -40,13 +39,13 @@ test("parseAgentPreInput: non-Agent tool_name → null", () => {
     tool_name: "Bash",
     tool_input: { command: "ls" }
   });
-  assert.equal(parseAgentPreInput(payload), null);
+  expect(parseAgentPreInput(payload)).toBe(null);
 });
 
 test("parseAgentPreInput: malformed JSON → null", () => {
-  assert.equal(parseAgentPreInput("not json at all"), null);
-  assert.equal(parseAgentPreInput("{broken:"), null);
-  assert.equal(parseAgentPreInput(""), null);
+  expect(parseAgentPreInput("not json at all")).toBe(null);
+  expect(parseAgentPreInput("{broken:")).toBe(null);
+  expect(parseAgentPreInput("")).toBe(null);
 });
 
 test("parseAgentPreInput: missing tool_name field → null", () => {
@@ -54,7 +53,7 @@ test("parseAgentPreInput: missing tool_name field → null", () => {
     session_id: "s1",
     tool_input: { subagent_type: "crew:fullstack-dev" }
   });
-  assert.equal(parseAgentPreInput(payload), null);
+  expect(parseAgentPreInput(payload)).toBe(null);
 });
 
 test("parseAgentPreInput: missing tool_input → null", () => {
@@ -62,7 +61,7 @@ test("parseAgentPreInput: missing tool_input → null", () => {
     session_id: "s1",
     tool_name: "Agent"
   });
-  assert.equal(parseAgentPreInput(payload), null);
+  expect(parseAgentPreInput(payload)).toBe(null);
 });
 
 test("parseAgentPreInput: minimal payload with only tool_name Agent and tool_input → defaults applied", () => {
@@ -71,10 +70,10 @@ test("parseAgentPreInput: minimal payload with only tool_name Agent and tool_inp
     tool_input: {}
   });
   const result = parseAgentPreInput(payload);
-  assert.ok(result !== null);
-  assert.equal(result.session_id, "");
-  assert.equal(result.subagent_type, "unknown");
-  assert.equal(result.description, "");
+  expect(result !== null).toBeTruthy();
+  expect(result!.session_id).toBe("");
+  expect(result!.subagent_type).toBe("unknown");
+  expect(result!.description).toBe("");
 });
 
 // ── lookupAgentModel ──────────────────────────────────────────────────────────
@@ -83,22 +82,22 @@ test("parseAgentPreInput: minimal payload with only tool_name Agent and tool_inp
 
 test("lookupAgentModel: crew:fullstack-dev → sonnet", async () => {
   const model = await lookupAgentModel("crew:fullstack-dev");
-  assert.equal(model, "sonnet");
+  expect(model).toBe("sonnet");
 });
 
 test("lookupAgentModel: crew:investigator → haiku", async () => {
   const model = await lookupAgentModel("crew:investigator");
-  assert.equal(model, "haiku");
+  expect(model).toBe("haiku");
 });
 
 test("lookupAgentModel: nonexistent agent → unknown", async () => {
   const model = await lookupAgentModel("crew:nonexistent-agent-xyz");
-  assert.equal(model, "unknown");
+  expect(model).toBe("unknown");
 });
 
 test("lookupAgentModel: plain name without colon → unknown when no file", async () => {
   const model = await lookupAgentModel("general-purpose");
-  assert.equal(model, "unknown");
+  expect(model).toBe("unknown");
 });
 
 // ── runDispatchTimingPreTap ───────────────────────────────────────────────────
@@ -114,7 +113,7 @@ test("runDispatchTimingPreTap: no-ops when CREW_DISPATCH_TIMING_LOG=0", async ()
     ...process.env,
     CREW_DISPATCH_TIMING_LOG: "0"
   });
-  assert.equal(result, null);
+  expect(result).toBe(null);
 });
 
 test("runDispatchTimingPreTap: registers a handle + JSONL row appears after end tap", async () => {
@@ -142,7 +141,7 @@ test("runDispatchTimingPreTap: registers a handle + JSONL row appears after end
 
     try {
       const result = await runDispatchTimingPreTap(payload, process.env);
-      assert.equal(result, null);
+      expect(result).toBe(null);
 
       // Now simulate an end tap via the re-exported handle path
       // We directly call recordDispatchEnd with a manually-looked-up handle to verify
@@ -173,9 +172,9 @@ test("runDispatchTimingPreTap: registers a handle + JSONL row appears after end
         .trim()
         .split("\n")
         .map((l) => JSON.parse(l) as Record<string, unknown>);
-      assert.equal(rows.length, 1);
-      assert.equal(rows[0]!["agent"], "crew:fullstack-dev");
-      assert.ok(typeof rows[0]!["wallMs"] === "number");
+      expect(rows.length).toBe(1);
+      expect(rows[0]!["agent"]).toBe("crew:fullstack-dev");
+      expect(typeof rows[0]!["wallMs"] === "number").toBeTruthy();
     } finally {
       process.env.CREW_DISPATCH_TIMING_LOG = origLog;
       if (origRoot !== undefined) {
@@ -199,7 +198,7 @@ test("runDispatchTimingPreTap: returns null on non-Agent tool event", async () =
     ...process.env,
     CREW_DISPATCH_TIMING_LOG: "/tmp/should-not-write.jsonl"
   });
-  assert.equal(result, null);
+  expect(result).toBe(null);
 });
 
 // ── parseUsageMetrics (end-tap improvement) ───────────────────────────────────
@@ -208,31 +207,31 @@ test("parseUsageMetrics: full usage block → all fields parsed", () => {
   const body =
     "Some result text\n<usage>total_tokens: 1234 tool_uses: 17 duration_ms: 45000</usage>\nMore text";
   const metrics = parseUsageMetrics(body);
-  assert.equal(metrics.totalTokens, 1234);
-  assert.equal(metrics.toolUses, 17);
-  assert.equal(metrics.durationMs, 45000);
+  expect(metrics.totalTokens).toBe(1234);
+  expect(metrics.toolUses).toBe(17);
+  expect(metrics.durationMs).toBe(45000);
 });
 
 test("parseUsageMetrics: no usage block → all zeros", () => {
   const body = "Plain subagent return without usage marker";
   const metrics = parseUsageMetrics(body);
-  assert.equal(metrics.totalTokens, 0);
-  assert.equal(metrics.toolUses, 0);
-  assert.equal(metrics.durationMs, 0);
+  expect(metrics.totalTokens).toBe(0);
+  expect(metrics.toolUses).toBe(0);
+  expect(metrics.durationMs).toBe(0);
 });
 
 test("parseUsageMetrics: partial block missing tool_uses → toolUses=0", () => {
   const body = "<usage>total_tokens: 500 duration_ms: 1000</usage>";
   const metrics = parseUsageMetrics(body);
-  assert.equal(metrics.totalTokens, 500);
-  assert.equal(metrics.toolUses, 0);
-  assert.equal(metrics.durationMs, 1000);
+  expect(metrics.totalTokens).toBe(500);
+  expect(metrics.toolUses).toBe(0);
+  expect(metrics.durationMs).toBe(1000);
 });
 
 test("parseUsageMetrics: multiline usage block → parsed correctly", () => {
   const body = "<usage>\ntotal_tokens: 999\ntool_uses: 5\nduration_ms: 12345\n</usage>";
   const metrics = parseUsageMetrics(body);
-  assert.equal(metrics.totalTokens, 999);
-  assert.equal(metrics.toolUses, 5);
-  assert.equal(metrics.durationMs, 12345);
+  expect(metrics.totalTokens).toBe(999);
+  expect(metrics.toolUses).toBe(5);
+  expect(metrics.durationMs).toBe(12345);
 });
diff --git a/crew/tests/dispatch-timing-reader.test.mts b/crew/tests/dispatch-timing-reader.test.mts
index 0adca01a..d108e119 100644
--- a/crew/tests/dispatch-timing-reader.test.mts
+++ b/crew/tests/dispatch-timing-reader.test.mts
@@ -1,7 +1,6 @@
 // tests/dispatch-timing-reader.test.ts — FEAT-151 TDD (red phase).
 // Tests for aggregateDispatchTiming, aggregateBashGates, renderDispatchBreakdownSection.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -51,10 +50,10 @@ test("aggregates top-3 slowest + top-3 token-heaviest per runId", async () => {
     ];
     await fs.writeFile(log, rows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
     const agg = await aggregateDispatchTiming(log, "r1");
-    assert.equal(agg.totalWallMs, 13000);
-    assert.equal(agg.rowCount, 2);
-    assert.equal(agg.topSlow[0]?.agent, "crew:reviewer");
-    assert.equal(agg.topTokens[0]?.agent, "crew:fullstack-dev");
+    expect(agg.totalWallMs).toBe(13000);
+    expect(agg.rowCount).toBe(2);
+    expect(agg.topSlow[0]?.agent).toBe("crew:reviewer");
+    expect(agg.topTokens[0]?.agent).toBe("crew:fullstack-dev");
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -62,10 +61,10 @@ test("aggregates top-3 slowest + top-3 token-heaviest per runId", async () => {
 
 test("returns empty aggregate when log missing", async () => {
   const agg = await aggregateDispatchTiming("/nonexistent/path.jsonl", "r1");
-  assert.equal(agg.rowCount, 0);
-  assert.equal(agg.totalWallMs, 0);
-  assert.deepEqual(agg.topSlow, []);
-  assert.deepEqual(agg.topTokens, []);
+  expect(agg.rowCount).toBe(0);
+  expect(agg.totalWallMs).toBe(0);
+  expect(agg.topSlow).toEqual([]);
+  expect(agg.topTokens).toEqual([]);
 });
 
 test("returns empty aggregate when runId not present", async () => {
@@ -87,7 +86,7 @@ test("returns empty aggregate when runId not present", async () => {
       "utf-8"
     );
     const agg = await aggregateDispatchTiming(log, "missing");
-    assert.equal(agg.rowCount, 0);
+    expect(agg.rowCount).toBe(0);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -132,10 +131,10 @@ test("topTokens sorts by tokenIn + tokenOut descending", async () => {
     await fs.writeFile(log, rows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
     const agg = await aggregateDispatchTiming(log, "r1");
     // b: 700 total, c: 600 total, a: 150 total
-    assert.equal(agg.topTokens[0]?.agent, "b");
-    assert.equal(agg.topTokens[1]?.agent, "c");
-    assert.equal(agg.topTokens[2]?.agent, "a");
-    assert.equal(agg.topTokens[0]?.totalTokens, 700);
+    expect(agg.topTokens[0]?.agent).toBe("b");
+    expect(agg.topTokens[1]?.agent).toBe("c");
+    expect(agg.topTokens[2]?.agent).toBe("a");
+    expect(agg.topTokens[0]?.totalTokens).toBe(700);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -154,9 +153,9 @@ test("aggregateBashGates sums durations per gate", async () => {
     ];
     await fs.writeFile(log, rows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
     const agg = await aggregateBashGates(log);
-    assert.equal(agg.totalMs, 11500);
-    assert.equal(agg.byGate["lint"], 3500);
-    assert.equal(agg.byGate["typecheck"], 8000);
+    expect(agg.totalMs).toBe(11500);
+    expect(agg.byGate["lint"]).toBe(3500);
+    expect(agg.byGate["typecheck"]).toBe(8000);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -164,10 +163,10 @@ test("aggregateBashGates sums durations per gate", async () => {
 
 test("aggregateBashGates returns empty aggregate when log missing", async () => {
   const agg = await aggregateBashGates("/nonexistent/bash-gates.jsonl");
-  assert.equal(agg.rowCount, 0);
-  assert.equal(agg.totalMs, 0);
-  assert.equal(agg.timeoutCount, 0);
-  assert.deepEqual(agg.byGate, {});
+  expect(agg.rowCount).toBe(0);
+  expect(agg.totalMs).toBe(0);
+  expect(agg.timeoutCount).toBe(0);
+  expect(agg.byGate).toEqual({});
 });
 
 test("aggregateBashGates counts timeout exits (exitCode 124)", async () => {
@@ -180,8 +179,8 @@ test("aggregateBashGates counts timeout exits (exitCode 124)", async () => {
     ];
     await fs.writeFile(log, rows.map((r) => JSON.stringify(r)).join("\n"), "utf-8");
     const agg = await aggregateBashGates(log);
-    assert.equal(agg.timeoutCount, 1);
-    assert.equal(agg.rowCount, 2);
+    expect(agg.timeoutCount).toBe(1);
+    expect(agg.rowCount).toBe(2);
   } finally {
     await fs.rm(tmp, { recursive: true, force: true });
   }
@@ -194,7 +193,7 @@ test("renderDispatchBreakdownSection returns empty string when both aggregates e
     { rowCount: 0, totalWallMs: 0, topSlow: [], topTokens: [] },
     { rowCount: 0, totalMs: 0, timeoutCount: 0, byGate: {} }
   );
-  assert.equal(section, "");
+  expect(section).toBe("");
 });
 
 test("renderDispatchBreakdownSection includes section header and slow agent row", () => {
@@ -238,11 +237,11 @@ test("renderDispatchBreakdownSection includes section header and slow agent row"
     byGate: { typecheck: 8000 }
   };
   const section = renderDispatchBreakdownSection(dispatchAgg, bashAgg);
-  assert.match(section, /## Per-dispatch breakdown/);
-  assert.match(section, /crew:reviewer/);
-  assert.match(section, /crew:fullstack-dev/);
-  assert.match(section, /typecheck/);
-  assert.match(section, /13000ms/);
+  expect(section).toMatch(/## Per-dispatch breakdown/);
+  expect(section).toMatch(/crew:reviewer/);
+  expect(section).toMatch(/crew:fullstack-dev/);
+  expect(section).toMatch(/typecheck/);
+  expect(section).toMatch(/13000ms/);
 });
 
 test("renderDispatchBreakdownSection renders (no data) when topSlow empty but rowCount > 0 somehow", () => {
@@ -260,9 +259,9 @@ test("renderDispatchBreakdownSection renders (no data) when topSlow empty but ro
   };
   // bash data present but dispatch empty → still renders bash section
   const section = renderDispatchBreakdownSection(dispatchAgg, bashAgg);
-  assert.match(section, /## Per-dispatch breakdown/);
-  assert.match(section, /no data/);
-  assert.match(section, /lint/);
+  expect(section).toMatch(/## Per-dispatch breakdown/);
+  expect(section).toMatch(/no data/);
+  expect(section).toMatch(/lint/);
 });
 
 test("renderDispatchBreakdownSection handles missing toolCalls fields gracefully", () => {
@@ -286,5 +285,5 @@ test("renderDispatchBreakdownSection handles missing toolCalls fields gracefully
   const bashAgg = { rowCount: 0, totalMs: 0, timeoutCount: 0, byGate: {} };
   const section = renderDispatchBreakdownSection(dispatchAgg, bashAgg);
   // Should not throw; missing Read/Edit/Bash render as 0
-  assert.match(section, /0/);
+  expect(section).toMatch(/0/);
 });
diff --git a/crew/tests/dispatch-timing.test.mts b/crew/tests/dispatch-timing.test.mts
index 08b9ae20..1777ff1a 100644
--- a/crew/tests/dispatch-timing.test.mts
+++ b/crew/tests/dispatch-timing.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { promises as fs } from "node:fs";
 import os from "node:os";
 import path from "node:path";
@@ -31,13 +30,13 @@ test("records start + end as single JSONL row with wallMs", async () => {
       .trim()
       .split("\n")
       .map((l) => JSON.parse(l) as Record<string, unknown>);
-    assert.equal(rows.length, 1);
-    assert.equal(rows[0]!["agent"], "crew:fullstack-dev");
-    assert.ok(
+    expect(rows.length).toBe(1);
+    expect(rows[0]!["agent"]).toBe("crew:fullstack-dev");
+    expect(
       typeof rows[0]!["wallMs"] === "number" && rows[0]!["wallMs"] >= 25,
       `Expected wallMs >= 25, got ${String(rows[0]!["wallMs"])}`
-    );
-    assert.deepEqual(rows[0]!["toolCalls"], { Read: 3, Edit: 1, Bash: 2 });
+    ).toBeTruthy();
+    expect(rows[0]!["toolCalls"]).toEqual({ Read: 3, Edit: 1, Bash: 2 });
   } finally {
     delete process.env.CREW_DISPATCH_TIMING_LOG;
     await fs.rm(tmp, { recursive: true, force: true });
diff --git a/crew/tests/docs-only.test.mts b/crew/tests/docs-only.test.mts
index 2e0c1962..97571615 100644
--- a/crew/tests/docs-only.test.mts
+++ b/crew/tests/docs-only.test.mts
@@ -4,8 +4,7 @@ import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
 import { execFileSync } from "node:child_process";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import { isDocsOnlyDiff, pushedFileset, isDocsOnlyPush } from "../scripts/lib/docs-only.mjs";
 
@@ -25,22 +24,22 @@ function git(args: string[], cwd: string): string {
 
 test("isDocsOnlyDiff — pure path classification", () => {
   // All-docs sets → true.
-  assert.equal(isDocsOnlyDiff(["README.md", "docs/architecture/x.md"]), true);
-  assert.equal(isDocsOnlyDiff(["CHANGELOG.md", "LICENSE"]), true);
-  assert.equal(isDocsOnlyDiff([".claude/artifacts/crew/reviews/r.md"]), true);
-  assert.equal(isDocsOnlyDiff(["notes.txt", "docs/guide.mdx"]), true);
+  expect(isDocsOnlyDiff(["README.md", "docs/architecture/x.md"])).toBe(true);
+  expect(isDocsOnlyDiff(["CHANGELOG.md", "LICENSE"])).toBe(true);
+  expect(isDocsOnlyDiff([".claude/artifacts/crew/reviews/r.md"])).toBe(true);
+  expect(isDocsOnlyDiff(["notes.txt", "docs/guide.mdx"])).toBe(true);
   // Backslash paths (Windows-style) normalize.
-  assert.equal(isDocsOnlyDiff(["docs\\a.md"]), true);
+  expect(isDocsOnlyDiff(["docs\\a.md"])).toBe(true);
 
   // Any non-docs path → false.
-  assert.equal(isDocsOnlyDiff(["README.md", "scripts/lib/x.ts"]), false);
-  assert.equal(isDocsOnlyDiff(["package.json"]), false);
-  assert.equal(isDocsOnlyDiff(["docs.ts"]), false); // not under docs/, .ts extension
-  assert.equal(isDocsOnlyDiff(["src/readme.md.ts"]), false);
+  expect(isDocsOnlyDiff(["README.md", "scripts/lib/x.ts"])).toBe(false);
+  expect(isDocsOnlyDiff(["package.json"])).toBe(false);
+  expect(isDocsOnlyDiff(["docs.ts"])).toBe(false); // not under docs/, .ts extension
+  expect(isDocsOnlyDiff(["src/readme.md.ts"])).toBe(false);
 
   // Empty → false (nothing to reason about).
-  assert.equal(isDocsOnlyDiff([]), false);
-  assert.equal(isDocsOnlyDiff(["  "]), false);
+  expect(isDocsOnlyDiff([])).toBe(false);
+  expect(isDocsOnlyDiff(["  "])).toBe(false);
 });
 
 async function makeRepoWithUpstream(label: string): Promise<string> {
@@ -72,8 +71,8 @@ test("pushedFileset resolves the branch's added files against upstream", async (
   git(["branch", "--set-upstream-to=origin/main", "chore/lane"], work);
 
   const files = await pushedFileset(work);
-  assert.notEqual(files, null);
-  assert.deepEqual((files ?? []).sort(), ["docs.md", "docs/guide.md"]);
+  expect(files).not.toBe(null);
+  expect((files ?? []).sort()).toEqual(["docs.md", "docs/guide.md"]);
 });
 
 test("isDocsOnlyPush — true for a docs-only branch, false when code is mixed in", async () => {
@@ -83,13 +82,13 @@ test("isDocsOnlyPush — true for a docs-only branch, false when code is mixed i
   git(["add", "-A"], work);
   git(["commit", "-q", "-m", "docs"], work);
   git(["branch", "--set-upstream-to=origin/main", "chore/lane"], work);
-  assert.equal(await isDocsOnlyPush(work), true);
+  expect(await isDocsOnlyPush(work)).toBe(true);
 
   // Add a code file → no longer docs-only.
   await fs.writeFile(path.join(work, "index.ts"), "export const x = 1;\n");
   git(["add", "-A"], work);
   git(["commit", "-q", "-m", "code"], work);
-  assert.equal(await isDocsOnlyPush(work), false);
+  expect(await isDocsOnlyPush(work)).toBe(false);
 });
 
 test("isDocsOnlyPush — false (indeterminate) when no upstream can be resolved", async () => {
@@ -101,6 +100,6 @@ test("isDocsOnlyPush — false (indeterminate) when no upstream can be resolved"
   git(["add", "-A"], solo);
   git(["commit", "-q", "-m", "init"], solo);
   // No remote, no upstream → indeterminate → false (normal gate applies).
-  assert.equal(await pushedFileset(solo), null);
-  assert.equal(await isDocsOnlyPush(solo), false);
+  expect(await pushedFileset(solo)).toBe(null);
+  expect(await isDocsOnlyPush(solo)).toBe(false);
 });
diff --git a/crew/tests/drift-check-cli.test.mts b/crew/tests/drift-check-cli.test.mts
index 51234913..1ecde6d3 100644
--- a/crew/tests/drift-check-cli.test.mts
+++ b/crew/tests/drift-check-cli.test.mts
@@ -10,8 +10,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   parseDriftCheckArgs,
   runDriftCheckCli,
@@ -66,19 +65,19 @@ test("parseDriftCheckArgs reads --repo/--threshold/--window-days", () => {
     "--window-days",
     "30"
   ]);
-  assert.equal(opts.repo, "/some/repo");
-  assert.equal(opts.threshold, 3);
-  assert.equal(opts.windowDays, 30);
+  expect(opts.repo).toBe("/some/repo");
+  expect(opts.threshold).toBe(3);
+  expect(opts.windowDays).toBe(30);
 });
 
 test("parseDriftCheckArgs defaults threshold to 0 and windowDays to undefined", () => {
   const opts = parseDriftCheckArgs(["--repo", "/some/repo"]);
-  assert.equal(opts.threshold, 0);
-  assert.equal(opts.windowDays, undefined);
+  expect(opts.threshold).toBe(0);
+  expect(opts.windowDays).toBe(undefined);
 });
 
 test("parseDriftCheckArgs rejects a non-numeric --threshold", () => {
-  assert.throws(() => parseDriftCheckArgs(["--threshold", "nope"]), /--threshold must be/);
+  expect(() => parseDriftCheckArgs(["--threshold", "nope"])).toThrow(/--threshold must be/);
 });
 
 test("runDriftCheckCli exits 0 and emits no event when drift is within threshold", async () => {
@@ -99,15 +98,14 @@ test("runDriftCheckCli exits 0 and emits no event when drift is within threshold
       { __resolveRemote: async () => remote }
     );
 
-    assert.equal(result.exitCode, 0, "1 missing entry with threshold 5 must not fail the gate");
-    assert.equal(result.report?.missingFromAstramem.length, 1);
+    expect(result.exitCode, "1 missing entry with threshold 5 must not fail the gate").toBe(0);
+    expect(result.report?.missingFromAstramem.length).toBe(1);
 
     const events = await readEvents(repo);
-    assert.equal(
+    expect(
       events.filter((e) => e["event"] === "memory_drift").length,
-      0,
       "no memory_drift event should be emitted when drift is within threshold"
-    );
+    ).toBe(0);
   } finally {
     await cleanup(repo);
   }
@@ -137,20 +135,19 @@ test("runDriftCheckCli exits 1 and emits a memory_drift event carrying count + i
       __resolveRemote: async () => remote
     });
 
-    assert.equal(result.exitCode, 1, "2 missing entries with threshold 0 must fail the gate");
-    assert.equal(result.report?.missingFromAstramem.length, 2);
+    expect(result.exitCode, "2 missing entries with threshold 0 must fail the gate").toBe(1);
+    expect(result.report?.missingFromAstramem.length).toBe(2);
 
     const events = await readEvents(repo);
     const driftEvents = events.filter((e) => e["event"] === "memory_drift");
-    assert.equal(driftEvents.length, 1, "exactly one memory_drift event must be emitted");
+    expect(driftEvents.length, "exactly one memory_drift event must be emitted").toBe(1);
     const event = driftEvents[0] as { count: number; ids: string[]; threshold: number };
-    assert.equal(event.count, 2, "AC-4: event must carry the missing-entry count");
-    assert.equal(event.threshold, 0);
-    assert.deepEqual(
+    expect(event.count, "AC-4: event must carry the missing-entry count").toBe(2);
+    expect(event.threshold).toBe(0);
+    expect(
       [...event.ids].sort(),
-      ["exceeds-threshold-marker-a", "exceeds-threshold-marker-b"],
       "AC-4: event must carry the ids of entries missing from the SoT so they can be reconciled"
-    );
+    ).toEqual(["exceeds-threshold-marker-a", "exceeds-threshold-marker-b"]);
   } finally {
     await cleanup(repo);
   }
@@ -163,16 +160,15 @@ test("runDriftCheckCli exits 2 (inconclusive, no event) when astramem cannot be
       __resolveRemote: async () => null
     });
 
-    assert.equal(result.exitCode, 2);
-    assert.equal(result.report, null);
-    assert.match(result.reason ?? "", /unreachable|unpaired|not paired/i);
+    expect(result.exitCode).toBe(2);
+    expect(result.report).toBe(null);
+    expect(result.reason ?? "").toMatch(/unreachable|unpaired|not paired/i);
 
     const events = await readEvents(repo);
-    assert.equal(
+    expect(
       events.filter((e) => e["event"] === "memory_drift").length,
-      0,
       "an inconclusive (astramem-unreachable) run must not emit a memory_drift event"
-    );
+    ).toBe(0);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/enum-verdicts.test.mts b/crew/tests/enum-verdicts.test.mts
index 89e02098..681d5ed9 100644
--- a/crew/tests/enum-verdicts.test.mts
+++ b/crew/tests/enum-verdicts.test.mts
@@ -7,8 +7,7 @@
 import fs from "node:fs/promises";
 import path from "node:path";
 import { spawnSync } from "node:child_process";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { registerWorkflowArtifact } from "../scripts/lib/workflow-state.mjs";
 import type { ArtifactRef } from "../scripts/lib/workflow-state.mjs";
@@ -46,7 +45,7 @@ async function cleanup(dir: string) {
 
 test("normalizeReviewDecision: needs_fix normalizes to rejected (aliasOf recorded)", () => {
   const result = normalizeReviewDecision("needs_fix");
-  assert.deepEqual(result, { canonical: "rejected", aliasOf: "needs_fix" });
+  expect(result).toEqual({ canonical: "rejected", aliasOf: "needs_fix" });
 });
 
 // FIX-0: architect-reviewer.md emits approved_with_conditions / needs_revision,
@@ -55,7 +54,7 @@ test("normalizeReviewDecision: needs_fix normalizes to rejected (aliasOf recorde
 // before anything was written. Widen the alias map, not the canonical enum.
 test("normalizeReviewDecision: approved_with_conditions normalizes to approved_with_notes (aliasOf recorded)", () => {
   const result = normalizeReviewDecision("approved_with_conditions");
-  assert.deepEqual(result, {
+  expect(result).toEqual({
     canonical: "approved_with_notes",
     aliasOf: "approved_with_conditions"
   });
@@ -63,33 +62,33 @@ test("normalizeReviewDecision: approved_with_conditions normalizes to approved_w
 
 test("normalizeReviewDecision: needs_revision normalizes to rejected (aliasOf recorded)", () => {
   const result = normalizeReviewDecision("needs_revision");
-  assert.deepEqual(result, { canonical: "rejected", aliasOf: "needs_revision" });
+  expect(result).toEqual({ canonical: "rejected", aliasOf: "needs_revision" });
 });
 
 test("normalizeReviewDecision: canonical values pass through with no aliasOf", () => {
   for (const value of ["approved", "approved_with_notes", "rejected"] as const) {
     const result = normalizeReviewDecision(value);
-    assert.deepEqual(result, { canonical: value });
+    expect(result).toEqual({ canonical: value });
   }
 });
 
 test("normalizeReviewDecision: unrecognized value returns null (fail closed, not open)", () => {
-  assert.equal(normalizeReviewDecision("lgtm"), null);
-  assert.equal(normalizeReviewDecision(undefined), null);
-  assert.equal(normalizeReviewDecision(""), null);
+  expect(normalizeReviewDecision("lgtm")).toBe(null);
+  expect(normalizeReviewDecision(undefined)).toBe(null);
+  expect(normalizeReviewDecision("")).toBe(null);
 });
 
 test("normalizeValidationDecision: legacy passed/passed_with_notes/failed normalize to canonical", () => {
-  assert.deepEqual(normalizeValidationDecision("passed"), { canonical: "pass", aliasOf: "passed" });
-  assert.deepEqual(normalizeValidationDecision("passed_with_notes"), {
+  expect(normalizeValidationDecision("passed")).toEqual({ canonical: "pass", aliasOf: "passed" });
+  expect(normalizeValidationDecision("passed_with_notes")).toEqual({
     canonical: "pass",
     aliasOf: "passed_with_notes"
   });
-  assert.deepEqual(normalizeValidationDecision("failed"), { canonical: "fail", aliasOf: "failed" });
+  expect(normalizeValidationDecision("failed")).toEqual({ canonical: "fail", aliasOf: "failed" });
 });
 
 test("normalizeValidationDecision: unrecognized value returns null", () => {
-  assert.equal(normalizeValidationDecision("banana"), null);
+  expect(normalizeValidationDecision("banana")).toBe(null);
 });
 
 // ---------------------------------------------------------------------------
@@ -110,20 +109,19 @@ test("write-review-result: needs_fix input is accepted, normalized to rejected i
       "--summary",
       "missing null guard"
     ]);
-    assert.equal(status, 0, "needs_fix must be accepted, not refused");
+    expect(status, "needs_fix must be accepted, not refused").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
     // Canonical value lands in frontmatter; the alias is documented in code,
     // not necessarily preserved in the artifact (needs_fix has no pre-P1.3
     // callers, so there's no back-compat body-prose burden here).
-    assert.match(body, /^decision: rejected$/m, "frontmatter must carry the canonical value");
+    expect(body, "frontmatter must carry the canonical value").toMatch(/^decision: rejected$/m);
 
     const state = await loadState(repoPath);
-    assert.equal(
+    expect(
       state.currentRun.gates.review.status,
-      "failed",
       "needs_fix must fail the review gate exactly like rejected"
-    );
+    ).toBe("failed");
   } finally {
     await cleanup(repoPath);
   }
@@ -145,13 +143,13 @@ test("write-review-result: approved_with_notes (with test-summary) writes canoni
       "--test-summary",
       "covered"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /^decision: approved_with_notes$/m);
+    expect(body).toMatch(/^decision: approved_with_notes$/m);
 
     const state = await loadState(repoPath);
-    assert.equal(state.currentRun.gates.review.status, "passed");
+    expect(state.currentRun.gates.review.status).toBe("passed");
   } finally {
     await cleanup(repoPath);
   }
@@ -173,17 +171,15 @@ test("write-review-result: approved_with_conditions (architect-reviewer.md verdi
       "--test-summary",
       "covered"
     ]);
-    assert.equal(status, 0, "approved_with_conditions must be accepted, not refused");
+    expect(status, "approved_with_conditions must be accepted, not refused").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(
-      body,
-      /^decision: approved_with_notes$/m,
-      "frontmatter must carry the canonical value"
+    expect(body, "frontmatter must carry the canonical value").toMatch(
+      /^decision: approved_with_notes$/m
     );
 
     const state = await loadState(repoPath);
-    assert.equal(state.currentRun.gates.review.status, "passed");
+    expect(state.currentRun.gates.review.status).toBe("passed");
   } finally {
     await cleanup(repoPath);
   }
@@ -203,17 +199,16 @@ test("write-review-result: needs_revision (architect-reviewer.md verdict) is acc
       "--summary",
       "service boundary unclear"
     ]);
-    assert.equal(status, 0, "needs_revision must be accepted, not refused");
+    expect(status, "needs_revision must be accepted, not refused").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /^decision: rejected$/m, "frontmatter must carry the canonical value");
+    expect(body, "frontmatter must carry the canonical value").toMatch(/^decision: rejected$/m);
 
     const state = await loadState(repoPath);
-    assert.equal(
+    expect(
       state.currentRun.gates.review.status,
-      "failed",
       "needs_revision must fail the review gate exactly like rejected"
-    );
+    ).toBe("failed");
   } finally {
     await cleanup(repoPath);
   }
@@ -233,8 +228,8 @@ test("write-review-result: unrecognized decision (not an alias) still exits 2",
       "--summary",
       "x"
     ]);
-    assert.equal(status, 2);
-    assert.match(stderr, /unknown decision/i);
+    expect(status).toBe(2);
+    expect(stderr).toMatch(/unknown decision/i);
   } finally {
     await cleanup(repoPath);
   }
@@ -258,22 +253,18 @@ test("write-validation-result: legacy 'passed_with_notes' normalizes to canonica
       "--summary",
       "all good"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(
-      body,
-      /^decision: pass$/m,
-      "frontmatter carries the canonical value, not the legacy alias"
+    expect(body, "frontmatter carries the canonical value, not the legacy alias").toMatch(
+      /^decision: pass$/m
     );
-    assert.match(
-      body,
-      /Decision: passed_with_notes/,
-      "body prose keeps the raw legacy value for back-compat"
+    expect(body, "body prose keeps the raw legacy value for back-compat").toMatch(
+      /Decision: passed_with_notes/
     );
 
     const state = await loadState(repoPath);
-    assert.equal(state.currentRun.gates.validation.status, "passed");
+    expect(state.currentRun.gates.validation.status).toBe("passed");
   } finally {
     await cleanup(repoPath);
   }
@@ -293,8 +284,8 @@ test("write-validation-result: skipped without --skip-reason is refused (exit 2)
       "--summary",
       "env unavailable"
     ]);
-    assert.equal(status, 2);
-    assert.match(stderr, /skip_reason/);
+    expect(status).toBe(2);
+    expect(stderr).toMatch(/skip_reason/);
   } finally {
     await cleanup(repoPath);
   }
@@ -314,15 +305,15 @@ test("write-validation-result: skipped with --skip-reason succeeds, sets validat
       "--skip-reason",
       "staging environment unavailable"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /^decision: skipped$/m);
-    assert.match(body, /^skip_reason: "staging environment unavailable"$/m);
+    expect(body).toMatch(/^decision: skipped$/m);
+    expect(body).toMatch(/^skip_reason: "staging environment unavailable"$/m);
 
     const state = await loadState(repoPath);
-    assert.equal(state.currentRun.gates.validation.status, "skipped");
-    assert.match(state.currentRun.gates.validation.note, /staging environment unavailable/);
+    expect(state.currentRun.gates.validation.status).toBe("skipped");
+    expect(state.currentRun.gates.validation.note).toMatch(/staging environment unavailable/);
   } finally {
     await cleanup(repoPath);
   }
@@ -340,8 +331,8 @@ test("write-validation-result: unrecognized decision exits 2", async () => {
       "--decision",
       "banana"
     ]);
-    assert.equal(status, 2);
-    assert.match(stderr, /unknown decision/i);
+    expect(status).toBe(2);
+    expect(stderr).toMatch(/unknown decision/i);
   } finally {
     await cleanup(repoPath);
   }
@@ -365,7 +356,7 @@ test("write-validation-result: fail decision captures a failure entry in learnin
       "--summary",
       "build broke on clean checkout"
     ]);
-    assert.equal(status, 0);
+    expect(status).toBe(0);
     const raw = await fs.readFile(
       path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl"),
       "utf8"
@@ -374,11 +365,11 @@ test("write-validation-result: fail decision captures a failure entry in learnin
       .split("\n")
       .filter((l) => l.trim().length > 0)
       .map((l) => JSON.parse(l));
-    assert.equal(lines.length, 1);
-    assert.equal(lines[0].kind, "failure");
-    assert.equal(lines[0].agent, "verifier");
-    assert.equal(lines[0].source, "validation_fail");
-    assert.match(lines[0].summary, /build broke on clean checkout/);
+    expect(lines.length).toBe(1);
+    expect(lines[0].kind).toBe("failure");
+    expect(lines[0].agent).toBe("verifier");
+    expect(lines[0].source).toBe("validation_fail");
+    expect(lines[0].summary).toMatch(/build broke on clean checkout/);
   } finally {
     await cleanup(repoPath);
   }
@@ -399,10 +390,10 @@ test("write-validation-result: pass decision does not write learnings.jsonl", as
       "--summary",
       "all good"
     ]);
-    assert.equal(status, 0);
-    await assert.rejects(
+    expect(status).toBe(0);
+    await expect(
       fs.readFile(path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl"), "utf8")
-    );
+    ).rejects.toThrow();
   } finally {
     await cleanup(repoPath);
   }
@@ -416,10 +407,9 @@ test("registerWorkflowArtifact: unrecognized review verdict throws instead of fa
   const repoPath = await makeTempDir("enum-verdicts-handler-review-");
   try {
     const artifact: ArtifactRef = { kind: "review-result", path: "fake-path.md", title: "t" };
-    await assert.rejects(
-      () => registerWorkflowArtifact(repoPath, artifact, { verdict: "lgtm", summary: "bad" }),
-      /unrecognized review verdict/
-    );
+    await expect(
+      registerWorkflowArtifact(repoPath, artifact, { verdict: "lgtm", summary: "bad" })
+    ).rejects.toThrow(/unrecognized review verdict/);
   } finally {
     await cleanup(repoPath);
   }
@@ -429,10 +419,9 @@ test("registerWorkflowArtifact: unrecognized validation verdict throws instead o
   const repoPath = await makeTempDir("enum-verdicts-handler-validation-");
   try {
     const artifact: ArtifactRef = { kind: "validation-result", path: "fake-path.md", title: "t" };
-    await assert.rejects(
-      () => registerWorkflowArtifact(repoPath, artifact, { verdict: "kinda", summary: "bad" }),
-      /unrecognized validation verdict/
-    );
+    await expect(
+      registerWorkflowArtifact(repoPath, artifact, { verdict: "kinda", summary: "bad" })
+    ).rejects.toThrow(/unrecognized validation verdict/);
   } finally {
     await cleanup(repoPath);
   }
@@ -447,7 +436,7 @@ test("registerWorkflowArtifact: absent verdict (legacy artifact / caller never s
     const run = await registerWorkflowArtifact(repoPath, artifact, {
       summary: "no decision given"
     });
-    assert.equal(run?.gates.review?.status, "passed");
+    expect(run?.gates.review?.status).toBe("passed");
   } finally {
     await cleanup(repoPath);
   }
@@ -477,11 +466,11 @@ test("ReviewArtifactSchema / ValidationArtifactSchema round-trip write-review-re
       "--slice",
       "SLICE-1"
     ]);
-    assert.equal(reviewResult.code, 0);
+    expect(reviewResult.code).toBe(0);
     const reviewPath = JSON.parse(reviewResult.output).path;
     const reviewBody = await fs.readFile(reviewPath, "utf8");
     const reviewFm = parseFrontmatterBlock(reviewBody);
-    assert.equal(ReviewArtifactSchema.safeParse(reviewFm).success, true);
+    expect(ReviewArtifactSchema.safeParse(reviewFm).success).toBe(true);
 
     const validationResult = await runCrew([
       "write-validation-result",
@@ -496,18 +485,18 @@ test("ReviewArtifactSchema / ValidationArtifactSchema round-trip write-review-re
       "--feature",
       "FEAT-999"
     ]);
-    assert.equal(validationResult.code, 0);
+    expect(validationResult.code).toBe(0);
     const validationPath = JSON.parse(validationResult.output).path;
     const validationBody = await fs.readFile(validationPath, "utf8");
     const validationFm = parseFrontmatterBlock(validationBody);
     // parseFrontmatterBlock doesn't JSON-unescape quoted values; skip_reason
     // is JSON.stringify'd in the artifact so it round-trips as a quoted,
     // still-non-empty string — sufficient for the schema's truthiness check.
-    assert.equal(ValidationArtifactSchema.safeParse(validationFm).success, true);
+    expect(ValidationArtifactSchema.safeParse(validationFm).success).toBe(true);
 
     // And the schema still catches the invalid case: skipped with no skip_reason.
     const invalid = ValidationArtifactSchema.safeParse({ decision: "skipped" });
-    assert.equal(invalid.success, false);
+    expect(invalid.success).toBe(false);
   } finally {
     await cleanup(repoPath);
   }
diff --git a/crew/tests/features-service.test.mts b/crew/tests/features-service.test.mts
index ba9f4ddf..0b14a6c7 100644
--- a/crew/tests/features-service.test.mts
+++ b/crew/tests/features-service.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -14,74 +13,74 @@ import { HOOK_FLAG_DEFAULTS } from "../scripts/lib/telemetry/feature-flag-lite.m
 
 test("isEnabled: no config → true", () => {
   const result = isEnabled("test-feature", null);
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: undefined config → true", () => {
   const result = isEnabled("test-feature", undefined);
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: empty object config → true", () => {
   const result = isEnabled("test-feature", {});
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: config without features key → true", () => {
   const result = isEnabled("test-feature", { other: "value" });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: config.features is not an object → true", () => {
   const result = isEnabled("test-feature", { features: "not-an-object" });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: missing feature entry → true", () => {
   const result = isEnabled("test-feature", { features: {} });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: feature entry is not an object → true", () => {
   const result = isEnabled("test-feature", {
     features: { "test-feature": "not-an-object" }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: enabled field is not a boolean (string) → true", () => {
   const result = isEnabled("test-feature", {
     features: { "test-feature": { enabled: "yes" } }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: enabled field is not a boolean (number) → true", () => {
   const result = isEnabled("test-feature", {
     features: { "test-feature": { enabled: 1 } }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: enabled field is not a boolean (null) → true", () => {
   const result = isEnabled("test-feature", {
     features: { "test-feature": { enabled: null } }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: enabled is explicitly true → true", () => {
   const result = isEnabled("test-feature", {
     features: { "test-feature": { enabled: true } }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: enabled is explicitly false → false", () => {
   const result = isEnabled("test-feature", {
     features: { "test-feature": { enabled: false } }
   });
-  assert.equal(result, false);
+  expect(result).toBe(false);
 });
 
 test("isEnabled: multiple features, one enabled false", () => {
@@ -92,10 +91,10 @@ test("isEnabled: multiple features, one enabled false", () => {
       "feature-c": { enabled: true }
     }
   };
-  assert.equal(isEnabled("feature-a", config), true);
-  assert.equal(isEnabled("feature-b", config), false);
-  assert.equal(isEnabled("feature-c", config), true);
-  assert.equal(isEnabled("feature-d", config), true);
+  expect(isEnabled("feature-a", config)).toBe(true);
+  expect(isEnabled("feature-b", config)).toBe(false);
+  expect(isEnabled("feature-c", config)).toBe(true);
+  expect(isEnabled("feature-d", config)).toBe(true);
 });
 
 test("isEnabled: emits stderr diagnostic line (enabled)", () => {
@@ -110,10 +109,10 @@ test("isEnabled: emits stderr diagnostic line (enabled)", () => {
 
   try {
     isEnabled("my-feature", { features: { "my-feature": { enabled: true } } });
-    assert.ok(
+    expect(
       lines.some((line) => line.includes("[features] my-feature: enabled")),
       "Expected stderr diagnostic for enabled feature"
-    );
+    ).toBeTruthy();
   } finally {
     process.stderr.write = originalWrite;
   }
@@ -131,10 +130,10 @@ test("isEnabled: emits stderr diagnostic line (disabled)", () => {
 
   try {
     isEnabled("my-feature", { features: { "my-feature": { enabled: false } } });
-    assert.ok(
+    expect(
       lines.some((line) => line.includes("[features] my-feature: disabled")),
       "Expected stderr diagnostic for disabled feature"
-    );
+    ).toBeTruthy();
   } finally {
     process.stderr.write = originalWrite;
   }
@@ -146,7 +145,7 @@ test("readCrewConfig: missing file → {}", async () => {
   const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "crew-config-"));
   try {
     const result = await readCrewConfig(tmpDir);
-    assert.deepEqual(result, {});
+    expect(result).toEqual({});
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
@@ -166,7 +165,7 @@ test("readCrewConfig: valid JSON file → parsed object", async () => {
 
   try {
     const result = await readCrewConfig(tmpDir);
-    assert.deepEqual(result, testConfig);
+    expect(result).toEqual(testConfig);
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
@@ -181,7 +180,7 @@ test("readCrewConfig: malformed JSON file → {}", async () => {
 
   try {
     const result = await readCrewConfig(tmpDir);
-    assert.deepEqual(result, {});
+    expect(result).toEqual({});
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
@@ -196,7 +195,7 @@ test("readCrewConfig: empty JSON object → parsed object", async () => {
 
   try {
     const result = await readCrewConfig(tmpDir);
-    assert.deepEqual(result, {});
+    expect(result).toEqual({});
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
@@ -218,7 +217,7 @@ test("readCrewConfig: complex nested config → preserves structure", async () =
 
   try {
     const result = await readCrewConfig(tmpDir);
-    assert.deepEqual(result, testConfig);
+    expect(result).toEqual(testConfig);
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
@@ -228,24 +227,24 @@ test("readCrewConfig: complex nested config → preserves structure", async () =
 
 test("isEnabled: unknown feature not in registry → defaults to true", () => {
   const result = isEnabled("test-feature", { features: {} });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: push-verify not in config → defaults to false (registry default)", () => {
   const result = isEnabled("push-verify", { features: {} });
-  assert.equal(result, false);
+  expect(result).toBe(false);
 });
 
 test("isEnabled: push-verify explicitly enabled in config → true", () => {
   const result = isEnabled("push-verify", {
     features: { "push-verify": { enabled: true } }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: push-verify no config at all → defaults to false (registry default)", () => {
   const result = isEnabled("push-verify", null);
-  assert.equal(result, false);
+  expect(result).toBe(false);
 });
 
 // ──────────────────────────────────────────────────────────────────────────
@@ -263,30 +262,30 @@ test("registry: P1.0 features are present with expected shape", () => {
 
   for (const [name, expectation] of Object.entries(expected)) {
     const meta = getFeatureMeta(name);
-    assert.ok(meta, `expected ${name} to be registered in FEATURES`);
-    assert.equal(meta!.default, expectation.default, `${name}.default`);
-    assert.equal(meta!.scope, expectation.scope, `${name}.scope`);
-    assert.equal(typeof meta!.version, "string", `${name}.version`);
-    assert.equal(typeof meta!.description, "string", `${name}.description`);
-    assert.equal(typeof meta!.since, "string", `${name}.since`);
+    expect(meta, `expected ${name} to be registered in FEATURES`).toBeTruthy();
+    expect(meta!.default, `${name}.default`).toBe(expectation.default);
+    expect(meta!.scope, `${name}.scope`).toBe(expectation.scope);
+    expect(typeof meta!.version, `${name}.version`).toBe("string");
+    expect(typeof meta!.description, `${name}.description`).toBe("string");
+    expect(typeof meta!.since, `${name}.since`).toBe("string");
   }
 
   // Also present in the raw FEATURES record (not just via getFeatureMeta).
   for (const name of Object.keys(expected)) {
-    assert.ok(name in FEATURES, `expected ${name} key in FEATURES record`);
+    expect(name in FEATURES, `expected ${name} key in FEATURES record`).toBeTruthy();
   }
 });
 
 test("isEnabled: git-gate-block defaults to false (warn) with no config", () => {
-  assert.equal(isEnabled("git-gate-block", null), false);
-  assert.equal(isEnabled("git-gate-block", { features: {} }), false);
+  expect(isEnabled("git-gate-block", null)).toBe(false);
+  expect(isEnabled("git-gate-block", { features: {} })).toBe(false);
 });
 
 test("isEnabled: git-gate-block explicitly enabled in config → true", () => {
   const result = isEnabled("git-gate-block", {
     features: { "git-gate-block": { enabled: true } }
   });
-  assert.equal(result, true);
+  expect(result).toBe(true);
 });
 
 test("isEnabled: otel-telemetry / bash-gate-telemetry / task-update-burst-warn / event-emit default to true with no config", () => {
@@ -296,8 +295,8 @@ test("isEnabled: otel-telemetry / bash-gate-telemetry / task-update-burst-warn /
     "task-update-burst-warn",
     "event-emit"
   ]) {
-    assert.equal(isEnabled(name, null), true, `${name} should default true`);
-    assert.equal(isEnabled(name, { features: {} }), true, `${name} should default true`);
+    expect(isEnabled(name, null), `${name} should default true`).toBe(true);
+    expect(isEnabled(name, { features: {} }), `${name} should default true`).toBe(true);
   }
 });
 
@@ -309,7 +308,7 @@ test("isEnabled: otel-telemetry / bash-gate-telemetry / task-update-burst-warn /
     "event-emit"
   ]) {
     const config = { features: { [name]: { enabled: false } } };
-    assert.equal(isEnabled(name, config), false, `${name} should flip to false when disabled`);
+    expect(isEnabled(name, config), `${name} should flip to false when disabled`).toBe(false);
   }
 });
 
@@ -328,35 +327,37 @@ test("isEnabled: otel-telemetry / bash-gate-telemetry / task-update-burst-warn /
 
 test("registry: model-routing is present, default true, scope crew", () => {
   const meta = getFeatureMeta("model-routing");
-  assert.ok(meta, "expected model-routing to be registered in FEATURES");
-  assert.equal(meta!.default, true);
-  assert.equal(meta!.scope, "crew");
-  assert.equal(typeof meta!.version, "string");
-  assert.equal(typeof meta!.description, "string");
-  assert.equal(typeof meta!.since, "string");
-  assert.ok("model-routing" in FEATURES);
+  expect(meta, "expected model-routing to be registered in FEATURES").toBeTruthy();
+  expect(meta!.default).toBe(true);
+  expect(meta!.scope).toBe("crew");
+  expect(typeof meta!.version).toBe("string");
+  expect(typeof meta!.description).toBe("string");
+  expect(typeof meta!.since).toBe("string");
+  expect("model-routing" in FEATURES).toBeTruthy();
 });
 
 test("isEnabled: model-routing defaults to true with no config", () => {
-  assert.equal(isEnabled("model-routing", null), true);
-  assert.equal(isEnabled("model-routing", { features: {} }), true);
+  expect(isEnabled("model-routing", null)).toBe(true);
+  expect(isEnabled("model-routing", { features: {} })).toBe(true);
 });
 
 test("isEnabled: model-routing flips off via crew.json override", () => {
   const result = isEnabled("model-routing", {
     features: { "model-routing": { enabled: false } }
   });
-  assert.equal(result, false);
+  expect(result).toBe(false);
 });
 
 test("feature-flag-lite: HOOK_FLAG_DEFAULTS matches the registry default for every flag it duplicates", () => {
   for (const [name, liteDefault] of Object.entries(HOOK_FLAG_DEFAULTS)) {
     const registryMeta = getFeatureMeta(name);
-    assert.ok(registryMeta, `${name} in HOOK_FLAG_DEFAULTS must also be registered in FEATURES`);
-    assert.equal(
+    expect(
+      registryMeta,
+      `${name} in HOOK_FLAG_DEFAULTS must also be registered in FEATURES`
+    ).toBeTruthy();
+    expect(
       liteDefault,
-      registryMeta!.default,
       `feature-flag-lite default for ${name} (${liteDefault}) must match registry default (${registryMeta!.default})`
-    );
+    ).toBe(registryMeta!.default);
   }
 });
diff --git a/crew/tests/fleet.test.mts b/crew/tests/fleet.test.mts
index 82055d13..c949ee10 100644
--- a/crew/tests/fleet.test.mts
+++ b/crew/tests/fleet.test.mts
@@ -1,8 +1,7 @@
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
 
 import { collectFleetWorktrees, renderFleet, buildFleetReport } from "../scripts/lib/fleet.mjs";
 
@@ -59,7 +58,7 @@ test("collectFleetWorktrees finds sibling repos", async () => {
 
   const items = await collectFleetWorktrees(repoA, { includeSelf: true });
   const names = items.map((i) => i.repoName).sort();
-  assert.deepEqual(names, ["repo-a", "repo-b"]);
+  expect(names).toEqual(["repo-a", "repo-b"]);
 });
 
 test("collectFleetWorktrees excludes self when --no-self", async () => {
@@ -72,9 +71,9 @@ test("collectFleetWorktrees excludes self when --no-self", async () => {
   await writeSliceProgress(repoB, PROGRESS_IN_FLIGHT);
 
   const items = await collectFleetWorktrees(repoA, { includeSelf: false });
-  assert.equal(items.length, 1);
-  assert.equal(items[0]!.repoName, "repo-b");
-  assert.equal(items[0]!.isSelf, false);
+  expect(items.length).toBe(1);
+  expect(items[0]!.repoName).toBe("repo-b");
+  expect(items[0]!.isSelf).toBe(false);
 });
 
 test("collectFleetWorktrees parses IN_PROGRESS slice", async () => {
@@ -84,12 +83,12 @@ test("collectFleetWorktrees parses IN_PROGRESS slice", async () => {
   await writeSliceProgress(repoA, PROGRESS_IN_FLIGHT);
 
   const items = await collectFleetWorktrees(repoA, { includeSelf: true });
-  assert.equal(items.length, 1);
+  expect(items.length).toBe(1);
   const item = items[0]!;
-  assert.equal(item.inProgressSlice, "SLICE-02");
-  assert.equal(item.inProgressTitle, "Second");
-  assert.equal(item.completedCount, 1);
-  assert.equal(item.totalCount, 3);
+  expect(item.inProgressSlice).toBe("SLICE-02");
+  expect(item.inProgressTitle).toBe("Second");
+  expect(item.completedCount).toBe(1);
+  expect(item.totalCount).toBe(3);
 });
 
 test("collectFleetWorktrees marks self correctly", async () => {
@@ -103,10 +102,10 @@ test("collectFleetWorktrees marks self correctly", async () => {
 
   const items = await collectFleetWorktrees(repoA, { includeSelf: true });
   const self = items.find((i) => i.isSelf);
-  assert.ok(self, "one item should be marked isSelf");
-  assert.equal(self.repoName, "repo-a");
+  expect(self, "one item should be marked isSelf").toBeTruthy();
+  expect(self!.repoName).toBe("repo-a");
   const sibling = items.find((i) => !i.isSelf);
-  assert.equal(sibling!.repoName, "repo-b");
+  expect(sibling!.repoName).toBe("repo-b");
 });
 
 test("renderFleet produces markdown table with correct columns", async () => {
@@ -131,19 +130,19 @@ test("renderFleet produces markdown table with correct columns", async () => {
     }
   ];
   const md = renderFleet(items);
-  assert.match(md, /# Fleet/);
-  assert.match(md, /\| Repo \|/);
-  assert.match(md, /repo-a.*this/);
-  assert.match(md, /SLICE-02/);
-  assert.match(md, /1\/3/);
-  assert.match(md, /repo-b/);
-  assert.match(md, /idle/);
-  assert.match(md, /3\/3/);
+  expect(md).toMatch(/# Fleet/);
+  expect(md).toMatch(/\| Repo \|/);
+  expect(md).toMatch(/repo-a.*this/);
+  expect(md).toMatch(/SLICE-02/);
+  expect(md).toMatch(/1\/3/);
+  expect(md).toMatch(/repo-b/);
+  expect(md).toMatch(/idle/);
+  expect(md).toMatch(/3\/3/);
 });
 
 test("renderFleet returns empty-fleet message when no items", () => {
   const md = renderFleet([]);
-  assert.match(md, /no active loops found/);
+  expect(md).toMatch(/no active loops found/);
 });
 
 test("buildFleetReport returns items + markdown", async () => {
@@ -153,9 +152,9 @@ test("buildFleetReport returns items + markdown", async () => {
   await writeSliceProgress(repoA, PROGRESS_IN_FLIGHT);
 
   const { items, markdown } = await buildFleetReport(repoA, { includeSelf: true });
-  assert.ok(Array.isArray(items));
-  assert.ok(typeof markdown === "string");
-  assert.match(markdown, /SLICE-02/);
+  expect(Array.isArray(items)).toBeTruthy();
+  expect(typeof markdown === "string").toBeTruthy();
+  expect(markdown).toMatch(/SLICE-02/);
 });
 
 test("collectFleetWorktrees supports extraRoots", async () => {
@@ -173,5 +172,5 @@ test("collectFleetWorktrees supports extraRoots", async () => {
     includeSelf: true
   });
   const names = items.map((i) => i.repoName).sort();
-  assert.ok(names.includes("repo-b"), "should find repo-b via extraRoots");
+  expect(names.includes("repo-b"), "should find repo-b via extraRoots").toBeTruthy();
 });
diff --git a/crew/tests/frontend-dev-prompt.test.mts b/crew/tests/frontend-dev-prompt.test.mts
index 13abf295..39c53133 100644
--- a/crew/tests/frontend-dev-prompt.test.mts
+++ b/crew/tests/frontend-dev-prompt.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -9,34 +8,34 @@ const AGENT_PATH = path.join(REPO_ROOT, "agents", "frontend-dev.md");
 
 test("frontend-dev.md exists and has frontmatter name=frontend-dev", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /^---/);
-  assert.match(md, /name:\s*frontend-dev/);
+  expect(md).toMatch(/^---/);
+  expect(md).toMatch(/name:\s*frontend-dev/);
 });
 
 test("frontend-dev.md declares React + TS scope and forbids server code", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /Owned scope/);
-  assert.match(md, /\*\.tsx/);
-  assert.match(md, /Forbidden/);
-  assert.match(md, /\*\.cs/);
-  assert.match(md, /server code/i);
+  expect(md).toMatch(/Owned scope/);
+  expect(md).toMatch(/\*\.tsx/);
+  expect(md).toMatch(/Forbidden/);
+  expect(md).toMatch(/\*\.cs/);
+  expect(md).toMatch(/server code/i);
 });
 
 test("frontend-dev.md routes contract-codegen skill for orval + openapi-msw", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /skills\/domain\/contract-codegen/);
-  assert.match(md, /orval/);
-  assert.match(md, /openapi-msw/);
+  expect(md).toMatch(/skills\/domain\/contract-codegen/);
+  expect(md).toMatch(/orval/);
+  expect(md).toMatch(/openapi-msw/);
 });
 
 test("frontend-dev.md mandates OpenAPI YAML + UX spec consumption", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /OpenAPI YAML/);
-  assert.match(md, /UX spec/);
+  expect(md).toMatch(/OpenAPI YAML/);
+  expect(md).toMatch(/UX spec/);
 });
 
 test("frontend-dev.md mandates drift handling via help_request", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /help_request/);
-  assert.match(md, /do not invent/i);
+  expect(md).toMatch(/help_request/);
+  expect(md).toMatch(/do not invent/i);
 });
diff --git a/crew/tests/fs-utils.test.mts b/crew/tests/fs-utils.test.mts
index 6f7b9d1d..b47b397d 100644
--- a/crew/tests/fs-utils.test.mts
+++ b/crew/tests/fs-utils.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -13,7 +12,7 @@ test("readFileIfExists: returns content when file exists", async () => {
   await fs.writeFile(filePath, "hello world", "utf8");
   try {
     const result = await readFileIfExists(filePath);
-    assert.equal(result, "hello world");
+    expect(result).toBe("hello world");
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -24,7 +23,7 @@ test("readFileIfExists: returns null when file does not exist", async () => {
   const filePath = path.join(dir, "nonexistent.txt");
   try {
     const result = await readFileIfExists(filePath);
-    assert.equal(result, null);
+    expect(result).toBe(null);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -34,14 +33,14 @@ test("readFileIfExists: re-throws non-ENOENT errors", async () => {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fs-utils-"));
   // Reading a directory as a file produces EISDIR, not ENOENT
   try {
-    await assert.rejects(
-      () => readFileIfExists(dir),
-      (err) => {
-        assert.ok(err instanceof Error);
-        assert.notEqual((err as NodeJS.ErrnoException).code, "ENOENT");
-        return true;
-      }
-    );
+    let caught: unknown;
+    try {
+      await readFileIfExists(dir);
+    } catch (err) {
+      caught = err;
+    }
+    expect(caught instanceof Error).toBeTruthy();
+    expect((caught as NodeJS.ErrnoException).code).not.toBe("ENOENT");
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -56,14 +55,14 @@ test("pathExists: returns true for existing file", async () => {
   const f = path.join(dir, "file.txt");
   await fs.writeFile(f, "hello");
   try {
-    assert.equal(await pathExists(f), true);
+    expect(await pathExists(f)).toBe(true);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
 });
 
 test("pathExists: returns false for missing file", async () => {
-  assert.equal(await pathExists("/nonexistent/path/that/cannot/exist-xyz123"), false);
+  expect(await pathExists("/nonexistent/path/that/cannot/exist-xyz123")).toBe(false);
 });
 
 // ---------------------------------------------------------------------------
@@ -76,14 +75,14 @@ test("readJson: parses valid JSON", async () => {
   await fs.writeFile(f, JSON.stringify({ foo: 42 }));
   try {
     const result = await readJson<{ foo: number }>(f);
-    assert.equal(result.foo, 42);
+    expect(result.foo).toBe(42);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
 });
 
 test("readJson: throws for missing file", async () => {
-  await assert.rejects(() => readJson("/nonexistent/data.json"));
+  await expect(readJson("/nonexistent/data.json")).rejects.toThrow();
 });
 
 test("readJson: throws for malformed JSON", async () => {
@@ -91,7 +90,7 @@ test("readJson: throws for malformed JSON", async () => {
   const f = path.join(dir, "bad.json");
   await fs.writeFile(f, "not valid json{{{");
   try {
-    await assert.rejects(() => readJson(f));
+    await expect(readJson(f)).rejects.toThrow();
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
diff --git a/crew/tests/gepa-corpus-optimize.test.mts b/crew/tests/gepa-corpus-optimize.test.mts
index 87d0a61e..a66a91fe 100644
--- a/crew/tests/gepa-corpus-optimize.test.mts
+++ b/crew/tests/gepa-corpus-optimize.test.mts
@@ -1,6 +1,5 @@
 // FEAT-193 S3 — gepa-corpus-optimize feed-to-optimize bridge (AC-9 human gate).
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import os from "node:os";
 import path from "node:path";
 import { spawnSync } from "node:child_process";
@@ -40,19 +39,19 @@ function spyDeps(): {
 test("missing agent → exit 2, never touches delegates", async () => {
   const { deps, reportCalls, optimizeCalls } = spyDeps();
   const res = await runCorpusOptimizeCmd("/tmp", ["--budget", "5"], deps);
-  assert.equal(res.exitCode, 2);
-  assert.match(res.stderr, /usage: gepa-corpus-optimize/);
-  assert.equal(reportCalls.length, 0);
-  assert.equal(optimizeCalls.length, 0);
+  expect(res.exitCode).toBe(2);
+  expect(res.stderr).toMatch(/usage: gepa-corpus-optimize/);
+  expect(reportCalls.length).toBe(0);
+  expect(optimizeCalls.length).toBe(0);
 });
 
 test("missing --budget → exit 2 (spends real judge tokens); neither delegate runs", async () => {
   const { deps, reportCalls, optimizeCalls } = spyDeps();
   const res = await runCorpusOptimizeCmd("/tmp", ["fullstack-dev"], deps);
-  assert.equal(res.exitCode, 2);
-  assert.match(res.stderr, /--budget is required/);
-  assert.equal(reportCalls.length, 0, "no analyze/digest before the budget guard");
-  assert.equal(optimizeCalls.length, 0);
+  expect(res.exitCode).toBe(2);
+  expect(res.stderr).toMatch(/--budget is required/);
+  expect(reportCalls.length, "no analyze/digest before the budget guard").toBe(0);
+  expect(optimizeCalls.length).toBe(0);
 });
 
 test("happy path: renders digest THEN optimizes the aggregated corpus", async () => {
@@ -62,26 +61,26 @@ test("happy path: renders digest THEN optimizes the aggregated corpus", async ()
     ["backend-dev", "--budget", "5", "--k", "3"],
     deps
   );
-  assert.equal(res.exitCode, 0);
+  expect(res.exitCode).toBe(0);
   // Digest rendered first, optimize body after — analyze-before-adjust order.
   const digestIdx = res.stdout.indexOf("DIGEST-BODY");
   const optIdx = res.stdout.indexOf("OPTIMIZE-BODY");
-  assert.ok(digestIdx >= 0 && optIdx >= 0, "both sections present");
-  assert.ok(digestIdx < optIdx, "digest must render before the optimize cycle");
+  expect(digestIdx >= 0 && optIdx >= 0, "both sections present").toBeTruthy();
+  expect(digestIdx < optIdx, "digest must render before the optimize cycle").toBeTruthy();
   // Report scoped to the one agent; optimize got agent + budget + k.
-  assert.deepEqual(reportCalls[0], ["backend-dev"]);
-  assert.deepEqual(optimizeCalls[0]?.slice(0, 4), ["backend-dev", "--budget", "5", "--k"]);
+  expect(reportCalls[0]).toEqual(["backend-dev"]);
+  expect(optimizeCalls[0]?.slice(0, 4)).toEqual(["backend-dev", "--budget", "5", "--k"]);
 });
 
 test("AC-9 gate: bridge ALWAYS forces --artifact-only, never a promote flag", async () => {
   const { deps, optimizeCalls } = spyDeps();
   await runCorpusOptimizeCmd("/tmp", ["frontend-dev", "--budget", "2"], deps);
   const args = optimizeCalls[0] ?? [];
-  assert.ok(args.includes("--artifact-only"), "artifact-only must be forced");
-  assert.ok(
+  expect(args.includes("--artifact-only"), "artifact-only must be forced").toBeTruthy();
+  expect(
     !args.some((a) => /promote|no-artifact-only/.test(a)),
     "no promote / no-artifact-only flag may ever be threaded"
-  );
+  ).toBeTruthy();
 });
 
 test("optimize exit code propagates; digest is advisory", async () => {
@@ -90,8 +89,8 @@ test("optimize exit code propagates; digest is advisory", async () => {
     optimize: async () => ({ stdout: "", stderr: "boom\n", exitCode: 3 })
   };
   const res = await runCorpusOptimizeCmd("/tmp", ["a", "--budget", "5"], deps);
-  assert.equal(res.exitCode, 3, "bridge exit == optimize exit");
-  assert.match(res.stderr, /boom/);
+  expect(res.exitCode, "bridge exit == optimize exit").toBe(3);
+  expect(res.stderr).toMatch(/boom/);
 });
 
 test("never throws: a delegate that rejects surfaces as exit 1 + stderr", async () => {
@@ -102,17 +101,16 @@ test("never throws: a delegate that rejects surfaces as exit 1 + stderr", async
     optimize: async () => ({ stdout: "", stderr: "", exitCode: 0 })
   };
   const res = await runCorpusOptimizeCmd("/tmp", ["a", "--budget", "5"], deps);
-  assert.equal(res.exitCode, 1, "rejection must not propagate as an unhandled error");
-  assert.match(res.stderr, /gepa-corpus-optimize failed: trial store unreadable/);
+  expect(res.exitCode, "rejection must not propagate as an unhandled error").toBe(1);
+  expect(res.stderr).toMatch(/gepa-corpus-optimize failed: trial store unreadable/);
 });
 
 test("CLI: gepa-corpus-optimize is wired (no 'Unknown argument'); guards budget", async () => {
   // No --budget → the bridge's arg guard fires (exit 2) BEFORE any judge call,
-  // so this stays hermetic. CLI runs on Node per ADR-002.
+  // so this stays hermetic. CLI runs on bun per the unification plan.
   const res = spawnSync(
-    "node",
+    "bun",
     [
-      "--experimental-strip-types",
       cliPath,
       "gepa-corpus-optimize",
       "somebody",
@@ -121,7 +119,7 @@ test("CLI: gepa-corpus-optimize is wired (no 'Unknown argument'); guards budget"
     ],
     { encoding: "utf8", timeout: 60_000 }
   );
-  assert.doesNotMatch(res.stderr ?? "", /Unknown argument/, "flags must be registered");
-  assert.match(res.stderr ?? "", /--budget is required/, "budget guard reached via CLI");
-  assert.equal(res.status, 2);
+  expect(res.stderr ?? "", "flags must be registered").not.toMatch(/Unknown argument/);
+  expect(res.stderr ?? "", "budget guard reached via CLI").toMatch(/--budget is required/);
+  expect(res.status).toBe(2);
 });
diff --git a/crew/tests/gepa-corpus-report.test.mts b/crew/tests/gepa-corpus-report.test.mts
index 9d0f5370..f59e9373 100644
--- a/crew/tests/gepa-corpus-report.test.mts
+++ b/crew/tests/gepa-corpus-report.test.mts
@@ -1,6 +1,5 @@
 // FEAT-193 S3 (report half) — gepa-corpus-report AC coverage (AC-6/7/8).
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -59,10 +58,10 @@ test("AC-6: clusters failure modes and ranks by frequency", async () => {
     });
 
     const ar = report.agents[0]!;
-    assert.equal(ar.totalFailures, 3);
-    assert.equal(ar.clusters.length, 2, "casing/whitespace variants collapse to one mode");
-    assert.equal(ar.clusters[0]!.count, 2, "most frequent mode ranked first");
-    assert.equal(ar.clusters[1]!.count, 1);
+    expect(ar.totalFailures).toBe(3);
+    expect(ar.clusters.length).toBe(2);
+    expect(ar.clusters[0]!.count).toBe(2);
+    expect(ar.clusters[1]!.count).toBe(1);
   } finally {
     await cleanup(repo);
   }
@@ -76,13 +75,9 @@ test("AC-7: with no agent arg, enumerates EVERY agent with >=1 failure (and only
     await writeTrials(repo, "frontend-dev", [trial("canary", false)]); // no failures → excluded
     const report = await reportCorpus({ hubRepo: repo, recallLessons: noLessons });
 
-    assert.deepEqual(
-      report.agents.map((a) => a.agent).sort(),
-      ["backend-dev", "fullstack-dev"],
-      "only agents with production-failures, all of them"
-    );
+    expect(report.agents.map((a) => a.agent).sort()).toEqual(["backend-dev", "fullstack-dev"]);
     // Ranked by failure count desc.
-    assert.equal(report.agents[0]!.agent, "backend-dev");
+    expect(report.agents[0]!.agent).toBe("backend-dev");
   } finally {
     await cleanup(repo);
   }
@@ -100,10 +95,7 @@ test("AC-8: cites the agent's FEAT-188 astramem lessons by id", async () => {
       recallLessons: fakeRecall
     });
 
-    assert.deepEqual(
-      report.agents[0]!.lessons.map((l) => l.id),
-      ["lesson-42"]
-    );
+    expect(report.agents[0]!.lessons.map((l) => l.id)).toEqual(["lesson-42"]);
   } finally {
     await cleanup(repo);
   }
@@ -113,7 +105,7 @@ test("empty hub → no agents, no throw", async () => {
   const repo = await makeRepo();
   try {
     const report = await reportCorpus({ hubRepo: repo, recallLessons: noLessons });
-    assert.deepEqual(report.agents, []);
+    expect(report.agents).toEqual([]);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/gepa-corpus-sync.test.mts b/crew/tests/gepa-corpus-sync.test.mts
index 8db70422..325c89c6 100644
--- a/crew/tests/gepa-corpus-sync.test.mts
+++ b/crew/tests/gepa-corpus-sync.test.mts
@@ -1,6 +1,5 @@
 // FEAT-193 S2 — gepa-corpus-sync AC coverage (AC-1..5).
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -67,10 +66,10 @@ test("AC-1: production-failure trials from a sibling are merged into the hub per
     ]);
     const report = await syncCorpus({ hubRepo: hub, siblingRepos: [sib] });
 
-    assert.equal(report.totalEligible, 2);
-    assert.equal(report.totalAdded, 2);
-    assert.equal(report.perAgent["fullstack-dev"]?.added, 2);
-    assert.equal((await readHubTrials(hub, "fullstack-dev")).length, 2);
+    expect(report.totalEligible).toBe(2);
+    expect(report.totalAdded).toBe(2);
+    expect(report.perAgent["fullstack-dev"]?.added).toBe(2);
+    expect((await readHubTrials(hub, "fullstack-dev")).length).toBe(2);
   } finally {
     await cleanup(hub, sib);
   }
@@ -86,16 +85,16 @@ test("AC-2: dedup by (agent, rationale-hash) across siblings + idempotent re-run
     await writeTrials(sibB, "backend-dev", [makeTrial("backend-dev", "null deref in mapper")]);
 
     const first = await syncCorpus({ hubRepo: hub, siblingRepos: [sibA, sibB] });
-    assert.equal(first.totalEligible, 2);
-    assert.equal(first.totalAdded, 1, "cross-sibling duplicate must add once");
-    assert.equal(first.totalSkipped, 1);
-    assert.equal((await readHubTrials(hub, "backend-dev")).length, 1);
+    expect(first.totalEligible).toBe(2);
+    expect(first.totalAdded).toBe(1);
+    expect(first.totalSkipped).toBe(1);
+    expect((await readHubTrials(hub, "backend-dev")).length).toBe(1);
 
     // Idempotent: re-run adds nothing.
     const second = await syncCorpus({ hubRepo: hub, siblingRepos: [sibA, sibB] });
-    assert.equal(second.totalAdded, 0, "re-run must add zero rows");
-    assert.equal(second.totalSkipped, 2);
-    assert.equal((await readHubTrials(hub, "backend-dev")).length, 1);
+    expect(second.totalAdded).toBe(0);
+    expect(second.totalSkipped).toBe(2);
+    expect((await readHubTrials(hub, "backend-dev")).length).toBe(1);
   } finally {
     await cleanup(hub, sibA, sibB);
   }
@@ -112,17 +111,9 @@ test("AC-3: completeness — added+skipped===eligible AND every contributing age
     await writeTrials(sib, "frontend-dev", [makeTrial("frontend-dev", "b")]);
     const report = await syncCorpus({ hubRepo: hub, siblingRepos: [sib] });
 
-    assert.equal(
-      report.totalAdded + report.totalSkipped,
-      report.totalEligible,
-      "no eligible trial silently dropped"
-    );
-    assert.deepEqual(
-      Object.keys(report.perAgent).sort(),
-      ["frontend-dev", "fullstack-dev"],
-      "every agent with >=1 contributed trial must be enumerated"
-    );
-    assert.equal(report.perAgent["fullstack-dev"]?.contributed, 2);
+    expect(report.totalAdded + report.totalSkipped).toBe(report.totalEligible);
+    expect(Object.keys(report.perAgent).sort()).toEqual(["frontend-dev", "fullstack-dev"]);
+    expect(report.perAgent["fullstack-dev"]?.contributed).toBe(2);
   } finally {
     await cleanup(hub, sib);
   }
@@ -137,9 +128,9 @@ test("AC-4: non-production-failure trials are NOT aggregated", async () => {
     ]);
     const report = await syncCorpus({ hubRepo: hub, siblingRepos: [sib] });
 
-    assert.equal(report.totalEligible, 0, "eval/canary trials must not be eligible");
-    assert.equal(report.totalAdded, 0);
-    assert.equal((await readHubTrials(hub, "fullstack-dev")).length, 0);
+    expect(report.totalEligible).toBe(0);
+    expect(report.totalAdded).toBe(0);
+    expect((await readHubTrials(hub, "fullstack-dev")).length).toBe(0);
   } finally {
     await cleanup(hub, sib);
   }
@@ -155,11 +146,11 @@ test("AC-5: read-only on siblings; missing trials dir skipped without error", as
 
     const report = await syncCorpus({ hubRepo: hub, siblingRepos: [sibWith, sibBare] });
 
-    assert.equal(report.siblingsScanned, 1);
-    assert.deepEqual(report.siblingsSkipped, [sibBare], "bare sibling skipped without error");
+    expect(report.siblingsScanned).toBe(1);
+    expect(report.siblingsSkipped).toEqual([sibBare]);
     // Sibling file untouched.
     const after = await fs.readFile(path.join(sibWith, ...TRIALS, "fullstack-dev.jsonl"), "utf8");
-    assert.equal(after, before, "sync must never mutate a sibling");
+    expect(after).toBe(before);
   } finally {
     await cleanup(hub, sibWith, sibBare);
   }
@@ -179,9 +170,9 @@ test("corrupt + schema-drifted rows are skipped, valid ones still aggregate (no
     await fs.writeFile(path.join(dir, "backend-dev.jsonl"), lines.join("\n") + "\n", "utf8");
 
     const report = await syncCorpus({ hubRepo: hub, siblingRepos: [sib] });
-    assert.equal(report.totalEligible, 1, "only the schema-valid production-failure counts");
-    assert.equal(report.totalAdded, 1);
-    assert.equal((await readHubTrials(hub, "backend-dev")).length, 1);
+    expect(report.totalEligible).toBe(1);
+    expect(report.totalAdded).toBe(1);
+    expect((await readHubTrials(hub, "backend-dev")).length).toBe(1);
   } finally {
     await cleanup(hub, sib);
   }
@@ -192,12 +183,10 @@ test("CLI: --sibling + --json flags are wired (no 'Unknown argument')", async ()
   const sib = await makeRepo("corpus-sib-");
   try {
     await writeTrials(sib, "fullstack-dev", [makeTrial("fullstack-dev", "cli path")]);
-    // CLI scripts run on Node per ADR-002 (not bun, which `bun test` would
-    // otherwise use via process.execPath).
+    // CLI scripts run on bun per the unification plan.
     const res = spawnSync(
-      "node",
+      "bun",
       [
-        "--experimental-strip-types",
         cliPath,
         "gepa-corpus-sync",
         "--sibling",
@@ -208,10 +197,10 @@ test("CLI: --sibling + --json flags are wired (no 'Unknown argument')", async ()
       ],
       { encoding: "utf8", timeout: 60_000 }
     );
-    assert.equal(res.status, 0, `CLI failed: ${res.stderr}`);
-    assert.doesNotMatch(res.stderr ?? "", /Unknown argument/, "flags must be registered");
+    expect(res.status).toBe(0);
+    expect(res.stderr ?? "").not.toMatch(/Unknown argument/);
     const report = JSON.parse(res.stdout);
-    assert.equal(report.totalAdded, 1, "CLI --sibling path must aggregate");
+    expect(report.totalAdded).toBe(1);
   } finally {
     await cleanup(hub, sib);
   }
diff --git a/crew/tests/gepa-provenance-validate.test.mts b/crew/tests/gepa-provenance-validate.test.mts
index c5384b8f..53513985 100644
--- a/crew/tests/gepa-provenance-validate.test.mts
+++ b/crew/tests/gepa-provenance-validate.test.mts
@@ -1,7 +1,6 @@
 // FEAT-193 AC-10 — a champion-provenance-written agent must still pass
 // validate-agents (the leading `gepa:` block must not hide name/description).
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -35,20 +34,16 @@ test("AC-10: validate-agents passes on a champion-provenance-written agent", asy
 
     // Baseline: clean file validates.
     const before = await validateAgents(root);
-    assert.equal(before.ok, true, `baseline errors: ${before.errors.join("; ")}`);
+    expect(before.ok).toBe(true);
 
     // Promote: prepends a leading `gepa:` frontmatter block.
     writeChampionProvenance({ agentPath, trialUuid: randomUUID() });
     const promoted = await fs.readFile(agentPath, "utf8");
-    assert.ok(promoted.startsWith("---\ngepa:\n"), "provenance block must be prepended");
+    expect(promoted.startsWith("---\ngepa:\n")).toBeTruthy();
 
     // The provenance-written agent must STILL validate — no missing name/description.
     const after = await validateAgents(root);
-    assert.equal(
-      after.ok,
-      true,
-      `provenance-written agent must validate; errors: ${after.errors.join("; ")}`
-    );
+    expect(after.ok).toBe(true);
   } finally {
     await fs.rm(root, { recursive: true, force: true });
   }
@@ -64,9 +59,9 @@ test("AC-10: idempotent — re-promoting replaces the block, still validates", a
 
     const twice = await fs.readFile(agentPath, "utf8");
     // Exactly one gepa block: stripping it once yields a body with no `gepa:` left.
-    assert.ok(!stripGepafrontmatter(twice).includes("gepa:"), "must not stack gepa blocks");
+    expect(stripGepafrontmatter(twice).includes("gepa:")).toBeFalsy();
     const after = await validateAgents(root);
-    assert.equal(after.ok, true, `errors: ${after.errors.join("; ")}`);
+    expect(after.ok).toBe(true);
   } finally {
     await fs.rm(root, { recursive: true, force: true });
   }
diff --git a/crew/tests/heavy-path-review-refinements.test.mts b/crew/tests/heavy-path-review-refinements.test.mts
index ef65753f..6feed2b1 100644
--- a/crew/tests/heavy-path-review-refinements.test.mts
+++ b/crew/tests/heavy-path-review-refinements.test.mts
@@ -1,9 +1,9 @@
-// tests/heavy-path-review-refinements.test.ts
+// tests/heavy-path-review-refinements.test.mts
 // FEAT-203 / SLICE-113 — heavy-path review refinements (stack-lens 2nd
 // reviewer + parallel-dispatch telemetry).
 //
 // FEAT-202 / SLICE-112 already made the LOW/MEDIUM default a single
-// reviewer (see tests/validation-gate-delegation.test.ts). This slice only
+// reviewer (see tests/validation-gate-delegation.test.mts). This slice only
 // refines the risk-gated HEAVY path (`RISK_GATE = true`):
 //
 //   AC-1: the 2nd reviewer is picked by diff-extension dominance
@@ -37,11 +37,10 @@
 // for `computeReviewerSpan` / `recordSerialReviewerWarning` inside dev-team
 // (they live in runner-plugin, consumed indirectly via the loop plugin's
 // `/runner:close`), so this suite does not fabricate a cross-plugin import —
-// same boundary discipline as tests/validation-gate-delegation.test.ts.
+// same boundary discipline as tests/validation-gate-delegation.test.mts.
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { fileURLToPath } from "node:url";
 
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
@@ -61,67 +60,67 @@ test("loop.json: reviewers.strictParallel is true", async () => {
   const config = (await readJson(".claude/loop.json")) as {
     reviewers?: { strictParallel?: unknown };
   };
-  assert.equal(config.reviewers?.strictParallel, true);
+  expect(config.reviewers?.strictParallel).toBe(true);
 });
 
 test("loop.json: reviewers.serialTimingThresholdMs is 90000 (matches runner-plugin default)", async () => {
   const config = (await readJson(".claude/loop.json")) as {
     reviewers?: { serialTimingThresholdMs?: unknown };
   };
-  assert.equal(config.reviewers?.serialTimingThresholdMs, 90000);
+  expect(config.reviewers?.serialTimingThresholdMs).toBe(90000);
 });
 
 test("loop.json: reviewers.ladder is undisturbed by the telemetry-activation change", async () => {
   const config = (await readJson(".claude/loop.json")) as {
     reviewers?: { ladder?: unknown };
   };
-  assert.deepEqual(config.reviewers?.ladder, ["A"]);
+  expect(config.reviewers?.ladder).toEqual(["A"]);
 });
 
 // ── AC-1: fan-out-review SKILL documents the stack-lens 2nd-reviewer rule ──
 
 test("fan-out-review SKILL: documents the stack-lens 2nd-reviewer selection rule", async () => {
   const text = await readText("skills/workflow/fan-out-review/SKILL.md");
-  assert.match(text, /Stack-lens 2nd-reviewer pick/);
-  assert.match(text, /`\.cs`[^\n]*≥\s*60%[^\n]*`crew:csharp-reviewer`/);
-  assert.match(text, /`\.ts`[^\n]*\/\s*`\.tsx`[^\n]*≥\s*60%[^\n]*`crew:typescript-reviewer`/);
-  assert.match(text, /fall back to a generic `crew:reviewer` 2nd lens/);
+  expect(text).toMatch(/Stack-lens 2nd-reviewer pick/);
+  expect(text).toMatch(/`\.cs`[^\n]*≥\s*60%[^\n]*`crew:csharp-reviewer`/);
+  expect(text).toMatch(/`\.ts`[^\n]*\/\s*`\.tsx`[^\n]*≥\s*60%[^\n]*`crew:typescript-reviewer`/);
+  expect(text).toMatch(/fall back to a generic `crew:reviewer` 2nd lens/);
 });
 
 test("fan-out-review SKILL: Done section includes the stack-lens rule check", async () => {
   const text = await readText("skills/workflow/fan-out-review/SKILL.md");
-  assert.match(text, /2nd reviewer was picked by stack-lens dominance/);
+  expect(text).toMatch(/2nd reviewer was picked by stack-lens dominance/);
 });
 
 // ── AC-1/AC-3: orchestrate-slice.md documents stack-lens + single-message contract ──
 
 test("orchestrate-slice.md: heavy path states reviewers + verifier are emitted in ONE parallel message", async () => {
   const text = await readText("commands/orchestrate-slice.md");
-  assert.match(text, /Single-message contract \(FEAT-203 \/ SLICE-113\)/);
-  assert.match(text, /MUST be emitted in that ONE parallel Agent-tool message/);
-  assert.match(text, /no message between dispatches/);
-  assert.match(text, /no wait-for-one-before-dispatching-the-next/);
+  expect(text).toMatch(/Single-message contract \(FEAT-203 \/ SLICE-113\)/);
+  expect(text).toMatch(/MUST be emitted in that ONE parallel Agent-tool message/);
+  expect(text).toMatch(/no message between dispatches/);
+  expect(text).toMatch(/no wait-for-one-before-dispatching-the-next/);
 });
 
 test("orchestrate-slice.md: heavy path documents the stack-lens 2nd-reviewer rule inline", async () => {
   const text = await readText("commands/orchestrate-slice.md");
-  assert.match(text, /Stack-lens 2nd reviewer \(FEAT-203 \/ SLICE-113\)/);
-  assert.match(text, /crew:csharp-reviewer/);
-  assert.match(text, /crew:typescript-reviewer/);
+  expect(text).toMatch(/Stack-lens 2nd reviewer \(FEAT-203 \/ SLICE-113\)/);
+  expect(text).toMatch(/crew:csharp-reviewer/);
+  expect(text).toMatch(/crew:typescript-reviewer/);
 });
 
 test("orchestrate-slice.md: heavy path documents serial-dispatch telemetry via reviewers.strictParallel", async () => {
   const text = await readText("commands/orchestrate-slice.md");
-  assert.match(text, /Parallel-dispatch telemetry \(FEAT-203 \/ SLICE-113\)/);
-  assert.match(text, /reviewers\.strictParallel/);
-  assert.match(text, /serialTimingThresholdMs/);
-  assert.match(text, /serial-reviewer-warning/);
+  expect(text).toMatch(/Parallel-dispatch telemetry \(FEAT-203 \/ SLICE-113\)/);
+  expect(text).toMatch(/reviewers\.strictParallel/);
+  expect(text).toMatch(/serialTimingThresholdMs/);
+  expect(text).toMatch(/serial-reviewer-warning/);
 });
 
 test("orchestrate-slice.md: states the strictParallel runtime-consumer boundary honestly", async () => {
   const text = await readText("commands/orchestrate-slice.md");
   // Reviewer-facing honesty check (mirrors the boundary discipline in
-  // tests/validation-gate-delegation.test.ts): strictParallel must not be
+  // tests/validation-gate-delegation.test.mts): strictParallel must not be
   // described as gating behavior it does not currently gate.
-  assert.match(text, /no runtime consumer branching on it yet/);
+  expect(text).toMatch(/no runtime consumer branching on it yet/);
 });
diff --git a/crew/tests/hook-cold-start-bench.test.mts b/crew/tests/hook-cold-start-bench.test.mts
index 177ac14b..afd991d3 100644
--- a/crew/tests/hook-cold-start-bench.test.mts
+++ b/crew/tests/hook-cold-start-bench.test.mts
@@ -1,12 +1,11 @@
-// tests/hook-cold-start-bench.test.ts
-import { test } from "node:test";
-import assert from "node:assert/strict";
+// tests/hook-cold-start-bench.test.mts
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import path from "node:path";
 import url from "node:url";
 
 const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
-const HOOK = path.join(__dirname, "..", "hooks", "check-redundant-read.ts").replace(/\\/g, "/");
+const HOOK = path.join(__dirname, "..", "hooks", "check-redundant-read.mts").replace(/\\/g, "/");
 const RUNTIME = process.env["HOOK_BENCH_RUNTIME"] ?? "bun";
 const RUNS = 100;
 
@@ -24,42 +23,44 @@ function percentile(sorted: number[], p: number): number {
   return sorted[idx]!;
 }
 
-test(`hook cold start (${RUNTIME}): median + p95 over ${RUNS} cold spawns`, {
-  timeout: 30000
-}, () => {
-  const samples: number[] = [];
-  const args = RUNTIME === "node" ? ["--experimental-strip-types", HOOK] : [HOOK];
-  for (let i = 0; i < RUNS; i++) {
-    const start = process.hrtime.bigint();
-    const res = spawnSync(RUNTIME, args, {
-      env: { ...process.env },
-      input: "{}\n"
-    });
-    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
-    assert.equal(res.status, 0);
-    samples.push(elapsedMs);
-  }
-  samples.sort((a, b) => a - b);
-  const p50 = percentile(samples, 0.5);
-  const p95 = percentile(samples, 0.95);
-  console.log(`hook cold start (${RUNTIME}) p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
-  if (RUNTIME === "bun") {
-    if (IS_WINDOWS) {
-      // Windows: Bun cold start floor ~88ms standalone. Local dev meets tighter
-      // ceilings, but the GitHub Actions Windows runner adds shared-VM overhead
-      // (observed p95 ~700ms 2026-07-01). Linux/CI is the gating environment
-      // for the tight spec target — Windows uses runner-tolerant thresholds.
-      console.log("(Windows: p50 target <=250ms, p95 <=900ms; Linux/CI asserts <=150ms / <=400ms)");
-      assert.ok(p50 <= 250, `Windows p50 ${p50.toFixed(1)}ms should be <= 250ms`);
-      assert.ok(p95 <= 900, `Windows p95 ${p95.toFixed(1)}ms should be <= 900ms`);
-    } else {
-      // Linux thresholds recalibrated 2026-07-04 for the self-hosted runner
-      // migration (devops#64 dropped hosted runners): observed p50 77.9-83.0ms
-      // on the self-hosted box vs the old hosted-runner-calibrated 60ms ceiling.
-      // 150/400 keeps ~2x headroom over measured while still catching gross
-      // cold-start regressions (pre-migration local Linux p50 was ~40ms).
-      assert.ok(p50 <= 150, `Linux p50 ${p50.toFixed(1)}ms should be <= 150ms`);
-      assert.ok(p95 <= 400, `Linux p95 ${p95.toFixed(1)}ms should be <= 400ms`);
+test(
+  `hook cold start (${RUNTIME}): median + p95 over ${RUNS} cold spawns`,
+  () => {
+    const samples: number[] = [];
+    const args = RUNTIME === "node" ? ["--experimental-strip-types", HOOK] : [HOOK];
+    for (let i = 0; i < RUNS; i++) {
+      const start = process.hrtime.bigint();
+      const res = spawnSync(RUNTIME, args, {
+        env: { ...process.env },
+        input: "{}\n"
+      });
+      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
+      expect(res.status).toBe(0);
+      samples.push(elapsedMs);
     }
-  }
-});
+    samples.sort((a, b) => a - b);
+    const p50 = percentile(samples, 0.5);
+    const p95 = percentile(samples, 0.95);
+    console.log(`hook cold start (${RUNTIME}) p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
+    if (RUNTIME === "bun") {
+      if (IS_WINDOWS) {
+        // Windows: Bun cold start floor ~88ms standalone. Local dev meets tighter
+        // ceilings, but the GitHub Actions Windows runner adds shared-VM overhead
+        // (observed p95 ~700ms 2026-07-01). Linux/CI is the gating environment
+        // for the tight spec target — Windows uses runner-tolerant thresholds.
+        console.log("(Windows: p50 target <=250ms, p95 <=900ms; Linux/CI asserts <=150ms / <=400ms)");
+        expect(p50).toBeLessThanOrEqual(250);
+        expect(p95).toBeLessThanOrEqual(900);
+      } else {
+        // Linux thresholds recalibrated 2026-07-04 for the self-hosted runner
+        // migration (devops#64 dropped hosted runners): observed p50 77.9-83.0ms
+        // on the self-hosted box vs the old hosted-runner-calibrated 60ms ceiling.
+        // 150/400 keeps ~2x headroom over measured while still catching gross
+        // cold-start regressions (pre-migration local Linux p50 was ~40ms).
+        expect(p50).toBeLessThanOrEqual(150);
+        expect(p95).toBeLessThanOrEqual(400);
+      }
+    }
+  },
+  30000
+);
diff --git a/crew/tests/hook-error-events.test.mts b/crew/tests/hook-error-events.test.mts
index 33fa08d2..b87f85b5 100644
--- a/crew/tests/hook-error-events.test.mts
+++ b/crew/tests/hook-error-events.test.mts
@@ -1,6 +1,5 @@
-// tests/hook-error-events.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+// tests/hook-error-events.test.mts
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -25,16 +24,16 @@ test("logHookError emits structured hook_error event to events.jsonl", async ()
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hook-err-"));
   await logHookError(dir, "check-redundant-read", new Error("test error"));
   const events = await parseEvents(dir);
-  assert.equal(events.length, 1);
-  assert.equal(events[0].type, "hook_error");
-  assert.equal(events[0].hook, "check-redundant-read");
-  assert.match(events[0].error, /test error/);
-  assert.ok(events[0].ts, "must have timestamp");
+  expect(events.length).toBe(1);
+  expect(events[0].type).toBe("hook_error");
+  expect(events[0].hook).toBe("check-redundant-read");
+  expect(events[0].error).toMatch(/test error/);
+  expect(events[0].ts).toBeTruthy();
   await fs.rm(dir, { recursive: true, force: true });
 });
 
 test("logHookError does not throw when logs dir does not exist", async () => {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hook-err2-"));
-  await assert.doesNotReject(() => logHookError(dir, "preflight-shell", new Error("oops")));
+  await expect(logHookError(dir, "preflight-shell", new Error("oops"))).resolves.toBeUndefined();
   await fs.rm(dir, { recursive: true, force: true });
 });
diff --git a/crew/tests/hook-feature-gating.test.mts b/crew/tests/hook-feature-gating.test.mts
index 290d1d84..9d705ba6 100644
--- a/crew/tests/hook-feature-gating.test.mts
+++ b/crew/tests/hook-feature-gating.test.mts
@@ -1,7 +1,6 @@
-// tests/hook-feature-gating.test.ts
+// tests/hook-feature-gating.test.mts
 // Test suite for feature-flag gating in hooks
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawn, spawnSync } from "node:child_process";
 import fs from "node:fs/promises";
 import os from "node:os";
@@ -9,29 +8,29 @@ import path from "node:path";
 import url from "node:url";
 
 const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
-const CHECK_REDUNDANT_READ_PATH = path.join(__dirname, "..", "hooks", "check-redundant-read.ts");
-const CHECK_SUBAGENT_RETURN_PATH = path.join(__dirname, "..", "hooks", "check-subagent-return.ts");
-const PREFLIGHT_SHELL_PATH = path.join(__dirname, "..", "hooks", "preflight-shell.ts");
-const PRE_PUSH_VERIFIER_PATH = path.join(__dirname, "..", "hooks", "pre-push-verifier.ts");
+const CHECK_REDUNDANT_READ_PATH = path.join(__dirname, "..", "hooks", "check-redundant-read.mts");
+const CHECK_SUBAGENT_RETURN_PATH = path.join(__dirname, "..", "hooks", "check-subagent-return.mts");
+const PREFLIGHT_SHELL_PATH = path.join(__dirname, "..", "hooks", "preflight-shell.mts");
+const PRE_PUSH_VERIFIER_PATH = path.join(__dirname, "..", "hooks", "pre-push-verifier.mts");
 const CHECK_TASK_UPDATE_BURST_PATH = path.join(
   __dirname,
   "..",
   "hooks",
-  "check-task-update-burst.ts"
+  "check-task-update-burst.mts"
 );
 const PRE_TOOL_USE_BASH_GATE_PATH = path.join(
   __dirname,
   "..",
   "hooks",
-  "pre-tool-use-bash-gate.ts"
+  "pre-tool-use-bash-gate.mts"
 );
 const POST_TOOL_USE_BASH_GATE_PATH = path.join(
   __dirname,
   "..",
   "hooks",
-  "post-tool-use-bash-gate.ts"
+  "post-tool-use-bash-gate.mts"
 );
-const OTEL_POST_TOOL_USE_PATH = path.join(__dirname, "..", "hooks", "otel-post-tool-use.ts");
+const OTEL_POST_TOOL_USE_PATH = path.join(__dirname, "..", "hooks", "otel-post-tool-use.mts");
 
 async function makeRepo() {
   return await fs.mkdtemp(path.join(os.tmpdir(), "hook-gating-test-"));
@@ -41,7 +40,7 @@ async function cleanup(dir: string) {
   await fs.rm(dir, { recursive: true, force: true });
 }
 
-// pre-push-verifier.ts shells out to `git rev-parse --show-toplevel` to
+// pre-push-verifier.mts shells out to `git rev-parse --show-toplevel` to
 // resolve the repo root (issue #164 worktree fix). A plain mkdtemp dir isn't
 // a git repo, so that call falls through to whatever git repo happens to
 // enclose the OS tmpdir (e.g. a dotfiles repo in $HOME) instead of failing
@@ -59,7 +58,7 @@ function runHook(
   env: Record<string, string> = {}
 ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
   return new Promise((resolve) => {
-    const proc = spawn("node", ["--experimental-strip-types", hookPath], {
+    const proc = spawn("bun", [hookPath], {
       env: { ...process.env, ...env }
     });
     let stdout = "";
@@ -72,7 +71,7 @@ function runHook(
 }
 
 // ──────────────────────────────────────────────────────────────────────────
-// check-redundant-read.ts feature gating
+// check-redundant-read.mts feature gating
 // ──────────────────────────────────────────────────────────────────────────
 
 test("check-redundant-read: feature disabled in crew.json → no warn/no state", async () => {
@@ -104,14 +103,14 @@ test("check-redundant-read: feature disabled in crew.json → no warn/no state",
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // No stdout output when feature is disabled
-    assert.equal(result.stdout, "");
+    expect(result.stdout).toBe("");
     // State should NOT be created
     const stateFile = path.join(repo, ".claude", "state", "cost-hygiene", "test_disabled.json");
     try {
       await fs.stat(stateFile);
-      assert.fail("State file should not exist when feature is disabled");
+      expect(true).toBe(false); // "State file should not exist when feature is disabled"
     } catch (err) {
       // Expected: file does not exist
     }
@@ -149,12 +148,12 @@ test("check-redundant-read: feature enabled (default or explicit) → fires norm
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // State should be created when feature is enabled
     const stateFile = path.join(repo, ".claude", "state", "cost-hygiene", "test_enabled.json");
     const raw = await fs.readFile(stateFile, "utf8");
     const state = JSON.parse(raw);
-    assert.equal(state.entries[file].read_count, 1);
+    expect(state.entries[file].read_count).toBe(1);
   } finally {
     await cleanup(repo);
   }
@@ -177,19 +176,19 @@ test("check-redundant-read: missing crew.json → feature defaults to enabled",
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // State should be created (feature defaults to enabled)
     const stateFile = path.join(repo, ".claude", "state", "cost-hygiene", "test_default.json");
     const raw = await fs.readFile(stateFile, "utf8");
     const state = JSON.parse(raw);
-    assert.equal(state.entries[file].read_count, 1);
+    expect(state.entries[file].read_count).toBe(1);
   } finally {
     await cleanup(repo);
   }
 });
 
 // ──────────────────────────────────────────────────────────────────────────
-// check-subagent-return.ts feature gating
+// check-subagent-return.mts feature gating
 // ──────────────────────────────────────────────────────────────────────────
 
 test("check-subagent-return: feature disabled in crew.json → no warn output", async () => {
@@ -221,9 +220,9 @@ test("check-subagent-return: feature disabled in crew.json → no warn output",
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // No stdout output when feature is disabled
-    assert.equal(result.stdout, "");
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -258,12 +257,12 @@ test("check-subagent-return: feature enabled → warns on large inline return",
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // Should emit warning when feature is enabled
-    assert.notEqual(result.stdout, "");
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
-    assert.match(parsed.systemMessage, /inline|subagent/i);
+    expect(parsed.decision).toBe("approve");
+    expect(parsed.systemMessage).toMatch(/inline|subagent/i);
   } finally {
     await cleanup(repo);
   }
@@ -285,18 +284,18 @@ test("check-subagent-return: missing crew.json → feature defaults to enabled",
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // Should emit warning (feature defaults to enabled)
-    assert.notEqual(result.stdout, "");
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
+    expect(parsed.decision).toBe("approve");
   } finally {
     await cleanup(repo);
   }
 });
 
 // ──────────────────────────────────────────────────────────────────────────
-// preflight-shell.ts feature gating
+// preflight-shell.mts feature gating
 // ──────────────────────────────────────────────────────────────────────────
 
 test("preflight-shell: feature disabled in crew.json → no preflight output", async () => {
@@ -326,9 +325,9 @@ test("preflight-shell: feature disabled in crew.json → no preflight output", a
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // No stdout output when feature is disabled
-    assert.equal(result.stdout, "");
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -361,12 +360,12 @@ test("preflight-shell: feature enabled → runs preflight checks", async () => {
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // Should emit warning when feature is enabled
-    assert.notEqual(result.stdout, "");
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
-    assert.match(parsed.systemMessage, /\$env:/);
+    expect(parsed.decision).toBe("approve");
+    expect(parsed.systemMessage).toMatch(/\$env:/);
   } finally {
     await cleanup(repo);
   }
@@ -388,11 +387,11 @@ test("preflight-shell: missing crew.json → feature defaults to enabled", async
       })
     );
 
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // Should emit warning (feature defaults to enabled)
-    assert.notEqual(result.stdout, "");
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
+    expect(parsed.decision).toBe("approve");
   } finally {
     await cleanup(repo);
   }
@@ -432,12 +431,12 @@ test("check-redundant-read: cost-hygiene feature disabled → no warn/no state (
       })
     );
 
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
     const stateFile = path.join(repo, ".claude", "state", "cost-hygiene", "test_umbrella_off.json");
     try {
       await fs.stat(stateFile);
-      assert.fail("State file should not exist when cost-hygiene feature is disabled");
+      expect(true).toBe(false); // "State file should not exist when cost-hygiene feature is disabled"
     } catch (err) {
       // Expected: file does not exist
     }
@@ -447,7 +446,7 @@ test("check-redundant-read: cost-hygiene feature disabled → no warn/no state (
 });
 
 // ──────────────────────────────────────────────────────────────────────────
-// pre-push-verifier.ts feature gating
+// pre-push-verifier.mts feature gating
 // ──────────────────────────────────────────────────────────────────────────
 
 test("pre-push-verifier: feature disabled (default, no crew.json) → push allowed", async () => {
@@ -460,8 +459,8 @@ test("pre-push-verifier: feature disabled (default, no crew.json) → push allow
       cwd: repo
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -484,8 +483,8 @@ test("pre-push-verifier: feature disabled explicitly in crew.json → push allow
       cwd: repo
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -508,10 +507,10 @@ test("pre-push-verifier: feature enabled + no PASS artifact → push blocked", a
       cwd: repo
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "block");
+    expect(parsed.decision).toBe("block");
   } finally {
     await cleanup(repo);
   }
@@ -541,8 +540,8 @@ test("pre-push-verifier: feature enabled + PASS artifact within 1h → push allo
       cwd: repo
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -572,8 +571,8 @@ test("pre-push-verifier: feature enabled + deployment.md push.verify:false → p
       cwd: repo
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -612,8 +611,8 @@ test("pre-push-verifier: cd-prefixed command resolves the worktree's own PASS ar
       cwd: sessionCwd
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await cleanup(sessionCwd);
     await cleanup(worktree);
@@ -657,17 +656,17 @@ test("pre-push-verifier: cd-prefixed command does not leak a PASS artifact from
       cwd: sessionCwd
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "block");
+    expect(parsed.decision).toBe("block");
     // Defect #3: the message must report the dir actually scanned (the
     // worktree's own validations dir), proving defect #1 is fixed too.
     const expectedScannedDir = path.join(worktree, ".claude", "artifacts", "crew", "validations");
-    assert.ok(
+    expect(
       parsed.reason.includes(expectedScannedDir),
       `expected block reason to reference ${expectedScannedDir}, got: ${parsed.reason}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(sessionCwd);
     await cleanup(worktree);
@@ -701,19 +700,19 @@ test("pre-push-verifier: not-found message reports scanned dir, window count, an
       cwd: repo
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "block");
-    assert.ok(parsed.reason.includes(validationsDir), "reason should include the scanned dir");
-    assert.match(parsed.reason, /1 validation artifact\(s\) found within the last hour/);
-    assert.match(parsed.reason, /decision=fail/);
+    expect(parsed.decision).toBe("block");
+    expect(parsed.reason.includes(validationsDir), "reason should include the scanned dir").toBeTruthy();
+    expect(parsed.reason).toMatch(/1 validation artifact\(s\) found within the last hour/);
+    expect(parsed.reason).toMatch(/decision=fail/);
   } finally {
     await cleanup(repo);
   }
 });
 
 // ──────────────────────────────────────────────────────────────────────────
-// P1.0 feature-flag envelope — check-task-update-burst.ts (task-update-burst-warn)
+// P1.0 feature-flag envelope — check-task-update-burst.mts (task-update-burst-warn)
 // ──────────────────────────────────────────────────────────────────────────
 
 test("check-task-update-burst: task-update-burst-warn disabled → no burst rows even after 3 calls", async () => {
@@ -736,11 +735,11 @@ test("check-task-update-burst: task-update-burst-warn disabled → no burst rows
 
     for (let i = 0; i < 3; i++) {
       const result = await runHook(CHECK_TASK_UPDATE_BURST_PATH, payload("burst-off"));
-      assert.equal(result.exitCode, 0);
+      expect(result.exitCode).toBe(0);
     }
 
     const burstLog = path.join(repo, ".claude", "logs", "task-update-bursts.jsonl");
-    await assert.rejects(fs.access(burstLog), "burst log should not exist when flag disabled");
+    await expect(fs.access(burstLog)).rejects.toThrow();
   } finally {
     await cleanup(repo);
   }
@@ -758,12 +757,12 @@ test("check-task-update-burst: missing crew.json → task-update-burst-warn defa
 
     for (let i = 0; i < 3; i++) {
       const result = await runHook(CHECK_TASK_UPDATE_BURST_PATH, payload("burst-on"));
-      assert.equal(result.exitCode, 0);
+      expect(result.exitCode).toBe(0);
     }
 
     const burstLog = path.join(repo, ".claude", "logs", "task-update-bursts.jsonl");
     const raw = await fs.readFile(burstLog, "utf8");
-    assert.match(raw, /"consecutive_count":3/);
+    expect(raw).toMatch(/"consecutive_count":3/);
   } finally {
     await cleanup(repo);
   }
@@ -789,8 +788,8 @@ test("pre-tool-use-bash-gate: bash-gate-telemetry disabled → stderr diagnostic
       tool_input: { command: "bun run lint" }
     });
     const result = await runHook(PRE_TOOL_USE_BASH_GATE_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.match(result.stderr, /\[features\] bash-gate-telemetry: disabled/);
+    expect(result.exitCode).toBe(0);
+    expect(result.stderr).toMatch(/\[features\] bash-gate-telemetry: disabled/);
   } finally {
     await cleanup(repo);
   }
@@ -805,8 +804,8 @@ test("pre-tool-use-bash-gate: missing crew.json → bash-gate-telemetry defaults
       tool_input: { command: "bun run lint" }
     });
     const result = await runHook(PRE_TOOL_USE_BASH_GATE_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.match(result.stderr, /\[features\] bash-gate-telemetry: enabled/);
+    expect(result.exitCode).toBe(0);
+    expect(result.stderr).toMatch(/\[features\] bash-gate-telemetry: enabled/);
   } finally {
     await cleanup(repo);
   }
@@ -829,15 +828,15 @@ test("post-tool-use-bash-gate: bash-gate-telemetry disabled → stderr diagnosti
       tool_response: { exitCode: 0 }
     });
     const result = await runHook(POST_TOOL_USE_BASH_GATE_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.match(result.stderr, /\[features\] bash-gate-telemetry: disabled/);
+    expect(result.exitCode).toBe(0);
+    expect(result.stderr).toMatch(/\[features\] bash-gate-telemetry: disabled/);
   } finally {
     await cleanup(repo);
   }
 });
 
 // ──────────────────────────────────────────────────────────────────────────
-// P1.0 feature-flag envelope — otel-post-tool-use.ts (otel-telemetry)
+// P1.0 feature-flag envelope — otel-post-tool-use.mts (otel-telemetry)
 // ──────────────────────────────────────────────────────────────────────────
 
 test("otel-post-tool-use: otel-telemetry disabled → stderr diagnostic reports disabled, exit 0, no span attempt", async () => {
@@ -859,8 +858,8 @@ test("otel-post-tool-use: otel-telemetry disabled → stderr diagnostic reports
     const result = await runHook(OTEL_POST_TOOL_USE_PATH, payload, {
       CREW_OTEL_ENABLED: "1"
     });
-    assert.equal(result.exitCode, 0);
-    assert.match(result.stderr, /\[features\] otel-telemetry: disabled/);
+    expect(result.exitCode).toBe(0);
+    expect(result.stderr).toMatch(/\[features\] otel-telemetry: disabled/);
   } finally {
     await cleanup(repo);
   }
@@ -876,8 +875,8 @@ test("otel-post-tool-use: missing crew.json → otel-telemetry defaults enabled
       tool_input: { file_path: "x.ts" }
     });
     const result = await runHook(OTEL_POST_TOOL_USE_PATH, payload);
-    assert.equal(result.exitCode, 0);
-    assert.match(result.stderr, /\[features\] otel-telemetry: enabled/);
+    expect(result.exitCode).toBe(0);
+    expect(result.stderr).toMatch(/\[features\] otel-telemetry: enabled/);
   } finally {
     await cleanup(repo);
   }
@@ -950,10 +949,10 @@ test("pre-push-verifier: docs-only push is allowed without a PASS artifact (#163
       cwd: work
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // No block decision on stdout, and the docs-only skip note on stderr.
-    assert.equal(result.stdout, "");
-    assert.match(result.stderr, /docs-only push — validation skipped/);
+    expect(result.stdout).toBe("");
+    expect(result.stderr).toMatch(/docs-only push — validation skipped/);
   } finally {
     await cleanup(work);
     await cleanup(remote);
@@ -975,9 +974,9 @@ test("pre-push-verifier: a push mixing code with docs still blocks without a PAS
       cwd: work
     });
     const result = await runHook(PRE_PUSH_VERIFIER_PATH, payload);
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     // Non-docs file in range → normal gate applies → blocked.
-    assert.match(result.stdout, /"decision":"block"/);
+    expect(result.stdout).toMatch(/"decision":"block"/);
   } finally {
     await cleanup(work);
     await cleanup(remote);
diff --git a/crew/tests/ids.test.mts b/crew/tests/ids.test.mts
index 1cdb643a..b4d245bb 100644
--- a/crew/tests/ids.test.mts
+++ b/crew/tests/ids.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   RepoPath,
   SliceId,
@@ -12,8 +11,8 @@ import {
 test("RepoPath constructor brands a string", () => {
   const p = RepoPath("C:\\work\\mega\\hero-crew");
   // structural type is still string at runtime
-  assert.equal(typeof p, "string");
-  assert.equal(p as unknown as string, "C:\\work\\mega\\hero-crew");
+  expect(typeof p).toBe("string");
+  expect(p as unknown as string).toBe("C:\\work\\mega\\hero-crew");
 });
 
 test("SliceId, FeatId, ArtifactPath, CostReportPath, BadgeName all brand strings", () => {
@@ -22,9 +21,9 @@ test("SliceId, FeatId, ArtifactPath, CostReportPath, BadgeName all brand strings
   const a = ArtifactPath(".claude/artifacts/crew/runs/foo.md");
   const c = CostReportPath(".claude/artifacts/crew/cost/bar.md");
   const b = BadgeName("review_required");
-  assert.equal(s as unknown as string, "SLICE-42");
-  assert.equal(f as unknown as string, "FEAT-100");
-  assert.equal(a as unknown as string, ".claude/artifacts/crew/runs/foo.md");
-  assert.equal(c as unknown as string, ".claude/artifacts/crew/cost/bar.md");
-  assert.equal(b as unknown as string, "review_required");
+  expect(s as unknown as string).toBe("SLICE-42");
+  expect(f as unknown as string).toBe("FEAT-100");
+  expect(a as unknown as string).toBe(".claude/artifacts/crew/runs/foo.md");
+  expect(c as unknown as string).toBe(".claude/artifacts/crew/cost/bar.md");
+  expect(b as unknown as string).toBe("review_required");
 });
diff --git a/crew/tests/incident-dispatcher.test.mts b/crew/tests/incident-dispatcher.test.mts
index e39b3da6..14baa33b 100644
--- a/crew/tests/incident-dispatcher.test.mts
+++ b/crew/tests/incident-dispatcher.test.mts
@@ -1,11 +1,10 @@
-// tests/incident-dispatcher.test.ts — FEAT-182 SLICE-A
+// tests/incident-dispatcher.test.mts — FEAT-182 SLICE-A
 // Routing-table assertions for /crew:incident dispatcher. Tests catch
 // content drift where the triage table loses a branch or the workflow
 // loses the dispatch-to-researcher / dispatch-to-release-engineer
 // routing. Structural validators (manifest-validate) only check the
 // file exists — these tests assert the file's routing logic is intact.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { readFileSync } from "node:fs";
 import { resolve, dirname } from "node:path";
 import { fileURLToPath } from "node:url";
@@ -26,206 +25,169 @@ const crewCli = readDoc("scripts/crew.mts");
 // /crew:incident dispatcher ────────────────────────────────────────────────
 
 test("FEAT-182 SLICE-A: incident.md has frontmatter description", () => {
-  assert.match(incident, /^---\s*\n(?:[\s\S]*?\n)?description:/m);
+  expect(incident).toMatch(/^---\s*\n(?:[\s\S]*?\n)?description:/m);
 });
 
 test("FEAT-182 SLICE-A: triage routes unknown root cause to crew:researcher (NOT investigator)", () => {
   // Smoke test from FEAT-182 spec: "Why is the dashboard returning 500s?"
   // is unknown-root-cause and must route to researcher per the AC.
-  assert.ok(
-    /unknown root cause[\s\S]*?crew:researcher/i.test(incident),
-    "unknown-root-cause branch must dispatch crew:researcher"
-  );
+  expect(
+    /unknown root cause[\s\S]*?crew:researcher/i.test(incident)
+  ).toBeTruthy();
   // Reverse assertion: dispatcher must explicitly warn against using
   // investigator for RCA.
-  assert.match(
-    incident,
-    /do NOT use `crew:investigator` for root cause analysis/i,
-    "dispatcher must warn against using investigator for RCA"
+  expect(incident).toMatch(
+    /do NOT use `crew:investigator` for root cause analysis/i
   );
 });
 
 test("FEAT-182 SLICE-A: triage routes rollback need to crew:release-engineer", () => {
   // Smoke test from FEAT-182 spec: "rollback v0.46.0 due to regression"
   // must route to release-engineer with rollback procedure.
-  assert.ok(
-    /rollback[\s\S]*?crew:release-engineer/i.test(incident),
-    "rollback branch must dispatch crew:release-engineer"
-  );
+  expect(/rollback[\s\S]*?crew:release-engineer/i.test(incident)).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: triage routes code locations to crew:investigator", () => {
-  assert.ok(
-    /code locations needed[\s\S]*?crew:investigator/i.test(incident),
-    "code-locations-needed branch must dispatch crew:investigator"
-  );
+  expect(
+    /code locations needed[\s\S]*?crew:investigator/i.test(incident)
+  ).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: triage routes known root cause to specialist builder", () => {
-  assert.ok(
-    /root cause known[\s\S]*?specialist builder/i.test(incident),
-    "known-cause-fix-needed branch must dispatch a specialist builder"
-  );
+  expect(
+    /root cause known[\s\S]*?specialist builder/i.test(incident)
+  ).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: triage routes broken release ceremony to crew:release-engineer", () => {
-  assert.ok(
-    /broken release ceremony[\s\S]*?crew:release-engineer/i.test(incident),
-    "broken-release-ceremony branch must dispatch crew:release-engineer"
-  );
+  expect(
+    /broken release ceremony[\s\S]*?crew:release-engineer/i.test(incident)
+  ).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: workflow loads release-recovery skill before release-ceremony dispatch", () => {
-  assert.match(
-    incident,
-    /skills\/workflow\/release-recovery/,
-    "release-recovery skill must be referenced by the dispatcher"
-  );
+  expect(incident).toMatch(/skills\/workflow\/release-recovery/);
 });
 
 test("FEAT-182 SLICE-A: dispatcher emits incident_resolved badge on full pass", () => {
-  assert.match(
-    incident,
-    /mark-badge --repo "\$PWD" --badge incident_resolved/,
-    "must mark incident_resolved on fix-forward pass"
-  );
+  expect(incident).toMatch(/mark-badge --repo "\$PWD" --badge incident_resolved/);
 });
 
 test("FEAT-182 SLICE-A: dispatcher emits rollback_executed badge on rollback path", () => {
-  assert.match(
-    incident,
-    /mark-badge --repo "\$PWD" --badge rollback_executed/,
-    "must mark rollback_executed on rollback path"
-  );
+  expect(incident).toMatch(/mark-badge --repo "\$PWD" --badge rollback_executed/);
 });
 
 test("FEAT-182 SLICE-A: production rollback requires explicit user approval", () => {
-  assert.match(
-    incident,
-    /Production promotion is NEVER unlocked by this dispatcher/,
-    "production rollback must explicitly require user approval"
-  );
+  expect(incident).toMatch(/Production promotion is NEVER unlocked by this dispatcher/);
 });
 
 // skills/workflow/release-recovery ────────────────────────────────────────
 
 test("FEAT-182 SLICE-A: release-recovery SKILL has tier=workflow frontmatter", () => {
-  assert.match(skill, /^---\s*\n[\s\S]*?\ntier: workflow\b/m);
+  expect(skill).toMatch(/^---\s*\n[\s\S]*?\ntier: workflow\b/m);
 });
 
 test("FEAT-182 SLICE-A: release-recovery enforces NEVER delete tag", () => {
-  assert.match(skill, /NEVER delete a published tag/i);
+  expect(skill).toMatch(/NEVER delete a published tag/i);
 });
 
 test("FEAT-182 SLICE-A: release-recovery enforces NEVER force-push main", () => {
-  assert.match(skill, /NEVER force-push `main`/i);
+  expect(skill).toMatch(/NEVER force-push `main`/i);
 });
 
 test("FEAT-182 SLICE-A: release-recovery mandates pipefail in release scripts", () => {
-  assert.match(skill, /set -euo pipefail/);
-  assert.match(skill, /pipefail/);
+  expect(skill).toMatch(/set -euo pipefail/);
+  expect(skill).toMatch(/pipefail/);
 });
 
 test("FEAT-182 SLICE-A: release-recovery describes broken-tag fix-forward sequence", () => {
-  assert.match(skill, /Recovery sequence \(broken-tag, fix-forward\)/i);
-  assert.match(skill, /version bump direction\. ALWAYS forward/i);
+  expect(skill).toMatch(/Recovery sequence \(broken-tag, fix-forward\)/i);
+  expect(skill).toMatch(/version bump direction\. ALWAYS forward/i);
 });
 
 test("FEAT-182 SLICE-A: release-recovery describes marketplace-drift recovery", () => {
-  assert.match(skill, /marketplace drift/i);
+  expect(skill).toMatch(/marketplace drift/i);
 });
 
 test("FEAT-182 SLICE-A: release-recovery stays under 200-line tier cap", () => {
   const lines = skill.split(/\r?\n/).length;
-  assert.ok(
-    lines <= 200,
-    `release-recovery SKILL.md is ${lines} lines, exceeds 200-line workflow tier cap`
-  );
+  expect(lines <= 200).toBeTruthy();
 });
 
 // workflow-state incident gate + badges ────────────────────────────────────
 
 test("FEAT-182 SLICE-A: BADGE_TABLE registers incident_resolved", () => {
-  assert.match(workflowState, /incident_resolved:\s*\{/);
+  expect(workflowState).toMatch(/incident_resolved:\s*\{/);
 });
 
 test("FEAT-182 SLICE-A: BADGE_TABLE registers rollback_executed", () => {
-  assert.match(workflowState, /rollback_executed:\s*\{/);
+  expect(workflowState).toMatch(/rollback_executed:\s*\{/);
 });
 
 test("FEAT-182 SLICE-A: incident gate slot added to RunGates", () => {
-  assert.match(gates, /incident:\s*GateEntry\s*\|\s*null/);
+  expect(gates).toMatch(/incident:\s*GateEntry\s*\|\s*null/);
 });
 
 // FEAT-182 SLICE-B: incident_blocked badge + incident-response skill ───────
 
 test("FEAT-182 SLICE-B: BADGE_TABLE registers incident_blocked", () => {
-  assert.match(workflowState, /incident_blocked:\s*\{/);
+  expect(workflowState).toMatch(/incident_blocked:\s*\{/);
 });
 
 test("FEAT-182 SLICE-B: mark-badge usage string lists incident_blocked", () => {
-  assert.match(
-    crewCli,
-    /--badge[\s\S]*?incident_resolved\|rollback_executed\|incident_blocked/,
-    "mark-badge usage string must advertise incident_blocked"
+  expect(crewCli).toMatch(
+    /--badge[\s\S]*?incident_resolved\|rollback_executed\|incident_blocked/
   );
 });
 
 test("FEAT-182 SLICE-B: dispatcher marks incident_blocked on auto-fix retry exhaustion", () => {
-  assert.match(
-    incident,
-    /On N exhausted:[\s\S]*?mark-badge --repo "\$PWD" --badge incident_blocked/,
-    "retry-exhaustion path must mark incident_blocked, not the generic blocked badge"
+  expect(incident).toMatch(
+    /On N exhausted:[\s\S]*?mark-badge --repo "\$PWD" --badge incident_blocked/
   );
 });
 
 test("FEAT-182 SLICE-B: dispatcher documents incident_blocked for a rollback decision needing the user", () => {
-  assert.match(
-    incident,
-    /mark `incident_blocked` and hand the decision to the user/i,
-    "prod-rollback-needs-approval path must be documented as an incident_blocked case"
+  expect(incident).toMatch(
+    /mark `incident_blocked` and hand the decision to the user/i
   );
 });
 
 test("FEAT-182 SLICE-B: dispatcher loads the incident-response skill before prod-incident dispatch", () => {
-  assert.match(
-    incident,
-    /load `skills\/workflow\/incident-response\/` before dispatch/,
-    "prod-incident branch must load the incident-response skill"
+  expect(incident).toMatch(
+    /load `skills\/workflow\/incident-response\/` before dispatch/
   );
 });
 
 test("FEAT-182 SLICE-B: incident-response SKILL has tier=workflow frontmatter", () => {
-  assert.match(incidentResponseSkill, /^---\s*\n[\s\S]*?\ntier: workflow\b/m);
+  expect(incidentResponseSkill).toMatch(/^---\s*\n[\s\S]*?\ntier: workflow\b/m);
 });
 
 test("FEAT-182 SLICE-B: incident-response describes the rollback decision tree (code vs config vs traffic)", () => {
-  assert.match(incidentResponseSkill, /Rollback decision tree \(code vs config vs traffic\)/i);
+  expect(incidentResponseSkill).toMatch(
+    /Rollback decision tree \(code vs config vs traffic\)/i
+  );
 });
 
 test("FEAT-182 SLICE-B: incident-response names the Azure MCP tools for log/metric/trace reading", () => {
-  assert.match(incidentResponseSkill, /mcp__plugin_azure_azure__monitor/);
-  assert.match(incidentResponseSkill, /mcp__plugin_azure_azure__applicationinsights/);
-  assert.match(incidentResponseSkill, /mcp__plugin_azure_azure__grafana/);
+  expect(incidentResponseSkill).toMatch(/mcp__plugin_azure_azure__monitor/);
+  expect(incidentResponseSkill).toMatch(/mcp__plugin_azure_azure__applicationinsights/);
+  expect(incidentResponseSkill).toMatch(/mcp__plugin_azure_azure__grafana/);
 });
 
 test("FEAT-182 SLICE-B: incident-response includes a post-mortem template", () => {
-  assert.match(incidentResponseSkill, /## Post-mortem template/);
-  assert.match(incidentResponseSkill, /### Contributing factors/);
-  assert.match(incidentResponseSkill, /### Action items/);
+  expect(incidentResponseSkill).toMatch(/## Post-mortem template/);
+  expect(incidentResponseSkill).toMatch(/### Contributing factors/);
+  expect(incidentResponseSkill).toMatch(/### Action items/);
 });
 
 test("FEAT-182 SLICE-B: incident-response stays under 200-line tier cap", () => {
   const lines = incidentResponseSkill.split(/\r?\n/).length;
-  assert.ok(
-    lines <= 200,
-    `incident-response SKILL.md is ${lines} lines, exceeds 200-line workflow tier cap`
-  );
+  expect(lines <= 200).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-B: release-engineer documents the incident-triggered rollback procedure", () => {
   const releaseEngineer = readDoc("agents/release-engineer.md");
-  assert.match(releaseEngineer, /## Rollback procedure \(incident-triggered\)/);
-  assert.match(releaseEngineer, /prod → stage → dev/);
-  assert.match(releaseEngineer, /v<X\.Y\.Z>-rollback-<timestamp>/);
+  expect(releaseEngineer).toMatch(/## Rollback procedure \(incident-triggered\)/);
+  expect(releaseEngineer).toMatch(/prod → stage → dev/);
+  expect(releaseEngineer).toMatch(/v<X\.Y\.Z>-rollback-<timestamp>/);
 });
diff --git a/crew/tests/incomplete-detector.test.mts b/crew/tests/incomplete-detector.test.mts
index 2f2f1b46..302a7df3 100644
--- a/crew/tests/incomplete-detector.test.mts
+++ b/crew/tests/incomplete-detector.test.mts
@@ -1,68 +1,63 @@
-// tests/incomplete-detector.test.ts
+// tests/incomplete-detector.test.mts
 // FEAT-188 S1a AC-4: pure unit coverage for the shared subagent_incomplete
-// detector. Kept as its own file (not folded into subagent-return.test.ts)
+// detector. Kept as its own file (not folded into subagent-return.test.mts)
 // because this module is meant to be imported directly by issue #162 Fix A
 // (idle-without-terminal-state guard) — it must stand on its own, decoupled
 // from the check-subagent-return hook's wiring.
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   detectSubagentIncomplete,
   hasTerminalStatusMarker
 } from "../scripts/lib/subagent-return/incomplete-detector.mjs";
 
 test("hasTerminalStatusMarker: recognizes DONE/BLOCKED/HELP/IN-PROGRESS at line start", () => {
-  assert.ok(hasTerminalStatusMarker("DONE: shipped the feature"));
-  assert.ok(hasTerminalStatusMarker("BLOCKED: waiting on operator"));
-  assert.ok(hasTerminalStatusMarker("HELP: need a specialist"));
-  assert.ok(hasTerminalStatusMarker("IN-PROGRESS: still working"));
+  expect(hasTerminalStatusMarker("DONE: shipped the feature")).toBeTruthy();
+  expect(hasTerminalStatusMarker("BLOCKED: waiting on operator")).toBeTruthy();
+  expect(hasTerminalStatusMarker("HELP: need a specialist")).toBeTruthy();
+  expect(hasTerminalStatusMarker("IN-PROGRESS: still working")).toBeTruthy();
 });
 
 test("hasTerminalStatusMarker: matches mid-body on its own line, not just at index 0", () => {
-  assert.ok(hasTerminalStatusMarker("Some preamble.\nDONE: all set.\n"));
+  expect(hasTerminalStatusMarker("Some preamble.\nDONE: all set.\n")).toBeTruthy();
 });
 
 test("hasTerminalStatusMarker: plain prose without a status marker → false", () => {
-  assert.ok(!hasTerminalStatusMarker("Everything looks fine, no issues found."));
+  expect(!hasTerminalStatusMarker("Everything looks fine, no issues found.")).toBeTruthy();
 });
 
 test("hasTerminalStatusMarker: the word 'done' inside prose (no colon) → false", () => {
-  assert.ok(!hasTerminalStatusMarker("I am done reading the file now."));
+  expect(!hasTerminalStatusMarker("I am done reading the file now.")).toBeTruthy();
 });
 
 test("detectSubagentIncomplete: no artifact path, no terminal status → true", () => {
-  assert.equal(detectSubagentIncomplete({ body: "Here is what I found, no summary line." }), true);
+  expect(detectSubagentIncomplete({ body: "Here is what I found, no summary line." })).toBe(true);
 });
 
 test("detectSubagentIncomplete: artifact path present → false regardless of status", () => {
-  assert.equal(
+  expect(
     detectSubagentIncomplete({
       body: "See .claude/artifacts/crew/handoffs/foo.md for the handoff."
-    }),
-    false
-  );
+    })
+  ).toBe(false);
 });
 
 test("detectSubagentIncomplete: terminal status present, no artifact path → false", () => {
-  assert.equal(
-    detectSubagentIncomplete({ body: "DONE: task complete, nothing else to note." }),
-    false
-  );
+  expect(
+    detectSubagentIncomplete({ body: "DONE: task complete, nothing else to note." })
+  ).toBe(false);
 });
 
 test("detectSubagentIncomplete: both artifact path and terminal status → false", () => {
-  assert.equal(
+  expect(
     detectSubagentIncomplete({
       body: "DONE: see .claude/artifacts/crew/handoffs/foo.md"
-    }),
-    false
-  );
+    })
+  ).toBe(false);
 });
 
 test("detectSubagentIncomplete: worktreeDirty is accepted but not required for detection", () => {
-  assert.equal(detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: true }), true);
-  assert.equal(
-    detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: false }),
-    true
-  );
+  expect(detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: true })).toBe(true);
+  expect(
+    detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: false })
+  ).toBe(true);
 });
diff --git a/crew/tests/installer.test.mts b/crew/tests/installer.test.mts
index f7ad377b..afa6cd9e 100644
--- a/crew/tests/installer.test.mts
+++ b/crew/tests/installer.test.mts
@@ -1,8 +1,7 @@
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
 import { execFile as execFileCallback } from "node:child_process";
 import { promisify } from "node:util";
 import { fileURLToPath } from "node:url";
@@ -24,7 +23,7 @@ test("bootstrap adds harness files to an existing repo and preserves CLAUDE.md",
   );
 
   const bootstrapResult = await bootstrapRepo(repoPath);
-  assert.ok(bootstrapResult.ok, "bootstrapRepo should succeed");
+  expect(bootstrapResult.ok).toBeTruthy();
   const result = bootstrapResult.value;
   const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
   const workflowMd = await fs.readFile(
@@ -42,22 +41,21 @@ test("bootstrap adds harness files to an existing repo and preserves CLAUDE.md",
     await fs.readFile(path.join(repoPath, ".claude", "state", "crew", "claims.json"), "utf8")
   );
 
-  assert.equal(result.mode, "bootstrap");
-  assert.match(claudeMd, /# Existing Repo Rules/);
-  assert.match(claudeMd, /crew:start/);
-  assert.match(claudeMd, /@\.claude\/crew\/constitution\.md/);
-  assert.doesNotMatch(claudeMd, /@\.claude\/crew\/workflow\.md/);
-  assert.match(
-    workflowMd,
+  expect(result.mode).toBe("bootstrap");
+  expect(claudeMd).toMatch(/# Existing Repo Rules/);
+  expect(claudeMd).toMatch(/crew:start/);
+  expect(claudeMd).toMatch(/@\.claude\/crew\/constitution\.md/);
+  expect(claudeMd).not.toMatch(/@\.claude\/crew\/workflow\.md/);
+  expect(workflowMd).toMatch(
     /Builder owns code-bearing tasks, including tests for changed behavior when practical/
   );
-  assert.match(protocolMd, /Validation Result/);
-  assert.match(protocolMd, /Deployment Result/);
-  assert.match(protocolMd, /whether tests were added or updated/);
-  assert.ok(settings.hooks.SessionStart);
-  assert.ok(settings.hooks.TaskCreated);
-  assert.ok(settings.hooks.PreToolUse);
-  assert.deepEqual(claimsState.claims, {});
+  expect(protocolMd).toMatch(/Validation Result/);
+  expect(protocolMd).toMatch(/Deployment Result/);
+  expect(protocolMd).toMatch(/whether tests were added or updated/);
+  expect(settings.hooks.SessionStart).toBeTruthy();
+  expect(settings.hooks.TaskCreated).toBeTruthy();
+  expect(settings.hooks.PreToolUse).toBeTruthy();
+  expect(claimsState.claims).toEqual({});
 });
 
 test("bootstrap creates .gitignore with marker block and preserves user lines", async () => {
@@ -66,9 +64,9 @@ test("bootstrap creates .gitignore with marker block and preserves user lines",
   await bootstrapRepo(repoPath);
 
   const ignore = await fs.readFile(path.join(repoPath, ".gitignore"), "utf8");
-  assert.match(ignore, /# crew:start/);
-  assert.match(ignore, /# crew:end/);
-  assert.match(ignore, /\.claude\/logs\//);
+  expect(ignore).toMatch(/# crew:start/);
+  expect(ignore).toMatch(/# crew:end/);
+  expect(ignore).toMatch(/\.claude\/logs\//);
 });
 
 test("bootstrap merges marker block into existing .gitignore without losing user lines", async () => {
@@ -78,9 +76,9 @@ test("bootstrap merges marker block into existing .gitignore without losing user
   await bootstrapRepo(repoPath);
 
   const ignore = await fs.readFile(path.join(repoPath, ".gitignore"), "utf8");
-  assert.match(ignore, /node_modules\//);
-  assert.match(ignore, /my-secret\.env/);
-  assert.match(ignore, /# crew:start[\s\S]*# crew:end/);
+  expect(ignore).toMatch(/node_modules\//);
+  expect(ignore).toMatch(/my-secret\.env/);
+  expect(ignore).toMatch(/# crew:start[\s\S]*# crew:end/);
 });
 
 test("bootstrap is idempotent for .gitignore marker block", async () => {
@@ -91,7 +89,7 @@ test("bootstrap is idempotent for .gitignore marker block", async () => {
 
   const ignore = await fs.readFile(path.join(repoPath, ".gitignore"), "utf8");
   const starts = ignore.match(/# crew:start/g) ?? [];
-  assert.equal(starts.length, 1);
+  expect(starts.length).toBe(1);
 });
 
 test("bootstrap is idempotent for CLAUDE.md imports", async () => {
@@ -103,7 +101,7 @@ test("bootstrap is idempotent for CLAUDE.md imports", async () => {
 
   const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
   const occurrences = claudeMd.match(/crew:start/g) ?? [];
-  assert.equal(occurrences.length, 1);
+  expect(occurrences.length).toBe(1);
 });
 
 test("bootstrap upgrades legacy harness paths and CLAUDE import block", async () => {
@@ -142,30 +140,27 @@ test("bootstrap upgrades legacy harness paths and CLAUDE import block", async ()
     path.join(repoPath, ".claude", "state", "crew", "claims.json"),
     "utf8"
   );
-  assert.match(claudeMd, /<!-- crew:start -->/);
-  assert.doesNotMatch(claudeMd, /engineering-os:start/);
-  assert.equal(
+  expect(claudeMd).toMatch(/<!-- crew:start -->/);
+  expect(claudeMd).not.toMatch(/engineering-os:start/);
+  expect(
     await fs
       .access(path.join(repoPath, ".claude", "crew", "constitution.md"))
       .then(() => true)
-      .catch(() => false),
-    true
-  );
-  assert.equal(
+      .catch(() => false)
+  ).toBe(true);
+  expect(
     await fs
       .access(path.join(repoPath, ".claude", "state", "crew", "claims.json"))
       .then(() => true)
-      .catch(() => false),
-    true
-  );
-  assert.match(claimsState, /src\/legacy\.ts/);
-  assert.equal(
+      .catch(() => false)
+  ).toBe(true);
+  expect(claimsState).toMatch(/src\/legacy\.ts/);
+  expect(
     await fs
       .access(path.join(repoPath, ".claude", "engineering-os"))
       .then(() => true)
-      .catch(() => false),
-    false
-  );
+      .catch(() => false)
+  ).toBe(false);
 });
 
 test("init creates a new repo harness and audit sees it", async () => {
@@ -175,12 +170,12 @@ test("init creates a new repo harness and audit sees it", async () => {
   const result = await initRepo(repoPath);
   const audit = await auditRepo(repoPath);
 
-  assert.equal(result.mode, "init");
-  assert.equal(audit.exists, true);
-  assert.equal(audit.hasClaudeMd, true);
-  assert.equal(audit.hasHarnessLayer, true);
-  assert.equal(audit.hasStateLayer, true);
-  assert.equal(audit.hasWorkflowState, true);
+  expect(result.mode).toBe("init");
+  expect(audit.exists).toBe(true);
+  expect(audit.hasClaudeMd).toBe(true);
+  expect(audit.hasHarnessLayer).toBe(true);
+  expect(audit.hasStateLayer).toBe(true);
+  expect(audit.hasWorkflowState).toBe(true);
 });
 
 test("bootstrap installs a soft git gate reminder hook", async () => {
@@ -192,16 +187,15 @@ test("bootstrap installs a soft git gate reminder hook", async () => {
   const settings = JSON.parse(
     await fs.readFile(path.join(repoPath, ".claude", "settings.json"), "utf8")
   );
-  assert.ok(settings.hooks.PreToolUse);
-  assert.match(
-    settings.hooks.PreToolUse[0].hooks[0].command,
+  expect(settings.hooks.PreToolUse).toBeTruthy();
+  expect(settings.hooks.PreToolUse[0].hooks[0].command).toMatch(
     /\.claude\/hooks\/check_git_gate\.sh/
   );
 
   const hookPath = path.join(repoPath, ".claude", "hooks", "check_git_gate.sh");
   const hookStat = await fs.stat(hookPath);
   if (process.platform !== "win32") {
-    assert.ok((hookStat.mode & 0o111) !== 0);
+    expect((hookStat.mode & 0o111) !== 0).toBeTruthy();
   }
 
   const workflowPath = path.join(repoPath, ".claude", "state", "crew", "workflow-state.json");
@@ -250,9 +244,11 @@ test("bootstrap installs a soft git gate reminder hook", async () => {
     }
   });
   const reminder = JSON.parse(stdout);
-  assert.equal(reminder.continue, true);
-  assert.equal(reminder.suppressOutput, true);
-  assert.match(reminder.systemMessage, /pending workflow gates before git commit: review_required/);
+  expect(reminder.continue).toBe(true);
+  expect(reminder.suppressOutput).toBe(true);
+  expect(reminder.systemMessage).toMatch(
+    /pending workflow gates before git commit: review_required/
+  );
 });
 
 test("bootstrap git gate reminder also warns when a completed phase is missing its artifact write-back", async () => {
@@ -317,10 +313,9 @@ test("bootstrap git gate reminder also warns when a completed phase is missing i
     }
   });
   const reminder = JSON.parse(stdout);
-  assert.equal(reminder.continue, true);
-  assert.equal(reminder.suppressOutput, true);
-  assert.match(
-    reminder.systemMessage,
+  expect(reminder.continue).toBe(true);
+  expect(reminder.suppressOutput).toBe(true);
+  expect(reminder.systemMessage).toMatch(
     /phase-complete write-backs still missing before gh pr: review-result artifact/
   );
 });
@@ -329,7 +324,7 @@ test("init rejects a non-empty existing directory without opt-in", async () => {
   const repoPath = await makeTempDir("crew-existing-");
   await fs.writeFile(path.join(repoPath, "README.md"), "hello\n");
 
-  await assert.rejects(() => initRepo(repoPath), /already exists and is not empty/);
+  await expect(initRepo(repoPath)).rejects.toThrow(/already exists and is not empty/);
 });
 
 test("installGlobal migrates legacy ~/.claude/engineering-os/ to ~/.claude/crew/", async () => {
@@ -353,22 +348,19 @@ test("installGlobal migrates legacy ~/.claude/engineering-os/ to ~/.claude/crew/
     );
 
     const result = await installGlobal();
-    assert.equal(result.global.hasGlobalMemory, true);
-    assert.ok(
-      result.writes.some((w) => w.includes("migrated")),
-      "should report migration in writes"
-    );
+    expect(result.global.hasGlobalMemory).toBe(true);
+    expect(result.writes.some((w) => w.includes("migrated"))).toBeTruthy();
 
     const claudeMd = await fs.readFile(path.join(homePath, ".claude", "CLAUDE.md"), "utf8");
-    assert.match(claudeMd, /@~\/\.claude\/crew\/constitution\.md/);
-    assert.match(claudeMd, /@~\/\.claude\/crew\/workflow\.md/);
-    assert.doesNotMatch(claudeMd, /engineering-os/);
+    expect(claudeMd).toMatch(/@~\/\.claude\/crew\/constitution\.md/);
+    expect(claudeMd).toMatch(/@~\/\.claude\/crew\/workflow\.md/);
+    expect(claudeMd).not.toMatch(/engineering-os/);
 
     const legacyExists = await fs
       .access(legacyDir)
       .then(() => true)
       .catch(() => false);
-    assert.equal(legacyExists, false, "legacy dir should be removed");
+    expect(legacyExists).toBe(false);
   } finally {
     if (originalHome === undefined) {
       delete process.env.HOME;
@@ -385,28 +377,28 @@ test("installGlobal writes one managed global memory copy and is idempotent", as
 
   try {
     const first = await installGlobal();
-    assert.equal(first.mode, "install-global");
-    assert.deepEqual(first.writes, [
+    expect(first.mode).toBe("install-global");
+    expect(first.writes).toEqual([
       "~/.claude/crew/constitution.md",
       "~/.claude/crew/workflow.md",
       "~/.claude/crew/metadata.json",
       "~/.claude/CLAUDE.md"
     ]);
-    assert.equal(first.global.hasGlobalMemory, true);
-    assert.equal(first.global.globalMemoryStale, false);
+    expect(first.global.hasGlobalMemory).toBe(true);
+    expect(first.global.globalMemoryStale).toBe(false);
 
     const claudeMd = await fs.readFile(path.join(homePath, ".claude", "CLAUDE.md"), "utf8");
-    assert.match(claudeMd, /@~\/\.claude\/crew\/constitution\.md/);
-    assert.match(claudeMd, /@~\/\.claude\/crew\/workflow\.md/);
+    expect(claudeMd).toMatch(/@~\/\.claude\/crew\/constitution\.md/);
+    expect(claudeMd).toMatch(/@~\/\.claude\/crew\/workflow\.md/);
 
     const metadata = JSON.parse(
       await fs.readFile(path.join(homePath, ".claude", "crew", "metadata.json"), "utf8")
     );
-    assert.equal(metadata.managedBy, "crew");
+    expect(metadata.managedBy).toBe("crew");
 
     const second = await installGlobal();
-    assert.deepEqual(second.writes, []);
-    assert.equal(second.global.hasGlobalMemory, true);
+    expect(second.writes).toEqual([]);
+    expect(second.global.hasGlobalMemory).toBe(true);
   } finally {
     if (originalHome === undefined) {
       delete process.env.HOME;
@@ -441,13 +433,13 @@ test("settings hook commands no-op silently when .claude/hooks is not materializ
       for (const hook of entry.hooks ?? []) commands.push(hook.command);
     }
   }
-  assert.ok(commands.length >= 6, `expected all crew hook commands, got ${commands.length}`);
+  expect(commands.length >= 6).toBeTruthy();
 
   for (const command of commands) {
     // execFile rejects on non-zero exit — resolving IS the assertion.
     const { stdout, stderr } = await execFile("bash", ["-c", command], { cwd: repoPath });
-    assert.equal(stdout.trim(), "", `guarded command must stay silent: ${command}`);
-    assert.equal(stderr.trim(), "", `guarded command must not error: ${command}`);
+    expect(stdout.trim()).toBe("");
+    expect(stderr.trim()).toBe("");
   }
 });
 
@@ -468,7 +460,7 @@ test("guarded hook command still executes the materialized script (stdin preserv
   );
 
   const events = await fs.readFile(path.join(repoPath, ".claude", "logs", "events.jsonl"), "utf8");
-  assert.match(events, /"event":"session_start"/);
+  expect(events).toMatch(/"event":"session_start"/);
 });
 
 // dev-team dogfoods this plugin: its own tracked .claude/settings.json is a
@@ -496,10 +488,7 @@ test("repo's own tracked .claude/settings.json hook commands no-op silently when
       }
     }
   }
-  assert.ok(
-    hookCommands.length >= 8,
-    `expected all tracked .claude/hooks/* commands, got ${hookCommands.length}`
-  );
+  expect(hookCommands.length >= 8).toBeTruthy();
 
   // Run each command from a cwd that has no .claude/hooks/ directory at all
   // — the fresh-checkout / unmaterialized-worktree scenario from #202.
@@ -507,7 +496,7 @@ test("repo's own tracked .claude/settings.json hook commands no-op silently when
 
   for (const command of hookCommands) {
     const { stdout, stderr } = await execFile("bash", ["-c", command], { cwd: repoPath });
-    assert.equal(stdout.trim(), "", `guarded command must stay silent: ${command}`);
-    assert.equal(stderr.trim(), "", `guarded command must not error: ${command}`);
+    expect(stdout.trim()).toBe("");
+    expect(stderr.trim()).toBe("");
   }
 });
diff --git a/crew/tests/integration-smoke-skill.test.mts b/crew/tests/integration-smoke-skill.test.mts
index ee1ef464..2e3f3b24 100644
--- a/crew/tests/integration-smoke-skill.test.mts
+++ b/crew/tests/integration-smoke-skill.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -9,21 +8,21 @@ const SKILL_PATH = path.join(REPO_ROOT, "skills", "workflow", "integration-smoke
 
 test("integration-smoke skill has correct frontmatter", async () => {
   const md = await fs.readFile(SKILL_PATH, "utf8");
-  assert.match(md, /name:\s*integration-smoke/);
-  assert.match(md, /tier:\s*workflow/);
+  expect(md).toMatch(/name:\s*integration-smoke/);
+  expect(md).toMatch(/tier:\s*workflow/);
 });
 
 test("integration-smoke skill covers pre-flight, run, exercise, teardown, artifact", async () => {
   const md = await fs.readFile(SKILL_PATH, "utf8");
-  assert.match(md, /Pre-flight/i);
-  assert.match(md, /Start BE/i);
-  assert.match(md, /Start FE/i);
-  assert.match(md, /Exercise/i);
-  assert.match(md, /Tear down/i);
-  assert.match(md, /Write the artifact/i);
+  expect(md).toMatch(/Pre-flight/i);
+  expect(md).toMatch(/Start BE/i);
+  expect(md).toMatch(/Start FE/i);
+  expect(md).toMatch(/Exercise/i);
+  expect(md).toMatch(/Tear down/i);
+  expect(md).toMatch(/Write the artifact/i);
 });
 
 test("integration-smoke skill names runtime OpenAPI validator", async () => {
   const md = await fs.readFile(SKILL_PATH, "utf8");
-  assert.match(md, /openapi-response-validator|ajv/i);
+  expect(md).toMatch(/openapi-response-validator|ajv/i);
 });
diff --git a/crew/tests/integrator-prompt.test.mts b/crew/tests/integrator-prompt.test.mts
index 1b4073f4..3d881cc9 100644
--- a/crew/tests/integrator-prompt.test.mts
+++ b/crew/tests/integrator-prompt.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -9,30 +8,30 @@ const AGENT_PATH = path.join(REPO_ROOT, "agents", "integrator.md");
 
 test("integrator.md exists with frontmatter name=integrator and color=purple", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /name:\s*integrator/);
-  assert.match(md, /color:\s*purple/);
+  expect(md).toMatch(/name:\s*integrator/);
+  expect(md).toMatch(/color:\s*purple/);
 });
 
 test("integrator.md mandates pre-flight env check and skip-and-block on missing vars", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /pre-flight/i);
-  assert.match(md, /env_required/);
-  assert.match(md, /help_request/);
+  expect(md).toMatch(/pre-flight/i);
+  expect(md).toMatch(/env_required/);
+  expect(md).toMatch(/help_request/);
 });
 
 test("integrator.md procedure references integration-smoke skill", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /skills\/workflow\/integration-smoke/);
+  expect(md).toMatch(/skills\/workflow\/integration-smoke/);
 });
 
 test("integrator.md writes artifact under .claude/artifacts/crew/integrations/", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /\.claude\/artifacts\/crew\/integrations\//);
+  expect(md).toMatch(/\.claude\/artifacts\/crew\/integrations\//);
 });
 
 test("integrator.md validates responses against OpenAPI schema at runtime", async () => {
   const md = await fs.readFile(AGENT_PATH, "utf8");
-  assert.match(md, /runtime/i);
-  assert.match(md, /OpenAPI/);
-  assert.match(md, /validate/i);
+  expect(md).toMatch(/runtime/i);
+  expect(md).toMatch(/OpenAPI/);
+  expect(md).toMatch(/validate/i);
 });
diff --git a/crew/tests/journey-builder.test.mts b/crew/tests/journey-builder.test.mts
index a1e80f89..54e7d475 100644
--- a/crew/tests/journey-builder.test.mts
+++ b/crew/tests/journey-builder.test.mts
@@ -1,49 +1,48 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { buildJourney } from "../scripts/lib/ux-validation/journey-builder.mjs";
 
 test("explicit ## User Journey parsed: 3 steps", () => {
   const slice = `# Slice\n## User Journey\n\n1. navigate to /dashboard\n2. click "New Project"\n3. fill form: name=Test → expect: form fills\n## Acceptance criteria\n`;
   const result = buildJourney([], slice);
-  assert.equal(result.length, 3);
-  assert.deepEqual(result[0], {
+  expect(result.length).toBe(3);
+  expect(result[0]).toEqual({
     step: 1,
     verb: "navigate",
     target: "to /dashboard",
     expect: "no error / visible",
     ac_id: null
   });
-  assert.equal(result[2]!.expect, "form fills");
+  expect(result[2]!.expect).toBe("form fills");
 });
 
 test("override takes precedence over ACs", () => {
   const acs = [{ id: "AC-1", text: "user can click submit" }];
   const slice = `## User Journey\n\n1. navigate to /app\n2. click submit\n`;
   const result = buildJourney(acs, slice);
-  assert.equal(result.length, 2);
-  assert.equal(result[0]!.verb, "navigate");
-  assert.equal(result[0]!.ac_id, null); // from override, not from AC
+  expect(result.length).toBe(2);
+  expect(result[0]!.verb).toBe("navigate");
+  expect(result[0]!.ac_id).toBe(null); // from override, not from AC
 });
 
 test("optional expect defaults to 'no error / visible'", () => {
   const slice = `## User Journey\n\n1. navigate to /app\n2. click button\n`;
   const result = buildJourney([], slice);
-  assert.equal(result[0]!.expect, "no error / visible");
-  assert.equal(result[1]!.expect, "no error / visible");
+  expect(result[0]!.expect).toBe("no error / visible");
+  expect(result[1]!.expect).toBe("no error / visible");
 });
 
 test("unparseable journey line skipped, valid lines parsed", () => {
   const slice = `## User Journey\n\n1. navigate to /app\nthis line is not a step\n2. click submit\n`;
   const result = buildJourney([], slice);
-  assert.equal(result.length, 2);
-  assert.equal(result[0]!.verb, "navigate");
-  assert.equal(result[1]!.verb, "click");
+  expect(result.length).toBe(2);
+  expect(result[0]!.verb).toBe("navigate");
+  expect(result[1]!.verb).toBe("click");
 });
 
 test("journey section stops at next ## header", () => {
   const slice = `## User Journey\n\n1. navigate to /app\n2. click submit\n## Notes\n3. this line ignored\n`;
   const result = buildJourney([], slice);
-  assert.equal(result.length, 2);
+  expect(result.length).toBe(2);
 });
 
 test("navigation AC sorts before interaction AC", () => {
@@ -52,8 +51,8 @@ test("navigation AC sorts before interaction AC", () => {
     { id: "AC-2", text: "user should navigate to /dashboard" }
   ];
   const result = buildJourney(acs, "");
-  assert.equal(result[0]!.ac_id, "AC-2"); // navigation first
-  assert.equal(result[1]!.ac_id, "AC-1"); // interaction second
+  expect(result[0]!.ac_id).toBe("AC-2"); // navigation first
+  expect(result[1]!.ac_id).toBe("AC-1"); // interaction second
 });
 
 test("tie-breaking by document order within same category", () => {
@@ -62,12 +61,12 @@ test("tie-breaking by document order within same category", () => {
     { id: "AC-2", text: "user can click cancel" }
   ];
   const result = buildJourney(acs, "");
-  assert.equal(result[0]!.ac_id, "AC-1");
-  assert.equal(result[1]!.ac_id, "AC-2");
+  expect(result[0]!.ac_id).toBe("AC-1");
+  expect(result[1]!.ac_id).toBe("AC-2");
 });
 
 test("empty AC list returns []", () => {
-  assert.deepEqual(buildJourney([], ""), []);
+  expect(buildJourney([], "")).toEqual([]);
 });
 
 test("all non_ui_ac returns []", () => {
@@ -75,12 +74,12 @@ test("all non_ui_ac returns []", () => {
     { id: "AC-1", text: "server returns 200" },
     { id: "AC-2", text: "database record created" }
   ];
-  assert.deepEqual(buildJourney(acs, ""), []);
+  expect(buildJourney(acs, "")).toEqual([]);
 });
 
 test("single UI AC returns [] (< 2 steps)", () => {
   const acs = [{ id: "AC-1", text: "user clicks submit" }];
-  assert.deepEqual(buildJourney(acs, ""), []);
+  expect(buildJourney(acs, "")).toEqual([]);
 });
 
 import { buildQaInvocation } from "../scripts/lib/ux-validation/qa-adapter.mjs";
@@ -96,7 +95,7 @@ test("buildQaInvocation with scenario_chain uses chain as scenarios", () => {
     outputPath: "/tmp/out.json",
     scenario_chain: chain
   });
-  assert.ok(cmd.includes('"verb":"navigate"'), `expected chain in cmd, got: ${cmd}`);
+  expect(cmd.includes('"verb":"navigate"')).toBeTruthy();
 });
 
 test("buildQaInvocation without scenario_chain uses scenarios (backward compat)", () => {
@@ -107,6 +106,6 @@ test("buildQaInvocation without scenario_chain uses scenarios (backward compat)"
     baselineDir: "tests/baselines",
     outputPath: "/tmp/out.json"
   });
-  assert.ok(cmd.includes('"id":"AC-1"'), `expected scenarios in cmd, got: ${cmd}`);
-  assert.ok(!cmd.includes('"verb":"navigate"'));
+  expect(cmd.includes('"id":"AC-1"')).toBeTruthy();
+  expect(!cmd.includes('"verb":"navigate"')).toBeTruthy();
 });
diff --git a/crew/tests/jsonl.test.mts b/crew/tests/jsonl.test.mts
index 382a3ab8..30c2e571 100644
--- a/crew/tests/jsonl.test.mts
+++ b/crew/tests/jsonl.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -22,7 +21,7 @@ test("tailReadJsonl: returns last N records from multi-line file", async () => {
   const { dir, filePath } = await writeTmpJsonl(records);
   try {
     const result = await tailReadJsonl(filePath, 3);
-    assert.deepEqual(result, [{ id: 3 }, { id: 4 }, { id: 5 }]);
+    expect(result).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }]);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -34,10 +33,10 @@ test("tailReadJsonl: discards partial leading line at tail boundary", async () =
   try {
     // Use a small maxBytes to force a mid-file start; truncated first line must be dropped
     const result = await tailReadJsonl(filePath, 5, { maxBytes: 800 });
-    assert.ok(result.length > 0 && result.length <= 5, "should return 1-5 records");
+    expect(result.length > 0 && result.length <= 5, "should return 1-5 records").toBeTruthy();
     // All returned records must be fully parseable (no partial data)
     for (const r of result) {
-      assert.ok(typeof r.seq === "number", "each record must have numeric seq");
+      expect(typeof r.seq === "number", "each record must have numeric seq").toBeTruthy();
     }
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
@@ -50,7 +49,7 @@ test("tailReadJsonl: file smaller than tail-window reads in full", async () => {
   try {
     // maxBytes much larger than file — should read all records
     const result = await tailReadJsonl(filePath, 100, { maxBytes: 1024 * 1024 });
-    assert.deepEqual(result, records);
+    expect(result).toEqual(records);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
@@ -58,7 +57,7 @@ test("tailReadJsonl: file smaller than tail-window reads in full", async () => {
 
 test("tailReadJsonl: returns empty array for missing file", async () => {
   const result = await tailReadJsonl("/nonexistent/path/data.jsonl", 10);
-  assert.deepEqual(result, []);
+  expect(result).toEqual([]);
 });
 
 test("tailReadJsonl: returns empty array for empty file", async () => {
@@ -67,7 +66,7 @@ test("tailReadJsonl: returns empty array for empty file", async () => {
   await fs.writeFile(filePath, "", "utf8");
   try {
     const result = await tailReadJsonl(filePath, 5);
-    assert.deepEqual(result, []);
+    expect(result).toEqual([]);
   } finally {
     await fs.rm(dir, { recursive: true, force: true });
   }
diff --git a/crew/tests/log-event-async-bench.test.mts b/crew/tests/log-event-async-bench.test.mts
index d878a7f8..ef225505 100644
--- a/crew/tests/log-event-async-bench.test.mts
+++ b/crew/tests/log-event-async-bench.test.mts
@@ -1,6 +1,5 @@
-// tests/log-event-async-bench.test.ts
-import { test } from "node:test";
-import assert from "node:assert/strict";
+// tests/log-event-async-bench.test.mts
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import { mkdtempSync, rmSync } from "node:fs";
 import { tmpdir } from "node:os";
@@ -23,41 +22,40 @@ function percentile(sorted: number[], p: number): number {
   return sorted[idx]!;
 }
 
-test(`log_event.sh foreground latency: p95 over ${RUNS} runs is <= 20ms`, {
-  timeout: 60000,
-  skip: IS_WINDOWS
-    ? "skip on Windows — Cygwin bash cold-start floor makes p95 unreliable"
-    : IS_CI
-      ? "skip in CI — parallel test load makes p95 latency benchmarks unreliable; verify locally on a quiet Linux machine"
-      : false
-}, () => {
-  const root = mkdtempSync(path.join(tmpdir(), "log-event-bench-"));
-  const samples: number[] = [];
-  try {
-    for (let i = 0; i < RUNS; i++) {
-      const start = process.hrtime.bigint();
-      const res = spawnSync("bash", [SCRIPT, "bench_event"], {
-        cwd: root,
-        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
-        input: '{"sample":true}\n'
-      });
-      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
-      assert.equal(res.status, 0);
-      samples.push(elapsedMs);
-    }
-    samples.sort((a, b) => a - b);
-    const p50 = percentile(samples, 0.5);
-    const p95 = percentile(samples, 0.95);
-    console.log(`log_event.sh foreground p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
-    if (IS_WINDOWS) {
-      // Windows/Cygwin bash cold start floor is ~57ms; assert only that
-      // the async-fire actually helped (p95 < synchronous baseline of ~337ms).
-      console.log("(Windows: skipping <=20ms p95 assertion; Cygwin bash floor ~57ms)");
-      assert.ok(p95 < 300, `Windows p95 ${p95.toFixed(1)}ms should be < 300ms`);
-    } else {
-      assert.ok(p95 <= 20, `Linux p95 ${p95.toFixed(1)}ms should be <= 20ms`);
+const SKIP = IS_WINDOWS || IS_CI;
+
+test.skipIf(SKIP)(
+  `log_event.sh foreground latency: p95 over ${RUNS} runs is <= 20ms`,
+  () => {
+    const root = mkdtempSync(path.join(tmpdir(), "log-event-bench-"));
+    const samples: number[] = [];
+    try {
+      for (let i = 0; i < RUNS; i++) {
+        const start = process.hrtime.bigint();
+        const res = spawnSync("bash", [SCRIPT, "bench_event"], {
+          cwd: root,
+          env: { ...process.env, CLAUDE_PROJECT_DIR: root },
+          input: '{"sample":true}\n'
+        });
+        const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
+        expect(res.status).toBe(0);
+        samples.push(elapsedMs);
+      }
+      samples.sort((a, b) => a - b);
+      const p50 = percentile(samples, 0.5);
+      const p95 = percentile(samples, 0.95);
+      console.log(`log_event.sh foreground p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
+      if (IS_WINDOWS) {
+        // Windows/Cygwin bash cold start floor is ~57ms; assert only that
+        // the async-fire actually helped (p95 < synchronous baseline of ~337ms).
+        console.log("(Windows: skipping <=20ms p95 assertion; Cygwin bash floor ~57ms)");
+        expect(p95 < 300).toBeTruthy();
+      } else {
+        expect(p95 <= 20).toBeTruthy();
+      }
+    } finally {
+      rmSync(root, { recursive: true, force: true });
     }
-  } finally {
-    rmSync(root, { recursive: true, force: true });
-  }
-});
+  },
+  60000
+);
diff --git a/crew/tests/memory-drift-check.test.mts b/crew/tests/memory-drift-check.test.mts
index 3494cbe0..004857f5 100644
--- a/crew/tests/memory-drift-check.test.mts
+++ b/crew/tests/memory-drift-check.test.mts
@@ -1,17 +1,16 @@
-// tests/memory-drift-check.test.ts
+// tests/memory-drift-check.test.mts
 // FEAT-188 S5 AC coverage: drift-detection diagnostic (S4 accepted-risk
 // follow-up). astramem writes are fire-and-forget, so the JSONL "derived
 // duplicate" can be more complete than the astramem "source of truth" —
 // checkDrift() compares the two (read-only, never writes to astramem).
 //
 // Uses a pure in-memory fake RemoteHandle (same pattern as
-// tests/memory-provider-astramem.test.ts's makeFakeWireDaemon) — no real
+// tests/memory-provider-astramem.test.mts's makeFakeWireDaemon) — no real
 // socket, no http.Server.
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { checkDrift } from "../scripts/lib/memory/drift-check.mjs";
 import { fileProvider, type RemoteHandle } from "@astragenie/memory-provider";
 import type { RecallHit } from "@astragenie/astramem-plugin/contracts";
@@ -60,11 +59,11 @@ test("checkDrift reports a JSONL entry that astramem does not know about", async
     const remote = makeFakeRemote(new Set()); // astramem knows nothing
     const report = await checkDrift(repo, remote);
 
-    assert.equal(report.checked, 1);
-    assert.ok(
+    expect(report.checked).toBe(1);
+    expect(
       report.missingFromAstramem.some((e) => e.id === "only-local-marker"),
       "an entry astramem cannot confirm must be reported as drift"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -85,11 +84,11 @@ test("checkDrift does not report an entry astramem confirms present", async () =
     const remote = makeFakeRemote(new Set(["present-marker"]));
     const report = await checkDrift(repo, remote);
 
-    assert.equal(report.checked, 1);
-    assert.ok(
+    expect(report.checked).toBe(1);
+    expect(
       !report.missingFromAstramem.some((e) => e.id === "present-marker"),
       "an entry astramem confirms present must not be reported as drift"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -112,8 +111,8 @@ test("checkDrift only considers entries inside the configured window", async ()
     const remote = makeFakeRemote(new Set());
     const report = await checkDrift(repo, remote, { windowDays: 45 });
 
-    assert.equal(report.checked, 0, "an entry older than the window should not be checked at all");
-    assert.ok(!report.missingFromAstramem.some((e) => e.id === "outside-window"));
+    expect(report.checked, "an entry older than the window should not be checked at all").toBe(0);
+    expect(!report.missingFromAstramem.some((e) => e.id === "outside-window")).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -148,7 +147,7 @@ test("checkDrift never writes to astramem — it is a read-only diagnostic", asy
     };
 
     await checkDrift(repo, remote);
-    assert.equal(rememberCalls, 0, "checkDrift must never call remember() — diagnostic only");
+    expect(rememberCalls, "checkDrift must never call remember() — diagnostic only").toBe(0);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/memory-handoff-credit.test.mts b/crew/tests/memory-handoff-credit.test.mts
index 2b20b532..ef428409 100644
--- a/crew/tests/memory-handoff-credit.test.mts
+++ b/crew/tests/memory-handoff-credit.test.mts
@@ -1,4 +1,4 @@
-// tests/memory-handoff-credit.test.ts — orchestrator-side crediting for the
+// tests/memory-handoff-credit.test.mts — orchestrator-side crediting for the
 // OPTIONAL `memories_used` handoff field (dispatch-memory-credit-loop,
 // runner-plugin upstream request 2026-07-16). Covers: happy-path batch
 // credit, the memory.feedback.creditLoop.enabled kill-switch, malformed/
@@ -7,8 +7,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { creditMemoriesUsed } from "../scripts/lib/memory/handoff-credit.mjs";
 import type { ProfileCapableProvider } from "../scripts/lib/memory/profile-types.mjs";
 
@@ -35,8 +34,8 @@ test("credits every reported id via feedback(id, {used:true}) when creditLoop.en
       rawConfig: { feedback: { creditLoop: { enabled: true } } },
       provider: recordingProvider(sink)
     });
-    assert.deepEqual(r.credited.sort(), ["a", "b"]);
-    assert.deepEqual(sink.sort(), [
+    expect(r.credited.sort()).toEqual(["a", "b"]);
+    expect(sink.sort()).toEqual([
       ["a", true],
       ["b", true]
     ]);
@@ -55,8 +54,8 @@ test("no-ops when memory.creditLoop.enabled is false (default) — the dedicated
       rawConfig: {},
       provider: recordingProvider(sink)
     });
-    assert.deepEqual(r.credited, []);
-    assert.deepEqual(sink, []);
+    expect(r.credited).toEqual([]);
+    expect(sink).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -73,7 +72,7 @@ test("global memory.enabled:'never' wins even when creditLoop.enabled is true",
       // which resolves to noopProvider() (no feedback() method) when
       // captureEnabled is false.
     });
-    assert.deepEqual(r.credited, []);
+    expect(r.credited).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -86,9 +85,9 @@ test("absent/empty ids credit nothing, never throw", async () => {
     const provider = recordingProvider(sink);
     const r1 = await creditMemoriesUsed({ repoPath: repo, ids: undefined, provider });
     const r2 = await creditMemoriesUsed({ repoPath: repo, ids: [], provider });
-    assert.deepEqual(r1.credited, []);
-    assert.deepEqual(r2.credited, []);
-    assert.deepEqual(sink, []);
+    expect(r1.credited).toEqual([]);
+    expect(r2.credited).toEqual([]);
+    expect(sink).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -104,7 +103,7 @@ test("malformed ids (non-string entries, blanks) are dropped silently, valid one
       rawConfig: { feedback: { creditLoop: { enabled: true } } },
       provider: recordingProvider(sink)
     });
-    assert.deepEqual(r.credited.sort(), ["a", "b"]);
+    expect(r.credited.sort()).toEqual(["a", "b"]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -121,7 +120,7 @@ test("bounds the credit batch at 20 ids even when more are reported", async () =
       rawConfig: { feedback: { creditLoop: { enabled: true } } },
       provider: recordingProvider(sink)
     });
-    assert.equal(r.credited.length, 20);
+    expect(r.credited.length).toBe(20);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -136,7 +135,7 @@ test("provider lacking feedback() resolves to a no-op, never throws", async () =
       rawConfig: { feedback: { creditLoop: { enabled: true } } },
       provider: {}
     });
-    assert.deepEqual(r.credited, []);
+    expect(r.credited).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -157,7 +156,7 @@ test("fail-silent: a throwing feedback() for one id never rejects and does not b
       rawConfig: { feedback: { creditLoop: { enabled: true } } },
       provider: flaky
     });
-    assert.deepEqual(r.credited, ["good"]);
+    expect(r.credited).toEqual(["good"]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/memory-handoff-digest.test.mts b/crew/tests/memory-handoff-digest.test.mts
index a977a729..f7a4beea 100644
--- a/crew/tests/memory-handoff-digest.test.mts
+++ b/crew/tests/memory-handoff-digest.test.mts
@@ -1,4 +1,4 @@
-// tests/memory-handoff-digest.test.ts — dispatch-memory-credit-loop digest
+// tests/memory-handoff-digest.test.mts — dispatch-memory-credit-loop digest
 // (runner-plugin upstream request 2026-07-16). Covers: byte-identical
 // behavior to buildProfileBlock when memory.feedback.creditLoop.enabled is
 // false (default), id-carrying recall hits appended when enabled, the k<=5
@@ -8,12 +8,11 @@
 // Config lives at `memory.feedback.creditLoop.*`, not a bare top-level
 // `memory.creditLoop` — @astragenie/memory-provider's MemoryConfigSchema is
 // `.strict()` at the top level; only `profile`/`feedback` are declared
-// passthrough extension namespaces (see handoff-digest.ts's header).
+// passthrough extension namespaces (see handoff-digest.mts's header).
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { buildHandoffDigest, parseCreditLoopConfig } from "../scripts/lib/memory/handoff-digest.mjs";
 import { buildProfileBlock } from "../scripts/lib/memory/inject-profile.mjs";
 import { fileProvider } from "@astragenie/memory-provider";
@@ -71,22 +70,22 @@ function fakeProvider(profile: AgentProfile | null): ProfileCapableProvider {
 }
 
 test("parseCreditLoopConfig defaults to disabled, k=5, on absent/malformed config", () => {
-  assert.deepEqual(parseCreditLoopConfig(undefined), { enabled: false, k: 5 });
-  assert.deepEqual(parseCreditLoopConfig({ feedback: { creditLoop: "nonsense" } }), {
+  expect(parseCreditLoopConfig(undefined)).toEqual({ enabled: false, k: 5 });
+  expect(parseCreditLoopConfig({ feedback: { creditLoop: "nonsense" } })).toEqual({
     enabled: false,
     k: 5
   });
   // A bare top-level `creditLoop` (not nested under `feedback`) is ignored,
   // not honored — proves the nesting requirement is load-bearing, not
   // incidental.
-  assert.deepEqual(parseCreditLoopConfig({ creditLoop: { enabled: true } }), {
+  expect(parseCreditLoopConfig({ creditLoop: { enabled: true } })).toEqual({
     enabled: false,
     k: 5
   });
 });
 
 test("parseCreditLoopConfig hard-caps k at 5 even when a larger value is configured", () => {
-  assert.deepEqual(parseCreditLoopConfig({ feedback: { creditLoop: { enabled: true, k: 100 } } }), {
+  expect(parseCreditLoopConfig({ feedback: { creditLoop: { enabled: true, k: 100 } } })).toEqual({
     enabled: true,
     k: 5
   });
@@ -111,9 +110,9 @@ test("buildHandoffDigest is byte-identical to buildProfileBlock when creditLoop.
       provider
     });
 
-    assert.equal(digest.block, direct.block);
-    assert.deepEqual(digest.ids.sort(), direct.injectedIds.sort());
-    assert.doesNotMatch(digest.block, /Recall \(memory credit loop\)/);
+    expect(digest.block).toBe(direct.block);
+    expect(digest.ids.sort()).toEqual(direct.injectedIds.sort());
+    expect(digest.block).not.toMatch(/Recall \(memory credit loop\)/);
   } finally {
     await cleanup(repo);
   }
@@ -136,10 +135,10 @@ test("buildHandoffDigest appends an id-carrying recall block when creditLoop.ena
       rawConfig
     });
 
-    assert.match(digest.block, /## Recall \(memory credit loop\)/);
-    assert.match(digest.block, /credit-loop recall hit/);
-    assert.match(digest.block, /<!--atom:[^>]+-->/);
-    assert.ok(digest.ids.length > 0, "recall hit id must be surfaced in ids");
+    expect(digest.block).toMatch(/## Recall \(memory credit loop\)/);
+    expect(digest.block).toMatch(/credit-loop recall hit/);
+    expect(digest.block).toMatch(/<!--atom:[^>]+-->/);
+    expect(digest.ids.length > 0, "recall hit id must be surfaced in ids").toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -162,7 +161,7 @@ test("buildHandoffDigest hard-caps recall hits at 5 even when more entries match
     const recallLines = digest.block
       .split("\n")
       .filter((l) => l.startsWith("- **[") && l.includes("hit-"));
-    assert.ok(recallLines.length <= 5, `expected <=5 recall lines, got ${recallLines.length}`);
+    expect(recallLines.length <= 5, `expected <=5 recall lines, got ${recallLines.length}`).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -187,8 +186,8 @@ test("global memory.enabled:'never' wins over profile.enabled + creditLoop.enabl
     // No provider override here: exercise the real resolveProvider() gate
     // (noopProvider lacks profile()/feedback ()), not a test double.
     const digest = await buildHandoffDigest({ repoPath: repo, agent: "crew:reviewer", rawConfig });
-    assert.equal(digest.block, "");
-    assert.deepEqual(digest.ids, []);
+    expect(digest.block).toBe("");
+    expect(digest.ids).toEqual([]);
   } finally {
     await cleanup(repo);
   }
@@ -199,7 +198,7 @@ test("buildHandoffDigest is fail-silent when recall fails to parse — profile h
   try {
     const rawConfig = {
       // An unknown provider value is a hard Zod error inside parseMemoryConfig
-      // (see memory-inject-recall.test.ts's identical guard case) —
+      // (see memory-inject-recall.test.mts's identical guard case) —
       // recallEntries swallows it internally and returns [], and the profile
       // half (explicit provider override, bypassing resolveProvider
       // entirely) must still render regardless.
@@ -216,8 +215,8 @@ test("buildHandoffDigest is fail-silent when recall fails to parse — profile h
       provider
     });
 
-    assert.match(digest.block, /## Your track record \(crew:reviewer\)/);
-    assert.doesNotMatch(digest.block, /Recall \(memory credit loop\)/);
+    expect(digest.block).toMatch(/## Your track record \(crew:reviewer\)/);
+    expect(digest.block).not.toMatch(/Recall \(memory credit loop\)/);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/memory-inject-profile.test.mts b/crew/tests/memory-inject-profile.test.mts
index c0efb948..a28cc101 100644
--- a/crew/tests/memory-inject-profile.test.mts
+++ b/crew/tests/memory-inject-profile.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -24,14 +23,13 @@ function emptyProfile(agent: string): AgentProfile {
 }
 
 test("formatProfileBlock returns '' when profile has no lessons/decisions/corrections", () => {
-  assert.equal(
+  expect(
     formatProfileBlock(emptyProfile("crew:reviewer"), {
       agent: "crew:reviewer",
       maxChars: 1600,
       usefulnessWarm: true
-    }),
-    ""
-  );
+    })
+  ).toBe("");
 });
 
 test("formatProfileBlock orders corrections, then decisions, then lessons; each line carries an atom marker", () => {
@@ -59,13 +57,13 @@ test("formatProfileBlock orders corrections, then decisions, then lessons; each
     maxChars: 1600,
     usefulnessWarm: true
   });
-  assert.match(out, /^## Your track record \(crew:reviewer\)/);
+  expect(out).toMatch(/^## Your track record \(crew:reviewer\)/);
   const iC = out.indexOf("Missed a null check"),
     iD = out.indexOf("Use single-id feedback"),
     iL = out.indexOf("Prefer fail-silent recall");
-  assert.ok(iC < iD && iD < iL, "corrections < decisions < lessons");
-  assert.match(out, /<!--atom:c1-->/);
-  assert.match(out, /<!--atom:l1-->/);
+  expect(iC < iD && iD < iL, "corrections < decisions < lessons").toBeTruthy();
+  expect(out).toMatch(/<!--atom:c1-->/);
+  expect(out).toMatch(/<!--atom:l1-->/);
 });
 
 test("formatProfileBlock labels lessons 'importance-ranked' when usefulness signal is cold", () => {
@@ -75,8 +73,8 @@ test("formatProfileBlock labels lessons 'importance-ranked' when usefulness sign
   ];
   const warm = formatProfileBlock(p, { agent: "a", maxChars: 1600, usefulnessWarm: true });
   const cold = formatProfileBlock(p, { agent: "a", maxChars: 1600, usefulnessWarm: false });
-  assert.match(cold, /importance-ranked/i);
-  assert.doesNotMatch(warm, /importance-ranked/i);
+  expect(cold).toMatch(/importance-ranked/i);
+  expect(warm).not.toMatch(/importance-ranked/i);
 });
 
 test("formatProfileBlock truncates to maxChars deterministically (keeps corrections first)", () => {
@@ -101,28 +99,28 @@ test("formatProfileBlock truncates to maxChars deterministically (keeps correcti
     created_at: i
   }));
   const out = formatProfileBlock(p, { agent: "a", maxChars: 120, usefulnessWarm: false });
-  assert.ok(out.length <= 120, `len ${out.length}`);
-  assert.match(out, /KEEP-CORRECTION/);
+  expect(out.length <= 120, `len ${out.length}`).toBeTruthy();
+  expect(out).toMatch(/KEEP-CORRECTION/);
 });
 
 test("parseProfileConfig defaults to disabled with safe values when memory/profile absent", () => {
   const c = parseProfileConfig(undefined);
-  assert.equal(c.enabled, false);
-  assert.equal(c.topLessons, 10);
-  assert.equal(c.maxTokens, 400);
-  assert.equal(c.minFeedbackSample, 5);
+  expect(c.enabled).toBe(false);
+  expect(c.topLessons).toBe(10);
+  expect(c.maxTokens).toBe(400);
+  expect(c.minFeedbackSample).toBe(5);
 });
 
 test("parseProfileConfig reads memory.profile overrides and coerces types", () => {
   const c = parseProfileConfig({
     profile: { enabled: true, topLessons: 3, maxTokens: 200, minFeedbackSample: 2 }
   });
-  assert.deepEqual(c, { enabled: true, topLessons: 3, maxTokens: 200, minFeedbackSample: 2 });
+  expect(c).toEqual({ enabled: true, topLessons: 3, maxTokens: 200, minFeedbackSample: 2 });
 });
 
 test("parseProfileConfig treats malformed profile block as disabled defaults (never throws)", () => {
   const c = parseProfileConfig({ profile: "nonsense" });
-  assert.equal(c.enabled, false);
+  expect(c.enabled).toBe(false);
 });
 
 async function tmpRepo(p: string) {
@@ -180,8 +178,8 @@ test("buildProfileBlock returns empty block + [] when profile.enabled is false (
       rawConfig: {},
       provider: fakeProvider(warmProfile("crew:reviewer"))
     });
-    assert.equal(r.block, "");
-    assert.deepEqual(r.injectedIds, []);
+    expect(r.block).toBe("");
+    expect(r.injectedIds).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -196,8 +194,8 @@ test("buildProfileBlock returns block + injectedIds when enabled and provider yi
       rawConfig: { profile: { enabled: true } },
       provider: fakeProvider(warmProfile("crew:reviewer"))
     });
-    assert.match(r.block, /## Your track record \(crew:reviewer\)/);
-    assert.deepEqual(r.injectedIds.sort(), ["c1", "l1"]);
+    expect(r.block).toMatch(/## Your track record \(crew:reviewer\)/);
+    expect(r.injectedIds.sort()).toEqual(["c1", "l1"]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -212,8 +210,8 @@ test("buildProfileBlock is fail-silent: provider without profile() method yields
       rawConfig: { profile: { enabled: true } },
       provider: {}
     });
-    assert.equal(r.block, "");
-    assert.deepEqual(r.injectedIds, []);
+    expect(r.block).toBe("");
+    expect(r.injectedIds).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -233,7 +231,7 @@ test("buildProfileBlock is fail-silent: a throwing provider yields empty block,
       rawConfig: { profile: { enabled: true } },
       provider: throwing
     });
-    assert.equal(r.block, "");
+    expect(r.block).toBe("");
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -252,7 +250,7 @@ test("buildProfileBlock labels lessons importance-ranked until minFeedbackSample
       rawConfig: { profile: { enabled: true, minFeedbackSample: 5 } },
       provider: fakeProvider(cold)
     });
-    assert.match(r.block, /importance-ranked/i);
+    expect(r.block).toMatch(/importance-ranked/i);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/memory-inject-recall.test.mts b/crew/tests/memory-inject-recall.test.mts
index 4308a0ff..0703dcad 100644
--- a/crew/tests/memory-inject-recall.test.mts
+++ b/crew/tests/memory-inject-recall.test.mts
@@ -14,8 +14,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   buildRecallBlock,
   injectRecall,
@@ -44,14 +43,14 @@ async function writeLoopConfig(repo: string, memory: unknown) {
 }
 
 test("formatRecallBlock returns empty string for zero entries (no header, no whitespace)", () => {
-  assert.equal(formatRecallBlock([]), "");
+  expect(formatRecallBlock([])).toBe("");
 });
 
 test("loadMemoryConfig returns undefined when .claude/loop.json is missing", async () => {
   const repo = await makeTempRepo("inject-recall-no-config-");
   try {
     const config = await loadMemoryConfig(repo);
-    assert.equal(config, undefined);
+    expect(config).toBe(undefined);
   } finally {
     await cleanup(repo);
   }
@@ -64,7 +63,7 @@ test("loadMemoryConfig returns undefined on malformed JSON (never throws)", asyn
     await fs.mkdir(path.dirname(target), { recursive: true });
     await fs.writeFile(target, "{ not json", "utf8");
     const config = await loadMemoryConfig(repo);
-    assert.equal(config, undefined);
+    expect(config).toBe(undefined);
   } finally {
     await cleanup(repo);
   }
@@ -75,7 +74,7 @@ test("injectRecall is byte-identical to input when no memory config exists (prov
   try {
     const dispatchText = "Build the thing. Do the work.";
     const result = await injectRecall(dispatchText, { repoPath: repo });
-    assert.equal(result, dispatchText);
+    expect(result).toBe(dispatchText);
   } finally {
     await cleanup(repo);
   }
@@ -96,7 +95,7 @@ test("injectRecall is byte-identical to input when recall.enabled:false (even wi
 
     const dispatchText = "Fix the bug.";
     const result = await injectRecall(dispatchText, { repoPath: repo });
-    assert.equal(result, dispatchText);
+    expect(result).toBe(dispatchText);
   } finally {
     await cleanup(repo);
   }
@@ -117,12 +116,15 @@ test("injectRecall appends the bridge-format block when provider:file and entrie
     const dispatchText = "Implement the feature.";
     const result = await injectRecall(dispatchText, { repoPath: repo, tags: ["stack:typescript"] });
 
-    assert.ok(result.startsWith(dispatchText), "original dispatch text is preserved verbatim");
-    assert.ok(
+    expect(
+      result.startsWith(dispatchText),
+      "original dispatch text is preserved verbatim"
+    ).toBeTruthy();
+    expect(
       result.includes("## Prior context (from astramem)"),
       "reuses the bridge's existing header, not a rival format"
-    );
-    assert.ok(result.includes("review rejected: missing null guard"));
+    ).toBeTruthy();
+    expect(result.includes("review rejected: missing null guard")).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -141,7 +143,7 @@ test("buildRecallBlock scopes by agent — entries for a different agent are exc
     await writeLoopConfig(repo, { provider: "file" });
 
     const block = await buildRecallBlock({ repoPath: repo, agent: "crew:frontend-dev" });
-    assert.equal(block, "", "entry scoped to a different agent must not leak into this recall");
+    expect(block, "entry scoped to a different agent must not leak into this recall").toBe("");
   } finally {
     await cleanup(repo);
   }
@@ -163,10 +165,10 @@ test("buildRecallBlock respects recall.maxTokens (token-budget truncation)", asy
 
     const block = await buildRecallBlock({ repoPath: repo });
     const lineCount = block.length === 0 ? 0 : block.split("\n").length - 1; // minus header line
-    assert.ok(
+    expect(
       lineCount <= 1,
       `expected <=1 recalled line under a tight token budget, got ${lineCount}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -181,7 +183,7 @@ test("injectRecall degrades to the input text unchanged when the provider throws
 
     const dispatchText = "Ship it.";
     const result = await injectRecall(dispatchText, { repoPath: repo });
-    assert.equal(result, dispatchText);
+    expect(result).toBe(dispatchText);
   } finally {
     await cleanup(repo);
   }
@@ -209,19 +211,15 @@ test("buildRecallBlock forwards the configured project to the wire provider when
 
     try {
       const block = await buildRecallBlock({ repoPath: repo, agent: "crew:fullstack-dev" });
-      assert.ok(capturedReq, "wire provider recall() must have been called directly");
-      assert.equal(
-        capturedReq?.project,
-        "dev-team",
-        "project falls back from config.memory.project"
+      expect(capturedReq, "wire provider recall() must have been called directly").toBeTruthy();
+      expect(capturedReq?.project, "project falls back from config.memory.project").toBe(
+        "dev-team"
       );
-      assert.equal(
-        capturedReq?.agent,
-        "crew:fullstack-dev",
-        "agent scope still reaches the wire call"
+      expect(capturedReq?.agent, "agent scope still reaches the wire call").toBe(
+        "crew:fullstack-dev"
       );
-      assert.match(block, /## Prior context \(from astramem\)/);
-      assert.match(block, /scoped memory hit/);
+      expect(block).toMatch(/## Prior context \(from astramem\)/);
+      expect(block).toMatch(/scoped memory hit/);
     } finally {
       _setWireProvider(null);
       _resetResolveCache();
@@ -253,7 +251,7 @@ test("buildRecallBlock prefers an explicit project override over the configured
 
     try {
       await buildRecallBlock({ repoPath: repo, project: "runner-plugin" });
-      assert.equal(capturedReq?.project, "runner-plugin");
+      expect(capturedReq?.project).toBe("runner-plugin");
     } finally {
       _setWireProvider(null);
       _resetResolveCache();
@@ -281,11 +279,10 @@ test("buildRecallBlock falls back to the standard agent/tag path when astramem i
 
     try {
       const block = await buildRecallBlock({ repoPath: repo });
-      assert.match(
+      expect(
         block,
-        /fallback lesson visible without project scoping/,
         "project scoping being unavailable must not suppress the standard recall path"
-      );
+      ).toMatch(/fallback lesson visible without project scoping/);
     } finally {
       _resetResolveCache();
     }
@@ -320,12 +317,11 @@ test("buildRecallBlock does not forward a project filter when none is configured
       // dualWrite:false) still reaches the wire for agent/tag scoping, but
       // must never leak an implicit project filter onto that request.
       await buildRecallBlock({ repoPath: repo });
-      assert.ok(capturedReq, "generic recall path still reaches the wire when paired");
-      assert.equal(
+      expect(capturedReq, "generic recall path still reaches the wire when paired").toBeTruthy();
+      expect(
         capturedReq?.project,
-        undefined,
         "no project scope should be present on the wire request when unconfigured"
-      );
+      ).toBe(undefined);
     } finally {
       _setWireProvider(null);
       _resetResolveCache();
diff --git a/crew/tests/memory-injected-atoms.test.mts b/crew/tests/memory-injected-atoms.test.mts
index a1f10160..1863d045 100644
--- a/crew/tests/memory-injected-atoms.test.mts
+++ b/crew/tests/memory-injected-atoms.test.mts
@@ -2,8 +2,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { writeInjectedAtoms, readInjectedAtoms } from "../scripts/lib/memory/injected-atoms.mjs";
 
 async function tmp(p: string) {
@@ -15,8 +14,8 @@ test("round-trips ids under .claude/state/crew/injected-atoms/<runId>.json", asy
   try {
     await writeInjectedAtoms(repo, "run-1", ["a", "b", "c"]);
     const target = path.join(repo, ".claude", "state", "crew", "injected-atoms", "run-1.json");
-    assert.ok(await fs.stat(target));
-    assert.deepEqual(await readInjectedAtoms(repo, "run-1"), ["a", "b", "c"]);
+    expect(await fs.stat(target)).toBeTruthy();
+    expect(await readInjectedAtoms(repo, "run-1")).toEqual(["a", "b", "c"]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -25,7 +24,7 @@ test("round-trips ids under .claude/state/crew/injected-atoms/<runId>.json", asy
 test("readInjectedAtoms returns [] for a missing run (never throws)", async () => {
   const repo = await tmp("inj-atoms-missing-");
   try {
-    assert.deepEqual(await readInjectedAtoms(repo, "nope"), []);
+    expect(await readInjectedAtoms(repo, "nope")).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -35,7 +34,7 @@ test("writeInjectedAtoms is fire-and-forget: [] writes an empty list, never thro
   const repo = await tmp("inj-atoms-empty-");
   try {
     await writeInjectedAtoms(repo, "run-2", []);
-    assert.deepEqual(await readInjectedAtoms(repo, "run-2"), []);
+    expect(await readInjectedAtoms(repo, "run-2")).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -47,7 +46,7 @@ test("writeInjectedAtoms merges across split-builder calls under the same runId
     await writeInjectedAtoms(repo, "SLICE-NN", ["fe-1", "fe-2"]);
     await writeInjectedAtoms(repo, "SLICE-NN", ["be-1", "be-2"]);
     const ids = await readInjectedAtoms(repo, "SLICE-NN");
-    assert.deepEqual([...ids].sort(), ["be-1", "be-2", "fe-1", "fe-2"]);
+    expect([...ids].sort()).toEqual(["be-1", "be-2", "fe-1", "fe-2"]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -59,7 +58,7 @@ test("writeInjectedAtoms does not duplicate a repeated id across calls", async (
     await writeInjectedAtoms(repo, "run-3", ["a", "b"]);
     await writeInjectedAtoms(repo, "run-3", ["b", "c"]);
     const ids = await readInjectedAtoms(repo, "run-3");
-    assert.deepEqual([...ids].sort(), ["a", "b", "c"]);
+    expect([...ids].sort()).toEqual(["a", "b", "c"]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/memory-profile-feedback.test.mts b/crew/tests/memory-profile-feedback.test.mts
index e1c38458..a6a98f31 100644
--- a/crew/tests/memory-profile-feedback.test.mts
+++ b/crew/tests/memory-profile-feedback.test.mts
@@ -2,8 +2,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { submitOutcomeFeedback } from "../scripts/lib/memory/profile-feedback.mjs";
 import { writeInjectedAtoms } from "../scripts/lib/memory/injected-atoms.mjs";
 import type { ProfileCapableProvider } from "../scripts/lib/memory/profile-types.mjs";
@@ -32,8 +31,8 @@ test("credits every injected atom with used:true on PASS", async () => {
       rawConfig: { feedback: { enabled: true } },
       provider: recordingProvider(sink)
     });
-    assert.deepEqual(r.credited.sort(), ["a", "b"]);
-    assert.deepEqual(sink.sort(), [
+    expect(r.credited.sort()).toEqual(["a", "b"]);
+    expect(sink.sort()).toEqual([
       ["a", true],
       ["b", true]
     ]);
@@ -54,8 +53,8 @@ test("credits nothing on FAIL (positive-only signal)", async () => {
       rawConfig: { feedback: { enabled: true } },
       provider: recordingProvider(sink)
     });
-    assert.deepEqual(r.credited, []);
-    assert.deepEqual(sink, []);
+    expect(r.credited).toEqual([]);
+    expect(sink).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -73,8 +72,8 @@ test("no-ops when feedback.enabled is false (default)", async () => {
       rawConfig: {},
       provider: recordingProvider(sink)
     });
-    assert.deepEqual(r.credited, []);
-    assert.deepEqual(sink, []);
+    expect(r.credited).toEqual([]);
+    expect(sink).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -96,7 +95,7 @@ test("fail-silent: a throwing feedback() never rejects", async () => {
       rawConfig: { feedback: { enabled: true } },
       provider: throwing
     });
-    assert.deepEqual(r.credited, []);
+    expect(r.credited).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/memory-provider-astramem.test.mts b/crew/tests/memory-provider-astramem.test.mts
index 7fc80eff..3bc6abaa 100644
--- a/crew/tests/memory-provider-astramem.test.mts
+++ b/crew/tests/memory-provider-astramem.test.mts
@@ -30,8 +30,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { _resetResolveCache } from "@astragenie/astramem-client";
 import { astramemProvider, fileProvider, type RemoteHandle } from "@astragenie/memory-provider";
 
@@ -67,7 +66,7 @@ async function withUnpairedEnv<T>(fn: () => Promise<T>): Promise<T> {
 }
 
 test("astramemProvider describes itself as astramem", () => {
-  assert.deepEqual(astramemProvider("/tmp/whatever").describe(), { provider: "astramem" });
+  expect(astramemProvider("/tmp/whatever").describe()).toEqual({ provider: "astramem" });
 });
 
 test("astramemProvider falls back to fileProvider when unpaired (AC-2) — capture + recall never throw", async () => {
@@ -75,17 +74,15 @@ test("astramemProvider falls back to fileProvider when unpaired (AC-2) — captu
   try {
     await withUnpairedEnv(async () => {
       const provider = astramemProvider(repo);
-      await assert.doesNotReject(
-        provider.capture({
-          kind: "failure",
-          severity: "high",
-          summary: "unpaired capture should fall back to file",
-          source: "test"
-        })
-      );
+      await provider.capture({
+        kind: "failure",
+        severity: "high",
+        summary: "unpaired capture should fall back to file",
+        source: "test"
+      });
       const results = await provider.recall({ k: 5 });
-      assert.equal(results.length, 1);
-      assert.equal(results[0]!.summary, "unpaired capture should fall back to file");
+      expect(results.length).toBe(1);
+      expect(results[0]!.summary).toBe("unpaired capture should fall back to file");
     });
   } finally {
     await cleanup(repo);
@@ -128,12 +125,11 @@ test("astramemProvider contract-parity: recall() ranks/truncates identically to
       const astramemResults = await astramem.recall({ k: 5 });
       const fileResults = await file.recall({ k: 5 });
 
-      assert.deepEqual(
+      expect(
         astramemResults.map((r) => r.id),
-        fileResults.map((r) => r.id),
         "unpaired astramemProvider ranking must match fileProvider exactly"
-      );
-      assert.equal(astramemResults[0]!.id, "fresh-critical");
+      ).toEqual(fileResults.map((r) => r.id));
+      expect(astramemResults[0]!.id).toBe("fresh-critical");
     });
   } finally {
     await cleanup(repoA);
@@ -154,11 +150,11 @@ test("astramemProvider.invalidate excludes an entry from future recall() calls (
         source: "t"
       });
       let results = await provider.recall({ k: 5 });
-      assert.ok(results.some((r) => r.id === "bad-entry"));
+      expect(results.some((r) => r.id === "bad-entry")).toBeTruthy();
 
       await provider.invalidate("bad-entry");
       results = await provider.recall({ k: 5 });
-      assert.ok(!results.some((r) => r.id === "bad-entry"));
+      expect(!results.some((r) => r.id === "bad-entry")).toBeTruthy();
     });
   } finally {
     await cleanup(repo);
@@ -187,8 +183,8 @@ test("astramemProvider.supersede resolves the chain when unpaired — only the l
 
       const results = await provider.recall({ k: 5 });
       const ids = results.map((r) => r.id);
-      assert.ok(ids.includes("v2"));
-      assert.ok(!ids.includes("v1"));
+      expect(ids.includes("v2")).toBeTruthy();
+      expect(!ids.includes("v1")).toBeTruthy();
     });
   } finally {
     await cleanup(repo);
@@ -201,15 +197,13 @@ test("resolveProvider wires provider:astramem to astramemProvider (S2 hand-off)"
   try {
     await withUnpairedEnv(async () => {
       const provider = resolveProvider({ provider: "astramem", enabled: "auto" }, repo);
-      assert.deepEqual(provider.describe(), { provider: "astramem" });
-      await assert.doesNotReject(
-        provider.capture({
-          kind: "lesson",
-          severity: "low",
-          summary: "wired via resolveProvider",
-          source: "t"
-        })
-      );
+      expect(provider.describe()).toEqual({ provider: "astramem" });
+      await provider.capture({
+        kind: "lesson",
+        severity: "low",
+        summary: "wired via resolveProvider",
+        source: "t"
+      });
     });
   } finally {
     await cleanup(repo);
@@ -270,11 +264,10 @@ async function waitForRememberCalls(
     if (daemon.rememberCalls >= expected) return;
     await new Promise((resolve) => setTimeout(resolve, 10));
   }
-  assert.equal(
+  expect(
     daemon.rememberCalls,
-    expected,
     `remember() call count did not reach ${expected} within ${timeoutMs}ms`
-  );
+  ).toBe(expected);
 }
 
 test("astramemProvider (paired, dualWrite:true) writes BOTH the fake remote AND the local JSONL", async () => {
@@ -295,12 +288,11 @@ test("astramemProvider (paired, dualWrite:true) writes BOTH the fake remote AND
     await waitForRememberCalls(daemon, 1);
 
     const fileResults = await fileProvider(repo).recall({ k: 5 });
-    assert.equal(
+    expect(
       fileResults.length,
-      1,
       "dualWrite:true must also mirror the entry into the local JSONL"
-    );
-    assert.equal(fileResults[0]!.summary, "paired dual-write capture");
+    ).toBe(1);
+    expect(fileResults[0]!.summary).toBe("paired dual-write capture");
   } finally {
     await cleanup(repo);
   }
@@ -321,7 +313,7 @@ test("astramemProvider (paired, dualWrite:false) writes ONLY the fake remote —
     await waitForRememberCalls(daemon, 1);
 
     const fileResults = await fileProvider(repo).recall({ k: 5 });
-    assert.equal(fileResults.length, 0, "dualWrite:false must NOT mirror into the local JSONL");
+    expect(fileResults.length, "dualWrite:false must NOT mirror into the local JSONL").toBe(0);
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/memory-provider-config.test.mts b/crew/tests/memory-provider-config.test.mts
index 425969a0..73f66e12 100644
--- a/crew/tests/memory-provider-config.test.mts
+++ b/crew/tests/memory-provider-config.test.mts
@@ -2,15 +2,14 @@
 // FEAT-188 S2 AC coverage: the unified config schema/parser + enabled x
 // provider precedence rule. See docs/research/2026-07-06-memory-bridge-reconciliation.md
 // section 4 for the bridge-collision this schema resolves.
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { parseMemoryConfig, resolveEffectiveConfig } from "@astragenie/memory-provider";
 
 test("parseMemoryConfig defaults to provider:none when no memory block is given", () => {
   const config = parseMemoryConfig(undefined);
-  assert.equal(config.provider, "none");
-  assert.equal(config.enabled, "auto");
-  assert.equal(config.dualWrite, false);
+  expect(config.provider).toBe("none");
+  expect(config.enabled).toBe("auto");
+  expect(config.dualWrite).toBe(false);
 });
 
 test("parseMemoryConfig accepts the live bridge's existing keys (enabled, recall.k, recall.timeoutMs, project)", () => {
@@ -19,38 +18,38 @@ test("parseMemoryConfig accepts the live bridge's existing keys (enabled, recall
     project: "dev-team",
     recall: { k: 7, timeoutMs: 3000 }
   });
-  assert.equal(config.enabled, "auto");
-  assert.equal(config.project, "dev-team");
-  assert.equal(config.recall.k, 7);
-  assert.equal(config.recall.timeoutMs, 3000);
+  expect(config.enabled).toBe("auto");
+  expect(config.project).toBe("dev-team");
+  expect(config.recall.k).toBe(7);
+  expect(config.recall.timeoutMs).toBe(3000);
 });
 
 test("parseMemoryConfig rejects recall.topK as an unknown key", () => {
-  assert.throws(() =>
+  expect(() =>
     parseMemoryConfig({
       recall: { topK: 5 }
     })
-  );
+  ).toThrow();
 });
 
 test("parseMemoryConfig hard-errors on an unknown provider value", () => {
-  assert.throws(() => parseMemoryConfig({ provider: "redis" }));
+  expect(() => parseMemoryConfig({ provider: "redis" })).toThrow();
 });
 
 test("parseMemoryConfig accepts provider:file|astramem|none", () => {
   for (const provider of ["file", "astramem", "none"]) {
-    assert.doesNotThrow(() => parseMemoryConfig({ provider }));
+    expect(() => parseMemoryConfig({ provider })).not.toThrow();
   }
 });
 
 test("parseMemoryConfig parses and carries dualWrite", () => {
   const config = parseMemoryConfig({ provider: "astramem", dualWrite: true });
-  assert.equal(config.dualWrite, true);
+  expect(config.dualWrite).toBe(true);
 });
 
 test("parseMemoryConfig defaults dualWrite to false when absent", () => {
   const config = parseMemoryConfig({ provider: "astramem" });
-  assert.equal(config.dualWrite, false);
+  expect(config.dualWrite).toBe(false);
 });
 
 test("parseMemoryConfig accepts additive recall.maxTokens and capture.events", () => {
@@ -59,8 +58,8 @@ test("parseMemoryConfig accepts additive recall.maxTokens and capture.events", (
     recall: { maxTokens: 400 },
     capture: { events: ["slice_close"] }
   });
-  assert.equal(config.recall.maxTokens, 400);
-  assert.deepEqual(config.capture.events, ["slice_close"]);
+  expect(config.recall.maxTokens).toBe(400);
+  expect(config.capture.events).toEqual(["slice_close"]);
 });
 
 // --- enabled x provider precedence (AC-3) ---
@@ -68,22 +67,22 @@ test("parseMemoryConfig accepts additive recall.maxTokens and capture.events", (
 test("precedence: provider:none forces effective-disabled regardless of enabled", () => {
   const config = parseMemoryConfig({ provider: "none", enabled: "auto" });
   const effective = resolveEffectiveConfig(config);
-  assert.equal(effective.captureEnabled, false);
-  assert.equal(effective.recallEnabled, false);
+  expect(effective.captureEnabled).toBe(false);
+  expect(effective.recallEnabled).toBe(false);
 });
 
 test("precedence: enabled:never disables emit/recall regardless of provider", () => {
   const config = parseMemoryConfig({ provider: "file", enabled: "never" });
   const effective = resolveEffectiveConfig(config);
-  assert.equal(effective.captureEnabled, false);
-  assert.equal(effective.recallEnabled, false);
+  expect(effective.captureEnabled).toBe(false);
+  expect(effective.recallEnabled).toBe(false);
 });
 
 test("precedence: provider:file|astramem with enabled:auto is active", () => {
   for (const provider of ["file", "astramem"]) {
     const config = parseMemoryConfig({ provider, enabled: "auto" });
     const effective = resolveEffectiveConfig(config);
-    assert.equal(effective.captureEnabled, true, `provider=${provider} should be capture-enabled`);
+    expect(effective.captureEnabled, `provider=${provider} should be capture-enabled`).toBe(true);
   }
 });
 
@@ -94,12 +93,12 @@ test("precedence: recall.enabled:false disables recall only, capture stays enabl
     recall: { enabled: false }
   });
   const effective = resolveEffectiveConfig(config);
-  assert.equal(effective.captureEnabled, true);
-  assert.equal(effective.recallEnabled, false);
+  expect(effective.captureEnabled).toBe(true);
+  expect(effective.recallEnabled).toBe(false);
 });
 
 test("effective config carries dualWrite through untouched", () => {
   const config = parseMemoryConfig({ provider: "astramem", dualWrite: true });
   const effective = resolveEffectiveConfig(config);
-  assert.equal(effective.dualWrite, true);
+  expect(effective.dualWrite).toBe(true);
 });
diff --git a/crew/tests/memory-provider-decay.test.mts b/crew/tests/memory-provider-decay.test.mts
index 8a2e59e4..ed730033 100644
--- a/crew/tests/memory-provider-decay.test.mts
+++ b/crew/tests/memory-provider-decay.test.mts
@@ -7,8 +7,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { fileProvider } from "@astragenie/memory-provider";
 
 async function makeTempRepo(prefix: string) {
@@ -37,10 +36,10 @@ test("recall() excludes a non-critical entry older than 45 days", async () => {
     });
 
     const results = await provider.recall({ k: 10 });
-    assert.ok(
+    expect(
       !results.some((r) => r.id === "stale-high"),
       "an entry older than 45 days and not critical must be excluded from recall()"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -60,10 +59,10 @@ test("recall() includes a non-critical entry that is exactly within the 45-day w
     });
 
     const results = await provider.recall({ k: 10 });
-    assert.ok(
+    expect(
       results.some((r) => r.id === "fresh-enough"),
       "an entry within the 45-day window must still be recallable"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -83,10 +82,10 @@ test("recall() never decays a `critical` entry regardless of age", async () => {
     });
 
     const results = await provider.recall({ k: 10 });
-    assert.ok(
+    expect(
       results.some((r) => r.id === "ancient-critical"),
       "a `critical` entry must never be excluded by decay, no matter how old"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -113,8 +112,11 @@ test("recall() never returns a superseded entry even when it is fresh (age is no
 
     const results = await provider.recall({ k: 10 });
     const ids = results.map((r) => r.id);
-    assert.ok(!ids.includes("v1"), "superseded entries are excluded even when fresh + critical");
-    assert.ok(ids.includes("v2"));
+    expect(
+      !ids.includes("v1"),
+      "superseded entries are excluded even when fresh + critical"
+    ).toBeTruthy();
+    expect(ids.includes("v2")).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -135,10 +137,10 @@ test("recall() never returns an invalidated entry even when it is `critical` and
     await provider.invalidate("ancient-critical-bad");
 
     const results = await provider.recall({ k: 10 });
-    assert.ok(
+    expect(
       !results.some((r) => r.id === "ancient-critical-bad"),
       "invalidate() must exclude an entry regardless of severity or age"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/memory-provider-file.test.mts b/crew/tests/memory-provider-file.test.mts
index 07a8b135..9da44eec 100644
--- a/crew/tests/memory-provider-file.test.mts
+++ b/crew/tests/memory-provider-file.test.mts
@@ -5,8 +5,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { fileProvider } from "@astragenie/memory-provider";
 import { captureFailureLearning } from "../scripts/lib/memory/capture-learning.mjs";
 
@@ -23,7 +22,7 @@ function learningsPath(repo: string) {
 }
 
 test("fileProvider describes itself as file", () => {
-  assert.deepEqual(fileProvider("/tmp/whatever").describe(), { provider: "file" });
+  expect(fileProvider("/tmp/whatever").describe()).toEqual({ provider: "file" });
 });
 
 test("fileProvider.capture appends a JSONL row that recall() can read back", async () => {
@@ -38,10 +37,10 @@ test("fileProvider.capture appends a JSONL row that recall() can read back", asy
       source: "review_fail"
     });
     const results = await provider.recall({ k: 5 });
-    assert.equal(results.length, 1);
-    assert.equal(results[0]!.summary, "review rejected: missing null guard");
-    assert.equal(results[0]!.severity, "high");
-    assert.ok(results[0]!.id, "capture assigns an id when the caller omits one");
+    expect(results.length).toBe(1);
+    expect(results[0]!.summary).toBe("review rejected: missing null guard");
+    expect(results[0]!.severity).toBe("high");
+    expect(results[0]!.id, "capture assigns an id when the caller omits one").toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -60,7 +59,7 @@ test("fileProvider.capture writes into the SAME store S1a's captureFailureLearni
     });
     const raw = await fs.readFile(learningsPath(repo), "utf8");
     const lines = raw.split("\n").filter((l) => l.trim().length > 0);
-    assert.equal(lines.length, 2, "both writers append to the same file");
+    expect(lines.length, "both writers append to the same file").toBe(2);
   } finally {
     await cleanup(repo);
   }
@@ -75,8 +74,8 @@ test("fileProvider.recall discards a torn (corrupt) trailing line instead of thr
     await fs.appendFile(learningsPath(repo), '{"kind":"failure","ts":"2026-0', "utf8");
 
     const results = await provider.recall({ k: 5 });
-    assert.equal(results.length, 1);
-    assert.equal(results[0]!.summary, "good row");
+    expect(results.length).toBe(1);
+    expect(results[0]!.summary).toBe("good row");
   } finally {
     await cleanup(repo);
   }
@@ -93,9 +92,9 @@ test("fileProvider.recall includes legacy S1a-shape rows (kind/ts/agent/severity
     });
     const provider = fileProvider(repo);
     const results = await provider.recall({ k: 5 });
-    assert.equal(results.length, 1);
-    assert.equal(results[0]!.summary, "legacy S1a row");
-    assert.equal(results[0]!.kind, "failure");
+    expect(results.length).toBe(1);
+    expect(results[0]!.summary).toBe("legacy S1a row");
+    expect(results[0]!.kind).toBe("failure");
   } finally {
     await cleanup(repo);
   }
@@ -119,9 +118,9 @@ test("fileProvider.recall includes pre-S1a legacy rows (id/timestamp/key/insight
     );
     const provider = fileProvider(repo);
     const results = await provider.recall({ k: 5 });
-    assert.equal(results.length, 1);
-    assert.equal(results[0]!.summary, "grades kept the unfilled placeholder bullet");
-    assert.deepEqual(results[0]!.tags, ["grade-template-rot"]);
+    expect(results.length).toBe(1);
+    expect(results[0]!.summary).toBe("grades kept the unfilled placeholder bullet");
+    expect(results[0]!.tags).toEqual(["grade-template-rot"]);
   } finally {
     await cleanup(repo);
   }
@@ -153,7 +152,7 @@ test("fileProvider.recall ranks by recency x severity (higher severity + more re
     });
 
     const results = await provider.recall({ k: 5 });
-    assert.equal(results[0]!.id, "fresh-critical", "fresh+critical should outrank old+low");
+    expect(results[0]!.id, "fresh+critical should outrank old+low").toBe("fresh-critical");
   } finally {
     await cleanup(repo);
   }
@@ -175,10 +174,10 @@ test("fileProvider.recall truncates results to a token budget (recall.maxTokens)
     // Each ~200-char summary costs ~50 estimated tokens; a 60-token budget
     // should allow through at most one entry.
     const results = await provider.recall({ k: 5, maxTokens: 60 });
-    assert.ok(
+    expect(
       results.length <= 1,
       `expected <=1 entry under a tight token budget, got ${results.length}`
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -205,8 +204,8 @@ test("fileProvider.recall resolves supersede chains — only the latest entry in
 
     const results = await provider.recall({ k: 5 });
     const ids = results.map((r) => r.id);
-    assert.ok(ids.includes("v2"), "the superseding entry should be present");
-    assert.ok(!ids.includes("v1"), "the superseded entry should be excluded");
+    expect(ids.includes("v2"), "the superseding entry should be present").toBeTruthy();
+    expect(!ids.includes("v1"), "the superseded entry should be excluded").toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -247,10 +246,10 @@ test("fileProvider.recall reads entries buried beyond the legacy 64KB tail windo
     }
 
     const results = await provider.recall({ k: 1000, maxTokens: 1_000_000 });
-    assert.ok(
+    expect(
       results.some((r) => r.id === "buried-critical"),
       "recall() must not silently drop an entry buried beyond the legacy 64KB tail window"
-    );
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
@@ -268,11 +267,11 @@ test("fileProvider.invalidate excludes an entry from future recall() calls", asy
       source: "t"
     });
     let results = await provider.recall({ k: 5 });
-    assert.ok(results.some((r) => r.id === "bad-entry"));
+    expect(results.some((r) => r.id === "bad-entry")).toBeTruthy();
 
     await provider.invalidate("bad-entry");
     results = await provider.recall({ k: 5 });
-    assert.ok(!results.some((r) => r.id === "bad-entry"));
+    expect(!results.some((r) => r.id === "bad-entry")).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/memory-provider-noop.test.mts b/crew/tests/memory-provider-noop.test.mts
index 23119125..72b3b6e5 100644
--- a/crew/tests/memory-provider-noop.test.mts
+++ b/crew/tests/memory-provider-noop.test.mts
@@ -4,8 +4,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { noopProvider, resolveProvider } from "@astragenie/memory-provider";
 
 async function makeTempRepo(prefix: string) {
@@ -17,45 +16,41 @@ async function cleanup(dir: string) {
 }
 
 test("noopProvider describes itself as noop", () => {
-  assert.deepEqual(noopProvider().describe(), { provider: "noop" });
+  expect(noopProvider().describe()).toEqual({ provider: "noop" });
 });
 
 test("noopProvider.capture resolves without throwing and without writing anything", async () => {
   const provider = noopProvider();
-  await assert.doesNotReject(
-    provider.capture({
-      kind: "failure",
-      severity: "high",
-      summary: "should not be persisted",
-      source: "test"
-    })
-  );
+  await provider.capture({
+    kind: "failure",
+    severity: "high",
+    summary: "should not be persisted",
+    source: "test"
+  });
 });
 
 test("noopProvider.recall always returns an empty array", async () => {
   const provider = noopProvider();
-  assert.deepEqual(await provider.recall({}), []);
-  assert.deepEqual(await provider.recall({ agent: "reviewer", k: 5 }), []);
+  expect(await provider.recall({})).toEqual([]);
+  expect(await provider.recall({ agent: "reviewer", k: 5 })).toEqual([]);
 });
 
 test("noopProvider.supersede and .invalidate resolve without throwing", async () => {
   const provider = noopProvider();
-  await assert.doesNotReject(
-    provider.supersede("some-id", {
-      kind: "lesson",
-      severity: "low",
-      summary: "replacement",
-      source: "test"
-    })
-  );
-  await assert.doesNotReject(provider.invalidate("some-id"));
+  await provider.supersede("some-id", {
+    kind: "lesson",
+    severity: "low",
+    summary: "replacement",
+    source: "test"
+  });
+  await provider.invalidate("some-id");
 });
 
 test("golden: resolveProvider(undefined, repo) selects noop and never touches disk", async () => {
   const repo = await makeTempRepo("memory-noop-golden-");
   try {
     const provider = resolveProvider(undefined, repo);
-    assert.deepEqual(provider.describe(), { provider: "noop" });
+    expect(provider.describe()).toEqual({ provider: "noop" });
 
     await provider.capture({
       kind: "failure",
@@ -65,7 +60,10 @@ test("golden: resolveProvider(undefined, repo) selects noop and never touches di
     });
 
     const learningsPath = path.join(repo, ".claude", "artifacts", "loop", "learnings.jsonl");
-    await assert.rejects(fs.access(learningsPath), "no learnings.jsonl should be created by noop");
+    await expect(
+      fs.access(learningsPath),
+      "no learnings.jsonl should be created by noop"
+    ).rejects.toThrow();
   } finally {
     await cleanup(repo);
   }
@@ -75,7 +73,7 @@ test("golden: an empty memory block ({}) also resolves to disabled/noop behavior
   const repo = await makeTempRepo("memory-noop-empty-block-");
   try {
     const provider = resolveProvider({}, repo);
-    assert.deepEqual(provider.describe(), { provider: "noop" });
+    expect(provider.describe()).toEqual({ provider: "noop" });
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/memory-provider-schema.test.mts b/crew/tests/memory-provider-schema.test.mts
index 21443c29..78863ff3 100644
--- a/crew/tests/memory-provider-schema.test.mts
+++ b/crew/tests/memory-provider-schema.test.mts
@@ -1,8 +1,7 @@
 // tests/memory-provider-schema.test.ts
 // FEAT-188 S2 AC coverage: MemoryEntry Zod schema (kind | severity | tags |
 // summary<=280 | source-provenance | supersedes).
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { MemoryEntrySchema } from "@astragenie/memory-provider";
 
 function validEntry(overrides: Record<string, unknown> = {}) {
@@ -20,56 +19,56 @@ function validEntry(overrides: Record<string, unknown> = {}) {
 
 test("MemoryEntrySchema accepts a well-formed entry", () => {
   const parsed = MemoryEntrySchema.parse(validEntry());
-  assert.equal(parsed.kind, "failure");
-  assert.equal(parsed.severity, "high");
-  assert.deepEqual(parsed.tags, ["stack:typescript"]);
-  assert.equal(parsed.source, "review_fail");
+  expect(parsed.kind).toBe("failure");
+  expect(parsed.severity).toBe("high");
+  expect(parsed.tags).toEqual(["stack:typescript"]);
+  expect(parsed.source).toBe("review_fail");
 });
 
 test("MemoryEntrySchema accepts all four kinds", () => {
   for (const kind of ["failure", "lesson", "decision", "standard_violation"]) {
-    assert.doesNotThrow(() => MemoryEntrySchema.parse(validEntry({ kind })));
+    expect(() => MemoryEntrySchema.parse(validEntry({ kind }))).not.toThrow();
   }
 });
 
 test("MemoryEntrySchema rejects an unknown kind", () => {
-  assert.throws(() => MemoryEntrySchema.parse(validEntry({ kind: "bogus" })));
+  expect(() => MemoryEntrySchema.parse(validEntry({ kind: "bogus" }))).toThrow();
 });
 
 test("MemoryEntrySchema accepts all four severities", () => {
   for (const severity of ["critical", "high", "medium", "low"]) {
-    assert.doesNotThrow(() => MemoryEntrySchema.parse(validEntry({ severity })));
+    expect(() => MemoryEntrySchema.parse(validEntry({ severity }))).not.toThrow();
   }
 });
 
 test("MemoryEntrySchema rejects an unknown severity", () => {
-  assert.throws(() => MemoryEntrySchema.parse(validEntry({ severity: "urgent" })));
+  expect(() => MemoryEntrySchema.parse(validEntry({ severity: "urgent" }))).toThrow();
 });
 
 test("MemoryEntrySchema rejects a summary over 280 chars", () => {
-  assert.throws(() => MemoryEntrySchema.parse(validEntry({ summary: "x".repeat(281) })));
+  expect(() => MemoryEntrySchema.parse(validEntry({ summary: "x".repeat(281) }))).toThrow();
 });
 
 test("MemoryEntrySchema accepts a summary at exactly 280 chars", () => {
-  assert.doesNotThrow(() => MemoryEntrySchema.parse(validEntry({ summary: "x".repeat(280) })));
+  expect(() => MemoryEntrySchema.parse(validEntry({ summary: "x".repeat(280) }))).not.toThrow();
 });
 
 test("MemoryEntrySchema requires source (provenance) to be a non-empty string", () => {
-  assert.throws(() => MemoryEntrySchema.parse(validEntry({ source: "" })));
-  assert.throws(() => MemoryEntrySchema.parse(validEntry({ source: undefined })));
+  expect(() => MemoryEntrySchema.parse(validEntry({ source: "" }))).toThrow();
+  expect(() => MemoryEntrySchema.parse(validEntry({ source: undefined }))).toThrow();
 });
 
 test("MemoryEntrySchema accepts an optional supersedes id", () => {
   const parsed = MemoryEntrySchema.parse(validEntry({ supersedes: "entry-0" }));
-  assert.equal(parsed.supersedes, "entry-0");
+  expect(parsed.supersedes).toBe("entry-0");
 });
 
 test("MemoryEntrySchema defaults tags to an empty array when omitted", () => {
   const { tags: _tags, ...rest } = validEntry();
   const parsed = MemoryEntrySchema.parse(rest);
-  assert.deepEqual(parsed.tags, []);
+  expect(parsed.tags).toEqual([]);
 });
 
 test("MemoryEntrySchema rejects a non-ISO timestamp", () => {
-  assert.throws(() => MemoryEntrySchema.parse(validEntry({ ts: "not-a-date" })));
+  expect(() => MemoryEntrySchema.parse(validEntry({ ts: "not-a-date" }))).toThrow();
 });
diff --git a/crew/tests/memory-recall-injection-completeness.test.mts b/crew/tests/memory-recall-injection-completeness.test.mts
index 25e86d85..820513a0 100644
--- a/crew/tests/memory-recall-injection-completeness.test.mts
+++ b/crew/tests/memory-recall-injection-completeness.test.mts
@@ -10,8 +10,7 @@
 // silently skipping recall injection.
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 const REPO_ROOT = path.resolve(import.meta.dirname, "..");
 
@@ -40,14 +39,13 @@ test("every known dispatch-assembly module references the recall-injection helpe
   for (const mod of ASSEMBLY_MODULES) {
     const targetPath = path.join(REPO_ROOT, mod.relPath);
     const content = await fs.readFile(targetPath, "utf8");
-    assert.match(
+    expect(
       content,
-      mod.marker,
       `${mod.relPath} is a declared dispatch-assembly site but does not reference the ` +
         `recall-injection helper (FEAT-188 S3a) — wire it via \`recall-block\` (CLI) or the ` +
         `\`memory\` DispatchMemoryHint (dispatch.mts), or remove it from ASSEMBLY_MODULES if it ` +
         `no longer assembles a dispatch instruction.`
-    );
+    ).toMatch(mod.marker);
   }
 });
 
@@ -55,5 +53,5 @@ test("the canonical assembly-module list matches FEAT-188 S3a's declared scope (
   // Sanity guard: catches someone quietly shrinking ASSEMBLY_MODULES to
   // dodge the completeness check above, rather than actually wiring a new
   // or existing site.
-  assert.equal(ASSEMBLY_MODULES.length, 5);
+  expect(ASSEMBLY_MODULES.length).toBe(5);
 });
diff --git a/crew/tests/memory-write-handoff-credit.test.mts b/crew/tests/memory-write-handoff-credit.test.mts
index 1576b1ec..1b6d34b8 100644
--- a/crew/tests/memory-write-handoff-credit.test.mts
+++ b/crew/tests/memory-write-handoff-credit.test.mts
@@ -8,8 +8,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { __drainPendingCaptures, writeArtifact } from "../scripts/lib/artifacts/write.mjs";
 import type { ArtifactFields } from "../scripts/lib/artifacts/types.mjs";
 
@@ -34,9 +33,9 @@ test("fires a detached, bounded credit call when kind:handoff carries memoriesUs
         }
       })
     });
-    assert.equal(result.ok, true);
+    expect(result.ok).toBe(true);
     await __drainPendingCaptures();
-    assert.deepEqual(calls, [["a", "b"]]);
+    expect(calls).toEqual([["a", "b"]]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -59,9 +58,9 @@ test("does not fire the credit loader when memoriesUsed is absent", async () =>
         })
       }
     );
-    assert.equal(result.ok, true);
+    expect(result.ok).toBe(true);
     await __drainPendingCaptures();
-    assert.equal(called, false);
+    expect(called).toBe(false);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -84,9 +83,9 @@ test("does not fire the credit loader when memoriesUsed is an empty array", asyn
         })
       }
     );
-    assert.equal(result.ok, true);
+    expect(result.ok).toBe(true);
     await __drainPendingCaptures();
-    assert.equal(called, false);
+    expect(called).toBe(false);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -109,9 +108,9 @@ test("never fires for a non-handoff artifact kind, even with memoriesUsed presen
         })
       }
     );
-    assert.equal(result.ok, true);
+    expect(result.ok).toBe(true);
     await __drainPendingCaptures();
-    assert.equal(called, false);
+    expect(called).toBe(false);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -136,8 +135,8 @@ test("writeArtifact returns promptly even when the credit loader is slow (detach
     );
     const elapsed = performance.now() - t0;
 
-    assert.equal(result.ok, true);
-    assert.ok(elapsed < 300, `expected a prompt return, took ${elapsed}ms`);
+    expect(result.ok).toBe(true);
+    expect(elapsed < 300, `expected a prompt return, took ${elapsed}ms`).toBeTruthy();
   } finally {
     await __drainPendingCaptures();
     await fs.rm(repo, { recursive: true, force: true });
diff --git a/crew/tests/model-routing-enforce.test.mts b/crew/tests/model-routing-enforce.test.mts
index 1f8bfc5d..102b0f55 100644
--- a/crew/tests/model-routing-enforce.test.mts
+++ b/crew/tests/model-routing-enforce.test.mts
@@ -5,8 +5,7 @@
 // model-enforce.ts) owns stdin/stdout/process.exit and is exercised only by
 // the "malformed payload" pass-through cases here, matching the split used
 // by tests/dispatch-timing-pre-tap.test.ts.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   BUILDER_TIER_AGENTS,
   isBuilderTierAgent,
@@ -31,29 +30,28 @@ const COMMITTED_ROUTING = {
 // ── isBuilderTierAgent / BUILDER_TIER_AGENTS ────────────────────────────────
 
 test("BUILDER_TIER_AGENTS: covers the five builder-tier agents named in FEAT-194 S2b scope", () => {
-  assert.deepEqual(
-    [...BUILDER_TIER_AGENTS].sort(),
+  expect([...BUILDER_TIER_AGENTS].sort()).toEqual(
     ["aiplugin-dev", "backend-dev", "dev-lite", "frontend-dev", "fullstack-dev"].sort()
   );
 });
 
 test("isBuilderTierAgent: crew-prefixed builder tier names match", () => {
-  assert.equal(isBuilderTierAgent("crew:fullstack-dev"), true);
-  assert.equal(isBuilderTierAgent("crew:backend-dev"), true);
-  assert.equal(isBuilderTierAgent("crew:frontend-dev"), true);
-  assert.equal(isBuilderTierAgent("crew:aiplugin-dev"), true);
-  assert.equal(isBuilderTierAgent("crew:dev-lite"), true);
+  expect(isBuilderTierAgent("crew:fullstack-dev")).toBe(true);
+  expect(isBuilderTierAgent("crew:backend-dev")).toBe(true);
+  expect(isBuilderTierAgent("crew:frontend-dev")).toBe(true);
+  expect(isBuilderTierAgent("crew:aiplugin-dev")).toBe(true);
+  expect(isBuilderTierAgent("crew:dev-lite")).toBe(true);
 });
 
 test("isBuilderTierAgent: bare (non-prefixed) builder tier names match", () => {
-  assert.equal(isBuilderTierAgent("fullstack-dev"), true);
+  expect(isBuilderTierAgent("fullstack-dev")).toBe(true);
 });
 
 test("isBuilderTierAgent: non-builder agents do not match", () => {
-  assert.equal(isBuilderTierAgent("crew:reviewer"), false);
-  assert.equal(isBuilderTierAgent("crew:investigator"), false);
-  assert.equal(isBuilderTierAgent("crew:verifier"), false);
-  assert.equal(isBuilderTierAgent("general-purpose"), false);
+  expect(isBuilderTierAgent("crew:reviewer")).toBe(false);
+  expect(isBuilderTierAgent("crew:investigator")).toBe(false);
+  expect(isBuilderTierAgent("crew:verifier")).toBe(false);
+  expect(isBuilderTierAgent("general-purpose")).toBe(false);
 });
 
 // ── parseAgentDispatchInput ──────────────────────────────────────────────────
@@ -64,30 +62,31 @@ test("parseAgentDispatchInput: valid Agent payload with subagent_type → parsed
     tool_input: { subagent_type: "crew:fullstack-dev", description: "build the thing" }
   });
   const result = parseAgentDispatchInput(payload);
-  assert.ok(result !== null);
-  assert.equal(result.subagentType, "crew:fullstack-dev");
-  assert.equal(result.toolInput["description"], "build the thing");
+  expect(result !== null).toBeTruthy();
+  if (result === null) return;
+  expect(result.subagentType).toBe("crew:fullstack-dev");
+  expect(result.toolInput["description"]).toBe("build the thing");
 });
 
 test("parseAgentDispatchInput: non-Agent tool_name → null (pass through)", () => {
   const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command: "ls" } });
-  assert.equal(parseAgentDispatchInput(payload), null);
+  expect(parseAgentDispatchInput(payload)).toBe(null);
 });
 
 test("parseAgentDispatchInput: malformed JSON → null (fail-open pass through)", () => {
-  assert.equal(parseAgentDispatchInput("not json"), null);
-  assert.equal(parseAgentDispatchInput("{broken:"), null);
-  assert.equal(parseAgentDispatchInput(""), null);
+  expect(parseAgentDispatchInput("not json")).toBe(null);
+  expect(parseAgentDispatchInput("{broken:")).toBe(null);
+  expect(parseAgentDispatchInput("")).toBe(null);
 });
 
 test("parseAgentDispatchInput: missing subagent_type → null", () => {
   const payload = JSON.stringify({ tool_name: "Agent", tool_input: { description: "x" } });
-  assert.equal(parseAgentDispatchInput(payload), null);
+  expect(parseAgentDispatchInput(payload)).toBe(null);
 });
 
 test("parseAgentDispatchInput: missing tool_input → null", () => {
   const payload = JSON.stringify({ tool_name: "Agent" });
-  assert.equal(parseAgentDispatchInput(payload), null);
+  expect(parseAgentDispatchInput(payload)).toBe(null);
 });
 
 // ── decideModelEnforcement ───────────────────────────────────────────────────
@@ -98,11 +97,11 @@ test("decideModelEnforcement: builder-tier + no model + modelRouting configured
     toolInput: { subagent_type: "crew:fullstack-dev", description: "build the thing" }
   };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
-  assert.equal(decision.action, "inject");
-  assert.equal(decision.model, "sonnet");
-  assert.equal(decision.updatedInput?.["model"], "sonnet");
+  expect(decision.action).toBe("inject");
+  expect(decision.model).toBe("sonnet");
+  expect(decision.updatedInput?.["model"]).toBe("sonnet");
   // Original fields preserved alongside the injected model.
-  assert.equal(decision.updatedInput?.["description"], "build the thing");
+  expect(decision.updatedInput?.["description"]).toBe("build the thing");
 });
 
 test("decideModelEnforcement: explicit model already set → untouched (none)", () => {
@@ -111,9 +110,9 @@ test("decideModelEnforcement: explicit model already set → untouched (none)",
     toolInput: { subagent_type: "crew:fullstack-dev", model: "opus" }
   };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
-  assert.equal(decision.action, "none");
-  assert.equal(decision.model, undefined);
-  assert.equal(decision.updatedInput, undefined);
+  expect(decision.action).toBe("none");
+  expect(decision.model).toBe(undefined);
+  expect(decision.updatedInput).toBe(undefined);
 });
 
 test("decideModelEnforcement: non-builder agent → untouched (none)", () => {
@@ -122,7 +121,7 @@ test("decideModelEnforcement: non-builder agent → untouched (none)", () => {
     toolInput: { subagent_type: "crew:reviewer" }
   };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
-  assert.equal(decision.action, "none");
+  expect(decision.action).toBe("none");
 });
 
 test("decideModelEnforcement: no modelRouting configured (null config) → fail-open none", () => {
@@ -130,9 +129,9 @@ test("decideModelEnforcement: no modelRouting configured (null config) → fail-
     subagentType: "crew:fullstack-dev",
     toolInput: { subagent_type: "crew:fullstack-dev" }
   };
-  assert.equal(decideModelEnforcement(dispatch, null).action, "none");
-  assert.equal(decideModelEnforcement(dispatch, {}).action, "none");
-  assert.equal(decideModelEnforcement(dispatch, { loop: {} }).action, "none");
+  expect(decideModelEnforcement(dispatch, null).action).toBe("none");
+  expect(decideModelEnforcement(dispatch, {}).action).toBe("none");
+  expect(decideModelEnforcement(dispatch, { loop: {} }).action).toBe("none");
 });
 
 test("decideModelEnforcement: loop.modelRouting.enabled false → stand down (agent frontmatter governs)", () => {
@@ -143,7 +142,7 @@ test("decideModelEnforcement: loop.modelRouting.enabled false → stand down (ag
   const disabledConfig = {
     loop: { modelRouting: { enabled: false, build: "sonnet", default: "sonnet" } }
   };
-  assert.equal(decideModelEnforcement(dispatch, disabledConfig).action, "none");
+  expect(decideModelEnforcement(dispatch, disabledConfig).action).toBe("none");
 });
 
 test("decideModelEnforcement: malformed/empty-string explicit model is treated as absent → inject", () => {
@@ -152,15 +151,15 @@ test("decideModelEnforcement: malformed/empty-string explicit model is treated a
     toolInput: { subagent_type: "crew:backend-dev", model: "" }
   };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
-  assert.equal(decision.action, "inject");
-  assert.equal(decision.model, "sonnet");
+  expect(decision.action).toBe("inject");
+  expect(decision.model).toBe("sonnet");
 });
 
 test("decideModelEnforcement: dev-lite (bare, no crew: prefix) → inject", () => {
   const dispatch = { subagentType: "dev-lite", toolInput: { subagent_type: "dev-lite" } };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
-  assert.equal(decision.action, "inject");
-  assert.equal(decision.model, "sonnet");
+  expect(decision.action).toBe("inject");
+  expect(decision.model).toBe("sonnet");
 });
 
 // ── buildHookOutput ───────────────────────────────────────────────────────
@@ -172,20 +171,21 @@ test("buildHookOutput: inject decision → JSON with hookSpecificOutput.updatedI
   };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
   const out = buildHookOutput(dispatch, decision);
-  assert.ok(out !== null);
+  expect(out !== null).toBeTruthy();
+  if (out === null) return;
   const parsed = JSON.parse(out);
   // Required by the PreToolUse hookSpecificOutput schema — without it the
   // harness rejects the whole payload and the model injection silently no-ops
   // (dev-team#176). Assert it so the field can't regress.
-  assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
-  assert.equal(parsed.hookSpecificOutput.permissionDecision, "allow");
-  assert.equal(parsed.hookSpecificOutput.updatedInput.model, "sonnet");
-  assert.match(parsed.systemMessage, /crew:aiplugin-dev/);
-  assert.match(parsed.systemMessage, /sonnet/);
+  expect(parsed.hookSpecificOutput.hookEventName).toBe("PreToolUse");
+  expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
+  expect(parsed.hookSpecificOutput.updatedInput.model).toBe("sonnet");
+  expect(parsed.systemMessage).toMatch(/crew:aiplugin-dev/);
+  expect(parsed.systemMessage).toMatch(/sonnet/);
 });
 
 test("buildHookOutput: none decision → null (no stdout output, pure pass-through)", () => {
   const dispatch = { subagentType: "crew:reviewer", toolInput: { subagent_type: "crew:reviewer" } };
   const decision = decideModelEnforcement(dispatch, COMMITTED_ROUTING);
-  assert.equal(buildHookOutput(dispatch, decision), null);
+  expect(buildHookOutput(dispatch, decision)).toBe(null);
 });
diff --git a/crew/tests/orchestrate-slice.test.mts b/crew/tests/orchestrate-slice.test.mts
index 6f4e1fd1..ac63e1c9 100644
--- a/crew/tests/orchestrate-slice.test.mts
+++ b/crew/tests/orchestrate-slice.test.mts
@@ -1,6 +1,5 @@
 // tests/orchestrate-slice.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -15,20 +14,22 @@ const COMMAND_PATH = path.join(repoRoot, "commands", "orchestrate-slice.md");
 const ARCHITECT_PATH = path.join(repoRoot, "agents", "architect.md");
 
 test("commands/orchestrate-slice.md exists", async () => {
-  await assert.doesNotReject(fs.access(COMMAND_PATH), "command file must exist");
+  await fs.access(COMMAND_PATH);
 });
 
 test("orchestrate-slice command has description frontmatter", async () => {
   const text = await fs.readFile(COMMAND_PATH, "utf8");
   const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
-  assert.ok(match, "file must start with a YAML frontmatter block");
-  assert.match(match[1]!, /^description:\s*.+/m, "frontmatter must include non-empty description:");
+  expect(match, "file must start with a YAML frontmatter block").toBeTruthy();
+  expect(match![1]!, "frontmatter must include non-empty description:").toMatch(
+    /^description:\s*.+/m
+  );
 });
 
 test("orchestrate-slice command body contains Steps 0 through 8", async () => {
   const text = await fs.readFile(COMMAND_PATH, "utf8");
   for (let i = 0; i <= 8; i++) {
-    assert.match(text, new RegExp(`Step ${i}`), `command body must contain "Step ${i}"`);
+    expect(text, `command body must contain "Step ${i}"`).toMatch(new RegExp(`Step ${i}`));
   }
 });
 
@@ -42,7 +43,7 @@ test("orchestrate-slice command references all required specialist agents", asyn
     "crew:verifier"
   ];
   for (const agent of required) {
-    assert.match(text, new RegExp(agent), `command must reference ${agent}`);
+    expect(text, `command must reference ${agent}`).toMatch(new RegExp(agent));
   }
 });
 
@@ -57,38 +58,37 @@ test("architect.md documents the three-file OpenAPI contract shape", async () =>
     "<FEAT-ID>-contracts.ts"
   ];
   for (const section of required) {
-    assert.ok(text.includes(section), `architect.md must mention "${section}"`);
+    expect(text.includes(section), `architect.md must mention "${section}"`).toBeTruthy();
   }
 });
 
 test("architect.md mentions the validate-contracts regeneration step", async () => {
   const text = await fs.readFile(ARCHITECT_PATH, "utf8");
-  assert.match(
+  expect(
     text,
-    /validate-contracts\.(?:mjs|ts)/,
     "architect.md must document the validate-contracts regeneration step for derived TS"
-  );
+  ).toMatch(/validate-contracts\.(?:mjs|ts)/);
 });
 
 test("classifySlice: SPLIT_BUILD true when both surface:ui and surface:api present", async () => {
   const result = await classifySlice({
     slicePath: "tests/fixtures/slices/split-build-demo.md"
   });
-  assert.equal(result.SPLIT_BUILD, true);
-  assert.equal(result.NEEDS_CONTRACT, true);
-  assert.equal(result.NEEDS_UX, true);
+  expect(result.SPLIT_BUILD).toBe(true);
+  expect(result.NEEDS_CONTRACT).toBe(true);
+  expect(result.NEEDS_UX).toBe(true);
 });
 
 test("classifySlice: SPLIT_BUILD false when only backend stack tag", async () => {
   const result = await classifySlice({
     slicePath: "tests/fixtures/slices/single-stack-demo.md"
   });
-  assert.equal(result.SPLIT_BUILD, false);
-  assert.equal(result.NEEDS_CONTRACT, true);
-  assert.equal(result.NEEDS_UX, false);
+  expect(result.SPLIT_BUILD).toBe(false);
+  expect(result.NEEDS_CONTRACT).toBe(true);
+  expect(result.NEEDS_UX).toBe(false);
 });
 
-test('classifySlice: SPLIT_BUILD false when slice has skip: ["split-build"]', async (t) => {
+test('classifySlice: SPLIT_BUILD false when slice has skip: ["split-build"]', async () => {
   const tmp = `tests/fixtures/slices/skip-split-demo-${process.pid}-${Date.now()}.md`;
   const { writeFile, unlink } = await import("node:fs/promises");
   await writeFile(
@@ -96,13 +96,14 @@ test('classifySlice: SPLIT_BUILD false when slice has skip: ["split-build"]', as
     '---\nslice: SLICE-903\ntags: [surface:ui, surface:api, stack:react, stack:csharp]\nskip: ["split-build"]\n---\n\n# SLICE-903\n\n## Acceptance Criteria\n- demo\n',
     "utf8"
   );
-  t.after(() =>
-    unlink(tmp).catch(() => {
+  try {
+    const result = await classifySlice({ slicePath: tmp });
+    expect(result.SPLIT_BUILD).toBe(false);
+  } finally {
+    await unlink(tmp).catch(() => {
       /* ignore cleanup errors */
-    })
-  );
-  const result = await classifySlice({ slicePath: tmp });
-  assert.equal(result.SPLIT_BUILD, false);
+    });
+  }
 });
 
 // FEAT-170 SLICE-C — single-stack routing signals
@@ -110,12 +111,12 @@ test("classifySlice: BE_ONLY true when only backend tags present", async () => {
   const result = await classifySlice({
     slicePath: "tests/fixtures/slices/single-stack-demo.md"
   });
-  assert.equal(result.SPLIT_BUILD, false);
-  assert.equal(result.BE_ONLY, true);
-  assert.equal(result.FE_ONLY, false);
+  expect(result.SPLIT_BUILD).toBe(false);
+  expect(result.BE_ONLY).toBe(true);
+  expect(result.FE_ONLY).toBe(false);
 });
 
-test("classifySlice: FE_ONLY true when only frontend tags present", async (t) => {
+test("classifySlice: FE_ONLY true when only frontend tags present", async () => {
   const tmp = `tests/fixtures/slices/fe-only-demo-${process.pid}-${Date.now()}.md`;
   const { writeFile, unlink } = await import("node:fs/promises");
   await writeFile(
@@ -123,18 +124,19 @@ test("classifySlice: FE_ONLY true when only frontend tags present", async (t) =>
     "---\nslice: SLICE-904\ntags: [surface:ui, stack:react]\n---\n\n# SLICE-904\n\n## Acceptance Criteria\n- demo\n",
     "utf8"
   );
-  t.after(() =>
-    unlink(tmp).catch(() => {
+  try {
+    const result = await classifySlice({ slicePath: tmp });
+    expect(result.SPLIT_BUILD).toBe(false);
+    expect(result.FE_ONLY).toBe(true);
+    expect(result.BE_ONLY).toBe(false);
+  } finally {
+    await unlink(tmp).catch(() => {
       /* ignore cleanup errors */
-    })
-  );
-  const result = await classifySlice({ slicePath: tmp });
-  assert.equal(result.SPLIT_BUILD, false);
-  assert.equal(result.FE_ONLY, true);
-  assert.equal(result.BE_ONLY, false);
+    });
+  }
 });
 
-test("classifySlice: both BE_ONLY and FE_ONLY false when no surface tags", async (t) => {
+test("classifySlice: both BE_ONLY and FE_ONLY false when no surface tags", async () => {
   const tmp = `tests/fixtures/slices/untagged-demo-${process.pid}-${Date.now()}.md`;
   const { writeFile, unlink } = await import("node:fs/promises");
   await writeFile(
@@ -142,53 +144,54 @@ test("classifySlice: both BE_ONLY and FE_ONLY false when no surface tags", async
     "---\nslice: SLICE-905\ntags: [doc]\n---\n\n# SLICE-905\n\n## Acceptance Criteria\n- demo\n",
     "utf8"
   );
-  t.after(() =>
-    unlink(tmp).catch(() => {
+  try {
+    const result = await classifySlice({ slicePath: tmp });
+    expect(result.SPLIT_BUILD).toBe(false);
+    expect(result.FE_ONLY).toBe(false);
+    expect(result.BE_ONLY).toBe(false);
+  } finally {
+    await unlink(tmp).catch(() => {
       /* ignore cleanup errors */
-    })
-  );
-  const result = await classifySlice({ slicePath: tmp });
-  assert.equal(result.SPLIT_BUILD, false);
-  assert.equal(result.FE_ONLY, false);
-  assert.equal(result.BE_ONLY, false);
+    });
+  }
 });
 
 test("classifySlice: BE_ONLY and FE_ONLY both false when SPLIT_BUILD true", async () => {
   const result = await classifySlice({
     slicePath: "tests/fixtures/slices/split-build-demo.md"
   });
-  assert.equal(result.SPLIT_BUILD, true);
-  assert.equal(result.FE_ONLY, false);
-  assert.equal(result.BE_ONLY, false);
+  expect(result.SPLIT_BUILD).toBe(true);
+  expect(result.FE_ONLY).toBe(false);
+  expect(result.BE_ONLY).toBe(false);
 });
 
 // isShortSlice tests
 test("isShortSlice: acCount ≤ 6, changedFilesCount > 10 → true (AC count alone qualifies)", () => {
-  assert.equal(isShortSlice({ acCount: 4, changedFilesCount: 15 }), true);
+  expect(isShortSlice({ acCount: 4, changedFilesCount: 15 })).toBe(true);
 });
 
 test("isShortSlice: acCount > 6, changedFilesCount ≤ 10 → true (file count alone qualifies)", () => {
-  assert.equal(isShortSlice({ acCount: 8, changedFilesCount: 7 }), true);
+  expect(isShortSlice({ acCount: 8, changedFilesCount: 7 })).toBe(true);
 });
 
 test("isShortSlice: acCount ≤ 6, changedFilesCount ≤ 10 → true (both qualify)", () => {
-  assert.equal(isShortSlice({ acCount: 3, changedFilesCount: 5 }), true);
+  expect(isShortSlice({ acCount: 3, changedFilesCount: 5 })).toBe(true);
 });
 
 test("isShortSlice: acCount > 6, changedFilesCount > 10 → false (neither qualifies)", () => {
-  assert.equal(isShortSlice({ acCount: 9, changedFilesCount: 12 }), false);
+  expect(isShortSlice({ acCount: 9, changedFilesCount: 12 })).toBe(false);
 });
 
 test("isShortSlice: acCount = 6, changedFilesCount = 10 → true (boundary: both at limit)", () => {
-  assert.equal(isShortSlice({ acCount: 6, changedFilesCount: 10 }), true);
+  expect(isShortSlice({ acCount: 6, changedFilesCount: 10 })).toBe(true);
 });
 
 test("isShortSlice: acCount = 7, changedFilesCount = 11 → false (boundary: both just over)", () => {
-  assert.equal(isShortSlice({ acCount: 7, changedFilesCount: 11 }), false);
+  expect(isShortSlice({ acCount: 7, changedFilesCount: 11 })).toBe(false);
 });
 
 test("isShortSlice: acCount = 4, changedFilesCount = 5, crossPlugin: true → false (cross-plugin override)", () => {
-  assert.equal(isShortSlice({ acCount: 4, changedFilesCount: 5, crossPlugin: true }), false);
+  expect(isShortSlice({ acCount: 4, changedFilesCount: 5, crossPlugin: true })).toBe(false);
 });
 
 // FEAT-170 SLICE-C — pure-TS-tooling routing (BE-default for untagged tooling slices)
@@ -198,22 +201,22 @@ test("classifyChangedFiles: TS_TOOLING_ONLY true for pure .ts script/test files"
     "tests/orchestrate-slice.test.ts",
     "evals/agents/crew-fullstack-dev.yaml"
   ]);
-  assert.equal(result.TS_TOOLING_ONLY, true);
+  expect(result.TS_TOOLING_ONLY).toBe(true);
 });
 
 test("classifyChangedFiles: TS_TOOLING_ONLY false when any .tsx file present", () => {
   const result = classifyChangedFiles(["scripts/lib/foo.ts", "src/components/Button.tsx"]);
-  assert.equal(result.TS_TOOLING_ONLY, false);
+  expect(result.TS_TOOLING_ONLY).toBe(false);
 });
 
 test("classifyChangedFiles: TS_TOOLING_ONLY false when any .css file present", () => {
   const result = classifyChangedFiles(["tests/foo.test.ts", "src/styles/theme.css"]);
-  assert.equal(result.TS_TOOLING_ONLY, false);
+  expect(result.TS_TOOLING_ONLY).toBe(false);
 });
 
 test("classifyChangedFiles: TS_TOOLING_ONLY false for empty file list", () => {
   const result = classifyChangedFiles([]);
-  assert.equal(result.TS_TOOLING_ONLY, false);
+  expect(result.TS_TOOLING_ONLY).toBe(false);
 });
 
 test("classifySlice: TS_TOOLING_ONLY true when changedFiles are all TS tooling", async () => {
@@ -221,7 +224,7 @@ test("classifySlice: TS_TOOLING_ONLY true when changedFiles are all TS tooling",
     slicePath: "tests/fixtures/slices/single-stack-demo.md",
     changedFiles: ["scripts/orchestrate-slice-classify.ts", "tests/orchestrate-slice.test.ts"]
   });
-  assert.equal(result.TS_TOOLING_ONLY, true);
+  expect(result.TS_TOOLING_ONLY).toBe(true);
 });
 
 test("classifySlice: TS_TOOLING_ONLY false when changedFiles include .tsx (mixed BE+FE)", async () => {
@@ -229,5 +232,5 @@ test("classifySlice: TS_TOOLING_ONLY false when changedFiles include .tsx (mixed
     slicePath: "tests/fixtures/slices/split-build-demo.md",
     changedFiles: ["src/api/things.ts", "src/components/ThingList.tsx"]
   });
-  assert.equal(result.TS_TOOLING_ONLY, false);
+  expect(result.TS_TOOLING_ONLY).toBe(false);
 });
diff --git a/crew/tests/outcome-linkage-rebound.test.mts b/crew/tests/outcome-linkage-rebound.test.mts
index 31f04148..998b80bb 100644
--- a/crew/tests/outcome-linkage-rebound.test.mts
+++ b/crew/tests/outcome-linkage-rebound.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -46,14 +45,14 @@ async function makeRepoWithGrade(gradeBody: string): Promise<string> {
 test("collectOutcomeLinkage: surfaces review_rebound_count when present", async () => {
   const repo = await makeRepoWithGrade(MINIMAL_GRADE);
   const result = await collectOutcomeLinkage(repo, "FEAT-999 SLICE-99");
-  assert.equal(result.sliceId, "SLICE-99");
-  assert.equal(result.reviewReboundCount, 3);
+  expect(result.sliceId).toBe("SLICE-99");
+  expect(result.reviewReboundCount).toBe(3);
 });
 
 test("collectOutcomeLinkage: review_rebound_count null when absent from grade frontmatter", async () => {
   const repo = await makeRepoWithGrade(GRADE_NO_REBOUND);
   const result = await collectOutcomeLinkage(repo, "FEAT-999 SLICE-99");
-  assert.equal(result.reviewReboundCount, null);
+  expect(result.reviewReboundCount).toBe(null);
 });
 
 test("collectOutcomeLinkage: review_rebound_count is zero on first-try pass", async () => {
@@ -61,7 +60,7 @@ test("collectOutcomeLinkage: review_rebound_count is zero on first-try pass", as
     MINIMAL_GRADE.replace("review_rebound_count: 3", "review_rebound_count: 0")
   );
   const result = await collectOutcomeLinkage(repo, "FEAT-999 SLICE-99");
-  assert.equal(result.reviewReboundCount, 0);
+  expect(result.reviewReboundCount).toBe(0);
 });
 
 test("collectOutcomeLinkage: rejects negative or non-numeric rebound counts", async () => {
@@ -69,5 +68,5 @@ test("collectOutcomeLinkage: rejects negative or non-numeric rebound counts", as
     MINIMAL_GRADE.replace("review_rebound_count: 3", "review_rebound_count: notanumber")
   );
   const result = await collectOutcomeLinkage(repo, "FEAT-999 SLICE-99");
-  assert.equal(result.reviewReboundCount, null);
+  expect(result.reviewReboundCount).toBe(null);
 });
diff --git a/crew/tests/parallel-gates.test.mts b/crew/tests/parallel-gates.test.mts
index c1b0af00..105cb19d 100644
--- a/crew/tests/parallel-gates.test.mts
+++ b/crew/tests/parallel-gates.test.mts
@@ -1,6 +1,5 @@
 // FEAT-152: parallel-gates helper tests.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   aggregateGateExitCodes,
   emitParallelGatesBlock,
@@ -8,16 +7,16 @@ import {
 } from "../scripts/lib/parallel-gates.mjs";
 
 test("aggregateGateExitCodes: all zeros -> 0", () => {
-  assert.equal(aggregateGateExitCodes([0, 0, 0]), 0);
+  expect(aggregateGateExitCodes([0, 0, 0])).toBe(0);
 });
 
 test("aggregateGateExitCodes: any non-zero -> 1", () => {
-  assert.equal(aggregateGateExitCodes([0, 1, 0]), 1);
-  assert.equal(aggregateGateExitCodes([2, 0, 0]), 1);
+  expect(aggregateGateExitCodes([0, 1, 0])).toBe(1);
+  expect(aggregateGateExitCodes([2, 0, 0])).toBe(1);
 });
 
 test("aggregateGateExitCodes: empty input -> 0 (no gates, nothing failed)", () => {
-  assert.equal(aggregateGateExitCodes([]), 0);
+  expect(aggregateGateExitCodes([])).toBe(0);
 });
 
 test("emitParallelGatesBlock: emits launch line per gate with timeout + temp log", () => {
@@ -26,40 +25,37 @@ test("emitParallelGatesBlock: emits launch line per gate with timeout + temp log
     { name: "typecheck", cmd: "bun run typecheck" }
   ];
   const block = emitParallelGatesBlock(gates);
-  assert.match(block, /LOGS=\$\(mktemp -d\)/);
-  assert.match(
-    block,
+  expect(block).toMatch(/LOGS=\$\(mktemp -d\)/);
+  expect(block).toMatch(
     /timeout \$\{CREW_BASH_GATE_TIMEOUT_S:-60\} bash -c 'bun run lint' > "\$LOGS\/lint\.log"/
   );
-  assert.match(
-    block,
+  expect(block).toMatch(
     /timeout \$\{CREW_BASH_GATE_TIMEOUT_S:-60\} bash -c 'bun run typecheck' > "\$LOGS\/typecheck\.log"/
   );
   // both launches must be backgrounded
   const launchLines = block
     .split("\n")
     .filter((l) => /timeout \$\{CREW_BASH_GATE_TIMEOUT_S/.test(l));
-  assert.equal(launchLines.length, 2);
-  for (const line of launchLines) assert.match(line, / &$/);
+  expect(launchLines.length).toBe(2);
+  for (const line of launchLines) expect(line).toMatch(/ &$/);
   // single wait for all
-  assert.match(block, /\nwait\n/);
+  expect(block).toMatch(/\nwait\n/);
 });
 
 test("emitParallelGatesBlock: aggregator loops gates and tails failing log", () => {
   const block = emitParallelGatesBlock([{ name: "lint", cmd: "bun run lint" }]);
-  assert.match(block, /for g in lint; do/);
-  assert.match(block, /--- \$g failed \(exit \$code\) ---/);
-  assert.match(block, /tail -50 "\$LOGS\/\$g\.log"/);
-  assert.match(block, /exit \$fail/);
+  expect(block).toMatch(/for g in lint; do/);
+  expect(block).toMatch(/--- \$g failed \(exit \$code\) ---/);
+  expect(block).toMatch(/tail -50 "\$LOGS\/\$g\.log"/);
+  expect(block).toMatch(/exit \$fail/);
 });
 
 test("emitParallelGatesBlock: rejects empty gates list", () => {
-  assert.throws(() => emitParallelGatesBlock([]), /must be non-empty/);
+  expect(() => emitParallelGatesBlock([])).toThrow(/must be non-empty/);
 });
 
 test("emitParallelGatesBlock: rejects gate names with shell metachars", () => {
-  assert.throws(
-    () => emitParallelGatesBlock([{ name: "lint;rm -rf /", cmd: "x" }]),
+  expect(() => emitParallelGatesBlock([{ name: "lint;rm -rf /", cmd: "x" }])).toThrow(
     /invalid gate name/
   );
 });
@@ -67,5 +63,5 @@ test("emitParallelGatesBlock: rejects gate names with shell metachars", () => {
 test("emitParallelGatesBlock: escapes single quotes inside cmd", () => {
   const block = emitParallelGatesBlock([{ name: "g", cmd: `echo 'hi'` }]);
   // single quote split-escape pattern: '\''
-  assert.match(block, /'echo '\\''hi'\\''/);
+  expect(block).toMatch(/'echo '\\''hi'\\''/);
 });
diff --git a/crew/tests/preflight-shell.test.mts b/crew/tests/preflight-shell.test.mts
index 200b9c3f..7c6ff252 100644
--- a/crew/tests/preflight-shell.test.mts
+++ b/crew/tests/preflight-shell.test.mts
@@ -1,6 +1,5 @@
 // tests/preflight-shell.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawn } from "node:child_process";
 import fs from "node:fs/promises";
 import os from "node:os";
@@ -9,7 +8,7 @@ import url from "node:url";
 import { runPreflightShellHook } from "../hooks/lib/preflight-shell.mjs";
 
 const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
-const HOOK_PATH = path.join(__dirname, "..", "hooks", "preflight-shell.ts");
+const HOOK_PATH = path.join(__dirname, "..", "hooks", "preflight-shell.mts");
 
 /**
  * In-process hook runner: import core, call directly, return { exitCode: 0, stdout, stderr: "" }
@@ -28,7 +27,7 @@ function runHookSpawn(
   stdin: string
 ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
   return new Promise((resolve) => {
-    const proc = spawn("node", ["--experimental-strip-types", HOOK_PATH], {
+    const proc = spawn("bun", [HOOK_PATH], {
       env: { ...process.env }
     });
     let stdout = "";
@@ -53,18 +52,18 @@ function makeStdin(toolName: string, command: string, cwd: string) {
 
 test("default-on — hook runs and warns on $env: in Bash without any crew.json", async () => {
   const result = await runHook(makeStdin("Bash", "echo $env:HOME", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
   const parsed = JSON.parse(result.stdout);
-  assert.equal(parsed.decision, "approve");
-  assert.match(parsed.systemMessage, /\$env:/);
+  expect(parsed.decision).toBe("approve");
+  expect(parsed.systemMessage).toMatch(/\$env:/);
 });
 
 // SMOKE: Hook runtime contract default-on (verifies stdin→stdout wiring)
 test("smoke: default-on — hook runs via spawn with no special env", async () => {
   const result = await runHookSpawn(makeStdin("Bash", "echo $env:HOME", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
 });
 
 // ── AC-7: Failure mode 1 — env-var shape mismatch ───────────────────────────
@@ -72,12 +71,12 @@ test("smoke: default-on — hook runs via spawn with no special env", async () =
 // SMOKE: Hook runtime contract with warning path (verifies stdin→stdout payload wiring)
 test("smoke: AC-7a — Bash tool with $env:HOME warns about $env: syntax", async () => {
   const result = await runHookSpawn(makeStdin("Bash", "echo $env:HOME", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
   const parsed = JSON.parse(result.stdout);
-  assert.equal(parsed.decision, "approve");
-  assert.match(parsed.systemMessage, /\$env:/);
-  assert.match(parsed.systemMessage, /bash does not understand/);
+  expect(parsed.decision).toBe("approve");
+  expect(parsed.systemMessage).toMatch(/\$env:/);
+  expect(parsed.systemMessage).toMatch(/bash does not understand/);
 });
 
 test("AC-7b: PowerShell tool with bare $PATH warns about $NAME vs $env:NAME", async () => {
@@ -85,12 +84,12 @@ test("AC-7b: PowerShell tool with bare $PATH warns about $NAME vs $env:NAME", as
   // ($HOME, $LASTEXITCODE, $NULL, etc. are PS built-ins and must NOT warn —
   // see deny-list regression tests below.)
   const result = await runHook(makeStdin("PowerShell", "Write-Host $PATH", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
   const parsed = JSON.parse(result.stdout);
-  assert.equal(parsed.decision, "approve");
-  assert.match(parsed.systemMessage, /\$env:PATH/);
-  assert.match(parsed.systemMessage, /not `\$PATH`/);
+  expect(parsed.decision).toBe("approve");
+  expect(parsed.systemMessage).toMatch(/\$env:PATH/);
+  expect(parsed.systemMessage).toMatch(/not `\$PATH`/);
 });
 
 // ── AC-8: Failure mode 2 — chained-cd missing path ──────────────────────────
@@ -100,15 +99,15 @@ test("AC-8: chained cd to non-existent path warns naming the path", async () =>
   const missingPath = path.join(os.tmpdir(), "preflight-no-such-path-" + Date.now());
   const command = `cd ${missingPath} && ls`;
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
   const parsed = JSON.parse(result.stdout);
-  assert.equal(parsed.decision, "approve");
-  assert.match(parsed.systemMessage, /does not exist/);
-  assert.ok(
+  expect(parsed.decision).toBe("approve");
+  expect(parsed.systemMessage).toMatch(/does not exist/);
+  expect(
     parsed.systemMessage.includes(missingPath),
     `warn should contain path, got: ${parsed.systemMessage}`
-  );
+  ).toBeTruthy();
 });
 
 test("AC-8b: chained cd to existing path is silent", async () => {
@@ -116,41 +115,42 @@ test("AC-8b: chained cd to existing path is silent", async () => {
   try {
     const command = `cd ${tmpDir} && ls`;
     const result = await runHook(makeStdin("Bash", command, process.cwd()));
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
 });
 
-test("AC-8c: chained cd to existing dir via MSYS-style path (/c/...) is silent", {
-  skip: process.platform !== "win32"
-}, async () => {
-  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "preflight-msys-"));
-  try {
-    // C:\Users\... -> /c/Users/... (the form Git-Bash reports and accepts)
-    const msysPath = tmpDir
-      .replace(/^([A-Za-z]):\\/, (_m, d) => `/${d.toLowerCase()}/`)
-      .replace(/\\/g, "/");
-    const command = `cd ${msysPath} && ls`;
-    const result = await runHook(makeStdin("Bash", command, process.cwd()));
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "", `MSYS drive path should not warn, got: ${result.stdout}`);
-  } finally {
-    await fs.rm(tmpDir, { recursive: true, force: true });
+test.skipIf(process.platform !== "win32")(
+  "AC-8c: chained cd to existing dir via MSYS-style path (/c/...) is silent",
+  async () => {
+    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "preflight-msys-"));
+    try {
+      // C:\Users\... -> /c/Users/... (the form Git-Bash reports and accepts)
+      const msysPath = tmpDir
+        .replace(/^([A-Za-z]):\\/, (_m, d) => `/${d.toLowerCase()}/`)
+        .replace(/\\/g, "/");
+      const command = `cd ${msysPath} && ls`;
+      const result = await runHook(makeStdin("Bash", command, process.cwd()));
+      expect(result.exitCode).toBe(0);
+      expect(result.stdout, `MSYS drive path should not warn, got: ${result.stdout}`).toBe("");
+    } finally {
+      await fs.rm(tmpDir, { recursive: true, force: true });
+    }
   }
-});
+);
 
 // ── AC-9: Failure mode 3 — unquoted Windows path with space ─────────────────
 
 test("AC-9a: unquoted Windows path with space triggers warn", async () => {
   const command = "cd C:/work mega/hero-crew && ls";
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
   const parsed = JSON.parse(result.stdout);
-  assert.equal(parsed.decision, "approve");
-  assert.match(parsed.systemMessage, /[Ww]indows path/);
+  expect(parsed.decision).toBe("approve");
+  expect(parsed.systemMessage).toMatch(/[Ww]indows path/);
 });
 
 test("AC-9b: quoted Windows path with space is silent", async () => {
@@ -158,11 +158,11 @@ test("AC-9b: quoted Windows path with space is silent", async () => {
   // but is quoted
   const command = 'cd "C:/work mega/no-such-dir" && ls';
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
+  expect(result.exitCode).toBe(0);
   // May warn about missing path but NOT about unquoted windows path
   if (result.stdout !== "") {
     const parsed = JSON.parse(result.stdout);
-    assert.doesNotMatch(parsed.systemMessage, /[Ww]indows path/);
+    expect(parsed.systemMessage).not.toMatch(/[Ww]indows path/);
   }
 });
 
@@ -173,10 +173,10 @@ test("AC-9c: Windows path followed by normal arg (no separator) is silent", asyn
   // like a path continuation (contains `/` or `\`).
   const command = "git -C C:/work/mega/hero-crew status --short";
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
+  expect(result.exitCode).toBe(0);
   if (result.stdout !== "") {
     const parsed = JSON.parse(result.stdout);
-    assert.doesNotMatch(parsed.systemMessage, /[Ww]indows path/);
+    expect(parsed.systemMessage).not.toMatch(/[Ww]indows path/);
   }
 });
 
@@ -184,10 +184,10 @@ test("AC-9d: Windows path piped to operator is silent", async () => {
   // Operators (&&, ;, |, >, <) after the path are not continuations.
   const command = "ls C:/work/mega/foo/bar.json; echo done";
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
+  expect(result.exitCode).toBe(0);
   if (result.stdout !== "") {
     const parsed = JSON.parse(result.stdout);
-    assert.doesNotMatch(parsed.systemMessage, /[Ww]indows path/);
+    expect(parsed.systemMessage).not.toMatch(/[Ww]indows path/);
   }
 });
 
@@ -196,40 +196,40 @@ test("AC-9d: Windows path piped to operator is silent", async () => {
 test("AC-10a: unterminated here-doc triggers warn", async () => {
   const command = "bash -c \"cat <<'EOF'\\nhello\"";
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.notEqual(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).not.toBe("");
   const parsed = JSON.parse(result.stdout);
-  assert.equal(parsed.decision, "approve");
-  assert.match(parsed.systemMessage, /here-doc terminator missing/);
+  expect(parsed.decision).toBe("approve");
+  expect(parsed.systemMessage).toMatch(/here-doc terminator missing/);
 });
 
 test("AC-10b: properly terminated here-doc is silent", async () => {
   const command = "bash -c \"cat <<'EOF'\\nhello\\nEOF\"";
   const result = await runHook(makeStdin("Bash", command, process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // ── AC-11: Clean command — silent + exit 0 ───────────────────────────────────
 
 test("AC-11: clean command produces zero stdout and exits 0", async () => {
   const result = await runHook(makeStdin("Bash", "echo hello", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("AC-11b: clean PowerShell command produces zero stdout and exits 0", async () => {
   const result = await runHook(makeStdin("PowerShell", "Write-Host 'hello'", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // ── AC-12: Exception resilience ──────────────────────────────────────────────
 
 test("AC-12: malformed JSON on stdin exits 0 silently", async () => {
   const result = await runHook("not json at all");
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("AC-12b: missing tool_input.command exits 0 silently", async () => {
@@ -241,18 +241,18 @@ test("AC-12b: missing tool_input.command exits 0 silently", async () => {
       cwd: process.cwd()
     })
   );
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("AC-12c: hook does not propagate exceptions from bad input", async () => {
   // Pass a command with null bytes that might confuse regexes
   const result = await runHook(makeStdin("Bash", "echo \x00\x01\x02", process.cwd()));
-  assert.equal(result.exitCode, 0);
+  expect(result.exitCode).toBe(0);
   // Either silent or warns, but must not crash
   if (result.stdout !== "") {
     const parsed = JSON.parse(result.stdout);
-    assert.notEqual(parsed.decision, "block");
+    expect(parsed.decision).not.toBe("block");
   }
 });
 
@@ -262,37 +262,37 @@ test("false-positive: bash ${HOME} does NOT trigger PowerShell-shape warn (wrong
   // This is Bash tool, not PowerShell — so env-var shape check should fire
   // for $env:NAME pattern only. ${HOME} in Bash is fine.
   const result = await runHook(makeStdin("Bash", "echo ${HOME}", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("false-positive: PowerShell ${HOME} with braces does NOT warn", async () => {
   // ${HOME} uses braces — should be excluded from PowerShell bare-$NAME check
   const result = await runHook(makeStdin("PowerShell", "Write-Host ${HOME}", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("false-positive: PowerShell $() command substitution does NOT warn", async () => {
   const result = await runHook(
     makeStdin("PowerShell", "Write-Host $(Get-Location)", process.cwd())
   );
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("false-positive: bash $1 positional arg does NOT trigger warn", async () => {
   // $1 is lowercase/digit — not [A-Z_][A-Z0-9_]* so should not fire PowerShell warn
   // (and this is Bash tool anyway)
   const result = await runHook(makeStdin("Bash", "echo $1", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("false-positive: PowerShell $env:NAME does NOT trigger bare-$NAME warn", async () => {
   const result = await runHook(makeStdin("PowerShell", "Write-Host $env:HOME", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // ── PowerShell automatic variables MUST NOT trigger the env-var shape warn ───
@@ -301,27 +301,27 @@ test("PS auto-var: $_ in pipeline context does NOT warn", async () => {
   const result = await runHook(
     makeStdin("PowerShell", "Get-Process | Where-Object { $_.CPU -gt 100 }", process.cwd())
   );
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("PS auto-var: $LASTEXITCODE does NOT warn", async () => {
   const result = await runHook(makeStdin("PowerShell", "Write-Host $LASTEXITCODE", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("PS auto-var: $HOME does NOT warn (built-in)", async () => {
   const result = await runHook(makeStdin("PowerShell", "Write-Host $HOME", process.cwd()));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("PS auto-var: $NULL, $TRUE, $FALSE do NOT warn", async () => {
   for (const v of ["$NULL", "$TRUE", "$FALSE"]) {
     const result = await runHook(makeStdin("PowerShell", `Write-Host ${v}`, process.cwd()));
-    assert.equal(result.exitCode, 0, `${v} should exit 0`);
-    assert.equal(result.stdout, "", `${v} should be silent, got: ${result.stdout}`);
+    expect(result.exitCode, `${v} should exit 0`).toBe(0);
+    expect(result.stdout, `${v} should be silent, got: ${result.stdout}`).toBe("");
   }
 });
 
@@ -329,15 +329,15 @@ test("PS auto-var: $PSVersionTable (mixed-case) does NOT partial-match warn $PSV
   const result = await runHook(
     makeStdin("PowerShell", "Write-Host $PSVersionTable", process.cwd())
   );
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 test("PS auto-var: $PSScriptRoot and $MyInvocation (mixed-case) do NOT warn", async () => {
   for (const v of ["$PSScriptRoot", "$MyInvocation"]) {
     const result = await runHook(makeStdin("PowerShell", `Write-Host ${v}`, process.cwd()));
-    assert.equal(result.exitCode, 0, `${v} should exit 0`);
-    assert.equal(result.stdout, "", `${v} should be silent, got: ${result.stdout}`);
+    expect(result.exitCode, `${v} should exit 0`).toBe(0);
+    expect(result.stdout, `${v} should be silent, got: ${result.stdout}`).toBe("");
   }
 });
 
@@ -354,8 +354,8 @@ test("AC-4: output is always decision=approve, never decision=block", async () =
     const result = await runHook(stdin);
     if (result.stdout !== "") {
       const parsed = JSON.parse(result.stdout);
-      assert.notEqual(parsed.decision, "block", `Got block decision for: ${stdin}`);
-      assert.equal(parsed.decision, "approve");
+      expect(parsed.decision, `Got block decision for: ${stdin}`).not.toBe("block");
+      expect(parsed.decision).toBe("approve");
     }
   }
 });
diff --git a/crew/tests/projects-root-override.test.mts b/crew/tests/projects-root-override.test.mts
index 204bc036..b9b1e5b3 100644
--- a/crew/tests/projects-root-override.test.mts
+++ b/crew/tests/projects-root-override.test.mts
@@ -3,8 +3,7 @@
 // AC: listActiveProjectDirs respects CREW_PROJECTS_ROOT environment variable instead of
 // scanning the user's real ~/.claude/projects directory.
 
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -73,12 +72,10 @@ test("listActiveProjectDirs respects CREW_PROJECTS_ROOT environment variable", a
     });
 
     // Verify only our fixture project is found
-    assert.equal(active.length, 1, "Expected exactly one active project");
-    assert.equal(active[0]?.slug, "test-project-1", "Expected fixture slug");
-    assert.equal(
-      active[0]?.dir,
-      path.join(fixtureRoot, "test-project-1"),
-      "Expected dir to point to fixture"
+    expect(active.length, "Expected exactly one active project").toBe(1);
+    expect(active[0]?.slug, "Expected fixture slug").toBe("test-project-1");
+    expect(active[0]?.dir, "Expected dir to point to fixture").toBe(
+      path.join(fixtureRoot, "test-project-1")
     );
   } finally {
     // Restore env var and cleanup
@@ -116,7 +113,7 @@ test("listActiveProjectDirs falls back to ~/.claude/projects when CREW_PROJECTS_
 
     // Confirm the fallback branch actually resolved against the fake home,
     // proving CREW_PROJECTS_ROOT-unset really took the ~/.claude/projects path.
-    assert.equal(getProjectsRoot(), path.join(fakeHome, ".claude", "projects"));
+    expect(getProjectsRoot()).toBe(path.join(fakeHome, ".claude", "projects"));
 
     // Query with a window guaranteed to have no activity anywhere
     // (far past and future times that won't match real sessions)
@@ -130,8 +127,8 @@ test("listActiveProjectDirs falls back to ~/.claude/projects when CREW_PROJECTS_
       endMs: veryOldEnd
     });
 
-    assert.ok(Array.isArray(active), "Should return an array even without env var");
-    assert.equal(active.length, 0, "Should have no activity when home has no .claude/projects");
+    expect(Array.isArray(active), "Should return an array even without env var").toBeTruthy();
+    expect(active.length, "Should have no activity when home has no .claude/projects").toBe(0);
   } finally {
     // Restore env vars
     if (originalEnv !== undefined) {
diff --git a/crew/tests/prune-artifacts.test.mts b/crew/tests/prune-artifacts.test.mts
index ceb57c8c..19a7ff44 100644
--- a/crew/tests/prune-artifacts.test.mts
+++ b/crew/tests/prune-artifacts.test.mts
@@ -4,14 +4,13 @@ import path from "node:path";
 import { execFile as execFileCallback } from "node:child_process";
 import { fileURLToPath } from "node:url";
 import { promisify } from "node:util";
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import { isOlderThan, validateDays } from "../scripts/prune-artifacts.mjs";
 
 const execFile = promisify(execFileCallback);
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
-const pruneScript = path.join(repoRoot, "scripts", "prune-artifacts.ts");
+const pruneScript = path.join(repoRoot, "scripts", "prune-artifacts.mts");
 
 const DAY_MS = 86_400_000;
 const NOW = 1_000_000 * DAY_MS; // arbitrary fixed "now"
@@ -20,61 +19,61 @@ const NOW = 1_000_000 * DAY_MS; // arbitrary fixed "now"
 
 test("isOlderThan: returns true when file is exactly one day older than threshold", () => {
   const mtime = NOW - 91 * DAY_MS; // 91 days old, threshold 90
-  assert.equal(isOlderThan(mtime, NOW, 90), true);
+  expect(isOlderThan(mtime, NOW, 90)).toBe(true);
 });
 
 test("isOlderThan: returns false when file is newer than threshold", () => {
   const mtime = NOW - 30 * DAY_MS; // 30 days old, threshold 90
-  assert.equal(isOlderThan(mtime, NOW, 90), false);
+  expect(isOlderThan(mtime, NOW, 90)).toBe(false);
 });
 
 test("isOlderThan: returns false when file mtime equals the threshold boundary", () => {
   const mtime = NOW - 90 * DAY_MS; // exactly at the boundary — not older
-  assert.equal(isOlderThan(mtime, NOW, 90), false);
+  expect(isOlderThan(mtime, NOW, 90)).toBe(false);
 });
 
 test("isOlderThan: returns true for very old files (mtime = 0)", () => {
-  assert.equal(isOlderThan(0, NOW, 90), true);
+  expect(isOlderThan(0, NOW, 90)).toBe(true);
 });
 
 test("isOlderThan: returns false when mtime equals nowMs (file from now)", () => {
-  assert.equal(isOlderThan(NOW, NOW, 1), false);
+  expect(isOlderThan(NOW, NOW, 1)).toBe(false);
 });
 
 test("isOlderThan: works with threshold of 1 day", () => {
   const mtime = NOW - 2 * DAY_MS; // 2 days old, threshold 1
-  assert.equal(isOlderThan(mtime, NOW, 1), true);
+  expect(isOlderThan(mtime, NOW, 1)).toBe(true);
 });
 
 test("isOlderThan: works with large threshold (365 days)", () => {
   const mtime = NOW - 364 * DAY_MS; // 364 days old, threshold 365
-  assert.equal(isOlderThan(mtime, NOW, 365), false);
+  expect(isOlderThan(mtime, NOW, 365)).toBe(false);
 });
 
 test("isOlderThan: works with large threshold when file is past it", () => {
   const mtime = NOW - 366 * DAY_MS; // 366 days old, threshold 365
-  assert.equal(isOlderThan(mtime, NOW, 365), true);
+  expect(isOlderThan(mtime, NOW, 365)).toBe(true);
 });
 
 // validateDays — float and invalid input rejection
 test("validateDays: accepts positive integer", () => {
-  assert.equal(validateDays(90), null);
+  expect(validateDays(90)).toBe(null);
 });
 
 test("validateDays: rejects float (1.5)", () => {
-  assert.notEqual(validateDays(1.5), null);
+  expect(validateDays(1.5)).not.toBe(null);
 });
 
 test("validateDays: rejects zero", () => {
-  assert.notEqual(validateDays(0), null);
+  expect(validateDays(0)).not.toBe(null);
 });
 
 test("validateDays: rejects negative", () => {
-  assert.notEqual(validateDays(-5), null);
+  expect(validateDays(-5)).not.toBe(null);
 });
 
 test("validateDays: rejects NaN", () => {
-  assert.notEqual(validateDays(NaN), null);
+  expect(validateDays(NaN)).not.toBe(null);
 });
 
 // ---------------------------------------------------------------------------
@@ -112,14 +111,14 @@ test("--dry-run: prints would-delete list and does NOT delete the file", async (
   );
 
   // Should mention the file path
-  assert.match(stdout, /would delete/, "--dry-run output should contain 'would delete'");
-  assert.match(stdout, /old-handoff\.md/, "--dry-run output should list the file name");
+  expect(stdout, "--dry-run output should contain 'would delete'").toMatch(/would delete/);
+  expect(stdout, "--dry-run output should list the file name").toMatch(/old-handoff\.md/);
   // Summary line
-  assert.match(stdout, /dry-run.*1 file/, "--dry-run summary should report 1 file");
+  expect(stdout, "--dry-run summary should report 1 file").toMatch(/dry-run.*1 file/);
 
   // File must still exist
   const stat = await fs.stat(oldFile);
-  assert.ok(stat.isFile(), "--dry-run must NOT delete the file");
+  expect(stat.isFile(), "--dry-run must NOT delete the file").toBeTruthy();
 });
 
 test("--dry-run: exits 0 even when files are found", async () => {
@@ -140,7 +139,7 @@ test("--dry-run: exits 0 even when files are found", async () => {
   );
 
   // execFile resolves (does not throw) only when exit code is 0
-  assert.ok(result, "process should exit 0 in --dry-run mode");
+  expect(result, "process should exit 0 in --dry-run mode").toBeTruthy();
 });
 
 test("without --dry-run: actually deletes old files", async () => {
@@ -152,12 +151,14 @@ test("without --dry-run: actually deletes old files", async () => {
     { encoding: "utf8" }
   );
 
-  assert.match(stdout, /deleted.*1 file/, "destructive run should report 1 deleted file");
+  expect(stdout, "destructive run should report 1 deleted file").toMatch(/deleted.*1 file/);
 
   // File must be gone
-  await assert.rejects(
-    () => fs.stat(oldFile),
-    (err: NodeJS.ErrnoException) => err.code === "ENOENT",
-    "file should have been deleted"
-  );
+  let caughtErr: NodeJS.ErrnoException | undefined;
+  try {
+    await fs.stat(oldFile);
+  } catch (err) {
+    caughtErr = err as NodeJS.ErrnoException;
+  }
+  expect(caughtErr?.code, "file should have been deleted").toBe("ENOENT");
 });
diff --git a/crew/tests/regression.test.mts b/crew/tests/regression.test.mts
index 2f9ffa87..2d1e84e3 100644
--- a/crew/tests/regression.test.mts
+++ b/crew/tests/regression.test.mts
@@ -12,8 +12,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { execFile as execFileCallback } from "node:child_process";
 import { fileURLToPath, pathToFileURL } from "node:url";
 import { promisify } from "node:util";
@@ -28,7 +27,7 @@ async function makeTempDir(prefix: string) {
 
 async function initRepo(prefix: string) {
   const repoPath = await makeTempDir(prefix);
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", repoPath]);
+  await execFile("bun", [cliPath, "init", "--repo", repoPath]);
   return repoPath;
 }
 
@@ -45,7 +44,7 @@ test("BUG-A: concurrent claims on disjoint files do not lose data (5-way paralle
   const promises = [];
   for (let i = 0; i < parallelCount; i += 1) {
     promises.push(
-      execFile("node", [
+      execFile("bun", [
         cliPath,
         "claim",
         "--repo",
@@ -58,22 +57,20 @@ test("BUG-A: concurrent claims on disjoint files do not lose data (5-way paralle
   }
   await Promise.all(promises);
 
-  const showOutput = await execFile("node", [
-    "--experimental-strip-types",
+  const showOutput = await execFile("bun", [
     cliPath,
     "show-claims",
     "--repo",
     repoPath
   ]);
   const showResult = JSON.parse(showOutput.stdout);
-  assert.equal(
+  expect(
     showResult.claims.length,
-    parallelCount,
     `expected ${parallelCount} claims after parallel acquire, got ${showResult.claims.length} (race regression)`
-  );
+  ).toBe(parallelCount);
 
   const owners = new Set(showResult.claims.map((c: { owner: string }) => c.owner));
-  assert.equal(owners.size, parallelCount, "each parallel claim should have a distinct owner");
+  expect(owners.size, "each parallel claim should have a distinct owner").toBe(parallelCount);
 });
 
 test("BUG-A: concurrent releases do not corrupt claims state", async () => {
@@ -85,7 +82,7 @@ test("BUG-A: concurrent releases do not corrupt claims state", async () => {
 
   // Pre-populate sequentially (no race exposure during setup).
   for (let i = 0; i < count; i += 1) {
-    await execFile("node", [
+    await execFile("bun", [
       cliPath,
       "claim",
       "--repo",
@@ -100,8 +97,7 @@ test("BUG-A: concurrent releases do not corrupt claims state", async () => {
   const promises = [];
   for (let i = 0; i < count; i += 1) {
     promises.push(
-      execFile("node", [
-        "--experimental-strip-types",
+      execFile("bun", [
         cliPath,
         "release",
         "--repo",
@@ -114,19 +110,17 @@ test("BUG-A: concurrent releases do not corrupt claims state", async () => {
   }
   await Promise.all(promises);
 
-  const showOutput = await execFile("node", [
-    "--experimental-strip-types",
+  const showOutput = await execFile("bun", [
     cliPath,
     "show-claims",
     "--repo",
     repoPath
   ]);
   const showResult = JSON.parse(showOutput.stdout);
-  assert.equal(
+  expect(
     showResult.claims.length,
-    0,
     `expected 0 claims after parallel release, got ${showResult.claims.length}`
-  );
+  ).toBe(0);
 });
 
 test("BUG-B: write-run-brief archives the previous run instead of destroying it", async () => {
@@ -139,7 +133,7 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
   // preserving its title, status, and gate state for retrieval.
   const repoPath = await initRepo("crew-bug-b-run-brief-archive-");
 
-  await execFile("node", [
+  await execFile("bun", [
     cliPath,
     "write-run-brief",
     "--repo",
@@ -152,7 +146,7 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
     "single-session"
   ]);
 
-  await execFile("node", [
+  await execFile("bun", [
     cliPath,
     "mark-badge",
     "--repo",
@@ -164,24 +158,22 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
   ]);
 
   // Sanity: pending gate exists on the first run.
-  let stateOutput = await execFile("node", [
-    "--experimental-strip-types",
+  let stateOutput = await execFile("bun", [
     cliPath,
     "show-workflow-state",
     "--repo",
     repoPath
   ]);
   let state = JSON.parse(stateOutput.stdout);
-  assert.equal(state.workflowState.currentRun.title, "First run");
-  assert.equal(state.workflowState.currentRun.gates.review.status, "required");
-  assert.equal(
+  expect(state.workflowState.currentRun.title).toBe("First run");
+  expect(state.workflowState.currentRun.gates.review.status).toBe("required");
+  expect(
     state.workflowState.recentRuns.length,
-    0,
     "archive should be empty before second brief"
-  );
+  ).toBe(0);
 
   // Write a second run brief. The first run must be archived, not destroyed.
-  await execFile("node", [
+  await execFile("bun", [
     cliPath,
     "write-run-brief",
     "--repo",
@@ -194,8 +186,7 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
     "assisted single-session"
   ]);
 
-  stateOutput = await execFile("node", [
-    "--experimental-strip-types",
+  stateOutput = await execFile("bun", [
     cliPath,
     "show-workflow-state",
     "--repo",
@@ -203,23 +194,21 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
   ]);
   state = JSON.parse(stateOutput.stdout);
 
-  assert.equal(state.workflowState.currentRun.title, "Second run");
-  assert.equal(state.workflowState.currentRun.goal, "Second goal");
-  assert.equal(
+  expect(state.workflowState.currentRun.title).toBe("Second run");
+  expect(state.workflowState.currentRun.goal).toBe("Second goal");
+  expect(
     state.workflowState.recentRuns.length,
-    1,
     "first run should be archived to recentRuns"
-  );
+  ).toBe(1);
 
   const archived = state.workflowState.recentRuns[0];
-  assert.equal(archived.title, "First run");
-  assert.equal(archived.goal, "First goal");
+  expect(archived.title).toBe("First run");
+  expect(archived.goal).toBe("First goal");
   // The pending gate state on the first run must survive the archive.
-  assert.equal(
+  expect(
     archived.gates.review.status,
-    "required",
     "pending review_required gate must be preserved in archive"
-  );
+  ).toBe("required");
 });
 
 test("BUG-B: multiple sequential run briefs cap at MAX_RECENT_RUNS without dropping the current run", async () => {
@@ -229,7 +218,7 @@ test("BUG-B: multiple sequential run briefs cap at MAX_RECENT_RUNS without dropp
   const repoPath = await initRepo("crew-bug-b-archive-cap-");
 
   for (let i = 0; i < 7; i += 1) {
-    await execFile("node", [
+    await execFile("bun", [
       cliPath,
       "write-run-brief",
       "--repo",
@@ -241,8 +230,7 @@ test("BUG-B: multiple sequential run briefs cap at MAX_RECENT_RUNS without dropp
     ]);
   }
 
-  const stateOutput = await execFile("node", [
-    "--experimental-strip-types",
+  const stateOutput = await execFile("bun", [
     cliPath,
     "show-workflow-state",
     "--repo",
@@ -250,13 +238,13 @@ test("BUG-B: multiple sequential run briefs cap at MAX_RECENT_RUNS without dropp
   ]);
   const state = JSON.parse(stateOutput.stdout);
 
-  assert.equal(state.workflowState.currentRun.title, "Run 7");
+  expect(state.workflowState.currentRun.title).toBe("Run 7");
   // MAX_RECENT_RUNS is 5 in workflow-state.mjs; the archive ring should hold
   // the 5 most recent prior runs (Run 6, Run 5, Run 4, Run 3, Run 2). Run 1
   // falls off the cold edge.
-  assert.equal(state.workflowState.recentRuns.length, 5);
-  assert.equal(state.workflowState.recentRuns[0].title, "Run 6");
-  assert.equal(state.workflowState.recentRuns[4].title, "Run 2");
+  expect(state.workflowState.recentRuns.length).toBe(5);
+  expect(state.workflowState.recentRuns[0].title).toBe("Run 6");
+  expect(state.workflowState.recentRuns[4].title).toBe("Run 2");
 });
 
 test("BUG-C: validation-result artifact uses the single reachable schema only", async () => {
@@ -277,7 +265,7 @@ test("BUG-C: validation-result artifact uses the single reachable schema only",
   // output, something went wrong.
   const repoPath = await initRepo("crew-bug-c-validation-result-schema-");
 
-  const output = await execFile("node", [
+  const output = await execFile("bun", [
     cliPath,
     "write-validation-result",
     "--repo",
@@ -293,13 +281,13 @@ test("BUG-C: validation-result artifact uses the single reachable schema only",
   const body = await fs.readFile(result.path, "utf8");
 
   // Reachable schema fields (from the first, active branch in artifacts.mjs):
-  assert.match(body, /# Validation Result: Schema check/);
-  assert.match(body, /Files \/ Surfaces Checked/);
-  assert.match(body, /Evidence Collected/);
+  expect(body).toMatch(/# Validation Result: Schema check/);
+  expect(body).toMatch(/Files \/ Surfaces Checked/);
+  expect(body).toMatch(/Evidence Collected/);
 
   // Dead-branch fields that should never appear in real output:
-  assert.doesNotMatch(body, /Executed Evidence/);
-  assert.doesNotMatch(body, /Inferred Confidence/);
+  expect(body).not.toMatch(/Executed Evidence/);
+  expect(body).not.toMatch(/Inferred Confidence/);
 });
 
 test("BUG-C: deployment-result is no longer a supported artifact kind (dead branch removed)", async () => {
@@ -313,8 +301,8 @@ test("BUG-C: deployment-result is no longer a supported artifact kind (dead bran
   const repoPath = await initRepo("crew-bug-c-deployment-result-removed-");
 
   const result = await writeArtifact(repoPath, "deployment-result", { title: "Should fail" });
-  assert.strictEqual(result.ok, false);
-  assert.match(result.error.message, /Unsupported artifact kind: deployment-result/);
+  expect(result.ok).toBe(false);
+  expect(result.error.message).toMatch(/Unsupported artifact kind: deployment-result/);
 });
 
 test("BUG-E: discover-deployment uses POSIX separators in clue paths on all platforms", async () => {
@@ -350,8 +338,7 @@ test("BUG-E: discover-deployment uses POSIX separators in clue paths on all plat
   await fs.mkdir(path.join(repoPath, "terraform"), { recursive: true });
   await fs.writeFile(path.join(repoPath, "terraform", "main.tf"), "// terraform\n");
 
-  const output = await execFile("node", [
-    "--experimental-strip-types",
+  const output = await execFile("bun", [
     cliPath,
     "discover-deployment",
     "--repo",
@@ -360,22 +347,25 @@ test("BUG-E: discover-deployment uses POSIX separators in clue paths on all plat
   const result = JSON.parse(output.stdout);
 
   // Each classifier branch should produce its expected clue:
-  assert.ok(
+  expect(
     result.clues.includes(".github/workflows/deploy.yml"),
     "github workflow not discovered"
-  );
-  assert.ok(result.clues.includes(".circleci/config.yml"), "circleci config not discovered");
-  assert.ok(result.clues.includes("Dockerfile"), "Dockerfile not discovered");
-  assert.ok(result.clues.includes("infra/k8s/deploy.yaml"), "infra k8s manifest not discovered");
-  assert.ok(result.clues.includes("terraform/main.tf"), "terraform config not discovered");
+  ).toBeTruthy();
+  expect(result.clues.includes(".circleci/config.yml"), "circleci config not discovered").toBeTruthy();
+  expect(result.clues.includes("Dockerfile"), "Dockerfile not discovered").toBeTruthy();
+  expect(
+    result.clues.includes("infra/k8s/deploy.yaml"),
+    "infra k8s manifest not discovered"
+  ).toBeTruthy();
+  expect(result.clues.includes("terraform/main.tf"), "terraform config not discovered").toBeTruthy();
 
   // No clue should contain a backslash. This is the regression catcher:
   // on Windows pre-fix, every nested-path clue contained backslashes.
   for (const clue of result.clues) {
-    assert.ok(
+    expect(
       !clue.includes("\\"),
       `clue contains backslash separator, expected POSIX forward slash: ${clue}`
-    );
+    ).toBeTruthy();
   }
 });
 
@@ -400,8 +390,7 @@ test("BUG-E: file fixtures with directory paths under deployment hints are disco
     await fs.writeFile(path.join(repoPath, dir, file), "content\n");
   }
 
-  const output = await execFile("node", [
-    "--experimental-strip-types",
+  const output = await execFile("bun", [
     cliPath,
     "discover-deployment",
     "--repo",
@@ -411,10 +400,10 @@ test("BUG-E: file fixtures with directory paths under deployment hints are disco
 
   for (const [dir, file] of hints) {
     const expected = `${dir}/${file}`;
-    assert.ok(
+    expect(
       result.clues.includes(expected),
       `deployment-hint clue not discovered: ${expected} (got: ${JSON.stringify(result.clues)})`
-    );
+    ).toBeTruthy();
   }
 });
 
@@ -425,7 +414,7 @@ test("BUG-E: file fixtures with directory paths under deployment hints are disco
 test("CLI: -- terminates flag parsing and preserves dash-prefixed positionals", async () => {
   const repoPath = await initRepo("crew-cli-double-dash-");
 
-  const output = await execFile("node", [
+  const output = await execFile("bun", [
     cliPath,
     "claim",
     "--repo",
@@ -436,8 +425,8 @@ test("CLI: -- terminates flag parsing and preserves dash-prefixed positionals",
   ]);
   const result = JSON.parse(output.stdout);
 
-  assert.deepEqual(result.claimed, ["-tricky.md", "normal.md"]);
-  assert.deepEqual(result.conflicts, []);
+  expect(result.claimed).toEqual(["-tricky.md", "normal.md"]);
+  expect(result.conflicts).toEqual([]);
 });
 
 // ---------------------------------------------------------------------------
@@ -453,9 +442,9 @@ test("AC-6: claimFiles returns err() when repo path escapes repo boundary", asyn
   const repoPath = await makeTempDir("crew-ac6-claimfiles-err-");
   // "../../outside" resolves outside the repo root → toRepoRelative throws
   const result = await claimFiles(repoPath, ["../../outside.txt"], { owner: "test" });
-  assert.equal(result.ok, false, "expected err() for out-of-repo path");
-  assert.ok(result.error instanceof Error, "error should be an Error instance");
-  assert.match(result.error.message, /repo/i, "error should mention repo boundary");
+  expect(result.ok, "expected err() for out-of-repo path").toBe(false);
+  expect(result.error instanceof Error, "error should be an Error instance").toBeTruthy();
+  expect(result.error.message, "error should mention repo boundary").toMatch(/repo/i);
 });
 
 test("AC-6: releaseFiles returns err() when repo path escapes repo boundary", async () => {
@@ -465,8 +454,8 @@ test("AC-6: releaseFiles returns err() when repo path escapes repo boundary", as
   const repoPath = await makeTempDir("crew-ac6-releasefiles-err-");
   // releaseFiles calls toRepoRelative on explicit paths, so same boundary guard
   const result = await releaseFiles(repoPath, ["../../outside.txt"], { owner: "test" });
-  assert.equal(result.ok, false, "expected err() for out-of-repo path");
-  assert.ok(result.error instanceof Error, "error should be an Error instance");
+  expect(result.ok, "expected err() for out-of-repo path").toBe(false);
+  expect(result.error instanceof Error, "error should be an Error instance").toBeTruthy();
 });
 
 test("AC-6: resolveApproval returns err() for unknown approval id", async () => {
@@ -479,9 +468,9 @@ test("AC-6: resolveApproval returns err() for unknown approval id", async () =>
     decision: "approved",
     resolver: "test"
   });
-  assert.equal(result.ok, false, "expected err() for unknown approval id");
-  assert.ok(result.error instanceof Error, "error should be an Error instance");
-  assert.match(result.error.message, /unknown approval id/i);
+  expect(result.ok, "expected err() for unknown approval id").toBe(false);
+  expect(result.error instanceof Error, "error should be an Error instance").toBeTruthy();
+  expect(result.error.message).toMatch(/unknown approval id/i);
 });
 
 test("AC-6: markWorkflowBadge returns err() when badge option is missing", async () => {
@@ -491,7 +480,7 @@ test("AC-6: markWorkflowBadge returns err() when badge option is missing", async
   const repoPath = await makeTempDir("crew-ac6-markbadge-err-");
   // badge is required; omitting it triggers the validation throw
   const result = await markWorkflowBadge(repoPath, {});
-  assert.equal(result.ok, false, "expected err() when badge is missing");
-  assert.ok(result.error instanceof Error, "error should be an Error instance");
-  assert.match(result.error.message, /badge/i);
+  expect(result.ok, "expected err() when badge is missing").toBe(false);
+  expect(result.error instanceof Error, "error should be an Error instance").toBeTruthy();
+  expect(result.error.message).toMatch(/badge/i);
 });
diff --git a/crew/tests/render-routing-table.test.mts b/crew/tests/render-routing-table.test.mts
index bff875d0..78442a79 100644
--- a/crew/tests/render-routing-table.test.mts
+++ b/crew/tests/render-routing-table.test.mts
@@ -1,6 +1,5 @@
 // tests/render-routing-table.test.ts — FEAT-crew-architecture-review Section 7
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { render } from "../scripts/render-routing-table.mjs";
 import type { RoutingRow } from "../scripts/lib/routing/schema.mjs";
 
@@ -20,15 +19,15 @@ const WORKFLOW_ROW: RoutingRow = {
 
 test("renders the builder-matrix table with its own column headers", () => {
   const md = render([BUILDER_ROW]);
-  assert.match(md, /\| Tags resolve to \| Changed-file signal \| Builder dispatch \|/);
-  assert.match(md, /`surface:ui` OR `stack:react` only/);
+  expect(md).toMatch(/\| Tags resolve to \| Changed-file signal \| Builder dispatch \|/);
+  expect(md).toMatch(/`surface:ui` OR `stack:react` only/);
 });
 
 test("renders other sections with Signal / Route to / Notes headers", () => {
   const md = render([BUILDER_ROW, WORKFLOW_ROW]);
-  assert.match(md, /### Workflow signals/);
-  assert.match(md, /\| Signal \| Route to \| Notes \|/);
-  assert.match(md, /\*\*New feature request\*\*/);
+  expect(md).toMatch(/### Workflow signals/);
+  expect(md).toMatch(/\| Signal \| Route to \| Notes \|/);
+  expect(md).toMatch(/\*\*New feature request\*\*/);
 });
 
 test("escapes a literal pipe inside a cell so the table stays well-formed", () => {
@@ -39,13 +38,13 @@ test("escapes a literal pipe inside a cell so the table stays well-formed", () =
     notes: "n/a"
   };
   const md = render([row]);
-  assert.match(md, /matches `\(auth\\\|login\\\|signin\)`/);
+  expect(md).toMatch(/matches `\(auth\\\|login\\\|signin\)`/);
   // Sanity: the row still renders as exactly one table line (3 cells + delimiters).
   // Escaped pipes (`\|`) are literal cell content, not delimiters — strip them
   // before counting so the split reflects only the real cell boundaries.
   const rowLine = md.split("\n").find((l) => l.includes("matches"));
-  assert.ok(rowLine);
-  assert.equal(rowLine?.replace(/\\\|/g, "").split("|").length, 5); // leading + 3 cells + trailing
+  expect(rowLine).toBeTruthy();
+  expect(rowLine?.replace(/\\\|/g, "").split("|").length).toBe(5); // leading + 3 cells + trailing
 });
 
 test("preserves a section with no notes on a row (empty cell, not 'undefined')", () => {
@@ -55,12 +54,12 @@ test("preserves a section with no notes on a row (empty cell, not 'undefined')",
     route_to: "dispatcher"
   };
   const md = render([row]);
-  assert.doesNotMatch(md, /undefined/);
+  expect(md).not.toMatch(/undefined/);
 });
 
 test("render output is stable across repeated calls (deterministic)", () => {
   const rows = [BUILDER_ROW, WORKFLOW_ROW];
-  assert.equal(render(rows), render(rows));
+  expect(render(rows)).toBe(render(rows));
 });
 
 test("includes the static docs-comms migration note ahead of that section's table", () => {
@@ -70,14 +69,14 @@ test("includes the static docs-comms migration note ahead of that section's tabl
   // comms heading first and only look for the table after it — an earlier
   // section's empty "| Signal | Route to | Notes |" header must not count.
   const docsCommsIdx = md.indexOf("### Docs & comms");
-  assert.ok(noteIdx > -1, "migration note missing");
-  assert.ok(docsCommsIdx > -1, "Docs & comms heading missing");
+  expect(noteIdx > -1, "migration note missing").toBeTruthy();
+  expect(docsCommsIdx > -1, "Docs & comms heading missing").toBeTruthy();
   const tableIdx = md.indexOf("| Signal | Route to | Notes |", docsCommsIdx);
-  assert.ok(tableIdx > noteIdx, "table should follow the migration note");
+  expect(tableIdx > noteIdx, "table should follow the migration note").toBeTruthy();
 });
 
 test("includes the Usage and Design principles footer", () => {
   const md = render([WORKFLOW_ROW]);
-  assert.match(md, /## Usage/);
-  assert.match(md, /## Design principles/);
+  expect(md).toMatch(/## Usage/);
+  expect(md).toMatch(/## Design principles/);
 });
diff --git a/crew/tests/render-universal-skills.test.mts b/crew/tests/render-universal-skills.test.mts
index 4d76f878..ef5605ec 100644
--- a/crew/tests/render-universal-skills.test.mts
+++ b/crew/tests/render-universal-skills.test.mts
@@ -24,7 +24,7 @@ import {
 
 const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
 const FIXTURES_DIR = path.join(REPO_ROOT, "tests", "fixtures", "universals");
-const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "render-universal-skills.ts");
+const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "render-universal-skills.mts");
 
 // ── Helpers ───────────────────────────────────────────────────────────────────
 
diff --git a/crew/tests/resolve-model.test.mts b/crew/tests/resolve-model.test.mts
index 6cbd0d27..36a2fb3a 100644
--- a/crew/tests/resolve-model.test.mts
+++ b/crew/tests/resolve-model.test.mts
@@ -3,8 +3,7 @@
 // Covers scripts/lib/models/resolve-model.ts, the dev-team-local mirror of
 // runner-plugin's model-router (resolveModel / resolveShapeTier /
 // resolveWaveDispatchModel in runner-plugin/src/scripts/lib/model-router.mts).
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import {
   resolveModelForPhase,
   resolveShapeTier,
@@ -26,54 +25,54 @@ const COMMITTED_ROUTING = {
 };
 
 test("resolveModelForPhase: build resolves to sonnet under the committed routing", () => {
-  assert.equal(resolveModelForPhase("build", COMMITTED_ROUTING), "sonnet");
+  expect(resolveModelForPhase("build", COMMITTED_ROUTING)).toBe("sonnet");
 });
 
 test("resolveModelForPhase: architect resolves to opus under the committed routing", () => {
-  assert.equal(resolveModelForPhase("architect", COMMITTED_ROUTING), "opus");
+  expect(resolveModelForPhase("architect", COMMITTED_ROUTING)).toBe("opus");
 });
 
 test("resolveModelForPhase: falls back to opus when no modelRouting is configured", () => {
-  assert.equal(resolveModelForPhase("build", null), "opus");
-  assert.equal(resolveModelForPhase("build", {}), "opus");
-  assert.equal(resolveModelForPhase("build", { loop: {} }), "opus");
+  expect(resolveModelForPhase("build", null)).toBe("opus");
+  expect(resolveModelForPhase("build", {})).toBe("opus");
+  expect(resolveModelForPhase("build", { loop: {} })).toBe("opus");
 });
 
 test("resolveModelForPhase: falls back to routing.default when the phase key is absent", () => {
   const config = { loop: { modelRouting: { default: "sonnet" } } };
-  assert.equal(resolveModelForPhase("validate", config), "sonnet");
+  expect(resolveModelForPhase("validate", config)).toBe("sonnet");
 });
 
 test("TRIVIAL_SHAPE_TIER: routes every trivial shape to sonnet", () => {
-  assert.equal(TRIVIAL_SHAPE_TIER["doc-update"], "sonnet");
-  assert.equal(TRIVIAL_SHAPE_TIER["config-tweak"], "sonnet");
-  assert.equal(TRIVIAL_SHAPE_TIER["test-only"], "sonnet");
-  assert.equal(TRIVIAL_SHAPE_TIER["single-module-edit"], "sonnet");
+  expect(TRIVIAL_SHAPE_TIER["doc-update"]).toBe("sonnet");
+  expect(TRIVIAL_SHAPE_TIER["config-tweak"]).toBe("sonnet");
+  expect(TRIVIAL_SHAPE_TIER["test-only"]).toBe("sonnet");
+  expect(TRIVIAL_SHAPE_TIER["single-module-edit"]).toBe("sonnet");
 });
 
 test("resolveShapeTier: returns sonnet for a trivial shape regardless of config", () => {
-  assert.equal(resolveShapeTier("doc-update"), "sonnet");
+  expect(resolveShapeTier("doc-update")).toBe("sonnet");
 });
 
 test("resolveShapeTier: returns null for a non-trivial or unknown shape", () => {
-  assert.equal(resolveShapeTier("none"), null);
-  assert.equal(resolveShapeTier("unknown-shape"), null);
-  assert.equal(resolveShapeTier(null), null);
-  assert.equal(resolveShapeTier(undefined), null);
+  expect(resolveShapeTier("none")).toBe(null);
+  expect(resolveShapeTier("unknown-shape")).toBe(null);
+  expect(resolveShapeTier(null)).toBe(null);
+  expect(resolveShapeTier(undefined)).toBe(null);
 });
 
 test("resolveDispatchModel: trivial shape wins even when phase routing points elsewhere", () => {
   const config = { loop: { modelRouting: { build: "opus", default: "opus" } } };
-  assert.equal(resolveDispatchModel("build", "doc-update", config), "sonnet");
+  expect(resolveDispatchModel("build", "doc-update", config)).toBe("sonnet");
 });
 
 test("resolveDispatchModel: falls through to phase-based routing for a non-trivial shape", () => {
-  assert.equal(resolveDispatchModel("build", "none", COMMITTED_ROUTING), "sonnet");
-  assert.equal(resolveDispatchModel("architect", "none", COMMITTED_ROUTING), "opus");
+  expect(resolveDispatchModel("build", "none", COMMITTED_ROUTING)).toBe("sonnet");
+  expect(resolveDispatchModel("architect", "none", COMMITTED_ROUTING)).toBe("opus");
 });
 
 test("resolveDispatchModel: falls back to opus with no shape and no config", () => {
-  assert.equal(resolveDispatchModel("build", null, null), "opus");
+  expect(resolveDispatchModel("build", null, null)).toBe("opus");
 });
 
 // FEAT-194 S1 — crew.json features["model-routing"].enabled toggle. The
@@ -81,27 +80,27 @@ test("resolveDispatchModel: falls back to opus with no shape and no config", ()
 // isEnabled() and passes it in as the 4th arg; these tests exercise the
 // pure resolution behavior directly.
 test("resolveDispatchModel: toggle omitted (default) behaves exactly as before — routing on", () => {
-  assert.equal(resolveDispatchModel("build", null, COMMITTED_ROUTING), "sonnet");
-  assert.equal(resolveDispatchModel("architect", null, COMMITTED_ROUTING), "opus");
+  expect(resolveDispatchModel("build", null, COMMITTED_ROUTING)).toBe("sonnet");
+  expect(resolveDispatchModel("architect", null, COMMITTED_ROUTING)).toBe("opus");
 });
 
 test("resolveDispatchModel: toggle explicitly true — routing on, same as default", () => {
-  assert.equal(resolveDispatchModel("build", null, COMMITTED_ROUTING, true), "sonnet");
+  expect(resolveDispatchModel("build", null, COMMITTED_ROUTING, true)).toBe("sonnet");
 });
 
 test("resolveDispatchModel: toggle false — returns null (omit model:, agent frontmatter governs)", () => {
-  assert.equal(resolveDispatchModel("build", null, COMMITTED_ROUTING, false), null);
-  assert.equal(resolveDispatchModel("architect", null, COMMITTED_ROUTING, false), null);
+  expect(resolveDispatchModel("build", null, COMMITTED_ROUTING, false)).toBe(null);
+  expect(resolveDispatchModel("architect", null, COMMITTED_ROUTING, false)).toBe(null);
 });
 
 test("resolveDispatchModel: toggle false — bypasses the trivial-shape override too", () => {
-  assert.equal(resolveDispatchModel("build", "doc-update", COMMITTED_ROUTING, false), null);
+  expect(resolveDispatchModel("build", "doc-update", COMMITTED_ROUTING, false)).toBe(null);
 });
 
 test("resolveDispatchModel: loop.modelRouting.enabled false — returns null even with toggle on", () => {
   const disabledConfig = {
     loop: { modelRouting: { enabled: false, build: "sonnet", default: "sonnet" } }
   };
-  assert.equal(resolveDispatchModel("build", null, disabledConfig), null);
-  assert.equal(resolveDispatchModel("build", "doc-update", disabledConfig), null);
+  expect(resolveDispatchModel("build", null, disabledConfig)).toBe(null);
+  expect(resolveDispatchModel("build", "doc-update", disabledConfig)).toBe(null);
 });
diff --git a/crew/tests/result.test.mts b/crew/tests/result.test.mts
index 8b96d782..8b529768 100644
--- a/crew/tests/result.test.mts
+++ b/crew/tests/result.test.mts
@@ -1,29 +1,28 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { ok, err, map, flatMap, type Result } from "../scripts/lib/result.mjs";
 
 test("ok wraps a value", () => {
   const r = ok(42);
-  assert.equal(r.ok, true);
-  if (r.ok) assert.equal(r.value, 42);
+  expect(r.ok).toBe(true);
+  if (r.ok) expect(r.value).toBe(42);
 });
 
 test("err wraps an error", () => {
   const r = err({ code: "oops" as const });
-  assert.equal(r.ok, false);
-  if (!r.ok) assert.deepEqual(r.error, { code: "oops" });
+  expect(r.ok).toBe(false);
+  if (!r.ok) expect(r.error).toEqual({ code: "oops" });
 });
 
 test("map transforms ok value, leaves err unchanged", () => {
   const okIn: Result<number, { code: "x" }> = ok(2);
   const mapped = map(okIn, (n) => n * 5);
-  assert.equal(mapped.ok, true);
-  if (mapped.ok) assert.equal(mapped.value, 10);
+  expect(mapped.ok).toBe(true);
+  if (mapped.ok) expect(mapped.value).toBe(10);
 
   const errIn: Result<number, { code: "x" }> = err({ code: "x" });
   const mappedErr = map(errIn, (n) => n * 5);
-  assert.equal(mappedErr.ok, false);
-  if (!mappedErr.ok) assert.deepEqual(mappedErr.error, { code: "x" });
+  expect(mappedErr.ok).toBe(false);
+  if (!mappedErr.ok) expect(mappedErr.error).toEqual({ code: "x" });
 });
 
 test("flatMap chains Result-returning functions", () => {
@@ -33,11 +32,11 @@ test("flatMap chains Result-returning functions", () => {
   };
   const startOk = ok("7") as Result<string, { code: "parse"; raw: string }>;
   const chained = flatMap(startOk, parse);
-  assert.equal(chained.ok, true);
-  if (chained.ok) assert.equal(chained.value, 7);
+  expect(chained.ok).toBe(true);
+  if (chained.ok) expect(chained.value).toBe(7);
 
   const startBad = ok("not-a-number") as Result<string, { code: "parse"; raw: string }>;
   const chainedBad = flatMap(startBad, parse);
-  assert.equal(chainedBad.ok, false);
-  if (!chainedBad.ok) assert.deepEqual(chainedBad.error, { code: "parse", raw: "not-a-number" });
+  expect(chainedBad.ok).toBe(false);
+  if (!chainedBad.ok) expect(chainedBad.error).toEqual({ code: "parse", raw: "not-a-number" });
 });
diff --git a/crew/tests/routing-schema.test.mts b/crew/tests/routing-schema.test.mts
index 0d4c04b0..3901370c 100644
--- a/crew/tests/routing-schema.test.mts
+++ b/crew/tests/routing-schema.test.mts
@@ -1,6 +1,5 @@
 // tests/routing-schema.test.ts — FEAT-crew-architecture-review Section 7
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { parseRoutingTable, RoutingTableSchema } from "../scripts/lib/routing/schema.mjs";
 
 const VALID_ROW = {
@@ -12,36 +11,36 @@ const VALID_ROW = {
 
 test("accepts a well-formed routing table", () => {
   const table = parseRoutingTable({ version: "1.0.0", rows: [VALID_ROW] });
-  assert.equal(table.version, "1.0.0");
-  assert.equal(table.rows.length, 1);
+  expect(table.version).toBe("1.0.0");
+  expect(table.rows.length).toBe(1);
 });
 
 test("notes is optional", () => {
   const { notes: _notes, ...rowWithoutNotes } = VALID_ROW;
   const table = parseRoutingTable({ version: "1.0.0", rows: [rowWithoutNotes] });
-  assert.equal(table.rows[0]?.notes, undefined);
+  expect(table.rows[0]?.notes).toBe(undefined);
 });
 
 test("rejects an unknown section enum value", () => {
-  assert.throws(() =>
+  expect(() =>
     parseRoutingTable({
       version: "1.0.0",
       rows: [{ ...VALID_ROW, section: "not-a-real-section" }]
     })
-  );
+  ).toThrow();
 });
 
 test("rejects a malformed version string", () => {
-  assert.throws(() => parseRoutingTable({ version: "not-semver", rows: [VALID_ROW] }));
+  expect(() => parseRoutingTable({ version: "not-semver", rows: [VALID_ROW] })).toThrow();
 });
 
 test("rejects an empty rows array", () => {
-  assert.throws(() => parseRoutingTable({ version: "1.0.0", rows: [] }));
+  expect(() => parseRoutingTable({ version: "1.0.0", rows: [] })).toThrow();
 });
 
 test("rejects a row missing route_to", () => {
   const { route_to: _routeTo, ...rowMissingRouteTo } = VALID_ROW;
-  assert.throws(() => parseRoutingTable({ version: "1.0.0", rows: [rowMissingRouteTo] }));
+  expect(() => parseRoutingTable({ version: "1.0.0", rows: [rowMissingRouteTo] })).toThrow();
 });
 
 test("RoutingTableSchema exposes all 10 section ids", () => {
@@ -60,5 +59,5 @@ test("RoutingTableSchema exposes all 10 section ids", () => {
       "crew-internals"
     ].map((section) => ({ ...VALID_ROW, section }))
   });
-  assert.equal(table.rows.length, 10);
+  expect(table.rows.length).toBe(10);
 });
diff --git a/crew/tests/run-crew.test.mts b/crew/tests/run-crew.test.mts
index ef4c59a3..b49bf65f 100644
--- a/crew/tests/run-crew.test.mts
+++ b/crew/tests/run-crew.test.mts
@@ -1,8 +1,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 // Lazy-import runCrew to ensure it's available after implementation
 async function importRunCrew() {
   const { runCrew } = await import("../scripts/crew.mjs");
@@ -17,8 +16,8 @@ test("runCrew(['help']) returns code 0 with usage text", async () => {
   const runCrew = await importRunCrew();
   const result = await runCrew(["help"]);
 
-  assert.equal(result.code, 0);
-  assert.match(result.output, /node scripts\/crew\.mjs/);
+  expect(result.code).toBe(0);
+  expect(result.output).toMatch(/node scripts\/crew\.mjs/);
 });
 
 test("runCrew(['unknown-command', '--repo', <tempdir>]) returns code 1 with error message", async () => {
@@ -26,8 +25,8 @@ test("runCrew(['unknown-command', '--repo', <tempdir>]) returns code 1 with erro
   const tempDir = await makeTempDir("crew-unknown-cmd-");
   const result = await runCrew(["unknown-command", "--repo", tempDir]);
 
-  assert.equal(result.code, 1);
-  assert.equal(result.output, "Unknown command: unknown-command");
+  expect(result.code).toBe(1);
+  expect(result.output).toBe("Unknown command: unknown-command");
 });
 
 test("runCrew(['init', '--repo', <tempdir>]) returns code 0 with mode: 'init'", async () => {
@@ -37,8 +36,8 @@ test("runCrew(['init', '--repo', <tempdir>]) returns code 0 with mode: 'init'",
 
   const result = await runCrew(["init", "--repo", repoPath]);
 
-  assert.equal(result.code, 0);
+  expect(result.code).toBe(0);
   const parsed = JSON.parse(result.output);
-  assert.equal(parsed.mode, "init");
-  assert.equal(parsed.audit.hasHarnessLayer, true);
+  expect(parsed.mode).toBe("init");
+  expect(parsed.audit.hasHarnessLayer).toBe(true);
 });
diff --git a/crew/tests/schemas.test.mts b/crew/tests/schemas.test.mts
index 784eff82..dd049f81 100644
--- a/crew/tests/schemas.test.mts
+++ b/crew/tests/schemas.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { readFileSync } from "node:fs";
 import { fileURLToPath } from "node:url";
 import path from "node:path";
@@ -11,17 +10,22 @@ const fixture = (name: string): unknown =>
 
 test("WorkflowStateSchema accepts a valid empty state", () => {
   const result = WorkflowStateSchema.safeParse(fixture("workflow-state-valid.json"));
-  assert.equal(result.success, true);
+  expect(result.success).toBe(true);
 });
 
 test("WorkflowStateSchema rejects malformed state and reports issues", () => {
   const result = WorkflowStateSchema.safeParse(fixture("workflow-state-invalid.json"));
-  assert.equal(result.success, false);
+  expect(result.success).toBe(false);
   if (!result.success) {
     const codes = result.error.issues.map((i) => i.path.join(".")).sort();
-    // version, updatedAt, currentRun, recentRuns all flagged
-    assert.ok(codes.includes("version"), `expected 'version' in issues: ${codes.join(", ")}`);
-    assert.ok(codes.includes("updatedAt"), `expected 'updatedAt' in issues: ${codes.join(", ")}`);
+    expect(
+      codes.includes("version"),
+      "expected version in issues: " + codes.join(", ")
+    ).toBeTruthy();
+    expect(
+      codes.includes("updatedAt"),
+      "expected updatedAt in issues: " + codes.join(", ")
+    ).toBeTruthy();
   }
 });
 
@@ -31,15 +35,13 @@ test("WorkflowStateSchema accepts the live repo workflow-state.json", () => {
   try {
     raw = readFileSync(liveStatePath, "utf8");
   } catch {
-    // OK to skip if the file does not exist in a fresh clone
     return;
   }
   const result = WorkflowStateSchema.safeParse(JSON.parse(raw));
-  assert.equal(
+  expect(
     result.success,
-    true,
     result.success
       ? ""
-      : `live workflow-state.json failed schema: ${JSON.stringify(result.error.issues, null, 2)}`
-  );
+      : "live workflow-state.json failed schema: " + JSON.stringify(result.error.issues, null, 2)
+  ).toBe(true);
 });
diff --git a/crew/tests/scope-estimate.test.mts b/crew/tests/scope-estimate.test.mts
index 3db448c5..011f813e 100644
--- a/crew/tests/scope-estimate.test.mts
+++ b/crew/tests/scope-estimate.test.mts
@@ -1,16 +1,10 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { estimateScope } from "../scripts/lib/scope-estimate.mjs";
 
-// Tier rules:
-//   light:    totalLines < 300 AND fileCount <= 2 AND no eslintDisable
-//   heavy:    totalLines > 800 OR fileCount >= 6 OR any file has eslintDisable
-//   standard: everything else
-
 test("estimateScope returns light for 1 file under 300 lines", () => {
   const result = estimateScope({ files: [{ path: "src/foo.mjs", lines: 150 }] });
-  assert.equal(result.tier, "light");
-  assert.ok(result.reason.length > 0, "must include reason");
+  expect(result.tier).toBe("light");
+  expect(result.reason.length > 0, "must include reason").toBeTruthy();
 });
 
 test("estimateScope returns light for 2 files, combined < 300", () => {
@@ -20,7 +14,7 @@ test("estimateScope returns light for 2 files, combined < 300", () => {
       { path: "b.mjs", lines: 150 }
     ]
   });
-  assert.equal(result.tier, "light");
+  expect(result.tier).toBe("light");
 });
 
 test("estimateScope returns standard for 3 files in 300-800 line range", () => {
@@ -31,7 +25,7 @@ test("estimateScope returns standard for 3 files in 300-800 line range", () => {
       { path: "c.mjs", lines: 100 }
     ]
   });
-  assert.equal(result.tier, "standard");
+  expect(result.tier).toBe("standard");
 });
 
 test("estimateScope returns heavy for total lines > 800", () => {
@@ -41,15 +35,15 @@ test("estimateScope returns heavy for total lines > 800", () => {
       { path: "b.mjs", lines: 400 }
     ]
   });
-  assert.equal(result.tier, "heavy");
-  assert.match(result.reason, /lines/i);
+  expect(result.tier).toBe("heavy");
+  expect(result.reason).toMatch(/lines/i);
 });
 
 test("estimateScope returns heavy for fileCount >= 6", () => {
-  const files = Array.from({ length: 6 }, (_, i) => ({ path: `f${i}.mjs`, lines: 50 }));
+  const files = Array.from({ length: 6 }, (_, i) => ({ path: "f" + i + ".mjs", lines: 50 }));
   const result = estimateScope({ files });
-  assert.equal(result.tier, "heavy");
-  assert.match(result.reason, /file/i);
+  expect(result.tier).toBe("heavy");
+  expect(result.reason).toMatch(/file/i);
 });
 
 test("estimateScope escalates to heavy when any file has eslintDisable flag", () => {
@@ -59,8 +53,8 @@ test("estimateScope escalates to heavy when any file has eslintDisable flag", ()
       { path: "b.mjs", lines: 80 }
     ]
   });
-  assert.equal(result.tier, "heavy");
-  assert.match(result.reason, /eslint/i);
+  expect(result.tier).toBe("heavy");
+  expect(result.reason).toMatch(/eslint/i);
 });
 
 test("estimateScope returns standard for 2 files just over 300 lines", () => {
@@ -70,12 +64,12 @@ test("estimateScope returns standard for 2 files just over 300 lines", () => {
       { path: "b.mjs", lines: 120 }
     ]
   });
-  assert.equal(result.tier, "standard");
+  expect(result.tier).toBe("standard");
 });
 
-test("estimateScope returns { tier, reason } shape on empty files", () => {
+test("estimateScope returns tier/reason shape on empty files", () => {
   const result = estimateScope({ files: [] });
-  assert.ok("tier" in result, "must have tier");
-  assert.ok("reason" in result, "must have reason");
-  assert.ok(["light", "standard", "heavy"].includes(result.tier));
+  expect("tier" in result, "must have tier").toBeTruthy();
+  expect("reason" in result, "must have reason").toBeTruthy();
+  expect(["light", "standard", "heavy"].includes(result.tier)).toBeTruthy();
 });
diff --git a/crew/tests/scripts/lib/workflow-config.test.mts b/crew/tests/scripts/lib/workflow-config.test.mts
index 3cd4769e..c2939a65 100644
--- a/crew/tests/scripts/lib/workflow-config.test.mts
+++ b/crew/tests/scripts/lib/workflow-config.test.mts
@@ -130,7 +130,7 @@ describe("workflow-config loader", () => {
 
   test("5. invalid phase order fails validate-workflows.ts CLI (exit 1, stderr contains 'phase order')", () => {
     const fixturePath = path.join(FIXTURES_DIR, "invalid-phase-order.yaml");
-    const result = spawnSync("node", [VALIDATE_SCRIPT, "--config", fixturePath], {
+    const result = spawnSync("bun", [VALIDATE_SCRIPT, "--config", fixturePath], {
       encoding: "utf8",
       cwd: REPO_ROOT
     });
diff --git a/crew/tests/security-sweep-integration.test.mts b/crew/tests/security-sweep-integration.test.mts
index 7bdbc559..2012d430 100644
--- a/crew/tests/security-sweep-integration.test.mts
+++ b/crew/tests/security-sweep-integration.test.mts
@@ -13,7 +13,7 @@ import { fileURLToPath } from "node:url";
 import { execSync, spawnSync } from "node:child_process";
 
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
-const scanScript = path.join(repoRoot, "skills", "domain", "security-sweep", "scripts", "scan.ts");
+const scanScript = path.join(repoRoot, "skills", "domain", "security-sweep", "scripts", "scan.mts");
 const fixtureSource = path.join(
   repoRoot,
   "tests",
diff --git a/crew/tests/session-cost-scanner-compute.test.mts b/crew/tests/session-cost-scanner-compute.test.mts
index 32829c21..54e52817 100644
--- a/crew/tests/session-cost-scanner-compute.test.mts
+++ b/crew/tests/session-cost-scanner-compute.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import {
   addTotals,
@@ -62,124 +61,124 @@ test("addTotals: merges two records into target", () => {
   const target = emptyTotals();
   const source = { input: 10, cache_create_5m: 2, cache_create_1h: 3, cache_read: 4, output: 5 };
   addTotals(target, source);
-  assert.deepEqual(target, source);
+  expect(target).toEqual(source);
 });
 
 test("addTotals: accumulates on a non-empty target", () => {
   const target = { input: 1, cache_create_5m: 0, cache_create_1h: 0, cache_read: 0, output: 1 };
   const source = { input: 9, cache_create_5m: 0, cache_create_1h: 0, cache_read: 0, output: 4 };
   addTotals(target, source);
-  assert.equal(target["input"], 10);
-  assert.equal(target["output"], 5);
+  expect(target["input"]).toBe(10);
+  expect(target["output"]).toBe(5);
 });
 
 test("addTotals: missing keys in source treated as 0", () => {
   const target = emptyTotals();
   addTotals(target, {});
-  assert.deepEqual(target, emptyTotals());
+  expect(target).toEqual(emptyTotals());
 });
 
 // ── percentile ─────────────────────────────────────────────────────────────
 
 test("percentile: returns 0 for empty array", () => {
-  assert.equal(percentile([], 50), 0);
+  expect(percentile([], 50)).toBe(0);
 });
 
 test("percentile: p50 on sorted odd-length array", () => {
   const arr = [10, 20, 30, 40, 50];
-  assert.equal(percentile(arr, 50), 30);
+  expect(percentile(arr, 50)).toBe(30);
 });
 
 test("percentile: p90 on 10-element array", () => {
   const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
   // floor(0.9 * 10) = 9 → index 9 → value 10
-  assert.equal(percentile(arr, 90), 10);
+  expect(percentile(arr, 90)).toBe(10);
 });
 
 test("percentile: p0 returns first element", () => {
-  assert.equal(percentile([5, 10, 15], 0), 5);
+  expect(percentile([5, 10, 15], 0)).toBe(5);
 });
 
 test("percentile: p100 returns last element", () => {
-  assert.equal(percentile([5, 10, 15], 100), 15);
+  expect(percentile([5, 10, 15], 100)).toBe(15);
 });
 
 // ── isSyntheticModel ───────────────────────────────────────────────────────
 
 test("isSyntheticModel: returns true for <synthetic>", () => {
-  assert.equal(isSyntheticModel("<synthetic>"), true);
+  expect(isSyntheticModel("<synthetic>")).toBe(true);
 });
 
 test("isSyntheticModel: returns true for < (angle-bracket prefix)", () => {
-  assert.equal(isSyntheticModel("<whatever>"), true);
+  expect(isSyntheticModel("<whatever>")).toBe(true);
 });
 
 test("isSyntheticModel: returns true for synthetic prefix", () => {
-  assert.equal(isSyntheticModel("synthetic-model"), true);
+  expect(isSyntheticModel("synthetic-model")).toBe(true);
 });
 
 test("isSyntheticModel: returns false for real model name", () => {
-  assert.equal(isSyntheticModel("claude-sonnet-4-5"), false);
+  expect(isSyntheticModel("claude-sonnet-4-5")).toBe(false);
 });
 
 test("isSyntheticModel: returns false for empty string", () => {
-  assert.equal(isSyntheticModel(""), false);
+  expect(isSyntheticModel("")).toBe(false);
 });
 
 // ── approxSize ─────────────────────────────────────────────────────────────
 
 test("approxSize: null returns 0", () => {
-  assert.equal(approxSize(null), 0);
+  expect(approxSize(null)).toBe(0);
 });
 
 test("approxSize: undefined returns 0", () => {
-  assert.equal(approxSize(undefined), 0);
+  expect(approxSize(undefined)).toBe(0);
 });
 
 test("approxSize: string returns its length", () => {
-  assert.equal(approxSize("hello"), 5);
+  expect(approxSize("hello")).toBe(5);
 });
 
 test("approxSize: object returns JSON.stringify length", () => {
   const obj = { a: 1 };
-  assert.equal(approxSize(obj), JSON.stringify(obj).length);
+  expect(approxSize(obj)).toBe(JSON.stringify(obj).length);
 });
 
 test("approxSize: array returns JSON.stringify length", () => {
   const arr = [1, 2, 3];
-  assert.equal(approxSize(arr), JSON.stringify(arr).length);
+  expect(approxSize(arr)).toBe(JSON.stringify(arr).length);
 });
 
 // ── inspectContent ─────────────────────────────────────────────────────────
 
 test("inspectContent: plain string returns textLen, no tools", () => {
   const r = inspectContent("hello world");
-  assert.equal(r.textLen, 11);
-  assert.equal(r.toolUses.length, 0);
-  assert.equal(r.toolResults.length, 0);
+  expect(r.textLen).toBe(11);
+  expect(r.toolUses.length).toBe(0);
+  expect(r.toolResults.length).toBe(0);
 });
 
 test("inspectContent: null/undefined returns empty result", () => {
   const r = inspectContent(null);
-  assert.equal(r.textLen, 0);
-  assert.equal(r.toolUses.length, 0);
+  expect(r.textLen).toBe(0);
+  expect(r.toolUses.length).toBe(0);
 });
 
 test("inspectContent: extracts tool_use blocks", () => {
   const content = [{ type: "tool_use", id: "id1", name: "Read", input: { file_path: "/foo" } }];
   const r = inspectContent(content);
-  assert.equal(r.toolUses.length, 1);
-  assert.equal(r.toolUses[0]?.name, "Read");
-  assert.equal(r.toolUses[0]?.id, "id1");
+  expect(r.toolUses.length).toBe(1);
+  expect(r.toolUses[0]?.name).toBe("Read");
+  expect(r.toolUses[0]?.id).toBe("id1");
 });
 
 test("inspectContent: extracts tool_result blocks", () => {
   const content = [{ type: "tool_result", tool_use_id: "id1", content: "abc", is_error: false }];
   const r = inspectContent(content);
-  assert.equal(r.toolResults.length, 1);
-  assert.equal(r.toolResults[0]?.id, "id1");
-  assert.equal(r.toolResults[0]?.size, 3);
-  assert.equal(r.toolResults[0]?.isError, false);
+  expect(r.toolResults.length).toBe(1);
+  expect(r.toolResults[0]?.id).toBe("id1");
+  expect(r.toolResults[0]?.size).toBe(3);
+  expect(r.toolResults[0]?.isError).toBe(false);
 });
 
 test("inspectContent: accumulates text block lengths", () => {
@@ -188,7 +187,7 @@ test("inspectContent: accumulates text block lengths", () => {
     { type: "text", text: " world" }
   ];
   const r = inspectContent(content);
-  assert.equal(r.textLen, 11);
+  expect(r.textLen).toBe(11);
 });
 
 // ── tokensFromUsage ────────────────────────────────────────────────────────
@@ -201,11 +200,11 @@ test("tokensFromUsage: basic usage record", () => {
     cache_creation_input_tokens: 10
   };
   const t = tokensFromUsage(usage);
-  assert.equal(t["input"], 100);
-  assert.equal(t["output"], 50);
-  assert.equal(t["cache_read"], 20);
-  assert.equal(t["cache_create_5m"], 10);
-  assert.equal(t["cache_create_1h"], 0);
+  expect(t["input"]).toBe(100);
+  expect(t["output"]).toBe(50);
+  expect(t["cache_read"]).toBe(20);
+  expect(t["cache_create_5m"]).toBe(10);
+  expect(t["cache_create_1h"]).toBe(0);
 });
 
 test("tokensFromUsage: nested cache_creation object", () => {
@@ -215,13 +214,13 @@ test("tokensFromUsage: nested cache_creation object", () => {
     cache_creation: { ephemeral_5m_input_tokens: 8, ephemeral_1h_input_tokens: 4 }
   };
   const t = tokensFromUsage(usage);
-  assert.equal(t["cache_create_5m"], 8);
-  assert.equal(t["cache_create_1h"], 4);
+  expect(t["cache_create_5m"]).toBe(8);
+  expect(t["cache_create_1h"]).toBe(4);
 });
 
 test("tokensFromUsage: empty/null returns zeros", () => {
   const t = tokensFromUsage({});
-  assert.deepEqual(t, emptyTotals());
+  expect(t).toEqual(emptyTotals());
 });
 
 // ── handleUserTurn ─────────────────────────────────────────────────────────
@@ -229,7 +228,7 @@ test("tokensFromUsage: empty/null returns zeros", () => {
 test("handleUserTurn: isMeta increments compactionCount", () => {
   const ctx = makeCtx();
   handleUserTurn({ isMeta: true, type: "user" }, ctx);
-  assert.equal(ctx.counters.compactionCount, 1);
+  expect(ctx.counters.compactionCount).toBe(1);
 });
 
 test("handleUserTurn: plain text increments userMsgCount and userMsgTotalLen", () => {
@@ -241,8 +240,8 @@ test("handleUserTurn: plain text increments userMsgCount and userMsgTotalLen", (
     },
     ctx
   );
-  assert.equal(ctx.counters.userMsgCount, 1);
-  assert.equal(ctx.counters.userMsgTotalLen, 5);
+  expect(ctx.counters.userMsgCount).toBe(1);
+  expect(ctx.counters.userMsgTotalLen).toBe(5);
 });
 
 test("handleUserTurn: tool_result tracks size and calls", () => {
@@ -258,10 +257,10 @@ test("handleUserTurn: tool_result tracks size and calls", () => {
     },
     ctx
   );
-  assert.equal(ctx.toolResultSizes.length, 1);
-  assert.equal(ctx.toolResultSizes[0], 3);
-  assert.equal(ctx.toolCachePrime["Read"]?.calls, 1);
-  assert.equal(ctx.toolCachePrime["Read"]?.totalResultBytes, 3);
+  expect(ctx.toolResultSizes.length).toBe(1);
+  expect(ctx.toolResultSizes[0]).toBe(3);
+  expect(ctx.toolCachePrime["Read"]?.calls).toBe(1);
+  expect(ctx.toolCachePrime["Read"]?.totalResultBytes).toBe(3);
 });
 
 test("handleUserTurn: error tool_result increments toolFailureCounts", () => {
@@ -276,7 +275,7 @@ test("handleUserTurn: error tool_result increments toolFailureCounts", () => {
     },
     ctx
   );
-  assert.equal(ctx.toolFailureCounts["Bash"], 1);
+  expect(ctx.toolFailureCounts["Bash"]).toBe(1);
 });
 
 // ── recordToolUse ──────────────────────────────────────────────────────────
@@ -284,26 +283,26 @@ test("handleUserTurn: error tool_result increments toolFailureCounts", () => {
 test("recordToolUse: increments toolUseCounts and sets sawFirstTool", () => {
   const ctx = makeCtx();
   recordToolUse(ctx, { id: "i1", name: "Bash", input: {} });
-  assert.equal(ctx.toolUseCounts["Bash"], 1);
-  assert.equal(ctx.flags.sawFirstTool, true);
+  expect(ctx.toolUseCounts["Bash"]).toBe(1);
+  expect(ctx.flags.sawFirstTool).toBe(true);
 });
 
 test("recordToolUse: Read tool tracks file_path in filesRead", () => {
   const ctx = makeCtx();
   recordToolUse(ctx, { id: "i2", name: "Read", input: { file_path: "/some/file.ts" } });
-  assert.equal(ctx.filesRead["/some/file.ts"], 1);
+  expect(ctx.filesRead["/some/file.ts"]).toBe(1);
 });
 
 test("recordToolUse: Skill increments skillInvocations", () => {
   const ctx = makeCtx();
   recordToolUse(ctx, { id: "i3", name: "Skill", input: {} });
-  assert.equal(ctx.counters.skillInvocations, 1);
+  expect(ctx.counters.skillInvocations).toBe(1);
 });
 
 test("recordToolUse: Agent increments subagentDispatches", () => {
   const ctx = makeCtx();
   recordToolUse(ctx, { id: "i4", name: "Agent", input: {} });
-  assert.equal(ctx.counters.subagentDispatches, 1);
+  expect(ctx.counters.subagentDispatches).toBe(1);
 });
 
 // ── handleAssistantTurn ────────────────────────────────────────────────────
@@ -320,10 +319,10 @@ test("handleAssistantTurn: counts token usage via recordTokenUsage", () => {
     }
   };
   const touched = handleAssistantTurn(obj, "file.jsonl", new Map(), ctx);
-  assert.equal(touched, true);
-  assert.equal(ctx.counters.messagesCounted, 1);
-  assert.equal(ctx.totals["input"], 100);
-  assert.equal(ctx.totals["output"], 50);
+  expect(touched).toBe(true);
+  expect(ctx.counters.messagesCounted).toBe(1);
+  expect(ctx.totals["input"]).toBe(100);
+  expect(ctx.totals["output"]).toBe(50);
 });
 
 test("handleAssistantTurn: synthetic model skips token counting", () => {
@@ -338,8 +337,8 @@ test("handleAssistantTurn: synthetic model skips token counting", () => {
     }
   };
   handleAssistantTurn(obj, "file.jsonl", new Map(), ctx);
-  assert.equal(ctx.counters.messagesCounted, 0);
-  assert.equal(ctx.totals["input"], 0);
+  expect(ctx.counters.messagesCounted).toBe(0);
+  expect(ctx.totals["input"]).toBe(0);
 });
 
 test("handleAssistantTurn: no usage returns false (not touched)", () => {
@@ -349,7 +348,7 @@ test("handleAssistantTurn: no usage returns false (not touched)", () => {
     message: { model: "claude-sonnet-4-5", content: [] }
   };
   const touched = handleAssistantTurn(obj, "file.jsonl", new Map(), ctx);
-  assert.equal(touched, false);
+  expect(touched).toBe(false);
 });
 
 test("handleAssistantTurn: increments turnsBeforeFirstTool when no tool use yet", () => {
@@ -359,5 +358,5 @@ test("handleAssistantTurn: increments turnsBeforeFirstTool when no tool use yet"
     message: { model: "claude-sonnet-4-5", content: [{ type: "text", text: "hi" }] }
   };
   handleAssistantTurn(obj, "f", new Map(), ctx);
-  assert.equal(ctx.counters.turnsBeforeFirstTool, 1);
+  expect(ctx.counters.turnsBeforeFirstTool).toBe(1);
 });
diff --git a/crew/tests/subagent-profile-hook.test.mts b/crew/tests/subagent-profile-hook.test.mts
index 43b2b2b8..997201e0 100644
--- a/crew/tests/subagent-profile-hook.test.mts
+++ b/crew/tests/subagent-profile-hook.test.mts
@@ -4,8 +4,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runSubagentProfileInjection } from "../hooks/lib/subagent-profile-core.mjs";
 
 function deps(block: string, ids: string[], writes: Array<[string, string, string[]]>) {
@@ -28,11 +27,13 @@ test("emits additionalContext + records the agent-keyed sidecar for a valid payl
     {},
     deps("## Your track record (crew:reviewer)\n- x", ["c1", "l1"], writes)
   );
-  assert.notEqual(out, null);
+  expect(out).not.toBe(null);
   const parsed = JSON.parse(out as string);
-  assert.equal(parsed.hookSpecificOutput.hookEventName, "SubagentStart");
-  assert.match(parsed.hookSpecificOutput.additionalContext, /Your track record \(crew:reviewer\)/);
-  assert.deepEqual(writes, [["/repo", "crew:reviewer", ["c1", "l1"]]]);
+  expect(parsed.hookSpecificOutput.hookEventName).toBe("SubagentStart");
+  expect(parsed.hookSpecificOutput.additionalContext).toMatch(
+    /Your track record \(crew:reviewer\)/
+  );
+  expect(writes).toEqual([["/repo", "crew:reviewer", ["c1", "l1"]]]);
 });
 
 test("returns null (emit nothing) when the payload has no agent_type", async () => {
@@ -42,21 +43,21 @@ test("returns null (emit nothing) when the payload has no agent_type", async ()
     {},
     deps("block", ["c1"], writes)
   );
-  assert.equal(out, null);
-  assert.equal(writes.length, 0);
+  expect(out).toBe(null);
+  expect(writes.length).toBe(0);
 });
 
 test("returns null when buildProfileBlock yields an empty block (disabled / cold / unpaired)", async () => {
   const writes: Array<[string, string, string[]]> = [];
   const raw = JSON.stringify({ agent_type: "crew:reviewer", cwd: "/repo" });
   const out = await runSubagentProfileInjection(raw, {}, deps("", [], writes));
-  assert.equal(out, null);
-  assert.equal(writes.length, 0);
+  expect(out).toBe(null);
+  expect(writes.length).toBe(0);
 });
 
 test("returns null on malformed JSON — never throws", async () => {
   const out = await runSubagentProfileInjection("{ not json", {}, deps("block", ["c1"], []));
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("returns null when buildProfileBlock throws — never throws", async () => {
@@ -70,7 +71,7 @@ test("returns null when buildProfileBlock throws — never throws", async () =>
       }
     }
   );
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("falls back to CLAUDE_PROJECT_DIR when the payload omits cwd", async () => {
@@ -80,8 +81,8 @@ test("falls back to CLAUDE_PROJECT_DIR when the payload omits cwd", async () =>
     { CLAUDE_PROJECT_DIR: "/env-repo" },
     deps("## Your track record (crew:backend-dev)\n- y", ["l9"], writes)
   );
-  assert.notEqual(out, null);
-  assert.deepEqual(writes, [["/env-repo", "crew:backend-dev", ["l9"]]]);
+  expect(out).not.toBe(null);
+  expect(writes).toEqual([["/env-repo", "crew:backend-dev", ["l9"]]]);
 });
 
 // Dispatch-memory-credit-loop (runner-plugin upstream request 2026-07-16):
@@ -104,7 +105,7 @@ test("default loader (buildHandoffDigest, no deps override) resolves to null on
         }
       }
     );
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/subagent-return.test.mts b/crew/tests/subagent-return.test.mts
index 1f5d9d4f..62d39e74 100644
--- a/crew/tests/subagent-return.test.mts
+++ b/crew/tests/subagent-return.test.mts
@@ -1,6 +1,5 @@
 // tests/subagent-return.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawn } from "node:child_process";
 import path from "node:path";
 import url from "node:url";
@@ -23,7 +22,7 @@ import {
 } from "../hooks/lib/check-reviewer-decision.mjs";
 
 const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
-const HOOK_PATH = path.join(__dirname, "..", "hooks", "check-subagent-return.ts");
+const HOOK_PATH = path.join(__dirname, "..", "hooks", "check-subagent-return.mts");
 
 // ── Helpers ──────────────────────────────────────────────────────────────────
 
@@ -44,7 +43,7 @@ function runHookSpawn(
   stdin: string
 ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
   return new Promise((resolve) => {
-    const proc = spawn("node", ["--experimental-strip-types", HOOK_PATH], {
+    const proc = spawn("bun", [HOOK_PATH], {
       env: { ...process.env }
     });
     let stdout = "";
@@ -157,16 +156,16 @@ function makeSubagentStopStdin(opts: {
 // AC-7: body ≤ threshold (100 bytes) → silent
 test("AC-7: body ≤ threshold (100 bytes) → silent", async () => {
   const result = await runHook(makeStdin(makeBody(100)));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // AC-8: body > threshold (1000 bytes) WITH artifact path → silent
 test("AC-8: body > threshold WITH .claude/artifacts/crew/handoffs/foo.md → silent", async () => {
   const body = makeBody(800) + " .claude/artifacts/crew/handoffs/foo.md " + makeBody(100);
   const result = await runHook(makeStdin(body));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // SMOKE: Hook runtime contract with warning path (verifies stdin→stdout payload wiring)
@@ -176,12 +175,12 @@ test("smoke: AC-9 — body > threshold (1000 bytes) WITHOUT artifact path → wa
   try {
     const body = makeBody(1000);
     const result = await runHookSpawn(makeStdin(body, repo));
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
-    assert.match(parsed.systemMessage, /cost-discipline rule #2/);
-    assert.match(parsed.systemMessage, /1000/);
+    expect(parsed.decision).toBe("approve");
+    expect(parsed.systemMessage).toMatch(/cost-discipline rule #2/);
+    expect(parsed.systemMessage).toMatch(/1000/);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -192,8 +191,8 @@ test("config: subagent-inline-warn disabled → silent even on large body", asyn
   const repo = await makeRepoWithCrewJson({ "subagent-inline-warn": { enabled: false } });
   try {
     const result = await runHook(makeStdin(makeBody(5000), repo));
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -206,8 +205,8 @@ test("config: features['subagent-inline-warn'].threshold=2048 + body=1500 → si
   });
   try {
     const result = await runHook(makeStdin(makeBody(1500), repo));
-    assert.equal(result.exitCode, 0);
-    assert.equal(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).toBe("");
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -220,11 +219,11 @@ test("config: features['subagent-inline-warn'].threshold=2048 + body=2500 → wa
   });
   try {
     const result = await runHook(makeStdin(makeBody(2500), repo));
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
-    assert.match(parsed.systemMessage, /cost-discipline rule #2/);
+    expect(parsed.decision).toBe("approve");
+    expect(parsed.systemMessage).toMatch(/cost-discipline rule #2/);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -235,10 +234,10 @@ test("default-on — no crew.json + body=1000 no path → warn", async () => {
   const repo = await makeTmpRepo();
   try {
     const result = await runHookSpawn(makeStdin(makeBody(1000), repo));
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
+    expect(parsed.decision).toBe("approve");
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -248,31 +247,31 @@ test("default-on — no crew.json + body=1000 no path → warn", async () => {
 test("AC-12a: Windows path .claude\\artifacts\\crew\\handoffs\\foo.md → silent", async () => {
   const body = makeBody(200) + " .claude\\artifacts\\crew\\handoffs\\foo.md " + makeBody(200);
   const result = await runHook(makeStdin(body));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // AC-12: Reviews path → silent
 test("AC-12b: .claude/artifacts/crew/reviews/foo.md → silent", async () => {
   const body = makeBody(200) + " .claude/artifacts/crew/reviews/foo.md " + makeBody(200);
   const result = await runHook(makeStdin(body));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // AC-12: Validations path → silent
 test("AC-12c: .claude/artifacts/crew/validations/foo.md → silent", async () => {
   const body = makeBody(200) + " .claude/artifacts/crew/validations/foo.md " + makeBody(200);
   const result = await runHook(makeStdin(body));
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // AC-11: Malformed JSON on stdin → silent
 test("AC-11a: malformed JSON on stdin → silent", async () => {
   const result = await runHook("not json at all");
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // AC-11: Missing tool_response → silent
@@ -280,8 +279,8 @@ test("AC-11b: missing tool_response → silent", async () => {
   const result = await runHook(
     JSON.stringify({ session_id: "s1", tool_name: "Agent", cwd: process.cwd() })
   );
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // AC-11: Empty body → silent
@@ -294,8 +293,8 @@ test("AC-11c: empty body string → silent", async () => {
       tool_response: { content: "" }
     })
   );
-  assert.equal(result.exitCode, 0);
-  assert.equal(result.stdout, "");
+  expect(result.exitCode).toBe(0);
+  expect(result.stdout).toBe("");
 });
 
 // tool_response.body fallback → works
@@ -309,10 +308,10 @@ test("tool_response.body fallback: body field used when content absent", async (
       tool_response: { body: makeBody(1000) }
     });
     const result = await runHook(payload);
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
+    expect(parsed.decision).toBe("approve");
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -329,10 +328,10 @@ test("tool_response as plain string: string body used as fallback", async () =>
       tool_response: makeBody(1000)
     });
     const result = await runHook(payload);
-    assert.equal(result.exitCode, 0);
-    assert.notEqual(result.stdout, "");
+    expect(result.exitCode).toBe(0);
+    expect(result.stdout).not.toBe("");
     const parsed = JSON.parse(result.stdout);
-    assert.equal(parsed.decision, "approve");
+    expect(parsed.decision).toBe("approve");
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -343,11 +342,11 @@ test("AC-4: output decision is always approve, never block", async () => {
   const repo = await makeTmpRepo();
   try {
     const result = await runHook(makeStdin(makeBody(2000), repo));
-    assert.equal(result.exitCode, 0);
+    expect(result.exitCode).toBe(0);
     if (result.stdout !== "") {
       const parsed = JSON.parse(result.stdout);
-      assert.notEqual(parsed.decision, "block");
-      assert.equal(parsed.decision, "approve");
+      expect(parsed.decision).not.toBe("block");
+      expect(parsed.decision).toBe("approve");
     }
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
@@ -363,12 +362,12 @@ test("AC-3: inline-return-warn fires → captures a failure entry in learnings.j
   const repo = await makeTmpRepo();
   try {
     const result = await runHook(makeStdin(makeBody(1000), repo));
-    assert.notEqual(result.stdout, "");
+    expect(result.stdout).not.toBe("");
     const lines = await readLearningsLines(repo);
     const captured = lines.filter((l) => l.source === "inline-return-warn");
-    assert.equal(captured.length, 1);
-    assert.equal(captured[0]!.kind, "failure");
-    assert.match(captured[0]!.summary as string, /cost-discipline rule #2/);
+    expect(captured.length).toBe(1);
+    expect(captured[0]!.kind).toBe("failure");
+    expect(captured[0]!.summary as string).toMatch(/cost-discipline rule #2/);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -379,7 +378,7 @@ test("AC-3: no warn (short body) → no learnings.jsonl capture", async () => {
   try {
     await runHook(makeStdin(makeBody(100), repo));
     const lines = await readLearningsLines(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -390,7 +389,7 @@ test("AC-3: warn with feature disabled → no capture either (gate shared with t
   try {
     await runHook(makeStdin(makeBody(5000), repo));
     const lines = await readLearningsLines(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -407,21 +406,21 @@ test("AC-4: oversized pathless body with NO terminal status → subagent-incompl
   const repo = await makeTmpRepo();
   try {
     const result = await runHook(makeStdin(makeBody(1000), repo));
-    assert.notEqual(result.stdout, "");
+    expect(result.stdout).not.toBe("");
     const lines = await readLearningsLines(repo);
     const captured = lines.filter((l) => l.source === "subagent-incomplete");
-    assert.equal(captured.length, 1);
-    assert.equal(captured[0]!.kind, "failure");
+    expect(captured.length).toBe(1);
+    expect(captured[0]!.kind).toBe("failure");
 
     const events = await fs.readFile(path.join(repo, ".claude", "logs", "events.jsonl"), "utf8");
     const eventLines = events
       .split("\n")
       .filter((l) => l.trim().length > 0)
       .map((l) => JSON.parse(l));
-    assert.ok(
+    expect(
       eventLines.some((e) => e.event === "subagent-return:subagent-incomplete"),
       "expected a subagent-return:subagent-incomplete event log entry"
-    );
+    ).toBeTruthy();
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -433,13 +432,12 @@ test("AC-4: oversized pathless body WITH a terminal status marker → no subagen
     const body = `DONE: finished the task.\n${makeBody(1000)}`;
     await runHook(makeStdin(body, repo));
     const lines = await readLearningsLines(repo);
-    assert.equal(
+    expect(
       lines.filter((l) => l.source === "subagent-incomplete").length,
-      0,
       "a declared terminal status must suppress the new signal"
-    );
+    ).toBe(0);
     // inline-return-warn still fires independently (still no artifact path).
-    assert.equal(lines.filter((l) => l.source === "inline-return-warn").length, 1);
+    expect(lines.filter((l) => l.source === "inline-return-warn").length).toBe(1);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -459,11 +457,11 @@ test("FEAT-193 S1: inline-return-warn also dual-writes a failing GEPA trial", as
     const captured = trials.filter(
       (t) => (t.input as Record<string, unknown>)?.source === "inline-return-warn"
     );
-    assert.equal(captured.length, 1);
-    assert.equal(captured[0]!.agent, "unknown");
-    assert.equal(captured[0]!.phase, "build");
-    assert.equal(captured[0]!.source, "captured");
-    assert.equal((captured[0]!.score as Record<string, unknown>).pass, false);
+    expect(captured.length).toBe(1);
+    expect(captured[0]!.agent).toBe("unknown");
+    expect(captured[0]!.phase).toBe("build");
+    expect(captured[0]!.source).toBe("captured");
+    expect((captured[0]!.score as Record<string, unknown>).pass).toBe(false);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -478,9 +476,8 @@ test("FEAT-193 S1: subagent-incomplete also dual-writes a failing GEPA trial", a
     const captured = trials.filter(
       (t) => (t.input as Record<string, unknown>)?.source === "subagent-incomplete"
     );
-    assert.equal(captured.length, 1);
-    assert.match(
-      (captured[0]!.score as Record<string, unknown>).rationale as string,
+    expect(captured.length).toBe(1);
+    expect((captured[0]!.score as Record<string, unknown>).rationale as string).toMatch(
       /no terminal status marker/
     );
   } finally {
@@ -494,7 +491,7 @@ test("AC-4: body with an artifact path → no subagent-incomplete (already has a
     const body = makeBody(800) + " .claude/artifacts/crew/handoffs/foo.md " + makeBody(100);
     await runHook(makeStdin(body, repo));
     const lines = await readLearningsLines(repo);
-    assert.equal(lines.length, 0);
+    expect(lines.length).toBe(0);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -504,104 +501,104 @@ test("AC-4: body with an artifact path → no subagent-incomplete (already has a
 
 // parseThreshold
 test("parseThreshold: undefined returns default 512", () => {
-  assert.equal(parseThreshold(undefined), 512);
+  expect(parseThreshold(undefined)).toBe(512);
 });
 
 test('parseThreshold: "" returns default 512', () => {
-  assert.equal(parseThreshold(""), 512);
+  expect(parseThreshold("")).toBe(512);
 });
 
 test('parseThreshold: "0" returns 0', () => {
-  assert.equal(parseThreshold("0"), 0);
+  expect(parseThreshold("0")).toBe(0);
 });
 
 test('parseThreshold: "2048" returns 2048', () => {
-  assert.equal(parseThreshold("2048"), 2048);
+  expect(parseThreshold("2048")).toBe(2048);
 });
 
 test("parseThreshold: non-numeric string returns default 512", () => {
-  assert.equal(parseThreshold("banana"), 512);
+  expect(parseThreshold("banana")).toBe(512);
 });
 
 test("parseThreshold: custom default used when value is undefined", () => {
-  assert.equal(parseThreshold(undefined, 1024), 1024);
+  expect(parseThreshold(undefined, 1024)).toBe(1024);
 });
 
 test("parseThreshold: non-numeric with custom default returns custom default", () => {
-  assert.equal(parseThreshold("abc", 256), 256);
+  expect(parseThreshold("abc", 256)).toBe(256);
 });
 
 // hasArtifactPath
 test("hasArtifactPath: POSIX handoffs path → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/handoffs/foo.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/handoffs/foo.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: Windows handoffs path → true", () => {
-  assert.ok(hasArtifactPath(".claude\\artifacts\\crew\\handoffs\\foo.md"));
+  expect(hasArtifactPath(".claude\\artifacts\\crew\\handoffs\\foo.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: reviews subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/reviews/review-result.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/reviews/review-result.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: validations subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/validations/val.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/validations/val.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: deployments subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/deployments/dep.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/deployments/dep.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: runs subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/runs/run.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/runs/run.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: cost subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/cost/cost.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/cost/cost.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: cost-insights subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/cost-insights/ci.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/cost-insights/ci.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: agents subdir → true", () => {
-  assert.ok(hasArtifactPath(".claude/artifacts/crew/agents/a.md"));
+  expect(hasArtifactPath(".claude/artifacts/crew/agents/a.md")).toBeTruthy();
 });
 
 test("hasArtifactPath: random text → false", () => {
-  assert.ok(!hasArtifactPath("nothing useful here"));
+  expect(!hasArtifactPath("nothing useful here")).toBeTruthy();
 });
 
 test("hasArtifactPath: path embedded in surrounding text → true", () => {
-  assert.ok(
+  expect(
     hasArtifactPath(
       "see the report at C:\\work\\mega\\hero-crew\\.claude/artifacts/crew/handoffs/20260601T123456Z-handoff-foo.md for details"
     )
-  );
+  ).toBeTruthy();
 });
 
 test("hasArtifactPath: wrong subdir → false", () => {
-  assert.ok(!hasArtifactPath(".claude/artifacts/crew/other/foo.md"));
+  expect(!hasArtifactPath(".claude/artifacts/crew/other/foo.md")).toBeTruthy();
 });
 
 // checkSubagentReturn
 test("checkSubagentReturn: body ≤ threshold → no warnings", () => {
   const { warnings } = checkSubagentReturn({ body: "x".repeat(100), threshold: 512 });
-  assert.equal(warnings.length, 0);
+  expect(warnings.length).toBe(0);
 });
 
 test("checkSubagentReturn: body > threshold WITH artifact path → no warnings", () => {
   const body = "x".repeat(600) + " .claude/artifacts/crew/handoffs/foo.md";
   const { warnings } = checkSubagentReturn({ body, threshold: 512 });
-  assert.equal(warnings.length, 0);
+  expect(warnings.length).toBe(0);
 });
 
 test("checkSubagentReturn: body > threshold WITHOUT artifact path → one warning", () => {
   const body = "x".repeat(600);
   const { warnings } = checkSubagentReturn({ body, threshold: 512 });
-  assert.equal(warnings.length, 1);
-  assert.match(warnings[0]!, /cost-discipline rule #2/);
-  assert.ok(warnings[0]!.includes("600"), `Expected byte count in warn: ${warnings[0]!}`);
+  expect(warnings.length).toBe(1);
+  expect(warnings[0]!).toMatch(/cost-discipline rule #2/);
+  expect(warnings[0]!.includes("600"), `Expected byte count in warn: ${warnings[0]!}`).toBeTruthy();
 });
 
 test("checkSubagentReturn: threshold=0 means body > 0 threshold is never triggered from check level (caller exits before)", () => {
@@ -611,17 +608,17 @@ test("checkSubagentReturn: threshold=0 means body > 0 threshold is never trigger
   const body = "x".repeat(10);
   const { warnings } = checkSubagentReturn({ body, threshold: 0 });
   // With threshold 0, any non-empty body without path warns (library is pure; hook exits before calling this)
-  assert.equal(warnings.length, 1);
+  expect(warnings.length).toBe(1);
 });
 
 test("checkSubagentReturn: UTF-8 multi-byte characters measured by byte length", () => {
   // "é" is 2 bytes in UTF-8; repeat 300 times = 600 bytes but 300 chars
   const body = "é".repeat(300);
   const byteLen = Buffer.byteLength(body, "utf8");
-  assert.ok(byteLen > 512, `Expected >512 bytes, got ${byteLen}`);
+  expect(byteLen > 512, `Expected >512 bytes, got ${byteLen}`).toBeTruthy();
   const { warnings } = checkSubagentReturn({ body, threshold: 512 });
-  assert.equal(warnings.length, 1);
-  assert.ok(warnings[0]!.includes(String(byteLen)));
+  expect(warnings.length).toBe(1);
+  expect(warnings[0]!.includes(String(byteLen))).toBeTruthy();
 });
 
 // ── parseUsageMetrics ─────────────────────────────────────────────────────────
@@ -630,23 +627,23 @@ test("parseUsageMetrics: full <usage> block → all three fields parsed", () =>
   const body =
     "Handoff: path/to/file.md\n<usage>total_tokens: 8500 tool_uses: 32 duration_ms: 120000</usage>";
   const m = parseUsageMetrics(body);
-  assert.equal(m.totalTokens, 8500);
-  assert.equal(m.toolUses, 32);
-  assert.equal(m.durationMs, 120000);
+  expect(m.totalTokens).toBe(8500);
+  expect(m.toolUses).toBe(32);
+  expect(m.durationMs).toBe(120000);
 });
 
 test("parseUsageMetrics: no <usage> block → all zeros", () => {
   const m = parseUsageMetrics("No usage info here at all.");
-  assert.equal(m.totalTokens, 0);
-  assert.equal(m.toolUses, 0);
-  assert.equal(m.durationMs, 0);
+  expect(m.totalTokens).toBe(0);
+  expect(m.toolUses).toBe(0);
+  expect(m.durationMs).toBe(0);
 });
 
 test("parseUsageMetrics: only total_tokens present → others zero", () => {
   const m = parseUsageMetrics("<usage>total_tokens: 300</usage>");
-  assert.equal(m.totalTokens, 300);
-  assert.equal(m.toolUses, 0);
-  assert.equal(m.durationMs, 0);
+  expect(m.totalTokens).toBe(300);
+  expect(m.toolUses).toBe(0);
+  expect(m.durationMs).toBe(0);
 });
 
 // ── dev-team#199: SubagentStop reviewer-decision-guard ─────────────────────
@@ -663,29 +660,34 @@ test("isReviewerTierAgent: recognizes all five reviewer-tier agents, namespaced
     "csharp-reviewer",
     "architect-reviewer"
   ]) {
-    assert.ok(isReviewerTierAgent(bare), `expected ${bare} to be reviewer-tier`);
-    assert.ok(isReviewerTierAgent(`crew:${bare}`), `expected crew:${bare} to be reviewer-tier`);
+    expect(isReviewerTierAgent(bare), `expected ${bare} to be reviewer-tier`).toBeTruthy();
+    expect(
+      isReviewerTierAgent(`crew:${bare}`),
+      `expected crew:${bare} to be reviewer-tier`
+    ).toBeTruthy();
   }
 });
 
 test("isReviewerTierAgent: builder/non-reviewer agents are not reviewer-tier", () => {
-  assert.ok(!isReviewerTierAgent("crew:fullstack-dev"));
-  assert.ok(!isReviewerTierAgent("verifier"));
-  assert.ok(!isReviewerTierAgent("dev-lite"));
+  expect(!isReviewerTierAgent("crew:fullstack-dev")).toBeTruthy();
+  expect(!isReviewerTierAgent("verifier")).toBeTruthy();
+  expect(!isReviewerTierAgent("dev-lite")).toBeTruthy();
 });
 
 test("hasDecisionLine: matches decision: approved / approved_with_notes / rejected, case-insensitively", () => {
-  assert.ok(hasDecisionLine("Findings summarized.\ndecision: approved\n"));
-  assert.ok(hasDecisionLine("Decision: approved_with_notes — two medium findings noted."));
-  assert.ok(hasDecisionLine("decision=rejected: scope exceeded"));
-  assert.ok(!hasDecisionLine("Still reviewing, no decision yet."));
+  expect(hasDecisionLine("Findings summarized.\ndecision: approved\n")).toBeTruthy();
+  expect(
+    hasDecisionLine("Decision: approved_with_notes — two medium findings noted.")
+  ).toBeTruthy();
+  expect(hasDecisionLine("decision=rejected: scope exceeded")).toBeTruthy();
+  expect(!hasDecisionLine("Still reviewing, no decision yet.")).toBeTruthy();
 });
 
 test("hasDeliveredDecision: a review-result artifact path counts even without literal 'decision:' text", () => {
   const msg =
     "Review complete: .claude/artifacts/crew/reviews/20260710T000000Z-review-result-foo.md";
-  assert.ok(!hasDecisionLine(msg));
-  assert.ok(hasDeliveredDecision(msg));
+  expect(!hasDecisionLine(msg)).toBeTruthy();
+  expect(hasDeliveredDecision(msg)).toBeTruthy();
 });
 
 test("reviewer decision line present → allowed (no block)", async () => {
@@ -695,7 +697,7 @@ test("reviewer decision line present → allowed (no block)", async () => {
       "review-result written. decision: approved_with_notes — 1 medium finding, isolated fix."
   });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("reviewer with NO decision line and no artifact path → blocked", async () => {
@@ -704,11 +706,11 @@ test("reviewer with NO decision line and no artifact path → blocked", async ()
     message: "Looked through the diff, seems mostly fine, wrapping up now."
   });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.notEqual(out, null);
+  expect(out).not.toBe(null);
   const parsed = JSON.parse(out as string);
-  assert.equal(parsed.decision, "block");
-  assert.match(parsed.reason, /decision-guard/);
-  assert.match(parsed.reason, /crew:typescript-reviewer/);
+  expect(parsed.decision).toBe("block");
+  expect(parsed.reason).toMatch(/decision-guard/);
+  expect(parsed.reason).toMatch(/crew:typescript-reviewer/);
 });
 
 test("non-reviewer agent (e.g. crew:fullstack-dev) with no decision line → unaffected", async () => {
@@ -717,7 +719,7 @@ test("non-reviewer agent (e.g. crew:fullstack-dev) with no decision line → una
     message: "Implementation wrapping up, no decision line here at all."
   });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("reviewer with a review-result artifact path but no literal 'decision:' text → allowed", async () => {
@@ -726,7 +728,7 @@ test("reviewer with a review-result artifact path but no literal 'decision:' tex
     message: "Done: .claude/artifacts/crew/reviews/20260710T000000Z-review-result-slice.md"
   });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("stop_hook_active=true → never re-blocks (loop safety), even with no decision", async () => {
@@ -736,24 +738,24 @@ test("stop_hook_active=true → never re-blocks (loop safety), even with no deci
     stopHookActive: true
   });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("reviewer with no last_assistant_message field → fails open (documented residual gap)", async () => {
   const stdin = makeSubagentStopStdin({ agentName: "crew:architect-reviewer" });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("missing agent_name → unaffected (cannot classify tier)", async () => {
   const stdin = makeSubagentStopStdin({ message: "No agent identity on this payload." });
   const out = await runCheckReviewerDecisionHook(stdin);
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("malformed JSON on stdin → silent", async () => {
   const out = await runCheckReviewerDecisionHook("not json at all");
-  assert.equal(out, null);
+  expect(out).toBe(null);
 });
 
 test("config: features['reviewer-decision-guard'] disabled → silent even with no decision", async () => {
@@ -765,7 +767,7 @@ test("config: features['reviewer-decision-guard'] disabled → silent even with
       cwd: repo
     });
     const out = await runCheckReviewerDecisionHook(stdin);
-    assert.equal(out, null);
+    expect(out).toBe(null);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/telemetry-cli.test.mts b/crew/tests/telemetry-cli.test.mts
index 214a9bb7..031b1466 100644
--- a/crew/tests/telemetry-cli.test.mts
+++ b/crew/tests/telemetry-cli.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/cost-report-to-spans.ts (CLI end-to-end).
  * AC-5, AC-6, AC-7.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -18,7 +17,7 @@ const AGGREGATE_FIXTURE = path.resolve(
   ".claude/artifacts/crew/cost/20260602T133012Z-cost-report-aggregate-feat034-slice13.md"
 );
 
-const CLI = path.resolve("./scripts/cost-report-to-spans.ts");
+const CLI = path.resolve("./scripts/cost-report-to-spans.mts");
 
 interface CliResult {
   status: number | null;
@@ -27,7 +26,7 @@ interface CliResult {
 }
 
 function runCli(args: string[]): CliResult {
-  const r = spawnSync("node", [CLI, ...args], { encoding: "utf8" });
+  const r = spawnSync("bun", [CLI, ...args], { encoding: "utf8" });
   return {
     status: r.status,
     stdout: String(r.stdout ?? ""),
@@ -68,22 +67,20 @@ test("telemetry-cli: writes valid JSONL for real FEAT113/SLICE37 fixture", async
 
     const result = runCli(["--cost-dir", costDir, "--out-dir", outDir, "--only", "*feat113*"]);
 
-    assert.equal(
-      result.status,
-      0,
-      `CLI must exit 0, got ${result.status}. stderr: ${result.stderr}`
+    expect(result.status, `CLI must exit 0, got ${result.status}. stderr: ${result.stderr}`).toBe(
+      0
     );
 
     const outFile = path.join(outDir, "20260607T122544Z.jsonl");
     const content = await fs.readFile(outFile, "utf8");
     const lines = content.trim().split("\n").filter(Boolean);
 
-    assert.equal(lines.length, 3, "Output file must have exactly 3 lines (3 spans)");
+    expect(lines.length, "Output file must have exactly 3 lines (3 spans)").toBe(3);
 
     for (const line of lines) {
       const parsed = JSON.parse(line);
       const span = SpanRecordSchema.parse(parsed);
-      assert.ok(span.traceId, "each span must have a traceId");
+      expect(span.traceId, "each span must have a traceId").toBeTruthy();
     }
   } finally {
     await cleanup(tmpRoot);
@@ -107,16 +104,16 @@ test("telemetry-cli: two runs produce byte-identical output", async () => {
     const cliArgs = ["--cost-dir", costDir, "--out-dir", outDir, "--only", "*feat113*"];
 
     const r1 = runCli(cliArgs);
-    assert.equal(r1.status, 0, `First run must exit 0. stderr: ${r1.stderr}`);
+    expect(r1.status, `First run must exit 0. stderr: ${r1.stderr}`).toBe(0);
 
     const outFile = path.join(outDir, "20260607T122544Z.jsonl");
     const content1 = await fs.readFile(outFile, "utf8");
 
     const r2 = runCli(cliArgs);
-    assert.equal(r2.status, 0, `Second run must exit 0. stderr: ${r2.stderr}`);
+    expect(r2.status, `Second run must exit 0. stderr: ${r2.stderr}`).toBe(0);
 
     const content2 = await fs.readFile(outFile, "utf8");
-    assert.equal(content1, content2, "Output must be byte-identical across two runs");
+    expect(content1, "Output must be byte-identical across two runs").toBe(content2);
   } finally {
     await cleanup(tmpRoot);
   }
@@ -138,31 +135,25 @@ test("telemetry-cli: --emit-observability emits exactly one grep-able stderr lin
 
     // With --emit-observability: stderr must have exactly one matching line.
     const withFlag = runCli(["--cost-dir", costDir, "--out-dir", outDir, "--emit-observability"]);
-    assert.equal(withFlag.status, 0, `Exit 0 expected. stderr: ${withFlag.stderr}`);
+    expect(withFlag.status, `Exit 0 expected. stderr: ${withFlag.stderr}`).toBe(0);
     const stderrLines = withFlag.stderr.trim().split("\n").filter(Boolean);
-    assert.equal(
+    expect(
       stderrLines.length,
-      1,
       `Expected exactly 1 stderr line, got: ${JSON.stringify(stderrLines)}`
-    );
-    assert.match(
-      stderrLines[0]!,
-      /^OTEL-BACKFILL wrote \d+ spans across \d+ runs$/,
-      "stderr line must match pattern"
+    ).toBe(1);
+    expect(stderrLines[0]!, "stderr line must match pattern").toMatch(
+      /^OTEL-BACKFILL wrote \d+ spans across \d+ runs$/
     );
 
     // Without flag: stderr must be empty for a clean run.
     const withoutFlag = runCli(["--cost-dir", costDir, "--out-dir", outDir]);
-    assert.equal(
-      withoutFlag.status,
-      0,
-      `Exit 0 expected without flag. stderr: ${withoutFlag.stderr}`
+    expect(withoutFlag.status, `Exit 0 expected without flag. stderr: ${withoutFlag.stderr}`).toBe(
+      0
     );
-    assert.equal(
+    expect(
       withoutFlag.stderr.trim(),
-      "",
       "stderr must be empty when --emit-observability is not passed"
-    );
+    ).toBe("");
   } finally {
     await cleanup(tmpRoot);
   }
@@ -191,15 +182,13 @@ test("telemetry-cli: aggregate files are skipped and produce no output", async (
     );
 
     const result = runCli(["--cost-dir", costDir, "--out-dir", outDir]);
-    assert.equal(result.status, 0, `Exit 0 expected. stderr: ${result.stderr}`);
+    expect(result.status, `Exit 0 expected. stderr: ${result.stderr}`).toBe(0);
 
     const outEntries = await fs.readdir(outDir).catch(() => [] as string[]);
     // Only one JSONL file for the slice; aggregate should be skipped.
-    assert.equal(outEntries.length, 1, "Only one JSONL file should be produced");
-    assert.equal(
-      outEntries[0],
-      "20260607T122544Z.jsonl",
-      "JSONL file must match slice run id, not aggregate"
+    expect(outEntries.length, "Only one JSONL file should be produced").toBe(1);
+    expect(outEntries[0], "JSONL file must match slice run id, not aggregate").toBe(
+      "20260607T122544Z.jsonl"
     );
   } finally {
     await cleanup(tmpRoot);
diff --git a/crew/tests/telemetry-config.test.mts b/crew/tests/telemetry-config.test.mts
index d89ccc8d..8905c3eb 100644
--- a/crew/tests/telemetry-config.test.mts
+++ b/crew/tests/telemetry-config.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/lib/telemetry/config.ts
  * AC-3: config loader, env-var resolution, two-key opt-in semantics.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -20,15 +19,15 @@ import {
 test("loadTelemetryConfig: defaults when file absent", async () => {
   const nonexistent = path.join(os.tmpdir(), `telemetry-absent-${Date.now()}.yaml`);
   const cfg = await loadTelemetryConfig(nonexistent);
-  assert.equal(cfg.enabled, false, "enabled must default false");
-  assert.equal(cfg.endpoint, "http://localhost:3000/api/public/otel/v1/traces");
-  assert.equal(cfg.scrub_pii, true);
-  assert.equal(cfg.sample_rate, 1.0);
-  assert.equal(cfg.redact_attr_max_chars, 2048);
-  assert.equal(cfg.max_queue_size, 2048);
-  assert.equal(cfg.schedule_delay_ms, 5000);
-  assert.equal(cfg.export_timeout_ms, 30000);
-  assert.ok(Array.isArray(cfg.redact_paths));
+  expect(cfg.enabled, "enabled must default false").toBe(false);
+  expect(cfg.endpoint).toBe("http://localhost:3000/api/public/otel/v1/traces");
+  expect(cfg.scrub_pii).toBe(true);
+  expect(cfg.sample_rate).toBe(1.0);
+  expect(cfg.redact_attr_max_chars).toBe(2048);
+  expect(cfg.max_queue_size).toBe(2048);
+  expect(cfg.schedule_delay_ms).toBe(5000);
+  expect(cfg.export_timeout_ms).toBe(30000);
+  expect(Array.isArray(cfg.redact_paths)).toBeTruthy();
 });
 
 // ---------------------------------------------------------------------------
@@ -45,12 +44,12 @@ test("loadTelemetryConfig: YAML round-trip with overrides", async () => {
   await fs.writeFile(tmpFile, yaml, "utf8");
   try {
     const cfg = await loadTelemetryConfig(tmpFile);
-    assert.equal(cfg.enabled, true);
-    assert.equal(cfg.endpoint, "https://cloud.langfuse.com/api/public/otel/v1/traces");
-    assert.equal(cfg.sample_rate, 0.5);
+    expect(cfg.enabled).toBe(true);
+    expect(cfg.endpoint).toBe("https://cloud.langfuse.com/api/public/otel/v1/traces");
+    expect(cfg.sample_rate).toBe(0.5);
     // Unspecified fields fall back to defaults
-    assert.equal(cfg.scrub_pii, true);
-    assert.equal(cfg.redact_attr_max_chars, 2048);
+    expect(cfg.scrub_pii).toBe(true);
+    expect(cfg.redact_attr_max_chars).toBe(2048);
   } finally {
     await fs.unlink(tmpFile).catch(() => undefined);
   }
@@ -64,12 +63,12 @@ test("resolveAuthHeader: resolves ${VAR} tokens from env", () => {
   const resolved = resolveAuthHeader("Basic ${LANGFUSE_AUTH_B64}", {
     LANGFUSE_AUTH_B64: "abc123"
   });
-  assert.equal(resolved, "Basic abc123");
+  expect(resolved).toBe("Basic abc123");
 });
 
 test("resolveAuthHeader: missing env var returns literal unchanged", () => {
   const resolved = resolveAuthHeader("Basic ${LANGFUSE_AUTH_B64}", {});
-  assert.equal(resolved, "Basic ${LANGFUSE_AUTH_B64}");
+  expect(resolved).toBe("Basic ${LANGFUSE_AUTH_B64}");
 });
 
 // ---------------------------------------------------------------------------
@@ -92,11 +91,11 @@ test("bridgeEnabled: both keys required for true", () => {
   const disabledCfg = { ...enabledCfg, enabled: false };
 
   // Both keys set → true
-  assert.equal(bridgeEnabled(enabledCfg, { CREW_OTEL_ENABLED: "1" }), true);
+  expect(bridgeEnabled(enabledCfg, { CREW_OTEL_ENABLED: "1" })).toBe(true);
   // cfg.enabled=true but no env var → false
-  assert.equal(bridgeEnabled(enabledCfg, {}), false);
+  expect(bridgeEnabled(enabledCfg, {})).toBe(false);
   // cfg.enabled=false with env var → false
-  assert.equal(bridgeEnabled(disabledCfg, { CREW_OTEL_ENABLED: "1" }), false);
+  expect(bridgeEnabled(disabledCfg, { CREW_OTEL_ENABLED: "1" })).toBe(false);
   // Neither → false
-  assert.equal(bridgeEnabled(disabledCfg, {}), false);
+  expect(bridgeEnabled(disabledCfg, {})).toBe(false);
 });
diff --git a/crew/tests/telemetry-cost-report-loader.test.mts b/crew/tests/telemetry-cost-report-loader.test.mts
index 5fc943d4..c0cbadc4 100644
--- a/crew/tests/telemetry-cost-report-loader.test.mts
+++ b/crew/tests/telemetry-cost-report-loader.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/lib/telemetry/cost-report-loader.ts
  * AC-3: Cost-report loader reads real FEAT113/SLICE37 fixture correctly.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import os from "node:os";
@@ -31,15 +30,15 @@ const AGGREGATE_FIXTURE = path.resolve(
 test("loadCostReport: real FEAT113/SLICE37 fixture loads with correct fields", async () => {
   const report = await loadCostReport(REAL_FIXTURE);
 
-  assert.equal(report.runId, "20260607T122544Z", "runId must match leading timestamp");
-  assert.equal(derivedFeatureId(report), "FEAT-113", "derivedFeatureId must be FEAT-113");
-  assert.equal(derivedSliceId(report), "SLICE-37", "derivedSliceId must be SLICE-37");
-  assert.equal(report.usd, 1.9962, "usd must be 1.9962");
-  assert.equal(report.totalTokens, 4947801, "totalTokens must be 4947801");
-  assert.equal(report.modelMix.length, 1, "modelMix must have 1 entry");
-  assert.equal(report.modelMix[0]?.model, "claude-sonnet-4-6", "model must be claude-sonnet-4-6");
-  assert.equal(report.subagentDispatches, 5, "subagentDispatches must be 5");
-  assert.equal(report.aggregateAll, false, "aggregateAll must be false");
+  expect(report.runId, "runId must match leading timestamp").toBe("20260607T122544Z");
+  expect(derivedFeatureId(report), "derivedFeatureId must be FEAT-113").toBe("FEAT-113");
+  expect(derivedSliceId(report), "derivedSliceId must be SLICE-37").toBe("SLICE-37");
+  expect(report.usd, "usd must be 1.9962").toBe(1.9962);
+  expect(report.totalTokens, "totalTokens must be 4947801").toBe(4947801);
+  expect(report.modelMix.length, "modelMix must have 1 entry").toBe(1);
+  expect(report.modelMix[0]?.model, "model must be claude-sonnet-4-6").toBe("claude-sonnet-4-6");
+  expect(report.subagentDispatches, "subagentDispatches must be 5").toBe(5);
+  expect(report.aggregateAll, "aggregateAll must be false").toBe(false);
 });
 
 // ---------------------------------------------------------------------------
@@ -47,18 +46,12 @@ test("loadCostReport: real FEAT113/SLICE37 fixture loads with correct fields", a
 // ---------------------------------------------------------------------------
 
 test("loadCostReport: aggregate file throws AggregateReportSkipped", async () => {
-  await assert.rejects(
-    () => loadCostReport(AGGREGATE_FIXTURE),
-    (err: unknown) => {
-      assert.ok(err instanceof AggregateReportSkipped, "expected AggregateReportSkipped");
-      return true;
-    }
-  );
+  await expect(loadCostReport(AGGREGATE_FIXTURE)).rejects.toBeInstanceOf(AggregateReportSkipped);
 });
 
 test("loadCostReportSafe: aggregate file returns null", async () => {
   const result = await loadCostReportSafe(AGGREGATE_FIXTURE);
-  assert.equal(result, null, "loadCostReportSafe must return null for aggregate file");
+  expect(result, "loadCostReportSafe must return null for aggregate file").toBe(null);
 });
 
 // ---------------------------------------------------------------------------
@@ -83,13 +76,7 @@ usd: 0.5
       "utf8"
     );
 
-    await assert.rejects(
-      () => loadCostReport(malformedPath),
-      (err: unknown) => {
-        assert.ok(err instanceof Error, "expected Error");
-        return true;
-      }
-    );
+    await expect(loadCostReport(malformedPath)).rejects.toBeInstanceOf(Error);
   } finally {
     await fs.rm(tmpDir, { recursive: true, force: true });
   }
diff --git a/crew/tests/telemetry-cost-report-to-spans.test.mts b/crew/tests/telemetry-cost-report-to-spans.test.mts
index ba90916a..ee9b80a3 100644
--- a/crew/tests/telemetry-cost-report-to-spans.test.mts
+++ b/crew/tests/telemetry-cost-report-to-spans.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/lib/telemetry/cost-report-to-spans.ts
  * AC-4: Span builder produces the correct trace tree.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import path from "node:path";
 import { loadCostReport } from "../scripts/lib/telemetry/cost-report-loader.mjs";
 import { costReportToSpans } from "../scripts/lib/telemetry/cost-report-to-spans.mjs";
@@ -21,32 +20,32 @@ test("costReportToSpans: real FEAT113/SLICE37 report produces 3 spans with corre
   const report = await loadCostReport(REAL_FIXTURE);
   const spans = costReportToSpans(report);
 
-  assert.equal(spans.length, 3, "Must produce exactly 3 spans: root + phase + agent");
+  expect(spans.length, "Must produce exactly 3 spans: root + phase + agent").toBe(3);
 
   const root = spans.find((s) => s.name === "slice.run");
   const phase = spans.find((s) => s.name === "phase.build");
   const agent = spans.find((s) => s.name === "agent.dispatch");
 
-  assert.ok(root, "Must have a slice.run span");
-  assert.ok(phase, "Must have a phase.build span");
-  assert.ok(agent, "Must have an agent.dispatch span");
+  expect(root, "Must have a slice.run span").toBeTruthy();
+  expect(phase, "Must have a phase.build span").toBeTruthy();
+  expect(agent, "Must have an agent.dispatch span").toBeTruthy();
 
   // All share same traceId
-  assert.equal(root.traceId, phase.traceId, "root and phase must share traceId");
-  assert.equal(phase.traceId, agent.traceId, "phase and agent must share traceId");
+  expect(root!.traceId, "root and phase must share traceId").toBe(phase!.traceId);
+  expect(phase!.traceId, "phase and agent must share traceId").toBe(agent!.traceId);
 
   // Parent-child links
-  assert.equal(root.parentSpanId, undefined, "root must have no parentSpanId");
-  assert.equal(phase.parentSpanId, root.spanId, "phase.parentSpanId must === root.spanId");
-  assert.equal(agent.parentSpanId, phase.spanId, "agent.parentSpanId must === phase.spanId");
+  expect(root!.parentSpanId, "root must have no parentSpanId").toBe(undefined);
+  expect(phase!.parentSpanId, "phase.parentSpanId must === root.spanId").toBe(root!.spanId);
+  expect(agent!.parentSpanId, "agent.parentSpanId must === phase.spanId").toBe(phase!.spanId);
 
   // Root attrs
-  assert.equal(root.attributes["feat_id"], "FEAT-113", "feat_id must be FEAT-113");
-  assert.equal(root.attributes["slice_id"], "SLICE-37", "slice_id must be SLICE-37");
-  assert.equal(root.attributes["run_id"], "20260607T122544Z", "run_id must match");
+  expect(root!.attributes["feat_id"], "feat_id must be FEAT-113").toBe("FEAT-113");
+  expect(root!.attributes["slice_id"], "slice_id must be SLICE-37").toBe("SLICE-37");
+  expect(root!.attributes["run_id"], "run_id must match").toBe("20260607T122544Z");
 
   // Agent model attr
-  assert.equal(agent.attributes["model"], "claude-sonnet-4-6", "model must be claude-sonnet-4-6");
+  expect(agent!.attributes["model"], "model must be claude-sonnet-4-6").toBe("claude-sonnet-4-6");
 });
 
 // ---------------------------------------------------------------------------
@@ -81,13 +80,13 @@ test("costReportToSpans: two-model report produces 4 spans", () => {
   };
 
   const spans = costReportToSpans(twoModelReport);
-  assert.equal(spans.length, 4, "Must produce 4 spans for 2 models");
+  expect(spans.length, "Must produce 4 spans for 2 models").toBe(4);
 
   const agentSpans = spans.filter((s) => s.name === "agent.dispatch");
-  assert.equal(agentSpans.length, 2, "Must have 2 agent spans");
+  expect(agentSpans.length, "Must have 2 agent spans").toBe(2);
 
   const models = agentSpans.map((s) => s.attributes["model"]).sort();
-  assert.deepEqual(models, ["claude-opus-4-7", "claude-sonnet-4-6"]);
+  expect(models).toEqual(["claude-opus-4-7", "claude-sonnet-4-6"]);
 });
 
 // ---------------------------------------------------------------------------
@@ -99,17 +98,15 @@ test("costReportToSpans: re-running produces identical spans (determinism)", asy
   const spans1 = costReportToSpans(report);
   const spans2 = costReportToSpans(report);
 
-  assert.equal(spans1.length, spans2.length, "span count must match");
+  expect(spans1.length, "span count must match").toBe(spans2.length);
   for (let i = 0; i < spans1.length; i++) {
     const s1 = spans1[i]!;
     const s2 = spans2[i]!;
-    assert.equal(s1.traceId, s2.traceId, `traceId must match for span ${i}`);
-    assert.equal(s1.spanId, s2.spanId, `spanId must match for span ${i}`);
-    assert.equal(s1.parentSpanId, s2.parentSpanId, `parentSpanId must match for span ${i}`);
-    assert.equal(
-      JSON.stringify(s1),
-      JSON.stringify(s2),
-      `span ${i} must be byte-identical across re-runs`
+    expect(s1.traceId, `traceId must match for span ${i}`).toBe(s2.traceId);
+    expect(s1.spanId, `spanId must match for span ${i}`).toBe(s2.spanId);
+    expect(s1.parentSpanId, `parentSpanId must match for span ${i}`).toBe(s2.parentSpanId);
+    expect(JSON.stringify(s1), `span ${i} must be byte-identical across re-runs`).toBe(
+      JSON.stringify(s2)
     );
   }
 });
@@ -144,10 +141,9 @@ test("costReportToSpans: cache_create_5m + cacheCreate1h are both summed into ca
 
   const spans = costReportToSpans(report);
   const agentSpan = spans.find((s) => s.name === "agent.dispatch");
-  assert.ok(agentSpan, "Must have an agent.dispatch span");
-  assert.equal(
-    agentSpan.attributes["usage.cache_creation_tokens"],
-    3000,
+  expect(agentSpan, "Must have an agent.dispatch span").toBeTruthy();
+  expect(
+    agentSpan!.attributes["usage.cache_creation_tokens"],
     "cache_creation_tokens must equal cacheCreate1h (2000) + cacheCreate5m (1000) = 3000"
-  );
+  ).toBe(3000);
 });
diff --git a/crew/tests/telemetry-hook-flush.test.mts b/crew/tests/telemetry-hook-flush.test.mts
index bc2d43a9..85fbce06 100644
--- a/crew/tests/telemetry-hook-flush.test.mts
+++ b/crew/tests/telemetry-hook-flush.test.mts
@@ -12,12 +12,11 @@
  * skips shutdown(), no request lands → test fails.
  *
  * Discovered via live Langfuse-cloud dogfood post-v0.37.0:
- *   - hooks/otel-post-tool-use.ts:   shipped without flush — dropped spans
- *   - hooks/otel-subagent-stop.ts:   shipped without flush — dropped spans
- *   - hooks/otel-stop.ts:            already correct, used as reference shape
+ *   - hooks/otel-post-tool-use.mts:   shipped without flush — dropped spans
+ *   - hooks/otel-subagent-stop.mts:   shipped without flush — dropped spans
+ *   - hooks/otel-stop.mts:            already correct, used as reference shape
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawn } from "node:child_process";
 import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
 import { writeFile, mkdtemp, rm } from "node:fs/promises";
@@ -164,7 +163,7 @@ export_timeout_ms: 30000
 
 // ---------------------------------------------------------------------------
 
-test("otel-post-tool-use.ts flushes BatchSpanProcessor before exit", async () => {
+test("otel-post-tool-use.mts flushes BatchSpanProcessor before exit", async () => {
   const payload = JSON.stringify({
     hook_event_name: "PostToolUse",
     session_id: "flush-test-post",
@@ -173,38 +172,38 @@ test("otel-post-tool-use.ts flushes BatchSpanProcessor before exit", async () =>
     tool_response: { stdout: "flush-check\n", exit_code: 0 }
   });
   const { exitCode, capture } = await runHookWithCollector({
-    hookPath: join(REPO_ROOT, "hooks", "otel-post-tool-use.ts"),
+    hookPath: join(REPO_ROOT, "hooks", "otel-post-tool-use.mts"),
     stdinPayload: payload
   });
-  assert.equal(exitCode, 0, "hook must exit 0");
-  assert.equal(capture.authHeader, "Basic test-auth-token", "auth header forwarded");
-  assert.ok(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)");
+  expect(exitCode, "hook must exit 0").toBe(0);
+  expect(capture.authHeader, "auth header forwarded").toBe("Basic test-auth-token");
+  expect(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)").toBeTruthy();
 });
 
-test("otel-stop.ts flushes BatchSpanProcessor before exit", async () => {
+test("otel-stop.mts flushes BatchSpanProcessor before exit", async () => {
   const payload = JSON.stringify({
     hook_event_name: "Stop",
     session_id: "flush-test-stop",
     stop_hook_active: true
   });
   const { exitCode, capture } = await runHookWithCollector({
-    hookPath: join(REPO_ROOT, "hooks", "otel-stop.ts"),
+    hookPath: join(REPO_ROOT, "hooks", "otel-stop.mts"),
     stdinPayload: payload
   });
-  assert.equal(exitCode, 0, "hook must exit 0");
-  assert.ok(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)");
+  expect(exitCode, "hook must exit 0").toBe(0);
+  expect(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)").toBeTruthy();
 });
 
-test("otel-subagent-stop.ts flushes BatchSpanProcessor before exit", async () => {
+test("otel-subagent-stop.mts flushes BatchSpanProcessor before exit", async () => {
   const payload = JSON.stringify({
     hook_event_name: "SubagentStop",
     session_id: "flush-test-subagent",
     stop_hook_active: true
   });
   const { exitCode, capture } = await runHookWithCollector({
-    hookPath: join(REPO_ROOT, "hooks", "otel-subagent-stop.ts"),
+    hookPath: join(REPO_ROOT, "hooks", "otel-subagent-stop.mts"),
     stdinPayload: payload
   });
-  assert.equal(exitCode, 0, "hook must exit 0");
-  assert.ok(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)");
+  expect(exitCode, "hook must exit 0").toBe(0);
+  expect(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)").toBeTruthy();
 });
diff --git a/crew/tests/telemetry-hooks-json.test.mts b/crew/tests/telemetry-hooks-json.test.mts
index 04a102a4..cc577694 100644
--- a/crew/tests/telemetry-hooks-json.test.mts
+++ b/crew/tests/telemetry-hooks-json.test.mts
@@ -1,8 +1,7 @@
 /**
  * Tests for hooks/hooks.json — AC-8: wire three new OTel hook entries.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
@@ -23,35 +22,35 @@ test("hooks.json: baseline entries present", async () => {
   const data = JSON.parse(raw) as HooksJson;
 
   // SessionStart baseline
-  assert.ok(data.hooks["SessionStart"], "SessionStart must exist");
+  expect(data.hooks["SessionStart"], "SessionStart must exist").toBeTruthy();
   const sessionStartCmds =
     data.hooks["SessionStart"]?.flatMap((g) => g.hooks.map((h) => h.command)) ?? [];
-  assert.ok(
+  expect(
     sessionStartCmds.some((c) => c.includes("log_event.sh") && c.includes("session_start")),
     "SessionStart log_event.sh entry must be present"
-  );
+  ).toBeTruthy();
 
   // SubagentStop baseline: log_event.sh still there
-  assert.ok(data.hooks["SubagentStop"], "SubagentStop must exist");
+  expect(data.hooks["SubagentStop"], "SubagentStop must exist").toBeTruthy();
   const subagentStopCmds =
     data.hooks["SubagentStop"]?.flatMap((g) => g.hooks.map((h) => h.command)) ?? [];
-  assert.ok(
+  expect(
     subagentStopCmds.some((c) => c.includes("log_event.sh") && c.includes("subagent_stop")),
     "SubagentStop baseline log_event.sh entry must be preserved"
-  );
+  ).toBeTruthy();
 
   // PostToolUse existing entries: Bash gate, Read record, Agent check
-  assert.ok(data.hooks["PostToolUse"], "PostToolUse must exist");
+  expect(data.hooks["PostToolUse"], "PostToolUse must exist").toBeTruthy();
   const postToolUseCmds =
     data.hooks["PostToolUse"]?.flatMap((g) => g.hooks.map((h) => h.command)) ?? [];
-  assert.ok(
-    postToolUseCmds.some((c) => c.includes("post-tool-use-bash-gate.ts")),
+  expect(
+    postToolUseCmds.some((c) => c.includes("post-tool-use-bash-gate.mts")),
     "PostToolUse Bash gate entry must be preserved"
-  );
-  assert.ok(
-    postToolUseCmds.some((c) => c.includes("record-read-content.ts")),
+  ).toBeTruthy();
+  expect(
+    postToolUseCmds.some((c) => c.includes("record-read-content.mts")),
     "PostToolUse Read record entry must be preserved"
-  );
+  ).toBeTruthy();
 });
 
 test("hooks.json: new OTel PostToolUse entry (no matcher)", async () => {
@@ -60,25 +59,25 @@ test("hooks.json: new OTel PostToolUse entry (no matcher)", async () => {
 
   const postToolUseGroups = data.hooks["PostToolUse"] ?? [];
   const otelGroup = postToolUseGroups.find(
-    (g) => !g.matcher && g.hooks.some((h) => h.command.includes("otel-post-tool-use.ts"))
-  );
-  assert.ok(otelGroup !== undefined, "PostToolUse must have a no-matcher OTel entry");
-  assert.ok(
-    otelGroup.hooks.some((h) => h.command.includes("otel-post-tool-use.ts")),
-    "OTel PostToolUse entry command must reference otel-post-tool-use.ts"
+    (g) => !g.matcher && g.hooks.some((h) => h.command.includes("otel-post-tool-use.mts"))
   );
+  expect(otelGroup !== undefined, "PostToolUse must have a no-matcher OTel entry").toBeTruthy();
+  expect(
+    otelGroup!.hooks.some((h) => h.command.includes("otel-post-tool-use.mts")),
+    "OTel PostToolUse entry command must reference otel-post-tool-use.mts"
+  ).toBeTruthy();
 });
 
 test("hooks.json: new Stop OTel entry", async () => {
   const raw = await fs.readFile(HOOKS_JSON_PATH, "utf8");
   const data = JSON.parse(raw) as HooksJson;
 
-  assert.ok(data.hooks["Stop"], "Stop top-level key must exist");
+  expect(data.hooks["Stop"], "Stop top-level key must exist").toBeTruthy();
   const stopCmds = data.hooks["Stop"]?.flatMap((g) => g.hooks.map((h) => h.command)) ?? [];
-  assert.ok(
-    stopCmds.some((c) => c.includes("otel-stop.ts")),
-    "Stop hooks must contain otel-stop.ts command"
-  );
+  expect(
+    stopCmds.some((c) => c.includes("otel-stop.mts")),
+    "Stop hooks must contain otel-stop.mts command"
+  ).toBeTruthy();
 });
 
 test("hooks.json: SubagentStop second entry for OTel", async () => {
@@ -89,13 +88,13 @@ test("hooks.json: SubagentStop second entry for OTel", async () => {
     data.hooks["SubagentStop"]?.flatMap((g) => g.hooks.map((h) => h.command)) ?? [];
 
   // Must retain original log_event.sh
-  assert.ok(
+  expect(
     subagentStopCmds.some((c) => c.includes("log_event.sh") && c.includes("subagent_stop")),
     "SubagentStop must still have log_event.sh command"
-  );
+  ).toBeTruthy();
   // Must add OTel shim
-  assert.ok(
-    subagentStopCmds.some((c) => c.includes("otel-subagent-stop.ts")),
-    "SubagentStop must have new otel-subagent-stop.ts command"
-  );
+  expect(
+    subagentStopCmds.some((c) => c.includes("otel-subagent-stop.mts")),
+    "SubagentStop must have new otel-subagent-stop.mts command"
+  ).toBeTruthy();
 });
diff --git a/crew/tests/telemetry-otel-bridge.test.mts b/crew/tests/telemetry-otel-bridge.test.mts
index 66b5b569..2b81fe84 100644
--- a/crew/tests/telemetry-otel-bridge.test.mts
+++ b/crew/tests/telemetry-otel-bridge.test.mts
@@ -14,8 +14,7 @@
  * - forceFlush() on the provider delegate drains BatchSpanProcessor into the
  *   InMemorySpanExporter without triggering the shutdown-and-clear path.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { trace } from "@opentelemetry/api";
 import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
 import {
@@ -99,8 +98,8 @@ test("initBridge: disabled cfg returns null without CREW_OTEL_ENABLED", async ()
     const t0 = performance.now();
     const sdk = await initBridge(cfg);
     const elapsed = performance.now() - t0;
-    assert.equal(sdk, null, "disabled bridge must return null");
-    assert.ok(elapsed < 50, `initBridge disabled should be < 50ms, was ${elapsed.toFixed(1)}ms`);
+    expect(sdk, "disabled bridge must return null").toBe(null);
+    expect(elapsed < 50, `initBridge disabled should be < 50ms, was ${elapsed.toFixed(1)}ms`).toBeTruthy();
   } finally {
     if (envBefore !== undefined) process.env["CREW_OTEL_ENABLED"] = envBefore;
   }
@@ -118,10 +117,10 @@ test("initBridge disabled-path: 100 iterations ≤ 500ms total (AC-6)", async ()
       parsePostToolUse(raw);
     }
     const elapsed = performance.now() - t0;
-    assert.ok(
+    expect(
       elapsed <= 500,
       `100 disabled iterations must be ≤500ms, was ${elapsed.toFixed(1)}ms`
-    );
+    ).toBeTruthy();
   } finally {
     if (envBefore !== undefined) process.env["CREW_OTEL_ENABLED"] = envBefore;
   }
@@ -136,18 +135,18 @@ test("emitPostToolUseSpan: fixture round-trip produces tool_call span", async ()
   const cfg = makeEnabledConfig();
 
   const payload = parsePostToolUse(JSON.stringify(postToolUseFixture));
-  assert.ok(payload !== null, "fixture must parse successfully");
+  expect(payload !== null, "fixture must parse successfully").toBeTruthy();
 
-  emitPostToolUseSpan(sdk, payload, cfg);
+  emitPostToolUseSpan(sdk, payload!, cfg);
 
   const spans = await flushSpans(exporter);
-  assert.ok(spans.length >= 1, `expected at least 1 span, got ${spans.length}`);
+  expect(spans.length >= 1, `expected at least 1 span, got ${spans.length}`).toBeTruthy();
 
   const toolCallSpan = spans.find((s) => s.name === "tool_call");
-  assert.ok(toolCallSpan !== undefined, "expected span named 'tool_call'");
-  assert.equal(toolCallSpan.attributes["tool.name"], "Bash");
-  assert.equal(toolCallSpan.attributes["session.id"], "test-session-001");
-  assert.ok("cwd" in toolCallSpan.attributes, "span must have cwd attr");
+  expect(toolCallSpan !== undefined, "expected span named 'tool_call'").toBeTruthy();
+  expect(toolCallSpan!.attributes["tool.name"]).toBe("Bash");
+  expect(toolCallSpan!.attributes["session.id"]).toBe("test-session-001");
+  expect("cwd" in toolCallSpan!.attributes, "span must have cwd attr").toBeTruthy();
 });
 
 // ---------------------------------------------------------------------------
@@ -156,40 +155,20 @@ test("emitPostToolUseSpan: fixture round-trip produces tool_call span", async ()
 
 test("sampleSpan: sample_rate=0.0 always false", () => {
   const cfg = makeEnabledConfig({ sample_rate: 0.0 });
-  assert.equal(
-    sampleSpan(cfg, () => 0.5),
-    false
-  );
-  assert.equal(
-    sampleSpan(cfg, () => 0.0),
-    false
-  );
+  expect(sampleSpan(cfg, () => 0.5)).toBe(false);
+  expect(sampleSpan(cfg, () => 0.0)).toBe(false);
 });
 
 test("sampleSpan: sample_rate=1.0 always true", () => {
   const cfg = makeEnabledConfig({ sample_rate: 1.0 });
-  assert.equal(
-    sampleSpan(cfg, () => 0.999),
-    true
-  );
-  assert.equal(
-    sampleSpan(cfg, () => 0.0),
-    true
-  );
+  expect(sampleSpan(cfg, () => 0.999)).toBe(true);
+  expect(sampleSpan(cfg, () => 0.0)).toBe(true);
 });
 
 test("sampleSpan: sample_rate=0.6 boundary", () => {
   const cfg = makeEnabledConfig({ sample_rate: 0.6 });
-  assert.equal(
-    sampleSpan(cfg, () => 0.3),
-    true,
-    "0.3 < 0.6 → true"
-  );
-  assert.equal(
-    sampleSpan(cfg, () => 0.9),
-    false,
-    "0.9 >= 0.6 → false"
-  );
+  expect(sampleSpan(cfg, () => 0.3), "0.3 < 0.6 → true").toBe(true);
+  expect(sampleSpan(cfg, () => 0.9), "0.9 >= 0.6 → false").toBe(false);
 });
 
 // ---------------------------------------------------------------------------
@@ -201,11 +180,11 @@ test("emitStopSpan: Stop span flushed via forceFlush within 1.5s", async () => {
   const cfg = makeEnabledConfig();
 
   const payload = parseStop(JSON.stringify(stopFixture));
-  assert.ok(payload !== null, "stop fixture must parse");
+  expect(payload !== null, "stop fixture must parse").toBeTruthy();
 
-  emitStopSpan(sdk, payload, cfg);
+  emitStopSpan(sdk, payload!, cfg);
 
-  // Production path: otel-stop.ts awaits sdk.shutdown() which drains a live
+  // Production path: otel-stop.mts awaits sdk.shutdown() which drains a live
   // OTLP exporter. In tests we use forceFlush() to drain without clearing the
   // InMemorySpanExporter buffer. The 1.5s timeout is the AC-7 deadline.
   const t0 = performance.now();
@@ -216,10 +195,10 @@ test("emitStopSpan: Stop span flushed via forceFlush within 1.5s", async () => {
     )
   ]);
   const elapsed = performance.now() - t0;
-  assert.ok(elapsed < 1500, `flush must complete within 1.5s, took ${elapsed.toFixed(0)}ms`);
+  expect(elapsed < 1500, `flush must complete within 1.5s, took ${elapsed.toFixed(0)}ms`).toBeTruthy();
 
   const stopSpan = spans.find((s) => s.name === "session.stop");
-  assert.ok(stopSpan !== undefined, "session.stop span must be flushed");
-  assert.equal(stopSpan.attributes["session.id"], "test-session-001");
-  assert.equal(stopSpan.attributes["reason"], "user_requested");
+  expect(stopSpan !== undefined, "session.stop span must be flushed").toBeTruthy();
+  expect(stopSpan!.attributes["session.id"]).toBe("test-session-001");
+  expect(stopSpan!.attributes["reason"]).toBe("user_requested");
 });
diff --git a/crew/tests/telemetry-plugin-cache-smoke.test.mts b/crew/tests/telemetry-plugin-cache-smoke.test.mts
index d93c3fef..d45c4810 100644
--- a/crew/tests/telemetry-plugin-cache-smoke.test.mts
+++ b/crew/tests/telemetry-plugin-cache-smoke.test.mts
@@ -17,8 +17,7 @@
  * Symlink type='junction' is used for cross-platform compatibility — Windows
  * needs junction for directory symlinks without admin rights.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawn } from "node:child_process";
 import { mkdtemp, rm, mkdir, cp, symlink, readdir, copyFile } from "node:fs/promises";
 import { tmpdir, platform } from "node:os";
@@ -140,10 +139,10 @@ async function spawnHook(opts: {
 function assertNoOtelLeak(stderr: string, hookName: string): void {
   const banned = ["@opentelemetry", "ENOENT", "MODULE_NOT_FOUND"];
   for (const needle of banned) {
-    assert.ok(
+    expect(
       !stderr.includes(needle),
       `${hookName}: disabled-path stderr must not contain "${needle}" — got:\n${stderr}`
-    );
+    ).toBeTruthy();
   }
 }
 
@@ -151,7 +150,7 @@ function assertNoOtelLeak(stderr: string, hookName: string): void {
 // Cases — one per hook entry. Each spawns in an isolated plugin-cache temp dir.
 // ---------------------------------------------------------------------------
 
-test("otel-post-tool-use.ts: disabled path resolves without @opentelemetry/*", async () => {
+test("otel-post-tool-use.mts: disabled path resolves without @opentelemetry/*", async () => {
   const cacheRoot = await buildPluginCacheTemp();
   try {
     const payload = JSON.stringify({
@@ -163,17 +162,17 @@ test("otel-post-tool-use.ts: disabled path resolves without @opentelemetry/*", a
     });
     const result = await spawnHook({
       cacheRoot,
-      hookRelPath: join("hooks", "otel-post-tool-use.ts"),
+      hookRelPath: join("hooks", "otel-post-tool-use.mts"),
       stdinPayload: payload
     });
-    assert.equal(result.exitCode, 0, `hook must exit 0, stderr:\n${result.stderr}`);
+    expect(result.exitCode, `hook must exit 0, stderr:\n${result.stderr}`).toBe(0);
     assertNoOtelLeak(result.stderr, "otel-post-tool-use");
   } finally {
     await rm(cacheRoot, { recursive: true, force: true });
   }
 });
 
-test("otel-stop.ts: disabled path resolves without @opentelemetry/*", async () => {
+test("otel-stop.mts: disabled path resolves without @opentelemetry/*", async () => {
   const cacheRoot = await buildPluginCacheTemp();
   try {
     const payload = JSON.stringify({
@@ -183,17 +182,17 @@ test("otel-stop.ts: disabled path resolves without @opentelemetry/*", async () =
     });
     const result = await spawnHook({
       cacheRoot,
-      hookRelPath: join("hooks", "otel-stop.ts"),
+      hookRelPath: join("hooks", "otel-stop.mts"),
       stdinPayload: payload
     });
-    assert.equal(result.exitCode, 0, `hook must exit 0, stderr:\n${result.stderr}`);
+    expect(result.exitCode, `hook must exit 0, stderr:\n${result.stderr}`).toBe(0);
     assertNoOtelLeak(result.stderr, "otel-stop");
   } finally {
     await rm(cacheRoot, { recursive: true, force: true });
   }
 });
 
-test("otel-subagent-stop.ts: disabled path resolves without @opentelemetry/*", async () => {
+test("otel-subagent-stop.mts: disabled path resolves without @opentelemetry/*", async () => {
   const cacheRoot = await buildPluginCacheTemp();
   try {
     const payload = JSON.stringify({
@@ -203,10 +202,10 @@ test("otel-subagent-stop.ts: disabled path resolves without @opentelemetry/*", a
     });
     const result = await spawnHook({
       cacheRoot,
-      hookRelPath: join("hooks", "otel-subagent-stop.ts"),
+      hookRelPath: join("hooks", "otel-subagent-stop.mts"),
       stdinPayload: payload
     });
-    assert.equal(result.exitCode, 0, `hook must exit 0, stderr:\n${result.stderr}`);
+    expect(result.exitCode, `hook must exit 0, stderr:\n${result.stderr}`).toBe(0);
     assertNoOtelLeak(result.stderr, "otel-subagent-stop");
   } finally {
     await rm(cacheRoot, { recursive: true, force: true });
diff --git a/crew/tests/telemetry-scrub.test.mts b/crew/tests/telemetry-scrub.test.mts
index 77dfba48..5e47c9fa 100644
--- a/crew/tests/telemetry-scrub.test.mts
+++ b/crew/tests/telemetry-scrub.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/lib/telemetry/scrub.ts
  * AC-4: deny-list keys, long strings, path globs, scrub_pii=false passthrough.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { scrubAttrs, matchesRedactPath } from "../scripts/lib/telemetry/scrub.mjs";
 
 // ---------------------------------------------------------------------------
@@ -19,11 +18,11 @@ test("scrubAttrs: deny-list key redacted regardless of length", () => {
     },
     { scrub_pii: true, redact_paths: [], redact_attr_max_chars: 10000 }
   );
-  assert.equal(result["tool_input.content"], "<redacted:key>");
+  expect(result["tool_input.content"]).toBe("<redacted:key>");
   // Numeric attrs unchanged
-  assert.equal(result["count"], 42);
+  expect(result["count"]).toBe(42);
   // Boolean attrs unchanged
-  assert.equal(result["flag"], true);
+  expect(result["flag"]).toBe(true);
 });
 
 test("scrubAttrs: all deny-list keys are redacted", () => {
@@ -52,7 +51,7 @@ test("scrubAttrs: all deny-list keys are redacted", () => {
     redact_attr_max_chars: 10000
   });
   for (const k of denyListKeys) {
-    assert.equal(result[k], "<redacted:key>", `${k} should be redacted`);
+    expect(result[k], `${k} should be redacted`).toBe("<redacted:key>");
   }
 });
 
@@ -66,7 +65,7 @@ test("scrubAttrs: string longer than max chars redacted with length", () => {
     { message: longStr },
     { scrub_pii: true, redact_paths: [], redact_attr_max_chars: 2048 }
   );
-  assert.equal(result["message"], "<redacted:length=3000>");
+  expect(result["message"]).toBe("<redacted:length=3000>");
 });
 
 // ---------------------------------------------------------------------------
@@ -78,13 +77,13 @@ test("scrubAttrs: value matching redact_paths glob is redacted", () => {
     { file_path: "/home/u/.env.local" },
     { scrub_pii: true, redact_paths: ["**/.env.*"], redact_attr_max_chars: 10000 }
   );
-  assert.equal(result["file_path"], "<redacted:path>");
+  expect(result["file_path"]).toBe("<redacted:path>");
 });
 
 test("matchesRedactPath: ** glob matches nested paths", () => {
-  assert.equal(matchesRedactPath("/home/u/.env.local", ["**/.env.*"]), true);
-  assert.equal(matchesRedactPath("/secrets/key.pem", ["**/*.pem"]), true);
-  assert.equal(matchesRedactPath("/home/u/safe.txt", ["**/.env.*"]), false);
+  expect(matchesRedactPath("/home/u/.env.local", ["**/.env.*"])).toBe(true);
+  expect(matchesRedactPath("/secrets/key.pem", ["**/*.pem"])).toBe(true);
+  expect(matchesRedactPath("/home/u/safe.txt", ["**/.env.*"])).toBe(false);
 });
 
 // ---------------------------------------------------------------------------
@@ -102,5 +101,5 @@ test("scrubAttrs: scrub_pii=false passes through unchanged", () => {
     redact_paths: [],
     redact_attr_max_chars: 10
   });
-  assert.deepEqual(result, input);
+  expect(result).toEqual(input);
 });
diff --git a/crew/tests/telemetry-span-schema.test.mts b/crew/tests/telemetry-span-schema.test.mts
index 9bcbe10c..b3b3088c 100644
--- a/crew/tests/telemetry-span-schema.test.mts
+++ b/crew/tests/telemetry-span-schema.test.mts
@@ -2,8 +2,7 @@
  * Tests for scripts/lib/telemetry/span.ts
  * AC-2: Zod span schema validates real spans end-to-end.
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { SpanRecordSchema, newTraceId, newSpanId } from "../scripts/lib/telemetry/span.mjs";
 
 // ---------------------------------------------------------------------------
@@ -22,11 +21,11 @@ test("SpanRecordSchema: valid span passes parse", () => {
     events: [],
     status: { code: "OK" }
   });
-  assert.equal(span.traceId, "a".repeat(32));
-  assert.equal(span.spanId, "b".repeat(16));
-  assert.equal(span.name, "slice.run");
-  assert.equal(span.kind, "INTERNAL");
-  assert.equal(span.status.code, "OK");
+  expect(span.traceId).toBe("a".repeat(32));
+  expect(span.spanId).toBe("b".repeat(16));
+  expect(span.name).toBe("slice.run");
+  expect(span.kind).toBe("INTERNAL");
+  expect(span.status.code).toBe("OK");
 });
 
 // ---------------------------------------------------------------------------
@@ -34,28 +33,19 @@ test("SpanRecordSchema: valid span passes parse", () => {
 // ---------------------------------------------------------------------------
 
 test("SpanRecordSchema: invalid traceId (31 chars) is rejected", () => {
-  assert.throws(
-    () =>
-      SpanRecordSchema.parse({
-        traceId: "a".repeat(31), // one short
-        spanId: "b".repeat(16),
-        name: "slice.run",
-        kind: "INTERNAL",
-        startTimeUnixNano: "1717754000000000000",
-        endTimeUnixNano: "1717754100000000000",
-        attributes: {},
-        events: [],
-        status: { code: "UNSET" }
-      }),
-    (err: unknown) => {
-      assert.ok(err instanceof Error, "expected Error");
-      assert.ok(
-        err.message.includes("traceId"),
-        `error message should mention traceId: ${err.message}`
-      );
-      return true;
-    }
-  );
+  expect(() =>
+    SpanRecordSchema.parse({
+      traceId: "a".repeat(31), // one short
+      spanId: "b".repeat(16),
+      name: "slice.run",
+      kind: "INTERNAL",
+      startTimeUnixNano: "1717754000000000000",
+      endTimeUnixNano: "1717754100000000000",
+      attributes: {},
+      events: [],
+      status: { code: "UNSET" }
+    })
+  ).toThrow(/traceId/);
 });
 
 // ---------------------------------------------------------------------------
@@ -76,22 +66,20 @@ test("SpanRecordSchema: passthrough keeps unknown fields like traceState", () =>
     traceState: "vendor=x",
     droppedAttributesCount: 0
   }) as Record<string, unknown>;
-  assert.equal(span["traceState"], "vendor=x", "traceState must survive passthrough");
-  assert.equal(
-    span["droppedAttributesCount"],
-    0,
-    "droppedAttributesCount must survive passthrough"
+  expect(span["traceState"], "traceState must survive passthrough").toBe("vendor=x");
+  expect(span["droppedAttributesCount"], "droppedAttributesCount must survive passthrough").toBe(
+    0
   );
 });
 
 test("newTraceId and newSpanId are deterministic", () => {
   const t1 = newTraceId("run-x");
   const t2 = newTraceId("run-x");
-  assert.equal(t1, t2, "newTraceId must return same value for same seed");
-  assert.match(t1, /^[0-9a-f]{32}$/, "newTraceId must return 32-hex string");
+  expect(t1, "newTraceId must return same value for same seed").toBe(t2);
+  expect(t1, "newTraceId must return 32-hex string").toMatch(/^[0-9a-f]{32}$/);
 
   const s1 = newSpanId("run-x.root");
   const s2 = newSpanId("run-x.root");
-  assert.equal(s1, s2, "newSpanId must return same value for same seed");
-  assert.match(s1, /^[0-9a-f]{16}$/, "newSpanId must return 16-hex string");
+  expect(s1, "newSpanId must return same value for same seed").toBe(s2);
+  expect(s1, "newSpanId must return 16-hex string").toMatch(/^[0-9a-f]{16}$/);
 });
diff --git a/crew/tests/test-quality-integration.test.mts b/crew/tests/test-quality-integration.test.mts
index 7f33bb90..623b9148 100644
--- a/crew/tests/test-quality-integration.test.mts
+++ b/crew/tests/test-quality-integration.test.mts
@@ -16,7 +16,7 @@ const analyzeScript = path.join(
   "workflow",
   "test-quality",
   "scripts",
-  "analyze.ts"
+  "analyze.mts"
 );
 const fixtureDir = path.join(repoRoot, "tests", "fixtures", "test-quality");
 
diff --git a/crew/tests/test-shard.test.mts b/crew/tests/test-shard.test.mts
index 8b6cfe39..bb212a2b 100644
--- a/crew/tests/test-shard.test.mts
+++ b/crew/tests/test-shard.test.mts
@@ -6,8 +6,7 @@
 // synthetic file list and the real tests/ tree so a future test file
 // addition/removal can't silently fall outside every shard.
 
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { discoverTestFiles, partitionFiles } from "../scripts/test-shard.mjs";
 
 function unionOverShards(files: readonly string[], shardTotal: number): string[] {
@@ -21,7 +20,7 @@ function unionOverShards(files: readonly string[], shardTotal: number): string[]
 test("partitionFiles: union of all shards equals the sorted input, no gaps", () => {
   const files = ["c.test.ts", "a.test.ts", "e.test.ts", "b.test.ts", "d.test.ts"];
   const union = unionOverShards(files, 3);
-  assert.deepEqual(union.slice().sort(), [...files].sort());
+  expect(union.slice().sort()).toEqual([...files].sort());
 });
 
 test("partitionFiles: no file appears in more than one shard", () => {
@@ -33,58 +32,58 @@ test("partitionFiles: no file appears in more than one shard", () => {
       seen.set(f, (seen.get(f) ?? 0) + 1);
     }
   }
-  assert.equal(seen.size, files.length, "every file must be assigned to some shard");
+  expect(seen.size, "every file must be assigned to some shard").toBe(files.length);
   for (const [file, count] of seen) {
-    assert.equal(count, 1, `${file} was assigned to ${count} shards, expected exactly 1`);
+    expect(count, `${file} was assigned to ${count} shards, expected exactly 1`).toBe(1);
   }
 });
 
 test("partitionFiles: deterministic across repeated calls and unsorted input order", () => {
   const filesA = ["z.test.ts", "m.test.ts", "a.test.ts"];
   const filesB = ["a.test.ts", "z.test.ts", "m.test.ts"]; // same set, different order
-  assert.deepEqual(partitionFiles(filesA, 0, 2), partitionFiles(filesA, 0, 2));
-  assert.deepEqual(partitionFiles(filesA, 0, 2), partitionFiles(filesB, 0, 2));
+  expect(partitionFiles(filesA, 0, 2)).toEqual(partitionFiles(filesA, 0, 2));
+  expect(partitionFiles(filesA, 0, 2)).toEqual(partitionFiles(filesB, 0, 2));
 });
 
 test("partitionFiles: shardTotal=1 assigns every file to the single shard", () => {
   const files = ["a.test.ts", "b.test.ts", "c.test.ts"];
-  assert.deepEqual(partitionFiles(files, 0, 1), [...files].sort());
+  expect(partitionFiles(files, 0, 1)).toEqual([...files].sort());
 });
 
 test("partitionFiles: empty input yields empty shards", () => {
-  assert.deepEqual(partitionFiles([], 0, 3), []);
-  assert.deepEqual(unionOverShards([], 3), []);
+  expect(partitionFiles([], 0, 3)).toEqual([]);
+  expect(unionOverShards([], 3)).toEqual([]);
 });
 
 test("partitionFiles: rejects out-of-range shardIndex", () => {
-  assert.throws(() => partitionFiles(["a.test.ts"], 3, 3));
-  assert.throws(() => partitionFiles(["a.test.ts"], -1, 3));
+  expect(() => partitionFiles(["a.test.ts"], 3, 3)).toThrow();
+  expect(() => partitionFiles(["a.test.ts"], -1, 3)).toThrow();
 });
 
 test("partitionFiles: rejects non-positive shardTotal", () => {
-  assert.throws(() => partitionFiles(["a.test.ts"], 0, 0));
-  assert.throws(() => partitionFiles(["a.test.ts"], 0, -1));
+  expect(() => partitionFiles(["a.test.ts"], 0, 0)).toThrow();
+  expect(() => partitionFiles(["a.test.ts"], 0, -1)).toThrow();
 });
 
 test("discoverTestFiles + partitionFiles: real tests/ tree is fully covered across 3 shards", async () => {
   const allFiles = await discoverTestFiles();
-  assert.ok(allFiles.length > 0, "expected at least one discovered test file");
+  expect(allFiles.length > 0, "expected at least one discovered test file").toBeTruthy();
   // This file itself must be discoverable, proving the walk reaches every subdirectory depth used in tests/.
-  assert.ok(
-    allFiles.includes("tests/test-shard.test.ts"),
-    "discoverTestFiles did not find tests/test-shard.test.ts"
-  );
+  expect(
+    allFiles.includes("tests/test-shard.test.mts"),
+    "discoverTestFiles did not find tests/test-shard.test.mts"
+  ).toBeTruthy();
 
   const shardTotal = 3;
   const union = unionOverShards(allFiles, shardTotal);
-  assert.deepEqual(union.slice().sort(), [...allFiles].sort());
+  expect(union.slice().sort()).toEqual([...allFiles].sort());
 
   const seen = new Set<string>();
   for (let shardIndex = 0; shardIndex < shardTotal; shardIndex++) {
     for (const f of partitionFiles(allFiles, shardIndex, shardTotal)) {
-      assert.ok(!seen.has(f), `${f} appeared in more than one shard`);
+      expect(!seen.has(f), `${f} appeared in more than one shard`).toBeTruthy();
       seen.add(f);
     }
   }
-  assert.equal(seen.size, allFiles.length);
+  expect(seen.size).toBe(allFiles.length);
 });
diff --git a/crew/tests/tier-classification.test.mts b/crew/tests/tier-classification.test.mts
index 8a857f20..7191b764 100644
--- a/crew/tests/tier-classification.test.mts
+++ b/crew/tests/tier-classification.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { isLightTier } from "../scripts/orchestrate-slice-classify.mjs";
 
 // Test 1: Docs-only files → light
@@ -8,7 +7,7 @@ test("isLightTier: docs-only (all .md/.txt) → light", () => {
     changedLines: 100,
     filesChanged: ["README.md", "docs/guide.md", "CHANGELOG.txt"]
   });
-  assert.equal(result, true, "docs-only should be light tier");
+  expect(result, "docs-only should be light tier").toBe(true);
 });
 
 // Test 2: Small code change in tests → light
@@ -17,7 +16,7 @@ test("isLightTier: 30-line code change in tests/ → light", () => {
     changedLines: 30,
     filesChanged: ["tests/foo.test.ts", "tests/bar.test.ts"]
   });
-  assert.equal(result, true, "small test-only change should be light tier");
+  expect(result, "small test-only change should be light tier").toBe(true);
 });
 
 // Test 3: Small code change in src but touches hooks → full
@@ -26,7 +25,7 @@ test("isLightTier: 30-line change touching hooks/ → full", () => {
     changedLines: 30,
     filesChanged: ["hooks/pre-commit", "src/foo.ts"]
   });
-  assert.equal(result, false, "any change touching hooks should be full tier");
+  expect(result, "any change touching hooks should be full tier").toBe(false);
 });
 
 // Test 4: Code change exceeding threshold → full
@@ -35,7 +34,7 @@ test("isLightTier: 80-line change → full", () => {
     changedLines: 80,
     filesChanged: ["src/large.ts"]
   });
-  assert.equal(result, false, "change exceeding threshold should be full tier");
+  expect(result, "change exceeding threshold should be full tier").toBe(false);
 });
 
 // Test 5: Code change touching package.json → full
@@ -44,7 +43,7 @@ test("isLightTier: code change touching package.json → full", () => {
     changedLines: 20,
     filesChanged: ["src/foo.ts", "package.json"]
   });
-  assert.equal(result, false, "any change touching package.json should be full tier");
+  expect(result, "any change touching package.json should be full tier").toBe(false);
 });
 
 // Test 6: Code change touching tsconfig → full
@@ -53,7 +52,7 @@ test("isLightTier: code change touching tsconfig → full", () => {
     changedLines: 10,
     filesChanged: ["tsconfig.json"]
   });
-  assert.equal(result, false, "any change touching tsconfig should be full tier");
+  expect(result, "any change touching tsconfig should be full tier").toBe(false);
 });
 
 // Test 7: Code change touching eslint.config → full
@@ -62,7 +61,7 @@ test("isLightTier: code change touching eslint.config → full", () => {
     changedLines: 5,
     filesChanged: ["eslint.config.ts"]
   });
-  assert.equal(result, false, "any change touching eslint.config should be full tier");
+  expect(result, "any change touching eslint.config should be full tier").toBe(false);
 });
 
 // Test 8: Code change touching .claude-plugin/ → full
@@ -71,7 +70,7 @@ test("isLightTier: code change touching .claude-plugin/ → full", () => {
     changedLines: 10,
     filesChanged: [".claude-plugin/manifest.json"]
   });
-  assert.equal(result, false, "any change touching .claude-plugin/ should be full tier");
+  expect(result, "any change touching .claude-plugin/ should be full tier").toBe(false);
 });
 
 // Test 9: Code change touching scripts/ (non-test) → full
@@ -80,7 +79,7 @@ test("isLightTier: code change touching scripts/ (non-test) → full", () => {
     changedLines: 20,
     filesChanged: ["scripts/deploy.ts"]
   });
-  assert.equal(result, false, "any change touching scripts/ (non-test) should be full tier");
+  expect(result, "any change touching scripts/ (non-test) should be full tier").toBe(false);
 });
 
 // Test 10: Code change in scripts/ excluded from light tier (even tests)
@@ -89,7 +88,7 @@ test("isLightTier: 30-line change in scripts/lib/some.test.ts → full", () => {
     changedLines: 30,
     filesChanged: ["scripts/lib/some.test.ts"]
   });
-  assert.equal(result, false, "any change touching scripts/ should be full tier");
+  expect(result, "any change touching scripts/ should be full tier").toBe(false);
 });
 
 // Test 11: Empty files list → light (edge case)
@@ -98,7 +97,7 @@ test("isLightTier: empty files list → light (edge case)", () => {
     changedLines: 0,
     filesChanged: []
   });
-  assert.equal(result, true, "empty file list is light tier");
+  expect(result, "empty file list is light tier").toBe(true);
 });
 
 // Test 12: loopJson override respected
@@ -113,7 +112,7 @@ test("isLightTier: loop.json override maxChangedLines respected", () => {
       }
     }
   });
-  assert.equal(result, true, "loop.json override should allow up to 100 lines");
+  expect(result, "loop.json override should allow up to 100 lines").toBe(true);
 
   // Verify it rejects at 101
   const resultOver = isLightTier({
@@ -125,7 +124,7 @@ test("isLightTier: loop.json override maxChangedLines respected", () => {
       }
     }
   });
-  assert.equal(resultOver, false, "loop.json override should reject > 100 lines");
+  expect(resultOver, "loop.json override should reject > 100 lines").toBe(false);
 });
 
 // Test 13: Mixed docs and code, but under threshold → light
@@ -134,7 +133,7 @@ test("isLightTier: 20 lines code + 50 lines docs, under threshold → light", ()
     changedLines: 20,
     filesChanged: ["src/small.ts", "docs/api.md"]
   });
-  assert.equal(result, true, "mixed docs and code under threshold should be light tier");
+  expect(result, "mixed docs and code under threshold should be light tier").toBe(true);
 });
 
 // Test 14: Case-insensitive .MD/.TXT detection
@@ -143,5 +142,5 @@ test("isLightTier: case-insensitive .MD/.TXT detection", () => {
     changedLines: 100,
     filesChanged: ["README.MD", "GUIDE.TXT"]
   });
-  assert.equal(result, true, "case-insensitive doc detection should work");
+  expect(result, "case-insensitive doc detection should work").toBe(true);
 });
diff --git a/crew/tests/tier-in-run-brief.test.mts b/crew/tests/tier-in-run-brief.test.mts
index e65e3398..fba654c2 100644
--- a/crew/tests/tier-in-run-brief.test.mts
+++ b/crew/tests/tier-in-run-brief.test.mts
@@ -1,8 +1,7 @@
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
 import { execFile as execFileCallback } from "node:child_process";
@@ -14,7 +13,7 @@ const cliPath = path.join(repoRoot, "scripts", "crew.mts");
 
 async function makeTempRepo(prefix: string) {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
-  await execFile("node", ["--experimental-strip-types", cliPath, "init", "--repo", dir]);
+  await execFile("bun", [cliPath, "init", "--repo", dir]);
   return dir;
 }
 
@@ -23,7 +22,7 @@ async function cleanup(dir: string) {
 }
 
 function runCli(args: string[]) {
-  const result = spawnSync(process.execPath, ["--experimental-strip-types", cliPath, ...args], {
+  const result = spawnSync(process.execPath, [cliPath, ...args], {
     encoding: "utf8",
     timeout: 30_000
   });
@@ -47,10 +46,10 @@ test("write-run-brief --tier full renders tier field", async () => {
       "--tier",
       "full"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /Tier: full/, "artifact must contain 'Tier: full'");
+    expect(body, "artifact must contain 'Tier: full'").toMatch(/Tier: full/);
   } finally {
     await cleanup(repoPath);
   }
@@ -69,10 +68,10 @@ test("write-run-brief --tier light renders tier field", async () => {
       "--tier",
       "light"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /Tier: light/, "artifact must contain 'Tier: light'");
+    expect(body, "artifact must contain 'Tier: light'").toMatch(/Tier: light/);
   } finally {
     await cleanup(repoPath);
   }
@@ -89,10 +88,12 @@ test("write-run-brief without --tier defaults to 'full'", async () => {
       "--title",
       "Default tier run"
     ]);
-    assert.equal(status, 0, "expected exit 0");
+    expect(status, "expected exit 0").toBe(0);
     const result = JSON.parse(stdout);
     const body = await fs.readFile(result.path, "utf8");
-    assert.match(body, /Tier: full/, "artifact should default to 'Tier: full' when not specified");
+    expect(body, "artifact should default to 'Tier: full' when not specified").toMatch(
+      /Tier: full/
+    );
   } finally {
     await cleanup(repoPath);
   }
diff --git a/crew/tests/ux-validation-integration.test.mts b/crew/tests/ux-validation-integration.test.mts
index 92acdff5..7404aca5 100644
--- a/crew/tests/ux-validation-integration.test.mts
+++ b/crew/tests/ux-validation-integration.test.mts
@@ -1,5 +1,4 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 
 import {
   extractACs,
@@ -16,15 +15,15 @@ test("integration: full pipeline passes on clean evidence", async () => {
 - [ ] AC-2: see welcome banner
 `;
   const acs = extractACs(sliceContent);
-  assert.equal(acs.length, 2);
+  expect(acs.length).toBe(2);
 
   const scenarios = acs.map((ac) => ({
     id: ac.id,
     category: classifyScenario(ac.text),
     text: ac.text
   }));
-  assert.equal(scenarios[0]!.category, "interaction");
-  assert.equal(scenarios[1]!.category, "visibility");
+  expect(scenarios[0]!.category).toBe("interaction");
+  expect(scenarios[1]!.category).toBe("visibility");
 
   // Mock /qa output (all pass)
   const evidence = {
@@ -35,7 +34,7 @@ test("integration: full pipeline passes on clean evidence", async () => {
     visual: { diffs: [] }
   };
 
-  assert.equal(computeVerdict(evidence), "passed");
+  expect(computeVerdict(evidence)).toBe("passed");
 });
 
 test("integration: full pipeline fails on AC fail + serious a11y", async () => {
@@ -45,7 +44,7 @@ test("integration: full pipeline fails on AC fail + serious a11y", async () => {
 - [ ] AC-2: see image
 `;
   const acs = extractACs(sliceContent);
-  assert.equal(acs.length, 2);
+  expect(acs.length).toBe(2);
 
   const evidence = {
     ac_results: [
@@ -58,7 +57,7 @@ test("integration: full pipeline fails on AC fail + serious a11y", async () => {
     visual: { diffs: [] }
   };
 
-  assert.equal(computeVerdict(evidence), "failed");
+  expect(computeVerdict(evidence)).toBe("failed");
 });
 
 test("integration: qa invocation contains all required flags", () => {
@@ -77,6 +76,6 @@ test("integration: qa invocation contains all required flags", () => {
     "--visual-baseline",
     "--output"
   ]) {
-    assert.match(cmd, new RegExp(flag));
+    expect(cmd).toMatch(new RegExp(flag));
   }
 });
diff --git a/crew/tests/ux-validation.test.mts b/crew/tests/ux-validation.test.mts
index db2d4c03..fb6fbef4 100644
--- a/crew/tests/ux-validation.test.mts
+++ b/crew/tests/ux-validation.test.mts
@@ -1,14 +1,13 @@
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { extractACs } from "../scripts/lib/ux-validation/index.mjs";
 
 test("extractACs returns empty array on empty input", () => {
-  assert.deepEqual(extractACs(""), []);
+  expect(extractACs("")).toEqual([]);
 });
 
 test("extractACs returns empty array when no acceptance criteria header", () => {
   const content = "# Title\n\nNo ACs here.";
-  assert.deepEqual(extractACs(content), []);
+  expect(extractACs(content)).toEqual([]);
 });
 
 test("extractACs parses well-formed AC list", () => {
@@ -18,7 +17,7 @@ test("extractACs parses well-formed AC list", () => {
 - [ ] AC-1: user can click submit
 - [ ] AC-2: form validates email
 `;
-  assert.deepEqual(extractACs(content), [
+  expect(extractACs(content)).toEqual([
     { id: "AC-1", text: "user can click submit" },
     { id: "AC-2", text: "form validates email" }
   ]);
@@ -31,7 +30,7 @@ test("extractACs ignores nested checkboxes", () => {
   - [ ] sub-bullet should be ignored
 - [ ] AC-2: another criterion
 `;
-  assert.deepEqual(extractACs(content), [
+  expect(extractACs(content)).toEqual([
     { id: "AC-1", text: "parent criterion" },
     { id: "AC-2", text: "another criterion" }
   ]);
@@ -46,69 +45,69 @@ test("extractACs stops at next ## header", () => {
 
 - [ ] not-an-ac: ignored
 `;
-  assert.deepEqual(extractACs(content), [{ id: "AC-1", text: "first" }]);
+  expect(extractACs(content)).toEqual([{ id: "AC-1", text: "first" }]);
 });
 
 import { classifyScenario } from "../scripts/lib/ux-validation/index.mjs";
 
 test("classifyScenario detects interaction verbs", () => {
-  assert.equal(classifyScenario("user can click submit"), "interaction");
-  assert.equal(classifyScenario("tap the button"), "interaction");
-  assert.equal(classifyScenario("press enter to submit"), "interaction");
-  assert.equal(classifyScenario("submit the form"), "interaction");
+  expect(classifyScenario("user can click submit")).toBe("interaction");
+  expect(classifyScenario("tap the button")).toBe("interaction");
+  expect(classifyScenario("press enter to submit")).toBe("interaction");
+  expect(classifyScenario("submit the form")).toBe("interaction");
 });
 
 test("classifyScenario detects visibility verbs", () => {
-  assert.equal(classifyScenario("see the welcome banner"), "visibility");
-  assert.equal(classifyScenario("renders product list"), "visibility");
-  assert.equal(classifyScenario("displays error message"), "visibility");
-  assert.equal(classifyScenario("shows loading spinner"), "visibility");
+  expect(classifyScenario("see the welcome banner")).toBe("visibility");
+  expect(classifyScenario("renders product list")).toBe("visibility");
+  expect(classifyScenario("displays error message")).toBe("visibility");
+  expect(classifyScenario("shows loading spinner")).toBe("visibility");
 });
 
 test("classifyScenario detects navigation verbs", () => {
-  assert.equal(classifyScenario("navigate to /dashboard"), "navigation");
-  assert.equal(classifyScenario("go to settings page"), "navigation");
-  assert.equal(classifyScenario("route to /profile"), "navigation");
+  expect(classifyScenario("navigate to /dashboard")).toBe("navigation");
+  expect(classifyScenario("go to settings page")).toBe("navigation");
+  expect(classifyScenario("route to /profile")).toBe("navigation");
 });
 
 test("classifyScenario detects input verbs", () => {
-  assert.equal(classifyScenario("type email address"), "input");
-  assert.equal(classifyScenario("fill username field"), "input");
-  assert.equal(classifyScenario("enter password"), "input");
+  expect(classifyScenario("type email address")).toBe("input");
+  expect(classifyScenario("fill username field")).toBe("input");
+  expect(classifyScenario("enter password")).toBe("input");
 });
 
 test("classifyScenario falls back to non_ui_ac on no match", () => {
-  assert.equal(classifyScenario("total cost equals sum"), "non_ui_ac");
-  assert.equal(classifyScenario("database row count is 3"), "non_ui_ac");
-  assert.equal(classifyScenario(""), "non_ui_ac");
+  expect(classifyScenario("total cost equals sum")).toBe("non_ui_ac");
+  expect(classifyScenario("database row count is 3")).toBe("non_ui_ac");
+  expect(classifyScenario("")).toBe("non_ui_ac");
 });
 
 test("classifyScenario matches inflected verb forms", () => {
-  assert.equal(classifyScenario("user navigates to /home"), "navigation");
-  assert.equal(classifyScenario("user clicks the submit button"), "interaction");
-  assert.equal(classifyScenario("user fills the username field"), "input");
-  assert.equal(classifyScenario("form submits successfully"), "interaction");
+  expect(classifyScenario("user navigates to /home")).toBe("navigation");
+  expect(classifyScenario("user clicks the submit button")).toBe("interaction");
+  expect(classifyScenario("user fills the username field")).toBe("input");
+  expect(classifyScenario("form submits successfully")).toBe("interaction");
 });
 
 test("classifyScenario does not over-match compound words", () => {
-  assert.equal(classifyScenario("showcase the portfolio"), "non_ui_ac");
-  assert.equal(classifyScenario("element is clickable"), "non_ui_ac");
-  assert.equal(classifyScenario("pressing concern"), "non_ui_ac");
+  expect(classifyScenario("showcase the portfolio")).toBe("non_ui_ac");
+  expect(classifyScenario("element is clickable")).toBe("non_ui_ac");
+  expect(classifyScenario("pressing concern")).toBe("non_ui_ac");
 });
 
 test("classifyScenario does not over-match derived visibility words", () => {
-  assert.equal(classifyScenario("renderable content is available"), "non_ui_ac");
-  assert.equal(classifyScenario("content was displayed successfully"), "non_ui_ac");
+  expect(classifyScenario("renderable content is available")).toBe("non_ui_ac");
+  expect(classifyScenario("content was displayed successfully")).toBe("non_ui_ac");
 });
 
 test("classifyScenario does not over-match derived navigation words", () => {
-  assert.equal(classifyScenario("navigational menu is accessible"), "non_ui_ac");
-  assert.equal(classifyScenario("router configuration loaded"), "non_ui_ac");
+  expect(classifyScenario("navigational menu is accessible")).toBe("non_ui_ac");
+  expect(classifyScenario("router configuration loaded")).toBe("non_ui_ac");
 });
 
 test("classifyScenario does not over-match derived input words", () => {
-  assert.equal(classifyScenario("typecheck passes without errors"), "non_ui_ac");
-  assert.equal(classifyScenario("fillable field is present"), "non_ui_ac");
+  expect(classifyScenario("typecheck passes without errors")).toBe("non_ui_ac");
+  expect(classifyScenario("fillable field is present")).toBe("non_ui_ac");
 });
 
 import { computeVerdict } from "../scripts/lib/ux-validation/index.mjs";
@@ -122,12 +121,12 @@ const EMPTY_EVIDENCE = {
 };
 
 test("computeVerdict returns passed on empty evidence", () => {
-  assert.equal(computeVerdict(EMPTY_EVIDENCE), "passed");
+  expect(computeVerdict(EMPTY_EVIDENCE)).toBe("passed");
 });
 
 test("computeVerdict returns failed when any AC fails", () => {
   const ev = { ...EMPTY_EVIDENCE, ac_results: [{ id: "AC-1", status: "fail" }] };
-  assert.equal(computeVerdict(ev), "failed");
+  expect(computeVerdict(ev)).toBe("failed");
 });
 
 test("computeVerdict returns failed on serious a11y violation", () => {
@@ -135,7 +134,7 @@ test("computeVerdict returns failed on serious a11y violation", () => {
     ...EMPTY_EVIDENCE,
     a11y: { violations: [{ severity: "serious", rule: "x" }], passes_count: 0 }
   };
-  assert.equal(computeVerdict(ev), "failed");
+  expect(computeVerdict(ev)).toBe("failed");
 });
 
 test("computeVerdict returns failed on critical a11y violation", () => {
@@ -143,7 +142,7 @@ test("computeVerdict returns failed on critical a11y violation", () => {
     ...EMPTY_EVIDENCE,
     a11y: { violations: [{ severity: "critical", rule: "x" }], passes_count: 0 }
   };
-  assert.equal(computeVerdict(ev), "failed");
+  expect(computeVerdict(ev)).toBe("failed");
 });
 
 test("computeVerdict returns failed on console errors", () => {
@@ -151,7 +150,7 @@ test("computeVerdict returns failed on console errors", () => {
     ...EMPTY_EVIDENCE,
     console: { errors: ["TypeError"], warnings: [] }
   };
-  assert.equal(computeVerdict(ev), "failed");
+  expect(computeVerdict(ev)).toBe("failed");
 });
 
 test("computeVerdict returns failed on visual diff over tolerance", () => {
@@ -159,7 +158,7 @@ test("computeVerdict returns failed on visual diff over tolerance", () => {
     ...EMPTY_EVIDENCE,
     visual: { diffs: [{ route: "/", pct: 5.0, tolerance: 0.5 }] }
   };
-  assert.equal(computeVerdict(ev), "failed");
+  expect(computeVerdict(ev)).toBe("failed");
 });
 
 test("computeVerdict returns passed_with_notes on minor a11y", () => {
@@ -167,7 +166,7 @@ test("computeVerdict returns passed_with_notes on minor a11y", () => {
     ...EMPTY_EVIDENCE,
     a11y: { violations: [{ severity: "minor", rule: "x" }], passes_count: 0 }
   };
-  assert.equal(computeVerdict(ev), "passed_with_notes");
+  expect(computeVerdict(ev)).toBe("passed_with_notes");
 });
 
 test("computeVerdict returns passed_with_notes on console warnings", () => {
@@ -175,7 +174,7 @@ test("computeVerdict returns passed_with_notes on console warnings", () => {
     ...EMPTY_EVIDENCE,
     console: { errors: [], warnings: ["React: ..."] }
   };
-  assert.equal(computeVerdict(ev), "passed_with_notes");
+  expect(computeVerdict(ev)).toBe("passed_with_notes");
 });
 
 test("computeVerdict returns passed_with_notes on network failures", () => {
@@ -183,7 +182,7 @@ test("computeVerdict returns passed_with_notes on network failures", () => {
     ...EMPTY_EVIDENCE,
     network: { failures: [{ url: "/x.png", status: 404 }] }
   };
-  assert.equal(computeVerdict(ev), "passed_with_notes");
+  expect(computeVerdict(ev)).toBe("passed_with_notes");
 });
 
 test("computeVerdict returns failed when both fail and warn signals present", () => {
@@ -192,7 +191,7 @@ test("computeVerdict returns failed when both fail and warn signals present", ()
     ac_results: [{ id: "AC-1", status: "fail" }],
     console: { errors: [], warnings: ["minor"] }
   };
-  assert.equal(computeVerdict(ev), "failed");
+  expect(computeVerdict(ev)).toBe("failed");
 });
 
 test("computeVerdict returns passed when visual diff under tolerance", () => {
@@ -200,7 +199,7 @@ test("computeVerdict returns passed when visual diff under tolerance", () => {
     ...EMPTY_EVIDENCE,
     visual: { diffs: [{ route: "/", pct: 0.2, tolerance: 0.5 }] }
   };
-  assert.equal(computeVerdict(ev), "passed");
+  expect(computeVerdict(ev)).toBe("passed");
 });
 
 import fs from "node:fs/promises";
@@ -214,7 +213,7 @@ async function tmpRepo(prefix: string) {
 
 test("discoverPlaywrightConfig returns null when no config present", async () => {
   const repo = await tmpRepo("ux-disc-none-");
-  assert.equal(await discoverPlaywrightConfig(repo), null);
+  expect(await discoverPlaywrightConfig(repo)).toBe(null);
 });
 
 test("discoverPlaywrightConfig reads URL from playwright.config.ts", async () => {
@@ -224,7 +223,7 @@ test("discoverPlaywrightConfig reads URL from playwright.config.ts", async () =>
     `export default { use: { baseURL: "http://localhost:4321" } };`
   );
   const result = await discoverPlaywrightConfig(repo);
-  assert.equal(result!.url, "http://localhost:4321");
+  expect(result!.url).toBe("http://localhost:4321");
 });
 
 test("discoverPlaywrightConfig reads URL from playwright.config.js", async () => {
@@ -234,7 +233,7 @@ test("discoverPlaywrightConfig reads URL from playwright.config.js", async () =>
     `module.exports = { use: { baseURL: "http://localhost:5555" } };`
   );
   const result = await discoverPlaywrightConfig(repo);
-  assert.equal(result!.url, "http://localhost:5555");
+  expect(result!.url).toBe("http://localhost:5555");
 });
 
 test("discoverPlaywrightConfig falls back to package.json scripts when no config file", async () => {
@@ -247,13 +246,13 @@ test("discoverPlaywrightConfig falls back to package.json scripts when no config
     })
   );
   const result = await discoverPlaywrightConfig(repo);
-  assert.equal(result!.url, "http://localhost:3000");
+  expect(result!.url).toBe("http://localhost:3000");
 });
 
 test("discoverPlaywrightConfig returns null when config file lacks baseURL", async () => {
   const repo = await tmpRepo("ux-disc-no-url-");
   await fs.writeFile(path.join(repo, "playwright.config.ts"), `export default { use: {} };`);
-  assert.equal(await discoverPlaywrightConfig(repo), null);
+  expect(await discoverPlaywrightConfig(repo)).toBe(null);
 });
 
 import { buildQaInvocation } from "../scripts/lib/ux-validation/index.mjs";
@@ -265,14 +264,14 @@ test("buildQaInvocation emits all 4 check flags", () => {
     baselineDir: "tests/playwright/baselines/",
     outputPath: ".claude/artifacts/crew/validations/ux.json"
   });
-  assert.match(cmd, /gstack:\/qa/);
-  assert.match(cmd, /--url http:\/\/localhost:3000/);
-  assert.match(cmd, /--scenarios /);
-  assert.match(cmd, /--accessibility-scan/);
-  assert.match(cmd, /--capture-console/);
-  assert.match(cmd, /--capture-network/);
-  assert.match(cmd, /--visual-baseline tests\/playwright\/baselines\//);
-  assert.match(cmd, /--output \.claude\/artifacts\/crew\/validations\/ux\.json/);
+  expect(cmd).toMatch(/gstack:\/qa/);
+  expect(cmd).toMatch(/--url http:\/\/localhost:3000/);
+  expect(cmd).toMatch(/--scenarios /);
+  expect(cmd).toMatch(/--accessibility-scan/);
+  expect(cmd).toMatch(/--capture-console/);
+  expect(cmd).toMatch(/--capture-network/);
+  expect(cmd).toMatch(/--visual-baseline tests\/playwright\/baselines\//);
+  expect(cmd).toMatch(/--output \.claude\/artifacts\/crew\/validations\/ux\.json/);
 });
 
 test("buildQaInvocation embeds scenarios as JSON", () => {
@@ -282,6 +281,6 @@ test("buildQaInvocation embeds scenarios as JSON", () => {
     baselineDir: "b/",
     outputPath: "o.json"
   });
-  assert.match(cmd, /"AC-1"/);
-  assert.match(cmd, /"AC-2"/);
+  expect(cmd).toMatch(/"AC-1"/);
+  expect(cmd).toMatch(/"AC-2"/);
 });
diff --git a/crew/tests/validate-adr-template.test.mts b/crew/tests/validate-adr-template.test.mts
index e56fa199..715ded39 100644
--- a/crew/tests/validate-adr-template.test.mts
+++ b/crew/tests/validate-adr-template.test.mts
@@ -3,8 +3,7 @@
  * heading + bullet format aligned to the real ADR convention, arch-review
  * 2026-07-04 Finding 2.9).
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { validateAdr } from "../scripts/validate-adr-template.mjs";
 
 const WELL_FORMED = `# ADR-001: Example
@@ -101,40 +100,43 @@ Just do it.
 
 test("validateAdr: well-formed ADR yields zero findings", () => {
   const findings = validateAdr("adr-001.md", WELL_FORMED);
-  assert.equal(findings.length, 0, JSON.stringify(findings, null, 2));
+  expect(findings.length, JSON.stringify(findings, null, 2)).toBe(0);
 });
 
 test("validateAdr: a single documented alternative is sufficient (real ADRs have as few as one)", () => {
   const findings = validateAdr("adr-002.md", SINGLE_OPTION);
-  assert.equal(findings.length, 0, JSON.stringify(findings, null, 2));
+  expect(findings.length, JSON.stringify(findings, null, 2)).toBe(0);
 });
 
 test("validateAdr: trivial rejection reasoning fires warnings on rejected options", () => {
   const findings = validateAdr("adr-003.md", TRIVIAL_REJECTIONS);
   const trivials = findings.filter((f) => f.rule === "trivial-rejection-reasoning");
   // Options A and B are rejected with vague one-line reasoning; C is accepted (no check).
-  assert.equal(
+  expect(
     trivials.length,
-    2,
     `expected 2 trivial findings, got ${JSON.stringify(findings, null, 2)}`
-  );
-  assert.ok(trivials.every((t) => t.severity === "warn"));
+  ).toBe(2);
+  expect(trivials.every((t) => t.severity === "warn")).toBeTruthy();
 });
 
 test("validateAdr: a rejected option with no Rejected/Accepted marker errors", () => {
   const findings = validateAdr("adr-004.md", MISSING_REJECTION_REASONING);
   const miss = findings.find((f) => f.rule === "missing-rejection-reasoning");
-  assert.ok(
+  expect(
     miss,
     `must flag missing-rejection-reasoning, got ${JSON.stringify(findings, null, 2)}`
-  );
-  assert.equal(miss.severity, "error");
-  assert.match(miss.detail, /Option 1/);
+  ).toBeTruthy();
+  if (!miss)
+    throw new Error(
+      `must flag missing-rejection-reasoning, got ${JSON.stringify(findings, null, 2)}`
+    );
+  expect(miss.severity).toBe("error");
+  expect(miss.detail).toMatch(/Option 1/);
 });
 
 test("validateAdr: completely absent Alternatives considered section errors fast", () => {
   const findings = validateAdr("adr-005.md", NO_ALTERNATIVES_SECTION);
-  assert.equal(findings.length, 1);
-  assert.equal(findings[0]?.rule, "missing-alternatives-considered");
-  assert.equal(findings[0]?.severity, "error");
+  expect(findings.length).toBe(1);
+  expect(findings[0]?.rule).toBe("missing-alternatives-considered");
+  expect(findings[0]?.severity).toBe("error");
 });
diff --git a/crew/tests/validate-agent-refs.test.mts b/crew/tests/validate-agent-refs.test.mts
index 1fd808f8..57a2d090 100644
--- a/crew/tests/validate-agent-refs.test.mts
+++ b/crew/tests/validate-agent-refs.test.mts
@@ -1,6 +1,5 @@
+import { test, expect } from "bun:test";
 // tests/validate-agent-refs.test.ts — crew-architecture-review 2026-07-04 quick win
-import { test } from "node:test";
-import assert from "node:assert/strict";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -26,7 +25,7 @@ test("passes when crew: tokens resolve to real agents or commands", async () =>
       "---\n---\nDispatch the **`crew:reviewer`** agent. Pair with `/crew:build`.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, true, `unexpected findings: ${JSON.stringify(result.findings)}`);
+  expect(result.ok, `unexpected findings: ${JSON.stringify(result.findings)}`).toBe(true);
 });
 
 test("fails on a phantom agent reference", async () => {
@@ -35,9 +34,9 @@ test("fails on a phantom agent reference", async () => {
     "commands/parallel.md": "---\n---\nDispatch `crew:builder` then `crew:validator`.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, false);
+  expect(result.ok).toBe(false);
   const tokens = result.findings.map((f) => f.token).sort();
-  assert.deepEqual(tokens, ["crew:builder", "crew:validator"]);
+  expect(tokens).toEqual(["crew:builder", "crew:validator"]);
 });
 
 test("fails on a phantom 3rdparty reference", async () => {
@@ -46,8 +45,8 @@ test("fails on a phantom 3rdparty reference", async () => {
     "skills/workflow/foo/SKILL.md": "Route to `crew:3rdparty:nonexistent-agent`.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, false);
-  assert.ok(result.findings.some((f) => f.token === "crew:3rdparty:nonexistent-agent"));
+  expect(result.ok).toBe(false);
+  expect(result.findings.some((f) => f.token === "crew:3rdparty:nonexistent-agent")).toBeTruthy();
 });
 
 test("allows forward references declared in docs/routing-table.yaml", async () => {
@@ -61,7 +60,7 @@ test("allows forward references declared in docs/routing-table.yaml", async () =
       "Registry fallback: if `crew:reviewer-verifier` is unregistered, fall back to the full ladder.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, true, `unexpected findings: ${JSON.stringify(result.findings)}`);
+  expect(result.ok, `unexpected findings: ${JSON.stringify(result.findings)}`).toBe(true);
 });
 
 test("forward references NOT in routing-table.yaml are findings (allowlist is data, not code)", async () => {
@@ -69,8 +68,8 @@ test("forward references NOT in routing-table.yaml are findings (allowlist is da
     "commands/foo.md": "---\n---\nDispatch `crew:reviewer-validator`.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, false);
-  assert.ok(result.findings.some((f) => f.token === "crew:reviewer-validator"));
+  expect(result.ok).toBe(false);
+  expect(result.findings.some((f) => f.token === "crew:reviewer-validator")).toBeTruthy();
 });
 
 test("resolves crew: tokens that name a skill directory", async () => {
@@ -79,7 +78,7 @@ test("resolves crew: tokens that name a skill directory", async () => {
     "commands/foo.md": "---\n---\nConsult `crew:risk-tier` guidance.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, true, `unexpected findings: ${JSON.stringify(result.findings)}`);
+  expect(result.ok, `unexpected findings: ${JSON.stringify(result.findings)}`).toBe(true);
 });
 
 test("fails on a phantom agent reference inside .claude/loop/rules.md", async () => {
@@ -92,10 +91,10 @@ test("fails on a phantom agent reference inside .claude/loop/rules.md", async ()
       "# Autonomous Loop — HARD RULES\n\nDispatch implementation via `crew:builder`.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.findings.some((f) => f.token === "crew:builder" && f.file === ".claude/loop/rules.md")
-  );
+  ).toBeTruthy();
 });
 
 test("passes on a real agent reference inside .claude/loop/rules.md", async () => {
@@ -105,5 +104,5 @@ test("passes on a real agent reference inside .claude/loop/rules.md", async () =
       "# Autonomous Loop — HARD RULES\n\nDispatch implementation via `crew:fullstack-dev`.\n"
   });
   const result = await validateAgentRefs(root);
-  assert.equal(result.ok, true, `unexpected findings: ${JSON.stringify(result.findings)}`);
+  expect(result.ok, `unexpected findings: ${JSON.stringify(result.findings)}`).toBe(true);
 });
diff --git a/crew/tests/validate-agents-frontmatter.test.mts b/crew/tests/validate-agents-frontmatter.test.mts
index 0133be72..2819c2c5 100644
--- a/crew/tests/validate-agents-frontmatter.test.mts
+++ b/crew/tests/validate-agents-frontmatter.test.mts
@@ -4,8 +4,7 @@
 // validate-agents.ts. Uses the same temp-fixture pattern as the existing
 // validate-agents.test.ts.
 
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -44,8 +43,8 @@ Write your handoff via write-handoff.
 test("AC-AT-1: passes on well-formed agent file with prompt_id and version", async () => {
   const root = await makeAgentsDir({ "foo.md": WELL_FORMED });
   const result = await validateAgents(root);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
-  assert.equal(result.agentCount, 1);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
+  expect(result.agentCount).toBe(1);
 });
 
 // AC-AT-2: missing prompt_id → error
@@ -68,11 +67,11 @@ x
 `;
   const root = await makeAgentsDir({ "foo.md": body });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /missing required frontmatter "prompt_id"/.test(e)),
     `expected missing prompt_id error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 // AC-AT-3: version with only two segments → semver error
@@ -96,11 +95,11 @@ x
 `;
   const root = await makeAgentsDir({ "foo.md": body });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /must be semver/.test(e)),
     `expected semver error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 // AC-AT-4: prompt_id with uppercase and underscore → kebab error
@@ -124,11 +123,11 @@ x
 `;
   const root = await makeAgentsDir({ "foo.md": body });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /must be kebab-slug/.test(e)),
     `expected kebab-slug error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 // AC-AT-5: reviewer (EVALS_REQUIRED) without evals field → error
@@ -153,11 +152,11 @@ x
 `;
   const root = await makeAgentsDir({ "reviewer.md": body });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /requires "evals" frontmatter field/.test(e)),
     `expected evals-required error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 // AC-AT-6: architect (not in EVALS_REQUIRED) without evals → passes
@@ -180,10 +179,10 @@ x
   const result = await validateAgents(root);
   // Only check for the new fields; other existing checks (sections, etc.) may fire
   // but we assert that NO evals error is present.
-  assert.ok(
+  expect(
     !result.errors.some((e) => /requires "evals"/.test(e)),
     `should not require evals for architect, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 // AC-AT-7: maxLines: 300 — agent at exactly 300 lines passes
@@ -210,11 +209,11 @@ Write your handoff via write-handoff.`;
     .fill("x")
     .join("\n");
   const body = `${header}\n${padding}`;
-  assert.equal(body.split("\n").length, 300);
+  expect(body.split("\n").length).toBe(300);
 
   const root = await makeAgentsDir({ "foo.md": body });
   const result = await validateAgents(root);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
 });
 
 // AC-AT-8: maxLines: 300 — agent at 301 lines fails
@@ -241,13 +240,13 @@ Write your handoff via write-handoff.`;
     .fill("x")
     .join("\n");
   const body = `${header}\n${padding}`;
-  assert.equal(body.split("\n").length, 301);
+  expect(body.split("\n").length).toBe(301);
 
   const root = await makeAgentsDir({ "foo.md": body });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /exceeds the 300-line agent prompt cap/.test(e)),
     `expected 300-line cap error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
diff --git a/crew/tests/validate-agents-peer-dispatch.test.mts b/crew/tests/validate-agents-peer-dispatch.test.mts
index 3c26c872..4f81d0be 100644
--- a/crew/tests/validate-agents-peer-dispatch.test.mts
+++ b/crew/tests/validate-agents-peer-dispatch.test.mts
@@ -8,8 +8,7 @@
 //
 // Uses the same temp-fixture pattern as tests/validate-agents.test.ts.
 
-import { test, describe } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect, describe } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -82,11 +81,10 @@ ${WELL_FORMED_PEER_DISPATCH_SECTION}`;
 
     const root = await makeAgentsDir({ "refactor.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `Unexpected errors for allowlisted agent with correct Peer dispatch: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 
   test("allowlisted agent document-writer with Agent tool and full Peer dispatch section passes", async () => {
@@ -113,11 +111,10 @@ ${WELL_FORMED_PEER_DISPATCH_SECTION}`;
 
     const root = await makeAgentsDir({ "document-writer.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `Unexpected errors for document-writer with correct Peer dispatch: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 });
 
@@ -151,15 +148,14 @@ Write your handoff via write-handoff.
 `;
     const root = await makeAgentsDir({ "refactor.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      false,
       "Expected validation failure when Peer dispatch section is absent for allowlisted agent"
-    );
-    assert.ok(
+    ).toBe(false);
+    expect(
       result.errors.some((e) => /missing "## Peer dispatch" section/.test(e)),
       `Expected missing Peer dispatch error, got: ${result.errors.join("; ")}`
-    );
+    ).toBeTruthy();
   });
 
   test("allowlisted agent with Agent tool but missing whitelist entry fails", async () => {
@@ -199,15 +195,14 @@ Write your handoff.
 `;
     const root = await makeAgentsDir({ "document-writer.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      false,
       "Expected validation failure when Peer dispatch section has no whitelist bullet"
-    );
-    assert.ok(
+    ).toBe(false);
+    expect(
       result.errors.some((e) => /missing whitelist entry/.test(e)),
       `Expected whitelist error, got: ${result.errors.join("; ")}`
-    );
+    ).toBeTruthy();
   });
 
   test("allowlisted agent with Agent tool but missing blacklist fails", async () => {
@@ -242,15 +237,14 @@ Write your handoff.
 `;
     const root = await makeAgentsDir({ "refactor.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      false,
       "Expected validation failure when Peer dispatch section has no blacklist"
-    );
-    assert.ok(
+    ).toBe(false);
+    expect(
       result.errors.some((e) => /missing blacklist/.test(e)),
       `Expected blacklist error, got: ${result.errors.join("; ")}`
-    );
+    ).toBeTruthy();
   });
 
   test("allowlisted agent with Agent tool but missing budget line fails", async () => {
@@ -283,15 +277,14 @@ Write your handoff.
 `;
     const root = await makeAgentsDir({ "document-writer.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      false,
       "Expected validation failure when Peer dispatch section has no budget line"
-    );
-    assert.ok(
+    ).toBe(false);
+    expect(
       result.errors.some((e) => /missing dispatch budget line/.test(e)),
       `Expected budget error, got: ${result.errors.join("; ")}`
-    );
+    ).toBeTruthy();
   });
 });
 
@@ -339,15 +332,14 @@ Write your handoff via write-handoff.
 `;
     const root = await makeAgentsDir({ "refactor.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      false,
       "Expected validation failure: backtick entries only in blacklist region should NOT satisfy whitelist-entry check"
-    );
-    assert.ok(
+    ).toBe(false);
+    expect(
       result.errors.some((e) => /missing whitelist entry/.test(e)),
       `Expected whitelist error, got: ${result.errors.join("; ")}`
-    );
+    ).toBeTruthy();
   });
 
   test("section with whitelist bullet BEFORE blacklist and blacklist backticks after passes", async () => {
@@ -385,11 +377,10 @@ Write your handoff via write-handoff.
 `;
     const root = await makeAgentsDir({ "refactor.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `Whitelist bullet before blacklist should pass. Errors: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 });
 
@@ -482,11 +473,10 @@ See the project peer-dispatch design notes.
 `;
       const root = await makeAgentsDir({ [`${name}.md`]: content });
       const result = await validateAgents(root);
-      assert.equal(
+      expect(
         result.ok,
-        true,
         `Advisory agent "${name}" with correct Peer dispatch section should pass. Errors: ${result.errors.join("; ")}`
-      );
+      ).toBe(true);
     });
   }
 });
@@ -548,11 +538,10 @@ See the project peer-dispatch design notes.
 `;
     const root = await makeAgentsDir({ "architect.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `architect with inline tools and correct Peer dispatch should pass. Errors: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 
   test("allowlisted agent with inline tools: [Agent] but missing Peer dispatch section fails", async () => {
@@ -580,15 +569,14 @@ Write your design artifact.
 `;
     const root = await makeAgentsDir({ "architect.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      false,
       "Expected validation failure: inline tools: [Agent] without Peer dispatch section should fail"
-    );
-    assert.ok(
+    ).toBe(false);
+    expect(
       result.errors.some((e) => /missing "## Peer dispatch" section/.test(e)),
       `Expected missing Peer dispatch error, got: ${result.errors.join("; ")}`
-    );
+    ).toBeTruthy();
   });
 });
 
@@ -699,11 +687,10 @@ See the project peer-dispatch design notes.
 `;
       const root = await makeAgentsDir({ [`${name}.md`]: content });
       const result = await validateAgents(root);
-      assert.equal(
+      expect(
         result.ok,
-        true,
         `Implementer agent "${name}" with correct Peer dispatch section should pass. Errors: ${result.errors.join("; ")}`
-      );
+      ).toBe(true);
     });
   }
 
@@ -735,11 +722,10 @@ Write your handoff via write-handoff.
 `;
     const root = await makeAgentsDir({ "backend-dev.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `backend-dev with disallowedTools (no tools: block) should pass without Peer dispatch section. Errors: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 });
 
@@ -776,11 +762,10 @@ Write your handoff via write-handoff.
 `;
     const root = await makeAgentsDir({ "investigator.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `Non-allowlisted agent should pass even without Peer dispatch section. Errors: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 
   test("allowlisted agent WITHOUT Agent in tools also passes (rule only fires when Agent explicit)", async () => {
@@ -811,10 +796,9 @@ Write your handoff.
 `;
     const root = await makeAgentsDir({ "document-writer.md": content });
     const result = await validateAgents(root);
-    assert.equal(
+    expect(
       result.ok,
-      true,
       `Allowlisted agent without Agent tool should pass without Peer dispatch section. Errors: ${result.errors.join("; ")}`
-    );
+    ).toBe(true);
   });
 });
diff --git a/crew/tests/validate-agents.test.mts b/crew/tests/validate-agents.test.mts
index c0b3cd4d..0c6885fa 100644
--- a/crew/tests/validate-agents.test.mts
+++ b/crew/tests/validate-agents.test.mts
@@ -1,6 +1,5 @@
 // tests/validate-agents.test.mjs — FEAT-035 SLICE-14
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -36,8 +35,8 @@ Write your handoff via write-handoff.
 test("passes on a well-formed agent file", async () => {
   const root = await makeAgentsDir({ "builder.md": WELL_FORMED_BODY });
   const result = await validateAgents(root);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
-  assert.equal(result.agentCount, 1);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
+  expect(result.agentCount).toBe(1);
 });
 
 test("fails on missing required frontmatter field", async () => {
@@ -54,11 +53,11 @@ x
 `;
   const root = await makeAgentsDir({ "builder.md": noModel });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /missing required frontmatter "model"/.test(e)),
     `expected missing-model error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 test("fails on missing or malformed frontmatter block", async () => {
@@ -72,15 +71,15 @@ x
 `;
   const root = await makeAgentsDir({ "builder.md": noFrontmatter });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(result.errors.some((e) => /missing or malformed frontmatter/.test(e)));
+  expect(result.ok).toBe(false);
+  expect(result.errors.some((e) => /missing or malformed frontmatter/.test(e))).toBeTruthy();
 });
 
 test("fails when filename does not match frontmatter name", async () => {
   const root = await makeAgentsDir({ "wrong-name.md": WELL_FORMED_BODY });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(result.errors.some((e) => /does not match frontmatter name/.test(e)));
+  expect(result.ok).toBe(false);
+  expect(result.errors.some((e) => /does not match frontmatter name/.test(e))).toBeTruthy();
 });
 
 test("fails on missing required '## Report contract' section (non-lead)", async () => {
@@ -98,8 +97,10 @@ x
 `;
   const root = await makeAgentsDir({ "builder.md": noReportContract });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(result.errors.some((e) => /missing required section "## Report contract"/.test(e)));
+  expect(result.ok).toBe(false);
+  expect(
+    result.errors.some((e) => /missing required section "## Report contract"/.test(e))
+  ).toBeTruthy();
 });
 
 // lead role removed in v0.41 hard cut — exemption test removed with it. All
@@ -120,8 +121,8 @@ x
 `;
   const root = await makeAgentsDir({ "builder.md": noIdentity });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(result.errors.some((e) => /missing identity intro/.test(e)));
+  expect(result.ok).toBe(false);
+  expect(result.errors.some((e) => /missing identity intro/.test(e))).toBeTruthy();
 });
 
 test("fails when file exceeds the default 350-line cap", async () => {
@@ -139,11 +140,11 @@ You are the builder.
 ` + "x\n".repeat(351);
   const root = await makeAgentsDir({ "builder.md": padded });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /exceeds the 350-line agent prompt cap/.test(e)),
     `expected line-cap error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 test("maxLines frontmatter overrides the default cap", async () => {
@@ -162,11 +163,11 @@ You are the builder.
 ` + "x\n".repeat(121);
   const root = await makeAgentsDir({ "builder.md": padded });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /exceeds the 120-line agent prompt cap/.test(e)),
     `expected override line-cap error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 test("fails on duplicate agent names across the directory", async () => {
@@ -176,14 +177,14 @@ test("fails on duplicate agent names across the directory", async () => {
   const result = await validateAgents(root);
   // dup.md will also fail filename-mismatch; that's fine, but we still need
   // the duplicate-name error to surface.
-  assert.equal(result.ok, false);
-  assert.ok(result.errors.some((e) => /duplicate agent name/.test(e)));
+  expect(result.ok).toBe(false);
+  expect(result.errors.some((e) => /duplicate agent name/.test(e))).toBeTruthy();
 });
 
 test("returns ok and agentCount:0 when agents/ directory is missing", async () => {
   const result = await validateAgents(path.join(os.tmpdir(), "definitely-not-a-real-dir-xyz"));
-  assert.equal(result.ok, true);
-  assert.equal(result.agentCount, 0);
+  expect(result.ok).toBe(true);
+  expect(result.agentCount).toBe(0);
 });
 
 // Backlog-id discipline: agents on the no-backlog-ids allowlist must not
@@ -215,11 +216,11 @@ test("fails when an allowlisted agent embeds FEAT-NNN in its prompt body", async
   );
   const root = await makeAgentsDir({ "backend-dev.md": withFeatRef });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /backlog ids must not appear/.test(e) && /FEAT-163/.test(e)),
     `expected backlog-id error citing FEAT-163, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 test("fails when an allowlisted agent embeds DEC-NNN or SLICE-NN", async () => {
@@ -229,17 +230,17 @@ test("fails when an allowlisted agent embeds DEC-NNN or SLICE-NN", async () => {
   );
   const root = await makeAgentsDir({ "backend-dev.md": withRefs });
   const result = await validateAgents(root);
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /DEC-023/.test(e) && /SLICE-71/.test(e)),
     `expected backlog-id error citing DEC-023 + SLICE-71, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 test("passes on an allowlisted agent with zero backlog ids", async () => {
   const root = await makeAgentsDir({ "backend-dev.md": BACKEND_DEV_BASE });
   const result = await validateAgents(root);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
 });
 
 test("ignores backlog ids on agents NOT in the no-backlog-ids allowlist", async () => {
@@ -250,8 +251,8 @@ test("ignores backlog ids on agents NOT in the no-backlog-ids allowlist", async
   const root = await makeAgentsDir({ "builder.md": builderWithRef });
   const result = await validateAgents(root);
   // `builder` is not in NO_BACKLOG_IDS_REQUIRED, so the FEAT ref must not error.
-  assert.ok(
+  expect(
     !result.errors.some((e) => /backlog ids must not appear/.test(e)),
     `unexpected backlog-id error for non-allowlisted agent: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
diff --git a/crew/tests/validate-all.test.mts b/crew/tests/validate-all.test.mts
index 8df896c0..82f7493a 100644
--- a/crew/tests/validate-all.test.mts
+++ b/crew/tests/validate-all.test.mts
@@ -1,11 +1,10 @@
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
 
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
-const scriptPath = path.join(repoRoot, "scripts", "validate-all.ts");
+const scriptPath = path.join(repoRoot, "scripts", "validate-all.mts");
 
 function runValidateAll(cwd = repoRoot) {
   const result = spawnSync(process.execPath, ["--experimental-strip-types", scriptPath], {
@@ -22,15 +21,15 @@ function runValidateAll(cwd = repoRoot) {
 
 test("validate-all: exits 0 on clean repo and reports all validators passed", () => {
   const { status, stdout } = runValidateAll();
-  assert.equal(status, 0, `expected exit 0 but got ${status}`);
-  assert.match(stdout, /All 4 validators passed\./);
+  expect(status, `expected exit 0 but got ${status}`).toBe(0);
+  expect(stdout).toMatch(/All 4 validators passed\./);
 });
 
 test("validate-all: stdout contains a check mark for each validator on success", () => {
   const { status, stdout } = runValidateAll();
-  assert.equal(status, 0);
-  assert.match(stdout, /✓ validate-manifests\.ts/);
-  assert.match(stdout, /✓ validate-skills\.ts/);
-  assert.match(stdout, /✓ validate-agents\.ts/);
-  assert.match(stdout, /✓ validate-slices\.ts/);
+  expect(status).toBe(0);
+  expect(stdout).toMatch(/✓ validate-manifests\.mts/);
+  expect(stdout).toMatch(/✓ validate-skills\.mts/);
+  expect(stdout).toMatch(/✓ validate-agents\.mts/);
+  expect(stdout).toMatch(/✓ validate-slices\.mts/);
 });
diff --git a/crew/tests/validate-backlog-drift.test.mts b/crew/tests/validate-backlog-drift.test.mts
index 40011433..8ec69658 100644
--- a/crew/tests/validate-backlog-drift.test.mts
+++ b/crew/tests/validate-backlog-drift.test.mts
@@ -3,34 +3,33 @@
  * Finding 2.10 — triaged/ files whose slice-close ceremony already ran in
  * git history but were never moved to done/).
  */
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { findDrift } from "../scripts/validate-backlog-drift.mjs";
 
 test("findDrift: flags a triaged slice already closed in git history (synthetic drift)", () => {
   const triagedFiles = ["SLICE-999-synthetic-drift.md", "SLICE-200-open-work.md"];
   const closeLogLines = ["docs(backlog): close SLICE-999 as done — synthetic fixture"];
-  assert.deepEqual(findDrift(triagedFiles, closeLogLines), ["SLICE-999"]);
+  expect(findDrift(triagedFiles, closeLogLines)).toEqual(["SLICE-999"]);
 });
 
 test("findDrift: no drift when the triaged slice has no matching close commit", () => {
   const triagedFiles = ["SLICE-200-open-work.md"];
   const closeLogLines = ["docs(backlog): close SLICE-106 as done"];
-  assert.deepEqual(findDrift(triagedFiles, closeLogLines), []);
+  expect(findDrift(triagedFiles, closeLogLines)).toEqual([]);
 });
 
 test("findDrift: a single commit closing multiple slices flags both", () => {
   const triagedFiles = ["SLICE-103-a.md", "SLICE-104-b.md"];
   const closeLogLines = ["docs(backlog): close SLICE-103 + SLICE-104 as done"];
-  assert.deepEqual(findDrift(triagedFiles, closeLogLines), ["SLICE-103", "SLICE-104"]);
+  expect(findDrift(triagedFiles, closeLogLines)).toEqual(["SLICE-103", "SLICE-104"]);
 });
 
 test("findDrift: FEAT-only triaged filenames carry no slice ID, never false-positive", () => {
   const triagedFiles = ["FEAT-182.md"];
   const closeLogLines = ["docs(backlog): close SLICE-1 as done"];
-  assert.deepEqual(findDrift(triagedFiles, closeLogLines), []);
+  expect(findDrift(triagedFiles, closeLogLines)).toEqual([]);
 });
 
 test("findDrift: no triaged files and no close commits yields empty", () => {
-  assert.deepEqual(findDrift([], []), []);
+  expect(findDrift([], [])).toEqual([]);
 });
diff --git a/crew/tests/validate-badges.test.mts b/crew/tests/validate-badges.test.mts
index 859d0a02..5697e922 100644
--- a/crew/tests/validate-badges.test.mts
+++ b/crew/tests/validate-badges.test.mts
@@ -1,8 +1,7 @@
 // tests/validate-badges.test.ts — FEAT-181 / SLICE-194
 // Covers: the real repo passes (AC-1/AC-2 aligned today) + an injected
 // drift (a badge in BADGE_TABLE absent from the catalog doc) is flagged.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -52,8 +51,8 @@ test("passes when BADGE_TABLE, CLI help text, and catalog doc all agree", async
     catalog: ALIGNED_CATALOG
   });
   const result = await validateBadges(paths);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
-  assert.equal(result.badgeCount, 2);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
+  expect(result.badgeCount).toBe(2);
 });
 
 test("flags a badge present in BADGE_TABLE but missing from the catalog doc", async () => {
@@ -69,9 +68,12 @@ test("flags a badge present in BADGE_TABLE but missing from the catalog doc", as
     catalog: driftedCatalog
   });
   const result = await validateBadges(paths);
-  assert.equal(result.ok, false, "missing catalog row should fail validation");
+  expect(result.ok, "missing catalog row should fail validation").toBe(false);
   const flagged = result.errors.some((e) => e.includes("foo_b") && e.includes("badge-catalog.md"));
-  assert.ok(flagged, `expected a foo_b/catalog drift error, got: ${result.errors.join("; ")}`);
+  expect(
+    flagged,
+    `expected a foo_b/catalog drift error, got: ${result.errors.join("; ")}`
+  ).toBeTruthy();
 });
 
 test("flags a badge in the CLI accept-list with no BADGE_TABLE handler", async () => {
@@ -87,13 +89,16 @@ const HELP: Record<string, string> = {
     catalog: ALIGNED_CATALOG
   });
   const result = await validateBadges(paths);
-  assert.equal(result.ok, false, "a CLI-only badge with no handler should fail validation");
+  expect(result.ok, "a CLI-only badge with no handler should fail validation").toBe(false);
   const flagged = result.errors.some((e) => e.includes("foo_ghost"));
-  assert.ok(flagged, `expected a foo_ghost drift error, got: ${result.errors.join("; ")}`);
+  expect(
+    flagged,
+    `expected a foo_ghost drift error, got: ${result.errors.join("; ")}`
+  ).toBeTruthy();
 });
 
 test("passes against the real repo (BADGE_TABLE, mark-badge help, and badge-catalog.md aligned today)", async () => {
   const result = await validateBadges();
-  assert.equal(result.ok, true, `unexpected drift in the real repo: ${result.errors.join("; ")}`);
-  assert.ok(result.badgeCount > 0);
+  expect(result.ok, `unexpected drift in the real repo: ${result.errors.join("; ")}`).toBe(true);
+  expect(result.badgeCount > 0).toBeTruthy();
 });
diff --git a/crew/tests/validate-configs.test.mts b/crew/tests/validate-configs.test.mts
index 02d6df9b..2a396dbf 100644
--- a/crew/tests/validate-configs.test.mts
+++ b/crew/tests/validate-configs.test.mts
@@ -1,6 +1,5 @@
 // tests/validate-configs.test.ts — FEAT-crew-architecture-review Section 7/8
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -35,24 +34,24 @@ async function writeTmp(name: string, content: string): Promise<string> {
 test("checkStructure accepts a well-formed yaml", async () => {
   const yamlPath = await writeTmp("routing-table.yaml", VALID_YAML);
   const { table, errors } = await checkStructure(yamlPath);
-  assert.equal(errors.length, 0);
-  assert.ok(table);
-  assert.equal(table?.rows.length, 1);
+  expect(errors.length).toBe(0);
+  expect(table).toBeTruthy();
+  expect(table?.rows.length).toBe(1);
 });
 
 test("checkStructure rejects malformed yaml with a schema error", async () => {
   const bad = `version: "1.0.0"\nrows:\n  - section: not-a-real-section\n    signal: x\n    route_to: y\n`;
   const yamlPath = await writeTmp("routing-table.yaml", bad);
   const { table, errors } = await checkStructure(yamlPath);
-  assert.equal(table, null);
-  assert.equal(errors.length, 1);
-  assert.match(errors[0] ?? "", /schema validation/);
+  expect(table).toBe(null);
+  expect(errors.length).toBe(1);
+  expect(errors[0] ?? "").toMatch(/schema validation/);
 });
 
 test("checkStructure reports a missing file", async () => {
   const { table, errors } = await checkStructure("/definitely/does/not/exist.yaml");
-  assert.equal(table, null);
-  assert.match(errors[0] ?? "", /does not exist/);
+  expect(table).toBe(null);
+  expect(errors[0] ?? "").toMatch(/does not exist/);
 });
 
 // ── checkDrift ───────────────────────────────────────────────────────────────
@@ -68,20 +67,20 @@ test("checkDrift passes when the committed .md matches a fresh render", async ()
   const rendered = render([ROW]);
   const mdPath = await writeTmp("routing-table.md", rendered);
   const errors = await checkDrift([ROW], mdPath);
-  assert.equal(errors.length, 0);
+  expect(errors.length).toBe(0);
 });
 
 test("checkDrift fails when the committed .md is stale", async () => {
   const mdPath = await writeTmp("routing-table.md", "# stale content\n");
   const errors = await checkDrift([ROW], mdPath);
-  assert.equal(errors.length, 1);
-  assert.match(errors[0] ?? "", /stale/);
+  expect(errors.length).toBe(1);
+  expect(errors[0] ?? "").toMatch(/stale/);
 });
 
 test("checkDrift fails when the .md does not exist", async () => {
   const errors = await checkDrift([ROW], "/definitely/does/not/exist.md");
-  assert.equal(errors.length, 1);
-  assert.match(errors[0] ?? "", /does not exist/);
+  expect(errors.length).toBe(1);
+  expect(errors[0] ?? "").toMatch(/does not exist/);
 });
 
 // ── resolveCrewToken / extractCrewTokens / checkResolution ──────────────────
@@ -103,22 +102,22 @@ async function makeFakeRepo(): Promise<string> {
 
 test("resolveCrewToken finds an existing agent file", async () => {
   const root = await makeFakeRepo();
-  assert.equal(await resolveCrewToken("refactor", root), true);
+  expect(await resolveCrewToken("refactor", root)).toBe(true);
 });
 
 test("resolveCrewToken finds an existing command file", async () => {
   const root = await makeFakeRepo();
-  assert.equal(await resolveCrewToken("build", root), true);
+  expect(await resolveCrewToken("build", root)).toBe(true);
 });
 
 test("resolveCrewToken finds an existing skill by directory name", async () => {
   const root = await makeFakeRepo();
-  assert.equal(await resolveCrewToken("some-skill", root), true);
+  expect(await resolveCrewToken("some-skill", root)).toBe(true);
 });
 
 test("resolveCrewToken returns false for a name that resolves nowhere", async () => {
   const root = await makeFakeRepo();
-  assert.equal(await resolveCrewToken("totally-made-up", root), false);
+  expect(await resolveCrewToken("totally-made-up", root)).toBe(false);
 });
 
 test("extractCrewTokens pulls tokens from both route_to and notes, deduped", () => {
@@ -129,7 +128,7 @@ test("extractCrewTokens pulls tokens from both route_to and notes, deduped", ()
     notes: "Pair with crew:reviewer for the fanout."
   };
   const tokens = extractCrewTokens(row);
-  assert.deepEqual(tokens.sort(), ["reviewer", "verifier"]);
+  expect(tokens.sort()).toEqual(["reviewer", "verifier"]);
 });
 
 test("checkResolution reports an error for a phantom crew: token", async () => {
@@ -139,8 +138,8 @@ test("checkResolution reports an error for a phantom crew: token", async () => {
     route_to: "crew:totally-made-up-agent"
   };
   const errors = await checkResolution([row]);
-  assert.equal(errors.length, 1);
-  assert.match(errors[0] ?? "", /crew:totally-made-up-agent/);
+  expect(errors.length).toBe(1);
+  expect(errors[0] ?? "").toMatch(/crew:totally-made-up-agent/);
 });
 
 test("checkResolution passes for a token that resolves to a real agent", async () => {
@@ -150,7 +149,7 @@ test("checkResolution passes for a token that resolves to a real agent", async (
     route_to: "crew:refactor"
   };
   const errors = await checkResolution([row]);
-  assert.equal(errors.length, 0);
+  expect(errors.length).toBe(0);
 });
 
 // ── checkModelsConfig (Decision 4) ──────────────────────────────────────────
@@ -161,9 +160,9 @@ test("checkModelsConfig accepts a well-formed models.yaml", async () => {
     'version: "1.0.0"\ndefault_profile: claude\nprofiles:\n  claude:\n    reasoning: opus\n    standard: sonnet\n    light: haiku\n'
   );
   const { config, errors } = await checkModelsConfig(yamlPath);
-  assert.equal(errors.length, 0);
-  assert.ok(config);
-  assert.equal(config?.default_profile, "claude");
+  expect(errors.length).toBe(0);
+  expect(config).toBeTruthy();
+  expect(config?.default_profile).toBe("claude");
 });
 
 test("checkModelsConfig rejects a profile missing a tier", async () => {
@@ -172,9 +171,9 @@ test("checkModelsConfig rejects a profile missing a tier", async () => {
     'version: "1.0.0"\ndefault_profile: claude\nprofiles:\n  claude:\n    reasoning: opus\n    standard: sonnet\n'
   );
   const { config, errors } = await checkModelsConfig(yamlPath);
-  assert.equal(config, null);
-  assert.equal(errors.length, 1);
-  assert.match(errors[0] ?? "", /schema validation/);
+  expect(config).toBe(null);
+  expect(errors.length).toBe(1);
+  expect(errors[0] ?? "").toMatch(/schema validation/);
 });
 
 test("checkModelsConfig rejects an unknown default_profile", async () => {
@@ -183,12 +182,12 @@ test("checkModelsConfig rejects an unknown default_profile", async () => {
     'version: "1.0.0"\ndefault_profile: codex\nprofiles:\n  claude:\n    reasoning: opus\n    standard: sonnet\n    light: haiku\n'
   );
   const { config, errors } = await checkModelsConfig(yamlPath);
-  assert.equal(config, null);
-  assert.equal(errors.length, 1);
+  expect(config).toBe(null);
+  expect(errors.length).toBe(1);
 });
 
 test("checkModelsConfig reports a missing file", async () => {
   const { config, errors } = await checkModelsConfig("/definitely/does/not/exist/models.yaml");
-  assert.equal(config, null);
-  assert.match(errors[0] ?? "", /does not exist/);
+  expect(config).toBe(null);
+  expect(errors[0] ?? "").toMatch(/does not exist/);
 });
diff --git a/crew/tests/validate-contracts.test.mts b/crew/tests/validate-contracts.test.mts
index d6b31f56..3ca5bd44 100644
--- a/crew/tests/validate-contracts.test.mts
+++ b/crew/tests/validate-contracts.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { fileURLToPath } from "node:url";
 import path from "node:path";
 import { writeFile, unlink } from "node:fs/promises";
@@ -18,8 +17,8 @@ test("validateContracts accepts a well-formed FEAT contract YAML", async () => {
     writeTs: false,
     runLint: false // lint covered separately
   });
-  assert.equal(result.ok, true, JSON.stringify(result.errors));
-  assert.ok(result.regeneratedTs.includes("export"), "TS output empty");
+  expect(result.ok, JSON.stringify(result.errors)).toBe(true);
+  expect(result.regeneratedTs.includes("export"), "TS output empty").toBeTruthy();
 });
 
 test("regenerated TS includes operation paths and Thing schema", async () => {
@@ -29,33 +28,34 @@ test("regenerated TS includes operation paths and Thing schema", async () => {
     writeTs: false,
     runLint: false
   });
-  assert.equal(result.ok, true);
-  assert.match(result.regeneratedTs, /\/things/);
-  assert.match(result.regeneratedTs, /Thing/);
-  assert.match(result.regeneratedTs, /export\s+(interface|type)\s+paths/);
+  expect(result.ok).toBe(true);
+  expect(result.regeneratedTs).toMatch(/\/things/);
+  expect(result.regeneratedTs).toMatch(/Thing/);
+  expect(result.regeneratedTs).toMatch(/export\s+(interface|type)\s+paths/);
 });
 
-test("validateContracts reports drift when committed TS differs from regenerated", async (t) => {
+test("validateContracts reports drift when committed TS differs from regenerated", async () => {
   const yamlPath = path.join(FIXTURE_DIR, "valid-feat.openapi.yaml");
   const driftedTsPath = path.join(FIXTURE_DIR, `drifted-contracts-${process.pid}-${Date.now()}.ts`);
   await writeFile(driftedTsPath, "// out of date\nexport const stale = true;\n", "utf8");
-  t.after(() =>
-    unlink(driftedTsPath).catch(() => {
+  try {
+    const result = await validateContracts({
+      yamlPath,
+      tsOutPath: driftedTsPath,
+      writeTs: false,
+      runLint: false,
+      checkDrift: true
+    });
+    expect(result.ok).toBe(false);
+    expect(
+      result.errors.some((e) => /drift/i.test(e)),
+      "expected a drift error: " + JSON.stringify(result.errors)
+    ).toBeTruthy();
+  } finally {
+    await unlink(driftedTsPath).catch(() => {
       /* ignore cleanup errors */
-    })
-  );
-  const result = await validateContracts({
-    yamlPath,
-    tsOutPath: driftedTsPath,
-    writeTs: false,
-    runLint: false,
-    checkDrift: true
-  });
-  assert.equal(result.ok, false);
-  assert.ok(
-    result.errors.some((e) => /drift/i.test(e)),
-    "expected a drift error: " + JSON.stringify(result.errors)
-  );
+    });
+  }
 });
 
 test("validateContracts fails redocly lint on broken YAML", async () => {
@@ -66,11 +66,11 @@ test("validateContracts fails redocly lint on broken YAML", async () => {
     runLint: true,
     checkDrift: false
   });
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /redocly|operationId|operation-operationId/i.test(e)),
     "expected a redocly error: " + JSON.stringify(result.errors)
-  );
+  ).toBeTruthy();
 });
 
 // Locks FEAT-138: the CI loop runs the negative fixture with checkDrift:true
@@ -85,13 +85,13 @@ test("validateContracts skips the drift check when redocly lint fails", async ()
     runLint: true,
     checkDrift: true
   });
-  assert.equal(result.ok, false, "broken fixture must still fail");
-  assert.ok(
+  expect(result.ok, "broken fixture must still fail").toBe(false);
+  expect(
     result.errors.some((e) => /redocly|operationId/i.test(e)),
     "expected the lint failure: " + JSON.stringify(result.errors)
-  );
-  assert.ok(
+  ).toBeTruthy();
+  expect(
     !result.errors.some((e) => /drift/i.test(e)),
     "drift check must be skipped when lint already failed: " + JSON.stringify(result.errors)
-  );
+  ).toBeTruthy();
 });
diff --git a/crew/tests/validate-dispatch-graph.test.mts b/crew/tests/validate-dispatch-graph.test.mts
index 712c6224..cb53f940 100644
--- a/crew/tests/validate-dispatch-graph.test.mts
+++ b/crew/tests/validate-dispatch-graph.test.mts
@@ -11,8 +11,7 @@
 //   (e) qa-expert ↔ performance-engineer bidirectional pair PASSES (allowlisted exception)
 //   (f) parseWhitelistEntries extracts entries only from whitelist region
 
-import { test, describe } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect, describe } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -29,13 +28,13 @@ describe("detectCycles — 0-cycle graph", () => {
   test("empty graph has no cycles", () => {
     const graph = new Map<string, string[]>();
     const cycles = detectCycles(graph);
-    assert.equal(cycles.length, 0, "Empty graph should have no cycles");
+    expect(cycles.length, "Empty graph should have no cycles").toBe(0);
   });
 
   test("single node with no edges has no cycles", () => {
     const graph = new Map([["a", []]]);
     const cycles = detectCycles(graph);
-    assert.equal(cycles.length, 0, "Single node with no edges should have no cycles");
+    expect(cycles.length, "Single node with no edges should have no cycles").toBe(0);
   });
 
   test("linear chain A → B → C has no cycles", () => {
@@ -45,7 +44,7 @@ describe("detectCycles — 0-cycle graph", () => {
       ["c", []]
     ]);
     const cycles = detectCycles(graph);
-    assert.equal(cycles.length, 0, "Linear chain should have no cycles");
+    expect(cycles.length, "Linear chain should have no cycles").toBe(0);
   });
 });
 
@@ -56,11 +55,11 @@ describe("detectCycles — 2-node cycle", () => {
       ["b", ["a"]]
     ]);
     const cycles = detectCycles(graph);
-    assert.ok(cycles.length > 0, "Expected at least one cycle for A → B → A");
+    expect(cycles.length > 0, "Expected at least one cycle for A → B → A").toBeTruthy();
     // The cycle must contain both 'a' and 'b'
     const cycleNodes = cycles.flat();
-    assert.ok(cycleNodes.includes("a"), "Cycle should mention node 'a'");
-    assert.ok(cycleNodes.includes("b"), "Cycle should mention node 'b'");
+    expect(cycleNodes.includes("a"), "Cycle should mention node 'a'").toBeTruthy();
+    expect(cycleNodes.includes("b"), "Cycle should mention node 'b'").toBeTruthy();
   });
 });
 
@@ -72,11 +71,11 @@ describe("detectCycles — 3-node cycle", () => {
       ["c", ["a"]]
     ]);
     const cycles = detectCycles(graph);
-    assert.ok(cycles.length > 0, "Expected at least one cycle for A → B → C → A");
+    expect(cycles.length > 0, "Expected at least one cycle for A → B → C → A").toBeTruthy();
     const cycleNodes = cycles.flat();
-    assert.ok(cycleNodes.includes("a"), "Cycle should mention node 'a'");
-    assert.ok(cycleNodes.includes("b"), "Cycle should mention node 'b'");
-    assert.ok(cycleNodes.includes("c"), "Cycle should mention node 'c'");
+    expect(cycleNodes.includes("a"), "Cycle should mention node 'a'").toBeTruthy();
+    expect(cycleNodes.includes("b"), "Cycle should mention node 'b'").toBeTruthy();
+    expect(cycleNodes.includes("c"), "Cycle should mention node 'c'").toBeTruthy();
   });
 });
 
@@ -88,7 +87,7 @@ describe("detectCycles — valid DAG with shared dependency", () => {
       ["c", []]
     ]);
     const cycles = detectCycles(graph);
-    assert.equal(cycles.length, 0, "Diamond DAG should have no cycles");
+    expect(cycles.length, "Diamond DAG should have no cycles").toBe(0);
   });
 
   test("two independent chains with a shared leaf have no cycles", () => {
@@ -100,7 +99,7 @@ describe("detectCycles — valid DAG with shared dependency", () => {
       ["researcher", []]
     ]);
     const cycles = detectCycles(graph);
-    assert.equal(cycles.length, 0, "Shared-leaf DAG should have no cycles");
+    expect(cycles.length, "Shared-leaf DAG should have no cycles").toBe(0);
   });
 });
 
@@ -113,10 +112,10 @@ describe("BIDIRECTIONAL_ALLOWED constant", () => {
         (a === "qa-expert" && b === "performance-engineer") ||
         (a === "performance-engineer" && b === "qa-expert")
     );
-    assert.ok(
+    expect(
       hasQaPerfPair,
       "qa-expert ↔ performance-engineer must be in BIDIRECTIONAL_ALLOWED (FEAT-163 line 50)"
-    );
+    ).toBeTruthy();
   });
 });
 
@@ -137,25 +136,24 @@ describe("buildDispatchGraph — qa-expert ↔ performance-engineer bidirectiona
     }
 
     const cycles = detectCycles(graph);
-    assert.equal(
+    expect(
       cycles.length,
-      0,
       `Real agent graph should have no cycles. Found: ${cycles.map((c) => c.join(" → ")).join("; ")}`
-    );
+    ).toBe(0);
 
     // Verify qa-expert and performance-engineer are present in the graph.
     // Their bidirectional edges are filtered out by buildDispatchGraph.
     const qaEdges = graph.get("qa-expert") ?? [];
     const perfEdges = graph.get("performance-engineer") ?? [];
     // After filtering the bidirectional pair, neither should point to the other
-    assert.ok(
+    expect(
       !qaEdges.includes("performance-engineer"),
       "qa-expert → performance-engineer edge should be filtered (bidirectional exception)"
-    );
-    assert.ok(
+    ).toBeTruthy();
+    expect(
       !perfEdges.includes("qa-expert"),
       "performance-engineer → qa-expert edge should be filtered (bidirectional exception)"
-    );
+    ).toBeTruthy();
   });
 });
 
@@ -177,7 +175,7 @@ You MUST NOT dispatch:
 - \`frontend-dev\`: implementers; never.
 `;
     const entries = parseWhitelistEntries(text);
-    assert.deepEqual(entries, ["researcher", "investigator"]);
+    expect(entries).toEqual(["researcher", "investigator"]);
   });
 
   test("does NOT include backtick entries from blacklist region", () => {
@@ -192,7 +190,7 @@ You MUST NOT dispatch:
 - \`frontend-dev\`: implementers.
 `;
     const entries = parseWhitelistEntries(text);
-    assert.equal(entries.length, 0, "Blacklist backtick entries must not appear in whitelist");
+    expect(entries.length, "Blacklist backtick entries must not appear in whitelist").toBe(0);
   });
 
   test("returns empty array when no Peer dispatch heading present", () => {
@@ -202,7 +200,7 @@ You MUST NOT dispatch:
 - Receive scope from lead.
 `;
     const entries = parseWhitelistEntries(text);
-    assert.equal(entries.length, 0, "No Peer dispatch section → empty entries");
+    expect(entries.length, "No Peer dispatch section → empty entries").toBe(0);
   });
 
   test("handles section with no MUST NOT boundary (entire section is whitelist region)", () => {
@@ -212,7 +210,7 @@ You MUST NOT dispatch:
 - \`architect\`: for design context.
 `;
     const entries = parseWhitelistEntries(text);
-    assert.deepEqual(entries, ["architect"]);
+    expect(entries).toEqual(["architect"]);
   });
 });
 
@@ -245,7 +243,7 @@ name: researcher
 
     const graph = await buildDispatchGraph(root);
     const cycles = detectCycles(graph);
-    assert.equal(cycles.length, 0, "Linear graph should have no cycles");
+    expect(cycles.length, "Linear graph should have no cycles").toBe(0);
   });
 
   test("graph with 2-node cycle fails detectCycles", async () => {
@@ -272,7 +270,7 @@ You MUST NOT dispatch backend-dev.
 
     const graph = await buildDispatchGraph(root);
     const cycles = detectCycles(graph);
-    assert.ok(cycles.length > 0, "2-node cycle must be detected");
+    expect(cycles.length > 0, "2-node cycle must be detected").toBeTruthy();
   });
 
   test("qa-expert ↔ performance-engineer bidirectional pair does NOT produce a cycle", async () => {
@@ -299,10 +297,9 @@ You MUST NOT dispatch backend-dev.
 
     const graph = await buildDispatchGraph(root);
     const cycles = detectCycles(graph);
-    assert.equal(
+    expect(
       cycles.length,
-      0,
       "qa-expert ↔ performance-engineer is an allowlisted bidirectional pair — must NOT be flagged as a cycle"
-    );
+    ).toBe(0);
   });
 });
diff --git a/crew/tests/validate-loop-state.test.mts b/crew/tests/validate-loop-state.test.mts
index bce379a0..46c64e35 100644
--- a/crew/tests/validate-loop-state.test.mts
+++ b/crew/tests/validate-loop-state.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -11,7 +10,7 @@ test("clean single tree passes", async () => {
     const dir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
     await fs.mkdir(dir, { recursive: true });
     await fs.writeFile(path.join(dir, "FEAT-001.md"), "---\nid: FEAT-001\n---\n");
-    assert.deepEqual(await checkLoopState(repo), []);
+    expect(await checkLoopState(repo)).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -30,14 +29,14 @@ test("flags a second populated tree and duplicate ids", async () => {
     await fs.mkdir(doneDir, { recursive: true });
     await fs.writeFile(path.join(doneDir, "FEAT-001.md"), "---\nid: FEAT-001\n---\n");
     const errors = await checkLoopState(repo);
-    assert.ok(
+    expect(
       errors.some((e) => e.includes("docs/backlog")),
       errors.join("; ")
-    );
-    assert.ok(
+    ).toBeTruthy();
+    expect(
       errors.some((e) => e.includes("FEAT-001")),
       errors.join("; ")
-    );
+    ).toBeTruthy();
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -50,7 +49,7 @@ test("picks up suffixed FEAT ids (e.g. FEAT-123a) for uniqueness checking", asyn
     await fs.mkdir(dir, { recursive: true });
     await fs.writeFile(path.join(dir, "FEAT-123a.md"), "---\nid: FEAT-123a\n---\n");
     // suffixed id should be picked up and pass uniqueness check
-    assert.deepEqual(await checkLoopState(repo), []);
+    expect(await checkLoopState(repo)).toEqual([]);
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
@@ -68,10 +67,10 @@ test("detects collision between suffixed ids in two trees", async () => {
     await fs.mkdir(doneDir, { recursive: true });
     await fs.writeFile(path.join(doneDir, "FEAT-123a.md"), "---\nid: FEAT-123a\n---\n");
     const errors = await checkLoopState(repo);
-    assert.ok(
+    expect(
       errors.some((e) => e.includes("FEAT-123a")),
       errors.join("; ")
-    );
+    ).toBeTruthy();
   } finally {
     await fs.rm(repo, { recursive: true, force: true });
   }
diff --git a/crew/tests/validate-org-refs.test.mts b/crew/tests/validate-org-refs.test.mts
index b1873abb..5ee59647 100644
--- a/crew/tests/validate-org-refs.test.mts
+++ b/crew/tests/validate-org-refs.test.mts
@@ -2,8 +2,7 @@
 // Ported alongside astragenie/runner-plugin's equivalent after the
 // sergeymilashico -> astragenie transfer left stale owner refs in authored
 // docs + skill frontmatter that kept working via GitHub's redirect.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
 import { tmpdir } from "node:os";
 import path from "node:path";
@@ -21,10 +20,10 @@ test("validateOrgRefs: flags a stale sergeymilashico owner ref in an authored fi
     "# x\n/plugin marketplace add sergeymilashico/astra-marketplace\n"
   );
   const result = await validateOrgRefs(repo);
-  assert.equal(result.ok, false);
-  assert.equal(result.findings.length, 1);
-  assert.equal(result.findings[0]?.file, "README.md");
-  assert.equal(result.findings[0]?.line, 2);
+  expect(result.ok).toBe(false);
+  expect(result.findings.length).toBe(1);
+  expect(result.findings[0]?.file).toBe("README.md");
+  expect(result.findings[0]?.line).toBe(2);
 });
 
 test("validateOrgRefs: flags a stale owner: sergeymilashico in skill frontmatter", async () => {
@@ -36,8 +35,8 @@ test("validateOrgRefs: flags a stale owner: sergeymilashico in skill frontmatter
     "---\nname: using-crew\nowner: sergeymilashico\n---\n"
   );
   const result = await validateOrgRefs(repo);
-  assert.equal(result.ok, false);
-  assert.equal(result.findings.length, 1);
+  expect(result.ok).toBe(false);
+  expect(result.findings.length).toBe(1);
 });
 
 test("validateOrgRefs: clean when the owner is astragenie / astra", async () => {
@@ -50,8 +49,8 @@ test("validateOrgRefs: clean when the owner is astragenie / astra", async () =>
   await mkdir(skillDir, { recursive: true });
   await writeFile(path.join(skillDir, "SKILL.md"), "---\nname: using-crew\nowner: astra\n---\n");
   const result = await validateOrgRefs(repo);
-  assert.equal(result.ok, true);
-  assert.deepEqual(result.findings, []);
+  expect(result.ok).toBe(true);
+  expect(result.findings).toEqual([]);
 });
 
 test("validateOrgRefs: does not scan 3rdparty (vendored) subtrees", async () => {
@@ -60,5 +59,5 @@ test("validateOrgRefs: does not scan 3rdparty (vendored) subtrees", async () =>
   await mkdir(vendored, { recursive: true });
   await writeFile(path.join(vendored, "vendored.md"), "see sergeymilashico/whatever\n");
   const result = await validateOrgRefs(repo);
-  assert.equal(result.ok, true, "3rdparty vendored files are out of scope");
+  expect(result.ok, "3rdparty vendored files are out of scope").toBe(true);
 });
diff --git a/crew/tests/validate-routing-table.test.mts b/crew/tests/validate-routing-table.test.mts
index 58f919ee..6ff078cb 100644
--- a/crew/tests/validate-routing-table.test.mts
+++ b/crew/tests/validate-routing-table.test.mts
@@ -1,13 +1,12 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
 
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
-const scriptPath = path.join(repoRoot, "scripts", "validate-routing-table.mjs");
+const scriptPath = path.join(repoRoot, "scripts", "validate-routing-table.mts");
 
 async function makeTempDir(prefix: string) {
   return fs.mkdtemp(path.join(os.tmpdir(), prefix));
@@ -75,7 +74,7 @@ function runScript(
     CREW_VALIDATE_ROUTING_TABLE_PLUGINS_JSON: pluginsJsonPath,
     ...envOverrides
   };
-  return spawnSync("node", ["--experimental-strip-types", scriptPath, ...extraArgs], {
+  return spawnSync("bun", [scriptPath, ...extraArgs], {
     env,
     encoding: "utf8"
   });
@@ -86,7 +85,7 @@ test("resolve-pass: all skill IDs found exits 0", async () => {
   const routingContent = `# Routing Table\n\n| Signal | Route to | Notes |\n|---|---|---|\n| **New feature** | crew:foo | some notes |\n| **Ext skill** | fake-plugin:fake-skill | notes |\n`;
   const { pluginsJsonPath } = await makeFixture(tmpDir, routingContent);
   const result = runScript(tmpDir, pluginsJsonPath, { CREW_VALIDATE_ROUTING_TABLE: "1" });
-  assert.equal(result.status, 0, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
+  expect(result.status, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`).toBe(0);
 });
 
 test("resolve-fail: missing skill ID exits 1 with error message", async () => {
@@ -94,9 +93,9 @@ test("resolve-fail: missing skill ID exits 1 with error message", async () => {
   const routingContent = `# Routing Table\n\n| Signal | Route to | Notes |\n|---|---|---|\n| **New feature** | crew:does-not-exist | notes |\n`;
   const { pluginsJsonPath } = await makeFixture(tmpDir, routingContent);
   const result = runScript(tmpDir, pluginsJsonPath, { CREW_VALIDATE_ROUTING_TABLE: "1" });
-  assert.equal(result.status, 1, `Expected exit 1, got ${result.status}`);
+  expect(result.status, `Expected exit 1, got ${result.status}`).toBe(1);
   const output = result.stdout + result.stderr;
-  assert.match(output, /crew:does-not-exist/, "Error should name the bad skill ID");
+  expect(output, "Error should name the bad skill ID").toMatch(/crew:does-not-exist/);
 });
 
 test("ignore-skip: rows with routing-lint:ignore are skipped", async () => {
@@ -106,7 +105,7 @@ test("ignore-skip: rows with routing-lint:ignore are skipped", async () => {
     `| **Future feature** <!-- routing-lint:ignore --> | crew:nonexistent-skill | notes |\n`;
   const { pluginsJsonPath } = await makeFixture(tmpDir, routingContent);
   const result = runScript(tmpDir, pluginsJsonPath, { CREW_VALIDATE_ROUTING_TABLE: "1" });
-  assert.equal(result.status, 0, `Expected exit 0 for ignored row, got ${result.status}`);
+  expect(result.status, `Expected exit 0 for ignored row, got ${result.status}`).toBe(0);
 });
 
 test("env-skip: no env var set exits 0 with skip message", async () => {
@@ -118,12 +117,12 @@ test("env-skip: no env var set exits 0 with skip message", async () => {
   envWithoutFlag.CREW_VALIDATE_ROUTING_TABLE_REPO_ROOT = tmpDir;
   envWithoutFlag.CREW_VALIDATE_ROUTING_TABLE_FILE = path.join(tmpDir, "docs", "routing-table.md");
   envWithoutFlag.CREW_VALIDATE_ROUTING_TABLE_PLUGINS_JSON = pluginsJsonPath;
-  const result = spawnSync("node", ["--experimental-strip-types", scriptPath], {
+  const result = spawnSync("bun", [scriptPath], {
     env: envWithoutFlag,
     encoding: "utf8"
   });
-  assert.equal(result.status, 0, `Expected exit 0 when env not set, got ${result.status}`);
-  assert.match(result.stdout, /skipped/, "Should print skip message");
+  expect(result.status, `Expected exit 0 when env not set, got ${result.status}`).toBe(0);
+  expect(result.stdout, "Should print skip message").toMatch(/skipped/);
 });
 
 // --coverage-only tests (Pass 3: agent-roster coverage, arch-review Finding 2.7).
@@ -138,7 +137,7 @@ test("coverage-only: every agents/*.md basename referenced in the table exits 0"
   await fs.writeFile(path.join(agentsDir, "foo.md"), "---\nname: foo\n---\n");
   await fs.writeFile(path.join(agentsDir, "bar.md"), "---\nname: bar\n---\n");
   const result = runScript(tmpDir, pluginsJsonPath, {}, ["--coverage-only"]);
-  assert.equal(result.status, 0, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
+  expect(result.status, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`).toBe(0);
 });
 
 test("coverage-only: an agent missing from the table exits 1 and names it", async () => {
@@ -150,8 +149,8 @@ test("coverage-only: an agent missing from the table exits 1 and names it", asyn
   await fs.writeFile(path.join(agentsDir, "foo.md"), "---\nname: foo\n---\n");
   await fs.writeFile(path.join(agentsDir, "orphan-agent.md"), "---\nname: orphan-agent\n---\n");
   const result = runScript(tmpDir, pluginsJsonPath, {}, ["--coverage-only"]);
-  assert.equal(result.status, 1, `Expected exit 1, got ${result.status}`);
-  assert.match(result.stderr, /orphan-agent/, "Error should name the uncovered agent");
+  expect(result.status, `Expected exit 1, got ${result.status}`).toBe(1);
+  expect(result.stderr, "Error should name the uncovered agent").toMatch(/orphan-agent/);
 });
 
 test("coverage-only: no agents/ directory at all exits 0 (nothing to check)", async () => {
@@ -159,7 +158,7 @@ test("coverage-only: no agents/ directory at all exits 0 (nothing to check)", as
   const routingContent = `# Routing Table\n\n| Signal | Route to |\n|---|---|\n| **Feature** | crew:foo |\n`;
   const { pluginsJsonPath } = await makeFixture(tmpDir, routingContent);
   const result = runScript(tmpDir, pluginsJsonPath, {}, ["--coverage-only"]);
-  assert.equal(result.status, 0, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
+  expect(result.status, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`).toBe(0);
 });
 
 // Fixture-based cross-check tests (consistency validator)
@@ -180,113 +179,101 @@ function runFixture(fixtureDir: string) {
     // Use a non-existent plugins JSON so ID-resolution doesn't flag external skills
     CREW_VALIDATE_ROUTING_TABLE_PLUGINS_JSON: path.join(fixtureDir, "no-plugins.json")
   };
-  return spawnSync("node", ["--experimental-strip-types", scriptPath], { env, encoding: "utf8" });
+  return spawnSync("bun", [scriptPath], { env, encoding: "utf8" });
 }
 
 test("consistency-pass: aligned row and agent block exits 0", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-pass"));
-  assert.equal(
+  expect(
     result.status,
-    0,
     `Expected exit 0 for aligned fixture. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(0);
 });
 
 test("consistency-fail: missing skill in agent block exits 1 with actionable error", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-fail"));
-  assert.equal(
+  expect(
     result.status,
-    1,
     `Expected exit 1 for mismatched fixture. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(1);
   const output = result.stdout + result.stderr;
-  assert.match(output, /rust-pro/, "Error should name the missing skill path");
-  assert.match(output, /fullstack-dev/, "Error should name the agent");
+  expect(output, "Error should name the missing skill path").toMatch(/rust-pro/);
+  expect(output, "Error should name the agent").toMatch(/fullstack-dev/);
 });
 
 test("consistency-ignore: routing-lint:ignore row skips cross-check exits 0", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-ignore"));
-  assert.equal(
+  expect(
     result.status,
-    0,
     `Expected exit 0 for ignored row. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(0);
 });
 
 test("consistency-multi: row with 2 skills, agent has 1, exits 1 for missing skill", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-multi"));
-  assert.equal(
+  expect(
     result.status,
-    1,
     `Expected exit 1 for multi-skill mismatch. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(1);
   const output = result.stdout + result.stderr;
-  assert.match(
-    output,
-    /prompt-engineering/,
-    "Error should name the missing prompt-engineering skill"
+  expect(output, "Error should name the missing prompt-engineering skill").toMatch(
+    /prompt-engineering/
   );
 });
 
 test("consistency-non-crew: non-crew route-to is skipped exits 0", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-non-crew"));
-  assert.equal(
+  expect(
     result.status,
-    0,
     `Expected exit 0 for non-crew agent row. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(0);
 });
 
 test("consistency-empty-block: agent missing Skills-you-consult heading exits 1 with skill named", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-empty-block"));
-  assert.equal(
+  expect(
     result.status,
-    1,
     `Expected exit 1 for agent without skill block. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(1);
   const output = result.stdout + result.stderr;
-  assert.match(output, /python-pro/, "Error should name the missing skill");
-  assert.match(output, /fullstack-dev/, "Error should name the agent");
+  expect(output, "Error should name the missing skill").toMatch(/python-pro/);
+  expect(output, "Error should name the agent").toMatch(/fullstack-dev/);
 });
 
 test("consistency-refs-collapse: ref-suffix in notes collapses to dir match exits 0", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-refs-collapse"));
-  assert.equal(
+  expect(
     result.status,
-    0,
     `Expected exit 0 for refs-collapse match. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(0);
 });
 
 test("consistency-multi-role: multi-role row fails if any role missing skill exits 1", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-multi-role"));
-  assert.equal(
+  expect(
     result.status,
-    1,
     `Expected exit 1 for multi-role missing skill. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(1);
   const output = result.stdout + result.stderr;
-  assert.match(output, /typescript-pro/, "Error should name the missing skill");
-  assert.match(output, /reviewer/, "Error should name the reviewer agent");
+  expect(output, "Error should name the missing skill").toMatch(/typescript-pro/);
+  expect(output, "Error should name the reviewer agent").toMatch(/reviewer/);
 });
 
 test("consistency-missing-agent: agent file absent exits 1 with actionable error", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-missing-agent"));
-  assert.equal(
+  expect(
     result.status,
-    1,
     `Expected exit 1 for missing agent file. stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(1);
   const output = result.stdout + result.stderr;
   // Should mention the agent role or the skill in error output
-  assert.match(output, /architect/, "Error should reference the architect role");
+  expect(output, "Error should reference the architect role").toMatch(/architect/);
 });
 
 test("consistency-malformed-row: malformed table rows do not crash validator exits 0", () => {
   const result = runFixture(path.join(fixturesBase, "consistency-malformed-row"));
-  assert.equal(
+  expect(
     result.status,
-    0,
     `Expected exit 0 for fixture with malformed rows (well-formed row passes). stdout: ${result.stdout} stderr: ${result.stderr}`
-  );
+  ).toBe(0);
 });
diff --git a/crew/tests/validate-skills-frontmatter.test.mts b/crew/tests/validate-skills-frontmatter.test.mts
index 8bb5fd39..7043b6b8 100644
--- a/crew/tests/validate-skills-frontmatter.test.mts
+++ b/crew/tests/validate-skills-frontmatter.test.mts
@@ -4,8 +4,7 @@
 // validate-skills.ts. Skills never require an evals: field in this slice.
 // Uses the same temp-fixture pattern as tests/validate-skills.test.ts.
 
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -44,8 +43,8 @@ Stop when the task is complete.
 `;
   const root = await makeSkillsDir({ "foo-skill": content });
   const result = await validateSkills(root);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
-  assert.equal(result.skillCount, 1);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
+  expect(result.skillCount).toBe(1);
 });
 
 // AC-ST-2: missing version → error
@@ -70,11 +69,11 @@ Stop here.
 `;
   const root = await makeSkillsDir({ "foo-skill": content });
   const result = await validateSkills(root);
-  assert.equal(result.ok, false, "missing version should error");
-  assert.ok(
+  expect(result.ok, "missing version should error").toBe(false);
+  expect(
     result.errors.some((e) => /missing required frontmatter "version"/.test(e)),
     `expected missing-version error, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
 
 // AC-ST-3: skills never require evals — even if name matches a reserved word
@@ -101,8 +100,8 @@ Stop here.
   // skill dir name must match name field to pass directory-name check
   const root = await makeSkillsDir({ lead: content });
   const result = await validateSkills(root);
-  assert.ok(
+  expect(
     !result.errors.some((e) => /requires "evals"/.test(e)),
     `skills should never require evals, got: ${result.errors.join("; ")}`
-  );
+  ).toBeTruthy();
 });
diff --git a/crew/tests/validate-skills.test.mts b/crew/tests/validate-skills.test.mts
index f95673cc..040b06b2 100644
--- a/crew/tests/validate-skills.test.mts
+++ b/crew/tests/validate-skills.test.mts
@@ -1,7 +1,6 @@
 // tests/validate-skills.test.mjs — FEAT-043
 // Covers: last_reviewed warning (AC-3) + basic error/pass paths.
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -59,16 +58,19 @@ Stop when the task is complete.
 test("passes on a well-formed skill", async () => {
   const root = await makeSkillsDir({ "my-skill": WELL_FORMED });
   const result = await validateSkills(root);
-  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join("; ")}`);
-  assert.equal(result.skillCount, 1);
+  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
+  expect(result.skillCount).toBe(1);
 });
 
 test("warns when last_reviewed is absent", async () => {
   const root = await makeSkillsDir({ "my-skill": MISSING_LAST_REVIEWED });
   const result = await validateSkills(root);
-  assert.equal(result.ok, true, "missing last_reviewed should warn, not error");
+  expect(result.ok, "missing last_reviewed should warn, not error").toBe(true);
   const hasWarning = result.warnings.some((w) => w.includes("last_reviewed"));
-  assert.ok(hasWarning, `expected last_reviewed warning, got: ${result.warnings.join("; ")}`);
+  expect(
+    hasWarning,
+    `expected last_reviewed warning, got: ${result.warnings.join("; ")}`
+  ).toBeTruthy();
 });
 
 test("errors on missing required frontmatter", async () => {
@@ -87,5 +89,5 @@ Stop here.
 `;
   const root = await makeSkillsDir({ "my-skill": noTier });
   const result = await validateSkills(root);
-  assert.equal(result.ok, false, "missing tier should error");
+  expect(result.ok, "missing tier should error").toBe(false);
 });
diff --git a/crew/tests/validate-slices.test.mts b/crew/tests/validate-slices.test.mts
index 0c97c1f8..1e913caf 100644
--- a/crew/tests/validate-slices.test.mts
+++ b/crew/tests/validate-slices.test.mts
@@ -1,8 +1,7 @@
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { spawnSync } from "node:child_process";
 import { fileURLToPath } from "node:url";
 
@@ -37,7 +36,7 @@ test("validate-slices: empty pending dir exits 0", async () => {
   const dir = await makeFixture("vs-empty-");
   try {
     const { status } = runValidator(dir);
-    assert.equal(status, 0, "expected exit 0 for empty pending dir");
+    expect(status, "expected exit 0 for empty pending dir").toBe(0);
   } finally {
     await cleanup(dir);
   }
@@ -60,7 +59,7 @@ test("validate-slices: slice with concrete ACs exits 0", async () => {
       body
     );
     const { status, stderr } = runValidator(dir);
-    assert.equal(status, 0, `expected exit 0, got ${status}, stderr: ${stderr}`);
+    expect(status, `expected exit 0, got ${status}, stderr: ${stderr}`).toBe(0);
   } finally {
     await cleanup(dir);
   }
@@ -83,9 +82,9 @@ test("validate-slices: literal AC-N: ... placeholder exits 1", async () => {
       body
     );
     const { status, stderr } = runValidator(dir);
-    assert.equal(status, 1, "expected exit 1 for literal dot placeholder");
-    assert.match(stderr, /SLICE_99_PH\.md/, "stderr must name offending file");
-    assert.match(stderr, /AC-1/, "stderr must name the placeholder AC bullet");
+    expect(status, "expected exit 1 for literal dot placeholder").toBe(1);
+    expect(stderr, "stderr must name offending file").toMatch(/SLICE_99_PH\.md/);
+    expect(stderr, "stderr must name the placeholder AC bullet").toMatch(/AC-1/);
   } finally {
     await cleanup(dir);
   }
@@ -107,8 +106,8 @@ test("validate-slices: angle-bracket template placeholder exits 1", async () =>
       body
     );
     const { status, stderr } = runValidator(dir);
-    assert.equal(status, 1, "expected exit 1 for angle-bracket placeholder");
-    assert.match(stderr, /AC-1/, "stderr must name the placeholder AC bullet");
+    expect(status, "expected exit 1 for angle-bracket placeholder").toBe(1);
+    expect(stderr, "stderr must name the placeholder AC bullet").toMatch(/AC-1/);
   } finally {
     await cleanup(dir);
   }
@@ -130,8 +129,8 @@ test("validate-slices: empty AC bullet exits 1", async () => {
       body
     );
     const { status, stderr } = runValidator(dir);
-    assert.equal(status, 1, "expected exit 1 for empty AC bullet");
-    assert.match(stderr, /AC-1/, "stderr must name the empty AC bullet");
+    expect(status, "expected exit 1 for empty AC bullet").toBe(1);
+    expect(stderr, "stderr must name the empty AC bullet").toMatch(/AC-1/);
   } finally {
     await cleanup(dir);
   }
@@ -147,7 +146,7 @@ test("validate-slices: completed/ slices are NOT scanned", async () => {
       body
     );
     const { status } = runValidator(dir);
-    assert.equal(status, 0, "expected exit 0 — completed slices are immutable history");
+    expect(status, "expected exit 0 — completed slices are immutable history").toBe(0);
   } finally {
     await cleanup(dir);
   }
@@ -157,7 +156,7 @@ test("validate-slices: missing slices dir exits 0", async () => {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vs-missing-"));
   try {
     const { status } = runValidator(dir);
-    assert.equal(status, 0, "expected exit 0 when docs/ai-loop/slices/pending is absent");
+    expect(status, "expected exit 0 when docs/ai-loop/slices/pending is absent").toBe(0);
   } finally {
     await cleanup(dir);
   }
diff --git a/crew/tests/validate-syntheses.test.mts b/crew/tests/validate-syntheses.test.mts
index 84037307..f7afc9d3 100644
--- a/crew/tests/validate-syntheses.test.mts
+++ b/crew/tests/validate-syntheses.test.mts
@@ -1,6 +1,5 @@
 // tests/validate-syntheses.test.mjs
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
@@ -53,7 +52,7 @@ import { validateSyntheses } from "../scripts/validate-syntheses.mjs";
 test("validateSyntheses passes when no synthesis files exist", async () => {
   const dir = await makeRunsDir({});
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -62,7 +61,7 @@ test("validateSyntheses passes on clean synthesis file", async () => {
     "foo-final-synthesis.md": "# Synthesis\n## Grade\ntest_confidence: 0.85\n"
   });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -71,8 +70,8 @@ test("validateSyntheses errors on Grade missing placeholder", async () => {
     "bad-final-synthesis.md": "# Synthesis\n- Grade missing — synthesis is incomplete\n"
   });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /Grade missing/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/Grade missing/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -82,8 +81,8 @@ test("validateSyntheses errors on timestamp placeholder", async () => {
       "# Synthesis\n- Handoff: `.claude/artifacts/crew/handoffs/<timestamp>-complete.md`\n"
   });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /<timestamp>/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/<timestamp>/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -93,7 +92,7 @@ test("validateSyntheses checks only final-synthesis files not other runs", async
     "2026-final-synthesis-clean.md": "# OK synthesis\nAll good.\n"
   });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -102,14 +101,14 @@ test("validateSyntheses checks only final-synthesis files not other runs", async
 test("validateSyntheses passes when no grades dir exists", async () => {
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-val-nograde-"));
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
 test("validateSyntheses passes on a filled-in grade file", async () => {
   const dir = await makeGradesDir({ "20260706T000000Z-slice99-grade.md": FILLED_GRADE });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -125,10 +124,10 @@ test("validateSyntheses rejects a grade file with '- bullet' placeholder lines",
   );
   const dir = await makeGradesDir({ "20260709T000000Z-slice98-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /grade_incomplete/);
-  assert.match(result.errors[0]!, /bullet/);
-  assert.equal(result.grandfatheredGradeRot.length, 0);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/grade_incomplete/);
+  expect(result.errors[0]!).toMatch(/bullet/);
+  expect(result.grandfatheredGradeRot.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -136,8 +135,8 @@ test("validateSyntheses rejects a grade file with a bare '- bullet' surprises/fo
   const rotted = `${FILLED_GRADE}\n## Surprises\n\n- bullet\n`;
   const dir = await makeGradesDir({ "20260709T000000Z-slice97-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /grade_incomplete/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/grade_incomplete/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -148,8 +147,8 @@ test("validateSyntheses rejects a grade file whose AC scores are all unfilled (0
   );
   const dir = await makeGradesDir({ "20260709T000000Z-slice96-grade.md": unfilled });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /grade_incomplete/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/grade_incomplete/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -157,9 +156,9 @@ test("validateSyntheses rejects a grade file with an unrendered '<title>' headin
   const rotted = FILLED_GRADE.replace("# SLICE-99 — Grade", "# SLICE-99: <title> — Grade");
   const dir = await makeGradesDir({ "20260709T000000Z-slice93-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /grade_incomplete/);
-  assert.match(result.errors[0]!, /<title>/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/grade_incomplete/);
+  expect(result.errors[0]!).toMatch(/<title>/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -167,9 +166,9 @@ test("validateSyntheses rejects a grade file with an unfilled 'DEC-TBD: Short de
   const rotted = `${FILLED_GRADE}\n## Decisions\n\n### DEC-TBD: Short decision title\n\n**Rationale**: Why this decision was made.\n`;
   const dir = await makeGradesDir({ "20260709T000000Z-slice92-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /grade_incomplete/);
-  assert.match(result.errors[0]!, /DEC-TBD/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/grade_incomplete/);
+  expect(result.errors[0]!).toMatch(/DEC-TBD/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -177,7 +176,7 @@ test("validateSyntheses does NOT flag a real (id-pending) 'DEC-TBD:' decision wi
   const real = `${FILLED_GRADE}\n## Decisions\n\n### DEC-TBD: checkJs:false for migrate-first TS adoption\n\n**Rationale**: Real rationale text.\n`;
   const dir = await makeGradesDir({ "20260709T000000Z-slice91-grade.md": real });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -185,9 +184,9 @@ test("validateSyntheses rejects a grade file with an unfilled '(narrative)' sect
   const rotted = `${FILLED_GRADE}\n## What went well\n\n(narrative)\n`;
   const dir = await makeGradesDir({ "20260709T000000Z-slice90-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.match(result.errors[0]!, /grade_incomplete/);
-  assert.match(result.errors[0]!, /narrative/);
+  expect(result.errors.length).toBe(1);
+  expect(result.errors[0]!).toMatch(/grade_incomplete/);
+  expect(result.errors[0]!).toMatch(/narrative/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -198,14 +197,14 @@ test("validateSyntheses does NOT flag '<title>'-shaped prose that isn't the unre
   const real = `${FILLED_GRADE}\n\nLegacy \`cost-report-<title>.md\` files continue to parse.\n`;
   const dir = await makeGradesDir({ "20260709T000000Z-slice89-grade.md": real });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
 test("validateSyntheses ignores non-grade files in the grades directory", async () => {
   const dir = await makeGradesDir({ "README.md": "- bullet\nnot a grade file" });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
+  expect(result.errors.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -218,10 +217,10 @@ test("validateSyntheses grandfathers rotted grade files dated before the FEAT-19
   );
   const dir = await makeGradesDir({ "20260706T000000Z-slice98-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
-  assert.equal(result.grandfatheredGradeRot.length, 1);
-  assert.match(result.grandfatheredGradeRot[0]!, /grandfathered/);
-  assert.match(result.grandfatheredGradeRot[0]!, /FEAT-199b/);
+  expect(result.errors.length).toBe(0);
+  expect(result.grandfatheredGradeRot.length).toBe(1);
+  expect(result.grandfatheredGradeRot[0]!).toMatch(/grandfathered/);
+  expect(result.grandfatheredGradeRot[0]!).toMatch(/FEAT-199b/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -234,8 +233,8 @@ test("validateSyntheses hard-fails a rotted grade file dated exactly at the gran
   // grade rot; a file AT the cutoff is still held to the full standard.
   const dir = await makeGradesDir({ "20260709T000000Z-slice98-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.equal(result.grandfatheredGradeRot.length, 0);
+  expect(result.errors.length).toBe(1);
+  expect(result.grandfatheredGradeRot.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -246,8 +245,8 @@ test("validateSyntheses treats a grade file with no parseable timestamp prefix a
   );
   const dir = await makeGradesDir({ "legacy-slice98-grade.md": rotted });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.equal(result.grandfatheredGradeRot.length, 0);
+  expect(result.errors.length).toBe(1);
+  expect(result.grandfatheredGradeRot.length).toBe(0);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -260,9 +259,9 @@ test("validateSyntheses grandfathers a rotted synthesis whose basename is in the
     "slice79-final-synthesis.md": "# Synthesis\n- Grade missing — incomplete\n"
   });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 0);
-  assert.equal(result.grandfatheredSynth.length, 1);
-  assert.match(result.grandfatheredSynth[0]!, /FEAT-199b/);
+  expect(result.errors.length).toBe(0);
+  expect(result.grandfatheredSynth.length).toBe(1);
+  expect(result.grandfatheredSynth[0]!).toMatch(/FEAT-199b/);
   await fs.rm(dir, { recursive: true, force: true });
 });
 
@@ -271,8 +270,8 @@ test("validateSyntheses still hard-fails a NEW rotted synthesis not in the grand
     "feat999-slice999-final-synthesis.md": "# Synthesis\n- Grade missing — incomplete\n"
   });
   const result = await validateSyntheses(dir);
-  assert.equal(result.errors.length, 1);
-  assert.equal(result.grandfatheredSynth.length, 0);
-  assert.match(result.errors[0]!, /Grade missing/);
+  expect(result.errors.length).toBe(1);
+  expect(result.grandfatheredSynth.length).toBe(0);
+  expect(result.errors[0]!).toMatch(/Grade missing/);
   await fs.rm(dir, { recursive: true, force: true });
 });
diff --git a/crew/tests/validate-ux-spec.test.mts b/crew/tests/validate-ux-spec.test.mts
index eb1e8386..aa3e6609 100644
--- a/crew/tests/validate-ux-spec.test.mts
+++ b/crew/tests/validate-ux-spec.test.mts
@@ -1,5 +1,4 @@
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { fileURLToPath } from "node:url";
 import path from "node:path";
 import { validateUxSpec } from "../scripts/validate-ux-spec.mjs";
@@ -16,11 +15,8 @@ test("validateUxSpec accepts a well-formed spec with valid operationIds", async
     specPath: path.join(FIXTURE_DIR, "valid-ux-spec.md"),
     repoRoot: REPO_ROOT
   });
-  assert.equal(result.ok, true, JSON.stringify(result.errors));
-  assert.deepEqual(
-    result.touchpoints.map((t) => t.operationId),
-    ["createThing"]
-  );
+  expect(result.ok, JSON.stringify(result.errors)).toBe(true);
+  expect(result.touchpoints.map((t) => t.operationId)).toEqual(["createThing"]);
 });
 
 test("validateUxSpec fails when operationId is not in the YAML", async () => {
@@ -28,14 +24,14 @@ test("validateUxSpec fails when operationId is not in the YAML", async () => {
     specPath: path.join(FIXTURE_DIR, "missing-operationid.md"),
     repoRoot: REPO_ROOT
   });
-  assert.equal(result.ok, false);
-  assert.ok(
+  expect(result.ok).toBe(false);
+  expect(
     result.errors.some((e) => /nonExistentOp/.test(e)),
     "expected error mentioning missing operationId"
-  );
+  ).toBeTruthy();
 });
 
-test("validateUxSpec fails when `## API touchpoints` section is absent", async (t) => {
+test("validateUxSpec fails when `## API touchpoints` section is absent", async () => {
   const tmpPath = path.join(FIXTURE_DIR, `no-touchpoints-${process.pid}-${Date.now()}.md`);
   const { writeFile, unlink } = await import("node:fs/promises");
   await writeFile(
@@ -43,18 +39,19 @@ test("validateUxSpec fails when `## API touchpoints` section is absent", async (
     "---\ncontracts: tests/fixtures/openapi/valid-feat.openapi.yaml\n---\n\n# UX Spec\n\nno touchpoints section here.\n",
     "utf8"
   );
-  t.after(() =>
-    unlink(tmpPath).catch(() => {
+  try {
+    const result = await validateUxSpec({
+      specPath: tmpPath,
+      repoRoot: REPO_ROOT
+    });
+    expect(result.ok).toBe(false);
+    expect(
+      result.errors.some((e) => /API touchpoints/.test(e)),
+      "expected error mentioning missing section"
+    ).toBeTruthy();
+  } finally {
+    await unlink(tmpPath).catch(() => {
       /* ignore cleanup errors */
-    })
-  );
-  const result = await validateUxSpec({
-    specPath: tmpPath,
-    repoRoot: REPO_ROOT
-  });
-  assert.equal(result.ok, false);
-  assert.ok(
-    result.errors.some((e) => /API touchpoints/.test(e)),
-    "expected error mentioning missing section"
-  );
+    });
+  }
 });
diff --git a/crew/tests/validation-gate-delegation.test.mts b/crew/tests/validation-gate-delegation.test.mts
index 043a0627..15b28659 100644
--- a/crew/tests/validation-gate-delegation.test.mts
+++ b/crew/tests/validation-gate-delegation.test.mts
@@ -23,8 +23,7 @@
 // cases directly against that function.
 import fs from "node:fs/promises";
 import path from "node:path";
-import test from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { fileURLToPath } from "node:url";
 
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
@@ -44,75 +43,75 @@ test('loop.json: reviewers.ladder is the single-reviewer default ["A"]', async (
   const config = (await readJson(".claude/loop.json")) as {
     reviewers?: { ladder?: unknown };
   };
-  assert.deepEqual(config.reviewers?.ladder, ["A"]);
+  expect(config.reviewers?.ladder).toEqual(["A"]);
 });
 
 test("loop.json: loop.validation.satisfiedByReview is true", async () => {
   const config = (await readJson(".claude/loop.json")) as {
     loop?: { validation?: { satisfiedByReview?: unknown } };
   };
-  assert.equal(config.loop?.validation?.satisfiedByReview, true);
+  expect(config.loop?.validation?.satisfiedByReview).toBe(true);
 });
 
 test("loop.json: loop.modelRouting is disabled — agent frontmatter governs dispatch models", async () => {
   const config = (await readJson(".claude/loop.json")) as {
     loop?: { modelRouting?: Record<string, unknown> };
   };
-  assert.deepEqual(config.loop?.modelRouting, { enabled: false });
+  expect(config.loop?.modelRouting).toEqual({ enabled: false });
 });
 
 // ── AC-5: validator-gate SKILL documents the satisfiedByReview delegation ──
 
 test("validator-gate SKILL: documents the satisfiedByReview default delegation path", async () => {
   const text = await readText("skills/workflow/validator-gate/SKILL.md");
-  assert.match(text, /satisfiedByReview/);
-  assert.match(text, /do not dispatch `crew:verifier`/i);
+  expect(text).toMatch(/satisfiedByReview/);
+  expect(text).toMatch(/do not dispatch `crew:verifier`/i);
 });
 
 test("validator-gate SKILL: documents the risk-gated exception that still dispatches crew:verifier", async () => {
   const text = await readText("skills/workflow/validator-gate/SKILL.md");
-  assert.match(text, /risk: high/i);
-  assert.match(text, /concern:security/);
-  assert.match(text, /concern:performance/);
-  assert.match(text, /SPLIT_BUILD = true/);
+  expect(text).toMatch(/risk: high/i);
+  expect(text).toMatch(/concern:security/);
+  expect(text).toMatch(/concern:performance/);
+  expect(text).toMatch(/SPLIT_BUILD = true/);
 });
 
 test("validator-gate SKILL: no longer asserts the old always-dispatch-no-skip absolute", async () => {
   const text = await readText("skills/workflow/validator-gate/SKILL.md");
-  assert.doesNotMatch(text, /Always dispatch `crew:verifier` on any code-bearing slice/i);
-  assert.doesNotMatch(text, /No skip path: a code-only diff still needs the verifier/i);
+  expect(text).not.toMatch(/Always dispatch `crew:verifier` on any code-bearing slice/i);
+  expect(text).not.toMatch(/No skip path: a code-only diff still needs the verifier/i);
 });
 
 // ── AC-3/AC-2: commands/orchestrate-slice.md gates the heavy path on risk ──
 
 test("orchestrate-slice.md: RISK_GATE is computed from risk/tags/SPLIT_BUILD before dispatch", async () => {
   const text = await readText("commands/orchestrate-slice.md");
-  assert.match(text, /Compute `RISK_GATE`/);
-  assert.match(text, /risk: high/i);
-  assert.match(text, /concern:security/);
-  assert.match(text, /concern:performance/);
-  assert.match(text, /SPLIT_BUILD = true/);
+  expect(text).toMatch(/Compute `RISK_GATE`/);
+  expect(text).toMatch(/risk: high/i);
+  expect(text).toMatch(/concern:security/);
+  expect(text).toMatch(/concern:performance/);
+  expect(text).toMatch(/SPLIT_BUILD = true/);
 });
 
 test("orchestrate-slice.md: RISK_GATE=false dispatches exactly one reviewer and no dedicated verifier", async () => {
   const text = await readText("commands/orchestrate-slice.md");
-  assert.match(text, /`RISK_GATE = false`.*dispatch exactly \*\*one\*\* `crew:reviewer`/s);
-  assert.match(text, /Do \*\*not\*\* dispatch a dedicated `crew:verifier`/);
+  expect(text).toMatch(/`RISK_GATE = false`.*dispatch exactly \*\*one\*\* `crew:reviewer`/s);
+  expect(text).toMatch(/Do \*\*not\*\* dispatch a dedicated `crew:verifier`/);
 });
 
 test("orchestrate-slice.md: RISK_GATE=true still fires the heavy 2nd-reviewer/verifier path", async () => {
   const text = await readText("commands/orchestrate-slice.md");
-  assert.match(text, /`RISK_GATE = true`.*dispatch the heavy path/s);
-  assert.match(text, /fan-out-review\/SKILL\.md.*AND\/OR a dedicated `crew:verifier`/s);
+  expect(text).toMatch(/`RISK_GATE = true`.*dispatch the heavy path/s);
+  expect(text).toMatch(/fan-out-review\/SKILL\.md.*AND\/OR a dedicated `crew:verifier`/s);
 });
 
 test("orchestrate-slice.md: full-suite ownership is documented as CI (test.yml), not dropped", async () => {
   const text = await readText("commands/orchestrate-slice.md");
   // CI (`.github/workflows/test.yml`) is the actual full-suite runner.
-  assert.match(text, /\.github\/workflows\/test\.yml/);
+  expect(text).toMatch(/\.github\/workflows\/test\.yml/);
   // Honest boundary (reviewer MEDIUM finding): the pre-push hook only checks
   // for a PASS artifact behind a default-off flag — it does NOT run the suite.
   // The prose must not overclaim that pre-push runs the full suite.
-  assert.match(text, /pre-push-verifier/);
-  assert.match(text, /only checks for a PASS artifact/i);
+  expect(text).toMatch(/pre-push-verifier/);
+  expect(text).toMatch(/only checks for a PASS artifact/i);
 });
diff --git a/crew/tests/workflow-state-concurrent.test.mts b/crew/tests/workflow-state-concurrent.test.mts
index fe4cd83c..0778a5b7 100644
--- a/crew/tests/workflow-state-concurrent.test.mts
+++ b/crew/tests/workflow-state-concurrent.test.mts
@@ -1,6 +1,5 @@
 import fs from "node:fs/promises";
-import { test } from "node:test";
-import assert from "node:assert/strict";
+import { test, expect } from "bun:test";
 import { runCrew } from "../scripts/crew.mjs";
 import { makeTempDir } from "./helpers/cli-fixtures.mjs";
 import { loadWorkflowState } from "../scripts/lib/workflow-state.mjs";
@@ -33,27 +32,15 @@ test("concurrent markWorkflowBadge calls merge correctly (no lost updates)", asy
       ])
     ]);
 
-    assert.equal(result1.code, 0, "first badge mark should succeed");
-    assert.equal(result2.code, 0, "second badge mark should succeed");
+    expect(result1.code, "first badge mark should succeed").toBe(0);
+    expect(result2.code, "second badge mark should succeed").toBe(0);
 
     // Verify both gates are set in final state
     const final = await loadWorkflowState(repoPath);
-    assert.equal(final.currentRun?.gates.review?.status, "passed", "review gate should be passed");
-    assert.equal(
-      final.currentRun?.gates.validation?.status,
-      "passed",
-      "validation gate should be passed"
-    );
-    assert.equal(
-      final.currentRun?.gates.review?.note,
-      "review OK",
-      "review note should be persisted"
-    );
-    assert.equal(
-      final.currentRun?.gates.validation?.note,
-      "validation OK",
-      "validation note should be persisted"
-    );
+    expect(final.currentRun?.gates.review?.status, "review gate should be passed").toBe("passed");
+    expect(final.currentRun?.gates.validation?.status, "validation gate should be passed").toBe("passed");
+    expect(final.currentRun?.gates.review?.note, "review note should be persisted").toBe("review OK");
+    expect(final.currentRun?.gates.validation?.note, "validation note should be persisted").toBe("validation OK");
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
@@ -75,11 +62,11 @@ test("validation_stale badge sets validation gate to stale status", async () =>
       "--note",
       "initial validation passed"
     ]);
-    assert.equal(passResult.code, 0);
+    expect(passResult.code).toBe(0);
 
     // Load state to verify
     let state = await loadWorkflowState(repoPath);
-    assert.equal(state.currentRun?.gates.validation?.status, "passed");
+    expect(state.currentRun?.gates.validation?.status).toBe("passed");
 
     // Now mark as stale
     const staleResult = await runCrew([
@@ -91,20 +78,12 @@ test("validation_stale badge sets validation gate to stale status", async () =>
       "--note",
       "invalidated by review needs_fix"
     ]);
-    assert.equal(staleResult.code, 0, "validation_stale badge should succeed");
+    expect(staleResult.code, "validation_stale badge should succeed").toBe(0);
 
     // Verify state
     state = await loadWorkflowState(repoPath);
-    assert.equal(
-      state.currentRun?.gates.validation?.status,
-      "stale",
-      "validation gate should be stale"
-    );
-    assert.equal(
-      state.currentRun?.gates.validation?.note,
-      "invalidated by review needs_fix",
-      "stale note should be persisted"
-    );
+    expect(state.currentRun?.gates.validation?.status, "validation gate should be stale").toBe("stale");
+    expect(state.currentRun?.gates.validation?.note, "stale note should be persisted").toBe("invalidated by review needs_fix");
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
diff --git a/crew/tests/worktree-manager.test.mts b/crew/tests/worktree-manager.test.mts
index c8b27153..eb306404 100644
--- a/crew/tests/worktree-manager.test.mts
+++ b/crew/tests/worktree-manager.test.mts
@@ -1,3 +1,4 @@
+import { test, expect } from "bun:test";
 // #163 — chore-branch quick-win lane spawner.
 //
 // Verifies spawnChoreLane's three paths (fresh / reuse-live / re-attach) plus
@@ -7,8 +8,6 @@ import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
 import { execFileSync } from "node:child_process";
-import test from "node:test";
-import assert from "node:assert/strict";
 
 import { spawnChoreLane, choreLaneStatus } from "../scripts/lib/worktree-manager.mjs";
 
@@ -48,24 +47,23 @@ test("fresh spawn cuts chore/quickwins-<date> from main into a gitignored worktr
   const repo = await makeRepo("fresh");
 
   const result = await spawnChoreLane(repo, { date: DATE });
-  assert.equal(result.ok, true);
+  expect(result.ok).toBe(true);
   if (!result.ok) return;
 
-  assert.equal(result.value.branch, BRANCH);
-  assert.equal(result.value.reused, false);
-  assert.equal(result.value.base, "main");
-  assert.equal(
-    path.resolve(result.value.worktreePath),
+  expect(result.value.branch).toBe(BRANCH);
+  expect(result.value.reused).toBe(false);
+  expect(result.value.base).toBe("main");
+  expect(path.resolve(result.value.worktreePath)).toBe(
     path.resolve(repo, ".claude", "worktrees", `quickwins-${DATE}`)
   );
 
   // Worktree actually exists on disk and is checked out on the lane branch.
-  await assert.doesNotReject(fs.access(result.value.worktreePath));
+  await fs.access(result.value.worktreePath);
   const head = git(["rev-parse", "--abbrev-ref", "HEAD"], result.value.worktreePath);
-  assert.equal(head, BRANCH);
+  expect(head).toBe(BRANCH);
 
   // Lane branch tip equals main's tip (cut from base, not a stray commit).
-  assert.equal(git(["rev-parse", BRANCH], repo), git(["rev-parse", "main"], repo));
+  expect(git(["rev-parse", BRANCH], repo)).toBe(git(["rev-parse", "main"], repo));
 });
 
 test("second spawn on the same date reuses the live lane (batching: one PR/day)", async () => {
@@ -73,60 +71,60 @@ test("second spawn on the same date reuses the live lane (batching: one PR/day)"
 
   const first = await spawnChoreLane(repo, { date: DATE });
   const second = await spawnChoreLane(repo, { date: DATE });
-  assert.equal(first.ok && second.ok, true);
+  expect(first.ok && second.ok).toBe(true);
   if (!first.ok || !second.ok) return;
 
-  assert.equal(second.value.reused, true);
-  assert.equal(path.resolve(second.value.worktreePath), path.resolve(first.value.worktreePath));
+  expect(second.value.reused).toBe(true);
+  expect(path.resolve(second.value.worktreePath)).toBe(path.resolve(first.value.worktreePath));
   // Exactly one lane worktree registered — no duplicate.
   const list = git(["worktree", "list", "--porcelain"], repo);
   const laneCount = list.split("\n").filter((l) => l === `branch refs/heads/${BRANCH}`).length;
-  assert.equal(laneCount, 1);
+  expect(laneCount).toBe(1);
 });
 
 test("branch survives but worktree pruned → re-attach a worktree at the existing branch", async () => {
   const repo = await makeRepo("reattach");
 
   const first = await spawnChoreLane(repo, { date: DATE });
-  assert.equal(first.ok, true);
+  expect(first.ok).toBe(true);
   if (!first.ok) return;
 
   // Simulate an operator removing the worktree while keeping the branch.
   git(["worktree", "remove", "--force", first.value.worktreePath], repo);
-  assert.equal(git(["rev-parse", "--verify", BRANCH], repo).length > 0, true);
+  expect(git(["rev-parse", "--verify", BRANCH], repo).length > 0).toBe(true);
 
   const again = await spawnChoreLane(repo, { date: DATE });
-  assert.equal(again.ok, true);
+  expect(again.ok).toBe(true);
   if (!again.ok) return;
-  assert.equal(again.value.reused, true);
-  assert.equal(again.value.branch, BRANCH);
-  await assert.doesNotReject(fs.access(again.value.worktreePath));
+  expect(again.value.reused).toBe(true);
+  expect(again.value.branch).toBe(BRANCH);
+  await fs.access(again.value.worktreePath);
 });
 
 test("choreLaneStatus reflects lane presence before and after spawn", async () => {
   const repo = await makeRepo("status");
 
   const before = await choreLaneStatus(repo, { date: DATE });
-  assert.equal(before.ok, true);
+  expect(before.ok).toBe(true);
   if (!before.ok) return;
-  assert.equal(before.value.exists, false);
-  assert.equal(before.value.worktreePath, null);
-  assert.equal(before.value.branch, BRANCH);
+  expect(before.value.exists).toBe(false);
+  expect(before.value.worktreePath).toBe(null);
+  expect(before.value.branch).toBe(BRANCH);
 
   await spawnChoreLane(repo, { date: DATE });
 
   const after = await choreLaneStatus(repo, { date: DATE });
-  assert.equal(after.ok, true);
+  expect(after.ok).toBe(true);
   if (!after.ok) return;
-  assert.equal(after.value.exists, true);
-  assert.notEqual(after.value.worktreePath, null);
+  expect(after.value.exists).toBe(true);
+  expect(after.value.worktreePath).not.toBe(null);
 });
 
 test("spawning against a plain non-git directory returns an error, not a crash", async () => {
   const plain = await fs.mkdtemp(path.join(os.tmpdir(), "wt-mgr-plain-"));
 
   const result = await spawnChoreLane(plain, { date: DATE });
-  assert.equal(result.ok, false);
+  expect(result.ok).toBe(false);
   if (result.ok) return;
-  assert.match(result.error.message, /Not a git repository/);
+  expect(result.error.message).toMatch(/Not a git repository/);
 });

```

## Files touched


## Files read

