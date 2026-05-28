import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseSuperpowersPlan,
  parseApprovedSlices,
  findActivePlan,
  detectSliceStatus,
  writeSliceProgress,
  refreshSliceProgress
} from "../scripts/lib/slice-linker/slice-progress.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(repo, rel, content) {
  const full = path.join(repo, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content);
  return full;
}

test("parseSuperpowersPlan extracts SLICE_NN and SLICE-NN headings with em-dash or hyphen", async () => {
  const repo = await tmpRepo("al-slice-progress-parse-");
  const planPath = await writeFile(
    repo,
    "docs/superpowers/plans/2026-05-22-foo.md",
    [
      "# Phase 2 Plan",
      "",
      "## Task 1: SLICE_17 — Auth + tenant gating",
      "intro body",
      "## Task 2: SLICE-18 - Source abstraction",
      "## Task 3: SLICE_19 — GitHub source",
      "## Not a task heading",
      ""
    ].join("\n")
  );
  const slices = await parseSuperpowersPlan(planPath);
  assert.equal(slices.length, 3);
  assert.deepEqual(
    slices.map((s) => s.id),
    ["SLICE-17", "SLICE-18", "SLICE-19"]
  );
  assert.equal(slices[0].title, "Auth + tenant gating");
  assert.equal(slices[1].title, "Source abstraction");
});

test("parseApprovedSlices reads checked/unchecked list items", async () => {
  const repo = await tmpRepo("al-slice-progress-approved-");
  const filePath = await writeFile(
    repo,
    ".claude/artifacts/loop/ai-loop/backlog/approved-slices.md",
    [
      "# Approved",
      "- [x] SLICE-10 — Done one",
      "- [ ] SLICE-11 — Not yet",
      "- [X] SLICE_12 — Also done",
      ""
    ].join("\n")
  );
  const slices = await parseApprovedSlices(filePath);
  assert.equal(slices.length, 3);
  assert.equal(slices[0].checked, true);
  assert.equal(slices[1].checked, false);
  assert.equal(slices[2].id, "SLICE-12");
  assert.equal(slices[2].checked, true);
});

test("findActivePlan prefers newest superpowers plan over approved-slices", async () => {
  const repo = await tmpRepo("al-slice-progress-pick-");
  await writeFile(
    repo,
    ".claude/artifacts/loop/ai-loop/backlog/approved-slices.md",
    "- [ ] SLICE-01 — Approved fallback\n"
  );
  await writeFile(repo, "docs/superpowers/plans/older.md", "## Task 1: SLICE_02 — Older\n");
  // Sleep a tick then write a newer file so mtime ordering is reliable.
  await new Promise((r) => setTimeout(r, 25));
  const newPath = await writeFile(
    repo,
    "docs/superpowers/plans/newer.md",
    "## Task 1: SLICE_99 — Newer\n"
  );
  const result = await findActivePlan(repo);
  assert.equal(result.source, "superpowers");
  assert.equal(result.planPath, newPath);
  assert.equal(result.slices[0].id, "SLICE-99");
});

test("detectSliceStatus marks completed when slice file frontmatter status is completed", async () => {
  const repo = await tmpRepo("al-slice-progress-status-");
  await writeFile(
    repo,
    ".claude/artifacts/loop/ai-loop/slices/pending/SLICE_17_AUTH.md",
    "---\nstatus: completed\n---\n# SLICE-17\n"
  );
  await writeFile(
    repo,
    ".claude/artifacts/loop/ai-loop/slices/pending/SLICE_18_SOURCES.md",
    "---\nstatus: pending\n---\n# SLICE-18\n"
  );
  const enriched = await detectSliceStatus(repo, [
    { id: "SLICE-17", title: "Auth", checked: false },
    { id: "SLICE-18", title: "Sources", checked: false },
    { id: "SLICE-19", title: "Missing file", checked: false }
  ]);
  assert.equal(enriched[0].completed, true);
  assert.equal(enriched[0].exists, true);
  assert.equal(enriched[1].completed, false);
  assert.equal(enriched[1].exists, true);
  assert.equal(enriched[2].exists, false);
});

test("writeSliceProgress produces a dashboard file with status rows", async () => {
  const repo = await tmpRepo("al-slice-progress-write-");
  const slices = [
    { id: "SLICE-17", title: "Auth", completed: true, exists: true, slicePath: null },
    { id: "SLICE-18", title: "Sources", completed: false, exists: true, slicePath: null },
    { id: "SLICE-19", title: "GitHub", completed: false, exists: false, slicePath: null }
  ];
  const result = await writeSliceProgress(repo, {
    activePlan: { source: "superpowers", planPath: path.join(repo, "plan.md"), slices: [] },
    slices,
    currentSliceId: "SLICE-18"
  });
  assert.ok(result.path.endsWith(path.join(".claude", "state", "crew", "slice-progress.md")));
  const text = await fs.readFile(result.path, "utf8");
  assert.match(text, /SLICE-17.*COMPLETED/);
  assert.match(text, /SLICE-18.*IN_PROGRESS/);
  assert.match(text, /SLICE-19.*PENDING \(no file\)/);
  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 3);
});

test("refreshSliceProgress end-to-end against a superpowers plan + slice files", async () => {
  const repo = await tmpRepo("al-slice-progress-refresh-");
  await writeFile(
    repo,
    "docs/superpowers/plans/plan.md",
    ["## Task 1: SLICE_17 — Auth", "## Task 2: SLICE_18 — Sources", ""].join("\n")
  );
  await writeFile(
    repo,
    ".claude/artifacts/loop/ai-loop/slices/pending/SLICE_17_AUTH.md",
    "---\nstatus: completed\n---\n# done\n"
  );
  const result = await refreshSliceProgress(repo, { currentSliceId: "SLICE-18" });
  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 2);
  const text = await fs.readFile(result.path, "utf8");
  assert.match(text, /Active plan: `docs\/superpowers\/plans\/plan\.md`/);
  assert.match(text, /Progress: 1\/2 completed/);
});
