---
findings: "[RESOLVED] My prior [MINOR]: EXPECTED_FAIL count — docs/ci-gates.md and docs/memory.md now both\nsay 42 (matches the real array, re-verified by re-evaluating the literal programmatically:\nstill 42). The test file's own header comment was also corrected.\n\n[RESOLVED] My prior [MINOR]: stale \"gate 41\" self-reference in docs/ci-gates.md's prose under\nthe renumbered item now reads \"gate 42\" (both occurrences). The builder went further than I\nflagged and also fixed three more stale gate-number self-references in the same file's \"Job\nstructure and gating\" section (\"fast-gate runs gates 1-40\" -> \"1-41\", \"slow-tests runs gate 41\"\n-> \"gate 42\", \"crew-tests runs gate 42\" -> \"gate 43\", \"worktree-quarantine runs ... gate 41\nexcludes\" -> \"gate 42 excludes\", docs-only.test.mts \"(gate 41\" -> \"(gate 42\") — I re-derived the\ncorrect post-insertion numbers independently (every gate >=21 shifts +1 once the new gate 21 is\ninserted) and all five corrections are numerically correct.\n\n[VERIFIED — review A's MAJOR is fixed] Re-ran the exact repro from review A's artifact: staged a\ncopy of the pre-fix dist/loop.js (git show b1dd6148:dist/loop.js) with CLAUDE_PLUGIN_ROOT set and\nconfirmed it still throws ENOENT scanning for scripts/presets, proving the new regression test in\ndist-fresh.test.mts is not a tautology — it would genuinely have failed against the old code. Ran\nthe new committed dist/loop.js the same way: list-presets and install --preset dotnet-python both\nexit 0 with real output. Also independently confirmed the unbundled path still works identically\nwith CLAUDE_PLUGIN_ROOT unset (src/scripts/loop.mts list-presets / install --preset dotnet-python,\nboth rc=0, real writes) — no behavior change for direct-dev execution.\n\n[VERIFIED — audit section accuracy, docs/memory.md \"FEAT-026 import.meta.url audit\"] Independently\nderived the reachable-module set from the 5 bundled CLI entries by extracting every `// <path>`\nmodule-boundary comment Bun.build stamps into dist/crew.js, dist/loop.js, dist/prune-artifacts.js,\ndist/report-to-pr.js, dist/watch-tick.js (297 distinct modules), intersected against a repo-wide\ngrep for import.meta.url/fileURLToPath usage in src/scripts + crew/scripts (excluding tests and\n3rdparty) — got exactly 14 modules, matching the audit's \"14 modules total\" claim exactly, and the\nlist matches the audit's enumeration item-for-item (5 entry files + drift-check.mts + session-cost.mts\n+ node-bun-guard.mjs as safe = 8; config-resolver/decisions-store/grade-writer/loop-installer-tokens/\ngithub-sync-loader/task-store-github-provider as fixed = 6; otel-bridge.mts is the 7th fix but is\nreachable only from the hook bundles, not the 5 CLI entries, which the audit text's scoping already\nreflects). Also repeated the same extraction against all of dist/hooks/*.js (82 distinct modules) and\nfound only otel-bridge.mts and decisions-store.mts intersect with the import.meta.url grep — both\nalready fixed. Spot-checked 3 of the 7 fixed modules directly against the diff (config-resolver.mts,\ndecisions-store.mts, otel-bridge.mts) — all three correctly resolve via CLAUDE_PLUGIN_ROOT when set,\nfalling back to the original two-layout logic otherwise, matching the pattern docs/memory.md\ndescribes. No remaining import.meta.url/fileURLToPath gap found anywhere in the reachable set.\n\n[NOTE — still open, unchanged from my first review, not a defect introduced by this fix] README.md's\nmetrics-band table merge risk against fix/audit-2026-11 is now larger, not smaller: main has advanced\nto 5cc59c58 (FEATs shipped 27->29, slices closed 51->53, grade 0.905->0.898, cost $3.867->$4.455) while\nthis worktree's table still carries the pre-merge numbers plus its own \"CI gates enforced: 42->43\"\nchange. Same recommendation as before: resolve by rerunning `generate-metrics-band.mts --write` after\nmerging, not by hand-splicing the table.\n\nNothing else found. All requested gates and both full test suites re-run clean (see test-summary)."
decision: approved
---
# Review Result: SLICE-52 review B (correctness) — re-review 2041ce35

- Created: 2026-11-06T17:39:39.238Z
- Reviewer: B
- Decision: approved
- Summary: Re-review of SLICE-52 / FEAT-026 after the builder's fix (68659d69 + docs commit 2041ce35,
range b1dd6148..2041ce35, 17 source files). Review A's MAJOR (dist/loop.js ENOENT on
list-presets/install via import.meta.url-relative preset/template/github-sync dirs) is fixed
correctly: CLAUDE_PLUGIN_ROOT-first resolution landed in all 7 affected modules
(config-resolver.mts, loop-installer-tokens.mts, decisions-store.mts, grade-writer.mts,
github-sync-loader.mts, task-store/providers/github-provider.mts, otel-bridge.mts's
package.json lookup), with a real end-to-end regression test in dist-fresh.test.mts that
stages a node_modules-free consumer copy and runs the actual bundled dist/loop.js
list-presets and install subcommands. Independently reproduced the old ENOENT against the
pre-fix b1dd6148 dist/loop.js build to confirm the new test is a genuine regression lock, not
a tautology. Independently re-derived the "14 modules reachable from the 5 bundled CLI
entries" audit count from the dist bundles' own module-boundary comments and got exactly 14,
matching docs/memory.md's claim; grepped the entire reachable set (CLI entries + hook entries)
for import.meta.url/fileURLToPath usage and found zero modules outside the documented
audit — no coverage gap. Both of my prior MINORs are fixed (EXPECTED_FAIL count corrected to
42 in both docs, plus several more stale gate-number self-references in docs/ci-gates.md's Job
Structure section that I had not caught, also fixed and internally consistent with the gate-21
insertion). FEAT-026.md's AC-2 wording is corrected to real crew.mts subcommands with an intake
note explaining the correction. Both review artifacts (A and B) are committed verbatim — review
B's content matches, word for word, what I originally wrote. All requested gates re-run clean;
full test suites show no new failures versus the current main baseline (5cc59c58) beyond the
same pre-existing flaky startSlice/completeSlice family already present on main. One of my prior
NOTEs (README.md metrics-table merge risk) still stands and has grown (main's numbers have
moved further since my first review) — not a defect in this slice, just a live heads-up for
whoever resolves the eventual merge. Decision: approved.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: bun run build:dist -- --check rc=0 (dist/ up to date); bun src/scripts/validate-repo-boundary.mts rc=0; bun src/scripts/generate-metrics-band.mts --check rc=0; bun run typecheck (tsconfig.json + tsconfig.test.json) rc=0 both; bunx biome lint src/ rc=0 (65 pre-existing warnings, unchanged baseline); bunx biome format src/ rc=0; bun test src/tests/install/ rc=1 overall (19 pass/1 designed-red fail, expected per DEC-044); bun test src/tests/install/dist-fresh.test.mts alone: 13 pass/0 fail (includes the 2 new review-A-repro e2e tests); bun test src/tests/ --parallel: 3500 pass/7 skip/3 fail (1 designed-red + 2 from pre-existing flaky startSlice/completeSlice family -- confirmed same family, different subset, also fails on main at 5cc59c58 in the same run, not a regression); cd crew && bun test tests/ --parallel: 1793 pass/117 skip/0 fail; manual repro: git show b1dd6148:dist/loop.js staged standalone + CLAUDE_PLUGIN_ROOT set -> list-presets still throws ENOENT (confirms the new test is a real regression lock against the old build); committed dist/loop.js same staging -> list-presets and install --preset dotnet-python both rc=0; unbundled src/scripts/loop.mts list-presets / install --preset dotnet-python with CLAUDE_PLUGIN_ROOT unset -> both rc=0, real output, no behavior change
- Risks: -
- Required Follow-up: -

