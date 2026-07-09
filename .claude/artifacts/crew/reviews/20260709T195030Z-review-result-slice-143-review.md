---
findings: "🔴:0,🟡:1,❓:2"
status: completed
decision: approved_with_notes
---
# Review Result: Review Result

- Created: 2026-07-09T20:02:42.703Z
- Reviewer: reviewer
- Decision: approved_with_notes
- Status: completed
- Summary: PASS. All 5 ACs honestly covered by real (not mocked) I/O tests on this Windows box; claim-before-spawn, spawn-gate, and atomic-write correctness verified by code reading + test execution; no CRITICAL/HIGH findings.
- Evidence Checked:
  - bun test src/tests/watch-*.mts -> 32 pass/0 fail (includes real disk-read happens-before proof for AC-3
  - real concurrent updateStateAtomic proof for AC-5 same-file race
  - actual Windows rename-over-existing exercised not mocked). bun ./src/scripts/validate-imports.mts -> OK
  - watch/ boundary added without weakening slice-linker's existing BLOCKED_PATTERNS (verified via diff read + rerun). biome lint/format on touched files -> clean. Full suite bun test src/tests/ --parallel -> 2026 pass/46 fail/41 errors
  - ALL pre-existing (missing optional dep @astragenie/astramem-client
  - same error tsc --noEmit shows on main-line files untouched by this diff) -- zero watch-*.test.mts failures. Claim-before-spawn ordering in watch/tick.mts::sweepEntry is a straight-line await sequence (claimFinding awaited before exec.spawnReaction)
  - not Promise.all -- structurally unbreakable by casual refactor. fanoutEnvelope (webhook-fanout.mts:50-54) computes emittedAt via its own fallback chain (resolvedAt??ts??timestamp??now()) independent of payload shape
  - so the 422-on-missing-emittedAt risk flagged in the dispatch does not apply -- envelope-level emittedAt is always populated regardless of WatchTickPayload/WatchReactionPayload field names.
- Files Reviewed:
  - src/scripts/lib/watch/{types
  - registry
  - state
  - claims
  - spawn-gate
  - envelopes
  - tick}.mts
  - src/scripts/lib/watch.mts
  - src/scripts/validate-imports.mts
  - src/tests/watch-{claims
  - registry
  - spawn-gate
  - state
  - tick}.test.mts
  - .claude/artifacts/crew/contracts/20260709-feat242-watcher-contracts.md
  - .claude/artifacts/loop/ai-loop/slices/pending/SLICE_143_TICK-CORE-REGISTRY-STATE-MODULES.md
- Test Adequacy: 32/32 watch-*.test.mts pass, each AC-1..AC-5 backed by a real assertion against actual disk I/O (not mocked fs) run on Windows; AC-5's 'no lost update' claim rests on the contract's by-construction file-split design (tick.json vs reaction.json) plus a genuine 20-way concurrent same-file RMW test for the narrower same-writer race -- adequate given the documented design rationale (COND-2).
- Risks: MEDIUM: watch/envelopes.mts (emitWatchTickEnvelope/emitWatchReactionEnvelope) is fully implemented and live-wired into tick.mts's per-entry sweep loop in THIS slice (ahead of the contract's own Build Sequence, which assigns envelopes.mts + its tests to SLICE-146) but has zero direct unit test asserting WatchTickPayload/WatchReactionPayload field shape against contract §4 -- only indirectly exercised (no-op, since test registries have no real loop.json webhook config) via the AC-1..AC-5 tests. LOW: src/scripts/lib/watch/tick.mts is 428 lines, over the repo's ~400-line module-split convention (CLAUDE.md Repo conventions) -- will only grow when SLICE-144/145 add real claim-steal/ledger logic. LOW/informational: uncommitted .claude/loop.json diff (webhook url+tenantId+appId flipped from localhost dev to the already-known-elsewhere prod api.astrarunner.com endpoint) is sitting in the same working tree as this slice's changes but is unrelated to SLICE-143's scope (not a new/fabricated value -- same URL appears in CHANGELOG.md and astrarunner-ingest.test.mts already) -- flag so it isn't silently swept into the SLICE-143 commit without an explicit note.
- Required Follow-up: Before SLICE-146 ships envelopes.mts to a real webhook target: add a focused watch-envelopes.test.mts asserting the payload object shape/field names match contract §4 (ghSlug/shard/tenantId/appId/tickAt/findingsCount/skippedCeilingCount for tick; ghSlug/tenantId/appId/findingId/action/attemptCount/costUsd/outcome for reaction). Consider splitting tick.mts's gh-CLI adapter (buildDefaultTickExec) into a sibling module to stay under the ~400-line convention before SLICE-144/145 add more code to this file. Confirm the .claude/loop.json webhook diff is an intentional, separately-tracked change before it merges bundled with SLICE-143.

