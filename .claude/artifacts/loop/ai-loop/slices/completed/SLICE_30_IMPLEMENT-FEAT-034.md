---
id: SLICE-30
status: completed
feature: FEAT-034
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
---
# SLICE-30: pending-dispatch marker drain on slice-complete (FEAT-034 Issue #1)

Implements **Issue #1** only from FEAT-034 (SPEC-002 Theme A). Issues #2 (builder mid-cleanup stop pattern) and #3 (hardcoded auto-dispatch.jsonl path) are explicit OUT OF SCOPE — they will land as SLICE-31 and SLICE-32 (or follow-on FEATs) to avoid the decomposition pattern alert on FEAT-034.

## Objective

Marker files at `.claude/artifacts/loop/pending-dispatch/` accumulate with no cleanup. SLICE-23 / SLICE-27 / SLICE-29 grades all flagged this. Add a drain step that runs at the END of `slice-complete` ceremony: remove marker files older than a configurable TTL (default 24h). Async / non-blocking (fire-and-forget pattern, mirrors document-writer dispatch from SLICE-27). Auditable via existing audit log.

## Behavior contract

1. After the slice-complete ceremony finishes its main work but BEFORE returning, fire a `drainPendingDispatchMarkers(repoPath, opts)` call. Async / fire-and-forget — does NOT block the ceremony return.
2. The drain function:
   - Reads `.claude/artifacts/loop/pending-dispatch/` directory (creates nothing if absent).
   - For each `*.json` file, parses the leading numeric timestamp in the filename (`<ms-since-epoch>-<agent>.json`).
   - If `now - timestamp_ms > opts.ttlMs` (default 24 * 60 * 60 * 1000 = 86_400_000), unlink the file.
   - Continues on individual delete failures (logs but does not throw).
   - Returns `{ scanned, deleted, kept, errors[] }` — for observability + tests, even though async.
3. Caller in slice-complete: `void drainPendingDispatchMarkers(repoPath).catch(err => appendAuditLog(...))` — failure recorded in audit log, does not propagate.
4. `--no-marker-drain` flag short-circuits (mirror existing `--no-doc-writer` opt-out shape).

## In scope

- New module `src/scripts/lib/marker-drain.mts`:
  - `drainPendingDispatchMarkers(repoPath, opts)` exported
  - `DEFAULT_TTL_MS = 24 * 60 * 60 * 1000` constant exported
  - Pure parsing helper `parseMarkerTimestamp(filename: string): number | null` for unit tests
- Wire into `src/scripts/lib/slice-linker/complete-slice.mts` — after `fireDocWriterDispatch`, add `fireMarkerDrain(repoPath, opts)` helper (mirror pattern). Drain failure isolated via try-catch.
- `src/tests/marker-drain.test.mts` (new) covering:
  - `parseMarkerTimestamp` valid + invalid filenames
  - Drain deletes files older than TTL, keeps newer ones
  - Drain handles missing directory (no error)
  - Drain handles individual unlink failures (returns errors[] entry, continues)
  - Opt-out flag (`--no-marker-drain`) short-circuits the drain
  - Returns shape `{ scanned, deleted, kept, errors }` with correct counts

## Out of scope (this slice)

- Issue #2 (builder mid-cleanup stop pattern investigation) — that's research; lands as SLICE-31 against FEAT-032 (or as the SLICE-B of FEAT-034 later).
- Issue #3 (configurable `auditLogPath` in loop.json) — separate slice, mechanical config wiring.
- Cleanup of OTHER artifact dirs (cost reports, plans, trajectories — those have their own retention policies if any).
- Active-consumer dispatch (per DEC-004, the marker IS the dispatch primitive; out-of-band consumer is a separate concern).

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new marker-drain tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `scripts/lib/marker-drain.mjs` exists with the three exported names (`drainPendingDispatchMarkers`, `DEFAULT_TTL_MS`, `parseMarkerTimestamp`)
- [ ] AC-5: Unit test: drain deletes a fake marker with timestamp older than TTL, keeps one inside TTL
- [ ] AC-6: Unit test: drain handles missing directory (no throw, returns `{ scanned: 0, deleted: 0, kept: 0, errors: [] }`)
- [ ] AC-7: Unit test: `slice-complete` invokes drain (verified via mock `drainFn` injection seam, same pattern as `dispatchFn` from SLICE-27)
- [ ] AC-8: Unit test: `--no-marker-drain` flag short-circuits — drain NOT called
- [ ] AC-9: Live smoke: write a fake marker with timestamp `now - 48h`, run `slice complete` against any test slice, confirm marker deleted

## Done When

- All ACs PASS with evidence
- FEAT-034 stays `in-progress` (Issues #2 + #3 remain)
- Crew `final-synthesis` written
- Grade written
- `requires_validation: false` — covered by unit tests + live smoke

## Reviewer ladder

- **Reviewer A** — Engineering pass: drain isolation (fire-and-forget pattern correct), TTL math correctness, unlink error handling, test seam injection mirrors SLICE-27 pattern, no behavior change to existing slice-complete callers without the new opt-out flag.
- **Reviewer B** — Production-readiness pass: drain failure does NOT block ceremony close, audit log entry on drain failure, behavior when `pending-dispatch/` has hundreds of markers (acceptable scan time), behavior when filename does not match `<ts>-<agent>.json` pattern (skip safely, not delete unrelated files).

## Risks

- **Wrong filename parse → accidentally delete user files**: drain MUST only operate on `*.json` files in `pending-dispatch/` AND only files whose name matches `^\d{13,}-[a-z][\w-]*\.json$`. Files not matching are skipped (not deleted).
- **Slow scan on large dirs**: TTL of 24h means most markers should rotate cleanly. Cap scan to N=1000 files per invocation to bound worst case (deferred to followup if needed).
- **Race condition**: a marker being written while drain runs. Since drain is async and unlinks individually, even if a marker is created mid-drain, the next drain invocation handles it.

## Open questions

(none — all design decisions captured in FEAT body + this slice)
