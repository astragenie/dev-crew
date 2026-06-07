/**
 * backlog-pm-write.mts — Writes PM score fields to a FEAT's frontmatter.
 *
 * Called by the `backlog pm-write` CLI subcommand (loop.mts). Patches
 * frontmatter in-place. When the FEAT is currently under `pending/`, the
 * file is also moved to `triaged/` and `status` is set to `triaged` — this
 * matches the `/loop:triage` skill contract that the PM path must promote
 * entries pending → triaged in one step.
 */

import path from "node:path";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "./backlog-writer.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { computeWeightedCompositeScore } from "./pm-scorer.mjs";

export interface PmScores {
  customer_impact: number;
  effort_estimate: number;
  strategic_alignment: number;
  technical_risk: number;
  dependency_depth: number;
}

export interface WritePmScoresOptions {
  /** FEAT-NNN id to locate in the backlog. */
  id: string;
  /** The five PM dimension scores (all 0-1). */
  scores: PmScores;
  /** Composite priority band (P0-P3) derived by the PM agent. */
  priority: string;
  /** Whether the FEAT is safe for autonomous execution. */
  autonomousSafe: boolean;
  /** Optional notes written to the triage_notes frontmatter field. */
  triageNotes?: string;
  /** Optional evidence field passed by the PM agent (informational only). */
  evidence?: string;
  /** Optional reasoning field passed by the PM agent (informational only). */
  reasoning?: string;
}

export interface WritePmScoresResult {
  id: string;
  filePath: string;
  composite_score: number;
}

/**
 * Write PM score dimensions and derived fields into a FEAT's frontmatter.
 *
 * The status field and file location are never modified. An error is thrown
 * when the FEAT cannot be found.
 */
export async function writePmScores(
  repoPath: string,
  opts: WritePmScoresOptions
): Promise<WritePmScoresResult> {
  const { id, scores, priority, autonomousSafe, triageNotes } = opts;

  // Deterministic ID guard: verify the FEAT exists on disk before writing.
  // Rejects fabricated IDs that the PM agent may have hallucinated.
  const allEntries = await listBacklog(repoPath);
  const known = allEntries.find((e: { id: string }) => e.id === id);
  if (!known) {
    throw new Error(
      `FEAT-id existence guard: ${id} not found in backlog (pending/triaged/in-progress). ` +
        `Refusing pm-write to prevent fabricated-id pollution.`
    );
  }

  const entry = await findFeatureById(repoPath, id);
  if (!entry) {
    throw new Error(`Feature not found: ${id}`);
  }

  const compositeScore =
    computeWeightedCompositeScore(scores as unknown as Record<string, unknown>) ?? 0;

  const updates: Record<string, unknown> = {
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

  // Auto-promote pending → triaged. The triage skill contract (skills/triage/SKILL.md)
  // assumes a single CLI call writes scores AND moves the entry. Detect "pending"
  // via the file path (entries live under .../backlog/<state>/FEAT-NNN.md).
  let finalFilePath = entry.filePath;
  if (path.basename(path.dirname(entry.filePath)) === "pending") {
    const moved = await moveFeature(entry.filePath, "triaged");
    finalFilePath = moved.to;
  }

  return {
    id,
    filePath: finalFilePath,
    composite_score: compositeScore
  };
}
