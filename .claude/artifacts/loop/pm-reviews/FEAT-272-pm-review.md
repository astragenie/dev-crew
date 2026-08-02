---
id: PM-REVIEW-FEAT-272
feature: FEAT-272
reviewed_at: 2026-08-02
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.7
pm_technical_risk: 0.7
pm_dependency_depth: 0.4
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-272

## Demand Assessment

- **Evidence:** Live-sample evidence in the FEAT body (FEAT-263/SLICE-160: 16.26M cache-read tokens / 80 msgs vs 150 raw input tokens) plus a fleet trend (116k -> 282k tok/msg, May-Jul). Independently confirmed the static-doc sizes cited: wc shows CLAUDE.md at 553 lines / 30,447 bytes and .claude/loop/rules.md at 248 lines / 20,393 bytes -- both match the FEAT's '29.7KB/553 lines' and '19.9KB' claims almost exactly.

## Scope Challenge

- **Scope notes:** Same 2026-08-02 audit wave as FEAT-268/269/270/271/274 but the highest-blast-radius item: CLAUDE.md is the first-read document for every agent and session (per its own '## Read first' section) and is grepped/relied upon by multiple CI gates named in the FEAT (validate-snapshot-freshness.mts, generate-metrics-band.mts --check, validate-org-refs.mts) plus others not named (validate-agent-refs.mts, validate-dispatch-markers.mts also scan docs). No weak grade dimension this cycle to target with an AC, so I added a bespoke structural-completeness AC below since the real risk here isn't a graded dimension -- it's silently dropping a HARD RULE block that other automation depends on always being in context.

## Scores

- customer_impact: 0.75
- effort_estimate: 0.65
- strategic_alignment: 0.70
- technical_risk: 0.70
- dependency_depth: 0.40

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1: quantified, severe, worsening-trend cost problem (~97% of USD is Opus cache reads per the FEAT) directly tied to the loop's own operating cost, high strategic alignment with the active cost-hygiene program -- capped at P1 rather than P0 since it's efficiency debt, not an active break, but technical_risk lands at 0.6-0.8 (cross-cutting reach into every agent's always-on context plus 3 coupled CI gates).

## Risks

- Pre-mortem 1: most likely review/validation failure is the restructured CLAUDE.md silently burying or dropping one of the three HARD RULE blocks (Autonomous Loop / Cross-Slice Continuation / Phase Completion Gate) behind a skill-gated doc that agents don't reliably load, causing a loop-discipline regression the 3 named CI gates would NOT catch (they check byte/format drift, not semantic completeness).
- Pre-mortem 2: rollback is a clean git revert if confined to CLAUDE.md/rules.md content -- but if generate-metrics-band.mts or validate-snapshot-freshness.mts were ALSO edited to match a new doc shape, reverting the docs without reverting the generators in lockstep re-breaks the gates against the old format.
- Pre-mortem 3 (coverage gap): no existing test asserts that a fresh-session agent reading the TRIMMED always-on index still discovers and follows the Autonomous Loop hard rule -- this is a behavioral property no current CI gate checks.
- Multi-gate coordination risk: the three named CI gates (snapshot-freshness, metrics-band, org-refs) must all stay green simultaneously through the restructure, a real coupling constraint even though none individually is a schema change.
