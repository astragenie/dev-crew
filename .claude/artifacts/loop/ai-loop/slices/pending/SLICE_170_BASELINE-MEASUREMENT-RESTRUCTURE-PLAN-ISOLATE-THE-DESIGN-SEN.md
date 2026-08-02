---
id: SLICE-170
title: Baseline measurement + restructure plan (isolate the design-sensitive index shape as its own slice)
status: pending
feature: FEAT-272
phase: null
priority: P1
target_release: null
requires_validation: false
risk: high
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 572
github_url: "https://github.com/astragenie/runner-plugin/issues/572"
---
# SLICE-170: Baseline measurement + restructure plan (isolate the design-sensitive index shape as its own slice)

Implements FEAT-272. See [feature file](../../../backlog/in-progress/FEAT-272.md) for product context.

## Objective

Context diet for runner-plugin injected context. Audit 2026-08-02: ~203k tokens of static context reinjected per assistant message (live sample FEAT-263 SLICE-160: 16.26M cache-read / 80 msgs vs 150 raw input tokens); CLAUDE.md is 29.7KB (553 lines), .claude/loop/rules.md 19.9KB, plus embedded loop-snapshot — a flat tax on every message, ~97% of USD is Opus cache reads. Fleet clean-data tok/msg trend 116k (May) to 282k (Jul). Scope: restructure CLAUDE.md to a <100-line always-on index with detail sections moved to skill-gated docs (skills or docs/ files referenced on demand); trim rules.md similarly; cap loop-snapshot embed to counts/deltas (no full prose lists). MUST keep CI gates green: validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs. Measure before/after bytes in the FEAT notes.

## In scope

- Measure the CURRENT injected-context baseline: CLAUDE.md + AGENTS.md + the
  docs it delegates to + `.claude/loop/rules.md` + the embedded
  loop-snapshot.md — byte + estimated token counts, and which of these are
  actually auto-loaded (`@`-imported) at session start vs. read-on-demand.
- Compare against FEAT-272's original 553-line/~203k-tokens-per-message
  evidence and reconcile the gap.
- Discover and document that PR #552 (commit `089194a8`) already landed a
  CLAUDE.md restructure upstream before this slice started, and assess how
  much of SLICE-171's scope it already satisfies.
- Live-test the 3 CI gates named in AC-2 against current HEAD and attribute
  any failures (restructure-caused vs. unrelated drift).
- Produce a revised recommendation (re-scope / keep / close-as-superseded)
  for SLICE-171, SLICE-172, SLICE-173.

## Out of scope

- Actually editing CLAUDE.md, AGENTS.md, or .claude/loop/rules.md (that's
  SLICE-171/172's execution work, not this baseline/plan slice).
- Fixing the unrelated org-refs drift file found during the CI-gate check.
- Running the full `bun test` / biome suite (no `node_modules` in this
  worktree; the 3 named gates + validate-content-length run standalone
  under Bun and were exercised directly — see the research doc).

## Acceptance criteria

> WARNING: ACs copied from FEAT-272 and shared across 4 sibling slices — scoped down here to what SLICE-170 (baseline + plan) actually delivers; SLICE-171 owns the literal <100-line restructure.

- [x] AC-1 (scoped to SLICE-170): Given the CURRENT state of CLAUDE.md (post PR #552), When measured, Then the auto-loaded chain size and remaining gap to a <100-line index are documented with a revised, contract-safe target — see `docs/research/2026-08-02-context-diet-baseline.md` §1-2, §5 (SLICE-171 recommendation). Full <100-line restructure itself remains SLICE-171's deliverable.
- [x] AC-2 (scoped to SLICE-170): Given the three named CI gates, When run against current HEAD, Then all three were live-tested; all three currently fail, but none of the failures trace to the CLAUDE.md restructure (org-refs fails on an unrelated file; snapshot-freshness/metrics-band fail on ordinary concurrent-wave backlog drift) — see research doc §4. Reconciling/regenerating those gates is carried forward as SLICE-173's (reduced) scope.
- [x] AC-3: Given a fresh session with no prior context, When reading the current trimmed CLAUDE.md index, Then the Autonomous Loop / Cross-Slice Continuation / Phase Completion Gate HARD RULE blocks are still locatable — manually verified: CLAUDE.md's `<!-- runner:start -->` block (lines 251-274) contains the Autonomous Loop HARD RULES summary directly, and points to `.claude/loop/rules.md` for the full Cross-Slice Continuation / Phase Completion Gate sections, which were confirmed present and unchanged in that file (§2 of research doc).
- [x] AC-4: Given the FEAT's own requirement, When this baseline slice closes, Then before/after byte counts for CLAUDE.md and rules.md are recorded in the FEAT notes — see `docs/research/2026-08-02-context-diet-baseline.md` §1 and the "Baseline spike notes" section appended to FEAT-272.md.

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
