---
id: SLICE-58
title: Add no-source-script-path validator rule for agents and commands
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
proposed_slice_id_suffix: -SLICE-4
estimated_tokens: 100000
tags: ["stack:typescript"]
touches_files: [crew/scripts/validate-agents.mts]
completed_at: 2026-11-09
badges: [serial-reviewer-warning]
---
# SLICE-58: Add no-source-script-path validator rule for agents and commands

Implements FEAT-037. See [feature file](../../../backlog/in-progress/FEAT-037.md) for product context.

## Objective

W2.5 path rewrite: point every shipped slash-command and agent prompt at the dist/ bundles so the plugin runs from a marketplace install without node_modules. FEAT-026 shipped self-contained dist bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js) and migrated hooks/hooks.json, but commands/*.md (91 refs) and agents/*.md (42 refs) still invoke crew/scripts/crew.mts and src/scripts/loop.mts, which resolve @astragenie/*, zod and yaml from node_modules and crash in a consumer repo. The consumer-install smoke test (src/tests/install/consumer-smoke.test.mts) carries these 42 CLI entries in EXPECTED_FAIL as a designed-red ratchet (DEC-044); CI gate 42 stays red until they are drained. Deliverable: rewrite every literal invocation of crew/scripts/crew.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js", src/scripts/loop.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js", crew/scripts/report-to-pr.mts, crew/scripts/prune-artifacts.mts and src/scripts/watch-tick.mts to their dist/ counterparts, across commands/, agents/ (excluding agents/3rdparty/), skills/, templates/ and CLAUDE.md marker blocks where they are product surface; keep this repo's own dogfood docs (docs/, AGENTS.md) on source paths where they describe development. Drain EXPECTED_FAIL in consumer-smoke to an empty array and make the ratchet assertion a hard green gate; update docs/ci-gates.md and docs/memory.md (DEC-044 note) to record that gate 42 is now blocking. Add a validator rule (crew/scripts/validate-agents.mts no-source-script-path, and a sibling check for commands/*.md) so a source-path invocation cannot creep back into product surface. Acceptance: consumer-smoke passes with EXPECTED_FAIL empty from a node_modules-free staged copy; grep for crew/scripts/crew.mts, src/scripts/loop.mts, report-to-pr.mts, prune-artifacts.mts, watch-tick.mts across commands/ agents/ skills/ templates/ returns zero hits outside an explicit allowlist (build-dist entry list, validator sources, tests); validate-agents, validate-agent-refs, validate-content-length, validate-repo-boundary, build-dist --check, generate-metrics-band --check all green; both test suites green apart from pre-existing flakes. Depends on FEAT-026 (done). Blocks FEAT-029 and FEAT-031. Serial on the shared branch, not a wave lane.

## In scope

- Add a `no-source-script-path` rule to `crew/scripts/validate-agents.mts` (gate 31)
  scanning `agents/*.md` (excluding `agents/3rdparty/`, already outside
  `enumerateAgents`'s one-level scan) for invocation-form references to the
  five retired source-script entry points.
- Add a sibling check in `src/scripts/validate-agent-refs.mts` (gate 6, no new
  CI gate) covering `commands/*.md`, `skills/**/SKILL.md`, and `templates/**`
  with the same "invocation form" definition.
- Share the matcher via `src/scripts/lib/source-script-path-rule.mts`
  (canonical) and a duplicate at `crew/scripts/lib/source-script-path-rule.mts`
  (required by the crew-to-root import-boundary gate's zero-entry allowlist).
- TDD coverage: `crew/tests/validate-agents-no-source-script-path.test.mts`
  and `src/tests/validate-source-script-path-refs.test.mts`.

## Out of scope

- Draining `EXPECTED_FAIL` in `src/tests/install/consumer-smoke.test.mts`
  (AC-1/AC-2) — owned by SLICE-59.
- The actual commands/agents/skills/templates path rewrite (AC-3) — already
  landed in SLICE-55..57; this slice only adds the regression guard.
- `docs/ci-gates.md` / `docs/memory.md` DEC-044 updates (AC-6) — out of this
  slice; no new CI gate was added (extended two existing gates instead, per
  the run brief's explicit instruction not to touch `.github/workflows/ci.yml`
  or the CI-gate docs).
- `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js"` / `dist/loop.js` clean-directory
  smoke (AC-5) — unrelated to the validator rule, not touched here.

## Acceptance criteria

> WARNING: ACs copied from FEAT-037 and shared across 6 sibling slices — scope per-slice before close

- [ ] AC-1: Given a staged, node_modules-free consumer copy produced by `stageConsumerCopy` from src/scripts/lib/install/shipped-entrypoints.mjs, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then `EXPECTED_FAIL` is the empty set, the computed `newlyBroken` and `nowPassing` arrays are both `[]`, and the suite exits 0 -- gate 42 passes with no designed-red arm remaining.
- [ ] AC-2: Given the same staged consumer copy, When `listShippedEntrypoints` runs against it, Then it returns no fewer than the 42 CLI entries plus 11 dist/hooks/*.js hook entries observed on 2026-11-06, and the suite asserts that floor explicitly, so a path rewrite cannot turn gate 42 green by shrinking the discovered entry list rather than by fixing the invocations.
- [ ] AC-3: Given commands/, agents/ excluding agents/3rdparty/, skills/ and templates/, When each is grepped for `crew/scripts/crew.mts`, `src/scripts/loop.mts`, `crew/scripts/report-to-pr.mts`, `crew/scripts/prune-artifacts.mts` and `src/scripts/watch-tick.mts`, Then zero occurrences remain outside an explicit allowlist covering the build-dist.mts entry list, the validator sources and the test files -- measured against the roughly 207 occurrences across 57 files counted on 2026-11-06.
- [x] AC-4: Given an invalid product-surface file that reintroduces `bun crew/scripts/crew.mts audit --repo "$PWD"` into commands/ or agents/, When the new `no-source-script-path` rule runs via crew/scripts/validate-agents.mts and its commands/*.md sibling check, Then the validator exits non-zero and its output names the offending file and line number.
  - Evidence: `crew/tests/validate-agents-no-source-script-path.test.mts` ("a standalone `bun crew/scripts/crew.mts ...` invocation fails, naming file and line" — asserts `builder.md:<N>` in the error text) and `src/tests/validate-source-script-path-refs.test.mts` ("commands/*.md: a standalone invocation of crew/scripts/crew.mts fails, naming file and line") both pass. Live CLI confirmed: `bun ./crew/scripts/validate-agents.mts` -> `Agents OK: 26 agent(s) checked, 14 3rdparty agent(s) checked.` (exit 0) and `bun ./src/scripts/validate-agent-refs.mts` -> `Agent-ref validation OK: no phantom crew:/runner: dispatch references, no source-script-path regressions.` (exit 0) on the clean tree.
- [ ] AC-5: Given `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" audit --repo "$PWD"` and the equivalent dist/loop.js invocation, When each is run from a working directory outside the plugin tree with CLAUDE_PLUGIN_ROOT set and no node_modules present anywhere on the resolution path, Then each exits 0 or with its own argument-validation error, and never with a module-resolution error -- pinning SLICE-52's lesson that a bundle is only self-contained once the shipped artifact has been run from a clean directory. (out of scope for this slice — see "Out of scope")
- [ ] AC-6: Given docs/ci-gates.md and docs/memory.md, When gate 42 is described in each, Then both record it as blocking rather than designed-red, docs/ci-gates.md states the runner retry policy for the staged suite, and the DEC-044 note in docs/memory.md (currently at lines 92-93, recording 42 held entries as of FEAT-026/SLICE-52) is updated to record that the ratchet drained in FEAT-037. (out of scope for this slice — see "Out of scope")
- [x] AC-7 (subset — the 7 checks this slice's rule touches; full-branch sign-off deferred to the slice that closes FEAT-037): `bun run validate:manifests` -> OK; `bun ./src/scripts/validate-agent-refs.mts` -> OK (0 findings, incl. new no-source-script-path check); `bun ./src/scripts/validate-content-length.mts` -> OK; `bun ./src/scripts/validate-repo-boundary.mts` -> OK; `bun ./src/scripts/generate-metrics-band.mts --check` -> up to date; `bun src/scripts/build-dist.mts --check` -> up to date; `bun ./crew/scripts/validate-agents.mts` -> OK. Both test suites green apart from the one pre-existing designed-red (`src/tests/install/consumer-smoke.test.mts`, `EXPECTED_FAIL=["dist/loop.js dispatch prepare"]`, owned by SLICE-59): root `bun test src/tests/ --parallel --timeout 60000` -> 3514 pass / 1 expected fail / 7 skip; crew `bun test tests/ --timeout 60000` (serial — crew's own suite is not `--parallel`-safe per crew/CLAUDE.md) -> 1840 pass / 0 fail / 117 skip.

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
