---
id: SLICE-38
title: Implement FEAT-019
status: pending
feature: FEAT-019
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
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

- [ ] AC-1: Given plugin.json and package.json currently at 1.0.0-rc.1, When the release commit is prepared, Then both are bumped to 1.0.0 in the same commit.
- [ ] AC-2: Given CHANGELOG.md, When the release commit is prepared, Then it contains a summary of the unification program (P0-P5) under the new 1.0.0 entry.
- [ ] AC-3: Given the astra-marketplace registry's devcrew entry, When the paired commit lands, Then its version matches the newly-tagged 1.0.0 and `bun ./src/scripts/validate-marketplace-sync.mts` passes.
- [ ] AC-4: Given all of the above is committed and reviewed, When the v1.0.0 tag is created, Then it is created and pushed ONLY after explicit operator approval at execution time -- no autonomous dispatch performs the tag/push step.

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
