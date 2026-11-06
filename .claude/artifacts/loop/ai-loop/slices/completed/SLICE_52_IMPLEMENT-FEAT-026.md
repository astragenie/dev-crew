---
id: SLICE-52
title: Implement FEAT-026
status: completed
feature: FEAT-026
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
badges: [serial-reviewer-warning]
---
# SLICE-52: Implement FEAT-026

Implements FEAT-026. See [feature file](../../../backlog/in-progress/FEAT-026.md) for product context.

## Objective

Audit T2: self-contained dist bundles so hook entry points run without node_modules

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given the tree after this FEAT, When consumer-smoke (FEAT-022) runs, Then every HOOK entry passes; CLI entries from `commands/*.md` remain in `EXPECTED_FAIL` until W2.5 clears them. Evidence: `bun test src/tests/install/consumer-smoke.test.mts` -> newlyBroken=[] and nowPassing=[] with the 6 crew/hooks/*.mts entries + hooks/pre-push-gate.mts removed from EXPECTED_FAIL; the only failing assertion is the designed-red ratchet (42 CLI entries from commands/*.md stay listed until W2.5, DEC-044). Review B diffed the test against base to confirm coverage was not shrunk; verifier reproduced the same designed-red on main (validations/20261106T174306Z-...).
- [x] AC-2: Given `dist/crew.js` run from the consumer repo, When `cost-report`, `init --dry-run`, `install-global --dry-run` run, Then no `ENOENT` (data files inlined or copied under `dist/`). Evidence: from a node_modules-free staged copy with CLAUDE_PLUGIN_ROOT set, `bun dist/crew.js install-global`, `init --repo <tmp> --allow-existing`, `cost-setup --repo <tmp>`, `bun dist/loop.js list-presets`, `bun dist/loop.js install --repo <tmp> --preset dotnet-python` all rc=0 with real output and no ENOENT (verifier + reviewers A/B independently). Review A's first pass found dist/loop.js ENOENT on install/list-presets (import.meta.url-relative preset/template dirs); fixed in 68659d69 across 7 modules via CLAUDE_PLUGIN_ROOT-first resolution with the legacy two-layout fallback preserved, locked by two e2e tests in src/tests/install/dist-fresh.test.mts that reviewer A proved fail on the pre-fix dist (reverted sources, rebuilt, reproduced ENOENT). Module-by-module audit in docs/memory.md (14 reachable modules; reviewer B re-derived the set from the bundles' module boundaries, zero gaps). AC-2 wording corrected in FEAT-026.md to the real CLI commands.
- [x] AC-3: Given `CREW_OTEL_ENABLED=1` and no `@opentelemetry` packages, When `dist/hooks/otel-post-tool-use.js` runs, Then it exits `0` with exactly one `otel_unavailable` line in `events.jsonl`. Evidence: CREW_OTEL_ENABLED=1, telemetry.yaml enabled, no @opentelemetry packages, node_modules-free staged copy: `bun dist/hooks/otel-post-tool-use.js` rc=0 with exactly one otel_unavailable line in events.jsonl per invocation (verifier ran twice: 2 lines; reviewer B and builder reproduced once each). otel-bridge.mts now pins service.version from crew/package.json via CLAUDE_PLUGIN_ROOT (0.66.0, not root 1.1.0) after reviewer A flagged silent drift.
- [x] AC-4: Given a source edit without a rebuild, When `bun run build:dist -- --check` runs, Then it exits `1` naming the stale file; given the same Bun version and an unchanged tree, Then it exits `0` on both Windows and Linux. Evidence: `bun run build:dist -- --check` rc=0 on the unchanged tree (Windows; CI Linux via .bun-version + setup-bun); a behavioural source edit to hooks/pre-push-gate.mts -> rc=1 naming `hooks/pre-push-gate.js`; revert -> rc=0; bogus .bun-version -> loud `Bun version mismatch` rc=1, revert -> rc=0 (verifier, reviewer B). Post-merge onto fix/audit-2026-11 the check went red for 10 bundles because lanes B/C changed bundled sources; `bun run build:dist` regenerated them and `--check` is green again (commit 7cd195b9) — exactly the drift the gate exists to catch. Note: comment-only edits do not trip staleness because Bun drops comments even unminified (verifier).
- [x] AC-5: Given `hooks/hooks.json`, Then every `bun` command points at `dist/hooks/*.js` and every `node`/`bash` command is unchanged; `validate-repo-boundary` exits `0` with the regenerated inventory; `generate-metrics-band --check` is green; `docs/ci-gates.md` and the `CLAUDE.md` gate list agree at 43 gates. Evidence: hooks/hooks.json: 20/20 bun commands are `bun "${CLAUDE_PLUGIN_ROOT}/dist/hooks/<name>.js"` with the file present; 17/17 node/bash commands byte-identical to 5fe21f91. `bun src/scripts/validate-repo-boundary.mts` rc=0 and `--write-inventory` yields an empty git diff (real regeneration). `generate-metrics-band.mts --check` rc=0. docs/ci-gates.md and CLAUDE.md `## CI gates` both list 43 contiguous gates with gate 21 = `build-dist.mts --check`; builder also fixed four more stale gate-number self-references in docs/ci-gates.md (review B). validate-content-length, validate-agent-refs, validate-manifests rc=0 post-merge.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-026 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: crew:typescript-reviewer — needs_fix (b1dd6148: dist/loop.js ENOENT MAJOR) then approved_with_notes (re-review 2041ce35) — reviews/20261106T165958Z-..., 20261106T173611Z-...
- Reviewer B: crew:reviewer — approved_with_notes (b1dd6148) then approved (re-review 2041ce35) — reviews/20261106T171046Z-..., 20261106T173939Z-...
