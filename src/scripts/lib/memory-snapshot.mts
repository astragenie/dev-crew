import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { listBacklog, filterBacklog, comparePickOrder } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { getIterationStatus } from "./loop-iteration.mjs";
import { snapshotPath as resolveSnapshotPath } from "./paths.mjs";
import type { DispatchTreeSnapshot } from "./dispatch-tree-snapshot.mjs";
import {
  summarizePauseRate,
  evaluatePauseTelemetryStaleness,
  type PauseRateSummary,
  type PauseTelemetryStaleness
} from "./pause-telemetry.mjs";
import { fetchMemoryUsefulness, type MemoryUsefulnessSummary } from "./memory-usefulness.mjs";
import {
  readHookEnforcementSummary,
  type HookEnforcementSummary
} from "./hook-enforcement-snapshot.mjs";
import type { WaveIndexEntry } from "./wave/index-sync.mjs";

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

// Median is the headline cost statistic: the emitter can re-report one
// runaway wide-window session many times (dev-team#178 — observed 7 near-
// identical ~$3.2k reports poisoning the mean ~40x), and a median survives
// that where a mean does not.
function median(values: unknown[]) {
  const nums = values.filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  const m =
    nums.length % 2 === 1 ? (nums[mid] ?? 0) : ((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2;
  return Number(m.toFixed(3));
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

  // Aggregate rollups (`crew cost-slice --aggregate`) sum multiple source
  // projects/sessions — counting one alongside the per-slice reports it
  // subsumes double-counts every dollar. Slice-scoped reports only. The
  // local parseFrontmatter keeps booleans as strings, so match both.
  if (fm.aggregate_all === true || fm.aggregate_all === "true") return null;

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

// One slice = one cost. The emitter can re-report the same slice many times
// with a stale/wide window (dev-team#178 — observed: one slice reported 5x at
// ~$3.2k minutes apart, making the poison cluster HALF the trajectory window
// so even a median read ~$1.6k). Files iterate newest-first, so the first
// report seen per slice key wins and older re-reports are dropped. Reports
// with no identifiable slice key are never deduped.
function sliceKeyOf(fm: Record<string, any>): string | null {
  if (typeof fm.slice === "string" && fm.slice) return `slice:${fm.slice}`;
  if (typeof fm.feature === "string" && typeof fm.run_title === "string" && fm.run_title) {
    return `run:${fm.feature}|${fm.run_title}`;
  }
  return null;
}

// FEAT-269: read-only mirror of the aggregate_all check already inside
// resolveCostReportUsd (above, untouched) -- used only to COUNT exclusions
// for display below, never to decide them. The local parseFrontmatter keeps
// booleans as strings, so match both.
function isAggregateAllReport(fm: Record<string, any>): boolean {
  return fm.aggregate_all === true || fm.aggregate_all === "true";
}

// FEAT-269: like loadCostReportUSDValues, but also reports how many
// aggregate_all rollup reports were excluded from the trajectory in this
// window. Fleet audit 2026-08-02 found aggregate reports mixed unmarked into
// per-repo cost stats (runner 142/313, dev-team 81/218); resolveCostReportUsd
// already excludes them from the values array (unchanged) -- this adds a
// parallel count of that same exclusion for display, not a second filter.
async function loadCostReportStats(
  repoPath: string,
  limit = 20
): Promise<{ values: number[]; aggregateExcludedCount: number }> {
  const files = await listCostReportFiles(repoPath, limit);
  const loaded = await loadCostReportEntries(files);
  const presentNames = new Set(loaded.map((entry) => entry.name));

  const usdValues: number[] = [];
  let aggregateExcludedCount = 0;
  const seenSliceKeys = new Set<string>();
  for (const entry of loaded) {
    if (isAggregateAllReport(entry.fm)) aggregateExcludedCount += 1;
    const usd = resolveCostReportUsd(entry, presentNames);
    if (usd === null) continue;
    const key = sliceKeyOf(entry.fm);
    if (key !== null) {
      if (seenSliceKeys.has(key)) continue;
      seenSliceKeys.add(key);
    }
    usdValues.push(usd);
  }
  return { values: usdValues, aggregateExcludedCount };
}

// Load cost report USD values from the most recent cost reports. Returns
// an array of USD values for cost trajectory calculation, deduped per
// FEAT-204 (see resolveCostReportUsd) and per-slice (see sliceKeyOf).
export async function loadCostReportUSDValues(repoPath: string, limit = 20): Promise<number[]> {
  const { values } = await loadCostReportStats(repoPath, limit);
  return values;
}

const AUTO_GENERATED_HEADER =
  "<!-- AUTO-GENERATED — do not edit by hand. Regenerate: bun src/scripts/loop.mts snapshot-memory --repo <path> -->";

function renderSnapshotHeader(today: string) {
  return [
    AUTO_GENERATED_HEADER,
    `# Autonomous Loop snapshot — ${today}`,
    "",
    "_Generated by `bun src/scripts/loop.mts snapshot-memory`. Regenerate after material state changes._",
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

/** Renders the FEAT-263 Phase 3d "Memory usefulness (7d)" telemetry bullet.
 * Always renders (unlike Pause rate's conditional omission) — a `null`
 * summary (disabled/unreachable daemon) prints "n/a" per the FEAT contract. */
function formatMemoryUsefulnessLine(summary: MemoryUsefulnessSummary | null): string {
  if (!summary) return "- Memory usefulness (7d): n/a";
  const rateStr = summary.rate === null ? "n/a" : `${(summary.rate * 100).toFixed(1)}%`;
  return `- Memory usefulness (7d): served=${summary.served} used=${summary.used} rate=${rateStr}`;
}

function renderLoopTelemetry(
  iterationStatus: Record<string, any> | null,
  costTrajectory: {
    avgUSD: number | null;
    medianUSD: number | null;
    count: number;
    lastCostAdvisorVerdict: string | null;
  },
  pauseSummary: PauseRateSummary,
  pauseStaleness: PauseTelemetryStaleness,
  memoryUsefulness: MemoryUsefulnessSummary | null,
  aggregateExcludedCount: number
) {
  const out = ["## Loop telemetry", ""];

  const iterCount = iterationStatus?.count ?? 0;
  const iterCap = iterationStatus?.cap ?? 25;

  out.push(`- Iteration count: ${iterCount} / ${iterCap}`);

  if (costTrajectory.avgUSD === null || costTrajectory.medianUSD === null) {
    out.push("- In-window cost trajectory: n/a");
  } else {
    // "per cost-report" not "per iteration": one report = one slice-close
    // `crew cost-slice` session scan (session-deduped per FEAT-204), NOT one
    // loop iteration. Median is the headline — see median() for why.
    out.push(
      `- In-window cost trajectory: median $${costTrajectory.medianUSD.toFixed(3)} / mean $${costTrajectory.avgUSD.toFixed(3)} per cost-report (${costTrajectory.count} slice-close session scans)`
    );
  }

  // FEAT-269: fleet audit 2026-08-02 found aggregate_all rollup reports mixed
  // unmarked into per-repo cost stats, skewing the mean far from the median
  // (one $32,101 fleet-wide aggregate was mistaken for a single slice
  // report). resolveCostReportUsd already excludes these from the trajectory
  // above; this surfaces how many were excluded so operators can see when
  // aggregates dominate the corpus. Omitted at 0 (AC-2), mirroring the Pause
  // rate bullet's optional-section pattern below.
  if (aggregateExcludedCount > 0) {
    out.push(`- Aggregate reports excluded from cost trajectory: ${aggregateExcludedCount}`);
  }

  if (costTrajectory.lastCostAdvisorVerdict === null) {
    out.push("- Last cost-advisor verdict: n/a");
  } else {
    out.push(`- Last cost-advisor verdict: ${costTrajectory.lastCostAdvisorVerdict}`);
  }

  // FEAT-212: omit entirely when no dispatch-outcome telemetry has been
  // recorded yet (pause-events.jsonl absent or empty) -- never render a
  // misleading "0%" for a rate with no denominator, and never error.
  // FEAT-275: when data DOES exist but the newest record predates the
  // staleness window, render "no data (stale, ...)" instead of the numeric
  // rate -- a month-stale percentage is worse than no number at all, since
  // it reads as live (this bullet is `@`-included into every session via
  // CLAUDE.md -> loop-snapshot.md).
  //
  // Post-review (finding #2): the bullet's label names its actual
  // population -- reviewer/validator close-gate outcomes plus wave-mode
  // worktree outcomes -- rather than implying fleet-wide coverage. Default
  // (non-wave) orchestrator-mode BUILDER dispatches are NOT represented here
  // (docs/sop/specialist-pause-handling.md's own reproduction table shows
  // that is the dominant, still-open pause case; closing it needs a
  // real-time signal -- a SubagentStop report-gate hook, FEAT-259 slice 1,
  // not built yet -- not a retroactive gate read). A confident-looking
  // number sourced from a narrower population than the reader assumes is
  // worse than the honest "stale" state it replaces, so the label says so.
  const PAUSE_RATE_LABEL = "Pause rate (reviewer/validator + wave dispatches";
  if (pauseSummary.dispatches > 0) {
    if (pauseStaleness.stale) {
      const lastRecord = pauseStaleness.newestTs ? pauseStaleness.newestTs.slice(0, 10) : "unknown";
      out.push(
        `- ${PAUSE_RATE_LABEL}, last ${pauseSummary.dispatches}): no data (stale, last record: ${lastRecord})`
      );
    } else {
      out.push(
        `- ${PAUSE_RATE_LABEL}, last ${pauseSummary.dispatches}): ${(pauseSummary.pauseRate * 100).toFixed(1)}%`
      );
    }
  }

  out.push(formatMemoryUsefulnessLine(memoryUsefulness));

  out.push("");
  return out;
}

// FEAT-265: renders the dev-team gate-guard/artifact-lock hook enforcement
// counts (dev-team#257 AC leftover). Omitted entirely when
// readHookEnforcementSummary returns null (events.jsonl absent, unreadable,
// or has zero recognized gate-guard:*/artifact-lock:* lines) -- mirrors the
// renderInFlight / renderDispatchLifecycle optional-section pattern above.
export function renderHookEnforcement(summary: HookEnforcementSummary | null): string[] {
  if (!summary) return [];
  const { gateGuard, artifactLock, lastEventAt } = summary;
  return [
    "## Hook enforcement",
    "",
    `- gate-guard: warn=${gateGuard.warn} block=${gateGuard.block} other=${gateGuard.other}`,
    `- artifact-lock: warn=${artifactLock.warn} block=${artifactLock.block} other=${artifactLock.other}`,
    `- Last event: ${lastEventAt ?? "n/a"}`,
    ""
  ];
}

function renderUsageFooter() {
  return [
    "## How to use this file",
    "",
    "- Reference from `CLAUDE.md` via `@.claude/artifacts/loop/loop-snapshot.md` so agents pick it up at session start.",
    "- Regenerate via `bun src/scripts/loop.mts snapshot-memory --repo <path>` whenever the picture shifts materially.",
    ""
  ];
}

function renderDispatchLifecycle(
  dispatchTree: DispatchTreeSnapshot,
  pruneStaleAfterDays: number
): string[] {
  if (dispatchTree.openRunIds.length === 0 && dispatchTree.worktreeCount === 0) {
    return [];
  }
  const out = [
    "## Dispatch lifecycle",
    "",
    `- Open runIds (${dispatchTree.openRunIds.length}): ${dispatchTree.openRunIds.length > 0 ? dispatchTree.openRunIds.join(", ") : "(none)"}`,
    `- Worktree count (open runs): ${dispatchTree.worktreeCount}`,
    `- Oldest runId age: ${dispatchTree.oldestRunAgeDays !== null ? `${dispatchTree.oldestRunAgeDays.toFixed(1)}d` : "n/a"}`
  ];
  if (
    dispatchTree.oldestRunAgeDays !== null &&
    dispatchTree.oldestRunAgeDays > pruneStaleAfterDays
  ) {
    out.push(
      `- Hint: run \`bun src/scripts/loop.mts dispatch prune\` to reap stale runs (>${pruneStaleAfterDays}d)`
    );
  }
  out.push("");
  return out;
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
  aggregateExcludedCount: number;
  dispatchTree: DispatchTreeSnapshot;
  pauseSummary: PauseRateSummary;
  pauseStaleness: PauseTelemetryStaleness;
  memoryUsefulness: MemoryUsefulnessSummary | null;
  hookEnforcement: HookEnforcementSummary | null;
}> {
  const { readDispatchTreeSnapshot } = await import("./dispatch-tree-snapshot.mjs");
  const [
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportStats,
    dispatchTree,
    pauseSummary,
    pauseStaleness,
    memoryUsefulness,
    hookEnforcement
  ] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    listGrades(repoPath, { config }),
    listDecisions(repoPath, { config }),
    getIterationStatus(repoPath),
    loadCostReportStats(repoPath),
    readDispatchTreeSnapshot(repoPath).catch(() => ({
      openRunIds: [],
      worktreeCount: 0,
      oldestRunAgeDays: null
    })),
    summarizePauseRate(repoPath, PAUSE_RATE_WINDOW),
    evaluatePauseTelemetryStaleness(repoPath, config),
    fetchMemoryUsefulness(repoPath, config),
    readHookEnforcementSummary(repoPath)
  ]);
  return {
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportUSDValues: costReportStats.values,
    aggregateExcludedCount: costReportStats.aggregateExcludedCount,
    dispatchTree,
    pauseSummary,
    pauseStaleness,
    memoryUsefulness,
    hookEnforcement
  };
}

function buildSnapshotLines(
  repoPath: string,
  data: Awaited<ReturnType<typeof collectSnapshotData>>,
  today: string,
  pruneStaleAfterDays = 7
): string[] {
  const {
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportUSDValues,
    aggregateExcludedCount,
    dispatchTree,
    pauseSummary,
    pauseStaleness,
    memoryUsefulness,
    hookEnforcement
  } = data;
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
    medianUSD: median(costReportUSDValues),
    count: costReportUSDValues.length,
    lastCostAdvisorVerdict: null as string | null
  };
  const waveTelemetry = renderWaveTelemetry(repoPath);
  return [
    ...renderSnapshotHeader(today),
    ...renderBacklogState(backlog, inFlight),
    ...renderInFlight(inFlight),
    ...renderTriagedTop(triagedTop),
    ...renderSpecs(specs, specsByStatus),
    ...renderGradeSignal(grades, recentScoreAverages),
    ...renderDecisions(recentDecisions),
    ...renderLoopTelemetry(
      iterationStatus,
      costTrajectory,
      pauseSummary,
      pauseStaleness,
      memoryUsefulness,
      aggregateExcludedCount
    ),
    ...renderHookEnforcement(hookEnforcement),
    ...renderDispatchLifecycle(dispatchTree, pruneStaleAfterDays),
    // SLICE-182 (FEAT-276 AC-5): wires the previously-unwired
    // renderWaveTelemetry() into the actual snapshot output -- it existed
    // and was tested (snapshot-wave-telemetry.test.mts) but nothing called
    // it, so packing width was invisible in the artifact operators
    // actually read. Single string element (may embed its own newlines);
    // omitted entirely (no blank-line artifact) when no wave has run yet.
    ...(waveTelemetry ? [waveTelemetry] : []),
    ...renderUsageFooter()
  ];
}

export async function generateSnapshotContent(
  repoPath: string,
  { config = null, today }: { config?: Record<string, any> | null; today?: string } = {}
): Promise<string> {
  const data = await collectSnapshotData(repoPath, config);
  const date = today ?? new Date().toISOString().slice(0, 10);
  const pruneStaleAfterDays = config?.loop?.dispatch?.pruneStaleAfterDays ?? 7;
  return buildSnapshotLines(repoPath, data, date, pruneStaleAfterDays).join("\n");
}

export async function writeMemorySnapshot(
  repoPath: string,
  { config = null }: { config?: Record<string, any> | null } = {}
) {
  const data = await collectSnapshotData(repoPath, config);
  const today = new Date().toISOString().slice(0, 10);
  const pruneStaleAfterDays = config?.loop?.dispatch?.pruneStaleAfterDays ?? 7;
  const lines = buildSnapshotLines(repoPath, data, today, pruneStaleAfterDays);

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
    },
    dispatchTree: data.dispatchTree,
    // FEAT-265: structured hook-enforcement summary alongside counts/
    // dispatchTree so dashboards can read gate-guard/artifact-lock warn vs
    // block volume without parsing the rendered markdown. Same shape as the
    // `## Hook enforcement` section above; null when no events recorded.
    hookEnforcement: data.hookEnforcement
  };
}

/**
 * Renders the last wave's achieved-vs-requested packing width and a
 * per-category rejection breakdown (SLICE-182, FEAT-276 AC-5), plus the
 * pre-existing recent PASS-rate summary. Purely reads the entries
 * `updateIndex()` (wave/artifacts.mts) already writes -- no recomputation.
 *
 * `waveSize` / `rejected*` are optional on WaveIndexEntry because entries
 * written before this field existed lack them; those older rows fall back
 * to the pre-existing `size=N` form and omit the rejections line entirely
 * rather than fabricating a denominator or a zero that isn't measured.
 */
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

  const widthText =
    last.waveSize === undefined ? `size=${last.size}` : `packed ${last.size}/${last.waveSize}`;

  const lines = [
    "## Wave telemetry",
    "",
    `- Last wave: ${last.waveId} (${widthText}, PASS=${last.passCount}, FAIL=${last.failCount})`,
    `- Recent ${last10.length} waves: avg PASS rate ${passRate.toFixed(2)}`
  ];

  // Rejection-reason breakdown for the last wave, aggregated by category
  // (conflict vs missing-confidence vs other/pre-flight) per
  // rejection-category.mts, rather than dumping raw reason strings.
  // Note: FEAT-278 (out of scope here) means packWave's capacity cutoff can
  // drop candidates without recording them here, so this total is a lower
  // bound on "not packed", not a full accounting of the ranked list.
  if (
    last.rejectedConflict !== undefined ||
    last.rejectedMissingConfidence !== undefined ||
    last.rejectedOther !== undefined
  ) {
    const conflict = last.rejectedConflict ?? 0;
    const missing = last.rejectedMissingConfidence ?? 0;
    const other = last.rejectedOther ?? 0;
    const total = conflict + missing + other;
    const otherPart = other > 0 ? `, other=${other}` : "";
    lines.push(
      `- Last wave rejections: ${total} (conflict=${conflict}, missing-confidence=${missing}${otherPart})`
    );
  }

  lines.push("");
  return lines.join("\n");
}
