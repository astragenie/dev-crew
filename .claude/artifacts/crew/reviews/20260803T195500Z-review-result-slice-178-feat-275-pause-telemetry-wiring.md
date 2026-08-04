---
slice: SLICE-178
feature: FEAT-275
kind: review-result
status: completed
decision: rejected
reviewer: independent (crew:reviewer, dispatched by team-lead)
date: 2026-08-03
---

# Review: SLICE-178 (FEAT-275) — pause-telemetry live-wiring

## Decision: FAIL

Gates (typecheck/lint/format/tests/validate-imports) were pre-verified by the
dispatching lead and are not re-run here per instruction. This review is
scoped to correctness/design of the telemetry wiring and the two builder
deviations.

## Scope reviewed

- `src/scripts/lib/pause-telemetry.mts` (staleness helper, AC-3/AC-4)
- `src/scripts/lib/memory-snapshot.mts` (staleness-gated render)
- `src/scripts/lib/wave/runner.mts` (AC-2 wave-mode wiring)
- `src/scripts/lib/slice-linker/close-slice.mts` + new
  `src/scripts/lib/slice-linker/close-dispatch-telemetry.mts` (AC-1 substitute)
- `docs/sop/specialist-pause-handling.md` (read for domain intent, not touched)
- Associated tests in `src/tests/`
- `wave/planner.mts` + its test were explicitly out of scope (different slice) — not reviewed.

## Findings, severity order

### 1. [MAJOR] `resumeSuccessRate` is structurally inflated by both new write paths — breaks AC-3's "reflects reality" goal

`summarizePauseRate` (`src/scripts/lib/pause-telemetry.mts:213-215`) computes
`resumeSuccessRate = count(pause_event.kind === "resume_success") / count(pause_event.kind === "pause")`
over **full history, unwindowed**. The pre-existing manual SOP convention
(`docs/sop/specialist-pause-handling.md` §1a) always writes these as a
**pair**: a `pause` event at detection, a `resume_success` event at
resolution — so the ratio is a real bounded fraction.

Both of this slice's new automatic write paths break that pairing:

- `close-dispatch-telemetry.mts:56-57` (`classifyGateForTelemetry`): a
  `*_skipped` badge is recorded as `{ outcome: "paused", resumeSuccess: true }`
  → `recordGateDispatchTelemetry` writes **only** a `resume_success`
  pause_event (see `src/tests/close-dispatch-telemetry.test.mts:136-148`,
  "records paused + resume_success for a skip-badge resolution" — 2 lines
  total: one `dispatch_outcome`, one `pause_event(kind=resume_success)`, zero
  `pause_event(kind=pause)`). The code comment even says so explicitly
  (`close-dispatch-telemetry.mts:87-92`): "not a synthetic fresh 'pause'
  detection we never actually witnessed."
- `wave/runner.mts:283-289`: a wave retry that PASSes after a prior
  `pending_fix` pivot also writes **only** a `resume_success` pause_event
  (confirmed in `src/tests/wave-pause-telemetry.test.mts:174-212`) — the
  prior failing attempt was recorded as `dispatch_outcome: "completed"`
  (FAIL ≠ pause in this code's own classification, see
  `wave-pause-telemetry.test.mts:112-129`), so no matching `pause` kind event
  was ever written for that lineage either.

Net effect: every skip-badge close and every successful wave retry-after-pivot
adds to the `resume_success` numerator without ever adding to the `pause`
denominator. Since both are legitimate, moderately common occurrences in this
repo (skip badges are an established, documented escape valve; wave retries
after a pivot are the wave runner's normal recovery path), `resumeSuccessRate`
will drift upward without bound over the life of `pause-events.jsonl` and can
mathematically exceed 100% — a metric that is supposed to read as "fraction of
detected pauses that resolved" instead reads as nonsense. This is exactly the
inflation risk the dispatching lead asked to be scrutinized, and it is real,
not hypothetical — both write paths independently reproduce it, which means
it's a systemic design gap in this slice, not a one-off.

**This alone should block PASS** — AC-3's purpose ("Pause rate ... reflects
reality") extends to `resumeSuccessRate`, which this repo's own snapshot
renders adjacent to the pause-rate bullet, and the new code makes it
increasingly wrong over time by construction.

### 2. [MAJOR] AC-1's substitute (close-time gate derivation) adds zero telemetry for the dominant real-world pause case — default (non-wave) builder dispatches

The builder's deviation-1 rationale (`dispatch.mts` truly has no
resolution-observation point) is **correct** — independently verified by
reading the full file: it only assembles prompt strings
(`buildDispatchInstruction`/`buildParallelFeBeInstruction`), with zero
execution/await/status machinery anywhere in the module.

But the chosen substitute — deriving `crew:reviewer`/`crew:verifier` outcomes
from close-time gate badges — does not cover what `docs/sop/specialist-pause-handling.md`
itself identifies as the dispatch role that still needs coverage:

> "**Builder-tier dispatches (`crew:fullstack-dev` / `crew:frontend-dev` /
> `crew:backend-dev`) are NOT covered by the scaffold contract** ... Section
> 2's manual fallback ... stays **ACTIVE** for: builder-tier dispatches ...
> Only skip straight to Section 1's scaffold-status check ... for
> `crew:inspector`/`crew:verifier` dispatches. For every other role, manual
> fallback remains the default path."

The SOP's own reproduction table (SLICE-52/53/54/56/57) shows builder pauses
as the recurring, still-unresolved case; reviewer/validator pauses are
largely self-healing via the 0.47.0 scaffold contract already. FEAT-275's
own motivating evidence ("7 real idle-without-report pauses observed on
2026-08-02") is far more likely to be builder-tier than reviewer-tier given
this.

In the **default** orchestrator mode (`loop.orchestratorMode: "slice-build"`,
non-wave — the repo's actual default per `CLAUDE.md` § Orchestrator mode),
this slice adds **no** telemetry for builder dispatches at all — the same
blind spot as before. Only the **opt-in** wave mode
(`loop.marathonRunner: "wave"`) gets a real, direct builder-outcome signal,
via `wave/runner.mts`'s `WorktreeResult.status` (that part is sound — see
"What works" below).

Additionally, given this repo's actual `reviewers.ladder: ["A"]` +
`loop.validation.satisfiedByReview: true` config (`CLAUDE.md` § "Reviewer
ladder presets"), `deriveValidationGate`'s result will almost always take the
`"review-badge:"` branch, which `classifyGateForTelemetry` explicitly does
**not** record (correctly — no validator dispatch happened). So in practice,
today, in this repo, the close-time path records outcomes for **`crew:reviewer`
only**.

Net: the snapshot's "Pause rate" bullet will now render a real-looking,
non-stale number sourced from a narrow, largely self-resolving population
(reviewer-gate outcomes), while the dominant documented pause source
(default-mode builder dispatches) stays completely dark — the same failure
mode FEAT-275 exists to fix, now wearing a "looks live" disguise. This is
worse than the pre-slice stale-but-honest state for anyone reading the
snapshot at face value in the default (non-wave) mode.

### 3. [MODERATE] Treating every `*_skipped` badge as "a specialist paused and was resolved" over-generalizes a badge that has other legitimate uses

`review_skipped`/`validation_skipped` (`review-gate.mts:103`, and the
generic `mark-badge` CLI) is a general gate-skip escape valve, used per the
SOP's Option B specifically for **pause resolution**, but not exclusively —
CLAUDE.md's own reviewer-ladder documentation and `close-slice.mts`'s
"explicit-waiver" branch show scope-based, non-pause skip decisions exist
too (and those correctly go through the separate, excluded
`explicit-waiver:` reason string). Any *other* skip-badge note not phrased as
an explicit waiver — e.g. a deliberate policy-based skip that never involved
a subagent going idle — gets misclassified as a resolved pause by
`SKIPPED_BADGE_PREFIX_RE`. Combined with finding #1, this compounds the
numerator inflation. Lower severity than #1/#2 because it requires a specific
badge-note phrasing to trigger, but worth a follow-up: at minimum, gate this
on the note text actually citing a pause (per the SOP's own required-note
schema, docs/sop/specialist-pause-handling.md § "Required `--note` content"),
not the badge name alone.

### 4. [MINOR] Hardcoded `PauseDetection: "no_artifact"` for all auto-recorded events

Both `close-dispatch-telemetry.mts:98` and `wave/runner.mts` hardcode
`detection: "no_artifact"` regardless of the real cause (`timeout` vs
`agent_error` in wave mode; unsatisfied-vs-skip-badge at close time). Given
the 3-value `PauseDetection` enum has no better fit for these mechanically-
derived cases, this is a defensible simplification, not a blocker — flagging
only because AC-2 literally says "the correct PauseDetection kind."

## Deviation verdicts (explicit, as required)

- **Deviation 1 (dispatch.mts has no resolution signal → substitute in
  close-slice.mts):** Claim (a) is **verified true** — `dispatch.mts` is
  pure prompt-string assembly, no execution/await/observation anywhere.
  Claim (b) — **not sound as delivered**. The substitute is a reasonable
  idea for the reviewer role specifically, but it does not fulfill AC-1's
  intent (capturing real dispatch-flow outcomes broadly) because it (i)
  never touches builder-tier dispatches in the default orchestrator mode —
  the SOP's own documented dominant pause case — and (ii) as built, distorts
  `resumeSuccessRate` (finding #1). Needs rework, not a nitpick fix.
- **Deviation 2 (no cost-trajectory day-based staleness convention;
  modeled on blocked-badge-staleness.mts):** **Verified correct and
  sound.** Independently confirmed `cost-regression.mts` /
  `cost-alert-loader.mts` use a count-window (`loop.cost.regression.window`),
  and `cost-scan-cursor.mts` uses a cursor, not a day-threshold — no
  cost-trajectory day-based staleness convention exists to reuse.
  `blocked-badge-staleness.mts`'s shape (config-resolve → evaluate → render)
  is the right precedent, and the builder additionally cited and reused the
  *value* of the other existing day-based staleness constant in this exact
  codebase, `loop.dispatch.pruneStaleAfterDays` (7d, already rendered in the
  same Loop-telemetry section) as the new field's default — good diligence.
  No issue here.

## What works (do not rework)

- `evaluatePauseTelemetryStaleness`/`resolvePauseTelemetryStaleAfterDays`
  (AC-3/AC-4): tail-safe, correctly gated on `dispatches > 0` in
  `memory-snapshot.mts` (matches pre-existing FEAT-212 omission behavior,
  not touched/broken), no-throw on missing/empty/malformed file — verified
  by reading `readPauseTelemetry`'s try/catch and the new function's early
  returns.
- Record schema: `DispatchOutcomeRecord`/`PauseEventRecord` shapes are
  unchanged — confirmed the 2026-07-02 historical rows in
  `.claude/artifacts/loop/pause-events.jsonl` (SLICE-134, plain
  `dispatch_outcome` rows) still parse under the new code paths; no schema
  migration needed.
- `close-slice.mts`'s cognitive-complexity-18 warning: confirmed
  pre-existing via `git stash` + `bunx biome lint` (18 both before and after
  this diff) — the extracted `recordCloseTelemetryIfCompletionClaim` helper
  did its job; not worsened.
- Wave-mode wiring (`wave/runner.mts`) for the PASS/FAIL/timeout/agent_error
  classification itself is a real, direct signal (`WorktreeResult.status`
  reflects an actual specialist dispatch resolving) — this part of AC-2 is
  sound in isolation; only the paired resume_success emission (finding #1)
  needs fixing.

## Required for PASS

1. Fix the `resume_success`-without-paired-`pause` emission in both
   `close-dispatch-telemetry.mts` and `wave/runner.mts` (finding #1) — either
   emit both halves synthetically when only the resolution is observed, or
   change `summarizePauseRate`'s `resumeSuccessRate` denominator to something
   that isn't silently skewed by asymmetric writers.
2. Either extend real coverage to builder-tier dispatches in the default
   (non-wave) orchestrator mode, or explicitly narrow AC-1/FEAT-275's scope
   (with the FEAT owner's sign-off) to "reviewer-gate outcomes + wave-mode
   builder outcomes only," so the snapshot bullet's documentation/framing
   doesn't overstate what's actually measured.
3. (Recommended, not blocking) Tighten the skip-badge classification
   (finding #3) to require the note actually cite a pause, per the SOP's own
   required-note schema.
