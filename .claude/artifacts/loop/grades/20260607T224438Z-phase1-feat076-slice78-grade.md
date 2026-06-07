---
id: GRADE-SLICE-78
slice: SLICE-78
feature: FEAT-076
spec: docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md
phase: 1
target_release: v0.27.0
graded_at: 2026-06-07
duration_hours: 4
scores: null
decisions: [DEC-028, DEC-029]
---
# SLICE-78: Preset-driven skill activation Phase 1 — Grade

**Phase:** 1 · **Feature:** FEAT-076 · **Slice:** SLICE-78

## Scores

- architecture_quality: 0.90
- reliability: 0.85
- observability: 0.70
- production_readiness: 0.85
- security: 0.90
- test_confidence: 0.90
- product_completeness: 0.80

## Lessons

- Brainstorming-then-plan-then-subagent-execute flow scales surprisingly well — three modules + CLI + 6 preset edits + classifier removal landed in one session with green tests at every checkpoint.
- Three-exit-code contract (0 ok / 1 error / 2 no-match) made the resolver CLI immediately consumable by shell callers without parsing stderr — paid off in Phase 2 (orchestrate-slice) and in role-side wiring later.
- Authoring "fallback" path (builder uses baked-in routing when resolver returns null) means Phase 1 ships without breaking anyone; Phase 2/3 can adopt incrementally.
- `deepMerge` with `$replace` marker was the right escape valve — never needed it for shipped presets, but having it documented prevents future "how do we drop an inherited skill?" arguments.

## Decisions

### DEC-028: Three exit codes for resolve-skills CLI (0/1/2)

**Rationale**: Resolver has three meaningful outcomes — happy resolve, error, and "valid input but no skill loadout for this variant". Mapping each to a distinct exit code lets shell callers branch cleanly without parsing stderr or stdout.

**Consequences**:
- positive: CLI consumers (operator, /crew:orchestrate-slice, /loop:backlog-enrich) all use the same `case $? in 0) ...; 1) halt;; 2) fallback;; esac` pattern.
- positive: Test coverage trivially exercises the three branches.
- negative: Three-valued protocol is one more thing for new contributors to learn. Mitigated by documenting in CHANGELOG and inline in `runResolveSkillsCommand`.

### DEC-029: Stay at schemaVersion:1 for additive optional fields

**Rationale**: When FEAT-075 added `roles.<name>.skills` to the preset schema, the change was additive and optional. Bumping schemaVersion to 2 would have forced every consumer (and every shipped preset file) to update for no behavior change. Per Phase 1 design's backward-compat rule: additive optional fields keep v1.

**Consequences**:
- positive: All 6 shipped presets updated with new roles block at v0.28.0 without schema version bump.
- positive: Downstream override `.claude/loop.json` files in sibling repos work unchanged.
- negative: Future readers may not realize roles arrived later than the base shape. Mitigated by CHANGELOG entry on v0.28.0.

## Surprises

- The brainstorming-spec-plan flow naturally produced a Phase 2 + Phase 3 roadmap inside the design doc, which kept later work bounded and explicit. Did not expect "design phasing" to fall out of the brainstorming skill so cleanly.
- Skill-ID vocabulary turned out to be opaque: there is no upstream registry today. Loop forward-declares IDs like `csharp-pro` that don't exist yet. The reviewer caught this; it became its own upstream-request (FEAT-077).

## Followups

- Phase 2: `/crew:orchestrate-slice` integration in hero-crew (shipped as hero-crew v0.19.0 right after this slice — see SLICE-79 area).
- Phase 3: delete static "Required skills" tables from `crew:builder*` agents after one release cycle.
- Skill registry / lint: when upstream ships `csharp-pro`, `a11y-advisory`, `vue-engineering`, revisit the `--strict` flag to make it a hard validation gate (today it is a stderr-warn no-op).

## What went well

The subagent-driven-development flow paid dividends: a fresh implementer per task with two-stage review (spec + code quality) caught issues early (e.g. tighten `presetRaw` typing, `--strict` honesty) that would otherwise have shipped as silent quality debt. Test coverage stayed at >=948 tests through every commit.

## What went wrong

Nothing materially. One minor — the v0.27.0 final reviewer flagged four follow-up items as Minor/Important; they were deferred to FEAT-077 (SLICE-80) instead of folded into the slice. A more disciplined operator would have closed at least the cheapest one (`--strict` warn, ~5 lines) before declaring v0.27.0 done.

## What I would do differently next time

Author the upstream-request for forward-declared skill IDs at the same time as the preset edit that introduces them, not as a v0.28.2 backfill. The doc takes 5 minutes; deferring it created a real cross-plugin gap.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_78_PRESET-DRIVEN-SKILL-ACTIVATION-PHASE-1.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-076.md`
- design spec: `docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md`
- implementation plan: `docs/superpowers/plans/2026-06-07-preset-driven-skill-activation.md`
- release tag: `v0.27.0` (commit `5f305be`)
