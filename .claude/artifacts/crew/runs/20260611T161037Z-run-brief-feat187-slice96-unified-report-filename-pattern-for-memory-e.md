---
feature: FEAT-187
status: active
---
# Run Brief: FEAT187 SLICE96: Unified report filename pattern for memory-engine tag parsing

- Created: 2026-06-11T16:10:37.720Z
- Tier: full
- Goal: Report filenames across `.claude/artifacts/crew/**` and `.claude/artifacts/loop/**` use ~6 distinct conventions. Hyphens inside tokens (`SLICE-93`, `FEAT-060`, `2026-06-04`, `cost-report-slice`, `agent-report`, `review-result`, `final-synthesis`) prevent clean tag extraction via `filename.split('-')`. Trailing title slugs (`expose-checkpointdue-sliceclosessincecheckpo`, `fanout-wiring-validation`) inject N junk tokens per file. Goal: ingest reports into a memory engine where every `-`-separated 
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - SLICE-A (smallest viable per PM scope notes): spec doc + helper extension + writer audit. No behavior change. No writer flips. No on-disk rename.

- **Spec doc**: write `docs/conventions/report-filenames.md` — single source of truth for the unified pattern. Grammar
  - kind mapping table (camelCase)
  - examples
  - tag-extraction contract (`path.basename(f).split('-')`).
- **Helper extension**: extend `src/scripts/lib/artifact-naming.mts`:
  - add `buildArtifactFilename({ ts
  - kind
  - featureId
  - phase
  - sliceId
  - title?
  - ext })` wrapper that reuses existing `tight()` + `buildArtifactSlug()`.
  - `kind` MUST be camelCase single token; helper validates via regex `/^[a-z][a-zA-Z0-9]*$/` and throws on violation.
  - `title` (optional) coerced to single camelCase token via new `camelTight()` helper
  - max 24
- Out Of Scope:
  - - Flipping any writer to use the new helper (SLICE-B).
- Reader regex dual-accept changes (SLICE-B).
- On-disk migration script (SLICE-C).
- Renaming existing artifacts (SLICE-C).
- Hero-crew coordination / upstream-request (precondition for SLICE-C
  - not this slice).
- Memory-engine consumer wiring (separate FEAT
  - not yet filed).
- Planned Files: -
- Next Step: Begin implementation

