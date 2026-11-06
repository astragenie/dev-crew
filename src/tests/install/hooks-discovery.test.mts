// Discovery test for FEAT-033/SLICE-46 — NOT an execution test. Asserts the
// shipped plugin hooks file lives at the one path Claude Code's plugin
// loader actually discovers. See the live two-plugin marker test that
// proved this: `.claude/artifacts/crew/validations/20261105T223500Z-validation-plugin-hooks-json-discovery.md`
// (only `hooks/hooks.json` loaded; `.claude-plugin/hooks/hooks.json` never
// did, across all 38 devcrew hook entries, for every consumer on 1.1.0).
//
// Hermetic: resolves this repo's own root via import.meta.url rather than
// assuming a cwd, and reads only — never writes.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

test("hooks/hooks.json exists at the plugin root", async () => {
  const ok = await exists(path.join(REPO_ROOT, "hooks", "hooks.json"));
  assert.equal(
    ok,
    true,
    "hooks/hooks.json is missing — this is the only path Claude Code discovers"
  );
});

test(".claude-plugin/hooks/hooks.json does not exist — the dead location from before FEAT-033", async () => {
  const ok = await exists(path.join(REPO_ROOT, ".claude-plugin", "hooks", "hooks.json"));
  assert.equal(
    ok,
    false,
    ".claude-plugin/hooks/hooks.json re-appeared — this path is never discovered by the plugin loader; " +
      "its presence risks someone editing a dead copy"
  );
});

test(".claude-plugin/plugin.json has no conflicting `hooks` key", async () => {
  const raw = await readFile(path.join(REPO_ROOT, ".claude-plugin", "plugin.json"), "utf8");
  const manifest = JSON.parse(raw) as Record<string, unknown>;
  assert.equal(
    Object.hasOwn(manifest, "hooks"),
    false,
    "plugin.json declares a `hooks` key pointing elsewhere — combined with hooks/hooks.json at the " +
      "plugin root, both would load and double-fire every hook"
  );
});

test("hooks/hooks.json parses as JSON with at least one hook event registered", async () => {
  const raw = await readFile(path.join(REPO_ROOT, "hooks", "hooks.json"), "utf8");
  const parsed = JSON.parse(raw) as { hooks?: Record<string, unknown> };
  const events = Object.keys(parsed.hooks ?? {});
  assert.ok(events.length >= 1, `expected >=1 hook event, found ${events.length}`);
});
