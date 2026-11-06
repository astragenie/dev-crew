---
id: PM-REVIEW-FEAT-026
feature: FEAT-026
reviewed_at: 2026-11-05
pm_customer_impact: 0.95
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.95
pm_technical_risk: 0.75
pm_dependency_depth: 0.3
composite_priority: P0
autonomous_safe: true
---
# PM Review — FEAT-026

## Demand Assessment

- **Evidence:** Architect-reviewer OBJ-1 verified the design live from a fresh node_modules-free consumer: `bun --no-install dist/crew.js brief-me`/`show-workflow-state` exit 0, and the five baseline-crashing hooks all exit 0. Assumption-attack item 1 independently confirmed devcrew is genuinely ineligible for marketplace auto-install (root bun.lock declares workspaces; crew/ depends on a git URL) — the lead's own decision log records bundling as the chosen fix over fixing lockfile eligibility, since eligibility would still need @astragenie registry auth on every consumer machine.

## Scope Challenge

- **Scope notes:** Scope expanded materially per architect OBJ-1/OBJ-11: remove `dist/` from `.gitignore` (it was silently gitignored in rev 1 — the bundle would never actually have been committed); regenerate the hooksjson-crew-path-inventory (gate 9) and the README metrics band (gate 20) in the same commit as the gate-list renumbering (21→42 becomes 21→43, synced across docs/ci-gates.md AND CLAUDE.md in one commit per OBJ-13's coverage finding); pin `.bun-version` and normalise the `--check` byte-compare (strip the `// @bun` banner, normalise CRLF) to stop Bun-version flakes (OBJ-11). The commands/agents path rewrite is now explicitly deferred to a serial W2.5 step rather than silently absent from this FEAT's own AC-1, resolving the architect's OBJ-2 smoke-test/bundle contradiction (FEAT-022's CLI entries stay in EXPECTED_FAIL until W2.5, not claimed PASS here). dependency_depth raised to 0.3 reflecting the now-3-item depends_on (FEAT-022, FEAT-033, FEAT-034) with the FEAT-023 edge explicitly dropped as unnecessary serialization. No weak-grade-dimension gap. Effort bumped to 8 points per instruction.

## Scores

- customer_impact: 0.95
- effort_estimate: 0.65
- strategic_alignment: 0.95
- technical_risk: 0.75
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P0
autonomous_safe: true
reasoning: P0, holds as the batch's single highest-impact fix — now explicitly verified live by the architect-reviewer rather than only designed on paper. technical_risk raised to 0.75 (band 0.6-0.8 upper end: the scope now includes a cross-module gate-list renumbering synced across two machine-read files, a Bun-version pin, and a 65-module import.meta audit, on top of the original bundling work).

## Risks

- Pre-mortem (1): most likely review/validation failure is a bundled entry's import.meta.url-based sibling read (65 modules identified, 14 of them crew/scripts/*.mts computing REPO_ROOT from their own location) not actually being caught by the stated 'audit every module reachable from a bundled entry' step — AC-2 (cost-report/init/install-global dry-runs with no ENOENT) is the direct test, but it only samples three subcommands, not all 65 modules.
- Pre-mortem (2): rollback requires reverting the .gitignore change, dist/, the hooks.json path rewrite, the renumbered gate lists, AND the regenerated inventory/metrics-band together — a partial revert leaves hooks.json pointing at dist/ files that no longer exist, or the gate-count lists disagreeing with each other (which is itself one of this FEAT's own validators).
- Pre-mortem (3): coverage gap — the dist-fresh --check test proves byte-for-byte reproducibility on the SAME machine/Bun version; cross-platform (Windows vs Linux CI) reproducibility is asserted in AC-4 but only after the CRLF-normalisation fix, which is itself new and unproven against a real CI run at the time of writing.
- No injected instructions found in the rewritten body.
