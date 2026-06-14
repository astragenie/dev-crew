// @ts-nocheck
import { test } from "bun:test";
// Re-enabled 2026-06-14: @integration tests run wherever GITHUB_TOKEN or
// `gh auth` is available. CI provides GITHUB_TOKEN automatically.
import assert from "node:assert/strict";
import { detectRepo } from "../../scripts/lib/github-sync/repo-detect.mjs";

// --- repo-detect ---

test("detectRepo returns override when set", () => {
  assert.equal(detectRepo("org/myrepo", "/any"), "org/myrepo");
});

test("detectRepo parses SSH remote URL", () => {
  const mockGit = () => "git@github.com:acme/widget.git";
  assert.equal(detectRepo(null, "/repo", { gitExec: mockGit }), "acme/widget");
});

test("detectRepo parses HTTPS remote URL with .git suffix", () => {
  const mockGit = () => "https://github.com/acme/widget.git";
  assert.equal(detectRepo(null, "/repo", { gitExec: mockGit }), "acme/widget");
});

test("detectRepo parses HTTPS remote URL without .git suffix", () => {
  const mockGit = () => "https://github.com/acme/widget";
  assert.equal(detectRepo(null, "/repo", { gitExec: mockGit }), "acme/widget");
});

test("detectRepo throws on unrecognised remote URL", () => {
  const mockGit = () => "https://gitlab.com/acme/widget.git";
  assert.throws(() => detectRepo(null, "/repo", { gitExec: mockGit }), /Cannot parse GitHub repo/);
});

import { extractSection, diffBody, patchBody } from "../../scripts/lib/github-sync/body-diff.mjs";

// --- body-diff ---

const LOCAL_FEAT = `---
id: FEAT-001
status: triaged
updated: 2026-01-01
---

## Description

Original description text.

## Acceptance criteria

- [ ] AC-1: Must do X

## Notes

Some notes.
`;

const GH_BODY_UNCHANGED = `## Description

Original description text.

## Acceptance criteria

- [ ] AC-1: Must do X
`;

const GH_BODY_AC_CHANGED = `## Description

Original description text.

## Acceptance criteria

- [ ] AC-1: Must do X
- [ ] AC-2: Must also do Y
`;

test("extractSection returns content between heading and next heading", () => {
  const result = extractSection(GH_BODY_AC_CHANGED, "## Description");
  assert.equal(result, "Original description text.");
});

test("extractSection returns null when heading not found", () => {
  assert.equal(extractSection("## Other\n\nstuff", "## Description"), null);
});

test("diffBody reports no changes when content is identical", () => {
  const { changed, changes } = diffBody(LOCAL_FEAT, GH_BODY_UNCHANGED);
  assert.equal(changed, false);
  assert.deepEqual(changes, []);
});

test("diffBody detects changed acceptance criteria", () => {
  const { changed, changes } = diffBody(LOCAL_FEAT, GH_BODY_AC_CHANGED);
  assert.equal(changed, true);
  assert.ok(changes.includes("acceptance-criteria"));
});

test("patchBody updates AC section and updated date in frontmatter", () => {
  const patched = patchBody(LOCAL_FEAT, GH_BODY_AC_CHANGED, "2026-06-01");
  assert.ok(patched.includes("AC-2: Must also do Y"));
  assert.ok(patched.includes("updated: 2026-06-01"));
});

test("patchBody does not touch frontmatter fields other than updated", () => {
  const patched = patchBody(LOCAL_FEAT, GH_BODY_AC_CHANGED, "2026-06-01");
  assert.ok(patched.includes("id: FEAT-001"));
  assert.ok(patched.includes("status: triaged"));
});

import { upsertMilestone } from "../../scripts/lib/github-sync/milestone-sync.mjs";

// --- milestone-sync ---

test("upsertMilestone returns existing milestone number when title matches", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return JSON.stringify([
      { number: 3, title: "Phase 1" },
      { number: 4, title: "Phase 2" }
    ]);
  };
  const num = upsertMilestone("org/repo", { title: "Phase 1" }, { ghExec });
  assert.equal(num, 3);
  assert.equal(calls.length, 1); // only the list call, no POST
});

test("upsertMilestone creates milestone when not found, returns new number", () => {
  let callCount = 0;
  const ghExec = (_args) => {
    callCount++;
    if (callCount === 1) return JSON.stringify([]); // list returns empty
    return JSON.stringify({ number: 7, title: "Phase 3" }); // POST returns new
  };
  const num = upsertMilestone("org/repo", { title: "Phase 3" }, { ghExec });
  assert.equal(num, 7);
  assert.equal(callCount, 2);
});

test("upsertMilestone includes due_on when dueOn provided", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    if (calls.length === 1) return JSON.stringify([]);
    return JSON.stringify({ number: 5, title: "Phase 4" });
  };
  upsertMilestone("org/repo", { title: "Phase 4", dueOn: "2026-09-01" }, { ghExec });
  const postCall = calls[1];
  assert.ok(postCall.includes("due_on=2026-09-01T00:00:00Z"));
});

import {
  createFeatureIssue,
  updateIssueStatus,
  closeIssue
} from "../../scripts/lib/github-sync/issue-sync.mjs";

// --- issue-sync ---

test("createFeatureIssue calls gh with title, body, labels, milestone and returns issue number", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    // First call = ensureLabels list check, returns empty array per label
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([]);
    // label create calls return empty
    if (args[0] === "label" && args[1] === "create") return "";
    // issue create returns URL
    return "https://github.com/org/repo/issues/42\n";
  };
  const feat = {
    id: "FEAT-001",
    frontmatter: { priority: "P1", category: "integration", autonomous_safe: true, phase: "1" },
    body: "## Description\n\nDo a thing.\n\n## Acceptance criteria\n\n- [ ] AC-1: It works\n"
  };
  const num = createFeatureIssue("org/repo", feat, 3, { ghExec });
  assert.equal(num, 42);
  const issueCreateCall = calls.find((c) => c[0] === "issue" && c[1] === "create");
  assert.ok(issueCreateCall, "should call gh issue create");
  assert.ok(issueCreateCall.includes("--title"), "should include title flag");
  assert.ok(
    issueCreateCall.some((a) => String(a).includes("FEAT-001")),
    "title should contain FEAT-001"
  );
});

test("createFeatureIssue skips creation when github_issue already set", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const feat = {
    id: "FEAT-001",
    frontmatter: { github_issue: 42 },
    body: ""
  };
  const num = createFeatureIssue("org/repo", feat, null, { ghExec });
  assert.equal(num, 42);
  assert.equal(calls.length, 0);
});

test("updateIssueStatus removes old status label and adds new one", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  updateIssueStatus("org/repo", 42, "in-progress", { ghExec });
  const editCall = calls.find((c) => c[0] === "issue" && c[1] === "edit");
  assert.ok(editCall, "should call gh issue edit");
  assert.ok(editCall.includes("--add-label"), "should add new status label");
});

test("closeIssue calls gh issue close", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  closeIssue("org/repo", 42, { ghExec });
  assert.ok(calls.some((c) => c[0] === "issue" && c[1] === "close" && c.includes("42")));
});

import {
  createSliceIssue,
  attachSubIssue,
  closeSliceIssue
} from "../../scripts/lib/github-sync/subissue-sync.mjs";

// --- subissue-sync ---

test("createSliceIssue returns existing github_issue when already set", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const slice = {
    id: "SLICE-01",
    frontmatter: { github_issue: 87 },
    body: "## Objective\n\nDo it.\n"
  };
  const num = createSliceIssue("org/repo", slice, { ghExec });
  assert.equal(num, 87);
  assert.equal(calls.length, 0);
});

test("createSliceIssue creates issue and returns number", () => {
  const ghExec = (args) => {
    if (args[0] === "label" && args[1] === "list")
      return JSON.stringify([{ name: "slice" }, { name: "status:pending" }]);
    return "https://github.com/org/repo/issues/55\n";
  };
  const slice = { id: "SLICE-03", frontmatter: {}, body: "## Objective\n\nBuild feature.\n" };
  const num = createSliceIssue("org/repo", slice, { ghExec });
  assert.equal(num, 55);
});

test("attachSubIssue fetches numeric id via REST then calls sub_issues API with version header", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    // gh api repos/.../issues/55 returns full issue JSON with numeric id
    if (args[0] === "api" && String(args[1]).includes("/issues/55"))
      return JSON.stringify({ id: 2794530182, number: 55 });
    return JSON.stringify({ id: 1 });
  };
  attachSubIssue("org/repo", 42, 55, { ghExec });
  const lookupCall = calls[0];
  const apiCall = calls[1];
  assert.ok(String(lookupCall[1]).includes("issues/55"), "should look up child issue via REST");
  assert.ok(
    apiCall.includes("repos/org/repo/issues/42/sub_issues"),
    "should call sub_issues endpoint"
  );
  assert.ok(
    apiCall.some((a) => String(a).includes("2794530182")),
    "should use numeric database id"
  );
  assert.ok(
    apiCall.some((a) => String(a).includes("X-GitHub-Api-Version")),
    "should pass api version header"
  );
});

test("closeSliceIssue closes the issue and updates label", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  closeSliceIssue("org/repo", 55, { ghExec });
  assert.ok(calls.some((c) => c[0] === "issue" && c[1] === "close"));
});

import { buildSliceComment, postComment } from "../../scripts/lib/github-sync/comment-sync.mjs";

// --- comment-sync ---

test("buildSliceComment renders all-pass table", () => {
  const comment = buildSliceComment({
    sliceId: "SLICE-05",
    objective: "Add health endpoint",
    validationSatisfied: true,
    reviewStatus: "Approved",
    costStr: "~$0.42 (42k tokens)",
    artifactPath: ".claude/artifacts/crew/runs/final-synthesis-feat012-slice05.md"
  });
  assert.ok(comment.includes("SLICE-05 Complete"));
  assert.ok(comment.includes("Add health endpoint"));
  assert.ok(comment.includes("✅"));
  assert.ok(comment.includes("Approved"));
  assert.ok(comment.includes("~$0.42"));
  assert.ok(comment.includes("final-synthesis-feat012-slice05.md"));
});

test("buildSliceComment renders failed outcome when validation not satisfied", () => {
  const comment = buildSliceComment({
    sliceId: "SLICE-06",
    objective: "Fix auth bug",
    validationSatisfied: false,
    reviewStatus: "Needs fix",
    costStr: null,
    artifactPath: null
  });
  assert.ok(comment.includes("❌"));
  assert.ok(comment.includes("Needs fix"));
});

test("postComment calls gh issue comment with correct args", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  postComment("org/repo", 42, "hello comment", { ghExec });
  const call = calls[0];
  assert.ok(call[0] === "issue" && call[1] === "comment");
  assert.ok(call.includes("42"));
  assert.ok(call.includes("hello comment"));
});

import {
  publishAll,
  publishFeat,
  publishSlice,
  syncPull,
  postSliceComment
} from "../../scripts/lib/github-sync.mjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function tmpSyncRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "gh-sync-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ github: { enabled: false, repo: null } })
  );
  return repo;
}

// --- github-sync public API ---

test("publishAll is no-op when github.enabled is false", async () => {
  const repo = await tmpSyncRepo();
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  await publishAll(repo, { ghExec });
  assert.equal(calls.length, 0);
});

test("postSliceComment is no-op when github.enabled is false", async () => {
  const repo = await tmpSyncRepo();
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  await postSliceComment(
    repo,
    "SLICE-01",
    { featureId: null, sliceFm: {}, validationGate: null, costReport: null, synthPath: null },
    { ghExec }
  );
  assert.equal(calls.length, 0);
});

test("syncPull is no-op when github.enabled is false", async () => {
  const repo = await tmpSyncRepo();
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const result = await syncPull(repo, { ghExec });
  assert.equal(calls.length, 0);
  assert.deepEqual(result, { checked: 0, updated: 0, changes: [] });
});

import { bootstrapFromGithub } from "../../scripts/lib/github-sync.mjs";
// Note: fs, path, os are already imported earlier in this file

async function tmpBootstrapRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "gh-bootstrap-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    // repo: "org/testrepo" avoids git remote lookup in tests
    JSON.stringify({ github: { enabled: true, repo: "org/testrepo" } })
  );
  return repo;
}

// --- github bootstrap ---

test("bootstrapFromGithub is no-op when github.enabled is false", async () => {
  const repo = await tmpSyncRepo(); // enabled: false
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "[]";
  };
  const result = await bootstrapFromGithub(repo, { ghExec });
  assert.equal(calls.length, 0);
  assert.deepEqual(result, { created: 0, skipped: 0, featIds: [] });
});

test("bootstrapFromGithub creates FEAT file from GitHub issue", async () => {
  const repo = await tmpBootstrapRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([
        {
          number: 42,
          title: "Add health endpoint",
          body: "Returns 200 with uptime.",
          labels: [{ name: "priority:P1" }, { name: "category:integration" }],
          milestone: { title: "Phase 2", number: 2 }
        }
      ]);
    return "";
  };
  const result = await bootstrapFromGithub(repo, { ghExec });
  assert.equal(result.created, 1);
  assert.equal(result.skipped, 0);
  assert.equal(result.featIds[0], "FEAT-001");
  const content = await fs.readFile(
    path.join(repo, ".claude/artifacts/loop/backlog/triaged/FEAT-001.md"),
    "utf8"
  );
  assert.ok(content.includes("github_issue: 42"), "should set github_issue");
  assert.ok(content.includes("priority: P1"), "should parse priority label");
  assert.ok(content.includes("category: integration"), "should parse category label");
  assert.ok(content.includes("phase: 2"), "should parse milestone as phase");
  assert.ok(content.includes("Add health endpoint"), "should include issue title");
  assert.ok(
    content.includes("github_url:") &&
      content.includes("https://github.com/org/testrepo/issues/42"),
    "should persist github_url composed from repo + issue number"
  );
});

test("bootstrapFromGithub skips issues already linked to a local FEAT", async () => {
  const repo = await tmpBootstrapRepo();
  // Pre-create a FEAT that already links issue #42
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/done");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    "---\nid: FEAT-001\nstatus: done\ngithub_issue: 42\n---\n## Description\n\nExisting.\n"
  );
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([
        { number: 42, title: "Existing", body: "", labels: [], milestone: null }
      ]);
    return "";
  };
  const result = await bootstrapFromGithub(repo, { ghExec });
  assert.equal(result.created, 0);
  assert.equal(result.skipped, 1);
});

test("bootstrapFromGithub skips issues labeled slice", async () => {
  const repo = await tmpBootstrapRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "issue" && args[1] === "list")
      return JSON.stringify([
        {
          number: 10,
          title: "SLICE-01: Do work",
          body: "",
          labels: [{ name: "slice" }],
          milestone: null
        }
      ]);
    return "";
  };
  const result = await bootstrapFromGithub(repo, { ghExec });
  assert.equal(result.created, 0);
  assert.equal(result.skipped, 0); // filtered before skip check
});

// --- publishAll: github_url persistence ---

async function tmpPublishRepo({ featBody = "## Description\n\nNew thing.\n", featFm = "" } = {}) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "gh-publish-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ github: { enabled: true, repo: "org/testrepo" } })
  );
  const triagedDir = path.join(repo, ".claude/artifacts/loop/backlog/triaged");
  await fs.mkdir(triagedDir, { recursive: true });
  await fs.writeFile(
    path.join(triagedDir, "FEAT-001.md"),
    `---\nid: FEAT-001\nstatus: triaged\npriority: P2\n${featFm}---\n${featBody}`
  );
  return { repo, featPath: path.join(triagedDir, "FEAT-001.md") };
}

test("publishAll persists github_url alongside github_issue when creating a new feature issue", async () => {
  const { repo, featPath } = await tmpPublishRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([]);
    if (args[0] === "label" && args[1] === "create") return "";
    if (args[0] === "issue" && args[1] === "create")
      return "https://github.com/org/testrepo/issues/77\n";
    return "";
  };
  await publishAll(repo, { ghExec });
  const content = await fs.readFile(featPath, "utf8");
  assert.ok(content.includes("github_issue: 77"), "writes issue number");
  assert.ok(
    content.includes("https://github.com/org/testrepo/issues/77"),
    "writes github_url composed from repo + issue number"
  );
});

test("publishAll backfills github_url on FEATs that already have github_issue but no URL", async () => {
  const { repo, featPath } = await tmpPublishRepo({
    featFm: "github_issue: 25\n"
  });
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    return "";
  };
  await publishAll(repo, { ghExec });
  const content = await fs.readFile(featPath, "utf8");
  assert.ok(content.includes("github_issue: 25"), "preserves existing issue number");
  assert.ok(
    content.includes("https://github.com/org/testrepo/issues/25"),
    "backfills github_url for previously published FEAT"
  );
});

test("publishAll leaves github_url untouched when already set", async () => {
  const { repo, featPath } = await tmpPublishRepo({
    featFm: 'github_issue: 25\ngithub_url: "https://github.com/org/testrepo/issues/25"\n'
  });
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    return "";
  };
  await publishAll(repo, { ghExec });
  const content = await fs.readFile(featPath, "utf8");
  assert.ok(content.includes("https://github.com/org/testrepo/issues/25"));
  // Idempotency: only one URL line for the feature.
  const matches = content.match(/github_url:/g) || [];
  assert.equal(matches.length, 1, "github_url should appear exactly once after re-run");
});

// --- publishFeat ---

test("publishFeat returns null when github.enabled is false", async () => {
  const repo = await tmpSyncRepo(); // enabled: false
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const result = await publishFeat(repo, "FEAT-001", { ghExec });
  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("publishFeat creates issue and writes frontmatter on new FEAT", async () => {
  const { repo, featPath } = await tmpPublishRepo();
  const ghExec = (args) => {
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([]);
    if (args[0] === "label" && args[1] === "create") return "";
    if (args[0] === "issue" && args[1] === "create")
      return "https://github.com/org/testrepo/issues/99\n";
    return "";
  };
  const result = await publishFeat(repo, "FEAT-001", { ghExec });
  assert.equal(result.created, true);
  assert.equal(result.issueNum, 99);
  assert.equal(result.url, "https://github.com/org/testrepo/issues/99");
  const content = await fs.readFile(featPath, "utf8");
  assert.ok(content.includes("github_issue: 99"), "writes github_issue");
  assert.ok(content.includes("https://github.com/org/testrepo/issues/99"), "writes github_url");
});

test("publishFeat is idempotent when github_issue already set", async () => {
  const { repo } = await tmpPublishRepo({
    featFm: 'github_issue: 55\ngithub_url: "https://github.com/org/testrepo/issues/55"\n'
  });
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const result = await publishFeat(repo, "FEAT-001", { ghExec });
  assert.equal(result.created, false);
  assert.equal(result.issueNum, 55);
  assert.equal(calls.length, 0, "no gh calls when already published");
});

test("publishFeat throws when github enabled but gh not installed", async () => {
  const { repo } = await tmpPublishRepo();
  const ghExec = (_args) => {
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  };
  await assert.rejects(() => publishFeat(repo, "FEAT-001", { ghExec }), /gh CLI not found/);
});

// --- publishSlice ---

async function tmpSliceRepo() {
  const { repo, featPath } = await tmpPublishRepo({
    featFm: "slices: [SLICE-01]\n"
  });
  const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(slicesDir, { recursive: true });
  const slicePath = path.join(slicesDir, "SLICE_01_DO-THING.md");
  await fs.writeFile(
    slicePath,
    "---\nid: SLICE-01\nstatus: pending\nfeature: FEAT-001\n---\n## Objective\n\nDo thing.\n"
  );
  return { repo, featPath, slicePath };
}

test("publishSlice returns null when github.enabled is false", async () => {
  const repo = await tmpSyncRepo();
  const result = await publishSlice(repo, "SLICE-01", "FEAT-001", { ghExec: () => "" });
  assert.equal(result, null);
});

test("publishSlice creates FEAT issue + SLICE sub-issue and writes frontmatter on both", async () => {
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
  const result = await publishSlice(repo, "SLICE-01", "FEAT-001", { ghExec });
  assert.equal(result.created, true);
  assert.equal(result.issueNum, 11);
  const featContent = await fs.readFile(featPath, "utf8");
  assert.ok(featContent.includes("github_issue: 10"), "FEAT gets github_issue");
  const sliceContent = await fs.readFile(slicePath, "utf8");
  assert.ok(sliceContent.includes("github_issue: 11"), "SLICE gets github_issue");
  assert.ok(
    sliceContent.includes("https://github.com/org/testrepo/issues/11"),
    "SLICE gets github_url"
  );
});

test("publishSlice is idempotent when slice github_issue already set", async () => {
  const { repo } = await tmpPublishRepo({
    featFm:
      'github_issue: 10\ngithub_url: "https://github.com/org/testrepo/issues/10"\nslices: [SLICE-01]\n'
  });
  const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(slicesDir, { recursive: true });
  await fs.writeFile(
    path.join(slicesDir, "SLICE_01_DO-THING.md"),
    '---\nid: SLICE-01\nstatus: pending\nfeature: FEAT-001\ngithub_issue: 77\ngithub_url: "https://github.com/org/testrepo/issues/77"\n---\n## Objective\n\nDo thing.\n'
  );
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return "";
  };
  const result = await publishSlice(repo, "SLICE-01", "FEAT-001", { ghExec });
  assert.equal(result.created, false);
  assert.equal(result.issueNum, 77);
  assert.ok(!calls.some((c) => c[0] === "issue" && c[1] === "create"), "no issue create calls");
});

import { truncateTitle } from "../../scripts/lib/github-sync/issue-sync.mjs";

// --- truncateTitle ---

test("truncateTitle leaves short titles untouched", () => {
  assert.equal(truncateTitle("FEAT-001: Short title"), "FEAT-001: Short title");
});

test("truncateTitle leaves a 256-char title untouched", () => {
  const title = "x".repeat(256);
  assert.equal(truncateTitle(title), title);
});

test("truncateTitle clamps over-limit titles to 256 chars with ellipsis", () => {
  const result = truncateTitle("x".repeat(300));
  assert.equal(result.length, 256);
  assert.ok(result.endsWith("…"));
});

// --- createSliceIssue title resolution (frontmatter -> H1 -> id) ---

function captureIssueCreateTitle(slice) {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([{ name: "slice" }]);
    return "https://github.com/org/repo/issues/60\n";
  };
  createSliceIssue("org/repo", slice, { ghExec });
  const createCall = calls.find((c) => c[0] === "issue" && c[1] === "create");
  return createCall[createCall.indexOf("--title") + 1];
}

test("createSliceIssue uses frontmatter title over H1 and Objective", () => {
  const title = captureIssueCreateTitle({
    id: "SLICE-07",
    frontmatter: { title: "Frontmatter title" },
    body: "# SLICE-07: H1 title\n\n## Objective\n\nVery long objective paragraph.\n"
  });
  assert.equal(title, "SLICE-07: Frontmatter title");
});

test("createSliceIssue falls back to H1 — never the Objective first line", () => {
  const title = captureIssueCreateTitle({
    id: "SLICE-08",
    frontmatter: {},
    body: `# SLICE-08: H1 title\n\n## Objective\n\n${"long objective ".repeat(100)}\n`
  });
  assert.equal(title, "SLICE-08: H1 title");
});

test("createSliceIssue title stays within GitHub's 256-char limit", () => {
  const title = captureIssueCreateTitle({
    id: "SLICE-09",
    frontmatter: { title: "t".repeat(400) },
    body: ""
  });
  assert.ok(title.length <= 256);
});
