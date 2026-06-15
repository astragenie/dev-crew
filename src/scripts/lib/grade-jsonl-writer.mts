import fs from "node:fs/promises";
import path from "node:path";

export const GRADE_JSONL_RELATIVE = path.join(".claude", "artifacts", "loop", "grades.jsonl");

export interface GradeEventPayload {
  sliceId: string;
  featureId?: string;
  spec?: string;
  recordedAt: string;
  scores: Record<string, number>;
  decisions?: Array<{ id: string; status: string; body?: string }>;
  timing?: Record<string, unknown>;
  shape?: Record<string, unknown>;
}

export async function appendGradeEvent(repoPath: string, event: GradeEventPayload): Promise<void> {
  const file = path.join(repoPath, GRADE_JSONL_RELATIVE);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(file, line, "utf8");
}
