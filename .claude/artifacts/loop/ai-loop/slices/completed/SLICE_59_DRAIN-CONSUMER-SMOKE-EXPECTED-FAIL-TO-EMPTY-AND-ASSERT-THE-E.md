---
id: SLICE-59
title: Drain consumer-smoke EXPECTED_FAIL to empty and assert the entry-count floor
status: completed
feature: FEAT-037
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-09
effort_points: 2
proposed_slice_id_suffix: -SLICE-5
estimated_tokens: 100000
tags: ["stack:typescript"]
touches_files: [src/tests/install/consumer-smoke.test.mts]
completed_at: 2026-11-09
badges: [serial-reviewer-warning]
---
# SLICE-59: Drain consumer-smoke EXPECTED_FAIL to empty and assert the entry-count floor

Implements FEAT-037. See [feature file](../../../backlog/in-progress/FEAT-037.md) for product context.

## Objective

W2.5 path rewrite: point every shipped slash-command and agent prompt at the dist/ bundles so the plugin runs from a marketplace install without node_modules. FEAT-026 shipped self-contained dist bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js) and migrated hooks/hooks.json, but commands/*.md (91 refs) and agents/*.md (42 refs) still invoke crew/scripts/crew.mts and src/scripts/loop.mts, which resolve @astragenie/*, zod and yaml from node_modules and crash in a consumer repo. The consumer-install smoke test (src/tests/install/consumer-smoke.test.mts) carries these 42 CLI entries in EXPECTED_FAIL as a designed-red ratchet (DEC-044); CI gate 42 stays red until they are drained. Deliverable: rewrite every literal invocation of crew/scripts/crew.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js", src/scripts/loop.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js", crew/scripts/report-to-pr.mts, crew/scripts/prune-artifacts.mts and src/scripts/watch-tick.mts to their dist/ counterparts, across commands/, agents/ (excluding agents/3rdparty/), skills/, templates/ and CLAUDE.md marker blocks where they are product surface; keep this repo's own dogfood docs (docs/, AGENTS.md) on source paths where they describe development. Drain EXPECTED_FAIL in consumer-smoke to an empty array and make the ratchet assertion a hard green gate; update docs/ci-gates.md and docs/memory.md (DEC-044 note) to record that gate 42 is now blocking. Add a validator rule (crew/scripts/validate-agents.mts no-source-script-path, and a sibling check for commands/*.md) so a source-path invocation cannot creep back into product surface. Acceptance: consumer-smoke passes with EXPECTED_FAIL empty from a node_modules-free staged copy; grep for crew/scripts/crew.mts, src/scripts/loop.mts, report-to-pr.mts, prune-artifacts.mts, watch-tick.mts across commands/ agents/ skills/ templates/ returns zero hits outside an explicit allowlist (build-dist entry list, validator sources, tests); validate-agents, validate-agent-refs, validate-content-length, validate-repo-boundary, build-dist --check, generate-metrics-band --check all green; both test suites green apart from pre-existing flakes. Depends on FEAT-026 (done). Blocks FEAT-029 and FEAT-031. Serial on the shared branch, not a wave lane.

## In scope

- `src/scripts/build-dist.mts`: `src/scripts/dispatch.mts` becomes the sixth CLI bundle entry (`dist/dispatch.js`); dist/ rebuilt and committed.
- `src/scripts/loop.mts`: the `dispatch` short-circuit resolves its sibling by the running file's extension (`dispatch.js` under dist/, `dispatch.mts` from source).
- `src/scripts/lib/install/shipped-entrypoints.mts`: CLI entry dedup key widened to the first two args so `dispatch prepare` and `dispatch finalize` are separate entries (review B of SLICE-56).
- `src/tests/install/consumer-smoke.test.mts`: EXPECTED_FAIL drained to `[]`; the designed-red assertion is now a hard gate (EXPECTED_FAIL empty AND zero module-resolution crashes); floor assertions kept.
- `src/tests/install/dist-fresh.test.mts`: fixed-CLI-entry assertion data-driven on six entries.

## Out of scope

- docs/ci-gates.md and docs/memory.md wording for gate 42 / DEC-044 (SLICE-60).
- commands/, agents/, skills/ path rewrites (SLICE-55/56/57, done) and the no-source-script-path validator (SLICE-58, done).
- Any further hardening of the smoke classifier beyond the two-arg dedup key.

## Acceptance criteria

> WARNING: ACs copied from FEAT-037 and shared across 6 sibling slices — scope per-slice before close

- [x] AC-1: Given a staged, node_modules-free consumer copy produced by `stageConsumerCopy` from src/scripts/lib/install/shipped-entrypoints.mjs, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then `EXPECTED_FAIL` is the empty set, the computed `newlyBroken` and `nowPassing` arrays are both `[]`, and the suite exits 0 -- gate 42 passes with no designed-red arm remaining.
  - Evidence (SLICE-59): `bun test src/tests/install/consumer-smoke.test.mts --timeout 300000` → 5 pass / 0 fail with `EXPECTED_FAIL = new Set([])`; newlyBroken=[] and nowPassing=[]; the former designed-red assertion now asserts EXPECTED_FAIL empty and zero observed module-resolution crashes.
- [x] AC-2: Given the same staged consumer copy, When `listShippedEntrypoints` runs against it, Then it returns no fewer than the 42 CLI entries plus 11 dist/hooks/*.js hook entries observed on 2026-11-06, and the suite asserts that floor explicitly, so a path rewrite cannot turn gate 42 green by shrinking the discovered entry list rather than by fixing the invocations.
  - Evidence (SLICE-59): Floor assertions (CLI entries ≥ 42, dist/hooks ≥ 11) retained and passing in the same run; dedup key widened to two args so the discovered list grew (dispatch prepare + dispatch finalize now distinct), it did not shrink.
- [ ] AC-3: Given commands/, agents/ excluding agents/3rdparty/, skills/ and templates/, When each is grepped for `crew/scripts/crew.mts`, `src/scripts/loop.mts`, `crew/scripts/report-to-pr.mts`, `crew/scripts/prune-artifacts.mts` and `src/scripts/watch-tick.mts`, Then zero occurrences remain outside an explicit allowlist covering the build-dist.mts entry list, the validator sources and the test files -- measured against the roughly 207 occurrences across 57 files counted on 2026-11-06.
- [ ] AC-4: Given an invalid product-surface file that reintroduces `bun crew/scripts/crew.mts audit --repo "$PWD"` into commands/ or agents/, When the new `no-source-script-path` rule runs via crew/scripts/validate-agents.mts and its commands/*.md sibling check, Then the validator exits non-zero and its output names the offending file and line number.
- [x] AC-5: Given `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" audit --repo "$PWD"` and the equivalent dist/loop.js invocation, When each is run from a working directory outside the plugin tree with CLAUDE_PLUGIN_ROOT set and no node_modules present anywhere on the resolution path, Then each exits 0 or with its own argument-validation error, and never with a module-resolution error -- pinning SLICE-52's lesson that a bundle is only self-contained once the shipped artifact has been run from a clean directory.
  - Evidence (SLICE-59): From a clean temp dir with CLAUDE_PLUGIN_ROOT set: `bun dist/loop.js dispatch prepare --repo <tmp>` → `--plan and --parent-branch are required`; `dispatch finalize` → `--run-id, --parent-branch, --plan are required` — the tool's own argument errors, no module-resolution error. dist-fresh.test.mts 13/13 (node_modules-free staged copy runs dist/loop.js). `bun src/scripts/build-dist.mts --check` → dist/ is up to date.
- [ ] AC-6: Given docs/ci-gates.md and docs/memory.md, When gate 42 is described in each, Then both record it as blocking rather than designed-red, docs/ci-gates.md states the runner retry policy for the staged suite, and the DEC-044 note in docs/memory.md (currently at lines 92-93, recording 42 held entries as of FEAT-026/SLICE-52) is updated to record that the ratchet drained in FEAT-037.
- [ ] AC-7: Given the branch after all slices land, When `bun run validate:manifests`, `bun ./src/scripts/validate-agent-refs.mts`, `bun ./src/scripts/validate-content-length.mts`, `bun ./src/scripts/validate-repo-boundary.mts`, `bun ./src/scripts/generate-metrics-band.mts --check`, `bun src/scripts/build-dist.mts --check`, `bun crew/scripts/validate-agents.mts` and both test suites run, Then all exit 0 apart from the six suites gate 42 already excludes by configuration.

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
