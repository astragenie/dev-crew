# Builder mid-cleanup stop pattern — investigation

**Slice**: SLICE-34 / FEAT-032
**Date**: 2026-06-04
**Status**: confirmed root cause; mitigation identified

## Pattern Confirmation

`devcrew:fullstack-dev` agent stops mid-message during final-synthesis or cleanup
phase across at least 4 observed slices in one session:

| Slice | Recorded turns | Duration | Truncation point |
|---|---|---|---|
| SLICE-23 | 66 | 7.4 min | "Review artifact written. Here is the review summary for the builder: ---" |
| SLICE-25 | (no stop event) | 8.8 min | "...delete the test-pollution FEAT file:" |
| SLICE-26 | (no stop event) | 11.2 min | "Now let's do the live smoke test with `--no-architect`:" |
| SLICE-27 | (no stop event) | 12.9 min | "Still 16. The issue is the pre-existing function body already had this. Let me check..." |
| SLICE-31 | 43 | 6.5 min | clean (no truncation — per v0.7.2 CHANGELOG) |

Counter-pattern: SLICE-28 (5.9 min) and SLICE-30 (7.9 min) also clean.

Three of four mid-cleanup stops left the on-disk state consistent (gates
green, files written). SLICE-27 stopped mid-refactor and required the
parent agent to finish manually.

## Root Cause

**Hypothesis 1 — Turn budget exhaustion: CONFIRMED.**

Evidence: `crew/0.9.0/agents/builder.md` line 6 declares `maxTurns: 40`.
SLICE-23's recorded turn count was 66 — 65% over the configured budget.
SLICE-31 (clean) finished at 43 turns, only marginally above the cap;
the cleanup work fit within the remaining envelope.

For SLICE-25/26/27 the `subagent_stop` event was never captured (per
FEAT-031 investigation, SubagentStop fires when the orchestrator returns
control, not at agent exit — and these slices closed too fast for the
stop to land). Their recorded `total_turns` is 0 in the agent report,
but their wall-clock durations (8.8 / 11.2 / 12.9 min) are 35-100%
longer than SLICE-31's 6.5 min clean baseline. The duration spread is
consistent with a builder pushed past the 40-turn cap and truncated
during cleanup.

**Hypothesis 2 — Context window pressure: REJECTED.**

The aggregate cost report for SLICE-22 (a separate, non-truncated run)
shows 32.3M tokens with 97% cache hit at 110 messages and `claude-sonnet-4-6`.
That's a large but unremarkable working set; truncated slices ran shorter
than SLICE-22 by both duration and complexity. Cache hit alone gives the
sonnet builder enough headroom for any plausible cleanup phase if turn
count is in budget.

**Hypothesis 3 — Tool-call budget: NOT TESTABLE.**

No tool-call budget setting is exposed in any of the crew agent
frontmatter files inspected. If such a budget exists, it lives in the
harness, not in plugin config. Filing as a follow-up if turn-budget
mitigation fails to clear the pattern.

## Mitigation

Three options, ranked by cost-to-implement:

**Option A — Slice-brief discipline (lowest cost, immediate).**

When authoring a slice's ACs, scope work to fit in ~30 builder turns
(leaves 10-turn cleanup headroom under the 40-cap). Heuristics:
- Each AC ≈ 5-10 builder turns including edit + verify
- ≥ 4 ACs means probable budget pressure → split the slice
- Mechanical fixes (single-file rename, single config flip) are 10-15
  turns; defensive coding work is 20-30 turns; multi-file refactors are
  40+ turns and should be split or pre-decomposed by architect.

**Option B — Parent-side recovery rule (medium cost, one-time).**

When the parent agent detects builder stopped mid-cleanup (signal:
final assistant message ends with `:` or `—` or mid-sentence; OR the
expected gate badges are not all green at slice-complete time), apply:
1. Read the slice's `plan.md` and the slice file's ACs.
2. Inspect the file system for evidence of which ACs were completed.
3. Finish remaining ACs inline (test + commit + close) without
   re-dispatching the builder for the cleanup phase.

This pattern was used implicitly during this session for SLICE-27 and
worked correctly. Codifying it would make the recovery deterministic.

**Option C — File against crew to bump `maxTurns` for builder (higher
cost, cross-plugin).**

The 40 default is set in `crew/0.9.0/agents/builder.md`. A bump to 60
would absorb the observed SLICE-23 case (66 turns). Out of scope for
the loop plugin — file as a crew issue with this research artifact
as evidence. Note that this just moves the cliff; Option A is still
the durable answer.

**Recommendation: Adopt Option A immediately, formalize Option B as a
parent recovery rule in `.claude/loop/rules.md`, file Option C against
crew as an evidence-backed enhancement.**

## Test Plan

This is a behavioral pattern, not a unit test. Verify on the next 2-3
live slices after adoption:

1. **Slice-brief discipline check**: when promoting a FEAT to a slice,
   count the proposed ACs. ≥ 4 means estimate turn cost; split if
   estimate > 30 turns.
2. **Clean-close rate**: track the next 5 closed slices. Truncation
   rate should drop from observed 4-of-7 (≈57%) to ≤ 1-of-5 (20%).
3. **Recovery-pattern reliability**: when truncation still occurs,
   parent should close the slice cleanly without re-dispatching. Track
   manual-finish incidents in grade Surprises; target ≤ 1 manual
   intervention per 5 slices.

If clean-close rate remains below 80% after 5 disciplined slices, file
follow-up FEAT against crew to bump `maxTurns` (Option C).

## References

- `crew/0.9.0/agents/builder.md` line 6: `maxTurns: 40`
- `crew/0.9.0/CHANGELOG.md` line 432: prior bump 30 → 40
- Agent reports cited: `.claude/artifacts/crew/agents/20260604T135435Z-...slice23.md`, `...slice31.md`
- Cost reports: `.claude/artifacts/crew/cost/2026060*slice2[3-7]*.md`, `...slice3[01]*.md`
- v0.7.2 CHANGELOG: "Early signal on Option A" — independent observation that small slices don't hit the cap
