import fs from "node:fs";
import path from "node:path";
import type { DispatchResult, DispatchStatus } from "./dispatch-types.mjs";

type TraceEntry = {
  depth: number;
  childId: string;
  status: DispatchStatus;
  durationMs: number;
  costUsd: number | null;
};

export function readMarker(
  repoRoot: string,
  runId: string,
  childId: string
): DispatchResult | null {
  const markerPath = path.join(
    repoRoot,
    ".claude/artifacts/loop/dispatch",
    runId,
    `${childId}.result.json`
  );
  if (!fs.existsSync(markerPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(markerPath, "utf8");
    return JSON.parse(raw) as DispatchResult;
  } catch (err) {
    process.stderr.write(
      `[dispatch] marker parse failed for ${childId}: ${(err as Error).message}\n`
    );
    return null;
  }
}

export function appendTrace(repoRoot: string, runId: string, entry: TraceEntry): void {
  const dir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(path.join(dir, "trace.jsonl"), line);
}
