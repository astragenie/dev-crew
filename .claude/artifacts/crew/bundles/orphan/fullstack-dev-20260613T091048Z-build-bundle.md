---
slice: unknown
builder: fullstack-dev
run_id: 20260613T091048Z
feat: FEAT-165
files_touched: ["src/scripts/lib/cost-by-skill.mts", "src/scripts/loop.mts", "src/tests/cost-by-skill.test.mts"]
files_read: []
diff_stat: { files: 1, additions: 0, deletions: 85 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-115: add --cost-by-skill report to loop brief

- Created: 2026-06-13T09:10:48.940Z
- From: fullstack-dev
- To: lead
- Objective: Implemented cost-by-skill aggregator and --cost-by-skill flag for loop brief; 21 tests pass, tsc clean, lint 0 errors, format clean, committed as 3e58872
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/cost-by-skill.mts
  - src/scripts/loop.mts
  - src/tests/cost-by-skill.test.mts
- Confidence: high
- Risks: -
- Suggested Next Handoff: Inspector review of SLICE-115 changes


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-165.md b/.claude/artifacts/loop/backlog/triaged/FEAT-165.md
deleted file mode 100644
index f2250e5..0000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-165.md
+++ /dev/null
@@ -1,85 +0,0 @@
----
-id: FEAT-165
-title: Per-skill cost attribution
-status: triaged
-priority: P2
-category: competitor-gap
-target_release: null
-created: 2026-06-08
-updated: 2026-06-08
-depends_on: []
-slices: []
-derived_from: null
-source_competitors: [Trigger.dev, OpenAI Codex]
-autonomous_safe: true
-tags: [crew, cost, observability]
-needs_contract: false
-needs_ux: false
-pm_customer_impact: 0.55
-pm_effort_estimate: 0.35
-pm_strategic_alignment: 0.6
-pm_technical_risk: 0.25
-pm_dependency_depth: 0.1
-triage_notes: "NOTE — there is a naming collision: a different FEAT-103 (architect/editor two-model split) was triaged as a duplicate of FEAT-080 in the first batch and lives at triaged/FEAT-103.md. This FEAT (per-skill cost attribution) is a distinct item from the 2026-06-08 positioning audit and carries autonomous_safe: true per its original frontmatter. It is stored here as FEAT-103-per-skill-cost-attribution.md to avoid overwriting the earlier triaged file. Recommend re-numbering this as FEAT-165 or higher when the backlog admin pass runs."
-github_issue: 188
-github_milestone: null
-github_url: "https://github.com/sergeymilashico/loop/issues/188"
----
-# FEAT-165: Per-skill cost attribution
-
-## Source
-
-2026-06-08 positioning audit §8 CREW-NEXT-3.
-
-## Problem
-
-Crew+Loop's `cost-advisor` tracks per-slice cost. No per-skill attribution. Codex Analytics API surfaces skill-invocation breakdown. Trigger.dev's `usage.getCurrent()` gives per-block attribution. Crew users can't answer "which skill burned my budget this week?"
-
-## Proposal
-
-Extend cost-advisor to bucket spend by skill name (and agent role). Surface report as `crew:brief-me --cost-by-skill` or `loop:brief --cost-by-skill`.
-
-## Acceptance criteria
-
-- `auto-dispatch.jsonl` already captures agent + skill; cost-advisor reads + buckets by `skill_name`.
-- New report mode: top-N skills by 4-week average $; surface delta from baseline (current week vs avg).
-- Sample output: "crew:reviewer-multidim spent $12.40 in last week, +30% vs 4-week avg."
-- Tests: aggregator over synthetic jsonl, delta calculation, output formatter snapshot.
-
-## Out of scope
-
-- Real-time alerts (next slice).
-
-## References
-
-- Trigger.dev usage: https://trigger.dev/docs/run-usage
-- Codex Analytics API skill invocations field.
-- Existing cost-advisor at `src/scripts/lib/cost-advisor.mts`.
-
-## PM Scoring
-
-```json
-{
-  "featureId": "FEAT-103",
-  "scores": {
-    "customer_impact": 0.55,
-    "effort_estimate": 0.35,
-    "strategic_alignment": 0.60,
-    "technical_risk": 0.25,
-    "dependency_depth": 0.10
-  },
-  "compositePriority": "P2",
-  "autonomousSafe": true,
-  "demandEvidence": "2026-06-08 positioning audit §8 CREW-NEXT-3. Competitor evidence: Trigger.dev usage.getCurrent() per-block, Codex Analytics API skill invocations field. auto-dispatch.jsonl already emits agent+skill data; the aggregation layer is missing.",
-  "scopeNotes": "Minimum deliverable: read auto-dispatch.jsonl, bucket by skill_name, surface top-N report. Single module addition to cost-advisor area. ACs are clear and testable. Smallest deliverable is the aggregator + report formatter; the --cost-by-skill flag entry point is independent. Fits in one slice.",
-  "risks": [
-    "auto-dispatch.jsonl may not reliably capture skill_name across all dispatch paths — needs audit before coding",
-    "Naming collision: a previous FEAT-103 (architect/editor two-model split) was triaged in first pass; this item may need renumbering"
-  ],
-  "reasoning": "P2 autonomous_safe: clear AC, single-module scope, foundational data already in auto-dispatch.jsonl, demand from positioning audit."
-}
-```
-
-## Consider rejecting because
-
-No strong objection. Narrow scope; data already exists in `auto-dispatch.jsonl`. Only concern is the id collision with the previously-triaged FEAT-103 — recommend renumbering to FEAT-165 in the next backlog admin pass.

```

## Files touched

### src/scripts/lib/cost-by-skill.mts

```
// cost-by-skill.mts — Aggregates auto-dispatch.jsonl spend by agent/skill name.
//
// FEAT-165 / SLICE-115: bucket dispatch log entries by `agent` field and
// surface a ranked report with 4-week avg and week-over-week delta.
//
// The field in auto-dispatch.jsonl is `agent` (e.g. "loop:researcher",
// "crew:document-writer"). This module treats `agent` as the "skill name"
// for cost attribution purposes, since no separate `skill_name` field exists
// in the log schema.

import fs from "node:fs/promises";
import path from "node:path";

export const DISPATCH_LOG_REL = ".claude/artifacts/loop/auto-dispatch.jsonl";
const CURRENT_WEEK_DAYS = 7;
const AVG_WINDOW_DAYS = 28; // 4 weeks

/** A parsed entry from auto-dispatch.jsonl. */
export interface DispatchEntry {
  timestamp: string;
  /** Agent/skill identifier, e.g. "loop:researcher". May be absent in malformed lines. */
  agent?: string | null;
  costUsd?: number | null;
  durationMs?: number;
  ok?: boolean;
  skipped?: boolean;
}

/** Aggregated cost row for a single skill/agent. */
export interface SkillCostRow {
  /** Skill name (agent field value, or "(unknown)" for missing/null entries). */
  skillName: string;
  /** Total spend in the most recent 7-day window. */
  currentWeekUsd: number;
  /** Average weekly spend over the last 28 days (4-week average). */
  fourWeekAvgUsd: number;
  /**
   * Week-over-week delta as a percentage relative to the 4-week avg.
   * null when fourWeekAvgUsd === 0.
   */
  deltaPercent: number | null;
  /** Total entries in the 28-day window (includes skipped / zero-cost). */
  entryCount: number;
}

/**
 * Read and parse auto-dispatch.jsonl, returning all parseable entries.
 * Lines that are not valid JSON or contain no `agent` field are still
 * returned but will have `agent: null`; callers handle them gracefully.
 * Never throws — on I/O error returns an empty array.
 */
export async function readDispatchLog(logPath: string): Promise<DispatchEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(logPath, "utf8");
  } catch {
    return [];
  }

  const results: DispatchEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const entry: DispatchEntry = {
        timestamp:
          typeof obj["timestamp"] === "string" ? obj["timestamp"] : new Date(0).toISOString(),
        agent: typeof obj["agent"] === "string" ? obj["agent"] : null,
        costUsd:
          typeof obj["costUsd"] === "number" && Number.isFinite(obj["costUsd"])
            ? obj["costUsd"]
            : null,
        durationMs: typeof obj["durationMs"] === "number" ? obj["durationMs"] : 0,
        ok: typeof obj["ok"] === "boolean" ? obj["ok"] : true,
        skipped: typeof obj["skipped"] === "boolean" ? obj["skipped"] : false
      };
      results.push(entry);
    } catch {
      // Malformed line: skip silently (AC-3)
    }
  }
  return results;
}

/**
 * Bucket entries by skill name and compute per-skill cost aggregates.
 *
 * @param entries - Parsed dispatch log entries.
 * @param windowDays - Total window in days (default 28 = 4 weeks). The
 *   current-week bucket always uses the most recent 7 days regardless of
 *   this value; fourWeekAvgUsd is totalWindowSpend / (windowDays / 7).
 * @param now - Reference timestamp for window calculations (default: Date.now()).
 *   Pass in tests for determinism.
 */
export function aggregateBySkill(
  entries: DispatchEntry[],
  windowDays: number = AVG_WINDOW_DAYS,
  now: number = Date.now()
): SkillCostRow[] {
  const weeksInWindow = windowDays / CURRENT_WEEK_DAYS;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const currentWeekMs = CURRENT_WEEK_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;
  const currentWeekCutoff = now - currentWeekMs;

  // Bucket by skill name within the full window
  const perSkill = new Map<string, { windowTotal: number; currentWeek: number; count: number }>();

  for (const entry of entries) {
    const ts = Date.parse(entry.timestamp);
    if (Number.isNaN(ts) || ts < cutoff) continue;

    const skillName = entry.agent != null && entry.agent.length > 0 ? entry.agent : "(unknown)";
    const cost = entry.costUsd ?? 0;

    let bucket = perSkill.get(skillName);
    if (!bucket) {
      bucket = { windowTotal: 0, currentWeek: 0, count: 0 };
      perSkill.set(skillName, bucket);
    }
    bucket.windowTotal += cost;
    bucket.count += 1;
    if (ts >= currentWeekCutoff) {
      bucket.currentWeek += cost;
    }
  }

  const rows: SkillCostRow[] = [];
  for (const [skillName, bucket] of perSkill) {
    const fourWeekAvgUsd = weeksInWindow > 0 ? bucket.windowTotal / weeksInWindow : 0;
    const currentWeekUsd = bucket.currentWeek;
    const deltaPercent = computeDeltaPercent(currentWeekUsd, fourWeekAvgUsd);
    rows.push({
      skillName,
      currentWeekUsd,
      fourWeekAvgUsd,
      deltaPercent,
      entryCount: bucket.count
    });
  }

  // Sort by current-week spend descending, then by 4-week avg descending
  rows.sort((a, b) => {
    const diff = b.currentWeekUsd - a.currentWeekUsd;
    if (diff !== 0) return diff;
    return b.fourWeekAvgUsd - a.fourWeekAvgUsd;
  });

  return rows;
}

/**
 * Compute week-over-week delta percent.
 * Returns null when baseline is zero (division undefined).
 * Pure function; no I/O.
 */
export function computeDeltaPercent(currentWeek: number, baseline: number): number | null {
  if (baseline === 0) return null;
  return ((currentWeek - baseline) / baseline) * 100;
}

/**
 * Format the cost-by-skill report as a human-readable string.
 *
 * @param rows - Pre-sorted SkillCostRow array from aggregateBySkill.
 * @param topN - Max rows to include (default: all).
 */
export function formatCostBySkillReport(rows: SkillCostRow[], topN?: number): string {
  if (rows.length === 0) {
    return "No dispatch log entries found in the last 4 weeks.";
  }

  const displayRows = topN != null && topN > 0 ? rows.slice(0, topN) : rows;
  const lines: string[] = ["Cost by skill (last 4 weeks / week-over-week delta):"];

  for (const row of displayRows) {
    const avg = row.fourWeekAvgUsd.toFixed(4);
    const current = row.currentWeekUsd.toFixed(4);
    let deltaStr: string;
    if (row.deltaPercent === null) {
      deltaStr = "n/a (no baseline)";
    } else {
      const sign = row.deltaPercent >= 0 ? "+" : "";
      deltaStr = `${sign}${row.deltaPercent.toFixed(1)}% vs 4-week avg`;
    }
    lines.push(
      `  ${row.skillName}: spent $${current} last week, ${deltaStr} (4-week avg $${avg}, ${row.entryCount} dispatch(es))`
    );
  }

  return lines.join("\n");
}

/**
 * High-level entry point: read the dispatch log and return a formatted report.
 * Fail-open: returns a "no data" message on missing file or empty log.
 */
export async function buildCostBySkillReport(
  repoPath: string,
  opts: { topN?: number; windowDays?: number; now?: number } = {}
): Promise<string> {
  const logPath = path.join(repoPath, DISPATCH_LOG_REL);
  const entries = await readDispatchLog(logPath);
  const rows = aggregateBySkill(
    entries,
    opts.windowDays ?? AVG_WINDOW_DAYS,
    opts.now ?? Date.now()
  );
  return formatCostBySkillReport(rows, opts.topN);
}

```

### src/scripts/loop.mts

```
#!/usr/bin/env node

import path from "node:path";
import { clearFrontmatterCache } from "./lib/frontmatter-cache.mjs";
import { resolveSkills } from "./lib/skill-resolver.mjs";
import { importGithubSync } from "./lib/github-sync-loader.mjs";

// CLI for the loop plugin. Mirrors scripts/crew.mjs argument-parsing
// conventions (--repo, --, MSYS path normalization) so the two plugins behave
// the same way at the command line.

function normalizeMsysPath(value: string): string {
  if (!value || process.platform !== "win32") {
    return value;
  }
  const match = value.match(/^\/([a-zA-Z])\/(.*)$/);
  if (!match) {
    return value;
  }
  return `${(match[1] ?? "").toUpperCase()}:/${match[2] ?? ""}`;
}

// Flag schema. See hero-crew/scripts/crew.mjs for the same pattern.
const FLAG_SPEC = {
  "--help": { key: "help", boolean: true },
  "-h": { key: "help", boolean: true },
  "--repo": { key: "repo" },
  "--preset": { key: "preset" },
  "--variant": { key: "variant" },
  "--override": { key: "override" },
  "--strict": { key: "strict", boolean: true },
  "--phase": { key: "phase" },
  "--note": { key: "note" },
  "--status": { key: "status" },
  "--priority": { key: "priority" },
  "--category": { key: "category" },
  "--target-release": { key: "targetRelease" },
  "--type": { key: "type" },
  "--title": { key: "title" },
  "--id": { key: "id" },
  "--body": { key: "body" },
  "--features": { key: "features" },
  "--goal": { key: "goal" },
  "--no-dispatch": { key: "noDispatch", boolean: true },
  "--no-research": { key: "noResearch", boolean: true },
  "--no-architect": { key: "noArchitect", boolean: true },
  "--no-doc-writer": { key: "noDocWriter", boolean: true },
  "--no-classify": { key: "noClassify", boolean: true },
  "--keep-feature-open": { key: "keepFeatureOpen", boolean: true },
  "--force-close": { key: "forceClose", boolean: true },
  "--skip-validation-check": { key: "skipValidationCheck" },
  "--version": { key: "version" },
  "--since": { key: "since" },
  "--span-days": { key: "spanDays" },
  "--until": { key: "until" },
  "--by": { key: "by" },
  "--artifact": { key: "artifact" },
  "--kind": { key: "kind" },
  "--files": { key: "files" },
  "--features-json": { key: "featuresJson" },
  "--key": { key: "key" },
  "--insight": { key: "insight" },
  "--confidence": { key: "confidence" },
  "--slice": { key: "slice" },
  "--limit": { key: "limit" },
  "--window": { key: "window" },
  "--max-features": { key: "maxFeatures" },
  "--dry-run": { key: "dryRun", boolean: true },
  "--auto-mode": { key: "autoMode", boolean: true },
  "--provider": { key: "provider" },
  "--pr": { key: "pr" },
  "--scores": { key: "scores" },
  "--autonomous-safe": { key: "autonomousSafe" },
  "--evidence": { key: "evidence" },
  "--reasoning": { key: "reasoning" },
  "--allow-cross-session": { key: "allowCrossSession", boolean: true },
  "--explain-halts": { key: "explainHalts", boolean: true },
  "--worktree": { key: "worktree" },
  // SLICE-64: auto-merge flags
  "--no-merge": { key: "noMerge", boolean: true },
  "--skip-simplify": { key: "skipSimplify", boolean: true },
  "--grade-yaml": { key: "gradeYaml" },
  "--include-triaged": { key: "includeTriaged", boolean: true },
  // doctor flags
  "--check": { key: "check", boolean: true },
  "--fix": { key: "fix", boolean: true },
  // phase-gate flags
  "--serial": { key: "serial", boolean: true },
  "--only": { key: "only" },
  // FEAT-165: cost-by-skill report
  "--cost-by-skill": { key: "costBySkill", boolean: true }
};

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, any> = {
    repo: process.cwd(),
    preset: null,
    variant: null,
    override: null,
    strict: false,
    phase: null,
    note: null,
    help: false,
    status: null,
    priority: null,
    category: null,
    targetRelease: null,
    type: null,
    title: null,
    id: null,
    body: null,
    features: null,
    version: null,
    since: null,
    spanDays: null,
    until: null,
    by: null,
    artifact: null,
    kind: null,
    files: null,
    featuresJson: null,
    keepFeatureOpen: false,
    skipValidationCheck: null,
    key: null,
    insight: null,
    confidence: null,
    slice: null,
    limit: null,
    window: null,
    maxFeatures: null,
    dryRun: false,
    autoMode: false,
    provider: null,
    pr: null,
    noResearch: false,
    noArchitect: false,
    noDocWriter: false,
    noClassify: false,
    scores: null,
    autonomousSafe: null,
    evidence: null,
    reasoning: null,
    allowCrossSession: false,
    worktree: null,
    explainHalts: false,
    noMerge: false,
    skipSimplify: false,
    check: false,
    fix: false,
    serial: false,
    only: null,
    includeTriaged: false,
    costBySkill: false
  };
  const positionals: any[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]!;
    if (value === "--") {
      for (let tail = index + 1; tail < rest.length; tail += 1) {
        positionals.push(rest[tail]);
      }
      break;
    }
    const spec = FLAG_SPEC[value as keyof typeof FLAG_SPEC];
    if (spec) {
      if ("boolean" in spec && spec.boolean) {
        (flags as Record<string, any>)[spec.key] = true;
      } else {
        (flags as Record<string, any>)[spec.key] = rest[index + 1];
        index += 1;
      }
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`Unknown argument: ${value}`);
    }
    positionals.push(value);
  }

  if (!command || command === "--help" || command === "-h") {
    return { command: "help", flags, positionals };
  }
  return { command, flags, positionals };
}

type CmdCtx = {
  repoPath: string;
  flags: Record<string, any>;
  positionals: string[];
  config: Record<string, any> | null;
};

function usage() {
  return [
    "loop CLI",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts install --repo <path> [--preset <name>]",
    "  bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]",
    "  bun src/scripts/loop.mts status --repo <path>",
    "  bun src/scripts/loop.mts list-presets",
    "  bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]",
    "  bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)",
    "",
    "Hard dependency: the `crew` plugin must be installed. Phase-gate writes its",
    "artifact through `crew write-validation-result`."
  ].join("\n");
}

// Command registry. Each handler returns the result that gets JSON-stringified
// to stdout. Lazy imports stay per-handler to keep start-up cheap when a user
// only invokes one command.
const COMMANDS = {
  install: async ({ repoPath, flags }: CmdCtx) => {
    const { installLoop } = await import("./lib/loop-installer.mjs");
    return installLoop(repoPath, { preset: flags.preset });
  },
  "phase-gate": async ({ repoPath, flags, config }: CmdCtx) => {
    const { runPhaseGate } = await import("./lib/phase-gate.mjs");
    return runPhaseGate(repoPath, {
      phase: flags.phase,
      note: flags.note,
      serial: Boolean(flags.serial),
      only: flags.only || undefined,
      config
    });
  },
  status: async ({ repoPath }: CmdCtx) => {
    const { reportStatus } = await import("./lib/loop-installer.mjs");
    return reportStatus(repoPath);
  },
  "list-presets": async () => {
    const { listPresets } = await import("./lib/config-resolver.mjs");
    return { presets: await listPresets() };
  },
  github: ({ repoPath, flags, positionals }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags),
  "task-store": ({ repoPath, flags, positionals }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags),
  backlog: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runBacklogSubcommand(repoPath, positionals, flags, config),
  spec: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSpecSubcommand(repoPath, positionals, flags, config),
  release: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runReleaseSubcommand(repoPath, positionals, flags, config),
  slice: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSliceSubcommand(repoPath, positionals, flags, { config }),
  feature: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runFeatureSubcommand(repoPath, positionals, flags, config),
  decisions: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runDecisionsSubcommand(repoPath, positionals, flags, config),
  retrospective: async ({ repoPath, flags }: CmdCtx) => {
    const { writeRetrospective } = await import("./lib/retrospective.mjs");
    const result = await writeRetrospective(repoPath, {
      since: flags.since,
      spanDays: flags.spanDays,
      until: flags.until
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "retrospective",
      since: flags.since,
      span_days: flags.spanDays
    });
    return result;
  },
  brief: async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });

    if (flags?.costBySkill) {
      const { buildCostBySkillReport } = await import("./lib/cost-by-skill.mjs");
      const report = await buildCostBySkillReport(cwd);
      console.log(report);
      return { _suppressDefaultOutput: true };
    }

    const { buildBrief } = await import("./lib/brief.mjs");
    const result = await buildBrief(cwd);
    if (flags?.explainHalts) {
      const { explainHalts } = await import("./lib/halt-badges.mjs");
      console.log(JSON.stringify(result, null, 2));
      console.log("");
      console.log(explainHalts(result));
      return { _suppressDefaultOutput: true };
    }
    return result;
  },
  "perf-report": async ({ repoPath, flags, config }: CmdCtx) => {
    const { buildPerfReport } = await import("./lib/perf-report.mjs");
    const windowSize =
      flags.window != null && flags.window !== "" ? Number.parseInt(String(flags.window), 10) : 10;
    return buildPerfReport(repoPath, { window: windowSize, config });
  },
  "classify-slice-shape": async ({ flags }: CmdCtx) => {
    const { classifySliceShape } = await import("./lib/classify-slice-shape.mjs");
    const filesArg = typeof flags.files === "string" ? flags.files : "";
    const files = filesArg
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ path: p, added: 0, removed: 0, exportDelta: 0 }));
    return classifySliceShape({ files });
  },
  "snapshot-memory": async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeMemorySnapshot } = await import("./lib/memory-snapshot.mjs");
    const result = await writeMemorySnapshot(cwd);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "snapshot-memory", grades: result.counts.grades });
    return result;
  },
  lessons: async ({ repoPath, positionals }: CmdCtx) => {
    const [sub] = positionals;
    if (sub !== "recent") throw new Error("lessons requires subcommand: recent");
    const { recentLessons } = await import("./lib/lessons-feed.mjs");
    const limit = positionals[1] ? Number(positionals[1]) : 5;
    return recentLessons(repoPath, { limit });
  },
  "sync-claims": async ({ repoPath }: CmdCtx) => {
    const { syncClaims } = await import("./lib/claims-sync.mjs");
    const result = await syncClaims(repoPath);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "sync-claims", actions: result.actions.length });
    return result;
  },
  "stop-check": async ({ repoPath, flags, config }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { checkStopConditions } = await import("./lib/stop-conditions.mjs");
    return checkStopConditions(cwd, { config });
  },
  auto: async ({ repoPath, flags, config }: CmdCtx) => {
    const { runAutoWalker } = await import("./lib/auto-walker.mjs");
    return runAutoWalker(repoPath, {
      ...(flags.maxFeatures ? { maxFeatures: Number(flags.maxFeatures) } : {}),
      dryRun: Boolean(flags.dryRun),
      autoMode: Boolean(flags.autoMode),
      allowCrossSession: Boolean(flags.allowCrossSession),
      config
    });
  },
  learnings: ({ repoPath, flags, positionals }: CmdCtx) =>
    runLearningsSubcommand(repoPath, positionals, flags),
  architect: async ({ repoPath, flags, config }: CmdCtx) =>
    runArchitectSubcommand(repoPath, flags, config),
  trajectory: async ({ repoPath, flags }: CmdCtx) => {
    const { readTrajectory, trajectoryPath } = await import("./lib/trajectory-writer.mjs");
    const sliceId = flags.id;
    if (!sliceId) throw new Error("trajectory requires --id SLICE-NN");
    const steps = await readTrajectory(repoPath, sliceId);
    return { sliceId, steps, count: steps.length, path: trajectoryPath(repoPath, sliceId) };
  },
  "pr-fix": async ({ repoPath, flags }: CmdCtx) => {
    const { runPrFix } = await import("./lib/pr-fixer.mjs");
    const prNumber = flags.pr;
    if (!prNumber) throw new Error("pr-fix requires --pr <number>");
    const priorAttempts = flags.body ? JSON.parse(flags.body) : {};
    return runPrFix(repoPath, prNumber, { priorAttempts });
  },
  doctor: async ({ repoPath, flags, config }: CmdCtx) => {
    const { runDoctor } = await import("./lib/doctor.mjs");
    const result = await runDoctor(repoPath, { fix: Boolean(flags.fix), config });
    if (flags.check && result.findings.length > 0) {
      console.error(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      return { _suppressDefaultOutput: true };
    }
    return result;
  }
};

async function runArchitectSubcommand(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const sliceId = flags.id;
  if (!sliceId) throw new Error("architect requires --id SLICE-NN");

  const { resolveArchitectModels } = await import("./lib/model-router.mjs");
  const { runPlanPreflight } = await import("./lib/slice-plan.mjs");

  const { architectModel, editorModel } = resolveArchitectModels(config);
  const planResult = await runPlanPreflight(repoPath, sliceId, { config });

  const dispatchInstruction = [
    `## Two-Model Split Dispatch`,
    ``,
    `**Architect Model (Research/Plan):** ${architectModel}`,
    `**Editor Model (Implementation):** ${editorModel}`,
    ``,
    `The architect model has completed the codebase research pre-flight.`,
    `Plan artifact written to: ${planResult.planPath}`,
    ``,
    `Dispatch \`crew:fullstack-dev\` subagent for the editor phase, which will use the ${editorModel} model for implementation. After it returns, dispatch \`crew:inspector\` (and \`crew:verifier\` if behavior changed) before closing the slice.`,
    `The editor phase should reference the plan artifact to guide the implementation approach.`
  ].join("\n");

  const { logEvent } = await import("./lib/telemetry.mjs");
  await logEvent(repoPath, {
    command: "architect",
    slice: sliceId,
    architect_model: architectModel,
    editor_model: editorModel,
    plan_path: planResult.planPath,
    files_researched: planResult.filesResearched.length
  });

  return {
    sliceId,
    architectModel,
    editorModel,
    planPath: planResult.planPath,
    filesResearched: planResult.filesResearched,
    dispatchInstruction
  };
}

function runResolveSkillsCommand(flags: Record<string, any>): void {
  const VALID_VARIANTS = ["fe", "be", "single", "pm", "researcher", "architect", "document-writer"];
  if (!flags.variant) {
    process.stderr.write(`error: --variant <${VALID_VARIANTS.join("|")}> required\n`);
    process.exitCode = 1;
    return;
  }
  if (!VALID_VARIANTS.includes(flags.variant)) {
    process.stderr.write(
      `error: --variant must be one of ${VALID_VARIANTS.join(", ")} (got ${flags.variant})\n`
    );
    process.exitCode = 1;
    return;
  }

  const preset = flags.preset;
  if (!preset) {
    process.stderr.write("error: --preset <path> required\n");
    process.exitCode = 1;
    return;
  }

  if (flags.strict) {
    process.stderr.write(
      "warn: --strict is reserved for a future skill-ID-lint registry and is a no-op today\n"
    );
  }

  try {
    const resolved = resolveSkills({
      presetPath: preset,
      ...(flags.override ? { overridePath: flags.override } : {}),
      variant: flags.variant
    });
    if (resolved === null) {
      process.stderr.write(
        "warn: no skills resolved for this variant (split mismatch or empty array)\n"
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(JSON.stringify(resolved, null, 2) + "\n");
    process.exitCode = 0;
  } catch (err: unknown) {
    const msg = (err as { message?: string } | undefined)?.message ?? String(err);
    process.stderr.write(`error: ${msg}\n`);
    process.exitCode = 1;
  }
}

async function main() {
  // Short-circuit `dispatch` before parseArgs — its flags (--plan, --parent-branch,
  // --depth, --dry-run, --json, --run-id, --config) are not registered in
  // FLAG_SPEC, and the parser would throw on them. Forward all remaining argv
  // verbatim to dispatch.mts as a child process (run under bun).
  const rawArgv = process.argv.slice(2);
  if (rawArgv[0] === "dispatch") {
    const { spawnSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const thisFile = fileURLToPath(import.meta.url);
    const dispatchCli = path.join(path.dirname(thisFile), "dispatch.mts");
    const result = spawnSync("bun", [dispatchCli, ...rawArgv.slice(1)], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    process.exitCode = result.status ?? 1;
    return;
  }

  const { command, flags, positionals } = parseArgs(rawArgv);
  const repoPath = path.resolve(normalizeMsysPath(flags.repo));

  if (command === "help") {
    console.log(usage());
    return;
  }

  if (command === "resolve-skills") {
    runResolveSkillsCommand(flags);
    clearFrontmatterCache();
    return;
  }

  clearFrontmatterCache(); // ensure cold start for each invocation

  // Resolve config once at dispatcher level and pass to all handlers
  const { resolveConfig } = await import("./lib/config-resolver.mjs");
  const config = await resolveConfig(repoPath);

  const handler = (COMMANDS as Record<string, (ctx: CmdCtx) => Promise<unknown>>)[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
  }

  try {
    const result = await handler({ repoPath, flags, positionals, config });
    if (result && (result as any)._suppressDefaultOutput) return;
    console.log(JSON.stringify(result, null, 2));
  } finally {
    // Win 10: flush buffered audit log lines in a single write per invocation.
    const { flushAuditLog } = await import("./lib/auto-dispatch.mjs");
    await flushAuditLog(repoPath).catch(() => {
      /* non-fatal: best-effort audit log flush */
    });
  }
}

type DispatchFn = typeof import("./lib/auto-dispatch.mjs").dispatchAgent;

async function resolveBacklogAddBody(
  repoPath: string,
  _title: string,
  suppliedBody: string | null | undefined
): Promise<string> {
  if (suppliedBody) return suppliedBody;
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:researcher",
    parentCommand: "backlog-add",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal-researcher-disabled",
    durationMs: 0
  });
  console.error(
    "[backlog add] researcher auto-dispatch removed (see DEC-011). " +
      "Creating FEAT with empty body — run /loop:backlog-add for researcher enrichment, " +
      "or pass --body explicitly."
  );
  return "";
}

async function runBacklogListPendingIds(repoPath: string, flags: Record<string, any> = {}) {
  const { listPendingFeatureIds } = await import("./lib/backlog-list-ids.mjs");
  const ids = await listPendingFeatureIds(repoPath, {
    includeTriaged: Boolean(flags.includeTriaged)
  });
  return { ids };
}

async function runBacklogAdd(
  repoPath: string,
  flags: Record<string, any>,
  rest: string[],
  config: Record<string, any> | null
) {
  const title = flags.title || rest.join(" ");
  if (!title) throw new Error("backlog add requires a title (positional or --title).");
  if (flags.noResearch) {
    console.error(
      "[backlog add] --no-research is deprecated and now a no-op (see DEC-011). " +
        "Researcher auto-dispatch is already removed."
    );
  }
  const resolvedBody = await resolveBacklogAddBody(repoPath, title, flags.body);
  const { addFeature } = await import("./lib/backlog-writer.mjs");
  const result = await addFeature(repoPath, {
    title,
    priority: flags.priority,
    category: flags.category,
    target_release: flags.targetRelease,
    body: resolvedBody,
    config
  });
  const { publishFeat } = await importGithubSync("github-sync.mjs");
  try {
    await (publishFeat as any)(repoPath, result.id);
  } catch (e) {
    console.error(`[github] publish warning (backlog add): ${(e as Error).message}`);
  }
  return result;
}

async function runBacklogPmWrite(repoPath: string, flags: Record<string, any>, rest: string[]) {
  const featureId = flags.id || rest[0];
  if (!featureId) throw new Error("backlog pm-write requires --id FEAT-NNN.");
  if (!flags.scores) throw new Error("backlog pm-write requires --scores '{...}'.");
  const { parseJsonFlag } = await import("./lib/json-flag.mjs");
  const parsedScores: Record<string, number> = parseJsonFlag(flags.scores, "scores");
  const priority = flags.priority ?? null;
  const autonomousSafe =
    flags.autonomousSafe === "true"
      ? true
      : flags.autonomousSafe === "false"
        ? false
        : Boolean(flags.autonomousSafe);
  const triageNotes: string | undefined = flags.reasoning ?? flags.evidence ?? undefined;
  const { writePmScores } = await import("./lib/backlog-pm-write.mjs");
  return writePmScores(repoPath, {
    id: featureId,
    scores: parsedScores as any,
    priority,
    autonomousSafe,
    ...(triageNotes !== undefined ? { triageNotes } : {})
  });
}

function isUnclassifiedEntry(entry: Record<string, any>): boolean {
  const fm = entry.frontmatter;
  const tagsEmpty = !Array.isArray(fm.tags) || fm.tags.length === 0;
  const tagsNull = fm.tags == null || fm.tags === "";
  const noTags = tagsEmpty && tagsNull;
  return noTags && fm.needs_contract == null && fm.needs_ux == null;
}

export async function runBacklogEnrich(repoPath: string, _flags: Record<string, any>) {
  const { listBacklog } = await import("./lib/backlog-parser.mjs");
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");

  const allEntries = await listBacklog(repoPath);
  const triaged = allEntries.filter((e: Record<string, any>) => e.state === "triaged");

  const needsClassify = triaged.filter(isUnclassifiedEntry);
  const alreadyTagged = triaged.length - needsClassify.length;

  if (needsClassify.length === 0) {
    console.log(`Enriched: 0 / Already tagged: ${alreadyTagged}`);
    return { enriched: 0, alreadyTagged, failed: 0 };
  }

  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:architect",
    parentCommand: "backlog enrich",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal",
    durationMs: 0
  });
  console.error(
    `[backlog enrich] CLI auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /loop:backlog-enrich. ` +
      `${needsClassify.length} feature(s) need classification.`
  );
  process.exitCode = 1;
  return { enriched: 0, alreadyTagged, failed: 0, refused: true };
}

async function runBacklogSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "backlog requires a subcommand: add | list | list-pending-ids | triage | promote"
    );
  if (sub === "add") {
    return runBacklogAdd(repoPath, flags, rest, config);
  }
  if (sub === "list") {
    const { listBacklog, filterBacklog } = await import("./lib/backlog-parser.mjs");
    const entries = await listBacklog(repoPath);
    const filtered = filterBacklog(entries, {
      status: flags.status,
      priority: flags.priority,
      category: flags.category,
      target_release: flags.targetRelease
    });
    return {
      count: filtered.length,
      entries: filtered.map((e) => ({
        id: e.id,
        state: e.state,
        priority: e.frontmatter.priority,
        category: e.frontmatter.category,
        target_release: e.frontmatter.target_release,
        created: e.frontmatter.created,
        updated: e.frontmatter.updated,
        derived_from: e.frontmatter.derived_from || null,
        slices: e.frontmatter.slices || [],
        filePath: e.filePath
      }))
    };
  }
  if (sub === "triage") {
    // TODO(2026-09-11): remove this stub. Kept one release cycle so
    // operators upgrading from <= v0.40 get a directive instead of a
    // bare "unknown subcommand" error. Triage is PM-only since
    // commit 505a8a5 (2026-06-11).
    throw new Error(
      "`backlog triage` (regex fallback) was removed on 2026-06-11. Triage is PM-only — invoke `/loop:triage` (skill) instead. On PM error, halt and surface to the operator."
    );
  }
  if (sub === "list-pending-ids") {
    return runBacklogListPendingIds(repoPath, flags);
  }
  if (sub === "promote") {
    const featureId = flags.id || rest[0];
    if (!featureId) throw new Error("backlog promote requires --id FEAT-NNN.");
    const { findFeatureById, moveFeature } = await import("./lib/backlog-writer.mjs");
    const entry = await findFeatureById(repoPath, featureId);
    if (!entry) throw new Error(`Feature not found: ${featureId}`);
    const moved = await moveFeature(entry.filePath, "in-progress");
    return { id: featureId, moved };
  }
  if (sub === "pm-write") {
    return runBacklogPmWrite(repoPath, flags, rest);
  }
  if (sub === "enrich") {
    return runBacklogEnrich(repoPath, flags);
  }
  throw new Error(`Unknown backlog subcommand: ${sub}`);
}

function parseFeatureEntries(flags: Record<string, any>): string[] {
  if (flags.featuresJson) {
    let entries;
    try {
      entries = JSON.parse(flags.featuresJson as string);
    } catch (err: unknown) {
      throw new Error(`--features-json must be valid JSON: ${(err as Error).message}`);
    }
    if (!Array.isArray(entries)) throw new Error("--features-json must be a JSON array");
    return entries;
  }
  return (flags.features as string)
    .split(";")
    .map((s: string) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Architect output parser — accepts semicolon-separated, newline-separated,
// or markdown-numbered-list titles from the agent. Each entry is trimmed,
// list markers and surrounding emphasis are stripped, empty entries
// discarded. Prefers semicolon split when present (back-compat with the
// original prompt format); falls back to newline split otherwise.
// ---------------------------------------------------------------------------

function stripListMarker(line: string): string {
  // Strip leading markdown list markers: "1.", "1)", "-", "*"
  let s = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
  // Strip surrounding bold/italic markers and backticks
  s = s.replace(/^[*_`]+|[*_`]+$/g, "");
  return s.trim();
}

export { parseClassifyOutput } from "./lib/classify-parser.mjs";

export function parseArchitectOutput(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const hasSemicolon = raw.includes(";");
  const parts = hasSemicolon ? raw.split(";") : raw.split("\n");
  return parts.map(stripListMarker).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Incomplete-SPEC detection — checks frontmatter and body for objective/scope.
// Returns array of missing field names (empty when SPEC is complete).
// ---------------------------------------------------------------------------

export function detectMissingSpecFields(spec: {
  frontmatter: Record<string, any>;
  body: string;
}): string[] {
  const missing: string[] = [];
  const fm = spec.frontmatter;
  const body = spec.body ?? "";

  const hasObjective =
    (fm["objective"] != null && String(fm["objective"]).trim().length > 0) ||
    /##\s+objective/i.test(body) ||
    /##\s+goals/i.test(body) ||
    /##\s+problem/i.test(body);

  const hasScope =
    (fm["scope"] != null && String(fm["scope"]).trim().length > 0) ||
    /##\s+scope/i.test(body) ||
    /##\s+in[- ]scope/i.test(body) ||
    /##\s+non-goals/i.test(body);

  if (!hasObjective) missing.push("objective");
  if (!hasScope) missing.push("scope");
  return missing;
}

const SPEC_HANDLERS = {
  add: async (
    repoPath: string,
    flags: Record<string, any>,
    rest: string[],
    config: Record<string, any> | null
  ) => {
    const title = flags.title || rest.join(" ");
    if (!title) throw new Error("spec add requires a title (positional or --title).");
    if (!flags.type) {
      throw new Error("spec add requires --type prd|user-journey|sre|research|adr|other.");
    }
    const { addSpec } = await import("./lib/spec-parser.mjs");
    return addSpec(repoPath, {
      type: flags.type,
      title,
      priority: flags.priority,
      target_release: flags.targetRelease,
      body: flags.body || "",
      config
    });
  },
  list: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    config: Record<string, any> | null
  ) => {
    const { listSpecs, filterSpecs } = await import("./lib/spec-parser.mjs");
    const specs = await listSpecs(repoPath, { config });
    const filtered = filterSpecs(specs, {
      status: flags.status,
      type: flags.type,
      priority: flags.priority,
      target_release: flags.targetRelease
    });
    return {
      count: filtered.length,
      specs: filtered.map((s) => ({
        id: s.id,
        type: s.frontmatter.type,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
        target_release: s.frontmatter.target_release,
        title: s.frontmatter.title,
        derived_features: s.frontmatter.derived_features || [],
        filePath: s.filePath
      }))
    };
  },
  decompose: async (
    repoPath: string,
    flags: Record<string, any>,
    rest: string[],
    config: Record<string, any> | null
  ) => {
    const specId = flags.id || rest[0];
    if (!specId) throw new Error("spec decompose requires --id SPEC-NNN.");

    // Fast path: caller supplied explicit feature list — skip architect entirely.
    if (flags.features || flags.featuresJson) {
      const entries = parseFeatureEntries(flags);
      const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
      const out = await decomposeSpec(repoPath, specId, entries, { config });
      const { publishFeat } = await importGithubSync("github-sync.mjs");
      for (const feat of out.created) {
        try {
          await (publishFeat as any)(repoPath, feat.id);
        } catch (e) {
          console.error(
            `[github] publish warning (spec decompose ${feat.id}): ${(e as Error).message}`
          );
        }
      }
      return out;
    }

    if (flags.noArchitect) {
      console.error(
        "[spec decompose] --no-architect is deprecated and now a no-op (see DEC-011). " +
          "Architect auto-dispatch is already removed."
      );
    }

    // No --features / --features-json supplied: refuse with clear message.
    const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
    await appendAuditLog(repoPath, {
      timestamp: new Date().toISOString(),
      agent: "loop:architect",
      parentCommand: "spec-decompose",
      ok: false,
      skipped: true,
      skipReason: "cli-refusal-architect-disabled",
      durationMs: 0
    });
    const msg =
      `[spec decompose] architect auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /loop:spec-decompose --id ${specId}, ` +
      `or pass --features 'Title 1; Title 2; ...'`;
    console.error(msg);
    process.exitCode = 1;
    return { error: "architect auto-dispatch removed; pass --features or use slash flow" };
  },
  status: async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    config: Record<string, any> | null
  ) => {
    const { specSatisfaction, reconcileSpecStatus } = await import("./lib/linkage.mjs");
    const before = await specSatisfaction(repoPath, { config });
    const reconciled = await reconcileSpecStatus(repoPath, { config });
    return { satisfaction: before, statusChanges: reconciled };
  }
};

async function runSpecSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("spec requires a subcommand: add | list | decompose | status");
  const handler = (SPEC_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown spec subcommand: ${sub}`);
  return handler(repoPath, flags, rest, config);
}

async function runReleaseSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub] = positionals;
  if (!sub) throw new Error("release requires a subcommand: plan | status");
  const { planRelease, releaseStatus } = await import("./lib/release-planner.mjs");
  if (sub === "plan") {
    if (!flags.version) throw new Error("release plan requires --version vX.Y.Z");
    return await planRelease(repoPath, { version: flags.version, config });
  }
  if (sub === "status") {
    if (!flags.version) throw new Error("release status requires --version vX.Y.Z");
    return await releaseStatus(repoPath, { version: flags.version, config });
  }
  throw new Error(`Unknown release subcommand: ${sub}`);
}

// Resolves a required ID flag/positional or throws. Centralizes the
// "missing --id" error shape across slice subcommands.
function requireId(value: string | null | undefined, errMsg: string): string {
  if (!value) throw new Error(errMsg);
  return value;
}

const SLICE_HANDLERS = {
  "from-feature": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    featureId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(featureId, "slice from-feature requires --id FEAT-NNN.");
    const { sliceFromFeature } = await import("./lib/slice-linker.mjs");
    const { dispatchAgent, appendAuditLog } = await import("./lib/auto-dispatch.mjs");
    const { DecompositionRequiredError, InvalidProposedSlicesError } =
      await import("./lib/proposed-slices.mjs");
    const dispatchFn = opts.dispatchFn ?? dispatchAgent;
    let out;
    try {
      out = await sliceFromFeature(repoPath, featureId, {
        noClassify: Boolean(flags.noClassify),
        dispatchFn,
        config: opts.config
      });
    } catch (err) {
      if (err instanceof DecompositionRequiredError || err instanceof InvalidProposedSlicesError) {
        await appendAuditLog(repoPath, {
          timestamp: new Date().toISOString(),
          parentCommand: "slice from-feature",
          featureId,
          error: (err as Error).message,
          ok: false,
          skipped: false
        });
      }
      throw err;
    }
    const { publishSlice } = await importGithubSync("github-sync.mjs");
    const slicesList = Array.isArray((out as any).slices) ? (out as any).slices : [out.slice];
    for (const sl of slicesList) {
      try {
        await (publishSlice as any)(repoPath, sl.id, featureId);
      } catch (e) {
        console.error(`[github] publish warning (slice from-feature): ${(e as Error).message}`);
      }
    }
    const { logEvent } = await import("./lib/telemetry.mjs");
    for (const sl of slicesList) {
      await logEvent(repoPath, {
        command: "slice from-feature",
        feature: featureId,
        slice: sl.id
      });
    }
    return out;
  },
  grade: async (repoPath: string, flags: Record<string, any>, _rest: string[], sliceId: string) => {
    requireId(sliceId, "slice grade requires --id SLICE-NN.");
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { createGradeFile } = await import("./lib/grade-writer.mjs");
    const out = await createGradeFile(cwd, sliceId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "slice grade", slice: sliceId, created: out.created });
    return out;
  },
  "grade-write": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string
  ) => {
    requireId(sliceId, "slice grade-write requires --id SLICE-NN.");
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeGrade } = await import("./lib/grade-writer.mjs");
    return writeGrade(cwd, sliceId);
  },
  close: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice close requires --id SLICE-NN.");
    if (flags.noMerge && flags.dryRun) {
      throw new Error("slice close: --no-merge and --dry-run are mutually exclusive.");
    }
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { closeSlice } = await import("./lib/slice-linker.mjs");
    const out = await closeSlice(cwd, sliceId, {
      gradeYamlPath: flags.gradeYaml || null,
      keepFeatureOpen: Boolean(flags.keepFeatureOpen),
      forceClose: Boolean(flags.forceClose),
      skipValidationCheck: flags.skipValidationCheck || null,
      noDocWriter: Boolean(flags.noDocWriter),
      noMerge: Boolean(flags.noMerge),
      dryRun: Boolean(flags.dryRun),
      skipSimplify: Boolean(flags.skipSimplify),
      config: opts.config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "slice close",
      slice: sliceId,
      scaffoldOnly: out.scaffoldOnly,
      gradeYamlProvided: Boolean(flags.gradeYaml)
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(cwd, sliceId);
    return out;
  },
  complete: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice complete requires --id SLICE-NN.");
    // SLICE-64: --no-merge and --dry-run are mutually exclusive
    if (flags.noMerge && flags.dryRun) {
      throw new Error("slice complete: --no-merge and --dry-run are mutually exclusive.");
    }
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { completeSlice } = await import("./lib/slice-linker.mjs");
    const out = await completeSlice(cwd, sliceId, {
      keepFeatureOpen: Boolean(flags.keepFeatureOpen),
      forceClose: Boolean(flags.forceClose),
      skipValidationCheck: flags.skipValidationCheck || null,
      noDocWriter: Boolean(flags.noDocWriter),
      // SLICE-64 additions:
      noMerge: Boolean(flags.noMerge),
      dryRun: Boolean(flags.dryRun),
      skipSimplify: Boolean(flags.skipSimplify),
      config: opts.config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "slice complete",
      slice: sliceId,
      feature: (out as any).feature?.id || null,
      spec_status_changes: out.specStatusChanges?.length || 0,
      handoff_written: Boolean(out.handoff?.handoffPath),
      validation_gate_satisfied: Boolean(out.validationGate?.satisfied),
      validation_skipped_via_flag: Boolean(flags.skipValidationCheck)
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(cwd, sliceId);
    return out;
  },
  start: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice start requires --id SLICE-NN.");
    const { startSlice } = await import("./lib/slice-linker.mjs");
    const out = await startSlice(repoPath, sliceId, {
      goal: flags.goal || null,
      dispatch: flags.noDispatch !== true,
      config: opts.config ?? null
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice start",
      slice: sliceId,
      run_brief_written: Boolean(out.runBrief?.runBriefPath || out.runBrief?.artifactPath),
      slice_progress_written: Boolean(out.sliceProgress?.path),
      dispatch: out.dispatchInstruction ? "crew-build" : "inline"
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(repoPath, sliceId);
    return out;
  },
  link: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    const id = requireId(flags.id || sliceId, "slice link requires --id SLICE-NN.");
    if (!flags.artifact) throw new Error("slice link requires --artifact <path>.");
    if (!flags.kind) throw new Error("slice link requires --kind reviews|validations|deployments.");
    const { linkArtifactToSlice } = await import("./lib/artifact-linkage.mjs");
    return linkArtifactToSlice(repoPath, {
      sliceId: id,
      artifactPath: flags.artifact,
      kind: flags.kind,
      config: opts.config
    });
  },
  "review-ladder": async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice review-ladder requires --id SLICE-NN.");
    const { buildReviewLadder } = await import("./lib/reviewer-ladder.mjs");
    return buildReviewLadder(repoPath, sliceId, { config: opts.config ?? null });
  },
  "post-builder-fanout": async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice post-builder-fanout requires --id SLICE-NN.");
    const { buildPostBuilderFanout } = await import("./lib/post-builder-fanout.mjs");
    const result = await buildPostBuilderFanout(repoPath, sliceId, { config: opts.config ?? null });
    const { writeFanoutMarker } = await import("./lib/fanout-marker.mjs");
    await writeFanoutMarker(repoPath, sliceId, result.tasks.length); // best-effort
    return result;
  },
  plan: async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice plan requires --id SLICE-NN.");
    const { runPlanPreflight } = await import("./lib/slice-plan.mjs");
    const out = await runPlanPreflight(repoPath, sliceId, { config: opts.config ?? null });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice plan",
      slice: sliceId,
      plan_path: out.planPath,
      files_researched: out.filesResearched.length
    });
    return out;
  }
};

async function runSliceSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "slice requires a subcommand: from-feature | start | grade | grade-write | complete | link | review-ladder | post-builder-fanout | plan"
    );
  const handler = (SLICE_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown slice subcommand: ${sub}`);
  const id = flags.id || rest[0];
  return handler(repoPath, flags, rest, id, opts);
}

async function runDecisionsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("decisions requires a subcommand: list | show");
  const { listDecisions, showDecision } = await import("./lib/decisions-store.mjs");
  if (sub === "list") {
    const decisions = await listDecisions(repoPath, { status: flags.status, config });
    return {
      count: decisions.length,
      decisions: decisions.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        introduced_by_slice: d.introduced_by_slice,
        introduced_at: d.introduced_at,
        superseded_by: d.superseded_by,
        filePath: d.filePath
      }))
    };
  }
  if (sub === "show") {
    const decId = flags.id || rest[0];
    if (!decId) throw new Error("decisions show requires --id DEC-NNN.");
    const dec = await showDecision(repoPath, decId, { config });
    if (!dec) throw new Error(`Decision not found: ${decId}`);
    return dec;
  }
  if (sub === "supersede") {
    const { supersedeDecision } = await import("./lib/decisions-store.mjs");
    if (!flags.id || !flags.by)
      throw new Error("decisions supersede requires --id DEC-OLD --by DEC-NEW");
    const out = await supersedeDecision(repoPath, { oldId: flags.id, newId: flags.by, config });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "decisions supersede", old: flags.id, new: flags.by });
    return out;
  }
  if (sub === "relevant") {
    const { findRelevantDecisions } = await import("./lib/decisions-store.mjs");
    if (!flags.files) throw new Error('decisions relevant requires --files "a.cs,b.cs,..."');
    const files = flags.files
      .split(",")
      .map((f: string) => f.trim())
      .filter(Boolean);
    const matches = await findRelevantDecisions(repoPath, files, { config });
    return { count: matches.length, decisions: matches };
  }
  throw new Error(`Unknown decisions subcommand: ${sub}`);
}

async function runFeatureSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, featId] = positionals;
  if (!sub) throw new Error("feature requires a subcommand: simplify");
  if (sub !== "simplify") throw new Error(`Unknown feature subcommand: ${sub}`);
  if (!featId) throw new Error("feature simplify requires a feature ID: feature simplify FEAT-NNN");
  const id = (flags.id as string | null) || featId;
  const { featureSimplify } = await import("./lib/slice-linker/feature-lifecycle.mjs");
  const opts: Record<string, any> = {
    skipSimplify: flags.skipSimplify as boolean,
    config
  };
  if (flags.slice) opts.sliceId = flags.slice as string;
  if (flags.since) opts.startedAt = flags.since as string;
  return featureSimplify(repoPath, id, opts);
}

async function runLearningsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>
) {
  const [sub] = positionals;
  if (!sub) throw new Error("learnings requires a subcommand: log | recent");
  const { logLearning, recentLearnings } = await import("./lib/learnings.mjs");
  if (sub === "log") {
    if (!flags.key) throw new Error("learnings log requires --key <key>");
    if (!flags.insight) throw new Error("learnings log requires --insight <insight>");
    const entry: any = { key: flags.key, insight: flags.insight, source: "agent" };
    if (flags.confidence !== null && flags.confidence !== undefined) {
      const conf = Number(flags.confidence);
      if (!Number.isNaN(conf)) entry.confidence = conf;
    }
    if (flags.slice) entry.sliceId = flags.slice;
    return logLearning(repoPath, entry);
  }
  if (sub === "recent") {
    const limit = flags.limit !== null && flags.limit !== undefined ? Number(flags.limit) : 3;
    return recentLearnings(repoPath, limit);
  }
  throw new Error(`Unknown learnings subcommand: ${sub}`);
}

async function runGithubSubcommand(repoPath: any, positionals: any, flags: any) {
  const [sub] = positionals;
  const { publishAll, publishFeat, syncMilestones, setupGithubSync } =
    await importGithubSync("github-sync.mjs");
  if (sub === "setup") {
    const result = await (setupGithubSync as any)(repoPath);
    console.log("[github-sync] Setup complete. Run 'github publish' next.");
    return result;
  }
  if (sub === "publish") return (publishAll as any)(repoPath);
  if (sub === "feat-publish") {
    const featId = flags?.id || positionals[1];
    if (!featId) throw new Error("github feat-publish requires --id FEAT-NNN.");
    const result = await (publishFeat as any)(repoPath, featId);
    if (!result) {
      console.log("[github-sync] GitHub sync disabled — skipped.");
      return { skipped: true };
    }
    console.log(
      result.created
        ? `Published: #${result.issueNum} ${result.url}`
        : `Already published: #${result.issueNum}`
    );
    return result;
  }
  if (sub === "status") return (syncMilestones as any)(repoPath);
  if (sub === "sync" || sub === "bootstrap") {
    const { resolveConfig } = await import("./lib/config-resolver.mjs");
    const { getProvider } = await import("./lib/task-store/index.mjs");
    const config = await resolveConfig(repoPath);
    const provider = getProvider(config, repoPath);
    console.log(`[task-store] provider: ${provider.constructor.name}`);
    return sub === "sync" ? provider.syncPull(repoPath) : provider.bootstrap(repoPath);
  }
  throw new Error(
    "github requires a subcommand: setup | publish | feat-publish | sync | status | bootstrap"
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

```

### src/tests/cost-by-skill.test.mts

```
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  readDispatchLog,
  aggregateBySkill,
  computeDeltaPercent,
  formatCostBySkillReport,
  buildCostBySkillReport,
  DISPATCH_LOG_REL
} from "../scripts/lib/cost-by-skill.mjs";

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeDispatchLog(dir: string, lines: object[]): Promise<string> {
  const logPath = path.join(dir, DISPATCH_LOG_REL);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
  return logPath;
}

// --- readDispatchLog ---

test("readDispatchLog returns empty array on missing file", async () => {
  const dir = await tmpDir("cbs-missing-");
  const result = await readDispatchLog(path.join(dir, "nonexistent.jsonl"));
  assert.deepEqual(result, []);
});

test("readDispatchLog returns empty array on empty file", async () => {
  const dir = await tmpDir("cbs-empty-");
  const logPath = path.join(dir, "log.jsonl");
  await fs.writeFile(logPath, "", "utf8");
  const result = await readDispatchLog(logPath);
  assert.deepEqual(result, []);
});

test("readDispatchLog parses well-formed entries", async () => {
  const dir = await tmpDir("cbs-parse-");
  const logPath = await writeDispatchLog(dir, [
    { timestamp: "2026-06-06T10:00:00.000Z", agent: "loop:researcher", costUsd: 0.05 },
    { timestamp: "2026-06-06T11:00:00.000Z", agent: "loop:architect", costUsd: 0.12 }
  ]);
  const entries = await readDispatchLog(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]!.agent, "loop:researcher");
  assert.equal(entries[0]!.costUsd, 0.05);
  assert.equal(entries[1]!.agent, "loop:architect");
});

test("readDispatchLog handles missing/null skill_name gracefully (AC-3)", async () => {
  const dir = await tmpDir("cbs-null-agent-");
  const logPath = await writeDispatchLog(dir, [
    { timestamp: "2026-06-06T10:00:00.000Z", agent: null, costUsd: 0.01 },
    { timestamp: "2026-06-06T11:00:00.000Z", costUsd: 0.02 },
    { timestamp: "2026-06-06T12:00:00.000Z", agent: "loop:pm", costUsd: 0.03 }
  ]);
  const entries = await readDispatchLog(logPath);
  assert.equal(entries.length, 3);
  assert.equal(entries[0]!.agent, null);
  assert.equal(entries[1]!.agent, null);
  assert.equal(entries[2]!.agent, "loop:pm");
});

test("readDispatchLog skips malformed JSON lines without throwing (AC-3)", async () => {
  const dir = await tmpDir("cbs-malformed-");
  const logPath = path.join(dir, "log.jsonl");
  await fs.writeFile(
    logPath,
    [
      JSON.stringify({ timestamp: "2026-06-06T10:00:00.000Z", agent: "loop:pm", costUsd: 0.05 }),
      "not valid json {{{",
      JSON.stringify({
        timestamp: "2026-06-06T11:00:00.000Z",
        agent: "loop:architect",
        costUsd: 0.1
      })
    ].join("\n") + "\n",
    "utf8"
  );
  const entries = await readDispatchLog(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]!.agent, "loop:pm");
  assert.equal(entries[1]!.agent, "loop:architect");
});

test("readDispatchLog treats null costUsd as null (not zero)", async () => {
  const dir = await tmpDir("cbs-null-cost-");
  const logPath = await writeDispatchLog(dir, [
    { timestamp: "2026-06-06T10:00:00.000Z", agent: "loop:researcher", costUsd: null }
  ]);
  const entries = await readDispatchLog(logPath);
  assert.equal(entries[0]!.costUsd, null);
});

// --- aggregateBySkill ---

test("aggregateBySkill returns empty array on empty entries (AC-4 edge case)", () => {
  const rows = aggregateBySkill([]);
  assert.deepEqual(rows, []);
});

test("aggregateBySkill buckets by agent name correctly (AC-4)", () => {
  // Use a fixed 'now' so window logic is deterministic
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const threeDaysAgo = new Date("2026-06-10T12:00:00.000Z").toISOString();
  const twentyDaysAgo = new Date("2026-05-24T12:00:00.000Z").toISOString();

  const entries = [
    { timestamp: threeDaysAgo, agent: "loop:researcher", costUsd: 0.1 },
    { timestamp: threeDaysAgo, agent: "loop:researcher", costUsd: 0.2 },
    { timestamp: threeDaysAgo, agent: "loop:architect", costUsd: 0.5 },
    { timestamp: twentyDaysAgo, agent: "loop:researcher", costUsd: 0.05 }
  ];

  const rows = aggregateBySkill(entries, 28, now);
  assert.equal(rows.length, 2);

  const researcher = rows.find((r) => r.skillName === "loop:researcher")!;
  assert.ok(researcher, "loop:researcher row should exist");
  // currentWeekUsd: entries within last 7 days (threeDaysAgo qualifies)
  assert.ok(
    Math.abs(researcher.currentWeekUsd - 0.3) < 0.0001,
    `currentWeekUsd should be ~0.30, got ${researcher.currentWeekUsd}`
  );
  // windowTotal over 28 days: 0.10 + 0.20 + 0.05 = 0.35; avg per week = 0.35/4 = 0.0875
  assert.ok(Math.abs(researcher.fourWeekAvgUsd - 0.0875) < 0.0001, "fourWeekAvgUsd mismatch");
  assert.equal(researcher.entryCount, 3);
});

test("aggregateBySkill handles null/missing agent as (unknown) bucket", () => {
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const recentTs = new Date("2026-06-10T12:00:00.000Z").toISOString();

  const entries = [
    { timestamp: recentTs, agent: null as string | null, costUsd: 0.05 },
    { timestamp: recentTs, agent: undefined as unknown as string, costUsd: 0.07 },
    { timestamp: recentTs, agent: "loop:pm", costUsd: 0.1 }
  ];

  const rows = aggregateBySkill(entries, 28, now);
  const unknown = rows.find((r) => r.skillName === "(unknown)");
  assert.ok(unknown, "(unknown) row should exist for null/missing agent");
  assert.equal(unknown!.entryCount, 2);
});

test("aggregateBySkill excludes entries older than windowDays", () => {
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const oldTs = new Date("2026-05-10T12:00:00.000Z").toISOString(); // > 28 days ago

  const entries = [{ timestamp: oldTs, agent: "loop:researcher", costUsd: 0.5 }];

  const rows = aggregateBySkill(entries, 28, now);
  assert.deepEqual(rows, [], "entries older than window should be excluded");
});

test("aggregateBySkill null costUsd counts as 0 spend", () => {
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const recentTs = new Date("2026-06-10T12:00:00.000Z").toISOString();

  const entries = [
    { timestamp: recentTs, agent: "loop:researcher", costUsd: null as number | null }
  ];

  const rows = aggregateBySkill(entries, 28, now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.currentWeekUsd, 0);
  assert.equal(rows[0]!.fourWeekAvgUsd, 0);
});

// --- computeDeltaPercent ---

test("computeDeltaPercent returns null when baseline is zero (AC-4)", () => {
  assert.equal(computeDeltaPercent(0.5, 0), null);
  assert.equal(computeDeltaPercent(0, 0), null);
});

test("computeDeltaPercent returns positive delta when current > baseline (AC-4)", () => {
  const delta = computeDeltaPercent(1.5, 1.0);
  assert.ok(delta !== null);
  assert.ok(Math.abs(delta - 50) < 0.001, `expected 50, got ${delta}`);
});

test("computeDeltaPercent returns negative delta when current < baseline (AC-4)", () => {
  const delta = computeDeltaPercent(0.5, 1.0);
  assert.ok(delta !== null);
  assert.ok(Math.abs(delta - -50) < 0.001, `expected -50, got ${delta}`);
});

test("computeDeltaPercent returns zero when current equals baseline (AC-4)", () => {
  const delta = computeDeltaPercent(1.0, 1.0);
  assert.ok(delta !== null);
  assert.equal(delta, 0);
});

// --- formatCostBySkillReport ---

test("formatCostBySkillReport returns no-data message on empty rows", () => {
  const report = formatCostBySkillReport([]);
  assert.ok(report.includes("No dispatch log"), `unexpected: ${report}`);
});

test("formatCostBySkillReport includes skill name, spend, and delta", () => {
  const rows = [
    {
      skillName: "loop:researcher",
      currentWeekUsd: 0.3,
      fourWeekAvgUsd: 0.25,
      deltaPercent: 20.0,
      entryCount: 5
    }
  ];
  const report = formatCostBySkillReport(rows);
  assert.ok(report.includes("loop:researcher"), "should include skill name");
  assert.ok(report.includes("$0.3000"), "should include current week spend");
  assert.ok(report.includes("+20.0%"), "should include positive delta");
});

test("formatCostBySkillReport shows n/a when delta is null (zero baseline)", () => {
  const rows = [
    {
      skillName: "crew:reviewer",
      currentWeekUsd: 0.1,
      fourWeekAvgUsd: 0,
      deltaPercent: null,
      entryCount: 1
    }
  ];
  const report = formatCostBySkillReport(rows);
  assert.ok(report.includes("n/a"), "should include n/a for null delta");
});

test("formatCostBySkillReport respects topN limit", () => {
  const rows = [
    {
      skillName: "loop:researcher",
      currentWeekUsd: 0.3,
      fourWeekAvgUsd: 0.25,
      deltaPercent: 20.0,
      entryCount: 5
    },
    {
      skillName: "loop:architect",
      currentWeekUsd: 0.2,
      fourWeekAvgUsd: 0.15,
      deltaPercent: 33.3,
      entryCount: 3
    },
    {
      skillName: "loop:pm",
      currentWeekUsd: 0.1,
      fourWeekAvgUsd: 0.08,
      deltaPercent: 25.0,
      entryCount: 2
    }
  ];
  const report = formatCostBySkillReport(rows, 2);
  assert.ok(report.includes("loop:researcher"), "should include first row");
  assert.ok(report.includes("loop:architect"), "should include second row");
  assert.ok(!report.includes("loop:pm"), "should exclude third row (topN=2)");
});

// --- buildCostBySkillReport (integration) ---

test("buildCostBySkillReport returns no-data message on missing log", async () => {
  const dir = await tmpDir("cbs-integration-empty-");
  const report = await buildCostBySkillReport(dir);
  assert.ok(report.includes("No dispatch log"), `unexpected: ${report}`);
});

test("buildCostBySkillReport aggregates from synthetic jsonl (AC-4)", async () => {
  const dir = await tmpDir("cbs-integration-");
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const recentTs = new Date("2026-06-10T12:00:00.000Z").toISOString();

  await writeDispatchLog(dir, [
    { timestamp: recentTs, agent: "loop:researcher", costUsd: 0.1 },
    { timestamp: recentTs, agent: "loop:pm", costUsd: 0.05 }
  ]);

  const report = await buildCostBySkillReport(dir, { now });
  assert.ok(report.includes("loop:researcher"), "should include loop:researcher");
  assert.ok(report.includes("loop:pm"), "should include loop:pm");
});

```

## Files read

