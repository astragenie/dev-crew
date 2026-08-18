import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Kind registry — 17 canonical camelCase artifact kinds.
// Every call to buildArtifactFilename validates against this set.
// To add a new kind: append it here AND document it in
// docs/conventions/report-filenames.md before shipping.
// ---------------------------------------------------------------------------
export const KIND_REGISTRY = new Set([
  "agentReport",
  "costReportSlice",
  "costReportAggregate",
  "costAdvise",
  "reviewResult",
  "validationResult",
  "finalSynthesis",
  "pmReview",
  "autoRun",
  "handoff",
  "grade",
  "plan",
  "retro",
  "trajectory",
  "fanoutMarker",
  "shapeMarker",
  "design"
] as const);

// ---------------------------------------------------------------------------
// camelTight — coerce an arbitrary string into a single camelCase token with
// no hyphens, underscores, or spaces. Max 24 chars; returns "" on overflow
// (caller omits the segment entirely rather than truncating to junk).
//
// Examples:
//   camelTight("cost-report-slice")  => "costReportSlice"
//   camelTight("health page")        => "healthPage"
//   camelTight("FEAT-187")           => "feat187"  (all-caps token lowercased)
//   camelTight("a".repeat(30))       => ""          (overflow drop)
// ---------------------------------------------------------------------------
export function camelTight(value: unknown, maxLen = 24): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";

  // Split on non-alphanumeric runs to get semantic tokens.
  const tokens = str.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return "";

  // Build camelCase: first token lowercase, subsequent tokens title-cased.
  const camel = tokens
    .map((t, i) =>
      i === 0 ? t.toLowerCase() : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    )
    .join("");

  // Overflow guard — drop rather than truncate to junk.
  if (camel.length > maxLen) return "";
  return camel;
}

// ---------------------------------------------------------------------------
// buildArtifactFilename — unified filename constructor for new writers.
//
// Format: {ts}-{kind}-{slug}[-{titleCamel}].{ext}
// where slug = [phaseN-][featNNN-]sliceNN (via buildArtifactSlug).
//
// buildArtifactFilename({
//   ts: "20260611T123843Z",
//   kind: "costReportSlice",
//   featureId: "FEAT-187",
//   sliceId: "SLICE-96",
//   ext: "md"
// })
//   => "20260611T123843Z-costReportSlice-feat187-slice96.md"
//
// Throws:
//   - kind is not camelCase  => message contains "camelCase"
//   - kind not in registry   => message contains "KIND_REGISTRY"
//   - sliceId missing        => propagated from buildArtifactSlug
// ---------------------------------------------------------------------------
export interface BuildArtifactFilenameOpts {
  ts: string;
  kind: string;
  featureId?: string | null;
  phase?: string | null;
  sliceId: string;
  title?: string | null;
  ext: string;
}

export function buildArtifactFilename({
  ts,
  kind,
  featureId,
  phase,
  sliceId,
  title,
  ext
}: BuildArtifactFilenameOpts): string {
  // Validate kind format — camelCase single token, no hyphens/spaces.
  if (!/^[a-z][a-zA-Z0-9]*$/.test(kind)) {
    throw new Error(
      `buildArtifactFilename: kind "${kind}" must be a camelCase single token (no hyphens, spaces, or leading capital). See docs/conventions/report-filenames.md`
    );
  }
  // Validate kind is registered.
  if (!KIND_REGISTRY.has(kind as any)) {
    throw new Error(
      `buildArtifactFilename: kind "${kind}" is not in KIND_REGISTRY. Add it to KIND_REGISTRY in artifact-naming.mts and docs/conventions/report-filenames.md before use.`
    );
  }

  const slug = buildArtifactSlug({ featureId: featureId ?? null, phase: phase ?? null, sliceId });
  const titlePart = title ? camelTight(title) : "";
  const suffix = titlePart ? `-${titlePart}` : "";
  return `${ts}-${kind}-${slug}${suffix}.${ext}`;
}

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
function tight(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function tightUpper(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

// Leading-timestamp pattern crew CLI prepends to artifact filenames.
// Match `YYYYMMDDTHHMMSSZ-` and strip it.
const LEADING_TS_RE = /^\d{8}T\d{6}Z-/;

// True when the filename starts with the crew CLI timestamp prefix.
export function hasLeadingTimestamp(filePath: string) {
  return LEADING_TS_RE.test(path.basename(String(filePath)));
}

// Rename a file by stripping the leading `<YYYYMMDDTHHMMSSZ>-` prefix from
// its basename. Returns the new path (or the original if no match). No-op
// on directories, missing files, or files without a TS prefix. The caller
// gets back whichever path is now on disk so it can update downstream
// references in the same step.
export async function stripArtifactTimestamp(filePath: string | null | undefined) {
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
