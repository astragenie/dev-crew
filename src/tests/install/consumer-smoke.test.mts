// Consumer-install smoke test (FEAT-022/SLICE-47, audit #41). RED FIRST and
// meant to STAY red on this branch: the marketplace cache a consumer
// actually installs ships no node_modules for crew/ (root bun.lock declares
// workspaces; crew/ carries deps the root package.json doesn't), so every
// crew/ entry importing @astragenie/plugin-std, zod, or yaml crashes. This
// is the permanent gate that proves it, scoped to this file only (gate 42,
// slow-tests) so it never blocks the fast merge gate.
//
// EXPECTED_FAIL below is a ratchet, not a todo list: it is seeded with
// exactly what this tree observably crashes on today. Do NOT "fix" entries
// by editing this set when the underlying crash is still real — only remove
// an entry once its actual root cause (FEAT-026 self-contained bundles, or
// the later dist/ path rewrite for the CLI entries) has landed.
//
// Known gap (documented, not fixed here): `crew/scripts/crew.mts
// show-workflow-state` is NOT currently invoked via `bun
// "${CLAUDE_PLUGIN_ROOT}/..."` anywhere in commands/*.md or agents/*.md —
// commands/build.md's collision pre-flight reads workflow-state.json
// directly via `jq` instead (FEAT-029, not yet landed, would switch it to
// the CLI subcommand). Since listMarkdownCliEntrypoints only sources CLI
// entries from those two markdown globs (by design — see
// shipped-entrypoints.mts), that specific invocation is not in the entry
// list and therefore cannot appear in the observed-failure set below.
import { afterAll, setDefaultTimeout, test } from "bun:test";
import assert from "node:assert/strict";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  groupDistinctFilesByRuntime,
  listShippedEntrypoints,
  stageConsumerCopy,
  type ConsumerStage,
  type ShippedEntrypoint
} from "../../scripts/lib/install/shipped-entrypoints.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

setDefaultTimeout(180_000);

// Each stageConsumerCopy() call copies the ~269 MB plugin tree into a fresh
// os.tmpdir() base dir that nothing else removes. Track every base dir this
// file stages and clean them up once, after all tests, so repeated runs on
// a persistent self-hosted CI runner don't leak unbounded disk.
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

// Observed by actually running every entry listShippedEntrypoints produces
// against a staged, node_modules-free copy (2026-11-06). `crew/scripts/
// crew.mts <subcommand>` labels come straight from commands/*.md's literal
// doc examples (placeholder args included) — most crash at module-resolution
// time before argument parsing even runs, which is exactly the bug audit #41
// is proving.
// FEAT-026/SLICE-52: dist/ bundles cleared every HOOK entry (hooks/hooks.json
// now points `bun` commands at dist/hooks/*.js, self-contained -- no
// node_modules needed).
//
// FEAT-037/SLICE-55 (2026-11-06): commands/*.md's literal invocations are
// now repointed at dist/crew.js / dist/loop.js / dist/prune-artifacts.js /
// dist/watch-tick.js (W2.5 path rewrite). All 42 prior commands-origin
// labels below stopped appearing verbatim -- confirmed by re-running
// listShippedEntrypoints + spawning every entry against a staged copy that
// every single one is now observed as PASSING or re-surfaced under a new
// label (see the two buckets below), so none of the old labels are
// reinstated here.
//
// Two buckets replace them:
//  (a) agents/*.md-origin crew.mts labels (6 entries, listed below) that
//      the prior file+firstArg dedup in listMarkdownCliEntrypoints was
//      silently collapsing behind the now-removed commands/*.md label for
//      the same subcommand (e.g. both commands/build.md and an agents/*.md
//      file called `mark-badge`, and only the commands/ one -- scanned
//      first -- ever appeared in the entry list). With the commands/
//      literal gone, these agents-origin labels surface for the first time
//      and still crash with `Cannot find module '@astragenie/plugin-std'`
//      (verified by direct execution 2026-11-06) -- the same unfixed
//      root cause, just newly visible. SLICE-56 (agents/*.md repoint) owns
//      clearing these.
//  (b) the new dist/*.js-labelled commands entries themselves: verified by
//      direct execution (2026-11-06) that NONE of them hit a module-
//      resolution error anymore -- every one now fails, if at all, on a
//      clean CLI argument/precondition check (e.g. `repair-check refused:
//      --failure-output <text> is required`, `No .claude/loop.json found`),
//      which is exactly the "own argument-validation error, never a
//      module-resolution error" outcome FEAT-037/AC-5 calls a pass. They
//      are deliberately NOT added here: this ratchet's `failed` heuristic
//      (any non-zero exit, not just a module-resolution crash) does not
//      yet distinguish that case, which is why the first assertion below
//      still reports them under `newlyBroken` -- a known, scoped gap left
//      for SLICE-59 ("drain EXPECTED_FAIL to empty and assert the
//      entry-count floor") to close by refining that heuristic, not by
//      re-listing these as expected failures.
const EXPECTED_FAIL = new Set<string>([
  'crew/scripts/crew.mts mark-badge --repo "$PWD" --badge help_request --note "<setup problem>"',
  'crew/scripts/crew.mts write-deployment-check --repo "$PWD" --scaffold --status in-progress --confidence low --title "<run title from dispatch>" --summary "starting investigation"',
  `crew/scripts/crew.mts write-final-synthesis --repo "$PWD" --title "<title>" --external-deltas "<deltas or 'none'>" --summary "<summary>"`,
  "crew/scripts/crew.mts write-handoff",
  'crew/scripts/crew.mts write-review-result --repo "$PWD" --scaffold --status in-progress --confidence low --title "<run title from dispatch>" --summary "starting architecture review"',
  'crew/scripts/crew.mts write-validation-result --repo "$PWD" --scaffold --status in-progress --confidence low --title "<slice-id> validation" --summary "starting investigation"'
]);

function labelFor(entry: ShippedEntrypoint): string {
  return `${entry.file} ${entry.args.join(" ")}`.trim();
}

test("every shipped hook and CLI entry runs without node_modules (ratchet against EXPECTED_FAIL)", async () => {
  const { pluginCopy, consumerRepo } = await stageConsumerCopyTracked(REPO_ROOT);
  const entries = await listShippedEntrypoints(pluginCopy);
  assert.ok(entries.length > 20, `expected >20 shipped entries, found ${entries.length}`);

  // FEAT-037/AC-2 floor guard (SLICE-55): a path rewrite must fix the
  // invocations, not shrink what the parser can even see. The CLI floor
  // (42) and dist/hooks/*.js floor (11) are the counts observed on
  // 2026-11-06, before this slice's rewrite; both grew afterward
  // (63 CLI, 21 dist/hooks) but must never fall below these.
  const cliEntryCount = entries.filter((entry) => entry.kind === "cli").length;
  const distHookEntryCount = entries.filter(
    (entry) => entry.kind === "hook" && entry.file.startsWith("dist/hooks/")
  ).length;
  assert.ok(
    cliEntryCount >= 42,
    `CLI entry count dropped below the 42-entry floor: found ${cliEntryCount}`
  );
  assert.ok(
    distHookEntryCount >= 11,
    `dist/hooks/*.js entry count dropped below the 11-entry floor: found ${distHookEntryCount}`
  );

  const hasBash = Bun.which("bash") !== null;
  const observed = new Set<string>();

  for (const entry of entries) {
    const label = labelFor(entry);
    if (entry.runtime === "bash" && !hasBash) {
      // "skipped: no bash" — not a failure, per FEAT-022.
      continue;
    }
    const absoluteFile = path.join(pluginCopy, entry.file);
    const cmd =
      entry.runtime === "bun"
        ? ["bun", "--no-install", absoluteFile, ...entry.args]
        : entry.runtime === "node"
          ? ["node", absoluteFile, ...entry.args]
          : ["bash", absoluteFile, ...entry.args];
    const stdinData = entry.stdinFixture
      ? Buffer.from(await readFile(entry.stdinFixture))
      : Buffer.from("{}");
    const proc = Bun.spawnSync(cmd, {
      cwd: consumerRepo,
      stdin: stdinData,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginCopy, CLAUDE_PROJECT_DIR: consumerRepo },
      timeout: 30_000
    });
    const stderrText = proc.stderr ? Buffer.from(proc.stderr).toString("utf8") : "";
    const failed = proc.exitCode !== 0 || /Cannot find (package|module)/.test(stderrText);
    if (failed) observed.add(label);
  }

  const newlyBroken = [...observed].filter((label) => !EXPECTED_FAIL.has(label)).sort();
  const nowPassing = [...EXPECTED_FAIL].filter((label) => !observed.has(label)).sort();

  assert.deepEqual(newlyBroken, [], `newly broken: ${JSON.stringify(newlyBroken)}`);
  assert.deepEqual(nowPassing, [], `remove from EXPECTED_FAIL: ${JSON.stringify(nowPassing)}`);

  // (c) Stay red while EXPECTED_FAIL is non-empty — this is the permanent
  // consumer-install gate FEAT-022 intentionally leaves red until FEAT-026
  // (self-contained bundles) and the later dist/ path rewrite clear it.
  assert.deepEqual(
    [...EXPECTED_FAIL].sort(),
    [],
    `EXPECTED_FAIL is non-empty (${EXPECTED_FAIL.size} known-broken entries) -- ` +
      "see FEAT-022/FEAT-026. This test is designed to stay red until those land."
  );
});

// FEAT-028 (2026-11-06): the bun count rose 25 -> 29 — four agent prompts
// (architect, reviewer, verifier, aiplugin-dev) had their dead relative-path
// script invocations (`node ./scripts/x.ts`, invisible to the CLI_LINE_RE
// scanner) rewritten to real `bun "${CLAUDE_PLUGIN_ROOT}/crew/scripts/..."`
// invocations, newly surfacing crew/scripts/validate-agents.mts,
// validate-manifests.mts, validate-adr-template.mts, and
// crew/scripts/lib/parallel-gates.mts as real, counted, executed CLI
// entrypoints for the first time.
//
// FEAT-037/SLICE-55 (2026-11-06): the bun count rose 29 -> 30. All literal
// commands/*.md invocations of src/scripts/loop.mts / crew/scripts/
// prune-artifacts.mts / src/scripts/watch-tick.mts were repointed at
// dist/loop.js / dist/prune-artifacts.js / dist/watch-tick.js, so those
// three source-path labels dropped out of the bun set entirely (net -3,
// no agents/*.md reference keeps them alive) while dist/crew.js,
// dist/loop.js, dist/prune-artifacts.js and dist/watch-tick.js entered it
// for the first time as CLI (not hook) entries (net +4) -> 29 - 3 + 4 = 30.
// crew/scripts/crew.mts itself stays in the set: agents/*.md still invokes
// it directly pending SLICE-56's repoint.
test("listShippedEntrypoints produces the exact distinct-file-set counts from the real file", async () => {
  const entries = await listShippedEntrypoints(REPO_ROOT);
  const grouped = groupDistinctFilesByRuntime(entries);

  assert.equal(
    grouped.bun.length,
    30,
    `expected 30 distinct bun entrypoints, got ${grouped.bun.length}: ${JSON.stringify(grouped.bun)}`
  );
  assert.equal(
    grouped.node.length,
    6,
    `expected 6 distinct node entrypoints, got ${grouped.node.length}: ${JSON.stringify(grouped.node)}`
  );
  assert.equal(
    grouped.bash.length,
    1,
    `expected 1 distinct bash entrypoint, got ${grouped.bash.length}: ${JSON.stringify(grouped.bash)}`
  );

  assert.ok(grouped.bash.includes("crew/scripts/log_event.sh"));
  assert.ok(grouped.bun.includes("crew/scripts/crew.mts"));
  assert.ok(grouped.bun.includes("dist/loop.js"));
  assert.ok(grouped.bun.includes("dist/crew.js"));
  assert.ok(grouped.bun.includes("dist/prune-artifacts.js"));
  assert.ok(grouped.bun.includes("dist/watch-tick.js"));
  assert.ok(grouped.bun.includes("dist/hooks/pre-push-gate.js"));
  assert.ok(grouped.bun.includes("dist/hooks/subagent-gate-guard.js"));
  assert.ok(grouped.bun.includes("dist/hooks/pre-tool-use-agent.js"));
  assert.ok(grouped.bun.includes("dist/hooks/otel-post-tool-use.js"));
});

test("stageConsumerCopy excludes node_modules at every depth and leaves exactly one consumer commit", async () => {
  const { pluginCopy, consumerRepo } = await stageConsumerCopyTracked(REPO_ROOT);

  async function findNodeModulesDirs(dir: string): Promise<string[]> {
    const found: string[] = [];
    async function walk(current: string): Promise<void> {
      let dirents;
      try {
        dirents = await readdir(current, { withFileTypes: true });
      } catch {
        return;
      }
      for (const dirent of dirents) {
        if (dirent.name === "node_modules") {
          found.push(path.join(current, dirent.name));
          continue;
        }
        if (dirent.isDirectory()) await walk(path.join(current, dirent.name));
      }
    }
    await walk(dir);
    return found;
  }

  const nodeModulesDirs = await findNodeModulesDirs(pluginCopy);
  assert.deepEqual(
    nodeModulesDirs,
    [],
    `node_modules found at: ${JSON.stringify(nodeModulesDirs)}`
  );

  const logProc = Bun.spawnSync(["git", "log", "--oneline"], { cwd: consumerRepo });
  const commits = Buffer.from(logProc.stdout)
    .toString("utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
  assert.equal(commits.length, 1, `expected exactly one consumer commit, got ${commits.length}`);
});
