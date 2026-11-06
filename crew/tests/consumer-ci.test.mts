import { test, expect } from "bun:test";
// tests/consumer-ci.test.mts — FEAT-027 / SLICE-53 (audit T5): detects
// whether a consumer repo runs its own CI test gate, so the
// `deriveValidationGate` satisfiedByReview delegation (src/scripts/lib/
// validation-gate.mts) only applies when there's a real CI safety net.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { hasConsumerCi } from "../scripts/lib/ci/consumer-ci.mjs";

async function tmpRepo(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "consumer-ci-test-"));
}

async function writeWorkflow(repo: string, filename: string, body: string): Promise<void> {
  const dir = path.join(repo, ".github", "workflows");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), body);
}

async function writeLoopJsonStackTest(repo: string, entries: Array<{ cmd: string; args?: string[] }>) {
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude", "loop.json"),
    JSON.stringify({ stack: { test: entries, build: [{ cmd: "bun", args: ["run", "lint"] }] } }, null, 2)
  );
}

// AC-1 (part 1): no .github at all -> present=false, workflows=[].
test("hasConsumerCi: no .github directory -> present false", async () => {
  const repo = await tmpRepo();
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(false);
  expect(result.workflows).toEqual([]);
});

// AC-1 (part 2): push-triggered workflow running `bun test` -> present=true,
// workflows equals ["ci.yml"].
test("hasConsumerCi: push-triggered workflow running bun test -> present true, workflows [ci.yml]", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  push:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: bun test\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
  expect(result.workflows).toEqual(["ci.yml"]);
});

// AC-1 (part 3): workflow lacking push/pull_request triggers -> present=false.
test("hasConsumerCi: workflow triggered only by workflow_dispatch -> present false", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  workflow_dispatch:\njobs:\n  test:\n    steps:\n      - run: bun test\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(false);
  expect(result.workflows).toEqual([]);
});

test("hasConsumerCi: pull_request-only trigger counts as present", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  pull_request:\njobs:\n  test:\n    steps:\n      - run: npm test\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
  expect(result.workflows).toEqual(["ci.yml"]);
});

test("hasConsumerCi: `on` as a flow-sequence array of strings", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non: [push]\njobs:\n  test:\n    steps:\n      - run: pytest\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
});

test("hasConsumerCi: triggers present but no recognizable test command -> present false", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  push:\njobs:\n  lint:\n    steps:\n      - run: bun run lint\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(false);
  expect(result.workflows).toEqual([]);
});

// stack.test (not stack.build) is the source of truth for the configured
// test command — a workflow running the repo's own configured command
// (which need not match any of the hardcoded known patterns) still counts.
test("hasConsumerCi: matches the repo's configured stack.test command, not stack.build", async () => {
  const repo = await tmpRepo();
  await writeLoopJsonStackTest(repo, [{ cmd: "bun", args: ["test", "--parallel"] }]);
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  push:\njobs:\n  test:\n    steps:\n      - run: bun test --parallel\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
});

test("hasConsumerCi: a workflow running only the configured stack.build command does not count", async () => {
  const repo = await tmpRepo();
  await writeLoopJsonStackTest(repo, [{ cmd: "bun", args: ["test", "--parallel"] }]);
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  push:\njobs:\n  lint:\n    steps:\n      - run: bun run lint\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(false);
});

test("hasConsumerCi: dotnet test is recognized as a known test command", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  push:\njobs:\n  test:\n    steps:\n      - run: dotnet test\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
});

test("hasConsumerCi: go test is recognized as a known test command", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  pull_request:\njobs:\n  test:\n    steps:\n      - run: go test ./...\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
});

test("hasConsumerCi: multiple matching workflow files are all reported, sorted", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(
    repo,
    "zzz-ci.yml",
    "name: CI 2\non:\n  push:\njobs:\n  test:\n    steps:\n      - run: bun test\n"
  );
  await writeWorkflow(
    repo,
    "ci.yml",
    "name: CI\non:\n  push:\njobs:\n  test:\n    steps:\n      - run: bun test\n"
  );
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(true);
  expect(result.workflows).toEqual(["ci.yml", "zzz-ci.yml"]);
});

test("hasConsumerCi: invalid YAML in a workflow file is skipped, not thrown", async () => {
  const repo = await tmpRepo();
  await writeWorkflow(repo, "broken.yml", "on: [push\njobs: {{{not yaml");
  const result = await hasConsumerCi(repo);
  expect(result.present).toBe(false);
  expect(result.workflows).toEqual([]);
});
