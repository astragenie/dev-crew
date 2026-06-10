---
id: FEAT-026
status: done
priority: P1
category: infrastructure
target_release: null
created: 2026-06-02
updated: 2026-06-02
depends_on: []
slices: [SLICE-12]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-02
slices_complete: [SLICE-12]
completed_at: 2026-06-02
github_issue: 53
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/53"
---
# FEAT-026: slice complete auto-detection of remaining slices — block premature FEAT roll to done/

Today `slice complete` unconditionally rolls the parent FEAT from in-progress/ to done/ unless --keep-feature-open is passed. For multi-slice FEATs this is wrong: shipping SLICE-A of a 3-slice FEAT also marks the FEAT done, hiding SLICE-B+C work from the backlog.

Both FEAT-006 (Plan Mode) and FEAT-025 (/loop:auto) were prematurely closed on 2026-06-02 by this bug. Manual workaround: revert with git mv, edit frontmatter slices_complete + slices_remaining lists, re-mark status: triaged. Brittle and easy to forget.

## Why P1

This is now a known footgun in the ceremony surface. Every multi-slice FEAT going forward will hit it unless agents remember --keep-feature-open. The protocol assumes 1 FEAT = 1 SLICE which is the simple case but the loop is designed to ship features across multiple slices when scope is large.

## Scope

1. Extend FEAT frontmatter schema with two arrays:
   - slices: [SLICE-NN, ...] (planned slices for this FEAT — already exists)
   - slices_complete: [SLICE-NN, ...] (auto-populated by slice complete)
2. Update scripts/lib/slice-linker/complete-slice.mjs::completeSlice:
   - On close, append sliceId to parent feature's slices_complete array (via backlog-writer frontmatter merge)
   - Compute remaining = slices - slices_complete
   - If remaining.length > 0:
     - Skip the moveFeatureToDone step
     - Return result.feature.skipped = true with reason: 'multi-slice: SLICE-B, SLICE-C still pending'
     - Mirror the existing skipped-shape used by --keep-feature-open
3. Honor --keep-feature-open as override (force keep open even if slices_complete == slices)
4. Add new flag --force-close (alias of current default behavior — explicit override to roll FEAT to done even with remaining slices, for cases where the agent wants to scope-down)
5. Update slice-from-feature to optionally accept --planned-slices 'SLICE-B-foo,SLICE-C-bar' that pre-populates the slices array. Optional — agents can also edit the file directly.
6. Update commands/slice-complete.md to document the new behavior + flags.
7. Backfill: write a one-shot script scripts/migrate-multi-slice-feats.mjs that scans done/ for FEATs whose slices_complete is shorter than slices and offers to revert. Run once locally then commit.

## Acceptance criteria

- AC-1: All tests pass (npm test) and lint clean (npm run lint)
- AC-2: slice complete on a FEAT with slices=[SLICE-A, SLICE-B] after only SLICE-A done → FEAT stays in triaged/, slices_complete: [SLICE-A] appended, returns skipped=true reason='multi-slice'
- AC-3: slice complete on the same FEAT after SLICE-B done → slices_complete becomes [SLICE-A, SLICE-B], FEAT moves to done/
- AC-4: --force-close on multi-slice FEAT → FEAT moves to done/ regardless of remaining slices, slices_remaining: [...] noted in frontmatter
- AC-5: --keep-feature-open on a FEAT with no remaining slices → still keeps it triaged (existing behavior preserved)
- AC-6: New unit tests in src/tests/slice-complete-multi-slice.test.mts cover ≥4 cases above
- AC-7: scripts/migrate-multi-slice-feats.mjs runs idempotently — dry-run mode lists drift, --apply mode reverts
- AC-8: commands/slice-complete.md updated; manifest validator passes

## Out of scope

- New top-level CLI command (this is a behavior fix in existing slice complete)
- Renaming slices_complete to anything else (avoid churn)
- Migrating the feature/slice cross-link format (linkage.mjs untouched)

## Depends on

- None — pure backlog ceremony fix