import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { checkpointCommit } from "../scripts/lib/checkpoint-commit.mjs";
const execFile = promisify(execFileCallback);
async function initGitRepo(prefix) {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    await execFile("git", ["init", "--quiet"], { cwd: repo });
    await execFile("git", ["config", "user.email", "t@e"], { cwd: repo });
    await execFile("git", ["config", "user.name", "t"], { cwd: repo });
    await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });
    return repo;
}
async function writeFile(repo, name, content) {
    await fs.writeFile(path.join(repo, name), content, "utf8");
}
// Creates repo with one tracked file already committed (so git add -u picks up modifications).
async function initRepoWithTrackedFile(prefix) {
    const repo = await initGitRepo(prefix);
    await writeFile(repo, "base.txt", "initial");
    await execFile("git", ["add", "base.txt"], { cwd: repo });
    await execFile("git", ["commit", "-m", "initial"], { cwd: repo });
    return repo;
}
test("checkpointCommit writes commit and returns sha", async () => {
    const repo = await initRepoWithTrackedFile("cc-basic-");
    await writeFile(repo, "base.txt", "modified");
    const result = await checkpointCommit({
        repoPath: repo,
        sliceId: "SLICE-99",
        summary: "initial work"
    });
    assert.equal(result.committed, true);
    assert.ok(result.sha && result.sha.length === 40, "sha should be 40 char hex");
    assert.equal(result.reason, undefined);
});
test("checkpointCommit clean tree returns {committed:false, reason:'clean'}", async () => {
    const repo = await initRepoWithTrackedFile("cc-clean-");
    const result = await checkpointCommit({
        repoPath: repo,
        sliceId: "SLICE-99",
        summary: "nothing"
    });
    assert.equal(result.committed, false);
    assert.equal(result.reason, "clean");
});
test("checkpointCommit subject truncated to 72 JS code-units with ellipsis", async () => {
    const repo = await initRepoWithTrackedFile("cc-trunc-");
    await writeFile(repo, "base.txt", "changed");
    const longSummary = "a".repeat(80);
    await checkpointCommit({ repoPath: repo, sliceId: "SLICE-99", summary: longSummary });
    const { stdout } = await execFile("git", ["log", "-1", "--format=%s"], { cwd: repo });
    const subject = stdout.trim();
    assert.ok(subject.length <= 72, `subject length ${subject.length} exceeds 72`);
    assert.ok(subject.endsWith("…"), "subject should end with ellipsis");
});
test("checkpointCommit body includes only non-empty sections", async () => {
    const repo = await initRepoWithTrackedFile("cc-body-");
    await writeFile(repo, "base.txt", "body-test");
    await checkpointCommit({
        repoPath: repo,
        sliceId: "SLICE-99",
        summary: "with body",
        decisions: "use approach X",
        remainingWork: "",
        failedApproaches: "tried Y"
    });
    const { stdout } = await execFile("git", ["log", "-1", "--format=%B"], { cwd: repo });
    const body = stdout.trim();
    assert.ok(body.includes("## Decisions"), "should include decisions section");
    assert.ok(body.includes("## Failed approaches"), "should include failed approaches section");
    assert.ok(!body.includes("## Remaining work"), "should omit empty remaining work section");
});
test("checkpointCommit body omitted when all sections empty", async () => {
    const repo = await initRepoWithTrackedFile("cc-nobody-");
    await writeFile(repo, "base.txt", "no-body-test");
    await checkpointCommit({ repoPath: repo, sliceId: "SLICE-99", summary: "no body" });
    const { stdout } = await execFile("git", ["log", "-1", "--format=%B"], { cwd: repo });
    const lines = stdout.trim().split("\n");
    assert.equal(lines.length, 1, "commit message should be subject only");
});
test("checkpointCommit stagedOnly commits only staged changes", async () => {
    const repo = await initRepoWithTrackedFile("cc-staged-");
    await writeFile(repo, "e.txt", "staged");
    await execFile("git", ["add", "e.txt"], { cwd: repo });
    await writeFile(repo, "f.txt", "unstaged");
    const result = await checkpointCommit({
        repoPath: repo,
        sliceId: "SLICE-99",
        summary: "staged only",
        stagedOnly: true
    });
    assert.equal(result.committed, true);
    const { stdout } = await execFile("git", ["show", "--name-only", "--format="], { cwd: repo });
    const files = stdout.trim().split("\n");
    assert.ok(files.includes("e.txt"), "staged file should be committed");
    assert.ok(!files.includes("f.txt"), "unstaged file should not be committed");
});
test("checkpointCommit stagedOnly with nothing staged returns {committed:false, reason:'clean'}", async () => {
    const repo = await initRepoWithTrackedFile("cc-staged-clean-");
    await writeFile(repo, "g.txt", "untracked");
    const result = await checkpointCommit({
        repoPath: repo,
        sliceId: "SLICE-99",
        summary: "empty stage",
        stagedOnly: true
    });
    assert.equal(result.committed, false);
    assert.equal(result.reason, "clean");
});
