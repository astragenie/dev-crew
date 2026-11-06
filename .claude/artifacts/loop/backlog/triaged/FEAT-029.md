---
id: FEAT-029
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-05
depends_on: [FEAT-027, FEAT-028]
slices: []
derived_from: null
pm_customer_impact: 0.8
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.6
pm_dependency_depth: 0.2
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P1, holds. technical_risk raised to 0.6 (band 0.6-0.8 low end: now genuinely cross-module — two validator files plus a new light-path module plus edits across four+ command/agent prompts plus a 146-path repo-wide scan — without a schema/data-shape break and with a largely mechanical, allowlist-backstopped rollback)."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "1/4 refs batch (+jq removal, loop-cache path, stub-analyzer deletion)"
    points: 2
    estimated_tokens: 100000
    touches_files: [commands/parallel.md, commands/fix.md, commands/orchestrate-slice.md, agents/reviewer.md, commands/build.md, skills/workflow/reviewing-code, skills/domain/architecture/architecture-advisory]
  - id_suffix: -SLICE-2
    title: "2/4 validator rules (subagent-exists, repo-path-exists, skill-script-exists)"
    points: 2
    estimated_tokens: 100000
    touches_files: [src/scripts/validate-agent-refs.mts, crew/scripts/validate-skills.mts, crew/tests/validate-refs-rules.test.mts]
  - id_suffix: -SLICE-3
    title: 3/4 seeded path-ref-allowlist.json with follow-up FEAT tags
    points: 2
    estimated_tokens: 100000
    touches_files: [src/scripts/lib/path-ref-allowlist.json]
  - id_suffix: -SLICE-4
    title: "4/4 light path classifier (task-text path extraction, fails closed)"
    points: 2
    estimated_tokens: 100000
    touches_files: [crew/scripts/lib/light-path.mts, commands/build.md, commands/fix.md, crew/tests/light-path.test.mts]
---
## Description

Audit T7: broken references, reference validators, jq-free pre-flight, and a light path that can say yes

Source: remediation plan Task 7; audit #1, #2, #4, #5, #8, #9; Codex #1, #2, #4, #5, #8, #9, #13; architect OBJ-8/OBJ-9/OBJ-13. Wave 3 lane A as THREE sequential slices (refs → validators → light path). Depends on: FEAT-027, FEAT-028 (shared commands/validators), W2.5 path rewrite merged.

Problem: commands/parallel.md:40 dispatches `subagent_type: devcrew:build` (no agents/build.md) and :26-28 still resolves the retired loop plugin cache path; commands/fix.md:36 runs `mark-badge inspected` (unsupported badge); agents/reviewer.md:100 cites docs/workflow/reviewing-code/ (real: skills/workflow/reviewing-code/); orchestrate-slice.md:444 calls `/devcrew:fix --target integration` (no such flag); 6 stub .py analyzers print "Completed successfully" with findings=[]; backend/fullstack/security-advisory SKILL.md name 9 nonexistent scripts; commands/build.md:14-22 and fix.md:17-22 decide the light path by grepping `git diff HEAD` before any work (clean tree → dev-lite eligible, fail-open); build.md:51-62 and fix.md:53 shell out to jq for collision pre-flight and treat jq-missing as no collision (Codex #13). A repo-path dry run finds 29 missing backticked paths today, incl. placeholders (docs/decisions/DEC-NNN.md, src/api/feat-NNN.ts) and consumer examples.

Deliverable — SLICE-1 refs batch: parallel.md → `subagent_type: general-purpose` + "Run the `/devcrew:build` ladder for slice <id> in worktree <path>", loop cache path removed; fix.md delete mark-badge inspected; reviewer.md path fix; orchestrate-slice.md:444 → `/devcrew:fix "integration smoke failed: <artifact path>"`; delete the 6 stub .py scripts and the SKILL.md blocks naming the 9 missing scripts; collision pre-flight in build.md/fix.md reads `crew.mts show-workflow-state --json` (no jq).
SLICE-2 validators: src/scripts/validate-agent-refs.mts (gate 6) gains `subagent-exists` (in `subagent_type:` context, agents only — the resolver already accepts commands, which is why devcrew:build slipped) and `repo-path-exists` (backticked paths starting skills/, docs/, commands/, agents/, crew/, src/ must exist; exempt tokens containing `NNN`, `<`, `*`; ship src/scripts/lib/path-ref-allowlist.json seeded with every remaining miss, each tagged with a follow-up FEAT id). crew/scripts/validate-skills.mts gains `skill-script-exists` (every scripts/<name>.(py|ts|mts|sh) named in a SKILL.md exists beside it). Each rule has a failing fixture; the real tree exits 0.
SLICE-3 light path: crew/scripts/lib/light-path.mts classifyLight({task}) extracts path-like tokens from the task text (`\S+\.(mts|ts|md|json|yml|yaml|sh|mjs)` or `a/b/c` segments); eligible only when 1-2 paths extracted AND task matches /\b(typo|rename|format|comment|lint|whitespace|bump)\b/i; otherwise {eligible:false, reason}. Fails closed; dev-lite's own ≤2-file/≤50-LOC refusal remains the backstop. Subcommand `crew.mts classify-light --task "<text>"`; build.md and fix.md replace the git-diff block with it. Tests crew/tests/validate-refs-rules.test.mts, crew/tests/light-path.test.mts.

Acceptance criteria (draft):
- Given fixtures (agent naming devcrew:nope in subagent_type; reviewer citing docs/workflow/x/; SKILL.md citing scripts/ghost.py), when the validators run, then exit 1 with the rule name; given the real tree after SLICE-1, exit 0 with the allowlist entries listed in output.
- Given classifyLight({task:"add OAuth login flow"}) → not eligible "no files named"; {task:"fix typo in README.md"} → eligible with files ["README.md"]; {task:"fix typo in a.md b.md c.md"} → not eligible; {task:"README.md"} (no keyword) → not eligible.
- Given /devcrew:build on a clean tree with a task naming no files, then the standard ladder runs, never dev-lite.
- Given a host without jq, when the collision pre-flight runs, then it still detects an open run (show-workflow-state --json).
- validate-agent-refs, validate-skills, validate-agents, content-length green.

Scope as listed; command path strings already repointed to dist/ by W2.5.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given fixtures (an agent naming `devcrew:nope` in `subagent_type:`, a reviewer citing `docs/workflow/x/`, a SKILL.md citing `scripts/ghost.py`), When the validators run, Then each exits `1` with the matching rule name; given the real tree after slice 1 lands, Then it exits `0` with the allowlist entries listed in output.
- AC-2: Given `classifyLight({task:"add OAuth login flow"})`, Then not eligible, reason `"no files named"`; given `{task:"fix typo in README.md"}`, Then eligible with `files: ["README.md"]`; given `{task:"fix typo in a.md b.md c.md"}`, Then not eligible; given `{task:"README.md"}` (no keyword), Then not eligible.
- AC-3: Given `/devcrew:build` on a clean tree with a task naming no files, When the classifier runs, Then the standard ladder is taken, never `dev-lite`.
- AC-4: Given a host without `jq`, When the collision pre-flight runs, Then it still detects an open run via `crew.mts show-workflow-state --json`.
- AC-5: Given the real tree, When `validate-agent-refs`, `validate-skills`, `validate-agents`, and the content-length gates run, Then all are green.

## Proposed slices (PM decomposition)

- SLICE-1: 1/4 refs batch (+jq removal, loop-cache path, stub-analyzer deletion) (2 pts)
- SLICE-2: 2/4 validator rules (subagent-exists, repo-path-exists, skill-script-exists) (2 pts)
- SLICE-3: 3/4 seeded path-ref-allowlist.json with follow-up FEAT tags (2 pts)
- SLICE-4: 4/4 light path classifier (task-text path extraction, fails closed) (2 pts)
