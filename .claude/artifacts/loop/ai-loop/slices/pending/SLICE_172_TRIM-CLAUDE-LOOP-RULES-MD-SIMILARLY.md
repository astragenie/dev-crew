---
id: SLICE-172
title: Trim .claude/loop/rules.md similarly
status: pending
feature: FEAT-272
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 576
github_url: "https://github.com/astragenie/runner-plugin/issues/576"
---
# SLICE-172: Trim .claude/loop/rules.md similarly

Implements FEAT-272. See [feature file](../../../backlog/in-progress/FEAT-272.md) for product context.

## Objective

Context diet for runner-plugin injected context. Audit 2026-08-02: ~203k tokens of static context reinjected per assistant message (live sample FEAT-263 SLICE-160: 16.26M cache-read / 80 msgs vs 150 raw input tokens); CLAUDE.md is 29.7KB (553 lines), .claude/loop/rules.md 19.9KB, plus embedded loop-snapshot — a flat tax on every message, ~97% of USD is Opus cache reads. Fleet clean-data tok/msg trend 116k (May) to 282k (Jul). Scope: restructure CLAUDE.md to a <100-line always-on index with detail sections moved to skill-gated docs (skills or docs/ files referenced on demand); trim rules.md similarly; cap loop-snapshot embed to counts/deltas (no full prose lists). MUST keep CI gates green: validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs. Measure before/after bytes in the FEAT notes.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-272 and shared across 4 sibling slices — scope per-slice before close

- [ ] AC-1: Given the restructured CLAUDE.md, When measured, Then it is under 100 lines and the moved detail sections are reachable via named skill-gated docs or docs/ files referenced on demand.
- [ ] AC-2: Given the three named CI gates (validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs), When run against the restructured docs, Then all three pass unchanged (or are updated in lockstep with a note in the FEAT closing notes).
- [ ] AC-3: Given a fresh session with no prior context, When an agent reads the trimmed CLAUDE.md index, Then it can still locate and state the Autonomous Loop / Cross-Slice Continuation / Phase Completion Gate HARD RULE blocks (asserted by an explicit manual or scripted check, since no current CI gate covers this).
- [ ] AC-4: Given the FEAT's own requirement, When the slice closes, Then before/after byte counts for CLAUDE.md and rules.md are recorded in the FEAT notes.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-272 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
