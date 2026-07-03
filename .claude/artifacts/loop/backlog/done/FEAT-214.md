---
id: FEAT-214
status: done
priority: P1
category: bug
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: 2026-07-02 live intake run (workflow validation)
tags: [reliability, pm, triage, tech-debt]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.85
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.9
pm_technical_risk: 0.65
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-07-02
autonomous_safe: false
triage_notes: "via=pm (2026-07-02). P1: verified, live-discovered break in the loop's core intake/triage write path (loop.mts:951 confirms pm-write was deleted while skills/triage/SKILL.md:90-97 still calls it, and intake.mts:29-37 is a hardcoded stub) -- high customer_impact/strategic_alignment since this is the entry point to the entire autonomous backlog loop, tempered by an existing (if manual/unscalable) operator workaround; technical_risk 0.65 lands in the 0.6-0.8 band per the rubric (cross-module reach across CLI/skill-doc/agent-contract/presets, plus a latent write-ownership architecture question, no new external dependency) so pre-mortem is mandatory and provided; effort_estimate 0.7 calibrated against SLICE-50's $117 single-slice analog scaled to this FEAT's larger 6-part blast radius, pushing effort_points >= 8 and triggering the FEAT-168 decomposition gate (proposed_slices provided, sum 11); autonomousSafe false because the write-ownership decision is a structural/contract question that Boundaries reserves for runner:architect, not something PM or an autonomous builder should decide unilaterally."
completed_at: 2026-07-02
---
# FEAT-214: Repair intake/triage write path + contract sync

## Problem

Live execution of `/runner:intake` on 2026-07-02 (11 FEATs) surfaced an
end-to-end broken write path:

1. `skills/triage/SKILL.md` step 7 instructs
   `bun loop.mts backlog pm-write` — removed in v0.53 (FEAT-277,
   `loop.mts:951` comment), no CLI replacement exists. Phase-1 score
   writing has no owner: the PM agent's prose declares itself read-only
   and refuses frontmatter writes (despite `Edit, Write` in its tool
   grants — the FEAT-277 self-write intent was never authorized in
   prose). Operator had to drive `backlog-writer.mts` library functions
   manually.
2. Free-text intake mode is a stub: `intakeFromText`
   (`src/scripts/lib/intake.mts:29-37`) returns hardcoded FEAT-000 while
   the skill documents the mode as functional.
3. Contract drift: `agents/pm.md` JSON emits `featureId` /
   `demandEvidence`; `skills/triage/SKILL.md` step 5 validates
   `result.id` / `evidence`. Literal validation rejects every valid PM
   result.
4. PM batch output transport is the agent's final message — truncated at
   an 11-FEAT batch; recovery required resuming the agent to write a
   file. No file-based or schema-structured output path is specified.
5. Stale namespaces: `resolve-skills` emits `loop:loop-discipline`
   (plugin is `runner:`), and CLI messages reference `/loop:triage`,
   `/loop:backlog-enrich`; `.claude/loop/discipline.md` is not
   Skill-tool-invocable (confirmed empirically by architect dispatch),
   so every agent listing it as a HARD-GATE required skill silently
   no-ops.
6. `skills/triage/SKILL.md` bash snippets require `jq`, absent on the
   Windows host — resolver step fails as written.

7. (added 2026-07-02, wave 1) `snapshot-memory` has BOTH a live handler (loop.mts:336) and a v0.53 removal stub that intercepts it; the loop-snapshot header and validate-snapshot-freshness error message cite the stubbed command while writeMemorySnapshot works only via direct lib import. Un-stub or update all citations.

## Acceptance hints

- Decide the write owner (restore a `pm-write`-equivalent CLI, or
  officially move writes into PM with prose + SOP updated to match the
  tool grants) and record it as a DEC.
- Implement or remove free-text intake mode; skill docs match reality.
- pm.md JSON field names and triage SKILL.md validation use one schema.
- PM batch scoring writes results to a file (or structured output);
  inline-message transport no longer load-bearing.
- Namespace sweep: `loop:` -> `runner:` in resolver output, presets, CLI
  messages; loop-discipline either packaged under `skills/**` as a real
  skill or de-listed from agents' required-skills sections.
- SKILL.md snippets portable (no jq dependency).

## Evidence

- Live run log 2026-07-02 (this session); retrospective
  `docs/research/2026-07-02-architecture-retrospective.md` (WP6 open
  question now confirmed); `src/scripts/loop.mts:951,1001-1005`;
  `src/scripts/lib/intake.mts:29-37`; `skills/triage/SKILL.md:57-101`;
  `agents/pm.md:8,207`.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a pending FEAT scored by `runner:pm` during `/runner:triage`, When the triage flow reaches step 7's write call (documented in `skills/triage/SKILL.md` lines 88-97 as `bun loop.mts backlog pm-write --id FEAT-NNN --scores '{...}' --priority P1 --autonomous-safe true --evidence '...' --reasoning '...'`), Then the write completes successfully (exit 0), the target FEAT's frontmatter under `.claude/artifacts/loop/backlog/triaged/` is updated with `pm_*` fields, the FEAT moves from `pending/` to `triaged/`, and no operator is required to manually drive `src/scripts/lib/backlog-writer.mts` functions to complete the write.
- AC-2: Given `agents/pm.md`'s documented JSON output contract emits `featureId` and `demandEvidence` (per `agents/pm.md:24-71`), When `skills/triage/SKILL.md` step 5 validates a returned PM result, Then the validation logic in SKILL.md references the SAME field names PM actually emits (no `featureId`/`id` or `demandEvidence`/`evidence` mismatch survives), and a new regression test under `src/tests/` asserts the field names declared in `agents/pm.md`'s contract match the field names read by the triage validation path -- following the SLICE-98 lesson that behavior-changing agent-prompt edits need a grep test pinning intent, not just prose.
- AC-3: Given `intakeFromText` in `src/scripts/lib/intake.mts:29-37` currently returns the hardcoded literal `{ featId: 'FEAT-000', priority: 'P3', autonomousSafe: false, acCount: 0, costUsd: 0 }` for ANY input text -- an invalid/stub state masquerading as a successful result, When free-text intake is invoked via the documented skill entry point, Then EITHER (a) `intakeFromText` performs real PM-driven scoring and returns a genuinely-derived FEAT id with `filePath` set to the written file, OR (b) the CLI/skill explicitly reports a `not_implemented` error with non-zero exit and the skill documentation is corrected to state the mode is unavailable -- the current silent-`FEAT-000`-success behavior (ambiguous, non-testable failure mode) MUST NOT ship unresolved in either direction.
- AC-4: Given `resolve-skills` output, CLI messages, and `.claude/loop/discipline.md` reference the stale `loop:` namespace (e.g. `loop:loop-discipline`, `/loop:triage`, `/loop:backlog-enrich`) while the installed plugin is namespaced `runner:`, and `skills/triage/SKILL.md:59` shells out to `jq` (absent on the Windows host per the FEAT's evidence), When the namespace/portability fix ships, Then a grep across `skills/**`, `agents/**`, and `src/scripts/**` for the literal string `loop:` (excluding legitimate `.claude/loop.json`/`loop.mts` path references) returns zero stale command/skill-id references, `skills/triage/SKILL.md`'s preset-resolution snippet runs without `jq` (e.g. via a Bun/Node one-liner or the existing `resolve-skills` CLI's own JSON parsing), and this is covered by a portability smoke test runnable on Windows.
- AC-5: Given a PM triage batch scoring 11+ FEATs in one dispatch (the exact scale that triggered this FEAT's discovery), When PM's final response is the sole transport for results, Then PM additionally persists each scored result to a structured file under `.claude/artifacts/loop/pm-reviews/` as scoring completes (not only at the end of the batch), so that if the final message truncates, an operator or the triage CLI can recover all already-scored results from disk without re-dispatching PM from scratch -- verified by a test that simulates a truncated final message and asserts the on-disk artifacts are sufficient to complete the write step.

## Proposed slices (PM decomposition)

- SLICE-A: Write-path restore + PM/SKILL contract field sync (5 pts)
- SLICE-B: Free-text intake fix + PM batch file-output durability (3 pts)
- SLICE-C: Namespace sweep (loop:->runner:) + jq-free SKILL snippets (3 pts)
