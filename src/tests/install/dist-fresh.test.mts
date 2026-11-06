// Unit coverage for src/scripts/build-dist.mts (FEAT-026/SLICE-52).
//
// Complements consumer-smoke.test.mts (slow, E2E, stays red until W2.5):
// this file exercises build-dist's own entry-discovery and freshness-check
// logic directly, fast, and in isolation from the CLI-path ratchet.
//
// The "recovers .mts sources from migrated hooks.json" test below is a
// regression lock for a real incident hit live during SLICE-52: once
// hooks/hooks.json is rewritten so every `bun` command points at
// `dist/hooks/<name>.js` (this FEAT's own deliverable), a naive
// entry-discovery regex that only matches `.mts` paths finds zero hook
// entries post-migration — and the next `bun run build:dist` then deletes
// every previously-built dist/hooks/*.js file (`build()` rm -rf's dist/
// before rebuilding from whatever resolveEntries() found). See
// docs/memory.md "FEAT-026 dist-path entry-recovery".
//
// `--check` is deliberately exercised via a real `bun` SUBPROCESS with
// `NODE_ENV` stripped from its environment, never by importing
// `check()`/`build()` and calling them in-process from this file:
// `bun test` sets `process.env.NODE_ENV = "test"` for its own process, and
// `Bun.build()`'s bundler inlines that at bundle time — which shrinks a
// dependency shared by `loop.mts`/`hooks/pre-push-gate.mts` (`isTestEnv()`)
// and produces bundle bytes that differ from the real
// `bun ./src/scripts/build-dist.mts --check` CI invocation (gate 21, which
// never runs under `bun test` and so never has `NODE_ENV=test` set) — a
// false "stale" report with no source change behind it. Found live writing
// this test (SLICE-52): calling `check()` in-process reported
// `hooks/pre-push-gate.js` and `loop.js` stale on a provably-unchanged
// tree; a child process that inherited the parent's `NODE_ENV=test`
// reproduced the same false stale; deleting `NODE_ENV` from only the
// child's env (not the in-process call, which Bun.build reads at a point
// this test cannot reach) fixes it.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectHookEntries, resolveEntries } from "../../scripts/build-dist.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Built from a variable (not a literal `${CLAUDE_PLUGIN_ROOT}` inside a
// string) so biome's noTemplateCurlyInString doesn't mistake the fixture
// hooks.json commands below for an unresolved template placeholder — this
// token is a literal, uninterpolated piece of hooks.json, not JS.
const PLUGIN_ROOT_TOKEN = "$" + "{CLAUDE_PLUGIN_ROOT}";

async function withTempHooksJson(
  body: string,
  fn: (hooksJsonPath: string) => Promise<void>
): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "devcrew-dist-fresh-"));
  const hooksJsonPath = path.join(dir, "hooks.json");
  try {
    await writeFile(hooksJsonPath, body, "utf8");
    await fn(hooksJsonPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("collectHookEntries resolves pre-migration .mts-path bun commands", async () => {
  await withTempHooksJson(
    JSON.stringify({
      hooks: {
        Stop: [
          {
            hooks: [
              { type: "command", command: `bun "${PLUGIN_ROOT_TOKEN}/crew/hooks/otel-stop.mts"` }
            ]
          }
        ]
      }
    }),
    async (hooksJsonPath) => {
      const entries = await collectHookEntries(hooksJsonPath);
      assert.deepEqual(entries, ["crew/hooks/otel-stop.mts"]);
    }
  );
});

test("collectHookEntries recovers the .mts source from a post-migration dist/hooks/*.js command", async () => {
  // checkpoint-cadence.mts is a real crew/hooks/ source on this tree — this
  // proves the dist-path form round-trips back to the same source the
  // legacy .mts-path form would have named directly.
  await withTempHooksJson(
    JSON.stringify({
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: `bun "${PLUGIN_ROOT_TOKEN}/dist/hooks/checkpoint-cadence.js"`
              }
            ]
          }
        ]
      }
    }),
    async (hooksJsonPath) => {
      const entries = await collectHookEntries(hooksJsonPath);
      assert.deepEqual(entries, ["crew/hooks/checkpoint-cadence.mts"]);
    }
  );
});

test("collectHookEntries recovers hooks/<name>.mts (non-crew dir) from its dist/hooks/*.js command", async () => {
  // pre-push-gate.mts lives directly under hooks/, not crew/hooks/ — proves
  // the basename lookup checks every known source dir, not just crew/hooks/.
  await withTempHooksJson(
    JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: `bun "${PLUGIN_ROOT_TOKEN}/dist/hooks/pre-push-gate.js"`
              }
            ]
          }
        ]
      }
    }),
    async (hooksJsonPath) => {
      const entries = await collectHookEntries(hooksJsonPath);
      assert.deepEqual(entries, ["hooks/pre-push-gate.mts"]);
    }
  );
});

test("collectHookEntries throws loudly for a dist/hooks/*.js command with no matching .mts source anywhere", async () => {
  await withTempHooksJson(
    JSON.stringify({
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: `bun "${PLUGIN_ROOT_TOKEN}/dist/hooks/totally-bogus-hook.js"`
              }
            ]
          }
        ]
      }
    }),
    async (hooksJsonPath) => {
      await assert.rejects(
        () => collectHookEntries(hooksJsonPath),
        /no \.mts source found for dist\/hooks\/totally-bogus-hook\.js/
      );
    }
  );
});

test("collectHookEntries dedupes a hook referenced from multiple events", async () => {
  await withTempHooksJson(
    JSON.stringify({
      hooks: {
        PostToolUse: [
          {
            hooks: [
              { type: "command", command: `bun "${PLUGIN_ROOT_TOKEN}/dist/hooks/record-edit.js"` }
            ]
          }
        ],
        Stop: [
          {
            hooks: [
              { type: "command", command: `bun "${PLUGIN_ROOT_TOKEN}/crew/hooks/record-edit.mts"` }
            ]
          }
        ]
      }
    }),
    async (hooksJsonPath) => {
      const entries = await collectHookEntries(hooksJsonPath);
      assert.deepEqual(entries, ["crew/hooks/record-edit.mts"]);
    }
  );
});

test("collectHookEntries against the real hooks/hooks.json returns every committed dist/hooks/*.js entry's source", async () => {
  const entries = await collectHookEntries();
  // AC-5: every bun command in the real hooks.json is post-migration today —
  // this only passes if every basename resolves back to a real .mts file.
  assert.ok(entries.length >= 20, `expected >=20 hook entries, found ${entries.length}`);
  for (const src of entries) assert.ok(src.endsWith(".mts"), `non-.mts entry: ${src}`);
});

test("resolveEntries() produces the hook entries plus the five fixed CLI entries, no duplicates", async () => {
  const entries = await resolveEntries();
  const outs = entries.map((e) => e.out);
  assert.equal(new Set(outs).size, outs.length, "duplicate `out` path in resolved entries");
  for (const cliOut of [
    "crew.js",
    "loop.js",
    "report-to-pr.js",
    "prune-artifacts.js",
    "watch-tick.js"
  ]) {
    assert.ok(outs.includes(cliOut), `missing CLI entry ${cliOut}`);
  }
  const hookOuts = outs.filter((o) => o.startsWith("hooks/"));
  assert.ok(hookOuts.length >= 20, `expected >=20 hooks/*.js entries, found ${hookOuts.length}`);
});

test("bun run build:dist -- --check exits 0 against the committed dist/ on an unchanged tree (real subprocess)", () => {
  // Strip NODE_ENV (bun test sets it to "test") so the child's Bun.build
  // call matches the real, non-test CI invocation — see file header.
  const { NODE_ENV: _nodeEnv, ...envWithoutNodeEnv } = process.env;
  const proc = Bun.spawnSync(
    ["bun", path.join(REPO_ROOT, "src", "scripts", "build-dist.mts"), "--check"],
    {
      cwd: REPO_ROOT,
      env: envWithoutNodeEnv
    }
  );
  const stdout = proc.stdout ? Buffer.from(proc.stdout).toString("utf8") : "";
  const stderr = proc.stderr ? Buffer.from(proc.stderr).toString("utf8") : "";
  assert.equal(
    proc.exitCode,
    0,
    `expected rc=0, got ${proc.exitCode}. stdout: ${stdout} stderr: ${stderr}`
  );
});

test("dist/.build-info.json records the pinned Bun version and matches resolveEntries()", async () => {
  const bunVersionPin = (await readFile(path.join(REPO_ROOT, ".bun-version"), "utf8")).trim();
  const buildInfo = JSON.parse(
    await readFile(path.join(REPO_ROOT, "dist", ".build-info.json"), "utf8")
  ) as {
    bunVersion: string;
    entries: Array<{ src: string; out: string }>;
  };
  assert.equal(buildInfo.bunVersion, bunVersionPin);
  const resolved = await resolveEntries();
  assert.equal(buildInfo.entries.length, resolved.length);
});

test("dist/ is committed (not .gitignore'd) and dist/hooks/*.js bundles contain no bare node_modules import", async () => {
  const gitignore = await readFile(path.join(REPO_ROOT, ".gitignore"), "utf8");
  const distIgnored = gitignore
    .split("\n")
    .map((l) => l.trim())
    .some((l) => l === "dist" || l === "dist/" || l === "/dist" || l === "/dist/");
  assert.equal(distIgnored, false, "dist/ is still in .gitignore — FEAT-026 requires it committed");
});

// `build()` itself is not exercised here: a destructive full rebuild of the
// committed dist/ from a test would race any concurrently running --check
// in CI. The CLI's `build()` and `--check` paths were proved directly
// (rc=0 clean / rc=1 after a real stale-source edit, reverted) as part of
// FEAT-026's own validation evidence instead.
