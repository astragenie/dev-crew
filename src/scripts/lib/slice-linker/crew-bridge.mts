// Bridge layer that hands slice-completion artifacts off to the crew
// library. Direct in-process imports of crew/scripts/lib/** functions — no
// more subprocess/execFile hop (P2 seam-elimination, SLICE-11). Best-effort:
// any single failure (cost-report / handoff / final-synthesis) does not
// block the others; each fail-soft call catches internally, logs a
// structured line naming the call site (AC-4), and returns an `{ error }`
// shape so callers' `bestEffort()` wrappers see identical behavior to the
// old CLI-catch path.
//
// Extracted from slice-linker.mjs during the Tier B-8 split.

import fs from "node:fs/promises";
import path from "node:path";

import { writeArtifact } from "../../../../crew/scripts/lib/artifacts/write.mjs";
import type { ArtifactFields } from "../../../../crew/scripts/lib/artifacts/write.mjs";
import { costSliceHandler } from "../../../../crew/scripts/lib/cost-hygiene/cost-slice-handler.mjs";
import { writeCostAdviseArtifact } from "../../../../crew/scripts/lib/cost-hygiene/cost-advise-writer.mjs";
import {
  buildCostAdvisor,
  renderCostAdvisorMarkdown
} from "../../../../crew/scripts/lib/cost-advisor.mjs";
import { markWorkflowBadge } from "../../../../crew/scripts/lib/workflow-state.mjs";
import { buildArtifactSlug, buildArtifactTitle } from "../artifact-naming.mjs";
import { ensureDir, gradesRoot, decisionsRoot } from "../paths.mjs";
import { fanoutEnvelope } from "../webhook-fanout.mjs";
import { gitTextOrThrow } from "../run-git.mjs";
import { readCrewWorkflowState } from "../crew-workflow-reader.mjs";
import { renderIdentification } from "./agent-report-writer.mjs";
import { dedupeCostReportsInDir } from "./cost-report-dedup.mjs";
import {
  resolveCostScanWindow,
  resolveCostReportSessionId,
  writeCostScanCursor
} from "./cost-scan-cursor.mjs";

// Writes both cost-report (cost/) and cost-advise (cost-insights/) so the
// slice-close artifact set matches what `crew write-final-synthesis`
// auto-emits. `--aggregate-all` (aggregateAll flag) mirrors
// maybeEmitCostReport's default in crew.mts so cross-repo sessions are
// captured. The advise step is best-effort and reported in the return
// alongside the report.
// Direct-imports `writeArtifact("run-brief", ...)` to rotate
// workflow-state.currentRun to the new slice. Best-effort: a write failure
// is a soft no-op so the agent can still proceed; the loop driver inspects
// the return.
export async function writeCrewRunBrief(
  repoPath: string,
  {
    sliceId,
    title,
    goal,
    featureId,
    phase,
    mode,
    pace,
    scope,
    outOfScope
  }: {
    sliceId: string;
    title?: string | null;
    goal?: string | null;
    featureId?: string | null;
    phase?: string | null;
    mode?: string | null;
    pace?: string | null;
    scope?: string | null;
    outOfScope?: string | null;
  }
) {
  const titleSummary = title ? title.replace(/^SLICE-\d+:\s*/i, "") : null;
  const enrichedTitle = buildArtifactTitle({
    featureId,
    phase,
    sliceId,
    summary: titleSummary && titleSummary !== sliceId ? titleSummary : undefined
  });
  const hasPhase = phase !== null && phase !== undefined && String(phase).length > 0;
  const fields: ArtifactFields = {
    title: enrichedTitle,
    owner: "loop",
    next: "Begin implementation",
    ...(goal ? { goal } : {}),
    ...(mode ? { mode } : {}),
    ...(pace ? { pace } : {}),
    ...(scope ? { scope } : {}),
    ...(outOfScope ? { outOfScope } : {}),
    ...(featureId ? { feature: featureId } : {}),
    ...(hasPhase ? { phase: phase as string } : {})
  };
  try {
    const r = await writeArtifact(repoPath, "run-brief", fields);
    if (r.ok === false) throw r.error;
    return r.value;
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] write-run-brief failed (slice=${sliceId}): ${message}`);
    return { error: message };
  }
}

// Cost attribution mode:
// - "aggregate" (default): pass --aggregate-all so cross-repo session
//   work is captured (mirrors maybeEmitCostReport in crew.mjs).
// - "scoped": pass --source-project <slug> so concurrent loops in sibling
//   worktrees don't bleed into each other's cost windows.
// Config override: if config.loop.costProject is set, always use scoped
// with that value — avoids false-high alerts from aggregate mode when
// running a single repo alongside other active repos.
// Auto-detect fallback: linked worktree OR multiple worktrees → scoped.
export async function detectCostMode(repoPath: string, config: Record<string, any> | null) {
  if (config?.loop?.costProject) return "scoped";
  try {
    const { stdout: commonDir } = await gitTextOrThrow(["rev-parse", "--git-common-dir"], {
      cwd: repoPath,
      maxBuffer: 64 * 1024
    });
    const { stdout: gitDir } = await gitTextOrThrow(["rev-parse", "--git-dir"], {
      cwd: repoPath,
      maxBuffer: 64 * 1024
    });
    // Resolve both to absolute paths against repoPath before comparing —
    // git may emit one as relative and the other as absolute (Windows w/
    // home-dir git repo surfaced this), making string-equality false.
    const path = await import("node:path");
    const commonAbs = path.resolve(repoPath, commonDir.trim());
    const gitAbs = path.resolve(repoPath, gitDir.trim());
    if (commonAbs !== gitAbs) return "scoped";
    const { stdout: list } = await gitTextOrThrow(["worktree", "list", "--porcelain"], {
      cwd: repoPath,
      maxBuffer: 256 * 1024
    });
    const count = list.split(/\r?\n/).filter((l) => l.startsWith("worktree ")).length;
    return count > 1 ? "scoped" : "aggregate";
  } catch {
    return "aggregate";
  }
}

// Accepts either a bare sliceId (legacy callers) or a { sliceId, featureId,
// phase } object. The structured form is preferred — it lets the cost-slice
// run-title include the FEAT/phase tags so crew's slugifier writes them into
// the cost-report filename.

// Normalizes a human-readable project name or repo path into the slug form
// crew's session scanner expects under ~/.claude/projects/<slug>/ — same
// regex crew's own slugifyRepoPath uses (session-cost.ts). Idempotent: a
// dash already matches [^A-Za-z0-9] and maps to itself, so an
// already-slugified value passes through unchanged (SLICE-175 root-cause
// spike: docs/research/2026-08-02-citylive-zero-cost-telemetry.md — an
// unslugified config.loop.costProject bypasses crew's auto-detect fallback
// and silently zeroes the cost report).
function slugifyProjectSlug(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "-");
}

// Appends --source-project flags for the primary project and any aliases
// declared in config.loop.costProjectAliases. The crew CLI 0.9.0 parser
// uses last-one-wins when multiple --source-project flags are passed, so
// aliases are pushed FIRST and primary is pushed LAST — this ensures the
// primary wins in current crew builds while the full alias list is present
// for future crew versions that may support multi-source aggregation.
export function appendSourceProjectArgs(
  args: string[],
  primary: string,
  aliases: string[] | null | undefined
) {
  if (Array.isArray(aliases)) {
    for (const alias of aliases) {
      if (typeof alias === "string" && alias.length > 0) {
        args.push("--source-project", alias);
      }
    }
  }
  args.push("--source-project", primary);
}

// Builds the costSliceHandler flags record for the resolved mode/window.
// Aliases (config.loop.costProjectAliases) only mattered for the old argv
// path's last-flag-wins CLI parsing (appendSourceProjectArgs) — a
// direct-call flags object has a single sourceProject key, so only the
// primary project (the value that always won under argv too) needs to be
// set here. See appendSourceProjectArgs' own tests for the argv-shape
// behavior this replaces.
function buildCostSliceFlags(
  mode: "scoped" | "aggregate",
  config: Record<string, any> | null,
  repoPath: string,
  window: { startedAt: string | null; completedAt: string },
  featureId: string | null,
  phase: string | null,
  runTitle: string
): Record<string, unknown> {
  const flags: Record<string, unknown> = { runTitle };
  if (window.startedAt) flags.startedAt = window.startedAt;
  if (window.completedAt) flags.completedAt = window.completedAt;
  if (mode === "scoped") {
    flags.sourceProject = slugifyProjectSlug(config?.loop?.costProject ?? repoPath);
  } else {
    flags.aggregateAll = true;
  }
  if (featureId) flags.feature = featureId;
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    flags.phase = phase;
  }
  return flags;
}

// Direct-imports costSliceHandler. Fail-soft: catches internally, logs the
// call site (AC-4), and returns `{ error }` so the cursor-advance-only-on-
// success gate in tryWriteCostReport can inspect it the same way the old
// execFile-catch path did.
async function runCostSliceCall(
  repoPath: string,
  flags: Record<string, unknown>,
  sliceId: string | null | undefined
): Promise<Record<string, any>> {
  try {
    return await costSliceHandler({ repoPath, flags });
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] cost-slice failed (slice=${sliceId ?? "unknown"}): ${message}`);
    return { error: message };
  }
}

// Direct-imports buildCostAdvisor/renderCostAdvisorMarkdown/
// writeCostAdviseArtifact and mirrors crew.mts's own "cost-advise" CLI
// handler return shape (target/recommendations/aggregateFlags/baseline/
// reportsAnalyzed/artifactPath) so downstream consumers
// (postCostAdviseEnvelope, slice-close consumers) see an identical object
// either way. Fail-soft: catches internally, logs the call site (AC-4).
async function runCostAdviseCall(
  repoPath: string,
  runTitle: string,
  featureId: string | null,
  phase: string | null,
  sliceId: string | null | undefined
): Promise<Record<string, any>> {
  try {
    const advisor = await buildCostAdvisor(repoPath, { limit: 10 });
    const md = renderCostAdvisorMarkdown(advisor);
    const artifactPath = await writeCostAdviseArtifact(
      repoPath,
      md,
      advisor as unknown as Record<string, unknown>,
      { title: runTitle, feature: featureId, phase }
    );
    return {
      target: advisor.target?.sliceId || advisor.target?.runTitle || null,
      recommendations: advisor.recommendations,
      aggregateFlags: advisor.aggregateFlags || [],
      baseline: advisor.baseline,
      reportsAnalyzed: advisor.reports.length,
      artifactPath
    };
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] cost-advise failed (slice=${sliceId ?? "unknown"}): ${message}`);
    return { error: message };
  }
}

export async function tryWriteCostReport(
  repoPath: string,
  sliceOrInfo: string | Record<string, any> | null,
  config: Record<string, any> | null
) {
  const info = typeof sliceOrInfo === "string" ? { sliceId: sliceOrInfo } : sliceOrInfo || {};
  const { sliceId, featureId = null, phase = null } = info as Record<string, any>;

  const mode = await detectCostMode(repoPath, config);
  const runTitle = buildArtifactTitle({ featureId, phase, sliceId });
  const workflowState = await readCrewWorkflowState(repoPath);
  // SLICE-162: resolve this slice's OWN scan window (persisted cursor,
  // falling back to currentRun.startedAt only on the slice's first-ever
  // scan) instead of always relying on crew's shared currentRun fallback
  // — see cost-scan-cursor.mjs for the full root-cause rationale.
  const window = await resolveCostScanWindow(repoPath, sliceId, workflowState);
  const costSliceFlags = buildCostSliceFlags(
    mode,
    config,
    repoPath,
    window,
    featureId,
    phase,
    runTitle
  );
  const report = await runCostSliceCall(repoPath, costSliceFlags, sliceId);

  // Only advance the cursor when the direct call actually succeeded — a
  // failed invocation leaves the window untouched so the next attempt
  // retries the same, still-valid span instead of silently skipping it.
  // FEAT-025's honesty guard (costSliceHandler -> evaluateCostReportGuard)
  // can also REFUSE without throwing, returning
  // `{ written: false, reason, preserveCursor, cost }` with no `.error`
  // key. The cursor decision is data-driven per reason (see
  // cost-report-guard.mts's PRESERVE_CURSOR_BY_REASON): only
  // `window_too_wide` loses real unreported session activity if the
  // cursor advances past it. `sessions_scanned_zero` and `duplicate run_id`
  // have nothing to lose by advancing, and holding on every refusal would
  // contradict FEAT-268's "two consecutive scans must advance" contract
  // (cost-scan-window-regression.test.mts) — a review B / verifier
  // follow-up on SLICE-50's first pass, which held on ANY refusal.
  if (sliceId && !report?.error && report?.preserveCursor !== true) {
    await writeCostScanCursor(repoPath, sliceId, window.completedAt);
  }

  // AC-3: stamp the originating crew session/transcript id into the
  // written report's frontmatter — crew's own artifact writer has no
  // field for this today (see the root-cause spike), so this is a
  // best-effort loop-side post-write patch, not a dedup-fingerprint
  // change (resolveCostReportUsd/sliceKeyOf never read this field).
  await stampCostReportSessionId(report, resolveCostReportSessionId(workflowState));

  // FEAT-204: sweep the cost-report directory for shared-session
  // duplicates left by this (or a sibling wave FEAT's) invocation and
  // collapse them to shared_with references. Best-effort -- a sweep
  // failure never blocks the cost-report/advise flow.
  const dedup = await sweepCostReportDedup(repoPath, config);

  const advise = await runCostAdviseCall(repoPath, runTitle, featureId, phase, sliceId);

  // FEAT-234 (cross-repo): emit `cost.advise_recorded` envelope so the
  // runner-side handler can persist into jsonl_cost_advises + render via
  // the v2 read path when the per-app UseJsonlCostAdvises flag flips.
  // Fail-silent contract: webhook-fanout swallows transport errors; the
  // md file on disk remains authoritative.
  if (advise && !advise.error) {
    await postCostAdviseEnvelope(repoPath, { sliceId, featureId, runTitle, advise });
  }

  return { ...report, advise, costMode: mode, dedup };
}

// Collects every report file path a `crew cost-slice` JSON return can carry.
// The CLI's return shape varies: a plain slice report returns `{ path, ... }`
// at the top level; an aggregate-mode call that found multiple sources
// returns `{ slice: {...}, aggregate: {...} }`, each with their own `path`.
// Exported for direct unit coverage (SLICE-162).
export function collectCostReportPaths(report: Record<string, any> | null | undefined): string[] {
  if (!report) return [];
  const paths: string[] = [];
  if (typeof report.path === "string") paths.push(report.path);
  if (typeof report.slice?.path === "string") paths.push(report.slice.path);
  if (typeof report.aggregate?.path === "string") paths.push(report.aggregate.path);
  return paths;
}

// Best-effort post-write patch: adds `session_id` to a just-written cost
// report's frontmatter without disturbing any other field (in particular
// `slice` / `usd`, which resolveCostReportUsd/sliceKeyOf in
// memory-snapshot.mts key their dedup on — AC-4 requires those untouched).
// A stamp failure never blocks the cost-report/advise flow.
export async function stampCostReportSessionId(
  report: Record<string, any> | null | undefined,
  sessionId: string | null
): Promise<void> {
  if (!sessionId) return;
  const paths = collectCostReportPaths(report);
  if (paths.length === 0) return;
  const { mergeFrontmatter } = await import("../frontmatter.mjs");
  for (const reportPath of paths) {
    try {
      const raw = await fs.readFile(reportPath, "utf8");
      await fs.writeFile(reportPath, mergeFrontmatter(raw, { session_id: sessionId }));
    } catch {
      // best-effort — never blocks the cost-report/advise flow
    }
  }
}

// Resolves the cost-report directory used by `crew cost-slice` writes and
// runs the dedup sweep against it. A config override
// (config.loop.costReportsDir) is honored for parity with any future
// crew-side path customization; otherwise the standard
// .claude/artifacts/crew/cost/ location is used.
async function sweepCostReportDedup(
  repoPath: string,
  config: Record<string, any> | null
): Promise<{ groups: number; deduped: string[] } | { error: string }> {
  try {
    const costDir =
      typeof config?.loop?.costReportsDir === "string"
        ? path.join(repoPath, config.loop.costReportsDir)
        : path.join(repoPath, ".claude/artifacts/crew/cost");
    return await dedupeCostReportsInDir(costDir);
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

/**
 * Build a `cost.advise_recorded` envelope from the cost-advise CLI output
 * and ship it via the Pattern-B webhook-fanout (loop.notifications.webhook
 * in .claude/loop.json + ~/.astrarunner/tokens.json bearer lookup).
 *
 * Payload mirrors SPEC-FEAT-234 §4.1. Fields the CLI doesn't supply are
 * omitted — the runner handler validates only `sliceId` as required and
 * tolerates missing optional baselines.
 */
async function postCostAdviseEnvelope(
  repoPath: string,
  opts: {
    sliceId: string;
    featureId: string | null | undefined;
    runTitle: string;
    advise: Record<string, any>;
  }
): Promise<void> {
  const a = opts.advise;
  // The CLI's stdout JSON has historically nested findings under either
  // `recommendations`, `findings`, or `flags`. Accept all three keys with
  // `recommendations` taking precedence so future CLI renames are forward-
  // compatible without a runner-side change.
  const recommendations = pickArray(a.recommendations) ?? pickArray(a.findings) ?? [];
  const aggregateFlags =
    pickArray(a.aggregateFlags) ?? pickArray(a.aggregate_flags) ?? pickArray(a.flags) ?? [];
  const baselineUsdMedian = pickNumber(a.baselineUsdMedian) ?? pickNumber(a.baseline_usd_median);
  const baselineUsdP75 = pickNumber(a.baselineUsdP75) ?? pickNumber(a.baseline_usd_p75);
  const baselineCacheHitMedian =
    pickNumber(a.baselineCacheHitMedian) ?? pickNumber(a.baseline_cache_hit_median);

  const payload: Record<string, unknown> = {
    sliceId: opts.sliceId,
    targetSliceId: opts.sliceId,
    featureId: opts.featureId ?? null,
    runTitle: opts.runTitle,
    recommendations,
    aggregateFlags,
    baselineUsdMedian,
    baselineUsdP75,
    baselineCacheHitMedian,
    ts: new Date().toISOString()
  };

  await fanoutEnvelope(repoPath, "cost.advise_recorded", payload);
}

function pickArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function pickNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Direct-imports `markWorkflowBadge({ badge: "validation_skipped", ... })`
// so the skip is captured in workflow-state with an audit trail.
// Best-effort: a write failure is reported via `{ error }`, identical to
// the other bridge calls. The slice close still proceeds — the bypass
// already passed the gate in completeSlice; this call only records *why*.
export async function markValidationSkippedBadge(repoPath: string, reason: string) {
  const note = reason || "validation_skipped via /devcrew:slice complete --skip-validation-check";
  try {
    const result = await markWorkflowBadge(repoPath, { badge: "validation_skipped", note });
    if (result.ok === false) throw result.error;
    return { badge: "validation_skipped", currentRun: result.value };
  } catch (err: unknown) {
    const message = (err as Error).message;
    console.error(`[crew-bridge] mark-badge failed (badge=validation_skipped): ${message}`);
    return { error: message };
  }
}

function renderSynthesisScores(
  grade: Record<string, any> | null,
  sliceId: string,
  SCORE_DIMENSIONS: string[]
) {
  if (!grade) {
    return `_(no grade yet — run \`/devcrew:slice grade --id ${sliceId}\`)_`;
  }
  return SCORE_DIMENSIONS.map((dim) => `- ${dim}: ${grade.scores?.[dim] ?? "(unset)"}`).join("\n");
}

function renderSynthesisDecisions(grade: Record<string, any> | null) {
  const decisions = grade?.frontmatter?.decisions;
  if (!decisions || decisions.length === 0) return "_(no decisions captured)_";
  return decisions.map((d: string) => `- ${d}`).join("\n");
}

function renderSynthesisBody({
  sliceId,
  sliceRel,
  featureRel,
  specChanges,
  scoresBlock,
  decisionsBlock,
  grade,
  repoPath,
  config,
  featureId,
  phase
}: {
  sliceId: string;
  sliceRel: string;
  featureRel: string | null;
  specChanges: Record<string, any>[] | null | undefined;
  scoresBlock: string;
  decisionsBlock: string;
  grade: Record<string, any> | null;
  repoPath: string;
  config: Record<string, any> | null;
  featureId: string | null | undefined;
  phase: string | null | undefined;
}) {
  const gradeRel = path
    .relative(repoPath, path.join(gradesRoot(repoPath, config), `${sliceId}-grade.md`))
    .replace(/\\/g, "/");
  const id = renderIdentification(phase, featureId, sliceId);
  return [
    `# Final synthesis — ${sliceId}`,
    "",
    ...(id ? [id, ""] : []),
    "## What shipped",
    "",
    `- Slice: \`${sliceRel}\` (completed)`,
    featureRel ? `- Feature: \`${featureRel}\` (done)` : "",
    specChanges && specChanges.length > 0
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
    grade ? `- Grade file: \`${gradeRel}\`` : "- Grade missing — synthesis is incomplete",
    `- Slice handoff: \`.claude/artifacts/crew/handoffs/<timestamp>-${sliceId.toLowerCase()}-complete.md\``,
    ""
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeCrewFinalSynthesis(
  repoPath: string,
  {
    sliceId,
    slicePath,
    featureId,
    phase = null,
    featureResult,
    specChanges,
    config = null
  }: {
    sliceId: string;
    slicePath: string;
    featureId?: string | null;
    phase?: string | null;
    featureResult?: Record<string, any> | null;
    specChanges?: Record<string, any>[] | null;
    config?: Record<string, any> | null;
  }
) {
  const runsDir = path.join(repoPath, ".claude/artifacts/crew/runs");
  await ensureDir(runsDir);
  const slug = buildArtifactSlug({ featureId, phase, sliceId });
  // No timestamp — slice closes once per slice id, so the filename is
  // already unique. Re-running the close overwrites the previous artifact
  // (intentional — the latest state is authoritative).
  const target = path.join(runsDir, `${slug}-final-synthesis.md`);

  const { findGradeForSlice, SCORE_DIMENSIONS } = await import("../grade-parser.mjs");
  const grade = await findGradeForSlice(repoPath, sliceId);
  const fm = {
    kind: "final-synthesis",
    slice: sliceId,
    feature: featureId || null,
    phase: phase || null,
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
    specChanges: specChanges ?? null,
    scoresBlock: renderSynthesisScores(grade, sliceId, SCORE_DIMENSIONS),
    decisionsBlock: renderSynthesisDecisions(grade),
    grade,
    repoPath,
    config: config ?? null,
    featureId,
    phase
  });
  const { serializeFrontmatter } = await import("../frontmatter.mjs");
  await fs.writeFile(target, serializeFrontmatter(fm, body));
  return { synthesisPath: target, hasGrade: Boolean(grade) };
}

export async function tryWriteAgentReport(
  repoPath: string,
  {
    sliceId,
    featureId,
    phase,
    startedAt
  }: {
    sliceId: string;
    featureId?: string | null;
    phase?: string | null;
    startedAt?: string | null;
  }
) {
  const { writeAgentReport } = await import("./agent-report-writer.mjs");
  return writeAgentReport(repoPath, {
    sliceId,
    ...(featureId !== undefined ? { featureId } : {}),
    ...(phase !== undefined ? { phase } : {}),
    ...(startedAt !== undefined ? { startedAt } : {})
  });
}

export async function writeCrewHandoff(
  repoPath: string,
  {
    sliceId,
    slicePath,
    featureId,
    phase = null,
    featureResult,
    specChanges,
    config = null
  }: {
    sliceId: string;
    slicePath: string;
    featureId?: string | null;
    phase?: string | null;
    featureResult?: Record<string, any> | null;
    specChanges?: Record<string, any>[] | null;
    config?: Record<string, any> | null;
  }
) {
  const handoffDir = path.join(repoPath, ".claude/artifacts/crew/handoffs");
  await ensureDir(handoffDir);
  const slug = buildArtifactSlug({ featureId, phase, sliceId });
  // No timestamp — handoff is emitted once per slice close, slug already
  // unique. Re-running the close overwrites; latest is authoritative.
  const filename = `${slug}-complete.md`;
  const target = path.join(handoffDir, filename);
  const sliceRel = path.relative(repoPath, slicePath).replace(/\\/g, "/");
  const featureRel = featureResult?.to
    ? path.relative(repoPath, featureResult.to).replace(/\\/g, "/")
    : null;
  const today = new Date().toISOString().slice(0, 10);
  const fm = {
    kind: "handoff",
    objective: `Slice ${sliceId} complete — grade + start next slice`,
    owner: "parent-loop",
    slice: sliceId,
    feature: featureId || null,
    phase: phase || null,
    created_at: today,
    confidence: "high",
    next_handoff: "grade-and-continue"
  };
  const gradeRel = path
    .relative(repoPath, path.join(gradesRoot(repoPath, config), `${sliceId}-grade.md`))
    .replace(/\\/g, "/");
  const decisionsRel = path.relative(repoPath, decisionsRoot(repoPath, config)).replace(/\\/g, "/");
  const handoffId = renderIdentification(phase, featureId, sliceId);
  const body = [
    `# Handoff — ${sliceId} complete`,
    "",
    ...(handoffId ? [handoffId, ""] : []),
    "## Objective",
    "",
    `Slice ${sliceId} closed with acceptance criteria PASS. Capture lessons + decisions via grading, then resume Cross-Slice Continuation.`,
    "",
    "## Allowed scope",
    "",
    `- Run \`/devcrew:slice grade --id ${sliceId}\` to draft grade file.`,
    `- Edit \`${gradeRel}\` (scores, lessons, decisions, narrative).`,
    `- Run \`/devcrew:slice grade-write --id ${sliceId}\` to extract decisions + emit telemetry.`,
    "- Pick next slice via Cross-Slice Continuation HARD RULE.",
    "",
    "## Forbidden scope",
    "",
    "- Starting next slice before grade is written (loses self-improvement signal).",
    "",
    "## Deliverable",
    "",
    `- \`${gradeRel}\` populated + grade-write'd`,
    `- Any extracted \`${decisionsRel}/DEC-NNN.md\` files`,
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
