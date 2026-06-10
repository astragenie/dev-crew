import { test } from "bun:test";
import assert from "node:assert/strict";
import { cached, bust, clearAll } from "../scripts/lib/cache.mjs";

test("cached returns same promise for same key", async () => {
  clearAll();
  let calls = 0;
  const fn = async () => {
    calls += 1;
    return 42;
  };
  const a = await cached("k1", fn);
  const b = await cached("k1", fn);
  assert.equal(a, 42);
  assert.equal(b, 42);
  assert.equal(calls, 1, "fn should be called only once");
});

test("cached returns different values for different keys", async () => {
  clearAll();
  const a = await cached("a", async () => 1);
  const b = await cached("b", async () => 2);
  assert.equal(a, 1);
  assert.equal(b, 2);
});

test("bust removes cached entry", async () => {
  clearAll();
  let calls = 0;
  const fn = async () => {
    calls += 1;
    return calls;
  };
  await cached("x", fn);
  bust("x");
  const v = await cached("x", fn);
  assert.equal(v, 2);
  assert.equal(calls, 2);
});

test("clearAll removes all entries", async () => {
  clearAll();
  await cached("c1", async () => 1);
  await cached("c2", async () => 2);
  clearAll();
  let calls = 0;
  await cached("c1", async () => {
    calls += 1;
    return 10;
  });
  assert.equal(calls, 1);
});
