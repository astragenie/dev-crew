---
id: SLICE-45
status: completed
feature: FEAT-043
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
---
# SLICE-45: Implement backlog pm-write CLI subcommand for PM score write-back

Implements FEAT-043. See [feature file](../../../backlog/in-progress/FEAT-043.md) for product context.

## Objective

PM triage flow is broken: /loop:pm-triage skill calls 'node scripts/loop.mjs backlog pm-write --id FEAT-NNN --scores ...' but that subcommand does not exist in loop.mts. PM agent scores (customer_impact, effort_estimate, strategic_alignment, technical_risk, dependency_depth) are computed but never persisted to FEAT frontmatter. composite_score stays 0 for all new FEATs so auto-walker sorts them last. Acceptance criteria: AC-1: backlog pm-write subcommand accepted by loop.mts CLI. AC-2: parses --scores JSON and writes pm_customer_impact, pm_effort_estimate, pm_strategic_alignment, pm_technical_risk, pm_dependency_depth to FEAT frontmatter. AC-3: computes and writes composite_score (0.0-1.0) from dimensions using computeCompositePriority. AC-4: --priority and --autonomous-safe flags accepted and written. AC-5: running pm-write on a triaged FEAT does not change its status or move the file.

## In scope

- New `backlog pm-write` subcommand in `loop.mts` CLI
- Parse `--scores` JSON flag and write 5 pm_* dimension fields to FEAT frontmatter
- Compute and write `composite_score` via `computeCompositePriority`
- Accept `--priority` and `--autonomous-safe` flags, write to frontmatter
- Tests covering all AC paths

## Out of scope

- Changing FEAT status or file location
- PM scoring logic changes

## Acceptance criteria

- [ ] AC-1: `node scripts/loop.mjs backlog pm-write --id FEAT-NNN --scores '{"customer_impact":0.8,"effort_estimate":0.3,"strategic_alignment":0.7,"technical_risk":0.2,"dependency_depth":0.1}'` exits 0 and writes pm_customer_impact, pm_effort_estimate, pm_strategic_alignment, pm_technical_risk, pm_dependency_depth to the FEAT frontmatter
- [ ] AC-2: `composite_score` (0.0-1.0) is computed from the 5 dimensions via `computeCompositePriority` and written to FEAT frontmatter
- [ ] AC-3: `--priority P1` and `--autonomous-safe true` flags are accepted and written to frontmatter
- [ ] AC-4: Running pm-write on a triaged FEAT does not change its `status` field or move the file
- [ ] AC-5: `npm test` passes; `npm run lint` clean; `npm run typecheck` clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-043 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
