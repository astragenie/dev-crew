---
id: FEAT-036
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-11-06
updated: 2026-11-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.4
pm_technical_risk: 0.15
pm_dependency_depth: 0
pm_composite_priority: P3
pm_autonomous_safe: true
pm_reviewed: 2026-11-06
autonomous_safe: true
triage_notes: "P3, technical_risk band 0.0-0.2 (known repo pattern, test-plus-docs only, trivially reverted by git revert): the reported data-loss bug is already fixed on this branch by SLICE-50 -- crew-bridge.mts:305 gates on `preserveCursor` and cost-report-guard.mts defaults unknown reasons to preserve -- so customer_impact drops to 0.3, but the FEAT is not redundant: the fail-safe default has no test and docs/memory.md has no operator-recovery path for a held cursor, so it is retained as narrow regression-plus-docs hardening rather than declined."
tags: ["stack:typescript", "area:cost-hygiene", "concern:cursor-integrity"]
needs_contract: false
needs_ux: false
---
## Description

Cost-scan cursor advances past a refused window — real cost activity is permanently skipped

Source: SLICE-50 / FEAT-025 validation (`.claude/artifacts/crew/validations/20261106T043235Z-validation-result-slice-50-re-validation-cost-guards-on-both-paths.md`) and the fixer's flag on commit 58dcfb62. Found during wave 1 of the 2026-11-05 audit remediation; NOT one of FEAT-025's ACs — the cursor mechanism predates it (FEAT-268). Depends on: none (FEAT-025 is done; this is additive).

Problem: `src/scripts/lib/slice-linker/crew-bridge.mts`'s `tryWriteCostReport` advances the per-slice cost-scan cursor whenever `!report?.error`:

    if (sliceId && !report?.error) { await writeCostScanCursor(...) }

FEAT-025's three honesty refusals all return `{written: false, reason}` with NO `.error` key, so the cursor advances on every refusal. Two of the three are harmless:
- `sessions_scanned_zero` — nothing in the window to lose.
- `duplicate run_id` — fires only when an identical report already exists on disk, so the data is durably captured elsewhere.

The third is data loss. `window_too_wide` fires specifically when `sessionsScanned > 0` — real session cost activity exists in a window too wide to trust (the stale/un-rotated `currentRun` shape). The guard correctly refuses to write a misleading total, but the cursor then advances past that span, so the next close starts scanning from "now" and the unreported activity never appears in any cost report. The honesty guard and the cursor machinery disagree about what happened.

Deliverable:
- `crew-bridge.mts` `tryWriteCostReport`: do not advance the cursor when the handler returned a refusal whose reason must preserve the window. Gate on the reason, not on the absence of `.error` — advance for `sessions_scanned_zero` and `duplicate run_id`, hold for `window_too_wide` (and for any future refusal reason added to the preserve list, so a new reason defaults to preserving rather than silently discarding).
- Make the refusal shape explicit rather than duck-typed: have the handler return a discriminated result the bridge can switch on (e.g. `{written: false, reason, preserveCursor: boolean}` resolved in `cost-report-guard.mts` next to the reasons themselves), so the two modules cannot drift again.
- Test in `src/tests/` (bridge-level, not crew/): seed a scratch repo with a session inside a >24h window and no `--allow-wide-window`, run the bridge's cost step, assert the refusal AND that the cursor file is unchanged; then the same for a zero-session window asserting the cursor DID advance. Cover the duplicate case too.
- Operator recovery: document in `docs/memory.md` how to re-report a held window (re-run the close with `--allow-wide-window`, or rotate `currentRun` first) so a held cursor is actionable rather than a stuck loop.

Acceptance criteria:
- Given a scratch repo with real session activity in a window wider than `maxWindowHours` and no `--allow-wide-window`, when the bridge's cost step runs, then it returns `window_too_wide`, writes no cost report, and leaves the cost-scan cursor byte-identical.
- Given the same repo re-run with `--allow-wide-window`, then the report is written and covers the previously held window (no gap).
- Given a zero-session window, then the refusal is `sessions_scanned_zero` and the cursor DOES advance.
- Given a duplicate `run_id` with identical totals, then the refusal is `duplicate run_id` and the cursor advances.
- Given a new refusal reason added to `cost-report-guard.mts` without touching the bridge, then the default behaviour preserves the cursor (assert via a fixture reason).
- `bun run test`, `bun run typecheck`, `cd crew && bunx tsc -p tsconfig.json --noEmit`, lint and format all green.

Scope: `src/scripts/lib/slice-linker/crew-bridge.mts`, `crew/scripts/lib/cost-hygiene/cost-report-guard.mts` (reason metadata only), `crew/scripts/lib/cost-hygiene/cost-slice-handler.mts` (return shape only), `src/tests/`, `docs/memory.md`. Do not change the three refusal conditions themselves — FEAT-025 settled those.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given `shouldPreserveCursorForReason` imported from `crew/scripts/lib/cost-hygiene/cost-report-guard.mts` and a fixture reason absent from `PRESERVE_CURSOR_BY_REASON` such as "future_unknown_reason", When the bridge's cost step runs with `costSliceHandler` stubbed to return `{ written: false, reason: "future_unknown_reason", preserveCursor: shouldPreserveCursorForReason("future_unknown_reason") }`, Then the real guard export returns `true` and the seeded cursor file is byte-identical after the call -- a new refusal reason defaults to preserving the window without any edit to crew-bridge.mts.
- AC-2: Given a scratch repo whose cost-scan cursor is seeded to "2026-08-01T00:00:00.000Z" for a slice id, When `tryWriteCostReport` runs with `costSliceHandler` returning `{ written: false, reason: "sessions_scanned_zero", preserveCursor: false }`, Then `readCostScanCursor` reports `lastWindowEnd` equal to the resolved `window.completedAt` and not the seeded value -- the advance side of FEAT-268's two-consecutive-scans contract stays pinned at the bridge level.
- AC-3: Given the same seeded scratch repo, When `tryWriteCostReport` runs with `costSliceHandler` returning `{ written: false, reason: "duplicate run_id", preserveCursor: false }`, Then the cursor advances to `window.completedAt`, because an identical report already exists on disk for that exact window.
- AC-4: Given a `costSliceHandler` stub that returns a result carrying an `.error` key and no `preserveCursor` field at all, When `tryWriteCostReport` runs against the seeded scratch repo, Then the cursor is left at "2026-08-01T00:00:00.000Z" -- the `!report?.error` arm of the gate at src/scripts/lib/slice-linker/crew-bridge.mts:305 is asserted independently of `preserveCursor`, so neither condition can be dropped without a red test.
- AC-5: Given a cursor held at "2026-08-01T00:00:00.000Z" by a prior `window_too_wide` refusal, When the cost step is re-run with `allowWideWindow: true` so `evaluateCostReportGuard` returns `{ refused: false, runId }`, Then a cost report is written whose window start equals the held cursor value rather than the re-run's own start time (no skipped span), and the cursor then advances to the new `window.completedAt`.
- AC-6: Given an operator who hits a held cursor and searches docs/memory.md for `window_too_wide`, When they read the matched section, Then it states that the cursor is deliberately held for that reason only, and gives both recovery paths -- re-run the close with `--allow-wide-window`, or rotate `currentRun` before the close -- so a held cursor is actionable rather than read as a stuck loop. Grep for `window_too_wide` in docs/memory.md returns zero hits today.
- AC-7: Given the branch after the change, When `bun run test`, `bun run typecheck`, `cd crew && bunx tsc -p tsconfig.json --noEmit`, `bun run lint` and `bun run format:check` run, Then all exit 0 with zero warnings.
