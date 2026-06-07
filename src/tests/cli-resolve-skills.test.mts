import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const LOOP_CLI = path.resolve("scripts/loop.mjs");

function writePreset(obj: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "cli-resolver-"));
  const p = path.join(dir, "preset.json");
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

function run(args: string[]) {
  return spawnSync("node", [LOOP_CLI, "resolve-skills", ...args], { encoding: "utf8" });
}

const SAAS_PRESET = {
  schemaVersion: 1,
  presetName: "saas",
  projectType: "saas",
  split: true,
  fe: { skills: ["react-engineering"] },
  be: { skills: ["csharp-pro"] }
};

test("CLI exits 0 and emits JSON on happy path", () => {
  const presetPath = writePreset(SAAS_PRESET);
  const r = run(["--variant", "fe", "--preset", presetPath]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.variant, "fe");
  assert.deepEqual(parsed.skills, ["react-engineering"]);
  assert.ok(parsed.dispatchInstructionBlock.includes("Required skills"));
});

test("CLI exits 1 when preset file missing", () => {
  const r = run(["--variant", "fe", "--preset", "/nonexistent.json"]);
  assert.equal(r.status, 1);
  assert.ok(r.stderr.toLowerCase().includes("error"));
});

test("CLI exits 1 when preset JSON malformed", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cli-resolver-bad-"));
  const p = path.join(dir, "preset.json");
  writeFileSync(p, "{not json");
  const r = run(["--variant", "fe", "--preset", p]);
  assert.equal(r.status, 1);
});

test("CLI exits 2 on split mismatch (fe on no-split preset)", () => {
  const presetPath = writePreset({
    schemaVersion: 1,
    presetName: "plug",
    projectType: "claude-plugin",
    split: false,
    skills: ["typescript-pro"]
  });
  const r = run(["--variant", "fe", "--preset", presetPath]);
  assert.equal(r.status, 2);
});

test("CLI exits 2 on empty skills array", () => {
  const presetPath = writePreset({
    schemaVersion: 1,
    presetName: "plug",
    projectType: "claude-plugin",
    split: false,
    skills: []
  });
  const r = run(["--variant", "single", "--preset", presetPath]);
  assert.equal(r.status, 2);
});

test("CLI honors --override path", () => {
  const presetPath = writePreset(SAAS_PRESET);
  const dir = mkdtempSync(path.join(tmpdir(), "cli-resolver-over-"));
  const overridePath = path.join(dir, "loop.json");
  writeFileSync(overridePath, JSON.stringify({ be: { skills: ["go-pro"] } }));
  const r = run(["--variant", "be", "--preset", presetPath, "--override", overridePath]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.skills, ["csharp-pro", "go-pro"]);
});

test("CLI --strict emits stderr warn that the flag is reserved", () => {
  const presetPath = writePreset(SAAS_PRESET);
  const r = run(["--variant", "fe", "--preset", presetPath, "--strict"]);
  // Exit code unchanged (still 0 on happy path); behavior is a no-op
  assert.equal(r.status, 0);
  assert.match(r.stderr, /--strict.*reserved.*no-op/i);
  // Successful resolve still emits the expected JSON shape on stdout
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.variant, "fe");
});
