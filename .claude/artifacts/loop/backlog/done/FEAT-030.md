---
id: FEAT-030
status: done
priority: P1
category: feature
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-27]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-04
slices_complete: [SLICE-27]
completed_at: 2026-06-04
---
# FEAT-030: document-writer auto-dispatch into slice-complete (async multi-output)

## Description

Hook `loop:document-writer` into `slice-complete` ceremony so that
post-slice documentation outputs (CHANGELOG line, ADR drafts for
DEC-NNN, release-notes append, README/docs suggestions) are drafted
automatically. Async / background dispatch — does NOT block close
ceremony. Multi-output: single dispatch produces whatever subset of
outputs the slice/grade/FEAT state warrants.

Split off from FEAT-028 (SLICE-D originally) when FEAT-028 hit the
decomposition pattern alert at 3 in-progress slices. The
auto-dispatch foundation + researcher + architect integrations
shipped in FEAT-028; this FEAT lands the third (and final) consumer.

## Motivation

After every slice-complete, CHANGELOG / release notes / ADR drafts
should appear without human intervention. Today they drift between
manual cleanups. document-writer agent exists but has no harness
integration. This finishes that integration.

## Goals

- `slice-complete` triggers `loop:document-writer` dispatch via the
  auto-dispatch primitive (SLICE-A foundation, shipped in FEAT-028)
- Dispatch is **async / background** — close ceremony returns
  immediately; doc-writer runs out of band and writes outputs when
  ready
- Multi-output decision logic based on what the slice / grade / FEAT
  frontmatter has set:
  - CHANGELOG line: always (every closed slice)
  - ADR draft for each DEC-NNN extracted from grade: when present
  - Release-notes append: when FEAT `target_release` is set
  - README / docs suggestion: when FEAT touches user-facing surface
    (heuristic: surface flag in FEAT frontmatter, or files-changed
    overlap with `commands/`, `agents/`, `skills/`)
- `--no-doc-writer` opt-out flag on slice-complete (defers to
  manual doc writing for that slice)
- Audit log entries for each dispatch (consistent with researcher /
  architect integration sites)

## Design decisions (resolved up front)

- **Async / background dispatch** — slice-complete must not block on
  doc-writer (could be slow; close ceremony has its own timing
  expectations). Dispatch fires, marker file is written, ceremony
  returns. Harness consumer picks up the marker and runs doc-writer
  out of band.
- **Multi-output is a single dispatch** — doc-writer receives the
  full context (slice, grade, FEAT frontmatter) and decides which
  outputs to produce. CLI does not pre-decide.
- **Skipped when no DEC, no target_release, no surface change** —
  if there's literally nothing to document, doc-writer returns
  early with "no doc needed" verdict; no files written. Reduces
  noise on trivial slices.

## Slices

- **SLICE-A — wire document-writer into slice-complete** (~2 hr)
  - Hook in `feature-lifecycle.mts` (or wherever slice-complete
    fires) at the end of the ceremony, after grade is suggested but
    before CLI returns
  - Async dispatch via `dispatchAgent` — fire-and-forget pattern
  - Multi-output prompt to doc-writer with slice/grade/FEAT context
  - `--no-doc-writer` opt-out via `parseSkipFlag`
  - Test injection seam (same pattern as SLICE-B/C)
  - Tests for: opt-out honored, dispatch failure isolated, audit
    log written, ceremony close NOT blocked on dispatch

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`,
      `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `node scripts/loop.mjs slice complete --no-doc-writer`
      skips dispatch, audit log entry has `skipped: true`,
      slice-complete returns successfully unchanged
- [ ] AC-5: Default `slice complete` triggers dispatch, audit log
      entry written, slice-complete returns without waiting for
      doc-writer to finish (timing test: dispatch start vs return)
- [ ] AC-6: Doc-writer dispatch failure isolated — slice-complete
      always returns success; audit log records the failure
- [ ] AC-7: Pre-existing slice-complete tests stay green
      (regression guard — existing close ceremony behavior unchanged)

## Out of scope

- Pending-dispatch marker consumer / cleanup (per DEC-004 in
  GRADE-SLICE-23, this is a future foundation slice — not blocking
  for THIS FEAT)
- Doc-writer agent prompt content changes
- ADR template / release-notes template authoring (doc-writer agent
  owns prose; CLI just dispatches with context)

## Risks

- **Async timing**: dispatch fires and ceremony returns. If dispatch
  fails, only the audit log shows it. Mitigation: audit log entry
  contains enough info to retry manually.
- **Multi-output prompt complexity**: doc-writer must judge which
  outputs to produce. Mitigation: prompt provides explicit decision
  tree based on FEAT/grade frontmatter.
- **Marker accumulation**: same followup as DEC-004 — markers pile
  up. Filed as separate FEAT.
