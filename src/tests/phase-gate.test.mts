// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { runPhaseGate } from "../scripts/lib/phase-gate.mjs";

function execFile(file, args, opts) {
  return promisify(execFileCallback)(file, args, { timeout: 10000, ...opts });
}

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// P2 seam-elimination (SLICE-13): crew is a same-repo subtree now, not an
// installed plugin discovered via findCrewCli() — its CLI entry point lives
// at a fixed, always-present path in this checkout, run directly under bun
// (no more findCrewCli/crewCliRuntime discovery + runtime-picker dance).
const CREW_CLI = path.resolve("crew/scripts/crew.mts");

async function initRepoWithCrewState(prefix: string) {
  const repo = await tmpRepo(prefix);
  await execFile("git", ["init", "--quiet"], { cwd: repo });
  await execFile("git", ["config", "user.email", "t@e"], { cwd: repo });
  await execFile("git", ["config", "user.name", "t"], { cwd: repo });
  await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });

  // Seed minimal crew state so write-validation-result has somewhere to write.
  await execFile("bun", [CREW_CLI, "init", "--repo", repo, "--allow-existing"]);
  return repo;
}

async function writeConfig(repo: string, stack: Record<string, any>) {
  const dir = path.join(repo, ".claude");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
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

test("runPhaseGate runs configured commands and reports PASS", async () => {
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
});

test("runPhaseGate captures FAIL when a stage exits non-zero", async () => {
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
});

test("runPhaseGate skips unconfigured stages cleanly", async () => {
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
});

// SLICE-12 (P2 seam-elimination, docs/planning/p2-seam-contract.md §2): the
// write-validation-result direct import is fail-hard by design — unlike the
// old execFile path (which caught its own failure into `{ ok: false }` with
// zero effect on control flow), a writer failure must abort runPhaseGate
// entirely and never let a validation-result artifact land.
test("runPhaseGate fail-hard: a write-validation-result failure aborts the run and claims no artifact", async () => {
  const repo = await initRepoWithCrewState("al-pg-failhard-");
  await writeConfig(repo, {
    build: [{ cmd: "node", args: ["-e", "process.exit(0)"] }]
  });
  // Redirect the LOCAL phase-gate report (writeReport) to a separate
  // directory from crew's fixed `.claude/artifacts/crew/validations` target
  // (writeArtifact hardcodes that path, not configurable) — otherwise
  // sabotaging one directory breaks both writers and this test can't tell
  // the crew-artifact failure apart from a local-report failure. Verified by
  // round trip: without this redirect, the OLD execFile-based code ALSO
  // rejects (for the wrong reason — writeReport's own mkdir failing, which
  // runs unguarded before recordWithCrew), giving a false-positive pass.
  const configPath = path.join(repo, ".claude", "loop.json");
  const cfg = JSON.parse(await fs.readFile(configPath, "utf8"));
  cfg.loop = { ...(cfg.loop ?? {}), phaseGateArtifactDir: ".claude/artifacts/phase-gate-reports" };
  await fs.writeFile(configPath, JSON.stringify(cfg));

  // Inject a writer failure: sabotage `.claude/artifacts/crew` into a plain
  // file instead of a directory, so writeArtifact's own
  // `fs.mkdir(artifactDir, { recursive: true })` throws ENOTDIR when
  // writeValidationResultArtifact tries to write the validation-result
  // artifact. That throw must propagate uncaught out of runPhaseGate.
  const crewArtifactsDir = path.join(repo, ".claude", "artifacts", "crew");
  await fs.rm(crewArtifactsDir, { recursive: true, force: true });
  await fs.writeFile(crewArtifactsDir, "sabotage: not a directory");

  await assert.rejects(() => runPhaseGate(repo, { phase: "fail-hard-1" }));

  // No PASS validation-result artifact was ever written — the sabotaged
  // path means the validations/ subdirectory could not even be created.
  const validationsDir = path.join(crewArtifactsDir, "validations");
  const validationsIsDir = await fs
    .stat(validationsDir)
    .then((s) => s.isDirectory())
    .catch(() => false);
  assert.equal(validationsIsDir, false, "no validation-result artifact directory should exist");
});

// Happy-path counterpart: the direct-import replacement must actually land
// a real crew validation-result artifact on disk (not just report PASS
// locally) — proving the direct-import path, not merely that the old
// execFile-based subprocess call was removed.
test("runPhaseGate direct-import happy path: crew validation-result artifact lands on disk", async () => {
  const repo = await initRepoWithCrewState("al-pg-directimport-");
  await writeConfig(repo, {
    build: [{ cmd: "node", args: ["-e", "console.log('build ok'); process.exit(0)"] }]
  });
  const result = await runPhaseGate(repo, { phase: "direct-import-1" });
  assert.equal(result.status, "PASS");
  assert.equal(result.crewArtifactRegistered, true);

  const validationsDir = path.join(repo, ".claude", "artifacts", "crew", "validations");
  const entries = await fs.readdir(validationsDir);
  const match = entries.find((f) => f.includes("validation-result"));
  assert.ok(match, "expected a validation-result artifact written directly by writeArtifact");
  const body = await fs.readFile(path.join(validationsDir, match), "utf8");
  assert.match(body, /decision:\s*pass/, "frontmatter carries the canonical 'pass' verdict");
  assert.ok(body.includes("Phase direct-import-1 gate"), "title carries the phase id");
});
