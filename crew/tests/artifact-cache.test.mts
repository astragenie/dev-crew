import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getCachedArtifact, _cacheForTesting } from "../scripts/lib/artifact-cache.mjs";

async function writeTmp(content: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-cache-"));
  const filePath = path.join(dir, "artifact.md");
  await fs.writeFile(filePath, content, "utf8");
  return { dir, filePath };
}

test("getCachedArtifact: returns parsed frontmatter and body", async () => {
  const { dir, filePath } = await writeTmp(
    "---\nid: SLICE-1\ntitle: Test\n---\n# Heading\nBody text."
  );
  try {
    const result = await getCachedArtifact(filePath);
    expect(result.fm.id).toBe("SLICE-1");
    expect(result.fm.title).toBe("Test");
    expect(result.body.includes("# Heading")).toBeTruthy();
    expect(typeof result.mtimeMs === "number").toBeTruthy();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("getCachedArtifact: second call returns cached result without re-reading", async () => {
  const { dir, filePath } = await writeTmp("---\nid: SLICE-2\n---\n# Two");
  const cache = _cacheForTesting();
  cache.delete(filePath); // ensure no prior entry
  try {
    const first = await getCachedArtifact(filePath);
    const second = await getCachedArtifact(filePath);
    // Same object reference means cache was hit
    expect(first).toBe(second);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("getCachedArtifact: cache invalidated when file changes (mtime advances)", async () => {
  const { dir, filePath } = await writeTmp("---\nid: OLD\n---\nOld body");
  try {
    const first = await getCachedArtifact(filePath);
    expect(first.fm.id).toBe("OLD");

    // Write new content and force a new mtime by delaying slightly
    await new Promise((r) => setTimeout(r, 10));
    await fs.writeFile(filePath, "---\nid: NEW\n---\nNew body", "utf8");

    const second = await getCachedArtifact(filePath);
    expect(second.fm.id).toBe("NEW");
    expect(first).not.toBe(second);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("getCachedArtifact: throws for missing file", async () => {
  try {
    await getCachedArtifact("/nonexistent/path/missing.md");
    throw new Error("expected getCachedArtifact to reject");
  } catch (err) {
    expect((err as NodeJS.ErrnoException).code).toBe("ENOENT");
  }
});
