// @ts-nocheck
// runner#427 — code-enforced tracker issue-close, integration coverage.
//
// slice-complete.test.mts already covers the local file-move ceremony.
// These tests exercise the new wiring end-to-end through completeSlice():
// a FEAT with a `github_issue` that transitions in-progress -> done during
// the ceremony must result in a `gh issue close` call against that issue,
// routed exclusively through GithubProvider (the existing TaskStoreProvider
// abstraction — no hand-rolled gh calls added by this fix). A FEAT with no
// github_issue, or an unconfigured taskStore (the default), must make zero
// gh calls and must not fail the ceremony.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { mergeFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY, initGitRepo } from "./_fixtures.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  await initGitRepo(repo);
  return repo;
}

function mockGhExec(calls) {
  return (args) => {
    calls.push(args);
    if (args[0] === "--version") return "gh version 2.0.0";
    if (args[0] === "label" && args[1] === "list") return "[]";
    if (args[0] === "issue" && args[1] === "close") return "";
    if (args[0] === "issue" && args[1] === "edit") return "";
    if (args[0] === "issue" && args[1] === "comment") return "";
    return "";
  };
}

test("completeSlice closes the FEAT's github_issue via the TaskStoreProvider when the feature rolls to done", async () => {
  const repo = await tmpRepo("al-tracker-close-");
  const feat = await addFeature(repo, { title: "Tracked work", body: AC_SECTION_BODY });
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    mergeFrontmatter(featContent, {
      github_issue: 438,
      github_url: "https://github.com/org/repo/issues/438"
    })
  );
  const { slice } = await sliceFromFeature(repo, feat.id);

  const calls = [];
  const config = {
    preset: "dotnet-python",
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations"
    },
    stack: {},
    taskStore: { provider: "github" },
    github: { repo: "org/repo" },
    ghExec: mockGhExec(calls)
  };

  const result = await completeSlice(repo, slice.id, {
    config,
    skipValidationCheck: "test-fixture: gate not under test"
  });

  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);

  const closeCall = calls.find((a) => a[0] === "issue" && a[1] === "close");
  assert.ok(closeCall, `expected a "gh issue close" call, got: ${JSON.stringify(calls)}`);
  assert.ok(closeCall.includes("438"), `close call must target issue 438, got: ${closeCall}`);

  assert.equal(result.trackerSync.feature.attempted, true);
  assert.equal(result.trackerSync.feature.ok, true);
  assert.equal(result.trackerSync.feature.externalId, 438);
});

test("completeSlice makes zero gh calls when the FEAT has no github_issue", async () => {
  const repo = await tmpRepo("al-tracker-close-none-");
  const feat = await addFeature(repo, { title: "Untracked work", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);

  const calls = [];
  const config = {
    preset: "dotnet-python",
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations"
    },
    stack: {},
    taskStore: { provider: "github" },
    github: { repo: "org/repo" },
    ghExec: mockGhExec(calls)
  };

  const result = await completeSlice(repo, slice.id, {
    config,
    skipValidationCheck: "test-fixture: gate not under test"
  });

  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(calls.length, 0, `expected zero gh calls, got: ${JSON.stringify(calls)}`);
  assert.equal(result.trackerSync.feature.attempted, false);
});

test("completeSlice does not re-close the FEAT issue on an idempotent re-run (already done)", async () => {
  const repo = await tmpRepo("al-tracker-close-idem-");
  const feat = await addFeature(repo, { title: "Idempotent tracked work", body: AC_SECTION_BODY });
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(feat.filePath, mergeFrontmatter(featContent, { github_issue: 99 }));
  const { slice } = await sliceFromFeature(repo, feat.id);

  const calls = [];
  const config = {
    preset: "dotnet-python",
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations"
    },
    stack: {},
    taskStore: { provider: "github" },
    github: { repo: "org/repo" },
    ghExec: mockGhExec(calls)
  };

  await completeSlice(repo, slice.id, {
    config,
    skipValidationCheck: "test-fixture: gate not under test"
  });
  const firstCloseCalls = calls.filter((a) => a[0] === "issue" && a[1] === "close").length;
  assert.equal(firstCloseCalls, 1);

  const second = await completeSlice(repo, slice.id, {
    config,
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.ok(second.feature.alreadyDone);
  const totalCloseCalls = calls.filter((a) => a[0] === "issue" && a[1] === "close").length;
  assert.equal(totalCloseCalls, 1, "must not re-close an already-done feature's tracker issue");
  assert.equal(second.trackerSync.feature.attempted, false);
});

test("completeSlice close ceremony still succeeds when the tracker provider throws (soft-fail)", async () => {
  const repo = await tmpRepo("al-tracker-close-softfail-");
  const feat = await addFeature(repo, { title: "Tracker outage", body: AC_SECTION_BODY });
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(feat.filePath, mergeFrontmatter(featContent, { github_issue: 7 }));
  const { slice } = await sliceFromFeature(repo, feat.id);

  const config = {
    preset: "dotnet-python",
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations"
    },
    stack: {},
    taskStore: { provider: "github" },
    github: { repo: "org/repo" },
    // gh is "installed" (--version succeeds) but every issue operation fails
    // — simulates an auth/network outage rather than a missing CLI (which
    // GithubProvider already no-ops on via _isInstalled()).
    ghExec: (args) => {
      if (args[0] === "--version") return "gh version 2.0.0";
      if (args[0] === "label" && args[1] === "list") return "[]";
      throw new Error("connection refused");
    }
  };

  let result;
  await assert.doesNotReject(async () => {
    result = await completeSlice(repo, slice.id, {
      config,
      skipValidationCheck: "test-fixture: gate not under test"
    });
  });

  // Local close is authoritative regardless of tracker outage.
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(result.trackerSync.feature.attempted, true);
  assert.equal(result.trackerSync.feature.ok, false);
  assert.match(result.trackerSync.feature.error, /connection refused/);
});
