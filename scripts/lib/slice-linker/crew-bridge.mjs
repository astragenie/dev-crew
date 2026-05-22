// Bridge layer that hands slice-completion artifacts off to the hero-crew
// plugin's `crew` CLI. Calls crew via execFile against the version installed
// in Claude Code's plugin cache. Best-effort: missing crew is a soft no-op,
// and any single failure (cost-report / handoff / final-synthesis) does not
// block the others.
//
// Extracted from slice-linker.mjs during the Tier B-8 split.

import fs from "node:fs/promises";
import path from "node:path";
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(_execFile);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function findHeroCrewCli() {
  // Lookup order, most-specific-first:
  // 1. $HERO_CREW_PATH env override (explicit user pin).
  // 2. Local dev checkouts. These hold the LIVE source — features added
  //    since the last plugin publish are present here but missing from the
  //    cached install. Preferring the cache here causes recently-added
  //    artifact schemas (e.g. the cost/ vs runs/ split) to silently
  //    degrade when invoked from autonomous-loop.
  // 3. Plugin cache (whatever version is installed).
  if (process.env.HERO_CREW_PATH) {
    const explicit = path.join(process.env.HERO_CREW_PATH, "scripts", "crew.mjs");
    if (await pathExists(explicit)) return explicit;
  }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  const localCandidates = [
    "C:/work/mega/hero-crew/scripts/crew.mjs",
    home ? `${home}/work/mega/hero-crew/scripts/crew.mjs` : null,
    home ? `${home}/hero-crew/scripts/crew.mjs` : null
  ].filter(Boolean);
  for (const candidate of localCandidates) {
    if (await pathExists(candidate)) return candidate;
  }

  // Fall back to the plugin cache (handles installs without a local checkout).
  const { findCrewCli } = await import("../plugin-identity.mjs");
  const cached = await findCrewCli();
  if (cached) return cached;

  return null;
}

// Writes both cost-report (cost/) and cost-advise (cost-insights/) so the
// slice-close artifact set matches what `crew write-final-synthesis`
// auto-emits. `--aggregate-all` mirrors maybeEmitCostReport's default in
// crew.mjs so cross-repo sessions are captured. The advise step is
// best-effort and reported in the return alongside the report.
// Invokes `crew write-run-brief` to rotate workflow-state.currentRun to
// the new slice. Best-effort: missing crew is a soft no-op so the agent
// can still proceed; the loop driver inspects the return.
export async function writeCrewRunBrief(repoPath, { sliceId, title, goal }) {
  const cli = await findHeroCrewCli();
  if (!cli) return { skipped: "hero-crew CLI not found" };
  const args = [
    cli,
    "write-run-brief",
    "--repo",
    repoPath,
    "--title",
    title || sliceId,
    "--owner",
    "autonomous-loop"
  ];
  if (goal) args.push("--goal", goal);
  try {
    const { stdout } = await execFile("node", args, { maxBuffer: 1024 * 1024 });
    try {
      return JSON.parse(stdout);
    } catch {
      return { stdout: stdout.slice(0, 500) };
    }
  } catch (err) {
    return { error: err.message };
  }
}

export async function tryWriteCostReport(repoPath, sliceId) {
  const cli = await findHeroCrewCli();
  if (!cli) return { skipped: "hero-crew CLI not found" };

  const reportArgs = [
    cli,
    "cost-slice",
    "--repo",
    repoPath,
    "--run-title",
    sliceId,
    "--aggregate-all"
  ];
  let report;
  try {
    const { stdout } = await execFile("node", reportArgs, { maxBuffer: 1024 * 1024 });
    try {
      report = JSON.parse(stdout);
    } catch {
      report = { stdout: stdout.slice(0, 500) };
    }
  } catch (err) {
    report = { error: err.message };
  }

  let advise = null;
  try {
    const { stdout } = await execFile("node", [cli, "cost-advise", "--repo", repoPath], {
      maxBuffer: 1024 * 1024
    });
    try {
      advise = JSON.parse(stdout);
    } catch {
      advise = { stdout: stdout.slice(0, 500) };
    }
  } catch (err) {
    advise = { error: err.message };
  }

  return { ...report, advise };
}

function renderSynthesisScores(grade, sliceId, SCORE_DIMENSIONS) {
  if (!grade) {
    return `_(no grade yet — run \`/autonomous-loop:slice grade --id ${sliceId}\`)_`;
  }
  return SCORE_DIMENSIONS.map((dim) => `- ${dim}: ${grade.scores?.[dim] ?? "(unset)"}`).join("\n");
}

function renderSynthesisDecisions(grade) {
  const decisions = grade?.frontmatter?.decisions;
  if (!decisions || decisions.length === 0) return "_(no decisions captured)_";
  return decisions.map((d) => `- ${d}`).join("\n");
}

function renderSynthesisBody({
  sliceId,
  sliceRel,
  featureRel,
  specChanges,
  scoresBlock,
  decisionsBlock,
  grade
}) {
  return [
    `# Final synthesis — ${sliceId}`,
    "",
    "## What shipped",
    "",
    `- Slice: \`${sliceRel}\` (completed)`,
    featureRel ? `- Feature: \`${featureRel}\` (done)` : "",
    specChanges?.length > 0
      ? `- Spec status changes: ${specChanges.map((c) => `${c.id} → ${c.to}`).join(", ")}`
      : "",
    "",
    "## Grade",
    "",
    scoresBlock,
    "",
    "## Decisions captured",
    "",
    decisionsBlock,
    "",
    "## Continuity hooks",
    "",
    "- Next slice selection follows Cross-Slice Continuation HARD RULE",
    "- Researcher planning next slice should read this synthesis + recent grades for lessons-feed-forward",
    "",
    "## References",
    "",
    grade
      ? `- Grade file: \`docs/grades/${sliceId}-grade.md\``
      : "- Grade missing — synthesis is incomplete",
    `- Slice handoff: \`.claude/artifacts/crew/handoffs/<timestamp>-${sliceId.toLowerCase()}-complete.md\``,
    ""
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeCrewFinalSynthesis(
  repoPath,
  { sliceId, slicePath, featureId, featureResult, specChanges }
) {
  const runsDir = path.join(repoPath, ".claude/artifacts/crew/runs");
  await ensureDir(runsDir);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const target = path.join(runsDir, `${stamp}-${sliceId.toLowerCase()}-final-synthesis.md`);

  const { findGradeForSlice, SCORE_DIMENSIONS } = await import("../grade-parser.mjs");
  const grade = await findGradeForSlice(repoPath, sliceId);
  const fm = {
    kind: "final-synthesis",
    slice: sliceId,
    feature: featureId || null,
    grade: grade ? `GRADE-${sliceId}` : null,
    decisions: grade?.frontmatter?.decisions || [],
    created_at: new Date().toISOString().slice(0, 10)
  };

  const sliceRel = path.relative(repoPath, slicePath).replace(/\\/g, "/");
  const featureRel = featureResult?.to
    ? path.relative(repoPath, featureResult.to).replace(/\\/g, "/")
    : null;
  const body = renderSynthesisBody({
    sliceId,
    sliceRel,
    featureRel,
    specChanges,
    scoresBlock: renderSynthesisScores(grade, sliceId, SCORE_DIMENSIONS),
    decisionsBlock: renderSynthesisDecisions(grade),
    grade
  });
  const { serializeFrontmatter } = await import("../frontmatter.mjs");
  await fs.writeFile(target, serializeFrontmatter(fm, body));
  return { synthesisPath: target, hasGrade: Boolean(grade) };
}

export async function writeCrewHandoff(
  repoPath,
  { sliceId, slicePath, featureId, featureResult, specChanges }
) {
  const handoffDir = path.join(repoPath, ".claude/artifacts/crew/handoffs");
  await ensureDir(handoffDir);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const filename = `${stamp}-${sliceId.toLowerCase()}-complete.md`;
  const target = path.join(handoffDir, filename);
  const sliceRel = path.relative(repoPath, slicePath).replace(/\\/g, "/");
  const featureRel = featureResult?.to
    ? path.relative(repoPath, featureResult.to).replace(/\\/g, "/")
    : null;
  const today = new Date().toISOString().slice(0, 10);
  const fm = {
    kind: "handoff",
    objective: `Slice ${sliceId} complete — grade + start next slice`,
    owner: "lead",
    slice: sliceId,
    feature: featureId || null,
    created_at: today,
    confidence: "high",
    next_handoff: "grade-and-continue"
  };
  const body = [
    `# Handoff — ${sliceId} complete`,
    "",
    "## Objective",
    "",
    `Slice ${sliceId} closed with acceptance criteria PASS. Capture lessons + decisions via grading, then resume Cross-Slice Continuation.`,
    "",
    "## Allowed scope",
    "",
    `- Run \`/autonomous-loop:slice grade --id ${sliceId}\` to draft grade file.`,
    `- Edit \`docs/grades/${sliceId}-grade.md\` (scores, lessons, decisions, narrative).`,
    `- Run \`/autonomous-loop:slice grade-write --id ${sliceId}\` to extract decisions + emit telemetry.`,
    "- Pick next slice via Cross-Slice Continuation HARD RULE.",
    "",
    "## Forbidden scope",
    "",
    "- Starting next slice before grade is written (loses self-improvement signal).",
    "",
    "## Deliverable",
    "",
    `- \`docs/grades/${sliceId}-grade.md\` populated + grade-write'd`,
    "- Any extracted `docs/decisions/DEC-NNN.md` files",
    "",
    "## Changed files / evidence",
    "",
    `- slice file (completed): \`${sliceRel}\``,
    featureRel ? `- feature file (done): \`${featureRel}\`` : "",
    specChanges && specChanges.length > 0
      ? `- spec status changes: ${specChanges.map((c) => `${c.id} → ${c.to}`).join(", ")}`
      : "",
    "",
    "## Confidence",
    "",
    "High — slice + feature moves atomic; spec reconciliation idempotent.",
    "",
    "## Risks or open questions",
    "",
    "- Grading skipped → no retrospective signal for this slice.",
    "",
    "## Suggested next handoff",
    "",
    "After grade-write, lead picks next slice + opens new builder handoff.",
    ""
  ]
    .filter(Boolean)
    .join("\n");
  const { serializeFrontmatter } = await import("../frontmatter.mjs");
  await fs.writeFile(target, serializeFrontmatter(fm, body));
  return { handoffPath: target };
}
