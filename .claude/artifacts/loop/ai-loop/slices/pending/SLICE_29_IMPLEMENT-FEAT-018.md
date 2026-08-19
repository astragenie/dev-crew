---
id: SLICE-29
title: Implement FEAT-018
status: pending
feature: FEAT-018
phase: null
priority: P2
target_release: null
requires_validation: true
risk: low
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
---
# SLICE-29: Implement FEAT-018

Implements FEAT-018. See [feature file](../../../backlog/in-progress/FEAT-018.md) for product context.

## Objective

Guarded-fire test coverage: crew/scripts/lib/guarded-fire.mts survived the GEPA deletion as relocated fail-soft infrastructure but its unit test was deleted with the gepa test tree (SLICE-22 grade note); write a fresh colocated bun:test suite covering fire-success, swallow-on-error, and timeout paths.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given guarded-fire's success path, When a colocated bun:test exercises a normal fire() call that completes without error, Then the test asserts the wrapped function's result is returned unchanged.
      Evidence: `crew/tests/guarded-fire.test.mts:16-22` ("fireGuarded lets a normal run() complete and does not swallow success"). Note — `fireGuarded`'s real signature is `Promise<void>` (it discards `run()`'s settled value by design, see module header); there is no return value to assert unchanged, so the test instead asserts `run()` was invoked and awaited to completion via a side-effect flag, which is the closest true statement of this AC for the actual contract.
- [x] AC-2: Given guarded-fire's fail-soft contract, When the wrapped function throws, Then a colocated test asserts the error is swallowed (not propagated) and the documented fallback/no-op behavior occurs instead.
      Evidence: `crew/tests/guarded-fire.test.mts:40-50` (async rejection) and `:52-68` (synchronous throw, defense-in-depth beyond the typed contract) — both assert `fireGuarded` resolves without throwing.
- [x] AC-3: Given guarded-fire's timeout path, When the wrapped function exceeds its configured timeout, Then a colocated test asserts the call is treated as failed/swallowed per the same fail-soft contract as the error case, not left hanging.
      Evidence: `crew/tests/guarded-fire.test.mts:70-108` (never-settling `run()` resolves at `timeoutMs`, not before/hung) and `:110-135` (slow `run()` exceeding `timeoutMs` is swallowed, never thrown). Both tests hold a ref'd `setTimeout` keepalive across the `fireGuarded` await — `fireGuarded`'s own race timer is `.unref()`'d by design (issue #360), so without a keepalive Bun's event loop has nothing ref'd left and idles forever instead of firing it; this is a bare-test-process artifact only, not a production change.
- [x] AC-4: Given the new test file, When `bun test src/tests/ --parallel --timeout 60000` runs, Then it passes and is picked up by the existing suite discovery with no separate CI wiring needed.
      Evidence: this repo's crew test tree lives at `crew/tests/`, not `src/tests/` (devcrew, not runner-plugin) — ran the repo-equivalent command instead: `cd crew && bun test tests/ --timeout 60000` → 1761 pass / 0 fail / 117 skip, 1878 tests across 179 files (68.30s), `guarded-fire.test.mts` picked up by ordinary glob discovery with no separate CI wiring.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-018 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
