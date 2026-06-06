import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { extractAcceptanceCriteria } from "../scripts/lib/slice-linker/feature-lifecycle.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";

// --- Unit tests for extractAcceptanceCriteria ---

test("extractAcceptanceCriteria returns AC lines from a standard FEAT body", () => {
  const body = [
    "## Some section",
    "",
    "Some text.",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: First criterion",
    "- [ ] AC-2: Second criterion",
    "",
    "## Notes",
    "",
    "trailing content"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: First criterion", "- [ ] AC-2: Second criterion"]);
});

test("extractAcceptanceCriteria returns empty array when no AC section present", () => {
  const body = [
    "## Goal",
    "",
    "Some goal text.",
    "",
    "## Notes",
    "",
    "No acceptance criteria here."
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria returns empty array when AC section is empty", () => {
  const body = ["## Acceptance criteria", "", "## Notes", "", "trailing"].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria returns empty array when AC section has no checkbox lines (malformed)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "Some prose without checkboxes.",
    "- bullet without checkbox",
    "",
    "## Notes"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria normalizes checked boxes to unchecked per AC-3", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: unchecked criterion",
    "- [x] AC-2: already checked criterion",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  // AC-3 from SLICE-53: slice scaffold ACs start as work-to-do, even if the
  // parent FEAT had check marks. `[x]` normalized to `[ ]`.
  assert.deepEqual(result, [
    "- [ ] AC-1: unchecked criterion",
    "- [ ] AC-2: already checked criterion"
  ]);
});

test("extractAcceptanceCriteria handles body that is null or empty", () => {
  assert.deepEqual(extractAcceptanceCriteria(""), []);
  assert.deepEqual(extractAcceptanceCriteria(null as unknown as string), []);
  assert.deepEqual(extractAcceptanceCriteria(undefined as unknown as string), []);
});

test("extractAcceptanceCriteria stops at next section heading", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: First",
    "- [ ] AC-2: Second",
    "",
    "## Done When",
    "",
    "- [ ] AC-3: should NOT be included (belongs to Done When section)"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: First", "- [ ] AC-2: Second"]);
});

test("extractAcceptanceCriteria is case-insensitive on heading name", () => {
  const body = ["## acceptance criteria", "", "- [ ] AC-1: lowercase heading"].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: lowercase heading"]);
});

// --- Integration tests: sliceFromFeature scaffold population ---

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
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

test("sliceFromFeature injects FEAT ACs verbatim into slice scaffold when FEAT has AC section", async () => {
  const repo = await tmpRepo("eff-with-ac-");
  const feat = await addFeature(repo, {
    title: "FEAT with ACs",
    priority: "P2"
  });
  // Append an AC section to the feature file using the returned filePath
  const existing = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    existing + "\n## Acceptance criteria\n\n- [ ] AC-1: Login works\n- [ ] AC-2: Logout works\n"
  );

  const result = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const sliceContent = await fs.readFile(result.slice.path, "utf8");

  assert.match(sliceContent, /- \[ \] AC-1: Login works/);
  assert.match(sliceContent, /- \[ \] AC-2: Logout works/);
  // Placeholder should NOT appear
  assert.doesNotMatch(sliceContent, /<replace with/);
});

test("sliceFromFeature falls back to placeholder when FEAT has no AC section", async () => {
  const repo = await tmpRepo("eff-no-ac-");
  const feat = await addFeature(repo, {
    title: "FEAT without ACs",
    priority: "P2"
  });

  const result = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const sliceContent = await fs.readFile(result.slice.path, "utf8");

  // Placeholder should appear as fallback
  assert.match(sliceContent, /<replace with/);
});

test("sliceFromFeature falls back to placeholder when FEAT AC section is malformed (no checkbox lines)", async () => {
  const repo = await tmpRepo("eff-malformed-ac-");
  const feat = await addFeature(repo, {
    title: "FEAT with malformed ACs",
    priority: "P2"
  });
  const existing = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    existing + "\n## Acceptance criteria\n\nSome prose, no checkboxes.\n- plain bullet\n"
  );

  const result = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const sliceContent = await fs.readFile(result.slice.path, "utf8");

  // Safe degrade: placeholder used
  assert.match(sliceContent, /<replace with/);
});

test("sliceFromFeature preserves all FEAT ACs verbatim (checkbox state preserved — all unchecked)", async () => {
  const repo = await tmpRepo("eff-checkbox-");
  const feat = await addFeature(repo, {
    title: "FEAT checkbox test",
    priority: "P2"
  });
  const existing = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    existing +
      "\n## Acceptance criteria\n\n- [ ] AC-1: First unchecked\n- [ ] AC-2: Second unchecked\n- [ ] AC-3: Third unchecked\n"
  );

  const result = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const sliceContent = await fs.readFile(result.slice.path, "utf8");

  assert.match(sliceContent, /- \[ \] AC-1: First unchecked/);
  assert.match(sliceContent, /- \[ \] AC-2: Second unchecked/);
  assert.match(sliceContent, /- \[ \] AC-3: Third unchecked/);
  // No placeholder
  assert.doesNotMatch(sliceContent, /<replace with/);
});
