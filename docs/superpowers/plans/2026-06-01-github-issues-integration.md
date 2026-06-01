# GitHub Issues Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in bidirectional sync between the loop's file-based artifact model and GitHub Issues — Milestones for phases, Issues for FEATs, native sub-issues for SLICEs, ceremony-driven push, pull-on-demand for PM edits.

**Architecture:** A new `scripts/lib/github-sync.mjs` public API module delegates to focused sub-modules in `scripts/lib/github-sync/`. All sub-modules accept an optional `{ ghExec }` dependency-injection hook so tests can mock the `gh` CLI without spawning real processes. All sync calls in ceremonies are wrapped in `bestEffort()` so GitHub failures never abort a slice start or close.

**Tech Stack:** Node.js ESM, `gh` CLI (GitHub's official CLI), `node:child_process` execFileSync, `node:test` + `node:assert/strict` for tests.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `scripts/lib/github-sync/gh.mjs` | Shared `ghExec` default + `isGhInstalled` |
| Create | `scripts/lib/github-sync/repo-detect.mjs` | `git remote get-url origin` → `"org/repo"` |
| Create | `scripts/lib/github-sync/body-diff.mjs` | Extract/compare/patch `## Description` + `## Acceptance criteria` sections |
| Create | `scripts/lib/github-sync/milestone-sync.mjs` | Phase ↔ GitHub Milestone upsert |
| Create | `scripts/lib/github-sync/issue-sync.mjs` | FEAT ↔ GitHub Issue CRUD + label management |
| Create | `scripts/lib/github-sync/subissue-sync.mjs` | SLICE ↔ GitHub Issue + native sub-issue attachment |
| Create | `scripts/lib/github-sync/comment-sync.mjs` | Build + post slice-complete summary comment |
| Create | `scripts/lib/github-sync.mjs` | Public API: `publishAll`, `syncPull`, `postSliceComment`, `updateIssueStatus` |
| Create | `tests/github-sync.test.mjs` | All unit tests for the above |
| Modify | `scripts/lib/slice-linker/start-slice.mjs` | Call `updateIssueStatus` after start (guarded by `github.enabled`) |
| Modify | `scripts/lib/slice-linker/complete-slice.mjs` | Call `postSliceComment` after close (guarded by `github.enabled`) |
| Modify | `.claude/loop.json` | Add `"github": { "enabled": false, "repo": null }` |
| Create | `.claude/skills/loop/publish.md` | `/loop:publish` skill |
| Create | `.claude/skills/loop/sync.md` | `/loop:sync` skill |
| Modify | `docs/code-conventions.md` | Document `github_issue` / `github_milestone` frontmatter fields |

---

## Task 1: Add github config to loop.json

**Files:**
- Modify: `.claude/loop.json`

- [ ] **Step 1: Add the github block**

Open `.claude/loop.json`. After the closing `}` of `"reviewers"`, add a new top-level key. The final file should gain:

```json
"github": {
  "enabled": false,
  "repo": null
}
```

Full updated file (add at the end, before the final `}`):

```json
{
  "preset": null,
  "loop": { ... existing ... },
  "stack": { ... existing ... },
  "reviewers": { ... existing ... },
  "mandatoryDocs": [ ... existing ... ],
  "productName": "hero-crew-autonomous-loop",
  "productDescription": "...",
  "stackDescription": "...",
  "github": {
    "enabled": false,
    "repo": null
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/loop.json','utf8')); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .claude/loop.json
git commit -m "feat(github-sync): add github config block to loop.json (disabled by default)"
```

---

## Task 2: gh.mjs shared executor + repo-detect.mjs

**Files:**
- Create: `scripts/lib/github-sync/gh.mjs`
- Create: `scripts/lib/github-sync/repo-detect.mjs`
- Create: `tests/github-sync.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `tests/github-sync.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `SyntaxError` or `ERR_MODULE_NOT_FOUND` (file doesn't exist yet).

- [ ] **Step 3: Create gh.mjs**

Create `scripts/lib/github-sync/gh.mjs`:

```js
import { execFileSync } from "node:child_process";

export const defaultGhExec = (args) =>
  execFileSync("gh", args, { encoding: "utf8" }).trim();

export function isGhInstalled({ ghExec = defaultGhExec } = {}) {
  try {
    ghExec(["--version"]);
    return true;
  } catch {
    return false;
  }
}

export function ghJson(args, { ghExec = defaultGhExec } = {}) {
  return JSON.parse(ghExec(args));
}
```

- [ ] **Step 4: Create repo-detect.mjs**

Create `scripts/lib/github-sync/repo-detect.mjs`:

```js
import { execFileSync } from "node:child_process";

const defaultGitExec = (repoPath) =>
  execFileSync("git", ["remote", "get-url", "origin"], { cwd: repoPath, encoding: "utf8" }).trim();

export function detectRepo(overrideRepo, repoPath, { gitExec = defaultGitExec } = {}) {
  if (overrideRepo) return overrideRepo;
  const url = gitExec(repoPath);
  const ssh = url.match(/git@github\.com[:/](.+?)(?:\.git)?$/);
  if (ssh) return ssh[1];
  const https = url.match(/https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (https) return https[1];
  throw new Error(`Cannot parse GitHub repo from remote URL: ${url}`);
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `5 pass, 0 fail`

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/github-sync/gh.mjs scripts/lib/github-sync/repo-detect.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): repo-detect + gh executor with tests"
```

---

## Task 3: body-diff.mjs

**Files:**
- Create: `scripts/lib/github-sync/body-diff.mjs`
- Modify: `tests/github-sync.test.mjs` (append tests)

- [ ] **Step 1: Append failing tests to github-sync.test.mjs**

```js
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
```

- [ ] **Step 2: Run tests — expect failures on body-diff imports**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` for `body-diff.mjs`

- [ ] **Step 3: Create body-diff.mjs**

Create `scripts/lib/github-sync/body-diff.mjs`:

```js
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";

export function extractSection(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  const slice = end === -1 ? lines.slice(start + 1) : lines.slice(start + 1, end);
  return slice.join("\n").trim();
}

function replaceSection(body, heading, newContent) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return body;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  const before = lines.slice(0, start + 1);
  const after = end === -1 ? [] : lines.slice(end);
  return [...before, "", newContent, ""].concat(after).join("\n");
}

function normalize(s) {
  return (s || "").replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

export function diffBody(localContent, githubBody) {
  const { body: localBody } = parseFrontmatter(localContent);
  const localDesc = extractSection(localBody, "## Description");
  const localAc = extractSection(localBody, "## Acceptance criteria");
  const ghDesc = extractSection(githubBody, "## Description");
  const ghAc = extractSection(githubBody, "## Acceptance criteria");
  const changes = [];
  if (ghDesc !== null && normalize(ghDesc) !== normalize(localDesc || "")) changes.push("description");
  if (ghAc !== null && normalize(ghAc) !== normalize(localAc || "")) changes.push("acceptance-criteria");
  return {
    changed: changes.length > 0,
    sections: { description: ghDesc, ac: ghAc },
    changes
  };
}

export function patchBody(localContent, githubBody, today) {
  const { frontmatter, body } = parseFrontmatter(localContent);
  const ghDesc = extractSection(githubBody, "## Description");
  const ghAc = extractSection(githubBody, "## Acceptance criteria");
  let newBody = body;
  if (ghDesc !== null) newBody = replaceSection(newBody, "## Description", ghDesc);
  if (ghAc !== null) newBody = replaceSection(newBody, "## Acceptance criteria", ghAc);
  return serializeFrontmatter({ ...frontmatter, updated: today }, newBody);
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `11 pass, 0 fail`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/github-sync/body-diff.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): body-diff — extract/compare/patch Description+AC sections"
```

---

## Task 4: milestone-sync.mjs

**Files:**
- Create: `scripts/lib/github-sync/milestone-sync.mjs`
- Modify: `tests/github-sync.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` for `milestone-sync.mjs`

- [ ] **Step 3: Create milestone-sync.mjs**

Create `scripts/lib/github-sync/milestone-sync.mjs`:

```js
import { defaultGhExec } from "./gh.mjs";

export function upsertMilestone(repo, { title, dueOn = null }, { ghExec = defaultGhExec } = {}) {
  const milestones = JSON.parse(ghExec(["api", `repos/${repo}/milestones`, "--paginate"]));
  const existing = milestones.find((m) => m.title === title);
  if (existing) return existing.number;
  const args = ["api", `repos/${repo}/milestones`, "--method", "POST", "-f", `title=${title}`];
  if (dueOn) args.push("-f", `due_on=${dueOn}T00:00:00Z`);
  return JSON.parse(ghExec(args)).number;
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `14 pass, 0 fail`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/github-sync/milestone-sync.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): milestone-sync — upsert GitHub milestones from phases"
```

---

## Task 5: issue-sync.mjs

**Files:**
- Create: `scripts/lib/github-sync/issue-sync.mjs`
- Modify: `tests/github-sync.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
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
  assert.ok(issueCreateCall.includes("FEAT-001"), "title should contain FEAT-001");
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` for `issue-sync.mjs`

- [ ] **Step 3: Create issue-sync.mjs**

Create `scripts/lib/github-sync/issue-sync.mjs`:

```js
import { defaultGhExec } from "./gh.mjs";

const LABEL_DEFS = [
  { name: "priority:P0", color: "b60205", description: "Highest priority" },
  { name: "priority:P1", color: "d93f0b", description: "High priority" },
  { name: "priority:P2", color: "e4e669", description: "Medium priority" },
  { name: "priority:P3", color: "fef2c0", description: "Low priority" },
  { name: "status:pending", color: "cccccc", description: "Not yet started" },
  { name: "status:in-progress", color: "0075ca", description: "Currently in progress" },
  { name: "status:done", color: "0e8a16", description: "Feature complete" },
  { name: "status:completed", color: "0e8a16", description: "Slice completed" },
  { name: "category:tech-debt", color: "e4e669", description: "" },
  { name: "category:integration", color: "7057ff", description: "" },
  { name: "category:telemetry", color: "008672", description: "" },
  { name: "autonomous-safe", color: "006b75", description: "Safe for autonomous loop" },
  { name: "slice", color: "bfd4f2", description: "Slice sub-issue" }
];

export function ensureLabels(repo, { ghExec = defaultGhExec } = {}) {
  const existing = JSON.parse(ghExec(["label", "list", "--repo", repo, "--json", "name", "--limit", "100"]));
  const existingNames = new Set(existing.map((l) => l.name));
  for (const { name, color, description } of LABEL_DEFS) {
    if (existingNames.has(name)) continue;
    ghExec(["label", "create", name, "--repo", repo, "--color", color, "--description", description]);
  }
}

function buildLabels(frontmatter) {
  const labels = [];
  if (frontmatter.priority) labels.push(`priority:${frontmatter.priority}`);
  labels.push("status:pending");
  if (frontmatter.category) labels.push(`category:${frontmatter.category}`);
  if (frontmatter.autonomous_safe) labels.push("autonomous-safe");
  return labels;
}

function extractFirstDescriptionLine(body) {
  const section = body.split("## Description")[1] || "";
  const line = section.split("\n").find((l) => l.trim().length > 0);
  return (line || "").trim();
}

function issueNumberFromUrl(url) {
  return parseInt(url.trim().split("/").pop(), 10);
}

export function createFeatureIssue(repo, feat, milestoneNumber, { ghExec = defaultGhExec } = {}) {
  if (feat.frontmatter?.github_issue) return feat.frontmatter.github_issue;
  ensureLabels(repo, { ghExec });
  const title = `${feat.id}: ${extractFirstDescriptionLine(feat.body)}`;
  const bodyText = feat.body || "";
  const labels = buildLabels(feat.frontmatter || {}).join(",");
  const args = [
    "issue", "create",
    "--repo", repo,
    "--title", title,
    "--body", bodyText,
    "--label", labels
  ];
  if (milestoneNumber) args.push("--milestone", String(milestoneNumber));
  const url = ghExec(args);
  return issueNumberFromUrl(url);
}

export function updateIssueStatus(repo, issueNumber, newStatus, { ghExec = defaultGhExec } = {}) {
  const statusLabels = ["status:pending", "status:in-progress", "status:done", "status:completed"];
  const removeArgs = statusLabels.flatMap((l) => ["--remove-label", l]);
  ghExec([
    "issue", "edit", String(issueNumber),
    "--repo", repo,
    "--add-label", `status:${newStatus}`,
    ...removeArgs
  ]);
}

export function closeIssue(repo, issueNumber, { ghExec = defaultGhExec } = {}) {
  ghExec(["issue", "close", String(issueNumber), "--repo", repo]);
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `18 pass, 0 fail`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/github-sync/issue-sync.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): issue-sync — FEAT↔Issue CRUD, label management"
```

---

## Task 6: subissue-sync.mjs

**Files:**
- Create: `scripts/lib/github-sync/subissue-sync.mjs`
- Modify: `tests/github-sync.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` for `subissue-sync.mjs`

- [ ] **Step 3: Create subissue-sync.mjs**

Create `scripts/lib/github-sync/subissue-sync.mjs`:

```js
import { defaultGhExec } from "./gh.mjs";
import { ensureLabels } from "./issue-sync.mjs";

function objectiveFromBody(body) {
  const section = (body || "").split("## Objective")[1] || "";
  const line = section.split("\n").find((l) => l.trim().length > 0);
  return (line || "").trim();
}

function issueNumberFromUrl(url) {
  return parseInt(url.trim().split("/").pop(), 10);
}

export function createSliceIssue(repo, slice, { ghExec = defaultGhExec } = {}) {
  if (slice.frontmatter?.github_issue) return slice.frontmatter.github_issue;
  ensureLabels(repo, { ghExec });
  const title = `${slice.id}: ${objectiveFromBody(slice.body)}`;
  const acSection = (slice.body || "").split("## Acceptance criteria")[1] || "";
  const bodyText = `## Acceptance criteria\n${acSection.split("##")[0]}`.trim();
  const url = ghExec([
    "issue", "create",
    "--repo", repo,
    "--title", title,
    "--body", bodyText,
    "--label", "slice,status:pending"
  ]);
  return issueNumberFromUrl(url);
}

export function attachSubIssue(repo, parentNumber, childNumber, { ghExec = defaultGhExec } = {}) {
  ghExec([
    "api",
    `repos/${repo}/issues/${parentNumber}/sub_issues`,
    "--method", "POST",
    "-f", `sub_issue_id=${childNumber}`
  ]);
}

export function closeSliceIssue(repo, issueNumber, { ghExec = defaultGhExec } = {}) {
  ghExec(["issue", "close", String(issueNumber), "--repo", repo]);
  ghExec([
    "issue", "edit", String(issueNumber),
    "--repo", repo,
    "--add-label", "status:completed",
    "--remove-label", "status:pending",
    "--remove-label", "status:in-progress"
  ]);
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `22 pass, 0 fail`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/github-sync/subissue-sync.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): subissue-sync — SLICE↔native sub-issue CRUD"
```

---

## Task 7: comment-sync.mjs

**Files:**
- Create: `scripts/lib/github-sync/comment-sync.mjs`
- Modify: `tests/github-sync.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` for `comment-sync.mjs`

- [ ] **Step 3: Create comment-sync.mjs**

Create `scripts/lib/github-sync/comment-sync.mjs`:

```js
import { defaultGhExec } from "./gh.mjs";

export function buildSliceComment({ sliceId, objective, validationSatisfied, reviewStatus, costStr, artifactPath }) {
  const outcome = validationSatisfied ? "✅ Validation passed" : "❌ Validation failed";
  const lines = [
    `## ${sliceId} Complete — ${objective}`,
    "",
    `**Outcome:** ${outcome}`,
    "",
    `**Review:** ${reviewStatus || "N/A"}`
  ];
  if (costStr) lines.push(`**Cost:** ${costStr}`);
  if (artifactPath) lines.push(`**Artifacts:** \`${artifactPath}\``);
  return lines.join("\n");
}

export function postComment(repo, issueNumber, body, { ghExec = defaultGhExec } = {}) {
  ghExec(["issue", "comment", String(issueNumber), "--repo", repo, "--body", body]);
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `25 pass, 0 fail`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/github-sync/comment-sync.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): comment-sync — build and post slice-complete summary"
```

---

## Task 8: github-sync.mjs public API

**Files:**
- Create: `scripts/lib/github-sync.mjs`
- Modify: `tests/github-sync.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
import { publishAll, syncPull, postSliceComment, updateIssueStatus as ghUpdateStatus } from "../scripts/lib/github-sync.mjs";
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
  const ghExec = (args) => { calls.push(args); return ""; };
  await publishAll(repo, { ghExec });
  assert.equal(calls.length, 0);
});

test("postSliceComment is no-op when github.enabled is false", async () => {
  const repo = await tmpSyncRepo();
  const calls = [];
  const ghExec = (args) => { calls.push(args); return ""; };
  await postSliceComment(repo, "SLICE-01", { featureId: null, sliceFm: {}, validationGate: null, costReport: null, synthPath: null }, { ghExec });
  assert.equal(calls.length, 0);
});

test("syncPull is no-op when github.enabled is false", async () => {
  const repo = await tmpSyncRepo();
  const calls = [];
  const ghExec = (args) => { calls.push(args); return ""; };
  const result = await syncPull(repo, { ghExec });
  assert.equal(calls.length, 0);
  assert.deepEqual(result, { checked: 0, updated: 0, changes: [] });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` for `github-sync.mjs`

- [ ] **Step 3: Create github-sync.mjs**

Create `scripts/lib/github-sync.mjs`:

```js
import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "./config-resolver.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { mergeFrontmatter, parseFrontmatter } from "./frontmatter.mjs";
import { isGhInstalled } from "./github-sync/gh.mjs";
import { detectRepo } from "./github-sync/repo-detect.mjs";
import { upsertMilestone } from "./github-sync/milestone-sync.mjs";
import { createFeatureIssue, updateIssueStatus as _updateLabel, closeIssue } from "./github-sync/issue-sync.mjs";
import { createSliceIssue, attachSubIssue, closeSliceIssue } from "./github-sync/subissue-sync.mjs";
import { buildSliceComment, postComment } from "./github-sync/comment-sync.mjs";
import { diffBody, patchBody } from "./github-sync/body-diff.mjs";
import { locateSliceFile, slicesRoot } from "./paths.mjs";

function githubConfig(resolved) {
  return resolved?.github ?? null;
}

function isEnabled(resolved) {
  return Boolean(githubConfig(resolved)?.enabled);
}

async function loadConfig(repoPath, configOverride) {
  return configOverride || (await resolveConfig(repoPath));
}

export async function publishAll(repoPath, { ghExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { milestones: 0, issues: 0, subissues: 0 };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found — skipping publish. Run: gh auth login");
    return { milestones: 0, issues: 0, subissues: 0 };
  }
  const feats = await listBacklog(repoPath, { config: resolved });
  let milestoneCount = 0;
  let issueCount = 0;
  let subissueCount = 0;

  // Upsert milestones for unique phases
  const phases = [...new Set(feats.map((f) => f.frontmatter.phase).filter(Boolean))];
  const milestoneMap = {};
  for (const phase of phases) {
    const num = upsertMilestone(repo, { title: `Phase ${phase}` }, { ghExec });
    milestoneMap[phase] = num;
    milestoneCount++;
  }

  // Create issues for unpublished FEATs
  for (const feat of feats) {
    if (feat.frontmatter.github_issue) continue;
    const milestoneNum = feat.frontmatter.phase ? milestoneMap[feat.frontmatter.phase] : null;
    const issueNum = createFeatureIssue(repo, feat, milestoneNum, { ghExec });
    const updated = mergeFrontmatter(
      await fs.readFile(feat.filePath, "utf8"),
      { github_issue: issueNum, github_milestone: milestoneNum ?? null }
    );
    await fs.writeFile(feat.filePath, updated);
    issueCount++;
    feat.frontmatter.github_issue = issueNum;

    // Create sub-issues for linked slices
    const sliceIds = feat.frontmatter.slices || [];
    for (const sliceId of sliceIds) {
      const sliceFile = await findSliceFile(repoPath, sliceId, resolved);
      if (!sliceFile) continue;
      const sliceContent = await fs.readFile(sliceFile, "utf8");
      const { frontmatter: sliceFm, body: sliceBody } = parseFrontmatter(sliceContent);
      if (sliceFm.github_issue) continue;
      const sliceIssueNum = createSliceIssue(repo, { id: sliceId, frontmatter: sliceFm, body: sliceBody }, { ghExec });
      attachSubIssue(repo, issueNum, sliceIssueNum, { ghExec });
      const updatedSlice = mergeFrontmatter(sliceContent, { github_issue: sliceIssueNum });
      await fs.writeFile(sliceFile, updatedSlice);
      subissueCount++;
    }
  }

  console.log(`[github-sync] Published: ${milestoneCount} milestones, ${issueCount} issues, ${subissueCount} sub-issues`);
  return { milestones: milestoneCount, issues: issueCount, subissues: subissueCount };
}

async function findSliceFile(repoPath, sliceId, resolved) {
  const root = slicesRoot(repoPath, resolved);
  try {
    return await locateSliceFile(root, sliceId);
  } catch {
    return null;
  }
}

export async function syncPull(repoPath, { ghExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { checked: 0, updated: 0, changes: [] };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found — skipping sync.");
    return { checked: 0, updated: 0, changes: [] };
  }
  const feats = await listBacklog(repoPath, { config: resolved });
  const published = feats.filter((f) => f.frontmatter.github_issue);
  const today = new Date().toISOString().slice(0, 10);
  let updatedCount = 0;
  const changeLog = [];

  for (const feat of published) {
    const issueNum = feat.frontmatter.github_issue;
    let githubBody;
    try {
      const raw = ghExec(["issue", "view", String(issueNum), "--repo", repo, "--json", "body"]);
      githubBody = JSON.parse(raw).body;
    } catch {
      console.warn(`[github-sync] Could not fetch issue #${issueNum} for ${feat.id}`);
      continue;
    }
    const localContent = await fs.readFile(feat.filePath, "utf8");
    const { changed, changes } = diffBody(localContent, githubBody);
    if (!changed) {
      changeLog.push({ id: feat.id, status: "no-change" });
      continue;
    }
    const patched = patchBody(localContent, githubBody, today);
    await fs.writeFile(feat.filePath, patched);
    console.log(`[github-sync] ${feat.id}: updated ${changes.join(", ")}`);
    changeLog.push({ id: feat.id, status: "updated", changes });
    updatedCount++;
  }

  console.log(`[github-sync] Sync complete: ${published.length} checked, ${updatedCount} updated`);
  return { checked: published.length, updated: updatedCount, changes: changeLog };
}

export async function postSliceComment(repoPath, sliceId, { featureId, sliceFm, validationGate, costReport, synthPath }, { ghExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return null;
  if (!featureId) return null;
  const repo = detectRepo(resolved.github.repo, repoPath);
  const feats = await listBacklog(repoPath, { config: resolved });
  const feat = feats.find((f) => f.id === featureId);
  if (!feat?.frontmatter?.github_issue) return null;
  const issueNum = feat.frontmatter.github_issue;
  const objective = (sliceFm?.objective || sliceId);
  const costStr = costReport?.totalCost ? `~$${costReport.totalCost.toFixed(2)}` : null;
  const reviewStatus = validationGate?.satisfied ? "Approved" : "Needs review";
  const body = buildSliceComment({
    sliceId,
    objective,
    validationSatisfied: Boolean(validationGate?.satisfied),
    reviewStatus,
    costStr,
    artifactPath: synthPath || null
  });
  postComment(repo, issueNum, body, { ghExec });
  if (sliceFm?.github_issue) closeSliceIssue(repo, sliceFm.github_issue, { ghExec });
  return { posted: true, issueNum };
}

export async function updateIssueStatus(repoPath, sliceId, { featureId, sliceFm }, { ghExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return null;
  if (!featureId) return null;
  const repo = detectRepo(resolved.github.repo, repoPath);
  const feats = await listBacklog(repoPath, { config: resolved });
  const feat = feats.find((f) => f.id === featureId);
  if (feat?.frontmatter?.github_issue) {
    _updateLabel(repo, feat.frontmatter.github_issue, "in-progress", { ghExec });
  }
  if (sliceFm?.github_issue) {
    _updateLabel(repo, sliceFm.github_issue, "in-progress", { ghExec });
  }
  return { updated: true };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `28 pass, 0 fail`

- [ ] **Step 5: Run full test suite — no regressions**

```bash
npm test
```
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/github-sync.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): public API — publishAll, syncPull, postSliceComment, updateIssueStatus"
```

---

## Task 9: start-slice.mjs ceremony hook

**Files:**
- Modify: `scripts/lib/slice-linker/start-slice.mjs`

- [ ] **Step 1: Add the import at top of start-slice.mjs**

After the last existing import line (line 9, `import { resolveOrchestratorModel } from "../model-router.mjs";`), add:

```js
import { updateIssueStatus } from "../github-sync.mjs";
```

- [ ] **Step 2: Add the hook inside startSlice before the return statement**

In `startSlice`, after `const sliceProgress = await refreshSliceProgress(...)` (around line 62) and before `return buildStartSliceReturn(...)`, add:

```js
await bestEffort(() =>
  updateIssueStatus(repoPath, sliceId, { featureId, sliceFm: ctx.frontmatter }, { config: resolved })
);
```

- [ ] **Step 3: Run existing slice-start tests — no regressions**

```bash
node --test tests/slice-start.test.mjs
```
Expected: all pass (hook is no-op since `github.enabled` is false in test repos).

- [ ] **Step 4: Run full test suite**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/slice-linker/start-slice.mjs
git commit -m "feat(github-sync): hook updateIssueStatus into slice start ceremony"
```

---

## Task 10: complete-slice.mjs ceremony hook

**Files:**
- Modify: `scripts/lib/slice-linker/complete-slice.mjs`

- [ ] **Step 1: Add the import at top of complete-slice.mjs**

After the last existing import line, add:

```js
import { postSliceComment } from "../github-sync.mjs";
```

- [ ] **Step 2: Add the hook after the main Promise.all block**

After the `const [handoff, synthesis, costReport, agentReport] = await Promise.all([...])` block (around line 202), add:

```js
const githubComment = await bestEffort(() =>
  postSliceComment(
    repoPath,
    sliceId,
    {
      featureId,
      sliceFm,
      validationGate,
      costReport: costReport?.error ? null : costReport,
      synthPath: synthesis?.error ? null : synthesis?.path
    },
    { config: resolved }
  )
);
```

- [ ] **Step 3: Add `githubComment` to the return object**

In the `return { ... }` block at the end of `completeSlice`, add:

```js
githubComment,
```

- [ ] **Step 4: Run existing slice-complete tests — no regressions**

```bash
node --test tests/slice-complete.test.mjs
```
Expected: all pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/slice-linker/complete-slice.mjs
git commit -m "feat(github-sync): hook postSliceComment into slice complete ceremony"
```

---

## Task 11: /loop:publish skill

**Files:**
- Create: `.claude/skills/loop/publish.md`

- [ ] **Step 1: Create the skill file**

Create `.claude/skills/loop/publish.md`:

```markdown
---
name: loop:publish
description: Push all unpublished phases, FEATs, and SLICEs to GitHub Issues. Creates milestones for phases, issues for FEATs, native sub-issues for SLICEs. Idempotent — safe to run multiple times.
---

# /loop:publish

Publish all unpublished loop artifacts to GitHub Issues.

## Prerequisites

1. `gh` CLI installed and authenticated (`gh auth login`)
2. `.claude/loop.json` has `"github": { "enabled": true, "repo": "org/repo" }` — or `"repo": null` to auto-detect from `git remote get-url origin`

## Steps

1. Read `loop.json` and confirm `github.enabled` is `true`. If not, print:
   > GitHub sync is disabled. Set `"github": { "enabled": true }` in `.claude/loop.json` to enable.
   Then stop.

2. Run the publish script:

```js
import { publishAll } from "./scripts/lib/github-sync.mjs";
const result = await publishAll(process.cwd());
console.log(`Published: ${result.milestones} milestones, ${result.issues} issues, ${result.subissues} sub-issues`);
```

Or invoke via the loop CLI:

```bash
node scripts/loop.mjs github publish
```

3. Report the summary. Each FEAT file that was published will now have `github_issue: <N>` in its frontmatter.

## What gets created

- **GitHub Milestone** per unique `feature.phase` value (e.g. `"Phase 1"`, `"Phase 2 alpha"`)
- **GitHub Issue** per FEAT (title: `FEAT-NNN: <first description line>`, body: Description + AC sections, labels: priority/status/category/autonomous-safe, milestone if phase set)
- **GitHub native sub-issue** per SLICE linked to a published FEAT (title: `SLICE-NN: <objective>`, body: AC checklist, labels: `slice,status:pending`, attached to parent FEAT issue)

## Idempotency

FEATs and SLICEs with `github_issue` already set are skipped. Re-running updates labels and milestone assignments only.
```

- [ ] **Step 2: Verify skill file is well-formed**

```bash
node -e "const fs=require('fs'); const c=fs.readFileSync('.claude/skills/loop/publish.md','utf8'); console.log('lines:', c.split('\n').length)"
```
Expected: prints a line count (no error).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/loop/publish.md
git commit -m "feat(github-sync): /loop:publish skill"
```

---

## Task 12: /loop:sync skill

**Files:**
- Create: `.claude/skills/loop/sync.md`

- [ ] **Step 1: Create the skill file**

Create `.claude/skills/loop/sync.md`:

```markdown
---
name: loop:sync
description: Pull GitHub Issue body edits (Description + Acceptance criteria) back into local FEAT files. Run after a PM edits issues in GitHub. GitHub is authoritative for these two sections; all frontmatter fields remain local-authoritative.
---

# /loop:sync

Pull GitHub issue body changes back into local FEAT markdown files.

## When to use

After a PM or stakeholder edits the **Description** or **Acceptance criteria** section of a FEAT issue in GitHub. Developers run `/loop:sync` to pull those changes into the local artifact files before the next slice starts.

## Prerequisites

1. `gh` CLI installed and authenticated (`gh auth login`)
2. `.claude/loop.json` has `"github": { "enabled": true }`
3. FEATs have been published via `/loop:publish` (they have `github_issue` in frontmatter)

## Steps

1. Confirm `github.enabled` is `true` in `loop.json`. If not, print guidance and stop.

2. Run the sync:

```js
import { syncPull } from "./scripts/lib/github-sync.mjs";
const result = await syncPull(process.cwd());
```

Or via CLI:

```bash
node scripts/loop.mjs github sync
```

3. Review the output:
   - `FEAT-012: updated acceptance-criteria (2 lines changed)` — local file was updated
   - `FEAT-007: no changes` — in sync, nothing written

## Conflict rule

- **GitHub wins** for `## Description` and `## Acceptance criteria` body sections.
- **Local file wins** for all frontmatter fields (`priority`, `phase`, `slices`, PM scores, etc.).
- Last pull wins — there is no three-way merge.
- If both sides changed, GitHub's version is applied and a warning is logged.

## What is NOT synced back

- SLICE files (SLICE body is read-only in GitHub)
- Frontmatter fields of any kind
- Grades, cost reports, artifact files
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/loop/sync.md
git commit -m "feat(github-sync): /loop:sync skill"
```

---

## Task 13: Update code-conventions.md

**Files:**
- Modify: `docs/code-conventions.md`

- [ ] **Step 1: Append the new frontmatter fields section**

At the end of `docs/code-conventions.md`, add:

```markdown

## GitHub sync frontmatter fields

Added by `/loop:publish`; null/absent means unpublished.

**FEAT files:**
```yaml
github_issue: 42       # GitHub issue number (integer)
github_milestone: 3    # GitHub milestone number (integer)
```

**SLICE files:**
```yaml
github_issue: 87       # GitHub native sub-issue number (integer)
```

These fields are written back by the sync module. Do not set them manually — let `/loop:publish` manage them.
```

- [ ] **Step 2: Commit**

```bash
git add docs/code-conventions.md
git commit -m "docs: document github_issue and github_milestone frontmatter fields"
```

---

## Task 14: Final lint + test pass

- [ ] **Step 1: Run linter**

```bash
npm run lint
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run formatter check**

```bash
npm run format:check
```
Expected: no formatting issues. If issues: run `npm run format` then re-commit.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```
Expected: all tests pass including the new `github-sync.test.mjs`.

- [ ] **Step 4: Validate manifests**

```bash
node ./scripts/validate-manifests.mjs
```
Expected: no errors.

- [ ] **Step 5: Tag the phase**

```bash
git tag phase-21-github-sync
```
