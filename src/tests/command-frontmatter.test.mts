import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  validateCommandFrontmatter,
  validateManifests
} from "../scripts/validate-manifests.mjs";

function tmpRepo(prefix: string): { root: string; commandsDir: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const commandsDir = path.join(root, "commands");
  mkdirSync(commandsDir, { recursive: true });
  return { root, commandsDir };
}

function writeCmd(commandsDir: string, name: string, content: string): void {
  writeFileSync(path.join(commandsDir, `${name}.md`), content, "utf8");
}

// Test 1 — Happy path: valid frontmatter returns no errors
test("validateCommandFrontmatter returns [] for valid frontmatter (happy path)", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-valid-");
  writeCmd(
    commandsDir,
    "my-cmd",
    "---\nname: my-cmd\ndescription: Does something useful\nauto_execute_steps: false\n---\n# Body\n"
  );
  writeCmd(
    commandsDir,
    "other-cmd",
    "---\nname: other-cmd\ndescription: Another command\nauto_execute_steps: true\n---\n# Body\n"
  );
  const errors = validateCommandFrontmatter(root);
  assert.deepEqual(errors, []);
});

// Test 2 — Missing required fields: all three fields absent
test("validateCommandFrontmatter reports 3 errors when frontmatter is absent", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-missing-");
  writeCmd(commandsDir, "bare", "# Bare Command\nSome body text.\n");
  const errors = validateCommandFrontmatter(root);
  assert.equal(errors.length, 3);
  const joined = errors.join("\n");
  assert.match(joined, /bare\.md.*"name"/);
  assert.match(joined, /bare\.md.*"description"/);
  assert.match(joined, /bare\.md.*"auto_execute_steps"/);
});

// Test 3 — Name mismatch: name field does not match filename stem
test("validateCommandFrontmatter reports name mismatch error", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-mismatch-");
  writeCmd(
    commandsDir,
    "slice-start",
    "---\nname: wrong-name\ndescription: Opens a slice\nauto_execute_steps: false\n---\n"
  );
  const errors = validateCommandFrontmatter(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /slice-start\.md.*"name".*"slice-start".*"wrong-name"/);
});

// Test 4 — Wrong type for auto_execute_steps: string instead of boolean
test("validateCommandFrontmatter reports type error for auto_execute_steps string", () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-type-");
  writeCmd(
    commandsDir,
    "triage",
    '---\nname: triage\ndescription: Runs PM scoring\nauto_execute_steps: "yes"\n---\n'
  );
  const errors = validateCommandFrontmatter(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /triage\.md.*"auto_execute_steps".*boolean/);
});

// Test 5 — No commands directory: returns empty errors (no-op guard)
test("validateCommandFrontmatter returns [] when commands/ directory is absent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cmd-fm-no-dir-"));
  const errors = validateCommandFrontmatter(root);
  assert.deepEqual(errors, []);
});

// Test 6 — validateManifests integrates command validation
test("validateManifests propagates command frontmatter errors into result.failures", async () => {
  const { root, commandsDir } = tmpRepo("cmd-fm-integrate-");
  // Write a minimal plugin.json and package.json so validateManifests can proceed
  const pluginDir = path.join(root, ".claude-plugin");
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    path.join(pluginDir, "plugin.json"),
    JSON.stringify({
      name: "test-plugin",
      version: "1.0.0",
      description: "Test plugin",
      author: "Tester",
      license: "MIT"
    }),
    "utf8"
  );
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "test-plugin", version: "1.0.0" }),
    "utf8"
  );
  // Write a command file missing the name field
  writeCmd(
    commandsDir,
    "cmd",
    "---\ndescription: Some command\nauto_execute_steps: false\n---\n"
  );
  const result = await validateManifests(root);
  assert.equal(result.ok, false);
  const joined = result.failures.join("\n");
  assert.match(joined, /cmd\.md.*"name"/);
});
