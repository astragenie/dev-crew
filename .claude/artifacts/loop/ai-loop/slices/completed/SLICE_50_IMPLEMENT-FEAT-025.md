---
id: SLICE-50
title: Implement FEAT-025
status: completed
feature: FEAT-025
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
badges: [serial-reviewer-warning]
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

- [x] AC-1: Given zero sessions scanned, or a 30-hour window, or a repeated `run_id`, When `emitCostReport` runs, Then nothing is written and a `reason` is set. Evidence: the three guards + run_id live in `crew/scripts/lib/cost-hygiene/cost-report-guard.mts` (`evaluateCostReportGuard`) and are called from BOTH `maybeEmitCostReport` and `costSliceHandler` (commit 58dcfb62, after review B found the first implementation only reached the interactive path). Verifier re-drove the real loop handler: zero sessions -> {written:false, reason:"sessions_scanned_zero"}; 48h window without --allow-wide-window -> "window_too_wide"; repeat run_id + identical totals -> "duplicate run_id"; normal emit wrote `run_id: "revalidate-3"` in frontmatter; cost dir empty after each refusal (validations/20261106T043235Z-...). Cursor no longer advances on a refusal (commit 079b7311, test src/tests/cost-scan-cursor-honesty-guard.test.mts, proven load-bearing by stashing the fix: 2 of 3 fail).
- [x] AC-2: Given `priceFor("claude-fable-5-1")`, Then `matched` equals `"claude-fable-5-1"`; given `priceFor("claude-sonnet-5")`, Then `"claude-sonnet-5"`; given `priceFor("claude-haiku-4-5-20251001")`, Then `"claude-haiku-4-5"`; given `priceFor("claude-opus-9")`, Then `matched` is `null`, `unpriced_models` contains it, and the cost-advisor verdict is `unknown`. Evidence: `cd crew && bun test tests/pricing.test.mts tests/cost-report-honesty.test.mts tests/cost-report-emission.test.mts` -> 33 pass, 0 fail, 87 expect(). Verifier live-checked priceFor: claude-fable-5-1 -> matched itself (audit §3.7 rates, cacheWrite5m = 1.25x input, cacheWrite1h = 2x input); claude-sonnet-5 -> itself; claude-haiku-4-5-20251001 -> claude-haiku-4-5 via the date-suffix rule; claude-opus-4-9 -> matched null (no prefix fallback to claude-opus-4); made-up id -> null. Live proof the fix is on the real path: the newest cost report prices claude-opus-5 as claude-opus-5, where the pre-fix report 20261106T025812Z billed claude-fable-5-1 as claude-sonnet-4.
- [x] AC-3: Given `pricing.json` copied under a temp directory whose path contains a space with `PRICING_PATH` pointing at it, Then it loads; given no `PRICING_PATH`, Then the inlined table is used with no filesystem read. Evidence: verifier copied pricing.json into a directory whose path contains a space, set PRICING_PATH with a tracer value (input: 999), and priceFor loaded it; unset falls back to the statically imported table with no filesystem read. The import.meta.url percent-encoding bug is gone. Reviewer A confirmed PRICING_PATH is read inside loadPricingTable() at call time, not at module load, and that the static `with { type: "json" }` import typechecks under both tsconfigs (resolveJsonModule true in each).
- [x] AC-4: Given a grade file still containing the literal token `<fill title>`, When the grade writer runs, Then it exits `2` with `"grade template unfilled"`. Evidence: `bun test src/tests/grade-writer-unfilled.test.mts src/tests/close-slice.test.mts` -> 15 pass, 0 fail. Rejection fires inside writeGrade only: an unfilled scaffold, or `<fill title>` plus a zero axis, exits 2 with `grade template unfilled`; filling the title and re-running succeeds rc=0 — verifier confirmed scaffold-then-fill-then-write is NOT deadlocked. The 10 updated grade fixtures got real titles (reviewer A spot-checked 2; reviewer B 2 more), not check-dodges.

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
