// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";

import { detectAcceptanceCriteria } from "../scripts/lib/backlog-triage.mjs";

// ---------------------------------------------------------------------------
// detectAcceptanceCriteria
// ---------------------------------------------------------------------------

test("detectAcceptanceCriteria: 3 checkbox bullets → count=3, hasMin=true", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: do the thing
- [ ] AC-2: verify it
- [ ] AC-3: confirm done
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 3);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: 3 bare dash bullets → count=3, hasMin=true", () => {
  const body = `
## Acceptance Criteria

- First requirement
- Second requirement
- Third requirement
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 3);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: mixed checkbox and bare bullets → count=4, hasMin=true", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: first
- bare bullet
- [x] AC-3: already done
- [ ] AC-4: last
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 4);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: 2 bullets → count=2, hasMin=false", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: only one
- [ ] AC-2: only two
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 2);
  assert.equal(result.hasMin, false);
});

test("detectAcceptanceCriteria: 0 bullets → count=0, hasMin=false", () => {
  const body = `
## Some other section

No bullets here at all.
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 0);
  assert.equal(result.hasMin, false);
});

test("detectAcceptanceCriteria: stops counting at next ## heading", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: bullet one
- [ ] AC-2: bullet two

## Out of scope

- [ ] not counted
- [ ] also not counted
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 2);
  assert.equal(result.hasMin, false);
});

test("detectAcceptanceCriteria: heading is case-insensitive", () => {
  const body = `
## ACCEPTANCE CRITERIA

- [ ] AC-1: x
- [ ] AC-2: y
- [ ] AC-3: z
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 3);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: no AC heading → count=0, hasMin=false", () => {
  const body = `
## Description

Some description text.

## Notes

- [ ] note one
- [ ] note two
- [ ] note three
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 0);
  assert.equal(result.hasMin, false);
});
