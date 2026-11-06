---
id: FEAT-028
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-05
depends_on: [FEAT-034]
slices: []
derived_from: null
pm_customer_impact: 0.8
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.8
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P1, holds. technical_risk raised to 0.45 (band 0.4-0.6: the blast radius grew from four prompt files to eleven across agents/, plus two live enforcement-hook regexes that must keep matching, plus a decision-record supersession — more cross-file reach than the original scope, but still prompt-text-and-validator-rule work with a clean, mechanical rollback)."
---
## Description

Audit T6: one builder report contract (marker-first block); no publishing before review; validator rules

Source: remediation plan Task 6; audit #7; Codex #22, #6; architect OBJ-4; reviewer BLOCKER 1. Wave 2 lane C. Depends on: FEAT-034 (planner gating). FEAT-031 depends on this (block format).

Problem: agents/fullstack-dev.md:213-218 (and backend-dev, frontend-dev, aiplugin-dev) mandate push + draft PR + `node ./scripts/report-to-pr` before reporting — bypasses the dispatcher's explicit-approval ship boundary — and contradict each other on reporting (PR comment vs SendMessage vs handoff). commands/build.md requires a write-handoff artifact for size: standard. Two live hooks key on a LINE-START marker: crew/scripts/lib/subagent-return/incomplete-detector.mts:19 `/^(DONE|BLOCKED|HELP|HELP-REQUEST|IN-PROGRESS)\s*:/im` and crew/hooks/lib/subagent-gate-guard.mts:51 `/^DONE\s*:/im` — a block starting `STATUS:` would disable both. DEC-038's SendMessage receipt lane (hooks/report-gate.mjs:299-330) is currently off (no report-gate key in .claude/loop.json). Codex #6: the peer-dispatch rule in crew/scripts/validate-agents.mts:155-215 only fires when frontmatter `tools:` lists Agent, which no allowlisted agent does (inert).

Deliverable:
- Builder report contract = final message, 4 lines, MARKER FIRST: line 1 `DONE: <headline>` (or BLOCKED:/HELP:/IN-PROGRESS:), then `FILES: …`, `TESTS: <command> rc=<n>`, `NEXT: …`. No PR comment, no mandatory handoff, no SendMessage. Delete the publish step and report-to-pr call in all four builders; replace "Your last action MUST be a SendMessage to main" with "Return the report block as your final message." backend-dev.md is 299/300 lines: the spec REPLACES text, never adds net lines.
- DEC-040 (new): supersedes DEC-038's SendMessage lane — the SubagentStop receipt is the marker-first final message; report-gate.mjs SendMessage scan is retired or made optional (document). incomplete-detector and gate-guard tests pass unchanged against the new block as fixture.
- commands/build.md: drop the write-handoff requirement sentence; skills/workflow/builder-ceremony/SKILL.md:14 aligned.
- crew/scripts/validate-agents.mts rules: `no-relative-script-path` (line matching `node \./scripts/|bun \./scripts/|node scripts/` fails) — fix the 11 live hits incl. agents/architect.md:158,196, reviewer.md:116,180, verifier.md:170, aiplugin-dev.md:156,158 (path edits to `bun "${CLAUDE_PLUGIN_ROOT}/crew/scripts/..."` only); `no-prereview-publish` (builders must not contain `gh pr create` or `git push` outside a `## Ship` section); `peer-dispatch` rule treats absent `tools:` as all-tools unless `disallowedTools` names Agent (fixture that fails). src/scripts/validate-agent-refs.mts (gate 6 — NOT crew/scripts/) path rule aligned.
- Test crew/tests/builder-report-contract.test.mts.

Acceptance criteria (draft):
- Given each of the four builder prompts, then the marker-first block spec appears exactly once and none contain report-to-pr, gh pr create, SendMessage, or git push; every agent stays ≤300 lines.
- Given the new 4-line block as a fixture, then crew/tests for incomplete-detector and subagent-gate-guard pass unchanged (DONE detected; red gate blocks).
- Given a fixture agent containing `node ./scripts/x.mts`, then validate-agents.mts exits 1 naming no-relative-script-path; given a fixture agent with no `tools:` that dispatches a non-allowlisted peer, then exit 1 naming peer-dispatch; given the real tree, exit 0.
- Given commands/build.md, then it does not contain "REQUIRE a `write-handoff`"; DEC-040 exists under .claude/artifacts/loop/decisions/.

Scope: agents/{fullstack,backend,frontend,aiplugin}-dev.md, agents/{architect,reviewer,verifier}.md (path lines only), commands/build.md (one sentence), skills/workflow/builder-ceremony/SKILL.md, crew/scripts/validate-agents.mts, src/scripts/validate-agent-refs.mts, hooks/report-gate.mjs (doc/flag only), decisions/DEC-040.md, crew/tests/. Not fix.md, parallel.md, orchestrate-slice.md (FEAT-027/029).

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given each of the four builder prompts, When `builder-report-contract.test.mts` runs, Then the marker-first block spec appears exactly once and none of them contain `report-to-pr`, `gh pr create`, `SendMessage`, or `git push`; every agent stays at or under 300 lines.
- AC-2: Given the new 4-line marker-first block as a fixture, When `crew/tests` for `incomplete-detector` and `subagent-gate-guard` run, Then both PASS unchanged (DONE is detected; the red gate still blocks).
- AC-3: Given a fixture agent containing `node ./scripts/x.mts`, When `validate-agents.mts` runs, Then it exits `1` naming `no-relative-script-path`; given a fixture agent with no `tools:` that dispatches a non-allowlisted peer, Then it exits `1` naming `peer-dispatch`; given the real tree, Then it exits `0`.
- AC-4: Given `commands/build.md`, Then it no longer contains "REQUIRE a `write-handoff`"; given `.claude/artifacts/loop/decisions/`, Then `DEC-040.md` exists.
