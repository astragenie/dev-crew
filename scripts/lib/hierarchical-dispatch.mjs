// FEAT-020 SLICE-1 — Hierarchical parallel subagent dispatch primitive (barrel + orchestrator).
// Spec: docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md
export * from "./dispatch-types.mjs";
export * from "./dispatch-config.mjs";
export * from "./dispatch-gates.mjs";
export * from "./dispatch-prompt.mjs";
export * from "./dispatch-trace.mjs";
export * from "./dispatch-worktree.mjs";
export * from "./dispatch-batch.mjs";
export * from "./dispatch-aggregate.mjs";
export * from "./dispatch-merge.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { readDispatchConfig } from "./dispatch-config.mjs";
import { checkDepth, checkFanout, checkUniqueIds } from "./dispatch-gates.mjs";
import { preflightGitClean, createChildWorktree } from "./dispatch-worktree.mjs";
import { buildAgentBatch } from "./dispatch-batch.mjs";
import { aggregateResults } from "./dispatch-aggregate.mjs";
import { appendTrace } from "./dispatch-trace.mjs";
import { mergeChildren } from "./dispatch-merge.mjs";
export function prepareDispatch(plans, opts) {
    const cfg = readDispatchConfig(opts.configPath ?? path.join(opts.repoRoot, ".claude/loop.json"));
    checkDepth(opts.depth, cfg);
    checkFanout(plans, cfg);
    checkUniqueIds(plans);
    preflightGitClean(opts.repoRoot, opts.parentBranch);
    const runId = `${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
    const depth = typeof opts.depth === "number" ? opts.depth : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
    const branchById = {};
    const cwdById = {};
    for (const plan of plans) {
        const spawn = createChildWorktree({
            repoRoot: opts.repoRoot,
            parentBranch: opts.parentBranch,
            childId: plan.id,
            depth,
            runId
        });
        branchById[plan.id] = spawn.branch;
        cwdById[plan.id] = spawn.worktreePath;
    }
    const batch = buildAgentBatch(plans, {
        runId,
        depth,
        childCwdById: cwdById,
        childBranchById: branchById
    });
    const startTimes = {};
    for (const plan of plans)
        startTimes[plan.id] = Date.now();
    return { runId, batch, branchById, cwdById, startTimes };
}
export function finalizeDispatch(repoRoot, parentBranch, prepared, plans, depth) {
    const { runId, branchById, cwdById, startTimes } = prepared;
    let results = aggregateResults(repoRoot, runId, plans, branchById, cwdById);
    for (const r of results) {
        appendTrace(repoRoot, runId, {
            depth,
            childId: r.id,
            status: r.status,
            durationMs: Date.now() - (startTimes[r.id] ?? Date.now()),
            costUsd: r.costUsd ?? null
        });
    }
    results = mergeChildren(repoRoot, parentBranch, results, plans);
    writeSummary(repoRoot, runId, parentBranch, depth, results);
    return results;
}
function writeSummary(repoRoot, runId, parentBranch, depth, results) {
    const lines = [
        `# Dispatch run ${runId}`,
        "",
        `- parent branch: \`${parentBranch}\``,
        `- depth: ${depth}`,
        `- children: ${results.length}`,
        "",
        "| id | status | branch | worktree | error |",
        "|----|--------|--------|----------|-------|",
        ...results.map((r) => `| ${r.id} | ${r.status} | \`${r.branch}\` | \`${r.worktreePath}\` | ${r.error ?? ""} |`),
        ""
    ];
    fs.writeFileSync(path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, "summary.md"), lines.join("\n"));
}
export async function dispatchHierarchical(plans, opts, runAgentBatch) {
    const prepared = prepareDispatch(plans, opts);
    await runAgentBatch(prepared.batch, {
        runId: prepared.runId,
        branchById: prepared.branchById,
        cwdById: prepared.cwdById
    });
    const depth = typeof opts.depth === "number" ? opts.depth : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
    return finalizeDispatch(opts.repoRoot, opts.parentBranch, prepared, plans, depth);
}
