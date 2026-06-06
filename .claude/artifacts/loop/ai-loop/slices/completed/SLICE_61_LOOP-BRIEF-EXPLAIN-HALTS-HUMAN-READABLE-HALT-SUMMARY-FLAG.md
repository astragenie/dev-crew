---
id: SLICE-61
status: completed
feature: FEAT-065
phase: null
priority: P2
target_release: v0.15.0
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-61: Loop brief --explain-halts human-readable halt summary flag

Implements FEAT-065. See [feature file](../../../backlog/in-progress/FEAT-065.md) for product context.

## Objective

Add `--explain-halts` flag to `node scripts/loop.mjs brief`. When non-null halt-badge fields are present in the snapshot, emit a human-readable section after the JSON (or as a separate render mode) summarizing each fired halt with: gate name + key values + suggested operator action. Iterates the registry in `docs/halt-badges.md` (FEAT-063) so unknown future fields degrade gracefully.

Loop-side delivery of the SPEC-003 SLO ("operator-time-to-understand-halt ≤ 30s") without depending on crew brief-me upstream (FEAT-064).

## In scope

- New `src/scripts/lib/halt-badges.mts` — typed list of known halt-badge field names + per-field renderer (returns human-readable string when field is non-null, empty when null)
- `src/scripts/loop.mts` brief subcommand: accept `--explain-halts` flag; when set, after emitting the existing brief JSON, also write a `## Halt summary` markdown block to stdout
- When NO halt-badge fields are populated, `--explain-halts` prints "No halts active." (single line)
- When ANY halt-badge is populated, print one section per fired halt with the registry shape (name, current values vs threshold, suggested action)
- Tests in `src/tests/explain-halts.test.mts` covering: no-halts, single halt, multiple halts, unknown field (graceful degrade)

## Out of scope

- Modifying the existing JSON brief shape (additive only)
- Crew `brief-me` rendering (FEAT-064 upstream-request)
- Changing halt-firing logic or thresholds
- Schema regression test (FEAT-066)
- Auto-emitting halt summary without the flag (preserves existing CI / scripted consumers)

## Acceptance criteria

- [ ] AC-1: All gates green (`npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `node scripts/loop.mjs brief --explain-halts` prints the standard JSON body, then a `## Halt summary` block to stdout
- [ ] AC-3: When all halt-badge fields are null, the block reads exactly `## Halt summary\n\nNo halts active.\n`
- [ ] AC-4: When `costRegression` is non-null, block includes its gate name, `currentUsd` vs `thresholdUsd` (× `multiplier` of `medianUsd`), and the suggested action
- [ ] AC-5: When `sessionDrift` is non-null, block includes both sessionIds and the suggested action
- [ ] AC-6: When `sliceCostCeiling` is non-null, block includes `actualUsd` vs `ceilingUsd` and the suggested action
- [ ] AC-7: When `gradeTrend` is non-null, block includes `consecutiveBelow` slices below `threshold` and the suggested action
- [ ] AC-8: Without `--explain-halts`, brief output is byte-identical to v0.20.0 (no regression for scripted consumers)
- [ ] AC-9: Unit tests cover: all-null path, each single-halt path, multi-halt combined render, malformed snapshot (graceful)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-065 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: correctness — renderer accuracy per registry, fallback for unknown fields, byte-identity without flag
- Reviewer B: scope discipline — JSON shape untouched, no halt-firing changes, no crew-side leakage
