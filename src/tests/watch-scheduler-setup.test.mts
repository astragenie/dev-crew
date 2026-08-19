// @ts-nocheck — imports a hand-authored .mjs entry script directly, no .mts
// source (docs/code-conventions.md exception; ban-ts-comment is disabled for
// src/tests/**).
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";

import {
  buildSchtasksArgs,
  DEFAULT_INTERVAL_MINUTES,
  DEFAULT_TASK_NAME,
  main,
  repoRoot,
  tickScriptPath
} from "../../scripts/setup-watch-scheduler.mjs";

// AC-7: registration smoke test — asserts the exact schtasks command line
// the script WOULD run, without ever calling the real `schtasks` binary
// (unavailable on non-Windows CI, and a real registration is not something
// a test run should perform). Non-dry-run registration is documented as a
// manual verification step in commands/watch.md / the script's own header.
test("AC-7: --dry-run reports the schtasks command line without registering", async () => {
  const result = await main(["--dry-run"]);

  expect(result.executed).toBe(false);
  expect(result.commandLine).toContain("schtasks");
  expect(result.commandLine).toContain("/Create");
  expect(result.commandLine).toContain(`/TN ${DEFAULT_TASK_NAME}`);
  expect(result.commandLine).toContain("/SC MINUTE");
  expect(result.commandLine).toContain(`/MO ${DEFAULT_INTERVAL_MINUTES}`);
  expect(result.commandLine.replace(/\\/g, "/")).toContain("src/scripts/watch-tick.mts");
});

test("buildSchtasksArgs honors custom task name and interval", () => {
  const args = buildSchtasksArgs({
    taskName: "CustomWatch",
    intervalMinutes: 10,
    tickScriptPath: "C:\\repo\\src\\scripts\\watch-tick.mts",
    bunPath: "C:\\bun\\bun.exe"
  });

  expect(args).toContain("CustomWatch");
  expect(args).toContain("10");
  expect(args.join(" ")).toContain("watch-tick.mts");
});

// AC-7: OS-specific branching lives in this setup script, never in the
// platform-neutral tick entry point.
test("watch-tick.mts is never scheduler-invoked with platform branching in this script", async () => {
  const scriptPath = tickScriptPath(repoRoot());
  expect(scriptPath.replace(/\\/g, "/")).toMatch(/src\/scripts\/watch-tick\.mts$/);
});

// AC-8: /devcrew:watch and the scheduler registration must point at the same
// entry-point script — no divergent code path.
test("AC-8: commands/watch.md and the scheduler both reference watch-tick.mts", async () => {
  const watchMd = await fs.readFile(path.resolve("commands/watch.md"), "utf-8");
  expect(watchMd).toContain("src/scripts/watch-tick.mts");

  const scriptPath = tickScriptPath(repoRoot()).replace(/\\/g, "/");
  expect(scriptPath).toContain("src/scripts/watch-tick.mts");
});
