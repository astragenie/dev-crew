// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import {
  installLoop,
  reportStatus,
  MARKER_START,
  MARKER_END,
  buildContextRulesList
} from "../scripts/lib/loop-installer.mjs";
import {
  findCrewCli,
  getCrewVersion,
  compareSemver,
  MIN_CREW_VERSION
} from "../scripts/lib/plugin-identity.mjs";

function execFile(file, args, opts) {
  return promisify(execFileCallback)(file, args, { timeout: 10000, ...opts });
}

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initGitRepo(prefix: string) {
  const repo = await tmpRepo(prefix);
  await execFile("git", ["init", "--quiet"], { cwd: repo });
  await execFile("git", ["config", "user.email", "t@e"], { cwd: repo });
  await execFile("git", ["config", "user.name", "t"], { cwd: repo });
  await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });
  return repo;
}

const crewCliPath = await findCrewCli();
const installedCrewVersion = await getCrewVersion(crewCliPath);
const crewAvailable = Boolean(
  crewCliPath && installedCrewVersion && compareSemver(installedCrewVersion, MIN_CREW_VERSION) >= 0
);

test("installLoop errors when target is not a git repo", async () => {
  const repo = await tmpRepo("al-install-no-git-");
  await assert.rejects(() => installLoop(repo, { migrateAdhoc: false }), /Not a git repository/);
});

test("installLoop refuses when bun below minimum", async () => {
  const repo = await initGitRepo("al-install-bun-old-");
  await assert.rejects(
    () => installLoop(repo, { migrateAdhoc: false, bunVersionOverride: "0.0.1" }),
    /bun >= /
  );
});

test("installLoop errors when target dir does not exist", async () => {
  await assert.rejects(
    () =>
      installLoop(path.join(os.tmpdir(), `al-nonexistent-${Date.now()}`), { migrateAdhoc: false }),
    /does not exist/
  );
});

test("installLoop writes marker block, loop-control files, backlog scaffold, config", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-happy-");
  const result = await installLoop(repo, { migrateAdhoc: false });

  assert.equal(result.mode, "install-loop");
  assert.equal(result.preset, "dotnet-python");

  const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.ok(claudeMd.includes(MARKER_START));
  assert.ok(claudeMd.includes(MARKER_END));
  // HARD RULES summary lives in CLAUDE.md; full text moved out-of-band to
  // .claude/loop/rules.md so the per-session prompt stays small.
  assert.ok(claudeMd.includes("Autonomous Loop — HARD RULES (summary)"));
  assert.match(claudeMd, /\.claude\/loop\/rules\.md/);

  const rulesPath = path.join(repo, ".claude", "loop", "rules.md");
  const rulesMd = await fs.readFile(rulesPath, "utf8");
  assert.ok(rulesMd.includes("Autonomous Loop Instruction — HARD RULE"));
  assert.ok(rulesMd.includes("Cross-Slice Continuation — HARD RULE"));
  assert.ok(rulesMd.includes("Phase Completion Gate — HARD RULE"));

  const loopRoot = path.join(repo, ".claude", "artifacts", "loop", "ai-loop");
  for (const rel of [
    "01-loop-control/WIGGIN_LOOP.md",
    "01-loop-control/EVIDENCE_RULES.md",
    "01-loop-control/STOP_CONDITIONS.md",
    "00-entry/MASTER_PROMPT.md",
    "00-entry/SLICE_TEMPLATE.md",
    "backlog/approved-slices.md",
    "backlog/completed-slices.md",
    "backlog/product-backlog.md",
    "slices/pending/.gitkeep"
  ]) {
    assert.ok(
      await fs
        .access(path.join(loopRoot, rel))
        .then(() => true)
        .catch(() => false),
      `expected file under ai-loop: ${rel}`
    );
  }

  const cfg = JSON.parse(await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8"));
  assert.equal(cfg.preset, "dotnet-python");
});

test("installLoop is idempotent: re-running does not duplicate marker block", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-idempotent-");
  await installLoop(repo, { migrateAdhoc: false });
  await installLoop(repo, { migrateAdhoc: false });
  const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  const startCount = claudeMd.split(MARKER_START).length - 1;
  const endCount = claudeMd.split(MARKER_END).length - 1;
  assert.equal(startCount, 1, "marker start must appear exactly once after re-install");
  assert.equal(endCount, 1, "marker end must appear exactly once after re-install");
});

test("installLoop collapses stacked orphan start markers (regression: < 0.1.12 stacking bug)", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-orphans-");
  // Simulate a CLAUDE.md that was corrupted by repeated installs from an
  // earlier plugin version: many start markers stacked, no end marker.
  const orphans = Array(7)
    .fill(`${MARKER_START}\n<!-- Installed by /loop:install. -->\n`)
    .join("\n");
  await fs.writeFile(
    path.join(repo, "CLAUDE.md"),
    `# CLAUDE.md\n\n## Preserve me\n\nUser content above the bad block.\n\n${orphans}`
  );

  await installLoop(repo, { migrateAdhoc: false });

  const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  const startCount = claudeMd.split(MARKER_START).length - 1;
  const endCount = claudeMd.split(MARKER_END).length - 1;
  assert.equal(startCount, 1, "stacked starts must collapse to one");
  assert.equal(endCount, 1, "exactly one end marker after install");
  assert.ok(claudeMd.includes("## Preserve me"), "user content above the bad block must survive");
  assert.ok(
    claudeMd.includes("User content above the bad block."),
    "user prose above must survive"
  );
});

test("installLoop is convergent: second run after orphan-collapse is a no-op", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-convergence-");
  const orphans = Array(5)
    .fill(`${MARKER_START}\n<!-- Installed by /loop:install. -->\n`)
    .join("\n");
  await fs.writeFile(path.join(repo, "CLAUDE.md"), `# CLAUDE.md\n\n${orphans}`);

  await installLoop(repo, { migrateAdhoc: false });
  const afterFirst = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  await installLoop(repo, { migrateAdhoc: false });
  const afterSecond = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");

  assert.equal(
    afterFirst,
    afterSecond,
    "second install after collapse must produce identical bytes"
  );
});

test("installLoop preserves user content outside the marker block", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-preserve-");
  await fs.writeFile(
    path.join(repo, "CLAUDE.md"),
    "# CLAUDE.md\n\n## Custom section\n\nUser-authored content.\n"
  );
  await installLoop(repo, { migrateAdhoc: false });
  const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.ok(claudeMd.includes("## Custom section"));
  assert.ok(claudeMd.includes("User-authored content."));
  assert.ok(claudeMd.includes(MARKER_START));
});

// P1.9: registerReadGuardHook (and hooks/read-guard.sh itself) removed —
// advisory-noise anti-pattern per D2 (2026-07-04). installLoop no longer
// touches .claude/settings.json at all; the three hook-registration tests
// that lived here (register / idempotent / preserve-user-hooks) covered
// only that removed code path and are removed with it.
test("installLoop does not create or modify .claude/settings.json", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-no-settings-");
  const settingsDir = path.join(repo, ".claude");
  await fs.mkdir(settingsDir, { recursive: true });
  const userHook = {
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "echo user-hook" }]
        }
      ]
    }
  };
  const before = JSON.stringify(userHook, null, 2) + "\n";
  await fs.writeFile(path.join(settingsDir, "settings.json"), before);

  await installLoop(repo, { migrateAdhoc: false });

  const after = await fs.readFile(path.join(settingsDir, "settings.json"), "utf8");
  assert.equal(after, before, "installLoop must leave a pre-existing settings.json untouched");
});

test("buildContextRulesList returns empty string when contextRules absent", () => {
  assert.equal(buildContextRulesList({}), "");
});

test("buildContextRulesList returns empty string when contextRules is empty array", () => {
  assert.equal(buildContextRulesList({ contextRules: [] }), "");
});

test("buildContextRulesList renders globs and docs for each rule", () => {
  const result = buildContextRulesList({
    contextRules: [
      { globs: ["src/db/**", "*.sql"], docs: ["docs/database.md"] },
      { globs: ["src/auth/**"], docs: ["docs/auth.md", "docs/security.md"] }
    ]
  });
  assert.ok(result.includes("`src/db/**`"), "first glob appears");
  assert.ok(result.includes("`*.sql`"), "second glob appears");
  assert.ok(result.includes("`docs/database.md`"), "first doc appears");
  assert.ok(result.includes("`docs/auth.md`"), "second rule doc appears");
});

test("buildContextRulesList output contains in_scope_globs instruction prose", () => {
  const result = buildContextRulesList({
    contextRules: [{ globs: ["src/**"], docs: ["docs/conventions.md"] }]
  });
  assert.ok(result.includes("in_scope_globs"), "instruction mentions in_scope_globs");
});

test("reportStatus reflects install state", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-status-");
  await installLoop(repo, { migrateAdhoc: false });
  const status = await reportStatus(repo);
  assert.equal(status.preset, "dotnet-python");
  assert.equal(status.hasMarkerBlock, true);
  assert.equal(status.hasApprovedSlices, true);
  assert.equal(status.hasMasterPrompt, true);
  assert.ok(status.crewCli);
});
