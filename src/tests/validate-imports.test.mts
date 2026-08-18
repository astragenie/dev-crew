// Tests for validate-imports.mts — CI sub-module import boundary guard.
//
// blockedPatterns is an explicit per-module allowlist, not a glob over the
// boundary directory (see the module doc header). rev-537 flagged that
// qa-gate-preflight.mts and artifact-lock-writer.mts (both FEAT-264
// slice-linker sub-modules, both exported/consumed from the barrel) lacked
// a corresponding blockedPatterns entry — a deep import of either would
// have gone undetected. These tests pin the fix.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateImports } from "../scripts/validate-imports.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function mkTmp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-validate-imports-"));
}

async function writeFileAt(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

test("the real repo scan is clean — zero boundary violations", async () => {
  const result = await validateImports(REPO_ROOT);
  assert.equal(
    result.ok,
    true,
    `expected a clean scan, got: ${result.violations
      .map((v) => `${v.file}:${v.line} — ${v.detail}`)
      .join("; ")}`
  );
});

test("flags a deep import of slice-linker/qa-gate-preflight.mjs from outside slice-linker/", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/some-consumer.mts",
    `import { needsQaGatePreflight } from "./slice-linker/qa-gate-preflight.mjs";

export { needsQaGatePreflight };
`
  );

  const result = await validateImports(root);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.file, "src/scripts/lib/some-consumer.mts");
  assert.equal(result.violations[0]?.barrel, "src/scripts/lib/slice-linker.mts");
});

test("flags a deep import of slice-linker/artifact-lock-writer.mjs from outside slice-linker/", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/another-consumer.mts",
    `import { writeArtifactLock } from "./slice-linker/artifact-lock-writer.mjs";

export { writeArtifactLock };
`
  );

  const result = await validateImports(root);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.file, "src/scripts/lib/another-consumer.mts");
  assert.equal(result.violations[0]?.barrel, "src/scripts/lib/slice-linker.mts");
});

test("does not flag an import of the slice-linker.mts barrel itself", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/well-behaved-consumer.mts",
    `import { writeArtifactLock } from "./slice-linker.mjs";

export { writeArtifactLock };
`
  );

  const result = await validateImports(root);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("does not flag a sub-module importing a sibling sub-module inside the same boundary", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/slice-linker/close-slice.mts",
    `import { removeArtifactLock } from "./artifact-lock-writer.mjs";

export { removeArtifactLock };
`
  );

  const result = await validateImports(root);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});
