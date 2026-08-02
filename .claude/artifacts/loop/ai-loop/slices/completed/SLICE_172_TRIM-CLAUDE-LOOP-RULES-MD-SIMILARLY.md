---
id: SLICE-172
title: Trim .claude/loop/rules.md similarly
status: completed
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
completed_at: 2026-08-02
---
# SLICE-172: Trim .claude/loop/rules.md similarly

Implements FEAT-272. See [feature file](../../../backlog/in-progress/FEAT-272.md) for product context.

## Objective

Context diet for runner-plugin injected context. Audit 2026-08-02: ~203k tokens of static context reinjected per assistant message (live sample FEAT-263 SLICE-160: 16.26M cache-read / 80 msgs vs 150 raw input tokens); CLAUDE.md is 29.7KB (553 lines), .claude/loop/rules.md 19.9KB, plus embedded loop-snapshot — a flat tax on every message, ~97% of USD is Opus cache reads. Fleet clean-data tok/msg trend 116k (May) to 282k (Jul). Scope: restructure CLAUDE.md to a <100-line always-on index with detail sections moved to skill-gated docs (skills or docs/ files referenced on demand); trim rules.md similarly; cap loop-snapshot embed to counts/deltas (no full prose lists). MUST keep CI gates green: validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs. Measure before/after bytes in the FEAT notes.

## Baseline spike note (SLICE-170, 2026-08-02)

Confirmed via git history: `.claude/loop/rules.md` is byte-identical before
and after the CLAUDE.md restructure (commit `089194a8`) — 248 lines /
20,393 bytes, zero work done here yet. **This slice remains fully in scope,
not superseded.** Full context: `docs/research/2026-08-02-context-diet-baseline.md`
§5. Apply the same index+delegate pattern already proven on CLAUDE.md: move
verbose rationale/tables/code-block examples (Auto Mode gating table,
Worktree Parallelism setup steps, Review Dispatch Budget examples) to a new
`docs/*.md` detail file, leave crisp imperative HARD RULE statements in
`rules.md` itself. Bonus finding to fold in while touching this file:
`rules.md`'s "First Action" / "Cross-Slice Continuation" sections still cite
stale pre-migration paths (`docs/ai-loop/`, `docs/backlog/pending/`) that
`docs/memory.md`'s "Known path drift" section already flags as unfixed,
installer-owned drift — fix it here or explicitly carry the note forward,
don't silently re-ship stale paths in the trimmed version.

## In scope

- Trim `.claude/loop/rules.md` (installed copy) using the index+delegate
  pattern: keep all HARD RULE headings + crisp imperatives, move verbose
  tables/examples/setup-steps to a new `.claude/loop/rules-reference.md`.
- Trim + reconcile `templates/loop-rules.md` (the actual `/runner:install`
  source per `writeLoopRules`) to the same shape, since it had diverged
  from the installed copy independent of this slice's own trim — see
  FEAT-272's "SLICE-172 close notes" for the divergence detail.
- Add the new `templates/loop-rules-reference.md` sibling template +
  `writeLoopRulesReference()` scaffold wiring so the moved detail reaches
  every consumer repo via `/runner:install`, not just this one.
- Fix the stale `docs/ai-loop/` / `docs/backlog/pending/` path drift and
  the dangling `commands/stop-check.md` reference in "First Action" /
  "Cross-Slice Continuation" / "Auto Mode No-Approval", verifying every
  corrected path resolves on disk (backfilling this repo's own
  `.claude/artifacts/loop/ai-loop/{00-entry,01-loop-control,backlog}/`
  where the migration had never actually landed).
- Fix the `{{dispatchLimits.maxSubagentsPerSlice}}` token bug discovered
  while trimming Dispatch Discipline (dotted token names never render).
- Record SLICE-172/rules.md before/after byte counts in FEAT-272 (AC-4)
  and fold SLICE-173's residual into this slice's close.

## Out of scope

- `CLAUDE.md` itself and `AGENTS.md` — SLICE-171's call, deferred; not
  touched by this slice.
- A full command-surface audit of every `/loop:`/`/runner:` reference in
  the wider loop-control doc tree (`01-loop-control/*.md`,
  `02-acceptance-gates/`, `05-review-rubrics/`) — out of scope beyond what
  rules.md itself directly references.
- The unrelated `validate-org-refs` citation drift and the routine
  `snapshot-memory`/`generate-metrics-band --write` regen pass — both
  explicitly deferred by SLICE-173's own fold-in note to whichever slice
  closes last in FEAT-272.

## Acceptance criteria

> WARNING: ACs copied from FEAT-272 and shared across 4 sibling slices — scope per-slice before close. Scoped for SLICE-172 specifically:

- [ ] AC-1: **Not this slice's scope** — about `CLAUDE.md` (<100 lines), which is SLICE-171's target file, untouched here.
- [x] AC-2: Given the three named CI gates (validate-snapshot-freshness, generate-metrics-band --check, validate-org-refs), When run against the restructured docs, Then all three pass unchanged (or are updated in lockstep with a note in the FEAT closing notes). **Scoped to rules.md's own trim**: none of the three gates read `.claude/loop/rules.md` or `templates/loop-rules.md`, so this slice's changes cannot regress them (confirmed unrelated pre-existing failures per SLICE-170's spike, re-confirmed unchanged by this slice's own gate run — see close evidence).
- [ ] AC-3: **Not this slice's scope** — about the trimmed `CLAUDE.md` index locating the three HARD RULE blocks, which is SLICE-171's target file.
- [x] AC-4: Given the FEAT's own requirement, When the slice closes, Then before/after byte counts for CLAUDE.md and rules.md are recorded in the FEAT notes. **rules.md's numbers recorded by this slice** in FEAT-272's "SLICE-172 close notes" (CLAUDE.md's own numbers were already recorded by SLICE-170/171).

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
