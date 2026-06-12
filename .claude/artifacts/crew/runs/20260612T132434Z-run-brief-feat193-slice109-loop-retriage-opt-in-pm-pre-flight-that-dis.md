---
feature: FEAT-193
status: active
---
# Run Brief: FEAT193 SLICE109: /loop:retriage — opt-in PM pre-flight that dispatches spec-writer before scoring (FEAT-193)

- Created: 2026-06-12T13:24:34.990Z
- Tier: full
- Goal: Operator-facing: `/loop:retriage` produces higher-quality PM scores by forcing AC normalization before scoring. Use it on FEATs known to have vague AC (e.g., backlog-add from external draft, FEATs flagged "needs-review" in earlier passes).
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `commands/retriage.md` slash command file. Frontmatter `description:` documents the pre-flight semantics. Body documents the 7-step flow (read FEAT → check AC → dispatch spec-writer if vague → wait → re-read → score → emit).
- The slash command body prepends an explicit AC-clarity-gate instruction block to the PM dispatch prompt — PM agent itself is NOT modified. Original `loop:pm` agent reads the new block and follows the gate.
- New test `src/tests/retriage-command.test.mts` — pins file presence + intent: frontmatter description mentions the pre-flight
  - body documents the 7-step flow + spec-writer dispatch + AC-clarity gate + failure-escalation rule.
- `CLAUDE.md` § Backlog discipline mentions `/loop:retriage` as the higher-quality opt-in for FEATs with vague AC.
- `CHANGELOG.md` [
- Out Of Scope:
  - - Modifying `agents/pm.md` directly (pre-flight is in the SLASH COMMAND prompt only; PM contract unchanged).
- Modifying `/loop:triage` (untouched).
- Modifying `/loop:intake` (untouched — Phase 1 keeps using `/loop:triage` contract).
- Renaming to `/loop:triage2` (decision: `/loop:retriage` is clearer).
- Future: bake the pre-flight into the default `/loop:triage` (separate FEAT after we measure
- Planned Files: -
- Next Step: Begin implementation

