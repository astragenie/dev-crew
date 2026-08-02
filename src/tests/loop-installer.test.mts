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
import { resolveSkills } from "../scripts/lib/skill-resolver.mjs";

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
  await assert.rejects(
    () => installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" }),
    /Not a git repository/
  );
});

test("installLoop refuses when bun below minimum", async () => {
  const repo = await initGitRepo("al-install-bun-old-");
  await assert.rejects(
    () => installLoop(repo, { migrateAdhoc: false, bunVersionOverride: "0.0.1" }),
    /bun >= /
  );
});

// Regression coverage for the MIN_CREW_VERSION refusal boundary
// (flagged by reviewer + verifier on FEAT-176/SLICE-134 — the guard at
// loop-installer.mts had no injectable seam so it was never exercised
// deterministically). crewCliOverride / crewVersionOverride let these
// tests pin the discovered CLI + version without touching the real
// plugin cache, independent of whatever crew build happens to be
// installed in the environment running the suite.
const fakeCrewCliPath = path.join(os.tmpdir(), "fake-crew-cli", "scripts", "crew.ts");
// One release below MIN_CREW_VERSION under compareSemver's component-wise
// ordering (MIN_CREW_VERSION's patch component is 0, so "one patch below"
// is expressed as the previous minor line — compareSemver short-circuits
// on the first differing component, so any patch value here compares below).
const belowMinCrewVersion = "0.46.9";

test("installLoop installs when crew version is exactly at MIN_CREW_VERSION", async () => {
  const repo = await initGitRepo("al-install-crew-min-");
  const result = await installLoop(repo, {
    migrateAdhoc: false,
    preset: "dotnet-python",
    crewCliOverride: fakeCrewCliPath,
    crewVersionOverride: MIN_CREW_VERSION
  });

  assert.equal(result.mode, "install-loop");
  assert.equal(result.crewCli, fakeCrewCliPath);

  const claudeMd = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.ok(claudeMd.includes(MARKER_START), "install must proceed at exactly MIN_CREW_VERSION");
});

test("installLoop refuses when crew version is one release below MIN_CREW_VERSION", async () => {
  const repo = await initGitRepo("al-install-crew-old-");

  await assert.rejects(
    () =>
      installLoop(repo, {
        migrateAdhoc: false,
        crewCliOverride: fakeCrewCliPath,
        crewVersionOverride: belowMinCrewVersion
      }),
    /Incompatible crew plugin/
  );

  const claudeMdExists = await fs
    .access(path.join(repo, "CLAUDE.md"))
    .then(() => true)
    .catch(() => false);
  assert.equal(
    claudeMdExists,
    false,
    "installLoop must not write CLAUDE.md when the crew version gate rejects"
  );

  const loopJsonExists = await fs
    .access(path.join(repo, ".claude", "loop.json"))
    .then(() => true)
    .catch(() => false);
  assert.equal(
    loopJsonExists,
    false,
    "installLoop must not write .claude/loop.json when the crew version gate rejects"
  );
});

test("installLoop errors when target dir does not exist", async () => {
  await assert.rejects(
    () =>
      installLoop(path.join(os.tmpdir(), `al-nonexistent-${Date.now()}`), {
        migrateAdhoc: false,
        preset: "dotnet-python"
      }),
    /does not exist/
  );
});

// FEAT-218 Phase 2 (AC-5): resolveConfig no longer defaults to a hardcoded
// preset, so a genuinely fresh install (no --preset, no existing
// .claude/loop.json) must fail with an actionable error instead of silently
// picking a stack.
test("installLoop errors on a fresh repo when no --preset is given and no config exists", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-no-preset-");
  await assert.rejects(
    () => installLoop(repo, { migrateAdhoc: false }),
    /No --preset given and no existing \.claude\/loop\.json found/
  );
});

test("installLoop writes marker block, loop-control files, backlog scaffold, config", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-happy-");
  const result = await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });

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

// AC-3: a freshly installed repo's .claude/loop.json is self-contained
// enough to drive builder skill injection with no scripts/presets/ file
// involved — resolveSkills validates and resolves directly against it.
test("installLoop's .claude/loop.json alone satisfies resolve-skills (AC-3)", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-skill-injection-");
  await installLoop(repo, { migrateAdhoc: false, preset: "typescript-plugin-dev" });
  const loopJsonPath = path.join(repo, ".claude", "loop.json");
  const resolved = resolveSkills({ presetPath: loopJsonPath, variant: "single" });
  assert.ok(resolved, "expected a resolved skills block for variant=single");
  assert.deepEqual(resolved!.skills, ["typescript-pro", "frontend-advisory"]);
});

test("installLoop is idempotent: re-running does not duplicate marker block", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-idempotent-");
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });
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

  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });

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

  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });
  const afterFirst = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });
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
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });
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

  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });

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

// FEAT-271 / SLICE-168: --light selection flag.
test("installLoop --light seeds the trimmed reviewer ladder + satisfiedByReview (AC-1)", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-light-");
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python", light: true });

  const cfg = JSON.parse(await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8"));
  assert.deepEqual(cfg.reviewers.ladder, ["A"]);
  assert.equal(cfg.loop.validation.satisfiedByReview, true);
  // The preset's authoring-only `light` block itself is never persisted.
  assert.equal(cfg.light, undefined);
});

test("installLoop without --light keeps the default two-reviewer ladder (AC-2, backward compat)", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-no-light-");
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });

  const cfg = JSON.parse(await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8"));
  assert.deepEqual(cfg.reviewers.ladder, ["A", "B"]);
  assert.equal(cfg.loop.validation, undefined);
});

test("installLoop --light is idempotent across repeated runs (AC-4)", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-install-light-idempotent-");
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python", light: true });
  const afterFirst = await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8");

  // Re-running (with or without --light) must not duplicate or corrupt the
  // reviewers block — writeConfigIfMissing skips the write once the file
  // exists, so the second run is a byte-identical no-op either way.
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python", light: true });
  const afterSecond = await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8");
  assert.equal(afterFirst, afterSecond, "second --light run must not rewrite the config");

  const cfg = JSON.parse(afterSecond);
  assert.deepEqual(cfg.reviewers.ladder, ["A"]);
  assert.equal(cfg.loop.validation.satisfiedByReview, true);
});

test("reportStatus reflects install state", async () => {
  if (!crewAvailable) return;
  const repo = await initGitRepo("al-status-");
  await installLoop(repo, { migrateAdhoc: false, preset: "dotnet-python" });
  const status = await reportStatus(repo);
  assert.equal(status.preset, "dotnet-python");
  assert.equal(status.hasMarkerBlock, true);
  assert.equal(status.hasApprovedSlices, true);
  assert.equal(status.hasMasterPrompt, true);
  assert.ok(status.crewCli);
});
