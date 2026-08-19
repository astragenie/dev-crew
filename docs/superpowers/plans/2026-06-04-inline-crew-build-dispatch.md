# Inline `/devcrew:build` Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `Dispatch devcrew:lead subagent` with `Invoke the \`devcrew:build\` skill` in `buildDispatchInstruction()`, and surface the feature file path in the dispatch context block.

**Architecture:** Pure text change in `dispatch.mts` dispatch prompt + `readFeatureExcerpt` return-type change from `string|null` to `{path,excerpt}|null`. `start-slice.mts` threads the path through. Tests updated to match new text.

**Tech Stack:** TypeScript (ESM), Node `node:test`, `node:assert/strict`. Build: `npm test` (runs tsc then tests). Lint: `npm run lint`. Format: `npm run format:check`.

---

### Task 1: Update `readFeatureExcerpt` to return `{path, excerpt}`

**Files:**
- Modify: `src/scripts/lib/slice-linker/dispatch.mts:92-102`

- [ ] **Step 1: Write the failing test**

In `src/tests/slice-linker.test.mts`, add after the existing `buildDispatchInstruction` tests:

```typescript
test("readFeatureExcerpt returns {path, excerpt} object", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rfe-"));
  const dir = path.join(tmp, "in-progress");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "FEAT-001.md"),
    "---\nid: FEAT-001\n---\n# FEAT-001\n\n## Description\n\nTest feature description.\n"
  );
  const config = { backlog: { root: tmp } };
  const result = await readFeatureExcerpt(tmp, "FEAT-001", config);
  assert.ok(result !== null);
  assert.strictEqual(typeof result.path, "string");
  assert.match(result.path, /FEAT-001\.md$/);
  assert.match(result.excerpt, /Test feature description/);
  await fs.rm(tmp, { recursive: true });
});

test("readFeatureExcerpt returns null when feature not found", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rfe-"));
  const config = { backlog: { root: tmp } };
  const result = await readFeatureExcerpt(tmp, "FEAT-999", config);
  assert.strictEqual(result, null);
  await fs.rm(tmp, { recursive: true });
});
```

Make sure `readFeatureExcerpt` is in the import at the top of the test file:
```typescript
import { sliceFromFeature, buildDispatchInstruction, readFeatureExcerpt } from "../scripts/lib/slice-linker.mjs";
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test 2>&1 | grep -A3 "readFeatureExcerpt returns"
```

Expected: two test failures (function returns string not object).

- [ ] **Step 3: Update `readFeatureExcerpt` in `dispatch.mts`**

Replace lines 92–102:

```typescript
export async function readFeatureExcerpt(repoPath, featureId, config) {
  const root = resolveBacklogRoot(repoPath, config);
  for (const dir of ["in-progress", "triaged", "pending", "done"]) {
    const p = path.join(root, dir, `${featureId}.md`);
    const content = await fs.readFile(p, "utf8").catch(() => null);
    if (content) {
      const excerpt = extractSection(content, /^##\s+Description\s*$/i, { maxLen: 400, joinChar: "\n" });
      return { path: p, excerpt: excerpt ?? "" };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests — expect new tests pass, old callers break**

```bash
npm test 2>&1 | grep -E "fail|readFeatureExcerpt"
```

Expected: new tests pass; `start-slice.mts` callers that pass the old string to `featureExcerpt` will now receive `{path,excerpt}` — TypeScript will catch this if strict, otherwise tests for the context block will catch it in Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/slice-linker/dispatch.mts src/tests/slice-linker.test.mts
git commit -m "refactor(dispatch): readFeatureExcerpt returns {path, excerpt} object"
```

---

### Task 2: Update `appendContextBlock` and `buildDispatchInstruction` to use feature path

**Files:**
- Modify: `src/scripts/lib/slice-linker/dispatch.mts:16-23` (appendContextBlock)
- Modify: `src/scripts/lib/slice-linker/dispatch.mts:39-62` (buildDispatchInstruction)

- [ ] **Step 1: Write failing test for feature path in context block**

In `src/tests/slice-linker.test.mts`, add after the Task 1 tests:

```typescript
test("buildDispatchInstruction with featurePath renders Path line in context block", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-99",
    title: "SLICE-99",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: "test goal",
    featureId: "FEAT-001",
    featureExcerpt: "A description.",
    featurePath: "/repo/.claude/artifacts/loop/backlog/in-progress/FEAT-001.md"
  });
  assert.match(result, /### Feature: FEAT-001/);
  assert.match(result, /Path: .*FEAT-001\.md/);
  assert.match(result, /A description\./);
});

test("buildDispatchInstruction without featurePath omits Path line", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-99",
    title: "SLICE-99",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: "test goal",
    featureId: "FEAT-001",
    featureExcerpt: "A description.",
    featurePath: null
  });
  assert.match(result, /### Feature: FEAT-001/);
  assert.doesNotMatch(result, /^Path:/m);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test 2>&1 | grep -A3 "featurePath renders\|featurePath omits"
```

Expected: both fail (`featurePath` not a known param).

- [ ] **Step 3: Update `appendContextBlock` to accept and render featurePath**

Replace lines 16–24 in `dispatch.mts`:

```typescript
function appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath = null) {
  if (!sliceContent && !featureExcerpt) return;
  lines.push("", "## Slice context (pre-read — do not re-read these files)", "");
  if (rel && sliceContent) {
    lines.push(`### Slice: ${rel}`, "", sliceContent);
  }
  if (featureId && featureExcerpt) {
    lines.push("", `### Feature: ${featureId}`);
    if (featurePath) lines.push(`Path: ${featurePath}`);
    lines.push("", featureExcerpt);
  }
}
```

- [ ] **Step 4: Update `buildDispatchInstruction` to accept `featurePath` and pass it through**

Replace lines 39–62 in `dispatch.mts` (the function signature and the `appendContextBlock` call):

```typescript
export function buildDispatchInstruction({
  sliceId,
  title,
  sliceFile,
  repoPath,
  resolvedGoal,
  featureId = null,
  sliceContent = null,
  featureExcerpt = null,
  featurePath = null,
  dispatchLimits = null as any
}) {
  const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;
  const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
  const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
  const suffix = buildBudgetLine(dispatchLimits);
  const lines = [
    `Dispatch devcrew:lead subagent with this prompt:`,
    "",
    `> Lead the implementation of ${title}.${sliceRef}${goalLine} Run the full crew lead workflow: frame the work (in-scope / out-of-scope / mode choice), implement via single-session, assisted single-session, or team run (delegating to \`devcrew:fullstack-dev\` when scope warrants), require independent review via \`devcrew:inspector\` when code changes, and validation via \`devcrew:verifier\` when behavior is exercisable, then synthesize. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, pivot through /devcrew:fix before resuming.${suffix}`
  ];
  appendProgressSignals(lines);
  appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath);
  return lines.join("\n");
}
```

- [ ] **Step 5: Run tests — new tests should pass**

```bash
npm test 2>&1 | grep -E "fail|featurePath"
```

Expected: both new tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/slice-linker/dispatch.mts src/tests/slice-linker.test.mts
git commit -m "feat(dispatch): surface feature file path in context block"
```

---

### Task 3: Thread `featurePath` through `start-slice.mts`

**Files:**
- Modify: `src/scripts/lib/slice-linker/start-slice.mts:183-221` (collectSliceStartData)
- Modify: `src/scripts/lib/slice-linker/start-slice.mts:258-288` (buildStartSliceReturn)

- [ ] **Step 1: Write failing test**

In `src/tests/slice-start.test.mts`, find the existing test at line ~90 that asserts `dispatchInstruction` matches `/Dispatch devcrew:lead subagent/`. After that test, add:

```typescript
test("startSlice threads featurePath into dispatchInstruction context block", async () => {
  // This is an integration-style check: if readFeatureExcerpt found a feature,
  // the resulting dispatchInstruction should contain a Path: line.
  // We verify the wiring by checking that buildDispatchInstruction receives featurePath
  // by checking the output shape — use a known fixture with featureId wired.
  // Since startSlice hits disk, we check the unit-level: buildStartSliceReturn.
  const { buildStartSliceReturn } = await import("../scripts/lib/slice-linker/start-slice.mjs");
  const result = buildStartSliceReturn({
    sliceId: "SLICE-01",
    title: "SLICE-01",
    activePlan: { planPath: null, source: null },
    runBrief: null,
    sliceProgress: { completedCount: 0, totalCount: 1 },
    dispatch: true,
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: "test",
    featureId: "FEAT-001",
    featureExcerpt: "desc",
    featurePath: "/repo/.claude/artifacts/loop/backlog/in-progress/FEAT-001.md"
  });
  assert.match(result.dispatchInstruction ?? "", /Path: .*FEAT-001\.md/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test 2>&1 | grep -A3 "threads featurePath"
```

Expected: FAIL — `buildStartSliceReturn` doesn't accept `featurePath` yet.

- [ ] **Step 3: Update `collectSliceStartData` to extract path from `readFeatureExcerpt` result**

In `start-slice.mts` lines 183–221, update the `featureExcerpt` destructure:

```typescript
// line 201 — change:
featureId ? readFeatureExcerpt(repoPath, featureId, resolved) : Promise.resolve(null),
```

Then in the destructure (line 185), rename to capture both fields:

```typescript
const [runBrief, gradeTrend, featureResult, marathonMilestone, learningsResult, planPreflight] =
  await Promise.all([
    // ... same as before
    featureId ? readFeatureExcerpt(repoPath, featureId, resolved) : Promise.resolve(null),
    // ...
  ]);
```

Then after line 211, add:

```typescript
const featureExcerpt = featureResult?.excerpt ?? null;
const featurePath = featureResult?.path ?? null;
```

And update the return object (lines 213–221) to include `featurePath`:

```typescript
return {
  runBrief,
  featureExcerpt,
  featurePath,
  marathonMilestone,
  gradeTrendCaution,
  learningsDigest,
  planPreflight,
  recentGradeAvg
};
```

- [ ] **Step 4: Update `buildStartSliceReturn` destructure and `buildDispatchInstruction` call**

In `start-slice.mts` lines 258–288, add `featurePath` to the destructured params:

```typescript
featurePath = null as any,
```

And update the `buildDispatchInstruction` call (lines 276–287) to pass it:

```typescript
const dispatchInstruction = dispatch
  ? buildDispatchInstruction({
      sliceId,
      title,
      sliceFile,
      repoPath,
      resolvedGoal,
      featureId,
      sliceContent,
      featureExcerpt,
      featurePath,
      dispatchLimits
    })
  : null;
```

- [ ] **Step 5: Run tests — new test should pass**

```bash
npm test 2>&1 | grep -E "fail|featurePath"
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/slice-linker/start-slice.mts
git commit -m "feat(dispatch): thread featurePath through start-slice into dispatch context"
```

---

### Task 4: Rewrite dispatch text to invoke `/devcrew:build` skill

**Files:**
- Modify: `src/scripts/lib/slice-linker/dispatch.mts:54-57` (the lines array in buildDispatchInstruction)

- [ ] **Step 1: Update failing test first**

In `src/tests/slice-linker.test.mts` line 139, change:

```typescript
assert.match(result, /Dispatch devcrew:lead/);
```

to:

```typescript
assert.match(result, /Invoke the `devcrew:build` skill/);
```

Also update the test at line 116 (`buildDispatchInstruction with featureExcerpt embeds feature section`) — if it asserts on the dispatch opener, update it similarly.

- [ ] **Step 2: Update test in `slice-start.test.mts` lines 96 and 99**

Change:

```typescript
assert.match(result.dispatchInstruction, /Dispatch devcrew:lead subagent/);
// ...
assert.match(result.nextAction, /Dispatch devcrew:lead subagent/);
```

to:

```typescript
assert.match(result.dispatchInstruction, /Invoke the `devcrew:build` skill/);
// ...
assert.match(result.nextAction, /devcrew:build/);
```

- [ ] **Step 3: Run tests to verify they now fail**

```bash
npm test 2>&1 | grep -E "fail|devcrew:build|devcrew:lead"
```

Expected: the two updated assertions fail (text still says `Dispatch devcrew:lead`).

- [ ] **Step 4: Rewrite the dispatch text in `buildDispatchInstruction`**

In `dispatch.mts`, replace lines 54–57 (the `lines` array initialization):

```typescript
  const lines = [
    `Invoke the \`devcrew:build\` skill with this context:`,
    "",
    `> **Slice:** ${sliceId} — ${title}.${sliceRef}`,
    `> **Goal:** ${goalLine ? resolvedGoal.slice(0, 200) : "(see slice file)"}`,
    `> **Mode preference:** single-session unless the slice has explicit multi-file parallel work.`,
    `> Run the full crew build workflow (frame → implement → review → validate → synthesize). Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, use /devcrew:fix before returning.${suffix}`
  ];
```

- [ ] **Step 5: Update `computeNextAction` text**

In `start-slice.mts`, find the `computeNextAction` function and update any string that says `Dispatch devcrew:lead subagent` to `Invoke devcrew:build skill`. Search:

```bash
grep -n "Dispatch devcrew:lead\|devcrew:lead subagent" src/scripts/lib/slice-linker/start-slice.mts
```

Replace each match with the equivalent `devcrew:build` phrasing.

- [ ] **Step 6: Run all tests**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass (683+ / 0 fail).

- [ ] **Step 7: Commit**

```bash
git add src/scripts/lib/slice-linker/dispatch.mts src/scripts/lib/slice-linker/start-slice.mts src/tests/slice-linker.test.mts src/tests/slice-start.test.mts
git commit -m "feat(dispatch): invoke devcrew:build skill inline instead of devcrew:lead subagent"
```

---

### Task 5: Update rules and templates

**Files:**
- Modify: `.claude/loop/rules.md` (dispatch table)
- Modify: `templates/loop-rules.md` (mirror)

- [ ] **Step 1: Update `.claude/loop/rules.md`**

Find the dispatch table row:

```
| Slice implementation (acceptance criteria work)                   | `devcrew:lead` subagent (which delegates to `devcrew:fullstack-dev`)    |
```

Change to:

```
| Slice implementation (acceptance criteria work)                   | `devcrew:build` skill (inline — orchestrator acts as lead)     |
```

Also find any prose that says "Dispatch devcrew:lead subagent" (in the numbered dispatch steps) and update to "Invoke the `devcrew:build` skill".

- [ ] **Step 2: Mirror the same change in `templates/loop-rules.md`**

Same search-and-replace: `devcrew:lead subagent (which delegates to \`devcrew:fullstack-dev\`)` → `devcrew:build skill (inline — orchestrator acts as lead)`.

- [ ] **Step 3: Verify manifests and content-length**

```bash
node scripts/validate-manifests.mjs && node scripts/validate-content-length.mjs
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .claude/loop/rules.md templates/loop-rules.md
git commit -m "docs(rules): update dispatch table — devcrew:build skill replaces devcrew:lead subagent"
```

---

### Task 6: Full gates + rebuild compiled outputs

**Files:**
- Modify: `scripts/lib/slice-linker/dispatch.mjs` (auto-generated)
- Modify: `scripts/lib/slice-linker/start-slice.mjs` (auto-generated)
- Modify: `scripts/lib/slice-linker.mjs` (auto-generated, re-exports)

- [ ] **Step 1: Run full gate suite**

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

Expected: all clean, all tests pass.

- [ ] **Step 2: Verify compiled outputs are in sync**

```bash
git diff --exit-code scripts/
```

If diff is non-empty, `npm test` already ran `tsc` — the compiled files should be updated. If they're dirty, stage them:

```bash
git add scripts/
```

- [ ] **Step 3: Run manifests + content-length one more time**

```bash
node scripts/validate-manifests.mjs && node scripts/validate-content-length.mjs
```

- [ ] **Step 4: Final commit**

```bash
git add scripts/
git commit -m "build: regenerate compiled outputs for inline devcrew:build dispatch"
```

---

### Task 7: Verify CLAUDE.md + snapshot

**Files:**
- Read: `CLAUDE.md` (check if it references devcrew:lead dispatch — update if so)
- Run: `/loop:snapshot-memory` (update loop-snapshot.md)

- [ ] **Step 1: Check CLAUDE.md for stale devcrew:lead references**

```bash
grep -n "devcrew:lead\|Dispatch crew" CLAUDE.md
```

If any matches, update the relevant lines to reference `devcrew:build skill`.

- [ ] **Step 2: Commit CLAUDE.md if changed**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): update dispatch reference to devcrew:build skill"
```

- [ ] **Step 3: Run snapshot**

```bash
node "C:/Users/serge/.claude/plugins/cache/astra/loop/0.7.3/scripts/loop.mjs" snapshot-memory --repo "$PWD"
```

- [ ] **Step 4: Commit snapshot**

```bash
git add .claude/artifacts/loop/loop-snapshot.md
git commit -m "chore(snapshot): post-dispatch-change memory snapshot"
```
