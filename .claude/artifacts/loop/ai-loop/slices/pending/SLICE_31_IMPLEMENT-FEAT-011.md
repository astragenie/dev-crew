---
id: SLICE-31
title: Implement FEAT-011
status: pending
feature: FEAT-011
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
---
# SLICE-31: Implement FEAT-011

Implements FEAT-011. See [feature file](../../../backlog/in-progress/FEAT-011.md) for product context.

## Objective

Migrate the two skipped adopters (kb, standards): run the devcrew installer against each (they have no .claude/loop.json so migrate-adopter refused to render), pick a sensible preset per repo, then run migrate-adopter to collapse their crew:start marker blocks; both repos end with exactly one devcrew block, a devcrew.json, and a local commit.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given the kb repo with no .claude/loop.json, When the devcrew installer is run against it with a selected preset, Then it renders a valid loop.json and the repo becomes migratable. Evidence: `bun src/scripts/loop.mts install --repo "C:/work/mega/kb" --preset typescript-plugin-dev` wrote a valid `.claude/loop.json`; `migrate-adopter --dry-run` then reported `action: would-migrate` (no longer `no config`). Required a real fix to `migrate-adopter-markers.mts` first (SLICE-31 addendum in `migration-ledger-SLICE-26.md`) — the pre-fix collapse logic would have deleted kb's hand-authored CLAUDE.md body on apply; caught via dry-run inspection before any apply, scope adjusted by the lead to include the fix.
- [x] AC-2: Given the standards repo in the same pre-migration state, When the same installer+migrate-adopter sequence runs, Then it independently reaches the same end state without depending on kb's migration order. Evidence: standards installed/migrated after kb using the identical preset+sequence, ended in the same verified state (one devcrew block, devcrew.json schemaVersion 2, zero legacy markers) — no shared state or ordering dependency between the two runs.
- [x] AC-3: Given either repo after migration, When its CLAUDE.md is inspected, Then it contains exactly one devcrew marker block (no duplicate or orphaned crew:start blocks) and a devcrew.json is present. Evidence: direct grep against both live files — `<!-- devcrew:start -->`/`<!-- devcrew:end -->` count = 1 each, zero `crew:`/`runner:`/`loop:` legacy literals in either; `.claude/devcrew.json` present with `schemaVersion: 2` in both repos.
- [x] AC-4: Given the migration is complete for a repo, When the change is reviewed, Then it is captured as a single local commit in that repo (no push performed as part of this FEAT). Evidence: kb commit `200f26f2b05633716b372de5021859ff73f9b581` on `main`; standards commit `5fd6e553b31e7b20e49a454840c37a1a6b84ab60` on the repo's pre-existing checked-out branch `feat/adr-012-multi-tenant-schema` (not switched by this slice). No `git push` run against either repo.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-011 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
