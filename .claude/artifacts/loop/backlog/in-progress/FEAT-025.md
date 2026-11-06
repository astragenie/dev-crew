---
id: FEAT-025
status: in-progress
priority: P2
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: []
slices: [SLICE-50]
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.7
pm_technical_risk: 0.45
pm_dependency_depth: 0
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P2, holds. technical_risk raised slightly to 0.45 (band 0.4-0.6: the JSON-static-import conversion and the decide.mts enum extension are additive, not breaking, but now span two test directories and a cost-advisor rendering path, not one isolated module as originally scoped)."
started_at: 2026-11-06
---
## Description

Audit T9: telemetry honesty for cost reports, pricing, grades, and bundle-safe data files

Source: remediation plan Task 9; audit #16, #17, #42-#44; Codex #15-#17; architect OBJ-7/OBJ-15; reviewer MAJOR on model ids. Wave 1 lane D. Depends on: none.

Problem: crew/scripts/lib/session-cost.mts:27-35 prefix-matches 3 model families and silently prices unknown models at Sonnet-4 rates (so `claude-opus-4-9` hits `claude-opus-4`); session-cost.mts:21-23 resolves pricing.json beside the module via import.meta.url without decoding, breaking on a profile path with a space and on any bundled dist/crew.js (no sibling file); emit-cost-report.mts:134-152 writes reports with zero sessions scanned or unbounded windows and no run_id dedup; the grade writer at src/scripts/lib/grade-writer.mts:203 accepts unreplaced "<fill title>" tokens as real zeros; decide.mts:31 verdict enum is pass|warn only.

Deliverable:
- emitCostReport refuses ({written:false, reason}) when sessionsScanned===0 or window > maxWindowHours (default 24) unless --allow-wide-window; frontmatter gains run_id; repeated run_id with identical totals → {written:false, reason:"duplicate run_id"}.
- pricing.json imported statically (`import pricing from "./pricing.json" with { type: "json" }`) so the bundler inlines it; PRICING_PATH env override for tests. Keys verified against real transcript `model` values in this repo (`claude-fable-5-1`, `claude-sonnet-5`, …) — do NOT hardcode unverified `-5-5` ids. Match = exact key or key + `-YYYYMMDD` date suffix (no bare prefix); add `claude-opus-4-5` so `claude-opus-4` stops catching 4.5+. priceFor returns {input, output, cacheRead, cacheWrite5m, cacheWrite1h, matched: string|null}; cacheWrite5m = 1.25× input and cacheWrite1h = 2× input, documented in pricing.json `_keys`. Unmatched → matched null, report lists unpriced_models, cost-advisor verdict `unknown` (decide.mts action union gains unknown; cost-advise-writer renders it).
- Grade writer rejects any axis ===0 titled "<fill title>" or any unreplaced "<fill …>" token: exit 2 "grade template unfilled".
- Tests: crew/tests/cost-report-honesty.test.mts, crew/tests/pricing.test.mts, src/tests/grade-writer-unfilled.test.mts.

Acceptance criteria (draft):
- Given zero sessions, or a 30h window, or a repeated run_id, when emitCostReport runs, then nothing is written and reason is set.
- Given priceFor("claude-fable-5-1") then matched equals "claude-fable-5-1"; priceFor("claude-sonnet-5") then "claude-sonnet-5"; priceFor("claude-haiku-4-5-20251001") then "claude-haiku-4-5"; priceFor("claude-opus-9") then null and unpriced_models contains it and the advisor verdict is unknown.
- Given pricing.json copied under a temp dir whose path contains a space and PRICING_PATH pointing at it, then it loads; given no PRICING_PATH, the inlined table is used (no filesystem read).
- Given a grade file still containing "<fill title>", when the grade writer runs, then exit 2 with "grade template unfilled".

Scope: crew/scripts/lib/cost-hygiene/, crew/scripts/lib/session-cost.mts, crew/scripts/lib/pricing.json, crew/scripts/lib/cost-advise/decide.mts + writer, src/scripts/lib/grade-writer.mts, crew/tests/, src/tests/.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given zero sessions scanned, or a 30-hour window, or a repeated `run_id`, When `emitCostReport` runs, Then nothing is written and a `reason` is set.
- AC-2: Given `priceFor("claude-fable-5-1")`, Then `matched` equals `"claude-fable-5-1"`; given `priceFor("claude-sonnet-5")`, Then `"claude-sonnet-5"`; given `priceFor("claude-haiku-4-5-20251001")`, Then `"claude-haiku-4-5"`; given `priceFor("claude-opus-9")`, Then `matched` is `null`, `unpriced_models` contains it, and the cost-advisor verdict is `unknown`.
- AC-3: Given `pricing.json` copied under a temp directory whose path contains a space with `PRICING_PATH` pointing at it, Then it loads; given no `PRICING_PATH`, Then the inlined table is used with no filesystem read.
- AC-4: Given a grade file still containing the literal token `<fill title>`, When the grade writer runs, Then it exits `2` with `"grade template unfilled"`.
