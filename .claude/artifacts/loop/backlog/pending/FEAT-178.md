---
id: FEAT-178
status: pending
priority: null
category: feature
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
---
# FEAT-178: Promotion ratchet for grade lessons — promote-or-archive gate at slice close

Adopt the AgentOps promotion ratchet (C:/work/mega/agentops, docs/architecture/operating-loop.md): a learning is only durable if it climbs a ladder — noticed once -> dies with the handoff; repeated twice -> promoted to a learnings store entry; changes future behavior -> becomes a planning rule injected at dispatch; must-never-regress -> becomes a validation/stop gate. Today grade lessons/surprises/followups are write-only: nothing forces them to change behavior, and weak dimensions (e.g. product_completeness) persist across slices.

## Acceptance hints
- New subcommand `loop lessons promote` (or extension of slice grade-write): scans recent grades' lessons + learnings.jsonl, detects repeats (slug/similarity), and forces a disposition per repeated lesson: promote to planning-rule | promote to gate | archive with reason.
- Planning rules store (e.g. .claude/artifacts/loop/planning-rules/*.md) injected into slice-start dispatchInstruction context.
- Slice Close Ceremony HARD RULE gains step: ratchet check runs after grade-write; unpromoted repeated lessons block with a warn (advisory in marathon mode).
- Idempotent; covered by unit tests like grade-writer.