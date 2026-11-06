---
id: FEAT-030
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-05
depends_on: [FEAT-026]
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.65
pm_technical_risk: 0.7
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-11-05
autonomous_safe: false
triage_notes: "P1, holds. autonomousSafe flipped to false and technical_risk raised to 0.7 on reflection: this is no longer 'edit this repo's own governance doc' (my earlier framing) but 'edit the generator templates that produce EVERY adopter repo's CLAUDE.md and constitution going forward' — a product-surface, cross-repo-blast-radius change the FEAT's own body explicitly flags, closer in kind to FEAT-031/032's reasons for autonomousSafe:false than to a routine doc edit, even though its own CI gates (validate-agent-refs, validate-snapshot-freshness, validate-decline-citations, content-length, 10 installer tests) are a strong safety net."
---
## Description

Audit T10: session-start context diet via installer templates; bench quarantine

Source: remediation plan Task 10; audit #15; Codex #29; architect OBJ-3; reviewer BLOCKERS 2-3. Wave 3 lane B. Depends on: FEAT-026 (package.json scripts region merged). PRODUCT-SURFACE CHANGE: edits installer templates that ship to ~20 adopter repos; adopters re-run `/devcrew:install` (CHANGELOG compat note).

Problem: the `@.claude/crew/constitution.md` include sits INSIDE `<!-- crew:start -->` (CLAUDE.md:199-202), generated from CLAUDE_IMPORT_BLOCK at crew/scripts/lib/installer/templates.mts:12-17; `.claude/crew/constitution.md` is rendered from CONSTITUTION_TEMPLATE (crew/scripts/lib/installer/repo-guides.mts:13); the "First action when starting the runner" line is inside `<!-- runner:start -->` from templates/claude-md-hard-rules.md. Marker blocks are never hand-edited (CLAUDE.md, AGENTS.md, docs/memory.md). Only the loop-snapshot include at CLAUDE.md:227 is hand-editable, but src/scripts/lib/memory-snapshot.mts:439 tells agents to re-add it. Measured: CLAUDE.md 12,288 B + AGENTS.md 8,438 + constitution 3,692 + snapshot 2,162 = 26,580 B repo-rooted (33,559 with ~/.claude). No e2e job exists in ci.yml (line 49); the only retry is slow-tests max_attempts=2 with a documented bun#5090 cause (ci.yml:205-212). crew/tests/gepa/capture-perf.test.mts does not exist; the benches are crew/tests/hook-cold-start-bench.test.mts and crew/tests/log-event-async-bench.test.mts; test:crew runs `bun test tests/` so a perf/ subdir excludes nothing.

Deliverable:
- Templates: CLAUDE_IMPORT_BLOCK drops the constitution include (the constitution's delta vs the global ~/.claude/crew/constitution.md — peer-dispatch section + dev.stable carve-out — moves into CONSTITUTION_TEMPLATE as a short delta file that is NOT @-included; referenced by path from the crew block instead). templates/claude-md-hard-rules.md drops the "First action…" lines; skills/loop-discipline/SKILL.md gains them. Re-run `/devcrew:install` to regenerate both marker blocks (installer tests in crew/tests updated — 10 files assert the block).
- Hand-edit CLAUDE.md:227: remove the loop-snapshot include; memory-snapshot.mts:439 advice updated to "referenced, not included".
- src/scripts/lib/context/session-start-budget.mts measureSessionStart(repoRoot) → {bytes, files[]} over REPO-ROOTED @ includes only (hermetic). Test asserts bytes ≤ 24,576 (measured ratchet; today 26,580) and no file twice. Lowering further = moving CLAUDE.md sections into docs/memory.md, listed as follow-up.
- Benches: move hook-cold-start-bench and log-event-async-bench to crew/bench/; `bench:crew` script runs them; test:crew unchanged (bench/ is outside tests/). Root `bench` untouched.
- Deleted deliverables: e2e-retry diagnosis, capture-perf move (targets do not exist). docs/ci-gates.md cross-references the slow-tests retry cause.

Acceptance criteria (draft):
- Given today's tree, when session-start-budget.test runs, then it FAILS reporting 26,580 bytes; after the change, PASS at ≤24,576 with no duplicate file, on Windows and Linux (no ~/.claude dependency).
- Given the regenerated CLAUDE.md, then the crew block no longer @-includes the constitution, the runner block no longer carries "First action", line 227 is gone, and `clause:` markers + the `## CI gates` list are byte-identical.
- Given `bun run test:crew`, then neither bench runs; `bun run bench:crew` runs both.
- validate-agent-refs, validate-snapshot-freshness, validate-decline-citations, validate-content-length (skills ≤200) green; crew installer tests green; CHANGELOG carries the adopter re-install note.

Scope: crew/scripts/lib/installer/templates.mts, crew/scripts/lib/installer/repo-guides.mts, templates/claude-md-hard-rules.md, skills/loop-discipline/SKILL.md, CLAUDE.md (regenerated blocks + line 227), .claude/crew/constitution.md (regenerated), src/scripts/lib/memory-snapshot.mts (one string), package.json (bench:crew), crew/bench/, crew/tests installer tests, src/tests/context/, docs/ci-gates.md, CHANGELOG.md.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given today's tree, When `session-start-budget.test` runs, Then it FAILS reporting `26,580` bytes; after the change, Then it PASSES at `24,576` bytes or fewer with no duplicate file, on both Windows and Linux (no `~/.claude` dependency).
- AC-2: Given the regenerated CLAUDE.md, Then the crew block no longer `@`-includes the constitution, the runner block no longer carries "First action", line 227 is gone, and the `clause:` markers plus the `## CI gates` list are byte-identical to before.
- AC-3: Given `bun run test:crew`, Then neither bench runs; given `bun run bench:crew`, Then both run.
- AC-4: Given the full gate suite, When `validate-agent-refs`, `validate-snapshot-freshness`, `validate-decline-citations`, and `validate-content-length` (skills ≤200) run, Then all are green; the crew installer tests are green; and `CHANGELOG.md` carries the adopter re-install note.
