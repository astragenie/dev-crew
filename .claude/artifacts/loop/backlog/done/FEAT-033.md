---
id: FEAT-033
status: done
priority: P1
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-29]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-04
slices_complete: [SLICE-29]
completed_at: 2026-06-04
---
# FEAT-033: PM autonomous_safe wiring — triage must write the flag to FEAT frontmatter

## Symptom

Auto-mode loop (the auto-walker) is not usable on most current FEATs.
Every new FEAT added via `/loop:backlog-add` lands without an
`autonomous_safe` field; auto-walker skips it with reason
`not_autonomous_safe`. Loop falls back to manual `/loop:slice-from-feature`
for every item.

## Evidence

Investigated 2026-06-04. Three concrete code-paths confirmed:

1. **`backlog-triage` (`src/scripts/lib/backlog-triage.mts`)** fills
   `category`, `priority`, `target_release`, `triage_notes` only.
   Never touches `autonomous_safe`. Verified at lines 38-54: the
   `triageEntry` updates set is bounded to those 4 keys.

2. **`pm-scorer.mts::computeAutonomousSafe`** exists but is never
   called by `backlog-triage`. Its contract requires
   `{ hasSpec, hasAcceptanceCriteria }` context that no caller
   supplies. Verified at lines 89-98.

3. **`pm.md` agent (the AGENT this plugin defines)** outputs the
   correct JSON shape (with `autonomousSafe` field) — but nothing
   parses that output and writes it back to the FEAT frontmatter.
   `pm-artifact-writer.mts::writePmReviewArtifact` writes a separate
   `.claude/artifacts/loop/pm-reviews/FEAT-NNN-pm-review.md` file,
   not the FEAT itself.

Additional gap on legacy FEATs (FEAT-007/010/012/020 from the
2026-05-28 competitor-audit batch):

4. They carry **OLD pm dimension names**: `pm_strategic_fit`,
   `pm_implementation_confidence`, `pm_demand_signal`,
   `pm_risk_level`, `pm_customer_impact`. Current `PM_DIMENSIONS` in
   `pm-scorer.mts` uses `customer_impact`, `effort_estimate`,
   `strategic_alignment`, `technical_risk`, `dependency_depth`.
   `parsePmScoresFromFrontmatter` returns `{}` for these — even if
   triage called `computeAutonomousSafe`, scores would all be
   undefined and the function would error on the `>` comparisons.

## Root cause

The PM agent (and its output contract) was designed but the
write-back path was never wired. Triage is heuristic-only by design;
PM-quality scoring needs an LLM pass, but the LLM output has no
deterministic landing place in the FEAT frontmatter.

## Goals

- Every FEAT in `triaged/` must have an `autonomous_safe` boolean.
- Auto-walker should not skip any item due to missing
  `autonomous_safe`.
- Old-schema FEATs are migrated to new dimension names OR explicitly
  marked `autonomous_safe: false` with a `migration_note`.

## Design options (resolve up front)

**Option A — Triage calls computeAutonomousSafe heuristically**:
- Triage scans body for `## Acceptance criteria` + bullet count.
- If ≥3 testable AC bullets → `hasAcceptanceCriteria: true`.
- If frontmatter `derived_from` is set → `hasSpec: true`.
- Run `computeAutonomousSafe` with a default scores object (medium
  effort/risk/dep) when no PM scores present.
- Write `autonomous_safe` + `triage_notes: "autonomous_safe inferred
  from AC count + derived_from"` to FEAT frontmatter.
- Cost: zero LLM call. Quality: rough but always present.

**Option B — Dedicated `/loop:pm-score --id FEAT-NNN --write` command**:
- New CLI invokes the PM agent on a single FEAT via dispatch.
- Parses agent JSON output, writes `pm_*` + `autonomous_safe` to
  frontmatter.
- Auto-fire from `/loop:backlog-triage` for every pending FEAT, OR
  from auto-walker when it encounters a missing field.
- Cost: 1 LLM call per FEAT. Quality: full PM judgment.

**Option C — Hybrid (recommended)**:
- Triage runs heuristic (Option A) so every FEAT gets a baseline flag.
- Auto-walker, when it picks an item with `autonomous_safe: false`
  AND `pm_quality: "heuristic"`, dispatches PM agent for a real
  scoring pass and re-writes the frontmatter.
- Old-schema FEATs are detected by the heuristic + flagged for PM
  re-score on first pickup.
- Cost: 1 LLM call per FEAT lazily (only when about to be worked
  on). Quality: matches usage.

## Slices

- **SLICE-A — heuristic auto_safe in triage** (~2 hr): wire
  `computeAutonomousSafe` with AC detection helper. Migrate old-schema
  FEATs in-place. Tests for: AC detection regex, hasSpec from
  derived_from, autonomous_safe written to frontmatter, old-schema
  FEAT migration.
- **SLICE-B (deferred — separate FEAT)**: PM agent dispatch from
  auto-walker. Only after SLICE-A confirms heuristic baseline is
  insufficient in practice.

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`,
      `npm run format:check` clean
- [ ] AC-3: All validators OK
- [ ] AC-4: After SLICE-A ships, run `/loop:backlog-triage` against
      a fresh test FEAT (no body) → `autonomous_safe` lands in
      frontmatter (likely `false` due to no AC; explicit value
      counts as success)
- [ ] AC-5: Same against a FEAT with 3+ AC bullets and
      `derived_from: SPEC-001` → `autonomous_safe: true`
- [ ] AC-6: Old-schema FEAT-007 migrated: new dimension names
      present in frontmatter; `autonomous_safe` present
- [ ] AC-7: Auto-walker no longer skips items with reason
      `not_autonomous_safe` after triage runs (verifiable by
      counting skipped entries in auto-run summary)
- [ ] AC-8: Test asserts: heuristic + AC count + derived_from →
      correct autonomous_safe verdict

## Out of scope

- PM agent dispatch from triage (Option B in this FEAT body; defer
  to SLICE-B as separate FEAT if heuristic proves insufficient)
- New PM dimension schema (keep current 5-dimension contract)
- Modifying `pm.md` agent prompt
- Auto-walker changes beyond what AC-7 requires

## Risks

- **Heuristic flips wrong way**: a FEAT marked safe by heuristic
  might fail in autonomous execution. Mitigation: builder dispatch
  still has guardrails (lint, test, review); a wrong flag wastes
  one slice cycle, not the codebase.
- **Old-schema migration loses information**: mapping legacy
  `pm_demand_signal` to new `customer_impact` is lossy. Mitigation:
  preserve old fields under `pm_legacy_*` prefix; new fields default
  to 0.5 (medium); add `migration_note` in frontmatter.
- **AC detection regex fragility**: bullet-counting depends on
  consistent slice template. Mitigation: tolerate both `- [ ]` and
  `- ` bullet forms; require minimum 3.

## References

- Investigation conducted 2026-06-04 during v0.7.0 ship retrospective
- `src/scripts/lib/backlog-triage.mts` — current heuristic triage
- `src/scripts/lib/pm-scorer.mts::computeAutonomousSafe` — unused helper
- `src/scripts/lib/pm-artifact-writer.mts` — writes PM review artifact, NOT FEAT frontmatter
- `agents/pm.md` — PM agent prompt + JSON output contract
- Legacy FEAT-007/010/012/020 — frozen in old schema
- `src/scripts/lib/auto-walker.mts::walkCandidates` lines 218-225 — skip path for missing autonomous_safe
