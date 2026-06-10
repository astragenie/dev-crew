import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

// Tests for hooks/read-guard.sh.
//
// The hook runs as a bash script under bash on POSIX or Git-Bash on
// Windows. Skip the entire suite when neither shell is discoverable
// (Windows runners without Git-Bash) — the assertion is on the bash
// script itself, not on the platform path.

function discoverBash(): string | null {
  const candidates =
    process.platform === "win32"
      ? ["C:/Program Files/Git/bin/bash.exe", "C:/Program Files/Git/usr/bin/bash.exe", "bash"]
      : ["bash"];
  for (const c of candidates) {
    const result = spawnSync(c, ["--version"], { stdio: "ignore" });
    if (result.status === 0) return c;
  }
  return null;
}

const bashBin = discoverBash();
// Resolve from the source test location. Under Bun (which runs .mts directly),
// import.meta.url points to src/tests/. Under Node.js test runner, it pointed to
// tests/. We use a dual-layout resolution: try one level up first (Node.js case),
// fall back to two levels up (Bun case).
let hookPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
  "..",
  "hooks",
  "read-guard.sh"
);
// Bun case: if not found at ../, try ../../
try {
  await fs.stat(hookPath);
} catch {
  hookPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
    "../..",
    "hooks",
    "read-guard.sh"
  );
}

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  return repo;
}

function runHook(
  repo: string,
  sessionId: string,
  toolInput: object
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(bashBin!, [hookPath], {
    cwd: repo,
    env: {
      ...process.env,
      CLAUDE_TOOL_INPUT: JSON.stringify(toolInput),
      CLAUDE_SESSION_ID: sessionId
    },
    encoding: "utf8"
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

test(
  "read-guard.sh exists and is executable",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const stat = await fs.stat(hookPath);
    assert.ok(stat.isFile(), "hook script should exist as a file");
  }
);

test(
  "read-guard exits 0 with no CLAUDE_TOOL_INPUT (fail-open)",
  { skip: !bashBin ? "bash not available on this runner" : false },
  () => {
    const result = spawnSync(bashBin!, [hookPath], { encoding: "utf8" });
    assert.equal(result.status, 0, "must fail-open when env is missing");
  }
);

test(
  "read-guard exits 0 on first Read of a file (no prior history)",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-first-");
    const result = runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/a.mts" }
    });
    assert.equal(result.status, 0, "first read should pass");
  }
);

test(
  "read-guard exits 1 on Read immediately after Edit of the same path",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-postedit-");
    // Pre-seed: agent edited a.mts in this session
    const edit = runHook(repo, "sess-1", {
      tool_name: "Edit",
      tool_input: { file_path: "/path/to/a.mts" }
    });
    assert.equal(edit.status, 0, "Edit call itself never blocks");

    const reread = runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/a.mts" }
    });
    assert.equal(reread.status, 1, "post-Edit re-read must be blocked");
    assert.match(reread.stderr, /BLOCKED/);
    assert.match(reread.stderr, /a\.mts/);
  }
);

test(
  "read-guard exits 1 on Read immediately after Write of the same path",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-postwrite-");
    runHook(repo, "sess-1", {
      tool_name: "Write",
      tool_input: { file_path: "/path/to/b.mts" }
    });

    const reread = runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/b.mts" }
    });
    assert.equal(reread.status, 1, "post-Write re-read must be blocked");
    assert.match(reread.stderr, /BLOCKED/);
  }
);

test(
  "read-guard allows Read after Edit of a DIFFERENT path",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-diff-path-");
    runHook(repo, "sess-1", {
      tool_name: "Edit",
      tool_input: { file_path: "/path/to/a.mts" }
    });

    const result = runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/b.mts" }
    });
    assert.equal(result.status, 0, "different path must pass");
  }
);

test(
  "read-guard allows paging Read (different offset than prior Read)",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-paging-");
    runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/big.mts", offset: 0, limit: 200 }
    });
    const result = runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/big.mts", offset: 200, limit: 200 }
    });
    assert.equal(result.status, 0, "paging read with different offset must pass");
  }
);

test(
  "read-guard blocks same-range re-Read (same path, same offset)",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-samerange-");
    runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/c.mts", offset: 0 }
    });
    const result = runHook(repo, "sess-1", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/c.mts", offset: 0 }
    });
    assert.equal(result.status, 1, "same-range re-read must block");
    assert.match(result.stderr, /BLOCKED/);
  }
);

test(
  "read-guard resets log when session id changes",
  { skip: !bashBin ? "bash not available on this runner" : false },
  async () => {
    const repo = await tmpRepo("al-guard-sessionreset-");
    // Session A: edit + (would-be-blocked) read in same session
    runHook(repo, "sess-A", {
      tool_name: "Edit",
      tool_input: { file_path: "/path/to/d.mts" }
    });
    const blocked = runHook(repo, "sess-A", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/d.mts" }
    });
    assert.equal(blocked.status, 1, "session A: post-edit read blocked");

    // Session B: new session — log should reset, first read passes
    const newSession = runHook(repo, "sess-B", {
      tool_name: "Read",
      tool_input: { file_path: "/path/to/d.mts" }
    });
    assert.equal(newSession.status, 0, "session B: fresh log, read should pass");
  }
);
