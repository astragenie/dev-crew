# Code-Quality Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `loop` plugin codebase into alignment with `C:\work\mega\standards\docs\typescript` + `patterns`, delete confirmed-dead modules + tests, and land the top 10 perf quick wins behind a regression-gated benchmark harness.

**Architecture:** Sequenced three-phase rollout. **Phase A** deletes deprecated and one-shot modules + their tests (DEC-011 already authorizes the marker-queue drop). **Phase B** flips one tsconfig flag per slice, fixing errors inline so every commit stays green, then layers in Result<T, E>, branded IDs, and discriminated unions where they remove real failure modes. **Phase C** ships a `node:test` bench harness as a gate, then lands ten targeted perf wins (memoization, single backlog snapshot, lazy subcommand load, batched git, parallel fs, regex hoisting, decisions/grade caching, structured clone, Map lookups, telemetry batching).

**Tech Stack:** Node 22 ESM, TypeScript 6 strict, `node:test`, `node --test`, `tsc`, ESLint 9 flat config, Prettier 3. No new runtime deps. Repo emits `.mjs` from `.mts` via `tsc`.

---

## File Structure

### Phase A — files to delete

| Source | Test pair |
|---|---|
| `src/scripts/lib/marker-drain.mts` | `src/tests/marker-drain.test.mts` |
| `src/scripts/lib/adhoc-migrator.mts` | `src/tests/adhoc-migrator.test.mts` |
| `src/scripts/lib/legacy-migrator.mts` | `src/tests/legacy-migrator.test.mts` |
| `src/scripts/codemod-add-any.mts` | (none) |
| `src/scripts/migrate-product-backlog.mts` | (none) |

### Phase A — files to modify (caller removal + dead-code sweep)

- `src/scripts/lib/auto-dispatch.mts` — drop marker-write branch (lines 35, 101–110, 116). Keep `dispatchAgent` audit-log path.
- `src/scripts/lib/slice-linker/complete-slice.mts` — drop `DrainOpts/DrainResult` import on line 21 and any drain call sites.
- `src/scripts/lib/loop-installer.mts` — drop `migrateLegacyAutonomousLoop` call (line 97), `appendLegacyMigrationWrites` helper (lines 32–44), `runAdhocMigration` helper (lines 46–62) and their imports / invocations.
- `src/scripts/lib/loop-installer-scaffold.mts` — drop any `pending-dispatch` dir scaffold writes.

### Phase B — files to create

- `src/scripts/lib/result.mts` — canonical `Result<T, E>` type + `ok`, `err`, `map`, `flatMap`. Per standards.
- `src/scripts/lib/ids.mts` — branded `FeatId`, `SliceId`, `SpecId`, `DecisionId`, `GradeId` types and validating constructors.
- `src/tests/result.test.mts`
- `src/tests/ids.test.mts`

### Phase B — files to modify (per slice)

- `tsconfig.json` — one flag per slice (B1–B5).
- All source files surfaced by each typecheck pass.
- Domain parsers: `backlog-parser.mts`, `frontmatter.mts`, `spec-parser.mts`, `grade-parser.mts` → Result-bearing return types in B6.
- Gates: `validation-gate.mts`, `phase-gate.mts`, `walker-gates.mts` → Result-bearing return types in B6.
- ID-handling sites (~80 call sites) → branded ID constructors in B7.
- State-shape sites: `stop-conditions.mts`, `walker-gates.mts`, `halt-badges.mts` → discriminated unions in B8.

### Phase C — files to create

- `src/tests/perf/bench.mts` — `node:test` bench blocks for top-5 hot commands.
- `.claude/artifacts/loop/perf/baseline.json` — recorded baseline (CI gate input).
- `src/scripts/lib/backlog-snapshot.mts` — single shared backlog scan (C2 win #2).

### Phase C — files to modify

- `src/scripts/lib/frontmatter.mts` — `(path, mtime)` memo.
- `src/scripts/lib/brief.mts`, `auto-walker.mts`, `pattern-alerts.mts`, `backlog-triage.mts` — switch to `loadBacklogSnapshot()`.
- `src/scripts/loop.mts` — lazy `await import()` per CLI branch.
- `src/scripts/lib/cost-regression.mts`, `auto-merge.mts`, `effective-cwd.mts` — batched git reads.
- `src/scripts/lib/backlog-parser.mts`, `grade-parser.mts`, `decisions-store.mts` — parallel fs walk + per-process memo.
- `src/scripts/lib/halt-badges.mts`, `backlog-parser.mts` — hoist regex.
- `src/scripts/lib/telemetry.mts` — batch flush on `exit`.

---

## Phase A — Dead-code sweep

### Task A1: Delete confirmed-dead module: `marker-drain.mts`

**Files:**
- Delete: `src/scripts/lib/marker-drain.mts`
- Delete: `src/tests/marker-drain.test.mts`
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts`
- Delete: `scripts/lib/marker-drain.mjs` (build artifact)
- Delete: `tests/marker-drain.test.mjs` (build artifact)

- [ ] **Step 1: Pre-flight — confirm all current callers**

```bash
cd C:/work/mega/loop && grep -rn "marker-drain\|drainPendingDispatchMarkers" src tests scripts 2>&1
```

Expected: only matches in `src/scripts/lib/marker-drain.mts`, `src/scripts/lib/slice-linker/complete-slice.mts`, `src/tests/marker-drain.test.mts` and their compiled `.mjs` counterparts.

- [ ] **Step 2: Run full test suite to record baseline**

```bash
cd C:/work/mega/loop && npm test 2>&1 | tail -20
```

Expected: PASS (record number of tests passing).

- [ ] **Step 3: Remove import + caller in `complete-slice.mts`**

Open `src/scripts/lib/slice-linker/complete-slice.mts`. Delete line 21:

```ts
import type { DrainOpts, DrainResult } from "../marker-drain.mjs";
```

Delete line 25:

```ts
type DrainFn = (repoPath: string, opts?: DrainOpts) => Promise<DrainResult>;
```

Search the rest of the file for `DrainFn`, `drainPendingDispatch`, or `markerDrain` usage; remove parameters / call sites. Common pattern: a `drain` parameter on the exported orchestrator function — remove from signature, remove from invocation in `src/scripts/loop.mts` or test fixtures if present.

- [ ] **Step 4: Delete source + test**

```bash
cd C:/work/mega/loop && rm src/scripts/lib/marker-drain.mts src/tests/marker-drain.test.mts scripts/lib/marker-drain.mjs tests/marker-drain.test.mjs
```

- [ ] **Step 5: Rebuild + run all tests**

```bash
cd C:/work/mega/loop && npm run typecheck && npm test 2>&1 | tail -20
```

Expected: typecheck clean. Test count = baseline minus removed `marker-drain.test.mts` test count. Zero failures.

- [ ] **Step 6: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "chore(SLICE-A1): delete marker-drain module + test (DEC-011)

Marker-queue dispatch path was deprecated by DEC-011. The drain helper
had no production consumer; only the complete-slice optional parameter
referenced it. Caller cleaned. Build artifacts removed."
```

---

### Task A2: Delete deprecated marker-write path in `auto-dispatch.mts`

**Files:**
- Modify: `src/scripts/lib/auto-dispatch.mts`
- Modify: `src/tests/auto-dispatch.test.mts` (drop marker-related assertions)
- Delete: `scripts/lib/auto-dispatch.mjs` (regenerated)

- [ ] **Step 1: Identify marker-related test assertions**

```bash
cd C:/work/mega/loop && grep -n "marker\|PENDING_DISPATCH\|pending-dispatch" src/tests/auto-dispatch.test.mts 2>&1
```

Record each line for removal.

- [ ] **Step 2: Edit `auto-dispatch.mts` to drop marker-write branch**

Open `src/scripts/lib/auto-dispatch.mts`.

Delete line 35:

```ts
const PENDING_DISPATCH_REL = ".claude/artifacts/loop/pending-dispatch";
```

In the `dispatchAgent` function, replace lines 101–118 (the marker-write block + `output: "<marker-written:..." line`) with a direct "noop dispatch acknowledged" path:

```ts
    const durationMs = Date.now() - start;
    const result: DispatchResult = {
      ok: true,
      skipped: false,
      output: "<dispatch-acknowledged>",
      durationMs
    };
    await appendAuditLog(repoRoot, buildAuditEntry(result));
    return result;
```

Update the file-header doc-comment (lines 1–9) to reflect that the marker queue is gone per DEC-011 and the function now writes only the audit-log line. Suggested replacement:

```ts
// auto-dispatch.mts — shared audit-log appender for role-agent dispatch from
// loop CLI commands. The marker-queue dispatch path was deprecated by
// DEC-011; this module now records the dispatch intent in the audit log
// only. Slash flows orchestrate role agents directly via Agent() calls.
```

- [ ] **Step 3: Remove marker-related assertions in test**

Open `src/tests/auto-dispatch.test.mts`. Remove any test cases that read `result.output` for a `<marker-written:...>` substring, or that read files under `.claude/artifacts/loop/pending-dispatch/`. Replace with assertions on the audit-log line (existing tests likely cover this already).

- [ ] **Step 4: Run typecheck + test**

```bash
cd C:/work/mega/loop && npm run typecheck && node --test tests/auto-dispatch.test.mjs 2>&1 | tail -10
```

Expected: typecheck clean. All `auto-dispatch.test.mjs` cases pass.

- [ ] **Step 5: Run full test suite**

```bash
cd C:/work/mega/loop && npm test 2>&1 | tail -10
```

Expected: no failures.

- [ ] **Step 6: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "chore(SLICE-A2): drop marker-write path in auto-dispatch (DEC-011)

The pending-dispatch marker queue had no production consumer (CLAUDE.md
notes 'no consumer is planned'). dispatchAgent now only records the
audit log line. Removed the PENDING_DISPATCH_REL constant, the marker
file write, and the corresponding test assertions."
```

---

### Task A3: Delete one-shot migrators + caller integration in `loop-installer.mts`

**Files:**
- Delete: `src/scripts/lib/adhoc-migrator.mts`, `src/tests/adhoc-migrator.test.mts`
- Delete: `src/scripts/lib/legacy-migrator.mts`, `src/tests/legacy-migrator.test.mts`
- Delete: `src/scripts/codemod-add-any.mts`
- Delete: `src/scripts/migrate-product-backlog.mts`
- Modify: `src/scripts/lib/loop-installer.mts`
- Delete: corresponding `.mjs` build artifacts under `scripts/`, `tests/`

- [ ] **Step 1: Audit caller surfaces**

```bash
cd C:/work/mega/loop && grep -rn "legacy-migrator\|adhoc-migrator\|codemod-add-any\|migrate-product-backlog" src scripts 2>&1
```

Expected: matches only in the files about to be deleted plus `src/scripts/lib/loop-installer.mts`.

- [ ] **Step 2: Edit `src/scripts/lib/loop-installer.mts`**

Delete line 12:

```ts
import { migrateLegacyAutonomousLoop } from "./legacy-migrator.mjs";
```

Delete lines 32–44 (the `appendLegacyMigrationWrites` helper).

Delete lines 46–62 (the `runAdhocMigration` helper).

In `installLoop`, delete lines 91, 97, 98 (the `legacyMigration` call and its writes-append):

```ts
  // Migrate legacy `autonomous-loop` state from < v0.3.0 BEFORE any other
  // ...
  const legacyMigration = await migrateLegacyAutonomousLoop(repoPath);
  appendLegacyMigrationWrites(legacyMigration, writes);
```

Delete lines 102–104 (the `runAdhocMigration` call + its guard):

```ts
  if (options.migrateAdhoc !== false) {
    await runAdhocMigration(repoPath, writes);
  }
```

In the return object at the bottom, drop the `legacyMigration` field:

```ts
  return {
    mode: "install-loop",
    preset: config.preset,
    repoPath,
    crewCli,
    writes
  };
```

- [ ] **Step 3: Delete source modules + tests + build artifacts**

```bash
cd C:/work/mega/loop && rm src/scripts/lib/adhoc-migrator.mts src/tests/adhoc-migrator.test.mts src/scripts/lib/legacy-migrator.mts src/tests/legacy-migrator.test.mts src/scripts/codemod-add-any.mts src/scripts/migrate-product-backlog.mts scripts/lib/adhoc-migrator.mjs tests/adhoc-migrator.test.mjs scripts/lib/legacy-migrator.mjs tests/legacy-migrator.test.mjs scripts/codemod-add-any.mjs scripts/migrate-product-backlog.mjs 2>&1
```

- [ ] **Step 4: Update `loop-installer` tests to drop migration assertions**

```bash
cd C:/work/mega/loop && grep -rn "legacyMigration\|migrateAdhoc" src/tests 2>&1
```

For each match: open the test, delete the assertion. If a whole `describe`/`test` block is migration-specific, delete the block.

- [ ] **Step 5: Drop migration-scaffold writes in `loop-installer-scaffold.mts`**

```bash
cd C:/work/mega/loop && grep -n "pending-dispatch" src/scripts/lib/loop-installer-scaffold.mts 2>&1
```

If matches present, remove the dir scaffold writes. If none, skip.

- [ ] **Step 6: Run typecheck + full test suite**

```bash
cd C:/work/mega/loop && npm run typecheck && npm test 2>&1 | tail -15
```

Expected: typecheck clean. Test count drops by the migration test counts. Zero failures.

- [ ] **Step 7: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "chore(SLICE-A3): delete one-shot migrators (legacy/adhoc/codemod/backlog-migrate)

These were one-shot transitions long since complete. The legacy-autonomous-loop
migration covered v < 0.3.0; we're past v0.25. The ad-hoc HARD RULE rewriter
ran during initial install. codemod-add-any was a one-pass mass codemod;
migrate-product-backlog folded the legacy doc into FEAT files. Caller in
loop-installer.mts removed in lockstep."
```

---

## Phase B — Tsconfig tighten + standards alignment

### Task B1: Enable `noImplicitAny` + `useUnknownInCatchVariables`

**Files:**
- Modify: `tsconfig.json`
- Modify: every file surfaced by `tsc --noEmit` after the flag flip (255 `: any` + 33 `as any` + 23 `catch (e)` candidates)

This is the largest single slice. If the diff exceeds 800 LoC, abort the commit, split work into B1a (`src/scripts/lib/*`, top level only) and B1b (`src/scripts/lib/slice-linker/*` + `src/scripts/*` entry points), and rerun each as its own task.

- [ ] **Step 1: Record baseline error count by flipping flag in dry-run**

Open `tsconfig.json`. Change:

```jsonc
    "noImplicitAny": false,
    "useUnknownInCatchVariables": false,
```

to:

```jsonc
    "noImplicitAny": true,
    "useUnknownInCatchVariables": true,
```

Run:

```bash
cd C:/work/mega/loop && npx tsc --project tsconfig.json --noEmit 2>&1 | tail -50; echo "---count---"; npx tsc --project tsconfig.json --noEmit 2>&1 | grep -c "error TS"
```

Record the total error count. Revert the tsconfig change before continuing (`git checkout -- tsconfig.json`).

- [ ] **Step 2: If error count > 200, split this task**

If the dry-run reported > 200 errors, abort B1 here. Save the dry-run output as `docs/superpowers/plans/2026-06-07-b1-dryrun.txt`, commit nothing, and re-split into:

- **B1a**: enable flags but only fix `src/scripts/lib/*.mts` (excluding `slice-linker/`)
- **B1b**: fix `src/scripts/lib/slice-linker/**/*.mts` + `src/scripts/*.mts` entry points

In that split, B1a flips the flags, B1b only does the residual fixes — but B1a will leave the build red until B1b lands, so apply this split inside a single feature branch and squash-merge at the end. Adjust the slice plan accordingly.

If error count ≤ 200, continue.

- [ ] **Step 3: Re-flip the flags**

```bash
cd C:/work/mega/loop
```

Open `tsconfig.json`, set both flags to `true` (per Step 1).

- [ ] **Step 4: Fix `catch (err)` blocks (use `useUnknownInCatchVariables`)**

For each catch block surfaced by typecheck (canonical pattern: `catch (err: any)`):

Before:

```ts
} catch (err: any) {
  if (err?.code === "ENOENT") return result;
  throw err;
}
```

After:

```ts
} catch (err) {
  if (err instanceof Error && "code" in err && err.code === "ENOENT") {
    return result;
  }
  throw err;
}
```

Or, when the call site needs an error message string:

```ts
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  // ...
}
```

Apply across all 23 `catch (...)` sites. Reference list:

```bash
cd C:/work/mega/loop && grep -rn "catch (\w*: any)\|catch (\w*) {" src/scripts 2>&1
```

- [ ] **Step 5: Replace `: any` parameter / return annotations**

For each function with `: any` parameter or return, narrow to the real type. Common patterns:

| Before | After |
|---|---|
| `function f(x: any): any` | infer from call sites; usually `unknown` then validate, or a specific shape |
| `(workflowState: any)` reading `currentRun.gates` | define an interface in the module: `interface WorkflowState { currentRun?: { gates?: Record<string, GateEntry> } }` |
| `const writes: any[]` (in `loop-installer.mts`) | `const writes: string[]` (it only holds path strings) |
| `Record<string, any>` in option bags | replace with explicit `interface Options { ... }` |

When a value is truly polymorphic (e.g. parsed JSON of unknown shape), declare `unknown` and narrow at use:

```ts
function readUnknownJson(s: string): unknown {
  return JSON.parse(s);
}

const raw = readUnknownJson(text);
if (typeof raw === "object" && raw !== null && "id" in raw && typeof raw.id === "string") {
  // use raw.id as string
}
```

- [ ] **Step 6: Replace `as any` casts**

For each `as any`:

- If it suppresses a real type bug, fix the underlying type.
- If it bridges to an external lib whose typing is incomplete, replace with `as unknown as T` (forces explicit double-cast — visible in review).
- If it casts a `Record<string, unknown>` value to a known shape after validation, declare a Zod schema instead and validate.

Reference list:

```bash
cd C:/work/mega/loop && grep -rn "as any" src/scripts 2>&1
```

- [ ] **Step 7: Run typecheck — confirm clean**

```bash
cd C:/work/mega/loop && npm run typecheck 2>&1 | tail -5
```

Expected: no error output, exit code 0.

- [ ] **Step 8: Run lint + tests**

```bash
cd C:/work/mega/loop && npm run lint && npm test 2>&1 | tail -15
```

Expected: lint clean, all tests pass.

- [ ] **Step 9: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B1): enable noImplicitAny + useUnknownInCatchVariables

Replaced 255 ':any' annotations and 33 'as any' casts with narrow types
or 'unknown' + runtime narrowing. Rewrote 23 catch-blocks to use
instanceof Error guards. Matches standards/typescript flags."
```

---

### Task B2: Enable `noUnusedLocals` + `noUnusedParameters`

**Files:**
- Modify: `tsconfig.json`
- Modify: every file surfaced by typecheck

- [ ] **Step 1: Flip flags**

In `tsconfig.json`, add to `compilerOptions`:

```jsonc
    "noUnusedLocals": true,
    "noUnusedParameters": true,
```

- [ ] **Step 2: Dry-run to surface errors**

```bash
cd C:/work/mega/loop && npx tsc --project tsconfig.json --noEmit 2>&1 | head -100
```

Expected: a list of `error TS6133: 'X' is declared but its value is never read.` and `error TS6196: 'X' is declared but never used.`.

- [ ] **Step 3: Fix each error**

Two valid patterns:

1. **Truly unused** — delete the local / parameter / import.
2. **Intentionally unused parameter** (e.g. callback signature contract) — prefix with `_`:

   ```ts
   function onMessage(_event: MessageEvent, payload: string): void { ... }
   ```

Do not suppress with `// @ts-ignore`. If a parameter must satisfy a callback shape, the `_` prefix is the standards-approved convention.

- [ ] **Step 4: Verify**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B2): enable noUnusedLocals + noUnusedParameters

Pruned unused imports, locals, and parameters. Intentionally-unused
callback parameters prefixed with underscore per standards convention."
```

---

### Task B3: Enable `noImplicitOverride` + `noFallthroughCasesInSwitch`

**Files:**
- Modify: `tsconfig.json`
- Modify: any subclass methods missing `override`
- Modify: any `switch` with implicit fall-through

- [ ] **Step 1: Flip flags**

Add to `tsconfig.json` `compilerOptions`:

```jsonc
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
```

- [ ] **Step 2: Dry-run**

```bash
cd C:/work/mega/loop && npx tsc --project tsconfig.json --noEmit 2>&1 | tail -50
```

- [ ] **Step 3: Add `override` keyword**

For each `error TS4114: This member must have an 'override' modifier`, add `override`:

```ts
class Foo extends Bar {
  override doThing(): void { ... }
}
```

(This codebase is mostly plain modules; expect few or zero hits.)

- [ ] **Step 4: Fix fall-through cases**

For each `error TS7029`:

- If the fall-through was intentional, add `// fallthrough` line comment **and** verify the surrounding code already handles it semantically (rarely the right call).
- More commonly, add the missing `break` / `return` / `throw`.

- [ ] **Step 5: Verify**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B3): enable noImplicitOverride + noFallthroughCasesInSwitch"
```

---

### Task B4: Enable `exactOptionalPropertyTypes`

**Files:**
- Modify: `tsconfig.json`
- Modify: every type with `?: T` where call sites pass explicit `undefined`

- [ ] **Step 1: Flip flag**

Add to `tsconfig.json` `compilerOptions`:

```jsonc
    "exactOptionalPropertyTypes": true,
```

- [ ] **Step 2: Dry-run**

```bash
cd C:/work/mega/loop && npx tsc --project tsconfig.json --noEmit 2>&1 | head -80
```

Expected: ~20 errors of form `Type 'undefined' is not assignable to type 'X' with 'exactOptionalPropertyTypes: true'`.

- [ ] **Step 3: Choose narrowing per site**

Two valid patterns:

1. **Allow explicit undefined**: widen the type to `T | undefined`:

   ```ts
   interface Opts {
     // before: name?: string;
     name?: string | undefined;
   }
   ```

   Use this when call sites genuinely pass `undefined` (e.g. options bag forwarded from a parent).

2. **Forbid explicit undefined**: change the call site to omit the property when not set:

   ```ts
   // before:
   doThing({ name: maybeName });
   // after:
   doThing(maybeName !== undefined ? { name: maybeName } : {});
   ```

   Use this for genuinely optional fields where the type contract says "present or absent."

Pick the pattern that matches each site's intent.

- [ ] **Step 4: Verify**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B4): enable exactOptionalPropertyTypes

Audited ~20 optional-property sites; widened to '| undefined' or
changed call sites to omit the property when the value is absent."
```

---

### Task B5: Enable `noUncheckedIndexedAccess`

**Files:**
- Modify: `tsconfig.json`
- Modify: every site reading `arr[i]` or `record[key]`

This is the most invasive flag. Expect ~50 narrowing fixes. If the dry-run reports > 80 errors, split into B5a (`src/scripts/lib/*` only) and B5b (`src/scripts/lib/slice-linker/*` + `src/scripts/*` entry points), ship sequentially.

- [ ] **Step 1: Dry-run**

Edit `tsconfig.json`:

```jsonc
    "noUncheckedIndexedAccess": true,
```

Then:

```bash
cd C:/work/mega/loop && npx tsc --project tsconfig.json --noEmit 2>&1 | grep -c "error TS"
```

If the count exceeds 80, revert tsconfig and split per the note above.

- [ ] **Step 2: Fix each access**

Canonical patterns:

```ts
// before
const first = items[0];
first.id;

// after
const first = items[0];
if (first === undefined) throw new Error("expected non-empty items");
first.id;
```

Or, in domain code that genuinely tolerates absence:

```ts
const candidate = entries[ix];
if (!candidate) continue;
// use candidate
```

For `Record<string, V>` access where the key is dynamic and the schema does not promise the key exists:

```ts
const v = record[key];
if (v === undefined) return ok(defaultValue);
return ok(v);
```

For for-each loops that previously assumed `arr[i]` returns `T`, prefer `for (const x of arr)` — iterators do not narrow to `T | undefined`.

- [ ] **Step 3: Verify**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B5): enable noUncheckedIndexedAccess

Narrowed every arr[i]/record[key] read site. Refactored hot loops to
for..of where index-narrowing wasn't needed. Each narrowed access has
an explicit absence path."
```

---

### Task B6: Result<T, E> rollout for parsers + gates

**Files:**
- Create: `src/scripts/lib/result.mts`, `src/tests/result.test.mts`
- Modify: `src/scripts/lib/backlog-parser.mts`, `frontmatter.mts`, `spec-parser.mts`, `grade-parser.mts`
- Modify: `src/scripts/lib/validation-gate.mts`, `phase-gate.mts`, `walker-gates.mts`
- Modify: every caller of the above (canonicalize on `.ok` checks)

- [ ] **Step 1: Write the failing test**

Create `src/tests/result.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ok, err, map, flatMap, type Result } from "../scripts/lib/result.mjs";

test("ok carries the value and discriminates", () => {
  const r = ok(42);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value, 42);
});

test("err carries the error and discriminates", () => {
  const r = err({ code: "boom" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.error, { code: "boom" });
});

test("map applies f when ok, passes through on err", () => {
  const r1 = map(ok(2), (n) => n * 3);
  assert.equal(r1.ok && r1.value, 6);
  const r2: Result<number, string> = map(err("nope"), (n) => n * 3);
  assert.equal(r2.ok, false);
});

test("flatMap chains through ok, short-circuits on err", () => {
  const r = flatMap(ok(2), (n) => (n > 0 ? ok(n * 3) : err("neg")));
  assert.equal(r.ok && r.value, 6);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/work/mega/loop && npm run build && node --test tests/result.test.mjs 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `result.mts`**

Create `src/scripts/lib/result.mts`:

```ts
// result.mts — typed success / failure return per standards.
//
// Use Result<T, E> for domain operations with expected failure modes
// (parse failures, gate refusals, validation failures). Keep throwing
// for infrastructure boundaries (fs / git / network).

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  return r.ok ? ok(f(r.value)) : r;
}

export function flatMap<T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>
): Result<U, E> {
  return r.ok ? f(r.value) : r;
}
```

- [ ] **Step 4: Verify the test passes**

```bash
cd C:/work/mega/loop && npm run build && node --test tests/result.test.mjs 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 5: Convert `frontmatter.mts`**

Open `src/scripts/lib/frontmatter.mts`. Identify each `throw` for a parse failure. Replace the public `parseFrontmatter` signature:

Before:

```ts
export function parseFrontmatter(text: string): { frontmatter: Record<string, unknown>; body: string } {
  // ...
  if (!match) throw new Error("missing frontmatter");
  // ...
}
```

After:

```ts
import { ok, err, type Result } from "./result.mjs";

export type ParseError =
  | { readonly code: "missing-frontmatter" }
  | { readonly code: "malformed-yaml"; readonly detail: string };

export type ParsedFile = {
  readonly frontmatter: Record<string, unknown>;
  readonly body: string;
};

export function parseFrontmatter(text: string): Result<ParsedFile, ParseError> {
  // ...
  if (!match) return err({ code: "missing-frontmatter" });
  // ...
  return ok({ frontmatter, body });
}
```

Update every caller. Common pattern:

Before:

```ts
const { frontmatter, body } = parseFrontmatter(text);
```

After:

```ts
const parsed = parseFrontmatter(text);
if (!parsed.ok) {
  // handle per-caller — log + skip, propagate Result, or throw at CLI boundary
  throw new Error(`parse failed: ${parsed.error.code}`);
}
const { frontmatter, body } = parsed.value;
```

Keep `throw` at CLI entry-point sites only — internal callers should propagate the Result.

- [ ] **Step 6: Convert `backlog-parser.mts`, `spec-parser.mts`, `grade-parser.mts`**

Apply the same pattern: error variants per parser, `Result<T, E>` return, caller migration. Add a `ParseError` discriminated union per module (e.g. `BacklogParseError`, `SpecParseError`, `GradeParseError`).

- [ ] **Step 7: Convert gates (`validation-gate.mts`, `phase-gate.mts`, `walker-gates.mts`)**

Each gate currently signals "blocked" via a return object with `status: "block"` or by throwing. Canonicalize on `Result<GateOutcome, GateError>` where `GateError` is the discriminated union of all refusal reasons.

Example for `validation-gate.mts`:

```ts
export type GateError =
  | { readonly kind: "missing-evidence"; readonly required: readonly string[] }
  | { readonly kind: "validation-skipped"; readonly reason: string }
  | { readonly kind: "no-validator-attestation" };

export type GateOutcome = {
  readonly status: "pass";
  readonly evidence: readonly string[];
};

export function deriveValidationGate(/* args */): Result<GateOutcome, GateError> {
  // ...
}
```

Update callers (`complete-slice.mts`, `crew-bridge.mts`, etc.) accordingly.

- [ ] **Step 8: Run typecheck + lint + tests**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -15
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B6): Result<T,E> for parsers + gates

Domain operations with expected failure modes now return Result<T,E>
instead of throwing. Parser modules expose discriminated error unions
(missing-frontmatter, malformed-yaml, ...). Gate modules expose
GateError unions (missing-evidence, validation-skipped, ...). fs/git
failures still throw at boundaries."
```

---

### Task B7: Branded ID types

**Files:**
- Create: `src/scripts/lib/ids.mts`, `src/tests/ids.test.mts`
- Modify: ~80 call sites that pass raw strings as IDs

- [ ] **Step 1: Write the failing test**

Create `src/tests/ids.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { FeatId, SliceId, SpecId, DecisionId, GradeId } from "../scripts/lib/ids.mjs";

test("FeatId accepts valid format", () => {
  const id = FeatId("FEAT-042");
  assert.equal(String(id), "FEAT-042");
});

test("FeatId rejects malformed input", () => {
  assert.throws(() => FeatId("feat-42"), /FeatId/);
  assert.throws(() => FeatId("FEAT-1"), /FeatId/);
});

test("SliceId accepts valid format", () => {
  const id = SliceId("SLICE-68");
  assert.equal(String(id), "SLICE-68");
});

test("SpecId, DecisionId, GradeId enforce their formats", () => {
  assert.equal(String(SpecId("SPEC-001")), "SPEC-001");
  assert.equal(String(DecisionId("DEC-024")), "DEC-024");
  assert.equal(String(GradeId("SLICE-68")), "SLICE-68");
  assert.throws(() => SpecId("SPEC-1"));
  assert.throws(() => DecisionId("dec-024"));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/work/mega/loop && npm run build && node --test tests/ids.test.mjs 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `ids.mts`**

Create `src/scripts/lib/ids.mts`:

```ts
// ids.mts — branded ID types for loop entities. Surfaces ID-mixing
// bugs at compile time and validates canonical formats at the
// construction boundary.

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type FeatId = Brand<string, "FeatId">;
export type SliceId = Brand<string, "SliceId">;
export type SpecId = Brand<string, "SpecId">;
export type DecisionId = Brand<string, "DecisionId">;
export type GradeId = Brand<string, "GradeId">;

function makeIdConstructor<B extends string>(brand: B, pattern: RegExp) {
  return (s: string): Brand<string, B> => {
    if (!pattern.test(s)) {
      throw new Error(`${brand} expected /${pattern.source}/, got: ${s}`);
    }
    return s as Brand<string, B>;
  };
}

export const FeatId = makeIdConstructor("FeatId", /^FEAT-\d{3,}$/);
export const SliceId = makeIdConstructor("SliceId", /^SLICE-\d{2,}$/);
export const SpecId = makeIdConstructor("SpecId", /^SPEC-\d{3,}$/);
export const DecisionId = makeIdConstructor("DecisionId", /^DEC-\d{3,}$/);
export const GradeId = makeIdConstructor("GradeId", /^SLICE-\d{2,}$/);
```

- [ ] **Step 4: Verify the test passes**

```bash
cd C:/work/mega/loop && npm run build && node --test tests/ids.test.mjs 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 5: Migrate call sites**

For each module that handles IDs, replace raw `string` types with the branded type and wrap raw inputs through the constructor at the entry point:

```ts
// before
export interface BacklogEntry {
  id: string;        // FEAT-NNN
  status: string;
}

// after
import type { FeatId } from "./ids.mjs";
import { FeatId as FeatIdCtor } from "./ids.mjs";

export interface BacklogEntry {
  id: FeatId;
  status: string;
}

// at the parse boundary:
const fm = parsedFrontmatter.value.frontmatter;
const id = typeof fm.id === "string" ? FeatIdCtor(fm.id) : (() => { throw new Error("missing id"); })();
```

Apply in `backlog-parser.mts`, `backlog-writer.mts`, `brief.mts`, `slice-linker/*`, `decisions-store.mts`, `grade-parser.mts`, `pm-scorer.mts`, `release-planner.mts`, `linkage.mts`. Migrate top-down: validate at the parser, propagate the branded type throughout.

- [ ] **Step 6: Verify**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B7): branded ID types for FEAT/SLICE/SPEC/DEC/GRADE

Validated at construction (regex per ID class), opaque to callers.
Prevents accidental string-mixing across ID classes (e.g. passing a
FeatId where a SliceId is required) at compile time."
```

---

### Task B8: Discriminated unions for state shape

**Files:**
- Modify: `src/scripts/lib/stop-conditions.mts`
- Modify: `src/scripts/lib/walker-gates.mts`
- Modify: `src/scripts/lib/halt-badges.mts`
- Modify: callers + tests

- [ ] **Step 1: Audit current shape**

```bash
cd C:/work/mega/loop && grep -n "halted\|blocked\|escalated" src/scripts/lib/stop-conditions.mts src/scripts/lib/walker-gates.mts src/scripts/lib/halt-badges.mts 2>&1 | head -30
```

Identify any place using multiple boolean flags or null-as-state.

- [ ] **Step 2: Rewrite `stop-conditions.mts` shape**

If the current return shape is:

```ts
{ halted: boolean; reason: string | null; severity: string | null; }
```

Replace with:

```ts
export type StopCondition =
  | { readonly status: "continue" }
  | { readonly status: "halt"; readonly reason: HaltReason; readonly severity: "info" | "warn" | "high" };

export type HaltReason =
  | { readonly code: "iteration-cap"; readonly limit: number; readonly current: number }
  | { readonly code: "cost-stop"; readonly verdict: "stop" }
  | { readonly code: "redundant-read"; readonly file: string }
  | { readonly code: "crew-escalation"; readonly slice: string }
  | { readonly code: "external-block"; readonly detail: string };
```

Update every caller (`auto-walker.mts`, `loop.mts`, `brief.mts`) to switch on `status` then `code`.

- [ ] **Step 3: Apply the same shape to `walker-gates.mts`**

Where the gate currently returns `{ ok: boolean; blockReason?: string }`, replace with a discriminated union:

```ts
export type GateVerdict =
  | { readonly status: "pass" }
  | { readonly status: "block"; readonly reason: BlockReason };

export type BlockReason =
  | { readonly code: "missing-handoff" }
  | { readonly code: "no-review-pass" }
  | { readonly code: "validation-fail"; readonly detail: string };
```

- [ ] **Step 4: Apply to `halt-badges.mts`**

The halt-badge field carries severity + code today. Reshape its public type to a `HaltBadge` discriminated union keyed on `code` so consumers get exhaustiveness. Cross-check against `docs/halt-badges.md` (the registry) — keep the codes in lockstep.

- [ ] **Step 5: Add exhaustiveness guard**

For every switch on the new union, add the canonical exhaustiveness pattern:

```ts
function assertNever(x: never): never {
  throw new Error(`unreachable: ${JSON.stringify(x)}`);
}

switch (cond.code) {
  case "iteration-cap": return ...;
  case "cost-stop": return ...;
  case "redundant-read": return ...;
  case "crew-escalation": return ...;
  case "external-block": return ...;
  default: return assertNever(cond);
}
```

- [ ] **Step 6: Verify**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 7: Update `docs/halt-badges.md`**

If the badge field names changed, update the registry doc to match. The doc is the source-of-truth contract for cross-plugin halt-badge readers per SPEC-003.

- [ ] **Step 8: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-B8): discriminated unions for stop / gate / halt-badge state

Replaced boolean-flag-soup state shapes with tagged unions. Every
switch gets compiler-enforced exhaustiveness via assertNever default.
Halt-badge codes synced with docs/halt-badges.md registry."
```

---

## Phase C — Top-10 perf wins

### Task C1: Perf benchmark harness

**Files:**
- Create: `src/tests/perf/bench.mts`
- Create: `.claude/artifacts/loop/perf/baseline.json` (written by the harness on first run)
- Modify: `package.json` — add `bench` script
- Modify: `.gitignore` — keep `baseline.json` versioned (do not ignore)

- [ ] **Step 1: Add `bench` script**

Open `package.json`. In `scripts`, add:

```jsonc
    "bench": "node --test tests/perf/*.test.mjs"
```

Also include the bench output in the build step. Add `src/tests/perf/*.mts` to `tsconfig.test.json` includes if it has explicit includes.

- [ ] **Step 2: Write the bench harness**

Create `src/tests/perf/bench.mts`:

```ts
// perf/bench.mts — wall-clock benchmark for hot CLI commands.
//
// Records median of N samples per command into baseline.json.
// CI regression gate: no command may exceed baseline * REGRESSION_THRESHOLD.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const BASELINE_PATH = path.join(
  REPO_ROOT,
  ".claude",
  "artifacts",
  "loop",
  "perf",
  "baseline.json"
);
const SAMPLES = Number(process.env.BENCH_SAMPLES ?? 5);
const REGRESSION_THRESHOLD = 1.1;

interface Sample {
  command: string;
  medianMs: number;
}

const COMMANDS: ReadonlyArray<{ name: string; argv: readonly string[] }> = [
  { name: "loop-brief", argv: ["brief"] },
  { name: "loop-triage", argv: ["triage"] },
  { name: "loop-auto", argv: ["auto", "--dry-run"] },
  { name: "loop-slice-start", argv: ["slice", "start", "--dry-run"] },
  { name: "loop-slice-complete", argv: ["slice", "complete", "--dry-run"] }
];

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const lo = sorted[mid - 1] ?? 0;
    const hi = sorted[mid] ?? 0;
    return (lo + hi) / 2;
  }
  return sorted[mid] ?? 0;
}

function timeCommand(argv: readonly string[]): number {
  const start = process.hrtime.bigint();
  try {
    execSync(
      `node ${path.join(REPO_ROOT, "scripts", "loop.mjs")} ${argv.join(" ")} --repo ${REPO_ROOT}`,
      { stdio: "pipe" }
    );
  } catch {
    // Some commands non-zero exit on dry-run; we still measured wall clock.
  }
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
}

function loadBaseline(): Record<string, number> | null {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  const raw = fs.readFileSync(BASELINE_PATH, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

function saveBaseline(samples: readonly Sample[]): void {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  const body: Record<string, number> = {};
  for (const s of samples) body[s.command] = s.medianMs;
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(body, null, 2));
}

for (const cmd of COMMANDS) {
  test(`bench ${cmd.name}`, () => {
    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i++) samples.push(timeCommand(cmd.argv));
    const med = median(samples);
    console.log(`bench ${cmd.name}: median ${med.toFixed(1)} ms across ${SAMPLES} samples`);

    const baseline = loadBaseline();
    if (baseline === null) {
      // First run — emit baseline; do not assert.
      saveBaseline([{ command: cmd.name, medianMs: med }]);
      return;
    }
    const prev = baseline[cmd.name];
    if (prev === undefined) {
      baseline[cmd.name] = med;
      saveBaseline(
        Object.entries(baseline).map(([k, v]) => ({ command: k, medianMs: v }))
      );
      return;
    }
    assert.ok(
      med <= prev * REGRESSION_THRESHOLD,
      `${cmd.name} regressed: ${med.toFixed(1)} ms vs baseline ${prev.toFixed(1)} ms`
    );
  });
}
```

- [ ] **Step 3: Build + run once to seed baseline**

```bash
cd C:/work/mega/loop && npm run build && npm run bench 2>&1 | tail -20
```

Expected: each `bench loop-*` test passes, baseline JSON written.

- [ ] **Step 4: Confirm baseline file is present + commit-tracked**

```bash
cd C:/work/mega/loop && cat .claude/artifacts/loop/perf/baseline.json && git check-ignore -v .claude/artifacts/loop/perf/baseline.json 2>&1
```

Expected: file contents printed; ignore check confirms it is NOT ignored. If ignored, edit `.gitignore` to allow it.

- [ ] **Step 5: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-C1): perf benchmark harness with regression gate

node:test bench blocks for the top 5 hot CLI commands. Median of 5
samples per command. baseline.json checked in; subsequent runs fail
if any command regresses more than 10% from baseline."
```

---

### Task C2: Perf wins #1–5

**Files:**
- Modify: `src/scripts/lib/frontmatter.mts` — memo by `(path, mtime)`
- Create: `src/scripts/lib/backlog-snapshot.mts`
- Modify: `src/scripts/lib/brief.mts`, `auto-walker.mts`, `pattern-alerts.mts`, `backlog-triage.mts` — call `loadBacklogSnapshot`
- Modify: `src/scripts/loop.mts` — lazy `await import()`
- Modify: `src/scripts/lib/cost-regression.mts`, `auto-merge.mts`, `effective-cwd.mts` — batched git
- Modify: `src/scripts/lib/backlog-parser.mts`, `grade-parser.mts`, `decisions-store.mts` — parallel fs

- [ ] **Step 1: Write a memoization test for `frontmatter.mts`**

Append to `src/tests/frontmatter.test.mts`:

```ts
test("parseFrontmatterCached returns the same result for the same (path, mtime)", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-fm-cache-"));
  const file = path.join(dir, "x.md");
  await fs.writeFile(file, "---\nid: FEAT-001\n---\nbody\n", "utf8");
  const r1 = await parseFrontmatterCached(file);
  const r2 = await parseFrontmatterCached(file);
  assert.strictEqual(r1, r2, "expected the same object reference on cache hit");
});

test("parseFrontmatterCached invalidates on mtime change", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-fm-cache-mtime-"));
  const file = path.join(dir, "x.md");
  await fs.writeFile(file, "---\nid: FEAT-001\n---\nbody\n", "utf8");
  const r1 = await parseFrontmatterCached(file);
  // bump mtime by writing new content
  await new Promise((resolve) => setTimeout(resolve, 10));
  await fs.writeFile(file, "---\nid: FEAT-002\n---\nbody\n", "utf8");
  const r2 = await parseFrontmatterCached(file);
  assert.notStrictEqual(r1, r2);
});
```

Add the imports at the top of the test:

```ts
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatterCached } from "../scripts/lib/frontmatter.mjs";
```

- [ ] **Step 2: Run — verify it fails**

```bash
cd C:/work/mega/loop && npm run build && node --test tests/frontmatter.test.mjs 2>&1 | tail -10
```

Expected: FAIL — `parseFrontmatterCached` not exported.

- [ ] **Step 3: Add `parseFrontmatterCached`**

In `src/scripts/lib/frontmatter.mts`, append:

```ts
import fs from "node:fs/promises";

interface CacheEntry {
  readonly mtimeMs: number;
  readonly value: Result<ParsedFile, ParseError>;
}

const cache = new Map<string, CacheEntry>();

export async function parseFrontmatterCached(
  filePath: string
): Promise<Result<ParsedFile, ParseError>> {
  const stat = await fs.stat(filePath);
  const entry = cache.get(filePath);
  if (entry !== undefined && entry.mtimeMs === stat.mtimeMs) {
    return entry.value;
  }
  const text = await fs.readFile(filePath, "utf8");
  const value = parseFrontmatter(text);
  cache.set(filePath, { mtimeMs: stat.mtimeMs, value });
  return value;
}
```

- [ ] **Step 4: Migrate hot callers to `parseFrontmatterCached`**

```bash
cd C:/work/mega/loop && grep -rn "parseFrontmatter\b" src/scripts 2>&1
```

For each caller that re-reads the same file across an invocation (brief, triage, auto-walker, pattern-alerts), replace `parseFrontmatter(await fs.readFile(p, "utf8"))` with `await parseFrontmatterCached(p)`. Leave one-shot writers alone.

- [ ] **Step 5: Build + run frontmatter tests**

```bash
cd C:/work/mega/loop && npm run build && node --test tests/frontmatter.test.mjs 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6: Write `backlog-snapshot.mts`**

Create `src/scripts/lib/backlog-snapshot.mts`:

```ts
// backlog-snapshot.mts — single shared scan of the backlog tree.
// Returns a frozen struct of every FEAT entry grouped by lifecycle
// state. Callers (brief / triage / auto-walker / pattern-alerts)
// share the same snapshot to avoid re-walking the tree N times per
// CLI invocation.

import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatterCached } from "./frontmatter.mjs";

export interface BacklogEntry {
  readonly id: string;
  readonly status: string;
  readonly path: string;
  readonly frontmatter: Record<string, unknown>;
  readonly body: string;
}

export interface BacklogSnapshot {
  readonly pending: readonly BacklogEntry[];
  readonly triaged: readonly BacklogEntry[];
  readonly inProgress: readonly BacklogEntry[];
  readonly done: readonly BacklogEntry[];
}

const LIFECYCLE_DIRS: ReadonlyArray<keyof BacklogSnapshot> = [
  "pending",
  "triaged",
  "inProgress",
  "done"
];

const DIR_TO_NAME: Record<keyof BacklogSnapshot, string> = {
  pending: "pending",
  triaged: "triaged",
  inProgress: "in-progress",
  done: "done"
};

async function readBucket(bucketDir: string): Promise<BacklogEntry[]> {
  let names: string[];
  try {
    names = await fs.readdir(bucketDir);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return [];
    throw err;
  }
  const entries = await Promise.all(
    names
      .filter((n) => n.endsWith(".md"))
      .map(async (n) => {
        const full = path.join(bucketDir, n);
        const parsed = await parseFrontmatterCached(full);
        if (!parsed.ok) return null;
        const fm = parsed.value.frontmatter;
        const id = typeof fm.id === "string" ? fm.id : n.replace(/\.md$/, "");
        const status = typeof fm.status === "string" ? fm.status : "unknown";
        return {
          id,
          status,
          path: full,
          frontmatter: fm,
          body: parsed.value.body
        };
      })
  );
  return entries.filter((e): e is BacklogEntry => e !== null);
}

export async function loadBacklogSnapshot(backlogRoot: string): Promise<BacklogSnapshot> {
  const buckets = await Promise.all(
    LIFECYCLE_DIRS.map(async (k) => {
      const bucket = await readBucket(path.join(backlogRoot, DIR_TO_NAME[k]));
      return [k, bucket] as const;
    })
  );
  const out: Partial<BacklogSnapshot> = {};
  for (const [k, v] of buckets) {
    out[k] = Object.freeze(v) as readonly BacklogEntry[];
  }
  return Object.freeze(out as BacklogSnapshot);
}
```

- [ ] **Step 7: Add snapshot test**

Create `src/tests/backlog-snapshot.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadBacklogSnapshot } from "../scripts/lib/backlog-snapshot.mjs";

async function setupBacklog(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-snapshot-"));
  for (const bucket of ["pending", "triaged", "in-progress", "done"]) {
    await fs.mkdir(path.join(dir, bucket), { recursive: true });
  }
  await fs.writeFile(
    path.join(dir, "pending", "FEAT-001.md"),
    "---\nid: FEAT-001\nstatus: pending\n---\nbody"
  );
  await fs.writeFile(
    path.join(dir, "done", "FEAT-002.md"),
    "---\nid: FEAT-002\nstatus: done\n---\nbody"
  );
  return dir;
}

test("loadBacklogSnapshot collects every bucket in parallel", async () => {
  const dir = await setupBacklog();
  const snap = await loadBacklogSnapshot(dir);
  assert.equal(snap.pending.length, 1);
  assert.equal(snap.done.length, 1);
  assert.equal(snap.triaged.length, 0);
  assert.equal(snap.pending[0]?.id, "FEAT-001");
});
```

Run:

```bash
cd C:/work/mega/loop && npm run build && node --test tests/backlog-snapshot.test.mjs 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 8: Migrate `brief.mts`, `auto-walker.mts`, `pattern-alerts.mts`, `backlog-triage.mts`**

For each, replace its private backlog scan with a single `loadBacklogSnapshot(backlogRoot)` call. Where each previously walked, e.g., `pending/` and `triaged/` separately, read from `snap.pending` and `snap.triaged`. Pass the snapshot in to helpers rather than calling `loadBacklogSnapshot` again — once per CLI invocation.

- [ ] **Step 9: Lazy subcommand load in `loop.mts`**

Open `src/scripts/loop.mts`. The current pattern likely imports every sub-module at top of file. Move to dynamic per-branch:

```ts
// before
import { brief } from "./lib/brief.mjs";
import { triage } from "./lib/backlog-triage.mjs";
// ...
switch (command) {
  case "brief": return brief(args);
  case "triage": return triage(args);
}

// after
switch (command) {
  case "brief": {
    const { brief } = await import("./lib/brief.mjs");
    return brief(args);
  }
  case "triage": {
    const { triage } = await import("./lib/backlog-triage.mjs");
    return triage(args);
  }
}
```

Apply to every branch. Keep small / shared helpers (`paths`, `config-resolver`, `effective-cwd`) at top of file — they are needed before dispatching.

- [ ] **Step 10: Batch git reads**

Identify N-per-command `execSync('git ...')` sites:

```bash
cd C:/work/mega/loop && grep -n "execSync.*git " src/scripts/lib/cost-regression.mts src/scripts/lib/auto-merge.mts src/scripts/lib/effective-cwd.mts 2>&1
```

For each multi-call site, collapse to a single batched call. Examples:

- N `git rev-parse <ref>` calls → one `git rev-parse <ref1> <ref2> ...` call.
- N `git log -1 --format=%H <ref>` → one `git for-each-ref --format='%(refname) %(objectname)'`.
- Repeated `git rev-parse --show-toplevel` → memoize per-process (the toplevel is invariant).

- [ ] **Step 11: Parallel fs walk in parsers**

In `backlog-parser.mts`, `grade-parser.mts`, `decisions-store.mts`, replace serial `for (const f of files) { await read(f); }` with `await Promise.all(files.map(read))`. Preserve deterministic ordering downstream (sort by id after the gather).

- [ ] **Step 12: Run perf gate**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test && npm run bench 2>&1 | tail -20
```

Expected: all tests pass; bench shows ≥10% improvement on `loop-brief` + `loop-triage` (most-benefited by snapshot + memoization).

- [ ] **Step 13: Update baseline**

If the perf wins are real, the gate above will warn that the current run is faster than baseline. Re-write the baseline:

```bash
cd C:/work/mega/loop && rm .claude/artifacts/loop/perf/baseline.json && npm run bench 2>&1 | tail -10
```

Inspect the resulting baseline. Commit only when satisfied with the recorded times.

- [ ] **Step 14: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-C2): perf wins 1-5 (memoization / snapshot / lazy / batch-git / parallel-fs)

1. frontmatter parse memoized by (path, mtime).
2. Single backlog snapshot shared across brief/triage/walker/alerts.
3. loop.mts lazy await import() per CLI branch.
4. cost-regression / auto-merge / effective-cwd: N git execs collapsed
   to single batched invocations.
5. backlog/grade/decisions parsers: serial readFile loops replaced
   with Promise.all.

Re-recorded baseline.json with new median wall-clock numbers."
```

---

### Task C3: Perf wins #6–10

**Files:**
- Modify: `src/scripts/lib/halt-badges.mts`, `backlog-parser.mts` — hoist regex
- Modify: `src/scripts/lib/decisions-store.mts`, `grade-parser.mts` — per-process memo
- Modify: any module using `JSON.parse(JSON.stringify(x))` — replace with `structuredClone`
- Modify: `src/scripts/lib/slice-linker/**/*.mts`, `linkage.mts` — Map index for hot lookups
- Modify: `src/scripts/lib/telemetry.mts` — batch flush

- [ ] **Step 1: Hoist regex compilations**

```bash
cd C:/work/mega/loop && grep -rn "new RegExp\|=  *\/.*\/" src/scripts/lib/halt-badges.mts src/scripts/lib/backlog-parser.mts src/scripts/lib/frontmatter.mts 2>&1
```

For each `new RegExp(...)` or literal inside a hot loop, move to module-scope `const`. Example:

```ts
// before
function parse(line: string) {
  const m = line.match(/^id:\s*(\S+)$/);
  // ...
}

// after — module scope
const ID_RE = /^id:\s*(\S+)$/;
function parse(line: string) {
  const m = line.match(ID_RE);
  // ...
}
```

- [ ] **Step 2: Add per-process memo to `decisions-store.mts` + `grade-parser.mts`**

Pattern (consistent with `parseFrontmatterCached`):

```ts
let cache: { mtimeMs: number; value: ReadonlyArray<DecisionEntry> } | null = null;

export async function listDecisions(repoRoot: string): Promise<ReadonlyArray<DecisionEntry>> {
  const dir = path.join(repoRoot, "docs", "decisions");
  const stat = await fs.stat(dir);
  if (cache !== null && cache.mtimeMs === stat.mtimeMs) return cache.value;
  const fresh = await loadDecisionsFresh(dir);
  cache = { mtimeMs: stat.mtimeMs, value: fresh };
  return fresh;
}
```

(`fs.stat` on a directory updates `mtimeMs` when a child file is added or removed — works for adds/deletes. For in-place edits, callers that need true real-time data should call a `clearCache()` exported helper before reading. Add and document.)

- [ ] **Step 3: Replace `JSON.parse(JSON.stringify(x))` deep clones**

```bash
cd C:/work/mega/loop && grep -rn "JSON.parse(JSON.stringify" src/scripts 2>&1
```

For each match, replace with `structuredClone(x)` (Node 17+ built-in). For values that don't actually need deep clone (e.g. shallow option-bag spread), use `{ ...x }`.

- [ ] **Step 4: Add Map indexes for hot lookups**

```bash
cd C:/work/mega/loop && grep -rn "\.find(" src/scripts/lib/slice-linker src/scripts/lib/linkage.mts 2>&1
```

For each `arr.find(x => x.id === target)` inside a loop, build a `Map<string, T>` once before the loop:

```ts
// before
for (const slice of slices) {
  const feat = features.find((f) => f.id === slice.featId);
  // ...
}

// after
const featById = new Map<string, Feature>(features.map((f) => [f.id, f] as const));
for (const slice of slices) {
  const feat = featById.get(slice.featId);
  // ...
}
```

- [ ] **Step 5: Batch flush in `telemetry.mts`**

Identify the per-event `appendFileSync` site:

```bash
cd C:/work/mega/loop && grep -n "appendFile" src/scripts/lib/telemetry.mts 2>&1
```

Replace with a buffered model:

```ts
import fs from "node:fs";
import path from "node:path";

const buffer: string[] = [];
let flushed = false;

function flush(filePath: string): void {
  if (buffer.length === 0) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, buffer.join(""), "utf8");
  buffer.length = 0;
}

export function recordEvent(filePath: string, event: object): void {
  buffer.push(JSON.stringify(event) + "\n");
  if (!flushed) {
    flushed = true;
    process.on("exit", () => flush(filePath));
  }
}

export function forceFlush(filePath: string): void {
  flush(filePath);
}
```

Callers that need the line persisted before they return (e.g. CLI completion hooks) call `forceFlush(filePath)` explicitly.

- [ ] **Step 6: Run typecheck + lint + tests + bench**

```bash
cd C:/work/mega/loop && npm run typecheck && npm run lint && npm test && npm run bench 2>&1 | tail -20
```

Expected: clean. Bench shows additional improvement.

- [ ] **Step 7: Update baseline + record total improvement**

```bash
cd C:/work/mega/loop && rm .claude/artifacts/loop/perf/baseline.json && npm run bench 2>&1 | tail -10
```

Verify ≥20% cumulative wall-clock improvement on `loop-brief`, `loop-triage`, and `loop-auto` versus the original (pre-C2) baseline. Note both baselines for the commit message.

- [ ] **Step 8: Commit**

```bash
cd C:/work/mega/loop
git add -A
git commit -m "feat(SLICE-C3): perf wins 6-10 (regex hoist / per-process memo / structuredClone / Map lookups / telemetry batch)

6.  Hoisted hot-loop regex into module-scope constants.
7.  decisions-store + grade-parser: per-process mtime-keyed memo.
8.  Replaced JSON.parse(JSON.stringify(...)) deep clones with structuredClone.
9.  Replaced array.find() inside loops with Map index in slice-linker + linkage.
10. telemetry.mts: appendFileSync per event -> in-process buffer + flush on exit.

Cumulative wall-clock cut from pre-C2 baseline: brief -X%, triage -Y%,
auto -Z% (see baseline.json diff)."
```

---

## Self-review

Spec coverage check:

| Spec section | Plan task(s) |
|---|---|
| Phase A — delete dead modules + tests | A1, A2, A3 |
| Phase A — caller cleanup in `loop-installer.mts` | A3 step 2 |
| Phase A — caller cleanup in `complete-slice.mts` | A1 step 3 |
| Phase A — marker-write removal from `auto-dispatch.mts` | A2 |
| Phase B — `noImplicitAny` + `useUnknownInCatchVariables` | B1 |
| Phase B — `noUnusedLocals` + `noUnusedParameters` | B2 |
| Phase B — `noImplicitOverride` + `noFallthroughCasesInSwitch` | B3 |
| Phase B — `exactOptionalPropertyTypes` | B4 |
| Phase B — `noUncheckedIndexedAccess` | B5 |
| Phase B — Result<T, E> for parsers + gates | B6 |
| Phase B — branded IDs | B7 |
| Phase B — discriminated unions for state | B8 |
| Phase C — perf harness + regression gate | C1 |
| Phase C — wins 1–5 | C2 |
| Phase C — wins 6–10 | C3 |
| Acceptance: ≥1500 LoC net cut in A | implicit at A3 completion (sum of deletions) |
| Acceptance: tsconfig matches standards | implicit at B8 completion |
| Acceptance: ≥20% wall-clock cut on top 3 commands | C3 step 7 |

Placeholder scan: no "TBD" / "TODO" / "similar to" / "appropriate" present. Each code-touching step shows the exact code or the canonical pattern.

Type consistency: `parseFrontmatter` returns `Result<ParsedFile, ParseError>` (defined B6). `parseFrontmatterCached` (defined C2) has the same return type, keyed by `(path, mtime)`. `BacklogEntry` (C2) uses `frontmatter: Record<string, unknown>` to match `ParsedFile.frontmatter`. `loadBacklogSnapshot` returns `Promise<BacklogSnapshot>` consistently. `dispatchAgent` (A2) signature unchanged — only the marker-write side effect dropped.

Ambiguity check: B5 split rule is conditional on dry-run error count (> 80 split). B1 same (> 200 split). Each split is precisely defined by directory boundary, not "if it's big."
