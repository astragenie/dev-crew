// tests/architect-feature.test.mjs
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// commands/architect-feature.md moved from crew/commands/ to the repo-root
// commands/ in the devcrew command-map merge (SLICE-14).
const CMD = path.join(repoRoot, "..", "commands", "architect-feature.md");

test("commands/architect-feature.md exists", async () => {
  await expect(fs.access(CMD)).resolves.toBeFalsy();
});

test("architect-feature has description frontmatter", async () => {
  const text = await fs.readFile(CMD, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(match, "file must start with YAML frontmatter").toBeTruthy();
  expect(match[1]!, "frontmatter must have non-empty description:").toMatch(/^description:\s*.+/m);
});

test("architect-feature references crew:researcher in Phase 1", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must dispatch crew:researcher").toMatch(/crew:researcher/);
});

test("architect-feature references crew:architect in Phase 2", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must dispatch crew:architect").toMatch(/crew:architect/);
});

test("architect-feature documents ## Inferred Tags section requirement", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must reference ## Inferred Tags").toMatch(/Inferred Tags/);
});

test("architect-feature documents tag write-back as additive", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must document that tag write-back never removes existing tags").toMatch(/additive|never remove|net.new/i);
});

test("architect-feature documents --auto-start flag", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must document --auto-start flag").toMatch(/--auto-start/);
});

test("architect-feature documents FEAT-not-found error handling", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must document FEAT-not-found error case").toMatch(/not found|paths tried|halt/i);
});

test("architect-feature documents re-run idempotency (Feature Revision prefix)", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must use 'Feature Revision' prefix to distinguish re-run sections from orchestrate-slice Revision sections").toMatch(/Feature Revision/);
});

test("architect-feature documents --auto-start clean exit when no pending slice", async () => {
  const text = await fs.readFile(CMD, "utf8");
  expect(text, "command must document exit 0 when no pending slice found under --auto-start").toMatch(/exit 0/);
});
