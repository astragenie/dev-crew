import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSpawnArgs,
  CLAUDE_BIN,
  spawnReactionProcess
} from "../scripts/lib/watch/reaction-spawn.mjs";
import type { SpawnFn } from "../scripts/lib/watch/reaction-spawn.mjs";
import type { ReactionAction, ReactionSpawn } from "../scripts/lib/watch/types.mjs";

const FORBIDDEN_FLAG = "--dangerously-skip-permissions";

function makeSpawn(
  action: ReactionAction,
  promptArg = "/runner:intake --from-issue x"
): ReactionSpawn {
  return {
    finding: { kind: "issue", findingId: "issue:1", ghSlug: "org/repo" },
    action,
    command: `claude -p "${promptArg}"`,
    promptArg,
    cwd: "C:\\work\\repo"
  };
}

const ALL_ACTIONS: ReactionAction[] = ["intake", "pr-fix", "crew-fix", "issue-broker-file"];

// ---------------------------------------------------------------------------
// AC-3: constructed args never include --dangerously-skip-permissions,
// across every ReactionAction variant, with and without an allowlist.

test("AC-3: buildSpawnArgs never includes --dangerously-skip-permissions, across every ReactionAction, no allowlist configured", () => {
  for (const action of ALL_ACTIONS) {
    const result = buildSpawnArgs(makeSpawn(action), undefined);
    if (result === null) continue; // issue-broker-file — never spawns
    assert.ok(!result.args.includes(FORBIDDEN_FLAG), `action=${action}`);
  }
});

test("AC-3: buildSpawnArgs never includes --dangerously-skip-permissions, across every ReactionAction, with an allowlist configured", () => {
  for (const action of ALL_ACTIONS) {
    const result = buildSpawnArgs(makeSpawn(action), ["Read", "Bash(gh:*)"]);
    if (result === null) continue;
    assert.ok(!result.args.includes(FORBIDDEN_FLAG), `action=${action}`);
  }
});

test("AC-3: a misconfigured allowedTools that carries the forbidden flag as a value is filtered out, never spawned", () => {
  // allowedTools is meant to carry tool names (Read, Bash(gh:*), ...), not
  // CLI flags. A tool name never starts with "-", so buildSpawnArgs drops
  // any flag-shaped entry before joining --allowedTools's value — a
  // misconfigured allowlist can never smuggle the forbidden flag (or any
  // other flag) into the argv passed to spawn.
  for (const action of ALL_ACTIONS) {
    const result = buildSpawnArgs(makeSpawn(action), [FORBIDDEN_FLAG]);
    if (result === null) continue; // issue-broker-file — never spawns
    assert.ok(!result.args.includes(FORBIDDEN_FLAG), `action=${action}`);
    assert.ok(
      !result.args.includes("--allowedTools"),
      `action=${action}: an all-filtered allowlist adds no --allowedTools flag at all`
    );
  }
});

test("AC-3: buildSpawnArgs returns null for issue-broker-file (tier-2, watch-only — never a real spawn)", () => {
  assert.equal(buildSpawnArgs(makeSpawn("issue-broker-file"), undefined), null);
  assert.equal(buildSpawnArgs(makeSpawn("issue-broker-file"), ["Read"]), null);
});

test("buildSpawnArgs: no allowlist configured means no --allowedTools flag at all (normal permission prompts, never a bypass)", () => {
  const result = buildSpawnArgs(makeSpawn("intake", "/runner:intake --from-issue x"), undefined);
  assert.ok(result);
  assert.deepEqual(result!.args, ["-p", "/runner:intake --from-issue x"]);
  assert.equal(result!.bin, CLAUDE_BIN);
});

test("buildSpawnArgs: a configured allowlist is joined into a single --allowedTools value", () => {
  const result = buildSpawnArgs(makeSpawn("pr-fix", "/runner:pr-fix 5"), ["Read", "Bash(gh:*)"]);
  assert.ok(result);
  assert.deepEqual(result!.args, ["-p", "/runner:pr-fix 5", "--allowedTools", "Read,Bash(gh:*)"]);
});

test("buildSpawnArgs: an empty allowlist array behaves like an absent allowlist", () => {
  const result = buildSpawnArgs(makeSpawn("crew-fix", "/crew:fix run:9"), []);
  assert.ok(result);
  assert.deepEqual(result!.args, ["-p", "/crew:fix run:9"]);
});

// ---------------------------------------------------------------------------
// spawnReactionProcess: injectable spawn — must never launch a real process
// in any test in this suite.

test("spawnReactionProcess: null spawnArgs (issue-broker-file) never calls the injected spawn function", () => {
  let called = false;
  const spawnFn: SpawnFn = () => {
    called = true;
    return { on: () => {}, unref: () => {} };
  };
  spawnReactionProcess(null, spawnFn);
  assert.equal(called, false);
});

test("spawnReactionProcess: real args call the injected spawn function detached, then unref", () => {
  const calls: Array<{ bin: string; args: string[]; options: unknown }> = [];
  let unrefCalled = false;
  const spawnFn: SpawnFn = (bin, args, options) => {
    calls.push({ bin, args, options });
    return {
      on: () => {},
      unref: () => {
        unrefCalled = true;
      }
    };
  };

  const spawnArgs = buildSpawnArgs(makeSpawn("intake", "/runner:intake --from-issue x"), undefined);
  assert.ok(spawnArgs);
  spawnReactionProcess(spawnArgs, spawnFn);

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.bin, CLAUDE_BIN);
  assert.deepEqual(calls[0]!.args, ["-p", "/runner:intake --from-issue x"]);
  assert.deepEqual(calls[0]!.options, { cwd: "C:\\work\\repo", detached: true, stdio: "ignore" });
  assert.equal(unrefCalled, true);
});

test("spawnReactionProcess: a spawn 'error' event is logged, not thrown, and never crashes the caller", () => {
  let errorListener: ((err: Error) => void) | null = null;
  const spawnFn: SpawnFn = () => ({
    on: (_event, listener) => {
      errorListener = listener;
    },
    unref: () => {}
  });

  const spawnArgs = buildSpawnArgs(makeSpawn("crew-fix", "/crew:fix run:1"), undefined);
  assert.ok(spawnArgs);
  spawnReactionProcess(spawnArgs, spawnFn);

  assert.ok(errorListener, "an 'error' listener must be registered");
  // Simulating the 'error' event must not throw back out to the caller.
  assert.doesNotThrow(() => errorListener!(new Error("ENOENT: claude not found")));
});

// ---------------------------------------------------------------------------
// AC-3 (grep/lint half): the forbidden flag must never appear as constructed
// argv content in the watch/ source — only inside a comment, or the single
// FORBIDDEN_FLAG constant definition line reaction-spawn.mts uses to guard
// against it. Any other occurrence (e.g. spliced into an args array or
// .push() call) fails this check.

const WATCH_DIR = path.resolve(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "scripts",
  "lib",
  "watch"
);

function isCommentOrDefinitionLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/**")) return true;
  // The one line allowed to hold the literal outside a comment: the
  // FORBIDDEN_FLAG constant declaration itself.
  if (/^const FORBIDDEN_FLAG = "--dangerously-skip-permissions";$/.test(trimmed)) return true;
  return false;
}

test("AC-3 grep check: --dangerously-skip-permissions never appears in watch/ source outside a comment or the guarded constant", async () => {
  const entries = await fs.readdir(WATCH_DIR);
  const violations: string[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".mts")) continue;
    const filePath = path.join(WATCH_DIR, entry);
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!line.includes(FORBIDDEN_FLAG)) continue;
      if (isCommentOrDefinitionLine(line)) continue;
      violations.push(`${entry}:${i + 1}: ${line.trim()}`);
    }
  }

  assert.deepEqual(violations, []);
});
