// @ts-nocheck
// Phase 4.5 of the tracker-provider plan — wire the existing (write-capable)
// syncPull/bootstrap primitives behind a NEW, provably read-only advisory
// drift check. See checkSyncDrift in scripts/lib/github-sync.mjs: it reuses
// syncPull's read-side building blocks (listBacklog, ghExec issue list,
// diffBody) but never calls patchBody or fs.writeFile — patchBody/writeFile
// are exercised only by the pre-existing syncPull/bootstrapFromGithub tests
// in github-sync.test.mts, which this file intentionally does not touch.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { checkSyncDrift } from "../../scripts/lib/github-sync.mjs";
import { GithubProvider } from "../scripts/lib/task-store/providers/github-provider.mjs";
import { LinearProvider } from "../scripts/lib/task-store/providers/linear-provider.mjs";
import { NoopProvider } from "../scripts/lib/task-store/providers/noop-provider.mjs";
import { runGithubSubcommand } from "../scripts/loop.mjs";

async function tmpDriftRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "gh-drift-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ github: { enabled: true, repo: "org/testrepo" } })
  );
  return repo;
}

async function writeFeat(repo, id, { state = "done", body, extraFm = "" } = {}) {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(
    filePath,
    `---\nid: ${id}\n${extraFm}---\n${body ?? "## Description\n\nOriginal text.\n\n## Acceptance criteria\n\n- [ ] AC-1: Must do X\n"}`
  );
  return filePath;
}

// ---------------------------------------------------------------------------
// checkSyncDrift — soft-fail / disabled paths (mirrors syncPull's own tests)
// ---------------------------------------------------------------------------

test("checkSyncDrift returns supported:true, empty report when github.enabled is false", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "gh-drift-off-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ github: { enabled: false, repo: null } })
  );
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const result = await checkSyncDrift(repo, { ghExec });
  assert.equal(calls.length, 0, "no gh calls when disabled");
  assert.deepEqual(result, {
    supported: true,
    reason: "github.enabled is false",
    checked: 0,
    trackerOnly: [],
    localOnly: [],
    statusMismatches: [],
    bodyDrift: []
  });
});

test("checkSyncDrift returns supported:false-shaped report when gh CLI is not installed", async () => {
  const repo = await tmpDriftRepo();
  const ghExec = () => {
    throw new Error("ENOENT: gh not found");
  };
  const result = await checkSyncDrift(repo, { ghExec });
  assert.equal(result.reason, "gh CLI not installed");
  assert.deepEqual(result.trackerOnly, []);
  assert.deepEqual(result.localOnly, []);
});

// ---------------------------------------------------------------------------
// checkSyncDrift — never writes to the local backlog (the hard constraint)
// ---------------------------------------------------------------------------

test("checkSyncDrift never mutates the local FEAT file even when body drift is detected", async () => {
  const repo = await tmpDriftRepo();
  const featPath = await writeFeat(repo, "FEAT-001", {
    state: "done",
    extraFm: "github_issue: 42\n"
  });
  const before = await fs.readFile(featPath, "utf8");
  const beforeStat = await fs.stat(featPath);

  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([
        {
          number: 42,
          title: "Original",
          state: "OPEN",
          body: "## Description\n\nRemote text differs.\n\n## Acceptance criteria\n\n- [ ] AC-1: Must do X\n"
        }
      ]);
    throw new Error(`unexpected ghExec call: ${JSON.stringify(args)}`);
  };

  const result = await checkSyncDrift(repo, { ghExec });

  const after = await fs.readFile(featPath, "utf8");
  const afterStat = await fs.stat(featPath);
  assert.equal(after, before, "local FEAT file content must be byte-identical after drift check");
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs, "local FEAT file must not be touched");
  assert.equal(result.bodyDrift.length, 1, "drift should still be detected and reported");
  assert.equal(result.bodyDrift[0].id, "FEAT-001");
  assert.deepEqual(result.bodyDrift[0].changes, ["description"]);
});

test("checkSyncDrift creates no new files in the local backlog tree", async () => {
  const repo = await tmpDriftRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([{ number: 99, title: "Untracked issue", state: "OPEN", body: "" }]);
    throw new Error(`unexpected ghExec call: ${JSON.stringify(args)}`);
  };

  const result = await checkSyncDrift(repo, { ghExec });

  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog");
  const exists = await fs
    .stat(backlogDir)
    .then(() => true)
    .catch(() => false);
  assert.equal(exists, false, "checkSyncDrift must not create the backlog dir or any FEAT file");
  assert.equal(result.trackerOnly.length, 1);
  assert.equal(result.trackerOnly[0].number, 99);
});

// ---------------------------------------------------------------------------
// checkSyncDrift — drift categories
// ---------------------------------------------------------------------------

test("checkSyncDrift reports an issue with no local FEAT as trackerOnly", async () => {
  const repo = await tmpDriftRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([{ number: 7, title: "New in tracker", state: "OPEN", body: "" }]);
    throw new Error("unexpected call");
  };
  const result = await checkSyncDrift(repo, { ghExec });
  assert.deepEqual(result.trackerOnly, [{ number: 7, title: "New in tracker" }]);
  assert.equal(result.checked, 0);
});

test("checkSyncDrift reports a never-published local FEAT as localOnly", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-002", { state: "triaged" }); // no github_issue set
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list") return "[]";
    throw new Error("unexpected call");
  };
  const result = await checkSyncDrift(repo, { ghExec });
  assert.equal(result.localOnly.length, 1);
  assert.equal(result.localOnly[0].id, "FEAT-002");
});

test("checkSyncDrift reports a status mismatch when local is done but tracker issue is still open", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-003", { state: "done", extraFm: "github_issue: 5\n" });
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([
        {
          number: 5,
          title: "Still open upstream",
          state: "OPEN",
          body: "## Description\n\nOriginal text.\n\n## Acceptance criteria\n\n- [ ] AC-1: Must do X\n"
        }
      ]);
    throw new Error("unexpected call");
  };
  const result = await checkSyncDrift(repo, { ghExec });
  assert.equal(result.statusMismatches.length, 1);
  assert.deepEqual(result.statusMismatches[0], {
    id: "FEAT-003",
    number: 5,
    localStatus: "done",
    trackerState: "OPEN"
  });
});

test("checkSyncDrift reports no drift for a fully in-sync linked FEAT", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-004", { state: "triaged", extraFm: "github_issue: 9\n" });
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([
        {
          number: 9,
          title: "In sync",
          state: "OPEN",
          body: "## Description\n\nOriginal text.\n\n## Acceptance criteria\n\n- [ ] AC-1: Must do X\n"
        }
      ]);
    throw new Error("unexpected call");
  };
  const result = await checkSyncDrift(repo, { ghExec });
  assert.equal(result.checked, 1);
  assert.equal(result.trackerOnly.length, 0);
  assert.equal(result.localOnly.length, 0);
  assert.equal(result.statusMismatches.length, 0);
  assert.equal(result.bodyDrift.length, 0);
});

// ---------------------------------------------------------------------------
// GithubProvider.checkDrift — delegation + soft-fail
// ---------------------------------------------------------------------------

test("GithubProvider.checkDrift soft-fails (no throw) when gh CLI is absent", async () => {
  const noGh = () => {
    throw new Error("gh not found");
  };
  const provider = new GithubProvider("/tmp/repo", { ghExec: noGh });
  const result = await provider.checkDrift("/tmp/repo");
  assert.equal(result.supported, false);
  assert.equal(result.reason, "gh CLI not installed");
  assert.deepEqual(result.trackerOnly, []);
});

test("GithubProvider.checkDrift delegates to checkSyncDrift and returns its shape", async () => {
  const repo = await tmpDriftRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([{ number: 3, title: "Tracker-only", state: "OPEN", body: "" }]);
    throw new Error("unexpected call");
  };
  const provider = new GithubProvider(repo, { ghExec, github: { repo: "org/testrepo" } });
  const result = await provider.checkDrift(repo);
  assert.equal(result.supported, true);
  assert.equal(result.trackerOnly.length, 1);
  assert.equal(result.trackerOnly[0].number, 3);
});

// ---------------------------------------------------------------------------
// CLI wiring — `loop github drift` / `loop task-store drift`
// ---------------------------------------------------------------------------

test("github drift subcommand delegates to GithubProvider.checkDrift and reports drift", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-005", { state: "triaged" }); // localOnly
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list") return "[]";
    throw new Error("unexpected call");
  };
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec };

  const result = await runGithubSubcommand(repo, ["drift"], {}, config);

  assert.equal(result.supported, true);
  assert.equal(result.localOnly.length, 1);
  assert.equal(result.localOnly[0].id, "FEAT-005");
});

test("github drift subcommand degrades gracefully (no throw) for taskStore.provider=linear (COND-C descope)", async () => {
  const repo = await tmpDriftRepo();
  const calls = [];
  const config = {
    taskStore: { provider: "linear" },
    ghExec: (args) => {
      calls.push(args);
      return "";
    }
  };

  const result = await runGithubSubcommand(repo, ["drift"], {}, config);

  assert.equal(result.supported, false);
  assert.match(result.reason, /not supported for provider "LinearProvider"/);
  assert.equal(calls.length, 0, "must make zero gh calls for a non-github provider");
});

test("github drift subcommand degrades gracefully (no throw) for taskStore.provider=noop", async () => {
  const repo = await tmpDriftRepo();
  const config = { taskStore: { provider: "noop" } };

  const result = await runGithubSubcommand(repo, ["drift"], {}, config);

  assert.equal(result.supported, false);
  assert.match(result.reason, /not supported for provider "NoopProvider"/);
});

test("github drift subcommand on fully-unconfigured repo resolves silently via NoopProvider, no throw", async () => {
  const repo = await tmpDriftRepo();
  await assert.doesNotReject(() => runGithubSubcommand(repo, ["drift"], {}, {}));
  const result = await runGithubSubcommand(repo, ["drift"], {}, {});
  assert.equal(result.supported, false);
});

// ---------------------------------------------------------------------------
// Explicit safety net: LinearProvider/NoopProvider have no checkDrift method
// at all — the CLI path degrades via `instanceof GithubProvider`, not via a
// duck-typed capability probe. Guards against a future refactor accidentally
// routing through a provider that has no read-only drift implementation.
// ---------------------------------------------------------------------------

test("LinearProvider and NoopProvider do not implement checkDrift", () => {
  const linear = new LinearProvider("/tmp/repo", {});
  const noop = new NoopProvider();
  assert.equal(typeof linear.checkDrift, "undefined");
  assert.equal(typeof noop.checkDrift, "undefined");
});
