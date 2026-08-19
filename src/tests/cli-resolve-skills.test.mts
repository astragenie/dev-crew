import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

function writePreset(obj: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "cli-resolver-"));
  const p = path.join(dir, "preset.json");
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

function run(args: string[]) {
  return spawnSync("bun", [LOOP_CLI, "resolve-skills", ...args], { encoding: "utf8" });
}

/** Build an isolated tmp repo with a fixture skills/domain tree — used by
 * the --slice/--tags task-signal path so it never touches this repo's real
 * skills/domain or backlog dirs. */
function makeTaskSignalRepo(skillIds: string[]): string {
  const repo = mkdtempSync(path.join(tmpdir(), "cli-resolver-repo-"));
  for (const id of skillIds) {
    const dir = path.join(repo, "skills", "domain", id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "SKILL.md"), "---\nname: fixture\n---\nfixture\n");
  }
  return repo;
}

function writeSlice(repo: string, sliceId: string, tags: string[]): void {
  const dir = path.join(repo, ".claude", "artifacts", "loop", "ai-loop", "slices", "pending");
  mkdirSync(dir, { recursive: true });
  const fm = [
    "---",
    `id: ${sliceId}`,
    "status: pending",
    `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
    "---",
    "# fixture slice",
    ""
  ].join("\n");
  writeFileSync(path.join(dir, `${sliceId.replace("-", "_")}_fixture.md`), fm);
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

// --- --variant regression, role-variant shape (FEAT-007 / SLICE-35) ---
// Covers the shape used by skills/pm-rescope/SKILL.md and
// skills/triage/SKILL.md (`--variant pm`) — not previously covered by this
// CLI test file (only fe/be/single were), rounding out coverage of all 5
// real call-site shapes (fe, be, single, pm x2) before adding new flags.
test("CLI --variant regression: role variant (pm) resolves from preset.roles.pm, unchanged shape", () => {
  const presetPath = writePreset({
    schemaVersion: 1,
    presetName: "roles-fixture",
    projectType: "service",
    split: false,
    skills: ["typescript-pro"],
    roles: {
      pm: { skills: ["superpowers:verification-before-completion", "loop:loop-discipline"] }
    }
  });
  const r = run(["--variant", "pm", "--preset", presetPath]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.variant, "pm");
  assert.equal(parsed.source, "preset.roles.pm");
  assert.deepEqual(parsed.skills, [
    "superpowers:verification-before-completion",
    "loop:loop-discipline"
  ]);
});

// --- FEAT-007 / SLICE-35: NEW additive --tags / --slice task-signal path ---

test("CLI --tags resolves skills from the live catalog, additive JSON shape", () => {
  const repo = makeTaskSignalRepo(["typescript-pro", "node-ts-patterns"]);
  const r = run(["--tags", "stack:typescript", "--repo", repo]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.skills.sort(), ["node-ts-patterns", "typescript-pro"]);
  assert.equal(parsed.source, "task-signal-matcher");
  assert.deepEqual(parsed.unresolved, []);
  assert.ok(parsed.dispatchInstructionBlock.includes("Required skills"));
});

test("CLI --tags accepts a comma-separated list and unions candidates", () => {
  const repo = makeTaskSignalRepo(["typescript-pro", "security-advisory", "security-sweep"]);
  const r = run(["--tags", "stack:typescript,concern:security", "--repo", repo]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(
    parsed.skills.sort(),
    ["security-advisory", "security-sweep", "typescript-pro"].sort()
  );
});

test("CLI --slice reads tags from slice frontmatter and resolves against the live catalog", () => {
  const repo = makeTaskSignalRepo(["typescript-pro", "node-ts-patterns"]);
  writeSlice(repo, "SLICE-1", ["stack:typescript"]);
  const r = run(["--slice", "SLICE-1", "--repo", repo]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.skills.sort(), ["node-ts-patterns", "typescript-pro"]);
});

test("CLI --slice exits 1 with a named error when the slice does not exist", () => {
  const repo = makeTaskSignalRepo([]);
  const r = run(["--slice", "SLICE-999", "--repo", repo]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /slice not found: SLICE-999/);
});

test("CLI --tags exits 2 with no --preset fallback available and no match", () => {
  const repo = makeTaskSignalRepo(["typescript-pro"]);
  const r = run(["--tags", "concern:nonexistent-concern", "--repo", repo]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no skills resolved/i);
});

test("CLI --tags falls back to the legacy preset path when no tag match AND --preset+--variant given (AC-1)", () => {
  const repo = makeTaskSignalRepo(["typescript-pro"]);
  const presetPath = writePreset(SAAS_PRESET);
  const r = run([
    "--tags",
    "concern:nonexistent-concern",
    "--preset",
    presetPath,
    "--variant",
    "fe",
    "--repo",
    repo
  ]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  // Legacy shape (variant/source/dispatchInstructionBlock), proving the
  // fallback really is the unmodified pickBlock path, not a matcher stub.
  assert.equal(parsed.variant, "fe");
  assert.equal(parsed.source, "preset.fe");
  assert.deepEqual(parsed.skills, ["react-engineering"]);
});

test("CLI --tags --strict exits 1 and names the unresolved id (AC-2, live rather than no-op)", () => {
  const repo = makeTaskSignalRepo(["typescript-pro"]); // vue-engineering absent
  const r = run(["--tags", "stack:vue", "--strict", "--repo", repo]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unresolved.*vue-engineering/i);
});

test("CLI --tags without --strict warns but still resolves the matched subset (AC-2, not silently dropped)", () => {
  const repo = makeTaskSignalRepo(["typescript-pro", "node-ts-patterns"]); // vue-engineering absent
  const r = run(["--tags", "stack:typescript,stack:vue", "--repo", repo]);
  assert.equal(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.skills.sort(), ["node-ts-patterns", "typescript-pro"]);
  assert.deepEqual(parsed.unresolved, ["vue-engineering"]);
  assert.match(r.stderr, /unresolved.*vue-engineering/i);
});
