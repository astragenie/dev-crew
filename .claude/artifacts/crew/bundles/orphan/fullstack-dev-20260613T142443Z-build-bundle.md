---
slice: unknown
builder: fullstack-dev
run_id: 20260613T142443Z
feat: FEAT-129
files_touched: ["docs/code-conventions.md", "src/scripts/lib/skill-frontmatter.mts", "src/scripts/validate-manifests.mts", "src/tests/validate-manifests.test.mts"]
files_read: []
diff_stat: { files: 0, additions: 0, deletions: 0 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-121: keywords field in SKILL.md frontmatter schema

- Created: 2026-06-13T14:24:43.507Z
- From: fullstack-dev
- To: lead
- Objective: Added optional keywords: string[] to SkillMeta and SKILL.md frontmatter validation; validate-manifests.mts now rejects non-array keywords; 4 new tests pass; documented in code-conventions.md
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/validate-manifests.mts
  - src/scripts/lib/skill-frontmatter.mts
  - src/tests/validate-manifests.test.mts
  - docs/code-conventions.md
- Confidence: high
- Risks: -
- Suggested Next Handoff: -


## Diff

```diff

```

## Files touched

### docs/code-conventions.md

```
# Code Conventions — loop

This plugin follows the same conventions as the companion `crew`
plugin. The canonical reference is
[`hero-crew/docs/standards/code-conventions.md`](https://github.com/sergeymilashico/hero-crew/blob/main/docs/standards/code-conventions.md).

Mirrors
[`Astragenie.Standards/docs/javascript/coding-conventions.md`](https://github.com/sergeymilashico/Astragenie.Standards/blob/main/docs/javascript/coding-conventions.md)
when that repo is installed at a sibling path; otherwise self-contained.
The Standards repo is provenance + cross-team alignment, not a runtime
dependency.

## Lint and format

Both enforced by CI:

- `eslint.config.mjs` — flat config. `no-var`, `prefer-const`,
  `eqeqeq` (smart), `no-implicit-globals`, function-size and
  complexity budgets.
- `.prettierrc.json` — 2-space, double-quote, `trailingComma: "none"`,
  `printWidth: 100`.

## Module shape

- ESM only. One responsibility per module. Split at ~400 lines or
  when two clearly separable concerns merge.
- Public API lives in the top-level module (`scripts/lib/foo.mjs`).
  Internal helpers live in `scripts/lib/foo/<concern>.mjs`. Example:
  `slice-linker.mjs` keeps the public `sliceFromFeature` /
  `completeSlice` surface; `slice-linker/crew-bridge.mjs` carries the
  best-effort crew CLI emission.

## CLI

- Subcommand dispatch via `COMMANDS` registry in
  `scripts/loop.mjs`.
- Flag parsing via `FLAG_SPEC` table.
- Per-command lazy `await import("./lib/...")` keeps startup fast
  when a single subcommand runs.

## Error handling

- Throw for programmer errors (unknown command, missing required arg).
- Return `{ ok, error }` (or capture in `try` / set a `null` default)
  for soft / best-effort failures that should not break the surrounding
  operation. The slice-linker `crew-bridge` calls are the reference
  example: missing crew CLI is a soft no-op.
- Never `process.exit(N)` from a library. Set `process.exitCode = N`
  from the entry-point script after printing.

## Hard dependency on `crew`

This plugin requires `crew >= MIN_CREW_VERSION`
(`scripts/lib/plugin-identity.mjs`). The version gate runs at install
time. Bump `MIN_CREW_VERSION` only when this plugin starts using a
crew CLI surface that older versions do not expose.

## Tests

- One behavior per `test()`. Behavior-describing file names —
  never release-version-prefixed names.
- File-system tests use `fs.mkdtemp(path.join(os.tmpdir(), ...))`
  for isolation.
- Tests that exercise the crew CLI bridge skip with a clear reason
  when the local cache crew version is below `MIN_CREW_VERSION`;
  they do not fail. See `tests/loop-installer.test.mjs`.

## Evidence-before-claims convention

Before any completion claim ("tests pass", "lint clean", "build green",
"bug fixed", "feature works", "deploy succeeded"), an agent must run
the corresponding verification command in the current turn and post
the full output. Assertions from memory or prior turns are prohibited.
See [`skills/verification-before-completion/SKILL.md`](../skills/verification-before-completion/SKILL.md)
for the canonical claim→evidence lookup table and Iron Law block.

## HARD-GATE tag convention

Skill Markdown files use two XML tag levels to signal enforcement severity.
Use `<HARD-GATE>...</HARD-GATE>` for absolute prohibitions and
non-negotiable rules — things where a violation breaks the loop workflow
entirely (for example: stopping mid-slice without evidence, omitting a
required slice field, or bypassing the phase-gate ceremony). Use
`<EXTREMELY-IMPORTANT>...</EXTREMELY-IMPORTANT>` for strong warnings and
high-severity guidance where a violation is very bad but does not
completely break the workflow (for example: evidence quality standards,
artifact naming conventions, or recommended sequencing that may have
acceptable exceptions in extreme edge cases). Every hard rule block that
an autonomous agent MUST obey unconditionally belongs inside `<HARD-GATE>`
tags; strong-but-soft guidance that an agent should almost always follow
but that admits rare exceptions belongs inside `<EXTREMELY-IMPORTANT>` tags.

## Skill files

Skills live under `skills/**/SKILL.md`. Each file carries a YAML frontmatter
block with the following fields.

### Required fields

- `name` — unique skill identifier (string)
- `description` — one-line human-readable description (string)

### Optional fields

- `trigger` — one of `always_on` (default), `glob`, `manual`, `model_decision`
- `globs` — array of glob patterns (required when `trigger: glob`)
- `keywords` — array of keyword strings

### `keywords` field

Skills may declare `keywords: [word1, word2]` in their SKILL.md frontmatter.
When present (and when the keyword-triggered dispatch scanner ships in a later
release), these keywords will auto-activate the skill when any keyword appears
in the dispatch prompt. For now, the field is schema-validated but inert.

`validate-manifests.mts` enforces that when `keywords` is present it must be
an array of strings. A plain string value (e.g. `keywords: kubernetes`) is
rejected with a clear error message.

## GitHub sync frontmatter fields

Added by `/loop:publish`; null/absent means unpublished. Do not set manually.

**FEAT files:**

```yaml
github_issue: 42       # GitHub issue number (integer)
github_milestone: 3    # GitHub milestone number (integer)
```

**SLICE files:**

```yaml
github_issue: 87       # GitHub native sub-issue number (integer)
```

These fields are written back by `scripts/lib/github-sync.mjs`. The sync
module is opt-in via `"github": { "enabled": true }` in `.claude/loop.json`.

```

### src/scripts/lib/skill-frontmatter.mts

```
import { parseFrontmatter } from "./frontmatter.mjs";

export interface SkillMeta {
  name: string;
  description: string;
  trigger: "always_on" | "glob" | "manual" | "model_decision";
  globs: string[];
  keywords: string[];
}

/**
 * Parses SKILL.md frontmatter to extract name, description, trigger, globs, and keywords.
 * - trigger defaults to "always_on" when absent
 * - globs defaults to [] when absent
 * - keywords defaults to [] when absent
 * - Returns a typed SkillMeta object
 */
export function parseSkillFrontmatter(content: string): SkillMeta {
  const { frontmatter } = parseFrontmatter(content);

  const name = frontmatter.name || "";
  const description = frontmatter.description || "";
  const trigger = frontmatter.trigger || "always_on";
  const globs = Array.isArray(frontmatter.globs) ? frontmatter.globs : [];
  const keywords = Array.isArray(frontmatter.keywords) ? frontmatter.keywords : [];

  return {
    name,
    description,
    trigger,
    globs,
    keywords
  };
}

```

### src/scripts/validate-manifests.mts

```
#!/usr/bin/env node

// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

// Recursively find all SKILL.md files under a root directory.
function findSkillFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(full));
    } else if (entry.name === "SKILL.md") {
      results.push(full);
    }
  }
  return results;
}

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export function validateAllPresets(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "scripts", "presets");
  const errors: string[] = [];
  if (!existsSync(dir)) return errors;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    const full = path.join(dir, entry);
    try {
      const raw = JSON.parse(readFileSync(full, "utf8"));
      validatePreset(raw);
    } catch (err: unknown) {
      if (err instanceof SchemaError || err instanceof SyntaxError) {
        errors.push(`presets/${entry}: ${(err as Error).message}`);
      } else {
        throw err;
      }
    }
  }
  return errors;
}

export function validateCommandFrontmatter(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "commands");
  const errors: string[] = [];
  if (!existsSync(dir)) return errors;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".md")) continue;
    const stem = entry.slice(0, -".md".length);
    const full = path.join(dir, entry);
    const content = readFileSync(full, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    // Validate name
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "name")) {
      errors.push(`commands/${entry}: missing required field "name"`);
    } else if (typeof frontmatter["name"] !== "string" || frontmatter["name"] === "") {
      errors.push(`commands/${entry}: "name" must be a non-empty string`);
    } else if (frontmatter["name"] !== stem) {
      errors.push(
        `commands/${entry}: "name" must equal filename stem "${stem}", got "${frontmatter["name"]}"`
      );
    }
    // Validate description
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "description")) {
      errors.push(`commands/${entry}: missing required field "description"`);
    } else if (
      typeof frontmatter["description"] !== "string" ||
      frontmatter["description"] === ""
    ) {
      errors.push(`commands/${entry}: "description" must be a non-empty string`);
    }
    // Validate auto_execute_steps
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "auto_execute_steps")) {
      errors.push(`commands/${entry}: missing required field "auto_execute_steps"`);
    } else if (typeof frontmatter["auto_execute_steps"] !== "boolean") {
      errors.push(
        `commands/${entry}: "auto_execute_steps" must be a boolean, got ${typeof frontmatter["auto_execute_steps"]}`
      );
    }
  }
  return errors;
}

function validateMarketplaceEntries(
  marketplace: Record<string, any>,
  fail: (msg: string) => void
): void {
  for (const entry of marketplace.plugins) {
    if (!entry.name) fail(`marketplace.json: a plugins[] entry is missing "name"`);
    if (!entry.version || !SEMVER_RE.test(entry.version)) {
      fail(
        `marketplace.json: entry "${entry.name}" version "${entry.version}" is not parseable semver`
      );
    }
    if (!entry.source) fail(`marketplace.json: entry "${entry.name}" missing "source"`);
  }
}

// marketplace.json moved to sergeymilashico/astra-marketplace (4a46687). When
// a local copy exists (mirror or transitional setup), enforce lockstep with
// plugin.json. When absent, treat as authoritative-elsewhere and skip.
function validateMarketplaceJson(
  marketplace: Record<string, any>,
  plugin: Record<string, any>,
  fail: (msg: string) => void
): void {
  for (const field of ["name", "owner", "plugins"]) {
    if (
      marketplace[field] === undefined ||
      marketplace[field] === null ||
      marketplace[field] === ""
    ) {
      fail(`marketplace.json: missing required field "${field}"`);
    }
  }
  const ownEntry = marketplace.plugins.find(
    (entry: { name: string; version: string; source?: string }) => entry.name === plugin.name
  );
  if (!ownEntry) {
    fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
  } else if (ownEntry.version !== plugin.version) {
    fail(
      `version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
        `Run "npm run bump-version <new-version>" to sync.`
    );
  }
  validateMarketplaceEntries(marketplace, fail);
}

export function validateSkillFrontmatter(repoRoot: string): string[] {
  const skillsDir = path.join(repoRoot, "skills");
  const errors: string[] = [];
  const files = findSkillFiles(skillsDir);
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "keywords")) continue;
    const kw = frontmatter["keywords"];
    if (!Array.isArray(kw)) {
      const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
      errors.push(`${rel}: "keywords" must be an array of strings, got ${typeof kw}`);
      continue;
    }
    for (let i = 0; i < kw.length; i += 1) {
      if (typeof kw[i] !== "string") {
        const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
        errors.push(`${rel}: "keywords[${i}]" must be a string, got ${typeof kw[i]}`);
      }
    }
  }
  return errors;
}

export async function validateManifests(repoRoot: string) {
  const failures: string[] = [];
  const fail = (msg: string) => failures.push(msg);

  const plugin = await readJson(path.join(repoRoot, ".claude-plugin", "plugin.json"));
  const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const marketplace = existsSync(marketplacePath) ? await readJson(marketplacePath) : null;
  const pkg = await readJson(path.join(repoRoot, "package.json"));

  for (const field of ["name", "version", "description", "author", "license"]) {
    if (plugin[field] === undefined || plugin[field] === null || plugin[field] === "") {
      fail(`plugin.json: missing required field "${field}"`);
    }
  }

  if (!SEMVER_RE.test(plugin.version))
    fail(`plugin.json: version "${plugin.version}" is not parseable semver`);

  if (marketplace) {
    validateMarketplaceJson(marketplace, plugin, fail);
  }

  if (pkg.version !== plugin.version) {
    fail(
      `version drift: plugin.json="${plugin.version}" vs package.json="${pkg.version}". ` +
        `Run "npm run bump-version <new-version>" to sync all three files.`
    );
  }

  for (const presetErr of validateAllPresets(repoRoot)) {
    fail(presetErr);
  }

  for (const cmdErr of validateCommandFrontmatter(repoRoot)) {
    fail(cmdErr);
  }

  for (const skillErr of validateSkillFrontmatter(repoRoot)) {
    fail(skillErr);
  }

  return { ok: failures.length === 0, failures, plugin, marketplace, pkg };
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  const entryPath = path.resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

if (isMainEntry()) {
  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateManifests(repoRoot);
  if (!result.ok) {
    console.error("Manifest validation failed:");
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("Manifests OK:");
    console.log(`  plugin.json      ${result.plugin.name}@${result.plugin.version}`);
    console.log(`  package.json     ${result.pkg.name}@${result.pkg.version}`);
    if (result.marketplace) {
      console.log(`  marketplace.json (${result.marketplace.plugins.length} entries)`);
      for (const entry of result.marketplace.plugins) {
        console.log(`    - ${entry.name}@${entry.version}`);
      }
    } else {
      console.log(`  marketplace.json (absent — registry at sergeymilashico/astra-marketplace)`);
    }
  }
}

```

### src/tests/validate-manifests.test.mts

```
import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { validateAllPresets, validateSkillFrontmatter } from "../scripts/validate-manifests.mjs";

function tmpRepo(prefix: string): { root: string; presetsDir: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const presetsDir = path.join(root, "scripts", "presets");
  mkdirSync(presetsDir, { recursive: true });
  return { root, presetsDir };
}

function writePreset(presetsDir: string, name: string, body: unknown | string): void {
  const content = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  writeFileSync(path.join(presetsDir, `${name}.json`), content);
}

const VALID_SPLIT_FALSE = {
  schemaVersion: 1,
  presetName: "ok-split-false",
  projectType: "claude-plugin",
  split: false,
  skills: ["typescript-pro"]
};

const VALID_SPLIT_TRUE = {
  schemaVersion: 1,
  presetName: "ok-split-true",
  projectType: "saas",
  split: true,
  fe: { skills: ["react-engineering"] },
  be: { skills: ["csharp-pro"] }
};

test("validateAllPresets returns empty errors on a clean presets dir", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-clean-");
  writePreset(presetsDir, "p1", VALID_SPLIT_FALSE);
  writePreset(presetsDir, "p2", VALID_SPLIT_TRUE);
  const errors = validateAllPresets(root);
  assert.deepEqual(errors, []);
});

test("validateAllPresets returns empty when presets dir is absent (no-op guard)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "vm-presets-missing-"));
  const errors = validateAllPresets(root);
  assert.deepEqual(errors, []);
});

test("validateAllPresets reports a SchemaError with the offending filename", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-schema-bad-");
  writePreset(presetsDir, "ok", VALID_SPLIT_FALSE);
  writePreset(presetsDir, "broken", {
    ...VALID_SPLIT_FALSE,
    schemaVersion: 99 // unsupported version triggers SchemaError
  });
  const errors = validateAllPresets(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /broken\.json/);
  assert.match(errors[0] ?? "", /schemaVersion/);
});

test("validateAllPresets reports a SyntaxError when the JSON is malformed", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-bad-json-");
  writePreset(presetsDir, "ok", VALID_SPLIT_TRUE);
  writePreset(presetsDir, "syntax-bad", "{not valid json");
  const errors = validateAllPresets(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /syntax-bad\.json/);
});

test("validateAllPresets accumulates multiple errors and ignores non-JSON files", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-multi-bad-");
  writeFileSync(path.join(presetsDir, "README.md"), "# not a preset");
  writePreset(presetsDir, "bad-1", { ...VALID_SPLIT_FALSE, schemaVersion: 0 });
  writePreset(presetsDir, "bad-2", { ...VALID_SPLIT_TRUE, projectType: "spaceship" });
  writePreset(presetsDir, "ok", VALID_SPLIT_FALSE);
  const errors = validateAllPresets(root);
  assert.equal(errors.length, 2);
});

// --- validateSkillFrontmatter / keywords field ---

function tmpSkillRepo(prefix: string): { root: string; skillsDir: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const skillsDir = path.join(root, "skills", "my-skill");
  mkdirSync(skillsDir, { recursive: true });
  return { root, skillsDir };
}

function writeSkillMd(skillsDir: string, content: string): void {
  writeFileSync(path.join(skillsDir, "SKILL.md"), content, "utf8");
}

test("validateSkillFrontmatter returns [] when skills dir is absent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "vm-skill-no-dir-"));
  const errors = validateSkillFrontmatter(root);
  assert.deepEqual(errors, []);
});

test("validateSkillFrontmatter returns [] for valid SKILL.md with no keywords field", () => {
  const { root, skillsDir } = tmpSkillRepo("vm-skill-no-kw-");
  writeSkillMd(
    skillsDir,
    "---\nname: my-skill\ndescription: A skill\ntrigger: always_on\n---\n# My Skill\n"
  );
  const errors = validateSkillFrontmatter(root);
  assert.deepEqual(errors, []);
});

test("validateSkillFrontmatter returns [] when keywords is a valid string array", () => {
  const { root, skillsDir } = tmpSkillRepo("vm-skill-kw-valid-");
  writeSkillMd(
    skillsDir,
    "---\nname: my-skill\ndescription: A skill\nkeywords: [kubernetes, azure]\n---\n# My Skill\n"
  );
  const errors = validateSkillFrontmatter(root);
  assert.deepEqual(errors, []);
});

test("validateSkillFrontmatter reports error when keywords is a plain string (not an array)", () => {
  const { root, skillsDir } = tmpSkillRepo("vm-skill-kw-string-");
  writeSkillMd(
    skillsDir,
    "---\nname: my-skill\ndescription: A skill\nkeywords: not-an-array\n---\n# My Skill\n"
  );
  const errors = validateSkillFrontmatter(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /keywords/);
  assert.match(errors[0] ?? "", /array of strings/);
});

```

## Files read

