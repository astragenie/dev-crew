import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { resolveConfig } from "./config-resolver.mjs";
import { findCrewCli } from "./plugin-identity.mjs";

const execFile = promisify(execFileCallback);

// Maximum stdout/stderr bytes captured per command. Anything past this is
// truncated with a "... (truncated)" marker.
const MAX_OUTPUT_BYTES = 64 * 1024;

const HEALTHCHECK_TIMEOUT_MS = 30_000;
const HEALTHCHECK_POLL_INTERVAL_MS = 1_000;

function nowIso() {
  return new Date().toISOString();
}

function tail(text, maxBytes = MAX_OUTPUT_BYTES) {
  if (!text) return "";
  const buffer = Buffer.from(text);
  if (buffer.length <= maxBytes) {
    return text;
  }
  return `... (truncated, showing last ${maxBytes} bytes)\n${buffer.slice(buffer.length - maxBytes).toString("utf8")}`;
}

async function runOneCommand(repoPath, step) {
  const cwd = step.cwd ? path.resolve(repoPath, step.cwd) : repoPath;
  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execFile(step.cmd, step.args || [], {
      cwd,
      maxBuffer: MAX_OUTPUT_BYTES * 4,
      timeout: step.timeout || 30 * 60 * 1000
    });
    return {
      cmd: step.cmd,
      args: step.args || [],
      cwd: path.relative(repoPath, cwd) || ".",
      exit: 0,
      durationMs: Date.now() - startedAt,
      stdout: tail(stdout),
      stderr: tail(stderr),
      ok: true
    };
  } catch (error) {
    return {
      cmd: step.cmd,
      args: step.args || [],
      cwd: path.relative(repoPath, cwd) || ".",
      exit: typeof error.code === "number" ? error.code : 1,
      durationMs: Date.now() - startedAt,
      stdout: tail(error.stdout || ""),
      stderr: tail(error.stderr || error.message || ""),
      ok: false
    };
  }
}

async function runStageList(repoPath, name, steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { name, skipped: true, runs: [] };
  }
  const runs = [];
  for (const step of steps) {
    if (!step || !step.cmd) {
      continue;
    }
    const run = await runOneCommand(repoPath, step);
    runs.push(run);
    if (!run.ok) {
      // Stop the stage list on first failure — typical phase-gate ergonomics.
      break;
    }
  }
  const allOk = runs.length > 0 && runs.every((r) => r.ok);
  return { name, skipped: false, runs, ok: allOk };
}

async function runSingleStage(repoPath, name, step) {
  if (!step || !step.cmd) {
    return { name, skipped: true, runs: [] };
  }
  const run = await runOneCommand(repoPath, step);
  return { name, skipped: false, runs: [run], ok: run.ok };
}

function validateHealthcheckUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function pollHealthcheck(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < HEALTHCHECK_TIMEOUT_MS) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), HEALTHCHECK_POLL_INTERVAL_MS);
      const response = await fetch(url, { signal: ac.signal });
      clearTimeout(timer);
      if (response.ok) {
        return { url, status: response.status, ok: true, durationMs: Date.now() - startedAt };
      }
    } catch {
      // ignore; will retry until timeout
    }
    await new Promise((r) => setTimeout(r, HEALTHCHECK_POLL_INTERVAL_MS));
  }
  return { url, status: null, ok: false, durationMs: Date.now() - startedAt };
}

async function runAspireStage(repoPath, config) {
  const aspire = config.stack?.aspireBoot;
  const healthchecks = config.stack?.healthchecks || [];
  if (!aspire || !aspire.cmd) {
    return { name: "aspireBoot", skipped: true, runs: [] };
  }
  // Aspire boots a long-running process; we don't wait for it to "finish" via
  // execFile. We spawn it detached and rely on healthchecks for liveness.
  // For v1 we run it as a normal child process with a short timeout, then poll
  // healthchecks. Proper detached spawn is a v2 improvement.
  // To avoid hanging the phase-gate, only run aspireBoot if at least one
  // healthcheck URL is configured.
  if (healthchecks.length === 0) {
    return {
      name: "aspireBoot",
      skipped: true,
      reason: "no healthchecks configured; skipping aspireBoot to avoid hanging",
      runs: []
    };
  }

  const cwd = aspire.cwd ? path.resolve(repoPath, aspire.cwd) : repoPath;
  const { spawn } = await import("node:child_process");
  const child = spawn(aspire.cmd, aspire.args || [], {
    cwd,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const results = [];
    for (const rawUrl of healthchecks) {
      const url = validateHealthcheckUrl(rawUrl);
      if (!url) {
        results.push({ url: rawUrl, status: null, ok: false, error: "invalid url (must be http or https)" });
        continue;
      }
      results.push(await pollHealthcheck(url));
    }
    const allOk = results.every((r) => r.ok);
    return {
      name: "aspireBoot",
      skipped: false,
      runs: [{ cmd: aspire.cmd, args: aspire.args || [], cwd: path.relative(repoPath, cwd) || ".", ok: allOk }],
      healthchecks: results,
      ok: allOk
    };
  } finally {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

function renderReport(repoPath, config, phase, note, stageResults, overallStatus, startedAt, endedAt) {
  const lines = [];
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
      lines.push(stage.reason ? `_skipped: ${stage.reason}_` : "_skipped (not configured for this preset/repo)_");
      lines.push("");
      continue;
    }
    if (stage.healthchecks) {
      for (const hc of stage.healthchecks) {
        const mark = hc.ok ? "PASS" : "FAIL";
        lines.push(`- ${mark} \`${hc.url}\` ${hc.status !== null ? `(HTTP ${hc.status})` : ""} ${hc.error || ""}`.trim());
      }
      lines.push("");
    }
    for (const run of stage.runs) {
      const mark = run.ok ? "PASS" : "FAIL";
      lines.push(`### ${mark} \`${run.cmd} ${(run.args || []).join(" ")}\` (cwd: ${run.cwd}, exit ${run.exit}, ${run.durationMs}ms)`);
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

async function writeReport(repoPath, config, phase, body) {
  const artifactDir = path.resolve(repoPath, config.loop?.phaseGateArtifactDir || ".claude/artifacts/crew/validations");
  await fs.mkdir(artifactDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const filename = `phase-${phase}-gate-${stamp}.md`;
  const target = path.join(artifactDir, filename);
  await fs.writeFile(target, body);
  return target;
}

async function recordWithCrew(crewCli, repoPath, title, decision, summary, artifactPath) {
  try {
    await execFile("node", [
      crewCli,
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      title,
      "--decision",
      decision,
      "--summary",
      summary,
      "--evidence",
      artifactPath
    ], { maxBuffer: 1024 * 1024 });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function runPhaseGate(repoPath, options = {}) {
  const startedAt = nowIso();
  const config = await resolveConfig(repoPath);
  const phase = options.phase || "unspecified";
  const note = options.note || "";

  const crewCli = await findCrewCli();
  if (!crewCli) {
    throw new Error("Hard dependency missing: crew CLI not found in plugin cache. Install crew first.");
  }

  const stageResults = [];
  stageResults.push(await runStageList(repoPath, "build", config.stack?.build));
  stageResults.push(await runStageList(repoPath, "test", config.stack?.test));
  stageResults.push(await runSingleStage(repoPath, "frontendBuild", config.stack?.frontendBuild));
  stageResults.push(await runSingleStage(repoPath, "infraPlan", config.stack?.infraPlan));
  stageResults.push(await runAspireStage(repoPath, config));

  const anyFailed = stageResults.some((s) => !s.skipped && !s.ok);
  const overallStatus = anyFailed ? "FAIL" : "PASS";
  const endedAt = nowIso();

  const body = renderReport(repoPath, config, phase, note, stageResults, overallStatus, startedAt, endedAt);
  const artifactPath = await writeReport(repoPath, config, phase, body);

  const summary = `phase ${phase} ${overallStatus} — preset ${config.preset} — ${stageResults.filter((s) => !s.skipped).length} stages run`;
  const crewResult = await recordWithCrew(
    crewCli,
    repoPath,
    `Phase ${phase} gate`,
    anyFailed ? "failed" : "passed",
    summary,
    artifactPath
  );

  // Auto-invoke retrospective when phase gate PASSes. Captures lessons /
  // score trends / decisions over the window since the previous phase-gate
  // artifact (default span 30 days if no prior gate found).
  let retrospective = null;
  let deployHandoffs = [];
  if (overallStatus === "PASS") {
    try {
      retrospective = await runRetrospectiveSincePreviousGate(repoPath, phase);
    } catch (err) {
      retrospective = { error: err.message };
    }
    // After retrospective, scan for any release where all targeted features
    // are done — if found, write a handoff to crew deployer surfacing the
    // ready-to-cut version. Best-effort; failures don't break phase-gate.
    try {
      deployHandoffs = await emitDeployHandoffsForReadyReleases(repoPath);
    } catch (err) {
      deployHandoffs = [{ error: err.message }];
    }
  }

  return {
    mode: "phase-gate",
    status: overallStatus,
    phase,
    preset: config.preset,
    artifactPath,
    crewArtifactRegistered: crewResult.ok,
    crewArtifactError: crewResult.error || null,
    stages: stageResults.map((s) => ({
      name: s.name,
      skipped: Boolean(s.skipped),
      ok: s.skipped ? null : s.ok,
      failingCount: (s.runs || []).filter((r) => !r.ok).length
    })),
    retrospective,
    deployHandoffs
  };
}

// Scans backlog for releases (target_release values) where every targeted
// feature is in done/. For each, writes a handoff to crew deployer in
// .claude/artifacts/crew/handoffs/. Idempotent — checks for existing
// "ready-to-deploy-<version>" handoff before writing again.
async function emitDeployHandoffsForReadyReleases(repoPath) {
  const { listBacklog } = await import("./backlog-parser.mjs");
  const backlog = await listBacklog(repoPath);
  const byRelease = new Map();
  for (const f of backlog) {
    const tr = f.frontmatter.target_release;
    if (!tr) continue;
    if (!byRelease.has(tr)) byRelease.set(tr, []);
    byRelease.get(tr).push(f);
  }
  const handoffsDir = path.join(repoPath, ".claude/artifacts/crew/handoffs");
  await fs.mkdir(handoffsDir, { recursive: true });
  const existing = await fs.readdir(handoffsDir).catch(() => []);
  const written = [];
  for (const [version, features] of byRelease) {
    if (features.length === 0) continue;
    const allDone = features.every((f) => f.state === "done");
    if (!allDone) continue;
    const versionSlug = version.toLowerCase().replace(/[^a-z0-9.]/g, "-");
    const stub = `ready-to-deploy-${versionSlug}`;
    if (existing.some((name) => name.includes(stub))) continue;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
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
    const featureList = features.map((f) => `- ${f.id}: \`${path.relative(repoPath, f.filePath).replace(/\\/g, "/")}\``).join("\n");
    const body = [
      `# Handoff — Release ${version} ready to deploy`,
      "",
      "## Objective",
      "",
      `Phase-gate PASSed. All ${features.length} feature(s) targeting \`${version}\` are in \`done/\`. Cut + deploy the release.`,
      "",
      "## Allowed scope",
      "",
      `1. Run \`/autonomous-loop:release plan --version ${version}\` to refresh \`docs/releases/${version}.md\` with current status.`,
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
      "- Verify no in-progress slices still touch the same area (`/autonomous-loop:brief` for in-flight state).",
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
async function runRetrospectiveSincePreviousGate(repoPath, phase) {
  const config = await resolveConfig(repoPath);
  const dir = path.resolve(repoPath, config.loop?.phaseGateArtifactDir || ".claude/artifacts/crew/validations");
  let entries;
  try { entries = await fs.readdir(dir); } catch { entries = []; }
  const phaseRe = /^phase-(.+)-gate-(\d{8})T\d+Z?\.md$/;
  const prior = entries
    .map((name) => name.match(phaseRe))
    .filter((m) => m)
    .map((m) => ({ phase: m[1], stamp: m[2] }))
    .filter((e) => e.phase !== String(phase))
    .sort((a, b) => b.stamp.localeCompare(a.stamp));
  const sinceDate = prior.length > 0
    ? `${prior[0].stamp.slice(0, 4)}-${prior[0].stamp.slice(4, 6)}-${prior[0].stamp.slice(6, 8)}`
    : null;
  const { writeRetrospective } = await import("./retrospective.mjs");
  const result = await writeRetrospective(repoPath, sinceDate ? { since: sinceDate } : { spanDays: 30 });
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
