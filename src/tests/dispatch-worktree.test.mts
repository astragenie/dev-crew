// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { initRepo } from "./dispatch-test-helpers.mjs";
import {
  createChildWorktree,
  removeChildWorktree,
  preflightGitClean,
  inventoryWorkerBranch,
  appendInventoryLog,
  writeWorkerPreservedArtifact,
  resolveDispatchBase,
  assertSliceExistsAtBase
} from "../scripts/lib/dispatch-worktree.mjs";
import { DispatchWorktreeError } from "../scripts/lib/dispatch-types.mjs";

test("createChildWorktree: creates worktree off parentBranch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-1", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-1",
    childId: "FE",
    depth: 0,
    runId: "test-run"
  });
  assert.ok(fs.existsSync(result.worktreePath), "worktree path exists");
  assert.match(result.branch, /slice\/SLICE-1-FE/);
  const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: result.worktreePath
  })
    .toString()
    .trim();
  assert.equal(branchName, result.branch);
});

test("createChildWorktree: writes worktrees.jsonl entry", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-2", { cwd: repo });
  createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-2",
    childId: "BE",
    depth: 0,
    runId: "test-run-2"
  });
  const log = fs.readFileSync(
    path.join(repo, ".claude/artifacts/loop/dispatch/test-run-2/worktrees.jsonl"),
    "utf8"
  );
  const entry = JSON.parse(log.trim());
  assert.equal(entry.childId, "BE");
  assert.equal(entry.depth, 0);
});

test("removeChildWorktree: prunes worktree + deletes branch", () => {
  const repo = initRepo();
  execSync("git checkout -q -b slice/SLICE-3", { cwd: repo });
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "slice/SLICE-3",
    childId: "RM",
    depth: 0,
    runId: "test-run-3"
  });
  removeChildWorktree(repo, result.worktreePath, result.branch);
  assert.ok(!fs.existsSync(result.worktreePath), "worktree gone");
  const branches = execSync("git branch", { cwd: repo }).toString();
  assert.ok(!branches.includes(result.branch));
});

test("preflightGitClean: dirty tree throws DispatchWorktreeError", () => {
  const repo = initRepo();
  fs.writeFileSync(path.join(repo, "dirty.txt"), "x");
  assert.throws(
    () => preflightGitClean(repo, "main"),
    (e) => e.name === "DispatchWorktreeError" && /dirty/i.test(e.message)
  );
});

test("preflightGitClean: missing branch throws DispatchWorktreeError", () => {
  const repo = initRepo();
  assert.throws(
    () => preflightGitClean(repo, "ghost-branch"),
    (e) => e.name === "DispatchWorktreeError"
  );
});

test("preflightGitClean: clean tree on existing branch passes", () => {
  const repo = initRepo();
  assert.doesNotThrow(() => preflightGitClean(repo, "main"));
});

// ──────────────────────────────────────────────────────────────────────────
// FEAT-249 — wave-run self-blocking dirty-tree fix
// ──────────────────────────────────────────────────────────────────────────

test("preflightGitClean: untracked wave artifact under .claude/artifacts/loop/ does not block", () => {
  const repo = initRepo();
  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop/waves/wave-1"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/artifacts/loop/waves/wave-1/events.jsonl"),
    '{"type":"wave_started"}\n'
  );
  assert.doesNotThrow(
    () => preflightGitClean(repo, "main"),
    "the wave runner's own plan artifact write must not self-block dispatch prepare"
  );
});

test("preflightGitClean: a non-artifact dirty file still throws even alongside a loop artifact", () => {
  const repo = initRepo();
  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop/waves/wave-1"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/artifacts/loop/waves/wave-1/events.jsonl"),
    '{"type":"wave_started"}\n'
  );
  fs.writeFileSync(path.join(repo, "unrelated-dirty.txt"), "x");
  assert.throws(
    () => preflightGitClean(repo, "main"),
    (e) => e.name === "DispatchWorktreeError" && /dirty/i.test(e.message)
  );
});

// The two tests above use a bare initRepo() fixture with no committed
// .gitignore at all, so they can't distinguish "the allowlist makes this
// pass" from "there happened to be nothing around to mask it". These two
// commit a real, tracked .gitignore first (mirroring this repo's own
// tracked .gitignore, now that the `.claude/artifacts/loop/waves/` masking
// entry has been removed per FEAT-249's completion clause) to prove the
// wave artifact is genuinely unmasked — visible in plain `git status
// --porcelain` — and that preflightGitClean passes because of the pathspec
// allowlist, not because gitignore hid the artifact from git entirely.

test("preflightGitClean: with a real tracked .gitignore (no waves/ masking), a dirty wave artifact still passes via the allowlist", () => {
  const repo = initRepo();
  fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\ndist/\n");
  // Track something else under .claude/ first (mirroring this repo's real
  // tree, which has plenty of committed .claude/ content), so plain `git
  // status --porcelain` doesn't collapse the WHOLE .claude/ tree to one
  // opaque `?? .claude/` line below.
  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".claude/artifacts/loop/.gitkeep"), "");
  execSync('git add . && git commit -qm "add gitignore + loop artifacts root"', { cwd: repo });

  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop/waves/wave-1"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/artifacts/loop/waves/wave-1/events.jsonl"),
    '{"type":"wave_started"}\n'
  );

  // Every wave run creates a brand-new `waves/<waveId>/` directory, so git
  // still collapses THAT (now-untracked) subtree to one `?? .claude/…/waves/`
  // line — matching production exactly (this is the shape a live wave run
  // hits, not a test-only artifact). What matters for the "not gitignore
  // masked" proof is that the line appears at all: an ignored path is
  // invisible to plain `git status --porcelain` with no trace whatsoever.
  const rawStatus = execSync("git status --porcelain", { cwd: repo })
    .toString()
    .replace(/\\/g, "/");
  assert.match(
    rawStatus,
    /\.claude\/artifacts\/loop\/waves/,
    "artifact path must show up as dirty in plain git status — proves gitignore isn't what's hiding it"
  );

  assert.doesNotThrow(() => preflightGitClean(repo, "main"));
});

test("preflightGitClean: with a real tracked .gitignore present, an unrelated dirty file alongside a wave artifact still blocks", () => {
  const repo = initRepo();
  fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\ndist/\n");
  execSync('git add . && git commit -qm "add gitignore"', { cwd: repo });

  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop/waves/wave-1"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/artifacts/loop/waves/wave-1/events.jsonl"),
    '{"type":"wave_started"}\n'
  );
  fs.writeFileSync(path.join(repo, "unrelated-dirty.txt"), "x");

  assert.throws(
    () => preflightGitClean(repo, "main"),
    (e) => e.name === "DispatchWorktreeError" && /dirty/i.test(e.message)
  );
});

// ──────────────────────────────────────────────────────────────────────────
// FEAT-202 SLICE-A — inventoryWorkerBranch + helpers
// ──────────────────────────────────────────────────────────────────────────

test("inventoryWorkerBranch: clean branch with no changes returns empty arrays", () => {
  const repo = initRepo();
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "INV1",
    depth: 0,
    runId: "test-inv-1"
  });
  const inv = inventoryWorkerBranch(repo, result.worktreePath, result.branch, "main");
  assert.equal(inv.filesOnBranchNotOnMain.length, 0, "no commits on branch yet");
  assert.equal(inv.uncommittedWip.length, 0, "no WIP in worktree");
  assert.equal(inv.branch, result.branch);
});

test("inventoryWorkerBranch: branch with a committed handoff shows it as on-branch-not-on-main", () => {
  const repo = initRepo();
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "INV2",
    depth: 0,
    runId: "test-inv-2"
  });
  fs.mkdirSync(path.join(result.worktreePath, ".claude/artifacts/crew/handoffs"), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(result.worktreePath, ".claude/artifacts/crew/handoffs/SLICE-X-handoff.md"),
    "# handoff\n"
  );
  execSync('git add . && git commit -qm "handoff"', { cwd: result.worktreePath });
  const inv = inventoryWorkerBranch(repo, result.worktreePath, result.branch, "main");
  assert.equal(inv.filesOnBranchNotOnMain.length, 1);
  assert.ok(inv.filesOnBranchNotOnMain[0].includes("SLICE-X-handoff.md"));
});

test("inventoryWorkerBranch: uncommitted WIP in worktree appears in uncommittedWip", () => {
  const repo = initRepo();
  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "INV3",
    depth: 0,
    runId: "test-inv-3"
  });
  fs.writeFileSync(path.join(result.worktreePath, "untracked.txt"), "WIP\n");
  const inv = inventoryWorkerBranch(repo, result.worktreePath, result.branch, "main");
  assert.equal(inv.uncommittedWip.length, 1);
  assert.equal(inv.uncommittedWip[0].path, "untracked.txt");
  assert.equal(inv.uncommittedWip[0].status, "??");
});

test("inventoryWorkerBranch: missing worktree returns empty WIP (no throw)", () => {
  const repo = initRepo();
  // Reference a worktree path that doesn't exist; should not throw.
  const inv = inventoryWorkerBranch(
    repo,
    path.join(repo, "ghost-worktree"),
    "ghost-branch",
    "main"
  );
  assert.equal(inv.uncommittedWip.length, 0);
  assert.equal(inv.filesOnBranchNotOnMain.length, 0);
});

test("appendInventoryLog: writes one JSONL row per call under runId dir", () => {
  const repo = initRepo();
  appendInventoryLog(repo, "test-log-1", {
    branch: "slice/SLICE-LOG",
    worktreePath: "/tmp/wt",
    filesOnBranchNotOnMain: ["a.md"],
    uncommittedWip: [{ path: "b.txt", status: "??" }],
    childId: "LOG1",
    status: "PRE_MERGE"
  });
  appendInventoryLog(repo, "test-log-1", {
    branch: "slice/SLICE-LOG",
    worktreePath: "/tmp/wt",
    filesOnBranchNotOnMain: [],
    uncommittedWip: [],
    childId: "LOG2",
    status: "FAIL"
  });
  const logPath = path.join(repo, ".claude/artifacts/loop/dispatch/test-log-1/inventory.jsonl");
  const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  const row1 = JSON.parse(lines[0]);
  assert.equal(row1.childId, "LOG1");
  assert.equal(row1.status, "PRE_MERGE");
  assert.equal(row1.filesOnBranchNotOnMain[0], "a.md");
  assert.ok(row1.ts, "timestamp present");
});

test("writeWorkerPreservedArtifact: emits Markdown summary with file + WIP previews", () => {
  const repo = initRepo();
  writeWorkerPreservedArtifact(
    repo,
    "test-art-1",
    "ART1",
    "CONFLICTED",
    {
      branch: "slice/SLICE-A1",
      worktreePath: "/tmp/wt-a1",
      filesOnBranchNotOnMain: ["x.md", "y.md"],
      uncommittedWip: [{ path: "z.txt", status: " M" }]
    },
    "Resolve conflicts manually."
  );
  const artPath = path.join(
    repo,
    ".claude/artifacts/loop/dispatch/test-art-1/worker-preserved-ART1.md"
  );
  const body = fs.readFileSync(artPath, "utf8");
  assert.ok(body.includes("# Worker preserved — ART1"));
  assert.ok(body.includes("**status:** CONFLICTED"));
  assert.ok(body.includes("`slice/SLICE-A1`"));
  assert.ok(body.includes("`x.md`"));
  assert.ok(body.includes("`y.md`"));
  assert.ok(body.includes("`z.txt`"));
  assert.ok(body.includes("Resolve conflicts manually."));
});

// ──────────────────────────────────────────────────────────────────────────
// FEAT-261 — stale-base dispatch guard
// ──────────────────────────────────────────────────────────────────────────

test("createChildWorktree: bases on invoking checkout's HEAD, not a stale parentBranch literal", () => {
  const repo = initRepo();
  // Simulate the invoking checkout sitting ahead of whatever "main" locally
  // resolves to — the exact shape of the 2026-07-10 incident (base ref
  // missing recent commits the invoking checkout already had).
  execSync("git checkout -q -b feature/ahead-of-main", { cwd: repo });
  fs.writeFileSync(path.join(repo, "extra.txt"), "ahead\n");
  execSync('git add . && git commit -q -m "ahead commit"', { cwd: repo });
  const headSha = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  const mainSha = execSync("git rev-parse main", { cwd: repo }).toString().trim();
  assert.notEqual(headSha, mainSha, "test setup: HEAD must differ from main");

  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main", // stale literal — must NOT be trusted as the base
    childId: "AHEAD",
    depth: 0,
    runId: "test-ahead"
  });

  assert.equal(result.baseRef, headSha, "child worktree bases on invoking HEAD, not literal main");
  assert.ok(
    fs.existsSync(path.join(result.worktreePath, "extra.txt")),
    "worktree must contain the commit only present on the invoking checkout's HEAD"
  );
});

test("createChildWorktree: explicit baseRef override is honored over HEAD", () => {
  const repo = initRepo();
  const initialSha = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  fs.writeFileSync(path.join(repo, "more.txt"), "more\n");
  execSync('git add . && git commit -q -m "more"', { cwd: repo });
  const headSha = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  assert.notEqual(initialSha, headSha, "test setup: HEAD must have moved past initialSha");

  const result = createChildWorktree({
    repoRoot: repo,
    parentBranch: "main",
    childId: "PINNED",
    depth: 0,
    runId: "test-pinned",
    baseRef: initialSha
  });

  assert.equal(result.baseRef, initialSha);
  assert.ok(
    !fs.existsSync(path.join(result.worktreePath, "more.txt")),
    "explicit baseRef must win over the current HEAD"
  );
});

test("resolveDispatchBase: unresolvable ref throws DispatchWorktreeError", () => {
  const repo = initRepo();
  assert.throws(
    () => resolveDispatchBase(repo, "totally-not-a-ref"),
    (e) => e instanceof DispatchWorktreeError && /could not resolve/i.test(e.message)
  );
});

test("assertSliceExistsAtBase: skips non-backlog-shaped childId (role fanout)", () => {
  const repo = initRepo();
  const base = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  assert.doesNotThrow(() => assertSliceExistsAtBase(repo, base, "FE"));
});

test("assertSliceExistsAtBase: passes when the slice file exists at the base tree", () => {
  const repo = initRepo();
  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/artifacts/loop/backlog/triaged/SLICE-500.md"),
    "# slice\n"
  );
  execSync('git add . && git commit -q -m "add slice"', { cwd: repo });
  const base = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  assert.doesNotThrow(() => assertSliceExistsAtBase(repo, base, "SLICE-500"));
});

test("assertSliceExistsAtBase: throws structured error naming base + candidate paths when slice missing at a stale base", () => {
  const repo = initRepo();
  const staleBase = execSync("git rev-parse HEAD", { cwd: repo }).toString().trim();
  // The slice file lands on a LATER commit — staleBase predates it entirely.
  fs.mkdirSync(path.join(repo, ".claude/artifacts/loop/backlog/pending"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".claude/artifacts/loop/backlog/pending/SLICE-501.md"),
    "# slice\n"
  );
  execSync('git add . && git commit -q -m "add slice after stale base"', { cwd: repo });

  assert.throws(
    () => assertSliceExistsAtBase(repo, staleBase, "SLICE-501"),
    (e) =>
      e instanceof DispatchWorktreeError &&
      e.message.includes("SLICE-501") &&
      e.message.includes(staleBase) &&
      /stale/i.test(e.message)
  );
});

test("createChildWorktree: fails loudly and leaves no worktree when the base tree lacks the dispatched slice", () => {
  const repo = initRepo();
  // No SLICE-999 file exists anywhere in history — every candidate path misses.
  assert.throws(
    () =>
      createChildWorktree({
        repoRoot: repo,
        parentBranch: "main",
        childId: "SLICE-999",
        depth: 0,
        runId: "test-missing-slice"
      }),
    (e) => e instanceof DispatchWorktreeError && /stale dispatch base/i.test(e.message)
  );
  const worktreeDirName = `${path.basename(repo)}-SLICE-999-0`;
  assert.ok(
    !fs.existsSync(path.join(path.dirname(repo), worktreeDirName)),
    "no partial worktree left behind after the guard rejects"
  );
});
