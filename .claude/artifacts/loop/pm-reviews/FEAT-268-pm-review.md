---
id: PM-REVIEW-FEAT-268
feature: FEAT-268
reviewed_at: 2026-08-02
pm_customer_impact: 0.7
pm_effort_estimate: 0.6
pm_strategic_alignment: 0.65
pm_technical_risk: 0.65
pm_dependency_depth: 0.5
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-268

## Demand Assessment

- **Evidence:** 2026-08-02 fleet cost audit evidence embedded in the FEAT body: five FEAT-250/SLICE-153 cost reports all share Window Start 2026-07-03 with monotonically growing totals (1.823B-1.831B tokens, ~$3,233 each) -- cumulative re-reports of the same spend. Confirmed the invocation site: src/scripts/lib/slice-linker/crew-bridge.mts:235 calls the external `crew cost-slice --repo <repoPath> --run-title <runTitle>` with no window/since argument at all, so if the scan window itself doesn't reset, the bug is very likely in crew's own cost-slice scan, not in this repo's invocation.

## Scope Challenge

- **Scope notes:** The FEAT's own instruction not to loosen the FEAT-204 dedup fingerprint is correct and should stay a hard constraint -- src/scripts/lib/memory-snapshot.mts already relies on tight fingerprinting (sliceKeyOf, resolveCostReportUsd) to survive exactly this class of repeated-report poisoning; loosening it to a tolerance band would merge distinct cumulative snapshots per the FEAT's own adversarial-review note. No weak grade dimension this cycle. No single-slice cost analog found in sampled reports (all recent samples were fleet aggregates) -- 'no cost analog', though that absence is itself evidence for how pervasive the aggregate/window contamination is in the historical corpus.

## Scores

- customer_impact: 0.70
- effort_estimate: 0.60
- strategic_alignment: 0.65
- technical_risk: 0.65
- dependency_depth: 0.50

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1: demonstrated, actively-corrupting-telemetry bug (loop-snapshot's own cost-trajectory line feeds cost-alert/cost-ceiling gates) with real audit evidence, but capped below P0 since there's no active incident/outage -- this is degraded observability accuracy, not a broken build. technical_risk banded 0.6-0.8 (cross-module reach into an external plugin's scan logic, root cause location unconfirmed).

## Risks

- Pre-mortem 1: most likely review/validation failure is landing a loop-side 'fix' (e.g. a client-side heuristic that discards old-window reports) that masks the symptom without addressing a crew-side scan bug, so the underlying re-scan behavior keeps recurring for any consumer that doesn't apply the same heuristic.
- Pre-mortem 2: rollback is a clean git revert if the fix stays confined to loop-side dedup/observability; if crew-side, rollback requires cross-plugin coordination (crew's cost-slice scan) and re-verifying no other loop consumer (memory-snapshot median/mean, slice-cost-ceiling, cost-alert-loader) regresses.
- Pre-mortem 3: no existing test asserts that repeated `crew cost-slice` invocations against the SAME session over multiple days produce an ADVANCING window rather than re-scanning a frozen start -- cost-report-dedup.test.mts covers wave-mode shared-session dedup and memory-snapshot-telemetry.test.mts covers aggregate_all exclusion, but neither exercises a frozen-Window-Start regression.
- Injecting an upstream-request without first confirming loop-side innocence risks misdirecting crew maintainers -- the investigation step must produce concrete before/after evidence (e.g. two cost-slice invocations a day apart against the same session) before filing.
