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

  // SLICE-147: real backlog envelopes carry a freeform category vocabulary
  // (competitor-gap, feature, workflow, tech-debt, bug, bugfix,
  // infrastructure, ...) and a bare-date createdAt (nowIsoDate() output,
  // forwarded verbatim by doraFieldsFromFrontmatter) — not the closed
  // feat/fix/chore enum or date-time format the schema previously required.
  test("accepts a realistic loop.backlog_state_changed envelope — freeform category + bare-date createdAt", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "loop.backlog_state_changed",
      payload: {
        featId: "FEAT-247",
        fromState: "triaged",
        toState: "in-progress",
        ts: "2026-07-08T12:00:00.000Z",
        priority: "P1",
        category: "tech-debt",
        relates_to: null,
        createdAt: "2026-07-08"
      },
      emittedAt: "2026-07-08T12:00:00.000Z"
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects loop.backlog_state_changed envelope with a malformed createdAt", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "loop.backlog_state_changed",
      payload: {
        featId: "FEAT-247",
        fromState: "triaged",
        toState: "in-progress",
        ts: "2026-07-08T12:00:00.000Z",
        category: "tech-debt",
        createdAt: "not-a-date"
      },
      emittedAt: "2026-07-08T12:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
