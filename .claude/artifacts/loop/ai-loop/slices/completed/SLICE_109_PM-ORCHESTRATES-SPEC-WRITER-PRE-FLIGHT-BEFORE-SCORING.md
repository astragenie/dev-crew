---
id: SLICE-109
title: "/loop:retriage — opt-in PM pre-flight that dispatches spec-writer before scoring (FEAT-193)"
status: completed
feature: FEAT-193
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-109: `/loop:retriage` opt-in PM pre-flight (FEAT-193)

Closes FEAT-193. Adds a NEW slash command `/loop:retriage` that dispatches PM with an AC-clarity-gate pre-flight (PM dispatches spec-writer when vague, waits, re-reads, scores). Original `/loop:triage` UNCHANGED.

## Objective

Operator-facing: `/loop:retriage` produces higher-quality PM scores by forcing AC normalization before scoring. Use it on FEATs known to have vague AC (e.g., backlog-add from external draft, FEATs flagged "needs-review" in earlier passes).

## In scope

- New `commands/retriage.md` slash command file. Frontmatter `description:` documents the pre-flight semantics. Body documents the 7-step flow (read FEAT → check AC → dispatch spec-writer if vague → wait → re-read → score → emit).
- The slash command body prepends an explicit AC-clarity-gate instruction block to the PM dispatch prompt — PM agent itself is NOT modified. Original `loop:pm` agent reads the new block and follows the gate.
- New test `src/tests/retriage-command.test.mts` — pins file presence + intent: frontmatter description mentions the pre-flight, body documents the 7-step flow + spec-writer dispatch + AC-clarity gate + failure-escalation rule.
- `CLAUDE.md` § Backlog discipline mentions `/loop:retriage` as the higher-quality opt-in for FEATs with vague AC.
- `CHANGELOG.md` [Unreleased] entry.

## Out of scope

- Modifying `agents/pm.md` directly (pre-flight is in the SLASH COMMAND prompt only; PM contract unchanged).
- Modifying `/loop:triage` (untouched).
- Modifying `/loop:intake` (untouched — Phase 1 keeps using `/loop:triage` contract).
- Renaming to `/loop:triage2` (decision: `/loop:retriage` is clearer).
- Future: bake the pre-flight into the default `/loop:triage` (separate FEAT after we measure cost vs. quality improvement).

## Acceptance criteria

- [ ] AC-1: All tests pass + lint clean + tsc clean.
- [ ] AC-2 (file exists with frontmatter): `commands/retriage.md` exists. `description:` mentions "AC clarity" or "spec-writer pre-flight" and references PM scoring. Test: `commands/retriage.md exists with non-empty pre-flight description`.
- [ ] AC-3 (7-step flow documented): body contains a numbered or explicit list covering: (1) list pending FEATs, (2) for each FEAT: dispatch PM, (3) PM reads body, (4) PM checks AC clarity, (5) PM dispatches `loop:spec-writer` when vague, (6) PM waits + re-reads, (7) PM scores. Test: anchors on "AC clarity" + "loop:spec-writer" + "re-read" + "score" keyword presence.
- [ ] AC-4 (failure escalation documented): body states that spec-writer dispatch failure forces `composite_priority: "needs-review"` + an explanation in `scopeNotes`. Test: anchors on `needs-review` + escalation language.
- [ ] AC-5 (back-compat reference): body cites `/loop:triage` as the unchanged legacy/cheap path. Test: anchors on `/loop:triage` reference.
- [ ] AC-6 (CLAUDE.md mention): § Backlog discipline lists `/loop:retriage` as an opt-in higher-quality alternative.
- [ ] AC-7 (CHANGELOG): [Unreleased] entry documents the new command.

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc` clean.
- Final-synthesis artifact written.
- FEAT-193 moves to `done/`.

## Reviewer ladder

- Reviewer A (correctness): verify `commands/retriage.md` uses the SAME PM dispatch contract as `/loop:triage` — just with the pre-flight instruction PREPENDED to the prompt; PM agent file should NOT be edited.
- Reviewer B (production-readiness): verify the description string is operator-readable (no jargon); verify CLAUDE.md cross-reference doesn't drift from the command's actual semantics.
