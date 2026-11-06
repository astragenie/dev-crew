---
id: SLICE-50
title: Implement FEAT-025
status: pending
feature: FEAT-025
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-50: Implement FEAT-025

Implements FEAT-025. See [feature file](../../../backlog/in-progress/FEAT-025.md) for product context.

## Objective

Audit T9: telemetry honesty for cost reports, pricing, grades, and bundle-safe data files

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given zero sessions scanned, or a 30-hour window, or a repeated `run_id`, When `emitCostReport` runs, Then nothing is written and a `reason` is set.
- [ ] AC-2: Given `priceFor("claude-fable-5-1")`, Then `matched` equals `"claude-fable-5-1"`; given `priceFor("claude-sonnet-5")`, Then `"claude-sonnet-5"`; given `priceFor("claude-haiku-4-5-20251001")`, Then `"claude-haiku-4-5"`; given `priceFor("claude-opus-9")`, Then `matched` is `null`, `unpriced_models` contains it, and the cost-advisor verdict is `unknown`.
- [ ] AC-3: Given `pricing.json` copied under a temp directory whose path contains a space with `PRICING_PATH` pointing at it, Then it loads; given no `PRICING_PATH`, Then the inlined table is used with no filesystem read.
- [ ] AC-4: Given a grade file still containing the literal token `<fill title>`, When the grade writer runs, Then it exits `2` with `"grade template unfilled"`.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-025 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
