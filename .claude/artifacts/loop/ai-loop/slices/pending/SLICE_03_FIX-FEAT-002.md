---
id: SLICE-03
status: pending
feature: FEAT-002
phase: null
priority: P1
target_release: null
created: 2026-05-28
updated: 2026-05-28
---
# SLICE-03: Fix agent-report filename — add leading timestamp, move kind before slug

Fixes the loop-owned portion of FEAT-002. The crew-CLI double-prefix bug
(item 1) lives in the hero-crew repo and is out of scope for this slice.

## Objective

`agent-report-writer.mjs` writes files as `<slug>-agent-report.md` (no
timestamp, kind at end). Every other loop/crew artifact uses
`<TS>-<kind>-<slug>.md`. Align agent-report with that convention.

## In scope

- `scripts/lib/slice-linker/agent-report-writer.mjs`: change line 349 to emit
  `<TS>-agent-report-<slug>.md` where TS = `YYYYMMDDTHHMMSSZ`
- `tests/agent-report-writer.test.mjs`: update filename assertions
- No other files

## Implementation notes (from pre-implementation review)

**Timestamp generation:** write an inline UTC timestamp string in
`agent-report-writer.mjs` using the same pattern as `grade-writer.mjs::utcTimestamp()`:
```js
new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")
// produces: 20260528T150412Z
```
Do NOT import from `grade-writer.mjs` (wrong-layer coupling). Consider extracting
to `artifact-naming.mjs` as a shared export if the reviewer agrees.

**Test file:** `tests/agent-report-writer.test.mjs` line 401 hard-codes
`'slice19-agent-report.md'` using the OLD format. That string must be updated to
match the new pattern. Also add a `assert.match(path.basename(result.reportPath), /\d{8}T\d{6}Z-agent-report-.+\.md/)` assertion.

## Out of scope

- crew-CLI double cost prefix (hero-crew repo)
- FEAT-003 artifact header ordering (separate slice)
- grade-writer, crew-bridge filenames

## Acceptance criteria

- [ ] AC-1: `writeAgentReport` output path basename matches `\d{8}T\d{6}Z-agent-report-.+\.md`
- [ ] AC-2: Existing tests pass (`npm test`)
- [ ] AC-3: Lint clean (`npm run lint`)

## Done When

- all ACs PASS with evidence
- `npm test` green
- FEAT-002 kept in-progress (part 1 still open in hero-crew repo)
- Crew `final-synthesis` artifact written for this slice

## Reviewer ladder

- Reviewer A: spec compliance (does filename match pattern, do tests cover it?)
- Reviewer B: code quality (timestamp generation correctness, edge cases)
