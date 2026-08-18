// FEAT-214 item 3 / AC-3 — intakeFromText was a hardcoded FEAT-000 stub.
// This pins the real implementation: it writes a genuine pending/ FEAT
// file (priority: null — scoring is deferred to the normal PM/triage
// phase), supports --dry-run without writing, and refuses --spec with a
// not_implemented error rather than writing a wrong artifact silently.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { intakeFromText } from "../scripts/lib/intake.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("intakeFromText writes a real pending FEAT with priority null and the free text in the body", async () => {
  const repo = await tmpRepo("intake-real-");
  const result = await intakeFromText({
    repoPath: repo,
    text: "Users want dark mode in the dashboard settings page",
    flags: { deep: false, spec: false, dryRun: false }
  });

  assert.ok(result.filePath, "filePath must be set for a real (non-dry-run) write");
  assert.match(result.featId, /^FEAT-\d+/);
  assert.equal(result.priority, null, "priority is unset — scoring is deferred to /runner:triage");

  const content = await fs.readFile(result.filePath!, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "pending");
  assert.equal(frontmatter.priority, null);
  assert.ok(body.includes("dark mode"), "body must include the original free text");
});

test("intakeFromText derives a title from the first line of the free text", async () => {
  const repo = await tmpRepo("intake-title-");
  const result = await intakeFromText({
    repoPath: repo,
    text: "Fix flaky retry timer in the queue worker\n\nMore detail on the second line.",
    flags: { deep: false, spec: false, dryRun: false }
  });
  const content = await fs.readFile(result.filePath!, "utf8");
  assert.match(content, /Fix flaky retry timer in the queue worker/);
});

test("intakeFromText --dry-run returns a preview and does not write a file", async () => {
  const repo = await tmpRepo("intake-dryrun-");
  const result = await intakeFromText({
    repoPath: repo,
    text: "Preview only, should not touch disk",
    flags: { deep: false, spec: false, dryRun: true }
  });

  assert.equal(result.filePath, undefined, "dry-run must not set filePath");
  assert.ok(result.dryRunPreview && result.dryRunPreview.length > 0);

  const pendingDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
  const exists = await fs
    .access(pendingDir)
    .then(() => true)
    .catch(() => false);
  assert.ok(!exists, "dry-run must not create the pending/ directory");
});

test("intakeFromText --spec throws a not_implemented error instead of writing a wrong artifact", async () => {
  const repo = await tmpRepo("intake-spec-");
  await assert.rejects(
    () =>
      intakeFromText({
        repoPath: repo,
        text: "Epic-level request needing a full SPEC",
        flags: { deep: false, spec: true, dryRun: false }
      }),
    /not_implemented/
  );
});

test("intakeFromText rejects empty/whitespace-only text", async () => {
  const repo = await tmpRepo("intake-empty-");
  await assert.rejects(
    () =>
      intakeFromText({
        repoPath: repo,
        text: "   ",
        flags: { deep: false, spec: false, dryRun: false }
      }),
    /non-empty/
  );
});

test("intakeFromText assigns sequential ids across repeated calls", async () => {
  const repo = await tmpRepo("intake-sequential-");
  const first = await intakeFromText({
    repoPath: repo,
    text: "First request",
    flags: { deep: false, spec: false, dryRun: false }
  });
  const second = await intakeFromText({
    repoPath: repo,
    text: "Second request",
    flags: { deep: false, spec: false, dryRun: false }
  });
  assert.notEqual(first.featId, second.featId);
});
