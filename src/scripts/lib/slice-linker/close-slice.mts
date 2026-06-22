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
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { parseFrontmatter } from "../frontmatter.mjs";
import { resolveConfig } from "../config-resolver.mjs";
import { findFeatureById } from "../backlog-writer.mjs";
import { bust as bustCache } from "../cache.mjs";

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

  const complete = await completeSlice(repoPath, sliceId, {
    config,
    keepFeatureOpen: opts.keepFeatureOpen,
    forceClose: opts.forceClose,
    skipValidationCheck: opts.skipValidationCheck,
    noDocWriter: opts.noDocWriter,
    noMerge: opts.noMerge,
    dryRun: opts.dryRun,
    skipSimplify: opts.skipSimplify
  });

  // completeSlice moves the slice file from pending/ → completed/. The
  // locateSliceFile cache (in ../cache.mjs) still returns the pre-move
  // pending/ path; invalidate it so createGradeFile finds the new path.
  const slicesRoot = resolveSlicesRoot(repoPath, config);
  bustCache(`locateSlice:${slicesRoot}:${sliceId}`);

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
  // then run writeGrade to validate + persist.
  const yamlContent = await fs.readFile(gradeYamlPath, "utf8");
  await fs.writeFile(gradeScaffold.gradePath, yamlContent);
  const grade = await writeGrade(repoPath, sliceId, { config });

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
