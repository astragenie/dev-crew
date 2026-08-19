import path from "node:path";
import { test, expect } from "bun:test";
import { execFile, cliPath, makeTempDir } from "./helpers/cli-fixtures.mjs";

test("smoke: claims family (init)", async () => {
  const rootPath = await makeTempDir("crew-smoke-claims-");
  const repoPath = path.join(rootPath, "app");

  const { stdout, stderr } = await execFile("bun", [cliPath, "init", "--repo", repoPath]);

  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
  const result = JSON.parse(stdout);
  expect(result.mode, "result should have mode=init").toBe("init");
});

test("smoke: artifacts family (write-handoff)", async () => {
  const rootPath = await makeTempDir("crew-smoke-artifacts-");
  const repoPath = path.join(rootPath, "app");

  // Init first
  await execFile("bun", [cliPath, "init", "--repo", repoPath]);

  const { stdout, stderr } = await execFile("bun", [
    cliPath,
    "write-handoff",
    "--repo",
    repoPath,
    "--title",
    "smoke"
  ]);

  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
  const result = JSON.parse(stdout);
  expect(result.path, "result should have path field").toBeTruthy();
});

test("smoke: synthesis family (write-final-synthesis)", async () => {
  const rootPath = await makeTempDir("crew-smoke-synthesis-");
  const repoPath = path.join(rootPath, "app");
  const tempProjRoot = await makeTempDir("crew-smoke-proj-");

  // Init first
  await execFile("bun", [cliPath, "init", "--repo", repoPath]);

  const { stdout, stderr } = await execFile(
    "bun",
    [
      cliPath,
      "write-final-synthesis",
      "--repo",
      repoPath,
      "--title",
      "smoke",
      "--external-deltas",
      "none"
    ],
    {
      env: { ...process.env, CREW_PROJECTS_ROOT: tempProjRoot }
    }
  );

  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
  const result = JSON.parse(stdout);
  expect(result.path, "result should have path field").toBeTruthy();
});

test("smoke: cost family (cost-advise)", async () => {
  const rootPath = await makeTempDir("crew-smoke-cost-");
  const repoPath = path.join(rootPath, "app");
  const tempProjRoot = await makeTempDir("crew-smoke-cost-proj-");

  // Init first
  await execFile("bun", [cliPath, "init", "--repo", repoPath]);

  const { stdout, stderr } = await execFile("bun", [cliPath, "cost-advise", "--repo", repoPath], {
    env: { ...process.env, CREW_PROJECTS_ROOT: tempProjRoot }
  });

  expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
  const result = JSON.parse(stdout);
  expect(result.artifactPath, "result should have artifactPath field").toBeTruthy();
});
