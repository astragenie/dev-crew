import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
// Cheap pattern-detection over grades + backlog + specs. No LLM. Returns an
// array of alert objects suitable for inclusion in status / brief output.
//
// Each alert: { severity: "warn"|"info", category, message, suggested_action }.
const SCORE_THRESHOLD = 0.8;
const TRAILING_SLICES = 3;
// Per-dimension threshold override. Looser floor for subjective dimensions
// where the score-inference regex rarely fires (observability vocabulary is
// sparse in CLI/backend slices). Quick patch; FEAT-059 promotes to config.
const PER_DIMENSION_THRESHOLD = {
    observability: 0.7
};
function thresholdFor(dim) {
    return PER_DIMENSION_THRESHOLD[dim] ?? SCORE_THRESHOLD;
}
function detectScoreTrendAlerts(grades) {
    if (grades.length < TRAILING_SLICES)
        return [];
    const recent = grades.slice(-TRAILING_SLICES);
    const out = [];
    for (const dim of SCORE_DIMENSIONS) {
        const threshold = thresholdFor(dim);
        const allLow = recent.every((g) => {
            const v = g.scores?.[dim];
            return typeof v === "number" && v < threshold;
        });
        if (allLow) {
            out.push({
                severity: "warn",
                category: "score-trend",
                message: `${dim} below ${threshold} across last ${TRAILING_SLICES} slices`,
                suggested_action: `Author a SPEC (type=sre or type=adr) addressing the ${dim} gap, or revisit the slice template for that dimension.`
            });
        }
    }
    return out;
}
function detectDecompositionAlerts(backlog) {
    const out = [];
    for (const f of backlog) {
        const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
        if (slices.length >= 3) {
            if (f.state === "done") {
                out.push({
                    severity: "info",
                    category: "decomposition",
                    message: `${f.id} shipped with ${slices.length} slices — consider capturing the pattern as a SPEC if recurring`,
                    suggested_action: `Capture pattern as SPEC retroactively only if recurring.`
                });
            }
            else {
                out.push({
                    severity: "warn",
                    category: "decomposition",
                    message: `${f.id} has spawned ${slices.length} slices`,
                    suggested_action: `Review feature scope — split into smaller features or capture the pattern as a SPEC.`
                });
            }
        }
    }
    return out;
}
function detectSpecFlowAlerts(specs) {
    const out = [];
    for (const s of specs) {
        const derived = Array.isArray(s.frontmatter.derived_features)
            ? s.frontmatter.derived_features
            : [];
        if (s.frontmatter.status === "approved" && derived.length === 0) {
            out.push({
                severity: "info",
                category: "spec-flow",
                message: `${s.id} is approved but not yet decomposed into features`,
                suggested_action: `Run /loop:spec decompose --id ${s.id} --features "title 1; title 2; ..."`
            });
        }
    }
    return out;
}
function detectBacklogFlowAlerts(backlog) {
    const pending = backlog.filter((f) => f.state === "pending");
    if (pending.length < 10)
        return [];
    return [
        {
            severity: "info",
            category: "backlog-flow",
            message: `${pending.length} features pending triage`,
            suggested_action: `Run /loop:backlog triage to assign priority + category.`
        }
    ];
}
function detectInProgressOrphanAlerts(backlog) {
    const out = [];
    for (const f of backlog.filter((b) => b.state === "in-progress")) {
        const slices = Array.isArray(f.frontmatter.slices) ? f.frontmatter.slices : [];
        if (slices.length === 0) {
            out.push({
                severity: "warn",
                category: "in-progress-orphan",
                message: `${f.id} is in-progress but has no linked slice`,
                suggested_action: `Run /loop:slice from-feature --id ${f.id}.`
            });
        }
    }
    return out;
}
export async function detectPatterns(repoPath, { config = null } = {}) {
    const [grades, backlog, specs] = await Promise.all([
        listGrades(repoPath, { config }),
        listBacklog(repoPath, { config }),
        listSpecs(repoPath, { config })
    ]);
    return [
        ...detectScoreTrendAlerts(grades),
        ...detectDecompositionAlerts(backlog),
        ...detectSpecFlowAlerts(specs),
        ...detectBacklogFlowAlerts(backlog),
        ...detectInProgressOrphanAlerts(backlog)
    ];
}
