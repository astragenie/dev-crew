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
//  (a) agents/*.md-origin crew.mts labels (6 entries) that the prior
//      file+firstArg dedup in listMarkdownCliEntrypoints was silently
//      collapsing behind the now-removed commands/*.md label for the same
//      subcommand (e.g. both commands/build.md and an agents/*.md file
//      called `mark-badge`, and only the commands/ one -- scanned first --
//      ever appeared in the entry list). FEAT-037/SLICE-56 (2026-11-08)
//      repointed every agents/*.md invocation (53 refs, 19 files) from
//      crew/scripts/crew.mts / src/scripts/loop.mts at dist/crew.js /
//      dist/loop.js; all six of these labels are now observed PASSING
//      (confirmed by direct execution 2026-11-08) and are correctly absent
//      below.
//  (b) the new dist/*.js-labelled commands entries: verified by direct
//      execution (2026-11-06) that none of them hit a module-resolution
//      error anymore. Most fail, if at all, only on a clean CLI
//      argument/precondition check against the doc examples' placeholder
//      args (e.g. `repair-check refused: --failure-output <text> is
//      required`, `No .claude/loop.json found`, or a raw-but-harmless
//      `ENOENT ... mkdir '...."$PWD"...'` from the literal, never-shell-
//      expanded `"$PWD"` token this harness passes as one argv entry) --
//      exactly the "own argument-validation error, never a
//      module-resolution error" outcome FEAT-037/AC-5 calls a pass. The
//      classifyRunResult() below (pulled forward from SLICE-59 at the
//      team lead's direction, 2026-11-06) makes that distinction
//      explicit instead of treating every non-zero exit as a ratchet
//      failure, so these are correctly absent from EXPECTED_FAIL.
//
// FEAT-037/SLICE-56 (2026-11-08) found one new, real crash while repointing
// agents/swarm.md: its "Resolve loop CLI path" prose and its `dispatch
// prepare` / `dispatch finalize` bash blocks used the bare, unquoted
// `bun src/scripts/loop.mts` form, which CLI_LINE_RE (only matches the
// quoted `bun "${CLAUDE_PLUGIN_ROOT}/<path>"` form) never scanned -- so this
// entry was invisible to the ratchet before this slice. Rewriting it to the
// canonical quoted dist/loop.js form (required by AC-3's zero-occurrence
// grep) makes it visible for the first time, and it genuinely crashes:
// loop.mts's `dispatch` subcommand (src/scripts/loop.mts:916-926) resolves
// its child-process target as the sibling file `dispatch.mts` next to
// `import.meta.url` (`path.join(path.dirname(thisFile), "dispatch.mts")`).
// In dev that sibling is `src/scripts/dispatch.mts`; in the dist bundle,
// `dist/loop.js` has no `dist/dispatch.mts` (or `dispatch.js`) sibling --
// `dispatch.mts` is not one of build-dist.mts's five bundled CLI entries --
// so the spawned child fails with `error: Module not found
// "<pluginRoot>/dist/dispatch.mts"` (verified by direct execution
// 2026-11-08). Both `dispatch prepare` and `dispatch finalize` hit this;
// listMarkdownCliEntrypoints' file+firstArg dedup (first arg is always
// literally "dispatch") only surfaces one label for both call sites. Fixing
// this needs a new bundled dist/dispatch.js entry in build-dist.mts plus a
// runtime resolution change in loop.mts -- out of this slice's scope
// (agents/*.md path strings + draining the agents-origin EXPECTED_FAIL
// labels only); reported to the team lead rather than silently expanding
// scope. Tracked for a follow-up FEAT-037 slice.
const EXPECTED_FAIL = new Set<string>(["dist/loop.js dispatch prepare"]);

function labelFor(entry: ShippedEntrypoint): string {
  return `${entry.file} ${entry.args.join(" ")}`.trim();
}

export type RunClassification = "ok" | "arg-error" | "crash";

// FEAT-037/SLICE-55 (2026-11-06, pulled forward from SLICE-59 at the team
// lead's direction): this ratchet's job is to prove "runs without
// node_modules" (AC-5's bar: never a module-resolution error), not "every
// doc example's placeholder args produce a clean result." A bare
// `exitCode !== 0` check conflates those two things -- after the dist/
// path rewrite, dozens of commands-origin entries fail only on their own
// CLI argument/precondition checks (missing config, a literal
// never-shell-expanded `"$PWD"` placeholder token, a required flag) with
// no module-resolution signature anywhere in their output. Those are
// passes for this suite's purpose. This list is the explicit, documented
// set of signatures that DO indicate the self-containment promise was
// broken; anything else with a real (non-empty) CLI-produced message is
// an "arg-error", not a "crash".
const MODULE_RESOLUTION_SIGNATURE_RE =
  /Cannot find module|Module not found|Cannot find package|ERR_MODULE_NOT_FOUND|ENOENT.*node_modules|SyntaxError/;

export function classifyRunResult(result: {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}): RunClassification {
  if (result.exitCode === 0) return "ok";
  const combined = `${result.stderr}${result.stdout}`;
  if (MODULE_RESOLUTION_SIGNATURE_RE.test(combined)) return "crash";
  // Non-zero exit, no module-resolution signature, but also no message of
  // any kind: the process died some other way without reporting anything
  // CLI-shaped (e.g. a signal kill, a silent segfault-style exit). Treat
  // that as a crash too rather than silently passing it.
  if (combined.trim().length === 0) return "crash";
  return "arg-error";
}

/**
 * The single point where a classified run result becomes (or doesn't
 * become) a ratchet failure, factored out so the two unit tests below can
 * exercise it directly with fixtures instead of spawning real processes.
 */
export function evaluateEntryResult(
  label: string,
  classification: RunClassification,
  expectedFail: ReadonlySet<string>
): { isObservedCrash: boolean; isNewlyBroken: boolean } {
  const isObservedCrash = classification === "crash";
  const isNewlyBroken = isObservedCrash && !expectedFail.has(label);
  return { isObservedCrash, isNewlyBroken };
}

// Two unit-level proofs of the classifier's boundary behavior, independent
// of the slow staged-copy integration test below.
test("classifyRunResult: a module-resolution crash lands in newlyBroken when not in EXPECTED_FAIL", () => {
  const classification = classifyRunResult({
    exitCode: 1,
    stdout: "",
    stderr: "Cannot find module '@astragenie/plugin-std' from '/plugin/crew/scripts/lib/result.mts'"
  });
  assert.equal(classification, "crash");

  const { isObservedCrash, isNewlyBroken } = evaluateEntryResult(
    "crew/scripts/crew.mts some-newly-surfaced-subcommand",
    classification,
    EXPECTED_FAIL
  );
  assert.equal(isObservedCrash, true);
  assert.equal(isNewlyBroken, true);
});

test("classifyRunResult: a clean CLI argument/precondition error does not land in newlyBroken", () => {
  const classification = classifyRunResult({
    exitCode: 1,
    stdout: "",
    stderr: "repair-check refused: --failure-output <text> is required."
  });
  assert.equal(classification, "arg-error");

  const { isObservedCrash, isNewlyBroken } = evaluateEntryResult(
    'dist/crew.js repair-check --repo "$PWD"',
    classification,
    EXPECTED_FAIL
  );
  assert.equal(isObservedCrash, false);
  assert.equal(isNewlyBroken, false);
});

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
  const observedCrashes = new Set<string>();
  // Per-entry audit trail (printed below) so a reviewer can see exactly
  // why each non-"ok" entry was or wasn't counted as a ratchet failure,
  // rather than taking classifyRunResult()'s word for it on faith.
  const argErrorAudit: string[] = [];
  const crashAudit: string[] = [];

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
    const stdoutText = proc.stdout ? Buffer.from(proc.stdout).toString("utf8") : "";
    const classification = classifyRunResult({
      exitCode: proc.exitCode,
      stdout: stdoutText,
      stderr: stderrText
    });
    const { isObservedCrash } = evaluateEntryResult(label, classification, EXPECTED_FAIL);
    if (isObservedCrash) {
      observedCrashes.add(label);
      crashAudit.push(`[crash] ${label} :: ${(stderrText || stdoutText).slice(0, 160)}`);
    } else if (classification === "arg-error") {
      argErrorAudit.push(`[arg-error] ${label} :: ${(stderrText || stdoutText).slice(0, 160)}`);
    }
  }

  // Printed unconditionally (not just on failure) so a reviewer auditing
  // this suite's output can see the full classification, not just the
  // entries that happened to trip an assertion.
  console.log(
    `consumer-smoke classification audit: ${crashAudit.length} crash, ${argErrorAudit.length} arg-error`
  );
  for (const line of crashAudit) console.log(line);
  for (const line of argErrorAudit) console.log(line);

  const newlyBroken = [...observedCrashes].filter((label) => !EXPECTED_FAIL.has(label)).sort();
  const nowPassing = [...EXPECTED_FAIL].filter((label) => !observedCrashes.has(label)).sort();

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
//
// FEAT-037/SLICE-56 (2026-11-08): the bun count dropped 30 -> 29. All 53
// literal agents/*.md invocations of crew/scripts/crew.mts /
// src/scripts/loop.mts (19 files) were repointed at dist/crew.js /
// dist/loop.js -- the source-path label `crew/scripts/crew.mts` had no
// remaining commands/*.md OR agents/*.md reference keeping it alive (-1);
// dist/crew.js and dist/loop.js were already in the set from SLICE-55's
// commands/*.md rewrite, so no new dist/*.js file entered for the first
// time here (net 0) -> 30 - 1 = 29.
test("listShippedEntrypoints produces the exact distinct-file-set counts from the real file", async () => {
  const entries = await listShippedEntrypoints(REPO_ROOT);
  const grouped = groupDistinctFilesByRuntime(entries);

  assert.equal(
    grouped.bun.length,
    29,
    `expected 29 distinct bun entrypoints, got ${grouped.bun.length}: ${JSON.stringify(grouped.bun)}`
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
  // FEAT-037/SLICE-56: crew/scripts/crew.mts has no remaining commands/*.md
  // or agents/*.md literal invocation now that agents/*.md is repointed at
  // dist/crew.js -- assert it is gone rather than present.
  assert.ok(!grouped.bun.includes("crew/scripts/crew.mts"));
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
