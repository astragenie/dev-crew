import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  parseFeatId,
  parseSliceId,
  parseSpecId,
  parseDecId,
  parseGradeId
} from "../scripts/lib/ids.mjs";

// parseFeatId

test("parseFeatId accepts FEAT-1", () => {
  assert.equal(parseFeatId("FEAT-1"), "FEAT-1");
});

test("parseFeatId accepts FEAT-0", () => {
  assert.equal(parseFeatId("FEAT-0"), "FEAT-0");
});

test("parseFeatId accepts FEAT-123", () => {
  assert.equal(parseFeatId("FEAT-123"), "FEAT-123");
});

test("parseFeatId rejects leading zeros (FEAT-007)", () => {
  assert.equal(parseFeatId("FEAT-007"), null);
});

test("parseFeatId rejects wrong prefix", () => {
  assert.equal(parseFeatId("SLICE-1"), null);
});

test("parseFeatId rejects empty string", () => {
  assert.equal(parseFeatId(""), null);
});

test("parseFeatId rejects non-numeric suffix", () => {
  assert.equal(parseFeatId("FEAT-abc"), null);
});

test("parseFeatId rejects FEAT- with no suffix", () => {
  assert.equal(parseFeatId("FEAT-"), null);
});

// parseSliceId

test("parseSliceId accepts SLICE-42", () => {
  assert.equal(parseSliceId("SLICE-42"), "SLICE-42");
});

test("parseSliceId accepts SLICE-0", () => {
  assert.equal(parseSliceId("SLICE-0"), "SLICE-0");
});

test("parseSliceId rejects leading zeros", () => {
  assert.equal(parseSliceId("SLICE-01"), null);
});

test("parseSliceId rejects wrong prefix", () => {
  assert.equal(parseSliceId("FEAT-1"), null);
});

test("parseSliceId rejects empty string", () => {
  assert.equal(parseSliceId(""), null);
});

// parseSpecId

test("parseSpecId accepts SPEC-10", () => {
  assert.equal(parseSpecId("SPEC-10"), "SPEC-10");
});

test("parseSpecId rejects leading zeros", () => {
  assert.equal(parseSpecId("SPEC-01"), null);
});

test("parseSpecId rejects wrong prefix", () => {
  assert.equal(parseSpecId("DEC-1"), null);
});

test("parseSpecId rejects empty string", () => {
  assert.equal(parseSpecId(""), null);
});

// parseDecId

test("parseDecId accepts DEC-55", () => {
  assert.equal(parseDecId("DEC-55"), "DEC-55");
});

test("parseDecId accepts DEC-0", () => {
  assert.equal(parseDecId("DEC-0"), "DEC-0");
});

test("parseDecId rejects leading zeros", () => {
  assert.equal(parseDecId("DEC-055"), null);
});

test("parseDecId rejects wrong prefix", () => {
  assert.equal(parseDecId("SPEC-1"), null);
});

test("parseDecId rejects empty string", () => {
  assert.equal(parseDecId(""), null);
});

// parseGradeId

test("parseGradeId accepts GRADE-1", () => {
  assert.equal(parseGradeId("GRADE-1"), "GRADE-1");
});

test("parseGradeId accepts GRADE-0", () => {
  assert.equal(parseGradeId("GRADE-0"), "GRADE-0");
});

test("parseGradeId accepts GRADE-999", () => {
  assert.equal(parseGradeId("GRADE-999"), "GRADE-999");
});

test("parseGradeId rejects leading zeros", () => {
  assert.equal(parseGradeId("GRADE-09"), null);
});

test("parseGradeId rejects wrong prefix", () => {
  assert.equal(parseGradeId("FEAT-1"), null);
});

test("parseGradeId rejects empty string", () => {
  assert.equal(parseGradeId(""), null);
});
