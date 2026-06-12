---
id: SLICE-113
title: Add ToolSearch to PM tools list (FEAT-198)
status: completed
feature: FEAT-198
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-113: Add ToolSearch to PM tools list (FEAT-198)

Closes FEAT-198. One-line frontmatter addition.

## In scope

- `agents/pm.md` frontmatter `tools` list adds `- ToolSearch`.
- Test asserts both `Agent` AND `ToolSearch` in tools list.
- CHANGELOG.

## Acceptance criteria

- [ ] AC-1: tests + lint + tsc clean.
- [ ] AC-2: frontmatter tools includes Agent + ToolSearch.

## Done When

- AC PASS. bun test green. CHANGELOG. FEAT-198 done.
