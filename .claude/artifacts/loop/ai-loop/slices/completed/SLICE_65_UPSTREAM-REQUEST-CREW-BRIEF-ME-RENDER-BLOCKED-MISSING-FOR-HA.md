---
id: SLICE-65
status: completed
feature: FEAT-064
phase: null
priority: P2
target_release: v0.15.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
completed_at: 2026-06-07
github_issue: 135
github_url: "https://github.com/sergeymilashico/loop/issues/135"
---
# SLICE-65: Upstream-request crew brief-me render Blocked/Missing for halt-badge fields

Implements FEAT-064. See [feature file](../../../backlog/in-progress/FEAT-064.md) for product context.

## Objective

File an upstream-request markdown doc against the hero-crew plugin asking for `brief-me` to render an explicit Blocked/Missing section for every halt-badge field loop emits (`costRegression`, `sessionDrift`, `sliceCostCeiling`, `gradeTrend`, `mergeFailed`). Loop already publishes the registry source-of-truth at `docs/halt-badges.md` (FEAT-063, v0.20.0). This SLICE writes the request that asks crew to consume that registry. Pure documentation; no code change in this repo.

## In scope

- New file `docs/upstream-requests/2026-06-07-hero-crew-brief-me-halt-badge-rendering.md`
- Follow the same frontmatter shape as the existing `2026-06-06-hero-crew-redundant-read-hook-deny.md` (filed, target_plugin, target_repo, status, loop_tracking_feat, loop_related_slice)
- Cite the 5 current halt-badge field names + the registry doc path
- Describe expected `brief-me` rendering behavior with one concrete example output block
- Document the fail-open contract for unknown future halt-badge fields

## Out of scope

- Changes to loop's `docs/halt-badges.md` or halt-badge emitting code (already shipped)
- Changes to crew (we cannot edit hero-crew from this repo)
- Loop `brief --explain-halts` (FEAT-065, already shipped — this request explicitly notes that loop has a local workaround already)
- New halt-badge fields (separate FEAT)

## Acceptance criteria

- [ ] AC-1: New file at `docs/upstream-requests/2026-06-07-hero-crew-brief-me-halt-badge-rendering.md` exists with frontmatter matching the existing upstream-request template
- [ ] AC-2: Doc explicitly references the registry at `docs/halt-badges.md` (loop-owned) and lists all 5 current halt-badge field names + their human-readable gate names
- [ ] AC-3: Doc includes one concrete `brief-me` output example showing the expected rendering with a halt fired
- [ ] AC-4: Doc states the fail-open contract: unknown halt-badge field names degrade gracefully (skip render, log loop-halt-unknown event)
- [ ] AC-5: Doc cross-references SPEC-003 + the loop-side companion FEATs (063 done, 065 done, 066 done)
- [ ] AC-6: `npm test` + `npm run lint` clean (no code changed, must still pass)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-064 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (content accuracy): verify all 5 halt-badge field names match `src/scripts/lib/halt-badges.mts` registry exactly; verify the example brief-me output is plausibly what crew would render; verify SPEC-003 reference matches `.claude/artifacts/loop/specs/SPEC-003.md`.
- Reviewer B (request hygiene): verify frontmatter matches the existing upstream-request template; verify the request is actionable for the hero-crew owner (concrete code paths or contract surface called out); confirm fail-open contract is stated.
