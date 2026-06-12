// FEAT-168 / AC-3 — audit trail on decomposition refuse.
// CLI `slice from-feature` against a >= 8-point FEAT lacking
// proposed_slices must (a) exit 1 and (b) append one JSON line to
// .claude/artifacts/loop/auto-dispatch.jsonl with the spec'd shape.

import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { addFeature } from "../scripts/lib/backlog-writer.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");
const AUDIT_LOG_REL = ".claude/artifacts/loop/auto-dispatch.jsonl";

async function tmpRepoWithLoopConfig(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

test("refuse-emits-audit-entry: from-feature on 8-point FEAT without proposed_slices writes audit JSONL line", async () => {
  const { updateFeatureFrontmatter } = await import("../scripts/lib/backlog-writer.mjs");
  const repo = await tmpRepoWithLoopConfig("al-cli-refuse-audit-");
  const feat = await addFeature(repo, { title: "Big work needing decomposition" });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 8 });

  const r = spawnSync("bun", [LOOP_CLI, "slice", "from-feature", "--id", feat.id, "--repo", repo], {
    encoding: "utf8"
  });

  assert.equal(r.status, 1, `expected exit 1, got ${r.status}; stderr=${r.stderr}`);
  assert.match(
    r.stderr,
    /sized 8 points/,
    `stderr should mention 'sized 8 points'; got: ${r.stderr}`
  );

  const auditPath = path.join(repo, AUDIT_LOG_REL);
  const raw = await fs.readFile(auditPath, "utf8");
  const lines = raw.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1, `expected 1 audit line, got ${lines.length}: ${raw}`);
  const entry = JSON.parse(lines[0]);

  assert.equal(entry.parentCommand, "slice from-feature");
  assert.equal(entry.featureId, feat.id);
  assert.equal(entry.ok, false);
  assert.equal(entry.skipped, false);
  assert.match(
    entry.error,
    new RegExp(`${feat.id}.*sized 8 points`),
    `error field should contain FEAT id + "sized 8 points"; got: ${entry.error}`
  );
  // ISO-8601 timestamp.
  assert.match(
    entry.timestamp,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
    `timestamp must be ISO-8601 UTC; got: ${entry.timestamp}`
  );
});

test("no-audit-on-happy-path: from-feature on small FEAT does not append a refuse audit entry", async () => {
  const { updateFeatureFrontmatter } = await import("../scripts/lib/backlog-writer.mjs");
  const repo = await tmpRepoWithLoopConfig("al-cli-no-audit-");
  const feat = await addFeature(repo, { title: "Small work" });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 3 });

  const r = spawnSync("bun", [LOOP_CLI, "slice", "from-feature", "--id", feat.id, "--repo", repo], {
    encoding: "utf8"
  });

  assert.equal(r.status, 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);

  const auditPath = path.join(repo, AUDIT_LOG_REL);
  let raw = "";
  try {
    raw = await fs.readFile(auditPath, "utf8");
  } catch {
    return;
  }
  const refuseLines = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter(
      (e) => e.parentCommand === "slice from-feature" && e.featureId === feat.id && e.ok === false
    );
  assert.equal(
    refuseLines.length,
    0,
    `happy path must not write a refuse audit entry; got: ${JSON.stringify(refuseLines)}`
  );
});
