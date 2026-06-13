# Spec: FEAT-086 — Cross-session learnings with automatic recall

## Metadata
- developer_type: agent
- estimated_complexity: medium
- languages: [typescript]
- referenced_feat: .claude/artifacts/loop/backlog/triaged/FEAT-086.md
- referenced_command: commands/learn.md
- referenced_lib: src/scripts/lib/learnings.mts
- referenced_lib: src/scripts/lib/slice-linker/start-slice.mts

---

## Objective

Wire the three missing user-facing management subcommands (`learnings list`,
`learnings search`, `learnings prune`) into `src/scripts/loop.mts`, expose a
`deleteLearning(repoPath, id)` helper in `src/scripts/lib/learnings.mts`, and
extend the `/loop:brief` command output to include the top-3 learnings digest.
The JSONL store, the record schema, and the slice-start auto-surface hook all
exist; this slice fills the management and brief-integration gap.

---

## Context

The learnings subsystem was partially implemented. What already exists must not
be changed except where the spec explicitly says "modify":

- **JSONL store location (confirmed):** `<repoPath>/.claude/artifacts/loop/learnings.jsonl`
  (path: `src/scripts/lib/learnings.mts::learningsPath`)
- **Record schema (confirmed, in `learnings.mts`):**
  ```typescript
  {
    id: number,              // monotonically increasing integer, assigned by logLearning
    timestamp: string,       // ISO-8601 UTC, e.g. "2026-06-13T10:00:00.000Z"
    key: string,             // short machine-readable tag, e.g. "tsc-compile-drift"
    insight: string,         // human-readable observation, 1-2 sentences
    confidence: number|null, // float 0–1, or null if omitted
    source: string,          // "agent" (default) or caller-supplied string
    sliceId?: string,        // optional, e.g. "SLICE-08"
    tags?: string[]          // optional, e.g. ["tdd", "learnings"]
  }
  ```
- **Already wired in `loop.mts`:** `learnings log`, `learnings recent`
  (handler `runLearningsSubcommand`, line ~1316).
- **Already wired in `start-slice.mts`:** `recentLearnings(repoPath, 3)` runs
  in `gatherSliceResources` → result surfaced as `learningsDigest` in the
  `startSlice` return value and passed through `buildDispatchInstruction`.
- **NOT yet in `loop.mts`:** `learnings list`, `learnings search`,
  `learnings prune`.
- **NOT in `learnings.mts`:** `deleteLearning` export.
- **NOT in `brief.mts`:** any reference to learnings.

Repo conventions:
- ESM `.mts` source under `src/scripts/`. Relative imports use `.mjs` extension
  (e.g. `./lib/learnings.mjs`). No build step — Bun runs `.mts` directly.
- Lint: `bun run lint` must be clean (zero warnings, cyclomatic complexity ≤ 15).
- Tests colocated in `src/tests/*.mts`. Existing tests are in
  `src/tests/learnings.test.mts`.
- No `process.exit(N)` from library functions.

---

## Implementation Contract

### Part 1: `deleteLearning` library function

**File to modify:** `src/scripts/lib/learnings.mts`

**Add one export:**
```typescript
// Delete a learning entry by its numeric id.
// Returns the deleted record when found, or null when no entry with that id exists.
// Rewrites the entire JSONL file atomically (read → filter → write).
// Throws when the file cannot be read for reasons other than absence.
export async function deleteLearning(
  repoPath: string,
  id: number
): Promise<Record<string, unknown> | null>
```

Implementation rules:
- Read all entries via the existing `readAllEntries` internal function.
- Find the entry where `entry.id === id`. If none found, return `null` without
  writing.
- Filter out the target entry, rewrite the file as newline-delimited JSON
  (one `JSON.stringify(entry)` per line, trailing newline). Use
  `fs.writeFile(filePath, content, "utf8")` — not `appendFile`.
- If the store file does not exist when delete is called, return `null`
  (nothing to delete; do not throw).
- The returned object is the deleted entry as it was stored.

### Part 2: `loop.mts` subcommand wiring

**File to modify:** `src/scripts/loop.mts`

Extend `runLearningsSubcommand` to handle three additional subcommands. The
existing function signature is:
```typescript
async function runLearningsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>
): Promise<unknown>
```

The `[sub]` binding from `positionals[0]` drives the dispatch. Add after the
existing `sub === "recent"` branch:

#### `learnings list`
```
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings list \
  --repo "$PWD" \
  [--limit N]
```

Behavior:
- Calls `recentLearnings(repoPath, limit)` where `limit` defaults to **all**
  entries. "All entries" means passing `Number.MAX_SAFE_INTEGER` to
  `recentLearnings`, which already slices the array.
  When `--limit` is absent, use `Number.MAX_SAFE_INTEGER`.
- Returns `{ count: number, items: LearningRecord[], digest: string|null }`.

#### `learnings search`
```
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings search \
  --repo "$PWD" \
  -- <query>
```

Behavior:
- The search query is the first positional after `--` (i.e. `positionals[1]`).
- Calls `searchLearnings(repoPath, query)`.
- Throws `Error("learnings search requires a query string")` when
  `positionals[1]` is absent or empty after trim.
- Returns `{ count: number, items: LearningRecord[] }`.

#### `learnings prune`
```
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings prune \
  --repo "$PWD" \
  --id <numeric-id>
```

Behavior:
- `flags.id` is required; throw `Error("learnings prune requires --id <numeric-id>")` when absent.
- Parse `flags.id` with `Number(flags.id)`. Throw
  `Error("learnings prune --id must be a positive integer")` when the result
  is `NaN` or `<= 0` or not an integer (`!Number.isInteger(parsed)`).
- Calls `deleteLearning(repoPath, parsedId)`.
- Returns `{ deleted: LearningRecord | null }`.

Also update the error message in the guard at the top of `runLearningsSubcommand`:
```typescript
// Before:
throw new Error("learnings requires a subcommand: log | recent");
// After:
throw new Error("learnings requires a subcommand: log | recent | list | search | prune");
```

Note: `searchLearnings` is already exported from `learnings.mts` but not yet
imported in `loop.mts`. Extend the dynamic import line from:
```typescript
const { logLearning, recentLearnings } = await import("./lib/learnings.mjs");
```
to:
```typescript
const { logLearning, recentLearnings, searchLearnings, deleteLearning } =
  await import("./lib/learnings.mjs");
```
Import only what is needed for the branch being executed (all four functions
must be destructured at the top of `runLearningsSubcommand` before the
dispatch; dead-code tree-shaking is not a concern for Bun).

### Part 3: Brief command — learnings digest integration

**File to identify and modify:** Locate the implementation of the `brief`
subcommand in `src/scripts/loop.mts`. The command `brief` maps to a handler
(confirmed registered in the command dispatch table around line 200-350).
Inspect the handler to find where it builds and returns the brief JSON object.

**Change:** Before the handler returns its result, call
`recentLearnings(repoPath, 3)` and attach the result to the returned object
under the key `learningsDigest`. Use `bestEffort` wrapping (same pattern as
`gatherSliceResources` in `start-slice.mts`) so a missing or corrupt store
never crashes the brief command.

Specifically:
```typescript
// At the point where the brief result object is assembled:
const learningsResult = await bestEffort(() => recentLearnings(repoPath, 3));
// ...
return {
  // ... existing keys unchanged ...
  learningsDigest: learningsResult?.digest ?? null
};
```

If `bestEffort` is not available as an import in `loop.mts` (check the file),
use a try/catch inline:
```typescript
let learningsDigest: string | null = null;
try {
  const lr = await recentLearnings(repoPath, 3);
  learningsDigest = lr.digest;
} catch {
  // store absent or corrupt; digest stays null
}
```

Import `recentLearnings` from `"./lib/learnings.mjs"` at the top of the brief
handler (dynamic import, same pattern as other handlers).

**No change to `commands/brief.md`** — this spec covers only the CLI
implementation. The commands/ doc update is out of scope for this slice.

---

## Files to Create / Modify

### Modify (no new files required):
- `src/scripts/lib/learnings.mts` — add `deleteLearning` export (~25 lines)
- `src/scripts/loop.mts` — extend `runLearningsSubcommand` with `list`,
  `search`, `prune` branches; extend import destructuring; extend guard
  message; add `learningsDigest` to the `brief` handler return value
- `src/tests/learnings.test.mts` — add test cases for `deleteLearning`
  (see Required Tests below)

---

## Required Tests

All tests go in **`src/tests/learnings.test.mts`** (the file already exists;
append to it). Use the same `tmpRepo` helper already defined in that file.

### Test case 1 — happy path: deleteLearning removes the entry and returns it

```
Given: a repo with two learnings: id=1 (key "k1"), id=2 (key "k2")
When: deleteLearning(repo, 1) is called
Then:
  - Return value is the deleted record: { id: 1, key: "k1", ... }
  - Reading learnings.jsonl afterward shows only id=2 remains
  - recentLearnings(repo, 10).count === 1
  - recentLearnings(repo, 10).items[0].key === "k2"
```

Concrete implementation:
```typescript
test("deleteLearning removes entry by id and returns deleted record", async () => {
  const repo = await tmpRepo("learnings-delete-");
  const r1 = await logLearning(repo, { key: "k1", insight: "first" });
  const r2 = await logLearning(repo, { key: "k2", insight: "second" });

  const deleted = await deleteLearning(repo, r1.id);

  assert.ok(deleted !== null);
  assert.equal(deleted.id, r1.id);
  assert.equal(deleted.key, "k1");

  const remaining = await recentLearnings(repo, 10);
  assert.equal(remaining.count, 1);
  assert.equal(remaining.items[0].key, "k2");
});
```

### Test case 2 — edge case: deleteLearning returns null when id not found

```
Given: a repo with one learning id=1
When: deleteLearning(repo, 999) is called
Then:
  - Return value is null
  - The store still contains id=1 (no write occurred)
```

Concrete implementation:
```typescript
test("deleteLearning returns null when id not found", async () => {
  const repo = await tmpRepo("learnings-delete-miss-");
  await logLearning(repo, { key: "only", insight: "sole entry" });

  const result = await deleteLearning(repo, 999);

  assert.equal(result, null);
  const all = await recentLearnings(repo, 10);
  assert.equal(all.count, 1);
});
```

### Test case 3 — edge case: deleteLearning on absent store returns null without throwing

```
Given: a repo with no learnings.jsonl file
When: deleteLearning(repo, 1) is called
Then:
  - Return value is null
  - No file is created
  - No exception is thrown
```

Concrete implementation:
```typescript
test("deleteLearning returns null when store is absent", async () => {
  const repo = await tmpRepo("learnings-delete-absent-");
  // Do not call logLearning — store does not exist
  const result = await deleteLearning(repo, 1);
  assert.equal(result, null);
});
```

### Test case 4 — error path: `learnings prune` CLI throws on non-integer id

```
Given: loop.mts runLearningsSubcommand called with sub="prune", flags.id="abc"
When: the handler runs
Then: it throws Error matching /must be a positive integer/
```

This is exercised via unit test on the handler logic. Because `runLearningsSubcommand`
is not exported, test it indirectly by calling the CLI in a subprocess or by
extracting the id-parse logic into a pure helper. Preferred approach: add a
unit test for `deleteLearning` with a NaN guard at the library level — the
CLI guard is verified by the `prune` argument validation (tested manually with
the verify command in the Verification Commands section).

### Test case 5 — integration: deleteLearning preserves order of remaining entries

```
Given: three learnings with ids 1, 2, 3
When: deleteLearning(repo, 2) is called
Then:
  - Entries 1 and 3 remain in that order
  - Entry 2 is absent from the store
```

Concrete implementation:
```typescript
test("deleteLearning preserves order of remaining entries after deletion", async () => {
  const repo = await tmpRepo("learnings-delete-order-");
  const r1 = await logLearning(repo, { key: "first", insight: "a" });
  const r2 = await logLearning(repo, { key: "second", insight: "b" });
  const r3 = await logLearning(repo, { key: "third", insight: "c" });

  await deleteLearning(repo, r2.id);

  const all = await recentLearnings(repo, 10);
  assert.equal(all.count, 2);
  assert.equal(all.items[0].id, r1.id);
  assert.equal(all.items[1].id, r3.id);
});
```

---

## Acceptance Criteria

**AC-001: `learnings list` returns all entries when `--limit` is omitted**

Given: a repo with 5 learnings logged via `logLearning`
When: `bun src/scripts/loop.mts learnings list --repo "$PWD"` is run
Then: the JSON output contains `count: 5` and `items` is an array of 5 records

**AC-002: `learnings search` returns only matching entries**

Given: two learnings — key `"cache-miss"` and key `"lint-error"` — logged
When: `bun src/scripts/loop.mts learnings search --repo "$PWD" -- cache`
Then: output contains `count: 1` and `items[0].key === "cache-miss"`

**AC-003: `learnings prune` removes the entry and returns the deleted record**

Given: a learning with id=1 exists in the store
When: `bun src/scripts/loop.mts learnings prune --repo "$PWD" --id 1`
Then:
- Output JSON contains `{ "deleted": { "id": 1, ... } }`
- Running `learnings list` afterward shows 0 entries (if no others existed)

**AC-004: `learnings prune` with an id that does not exist returns `{ "deleted": null }`**

Given: an empty store (or a store with id=2 only)
When: `bun src/scripts/loop.mts learnings prune --repo "$PWD" --id 99`
Then: output JSON is `{ "deleted": null }`; exit code 0

**AC-005: `learnings prune` with a non-integer `--id` value throws a clear error**

Given: any repo
When: `bun src/scripts/loop.mts learnings prune --repo "$PWD" --id abc`
Then: process exits non-zero with an error message matching
`/must be a positive integer/`

**AC-006: `brief` output includes `learningsDigest` field**

Given: a repo with at least 1 learning in the store
When: `bun src/scripts/loop.mts brief --repo "$PWD"` is run
Then: the JSON output contains a top-level key `learningsDigest` whose value
is a non-null, non-empty string containing the key of the most recent learning

**AC-007: `brief` `learningsDigest` is null when store is absent**

Given: a repo with no `learnings.jsonl` file
When: `bun src/scripts/loop.mts brief --repo "$PWD"` is run
Then: output contains `"learningsDigest": null`; exit code 0 (no crash)

**AC-008: All 5 new `deleteLearning` tests pass**

Given: tests added to `src/tests/learnings.test.mts`
When: `bun test src/tests/learnings.test.mts --timeout 60000`
Then: all test cases (including the 14 pre-existing + 5 new) pass; no failures

**AC-009: Lint and typecheck remain clean**

Given: all modifications applied
When: `bun run lint && bunx tsc --project tsconfig.json --noEmit`
Then: exit code 0; zero lint warnings; zero type errors

---

## Verification Commands

Run these in order from the repo root `C:\work\mega\loop`.

**1. Unit tests (includes new deleteLearning tests):**
```powershell
bun test src/tests/learnings.test.mts --timeout 60000
```
Expected: all tests pass; summary line shows ≥19 pass (14 pre-existing + 5 new).

**2. Full test suite (regression guard):**
```powershell
bun test src/tests/ --parallel --timeout 60000
```
Expected: exit code 0; no failures.

**3. Typecheck clean:**
```powershell
bunx tsc --project tsconfig.json --noEmit
```
Expected: no output; exit code 0.

**4. Lint clean:**
```powershell
bun run lint
```
Expected: no output or "0 problems"; exit code 0.

**5. `learnings list` end-to-end (populate then list):**
```powershell
$repo = "$PWD"
bun src/scripts/loop.mts learnings log --repo $repo --key "spec-test" --insight "verification learning"
bun src/scripts/loop.mts learnings list --repo $repo
```
Expected: second command prints JSON with `count >= 1` and an item with
`key === "spec-test"`.

**6. `learnings search` end-to-end:**
```powershell
bun src/scripts/loop.mts learnings search --repo $PWD -- spec-test
```
Expected: JSON with `count >= 1`; `items[0].key === "spec-test"`.

**7. `learnings prune` end-to-end (requires id from log output):**
```powershell
$rec = bun src/scripts/loop.mts learnings log --repo $PWD --key "to-prune" --insight "will be deleted" | ConvertFrom-Json
bun src/scripts/loop.mts learnings prune --repo $PWD --id $rec.id
```
Expected: JSON output `{ "deleted": { "id": <id>, "key": "to-prune", ... } }`.

**8. `learnings prune` invalid id error:**
```powershell
bun src/scripts/loop.mts learnings prune --repo $PWD --id abc; $LASTEXITCODE
```
Expected: error message on stderr matching "must be a positive integer"; exit
code non-zero.

**9. `brief` includes learningsDigest:**
```powershell
bun src/scripts/loop.mts brief --repo $PWD | ConvertFrom-Json | Select-Object -ExpandProperty learningsDigest
```
Expected: a non-null string (digest markdown) if at least one learning exists;
`null` if the store is empty.

---

## Rationale and Open Questions

**Why `deleteLearning` rewrites the whole file:** The JSONL store is append-only
by design for `logLearning`. Deletion requires a full rewrite because JSONL has
no in-place deletion semantics. The store is expected to stay small (tens to
low hundreds of entries); a full rewrite is safe.

**Why `list` uses `Number.MAX_SAFE_INTEGER` not a separate `readAll` path:**
`recentLearnings` already handles the `n > count` case by returning all entries.
Adding a dedicated `readAll` export would duplicate logic. The `list` subcommand
is a human-facing alias that benefits from `digest` generation, which
`recentLearnings` provides.

**Why the brief integration uses a try/catch or `bestEffort`:** The learnings
store is optional. A missing store must not crash an already-running brief
command. This matches the pattern in `start-slice.mts::gatherSliceResources`
(line 462: `bestEffort(() => recentLearnings(repoPath, 3))`).

**Open question — `commands/brief.md` doc update:** The command doc at
`commands/brief.md` does not mention `learningsDigest`. Updating it is
deferred to a separate doc-writer pass (out of scope for this builder slice
to stay under the 300-line agent cap).

**Open question — `commands/learn.md` expand for `list`/`search`/`prune`:**
The command doc only documents `log` and `recent`. Updating it is similarly
deferred.
