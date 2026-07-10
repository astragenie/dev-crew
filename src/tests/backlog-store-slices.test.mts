// FEAT-250 SLICE-3 (DEC-076) — slice-side BacklogStore coverage: createSlice,
// updateSliceFrontmatter, moveSlice, listByState/getById(kind:"slice"), and
// the failure-pivot regex-to-mergeFrontmatter port regression (AC-4).
//
// sliceFromFeature's existing black-box tests (slice-classify.test.mts,
// slice-from-feature-proposed-slices.test.mts, slice-complete.test.mts) stay
// green unmodified and already pin end-to-end behavior through the public
// API; this file adds direct coverage of the new BacklogStore primitives
// those call sites now delegate to, plus the AC-4-required failure-pivot
// regression.

import { describe, test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createFeature,
  createSlice,
  updateSliceFrontmatter,
  moveSlice,
  listByState,
  getById
} from "../scripts/lib/backlog-store.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { persistPivotAt } from "../scripts/lib/wave/failure-pivot.mjs";
import type { FailurePivot, WaveConfig } from "../scripts/lib/wave/types.mjs";
import { makeTmpRepo, AC_SECTION_BODY } from "./_fixtures.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await makeTmpRepo(prefix);
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ preset: "dotnet-python", loop: {}, stack: {} })
  );
  return repo;
}

const FEATURE_BODY = `# FEAT-001: My Feature\n\n${AC_SECTION_BODY}`;

async function seedFeature(repo: string, overrides: Record<string, unknown> = {}) {
  const feat = await createFeature(repo, { title: "My Feature", body: FEATURE_BODY });
  const raw = await fs.readFile(feat.filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  return { filePath: feat.filePath, frontmatter: { ...frontmatter, ...overrides }, body };
}

describe("createSlice", () => {
  test("derives title from the feature body's H1 when no title is given, allocates SLICE-01 on an empty slicesRoot", async () => {
    const repo = await tmpRepo("bss-create-single-");
    const feat = await seedFeature(repo);

    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body
    });

    expect(created.id).toBe("SLICE-01");
    expect(created.title).toBe("My Feature");
    expect(created.filePath).toMatch(/pending[\\/]SLICE_01_/);

    const { frontmatter } = parseFrontmatter(await fs.readFile(created.filePath, "utf8"));
    expect(frontmatter.status).toBe("pending");
    expect(frontmatter.feature).toBe("FEAT-001");
  });

  test("uses an explicit title + effort_points when given (proposed_slices path)", async () => {
    const repo = await tmpRepo("bss-create-explicit-");
    const feat = await seedFeature(repo);

    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body,
      title: "Explicit proposal title",
      effortPoints: 5
    });

    expect(created.title).toBe("Explicit proposal title");
    const { frontmatter } = parseFrontmatter(await fs.readFile(created.filePath, "utf8"));
    expect(frontmatter.effort_points).toBe(5);
  });

  test("allocates sequential ids across repeated sequential calls (mirrors the old materializeProposedSlices loop)", async () => {
    const repo = await tmpRepo("bss-create-sequence-");
    const feat = await seedFeature(repo);

    const ids: string[] = [];
    for (const title of ["First", "Second", "Third"]) {
      const created = await createSlice({
        repoPath: repo,
        featureId: "FEAT-001",
        featureFilePath: feat.filePath,
        featureFrontmatter: feat.frontmatter,
        featureBody: feat.body,
        title
      });
      ids.push(created.id);
    }

    expect(ids).toEqual(["SLICE-01", "SLICE-02", "SLICE-03"]);
  });

  test("propagates surface:*/stack:* tags from featureFrontmatter.tags and drops everything else", async () => {
    const repo = await tmpRepo("bss-create-tags-");
    const feat = await seedFeature(repo, {
      tags: ["concern:security", "surface:api", "stack:node"]
    });

    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body
    });

    const { frontmatter } = parseFrontmatter(await fs.readFile(created.filePath, "utf8"));
    expect(frontmatter.tags).toEqual(["surface:api", "stack:node"]);
  });

  test("throws AcceptanceCriteriaRequiredError when the feature body has no AC section", async () => {
    const repo = await tmpRepo("bss-create-no-ac-");
    const feat = await seedFeature(repo);

    await expect(
      createSlice({
        repoPath: repo,
        featureId: "FEAT-001",
        featureFilePath: feat.filePath,
        featureFrontmatter: feat.frontmatter,
        featureBody: "# FEAT-001: My Feature\n\nNo AC section here."
      })
    ).rejects.toThrow(/no acceptance criteria/);
  });
});

describe("updateSliceFrontmatter", () => {
  test("merges updates into frontmatter, stamps updated, preserves body", async () => {
    const repo = await tmpRepo("bss-update-fm-");
    const feat = await seedFeature(repo);
    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body
    });

    const merged = await updateSliceFrontmatter(
      created.filePath,
      { badges: ["serial-reviewer-warning"] },
      repo,
      null
    );

    expect(merged.badges).toEqual(["serial-reviewer-warning"]);
    expect(merged.updated).toBeTruthy();

    const raw = await fs.readFile(created.filePath, "utf8");
    expect(raw).toContain(`# ${created.id}:`); // body preserved
  });
});

describe("moveSlice", () => {
  test("moves the file to <slicesRoot>/<toState>/, merges updates + status, removes the source", async () => {
    const repo = await tmpRepo("bss-move-");
    const feat = await seedFeature(repo);
    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body
    });

    const result = await moveSlice(
      created.filePath,
      "completed",
      { completed_at: "2026-07-10" },
      repo,
      null
    );

    expect(result.to).toMatch(/completed[\\/]/);
    await expect(fs.access(created.filePath)).rejects.toThrow();
    const { frontmatter } = parseFrontmatter(await fs.readFile(result.to, "utf8"));
    expect(frontmatter.status).toBe("completed");
    expect(frontmatter.completed_at).toBe("2026-07-10");
  });

  test("moving within the same state dir stays in place (no unlink) and still stamps status/updated", async () => {
    const repo = await tmpRepo("bss-move-samedir-");
    const feat = await seedFeature(repo);
    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body
    });

    const result = await moveSlice(created.filePath, "pending", {}, repo, null);
    expect(result.to).toBe(created.filePath);
    expect(result.from).toBe(created.filePath);
    // Throws (failing the test) if the file was unlinked.
    await fs.access(created.filePath);
  });
});

describe("listByState / getById (kind: slice)", () => {
  test("listByState lists slices under the given state dir; getById finds by id, null for a missing id", async () => {
    const repo = await tmpRepo("bss-list-getbyid-");
    const feat = await seedFeature(repo);
    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter: feat.frontmatter,
      featureBody: feat.body
    });

    const pending = await listByState(repo, "slice", "pending", null);
    expect(pending.map((e: { id: string }) => e.id)).toContain(created.id);

    const found = await getById(repo, "slice", created.id, null);
    expect(found?.filePath).toBe(created.filePath);
    expect(found?.state).toBe("pending");

    const missing = await getById(repo, "slice", "SLICE-99", null);
    expect(missing).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC-4: failure-pivot regex -> mergeFrontmatter port regression.
//
// Proves identical *parsed* frontmatter structure (not raw bytes) on both
// the escalating and non-escalating branches, on a fixture that also carries
// an unrelated block-style array field elsewhere in frontmatter — exercising
// the documented "serializeFrontmatter reformats untouched fields to
// inline-bracket style" normalization (design doc §3) without treating that
// reformat as a regression.
// ---------------------------------------------------------------------------

function makePivot(overrides: Partial<FailurePivot> = {}): FailurePivot {
  return {
    sliceId: "SLICE-9",
    featureId: "FEAT-009",
    originalWaveId: "wave-A",
    failureKind: "worktree_fail",
    failureArtifactPath: ".claude/artifacts/crew/handoffs/SLICE-9-fail.md",
    worktreePath: "/tmp/wt/SLICE-9",
    retryCount: 1,
    fixCommand: "/crew:fix",
    fixDispatchPrompt: "/crew:fix --slice SLICE-9",
    ...overrides
  };
}

const CFG: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:orchestrate-slice",
  sliceCommandFallback: "/crew:build",
  fixCommand: "/crew:fix",
  maxParallel: 3,
  dispatchTimeoutMs: 30 * 60 * 1000,
  postMergeTestCmd: "bun test",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: ".claude/artifacts/loop/waves"
};

// Frontmatter block carrying a block-style array (`tags:\n  - a\n  - b`) —
// the shape the old regex helpers left untouched (they only ever touched
// status/wave_attempts/pending_fix/last_failure) but that
// mergeFrontmatter/serializeFrontmatter's full-block re-serialization
// reformats to inline-bracket style on any write.
function fixtureWithBlockArray(): string {
  return [
    "---",
    "id: SLICE-9",
    "status: pending",
    "tags:",
    "  - storage",
    "  - refactor",
    "---",
    "body",
    ""
  ].join("\n");
}

describe("failure-pivot regex-to-mergeFrontmatter port regression (AC-4)", () => {
  test("non-escalating: wave_attempts/pending_fix/last_failure parse identically; block-array tags field round-trips to the same array", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wave-port-"));
    const slicePath = path.join(dir, "SLICE-9.md");
    await fs.writeFile(slicePath, fixtureWithBlockArray(), "utf8");

    const pivot = makePivot({ retryCount: 1 }); // 1 < maxWaveAttempts(2) => non-escalating
    const newPath = await persistPivotAt(slicePath, pivot, CFG);
    expect(newPath).toBe(slicePath);

    const { frontmatter } = parseFrontmatter(await fs.readFile(slicePath, "utf8"));
    expect(frontmatter.wave_attempts).toBe(1);
    expect(frontmatter.pending_fix).toBe(true); // parses back as boolean true, same as the old "true" literal
    expect(frontmatter.last_failure).toEqual({
      wave_id: "wave-A",
      kind: "worktree_fail",
      artifact: ".claude/artifacts/crew/handoffs/SLICE-9-fail.md",
      pivot_command: "/crew:fix"
    });
    // Reformatted to inline-bracket bytes, but parses back to the identical array.
    expect(frontmatter.tags).toEqual(["storage", "refactor"]);

    await fs.rm(dir, { recursive: true, force: true });
  });

  test("escalating: status/needs-review move + pending_fix:null parses as absent for the only reader (asBoolean fallback)", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wave-port-"));
    const pendingDir = path.join(dir, "pending");
    await fs.mkdir(pendingDir, { recursive: true });
    const slicePath = path.join(pendingDir, "SLICE-9.md");
    await fs.writeFile(slicePath, fixtureWithBlockArray(), "utf8");

    const pivot = makePivot({ retryCount: 2, originalWaveId: "wave-B" }); // 2 >= maxWaveAttempts(2) => escalating
    const newPath = await persistPivotAt(slicePath, pivot, CFG);

    expect(newPath.replace(/\\/g, "/")).toContain("/needs-review/SLICE-9.md");
    await expect(fs.access(slicePath)).rejects.toThrow();

    const { frontmatter } = parseFrontmatter(await fs.readFile(newPath, "utf8"));
    expect(frontmatter.status).toBe("needs-review");
    expect(frontmatter.wave_attempts).toBe(2);
    // pending_fix: null parses as null, not the string/boolean "true" the
    // regex-removed-field left as "absent". wave/planner.mts's
    // asBoolean(fm["pending_fix"], false) treats both identically (neither
    // matches "true"/true, both fall through to the false fallback).
    expect(frontmatter.pending_fix).toBeNull();
    expect(frontmatter.last_failure.wave_id).toBe("wave-B");
    expect(frontmatter.tags).toEqual(["storage", "refactor"]);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
