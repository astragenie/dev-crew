---
id: SLICE-29
status: completed
feature: FEAT-033
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 70
github_url: "https://github.com/sergeymilashico/loop/issues/70"
---
# SLICE-29: heuristic autonomous_safe inference in backlog-triage (FEAT-033 SLICE-A)

Implements **SLICE-A** of FEAT-033. See [feature file](../../../backlog/in-progress/FEAT-033.md) for full investigation context.

## Objective

Wire `backlog-triage` to always set `autonomous_safe` (boolean) on every FEAT it processes. Use a deterministic heuristic — no LLM call this slice. Migrate legacy competitor-audit FEATs (FEAT-007/-010/-012/-020) that use old PM dimension names to the new schema in-place. Result: auto-walker no longer skips items with reason `not_autonomous_safe` after triage runs.

## Heuristic contract

For each pending FEAT entry, compute:

1. **`hasAcceptanceCriteria`** — scan body for a `## Acceptance criteria` heading (case-insensitive). Count subsequent bullet lines matching `^- (\[[ x]\] )?\S` until next `##` heading. If count ≥ 3 → `true`.
2. **`hasSpec`** — `entry.frontmatter.derived_from` is a non-empty string starting with `SPEC-`.
3. **Default scores** when no `pm_*` fields present in frontmatter:
   - `customer_impact: 0.5`
   - `effort_estimate: 0.5`
   - `strategic_alignment: 0.5`
   - `technical_risk: 0.5`
   - `dependency_depth: 0.5`
4. **If old-schema fields detected** (`pm_strategic_fit` OR `pm_implementation_confidence` OR `pm_demand_signal` OR `pm_risk_level`):
   - Add `pm_legacy_strategic_fit`, `pm_legacy_implementation_confidence`, `pm_legacy_demand_signal`, `pm_legacy_risk_level`, `pm_legacy_customer_impact` mapping (copy values into prefixed keys for preservation).
   - Default the new dimension scores to 0.5 (medium) — explicit recompute is deferred to SLICE-B.
   - Add `migration_note: "legacy PM schema preserved as pm_legacy_*; new dimensions defaulted to 0.5"`.
5. Call `computeAutonomousSafe(scores, { hasSpec, hasAcceptanceCriteria })`. Write result to frontmatter as `autonomous_safe: <boolean>`.
6. Append heuristic source to `triage_notes`: e.g. `"autonomous_safe inferred: AC count=4, derived_from=null → true"` or `"autonomous_safe inferred: no AC, no SPEC → false"`.

## In scope

- `src/scripts/lib/backlog-triage.mts` — extend `triageEntry` to compute + return `autonomous_safe`, `migration_note` (if applicable), and updated `pm_legacy_*` keys. Detection helpers for AC and old-schema can live inline OR in `src/scripts/lib/backlog-triage-helpers.mts` if cleaner.
- Helper functions exported for unit testing:
  - `detectAcceptanceCriteria(body: string): { count: number; hasMin: boolean }` — returns count + whether count ≥ 3
  - `detectLegacySchema(fm: Record<string, any>): boolean` — true if any legacy `pm_*` key present
  - `migrateLegacyScores(fm: Record<string, any>): { legacyKeys: Record<string, any>; defaultScores: Record<string, number> }` — produces the rename map + default new-dim scores
- `src/tests/backlog-triage-autosafe.test.mts` (new) — behavior tests:
  - FEAT with 3+ AC bullets + no SPEC → `autonomous_safe: true`
  - FEAT with 3+ AC + `derived_from: SPEC-001` → `autonomous_safe: true`
  - FEAT with 0-2 AC + no SPEC → `autonomous_safe: false`
  - FEAT with 0-2 AC + `derived_from: SPEC-001` → `autonomous_safe: true` (hasSpec wins)
  - Old-schema FEAT (with `pm_strategic_fit` etc) → frontmatter gets `pm_legacy_*` + `migration_note` + `autonomous_safe` value
  - `triage_notes` includes the heuristic explanation
  - Pre-existing `tests/backlog.test.mjs` regression guard

## Out of scope

- LLM-based PM scoring dispatch (SLICE-B, separate FEAT after empirical evidence)
- Auto-walker changes (only AC-7 verifies behavior; no code change to walker)
- Re-triaging FEATs already in `triaged/` state automatically (one-shot script can be invoked manually if user wants to migrate FEAT-007/-010/-012/-020 — out of scope here)
- Score recomputation from old-schema values (defaulting to 0.5 is intentional — preserves legacy data, leaves real scoring for SLICE-B)
- Body parsing for slice / phase / depends_on (not the goal here)

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: Live smoke: create a fresh FEAT with 3 AC bullets via `node scripts/loop.mjs backlog add --title "test-ac3" --no-research --body "## Acceptance criteria\n- [ ] AC-1: x\n- [ ] AC-2: y\n- [ ] AC-3: z"`, then `node scripts/loop.mjs backlog triage --repo "$PWD"`. Read the triaged FEAT and confirm `autonomous_safe: true` in frontmatter. Delete the test FEAT after.
- [ ] AC-5: Live smoke (legacy): manually move FEAT-007 from `triaged/` back to `pending/` (or skip if user prefers no real-data migration), run triage, confirm `pm_legacy_strategic_fit` + `migration_note` appear in frontmatter.
- [ ] AC-6: Unit test asserts: heuristic AC count ≥ 3 → safe; AC count < 3 + no SPEC → unsafe.
- [ ] AC-7: Unit test asserts: legacy schema detection + migration writes expected key shape.
- [ ] AC-8: `auto-walker.test.mjs` still green — no regression on the walker's existing skip logic.

## Done When

- All ACs PASS
- FEAT-033 moves to `done/` (single-slice FEAT)
- Crew `final-synthesis` artifact written
- Grade written
- `requires_validation: false` (CLI + unit tests cover the behavior; no UI surface)

## Reviewer ladder

- **Reviewer A** — Engineering pass: AC detection regex correctness (tolerates both `- [ ]` and `- ` bullets), heuristic correctness against `computeAutonomousSafe`'s contract, legacy migration is reversible (preserves originals via `pm_legacy_*` prefix), no regression on existing triage behavior.
- **Reviewer B** — Production-readiness pass: triage_notes always parseable (other tooling may consume it), migration_note doesn't break parser, default scores choice (0.5 medium) is documented inline, behavior when called on already-triaged FEAT (should be idempotent — re-running triage should not re-migrate).

## Risks

- **AC regex fragility**: real-world FEAT bodies vary in bullet form. Mitigation: accept both `- [ ]` and bare `- ` bullets; require minimum 3.
- **Old-schema FEATs already in `triaged/`**: triage CLI only operates on `pending/`. Migration of existing triaged FEATs needs a separate one-shot. Document in followups; not blocking.
- **Re-running triage**: if invoked twice on the same FEAT, second pass should be no-op (FEAT already in `triaged/`, `triage_notes` already set). Verify via test.
- **`hasSpec` from `derived_from`**: a FEAT with `derived_from: SPEC-001` but body missing AC will be marked `autonomous_safe: true` because SPEC implies AC live in the SPEC. That matches `computeAutonomousSafe` contract — confirm in test.

## Open questions

- Q1: Should `hasSpec` ALSO check that the SPEC file actually exists at the expected path? Probably yes for robustness — add to test plan.
- Q2: When old-schema detected, should `migration_note` include the date? Probably yes for audit.
