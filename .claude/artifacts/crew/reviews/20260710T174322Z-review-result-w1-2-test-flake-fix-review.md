---
findings: "🔴:0,🟡:1,❓:0"
status: completed
decision: approved_with_notes
---
# Review Result: Review Result

- Created: 2026-07-10T17:48:07.306Z
- Reviewer: reviewer
- Decision: approved_with_notes
- Status: completed
- Summary: Extraction of resolveRecallCapMs is behavior-identical and the 3 new precedence tests are correct, but the diff silently drops the only test proving startSlice's dispatchInstruction still resolves when the astramem recall provider hangs forever.
- Evidence Checked:
  - src/scripts/lib/slice-linker/start-slice.mts:1069-1071 resolveRecallCapMs(config) = config?.memory?.recall?.timeoutMs ?? config?.memory?.capMs ?? DEFAULT_RECALL_CAP_MS
  - byte-identical to the prior inline expression (git diff main...fix/q2)
  - nullish (??) semantics preserved so capMs:0 behaves the same as before (untested pre-existing edge case
  - not a new regression). memory-transport.mts:79 confirms DEFAULT_RECALL_CAP_MS=5000
  - matching new test 3. Barrel src/scripts/lib/slice-linker.mts:11 re-exports resolveRecallCapMs alongside startSlice; test file imports only via the barrel (../scripts/lib/slice-linker.mjs)
  - respecting the sub-module import boundary validate-imports.mts enforces. 3 new tests (start-slice-recall-v1.test.mts:158-179) correctly cover all three precedence branches incl. explicit win-order (timeoutMs=1500 beats capMs=300) and both default-fallback shapes ({} and no-timeoutMs-no-capMs). Grepped src/tests/ and src/scripts/lib/slice-linker/start-slice.mts for other coverage of runRecallHook's hang-resilience (a never-resolving _setWireProvider recall) -- none found outside the deleted test; memory-sink.test.mts:274-289 covers capMs enforcement only for the sink/remember path
  - not recall.
- Files Reviewed:
  - src/scripts/lib/slice-linker/start-slice.mts
  - src/scripts/lib/slice-linker.mts
  - src/tests/start-slice-recall-v1.test.mts
- Test Adequacy: 3 new deterministic unit tests fully and correctly cover resolveRecallCapMs's precedence contract; the removed wallclock test's secondary assertion (dispatchInstruction still produced when the recall provider never resolves) has no remaining deterministic equivalent in this suite or elsewhere in the repo.
- Risks: Low: if a future astramem-client bump breaks recallSilent's capMs timeout wiring (renamed option, dropped enforcement, etc.), startSlice would hang indefinitely on a stalled recall call with no test in this repo catching it -- the only test that previously exercised that failure mode was deleted rather than de-flaked in place.
- Required Follow-up: Add back a lightweight async test using the same never-resolving _setWireProvider recall, but drop the tight wall-clock threshold that caused the flake -- just await makeStartedSlice() and assert result.dispatchInstruction is truthy, relying on bun test's own --timeout as the hang detector (or set an explicit generous per-test timeout, e.g. 10000ms) instead of comparing elapsed ms against a 3000ms cutoff.

