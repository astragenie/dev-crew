---
id: FEAT-177
status: done
priority: P2
category: bug
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: [SLICE-88]
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.7
pm_technical_risk: 0.15
pm_dependency_depth: 0
composite_score: 0.62
autonomous_safe: true
triage_notes: "via=pm | Single-file fix, concrete ACs, trivial rollback, no external contract. P2, autonomous_safe=true."
started_at: 2026-06-10
slices_complete: [SLICE-88]
completed_at: 2026-06-10
---
## Description

`/loop:snapshot-memory` lists `deferred: true` FEATs under '## Top triaged (next to slice)', presenting non-actionable, externally-blocked items as next-to-slice. The `/loop:auto` walker already excludes deferred items; the snapshot generator does not, so the two views disagree.

Observed 2026-06-10: FEAT-176 (`deferred: true`, blocked on upstream hero-crew fix) is skipped by the walker but still appears in the snapshot's Top-triaged list.

## Root cause

`src/scripts/lib/memory-snapshot.mts` (~line 238): `triagedTop` is built as

```ts
const triagedTop = filterBacklog(backlog, { status: "triaged" })
  .sort(comparePickOrder)
  .slice(0, 5);
```

No filter on the `deferred` frontmatter flag. The walker's filter logic (auto / stop-conditions path) does honor `deferred`; snapshot should match.

## Acceptance criteria

- [ ] AC-1: `triagedTop` in `memory-snapshot.mts` excludes entries whose frontmatter has `deferred: true` (filter before `.slice(0, 5)`). Non-deferred ranking/ordering unchanged.
- [ ] AC-2: Given a triaged backlog containing one `deferred: true` FEAT and >=5 non-deferred triaged FEATs, When the snapshot is generated, Then the deferred FEAT does NOT appear in 'Top triaged' and the list still shows 5 non-deferred entries.
- [ ] AC-3: Given a deferred FEAT and fewer than 5 non-deferred triaged FEATs, Then 'Top triaged' shows only the non-deferred ones (no padding with the deferred entry).
- [ ] AC-4: Backlog counts elsewhere in the snapshot (Triaged: N) still count deferred items — only the 'next to slice' list excludes them. Add a brief note if a count needs a deferred breakdown.
- [ ] AC-5: Test in `src/tests/` (extend the existing memory-snapshot/synergy test) covering AC-2 and AC-3 with fixtures.
- [ ] AC-6: `npm run typecheck && npm run lint && npm test` green.

## Notes

- Mirror the walker's deferred handling so the two stay consistent; if a shared `isDeferred(frontmatter)` helper exists, reuse it rather than re-checking the flag inline.
- Likely autonomous_safe: true — internal, one filter + tests, no external contract. Trivial rollback.
- Surfaced while deferring FEAT-176 (upstream-tracking) on 2026-06-10.