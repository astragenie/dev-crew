---
id: FEAT-039
status: done
priority: P1
category: infrastructure
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-37]
derived_from: null
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=null → false"
started_at: 2026-06-04
slices_complete: [SLICE-37]
completed_at: 2026-06-04
---
# FEAT-039: re-read guard + model routing audit

**Problem.** SLICE-36 burned $85.97 in 11 minutes on 91 messages, 100% Opus, with 6 file re-reads flagged. Cost report shows the loop is leaning entirely on Opus for read-heavy work that Sonnet/Haiku could handle. Re-read flag has been observed but is currently informational only.

**Goal.** Reduce per-slice spend by (1) treating same-file re-reads as a defect with a hook, and (2) auditing where the loop dispatches Opus vs Sonnet so read-only / mechanical work routes to cheaper models.

**Proposed scope (decompose during triage).**

1. **Smarter re-read detector.** Current detector in `crew/scripts/lib/session-cost.mjs::recordToolUse` is path-only — it conflates legitimate paging (different `offset`/`limit` on a large file), legitimate cross-references, and the actual defect (re-reading a file you just edited or already have in context). Split into three counters:
   - `postEditReReadCount` — re-read after Edit/Write of same path within the window. The explicit harness anti-pattern.
   - `sameRangeReReadCount` — same path with overlapping `offset`/`limit`. Redundant whole-file reads.
   - `pagingReadCount` — same path with non-overlapping ranges. Not a defect, just signal.

   Acceptance criteria and the guard hook must use the defect counters, not the raw `reread:N` bag-of-paths.
2. **Re-read guard hook.** PreToolUse hook on `Read` that uses the smarter detector. Default: warn on `postEditReReadCount ≥ 1`, block on `sameRangeReReadCount ≥ 2`, with override flag. Paging is never blocked.
3. **Model routing audit.** Inventory every `Agent(subagent_type: ...)` dispatch site and document current model defaults. Identify candidates to move from Opus → Sonnet (read-only investigators, mechanical builders) and from Sonnet → Haiku (file lookups, small edits). Output: `docs/research/<date>-model-routing-audit.md` + ADR.
4. **Slice cost ceiling.** Add `costStopThreshold` enforcement at slice level (not just session). Halt + escalate when a single slice crosses configurable USD ceiling. Default suggestion: $50.
5. **Brief-me round-trip fix.** `crew brief-me` persists 66KB JSON then forces a Read tool call to consume it. Pipe through `jq` or expose a `--summary` mode that returns < 4KB.

**Acceptance signals.**

- Next 5 slices average per-slice spend drops measurably (target: < $25 avg vs current $32.60).
- `postEditReReadCount` ≤ 0 per slice (hard zero — re-reading a file you just edited is always a defect).
- `sameRangeReReadCount` ≤ 1 per slice. `pagingReadCount` unrestricted.
- Model burn table shows Sonnet share ≥ 30% of messages across 10 slices.

**Why autonomous_safe=false.** Changing default model routing affects every future dispatch; needs human review of routing table before merge. Re-read guard could legitimately block work the agent is doing — needs human sign-off on warn-vs-block defaults.