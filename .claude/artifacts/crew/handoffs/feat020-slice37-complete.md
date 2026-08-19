---
kind: handoff
objective: Slice SLICE-37 complete — grade + start next slice
owner: parent-loop
slice: SLICE-37
feature: FEAT-020
phase: null
created_at: 2026-08-19
confidence: high
next_handoff: grade-and-continue
---
# Handoff — SLICE-37 complete
**Feature:** FEAT-020 · **Slice:** SLICE-37
## Objective
Slice SLICE-37 closed with acceptance criteria PASS. Capture lessons + decisions via grading, then resume Cross-Slice Continuation.
## Allowed scope
- Run `/devcrew:slice grade --id SLICE-37` to draft grade file.
- Edit `.claude/artifacts/loop/grades/SLICE-37-grade.md` (scores, lessons, decisions, narrative).
- Run `/devcrew:slice grade-write --id SLICE-37` to extract decisions + emit telemetry.
- Pick next slice via Cross-Slice Continuation HARD RULE.
## Forbidden scope
- Starting next slice before grade is written (loses self-improvement signal).
## Deliverable
- `.claude/artifacts/loop/grades/SLICE-37-grade.md` populated + grade-write'd
- Any extracted `.claude/artifacts/loop/decisions/DEC-NNN.md` files
## Changed files / evidence
- slice file (completed): `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_37_IMPLEMENT-FEAT-020.md`
- feature file (done): `.claude/artifacts/loop/backlog/done/FEAT-020.md`
## Confidence
High — slice + feature moves atomic; spec reconciliation idempotent.
## Risks or open questions
- Grading skipped → no retrospective signal for this slice.
## Suggested next handoff
After grade-write, lead picks next slice + opens new builder handoff.