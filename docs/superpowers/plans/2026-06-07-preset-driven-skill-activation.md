# Preset-Driven Skill Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1 of preset-driven skill activation in the `loop` plugin — preset schema extension, pure resolver, CLI subcommand, manifest validation, and removal of per-FEAT `stack:*` / `surface` classification.

**Architecture:** Three modules in `src/scripts/lib/` — `preset-schema.mts` (types + validate), `deep-merge.mts` (override merger with `$replace` marker), and `skill-resolver.mts` (orchestrates the two). A new `resolve-skills` subcommand wired into `src/scripts/loop.mts` exposes the resolver via CLI with three exit codes (0 ok, 1 error, 2 no-match). All six shipped presets gain a `schemaVersion: 1` block plus axis fields (`projectType`, `frontend`, `backend`, `contract`, `deployment`) and skill arrays (`skills` or `fe.skills` + `be.skills`).

**Tech Stack:** TypeScript ESM (`.mts` → `.mjs`), `node --test` for tests, no runtime dependencies. Source under `src/scripts/`, built output under `scripts/` (CI checks `git diff --exit-code scripts/`).

---

## File Structure

**Create:**
- `src/scripts/lib/preset-schema.mts` — TypeScript types for the preset (`PresetV1`, `ResolvedSkills`) plus `validatePreset(obj): PresetV1` (throws `SchemaError`).
- `src/scripts/lib/deep-merge.mts` — `deepMerge(base, override)` that honors `{ $replace: [...] }` for arrays and concat-dedups otherwise.
- `src/scripts/lib/skill-resolver.mts` — `resolveSkills({ presetPath, overridePath, variant }): ResolvedSkills | null` plus `renderDispatchBlock(skills): string`.
- `src/tests/preset-schema.test.mts` — schema validation tests.
- `src/tests/deep-merge.test.mts` — merge utility tests.
- `src/tests/skill-resolver.test.mts` — resolver behavior tests.
- `src/tests/cli-resolve-skills.test.mts` — CLI shell-out integration tests.
- `commands/dispatch-builder.md` *(optional, last task)* — operator convenience wrapper.

**Modify:**
- `src/scripts/loop.mts` — register `resolve-skills` subcommand in dispatch table.
- `src/scripts/validate-manifests.mts` — extend with preset schema validation pass.
- `src/scripts/lib/classify-parser.mts` — drop `stack:*` and `surface` emission from `buildClassifyUpdates`.
- `commands/backlog-enrich.md` — remove `stack:` / `surface:` instructions from architect prompt.
- `src/tests/classify-parser.test.mts` — flip asserts: confirm `stack:*` / `surface` are NOT written.
- `scripts/presets/typescript-plugin-dev.json` — add new fields, `split: false`.
- `scripts/presets/dotnet-react.json` — add new fields, `split: true`, `fe` + `be` skill blocks.
- `scripts/presets/dotnet-vue.json` — same shape as `dotnet-react.json` with `vue-engineering` instead of `react-engineering`.
- `scripts/presets/dotnet-only.json` — `split: false`, backend-only skill array.
- `scripts/presets/dotnet-aspire-python.json` — `split: true` with Python BE + React FE skills + Aspire deployment.
- `scripts/presets/python-only.json` — `split: false`, Python skill array.
- `.claude/loop.json` — add `schemaVersion: 1` and new axes matching `typescript-plugin-dev` (proves the override path).
- `CHANGELOG.md` — entry for the slice.

---

## Task 1: Preset schema module + tests

**Files:**
- Create: `src/scripts/lib/preset-schema.mts`
- Test: `src/tests/preset-schema.test.mts`

- [ ] **Step 1.1: Write the failing tests**

Create `src/tests/preset-schema.test.mts`:

```ts
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { validatePreset, SchemaError } from "../scripts/lib/preset-schema.mjs";

test("validatePreset accepts a minimal split=false preset", () => {
  const preset = {
    schemaVersion: 1,
    presetName: "tpd",
    projectType: "claude-plugin",
    split: false,
    skills: ["typescript-pro"],
  };
  const out = validatePreset(preset);
  assert.equal(out.split, false);
  assert.deepEqual(out.skills, ["typescript-pro"]);
});

test("validatePreset accepts a minimal split=true preset", () => {
  const preset = {
    schemaVersion: 1,
    presetName: "dr",
    projectType: "saas",
    split: true,
    fe: { skills: ["react-engineering"] },
    be: { skills: ["csharp-pro"] },
  };
  const out = validatePreset(preset);
  assert.equal(out.split, true);
});

test("validatePreset throws on missing schemaVersion", () => {
  assert.throws(
    () => validatePreset({ presetName: "x", projectType: "saas", split: false, skills: [] }),
    SchemaError
  );
});

test("validatePreset throws on unsupported schemaVersion", () => {
  assert.throws(
    () => validatePreset({ schemaVersion: 99, presetName: "x", projectType: "saas", split: false, skills: [] }),
    SchemaError
  );
});

test("validatePreset rejects preset carrying both skills and fe/be blocks", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: true,
        skills: ["a"],
        fe: { skills: ["b"] },
        be: { skills: ["c"] },
      }),
    SchemaError
  );
});

test("validatePreset rejects split=true without both fe and be blocks", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: true,
        fe: { skills: ["b"] },
      }),
    SchemaError
  );
});

test("validatePreset rejects unknown projectType", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "spaceship",
        split: false,
        skills: ["a"],
      }),
    SchemaError
  );
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `node --test src/tests/preset-schema.test.mts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 1.3: Implement `preset-schema.mts`**

Create `src/scripts/lib/preset-schema.mts`:

```ts
export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaError";
  }
}

export type ProjectType = "claude-plugin" | "library" | "service" | "saas";

export interface PresetV1 {
  schemaVersion: 1;
  presetName: string;
  description?: string;
  projectType: ProjectType;
  split: boolean;
  frontend?: { framework: string; language: string };
  backend?: { framework: string; language: string; storage: string };
  contract?: string;
  deployment?: string;
  skills?: string[];
  fe?: { skills: string[] };
  be?: { skills: string[] };
}

const VALID_PROJECT_TYPES: ProjectType[] = ["claude-plugin", "library", "service", "saas"];

export function validatePreset(input: unknown): PresetV1 {
  if (typeof input !== "object" || input === null) {
    throw new SchemaError("preset must be an object");
  }
  const obj = input as Record<string, unknown>;

  if (obj.schemaVersion !== 1) {
    throw new SchemaError(
      `unsupported preset schemaVersion ${String(obj.schemaVersion)}; loop plugin may be too old`
    );
  }
  if (typeof obj.presetName !== "string" || obj.presetName.length === 0) {
    throw new SchemaError("preset.presetName must be a non-empty string");
  }
  if (typeof obj.projectType !== "string" || !VALID_PROJECT_TYPES.includes(obj.projectType as ProjectType)) {
    throw new SchemaError(
      `preset.projectType must be one of ${VALID_PROJECT_TYPES.join(", ")}`
    );
  }
  if (typeof obj.split !== "boolean") {
    throw new SchemaError("preset.split must be a boolean");
  }

  if (obj.split) {
    if (obj.skills !== undefined) {
      throw new SchemaError("split=true preset must not declare top-level skills");
    }
    if (!isSkillBlock(obj.fe) || !isSkillBlock(obj.be)) {
      throw new SchemaError("split=true preset requires both fe.skills and be.skills");
    }
  } else {
    if (obj.fe !== undefined || obj.be !== undefined) {
      throw new SchemaError("split=false preset must not declare fe or be blocks");
    }
    if (!Array.isArray(obj.skills)) {
      throw new SchemaError("split=false preset requires top-level skills array");
    }
  }

  return obj as unknown as PresetV1;
}

function isSkillBlock(value: unknown): value is { skills: string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { skills?: unknown }).skills) &&
    (value as { skills: unknown[] }).skills.every((s) => typeof s === "string")
  );
}
```

- [ ] **Step 1.4: Build and run tests**

Run: `npm run typecheck && node --test tests/preset-schema.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 1.5: Lint + format**

Run: `npm run lint && npm run format:check`
Expected: clean.

- [ ] **Step 1.6: Commit**

```bash
git add src/scripts/lib/preset-schema.mts src/tests/preset-schema.test.mts scripts/lib/preset-schema.mjs tests/preset-schema.test.mjs
git commit -m "feat(SLICE-XX): add preset schema validator (FEAT-XXX)"
```

---

## Task 2: Deep-merge utility + tests

**Files:**
- Create: `src/scripts/lib/deep-merge.mts`
- Test: `src/tests/deep-merge.test.mts`

- [ ] **Step 2.1: Write the failing tests**

Create `src/tests/deep-merge.test.mts`:

```ts
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { deepMerge } from "../scripts/lib/deep-merge.mjs";

test("deepMerge merges plain objects by key", () => {
  const out = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
  assert.deepEqual(out, { a: 1, b: 3, c: 4 });
});

test("deepMerge recurses into nested objects", () => {
  const out = deepMerge(
    { frontend: { framework: "react", language: "typescript" } },
    { frontend: { framework: "vue" } }
  );
  assert.deepEqual(out, { frontend: { framework: "vue", language: "typescript" } });
});

test("deepMerge concat-dedups arrays by default", () => {
  const out = deepMerge({ skills: ["a", "b"] }, { skills: ["b", "c"] });
  assert.deepEqual(out.skills, ["a", "b", "c"]);
});

test("deepMerge $replace marker fully replaces array", () => {
  const out = deepMerge({ skills: ["a", "b"] }, { skills: { $replace: ["x"] } });
  assert.deepEqual(out.skills, ["x"]);
});

test("deepMerge leaves base untouched when override missing key", () => {
  const out = deepMerge({ a: 1 }, {});
  assert.deepEqual(out, { a: 1 });
});

test("deepMerge does not mutate inputs", () => {
  const base = { a: { b: 1 } };
  const override = { a: { c: 2 } };
  deepMerge(base, override);
  assert.deepEqual(base, { a: { b: 1 } });
  assert.deepEqual(override, { a: { c: 2 } });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `node --test src/tests/deep-merge.test.mts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 2.3: Implement `deep-merge.mts`**

Create `src/scripts/lib/deep-merge.mts`:

```ts
type Plain = Record<string, any>;

function isPlainObject(v: unknown): v is Plain {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isReplaceMarker(v: unknown): v is { $replace: unknown[] } {
  return isPlainObject(v) && Array.isArray((v as { $replace?: unknown }).$replace);
}

export function deepMerge<T extends Plain>(base: T, override: Plain): T {
  const out: Plain = { ...base };
  for (const key of Object.keys(override)) {
    const overrideVal = override[key];
    const baseVal = (out as Plain)[key];

    if (isReplaceMarker(overrideVal)) {
      out[key] = [...overrideVal.$replace];
      continue;
    }
    if (Array.isArray(overrideVal) && Array.isArray(baseVal)) {
      out[key] = dedup([...baseVal, ...overrideVal]);
      continue;
    }
    if (isPlainObject(overrideVal) && isPlainObject(baseVal)) {
      out[key] = deepMerge(baseVal, overrideVal);
      continue;
    }
    out[key] = overrideVal;
  }
  return out as T;
}

function dedup<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}
```

- [ ] **Step 2.4: Run tests**

Run: `npm run typecheck && node --test tests/deep-merge.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 2.5: Lint + format check**

Run: `npm run lint && npm run format:check`
Expected: clean.

- [ ] **Step 2.6: Commit**

```bash
git add src/scripts/lib/deep-merge.mts src/tests/deep-merge.test.mts scripts/lib/deep-merge.mjs tests/deep-merge.test.mjs
git commit -m "feat(SLICE-XX): add deep-merge utility with \$replace marker (FEAT-XXX)"
```

---

## Task 3: Skill resolver module + tests

**Files:**
- Create: `src/scripts/lib/skill-resolver.mts`
- Test: `src/tests/skill-resolver.test.mts`

- [ ] **Step 3.1: Write the failing tests**

Create `src/tests/skill-resolver.test.mts`:

```ts
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
  be: { skills: ["csharp-pro", "database-architecture"] },
};

const PLUGIN_PRESET = {
  schemaVersion: 1,
  presetName: "plug",
  projectType: "claude-plugin",
  split: false,
  skills: ["typescript-pro", "frontend-advisory"],
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
  const presetPath = tmpJson("preset.json", { presetName: "x", projectType: "saas", split: false, skills: ["a"] });
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
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `node --test src/tests/skill-resolver.test.mts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3.3: Implement `skill-resolver.mts`**

Create `src/scripts/lib/skill-resolver.mts`:

```ts
import { readFileSync } from "node:fs";
import { validatePreset, type PresetV1 } from "./preset-schema.mjs";
import { deepMerge } from "./deep-merge.mjs";

export interface ResolvedSkills {
  variant: "fe" | "be" | "single";
  skills: string[];
  source: "preset.fe" | "preset.be" | "preset.skills";
  dispatchInstructionBlock: string;
}

export interface ResolveArgs {
  presetPath: string;
  overridePath?: string;
  variant: "fe" | "be" | "single";
}

export function resolveSkills(args: ResolveArgs): ResolvedSkills | null {
  const presetRaw = JSON.parse(readFileSync(args.presetPath, "utf8"));
  const overrideRaw = args.overridePath ? readOverride(args.overridePath) : {};
  const merged = deepMerge(presetRaw, overrideRaw);
  const preset: PresetV1 = validatePreset(merged);

  const block = pickBlock(preset, args.variant);
  if (!block) return null;
  if (block.skills.length === 0) return null;

  return {
    variant: args.variant,
    skills: block.skills,
    source: block.source,
    dispatchInstructionBlock: renderDispatchBlock(block.skills),
  };
}

function readOverride(p: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (err: any) {
    if (err && err.code === "ENOENT") return {};
    throw err;
  }
}

function pickBlock(
  preset: PresetV1,
  variant: ResolveArgs["variant"]
): { skills: string[]; source: ResolvedSkills["source"] } | null {
  if (preset.split && (variant === "fe" || variant === "be")) {
    const block = variant === "fe" ? preset.fe : preset.be;
    if (!block) return null;
    return { skills: block.skills, source: variant === "fe" ? "preset.fe" : "preset.be" };
  }
  if (!preset.split && variant === "single") {
    if (!preset.skills) return null;
    return { skills: preset.skills, source: "preset.skills" };
  }
  return null;
}

export function renderDispatchBlock(skills: string[]): string {
  const bullets = skills.map((s) => `- ${s}`).join("\n");
  return `## Required skills (resolved)\n${bullets}\n`;
}
```

- [ ] **Step 3.4: Run tests**

Run: `npm run typecheck && node --test tests/skill-resolver.test.mjs`
Expected: PASS (13 tests).

- [ ] **Step 3.5: Lint + format check**

Run: `npm run lint && npm run format:check`
Expected: clean.

- [ ] **Step 3.6: Commit**

```bash
git add src/scripts/lib/skill-resolver.mts src/tests/skill-resolver.test.mts scripts/lib/skill-resolver.mjs tests/skill-resolver.test.mjs
git commit -m "feat(SLICE-XX): add skill resolver core (FEAT-XXX)"
```

---

## Task 4: Wire `resolve-skills` CLI subcommand

**Files:**
- Modify: `src/scripts/loop.mts`
- Test: `src/tests/cli-resolve-skills.test.mts`

- [ ] **Step 4.1: Write the failing CLI integration tests**

Create `src/tests/cli-resolve-skills.test.mts`:

```ts
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
  be: { skills: ["csharp-pro"] },
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
    skills: ["typescript-pro"],
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
    skills: [],
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
```

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `node --test src/tests/cli-resolve-skills.test.mts`
Expected: FAIL (unknown subcommand from `scripts/loop.mjs`).

- [ ] **Step 4.3: Wire the subcommand in `src/scripts/loop.mts`**

Locate the command dispatch section (around the `runArchitectSubcommand`, `runBacklogSubcommand` family in `src/scripts/loop.mts`) and add a new handler. Add to flag spec first:

```ts
// Add to FLAG_SPEC object near other flags
"--variant": { key: "variant" },
"--override": { key: "override" },
"--strict": { key: "strict", boolean: true },
```

Add a runner function:

```ts
import { resolveSkills } from "./lib/skill-resolver.mjs";

async function runResolveSkillsCommand(flags: Record<string, any>) {
  if (!flags.variant) {
    process.stderr.write("error: --variant <fe|be|single> required\n");
    process.exitCode = 1;
    return;
  }
  if (!["fe", "be", "single"].includes(flags.variant)) {
    process.stderr.write(`error: --variant must be fe, be, or single (got ${flags.variant})\n`);
    process.exitCode = 1;
    return;
  }

  let preset = flags.preset;
  if (!preset) {
    process.stderr.write("error: --preset <path> required\n");
    process.exitCode = 1;
    return;
  }

  try {
    const resolved = resolveSkills({
      presetPath: preset,
      overridePath: flags.override,
      variant: flags.variant,
    });
    if (resolved === null) {
      process.stderr.write("warn: no skills resolved for this variant (split mismatch or empty array)\n");
      process.exitCode = 2;
      return;
    }
    process.stdout.write(JSON.stringify(resolved, null, 2) + "\n");
    process.exitCode = 0;
  } catch (err: any) {
    process.stderr.write(`error: ${err?.message ?? String(err)}\n`);
    process.exitCode = 1;
  }
}
```

Register in the top-level command dispatch (alongside the existing `command === "help"` / `command === "..."` branches near line 351 in `src/scripts/loop.mts`):

```ts
if (command === "resolve-skills") {
  await runResolveSkillsCommand(flags);
  clearFrontmatterCache();
  return;
}
```

- [ ] **Step 4.4: Run all tests**

Run: `npm test`
Expected: previous suites + 6 new CLI integration tests PASS.

- [ ] **Step 4.5: Lint + format + manifest checks**

Run: `npm run lint && npm run format:check && node ./scripts/validate-manifests.mjs && node ./scripts/validate-content-length.mjs`
Expected: clean.

- [ ] **Step 4.6: Commit**

```bash
git add src/scripts/loop.mts src/tests/cli-resolve-skills.test.mts scripts/loop.mjs tests/cli-resolve-skills.test.mjs
git commit -m "feat(SLICE-XX): wire resolve-skills CLI subcommand (FEAT-XXX)"
```

---

## Task 5: Update all six presets with new schema

**Files:**
- Modify: `scripts/presets/typescript-plugin-dev.json`
- Modify: `scripts/presets/dotnet-react.json`
- Modify: `scripts/presets/dotnet-vue.json`
- Modify: `scripts/presets/dotnet-only.json`
- Modify: `scripts/presets/dotnet-aspire-python.json`
- Modify: `scripts/presets/python-only.json`

- [ ] **Step 5.1: Update `typescript-plugin-dev.json`**

Add fields at top level (keep existing `loop`, `stack`, `reviewers`, `mandatoryDocs`, etc.):

```json
{
  "schemaVersion": 1,
  "presetName": "typescript-plugin-dev",
  "description": "Claude Code plugin authored in TypeScript ESM. Single builder, no FE/BE split.",
  "projectType": "claude-plugin",
  "split": false,
  "frontend": { "framework": "none", "language": "typescript" },
  "backend": { "framework": "node", "language": "typescript", "storage": "none" },
  "contract": "none",
  "deployment": "none",
  "skills": ["typescript-pro", "frontend-advisory"]
}
```

- [ ] **Step 5.2: Update `dotnet-react.json`**

Add:

```json
{
  "schemaVersion": 1,
  "projectType": "saas",
  "split": true,
  "frontend": { "framework": "react", "language": "typescript" },
  "backend": { "framework": "dotnet", "language": "csharp", "storage": "postgres" },
  "contract": "openapi",
  "deployment": "docker",
  "fe": {
    "skills": ["react-engineering", "typescript-pro", "frontend-advisory", "contract-codegen", "a11y-advisory"]
  },
  "be": {
    "skills": ["csharp-pro", "backend-advisory", "database-architecture", "contract-codegen"]
  }
}
```

- [ ] **Step 5.3: Update `dotnet-vue.json`**

Same shape as `dotnet-react.json`. Swap:

```json
{
  "schemaVersion": 1,
  "projectType": "saas",
  "split": true,
  "frontend": { "framework": "vue", "language": "typescript" },
  "backend": { "framework": "dotnet", "language": "csharp", "storage": "postgres" },
  "contract": "openapi",
  "deployment": "docker",
  "fe": {
    "skills": ["vue-engineering", "typescript-pro", "frontend-advisory", "contract-codegen", "a11y-advisory"]
  },
  "be": {
    "skills": ["csharp-pro", "backend-advisory", "database-architecture", "contract-codegen"]
  }
}
```

- [ ] **Step 5.4: Update `dotnet-only.json`**

```json
{
  "schemaVersion": 1,
  "projectType": "service",
  "split": false,
  "frontend": { "framework": "none", "language": "none" },
  "backend": { "framework": "dotnet", "language": "csharp", "storage": "postgres" },
  "contract": "openapi",
  "deployment": "docker",
  "skills": ["csharp-pro", "backend-advisory", "database-architecture", "contract-codegen"]
}
```

- [ ] **Step 5.5: Update `dotnet-aspire-python.json`**

```json
{
  "schemaVersion": 1,
  "projectType": "saas",
  "split": true,
  "frontend": { "framework": "react", "language": "typescript" },
  "backend": { "framework": "dotnet", "language": "csharp", "storage": "postgres" },
  "contract": "openapi",
  "deployment": "aspire",
  "fe": {
    "skills": ["react-engineering", "typescript-pro", "frontend-advisory", "contract-codegen", "a11y-advisory"]
  },
  "be": {
    "skills": ["csharp-pro", "python-pro", "backend-advisory", "database-architecture", "contract-codegen"]
  }
}
```

- [ ] **Step 5.6: Update `python-only.json`**

```json
{
  "schemaVersion": 1,
  "projectType": "service",
  "split": false,
  "frontend": { "framework": "none", "language": "none" },
  "backend": { "framework": "python", "language": "python", "storage": "postgres" },
  "contract": "openapi",
  "deployment": "docker",
  "skills": ["python-pro", "backend-advisory", "database-architecture", "contract-codegen"]
}
```

- [ ] **Step 5.7: Smoke-test each preset through the CLI**

For each preset:
```bash
node scripts/loop.mjs resolve-skills --variant single --preset scripts/presets/typescript-plugin-dev.json
node scripts/loop.mjs resolve-skills --variant fe --preset scripts/presets/dotnet-react.json
node scripts/loop.mjs resolve-skills --variant be --preset scripts/presets/dotnet-react.json
# ...and so on for the remaining presets
```

Expected: each prints valid JSON with the expected `skills` array.

- [ ] **Step 5.8: Commit**

```bash
git add scripts/presets/*.json
git commit -m "feat(SLICE-XX): extend all presets with schemaVersion + axis + skills fields (FEAT-XXX)"
```

---

## Task 6: Extend manifest validator with preset schema check

**Files:**
- Modify: `src/scripts/validate-manifests.mts`

- [ ] **Step 6.1: Read existing validator structure**

Open `src/scripts/validate-manifests.mts` and locate where other JSON manifests are validated. Identify the entry function.

- [ ] **Step 6.2: Add preset validation pass**

Insert near the end of the main `run`-style function (or wherever the validator finalizes):

```ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";

function validateAllPresets(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "scripts", "presets");
  const errors: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    const full = path.join(dir, entry);
    try {
      const raw = JSON.parse(readFileSync(full, "utf8"));
      validatePreset(raw);
    } catch (err: unknown) {
      if (err instanceof SchemaError || err instanceof SyntaxError) {
        errors.push(`${entry}: ${(err as Error).message}`);
      } else {
        throw err;
      }
    }
  }
  return errors;
}
```

Call `validateAllPresets()` from the validator's main entry and accumulate errors into the existing report. Fail the process (`process.exitCode = 1`) if `errors.length > 0`.

- [ ] **Step 6.3: Run the validator**

Run: `node ./scripts/validate-manifests.mjs`
Expected: exit 0 (all six presets pass — they were updated in Task 5).

- [ ] **Step 6.4: Test the failure path manually**

Temporarily break one preset (remove `schemaVersion`), run validator, confirm it fails with the expected error message, then revert.

- [ ] **Step 6.5: Run full test suite**

Run: `npm test && npm run lint && npm run format:check`
Expected: clean.

- [ ] **Step 6.6: Commit**

```bash
git add src/scripts/validate-manifests.mts scripts/validate-manifests.mjs
git commit -m "feat(SLICE-XX): validate preset schema in manifest validator (FEAT-XXX)"
```

---

## Task 7: Update `.claude/loop.json` for this repo

**Files:**
- Modify: `.claude/loop.json`

- [ ] **Step 7.1: Edit `.claude/loop.json`**

Open `.claude/loop.json`. The current file has `"preset": "typescript-plugin-dev"`. Add the new top-level fields (override semantics — these mirror the preset, just made explicit so the override path is exercised):

```json
{
  "preset": "typescript-plugin-dev",
  "schemaVersion": 1,
  "projectType": "claude-plugin",
  "split": false,
  "frontend": { "framework": "none", "language": "typescript" },
  "backend": { "framework": "node", "language": "typescript", "storage": "none" },
  "contract": "none",
  "deployment": "none",
  "skills": ["typescript-pro", "frontend-advisory"]
}
```

(Keep all existing fields — `loop`, `stack`, `reviewers`, `mandatoryDocs`, `productName`, `productDescription`, `stackDescription`, `github`. Only ADD the new ones.)

- [ ] **Step 7.2: Verify resolver round-trips**

Run:
```bash
node scripts/loop.mjs resolve-skills --variant single --preset scripts/presets/typescript-plugin-dev.json --override .claude/loop.json
```
Expected: exit 0, JSON output with `skills: ["typescript-pro", "frontend-advisory"]` (no duplicates after dedup).

- [ ] **Step 7.3: Commit**

```bash
git add .claude/loop.json
git commit -m "chore(SLICE-XX): add new preset axes to .claude/loop.json (FEAT-XXX)"
```

---

## Task 8: Drop stack/surface emission from classifier

**Files:**
- Modify: `src/scripts/lib/classify-parser.mts`
- Modify: `commands/backlog-enrich.md`
- Modify: `src/tests/classify-parser.test.mts`

- [ ] **Step 8.1: Find and read existing classifier behavior**

Read `src/scripts/lib/classify-parser.mts`. Locate `buildClassifyUpdates` (or equivalent) and identify lines that write `stack:` / `surface:` into frontmatter.

- [ ] **Step 8.2: Update tests first — flip asserts**

Open `src/tests/classify-parser.test.mts`. For each test that currently asserts `stack: [...]` or `surface: ...` is emitted:

```ts
// BEFORE
assert.ok(out.frontmatter.includes("stack:"));

// AFTER
assert.ok(!out.frontmatter.includes("stack:"), "stack:* must not be emitted anymore");
assert.ok(!out.frontmatter.includes("surface:"), "surface must not be emitted anymore");
```

Keep all `tags:` assertions intact — that field stays.

- [ ] **Step 8.3: Run tests to verify they fail**

Run: `node --test tests/classify-parser.test.mjs`
Expected: FAIL — classifier still writes the fields the tests now forbid.

- [ ] **Step 8.4: Remove emission from `classify-parser.mts`**

Delete the code blocks that:
- Parse `stack:` from the architect output.
- Parse `surface:` from the architect output.
- Add `stack:` / `surface:` to the frontmatter mutation object.

Keep `tags`, `needs_contract`, `needs_ux` handling intact.

- [ ] **Step 8.5: Update `commands/backlog-enrich.md`**

Open `commands/backlog-enrich.md`. Find the architect prompt body. Remove the instructions that ask the architect to output:
- `surface: <frontend|backend|mixed|none>`
- `stack: [<csharp|node|python|go>]`

Keep `tags`, `needs_contract`, `needs_ux` instructions.

Add a short note near where the removal happened:

> Note: `stack` and `surface` are no longer FEAT-level fields. Project-level stack identity now lives in `scripts/presets/*.json` (consumed by `node scripts/loop.mjs resolve-skills`).

- [ ] **Step 8.6: Run tests**

Run: `npm test`
Expected: classify-parser tests now PASS; other suites unchanged.

- [ ] **Step 8.7: Lint + format**

Run: `npm run lint && npm run format:check && node ./scripts/validate-content-length.mjs`
Expected: clean.

- [ ] **Step 8.8: Commit**

```bash
git add src/scripts/lib/classify-parser.mts src/tests/classify-parser.test.mts commands/backlog-enrich.md scripts/lib/classify-parser.mjs tests/classify-parser.test.mjs
git commit -m "refactor(SLICE-XX): drop stack/surface from classifier; preset is sole source (FEAT-XXX)"
```

---

## Task 9 (optional): `/loop:dispatch-builder` convenience command

Skip this task on first pass if time is tight — the resolver + CLI are usable directly. Add later as a slice follow-up.

**Files:**
- Create: `commands/dispatch-builder.md`

- [ ] **Step 9.1: Author the slash command**

Create `commands/dispatch-builder.md`:

```markdown
---
description: Run skill resolver for a slice variant and write a ready-to-paste dispatch instruction artifact.
---

# Dispatch Builder

Resolve the skill loadout for a builder variant (`fe`, `be`, or `single`) and write the resulting dispatch instruction block as an artifact under `.claude/artifacts/loop/dispatches/`.

Arguments:
- `--slice <SLICE-ID>` (required) — identifies the slice file
- `--variant <fe|be|single>` (required) — which builder loadout

Steps:
1. Read `.claude/loop.json` to resolve the preset path.
2. Run `node scripts/loop.mjs resolve-skills --variant <variant> --preset <presetPath> --override .claude/loop.json`.
3. On exit 0: read the JSON output, assemble objective + scope + the resolved block + ACs from the slice file, write to `.claude/artifacts/loop/dispatches/<SLICE-ID>-<variant>.md`.
4. On exit 2: print a warning that no skills were resolved; the builder will fall back to baked-in routing tables.
5. On exit 1: surface the stderr to the operator and stop.
```

- [ ] **Step 9.2: Smoke-test by running the command manually**

(No automated test for slash commands — manual operator smoke is the contract.)

- [ ] **Step 9.3: Commit**

```bash
git add commands/dispatch-builder.md
git commit -m "feat(SLICE-XX): add /loop:dispatch-builder convenience command (FEAT-XXX)"
```

---

## Task 10: CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 10.1: Add the entry**

At the top of `CHANGELOG.md` under the next version section, add:

```markdown
## [Unreleased]

### Added
- Preset schema v1: `schemaVersion`, `projectType`, `split`, `frontend`, `backend`, `contract`, `deployment`, plus `skills` (split=false) or `fe.skills` + `be.skills` (split=true).
- `node scripts/loop.mjs resolve-skills --variant <fe|be|single>` CLI subcommand. Exit codes: 0 ok, 1 error, 2 no-match.
- Manifest validator now validates every `scripts/presets/*.json` against the new schema.

### Changed
- All six shipped presets updated to schema v1 with explicit skill arrays.
- `/loop:backlog-enrich` no longer asks the architect to emit `stack:*` or `surface` fields — project-level stack identity lives in the preset.

### Removed
- `buildClassifyUpdates` no longer writes `stack:*` or `surface` into FEAT frontmatter. (Historical FEATs are unaffected; readers stop consuming the fields.)
```

- [ ] **Step 10.2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(SLICE-XX): CHANGELOG entry for preset-driven skill activation (FEAT-XXX)"
```

---

## Final verification

- [ ] **Step F.1: Full test suite**

Run: `npm test`
Expected: all suites green, new tests counted (preset-schema, deep-merge, skill-resolver, cli-resolve-skills, classify-parser updates).

- [ ] **Step F.2: All CI gates**

Run:
```bash
node ./scripts/validate-manifests.mjs
node ./scripts/validate-content-length.mjs
npm run typecheck
npm run lint
npm run format:check
```
Expected: every check exits 0.

- [ ] **Step F.3: Confirm `git diff --exit-code scripts/`**

Run: `git diff --exit-code scripts/`
Expected: clean (no uncommitted built `.mjs` drift — all built files were committed alongside their `.mts` source).

- [ ] **Step F.4: Phase 1 smoke walkthrough**

For each preset, run the CLI and confirm output shape:
```bash
for p in scripts/presets/*.json; do
  echo "=== $p ==="
  node scripts/loop.mjs resolve-skills --variant fe --preset "$p" || true
  node scripts/loop.mjs resolve-skills --variant be --preset "$p" || true
  node scripts/loop.mjs resolve-skills --variant single --preset "$p" || true
done
```
Expected: split presets emit JSON on `fe` and `be`, exit 2 on `single`. No-split presets emit JSON on `single`, exit 2 on `fe`/`be`.

- [ ] **Step F.5: Confirm legacy fallback still works**

In a test repo (or temporarily): rename `.claude/loop.json` and one preset to make the CLI fall through to exit 2. Confirm that `devcrew:fullstack-dev` still works using the baked-in routing tables. This proves Phase 1 is non-breaking for repos that haven't migrated their preset yet.

---

## What this plan does NOT include

- Phase 2 (`/devcrew:orchestrate-slice` automatic invocation of `resolve-skills`) — blocked on upstream `hero-crew` change documented in `docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md`. Track separately.
- Phase 3 (deleting baked-in routing tables from `devcrew:fullstack-dev*` agents) — requires Phase 2 to be stable for at least one release cycle.
- Migration of historical FEAT frontmatter to remove stale `stack:*` / `surface` fields. They are harmless once readers stop consuming them.
- Skill ID lint registry — current decision is opaque strings + `--strict` opt-in escalation. Revisit if drift appears.

---

## Notes

- Replace `SLICE-XX` and `FEAT-XXX` in every commit message with the actual slice and feature IDs assigned when this plan is promoted into the loop's slice workflow.
- TypeScript source under `src/scripts/**.mts` compiles to `scripts/**.mjs`. CI checks `git diff --exit-code scripts/`, so commit the built output alongside the source in every task.
- Pre-push hook (`scripts/pre-push-validate.mjs`) runs manifest + content-length + format-check locally. Tasks 1–10 should all pass it.
