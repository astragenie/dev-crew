#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  prepareDispatch,
  finalizeDispatch,
  augmentPrompt,
  type DispatchPlan,
  type DispatchResult,
  type PreparedDispatch
} from "./lib/hierarchical-dispatch.mjs";
import {
  writeDispatchMetrics,
  readDispatchMetrics,
  formatPartialChildrenNote
} from "./lib/dispatch-metrics.mjs";
import { aggregateDispatchCost } from "./lib/dispatch-cost-aggregate.mjs";

type ParsedArgs = {
  subcommand: "prepare" | "finalize" | "metrics" | "prune" | "help";
  planPath?: string;
  parentBranch?: string;
  repo?: string;
  depth?: number;
  dryRun?: boolean;
  json?: boolean;
  runId?: string;
  configPath?: string;
  pr?: boolean;
  olderThanDays?: number;
};

const VALUE_FLAGS: Record<string, keyof ParsedArgs> = {
  "--plan": "planPath",
  "--parent-branch": "parentBranch",
  "--repo": "repo",
  "--run-id": "runId",
  "--config": "configPath",
  "--older-than-days": "olderThanDays"
};

function parseArgs(argv: string[]): ParsedArgs {
  const [subcommand, ...rest] = argv;
  const args: ParsedArgs = {
    subcommand: (subcommand as ParsedArgs["subcommand"]) ?? "help"
  };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i] as string;
    const next = rest[i + 1];
    if (flag in VALUE_FLAGS) {
      if (next !== undefined) {
        (args as Record<string, unknown>)[VALUE_FLAGS[flag] as string] = next;
      }
      i++;
      continue;
    }
    if (flag === "--depth") {
      if (next !== undefined) args.depth = Number(next);
      i++;
      continue;
    }
    if (flag === "--older-than-days") {
      if (next !== undefined) args.olderThanDays = Number(next);
      i++;
      continue;
    }
    if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--json") args.json = true;
    else if (flag === "--pr") args.pr = true;
    else if (flag === "--help" || flag === "-h") args.subcommand = "help";
  }
  return args;
}

function readPlanFile(planPath: string): DispatchPlan[] {
  let raw: string;
  if (planPath === "-") {
    raw = fs.readFileSync(0, "utf8");
  } else {
    raw = fs.readFileSync(planPath, "utf8");
  }
  const parsed = JSON.parse(raw) as { plans: DispatchPlan[] };
  return parsed.plans;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  bun src/scripts/dispatch.mts prepare --plan <path|-> --parent-branch <name> [--repo <path>] [--depth N] [--dry-run] [--json]
  bun src/scripts/dispatch.mts finalize --run-id <id> --parent-branch <name> --plan <path|-> [--repo <path>] [--depth N] [--pr]
  bun src/scripts/dispatch.mts metrics --run-id <id> [--repo <path>]
  bun src/scripts/dispatch.mts prune [--dry-run] [--older-than-days N] [--repo <path>]

Subcommands:
  prepare   Run pre-flight gates, spawn worktrees, build Agent batch.
            Outputs: human-readable preview (default), or batch JSON (--json).
  finalize  After the caller has invoked the Agent batch, aggregate results,
            merge children to parent branch, write summary.md.
            --pr  Also push each DONE child branch and open a GitHub PR via gh CLI.
  metrics   Read and print the dispatch-metrics.json for a completed run.
  prune     List and remove stale closed runId directories, their worktrees,
            and their branches. --dry-run lists candidates without touching disk.
            --older-than-days overrides loop.dispatch.pruneStaleAfterDays (default 7).

`);
}

function cmdPrepare(args: ParsedArgs): number {
  if (!args.planPath || !args.parentBranch) {
    process.stderr.write("--plan and --parent-branch are required\n");
    return 1;
  }
  const repo = args.repo ?? process.cwd();
  const plans = readPlanFile(args.planPath);
  if (args.dryRun) {
    const runId = "DRYRUN";
    const depth = args.depth ?? 0;
    for (const plan of plans) {
      const childBranch = `${args.parentBranch}-${plan.id}`;
      const childCwd = `<dry-run-cwd-${plan.id}>`;
      const augmented = augmentPrompt(plan.prompt, {
        runId,
        depth,
        childCwd,
        childBranch,
        childId: plan.id,
        repoRoot: repo
      });
      process.stdout.write(`=== dispatch ${plan.id} (${plan.agentType}) ===\n`);
      process.stdout.write(augmented);
      process.stdout.write("\n\n");
    }
    return 0;
  }
  const opts: import("./lib/dispatch-types.mjs").DispatchOptions = {
    parentBranch: args.parentBranch,
    repoRoot: repo
  };
  if (args.depth !== undefined) opts.depth = args.depth;
  if (args.configPath !== undefined) opts.configPath = args.configPath;
  const prepared = prepareDispatch(plans, opts);
  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          runId: prepared.runId,
          batch: prepared.batch,
          branchById: prepared.branchById,
          cwdById: prepared.cwdById
        },
        null,
        2
      )
    );
    return 0;
  }
  process.stdout.write(
    `Prepared run ${prepared.runId}\n` +
      `Worktrees spawned: ${Object.keys(prepared.cwdById).join(", ")}\n` +
      `Next: invoke Agent tool with the ${prepared.batch.length} calls, then run \`finalize --run-id ${prepared.runId}\`\n`
  );
  return 0;
}

function loadWorktreeLog(
  repo: string,
  runId: string
): { branchById: Record<string, string>; cwdById: Record<string, string> } {
  const wtLog = path.join(repo, ".claude/artifacts/loop/dispatch", runId, "worktrees.jsonl");
  const branchById: Record<string, string> = {};
  const cwdById: Record<string, string> = {};
  for (const line of fs.readFileSync(wtLog, "utf8").trim().split("\n")) {
    const e = JSON.parse(line);
    branchById[e.childId] = e.branch;
    cwdById[e.childId] = e.path;
  }
  return { branchById, cwdById };
}

// FEAT-220: real token/cost aggregation, scoped to this run's window.
// aggregateDispatchCost() never throws — it degrades to a zeroed,
// fully-partial aggregate on any read/parse failure so finalize can never
// fail because of telemetry.
async function writeFinalizeMetrics(
  repo: string,
  runId: string,
  plans: DispatchPlan[],
  prepared: PreparedDispatch,
  results: DispatchResult[]
): Promise<void> {
  const completedAt = new Date().toISOString();
  const allFailedOrBlocked = results.every((r) => r.status === "FAILED" || r.status === "BLOCKED");
  const startTimestamps = Object.values(prepared.startTimes);
  const startedAt = new Date(
    startTimestamps.length > 0 ? Math.min(...startTimestamps) : Date.now()
  ).toISOString();
  const costAggregate = await aggregateDispatchCost(plans, {
    repoRoot: repo,
    startedAt,
    completedAt
  });
  const status =
    allFailedOrBlocked || costAggregate.partialChildren.length > 0 ? "partial" : "complete";
  const model =
    costAggregate.model !== "unknown"
      ? costAggregate.model
      : (process.env["CLAUDE_MODEL"] ?? "unknown");
  writeDispatchMetrics(repo, runId, {
    runId,
    startedAt,
    completedAt,
    status,
    totalTokens: costAggregate.totalTokens,
    promptTokens: costAggregate.promptTokens,
    completionTokens: costAggregate.completionTokens,
    estimatedCostUsd: costAggregate.estimatedCostUsd,
    model,
    childCount: plans.length,
    partialChildren: costAggregate.partialChildren
  });
}

async function emitPrResults(results: DispatchResult[], repo: string): Promise<void> {
  const { dispatchFinalizePr } = await import("./lib/dispatch-pr-mode.mjs");
  const children = results.map((r) => ({
    branch: r.branch,
    worktreePath: r.worktreePath,
    status: (r.status === "DONE" ? "DONE" : r.status === "FAILED" ? "FAILED" : "SKIPPED") as
      | "DONE"
      | "FAILED"
      | "SKIPPED"
  }));
  const prResults = await dispatchFinalizePr(children, repo);
  for (const pr of prResults) {
    if (pr.prUrl) {
      process.stdout.write(`PR created: ${pr.branch} → ${pr.prUrl}\n`);
    } else {
      process.stderr.write(`PR failed for ${pr.branch}: ${pr.error ?? "unknown error"}\n`);
    }
  }
}

async function cmdFinalize(args: ParsedArgs): Promise<number> {
  if (!args.runId || !args.parentBranch || !args.planPath) {
    process.stderr.write("--run-id, --parent-branch, --plan are required\n");
    return 1;
  }
  const repo = args.repo ?? process.cwd();
  const plans = readPlanFile(args.planPath);
  const { branchById, cwdById } = loadWorktreeLog(repo, args.runId);
  const prepared: PreparedDispatch = {
    runId: args.runId,
    batch: [],
    branchById,
    cwdById,
    startTimes: Object.fromEntries(plans.map((p) => [p.id, Date.now()]))
  };
  const results = finalizeDispatch(repo, args.parentBranch, prepared, plans, args.depth ?? 0);
  const summary = path.join(repo, ".claude/artifacts/loop/dispatch", args.runId, "summary.md");
  process.stdout.write(`Summary: ${summary}\n`);

  await writeFinalizeMetrics(repo, args.runId, plans, prepared, results);

  if (args.pr) {
    await emitPrResults(results, repo);
  }

  const allFailed = results.every((r) => r.status === "FAILED" || r.status === "BLOCKED");
  if (allFailed) return 2;
  return 0;
}

function cmdMetrics(args: ParsedArgs): number {
  if (!args.runId) {
    process.stderr.write("--run-id is required\n");
    return 1;
  }
  const repo = args.repo ?? process.cwd();
  const metrics = readDispatchMetrics(repo, args.runId);
  if (!metrics) {
    process.stderr.write(`[dispatch-metrics] not found: ${args.runId}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
  const note = formatPartialChildrenNote(metrics);
  if (note) process.stdout.write(`${note}\n`);
  return 0;
}

async function cmdPrune(args: ParsedArgs): Promise<number> {
  const repo = args.repo ?? process.cwd();
  const dryRun = args.dryRun ?? false;

  // Resolve olderThanDays: flag > config > default
  let olderThanDays = args.olderThanDays;
  if (olderThanDays === undefined) {
    try {
      const { readDispatchConfig } = await import("./lib/dispatch-config.mjs");
      const cfgPath = path.join(repo, ".claude", "loop.json");
      const cfg = readDispatchConfig(cfgPath);
      olderThanDays = cfg.pruneStaleAfterDays;
    } catch {
      olderThanDays = 7;
    }
  }

  const { listStaleRunIds, pruneRunId } = await import("./lib/dispatch-prune.mjs");
  const stale = await listStaleRunIds(repo, olderThanDays);

  if (stale.length === 0) {
    process.stdout.write(`[dispatch prune] no stale runIds found (threshold: ${olderThanDays}d)\n`);
    return 0;
  }

  // Print report table
  process.stdout.write(
    `[dispatch prune] ${dryRun ? "DRY-RUN: " : ""}${stale.length} stale runId(s) (>${olderThanDays}d)\n`
  );
  process.stdout.write(
    `${"runId".padEnd(40)} ${"ageDays".padEnd(10)} ${"worktrees".padEnd(10)} branches\n`
  );
  process.stdout.write(`${"-".repeat(75)}\n`);
  for (const entry of stale) {
    process.stdout.write(
      `${entry.runId.padEnd(40)} ${entry.ageDays.toFixed(1).padEnd(10)} ${String(entry.worktreeCount).padEnd(10)} ${entry.branchCount}\n`
    );
  }

  if (dryRun) {
    process.stdout.write("[dispatch prune] --dry-run: no changes made\n");
    return 0;
  }

  let anyFailed = false;
  for (const entry of stale) {
    const result = await pruneRunId(repo, entry.runId);
    if (result.errors.length > 0) {
      anyFailed = true;
      for (const e of result.errors) {
        process.stderr.write(`[dispatch prune] error [${entry.runId}]: ${e}\n`);
      }
    } else {
      process.stderr.write(
        `[dispatch prune] pruned ${entry.runId} (worktrees=${result.worktreesRemoved}, branches=${result.branchesRemoved})\n`
      );
    }
  }

  return anyFailed ? 1 : 0;
}

const parsedArgs = parseArgs(process.argv.slice(2));
(async () => {
  try {
    switch (parsedArgs.subcommand) {
      case "prepare":
        process.exitCode = cmdPrepare(parsedArgs);
        break;
      case "finalize":
        process.exitCode = await cmdFinalize(parsedArgs);
        break;
      case "metrics":
        process.exitCode = cmdMetrics(parsedArgs);
        break;
      case "prune":
        process.exitCode = await cmdPrune(parsedArgs);
        break;
      case "help":
      default:
        printHelp();
        process.exitCode = 0;
    }
  } catch (err) {
    process.stderr.write(`[dispatch] ${(err as Error).name}: ${(err as Error).message}\n`);
    process.exitCode = 1;
  }
})();
