---
id: SLICE-04
status: completed
feature: FEAT-003
phase: null
priority: P1
target_release: null
created: 2026-05-28
updated: 2026-05-28
completed_at: 2026-05-28
---
# SLICE-04: Consistent phase/feat/slice identification in artifact headers

Fixes FEAT-003: artifact body headers must display phase → feature → slice
in wide→narrow order. Currently some writers omit fields or use wrong order.

## Objective

Every loop-owned artifact body must open with an identification line in the
format: `**Phase:** X · **Feature:** FEAT-NNN · **Slice:** SLICE-NN`.
Fields not applicable to a given artifact type are omitted. Order is always
phase → feature → slice (never reversed).

## In scope

ADD an identification line (phase → feature → slice) to artifact bodies that
currently have NO identification block at all. This is an addition, not a reorder.
Writers to fix:
- `scripts/lib/slice-linker/agent-report-writer.mjs` — already correct, no change
- `scripts/lib/grade-writer.mjs` — grade template body has NO identification line; ADD one
- `scripts/lib/slice-linker/crew-bridge.mjs` — `renderSynthesisBody()` and
  `writeCrewHandoff()` body have NO identification line; ADD one to each
- Any other loop-owned artifact writer that emits a body header

`renderIdentification()` in `agent-report-writer.mjs` is not exported. Either export it
(preferred), duplicate it (acceptable for a 7-line pure function), or move it to a
shared module. Do not over-engineer this.

Update tests for any writers that change.

## Out of scope

- Crew-CLI-owned artifacts (run-brief, review-result, validation-result,
  cost-report) — their headers are crew CLI's responsibility
- FEAT-002 filename fix (SLICE-03)

## Acceptance criteria

- [ ] AC-1: All loop-owned artifact bodies have an identification section
  in phase → feature → slice order (grade-writer, crew-bridge handoff, crew-bridge
  final-synthesis must all have it after this slice)
- [ ] AC-2: Fields absent from the writer call (e.g. null phase) are omitted
  cleanly — no blank `**Phase:**` lines
- [ ] AC-3: `npm test` green, `npm run lint` clean

## Done When

- all ACs PASS with evidence
- FEAT-003 moved to done
- Crew `final-synthesis` written

## Reviewer ladder

- Reviewer A: spec compliance (does every affected writer now emit correct order?)
- Reviewer B: code quality (no duplication, tests cover the ordering)
