---
id: SPEC-004
type: adr
title: Code-Quality Pivot — dead-code sweep + tsconfig tighten + perf top-10
status: satisfied
priority: P2
target_release: v0.26.0
created: 2026-06-07
updated: 2026-06-07
owner: null
derived_features: [FEAT-069, FEAT-070, FEAT-071]
---
# SPEC-004: Code-Quality Pivot — dead-code sweep + tsconfig tighten + perf top-10

## Problem

The `loop` plugin has accumulated ~90 source modules across rapid feature
pivots. Several modules are deprecated by decision (DEC-011 removes
the marker-queue dispatch path), one-shot migrations remain in the
build tree, and the tsconfig is materially looser than the team
TypeScript standards at `C:\work\mega\standards\docs\typescript`:

| Standards flag | Current | Standard |
|---|---|---|
| `noImplicitAny` | `false` | `true` |
| `useUnknownInCatchVariables` | `false` | `true` |
| `noUnusedLocals` | absent | `true` |
| `noUnusedParameters` | absent | `true` |
| `noImplicitOverride` | absent | `true` |
| `noFallthroughCasesInSwitch` | absent | `true` |
| `exactOptionalPropertyTypes` | absent | `true` |
| `noUncheckedIndexedAccess` | absent | `true` |

Quantified gaps:

- 255 `: any` occurrences across 71 files
- 33 `as any` across 8 files
- 23 `catch (e)` blocks with implicit `any`
- 5 deprecated/one-shot modules with 3 paired test files

No perf baseline exists. Hot CLI commands (`/loop:brief`, `/loop:triage`,
`/loop:auto`) re-walk the backlog tree multiple times per invocation and
re-parse the same frontmatter blocks.

## Goals

1. Reduce maintenance surface by deleting confirmed-dead modules + tests.
2. Align `tsconfig.json` with the standards (excluding React-specific
   rules — this is a Node CLI plugin).
3. Apply Result<T, E>, branded IDs, and discriminated unions per
   patterns guidance where it removes a real failure mode.
4. Measurable ≥20% wall-clock cut on the top 3 hot CLI commands
   without behavior regression elsewhere.

## Non-goals

- React conventions, accessibility, CSS rules — not applicable.
- Re-architecting the slice ceremony / crew dispatch contract.
- Renaming public CLI surface (`/loop:*`).
- Splitting modules below the 400-line repo limit unless naturally
  required by a refactor in scope.

## User stories / journeys

- As a contributor, when I open any source file I see narrow types
  instead of `any` so the compiler catches misuse early.
- As an operator running `/loop:auto`, the loop spends less wall-clock
  per iteration because frontmatter parses are memoized and the
  backlog tree is walked once per invocation.
- As a maintainer reviewing a PR, I see fewer modules in the source
  tree because deprecated migration helpers and the dead marker-queue
  path are gone.

## Success metrics

- Phase A: ≥1500 LoC net reduction; CI green; no `/loop:*` behavior
  change.
- Phase B: `tsconfig.json` matches the relevant subset of the standards
  doc; CI green per slice; no Result<T, E> leak past the parser/gate
  seam.
- Phase C: perf harness in place; ≥20% wall-clock cut on the top 3
  commands (`/loop:brief`, `/loop:triage`, `/loop:auto`); no other
  command regresses >5%.

## Approach (decomposition target)

Three phase-FEATs in execution order. Each phase decomposes into
small slices, each green at CI:

- **Phase A — Dead-code sweep** (3 slices). Delete `marker-drain`,
  marker-write path in `auto-dispatch`, `adhoc-migrator`,
  `legacy-migrator`, `codemod-add-any`, `migrate-product-backlog` and
  their tests. Update callers in `loop-installer.mts` and
  `slice-linker/complete-slice.mts`.
- **Phase B — Tsconfig tighten + standards alignment** (8 slices,
  graduated). One tsconfig flag per slice: `noImplicitAny` +
  `useUnknownInCatchVariables` → `noUnusedLocals` +
  `noUnusedParameters` → `noImplicitOverride` +
  `noFallthroughCasesInSwitch` → `exactOptionalPropertyTypes` →
  `noUncheckedIndexedAccess`. Then Result<T, E> rollout for parsers
  and gates, branded IDs for FEAT/SLICE/SPEC/DEC/GRADE, and
  discriminated unions replacing boolean-flag state shapes in
  `stop-conditions`, `walker-gates`, `halt-badges`.
- **Phase C — Top-10 perf wins** (3 slices). C1 lands a `node:test`
  bench harness with a 10% regression gate. C2 ships wins 1–5
  (memoize frontmatter, single backlog snapshot, lazy subcommand
  load, batched git reads, parallel fs walk). C3 ships wins 6–10
  (hoisted regex, per-process decisions/grade memo, structuredClone,
  Map lookups, telemetry batch flush).

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| B5 (`noUncheckedIndexedAccess`) touches every loop body — diff blows past 800 LoC | Pre-split B5a/B5b along directory boundary; ship B5a first |
| Dead-code deletion breaks a hidden caller | A1 verifies via `npm test`; A1 step ordering requires loop-installer caller removal before legacy-migrator delete |
| Result<T, E> retrofit ripples through call sites | B6 scopes to parsers + gates only; entry points retain throw + catch at boundary, so callers in `loop.mts` unchanged |
| Perf harness flakiness on CI | Use median of N runs; assert against rolling baseline, not absolute |
| Memoization introduces stale reads across long-running auto-mode | Key by `(path, mtime)`; invalidate on snapshot boundary |

## References

- Brainstorming design: `docs/superpowers/specs/2026-06-07-code-quality-pivot-design.md`
- Implementation plan (task-level): `docs/superpowers/plans/2026-06-07-code-quality-pivot.md`
- Standards: `C:\work\mega\standards\docs\typescript\coding-conventions.md`,
  `C:\work\mega\standards\docs\patterns\design-patterns.md`
- DEC-011 — supersedes DEC-004 (marker queue deprecation)
