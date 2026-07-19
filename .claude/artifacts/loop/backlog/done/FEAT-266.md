---
id: FEAT-266
status: done
priority: P3
category: feature
target_release: null
created: 2026-07-19
updated: 2026-07-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.4
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.3
pm_technical_risk: 0.1
pm_dependency_depth: 0.05
pm_composite_priority: P3
pm_autonomous_safe: true
pm_reviewed: 2026-07-19
autonomous_safe: true
triage_notes: "P3: low-effort, low-risk (0.0-0.2 band: single doc file, trivially git-revertible), moderate-but-not-critical customer_impact since this is external positioning/credibility rather than product function — sits below the P2 items in this batch which carry either a reproduced bug (FEAT-249, P1) or real reviewer/consumer-facing findings (FEAT-237, FEAT-262)."
tags: [be]
needs_contract: false
needs_ux: false
---
## Description

README honest comparison table + hedge footnote (audit 2026-07-18 §6 item 7). Add a comparison table to README (runner-plugin, later landing page) stating real differentiation vs otta/COG/competitors: real GEPA vs claimed, 14 halt badges vs none, honest cost median, installable-today vs waitlist. MUST carry otta-style hedge footnote ('Comparison reflects publicly documented positioning as of <date>'), avoid takedown tone. Include README-as-docs consolidation pass for the surrounding sections. Source evidence: docs/research/2026-07-18-competitive-audit.md §6 item 7 + §8 appendix. Constraint: do NOT touch the auto-generated dogfood metrics band section (CI gate generate-metrics-band --check). Touches: README.md only.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.

## Resolution notes (2026-07-19)

README already carried a "How this compares" section (added by W4,
`453200c1` / #538) covering halt/stop enforcement, prompt optimization
(GEPA), CI enforcement, and cost reporting against a "generic agent
platforms" category — no named competitor, matching this FEAT's
zero-takedown constraint. This slice closed the remaining gap called
out in the audit's item 7: an "installable-today vs waitlist-gated"
row, and swapped the footnote for the exact otta-style hedge text with
a date.

Claims-to-evidence map (all from
`docs/research/2026-07-18-competitive-audit.md`):

- Halt/stop enforcement row — §3 scorecard citation "runner safety 7:
  14 documented halt badges with observed firing"; §8 evidence
  appendix references `docs/halt-badges.md`. Count itself is sourced
  live from the README metrics band (CI-freshness-gated), not
  hardcoded, since it has already moved 14→16 since the audit date.
- Prompt optimization (GEPA) row — §4.3 "What's real" (Pareto ranking,
  352 tests, live promotion trial `c948e52c`) vs §4.5 otta "the 'GEPA'
  self-learning claim... has zero implementing code" and §3 "otta
  self-opt 1... grep across scripts/commands/skills finds no
  implementing code."
- CI enforcement row — §3 "runner telemetry 8: CI-gated snapshot
  freshness" plus named-incident CI gates listed in `CLAUDE.md` § "CI
  gates" (#371, #474, #355).
- Cost reporting row — §4.2 gap (e) and §2 "Known limitations" unit-
  ambiguity note; median-alongside-mean framing already resolves the
  §4.2 caveat about publishing an unqualified average.
- New "Access" row (installable-today vs waitlist) — §4.5 "all pricing
  tiers waitlist-gated including Free" and §6 "Explicitly rejected"
  list: "Waitlist-gating everything (otta) — their weakest conversion
  move; our plugin is installable today, keep it self-serve."
- Footnote — §6 adoption-list item 7 cites otta's own hedge footnote
  text ("Comparison reflects publicly documented positioning…") as the
  pattern to copy; dated to the audit's own date, 2026-07-18.

Auto-generated metrics band section (`<!-- metrics-band:start -->` /
`<!-- metrics-band:end -->`) was left untouched — regeneration is
CI-gated by `generate-metrics-band.mts --check` and out of this
slice's scope.