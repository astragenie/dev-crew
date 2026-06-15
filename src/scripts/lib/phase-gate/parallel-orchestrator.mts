// Parallel-mode orchestrator. Wraps `runParallelGroups` with the same
// post-run side effects as the serial path: write the markdown artifact,
// register through crew, tick the loop-iteration counter, and (on PASS) fire
// the retrospective + ready-release deploy handoffs. Returning a result shape
// compatible with the serial caller (mode/status/phase/preset/artifactPath/
// retrospective/deployHandoffs/...) so dispatchers don't need to special-case.

import path from "node:path";

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
  runPassPostHooks: (
    repoPath: string,
    phase: unknown,
    overallStatus: string
  ) => Promise<{
    retrospective: Record<string, any> | null;
    deployHandoffs: Record<string, any>[];
  }>;
};

// Resolve each command's cwd against `repoPath` so the parallel path matches
// the serial runners' behavior (which default to `repoPath` when no cwd is
// supplied on the stage step). Without this, spawn() falls back to the parent
// process's working directory — which drifts when the loop CLI is invoked
// from a different directory than the repo it is gating.
function withRepoCwd(groups: Groups, repoPath: string): Groups {
  const out: Groups = {};
  for (const [name, cmds] of Object.entries(groups)) {
    out[name] = cmds.map((c) => ({
      ...c,
      cwd: c.cwd ? path.resolve(repoPath, c.cwd) : repoPath
    }));
  }
  return out;
}

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
  if (only && !Object.hasOwn(groups, only)) {
    throw new Error(
      `--only "${only}" not found in phaseGate.groups (have: ${Object.keys(groups).join(", ")})`
    );
  }

  const resolvedGroups = withRepoCwd(groups, repoPath);
  const result = await runParallelGroups(resolvedGroups, only ? { only } : {});
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

  // Mirror the serial path: on PASS, run retrospective + emit deploy
  // handoffs for ready releases. Best-effort — errors collapse into the
  // returned shape rather than throwing.
  const post = await deps.runPassPostHooks(repoPath, phase, overallStatus);

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
    iterationState,
    retrospective: post.retrospective,
    deployHandoffs: post.deployHandoffs
  };
}
