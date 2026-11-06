---
id: SLICE-54
title: Implement FEAT-028
status: completed
feature: FEAT-028
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
badges: [serial-reviewer-warning]
---
# SLICE-54: Implement FEAT-028

Implements FEAT-028. See [feature file](../../../backlog/in-progress/FEAT-028.md) for product context.

## Objective

Audit T6: one builder report contract (marker-first block); no publishing before review; validator rules

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given each of the four builder prompts, When `builder-report-contract.test.mts` runs, Then the marker-first block spec appears exactly once and none of them contain `report-to-pr`, `gh pr create`, `SendMessage`, or `git push`; every agent stays at or under 300 lines. Evidence: four builder prompts rewritten to the marker-first 4-line block (commits 506fd51e, 4ba1c01b); `cd crew && bun test tests/builder-report-contract.test.mts` -> 16 pass (block appears exactly once per builder; 0 hits for report-to-pr, gh pr create, SendMessage, git push, and the legacy "PR report"/"Narration without a posted" phrases across all four; line counts 255/282/246/249 <= 300). Review B's first pass caught stale "commit -> PR report" paragraphs left in frontend-dev.md:31 and aiplugin-dev.md:30; fixed in 4ba1c01b and locked by the extended test (verified by both reviewers to fail on 6fbc4807). Verifier independently grepped and counted (validations/20261106T172507Z-...).
- [x] AC-2: Given the new 4-line marker-first block as a fixture, When `crew/tests` for `incomplete-detector` and `subagent-gate-guard` run, Then both PASS unchanged (DONE is detected; the red gate still blocks). Evidence: `cd crew && bun test tests/incomplete-detector.test.mts tests/subagent-gate-guard.test.mts` -> 26 pass with the new 4-line block added as a fixture; `git diff 5fe21f91..HEAD` leaves crew/scripts/lib/subagent-return/incomplete-detector.mts and crew/hooks/lib/subagent-gate-guard.mts untouched (confirmed by reviewers A and B). Verifier drove the exported functions: `DONE:` first line recognised as terminal, `IN-PROGRESS:` as incomplete; runSubagentGateGuardHook returns decision:"block" for a DONE-shaped message while the review gate is red and null when gates are green.
- [x] AC-3: Given a fixture agent containing `node ./scripts/x.mts`, When `validate-agents.mts` runs, Then it exits `1` naming `no-relative-script-path`; given a fixture agent with no `tools:` that dispatches a non-allowlisted peer, Then it exits `1` naming `peer-dispatch`; given the real tree, Then it exits `0`. Evidence: `bun crew/scripts/validate-agents.mts` real tree rc=0 (26 agents + 14 3rdparty). New rules no-relative-script-path, no-prereview-publish, and peer-dispatch absent-`tools:`-means-all-tools in crew/scripts/validate-agents.mts, tested by crew/tests/validate-agents-feat-028.test.mts (7 pass). Verifier ran validateAgents() on isolated fixtures: `node ./scripts/x.mts` -> error naming no-relative-script-path; no-`tools:` architect without Peer-dispatch section -> peer-dispatch; builder with bare `git push` -> no-prereview-publish. The 11 live relative-path hits (architect.md, reviewer.md, verifier.md, aiplugin-dev.md, ...) now use `bun "${CLAUDE_PLUGIN_ROOT}/crew/scripts/..."`; repo-wide grep 0 remaining (review B).
- [x] AC-4: Given `commands/build.md`, Then it no longer contains "REQUIRE a `write-handoff`"; given `.claude/artifacts/loop/decisions/`, Then `DEC-040.md` exists. Evidence: commands/build.md has 0 hits for "REQUIRE a `write-handoff`"; skills/workflow/builder-ceremony/SKILL.md aligned. Decision landed as DEC-047 (DEC-040 and DEC-046 were already allocated on the branch; renumbered in 9d9703a4/6fbc4807) with DEC-038 marked status: superseded / superseded_by: DEC-047; hooks/report-gate.mjs diff is comment-only (+15/-0). src/scripts/validate-agent-refs.mts needed no change (it has no relative-path rule; spec mix-up with validate-agents.mts, noted in FEAT-028 intake notes). Gates: validate-agent-refs, validate-content-length, validate-manifests rc=0; crew suite 1819 pass / 0 fail.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-028 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: crew:typescript-reviewer — approved_with_notes (6fbc4807) then approved (re-review 4ba1c01b) — reviews/20261106T170006Z-..., 20261106T171349Z-...
- Reviewer B: crew:reviewer — needs_fix (6fbc4807: stale PR-report paragraphs in frontend/aiplugin) then approved (re-review 4ba1c01b) — reviews/20261106T170842Z-..., 20261106T171420Z-...
