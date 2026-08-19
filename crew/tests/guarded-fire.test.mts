// tests/guarded-fire.test.ts
// FEAT-018/SLICE-29: guarded-fire.mts survived the GEPA test-tree deletion
// (SLICE-22) as relocated fail-soft infra, but its unit test did not.
// Fresh coverage for the module's one export: fireGuarded() must (1) let a
// normal run() complete without swallowing it, (2) swallow a throw/rejection
// from run() instead of propagating, and (3) never block past timeoutMs even
// when run() hangs forever — matching the fire-and-forget contract described
// in the module header.
import { test, expect } from "bun:test";
import { fireGuarded, DEFAULT_GUARD_TIMEOUT_MS } from "../scripts/lib/guarded-fire.mjs";

test("DEFAULT_GUARD_TIMEOUT_MS is the documented 1500ms ceiling", () => {
  expect(DEFAULT_GUARD_TIMEOUT_MS).toBe(1500);
});

test("fireGuarded lets a normal run() complete and does not swallow success", async () => {
  let called = false;
  await fireGuarded(async () => {
    called = true;
  }, 200);
  expect(called, "run() should have been invoked and awaited to completion").toBeTruthy();
});

test("fireGuarded falls back to DEFAULT_GUARD_TIMEOUT_MS when timeoutMs is omitted", async () => {
  let called = false;
  const start = Date.now();
  // run() resolves immediately, so the race settles well before the
  // (unref'd) 1500ms default timer ever fires — this only proves the
  // default param is accepted and doesn't force the call to wait it out.
  await fireGuarded(async () => {
    called = true;
  });
  expect(called).toBeTruthy();
  expect(
    Date.now() - start < 200,
    "should resolve on run() completion, not wait for the default timeout"
  ).toBeTruthy();
});

test("fireGuarded swallows an async rejection instead of propagating", async () => {
  let threw = false;
  try {
    await fireGuarded(async () => {
      throw new Error("boom: async rejection");
    }, 200);
  } catch {
    threw = true;
  }
  expect(threw, "fireGuarded must never propagate a rejection from run()").toBeFalsy();
});

test("fireGuarded swallows a synchronous throw from run() instead of propagating", async () => {
  // Defense-in-depth case: a run() that throws before ever returning a
  // promise (violates the () => Promise<void> type at compile time, but
  // the try/catch around Promise.race([run(), ...]) must still hold at
  // runtime since JS types are erased).
  const run = (() => {
    throw new Error("boom: sync throw");
  }) as unknown as () => Promise<void>;

  let threw = false;
  try {
    await fireGuarded(run, 200);
  } catch {
    threw = true;
  }
  expect(threw, "fireGuarded must never propagate a synchronous throw from run()").toBeFalsy();
});

test("fireGuarded resolves at timeoutMs (not hanging) when run() never settles", async () => {
  const timeoutMs = 30;
  const start = Date.now();

  // The race timer inside fireGuarded is .unref()'d BY DESIGN (module
  // header: it must never hold the OS process open on its own). Paired
  // with a run() that never resolves or rejects, NOTHING in this test is
  // ref'd — Bun's event loop has no reason to keep ticking and will idle
  // forever instead of firing the timer. Hold an explicit ref'd keepalive
  // across the await so the loop stays alive long enough for the unref'd
  // timer to still fire; this is a test-harness artifact only, never a
  // reason to touch the production unref() (issue #360's whole point).
  const keepalive = setTimeout(() => {
    /* keepalive no-op — cleared in finally below */
  }, 10_000);
  try {
    // A run() that never resolves or rejects — the only way fireGuarded can
    // return is via the timeout race branch.
    await fireGuarded(
      () =>
        new Promise<void>(() => {
          /* deliberately never settles */
        }),
      timeoutMs
    );
  } finally {
    clearTimeout(keepalive);
  }

  const elapsed = Date.now() - start;
  expect(
    elapsed >= timeoutMs,
    `should not resolve before timeoutMs (${timeoutMs}ms), took ${elapsed}ms`
  ).toBeTruthy();
  expect(
    elapsed < timeoutMs + 200,
    `should resolve close to timeoutMs (${timeoutMs}ms), took ${elapsed}ms`
  ).toBeTruthy();
});

test("fireGuarded treats a run() that exceeds timeoutMs the same as an error (swallowed, not thrown)", async () => {
  // Same unref'd-timer-vs-bare-event-loop hazard as the test above: the
  // slow run()'s own timer is deliberately unref'd too (mirroring real
  // call sites), so nothing here is ref'd without a keepalive.
  const keepalive = setTimeout(() => {
    /* keepalive no-op — cleared in finally below */
  }, 10_000);
  let threw = false;
  try {
    await fireGuarded(
      () =>
        new Promise<void>((resolve) => {
          // Slower than timeoutMs but still short — unref'd so a lingering
          // handle can never add wall-time to this test's own process exit.
          const t = setTimeout(resolve, 150);
          t.unref?.();
        }),
      30
    );
  } catch {
    threw = true;
  } finally {
    clearTimeout(keepalive);
  }
  expect(threw, "a slow run() must be swallowed via the timeout race, never thrown").toBeFalsy();
});
