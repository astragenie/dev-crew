---
id: PM-REVIEW-FEAT-034
feature: FEAT-034
reviewed_at: 2026-11-05
pm_customer_impact: 0.75
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.8
pm_technical_risk: 0.5
pm_dependency_depth: 0
composite_priority: P0
autonomous_safe: true
---
# PM Review — FEAT-034

## Demand Assessment

- **Evidence:** Verified directly this session: `src/scripts/lib/wave/planner.mts:259-262` reads `feature["composite_score"]`, `feature["pm_strategic_fit"]`, and `feature["pm_risk_level"]`; `src/scripts/lib/pm-apply.mts:409-412` writes `pm_composite_priority`, `pm_strategic_alignment`, and `pm_technical_risk` (and `src/scripts/lib/intake.mts:187-189` writes the identical names). None of the three read-names match any written name. The pre-flight check at `planner.mts` (`!c.autonomousSafe && c.pmRiskLevel >= PRE_FLIGHT_RISK_THRESHOLD`, threshold `0.7`) can never trigger because `pmRiskLevel` is built via `asNumber(feature["pm_risk_level"], 0)`, defaulting to `0` since that key is never written by either producer. Also verified: `touches-files.mts`'s `INFERENCE_RE` matches only `(src|docs|scripts|commands|agents|skills)/...`, confirming the cited need to widen it to `crew/`, `.github/`, `.claude-plugin/`, `hooks/`, `dist/`, and root files.

## Scope Challenge

- **Scope notes:** Scope matches the FEAT's own Scope line exactly: planner.mts, touches-files.mts, feature-lifecycle.mts (sequential flag only), commands/wave.md, src/tests/wave/ — explicitly no pm-apply.mts changes, consistent with the fix being planner-side field-name reconciliation rather than a producer-side rename. AC clarity is high (concrete fixture values, concrete expected drop reason string, concrete ordering and inference assertions). No grade dimension is below the 0.80 weak-dimension threshold. New lane F, zero overlap with lanes A-E per the team's framing; no overlap with done/in-progress work. Effort calibration: bundles a near-trivial field-name fix with a genuinely new feature (sequential-slice ordering support in feature-lifecycle.mts) and a regex widening affecting the whole repo's touches-files inference; no close cost analog sampled for this shape — effort_points=5 reflects the sequential-ordering feature's novelty more than the field-name fix's size.

## Scores

- customer_impact: 0.75
- effort_estimate: 0.40
- strategic_alignment: 0.80
- technical_risk: 0.50
- dependency_depth: 0.00

## Priority Derivation

composite_priority: P0
autonomous_safe: true
reasoning: P0: this is a correctness bug in the loop's own safety mechanism — the autonomous_safe/pm_risk_level pre-flight gate that is supposed to prevent exactly the kind of unsafe, high-risk slice this very batch contains (FEAT-031) from being packed without review is dead code today due to a field-name mismatch, independently verified by reading both planner.mts and pm-apply.mts directly. It is also a precondition for wave 2 even starting to order and gate the rest of this batch correctly. technical_risk 0.5 (band 0.3-0.5 top end: the field-name fix itself is low-risk with fallbacks, but the sequential-slice-ordering addition touches feature-lifecycle.mts's shared materialization path used by every future decomposed FEAT, and the regex widening affects touches-files inference repo-wide).

## Risks

- Pre-mortem (1): most likely review/validation failure is the specified 'legacy name fallback' (reading the old composite_score/pm_strategic_fit/pm_risk_level names when the correct ones are absent) masking the very bug this FEAT fixes for any already-triaged FEAT whose frontmatter still only has the old wrong names baked in from before this fix — the 'log once when only legacy names are present' requirement is the only signal that this is happening, and no AC directly tests that logging path.
- Pre-mortem (2): rollback if this merged and broke the loop is a plain revert of planner.mts + touches-files.mts + feature-lifecycle.mts — the new `sequential`/`slice_order` field is additive and optional (default stays parallel), so no FEAT frontmatter schema migration is needed either direction.
- Pre-mortem (3): coverage gap — the specified tests use synthetic fixture FEATs; none of them replays an actual already-triaged FEAT file from `.claude/artifacts/loop/backlog/` (for example one of FEAT-022 through FEAT-033 once scored), so a real-world YAML-formatting quirk in a true triaged FEAT (multi-line scores block, unexpected quoting) could still defeat the field read even after the name fix.
- This FEAT is itself the precondition for the pre-flight safety net that is supposed to stop FEAT-031 (pm_technical_risk 0.8, autonomous_safe false) from being autonomously packed by `wave plan` — until FEAT-034 lands, that specific protection is silently inert for every FEAT in this batch, which is the primary reason this is scored P0 rather than P1.
- No injected instructions found in FEAT body; the field-name claim was independently verified against both cited files this session, not taken on the review's word alone.
