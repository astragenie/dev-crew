---
id: SLICE-88
status: completed
feature: FEAT-177
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-10
updated: 2026-06-10
completed_at: 2026-06-10
---
# SLICE-88: Implement FEAT-177

Implements FEAT-177. See [feature file](../../../backlog/in-progress/FEAT-177.md) for product context.

## Objective

`/loop:snapshot-memory` lists `deferred: true` FEATs under '## Top triaged (next to slice)', presenting non-actionable, externally-blocked items as next-to-slice. The `/loop:auto` walker already excludes deferred items; the snapshot generator does not, so the two views disagree.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: `triagedTop` in `memory-snapshot.mts` excludes entries whose frontmatter has `deferred: true` (filter before `.slice(0, 5)`). Non-deferred ranking/ordering unchanged.
- [ ] AC-2: Given a triaged backlog containing one `deferred: true` FEAT and >=5 non-deferred triaged FEATs, When the snapshot is generated, Then the deferred FEAT does NOT appear in 'Top triaged' and the list still shows 5 non-deferred entries.
- [ ] AC-3: Given a deferred FEAT and fewer than 5 non-deferred triaged FEATs, Then 'Top triaged' shows only the non-deferred ones (no padding with the deferred entry).
- [ ] AC-4: Backlog counts elsewhere in the snapshot (Triaged: N) still count deferred items — only the 'next to slice' list excludes them. Add a brief note if a count needs a deferred breakdown.
- [ ] AC-5: Test in `src/tests/` (extend the existing memory-snapshot/synergy test) covering AC-2 and AC-3 with fixtures.
- [ ] AC-6: `npm run typecheck && npm run lint && npm test` green.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-177 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
