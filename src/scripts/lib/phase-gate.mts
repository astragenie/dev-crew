import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { writeValidationResultArtifact } from "../../../crew/scripts/lib/artifacts/validation-result-writer.mjs";
import { nowIso, runAspireStage, runSingleStage, runStageList } from "./phase-gate/runners.mjs";
import type { Groups } from "./phase-gate/parallel-runner.mjs";
import { runPhaseGateParallel } from "./phase-gate/parallel-orchestrator.mjs";
import { incrementIteration } from "./loop-iteration.mjs";
import { emitPhaseGateModeDetected, resolveCurrentSliceId } from "./phase-gate-mode-emitter.mjs";

function renderReport(
  config: Record<string, any>,
  phase: unknown,
  note: string,
  stageResults: Record<string, any>[],
  overallStatus: string,
  startedAt: string,
  endedAt: string
) {
  const lines: string[] = [];
  lines.push(`# Phase Gate Report — phase ${phase} — ${endedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Status: ${overallStatus}`);
  lines.push(`- Preset: ${config.preset}`);
  lines.push(`- Started: ${startedAt}`);
  lines.push(`- Ended: ${endedAt}`);
  if (note) {
    lines.push(`- Note: ${note}`);
  }
  lines.push("");

  for (const stage of stageResults) {
    lines.push(`## ${stage.name}`);
    if (stage.skipped) {
      lines.push(
        stage.reason
          ? `_skipped: ${stage.reason}_`
          : "_skipped (not configured for this preset/repo)_"
      );
      lines.push("");
      continue;
    }
    if (stage.healthchecks) {
      for (const hc of stage.healthchecks) {
        const mark = hc.ok ? "PASS" : "FAIL";
        lines.push(
          `- ${mark} \`${hc.url}\` ${hc.status !== null ? `(HTTP ${hc.status})` : ""} ${hc.error || ""}`.trim()
        );
      }
      lines.push("");
    }
    for (const run of stage.runs) {
      const mark = run.ok ? "PASS" : "FAIL";
      lines.push(
        `### ${mark} \`${run.cmd} ${(run.args || []).join(" ")}\` (cwd: ${run.cwd}, exit ${run.exit}, ${run.durationMs}ms)`
      );
      lines.push("");
      if (run.stdout) {
        lines.push("```text");
        lines.push(run.stdout.trim());
        lines.push("```");
        lines.push("");
      }
      if (run.stderr) {
        lines.push("**stderr:**");
        lines.push("```text");
        lines.push(run.stderr.trim());
        lines.push("```");
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

async function writeReport(
  repoPath: string,
  config: Record<string, any>,
  phase: unknown,
  body: string
) {
  const artifactDir = path.resolve(
    repoPath,
    config.loop?.phaseGateArtifactDir || ".claude/artifacts/crew/validations"
  );
  await fs.mkdir(artifactDir, { recursive: true });
  // No timestamp on the loop-owned phase-gate artifact — phase id is the
  // uniqueness key. Re-running the gate for the same phase overwrites the
  // previous report (latest is authoritative).
  const filename = `phase${String(phase)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}-gate.md`;
  const target = path.join(artifactDir, filename);
  await fs.writeFile(target, body);
  return target;
}

// P2 seam-elimination (SLICE-12, docs/planning/p2-seam-contract.md §2):
// direct-import replacement for the old `execFile(... "write-validation-
// result" ...)` subprocess call. FAIL-HARD BY DESIGN — this is a behavior
// ADDITION, not a preservation. The old execFile path caught its own
// failure into `{ ok: false, error }` and neither caller (this file's
// serial path nor parallel-orchestrator.mts) ever inspected `.ok` before
// returning `overallStatus`, so a failed write silently left
// `crewArtifactRegistered: false` with zero effect on control flow
// (seam-contract.md finding 2). Here, no try/catch: writeValidationResult
// Artifact throws on any failure (bad decision, schema refusal, fs error)
// and this function does not swallow it — the throw must propagate all the
// way up through runPhaseGate/runPhaseGateParallel so the phase-gate run
// exits non-zero and no PASS validation artifact is ever claimed.
async function recordWithCrew(
  repoPath: string,
  title: string,
  decision: string,
  summary: string,
  artifactPath: string,
  phase: unknown
) {
  const phaseStr =
    phase !== null && phase !== undefined && String(phase).length > 0 ? String(phase) : undefined;
  const record = await writeValidationResultArtifact(repoPath, {
    title,
    decision,
    summary,
    evidence: artifactPath,
    phase: phaseStr
  });
  return { ok: true, crewArtifactPath: record.path };
}

async function safeIncrementIteration(repoPath: string) {
  try {
    return await incrementIteration(repoPath);
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

// Post-gate hooks fired only when the gate PASSes. Returns retro + deploy
// handoffs (both best-effort — errors collapse into the result rather than
// throwing). Extracted to keep `runPhaseGate` under the cyclomatic-15 cap.
async function runPassPostHooks(repoPath: string, phase: unknown, overallStatus: string) {
  if (overallStatus !== "PASS") {
    return {
      retrospective: null as Record<string, any> | null,
      deployHandoffs: [] as Record<string, any>[]
    };
  }
  let retrospective: Record<string, any> | null = null;
  try {
    retrospective = await runRetrospectiveSincePreviousGate(repoPath, phase);
  } catch (err: unknown) {
    retrospective = { error: (err as Error).message };
  }
  let deployHandoffs: Record<string, any>[] = [];
  try {
    deployHandoffs = await emitDeployHandoffsForReadyReleases(repoPath);
  } catch (err: unknown) {
    deployHandoffs = [{ error: (err as Error).message }];
  }
  return { retrospective, deployHandoffs };
}

// Returns the parallel groups to run if all three preconditions hold:
// (a) `config.phaseGate.parallel` is not explicitly false, (b) groups are
// configured and non-empty, (c) the caller did not pass `--serial`. Returns
// null otherwise so `runPhaseGate` can fall through to the sequential
// stack.* runners.
function resolveParallelGroups(
  config: Record<string, any>,
  options: Record<string, any>
): Groups | null {
  const cfg = (config.phaseGate ?? {}) as { parallel?: boolean; groups?: Groups };
  if (options.serial) return null;
  if (cfg.parallel === false) return null;
  if (!cfg.groups || Object.keys(cfg.groups).length === 0) return null;
  return cfg.groups;
}

// Dispatcher passes config via options; direct callers (tests, ceremonies)
// may omit it, falling back to a fresh resolve of the same repo config.
async function resolveGateConfig(
  repoPath: string,
  options: Record<string, any>
): Promise<Record<string, any>> {
  return (options.config || (await resolveConfig(repoPath))) as Record<string, any>;
}

export async function runPhaseGate(repoPath: string, options: Record<string, any> = {}) {
  const startedAt = nowIso();
  const config = await resolveGateConfig(repoPath, options);
  const phase = options.phase || "unspecified";
  const note = options.note || "";

  // P2 seam-elimination (SLICE-12/13): crew is a same-repo subtree now, not
  // an installed plugin — the old "is crew installed" hard-dependency guard
  // (findCrewCli/crewCliRuntime) no longer applies to this direct-import
  // path. (plugin-identity.mts's findCrewCli/crewCliRuntime exports
  // themselves are unchanged here — other consumers still use them; their
  // removal is SLICE-13's scope, not this file's.)
  const parallelGroups = resolveParallelGroups(config, options);
  if (parallelGroups) {
    const result = await runPhaseGateParallel(
      repoPath,
      config,
      phase,
      note,
      startedAt,
      parallelGroups,
      options.only,
      { writeReport, recordWithCrew, safeIncrementIteration, runPassPostHooks }
    );
    // M5 / L5-2: emit phase_gate_mode_detected so the runner sees the
    // execution path that ran. Best-effort — skips silently when no slice
    // is currently open. SliceId resolved from crew workflow-state.
    const sliceId = await resolveCurrentSliceId(repoPath);
    await emitPhaseGateModeDetected(repoPath, { sliceId, mode: "parallel" });
    return result;
  }

  const stageResults: Record<string, any>[] = [];
  stageResults.push(await runStageList(repoPath, "build", config.stack?.build));
  stageResults.push(await runStageList(repoPath, "test", config.stack?.test));
  stageResults.push(await runSingleStage(repoPath, "frontendBuild", config.stack?.frontendBuild));
  stageResults.push(await runSingleStage(repoPath, "infraPlan", config.stack?.infraPlan));
  stageResults.push(await runAspireStage(repoPath, config));

  const anyFailed = stageResults.some((s) => !s.skipped && !s.ok);
  const overallStatus = anyFailed ? "FAIL" : "PASS";
  const endedAt = nowIso();

  const body = renderReport(config, phase, note, stageResults, overallStatus, startedAt, endedAt);
  const artifactPath = await writeReport(repoPath, config, phase, body);

  const summary = `phase ${phase} ${overallStatus} — preset ${config.preset} — ${stageResults.filter((s) => !s.skipped).length} stages run`;
  // Fail-hard (see recordWithCrew's header comment): deliberately no
  // try/catch here. A thrown error propagates uncaught out of runPhaseGate.
  const crewResult = await recordWithCrew(
    repoPath,
    `Phase ${phase} gate`,
    anyFailed ? "failed" : "passed",
    summary,
    artifactPath,
    phase
  );

  // Increment iteration counter on phase gate completion (FEAT-001).
  // Tracks loop progress; enables runaway halting via checkStopConditions.
  // Non-fatal: a counter write failure must not block phase-gate.
  const iterationState = await safeIncrementIteration(repoPath);

  // Auto-invoke retrospective when phase gate PASSes. Captures lessons /
  // score trends / decisions over the window since the previous phase-gate
  // artifact (default span 30 days if no prior gate found). After retro,
  // scan for releases where all targeted features are done and surface a
  // deploy handoff. Best-effort; failures don't block phase-gate.
  const post = await runPassPostHooks(repoPath, phase, overallStatus);
  const retrospective: Record<string, any> | null = post.retrospective;
  const deployHandoffs: Record<string, any>[] = post.deployHandoffs;

  // M5 / L5-2: emit phase_gate_mode_detected on the serial path. Best-effort —
  // skips silently when no slice context is open.
  const sliceId = await resolveCurrentSliceId(repoPath);
  await emitPhaseGateModeDetected(repoPath, { sliceId, mode: "serial" });

  // runner-plugin#288: emit GEPA memory payload on FAIL only (PASS is covered
  // by devcrew:close grade write). Fire-and-forget — never throws, never blocks.
  if (anyFailed) {
    await emitPhaseGateFailMemory(repoPath, sliceId, phase, stageResults);
  }

  return {
    mode: "phase-gate",
    status: overallStatus,
    phase,
    preset: config.preset,
    artifactPath,
    // recordWithCrew is fail-hard (see its header comment): reaching this
    // line means the write already succeeded — a failure would have thrown
    // and aborted runPhaseGate before we got here. Always true/null when
    // present, kept for output-shape stability with pre-SLICE-12 callers.
    crewArtifactRegistered: crewResult.ok,
    crewArtifactError: null,
    stages: stageResults.map((s) => ({
      name: s.name,
      skipped: Boolean(s.skipped),
      ok: s.skipped ? null : s.ok,
      failingCount: ((s.runs as Record<string, any>[]) || []).filter((r) => !r.ok).length
    })),
    retrospective,
    deployHandoffs,
    iterationState
  };
}

// Scans backlog for releases (target_release values) where every targeted
// feature is in done/. For each, writes a handoff to crew deployer in
// .claude/artifacts/crew/handoffs/. Idempotent — checks for existing
// "ready-to-deploy-<version>" handoff before writing again.
async function emitDeployHandoffsForReadyReleases(repoPath: string) {
  const { listBacklog } = await import("./backlog-parser.mjs");
  const backlog = (await listBacklog(repoPath)) as Record<string, any>[];
  const byRelease = new Map<string, Record<string, any>[]>();
  for (const f of backlog) {
    const tr = f.frontmatter.target_release;
    if (!tr) continue;
    if (!byRelease.has(tr)) byRelease.set(tr, []);
    byRelease.get(tr)!.push(f);
  }
  const handoffsDir = path.join(repoPath, ".claude/artifacts/crew/handoffs");
  await fs.mkdir(handoffsDir, { recursive: true });
  const existing = await fs.readdir(handoffsDir).catch(() => [] as string[]);
  const written: Record<string, any>[] = [];
  for (const [version, features] of byRelease) {
    if (features.length === 0) continue;
    const allDone = features.every((f) => f.state === "done");
    if (!allDone) continue;
    const versionSlug = version.toLowerCase().replace(/[^a-z0-9.]/g, "-");
    const stub = `ready-to-deploy-${versionSlug}`;
    if (existing.some((name) => name.includes(stub))) continue;
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z");
    const filename = `${stamp}-${stub}.md`;
    const target = path.join(handoffsDir, filename);
    const today = new Date().toISOString().slice(0, 10);
    const { serializeFrontmatter } = await import("./frontmatter.mjs");
    const fm = {
      kind: "handoff",
      objective: `Deploy release ${version} — all targeted features complete`,
      owner: "deployer",
      release: version,
      feature_count: features.length,
      created_at: today,
      confidence: "high",
      next_handoff: "deployment-evidence"
    };
    const featureList = features
      .map((f) => `- ${f.id}: \`${path.relative(repoPath, f.filePath).replace(/\\/g, "/")}\``)
      .join("\n");
    const body = [
      `# Handoff — Release ${version} ready to deploy`,
      "",
      "## Objective",
      "",
      `Phase-gate PASSed. All ${features.length} feature(s) targeting \`${version}\` are in \`done/\`. Cut + deploy the release.`,
      "",
      "## Allowed scope",
      "",
      `1. Run \`/devcrew:release plan --version ${version}\` to refresh the release notes with current status.`,
      `2. \`git tag ${version} && git push origin ${version}\` once the release notes look right.`,
      "3. Run the deployer agent / scripts per repo deployment guidance.",
      "4. Capture deployment evidence via crew `write-deployment-result`.",
      "",
      "## Forbidden scope",
      "",
      "- Production promotion without explicit user approval (per crew constitution).",
      "",
      "## Features in this release",
      "",
      featureList,
      "",
      "## Confidence",
      "",
      "High — all features in done/, phase-gate passed.",
      "",
      "## Risks or open questions",
      "",
      "- Verify no in-progress slices still touch the same area (`/devcrew:brief` for in-flight state).",
      ""
    ].join("\n");
    await fs.writeFile(target, serializeFrontmatter(fm, body));
    written.push({ release: version, handoffPath: target, featureCount: features.length });
  }
  return written;
}

// Look back at docs/<phaseGateArtifactDir> for the previous phase-N-gate-*.md
// artifact and use its date as the retrospective lower bound. Falls back to
// 30 days if no prior gate exists.
async function runRetrospectiveSincePreviousGate(repoPath: string, phase: unknown) {
  const config = (await resolveConfig(repoPath)) as Record<string, any>;
  const dir = path.resolve(
    repoPath,
    config.loop?.phaseGateArtifactDir || ".claude/artifacts/crew/validations"
  );
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    entries = [];
  }
  const phaseRe = /^phase-(.+)-gate-(\d{8})T\d+Z?\.md$/;
  const prior = entries
    .map((name) => name.match(phaseRe))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ phase: m[1]!, stamp: m[2]! }))
    .filter((e) => e.phase !== String(phase))
    .sort((a, b) => b.stamp.localeCompare(a.stamp));
  const sinceDate =
    prior.length > 0
      ? `${prior[0]!.stamp.slice(0, 4)}-${prior[0]!.stamp.slice(4, 6)}-${prior[0]!.stamp.slice(6, 8)}`
      : null;
  const { writeRetrospective } = await import("./retrospective.mjs");
  const result = await writeRetrospective(
    repoPath,
    sinceDate ? { since: sinceDate } : { spanDays: 30 }
  );
  return {
    artifactPath: result.artifactPath,
    sincePreviousGate: sinceDate,
    spanFallbackDays: sinceDate ? null : 30,
    summary: {
      gradesInWindow: result.report.counts.gradesInWindow,
      decisionsInWindow: result.report.counts.decisionsInWindow,
      featuresDoneInWindow: result.report.counts.featuresDoneInWindow,
      dimensionsBelowThreshold: result.report.dimensionsBelowThreshold
    }
  };
}

// runner-plugin#288: GEPA memory payload on phase-gate FAIL.
// Fail-silent — emit() never throws and is already 2s-capped.
async function emitPhaseGateFailMemory(
  repoPath: string,
  sliceId: string | null,
  phase: unknown,
  stageResults: Record<string, any>[]
): Promise<void> {
  try {
    const loopJsonPath = path.join(repoPath, ".claude", "loop.json");
    let memoryEnabled: string = "auto";
    try {
      const { readFile } = await import("node:fs/promises");
      const raw = await readFile(loopJsonPath, "utf8");
      const parsed = JSON.parse(raw);
      const configuredMode = parsed?.memory?.enabled;
      if (configuredMode === "never") memoryEnabled = "never";
    } catch {
      // Defaults to auto.
    }
    if (memoryEnabled === "never") return;

    // No provider pre-gate: emitGepaEvent() is fail-silent and no-ops itself
    // when no astramem provider is discoverable (FEAT-235).
    const { emitGepaEvent } = await import("./memory-gepa.mjs");

    const { getPromptVersion } = await import("./agent-version.mjs");
    const promptVersion = await getPromptVersion("runner");

    const failingStages = stageResults
      .filter((s) => !s.skipped && !s.ok)
      .map((s) => String(s.name));
    const logTail = buildPhaseGateLogTail(stageResults);

    await emitGepaEvent({
      ts: new Date().toISOString(),
      slice_id: sliceId ?? "unknown",
      feat_id: "unknown",
      source: "phase-gate",
      event: "phase_gate_fail",
      score: 0,
      feedback: `Phase ${String(phase)} failed: ${failingStages.join(", ") || "unknown stage"}`,
      input: { branch: "main", slice_id: sliceId ?? "unknown" },
      output: { exit_code: 1, log_tail: logTail },
      prompt_version: promptVersion
    });
  } catch {
    // Fail-silent: memory bridge must never affect the phase-gate path.
  }
}

function buildPhaseGateLogTail(stageResults: Record<string, any>[]): string {
  const lines: string[] = [];
  for (const stage of stageResults) {
    if (stage.skipped || stage.ok) continue;
    lines.push(`[${String(stage.name)}]`);
    for (const run of (stage.runs as Record<string, any>[]) ?? []) {
      if (run.ok) continue;
      if (run.stderr) lines.push(String(run.stderr).slice(-500));
      if (run.stdout) lines.push(String(run.stdout).slice(-200));
    }
  }
  return lines.join("\n").slice(0, 2000);
}
