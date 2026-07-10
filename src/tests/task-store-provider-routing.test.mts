// @ts-nocheck
// FEAT-251 Phase 2 (SLICE-155) — unify tracker path through getProvider().
//
// Covers the five Given-When-Then ACs on FEAT-251:
//   AC-1: github.enabled:true back-compat branch resolves GithubProvider and
//         produces output identical to the pre-refactor direct
//         importGithubSync("github-sync.mjs") call path.
//   AC-2: taskStore.provider: "noop" resolves NoopProvider — zero github-sync
//         invocations at each migrated site.
//   AC-3: fully-unconfigured repo resolves NoopProvider silently (no throw).
//   AC-4: zero remaining direct importGithubSync calls in loop.mts (grep-based
//         regression guard).
//   AC-5: taskStore.provider: "github" (explicit) resolves the identical
//         GithubProvider behavior as the github.enabled back-compat branch.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  publishFeatureViaProvider,
  publishSliceViaProvider,
  runGithubSubcommand
} from "../scripts/loop.mjs";

async function tmpPublishRepo({ featBody = "## Description\n\nNew thing.\n", featFm = "" } = {}) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "tsp-routing-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const triagedDir = path.join(repo, ".claude/artifacts/loop/backlog/triaged");
  await fs.mkdir(triagedDir, { recursive: true });
  await fs.writeFile(
    path.join(triagedDir, "FEAT-001.md"),
    `---\nid: FEAT-001\nstatus: triaged\npriority: P2\n${featFm}---\n${featBody}`
  );
  return { repo, featPath: path.join(triagedDir, "FEAT-001.md") };
}

async function tmpSliceRepo() {
  const { repo, featPath } = await tmpPublishRepo({ featFm: "slices: [SLICE-01]\n" });
  const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(slicesDir, { recursive: true });
  const slicePath = path.join(slicesDir, "SLICE_01_DO-THING.md");
  await fs.writeFile(
    slicePath,
    "---\nid: SLICE-01\nstatus: pending\nfeature: FEAT-001\n---\n## Objective\n\nDo thing.\n"
  );
  return { repo, featPath, slicePath };
}

function mockGhExec(issueNum) {
  return (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([]);
    if (args[0] === "label" && args[1] === "create") return "";
    if (args[0] === "issue" && args[1] === "create")
      return `https://github.com/org/testrepo/issues/${issueNum}\n`;
    return "";
  };
}

// ---------------------------------------------------------------------------
// AC-1 — github.enabled:true back-compat branch resolves GithubProvider and
// publishes identically to the pre-refactor direct github-sync.mjs call.
// ---------------------------------------------------------------------------

test("AC-1: publishFeatureViaProvider (github.enabled back-compat) creates issue + stamps frontmatter", async () => {
  const { repo, featPath } = await tmpPublishRepo();
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec: mockGhExec(99) };

  const result = await publishFeatureViaProvider(repo, "FEAT-001", config);

  assert.equal(result.created, true);
  assert.equal(result.issueNum, 99);
  assert.equal(result.url, "https://github.com/org/testrepo/issues/99");
  const content = await fs.readFile(featPath, "utf8");
  assert.ok(content.includes("github_issue: 99"), "writes github_issue");
  assert.ok(content.includes("https://github.com/org/testrepo/issues/99"), "writes github_url");
});

test("AC-1: publishSliceViaProvider (github.enabled back-compat) creates FEAT+SLICE issues and stamps both", async () => {
  const { repo, featPath, slicePath } = await tmpSliceRepo();
  let issueCreateCount = 0;
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([]);
    if (args[0] === "label" && args[1] === "create") return "";
    if (args[0] === "issue" && args[1] === "create") {
      issueCreateCount++;
      return `https://github.com/org/testrepo/issues/${issueCreateCount === 1 ? 10 : 11}\n`;
    }
    if (args[0] === "api" && String(args[1]).includes("/issues/11"))
      return JSON.stringify({ id: 999, number: 11 });
    if (args[0] === "api" && String(args[1]).includes("sub_issues")) return JSON.stringify({});
    return "";
  };
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec };

  const result = await publishSliceViaProvider(repo, "SLICE-01", "FEAT-001", config);

  assert.equal(result.created, true);
  assert.equal(result.issueNum, 11);
  const featContent = await fs.readFile(featPath, "utf8");
  assert.ok(featContent.includes("github_issue: 10"), "FEAT gets github_issue");
  const sliceContent = await fs.readFile(slicePath, "utf8");
  assert.ok(sliceContent.includes("github_issue: 11"), "SLICE gets github_issue");
});

test("AC-1: publishFeatureViaProvider idempotent when github_issue already set (no gh calls)", async () => {
  const { repo } = await tmpPublishRepo({
    featFm: 'github_issue: 55\ngithub_url: "https://github.com/org/testrepo/issues/55"\n'
  });
  const calls = [];
  const config = {
    github: { enabled: true, repo: "org/testrepo" },
    ghExec: (args) => {
      calls.push(args);
      return "";
    }
  };

  const result = await publishFeatureViaProvider(repo, "FEAT-001", config);

  assert.equal(result.created, false);
  assert.equal(result.issueNum, 55);
  assert.equal(calls.length, 0, "no gh calls when already published");
});

test("AC-1: github feat-publish subcommand output identical to pre-refactor shape", async () => {
  const { repo } = await tmpPublishRepo();
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec: mockGhExec(42) };

  const result = await runGithubSubcommand(repo, ["feat-publish"], { id: "FEAT-001" }, config);

  assert.equal(result.created, true);
  assert.equal(result.issueNum, 42);
  assert.equal(result.url, "https://github.com/org/testrepo/issues/42");
});

// ---------------------------------------------------------------------------
// AC-2 — taskStore.provider: "noop" resolves NoopProvider; zero github-sync
// invocations at each of the four migrated call sites.
// ---------------------------------------------------------------------------

test("AC-2: publishFeatureViaProvider makes zero gh calls when taskStore.provider is noop", async () => {
  const { repo } = await tmpPublishRepo();
  const calls = [];
  const config = {
    taskStore: { provider: "noop" },
    github: { enabled: true, repo: "org/testrepo" }, // even with github.enabled true, noop wins
    ghExec: (args) => {
      calls.push(args);
      return "";
    }
  };

  const result = await publishFeatureViaProvider(repo, "FEAT-001", config);

  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("AC-2: publishSliceViaProvider makes zero gh calls when taskStore.provider is noop", async () => {
  const { repo } = await tmpSliceRepo();
  const calls = [];
  const config = {
    taskStore: { provider: "noop" },
    github: { enabled: true, repo: "org/testrepo" },
    ghExec: (args) => {
      calls.push(args);
      return "";
    }
  };

  const result = await publishSliceViaProvider(repo, "SLICE-01", "FEAT-001", config);

  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("AC-2: github feat-publish subcommand makes zero gh calls when taskStore.provider is noop", async () => {
  const { repo } = await tmpPublishRepo();
  const calls = [];
  const config = {
    taskStore: { provider: "noop" },
    github: { enabled: true, repo: "org/testrepo" },
    ghExec: (args) => {
      calls.push(args);
      return "";
    }
  };

  const result = await runGithubSubcommand(repo, ["feat-publish"], { id: "FEAT-001" }, config);

  assert.deepEqual(result, { skipped: true });
  assert.equal(calls.length, 0);
});

test("AC-2: github publish/status subcommands no-op when taskStore.provider is noop", async () => {
  const { repo } = await tmpPublishRepo();
  const calls = [];
  const config = {
    taskStore: { provider: "noop" },
    github: { enabled: true, repo: "org/testrepo" },
    ghExec: (args) => {
      calls.push(args);
      return "";
    }
  };

  const publishResult = await runGithubSubcommand(repo, ["publish"], {}, config);
  const statusResult = await runGithubSubcommand(repo, ["status"], {}, config);

  assert.deepEqual(publishResult, { milestones: 0, issues: 0, subissues: 0 });
  assert.deepEqual(statusResult, { milestones: 0, updated: 0, closed: 0 });
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// AC-3 — fully-unconfigured repo (no taskStore block, github.enabled unset)
// resolves NoopProvider silently: no throw, no console.error.
// ---------------------------------------------------------------------------

test("AC-3: publishFeatureViaProvider on fully-unconfigured repo resolves silently, no throw", async () => {
  const { repo } = await tmpPublishRepo();
  const config = {}; // no taskStore, no github block at all

  await assert.doesNotReject(() => publishFeatureViaProvider(repo, "FEAT-001", config));
  const result = await publishFeatureViaProvider(repo, "FEAT-001", config);
  assert.equal(result, null);
});

test("AC-3: publishSliceViaProvider on fully-unconfigured repo resolves silently, no throw", async () => {
  const { repo } = await tmpSliceRepo();
  const config = {};

  await assert.doesNotReject(() => publishSliceViaProvider(repo, "SLICE-01", "FEAT-001", config));
  const result = await publishSliceViaProvider(repo, "SLICE-01", "FEAT-001", config);
  assert.equal(result, null);
});

test("AC-3: github feat-publish on fully-unconfigured repo resolves silently, no throw", async () => {
  const { repo } = await tmpPublishRepo();
  const config = {};

  await assert.doesNotReject(() =>
    runGithubSubcommand(repo, ["feat-publish"], { id: "FEAT-001" }, config)
  );
  const result = await runGithubSubcommand(repo, ["feat-publish"], { id: "FEAT-001" }, config);
  assert.deepEqual(result, { skipped: true });
});

test("AC-3: github sync/bootstrap on fully-unconfigured repo resolve silently via NoopProvider", async () => {
  const { repo } = await tmpPublishRepo();
  const config = {};

  const syncResult = await runGithubSubcommand(repo, ["sync"], {}, config);
  const bootstrapResult = await runGithubSubcommand(repo, ["bootstrap"], {}, config);

  assert.deepEqual(syncResult, { features: [], slices: [] });
  assert.deepEqual(bootstrapResult, { features: [] });
});

// ---------------------------------------------------------------------------
// AC-4 — regression guard: zero remaining direct importGithubSync calls in
// loop.mts outside of GithubProvider's own implementation path.
// ---------------------------------------------------------------------------

test("AC-4: loop.mts contains zero direct importGithubSync(...) call sites", async () => {
  const loopSrc = await fs.readFile(path.resolve("src/scripts/loop.mts"), "utf8");
  const matches = loopSrc.match(/importGithubSync\s*\(/g) ?? [];
  assert.equal(
    matches.length,
    0,
    `expected zero importGithubSync(...) call sites in loop.mts, found ${matches.length}`
  );
  assert.ok(
    !loopSrc.includes('from "./lib/github-sync-loader.mjs"'),
    "loop.mts must not import github-sync-loader.mjs directly anymore"
  );
});

// ---------------------------------------------------------------------------
// AC-5 — taskStore.provider: "github" (explicit) resolves the identical
// GithubProvider behavior as the github.enabled back-compat branch.
// ---------------------------------------------------------------------------

test("AC-5: explicit taskStore.provider=github and github.enabled back-compat produce equivalent output", async () => {
  const explicit = await tmpPublishRepo();
  const backCompat = await tmpPublishRepo();

  const explicitConfig = {
    taskStore: { provider: "github" },
    github: { repo: "org/testrepo" },
    ghExec: mockGhExec(7)
  };
  const backCompatConfig = {
    github: { enabled: true, repo: "org/testrepo" },
    ghExec: mockGhExec(7)
  };

  const explicitResult = await publishFeatureViaProvider(explicit.repo, "FEAT-001", explicitConfig);
  const backCompatResult = await publishFeatureViaProvider(
    backCompat.repo,
    "FEAT-001",
    backCompatConfig
  );

  assert.deepEqual(explicitResult, backCompatResult);
  assert.equal(explicitResult.issueNum, 7);
});

test("AC-5: github feat-publish subcommand — explicit provider vs back-compat resolution both publish", async () => {
  const explicit = await tmpPublishRepo();
  const backCompat = await tmpPublishRepo();

  const explicitConfig = {
    taskStore: { provider: "github" },
    github: { repo: "org/testrepo" },
    ghExec: mockGhExec(21)
  };
  const backCompatConfig = {
    github: { enabled: true, repo: "org/testrepo" },
    ghExec: mockGhExec(21)
  };

  const explicitResult = await runGithubSubcommand(
    explicit.repo,
    ["feat-publish"],
    { id: "FEAT-001" },
    explicitConfig
  );
  const backCompatResult = await runGithubSubcommand(
    backCompat.repo,
    ["feat-publish"],
    { id: "FEAT-001" },
    backCompatConfig
  );

  assert.deepEqual(explicitResult, backCompatResult);
});
