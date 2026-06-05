---
id: FEAT-050
status: pending
priority: P1
category: feature
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
---
## Context

`/crew:orchestrate-slice` Step 1 currently dispatches `crew:architect` for every slice that has `needs_contract: true`, creating or extending `.claude/artifacts/crew/designs/\<FEAT\>-contracts.md`. That's one architect dispatch per slice, even though the contract artifact is usually FEAT-scoped, not slice-scoped.

User intent: contracts should already exist by the time SLICE-1 starts. Architect runs ONCE at FEAT promotion / first slice creation, populates the contracts artifact, and downstream slices just consume it (no architect re-dispatch unless a contract revision is needed).

## Acceptance criteria

- [ ] When `/loop:slice-from-feature --id FEAT-NNN` runs for the FIRST slice of a FEAT, dispatch `crew:architect` if `.claude/artifacts/crew/designs/FEAT-NNN-contracts.md` is missing
- [ ] Architect prompt receives FEAT body + tags + acceptance criteria, writes the four-section contracts artifact (TypeScript Interfaces / API Contracts / Event Schemas / Data Contracts)
- [ ] `/crew:orchestrate-slice` Step 1 becomes a NO-OP when the contracts artifact already exists AND the slice does NOT require a revision (heuristic: no new public surface in slice ACs)
- [ ] When a slice genuinely introduces new surface, architect is re-dispatched to write a `## Revision — SLICE-NN` subsection only (already supported in current command)
- [ ] Test: simulate two slices on same FEAT; architect runs once at slice 1, skipped at slice 2

## Related

- DEC-010 (existing) — orchestrate-slice version gate
- FEAT-048 — architect classification tags
- This unblocks parallel uxdesigner + builder (see sibling FEAT)