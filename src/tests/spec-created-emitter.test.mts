import { describe, it, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

import { emitSpecCreated, type SpecCreatedInput } from "../scripts/lib/spec-created-emitter.mjs";
import { addSpec } from "../scripts/lib/spec-parser.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

type AddFormatsFn = (ajv: Ajv2020) => Ajv2020;
const addFormats = addFormatsModule as unknown as AddFormatsFn;

// ---------------------------------------------------------------------------
// Schema validator — schemas/loop-events/spec-created.schema.json.
// ---------------------------------------------------------------------------

const SCHEMA_REL = "schemas/loop-events/spec-created.schema.json";

async function loadValidator() {
  const raw = await fs.readFile(path.join(process.cwd(), SCHEMA_REL), "utf8");
  const schema = JSON.parse(raw);
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

// ---------------------------------------------------------------------------
// Repo scaffold — minimal .claude/loop.json so fanoutEnvelope resolves a
// webhook config and actually invokes fetch (otherwise it returns early).
// ---------------------------------------------------------------------------

async function makeRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "spec-created-emitter-"));
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

type RequestCapture = { url: string; body: Record<string, unknown> };

function captureRequests(): { calls: RequestCapture[]; restore: () => void } {
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

describe("spec-created-emitter", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await makeRepo();
  });

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true });
  });

  it("emits a spec.created envelope with the full payload shape", async () => {
    const { calls, restore } = captureRequests();
    try {
      const input: SpecCreatedInput = {
        specId: "SPEC-011",
        featId: "FEAT-200",
        createdAt: "2026-07-09T10:00:00.000Z"
      };
      await emitSpecCreated(repo, input);
    } finally {
      restore();
    }

    assert.equal(calls.length, 1, "expected exactly one HTTP call");
    const { body } = calls[0]!;
    assert.equal(body.kind, "spec.created");
    const payload = body.payload as Record<string, unknown>;
    assert.equal(payload.specId, "SPEC-011");
    assert.equal(payload.featId, "FEAT-200");
    assert.equal(payload.createdAt, "2026-07-09T10:00:00.000Z");

    const validate = await loadValidator();
    assert.equal(validate(payload), true, JSON.stringify(validate.errors));
  });

  it("back-compat: omitting featId still emits a valid envelope", async () => {
    const { calls, restore } = captureRequests();
    try {
      await emitSpecCreated(repo, {
        specId: "SPEC-012",
        createdAt: "2026-07-09T11:00:00.000Z"
      });
    } finally {
      restore();
    }

    assert.equal(calls.length, 1);
    const payload = calls[0]!.body.payload as Record<string, unknown>;
    assert.equal(payload.specId, "SPEC-012");
    assert.ok(!("featId" in payload), "featId should be absent when not passed");

    const validate = await loadValidator();
    assert.equal(validate(payload), true, JSON.stringify(validate.errors));
  });

  it("does not fan out when no webhook is configured (no .claude/loop.json)", async () => {
    const bareRepo = await fs.mkdtemp(path.join(os.tmpdir(), "spec-created-emitter-bare-"));
    const { calls, restore } = captureRequests();
    try {
      await emitSpecCreated(bareRepo, {
        specId: "SPEC-001",
        createdAt: "2026-07-09T12:00:00.000Z"
      });
    } finally {
      restore();
      await fs.rm(bareRepo, { recursive: true, force: true });
    }
    assert.equal(calls.length, 0);
  });

  it("addSpec triggers exactly one spec.created emit at file-creation time", async () => {
    const { calls, restore } = captureRequests();
    try {
      const s = await addSpec(repo, { type: "prd", title: "Integration PRD" });
      assert.equal(calls.length, 1, "expected exactly one HTTP call from addSpec");
      const { body } = calls[0]!;
      assert.equal(body.kind, "spec.created");
      const payload = body.payload as Record<string, unknown>;
      assert.equal(payload.specId, s.id);
      assert.equal(typeof payload.createdAt, "string");
    } finally {
      restore();
    }
  });
});
