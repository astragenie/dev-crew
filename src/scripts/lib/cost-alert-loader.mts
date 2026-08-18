import fs from "node:fs/promises";
import path from "node:path";

const COST_INSIGHTS_DIR_PARTS = [".claude", "artifacts", "crew", "cost-insights"];
const COST_DIR_PARTS = [".claude", "artifacts", "crew", "cost"];

// Module-scope regex constants for hot-path functions (Win 6 — perf).
const CRLF_SPLIT_RE = /\r?\n/;
const FM_KEY_VALUE_RE = /^([\w_]+):\s*(.*)$/;
const HIGH_SEVERITY_HEADING_RE = /^###\s+\[HIGH\]\s+([\w-]+)/i;
const COST_ADVISE_FILE_RE = /-cost-advise-.+\.md$/;
const COST_REPORT_AGGREGATE_FILE_RE = /-cost-report-aggregate-.+\.md$/;

// ---------------------------------------------------------------------------
// Types — Aggregate cost reports (SLICE-52)
// ---------------------------------------------------------------------------

/** Single parsed aggregate cost report. */
export interface AggregateCostReport {
  /** Absolute path to the source markdown file. */
  path: string;
  /** Frontmatter `slice` value. Null if missing. */
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
  /**
   * Frontmatter `per_project_usd` map: project-id → usd slice.
   * Null when the frontmatter omits the field (back-compat path) or
   * when every entry was unparseable. Per FEAT-166 / SLICE-91 — the
   * upstream hero-crew aggregate writer emits this map so the loop
   * regression gate can filter by `config.loop.costProject` instead
   * of tripping on cross-project aggregate inflation.
   */
  perProjectUsd: Record<string, number> | null;
  /**
   * Frontmatter `effort_points`: Fibonacci sizing of the slice's parent FEAT.
   * Null when the cost-report writer omits it (current production state,
   * pre-FEAT-167-AC-4 wiring). When non-null and `costRegressionMode` is
   * `"expected_usd"`, it feeds the `expectedUsd = effortPoints × medianUsdPerPoint`
   * threshold instead of the rolling median. FEAT-167 / SLICE-101.
   */
  effortPoints: number | null;
}

/** Return shape of `loadAggregateCostReport`. */
export interface AggregateCostReportSet {
  /** Most recent aggregate report (reports[0]) or null when none exist. */
  current: AggregateCostReport | null;
  /** All matched reports newest-first, up to opts.limit. */
  reports: AggregateCostReport[];
  /** Directory scanned (absolute path). */
  dir: string;
}

/** Input for rolling-median computation. */
export interface RollingMedianInput {
  /** Reports newest-first. reports[0] is the current slice and is excluded. */
  reports: AggregateCostReport[];
  /** Window size (e.g. 5). Default 5. */
  window: number;
}

/** Result of rolling-median computation. */
export interface RollingMedianResult {
  /** Median of historical usd values, or null when no samples. */
  median: number | null;
  /** Number of historical reports actually used (≤ window). */
  sampleCount: number;
  /** usd values that fed into the median, newest-first. For audit. */
  sampleValues: number[];
}

async function parseFrontmatter(text: string) {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm: Record<string, string> = {};
  for (const line of block.split(CRLF_SPLIT_RE)) {
    const m = line.match(FM_KEY_VALUE_RE);
    if (!m) continue;
    let v = m[2]!.trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        /* keep raw string on parse failure */
      }
    }
    fm[m[1]!] = v;
  }
  return { fm, body };
}

function extractHighSeverityFindings(body: string) {
  const findings: any[] = [];
  const lines = body.split(CRLF_SPLIT_RE);
  for (const line of lines) {
    const m = line.match(HIGH_SEVERITY_HEADING_RE);
    if (m) {
      findings.push({ id: m[1], severity: "high" });
    }
  }
  return findings;
}

async function loadCostAdviseFiles(repoPath: string, limit = 20) {
  const dir = path.join(repoPath, ...COST_INSIGHTS_DIR_PARTS);
  const files: any[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  for (const e of entries) {
    if (COST_ADVISE_FILE_RE.test(e)) files.push({ dir, name: e });
  }
  files.sort((a, b) => b.name.localeCompare(a.name));
  const top = files.slice(0, limit);
  const results: any[] = [];
  for (const { dir: d, name } of top) {
    const f = path.join(d, name);
    try {
      const text = await fs.readFile(f, "utf8");
      const { fm, body } = await parseFrontmatter(text);
      results.push({ path: f, fm: fm || {}, body });
    } catch {
      /* skip unreadable / malformed files silently */
    }
  }
  return results;
}

export async function getHighSeverityCostAlerts(repoPath: string, windowSlices = 3) {
  const adviseFiles = await loadCostAdviseFiles(repoPath, windowSlices);
  const alerts: any[] = [];
  for (const file of adviseFiles) {
    const findings = extractHighSeverityFindings(file.body);
    for (const f of findings) {
      alerts.push({
        id: f.id,
        severity: f.severity,
        reportPath: file.path,
        slice: file.fm.run_title || file.fm.slice || null
      });
    }
  }
  return alerts;
}

// Count high-severity cost alerts across recent reports.
// Used by checkStopConditions to decide whether to halt.
export async function countHighSeverityCostAlerts(repoPath: string, windowSlices = 3) {
  const alerts = await getHighSeverityCostAlerts(repoPath, windowSlices);
  return alerts.filter((a) => a.severity === "high").length;
}

// ---------------------------------------------------------------------------
// Aggregate cost report loader (SLICE-52)
// ---------------------------------------------------------------------------

function parseUsd(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseSourceCount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isInteger(raw) ? raw : null;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Indented child line under a YAML map key — captures `<key>: <value>`
// where the key is permissive (allows `-`, `.`, `_` so project ids like
// `C--work-mega-loop` parse) and the value is the rest of the line.
const NESTED_KEY_VALUE_RE = /^\s+([\w.\-_]+):\s*(.*)$/;

/**
 * Parse a `per_project_usd:` nested YAML map out of a raw frontmatter
 * block. The map appears as an indented child block:
 *
 *   per_project_usd:
 *     C--work-mega-loop: 16.0366
 *     C--work-mega-hero-crew: 25.3521
 *
 * Defensive: non-numeric values are skipped (not thrown). Returns null
 * when the field is absent or every entry was unparseable. Used by
 * `parseAggregateReportFile` to populate `AggregateCostReport.perProjectUsd`
 * (FEAT-166 / SLICE-91).
 */
function parsePerProjectUsd(block: string): Record<string, number> | null {
  const lines = block.split(CRLF_SPLIT_RE);
  let inMap = false;
  const map: Record<string, number> = {};
  let found = false;
  for (const line of lines) {
    if (!inMap) {
      // Match a top-level `per_project_usd:` header with no inline value.
      if (/^per_project_usd:\s*$/.test(line)) {
        inMap = true;
      }
      continue;
    }
    // Top-level key (no indent + `key:`) ends the nested block.
    if (/^[\w_]+:/.test(line)) break;
    const m = line.match(NESTED_KEY_VALUE_RE);
    if (!m) continue;
    const key = m[1]!;
    const rawValue = m[2]!.trim();
    const n = Number(rawValue);
    if (Number.isFinite(n)) {
      map[key] = n;
      found = true;
    }
  }
  return found ? map : null;
}

/**
 * Parse a single markdown file into an AggregateCostReport.
 * Returns null when the file cannot be read or frontmatter is missing/invalid.
 */
async function parseAggregateReportFile(filepath: string): Promise<AggregateCostReport | null> {
  let text: string;
  try {
    text = await fs.readFile(filepath, "utf8");
  } catch {
    return null;
  }
  // Re-use the inline parseFrontmatter pattern (same shape as slice-cost-ceiling.mts)
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const block = text.slice(3, end).trim();
  const fm: Record<string, any> = {};
  for (const line of block.split(CRLF_SPLIT_RE)) {
    const m = line.match(FM_KEY_VALUE_RE);
    if (!m) continue;
    let v: any = m[2]!.trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        /* keep raw string */
      }
    }
    fm[m[1]!] = v;
  }

  // Defense-in-depth: frontmatter must declare aggregate_all === true
  if (fm.aggregate_all !== true && fm.aggregate_all !== "true") return null;

  return {
    path: filepath,
    slice: typeof fm.slice === "string" ? fm.slice : null,
    runTitle: typeof fm.run_title === "string" ? fm.run_title : null,
    usd: parseUsd(fm.usd),
    createdAt: typeof fm.created_at === "string" ? fm.created_at : null,
    aggregateAll: true,
    sourceCount: parseSourceCount(fm.source_count),
    perProjectUsd: parsePerProjectUsd(block),
    effortPoints: parseEffortPoints(fm.effort_points)
  };
}

function parseEffortPoints(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n !== 1 && n !== 2 && n !== 3 && n !== 5 && n !== 8 && n !== 13) return null;
  return n;
}

/**
 * Load aggregate cost reports from `.claude/artifacts/crew/cost/`.
 * Filename must match `/-cost-report-aggregate-.+\.md$/` and frontmatter
 * must declare `aggregate_all: true`. Sorted newest-first by filename.
 * Returns `{ current: null, reports: [], dir }` when the directory
 * does not exist or no reports match — callers MUST fail-open.
 */
export async function loadAggregateCostReport(
  repoPath: string,
  opts?: { limit?: number }
): Promise<AggregateCostReportSet> {
  const dir = path.join(repoPath, ...COST_DIR_PARTS);
  const limit = opts?.limit ?? 10;

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return { current: null, reports: [], dir };
  }

  const candidates = entries
    .filter((e) => COST_REPORT_AGGREGATE_FILE_RE.test(e))
    .sort((a, b) => b.localeCompare(a)) // newest-first
    .slice(0, limit);

  const reports: AggregateCostReport[] = [];
  for (const name of candidates) {
    const parsed = await parseAggregateReportFile(path.join(dir, name));
    if (parsed) reports.push(parsed);
  }

  return {
    current: reports.length > 0 ? reports[0]! : null,
    reports,
    dir
  };
}

// ---------------------------------------------------------------------------
// Rolling median helper (SLICE-52)
// ---------------------------------------------------------------------------

/** Compute the median of a sorted numeric array (ascending). Pure function. */
function medianOfSorted(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Compute rolling median of `reports.slice(1)` (excludes current at [0]).
 * Returns `{ median: null, sampleCount: 0, sampleValues: [] }` when no
 * historical reports are present — single-report fallback.
 * Pure function. Suitable for unit testing without filesystem I/O.
 */
export function computeRollingMedian(input: RollingMedianInput): RollingMedianResult {
  // reports[0] = current slice; historical = reports[1..window]
  const historicalSlice = input.reports.slice(1, 1 + input.window);
  // Keep order (newest-first) for sampleValues audit; filter nulls for math
  const sampleValues = historicalSlice
    .map((r) => r.usd)
    .filter((u): u is number => typeof u === "number" && Number.isFinite(u));

  if (sampleValues.length === 0) {
    return { median: null, sampleCount: 0, sampleValues: [] };
  }

  const sorted = [...sampleValues].sort((a, b) => a - b);
  return {
    median: medianOfSorted(sorted),
    sampleCount: sampleValues.length,
    sampleValues
  };
}
