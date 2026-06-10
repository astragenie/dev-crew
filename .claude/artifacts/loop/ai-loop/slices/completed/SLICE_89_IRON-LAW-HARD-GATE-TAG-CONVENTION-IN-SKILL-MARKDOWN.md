---
id: SLICE-89
title: Iron Law hard-gate tag convention in skill Markdown
status: completed
feature: FEAT-088
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-10
updated: 2026-06-10
completed_at: 2026-06-10
---
# SLICE-89: Iron Law hard-gate tag convention in skill Markdown

Implements FEAT-088. See [feature file](../../../backlog/in-progress/FEAT-088.md) for product context.

## Objective

Adopt the superpowers-style `<HARD-GATE>` / `<EXTREMELY-IMPORTANT>` XML tag
convention across owned skill Markdown so enforcement severity is explicit and
self-documenting. The convention itself and the bulk retrofit already shipped
under SLICE-07 (`docs/code-conventions.md` § "HARD-GATE tag convention" +
`authoring-slices`, `loop-discipline`) and SLICE-09
(`verification-before-completion`). This slice closes FEAT-088 by extending the
convention to the remaining prominent prose gate — `systematic-debugging`'s
Iron Law — reaching the FEAT's "3–5 files" target.

## In scope

- Wrap the `systematic-debugging` SKILL.md Iron Law block
  ("NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST") in `<HARD-GATE>` tags
  per `docs/code-conventions.md`.
- Confirm the convention is documented and ≥3 owned SKILL.md files already
  carry the XML tags (acceptance evidence for FEAT-088).

## Out of scope

- Retrofitting skills whose only "HARD RULE" mention is a prose reference to a
  CLAUDE.md rule (e.g. `triage`) — no standalone gate block to wrap.
- Any runtime/behavioral change. Doc-only.
- A new validator for the tags (content-length cap already enforces line caps).

## Acceptance criteria

- [ ] AC-1: Test suite passes (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`)
- [ ] AC-2: `docs/code-conventions.md` defines the `<HARD-GATE>` / `<EXTREMELY-IMPORTANT>` convention (already present — cite line range as evidence)
- [ ] AC-3: At least 4 owned `skills/**/SKILL.md` files carry `<HARD-GATE>` or `<EXTREMELY-IMPORTANT>` tags, including `systematic-debugging` newly retrofitted this slice (before/after diff)
- [ ] AC-4: `bun ./src/scripts/validate-content-length.mts` passes — no SKILL.md exceeds the 200-line cap after the edit

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-088 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A (correctness): tags wrap the correct block; severity choice (HARD-GATE vs EXTREMELY-IMPORTANT) matches the convention; no broken Markdown.
- Reviewer B (conventions/content-length): SKILL.md stays under 200-line cap; tag usage consistent with the 3 prior-tagged skills; doc-only, no runtime impact.
