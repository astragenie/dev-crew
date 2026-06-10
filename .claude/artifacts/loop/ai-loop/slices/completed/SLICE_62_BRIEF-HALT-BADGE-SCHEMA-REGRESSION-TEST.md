---
id: SLICE-62
status: completed
feature: FEAT-066
phase: null
priority: P2
target_release: v0.15.0
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
github_issue: 139
github_url: "https://github.com/sergeymilashico/loop/issues/139"
---
# SLICE-62: Brief halt-badge schema regression test

Implements FEAT-066. See [feature file](../../../backlog/in-progress/FEAT-066.md) for product context.

## Objective

Add a schema regression test that asserts: every halt-badge field listed in `HALT_BADGES` (FEAT-065) has a corresponding section in `docs/halt-badges.md` (FEAT-063), AND every halt-badge field emitted by `stop-conditions.mts::assembleStopResult` (snapshot fields) is present in `HALT_BADGES`. Drift in either direction fails the test, closing the SPEC-003 contract loop.

When a future FEAT introduces a new halt-badge field but forgets to update the registry or the docs, CI fails before merge.

## In scope

- New `src/tests/halt-badge-schema.test.mts` — three assertions:
  1. Every `HALT_BADGES[i].field` appears as a `### snapshot.<field>` heading in `docs/halt-badges.md`
  2. Every snapshot key emitted by `assembleStopResult` (besides the non-halt-badge bookkeeping fields like `pendingOrTriaged`, `iterationCount`, etc.) appears in `HALT_BADGES`
  3. Required outer keys in the brief output (`shouldStop`, `reasons`, `blockers`, `suggestions`, `snapshot`) exist
- Allow-list of known non-halt-badge snapshot fields (the bookkeeping ones) defined inline in the test file
- Failure messages cite the exact registry update needed (e.g., "Add `### snapshot.foo` to docs/halt-badges.md OR remove `foo` from HALT_BADGES")

## Out of scope

- Modifying any source files outside the test (FEAT-066 is enforcement only)
- Restructuring the snapshot shape (separate concern; current shape is the contract)
- Validating individual field shapes against the doc's TypeScript-style declarations (could be a follow-up; this slice only validates field NAMES match across the three locations)
- Auto-generating docs from `HALT_BADGES` (future refactor)

## Acceptance criteria

- [ ] AC-1: All gates green (`npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `src/tests/halt-badge-schema.test.mts` exists with at least 3 test cases asserting the registry ↔ docs ↔ assembleStopResult three-way contract
- [ ] AC-3: When `HALT_BADGES` has a field NOT in `docs/halt-badges.md` → test fails with actionable message naming the missing doc section
- [ ] AC-4: When `docs/halt-badges.md` has a `### snapshot.<x>` section NOT in `HALT_BADGES` → test fails with actionable message
- [ ] AC-5: When `assembleStopResult` emits a snapshot field NOT in `HALT_BADGES` AND NOT in the allow-list → test fails with actionable message
- [ ] AC-6: Currently-known bookkeeping snapshot keys (`pendingOrTriaged`, `inProgress`, `approvedUndecomposed`, `totalAlerts`, `warnAlerts`, `warnAlertsDemoted`, `iterationCount`, `iterationCap`, `costAlerts`, `crewBlocked`, `crewEscalated`, `autoMode`, `marathonMode`) explicitly listed as non-halt-badge allow-list inside the test
- [ ] AC-7: With the current 4 halt-badges (costRegression, sessionDrift, sliceCostCeiling, gradeTrend), all assertions PASS

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-066 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- (none — test-only slice; lead-attest skip per v0.17.0 SOP)
