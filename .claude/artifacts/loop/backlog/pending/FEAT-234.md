---
id: FEAT-234
status: pending
priority: P3
category: documentation
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: [FEAT-188]
slices: []
derived_from: null
tags: [concern:docs, surface:plugin]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Debt from v0.64.0 architect design review (2026-07-08, the 2 'Critical' design-doc structure gates — explicitly non-release-blocking). The FEAT-188 MemoryProvider design docs carry no formal '## Options Considered' / '### Option N' / 'Why rejected:' structure for the central topology decision (one memory home vs two) or the transport choice (in-process provider vs reimplemented HTTP client). The decision was RIGHT (one home, plugin transport) and is documented in prose + reconciliation notes, but not in the reviewable options-comparison shape the quality bar expects. Doc-only backfill — autonomous_safe: true, doc-writer owns."
---
# FEAT-234: backfill Options-Considered blocks in the FEAT-188 memory design docs

## Problem

The v0.64.0 architect design review passed on substance (SOUND-WITH-DEBT, "one
memory home" resolved correctly) but fired two design-doc STRUCTURE gates
(non-release-blocking): the FEAT-188 design artifacts record the central
decisions in prose + reconciliation notes, without a formal
`## Options Considered` / `### Option N` / `Why rejected:` comparison for:

1. **Topology** — one canonical `MemoryProvider` home (crew) vs runner + crew each
   owning a stack.
2. **Transport** — in-process provider (chosen) vs reimplemented in-process HTTP
   client vs CLI-spawn (dev-team#172's S4 named 3 alternatives but gave no
   specific failure-mode reason for rejecting the HTTP-client option).

The decisions were correct; the gap is reviewability — a future reader can't see
the alternatives and their rejection rationale in the expected structure.

## Goal

Backfill the two design decisions with proper Options-Considered blocks (options,
tradeoffs, explicit "Why rejected" with a concrete failure mode per rejected
option) so the topology + transport choices are auditable after the fact.

## Acceptance criteria

- AC-1: GIVEN the FEAT-188 memory-provider plan (dev-team
  `docs/superpowers/specs/2026-07-04-memory-provider-plan.md`) and/or its
  reconciliation note, WHEN updated, THEN the topology decision carries a
  `## Options Considered` block with ≥2 options and a specific `Why rejected:`
  reason for each non-chosen option.
- AC-2: GIVEN the transport decision (dev-team#172), WHEN updated, THEN the
  "reimplemented in-process HTTP client" option has a concrete failure-mode reason
  for rejection (not just "not chosen").
- AC-3: GIVEN this is a cross-repo doc (the design lives in dev-team), WHEN this
  FEAT is executed, THEN the edit lands in the dev-team repo (or a runner-side ADR
  mirror is written) — coordinate ownership; do NOT fork the design narrative.
- AC-4: No source or runtime config changed — docs only.

## Risks / open questions

- Ownership: the primary design docs live in dev-team, not this repo. Decide
  whether to edit upstream (preferred — single source) or write a runner-side ADR
  that references + supplements them. A runner-side ADR avoids cross-repo write but
  risks the same drift the design warns against.
- Low priority — retrospective doc hygiene, no behavior at stake.

## Refs

- Architect review: `.claude/artifacts/crew/reviews/20260708T081707Z-...design...md` (2 Critical structure gates).
- dev-team `docs/superpowers/specs/2026-07-04-memory-provider-plan.md`, `docs/research/2026-07-06-memory-bridge-reconciliation.md`, dev-team#172.
