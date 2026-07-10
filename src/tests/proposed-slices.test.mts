// FEAT-168 AC-1 + AC-2 + AC-7: proposed_slices schema validation +
// refuse gate.

import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  parseProposedSlices,
  assertSized,
  InvalidProposedSlicesError,
  DecompositionRequiredError
} from "../scripts/lib/proposed-slices.mjs";

const FEAT = "FEAT-999";

test("AC-1: valid array returns the parsed ProposedSlice[]", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "Lib + tests", points: 5 },
    { id_suffix: "-SLICE-2", title: "CLI + agent", points: 3 }
  ];
  const out = parseProposedSlices(raw, FEAT);
  assert.deepEqual(out, raw);
});

test("AC-1: null / undefined raw returns null (caller decides)", () => {
  assert.equal(parseProposedSlices(undefined, FEAT), null);
  assert.equal(parseProposedSlices(null, FEAT), null);
});

test("AC-1: empty array throws (decomposition with zero slices is meaningless)", () => {
  assert.throws(
    () => parseProposedSlices([], FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /at least one slice/.test(err.message)
  );
});

test("AC-1: non-array raw throws with type info", () => {
  assert.throws(
    () => parseProposedSlices("oops", FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /must be a YAML list/.test(err.message)
  );
});

test("AC-7: malformed id_suffix fails with precise detail", () => {
  const raw = [{ id_suffix: "SLICE1", title: "x", points: 5 }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /id_suffix in slice 0/.test(err.message)
  );
});

test("AC-7: empty title fails", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "", points: 5 }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /title in slice 0/.test(err.message)
  );
});

test("AC-7: title over 100 chars fails", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "x".repeat(101), points: 5 }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) => err instanceof InvalidProposedSlicesError && /≤ 100 chars/.test(err.message)
  );
});

test("AC-7: non-Fibonacci points fails", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "ok", points: 4 }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) => err instanceof InvalidProposedSlicesError && /Fibonacci set/.test(err.message)
  );
});

test("runner#393: per-entry points above the cap of 5 throws even when Fibonacci-valid", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "everything", points: 13 },
    { id_suffix: "-SLICE-2", title: "crumbs", points: 1 }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT, 13),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /per-slice cap of 5/.test(err.message)
  );
});

test("AC-1: sum(points) < effort_points throws (decomposition undersized)", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "A", points: 3 },
    { id_suffix: "-SLICE-2", title: "B", points: 3 }
  ];
  // effort_points = 13 but sum = 6 → fails coverage invariant
  assert.throws(
    () => parseProposedSlices(raw, FEAT, 13),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /does not cover the work/.test(err.message)
  );
});

test("AC-1: sum(points) >= effort_points passes", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "A", points: 5 },
    { id_suffix: "-SLICE-2", title: "B", points: 5 },
    { id_suffix: "-SLICE-3", title: "C", points: 3 }
  ];
  const out = parseProposedSlices(raw, FEAT, 13);
  assert.equal(out!.length, 3);
});

test("AC-2: assertSized refuses when effort_points >= 8 and no proposed_slices", () => {
  assert.throws(
    () => assertSized(FEAT, 13, undefined),
    (err: Error) =>
      err instanceof DecompositionRequiredError &&
      /FEAT-999 is sized 13 points/.test(err.message) &&
      /\/loop:pm-review FEAT-999/.test(err.message)
  );
});

test("AC-2: assertSized allows when effort_points >= 8 AND proposed_slices present", () => {
  // proposed_slices content not validated here — only presence
  assert.doesNotThrow(() => assertSized(FEAT, 13, [{}]));
});

test("AC-2: assertSized allows when effort_points < threshold", () => {
  assert.doesNotThrow(() => assertSized(FEAT, 7, undefined));
  assert.doesNotThrow(() => assertSized(FEAT, 5, undefined));
  assert.doesNotThrow(() => assertSized(FEAT, 1, undefined));
});

test("AC-2: assertSized is a no-op when effort_points is missing / non-integer", () => {
  assert.doesNotThrow(() => assertSized(FEAT, undefined, undefined));
  assert.doesNotThrow(() => assertSized(FEAT, null, undefined));
  assert.doesNotThrow(() => assertSized(FEAT, 3.5, undefined));
  assert.doesNotThrow(() => assertSized(FEAT, "13" as unknown as number, undefined));
});

// QW4: optional per-slice acceptance_criteria field.
test("QW4: acceptance_criteria present and valid is parsed through verbatim", () => {
  const raw = [
    {
      id_suffix: "-SLICE-1",
      title: "Auth",
      points: 5,
      acceptance_criteria: ["AC-1: given X when Y then Z"]
    }
  ];
  const out = parseProposedSlices(raw, FEAT);
  assert.deepEqual(out![0]!.acceptance_criteria, ["AC-1: given X when Y then Z"]);
});

test("QW4: acceptance_criteria is optional — absent entries parse fine", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 5 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out![0]!.acceptance_criteria, undefined);
});

test("QW4: acceptance_criteria that is not an array throws", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "Auth", points: 5, acceptance_criteria: "not an array" }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /acceptance_criteria in slice 0/.test(err.message)
  );
});

test("QW4: empty acceptance_criteria array throws", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 5, acceptance_criteria: [] }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /acceptance_criteria in slice 0/.test(err.message)
  );
});

test("QW4: acceptance_criteria with a blank-string entry throws", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "Auth", points: 5, acceptance_criteria: ["ok", "   "] }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /acceptance_criteria in slice 0/.test(err.message)
  );
});

test("AC-2: threshold is configurable via 4th arg", () => {
  assert.throws(
    () => assertSized(FEAT, 5, undefined, 5),
    (err: Error) => err instanceof DecompositionRequiredError
  );
  assert.doesNotThrow(() => assertSized(FEAT, 4, undefined, 5));
});
