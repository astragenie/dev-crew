---
id: SLICE-154
title: Implement FEAT-256
status: completed
feature: FEAT-256
phase: null
priority: P2
target_release: null
requires_validation: false
risk: low
created: 2026-07-10
updated: 2026-07-10
github_issue: 426
github_url: "https://github.com/astragenie/runner-plugin/issues/426"
touches_files: [.claude/artifacts/loop/decisions/DEC-077.md, .claude/artifacts/loop/backlog/done/FEAT-102.md]
completed_at: 2026-07-10
---
# SLICE-154: Implement FEAT-256

Implements FEAT-256. See [feature file](../../../backlog/in-progress/FEAT-256.md) for product context.

## Objective

Tracker-provider program Phase 0 — hygiene: reconcile FEAT-102 (marked done with unsatisfied AC: Linear webhook receiver never built, LinearProvider still stub, no round-trip) by superseding it with this program's Linear work; record a DEC. Decide fate of scripts/linear-sync/ prototype (mention-parser + webhook router, unit-tested, wired to nothing): fold mention-parser/linear-types into the LinearProvider FEAT or delete — architect decides, record DEC. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5, review-approved: .claude/artifacts/crew/reviews/2026-07-09-tracker-provider-plan-review.md).

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1 (DEC artifact exists -- FEAT-102 reconciliation): Given FEAT-102 sits in done/ with unmet AC (webhook receiver never built, round-trip never verified, per its own AC list), When this FEAT's slice closes, Then a new `.claude/artifacts/loop/decisions/DEC-0NN.md` exists that explicitly supersedes FEAT-102, citing which of FEAT-102's ACs remain unmet and stating that this program's Phase 3 (LinearProvider, FEAT-252) and Phase 5 (issue-flow hooks, FEAT-254) are the superseding work items -- evidenced by the DEC file's presence and a `supersedes: FEAT-102` (or equivalent) frontmatter/body reference.
- [x] AC-2 (scripts/linear-sync/ fate -- DEC exists): Given scripts/linear-sync/ contains a unit-tested mention-parser and webhook router (linear-types.mts, mention-parser.mts, webhook-handler.mts) wired to nothing, When architect evaluates it during this FEAT, Then a DEC records one of two explicit outcomes -- (a) fold mention-parser/linear-types into FEAT-252's LinearProvider implementation, or (b) delete the prototype directory -- with rationale for whichever is chosen -- evidenced by the DEC body naming the specific real files retained or removed.
- [x] AC-3 (edge -- fold path leaves no scope creep): Given the DEC in AC-2 chooses to fold scripts/linear-sync/ modules into FEAT-252, When the fold is recorded, Then this FEAT's own scope stops at the DEC -- it does not itself move code -- and the DEC explicitly states execution is deferred to FEAT-252's own slice, preventing this FEAT's small effort_estimate from silently absorbing FEAT-252-sized work -- evidenced by the DEC body containing an explicit 'execution deferred to FEAT-252' (or equivalent) statement.
- [x] AC-4 (edge -- delete path leaves no dangling references): Given the DEC in AC-2 instead chooses deletion, When scripts/linear-sync/ is removed, Then a grep across the repo confirms zero remaining imports/references to the deleted paths (scripts/linear-sync/webhook-handler.mts, mention-parser, linear-types) -- evidenced by a validator or manual grep result recorded in the slice's validation artifact.
- [x] AC-5: Given the DECs required by AC-1 and AC-2 may be combined into a single document, When this FEAT closes, Then .claude/artifacts/loop/loop-snapshot.md's 'Recent decisions' section is regenerated to include the new DEC id(s), satisfying validate-snapshot-freshness.mts -- evidenced by a green CI run of that validator after the DEC(s) land.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-256 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...

## Evidence (2026-07-10)

- DEC-077 filed: `.claude/artifacts/loop/decisions/DEC-077.md` — FEAT-102 superseded-by-FEAT-252 reconciliation + scripts/linear-sync DELETE verdict (recorded as FEAT-252 SLICE-1 mechanical task; no deletion in this slice).
- FEAT-102 annotated: `## Reconciliation (DEC-077)` section appended, frontmatter untouched.
- Wave builder ran full ceremony in isolated worktree (branch main-SLICE-154, commit 9e515d26); deliverables hand-ported to this branch with id renumbering (builder allocated DEC-076/SLICE-148 from a stale base — collided with merged DEC-076 and main SLICE-148).
- requires_validation: false — pure docs/DEC work, no runnable behavior.
