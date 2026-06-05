/**
 * backlog-pm-write.mts — Writes PM score fields to a FEAT's frontmatter.
 *
 * Called by the `backlog pm-write` CLI subcommand (loop.mts). Does NOT
 * change `status` or move the file; only patches frontmatter in-place.
 */
import { findFeatureById, updateFeatureFrontmatter } from "./backlog-writer.mjs";
import { computeWeightedCompositeScore } from "./pm-scorer.mjs";
/**
 * Write PM score dimensions and derived fields into a FEAT's frontmatter.
 *
 * The status field and file location are never modified. An error is thrown
 * when the FEAT cannot be found.
 */
export async function writePmScores(repoPath, opts) {
    const { id, scores, priority, autonomousSafe, triageNotes } = opts;
    const entry = await findFeatureById(repoPath, id);
    if (!entry) {
        throw new Error(`Feature not found: ${id}`);
    }
    const compositeScore = computeWeightedCompositeScore(scores) ?? 0;
    const updates = {
        pm_customer_impact: scores.customer_impact,
        pm_effort_estimate: scores.effort_estimate,
        pm_strategic_alignment: scores.strategic_alignment,
        pm_technical_risk: scores.technical_risk,
        pm_dependency_depth: scores.dependency_depth,
        composite_score: compositeScore,
        priority,
        autonomous_safe: autonomousSafe
    };
    if (triageNotes !== undefined) {
        updates.triage_notes = triageNotes;
    }
    await updateFeatureFrontmatter(entry.filePath, updates);
    return {
        id,
        filePath: entry.filePath,
        composite_score: compositeScore
    };
}
