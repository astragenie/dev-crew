---
id: SLICE-45
title: Implement FEAT-017
status: completed
feature: FEAT-017
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-20
updated: 2026-08-20
tags: ["stack:typescript"]
completed_at: 2026-08-20
badges: [serial-reviewer-warning]
---
# SLICE-45: Implement FEAT-017

Implements FEAT-017. See [feature file](../../../backlog/in-progress/FEAT-017.md) for product context.

## Objective

Empty the legacy dispatch allowlist in guard-feat-dispatch: the allowlist of legacy /crew: and /runner: dispatch tokens was kept functional through the cutover; one release after devcrew 1.0.0 goes live, empty it so legacy tokens hard-fail, and update its tests accordingly.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given devcrew v1.0.0 has shipped AND one full release cycle has elapsed since, When this FEAT is picked up, Then the legacy /crew: and /runner: allowlist in guard-feat-dispatch is emptied.
- [x] AC-2: Given the allowlist is emptied, When a dispatch prompt uses a legacy /crew: or /runner: token, Then guard-feat-dispatch hard-fails it instead of silently permitting it through the (now-empty) allowlist.
- [x] AC-3: Given the existing guard-feat-dispatch-hook.test.mts suite currently asserts on allowlisted legacy-token behavior, When the allowlist is emptied, Then those tests are updated to assert the new hard-fail behavior instead of the old pass-through behavior.
- [x] AC-4: Given this FEAT is scored before devcrew 1.0.0 has shipped, When it reaches the autonomous loop's dispatch queue, Then it is NOT auto-dispatched until a human confirms the 1.0.0-plus-one-release timing gate has actually elapsed.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-017 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...

## AC evidence (close-time, lead; operator explicitly ordered the deprecation)

- 12 legacy crew:/loop: allowlist entries removed; zero legacy tokens remain in allowed[] (reviewer grep + live-fire on 4 payloads: legacy blocked exit 2 with successor message, devcrew token passes exit 0).
- Dead-end found in review (crew:deployer advice pointed at blocked devcrew:release-engineer) and fixed: successor allowlisted + SYSTEMIC reachability test that parses legacySuccessors and live-asserts every recommended token passes (mutation-verified both rounds).
- Historical claim verified two ways: runner: namespace never existed in this allowlist (git log -S + creation commit read).
- CHANGELOG Unreleased hard-break entry: announced at 1.0.0, enforced at 1.1.0.
- Review: needs_fix 20260820T010000Z -> approved 20260820T013000Z.
