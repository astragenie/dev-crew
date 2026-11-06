---
id: FEAT-023
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-05
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.85
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.85
pm_technical_risk: 0.35
pm_dependency_depth: 0
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P1, holds. technical_risk 0.35 (hold — same banding as before). This remains the CI gate meant to prevent every other remediation FEAT in this batch from shipping silently broken; the backlog reclassification closes a gap the first-round scoring missed before the architect caught it."
---
## Description

Audit T3: CI docs-only exemption treats prompts as code; gate fails closed

Source: remediation plan Task 3; Codex #18, #19; smoke-baseline rows "CI docs-only exemption" and "CI changes job on empty diff". Wave 1 lane B. Depends on: none.

Problem: .github/workflows/ci.yml:112 exempts `\.md$`, so agents/, commands/, skills/ changes skip every validator and prompt test. The required `gate` job at ci.yml:348 passes on `code != "true"`, so a failed or empty `changes` job passes the gate.

Deliverable:
- src/scripts/ci/docs-only.sh: reads changed paths on stdin, prints code=true|false. Exempt pattern exactly `^(docs/|README\.md$|CHANGELOG\.md$)`. Decision (architect OBJ-16): backlog paths (`.claude/artifacts/loop/backlog/**`) are CODE — they feed validate-effort-points, validate-decline-citations, validate-loop-state, validate-backlog-drift — so the old `.*/backlog/` exemption is dropped. Any path under agents/, commands/, skills/, hooks/, crew/, src/, dist/, .claude-plugin/, .claude/ is code. Empty input prints code=true.
- src/scripts/ci/gate.sh CODE FASTGATE_RESULT: exit 0 only when CODE=="false" or (CODE=="true" and FASTGATE_RESULT=="success"); everything else exit 1.
- ci.yml changes step (~106-118) pipes `git diff --name-only` into docs-only.sh; gate step (~337-355) calls gate.sh with needs.changes.outputs.code and needs.fast-gate.result.
- src/tests/ci/docs-only.test.mts covers both scripts, including "Given stdin commands/build.md, Then code=true" (replaces the GitHub-only observation).
- docs/ci-gates.md gains the two script paths as literal strings and records the backlog-is-code decision; gate order unchanged (count stays 42; generate-metrics-band --check green).

Acceptance criteria (draft):
- Given stdin "agents/reviewer.md", "skills/workflow/x/SKILL.md", or "commands/build.md", when docs-only.sh runs, then code=true; given "docs/a.md\nREADME.md\n", then code=false; given empty stdin, then code=true; given ".claude/artifacts/loop/backlog/triaged/FEAT-001.md", then code=true.
- Given gate.sh "" success → exit 1; "true" failure → exit 1; "true" success → exit 0; "false" skipped → exit 0.
- Given docs/ci-gates.md, then it contains the literal strings `src/scripts/ci/docs-only.sh` and `src/scripts/ci/gate.sh`, and `bun src/scripts/generate-metrics-band.mts --check` is green.

Scope: ci.yml changes/gate jobs, src/scripts/ci/, src/tests/ci/, docs/ci-gates.md. No dist-freshness step here (FEAT-026).

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given stdin `agents/reviewer.md`, `skills/workflow/x/SKILL.md`, or `commands/build.md`, When `docs-only.sh` runs, Then it prints `code=true`; given `docs/a.md\nREADME.md\n`, Then `code=false`; given empty stdin, Then `code=true`; given `.claude/artifacts/loop/backlog/triaged/FEAT-001.md`, Then `code=true`.
- AC-2: Given `gate.sh "" success`, Then exit `1`; `gate.sh "true" failure`, Then exit `1`; `gate.sh "true" success`, Then exit `0`; `gate.sh "false" skipped`, Then exit `0`.
- AC-3: Given `docs/ci-gates.md`, When inspected, Then it contains the literal strings `src/scripts/ci/docs-only.sh` and `src/scripts/ci/gate.sh`, and `bun src/scripts/generate-metrics-band.mts --check` is green with the gate list order unchanged.
