---
id: SLICE-112
title: PM ToolSearch step in dispatch-discipline section (FEAT-196)
status: completed
feature: FEAT-196
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-112: PM ToolSearch step (FEAT-196)

Closes FEAT-196. Two-line add to `agents/pm.md` body.

## In scope

- `agents/pm.md` body — dispatch-discipline section gets a ToolSearch step.
- Test: 1 assertion that body contains `ToolSearch` + `select:Agent`.
- CHANGELOG entry.

## Acceptance criteria

- [ ] AC-1: tests + lint + tsc clean.
- [ ] AC-2: body contains ToolSearch instruction with `select:Agent` query.

## Done When

- AC PASS. bun test green. CHANGELOG entry. FEAT-196 done.
