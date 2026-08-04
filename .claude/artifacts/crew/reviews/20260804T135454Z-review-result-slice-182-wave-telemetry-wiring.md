---
slice: SLICE-182
feature: FEAT-276
ac: AC-5
reviewer: independent-review-agent
review_decision: PASS
commit: 70b0746b
branch: worktree-agent-a00cabc5a0396f74f
worktree: C:\work\mega\runner-plugin\.claude\worktrees\agent-a00cabc5a0396f74f
date: 2026-08-04
---

# Review: SLICE-182 — wave packing width + per-rejection-reason telemetry

## Decision: PASS

## Summary

Builder's core claim is verified independently: `renderWaveTelemetry` in
`memory-snapshot.mts` existed with a passing test file but had zero
production callers pre-change (confirmed via the diff — `buildSnapshotLines`
never called it, and pre-change `loop-snapshot.md` had no "Wave telemetry"
section). This slice wires it in, adds `waveSize` + a categorized
rejection breakdown to `WaveIndexEntry`/`PlanBuiltEvent`, and regenerates
the snapshot. All backward-compat and no-fabrication requirements hold.
Gates independently re-run and match builder's report.

## Verification performed (independent, not builder-reported)

- `bun test src/tests/ --parallel --timeout 60000` → **3207 pass / 0 fail /
  7 skip** — matches builder's report exactly.
- `bunx tsc --project tsconfig.json --noEmit` and `--project
  tsconfig.test.json` → both clean.
- `bunx biome lint` / `biome format --check` scoped to this slice's 10
  touched/new files → clean (repo-wide `biome lint src/` shows pre-existing
  unrelated warnings, e.g. a complexity-16 finding in `cli.mts` — not
  introduced by this diff, not in the changed-file set).
- `bun ./src/scripts/validate-event-schemas.mts` → OK.
- `bun ./src/scripts/validate-snapshot-freshness.mts` → OK ("up to date").
- `bun ./src/scripts/validate-manifests.mts`, `validate-content-length.mts`,
  `validate-imports.mts`, `validate-agent-refs.mts` → all OK.

## Findings by task-scoped question

**1. Backward compatibility — PASS.** `WaveIndexEntry`'s four new fields
(`waveSize`, `rejectedConflict`, `rejectedMissingConfidence`,
`rejectedOther`) are optional (`index-sync.mts:20-31`). Read the live
`.claude/artifacts/loop/waves/index.json` on the main tree directly — its 3
real rows predate this field and omit it entirely. The generated
`loop-snapshot.md` diff (`.claude/artifacts/loop/loop-snapshot.md`) shows
the actual rendered output against that live data:
`Last wave: n/a (size=0, PASS=0, FAIL=0)` — the old `size=N` form, not
`packed 0/undefined` or `packed 0/0`. This is real production data
exercising the fallback path, not just a unit test.

**2. No fabricated coverage — PASS.** `memory-snapshot.mts:697-705`: the
rejection-breakdown block only renders when at least one of the three
`rejected*` fields is `!== undefined`; since `summarizeRejections()`
always sets all three together, there's no partial-fabrication path. Zero
counts render as literal `0` only when the source data is a real measured
zero (fields present), never invented for absent data. Test coverage at
`src/tests/wave/snapshot-wave-telemetry.test.mts` explicitly asserts the
omission case (`"falls back to size=N and omits the rejections line for
entries written before this field existed"`).

**3. FEAT-278 lower-bound problem — PASS, with a minor observation.**
Verified the comment exists at all three sink sites: `rejection-category.mts:10-16`
(definition), `wave/artifacts.mts:34` (index write), and
`memory-snapshot.mts:690-692` (render). Also confirmed against
`planner.mts:44-45` that `packWave`'s `if (picked.length >= opts.waveSize)
break;` does silently drop remaining ranked candidates without touching
`rejected`, matching the comment's claim. The rendered line itself
(`- Last wave rejections: N (conflict=X, missing-confidence=Y[, other=Z])`)
does not claim to be a total-candidates accounting — it labels itself
"rejections", which is an accurate description of `plan.rejected`'s
contents. Minor/non-blocking observation: the FEAT-278 caveat lives only in
code comments, not in the rendered artifact text itself, so an operator
reading only the `.md` file (not the source) has no in-artifact signal that
this is a lower bound. Not a fabrication and not blocking, but worth a
follow-up note if FEAT-278 lands and the gap becomes user-visible.

**4. Schema change safety — PASS.** `validate-event-schemas.mts` passes.
All four new properties in `wave-event.schema.json` (top-level and nested
`index[]`) are additive and non-required, so existing `plan_built` events
recorded before this change still validate — no consumer of the pre-change
event shape is affected by an additive optional-property change.

**5. `buildSnapshotLines(repoPath, ...)` signature — PASS.** Exactly two
call sites in the repo (`generateSnapshotContent`, `writeMemorySnapshot`),
both in `memory-snapshot.mts`, both updated in the diff
(`memory-snapshot.mts:619,629`). No other caller exists
(`grep -rn buildSnapshotLines src/` confirms). `renderWaveTelemetry` itself
guards on `existsSync(indexPath)` and returns `""` when absent, so a
missing `.claude/artifacts/loop/waves/index.json` (a real state — fresh
repo, no wave ever run) cannot throw; it degrades to omitting the section,
consistent with the "no fabricated zero" requirement.

**6. Scope discipline — PASS.** `git diff main...HEAD --stat` for
`planner.mts`, `touches-files.mts`, `planner.test.mts`, and
`mixed-confidence-order-independence.test.mts` (SLICE-180's file, merged to
main after this branch diverged) all return empty — untouched.

**7. Incidental blank-line fix — PASS, confirmed cosmetic.** Old
(unwired) `renderWaveTelemetry` started its returned array with a leading
`""`; the new version drops it since it's now spliced directly after
`renderDispatchLifecycle`'s own trailing `""`. Traced the actual
`.join("\n")` output against the real generated `loop-snapshot.md` diff:
exactly one blank line separates `## Dispatch lifecycle`'s last line from
`## Wave telemetry`, and one blank line separates the telemetry block from
`## How to use this file` — no double blank line, and
`validate-snapshot-freshness.mts` (which depends on this file's exact
shape) passes.

## Merge risk (flagged per dispatch instructions)

This branch diverged from main at `9bef0d29`; main has since advanced
through SLICE-180 (`1d7b45a1`) and a snapshot regen (`9bc386fa`) plus PM
scoring commits for FEAT-278/279/280. Diffing `merge-base(HEAD,main)..main`
scoped to this slice's touched paths
(`src/scripts/lib/wave/**`, `memory-snapshot.mts`,
`schemas/loop-events/**`, `loop-snapshot.md`) shows **only
`.claude/artifacts/loop/loop-snapshot.md` overlaps** — both branches
regenerate this generated artifact independently. This is a low-risk,
easily-resolved conflict (textual diff in a generated file); a post-merge
`bun src/scripts/loop.mts snapshot-memory` regen resolves it cleanly. No
overlap in source files — SLICE-180 touched `planner.mts` and its own test
fixture, neither of which this slice modifies.

## Verdict

PASS. No blocking findings. One non-blocking observation (FEAT-278 caveat
not surfaced in-artifact) and one flagged-but-low merge risk (generated
snapshot file regen conflict) — both safe to proceed with merge; the
snapshot conflict should be resolved by regenerating post-merge rather than
taking either side's stale numbers.
