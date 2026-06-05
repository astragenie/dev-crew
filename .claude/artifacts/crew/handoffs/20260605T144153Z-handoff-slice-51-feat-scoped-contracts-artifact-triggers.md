# Task Handoff: SLICE-51: FEAT-scoped contracts artifact triggers

- Created: 2026-06-05T14:41:53.775Z
- From: builder
- To: lead
- Objective: Implements FEAT-050 loop side: helper module getContractsPath/contractsArtifactExists, 5 unit tests passing, canonical architect prompt at commands/contracts-architect-prompt.md, backlog-enrich pass-2 section, slice-from-feature contracts pre-population section, and CLAUDE.md slash-flows entry.
- Allowed Scope:
  - Loop-side trigger paths for FEAT-scoped contracts artifacts: new helper module
  - tests
  - canonical prompt template
  - extensions to backlog-enrich and slice-from-feature slash bodies
  - CLAUDE.md update.
- Forbidden Scope: -
- Deliverable: src/scripts/lib/contracts-artifact.mts + compiled output, src/tests/contracts-artifact.test.mts + compiled output, commands/contracts-architect-prompt.md (new), commands/backlog-enrich.md (pass-2 section + pass-independence + cost note update), commands/slice-from-feature.md (contracts pre-population section), CLAUDE.md (slash-flows list entry)
- Changed Files:
  - src/scripts/lib/contracts-artifact.mts
  - scripts/lib/contracts-artifact.mjs
  - src/tests/contracts-artifact.test.mts
  - tests/contracts-artifact.test.mjs
  - commands/contracts-architect-prompt.md
  - commands/backlog-enrich.md
  - commands/slice-from-feature.md
  - CLAUDE.md
- Confidence: high
- Risks: hero-crew path coupling: if hero-crew renames .claude/artifacts/crew/designs, the CONTRACTS_DIR constant in contracts-artifact.mts breaks — single-line fix by design. Slash bodies are agent-facing markdown docs not executable; their orchestration logic cannot be unit-tested (per DEC-011 and risk-mitigations in plan).
- Suggested Next Handoff: crew:reviewer for SLICE-51 (lint+test evidence above), then crew:validator if reviewer requires it, then loop:slice-complete to close SLICE-51 and move FEAT-050 to done/

