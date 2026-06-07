---
slice: SLICE-77
feature: FEAT-074
created: 2026-06-07
owner: builder
status: complete
confidence: high
---
# Handoff: SLICE-77 — noUncheckedIndexedAccess B5 tsconfig tighten

## Objective

Enable `noUncheckedIndexedAccess: true` in tsconfig.json and fix all resulting type errors. Pure mechanical type-safety enforcement — no behavior change.

## Changed files

**Config:**
- `tsconfig.json` — added `"noUncheckedIndexedAccess": true`

**Source fixes (src/scripts/):**
- `codemod-add-any.mts` — `!` on `ln` array elements (bounded loop invariant), `!` on regex match groups
- `lib/ac-linter.mts` — `!` on regex match groups
- `lib/ceremonies.mts` — `!` on regex match groups
- `lib/classify-parser.mts` — `!` on regex match groups
- `lib/cost-alert-loader.mts` — `??` defaults on object index access
- `lib/cost-regression.mts` — `!` on bounded array index after length check
- `lib/frontmatter.mts` — `!` on regex match groups, `??` for optional captures
- `lib/grade-parser.mts` — `!` on regex match groups
- `lib/grade-trend.mts` — `!` on regex match groups
- `lib/lessons-feed.mts` — `!` on bounded array index
- `lib/loop-installer-scaffold.mts` — `!` on required token fields (`backlogPath`, `slicesRoot`)
- `lib/loop-installer.mts` — `!` on required token fields (`backlogPath`, `aiLoopRoot`)
- `lib/memory-snapshot.mts` — `!` on bounded array index
- `lib/phase-gate.mts` — `!` on regex match groups `m[1]`, `m[2]`; `!` on `prior[0]` after length guard
- `lib/pm-scorer.mts` — `?? 0` on `Record<string, number>` score lookups
- `lib/retrospective.mts` — `!` on bounded object property access
- `lib/reviewer-ladder.mts` — `!` on bounded array index
- `lib/score-inference.mts` — `!` on bounded object properties
- `lib/slice-cost-ceiling.mts` — `!` on regex match groups `m[1]`, `m[2]`
- `lib/slice-linker/agent-report-writer.mts` — `!` on regex match groups; extract `pi`/`pj` from bounded for-loop
- `lib/slice-linker/dispatch.mts` — `!` on bounded array index
- `lib/slice-linker/slice-progress.mts` — `!` on bounded array indexes
- `lib/slice-plan.mts` — `!` on regex match groups (`h1[1]`, `objMatch[1]`, `m[1]`); `!` on `inScopeMatch[1]`
- `lib/validation-gate.mts` — `!` on regex match group `m[1]`
- `lib/walker-gates.mts` — `!` on regex match group `match[1]`
- `loop.mts` — `!` on bounded `rest[index]` in flag-parse loop
- `migrate-product-backlog.mts` — `!` on bounded array indexes

**Compiled output (scripts/):**
- 11 .mjs files updated by `npm run build`

## Fix pattern decisions

- **`!` on regex match groups** — safe when regex has a mandatory capture group and overall match is non-null (checked before use). `m[1]!` not `m[1]` because TypeScript cannot infer capture group existence.
- **`!` on bounded for-loop array access** — `rest[index]` where `index < rest.length` invariant is explicit in loop condition; TypeScript cannot narrow this.
- **`!` on `prior[0]` after `prior.length > 0`** — ternary prevents narrowing; assert safe.
- **`?? 0` for `Record<string, number>` scores** — `computeCompositePriority` and `computeAutonomousSafe` callers guarantee all score keys present, but `?? 0` is the correct semantic default (missing score = 0 = worst case) rather than `!`.
- **`!` on required tokens** — `tokens.backlogPath`, `tokens.aiLoopRoot`, `tokens.slicesRoot` are always populated by the config loader; `!` is correct over `?? ""` since empty string would silently produce wrong paths.

## Self-verify gate results

| Gate | Command | Result |
|------|---------|--------|
| AC-1 typecheck | `npm run typecheck` | exit 0, 0 errors |
| AC-2 lint | `npm run lint` | exit 0, 0 warnings |
| AC-3 tests | `npm test` | exit 0, 922 pass 0 fail 1 skip |
| AC-4 no suppressions | `grep -r "ts-ignore\|ts-expect-error" src/scripts/` | 1 pre-existing `@ts-ignore` in loop.mts (github-sync.mjs runtime shim — not added by this slice) |
| AC-5 build | `npm run build` | exit 0, 11 .mjs files updated |

## Risks / open questions

None. Pure type annotation change — no runtime behavior affected.
