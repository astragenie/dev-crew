import fs from "node:fs/promises";
import path from "node:path";

// Default ceiling: $75 per slice. SLICE-36 burned $400 own-project and
// triggered both `opus-overuse` and `cache-busted` high-severity alerts.
// A $75 default catches the next runaway slice early without flagging
// every healthy slice. Override via `loop.cost.ceilingUsd` in
// `.claude/loop.json` (legacy `loop.costSliceCeiling` still read, with warn).
export const DEFAULT_SLICE_COST_CEILING_USD = 75;

/**
 * Read the slice cost ceiling honoring the new nested shape
 * (`loop.cost.ceilingUsd`) first, then falling back to the legacy flat key
 * (`loop.costSliceCeiling`) with a one-line stderr warn. Run /runner:cost-setup
 * to migrate the file in-place.
 */
function resolveSliceCeilingUsd(config: Record<string, any> | null): number {
  const nested = config?.loop?.cost?.ceilingUsd;
  if (typeof nested === "number" && Number.isFinite(nested) && nested > 0) {
    return nested;
  }
  const legacy = config?.loop?.costSliceCeiling;
  if (typeof legacy === "number" && Number.isFinite(legacy) && legacy > 0) {
    process.stderr.write(
      "[loop] WARN: loop.costSliceCeiling is deprecated; rename to loop.cost.ceilingUsd " +
        "in .claude/loop.json (run /runner:cost-setup to auto-migrate).\n"
    );
    return legacy;
  }
  return DEFAULT_SLICE_COST_CEILING_USD;
}

const COST_DIR_PARTS = [".claude", "artifacts", "crew", "cost"];

async function parseFrontmatter(text: string): Promise<{
  fm: Record<string, any> | null;
  body: string;
}> {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm: Record<string, any> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([\w_]+):\s*(.*)$/);
    if (!m) continue;
    let v: any = m[2]!.trim();
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

// Read the most-recent non-aggregate cost report. Aggregate reports
// (filename contains `-cost-report-aggregate-` and frontmatter
// `aggregate_all: true`) sum spend across sibling projects and would
// produce false-positive ceiling breaches when this repo is one of
// several active workstreams. The per-slice ceiling is checked against
// own-project spend only.
export async function readLatestPerSliceCostReport(repoPath: string): Promise<{
  path: string;
  usd: number | null;
  slice: string | null;
  runTitle: string | null;
} | null> {
  const dir = path.join(repoPath, ...COST_DIR_PARTS);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const candidates = entries
    .filter((e) => /^[0-9TZ]+-cost-report-/.test(e))
    .filter((e) => !/-cost-report-aggregate-/.test(e))
    .sort((a, b) => b.localeCompare(a));
  for (const name of candidates) {
    const filepath = path.join(dir, name);
    let text: string;
    try {
      text = await fs.readFile(filepath, "utf8");
    } catch {
      continue;
    }
    const { fm } = await parseFrontmatter(text);
    if (!fm) continue;
    if (fm.aggregate_all === true || fm.aggregate_all === "true") continue;
    const usdRaw = fm.usd;
    const usd =
      typeof usdRaw === "number" ? usdRaw : typeof usdRaw === "string" ? Number(usdRaw) : null;
    return {
      path: filepath,
      usd: Number.isFinite(usd as number) ? (usd as number) : null,
      slice: fm.slice ?? null,
      runTitle: fm.run_title ?? null
    };
  }
  return null;
}

export interface SliceCostCeilingSignal {
  exceeded: boolean;
  ceilingUsd: number;
  actualUsd: number;
  slice: string | null;
  runTitle: string | null;
  reportPath: string;
}

// Check whether the latest per-slice cost report exceeded the configured
// ceiling (`loop.cost.ceilingUsd`, USD). Returns null when:
//   - no cost reports exist (fresh repo / cost capture disabled),
//   - the latest report has no parseable `usd` frontmatter field, or
//   - actual spend is at or below the ceiling.
//
// Returns a signal object when actual spend is over the ceiling, so
// the caller can append a stop reason + suggestion. The ceiling itself
// is configurable but defaults to DEFAULT_SLICE_COST_CEILING_USD ($75)
// when the field is omitted from loop.json — see DEC-008 rationale.
export async function checkSliceCostCeiling(
  repoPath: string,
  config: Record<string, any> | null
): Promise<SliceCostCeilingSignal | null> {
  const ceilingUsd = resolveSliceCeilingUsd(config);

  const latest = await readLatestPerSliceCostReport(repoPath);
  if (!latest) return null;
  if (latest.usd === null) return null;
  if (latest.usd <= ceilingUsd) return null;
  return {
    exceeded: true,
    ceilingUsd,
    actualUsd: latest.usd,
    slice: latest.slice,
    runTitle: latest.runTitle,
    reportPath: latest.path
  };
}
