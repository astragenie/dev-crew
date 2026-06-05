---
validation_evidence: "npm test: 772 pass / 0 fail; npm run lint exit 0; npm run typecheck exit 0; node scripts/validate-manifests.mjs clean; node scripts/validate-content-length.mjs clean — code-only refactor, no user-visible surface change"
---
# Review Result: SLICE-50: Remove CLI auto-dispatch — slash flows are the contract (FEAT-049)

- Created: 2026-06-05T14:25:53.134Z
- Reviewer: reviewer
- Decision: approved
- Summary: All 8 ACs verified with evidence, scope discipline maintained (classifySlice/architectOptOut untouched per OQ-4), DEC-011 complete and DEC-004 superseded, all gates clean at 772/772 passing.
- Evidence Checked:
  - AC-1: npm test 772/772 pass
  - npm run lint exit 0
  - typecheck exit 0
  - manifests OK
  - content-length OK. AC-2: runBacklogEnrich sets process.exitCode=1
  - stderr contains 'CLI auto-dispatch removed'+'DEC-011'+'loop:backlog-enrich'
  - audit log written with skipReason:cli-refusal
  - no marker files. AC-3: resolveBacklogAddBody returns '' with empty body (no exit 1)
  - stderr deprecation note emitted
  - audit log written. AC-4: SPEC_HANDLERS.decompose sets exitCode=1 when no --features/--features-json
  - stderr cites DEC-011+/loop:spec-decompose+--features. AC-5: fireDocWriterDispatch deleted from complete-slice.mts; writeDocWriterSkipAuditLog replaces it. AC-6: CLAUDE.md auto-dispatch section rewritten to slash-only contract per plan Phase 3. AC-7: DEC-011 written at .claude/artifacts/loop/decisions/DEC-011.md with id/status:accepted/supersedes:[DEC-004]/introduced_by_slice:SLICE-50; DEC-004 updated to status:superseded/superseded_by:DEC-011. AC-8: 4 new refusal tests across backlog-enrich (message+exitCode+auditLog+noMarker+frontmatterUnmodified)
  - spec-decompose (message+exitCode+auditLog)
  - slice-complete-docwriter (auditLog+noMarker+ceremony ok)
  - backlog-add (empty body+exitCode 0+auditLog). Backward compat: --no-research/--no-architect/--no-doc-writer all kept as no-op with stderr deprecation note. auto-dispatch.mts UNTOUCHED. classifySlice/architectOptOut in feature-lifecycle.mts UNTOUCHED (OQ-4 deferred). No scope creep. sanitizeResearcherBody helper re-defined locally in backlog-add-research.test.mts as regression guard. gstack-health: typecheck 10/10
  - lint 10/10
  - tests 10/10
  - manifests 10/10
  - content-length 10/10.
- Files Reviewed:
  - src/scripts/loop.mts
  - src/scripts/lib/slice-linker/complete-slice.mts
  - CLAUDE.md
  - .claude/artifacts/loop/decisions/DEC-011.md
  - .claude/artifacts/loop/decisions/DEC-004.md
  - src/tests/backlog-enrich.test.mts
  - src/tests/spec-decompose-architect.test.mts
  - src/tests/slice-complete-docwriter.test.mts
  - src/tests/backlog-add-research.test.mts
  - src/tests/slice-classify.test.mts
- Test Adequacy: Tests remain at 772/772 (repurposed, not net-added — old dispatch-mock tests replaced with refusal-path tests containing message assertions, exitCode assertions, auditLog assertions, and no-marker assertions across all 4 affected CLI surfaces)

## Validation Evidence

npm test: 772 pass / 0 fail; npm run lint exit 0; npm run typecheck exit 0; node scripts/validate-manifests.mjs clean; node scripts/validate-content-length.mjs clean — code-only refactor, no user-visible surface change
- Risks: sanitizeResearcherBody helper is duplicated between loop.mts (deleted) and backlog-add-research.test.mts (local copy as regression guard) — minor maintenance risk if logic diverges, but test passes and function is trivial. classifySlice in feature-lifecycle.mts still calls dispatchAgent and will continue writing marker files to pending-dispatch/ — explicitly accepted per DEC-011 and OQ-4 deferral, documented in CLAUDE.md.
- Required Follow-up: Follow-up FEAT for classifySlice/feature-lifecycle.mts (OQ-4 deferred). Follow-up FEAT to remove --no-research/--no-architect/--no-doc-writer flags once telemetry confirms zero usage.

