import fs from "node:fs/promises";
import path from "node:path";

// Artifact filename + crew-CLI title construction. Filenames written by
// slice-linker (handoff, final-synthesis) and crew-CLI titles passed for
// crew-owned artifacts (run-brief, review-result, validation-result,
// cost-report) flow through these helpers so FEAT and phase land in both
// surfaces: the filename slug (visible to LoopObserver via dir listing)
// and the artifact frontmatter (via crew CLI title→slug→fields when crew
// owns the writer, or by direct frontmatter write when we own it).
//
// The slug fragment slots between the artifact "kind" and the slice id in
// every filename. Pattern:
//
//   <TS>-<kind>-[feat-NNN-][phase-N-]<slice-NN>[-extra].md
//
// FEAT segment and phase segment are optional and ordered. Nulls drop out
// silently so legacy slices (without `feature:` or `phase:`) keep emitting
// the bare `slice-NN` form.

// Compact a value into an alphanumeric-only segment. Strips dashes,
// whitespace, and any other punctuation — `FEAT-021` → `feat021`,
// `SLICE-36` → `slice36`, `"3 alpha"` → `3alpha`. Tight segments keep
// filenames short and uniform between the two filename surfaces:
//   - Repo-owned filenames built directly from buildArtifactSlug.
//   - Crew-owned filenames built by crew's slugifier from the title
//     emitted by buildArtifactTitle. Tight uppercase tags survive crew
//     slugify as the same tight lowercase segments.
function tight(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function tightUpper(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

// Leading-timestamp pattern crew CLI prepends to artifact filenames.
// Match `YYYYMMDDTHHMMSSZ-` and strip it.
const LEADING_TS_RE = /^\d{8}T\d{6}Z-/;

// True when the filename starts with the crew CLI timestamp prefix.
export function hasLeadingTimestamp(filePath) {
  return LEADING_TS_RE.test(path.basename(String(filePath)));
}

// Rename a file by stripping the leading `<YYYYMMDDTHHMMSSZ>-` prefix from
// its basename. Returns the new path (or the original if no match). No-op
// on directories, missing files, or files without a TS prefix. The caller
// gets back whichever path is now on disk so it can update downstream
// references in the same step.
export async function stripArtifactTimestamp(filePath) {
  if (!filePath) return filePath;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  if (!LEADING_TS_RE.test(base)) return filePath;
  const newBase = base.replace(LEADING_TS_RE, "");
  const newPath = path.join(dir, newBase);
  if (newPath === filePath) return filePath;
  try {
    await fs.rename(filePath, newPath);
    return newPath;
  } catch {
    return filePath;
  }
}

// Build the slug fragment used between artifact kind and any trailing
// per-kind suffix. Segments follow the standard wide→narrow decomposition
// hierarchy: phase (milestone) → feature → slice (story). phase / featureId
// are nullable; their segments drop out. sliceId is required. Each segment
// is internally tight (no dashes within `feat021`); the joining dash sits
// between segments only.
//
// buildArtifactSlug({ featureId: "FEAT-021", phase: "3", sliceId: "SLICE-36" })
//   → "phase3-feat021-slice36"
// buildArtifactSlug({ featureId: null, phase: null, sliceId: "SLICE-36" })
//   → "slice36"
export function buildArtifactSlug({ featureId, phase, sliceId }: Record<string, unknown> = {}) {
  if (!sliceId) {
    throw new Error("buildArtifactSlug requires sliceId");
  }
  const segments: any[] = [];
  const ph = tight(phase);
  if (ph) segments.push(`phase${ph}`);
  const feat = tight(featureId);
  if (feat) segments.push(feat);
  segments.push(tight(sliceId));
  return segments.join("-");
}

// Build a title for crew-CLI `--title` args. Crew CLI slugifies the title
// to produce its own filename, so the tags here mirror the tight slug
// segments — `PHASE3 FEAT021 SLICE36` survives crew slugify as
// `phase3-feat021-slice36`, matching the repo-owned filename surface.
//
// buildArtifactTitle({ featureId: "FEAT-021", phase: "3", sliceId: "SLICE-36",
//                      summary: "Health page repurpose" })
//   → "PHASE3 FEAT021 SLICE36: Health page repurpose"
// buildArtifactTitle({ sliceId: "SLICE-36", summary: "Health page" })
//   → "SLICE36: Health page"
// buildArtifactTitle({ sliceId: "SLICE-36" })
//   → "SLICE36"
export function buildArtifactTitle({
  featureId,
  phase,
  sliceId,
  summary
}: Record<string, unknown> = {}) {
  if (!sliceId) {
    throw new Error("buildArtifactTitle requires sliceId");
  }
  const tags: any[] = [];
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    tags.push(`PHASE${tightUpper(phase)}`);
  }
  const feat = tightUpper(featureId);
  if (feat) tags.push(feat);
  tags.push(tightUpper(sliceId));
  const head = tags.join(" ");
  return summary ? `${head}: ${summary}` : head;
}
