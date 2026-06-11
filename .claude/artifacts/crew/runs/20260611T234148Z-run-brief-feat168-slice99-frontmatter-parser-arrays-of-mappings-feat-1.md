---
feature: FEAT-168
status: active
---
# Run Brief: FEAT168 SLICE99: Frontmatter parser: arrays of mappings (FEAT-168 slice-b)

- Created: 2026-06-11T23:41:48.137Z
- Tier: full
- Goal: Extend the parser to recognize a block-array item whose payload starts with `key: value` as the first key of a new mapping, and extend the writer to emit block-form arrays-of-mappings. One level of nesting only (matches the rest of the parser's depth budget).
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/frontmatter.mts`:
  - Add `arrayItemsAreMappings: boolean` to `ParseState`. Reset on `resetState`.
  - In `tryConsumeContinuation`'s block-array branch: after stripping `- `
  - try `KEY_VALUE_RE` on the remainder. If it matches
  - push `{ key: parseScalar(value) }` to the array and set `arrayItemsAreMappings = true`; otherwise keep the existing string-scalar push and set `arrayItemsAreMappings = false`.
  - Insert a new continuation case: when `currentArrayKey && arrayItemsAreMappings` and the line matches `NESTED_KV_RE` but NOT `BLOCK_ARRAY_ITEM_RE`
  - append `key: value` onto the last mapping in the array.
  - Add `isArrayOfMappings(value)` helper: array
  - non-empty
  - every item is a plain mapping.
  - In `serializeFrontmatter`: when value passes `isArrayOfMappings`
  - emit bloc
- Out Of Scope:
  - - Multi-level nesting (mapping inside mapping inside array) — same single-level budget as the rest of the parser. Document the cap in the module header.
- Mixed arrays (some strings
  - some mappings) — fall back to existing string-scalar behavior; tests assert this is a clean limitation
  - not a corruption.
- Schema validation of array contents (already lives in `proposed-slices.mts::parseProposedSlic
- Planned Files: -
- Next Step: Begin implementation

