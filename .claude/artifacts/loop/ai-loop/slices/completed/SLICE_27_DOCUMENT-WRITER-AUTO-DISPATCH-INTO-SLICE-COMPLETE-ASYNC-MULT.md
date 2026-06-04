---
id: SLICE-27
status: completed
feature: FEAT-030
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
---
# SLICE-27: wire document-writer into slice-complete (async fire-and-forget)

Implements FEAT-030 (originally SLICE-D of FEAT-028, split off when FEAT-028 hit the decomposition pattern alert). Foundations: `auto-dispatch.mts` from SLICE-23. Test-injection seam pattern from SLICE-25 / SLICE-26.

## Objective

Hook `loop:document-writer` dispatch into the `slice-complete` ceremony. Async / background — close ceremony does NOT block on doc-writer. Multi-output prompt provides slice + grade + FEAT context; doc-writer decides which outputs to produce. `--no-doc-writer` opt-out via standard flag mechanism.

## In scope

- `src/scripts/loop.mts` (`slice complete` handler) OR `src/scripts/lib/slice-linker/complete-slice.mts` (the actual close ceremony) — wire dispatch at the END of the ceremony, after grade is suggested but BEFORE CLI returns:
  - When `--no-doc-writer` flag set → skip via opt-out (audit log entry)
  - Otherwise → fire dispatch via `dispatchAgent` with `parentCommand: "slice-complete"`, `skipFlag: "--no-doc-writer"`
  - **Async / fire-and-forget**: do NOT `await` the dispatch result before returning the CLI response. Use a detached promise or marker-file pattern (per DEC-004 the dispatch is already async via marker — exploit that).
  - Test injection seam: optional `dispatchFn` parameter mirrors SLICE-25/26 pattern
- Doc-writer dispatch prompt encodes the multi-output decision tree:
  ```
  Slice <id> closed. Decide which outputs to draft based on context:
  - CHANGELOG line: always — produce one line summarizing the slice
  - ADR draft for each DEC-NNN extracted from grade: only if grade.decisions[] non-empty
  - Release-notes append: only if FEAT.frontmatter.target_release is set
  - README / docs suggestion: only if FEAT touches commands/, agents/, skills/, or has surface-flag
  Return: list of files to write + content. If no outputs warranted, return "no doc needed".
  Slice context: <slice path>
  Grade context: <grade path>
  FEAT context: <feat path>
  ```
- `src/tests/slice-complete-docwriter.test.mts` (new) — behavior tests:
  - With `--no-doc-writer` → audit log entry has `skipped: true`, slice-complete returns successfully unchanged
  - Default (no flag) → audit log entry written, slice-complete returns successfully WITHOUT blocking on dispatch result
  - With dispatch failure (mock) → slice-complete still returns success, audit log records failure
  - Pre-existing slice-complete tests stay green

## Out of scope

- Pending-dispatch marker consumer / cleanup (per DEC-004, separate future FEAT)
- ADR / release-notes / CHANGELOG template authoring (doc-writer agent owns prose)
- Doc-writer agent prompt content changes
- Synchronous variant of doc-writer dispatch (always async)

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new tests, ~603 total)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `node scripts/loop.mjs slice complete --no-doc-writer --id <SLICE-ID>` writes audit log skip entry; slice-complete returns successfully
- [ ] AC-5: Default `slice complete` triggers dispatch; audit log entry written; slice-complete returns within normal close-ceremony time (does not block on dispatch)
- [ ] AC-6: Test asserts: doc-writer dispatch failure isolated — slice-complete always returns success
- [ ] AC-7: Pre-existing slice-complete tests stay green (no regression)
- [ ] AC-8: Live smoke test on an already-closed slice OR test-tmpdir confirms audit log line appears

## Done When

- All ACs PASS with evidence
- Feature FEAT-030 moved from `in-progress/` to `done/` (this is its only slice)
- Crew `final-synthesis` artifact written
- Grade written
- `requires_validation: false` — covered by unit tests + live smoke

## Reviewer ladder

- **Reviewer A** — Engineering pass: async dispatch correctness (fire-and-forget shape, no unhandled-rejection patterns), test injection seam pattern reuse from SLICE-25/26, multi-output prompt is parseable by doc-writer agent (rough check).
- **Reviewer B** — Production-readiness pass: marker accumulation (per DEC-004 followup); audit log integration; backwards compat with existing slice-complete callers (`--keep-feature-open`, `--force-close`, etc.); behavior when slice-complete is invoked twice for the same slice.

## Risks

- **Unhandled rejection**: if dispatch fails async, must not propagate as unhandled-promise-rejection. Mitigation: explicit `.catch()` on the dispatched promise to record failure in audit log.
- **Race with CLI exit**: if CLI process exits before async dispatch completes, the marker file may not be written. Mitigation: marker write is synchronous before the dispatch result is captured — should land regardless.
- **Multi-output prompt drift**: doc-writer agent may interpret the decision tree differently than CLI intends. Mitigation: tests assert dispatch is fired with the expected prompt content (not asserting doc-writer's response).

## Open questions

- Q1: Where exactly does `slice complete` ceremony return — `src/scripts/loop.mts` directly, or via `src/scripts/lib/slice-linker/complete-slice.mts`? Need to find the hook point.
- Q2: Does the existing `dispatchAgent` support a `detach: true` option, or do we just not await the promise? Either is fine — pick whatever matches the existing async pattern in the codebase.
