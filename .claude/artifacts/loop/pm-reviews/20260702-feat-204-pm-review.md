# PM review: FEAT-204 (2026-07-02)

```json
{
  "featureId": "FEAT-204",
  "scores": {
    "customer_impact": 0.75,
    "effort_estimate": 0.35,
    "strategic_alignment": 0.75,
    "technical_risk": 0.4,
    "dependency_depth": 0.1
  },
  "compositePriority": "P1",
  "autonomousSafe": true,
  "demandEvidence": "Retrospective Section 0.1 (H/Strong, \"pricing model arithmetically verified\"): removing duplicate reports drops the headline $34.5/iteration to $22.12, removing the opus outlier drops it to $7.03. I independently confirmed the root cause by reading src/scripts/lib/memory-snapshot.mts:45-90 (loadCostReportUSDValues): it sorts cost-report files by filename and pushes every file's fm.usd with no dedup key at all -- any sibling-FEAT report for the same session inflates the average by construction. Stakeholder: cost-advisor / stop-threshold logic that consumes loop.mts telemetry, and the operator reading loop-snapshot.md's cost trajectory line.",
  "scopeNotes": "Smallest deliverable: fix emission (crew-bridge.mts wave path, one report per session + shared_with: reference field) + fix snapshot averaging to dedup by session id -- both named directly in ADR-A's migration path (\"emission fix -> snapshot dedup -> optional backfill\"). What I'd cut: the optional historical backfill script -- ADR-A itself says \"leave historical reports inflated, annotate window\" as an acceptable interim state. No overlap with other FEATs in this batch. Effort calibration: closest analog is SLICE-83 ($41.39/18.4min, cross-repo small-behavior-change, 7 edits+7 writes) -- this touches fewer files (2 core: crew-bridge.mts, memory-snapshot.mts) but adds a new frontmatter field, so effort_estimate 0.35 (3 points) tracks slightly below the SLICE-83 analog. No dimension below the 0.80 weak-dimension threshold.",
  "risks": [
    "It is two weeks later and this slice failed review: the dedup key chosen isn't stable in current cost-report frontmatter (today's fields are slice, source_project, aggregate_all, source_count -- no session id) -- builder invents an ad hoc key that doesn't match how crew-bridge.mts actually groups siblings, silently over- or under-collapsing reports.",
    "Rollback: revert-only for the emission fix (git revert restores per-FEAT duplication, which ADR-A itself says is 'harmless to keep' as read-side dedup); IF a historical backfill script already ran and rewrote on-disk cost-report frontmatter, that needs a separate reversal step beyond git revert -- flag before running backfill.",
    "Coverage gap: no existing test asserts the snapshot's cost trajectory average against a fixture with intentionally duplicated session reports -- this is exactly the gap AC-4 below must close; a regression here would pass every existing test silently."
  ],
  "reasoning": "Technical risk band 0.3-0.5 (new frontmatter field shared_with: = additive data-shape change, no contract break, cross-module reach between crew-bridge.mts and memory-snapshot.mts, clean rollback). P1: verified-real ~5x telemetry corruption feeding cost-advisor and stop-threshold decisions, top-10 rank #1, quick-win effort, zero dependencies.",
  "acs": [
    "AC-1: Given a wave dispatch that spawns a shared session for FEAT-180 and FEAT-165 under SLICE-115, When crew write-final-synthesis (via src/scripts/lib/slice-linker/crew-bridge.mts) emits the cost report for that session, Then exactly one cost-report file is written under .claude/artifacts/crew/cost/, and the sibling FEAT's report references it via a shared_with: FEAT-XXX frontmatter field instead of duplicating the full usd/total_tokens payload.",
    "AC-2: Given the top-20 cost-report window contains a report and its shared_with reference for the same session, When loadCostReportUSDValues in src/scripts/lib/memory-snapshot.mts:45-83 computes the per-iteration cost trajectory, Then the referenced report's usd value is counted at most once toward the average, not summed once per sibling FEAT label.",
    "AC-3: Given a cost-report file whose shared_with field points to a session id with no corresponding primary report on disk (orphaned reference -- primary report rotated out of the top-20 window), When the snapshot averaging runs, Then it falls back to counting the orphaned report's own usd value rather than throwing, and the fallback is distinguishable in logs/output from a true duplicate.",
    "AC-4: Given a fixture reproducing the SLICE-115 wave shape (2 sibling FEAT reports pointing at 1 shared session, mirroring the historical byte-identical 20260613T092251Z/092249Z pair), When the dedup regression test runs, Then it asserts exactly 1 report contributes cost and N reports are recorded as references, and the computed average matches the deduplicated total."
  ]
}
```
