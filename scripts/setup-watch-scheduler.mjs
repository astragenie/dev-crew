// One-shot setup: register the OS scheduler to invoke watch-tick.mts on a
// ~5-minute interval (FEAT-242 SLICE-146). Platform branching lives HERE —
// never in src/scripts/watch-tick.mts, which is platform-neutral by
// contract (AC-7).
//
// Windows (this script): registers a Task Scheduler task via
// `schtasks /Create` that runs `bun <repoRoot>/src/scripts/watch-tick.mts`
// on the configured interval.
//
// POSIX (cron) — documented variant, not automated by this script (design
// doc: "scheduler script is Windows-first, cron is a documented variant not
// a separate slice"). Add a crontab line like:
//   */5 * * * * cd <repoRoot> && bun src/scripts/watch-tick.mts >> ~/.claude/watch/tick.log 2>&1
//
// Usage:
//   node scripts/setup-watch-scheduler.mjs [--task-name <name>] [--interval-minutes <n>] [--dry-run]
//
// --dry-run prints the schtasks command line that WOULD run without
// executing it — used by the AC-7 registration smoke test, and safe for an
// operator to preview before committing to a real registration.
//
// Exported functions (buildSchtasksArgs / registerWindowsTask) make this
// testable without a real schtasks call, following the testable-CLI shape
// used by src/scripts/validate-manifests.mts rather than the plainer
// top-level-script shape of setup-github-sync.mjs / setup-task-store.mjs —
// those two have no registration side effect to guard behind a dry-run, this
// one does.

import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export const DEFAULT_TASK_NAME = "LoopWatchTick";
export const DEFAULT_INTERVAL_MINUTES = 5;

export function repoRoot() {
  // scripts/ is one level below repo root.
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function tickScriptPath(root = repoRoot()) {
  return path.join(root, "src", "scripts", "watch-tick.mts");
}

export function resolveBunPath() {
  return process.env.LOOP_BUN_PATH || process.execPath;
}

export function parseArgs(argv) {
  const flags = {
    taskName: DEFAULT_TASK_NAME,
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--task-name") flags.taskName = argv[++i];
    else if (arg === "--interval-minutes") flags.intervalMinutes = Number(argv[++i]);
    else if (arg === "--dry-run") flags.dryRun = true;
  }
  return flags;
}

/**
 * Pure arg-builder for the `schtasks /Create` invocation — no execution, no
 * side effect. Exercised directly by the AC-7 smoke test.
 */
export function buildSchtasksArgs({ taskName, intervalMinutes, tickScriptPath: scriptPath, bunPath }) {
  return [
    "/Create",
    "/TN",
    taskName,
    "/TR",
    `"${bunPath}" "${scriptPath}"`,
    "/SC",
    "MINUTE",
    "/MO",
    String(intervalMinutes),
    "/F"
  ];
}

export async function registerWindowsTask({
  taskName,
  intervalMinutes,
  tickScriptPath: scriptPath,
  bunPath,
  dryRun
}) {
  const args = buildSchtasksArgs({ taskName, intervalMinutes, tickScriptPath: scriptPath, bunPath });
  const commandLine = `schtasks ${args.join(" ")}`;
  if (dryRun) {
    return { commandLine, executed: false };
  }
  await execFile("schtasks", args);
  return { commandLine, executed: true };
}

function printPosixAlternative(root, intervalMinutes) {
  console.log("\nPOSIX (cron) alternative — not automated by this script, add manually:");
  console.log(
    `  */${intervalMinutes} * * * * cd ${root} && bun src/scripts/watch-tick.mts >> ~/.claude/watch/tick.log 2>&1`
  );
}

export async function main(argv = process.argv.slice(2)) {
  const flags = parseArgs(argv);
  const root = repoRoot();
  const scriptPath = tickScriptPath(root);
  const bunPath = resolveBunPath();

  const result = await registerWindowsTask({
    taskName: flags.taskName,
    intervalMinutes: flags.intervalMinutes,
    tickScriptPath: scriptPath,
    bunPath,
    dryRun: flags.dryRun
  });

  console.log(`Command: ${result.commandLine}`);
  if (flags.dryRun) {
    console.log("(dry-run — no task was registered)");
    console.log("\nRun without --dry-run to register the task, or verify manually:");
    console.log(`  schtasks /Query /TN ${flags.taskName}`);
  } else {
    console.log(
      `Task Scheduler task "${flags.taskName}" registered (every ${flags.intervalMinutes} min).`
    );
    console.log(`  Verify: schtasks /Query /TN ${flags.taskName} /V /FO LIST`);
  }

  printPosixAlternative(root, flags.intervalMinutes);
  return result;
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  try {
    await main();
  } catch (err) {
    console.error("[setup-watch-scheduler] failed:", err);
    process.exitCode = 1;
  }
}
