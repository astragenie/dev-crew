---
id: FEAT-032
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-05
depends_on: [FEAT-022, FEAT-023, FEAT-024, FEAT-025, FEAT-026, FEAT-027, FEAT-028, FEAT-029, FEAT-030, FEAT-031, FEAT-033, FEAT-034]
slices: []
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.75
pm_technical_risk: 0.5
pm_dependency_depth: 0.95
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-11-05
autonomous_safe: false
triage_notes: "P2, holds: still the release sign-off gate for devcrew 1.2.0 with real strategic value, but it is blocked on literally every other FEAT in this batch (dependency_depth 0.95, the explicit ceiling case) and needs interactive `claude` sessions plus a `--plugin-dir` install rather than a bounded file edit. autonomousSafe stays false per instruction and independently on its own merits."
---
## Description

Audit T11: end-to-end consumer smoke after remediation, whole-branch review, sign-off

Source: remediation plan Task 11; reviewer BLOCKER 5 + coverage table; assumption-attack #7/#10; architect OBJ-13/OBJ-18. Wave 5, serial, `autonomous_safe: false` (interactive sessions). Depends on: FEAT-022..031, FEAT-033, FEAT-034.

Constraints: `claude plugin install --from` does not exist on CLI 2.1.270; registering a local marketplace is a listed never-do. The real marketplace cache path (astragenie/astra-marketplace pins devcrew to astragenie/dev-crew main, no ref) can only be exercised after the operator pushes — that is a POST-sign-off step, recorded here, not a precondition. This repo's own .claude/settings.json wires 12 dogfood hooks (double-fire), so all smokes run in the scratch consumer, never here.

Deliverable:
- pluginCopy = FEAT-022's stageConsumerCopy output (no node_modules at any depth). Scratch consumer repo C:\work\mega\scratch-devcrew-smoke (git init, one commit; not committed anywhere). `claude plugin validate --strict <pluginCopy>` OK. Every session below runs `claude --plugin-dir <pluginCopy> …` from the scratch repo. No marketplace registration of any kind.
- Discovery + hook smoke: `claude --plugin-dir <pluginCopy> -p --max-budget-usd 2 "Run: echo hello. Then read README.md. Then say done."` → events.jsonl contains hook_dispatch rows for PreToolUse, PostToolUse, Stop written by the plugin's own dispatcher (FEAT-031), zero hook_error rows; pluginCopy still has no node_modules.
- Gate smoke: `bun <pluginCopy>/dist/crew.js write-review-result --repo . --title t --reviewer a --decision rejected`, then `--reviewer b --decision approved`, `show-workflow-state` → review gate failed; no --decision → exit 2; `--scaffold --status in-progress` → exit 0 and gate unchanged.
- Dispatcher smoke (interactive, --max-budget-usd 5): `/devcrew:build add a CONTRIBUTING.md with one sentence` → no dev-lite dispatch, builder returns the marker-first block, two reviewers write with --decision, show-workflow-state shows review_passed, no PR opened, verifier dispatched (scratch repo has no CI → has-consumer-ci false).
- docs/audits/2026-11-05/smoke-after.md: every command + observed output, one row per smoke-baseline row whose Result is not PASS or n/a, plus the discovery row from the 2026-11-05 validation artifact.
- Whole-branch review by a fresh devcrew:reviewer on `git diff main...<integration branch>` with an acceptance list of one row per audit finding closed by this plan: #1-#5, #7-#13, #15-#18, #25, #41-#44, #48-#53 (Codex #6 → FEAT-028, #13 → FEAT-029; audit #30/#38 and the skills/cache rows → FEAT-035, listed as NOT closed). Any row without a test file or a smoke row is not closed. Decision written via write-review-result --decision.
- Hand-back: go/no-go on pushing + devcrew 1.2.0; CHANGELOG entry drafted (adopter re-install note from FEAT-030 included); post-push step listed: re-run the hook smoke against a real `claude plugin install devcrew@astra` cache (validate-marketplace-sync will flag 1.2.0 until the registry moves — advisory).

Acceptance criteria (draft):
- Given smoke-after.md, when compared to smoke-baseline.md, then every row whose baseline Result is not PASS/n/a is PASS with command and output quoted, and the discovery row is PASS.
- Given the whole-branch review artifact, then each listed audit finding maps to a test file or a smoke row, the NOT-closed set is explicit, and the decision was written with --decision.
- Given the operator summary, then it states: nothing pushed, no tag, no marketplace change, and names the post-push cache re-check.

Scope: docs/audits/2026-11-05/smoke-after.md, CHANGELOG.md draft entry, review artifact. No source edits; defects found become new FEATs via /devcrew:intake.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given `docs/audits/2026-11-05/smoke-after.md`, When compared to `smoke-baseline.md`, Then every row whose baseline Result is not PASS/n/a is now PASS with the command and output quoted, and the discovery row (from the 2026-11-05 hooks-discovery validation) is PASS.
- AC-2: Given the whole-branch review artifact, Then each listed audit finding maps to a test file or a smoke row, the NOT-closed set (audit #30/#38, skills/cache → FEAT-035) is explicit, and the decision was written via `write-review-result --decision`.
- AC-3: Given the operator-facing summary, Then it states explicitly that nothing was pushed, no tag was cut, no marketplace change was made, and it names the post-push real-cache re-check as an outstanding step.
