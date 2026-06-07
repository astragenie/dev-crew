import fs from "node:fs/promises";
import path from "node:path";
// Rolling grade-trend tracker. Persists state to .claude/state/grade-trend.json.
// Detects when consecutive slice avg-grades fall below threshold so the loop
// can halt before a quality regression compounds.
const STATE_PATH = [".claude", "state", "grade-trend.json"];
const DEFAULT_THRESHOLD = 0.65;
const WINDOW_SIZE = 3;
function statePath(repoPath) {
    return path.join(repoPath, ...STATE_PATH);
}
/**
 * Read current grade-trend state.
 * @returns {{ scores: Array<{sliceId:string, avg:number}>, consecutiveBelow: number }}
 */
export async function readGradeTrend(repoPath) {
    try {
        const raw = await fs.readFile(statePath(repoPath), "utf8");
        const parsed = JSON.parse(raw);
        return {
            scores: Array.isArray(parsed.scores)
                ? parsed.scores
                : [],
            consecutiveBelow: typeof parsed.consecutiveBelow === "number" ? parsed.consecutiveBelow : 0
        };
    }
    catch {
        return { scores: [], consecutiveBelow: 0 };
    }
}
async function writeState(repoPath, state) {
    const p = statePath(repoPath);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(state, null, 2));
}
/**
 * Record a slice grade score and update the rolling window + consecutiveBelow counter.
 * Skips entries where avg === 0 (no scores computed — treat as no data).
 *
 * @param {string} repoPath
 * @param {{ sliceId: string, avg: number }} entry
 * @returns {Promise<{ scores: Array<{sliceId:string,avg:number}>, consecutiveBelow: number }>}
 */
export async function recordGradeScore(repoPath, { sliceId, avg }) {
    if (!avg)
        return readGradeTrend(repoPath);
    const state = await readGradeTrend(repoPath);
    const threshold = DEFAULT_THRESHOLD;
    const newScores = [...state.scores, { sliceId, avg }].slice(-WINDOW_SIZE);
    const consecutiveBelow = avg < threshold ? state.consecutiveBelow + 1 : 0;
    const next = { scores: newScores, consecutiveBelow };
    await writeState(repoPath, next);
    return next;
}
/**
 * Check whether the grade trend signals a stop.
 * Returns null when below-threshold count is under the limit;
 * returns a stop descriptor when limit is reached or exceeded.
 *
 * @param {string} repoPath
 * @param {object|null} [config]
 * @returns {Promise<null|{ shouldStop: true, reason: string, consecutiveBelow: number, threshold: number }>}
 */
export async function checkGradeTrend(repoPath, config = null) {
    const threshold = config?.loop?.gradeTrendThreshold ?? DEFAULT_THRESHOLD;
    const limit = config?.loop?.gradeTrendConsecutiveLimit ?? 2;
    const state = await readGradeTrend(repoPath);
    // Re-compute consecutiveBelow against the supplied threshold so callers
    // can pass a different threshold without mutating state.
    const consecutiveBelow = computeConsecutiveBelow(state.scores, threshold);
    if (consecutiveBelow < limit)
        return null;
    return {
        shouldStop: true,
        reason: `grade_trend: ${consecutiveBelow} consecutive slice(s) avg below ${threshold}`,
        consecutiveBelow,
        threshold
    };
}
function computeConsecutiveBelow(scores, threshold) {
    let count = 0;
    for (let i = scores.length - 1; i >= 0; i--) {
        if (scores[i].avg < threshold) {
            count++;
        }
        else {
            break;
        }
    }
    return count;
}
/**
 * Check whether the grade trend shows a sustained quality run (marathon milestone).
 * Returns null when fewer than milestoneLength slices exist or any fall below threshold.
 * Returns a milestone descriptor when all recent scores are at or above threshold.
 *
 * @param {string} repoPath
 * @param {object|null} [config]
 * @returns {Promise<null|{ milestone: true, consecutiveAbove: number, avgScore: number, threshold: number }>}
 */
export async function checkMarathonMilestone(repoPath, config = null) {
    const threshold = config?.loop?.gradeTrendThreshold ?? DEFAULT_THRESHOLD;
    const milestoneLength = config?.loop?.marathonMilestoneLength ?? WINDOW_SIZE;
    const state = await readGradeTrend(repoPath);
    if (state.scores.length < milestoneLength)
        return null;
    const recent = state.scores.slice(-milestoneLength);
    if (!recent.every((s) => s.avg >= threshold))
        return null;
    const avgScore = Math.round((recent.reduce((sum, s) => sum + s.avg, 0) / milestoneLength) * 100) / 100;
    return { milestone: true, consecutiveAbove: milestoneLength, avgScore, threshold };
}
