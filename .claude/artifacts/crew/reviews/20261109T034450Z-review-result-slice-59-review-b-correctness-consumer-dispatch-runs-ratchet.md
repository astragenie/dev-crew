---
decision: approved_with_notes
---
# Review Result: SLICE-59 review B (correctness): consumer dispatch runs, ratchet drained, full suite

- Created: 2026-11-09T03:44:50.516Z
- Reviewer: B
- Decision: approved_with_notes
- Summary: SLICE-59 review B (correctness), commits 2882126b/67e9ecc7/d1bcb181.

Core fix verified correct and working end-to-end, not just passing a narrow test:
- loop.mts resolves its dispatch sibling by thisFile's own extension (dispatch.js next to
  a .js loop.mts, dispatch.mts next to a .mts one) — correct logic, matches dist layout.
- build-dist.mts adds src/scripts/dispatch.mts as a 6th bundled CLI entry -> dist/dispatch.js,
  committed and fresh (build-dist.mts --check clean).
- shipped-entrypoints.mts dedup key widened from file::firstArg to file::(first two args).
  Confirmed via live scan against this plugin root: 82 CLI entries (floor 42), 21 hooks
  (floor 11), and dispatch prepare / dispatch finalize now resolve as two distinct entries
  (previously collapsed under one "dispatch" key) — nothing vanished, list only grew.
- Manual end-to-end proof beyond the test: from a clean temp dir with CLAUDE_PLUGIN_ROOT set,
  `bun dist/loop.js dispatch prepare|finalize` return their own arg-validation errors. I also
  ran both against a throwaway git repo + dummy plan file with a full plausible arg set
  (--plan/--parent-branch/--run-id) to push execution past arg parsing into dispatch's
  lazily-imported logic: prepare hit a repo-precondition TypeError, finalize hit an ENOENT on
  its run-dir file — both are dispatch's own logic errors, never a module-resolution error at
  any depth. This directly disproves the pre-fix crash mode.

Test results:
- consumer-smoke.test.mts alone, 4 runs: 3x 5 pass/0 fail, 1x 1 fail (newlyBroken = dispatch
  prepare+finalize, both showed empty stdout/stderr -> classifyRunResult's "empty output =
  crash" fallback, not a real module-resolution error). EXPECTED_FAIL=[] confirmed every run.
- Full suite `bun test src/tests/ --parallel` with the 6 ignores: 3518 pass, 1 fail — same
  empty-output flake, this time on an unrelated entry (crew/scripts/log_event.sh
  session_start), confirming this is a pre-existing Bun.spawnSync(timeout 30s)/classification
  design issue under parallel load, not specific to the dispatch fix. [MEDIUM]
  src/tests/install/consumer-smoke.test.mts:175 (combined.trim().length===0 => "crash")
  has zero slack now that EXPECTED_FAIL is empty — any transient empty-output entry fails
  gate 42. Pre-existing code, not touched by this diff, but this slice is what removes the
  buffer that was absorbing it. Worth a tracked follow-up (retry-once or raise the timeout).
- dist-fresh.test.mts: 13/13 pass, correctly data-driven on 6 CLI entries.
- cost-scan-cursor-honesty-guard/window-regression/project-slugify trio: 11/11 pass.
- crew/ suite (serial): 1844 pass / 0 fail (no redocly timeout this run).
- tsc --noEmit root: clean. Biome lint on the 5 touched files: 5 pre-existing warnings
  (useTemplate/useLiteralKeys/useOptionalChain elsewhere in loop.mts, unrelated to this diff)
  plus loop.mts:910 noExcessiveCognitiveComplexity on main() — pre-existing, already over cap
  before this diff, matches handoff's disclosure, no new complexity source added.

Scope: `git diff --stat d30ee0fb..d1bcb181` touches only build-dist.mts, loop.mts,
shipped-entrypoints.mts, dist/{dispatch.js,loop.js,.build-info.json}, the two tests, the slice
file — confirmed zero diff in docs/, commands/, agents/, skills/, templates/, CLAUDE.md.

Slice file: AC-1/2/5 checked with evidence that matches my own measurements. AC-3/4/6/7
correctly left unticked — explicitly out of this slice's scope per its own In/Out-of-scope
section (SLICE-60 owns docs; AC-3/4 are prior/future slices' work). No placeholders.

Decision: approved_with_notes. The dispatch-sibling fix and dedup widening are correct and
verified beyond the bundled test. The one finding is a pre-existing test-reliability gap
(empty-output-as-crash heuristic, no retry) now running with zero tolerance — not a defect in
this diff's logic, but worth a tracked follow-up since gate 42 is now a hard blocking gate.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: consumer-smoke 3/4 clean runs (1 flake, empty-output heuristic, unrelated entry on rerun); full suite 3518 pass/1 fail (same flake class); dist-fresh 13/13; cost trio 11/11; crew suite 1844/0 fail; tsc clean
- Risks: -
- Required Follow-up: -

