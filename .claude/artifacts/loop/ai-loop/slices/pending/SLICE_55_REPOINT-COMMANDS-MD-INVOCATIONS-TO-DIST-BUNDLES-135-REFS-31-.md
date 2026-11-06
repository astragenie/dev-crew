---
id: SLICE-55
title: "Repoint commands/*.md invocations to dist/ bundles (135 refs, 31 files)"
status: pending
feature: FEAT-037
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
effort_points: 2
proposed_slice_id_suffix: -SLICE-1
estimated_tokens: 100000
tags: ["stack:typescript"]
---
# SLICE-55: Repoint commands/*.md invocations to dist/ bundles (135 refs, 31 files)

Implements FEAT-037. See [feature file](../../../backlog/in-progress/FEAT-037.md) for product context.

## Objective

W2.5 path rewrite: point every shipped slash-command and agent prompt at the dist/ bundles so the plugin runs from a marketplace install without node_modules. FEAT-026 shipped self-contained dist bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js) and migrated hooks/hooks.json, but commands/*.md (91 refs) and agents/*.md (42 refs) still invoke crew/scripts/crew.mts and src/scripts/loop.mts, which resolve @astragenie/*, zod and yaml from node_modules and crash in a consumer repo. The consumer-install smoke test (src/tests/install/consumer-smoke.test.mts) carries these 42 CLI entries in EXPECTED_FAIL as a designed-red ratchet (DEC-044); CI gate 42 stays red until they are drained. Deliverable: rewrite every literal invocation of crew/scripts/crew.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js", src/scripts/loop.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js", crew/scripts/report-to-pr.mts, crew/scripts/prune-artifacts.mts and src/scripts/watch-tick.mts to their dist/ counterparts, across commands/, agents/ (excluding agents/3rdparty/), skills/, templates/ and CLAUDE.md marker blocks where they are product surface; keep this repo's own dogfood docs (docs/, AGENTS.md) on source paths where they describe development. Drain EXPECTED_FAIL in consumer-smoke to an empty array and make the ratchet assertion a hard green gate; update docs/ci-gates.md and docs/memory.md (DEC-044 note) to record that gate 42 is now blocking. Add a validator rule (crew/scripts/validate-agents.mts no-source-script-path, and a sibling check for commands/*.md) so a source-path invocation cannot creep back into product surface. Acceptance: consumer-smoke passes with EXPECTED_FAIL empty from a node_modules-free staged copy; grep for crew/scripts/crew.mts, src/scripts/loop.mts, report-to-pr.mts, prune-artifacts.mts, watch-tick.mts across commands/ agents/ skills/ templates/ returns zero hits outside an explicit allowlist (build-dist entry list, validator sources, tests); validate-agents, validate-agent-refs, validate-content-length, validate-repo-boundary, build-dist --check, generate-metrics-band --check all green; both test suites green apart from pre-existing flakes. Depends on FEAT-026 (done). Blocks FEAT-029 and FEAT-031. Serial on the shared branch, not a wave lane.

## In scope

- Rewrite every literal `bun "${CLAUDE_PLUGIN_ROOT}/<src-path>"` invocation
  (and the handful of unquoted/relative variants) in `commands/*.md` to its
  `dist/` bundle equivalent: `crew/scripts/crew.mts` -> `dist/crew.js`,
  `src/scripts/loop.mts` -> `dist/loop.js`,
  `crew/scripts/prune-artifacts.mts` -> `dist/prune-artifacts.js`,
  `src/scripts/watch-tick.mts` -> `dist/watch-tick.js`.
- Ratchet honesty in `src/tests/install/consumer-smoke.test.mts`: drop
  stale commands-origin `EXPECTED_FAIL` labels, surface agents-origin
  labels the old dedup was hiding, add the AC-2 floor assertion.
- Collateral fix: `commands/watch.md` prose + `src/tests/watch-scheduler-setup.test.mts`
  AC-8, whose "one script, never two implementations" invariant the dist
  rewrite necessarily splits (consumer-facing command vs. local-checkout
  scheduler registration).

## Out of scope

- `agents/*.md` (SLICE-56), `skills/**/SKILL.md` (SLICE-57),
  `crew/scripts/validate-agents.mts` no-source-script-path rule (SLICE-58),
  draining `EXPECTED_FAIL` to empty / the test's pass-fail heuristic
  (SLICE-59), `docs/ci-gates.md` + `docs/memory.md` DEC-044 update (SLICE-60).

## Acceptance criteria

- [x] AC-3 (commands-only slice of FEAT AC-3): Given `commands/`, When
  grepped for `crew/scripts/crew\.mts|src/scripts/loop\.mts|crew/scripts/prune-artifacts\.mts|src/scripts/watch-tick\.mts|crew/scripts/report-to-pr\.mts`,
  Then zero *invocation* hits remain. PASS — 135 of 138 baseline
  occurrences across 31 files rewritten to `dist/*.js` form (30 files
  edited); the remaining 3 raw-pattern hits are 2 explicit prose pointers
  (`orchestrate-slice.md:145-146` naming the two source files that ship
  under one `${CLAUDE_PLUGIN_ROOT}`; `triage.md:60` describing a fallback
  path removed 2026-06-11) — listed explicitly per the dispatch brief, not
  rewritten. `report-to-pr.mts` had 0 commands/ occurrences (PM-confirmed).
  Evidence: `grep -rn -E '...' commands/` -> only those 2 files/3 lines.
- [x] AC-2 (floor guard, added in this slice): Given the staged consumer
  copy, When `listShippedEntrypoints` runs, Then CLI entries stay >= 42
  (observed 63) and `dist/hooks/*.js` entries stay >= 11 (observed 21), now
  asserted explicitly in `consumer-smoke.test.mts`. PASS.
- [x] AC-1 / ratchet newlyBroken=[] (this slice's scoped portion; team-lead
  decision 2026-11-06 pulled the classification fix forward from SLICE-59):
  Given the rewrite, When `bun test src/tests/install/consumer-smoke.test.mts`
  runs, Then stale commands-origin `EXPECTED_FAIL` labels (42) are removed,
  the 6 agents-origin labels the old file+firstArg dedup was hiding behind
  them are added (confirmed real `Cannot find module '@astragenie/plugin-std'`
  crashes by direct execution), and `nowPassing` is `[]`. The ratchet's
  pass/fail predicate now calls `classifyRunResult()` (exported, with two
  dedicated unit tests using fixed crash/arg-error fixtures) instead of a
  bare `exitCode !== 0` check: `ok` (rc 0), `arg-error` (rc != 0, no
  module-resolution signature, non-empty CLI output), `crash` (matches
  `/Cannot find module|Module not found|Cannot find package|
  ERR_MODULE_NOT_FOUND|ENOENT.*node_modules|SyntaxError/`, or dies with
  empty output). Verified by direct execution against all 52 dist-form
  commands entries that every one classifies `ok` or `arg-error` (e.g.
  `repair-check refused: --failure-output <text> is required`, `No
  .claude/loop.json found`, the `watch-tick` registry-missing message,
  the harness's own literal never-shell-expanded `"$PWD"` producing
  `ENOENT ... mkdir '...."$PWD"...'`) — none hit the crash regex. PASS:
  `newlyBroken = []` and `nowPassing = []` both assert clean; only the
  designed-red "EXPECTED_FAIL non-empty" assertion still fails (6 real
  agents-origin crashes remain, SLICE-56's job) and SLICE-59 still owns
  draining `EXPECTED_FAIL` to empty + the AC-2 floor assertion (added
  early, in this slice, per the note above).
- [x] AC-5 (commands-only slice of FEAT AC-5): Given
  `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" audit --repo "$PWD"`,
  `.../dist/loop.js status ...` and `.../dist/crew.js brief-me ...`, When
  run from a staged, node_modules-free copy outside the plugin tree with
  `CLAUDE_PLUGIN_ROOT` set, Then all three exit 0 with real JSON output,
  never a module-resolution error. PASS (direct execution, 2026-11-06).
- [x] Collateral regression fix: `src/tests/watch-scheduler-setup.test.mts`
  AC-8 asserted `commands/watch.md` and the OS scheduler registration use
  byte-identical script paths — true before this slice, false after (the
  command now points at `dist/watch-tick.js`; the scheduler legitimately
  keeps `src/scripts/watch-tick.mts` since it registers a task against the
  local dev checkout, not a marketplace install). Updated the test to
  assert each independently and updated `commands/watch.md`'s prose to
  explain the split. PASS (re-ran green).
- [x] Validators + both test suites: `validate-agent-refs`,
  `validate-content-length`, `validate-repo-boundary`, `validate-manifests`,
  `validate-dispatch-markers`, `build:dist -- --check`,
  `generate-metrics-band --check`, `typecheck`, `lint`, `format:check` all
  rc=0. `bun test src/tests/ --parallel`: 3502 pass / 7 skip, failures
  limited to the known-flaky network-dependent slice-linker family
  (confirmed flaky on a stashed pre-change baseline run, same count) plus
  the one documented consumer-smoke gap above. `cd crew && bun test tests/
  --parallel`: 1834 pass, 1 flake (`validate-contracts` redocly timeout,
  passes in isolation, unrelated to this change).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-037 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
