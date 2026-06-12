---
id: SLICE-111
title: Grant PM Agent tool + restrict prompt scope (FEAT-195)
status: completed
feature: FEAT-195
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
completed_at: 2026-06-12
---
# SLICE-111: PM gets Agent tool, prompt restricts dispatch scope (FEAT-195)

Closes FEAT-195. Mechanical: add `Agent` to PM frontmatter tools, update description string, add prompt-discipline rule restricting dispatch scope, add tests.

## In scope

- `agents/pm.md` frontmatter:
  - `tools:` adds `- Agent`.
  - `description:` drops "Read-only — no code edits" and replaces with "Read-only on disk; dispatches loop:spec-writer when AC need normalization under the /loop:retriage gate".
- `agents/pm.md` body: add explicit prompt-discipline rule (above or near "Sub-agents you may dispatch" section) — "You MAY dispatch ONLY `loop:spec-writer` under the retriage gate. Any other Agent dispatch is a discipline violation and SHOULD NOT occur in normal triage flow."
- New test `src/tests/pm-agent-tool.test.mts` — grep `agents/pm.md` for `Agent` in tools list + updated description string + prompt-discipline rule.
- CHANGELOG [Unreleased] entry.

## Out of scope

- Two-phase PM↔spec-writer restructuring.
- Granting Write/Edit to PM.
- Re-running sample retriage in this slice (followup; documented as manual verification).

## Acceptance criteria

- [ ] AC-1: All tests + lint + tsc clean.
- [ ] AC-2 (Agent in tools): `agents/pm.md` frontmatter `tools` list includes `Agent`. Test asserts.
- [ ] AC-3 (description updated): description no longer claims "Read-only — no code edits". Mentions dispatching loop:spec-writer.
- [ ] AC-4 (prompt restriction): body contains an explicit rule restricting PM's Agent dispatch to loop:spec-writer under the retriage gate.
- [ ] AC-5 (back-compat): existing PM-related tests stay green.

## Done When

- AC PASS. bun test green. lint + tsc clean. CHANGELOG entry. FEAT-195 done.

## Reviewer ladder

- Reviewer A: verify `Agent` is in PM tools allowlist (not just mentioned in prose); verify description no longer says read-only.
- Reviewer B: verify the prompt-discipline rule is unambiguous about which subagent PM may dispatch and when.
