# Task Handoff: FEAT-014 design spec: evidence-before-claims gate

- Created: 2026-05-28T15:19:46.861Z
- From: researcher
- To: lead
- Objective: Design spec for FEAT-014 written to docs/superpowers/specs/2026-05-28-evidence-before-claims-gate-design.md -- covers goal, Iron Law block, 10-row evidence table, layer model integrating with validation-gate.mjs, and single implementation task.
- Allowed Scope:
  - Read-only research: CLAUDE.md
  - docs/code-conventions.md
  - FEAT-014.md
  - scripts/lib/validation-gate.mjs
  - superpowers upstream SKILL.md
  - .claude/loop/rules.md
  - existing skill files
  - competitor brief; write spec file only.
- Forbidden Scope: -
- Deliverable: docs/superpowers/specs/2026-05-28-evidence-before-claims-gate-design.md
- Changed Files:
  - docs/superpowers/specs/2026-05-28-evidence-before-claims-gate-design.md
- Confidence: high
- Risks: FEAT-013 (Iron Law tag convention) is not yet implemented; the spec references IRON-LAW tag format as if it is an established convention. If FEAT-013 ships with a different tag name or format, the spec's Iron Law Block section needs a one-line update. No other risks.
- Suggested Next Handoff: Builder slice: create skills/verification-before-completion/SKILL.md using the spec as a direct copy guide. Wiring (loop:start mandatory reading, CLAUDE.md update) is a separate follow-on slice.

