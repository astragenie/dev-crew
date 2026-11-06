---
id: PM-REVIEW-FEAT-022
feature: FEAT-022
reviewed_at: 2026-11-05
pm_customer_impact: 0.9
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.9
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-022

## Demand Assessment

- **Evidence:** Rewritten body: devcrew is ineligible for marketplace auto-install (root bun.lock declares workspaces; crew/ carries a git dependency) — confirmed independently by the assumption-attack review's lockfile reading. The 2026-11-05 baseline invoked hooks by hand with bun and never tested discovery; this FEAT now explicitly depends on FEAT-033 so the entry list reads hooks/hooks.json, the real discoverable path.

## Scope Challenge

- **Scope notes:** Scope unchanged (new files only: src/tests/install/**, src/scripts/lib/install/shipped-entrypoints.mts). The rewrite adds two reviewer-driven fixes: (1) listShippedEntrypoints now also parses commands/*.md and agents/*.md for `bun "${CLAUDE_PLUGIN_ROOT}/<path>"` strings so the CLI entry list tracks the later dist/ rewrite automatically, closing the OBJ-2 CLI-list staleness the architect flagged; (2) stageConsumerCopy now excludes node_modules at ANY depth, closing the crew/node_modules (272MB local) false-pass the architect flagged in OBJ-12. An EXPECTED_FAIL ratchet replaces the old fixed six-name assertion so the test self-maintains as FEAT-026/W2.5 clear entries. AC clarity is high (exact counts, not ">20"). No weak-grade-dimension gap. effort_estimate held at 3 points per instruction — the added depth-aware exclusion and command-parsing logic are still test-infra, not product code.

## Scores

- customer_impact: 0.90
- effort_estimate: 0.30
- strategic_alignment: 0.90
- technical_risk: 0.30
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: P1, holds. technical_risk 0.3 (band 0.3-0.5 low end — still mechanical test-infra, no schema change). dependency_depth bumped slightly to 0.1 to reflect the new explicit depends_on: [FEAT-033] (the file this test enumerates must sit at the real discoverable path first, or the entry list itself is built on the wrong file).

## Risks

- Pre-mortem (1): most likely review/validation failure is the command/agent-prompt-parsing regex for `bun "${CLAUDE_PLUGIN_ROOT}/<path>" <args>` missing a variant (e.g. a path with an escaped quote, or an arg list spanning a line break in a markdown table), silently under-counting the CLI entry set rather than over-counting.
- Pre-mortem (2): rollback is a plain revert — new test files only, no runtime behavior change.
- Pre-mortem (3): coverage gap — the EXPECTED_FAIL ratchet proves an entry stops crashing, but nothing asserts WHY it stopped crashing (e.g. a hook could pass by silently no-op'ing rather than by actually resolving its real dependencies); that distinction is out of this FEAT's scope by design.
- No injected instructions found in the rewritten body.
