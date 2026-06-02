---
phase: "2"
feature: FEAT-006
---
# Run Brief: PHASE2 FEAT006 SLICE10

- Created: 2026-06-02T14:08:07.341Z
- Goal: Ship slice-plan pre-flight primitive (research pass + plan artifact writer); SLICE-A of FEAT-006 Plan Mode; no gate behavior
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New CLI handler `slice plan` in `scripts/loop.mjs` (and `src/scripts/loop.mts`) — wires to new `scripts/lib/slice-plan.mjs` module.
- New `scripts/lib/slice-plan.mjs` (+ `src/scripts/lib/slice-plan.mts` source):
  - `runPlanPreflight(repoPath
  - sliceId)` — reads slice file
  - extracts in-scope file globs from frontmatter or body
  - runs a structured codebase research pass (grep symbols
  - glob related modules
  - read their first 50 lines)
  - writes `.claude/artifacts/loop/plans/<TS>-plan-<sliceId>.md` with sections: Context
  - Files researched
  - Open questions
  - Proposed approach.
- New slash command `commands/slice-plan.md` (mirrors existing slice-* commands).
- Unit tests in `src/tests/slice-plan.test.mts` (compiled to `tests/slice-plan.test.mjs`):
  - returns plan artifact path
  - plan artifact con
- Out Of Scope:
  - - Approval gate / AskUserQuestion wiring (SLICE-B of this FEAT)
- Conditional behavior keyed on autonomous_safe (SLICE-B)
- Plan-vs-implementation drift detection (separate FEAT)
- Workspace plan sharing across repos (defer to FEAT-024 task-store)
- Integration with `slice start` ceremony (SLICE-B will wire it in)
- Touching ceremony hooks; this slice ships pure new surface area
- Planned Files: -
- Next Step: Begin implementation

