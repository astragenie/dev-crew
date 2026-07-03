// Tests for src/scripts/lib/memory-doctor-renderer.mts
// renderMemoryStatusBlock() must produce distinct, correct Markdown for all 4 states.

import { test } from "bun:test";
import assert from "node:assert/strict";

import { renderMemoryStatusBlock } from "../scripts/lib/memory-doctor-renderer.mjs";
import type { MemoryStatus } from "../scripts/lib/memory-doctor.mjs";

// -----------------------------------------------------------------------
// Case 1: ok state — CLI path + provider + version + URL + last ingest
// -----------------------------------------------------------------------

test("renderMemoryStatusBlock ok state includes CLI, provider, version, URL, last_ingest_at", () => {
  const status: MemoryStatus = {
    cli_present: true,
    cli_path: "/usr/local/bin/astramem",
    health: "ok",
    provider: "saas",
    version: "0.4.1",
    url: "https://mem.astragenie.dev",
    last_ingest_at: "2026-06-20T12:00:00Z"
  };

  const output = renderMemoryStatusBlock(status);

  assert.ok(output.includes("## Memory layer"), "must start with ## Memory layer");
  assert.ok(output.includes("**Status:** ok"), "must include ok status");
  assert.ok(output.includes("/usr/local/bin/astramem"), "must include CLI path");
  assert.ok(output.includes("saas"), "must include provider");
  assert.ok(output.includes("0.4.1"), "must include version");
  assert.ok(output.includes("https://mem.astragenie.dev"), "must include URL");
  assert.ok(output.includes("2026-06-20T12:00:00Z"), "must include last_ingest_at");
});

// -----------------------------------------------------------------------
// Case 2: cli_missing state — dormant message + off-switch reminder
// -----------------------------------------------------------------------

test("renderMemoryStatusBlock cli_missing state includes dormant message and off-switch", () => {
  const status: MemoryStatus = {
    cli_present: false,
    health: "cli_missing"
  };

  const output = renderMemoryStatusBlock(status);

  assert.ok(output.includes("## Memory layer"), "must start with ## Memory layer");
  assert.ok(output.includes("dormant"), "must mention dormant state");
  assert.ok(output.includes("memory-plugin v0.4"), "must mention memory-plugin v0.4");
  assert.ok(output.includes("loop.memory.enabled"), 'must mention "never" off-switch');
  // Must NOT say "ok" or "unreachable"
  assert.ok(!output.includes("**Status:** ok"), "must not show ok status");
  assert.ok(!output.includes("unreachable"), "must not show unreachable status");
});

// -----------------------------------------------------------------------
// Case 3: unreachable state — fix hints present
// -----------------------------------------------------------------------

test("renderMemoryStatusBlock unreachable state includes fix hints", () => {
  const status: MemoryStatus = {
    cli_present: true,
    cli_path: "/usr/local/bin/astramem",
    health: "unreachable",
    version: "0.4.0",
    error: "connection refused",
    fix_hint: "Check your provider config."
  };

  const output = renderMemoryStatusBlock(status);

  assert.ok(output.includes("## Memory layer"), "must start with ## Memory layer");
  assert.ok(output.includes("unreachable"), "must include unreachable status");
  assert.ok(output.includes("**Fix hints:**"), "must include Fix hints section");
  assert.ok(output.includes("astramem doctor"), "must mention astramem doctor");
  assert.ok(output.includes("astramem config set provider saas"), "must include provider fix hint");
  assert.ok(output.includes("Check your provider config."), "must include custom fix_hint");
  assert.ok(output.includes("/usr/local/bin/astramem"), "must include CLI path");
  assert.ok(output.includes("0.4.0"), "must include version");
});

// -----------------------------------------------------------------------
// Case 4: disabled state
// -----------------------------------------------------------------------

test("renderMemoryStatusBlock disabled state shows disabled message", () => {
  const status: MemoryStatus = {
    cli_present: false,
    health: "disabled"
  };

  const output = renderMemoryStatusBlock(status);

  assert.ok(output.includes("## Memory layer"), "must start with ## Memory layer");
  assert.ok(output.includes("disabled"), "must include disabled keyword");
  assert.ok(output.includes('loop.memory.enabled = "never"'), "must cite the config key");
  // Must NOT say ok / dormant / unreachable
  assert.ok(!output.includes("**Status:** ok"), "must not show ok status");
  assert.ok(!output.includes("dormant"), "must not show dormant");
});

// -----------------------------------------------------------------------
// Case 5: ok state with URL and version present (spot-check field isolation)
// -----------------------------------------------------------------------

test("renderMemoryStatusBlock ok state with URL and version appear correctly", () => {
  const status: MemoryStatus = {
    cli_present: true,
    health: "ok",
    version: "1.2.3",
    url: "https://example.com/mem"
  };

  const output = renderMemoryStatusBlock(status);

  assert.ok(output.includes("1.2.3"), "version must appear");
  assert.ok(output.includes("https://example.com/mem"), "URL must appear");
  assert.ok(!output.includes("last_ingest_at"), "must not include raw field name");
});

// -----------------------------------------------------------------------
// Case 6: States produce distinct output (no cross-contamination)
// -----------------------------------------------------------------------

test("renderMemoryStatusBlock produces distinct output for all 4 states", () => {
  const states: MemoryStatus[] = [
    { cli_present: true, health: "ok" },
    { cli_present: false, health: "cli_missing" },
    { cli_present: true, health: "unreachable" },
    { cli_present: false, health: "disabled" }
  ];

  const outputs = states.map(renderMemoryStatusBlock);

  // All start with the header.
  for (const o of outputs) {
    assert.ok(o.includes("## Memory layer"), "each state must include the header");
  }

  // All outputs are distinct.
  const unique = new Set(outputs);
  assert.equal(unique.size, 4, "all 4 states must produce distinct output");
});
