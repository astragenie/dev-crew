// FEAT-188 / SLICE-102 — single-roundtrip slice close.
//
// `closeSlice` collapses the 3-step closing ceremony (complete → grade
// → grade-write) into one call when the operator supplies a pre-formatted
// grade file AND the parent FEAT is `autonomous_safe: true`. Otherwise it
// behaves like the existing 2-step (complete + scaffold grade template),
// returning `scaffoldOnly: true` so the caller knows a manual grade-write
// is still required.
//
// FEAT-277: runner:close pre-flight (verification-before-completion).
// Before the ceremony fires, closeSlice checks whether every acceptance
// criterion in the slice file is checked (- [x]). If unchecked ACs are
// found, it returns an error shape unless `forceClose: true` is set.
//
// Return shape (success):
//   { complete, grade, scaffoldOnly, gradePath,
//     handoffPath, synthesisPath, costUsd, grades }
//
// Return shape (pre-flight failure — only when forceClose is NOT set):
//   throws PreFlightError with { code: "PREFLIGHT_EVIDENCE_MISSING",
//                                missingEvidence: string[] }

import fs from "node:fs/promises";

import { completeSlice } from "./complete-slice.mjs";
import { createGradeFile, writeGrade } from "../grade-writer.mjs";
import { normalizeGradeYaml } from "../grade-yaml-normalizer.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { parseFrontmatter } from "../frontmatter.mjs";
import { resolveConfig } from "../config-resolver.mjs";
import { findFeatureById } from "../backlog-writer.mjs";
import { bust as bustCache } from "../cache.mjs";
import { isFeatureEnabled } from "../features-service.mjs";
import { resolveQaGateMode } from "../qa-gate-config.mjs";
import { parseScoresFromBody } from "../grade-parser.mjs";
import { removeArtifactLock } from "./artifact-lock-writer.mjs";
import { recordCloseDispatchTelemetry } from "./close-dispatch-telemetry.mjs";

// ---------------------------------------------------------------------------
// Pre-flight: verification-before-completion (FEAT-277 / AC-9)
// ---------------------------------------------------------------------------

const AC_HEADING_RE = /^##\s+acceptance\s+criteria/i;
const SECTION_HEADING_RE = /^##\s+/;
const UNCHECKED_AC_RE = /^\s*-\s+\[\s\]\s+/;

/**
 * Scan the slice content for acceptance criteria that are NOT checked off.
 * Returns an array of the unchecked AC lines (empty = all checked or no ACs).
 */
export function findUncheckedAcs(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => AC_HEADING_RE.test(l));
  if (startIdx === -1) return [];

  const unchecked: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (SECTION_HEADING_RE.test(line)) break;
    if (UNCHECKED_AC_RE.test(line)) unchecked.push(line.trim());
  }
  return unchecked;
}

export interface CloseSliceOpts {
  config?: Record<string, any> | null | undefined;
  gradeYamlPath?: string | null | undefined;
  keepFeatureOpen?: boolean | undefined;
  forceClose?: boolean | undefined;
  skipValidationCheck?: string | null | undefined;
  noDocWriter?: boolean | undefined;
  noMerge?: boolean | undefined;
  dryRun?: boolean | undefined;
  skipSimplify?: boolean | undefined;
  // FEAT-263 T2 / Phase 3b: passed straight through to completeSlice — see
  // close-memory-capture.mjs doc header for the capture/credit contract.
  learningsPath?: string | null | undefined;
  learningsAgent?: string | null | undefined;
  memoriesUsedPath?: string | null | undefined;
}

export interface CloseSliceGrades {
  /** Grade file path on disk (scaffold template or fully written). */
  gradePath: string;
  /** True when no gradeYamlPath was supplied — caller must fill + grade-write. */
  scaffoldOnly: boolean;
  /** Output of writeGrade when scaffoldOnly=false; null otherwise. */
  writeGradeResult: unknown | null;
}

export interface CloseSliceResult {
  complete: unknown;
  grade: unknown | null;
  scaffoldOnly: boolean;
  gradePath: string;
  // -------------------------------------------------------------------------
  // runner:close canonical surface (FEAT-277 / AC-9)
  // Surfaces the key paths and grade summary at the top level so the CLI
  // layer (runner:close) can return { handoffPath, synthesisPath, costUsd,
  // grades } without having to drill into the nested complete object.
  // -------------------------------------------------------------------------
  /** Path to the crew handoff artifact written by the complete ceremony. */
  handoffPath: string;
  /** Path to the crew final-synthesis artifact written by the complete ceremony. */
  synthesisPath: string;
  /** Total USD cost for this slice run (0 when crew cost CLI is unavailable). */
  costUsd: number;
  /** Grade-related output — always defined; scaffoldOnly when no grade YAML supplied. */
  grades: CloseSliceGrades;
}

/** Normalizes the FEAT-263 T2/Phase 3b passthrough opts for completeSlice.
 * Extracted to its own (low-complexity) function so closeSlice's own
 * cognitive-complexity budget isn't spent on these three nullish-coalesce
 * fallbacks. */
function resolveMemoryCaptureOpts(opts: CloseSliceOpts): {
  learningsPath: string | null;
  learningsAgent: string | null;
  memoriesUsedPath: string | null;
} {
  return {
    learningsPath: opts.learningsPath ?? null,
    learningsAgent: opts.learningsAgent ?? null,
    memoriesUsedPath: opts.memoriesUsedPath ?? null
  };
}

// FEAT-275 / SLICE-178: extracted from closeSlice to keep its own cognitive
// complexity under the repo cap — scaffold-only closes (no gradeYamlPath)
// are not a completion claim, so telemetry recording is skipped for them,
// matching the pre-flight gating above.
async function recordCloseTelemetryIfCompletionClaim(
  repoPath: string,
  sliceId: string,
  slicesRoot: string,
  gradeYamlPath: string | null,
  config: Record<string, any> | null
): Promise<void> {
  if (!gradeYamlPath) return;
  const slicePath = await locateSliceFile(slicesRoot, sliceId);
  const sliceFm = slicePath
    ? parseFrontmatter(await fs.readFile(slicePath, "utf8").catch(() => "")).frontmatter
    : null;
  await recordCloseDispatchTelemetry(repoPath, sliceId, config, sliceFm);
}

export async function closeSlice(
  repoPath: string,
  sliceId: string,
  opts: CloseSliceOpts = {}
): Promise<CloseSliceResult> {
  if (!sliceId) throw new Error("closeSlice requires a sliceId.");

  const config = opts.config ?? (await resolveConfig(repoPath));
  const gradeYamlPath = opts.gradeYamlPath ?? null;

  // Pre-flight: verification-before-completion (FEAT-277 / AC-9).
  //
  // When a gradeYamlPath is provided the caller is asserting the slice is
  // DONE — that is a completion claim. Run the pre-flight to verify every
  // AC is checked off. Bypassed when forceClose=true (escape hatch for
  // doc-only slices, infra-only slices, and test fixtures where ACs are
  // intentionally unchecked).
  //
  // Scaffold-only path (no gradeYamlPath) is NOT a completion claim — the
  // caller is only creating a grade template to fill in later. No pre-flight.
  if (gradeYamlPath && !opts.forceClose) {
    const slicesRoot = resolveSlicesRoot(repoPath, config);
    const slicePath = await locateSliceFile(slicesRoot, sliceId);
    if (slicePath) {
      const sliceContent = await fs.readFile(slicePath, "utf8");
      const unchecked = findUncheckedAcs(sliceContent);
      if (unchecked.length > 0) {
        const err = new Error(
          `runner:close pre-flight failed: ${unchecked.length} acceptance criterion/criteria not yet checked off. ` +
            `Mark all ACs [x] with evidence before closing, or use --force-close to bypass.`
        ) as NodeJS.ErrnoException;
        err.code = "PREFLIGHT_EVIDENCE_MISSING";
        (err as any).missingEvidence = unchecked;
        throw err;
      }
    }
  }

  // autonomous_safe gate runs BEFORE any side effects so a refuse leaves
  // the slice + FEAT state untouched.
  if (gradeYamlPath) {
    await assertAutonomousSafe(repoPath, sliceId, config);
  }

  // P1.4 tier (b): hard close-refusal pre-flight (GATE_FAILED_AT_CLOSE),
  // sibling to PREFLIGHT_EVIDENCE_MISSING above. Single-shot --grade-yaml
  // path only (a completion claim); scaffold-only closes are gated by the
  // soft-block tier inside completeSlice. forceClose bypasses (audited in
  // completeSlice); warn-mode for the first 3 gate-evaluated closes after
  // landing (persisted counter) per the plan's rollout.
  if (gradeYamlPath && !opts.forceClose && isFeatureEnabled("close-refusal", config)) {
    await assertCloseGatesSatisfied(
      repoPath,
      sliceId,
      config,
      opts.skipValidationCheck ?? null,
      gradeYamlPath
    );
  }

  const complete = await completeSlice(repoPath, sliceId, {
    config,
    keepFeatureOpen: opts.keepFeatureOpen,
    forceClose: opts.forceClose,
    skipValidationCheck: opts.skipValidationCheck,
    noDocWriter: opts.noDocWriter,
    noMerge: opts.noMerge,
    dryRun: opts.dryRun,
    skipSimplify: opts.skipSimplify,
    ...resolveMemoryCaptureOpts(opts)
  });

  // FEAT-264 SLICE-4 (AC-4): release the goalpost-lock (if any) for this
  // slice now that it is closing — fail-soft, never throws (artifact-lock-writer.mjs).
  await removeArtifactLock(repoPath, sliceId);

  // completeSlice moves the slice file from pending/ → completed/. The
  // locateSliceFile cache (in ../cache.mjs) still returns the pre-move
  // pending/ path; invalidate it so createGradeFile finds the new path.
  const slicesRoot = resolveSlicesRoot(repoPath, config);
  bustCache(`locateSlice:${slicesRoot}:${sliceId}`);

  // FEAT-275 / SLICE-178: single-shot close is the actual "specialist
  // dispatch completes" moment for the reviewer/validator roles — record
  // pause telemetry from the same gate derivation the close ceremony
  // already computes elsewhere (see close-dispatch-telemetry.mjs doc
  // header for why dispatch.mts itself cannot be this signal's source).
  await recordCloseTelemetryIfCompletionClaim(repoPath, sliceId, slicesRoot, gradeYamlPath, config);

  const gradeScaffold = await createGradeFile(repoPath, sliceId, { config });

  // Extract canonical surface fields from the nested complete result.
  // complete.handoff = { handoffPath } | { error } | undefined (best-effort in completeSlice)
  // complete.synthesis = { synthesisPath } | { error } | undefined
  // complete.costReport = { totalUsd } | { skipped } | { error } | undefined
  const completeAny = complete as Record<string, any> | null | undefined;
  const handoffPath: string = completeAny?.handoff?.handoffPath ?? "";
  const synthesisPath: string = completeAny?.synthesis?.synthesisPath ?? "";
  const costUsd: number =
    typeof completeAny?.costReport?.totalUsd === "number" ? completeAny.costReport.totalUsd : 0;

  if (!gradeYamlPath) {
    await regenerateSnapshot(repoPath, config);
    const grades: CloseSliceGrades = {
      gradePath: gradeScaffold.gradePath,
      scaffoldOnly: true,
      writeGradeResult: null
    };
    return {
      complete,
      grade: null,
      scaffoldOnly: true,
      gradePath: gradeScaffold.gradePath,
      handoffPath,
      synthesisPath,
      costUsd,
      grades
    };
  }

  // Single-shot path: replace the scaffolded grade with the supplied yaml,
  // then run writeGrade to validate + persist. FEAT-239: normalizeGradeYaml
  // renders a frontmatter-only grade yaml (scores map + lessons/decisions) into
  // the `## Scores` / `## Lessons` / `## Decisions` markdown body writeGrade
  // reads; a full grade-markdown input is passed through unchanged.
  const yamlContent = await fs.readFile(gradeYamlPath, "utf8");
  await fs.writeFile(gradeScaffold.gradePath, normalizeGradeYaml(yamlContent));
  const grade = await writeGrade(repoPath, sliceId, { config });

  await regenerateSnapshot(repoPath, config);

  const grades: CloseSliceGrades = {
    gradePath: gradeScaffold.gradePath,
    scaffoldOnly: false,
    writeGradeResult: grade
  };
  return {
    complete,
    grade,
    scaffoldOnly: false,
    gradePath: gradeScaffold.gradePath,
    handoffPath,
    synthesisPath,
    costUsd,
    grades
  };
}

async function assertAutonomousSafe(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<void> {
  const slicesRoot = resolveSlicesRoot(repoPath, config);
  const slicePath = await locateSliceFile(slicesRoot, sliceId);
  if (!slicePath) {
    throw new Error(`closeSlice: slice file not found for ${sliceId} under ${slicesRoot}`);
  }
  const sliceContent = await fs.readFile(slicePath, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature;
  if (typeof featureId !== "string" || featureId.length === 0) {
    throw new Error(
      `closeSlice: slice ${sliceId} has no feature back-reference; cannot apply --grade-yaml gate.`
    );
  }
  const entry = await findFeatureById(repoPath, featureId, config);
  if (!entry) {
    throw new Error(`closeSlice: feature ${featureId} not found for slice ${sliceId}.`);
  }
  if (entry.frontmatter?.autonomous_safe !== true) {
    throw new Error(
      `slice close: --grade-yaml requires FEAT autonomous_safe: true; ${sliceId}'s feature ${featureId} is human-in-loop. ` +
        "Use the 3-step path: slice complete + slice grade + slice grade-write."
    );
  }
}

// ---------------------------------------------------------------------------
// P1.4 tier (b): GATE_FAILED_AT_CLOSE pre-flight
// ---------------------------------------------------------------------------

const WARMUP_STATE_REL = ".claude/state/loop/close-refusal-state.json";
const WARMUP_CLOSES = 3;

// FEAT-264 SLICE-5 (AC-5): a test_confidence grade score below this value
// blocks runner:close via GATE_FAILED_AT_CLOSE — but only when the owning
// repo has opted in via `loop.qa_gate: "pre-build"` (config-scoped; see
// qa-gate-config.mts). Matches the same 0.80 bar the FEAT text and the
// existing grade-trend halt-badge (loop.gradeTrendThreshold) both use.
const TEST_CONFIDENCE_CLOSE_GATE_THRESHOLD = 0.8;

// Extracts the `test_confidence` score from a raw --grade-yaml file's
// content. The gate check runs BEFORE completeSlice/normalizeGradeYaml, so
// the file may be in either shape normalizeGradeYaml understands (see
// grade-yaml-normalizer.mjs doc header): a populated `## Scores` markdown
// body (checked first), or a pure-YAML `scores:` frontmatter map (fallback).
// Returns null when the key is absent from both shapes — callers must treat
// that as "unknown", not "failing" (architect C.4 / this slice's AC-5).
export function extractTestConfidenceFromGradeYaml(content: string): number | null {
  const { frontmatter, body } = parseFrontmatter(content);
  const bodyScores = parseScoresFromBody(body);
  if (typeof bodyScores.test_confidence === "number") return bodyScores.test_confidence;

  const fmScores = frontmatter?.scores;
  if (fmScores && typeof fmScores === "object" && !Array.isArray(fmScores)) {
    const v = (fmScores as Record<string, unknown>).test_confidence;
    if (typeof v === "number") return v;
  }
  return null;
}

// FEAT-264 SLICE-5 (AC-5): config-scoped test_confidence close gate. Reads
// the INCOMING --grade-yaml file directly (this check runs before
// completeSlice moves/normalizes it — architect C.4) and returns a failure
// descriptor only when `loop.qa_gate` is `"pre-build"` AND test_confidence
// is present and below TEST_CONFIDENCE_CLOSE_GATE_THRESHOLD. A missing
// test_confidence key is NOT treated as a failure (absent ≠ failing) — it
// only logs a warning, so an ungraded dimension never silently blocks close.
export async function checkQaGradeGate(
  gradeYamlPath: string | null,
  config: Record<string, any> | null
): Promise<{ failure: string; testConfidence: number } | null> {
  if (!gradeYamlPath || resolveQaGateMode(config) !== "pre-build") return null;

  let rawGradeYaml: string;
  try {
    rawGradeYaml = await fs.readFile(gradeYamlPath, "utf8");
  } catch {
    return null; // unreadable — nothing to gate on, existing pre-flights already cover file presence
  }

  const testConfidence = extractTestConfidenceFromGradeYaml(rawGradeYaml);
  if (testConfidence === null) {
    console.warn(
      "[closeSlice] qa-grade-gate: test_confidence missing from --grade-yaml; " +
        "not blocking close (absent is not treated as failing, qa_gate: pre-build)."
    );
    return null;
  }
  if (testConfidence >= TEST_CONFIDENCE_CLOSE_GATE_THRESHOLD) return null;

  return {
    testConfidence,
    failure:
      `qa-grade-gate: test_confidence ${testConfidence} < ${TEST_CONFIDENCE_CLOSE_GATE_THRESHOLD} ` +
      "(qa_gate: pre-build)"
  };
}

// Reads + increments the persisted gate-evaluated-close counter. Returns the
// count BEFORE this close (0-based): counts 0..2 are the warn-mode warm-up.
async function bumpCloseRefusalCounter(repoPath: string): Promise<number> {
  const path = await import("node:path");
  const statePath = path.join(repoPath, WARMUP_STATE_REL);
  let prior = 0;
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.gateEvaluatedCloses === "number" && parsed.gateEvaluatedCloses >= 0) {
      prior = parsed.gateEvaluatedCloses;
    }
  } catch {
    // first run / corrupt state — start at 0
  }
  try {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify({ gateEvaluatedCloses: prior + 1 }));
  } catch {
    // persistence is best-effort; a write failure must not affect the verdict
  }
  return prior;
}

// Derives review + validation gates for the single-shot close. Throws
// GATE_FAILED_AT_CLOSE (post warm-up) when either is unsatisfied; warns +
// fans out a halt-badge during the first WARMUP_CLOSES gate-evaluated closes.
// An explicit --skip-validation-check reason counts as a satisfied validation
// (completeSlice records the auditable validation_skipped badge downstream).
async function assertCloseGatesSatisfied(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null,
  skipValidationCheck: string | null,
  gradeYamlPath: string | null = null
): Promise<void> {
  const slicesRoot = resolveSlicesRoot(repoPath, config);
  const slicePath = await locateSliceFile(slicesRoot, sliceId);
  let sliceFm: Record<string, any> | null = null;
  if (slicePath) {
    const raw = await fs.readFile(slicePath, "utf8");
    sliceFm = parseFrontmatter(raw).frontmatter;
  }

  const { deriveReviewGate } = await import("../review-gate.mjs");
  const { deriveValidationGate } = await import("../validation-gate.mjs");
  const reviewGate = await deriveReviewGate(repoPath, sliceId, { sliceFm });
  const validationGate =
    skipValidationCheck && String(skipValidationCheck).trim().length > 0
      ? { satisfied: true, reason: `--skip-validation-check: ${skipValidationCheck}` }
      : await deriveValidationGate(repoPath, sliceId, { sliceFm, config });

  const failures: string[] = [];
  if (!reviewGate.satisfied) failures.push(`review-gate: ${reviewGate.reason}`);
  if (!validationGate.satisfied) failures.push(`validation-gate: ${validationGate.reason}`);

  const qaGradeGate = await checkQaGradeGate(gradeYamlPath, config);
  if (qaGradeGate) failures.push(qaGradeGate.failure);

  if (failures.length === 0) return;

  const priorCloses = await bumpCloseRefusalCounter(repoPath);
  const enforced = priorCloses >= WARMUP_CLOSES;

  try {
    const { fanoutEnvelope } = await import("../webhook-fanout.mjs");
    await fanoutEnvelope(repoPath, "halt-badge", {
      kind: "gateFailedAtClose",
      sliceId,
      failures,
      enforced,
      ts: new Date().toISOString()
    });
    if (qaGradeGate) {
      await fanoutEnvelope(repoPath, "halt-badge", {
        kind: "qaGradeGate",
        sliceId,
        testConfidence: qaGradeGate.testConfidence,
        threshold: TEST_CONFIDENCE_CLOSE_GATE_THRESHOLD,
        enforced,
        ts: new Date().toISOString()
      });
    }
  } catch {
    // fan-out optional — silent
  }

  if (priorCloses < WARMUP_CLOSES) {
    console.warn(
      `[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode ${priorCloses + 1}/${WARMUP_CLOSES}): ` +
        `${failures.join(" | ")} — enforcing after warm-up.`
    );
    return;
  }

  const err = new Error(
    `runner:close gate pre-flight failed for ${sliceId}: ${failures.join(" | ")}. ` +
      "Fix and re-run the gate, record an explicit skip, or use --force-close (audited)."
  ) as NodeJS.ErrnoException;
  err.code = "GATE_FAILED_AT_CLOSE";
  (err as any).gateFailures = failures;
  throw err;
}

// P1.6: final-step snapshot auto-regen. Reuses the existing FEAT-208
// generator (memory-snapshot.mts) — closeSlice does not render a second
// copy of loop-snapshot.md. Runs on both closeSlice exit paths (scaffold-only
// and full grade-write) so loop-snapshot.md is never more than one slice
// stale, matching the CI freshness check in validate-snapshot-freshness.mts.
// slice-progress.md is already refreshed inside completeSlice's own
// writeSliceProgress call — no second renderer needed there either.
// Gated by the snapshot-autoregen flag (P1.0); failure warns and never
// throws — a snapshot regen must not fail a slice close.
async function regenerateSnapshot(
  repoPath: string,
  config: Record<string, any> | null
): Promise<void> {
  if (!isFeatureEnabled("snapshot-autoregen", config)) return;
  try {
    const { writeMemorySnapshot } = await import("../memory-snapshot.mjs");
    await writeMemorySnapshot(repoPath, { config });
  } catch (err) {
    console.warn(
      `[closeSlice] snapshot auto-regen failed (non-fatal): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
