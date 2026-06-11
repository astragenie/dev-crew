---
feature: FEAT-181
findings: "🔴:0,🟡:0,❓:0"
---
# Review Result: FEAT181 SLICE95: expose checkpointDue + sliceClosesSinceCheckpoint on stop-check result

- Created: 2026-06-11T12:37:59.991Z
- Reviewer: reviewer
- Decision: approved
- Summary: 5-line delta to assembleStopResult correctly exposes checkpointDue and sliceClosesSinceCheckpoint as top-level fields; all AC gates pass, shape confirmed in live smoke test.
- Evidence Checked:
  - git diff 1f9e87a..6ee49c2 (5 lines in stop-conditions.mts); null-check uses strict !== null && !== undefined (no loose falsy trap); optional-chain + ?? null fallback for sliceClosesSinceCheckpoint is correct; MarathonCheckpointSignal.closesSinceCheckpoint is number (not nullable)
  - so ?? null fires only when signal itself is null; tsc --noEmit clean both projects; eslint stop-conditions.mts clean (0 errors); prettier check pass; no process.exit; stop-check smoke output shows both keys present
- Files Reviewed:
  - src/scripts/lib/stop-conditions.mts
- Test Adequacy: 10/10 marathon-checkpoint.test.mts pass; 11/11 stop-conditions.test.mts pass; 1250/1250 full suite pass (49 skip, 0 fail); AC-3 shape confirmed via live stop-check smoke; AC-5 ≥4 tests confirmed
- Risks: none
- Required Follow-up: none

