---
slice: unknown
builder: fullstack-dev
run_id: 20260613T131818Z
feat: FEAT-130
files_touched: [".gitignore", "docs/halt-badges.md", "src/scripts/lib/halt-badges.mts", "src/scripts/lib/stop-conditions.mts", "src/scripts/lib/stuck-detector.mts", "src/scripts/loop.mts", "src/tests/explain-halts.test.mts", "src/tests/stuck-detector.test.mts"]
files_read: []
diff_stat: { files: 4, additions: 41, deletions: 15 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-119: Runtime stuck-detector halt-badge

- Created: 2026-06-13T13:18:18.129Z
- From: fullstack-dev
- To: lead
- Objective: Adds stuckDetected halt-badge (9th in registry) with stuck-tick/stuck-reset CLI subcommands, fail-open detector, 7 unit tests, and docs — all gates PASS
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/stuck-detector.mts
  - src/scripts/lib/halt-badges.mts
  - src/scripts/lib/stop-conditions.mts
  - src/scripts/loop.mts
  - src/tests/stuck-detector.test.mts
  - src/tests/explain-halts.test.mts
  - docs/halt-badges.md
  - .gitignore
- Confidence: high
- Risks: -
- Suggested Next Handoff: Inspector review (correctness + AC coverage), then verifier run on full test suite


## Diff

```diff
diff --git a/src/scripts/lib/brief.mts b/src/scripts/lib/brief.mts
index fe928c4..7bc3c4c 100644
--- a/src/scripts/lib/brief.mts
+++ b/src/scripts/lib/brief.mts
@@ -44,14 +44,23 @@ function computeGradeSignal(grades: Record<string, any>[]) {
 function computeSliceStartConfidence(
   topTriagedRaw: Record<string, any>[],
   gradeSignal: ReturnType<typeof computeGradeSignal>
-): { featureId: string | null; confidence: "green" | "yellow" | "red" | null; reason: string | null } | null {
+): {
+  featureId: string | null;
+  confidence: "green" | "yellow" | "red" | null;
+  reason: string | null;
+} | null {
   if (topTriagedRaw.length === 0) return null;
   const top = topTriagedRaw[0] as Record<string, any>;
   const autonomousSafe: boolean | null = top.frontmatter.autonomous_safe ?? null;
   const dependsOnCount: number = Array.isArray(top.frontmatter.depends_on)
     ? top.frontmatter.depends_on.length
     : 0;
-  const result = computeConfidence({ autonomousSafe, acCount: 2, recentGradeAvg: gradeSignal.avgRecent, dependsOnCount });
+  const result = computeConfidence({
+    autonomousSafe,
+    acCount: 2,
+    recentGradeAvg: gradeSignal.avgRecent,
+    dependsOnCount
+  });
   return { featureId: top.id as string, confidence: result.confidence, reason: result.reason };
 }
 
diff --git a/src/scripts/validate-manifests.mts b/src/scripts/validate-manifests.mts
index 6343e94..ed718a8 100644
--- a/src/scripts/validate-manifests.mts
+++ b/src/scripts/validate-manifests.mts
@@ -48,7 +48,7 @@ export function validateCommandFrontmatter(repoRoot: string): string[] {
     const content = readFileSync(full, "utf8");
     const { frontmatter } = parseFrontmatter(content);
     // Validate name
-    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "name"))) {
+    if (!Object.prototype.hasOwnProperty.call(frontmatter, "name")) {
       errors.push(`commands/${entry}: missing required field "name"`);
     } else if (typeof frontmatter["name"] !== "string" || frontmatter["name"] === "") {
       errors.push(`commands/${entry}: "name" must be a non-empty string`);
@@ -58,13 +58,16 @@ export function validateCommandFrontmatter(repoRoot: string): string[] {
       );
     }
     // Validate description
-    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "description"))) {
+    if (!Object.prototype.hasOwnProperty.call(frontmatter, "description")) {
       errors.push(`commands/${entry}: missing required field "description"`);
-    } else if (typeof frontmatter["description"] !== "string" || frontmatter["description"] === "") {
+    } else if (
+      typeof frontmatter["description"] !== "string" ||
+      frontmatter["description"] === ""
+    ) {
       errors.push(`commands/${entry}: "description" must be a non-empty string`);
     }
     // Validate auto_execute_steps
-    if (!(Object.prototype.hasOwnProperty.call(frontmatter, "auto_execute_steps"))) {
+    if (!Object.prototype.hasOwnProperty.call(frontmatter, "auto_execute_steps")) {
       errors.push(`commands/${entry}: missing required field "auto_execute_steps"`);
     } else if (typeof frontmatter["auto_execute_steps"] !== "boolean") {
       errors.push(
diff --git a/src/tests/bootstrap-context.test.mts b/src/tests/bootstrap-context.test.mts
index 3c48912..3fd64bd 100644
--- a/src/tests/bootstrap-context.test.mts
+++ b/src/tests/bootstrap-context.test.mts
@@ -25,10 +25,7 @@ test("bootstrap-context hook output stays within line budget", () => {
   const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
   assert.equal(result.status, 0);
   const lines = result.stdout.split("\n");
-  assert.ok(
-    lines.length <= 65,
-    `line count ${lines.length} exceeds budget of 65`
-  );
+  assert.ok(lines.length <= 65, `line count ${lines.length} exceeds budget of 65`);
 });
 
 // Test 3 — Output contains all six key HARD RULE reminder topics
@@ -39,7 +36,9 @@ test("bootstrap-context hook output covers all six required topics", () => {
 
   assert.ok(stdout.includes("Run until PASS"), 'must include "Run until PASS"');
   assert.ok(
-    stdout.toLowerCase().includes("automode") || stdout.includes("auto mode") || stdout.includes("autoMode"),
+    stdout.toLowerCase().includes("automode") ||
+      stdout.includes("auto mode") ||
+      stdout.includes("autoMode"),
     'must include "autoMode" or "auto mode"'
   );
   assert.ok(
@@ -68,11 +67,19 @@ test("bootstrap-context hook exits 0 when stdout is ignored", () => {
 test("hooks.json has two SessionStart entries with correct bootstrap-context config", () => {
   const raw = readFileSync(HOOKS_JSON, "utf8");
   const config = JSON.parse(raw) as {
-    hooks: { SessionStart: Array<{ hooks: Array<{ type: string; command: string; description: string; timeout: number }> }> };
+    hooks: {
+      SessionStart: Array<{
+        hooks: Array<{ type: string; command: string; description: string; timeout: number }>;
+      }>;
+    };
   };
 
   const sessionStart = config.hooks.SessionStart;
-  assert.equal(sessionStart.length, 2, `expected 2 SessionStart entries, got ${sessionStart.length}`);
+  assert.equal(
+    sessionStart.length,
+    2,
+    `expected 2 SessionStart entries, got ${sessionStart.length}`
+  );
 
   const second = sessionStart[1];
   assert.ok(
diff --git a/src/tests/from-issue.test.mts b/src/tests/from-issue.test.mts
index 1e6ef65..f0be0f2 100644
--- a/src/tests/from-issue.test.mts
+++ b/src/tests/from-issue.test.mts
@@ -104,7 +104,12 @@ test("fetchIssue passes correct gh args to executor", async () => {
   const seenArgs: string[][] = [];
   const exec = async (args: string[]) => {
     seenArgs.push(args);
-    return JSON.stringify({ title: "T", body: "B", number: 1, url: "https://github.com/a/b/issues/1" });
+    return JSON.stringify({
+      title: "T",
+      body: "B",
+      number: 1,
+      url: "https://github.com/a/b/issues/1"
+    });
   };
 
   await fetchIssue("https://github.com/a/b/issues/1", { exec });
@@ -154,7 +159,9 @@ test("fetchIssue throws clear error when gh exits non-zero (private/inaccessible
         `expected message about non-zero exit, got: ${err.message}`
       );
       assert.ok(
-        err.message.includes("Could not resolve") || err.message.includes("access") || err.message.includes("correct"),
+        err.message.includes("Could not resolve") ||
+          err.message.includes("access") ||
+          err.message.includes("correct"),
         `expected detail about the failure, got: ${err.message}`
       );
       return true;

```

## Files touched

### .gitignore

```
node_modules/
dist/
.claude/logs/
.claude/state/
.claude/state/loop/paused.json
.claude/state/loop/stuck-detector.json
.claude.backup.*
*.tmp
.playwright-mcp/
.claude/worktrees/

```

### docs/halt-badges.md

```
# Halt-badge registry

**Owner:** loop plugin.
**Origin:** FEAT-063 / SLICE-60. Derives from SPEC-003 (halt-badge observability across plugin boundary).

## Purpose

The loop walker emits structured halt signals as fields under `snapshot.*` in the output of `node scripts/loop.mjs stop-check` and `node scripts/loop.mjs brief`. When any such field is non-null, the walker has detected a condition that warrants attention — either a hard halt or a soft signal the operator should resolve before rolling the next slice.

This file is the **single source of truth** for every halt-badge field loop emits. Downstream consumers (crew `brief-me` renderer, loop `--explain-halts` flag, schema regression tests) iterate this registry instead of hard-coding field names.

## Where halt-badges live in the JSON

```json
{
  "shouldStop": false,
  "reasons": [],
  "blockers": [],
  "suggestions": [],
  "iterationCapReached": false,
  "snapshot": {
    "...": "(other snapshot fields)",
    "sliceCostCeiling": null,
    "costRegression": null,
    "sessionDrift": null,
    "gradeTrend": null
  }
}
```

Each halt-badge is `null` when not triggered; populated with a structured object when it fires. Consumers MUST handle `null` as "not triggered, do not render."

## Registry

### `snapshot.costRegression`

**Shape:**

```ts
{
  triggered: true;
  currentUsd: number;
  medianUsd: number;
  thresholdUsd: number;
  multiplier: number;
  window: number;
  sampleCount: number;
}
```

**Meaning:** current slice spend exceeded `multiplier × median` of the rolling window of past cost reports.

**Fires when:** `currentUsd > thresholdUsd` AND aggregate cost reports exist AND `sampleCount > 0`.

**Suggested operator action:** review the runaway slice; either accept the trajectory and bump `loop.costRegressionMultiplier` in `.claude/loop.json`, or halt and investigate. Default multiplier is `3.0`, default window is `5` slices.

**Origin:** FEAT-055 / SLICE-52 / v0.12.0. Source: `src/scripts/lib/cost-regression.mts::checkCostRegression`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildRegressionSnapshotEntry`.

---

### `snapshot.sessionDrift`

**Shape:**

```ts
{
  triggered: true;
  sessionIdAtStart: string;
  sessionIdNow: string;
}
```

**Meaning:** the walker is running in a different Claude session than the one that opened the slice. Cross-session work fragments cache and hides cost in `many-sources` alerts.

**Fires when:** `workflow-state.currentRun.sessionId !== process.env.CLAUDE_SESSION_ID` AND both are present. Fail-open when either is missing.

**Suggested operator action:** complete the slice in the original session, OR pass `--allow-cross-session` to `node scripts/loop.mjs auto` to override. The override logs a `session-drift-override` event with a timestamp to `.claude/artifacts/loop/auto-dispatch.jsonl`. Each entry in `auto-dispatch.jsonl` carries a `stepType` discriminator (`"dispatch"` by default; `"session-drift-override"` for the walker's drift-override path) so consumers can distinguish dispatch events from non-dispatch events.

**Origin:** FEAT-056 / SLICE-54 / v0.14.0. Source: `src/scripts/lib/session-drift.mts::checkSessionDrift`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildSessionDriftSnapshotEntry`.

---

### `snapshot.sliceCostCeiling`

**Shape:**

```ts
{
  exceeded: true;
  actualUsd: number;
  ceilingUsd: number;
}
```

**Meaning:** current slice spend crossed the absolute USD ceiling configured for one slice. Distinct from `costRegression`: ceiling is a hard cap unrelated to the rolling median.

**Fires when:** `actualUsd > ceilingUsd`. Default ceiling is `$75` (see `DEFAULT_SLICE_COST_CEILING_USD` in `src/scripts/lib/slice-cost-ceiling.mts`); operator override via `loop.costSliceCeiling`.

**Suggested operator action:** investigate whether the slice scope is too broad. Either narrow the slice and re-open, or accept the cost and raise `loop.costSliceCeiling`.

**Origin:** pre-existing. Source: `src/scripts/lib/slice-cost-ceiling.mts::checkSliceCostCeiling`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildCeilingSnapshotEntry`.

---

### `snapshot.gradeTrend`

**Shape:**

```ts
{
  consecutiveBelow: number;
  threshold: number;
}
```

**Meaning:** last `consecutiveBelow` slice grades were below `threshold` average. Quality regression signal.

**Fires when:** rolling-window of last N grade averages are all below `threshold`. Configurable via `loop.gradeTrendThreshold` (default `0.8`) and `loop.gradeTrendConsecutiveLimit` (default `3`).

**Suggested operator action:** stop and review the slice template for the dimension that fell, or author a SPEC addressing the gap. Walker halts unless `autoMode` is on AND `score-trend` is listed in `loop.warnAlertCategoriesIgnoredInAutoMode` (default `['score-trend']`).

**Origin:** pre-existing. Source: `src/scripts/lib/grade-trend.mts::checkGradeTrend`.

---

### `snapshot.mergeFailed`

**Shape:**

```ts
{
  status: "failed";
  code: "VALIDATION_REQUIRED" | "VALIDATION_FAILED" | "FETCH_FAILED" | "REBASE_CONFLICT" | "MERGE_FAILED" | "PUSH_FAILED" | "BRANCH_MISSING" | "DIRTY_MAIN" | "WORKTREE_MISSING";
  slice: string;
  feature: string | null;
  attemptedBranch: string;
  attemptedWorktree: string;
  failedStep: "validation-gate" | "fetch" | "rebase" | "merge" | "push" | "preflight";
  note: string;
  markedAt: string;
}
```

**Meaning:** the auto-merge stage detected `validation_failed`, a rebase conflict, a merge error, or a push error. The worktree and slice branch are preserved for `/crew:fix` to resume.

**Fires when:** `runAutoMerge` throws `MergeError` AND `opts.dryRun === false`. NEVER set on `--dry-run` (zero-side-effect guarantee). NEVER set when `--no-merge` is passed or when no worktree is active (legacy slices).

**Suggested operator action:**
- `code: "REBASE_CONFLICT" | "MERGE_FAILED"`: run `/crew:fix` against the preserved worktree.
- `code: "PUSH_FAILED"`: run `git push origin main` manually — the commit is already on local main.
- `code: "VALIDATION_FAILED" | "VALIDATION_REQUIRED"`: open the validation artifact to see what failed, then re-run `/loop:slice complete`.

**Origin:** FEAT-062 / SLICE-64 / v0.23.0. Source: `src/scripts/lib/auto-merge.mts::runAutoMerge`. Also surfaced as `currentRun.gates.mergeFailed` in `workflow-state.json`.

---

### `snapshot.redundantReadStop`

**Shape:**

```ts
{
  triggered: true;
  maxReadCount: number;        // highest read_count across any session entry
  path: string;                // worst-offender file path
  sessionId: string;           // session file that holds the offending entry
  threshold: number;           // effective cap (default 5, override via config)
  offendingPathCount: number;  // total distinct paths over threshold
}
```

**Meaning:** the upstream `check-redundant-read` hook (hero-crew plugin) has recorded one or more files re-Read enough times to bust the prompt cache and waste tokens. Loop cannot modify the upstream hook; this gate is a loop-side surrogate that reads the hook's per-session state files and halts the autonomous walker before more redundant reads accumulate.

**Fires when:** any entry in `.claude/state/cost-hygiene/*.json` has `read_count > threshold`. Strict `>` (not `>=`), so the default cap of 5 trips at 6+ reads.

**Suggested operator action:** trust prior Read results; avoid re-reading unchanged paths. Tune `loop.redundantReadCap` in `.claude/loop.json` to relax the gate.

**Feature toggle (FEAT-170 / SLICE-87):** this gate is guarded by the `featuresService`. Set the top-level `features` block in `.claude/loop.json` to disable it cleanly instead of inflating the cap:

```json
{ "features": { "redundant-read-stop": { "enabled": false } } }
```

When disabled, `checkRedundantReadStop` short-circuits to `null` regardless of `redundantReadCap`. Policy is **default-ON** — a missing/malformed `features` entry keeps the gate active. Source: `src/scripts/lib/features-service.mts::isEnabled`.

**Origin:** FEAT-057 / SLICE-67 / v0.25.0. Source: `src/scripts/lib/redundant-read-detector.mts::checkRedundantReadStop`. Companion to the still-pending upstream-request `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`.

---

### `snapshot.marathonCheckpoint`

**Shape:**

```ts
{
  level: "warn" | "hard";          // warn = advisory, hard = stop
  closesSinceCheckpoint: number;   // grade files written after the newest retro
  every: number;                   // configured threshold (default 4)
  hardThreshold: number;           // 2 × every
  lastRetroPath: string | null;    // absolute path of the newest retrospective
}
```

**Meaning:** the autonomous loop has shipped many slices in a row without pausing for a retrospective. Adopts the AgentOps coherent-arc rule — 2-4 atomic arcs per autonomous session, post-mortem mandatory at >=5 — so long backlog walks cannot accumulate unobserved drift.

**Fires when:** the number of grade files (`*-grade.md` under `gradesRoot`, default `.claude/artifacts/loop/grades/`) with `mtime` newer than the newest retrospective file (under `retroRoot`, default `.claude/artifacts/loop/retrospectives/`) reaches `every` (warn) or `2 × every` (hard). When no retrospective exists, the anchor is the unix epoch, so every grade counts.

**Suggested operator action:** run `/loop:retrospective` to capture lessons + decisions. The walker resumes once a fresh retrospective file lands under `retroRoot`. Tune `loop.marathonCheckpointEvery` in `.claude/loop.json` to widen the window for marathon-style sessions; values <= 0 or non-integer fall back to the default rather than disabling.

**Origin:** FEAT-181 / SLICE-92 / v0.40.0. Source: `src/scripts/lib/marathon-checkpoint.mts::checkMarathonCheckpoint`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildMarathonCheckpointSnapshotEntry`.

---

### `snapshot.pausedForExternalEvent`

**Shape:**

```ts
{
  triggered: true;
  reason: string;      // operator-supplied description of the external wait
  resumeHint: string;  // human-readable resume instruction
  pausedAt: string;    // ISO-8601 timestamp written by the pause subcommand
}
```

**Meaning:** an operator has explicitly suspended the autonomous loop to wait for an external event (CI run, PR review, deploy gate, manual approval, etc.). The walker stops immediately; no slice is promoted until the operator removes the pause.

**Fires when:** `.claude/state/loop/paused.json` exists, is valid JSON, and contains `triggered: true`. Fail-open on file-absent, malformed JSON, or missing `triggered` field — none of those cases halt the walker.

**Suggested operator action:** once the external event has resolved, run:

```
bun src/scripts/loop.mts resume --repo <path>
```

This deletes `.claude/state/loop/paused.json`; the next `stop-check` returns `shouldStop: false` (assuming no other conditions are active) and the walker resumes from the current backlog state. No checkpoint replay is needed — slice artifacts ARE the state.

**Origin:** FEAT-128 / SLICE-118. Source: `src/scripts/lib/paused-for-external-event.mts::checkPausedForExternalEvent`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildPausedForExternalEventSnapshotEntry`.

---

### `snapshot.stuckDetected`

**Shape:**

```typescript
interface StuckDetectedSignal {
  sliceId: string;       // slice that has exceeded retry threshold
  attempts: number;      // number of builder attempts without a PASS gate
  threshold: number;     // configured threshold (loop.stuckDetectorThreshold, default 3)
  lastAttemptAt: string; // ISO 8601 timestamp of most recent stuck-tick call
}
```

**Meaning** — The builder has been re-dispatched `attempts` times for `sliceId` without producing a PASS on the review or validation gate. The loop halts to prevent silent cost accumulation.

**Fires when** — `.claude/state/loop/stuck-detector.json` exists AND `attempts >= loop.stuckDetectorThreshold` (default 3). Fail-open: absent file, malformed JSON, or missing required fields return `null`.

**Suggested operator action** — Investigate builder failures. Once root cause is fixed (or slice is narrowed/deferred), run:

```
bun src/scripts/loop.mts stuck-reset --repo <path>
```

This deletes `.claude/state/loop/stuck-detector.json`; the next `stop-check` returns `shouldStop: false` (assuming no other conditions are active) and the walker resumes.

**Origin** — FEAT-130 / SLICE-119. Source: `src/scripts/lib/stuck-detector.mts::checkStuckDetector`. Snapshot builder: `src/scripts/lib/stop-conditions.mts::buildStuckDetectedSnapshotEntry`.

---

## How to add a new halt-badge

When a future FEAT introduces a new halt condition that emits to `snapshot.*`, the FEAT's slice MUST update this registry in the same slice. Don't ship the halt field without documenting it here.

Checklist:

1. **Pick a field name** — camelCase, descriptive, lives directly under `snapshot.*`. Match the naming convention of existing entries.
2. **Define the shape** — TypeScript-style. Include a `triggered: true` or equivalent boolean as the first field if the badge represents a binary fire/no-fire condition.
3. **Update `src/scripts/lib/stop-conditions.mts`** — add a `buildXxxSnapshotEntry` helper that returns `null` when the signal is null, populated object when triggered. Wire it into `assembleStopResult`.
4. **Update this registry** — add a new `### snapshot.xxx` section following the same template as the existing entries (Shape, Meaning, Fires when, Suggested action, Origin).
5. **Update the reasons array** — `stop-conditions.mts` should also push a human-readable reason string when the badge fires (e.g. `"cost_regression_stop: current $X > median $Y × Z"`).
6. **Add tests** — at minimum, a unit test that asserts the snapshot entry is `null` when signal is null and populated when triggered.
7. **Update CHANGELOG.md** — note the new badge field under the FEAT's release entry.

When FEAT-066 (schema regression test) lands, this registry becomes the source-of-truth that the test diffs against. Adding a new badge field without updating the registry will fail the test.

## References

- SPEC-003 — halt-badge observability cross-plugin SLO
- FEAT-064 (upstream-request to hero-crew) — crew `brief-me` renders Blocked/Missing using this registry
- FEAT-065 — loop `brief --explain-halts` flag uses this registry to render human-readable summaries
- FEAT-066 — schema regression test diffs the actual snapshot against the documented shapes

```

### src/scripts/lib/halt-badges.mts

```
// Halt-badge registry + renderers (FEAT-065 / SLICE-61).
// Single source of truth for `--explain-halts` rendering. Mirrors the
// documentation in docs/halt-badges.md (FEAT-063). Unknown future fields
// degrade gracefully — the iterator only renders fields it knows about.

export interface HaltBadgeRenderer {
  /** snapshot field name, e.g. "costRegression" */
  field: string;
  /** human-readable gate name for the rendered block heading */
  gateName: string;
  /** Returns the body lines when the badge is non-null; empty array when null. */
  render: (entry: any) => string[];
}

function renderCostRegression(e: any): string[] {
  if (!e) return [];
  return [
    `- Current spend: $${e.currentUsd?.toFixed?.(2) ?? e.currentUsd}`,
    `- Rolling median: $${e.medianUsd?.toFixed?.(2) ?? e.medianUsd} × multiplier ${e.multiplier} = threshold $${e.thresholdUsd?.toFixed?.(2) ?? e.thresholdUsd}`,
    `- Window: last ${e.window} reports (sampleCount ${e.sampleCount})`,
    `- Suggested action: review the runaway slice; either accept the trajectory and bump \`loop.costRegressionMultiplier\` in \`.claude/loop.json\`, or halt and investigate.`
  ];
}

function renderSessionDrift(e: any): string[] {
  if (!e) return [];
  return [
    `- Session at slice-start: ${e.sessionIdAtStart}`,
    `- Current session: ${e.sessionIdNow}`,
    `- Suggested action: complete the slice in the original session, OR pass \`--allow-cross-session\` to \`bun src/scripts/loop.mts auto\` to override. Override logs a timestamped \`session-drift-override\` event to \`.claude/artifacts/loop/auto-dispatch.jsonl\`.`
  ];
}

function renderSliceCostCeiling(e: any): string[] {
  if (!e) return [];
  return [
    `- Actual spend: $${e.actualUsd?.toFixed?.(2) ?? e.actualUsd}`,
    `- Configured ceiling: $${e.ceilingUsd?.toFixed?.(2) ?? e.ceilingUsd}`,
    `- Suggested action: investigate whether the slice scope is too broad. Either narrow the slice and re-open, or accept the cost and raise \`loop.costSliceCeiling\` in \`.claude/loop.json\`.`
  ];
}

function renderGradeTrend(e: any): string[] {
  if (!e) return [];
  return [
    `- Consecutive slices below threshold: ${e.consecutiveBelow}`,
    `- Threshold: ${e.threshold}`,
    `- Suggested action: stop and review the slice template for the dimension that fell, or author a SPEC addressing the gap. Walker halts unless \`autoMode\` is on AND the category appears in \`loop.warnAlertCategoriesIgnoredInAutoMode\`.`
  ];
}

function renderMergeFailed(e: any): string[] {
  if (!e) return [];
  const fixHint =
    e.code === "PUSH_FAILED"
      ? `Run \`git push origin main\` manually — the commit is on local main.`
      : `Run \`/crew:fix\` against worktree \`${e.attemptedWorktree}\` to resume.`;
  return [
    `- Slice: ${e.slice}${e.feature ? ` / ${e.feature}` : ""}`,
    `- Failed step: ${e.failedStep} (code ${e.code})`,
    `- Branch: \`${e.attemptedBranch}\``,
    `- Worktree: \`${e.attemptedWorktree}\``,
    `- Suggested action: ${fixHint}`
  ];
}

function renderRedundantReadStop(e: any): string[] {
  if (!e) return [];
  return [
    `- Worst-offender path: \`${e.path}\``,
    `- Reads counted: ${e.maxReadCount} (threshold ${e.threshold})`,
    `- Session: ${e.sessionId}`,
    `- Total offending paths: ${e.offendingPathCount}`,
    `- Suggested action: trust prior Read; tune \`loop.redundantReadCap\` in \`.claude/loop.json\` to adjust the gate.`
  ];
}

function renderMarathonCheckpoint(e: any): string[] {
  if (!e) return [];
  return [
    `- Level: ${e.level} (warn = advisory, hard = stop)`,
    `- Slices closed since last retrospective: ${e.closesSinceCheckpoint}`,
    `- Configured threshold: \`marathonCheckpointEvery\` = ${e.every} (hard at ${e.hardThreshold})`,
    `- Last retrospective: ${e.lastRetroPath ? `\`${e.lastRetroPath}\`` : "none"}`,
    `- Suggested action: run \`/loop:retrospective\` to capture lessons. The walker resumes the next slice once a fresh retrospective lands under \`.claude/artifacts/loop/retrospectives/\`.`
  ];
}

function renderPausedForExternalEvent(e: any): string[] {
  if (!e) return [];
  return [
    `- Reason: ${e.reason}`,
    `- Paused at: ${e.pausedAt}`,
    `- Resume hint: ${e.resumeHint}`,
    `- Suggested action: run \`bun src/scripts/loop.mts resume --repo .\` once the external event has resolved. The walker resumes from the current backlog state — no checkpoint replay needed.`
  ];
}

function renderStuckDetected(e: any): string[] {
  if (!e) return [];
  return [
    `- Slice: ${e.sliceId}`,
    `- Builder attempts without PASS: ${e.attempts} (threshold ${e.threshold})`,
    `- Last attempt at: ${e.lastAttemptAt}`,
    `- Suggested action: run \`bun src/scripts/loop.mts stuck-reset\` to clear the counter, then investigate builder failures. Consider narrowing scope or fixing the root cause before re-dispatching.`
  ];
}

/** Registry — order determines render order in the explain output. */
export const HALT_BADGES: HaltBadgeRenderer[] = [
  { field: "costRegression", gateName: "Cost regression", render: renderCostRegression },
  { field: "sessionDrift", gateName: "Session drift", render: renderSessionDrift },
  { field: "sliceCostCeiling", gateName: "Slice cost ceiling", render: renderSliceCostCeiling },
  { field: "gradeTrend", gateName: "Grade trend", render: renderGradeTrend },
  { field: "mergeFailed", gateName: "Merge failed", render: renderMergeFailed },
  {
    field: "redundantReadStop",
    gateName: "Redundant read stop",
    render: renderRedundantReadStop
  },
  {
    field: "marathonCheckpoint",
    gateName: "Marathon checkpoint",
    render: renderMarathonCheckpoint
  },
  {
    field: "pausedForExternalEvent",
    gateName: "Paused for external event",
    render: renderPausedForExternalEvent
  },
  { field: "stuckDetected", gateName: "Stuck detector", render: renderStuckDetected }
];

/**
 * Build the `## Halt summary` markdown block from a brief object's snapshot.
 *
 * Looks for halt-badge fields at TWO locations:
 *   1. brief.snapshot.{costRegression, sessionDrift, sliceCostCeiling, gradeTrend}
 *      (when called against stop-check output shape)
 *   2. brief.{costRegression, sessionDrift, sliceCostCeiling, gradeTrend}
 *      (when called against `bun src/scripts/loop.mts brief` output shape — loop's
 *      own brief currently surfaces costRegression + sessionDrift at top level)
 *
 * When both exist, the snapshot.* form wins.
 *
 * Returns the full block including the `## Halt summary` heading and trailing newline.
 */
export function explainHalts(brief: any): string {
  const lines: string[] = ["## Halt summary", ""];
  const snapshot = brief?.snapshot ?? {};
  let firedCount = 0;
  for (const badge of HALT_BADGES) {
    const entry = snapshot[badge.field] ?? brief?.[badge.field] ?? null;
    if (!entry) continue;
    firedCount++;
    lines.push(`### ${badge.gateName} (\`${badge.field}\`)`, "");
    lines.push(...badge.render(entry));
    lines.push("");
  }
  if (firedCount === 0) {
    lines.push("No halts active.", "");
  }
  return lines.join("\n");
}

```

### src/scripts/lib/stop-conditions.mts

```
import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { countHighSeverityCostAlerts } from "./cost-alert-loader.mjs";
import { readCrewBlockingGates, readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { checkGradeTrend } from "./grade-trend.mjs";
import { checkSliceCostCeiling, type SliceCostCeilingSignal } from "./slice-cost-ceiling.mjs";
import { checkCostRegression, type CostRegressionSignal } from "./cost-regression.mjs";
import { checkSessionDrift, type SessionDriftSignal } from "./session-drift.mjs";
import { checkRedundantReadStop, type RedundantReadSignal } from "./redundant-read-detector.mjs";
import { checkMarathonCheckpoint, type MarathonCheckpointSignal } from "./marathon-checkpoint.mjs";
import {
  checkPausedForExternalEvent,
  type PausedForExternalEventSignal
} from "./paused-for-external-event.mjs";
import { checkStuckDetector, type StuckDetectedSignal } from "./stuck-detector.mjs";

// Unified stop-condition resolver. Returns a structured verdict:
//   { shouldStop, reasons, blockers, suggestions, iterationCapReached }
// Used by Cross-Slice Continuation HARD RULE (and crew brief) to decide
// whether to roll the next slice or stop the autonomous loop.
//
// Stop conditions (any one triggers shouldStop=true):
//   A. Backlog empty AND no approved-undecomposed specs
//      (Every spec satisfied or in flight → genuine no-work state)
//   B. Severity-warn pattern alerts present (e.g. score-trend regression,
//      in-progress orphan, decomposition explosion)
//      (Bad signal — address before continuing rather than charging ahead)
//   C. Iteration cap reached (legacy mode only — disabled when autoMode)
//      (Runaway halting — loop has completed maxIterations without finishing)
//   D. High-severity cost-advisor alerts fired (cost-alert-high)
//      (Cost is spiraling — halt gracefully and let user review trajectory)
//   E. Crew run blocked or escalated. Escalation always halts; the soft
//      blocked-badge branch is disabled when autoMode (it usually clears
//      on the next iteration).
//
// Auto mode (config.loop.autoMode, default true): loop walks the entire
// backlog. Iteration cap and crew blocked-badge become advisory only —
// counter still increments and snapshot still reports them. Set
// autoMode=false to restore the original five-condition gating.
// config.loop.marathonMode is a deprecated alias accepted for back-compat.
//
// Caller decides what to do with a stop signal:
//   - In autonomous mode: log + halt + ping user
//   - In hand-driven mode: surface in brief
//   - In phase-gate: include in retrospective + handoff

function computeBacklogStats(backlog: any[], specs: any[]) {
  const pendingOrTriaged =
    filterBacklog(backlog, { status: "pending" }).length +
    filterBacklog(backlog, { status: "triaged" }).length;
  const inProgress = filterBacklog(backlog, { status: "in-progress" }).length;
  const approvedUndecomposed = specs.filter(
    (s: Record<string, any>) =>
      s.frontmatter.status === "approved" &&
      (!Array.isArray(s.frontmatter.derived_features) ||
        s.frontmatter.derived_features.length === 0)
  ).length;
  return { pendingOrTriaged, inProgress, approvedUndecomposed };
}

function appendBacklogExhaustedSignals(
  stats: Record<string, number>,
  reasons: string[],
  suggestions: string[]
) {
  if (stats.pendingOrTriaged === 0 && stats.inProgress === 0 && stats.approvedUndecomposed === 0) {
    reasons.push("backlog empty + no undecomposed specs → no actionable work");
    suggestions.push(
      "Author a new SPEC or FEAT to continue. Run `/loop:spec add` or `/loop:backlog add`."
    );
  }
}

// Folds warn-severity pattern-alerts into blockers + a single reason line.
// When autoMode===true and alert.category appears in ignoredCategories, the
// alert is pushed to suggestions instead of blockers and does NOT halt the loop.
// options.demotedCount.value is incremented for each demoted alert.
export function applyWarnAlertSignals(
  warnAlerts: any[],
  blockers: any[],
  reasons: any[],
  options: {
    autoMode?: boolean;
    ignoredCategories?: string[];
    suggestions?: any[];
    demotedCount?: { value: number };
  } = {}
) {
  if (warnAlerts.length === 0) return;
  const { autoMode = false, ignoredCategories = [], suggestions, demotedCount } = options;
  const haltAlerts: any[] = [];
  for (const a of warnAlerts) {
    if (autoMode && ignoredCategories.includes(a.category)) {
      suggestions?.push(a.suggested_action || a.message);
      if (demotedCount) demotedCount.value += 1;
    } else {
      haltAlerts.push(a);
    }
  }
  if (haltAlerts.length === 0) return;
  for (const a of haltAlerts) {
    blockers.push({ category: a.category, message: a.message, suggestion: a.suggested_action });
  }
  reasons.push(`${haltAlerts.length} warn-severity alert(s) — resolve before rolling next slice`);
}

function applyIterationCapSignals(
  iterStatus: Record<string, any>,
  reasons: string[],
  suggestions: string[],
  { autoMode }: { autoMode: boolean }
) {
  if (!iterStatus.exhausted || autoMode) return;
  reasons.push(`iteration cap reached (${iterStatus.count}/${iterStatus.cap})`);
  suggestions.push(
    `The autonomous loop has completed ${iterStatus.count} iterations without finishing. ` +
      `This is a safety limit to prevent unbounded token burn. ` +
      `Increase loop.maxIterations in .claude/loop.json if you need more cycles.`
  );
}

function applyCostAlertSignal(
  costAlertCount: number,
  config: Record<string, any> | null,
  reasons: string[],
  suggestions: string[]
) {
  if (costAlertCount < (config?.loop?.costStopThreshold || 1)) return;
  reasons.push(
    `cost_alert_high: ${costAlertCount} high-severity cost recommendation(s) across last 3 slices`
  );
  suggestions.push(
    "The cost trajectory has triggered a high-severity alert. Review the cost-advisor output and optimize before continuing. " +
      "Adjust loop.costStopThreshold in .claude/loop.json to change this behavior."
  );
}

function buildCeilingSnapshotEntry(sig: SliceCostCeilingSignal | null) {
  if (!sig) return null;
  return { exceeded: true, actualUsd: sig.actualUsd, ceilingUsd: sig.ceilingUsd };
}

function buildRegressionSnapshotEntry(sig: CostRegressionSignal | null) {
  if (!sig) return null;
  return {
    triggered: true,
    currentUsd: sig.currentUsd,
    medianUsd: sig.medianUsd,
    thresholdUsd: sig.thresholdUsd,
    multiplier: sig.multiplier,
    window: sig.window,
    sampleCount: sig.sampleCount
  };
}

function buildSessionDriftSnapshotEntry(sig: SessionDriftSignal | null) {
  if (!sig) return null;
  return {
    triggered: true,
    sessionIdAtStart: sig.sessionIdAtStart,
    sessionIdNow: sig.sessionIdNow
  };
}

/** Build the snapshot entry for the merge_failed halt-badge (FEAT-062 / SLICE-64). */
export function buildMergeFailedSnapshotEntry(workflowState: any): any | null {
  const badge = workflowState?.currentRun?.gates?.mergeFailed;
  if (!badge || badge.status !== "failed") return null;
  return badge;
}

function buildRedundantReadSnapshotEntry(sig: RedundantReadSignal | null) {
  if (!sig) return null;
  return {
    triggered: true,
    maxReadCount: sig.maxReadCount,
    path: sig.path,
    sessionId: sig.sessionId,
    threshold: sig.threshold,
    offendingPathCount: sig.offendingPathCount
  };
}

function applySessionDriftSignal(
  driftSignal: SessionDriftSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!driftSignal) return;
  const { sessionIdAtStart, sessionIdNow } = driftSignal;
  reasons.push(
    `session_drift_stop: current session ${sessionIdNow} differs from slice-start session ${sessionIdAtStart}`
  );
  blockers.push({
    category: "session-drift",
    message: `walker resumed in a different Claude session (was: ${sessionIdAtStart}, now: ${sessionIdNow})`,
    suggestion:
      "Complete the slice in the original session, or re-run with --allow-cross-session to bypass the halt and log the override."
  });
  suggestions.push(
    `The walker pinned session ${sessionIdAtStart} at slice-start but resumed in session ${sessionIdNow}. ` +
      "Complete the slice in the original session, or pass --allow-cross-session on the auto CLI to override."
  );
}

function buildMarathonCheckpointSnapshotEntry(sig: MarathonCheckpointSignal | null) {
  if (!sig) return null;
  return {
    level: sig.level,
    closesSinceCheckpoint: sig.closesSinceCheckpoint,
    every: sig.every,
    hardThreshold: sig.hardThreshold,
    lastRetroPath: sig.lastRetroPath
  };
}

export function buildPausedForExternalEventSnapshotEntry(
  sig: PausedForExternalEventSignal | null
): PausedForExternalEventSignal | null {
  if (!sig) return null;
  return sig;
}

function applyPausedForExternalEventSignal(
  sig: PausedForExternalEventSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  reasons.push(`paused_for_external_event: ${sig.reason} (paused at ${sig.pausedAt})`);
  blockers.push({
    category: "paused-for-external-event",
    message: `loop paused by operator: ${sig.reason} (since ${sig.pausedAt})`,
    suggestion: "Run: bun src/scripts/loop.mts resume --repo ."
  });
  suggestions.push(sig.resumeHint);
}

function buildStuckDetectedSnapshotEntry(
  sig: StuckDetectedSignal | null
): StuckDetectedSignal | null {
  if (!sig) return null;
  return sig;
}

function applyStuckDetectedSignal(
  sig: StuckDetectedSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  reasons.push(
    `stuck_detected: ${sig.sliceId} builder attempted ${sig.attempts} times without PASS (threshold ${sig.threshold})`
  );
  blockers.push({
    category: "stuck-detected",
    message: `Builder retried ${sig.attempts} times without PASS for slice ${sig.sliceId}`,
    suggestion: "Run: bun src/scripts/loop.mts stuck-reset"
  });
  suggestions.push(
    `Builder has retried ${sig.attempts} times without PASS for slice ${sig.sliceId} (threshold ${sig.threshold}). ` +
      "Investigate root cause before re-dispatching. Run: bun src/scripts/loop.mts stuck-reset --repo . to clear the counter."
  );
}

function applyMarathonCheckpointSignal(
  sig: MarathonCheckpointSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  const due = `${sig.closesSinceCheckpoint} slice(s) closed since the last retrospective`;
  const cmd = "Run `/loop:retrospective` to capture lessons before continuing.";
  if (sig.level === "warn") {
    suggestions.push(
      `marathon_checkpoint_due: ${due} (advisory at >=${sig.every}, hard stop at >=${sig.hardThreshold}). ${cmd}`
    );
    return;
  }
  reasons.push(
    `marathon_checkpoint_required: ${due} (hard threshold ${sig.hardThreshold}) — checkpoint mandatory before next slice`
  );
  blockers.push({
    category: "marathon-checkpoint",
    message: `${due}; hard threshold ${sig.hardThreshold} reached. Drift accumulates beyond this point.`,
    suggestion: cmd
  });
  suggestions.push(cmd);
}

function applyRedundantReadStopSignal(
  sig: RedundantReadSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!sig) return;
  const { maxReadCount, path: filePath, threshold, sessionId, offendingPathCount } = sig;
  reasons.push(
    `redundant_read_stop: path \`${filePath}\` re-read ${maxReadCount} times (cap ${threshold}, ${offendingPathCount} offending path${offendingPathCount === 1 ? "" : "s"} in session ${sessionId})`
  );
  blockers.push({
    category: "redundant-read-stop",
    message: `file \`${filePath}\` was Read ${maxReadCount} times in session ${sessionId} (cap ${threshold}). Cumulative redundant reads waste tokens and bust the prompt cache.`,
    suggestion:
      "Trust prior Read results; avoid re-reading unchanged paths. Tune the cap via loop.redundantReadCap in .claude/loop.json if the threshold is too aggressive."
  });
  suggestions.push(
    `Redundant Read detected: \`${filePath}\` read ${maxReadCount} times (cap ${threshold}). ` +
      "Use prior content; raise loop.redundantReadCap in .claude/loop.json to relax the gate."
  );
}

function applyCostRegressionSignal(
  regressionSignal: CostRegressionSignal | null,
  reasons: any[],
  suggestions: any[],
  blockers: any[]
) {
  if (!regressionSignal) return;
  const current = regressionSignal.currentUsd.toFixed(2);
  const median = regressionSignal.medianUsd.toFixed(2);
  const threshold = regressionSignal.thresholdUsd.toFixed(2);
  const { multiplier, window: w, sampleCount } = regressionSignal;
  reasons.push(
    `cost_regression_stop: current $${current} > median $${median} × ${multiplier}` +
      ` (threshold $${threshold}, window ${w}, sample ${sampleCount})`
  );
  blockers.push({
    category: "cost-regression",
    message:
      `aggregate spend $${current} exceeded rolling-median threshold $${threshold}` +
      ` (median $${median} × ${multiplier}, sample ${sampleCount})`,
    suggestion:
      "Review the latest aggregate cost report and address inefficiencies before resuming. " +
      "Adjust loop.costRegressionMultiplier or loop.costRegressionWindow in .claude/loop.json to change this behavior."
  });
  suggestions.push(
    `Current aggregate spend $${current} is more than ${multiplier}× the rolling median $${median}` +
      ` (threshold $${threshold}). Inspect .claude/artifacts/crew/cost/ for opus-overuse / cache-busted findings. ` +
      "Adjust loop.costRegressionMultiplier or loop.costRegressionWindow in .claude/loop.json to change this behavior."
  );
}

function applySliceCostCeilingSignal(
  ceilingSignal: SliceCostCeilingSignal | null,
  reasons: string[],
  suggestions: string[],
  blockers: Array<Record<string, string>>
) {
  if (!ceilingSignal) return;
  const actual = ceilingSignal.actualUsd.toFixed(2);
  const ceiling = ceilingSignal.ceilingUsd;
  reasons.push(`[HIGH] slice-cost-ceiling:exceeded (actual: $${actual}, ceiling: $${ceiling})`);
  blockers.push({
    category: "slice-cost-ceiling",
    message: `latest slice spend $${actual} exceeded ceiling $${ceiling}`,
    suggestion:
      "Review the latest cost report under .claude/artifacts/crew/cost/, address opus-overuse / cache-busted findings, then adjust loop.costSliceCeiling in .claude/loop.json if the new floor is intentional."
  });
  suggestions.push(
    `Latest slice cost $${actual} exceeded loop.costSliceCeiling ($${ceiling}). ` +
      "Inspect the cost report (referenced under .claude/artifacts/crew/cost/) for opus-overuse / cache-busted findings before rolling the next slice. " +
      "Adjust loop.costSliceCeiling in .claude/loop.json to change this behavior."
  );
}

function applyGradeTrendSignal(
  gradeTrendSignal: Record<string, any> | null,
  reasons: string[],
  suggestions: string[]
) {
  if (!gradeTrendSignal) return;
  reasons.push(gradeTrendSignal.reason);
  suggestions.push(
    `Grade trend below threshold (${gradeTrendSignal.threshold}) for ${gradeTrendSignal.consecutiveBelow} consecutive slice(s). ` +
      "Review recent slice grades before resuming the autonomous loop. " +
      "Adjust loop.gradeTrendThreshold or loop.gradeTrendConsecutiveLimit in .claude/loop.json to change this behavior."
  );
}

function appendCrewGateSignals(
  crewGates: Record<string, any>,
  reasons: string[],
  suggestions: string[],
  { autoMode }: { autoMode: boolean }
) {
  if (crewGates.escalated) {
    reasons.push(
      `crew run escalated_to_human: ${crewGates.escalated.note || "(no note)"} — hard stop`
    );
    suggestions.push(
      "The crew workflow has been escalated to a human. Resolve the escalation and clear the badge before resuming the loop."
    );
  } else if (crewGates.blocked && !autoMode) {
    reasons.push(
      `crew run blocked: ${crewGates.blocked.note || "(no note)"}` +
        (crewGates.blocked.blockedBy ? ` (blockedBy ${crewGates.blocked.blockedBy})` : "")
    );
    suggestions.push(
      "The crew workflow is blocked. Unblock the run (clear the badge or write the missing artifact) before continuing."
    );
  }
}

async function gatherStopInputs(repoPath: string, config: Record<string, any> | null) {
  const [
    backlog,
    specs,
    alerts,
    costAlertCount,
    crewGates,
    gradeTrendSignal,
    costCeilingSignal,
    costRegressionSignal,
    sessionDriftSignal,
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  ] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    detectPatterns(repoPath, { config }),
    countHighSeverityCostAlerts(repoPath, 3),
    readCrewBlockingGates(repoPath),
    checkGradeTrend(repoPath, config),
    checkSliceCostCeiling(repoPath, config),
    checkCostRegression(repoPath, config),
    checkSessionDrift(repoPath),
    checkRedundantReadStop(repoPath, config),
    checkMarathonCheckpoint(repoPath, config),
    readCrewWorkflowState(repoPath),
    checkPausedForExternalEvent(repoPath),
    checkStuckDetector(repoPath)
  ]);
  return {
    backlog,
    specs,
    alerts,
    costAlertCount,
    crewGates,
    gradeTrendSignal,
    costCeilingSignal,
    costRegressionSignal,
    sessionDriftSignal,
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  };
}

// eslint-disable-next-line complexity -- pipeline orchestrator; complexity inflated by config nullish-chaining and apply* calls, but actual branching is linear. Track as follow-up to consolidate apply* calls into a single resolver.
export async function checkStopConditions(
  repoPath: string,
  { config = null, ignoreAlerts = false }: Record<string, any> = {}
) {
  const {
    backlog,
    specs,
    alerts,
    costAlertCount,
    crewGates,
    gradeTrendSignal,
    costCeilingSignal,
    costRegressionSignal,
    sessionDriftSignal,
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  } = await gatherStopInputs(repoPath, config);

  // autoMode defaults to true so freshly hand-rolled .claude/loop.json
  // (without the key) get the new behavior. Presets ship the key explicitly
  // for documentation, but the default here is the source of truth.
  // config.loop.marathonMode is a deprecated alias; autoMode wins if both set.
  const autoMode = config?.loop?.autoMode ?? config?.loop?.marathonMode ?? true;

  const reasons: any[] = [];
  const blockers: any[] = [];
  const suggestions: any[] = [];
  let iterationCapReached = false;
  appendCrewGateSignals(crewGates, reasons, suggestions, { autoMode });

  const backlogStats = computeBacklogStats(backlog, specs);
  appendBacklogExhaustedSignals(backlogStats, reasons, suggestions);

  const warnAlerts = ignoreAlerts ? [] : alerts.filter((a) => a.severity === "warn");
  const ignoredCategories: string[] = config?.loop?.warnAlertCategoriesIgnoredInAutoMode ?? [
    "score-trend"
  ];
  const warnDemotedCount = { value: 0 };
  applyWarnAlertSignals(warnAlerts, blockers, reasons, {
    autoMode,
    ignoredCategories,
    suggestions,
    demotedCount: warnDemotedCount
  });

  const iterStatus = await getIterationStatus(repoPath, config?.loop?.maxIterations || 25);
  iterationCapReached = iterStatus.exhausted;
  applyIterationCapSignals(iterStatus, reasons, suggestions, { autoMode });
  applyCostAlertSignal(costAlertCount, config, reasons, suggestions);
  applySliceCostCeilingSignal(costCeilingSignal, reasons, suggestions, blockers);
  applyCostRegressionSignal(costRegressionSignal, reasons, suggestions, blockers);
  applySessionDriftSignal(sessionDriftSignal, reasons, suggestions, blockers);
  applyRedundantReadStopSignal(redundantReadSignal, reasons, suggestions, blockers);
  applyMarathonCheckpointSignal(marathonCheckpointSignal, reasons, suggestions, blockers);
  applyPausedForExternalEventSignal(pausedForExternalEventSignal, reasons, suggestions, blockers);
  applyStuckDetectedSignal(stuckDetectedSignal, reasons, suggestions, blockers);
  applyGradeTrendSignal(gradeTrendSignal, reasons, suggestions);

  return assembleStopResult({
    reasons,
    blockers,
    suggestions,
    iterationCapReached,
    backlogStats,
    alerts,
    warnAlerts,
    warnDemotedCount: warnDemotedCount.value,
    iterStatus,
    costAlertCount,
    crewGates,
    autoMode,
    gradeTrendSignal,
    costCeilingSignal,
    costRegressionSignal,
    sessionDriftSignal,
    redundantReadSignal,
    marathonCheckpointSignal,
    workflowState,
    pausedForExternalEventSignal,
    stuckDetectedSignal
  });
}

// Assemble the stop-check return shape. Extracted so checkStopConditions stays
// under the cyclomatic-complexity cap after FEAT-059 added autoMode + warn-alert
// demotion branches.
function assembleStopResult(p: any) {
  const checkpointDue =
    p.marathonCheckpointSignal !== null && p.marathonCheckpointSignal !== undefined;
  const sliceClosesSinceCheckpoint = p.marathonCheckpointSignal?.closesSinceCheckpoint ?? null;
  return {
    shouldStop: p.reasons.length > 0,
    reasons: p.reasons,
    blockers: p.blockers,
    suggestions: p.suggestions,
    iterationCapReached: p.iterationCapReached,
    checkpointDue,
    sliceClosesSinceCheckpoint,
    snapshot: {
      pendingOrTriaged: p.backlogStats.pendingOrTriaged,
      inProgress: p.backlogStats.inProgress,
      approvedUndecomposed: p.backlogStats.approvedUndecomposed,
      totalAlerts: p.alerts.length,
      warnAlerts: p.warnAlerts.length,
      warnAlertsDemoted: p.warnDemotedCount,
      iterationCount: p.iterStatus.count,
      iterationCap: p.iterStatus.cap,
      costAlerts: p.costAlertCount,
      crewBlocked: Boolean(p.crewGates.blocked),
      crewEscalated: Boolean(p.crewGates.escalated),
      autoMode: p.autoMode,
      marathonMode: p.autoMode,
      gradeTrend: p.gradeTrendSignal
        ? {
            consecutiveBelow: p.gradeTrendSignal.consecutiveBelow,
            threshold: p.gradeTrendSignal.threshold
          }
        : null,
      sliceCostCeiling: buildCeilingSnapshotEntry(p.costCeilingSignal),
      costRegression: buildRegressionSnapshotEntry(p.costRegressionSignal),
      sessionDrift: buildSessionDriftSnapshotEntry(p.sessionDriftSignal),
      mergeFailed: buildMergeFailedSnapshotEntry(p.workflowState),
      redundantReadStop: buildRedundantReadSnapshotEntry(p.redundantReadSignal),
      marathonCheckpoint: buildMarathonCheckpointSnapshotEntry(p.marathonCheckpointSignal),
      pausedForExternalEvent: buildPausedForExternalEventSnapshotEntry(
        p.pausedForExternalEventSignal
      ),
      stuckDetected: buildStuckDetectedSnapshotEntry(p.stuckDetectedSignal)
    }
  };
}

```

### src/scripts/lib/stuck-detector.mts

```
import fs from "node:fs/promises";
import path from "node:path";

export interface StuckDetectedSignal {
  sliceId: string;
  attempts: number;
  threshold: number;
  lastAttemptAt: string;
}

const STUCK_FILE_REL = path.join(".claude", "state", "loop", "stuck-detector.json");

export async function checkStuckDetector(repoPath: string): Promise<StuckDetectedSignal | null> {
  const filePath = path.join(repoPath, STUCK_FILE_REL);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as any).sliceId !== "string" ||
    typeof (parsed as any).attempts !== "number"
  ) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  // Read threshold from loop.json
  let threshold = 3;
  try {
    const loopCfgPath = path.join(repoPath, ".claude", "loop.json");
    const cfgRaw = await fs.readFile(loopCfgPath, "utf8");
    const cfg = JSON.parse(cfgRaw);
    if (typeof cfg?.loop?.stuckDetectorThreshold === "number") {
      threshold = cfg.loop.stuckDetectorThreshold;
    }
  } catch {
    /* use default */
  }

  const attempts = obj.attempts as number;
  if (attempts < threshold) return null;
  return {
    sliceId: obj.sliceId as string,
    attempts,
    threshold,
    lastAttemptAt: typeof obj.lastAttemptAt === "string" ? obj.lastAttemptAt : ""
  };
}

```

### src/scripts/loop.mts

```
#!/usr/bin/env node

import path from "node:path";
import { clearFrontmatterCache } from "./lib/frontmatter-cache.mjs";
import { resolveSkills } from "./lib/skill-resolver.mjs";
import { importGithubSync } from "./lib/github-sync-loader.mjs";

// CLI for the loop plugin. Mirrors scripts/crew.mjs argument-parsing
// conventions (--repo, --, MSYS path normalization) so the two plugins behave
// the same way at the command line.

function normalizeMsysPath(value: string): string {
  if (!value || process.platform !== "win32") {
    return value;
  }
  const match = value.match(/^\/([a-zA-Z])\/(.*)$/);
  if (!match) {
    return value;
  }
  return `${(match[1] ?? "").toUpperCase()}:/${match[2] ?? ""}`;
}

// Flag schema. See hero-crew/scripts/crew.mjs for the same pattern.
const FLAG_SPEC = {
  "--help": { key: "help", boolean: true },
  "-h": { key: "help", boolean: true },
  "--repo": { key: "repo" },
  "--preset": { key: "preset" },
  "--variant": { key: "variant" },
  "--override": { key: "override" },
  "--strict": { key: "strict", boolean: true },
  "--phase": { key: "phase" },
  "--note": { key: "note" },
  "--status": { key: "status" },
  "--priority": { key: "priority" },
  "--category": { key: "category" },
  "--target-release": { key: "targetRelease" },
  "--type": { key: "type" },
  "--title": { key: "title" },
  "--id": { key: "id" },
  "--body": { key: "body" },
  "--features": { key: "features" },
  "--goal": { key: "goal" },
  "--no-dispatch": { key: "noDispatch", boolean: true },
  "--no-research": { key: "noResearch", boolean: true },
  "--no-architect": { key: "noArchitect", boolean: true },
  "--no-doc-writer": { key: "noDocWriter", boolean: true },
  "--no-classify": { key: "noClassify", boolean: true },
  "--keep-feature-open": { key: "keepFeatureOpen", boolean: true },
  "--force-close": { key: "forceClose", boolean: true },
  "--skip-validation-check": { key: "skipValidationCheck" },
  "--version": { key: "version" },
  "--since": { key: "since" },
  "--span-days": { key: "spanDays" },
  "--until": { key: "until" },
  "--by": { key: "by" },
  "--artifact": { key: "artifact" },
  "--kind": { key: "kind" },
  "--files": { key: "files" },
  "--features-json": { key: "featuresJson" },
  "--key": { key: "key" },
  "--insight": { key: "insight" },
  "--confidence": { key: "confidence" },
  "--slice": { key: "slice" },
  "--limit": { key: "limit" },
  "--window": { key: "window" },
  "--max-features": { key: "maxFeatures" },
  "--dry-run": { key: "dryRun", boolean: true },
  "--auto-mode": { key: "autoMode", boolean: true },
  "--provider": { key: "provider" },
  "--pr": { key: "pr" },
  "--scores": { key: "scores" },
  "--autonomous-safe": { key: "autonomousSafe" },
  "--evidence": { key: "evidence" },
  "--reasoning": { key: "reasoning" },
  "--allow-cross-session": { key: "allowCrossSession", boolean: true },
  "--explain-halts": { key: "explainHalts", boolean: true },
  "--worktree": { key: "worktree" },
  // SLICE-64: auto-merge flags
  "--no-merge": { key: "noMerge", boolean: true },
  "--skip-simplify": { key: "skipSimplify", boolean: true },
  "--grade-yaml": { key: "gradeYaml" },
  "--include-triaged": { key: "includeTriaged", boolean: true },
  // doctor flags
  "--check": { key: "check", boolean: true },
  "--fix": { key: "fix", boolean: true },
  // phase-gate flags
  "--serial": { key: "serial", boolean: true },
  "--only": { key: "only" },
  // backlog-add: pre-fill from GitHub issue
  "--from-issue": { key: "fromIssue" },
  // cost-by-skill report
  "--cost-by-skill": { key: "costBySkill", boolean: true },
  // pause / resume subcommands
  "--reason": { key: "reason" }
};

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, any> = {
    repo: process.cwd(),
    preset: null,
    variant: null,
    override: null,
    strict: false,
    phase: null,
    note: null,
    help: false,
    status: null,
    priority: null,
    category: null,
    targetRelease: null,
    type: null,
    title: null,
    id: null,
    body: null,
    features: null,
    version: null,
    since: null,
    spanDays: null,
    until: null,
    by: null,
    artifact: null,
    kind: null,
    files: null,
    featuresJson: null,
    keepFeatureOpen: false,
    skipValidationCheck: null,
    key: null,
    insight: null,
    confidence: null,
    slice: null,
    limit: null,
    window: null,
    maxFeatures: null,
    dryRun: false,
    autoMode: false,
    provider: null,
    pr: null,
    noResearch: false,
    noArchitect: false,
    noDocWriter: false,
    noClassify: false,
    scores: null,
    autonomousSafe: null,
    evidence: null,
    reasoning: null,
    allowCrossSession: false,
    worktree: null,
    explainHalts: false,
    noMerge: false,
    skipSimplify: false,
    check: false,
    fix: false,
    serial: false,
    only: null,
    includeTriaged: false,
    fromIssue: null,
    costBySkill: false,
    reason: null
  };
  const positionals: any[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]!;
    if (value === "--") {
      for (let tail = index + 1; tail < rest.length; tail += 1) {
        positionals.push(rest[tail]);
      }
      break;
    }
    const spec = FLAG_SPEC[value as keyof typeof FLAG_SPEC];
    if (spec) {
      if ("boolean" in spec && spec.boolean) {
        (flags as Record<string, any>)[spec.key] = true;
      } else {
        (flags as Record<string, any>)[spec.key] = rest[index + 1];
        index += 1;
      }
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`Unknown argument: ${value}`);
    }
    positionals.push(value);
  }

  if (!command || command === "--help" || command === "-h") {
    return { command: "help", flags, positionals };
  }
  return { command, flags, positionals };
}

type CmdCtx = {
  repoPath: string;
  flags: Record<string, any>;
  positionals: string[];
  config: Record<string, any> | null;
};

function usage() {
  return [
    "loop CLI",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts install --repo <path> [--preset <name>]",
    "  bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]",
    "  bun src/scripts/loop.mts status --repo <path>",
    "  bun src/scripts/loop.mts list-presets",
    "  bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]",
    "  bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)",
    "",
    "Hard dependency: the `crew` plugin must be installed. Phase-gate writes its",
    "artifact through `crew write-validation-result`."
  ].join("\n");
}

// Command registry. Each handler returns the result that gets JSON-stringified
// to stdout. Lazy imports stay per-handler to keep start-up cheap when a user
// only invokes one command.
const COMMANDS = {
  install: async ({ repoPath, flags }: CmdCtx) => {
    const { installLoop } = await import("./lib/loop-installer.mjs");
    return installLoop(repoPath, { preset: flags.preset });
  },
  "phase-gate": async ({ repoPath, flags, config }: CmdCtx) => {
    const { runPhaseGate } = await import("./lib/phase-gate.mjs");
    return runPhaseGate(repoPath, {
      phase: flags.phase,
      note: flags.note,
      serial: Boolean(flags.serial),
      only: flags.only || undefined,
      config
    });
  },
  status: async ({ repoPath }: CmdCtx) => {
    const { reportStatus } = await import("./lib/loop-installer.mjs");
    return reportStatus(repoPath);
  },
  "list-presets": async () => {
    const { listPresets } = await import("./lib/config-resolver.mjs");
    return { presets: await listPresets() };
  },
  github: ({ repoPath, flags, positionals }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags),
  "task-store": ({ repoPath, flags, positionals }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags),
  backlog: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runBacklogSubcommand(repoPath, positionals, flags, config),
  spec: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSpecSubcommand(repoPath, positionals, flags, config),
  release: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runReleaseSubcommand(repoPath, positionals, flags, config),
  slice: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSliceSubcommand(repoPath, positionals, flags, { config }),
  feature: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runFeatureSubcommand(repoPath, positionals, flags, config),
  decisions: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runDecisionsSubcommand(repoPath, positionals, flags, config),
  retrospective: async ({ repoPath, flags }: CmdCtx) => {
    const { writeRetrospective } = await import("./lib/retrospective.mjs");
    const result = await writeRetrospective(repoPath, {
      since: flags.since,
      spanDays: flags.spanDays,
      until: flags.until
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "retrospective",
      since: flags.since,
      span_days: flags.spanDays
    });
    return result;
  },
  brief: async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });

    if (flags?.costBySkill) {
      const { buildCostBySkillReport } = await import("./lib/cost-by-skill.mjs");
      const report = await buildCostBySkillReport(cwd);
      console.log(report);
      return { _suppressDefaultOutput: true };
    }

    const { buildBrief } = await import("./lib/brief.mjs");
    const result = await buildBrief(cwd);
    if (flags?.explainHalts) {
      const { explainHalts } = await import("./lib/halt-badges.mjs");
      console.log(JSON.stringify(result, null, 2));
      console.log("");
      console.log(explainHalts(result));
      return { _suppressDefaultOutput: true };
    }
    return result;
  },
  "perf-report": async ({ repoPath, flags, config }: CmdCtx) => {
    const { buildPerfReport } = await import("./lib/perf-report.mjs");
    const windowSize =
      flags.window != null && flags.window !== "" ? Number.parseInt(String(flags.window), 10) : 10;
    return buildPerfReport(repoPath, { window: windowSize, config });
  },
  "classify-slice-shape": async ({ flags }: CmdCtx) => {
    const { classifySliceShape } = await import("./lib/classify-slice-shape.mjs");
    const filesArg = typeof flags.files === "string" ? flags.files : "";
    const files = filesArg
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ path: p, added: 0, removed: 0, exportDelta: 0 }));
    return classifySliceShape({ files });
  },
  "snapshot-memory": async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeMemorySnapshot } = await import("./lib/memory-snapshot.mjs");
    const result = await writeMemorySnapshot(cwd);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "snapshot-memory", grades: result.counts.grades });
    return result;
  },
  lessons: async ({ repoPath, positionals }: CmdCtx) => {
    const [sub] = positionals;
    if (sub !== "recent") throw new Error("lessons requires subcommand: recent");
    const { recentLessons } = await import("./lib/lessons-feed.mjs");
    const limit = positionals[1] ? Number(positionals[1]) : 5;
    return recentLessons(repoPath, { limit });
  },
  "sync-claims": async ({ repoPath }: CmdCtx) => {
    const { syncClaims } = await import("./lib/claims-sync.mjs");
    const result = await syncClaims(repoPath);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "sync-claims", actions: result.actions.length });
    return result;
  },
  "stop-check": async ({ repoPath, flags, config }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { checkStopConditions } = await import("./lib/stop-conditions.mjs");
    return checkStopConditions(cwd, { config });
  },
  auto: async ({ repoPath, flags, config }: CmdCtx) => {
    const { runAutoWalker } = await import("./lib/auto-walker.mjs");
    return runAutoWalker(repoPath, {
      ...(flags.maxFeatures ? { maxFeatures: Number(flags.maxFeatures) } : {}),
      dryRun: Boolean(flags.dryRun),
      autoMode: Boolean(flags.autoMode),
      allowCrossSession: Boolean(flags.allowCrossSession),
      config
    });
  },
  learnings: ({ repoPath, flags, positionals }: CmdCtx) =>
    runLearningsSubcommand(repoPath, positionals, flags),
  architect: async ({ repoPath, flags, config }: CmdCtx) =>
    runArchitectSubcommand(repoPath, flags, config),
  trajectory: async ({ repoPath, flags }: CmdCtx) => {
    const { readTrajectory, trajectoryPath } = await import("./lib/trajectory-writer.mjs");
    const sliceId = flags.id;
    if (!sliceId) throw new Error("trajectory requires --id SLICE-NN");
    const steps = await readTrajectory(repoPath, sliceId);
    return { sliceId, steps, count: steps.length, path: trajectoryPath(repoPath, sliceId) };
  },
  "pr-fix": async ({ repoPath, flags }: CmdCtx) => {
    const { runPrFix } = await import("./lib/pr-fixer.mjs");
    const prNumber = flags.pr;
    if (!prNumber) throw new Error("pr-fix requires --pr <number>");
    const priorAttempts = flags.body ? JSON.parse(flags.body) : {};
    return runPrFix(repoPath, prNumber, { priorAttempts });
  },
  doctor: async ({ repoPath, flags, config }: CmdCtx) => {
    const { runDoctor } = await import("./lib/doctor.mjs");
    const result = await runDoctor(repoPath, { fix: Boolean(flags.fix), config });
    if (flags.check && result.findings.length > 0) {
      console.error(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      return { _suppressDefaultOutput: true };
    }
    return result;
  },
  pause: async ({ repoPath, flags }: CmdCtx) => {
    const reason = flags.reason;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw new Error("pause requires --reason <text>");
    }
    const stateDir = path.join(repoPath, ".claude", "state", "loop");
    const pausedFile = path.join(stateDir, "paused.json");
    const { default: nodeFs } = await import("node:fs/promises");
    await nodeFs.mkdir(stateDir, { recursive: true });
    const payload = {
      triggered: true,
      reason: reason.trim(),
      resumeHint: "Run: bun src/scripts/loop.mts resume --repo .",
      pausedAt: new Date().toISOString()
    };
    await nodeFs.writeFile(pausedFile, JSON.stringify(payload, null, 2), "utf8");
    process.exitCode = 0;
    return { paused: true, reason: payload.reason, pausedAt: payload.pausedAt, path: pausedFile };
  },
  resume: async ({ repoPath }: CmdCtx) => {
    const pausedFile = path.join(repoPath, ".claude", "state", "loop", "paused.json");
    const { default: nodeFs } = await import("node:fs/promises");
    try {
      await nodeFs.unlink(pausedFile);
    } catch {
      // File absent — idempotent, treat as success.
    }
    process.exitCode = 0;
    return { resumed: true };
  },
  "stuck-tick": async ({ repoPath, flags, positionals }: CmdCtx) => {
    const sliceArg = (flags.slice as string | undefined) ?? (positionals[0] as string | undefined);
    if (!sliceArg) {
      console.error("--slice <SLICE-ID> required");
      process.exitCode = 1;
      return { _suppressDefaultOutput: true };
    }
    const { default: nodeFs } = await import("node:fs/promises");
    const dir = path.join(repoPath, ".claude", "state", "loop");
    await nodeFs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, "stuck-detector.json");
    let existing: any = null;
    try {
      existing = JSON.parse(await nodeFs.readFile(filePath, "utf8"));
    } catch {
      /* absent — start fresh */
    }
    const attempts =
      existing?.sliceId === sliceArg && typeof existing?.attempts === "number"
        ? existing.attempts + 1
        : 1;
    const payload = { sliceId: sliceArg, attempts, lastAttemptAt: new Date().toISOString() };
    await nodeFs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    process.exitCode = 0;
    return { sliceId: sliceArg, attempts };
  },
  "stuck-reset": async ({ repoPath }: CmdCtx) => {
    const { default: nodeFs } = await import("node:fs/promises");
    const filePath = path.join(repoPath, ".claude", "state", "loop", "stuck-detector.json");
    try {
      await nodeFs.unlink(filePath);
    } catch {
      /* idempotent */
    }
    process.exitCode = 0;
    return { reset: true };
  }
};

async function runArchitectSubcommand(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const sliceId = flags.id;
  if (!sliceId) throw new Error("architect requires --id SLICE-NN");

  const { resolveArchitectModels } = await import("./lib/model-router.mjs");
  const { runPlanPreflight } = await import("./lib/slice-plan.mjs");

  const { architectModel, editorModel } = resolveArchitectModels(config);
  const planResult = await runPlanPreflight(repoPath, sliceId, { config });

  const dispatchInstruction = [
    `## Two-Model Split Dispatch`,
    ``,
    `**Architect Model (Research/Plan):** ${architectModel}`,
    `**Editor Model (Implementation):** ${editorModel}`,
    ``,
    `The architect model has completed the codebase research pre-flight.`,
    `Plan artifact written to: ${planResult.planPath}`,
    ``,
    `Dispatch \`crew:fullstack-dev\` subagent for the editor phase, which will use the ${editorModel} model for implementation. After it returns, dispatch \`crew:inspector\` (and \`crew:verifier\` if behavior changed) before closing the slice.`,
    `The editor phase should reference the plan artifact to guide the implementation approach.`
  ].join("\n");

  const { logEvent } = await import("./lib/telemetry.mjs");
  await logEvent(repoPath, {
    command: "architect",
    slice: sliceId,
    architect_model: architectModel,
    editor_model: editorModel,
    plan_path: planResult.planPath,
    files_researched: planResult.filesResearched.length
  });

  return {
    sliceId,
    architectModel,
    editorModel,
    planPath: planResult.planPath,
    filesResearched: planResult.filesResearched,
    dispatchInstruction
  };
}

function runResolveSkillsCommand(flags: Record<string, any>): void {
  const VALID_VARIANTS = ["fe", "be", "single", "pm", "researcher", "architect", "document-writer"];
  if (!flags.variant) {
    process.stderr.write(`error: --variant <${VALID_VARIANTS.join("|")}> required\n`);
    process.exitCode = 1;
    return;
  }
  if (!VALID_VARIANTS.includes(flags.variant)) {
    process.stderr.write(
      `error: --variant must be one of ${VALID_VARIANTS.join(", ")} (got ${flags.variant})\n`
    );
    process.exitCode = 1;
    return;
  }

  const preset = flags.preset;
  if (!preset) {
    process.stderr.write("error: --preset <path> required\n");
    process.exitCode = 1;
    return;
  }

  if (flags.strict) {
    process.stderr.write(
      "warn: --strict is reserved for a future skill-ID-lint registry and is a no-op today\n"
    );
  }

  try {
    const resolved = resolveSkills({
      presetPath: preset,
      ...(flags.override ? { overridePath: flags.override } : {}),
      variant: flags.variant
    });
    if (resolved === null) {
      process.stderr.write(
        "warn: no skills resolved for this variant (split mismatch or empty array)\n"
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(JSON.stringify(resolved, null, 2) + "\n");
    process.exitCode = 0;
  } catch (err: unknown) {
    const msg = (err as { message?: string } | undefined)?.message ?? String(err);
    process.stderr.write(`error: ${msg}\n`);
    process.exitCode = 1;
  }
}

async function main() {
  // Short-circuit `dispatch` before parseArgs — its flags (--plan, --parent-branch,
  // --depth, --dry-run, --json, --run-id, --config) are not registered in
  // FLAG_SPEC, and the parser would throw on them. Forward all remaining argv
  // verbatim to dispatch.mts as a child process (run under bun).
  const rawArgv = process.argv.slice(2);
  if (rawArgv[0] === "dispatch") {
    const { spawnSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const thisFile = fileURLToPath(import.meta.url);
    const dispatchCli = path.join(path.dirname(thisFile), "dispatch.mts");
    const result = spawnSync("bun", [dispatchCli, ...rawArgv.slice(1)], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    process.exitCode = result.status ?? 1;
    return;
  }

  const { command, flags, positionals } = parseArgs(rawArgv);
  const repoPath = path.resolve(normalizeMsysPath(flags.repo));

  if (command === "help") {
    console.log(usage());
    return;
  }

  if (command === "resolve-skills") {
    runResolveSkillsCommand(flags);
    clearFrontmatterCache();
    return;
  }

  clearFrontmatterCache(); // ensure cold start for each invocation

  // Resolve config once at dispatcher level and pass to all handlers
  const { resolveConfig } = await import("./lib/config-resolver.mjs");
  const config = await resolveConfig(repoPath);

  const handler = (COMMANDS as Record<string, (ctx: CmdCtx) => Promise<unknown>>)[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
  }

  try {
    const result = await handler({ repoPath, flags, positionals, config });
    if (result && (result as any)._suppressDefaultOutput) return;
    console.log(JSON.stringify(result, null, 2));
  } finally {
    // Win 10: flush buffered audit log lines in a single write per invocation.
    const { flushAuditLog } = await import("./lib/auto-dispatch.mjs");
    await flushAuditLog(repoPath).catch(() => {
      /* non-fatal: best-effort audit log flush */
    });
  }
}

type DispatchFn = typeof import("./lib/auto-dispatch.mjs").dispatchAgent;

async function resolveBacklogAddBody(
  repoPath: string,
  _title: string,
  suppliedBody: string | null | undefined
): Promise<string> {
  if (suppliedBody) return suppliedBody;
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:researcher",
    parentCommand: "backlog-add",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal-researcher-disabled",
    durationMs: 0
  });
  console.error(
    "[backlog add] researcher auto-dispatch removed (see DEC-011). " +
      "Creating FEAT with empty body — run /loop:backlog-add for researcher enrichment, " +
      "or pass --body explicitly."
  );
  return "";
}

async function runBacklogListPendingIds(repoPath: string, flags: Record<string, any> = {}) {
  const { listPendingFeatureIds } = await import("./lib/backlog-list-ids.mjs");
  const ids = await listPendingFeatureIds(repoPath, {
    includeTriaged: Boolean(flags.includeTriaged)
  });
  return { ids };
}

async function runBacklogAdd(
  repoPath: string,
  flags: Record<string, any>,
  rest: string[],
  config: Record<string, any> | null
) {
  // --from-issue pre-fill: fetch title, body, and GitHub metadata from a GH issue URL.
  let githubIssue: number | null = null;
  let githubUrl: string | null = null;
  let issueBody: string | undefined;

  if (flags.fromIssue) {
    const { fetchIssue } = await import("./lib/from-issue.mjs");
    const issue = await fetchIssue(flags.fromIssue);
    // Only pre-fill title if not explicitly passed
    if (!flags.title) {
      flags = { ...flags, title: issue.title };
    }
    // Only pre-fill body if not explicitly passed
    if (!flags.body) {
      issueBody = issue.body || undefined;
    }
    githubIssue = issue.number;
    githubUrl = issue.url;
  }

  const title = flags.title || rest.join(" ");
  if (!title) throw new Error("backlog add requires a title (positional or --title).");
  if (flags.noResearch) {
    console.error(
      "[backlog add] --no-research is deprecated and now a no-op (see DEC-011). " +
        "Researcher auto-dispatch is already removed."
    );
  }
  const resolvedBody = await resolveBacklogAddBody(repoPath, title, flags.body ?? issueBody);
  const { addFeature } = await import("./lib/backlog-writer.mjs");
  const result = await addFeature(repoPath, {
    title,
    priority: flags.priority,
    category: flags.category,
    target_release: flags.targetRelease,
    body: resolvedBody,
    config,
    ...(githubIssue !== null ? { github_issue: githubIssue } : {}),
    ...(githubUrl !== null ? { github_url: githubUrl } : {})
  });
  const { publishFeat } = await importGithubSync("github-sync.mjs");
  try {
    await (publishFeat as any)(repoPath, result.id);
  } catch (e) {
    console.error(`[github] publish warning (backlog add): ${(e as Error).message}`);
  }
  return result;
}

async function runBacklogPmWrite(repoPath: string, flags: Record<string, any>, rest: string[]) {
  const featureId = flags.id || rest[0];
  if (!featureId) throw new Error("backlog pm-write requires --id FEAT-NNN.");
  if (!flags.scores) throw new Error("backlog pm-write requires --scores '{...}'.");
  const { parseJsonFlag } = await import("./lib/json-flag.mjs");
  const parsedScores: Record<string, number> = parseJsonFlag(flags.scores, "scores");
  const priority = flags.priority ?? null;
  const autonomousSafe =
    flags.autonomousSafe === "true"
      ? true
      : flags.autonomousSafe === "false"
        ? false
        : Boolean(flags.autonomousSafe);
  const triageNotes: string | undefined = flags.reasoning ?? flags.evidence ?? undefined;
  const { writePmScores } = await import("./lib/backlog-pm-write.mjs");
  return writePmScores(repoPath, {
    id: featureId,
    scores: parsedScores as any,
    priority,
    autonomousSafe,
    ...(triageNotes !== undefined ? { triageNotes } : {})
  });
}

function isUnclassifiedEntry(entry: Record<string, any>): boolean {
  const fm = entry.frontmatter;
  const tagsEmpty = !Array.isArray(fm.tags) || fm.tags.length === 0;
  const tagsNull = fm.tags == null || fm.tags === "";
  const noTags = tagsEmpty && tagsNull;
  return noTags && fm.needs_contract == null && fm.needs_ux == null;
}

export async function runBacklogEnrich(repoPath: string, _flags: Record<string, any>) {
  const { listBacklog } = await import("./lib/backlog-parser.mjs");
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");

  const allEntries = await listBacklog(repoPath);
  const triaged = allEntries.filter((e: Record<string, any>) => e.state === "triaged");

  const needsClassify = triaged.filter(isUnclassifiedEntry);
  const alreadyTagged = triaged.length - needsClassify.length;

  if (needsClassify.length === 0) {
    console.log(`Enriched: 0 / Already tagged: ${alreadyTagged}`);
    return { enriched: 0, alreadyTagged, failed: 0 };
  }

  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:architect",
    parentCommand: "backlog enrich",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal",
    durationMs: 0
  });
  console.error(
    `[backlog enrich] CLI auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /loop:backlog-enrich. ` +
      `${needsClassify.length} feature(s) need classification.`
  );
  process.exitCode = 1;
  return { enriched: 0, alreadyTagged, failed: 0, refused: true };
}

async function runBacklogSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "backlog requires a subcommand: add | list | list-pending-ids | triage | promote"
    );
  if (sub === "add") {
    return runBacklogAdd(repoPath, flags, rest, config);
  }
  if (sub === "list") {
    const { listBacklog, filterBacklog } = await import("./lib/backlog-parser.mjs");
    const entries = await listBacklog(repoPath);
    const filtered = filterBacklog(entries, {
      status: flags.status,
      priority: flags.priority,
      category: flags.category,
      target_release: flags.targetRelease
    });
    return {
      count: filtered.length,
      entries: filtered.map((e) => ({
        id: e.id,
        state: e.state,
        priority: e.frontmatter.priority,
        category: e.frontmatter.category,
        target_release: e.frontmatter.target_release,
        created: e.frontmatter.created,
        updated: e.frontmatter.updated,
        derived_from: e.frontmatter.derived_from || null,
        slices: e.frontmatter.slices || [],
        filePath: e.filePath
      }))
    };
  }
  if (sub === "triage") {
    // TODO(2026-09-11): remove this stub. Kept one release cycle so
    // operators upgrading from <= v0.40 get a directive instead of a
    // bare "unknown subcommand" error. Triage is PM-only since
    // commit 505a8a5 (2026-06-11).
    throw new Error(
      "`backlog triage` (regex fallback) was removed on 2026-06-11. Triage is PM-only — invoke `/loop:triage` (skill) instead. On PM error, halt and surface to the operator."
    );
  }
  if (sub === "list-pending-ids") {
    return runBacklogListPendingIds(repoPath, flags);
  }
  if (sub === "promote") {
    const featureId = flags.id || rest[0];
    if (!featureId) throw new Error("backlog promote requires --id FEAT-NNN.");
    const { findFeatureById, moveFeature } = await import("./lib/backlog-writer.mjs");
    const entry = await findFeatureById(repoPath, featureId);
    if (!entry) throw new Error(`Feature not found: ${featureId}`);
    const moved = await moveFeature(entry.filePath, "in-progress");
    return { id: featureId, moved };
  }
  if (sub === "pm-write") {
    return runBacklogPmWrite(repoPath, flags, rest);
  }
  if (sub === "enrich") {
    return runBacklogEnrich(repoPath, flags);
  }
  throw new Error(`Unknown backlog subcommand: ${sub}`);
}

function parseFeatureEntries(flags: Record<string, any>): string[] {
  if (flags.featuresJson) {
    let entries;
    try {
      entries = JSON.parse(flags.featuresJson as string);
    } catch (err: unknown) {
      throw new Error(`--features-json must be valid JSON: ${(err as Error).message}`);
    }
    if (!Array.isArray(entries)) throw new Error("--features-json must be a JSON array");
    return entries;
  }
  return (flags.features as string)
    .split(";")
    .map((s: string) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Architect output parser — accepts semicolon-separated, newline-separated,
// or markdown-numbered-list titles from the agent. Each entry is trimmed,
// list markers and surrounding emphasis are stripped, empty entries
// discarded. Prefers semicolon split when present (back-compat with the
// original prompt format); falls back to newline split otherwise.
// ---------------------------------------------------------------------------

function stripListMarker(line: string): string {
  // Strip leading markdown list markers: "1.", "1)", "-", "*"
  let s = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
  // Strip surrounding bold/italic markers and backticks
  s = s.replace(/^[*_`]+|[*_`]+$/g, "");
  return s.trim();
}

export { parseClassifyOutput } from "./lib/classify-parser.mjs";

export function parseArchitectOutput(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const hasSemicolon = raw.includes(";");
  const parts = hasSemicolon ? raw.split(";") : raw.split("\n");
  return parts.map(stripListMarker).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Incomplete-SPEC detection — checks frontmatter and body for objective/scope.
// Returns array of missing field names (empty when SPEC is complete).
// ---------------------------------------------------------------------------

export function detectMissingSpecFields(spec: {
  frontmatter: Record<string, any>;
  body: string;
}): string[] {
  const missing: string[] = [];
  const fm = spec.frontmatter;
  const body = spec.body ?? "";

  const hasObjective =
    (fm["objective"] != null && String(fm["objective"]).trim().length > 0) ||
    /##\s+objective/i.test(body) ||
    /##\s+goals/i.test(body) ||
    /##\s+problem/i.test(body);

  const hasScope =
    (fm["scope"] != null && String(fm["scope"]).trim().length > 0) ||
    /##\s+scope/i.test(body) ||
    /##\s+in[- ]scope/i.test(body) ||
    /##\s+non-goals/i.test(body);

  if (!hasObjective) missing.push("objective");
  if (!hasScope) missing.push("scope");
  return missing;
}

const SPEC_HANDLERS = {
  add: async (
    repoPath: string,
    flags: Record<string, any>,
    rest: string[],
    config: Record<string, any> | null
  ) => {
    const title = flags.title || rest.join(" ");
    if (!title) throw new Error("spec add requires a title (positional or --title).");
    if (!flags.type) {
      throw new Error("spec add requires --type prd|user-journey|sre|research|adr|other.");
    }
    const { addSpec } = await import("./lib/spec-parser.mjs");
    return addSpec(repoPath, {
      type: flags.type,
      title,
      priority: flags.priority,
      target_release: flags.targetRelease,
      body: flags.body || "",
      config
    });
  },
  list: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    config: Record<string, any> | null
  ) => {
    const { listSpecs, filterSpecs } = await import("./lib/spec-parser.mjs");
    const specs = await listSpecs(repoPath, { config });
    const filtered = filterSpecs(specs, {
      status: flags.status,
      type: flags.type,
      priority: flags.priority,
      target_release: flags.targetRelease
    });
    return {
      count: filtered.length,
      specs: filtered.map((s) => ({
        id: s.id,
        type: s.frontmatter.type,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
        target_release: s.frontmatter.target_release,
        title: s.frontmatter.title,
        derived_features: s.frontmatter.derived_features || [],
        filePath: s.filePath
      }))
    };
  },
  decompose: async (
    repoPath: string,
    flags: Record<string, any>,
    rest: string[],
    config: Record<string, any> | null
  ) => {
    const specId = flags.id || rest[0];
    if (!specId) throw new Error("spec decompose requires --id SPEC-NNN.");

    // Fast path: caller supplied explicit feature list — skip architect entirely.
    if (flags.features || flags.featuresJson) {
      const entries = parseFeatureEntries(flags);
      const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
      const out = await decomposeSpec(repoPath, specId, entries, { config });
      const { publishFeat } = await importGithubSync("github-sync.mjs");
      for (const feat of out.created) {
        try {
          await (publishFeat as any)(repoPath, feat.id);
        } catch (e) {
          console.error(
            `[github] publish warning (spec decompose ${feat.id}): ${(e as Error).message}`
          );
        }
      }
      return out;
    }

    if (flags.noArchitect) {
      console.error(
        "[spec decompose] --no-architect is deprecated and now a no-op (see DEC-011). " +
          "Architect auto-dispatch is already removed."
      );
    }

    // No --features / --features-json supplied: refuse with clear message.
    const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
    await appendAuditLog(repoPath, {
      timestamp: new Date().toISOString(),
      agent: "loop:architect",
      parentCommand: "spec-decompose",
      ok: false,
      skipped: true,
      skipReason: "cli-refusal-architect-disabled",
      durationMs: 0
    });
    const msg =
      `[spec decompose] architect auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /loop:spec-decompose --id ${specId}, ` +
      `or pass --features 'Title 1; Title 2; ...'`;
    console.error(msg);
    process.exitCode = 1;
    return { error: "architect auto-dispatch removed; pass --features or use slash flow" };
  },
  status: async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    config: Record<string, any> | null
  ) => {
    const { specSatisfaction, reconcileSpecStatus } = await import("./lib/linkage.mjs");
    const before = await specSatisfaction(repoPath, { config });
    const reconciled = await reconcileSpecStatus(repoPath, { config });
    return { satisfaction: before, statusChanges: reconciled };
  }
};

async function runSpecSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("spec requires a subcommand: add | list | decompose | status");
  const handler = (SPEC_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown spec subcommand: ${sub}`);
  return handler(repoPath, flags, rest, config);
}

async function runReleaseSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub] = positionals;
  if (!sub) throw new Error("release requires a subcommand: plan | status");
  const { planRelease, releaseStatus } = await import("./lib/release-planner.mjs");
  if (sub === "plan") {
    if (!flags.version) throw new Error("release plan requires --version vX.Y.Z");
    return await planRelease(repoPath, { version: flags.version, config });
  }
  if (sub === "status") {
    if (!flags.version) throw new Error("release status requires --version vX.Y.Z");
    return await releaseStatus(repoPath, { version: flags.version, config });
  }
  throw new Error(`Unknown release subcommand: ${sub}`);
}

// Resolves a required ID flag/positional or throws. Centralizes the
// "missing --id" error shape across slice subcommands.
function requireId(value: string | null | undefined, errMsg: string): string {
  if (!value) throw new Error(errMsg);
  return value;
}

const SLICE_HANDLERS = {
  "from-feature": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    featureId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(featureId, "slice from-feature requires --id FEAT-NNN.");
    const { sliceFromFeature } = await import("./lib/slice-linker.mjs");
    const { dispatchAgent, appendAuditLog } = await import("./lib/auto-dispatch.mjs");
    const { DecompositionRequiredError, InvalidProposedSlicesError } =
      await import("./lib/proposed-slices.mjs");
    const dispatchFn = opts.dispatchFn ?? dispatchAgent;
    let out;
    try {
      out = await sliceFromFeature(repoPath, featureId, {
        noClassify: Boolean(flags.noClassify),
        dispatchFn,
        config: opts.config
      });
    } catch (err) {
      if (err instanceof DecompositionRequiredError || err instanceof InvalidProposedSlicesError) {
        await appendAuditLog(repoPath, {
          timestamp: new Date().toISOString(),
          parentCommand: "slice from-feature",
          featureId,
          error: (err as Error).message,
          ok: false,
          skipped: false
        });
      }
      throw err;
    }
    const { publishSlice } = await importGithubSync("github-sync.mjs");
    const slicesList = Array.isArray((out as any).slices) ? (out as any).slices : [out.slice];
    for (const sl of slicesList) {
      try {
        await (publishSlice as any)(repoPath, sl.id, featureId);
      } catch (e) {
        console.error(`[github] publish warning (slice from-feature): ${(e as Error).message}`);
      }
    }
    const { logEvent } = await import("./lib/telemetry.mjs");
    for (const sl of slicesList) {
      await logEvent(repoPath, {
        command: "slice from-feature",
        feature: featureId,
        slice: sl.id
      });
    }
    return out;
  },
  grade: async (repoPath: string, flags: Record<string, any>, _rest: string[], sliceId: string) => {
    requireId(sliceId, "slice grade requires --id SLICE-NN.");
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { createGradeFile } = await import("./lib/grade-writer.mjs");
    const out = await createGradeFile(cwd, sliceId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "slice grade", slice: sliceId, created: out.created });
    return out;
  },
  "grade-write": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string
  ) => {
    requireId(sliceId, "slice grade-write requires --id SLICE-NN.");
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeGrade } = await import("./lib/grade-writer.mjs");
    return writeGrade(cwd, sliceId);
  },
  close: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice close requires --id SLICE-NN.");
    if (flags.noMerge && flags.dryRun) {
      throw new Error("slice close: --no-merge and --dry-run are mutually exclusive.");
    }
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { closeSlice } = await import("./lib/slice-linker.mjs");
    const out = await closeSlice(cwd, sliceId, {
      gradeYamlPath: flags.gradeYaml || null,
      keepFeatureOpen: Boolean(flags.keepFeatureOpen),
      forceClose: Boolean(flags.forceClose),
      skipValidationCheck: flags.skipValidationCheck || null,
      noDocWriter: Boolean(flags.noDocWriter),
      noMerge: Boolean(flags.noMerge),
      dryRun: Boolean(flags.dryRun),
      skipSimplify: Boolean(flags.skipSimplify),
      config: opts.config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "slice close",
      slice: sliceId,
      scaffoldOnly: out.scaffoldOnly,
      gradeYamlProvided: Boolean(flags.gradeYaml)
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(cwd, sliceId);
    return out;
  },
  complete: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice complete requires --id SLICE-NN.");
    // SLICE-64: --no-merge and --dry-run are mutually exclusive
    if (flags.noMerge && flags.dryRun) {
      throw new Error("slice complete: --no-merge and --dry-run are mutually exclusive.");
    }
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { completeSlice } = await import("./lib/slice-linker.mjs");
    const out = await completeSlice(cwd, sliceId, {
      keepFeatureOpen: Boolean(flags.keepFeatureOpen),
      forceClose: Boolean(flags.forceClose),
      skipValidationCheck: flags.skipValidationCheck || null,
      noDocWriter: Boolean(flags.noDocWriter),
      // SLICE-64 additions:
      noMerge: Boolean(flags.noMerge),
      dryRun: Boolean(flags.dryRun),
      skipSimplify: Boolean(flags.skipSimplify),
      config: opts.config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "slice complete",
      slice: sliceId,
      feature: (out as any).feature?.id || null,
      spec_status_changes: out.specStatusChanges?.length || 0,
      handoff_written: Boolean(out.handoff?.handoffPath),
      validation_gate_satisfied: Boolean(out.validationGate?.satisfied),
      validation_skipped_via_flag: Boolean(flags.skipValidationCheck)
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(cwd, sliceId);
    return out;
  },
  start: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice start requires --id SLICE-NN.");
    const { startSlice } = await import("./lib/slice-linker.mjs");
    const out = await startSlice(repoPath, sliceId, {
      goal: flags.goal || null,
      dispatch: flags.noDispatch !== true,
      config: opts.config ?? null
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice start",
      slice: sliceId,
      run_brief_written: Boolean(out.runBrief?.runBriefPath || out.runBrief?.artifactPath),
      slice_progress_written: Boolean(out.sliceProgress?.path),
      dispatch: out.dispatchInstruction ? "crew-build" : "inline"
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(repoPath, sliceId);
    return out;
  },
  link: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    const id = requireId(flags.id || sliceId, "slice link requires --id SLICE-NN.");
    if (!flags.artifact) throw new Error("slice link requires --artifact <path>.");
    if (!flags.kind) throw new Error("slice link requires --kind reviews|validations|deployments.");
    const { linkArtifactToSlice } = await import("./lib/artifact-linkage.mjs");
    return linkArtifactToSlice(repoPath, {
      sliceId: id,
      artifactPath: flags.artifact,
      kind: flags.kind,
      config: opts.config
    });
  },
  "review-ladder": async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice review-ladder requires --id SLICE-NN.");
    const { buildReviewLadder } = await import("./lib/reviewer-ladder.mjs");
    return buildReviewLadder(repoPath, sliceId, { config: opts.config ?? null });
  },
  "post-builder-fanout": async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice post-builder-fanout requires --id SLICE-NN.");
    const { buildPostBuilderFanout } = await import("./lib/post-builder-fanout.mjs");
    const result = await buildPostBuilderFanout(repoPath, sliceId, { config: opts.config ?? null });
    const { writeFanoutMarker } = await import("./lib/fanout-marker.mjs");
    await writeFanoutMarker(repoPath, sliceId, result.tasks.length); // best-effort
    return result;
  },
  plan: async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice plan requires --id SLICE-NN.");
    const { runPlanPreflight } = await import("./lib/slice-plan.mjs");
    const out = await runPlanPreflight(repoPath, sliceId, { config: opts.config ?? null });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice plan",
      slice: sliceId,
      plan_path: out.planPath,
      files_researched: out.filesResearched.length
    });
    return out;
  }
};

async function runSliceSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "slice requires a subcommand: from-feature | start | grade | grade-write | complete | link | review-ladder | post-builder-fanout | plan"
    );
  const handler = (SLICE_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown slice subcommand: ${sub}`);
  const id = flags.id || rest[0];
  return handler(repoPath, flags, rest, id, opts);
}

async function runDecisionsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("decisions requires a subcommand: list | show");
  const { listDecisions, showDecision } = await import("./lib/decisions-store.mjs");
  if (sub === "list") {
    const decisions = await listDecisions(repoPath, { status: flags.status, config });
    return {
      count: decisions.length,
      decisions: decisions.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        introduced_by_slice: d.introduced_by_slice,
        introduced_at: d.introduced_at,
        superseded_by: d.superseded_by,
        filePath: d.filePath
      }))
    };
  }
  if (sub === "show") {
    const decId = flags.id || rest[0];
    if (!decId) throw new Error("decisions show requires --id DEC-NNN.");
    const dec = await showDecision(repoPath, decId, { config });
    if (!dec) throw new Error(`Decision not found: ${decId}`);
    return dec;
  }
  if (sub === "supersede") {
    const { supersedeDecision } = await import("./lib/decisions-store.mjs");
    if (!flags.id || !flags.by)
      throw new Error("decisions supersede requires --id DEC-OLD --by DEC-NEW");
    const out = await supersedeDecision(repoPath, { oldId: flags.id, newId: flags.by, config });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "decisions supersede", old: flags.id, new: flags.by });
    return out;
  }
  if (sub === "relevant") {
    const { findRelevantDecisions } = await import("./lib/decisions-store.mjs");
    if (!flags.files) throw new Error('decisions relevant requires --files "a.cs,b.cs,..."');
    const files = flags.files
      .split(",")
      .map((f: string) => f.trim())
      .filter(Boolean);
    const matches = await findRelevantDecisions(repoPath, files, { config });
    return { count: matches.length, decisions: matches };
  }
  throw new Error(`Unknown decisions subcommand: ${sub}`);
}

async function runFeatureSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, featId] = positionals;
  if (!sub) throw new Error("feature requires a subcommand: simplify");
  if (sub !== "simplify") throw new Error(`Unknown feature subcommand: ${sub}`);
  if (!featId) throw new Error("feature simplify requires a feature ID: feature simplify FEAT-NNN");
  const id = (flags.id as string | null) || featId;
  const { featureSimplify } = await import("./lib/slice-linker/feature-lifecycle.mjs");
  const opts: Record<string, any> = {
    skipSimplify: flags.skipSimplify as boolean,
    config
  };
  if (flags.slice) opts.sliceId = flags.slice as string;
  if (flags.since) opts.startedAt = flags.since as string;
  return featureSimplify(repoPath, id, opts);
}

async function runLearningsLog(
  repoPath: string,
  flags: Record<string, any>,
  logLearning: (r: string, e: any) => Promise<any>
) {
  if (!flags.key) throw new Error("learnings log requires --key <key>");
  if (!flags.insight) throw new Error("learnings log requires --insight <insight>");
  const entry: any = { key: flags.key, insight: flags.insight, source: "agent" };
  if (flags.confidence !== null && flags.confidence !== undefined) {
    const conf = Number(flags.confidence);
    if (!Number.isNaN(conf)) entry.confidence = conf;
  }
  if (flags.slice) entry.sliceId = flags.slice;
  return logLearning(repoPath, entry);
}

async function runLearningsPrune(
  repoPath: string,
  flags: Record<string, any>,
  deleteLearning: (r: string, id: number) => Promise<Record<string, unknown> | null>
) {
  if (flags.id === null || flags.id === undefined) {
    throw new Error("learnings prune requires --id <numeric-id>");
  }
  const parsed = Number(flags.id);
  if (Number.isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error("learnings prune --id must be a positive integer");
  }
  const deleted = await deleteLearning(repoPath, parsed);
  return { deleted };
}

async function runLearningsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>
) {
  const [sub] = positionals;
  if (!sub)
    throw new Error("learnings requires a subcommand: log | recent | list | search | prune");
  const { logLearning, recentLearnings, searchLearnings, deleteLearning } =
    await import("./lib/learnings.mjs");
  if (sub === "log") return runLearningsLog(repoPath, flags, logLearning);
  if (sub === "recent") {
    const limit = flags.limit !== null && flags.limit !== undefined ? Number(flags.limit) : 3;
    return recentLearnings(repoPath, limit);
  }
  if (sub === "list") {
    const limit =
      flags.limit !== null && flags.limit !== undefined
        ? Number(flags.limit)
        : Number.MAX_SAFE_INTEGER;
    return recentLearnings(repoPath, limit);
  }
  if (sub === "search") {
    const query = positionals[1];
    if (!query || !query.trim()) throw new Error("learnings search requires a query string");
    return searchLearnings(repoPath, query);
  }
  if (sub === "prune") return runLearningsPrune(repoPath, flags, deleteLearning);
  throw new Error(`Unknown learnings subcommand: ${sub}`);
}

async function runGithubSubcommand(repoPath: any, positionals: any, flags: any) {
  const [sub] = positionals;
  const { publishAll, publishFeat, syncMilestones, setupGithubSync } =
    await importGithubSync("github-sync.mjs");
  if (sub === "setup") {
    const result = await (setupGithubSync as any)(repoPath);
    console.log("[github-sync] Setup complete. Run 'github publish' next.");
    return result;
  }
  if (sub === "publish") return (publishAll as any)(repoPath);
  if (sub === "feat-publish") {
    const featId = flags?.id || positionals[1];
    if (!featId) throw new Error("github feat-publish requires --id FEAT-NNN.");
    const result = await (publishFeat as any)(repoPath, featId);
    if (!result) {
      console.log("[github-sync] GitHub sync disabled — skipped.");
      return { skipped: true };
    }
    console.log(
      result.created
        ? `Published: #${result.issueNum} ${result.url}`
        : `Already published: #${result.issueNum}`
    );
    return result;
  }
  if (sub === "status") return (syncMilestones as any)(repoPath);
  if (sub === "sync" || sub === "bootstrap") {
    const { resolveConfig } = await import("./lib/config-resolver.mjs");
    const { getProvider } = await import("./lib/task-store/index.mjs");
    const config = await resolveConfig(repoPath);
    const provider = getProvider(config, repoPath);
    console.log(`[task-store] provider: ${provider.constructor.name}`);
    return sub === "sync" ? provider.syncPull(repoPath) : provider.bootstrap(repoPath);
  }
  throw new Error(
    "github requires a subcommand: setup | publish | feat-publish | sync | status | bootstrap"
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

```

### src/tests/explain-halts.test.mts

```
// Tests for FEAT-065 / SLICE-61: --explain-halts renderer.
// Covers: all-null path, each single-halt path, multi-halt combined render,
// malformed snapshot (graceful degrade), brief-vs-snapshot lookup, unknown
// fields (registry iteration ignores them).

import { test } from "bun:test";
import assert from "node:assert/strict";

import { explainHalts, HALT_BADGES } from "../scripts/lib/halt-badges.mjs";

test("explainHalts: all halt-badges null → 'No halts active.'", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /^## Halt summary/);
  assert.match(out, /No halts active\./);
  assert.equal(out.includes("Cost regression"), false);
});

test("explainHalts: missing snapshot AND missing top-level → 'No halts active.'", () => {
  const out = explainHalts({});
  assert.match(out, /No halts active\./);
});

test("explainHalts: costRegression populated → renders gate name + values + action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: {
        triggered: true,
        currentUsd: 150.5,
        medianUsd: 47.13,
        thresholdUsd: 141.39,
        multiplier: 3,
        window: 5,
        sampleCount: 5
      },
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Cost regression/);
  assert.match(out, /\$150\.50/);
  assert.match(out, /\$47\.13/);
  assert.match(out, /multiplier 3/);
  assert.match(out, /costRegressionMultiplier/);
});

test("explainHalts: sessionDrift populated → renders both sessionIds + override action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: {
        triggered: true,
        sessionIdAtStart: "sess-old",
        sessionIdNow: "sess-new"
      },
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Session drift/);
  assert.match(out, /sess-old/);
  assert.match(out, /sess-new/);
  assert.match(out, /--allow-cross-session/);
});

test("explainHalts: sliceCostCeiling populated → renders actual vs ceiling + action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: { exceeded: true, actualUsd: 200.25, ceilingUsd: 150 },
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Slice cost ceiling/);
  assert.match(out, /\$200\.25/);
  assert.match(out, /\$150\.00/);
  assert.match(out, /costSliceCeiling/);
});

test("explainHalts: gradeTrend populated → renders consecutiveBelow + threshold + action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: { consecutiveBelow: 3, threshold: 0.8 }
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Grade trend/);
  assert.match(out, /Consecutive slices below threshold: 3/);
  assert.match(out, /Threshold: 0\.8/);
  assert.match(out, /warnAlertCategoriesIgnoredInAutoMode/);
});

test("explainHalts: multiple halts → renders ALL fired in registry order", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: {
        triggered: true,
        currentUsd: 100,
        medianUsd: 20,
        thresholdUsd: 60,
        multiplier: 3,
        window: 5,
        sampleCount: 5
      },
      sessionDrift: { triggered: true, sessionIdAtStart: "a", sessionIdNow: "b" },
      sliceCostCeiling: { exceeded: true, actualUsd: 80, ceilingUsd: 75 },
      gradeTrend: { consecutiveBelow: 3, threshold: 0.8 },
      mergeFailed: {
        slice: "SLICE-64",
        feature: "FEAT-062",
        failedStep: "rebase",
        code: "REBASE_CONFLICT",
        attemptedBranch: "slice/SLICE-64",
        attemptedWorktree: "/tmp/worktree"
      },
      redundantReadStop: {
        triggered: true,
        maxReadCount: 30,
        path: "/repo/CLAUDE.md",
        sessionId: "abc123",
        threshold: 5,
        offendingPathCount: 1
      },
      marathonCheckpoint: {
        level: "hard",
        closesSinceCheckpoint: 8,
        every: 4,
        hardThreshold: 8,
        lastRetroPath: "/repo/.claude/artifacts/loop/retrospectives/2026-06-10.md"
      },
      pausedForExternalEvent: {
        triggered: true,
        reason: "waiting for CI",
        resumeHint: "Run: bun src/scripts/loop.mts resume --repo .",
        pausedAt: "2026-06-13T12:00:00.000Z"
      },
      stuckDetected: {
        sliceId: "SLICE-119",
        attempts: 3,
        threshold: 3,
        lastAttemptAt: "2026-06-13T12:00:00.000Z"
      }
    }
  };
  const out = explainHalts(brief);
  // All gate headings present
  for (const badge of HALT_BADGES) {
    assert.ok(
      out.includes(`### ${badge.gateName}`),
      `expected gate heading for ${badge.field} in output`
    );
  }
  // Order matches HALT_BADGES order
  const positions = HALT_BADGES.map((b) => out.indexOf(`### ${b.gateName}`));
  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i]! > positions[i - 1]!,
      `expected ${HALT_BADGES[i]!.gateName} to appear after ${HALT_BADGES[i - 1]!.gateName}`
    );
  }
});

test("explainHalts: top-level fields (loop brief shape, not stop-check) also detected", () => {
  // loop brief currently surfaces costRegression + sessionDrift at top level.
  const brief: Record<string, any> = {
    costRegression: {
      triggered: true,
      currentUsd: 50,
      medianUsd: 10,
      thresholdUsd: 30,
      multiplier: 3,
      window: 5,
      sampleCount: 5
    },
    sessionDrift: null
  };
  const out = explainHalts(brief);
  assert.match(out, /### Cost regression/);
});

test("explainHalts: malformed snapshot field (missing inner fields) does not crash", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: { triggered: true }, // no numeric fields
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  // Should not throw — undefined values render as 'undefined' but no exception
  const out = explainHalts(brief);
  assert.match(out, /### Cost regression/);
});

test("explainHalts: unknown registry field on snapshot is ignored (graceful degrade)", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null,
      futureHalt: { triggered: true, someValue: 42 }
    }
  };
  const out = explainHalts(brief);
  // No registry entry → No halts rendered
  assert.match(out, /No halts active\./);
  assert.equal(out.includes("futureHalt"), false);
});

test("HALT_BADGES registry has the 9 known fields in expected order", () => {
  const fields = HALT_BADGES.map((b) => b.field);
  assert.deepEqual(fields, [
    "costRegression",
    "sessionDrift",
    "sliceCostCeiling",
    "gradeTrend",
    "mergeFailed",
    "redundantReadStop",
    "marathonCheckpoint",
    "pausedForExternalEvent",
    "stuckDetected"
  ]);
});

```

### src/tests/stuck-detector.test.mts

```
// Tests for FEAT-130 / SLICE-119: stuck-detector check function.
import { test, describe, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkStuckDetector } from "../scripts/lib/stuck-detector.mjs";

const STUCK_REL = path.join(".claude", "state", "loop", "stuck-detector.json");

async function makeTempRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeStuckFile(repoPath: string, content: unknown): Promise<void> {
  const dir = path.join(repoPath, ".claude", "state", "loop");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(repoPath, STUCK_REL), JSON.stringify(content), "utf8");
}

describe("checkStuckDetector", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempRepo("stuck-test-");
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns null when stuck-detector.json absent", async () => {
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns null on malformed JSON", async () => {
    const dir = path.join(tmpDir, ".claude", "state", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, STUCK_REL), "{ not json }", "utf8");
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns null when attempts missing (invalid shape)", async () => {
    await writeStuckFile(tmpDir, { sliceId: "SLICE-119" });
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns null when attempts < threshold (default 3)", async () => {
    await writeStuckFile(tmpDir, {
      sliceId: "SLICE-119",
      attempts: 2,
      lastAttemptAt: new Date().toISOString()
    });
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns signal when attempts >= threshold (default 3)", async () => {
    const lastAttemptAt = new Date().toISOString();
    await writeStuckFile(tmpDir, { sliceId: "SLICE-119", attempts: 3, lastAttemptAt });
    const result = await checkStuckDetector(tmpDir);
    assert.ok(result !== null);
    assert.equal(result!.sliceId, "SLICE-119");
    assert.equal(result!.attempts, 3);
    assert.equal(result!.threshold, 3);
    assert.equal(result!.lastAttemptAt, lastAttemptAt);
  });

  test("returns null when file content is a JSON array", async () => {
    await writeStuckFile(tmpDir, [{ sliceId: "SLICE-119", attempts: 5 }]);
    assert.equal(await checkStuckDetector(tmpDir), null);
  });

  test("returns signal when attempts > threshold", async () => {
    await writeStuckFile(tmpDir, {
      sliceId: "SLICE-100",
      attempts: 7,
      lastAttemptAt: new Date().toISOString()
    });
    const result = await checkStuckDetector(tmpDir);
    assert.ok(result !== null);
    assert.equal(result!.attempts, 7);
  });
});

```

## Files read

