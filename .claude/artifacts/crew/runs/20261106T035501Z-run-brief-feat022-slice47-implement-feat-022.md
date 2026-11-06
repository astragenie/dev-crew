---
feature: FEAT-022
---
# Run Brief: FEAT022 SLICE47: Implement FEAT-022

- Created: 2026-11-06T03:55:01.802Z
- Tier: full
- Goal: Audit T1: consumer-install smoke test for every shipped hook/CLI entry (red first)
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

- Review A MEDIUM (temp-dir leak) + LOW (dead prepush fixture) -> crew:dev-lite commit 02d86779: ConsumerStage carries baseDir, afterAll removes every staged copy (0 dirs before/after a run), fixtureForHookEvent routes pre-push by file basename.
- Verifier docs gap -> lead commit e9bcdf29: gate-41 designed-red exception recorded in docs/ci-gates.md + docs/memory.md; README metrics band regenerated after the wave-1 closes.
