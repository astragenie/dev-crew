# GitHub Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `node scripts/loop.mjs github bootstrap --repo <path>` that fetches open GitHub issues and creates local `FEAT-NNN.md` files, enabling a PM-first workflow where backlog is managed in GitHub and consumed locally by the loop.

**Architecture:** A new `bootstrapFromGithub(repoPath, opts)` function in `scripts/lib/github-sync.mjs` fetches issues via `gh issue list`, filters out slice sub-issues, derives FEAT IDs sequentially from the existing backlog, writes `FEAT-NNN.md` files to the `triaged/` folder, and returns counts. The function is wired into the existing `runGithubSubcommand` in both `scripts/loop.mjs` and its TypeScript source `src/scripts/loop.mts`.

**Tech Stack:** Node.js ESM, `gh` CLI, `node:test` + `node:assert/strict`. TypeScript source compiles to JS via `npm run build`.

---

## File Map

| Action | Path | Change |
|---|---|---|
| Modify | `scripts/lib/github-sync.mjs` | Add `serializeFrontmatter` + `backlogRoot` imports; add `bootstrapFromGithub` export |
| Modify | `tests/github-sync.test.mjs` | Append bootstrap tests |
| Modify | `src/scripts/loop.mts` | Add `"bootstrap"` branch to `runGithubSubcommand` |
| Modify | `scripts/loop.mjs` | Rebuilt by `npm run build` from `.mts` source |
| Modify | `C:\work\mega\kb\06-tools\loop-github-sync.md` | Document `github bootstrap` command |

---

## Task 1: bootstrapFromGithub + tests

**Files:**
- Modify: `scripts/lib/github-sync.mjs`
- Modify: `tests/github-sync.test.mjs`

### Step 1: Append failing tests to `tests/github-sync.test.mjs`

Read the file first (it has 28 passing tests), then append:

```js
import { bootstrapFromGithub } from "../scripts/lib/github-sync.mjs";
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
  const ghExec = (args) => { calls.push(args); return "[]"; };
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
      return JSON.stringify([{ number: 42, title: "Existing", body: "", labels: [], milestone: null }]);
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
        { number: 10, title: "SLICE-01: Do work", body: "", labels: [{ name: "slice" }], milestone: null }
      ]);
    return "";
  };
  const result = await bootstrapFromGithub(repo, { ghExec });
  assert.equal(result.created, 0);
  assert.equal(result.skipped, 0); // filtered before skip check
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `ERR_MODULE_NOT_FOUND` or export not found for `bootstrapFromGithub`

- [ ] **Step 3: Add imports to `scripts/lib/github-sync.mjs`**

Change line 5 (frontmatter import):
```js
import { mergeFrontmatter, parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
```

Change line 17 (paths import):
```js
import { locateSliceFile, slicesRoot, backlogRoot as resolveBacklogRoot } from "./paths.mjs";
```

- [ ] **Step 4: Append `bootstrapFromGithub` at the end of `scripts/lib/github-sync.mjs`**

```js
/**
 * Reverse sync: fetch open GitHub issues and create local FEAT-NNN.md files.
 * Skips issues labeled "slice" and issues already linked to an existing FEAT.
 * Creates new FEATs in the backlog triaged/ folder.
 */
export async function bootstrapFromGithub(repoPath, { ghExec = defaultGhExec, config } = {}) {
  const resolved = await loadConfig(repoPath, config);
  if (!isEnabled(resolved)) return { created: 0, skipped: 0, featIds: [] };
  const repo = detectRepo(resolved.github.repo, repoPath);
  if (!isGhInstalled({ ghExec })) {
    console.warn("[github-sync] gh CLI not found. Run: gh auth login");
    return { created: 0, skipped: 0, featIds: [] };
  }

  // Fetch all open issues
  const rawIssues = JSON.parse(
    ghExec([
      "issue", "list",
      "--repo", repo,
      "--state", "open",
      "--json", "number,title,body,labels,milestone",
      "--limit", "200"
    ])
  );

  // Drop slice sub-issues
  const featIssues = rawIssues.filter(
    (i) => !i.labels.some((l) => l.name === "slice")
  );

  // Find already-linked issue numbers
  const existingFeats = await listBacklog(repoPath, { config: resolved });
  const linkedNums = new Set(
    existingFeats.map((f) => f.frontmatter.github_issue).filter(Boolean)
  );
  let nextIdNum = existingFeats.reduce((acc, e) => Math.max(acc, e.idNumber), 0);

  const backlogRootPath = resolveBacklogRoot(repoPath, resolved);
  const triagedDir = path.join(backlogRootPath, "triaged");
  await fs.mkdir(triagedDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const created = [];
  let skipped = 0;

  for (const issue of featIssues) {
    if (linkedNums.has(issue.number)) {
      skipped++;
      continue;
    }

    nextIdNum++;
    const featId = `FEAT-${String(nextIdNum).padStart(3, "0")}`;

    const labelNames = issue.labels.map((l) => l.name);
    const priorityLabel = labelNames.find((l) => l.startsWith("priority:"));
    const categoryLabel = labelNames.find((l) => l.startsWith("category:"));

    const milestoneTitle = issue.milestone?.title ?? null;
    const phaseMatch = milestoneTitle?.match(/^Phase\s+(\S+)$/i);
    const phase = phaseMatch ? phaseMatch[1] : null;

    const description = issue.title.replace(/^FEAT-\d+:\s*/i, "").trim();

    const frontmatter = {
      id: featId,
      status: "triaged",
      priority: priorityLabel ? priorityLabel.replace("priority:", "") : null,
      category: categoryLabel ? categoryLabel.replace("category:", "") : null,
      target_release: null,
      created: today,
      updated: today,
      depends_on: [],
      slices: [],
      derived_from: null,
      feature_complete: null,
      autonomous_safe: labelNames.includes("autonomous-safe") || null,
      phase,
      github_issue: issue.number,
      github_milestone: issue.milestone?.number ?? null
    };

    const body = [
      "## Description",
      "",
      description,
      "",
      ...(issue.body?.trim() ? [issue.body.trim(), ""] : []),
      "## Acceptance criteria",
      "",
      "- [ ] AC-1: <replace with a concrete, testable acceptance criterion>",
      ""
    ].join("\n");

    await fs.writeFile(path.join(triagedDir, `${featId}.md`), serializeFrontmatter(frontmatter, body));
    linkedNums.add(issue.number);
    created.push(featId);
    console.log(`[github-sync] ${featId} ← GitHub issue #${issue.number}: ${description}`);
  }

  console.log(`[github-sync] bootstrap: ${created.length} created, ${skipped} skipped`);
  return { created: created.length, skipped, featIds: created };
}
```

- [ ] **Step 5: Run tests — expect 32 pass**

```bash
node --test tests/github-sync.test.mjs
```
Expected: `32 pass, 0 fail`

- [ ] **Step 6: Run full test suite — no regressions**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/github-sync.mjs tests/github-sync.test.mjs
git commit -m "feat(github-sync): bootstrapFromGithub — reverse sync GitHub issues to local FEATs"
```

---

## Task 2: Wire into CLI

**Files:**
- Modify: `src/scripts/loop.mts`
- Rebuild: `scripts/loop.mjs` via `npm run build`

- [ ] **Step 1: Add `"bootstrap"` branch to `runGithubSubcommand` in `src/scripts/loop.mts`**

Find the existing `runGithubSubcommand` function (near the bottom of the file). It currently has:
```typescript
  if (sub === "setup") { ... }
  if (sub === "publish") return (publishAll as any)(repoPath);
  if (sub === "sync") return (syncPull as any)(repoPath);
  if (sub === "status") return (syncMilestones as any)(repoPath);
  throw new Error("github requires a subcommand: setup | publish | sync | status");
```

Change it to:
```typescript
  if (sub === "setup") {
    const result = await (setupGithubSync as any)(repoPath);
    console.log("[github-sync] Setup complete. Run 'github publish' next.");
    return result;
  }
  if (sub === "publish") return (publishAll as any)(repoPath);
  if (sub === "sync") return (syncPull as any)(repoPath);
  if (sub === "status") return (syncMilestones as any)(repoPath);
  if (sub === "bootstrap") return (bootstrapFromGithub as any)(repoPath);
  throw new Error("github requires a subcommand: setup | publish | sync | status | bootstrap");
```

The import line in `runGithubSubcommand` already has:
```typescript
  const { publishAll, syncPull, syncMilestones, setupGithubSync } = await import("./lib/github-sync.mjs");
```

Change it to:
```typescript
  const { publishAll, syncPull, syncMilestones, setupGithubSync, bootstrapFromGithub } = await import("./lib/github-sync.mjs");
```

- [ ] **Step 2: Rebuild**

```bash
npm run build
```
Expected: no errors (the `@ts-ignore` already covers the missing `.mts` type).

- [ ] **Step 3: Verify the command is wired**

```bash
node scripts/loop.mjs github bootstrap 2>&1
```
Expected (when run without a GitHub-enabled repo): `[github-sync] gh CLI not found. Run: gh auth login` OR a meaningful error — NOT `Unknown subcommand`.

Actually since bootstrap requires `github.enabled: true` and a valid gh CLI, the expected output when run from the loop repo (which has `enabled: true`) with `gh` available is the full publish output. When run without `gh`, it will print the "not found" warning. Either way, the error "github requires a subcommand" must NOT appear.

More reliable check — confirm the subcommand is listed in the error message:

```bash
node scripts/loop.mjs github 2>&1
```
Expected: `github requires a subcommand: setup | publish | sync | status | bootstrap`

- [ ] **Step 4: Run full test suite again**

```bash
npm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/loop.mts scripts/loop.mjs
git commit -m "feat(github-sync): wire github bootstrap into CLI"
```

---

## Task 3: Update KB guide

**Files:**
- Modify: `C:\work\mega\kb\06-tools\loop-github-sync.md`

- [ ] **Step 1: Add `github bootstrap` to the Available subcommands table**

Find the table:
```markdown
| Command | What it does |
|---|---|
| `github setup` | Enable `github.enabled=true` in loop.json + bulk-set phases |
| `github publish` | Create milestones, issues, sub-issues for all unpublished FEATs/SLICEs |
| `github sync` | Pull GitHub issue body edits → local FEAT files |
| `github status` | Sync milestones + status labels + close done issues |
```

Replace with:
```markdown
| Command | What it does |
|---|---|
| `github setup` | Enable `github.enabled=true` in loop.json + bulk-set phases |
| `github publish` | Create milestones, issues, sub-issues for all unpublished FEATs/SLICEs |
| `github sync` | Pull GitHub issue body edits → local FEAT files |
| `github status` | Sync milestones + status labels + close done issues |
| `github bootstrap` | **Reverse sync** — fetch GitHub issues → create local FEAT-NNN.md files |
```

- [ ] **Step 2: Add a "PM-first workflow" section after the subcommands table**

After the table, add:

```markdown
---

## PM-first workflow (manage backlog in GitHub, loop consumes locally)

For repos without an existing FEAT-based backlog, you can create and manage features entirely in GitHub Issues and pull them into the local loop format:

```bash
# 1. Create milestones and issues in the GitHub UI (any repo)

# 2. Bootstrap — create local FEAT-NNN.md files from GitHub issues
node scripts/loop.mjs github bootstrap --repo /path/to/project

# 3. Loop now picks up the FEATs normally
node scripts/loop.mjs backlog list --repo /path/to/project
```

**What `bootstrap` does per issue:**
- Skips issues labeled `slice` (those are SLICE sub-issues, not FEATs)
- Skips issues already linked to a local FEAT (`github_issue` frontmatter set)
- Creates `FEAT-NNN.md` in `triaged/` with title, description, labels, and phase from milestone
- Sets `github_issue: N` so future `sync` and `status` commands stay in sync

**Idempotent** — re-running only creates FEATs for issues not yet linked locally.
```

- [ ] **Step 3: Commit**

```bash
cd C:\work\mega\kb
git add 06-tools/loop-github-sync.md
git commit -m "docs: add github bootstrap — PM-first workflow section"
git push
```

---

## Task 4: Final validation

- [ ] **Step 1: Lint**

```bash
cd C:\work\mega\loop && npm run lint
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Format check**

```bash
npm run format:check
```
If issues: `npx prettier --write "scripts/lib/github-sync.mjs" && git add scripts/lib/github-sync.mjs && git commit -m "style: format github-sync after bootstrap addition"`

- [ ] **Step 3: Full test suite**

```bash
npm test
```
Expected: all pass (32+ in github-sync.test.mjs, 473+ total).

- [ ] **Step 4: Push loop repo**

```bash
git push origin main
```

- [ ] **Step 5: Live smoke test against tools repo**

```bash
node scripts/loop.mjs github setup   --repo C:\work\mega\tools
node scripts/loop.mjs github bootstrap --repo C:\work\mega\tools
```
Expected: `bootstrap: 0 created, 0 skipped` (tools has no GitHub issues yet — this confirms the command runs without error on an empty repo).
