---
id: SLICE-110
title: Add --include-triaged flag to triage + retriage (FEAT-194)
status: completed
feature: FEAT-194
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-110: --include-triaged flag (FEAT-194)

Closes FEAT-194. Mechanical change across lib + CLI + 2 slash command docs + 1 skill doc + tests.

## In scope

- `src/scripts/lib/backlog-list-ids.mts`: `listPendingFeatureIds(repo, opts?: { includeTriaged?: boolean })`. Default false.
- `src/scripts/loop.mts::runBacklogListPendingIds`: read `--include-triaged` flag.
- FLAG_SPEC adds `"--include-triaged"`.
- `commands/triage.md` + `commands/retriage.md` + `skills/triage/SKILL.md` document the flag.
- Tests: new + appended.

## Out of scope

- Renaming the CLI subcommand.
- Selective re-score by id.

## Acceptance criteria

- [ ] AC-1: All tests + lint + tsc clean.
- [ ] AC-2 (lib): default = pending-only; flag=true = pending + triaged.
- [ ] AC-3 (CLI): spawnSync `backlog list-pending-ids --include-triaged` returns merged ids.
- [ ] AC-4 (commands): both slash command files document the flag + overwrite semantics.
- [ ] AC-5 (skill): SKILL.md mentions flag passthrough.
- [ ] AC-6 (back-compat): existing usages stay green.

## Done When

- All AC PASS + bun test green + lint clean + tsc clean.
- CHANGELOG entry.
- FEAT-194 done.

## Reviewer ladder

- Reviewer A: back-compat default behavior + merge proven by test.
- Reviewer B: operator-readable docs + explicit overwrite-on-triaged statement.
