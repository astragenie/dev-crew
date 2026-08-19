---
id: SLICE-30
title: Implement FEAT-012
status: completed
feature: FEAT-012
phase: null
priority: P2
target_release: null
requires_validation: true
risk: low
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:markdown"]
completed_at: 2026-08-19
---
# SLICE-30: Implement FEAT-012

Implements FEAT-012. See [feature file](../../../backlog/in-progress/FEAT-012.md) for product context.

## Objective

Clean up sales repo CLAUDE.md: remove the pre-existing UNMARKED duplicate 'Autonomous Loop — HARD RULES' section carrying dead /loop:slice and /loop:phase-gate references (predates the devcrew migration, traced to commit 89de31a 'agentic-setup rebuild'); keep the single devcrew marker block as the only loop-rules section; local commit in sales only.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given the sales repo's CLAUDE.md containing both the unmarked legacy 'Autonomous Loop -- HARD RULES' section and the devcrew marker block, When the cleanup runs, Then the unmarked legacy section is removed in full. Evidence: removed CLAUDE.md lines 111-129 (the `---` separator plus the unmarked 'Autonomous Loop — HARD RULES (summary)' section with dead `/loop:slice`/`/loop:phase-gate` refs), verified via `git diff -- CLAUDE.md` in sales repo — deletion-only hunk, no additions.
- [x] AC-2: Given the cleanup is applied, When CLAUDE.md is inspected afterward, Then exactly one loop-rules section remains (the devcrew marker block) and no dead /loop:slice or /loop:phase-gate references remain anywhere in the file. Evidence: `grep -n '/loop:' CLAUDE.md` → 0 matches; `grep -n 'Autonomous Loop' CLAUDE.md` → single hit at line 95 (inside `<!-- devcrew:start -->`/`<!-- devcrew:end -->` block).
- [x] AC-3: Given no other content in the sales repo's CLAUDE.md is in scope, When the diff is reviewed, Then it touches only the removed section's lines -- no unrelated edits. Evidence: `git diff -- CLAUDE.md` shows `1 file changed, 19 deletions(-)`, all in one contiguous hunk after `<!-- devcrew:end -->`; devcrew marker block (lines 92-110) byte-identical.
- [x] AC-4: Given the change is complete, When it is committed, Then it is a single local commit scoped to the sales repo only. Evidence: commit `db15fcd0c7b6d3c451eae44203b4be1fcdffc56f` on branch `gtm/lead-gen-system` in `C:\work\mega\sales`, message "docs: remove pre-migration duplicate loop-rules section (dead /loop: refs)", not pushed.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-012 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
