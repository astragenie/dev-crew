import { describe, expect, test } from "bun:test";
import {
  resolveWaveConfig,
  validateWaveConfig,
  resolveMarathonRunner
} from "../../scripts/lib/wave/config.mjs";

describe("resolveWaveConfig", () => {
  test("returns defaults when block absent", () => {
    const c = resolveWaveConfig({});
    expect(c.size).toBe(3);
    expect(c.sliceCommand).toBe("/devcrew:orchestrate-slice");
    expect(c.maxParallel).toBe(3);
    expect(c.maxWaveAttempts).toBe(2);
    expect(c.subagentType).toBe("general-purpose");
  });

  test("user overrides applied", () => {
    const c = resolveWaveConfig({
      wave: { size: 5, sliceCommand: "/devcrew:build", maxWaveAttempts: 3 }
    });
    expect(c.size).toBe(5);
    expect(c.sliceCommand).toBe("/devcrew:build");
    expect(c.maxWaveAttempts).toBe(3);
  });
});

describe("validateWaveConfig", () => {
  test("PASS on valid config", () => {
    const r = validateWaveConfig({
      size: 3,
      sliceCommand: "/devcrew:orchestrate-slice",
      sliceCommandFallback: "/devcrew:build",
      fixCommand: "/devcrew:fix",
      maxParallel: 3,
      dispatchTimeoutMs: 1800000,
      postMergeTestCmd: "bun test",
      maxWaveAttempts: 2,
      subagentType: "general-purpose",
      artifactsRoot: ".claude/artifacts/loop/waves"
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
  test("FAIL on size < 1", () => {
    const r = validateWaveConfig({ size: 0 } as never);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("size"))).toBe(true);
  });
  test("FAIL on bad sliceCommand", () => {
    const r = validateWaveConfig({ sliceCommand: "not-a-command" } as never);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("sliceCommand"))).toBe(true);
  });
  test("FAIL on maxParallel > size", () => {
    const r = validateWaveConfig({ size: 2, maxParallel: 5 } as never);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("maxParallel"))).toBe(true);
  });
});

describe("resolveMarathonRunner", () => {
  test("returns 'sequential' default", () => {
    expect(resolveMarathonRunner({})).toBe("sequential");
  });
  test("returns 'wave' when set", () => {
    expect(resolveMarathonRunner({ marathonRunner: "wave" })).toBe("wave");
  });
  test("falls back to 'sequential' on unknown value", () => {
    expect(resolveMarathonRunner({ marathonRunner: "bogus" })).toBe("sequential");
  });
});
