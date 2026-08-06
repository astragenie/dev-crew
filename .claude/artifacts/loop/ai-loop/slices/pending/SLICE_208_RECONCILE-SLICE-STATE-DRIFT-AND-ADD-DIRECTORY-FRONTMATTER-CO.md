---
id: SLICE-208
title: Reconcile slice state drift and add directory/frontmatter consistency validator
status: pending
feature: FEAT-296
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-06
updated: 2026-08-06
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
touches_files: [.claude/artifacts/loop/ai-loop/slices/pending/SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md, .claude/artifacts/loop/ai-loop/slices/completed/SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_128_GITHUB-CREW-PR-COMMENT-TEAMMATE.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_130_DECAY-RANKED-CITATION-TRACKED-LEARNINGS-RETRIEVAL-INJECTED-A.md, .claude/artifacts/loop/ai-loop/slices/pending/SLICE_55_WORKTREE-CREATION-AT-SLICE-START.md, src/scripts/validate-slice-state-consistency.mts, CLAUDE.md]
github_issue: 634
github_url: "https://github.com/astragenie/runner-plugin/issues/634"
---
# SLICE-208: Reconcile slice state drift and add directory/frontmatter consistency validator

Implements FEAT-296. See [feature file](../../../backlog/in-progress/FEAT-296.md) for product context.

## Objective

Slice-state filing drift: one slice exists in two state directories at once, and three more sit in pending/ while their own frontmatter says they are finished.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given SLICE_118_PAUSE-RESUME-CONVERSATION-LIFECYCLE-FOR-ASYNC-WAITS.md exists in both ai-loop/slices/pending/ and ai-loop/slices/completed/ with divergent status frontmatter, When this slice reconciles it, Then the decision is made on evidence (git history, review/validation artifacts) rather than by picking a copy, and only one copy remains.
- [ ] AC-2: Given SLICE_128 and SLICE_130 (status: done) and SLICE_55 (status: superseded) sit in pending/ while their own frontmatter contradicts that filing, When this slice ships, Then each is moved (or otherwise reconciled) to match its frontmatter status so pending/ no longer overcounts open work.
- [ ] AC-3: Given no gate currently asserts that a slice id appears in only one state directory or that its frontmatter status agrees with its directory, When the new validator (src/scripts/validate-slice-state-consistency.mts) runs, Then it fails on a slice id present in more than one state directory, and separately fails on a frontmatter-status/directory disagreement, in the style of the existing validate-slice-touches-files.mts.
- [ ] AC-4: Given the validator is new, When CI runs, Then it is wired into CLAUDE.md's numbered CI gate list so the four known cases cannot recur unnoticed.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-296 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
