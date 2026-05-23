import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  migrateLegacyAutonomousLoop,
  LEGACY_CONFIG_FILE,
  NEW_CONFIG_FILE,
  LEGACY_RULES_DIR,
  NEW_RULES_DIR,
  LEGACY_MARKER_START,
  LEGACY_MARKER_END,
  NEW_MARKER_START,
  NEW_MARKER_END
} from "../scripts/lib/legacy-migrator.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

test("legacy config file `.claude/autonomous-loop.json` renames to `.claude/loop.json`", async () => {
  const repo = await tmpRepo("legacy-migrator-config-");
  const legacyPath = path.join(repo, LEGACY_CONFIG_FILE);
  await fs.mkdir(path.dirname(legacyPath), { recursive: true });
  const payload = '{"preset":"dotnet-aspire-python","loop":{"aiLoopRoot":"docs/x"}}\n';
  await fs.writeFile(legacyPath, payload);

  const result = await migrateLegacyAutonomousLoop(repo);

  assert.equal(result.migrated, true);
  assert.equal(await pathExists(legacyPath), false, "legacy config must be gone");
  const newPath = path.join(repo, NEW_CONFIG_FILE);
  assert.equal(await pathExists(newPath), true, "new config must exist");
  const moved = await fs.readFile(newPath, "utf8");
  assert.equal(moved, payload, "config contents must be preserved byte-for-byte");
  assert.ok(
    result.steps.some((s) => s.kind === "config" && s.action === "renamed"),
    "result must include the config rename step"
  );
});

test("legacy rules dir `.claude/autonomous-loop/` renames to `.claude/loop/`", async () => {
  const repo = await tmpRepo("legacy-migrator-rules-");
  const legacyDir = path.join(repo, LEGACY_RULES_DIR);
  await fs.mkdir(legacyDir, { recursive: true });
  await fs.writeFile(path.join(legacyDir, "rules.md"), "# rules\n");
  await fs.writeFile(path.join(legacyDir, "extra.txt"), "x");

  const result = await migrateLegacyAutonomousLoop(repo);

  assert.equal(result.migrated, true);
  assert.equal(await pathExists(legacyDir), false, "legacy dir must be gone");
  const newDir = path.join(repo, NEW_RULES_DIR);
  assert.equal(await pathExists(newDir), true, "new dir must exist");
  const rulesContent = await fs.readFile(path.join(newDir, "rules.md"), "utf8");
  assert.equal(rulesContent, "# rules\n");
  const extraContent = await fs.readFile(path.join(newDir, "extra.txt"), "utf8");
  assert.equal(extraContent, "x");
  assert.ok(
    result.steps.some((s) => s.kind === "rules-dir" && s.action === "renamed"),
    "result must include the rules-dir rename step"
  );
});

test("CLAUDE.md markers `autonomous-loop:start/end` rewrite to `loop:start/end` and preserve inner content", async () => {
  const repo = await tmpRepo("legacy-migrator-markers-");
  const claudePath = path.join(repo, "CLAUDE.md");
  const inner =
    "## Autonomous Loop — HARD RULES (summary)\n\nThis repo runs the Wiggin Loop autonomously.\n";
  const original = `# CLAUDE.md\n\n## Preserve me\n\nUser content.\n\n${LEGACY_MARKER_START}\n${inner}${LEGACY_MARKER_END}\n\n## After\n\nMore user content.\n`;
  await fs.writeFile(claudePath, original);

  const result = await migrateLegacyAutonomousLoop(repo);

  assert.equal(result.migrated, true);
  const rewritten = await fs.readFile(claudePath, "utf8");
  assert.ok(rewritten.includes(NEW_MARKER_START), "new start marker must be present");
  assert.ok(rewritten.includes(NEW_MARKER_END), "new end marker must be present");
  assert.ok(!rewritten.includes(LEGACY_MARKER_START), "legacy start marker must be gone");
  assert.ok(!rewritten.includes(LEGACY_MARKER_END), "legacy end marker must be gone");
  assert.ok(rewritten.includes(inner.trim()), "inner block content must survive verbatim");
  assert.ok(rewritten.includes("## Preserve me"), "user content above block must survive");
  assert.ok(rewritten.includes("## After"), "user content below block must survive");
  assert.ok(
    result.steps.some((s) => s.kind === "claude-md-markers" && s.action === "rewritten"),
    "result must include the markers-rewritten step"
  );
});

test("migrator is idempotent: running twice does not double-rewrite", async () => {
  const repo = await tmpRepo("legacy-migrator-idempotent-");
  // Seed all three legacy artifacts.
  const legacyConfig = path.join(repo, LEGACY_CONFIG_FILE);
  await fs.mkdir(path.dirname(legacyConfig), { recursive: true });
  await fs.writeFile(legacyConfig, '{"preset":"x"}\n');
  const legacyDir = path.join(repo, LEGACY_RULES_DIR);
  await fs.mkdir(legacyDir, { recursive: true });
  await fs.writeFile(path.join(legacyDir, "rules.md"), "# rules\n");
  const claudePath = path.join(repo, "CLAUDE.md");
  await fs.writeFile(
    claudePath,
    `# CLAUDE.md\n\n${LEGACY_MARKER_START}\ninside\n${LEGACY_MARKER_END}\n`
  );

  const first = await migrateLegacyAutonomousLoop(repo);
  assert.equal(first.migrated, true);
  const afterFirst = await fs.readFile(claudePath, "utf8");
  const newConfigAfterFirst = await fs.readFile(path.join(repo, NEW_CONFIG_FILE), "utf8");

  // Second pass should be a clean no-op.
  const second = await migrateLegacyAutonomousLoop(repo);
  assert.equal(second.migrated, false, "second pass must report no migrations");
  assert.equal(second.steps.length, 0, "second pass must produce zero steps");

  const afterSecond = await fs.readFile(claudePath, "utf8");
  assert.equal(afterFirst, afterSecond, "CLAUDE.md bytes must be identical on second pass");

  const newConfigAfterSecond = await fs.readFile(path.join(repo, NEW_CONFIG_FILE), "utf8");
  assert.equal(newConfigAfterFirst, newConfigAfterSecond, "config bytes must be identical");
});

test("migrator no-ops cleanly when no legacy state exists", async () => {
  const repo = await tmpRepo("legacy-migrator-empty-");
  // Drop a CLAUDE.md with NO markers at all.
  const claudePath = path.join(repo, "CLAUDE.md");
  const original = "# CLAUDE.md\n\nFresh repo, no loop install yet.\n";
  await fs.writeFile(claudePath, original);

  const result = await migrateLegacyAutonomousLoop(repo);

  assert.equal(result.migrated, false, "no legacy state -> migrated must be false");
  assert.equal(result.steps.length, 0, "no legacy state -> zero steps emitted");
  const after = await fs.readFile(claudePath, "utf8");
  assert.equal(after, original, "CLAUDE.md must be untouched");
  // Neither new nor legacy artifacts should have been created.
  assert.equal(await pathExists(path.join(repo, NEW_CONFIG_FILE)), false);
  assert.equal(await pathExists(path.join(repo, NEW_RULES_DIR)), false);
  assert.equal(await pathExists(path.join(repo, LEGACY_CONFIG_FILE)), false);
  assert.equal(await pathExists(path.join(repo, LEGACY_RULES_DIR)), false);
});

test("migrator skips legacy artifacts when new destination already exists", async () => {
  const repo = await tmpRepo("legacy-migrator-conflict-");
  // Both legacy and new config exist (e.g., partial migration earlier).
  const legacyConfig = path.join(repo, LEGACY_CONFIG_FILE);
  const newConfig = path.join(repo, NEW_CONFIG_FILE);
  await fs.mkdir(path.dirname(legacyConfig), { recursive: true });
  await fs.writeFile(legacyConfig, '{"legacy":true}\n');
  await fs.writeFile(newConfig, '{"new":true}\n');

  const result = await migrateLegacyAutonomousLoop(repo);

  // No rename happened: the new config still contains its own bytes, the
  // legacy file is left alone for the user to resolve.
  const stillNew = await fs.readFile(newConfig, "utf8");
  assert.equal(stillNew, '{"new":true}\n', "new config must NOT be overwritten");
  assert.equal(await pathExists(legacyConfig), true, "legacy config must remain on disk");
  assert.ok(
    result.steps.some(
      (s) =>
        s.kind === "config" && s.action === "skipped" && /destination already exists/.test(s.reason)
    ),
    "result must include a skipped step explaining the conflict"
  );
  assert.equal(result.migrated, false, "skipped-only result must report migrated=false");
});
