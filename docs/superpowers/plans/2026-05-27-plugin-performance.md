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
    `Dispatch /devcrew:build subagent with this prompt:`,
    "",
    `> Implement ${title}.${sliceRef}${goalLine} Follow the full crew build workflow (frame → implement → review → validate → synthesize). For review, dispatch a \`devcrew:inspector\` subagent. For validation, dispatch a \`devcrew:verifier\` subagent. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, pivot through /devcrew:fix before resuming.${modelLine}`
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
- **Dispatch discipline.** Hand work to `/devcrew:build` subagent; never implement inline.
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
