---
id: SLICE-174
title: "Read-only investigation: reproduce + root-cause the citylive path mismatch"
status: completed
feature: FEAT-273
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 580
github_url: "https://github.com/astragenie/runner-plugin/issues/580"
completed_at: 2026-08-02
---
# SLICE-174: Read-only investigation: reproduce + root-cause the citylive path mismatch

Implements FEAT-273. See [feature file](../../../backlog/in-progress/FEAT-273.md) for product context.

## Objective

Investigate citylive zero-cost telemetry: all 11 clean cost reports in citylive show usd $0.00, cache_hit 0%, no Model Mix section — the cost scan finds no transcripts for that repo (likely source_project path mismatch: repo dir name vs project key, or transcripts under a different Claude projects dir). Read-only investigation first (researcher): reproduce, identify root cause in the cost scan path, then minimal fix so consumer repos with non-standard paths get real cost telemetry. Acceptance: a citylive-shaped fixture produces a non-zero report in tests.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-273 and shared across 2 sibling slices — scope per-slice before close

- [x] AC-1: Given the citylive repo's transcript/project directory layout, When the researcher reproduces the bug, Then the investigation identifies the exact mismatch (repo dir name vs Claude-projects-dir key, or an equivalent concrete cause) with file:line evidence. **DONE** — see `docs/research/2026-08-02-citylive-zero-cost-telemetry.md`: `source_project: AstraGenie.CityLive` (unslugified) in all 11 citylive per-slice cost reports vs. crew's `session-cost.ts:200-203` / `session-cost-scanner.ts:191,206` trusting an explicit `sourceProject` verbatim (skipping `slugifyRepoPath` AND the auto-detect fallback), mirrored unnormalized in this repo's own `crew-bridge.mts:252-258`.
- [ ] AC-2: Given a citylive-shaped test fixture (non-standard project-dir-to-repo mapping), When the cost scan runs against it, Then it produces a non-zero-usd report (the FEAT's own stated acceptance test).
- [ ] AC-3: Given the root cause is confirmed crew-side, When this FEAT closes, Then a docs/upstream-requests/ entry describes the reproduction and expected fix, rather than attempting an unverifiable loop-side patch.
- [ ] AC-4: Given the fix (if loop-side) lands, When applied to a repo with a STANDARD path convention, Then existing non-zero cost reports for that repo are unaffected (no regression for the common case).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-273 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
