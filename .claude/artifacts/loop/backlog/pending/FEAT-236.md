---
id: FEAT-236
status: pending
priority: P2
category: maintenance
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: []
slices: []
derived_from: null
tags: [concern:maintenance, surface:plugin, stack:typescript]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Runner-owned cleanups from #365 step #9 (findings B3/M7/M8) — UNBLOCKED, no external dependency. Bundles: (B3) a real bug — crew resolution probes a hardcoded absolute path C:/work/mega/hero-crew BEFORE the plugin cache (slice-linker/crew-bridge.mts:39), wrong on every other machine; (M8) 51 dead exports incl. 7 named in the 2026-06-15 audit still present; a zombie codemod-add-any.mts; (misc) CLAUDE.md self-contradiction on /runner:slice start|complete vs /runner:start + /runner:close; validate-imports.mts exists but isn't wired into CI. (M7 any-debt burndown — 272 `: any` / 470 Record<string,any> — is a stretch slice, tracked but not required for close.) autonomous_safe: true — mechanical, behavior-preserving; B3 has a clear correct fix."
github_issue: 493
github_url: https://github.com/astragenie/runner-plugin/issues/493
---
# FEAT-236: repo cleanups — B3 hardcoded crew path, dead exports, CI wiring (#365 step 9)

## Problem

Step #9 of the #365 cross-repo consolidation plan — the runner-owned, unblocked
cleanups. Several are real defects, not just hygiene:

- **B3 (bug):** crew resolution probes a hardcoded absolute path
  `C:/work/mega/hero-crew/...` **before** the plugin cache
  (`slice-linker/crew-bridge.mts:39`). Wrong on every machine that isn't the
  author's — a latent resolution failure.
- **M8:** 51 dead exports, 7 of which were flagged for deletion in the
  2026-06-15 audit and are still present 22+ days later; a zombie
  `codemod-add-any.mts`.
- **CI gap:** `validate-imports.mts` exists but is not wired into CI (checker
  present, not enforced).
- **Doc drift:** CLAUDE.md self-contradicts on the slice ceremony command names
  (`/runner:slice start|complete` vs `/runner:start` + `/runner:close`).
- **(stretch) M7:** `any`-debt burndown — 272 `: any`, 470 `Record<string, any>`,
  111 `any[]` in non-test code (origin `codemod-add-any.mts`).

## Goal

Land the unblocked #365-step-9 cleanups: fix B3, delete dead exports + the
zombie codemod, wire `validate-imports` into CI, reconcile the CLAUDE.md
ceremony-command contradiction. Behavior-preserving.

## Proposed slices

- **SLICE-1 (B3, bug):** remove the hardcoded `C:/work/mega/hero-crew` probe in
  `crew-bridge.mts:39`; crew resolution falls through to the plugin-cache /
  standard discovery. Add a test asserting no absolute-author-path literal in
  the resolver.
- **SLICE-2 (dead code):** delete the 51 dead exports (start with the 7 audited
  2026-06-15) + zombie `codemod-add-any.mts`; grep-proof no remaining consumer.
- **SLICE-3 (CI):** wire `validate-imports.mts` into `.github/workflows/ci.yml`
  + CLAUDE.md CI-gates list.
- **SLICE-4 (doc):** fix the CLAUDE.md `/runner:slice …` vs `/runner:start`/`close`
  contradiction to the actual command surface.
- **SLICE-5 (stretch, M7):** begin `any`-debt burndown — replace the highest-churn
  `: any` / `Record<string, any>` with real types; not required for FEAT close.

## Acceptance criteria

- AC-1: GIVEN crew resolution, WHEN it runs on a machine without
  `C:/work/mega/hero-crew`, THEN it resolves via plugin cache / standard
  discovery (no hardcoded absolute path); a test forbids author-path literals.
- AC-2: GIVEN the dead exports + zombie codemod, WHEN removed, THEN suite + tsc
  green, grep shows zero consumers of the removed symbols.
- AC-3: GIVEN `validate-imports.mts`, WHEN CI runs, THEN it executes as a gate
  and fails on an unresolved/circular import.
- AC-4: GIVEN CLAUDE.md's ceremony-command section, WHEN read, THEN it names one
  consistent command surface matching the actual skills.
- AC-5: Full suite green; tsc + lint + format clean; snapshot-freshness passes;
  `validate-agent-refs` still green (touches docs).

## Risks

- Dead-export deletion: confirm no runtime-string/dynamic-import consumer before
  removing (grep + `validate-imports`).
- Keep slices independent so B3 (the bug) can land first without waiting on the
  larger any-debt work.

## Refs

- GH #365 step #9 + findings B3/M7/M8; consolidation artifacts in
  `plugins-common/docs/reviews/2026-07-07-cross-repo-consolidation-review-phase3-plan.md`.
- `slice-linker/crew-bridge.mts:39` (B3), `src/scripts/validate-imports.mts`, `codemod-add-any.mts`.
