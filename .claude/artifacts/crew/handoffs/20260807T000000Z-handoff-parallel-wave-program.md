# Handoff — parallel-wave program, wave 1 complete and unmerged

- **Date:** 2026-08-07
- **Owner (outgoing):** lead session, 2026-08-06
- **Owner (incoming):** unassigned — resume as lead
- **Confidence:** high on wave-1 state (every claim below re-verified on disk);
  medium on the wave-2 plan (never executed)

## RESUME HERE

Three reviewed, gate-green branches are sitting unmerged. Nothing is pushed.
`main` is at `c972fbff`; `origin/main` is at `bcc769b8` — **two local commits
ahead**.

**One decision blocks everything:** all three branches merge into `main`, and
every push this session reported
`Bypassed rule violations for refs/heads/main: Required status check "gate" is
expected`. Branch protection is not gating. Either push as-is (the user's
established pattern) or open a PR per branch so CI actually runs. Ask; do not
assume.

## Objective

Land a 10-item P0/P1 slate using parallel-worktree wave dispatch instead of
sequential slice ceremonies. Wave 1 (3 slices) is built, reviewed and green.
Waves 2+ are planned but not started.

## What shipped in wave 1 (all UNMERGED)

| branch | commits | verdict | suite |
|---|---|---|---|
| `main-SLICE-205` | `32dec9ef`, `ba8b247a` | approved_with_notes | 3293 pass / 0 fail |
| `main-SLICE-206` | `5d1090d4`, `fb82acb2` | approved_with_notes | 3302 pass / 0 fail |
| `main-SLICE-208` | `19c0fbd0`, `fb81234e` | approved_with_notes | 3303 pass / 0 fail |

Worktrees still on disk at `C:\work\mega\runner-plugin-SLICE-{205,206,208}-0`.
Dispatch run id `2026-08-06T17-40-47-027Z-01001e`, all three markers `DONE`.
Every review note was applied as a second commit on its own branch; all three
review artifacts carry a `decision:` key and a full compact-ISO filename with
time-of-day.

- **SLICE-205** (FEAT-295) — deleted validation-gate.mts's unbounded
  null-decision grandfather clause, twin of the one SLICE-202 removed from
  review-gate.mts.
- **SLICE-206** (FEAT-297) — fixed `extractAcceptanceCriteriaDetailed`
  truncating wrapped AC bullets to their first physical line; backfilled
  SLICE-197/198/199.
- **SLICE-208** (FEAT-296) — reconciled four slice-state drift cases, added
  `validate-slice-state-consistency.mts` as **CI gate 12**, renumbering old
  gates 12-18 to 13-19.

## The one result worth carrying forward

**Wave mode was never broken; it was unfed.** `wave plan` now packs `size=3`
where every prior run in this repo's history returned solo dispatch — and it
required **no code change**. Both "missing producer" pipelines (per-slice
`acceptance_criteria`, FEAT-290; declared `touches_files`, FEAT-292) were
complete end-to-end and simply had nobody writing the input.

That makes FEAT-290 and FEAT-292 materially cheaper than the PM scored them:
the expensive part was assumed to be plumbing that already exists. Anyone
picking those up should verify the producer instruction before writing code.

SLICE-205/206/207/208 are the first slices this repo has ever generated
without the shared-AC warning banner.

## Verification habit that must not be dropped

Every producer claim in this program was checked by round-tripping written
frontmatter back through the **real parser** (`parseProposedSlices`), never by
inspecting the writer's output. An inline-array write the reader could not
parse was the exact FEAT-288 defect, and it would have recurred silently.

Do the same for anything new. Two concrete near-misses this session:

1. A CRLF regression test I wrote **passed with and without the fix** because I
   used the prose bullet form; the defect only affects the checkbox form.
   Caught only by reverting the fix and confirming the test actually failed.
2. `pm-apply`'s contract is `featureId` / `scores{}` / `compositePriority` /
   `autonomousSafe` / `reasoning` — NOT the `pm_*` frontmatter names. It also
   needs FEAT-level `acs` in the body or `slice from-feature` refuses to
   scaffold. Both cost a round trip.

## Wave 2 — ready to dispatch, not started

Nine slices are now unblocked. FEAT-281/287/290's `proposed_slices` were
backfilled with `touches_files` + per-slice ACs in `c972fbff` (titles asserted
byte-for-byte against disk first — `pm-apply` rewrites the whole array, and a
drifted title breaks SLICE-192's identity keying).

**Slices are NOT yet created for these.** Create them **serially** —
slice-id allocation is fetch-scan max+1 with a known residual race
(FEAT-257/DEC-079), and FEAT-298 records five ids already reused from exactly
that mechanism.

Known conflict: **SLICE-207 (FEAT-299) collides with SLICE-191 on
`feature-lifecycle.mts`.** Do not pack them together. SLICE-207 exists and is
unbuilt.

`wave.size` is **3** (`.claude/loop.json`), not 4. `--size N` overrides without
editing config. `maxSubagentsPerSlice: 4` is a different setting and does not
govern wave width.

## Needs an architect, NOT a builder

- **FEAT-292** — three viable remediation directions, no obvious winner.
- **FEAT-298** — renumbering 12 files while keeping review artifacts and
  `github_issue` references attached; one dropped reference converts a
  collision into an orphan.

Both are `autonomous_safe: false` on the PM's judgement, which reads as sound.

## Open defects found but deliberately NOT fixed

1. **Hyphen-starting continuation lines are silently dropped** by the AC
   extractor — content vanishes with no trace. Same family as SLICE-206's
   truncation fix, different trigger. Nothing in FEAT-230 hits it. Recorded in
   `fb82acb2`'s message.
2. **Declared `touches_files` is optimistic.** SLICE-205 touched three real
   test files it never declared (`gates.test.mts`, `integration.test.mts`,
   `slice-complete.test.mts`) and disclosed it. Nothing collided, but the
   planner would have reported no conflict if a sibling had touched them.
   **This is direct evidence for how FEAT-292 should be built: derive paths
   from the actual diff, not a pre-build estimate.**
3. **SLICE-118 and SLICE-119** are the only open slices whose sole validation
   evidence is frontmatter-less. After SLICE-205 merges they cannot close
   without re-validation or an explicit `validation_skipped` badge. SLICE-118's
   directory drift was resolved by SLICE-208 (kept `completed/`, deleted
   `pending/`, verified no data loss); SLICE-119 is untouched.

## Corrections to earlier statements in this program

- Slate is **19 units, not 12** — FEAT-281/287/290 each decompose into 3
  slices.
- Wave width is **3, not 4**.
- FEAT-290 already carried per-slice `acceptance_criteria` on disk; only
  `touches_files` was missing there. FEAT-281/287 lacked both.
- SLICE-208's commit message calls moving a `superseded` slice into
  `completed/` "existing precedent." The reviewer verified it is the **only**
  superseded slice ever filed here — this commit **sets** the precedent. The
  outcome stands (no `superseded/` dir exists); the framing was wrong.
- SLICE-208's commit attributes the id-collision defect to FEAT-257; the
  backlog item is **FEAT-298** (FEAT-257/DEC-079 was the allocation-side fix).

## Backlog state

pending 0 / triaged 28 / in-progress 7 / done 196. FEAT-291 (P3), FEAT-293
(P2), FEAT-294 (P3) were scored and deliberately deferred — none is causing a
wrong answer today.

## Gates

CI gates are now **19**, not 18 — SLICE-208 inserted gate 12. Any doc citing
the old numbering is stale. `docs/ci-gates.md` and `CLAUDE.md` were verified
identical by extracting and diffing both lists.

After merging wave 1, regenerate gates **once for the wave**, not per slice:

```bash
bun src/scripts/loop.mts snapshot-memory --repo .
bun ./src/scripts/generate-metrics-band.mts --write
```

## Do not do

- Do not prune the six pre-existing worktrees (`backfill`, `feat-reconcile`,
  `fix-427-close-ceremony`, `fix-481-tdz`, `fix-format`, `release-073`) — five
  carry unmerged commits and `release-073` also has uncommitted changes.
- Do not create slices in parallel.
- Do not edit `.claude/loop.json`'s `wave.size` to widen a wave; pass `--size`.
