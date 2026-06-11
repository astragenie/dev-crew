---
id: SLICE-99
title: "Frontmatter parser: arrays of mappings (FEAT-168 slice-b)"
status: completed
feature: FEAT-168
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
completed_at: 2026-06-11
---
# SLICE-99: Frontmatter parser — arrays of mappings (FEAT-168 slice-b)

Tech-debt enabler for FEAT-168 AC-4 + AC-5. The in-tree frontmatter parser/writer in `src/scripts/lib/frontmatter.mts` does not currently round-trip a YAML array of mappings:

```yaml
proposed_slices:
  - id_suffix: -SLICE-1
    title: Library + unit tests
    points: 5
  - id_suffix: -SLICE-2
    title: CLI + agent
    points: 3
```

`parseFrontmatter` reads `- id_suffix: -SLICE-1` as the opaque string `"id_suffix: -SLICE-1"` because `tryConsumeContinuation`'s block-array branch always treats array items as string scalars. `serializeFrontmatter` cannot emit the block form because `serializeScalar` flattens arrays to inline `[a, b, c]` form, which corrupts `[object Object]` on mapping items.

`feature-lifecycle.mts:282-290` carries an explicit comment deferring `parseProposedSlices`-via-frontmatter wiring until this slice lands.

## Objective

Extend the parser to recognize a block-array item whose payload starts with `key: value` as the first key of a new mapping, and extend the writer to emit block-form arrays-of-mappings. One level of nesting only (matches the rest of the parser's depth budget).

## In scope

- `src/scripts/lib/frontmatter.mts`:
  - Add `arrayItemsAreMappings: boolean` to `ParseState`. Reset on `resetState`.
  - In `tryConsumeContinuation`'s block-array branch: after stripping `- `, try `KEY_VALUE_RE` on the remainder. If it matches, push `{ key: parseScalar(value) }` to the array and set `arrayItemsAreMappings = true`; otherwise keep the existing string-scalar push and set `arrayItemsAreMappings = false`.
  - Insert a new continuation case: when `currentArrayKey && arrayItemsAreMappings` and the line matches `NESTED_KV_RE` but NOT `BLOCK_ARRAY_ITEM_RE`, append `key: value` onto the last mapping in the array.
  - Add `isArrayOfMappings(value)` helper: array, non-empty, every item is a plain mapping.
  - In `serializeFrontmatter`: when value passes `isArrayOfMappings`, emit block form (`  - firstKey: value` for the first key, `    nextKey: value` for the rest, two-space increments matching existing indent).

- `src/tests/frontmatter.test.mts`:
  - 1 round-trip test using the `proposed_slices` shape spec'd above.
  - 1 parse-only test asserting the array contains real objects (not strings).
  - 1 serialize-only test asserting block form is emitted (no `[object Object]`).
  - 1 regression test: a flat block array of strings still parses + serializes unchanged.

## Out of scope

- Multi-level nesting (mapping inside mapping inside array) — same single-level budget as the rest of the parser. Document the cap in the module header.
- Mixed arrays (some strings, some mappings) — fall back to existing string-scalar behavior; tests assert this is a clean limitation, not a corruption.
- Schema validation of array contents (already lives in `proposed-slices.mts::parseProposedSlices`).
- Wiring `parseProposedSlices` into `sliceFromFeature` — that lands in SLICE-100 (FEAT-168 slice-c).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`).
- [ ] AC-2: `parseFrontmatter` on `---\nproposed_slices:\n  - id_suffix: -SLICE-1\n    title: Lib\n    points: 5\n  - id_suffix: -SLICE-2\n    title: CLI\n    points: 3\n---\nbody` returns `frontmatter.proposed_slices` as an array of two plain objects whose fields equal the YAML values verbatim. Test `parseFrontmatter handles arrays of mappings`.
- [ ] AC-3: `serializeFrontmatter({proposed_slices: [{id_suffix: "-SLICE-1", title: "Lib", points: 5}, {id_suffix: "-SLICE-2", title: "CLI", points: 3}]})` emits the block form shown above (verifiable by `parseFrontmatter(out)` round-tripping back to the original object). No `[object Object]` appears in the output. Test `serializeFrontmatter emits block form for arrays of mappings`.
- [ ] AC-4: Existing block array of strings round-trip is untouched: `derived_features:\n  - FEAT-007\n  - FEAT-008` parses and re-serializes identically. Test `serializeFrontmatter regression — string block arrays still round-trip`.
- [ ] AC-5: After this slice merges, the explicit deferral comment in `src/scripts/lib/slice-linker/feature-lifecycle.mts:282-290` is shortened to point to the next slice (SLICE-100) for wire-up; the comment must no longer claim that "the in-tree frontmatter parser/writer can't round-trip nested mappings inside arrays" since that statement becomes false. Grep-test or visual confirm; not a code-running AC.

## Done When

- All AC PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean (no NEW errors).
- `bunx tsc --project tsconfig.json --noEmit` clean.
- Final-synthesis artifact written.
- Feature FEAT-168 stays in `in-progress/` (slice-c remains).

## Reviewer ladder

- Reviewer A (correctness): verify CRLF tolerance survives (the parser is the file that took a 2026-06-07 Windows regression); confirm cyclomatic complexity of `tryConsumeContinuation` stays under the 15 cap after the new branch (ESLint will flag); verify round-trip identity tests (parse → serialize → parse) and not just shape matches.
- Reviewer B (production-readiness): verify no consumer of `serializeFrontmatter` relies on inline `[...]` for mapping arrays (grep `serializeFrontmatter`); verify the deferred-comment fixup in `feature-lifecycle.mts` doesn't break any other reader; verify `isArrayOfMappings` returns false for empty arrays so `[]` stays inline (current behavior preserved).
