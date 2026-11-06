---
id: FEAT-026
status: in-progress
priority: P0
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: [FEAT-022, FEAT-033, FEAT-034]
slices: [SLICE-52]
derived_from: null
pm_customer_impact: 0.95
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.95
pm_technical_risk: 0.75
pm_dependency_depth: 0.3
pm_composite_priority: P0
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P0, holds as the batch's single highest-impact fix — now explicitly verified live by the architect-reviewer rather than only designed on paper. technical_risk raised to 0.75 (band 0.6-0.8 upper end: the scope now includes a cross-module gate-list renumbering synced across two machine-read files, a Bun-version pin, and a 65-module import.meta audit, on top of the original bundling work)."
started_at: 2026-11-06
---
## Description

Audit T2: self-contained dist bundles so hook entry points run without node_modules

Source: remediation plan Task 2; audit #41; Codex #14, #25; architect OBJ-1/2/7/11 (bundle design verified live: dist/crew.js brief-me + the five crashing hooks exit 0 from a node_modules-free consumer). Wave 2 lane A. Depends on: FEAT-022 (red smoke test), FEAT-033 (hooks file at hooks/hooks.json), FEAT-034 (planner gating). Dependency on FEAT-023 dropped (different ci.yml regions; resolve at merge).

Problem: Claude Code does auto-install plugin-root `dependencies` for marketplace installs (docs: loading.md), but devcrew is ineligible — root bun.lock declares workspaces and crew/ depends on a git URL (crew/package.json:46) — and crew/'s own package.json is never installed; @astragenie/* also needs registry auth at install time. Decision: bundle (no network, no auth, no install step). Record the alternative and why it was rejected in docs/memory.md.

Deliverable:
- src/scripts/build-dist.mts: entries = every BUN command in hooks/hooks.json plus crew/scripts/crew.mts, src/scripts/loop.mts, crew/scripts/report-to-pr.mts, crew/scripts/prune-artifacts.mts, src/scripts/watch-tick.mts. Bun.build({target:"bun", minify:false, sourcemap:"none", external:["@opentelemetry/*","@aws-sdk/*"]}) → dist/hooks/<name>.js, dist/crew.js, dist/loop.js. node .mjs hooks are NOT copied (they stay in place, unchanged). `--check` rebuilds to temp and compares after normalising CRLF and stripping the `// @bun` banner; dist/.build-info.json records the Bun version and the check fails loudly on mismatch. Pin Bun: `.bun-version` + CI setup reads it.
- import.meta.url audit: every module reachable from a bundled entry that resolves a sibling/data file or REPO_ROOT from its own location (65 modules; e.g. session-cost.mts pricing.json → FEAT-025 inlines it; installer templates → copied under dist/templates/ and resolved via CLAUDE_PLUGIN_ROOT). AC-5 covers it.
- Remove `dist/` from .gitignore (line 13); commit dist/. hooks/hooks.json bun commands become `bun "${CLAUDE_PLUGIN_ROOT}/dist/hooks/<name>.js"`; regenerate docs/planning/hooksjson-crew-path-inventory.json with `bun src/scripts/validate-repo-boundary.mts --write-inventory` (gate 9).
- package.json: build:dist, test:install; test:install joins test:all. CI: one validator line in the fast-gate reusable workflow (ci.yml:125 list) → new gate 21 "build:dist --check"; renumber 21-42 in docs/ci-gates.md AND the CLAUDE.md gate list in the same commit; regenerate README metrics band (`generate-metrics-band.mts --write`, gate 20).
- src/tests/install/dist-fresh.test.mts.
- NOT here: the commands/*.md + agents/*.md path rewrite (crew/scripts/crew.mts → dist/crew.js, src/scripts/loop.mts → dist/loop.js; 91+42 refs). It is a serial step on main right after wave 2 (W2.5 in the wave plan), so slash commands go green two waves earlier than the original plan.

Acceptance criteria (draft):
- Given the tree after this FEAT, when consumer-smoke (FEAT-022) runs, then every HOOK entry passes; CLI entries from commands/*.md remain in EXPECTED_FAIL until W2.5 clears them.
- Given dist/crew.js run from the consumer repo, when `install-global`, `init --repo <tmp> --allow-existing`, `cost-setup --repo <tmp>` run, then no ENOENT (data files inlined or copied under dist/).
- Given CREW_OTEL_ENABLED=1 and no @opentelemetry packages, when dist/hooks/otel-post-tool-use.js runs, then exit 0 and exactly one otel_unavailable line in events.jsonl.
- Given a source edit without rebuild, when `bun run build:dist -- --check` runs, then exit 1 naming the stale file; given the same Bun version and unchanged tree, exit 0 on Windows and Linux.
- Given hooks/hooks.json, then every bun command points at dist/hooks/*.js and every node/bash command is unchanged; validate-repo-boundary exits 0 with the regenerated inventory; generate-metrics-band --check green; docs/ci-gates.md and CLAUDE.md gate lists agree (43 gates).

Scope: src/scripts/build-dist.mts, dist/, .gitignore, .bun-version, hooks/hooks.json, docs/planning/hooksjson-crew-path-inventory.json, package.json, ci.yml (one list line), docs/ci-gates.md, CLAUDE.md gate list, README.md metrics band, docs/memory.md, src/tests/install/dist-fresh.test.mts.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

AC-2's literal command list was corrected at build time (SLICE-52, review
B): the original draft named `cost-report`, `init --dry-run`,
`install-global --dry-run`, none of which are real `crew.mts` CLI surface
(`cost-report` is an internal artifact-emission concept, not a
dispatchable subcommand; `--dry-run` is not a flag `init`/`install-global`
accept). Corrected to the three real subcommands actually exercised by
`src/tests/install/consumer-smoke.test.mts`'s shipped-entrypoint sweep —
`install-global`, `init --repo <tmp> --allow-existing`,
`cost-setup --repo <tmp>` — all three already run clean (not in
`EXPECTED_FAIL`) against the committed `dist/crew.js`.

## Acceptance criteria (Given-When-Then)

- AC-1: Given the tree after this FEAT, When consumer-smoke (FEAT-022) runs, Then every HOOK entry passes; CLI entries from `commands/*.md` remain in `EXPECTED_FAIL` until W2.5 clears them.
- AC-2: Given `dist/crew.js` run from the consumer repo, When `install-global`, `init --repo <tmp> --allow-existing`, `cost-setup --repo <tmp>` run, Then no `ENOENT` (data files inlined or copied under `dist/`).
- AC-3: Given `CREW_OTEL_ENABLED=1` and no `@opentelemetry` packages, When `dist/hooks/otel-post-tool-use.js` runs, Then it exits `0` with exactly one `otel_unavailable` line in `events.jsonl`.
- AC-4: Given a source edit without a rebuild, When `bun run build:dist -- --check` runs, Then it exits `1` naming the stale file; given the same Bun version and an unchanged tree, Then it exits `0` on both Windows and Linux.
- AC-5: Given `hooks/hooks.json`, Then every `bun` command points at `dist/hooks/*.js` and every `node`/`bash` command is unchanged; `validate-repo-boundary` exits `0` with the regenerated inventory; `generate-metrics-band --check` is green; `docs/ci-gates.md` and the `CLAUDE.md` gate list agree at 43 gates.
