// FEAT-168 / AC-1 + AC-7: validation + parsing for the `proposed_slices`
// frontmatter field on FEATs.
//
// Shape (per FEAT-168 § AC-1):
//   proposed_slices:
//     - id_suffix: -SLICE-1     # matches /^-SLICE-\d+$/
//       title: Library + tests  # 1..100 chars
//       points: 2               # Fibonacci value, but capped at 2 per entry (runner#393)
//       estimated_tokens: 100000 # optional override; defaults from points (runner#393 proposal 4)
//
// Two distinct error paths the gate cares about:
//   - parseProposedSlices  → InvalidProposedSlicesError (AC-7)
//   - assertSized          → DecompositionRequiredError (AC-2)
//
// Both errors carry the FEAT id + a precise message so the CLI handler
// can stderr-print them and set process.exitCode=1 without inventing
// wording.

import { isEffortPoints, estimateTokensForPoints, type EffortPoints } from "./pm-effort-mapper.mjs";

export interface ProposedSlice {
  id_suffix: string;
  title: string;
  points: EffortPoints;
  // runner#393 proposal 4: token-budget estimate for this slice. Always
  // populated after parsing — either a caller-supplied override (a PM or
  // architect explicitly flagging landmine/design-decision risk) or a
  // deterministic default derived from `points` via
  // pm-effort-mapper.mts::estimateTokensForPoints. Stored (not just the
  // pass/fail verdict) so a human reading the FEAT/slice frontmatter can
  // see WHY a decomposition was forced to split further.
  estimated_tokens: number;
  // Optional per-slice acceptance criteria (astragenie/runner-plugin QW4).
  // When a PM decomposition supplies this, the materializer uses it verbatim
  // for that slice's AC section instead of copying the FEAT-level ACs into
  // every sibling slice. Absent on decompositions authored before this field
  // existed — callers fall back to FEAT-level ACs (with a shared-copy
  // warning for multi-slice FEATs).
  acceptance_criteria?: string[];
  // FEAT-276 AC-4: optional per-slice declared touch surface. Only present
  // when the PM/architect authoring the decomposition already knows which
  // repo-relative paths this specific slice will touch — never inferred or
  // guessed here. Deliberately NOT defaulted from the FEAT-level
  // `touches_files` field the way `acceptance_criteria` falls back to
  // FEAT-level ACs: unlike ACs (where "shared across siblings" is a
  // visible, human-reviewable warning), silently stamping the whole FEAT's
  // file list onto every sibling slice would make the wave planner see
  // false conflicts between slices that never touch the same file.
  touches_files?: string[];
}

const ID_SUFFIX_RE = /^-SLICE-\d+$/;
const MAX_TITLE_LEN = 100;
// runner#393: slices above 2 points routinely exceed the ~200k-token
// dispatch budget and die mid-run (tightened from the original 5-point cap
// shipped in #414 — 5 was still too coarse). Cap per-entry size so the
// sum(points) coverage rule cannot be satisfied by one oversized slice.
const MAX_SLICE_POINTS = 2;
// runner#393 proposal 4: ~1 slice ≈ ≤200k builder tokens. A slice whose
// estimated_tokens (explicit override, or the points-derived default)
// exceeds this must be decomposed further — this is a second, independent
// signal from the points cap above: a low-points slice that absorbs a
// flagged landmine can still blow the token budget, which points alone
// cannot see.
export const TOKEN_SPLIT_THRESHOLD = 200_000;

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

// runner#393 proposal 4: resolves + validates a single entry's estimated_tokens
// (explicit override, or the points-derived default) and enforces the
// ~200k auto-split threshold. Split out of validateOne to keep that
// function's cognitive complexity under the repo's Biome cap.
function resolveEstimatedTokens(
  obj: Record<string, unknown>,
  featureId: string,
  index: number,
  points: EffortPoints
): number {
  const raw = obj["estimated_tokens"];
  let estimatedTokens: number;
  if (raw === undefined || raw === null) {
    estimatedTokens = estimateTokensForPoints(points);
  } else {
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
      throw new InvalidProposedSlicesError(
        featureId,
        `estimated_tokens in slice ${index} must be a non-negative number (got ${JSON.stringify(raw)})`
      );
    }
    estimatedTokens = raw;
  }
  if (estimatedTokens > TOKEN_SPLIT_THRESHOLD) {
    throw new InvalidProposedSlicesError(
      featureId,
      `estimated_tokens value in slice ${index} exceeds the ~200k auto-split threshold of ${TOKEN_SPLIT_THRESHOLD} (got ${estimatedTokens}) — oversized slices die mid-dispatch (runner#393); decompose further or isolate the flagged landmine into its own slice`
    );
  }
  return estimatedTokens;
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

  const estimatedTokens = resolveEstimatedTokens(obj, featureId, index, points);

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

  const touchesFiles = resolveTouchesFiles(obj, featureId, index);

  return {
    id_suffix: idSuffix,
    title,
    points,
    estimated_tokens: estimatedTokens,
    ...(acceptanceCriteria ? { acceptance_criteria: acceptanceCriteria } : {}),
    ...(touchesFiles ? { touches_files: touchesFiles } : {})
  };
}

// FEAT-276 AC-4: optional per-slice `touches_files` on a `proposed_slices`
// entry. Conservative by construction — this only shape-validates an
// already-authored value (mirrors acceptance_criteria's validation); it
// never infers or fabricates a path. Absolute paths and `..` traversal are
// rejected here (cheap, fails fast at PM-apply time with a precise message)
// — the deeper "does the parent directory plausibly exist" check stays in
// `validate-slice-touches-files.mts`, which runs against the real repo tree
// and applies uniformly regardless of which writer declared the paths.
function resolveTouchesFiles(
  obj: Record<string, unknown>,
  featureId: string,
  index: number
): string[] | undefined {
  const raw = obj["touches_files"];
  if (raw === undefined) return undefined;
  const isShapeValid =
    Array.isArray(raw) &&
    raw.length > 0 &&
    raw.every((x) => typeof x === "string" && x.trim().length > 0);
  if (!isShapeValid) {
    throw new InvalidProposedSlicesError(
      featureId,
      `touches_files in slice ${index} must be a non-empty array of non-empty strings (got ${JSON.stringify(raw)})`
    );
  }
  const paths = raw as string[];
  const bad = paths.find((p) => p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) || p.includes(".."));
  if (bad !== undefined) {
    throw new InvalidProposedSlicesError(
      featureId,
      `touches_files in slice ${index} must be repo-relative paths (got ${JSON.stringify(bad)})`
    );
  }
  return paths;
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
