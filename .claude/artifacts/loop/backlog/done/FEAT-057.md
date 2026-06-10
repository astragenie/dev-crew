---
id: FEAT-057
status: done
priority: P2
category: cost-governance
target_release: null
created: 2026-06-06
updated: 2026-06-07
depends_on: []
slices: [SLICE-67]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
autonomous_safe: true
triage_notes: "30 redundant Reads = concrete cost waste. SCOPE: hook lives in hero-crew plugin (cache/astra/crew/0.15.0/hooks/check-redundant-read.mjs), not loop. Loop cannot deny a hook it doesn't own. Re-route as upstream-request to hero-crew, or rescope to loop-side surrogate halt that reads hook events.jsonl and emits redundant_read_stop badge."
composite_score: 0.695
started_at: 2026-06-07
slices_complete: [SLICE-67]
completed_at: 2026-06-07
github_issue: 119
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/119"
---
# FEAT-057: Promote check-redundant-read hook to block

> **SCOPE NOTE (2026-06-06):** The `check-redundant-read` hook source lives in the **hero-crew plugin** at `cache/astra/crew/0.15.0/hooks/check-redundant-read.mjs`, not loop. Loop cannot ship a deny-verdict modification to a hook it does not own. Original SLICE-54 was opened and rolled back; this FEAT is held in triaged pending direction:
> - **Option A:** route as upstream-request FEAT against hero-crew repo
> - **Option B:** rescope to loop-side surrogate — read hook's `events.jsonl`, emit `redundant_read_stop` halt badge from `stop-conditions.mts` (mirrors FEAT-055 cost-regression pattern)
> Marked `autonomous_safe: false` until direction is picked.

check-redundant-read hook currently logs only (hookHealth green = 0 errors, but does not gate). Cost-advisor saw 30 redundant Read calls in one slice. Hook should DENY at N redundant reads of same absolute path within session.

AC-1: hook tracks file-path -> read-count in session-scoped state.
AC-2: at >=5 redundant reads of same path (no intervening Edit/Write), hook returns deny verdict.
AC-3: deny message surfaces redundant-read count + suggestion to trust prior result.
AC-4: hook bypassed if prior Edit/Write touched the path.
AC-5: hook config exposes threshold via .claude/loop.json::hooks.redundantReadCap (default 5).
AC-6: tests cover under-threshold pass, over-threshold deny, post-edit reset.