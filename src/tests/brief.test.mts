// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { buildBrief } from "../scripts/lib/brief.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("buildBrief returns zero counts on empty repo", async () => {
  const repo = await tmpRepo("al-brief-empty-");
  const b = await buildBrief(repo);
  assert.deepEqual(b.backlogCounts, { pending: 0, triaged: 0, in_progress: 0, done: 0 });
  assert.deepEqual(b.topTriaged, []);
  assert.deepEqual(b.inFlight, []);
  assert.equal(b.grades.total, 0);
  assert.equal(b.decisions.total, 0);
});

test("buildBrief reports backlog counts by state", async () => {
  const repo = await tmpRepo("al-brief-counts-");
  const a = await addFeature(repo, { title: "A", priority: "P0" });
  const b = await addFeature(repo, { title: "B" });
  await moveFeature(a.filePath, "triaged", { priority: "P0", category: "feature" });
  await moveFeature(b.filePath, "in-progress");
  const out = await buildBrief(repo);
  assert.equal(out.backlogCounts.triaged, 1);
  assert.equal(out.backlogCounts.in_progress, 1);
});

test("buildBrief surfaces top-priority triaged features", async () => {
  const repo = await tmpRepo("al-brief-top-");
  const a = await addFeature(repo, { title: "P0 item" });
  const b = await addFeature(repo, { title: "P2 item" });
  await moveFeature(a.filePath, "triaged", { priority: "P0", category: "feature" });
  await moveFeature(b.filePath, "triaged", { priority: "P2", category: "feature" });
  const out = await buildBrief(repo);
  assert.equal(out.topTriaged.length, 2);
  assert.equal(out.topTriaged[0].priority, "P0");
});

test("buildBrief breaks priority ties by lowest FEAT-NNN id", async () => {
  const repo = await tmpRepo("al-brief-tie-");
  const a = await addFeature(repo, { title: "first P2" });
  const b = await addFeature(repo, { title: "second P2" });
  const c = await addFeature(repo, { title: "third P2" });
  await moveFeature(a.filePath, "triaged", { priority: "P2", category: "feature" });
  await moveFeature(b.filePath, "triaged", { priority: "P2", category: "feature" });
  await moveFeature(c.filePath, "triaged", { priority: "P2", category: "feature" });
  const out = await buildBrief(repo);
  assert.equal(out.topTriaged.length, 3);
  assert.deepEqual(
    out.topTriaged.map((f) => f.id),
    ["FEAT-001", "FEAT-002", "FEAT-003"]
  );
});

test("buildBrief surfaces specs that need decomposition", async () => {
  const repo = await tmpRepo("al-brief-specs-");
  const s = await addSpec(repo, { type: "prd", title: "Approved + undecomposed" });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  const out = await buildBrief(repo);
  assert.equal(out.specsToDecompose.length, 1);
  assert.equal(out.specsToDecompose[0].id, s.id);
});

test("buildBrief includes pattern alerts", async () => {
  const repo = await tmpRepo("al-brief-alerts-");
  const f = await addFeature(repo, { title: "Orphan" });
  await moveFeature(f.filePath, "in-progress");
  const out = await buildBrief(repo);
  assert.ok(Array.isArray(out.alerts));
  assert.ok(out.alerts.find((a) => a.category === "in-progress-orphan"));
});

// AC-5: warnAlertsDemoted field present in brief output
test("buildBrief: warnAlertsDemoted field is present and is a non-negative number", async () => {
  const repo = await tmpRepo("al-brief-demoted-zero-");
  const out = await buildBrief(repo);
  assert.ok("warnAlertsDemoted" in out, "warnAlertsDemoted field must be present");
  assert.equal(typeof out.warnAlertsDemoted, "number", "warnAlertsDemoted must be a number");
  assert.ok(out.warnAlertsDemoted >= 0, "warnAlertsDemoted must be >= 0");
});

test("buildBrief: warnAlertsDemoted is 0 when no warn alerts present", async () => {
  const repo = await tmpRepo("al-brief-demoted-clean-");
  const out = await buildBrief(repo);
  assert.equal(out.warnAlertsDemoted, 0);
});

test("buildBrief: warnAlertsDemoted counts demoted alerts when autoMode + ignoredCategories configured", async () => {
  const repo = await tmpRepo("al-brief-demoted-count-");
  // Create an in-progress orphan which generates an in-progress-orphan warn alert
  const orphan = await addFeature(repo, { title: "orphan" });
  await moveFeature(orphan.filePath, "in-progress");
  const config = {
    loop: {
      autoMode: true,
      warnAlertCategoriesIgnoredInAutoMode: ["in-progress-orphan"]
    }
  };
  const out = await buildBrief(repo, { config });
  assert.equal(out.warnAlertsDemoted, 1, "one alert demoted");
});

// TC-001 — No triaged items: sliceStartConfidence is null
test("buildBrief: sliceStartConfidence is null when no triaged items exist", async () => {
  const repo = await tmpRepo("al-brief-conf-empty-");
  const out = await buildBrief(repo);
  assert.equal(out.sliceStartConfidence, null);
});

// TC-002 — Autonomous-safe feature with no depends_on: confidence is green
test("buildBrief: sliceStartConfidence green for autonomous-safe feature with no deps", async () => {
  const repo = await tmpRepo("al-brief-conf-green-");
  const f = await addFeature(repo, { title: "safe feat" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature",
    autonomous_safe: true,
    depends_on: []
  });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null, "sliceStartConfidence must be present");
  assert.equal(out.sliceStartConfidence.featureId, f.id);
  assert.equal(out.sliceStartConfidence.confidence, "green");
  assert.ok(typeof out.sliceStartConfidence.reason === "string");
});

// TC-003 — autonomous_safe: false feature with depends_on: confidence is red (compound)
test("buildBrief: sliceStartConfidence red for not-autonomous-safe + depends_on present", async () => {
  const repo = await tmpRepo("al-brief-conf-red-");
  const f = await addFeature(repo, { title: "risky feat" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature",
    autonomous_safe: false,
    depends_on: ["FEAT-001"]
  });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null);
  assert.equal(out.sliceStartConfidence.confidence, "red");
  assert.match(out.sliceStartConfidence.reason, /unresolved depends_on/);
});

// TC-004 — autonomous_safe: false, no compound triggers: confidence is yellow
test("buildBrief: sliceStartConfidence yellow for autonomous_safe false with no compound trigger", async () => {
  const repo = await tmpRepo("al-brief-conf-yellow-");
  const f = await addFeature(repo, { title: "manual feat" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature",
    autonomous_safe: false,
    depends_on: []
  });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null);
  assert.equal(out.sliceStartConfidence.confidence, "yellow");
  assert.match(out.sliceStartConfidence.reason, /autonomous_safe: false/);
});

// TC-005 — sliceStartConfidence shape: all three fields always present when non-null
test("buildBrief: sliceStartConfidence has featureId, confidence, reason when non-null", async () => {
  const repo = await tmpRepo("al-brief-conf-shape-");
  const f = await addFeature(repo, { title: "shape check" });
  await moveFeature(f.filePath, "triaged", { priority: "P2", category: "feature" });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null);
  assert.ok("featureId" in out.sliceStartConfidence);
  assert.ok("confidence" in out.sliceStartConfidence);
  assert.ok("reason" in out.sliceStartConfidence);
  assert.ok(["green", "yellow", "red"].includes(out.sliceStartConfidence.confidence));
});
