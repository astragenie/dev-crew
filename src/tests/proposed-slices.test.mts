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
    { id_suffix: "-SLICE-1", title: "Lib + tests", points: 2, estimated_tokens: 90_000 },
    { id_suffix: "-SLICE-2", title: "CLI + agent", points: 2, estimated_tokens: 90_000 }
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

test("runner#393: per-entry points above the cap of 2 throws even when Fibonacci-valid", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "everything", points: 13 },
    { id_suffix: "-SLICE-2", title: "crumbs", points: 1 }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT, 13),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /per-slice cap of 2/.test(err.message)
  );
});

test("runner#393: points value of 3 is rejected by the per-slice cap", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "too big", points: 3 }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /per-slice cap of 2/.test(err.message)
  );
});

test("runner#393: points value of 2 is accepted (at the cap)", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "A", points: 2 },
    { id_suffix: "-SLICE-2", title: "B", points: 2 }
  ];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out!.length, 2);
});

test("runner#393: points value of 1 is accepted", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "A", points: 1 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out!.length, 1);
});

// runner#393 slice 2: estimated_tokens field + ~200k auto-split heuristic.
test("runner#393: estimated_tokens defaults from points when the entry omits it", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "A", points: 2 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out![0]!.estimated_tokens, 20_000 + 2 * 40_000);
});

test("runner#393: an explicit estimated_tokens override passes through when within the threshold", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "A", points: 1, estimated_tokens: 150_000 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out![0]!.estimated_tokens, 150_000);
});

test("runner#393: estimated_tokens above the 200k auto-split threshold throws even when points is within its own cap", () => {
  // points=1 passes the per-entry points cap on its own, but a PM/architect
  // flagging landmines can override estimated_tokens upward to force a split
  // the points-only cap would miss.
  const raw = [
    { id_suffix: "-SLICE-1", title: "landmine-heavy", points: 1, estimated_tokens: 250_000 }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /estimated_tokens value in slice 0 exceeds the ~200k auto-split threshold/.test(err.message)
  );
});

test("runner#393: estimated_tokens exactly at the 200k threshold is accepted", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "A", points: 1, estimated_tokens: 200_000 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out![0]!.estimated_tokens, 200_000);
});

test("runner#393: non-numeric estimated_tokens throws with precise detail", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "A", points: 1, estimated_tokens: "lots" }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /estimated_tokens in slice 0/.test(err.message)
  );
});

test("runner#393: negative estimated_tokens throws", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "A", points: 1, estimated_tokens: -5 }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /estimated_tokens in slice 0/.test(err.message)
  );
});

test("AC-1: sum(points) < effort_points throws (decomposition undersized)", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "A", points: 2 },
    { id_suffix: "-SLICE-2", title: "B", points: 2 }
  ];
  // effort_points = 13 but sum = 4 → fails coverage invariant
  assert.throws(
    () => parseProposedSlices(raw, FEAT, 13),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /does not cover the work/.test(err.message)
  );
});

test("AC-1: sum(points) >= effort_points passes", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "A", points: 2 },
    { id_suffix: "-SLICE-2", title: "B", points: 2 },
    { id_suffix: "-SLICE-3", title: "C", points: 2 },
    { id_suffix: "-SLICE-4", title: "D", points: 2 },
    { id_suffix: "-SLICE-5", title: "E", points: 2 },
    { id_suffix: "-SLICE-6", title: "F", points: 2 },
    { id_suffix: "-SLICE-7", title: "G", points: 1 }
  ];
  const out = parseProposedSlices(raw, FEAT, 13);
  assert.equal(out!.length, 7);
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
      points: 2,
      acceptance_criteria: ["AC-1: given X when Y then Z"]
    }
  ];
  const out = parseProposedSlices(raw, FEAT);
  assert.deepEqual(out![0]!.acceptance_criteria, ["AC-1: given X when Y then Z"]);
});

test("QW4: acceptance_criteria is optional — absent entries parse fine", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 2 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out![0]!.acceptance_criteria, undefined);
});

test("QW4: acceptance_criteria that is not an array throws", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "Auth", points: 2, acceptance_criteria: "not an array" }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /acceptance_criteria in slice 0/.test(err.message)
  );
});

test("QW4: empty acceptance_criteria array throws", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 2, acceptance_criteria: [] }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /acceptance_criteria in slice 0/.test(err.message)
  );
});

test("QW4: acceptance_criteria with a blank-string entry throws", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "Auth", points: 2, acceptance_criteria: ["ok", "   "] }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError &&
      /acceptance_criteria in slice 0/.test(err.message)
  );
});

// FEAT-276 AC-4: optional per-slice touches_files field.
test("FEAT-276: touches_files present and valid is parsed through verbatim", () => {
  const raw = [
    {
      id_suffix: "-SLICE-1",
      title: "Auth",
      points: 2,
      touches_files: ["src/scripts/lib/auth.mts", "src/tests/auth.test.mts"]
    }
  ];
  const out = parseProposedSlices(raw, FEAT);
  assert.deepEqual(out![0]!.touches_files, ["src/scripts/lib/auth.mts", "src/tests/auth.test.mts"]);
});

test("FEAT-276: touches_files is optional — absent entries parse fine", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 2 }];
  const out = parseProposedSlices(raw, FEAT);
  assert.equal(out![0]!.touches_files, undefined);
});

test("FEAT-276: touches_files that is not an array throws", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 2, touches_files: "not an array" }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /touches_files in slice 0/.test(err.message)
  );
});

test("FEAT-276: empty touches_files array throws", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 2, touches_files: [] }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /touches_files in slice 0/.test(err.message)
  );
});

test("FEAT-276: an absolute touches_files path throws", () => {
  const raw = [{ id_suffix: "-SLICE-1", title: "Auth", points: 2, touches_files: ["/etc/passwd"] }];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /repo-relative paths/.test(err.message)
  );
});

test("FEAT-276: a touches_files path with parent traversal throws", () => {
  const raw = [
    { id_suffix: "-SLICE-1", title: "Auth", points: 2, touches_files: ["../outside/file.mts"] }
  ];
  assert.throws(
    () => parseProposedSlices(raw, FEAT),
    (err: Error) =>
      err instanceof InvalidProposedSlicesError && /repo-relative paths/.test(err.message)
  );
});

test("AC-2: threshold is configurable via 4th arg", () => {
  assert.throws(
    () => assertSized(FEAT, 5, undefined, 5),
    (err: Error) => err instanceof DecompositionRequiredError
  );
  assert.doesNotThrow(() => assertSized(FEAT, 4, undefined, 5));
});
