---
id: FEAT-272
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-170, SLICE-171, SLICE-172, SLICE-173]
derived_from: null
tags: [docs, infra]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.7
pm_technical_risk: 0.7
pm_dependency_depth: 0.4
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-02
autonomous_safe: false
triage_notes: "P1: quantified, severe, worsening-trend cost problem (~97% of USD is Opus cache reads per the FEAT) directly tied to the loop's own operating cost, high strategic alignment with the active cost-hygiene program -- capped at P1 rather than P0 since it's efficiency debt, not an active break, but technical_risk lands at 0.6-0.8 (cross-cutting reach into every agent's always-on context plus 3 coupled CI gates)."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Baseline measurement + restructure plan (isolate the design-sensitive index shape as its own slice)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Restructure CLAUDE.md to <100-line index + skill-gated detail docs
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Trim .claude/loop/rules.md similarly
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Reconcile the 3 named CI gates + record before/after byte measurements
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-02
github_issue: 577
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/577"
slices_complete: [SLICE-170]
---
## Description

Context diet for runner-plugin injected context. Audit 2026-08-02: ~203k tokens of static context reinjected per assistant message (live sample FEAT-263 SLICE-160: 16.26M cache-read / 80 msgs vs 150 raw input tokens); CLAUDE.md is 29.7KB (553 lines), .claude/loop/rules.md 19.9KB, plus embedded loop-snapshot — a flat tax on every message, ~97% of USD is Opus cache reads. Fleet clean-data tok/msg trend 116k (May) to 282k (Jul). Scope: restructure CLAUDE.md to a <100-line always-on index with detail sections moved to skill-gated docs (skills or docs/ files referenced on demand); trim rules.md similarly; cap loop-snapshot embed to counts/deltas (no full prose lists). MUST keep CI gates green: validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs. Measure before/after bytes in the FEAT notes.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the restructured CLAUDE.md, When measured, Then it is under 100 lines and the moved detail sections are reachable via named skill-gated docs or docs/ files referenced on demand.
- AC-2: Given the three named CI gates (validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs), When run against the restructured docs, Then all three pass unchanged (or are updated in lockstep with a note in the FEAT closing notes).
- AC-3: Given a fresh session with no prior context, When an agent reads the trimmed CLAUDE.md index, Then it can still locate and state the Autonomous Loop / Cross-Slice Continuation / Phase Completion Gate HARD RULE blocks (asserted by an explicit manual or scripted check, since no current CI gate covers this).
- AC-4: Given the FEAT's own requirement, When the slice closes, Then before/after byte counts for CLAUDE.md and rules.md are recorded in the FEAT notes.

## Proposed slices (PM decomposition)

- SLICE-1: Baseline measurement + restructure plan (isolate the design-sensitive index shape as its own slice) (2 pts)
- SLICE-2: Restructure CLAUDE.md to <100-line index + skill-gated detail docs (2 pts)
- SLICE-3: Trim .claude/loop/rules.md similarly (2 pts)
- SLICE-4: Reconcile the 3 named CI gates + record before/after byte measurements (2 pts)

## Baseline spike notes (SLICE-170, 2026-08-02)

Full detail: `docs/research/2026-08-02-context-diet-baseline.md`. Summary:

- **An unrelated restructure (commit `089194a8`, PR #552) already landed
  before this FEAT started work**, cutting `CLAUDE.md` from 553 lines /
  30,447 bytes (29.7KB) to 278 lines / 14,017 bytes (13.7KB) via a
  four-altitude split (`AGENTS.md` / `CLAUDE.md` / `docs/memory.md` /
  `docs/ci-gates.md`). This is materially the mechanism SLICE-171 was
  scoped to build.
- **`.claude/loop/rules.md` is untouched** — byte-identical before/after
  #552 (248 lines / 20,393 bytes both times). SLICE-172's scope is fully
  open, zero work done yet.
- Before/after byte counts (AC-4):
  | File | Before | After | Delta |
  |---|---|---|---|
  | CLAUDE.md | 553 lines / 30,447 B | 278 lines / 14,017 B | -49.7% lines / -54.0% bytes |
  | .claude/loop/rules.md | 248 lines / 20,393 B | 248 lines / 20,393 B (unchanged) | 0% |
  | AGENTS.md (new) | n/a | 89 lines / 4,734 B | new, auto-`@`-included |
  | Net CLAUDE.md-chain auto-load (CLAUDE.md+AGENTS.md+snapshot) | ~33.3KB | ~21.6KB | ~-35% |
- The three named CI gates (validate-snapshot-freshness, generate-metrics-band
  --check, validate-org-refs) were live-tested against current HEAD: **all
  three currently fail**, but none of the failures trace to the CLAUDE.md
  restructure — org-refs fails on an unrelated docs file; snapshot-freshness
  and metrics-band fail on ordinary backlog drift from concurrent wave-mode
  slices landed since #552. The restructure commit's own message states its
  full validator + test suite passed both before and after.
- **Reconciled 203k-tokens/message figure**: the entire CLAUDE.md-chain
  auto-load (~21.6KB, ~5.4k tokens at a 4-char/token estimate) is roughly two
  orders of magnitude below the FEAT's cited ~203k tokens/message. The
  dominant contributor to that figure is almost certainly the Claude Code
  tool/skill manifest (every installed plugin's skills + every MCP server's
  tool schemas) and conversation-history growth — neither is addressable by
  trimming this repo's docs. Recommend treating this as a flag for the
  cost-hygiene program rather than expanding this FEAT's scope.
- **Revised per-slice recommendation**: SLICE-171 — re-scope (mechanism
  shipped, hard "<100 lines" target should relax to account for 3
  machine-load-bearing contracts that can't move); SLICE-172 — keep as
  scoped (fully open, real remaining work); SLICE-173 — re-scope down
  sharply (mostly a routine regen-and-verify pass, byte counts already
  captured above; fold into SLICE-172's close rather than run standalone).
