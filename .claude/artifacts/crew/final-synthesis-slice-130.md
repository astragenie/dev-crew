# Final Synthesis — SLICE-130 (FEAT-179)

## Outcome: PASS

## Deliverables
- `src/scripts/lib/learnings-decay.mts`: decay multiplier (~10%/week), confidence update on load
- `src/scripts/lib/learnings-citations.mts`: citation append to `citations.jsonl`, utility score update (+1 pass / -2 fail)
- `src/scripts/lib/learnings-ranker.mts`: `rankLearnings()` sorts by decay×utility composite, `--limit N` applied post-rank
- `src/scripts/loop.mts`: `lessons rank [--query <title>] [--limit N]` CLI subcommand wired
- `src/tests/learnings-decay.test.mts`: decay computation tests
- `src/tests/learnings-citations.test.mts`: 7 citation append + utility update tests
- `src/tests/learnings-ranker.test.mts`: 7 ranker ordering + limit tests

## Evidence
- Tests: 1510 pass / 49 skip / 1 pre-existing fail (zero new failures)
- TSC: clean
- ESLint: 0 new warnings
- Prettier: formatting advisory from Reviewer B (non-blocking)
- Reviewer A: PASS (after limit-before-rank fix applied)
- Reviewer B: PASS with advisories (complexity 16 vs cap 15; prettier format)
- Verifier: PASS

## Key lessons

1. `--limit N` MUST be applied AFTER `rankLearnings()` — pre-slicing by insertion order silently returns wrong top-N. The limit is a post-sort trim, never a pre-filter.
2. `sonarjs/no-duplicate-string` fix pitfall with `replace_all`: replaces the const initializer alongside usage sites, creating a circular self-reference. Fix: restore the literal in the const declaration, replace only the downstream usage sites.
3. `exactOptionalPropertyTypes: true` strictness: `string | undefined` is NOT assignable to `query?: string`. Use conditional spread `...(x !== undefined ? { x } : {})` rather than direct property assignment.

## Grade summary
- Composite: 0.84 (architecture_quality 0.84, reliability 0.83, observability 0.79, production_readiness 0.80, security 0.90, test_confidence 0.87, product_completeness 0.86)
- Grade file: `.claude/artifacts/loop/grades/20260613T130000Z-feat179-slice130-grade.md`

## Backlog
- FEAT-179 moved from `in-progress/` to `done/`
- Target release: v0.49.1
- CHANGELOG entry added under `## [0.49.1] — 2026-06-13`
