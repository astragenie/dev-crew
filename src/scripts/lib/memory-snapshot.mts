import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { listBacklog, filterBacklog, comparePickOrder } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { snapshotPath as resolveSnapshotPath } from "./paths.mjs";
import { summarizePauseRate, type PauseRateSummary } from "./pause-telemetry.mjs";

// FEAT-212: window size for the "Pause rate (last N dispatches)" bullet in
// the Loop telemetry section. Mirrors the cost-trajectory default window
// (loadCostReportUSDValues limit = 20) for a consistent "recent N" feel.
const PAUSE_RATE_WINDOW = 20;

// Writes a single durable snapshot of loop state to
// docs/loop-snapshot.md. Designed to be `@`-referenced from
// CLAUDE.md or read by crew brief-me as cross-session memory. Regenerate
// after material state changes (slice complete, release cut, spec
// satisfied). Pure aggregation — no LLM.

function avg(values: unknown[]) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3));
}

// Parse frontmatter from markdown to extract metadata.
function parseFrontmatter(text: string) {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm: Record<string, unknown> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([\w_]+):\s*(.*)$/);
    if (!m) continue;
    const raw = (m[2] ?? "").trim();
    // Try to parse as number (for usd field)
    const v: string | number = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    fm[m[1]!] = v;
  }
  return { fm, body };
}

type CostReportFile = { dir: string; name: string };
type CostReportEntry = { name: string; fm: Record<string, any> };

// Locates the most recent `limit` cost-report files across the current
// (cost/) and legacy (runs/) artifact directories, newest first.
async function listCostReportFiles(repoPath: string, limit: number): Promise<CostReportFile[]> {
  const costDirParts = [".claude", "artifacts", "crew", "cost"];
  const legacyDirParts = [".claude", "artifacts", "crew", "runs"];
  const dirs = [path.join(repoPath, ...costDirParts), path.join(repoPath, ...legacyDirParts)];

  const files: CostReportFile[] = [];
  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (/-cost-report-.+\.md$/.test(e)) files.push({ dir, name: e });
    }
  }

  // Sort by basename desc (newest first via timestamp prefix)
  files.sort((a, b) => b.name.localeCompare(a.name));
  return files.slice(0, limit);
}

// Reads + parses each candidate file's frontmatter. Unreadable files are
// skipped silently (best-effort, matches the original behavior).
async function loadCostReportEntries(files: CostReportFile[]): Promise<CostReportEntry[]> {
  const loaded: CostReportEntry[] = [];
  for (const { dir, name } of files) {
    const f = path.join(dir, name);
    try {
      const text = await fs.readFile(f, "utf8");
      const { fm } = parseFrontmatter(text);
      if (fm) loaded.push({ name, fm });
    } catch {
      /* skip unreadable files silently */
    }
  }
  return loaded;
}

// FEAT-204: resolves one cost-report entry's contribution to the cost
// trajectory average, applying wave-mode shared-session dedup. A report
// carrying `shared_with` is a reference to a sibling FEAT's report for the
// same crew session (see slice-linker/cost-report-dedup.mts):
//   - returns null when the primary it points at (`shared_session_of`) is
//     also present in this window -- the primary already counts it (AC-2).
//   - returns its own usd, with a distinguishing console.warn, when the
//     primary has rotated out of the top-N window -- orphaned fallback
//     (AC-3).
//   - returns its own usd unconditionally for a plain (non-reference)
//     report.
function resolveCostReportUsd(entry: CostReportEntry, presentNames: Set<string>): number | null {
  const { name, fm } = entry;
  if (typeof fm.usd !== "number") return null;

  const sharedWith = typeof fm.shared_with === "string" ? fm.shared_with : null;
  if (!sharedWith) return fm.usd;

  const sharedSessionOf = typeof fm.shared_session_of === "string" ? fm.shared_session_of : null;
  if (sharedSessionOf && presentNames.has(sharedSessionOf)) {
    return null; // AC-2: primary present in window -- skip the duplicate.
  }

  // AC-3: orphaned reference -- fall back to this report's own usd, logged
  // distinctly from the true-duplicate skip above.
  console.warn(
    `[cost-dedup] orphaned shared_with reference ${name} -> ${sharedSessionOf ?? sharedWith}: ` +
      "primary report not in window, counting own usd as fallback"
  );
  return fm.usd;
}

// Load cost report USD values from the most recent cost reports. Returns
// an array of USD values for cost trajectory calculation, deduped per
// FEAT-204 (see resolveCostReportUsd for the dedup contract).
export async function loadCostReportUSDValues(repoPath: string, limit = 20): Promise<number[]> {
  const files = await listCostReportFiles(repoPath, limit);
  const loaded = await loadCostReportEntries(files);
  const presentNames = new Set(loaded.map((entry) => entry.name));

  const usdValues: number[] = [];
  for (const entry of loaded) {
    const usd = resolveCostReportUsd(entry, presentNames);
    if (usd !== null) usdValues.push(usd);
  }
  return usdValues;
}

const AUTO_GENERATED_HEADER =
  "<!-- AUTO-GENERATED — do not edit by hand. Regenerate: bun src/scripts/loop.mts snapshot-memory --repo <path> -->";

function renderSnapshotHeader(today: string) {
  return [
    AUTO_GENERATED_HEADER,
    `# Autonomous Loop snapshot — ${today}`,
    "",
    "_Generated by `/loop:snapshot-memory`. Regenerate after material state changes._",
    ""
  ];
}

function renderBacklogState(backlog: Record<string, any>[], inFlight: Record<string, any>[]) {
  return [
    "## Backlog state",
    "",
    `- Pending: ${filterBacklog(backlog, { status: "pending" }).length}`,
    `- Triaged: ${filterBacklog(backlog, { status: "triaged" }).length}`,
    `- In-progress: ${inFlight.length}`,
    `- Done: ${filterBacklog(backlog, { status: "done" }).length}`,
    ""
  ];
}

function renderInFlight(inFlight: Record<string, any>[]) {
  if (inFlight.length === 0) return [];
  const out = ["## In-flight features", ""];
  for (const f of inFlight) {
    out.push(
      `- **${f.id}** (${f.frontmatter.priority || "?"}) — slices: ${(f.frontmatter.slices || []).join(", ") || "(none yet — orphan)"}`
    );
  }
  out.push("");
  return out;
}

function renderTriagedTop(triagedTop: Record<string, any>[]) {
  if (triagedTop.length === 0) return [];
  const out = ["## Top triaged (next to slice)", ""];
  for (const f of triagedTop) {
    out.push(
      `- **${f.id}** (${f.frontmatter.priority}) ${f.frontmatter.category ? `[${f.frontmatter.category}]` : ""} → ${f.frontmatter.target_release || "(release tbd)"}`
    );
  }
  out.push("");
  return out;
}

function renderSpecs(specs: Record<string, any>[], specsByStatus: Record<string, number>) {
  const out = [
    "## Specs",
    "",
    `- Total: ${specs.length} (draft: ${specsByStatus.draft}, approved: ${specsByStatus.approved}, decomposed: ${specsByStatus.decomposed}, satisfied: ${specsByStatus.satisfied})`
  ];
  const undecomposed = specs.filter(
    (s: Record<string, any>) =>
      s.frontmatter.status === "approved" &&
      (!s.frontmatter.derived_features || s.frontmatter.derived_features.length === 0)
  );
  if (undecomposed.length > 0) {
    out.push("- ⚠ Approved + undecomposed specs need decomposition:");
    for (const s of undecomposed) {
      out.push(`  - ${s.id} (${s.frontmatter.type}): ${s.frontmatter.title}`);
    }
  }
  out.push("");
  return out;
}

function renderGradeSignal(
  grades: Record<string, any>[],
  recentScoreAverages: Record<string, number | null>
) {
  const out = [
    "## Recent grade signal",
    "",
    `- Total grades: ${grades.length}`,
    `- Last 5 averages:`
  ];
  for (const [dim, value] of Object.entries(recentScoreAverages)) {
    const flag = value !== null && value < 0.8 ? " ⚠" : "";
    out.push(`  - ${dim}: ${value === null ? "n/a" : value}${flag}`);
  }
  out.push("");
  return out;
}

function renderDecisions(recentDecisions: Record<string, any>[]) {
  const out = ["## Recent decisions", ""];
  if (recentDecisions.length === 0) {
    out.push("_(none yet)_");
  } else {
    for (const d of recentDecisions) {
      out.push(
        `- **${d.id}** (${d.status}) — ${d.title} _(from ${d.introduced_by_slice || "n/a"})_`
      );
    }
  }
  out.push("");
  return out;
}

function renderLoopTelemetry(
  iterationStatus: Record<string, any> | null,
  costTrajectory: {
    avgUSD: number | null;
    count: number;
    lastCostAdvisorVerdict: string | null;
  },
  pauseSummary: PauseRateSummary
) {
  const out = ["## Loop telemetry", ""];

  const iterCount = iterationStatus?.count ?? 0;
  const iterCap = iterationStatus?.cap ?? 25;

  out.push(`- Iteration count: ${iterCount} / ${iterCap}`);

  if (costTrajectory.avgUSD === null) {
    out.push("- In-window cost trajectory: n/a");
  } else {
    out.push(
      `- In-window cost trajectory: $${costTrajectory.avgUSD.toFixed(3)} per iteration (${costTrajectory.count} reports)`
    );
  }

  if (costTrajectory.lastCostAdvisorVerdict === null) {
    out.push("- Last cost-advisor verdict: n/a");
  } else {
    out.push(`- Last cost-advisor verdict: ${costTrajectory.lastCostAdvisorVerdict}`);
  }

  // FEAT-212: omit entirely when no dispatch-outcome telemetry has been
  // recorded yet (pause-events.jsonl absent or empty) -- never render a
  // misleading "0%" for a rate with no denominator, and never error.
  if (pauseSummary.dispatches > 0) {
    out.push(
      `- Pause rate (last ${pauseSummary.dispatches} dispatches): ${(pauseSummary.pauseRate * 100).toFixed(1)}%`
    );
  }

  out.push("");
  return out;
}

function renderUsageFooter() {
  return [
    "## How to use this file",
    "",
    "- Reference from `CLAUDE.md` via `@.claude/artifacts/loop/loop-snapshot.md` so agents pick it up at session start.",
    "- Regenerate via `/loop:snapshot-memory` whenever the picture shifts materially.",
    ""
  ];
}

async function collectSnapshotData(
  repoPath: string,
  config: Record<string, any> | null
): Promise<{
  backlog: Record<string, any>[];
  specs: Record<string, any>[];
  grades: Record<string, any>[];
  decisions: Record<string, any>[];
  iterationStatus: Record<string, any> | null;
  costReportUSDValues: number[];
  pauseSummary: PauseRateSummary;
}> {
  const [backlog, specs, grades, decisions, iterationStatus, costReportUSDValues, pauseSummary] =
    await Promise.all([
      listBacklog(repoPath, { config }),
      listSpecs(repoPath, { config }),
      listGrades(repoPath, { config }),
      listDecisions(repoPath, { config }),
      getIterationStatus(repoPath),
      loadCostReportUSDValues(repoPath),
      summarizePauseRate(repoPath, PAUSE_RATE_WINDOW)
    ]);
  return {
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportUSDValues,
    pauseSummary
  };
}

function buildSnapshotLines(
  data: Awaited<ReturnType<typeof collectSnapshotData>>,
  today: string
): string[] {
  const { backlog, specs, grades, decisions, iterationStatus, costReportUSDValues, pauseSummary } =
    data;
  const inFlight = filterBacklog(backlog, { status: "in-progress" });
  // Exclude deferred items from "next to slice" — mirrors the auto walker's
  // pre-branch filter (walker-gates.mts: `entry.frontmatter.deferred === true`
  // → skip). Deferred FEATs are still counted in Triaged: N (renderBacklogState);
  // only the next-to-slice candidate list drops them so the two views agree.
  const triagedTop = filterBacklog(backlog, { status: "triaged" })
    .filter((f: Record<string, any>) => f.frontmatter.deferred !== true)
    .sort(comparePickOrder)
    .slice(0, 5);
  const specsByStatus = {
    draft: specs.filter((s: Record<string, any>) => s.frontmatter.status === "draft").length,
    approved: specs.filter((s: Record<string, any>) => s.frontmatter.status === "approved").length,
    decomposed: specs.filter((s: Record<string, any>) => s.frontmatter.status === "decomposed")
      .length,
    satisfied: specs.filter((s: Record<string, any>) => s.frontmatter.status === "satisfied").length
  };
  const recentGrades = grades.slice(-5);
  const recentScoreAverages: Record<string, number | null> = {};
  for (const dim of SCORE_DIMENSIONS) {
    recentScoreAverages[dim] = avg(recentGrades.map((g: Record<string, any>) => g.scores?.[dim]));
  }
  const recentDecisions = decisions.slice(-5);
  const costTrajectory = {
    avgUSD: avg(costReportUSDValues),
    count: costReportUSDValues.length,
    lastCostAdvisorVerdict: null as string | null
  };
  return [
    ...renderSnapshotHeader(today),
    ...renderBacklogState(backlog, inFlight),
    ...renderInFlight(inFlight),
    ...renderTriagedTop(triagedTop),
    ...renderSpecs(specs, specsByStatus),
    ...renderGradeSignal(grades, recentScoreAverages),
    ...renderDecisions(recentDecisions),
    ...renderLoopTelemetry(iterationStatus, costTrajectory, pauseSummary),
    ...renderUsageFooter()
  ];
}

export async function generateSnapshotContent(
  repoPath: string,
  { config = null, today }: { config?: Record<string, any> | null; today?: string } = {}
): Promise<string> {
  const data = await collectSnapshotData(repoPath, config);
  const date = today ?? new Date().toISOString().slice(0, 10);
  return buildSnapshotLines(data, date).join("\n");
}

export async function writeMemorySnapshot(
  repoPath: string,
  { config = null }: { config?: Record<string, any> | null } = {}
) {
  const data = await collectSnapshotData(repoPath, config);
  const today = new Date().toISOString().slice(0, 10);
  const lines = buildSnapshotLines(data, today);

  const target = resolveSnapshotPath(repoPath, config);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, lines.join("\n"));
  return {
    artifactPath: target,
    counts: {
      backlog: data.backlog.length,
      specs: data.specs.length,
      grades: data.grades.length,
      decisions: data.decisions.length,
      costReports: data.costReportUSDValues.length
    }
  };
}

type WaveIndexEntry = {
  waveId: string;
  size: number;
  passCount: number;
  failCount: number;
  postMergeTest: "PASS" | "FAIL" | "skipped";
  durationMs: number;
};

export function renderWaveTelemetry(repoRoot: string): string {
  const indexPath = path.join(repoRoot, ".claude/artifacts/loop/waves/index.json");
  if (!existsSync(indexPath)) return "";
  const idx = JSON.parse(readFileSync(indexPath, "utf8")) as {
    entries: WaveIndexEntry[];
  };
  if (idx.entries.length === 0) return "";

  const last = idx.entries[idx.entries.length - 1]!;
  const last10 = idx.entries.slice(-10);
  const sumPass = last10.reduce((s, e) => s + e.passCount, 0);
  const sumSize = last10.reduce((s, e) => s + e.size, 0);
  const passRate = sumPass / Math.max(1, sumSize);

  return [
    "",
    "## Wave telemetry",
    "",
    `- Last wave: ${last.waveId} (size=${last.size}, PASS=${last.passCount}, FAIL=${last.failCount})`,
    `- Recent ${last10.length} waves: avg PASS rate ${passRate.toFixed(2)}`,
    ""
  ].join("\n");
}
