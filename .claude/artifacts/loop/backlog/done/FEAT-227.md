---
id: FEAT-227
status: done
priority: P1
category: bug
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [backend, memory, bug, learning-loop]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Surfaced by the DEC-067 architect-review (2026-07-06). recallPrior() returns [] unconditionally against the real astramem CLI — parseRecallOutput expects a bare array but the CLI prints an object {hits,total_searched,provider}; and the type guard checks `content` where the real hit shape has `text`. This is the THIRD memory-loop dormancy bug (after worktree-isolation #327 and emit() FEAT-223) — prior-context injection is as dead as emit() was. Mechanical, well-scoped -> autonomous_safe. P1 because it silently zeroes the recall half of the learning loop."
---
# FEAT-227: fix recallPrior() — returns [] unconditionally against the real astramem CLI

## Origin

DEC-067 architect-review (2026-07-06), verified against astramem 0.6.0 source.
Two shape mismatches in `src/scripts/lib/memory-recall.mts` make `recallPrior()`
a permanent no-op against the real CLI:

1. **Top-level shape** — `parseRecallOutput` (≈:199-216) does
   `Array.isArray(parsed)` expecting a bare array. The real CLI (`recall.ts:107`)
   prints `JSON.stringify(response)` where `response = { hits: [...],
   total_searched, provider }` — an object. `Array.isArray` is false →
   `parseRecallOutput` returns `[]` every time.
2. **Hit field name** — even past that, `isRecallResult` checks for a `content`
   field, but the real hit shape (astramem `RecallHitSchema`) uses `text`, not
   `content`. No hit would pass the guard.

Net: prior-context injection (`recallPrior()` → `recall-injector.mts` /
`memory-context.mts`) has been silently dead against the real CLI. This is the
recall-side twin of the emit() write bug (FEAT-223).

## Scope

1. `parseRecallOutput` reads `parsed.hits` (array) from the object response;
   tolerate both the object shape and a bare array (defensive) without throwing.
2. `isRecallResult` / the mapping reads `text` (map to whatever the injector
   expects); reconcile the field names end-to-end so a real hit surfaces in the
   injected Markdown.
3. Replace the `memory-recall.test.mts` fixture that feeds a fabricated array/`content`
   shape with one reflecting the real `{hits:[{...,text,score,type,...}]}` output.
4. Keep the fail-silent contract — a parse miss returns `[]`, never throws.

## Acceptance criteria

- AC-1: GIVEN the real CLI's `{ hits:[…], total_searched, provider }` JSON, WHEN
  `parseRecallOutput` runs, THEN it returns the hits (non-empty), not `[]`.
- AC-2: GIVEN a real hit with a `text` field, WHEN mapped, THEN it surfaces in the
  recall output (the `content`-vs-`text` mismatch no longer drops it).
- AC-3: GIVEN malformed / non-JSON output, WHEN parsed, THEN it returns `[]` and
  never throws (contract preserved).
- AC-4: `memory-recall.test.mts` fixtures assert against the REAL output shape.
- AC-5: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Refs

- `src/scripts/lib/memory-recall.mts` (`parseRecallOutput`, `isRecallResult`, `recallPrior`).
- `src/scripts/lib/recall-injector.mts` / `memory-context.mts` (consumers).
- astramem 0.6.0 `recall.ts` (real output shape) + `RecallHitSchema`.
- DEC-067 (architect-review that found this).
