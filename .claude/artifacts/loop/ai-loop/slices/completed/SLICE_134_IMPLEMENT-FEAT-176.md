---
id: SLICE-134
title: Implement FEAT-176
status: completed
feature: FEAT-176
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-07-02
updated: 2026-07-02
completed_at: 2026-07-02
---
# SLICE-134: Implement FEAT-176

Implements FEAT-176. See [feature file](../../../backlog/in-progress/FEAT-176.md) for product context.

## Objective

Tracking FEAT for the upstream-request `docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md`. This FEAT does NOT implement a fix — the fix lives in hero-crew (the agent-dispatch loop / specialist agent prompts). This entry keeps the open request visible in loop triage/snapshot until hero-crew ships it and loop re-pins the crew version.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: hero-crew issue/PR opened against `sergeymilashico/hero-crew` referencing the upstream-request doc. **Evidence:** `docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md` exists, tracks upstream FEAT-161 (hero-crew), and the fix it tracked landed upstream (parent-verified, pre-existing before this slice).
- [x] AC-2: upstream merges harness completion-enforcement (re-prompt once on artifact-less exit; else return `incomplete: true`) OR front-loaded-stub fallback. **Evidence (corrected post-review):** satisfied PARTIALLY via the front-loaded-stub fallback (Option 2) — crew FEAT-161 scaffold-first HARD OUTPUT CONTRACT (dev-team, SLICE-A `b31ca77` + SLICE-B `83fb35e`, 2026-06-11). Direct read of installed crew 0.47.0 confirms the scaffold contract SHIPPED only in `agents/inspector.md` and `agents/verifier.md` (reviewer/validator — the SOP's primary pause victims). `agents/{builder,builder-be,builder-fe}.md` do not exist in 0.47.0 (renamed to `frontend-dev.md`/`backend-dev.md`/`fullstack-dev.md`); those builder-tier agents instead were redesigned to never write a handoff artifact at all ("Builders do NOT write handoff artifacts ... NEVER invoke write-handoff") — a different mechanism closing the same gap. The aiplugin-dev extension (dev-team PR #150) is merged to dev-team main but UNRELEASED as of 0.47.0 — `.claude/artifacts/loop/pause-events.jsonl` shows `aiplugin-dev` pausing today (2026-07-02, FEAT-204/205/208/209/210/211/212/213/214) with note "agent lacks scaffold-first HARD OUTPUT CONTRACT". Accepted as sufficient for reviewer/validator only; aiplugin-dev coverage remains outstanding pending next crew release.
- [x] AC-3: loop `MIN_CREW_VERSION` (`src/scripts/lib/plugin-identity.mts`) bumped to the crew version that ships the fix. **Evidence:** bumped `0.31.1` → `0.47.0` in `src/scripts/lib/plugin-identity.mts` (the installed release carrying the reviewer/validator scaffold contract), with a corrected comment describing exactly which agents/roles are and are not covered. `src/tests/plugin-identity.test.mts` only asserts semver-parseable format, no literal-value pin — no test update needed. **Runtime-behavior note (per review):** this bump is NOT behavior-neutral — `src/scripts/lib/loop-installer.mts:61` gates `/runner:install` on `compareSemver(installedCrewVersion, MIN_CREW_VERSION) < 0`, so any environment running crew in `[0.31.1, 0.47.0)` that previously passed the install-compat check now gets refused. `requires_validation` reverted to `true` accordingly (see frontmatter) so the reviewer ladder's production-readiness pass covers this refusal-boundary change; no runtime install-refusal test added in this slice — flagged as a gap for the validator/next slice to exercise if judged necessary.
- [x] AC-4: `docs/sop/specialist-pause-handling.md` §2 manual-fallback marked retired/optional once the harness self-heals. **Evidence (corrected post-review):** §2 now narrows the "self-heals" framing to `crew:inspector`/`crew:verifier` dispatches only (confirmed scaffold contract present in both agent files). Manual fallback (Option A/B) is explicitly kept ACTIVE for builder-tier (`crew:fullstack-dev`/`crew:frontend-dev`/`crew:backend-dev` — no scaffold by design) and for `aiplugin-dev` (contract merged upstream via PR #150 but not yet released; cites today's `pause-events.jsonl` entries as live evidence), plus the pre-existing residual cases (vendored `3rdparty/*` agents, catastrophic pre-scaffold kills). §1 rewrite (FEAT-206) left intact.
- [x] AC-5: upstream-request doc `status:` updated to merged + tracking table closed. **Evidence (corrected post-review):** doc's scope is broader than "merged" supports — set frontmatter `status:` → `partial` (not `merged`) with `partially_resolved:`/`resolved_by:` fields documenting exactly what shipped (reviewer/validator, released) vs. what's merged-but-unreleased (aiplugin-dev) vs. resolved-by-different-mechanism (builder-tier). Tracking table gets a partial-close row plus a residual "next crew release re-pin" row (kept open, not closed) so the pending aiplugin-dev re-pin isn't lost. This documents a deliberate deviation from full closure per the coordinator's "your call, document it" latitude — the request cannot be marked fully merged while one of its three named components (aiplugin-dev) is unreleased.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-176 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
  above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
