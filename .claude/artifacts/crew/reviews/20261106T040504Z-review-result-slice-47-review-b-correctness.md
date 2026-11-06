---
findings: "[LOW] src/tests/install/fixtures/prepush-bash.json:1 — dead fixture. FEAT-022's body lists\n\"Fixtures: src/tests/install/fixtures/{pretooluse-bash,subagentstop-done,prepush-bash}.json\" as\nthree fixtures, but `fixtureForHookEvent` in shipped-entrypoints.mts only maps event names\n\"PreToolUse\" -> pretooluse-bash.json and \"SubagentStop\" -> subagentstop-done.json; there is no\nper-file (vs per-event) dispatch, so `hooks/pre-push-gate.mts` (registered on the PreToolUse event,\nconfirmed via hooks/hooks.json) receives the generic `pretooluse-bash.json` (\"bun test ...\" Bash\ncommand) fixture, never prepush-bash.json's realistic \"git push origin HEAD\" payload. The file is\nnever read by any code path today. Fix: either wire fixture selection by file match (not just event\nname) so pre-push-gate.mts gets the git-push-shaped fixture once FEAT-026 lets it run past module\nresolution, or delete the unused fixture now and re-add it when FEAT-026 lands. Not blocking —\ncurrently harmless because every PreToolUse-registered crew hook (pre-push-gate.mts included)\ncrashes at import time before ever reading stdin, so no test behavior depends on this fixture's\ncontent yet.\n\nNo other defects found in scope (`git diff a32f4f76..3da06c82`, 7 files). AC-2's revised 17->25/6/1\ncounts and AC-1's documented show-workflow-state gap were both independently re-derived from the\nlive files and are correct, not relitigation. Test is red for the designed reason; EXPECTED_FAIL\nentries spot-checked are genuine dependency crashes; package.json diff is the single described\nscript line; `bun run test` (gate 41) already discovers the new test file recursively without\nneeding `test:install` wired in; the permanently-red gate-41 status is adequately documented in the\ntest file header + slice AC-1 evidence + FEAT-022 body (optional nice-to-have: a one-line mention in\ndocs/ci-gates.md's gate 41 entry for drive-by CI readers, not required since gate 41's\nblocking/advisory status itself did not change)."
decision: approved_with_notes
---
# Review Result: SLICE-47 review B (correctness)

- Created: 2026-11-06T04:05:04.378Z
- Reviewer: B
- Decision: approved_with_notes
- Summary: SLICE-47 / FEAT-022 (merged 3da06c82, diff a32f4f76..3da06c82) implements the consumer-install
smoke-test harness (`shipped-entrypoints.mts`, `consumer-smoke.test.mts`, 3 fixtures, one
`package.json` script line). Both deviations the builder flagged were independently verified and
are judged acceptable, not defects:

1. AC-2's "17 bun hooks" is confirmed stale. Running `listShippedEntrypoints` against the real
   `hooks/hooks.json` + `commands/*.md` + `agents/*.md` today gives exactly 25 bun / 6 node / 1
   bash distinct entrypoints, matching the test's asserted counts exactly. Asserting the real,
   freshly-measured count (with the drift explicitly called out in the AC's own evidence text,
   citing the SLICE-46 "never trust a hand-curated count" lesson) is correct test design, not a
   silent relitigation of the AC.

2. `crew/scripts/crew.mts show-workflow-state` is confirmed absent from every `commands/*.md` and
   `agents/*.md` file (recursive grep, zero hits); `commands/build.md`'s collision pre-flight reads
   `workflow-state.json` directly via `jq` instead. Since `listMarkdownCliEntrypoints` only sources
   CLI entries from literal `bun "${CLAUDE_PLUGIN_ROOT}/..."` lines in those two globs (by design,
   so the list self-tracks a future dist/ path rewrite), that invocation structurally cannot appear
   in the entry/observed-failure set today. Documenting the gap instead of hand-injecting a fake
   entry is the right call; no AC-1 amendment required.

Test run confirmed red for the designed reason: 2 pass / 1 fail, failing at the final "EXPECTED_FAIL
is non-empty" ratchet assertion (consumer-smoke.test.mts:146), not a harness error. Spot-checked 3
EXPECTED_FAIL entries (`crew/hooks/otel-post-tool-use.mts`, `crew/scripts/crew.mts brief-me`,
`src/scripts/loop.mts list-presets`) by hand against a freshly staged node_modules-free copy built
via `stageConsumerCopy` — all 3 are genuine `Cannot find package/module` crashes, matching the
test's own failure regex.

Confirmed gate 41 (`slow-tests` job, `.github/workflows/ci.yml`) runs `bun test src/tests/` with
`--path-ignore-patterns` only for the 6 named worktree suites — this new test is NOT excluded, so it
runs and fails there permanently (by design) until FEAT-026 lands. `slow-tests` is not part of the
required `gate` check (confirmed in `docs/ci-gates.md` "Job structure and gating" — `gate` depends
only on `fast-gate`), so this does not block merges, matching the slice's own claim. The permanently-
red status is recorded in the test file's own header comment, the slice AC-1 evidence text, and the
FEAT-022 body's "Note in the wave plan" bullet — sufficient for a CI-job investigator, though neither
`docs/ci-gates.md` nor `CLAUDE.md`'s gate list calls it out by name (optional follow-up, not
required — gate 41's blocking/advisory status itself did not change, so the "update both files"
sync rule doesn't trigger).

`package.json` diff is exactly the one new `"test:install"` script line, nothing else changed.
`bun run test` (gate 41) already picks up `src/tests/install/consumer-smoke.test.mts` automatically
via `bun test`'s recursive directory discovery — confirmed directly against the real CI step's
command. `test:install` is a convenience subset-runner, not a wiring requirement.

One non-blocking finding below: `prepush-bash.json` is dead code.

Decision: approved_with_notes.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: Ran bun test src/tests/install/consumer-smoke.test.mts directly (2 pass / 1 fail at the designed EXPECTED_FAIL ratchet assertion, consumer-smoke.test.mts:146). Independently re-ran listShippedEntrypoints/groupDistinctFilesByRuntime against the live hooks.json+commands+agents tree -> 25 bun/6 node/1 bash, matching AC-2's asserted counts exactly. Recursive grep confirmed show-workflow-state appears nowhere under commands/ or agents/, and build.md's jq-based read instead. Spot-checked 3 EXPECTED_FAIL entries (otel-post-tool-use.mts, crew.mts brief-me, loop.mts list-presets) by hand against a freshly stageConsumerCopy'd node_modules-free tree -- all genuine Cannot find package/module crashes. Confirmed via .github/workflows/ci.yml that the slow-tests job's bun test src/tests/ invocation only --path-ignore-patterns excludes the 6 named worktree suites (this test is not one of them) and that gate (required check) depends only on fast-gate, not slow-tests/crew-tests/worktree-quarantine, per docs/ci-gates.md Job structure and gating.
- Risks: -
- Required Follow-up: -

