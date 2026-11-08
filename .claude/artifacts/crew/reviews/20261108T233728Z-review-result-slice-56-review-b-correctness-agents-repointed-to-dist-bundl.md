---
decision: approved_with_notes
---
# Review Result: SLICE-56 review B (correctness): agents repointed to dist/ bundles; EXPECTED_FAIL drain

- Created: 2026-11-08T23:37:28.138Z
- Reviewer: B
- Decision: approved_with_notes
- Summary: SLICE-56 review B (correctness), commits 461bf617 + 5b186335 on ee8735a1.

Verification performed independently (not trusting builder counts):
- Baseline grep for crew/scripts/crew.mts|src/scripts/loop.mts|report-to-pr.mts|prune-artifacts.mts|watch-tick.mts in agents/ (excl. 3rdparty): 53 hits across 19 files at ee8735a1, 0 at HEAD. agents/3rdparty/ untouched (empty diff --stat).
- Read full agents/ diff line by line: every changed line swaps only the script-path token (crew/scripts/crew.mts -> "${CLAUDE_PLUGIN_ROOT}/dist/crew.js", src/scripts/loop.mts -> ".../dist/loop.js"); all flags/quoting/args byte-identical otherwise.
- Scope: git diff --stat ee8735a1..HEAD touches only the 19 agents/*.md files, the consumer-smoke test, and crew artifacts/slice file. No commands/, skills/, templates/, docs/, CLAUDE.md, dist/, src/scripts/.
- Ran src/tests/install/consumer-smoke.test.mts: 4 pass / 1 fail. EXPECTED_FAIL === ["dist/loop.js dispatch prepare"] exactly; newlyBroken=[] and nowPassing=[] both held (no assertion failure on those lines); failure is only the designed-red "stay red while EXPECTED_FAIL non-empty" assertion.
- Reproduced independently from a clean temp dir with CLAUDE_PLUGIN_ROOT set: both `dispatch prepare` and `dispatch finalize` crash identically with `error: Module not found ".../dist/dispatch.mts"` -- a genuine module-resolution error, not an argument error.
- Investigated why only `prepare` appears in EXPECTED_FAIL: read src/scripts/lib/install/shipped-entrypoints.mts. listMarkdownCliEntrypoints dedups by `${file}::${firstArg}`; for agents/swarm.md both dispatch call sites have firstArg "dispatch" (prepare/finalize is args[1]), so the scanner silently drops the second occurrence (finalize) and only ever registers/runs "dispatch prepare". This dedup logic is pre-existing and untouched by this diff -- the slice's rewrite only made the quoted dist/loop.js dispatch line visible to CLI_LINE_RE for the first time (bare unquoted form was invisible before). The slice does not introduce or worsen any hiding of a crash; it is a pre-existing scanner blind spot that now also affects `finalize`, fully disclosed in the test's inline comment and in AC-1/AC-5 evidence and the builder handoff. Not a regression, but a real residual gap: `dispatch finalize`'s crash is currently untested and unratcheted.
- The "2 dependent assertion fixes" (bun count 30->29, and asserting crew/scripts/crew.mts is now ABSENT from grouped.bun) are necessary consequences of the drain: independently confirmed commands/ has no remaining literal quoted invocations of the old paths (only two unrelated prose mentions), so crew.mts correctly has zero remaining producers of a bun entry.
- Full suite: `bun test src/tests/ --parallel --timeout 60000` with the 6 agreed path-ignores: 3418 pass / 7 skip / 1 fail (the same designed-red consumer-smoke assertion). No other failures; did not need to rerun anything as a flake.
- Slice file (SLICE_56_REPOINT-...) and handoff: ACs ticked with concrete evidence (grep counts, test run numbers, exact crash signature), no placeholder/"bullet 1" text, no leaked FORBIDDEN/RETURN task-scoped markers. Handoff explicitly reports an unrelated stray environment reminder it encountered and correctly ignored (matches what this review also observed independently).

Decision: approved_with_notes.
Note for follow-up (not a blocker for this slice's stated scope): `dist/loop.js dispatch finalize` crashes with the same module-resolution error as `prepare` but is invisible to the ratchet due to the pre-existing file+firstArg dedup in listMarkdownCliEntrypoints. Recommend the dedup key include the full args (or at minimum firstArg+secondArg) so finalize gets its own label and EXPECTED_FAIL entry when the follow-up dist/dispatch.js fix lands -- otherwise a future fix to `prepare` alone could leave `finalize` silently broken forever.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: consumer-smoke.test.mts: 4 pass / 1 fail (designed-red, EXPECTED_FAIL=[dist/loop.js dispatch prepare] confirmed exact, newlyBroken=[] nowPassing=[]); full src/tests/ suite with 6 agreed path-ignores: 3418 pass / 7 skip / 1 fail (same designed-red). Independently reproduced dispatch prepare+finalize module-resolution crash from clean temp dir.
- Risks: -
- Required Follow-up: -

