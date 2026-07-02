# PM review: FEAT-209 (2026-07-02)

```json
{
  "featureId": "FEAT-209",
  "scores": {
    "customer_impact": 0.7,
    "effort_estimate": 0.42,
    "strategic_alignment": 0.7,
    "technical_risk": 0.65,
    "dependency_depth": 0.35
  },
  "compositePriority": "P1",
  "autonomousSafe": false,
  "demandEvidence": "I independently confirmed the exact code path cited: dev-team/scripts/lib/workflow-state.ts:122-124 reads JSON.parse(workflowText) as WorkflowState with the comment 'State file is always written by this module; shape is trusted' (no WorkflowStateSchema.parse call). I confirmed dev-team/scripts/lib/schemas.ts:69-76's WorkflowStateSchema has fields version, updatedAt, currentRun, recentRuns -- no schemaVersion field exists today, matching the FEAT's proposal that it's a genuinely additive field. Retrospective Section 0 (H/Strong): the 2026-06-10 incident's only record is the reconcileNote field inside the live state file itself -- a real, previously-occurred incident, not hypothetical.",
  "scopeNotes": "Smallest deliverable, loop-side only: refuse cross-plugin session-pin writes when schemaVersion mismatches, treating absent field as implicit v1 (matches ADR-D's migration note). The crew-side load-time validation is explicitly out of this repo's control per the FEAT body ('file upstream-request') -- I cannot make that half autonomous_safe from here. Overlap: none with FEAT-204/205/206/207/208 (different subsystem: cross-plugin state contract, not telemetry/docs). Effort calibration: no exact cost analog for a schema-versioning guard in this repo's cost-report history; scored at 0.42 (5 points) reflecting the additive-field-plus-cross-plugin-coordination scope, one band above the 'pure docs/telemetry' FEATs in this batch.",
  "risks": [
    "It is two weeks later and this slice failed review: the loop-side schemaVersion guard ships clean, but the crew-side validation (the other half of ADR-D, the actual fix for the raw JSON.parse) never lands because it requires an upstream-request against a separate repo -- reviewers approve the loop-side slice believing ADR-D is 'done' when the silent-corruption class it targets remains open in workflow-state.ts.",
    "Rollback: for the loop-side additive field/guard, revert-only. But cross-plugin state means a git revert in THIS repo does not undo any schemaVersion value already written into workflow-state.json in the sibling dev-team working tree -- rollback may require manually resetting that file in dev-team, not just reverting the loop-side commit.",
    "Coverage gap: no existing test reproduces the 2026-06-10 incident class (malformed/partial workflow-state.json under concurrent write) -- the only record of that incident is the reconcileNote field inside the live state file itself (retrospective Section 0), so there is zero regression-test evidence today that a similar corruption would be caught rather than silently reprocessed."
  ],
  "reasoning": "Technical risk band 0.6-0.8: schema/data-shape change (new schemaVersion field) on a file that is a documented cross-plugin write contract (DEC-018/019) shared with another plugin's runtime -- rollback needs coordination across two repos, not a bare revert. P1 with review (autonomousSafe: false) matching the retrospective stub's own annotation: real prior incident, but full ADR-D completion depends on an out-of-repo upstream change I cannot verify or gate here.",
  "acs": [
    "AC-1: Given a crew workflow-state.json file with no schemaVersion field (the current shape -- dev-team/scripts/lib/schemas.ts:69-76's WorkflowStateSchema has no schemaVersion key today), When loop's session-pin writer reads it, Then it treats the file as implicitly schemaVersion: 1 and proceeds without refusal.",
    "AC-2: Given a workflow-state.json file whose schemaVersion is greater than the version loop's writer supports, When loop attempts to write a session pin into it, Then the write is refused with a named error identifying the version mismatch, not a silent overwrite.",
    "AC-3: Given a malformed or partially-written workflow-state.json reproducing the class of corruption behind the 2026-06-10 session-hang rebuild, When loop's write path is invoked, Then it fails loud with a repair hint instead of the current JSON.parse(...) as WorkflowState pattern (workflow-state.ts:122-124) silently producing an invalid in-memory object.",
    "AC-4: Given this FEAT's loop-side guard ships, When a reviewer checks scope, Then the FEAT body/PR explicitly notes the crew-side counterpart (validating WorkflowStateSchema at loadWorkflowState, workflow-state.ts:117-137) is filed as a separate upstream-request against dev-team, not silently assumed done."
  ]
}
```
