---
id: SLICE-08
title: Wiggin -> dev-crew branding scrub (27 files)
status: completed
feature: FEAT-002
phase: null
priority: P1
target_release: null
requires_validation: false
risk: high
created: 2026-08-18
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-5
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-08: Wiggin -> dev-crew branding scrub (27 files)

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> Scoped at close: SLICE-08 = branding scrub over product surface + live scaffold.

- [x] AC-A: Zero wiggin hits outside 4 documented exclusion buckets (historical artifacts, live state, crew/ subtree pending P3 consolidation, docs/parents+planning archives). EVIDENCE: builder inventory 47→30 scrubbed; reviewer fresh grep 28 residual hits all in-bucket, zero outside.
- [x] AC-B: Meaning preserved; renames intact. EVIDENCE: reviewer byte-diff of dev-crew-method.md (only 2 name mentions changed of 123 lines), 3 git mv pairs staged, zero stray old-name refs, loop-installer.test 24/24.
- [x] AC-C: Gates green: validate-manifests, validate-content-length, root suite 3310/2 known (verified twice by name). EVIDENCE: review artifact 20260819T004500Z.
- [x] AC-D: CLAUDE.md history-note wording adjudicated acceptable (genuine rewrite, archaeology preserved in planning archive + git history).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-002 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
