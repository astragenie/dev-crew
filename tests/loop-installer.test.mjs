import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import {
  installLoop,
  reportStatus,
  MARKER_START,
  MARKER_END
} from "../scripts/lib/loop-installer.mjs";
import {
  findCrewCli,
  getCrewVersion,
  compareSemver,
  MIN_CREW_VERSION
} from "../scripts/lib/plugin-identity.mjs";

const execFile = promisify(execFileCallback);

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initGitRepo(prefix) {
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

test("installLoop errors when target dir does not exist", async () => {
  await assert.rejects(
    () =>
      installLoop(path.join(os.tmpdir(), `al-nonexistent-${Date.now()}`), { migrateAdhoc: false }),
    /does not exist/
  );
});

test(
  "installLoop writes marker block, loop-control files, backlog scaffold, config",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
    const repo = await initGitRepo("al-install-happy-");
    const result = await installLoop(repo, { migrateAdhoc: false });

    assert.equal(result.mode, "install-loop");
    assert.equal(result.preset, "dotnet-aspire-python");

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

    const loopRoot = path.join(repo, "docs", "ai-loop");
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
    assert.equal(cfg.preset, "dotnet-aspire-python");
  }
);

test(
  "installLoop is idempotent: re-running does not duplicate marker block",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
    const repo = await initGitRepo("al-install-idempotent-");
    await installLoop(repo, { migrateAdhoc: false });
    await installLoop(repo, { migrateAdhoc: false });
    const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
    const startCount = claudeMd.split(MARKER_START).length - 1;
    const endCount = claudeMd.split(MARKER_END).length - 1;
    assert.equal(startCount, 1, "marker start must appear exactly once after re-install");
    assert.equal(endCount, 1, "marker end must appear exactly once after re-install");
  }
);

test(
  "installLoop collapses stacked orphan start markers (regression: < 0.1.12 stacking bug)",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
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
  }
);

test(
  "installLoop is convergent: second run after orphan-collapse is a no-op",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
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
  }
);

test(
  "installLoop preserves user content outside the marker block",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
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
  }
);

test(
  "installLoop migrates an ad-hoc HARD RULE block when migrateAdhoc is true",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
    const repo = await initGitRepo("al-install-migrate-");
    await fs.writeFile(
      path.join(repo, "CLAUDE.md"),
      `# CLAUDE.md\n\n## Autonomous Loop Instruction — HARD RULE\n\n**Run autonomously...**\n\n**Phase Completion Gate — HARD RULE:**\n1. \`dotnet build solution.slnx -c Release\`\n2. \`pytest tests/\`\n\n---\n\n## Other content\n\nMust survive.\n`
    );
    await installLoop(repo, { migrateAdhoc: true });
    const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
    assert.ok(claudeMd.includes(MARKER_START), "new marker block should be present");
    assert.ok(!claudeMd.includes("**Run autonomously...**"), "ad-hoc block text should be removed");
    assert.ok(claudeMd.includes("## Other content"), "unrelated content must remain");

    const cfg = JSON.parse(await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8"));
    assert.ok(
      cfg.stack.build.length > 0 || cfg.stack.test.length > 0,
      "extracted commands should land in the config"
    );
  }
);

test(
  "reportStatus reflects install state",
  {
    skip: crewAvailable
      ? false
      : `crew CLI >= v${MIN_CREW_VERSION} not installed in plugin cache (found: ${installedCrewVersion || "none"})`
  },
  async () => {
    const repo = await initGitRepo("al-status-");
    await installLoop(repo, { migrateAdhoc: false });
    const status = await reportStatus(repo);
    assert.equal(status.preset, "dotnet-aspire-python");
    assert.equal(status.hasMarkerBlock, true);
    assert.equal(status.hasApprovedSlices, true);
    assert.equal(status.hasMasterPrompt, true);
    assert.ok(status.crewCli);
  }
);
