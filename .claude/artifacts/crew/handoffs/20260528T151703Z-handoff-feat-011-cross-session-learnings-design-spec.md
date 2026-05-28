# Task Handoff: FEAT-011 cross-session learnings design spec

- Created: 2026-05-28T15:17:03.565Z
- From: researcher
- To: lead
- Objective: Design spec for cross-session learnings (FEAT-011): JSONL storage, learnings.mjs API, loop:learn + loop:learnings commands, and slice-start injection — ready for implementer.
- Allowed Scope:
  - Read-only investigation of lessons-feed.mjs
  - telemetry.mjs
  - paths.mjs
  - loop.mjs command registry
  - code-conventions.md
  - FEAT-011.md backlog entry
  - and gstack learn/SKILL.md reference implementation.
- Forbidden Scope: -
- Deliverable: Full feature spec written inline for lead to save at docs/superpowers/specs/2026-05-28-cross-session-learnings-design.md
- Changed Files:
  - docs/superpowers/specs/2026-05-28-cross-session-learnings-design.md (to be written by lead)
- Confidence: high
- Risks: 1) slug collision between worktrees sharing a basename — acceptable for MVP. 2) --limit flag may already exist in FLAG_SPEC — builder must check before adding. 3) Injection touch-point (slice-linker.mjs vs ceremonies.mjs) needs builder confirmation.
- Suggested Next Handoff: Builder: implement tasks 1-7 from the Implementation Plan in the spec, starting with paths.mjs + learnings.mjs, then loop.mjs wiring, then slice-start injection.

