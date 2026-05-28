import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { planRelease, releaseStatus } from "../scripts/lib/release-planner.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";
import { decomposeSpec } from "../scripts/lib/spec-decomposer.mjs";
import { listBacklog } from "../scripts/lib/backlog-parser.mjs";
async function tmpRepo(prefix) {
    return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
test("planRelease writes report for an empty release with status EMPTY", async () => {
    const repo = await tmpRepo("al-release-empty-");
    const result = await planRelease(repo, { version: "v1.0.0" });
    assert.equal(result.version, "v1.0.0");
    assert.equal(result.status, "EMPTY");
    const body = await fs.readFile(result.artifactPath, "utf8");
    assert.match(body, /Release v1\.0\.0/);
    assert.match(body, /Status: \*\*EMPTY\*\*/);
});
test("planRelease normalizes version without v prefix", async () => {
    const repo = await tmpRepo("al-release-norm-");
    const result = await planRelease(repo, { version: "1.0.0" });
    assert.equal(result.version, "v1.0.0");
    assert.match(result.artifactPath, /v1\.0\.0\.md$/);
});
test("planRelease groups by spec and reports IN_PROGRESS when partial", async () => {
    const repo = await tmpRepo("al-release-partial-");
    const spec = await addSpec(repo, { type: "prd", title: "PRD" });
    await updateSpecFrontmatter(spec.filePath, { status: "approved", target_release: "v1.1.0" });
    await decomposeSpec(repo, spec.id, ["A", "B", "C"]);
    const backlog = await listBacklog(repo);
    await moveFeature(backlog[0].filePath, "done");
    const result = await planRelease(repo, { version: "v1.1.0" });
    assert.equal(result.status, "IN_PROGRESS");
    assert.equal(result.shipped, 1);
    assert.equal(result.inFlight, 2);
    assert.deepEqual(result.bySpec, [spec.id]);
    const body = await fs.readFile(result.artifactPath, "utf8");
    assert.match(body, new RegExp(spec.id));
    assert.match(body, /shipped/);
    // The summary header reports "In flight: 2"; individual entries show
    // their specific badge (pending/triaged) — both are valid evidence.
    assert.match(body, /In flight: 2/);
});
test("planRelease reports READY when every targeted feature is done", async () => {
    const repo = await tmpRepo("al-release-ready-");
    const a = await addFeature(repo, { title: "A", target_release: "v2.0.0" });
    const b = await addFeature(repo, { title: "B", target_release: "v2.0.0" });
    await moveFeature(a.filePath, "done");
    await moveFeature(b.filePath, "done");
    const result = await planRelease(repo, { version: "v2.0.0" });
    assert.equal(result.status, "READY");
    assert.equal(result.shipped, 2);
    assert.equal(result.inFlight, 0);
    const body = await fs.readFile(result.artifactPath, "utf8");
    assert.match(body, /Status: \*\*READY\*\*/);
    assert.match(body, /Cutting the release/);
});
test("planRelease separates standalone features from spec-derived ones", async () => {
    const repo = await tmpRepo("al-release-mixed-");
    const spec = await addSpec(repo, { type: "prd", title: "Spec one" });
    await updateSpecFrontmatter(spec.filePath, { status: "approved", target_release: "v1.0.0" });
    await decomposeSpec(repo, spec.id, ["From spec"]);
    await addFeature(repo, { title: "Standalone work", target_release: "v1.0.0" });
    const result = await planRelease(repo, { version: "v1.0.0" });
    const body = await fs.readFile(result.artifactPath, "utf8");
    assert.match(body, /## Standalone features/);
    assert.match(body, new RegExp(`## ${spec.id}`));
});
test("releaseStatus returns counts without writing a file", async () => {
    const repo = await tmpRepo("al-release-status-");
    await addFeature(repo, { title: "A", target_release: "v1.0.0" });
    const b = await addFeature(repo, { title: "B", target_release: "v1.0.0" });
    await moveFeature(b.filePath, "triaged", { priority: "P1", category: "feature" });
    await addFeature(repo, { title: "C", target_release: "v2.0.0" });
    const status = await releaseStatus(repo, { version: "v1.0.0" });
    assert.equal(status.total, 2);
    assert.equal(status.pending, 1);
    assert.equal(status.triaged, 1);
    // No file artifact
    const releasesDir = path.join(repo, ".claude/artifacts/loop/releases");
    const exists = await fs
        .access(releasesDir)
        .then(() => true)
        .catch(() => false);
    assert.equal(exists, false);
});
