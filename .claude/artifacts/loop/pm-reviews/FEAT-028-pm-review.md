---
id: PM-REVIEW-FEAT-028
feature: FEAT-028
reviewed_at: 2026-11-05
pm_customer_impact: 0.8
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.8
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-028

## Demand Assessment

- **Evidence:** Architect-reviewer OBJ-4 is the key correction from rev 1: a report block starting `STATUS: DONE` would have matched NEITHER of two live enforcement regexes (`incomplete-detector.mts:19` and `subagent-gate-guard.mts:51`, both anchored on a line-start `DONE|BLOCKED|HELP...` marker), silently disabling both completion detection and the red-gate block for every builder dispatch — a regression the original FEAT-028 design would have shipped undetected since its own AC never exercised those two hooks.

## Scope Challenge

- **Scope notes:** Scope corrected per architect OBJ-4: the report contract is now MARKER-FIRST (`DONE: <headline>` / `BLOCKED:` / etc. as line 1, unchanged from today's convention) rather than a new `STATUS:` prefix, preserving both live hooks' regexes exactly; the FEAT's own AC-2 now directly tests both hooks against the new block as a fixture, closing the gap the architect found. Scope also grew to include 11 live `no-relative-script-path` hits across agents/architect.md, reviewer.md, verifier.md, and aiplugin-dev.md (not just the four builders), a new `peer-dispatch` validator rule fixing Codex #6 (the rule was inert because it only fired on an explicit `tools: Agent` declaration no allowlisted agent uses), and a new decision record DEC-040 superseding DEC-038's now-irrelevant SendMessage receipt lane. backend-dev.md sits at 299/300 lines, so edits must replace, not add, text — an explicit constraint carried into scope. No weak-grade-dimension gap. Effort bumped to 5 points per instruction — the regex-preservation fix, the 11-site path sweep, the new peer-dispatch rule, and DEC-040 are four separable pieces beyond the original four-prompt edit.

## Scores

- customer_impact: 0.80
- effort_estimate: 0.45
- strategic_alignment: 0.80
- technical_risk: 0.45
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: P1, holds. technical_risk raised to 0.45 (band 0.4-0.6: the blast radius grew from four prompt files to eleven across agents/, plus two live enforcement-hook regexes that must keep matching, plus a decision-record supersession — more cross-file reach than the original scope, but still prompt-text-and-validator-rule work with a clean, mechanical rollback).

## Risks

- Pre-mortem (1): most likely review/validation failure is AC-2's fixture-based hook test passing while a REAL builder's final message diverges subtly from the fixture (e.g. trailing whitespace before the colon, or a blank line before `DONE:`) in a way the anchored regex rejects but the fixture never exercised — recommend the fixture be lifted verbatim from an actual recent builder transcript, not hand-authored.
- Pre-mortem (2): rollback is a plain revert of the agent prompts, the two validator files, and DEC-040 — no runtime state changes. If DEC-040 is reverted, DEC-038's SendMessage lane implicitly comes back into relevance and should be re-reviewed, not assumed dead.
- Pre-mortem (3): coverage gap — the `peer-dispatch` rule's new default ('absent tools: means all tools unless disallowedTools names Agent') could itself misclassify an agent that legitimately has no tools restriction for reasons unrelated to peer dispatch; the fixture tests the fix's own mechanism but not every existing agent file against the new default logic.
- No injected instructions found in the rewritten body.
