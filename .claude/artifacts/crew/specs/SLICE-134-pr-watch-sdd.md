# Spec: SLICE-134 — `/loop:pr-watch` PR check polling and auto-fix loop

## Metadata
- developer_type: agent
- estimated_complexity: high
- languages: TypeScript (ESM, Bun runtime)

## Objective

Implement `bun src/scripts/loop.mts pr-watch <PR-URL>` — a closed-loop CI monitor that polls `gh pr checks`, dispatches `crew:builder` with structured fix prompts on failures, enforces retry and cost ceilings, blocks prompt-injection via a security gate, handles PR state edge cases, and emits `snapshot.prWatch` halt-badges on exit conditions that require operator attention.

## Context

- **FEAT-110** — full acceptance criteria: `.claude/artifacts/loop/backlog/triaged/FEAT-110.md`
- **Shell pattern** — `from-issue.mts` (`src/scripts/lib/from-issue.mts`) shows the canonical gh-CLI wrapper: `execFile` from `node:child_process`, promisified; injectable `exec` option for tests; human-readable error messages on ENOENT / non-zero exit. Follow this exactly.
- **Halt-badge contract** — `docs/halt-badges.md` is the registry. `src/scripts/lib/halt-badges.mts` holds `HALT_BADGES` array. `src/scripts/lib/stop-conditions.mts` holds `assembleStopResult` and builder helpers (`buildXxxSnapshotEntry`). All three must be updated together (enforced by `src/tests/halt-badge-schema.test.mts`).
- **COMMANDS dict** — `src/scripts/loop.mts` lines 227–560: each key is a subcommand string, each value is `async ({ repoPath, flags, positionals, config }: CmdCtx) => unknown`. Entry-point sets `process.exitCode`; library functions MUST NOT call `process.exit()`.
- **`--allow-human-comments` flag** — `--allow-human-comments` is not yet in `FLAG_SPEC`. The builder must add it. Key: `allowHumanComments`, boolean.
- **Config shape** — `loop.prWatch` block in `.claude/loop.json` (does not exist yet; the library reads with defaults). No existing entry to conflict with.
- **Non-throwing write, null-return read pattern** — follow `dispatch-metrics.mts` (`src/scripts/lib/dispatch-metrics.mts`): writes catch and emit to `process.stderr`; reads return `null` on absent file or parse error.
- **Test pattern** — `src/tests/pr-fixer.test.mts`: `bun:test`, `node:assert/strict`, inject `exec`-style callbacks to avoid real `gh` calls.

## Implementation Contract

### 1. New file: `src/scripts/lib/pr-watch.mts`

#### Types

```typescript
export type PrState = "OPEN" | "MERGED" | "CLOSED";

export type CheckConclusion =
  | "success"
  | "failure"
  | "skipped"
  | "pending"
  | string; // unknown values pass through for logging

export interface PrCheckItem {
  name: string;
  status: CheckConclusion;
  conclusion: CheckConclusion | null;
  detailsUrl: string;
}

export interface PrWatchConfig {
  pollIntervalSeconds: number; // default 30; clamped to minimum 10
  maxRetries: number;          // default 3; 0 = poll-only, never dispatch
  maxCostUsd: number;          // default 5.0
}

// Discriminated union — one variant per AC exit path
export type PrWatchResult =
  | { outcome: "all-green" }
  | { outcome: "max-retries"; retriesUsed: number }
  | { outcome: "cost-exceeded"; cumulativeCostUsd: number }
  | { outcome: "pr-merged" }
  | { outcome: "pr-closed" }
  | { outcome: "no-checks" };

// Injectable executor — mirrors FetchIssueOptions pattern from from-issue.mts
export interface PrWatchExec {
  /** Shell `gh pr view <prUrl> --json state,title` → raw JSON string */
  viewPr: (prUrl: string) => Promise<string>;
  /** Shell `gh pr checks <prUrl> --json name,status,conclusion,detailsUrl` → raw JSON string */
  listChecks: (prUrl: string) => Promise<string>;
  /** Best-effort `gh api <detailsUrl>` → raw text; swallows errors, returns "" */
  fetchLog: (detailsUrl: string, maxChars: number) => Promise<string>;
  /** Dispatch crew:builder with the given prompt; returns estimated cost in USD */
  dispatchBuilder: (prompt: string) => Promise<number>;
  /** Fetch human review comments: `gh pr view <prUrl> --json reviews` → raw JSON */
  listReviews: (prUrl: string) => Promise<string>;
  /** Sleep for N milliseconds (default: real setTimeout) */
  sleep: (ms: number) => Promise<void>;
}
```

#### Function signatures

```typescript
/**
 * Read `prWatch` block from `.claude/loop.json` config with defaults applied.
 * Clamps pollIntervalSeconds to minimum 10 and logs a warning if clamped.
 * Returns defaults if `config` is null or `config.loop?.prWatch` is absent.
 */
export function readPrWatchConfig(
  config: Record<string, any> | null
): PrWatchConfig;

/**
 * Parse `gh pr view` JSON output and return the PR state.
 * Throws if the JSON cannot be parsed or is missing the `state` field.
 */
export function parsePrState(raw: string): PrState;

/**
 * Parse `gh pr checks` JSON output and return typed check items.
 * Returns an empty array when the JSON parses to an empty array.
 * Throws on JSON parse error or non-array root.
 */
export function parseChecks(raw: string): PrCheckItem[];

/**
 * Classify whether checks are all done (success/skipped), any failing, or still pending.
 * Unknown status values are logged as WARN and treated as pending (not counted as failure).
 * Returns:
 *   "green"   — every check is `success` or `skipped`
 *   "failing" — at least one check is `failure` (and none are unknown)
 *   "pending" — at least one check is `pending` or unknown (no action yet)
 */
export function classifyChecks(
  checks: PrCheckItem[]
): "green" | "failing" | "pending";

/**
 * Build the builder dispatch prompt from the current watch state.
 * Truncates each log to maxLogChars (default 2000).
 * When allowHumanComments is true and comments are supplied, includes them
 * (truncated to 500 chars each, max 5 comments).
 */
export function buildBuilderPrompt(opts: {
  prUrl: string;
  failingChecks: Array<{ name: string; logExcerpt: string }>;
  humanComments: string[];
  allowHumanComments: boolean;
}): string;

/**
 * Core polling + dispatch loop.
 *
 * Lifecycle:
 *   1. Check PR state — exit early for MERGED (outcome: "pr-merged") or CLOSED
 *      (outcome: "pr-closed", emit halt-badge).
 *   2. Poll checks — exit for empty suite (outcome: "no-checks").
 *   3. If all green → outcome: "all-green".
 *   4. If failing and maxRetries > 0 and retriesUsed < maxRetries:
 *        a. Fetch log excerpts for failing checks.
 *        b. Optionally fetch human review comments if allowHumanComments.
 *        c. Dispatch crew:builder; accumulate returned cost.
 *        d. Check cost ceiling after dispatch; if exceeded → outcome: "cost-exceeded".
 *        e. Increment retriesUsed.
 *        f. If retriesUsed === maxRetries and checks still failing →
 *           outcome: "max-retries".
 *   5. Sleep pollIntervalSeconds; loop.
 *
 * Does NOT call process.exit(). Caller sets process.exitCode.
 * Does NOT emit halt-badges itself — returns PrWatchResult; entry point emits badges.
 */
export async function runPrWatch(
  prUrl: string,
  config: PrWatchConfig,
  allowHumanComments: boolean,
  exec: PrWatchExec
): Promise<PrWatchResult>;
```

#### Default `exec` implementation (production)

The `exec` argument has a production default created inside `runPrWatch` when `null` is supplied, or built by the COMMANDS entry:

- `viewPr`: `execFile("gh", ["pr", "view", prUrl, "--json", "state,title"])` — throws propagated as-is (caller catches).
- `listChecks`: `execFile("gh", ["pr", "checks", prUrl, "--json", "name,status,conclusion,detailsUrl"])`.
- `fetchLog`: `execFile("gh", ["api", detailsUrl])` — catch all errors, return `""`. Slice output to `maxChars`.
- `listReviews`: `execFile("gh", ["pr", "view", prUrl, "--json", "reviews"])`.
- `dispatchBuilder`: log the prompt to stdout as `[pr-watch] builder prompt:\n<prompt>` then return `0` (cost unknown at CLI level; the orchestrating agent accumulates cost separately). The `dispatchBuilder` stub in production is intentionally a placeholder — the real dispatch is performed by the orchestrating agent reading the emitted prompt. For tests, this is injectable.
- `sleep`: `new Promise(resolve => setTimeout(resolve, ms))`.

### 2. Modified file: `src/scripts/loop.mts`

#### FLAG_SPEC addition (after `"--allow-cross-session"` entry, line ~76)

```typescript
"--allow-human-comments": { key: "allowHumanComments", boolean: true },
```

#### `flags` defaults addition (after `allowCrossSession: false`, line ~153)

```typescript
allowHumanComments: false,
```

#### COMMANDS entry (add after `"resume"` handler, before `"stuck-tick"`)

```typescript
"pr-watch": async ({ repoPath, flags, positionals, config }: CmdCtx) => {
  const prUrl = positionals[0] as string | undefined;
  if (!prUrl) {
    console.error("pr-watch requires a PR URL as the first positional argument");
    process.exitCode = 1;
    return { _suppressDefaultOutput: true };
  }
  const { runPrWatch, readPrWatchConfig, buildDefaultExec } = await import(
    "./lib/pr-watch.mjs"
  );
  const watchConfig = readPrWatchConfig(config);
  const allowHumanComments = Boolean(flags.allowHumanComments);

  if (allowHumanComments) {
    console.warn(
      "WARNING: human review comment text will be forwarded to crew:builder. " +
        "Ensure the PR is from a trusted source to avoid prompt injection."
    );
  }

  const exec = buildDefaultExec(repoPath);
  const result = await runPrWatch(prUrl, watchConfig, allowHumanComments, exec);

  if (result.outcome === "all-green") {
    console.log("PR checks all green — watch complete");
    process.exitCode = 0;
  } else if (result.outcome === "pr-merged") {
    console.log("PR already merged — nothing to watch");
    process.exitCode = 0;
  } else if (result.outcome === "no-checks") {
    console.log("no checks found on PR — watch exiting (nothing to fix)");
    process.exitCode = 0;
  } else if (result.outcome === "max-retries") {
    console.error(
      `pr-watch stopped: max retries (${watchConfig.maxRetries}) reached`
    );
    process.exitCode = 1;
  } else if (result.outcome === "cost-exceeded") {
    console.error(
      `pr-watch stopped: cumulative cost $${result.cumulativeCostUsd.toFixed(2)} exceeds limit $${watchConfig.maxCostUsd.toFixed(2)}`
    );
    process.exitCode = 1;
  } else if (result.outcome === "pr-closed") {
    console.error("PR is closed — watch aborted");
    process.exitCode = 1;
  }

  return { outcome: result.outcome };
},
```

Note: halt-badge emission is NOT done inline in this handler. The `pr-watch` command is a standalone CLI tool invoked by the orchestrating agent, not part of the `stop-conditions` pipeline. The halt-badge fields in `snapshot.prWatch` are for the orchestrating agent to read from the command's JSON output and relay to the loop brief. The `prWatch` field therefore does NOT need to be added to `assembleStopResult` — it is not a stop-conditions badge. It is emitted as a top-level field in the command's return value when the outcome is a halt condition (see "Side effects" below).

**Correction — halt-badge output shape:** the `pr-watch` command returns its result JSON (printed by the main dispatcher via `console.log(JSON.stringify(result, null, 2))`). The halt-badge payload must be embedded in the returned object so the orchestrating agent can read it:

```typescript
// In the "max-retries" branch:
return {
  outcome: "max-retries",
  prWatch: {
    triggered: true,
    haltReason: "max-retries",
    retriesUsed: result.retriesUsed
  }
};

// In the "cost-exceeded" branch:
return {
  outcome: "cost-exceeded",
  prWatch: {
    triggered: true,
    haltReason: "cost-exceeded",
    cumulativeCostUsd: result.cumulativeCostUsd
  }
};

// In the "pr-closed" branch:
return {
  outcome: "pr-closed",
  prWatch: {
    triggered: true,
    haltReason: "pr-closed"
  }
};
```

### 3. Modified file: `docs/halt-badges.md`

Add one new `## snapshot.prWatch` section **before** the `## How to add a new halt-badge` section. The `snapshot.prWatch` field is documented as a conceptual halt-badge emitted by the `pr-watch` command's JSON output (not by `stop-conditions.mts`), so it is registry-documented but NOT wired into `assembleStopResult`.

**Important constraint for `halt-badge-schema.test.mts`:** the schema regression test (`src/tests/halt-badge-schema.test.mts`) checks that every `### snapshot.<field>` heading in `docs/halt-badges.md` has a matching entry in `HALT_BADGES`. This means adding `### snapshot.prWatch` to `docs/halt-badges.md` requires a corresponding entry in `src/scripts/lib/halt-badges.mts::HALT_BADGES`. The builder must add both in lockstep.

Section to add in `docs/halt-badges.md`:

```markdown
### `snapshot.prWatch`

**Shape:**

```ts
// max-retries variant
{ triggered: true; haltReason: "max-retries"; retriesUsed: number }

// cost-exceeded variant
{ triggered: true; haltReason: "cost-exceeded"; cumulativeCostUsd: number }

// pr-closed variant
{ triggered: true; haltReason: "pr-closed" }
```

**Meaning:** `/loop:pr-watch` terminated abnormally. The `haltReason` field identifies the stop cause. Emitted in the JSON return value of the `pr-watch` CLI command.

**Fires when:**
- `"max-retries"` — completed builder dispatches reached `loop.prWatch.maxRetries` and checks remain failing.
- `"cost-exceeded"` — cumulative estimated cost of builder dispatches in this session reached `loop.prWatch.maxCostUsd`.
- `"pr-closed"` — PR state is `CLOSED` (not merged) at startup or on any poll iteration.

**Suggested operator action:**
- `"max-retries"`: inspect the failing checks manually and push a fix. Re-run `bun src/scripts/loop.mts pr-watch <PR-URL>` after the fix.
- `"cost-exceeded"`: review the failing checks for scope creep. Either raise `loop.prWatch.maxCostUsd` in `.claude/loop.json` or fix the checks manually.
- `"pr-closed"`: the PR was closed without merging. No action from loop is possible.

**Origin:** FEAT-110 / SLICE-134. Source: `src/scripts/lib/pr-watch.mts::runPrWatch`. Emitted via command JSON output, not via `stop-conditions.mts`.
```

### 4. Modified file: `src/scripts/lib/halt-badges.mts`

Add a render function and registry entry for `prWatch`:

```typescript
function renderPrWatch(e: any): string[] {
  if (!e) return [];
  const lines = [`- Halt reason: ${e.haltReason}`];
  if (e.haltReason === "max-retries") {
    lines.push(`- Retries used: ${e.retriesUsed}`);
    lines.push(
      "- Suggested action: inspect the failing checks manually and push a fix. Re-run `bun src/scripts/loop.mts pr-watch <PR-URL>` after the fix."
    );
  } else if (e.haltReason === "cost-exceeded") {
    lines.push(`- Cumulative cost: $${e.cumulativeCostUsd?.toFixed?.(2) ?? e.cumulativeCostUsd}`);
    lines.push(
      "- Suggested action: review failing checks for scope creep. Raise `loop.prWatch.maxCostUsd` in `.claude/loop.json` or fix the checks manually."
    );
  } else if (e.haltReason === "pr-closed") {
    lines.push("- Suggested action: the PR was closed without merging. No loop action possible.");
  }
  return lines;
}
```

Add to `HALT_BADGES` array (before the closing `]`):

```typescript
{ field: "prWatch", gateName: "PR watch halt", render: renderPrWatch },
```

**Do not** add `prWatch` to `assembleStopResult` in `stop-conditions.mts` — it is not produced by `checkStopConditions`. The schema test's third assertion only checks fields emitted by `assembleStopResult`; `prWatch` does not appear there. The first two assertions (HALT_BADGES ↔ docs headings) still apply and are satisfied by the additions above.

### Inputs

- CLI positional `argv[0]`: PR URL string (e.g. `https://github.com/owner/repo/pull/42`). Required; missing → `process.exitCode = 1`, no-op.
- `--allow-human-comments`: boolean flag (default `false`). When present, forwards sanitized human review comments to builder prompt.
- `--repo <path>`: standard flag; `repoPath` resolved by main dispatcher.
- `config`: `Record<string, any> | null` from `resolveConfig(repoPath)`, passed via `CmdCtx`.

### Outputs

JSON object printed to stdout by the main dispatcher. Shape varies by outcome:

```typescript
// success
{ outcome: "all-green" }
{ outcome: "pr-merged" }
{ outcome: "no-checks" }

// halt with badge
{ outcome: "max-retries"; prWatch: { triggered: true; haltReason: "max-retries"; retriesUsed: number } }
{ outcome: "cost-exceeded"; prWatch: { triggered: true; haltReason: "cost-exceeded"; cumulativeCostUsd: number } }
{ outcome: "pr-closed"; prWatch: { triggered: true; haltReason: "pr-closed" } }
```

### Side effects

- **stdout**: log messages (checks-all-green, PR merged, no-checks). Builder prompt printed via `console.log`.
- **stderr**: error messages on halt, poll-interval clamp warning, unknown check status warn.
- **No file writes**: `pr-watch.mts` writes nothing to disk. Halt-badge data lives only in the command's JSON return value.
- **External process calls**: `gh pr view`, `gh pr checks`, `gh api <url>`, via the `exec` interface.

## Files to Create / Modify

| Action | Path | Notes |
|--------|------|-------|
| Create | `src/scripts/lib/pr-watch.mts` | Core polling + dispatch logic |
| Create | `src/tests/pr-watch.test.mts` | ≥5 test cases, mock exec |
| Modify | `src/scripts/loop.mts` | Add `--allow-human-comments` to FLAG_SPEC + flags defaults; add `"pr-watch"` to COMMANDS |
| Modify | `docs/halt-badges.md` | Add `### \`snapshot.prWatch\`` section before "How to add" section |
| Modify | `src/scripts/lib/halt-badges.mts` | Add `renderPrWatch` function and `prWatch` entry to `HALT_BADGES` |

## Required Tests

File: `src/tests/pr-watch.test.mts`

All tests import from `"../scripts/lib/pr-watch.mjs"` and use injectable `exec` to avoid real `gh` calls. Pattern follows `src/tests/pr-fixer.test.mts`.

### TC-001 — Happy path: all-green on first poll

**Setup:** `viewPr` returns `{ state: "OPEN", title: "my PR" }`. `listChecks` returns `[{ name: "ci", status: "success", conclusion: "success", detailsUrl: "" }]`. `dispatchBuilder` never called.

**Input:** `prUrl = "https://github.com/o/r/pull/1"`, `config = { pollIntervalSeconds: 30, maxRetries: 3, maxCostUsd: 5.0 }`, `allowHumanComments = false`.

**Expected:** `result.outcome === "all-green"`.

### TC-002 — PR already merged before first poll

**Setup:** `viewPr` returns `{ state: "MERGED", title: "my PR" }`. `listChecks` never called.

**Input:** same config as TC-001.

**Expected:** `result.outcome === "pr-merged"`.

### TC-003 — Max retries reached

**Setup:** `viewPr` always returns `{ state: "OPEN", title: "t" }`. `listChecks` always returns `[{ name: "lint", status: "failure", conclusion: "failure", detailsUrl: "" }]`. `fetchLog` returns `""`. `dispatchBuilder` returns `0.5` each call. `sleep` resolves immediately. `maxRetries = 2`.

**Input:** `config = { pollIntervalSeconds: 10, maxRetries: 2, maxCostUsd: 5.0 }`, `allowHumanComments = false`.

**Expected:** `result.outcome === "max-retries"` AND `result.retriesUsed === 2`. `dispatchBuilder` called exactly 2 times.

### TC-004 — Cost ceiling exceeded after one dispatch

**Setup:** `viewPr` always returns `{ state: "OPEN", title: "t" }`. `listChecks` always returns one failing check. `fetchLog` returns `""`. `dispatchBuilder` returns `6.0` (exceeds `maxCostUsd: 5.0`). `sleep` resolves immediately.

**Input:** `config = { pollIntervalSeconds: 10, maxRetries: 3, maxCostUsd: 5.0 }`, `allowHumanComments = false`.

**Expected:** `result.outcome === "cost-exceeded"` AND `result.cumulativeCostUsd === 6.0`.

### TC-005 — PR closed during watch

**Setup:** `viewPr` returns `{ state: "CLOSED", title: "t" }`.

**Input:** any config, `allowHumanComments = false`.

**Expected:** `result.outcome === "pr-closed"`.

### TC-006 — Unknown check status does not increment retry counter

**Setup:** `viewPr` always returns OPEN. First `listChecks` call returns `[{ name: "x", status: "", conclusion: null, detailsUrl: "" }]` (unknown status). Second call returns `[{ name: "ci", status: "success", conclusion: "success", detailsUrl: "" }]`. `sleep` resolves immediately. `maxRetries = 1`.

**Input:** `config = { pollIntervalSeconds: 10, maxRetries: 1, maxCostUsd: 5.0 }`.

**Expected:** `result.outcome === "all-green"`. `dispatchBuilder` NOT called. No retry increment.

### TC-007 — Empty check suite exits cleanly

**Setup:** `viewPr` returns OPEN. `listChecks` returns `[]`.

**Expected:** `result.outcome === "no-checks"`. `dispatchBuilder` NOT called.

### TC-008 — pollIntervalSeconds < 10 is clamped

**Setup:** `readPrWatchConfig` called with `config = { loop: { prWatch: { pollIntervalSeconds: 5, maxRetries: 3, maxCostUsd: 5.0 } } }`.

**Expected:** returned config has `pollIntervalSeconds === 10`.

### TC-009 — maxRetries = 0 (poll-only mode), failing checks, no dispatch

**Setup:** `viewPr` returns OPEN. `listChecks` returns one failing check on first call, one success on second call. `sleep` resolves immediately. `maxRetries = 0`.

**Input:** `config = { pollIntervalSeconds: 10, maxRetries: 0, maxCostUsd: 5.0 }`.

**Expected:** `result.outcome === "all-green"`. `dispatchBuilder` NOT called (maxRetries = 0 means poll-only).

### TC-010 — `classifyChecks` with mixed known and unknown statuses

**Setup:** call `classifyChecks` directly with `[{ name: "a", status: "success", conclusion: "success", detailsUrl: "" }, { name: "b", status: "queued", conclusion: null, detailsUrl: "" }]`.

**Expected:** returns `"pending"` (unknown status treated as pending, not failure).

## Acceptance Criteria

| AC | Criterion | Pass condition |
|----|-----------|----------------|
| AC-001 | Happy path: check fix loop | `runPrWatch` returns `{ outcome: "all-green" }` when all checks return `success`/`skipped` after a builder dispatch cycle |
| AC-002 | Max retries halt-badge | `runPrWatch` returns `{ outcome: "max-retries", retriesUsed: N }` when dispatches equal `config.maxRetries`; entry point emits `prWatch: { triggered: true, haltReason: "max-retries", retriesUsed: N }` in JSON output |
| AC-003 | Security gate default-off | `buildBuilderPrompt` with `allowHumanComments: false` produces prompt string NOT containing any of the supplied `humanComments` values; stderr contains "human review comments detected" warning |
| AC-003b | Security gate opt-in | `buildBuilderPrompt` with `allowHumanComments: true` and 6 comments truncates to max 5, each ≤500 chars |
| AC-004 | Cost halt-badge | `runPrWatch` returns `{ outcome: "cost-exceeded", cumulativeCostUsd: N }` when cumulative cost ≥ `config.maxCostUsd`; entry point emits `prWatch: { triggered: true, haltReason: "cost-exceeded", cumulativeCostUsd: N }` |
| AC-005 | PR merged early exit | `runPrWatch` returns `{ outcome: "pr-merged" }` when PR state is `MERGED`; no halt-badge emitted |
| AC-006 | PR closed halt-badge | `runPrWatch` returns `{ outcome: "pr-closed" }`; entry point emits `prWatch: { triggered: true, haltReason: "pr-closed" }` |
| AC-007 | Unknown check status | `classifyChecks` returns `"pending"` for unknown status; no retry increment; stderr WARN logged |
| AC-edge-1 | Empty suite | `runPrWatch` returns `{ outcome: "no-checks" }` when `listChecks` returns `[]` |
| AC-edge-2 | Poll clamp | `readPrWatchConfig` returns `pollIntervalSeconds: 10` when config supplies `pollIntervalSeconds: 5`; stderr WARN logged |
| AC-edge-3 | Poll-only mode | `maxRetries: 0` — `runPrWatch` polls until all-green, never calls `dispatchBuilder` |
| halt-badge-schema | Registry consistency | `bun test src/tests/halt-badge-schema.test.mts` passes: `prWatch` in `HALT_BADGES` ↔ `### \`snapshot.prWatch\`` in `docs/halt-badges.md` |

## Verification Commands

Run these in order after implementation. All must exit 0.

```bash
# 1. TypeScript typecheck (no emit)
bunx tsc --project tsconfig.json --noEmit

# 2. Lint — must be clean, zero warnings
bun run lint

# 3. Format check
bun run format:check

# 4. Manifest sanity
bun ./src/scripts/validate-manifests.mts

# 5. Content-length cap (agents/*, skills/**)
bun ./src/scripts/validate-content-length.mts

# 6. Targeted test — pr-watch unit tests
bun test src/tests/pr-watch.test.mts --timeout 60000

# 7. Halt-badge schema regression (must still pass with new prWatch field)
bun test src/tests/halt-badge-schema.test.mts --timeout 60000

# 8. Full test suite
bun test src/tests/ --parallel --timeout 60000
```

## Loop.mts Integration — Exact COMMANDS Entry

Location: in the `COMMANDS` object, after the `resume` entry (approximately line 474) and before the `stuck-tick` entry (approximately line 475).

Key: `"pr-watch"` (string literal — matches the CLI positional `bun src/scripts/loop.mts pr-watch <url>`).

```typescript
"pr-watch": async ({ repoPath, flags, positionals, config }: CmdCtx) => {
  const prUrl = positionals[0] as string | undefined;
  if (!prUrl) {
    console.error("pr-watch requires a PR URL as the first positional argument");
    process.exitCode = 1;
    return { _suppressDefaultOutput: true };
  }
  const { runPrWatch, readPrWatchConfig, buildDefaultExec } = await import(
    "./lib/pr-watch.mjs"
  );
  const watchConfig = readPrWatchConfig(config);
  const allowHumanComments = Boolean(flags.allowHumanComments);

  if (allowHumanComments) {
    console.warn(
      "WARNING: human review comment text will be forwarded to crew:builder. " +
        "Ensure the PR is from a trusted source to avoid prompt injection."
    );
  }

  const exec = buildDefaultExec();
  const result = await runPrWatch(prUrl, watchConfig, allowHumanComments, exec);

  if (result.outcome === "all-green") {
    console.log("PR checks all green — watch complete");
    process.exitCode = 0;
    return { outcome: "all-green" };
  }
  if (result.outcome === "pr-merged") {
    console.log("PR already merged — nothing to watch");
    process.exitCode = 0;
    return { outcome: "pr-merged" };
  }
  if (result.outcome === "no-checks") {
    console.log("no checks found on PR — watch exiting (nothing to fix)");
    process.exitCode = 0;
    return { outcome: "no-checks" };
  }
  if (result.outcome === "max-retries") {
    console.error(
      `pr-watch stopped: max retries (${watchConfig.maxRetries}) reached`
    );
    process.exitCode = 1;
    return {
      outcome: "max-retries",
      prWatch: { triggered: true, haltReason: "max-retries", retriesUsed: result.retriesUsed }
    };
  }
  if (result.outcome === "cost-exceeded") {
    console.error(
      `pr-watch stopped: cumulative cost $${result.cumulativeCostUsd.toFixed(2)} exceeds limit $${watchConfig.maxCostUsd.toFixed(2)}`
    );
    process.exitCode = 1;
    return {
      outcome: "cost-exceeded",
      prWatch: {
        triggered: true,
        haltReason: "cost-exceeded",
        cumulativeCostUsd: result.cumulativeCostUsd
      }
    };
  }
  // pr-closed
  console.error("PR is closed — watch aborted");
  process.exitCode = 1;
  return {
    outcome: "pr-closed",
    prWatch: { triggered: true, haltReason: "pr-closed" }
  };
},
```

## Open Questions

1. **Rate-limit handling**: FEAT-110 triage notes flag that long watch sessions could stall on GitHub 403. No AC covers this. The production `exec` implementation should propagate `gh` errors as thrown exceptions; the `runPrWatch` outer loop should catch and log them as transient failures (same treatment as unknown check status: log WARN, skip poll iteration, do not increment retry counter). This is a gap not covered by a test in this slice — flag for a follow-up AC.

2. **Builder commit detection**: FEAT-110 edge case says "if builder completes but no new commit was pushed, retry counter increments". No AC pins a test to this. The production `dispatchBuilder` stub returns a cost estimate only; detecting whether a commit was pushed would require a `gh pr view` re-check for commit SHA change. This slice defers that to a follow-up.

3. **`dispatchBuilder` cost return**: in production, `crew:builder` is dispatched as an Agent subagent, not a CLI call. The cost accumulation must come from the orchestrating agent's cost tracking, not from a return value. The `dispatchBuilder` in `PrWatchExec` uses a `Promise<number>` return to keep the unit-testable contract clean; the production implementation in `buildDefaultExec` should return `0` and the orchestrating agent tracks cost via `dispatch-metrics` artifacts. A future slice can wire real cost reading.
