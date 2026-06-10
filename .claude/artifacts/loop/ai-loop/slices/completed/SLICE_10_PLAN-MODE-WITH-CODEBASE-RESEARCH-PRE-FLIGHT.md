---
id: SLICE-10
status: completed
feature: FEAT-006
phase: 2
priority: P2
target_release: null
requires_validation: true
created: 2026-06-02
updated: 2026-06-02
completed_at: 2026-06-02
github_issue: 37
github_url: "https://github.com/sergeymilashico/loop/issues/37"
---
# SLICE-10: Plan Mode with codebase-research pre-flight

Implements FEAT-006. See [feature file](../../../backlog/in-progress/FEAT-006.md) for product context.

## Objective

**SLICE-A of FEAT-006:** ship the bare pre-flight ceremony primitive — codebase research pass + editable plan artifact — with no approval gate. Proves the loop primitive that FEAT-006 SLICE-B (conditional gate) and FEAT-025 (loop:auto) both depend on.

Per FEAT-006 adaptation notes: the full feature decomposes into SLICE-A (pre-flight only, this slice), SLICE-B (conditional gate keyed on autonomous_safe), SLICE-C+ (workspace sharing, drift detection — out of scope per FEAT body).

## In scope

- New CLI handler `slice plan` in `scripts/loop.mjs` (and `src/scripts/loop.mts`) — wires to new `scripts/lib/slice-plan.mjs` module.
- New `scripts/lib/slice-plan.mjs` (+ `src/scripts/lib/slice-plan.mts` source):
  - `runPlanPreflight(repoPath, sliceId)` — reads slice file, extracts in-scope file globs from frontmatter or body, runs a structured codebase research pass (grep symbols, glob related modules, read their first 50 lines), writes `.claude/artifacts/loop/plans/<TS>-plan-<sliceId>.md` with sections: Context, Files researched, Open questions, Proposed approach.
- New slash command `commands/slice-plan.md` (mirrors existing slice-* commands).
- Unit tests in `src/tests/slice-plan.test.mts` (compiled to `tests/slice-plan.test.mjs`):
  - returns plan artifact path
  - plan artifact contains all 4 expected sections
  - handles slice with no in-scope hint (empty Files section, present Context)
- README + commands/slice-plan.md updated to mention the new command.

## Out of scope

- Approval gate / AskUserQuestion wiring (SLICE-B of this FEAT)
- Conditional behavior keyed on autonomous_safe (SLICE-B)
- Plan-vs-implementation drift detection (separate FEAT)
- Workspace plan sharing across repos (defer to FEAT-024 task-store)
- Integration with `slice start` ceremony (SLICE-B will wire it in)
- Touching ceremony hooks; this slice ships pure new surface area

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter is clean (`npm run lint`)
- [ ] AC-2: `node scripts/loop.mjs slice plan --id SLICE-10` writes a Markdown artifact under `.claude/artifacts/loop/plans/` whose body contains the 4 required sections (`## Context`, `## Files researched`, `## Open questions`, `## Proposed approach`)
- [ ] AC-3: `commands/slice-plan.md` exists with valid frontmatter (`description:` field present) and the manifest validator passes (`node ./scripts/validate-manifests.mjs`)
- [ ] AC-4: New tests in `src/tests/slice-plan.test.mts` cover at minimum: artifact-write path, all-sections-present, no-in-scope-hint fallback (≥3 test cases)
- [ ] AC-5: `runPlanPreflight` exported from `scripts/lib/slice-plan.mjs` and importable from `src/scripts/lib/slice-plan.mts` (TS source matches compiled output — `git diff --exit-code scripts/` clean)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-006 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
