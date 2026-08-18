// FEAT-214 item 7 — `snapshot-memory` had both a live COMMANDS handler
// (loop.mts) and a v0.53 "removed" stub in DELETED_SKILLS_MAP that
// intercepted every invocation before the handler ever ran. This test
// pins the un-stub: the CLI subcommand must actually run the handler and
// write the snapshot artifact, not print a "removed in v0.53" message.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { addFeature } from "../scripts/lib/backlog-writer.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  // FEAT-218 Phase 2: the loop.mts CLI dispatcher resolves config once for
  // every command (AC-5 — resolveConfig throws when .claude/loop.json is
  // absent instead of silently defaulting), so every temp repo driving the
  // CLI needs a config file present, exactly like a real installed repo.
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({}));
  return repo;
}

test("CLI snapshot-memory runs the live handler, not the deleted-skill stub", async () => {
  const repo = await tmpRepo("snapshot-cli-live-");
  await addFeature(repo, { title: "Test" });

  const proc = Bun.spawn(["bun", LOOP_CLI, "snapshot-memory", "--repo", repo], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const code = await proc.exited;
  const stderr = await new Response(proc.stderr).text();

  assert.equal(code, 0, `expected exit 0; stderr=${stderr}`);
  assert.ok(
    !stderr.includes("removed in v0.53"),
    "snapshot-memory must no longer hit the deleted-skill stub"
  );

  const snapshotPath = path.join(repo, ".claude/artifacts/loop/loop-snapshot.md");
  const content = await fs.readFile(snapshotPath, "utf8");
  assert.ok(content.includes("# Autonomous Loop snapshot"), "snapshot file must be written");
});
