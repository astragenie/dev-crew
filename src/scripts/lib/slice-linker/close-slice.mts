// FEAT-188 / SLICE-102 — single-roundtrip slice close.
//
// `closeSlice` collapses the 3-step closing ceremony (complete → grade
// → grade-write) into one call when the operator supplies a pre-formatted
// grade file AND the parent FEAT is `autonomous_safe: true`. Otherwise it
// behaves like the existing 2-step (complete + scaffold grade template),
// returning `scaffoldOnly: true` so the caller knows a manual grade-write
// is still required.
//
// Return shape:
//   { complete: <completeSlice output>,
//     grade:    <writeGrade output> | null,   // null when scaffoldOnly
//     scaffoldOnly: boolean,                  // true when only template
//                                             // scaffolding ran
//     gradePath: string                       // path to the grade file on disk
//   }

import fs from "node:fs/promises";

import { completeSlice } from "./complete-slice.mjs";
import { createGradeFile, writeGrade } from "../grade-writer.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "../paths.mjs";
import { parseFrontmatter } from "../frontmatter.mjs";
import { resolveConfig } from "../config-resolver.mjs";
import { findFeatureById } from "../backlog-writer.mjs";
import { bust as bustCache } from "../cache.mjs";

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

export interface CloseSliceResult {
  complete: unknown;
  grade: unknown | null;
  scaffoldOnly: boolean;
  gradePath: string;
}

export async function closeSlice(
  repoPath: string,
  sliceId: string,
  opts: CloseSliceOpts = {}
): Promise<CloseSliceResult> {
  if (!sliceId) throw new Error("closeSlice requires a sliceId.");

  const config = opts.config ?? (await resolveConfig(repoPath));
  const gradeYamlPath = opts.gradeYamlPath ?? null;

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

  if (!gradeYamlPath) {
    return {
      complete,
      grade: null,
      scaffoldOnly: true,
      gradePath: gradeScaffold.gradePath
    };
  }

  // Single-shot path: replace the scaffolded grade with the supplied yaml,
  // then run writeGrade to validate + persist.
  const yamlContent = await fs.readFile(gradeYamlPath, "utf8");
  await fs.writeFile(gradeScaffold.gradePath, yamlContent);
  const grade = await writeGrade(repoPath, sliceId, { config });

  return {
    complete,
    grade,
    scaffoldOnly: false,
    gradePath: gradeScaffold.gradePath
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
