---
id: SLICE-126
title: loop backlog audit — auto-flag likely-already-satisfied FEATs with evidence
status: completed
feature: FEAT-182
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 266
github_url: "https://github.com/sergeymilashico/loop/issues/266"
completed_at: 2026-06-13
---
# SLICE-126: loop backlog audit — auto-flag likely-already-satisfied FEATs with evidence

Implements FEAT-182. See [feature file](../../../backlog/in-progress/FEAT-182.md) for product context.

## Objective

Adopt ao beads audit (C:/work/mega/agentops cli beads audit): scan triaged/pending FEATs and cross-check acceptance hints against the current codebase + done/ siblings; flag (not auto-close) FEATs whose ACs appear already satisfied, each with file:line evidence. Keeps long-lived queues honest — stale FEATs survive triage because nobody re-derives them against shipped code.

## In scope

- New `src/scripts/lib/backlog-auditor.mts`: `auditBacklog(repoPath, opts?): Promise<AuditResult[]>` — for each triaged/pending FEAT, extracts AC bullet keywords and searches `src/` and `done/` siblings; returns `{id, verdict: 'likely_satisfied'|'partially'|'open', evidence: string[]}` per FEAT
- New `loop backlog audit [--repo] [--json]` CLI subcommand
- `src/tests/backlog-auditor.test.mts` ≥5 tests using synthetic FEAT + source file temp directories

## Out of scope

- Auto-close or auto-move FEATs to `done/`
- `--apply` flag (requires per-FEAT confirmation)
- Fuzzy/semantic matching (simple keyword search only)

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test`) and linter is clean (`bun run lint`)
- [ ] AC-2: `auditBacklog(repoPath)` returns `verdict: 'likely_satisfied'` with non-empty `evidence` array (file:line pairs) when a synthetic FEAT's AC keyword appears verbatim in a source file under `src/`; returns `verdict: 'open'` when no match found. Verified by ≥5 tests.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-182 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
