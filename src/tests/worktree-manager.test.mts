// @ts-nocheck
// Tests for SLICE-56: worktree-manager (FEAT-060).
// TDD order: tests written before implementation.
//
// Covers:
//   - gated-off no-op returns null without invoking git
//   - gated-on creates fresh worktree (uses tmp git repo with initial commit on main)
//   - re-entry reuses existing worktree path
//   - git failure throws WorktreeError with no partial state in workflow-state
//   - custom worktreeRoot path honored
//   - (light) integration with startSlice — worktreePath written when mode on

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { ensureSliceWorktree, WorktreeError } from "../scripts/lib/worktree-manager.mjs";
import { startSlice, sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";

function exec(cmd, opts) {
  return promisify(execCb)(cmd, { timeout: 10000, ...opts });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temp directory with a minimal loop.json (worktreeMode:false by default). */
async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/** Write .claude/loop.json with given loop overrides. */
async function writeLoopJson(dir: string, loopOverrides: Record<string, any> = {}): Promise<void> {
  const claudeDir = path.join(dir, ".claude");
  await fs.mkdir(claudeDir, { recursive: true });
  await fs.writeFile(
    path.join(claudeDir, "loop.json"),
    JSON.stringify({
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations",
        ...loopOverrides
      },
      stack: {}
    })
  );
}

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@test.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@test.com"
};

/**
 * Initialize a real git repo with one commit on main.
 * Also commits any existing files in dir so the working tree stays clean.
 */
async function initGitRepo(dir: string): Promise<void> {
  const run = (cmd: string) => exec(cmd, { cwd: dir, env: GIT_ENV });
  await run("git init -b main");
  await run("git config user.email test@test.com");
  await run("git config user.name Test");
  await fs.writeFile(path.join(dir, "README.md"), "# test");
  await run("git add -A");
  await run("git commit -m initial");
}

/**
 * Commit all pending changes in the repo so the working tree is clean.
 * Used in tests that write files before initGitRepo or after setup.
 */
async function _commitAll(dir: string, message = "chore: test setup"): Promise<void> {
  const run = (cmd: string) => exec(cmd, { cwd: dir, env: GIT_ENV });
  await run(`git add -A`);
  await run(`git commit -m "${message}"`);
}

/** Read workflow-state.json currentRun. Returns null when missing. */
async function readWorkflowState(repoPath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(
      path.join(repoPath, ".claude", "state", "crew", "workflow-state.json"),
      "utf8"
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Write workflow-state.json with given currentRun fields. */
async function writeWorkflowState(
  repoPath: string,
  currentRun: Record<string, any>
): Promise<void> {
  const dir = path.join(repoPath, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ version: "1.0", currentRun }, null, 2)
  );
}

// ---------------------------------------------------------------------------
// 1. Gated-off no-op — returns null without invoking git
// ---------------------------------------------------------------------------

test("ensureSliceWorktree: worktreeMode false (default) → returns null immediately", async () => {
  const dir = await tmpDir("wm-off-");
  // No git repo needed: if git were called and the dir is not a repo, it would fail.
  // We rely on the function returning null before any git call.
  const result = await ensureSliceWorktree(dir, "SLICE-01", {
    config: { loop: { worktreeMode: false } }
  });
  assert.equal(result, null, "should return null when worktreeMode is false");
});

test("ensureSliceWorktree: worktreeMode missing → returns null (default false)", async () => {
  const dir = await tmpDir("wm-missing-");
  const result = await ensureSliceWorktree(dir, "SLICE-01", {
    config: { loop: {} }
  });
  assert.equal(result, null, "should return null when worktreeMode is missing");
});

test("ensureSliceWorktree: worktreeMode: 1 (integer) → returns null (not strictly true)", async () => {
  const dir = await tmpDir("wm-int-");
  const result = await ensureSliceWorktree(dir, "SLICE-01", {
    config: { loop: { worktreeMode: 1 } }
  });
  assert.equal(result, null, "worktreeMode coerced via === true; integer 1 is not true");
});

test("ensureSliceWorktree: null config → returns null (gate off)", async () => {
  const dir = await tmpDir("wm-null-config-");
  const result = await ensureSliceWorktree(dir, "SLICE-01", { config: null });
  assert.equal(result, null, "null config means no worktreeMode → gate off");
});

// ---------------------------------------------------------------------------
// 2. Gated-on: creates fresh worktree
// ---------------------------------------------------------------------------

test("ensureSliceWorktree: worktreeMode true → creates worktree and returns WorktreeResult", async () => {
  const repo = await tmpDir("wm-create-");
  await initGitRepo(repo);
  // Do NOT write loop.json after initGitRepo (untracked files would make tree dirty).
  // Config is passed directly via opts.config.
  const worktreeRoot = path.join(os.tmpdir(), `wm-create-root-${Date.now()}`);

  const result = await ensureSliceWorktree(repo, "SLICE-56", {
    config: { loop: { worktreeMode: true, worktreeRoot } },
    featureId: "FEAT-060"
  });

  assert.ok(result, "should return a WorktreeResult");
  assert.equal(result.created, true);
  assert.equal(result.reused, false);
  assert.equal(result.branchName, "slice/SLICE-56-FEAT-060");

  // Worktree directory should exist
  const stat = await fs.stat(result.worktreePath);
  assert.ok(stat.isDirectory(), "worktree directory should exist");

  // Path should be inside the worktreeRoot
  assert.ok(
    result.worktreePath.startsWith(worktreeRoot),
    `worktreePath ${result.worktreePath} should be under ${worktreeRoot}`
  );

  // Clean up: remove worktree
  try {
    await exec(`git -C "${repo}" worktree remove --force "${result.worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${result.branchName}"`);
  } catch {
    // best-effort cleanup
  }
});

test("ensureSliceWorktree: featureId null → branch named slice/<SLICE-ID> only", async () => {
  const repo = await tmpDir("wm-nofeat-");
  await initGitRepo(repo);

  const worktreeRoot = path.join(os.tmpdir(), `wm-nofeat-root-${Date.now()}`);
  const result = await ensureSliceWorktree(repo, "SLICE-99", {
    config: { loop: { worktreeMode: true, worktreeRoot } },
    featureId: null
  });

  assert.ok(result);
  assert.equal(result.branchName, "slice/SLICE-99");
  assert.equal(result.created, true);

  try {
    await exec(`git -C "${repo}" worktree remove --force "${result.worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${result.branchName}"`);
  } catch {
    // best-effort cleanup
  }
});

// ---------------------------------------------------------------------------
// 3. Re-entry — reuses existing worktree
// ---------------------------------------------------------------------------

test("ensureSliceWorktree: re-entry reuses existing worktree (idempotent)", async () => {
  const repo = await tmpDir("wm-reuse-");
  await initGitRepo(repo);

  const worktreeRoot = path.join(os.tmpdir(), `wm-reuse-root-${Date.now()}`);
  const opts = {
    config: { loop: { worktreeMode: true, worktreeRoot } },
    featureId: "FEAT-060"
  };

  // First call: creates
  const first = await ensureSliceWorktree(repo, "SLICE-56", opts);
  assert.ok(first);
  assert.equal(first.created, true);
  assert.equal(first.reused, false);

  // Second call: re-enters
  const second = await ensureSliceWorktree(repo, "SLICE-56", opts);
  assert.ok(second);
  assert.equal(second.created, false);
  assert.equal(second.reused, true);
  assert.equal(second.worktreePath, first.worktreePath);
  assert.equal(second.branchName, first.branchName);

  try {
    await exec(`git -C "${repo}" worktree remove --force "${first.worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${first.branchName}"`);
  } catch {
    // best-effort cleanup
  }
});

// ---------------------------------------------------------------------------
// 4. Git failure — throws WorktreeError with no partial state
// ---------------------------------------------------------------------------

test("ensureSliceWorktree: dirty working tree → throws WorktreeError{DIRTY_TREE}", async () => {
  const repo = await tmpDir("wm-dirty-");
  await initGitRepo(repo);

  // Create a tracked file with unstaged changes to make tree dirty
  const trackedFile = path.join(repo, "tracked.txt");
  await fs.writeFile(trackedFile, "initial");
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@test.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@test.com"
  };
  await exec(`git -C "${repo}" add tracked.txt`, { env: gitEnv });
  await exec(`git -C "${repo}" commit -m "add tracked" --author "Test <test@test.com>"`, {
    env: gitEnv
  });
  // Modify without staging to make it dirty
  await fs.writeFile(trackedFile, "modified");

  const worktreeRoot = path.join(os.tmpdir(), `wm-dirty-root-${Date.now()}`);

  await assert.rejects(
    () =>
      ensureSliceWorktree(repo, "SLICE-56", {
        config: { loop: { worktreeMode: true, worktreeRoot } },
        featureId: "FEAT-060"
      }),
    (err) => {
      assert.ok(
        err instanceof WorktreeError,
        `expected WorktreeError, got ${err?.constructor?.name}`
      );
      assert.equal(err.code, "DIRTY_TREE");
      return true;
    }
  );
});

test("ensureSliceWorktree: git failure leaves no partial state in workflow-state", async () => {
  const repo = await tmpDir("wm-no-partial-");
  await initGitRepo(repo);

  // Commit a tracked file then modify it without staging — real "dirty tree"
  // per the -uno semantics used by isWorktreeDirty (untracked files don't
  // count; loop state files in .claude/state/ are legitimately untracked).
  const trackedFile = path.join(repo, "tracked.txt");
  await fs.writeFile(trackedFile, "initial");
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@test.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@test.com"
  };
  await exec(`git -C "${repo}" add tracked.txt`, { env: gitEnv });
  await exec(`git -C "${repo}" commit -m "add tracked" --author "Test <test@test.com>"`, {
    env: gitEnv
  });
  await fs.writeFile(trackedFile, "modified-unstaged");

  const worktreeRoot = path.join(os.tmpdir(), `wm-no-partial-root-${Date.now()}`);

  // Pre-write workflow-state without worktreePath
  await writeWorkflowState(repo, { title: "test run", sessionId: null });

  try {
    await ensureSliceWorktree(repo, "SLICE-56", {
      config: { loop: { worktreeMode: true, worktreeRoot } },
      featureId: "FEAT-060"
    });
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof WorktreeError, "should be WorktreeError");
  }

  // workflow-state should NOT have worktreePath set
  const state = await readWorkflowState(repo);
  assert.ok(!state?.currentRun?.worktreePath, "worktreePath must not be written on git failure");
});

// ---------------------------------------------------------------------------
// 5. Custom worktreeRoot path honored
// ---------------------------------------------------------------------------

test("ensureSliceWorktree: custom worktreeRoot honored", async () => {
  const repo = await tmpDir("wm-custom-root-");
  await initGitRepo(repo);

  const customRoot = path.join(os.tmpdir(), `custom-wt-root-${Date.now()}`);
  await fs.mkdir(customRoot, { recursive: true });

  const result = await ensureSliceWorktree(repo, "SLICE-77", {
    config: { loop: { worktreeMode: true, worktreeRoot: customRoot } },
    featureId: "FEAT-099"
  });

  assert.ok(result);
  const expectedPath = path.join(customRoot, "SLICE-77");
  assert.equal(result.worktreePath, expectedPath);

  try {
    await exec(`git -C "${repo}" worktree remove --force "${result.worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${result.branchName}"`);
  } catch {
    // best-effort cleanup
  }
});

test("ensureSliceWorktree: relative worktreeRoot resolved against repoPath", async () => {
  const repo = await tmpDir("wm-rel-root-");
  await initGitRepo(repo);

  // Use a relative path — resolved against repoPath
  const relRoot = "../wm-rel-wts-" + Date.now();
  const expectedRoot = path.resolve(repo, relRoot);

  const result = await ensureSliceWorktree(repo, "SLICE-88", {
    config: { loop: { worktreeMode: true, worktreeRoot: relRoot } },
    featureId: "FEAT-001"
  });

  assert.ok(result);
  const expectedPath = path.join(expectedRoot, "SLICE-88");
  assert.equal(result.worktreePath, expectedPath, "relative root should be resolved to absolute");

  try {
    await exec(`git -C "${repo}" worktree remove --force "${result.worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${result.branchName}"`);
    await fs.rmdir(expectedRoot).catch(() => {});
  } catch {
    // best-effort cleanup
  }
});

test("ensureSliceWorktree: default worktreeRoot = sibling dir <repoBasename>-worktrees", async () => {
  const repo = await tmpDir("wm-default-root-");
  await initGitRepo(repo);

  const repoBasename = path.basename(repo);
  const expectedRoot = path.join(path.dirname(repo), `${repoBasename}-worktrees`);

  const result = await ensureSliceWorktree(repo, "SLICE-01", {
    config: { loop: { worktreeMode: true } }, // no worktreeRoot
    featureId: "FEAT-001"
  });

  assert.ok(result);
  assert.ok(
    result.worktreePath.startsWith(expectedRoot),
    `expected path under ${expectedRoot}, got ${result.worktreePath}`
  );

  try {
    await exec(`git -C "${repo}" worktree remove --force "${result.worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${result.branchName}"`);
    await fs.rm(expectedRoot, { recursive: true, force: true }).catch(() => {});
  } catch {
    // best-effort cleanup
  }
});

// ---------------------------------------------------------------------------
// 6. Integration with startSlice — worktreePath written to workflow-state
//    and slice frontmatter when mode is on
// ---------------------------------------------------------------------------

test("startSlice: worktreePath written to workflow-state and frontmatter when worktreeMode on", async () => {
  const repo = await tmpDir("wm-integration-");
  const worktreeRoot = path.join(os.tmpdir(), `wm-int-root-${Date.now()}`);

  // Write loop.json BEFORE initGitRepo so git add -A captures it in the initial commit.
  await writeLoopJson(repo, {
    worktreeMode: true,
    worktreeRoot
  });

  const config = {
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations",
      worktreeMode: true,
      worktreeRoot
    },
    stack: {}
  };

  // Add a feature and create a slice so startSlice has a real slice file.
  // These writes happen before initGitRepo so they're part of the initial commit.
  const feat = await addFeature(repo, { title: "Worktree test feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);

  // Fix placeholder ACs so startSlice doesn't abort on AC linter
  const sliceContent = await fs.readFile(slice.path, "utf8");
  await fs.writeFile(
    slice.path,
    sliceContent.replace(
      /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
      "- [ ] AC-2: Worktree is created and path is persisted"
    )
  );

  // initGitRepo runs git add -A + commit, so ALL files written above are captured.
  await initGitRepo(repo);

  const result = await startSlice(repo, slice.id, { config, dispatch: false });

  // result should include worktree info
  assert.ok(result.worktree, "result.worktree should be present when mode is on");
  assert.equal(result.worktree.created, true);

  // workflow-state.currentRun.worktreePath should be set
  const state = await readWorkflowState(repo);
  assert.ok(
    state?.currentRun?.worktreePath,
    "workflow-state.currentRun.worktreePath should be written"
  );
  assert.equal(typeof state.currentRun.worktreePath, "string");

  // Slice frontmatter worktreePath should be written
  const updatedContent = await fs.readFile(slice.path, "utf8");
  assert.match(
    updatedContent,
    /worktreePath:/,
    "slice frontmatter should contain worktreePath field"
  );

  // Clean up worktree
  try {
    const worktreePath = state.currentRun.worktreePath;
    await exec(`git -C "${repo}" worktree remove --force "${worktreePath}"`);
    await exec(`git -C "${repo}" branch -D "${result.worktree.branchName}"`);
    await fs.rm(worktreeRoot, { recursive: true, force: true }).catch(() => {});
  } catch {
    // best-effort cleanup
  }
});

test("startSlice: worktreeMode false → no worktree field, no state mutation", async () => {
  const repo = await tmpDir("wm-integration-off-");
  // No git repo needed since worktreeMode is off
  await writeLoopJson(repo, { worktreeMode: false });

  const config = {
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations",
      worktreeMode: false
    },
    stack: {}
  };

  const result = await startSlice(repo, "SLICE-99", { config, dispatch: false });

  // result.worktree should be absent (undefined)
  assert.equal(result.worktree, undefined, "result.worktree should be undefined when mode is off");

  // workflow-state may or may not exist; if it does, worktreePath should not be set
  const state = await readWorkflowState(repo);
  if (state?.currentRun) {
    assert.ok(
      !state.currentRun.worktreePath,
      "worktreePath should not be set when worktreeMode is off"
    );
  }
});

// ---------------------------------------------------------------------------
// 7. Rollback on frontmatter write failure (FEAT-060-contracts § failure-atomicity)
// ---------------------------------------------------------------------------

test("applyWorktreeResult: frontmatter write failure rolls back workflow-state.worktreePath", async () => {
  const repo = await tmpDir("wm-rollback-real-");
  await initGitRepo(repo);
  const worktreeRoot = path.join(os.tmpdir(), `wm-rollback-real-root-${Date.now()}`);
  const stateDir = path.join(repo, ".claude/state/crew");
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(
    path.join(stateDir, "workflow-state.json"),
    JSON.stringify({ version: "1.0", currentRun: {} }, null, 2)
  );
  // Directory at the sliceFile path → writeFile throws EISDIR
  const sliceFileAsDir = path.join(repo, "slice-as-dir");
  await fs.mkdir(sliceFileAsDir);

  const { applyWorktreeResult } = await import("../scripts/lib/slice-linker/start-slice.mjs");

  let threw = false;
  try {
    await (applyWorktreeResult as any)(
      repo,
      "SLICE-99",
      sliceFileAsDir,
      { loop: { worktreeMode: true, worktreeRoot } },
      "FEAT-099"
    );
  } catch (err) {
    threw = true;
    assert.ok(err instanceof Error);
  }
  assert.equal(threw, true, "applyWorktreeResult must throw on frontmatter write failure");

  const stateAfter = JSON.parse(
    await fs.readFile(path.join(stateDir, "workflow-state.json"), "utf8")
  );
  assert.ok(
    !stateAfter?.currentRun?.worktreePath,
    `workflow-state.worktreePath must be cleared after rollback; got: ${stateAfter?.currentRun?.worktreePath}`
  );

  // Best-effort worktree cleanup
  try {
    const wl = await exec(`git -C "${repo}" worktree list --porcelain`);
    const match = wl.stdout.match(/worktree (.+SLICE-99)/);
    if (match) {
      await exec(`git -C "${repo}" worktree remove --force "${match[1].trim()}"`);
      await exec(`git -C "${repo}" branch -D "slice/SLICE-99-FEAT-099"`);
    }
  } catch {
    // best-effort
  }
});

test("applyWorktreeResult: null sliceFile + worktreeMode on → throws (failure-atomicity)", async () => {
  const repo = await tmpDir("wm-null-slice-");
  await initGitRepo(repo);
  const worktreeRoot = path.join(os.tmpdir(), `wm-null-slice-root-${Date.now()}`);

  const { applyWorktreeResult } = await import("../scripts/lib/slice-linker/start-slice.mjs");

  let threw = false;
  try {
    await (applyWorktreeResult as any)(
      repo,
      "SLICE-99",
      null,
      { loop: { worktreeMode: true, worktreeRoot } },
      "FEAT-099"
    );
  } catch (err: any) {
    threw = true;
    assert.match(err.message, /failure-atomicity invariant/);
  }
  assert.equal(threw, true, "must throw when sliceFile null + worktreeMode on");

  // Best-effort worktree cleanup
  try {
    const wl = await exec(`git -C "${repo}" worktree list --porcelain`);
    const match = wl.stdout.match(/worktree (.+SLICE-99)/);
    if (match) {
      await exec(`git -C "${repo}" worktree remove --force "${match[1].trim()}"`);
      await exec(`git -C "${repo}" branch -D "slice/SLICE-99-FEAT-099"`);
    }
  } catch {
    // best-effort
  }
});

test.skip("legacy structural rollback check (skipped — superseded by direct applyWorktreeResult tests)", async () => {
  const repo = await tmpDir("wm-rollback-");
  await initGitRepo(repo);
  await writeLoopJson(repo, {
    worktreeMode: true,
    worktreeRoot: path.join(os.tmpdir(), `wm-rollback-root-${Date.now()}`)
  });
  // Commit loop.json so tree stays clean
  await exec(`git -C "${repo}" add -A`, { env: GIT_ENV });
  await exec(`git -C "${repo}" commit -m "setup"`, { env: GIT_ENV });

  // Create a SLICE file then make it read-only so writeFile throws on it
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(sliceDir, { recursive: true });
  const sliceFile = path.join(sliceDir, "SLICE_99_ROLLBACK-TEST.md");
  await fs.writeFile(
    sliceFile,
    `---\nid: SLICE-99\nstatus: pending\nfeature: FEAT-099\n---\n# SLICE-99: rollback test\n\n## Acceptance criteria\n\n- [ ] AC-1: All tests pass and lint is clean\n`
  );
  // Seed backlog entry so slice resolution does not blow up
  const featDir = path.join(repo, ".claude/artifacts/loop/backlog/triaged");
  await fs.mkdir(featDir, { recursive: true });
  await fs.writeFile(
    path.join(featDir, "FEAT-099.md"),
    `---\nid: FEAT-099\nstatus: triaged\npriority: P3\n---\n# t\n`
  );

  // Monkey-patch fs.writeFile to throw on the slice file path only
  const origWriteFile = fs.writeFile.bind(fs);
  const trap = async (p: any, ...rest: any[]) => {
    if (typeof p === "string" && p === sliceFile) {
      throw new Error("simulated frontmatter write failure");
    }
    return (origWriteFile as any)(p, ...rest);
  };
  (fs as any).writeFile = trap;

  try {
    // Use applyWorktreeResult directly to bypass slice-start ceremony
    const { applyWorktreeResult: _apply } =
      await import("../scripts/lib/slice-linker/start-slice.mjs").catch(
        () => ({ applyWorktreeResult: null }) as any
      );
    // applyWorktreeResult is not exported — exercise the rollback by calling
    // ensureSliceWorktree directly + verifying state stays empty when the
    // wrapper would have failed. This is a structural check on the rollback
    // helper: writeWorktreePathToState writes, rollback should clear it.
    const { ensureSliceWorktree } = await import("../scripts/lib/worktree-manager.mjs");
    const result = await ensureSliceWorktree(repo, "SLICE-99", {
      config: {
        loop: {
          worktreeMode: true,
          worktreeRoot: path.join(os.tmpdir(), `wm-rollback-direct-${Date.now()}`)
        }
      },
      featureId: "FEAT-099"
    });
    assert.ok(result, "ensureSliceWorktree should create the worktree (test setup)");

    // Now manually simulate the rollback scenario: write state, then attempt
    // frontmatter write (which will throw via our trap), then verify rollback.
    const { writeFile } = fs;
    let stateAfter: any = null;
    try {
      const stateDir = path.join(repo, ".claude/state/crew");
      await fs.mkdir(stateDir, { recursive: true });
      // Pre-write workflow-state with no worktreePath
      await origWriteFile(
        path.join(stateDir, "workflow-state.json"),
        JSON.stringify({ version: "1.0", currentRun: {} }, null, 2)
      );
      // Use the helper from start-slice to write state then attempt frontmatter
      // For this test we simulate the contract: state-then-frontmatter, frontmatter throws, rollback.
      // Direct verification: read state after the operation that should have rolled back.
      stateAfter = JSON.parse(
        await fs.readFile(path.join(stateDir, "workflow-state.json"), "utf8")
      );
      assert.ok(
        !stateAfter?.currentRun?.worktreePath,
        "workflow-state.worktreePath must be cleared / absent after rollback"
      );
      void writeFile; // silence unused
    } finally {
      // Cleanup worktree
      try {
        await exec(`git -C "${repo}" worktree remove --force "${result!.worktreePath}"`);
        await exec(`git -C "${repo}" branch -D "${result!.branchName}"`);
      } catch {
        // best-effort
      }
    }
  } finally {
    (fs as any).writeFile = origWriteFile;
  }
});

// ---------------------------------------------------------------------------
// 8. Failure-atomicity: null sliceFile + worktreeMode on → refuse half-write
// ---------------------------------------------------------------------------

// applyWorktreeResult is not exported, so this invariant is verified
// indirectly via the structural assertion in test 7 plus the explicit
// throw added in src/scripts/lib/slice-linker/start-slice.mts. A direct
// negative test would require exporting the helper, which the contract
// forbids (only ensureSliceWorktree is public surface).
