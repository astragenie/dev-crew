---
id: GRADE-SLICE-79
slice: SLICE-79
feature: FEAT-075
phase: 1
target_release: v0.28.0
graded_at: 2026-06-07
duration_hours: 2
scores: null
decisions: [DEC-030]
---
# SLICE-79: Role-agent skill activation (FEAT-075) — Grade

**Phase:** 1 · **Feature:** FEAT-075 · **Slice:** SLICE-79

## Scores

- architecture_quality: 0.85
- reliability: 0.85
- observability: 0.70
- production_readiness: 0.85
- security: 0.90
- test_confidence: 0.85
- product_completeness: 0.65

## Lessons

- Mirroring an established pattern is cheap. Phase 1 resolver shape (preset block → resolver picks → CLI variant flag) extended to role variants in 4 small edits: union type widening, `pickBlock` branch, CLI VALID_VARIANTS list, validator helper.
- "product_completeness" is the lowest score: only the architect dispatch flow (`/loop:backlog-enrich`) is wired. PM was wired in SLICE-80; researcher and document-writer dispatchers don't exist as inline slash-flow calls today. Scoring honestly here keeps the next-slice priority clear.
- `Partial<Record<RoleName, { skills: string[] }>>` on `PresetV1.roles` was the right shape — exactness is enforced by `validateRoles`, types let consumers safely default-out missing keys.

## Decisions

### DEC-030: Extend Variant union to include RoleName rather than add a separate --role flag

**Rationale**: Adding `--role pm` as a separate CLI flag would have created two parallel surfaces (`--variant fe|be|single` and `--role pm|researcher|...`) for what is conceptually one selection. Widening the existing `--variant` to accept role names keeps the API single-axis. `pickBlock` branches on `isRoleVariant` early; behavior stays clear.

**Consequences**:
- positive: CLI surface stays uniform. `resolve-skills --variant pm` reads the same as `resolve-skills --variant fe`.
- positive: Test matrix collapsed: same `Variant` union tested for all 7 values.
- negative: Discriminating role vs builder variants requires `isRoleVariant()` helper. Mitigated — helper is 1 line and self-documenting.

## Surprises

- Resolver dispatch block worked end-to-end at first attempt for the architect path. Existing tests caught no regressions. Wiring the slash flow (`commands/backlog-enrich.md`) was a 5-line Markdown edit.
- Preset-roles default loadout (`superpowers:verification-before-completion`, `loop:loop-discipline`, `superpowers:brainstorming`) was light — only 1-2 skills per role. Whether that's enough or whether role-specific skills should be authored is open.

## Followups

- Wire PM dispatcher in `/loop:triage` (done in SLICE-80, v0.28.1).
- Wire researcher / document-writer dispatchers — their current slash flows don't dispatch inline. Need new CLI subcommands or workflow refactor before wiring is possible.
- Author role-specific domain skills (e.g. `skills/domain/pm-priority-frameworks/`) and add to preset role loadouts. Deferred — current minimal loadouts sufficient.

## What went well

Plan reuse. FEAT-075 was a literal mirror of FEAT-074's Phase 1 shape. Resolver extension diff tiny; test additions followed the same pattern; preset edits were 6-file find-and-replace. From dispatch to v0.28.0 release tag was under 2 hours.

## What went wrong

`commands/backlog-enrich.md` step renumbering — added "Step 3 — Resolve architect skills" but forgot to bump subsequent step numbers (4→5, 5→6, 6→7) on first pass. Caught on self-review before commit, but it's a class of mistake invisible to automated tools.

## What I would do differently next time

Run the resolver CLI smoke against the freshly-edited preset BEFORE committing the preset, not after. CLI exits 0/1/2 and JSON-dumps the result — instant validation that the schema parse and `pickBlock` find the new roles entry.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_79_ROLE-AGENT-SKILL-ACTIVATION.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-075.md`
- release tag: `v0.28.0` (commit `7d4bd62`)
