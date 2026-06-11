---
id: SLICE-96
title: Unified report filename pattern for memory-engine tag parsing
status: pending
feature: FEAT-187
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-11
updated: 2026-06-11
github_issue: 213
github_url: "https://github.com/sergeymilashico/loop/issues/213"
---
# SLICE-96: Unified report filename pattern for memory-engine tag parsing

Implements FEAT-187. See [feature file](../../../backlog/in-progress/FEAT-187.md) for product context.

## Objective

Report filenames across `.claude/artifacts/crew/**` and `.claude/artifacts/loop/**` use ~6 distinct conventions. Hyphens inside tokens (`SLICE-93`, `FEAT-060`, `2026-06-04`, `cost-report-slice`, `agent-report`, `review-result`, `final-synthesis`) prevent clean tag extraction via `filename.split('-')`. Trailing title slugs (`expose-checkpointdue-sliceclosessincecheckpo`, `fanout-wiring-validation`) inject N junk tokens per file. Goal: ingest reports into a memory engine where every `-`-separated segment is one semantic tag.

## In scope

SLICE-A (smallest viable per PM scope notes): spec doc + helper extension + writer audit. No behavior change. No writer flips. No on-disk rename.

- **Spec doc**: write `docs/conventions/report-filenames.md` — single source of truth for the unified pattern. Grammar, kind mapping table (camelCase), examples, tag-extraction contract (`path.basename(f).split('-')`).
- **Helper extension**: extend `src/scripts/lib/artifact-naming.mts`:
  - add `buildArtifactFilename({ ts, kind, featureId, phase, sliceId, title?, ext })` wrapper that reuses existing `tight()` + `buildArtifactSlug()`.
  - `kind` MUST be camelCase single token; helper validates via regex `/^[a-z][a-zA-Z0-9]*$/` and throws on violation.
  - `title` (optional) coerced to single camelCase token via new `camelTight()` helper, max 24 chars. Drop on overflow rather than truncate to junk.
  - export kind registry: `KIND_REGISTRY` constant listing the canonical 17 kinds from the mapping table — helper throws when caller passes an unregistered kind. Forces additions to land in the registry.
- **Writer audit (read-only)**: produce `docs/conventions/report-filenames-writer-audit.md` listing every writer module under `src/scripts/lib/**` that currently templates a filename, classified by:
  - already routes through `buildArtifactSlug` (good)
  - templates manually with tight segments (easy flip)
  - templates manually with multi-token kind (needs flip + mapping)
  - non-standard pattern (legacy: `phase3-*`, `FEAT-*-contracts.md`, `SLICE-*.json`, `2026-*.md`)
- **Tests** for `buildArtifactFilename` + `camelTight` + `KIND_REGISTRY` validation + reject path.

## Out of scope

- Flipping any writer to use the new helper (SLICE-B).
- Reader regex dual-accept changes (SLICE-B).
- On-disk migration script (SLICE-C).
- Renaming existing artifacts (SLICE-C).
- Hero-crew coordination / upstream-request (precondition for SLICE-C, not this slice).
- Memory-engine consumer wiring (separate FEAT, not yet filed).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and linter is clean (`bun run lint`).
- [ ] AC-2: `docs/conventions/report-filenames.md` exists, lists all 17 canonical kinds, includes ≥5 example transforms (old → new) covering at least: cost-report-slice, agent-report, review-result, grade, SLICE-NN.json marker.
- [ ] AC-3: `buildArtifactFilename({ts:"20260611T123843Z", kind:"costReportSlice", featureId:"FEAT-187", sliceId:"SLICE-96", ext:"md"})` returns `"20260611T123843Z-costReportSlice-feat187-slice96.md"`. Asserted by test.
- [ ] AC-4: `buildArtifactFilename({...kind:"cost-report-slice", ...})` throws with message containing `"camelCase"` (kebab-case kind rejected). Asserted by test.
- [ ] AC-5: `buildArtifactFilename({...kind:"unregisteredKind", ...})` throws with message containing `"KIND_REGISTRY"`. Asserted by test.
- [ ] AC-6: `path.basename(buildArtifactFilename(...)).split('-')` yields exactly 4 tokens for the canonical shape (ts, kind, featId, sliceId) — no junk segments. Asserted by test for ≥3 cases.
- [ ] AC-7: Writer audit doc `docs/conventions/report-filenames-writer-audit.md` exists, classifies every writer under `src/scripts/lib/**` that produces a filename, gives file:line citation for each, and lists per-classification migration effort (S/M/L).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-187 stays in `in-progress/` (SLICE-B + SLICE-C still pending)
- Crew `final-synthesis` artifact written
- `requires_validation: false` — pure additive helper + docs, no behavior change. Tests gate correctness.

## Reviewer ladder

- Reviewer A (correctness): validate AC-3/4/5/6 test assertions match helper behavior; confirm `KIND_REGISTRY` covers all 17 kinds from the mapping table; verify `camelTight` does not emit invalid camelCase.
- Reviewer B (production-readiness): validate spec doc is self-contained (no external refs required to implement SLICE-B); verify writer-audit doc is exhaustive (no module under `src/scripts/lib/**` that writes a filename is missing); confirm no behavior change for existing writers (smoke: existing test suite still green).

## Files

- `docs/conventions/report-filenames.md` (new)
- `docs/conventions/report-filenames-writer-audit.md` (new)
- `src/scripts/lib/artifact-naming.mts` (extend — add `buildArtifactFilename`, `camelTight`, `KIND_REGISTRY`)
- `src/tests/artifact-naming.test.mts` (new or extend existing)
