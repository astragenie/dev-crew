// Parallel-mode orchestrator. Wraps `runParallelGroups` with the same
// post-run side effects as the serial path: write the markdown artifact,
// register through crew, tick the loop-iteration counter, and (on PASS) fire
// the retrospective + ready-release deploy handoffs. Returning a result shape
// compatible with the serial caller (mode/status/phase/preset/artifactPath/
// retrospective/deployHandoffs/...) so dispatchers don't need to special-case.

import path from "node:path";

import { nowIso } from "./runners.mjs";
import { runParallelGroups, type Groups, type RunResult } from "./parallel-runner.mjs";

export type ParallelDeps = {
  writeReport: (
    repoPath: string,
    config: Record<string, any>,
    phase: unknown,
    body: string
  ) => Promise<string>;
  recordWithCrew: (
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
  // Fail-hard (P2 contract §2, SLICE-12): deliberately no try/catch — a
  // thrown error from deps.recordWithCrew propagates uncaught out of
  // runPhaseGateParallel, mirroring the serial path in phase-gate.mts.
  const crewResult = await deps.recordWithCrew(
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

  // runner-plugin#290: parity with sequential path — emit GEPA memory payload
  // on FAIL. Fire-and-forget — never throws, never blocks > 2s.
  if (overallStatus === "FAIL") {
    void emitParallelPhaseGateFailMemory(repoPath, phase, result);
  }

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

// runner-plugin#290: GEPA memory payload on parallel phase-gate FAIL.
// Mirrors emitPhaseGateFailMemory in phase-gate.mts (sequential path).
// Fail-silent — emit() never throws and is already 2s-capped.
async function emitParallelPhaseGateFailMemory(
  repoPath: string,
  phase: unknown,
  result: RunResult
): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path2 = await import("node:path");
    const loopJsonPath = path2.join(repoPath, ".claude", "loop.json");
    let memoryEnabled: string = "auto";
    try {
      const raw = await fs.readFile(loopJsonPath, "utf8");
      const parsed = JSON.parse(raw);
      const configuredMode = parsed?.memory?.enabled;
      if (configuredMode === "never") memoryEnabled = "never";
    } catch {
      // Defaults to auto.
    }
    if (memoryEnabled === "never") return;

    // No provider pre-gate: emitGepaEvent() is fail-silent and no-ops itself
    // when no astramem provider is discoverable (FEAT-235).
    const { emitGepaEvent } = await import("../memory-gepa.mjs");

    const { getPromptVersion } = await import("../agent-version.mjs");
    const promptVersion = await getPromptVersion("runner");

    const failedGroups = result.groups.filter((g) => g.exitCode !== 0).map((g) => g.group);
    const logTail = result.combinedLog.split("\n").slice(-10).join("\n");

    await emitGepaEvent({
      ts: new Date().toISOString(),
      slice_id: "unknown",
      feat_id: "unknown",
      source: "phase-gate",
      event: "phase_gate_fail",
      score: 0,
      feedback: `Phase ${String(phase)} failed (parallel): ${failedGroups.join(", ") || "unknown group"}`,
      input: { branch: "main", mode: "parallel" },
      output: { exit_code: result.exitCode, log_tail: logTail, failed_group: result.failedGroup },
      prompt_version: promptVersion
    });
  } catch {
    // Fail-silent: memory bridge must never affect the phase-gate path.
  }
}
