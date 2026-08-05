---
slice: SLICE-202
feature: FEAT-283
commit: 78e0d6ab2a9a2ad8bed8b15eff5d8665aab92d2f
reviewer: independent-review-agent
decision: approved_with_notes
---

# Review — SLICE-202: delete unbounded review-gate grandfather clause

## Scope confirmed

Commit `78e0d6ab` touches exactly two files: `src/scripts/lib/review-gate.mts`
and `src/tests/close-refusal.test.mts`. Diffed both against the parent commit
directly (not trusting the builder's report) — confirmed the change is
isolated to the `verdict.decision === null` branch (lines ~146-162), the
`legacy?: boolean` field removal on `ReviewGateResult`, and the module header
comment. The satisfied / rejected / unrecognized / absence-tolerated branches
are byte-identical in the diff — no incidental changes anywhere else in the
file. `src/scripts/lib/validation-gate.mts` has zero diff and zero stat
entries in this commit — confirmed untouched; its own null-decision
grandfather branch at `resolveVerdictOutcome` (~line 158) is correctly out of
scope here.

## Item-by-item findings

**1. Corpus count — reproduced independently, exact match.** Of 211 files
under `.claude/artifacts/crew/reviews/`, 160 lack a `decision:` frontmatter
line: 85 have no frontmatter block at all (don't start with `---`), 75 have a
block but no `decision:` line. Both figures match the builder's report
exactly.

**2. Open slices with frontmatter-less-only review evidence — builder's list
is incomplete.** Confirmed SLICE-118 and SLICE-119 (both `status: pending`,
each with 2 matching review artifacts, none carrying a `decision:` line).
Confirmed SLICE-128 and SLICE-130 are `status: done` in frontmatter despite
sitting physically under `pending/` — correctly excluded from risk by the
builder. **However, an independent sweep across every `status: pending` slice
turns up a case the builder did not name: SLICE-116.** It has 4 matching
review artifacts (`feat-169-slice-116` ×2, `feat-183-slice-116` ×2), all with
a frontmatter block and none carrying a `decision:` line — the same shape as
118/119. This is exactly the class of miss item 2 warned about: SLICE-116
will now silently fail to close (correctly, per the new behavior) until it
gets a re-review or an explicit `review_skipped` badge, and the operator was
not told. (Separately, and not this slice's doing: `SLICE-116` and `SLICE-117`
each have multiple *different* slice files sharing the same id under
`pending/` — a pre-existing id-collision issue, unrelated to SLICE-202, worth
its own ticket.) No other `status: pending` slice (117, 120, 122, 139, 183,
186, 191, 192, 193, 196, 197, 198, 199, 204) has any matching review artifact
at all — those fall into the absence-tolerated branch, a different and
untouched code path.

**3. `unproven` left `undefined` on the new branch — correct, traced both
consumers.** `classifyGateForTelemetry` (`close-dispatch-telemetry.mts:102-134`)
checks `gate.unproven === true` specifically to catch the absence-tolerated
case; with `unproven` undefined the new null-decision branch falls through to
the final "outright unsatisfied" clause, which records `outcome: "paused"`
with `emitPauseEvent: true` — the same treatment already given to rejected and
unrecognized verdicts. That's consistent, not special-cased. Also traced the
one other reader of `.unproven`: `validation-gate.mts:292`,
`if (reviewGate.satisfied && !reviewGate.unproven)`. Because the new branch
sets `satisfied: false`, this condition short-circuits on `satisfied` before
`unproven` is ever evaluated — so leaving `unproven` undefined cannot leak
into validation-gate's `satisfiedByReview` delegation regardless of its value.
No consumer misbehaves. Builder's judgment holds.

**4. No cutoff crept in — confirmed.** Full diff of `review-gate.mts` shows
no new constant, date comparison, or conditional branch of any kind — the
branch's `satisfied` return flips from `true` to `false` and the message
changes; that's the entire behavioral delta.

**5. Other branches untouched — confirmed by diff, not just report.** The
`REVIEW_SATISFIED`/`REVIEW_REJECTED` checks, the unrecognized-verdict
fallthrough, and the absence-tolerated fallthrough (now at different line
numbers but identical text) do not appear in the diff at all.

**6. `legacy` removal — confirmed complete.** Repo-wide grep for `legacy`
touching this contract turns up only: the removed field's own prior
definition (gone), the test's `assert.equal(gate.legacy, undefined)`
(intentional — asserts the field is gone), the updated module comment, and
unrelated doc/artifact prose (a FEAT and two artifact filenames that just
contain the word "legacy" in an unrelated context). No functional reader of
`ReviewGateResult.legacy` remains anywhere in `src/`.

**7. Inverted test — confirmed correct and would fail pre-fix.** The renamed
test now asserts `satisfied === false`, `legacy === undefined`, and a
`/no \`decision\` frontmatter key/` message — mutually exclusive with the old
code's `satisfied: true, legacy: true, reason: /grandfathered/`. The new
SLICE-181/182-shape test (prose-only `**Decision: PASS**`, no frontmatter
block at all) exercises the same branch and passes for the same reason.

## Gates run

- `bun test src/tests/ --parallel --timeout 60000`: 3292 pass, 7 skip, 1 fail
  (`capture-at-close-hook.test.mts` — one of the three files pre-disclosed as
  flaky under load per FEAT-286; not touched by this diff, unrelated to
  review-gate). `close-refusal.test.mts` in isolation: 13/13 pass.
- `bunx tsc --project tsconfig.json --noEmit`: clean.
- `bunx biome lint src/scripts/lib/review-gate.mts src/tests/close-refusal.test.mts`: clean.
- `bunx biome format` (check mode) on the same two files: clean.

## Decision rationale

The code change itself is correct, minimal, and exactly matches the slice's
"decided 2026-08-05: DELETE, don't bound" approach — no date/marker cutoff
anywhere, `legacy` field fully retired, unrelated branches provably
untouched, `unproven` semantics verified safe against both real consumers.
`approved_with_notes` rather than a clean `approved` because AC-6 asks for an
accurate report of open slices affected by the removal, and the builder's
report under-counted by one: **SLICE-116** needs the same treatment already
planned for SLICE-118/119 (re-review or an explicit `review_skipped` badge)
before it can close under the new gate.
