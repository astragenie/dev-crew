---
feature: FEAT-033
---
# Run Brief: FEAT033 SLICE46: Implement FEAT-033

- Created: 2026-11-06T02:44:12.087Z
- Tier: full
- Goal: Audit T0b: plugin hooks never load — move hooks.json to the documented discovery path
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - bullet 1
- bullet 2
- Out Of Scope:
  - - bullet 1
- Planned Files: -
- Next Step: Begin implementation


## Inline fixups (lead)

- 2026-11-06T02:56:54Z — `src/tests/bootstrap-context.test.mts:10` repointed to `hooks/hooks.json` after reviewer B found ENOENT (gate 41). Full root suite 3448 pass / 0 fail. Commit 96722039.
