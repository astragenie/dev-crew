---
id: SLICE-60
title: Record gate 42 as blocking in ci-gates and update the DEC-044 memory note
status: pending
feature: FEAT-037
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
effort_points: 1
proposed_slice_id_suffix: -SLICE-6
estimated_tokens: 60000
tags: ["stack:typescript"]
touches_files: [docs/ci-gates.md, docs/memory.md]
---
# SLICE-60: Record gate 42 as blocking in ci-gates and update the DEC-044 memory note

Implements FEAT-037. See [feature file](../../../backlog/in-progress/FEAT-037.md) for product context.

## Objective

W2.5 path rewrite: point every shipped slash-command and agent prompt at the dist/ bundles so the plugin runs from a marketplace install without node_modules. FEAT-026 shipped self-contained dist bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js) and migrated hooks/hooks.json, but commands/*.md (91 refs) and agents/*.md (42 refs) still invoke crew/scripts/crew.mts and src/scripts/loop.mts, which resolve @astragenie/*, zod and yaml from node_modules and crash in a consumer repo. The consumer-install smoke test (src/tests/install/consumer-smoke.test.mts) carries these 42 CLI entries in EXPECTED_FAIL as a designed-red ratchet (DEC-044); CI gate 42 stays red until they are drained. Deliverable: rewrite every literal invocation of crew/scripts/crew.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js", src/scripts/loop.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js", crew/scripts/report-to-pr.mts, crew/scripts/prune-artifacts.mts and src/scripts/watch-tick.mts to their dist/ counterparts, across commands/, agents/ (excluding agents/3rdparty/), skills/, templates/ and CLAUDE.md marker blocks where they are product surface; keep this repo's own dogfood docs (docs/, AGENTS.md) on source paths where they describe development. Drain EXPECTED_FAIL in consumer-smoke to an empty array and make the ratchet assertion a hard green gate; update docs/ci-gates.md and docs/memory.md (DEC-044 note) to record that gate 42 is now blocking. Add a validator rule (crew/scripts/validate-agents.mts no-source-script-path, and a sibling check for commands/*.md) so a source-path invocation cannot creep back into product surface. Acceptance: consumer-smoke passes with EXPECTED_FAIL empty from a node_modules-free staged copy; grep for crew/scripts/crew.mts, src/scripts/loop.mts, report-to-pr.mts, prune-artifacts.mts, watch-tick.mts across commands/ agents/ skills/ templates/ returns zero hits outside an explicit allowlist (build-dist entry list, validator sources, tests); validate-agents, validate-agent-refs, validate-content-length, validate-repo-boundary, build-dist --check, generate-metrics-band --check all green; both test suites green apart from pre-existing flakes. Depends on FEAT-026 (done). Blocks FEAT-029 and FEAT-031. Serial on the shared branch, not a wave lane.

## In scope

- Update docs/ci-gates.md gate 42 entry to record it as BLOCKING (not designed-red) with the runner retry policy (2 attempts, 720s per-attempt, serial, 6 suites excluded)
- Update docs/memory.md DEC-044 note to record the ratchet drain (49 → 42 → 6 → 0 across slices) and blocking status
- Add status note to DEC-044.md recording the drain date and gate 42 transition

## Out of scope

- Implementation of path-rewrites (completed in SLICE-55 through SLICE-59)

## Acceptance criteria

> WARNING: ACs copied from FEAT-037 and shared across 6 sibling slices — scope per-slice before close

- [ ] AC-1: Given a staged, node_modules-free consumer copy produced by `stageConsumerCopy` from src/scripts/lib/install/shipped-entrypoints.mjs, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then `EXPECTED_FAIL` is the empty set, the computed `newlyBroken` and `nowPassing` arrays are both `[]`, and the suite exits 0 -- gate 42 passes with no designed-red arm remaining.
- [ ] AC-2: Given the same staged consumer copy, When `listShippedEntrypoints` runs against it, Then it returns no fewer than the 42 CLI entries plus 11 dist/hooks/*.js hook entries observed on 2026-11-06, and the suite asserts that floor explicitly, so a path rewrite cannot turn gate 42 green by shrinking the discovered entry list rather than by fixing the invocations.
- [ ] AC-3: Given commands/, agents/ excluding agents/3rdparty/, skills/ and templates/, When each is grepped for `crew/scripts/crew.mts`, `src/scripts/loop.mts`, `crew/scripts/report-to-pr.mts`, `crew/scripts/prune-artifacts.mts` and `src/scripts/watch-tick.mts`, Then zero occurrences remain outside an explicit allowlist covering the build-dist.mts entry list, the validator sources and the test files -- measured against the roughly 207 occurrences across 57 files counted on 2026-11-06.
- [ ] AC-4: Given an invalid product-surface file that reintroduces `bun crew/scripts/crew.mts audit --repo "$PWD"` into commands/ or agents/, When the new `no-source-script-path` rule runs via crew/scripts/validate-agents.mts and its commands/*.md sibling check, Then the validator exits non-zero and its output names the offending file and line number.
- [ ] AC-5: Given `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" audit --repo "$PWD"` and the equivalent dist/loop.js invocation, When each is run from a working directory outside the plugin tree with CLAUDE_PLUGIN_ROOT set and no node_modules present anywhere on the resolution path, Then each exits 0 or with its own argument-validation error, and never with a module-resolution error -- pinning SLICE-52's lesson that a bundle is only self-contained once the shipped artifact has been run from a clean directory.
- [x] AC-6: Given docs/ci-gates.md and docs/memory.md, When gate 42 is described in each, Then both record it as blocking rather than designed-red, docs/ci-gates.md states the runner retry policy for the staged suite, and the DEC-044 note in docs/memory.md (currently at lines 92-93, recording 42 held entries as of FEAT-026/SLICE-52) is updated to record that the ratchet drained in FEAT-037.
  - **Evidence:** docs/ci-gates.md lines 225–238 record gate 42 as BLOCKING with retry policy (2 attempts, 720s per-attempt timeout, serial with 6 suites excluded). docs/memory.md lines 103–118 record gate 42 as BLOCKING with the drain history (49 → 42 → 6 → 0) and date transition. DEC-044.md lines 44–46 add a Status 2026-11-09 note confirming the ratchet drained in FEAT-037/SLICE-55–59 and gate 42 is now BLOCKING.
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
