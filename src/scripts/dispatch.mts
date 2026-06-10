#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  prepareDispatch,
  finalizeDispatch,
  augmentPrompt,
  type DispatchPlan,
  type PreparedDispatch
} from "./lib/hierarchical-dispatch.mjs";

type ParsedArgs = {
  subcommand: "prepare" | "finalize" | "help";
  planPath?: string;
  parentBranch?: string;
  repo?: string;
  depth?: number;
  dryRun?: boolean;
  json?: boolean;
  runId?: string;
  configPath?: string;
};

const VALUE_FLAGS: Record<string, keyof ParsedArgs> = {
  "--plan": "planPath",
  "--parent-branch": "parentBranch",
  "--repo": "repo",
  "--run-id": "runId",
  "--config": "configPath"
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
    if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--json") args.json = true;
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
  bun src/scripts/dispatch.mts finalize --run-id <id> --parent-branch <name> --plan <path|-> [--repo <path>] [--depth N]

Subcommands:
  prepare   Run pre-flight gates, spawn worktrees, build Agent batch.
            Outputs: human-readable preview (default), or batch JSON (--json).
  finalize  After the caller has invoked the Agent batch, aggregate results,
            merge children to parent branch, write summary.md.

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
        childId: plan.id
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

function cmdFinalize(args: ParsedArgs): number {
  if (!args.runId || !args.parentBranch || !args.planPath) {
    process.stderr.write("--run-id, --parent-branch, --plan are required\n");
    return 1;
  }
  const repo = args.repo ?? process.cwd();
  const plans = readPlanFile(args.planPath);
  const wtLog = path.join(repo, ".claude/artifacts/loop/dispatch", args.runId, "worktrees.jsonl");
  const branchById: Record<string, string> = {};
  const cwdById: Record<string, string> = {};
  for (const line of fs.readFileSync(wtLog, "utf8").trim().split("\n")) {
    const e = JSON.parse(line);
    branchById[e.childId] = e.branch;
    cwdById[e.childId] = e.path;
  }
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
  const allFailed = results.every((r) => r.status === "FAILED" || r.status === "BLOCKED");
  if (allFailed) return 2;
  return 0;
}

const parsedArgs = parseArgs(process.argv.slice(2));
try {
  switch (parsedArgs.subcommand) {
    case "prepare":
      process.exitCode = cmdPrepare(parsedArgs);
      break;
    case "finalize":
      process.exitCode = cmdFinalize(parsedArgs);
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
