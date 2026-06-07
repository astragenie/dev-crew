---
filed: 2026-06-07
target_plugin: hero-crew
target_repo: sergeymilashico/hero-crew
status: pending-upstream-fix
loop_tracking_feat: FEAT-064
loop_related_slice: SLICE-65 (this doc)
loop_related_spec: SPEC-003
loop_related_feats_done: [FEAT-063, FEAT-065, FEAT-066]
---

# Upstream-request: `crew brief-me` render Blocked/Missing for halt-badge fields

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Surface:** `crew brief-me` Autonomous Loop section
- **Reason:** loop emits halt-badge fields that crew's `brief-me` does not render. Operators only see halts in raw `loop stop-check` JSON, not in the human-readable brief. Loop tracks the request for visibility; the fix lives in crew.

## Problem

Loop emits five halt-badge fields under `brief.snapshot.*`:

| Field | Human-readable gate name | Shipped in |
|---|---|---|
| `costRegression` | Cost regression | v0.12.0 (SLICE-52) |
| `sessionDrift` | Session drift | v0.14.0 (SLICE-54) |
| `sliceCostCeiling` | Slice cost ceiling | v0.16.0 (SLICE-55) |
| `gradeTrend` | Grade trend | v0.18.0 (SLICE-57) |
| `mergeFailed` | Merge failed | v0.24.0 (SLICE-64) |

The canonical registry — names, gate descriptions, render shape — lives at `docs/halt-badges.md` in the loop repo (shipped by FEAT-063 / v0.20.0). Loop owns this contract.

Today `crew brief-me` reads loop's brief output to render the Autonomous Loop section but has NO explicit per-field renderer for any of these five badges. When the loop walker halts on `cost_regression_stop` (for example), the operator sees the halt in raw `node scripts/loop.mjs stop-check` JSON only — not in the brief they actually consult on session resume.

GRADE-SLICE-52/53/54 all scored observability ≤ 0.78. Pattern alert "observability below 0.8 across last 3 slices" halted the walker after SLICE-54. Grade rationale on each cited cross-plugin renderer gap as the root cause.

## Existing loop-side mitigations (not a substitute)

- **`docs/halt-badges.md`** — the registry source-of-truth crew should consume.
- **`loop brief --explain-halts`** (FEAT-065, v0.21.0) — loop-local human-readable summary so operators without crew brief-me available still meet the SLO.
- **Halt-badge schema regression test** (FEAT-066, v0.22.0) — adding a new halt-badge field is now deliberate.

The loop side of SPEC-003 is closed. This request closes the cross-plugin side.

## Requested behavior

`crew brief-me` should render a `## Blocked / Missing` (or equivalent named) subsection inside the Autonomous Loop section whenever any field under `brief.snapshot.*` matches a known halt-badge name AND is non-null AND its entry indicates the gate fired.

For each fired halt, render:

1. Gate name (human-readable, from registry — e.g. "Cost regression")
2. Field name (machine, e.g. `costRegression`) for cross-reference
3. Key threshold values (current vs threshold) pulled from the badge body
4. Suggested next action — usually pointer to the config knob (e.g. `loop.costRegressionMultiplier` in `.claude/loop.json`) or runbook (`/crew:fix`)

Iterate the registry, NOT the JSON keys of `snapshot`. Unknown future halt-badge fields must NOT break rendering — see fail-open contract below.

## Concrete expected output

When loop's `stop-check` emits:

```json
{
  "halted": true,
  "stopReason": "cost_regression_stop: current $1553.70 > median $50.32 × 3 (threshold $150.95, window 5, sample 5)",
  "snapshot": {
    "costRegression": {
      "triggered": true,
      "currentUsd": 1553.70,
      "medianUsd": 50.32,
      "thresholdUsd": 150.95,
      "multiplier": 3,
      "window": 5,
      "sampleCount": 5
    },
    "sessionDrift": null,
    "sliceCostCeiling": null,
    "gradeTrend": null,
    "mergeFailed": null
  }
}
```

`crew brief-me` should render:

```
## Autonomous Loop

### Blocked / Missing

#### Cost regression (`costRegression`)

- Current: $1553.70
- Median (window 5, samples 5): $50.32
- Threshold (median × 3.0): $150.95
- Suggested action: tune `loop.costRegressionMultiplier` or `loop.costRegressionMinSamples` in `.claude/loop.json`; or reset cost history.

(No other halt-badges fired.)
```

When NO halt-badges have fired, render no "Blocked / Missing" subsection (or render an empty `_No halts active._` placeholder — pick whichever matches existing brief-me convention).

## Fail-open contract for unknown halt-badges

Loop reserves the right to add new halt-badge field names. Crew renderer MUST iterate a known-registry list, not the raw `snapshot.*` keys, so an unknown future field name silently degrades:

- known field present + fired → render with name/values/action
- known field present + not fired (`null`) → skip
- unknown field present → skip render; log a `loop-halt-unknown` event for follow-up (per SPEC-003 "Alert posture")

Loop's `src/scripts/lib/halt-badges.mts` `HALT_BADGES` array is the upstream source. Crew can either:

- vendor a copy of the registry list (5 entries today) and update on loop version bumps, OR
- read it from `docs/halt-badges.md` at session-start (light parse)

Either works. The fail-open contract is the load-bearing invariant.

## Acceptance for this upstream request

The upstream fix is considered landed when:

1. `crew brief-me` renders a Blocked/Missing section for any non-null + fired halt-badge field under `snapshot.*`
2. Unknown future halt-badge field names do not break rendering (logged as `loop-halt-unknown`)
3. A test fixture in hero-crew covers all 5 currently-known halt-badge fields with the expected rendered output
4. hero-crew's `brief-me` README references `docs/halt-badges.md` (or a vendored copy) as the contract source

## Cross-references

- **SPEC-003**: `.claude/artifacts/loop/specs/SPEC-003.md` (loop-side SRE spec for halt-badge observability)
- **Registry source-of-truth**: `docs/halt-badges.md` (loop)
- **Loop FEATs that closed the loop-side of SPEC-003**:
  - FEAT-063 (v0.20.0): publish registry doc
  - FEAT-065 (v0.21.0): `loop brief --explain-halts`
  - FEAT-066 (v0.22.0): schema regression test
- **This request**: FEAT-064 / SLICE-65
- **Companion upstream request** (separate concern): `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`

## Follow-up

When the upstream fix lands, this file should be moved to `docs/upstream-requests/closed/` (or have its `status` frontmatter flipped to `landed-upstream`) along with a reference to the hero-crew PR or release version that contains the renderer.
