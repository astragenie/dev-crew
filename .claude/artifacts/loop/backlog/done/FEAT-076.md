---
id: FEAT-076
status: done
priority: P1
category: feature
target_release: v0.27.0
created: 2026-06-07
updated: 2026-06-07
started_at: 2026-06-07
completed_at: 2026-06-07
depends_on: []
slices: [SLICE-78]
derived_from: docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md
priority_band: critical-path
pm_customer_impact: 0.7
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.85
pm_technical_risk: 0.25
pm_dependency_depth: 0.15
composite_score: 0.72
composite_priority: P1
autonomous_safe: false
tags: [feature, workflow]
triage_notes: Retroactive FEAT documenting v0.27.0 preset-driven skill activation Phase 1. Spec brainstormed + designed + planned + implemented + shipped in a single session via /superpowers:brainstorming → writing-plans → subagent-driven-development → finishing-a-development-branch. Filed retroactively for ceremony linkage on 2026-06-07.
---

# FEAT-076 — Preset-driven skill activation (Phase 1)

## Context

Project-level stack identity (language, framework, contract type, deployment) is **known in advance** per repo and does not vary feature-to-feature. The pre-Phase-1 model classified per-FEAT via architect dispatch and embedded routing tables inside `crew:builder-fe.md` / `crew:builder-be.md`. Costs: token waste, two sources of truth, cross-plugin routing table maintenance.

## Outcome

Phase 1 ships in loop v0.27.0 — preset schema v1 with `projectType`, `split`, `frontend`, `backend`, `contract`, `deployment`, and `skills` (or `fe.skills` + `be.skills`) blocks. New `node scripts/loop.mjs resolve-skills --variant <fe|be|single>` CLI emits a `## Required skills (resolved)` Markdown block ready for builder dispatch injection. Three exit codes (0 ok, 1 error, 2 no-match) give clean shell branching.

## Linkage

- Spec: `docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md`
- Plan: `docs/superpowers/plans/2026-06-07-preset-driven-skill-activation.md`
- Slice: SLICE-78
- Release: loop v0.27.0
- Upstream-request resolved: `docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md` (superseded by resolver CLI; closed by hero-crew v0.19.0)

## Acceptance criteria

- Preset schema v1 lands with `validatePreset` enforcement (SchemaError on bad schemaVersion / projectType / split mutex / missing fe/be blocks).
- `resolveSkills(args)` returns `{ variant, skills, source, dispatchInstructionBlock } | null`. Pure function; non-mutating.
- CLI subcommand `resolve-skills` wraps with 3 exit codes. JSON output on 0.
- Manifest validator validates every shipped preset at CI time.
- All 6 shipped presets carry v1 fields.
- `/loop:backlog-enrich` architect classifier no longer emits `stack:*` / `surface` (preset is sole source).
- 948 tests pass at v0.27.0; lint + format + manifest gates clean; `git diff --exit-code scripts/` clean.

## Status note

Filed and closed retroactively. Implementation already on `main` at v0.27.0 (commit `5f305be`).
