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
import { afterAll, setDefaultTimeout, test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectHookEntries, resolveEntries } from "../../scripts/build-dist.mjs";
import {
  stageConsumerCopy,
  type ConsumerStage
} from "../../scripts/lib/install/shipped-entrypoints.mjs";

setDefaultTimeout(180_000);

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

// FEAT-037/SLICE-59: six fixed CLI entries, not five — `dispatch.mts` joined
// the set alongside `loop.mts`. `loop.mts`'s `dispatch` subcommand spawns
// `dispatch.mts` as a sibling child process; under the bundle, that sibling
// has to be a bundled `dist/dispatch.js` too, or `bun dist/loop.js dispatch
// ...` dies with a module-resolution error (no `dispatch.mts` next to
// `dist/loop.js`). This list is data-driven off CLI_OUT_NAMES so a future
// CLI entry addition only needs a change here, not a parallel literal list.
test("resolveEntries() produces the hook entries plus the fixed CLI entries, no duplicates", async () => {
  const entries = await resolveEntries();
  const outs = entries.map((e) => e.out);
  assert.equal(new Set(outs).size, outs.length, "duplicate `out` path in resolved entries");
  const expectedCliOuts = [
    "crew.js",
    "loop.js",
    "dispatch.js",
    "report-to-pr.js",
    "prune-artifacts.js",
    "watch-tick.js"
  ];
  for (const cliOut of expectedCliOuts) {
    assert.ok(outs.includes(cliOut), `missing CLI entry ${cliOut}`);
  }
  const cliOuts = outs.filter((o) => !o.startsWith("hooks/"));
  assert.equal(
    cliOuts.length,
    expectedCliOuts.length,
    `expected exactly ${expectedCliOuts.length} CLI entries, found ${cliOuts.length}: ${JSON.stringify(cliOuts)}`
  );
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

test("dist/ is committed (not .gitignore'd)", async () => {
  const gitignore = await readFile(path.join(REPO_ROOT, ".gitignore"), "utf8");
  const distIgnored = gitignore
    .split("\n")
    .map((l) => l.trim())
    .some((l) => l === "dist" || l === "dist/" || l === "/dist" || l === "/dist/");
  assert.equal(distIgnored, false, "dist/ is still in .gitignore — FEAT-026 requires it committed");
});

// Node builtins stay bare specifiers (node:fs, node:path, ...) even after
// bundling — they're not node_modules. @opentelemetry/* and @aws-sdk/* are
// the two prefixes build-dist.mts's `external` config deliberately leaves
// un-inlined (see src/scripts/build-dist.mts's EXTERNAL const) so a
// consumer without those packages gets a clean, catchable import failure
// (FEAT-026 AC-3) instead of a silently wrong bundle. Anything else bare
// would mean this entry's bundle still expects something from
// node_modules at runtime — exactly what FEAT-026 exists to eliminate.
const ALLOWED_BARE_PREFIXES = ["node:", "@opentelemetry/", "@aws-sdk/"];
const BUILTIN_MODULE_NAMES = new Set(builtinModules);

// Real ESM import/export-from statements only ever appear at the start of a
// (post-bundle) line, e.g. `import fs from "fs/promises";` — anchoring on
// `^` avoids matching the English word "from" followed by a quote inside
// an arbitrary string literal elsewhere in the bundle (e.g. a log message
// like `[normalized from '${verdict.decision}']`, which an unanchored
// regex false-positived on while writing this test).
const STATIC_IMPORT_RE = /^\s*(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']/gm;
const BARE_IMPORT_STATEMENT_RE = /^\s*import\s*["']([^"']+)["']/gm;
const REQUIRE_OR_DYNAMIC_IMPORT_RE = /\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/g;

function bareSpecifiersIn(source: string): string[] {
  const found = new Set<string>();
  for (const re of [STATIC_IMPORT_RE, BARE_IMPORT_STATEMENT_RE, REQUIRE_OR_DYNAMIC_IMPORT_RE]) {
    for (const match of source.matchAll(re)) {
      const specifier = match[1];
      if (specifier === undefined || specifier.startsWith(".") || specifier.startsWith("/"))
        continue;
      if (ALLOWED_BARE_PREFIXES.some((prefix) => specifier.startsWith(prefix))) continue;
      if (BUILTIN_MODULE_NAMES.has(specifier)) continue;
      found.add(specifier);
    }
  }
  return [...found].sort();
}

test("every committed dist/*.js and dist/hooks/*.js bundle has no bare node_modules import left un-inlined", async () => {
  const entries = await resolveEntries();
  assert.ok(entries.length > 0, "resolveEntries() returned nothing to check");
  for (const entry of entries) {
    const source = await readFile(path.join(REPO_ROOT, "dist", entry.out), "utf8");
    const bare = bareSpecifiersIn(source);
    assert.deepEqual(
      bare,
      [],
      `dist/${entry.out} still imports from node_modules: ${bare.join(", ")}`
    );
  }
});

// `build()` itself is not exercised here: a destructive full rebuild of the
// committed dist/ from a test would race any concurrently running --check
// in CI. The CLI's `build()` and `--check` paths were proved directly
// (rc=0 clean / rc=1 after a real stale-source edit, reverted) as part of
// FEAT-026's own validation evidence instead.

// Review A (SLICE-52) found config-resolver.mts/loop-installer-tokens.mts/
// decisions-store.mts/grade-writer.mts (presets/templates) and
// github-sync-loader.mts/github-provider.mts (runtime-only .mjs modules)
// all resolved their data/sibling files relative to `import.meta.url`,
// which under the bundle is dist/'s own location, not the source tree's —
// `bun dist/loop.js list-presets` and `bun dist/loop.js install --repo
// <dir> --preset dotnet-python` both threw ENOENT while `bun
// src/scripts/loop.mts ...` succeeded. Fixed by resolving those dirs via
// CLAUDE_PLUGIN_ROOT (set by Claude Code for every hook/CLI invocation)
// when present, same pattern hooks/pre-push-gate.mts already used. This is
// the real end-to-end regression lock for that fix: stages a full,
// node_modules-free copy of this plugin tree (mirroring a real consumer
// install) and runs the bundled dist/loop.js CLI directly out of it with
// CLAUDE_PLUGIN_ROOT set, exactly as Claude Code would invoke it.
const stagedBaseDirs: string[] = [];

async function stageConsumerCopyTracked(pluginRoot: string): Promise<ConsumerStage> {
  const stage = await stageConsumerCopy(pluginRoot);
  stagedBaseDirs.push(stage.baseDir);
  return stage;
}

afterAll(async () => {
  await Promise.all(
    stagedBaseDirs.map((dir) => rm(dir, { recursive: true, force: true }).catch(() => {}))
  );
});

test("bun dist/loop.js list-presets runs clean from a node_modules-free consumer copy (review A repro)", async () => {
  const { pluginCopy, consumerRepo } = await stageConsumerCopyTracked(REPO_ROOT);
  const proc = Bun.spawnSync(["bun", path.join(pluginCopy, "dist", "loop.js"), "list-presets"], {
    cwd: consumerRepo,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginCopy, CLAUDE_PROJECT_DIR: consumerRepo }
  });
  const stdout = proc.stdout ? Buffer.from(proc.stdout).toString("utf8") : "";
  const stderr = proc.stderr ? Buffer.from(proc.stderr).toString("utf8") : "";
  assert.equal(
    proc.exitCode,
    0,
    `expected rc=0, got ${proc.exitCode}. stdout: ${stdout} stderr: ${stderr}`
  );
  assert.doesNotMatch(stderr, /ENOENT|Cannot find (package|module)/);
});

test("bun dist/loop.js install --preset dotnet-python runs clean from a node_modules-free consumer copy (review A repro)", async () => {
  const { pluginCopy, consumerRepo } = await stageConsumerCopyTracked(REPO_ROOT);
  const proc = Bun.spawnSync(
    [
      "bun",
      path.join(pluginCopy, "dist", "loop.js"),
      "install",
      "--repo",
      consumerRepo,
      "--preset",
      "dotnet-python"
    ],
    {
      cwd: consumerRepo,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginCopy, CLAUDE_PROJECT_DIR: consumerRepo }
    }
  );
  const stdout = proc.stdout ? Buffer.from(proc.stdout).toString("utf8") : "";
  const stderr = proc.stderr ? Buffer.from(proc.stderr).toString("utf8") : "";
  assert.equal(
    proc.exitCode,
    0,
    `expected rc=0, got ${proc.exitCode}. stdout: ${stdout} stderr: ${stderr}`
  );
  assert.doesNotMatch(stderr, /ENOENT|Cannot find (package|module)/);
});
