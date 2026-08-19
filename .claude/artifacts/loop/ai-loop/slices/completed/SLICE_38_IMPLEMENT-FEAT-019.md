---
id: SLICE-38
title: Implement FEAT-019
status: completed
feature: FEAT-019
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-38: Implement FEAT-019

Implements FEAT-019. See [feature file](../../../backlog/in-progress/FEAT-019.md) for product context.

## Objective

Cut devcrew v1.0.0: bump plugin.json + package.json from 1.0.0-rc.1, update CHANGELOG with the unification summary, bump the astra-marketplace devcrew entry version in a paired commit, tag v1.0.0. Production-promotion class: requires explicit operator approval at execution time — NOT autonomous_safe.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given plugin.json and package.json currently at 1.0.0-rc.1, When the release commit is prepared, Then both are bumped to 1.0.0 in the same commit.
- [x] AC-2: Given CHANGELOG.md, When the release commit is prepared, Then it contains a summary of the unification program (P0-P5) under the new 1.0.0 entry.
- [x] AC-3: Given the astra-marketplace registry's devcrew entry, When the paired commit lands, Then its version matches the newly-tagged 1.0.0 and `bun ./src/scripts/validate-marketplace-sync.mts` passes.
- [x] AC-4: Given all of the above is committed and reviewed, When the v1.0.0 tag is created, Then it is created and pushed ONLY after explicit operator approval at execution time -- no autonomous dispatch performs the tag/push step.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-019 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...

## AC evidence (close-time, lead-as-deployer, operator-approved)

- Version bumped 1.0.0-rc.1 -> 1.0.0 in plugin.json + package.json (validate-manifests green).
- CHANGELOG [1.0.0] unification summary section added above the rc.1 entry.
- Paired registry bump pushed FIRST (astra-marketplace 86227cf); validate-marketplace-sync verified OK (1.0.0 == 1.0.0) BEFORE the devcrew push.
- Tag v1.0.0 annotated + pushed with main (b455c492); tag verified present on remote.
- Release ran only after 42-gate CI full green on 72e9cadc; operator approval given in-session ("approve 014 and 019, cut v1.0.0").
