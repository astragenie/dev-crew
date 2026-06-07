import { test } from "node:test";
import { strict as assert } from "node:assert";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveSkills, renderDispatchBlock } from "../scripts/lib/skill-resolver.mjs";

function tmpJson(name: string, obj: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "resolver-"));
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify(obj));
  return file;
}

const SAAS_PRESET = {
  schemaVersion: 1,
  presetName: "saas",
  projectType: "saas",
  split: true,
  fe: { skills: ["react-engineering", "typescript-pro"] },
  be: { skills: ["csharp-pro", "database-architecture"] }
};

const PLUGIN_PRESET = {
  schemaVersion: 1,
  presetName: "plug",
  projectType: "claude-plugin",
  split: false,
  skills: ["typescript-pro", "frontend-advisory"]
};

test("resolveSkills returns fe block for split=true variant=fe", () => {
  const presetPath = tmpJson("preset.json", SAAS_PRESET);
  const out = resolveSkills({ presetPath, variant: "fe" });
  assert.ok(out);
  assert.equal(out!.variant, "fe");
  assert.equal(out!.source, "preset.fe");
  assert.deepEqual(out!.skills, ["react-engineering", "typescript-pro"]);
});

test("resolveSkills returns be block for split=true variant=be", () => {
  const presetPath = tmpJson("preset.json", SAAS_PRESET);
  const out = resolveSkills({ presetPath, variant: "be" });
  assert.ok(out);
  assert.equal(out!.variant, "be");
  assert.deepEqual(out!.skills, ["csharp-pro", "database-architecture"]);
});

test("resolveSkills returns top-level skills for split=false variant=single", () => {
  const presetPath = tmpJson("preset.json", PLUGIN_PRESET);
  const out = resolveSkills({ presetPath, variant: "single" });
  assert.ok(out);
  assert.equal(out!.source, "preset.skills");
  assert.deepEqual(out!.skills, ["typescript-pro", "frontend-advisory"]);
});

test("resolveSkills returns null for split mismatch (fe on no-split)", () => {
  const presetPath = tmpJson("preset.json", PLUGIN_PRESET);
  const out = resolveSkills({ presetPath, variant: "fe" });
  assert.equal(out, null);
});

test("resolveSkills returns null for split mismatch (single on split=true)", () => {
  const presetPath = tmpJson("preset.json", SAAS_PRESET);
  const out = resolveSkills({ presetPath, variant: "single" });
  assert.equal(out, null);
});

test("resolveSkills returns null when resolved skills array is empty", () => {
  const presetPath = tmpJson("preset.json", { ...PLUGIN_PRESET, skills: [] });
  const out = resolveSkills({ presetPath, variant: "single" });
  assert.equal(out, null);
});

test("resolveSkills appends override skills (concat-dedup)", () => {
  const presetPath = tmpJson("preset.json", SAAS_PRESET);
  const overridePath = tmpJson("loop.json", { be: { skills: ["terraform-advisory"] } });
  const out = resolveSkills({ presetPath, overridePath, variant: "be" });
  assert.ok(out);
  assert.deepEqual(out!.skills, ["csharp-pro", "database-architecture", "terraform-advisory"]);
});

test("resolveSkills $replace marker replaces preset skills", () => {
  const presetPath = tmpJson("preset.json", SAAS_PRESET);
  const overridePath = tmpJson("loop.json", { be: { skills: { $replace: ["go-pro"] } } });
  const out = resolveSkills({ presetPath, overridePath, variant: "be" });
  assert.ok(out);
  assert.deepEqual(out!.skills, ["go-pro"]);
});

test("resolveSkills throws SchemaError on missing schemaVersion", () => {
  const presetPath = tmpJson("preset.json", {
    presetName: "x",
    projectType: "saas",
    split: false,
    skills: ["a"]
  });
  assert.throws(() => resolveSkills({ presetPath, variant: "single" }), { name: "SchemaError" });
});

test("resolveSkills throws SchemaError on unsupported schemaVersion", () => {
  const presetPath = tmpJson("preset.json", { ...PLUGIN_PRESET, schemaVersion: 99 });
  assert.throws(() => resolveSkills({ presetPath, variant: "single" }), { name: "SchemaError" });
});

test("resolveSkills throws on missing preset file", () => {
  assert.throws(() => resolveSkills({ presetPath: "/nonexistent.json", variant: "single" }));
});

test("renderDispatchBlock contains heading and all skill bullets", () => {
  const block = renderDispatchBlock(["a", "b", "c"]);
  assert.ok(block.startsWith("## Required skills (resolved)"));
  for (const s of ["a", "b", "c"]) assert.ok(block.includes(`- ${s}`));
});

test("resolveSkills attaches rendered block to result", () => {
  const presetPath = tmpJson("preset.json", PLUGIN_PRESET);
  const out = resolveSkills({ presetPath, variant: "single" });
  assert.ok(out!.dispatchInstructionBlock.startsWith("## Required skills (resolved)"));
});
