import fs from "node:fs/promises";
import path from "node:path";
import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { checkStopConditions } from "./stop-conditions.mjs";
// Priority ordering for sort tiebreaker (lower index = higher rank).
const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];
/**
 * Compare two backlog entries for walker ordering:
 *   1. composite_score DESC (default 0)
 *   2. priority ascending by rank (P0 > P1 > P2 > P3; missing treated as P3)
 *   3. pm_strategic_fit DESC (default 0)
 */
function compareWalkerOrder(a, b) {
    const scoreA = Number(a.frontmatter.composite_score) || 0;
    const scoreB = Number(b.frontmatter.composite_score) || 0;
    if (scoreB !== scoreA)
        return scoreB - scoreA;
    const prA = PRIORITY_ORDER.indexOf(a.frontmatter.priority || "P3");
    const prB = PRIORITY_ORDER.indexOf(b.frontmatter.priority || "P3");
    const rankA = prA === -1 ? PRIORITY_ORDER.length : prA;
    const rankB = prB === -1 ? PRIORITY_ORDER.length : prB;
    if (rankA !== rankB)
        return rankA - rankB;
    const fitA = Number(a.frontmatter.pm_strategic_fit) || 0;
    const fitB = Number(b.frontmatter.pm_strategic_fit) || 0;
    return fitB - fitA;
}
/**
 * SLICE-B: Evaluate risk gate for autonomous_safe=false items.
 *
 * Returns { skip, skipReason?, warn? }:
 *   - deferred flag → skip with reason "deferred"
 *   - unfinished depends_on → skip with reason listing deps
 *   - pm_risk_level >= 0.7 → do NOT skip, but warn (SPEC recommended)
 *   - otherwise → do not skip, no warn
 *
 * @param entry  The backlog entry to evaluate.
 */
export function evaluateRiskGate(entry) {
    const fm = entry.frontmatter;
    // Honor deferred flag
    if (fm.deferred === true) {
        return { skip: true, skipReason: "deferred" };
    }
    // Unfinished dependencies
    if (Array.isArray(fm.depends_on) && fm.depends_on.length > 0) {
        return {
            skip: true,
            skipReason: `depends_on: ${fm.depends_on.join(", ")}`
        };
    }
    // High risk → warn but don't skip (SPEC requirement check handled at orchestrator layer)
    if (Number(fm.pm_risk_level) >= 0.7) {
        return {
            skip: false,
            warn: `pm_risk_level ${fm.pm_risk_level} — SPEC recommended`
        };
    }
    return { skip: false };
}
/**
 * Process an entry with autonomous_safe=false and determine if it should be
 * skipped or planned. Returns { shouldSkip, plan?, skipReason? }
 */
function processUnsafeEntry(entry, autoMode) {
    const riskResult = evaluateRiskGate(entry);
    if (riskResult.skip) {
        return { shouldSkip: true, skipReason: riskResult.skipReason || "risk gate blocked" };
    }
    const plan = {
        featureId: entry.id,
        suggestedSliceTitle: `Implement ${entry.id}: ${extractTitle(entry)}`,
        fromFeatureCmd: `node scripts/loop.mjs slice from-feature --id ${entry.id}`,
        startCmd: `node scripts/loop.mjs slice start --id SLICE-<TBD>`,
        builderPrompt: buildPromptSummary(entry),
        requiresPlanPreflight: true
    };
    if (riskResult.warn) {
        plan.riskGate = {
            level: Number(entry.frontmatter.pm_risk_level) || 0,
            warn: riskResult.warn
        };
    }
    if (autoMode) {
        plan.autoMode = true;
    }
    return { shouldSkip: false, plan };
}
/**
 * Build a dispatch plan for a triaged entry with autonomous_safe=true.
 *
 * @param entry    The backlog entry.
 * @param autoMode If true, marks plan with autoMode flag.
 */
function buildSafePlan(entry, autoMode) {
    const plan = {
        featureId: entry.id,
        suggestedSliceTitle: `Implement ${entry.id}: ${extractTitle(entry)}`,
        fromFeatureCmd: `node scripts/loop.mjs slice from-feature --id ${entry.id}`,
        startCmd: `node scripts/loop.mjs slice start --id SLICE-<TBD>`,
        builderPrompt: buildPromptSummary(entry)
    };
    if (autoMode) {
        plan.autoMode = true;
    }
    return plan;
}
/**
 * Process the walk loop: iterate candidates, build plans, check stop conditions.
 *
 * @param candidates       The triaged candidates to walk.
 * @param maxFeatures      Cap on number of plans to build.
 * @param autoMode         If true, include autoMode flag in plans.
 * @param costStopThreshold SLICE-C: halt after this many plans (plan-count proxy for cost).
 * @param repoPath         For stop condition checks.
 * @returns                { skipped, plans, halted, stopReason }
 */
async function walkCandidates(candidates, maxFeatures, autoMode, costStopThreshold, repoPath) {
    const skipped = [];
    const plans = [];
    let halted = false;
    let stopReason = null;
    for (const entry of candidates) {
        // Enforce max-features cap on plans (not on the walk count).
        if (maxFeatures !== undefined && plans.length >= maxFeatures) {
            break;
        }
        const autonSafe = entry.frontmatter.autonomous_safe;
        // SLICE-B: only skip if autonomous_safe is null/undefined (not explicitly set)
        // If autonomous_safe === false, process it with risk gate
        if (autonSafe !== true && autonSafe !== false) {
            skipped.push({ id: entry.id, reason: "not_autonomous_safe" });
            continue;
        }
        // SLICE-B: evaluate risk gate for autonomous_safe=false items
        if (autonSafe === false) {
            const result = processUnsafeEntry(entry, autoMode);
            if (result.shouldSkip) {
                skipped.push({ id: entry.id, reason: result.skipReason || "risk gate blocked" });
                continue;
            }
            plans.push(result.plan);
        }
        else {
            // autonomous_safe === true: build standard plan
            plans.push(buildSafePlan(entry, autoMode));
        }
        // SLICE-C: enforce cost cap after each plan
        if (costStopThreshold !== undefined && plans.length >= costStopThreshold) {
            halted = true;
            stopReason = `cost_cap: plan count ${plans.length} reached costStopThreshold ${costStopThreshold}`;
            break;
        }
        // Check stop conditions after each plan to allow early halt.
        const stopResult = await checkStopConditions(repoPath);
        if (stopResult.shouldStop) {
            halted = true;
            stopReason = stopResult.reasons?.[0] ?? "stop condition fired";
            break;
        }
    }
    return { skipped, plans, halted, stopReason };
}
/**
 * Walk the triaged backlog and emit dispatch plans for autonomous_safe FEATs.
 *
 * SLICE-B: Now also processes autonomous_safe=false items (with risk gate).
 * Only skips items where autonomous_safe is null/undefined (not explicitly set).
 *
 * SLICE-C: Adds cost cap enforcement and orchConfig hints.
 *
 * Plans include:
 *   - requiresPlanPreflight: true for autonomous_safe=false items
 *   - riskGate: populated if pm_risk_level >= 0.7
 *   - autoMode: set when options.autoMode=true
 *
 * After the walk, writes summary artifact to .claude/artifacts/loop/auto-runs/<TS>-auto-run.md
 *
 * @param repoPath  Absolute path to the repo root.
 * @param options   { maxFeatures?, dryRun? (default true), autoMode?, costStopThreshold?, config? }
 */
export async function runAutoWalker(repoPath, options = {}) {
    const { maxFeatures, dryRun: _dryRun = true, autoMode = false, config: providedConfig } = options;
    // SLICE-C: Load config if not provided and read costStopThreshold
    let resolvedConfig = providedConfig;
    if (!resolvedConfig) {
        try {
            const { resolveConfig } = await import("./config-resolver.mjs");
            resolvedConfig = await resolveConfig(repoPath);
        }
        catch {
            // Best-effort: if config resolution fails, continue without it
            resolvedConfig = null;
        }
    }
    // SLICE-C: Determine effective costStopThreshold
    // Priority: explicit option > config.loop.costStopThreshold > undefined
    const costStopThreshold = options.costStopThreshold ?? resolvedConfig?.loop?.costStopThreshold ?? undefined;
    // Load triaged entries and sort by walker priority ordering.
    const allEntries = await listBacklog(repoPath);
    const triaged = filterBacklog(allEntries, { status: "triaged" });
    triaged.sort(compareWalkerOrder);
    const { skipped, plans, halted, stopReason } = await walkCandidates(triaged, maxFeatures, autoMode, costStopThreshold, repoPath);
    // SLICE-B: Write auto-run summary artifact (best-effort; don't fail if it errors)
    let summaryPath;
    try {
        summaryPath = await writeAutoRunSummary(repoPath, {
            walked: triaged.length,
            skipped,
            planned: plans.length,
            halted,
            stopReason,
            plans
        });
    }
    catch {
        // Best-effort: silently continue on write failure
    }
    return {
        walked: triaged.length,
        skipped,
        planned: plans.length,
        halted,
        stopReason,
        plans,
        summaryPath,
        // SLICE-C: Include orchestrator hints
        orchConfig: {
            costStopThreshold: costStopThreshold ?? null,
            escalationThreshold: 3,
            autoMode
        }
    };
}
/**
 * SLICE-B: Write auto-run summary artifact to .claude/artifacts/loop/auto-runs/<TS>-auto-run.md
 *
 * @param repoPath  Absolute path to the repo root.
 * @param result    The AutoWalkerResult returned by runAutoWalker.
 * @returns         The absolute path to the written artifact.
 */
export async function writeAutoRunSummary(repoPath, result) {
    const artifactDir = path.join(repoPath, ".claude/artifacts/loop/auto-runs");
    await fs.mkdir(artifactDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(artifactDir, `${timestamp}-auto-run.md`);
    // Build planned list
    const plannedList = result.plans
        .map((plan) => {
        const preflight = plan.requiresPlanPreflight ? " (requiresPlanPreflight)" : "";
        return `- ${plan.featureId}${preflight}`;
    })
        .join("\n");
    // Build skipped list
    const skippedList = result.skipped.map((skip) => `- ${skip.id}: ${skip.reason}`).join("\n");
    // Build frontmatter
    const content = `---
kind: auto-run-summary
walked: ${result.walked}
planned: ${result.planned}
skipped: ${result.skipped.length}
halted: ${result.halted}
generated_at: ${new Date().toISOString()}
---

# Auto-Run Summary

- FEATs walked: ${result.walked}
- FEATs planned: ${result.planned}
- FEATs skipped: ${result.skipped.length}
- Halted: ${result.halted}${result.stopReason ? ` (reason: ${result.stopReason})` : ""}

## Planned

${plannedList || "_(none)_"}

## Skipped

${skippedList || "_(none)_"}
`;
    await fs.writeFile(filePath, content, "utf-8");
    return filePath;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function extractTitle(entry) {
    const fm = entry.frontmatter;
    if (fm.title && typeof fm.title === "string")
        return fm.title;
    // Try to extract heading from body: "# FEAT-NNN: Some Title"
    const match = entry.body.match(/^#\s+\S+:\s+(.+)$/m);
    if (match)
        return match[1].trim();
    return entry.id;
}
function buildPromptSummary(entry) {
    const title = extractTitle(entry);
    const category = entry.frontmatter.category ? ` (${entry.frontmatter.category})` : "";
    return `Implement ${entry.id}: ${title}${category} — see feature file for full acceptance criteria.`;
}
