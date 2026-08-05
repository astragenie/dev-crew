---
id: SLICE-193
title: Add CLI escape hatch to force-materialize one named proposed slice by id_suffix
status: pending
feature: FEAT-284
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-04
effort_points: 2
estimated_tokens: 100000
github_issue: 610
github_url: "https://github.com/astragenie/runner-plugin/issues/610"
---
# SLICE-193: Add CLI escape hatch to force-materialize one named proposed slice by id_suffix

Implements FEAT-284. See [feature file](../../../backlog/in-progress/FEAT-284.md) for product context.

## Objective

Give operators a supported way to materialize one specific proposed slice by
`id_suffix`, regardless of its index position.

This is the repair path the FEAT-284 incident actually needed and did not have.
When `slice from-feature` silently dropped FEAT-259's ordinal 1, there was no
CLI flag to create just that one slice — the repair went through direct
`BacklogStore.createSlice` API calls by hand. An undocumented hand-repair is not
a recovery path; it is a thing one person knew how to do once.

**Depends on SLICE-192.** That slice replaces the count-based cursor with
identity keying. Building this on top of the current positional logic would
produce a flag that still cannot express "create ordinal 1 while 2-5 exist".
Do not start this before SLICE-192 lands.

## In scope

- A flag on `slice from-feature` (e.g. `--only <id_suffix>` / `--force-slice`)
  that materializes exactly the named proposed entry and nothing else.
- Reject an `id_suffix` not present in the FEAT's `proposed_slices` with a clear
  error naming the available suffixes — do not silently no-op or create it.
- Refuse to create a duplicate of an already-materialized entry. Say so
  explicitly and exit non-zero rather than succeeding quietly.
- Docs: the flag must appear in the `slice requires a subcommand:` usage text at
  `loop.mts:1795` and in whatever operator-facing doc covers `slice
  from-feature`, so the next person finds it without reading source.

## Critical — publish exactly once

`loop.mts:1567-1574` publishes EVERY materialized slice to the tracker via
`publishSliceViaProvider`, then logs telemetry per slice. This is the mechanism
that turned the FEAT-284 duplicate slice into duplicate GitHub issue #598.

The escape hatch must publish the one newly-created slice and nothing else. It
must NOT re-publish already-materialized siblings, and when it refuses to create
a duplicate it must publish nothing at all. Assert this — a test that only checks
the created file would miss a spurious publish entirely, and the tracker side is
where the damage is externally visible and hardest to undo.

## Out of scope

- `proposed_slices_shipped` frontmatter shape — SLICE-191.
- The materialization keying itself — SLICE-192 (this consumes it).
- The git matcher — SLICE-194.
- Do not add a bulk repair or renumber mode; `backlog slice-renumber` already
  exists for a different problem. One named slice, one invocation.

## Acceptance criteria

Scoped 2026-08-05 to this slice. FEAT-level ACs 1/2/6/7 shipped in
SLICE-188/189, AC-3 in SLICE-190, AC-4 belongs to SLICE-192, AC-8 to SLICE-194.
FEAT AC-5 is this slice's AC-1 below.

- [ ] AC-1: Given an operator needs to repair a gapped FEAT, when they invoke the escape hatch targeting a specific `id_suffix`, then that exact proposed slice is materialized regardless of index position, without direct BacklogStore API calls.
- [ ] AC-2: Given an `id_suffix` not present in the FEAT's `proposed_slices`, when the flag is invoked with it, then the command fails with an error naming the available suffixes — it does not silently no-op and does not invent the entry.
- [ ] AC-3: Given an `id_suffix` that is already materialized, when the flag is invoked with it, then the command refuses, says so explicitly, exits non-zero, and creates nothing.
- [ ] AC-4: Given a successful single-slice materialization, when it completes, then exactly one slice is published via `publishSliceViaProvider` and no already-materialized sibling is re-published — asserted directly, since a test checking only the created file would miss a spurious publish and the tracker side is the externally-visible damage.
- [ ] AC-5: Given the refusal path of AC-3, when it triggers, then nothing at all is published.
- [ ] AC-6: Given the new flag, when a reader consults the CLI usage text at `loop.mts:1795` and the operator-facing docs, then the flag is documented in both — the FEAT-284 repair failed partly because no documented path existed.
- [ ] AC-7: Full suite green; typecheck + lint + format clean.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- **FEAT-284 stays in `in-progress/`** unless this is the last open sibling — only the final slice moves the feature to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
