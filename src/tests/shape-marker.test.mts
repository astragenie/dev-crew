// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { writeShapeMarker, readShapeMarker } from "../scripts/lib/shape-marker.mjs";
import { computeTelemetry } from "../scripts/lib/grade-telemetry.mjs";
import { startSlice, sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";

const SHAPE_MARKERS_DIR = ".claude/artifacts/loop/shape-markers";
const SHAPE_DOC_UPDATE = "doc-update";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string) {
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
        phaseGateArtifactDir: ".claude/artifacts/crew/validations",
        dispatchLimits: {
          maxSubagentsPerSlice: 4,
          expandedInlineCriteria: true,
          preferInlineFor: [SHAPE_DOC_UPDATE, "config-tweak", "single-module-edit", "test-only"]
        }
      },
      stack: {}
    })
  );
  return repo;
}

async function fillPlaceholderACs(slicePath: string) {
  const content = await fs.readFile(slicePath, "utf8");
  const fixed = content.replace(
    /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
    "- [ ] AC-2: Feature behaves as expected per the slice objective"
  );
  await fs.writeFile(slicePath, fixed);
}

async function appendFilesSection(slicePath: string, files: string[]) {
  const content = await fs.readFile(slicePath, "utf8");
  const section = `\n## Files\n${files.map((f) => `- ${f}`).join("\n")}\n`;
  await fs.writeFile(slicePath, content + section);
}

// ---------------------------------------------------------------------------
// AC-1: writeShapeMarker writes JSON with expected fields
// ---------------------------------------------------------------------------

test("writeShapeMarker writes JSON with expected fields", async () => {
  const repo = await tmpRepo("shape-marker-write-");
  try {
    await writeShapeMarker(repo, "SLICE-94", SHAPE_DOC_UPDATE, "all changed files are docs/markdown", true);
    const markerPath = path.join(repo, SHAPE_MARKERS_DIR, "SLICE-94.json");
    const raw = await fs.readFile(markerPath, "utf8");
    const obj = JSON.parse(raw) as Record<string, unknown>;
    assert.strictEqual(obj.sliceId, "SLICE-94");
    assert.strictEqual(obj.shape, SHAPE_DOC_UPDATE);
    assert.strictEqual(obj.rationale, "all changed files are docs/markdown");
    assert.strictEqual(obj.inlinePath, true);
    assert.ok(typeof obj.ts === "string" && obj.ts.length > 0, "ts must be a non-empty string");
    assert.ok(!Number.isNaN(Date.parse(obj.ts as string)), "ts must be a valid ISO date");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-2: readShapeMarker returns null when marker is absent
// ---------------------------------------------------------------------------

test("readShapeMarker returns null when marker is absent", async () => {
  const repo = await tmpRepo("shape-marker-absent-");
  try {
    const result = await readShapeMarker(repo, "SLICE-NONEXISTENT");
    assert.strictEqual(result, null);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-3: readShapeMarker returns object on present, validates field types
// ---------------------------------------------------------------------------

test("readShapeMarker returns object when marker is present and validates types", async () => {
  const repo = await tmpRepo("shape-marker-present-");
  try {
    await writeShapeMarker(repo, "SLICE-94", "config-tweak", "all changed files are config", false);
    const result = await readShapeMarker(repo, "SLICE-94");
    assert.ok(result !== null, "result must not be null");
    assert.strictEqual(typeof result.sliceId, "string");
    assert.strictEqual(typeof result.shape, "string");
    assert.strictEqual(typeof result.rationale, "string");
    assert.strictEqual(typeof result.inlinePath, "boolean");
    assert.strictEqual(typeof result.ts, "string");
    assert.strictEqual(result.sliceId, "SLICE-94");
    assert.strictEqual(result.shape, "config-tweak");
    assert.strictEqual(result.inlinePath, false);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Security: path-traversal guard on sliceId
// ---------------------------------------------------------------------------

test("write rejects traversal sliceId without crashing (best-effort)", async () => {
  const repo = await tmpRepo("shape-traversal-");
  try {
    // Should not throw — best-effort swallows internally.
    await writeShapeMarker(repo, "../../etc/passwd", SHAPE_DOC_UPDATE, "test", true);
    // Marker should NOT have landed at the traversal path.
    const outside = path.resolve(repo, "..", "..", "etc", "passwd.json");
    await assert.rejects(() => fs.access(outside), /ENOENT|EPERM|EACCES/);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-5 (telemetry): computeTelemetry populates shape fields when marker present
// ---------------------------------------------------------------------------

test("computeTelemetry populates shape.classified and shape.inline_path_used when marker present", async () => {
  const repo = await tmpRepo("shape-marker-telemetry-");
  try {
    const sliceId = "SLICE-94";
    await writeShapeMarker(repo, sliceId, SHAPE_DOC_UPDATE, "all docs", true);
    const telemetry = await computeTelemetry(repo, sliceId, null);
    assert.ok(telemetry.shape !== null, "shape must not be null when marker is present");
    assert.strictEqual(telemetry.shape!.classified, "doc-update");
    assert.strictEqual(telemetry.shape!.inline_path_used, true);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-4 positive: slice start dispatch instruction contains 'inline-path recommended'
// when all ## Files are .md
// ---------------------------------------------------------------------------

test("SLICE-94 AC-4 positive: dispatchInstruction contains inline-path recommended for doc-update shape", async () => {
  const repo = await tmpRepo("shape-inline-positive-");
  try {
    const feat = await addFeature(repo, { title: "Doc update feature" });
    const { slice } = await sliceFromFeature(repo, feat.id);
    await fillPlaceholderACs(slice.path);
    await appendFilesSection(slice.path, ["docs/foo.md", "docs/bar.md"]);
    const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.0" });
    assert.ok(result.dispatchInstruction, "dispatchInstruction must be present");
    assert.ok(
      result.dispatchInstruction.includes("inline-path recommended"),
      `Expected 'inline-path recommended' in dispatchInstruction, got: ${result.dispatchInstruction.slice(0, 300)}`
    );
    // Verify shape marker was written
    const markerPath = path.join(repo, SHAPE_MARKERS_DIR, `${slice.id}.json`);
    // Allow marker write to complete (it's fire-and-forget via void)
    await new Promise((resolve) => setTimeout(resolve, 50));
    const raw = await fs.readFile(markerPath, "utf8");
    const marker = JSON.parse(raw) as Record<string, unknown>;
    assert.strictEqual(marker.shape, "doc-update");
    assert.strictEqual(marker.inlinePath, true);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-4 negative: dispatchInstruction does NOT contain 'inline-path recommended'
// for shape 'none' (mixed file types)
// ---------------------------------------------------------------------------

test("SLICE-94 AC-4 negative: dispatchInstruction omits inline-path hint when shape is none", async () => {
  const repo = await tmpRepo("shape-inline-negative-");
  try {
    const feat = await addFeature(repo, { title: "Mixed files feature" });
    const { slice } = await sliceFromFeature(repo, feat.id);
    await fillPlaceholderACs(slice.path);
    // Mixed .md + .mts = shape "none"
    await appendFilesSection(slice.path, ["docs/foo.md", "src/scripts/lib/some-module.mts"]);
    const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.0" });
    assert.ok(result.dispatchInstruction, "dispatchInstruction must be present");
    assert.ok(
      !result.dispatchInstruction.includes("inline-path recommended"),
      "dispatchInstruction must NOT contain inline-path recommended for shape none"
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
