import { describe, it, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  emitBacklogStateChanged,
  type BacklogStateChangedInput
} from "../scripts/lib/backlog-state-emitter.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

// ---------------------------------------------------------------------------
// Schema validator — load the JSON schema and validate a payload object.
// Uses the bundled schema at schemas/loop-events/slice-event.schema.json via
// a relative path from cwd (the repo root when running `bun test`).
// ---------------------------------------------------------------------------

const SCHEMA_REL = "schemas/loop-events/slice-event.schema.json";

async function loadSchema(): Promise<{
  properties: Record<string, unknown>;
  required?: string[];
}> {
  const raw = await fs.readFile(path.join(process.cwd(), SCHEMA_REL), "utf8");
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Repo scaffold — minimal .claude/loop.json so fanoutEnvelope resolves a
// webhook config and actually invokes fetch (otherwise it returns early).
// ---------------------------------------------------------------------------

async function makeRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "bse-dora-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "typescript-plugin-dev",
      loop: {
        notifications: {
          mode: "webhook",
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T1",
            appId: "A1",
            bearer: "test-bearer"
          }
        }
      }
    })
  );
  return repo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RequestCapture = { url: string; body: Record<string, unknown> };

function captureRequests(): {
  calls: RequestCapture[];
  restore: () => void;
} {
  const calls: RequestCapture[] = [];
  const original = fanoutInternals.fetch;
  fanoutInternals.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(null, { status: 202 });
  }) as typeof fanoutInternals.fetch;
  return { calls, restore: () => void (fanoutInternals.fetch = original) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("backlog-state-emitter — DORA fields", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await makeRepo();
  });

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true });
  });

  it("AC1 — all 4 new fields propagate into the emitted envelope", async () => {
    const { calls, restore } = captureRequests();
    try {
      const input: BacklogStateChangedInput = {
        featId: "FEAT-203",
        fromState: "triaged",
        toState: "in-progress",
        timestamp: "2026-06-27T10:00:00.000Z",
        priority: "P0",
        category: "fix",
        relates_to: "FEAT-100",
        createdAt: "2026-06-01T00:00:00.000Z"
      };
      await emitBacklogStateChanged(repo, input);
    } finally {
      restore();
    }

    assert.equal(calls.length, 1, "expected exactly one HTTP call");
    const { body } = calls[0]!;
    const payload = body.payload as Record<string, unknown>;

    assert.equal(payload.featId, "FEAT-203");
    assert.equal(payload.fromState, "triaged");
    assert.equal(payload.toState, "in-progress");
    assert.equal(payload.ts, "2026-06-27T10:00:00.000Z");
    assert.equal(payload.priority, "P0");
    assert.equal(payload.category, "fix");
    assert.equal(payload.relates_to, "FEAT-100");
    assert.equal(payload.createdAt, "2026-06-01T00:00:00.000Z");
  });

  it("AC1 — back-compat: omitting all 4 new fields still emits a valid envelope", async () => {
    const { calls, restore } = captureRequests();
    try {
      await emitBacklogStateChanged(repo, {
        featId: "FEAT-001",
        fromState: "pending",
        toState: "triaged",
        timestamp: "2026-06-27T10:00:00.000Z"
      });
    } finally {
      restore();
    }

    assert.equal(calls.length, 1);
    const payload = calls[0]!.body.payload as Record<string, unknown>;
    assert.equal(payload.featId, "FEAT-001");
    assert.equal(payload.fromState, "pending");
    assert.equal(payload.toState, "triaged");
    assert.equal(payload.ts, "2026-06-27T10:00:00.000Z");
    // New fields must NOT be present when not passed (strict back-compat).
    assert.ok(!("priority" in payload), "priority should be absent when not passed");
    assert.ok(!("category" in payload), "category should be absent when not passed");
    assert.ok(!("relates_to" in payload), "relates_to should be absent when not passed");
    assert.ok(!("createdAt" in payload), "createdAt should be absent when not passed");
  });

  it("AC1 — null values for the new optional fields are forwarded as null", async () => {
    const { calls, restore } = captureRequests();
    try {
      await emitBacklogStateChanged(repo, {
        featId: "FEAT-204",
        fromState: "triaged",
        toState: "done",
        timestamp: "2026-06-27T11:00:00.000Z",
        priority: null,
        category: null,
        relates_to: null,
        createdAt: null
      });
    } finally {
      restore();
    }

    const payload = calls[0]!.body.payload as Record<string, unknown>;
    assert.strictEqual(payload.priority, null);
    assert.strictEqual(payload.category, null);
    assert.strictEqual(payload.relates_to, null);
    assert.strictEqual(payload.createdAt, null);
  });

  it("AC1 — schema contract: new fields are defined in the schema as optional", async () => {
    const schema = await loadSchema();
    const props = schema.properties;
    const required = schema.required ?? [];

    assert.ok("priority" in props, "schema must define priority");
    assert.ok("category" in props, "schema must define category");
    assert.ok("relates_to" in props, "schema must define relates_to");
    assert.ok("createdAt" in props, "schema must define createdAt");

    // None of the new fields may appear in the required array.
    assert.ok(!required.includes("priority"), "priority must not be required");
    assert.ok(!required.includes("category"), "category must not be required");
    assert.ok(!required.includes("relates_to"), "relates_to must not be required");
    assert.ok(!required.includes("createdAt"), "createdAt must not be required");
  });

  it("AC1 — schema contract: existing required field ts is still required", async () => {
    const schema = await loadSchema();
    const required = schema.required ?? [];
    assert.ok(required.includes("ts"), "ts must remain required");
  });

  it("AC1 — schema contract: priority pattern allows P0 through P4", async () => {
    const schema = await loadSchema();
    const priorityProp = schema.properties.priority as {
      type: unknown;
      pattern?: string;
    };
    assert.ok(priorityProp.pattern, "priority schema entry must define a pattern");
    const rx = new RegExp(priorityProp.pattern!);
    for (const valid of ["P0", "P1", "P2", "P3", "P4"]) {
      assert.ok(rx.test(valid), `pattern must match ${valid}`);
    }
    assert.ok(!rx.test("P5"), "pattern must not match P5");
    assert.ok(!rx.test("high"), "pattern must not match non-Pn strings");
  });

  it("AC1 — schema contract: category enum covers feat/fix/chore and null", async () => {
    const schema = await loadSchema();
    const categoryProp = schema.properties.category as { enum?: unknown[] };
    assert.ok(Array.isArray(categoryProp.enum), "category must declare an enum");
    const values = categoryProp.enum!;
    assert.ok(values.includes("feat"), "enum must include feat");
    assert.ok(values.includes("fix"), "enum must include fix");
    assert.ok(values.includes("chore"), "enum must include chore");
    assert.ok(values.includes(null), "enum must include null");
  });

  it("AC1 — feat category value propagates correctly", async () => {
    const { calls, restore } = captureRequests();
    try {
      await emitBacklogStateChanged(repo, {
        featId: "FEAT-205",
        fromState: "pending",
        toState: "triaged",
        timestamp: "2026-06-27T12:00:00.000Z",
        priority: "P2",
        category: "feat",
        relates_to: null,
        createdAt: "2026-05-15T00:00:00.000Z"
      });
    } finally {
      restore();
    }

    const payload = calls[0]!.body.payload as Record<string, unknown>;
    assert.equal(payload.priority, "P2");
    assert.equal(payload.category, "feat");
    assert.strictEqual(payload.relates_to, null);
  });
});
