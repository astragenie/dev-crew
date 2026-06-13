import { test } from "bun:test";
import assert from "node:assert/strict";
import { ok, err, isOk, isErr } from "../scripts/lib/result.mjs";
import type { Result } from "../scripts/lib/result.mjs";

test("ok constructs an Ok variant with the given value", () => {
  const r = ok(42);
  assert.equal(r.ok, true);
  assert.equal(r.value, 42);
});

test("err constructs an Err variant with the given error", () => {
  const r = err(new Error("boom"));
  assert.equal(r.ok, false);
  assert.equal(r.error.message, "boom");
});

test("isOk returns true for Ok, false for Err", () => {
  assert.equal(isOk(ok("hello")), true);
  assert.equal(isOk(err("oops")), false);
});

test("isErr returns true for Err, false for Ok", () => {
  assert.equal(isErr(err("fail")), true);
  assert.equal(isErr(ok(0)), false);
});

test("type narrowing: value accessible after isOk guard", () => {
  const r: Result<number, string> = ok(7);
  if (isOk(r)) {
    assert.equal(r.value, 7);
  } else {
    assert.fail("expected Ok branch");
  }
});

test("type narrowing: error accessible after isErr guard", () => {
  const r: Result<number, string> = err("bad");
  if (isErr(r)) {
    assert.equal(r.error, "bad");
  } else {
    assert.fail("expected Err branch");
  }
});

test("ok works with object value", () => {
  const r = ok({ x: 1 });
  assert.deepEqual(r.value, { x: 1 });
});

test("err works with non-Error error type", () => {
  const r = err(404);
  assert.equal(r.error, 404);
});
