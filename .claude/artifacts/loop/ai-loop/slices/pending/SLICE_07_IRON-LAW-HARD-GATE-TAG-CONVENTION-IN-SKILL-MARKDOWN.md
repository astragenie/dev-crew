---
id: SLICE-07
status: pending
feature: FEAT-013
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-05-28
updated: 2026-05-28
---
# SLICE-07: Iron Law hard-gate tag convention in skill Markdown

Implements FEAT-013. See [feature file](../../../backlog/in-progress/FEAT-013.md) for product context.

## Objective

Wrap every non-negotiable behavioral rule in loop skill Markdown files with `<HARD-GATE>` XML tags, matching the superpowers convention that makes violations self-documenting and explicit to the model.

## Files

- `skills/loop-discipline/SKILL.md` — wrap Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate, Disallowed Stop Reasons blocks
- `skills/authoring-slices/SKILL.md` — wrap the mandatory slice template checklist
- `docs/code-conventions.md` — add `<HARD-GATE>` convention entry (one paragraph)

## In scope

- Add `<HARD-GATE>` XML wrapper around every block that is a hard behavioral constraint (non-negotiable, agent must not deviate)
- Add `<EXTREMELY-IMPORTANT>` wrapper for critical warnings that are not absolute blocks but have high severity
- Pure Markdown edits — no runtime code, no test changes

## Out of scope

- Changing the rule wording itself
- Adding tags to crew plugin skills (separate repo)
- New skills or commands

## Acceptance criteria

- [ ] AC-1: `skills/loop-discipline/SKILL.md` wraps the three hard rules and Disallowed Stop Reasons in `<HARD-GATE>...</HARD-GATE>` tags
- [ ] AC-2: `skills/authoring-slices/SKILL.md` wraps the "Every slice file MUST have" checklist in `<HARD-GATE>...</HARD-GATE>`
- [ ] AC-3: `docs/code-conventions.md` has a `## HARD-GATE tag convention` section explaining when to use `<HARD-GATE>` vs `<EXTREMELY-IMPORTANT>` (≥3 sentences)
- [ ] AC-4: `npm test` still reports 427 passing (no regressions)
- [ ] AC-5: `npm run lint` clean

## Done When

- all acceptance criteria PASS with evidence
- `requires_validation: false` — pure Markdown convention, no runtime behavior to exercise
- feature FEAT-013 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: A
- Reviewer B: B
