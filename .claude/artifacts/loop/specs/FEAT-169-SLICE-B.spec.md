# Spec: FEAT-169 SLICE-B — Performance: Snapshot + Memoization Wins

## Metadata
- developer_type: agent
- estimated_complexity: medium
- languages: [typescript]
- referenced_design: docs/superpowers/specs/2026-06-07-code-quality-pivot-design.md § C2–C3
- referenced_plan: docs/superpowers/plans/2026-06-07-code-quality-pivot.md § C2–C3

---

## Objective

Land the top-10 performance quick wins behind a regression-gated benchmark harness. This slice delivers five wins in the `C2` group (memoization, shared snapshot, lazy subcommand load, batched git reads, parallel fs) and five more in `C3` (regex hoisting, per-process caching, structuredClone replacements, Map indexes, telemetry batching). Acceptance: benchmark harness in place with regression gate (no command regresses >10%); cumulative wall-clock cut of ≥20% on `/loop:brief`, `/loop:triage`, and `/loop:auto` verified by the harness and recorded in `baseline.json`. Observability: debug log on every cache hit/miss, info log on snapshot load with timing, telemetry metric for cache-hit-rate per invocation.

---

## Context

The loop plugin re-parses the backlog tree and re-reads the same YAML frontmatter blocks multiple times per CLI invocation (brief + triage + auto-walker + pattern-alerts each walk independently). The perf pivot (SPEC-004) requires landing a regression-gated benchmark harness first (C1, already present per plan), then targeted wins in C2 and C3 with evidence. This slice implements:

1. **C2 wins 1–5:** Memoize `parseFrontmatter` by `(path, mtime)`, create a shared `loadBacklogSnapshot()` helper, lazy-load subcommands in `loop.mts`, batch git reads, parallelize fs walks.
2. **C3 wins 6–10:** Hoist hot-loop regex, add per-process memo to decisions + grades, replace `JSON.parse(JSON.stringify())` with `structuredClone`, build Map indexes for O(1) lookups, buffer telemetry flushes.
3. **Bench harness:** Gate accepts new baseline; CI fails if any command regresses >10%.

Repo conventions: ESM `.mts` source → `scripts/*.mjs` emit via tsc. Tests in `src/tests/*.mts`. Complexity cap 15. No `process.exit` from libs. Every `npm run typecheck && npm run lint && npm test && npm run bench` must be green.

---

## Implementation Contract

### Objective 1: Benchmark Harness with Regression Gate

#### Inputs
Five hot CLI commands (already defined in plan):
- `/loop:brief` (no args)
- `/loop:triage` (no args)
- `/loop:auto --dry-run` (dry-run prevents writes)
- `/loop:slice start --dry-run` (dry-run)
- `/loop:slice complete --dry-run` (dry-run)

#### Outputs

**File:** `src/tests/perf/bench.mts` (new test module)

**Behavior:**
- Define 5 test cases, one per command.
- For each command, run N samples (default N=5, configurable via `BENCH_SAMPLES` env var).
- Measure wall-clock time via `process.hrtime.bigint()` (nanosecond precision), convert to ms.
- Compute median of N samples.
- Load baseline from `.claude/artifacts/loop/perf/baseline.json` (JSON object mapping command name → median ms).
- On first run (no baseline): write baseline, do not assert.
- On subsequent runs: assert `current <= baseline * 1.1` (10% regression threshold).
- Print output per sample: `"bench ${command}: median ${med.toFixed(1)} ms across ${SAMPLES} samples"`.

**Baseline file:** `.claude/artifacts/loop/perf/baseline.json`
```json
{
  "loop-brief": 500,
  "loop-triage": 1200,
  "loop-auto": 2500,
  "loop-slice-start": 800,
  "loop-slice-complete": 900
}
```
(Example values; actual baseline recorded on first run.)

#### Side Effects
- Writes `.claude/artifacts/loop/perf/baseline.json` on first run (or when adding new commands).
- Executes the 5 CLI commands (side effects like `/loop:auto --dry-run` are contained by the `--dry-run` flag).
- No other side effects.

---

### Objective 2: Frontmatter Memoization

#### Input
`filePath: string` (absolute path to a `.md` file), and the function reads the file's content and `mtime`.

#### Output

**Export from `src/scripts/lib/frontmatter.mts`:**
```typescript
export async function parseFrontmatterCached(
  filePath: string
): Promise<Result<ParsedFile, ParseError>>;
```

(Return type is `Result` because this slice depends on SLICE-A; if SLICE-A is not yet complete, use the original return type `{ frontmatter, body }` for now and retrofit to Result later.)

**Behavior:**
- Maintain a per-process `Map<string, CacheEntry>` where `CacheEntry = { mtimeMs: number; value: Result<ParsedFile, ParseError> | { frontmatter, body } }`.
- On call, stat the file to get `mtime`.
- If the cache has an entry for `filePath` and the cached `mtimeMs === stat.mtimeMs`, return the cached value and log at `debug`: `"Cache hit: ${filePath}"`.
- If no cache entry or mtime mismatch, read the file, parse via `parseFrontmatter`, cache the result, and log at `debug`: `"Cache miss / invalidated: ${filePath} (prev mtime: ${prev?.mtimeMs ?? "none"}, new: ${stat.mtimeMs})"`.
- Return the value (cached or fresh).

#### Side Effects
- Reads file from disk (stat + readFile).
- Maintains per-process cache (memory only; no persistence).
- Debug logging on cache hit/miss.
- No writes to disk.

---

### Objective 3: Shared Backlog Snapshot

#### Input
`backlogRoot: string` (path to backlog directory containing `pending/`, `triaged/`, `in-progress/`, `done/` subdirs)

#### Output

**Create file:** `src/scripts/lib/backlog-snapshot.mts`

**Export types and function:**
```typescript
export interface BacklogEntry {
  readonly id: string;          // or FeatId if SLICE-A is complete
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

export async function loadBacklogSnapshot(
  backlogRoot: string
): Promise<BacklogSnapshot>;
```

**Behavior:**
- Read all four subdirectories in parallel using `Promise.all()`.
- For each subdir, list `.md` files and parse each via `parseFrontmatterCached()` (which is memoized, so repeat reads are fast).
- Filter out parse failures (log at `warn` per parser; do not throw).
- Collect and freeze each bucket: `Object.freeze(bucket)`.
- Freeze the snapshot struct and return.
- Log at `info` on entry: `"Loading backlog snapshot from ${backlogRoot}"`.
- Log at `info` on completion: `"Backlog snapshot loaded: ${pending.length} pending, ${triaged.length} triaged, ${inProgress.length} in-progress, ${done.length} done"`.

**Assumption:** `parseFrontmatterCached` is available and memoized. If SLICE-A is not complete, use the non-Result version and skip the `.ok` checks.

#### Side Effects
- Reads all `.md` files in the backlog tree (via `parseFrontmatterCached`, which reads and caches).
- Info-level logging on load and completion.
- No writes to disk.

---

### Objective 4: Lazy Subcommand Load in loop.mts

#### Input
The existing `loop.mts` entry point with a switch on `command`.

#### Output

**Modify:** `src/scripts/loop.mts`

**Current pattern (example):**
```typescript
import { brief } from "./lib/brief.mjs";
import { triage } from "./lib/backlog-triage.mjs";
import { autoWalk } from "./lib/auto-walker.mjs";
// ... many more imports at top

async function main() {
  switch (command) {
    case "brief": return await brief(args);
    case "triage": return await triage(args);
    case "auto": return await autoWalk(args);
    // ...
  }
}
```

**Changed pattern:**
```typescript
// Only import small / shared helpers at top
import { getEffectiveCwd } from "./lib/effective-cwd.mjs";
import { resolvePaths } from "./lib/paths.mjs";

async function main() {
  switch (command) {
    case "brief": {
      const { brief } = await import("./lib/brief.mjs");
      return await brief(args);
    }
    case "triage": {
      const { triage } = await import("./lib/backlog-triage.mjs");
      return await triage(args);
    }
    case "auto": {
      const { autoWalk } = await import("./lib/auto-walker.mjs");
      return await autoWalk(args);
    }
    // ... all branches converted to dynamic await import()
  }
}
```

**Rationale:** Eager imports of every subcommand add ~150 ms to cold startup. Lazy per-branch imports defer module parsing and initialization.

#### Side Effects
- None at runtime (same behavior; just slower init path is deferred).
- Log at `debug` when branch is taken: `"Loading subcommand: ${command}"`.

---

### Objective 5: Batch Git Reads

#### Input
Code paths in `cost-regression.mts`, `auto-merge.mts`, `effective-cwd.mts` that call `execSync('git ...')` multiple times per invocation.

#### Output

**Identify and collapse N-per-command git execs:**

**Before (example from `effective-cwd.mts`):**
```typescript
const toplevel1 = execSync("git rev-parse --show-toplevel", { cwd: path1 }).toString().trim();
const toplevel2 = execSync("git rev-parse --show-toplevel", { cwd: path2 }).toString().trim();
const toplevel3 = execSync("git rev-parse --show-toplevel", { cwd: path3 }).toString().trim();
```

**After:**
```typescript
const topolevels = execSync(
  `git rev-parse --show-toplevel`,
  { cwd: path1 }
).toString().trim(); // repeated; or use a single call per path via xargs
// Better: memoize per-process
const getToplevel = (() => {
  const memo: Record<string, string> = {};
  return (cwd: string) => {
    if (!memo[cwd]) {
      memo[cwd] = execSync("git rev-parse --show-toplevel", { cwd }).toString().trim();
    }
    return memo[cwd];
  };
})();
const toplevel1 = getToplevel(path1);
const toplevel2 = getToplevel(path2); // cache hit if path2 is same repo
```

**Specific cases per module (from plan):**
- `cost-regression.mts`: batch N `git log` / `git rev-parse` calls into one.
- `auto-merge.mts`: batch merge-check calls.
- `effective-cwd.mts`: memoize `git rev-parse --show-toplevel` per working directory.

**Observability:** Log at `debug` on every git exec: `"git exec (cached=${cached}): ${command}"`.

#### Side Effects
- Executes git commands (same as before, but fewer execs).
- Per-process memo cache (memory only).
- Debug logging on each invocation.

---

### Objective 6: Parallel Filesystem Walks

#### Input
Serial file-read loops in `backlog-parser.mts`, `grade-parser.mts`, `decisions-store.mts`.

#### Output

**Before:**
```typescript
async function parseBacklog(dir: string) {
  const files = await fs.readdir(dir);
  const entries = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), "utf8");
    const parsed = parseFrontmatter(content);
    entries.push(parsed);
  }
  return entries;
}
```

**After:**
```typescript
async function parseBacklog(dir: string) {
  const files = await fs.readdir(dir);
  const entries = await Promise.all(
    files.map(async (file) => {
      const content = await fs.readFile(path.join(dir, file), "utf8");
      const parsed = parseFrontmatter(content);
      return parsed;
    })
  );
  // Sort to ensure deterministic ordering downstream
  return entries.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}
```

**Applied to:**
- `backlog-parser.mts` — parallel read of FEAT files
- `grade-parser.mts` — parallel read of grade JSON files
- `decisions-store.mts` — parallel read of decision .md files

#### Side Effects
- Reads files in parallel (same files; faster via concurrency).
- No writes.
- Memory use increases slightly (all file buffers in memory at once).

---

### Objective 7: Hoist Regex Compilations

#### Input
Hot-loop regex patterns in `halt-badges.mts`, `backlog-parser.mts`, `frontmatter.mts`.

#### Output

**Before:**
```typescript
function parse(line: string) {
  const m = line.match(/^id:\s*(\S+)$/);
  // ... more uses of inline regex
}

function checkBadge(badge: string) {
  if (/^HALT:/.test(badge)) { /* ... */ }
}
```

**After (module scope):**
```typescript
const ID_PATTERN = /^id:\s*(\S+)$/;
const HALT_BADGE_PREFIX = /^HALT:/;

function parse(line: string) {
  const m = line.match(ID_PATTERN);
  // ...
}

function checkBadge(badge: string) {
  if (HALT_BADGE_PREFIX.test(badge)) { /* ... */ }
}
```

**Survey and update all `new RegExp()` and inline `/...../` inside hot loops.**

#### Side Effects
- Regex objects are now created once at module load (not per invocation).
- No behavior change.

---

### Objective 8: Per-Process Cache for Decisions + Grades

#### Input
`decisions-store.mts` and `grade-parser.mts` re-read their source directories on every query.

#### Output

**Pattern for both modules:**

```typescript
interface CacheEntry<T> {
  readonly mtimeMs: number;
  readonly value: T;
}

let cache: CacheEntry<readonly DecisionEntry[]> | null = null;

export async function listDecisions(
  repoRoot: string
): Promise<readonly DecisionEntry[]> {
  const dir = path.join(repoRoot, "docs", "decisions");
  const stat = await fs.stat(dir);
  
  if (cache !== null && cache.mtimeMs === stat.mtimeMs) {
    return cache.value;
  }
  
  const fresh = await loadDecisionsFresh(dir);
  cache = { mtimeMs: stat.mtimeMs, value: fresh };
  return fresh;
}

export function clearDecisionsCache(): void {
  cache = null;
}
```

**Rationale:** Directory `mtime` is updated when any child file is added or removed, but NOT on in-place edits. For real-time data (e.g., during `auto` loop when decisions may be written), callers can invoke `clearDecisionsCache()` before re-reading.

**Observability:** Log at `debug` on cache hit: `"Decisions cache hit (${entries.length} entries)"`. Log at `debug` on cache miss: `"Decisions cache miss / invalidated (prev mtime: ${cache?.mtimeMs ?? "none"}, new: ${stat.mtimeMs})"`.

#### Side Effects
- Per-process cache (memory only).
- Reads directory `mtime` on every query (cheap stat).
- Debug logging on hit/miss.

---

### Objective 9: Replace JSON.parse(JSON.stringify) Deep Clones

#### Input
All occurrences of `JSON.parse(JSON.stringify(x))` in the codebase.

#### Output

**Before:**
```typescript
const deepCopy = JSON.parse(JSON.stringify(myObject));
```

**After:**
```typescript
const deepCopy = structuredClone(myObject);
```

(Node 17+ built-in, available in the target runtime.)

**For shallow copies**, use spread if no nested mutation:
```typescript
const shallowCopy = { ...myObject };
```

**Search and replace all matches:**
```bash
grep -rn "JSON.parse(JSON.stringify" src/scripts
```

#### Side Effects
- Faster deep cloning (native C++ implementation).
- Identical behavior (same structure, fully independent copy).

---

### Objective 10: Map Indexes for Hot Lookups

#### Input
O(N²) loops in `slice-linker/*`, `linkage.mts` that use `array.find(x => x.id === id)` inside nested loops.

#### Output

**Before:**
```typescript
for (const slice of slices) {
  const feat = features.find((f) => f.id === slice.featId);
  // O(N²) if both are large
}
```

**After:**
```typescript
const featById = new Map(features.map((f) => [f.id, f] as const));
for (const slice of slices) {
  const feat = featById.get(slice.featId);
  // O(N) total
}
```

**Applied to:** Every `array.find(x => x.id === target)` in:
- `slice-linker.mts`
- `slice-linker/complete-slice.mts`
- `slice-linker/crew-bridge.mts`
- `linkage.mts`

#### Side Effects
- O(1) lookup time instead of O(N).
- Slightly higher memory (Map structure).

---

### Objective 11: Telemetry Batch Flush

#### Input
Current `telemetry.mts` using `appendFileSync` per event.

#### Output

**Before:**
```typescript
export function recordEvent(filePath: string, event: object): void {
  const line = JSON.stringify(event) + "\n";
  fs.appendFileSync(filePath, line, "utf8");
}
```

**After:**
```typescript
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

**Behavior:**
- Events are buffered in memory.
- On `process.exit`, all buffered events are flushed in a single `appendFileSync` call.
- Callers that need immediate persistence (e.g., CLI hooks) call `forceFlush(filePath)` explicitly.

#### Side Effects
- Reduces syscalls (write syscalls per command may drop from 100+ to 1–2).
- No functional behavior change (same events recorded, same format).

---

## Files to Create / Modify

### Create:
- `src/tests/perf/bench.mts` (~120 lines)
- `src/scripts/lib/backlog-snapshot.mts` (~60 lines)
- `src/tests/backlog-snapshot.test.mts` (~50 lines)
- `.claude/artifacts/loop/perf/baseline.json` (empty or seed object, written by harness on first run)

### Modify:
- `src/scripts/lib/frontmatter.mts` — add `parseFrontmatterCached` with per-process memo
- `src/scripts/loop.mts` — convert eager imports to lazy `await import()`
- `src/scripts/lib/brief.mts`, `auto-walker.mts`, `pattern-alerts.mts`, `backlog-triage.mts` — call `loadBacklogSnapshot` once instead of walking independently
- `src/scripts/lib/cost-regression.mts`, `auto-merge.mts`, `effective-cwd.mts` — batch or memoize git execs
- `src/scripts/lib/backlog-parser.mts`, `grade-parser.mts`, `decisions-store.mts` — parallel fs + per-process memo
- `src/scripts/lib/halt-badges.mts` — hoist regex to module scope
- `src/scripts/lib/telemetry.mts` — batch flush on `process.exit`
- `src/scripts/lib/slice-linker.mts`, `linkage.mts` — add Map indexes for lookups
- `package.json` — add `"bench": "node --test tests/perf/*.test.mjs"` script

---

## Required Tests

### Test File 1: `src/tests/perf/bench.mts`

The benchmark harness itself is tested via successful runs:

**Test 1.1 — Bench harness measures loop-brief:**
```
Given: /loop:brief command is available
When: running `npm run bench` with BENCH_SAMPLES=3
Then: "bench loop-brief: median X.X ms across 3 samples" is printed
```

**Test 1.2 — Bench harness records baseline on first run:**
```
Given: .claude/artifacts/loop/perf/baseline.json does not exist
When: running `npm run bench`
Then: baseline.json is created with keys "loop-brief", "loop-triage", "loop-auto", etc.
```

**Test 1.3 — Bench harness gates on regression (10% threshold):**
```
Given: baseline exists with loop-brief: 500 ms
When: running `npm run bench` and the command takes 600 ms (20% slower)
Then: assertion fails with message "regressed: 600 ms vs baseline 500 ms"
```

**Test 1.4 — Bench harness allows improvement:**
```
Given: baseline exists with loop-brief: 500 ms
When: running `npm run bench` and the command takes 450 ms (10% faster)
Then: test passes (no assertion error)
```

### Test File 2: `src/tests/backlog-snapshot.test.mts`

**Test 2.1 — loadBacklogSnapshot collects pending and triaged:**
```
Given: fixture dir with pending/FEAT-001.md, triaged/FEAT-002.md
When: calling loadBacklogSnapshot(dir)
Then: result.pending.length === 1, result.triaged.length === 1
```

**Test 2.2 — loadBacklogSnapshot returns frozen structs:**
```
Given: snapshot is loaded
When: attempting snapshot.pending.push(entry)
Then: TypeError is thrown (frozen array)
```

**Test 2.3 — loadBacklogSnapshot uses parseFrontmatterCached (memoized):**
```
Given: snapshot is loaded twice from the same dir
When: calling loadBacklogSnapshot(dir) twice
Then: the second call uses memoized parses (fewer file reads)
```

### Test File 3: Amendments to existing tests

**Test 3.1 — parseFrontmatterCached logs on cache hit:**
```
Given: first call to parseFrontmatterCached("/tmp/x.md")
When: second call to parseFrontmatterCached("/tmp/x.md") without file change
Then: debug log line "Cache hit: /tmp/x.md" is emitted
```

**Test 3.2 — parseFrontmatterCached invalidates on mtime change:**
```
Given: parseFrontmatterCached("/tmp/x.md") called and cached
When: file is updated (mtime changes) and parseFrontmatterCached called again
Then: file is re-read; debug log line "Cache miss / invalidated" is emitted
```

---

## Acceptance Criteria

**AC-001: Benchmark harness is in place with 5 command definitions**
```
Given: src/tests/perf/bench.mts is written
When: running npm run bench
Then: 5 test cases (brief, triage, auto, slice-start, slice-complete) execute
```

**AC-002: Benchmark harness records baseline on first run**
```
Given: .claude/artifacts/loop/perf/baseline.json does not exist
When: running npm run bench
Then: baseline.json is written with structure { "loop-brief": N, "loop-triage": M, ... }
```

**AC-003: Benchmark harness gates on 10% regression**
```
Given: baseline exists with loop-brief: 500 ms
When: a run takes 560 ms (12% slower)
Then: npm run bench fails with assertion error mentioning regression
```

**AC-004: Benchmark baseline is committed to git**
```
Given: baseline.json is created by npm run bench
When: git check-ignore -v .claude/artifacts/loop/perf/baseline.json
Then: output confirms it is NOT in .gitignore (baseline is tracked)
```

**AC-005: parseFrontmatterCached memoizes by (path, mtime)**
```
Given: first call to parseFrontmatterCached("/tmp/x.md")
When: second call to same path without file change
Then: function returns the same object reference (cache hit)
```

**AC-006: parseFrontmatterCached logs cache hits at debug level**
```
Given: cache hit occurs
When: calling parseFrontmatterCached
Then: stderr/stdout contains debug-level log "Cache hit: ${path}"
```

**AC-007: loadBacklogSnapshot loads all four buckets in parallel**
```
Given: backlog fixture with pending/, triaged/, in-progress/, done/ dirs
When: calling loadBacklogSnapshot(dir)
Then: all four properties (pending, triaged, inProgress, done) are populated
```

**AC-008: loadBacklogSnapshot returns frozen structures**
```
Given: snapshot is loaded
When: attempting to mutate snapshot.pending.push(entry)
Then: TypeError is thrown (frozen)
```

**AC-009: loadBacklogSnapshot logs at info level on load and completion**
```
Given: calling loadBacklogSnapshot
When: loading completes
Then: two info-level logs appear: "Loading backlog snapshot..." and "Backlog snapshot loaded: ..."
```

**AC-010: loop.mts uses lazy await import() for subcommands**
```
Given: src/scripts/loop.mts is retrofit
When: running /loop:brief
Then: only brief.mjs is imported (not all other subcommands)
```

**AC-011: Git reads are batched or memoized in cost-regression, auto-merge, effective-cwd**
```
Given: modules are retrofit
When: running a command that invokes these modules
Then: number of git exec syscalls is reduced (measurable via strace or command-line tracing)
```

**AC-012: Parallel fs walks in backlog-parser, grade-parser, decisions-store**
```
Given: modules are retrofit to use Promise.all
When: running parseBacklog / parseGrades / listDecisions
Then: wall-clock time is reduced (confirmed by bench harness)
```

**AC-013: Regex patterns are hoisted to module scope**
```
Given: halt-badges.mts, backlog-parser.mts are retrofit
When: grep -n "const.*=.*\/" src/scripts/lib/halt-badges.mts
Then: at least 3 module-scope regex const declarations are present
```

**AC-014: Per-process memo is added to decisions-store and grade-parser**
```
Given: modules are retrofit
When: calling listDecisions / parseGrades twice without cache invalidation
Then: second call returns cached result (same object reference)
```

**AC-015: JSON.parse(JSON.stringify) is replaced with structuredClone**
```
Given: grep -r "JSON.parse(JSON.stringify" src/scripts
When: searching for old pattern
Then: zero matches (all replaced)
```

**AC-016: Map indexes are added to slice-linker and linkage**
```
Given: modules are retrofit
When: reading the code for nested loops with .find(x => x.id === id)
Then: replaced with Map.get() calls (zero .find() in hot loops)
```

**AC-017: Telemetry uses batch flush on process exit**
```
Given: telemetry.mts is retrofit
When: recordEvent is called 10 times
Then: only 1 appendFileSync call is made on process exit (not 10)
```

**AC-018: Cumulative perf improvement is ≥20% on brief, triage, auto**
```
Given: baseline is recorded before C2 changes
When: changes are applied and bench is re-run
Then: brief, triage, auto median wall-clock times are ≤80% of original
```

**AC-019: No command regresses >10% from baseline**
```
Given: baseline is committed
When: running npm run bench in CI
Then: all 5 commands pass the regression gate; no assertion failures
```

**AC-020: All required tests pass and coverage is green**
```
Given: all test files created/amended
When: running npm run typecheck && npm run lint && npm test && npm run bench
Then: exit code 0; no test failures; no lint errors; all benchmarks pass
```

---

## Verification Commands

**Typecheck clean:**
```bash
cd C:\work\mega\loop && npm run typecheck 2>&1 | tail -3
```
Expected: exit 0; no output or "tsc: command not found".

**Lint clean:**
```bash
cd C:\work\mega\loop && npm run lint 2>&1 | tail -3
```
Expected: exit 0.

**All tests pass:**
```bash
cd C:\work\mega\loop && npm test 2>&1 | tail -20
```
Expected: summary shows all tests passed.

**Bench script exists and runs:**
```bash
cd C:\work\mega\loop && npm run bench 2>&1 | tail -20
```
Expected: output shows "bench loop-brief: median X.X ms" for each of 5 commands; baseline.json is created/updated.

**Baseline is not in .gitignore:**
```bash
cd C:\work\mega\loop && git check-ignore -v .claude/artifacts/loop/perf/baseline.json 2>&1
```
Expected: no output (file is NOT ignored).

**Backlog snapshot module exports:**
```bash
cd C:\work\mega\loop && npm run build && node -e "import { loadBacklogSnapshot } from './scripts/lib/backlog-snapshot.mjs'; console.log(typeof loadBacklogSnapshot);" 2>&1
```
Expected: output "function".

**Frontmatter memoization test:**
```bash
cd C:\work\mega\loop && npm run build && node --test tests/frontmatter.test.mjs 2>&1 | grep -A 2 "Cache"
```
Expected: tests for "Cache hit" and "Cache miss" appear and pass.

**Snapshot test:**
```bash
cd C:\work\mega\loop && npm run build && node --test tests/backlog-snapshot.test.mjs 2>&1 | tail -10
```
Expected: backlog snapshot tests pass.

**Regression gate in action:**
```bash
cd C:\work\mega\loop && rm .claude/artifacts/loop/perf/baseline.json && npm run bench 2>&1 | tail -5 && npm run bench 2>&1 | tail -5
```
Expected: first run creates baseline; second run either passes (no regression) or fails (regression detected).

**Full acceptance suite:**
```bash
cd C:\work\mega\loop && npm run typecheck && npm run lint && npm test && npm run bench && npm run format:check 2>&1 | tail -10
```
Expected: exit code 0; all checks pass; bench shows ≥20% improvement on target commands.

---

## Notes on Observability

This slice includes observability to address the weak observability dimension (0.66 grade signal):

1. **Frontmatter cache observability:**
   - Debug log on every cache hit: `"Cache hit: ${path}"`.
   - Debug log on cache miss / invalidation: `"Cache miss / invalidated: ${path} (prev mtime: ${prevMtime}, new: ${stat.mtimeMs})"`.
   - Enables tracing of memoization effectiveness.

2. **Snapshot load observability:**
   - Info log on entry: `"Loading backlog snapshot from ${backlogRoot}"`.
   - Info log on completion with counts: `"Backlog snapshot loaded: ${pending.length} pending, ${triaged.length} triaged, ${inProgress.length} in-progress, ${done.length} done"`.
   - Enables monitoring of snapshot freshness and load time.

3. **Decision/grade cache observability:**
   - Debug log on cache hit: `"Decisions cache hit (${entries.length} entries)"`.
   - Debug log on cache miss: `"Decisions cache miss / invalidated (prev mtime: ${prev}, new: ${stat.mtimeMs})"`.
   - Enables diagnosing cache effectiveness.

4. **Git batch observability:**
   - Debug log on every git exec: `"git exec (memoized=${isCached}): ${command}"`.
   - Enables tracing git call patterns.

5. **Telemetry batch flush observability:**
   - Debug log on flush: `"Telemetry flush: ${buffer.length} events to ${path}"`.
   - Enables monitoring of batch sizes and write patterns.

6. **Benchmark telemetry:**
   - A new **cache-hit-rate metric** is computed and logged per CLI invocation:
     - Count total cache hits (frontmatter + decisions + grades).
     - Count total cache checks (frontmatter + decisions + grades).
     - Log at info level: `"Observability: cache-hit-rate = ${(hitCount / totalCount * 100).toFixed(1)}%"`.
   - Enables tracking memoization effectiveness across invocations.

All logging via the existing telemetry module; if none exists, use `console.log` with level prefixes (e.g., `"[debug]"`, `"[info]"`, `"[warn]"`).

---

## Rationale & Context

**Why these 10 wins:** The plan identified the highest-impact optimizations:
- Memoization (wins 1–2) addresses repeated file reads (backlog walks re-read the same files 5–10× per invocation).
- Lazy subcommand load (win 3) defers module parsing for commands that don't run.
- Batched git / parallel fs (wins 4–5) reduce syscall overhead.
- Regex hoisting (win 6) eliminates per-invocation regex compilation.
- Caching (wins 7) reuses expensive tree walks.
- Cloning (win 8) uses faster native implementation.
- Indexing (win 9) eliminates O(N²) lookup patterns.
- Telemetry batching (win 10) reduces write syscalls.

**Why the 10% regression threshold:** Benchmarks are noisy; 10% accounts for normal variance while catching material regressions. CI fails if any command exceeds baseline × 1.1.

**Why frozen snapshots:** Immutability prevents accidental mutations and enables safe sharing of the snapshot across multiple callers within a single invocation.

**Why per-process caches (not global):** Loop runs are isolated per-process (no daemon); per-process caches are safe and do not require invalidation across builds. On `process.exit`, the cache is garbage-collected.

**Why observability is critical:** The weak observability grade (0.66) signals missing visibility into performance-critical paths. Logging every cache hit/miss, every snapshot load, and publishing a cache-hit-rate metric enables understanding whether optimizations are actually working in production.
