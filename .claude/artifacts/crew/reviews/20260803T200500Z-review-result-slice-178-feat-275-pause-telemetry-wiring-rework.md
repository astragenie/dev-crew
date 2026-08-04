---
slice: SLICE-178
feature: FEAT-275
kind: review-result
status: completed
decision: PASS
reviewer: independent (crew:reviewer, dispatched by team-lead)
date: 2026-08-03
---

# Re-review: SLICE-178 (FEAT-275) — pause-telemetry wiring, post-rework

## Decision: PASS

Supersedes `20260803T195500Z-review-result-slice-178-feat-275-pause-telemetry-wiring.md`
(FAIL). All four findings from that review are resolved. Spot-verified rather
than trusting the handoff at face value (see "Independent verification"
below) — did not re-run the full 3180-test suite since only the touched
surface was in question, but re-ran the specific affected test files, biome
lint on the touched files, and a full `tsc --noEmit`.

## Finding-by-finding verdicts

### Finding 1 (resumeSuccessRate inflation) — RESOLVED

`grep -rn "resume_success" src/` now returns hits only in: the
`PauseEventKind` type union, `summarizePauseRate`'s docstring/read-side
filter, explanatory comments in both touched files, and the
`pause-telemetry.test.mts` tests that exercise the *manual*
`recordPauseEvent`/`recordDispatchOutcome` primitives directly (still a
valid use — those aren't autoreachable emission sites, they test the
generic API the SOP's manual fallback still relies on). No code path emits
`kind: "resume_success"` automatically anymore.

- `close-dispatch-telemetry.mts`: `GateTelemetryDecision` no longer has a
  resumeSuccess field at all — replaced with `emitPauseEvent: boolean`. A
  skip-badge resolution now records `dispatch_outcome: "paused"` only (no
  `pause_event`); the only `pause_event` emission is the outright-unsatisfied
  branch (`emitPauseEvent: true`, `kind: "pause"`), which only grows the
  denominator. Verified in `recordGateDispatchTelemetry` and its test at
  `close-dispatch-telemetry.test.mts:152-166` ("must never emit
  resume_success (or any pause_event) for a skip-badge resolution").
- `wave/runner.mts`: the `pending_fix`-retry-PASS → `resume_success` branch
  and its now-unused `candidateLookupFn` parameter are removed outright.
  Confirmed via diff — `recordWaveDispatchTelemetry` only ever emits
  `dispatch_outcome` (paused/completed) and, on pause, a single
  `pause_event(kind="pause")`.

Chose option (a) from my prior review (stop emitting the unpaired event)
over altering `summarizePauseRate`'s denominator semantics — the narrower,
lower-blast-radius fix, and the right call since the read-side primitive
wasn't in this slice's scope.

### Finding 2 (default-mode builder-tier coverage gap) — RESOLVED via explicit scope narrowing + honest labeling

This was always going to require either real new coverage or an honest
disclosure that coverage stays narrow — narrowing was the FEAT owner's call,
which is appropriate (I don't own FEAT-275's scope; I own whether the result
is honestly represented). Judging the label specifically, per your ask:

`memory-snapshot.mts` now renders `Pause rate (reviewer/validator + wave
dispatches, last N): X%` (both live and stale branches). This names the
actual population instrumented rather than implying "last N dispatches"
means all dispatches fleet-wide. A reader of the auto-included snapshot can
now tell, from the bullet itself, that default-mode builder dispatches are
excluded — that was my original concern ("a confident number over a narrow
population is worse than an honest stale state") and this wording discharges
it. It doesn't spell out "excludes default-mode builder-tier" verbatim in
the bullet, but `FEAT-275.md`'s new "Scope note" section is thorough and
explicit about that gap, cites the FEAT-259 dependency, and explicitly
forbids re-opening this FEAT to attempt it before FEAT-259 lands — that's
the right place for the detail; the snapshot bullet only needs to avoid
overclaiming, which it now does.

### Finding 3 (skip-badge over-classification) — RESOLVED, with a residual heuristic risk noted as non-blocking

`noteIndicatesPause` keyword-matches the badge's `reason` string against
`["paus", "no artifact", "no handoff", "stalled", "idle", "mid-sentence",
"mid sentence", "did not return", "no response"]`. This correctly matches
the SOP's own suggested Option-B note template (`docs/sop/specialist-pause-handling.md`
§ Option B: `"Subagent paused without writing artifact..."` — contains
`"paus"`), and correctly rejects a policy-based note
(`"doc-only slice, no behavior changed"` — no keyword match), per the new
test at `close-dispatch-telemetry.test.mts:80-86`.

Residual risk (not blocking): this is a keyword heuristic, not a structured
field, so it can still mis-bucket in both directions — a genuine pause note
phrased outside this vocabulary (false negative → undercounts, the same
direction as before this fix) or a policy note that happens to mention e.g.
"no artifact expected for this doc change" (false positive → still
overcounts). This is a real but low-probability, low-severity residual gap
given real skip-note authorship tends to follow the SOP's template
phrasing closely (confirmed no live workflow-state.json skip-badge notes
exist in this repo's current state to check against, so this is inferred
from the SOP template rather than observed practice). Worth a follow-up
note (e.g. a FEAT or a `docs/memory.md` entry) if the keyword list proves
too brittle in practice; not worth blocking this slice on.

### Finding 4 (hardcoded PauseDetection) — RESOLVED for close-time, accepted as-is for wave

`detectionFromReason` in `close-dispatch-telemetry.mts` now derives
`scaffold_in_progress`/`mid_sentence` from the gate `reason` text when
present, falling back to `no_artifact` otherwise — reasonable, matches AC-2's
"correct PauseDetection kind" language as well as a retroactive text read
can. `wave/runner.mts` stays hardcoded to `"no_artifact"` as I'd said was
acceptable (a bare `WorktreeStatus` enum genuinely carries no better
signal) — confirmed no wider refactor was needed or attempted.

## Independent verification performed (not just trusting the handoff)

- `grep -rn "resume_success" src/` — confirmed no auto-emission site remains
  (see finding 1).
- `bun test src/tests/close-dispatch-telemetry.test.mts
  src/tests/wave-pause-telemetry.test.mts src/tests/pause-telemetry.test.mts
  src/tests/memory-snapshot-telemetry.test.mts src/tests/close-slice.test.mts`
  — 71 pass / 0 fail / 25 expect() calls.
- `bunx biome lint` on all four touched source files — only the
  pre-existing, unworsened `close-slice.mts` complexity-18 warning (matches
  the pre-slice baseline established in the prior review via `git stash`).
- `bunx tsc --project tsconfig.json --noEmit` — clean, exit 0.
- Did not re-run the full 3180-file suite or `--project tsconfig.test.json`
  since the lead's own pre-verification plus this targeted re-check cover
  the changed surface; no reason found to doubt the broader gate report.

## Recommended (non-blocking) follow-up

- If the skip-badge keyword heuristic (finding 3) proves too brittle against
  real badge notes once this ships, tighten it — e.g. require the note to
  match the SOP's structured "Required `--note` content" schema more
  strictly, or add a `--pause-detected` flag to `mark-badge` so the skip
  badge itself carries the signal instead of inferring it from prose.
