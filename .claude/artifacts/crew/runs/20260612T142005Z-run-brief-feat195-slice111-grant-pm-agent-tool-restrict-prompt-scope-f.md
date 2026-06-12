---
feature: FEAT-195
status: active
---
# Run Brief: FEAT195 SLICE111: Grant PM Agent tool + restrict prompt scope (FEAT-195)

- Created: 2026-06-12T14:20:05.171Z
- Tier: full
- Goal: -
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `agents/pm.md` frontmatter:
  - `tools:` adds `- Agent`.
  - `description:` drops "Read-only — no code edits" and replaces with "Read-only on disk; dispatches loop:spec-writer when AC need normalization under the /loop:retriage gate".
- `agents/pm.md` body: add explicit prompt-discipline rule (above or near "Sub-agents you may dispatch" section) — "You MAY dispatch ONLY `loop:spec-writer` under the retriage gate. Any other Agent dispatch is a discipline violation and SHOULD NOT occur in normal triage flow."
- New test `src/tests/pm-agent-tool.test.mts` — grep `agents/pm.md` for `Agent` in tools list + updated description string + prompt-discipline rule.
- CHANGELOG [Unreleased] entry.
- Out Of Scope:
  - - Two-phase PM↔spec-writer restructuring.
- Granting Write/Edit to PM.
- Re-running sample retriage in this slice (followup; documented as manual verification).
- Planned Files: -
- Next Step: Begin implementation

