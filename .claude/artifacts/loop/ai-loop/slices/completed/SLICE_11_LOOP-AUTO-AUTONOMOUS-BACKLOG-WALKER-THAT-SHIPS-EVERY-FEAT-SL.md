---
id: SLICE-11
status: completed
feature: FEAT-025
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-02
updated: 2026-06-02
completed_at: 2026-06-02
---
# SLICE-11: /loop:auto — autonomous backlog walker that ships every FEAT/slice until exhaustion or hard halt

Implements FEAT-025. See [feature file](../../../backlog/in-progress/FEAT-025.md) for product context.

## Objective

**SLICE-A of FEAT-025:** ship the backlog-walker primitive that picks the next triaged FEAT, surfaces a structured dispatch instruction (mimicking `slice from-feature` + `slice start`), and reports stop-condition state. Walker is read-only at this slice — emits the dispatch plan but does NOT actually dispatch the builder. Proves the walker logic + iteration boundary + stop conditions without risking unattended builder execution. SLICE-B will wire actual dispatch + auto-commit; SLICE-C will flip default to ship autonomous_safe=false items.

Per FEAT-025 decomposition: SLICE-A (walker primitive, this slice), SLICE-B (risk gate + /crew:fix auto-pivot), SLICE-C (stop conditions + flip default).

## In scope

- New CLI handler `auto` (top-level, not under `slice`) in `scripts/loop.mjs` (and `src/scripts/loop.mts`) wired to new `scripts/lib/auto-walker.mjs`.
- New `scripts/lib/auto-walker.mjs` (+ `src/scripts/lib/auto-walker.mts` source):
  - `runAutoWalker(repoPath, options)` where `options = { maxFeatures?: number, dryRun?: boolean (default true this slice) }`.
  - Reads triaged backlog via existing `listBacklog` + `filterBacklog`.
  - Sorts by composite_score DESC, then priority (P1>P2>P3), then pm_strategic_fit DESC.
  - For each FEAT (capped at `maxFeatures` or all):
    - If `autonomous_safe !== true` → skip with reason `not_autonomous_safe` (SLICE-A only walks safe items).
    - Build `dispatchPlan` object: `{ featureId, suggestedSliceTitle, fromFeatureCmd, startCmd, builderPrompt }` — the literal CLI commands a future SLICE-B would invoke.
    - Run `checkStopConditions(repoPath)` after each plan; if any condition fires → halt early.
  - Returns `{ walked, skipped, planned, halted, stopReason, plans }`.
- New slash command `commands/auto.md` documenting usage + flags.
- Wire CLI flags: `--max-features N`, `--dry-run` (default true this slice — there is no non-dry-run path until SLICE-B).
- Unit tests in `src/tests/auto-walker.test.mts` (compiled to `tests/auto-walker.test.mjs`):
  - happy path: 3 triaged FEATs, only 1 autonomous_safe=true → returns 1 plan, skips 2
  - ranking: 2 triaged FEATs different scores → higher score returned first
  - max-features cap: 3 candidates + maxFeatures=2 → returns 2 plans
  - stop-condition halts: simulated escalation badge → halts immediately, stopReason populated
  - empty backlog: returns `{ walked: 0, planned: [], halted: false }`

## Out of scope

- Actually dispatching the builder (`crew:builder` Agent call) — SLICE-B
- Plan Mode pre-flight integration (uses existing `runPlanPreflight` from SLICE-10) — SLICE-B wires it
- Risk gate (vague AC, low confidence checks) — SLICE-B
- Auto-commit + push per slice — SLICE-B
- Walking autonomous_safe=false items — SLICE-C (after risk gate proven)
- 3-fail escalation to `escalated/` directory — SLICE-C
- Cost cap + cost-advise alert integration — SLICE-C
- Modifying existing ceremony hooks — never (additive only)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter clean (`npm run lint`)
- [ ] AC-2: `node scripts/loop.mjs auto --dry-run` returns a JSON object with shape `{ walked, skipped, planned, halted, stopReason, plans }`. `plans` is an array of dispatch-plan objects.
- [ ] AC-3: Walker correctly filters: includes only `autonomous_safe: true` triaged FEATs; skips others with reason `not_autonomous_safe` in the `skipped` array.
- [ ] AC-4: `commands/auto.md` exists with valid frontmatter (`description:` field) and manifest validator passes (`node ./scripts/validate-manifests.mjs`).
- [ ] AC-5: New tests in `src/tests/auto-walker.test.mts` cover ≥5 cases (happy path, ranking, max-features cap, stop-condition halt, empty backlog).
- [ ] AC-6: `runAutoWalker` exported from `scripts/lib/auto-walker.mjs` and `src/scripts/lib/auto-walker.mts`; `git diff --exit-code scripts/` clean after `npm run build`.
- [ ] AC-7: `--max-features N` flag respected; walker stops after N plans even if backlog has more candidates.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-025 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
