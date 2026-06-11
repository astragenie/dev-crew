// PM effort_estimate → Fibonacci effort_points mapper (FEAT-167 / AC-1).
//
// PM emits `pm_effort_estimate` as a float in [0.0, 1.0]. The downstream
// cost-regression formula (FEAT-167 AC-3) and the slice-decomposition
// gate (FEAT-168) consume an integer Fibonacci point value instead, so
// the median is computed per-point and a hard-cap of 8 forces
// decomposition rather than tripping at a single oversized slice.
//
// Band table comes from FEAT-167 § AC-1 verbatim:
//
//   pm_effort_estimate         | effort_points
//   --------------------------- | -------------
//   0.0  ≤ x <  0.1            | 1
//   0.1  ≤ x <  0.25           | 2
//   0.25 ≤ x <  0.4            | 3
//   0.4  ≤ x <  0.6            | 5
//   0.6  ≤ x <  0.85           | 8
//   0.85 ≤ x ≤ 1.0             | 13
//
// Out-of-range or non-finite inputs return null — caller decides whether
// to fall back to a default or surface the malformed PM output.

export type EffortPoints = 1 | 2 | 3 | 5 | 8 | 13;

/** Allowed Fibonacci effort-point values, sorted ascending. */
export const FIBONACCI_EFFORT_POINTS: readonly EffortPoints[] = [1, 2, 3, 5, 8, 13];

interface Band {
  /** Inclusive lower bound. */
  lo: number;
  /** Upper bound — exclusive for every band except the last (13). */
  hi: number;
  points: EffortPoints;
}

const BANDS: readonly Band[] = [
  { lo: 0.0, hi: 0.1, points: 1 },
  { lo: 0.1, hi: 0.25, points: 2 },
  { lo: 0.25, hi: 0.4, points: 3 },
  { lo: 0.4, hi: 0.6, points: 5 },
  { lo: 0.6, hi: 0.85, points: 8 },
  // Final band is inclusive on both ends so x = 1.0 maps to 13.
  { lo: 0.85, hi: Number.POSITIVE_INFINITY, points: 13 }
];

/**
 * Map a PM effort estimate (float 0.0–1.0) to the Fibonacci effort_points
 * value used by downstream sizing + regression code.
 *
 * Returns null when the input is non-finite or outside [0, 1] — caller
 * decides whether to default or surface the bad PM output.
 */
export function mapEffortEstimateToPoints(estimate: number): EffortPoints | null {
  if (typeof estimate !== "number" || !Number.isFinite(estimate)) return null;
  if (estimate < 0 || estimate > 1) return null;
  for (const band of BANDS) {
    if (estimate >= band.lo && estimate < band.hi) return band.points;
  }
  // Cap: x === 1.0 falls through the < hi check above on the open
  // upper bound of the 8-band; the infinity-hi 13-band catches it.
  return 13;
}

/** Type-guard: is `n` a permitted Fibonacci effort-point value? */
export function isEffortPoints(n: unknown): n is EffortPoints {
  return (
    typeof n === "number" &&
    Number.isInteger(n) &&
    (FIBONACCI_EFFORT_POINTS as readonly number[]).includes(n)
  );
}
