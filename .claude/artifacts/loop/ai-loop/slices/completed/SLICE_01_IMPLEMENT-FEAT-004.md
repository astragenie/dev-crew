---
id: SLICE-01
status: completed
feature: FEAT-004
phase: null
priority: P2
target_release: null
created: 2026-05-27
updated: 2026-05-28
completed_at: 2026-05-28
github_issue: 9
---
# SLICE-01: Implement FEAT-004

Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.

## Objective

Grade files currently named SLICE-NN-grade.md (bare, no timestamp or context). Should follow the same naming convention as other artifacts: timestamp-phase-feat-slice-grade.md.

## In scope

- `scripts/lib/grade-writer.mjs` — grade filenames use `<TS>-<slug>-grade.md` format
- `scripts/lib/grade-parser.mjs` — discovers both new timestamped and legacy formats

## Out of scope

- Other artifact writers (crew-bridge, agent-report-writer)

## Acceptance criteria

- [ ] AC-1: `createGradeFile` output path basename matches `\d{8}T\d{6}Z-.+-grade\.md`
- [ ] AC-2: `grade-parser` discovers grade files in both old (`SLICE-NN-grade.md`) and new (`<TS>-<slug>-grade.md`) formats
- [ ] AC-3: `npm test` green, `npm run lint` clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-004 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: spec compliance (filename pattern, backward compat)
- Reviewer B: code quality (utcTimestamp correctness, no regressions)
