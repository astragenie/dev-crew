// FEAT-168 / AC-1 + AC-7: validation + parsing for the `proposed_slices`
// frontmatter field on FEATs.
//
// Shape (per FEAT-168 § AC-1):
//   proposed_slices:
//     - id_suffix: -SLICE-1     # matches /^-SLICE-\d+$/
//       title: Library + tests  # 1..100 chars
//       points: 2               # Fibonacci value, but capped at 2 per entry (runner#393)
//
// Two distinct error paths the gate cares about:
//   - parseProposedSlices  → InvalidProposedSlicesError (AC-7)
//   - assertSized          → DecompositionRequiredError (AC-2)
//
// Both errors carry the FEAT id + a precise message so the CLI handler
// can stderr-print them and set process.exitCode=1 without inventing
// wording.

import { isEffortPoints, type EffortPoints } from "./pm-effort-mapper.mjs";

export interface ProposedSlice {
  id_suffix: string;
  title: string;
  points: EffortPoints;
  // Optional per-slice acceptance criteria (astragenie/runner-plugin QW4).
  // When a PM decomposition supplies this, the materializer uses it verbatim
  // for that slice's AC section instead of copying the FEAT-level ACs into
  // every sibling slice. Absent on decompositions authored before this field
  // existed — callers fall back to FEAT-level ACs (with a shared-copy
  // warning for multi-slice FEATs).
  acceptance_criteria?: string[];
}

const ID_SUFFIX_RE = /^-SLICE-\d+$/;
const MAX_TITLE_LEN = 100;
// runner#393: slices above 2 points routinely exceed the ~200k-token
// dispatch budget and die mid-run (tightened from the original 5-point cap
// shipped in #414 — 5 was still too coarse). Cap per-entry size so the
// sum(points) coverage rule cannot be satisfied by one oversized slice.
const MAX_SLICE_POINTS = 2;

/** FEAT-168 AC-7 — parse failure on malformed `proposed_slices` frontmatter. */
export class InvalidProposedSlicesError extends Error {
  constructor(
    public readonly featureId: string,
    public readonly detail: string
  ) {
    super(`proposed_slices parse failed for ${featureId}: ${detail}`);
    this.name = "InvalidProposedSlicesError";
  }
}

/** FEAT-168 AC-2 — refuse when a large FEAT is missing `proposed_slices`. */
export class DecompositionRequiredError extends Error {
  constructor(
    public readonly featureId: string,
    public readonly effortPoints: number
  ) {
    super(
      `${featureId} is sized ${effortPoints} points — emit proposed_slices first via /loop:pm-review ${featureId}`
    );
    this.name = "DecompositionRequiredError";
  }
}

function validateOne(s: unknown, featureId: string, index: number): ProposedSlice {
  if (!s || typeof s !== "object") {
    throw new InvalidProposedSlicesError(
      featureId,
      `slice ${index} is not a YAML mapping (got ${typeof s})`
    );
  }
  const obj = s as Record<string, unknown>;

  const idSuffix = obj["id_suffix"];
  if (typeof idSuffix !== "string" || !ID_SUFFIX_RE.test(idSuffix)) {
    throw new InvalidProposedSlicesError(
      featureId,
      `id_suffix in slice ${index} must match /^-SLICE-\\d+$/ (got ${JSON.stringify(idSuffix)})`
    );
  }

  const title = obj["title"];
  if (typeof title !== "string" || title.length === 0 || title.length > MAX_TITLE_LEN) {
    throw new InvalidProposedSlicesError(
      featureId,
      `title in slice ${index} must be a non-empty string ≤ ${MAX_TITLE_LEN} chars (got ${JSON.stringify(title)})`
    );
  }

  const points = obj["points"];
  if (!isEffortPoints(points)) {
    throw new InvalidProposedSlicesError(
      featureId,
      `points value in slice ${index} is not in the Fibonacci set [1, 2, 3, 5, 8, 13] (got ${JSON.stringify(points)})`
    );
  }
  if (points > MAX_SLICE_POINTS) {
    throw new InvalidProposedSlicesError(
      featureId,
      `points value in slice ${index} exceeds the per-slice cap of ${MAX_SLICE_POINTS} (got ${points}) — oversized slices die mid-dispatch (runner#393); decompose further`
    );
  }

  const acRaw = obj["acceptance_criteria"];
  let acceptanceCriteria: string[] | undefined;
  if (acRaw !== undefined) {
    const isValid =
      Array.isArray(acRaw) &&
      acRaw.length > 0 &&
      acRaw.every((x) => typeof x === "string" && x.trim().length > 0);
    if (!isValid) {
      throw new InvalidProposedSlicesError(
        featureId,
        `acceptance_criteria in slice ${index} must be a non-empty array of non-empty strings (got ${JSON.stringify(acRaw)})`
      );
    }
    acceptanceCriteria = acRaw as string[];
  }

  return {
    id_suffix: idSuffix,
    title,
    points,
    ...(acceptanceCriteria ? { acceptance_criteria: acceptanceCriteria } : {})
  };
}

/**
 * Parse and validate the `proposed_slices` array from a FEAT's frontmatter.
 *
 * Returns:
 *   - `null` when the field is absent (caller decides if that's OK).
 *   - `ProposedSlice[]` when valid.
 *
 * Throws `InvalidProposedSlicesError` on any malformation per FEAT-168 AC-7.
 * Also enforces the AC-1 invariant `sum(points) >= effort_points` when
 * `effortPoints` is provided (callers in sliceFromFeature pass it).
 */
export function parseProposedSlices(
  raw: unknown,
  featureId: string,
  effortPoints?: number
): ProposedSlice[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) {
    throw new InvalidProposedSlicesError(
      featureId,
      `proposed_slices must be a YAML list (got ${typeof raw})`
    );
  }
  if (raw.length === 0) {
    throw new InvalidProposedSlicesError(
      featureId,
      `proposed_slices must contain at least one slice`
    );
  }
  const slices = raw.map((s, i) => validateOne(s, featureId, i));

  if (typeof effortPoints === "number" && Number.isFinite(effortPoints)) {
    const sum = slices.reduce((acc, s) => acc + s.points, 0);
    if (sum < effortPoints) {
      throw new InvalidProposedSlicesError(
        featureId,
        `sum(points)=${sum} is less than feature effort_points=${effortPoints} — the decomposition does not cover the work`
      );
    }
  }

  return slices;
}

/**
 * FEAT-168 AC-2 — refuse to create a single slice when a FEAT is sized
 * `>= threshold` (default 8) and no `proposed_slices` field is present.
 *
 * Caller (sliceFromFeature) invokes this BEFORE allocating a slice id /
 * creating files. Throwing here short-circuits the whole flow.
 */
export function assertSized(
  featureId: string,
  effortPoints: unknown,
  proposedSlicesRaw: unknown,
  threshold = 8
): void {
  if (typeof effortPoints !== "number" || !Number.isInteger(effortPoints)) return;
  if (effortPoints < threshold) return;
  if (proposedSlicesRaw !== undefined && proposedSlicesRaw !== null) return;
  throw new DecompositionRequiredError(featureId, effortPoints);
}
