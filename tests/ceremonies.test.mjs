import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  phaseStart,
  phaseEnd,
  featureStart,
  featureEnd,
  renderTree,
  writeFeatureEndCeremony,
  readFeatureEndCeremony
} from "../scripts/lib/ceremonies.mjs";

// --- ceremony stubs ---

test("phaseStart returns scaffold ceremony object", () => {
  const result = phaseStart({ id: "2", title: "Domain build-out" });
  assert.equal(result.type, "phase-start");
  assert.equal(result.id, "2");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string", "timestamp must be a string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("phaseEnd returns scaffold ceremony object", () => {
  const result = phaseEnd({ id: "3", title: "Workflow polish" });
  assert.equal(result.type, "phase-end");
  assert.equal(result.id, "3");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("featureStart returns scaffold ceremony object", () => {
  const result = featureStart({ id: "FEAT-005", title: "csharp-conventions", phase: "2" });
  assert.equal(result.type, "feature-start");
  assert.equal(result.id, "FEAT-005");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("featureEnd returns scaffold ceremony object", () => {
  const result = featureEnd({ id: "FEAT-006", title: "flutter-conventions", phase: "2" });
  assert.equal(result.type, "feature-end");
  assert.equal(result.id, "FEAT-006");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

// --- renderTree ---

test("renderTree([]) returns empty string", () => {
  const result = renderTree([]);
  assert.equal(result, "");
});

test("renderTree single phase + single feature + no slices", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [{ id: "FEAT-005", title: "csharp-conventions", status: "in-progress", slices: [] }]
    }
  ]);
  const lines = result.split("\n");
  assert.equal(lines[0], "Phase 2 — Domain build-out [in-progress]");
  assert.equal(lines[1], "└── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines.length, 2);
});

test("renderTree two features — first uses ├── last uses └──", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        { id: "FEAT-005", title: "csharp-conventions", status: "in-progress", slices: [] },
        { id: "FEAT-006", title: "flutter-conventions", status: "pending", slices: [] }
      ]
    }
  ]);
  const lines = result.split("\n");
  assert.equal(lines[1], "├── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines[2], "└── FEAT-006 flutter-conventions [pending]");
});

test("renderTree feature with two slices — first ├── last └── indented under │", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        {
          id: "FEAT-005",
          title: "csharp-conventions",
          status: "in-progress",
          slices: [
            { id: "slice-001", title: "scaffold skill file", status: "done" },
            { id: "slice-002", title: "write acceptance tests", status: "active" }
          ]
        },
        { id: "FEAT-006", title: "flutter-conventions", status: "pending", slices: [] }
      ]
    }
  ]);
  const lines = result.split("\n");
  assert.equal(lines[0], "Phase 2 — Domain build-out [in-progress]");
  assert.equal(lines[1], "├── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines[2], "│   ├── slice-001 scaffold skill file [done]");
  assert.equal(lines[3], "│   └── slice-002 write acceptance tests [active]");
  assert.equal(lines[4], "└── FEAT-006 flutter-conventions [pending]");
});

test("renderTree last feature with slices uses 4-space indent not │", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        {
          id: "FEAT-005",
          title: "csharp-conventions",
          status: "in-progress",
          slices: [
            { id: "slice-001", title: "scaffold skill file", status: "done" },
            { id: "slice-002", title: "write acceptance tests", status: "active" }
          ]
        }
      ]
    }
  ]);
  const lines = result.split("\n");
  assert.equal(lines[1], "└── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines[2], "    ├── slice-001 scaffold skill file [done]");
  assert.equal(lines[3], "    └── slice-002 write acceptance tests [active]");
  assert.equal(lines.length, 4);
});

test("renderTree two phases separated by blank line", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [{ id: "FEAT-005", title: "csharp-conventions", status: "in-progress", slices: [] }]
    },
    {
      id: "3",
      title: "Workflow polish",
      status: "pending",
      features: [{ id: "FEAT-008", title: "routing-table cadence", status: "pending", slices: [] }]
    }
  ]);
  const lines = result.split("\n");
  // blank line between phases
  assert.equal(lines[2], "");
  assert.equal(lines[3], "Phase 3 — Workflow polish [pending]");
  assert.equal(lines[4], "└── FEAT-008 routing-table cadence [pending]");
  assert.equal(lines.length, 5);
});

// --- featureEnd opts ---

test("featureEnd with no opts defaults simplifyRan to false", () => {
  const result = featureEnd({ id: "FEAT-005", title: "csharp-conventions", phase: "2" });
  assert.equal(result.simplifyRan, false);
});

test("featureEnd with simplifyRan: true forwards the flag", () => {
  const result = featureEnd(
    { id: "FEAT-005", title: "csharp-conventions", phase: "2" },
    { simplifyRan: true }
  );
  assert.equal(result.simplifyRan, true);
});

test("featureEnd with simplifyRan: false explicit preserves false", () => {
  const result = featureEnd(
    { id: "FEAT-005", title: "csharp-conventions", phase: "2" },
    { simplifyRan: false }
  );
  assert.equal(result.simplifyRan, false);
});

// --- writeFeatureEndCeremony / readFeatureEndCeremony ---

test("writeFeatureEndCeremony writes JSON file at expected path", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-write-"));
  const result = featureEnd({ id: "FEAT-005", title: "csharp", phase: "2" }, { simplifyRan: true });
  const filePath = await writeFeatureEndCeremony(repo, result);
  assert.ok(filePath.includes("feature-end-FEAT-005"), "filename contains feature id");
  assert.ok(filePath.endsWith(".json"), "file is JSON");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.id, "FEAT-005");
  assert.equal(parsed.simplifyRan, true);
});

test("readFeatureEndCeremony returns null when no file exists", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-read-miss-"));
  const result = await readFeatureEndCeremony(repo, "FEAT-005");
  assert.equal(result, null);
});

test("readFeatureEndCeremony returns ceremony after write", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-read-"));
  const result = featureEnd(
    { id: "FEAT-007", title: "flutter", phase: "2" },
    { simplifyRan: true }
  );
  await writeFeatureEndCeremony(repo, result);
  const read = await readFeatureEndCeremony(repo, "FEAT-007");
  assert.ok(read !== null);
  assert.equal(read.id, "FEAT-007");
  assert.equal(read.simplifyRan, true);
});

test("readFeatureEndCeremony returns latest when multiple files exist", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-read-multi-"));
  // Write older ceremony first (simplifyRan: false)
  const older = featureEnd({ id: "FEAT-008", title: "ts", phase: "2" }, { simplifyRan: false });
  await writeFeatureEndCeremony(repo, older);
  // Small delay to ensure different timestamp
  await new Promise((r) => setTimeout(r, 10));
  // Write newer ceremony (simplifyRan: true)
  const newer = featureEnd({ id: "FEAT-008", title: "ts", phase: "2" }, { simplifyRan: true });
  await writeFeatureEndCeremony(repo, newer);
  const read = await readFeatureEndCeremony(repo, "FEAT-008");
  assert.equal(read.simplifyRan, true, "should return the latest ceremony");
});
