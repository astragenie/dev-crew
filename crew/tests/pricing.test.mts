// FEAT-025 (SLICE-50): pricing.json is statically imported (bundler-inlinable)
// and matched EXACTLY (or exact-key + "-YYYYMMDD" date suffix) against real
// transcript model ids. No more bare-prefix matching, and no more silent
// fallback-to-Sonnet-4 for an unmatched model.
//
// AC-2: priceFor("claude-fable-5-1") -> matched "claude-fable-5-1";
//       priceFor("claude-sonnet-5") -> matched "claude-sonnet-5";
//       priceFor("claude-haiku-4-5-20251001") -> matched "claude-haiku-4-5";
//       priceFor("claude-opus-9") -> matched null.
// AC-3: PRICING_PATH (read at call time) overrides the inlined table, even
//       from a directory whose path contains a space; with no PRICING_PATH,
//       the inlined table is used with zero filesystem reads.

import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { priceFor } from "../scripts/lib/session-cost.mjs";

async function withPricingPathEnv<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const original = process.env["PRICING_PATH"];
  try {
    if (value === undefined) delete process.env["PRICING_PATH"];
    else process.env["PRICING_PATH"] = value;
    return await fn();
  } finally {
    if (original === undefined) delete process.env["PRICING_PATH"];
    else process.env["PRICING_PATH"] = original;
  }
}

test("AC-2: priceFor exact-matches a verified real model id (claude-fable-5-1)", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-fable-5-1");
    expect(result.matched).toBe("claude-fable-5-1");
    expect(result.input).toBeGreaterThan(0);
  });
});

test("AC-2: priceFor exact-matches claude-sonnet-5", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-sonnet-5");
    expect(result.matched).toBe("claude-sonnet-5");
  });
});

test("AC-2: priceFor matches a date-suffixed real transcript id to its base key (claude-haiku-4-5-20251001 -> claude-haiku-4-5)", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-haiku-4-5-20251001");
    expect(result.matched).toBe("claude-haiku-4-5");
  });
});

test("AC-2: priceFor returns matched: null for an unmatched model (no silent fallback)", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-opus-9");
    expect(result.matched).toBeNull();
    expect(result.input).toBe(0);
    expect(result.output).toBe(0);
  });
});

test("regression: a bare-prefix match no longer fires (claude-opus-4-9 must NOT match claude-opus-4)", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-opus-4-9");
    expect(result.matched).toBeNull();
  });
});

test("cacheWrite5m/cacheWrite1h follow the documented 1.25x/2x-of-input formula", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-sonnet-5");
    expect(result.cacheWrite5m).toBeCloseTo(result.input * 1.25, 5);
    expect(result.cacheWrite1h).toBeCloseTo(result.input * 2, 5);
  });
});

test("AC-3: PRICING_PATH (read at call time) overrides the inlined table, even from a path containing a space", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hero-crew pricing test "));
  try {
    const altPath = path.join(dir, "alt-pricing.json");
    await fs.writeFile(
      altPath,
      JSON.stringify({
        models: {
          "claude-totally-custom-model": {
            input: 999,
            output: 999,
            cache_read: 999,
            cache_create_5m: 999,
            cache_create_1h: 999
          }
        },
        fallback: "claude-totally-custom-model"
      })
    );
    await withPricingPathEnv(altPath, async () => {
      const result = priceFor("claude-totally-custom-model");
      expect(result.matched).toBe("claude-totally-custom-model");
      expect(result.input).toBe(999);
      // The real inlined model must NOT resolve from the override table.
      const inlined = priceFor("claude-fable-5-1");
      expect(inlined.matched).toBeNull();
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("AC-3: with no PRICING_PATH set, priceFor uses the inlined table (real models resolve)", async () => {
  await withPricingPathEnv(undefined, async () => {
    const result = priceFor("claude-sonnet-5");
    expect(result.matched).toBe("claude-sonnet-5");
  });
});
