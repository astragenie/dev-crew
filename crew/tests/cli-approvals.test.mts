import { test, expect } from "bun:test";
import { runCrew } from "../scripts/crew.mjs";
import { makeTempDir } from "./helpers/cli-fixtures.mjs";

test("CLI approval requests can be listed and resolved", async () => {
  const repoPath = await makeTempDir("crew-cli-approvals-");
  const initResult = await runCrew(["init", "--repo", repoPath]);
  expect(initResult.code, "init should exit with code 0").toBe(0);

  const requestResult = await runCrew([
    "request-approval",
    "--repo",
    repoPath,
    "--kind",
    "destructive_action",
    "--summary",
    "Delete legacy generated assets",
    "--requester",
    "fullstack-dev"
  ]);
  expect(requestResult.code, "request-approval should exit with code 0").toBe(0);
  const requestOutput = JSON.parse(requestResult.output);
  expect(requestOutput.status).toBe("open");
  expect(requestOutput.approver).toBe("user");

  const openResult = await runCrew(["show-approvals", "--repo", repoPath]);
  expect(openResult.code, "show-approvals should exit with code 0").toBe(0);
  const openOutput = JSON.parse(openResult.output);
  expect(openOutput.approvals.length).toBe(1);
  expect(openOutput.approvals[0].id).toBe(requestOutput.id);

  const resolveResult = await runCrew([
    "resolve-approval",
    "--repo",
    repoPath,
    "--id",
    requestOutput.id,
    "--decision",
    "approved",
    "--resolver",
    "user"
  ]);
  expect(resolveResult.code, "resolve-approval should exit with code 0").toBe(0);
  const resolveOutput = JSON.parse(resolveResult.output);
  expect(resolveOutput.status).toBe("approved");

  const resolvedResult = await runCrew([
    "show-approvals",
    "--repo",
    repoPath,
    "--status",
    "resolved"
  ]);
  expect(resolvedResult.code, "show-approvals with --status should exit with code 0").toBe(0);
  const resolvedOutput = JSON.parse(resolvedResult.output);
  expect(resolvedOutput.approvals.length).toBe(1);
  expect(resolvedOutput.approvals[0].status).toBe("approved");
});
