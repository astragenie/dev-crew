import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateBacklogWrites } from "../scripts/validate-backlog-writes.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function mkTmp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-backlog-writes-"));
}

async function writeFileAt(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

test("the real repo scan is clean — zero disallowed raw backlog writers", async () => {
  const result = await validateBacklogWrites(REPO_ROOT);
  assert.equal(
    result.ok,
    true,
    `expected a clean scan, got: ${result.findings.map((f) => `${f.file}:${f.line} — ${f.detail}`).join("; ")}`
  );
});

test("flags a raw fs.writeFile against a sliceFile-named variable outside BacklogStore", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/some-new-module.mts",
    `import fs from "node:fs/promises";
import { mergeFrontmatter } from "./frontmatter.mjs";

export async function badWrite(sliceFile: string) {
  const content = await fs.readFile(sliceFile, "utf8");
  const updated = mergeFrontmatter(content, { status: "done" });
  await fs.writeFile(sliceFile, updated);
}
`
  );

  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]?.file, "src/scripts/lib/some-new-module.mts");
});

test("flags a raw fs.renameSync against a featureFilePath-named variable outside BacklogStore", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/another-module.mts",
    `import fs from "node:fs";

export function badMove(featureFilePath: string, target: string) {
  fs.renameSync(featureFilePath, target);
}
`
  );

  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, false);
  assert.equal(result.findings[0]?.file, "src/scripts/lib/another-module.mts");
});

test("does not flag a raw write against a generic-named path variable (avoids false positives)", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/grade-like-module.mts",
    `import fs from "node:fs/promises";

export async function writeGradeLike(target: string, body: string) {
  await fs.writeFile(target, body);
}
`
  );

  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("the BacklogStore module itself is allowlisted regardless of content", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/backlog-store.mts",
    `import fs from "node:fs/promises";

export async function updateSliceFrontmatter(sliceFile: string) {
  await fs.writeFile(sliceFile, "whatever");
}
`
  );

  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("doctor.mts's content-level reconciliation writer is allowlisted (DEC-076 classification)", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/doctor.mts",
    `import fs from "node:fs/promises";

export async function reconcile(sliceFile: string) {
  await fs.writeFile(sliceFile, "reconciled");
}
`
  );

  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("pm-apply.mts's body-section content editor is allowlisted (DEC-076 classification)", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/pm-apply.mts",
    `import fs from "node:fs/promises";

export async function appendBody(featureFile: string) {
  await fs.writeFile(featureFile, "new body");
}
`
  );

  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("src/tests/** fixture writers are never scanned (guard only walks src/scripts/)", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/tests/some-fixture.mts",
    `import fs from "node:fs/promises";

export async function seedFixture(sliceFile: string) {
  await fs.writeFile(sliceFile, "fixture");
}
`
  );
  // No src/scripts dir at all — guard should just find nothing to scan, not throw.
  const result = await validateBacklogWrites(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});
