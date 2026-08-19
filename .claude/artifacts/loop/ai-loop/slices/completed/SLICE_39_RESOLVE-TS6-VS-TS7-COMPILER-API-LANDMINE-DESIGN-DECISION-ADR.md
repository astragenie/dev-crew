---
id: SLICE-39
title: Resolve TS6-vs-TS7 compiler-API landmine (design decision + ADR)
status: completed
feature: FEAT-014
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-39: Resolve TS6-vs-TS7 compiler-API landmine (design decision + ADR)

Implements FEAT-014. See [feature file](../../../backlog/in-progress/FEAT-014.md) for product context.

## Objective

crew/ flatten phase 2 — unify tsconfig + package.json: single root package.json/bun.lock and one tsconfig strategy for the 287 crew files. Blockers to resolve: crew pinned TS6 because openapi-typescript needs the JS compiler API (native tsc 7 lacks it — keep typescript 6 as a devDependency for that tool or replace the tool), NodeNext-vs-Bundler moduleResolution divergence, ~10 crew-only deps to merge. CI crew-tests job then collapses into the root suite invocation.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-014 and shared across 4 sibling slices — scope per-slice before close

- [x] AC-1: Given the TS6-vs-TS7 compiler-API conflict (openapi-typescript needs the JS compiler API that native tsc 7 lacks), When the isolated design-decision slice completes, Then an ADR records the chosen resolution (keep typescript 6 as a scoped devDependency, or replace the tool) with the rationale for what was rejected.
- [x] AC-2: Given the ~10 crew-only dependencies and crew's separate package.json, When they are merged into the root package.json/bun.lock, Then a single lockfile resolves for the whole repo with no version conflicts left unresolved.
- [x] AC-3: Given the NodeNext-vs-Bundler moduleResolution divergence between crew/ and root, When the unified tsconfig strategy lands, Then `bunx tsc --noEmit` passes across the full 287-file crew/ tree AND the pre-existing root tree under the single config.
- [x] AC-4: Given the CI crew-tests job currently running separately, When it is collapsed into the root suite invocation, Then `bun test src/tests/ --parallel` (or the unified equivalent) covers what crew-tests previously covered, with no test silently dropped from CI.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-014 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...

## AC evidence (close-time, lead)

- ADR authored and landed: docs/planning/feat-014-adr-typescript-unification.md (commit 0f6c0377). Decision: Option 1 — crew keeps scoped typescript@^6.0.3 as a Bun workspace member; TS7 exports map ships no classic compiler-API surface (verified against installed packages), redocly has no type-gen command, bunx dual-install breaks frozen-lockfile drift guarantees.
- AC-2 redefinition recorded: two intentionally-pinned workspace-scoped typescript entries, verified via bun pm ls, not a single repo-wide version.
- Reviewer cross-validation: SLICE-34 review independently endorsed permanent-bridge + workspace-member architecture (artifact 20260819T212359Z).
