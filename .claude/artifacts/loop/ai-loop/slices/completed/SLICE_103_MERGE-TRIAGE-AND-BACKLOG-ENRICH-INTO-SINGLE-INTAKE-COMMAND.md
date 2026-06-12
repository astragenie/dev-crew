---
id: SLICE-103
title: Intake slash command merges triage + enrich (FEAT-189)
status: completed
feature: FEAT-189
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-103: `/loop:intake` slash command (FEAT-189)

Closes FEAT-189. Adds `commands/intake.md` — new slash command that orchestrates two phases in one invocation: (1) `/loop:triage` PM scoring, (2) classify newly-triaged FEATs via `loop:architect` dispatch. Existing two commands unchanged.

## In scope

- `commands/intake.md` (new). Frontmatter with `description:`. Body documents the two-phase orchestration, halt-on-PM-error semantics, decline filter for `composite_priority: "P4"`, and back-compat note pointing at the legacy commands.
- `CLAUDE.md` — one-line update under § Backlog discipline mentioning `/loop:intake` as the recommended default.
- `src/tests/intake-command.test.mts` (new) — verifies `commands/intake.md` exists, has valid frontmatter `description:`, mentions both phases, mentions the decline filter, and mentions the legacy command names for back-compat.

## Out of scope

- Refactoring the `loop:triage` skill to embed architect.
- A `loop:intake` CLI subcommand. Slash flows are agent-interpreted; CLI is not the surface here.
- Deprecating the legacy commands.

## Acceptance criteria

- [ ] AC-1: All tests pass + lint clean + tsc clean.
- [ ] AC-2 (file exists with frontmatter): `commands/intake.md` exists. Frontmatter has a non-empty `description:` that mentions both phases ("PM" or "triage" AND "architect" or "enrich"). Test `commands/intake.md exists with frontmatter`.
- [ ] AC-3 (phase ordering documented): body MUST contain (case-insensitive): "PM phase" AND "architect phase" AND a sentence enforcing PM-must-complete-before-architect. Test `intake.md documents phase ordering`.
- [ ] AC-4 (decline filter documented): body mentions `composite_priority` and the literal string `"P4"` (declined FEATs skipped from architect dispatch). Test `intake.md documents decline filter`.
- [ ] AC-5 (back-compat reference): body cites both `commands/triage.md` and `commands/backlog-enrich.md` (or `/loop:triage` and `/loop:backlog-enrich`) as the legacy split path. Test `intake.md references legacy commands`.
- [ ] AC-6: CLAUDE.md mentions `/loop:intake` in the Backlog discipline section.

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc` clean (both configs).
- CHANGELOG entry under [Unreleased] noting `/loop:intake`.
- Final-synthesis artifact written.
- FEAT-189 moves to `done/`.

## Reviewer ladder

- Reviewer A (correctness): verify the test pins intent-level content (anchors on phase names, decline filter language) so future copyedits don't false-fail; verify CLAUDE.md edit doesn't break existing references.
- Reviewer B (production-readiness): verify `commands/intake.md` description string is operator-readable (no jargon), so it surfaces correctly in `/help` output; verify no broken cross-references.
