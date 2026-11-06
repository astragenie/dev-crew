// Consumer-install smoke test (FEAT-022/SLICE-47, audit #41). RED FIRST and
// meant to STAY red on this branch: the marketplace cache a consumer
// actually installs ships no node_modules for crew/ (root bun.lock declares
// workspaces; crew/ carries deps the root package.json doesn't), so every
// crew/ entry importing @astragenie/plugin-std, zod, or yaml crashes. This
// is the permanent gate that proves it, scoped to this file only (gate 41,
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
import { setDefaultTimeout, test } from "bun:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  groupDistinctFilesByRuntime,
  listShippedEntrypoints,
  stageConsumerCopy,
  type ShippedEntrypoint
} from "../../scripts/lib/install/shipped-entrypoints.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

setDefaultTimeout(180_000);

// Observed by actually running every entry listShippedEntrypoints produces
// against a staged, node_modules-free copy (2026-11-06). `crew/scripts/
// crew.mts <subcommand>` labels come straight from commands/*.md's literal
// doc examples (placeholder args included) — most crash at module-resolution
// time before argument parsing even runs, which is exactly the bug audit #41
// is proving.
const EXPECTED_FAIL = new Set<string>([
  "crew/hooks/check-subagent-return.mts",
  "crew/hooks/otel-post-tool-use.mts",
  "crew/hooks/otel-stop.mts",
  "crew/hooks/otel-subagent-stop.mts",
  "crew/hooks/pre-tool-use-agent.mts",
  "crew/hooks/subagent-gate-guard.mts",
  'crew/scripts/crew.mts audit --repo "$PWD"',
  'crew/scripts/crew.mts bootstrap --repo "$PWD"',
  'crew/scripts/crew.mts brief-me --repo "$PWD"',
  'crew/scripts/crew.mts claim --repo "<worktreePath>" --owner quickwin-lane -- <available files>',
  `crew/scripts/crew.mts claim-check --repo "<worktreePath>" --owner quickwin-lane -- "\${_args[@]}"`,
  'crew/scripts/crew.mts cost-setup --repo "$PWD"',
  'crew/scripts/crew.mts init --repo "$PWD" --allow-existing',
  "crew/scripts/crew.mts install-global",
  'crew/scripts/crew.mts mark-badge --repo "$PWD" --badge review_passed',
  'crew/scripts/crew.mts profile-block --repo "$PWD" --agent <builder-agent-name> --run-id <runId>',
  'crew/scripts/crew.mts quickwin-lane spawn --repo "$PWD" --json',
  'crew/scripts/crew.mts recall-block --repo "$PWD" --agent <builder-agent-name> --tags "<FEAT tags csv>"',
  'crew/scripts/crew.mts repair-check --repo "$PWD"',
  'crew/scripts/crew.mts wake-up --repo "$PWD"',
  'crew/scripts/crew.mts write-deployment-check --repo "$PWD"',
  'crew/scripts/crew.mts write-deployment-guidance --repo "$PWD" --title "<short title>" --discovery-status repo-derived ...',
  'crew/scripts/crew.mts write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --external-deltas "<off-repo changes required, or \'none\'>"',
  'crew/scripts/crew.mts write-handoff --repo "$PWD" --title "<short title>" --from <role> --to dispatcher --summary "<headline>" --scope "<in scope>" --deliverable "<what shipped>" --files "<changed files>" --confidence "<high|medium|low>" --risks "<risks or none>" --next "<next handoff or none>"',
  'crew/scripts/crew.mts write-review-result --repo "$PWD" --title "<short title>" --decision <approved|approved_with_notes|rejected> --author-id <builder-agent> --judge-id <reviewer-agent> --summary "<verdict>" --evidence "<files checked>" --files "<files in diff>" --test-summary "<test coverage>" --risks "<risks or none>" --next "<follow-up or none>"',
  'crew/scripts/crew.mts write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>"',
  'crew/scripts/crew.mts write-validation-plan --repo "$PWD" --title "<short title>" ...',
  'crew/scripts/crew.mts write-validation-result --repo "$PWD" --title "<short title>" ...',
  'crew/scripts/prune-artifacts.mts --dry-run --older-than <days> --repo "$PWD"',
  'crew/scripts/prune-artifacts.mts --older-than <days> --repo "$PWD"',
  "hooks/pre-push-gate.mts",
  "src/scripts/loop.mts auto",
  'src/scripts/loop.mts brief --repo "$PWD"',
  'src/scripts/loop.mts cost-setup --repo "$PWD"',
  "src/scripts/loop.mts decisions list",
  'src/scripts/loop.mts install --repo "$PWD" --preset dotnet-python',
  "src/scripts/loop.mts learnings log",
  "src/scripts/loop.mts lessons recent [N]",
  "src/scripts/loop.mts list-presets",
  'src/scripts/loop.mts memory-setup --repo "$PWD"',
  "src/scripts/loop.mts phase-gate",
  "src/scripts/loop.mts pr-fix",
  "src/scripts/loop.mts pr-watch <pr-url>",
  "src/scripts/loop.mts resolve-skills",
  "src/scripts/loop.mts retrospective",
  "src/scripts/loop.mts slice close",
  "src/scripts/loop.mts spec add",
  'src/scripts/loop.mts status --repo "$PWD"',
  "src/scripts/watch-tick.mts"
]);

function labelFor(entry: ShippedEntrypoint): string {
  return `${entry.file} ${entry.args.join(" ")}`.trim();
}

test("every shipped hook and CLI entry runs without node_modules (ratchet against EXPECTED_FAIL)", async () => {
  const { pluginCopy, consumerRepo } = await stageConsumerCopy(REPO_ROOT);
  const entries = await listShippedEntrypoints(pluginCopy);
  assert.ok(entries.length > 20, `expected >20 shipped entries, found ${entries.length}`);

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

test("listShippedEntrypoints produces the exact distinct-file-set counts from the real file", async () => {
  const entries = await listShippedEntrypoints(REPO_ROOT);
  const grouped = groupDistinctFilesByRuntime(entries);

  assert.equal(
    grouped.bun.length,
    25,
    `expected 25 distinct bun entrypoints, got ${grouped.bun.length}: ${JSON.stringify(grouped.bun)}`
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
  assert.ok(grouped.bun.includes("src/scripts/loop.mts"));
  assert.ok(grouped.bun.includes("hooks/pre-push-gate.mts"));
  assert.ok(grouped.bun.includes("crew/hooks/subagent-gate-guard.mts"));
  assert.ok(grouped.bun.includes("crew/hooks/pre-tool-use-agent.mts"));
  assert.ok(grouped.bun.includes("crew/hooks/otel-post-tool-use.mts"));
});

test("stageConsumerCopy excludes node_modules at every depth and leaves exactly one consumer commit", async () => {
  const { pluginCopy, consumerRepo } = await stageConsumerCopy(REPO_ROOT);

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
