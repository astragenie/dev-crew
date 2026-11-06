---
id: FEAT-036
status: pending
priority: null
category: feature
target_release: null
created: 2026-11-06
updated: 2026-11-06
depends_on: []
slices: []
derived_from: null
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