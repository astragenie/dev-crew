---
kind: handoff
objective: Slice SLICE-123 complete — grade + start next slice
owner: parent-loop
slice: SLICE-123
feature: FEAT-102
phase: null
created_at: 2026-06-13
confidence: high
next_handoff: grade-and-continue
---
# Handoff — SLICE-123 complete
**Feature:** FEAT-102 · **Slice:** SLICE-123
## Objective
Slice SLICE-123 closed with acceptance criteria PASS. Capture lessons + decisions via grading, then resume Cross-Slice Continuation.
## Allowed scope
- Run `/loop:slice grade --id SLICE-123` to draft grade file.
- Edit `.claude/artifacts/loop/grades/SLICE-123-grade.md` (scores, lessons, decisions, narrative).
- Run `/loop:slice grade-write --id SLICE-123` to extract decisions + emit telemetry.
- Pick next slice via Cross-Slice Continuation HARD RULE.
## Forbidden scope
- Starting next slice before grade is written (loses self-improvement signal).
## Deliverable
- `.claude/artifacts/loop/grades/SLICE-123-grade.md` populated + grade-write'd
- Any extracted `.claude/artifacts/loop/decisions/DEC-NNN.md` files
## Changed files / evidence
- slice file (completed): `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_123_LINEAR-TEAMMATE-FLOW-ASSIGN-TO-CREW.md`
- feature file (done): `.claude/artifacts/loop/backlog/done/FEAT-102.md`
## Confidence
High — slice + feature moves atomic; spec reconciliation idempotent.
## Risks or open questions
- Grading skipped → no retrospective signal for this slice.
## Suggested next handoff
After grade-write, lead picks next slice + opens new builder handoff.