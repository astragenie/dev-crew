import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { runPhaseGate } from "../scripts/lib/phase-gate.mjs";
import { findCrewCli } from "../scripts/lib/plugin-identity.mjs";

const execFile = promisify(execFileCallback);

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initRepoWithCrewState(prefix: string) {
  const repo = await tmpRepo(prefix);
  await execFile("git", ["init", "--quiet"], { cwd: repo });
  await execFile("git", ["config", "user.email", "t@e"], { cwd: repo });
  await execFile("git", ["config", "user.name", "t"], { cwd: repo });
  await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });

  // Seed minimal crew state so write-validation-result has somewhere to write.
  const crewCli = await findCrewCli();
  if (crewCli) {
    await execFile("node", [crewCli, "init", "--repo", repo, "--allow-existing"]);
  }
  return repo;
}

async function writeConfig(repo: string, stack: Record<string, any>) {
  const dir = path.join(repo, ".claude");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      stack: {
        build: null,
        test: null,
        frontendBuild: null,
        infraPlan: null,
        aspireBoot: null,
        healthchecks: [],
        ...stack
      }
    })
  );
}

const crewAvailable = await findCrewCli();

test(
  "runPhaseGate runs configured commands and reports PASS",
  { skip: crewAvailable ? false : "crew CLI not installed in plugin cache" },
  async () => {
    const repo = await initRepoWithCrewState("al-pg-pass-");
    await writeConfig(repo, {
      build: [{ cmd: "node", args: ["-e", "console.log('build ok'); process.exit(0)"] }],
      test: [{ cmd: "node", args: ["-e", "console.log('tests ok'); process.exit(0)"] }]
    });
    const result = await runPhaseGate(repo, { phase: "test-1" });
    assert.equal(result.status, "PASS");
    assert.ok(result.artifactPath);
    // Loop-owned phase-gate filename has no timestamp; phase id is the
    // uniqueness key.
    assert.match(
      path.basename(result.artifactPath),
      /^phase[a-z0-9]+-gate\.md$/,
      "phase-gate filename is `phase<N>-gate.md` (no timestamp)"
    );
    const body = await fs.readFile(result.artifactPath, "utf8");
    assert.ok(body.includes("Status: PASS"));
    assert.ok(body.includes("build ok"));
    assert.ok(body.includes("tests ok"));
  }
);

test(
  "runPhaseGate captures FAIL when a stage exits non-zero",
  { skip: crewAvailable ? false : "crew CLI not installed in plugin cache" },
  async () => {
    const repo = await initRepoWithCrewState("al-pg-fail-");
    await writeConfig(repo, {
      build: [{ cmd: "node", args: ["-e", "console.error('build broke'); process.exit(2)"] }]
    });
    const result = await runPhaseGate(repo, { phase: "test-2" });
    assert.equal(result.status, "FAIL");
    const body = await fs.readFile(result.artifactPath, "utf8");
    assert.ok(body.includes("Status: FAIL"));
    assert.ok(body.includes("FAIL"));
    assert.ok(body.includes("build broke"));
  }
);

test(
  "runPhaseGate skips unconfigured stages cleanly",
  { skip: crewAvailable ? false : "crew CLI not installed in plugin cache" },
  async () => {
    const repo = await initRepoWithCrewState("al-pg-skip-");
    await writeConfig(repo, {
      build: [{ cmd: "node", args: ["-e", "process.exit(0)"] }]
    });
    const result = await runPhaseGate(repo, { phase: "skip-1" });
    assert.equal(result.status, "PASS");
    const skipped = result.stages.filter((s) => s.skipped).map((s) => s.name);
    assert.ok(skipped.includes("test"));
    assert.ok(skipped.includes("frontendBuild"));
    assert.ok(skipped.includes("infraPlan"));
    assert.ok(skipped.includes("aspireBoot"));
  }
);
