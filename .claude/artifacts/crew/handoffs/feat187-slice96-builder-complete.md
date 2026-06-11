---
title: SLICE-96 artifact-naming extension + docs
status: completed
confidence: high
builder: builder
from: builder
to: lead
feat: FEAT-187
slice: SLICE-96
created_at: 2026-06-11
---

# Handoff: SLICE-96 -- Unified report filename pattern

## Summary

Added `KIND_REGISTRY`, `camelTight`, and `buildArtifactFilename` to
`artifact-naming.mts`; wrote the spec doc and writer audit; extended the test
suite to assert all 6 ACs.

## AC Status

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 | PASS | 33 tests pass, 0 fail; lint 0 errors 0 warnings on changed files |
| AC-2 | PASS | `docs/conventions/report-filenames.md` exists; lists all 17 kinds; includes 6 example transforms covering cost-report-slice, agent-report, review-result, grade, SLICE-NN.json marker, and title-slug elimination |
| AC-3 | PASS | Test "AC-3: buildArtifactFilename returns canonical filename" asserts `"20260611T123843Z-costReportSlice-feat187-slice96.md"` |
| AC-4 | PASS | Test "AC-4: buildArtifactFilename throws camelCase error for kebab kind" asserts error contains "camelCase" |
| AC-5 | PASS | Test "AC-5: buildArtifactFilename throws KIND_REGISTRY error for unknown kind" asserts error contains "KIND_REGISTRY" |
| AC-6 | PASS | Tests AC-6a/b/c assert exactly 4 tokens for costReportSlice, agentReport, reviewResult |
| AC-7 | PASS | `docs/conventions/report-filenames-writer-audit.md` exists; classifies 17 writer call-sites across 14 modules; every entry has file:line citation and S/M/L effort |

## Files changed

- `src/scripts/lib/artifact-naming.mts` -- added `KIND_REGISTRY`, `camelTight`, `buildArtifactFilename`, `BuildArtifactFilenameOpts`
- `src/tests/artifact-naming.test.mts` -- extended import + 20 new tests (33 total)
- `docs/conventions/report-filenames.md` (new) -- grammar, kind table, 6 example transforms, tag-extraction contract
- `docs/conventions/report-filenames-writer-audit.md` (new) -- 17 writer call-sites classified with file:line + S/M/L effort

## Test output excerpt

```
bun test v1.3.14
 33 pass
 0 fail
Ran 33 tests across 1 file. [41.00ms]
```

## Lint output excerpt

```
bunx eslint src/scripts/lib/artifact-naming.mts src/tests/artifact-naming.test.mts
(no output -- 0 errors, 0 warnings)
```

Full suite: 1266 pass, 49 skip, 0 fail (131 files).

## Self-Verify Gates

| Gate | Result |
|------|--------|
| `bun test src/tests/artifact-naming.test.mts` | PASS (33/33) |
| `bun test src/tests/ --parallel` | PASS (1266/1315, 49 skip) |
| `bunx eslint` on changed files | PASS (0 errors, 0 warnings) |
| Secret grep on diff | PASS (no matches) |

## Confidence

**high** -- all ACs pass with direct test assertions; pure additive change, no
behavior change to existing writers; full suite green.

## Risks

- `buildArtifactFilename` requires `sliceId`. Writers that are not slice-scoped
  (`pm-artifact-writer`, `auto-walker`) will need a convention decision before
  SLICE-B can flip them. Noted in writer audit under M-effort.
- The `KIND_REGISTRY` is a `Set<string>` at runtime. TypeScript callers get a
  string type for `kind`, not a union -- no compile-time exhaustiveness. A
  const-assertion union can be added in SLICE-B if desired.
- `fanout-marker` and `shape-marker` use bare `SLICE-NN.json` filenames; their
  readers (`ceremonies.mts`, `grade-telemetry.mts`) also parse that pattern.
  SLICE-B flip for these is L-effort and requires dual-accept regex; flagged
  in audit.
- scope-cross: `docs/conventions/` is a new directory -- no ownership conflicts.

## Next handoff

Reviewer A: validate AC-3/4/5/6 test assertions + KIND_REGISTRY 17-kind
coverage + camelTight correctness.
Reviewer B: validate spec doc self-containment + writer-audit exhaustiveness +
confirm no behavior change (full suite still green).
