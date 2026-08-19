// Tests for src/scripts/lib/memory-gepa.mts (FEAT-235, replaces
// memory-bridge.mts's emit()/buildRememberArgs). Provider-only: no CLI-spawn
// fallback survives, so every test neutralizes resolution via
// @astragenie/astramem-client's own test seam (_setWireProvider /
// _resetResolveCache) rather than an injected fake CLI.

import { test, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { buildGepaMetadata, emitGepaEvent, type GepaPayload } from "../scripts/lib/memory-gepa.mjs";

beforeEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

afterEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

function makePayload(): GepaPayload {
  return {
    ts: new Date().toISOString(),
    slice_id: "SLICE-288",
    feat_id: "FEAT-288",
    source: "close",
    event: "slice_close",
    score: 0.87,
    feedback: "All AC passed. No surprises.",
    input: { ac_text: "Given X when Y then Z", dispatch_instruction: "Build the thing." },
    output: { changed_files: ["src/lib/foo.mts"], decisions: ["DEC-001"] },
    prompt_version: "abc1234"
  };
}

// ---------------------------------------------------------------------------
// buildGepaMetadata — pure mapping, no I/O
// ---------------------------------------------------------------------------

test("buildGepaMetadata maps a GEPA payload's fields onto the metadata block", () => {
  const payload = makePayload();
  const metadata = buildGepaMetadata(payload);

  assert.equal(metadata.sliceId, payload.slice_id);
  assert.equal(metadata.featId, payload.feat_id);
  assert.equal(metadata.score, payload.score);
  assert.equal(metadata.phase, payload.event);
  assert.equal(metadata.source, payload.source);
  assert.equal(metadata.prompt_version, payload.prompt_version);
  assert.ok("input" in metadata && typeof metadata.input === "object");
  assert.ok("output" in metadata && typeof metadata.output === "object");
});

test("buildGepaMetadata bounds arbitrarily large input/output well under the ~32KB argv-era limit", () => {
  const hugeString = "x".repeat(50_000);
  const deepArray = Array.from({ length: 500 }, (_, i) => `item-${i}`);
  const payload: GepaPayload = {
    ...makePayload(),
    input: {
      note: hugeString,
      files: deepArray,
      nested: { deeper: { deepest: { tooDeep: hugeString } } }
    },
    output: { note: hugeString, files: deepArray }
  };

  const metadata = buildGepaMetadata(payload);
  const metadataJson = JSON.stringify(metadata);

  assert.ok(
    metadataJson.length < 10_000,
    `expected bounded metadata JSON, got ${metadataJson.length} bytes`
  );

  const input = metadata.input as { files: string[]; note: string };
  assert.ok(input.files.length <= 10, "expected array to be capped");
  assert.ok(input.note.length <= 300, "expected nested string to be capped");
});

// ---------------------------------------------------------------------------
// emitGepaEvent — provider-only transport (FEAT-235 Decision 1)
// ---------------------------------------------------------------------------

test("delivers GEPA payload via provider with the mapped MemoryKind (FEAT-235 / DEC-072), not the raw event string", async () => {
  const seen: Array<{ type: string; text: string; metadata?: Record<string, unknown> }> = [];
  _setWireProvider({
    remember: async (req) => {
      seen.push(req);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });

  await emitGepaEvent(makePayload());

  assert.equal(seen.length, 1);
  // slice_close -> lesson (GEPA_KIND_MAP), not the raw "slice_close" string —
  // this is the live bug DEC-072 fixes.
  assert.equal(seen[0]!.type, "lesson");
  assert.equal(seen[0]!.text, "All AC passed. No surprises.");
  const meta = seen[0]!.metadata as Record<string, unknown>;
  assert.equal(meta["sliceId"], "SLICE-288");
  assert.equal(meta["featId"], "FEAT-288");
  assert.equal(meta["score"], 0.87);
  assert.equal(meta["prompt_version"], "abc1234");
});

const kindCases: Array<[GepaPayload["event"], string]> = [
  ["slice_close", "lesson"],
  ["phase_gate_fail", "failure"],
  ["slice_started", "note"],
  ["recall_used", "note"],
  ["triage_shift", "decision"]
];
for (const [event, expectedKind] of kindCases) {
  test(`GEPA_KIND_MAP: ${event} -> ${expectedKind}`, async () => {
    const seen: Array<{ type: string }> = [];
    _setWireProvider({
      remember: async (req) => {
        seen.push(req);
      },
      recall: async () => ({ hits: [] }),
      health: async () => ({ ok: true })
    });

    await emitGepaEvent({ ...makePayload(), event });

    assert.equal(seen.length, 1);
    assert.equal(seen[0]!.type, expectedKind);
  });
}

test("never throws when no provider is discoverable", async () => {
  _setWireProvider(null);
  await assert.doesNotReject(async () => {
    await emitGepaEvent(makePayload());
  });
});

test("never throws when provider.remember rejects", async () => {
  _setWireProvider({
    remember: async () => {
      throw new Error("boom");
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });
  await assert.doesNotReject(async () => {
    await emitGepaEvent(makePayload());
  });
});

test("respects an explicit capMs override instead of the DEFAULT_MEMORY_CAP_MS default", async () => {
  _setWireProvider({
    remember: () => new Promise(() => {}), // never settles
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });

  const start = Date.now();
  await emitGepaEvent(makePayload(), 300);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 1500, `expected the explicit 300ms cap to apply, took ${elapsed}ms`);
});

// ---------------------------------------------------------------------------
// FEAT-263 follow-up: optional project/agent attribution (docs/sop/memory-bridge.md)
// ---------------------------------------------------------------------------

test("buildGepaMetadata mirrors project/agent into metadata when present", () => {
  const payload: GepaPayload = {
    ...makePayload(),
    project: "runner-plugin",
    agent: "devcrew:builder"
  };
  const metadata = buildGepaMetadata(payload);
  assert.equal(metadata["project"], "runner-plugin");
  assert.equal(metadata["agent"], "devcrew:builder");
});

test("buildGepaMetadata omits project/agent keys when absent (no regression for existing callers)", () => {
  const metadata = buildGepaMetadata(makePayload());
  assert.ok(!("project" in metadata));
  assert.ok(!("agent" in metadata));
});

test("emitGepaEvent sends project/agent as top-level wire fields, mirrored in metadata", async () => {
  const seen: Array<Record<string, unknown>> = [];
  _setWireProvider({
    remember: async (req) => {
      seen.push(req as unknown as Record<string, unknown>);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });

  await emitGepaEvent({
    ...makePayload(),
    project: "runner-plugin",
    agent: "devcrew:fullstack-dev"
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0]!["project"], "runner-plugin");
  assert.equal(seen[0]!["agent"], "devcrew:fullstack-dev");
  const meta = seen[0]!["metadata"] as Record<string, unknown>;
  assert.equal(meta["project"], "runner-plugin");
  assert.equal(meta["agent"], "devcrew:fullstack-dev");
});

test("emitGepaEvent omits project/agent top-level fields when absent", async () => {
  const seen: Array<Record<string, unknown>> = [];
  _setWireProvider({
    remember: async (req) => {
      seen.push(req as unknown as Record<string, unknown>);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });

  await emitGepaEvent(makePayload());

  assert.equal(seen.length, 1);
  assert.ok(!("project" in seen[0]!));
  assert.ok(!("agent" in seen[0]!));
});
