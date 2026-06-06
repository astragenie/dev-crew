---
feature: FEAT-055
slice: SLICE-52
title: Walker aggregate cost gate
created: 2026-06-06
status: draft
---

# FEAT-055 — Contract artifact

Scope: walker-side cost regression gate that halts the autonomous loop when
the current slice's aggregate spend (own-project + sibling projects) exceeds
`multiplier × rolling-median` of the last N aggregate cost reports.

Reads existing aggregate cost reports under
`.claude/artifacts/crew/cost/*-cost-report-aggregate-*.md` (written by the
crew plugin, frontmatter `aggregate_all: true`). Does not modify any crew
artifact. Adds two `loop.json` fields, one helper module, one stop-condition
signal, one structured badge surfaced in `stop-check.reasons` and in the
crew `brief-me` Autonomous Loop section under "Blocked / Missing".

## TypeScript Interfaces

All types live in `src/scripts/lib/cost-alert-loader.mts` unless noted.

```ts
// Single parsed aggregate cost report (one row per
// `.claude/artifacts/crew/cost/*-cost-report-aggregate-*.md` file).
// Mirrors the frontmatter shape produced by crew's cost-report generator
// (see existing aggregate reports under .claude/artifacts/crew/cost/).
export interface AggregateCostReport {
  /** Absolute path to the source markdown file. */
  path: string;
  /** Frontmatter `slice` value (e.g. "SLICE-51"). Null if missing. */
  slice: string | null;
  /** Frontmatter `run_title` value. Null if missing. */
  runTitle: string | null;
  /** Frontmatter `usd` value parsed to number. Null if unparseable. */
  usd: number | null;
  /** Frontmatter `created_at` ISO-8601 string. Null if missing. */
  createdAt: string | null;
  /** Always true for files this loader returns (aggregate_all === true). */
  aggregateAll: true;
  /** Frontmatter `source_count` (number of sibling projects merged). */
  sourceCount: number | null;
}

// Return shape of `loadAggregateCostReport(repoPath, opts)`.
// Reports are sorted newest-first; `current` is reports[0] for caller convenience.
export interface AggregateCostReportSet {
  /** Most recent aggregate report (reports[0]) or null when none exist. */
  current: AggregateCostReport | null;
  /** All matched reports newest-first, up to opts.limit. */
  reports: AggregateCostReport[];
  /** Directory scanned (absolute path). */
  dir: string;
}

// Rolling-median helper (`computeRollingMedian` in same module).
// Median of the previous N reports EXCLUDING `current` — that is, the
// baseline the current slice is being compared against. When fewer than
// `window` historical reports exist, falls back to all available.
// When zero historical reports exist (single-report fallback), returns
// { median: null, sampleCount: 0 }.
export interface RollingMedianInput {
  /** Reports newest-first. reports[0] is the current slice and is excluded. */
  reports: AggregateCostReport[];
  /** Window size (e.g. 5). Default 5. */
  window: number;
}

export interface RollingMedianResult {
  /** Median of historical usd values, or null when no samples. */
  median: number | null;
  /** Number of historical reports actually used (≤ window). */
  sampleCount: number;
  /** usd values that fed into the median, newest-first. For audit. */
  sampleValues: number[];
}

// Walker-side cost-regression signal (similar in spirit to
// `SliceCostCeilingSignal`). Returned by a new
// `checkCostRegression(repoPath, config)` in
// `src/scripts/lib/cost-regression.mts`. Null when fail-open
// (missing aggregate report, single-report fallback, current usd null,
// or current ≤ threshold).
export interface CostRegressionSignal {
  triggered: true;
  /** Current slice aggregate spend in USD. */
  currentUsd: number;
  /** Rolling median of the historical baseline in USD. */
  medianUsd: number;
  /** Effective threshold = medianUsd × multiplier. */
  thresholdUsd: number;
  /** Multiplier from config (default 3.0). */
  multiplier: number;
  /** Window from config (default 5). */
  window: number;
  /** Reports actually used for the median (≤ window). */
  sampleCount: number;
  /** Current slice id (e.g. "SLICE-52") if known. */
  slice: string | null;
  /** Path to the current aggregate report (audit). */
  currentReportPath: string;
}

// Badge payload appended to `stop-conditions.snapshot.costRegression`
// and rendered by brief-me. Field names mirror the snake_case style
// already in `applyCostAlertSignal`'s reason strings for consistency.
export interface CostRegressionBadge {
  kind: "cost_regression_stop";
  current_usd: number;
  median_usd: number;
  multiplier: number;
  threshold_usd: number;
  window: number;
  sample_count: number;
  slice: string | null;
  report_path: string;
}
```

## API Contracts

### Loader signature (new)

Module: `src/scripts/lib/cost-alert-loader.mts` (extend existing file —
do NOT create a parallel module; keep cost loaders co-located).

```ts
/**
 * Load aggregate cost reports from `.claude/artifacts/crew/cost/`
 * filtered to filenames matching `*-cost-report-aggregate-*.md` AND
 * frontmatter `aggregate_all: true` (defense-in-depth — filename and
 * frontmatter must both indicate aggregate).
 *
 * Sorted newest-first by filename (ISO-8601 timestamp prefix).
 * Returns `{ current: null, reports: [], dir }` when the directory
 * does not exist or no reports match — callers MUST fail-open.
 *
 * @param repoPath  Absolute repo root.
 * @param opts.limit Max reports to return (default 10).
 */
export async function loadAggregateCostReport(
  repoPath: string,
  opts?: { limit?: number }
): Promise<AggregateCostReportSet>;
```

### Median helper signature (new)

Module: `src/scripts/lib/cost-alert-loader.mts` (or a sibling pure-fn
module if the file approaches the 200-line skill cap; co-locating is
preferred so all cost-loader logic stays in one place).

```ts
/**
 * Compute rolling median of `reports.slice(1)` (excludes current).
 * Returns `{ median: null, sampleCount: 0 }` when no historical reports
 * are present — single-report fallback.
 *
 * Pure function. Suitable for unit testing without filesystem I/O.
 */
export function computeRollingMedian(
  input: RollingMedianInput
): RollingMedianResult;
```

### Regression check signature (new)

Module: `src/scripts/lib/cost-regression.mts` (new file). Pattern
mirrors `src/scripts/lib/slice-cost-ceiling.mts::checkSliceCostCeiling`.

```ts
/**
 * Fail-open evaluator. Returns `null` when:
 *   - no aggregate reports exist,
 *   - current report has no parseable `usd`,
 *   - sampleCount === 0 (single-report fallback),
 *   - currentUsd ≤ thresholdUsd.
 *
 * Returns a `CostRegressionSignal` when currentUsd > thresholdUsd.
 * Reads window + multiplier from `config.loop` (see fields below).
 */
export async function checkCostRegression(
  repoPath: string,
  config: Record<string, any> | null
): Promise<CostRegressionSignal | null>;
```

### `.claude/loop.json` field additions

Added to the `loop` object alongside `costStopThreshold` /
`costSliceCeiling`. Both fields are OPTIONAL — sensible defaults match
the ACs.

```jsonc
{
  "loop": {
    // ... existing fields ...

    // SLICE-52: rolling-median window size for the aggregate cost gate.
    // Median is computed over the last N aggregate cost reports
    // EXCLUDING the current slice. Falls back to all available when
    // fewer than N exist. Single-report state is fail-open.
    "costRegressionWindow": 5,         // default 5; must be integer > 0

    // SLICE-52: multiplier applied to the rolling median to derive the
    // halt threshold. Walker halts when currentUsd > median × multiplier.
    // Default 3.0 catches the FEAT-055 motivating case (~$1,550 vs
    // ~$81 median = 19× baseline) without flagging healthy 1.5–2×
    // outliers. Must be a positive finite number.
    "costRegressionMultiplier": 3.0
  }
}
```

Validation rules (enforced by the loader, not a schema layer):

- `costRegressionWindow` — if missing / non-integer / ≤ 0, fall back to `5`.
- `costRegressionMultiplier` — if missing / non-finite / ≤ 0, fall back to `3.0`.
- Both follow the same defensive pattern as `costSliceCeiling` in
  `slice-cost-ceiling.mts::checkSliceCostCeiling`.

### Stop-check CLI surface (existing — extended)

`node scripts/loop.mjs stop-check` already returns the
`checkStopConditions` JSON verdict. SLICE-52 adds:

- `reasons[]` — appends one entry of the form:
  `cost_regression_stop: current $<X.XX> > median $<Y.YY> × <multiplier> (threshold $<Z.ZZ>, window <N>, sample <M>)`
- `blockers[]` — appends `{ category: "cost-regression", message, suggestion }`.
- `suggestions[]` — appends one human-readable line referencing
  `loop.costRegressionMultiplier` / `loop.costRegressionWindow`.
- `snapshot.costRegression` — `null` when no signal, or
  `{ triggered: true, currentUsd, medianUsd, thresholdUsd, multiplier, window, sampleCount }`.

No new CLI flags; gate is on-by-default and config-tuned (matches the
fail-open semantics of `slice-cost-ceiling`).

## Event Schemas

### `cost_regression_stop` badge

Emitted by `checkStopConditions` (via the new
`applyCostRegressionSignal` helper in `stop-conditions.mts`, parallel
to `applySliceCostCeilingSignal`) whenever `checkCostRegression`
returns a non-null signal.

**Emission point.** One badge per `checkStopConditions` invocation —
the walker loop reads the same verdict via `node scripts/loop.mjs
stop-check`, so a single source of truth covers both gates. The badge
is NOT persisted to a separate file; it lives in the in-memory verdict
returned by `checkStopConditions` and rendered downstream.

**Fields** (mirrors `CostRegressionBadge` above; rendered into the
`reasons[]` string and into `snapshot.costRegression`):

| Field | Type | Source |
|---|---|---|
| `current_usd` | number | latest aggregate report `usd` frontmatter |
| `median_usd` | number | `computeRollingMedian().median` |
| `multiplier` | number | `config.loop.costRegressionMultiplier` (default 3.0) |
| `threshold_usd` | number | `median_usd × multiplier` |
| `window` | number | `config.loop.costRegressionWindow` (default 5) |
| `sample_count` | number | `computeRollingMedian().sampleCount` |
| `slice` | string \| null | current report `slice` frontmatter |
| `report_path` | string | absolute path to current aggregate report |

**Readers.**

1. `node scripts/loop.mjs stop-check` — folds the badge into
   `reasons[]` (string form) and `snapshot.costRegression` (structured
   form). Existing walker loop already polls stop-check and halts when
   `shouldStop === true`, so no walker change is needed beyond
   surfacing the new reason.
2. Crew `brief-me` Autonomous Loop section — renders the badge under
   "Blocked / Missing" when triggered. Crew brief-me already consumes
   `checkStopConditions` output (see `stop-conditions.mts` exported
   shape); SLICE-52 only adds the new `costRegression` snapshot field,
   which brief-me must render alongside the existing `costAlerts` and
   `sliceCostCeiling` rows.

**Not emitted** (fail-open list — these states do NOT produce a badge):

- aggregate cost directory missing or empty
- only one aggregate report exists (single-report fallback)
- current report's `usd` frontmatter missing or unparseable
- `currentUsd ≤ thresholdUsd` (median × multiplier)
- `sampleCount === 0`

## Data Contracts

### Source files consumed

Glob: `<repo>/.claude/artifacts/crew/cost/*-cost-report-aggregate-*.md`

Required frontmatter shape (already written by crew's cost-report
generator — this slice does NOT modify crew):

```yaml
---
kind: cost-report
slice: SLICE-51                # used → AggregateCostReport.slice
run_title: "..."               # used → AggregateCostReport.runTitle
usd: 104.4572                  # used → AggregateCostReport.usd (REQUIRED for median)
duration_ms: 1349606
total_tokens: 57016455
cache_hit_pct: 99.6
validation_decision: passed
source_project: aggregate
aggregate_all: true            # REQUIRED — used as defense-in-depth filter
source_count: 2                # used → AggregateCostReport.sourceCount
created_at: 2026-06-05T14:57:01.969Z   # used → AggregateCostReport.createdAt
---
```

**Filename filter.** Loader matches files where:

1. Filename matches `/-cost-report-aggregate-.+\.md$/`.
2. Frontmatter `aggregate_all === true` (or `"true"`).

Both must hold. Filename-only or frontmatter-only matches are
discarded silently (consistent with `loadCostAdviseFiles` and
`readLatestPerSliceCostReport` defensive parsing).

**Sort order.** `entries.sort((a, b) => b.name.localeCompare(a.name))` —
filenames begin with `YYYYMMDDTHHMMSSZ-` which sorts lexicographically
into chronological order. `reports[0]` is always the most recent.

### Storage / migration

- No new storage. No schema migration. No on-disk artifact written by
  the new code path.
- The `loop.json` field additions are additive; missing fields fall
  back to defaults (5 / 3.0). Existing `.claude/loop.json` files
  continue to work without edit.
- `loop.costStopThreshold` (existing per-session high-severity gate)
  is NOT removed — it remains the per-session floor; the new gate is
  additional (matches SLICE-52 "Out of scope" line).
- `loop.costSliceCeiling` (existing absolute per-slice ceiling) is
  NOT removed; the new gate is a relative regression gate that fires
  earlier in regimes where the absolute ceiling is configured high.

### Existing dependencies that this gate relies on

| Dependency | Purpose | Path |
|---|---|---|
| Aggregate cost reports | Source of truth for spend-per-slice | `.claude/artifacts/crew/cost/*-cost-report-aggregate-*.md` |
| `parseFrontmatter` helper | Shared YAML-ish parser pattern | re-use logic from `slice-cost-ceiling.mts` (extract into `cost-alert-loader.mts` if duplication grows) |
| `checkStopConditions` | Aggregates all stop signals | `src/scripts/lib/stop-conditions.mts` |
| Crew `brief-me` Autonomous Loop renderer | Reads `snapshot.costRegression` | crew plugin (external — render contract is "add row if non-null") |

### Test fixture contracts (for AC-7)

Unit tests (likely `src/tests/cost-regression.test.mts`) MUST exercise
`computeRollingMedian` and `checkCostRegression` against fixture
directories. Fixture report contents need only the four
median-relevant frontmatter fields:

```yaml
---
slice: SLICE-XX
usd: <number>
aggregate_all: true
created_at: <iso8601>
---
```

Required test cases (one fixture set per case):

- 5 historical + 1 current report — exact median over 5
- 3 historical + 1 current — fallback to median over 3
- 1 historical + 1 current — median over 1 (degenerate but valid)
- 0 historical + 1 current — single-report fallback returns null
- currentUsd === medianUsd × multiplier exactly — does NOT halt (>, not ≥)
- currentUsd === medianUsd × multiplier + 0.01 — halts
- currentUsd === medianUsd × multiplier - 0.01 — does NOT halt
- aggregate directory missing — returns null (fail-open)
- current report `usd` frontmatter missing — returns null (fail-open)
