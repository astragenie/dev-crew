---
id: SLICE-52
title: Implement FEAT-026
status: pending
feature: FEAT-026
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
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

- [ ] AC-1: Given the tree after this FEAT, When consumer-smoke (FEAT-022) runs, Then every HOOK entry passes; CLI entries from `commands/*.md` remain in `EXPECTED_FAIL` until W2.5 clears them.
- [ ] AC-2: Given `dist/crew.js` run from the consumer repo, When `cost-report`, `init --dry-run`, `install-global --dry-run` run, Then no `ENOENT` (data files inlined or copied under `dist/`).
- [ ] AC-3: Given `CREW_OTEL_ENABLED=1` and no `@opentelemetry` packages, When `dist/hooks/otel-post-tool-use.js` runs, Then it exits `0` with exactly one `otel_unavailable` line in `events.jsonl`.
- [ ] AC-4: Given a source edit without a rebuild, When `bun run build:dist -- --check` runs, Then it exits `1` naming the stale file; given the same Bun version and an unchanged tree, Then it exits `0` on both Windows and Linux.
- [ ] AC-5: Given `hooks/hooks.json`, Then every `bun` command points at `dist/hooks/*.js` and every `node`/`bash` command is unchanged; `validate-repo-boundary` exits `0` with the regenerated inventory; `generate-metrics-band --check` is green; `docs/ci-gates.md` and the `CLAUDE.md` gate list agree at 43 gates.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-026 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
