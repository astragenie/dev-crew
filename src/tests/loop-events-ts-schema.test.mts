// FEAT-247 / A2 (SLICE-147) AC-4: grade-event.schema.json and
// agent-dispatch.schema.json now require the canonical `ts` field and
// tolerate the legacy `recordedAt` / `timestamp` fields being absent.
import { describe, expect, test, beforeAll } from "bun:test";
import path from "node:path";
import { createEventValidator, type EventValidator } from "../scripts/lib/event-validator.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
let validator: EventValidator;

beforeAll(async () => {
  validator = await createEventValidator(path.join(repoRoot, "schemas", "loop-events"));
});

describe("grade-event.schema.json — ts is required, recordedAt is tolerated-legacy", () => {
  test("rejects a payload missing ts", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "grade.recorded",
      payload: {
        sliceId: "SLICE-1",
        recordedAt: "2026-07-09T00:00:00.000Z",
        scores: { architecture_quality: 0.8 }
      },
      emittedAt: "2026-07-09T00:00:00.000Z"
    });
    expect(result.ok).toBe(false);
  });

  test("accepts a payload with ts present and recordedAt absent", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "grade.recorded",
      payload: {
        sliceId: "SLICE-1",
        ts: "2026-07-09T00:00:00.000Z",
        scores: { architecture_quality: 0.8 }
      },
      emittedAt: "2026-07-09T00:00:00.000Z"
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("agent-dispatch.schema.json — ts is required, timestamp is tolerated-legacy", () => {
  test("rejects a payload missing ts", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "agent.dispatch",
      payload: {
        timestamp: "2026-07-09T00:00:00.000Z",
        agent: "devcrew:builder",
        ok: true
      },
      emittedAt: "2026-07-09T00:00:00.000Z"
    });
    expect(result.ok).toBe(false);
  });

  test("accepts a payload with ts present and timestamp absent", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "agent.dispatch",
      payload: {
        ts: "2026-07-09T00:00:00.000Z",
        agent: "devcrew:builder",
        ok: true
      },
      emittedAt: "2026-07-09T00:00:00.000Z"
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
