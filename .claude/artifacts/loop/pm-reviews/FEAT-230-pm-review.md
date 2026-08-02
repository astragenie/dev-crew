---
id: PM-REVIEW-FEAT-230
feature: FEAT-230
reviewed_at: 2026-08-02
pm_customer_impact: 0.6
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.75
pm_technical_risk: 0.9
pm_dependency_depth: 0.6
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-230

## Demand Assessment

- **Evidence:** Operator-requested 2026-07-06 (triage_notes) + upstream-request audit found this repo's presets (dotnet-only.json etc.) reference dead crew skill IDs (csharp-pro, react-engineering, ...) after crew's skills/domain reorg. Confirmed still true today: grepping scripts/presets/*.json shows no model/skill validation exists. The architect's 2026-07-08 contract artifact independently verified the drift live against dev-team/skills/domain/*.

## Scope Challenge

- **Scope notes:** Architect contract already landed 2026-07-08 (.claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md) with 5 decisions and a 5-slice breakdown -- materially de-risks scoring vs a blank-slate FEAT. Present-day finding in that contract: this repo's own default slice-build dispatch path never calls resolve-skills (no crewRepoPath configured), so the real integration point is the CLI/resolver core + crew's external orchestrate-slice.md consumer, not an in-repo call site -- confirms cross-plugin classification. No weak grade dimension this cycle (all 5-grade averages >= 0.80 per loop-snapshot.md). No clean single-slice cost analog found in the 5 most recent cost-report files sampled (.claude/artifacts/crew/cost/*) -- all were fleet-wide aggregates, not comparable single-FEAT slices; 'no cost analog' per Framework 5 fallback.

## Scores

- customer_impact: 0.60
- effort_estimate: 0.70
- strategic_alignment: 0.75
- technical_risk: 0.90
- dependency_depth: 0.60

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1: real, evidenced fleet-wide skill-injection breakage with a contract already landed and de-risked into 5 slices; technical_risk lands in the 0.9-1.0 band per the rubric (public/cross-plugin contract change -- crew's orchestrate-slice consumer) since two plugins' output contracts must stay compatible or be jointly updated.

## Risks

- Pre-mortem 1 (review/validation failure two weeks out): most likely cause is the live-catalog enumeration (Decision 1, enumerate <crewRepoPath>/skills/domain/** at resolve time) silently returns zero or a stale list when loop.crewRepoPath is misconfigured or crew's repo layout shifts again -- mirroring the exact drift this FEAT exists to fix.
- Pre-mortem 2 (rollback if merged and broken): a pure loop-side revert (git revert) is sufficient IF the CLI --slice/--tags flag stays additive per DEC-069 'demote don't delete' (old pickBlock path kept as fallback); rollback becomes cross-plugin coordination only if crew's orchestrate-slice.md was jointly updated to consume the new resolver output shape.
- Pre-mortem 3 (coverage gap): no existing test asserts a resolved skill ID is validated against a LIVE (not fixture-frozen) crew catalog snapshot -- the CI fixture-snapshot regression guard proposed in Decision 4 catches drift in the mapping table but not a genuinely stale live-catalog read at resolve time.
- Cross-plugin timing risk already flagged in the FEAT body: crew's orchestrate-slice still hardcodes a preset path (slice-D of the FEAT-218 upstream-request, still open) -- this resolver's output must not break that consumer mid-migration.
