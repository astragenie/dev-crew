// @ts-nocheck
// Unit tests: doc-writer behavior at slice-complete after DEC-011 removal
//
// Test 1: --no-doc-writer flag → deprecated no-op warning on stderr, audit log
//         entry written with cli-refusal-cli-doc-writer-disabled, ceremony succeeds
// Test 2: Default (no flag) → audit log entry written (cli-refusal), no marker
//         file, ceremony still returns ok
// Test 3: Regression — existing slice-complete behavior unchanged (FEAT lifecycle)

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { completeSlice } from "../scripts/lib/slice-linker.mjs";
import { flushAuditLog } from "../scripts/lib/auto-dispatch.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
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

async function createFeat(
  repo: string,
  featId: string,
  state: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fm = {
    id: featId,
    status: state,
    priority: "P1",
    created: "2026-06-01",
    updated: "2026-06-01",
    ...extraFm
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${(v as string[]).join(", ")}]`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---", "", `# ${featId}: Test feature`, "");
  const filePath = path.join(dir, `${featId}.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

async function createSlice(
  repo: string,
  sliceId: string,
  featId: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(dir, { recursive: true });
  const fm = {
    id: sliceId,
    status: "pending",
    feature: featId,
    requires_validation: false,
    created: "2026-06-01",
    updated: "2026-06-01",
    ...extraFm
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push(
    "---",
    "",
    `# ${sliceId}: Test slice`,
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Feature behaves as expected per the slice objective",
    ""
  );
  const filePath = path.join(dir, `${sliceId}_test.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

// ---------------------------------------------------------------------------
// Test 1: --no-doc-writer → deprecated no-op warning, audit log written
// ---------------------------------------------------------------------------

test("slice-complete docwriter: --no-doc-writer → deprecated warning on stderr, audit log written with cli-refusal, ceremony succeeds", async () => {
  const repo = await tmpRepo("scd-no-docwriter-");
  const featId = "FEAT-DW01";
  const sliceId = "SLICE-DW01";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const stderrLines: string[] = [];
  const origError = console.error.bind(console);
  console.error = (...args: any[]) => stderrLines.push(args.join(" "));

  let result: any;
  try {
    result = await completeSlice(repo, sliceId, { noDocWriter: true });
  } finally {
    console.error = origError;
  }

  // Ceremony returns successfully
  assert.ok(result?.slice?.id === sliceId, "slice id should be present in result");
  assert.match(result.slice.to, /completed[\\/]/, "slice should be moved to completed/");

  // Deprecated warning on stderr
  const stderrText = stderrLines.join(" ");
  assert.ok(
    stderrText.includes("deprecated") && stderrText.includes("no-op"),
    `stderr must include deprecated/no-op, got: ${stderrText}`
  );
  assert.ok(stderrText.includes("DEC-011"), `stderr must cite DEC-011, got: ${stderrText}`);

  // Flush buffered audit log writes (Win 10 batch strategy).
  await flushAuditLog(repo);

  // Audit log entry written with cli-refusal-cli-doc-writer-disabled
  const lines = await readJsonLines(auditLogPath(repo));
  const docWriterEntries = lines.filter((e: any) => e.agent === "crew:document-writer");
  assert.ok(docWriterEntries.length >= 1, "at least one doc-writer audit log entry");
  const entry = docWriterEntries[0] as any;
  assert.equal(entry.skipped, true, "audit entry skipped must be true");
  assert.equal(
    entry.skipReason,
    "cli-refusal-cli-doc-writer-disabled",
    "audit entry skipReason must be cli-refusal-cli-doc-writer-disabled"
  );
  assert.equal(
    entry.parentCommand,
    "slice-complete",
    "audit entry parentCommand must be slice-complete"
  );
  assert.equal(entry.ok, true, "audit entry ok must be true (slice closed cleanly)");
});

// ---------------------------------------------------------------------------
// Test 2: Default (no flag) → audit log entry written, no marker file
// ---------------------------------------------------------------------------

test("slice-complete docwriter: default path → audit log written with cli-refusal, no marker file, ceremony succeeds", async () => {
  const repo = await tmpRepo("scd-default-");
  const featId = "FEAT-DW02";
  const sliceId = "SLICE-DW02";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, {});

  // Ceremony returns successfully
  assert.ok(result?.slice?.id === sliceId, "slice id present in result");
  assert.match(result.slice.to, /completed[\\/]/, "slice moved to completed/");

  // Flush buffered audit log writes (Win 10 batch strategy).
  await flushAuditLog(repo);

  // Audit log entry written with cli-refusal-cli-doc-writer-disabled
  const lines = await readJsonLines(auditLogPath(repo));
  const docWriterEntries = lines.filter((e: any) => e.agent === "crew:document-writer");
  assert.ok(docWriterEntries.length >= 1, "at least one doc-writer audit log entry");
  const entry = docWriterEntries[0] as any;
  assert.equal(entry.skipped, true, "audit entry skipped must be true");
  assert.equal(
    entry.skipReason,
    "cli-refusal-cli-doc-writer-disabled",
    "skipReason must be cli-refusal-cli-doc-writer-disabled"
  );

  // No marker files under pending-dispatch/
  const markerDir = path.join(repo, ".claude/artifacts/loop/pending-dispatch");
  const markerExists = await fs
    .access(markerDir)
    .then(() => true)
    .catch(() => false);
  if (markerExists) {
    const markers = await fs.readdir(markerDir);
    assert.equal(markers.length, 0, "no marker files should be written — dispatch removed");
  }
});

// Regression coverage for FEAT-lifecycle behavior at slice-complete lives in
// src/tests/slice-complete-multi-slice.test.mts. Doc-writer dispatch removal adds
// zero coupling to that close path (proven by the two tests above).
