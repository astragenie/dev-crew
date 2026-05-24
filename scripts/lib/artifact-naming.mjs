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

const SAFE = /[^a-z0-9-]+/g;

// Normalize an identifier (FEAT-021 / SLICE-36 / "Phase 3 alpha") into a
// filename-safe lowercase segment. Whitespace and unsafe punctuation
// collapse to a single `-`. Leading/trailing dashes are trimmed.
function slugSegment(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .replace(SAFE, "-")
    .replace(/^-+|-+$/g, "");
}

// Build the slug fragment used between artifact kind and any trailing
// per-kind suffix. featureId / phase are nullable; their segments drop out.
// sliceId is required.
//
// buildArtifactSlug({ featureId: "FEAT-021", phase: "3", sliceId: "SLICE-36" })
//   → "feat-021-phase-3-slice-36"
// buildArtifactSlug({ featureId: null, phase: null, sliceId: "SLICE-36" })
//   → "slice-36"
export function buildArtifactSlug({ featureId, phase, sliceId } = {}) {
  if (!sliceId) {
    throw new Error("buildArtifactSlug requires sliceId");
  }
  const segments = [];
  const feat = slugSegment(featureId);
  if (feat) segments.push(feat);
  const ph = slugSegment(phase);
  if (ph) segments.push(`phase-${ph}`);
  segments.push(slugSegment(sliceId));
  return segments.join("-");
}

// Build a human-readable title for crew-CLI title args. Crew CLI slugifies
// the title to produce its own filename, so the structure mirrors the slug
// helper but keeps the original casing for the body display.
//
// buildArtifactTitle({ featureId: "FEAT-021", phase: "3", sliceId: "SLICE-36",
//                      summary: "Health page repurpose" })
//   → "FEAT-021 PHASE-3 SLICE-36: Health page repurpose"
// buildArtifactTitle({ sliceId: "SLICE-36", summary: "Health page" })
//   → "SLICE-36: Health page"
// buildArtifactTitle({ sliceId: "SLICE-36" })
//   → "SLICE-36"
export function buildArtifactTitle({ featureId, phase, sliceId, summary } = {}) {
  if (!sliceId) {
    throw new Error("buildArtifactTitle requires sliceId");
  }
  const tags = [];
  if (featureId) tags.push(String(featureId));
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    tags.push(`PHASE-${phase}`);
  }
  tags.push(String(sliceId));
  const head = tags.join(" ");
  return summary ? `${head}: ${summary}` : head;
}
