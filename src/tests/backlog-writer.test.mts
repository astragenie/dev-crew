// FEAT-247 / A2 (SLICE-147): integration coverage for moveFeature's
// DORA field-forwarding. backlog-state-emitter-dora-fields.test.mts already
// exercises emitBacklogStateChanged directly — that only proves the emitter
// itself is correct, not that the live moveFeature call site actually wires
// existingFm's priority/category/relates_to/created through. These tests
// invoke moveFeature itself.

import { describe, it, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
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
      },
      stack: {}
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

describe("backlog-writer moveFeature — DORA field forwarding (FEAT-247/A2)", () => {
  let repo: string;

  beforeEach(async () => {
    repo = await tmpRepo("al-backlog-writer-dora-");
  });

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true });
  });

  it("AC-1 — forwards priority/category/relates_to/createdAt from existingFm into emitBacklogStateChanged", async () => {
    const feat = await addFeature(repo, {
      title: "DORA forwarding target",
      priority: "P0",
      category: "fix",
      config: null
    });
    // addFeature doesn't accept relates_to; patch frontmatter directly so the
    // fixture exercises all four forwarded fields.
    const raw = await fs.readFile(feat.filePath, "utf8");
    await fs.writeFile(
      feat.filePath,
      raw.replace(/^derived_from: null$/m, "derived_from: null\nrelates_to: FEAT-100")
    );

    const { calls, restore } = captureRequests();
    try {
      await moveFeature(feat.filePath, "triaged", {}, repo, null);
    } finally {
      restore();
    }

    assert.equal(calls.length, 1, "expected exactly one fanout call");
    const payload = calls[0]!.body.payload as Record<string, unknown>;
    assert.equal(payload.featId, feat.id);
    assert.equal(payload.fromState, "pending");
    assert.equal(payload.toState, "triaged");
    assert.equal(payload.priority, "P0");
    assert.equal(payload.category, "fix");
    assert.equal(payload.relates_to, "FEAT-100");
    assert.equal(payload.createdAt, feat.frontmatter.created);
  });

  it("AC-2 — relates_to is explicitly null (not omitted) when missing from existingFm", async () => {
    const feat = await addFeature(repo, {
      title: "No relates_to",
      priority: "P2",
      category: "feature",
      config: null
    });

    const { calls, restore } = captureRequests();
    try {
      await moveFeature(feat.filePath, "triaged", {}, repo, null);
    } finally {
      restore();
    }

    assert.equal(calls.length, 1);
    const payload = calls[0]!.body.payload as Record<string, unknown>;
    assert.ok("relates_to" in payload, "relates_to key must be present in the payload");
    assert.strictEqual(payload.relates_to, null);
  });

  it("AC-5 — same-state move (fromState === toState) does not fan out at all", async () => {
    const feat = await addFeature(repo, {
      title: "No-op transition",
      priority: "P1",
      category: "chore",
      config: null
    });
    // Move pending -> pending is a no-op transition (same directory).
    const { calls, restore } = captureRequests();
    try {
      await moveFeature(feat.filePath, "pending", {}, repo, null);
    } finally {
      restore();
    }
    assert.equal(calls.length, 0, "expected zero fanout calls on a same-state move");
  });
});
