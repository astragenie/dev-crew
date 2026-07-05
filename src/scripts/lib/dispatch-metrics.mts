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
  // FEAT-220: children whose token/cost usage could not be attributed
  // unambiguously (missing events, or 2+ children sharing an agentType
  // within the run window). Empty when every child was matched 1:1.
  partialChildren: string[];
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

// FEAT-220: extracted so `dispatch.mts metrics` CLI output for the
// partialChildren note is unit-testable without spawning the CLI as a
// subprocess. Returns null when there is nothing to report (empty/absent
// partialChildren) so callers can skip the line entirely. Guards against
// pre-FEAT-220 dispatch-metrics.json fixtures on disk that predate the
// partialChildren field.
export function formatPartialChildrenNote(metrics: DispatchMetrics): string | null {
  const partialChildren = metrics.partialChildren ?? [];
  if (partialChildren.length === 0) return null;
  return `[dispatch-metrics] partialChildren (cost unattributed): ${partialChildren.join(", ")}`;
}
