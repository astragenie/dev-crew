// FEAT-204: wave-mode cost report deduplication.
//
// Wave mode dispatches N sibling FEATs into worktrees that share one
// underlying crew session. Each sibling's slice-close independently
// invokes `crew cost-slice`, which re-scans the session and writes its
// own FULL cost-report file -- so a shared session gets reported N times
// at full price instead of once. Evidence (retrospective 2026-07-02,
// SLICE-115): FEAT-180 and FEAT-165 both closed against the same crew
// session ~2s apart and each wrote a near-identical $3.846 / 7,909,088-
// token report, inflating the snapshot's per-iteration cost trajectory
// ~5x.
//
// This module runs a best-effort post-write sweep over
// `.claude/artifacts/crew/cost/`: reports that share a session
// fingerprint (source_project + total_tokens) within a short time
// window are collapsed to one primary (earliest `created_at`) plus N
// lightweight `shared_with` references. References keep their own `usd`
// value so `memory-snapshot.mts::loadCostReportUSDValues` can fall back
// to it if the primary later rotates out of the top-N window (AC-3) --
// only the bulky per-tool/per-model body sections are dropped.

import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";

// Two cost-slice invocations against the same underlying crew session
// land within seconds of each other in practice (sibling slice-closes in
// one wave). 10 minutes is generous headroom without risking collisions
// across genuinely different sessions that happen to share a token count.
export const SESSION_DEDUP_WINDOW_MS = 10 * 60 * 1000;

const COST_REPORT_NAME_RE = /-cost-report-.+\.md$/;

type LoadedCostReport = {
  file: string;
  name: string;
  fm: Record<string, any>;
  createdAtMs: number;
  key: string;
};

// Session fingerprint: same source project scanning the same total token
// count is the same underlying crew session (SLICE-115 evidence: two
// scans 2s apart reported byte-identical total_tokens/cache_hit_pct even
// though duration_ms/created_at drifted a few hundred ms from wall-clock
// scan jitter).
function costReportSessionKey(fm: Record<string, any>): string | null {
  const project = typeof fm.source_project === "string" ? fm.source_project : null;
  const tokens = typeof fm.total_tokens === "number" ? fm.total_tokens : null;
  if (!project || tokens === null) return null;
  return `${project}::${tokens}`;
}

async function loadCandidateReports(costDir: string): Promise<LoadedCostReport[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(costDir);
  } catch {
    return [];
  }
  const loaded: LoadedCostReport[] = [];
  for (const name of entries) {
    if (!COST_REPORT_NAME_RE.test(name)) continue;
    const file = path.join(costDir, name);
    let text: string;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const { frontmatter: fm } = parseFrontmatter(text);
    // Never re-chain an existing reference into a new group -- it has
    // already been collapsed and its `usd` is a deliberate fallback copy,
    // not a fresh duplicate.
    if (typeof fm.shared_with === "string" && fm.shared_with.length > 0) continue;
    const key = costReportSessionKey(fm);
    if (!key) continue;
    const createdAtMs = typeof fm.created_at === "string" ? Date.parse(fm.created_at) : NaN;
    if (!Number.isFinite(createdAtMs)) continue;
    loaded.push({ file, name, fm, createdAtMs, key });
  }
  return loaded;
}

function groupBySessionKey(reports: LoadedCostReport[]): Map<string, LoadedCostReport[]> {
  const groups = new Map<string, LoadedCostReport[]>();
  for (const report of reports) {
    const arr = groups.get(report.key) ?? [];
    arr.push(report);
    groups.set(report.key, arr);
  }
  return groups;
}

// Rewrites a duplicate report in place: keeps its own frontmatter (so
// `usd` survives as an orphaned-reference fallback per AC-3) but adds
// `shared_with` / `shared_session_of`, and replaces the bulky body
// (token/tool/model breakdown tables) with a short pointer note -- this
// is the "instead of duplicating the full ... payload" half of AC-1.
async function rewriteAsSharedReference(
  duplicate: LoadedCostReport,
  primary: LoadedCostReport
): Promise<void> {
  const primaryBasename = path.basename(primary.file);
  const refFm = {
    ...duplicate.fm,
    shared_with: primary.fm.feature || primaryBasename.replace(/\.md$/, ""),
    shared_session_of: primaryBasename
  };
  const body = [
    `# Cost Report: ${duplicate.fm.run_title || duplicate.fm.feature || "shared session"} (shared session reference)`,
    "",
    `This slice closed inside the same crew session as \`${primaryBasename}\`.`,
    "Spend is attributed to that primary report so cost-trajectory averaging does not",
    "double-count it. This file's own `usd` field is kept only as a fallback in case the",
    "primary report rotates out of the recent top-N window (FEAT-204).",
    ""
  ].join("\n");
  await fs.writeFile(duplicate.file, serializeFrontmatter(refFm, body));
}

/**
 * Best-effort dedup sweep over a cost-report directory. Groups reports by
 * session fingerprint, keeps the earliest `created_at` in each group as
 * the primary, and collapses any later group members created within
 * `windowMs` of the primary into `shared_with` references.
 *
 * Idempotent: reports that already carry `shared_with` are excluded from
 * candidacy, so re-running the sweep on an already-deduped directory is a
 * no-op.
 */
export async function dedupeCostReportsInDir(
  costDir: string,
  { windowMs = SESSION_DEDUP_WINDOW_MS }: { windowMs?: number } = {}
): Promise<{ groups: number; deduped: string[] }> {
  const loaded = await loadCandidateReports(costDir);
  const groups = groupBySessionKey(loaded);

  const deduped: string[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => a.createdAtMs - b.createdAtMs);
    const primary = sorted[0]!;
    for (const dup of sorted.slice(1)) {
      if (dup.createdAtMs - primary.createdAtMs > windowMs) continue;
      await rewriteAsSharedReference(dup, primary);
      deduped.push(dup.name);
    }
  }
  return { groups: groups.size, deduped };
}
