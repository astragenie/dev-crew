import fs from "node:fs/promises";
import path from "node:path";
import { resolveCanonicalRepoRoot } from "./learnings.mjs";

export const GRADE_JSONL_RELATIVE = path.join(".claude", "artifacts", "loop", "grades.jsonl");

export interface GradeEventPayload {
  sliceId: string;
  featureId?: string;
  spec?: string;
  recordedAt: string;
  /** FEAT-247 / A2: canonical timestamp, dual-emitted alongside `recordedAt`. */
  ts?: string;
  scores: Record<string, number>;
  decisions?: Array<{ id: string; status: string; body?: string }>;
  timing?: Record<string, unknown>;
  shape?: Record<string, unknown>;
}

// runner-plugin#326 root-cause fix: in wave/worktree-mode runs, repoPath
// resolves to the active per-slice worktree, so writing straight off
// repoPath landed grades.jsonl in a copy that never reaches main once the
// worktree is pruned (identical root cause to FEAT-188 S1b / learnings.jsonl).
// Resolve to the canonical main-worktree root first — reuses the existing
// helper rather than duplicating it. Fire-and-forget / non-worktree-mode
// behavior is unchanged: resolveCanonicalRepoRoot no-ops (returns repoPath)
// when repoPath is already the main worktree or not a git repo at all.
export async function appendGradeEvent(repoPath: string, event: GradeEventPayload): Promise<void> {
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const file = path.join(canonicalRoot, GRADE_JSONL_RELATIVE);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(file, line, "utf8");
}
