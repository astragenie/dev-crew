# PM review: FEAT-206 (2026-07-02)

```json
{
  "featureId": "FEAT-206",
  "scores": {
    "customer_impact": 0.55,
    "effort_estimate": 0.15,
    "strategic_alignment": 0.65,
    "technical_risk": 0.15,
    "dependency_depth": 0.1
  },
  "compositePriority": "P1",
  "autonomousSafe": true,
  "demandEvidence": "Retrospective Section 0.3 (H/Strong): ~31% of SLICE-51..98 had >=1 pause-without-artifact; grade files 108-133 show zero new occurrences after FEAT-161's scaffold-first contract. I independently confirmed the SOP text at docs/sop/specialist-pause-handling.md:37-41 detects pause via raw ls -t .claude/artifacts/crew/reviews/*<slice-id>* file-existence, and confirmed dev-team/agents/inspector.md:35-46 writes a --scaffold --status in-progress artifact on first action, then --update ... --status completed on exit -- the SOP's file-existence check cannot distinguish these two states, exactly as the FEAT body claims.",
  "scopeNotes": "Smallest deliverable: change the SOP's Section 1 detection step from 'file exists' to 'file exists AND status field is not in-progress', citing FEAT-161. Single-file docs change. Overlap: none with other FEATs in this batch (FEAT-212's pause telemetry explicitly depends on reusing this SOP's detection step -- see FEAT-212 dependency_depth note). Effort calibration: smallest scope in this batch (single markdown file, prose-only fix), no exact cost analog needed beyond noting it's a small subset of SLICE-83's scope.",
  "risks": [
    "It is two weeks later and this slice failed review: the SOP edit updates the 'Detect the pause' prose but is validated only against the pause case, not the completed-artifact case, so a wording change that over-detects (flags completed runs as paused) ships unnoticed.",
    "Rollback: revert-only -- pure markdown edit, git revert fully restores prior text, no state or artifact-shape implication.",
    "Coverage gap: no existing automated test validates SOP prose against real artifact fixtures today (SOPs are human-followed procedures) -- if the 'fixture test' AC below is implemented as a doc-text lint rather than an executable check against actual write-review-result output shapes, it won't catch future drift if the status field is ever renamed."
  ],
  "reasoning": "Technical risk band 0.0-0.2: docs-only edit to a single procedure file, no code path, trivially reverted. P1: cheap, high-confidence fix (H/Strong) for a false-positive in the loop's own safety procedure covering its historically worst failure mode, even though the underlying pause rate is now near-zero -- the SOP still needs to be correct for future regressions.",
  "acs": [
    "AC-1: Given a crew:inspector run that wrote a scaffold artifact via write-review-result --scaffold --status in-progress (per dev-team/agents/inspector.md:41-52) and then paused before the --update ... --status completed call, When the SOP's pause-detection step (Section 1 'Detect the pause') is applied, Then it reads the artifact's status field, finds in-progress, and classifies the run as a pause -- not as a landed artifact.",
    "AC-2: Given a crew:inspector run that completed normally (write-review-result --update <path> --status completed --decision approved), When the SOP's detection step runs against that artifact, Then it classifies the run as completed, not a pause -- no false positive on the happy path.",
    "AC-3: Given the SOP's pre-fix behavior (raw artifact-file existence per :37-41), When walked against a scaffold-only fixture (file exists, status: in-progress), Then the pre-fix procedure would classify it 'artifact landed' (false negative on pause) -- the fixture test asserts the fixed procedure produces the opposite, correct classification.",
    "AC-4: Given the SOP text is updated, When a reader looks for why file-existence alone was insufficient, Then the doc explicitly cites FEAT-161 (dev-team's scaffold-first output contract, 2026-06-13) as the reason the old check false-positives."
  ]
}
```
