import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Resolve paths relative to the repo root (two levels up from src/tests/)
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const HOOK_SCRIPT = path.join(REPO_ROOT, "hooks", "bootstrap-context.mjs");
const HOOKS_JSON = path.join(REPO_ROOT, ".claude-plugin", "hooks", "hooks.json");

// Test 1 — Happy path: exits 0 and writes non-empty stdout containing fencing
test("bootstrap-context hook exits 0 and writes non-empty stdout", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  assert.ok(result.stdout.length > 0, "stdout must not be empty");
  assert.ok(
    result.stdout.includes("runner bootstrap context"),
    `stdout must include "runner bootstrap context"; got: ${result.stdout.slice(0, 200)}`
  );
});

// Test 2 — Output is within token budget (line count <= 65)
test("bootstrap-context hook output stays within line budget", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const lines = result.stdout.split("\n");
  assert.ok(lines.length <= 65, `line count ${lines.length} exceeds budget of 65`);
});

// Test 3 — Output contains all six key HARD RULE reminder topics
test("bootstrap-context hook output covers all six required topics", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const stdout = result.stdout;

  assert.ok(stdout.includes("Run until PASS"), 'must include "Run until PASS"');
  assert.ok(
    stdout.toLowerCase().includes("automode") ||
      stdout.includes("auto mode") ||
      stdout.includes("autoMode"),
    'must include "autoMode" or "auto mode"'
  );
  assert.ok(
    stdout.includes("/runner:start"),
    'must include "/runner:start" (P1.8 renamed from the retired /loop:slice start)'
  );
  assert.ok(
    stdout.includes("crew:fullstack-dev"),
    "must include a current builder reference (crew:fullstack-dev, P1.8-renamed from the retired crew:builder)"
  );
  assert.ok(stdout.includes("escalated_to_human"), 'must include "escalated_to_human"');
  assert.ok(stdout.includes("rules.md"), 'must include "rules.md"');
});

// Test 4 — Fail-open: exits 0 even when stdout is closed (write fails)
test("bootstrap-context hook exits 0 when stdout is ignored", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], {
    encoding: "utf8",
    stdio: ["pipe", "ignore", "pipe"]
  });
  assert.equal(
    result.status,
    0,
    `expected exit 0 with closed stdout, got ${result.status}; stderr: ${result.stderr}`
  );
});

// Test 5 — hooks.json registers the bootstrap-context hook correctly. Asserts
// the entry is present and correctly configured by description rather than a
// fixed array length/position — SessionStart is a shared array that other
// hooks (e.g. runner:astrarunner-emit-session-start) also register into, so
// pinning an exact count here would make this test couple to unrelated hooks.
test("hooks.json registers the bootstrap-context SessionStart hook correctly", () => {
  const raw = readFileSync(HOOKS_JSON, "utf8");
  const config = JSON.parse(raw) as {
    hooks: {
      SessionStart: Array<{
        hooks: Array<{ type: string; command: string; description: string; timeout: number }>;
      }>;
    };
  };

  const sessionStart = config.hooks.SessionStart;
  assert.ok(
    sessionStart.length >= 2,
    `expected at least 2 SessionStart entries (version-check + bootstrap-context), got ${sessionStart.length}`
  );

  const bootstrapEntry = sessionStart.find(
    (entry) => entry.hooks[0]?.description === "loop:bootstrap-context"
  );
  assert.ok(
    bootstrapEntry,
    `expected a SessionStart entry with description "loop:bootstrap-context"; got descriptions: ${sessionStart.map((e) => e.hooks[0]?.description).join(", ")}`
  );
  assert.ok(
    bootstrapEntry.hooks[0].command.includes("bootstrap-context.mjs"),
    `bootstrap-context entry command must include "bootstrap-context.mjs"; got: ${bootstrapEntry.hooks[0].command}`
  );
  assert.equal(bootstrapEntry.hooks[0].timeout, 5);
});
