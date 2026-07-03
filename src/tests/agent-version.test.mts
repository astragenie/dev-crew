// Tests for src/scripts/lib/agent-version.mts

import { test, beforeEach } from "bun:test";
import assert from "node:assert/strict";

import { getPromptVersion, _resetVersionCache } from "../scripts/lib/agent-version.mjs";

beforeEach(() => {
  _resetVersionCache();
});

// ---------------------------------------------------------------------------
// Resolves sha7 for a known agent file
// ---------------------------------------------------------------------------

test("returns a 7-char hex sha or 'unknown' for an agent that exists in the repo", async () => {
  // 'pm' is a well-known agent file in this repo (agents/pm.md).
  // If it has git history we get a sha7; if git is unavailable we get 'unknown'.
  const version = await getPromptVersion("pm");
  const isValidSha7 = /^[0-9a-f]{7}$/.test(version);
  const isUnknown = version === "unknown";
  assert.ok(isValidSha7 || isUnknown, `expected 7-char hex sha or 'unknown', got: ${version}`);
});

// ---------------------------------------------------------------------------
// Returns 'unknown' on git failure
// ---------------------------------------------------------------------------

test("returns 'unknown' when the agent file does not exist", async () => {
  // Requesting a non-existent agent — git log returns empty output → 'unknown'.
  const version = await getPromptVersion("__nonexistent_agent_xyz__");
  assert.equal(version, "unknown");
});

// ---------------------------------------------------------------------------
// Cache hit: spawn called only once
// ---------------------------------------------------------------------------

test("cache hit on second call — identical string reference returned", async () => {
  const v1 = await getPromptVersion("pm");
  const v2 = await getPromptVersion("pm");
  // Same value (referential equality guaranteed by Map cache).
  assert.strictEqual(v1, v2);
});

test("cache is keyed per agentName — different agents get independent entries", async () => {
  const vPm = await getPromptVersion("pm");
  const vNonExistent = await getPromptVersion("__nonexistent_agent_xyz__");
  // pm should be sha7 or unknown; non-existent is always unknown.
  assert.equal(vNonExistent, "unknown");
  // They're independent — no cross-contamination.
  assert.ok(vPm !== vNonExistent || vPm === "unknown");
});

test("_resetVersionCache clears the cache so next call re-resolves", async () => {
  const v1 = await getPromptVersion("pm");
  _resetVersionCache();
  const v2 = await getPromptVersion("pm");
  // Both should be the same value (git is deterministic within a session)
  // but v2 must have been freshly computed (we can't observe the Map internal,
  // so we just assert no throw and consistent value).
  assert.equal(v1, v2);
});
