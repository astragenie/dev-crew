---
feature: FEAT-189
status: active
---
# Run Brief: FEAT189 SLICE103: Intake slash command merges triage + enrich (FEAT-189)

- Created: 2026-06-12T10:46:44.953Z
- Tier: full
- Goal: -
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `commands/intake.md` (new). Frontmatter with `description:`. Body documents the two-phase orchestration
  - halt-on-PM-error semantics
  - decline filter for `composite_priority: "P4"`
  - and back-compat note pointing at the legacy commands.
- `CLAUDE.md` — one-line update under § Backlog discipline mentioning `/loop:intake` as the recommended default.
- `src/tests/intake-command.test.mts` (new) — verifies `commands/intake.md` exists
  - has valid frontmatter `description:`
  - mentions both phases
  - mentions the decline filter
  - and mentions the legacy command names for back-compat.
- Out Of Scope:
  - - Refactoring the `loop:triage` skill to embed architect.
- A `loop:intake` CLI subcommand. Slash flows are agent-interpreted; CLI is not the surface here.
- Deprecating the legacy commands.
- Planned Files: -
- Next Step: Begin implementation

