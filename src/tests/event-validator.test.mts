import { describe, expect, test, beforeAll } from "bun:test";
import { createEventValidator, type EventValidator } from "../scripts/lib/event-validator.mjs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
let validator: EventValidator;

beforeAll(async () => {
  validator = await createEventValidator(path.join(repoRoot, "schemas", "loop-events"));
});

describe("createEventValidator", () => {
  test("accepts a well-formed slice event envelope", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "slice.workflow_state_changed",
      payload: {
        sliceId: "SLICE-1",
        ts: "2026-06-15T12:00:00.000Z",
        from: "building",
        to: "reviewing"
      },
      emittedAt: "2026-06-15T12:00:00.000Z"
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects envelope with unknown kind", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "bogus.kind",
      payload: {},
      emittedAt: "2026-06-15T12:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown kind"))).toBe(true);
  });

  test("rejects envelope with payload that does not match kind schema", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "grade.recorded",
      payload: { sliceId: "SLICE-1" },
      emittedAt: "2026-06-15T12:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
