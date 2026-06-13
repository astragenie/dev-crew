import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { checkArtifactLinks } from "../scripts/lib/artifact-linker.mjs";

// Helper: write a FEAT file with given frontmatter fields
async function writeFeat(
  root: string,
  state: string,
  id: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(root, ".claude", "artifacts", "loop", "backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fm = { id, status: state, depends_on: [], derived_from: null, ...extra };
  const content = `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n")}\n---\n# ${id}\n`;
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

// Helper: write a slice file
async function writeSlice(
  root: string,
  state: string,
  id: string,
  featId: string | null = null,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(root, ".claude", "artifacts", "loop", "ai-loop", "slices", state);
  await fs.mkdir(dir, { recursive: true });
  const fm: Record<string, unknown> = { id, status: state, ...extra };
  if (featId) fm.feature = featId;
  const content = `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n")}\n---\n# ${id}\n`;
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

// Helper: write a grade file
async function writeGrade(
  root: string,
  filename: string,
  sliceId: string | null = null,
  featId: string | null = null
): Promise<string> {
  const dir = path.join(root, ".claude", "artifacts", "loop", "grades");
  await fs.mkdir(dir, { recursive: true });
  const fm: Record<string, unknown> = {};
  if (sliceId) fm.slice = sliceId;
  if (featId) fm.feature = featId;
  const content = fm.slice
    ? `---\n${Object.entries(fm)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n")}\n---\n# grade\n`
    : `---\n---\n# grade\n`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

// Helper: write a decision file
async function writeDecision(
  root: string,
  id: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(root, ".claude", "artifacts", "loop", "decisions");
  await fs.mkdir(dir, { recursive: true });
  const fm = { id, title: `${id} title`, status: "accepted", ...extra };
  const content = `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n")}\n---\n# ${id}\n`;
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("checkArtifactLinks", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-linker-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty report for a well-formed synthetic artifact set", async () => {
    // FEAT-001 in triaged
    await writeFeat(tmpDir, "triaged", "FEAT-001");
    // FEAT-002 in done, depends on FEAT-001
    await writeFeat(tmpDir, "done", "FEAT-002", { depends_on: ["FEAT-001"] });
    // SLICE-01 in completed referencing FEAT-001
    await writeSlice(tmpDir, "completed", "SLICE-01", "FEAT-001");
    // Grade file whose slice is in completed
    await writeGrade(tmpDir, "20260601T000000Z-feat001-slice01-grade.md", "SLICE-01", "FEAT-001");
    // Decision with no supersedes
    await writeDecision(tmpDir, "DEC-001");

    const report = await checkArtifactLinks(tmpDir);
    expect(report.broken).toHaveLength(0);
    expect(report.orphaned).toHaveLength(0);
  });

  it("detects broken depends_on when FEAT references a non-existent id", async () => {
    // FEAT-010 depends on FEAT-999 which doesn't exist
    await writeFeat(tmpDir, "triaged", "FEAT-010", { depends_on: ["FEAT-999"] });

    const report = await checkArtifactLinks(tmpDir);
    expect(report.broken.length).toBeGreaterThanOrEqual(1);

    const broken = report.broken.find(
      (b) => b.field === "depends_on" && b.referencedId === "FEAT-999"
    );
    expect(broken).toBeDefined();
    expect(broken?.reason).toContain("FEAT-999");
  });

  it("detects orphaned grade file when no matching slice in completed/", async () => {
    // A slice exists but only in pending, not completed
    await writeFeat(tmpDir, "triaged", "FEAT-020");
    await writeSlice(tmpDir, "pending", "SLICE-05", "FEAT-020");
    // Grade points to SLICE-05 which is not completed
    await writeGrade(tmpDir, "20260601T000000Z-feat020-slice05-grade.md", "SLICE-05", "FEAT-020");

    const report = await checkArtifactLinks(tmpDir);
    expect(report.orphaned.length).toBeGreaterThanOrEqual(1);

    const orphan = report.orphaned.find((o) => o.type === "grade" && o.reason.includes("SLICE-05"));
    expect(orphan).toBeDefined();
  });

  it("detects broken feature reference in slice file when FEAT does not exist", async () => {
    // Slice references FEAT-888 which doesn't exist in any backlog directory
    await writeSlice(tmpDir, "in-progress", "SLICE-10", "FEAT-888");

    const report = await checkArtifactLinks(tmpDir);
    expect(report.broken.length).toBeGreaterThanOrEqual(1);

    const broken = report.broken.find(
      (b) => b.field === "feature" && b.referencedId === "FEAT-888"
    );
    expect(broken).toBeDefined();
    expect(broken?.reason).toContain("FEAT-888");
  });

  it("mermaid output contains valid graph TD header and at least one edge when edges exist", async () => {
    // Create a simple chain: FEAT-030 → SLICE-20 → grade
    await writeFeat(tmpDir, "triaged", "FEAT-030");
    await writeSlice(tmpDir, "completed", "SLICE-20", "FEAT-030");
    await writeGrade(tmpDir, "20260601T000000Z-feat030-slice20-grade.md", "SLICE-20", "FEAT-030");

    const report = await checkArtifactLinks(tmpDir);
    expect(report.mermaid).toContain("graph TD");
    expect(report.mermaid).toContain("-->");
  });
});
