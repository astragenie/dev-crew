// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { detectRepo } from "../scripts/lib/github-sync/repo-detect.mjs";

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

import { extractSection, diffBody, patchBody } from "../scripts/lib/github-sync/body-diff.mjs";

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

import { upsertMilestone } from "../scripts/lib/github-sync/milestone-sync.mjs";

// --- milestone-sync ---

test("upsertMilestone returns existing milestone number when title matches", () => {
  const calls = [];
  const ghExec = (args) => {
    calls.push(args);
    return JSON.stringify([{ number: 3, title: "Phase 1" }, { number: 4, title: "Phase 2" }]);
  };
  const num = upsertMilestone("org/repo", { title: "Phase 1" }, { ghExec });
  assert.equal(num, 3);
  assert.equal(calls.length, 1); // only the list call, no POST
});

test("upsertMilestone creates milestone when not found, returns new number", () => {
  let callCount = 0;
  const ghExec = (args) => {
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

import { ensureLabels, createFeatureIssue, updateIssueStatus, closeIssue } from "../scripts/lib/github-sync/issue-sync.mjs";

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
  assert.ok(issueCreateCall.some((a) => String(a).includes("FEAT-001")), "title should contain FEAT-001");
});

test("createFeatureIssue skips creation when github_issue already set", () => {
  const calls = [];
  const ghExec = (args) => { calls.push(args); return ""; };
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
  const ghExec = (args) => { calls.push(args); return ""; };
  updateIssueStatus("org/repo", 42, "in-progress", { ghExec });
  const editCall = calls.find((c) => c[0] === "issue" && c[1] === "edit");
  assert.ok(editCall, "should call gh issue edit");
  assert.ok(editCall.includes("--add-label"), "should add new status label");
});

test("closeIssue calls gh issue close", () => {
  const calls = [];
  const ghExec = (args) => { calls.push(args); return ""; };
  closeIssue("org/repo", 42, { ghExec });
  assert.ok(calls.some((c) => c[0] === "issue" && c[1] === "close" && c.includes("42")));
});

import { createSliceIssue, attachSubIssue, closeSliceIssue } from "../scripts/lib/github-sync/subissue-sync.mjs";

// --- subissue-sync ---

test("createSliceIssue returns existing github_issue when already set", () => {
  const calls = [];
  const ghExec = (args) => { calls.push(args); return ""; };
  const slice = { id: "SLICE-01", frontmatter: { github_issue: 87 }, body: "## Objective\n\nDo it.\n" };
  const num = createSliceIssue("org/repo", slice, { ghExec });
  assert.equal(num, 87);
  assert.equal(calls.length, 0);
});

test("createSliceIssue creates issue and returns number", () => {
  let callCount = 0;
  const ghExec = (args) => {
    callCount++;
    if (args[0] === "label" && args[1] === "list") return JSON.stringify([{ name: "slice" }, { name: "status:pending" }]);
    return "https://github.com/org/repo/issues/55\n";
  };
  const slice = { id: "SLICE-03", frontmatter: {}, body: "## Objective\n\nBuild feature.\n" };
  const num = createSliceIssue("org/repo", slice, { ghExec });
  assert.equal(num, 55);
});

test("attachSubIssue calls sub_issues API with correct body", () => {
  const calls = [];
  const ghExec = (args) => { calls.push(args); return JSON.stringify({ id: 1 }); };
  attachSubIssue("org/repo", 42, 55, { ghExec });
  const apiCall = calls[0];
  assert.ok(apiCall.includes("repos/org/repo/issues/42/sub_issues"));
  assert.ok(apiCall.includes("55"));
});

test("closeSliceIssue closes the issue and updates label", () => {
  const calls = [];
  const ghExec = (args) => { calls.push(args); return ""; };
  closeSliceIssue("org/repo", 55, { ghExec });
  assert.ok(calls.some((c) => c[0] === "issue" && c[1] === "close"));
});

import { buildSliceComment, postComment } from "../scripts/lib/github-sync/comment-sync.mjs";

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
  const ghExec = (args) => { calls.push(args); return ""; };
  postComment("org/repo", 42, "hello comment", { ghExec });
  const call = calls[0];
  assert.ok(call[0] === "issue" && call[1] === "comment");
  assert.ok(call.includes("42"));
  assert.ok(call.includes("hello comment"));
});
