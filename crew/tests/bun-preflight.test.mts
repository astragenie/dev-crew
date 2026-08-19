// tests/bun-preflight.test.ts
import { test, expect } from "bun:test";
import { assertBunPresent } from "../scripts/lib/installer/bun-preflight.mjs";

test("assertBunPresent: returns the detected bun version when bun is on PATH", () => {
  const got = assertBunPresent({ env: process.env });
  expect(got.version).toMatch(/^\d+\.\d+\.\d+/);
});

test("assertBunPresent: throws with an install URL when bun is missing", () => {
  const empty: NodeJS.ProcessEnv = { PATH: "" };
  let err: unknown;
  try {
    assertBunPresent({ env: empty });
  } catch (e) {
    err = e;
  }
  expect(err instanceof Error, "expected an Error to be thrown").toBeTruthy();
  expect(
    String(err).includes("https://bun.sh"),
    `error message should reference bun.sh: ${String(err)}`
  ).toBeTruthy();
});
