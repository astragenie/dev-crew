// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { runBacklogEnrich } from "../scripts/loop.mjs";
import { clearAll } from "../scripts/lib/cache.mjs";
import { flushAuditLog } from "../scripts/lib/auto-dispatch.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createFeature(
  repoRoot: string,
  id: string,
  state: string = "triaged",
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repoRoot, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fmLines = Object.entries({ id, status: state, priority: "P2", ...extraFm }).map(
    ([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
      return `${k}: ${v}`;
    }
  );
  const content = `---\n${fmLines.join("\n")}\n---\n# ${id}: Test feature\n\nTest feature description.\n`;
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

function auditLogPath(repoRoot: string): string {
  return path.join(repoRoot, ".claude/artifacts/loop/auto-dispatch.jsonl");
}

async function readJsonLines(filePath: string): Promise<object[]> {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

// ---------------------------------------------------------------------------
// AC-2 / AC-8: refusal test — non-zero exit, stderr message, no marker files
// ---------------------------------------------------------------------------

test("backlog enrich: refuses with non-zero exit when triaged features need classification (AC-2/AC-8)", async () => {
  const repo = await tmpRepo("be-refusal-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged");
  await createFeature(repo, "FEAT-002", "triaged");

  // Capture stderr and process.exitCode
  const stderrLines: string[] = [];
  const origError = console.error.bind(console);
  console.error = (...args: any[]) => stderrLines.push(args.join(" "));

  const originalExitCode = process.exitCode;
  process.exitCode = undefined as any;

  let result: any;
  try {
    result = await runBacklogEnrich(repo, {});
  } finally {
    console.error = origError;
  }

  // Exit code must be 1
  assert.equal(process.exitCode, 1, "process.exitCode must be 1 when features need classification");
  process.exitCode = originalExitCode;

  // Result must carry refused: true
  assert.equal(result.refused, true, "result.refused must be true");
  assert.equal(result.enriched, 0, "enriched must be 0 on refusal");

  // stderr must name DEC-011 and the slash flow
  const stderrText = stderrLines.join(" ");
  assert.ok(stderrText.includes("DEC-011"), `stderr must reference DEC-011, got: ${stderrText}`);
  assert.ok(
    stderrText.includes("/loop:backlog-enrich"),
    `stderr must name the slash flow, got: ${stderrText}`
  );
  assert.ok(
    stderrText.includes("CLI auto-dispatch removed"),
    `stderr must include refusal reason, got: ${stderrText}`
  );
  assert.ok(
    stderrText.includes("2 feature(s)"),
    `stderr must quote count of features needing classification, got: ${stderrText}`
  );

  // Audit log must have an entry with skipReason: cli-refusal
  await flushAuditLog(repo);
  const lines = await readJsonLines(auditLogPath(repo));
  const enrichEntries = lines.filter(
    (e: any) => e.agent === "loop:architect" && e.parentCommand === "backlog enrich"
  );
  assert.equal(enrichEntries.length, 1, "exactly one audit log entry for backlog enrich");
  const entry = enrichEntries[0] as any;
  assert.equal(entry.skipped, true, "audit entry skipped must be true");
  assert.equal(entry.skipReason, "cli-refusal", "audit entry skipReason must be cli-refusal");
  assert.equal(entry.ok, false, "audit entry ok must be false on refusal");

  // No marker files under pending-dispatch/
  const markerDir = path.join(repo, ".claude/artifacts/loop/pending-dispatch");
  const markerExists = await fs
    .access(markerDir)
    .then(() => true)
    .catch(() => false);
  if (markerExists) {
    const markers = await fs.readdir(markerDir);
    assert.equal(markers.length, 0, "no marker files should be written on refusal");
  }

  // Frontmatter on the triaged FEATs must NOT be modified
  const feat1Content = await fs.readFile(
    path.join(repo, ".claude/artifacts/loop/backlog/triaged/FEAT-001.md"),
    "utf8"
  );
  assert.ok(
    !feat1Content.includes("tags:"),
    "FEAT-001 frontmatter must not be modified on refusal"
  );
});

// ---------------------------------------------------------------------------
// Already-tagged FEATs: no refusal, returns counts correctly
// ---------------------------------------------------------------------------

test("backlog enrich: no refusal when all triaged FEATs already have tags", async () => {
  const repo = await tmpRepo("be-already-tagged-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged", { tags: "[api-change]" });
  await createFeature(repo, "FEAT-002", "triaged", { needs_contract: "true" });

  const originalExitCode = process.exitCode;
  process.exitCode = undefined as any;

  const result = await runBacklogEnrich(repo, {});

  // Exit code must NOT be set to 1
  assert.notEqual(process.exitCode, 1, "process.exitCode must not be 1 when all already tagged");
  process.exitCode = originalExitCode;

  assert.equal(result.enriched, 0, "enriched should be 0");
  assert.equal(result.alreadyTagged, 2, "alreadyTagged should be 2");
  assert.ok(!result.refused, "refused should not be set");
});

// ---------------------------------------------------------------------------
// Empty backlog: no refusal, zero counts
// ---------------------------------------------------------------------------

test("backlog enrich: no refusal when no triaged FEATs exist", async () => {
  const repo = await tmpRepo("be-empty-");
  clearAll();

  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });

  const originalExitCode = process.exitCode;
  process.exitCode = undefined as any;

  const result = await runBacklogEnrich(repo, {});

  assert.notEqual(process.exitCode, 1, "process.exitCode must not be 1 when backlog is empty");
  process.exitCode = originalExitCode;

  assert.equal(result.enriched, 0);
  assert.equal(result.alreadyTagged, 0);
  assert.equal(result.failed, 0);
  assert.ok(!result.refused, "refused should not be set on empty backlog");
});

// ---------------------------------------------------------------------------
// Non-triaged FEATs (pending, in-progress, done) are not counted
// ---------------------------------------------------------------------------

test("backlog enrich: non-triaged FEATs are not counted in needsClassify", async () => {
  const repo = await tmpRepo("be-nontriaged-");
  clearAll();

  await createFeature(repo, "FEAT-001", "pending");
  await createFeature(repo, "FEAT-002", "in-progress");
  await createFeature(repo, "FEAT-003", "done");
  // No triaged features — so no refusal

  const originalExitCode = process.exitCode;
  process.exitCode = undefined as any;

  const result = await runBacklogEnrich(repo, {});

  assert.notEqual(process.exitCode, 1, "no refusal when zero triaged FEATs");
  process.exitCode = originalExitCode;

  assert.equal(result.enriched, 0);
  assert.equal(result.alreadyTagged, 0);
  assert.ok(!result.refused);
});

// ---------------------------------------------------------------------------
// Mixed: some tagged, some not — refusal fires for the unclassified ones
// ---------------------------------------------------------------------------

test("backlog enrich: refuses when at least one triaged FEAT needs classification", async () => {
  const repo = await tmpRepo("be-mixed-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged", { tags: "[docs]" }); // already tagged
  await createFeature(repo, "FEAT-002", "triaged"); // unclassified

  const stderrLines: string[] = [];
  const origError = console.error.bind(console);
  console.error = (...args: any[]) => stderrLines.push(args.join(" "));

  const originalExitCode = process.exitCode;
  process.exitCode = undefined as any;

  let result: any;
  try {
    result = await runBacklogEnrich(repo, {});
  } finally {
    console.error = origError;
  }

  assert.equal(process.exitCode, 1, "exitCode must be 1 when at least one FEAT needs classify");
  process.exitCode = originalExitCode;

  assert.equal(result.refused, true);
  assert.equal(result.alreadyTagged, 1, "alreadyTagged should report the pre-tagged one");

  const stderrText = stderrLines.join(" ");
  assert.ok(
    stderrText.includes("1 feature(s)"),
    `expected '1 feature(s)' in stderr: ${stderrText}`
  );
});
