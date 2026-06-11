// Parallel-mode orchestrator. Wraps `runParallelGroups` with the same
// post-run side effects as the serial path: write the markdown artifact,
// register through crew, and tick the loop-iteration counter. Returning
// a result shape compatible with the serial caller (mode/status/phase/
// preset/artifactPath/...) so dispatchers don't need to special-case.

import { nowIso } from "./runners.mjs";
import { runParallelGroups, type Groups } from "./parallel-runner.mjs";

export type ParallelDeps = {
  writeReport: (
    repoPath: string,
    config: Record<string, any>,
    phase: unknown,
    body: string
  ) => Promise<string>;
  recordWithCrew: (
    crewCli: string,
    repoPath: string,
    title: string,
    decision: string,
    summary: string,
    artifactPath: string,
    phase: unknown
  ) => Promise<{ ok: boolean; error?: string; crewArtifactPath?: string | null }>;
  safeIncrementIteration: (repoPath: string) => Promise<unknown>;
};

function renderParallelReport(
  config: Record<string, any>,
  phase: unknown,
  note: string,
  startedAt: string,
  endedAt: string,
  status: string,
  result: Awaited<ReturnType<typeof runParallelGroups>>
): string {
  const lines: string[] = [];
  lines.push(`# Phase Gate Report (parallel) — phase ${phase} — ${endedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Status: ${status}`);
  lines.push(`- Preset: ${config.preset}`);
  lines.push(`- Started: ${startedAt}`);
  lines.push(`- Ended: ${endedAt}`);
  if (note) lines.push(`- Note: ${note}`);
  if (result.failedGroup) lines.push(`- Failed group: ${result.failedGroup}`);
  lines.push("");
  for (const g of result.groups) {
    lines.push(`## ${g.group}`);
    lines.push(`- exitCode: ${g.exitCode}`);
    lines.push(`- durationMs: ${g.durationMs}`);
    lines.push("");
  }
  lines.push("## Combined log");
  lines.push("");
  lines.push("```text");
  lines.push(result.combinedLog);
  lines.push("```");
  return lines.join("\n");
}

export async function runPhaseGateParallel(
  repoPath: string,
  config: Record<string, any>,
  phase: unknown,
  note: string,
  startedAt: string,
  crewCli: string,
  groups: Groups,
  only: string | undefined,
  deps: ParallelDeps
) {
  const result = await runParallelGroups(groups, only ? { only } : {});
  const endedAt = nowIso();
  const overallStatus = result.exitCode === 0 ? "PASS" : "FAIL";

  const body = renderParallelReport(config, phase, note, startedAt, endedAt, overallStatus, result);
  const artifactPath = await deps.writeReport(repoPath, config, phase, body);
  const summary = `phase ${phase} ${overallStatus} (parallel) — preset ${config.preset} — ${result.groups.length} groups`;
  const crewResult = await deps.recordWithCrew(
    crewCli,
    repoPath,
    `Phase ${phase} gate`,
    overallStatus === "PASS" ? "passed" : "failed",
    summary,
    artifactPath,
    phase
  );
  const iterationState = await deps.safeIncrementIteration(repoPath);

  return {
    mode: "phase-gate",
    parallel: true,
    status: overallStatus,
    phase,
    preset: config.preset,
    artifactPath,
    crewArtifactRegistered: crewResult.ok,
    crewArtifactError: crewResult.error || null,
    groups: result.groups,
    failedGroup: result.failedGroup,
    combinedLog: result.combinedLog,
    iterationState
  };
}
