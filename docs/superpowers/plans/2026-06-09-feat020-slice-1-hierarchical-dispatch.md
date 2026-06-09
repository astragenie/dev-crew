# FEAT-020 SLICE-1 — Hierarchical Parallel Dispatch (loop library) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a loop-owned hierarchical parallel subagent dispatch primitive: library + CLI subcommand + thin agent wrapper, with recursion depth cap, worktree-per-child isolation, blocking awaitAll API, and continue-on-failure semantics.

**Architecture:** A single TypeScript library (`src/scripts/lib/hierarchical-dispatch.mts`) exports `dispatchHierarchical()`. A new `node scripts/loop.mjs dispatch` CLI subcommand and a `loop:hierarchical-dispatcher` agent both call into it. Children run in isolated git worktrees forked from the parent branch; grandchildren fork off the child's branch. Parent merges DONE children sequentially in priority order. Slice-2 (out of scope here) refactors `crew:parallel-runner` to call the same library.

**Tech Stack:** Node.js ESM, TypeScript (`.mts` → `.mjs` via tsc), Node test runner (`node --test`), git CLI for worktree ops, `.claude/loop.json` for config.

**Spec reference:** `docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md`

> **Note (added when execution strategy switched to parallel):** The spec describes the library as a single file. The plan splits it into 10 small modules to enable task-parallel execution. External callers see a single import surface via the `hierarchical-dispatch.mts` barrel re-export module — the spec's API contract is preserved. Spec has been annotated.

> **Per-module imports:** Every Wave 2+ module file begins with `import type { DispatchConfig, DispatchPlan, DispatchResult, DispatchOptions, DispatchStatus } from './dispatch-types.mjs';` plus error-class imports as the module uses them. The code blocks in each task below show only the exported function bodies — add the imports at the top of the file as needed.

---

## File Structure

The library is split into **10 small modules** (one responsibility each) to enable task-parallel execution. A single barrel module `hierarchical-dispatch.mts` re-exports everything so external callers keep a single import surface.

| File | Status | Responsibility | Task | Wave |
|---|---|---|---|---|
| `src/scripts/lib/dispatch-types.mts` | Create | All exported types + error classes. Foundation — every other module imports from this. | T1 | 1 |
| `src/scripts/lib/dispatch-config.mts` | Create | `readDispatchConfig` — `.claude/loop.json` reader with defaults | T2 | 2 |
| `src/scripts/lib/dispatch-gates.mts` | Create | `checkDepth`, `checkFanout`, `checkUniqueIds`, `validateBranchName` | T3 | 2 |
| `src/scripts/lib/dispatch-prompt.mts` | Create | `augmentPrompt` — depth+1 / runId / marker contract injection | T5 | 2 |
| `src/scripts/lib/dispatch-trace.mts` | Create | `readMarker`, `appendTrace`, marker contract writer helpers | T6 | 2 |
| `src/scripts/lib/dispatch-worktree.mts` | Create | `preflightGitClean`, `createChildWorktree`, `removeChildWorktree` | T4 | 3 |
| `src/scripts/lib/dispatch-batch.mts` | Create | `buildAgentBatch` — applies `augmentPrompt` across plans | T7 | 3 |
| `src/scripts/lib/dispatch-aggregate.mts` | Create | `aggregateResults` — marker-driven result construction | T8 | 3 |
| `src/scripts/lib/dispatch-merge.mts` | Create | `mergeChildren` — priority-ordered merge with conflict handling | T9 | 4 |
| `src/scripts/lib/hierarchical-dispatch.mts` | Create | `prepareDispatch`, `finalizeDispatch`, `dispatchHierarchical` orchestrator + barrel re-export of all module exports | T10 | 5 |
| `src/scripts/dispatch.mts` | Create | CLI subcommand entry: `prepare` / `finalize` / `--dry-run` | T11 | 6 |
| `src/scripts/loop.mts` | Modify | Add `dispatch` to subcommand dispatch table + help text | T12 | 7 |
| `agents/hierarchical-dispatcher.md` | Create | Thin agent wrapper — parses caller request, builds plan, shells out, returns summary | T13 | 6 |
| `src/tests/dispatch-*.test.mts` | Create | Per-module unit tests (one file per library module) | each library task | matches |
| `src/tests/hierarchical-dispatch.integration.test.mts` | Create | End-to-end against tmpdir git repo with Agent seam stubbed | T14 | 7 |
| `README.md` | Modify | Document `dispatchLimits.*` config keys + CLI | T15 | 6 |
| `CHANGELOG.md` | Modify | SLICE-1 entry | T15 | 6 |

### Single import surface (preserved despite split)

External callers (CLI, agent, tests) import from `hierarchical-dispatch.mjs`:

```typescript
// Task 10 re-exports everything:
export * from "./dispatch-types.mjs";
export * from "./dispatch-config.mjs";
export * from "./dispatch-gates.mjs";
export * from "./dispatch-prompt.mjs";
export * from "./dispatch-trace.mjs";
export * from "./dispatch-worktree.mjs";
export * from "./dispatch-batch.mjs";
export * from "./dispatch-aggregate.mjs";
export * from "./dispatch-merge.mjs";
// + the orchestrator functions defined in this file
```

Code blocks in Tasks 2–9 below show implementations that live in their own files (not appended to a shared file) but the test imports continue to point at `../scripts/lib/hierarchical-dispatch.mjs` to verify the barrel re-export works end-to-end.

---

## Parallel Execution Plan

Tasks within a single wave have no inter-task file collisions and no dependency edges between them — they execute concurrently as a single batch (one subagent per task in `superpowers:subagent-driven-development`, or one parallel `Agent` block from the inline executor).

```
Wave 1 (1 task):  T1 — dispatch-types.mts
                       ↓
Wave 2 (4 tasks): T2 — dispatch-config.mts
                  T3 — dispatch-gates.mts
                  T5 — dispatch-prompt.mts
                  T6 — dispatch-trace.mts
                       ↓
Wave 3 (3 tasks): T4 — dispatch-worktree.mts        (needs T3.validateBranchName)
                  T7 — dispatch-batch.mts            (needs T5.augmentPrompt)
                  T8 — dispatch-aggregate.mts        (needs T6.readMarker)
                       ↓
Wave 4 (1 task):  T9 — dispatch-merge.mts            (needs T4.removeChildWorktree)
                       ↓
Wave 5 (1 task):  T10 — hierarchical-dispatch.mts    (re-export barrel + orchestrator,
                                                      needs ALL prior modules)
                       ↓
Wave 6 (3 tasks): T11 — dispatch.mts (CLI)
                  T13 — agents/hierarchical-dispatcher.md
                  T15 — README + CHANGELOG
                       ↓
Wave 7 (2 tasks): T12 — wire dispatch into loop.mts  (modifies loop.mts)
                  T14 — integration tests             (independent test file)
```

**Wall-clock savings:** sequential = 15 task-slots. Parallel = 7 waves = ~7 task-slot durations (each wave bounded by its slowest task). Roughly 2× speedup, more if waves 2 and 6 tasks finish near-simultaneously.

**File collision check:** each task in a parallel wave creates a distinct file. No two wave-siblings modify the same file. Wave 5 (T10) and Wave 7 (T12, T14) are the only two waves modifying the existing `loop.mts` — both touch different files (T12 is the only one modifying `loop.mts`; T14 only creates a new test file).

**Test parallelism:** each library task creates its own test file (`src/tests/dispatch-config.test.mts`, etc.). No shared test file → no test-file collision. Engineer running `npm test` after every task only triggers their own file.

---

## Task 1 (Wave 1): Foundation — `dispatch-types.mts` + test helpers

**Files:**
- Create: `src/scripts/lib/dispatch-types.mts` — all types + error classes
- Create: `src/tests/dispatch-types.test.mts` — test for error class shapes
- Create: `src/tests/dispatch-test-helpers.mts` — shared `tmpRepo()`, `initRepo()`, `makeStubAgent()`; imported by all later test files

- [ ] **Step 1: Write the failing test for error class shape**

Create `src/tests/dispatch-types.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DispatchDepthExceeded,
  DispatchFanoutExceeded,
  DispatchWorktreeError,
  DispatchConfigError,
} from "../scripts/lib/dispatch-types.mjs";

test("DispatchDepthExceeded is an Error with .name set", () => {
  const e = new DispatchDepthExceeded("depth 3 >= cap 3");
  assert.ok(e instanceof Error);
  assert.equal(e.name, "DispatchDepthExceeded");
  assert.equal(e.message, "depth 3 >= cap 3");
});

test("DispatchFanoutExceeded carries plan count", () => {
  const e = new DispatchFanoutExceeded("9 > 8");
  assert.ok(e instanceof Error);
  assert.equal(e.name, "DispatchFanoutExceeded");
});

test("DispatchWorktreeError carries git context", () => {
  const e = new DispatchWorktreeError("dirty tree on slice/SLICE-90");
  assert.equal(e.name, "DispatchWorktreeError");
});

test("DispatchConfigError carries config detail", () => {
  const e = new DispatchConfigError("duplicate child id: FE");
  assert.equal(e.name, "DispatchConfigError");
});
```

- [ ] **Step 2: Build + run test to verify it fails**

Run:
```bash
npm run typecheck && npm test -- --test-name-pattern="DispatchDepthExceeded"
```
Expected: typecheck FAILS with `Cannot find module '../scripts/lib/dispatch-types.mjs'`.

- [ ] **Step 3: Create the types + error class module**

Create `src/scripts/lib/dispatch-types.mts`:

```typescript
// FEAT-020 SLICE-1 — Types + error classes (foundation module).
// Spec: docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md

export type DispatchStatus = "DONE" | "FAILED" | "BLOCKED" | "CONFLICTED";

export type DispatchPlan = {
  id: string;
  priority: number;
  agentType: string;
  prompt: string;
  branch?: string;
};

export type DispatchResult = {
  id: string;
  status: DispatchStatus;
  branch: string;
  worktreePath: string;
  childResults?: DispatchResult[];
  artifactPath?: string;
  error?: string;
  costUsd?: number | null;
};

export type DispatchOptions = {
  parentBranch: string;
  repoRoot: string;
  depth?: number;
  configPath?: string;
  onChildFailure?: "continue";
};

export type DispatchConfig = {
  maxDepth: number;
  maxChildrenPerBatch: number;
  worktreeRoot: string | null;
  pruneStaleAfterDays: number;
};

export class DispatchDepthExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchDepthExceeded";
  }
}

export class DispatchFanoutExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchFanoutExceeded";
  }
}

export class DispatchWorktreeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchWorktreeError";
  }
}

export class DispatchConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchConfigError";
  }
}
```

- [ ] **Step 4: Build + run test to verify it passes**

```bash
npm run typecheck && npm test -- --test-name-pattern="Dispatch"
```
Expected: 4 tests PASS.

- [ ] **Step 5: Create the shared test helpers module**

Create `src/tests/dispatch-test-helpers.mts`:

```typescript
// @ts-nocheck
// Shared test helpers for the dispatch-* test suite.
// Imported by every dispatch-*.test.mts file.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

export function tmpRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "loop-dispatch-test-"));
}

export function initRepo(): string {
  const dir = tmpRepo();
  execSync("git init -q -b main", { cwd: dir });
  execSync('git config user.email "test@example.com"', { cwd: dir });
  execSync('git config user.name "Test"', { cwd: dir });
  fs.writeFileSync(path.join(dir, "README.md"), "# test\n");
  execSync("git add . && git commit -q -m init", { cwd: dir });
  return dir;
}

export function makeStubAgent(
  repo: string,
  perChild: (id: string, cwd: string) => { status: "DONE" | "FAILED" | "BLOCKED"; commit?: string },
) {
  return async (
    batch: any[],
    ctx: { runId: string; cwdById: Record<string, string>; branchById: Record<string, string> },
  ) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      const branch = ctx.branchById[id];
      const action = perChild(id, cwd);
      if (action.commit) {
        fs.writeFileSync(path.join(cwd, action.commit), `${id}\n`);
        execSync(`git add . && git commit -qm "child ${id}"`, { cwd });
      }
      const marker = {
        id, status: action.status, branch, worktreePath: cwd,
        ...(action.status !== "DONE" ? { error: "stub failure" } : {}),
      };
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify(marker));
    }
  };
}
```

- [ ] **Step 6: Verify helpers compile (no test cases yet, just import-side)**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/lib/dispatch-types.mts src/tests/dispatch-types.test.mts src/tests/dispatch-test-helpers.mts
git commit -m "feat(dispatch): foundation — types + error classes + test helpers (FEAT-020)"
```

---

## Task 2 (Wave 2 — parallel with T3, T5, T6): Config reader

**Files:**
- Create: `src/scripts/lib/dispatch-config.mts`
- Create: `src/tests/dispatch-config.test.mts`

Depends on: T1 (types).

- [ ] **Step 1: Write the failing tests**

Create `src/tests/dispatch-config.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpRepo } from "./dispatch-test-helpers.mjs";
import { readDispatchConfig } from "../scripts/lib/dispatch-config.mjs";

test("readDispatchConfig: missing file returns defaults", () => {
  const dir = tmpRepo();
  const cfg = readDispatchConfig(path.join(dir, "loop.json"));
  assert.equal(cfg.maxDepth, 3);
  assert.equal(cfg.maxChildrenPerBatch, 8);
  assert.equal(cfg.worktreeRoot, null);
  assert.equal(cfg.pruneStaleAfterDays, 7);
});

test("readDispatchConfig: explicit override honored", () => {
  const dir = tmpRepo();
  const cfgPath = path.join(dir, "loop.json");
  fs.writeFileSync(cfgPath, JSON.stringify({
    dispatchLimits: { maxDepth: 5, maxChildrenPerBatch: 12 },
  }));
  const cfg = readDispatchConfig(cfgPath);
  assert.equal(cfg.maxDepth, 5);
  assert.equal(cfg.maxChildrenPerBatch, 12);
  assert.equal(cfg.pruneStaleAfterDays, 7); // unspecified → default
});

test("readDispatchConfig: malformed JSON throws DispatchConfigError", () => {
  const dir = tmpRepo();
  const cfgPath = path.join(dir, "loop.json");
  fs.writeFileSync(cfgPath, "{ not json");
  assert.throws(
    () => readDispatchConfig(cfgPath),
    (e: Error) => e.name === "DispatchConfigError",
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: typecheck FAILS — `dispatch-config.mjs` not found.

- [ ] **Step 3: Implement config reader**

Create `src/scripts/lib/dispatch-config.mts`:

```typescript
import fs from "node:fs";
import type { DispatchConfig } from "./dispatch-types.mjs";
import { DispatchConfigError } from "./dispatch-types.mjs";

const DEFAULT_CONFIG: DispatchConfig = {
  maxDepth: 3,
  maxChildrenPerBatch: 8,
  worktreeRoot: null,
  pruneStaleAfterDays: 7,
};

export function readDispatchConfig(configPath: string): DispatchConfig {
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    throw new DispatchConfigError(`config read failed: ${(err as Error).message}`);
  }
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DispatchConfigError(`config parse failed: ${(err as Error).message}`);
  }
  const limits = (parsed.dispatchLimits ?? {}) as Record<string, unknown>;
  return {
    maxDepth: typeof limits.maxDepth === "number" ? limits.maxDepth : DEFAULT_CONFIG.maxDepth,
    maxChildrenPerBatch:
      typeof limits.maxChildrenPerBatch === "number"
        ? limits.maxChildrenPerBatch
        : DEFAULT_CONFIG.maxChildrenPerBatch,
    worktreeRoot:
      typeof limits.worktreeRoot === "string" ? limits.worktreeRoot : DEFAULT_CONFIG.worktreeRoot,
    pruneStaleAfterDays:
      typeof limits.pruneStaleAfterDays === "number"
        ? limits.pruneStaleAfterDays
        : DEFAULT_CONFIG.pruneStaleAfterDays,
  };
}
```

Note: Reads from `dispatchLimits` namespace in `.claude/loop.json` (existing key — `maxSubagentsPerSlice` already lives there per repo convention).

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run typecheck && npm test -- --test-name-pattern="readDispatchConfig"
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/dispatch-config.mts src/tests/dispatch-config.test.mts
git commit -m "feat(dispatch): add config reader under dispatchLimits namespace (FEAT-020)"
```

---

## Task 3 (Wave 2 — parallel with T2, T5, T6): Pre-flight gates

**Files:**
- Create: `src/scripts/lib/dispatch-gates.mts`
- Create: `src/tests/dispatch-gates.test.mts`

Depends on: T1 (types).

- [ ] **Step 1: Write failing tests**

Create `src/tests/dispatch-gates.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkDepth,
  checkFanout,
  checkUniqueIds,
  validateBranchName,
} from "../scripts/lib/dispatch-gates.mjs";

test("checkDepth: at cap throws DispatchDepthExceeded", () => {
  assert.throws(
    () => checkDepth(3, { maxDepth: 3 } as any),
    (e: Error) => e.name === "DispatchDepthExceeded",
  );
});

test("checkDepth: below cap does not throw", () => {
  assert.doesNotThrow(() => checkDepth(2, { maxDepth: 3 } as any));
});

test("checkDepth: env var fallback when arg undefined", () => {
  process.env.LOOP_DISPATCH_DEPTH = "3";
  try {
    assert.throws(
      () => checkDepth(undefined as any, { maxDepth: 3 } as any),
      (e: Error) => e.name === "DispatchDepthExceeded",
    );
  } finally {
    delete process.env.LOOP_DISPATCH_DEPTH;
  }
});

test("checkFanout: at cap throws DispatchFanoutExceeded", () => {
  const plans = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, priority: 0, agentType: "x", prompt: "" }));
  assert.throws(
    () => checkFanout(plans, { maxChildrenPerBatch: 8 } as any),
    (e: Error) => e.name === "DispatchFanoutExceeded",
  );
});

test("checkFanout: below cap does not throw", () => {
  const plans = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, priority: 0, agentType: "x", prompt: "" }));
  assert.doesNotThrow(() => checkFanout(plans, { maxChildrenPerBatch: 8 } as any));
});

test("checkFanout: empty plans throws DispatchConfigError", () => {
  assert.throws(
    () => checkFanout([], { maxChildrenPerBatch: 8 } as any),
    (e: Error) => e.name === "DispatchConfigError",
  );
});

test("checkUniqueIds: duplicate id throws DispatchConfigError", () => {
  assert.throws(
    () => checkUniqueIds([
      { id: "FE", priority: 0, agentType: "x", prompt: "" },
      { id: "FE", priority: 1, agentType: "x", prompt: "" },
    ]),
    (e: Error) => e.name === "DispatchConfigError" && /duplicate child id/.test(e.message),
  );
});

test("validateBranchName: rejects names with shell special chars", () => {
  assert.throws(
    () => validateBranchName("bad~name"),
    (e: Error) => e.name === "DispatchConfigError",
  );
});

test("validateBranchName: accepts slice/SLICE-90", () => {
  assert.doesNotThrow(() => validateBranchName("slice/SLICE-90"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: typecheck FAILS — none of the gate functions exported.

- [ ] **Step 3: Implement gates**

Create `src/scripts/lib/dispatch-gates.mts`:

```typescript
import type { DispatchConfig, DispatchPlan } from "./dispatch-types.mjs";
import {
  DispatchConfigError,
  DispatchDepthExceeded,
  DispatchFanoutExceeded,
} from "./dispatch-types.mjs";

export function checkDepth(depth: number | undefined, cfg: DispatchConfig): void {
  const resolved =
    typeof depth === "number"
      ? depth
      : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new DispatchDepthExceeded(`invalid depth: ${depth ?? process.env.LOOP_DISPATCH_DEPTH}`);
  }
  if (resolved >= cfg.maxDepth) {
    throw new DispatchDepthExceeded(`depth ${resolved} >= cap ${cfg.maxDepth}`);
  }
}

export function checkFanout(plans: DispatchPlan[], cfg: DispatchConfig): void {
  if (plans.length === 0) {
    throw new DispatchConfigError("plans[] is empty — nothing to dispatch");
  }
  if (plans.length > cfg.maxChildrenPerBatch) {
    throw new DispatchFanoutExceeded(
      `${plans.length} > cap ${cfg.maxChildrenPerBatch}`,
    );
  }
}

export function checkUniqueIds(plans: DispatchPlan[]): void {
  const seen = new Set<string>();
  for (const p of plans) {
    if (seen.has(p.id)) {
      throw new DispatchConfigError(`duplicate child id: ${p.id}`);
    }
    seen.add(p.id);
  }
}

// git ref-format: reject control chars, space, ~, ^, :, ?, *, [, \
const INVALID_REF_CHARS = /[\s~^:?*[\\\x00-\x1f]/;

export function validateBranchName(name: string): void {
  if (!name || INVALID_REF_CHARS.test(name)) {
    throw new DispatchConfigError(`invalid branch name: ${JSON.stringify(name)}`);
  }
  if (name.startsWith("-") || name.endsWith(".") || name.includes("..") || name.includes("@{")) {
    throw new DispatchConfigError(`invalid branch name: ${JSON.stringify(name)}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run typecheck && npm test -- --test-name-pattern="check|validateBranchName"
```
Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-gates.mts src/tests/dispatch-gates.test.mts
git commit -m "feat(dispatch): add depth/fanout/uniqueness/branch-name pre-flight gates (FEAT-020)"
```

---

## Task 4 (Wave 3 — parallel with T7, T8): Worktree spawn + cleanup

**Files:**
- Create: `src/scripts/lib/dispatch-worktree.mts`
- Create: `src/tests/dispatch-worktree.test.mts`

Depends on: T1 (types), T3 (`validateBranchName`).

These functions shell out to `git`. Tests run against a real tmpdir repo (mocking git is brittle).

- [ ] **Step 1: Write failing tests**

Create `src/tests/dispatch-worktree.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import {
  createChildWorktree,
  removeChildWorktree,
  preflightGitClean,
} from "../scripts/lib/dispatch-worktree.mjs";

test("createChildWorktree: creates worktree off parentBranch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-1", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-1",
    childId: "FE",
    depth: 0,
    runId: "test-run",
  });
  assert.ok(fs.existsSync(result.worktreePath), "worktree path exists");
  assert.match(result.branch, /slice\/SLICE-1-FE/);
  // verify worktree is on the new branch
  const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: result.worktreePath,
  }).toString().trim();
  assert.equal(branchName, result.branch);
});

test("createChildWorktree: writes worktrees.jsonl entry", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-2", { cwd: repo });
  createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-2",
    childId: "BE",
    depth: 0,
    runId: "test-run-2",
  });
  const log = fs.readFileSync(
    path.join(repo, ".claude/artifacts/loop/dispatch/test-run-2/worktrees.jsonl"),
    "utf8",
  );
  const entry = JSON.parse(log.trim());
  assert.equal(entry.childId, "BE");
  assert.equal(entry.depth, 0);
});

test("removeChildWorktree: prunes worktree + deletes branch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-3", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-3",
    childId: "RM",
    depth: 0,
    runId: "test-run-3",
  });
  removeChildWorktree(repo, result.worktreePath, result.branch);
  assert.ok(!fs.existsSync(result.worktreePath), "worktree gone");
  // branch removed
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(!branches.includes(result.branch));
});

test("preflightGitClean: dirty tree throws DispatchWorktreeError", () => {
  const repo = initRepo();
  fs.writeFileSync(path.join(repo, "dirty.txt"), "x");
  assert.throws(
    () => preflightGitClean(repo, "main"),
    (e: Error) => e.name === "DispatchWorktreeError" && /dirty/i.test(e.message),
  );
});

test("preflightGitClean: missing branch throws DispatchWorktreeError", () => {
  const repo = initRepo();
  assert.throws(
    () => preflightGitClean(repo, "ghost-branch"),
    (e: Error) => e.name === "DispatchWorktreeError",
  );
});

test("preflightGitClean: clean tree on existing branch passes", () => {
  const repo = initRepo();
  assert.doesNotThrow(() => preflightGitClean(repo, "main"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: typecheck FAILS — worktree helpers not exported.

- [ ] **Step 3: Implement worktree helpers**

Create `src/scripts/lib/dispatch-worktree.mts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DispatchWorktreeError } from "./dispatch-types.mjs";
import { validateBranchName } from "./dispatch-gates.mjs";

type SpawnArgs = {
  repoRoot: string;
  parentBranch: string;
  childId: string;
  depth: number;
  runId: string;
};

export function preflightGitClean(repoRoot: string, parentBranch: string): void {
  // 1. branch exists
  try {
    execFileSync("git", ["rev-parse", "--verify", parentBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new DispatchWorktreeError(`parentBranch not found: ${parentBranch}`);
  }
  // 2. tree clean
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
  }).toString();
  if (status.trim().length > 0) {
    throw new DispatchWorktreeError(`working tree dirty on ${parentBranch}`);
  }
  // 3. prune stale worktrees
  execFileSync("git", ["worktree", "prune"], { cwd: repoRoot });
}

export function createChildWorktree(args: SpawnArgs): {
  worktreePath: string;
  branch: string;
} {
  const { repoRoot, parentBranch, childId, depth, runId } = args;
  const childBranch = `${parentBranch}-${childId}`;
  validateBranchName(childBranch);
  const baseName = path.basename(repoRoot);
  const worktreePath = path.join(
    path.dirname(repoRoot),
    `${baseName}-${childId}-${depth}`,
  );
  try {
    execFileSync(
      "git",
      ["worktree", "add", worktreePath, parentBranch, "-b", childBranch],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    throw new DispatchWorktreeError(
      `worktree add failed for ${childId}: ${(err as Error).message}`,
    );
  }
  const logDir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    path.join(logDir, "worktrees.jsonl"),
    JSON.stringify({
      ts: new Date().toISOString(),
      childId,
      branch: childBranch,
      path: worktreePath,
      depth,
    }) + "\n",
  );
  return { worktreePath, branch: childBranch };
}

export function removeChildWorktree(
  repoRoot: string,
  worktreePath: string,
  branch: string,
): void {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: repoRoot,
    });
  } catch {
    // worktree may already be gone; continue
  }
  try {
    execFileSync("git", ["branch", "-D", branch], { cwd: repoRoot });
  } catch {
    // branch may already be gone; continue
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="createChildWorktree|removeChildWorktree|preflightGitClean"
```
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-worktree.mts src/tests/dispatch-worktree.test.mts
git commit -m "feat(dispatch): worktree spawn + cleanup + preflight git checks (FEAT-020)"
```

---

## Task 5 (Wave 2 — parallel with T2, T3, T6): Prompt augmentation

**Files:**
- Create: `src/scripts/lib/dispatch-prompt.mts`
- Create: `src/tests/dispatch-prompt.test.mts`

Depends on: T1 (types).

- [ ] **Step 1: Write failing tests**

Create `src/tests/dispatch-prompt.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import { augmentPrompt } from "../scripts/lib/dispatch-prompt.mjs";

test("augmentPrompt: includes LOOP_DISPATCH_DEPTH with depth+1", () => {
  const out = augmentPrompt("base prompt", {
    runId: "r1",
    depth: 0,
    childCwd: "/tmp/x",
    childBranch: "slice/X-FE",
    childId: "FE",
  });
  assert.match(out, /LOOP_DISPATCH_DEPTH=1/);
});

test("augmentPrompt: includes runId for trace correlation", () => {
  const out = augmentPrompt("base", {
    runId: "run-abc",
    depth: 1,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "c",
  });
  assert.match(out, /LOOP_DISPATCH_RUN_ID=run-abc/);
});

test("augmentPrompt: includes marker-write contract path", () => {
  const out = augmentPrompt("base", {
    runId: "r2",
    depth: 0,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "FE",
  });
  assert.match(out, /\.claude\/artifacts\/loop\/dispatch\/r2\/FE\.result\.json/);
});

test("augmentPrompt: instructs grandchild forwarding via env or --depth flag", () => {
  const out = augmentPrompt("base", {
    runId: "r3",
    depth: 1,
    childCwd: "/tmp/x",
    childBranch: "b",
    childId: "c",
  });
  // both forwarding paths documented
  assert.match(out, /LOOP_DISPATCH_DEPTH=/);
  assert.match(out, /--depth/);
});

test("augmentPrompt: preserves original prompt body", () => {
  const out = augmentPrompt("ORIGINAL_BODY_HERE", {
    runId: "r",
    depth: 0,
    childCwd: "/x",
    childBranch: "b",
    childId: "c",
  });
  assert.match(out, /ORIGINAL_BODY_HERE/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: FAILS — `augmentPrompt` not exported.

- [ ] **Step 3: Implement prompt augmentation**

Create `src/scripts/lib/dispatch-prompt.mts`:

```typescript
type AugmentArgs = {
  runId: string;
  depth: number;
  childCwd: string;
  childBranch: string;
  childId: string;
};

export function augmentPrompt(prompt: string, args: AugmentArgs): string {
  const { runId, depth, childCwd, childBranch, childId } = args;
  const nextDepth = depth + 1;
  const markerPath = `.claude/artifacts/loop/dispatch/${runId}/${childId}.result.json`;
  const header = [
    "## Hierarchical dispatch context (injected by loop:hierarchical-dispatcher)",
    "",
    `- Run id: \`${runId}\` (set \`LOOP_DISPATCH_RUN_ID=${runId}\` when invoking nested dispatch)`,
    `- Your depth: ${nextDepth} (set \`LOOP_DISPATCH_DEPTH=${nextDepth}\` OR pass \`--depth ${nextDepth}\` to \`node scripts/loop.mjs dispatch\` if you spawn grandchildren)`,
    `- Your worktree cwd: \`${childCwd}\``,
    `- Your branch: \`${childBranch}\``,
    "",
    "### Result-write contract (REQUIRED before you return)",
    "",
    `Write a JSON file to \`${markerPath}\` matching the \`DispatchResult\` schema:`,
    "",
    "```json",
    "{",
    `  "id": "${childId}",`,
    `  "status": "DONE" | "FAILED" | "BLOCKED",`,
    `  "branch": "${childBranch}",`,
    `  "worktreePath": "${childCwd}",`,
    `  "childResults": [],  // populate if you spawn grandchildren`,
    `  "artifactPath": "(optional path to your run artifact)",`,
    `  "error": "(only set on FAILED/BLOCKED)",`,
    `  "costUsd": null  // FEAT-165 populates; leave null in SLICE-1`,
    "}",
    "```",
    "",
    "If you don't write this file before returning, the parent will record your child as FAILED with `error: \"no marker\"`.",
    "",
    "---",
    "",
  ].join("\n");
  return header + prompt;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="augmentPrompt"
```
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-prompt.mts src/tests/dispatch-prompt.test.mts
git commit -m "feat(dispatch): prompt augmentation with depth/runId/marker contract (FEAT-020)"
```

---

## Task 6 (Wave 2 — parallel with T2, T3, T5): Marker reader + trace writer

**Files:**
- Create: `src/scripts/lib/dispatch-trace.mts`
- Create: `src/tests/dispatch-trace.test.mts`

Depends on: T1 (types).

- [ ] **Step 1: Write failing tests**

Create `src/tests/dispatch-trace.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readMarker, appendTrace } from "../scripts/lib/dispatch-trace.mjs";

test("readMarker: returns null when file missing", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-marker-"));
  const result = readMarker(repo, "run-x", "FE");
  assert.equal(result, null);
});

test("readMarker: returns parsed DispatchResult when valid", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-marker-"));
  const dir = path.join(repo, ".claude/artifacts/loop/dispatch/run-y");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "FE.result.json"), JSON.stringify({
    id: "FE", status: "DONE", branch: "b", worktreePath: "/p",
  }));
  const result = readMarker(repo, "run-y", "FE");
  assert.equal(result?.status, "DONE");
  assert.equal(result?.id, "FE");
});

test("readMarker: returns null with error logged when malformed", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-marker-"));
  const dir = path.join(repo, ".claude/artifacts/loop/dispatch/run-z");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "FE.result.json"), "{ not json");
  const result = readMarker(repo, "run-z", "FE");
  assert.equal(result, null);
});

test("appendTrace: creates trace.jsonl with one line per call", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-trace-"));
  appendTrace(repo, "run-t", {
    depth: 0, childId: "FE", status: "DONE", durationMs: 100, costUsd: null,
  });
  appendTrace(repo, "run-t", {
    depth: 0, childId: "BE", status: "FAILED", durationMs: 200, costUsd: null,
  });
  const log = fs.readFileSync(
    path.join(repo, ".claude/artifacts/loop/dispatch/run-t/trace.jsonl"),
    "utf8",
  );
  const lines = log.trim().split("\n");
  assert.equal(lines.length, 2);
  const e1 = JSON.parse(lines[0]);
  assert.equal(e1.childId, "FE");
  assert.equal(e1.status, "DONE");
  assert.ok(typeof e1.ts === "string");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: FAILS — `readMarker`, `appendTrace` not exported.

- [ ] **Step 3: Implement marker + trace I/O**

Create `src/scripts/lib/dispatch-trace.mts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import type { DispatchResult, DispatchStatus } from "./dispatch-types.mjs";

type TraceEntry = {
  depth: number;
  childId: string;
  status: DispatchStatus;
  durationMs: number;
  costUsd: number | null;
};

export function readMarker(
  repoRoot: string,
  runId: string,
  childId: string,
): DispatchResult | null {
  const markerPath = path.join(
    repoRoot,
    ".claude/artifacts/loop/dispatch",
    runId,
    `${childId}.result.json`,
  );
  if (!fs.existsSync(markerPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(markerPath, "utf8");
    return JSON.parse(raw) as DispatchResult;
  } catch (err) {
    console.error(
      `[dispatch] marker parse failed for ${childId}: ${(err as Error).message}`,
    );
    return null;
  }
}

export function appendTrace(
  repoRoot: string,
  runId: string,
  entry: TraceEntry,
): void {
  const dir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  fs.mkdirSync(dir, { recursive: true });
  const line =
    JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(path.join(dir, "trace.jsonl"), line);
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="readMarker|appendTrace"
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-trace.mts src/tests/dispatch-trace.test.mts
git commit -m "feat(dispatch): marker reader + trace jsonl writer (FEAT-020)"
```

---

## Task 7 (Wave 3 — parallel with T4, T8): Agent batch wrapper (mockable seam)

The Agent tool is only available inside an agent's run, not from Node directly. The library provides a function that the dispatcher agent populates via a callback. The library's job is to call it with a properly augmented batch and trust the caller to invoke the actual Agent tool.

**Files:**
- Create: `src/scripts/lib/dispatch-batch.mts`
- Create: `src/tests/dispatch-batch.test.mts`

Depends on: T1 (types), T5 (`augmentPrompt`).

- [ ] **Step 1: Write failing test**

Create `src/tests/dispatch-batch.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentBatch,
  type AgentBatchCall,
} from "../scripts/lib/dispatch-batch.mjs";

test("buildAgentBatch: produces one call per plan with augmented prompt", () => {
  const plans: any[] = [
    { id: "FE", priority: 0, agentType: "crew:builder-fe", prompt: "build fe" },
    { id: "BE", priority: 1, agentType: "crew:builder-be", prompt: "build be" },
  ];
  const calls: AgentBatchCall[] = buildAgentBatch(plans, {
    runId: "r1",
    depth: 0,
    childCwdById: { FE: "/p/fe", BE: "/p/be" },
    childBranchById: { FE: "slice/X-FE", BE: "slice/X-BE" },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].subagent_type, "crew:builder-fe");
  assert.match(calls[0].prompt, /build fe/);
  assert.match(calls[0].prompt, /LOOP_DISPATCH_DEPTH=1/);
  assert.equal(calls[0].description, "dispatch FE");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run typecheck
```
Expected: FAILS — `buildAgentBatch` not exported.

- [ ] **Step 3: Implement agent batch wrapper**

Create `src/scripts/lib/dispatch-batch.mts`:

```typescript
import type { DispatchPlan } from "./dispatch-types.mjs";
import { augmentPrompt } from "./dispatch-prompt.mjs";

export type AgentBatchCall = {
  description: string;
  subagent_type: string;
  prompt: string;
};

type BatchArgs = {
  runId: string;
  depth: number;
  childCwdById: Record<string, string>;
  childBranchById: Record<string, string>;
};

export function buildAgentBatch(
  plans: DispatchPlan[],
  args: BatchArgs,
): AgentBatchCall[] {
  return plans.map((plan) => ({
    description: `dispatch ${plan.id}`,
    subagent_type: plan.agentType,
    prompt: augmentPrompt(plan.prompt, {
      runId: args.runId,
      depth: args.depth,
      childCwd: args.childCwdById[plan.id] ?? "",
      childBranch: args.childBranchById[plan.id] ?? "",
      childId: plan.id,
    }),
  }));
}
```

The actual Agent invocation happens in the dispatcher agent's body (Task 13). The library only **constructs** the batch — the agent issues the tool calls.

- [ ] **Step 4: Run test**

```bash
npm run typecheck && npm test -- --test-name-pattern="buildAgentBatch"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-batch.mts src/tests/dispatch-batch.test.mts
git commit -m "feat(dispatch): build Agent batch with augmented prompts per plan (FEAT-020)"
```

---

## Task 8 (Wave 3 — parallel with T4, T7): Result aggregation

**Files:**
- Create: `src/scripts/lib/dispatch-aggregate.mts`
- Create: `src/tests/dispatch-aggregate.test.mts`

Depends on: T1 (types), T6 (`readMarker`).

- [ ] **Step 1: Write failing tests**

Create `src/tests/dispatch-aggregate.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { aggregateResults } from "../scripts/lib/dispatch-aggregate.mjs";

test("aggregateResults: present markers used as canonical", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-agg-"));
  const dir = path.join(repo, ".claude/artifacts/loop/dispatch/run1");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "FE.result.json"), JSON.stringify({
    id: "FE", status: "DONE", branch: "slice/X-FE", worktreePath: "/p/fe",
  }));
  const plans: any[] = [
    { id: "FE", priority: 0, agentType: "x", prompt: "" },
    { id: "BE", priority: 1, agentType: "x", prompt: "" },
  ];
  const branchById = { FE: "slice/X-FE", BE: "slice/X-BE" };
  const cwdById = { FE: "/p/fe", BE: "/p/be" };
  const results = aggregateResults(repo, "run1", plans, branchById, cwdById);
  assert.equal(results[0].status, "DONE");
  assert.equal(results[1].status, "FAILED");
  assert.match(results[1].error ?? "", /no marker/);
  assert.equal(results[1].branch, "slice/X-BE");
});

test("aggregateResults: preserves input plan order", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-agg-"));
  const plans: any[] = [
    { id: "B", priority: 1, agentType: "x", prompt: "" },
    { id: "A", priority: 0, agentType: "x", prompt: "" },
  ];
  const results = aggregateResults(
    repo, "run-empty", plans, { A: "ba", B: "bb" }, { A: "/a", B: "/b" },
  );
  assert.equal(results[0].id, "B");
  assert.equal(results[1].id, "A");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: FAILS — `aggregateResults` not exported.

- [ ] **Step 3: Implement aggregation**

Create `src/scripts/lib/dispatch-aggregate.mts`:

```typescript
import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";
import { readMarker } from "./dispatch-trace.mjs";

export function aggregateResults(
  repoRoot: string,
  runId: string,
  plans: DispatchPlan[],
  branchById: Record<string, string>,
  cwdById: Record<string, string>,
): DispatchResult[] {
  return plans.map((plan) => {
    const marker = readMarker(repoRoot, runId, plan.id);
    if (marker) return marker;
    return {
      id: plan.id,
      status: "FAILED",
      branch: branchById[plan.id] ?? "",
      worktreePath: cwdById[plan.id] ?? "",
      error: "no marker",
      costUsd: null,
    };
  });
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="aggregateResults"
```
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-aggregate.mts src/tests/dispatch-aggregate.test.mts
git commit -m "feat(dispatch): result aggregation from marker files (FEAT-020)"
```

---

## Task 9 (Wave 4 — solo): Merge children (priority-ordered, conflict-aware)

**Files:**
- Create: `src/scripts/lib/dispatch-merge.mts`
- Create: `src/tests/dispatch-merge.test.mts`

Depends on: T1 (types), T4 (`removeChildWorktree`).

- [ ] **Step 1: Write failing tests**

Create `src/tests/dispatch-merge.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { mergeChildren } from "../scripts/lib/dispatch-merge.mjs";

test("mergeChildren: DONE children merged + cleaned up in priority order", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-MERGE", { cwd: repo });
  // child branches with independent files (no conflict)
  execSync("git checkout -q -b slice/SLICE-MERGE-A", { cwd: repo });
  fs.writeFileSync(path.join(repo, "a.txt"), "A\n");
  execSync("git add . && git commit -q -m a", { cwd: repo });
  execSync("git checkout -q slice/SLICE-MERGE", { cwd: repo });
  execSync("git checkout -q -b slice/SLICE-MERGE-B", { cwd: repo });
  fs.writeFileSync(path.join(repo, "b.txt"), "B\n");
  execSync("git add . && git commit -q -m b", { cwd: repo });
  execSync("git checkout -q slice/SLICE-MERGE", { cwd: repo });

  const results: any[] = [
    { id: "A", status: "DONE", branch: "slice/SLICE-MERGE-A", worktreePath: "/dummy/a", priority: 0 },
    { id: "B", status: "DONE", branch: "slice/SLICE-MERGE-B", worktreePath: "/dummy/b", priority: 1 },
  ];
  const plans = results.map((r) => ({ id: r.id, priority: r.priority, agentType: "x", prompt: "" }));
  const final = mergeChildren(repo, "slice/SLICE-MERGE", results, plans);
  assert.equal(final[0].status, "DONE");
  assert.equal(final[1].status, "DONE");
  // both files present on parent branch
  assert.ok(fs.existsSync(path.join(repo, "a.txt")));
  assert.ok(fs.existsSync(path.join(repo, "b.txt")));
  // branches deleted
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(!branches.includes("SLICE-MERGE-A"));
  assert.ok(!branches.includes("SLICE-MERGE-B"));
});

test("mergeChildren: merge conflict surfaces CONFLICTED, preserves branch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-CONF", { cwd: repo });
  fs.writeFileSync(path.join(repo, "shared.txt"), "base\n");
  execSync("git add . && git commit -q -m base", { cwd: repo });
  execSync("git checkout -q -b slice/SLICE-CONF-X", { cwd: repo });
  fs.writeFileSync(path.join(repo, "shared.txt"), "X-version\n");
  execSync("git add . && git commit -q -m x", { cwd: repo });
  execSync("git checkout -q slice/SLICE-CONF", { cwd: repo });
  execSync("git checkout -q -b slice/SLICE-CONF-Y", { cwd: repo });
  fs.writeFileSync(path.join(repo, "shared.txt"), "Y-version\n");
  execSync("git add . && git commit -q -m y", { cwd: repo });
  execSync("git checkout -q slice/SLICE-CONF", { cwd: repo });

  const results: any[] = [
    { id: "X", status: "DONE", branch: "slice/SLICE-CONF-X", worktreePath: "/dummy/x" },
    { id: "Y", status: "DONE", branch: "slice/SLICE-CONF-Y", worktreePath: "/dummy/y" },
  ];
  const plans = results.map((r, i) => ({ id: r.id, priority: i, agentType: "x", prompt: "" }));
  const final = mergeChildren(repo, "slice/SLICE-CONF", results, plans);
  // first merges clean, second conflicts
  assert.equal(final[0].status, "DONE");
  assert.equal(final[1].status, "CONFLICTED");
  // Y branch preserved
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(branches.includes("SLICE-CONF-Y"));
});

test("mergeChildren: skips non-DONE children", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-SKIP", { cwd: repo });
  const results: any[] = [
    { id: "X", status: "FAILED", branch: "ghost", worktreePath: "/dummy/x", error: "boom" },
  ];
  const plans = [{ id: "X", priority: 0, agentType: "x", prompt: "" }];
  const final = mergeChildren(repo, "slice/SLICE-SKIP", results, plans);
  assert.equal(final[0].status, "FAILED");
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: FAILS — `mergeChildren` not exported.

- [ ] **Step 3: Implement merge**

Create `src/scripts/lib/dispatch-merge.mts`:

```typescript
import { execFileSync } from "node:child_process";
import type { DispatchPlan, DispatchResult } from "./dispatch-types.mjs";
import { removeChildWorktree } from "./dispatch-worktree.mjs";

export function mergeChildren(
  repoRoot: string,
  parentBranch: string,
  results: DispatchResult[],
  plans: DispatchPlan[],
): DispatchResult[] {
  const priorityById = new Map(plans.map((p) => [p.id, p.priority]));
  execFileSync("git", ["checkout", parentBranch], { cwd: repoRoot });
  const order = results
    .filter((r) => r.status === "DONE")
    .map((r) => ({ r, p: priorityById.get(r.id) ?? 0 }))
    .sort((a, b) => a.p - b.p)
    .map((x) => x.r);
  const updated = new Map<string, DispatchResult>();
  for (const child of order) {
    try {
      execFileSync(
        "git",
        ["merge", "--no-ff", child.branch, "-m", `merge ${child.id} (FEAT-020 dispatch)`],
        { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
      removeChildWorktree(repoRoot, child.worktreePath, child.branch);
      updated.set(child.id, { ...child, status: "DONE" });
    } catch {
      try {
        execFileSync("git", ["merge", "--abort"], { cwd: repoRoot });
      } catch {
        // abort may fail if no merge in progress; ignore
      }
      updated.set(child.id, {
        ...child,
        status: "CONFLICTED",
        error: `merge conflict against ${parentBranch}`,
      });
      // worktree + branch preserved
    }
  }
  // return results in original input order, applying any status changes
  return results.map((r) => updated.get(r.id) ?? r);
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="mergeChildren"
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git add src/scripts/lib/dispatch-merge.mts src/tests/dispatch-merge.test.mts
git commit -m "feat(dispatch): priority-ordered merge with conflict handling (FEAT-020)"
```

---

## Task 10 (Wave 5 — solo): Orchestrator + barrel re-export

The Agent batch is **not** invoked directly by the library (Agent is not available in Node). The library is split into two callable stages:

- `prepareDispatch(plans, opts)` → returns `{ runId, batch, branchById, cwdById }` after pre-flight, spawn, and prompt build.
- `finalizeDispatch(repoRoot, parentBranch, runId, batch, plans, branchById, cwdById)` → after the caller (agent) has invoked the Agent batch, the agent calls this to aggregate, trace, merge, and write summary.

A single `dispatchHierarchical(plans, opts)` convenience export composes both using a caller-supplied `runAgentBatch` callback — used by integration tests and by the CLI subcommand (which mocks/stubs the agent step for `--dry-run`).

This task also makes the file the **barrel re-export** so external callers keep a single import surface (`hierarchical-dispatch.mjs`).

**Files:**
- Create: `src/scripts/lib/hierarchical-dispatch.mts` — orchestrator + re-export
- Create: `src/tests/hierarchical-dispatch.test.mts`

Depends on: T1, T2, T3, T4, T5, T6, T7, T8, T9 (all prior modules).

- [ ] **Step 1: Write failing tests**

Create `src/tests/hierarchical-dispatch.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import { prepareDispatch, finalizeDispatch, dispatchHierarchical } from "../scripts/lib/hierarchical-dispatch.mjs";
import type { AgentBatchCall } from "../scripts/lib/hierarchical-dispatch.mjs";

test("prepareDispatch: enforces gates, spawns worktrees, returns batch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-PD", { cwd: repo });
  const plans = [
    { id: "A", priority: 0, agentType: "crew:builder", prompt: "do A" },
    { id: "B", priority: 1, agentType: "crew:builder", prompt: "do B" },
  ];
  const prepared = prepareDispatch(plans, {
    parentBranch: "slice/SLICE-PD",
    repoRoot: repo,
    depth: 0,
    configPath: path.join(repo, ".claude/loop.json"),
  });
  assert.equal(prepared.batch.length, 2);
  assert.ok(prepared.runId);
  assert.match(prepared.batch[0].prompt, /do A/);
  assert.ok(fs.existsSync(prepared.cwdById.A));
});

test("dispatchHierarchical: end-to-end with mock runAgentBatch — happy path", async () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-E2E", { cwd: repo });
  const plans = [
    { id: "A", priority: 0, agentType: "crew:builder", prompt: "noop" },
  ];
  const runAgentBatch = async (
    batch: AgentBatchCall[],
    ctx: { runId: string; cwdById: Record<string, string>; branchById: Record<string, string> },
  ) => {
    // simulate child agent: write its marker file
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
      fs.mkdirSync(dir, { recursive: true });
      // simulate a real commit on the child's worktree branch
      const cwd = ctx.cwdById[id];
      fs.writeFileSync(path.join(cwd, `${id}.touch`), "hi\n");
      execSync(`git add . && git commit -q -m "child ${id}"`, { cwd });
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify({
        id, status: "DONE", branch: ctx.branchById[id], worktreePath: cwd,
      }));
    }
  };
  const results = await dispatchHierarchical(plans, {
    parentBranch: "slice/SLICE-E2E",
    repoRoot: repo,
    depth: 0,
    configPath: path.join(repo, ".claude/loop.json"),
  }, runAgentBatch);
  assert.equal(results.length, 1);
  assert.equal(results[0].status, "DONE");
  assert.ok(fs.existsSync(path.join(repo, "A.touch")));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run typecheck
```
Expected: FAILS — `prepareDispatch`, `finalizeDispatch`, `dispatchHierarchical` not exported.

- [ ] **Step 3: Implement orchestrator + barrel re-export**

Create `src/scripts/lib/hierarchical-dispatch.mts`:

```typescript
// FEAT-020 SLICE-1 — Hierarchical parallel subagent dispatch primitive (barrel + orchestrator).
// Spec: docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md

// Re-export everything so external callers have a single import surface.
export * from "./dispatch-types.mjs";
export * from "./dispatch-config.mjs";
export * from "./dispatch-gates.mjs";
export * from "./dispatch-prompt.mjs";
export * from "./dispatch-trace.mjs";
export * from "./dispatch-worktree.mjs";
export * from "./dispatch-batch.mjs";
export * from "./dispatch-aggregate.mjs";
export * from "./dispatch-merge.mjs";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  DispatchOptions,
  DispatchPlan,
  DispatchResult,
} from "./dispatch-types.mjs";
import { readDispatchConfig } from "./dispatch-config.mjs";
import {
  checkDepth,
  checkFanout,
  checkUniqueIds,
} from "./dispatch-gates.mjs";
import { preflightGitClean, createChildWorktree } from "./dispatch-worktree.mjs";
import { buildAgentBatch, type AgentBatchCall } from "./dispatch-batch.mjs";
import { aggregateResults } from "./dispatch-aggregate.mjs";
import { appendTrace } from "./dispatch-trace.mjs";
import { mergeChildren } from "./dispatch-merge.mjs";

export type PreparedDispatch = {
  runId: string;
  batch: AgentBatchCall[];
  branchById: Record<string, string>;
  cwdById: Record<string, string>;
  startTimes: Record<string, number>;
};

export function prepareDispatch(
  plans: DispatchPlan[],
  opts: DispatchOptions,
): PreparedDispatch {
  const cfg = readDispatchConfig(opts.configPath ?? path.join(opts.repoRoot, ".claude/loop.json"));
  checkDepth(opts.depth, cfg);
  checkFanout(plans, cfg);
  checkUniqueIds(plans);
  preflightGitClean(opts.repoRoot, opts.parentBranch);

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const depth =
    typeof opts.depth === "number"
      ? opts.depth
      : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);

  const branchById: Record<string, string> = {};
  const cwdById: Record<string, string> = {};
  for (const plan of plans) {
    const spawn = createChildWorktree({
      repoRoot: opts.repoRoot,
      parentBranch: opts.parentBranch,
      childId: plan.id,
      depth,
      runId,
    });
    branchById[plan.id] = spawn.branch;
    cwdById[plan.id] = spawn.worktreePath;
  }
  const batch = buildAgentBatch(plans, {
    runId,
    depth,
    childCwdById: cwdById,
    childBranchById: branchById,
  });
  const startTimes: Record<string, number> = {};
  for (const plan of plans) startTimes[plan.id] = Date.now();
  return { runId, batch, branchById, cwdById, startTimes };
}

export function finalizeDispatch(
  repoRoot: string,
  parentBranch: string,
  prepared: PreparedDispatch,
  plans: DispatchPlan[],
  depth: number,
): DispatchResult[] {
  const { runId, branchById, cwdById, startTimes } = prepared;
  let results = aggregateResults(repoRoot, runId, plans, branchById, cwdById);
  for (const r of results) {
    appendTrace(repoRoot, runId, {
      depth,
      childId: r.id,
      status: r.status,
      durationMs: Date.now() - (startTimes[r.id] ?? Date.now()),
      costUsd: r.costUsd ?? null,
    });
  }
  results = mergeChildren(repoRoot, parentBranch, results, plans);
  writeSummary(repoRoot, runId, parentBranch, depth, results);
  return results;
}

function writeSummary(
  repoRoot: string,
  runId: string,
  parentBranch: string,
  depth: number,
  results: DispatchResult[],
): void {
  const lines = [
    `# Dispatch run ${runId}`,
    "",
    `- parent branch: \`${parentBranch}\``,
    `- depth: ${depth}`,
    `- children: ${results.length}`,
    "",
    "| id | status | branch | worktree | error |",
    "|----|--------|--------|----------|-------|",
    ...results.map((r) =>
      `| ${r.id} | ${r.status} | \`${r.branch}\` | \`${r.worktreePath}\` | ${r.error ?? ""} |`,
    ),
    "",
  ];
  fs.writeFileSync(
    path.join(
      repoRoot,
      ".claude/artifacts/loop/dispatch",
      runId,
      "summary.md",
    ),
    lines.join("\n"),
  );
}

export type RunAgentBatchFn = (
  batch: AgentBatchCall[],
  ctx: {
    runId: string;
    branchById: Record<string, string>;
    cwdById: Record<string, string>;
  },
) => Promise<void>;

export async function dispatchHierarchical(
  plans: DispatchPlan[],
  opts: DispatchOptions,
  runAgentBatch: RunAgentBatchFn,
): Promise<DispatchResult[]> {
  const prepared = prepareDispatch(plans, opts);
  await runAgentBatch(prepared.batch, {
    runId: prepared.runId,
    branchById: prepared.branchById,
    cwdById: prepared.cwdById,
  });
  const depth =
    typeof opts.depth === "number"
      ? opts.depth
      : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
  return finalizeDispatch(opts.repoRoot, opts.parentBranch, prepared, plans, depth);
}
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="prepareDispatch|dispatchHierarchical"
```
Expected: 2 tests PASS. (Full integration in Task 14.)

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/hierarchical-dispatch.mts src/tests/hierarchical-dispatch.test.mts
git commit -m "feat(dispatch): prepareDispatch + finalizeDispatch + summary writer (FEAT-020)"
```

---

## Task 11 (Wave 6 — parallel with T13, T15): CLI subcommand `dispatch.mts`

**Files:**
- Create: `src/scripts/dispatch.mts`
- Create: `src/tests/dispatch-cli.test.mts`

Depends on: T10 (barrel re-export).

The CLI subcommand wraps the library for shell invocation. It cannot actually invoke Agent (no harness here), so it only supports `--dry-run` end-to-end in tests. In production, the `loop:hierarchical-dispatcher` agent calls `prepareDispatch` + invokes the Agent tool + calls `finalizeDispatch` itself rather than going through the CLI.

The CLI is therefore primarily for `--dry-run` (preview augmented prompts + worktree commands) and for the `prepare`/`finalize` subcommands that the agent uses individually.

- [ ] **Step 1: Write failing test**

Create `src/tests/dispatch-cli.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function initRepoWithBranch(branch: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-cli-"));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "T"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "x"), "x");
  execFileSync("git", ["add", "."], { cwd: dir });
  execFileSync("git", ["commit", "-qm", "init"], { cwd: dir });
  execFileSync("git", ["checkout", "-qb", branch], { cwd: dir });
  return dir;
}

test("dispatch --dry-run prints augmented prompts without spawning worktree", () => {
  const repo = initRepoWithBranch("slice/SLICE-DRY");
  const planPath = path.join(repo, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify({
    plans: [
      { id: "FE", priority: 0, agentType: "crew:builder", prompt: "build it" },
    ],
  }));
  const cli = path.resolve("scripts/dispatch.mjs");
  const out = execFileSync(
    "node",
    [cli, "prepare", "--plan", planPath, "--parent-branch", "slice/SLICE-DRY", "--repo", repo, "--dry-run"],
    { cwd: repo },
  ).toString();
  assert.match(out, /LOOP_DISPATCH_DEPTH=1/);
  assert.match(out, /build it/);
  // worktree directory NOT created
  const siblings = fs.readdirSync(path.dirname(repo));
  assert.ok(!siblings.some((s) => s.includes("-FE-0")), "no worktree created");
});

test("dispatch prepare emits batch JSON when --json flag set", () => {
  const repo = initRepoWithBranch("slice/SLICE-JSON");
  const planPath = path.join(repo, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify({
    plans: [{ id: "FE", priority: 0, agentType: "crew:builder", prompt: "x" }],
  }));
  const cli = path.resolve("scripts/dispatch.mjs");
  const out = execFileSync(
    "node",
    [cli, "prepare", "--plan", planPath, "--parent-branch", "slice/SLICE-JSON", "--repo", repo, "--json"],
    { cwd: repo },
  ).toString();
  const parsed = JSON.parse(out);
  assert.ok(parsed.runId);
  assert.equal(parsed.batch.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run typecheck
```
Expected: FAILS — `scripts/dispatch.mjs` doesn't exist.

- [ ] **Step 3: Implement CLI subcommand**

Create `src/scripts/dispatch.mts`:

```typescript
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  prepareDispatch,
  finalizeDispatch,
  type DispatchPlan,
} from "./lib/hierarchical-dispatch.mjs";

type ParsedArgs = {
  subcommand: "prepare" | "finalize" | "help";
  planPath?: string;
  parentBranch?: string;
  repo?: string;
  depth?: number;
  dryRun?: boolean;
  json?: boolean;
  runId?: string;
  configPath?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [subcommand, ...rest] = argv;
  const args: ParsedArgs = {
    subcommand: (subcommand as ParsedArgs["subcommand"]) ?? "help",
  };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const next = rest[i + 1];
    switch (flag) {
      case "--plan": args.planPath = next; i++; break;
      case "--parent-branch": args.parentBranch = next; i++; break;
      case "--repo": args.repo = next; i++; break;
      case "--depth": args.depth = Number(next); i++; break;
      case "--run-id": args.runId = next; i++; break;
      case "--config": args.configPath = next; i++; break;
      case "--dry-run": args.dryRun = true; break;
      case "--json": args.json = true; break;
      case "--help":
      case "-h":
        args.subcommand = "help";
        break;
    }
  }
  return args;
}

function readPlanFile(planPath: string): DispatchPlan[] {
  let raw: string;
  if (planPath === "-") {
    raw = fs.readFileSync(0, "utf8");
  } else {
    raw = fs.readFileSync(planPath, "utf8");
  }
  const parsed = JSON.parse(raw) as { plans: DispatchPlan[] };
  return parsed.plans;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  node scripts/dispatch.mjs prepare --plan <path|-> --parent-branch <name> [--repo <path>] [--depth N] [--dry-run] [--json]
  node scripts/dispatch.mjs finalize --run-id <id> --parent-branch <name> --plan <path|-> [--repo <path>] [--depth N]

Subcommands:
  prepare   Run pre-flight gates, spawn worktrees, build Agent batch.
            Outputs: human-readable preview (default), or batch JSON (--json).
  finalize  After the caller has invoked the Agent batch, aggregate results,
            merge children to parent branch, write summary.md.

`);
}

function cmdPrepare(args: ParsedArgs): number {
  if (!args.planPath || !args.parentBranch) {
    process.stderr.write("--plan and --parent-branch are required\n");
    return 1;
  }
  const repo = args.repo ?? process.cwd();
  const plans = readPlanFile(args.planPath);
  if (args.dryRun) {
    // construct the batch without spawning worktrees
    const cfgPath = args.configPath ?? path.join(repo, ".claude/loop.json");
    const { buildAgentBatch, augmentPrompt } = require("./lib/hierarchical-dispatch.mjs");
    const runId = "DRYRUN";
    const batch = plans.map((p) => ({
      description: `dispatch ${p.id}`,
      subagent_type: p.agentType,
      prompt: augmentPrompt(p.prompt, {
        runId,
        depth: args.depth ?? 0,
        childCwd: `<dry-run-cwd-${p.id}>`,
        childBranch: `${args.parentBranch}-${p.id}`,
        childId: p.id,
      }),
    }));
    for (const call of batch) {
      process.stdout.write(`=== ${call.description} (${call.subagent_type}) ===\n`);
      process.stdout.write(call.prompt);
      process.stdout.write("\n\n");
    }
    return 0;
  }
  const prepared = prepareDispatch(plans, {
    parentBranch: args.parentBranch,
    repoRoot: repo,
    depth: args.depth,
    configPath: args.configPath,
  });
  if (args.json) {
    process.stdout.write(JSON.stringify({
      runId: prepared.runId,
      batch: prepared.batch,
      branchById: prepared.branchById,
      cwdById: prepared.cwdById,
    }, null, 2));
    return 0;
  }
  process.stdout.write(
    `Prepared run ${prepared.runId}\n` +
    `Worktrees spawned: ${Object.keys(prepared.cwdById).join(", ")}\n` +
    `Next: invoke Agent tool with the ${prepared.batch.length} calls, then run \`finalize --run-id ${prepared.runId}\`\n`,
  );
  return 0;
}

function cmdFinalize(args: ParsedArgs): number {
  if (!args.runId || !args.parentBranch || !args.planPath) {
    process.stderr.write("--run-id, --parent-branch, --plan are required\n");
    return 1;
  }
  const repo = args.repo ?? process.cwd();
  const plans = readPlanFile(args.planPath);
  // reconstruct branchById/cwdById from worktrees.jsonl
  const wtLog = path.join(repo, ".claude/artifacts/loop/dispatch", args.runId, "worktrees.jsonl");
  const branchById: Record<string, string> = {};
  const cwdById: Record<string, string> = {};
  for (const line of fs.readFileSync(wtLog, "utf8").trim().split("\n")) {
    const e = JSON.parse(line);
    branchById[e.childId] = e.branch;
    cwdById[e.childId] = e.path;
  }
  const prepared = {
    runId: args.runId,
    batch: [],
    branchById,
    cwdById,
    startTimes: Object.fromEntries(plans.map((p) => [p.id, Date.now()])),
  };
  const results = finalizeDispatch(repo, args.parentBranch, prepared as any, plans, args.depth ?? 0);
  const summary = path.join(repo, ".claude/artifacts/loop/dispatch", args.runId, "summary.md");
  process.stdout.write(`Summary: ${summary}\n`);
  const allFailed = results.every((r) => r.status === "FAILED" || r.status === "BLOCKED");
  if (allFailed) return 2;
  return 0;
}

const args = parseArgs(process.argv.slice(2));
try {
  switch (args.subcommand) {
    case "prepare": process.exitCode = cmdPrepare(args); break;
    case "finalize": process.exitCode = cmdFinalize(args); break;
    case "help":
    default: printHelp(); process.exitCode = 0;
  }
} catch (err) {
  process.stderr.write(`[dispatch] ${(err as Error).name}: ${(err as Error).message}\n`);
  process.exitCode = 1;
}
```

- [ ] **Step 4: Build + run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="dispatch --dry-run|dispatch prepare emits"
```
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/dispatch.mts src/tests/dispatch-cli.test.mts
git commit -m "feat(dispatch): CLI subcommand with prepare/finalize/dry-run (FEAT-020)"
```

---

## Task 12 (Wave 7 — parallel with T14): Wire dispatch into `loop.mjs` main CLI

**Files:**
- Modify: `src/scripts/loop.mts`
- Modify: `src/tests/dispatch-cli.test.mts`

Depends on: T11 (CLI subcommand).

- [ ] **Step 1: Write failing test**

Append to `src/tests/dispatch-cli.test.mts`:

```typescript
test("loop dispatch --help routes to dispatch CLI", () => {
  const out = execFileSync("node", ["scripts/loop.mjs", "dispatch", "--help"]).toString();
  assert.match(out, /node scripts\/dispatch\.mjs prepare/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run typecheck && npm test -- --test-name-pattern="loop dispatch --help"
```
Expected: FAIL — `dispatch` not recognized by `loop.mjs`.

- [ ] **Step 3: Wire subcommand into loop.mts**

In `src/scripts/loop.mts`, find the command dispatch table (search for the existing `phase-gate` subcommand handler) and add a new case:

```typescript
case "dispatch": {
  // forward all remaining argv to the dispatch CLI
  const dispatchCli = path.join(path.dirname(new URL(import.meta.url).pathname), "dispatch.mjs");
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("node", [dispatchCli, ...rest], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
  return;
}
```

(Exact placement depends on the existing dispatch structure; the pattern follows the `phase-gate` case already in the file.)

Also update the help text near the top of the file:

```
  node scripts/loop.mjs dispatch <subcommand> [args...]
                         (see: dispatch --help)
```

- [ ] **Step 4: Run tests**

```bash
npm run typecheck && npm test -- --test-name-pattern="loop dispatch"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/loop.mts src/tests/dispatch-cli.test.mts
git commit -m "feat(dispatch): wire dispatch subcommand into loop.mjs (FEAT-020)"
```

---

## Task 13 (Wave 6 — parallel with T11, T15): Agent definition — `loop:hierarchical-dispatcher`

**Files:**
- Create: `agents/hierarchical-dispatcher.md`

Depends on: nothing in this plan (no code imports).

The agent is the only caller that can actually invoke the Agent tool (Node CLI cannot). Its body shells out to `loop dispatch prepare --json`, parses the batch, invokes the Agent tool with all calls in **one message**, then shells out to `loop dispatch finalize`.

- [ ] **Step 1: Create the agent file**

Create `agents/hierarchical-dispatcher.md`:

```markdown
---
name: hierarchical-dispatcher
description: Spawn N parallel child subagents in isolated git worktrees, awaitAll
  with blocking semantics, then merge DONE children to the parent branch in
  priority order. Depth-capped via .claude/loop.json (`dispatchLimits.maxDepth`,
  default 3). Use when one slice needs N parallel children (e.g. FE+BE+tests),
  for recursive FEAT decomposition, or for fan-out review across dimensions.
  NOT for sequential phases — use the slice ceremony for those.
model: sonnet
maxTurns: 30
tools: [Bash, Agent, Read, Write]
color: cyan
---

You are the hierarchical-dispatcher for this loop.

## Scope

I own:
- Parsing the caller's request into a `DispatchPlan[]`.
- Calling `loop dispatch prepare --json` to enforce gates, spawn worktrees, build the augmented Agent batch.
- Invoking the Agent tool with **all batch calls in one message** for true parallelism.
- Calling `loop dispatch finalize` to aggregate results, merge to parent branch, write summary.
- Surfacing the summary path + a one-line headline back to the caller.

I do not own:
- Implementation work (delegated to child subagents).
- Slice ceremony (caller invokes me from within a slice if needed).
- Cancellation — `awaitAll` is blocking; user Ctrl-C is the kill.

## Pre-flight

1. Parse caller's request:
   - List of child plans, each with: `id`, `priority`, `agentType`, `prompt`.
   - Parent branch (default: current `git branch --show-current`).
2. Resolve loop CLI path:
   - Use `$LOOP_ROOT/scripts/loop.mjs` if set.
   - Otherwise: `node scripts/loop.mjs` from repo root.
3. Write the plan to `/tmp/plan-<random>.json`:
   ```json
   { "plans": [ {"id":"FE","priority":0,"agentType":"crew:builder-fe","prompt":"..."}, ... ] }
   ```

## Prepare phase

Run:
```bash
node scripts/loop.mjs dispatch prepare \
  --plan /tmp/plan-<random>.json \
  --parent-branch <branch> \
  --repo "$PWD" \
  --json > /tmp/prepared-<random>.json
```

This:
- Runs pre-flight gates (depth, fanout, dup ids, clean tree, branch exists).
- Spawns one worktree per plan, forked off `parent-branch`.
- Builds the Agent batch with prompt augmentation (depth+1 forwarding, runId, marker contract).

Parse the output JSON: `{ runId, batch, branchById, cwdById }`.

If prepare exits non-zero, abort and surface the stderr to the caller.

## Dispatch phase

Invoke the Agent tool **once** with all `batch[]` entries in a single message:

```
Agent({ description, subagent_type, prompt }) × N
```

These run concurrently — never loop sequentially.

After all Agent calls return, do NOT trust their text output. The library reads each child's marker file from `.claude/artifacts/loop/dispatch/<runId>/<childId>.result.json` instead.

## Finalize phase

Run:
```bash
node scripts/loop.mjs dispatch finalize \
  --run-id <runId> \
  --parent-branch <branch> \
  --plan /tmp/plan-<random>.json \
  --repo "$PWD"
```

This:
- Reads marker files for each child.
- Appends per-child trace lines to `trace.jsonl`.
- Merges DONE children into `parent-branch` in priority order.
- Writes `summary.md`.

Exit code 0 = at least one child DONE. Exit 2 = all FAILED.

## Return to caller

Surface back exactly:
- One-line headline (e.g. `2 of 3 children DONE, 1 CONFLICTED`).
- Path to `summary.md`.
- Run id.

Do NOT inline the full summary. Caller can `cat` the file if they want detail.

## Failure modes

- `DispatchDepthExceeded` → caller exceeded `maxDepth`. Surface clearly; caller decides whether to bump the cap or restructure.
- `DispatchFanoutExceeded` → caller passed too many children in one call. Surface; caller splits into batches.
- `DispatchWorktreeError` (dirty tree, missing branch) → ops issue; surface and stop.
- Child returns FAILED in marker → parent does NOT abort siblings (continue-on-failure). Reflected in summary.

## Context efficiency

- Use Read sparingly; the summary.md is short and human-readable already.
- Do NOT re-read library source files — trust them.
- Batch the N Agent calls in **one message**; never serialize.

## Telemetry

The library appends per-child trace lines to `.claude/artifacts/loop/dispatch/<runId>/trace.jsonl`. `costUsd` is `null` in SLICE-1 — FEAT-165 will populate.
```

- [ ] **Step 2: Validate content length**

```bash
node scripts/validate-content-length.mjs
```
Expected: PASS (under 300 lines).

- [ ] **Step 3: Validate manifest if agent is registered**

If the plugin manifest tracks agents, add `hierarchical-dispatcher` to it. (Check `plugin.json` or `manifest.json` — pattern: existing entries for `architect.md`, `pm.md`, etc.)

Run:
```bash
node scripts/validate-manifests.mjs
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add agents/hierarchical-dispatcher.md
# also add manifest if modified
git commit -m "feat(dispatch): add loop:hierarchical-dispatcher agent (FEAT-020)"
```

---

## Task 14 (Wave 7 — parallel with T12): Integration tests

**Files:**
- Create: `src/tests/hierarchical-dispatch.integration.test.mts`

Depends on: T10 (orchestrator + barrel).

These tests exercise the full library API (including `dispatchHierarchical` with a mocked `runAgentBatch`) against a real tmpdir git repo. They cover the spec's failure-model and recursion scenarios. Tests import from the barrel `hierarchical-dispatch.mjs` to prove the re-export surface works end-to-end.

- [ ] **Step 1: Write the integration test file**

Create `src/tests/hierarchical-dispatch.integration.test.mts`:

```typescript
// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo, makeStubAgent } from "./dispatch-test-helpers.mjs";
import {
  dispatchHierarchical,
  type DispatchPlan,
  type AgentBatchCall,
} from "../scripts/lib/hierarchical-dispatch.mjs";

test("integration: happy path — 2 children both DONE, both merge clean", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/HP", { cwd: repo });
  const plans: DispatchPlan[] = [
    { id: "A", priority: 0, agentType: "crew:builder", prompt: "do A" },
    { id: "B", priority: 1, agentType: "crew:builder", prompt: "do B" },
  ];
  const stub = makeStubAgent(repo, (id) => ({ status: "DONE", commit: `${id}.txt` }));
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/HP", repoRoot: repo, depth: 0 },
    stub,
  );
  assert.equal(results.length, 2);
  assert.equal(results[0].status, "DONE");
  assert.equal(results[1].status, "DONE");
  assert.ok(fs.existsSync(path.join(repo, "A.txt")));
  assert.ok(fs.existsSync(path.join(repo, "B.txt")));
});

test("integration: one child FAILED — sibling still merges", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/MIX", { cwd: repo });
  const plans: DispatchPlan[] = [
    { id: "OK", priority: 0, agentType: "crew:builder", prompt: "" },
    { id: "BAD", priority: 1, agentType: "crew:builder", prompt: "" },
  ];
  const stub = makeStubAgent(repo, (id) =>
    id === "OK"
      ? { status: "DONE", commit: "ok.txt" }
      : { status: "FAILED" },
  );
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/MIX", repoRoot: repo, depth: 0 },
    stub,
  );
  assert.equal(results.find((r) => r.id === "OK")?.status, "DONE");
  assert.equal(results.find((r) => r.id === "BAD")?.status, "FAILED");
  assert.ok(fs.existsSync(path.join(repo, "ok.txt")));
});

test("integration: merge conflict surfaces CONFLICTED, both worktrees preserved", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/CONF", { cwd: repo });
  fs.writeFileSync(path.join(repo, "shared.txt"), "base\n");
  execSync("git add . && git commit -qm base", { cwd: repo });
  const plans: DispatchPlan[] = [
    { id: "X", priority: 0, agentType: "crew:builder", prompt: "" },
    { id: "Y", priority: 1, agentType: "crew:builder", prompt: "" },
  ];
  const stub = async (batch: any, ctx: any) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      const branch = ctx.branchById[id];
      fs.writeFileSync(path.join(cwd, "shared.txt"), `${id}-version\n`);
      execSync(`git add . && git commit -qm "${id}"`, { cwd });
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify({
        id, status: "DONE", branch, worktreePath: cwd,
      }));
    }
  };
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/CONF", repoRoot: repo, depth: 0 },
    stub,
  );
  const x = results.find((r) => r.id === "X");
  const y = results.find((r) => r.id === "Y");
  assert.equal(x?.status, "DONE");
  assert.equal(y?.status, "CONFLICTED");
  // Y worktree + branch preserved
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(branches.includes("slice/CONF-Y"));
});

test("integration: recursion 1 level deep — grandchild merges into child, child into parent", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/REC", { cwd: repo });
  const grandchildStub = async (batch: any, ctx: any) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      fs.writeFileSync(path.join(cwd, `${id}.gc.txt`), `${id}\n`);
      execSync(`git add . && git commit -qm "gc ${id}"`, { cwd });
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify({
        id, status: "DONE", branch: ctx.branchById[id], worktreePath: cwd,
      }));
    }
  };
  // childStub: when invoked, it dispatches a grandchild from inside its own cwd
  const childStub = async (batch: any, ctx: any) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      // child does: dispatch one grandchild from its own cwd
      const grandPlans = [{ id: "GC", priority: 0, agentType: "crew:builder", prompt: "" }];
      await dispatchHierarchical(
        grandPlans,
        { parentBranch: ctx.branchById[id], repoRoot: cwd, depth: 1 },
        grandchildStub,
      );
      // child has no work of its own beyond the merged grandchild commit
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify({
        id, status: "DONE", branch: ctx.branchById[id], worktreePath: cwd,
      }));
    }
  };
  const plans = [{ id: "C", priority: 0, agentType: "crew:builder", prompt: "" }];
  const results = await dispatchHierarchical(
    plans,
    { parentBranch: "slice/REC", repoRoot: repo, depth: 0 },
    childStub,
  );
  assert.equal(results[0].status, "DONE");
  // grandchild commit propagated up to parent branch
  assert.ok(fs.existsSync(path.join(repo, "GC.gc.txt")));
});

test("integration: depth cap at recursion boundary throws inside child", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/DC", { cwd: repo });
  // write loop.json with maxDepth=1
  fs.mkdirSync(path.join(repo, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".claude/loop.json"), JSON.stringify({
    dispatchLimits: { maxDepth: 1, maxChildrenPerBatch: 8 },
  }));
  const childStub = async (batch: any, ctx: any) => {
    const dir = path.join(repo, ".claude/artifacts/loop/dispatch", ctx.runId);
    fs.mkdirSync(dir, { recursive: true });
    for (const call of batch) {
      const id = call.description.replace(/^dispatch /, "");
      const cwd = ctx.cwdById[id];
      // child at depth=1, cap=1 → throws
      let error = "";
      try {
        await dispatchHierarchical(
          [{ id: "GC", priority: 0, agentType: "x", prompt: "" }],
          { parentBranch: ctx.branchById[id], repoRoot: cwd, depth: 1 },
          async () => {},
        );
      } catch (e) {
        error = (e as Error).name;
      }
      fs.writeFileSync(path.join(dir, `${id}.result.json`), JSON.stringify({
        id, status: "FAILED", branch: ctx.branchById[id], worktreePath: cwd, error,
      }));
    }
  };
  const plans = [{ id: "C", priority: 0, agentType: "x", prompt: "" }];
  const results = await dispatchHierarchical(
    plans,
    {
      parentBranch: "slice/DC",
      repoRoot: repo,
      depth: 0,
      configPath: path.join(repo, ".claude/loop.json"),
    },
    childStub,
  );
  assert.equal(results[0].status, "FAILED");
  assert.match(results[0].error ?? "", /DispatchDepthExceeded/);
});

test("integration: dirty parent branch refused", async () => {
  const repo = initRepo();
  execSync("git checkout -qb slice/DIRTY", { cwd: repo });
  fs.writeFileSync(path.join(repo, "uncommitted.txt"), "x");
  await assert.rejects(
    dispatchHierarchical(
      [{ id: "C", priority: 0, agentType: "x", prompt: "" }],
      { parentBranch: "slice/DIRTY", repoRoot: repo, depth: 0 },
      async () => {},
    ),
    (e: Error) => e.name === "DispatchWorktreeError",
  );
});
```

- [ ] **Step 2: Run integration tests**

```bash
npm run typecheck && npm test -- src/tests/hierarchical-dispatch.integration.test.mts
```
Expected: 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tests/hierarchical-dispatch.integration.test.mts
git commit -m "test(dispatch): integration coverage for happy/failed/conflict/recursion/depth-cap/dirty (FEAT-020)"
```

---

## Task 15 (Wave 6 — parallel with T11, T13): README + CHANGELOG documentation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

Depends on: nothing (uses only conceptual info already in the spec).

- [ ] **Step 1: Add config doc section to README.md**

Find the existing "Repo conventions" or "Owned agents" section in `README.md`. Add a new subsection (verbatim — copy this block):

````markdown
## Hierarchical dispatch (`loop:hierarchical-dispatcher`, FEAT-020 SLICE-1)

A parent agent can spawn N parallel child subagents in isolated git worktrees,
block on `awaitAll`, then merge DONE children to the parent branch in priority
order. Children themselves can recurse (grandchildren fork off child's branch).

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

| Key | Default | Meaning |
|---|---|---|
| `maxDepth` | 3 | Recursion cap. `0` = top level. Child at `maxDepth` cannot spawn grandchildren. |
| `maxChildrenPerBatch` | 8 | Per-call fanout cap. Refuse to spawn if `plans.length > cap`. |
| `worktreeRoot` | `null` | Override worktree parent dir; `null` = sibling of repo (same as `parallel-runner`). |
| `pruneStaleAfterDays` | 7 | Orphan `dispatch/<runId>/` directory warning threshold. |

### CLI surface

```bash
node scripts/loop.mjs dispatch prepare \
  --plan plan.json --parent-branch slice/SLICE-90 [--repo .] [--depth 0] [--json] [--dry-run]

node scripts/loop.mjs dispatch finalize \
  --run-id <id> --parent-branch slice/SLICE-90 --plan plan.json [--repo .] [--depth 0]
```

In production, the `loop:hierarchical-dispatcher` agent runs `prepare`, invokes
the Agent tool with the returned batch in **one message**, then runs `finalize`.

### Telemetry artifacts

- `.claude/artifacts/loop/dispatch/<runId>/worktrees.jsonl` — spawn log
- `.claude/artifacts/loop/dispatch/<runId>/trace.jsonl` — per-child result + duration + cost (`null` in SLICE-1; FEAT-165 populates)
- `.claude/artifacts/loop/dispatch/<runId>/<childId>.result.json` — canonical child result (marker)
- `.claude/artifacts/loop/dispatch/<runId>/summary.md` — human-readable run summary

### Out of scope for SLICE-1

`crew:parallel-runner` refactor (SLICE-2), truly-async non-blocking parent, cancellation,
`--resume`, cost rollup, budget cap (FEAT-133), per-skill cost (FEAT-165).
````

- [ ] **Step 2: Add CHANGELOG.md entry**

At the top of `CHANGELOG.md`, under the `## [Unreleased]` heading (or matching the existing convention — check recent entries):

```markdown
### Added
- **FEAT-020 SLICE-1** — Hierarchical parallel subagent dispatch primitive.
  New library `src/scripts/lib/hierarchical-dispatch.mts`, CLI subcommand
  `node scripts/loop.mjs dispatch {prepare|finalize}`, and
  `loop:hierarchical-dispatcher` agent. Worktree-per-child isolation,
  blocking `awaitAll`, continue-on-failure, depth-capped recursion via
  `.claude/loop.json` (`dispatchLimits.maxDepth`, default 3). SLICE-2
  (upstream PR refactoring `crew:parallel-runner` to call this library)
  is a follow-up. Spec: `docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md`.
```

- [ ] **Step 3: Run final validation**

```bash
node scripts/validate-content-length.mjs
node scripts/validate-manifests.mjs
npm run typecheck
npm run lint
npm run format:check
npm test
```
Expected: all PASS, clean lint, full test suite green.

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs(dispatch): config + CLI + telemetry docs for FEAT-020 SLICE-1"
```

---

## Acceptance checklist (verify before declaring SLICE-1 done)

- [ ] All 15 tasks committed in order, each with green test step.
- [ ] `npm test` clean, including all `hierarchical-dispatch*` tests.
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` clean.
- [ ] `node scripts/validate-content-length.mjs` PASS (agent ≤ 300 lines).
- [ ] `node scripts/validate-manifests.mjs` PASS (agent registered if manifest requires).
- [ ] `node scripts/loop.mjs dispatch --help` prints usage.
- [ ] `agents/hierarchical-dispatcher.md` exists with namespaced id `loop:hierarchical-dispatcher`.
- [ ] `README.md` documents the `dispatchLimits` keys.
- [ ] `CHANGELOG.md` has the SLICE-1 entry.
- [ ] The integration `recursion 1 level deep` test passes — proves the primitive recurses correctly.

---

## Self-review (run after the plan is written)

1. **Spec coverage**: every spec section maps to at least one task.
   - §Architecture → Tasks 1–10 (each library module).
   - §Library API → T1 (types/errors), T10 (entrypoint + barrel re-export).
   - §Worktree lifecycle → T4 (spawn + cleanup), T9 (merge cleanup).
   - §Dispatch flow → T5 (augmentation), T7 (batch build), T10 (orchestrator).
   - §Result aggregation + merge → T8 + T9.
   - §CLI + agent → T11 (CLI), T12 (wire), T13 (agent).
   - §Config + telemetry → T2 (config), T6 (trace), T15 (docs).
   - §Failure model + edge cases → T3 (gates), T4 (preflight), T9 (conflict), T14 (integration scenarios).
   - §Testing → T1–T10 each ship their own per-module unit test file; T14 integration.
   - §Out of scope → respected throughout. Note in spec covers single-file → split rationale.

2. **Placeholder scan**: no `TBD` / `TODO` / `fill in later`. Every code block runs as written.

3. **Type consistency**:
   - `DispatchPlan`, `DispatchResult`, `DispatchOptions`, `DispatchConfig`, `DispatchStatus` defined T1 (`dispatch-types.mts`), imported via `./dispatch-types.mjs` across all later modules.
   - `prepareDispatch`, `finalizeDispatch`, `dispatchHierarchical` defined T10, called from T11 (CLI), T13 (agent body), T14 (integration).
   - `AgentBatchCall` defined T7 (`dispatch-batch.mts`), used in T10, T11, T13, T14.
   - Error classes (`DispatchDepthExceeded`, `DispatchFanoutExceeded`, `DispatchWorktreeError`, `DispatchConfigError`) defined T1, used in T3, T4, T14.

4. **Single-import-surface verification**: T10's barrel re-export means all tests and external callers can `import { ... } from "../scripts/lib/hierarchical-dispatch.mjs"`. T14's integration test does exactly this — its passing run proves the barrel is correct.

5. **Wave-collision check**: confirmed no two tasks within the same wave write to the same file. Test files are per-module. Library files are per-module. Wave 7 splits cleanly (T12 modifies `loop.mts`; T14 creates `*.integration.test.mts`).

6. **Dependency-edge check**: every task's "Depends on:" line traces back to an upstream wave. No backward edges, no cycles.

No issues found. Plan ready for parallel execution.
