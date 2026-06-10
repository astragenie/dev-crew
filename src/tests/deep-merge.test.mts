import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { deepMerge } from "../scripts/lib/deep-merge.mjs";

test("deepMerge merges plain objects by key", () => {
  const out = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
  assert.deepEqual(out, { a: 1, b: 3, c: 4 });
});

test("deepMerge recurses into nested objects", () => {
  const out = deepMerge(
    { frontend: { framework: "react", language: "typescript" } },
    { frontend: { framework: "vue" } }
  );
  assert.deepEqual(out, { frontend: { framework: "vue", language: "typescript" } });
});

test("deepMerge concat-dedups arrays by default", () => {
  const out = deepMerge({ skills: ["a", "b"] }, { skills: ["b", "c"] });
  assert.deepEqual(out.skills, ["a", "b", "c"]);
});

test("deepMerge $replace marker fully replaces array", () => {
  const out = deepMerge({ skills: ["a", "b"] }, { skills: { $replace: ["x"] } });
  assert.deepEqual(out.skills, ["x"]);
});

test("deepMerge leaves base untouched when override missing key", () => {
  const out = deepMerge({ a: 1 }, {});
  assert.deepEqual(out, { a: 1 });
});

test("deepMerge does not mutate inputs", () => {
  const base = { a: { b: 1 } };
  const override = { a: { c: 2 } };
  deepMerge(base, override);
  assert.deepEqual(base, { a: { b: 1 } });
  assert.deepEqual(override, { a: { c: 2 } });
});
