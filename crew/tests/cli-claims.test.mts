import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "bun:test";
import { runCrew } from "../scripts/crew.mjs";
import { makeTempDir } from "./helpers/cli-fixtures.mjs";

test("CLI init creates a harnessed repo", async () => {
  const rootPath = await makeTempDir("crew-cli-init-");
  const repoPath = path.join(rootPath, "app");
  const { code, output } = await runCrew(["init", "--repo", repoPath]);
  expect(code, "init should exit with code 0").toBe(0);
  const result = JSON.parse(output);

  expect(result.mode).toBe("init");
  expect(result.audit.hasHarnessLayer).toBe(true);
  expect(result.welcome.headline).toMatch(/Crew/);
  expect(result.welcome.commands.includes("/crew:brief-me")).toBeTruthy();

  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  expect(claudeMd).toMatch(/crew:start/);
});

test("CLI bootstrap preserves existing CLAUDE.md content", async () => {
  const repoPath = await makeTempDir("crew-cli-bootstrap-");
  await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Existing\n");

  const { code, output } = await runCrew(["bootstrap", "--repo", repoPath]);
  expect(code, "bootstrap should exit with code 0").toBe(0);
  const result = JSON.parse(output);
  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");

  expect(result.mode).toBe("bootstrap");
  expect(result.welcome.headline).toMatch(/Crew/);
  expect(result.welcome.commands.includes("/crew:build")).toBeTruthy();
  expect(claudeMd).toMatch(/# Existing/);
  expect(claudeMd).toMatch(/crew:start/);
});

test("CLI claim and release manage repo-local claims", async () => {
  const repoPath = await makeTempDir("crew-cli-claims-");
  await runCrew(["init", "--repo", repoPath]);

  const claimResponse = await runCrew([
    "claim",
    "--repo",
    repoPath,
    "--owner",
    "fullstack-dev",
    "src/example.ts"
  ]);
  expect(claimResponse.code, "claim should exit with code 0").toBe(0);
  const claimResult = JSON.parse(claimResponse.output);
  expect(claimResult.claimed).toEqual(["src/example.ts"]);

  const conflictsResponse = await runCrew([
    "show-conflicts",
    "--repo",
    repoPath,
    "--owner",
    "lead-session",
    "src/example.ts"
  ]);
  expect(conflictsResponse.code, "show-conflicts should exit with code 0").toBe(0);
  const conflictsResult = JSON.parse(conflictsResponse.output);
  expect(conflictsResult.conflicts.length).toBe(1);
  expect(conflictsResult.conflicts[0].owner).toBe("fullstack-dev");
  expect(conflictsResult.owned.length).toBe(0);
  expect(conflictsResult.available.length).toBe(0);

  const ownedResponse = await runCrew([
    "show-conflicts",
    "--repo",
    repoPath,
    "--owner",
    "fullstack-dev",
    "src/example.ts",
    "src/free.ts"
  ]);
  expect(ownedResponse.code, "show-conflicts should exit with code 0").toBe(0);
  const ownedResult = JSON.parse(ownedResponse.output);
  expect(ownedResult.owned.length).toBe(1);
  expect(ownedResult.owned[0].path).toBe("src/example.ts");
  expect(ownedResult.conflicts.length).toBe(0);
  expect(ownedResult.available).toEqual([{ path: "src/free.ts" }]);

  const releaseResponse = await runCrew(["release", "--repo", repoPath, "src/example.ts"]);
  expect(releaseResponse.code, "release should exit with code 0").toBe(0);
  const releaseResult = JSON.parse(releaseResponse.output);
  expect(releaseResult.released).toEqual(["src/example.ts"]);
});
