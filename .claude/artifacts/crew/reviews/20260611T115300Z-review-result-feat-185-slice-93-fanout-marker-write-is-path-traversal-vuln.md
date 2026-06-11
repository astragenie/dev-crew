---
feature: FEAT-185
---
# Review Result: FEAT-185 SLICE-93: fanout marker write is path-traversal-vulnerable via unvalidated sliceId

- Created: 2026-06-11T11:53:00.821Z
- Reviewer: reviewer
- Decision: approved_with_notes
- Summary: All CI gates pass (tsc, eslint, prettier, 1241 tests green). Core production-readiness checklist passes: best-effort contract enforced, no process.exit, no resolveConfig, idempotency confirmed, corruption tolerance confirmed, race-safety of mkdir(recursive) confirmed. One MEDIUM finding: path.join(repoPath, ..., sliceId + '.json') does not sanitize sliceId, so a crafted sliceId such as '../../etc/passwd' resolves outside repoPath. In practice sliceId comes from CLI --id flag with only truthy check (requireId), not a format guard. Impact is low in the trusted-operator CLI model but inconsistent with repo security posture and the rest of the file's defensive style.
- Evidence Checked:
  - fanout-marker.mts:28 path.join(dir
  - sliceId+'.json') — no sanitization; loop.mts:934-936 requireId only checks truthiness; applyTelemetry idempotency confirmed via code trace; all 5 targeted tests pass; 1241/1290 suite pass; tsc/eslint/prettier clean
- Files Reviewed:
  - src/scripts/lib/fanout-marker.mts
  - src/scripts/lib/grade-telemetry.mts
  - src/scripts/loop.mts
  - src/scripts/lib/slice-linker/dispatch.mts
  - src/tests/post-builder-fanout-marker.test.mts
  - commands/slice-complete.md
- Test Adequacy: 5 new tests cover write roundtrip, absent-marker null, present-marker read, computeTelemetry true-when-present, computeTelemetry null-when-absent. All pass. Corrupt/empty JSON coverage missing from test suite but code correctness verified by read: catch block returns null for any parse failure including empty file.
- Risks: MEDIUM: sliceId path traversal via crafted --id flag (trusted-operator CLI, low exploitation probability but should be fixed before any future networked/shared use). LOW: no pruning policy for fanout-markers dir (disk fill bounded by slice count, not a production concern today). LOW: stale marker if same slice id ever reused across runs (slice IDs are unique-for-lifetime by convention; no systemic risk).
- Required Follow-up: Add sliceId format guard (e.g. /^SLICE-[0-9]+$/ or path.basename check) in fanout-marker.mts writeFanoutMarker and readFanoutMarker before production networked exposure. Add corrupt-JSON test case (write raw not-json bytes, assert readFanoutMarker returns null). Both LOW urgency given trusted-operator model.

