---
slice: SLICE-164
feature: FEAT-264
date: 2026-07-18
verdict: pass
scores:
  architecture_quality: 0.88
  reliability: 0.86
  observability: 0.85
  production_readiness: 0.84
  security: 0.86
  test_confidence: 0.92
  product_completeness: 0.90
composite: 0.87
---

## Lessons

- Pre-slice-1 design review (architect contract + adversarial architect-reviewer + QA-capability research, all recorded on #527) caught six defects that would each have been builder-time rework: a phantom grade dimension (`testability` never existed in SCORE_DIMENSIONS), an artifact path colliding with `deriveValidationGate`'s scan directory, an undefined "FIX badge" term, an unobservable ordering assertion (no repo-global events.jsonl; `runner:start` never calls `Agent()`), an isolation AC with only a negative bound, and two agent prompts (`qa-expert`, `test-automator`) structurally unable to perform their FEAT-264 roles. The `needs_contract: true` gate earned its cost several times over.
- Wave-parallel worktree builders with per-slice `touches_files` rails worked: 5 slices + 3 dev-team items built across 3 waves with zero file conflicts. The one coordination failure class was builders/reviewers idling without committing or delivering ("specialist pause") — every instance was recovered by checking branch state directly and finishing inline.
- Cross-plugin enforcement (runner writes lock files, crew's PreToolUse hook denies) needed an explicit wire-contract doc + upstream issue BEFORE SLICE-4 was buildable — prose sequencing notes are invisible to walkers; `depends_on` can't express cross-repo edges, so the FEAT body carries the authoritative blocker record.
- Repo auto-merge lands approved PRs in minutes: any commit pushed to a PR branch after approval is stranded (happened 3x). Treat a pushed PR branch as sealed; verify commit ancestry, not PR state.

## Surprises

- The adversarial reviewer found the gate-guard hook fired on the ABSENCE of an honest not-done marker rather than the PRESENCE of a DONE claim — it would have blocked honest `IN-PROGRESS` reports the moment block-mode was enabled. Plausible-looking enforcement code, wrong polarity; only an explicit false-block test hunt caught it.
- The W4 metrics band surfaced the poisoned cost statistic on main a second time because the dedup fix was itself stranded by the auto-merge window — the freshness gate then faithfully certified wrong numbers as "fresh." Freshness and truthfulness are different properties.
- dev-team's crew retry loops turned out to be markdown-SOP-driven with no code loop to instrument — the repair-signature dedup shipped as an adoptable CLI seam (`repair-check`) instead of a wired call site.

## Followups

1. Wire `qaGradeGate`'s sibling `gateFailedAtClose` badge into `docs/halt-badges.md` (pre-existing gap noted by SLICE-5 review).
2. Add `qa-gate-preflight.mts` to `validate-imports.mts` blockedPatterns for barrel parity (SLICE-3 review note).
3. Wire `repair-check` into ship/fix/incident SOP retry steps in dev-team (dev-team#259 review note).
4. Contract follow-up: extend the artifact-lock hook matcher to MultiEdit (bypass surface noted in dev-team#262 review; contract doc currently specifies Write|Edit only).
5. Loop-side halt-badge surfacing for SubagentStop gate-guard blocks (dev-team#257 AC leftover) — FEAT candidate.
6. Pilot `qa_gate: "pre-build"` on the `memory` repo after a bake window; flip hooks warn→block after warn telemetry review.
7. Demo recording (W4.1) still pending — README placeholder in place.
