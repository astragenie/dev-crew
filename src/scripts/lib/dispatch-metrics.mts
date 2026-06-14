import fs from "node:fs";
import path from "node:path";

export type DispatchMetrics = {
  runId: string;
  startedAt: string; // ISO 8601 UTC
  completedAt: string; // ISO 8601 UTC
  status: "complete" | "partial";
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  model: string; // "unknown" if undetermined
  childCount: number; // number of plans in plan file
};

function metricsPath(repoRoot: string, runId: string): string {
  return path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, "dispatch-metrics.json");
}

export function writeDispatchMetrics(
  repoRoot: string,
  runId: string,
  metrics: DispatchMetrics
): void {
  try {
    const filePath = metricsPath(repoRoot, runId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
  } catch (err) {
    process.stderr.write(`[dispatch-metrics] write failed: ${(err as Error).message}\n`);
  }
}

export function readDispatchMetrics(repoRoot: string, runId: string): DispatchMetrics | null {
  const filePath = metricsPath(repoRoot, runId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as DispatchMetrics;
  } catch {
    return null;
  }
}
