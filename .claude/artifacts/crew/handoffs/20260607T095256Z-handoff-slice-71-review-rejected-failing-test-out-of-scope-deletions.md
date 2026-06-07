# Task Handoff: SLICE-71 review: REJECTED — failing test + out-of-scope deletions

- Created: 2026-06-07T09:52:56.633Z
- From: reviewer
- To: lead
- Objective: SLICE-71 is rejected: the builder left a failing test (migrateAdhoc path in loop-installer.test.mts) and made three explicit out-of-scope changes the slice spec forbade (deleted marker-drain.mts, modified auto-dispatch.mts, modified complete-slice.mts).
- Allowed Scope:
  - Independent review of SLICE-71 builder work: verify AC-1 through AC-7
  - run CI gates
  - check scope discipline
- Forbidden Scope: -
- Deliverable: Review result artifact at .claude/artifacts/crew/reviews/20260607T095243Z-review-result-slice-71-delete-one-shot-migrators-loop-installer-caller-cle.md — decision: REJECTED
- Changed Files:
  - .claude/artifacts/crew/reviews/20260607T095243Z-review-result-slice-71-delete-one-shot-migrators-loop-installer-caller-cle.md
- Confidence: high
- Risks: Out-of-scope changes landed in working tree without formal review coverage; npm test gate is currently broken (1 fail)
- Suggested Next Handoff: Send back to builder with two required fixes: (1) handle/delete the migrateAdhoc:true test in loop-installer.test.mts so npm test exits 0; (2) either revert out-of-scope changes to marker-drain/auto-dispatch/complete-slice or open a new slice for them with proper scope

