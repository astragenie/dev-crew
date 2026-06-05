// Priority ordering for sort tiebreaker (lower index = higher rank).
const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];
/**
 * Compare two backlog entries for walker ordering:
 *   1. composite_score DESC (default 0)
 *   2. priority ascending by rank (P0 > P1 > P2 > P3; missing treated as P3)
 *   3. pm_strategic_fit DESC (default 0)
 */
export function compareWalkerOrder(a, b) {
    const scoreA = Math.min(Number(a.frontmatter.composite_score) || 0, 1.0);
    const scoreB = Math.min(Number(b.frontmatter.composite_score) || 0, 1.0);
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
 * SLICE-41: Check whether a backlog entry's depends_on are satisfied.
 *
 * A dep is satisfied when it exists in allKnownIds AND is in doneSet.
 * A dep not found in allKnownIds is reported with a "(missing)" suffix.
 *
 * @param entry        The backlog entry to evaluate.
 * @param doneSet      Set of IDs in the done/ folder.
 * @param allKnownIds  Set of all known backlog IDs (all statuses).
 */
export function checkDependsOn(entry, doneSet, allKnownIds) {
    const fm = entry.frontmatter;
    if (!Array.isArray(fm.depends_on) || fm.depends_on.length === 0) {
        return { skip: false };
    }
    const unsatisfied = [];
    for (const dep of fm.depends_on) {
        if (!allKnownIds.has(dep)) {
            unsatisfied.push(`${dep} (missing)`);
        }
        else if (!doneSet.has(dep)) {
            unsatisfied.push(dep);
        }
        // if dep is in allKnownIds AND in doneSet → satisfied, skip
    }
    if (unsatisfied.length > 0) {
        return { skip: true, reason: `depends_on: ${unsatisfied.join(", ")}` };
    }
    return { skip: false };
}
/**
 * SLICE-B: Evaluate risk gate for autonomous_safe=false items.
 *
 * Returns { skip, skipReason?, warn? }:
 *   - pm_risk_level >= 0.7 → do NOT skip, but warn (SPEC recommended)
 *   - otherwise → do not skip, no warn
 *
 * Note: deferred and depends_on checks have been moved to the shared
 * pre-branch filter in walkCandidates (SLICE-41) so they apply to ALL
 * entries regardless of autonomous_safe value.
 *
 * @param entry  The backlog entry to evaluate.
 */
export function evaluateRiskGate(entry) {
    const fm = entry.frontmatter;
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
 * SLICE-41: Evaluate a single candidate entry through the shared pre-branch filter
 * and the autonomous_safe branch. Returns { skipReason } if the entry should be
 * skipped, or { plan } if it should be planned.
 */
export function evaluateCandidate(entry, autoMode, doneSet, allKnownIds) {
    // Shared pre-branch filter (applies to ALL entries, AC-17: deferred first).
    if (entry.frontmatter.deferred === true) {
        return { skipReason: "deferred" };
    }
    const depsResult = checkDependsOn(entry, doneSet, allKnownIds);
    if (depsResult.skip) {
        return { skipReason: depsResult.reason };
    }
    const autonSafe = entry.frontmatter.autonomous_safe;
    // Only skip if autonomous_safe is null/undefined (not explicitly set).
    if (autonSafe !== true && autonSafe !== false) {
        return { skipReason: "not_autonomous_safe" };
    }
    if (autonSafe === false) {
        const result = processUnsafeEntry(entry, autoMode);
        if (result.shouldSkip) {
            return { skipReason: result.skipReason || "risk gate blocked" };
        }
        return { plan: result.plan };
    }
    // autonomous_safe === true: build standard plan.
    return { plan: buildSafePlan(entry, autoMode) };
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
