---
id: SLICE-27
title: Astramem recall window + marketplace swap (operator-gated) + parent archive
status: pending
feature: FEAT-006
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 1
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 60000
tags: ["stack:typescript"]
---
# SLICE-27: Astramem recall window + marketplace swap (operator-gated) + parent archive

Implements FEAT-006. See [feature file](../../../backlog/in-progress/FEAT-006.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-006 and shared across 2 sibling slices — scope per-slice before close

- [ ] AC-1: Given migrate-adopter.mts --dry-run is run first against a fresh adopter enumeration, When the dry-run output is reviewed, Then it prints a per-repo diff touching only marker blocks, dispatch tokens outside those blocks, and config files -- zero unexpected file touches.
- [ ] AC-2: Given the installer regenerates marker blocks, When migrate-adopter.mts runs twice in sequence against the same adopter repo, Then the second run is a no-op (zero file diffs on the second pass).
- [ ] AC-3: Given the marketplace swap (crew+runner entries -> one devcrew entry) is the single most irreversible step in the whole program, When the migration script reaches that step, Then it halts and requires an explicit operator confirmation input before writing to astra-marketplace -- proceeding without that confirmation is a failing state for this AC.
- [ ] AC-4: Given one adopter repo is chosen for the live ceremony smoke test, When one full slice ceremony runs under /devcrew:* in that adopter, Then it completes PASS and the adopter's CLAUDE.md shows exactly one <!-- devcrew:start -->...<!-- devcrew:end --> block with zero leftover <!-- runner:start --> or <!-- crew:start --> blocks.
- [ ] AC-5: Given the astramem dual-project recall window is configured, When recall_memory(project:["dev-crew","runner-plugin"]) is queried post-cutover, Then it returns at least one pre-merge memory record from the runner-plugin project.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-006 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
