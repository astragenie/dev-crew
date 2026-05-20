#!/usr/bin/env node

import path from "node:path";

// CLI for the autonomous-loop plugin. Mirrors scripts/crew.mjs argument-parsing
// conventions (--repo, --, MSYS path normalization) so the two plugins behave
// the same way at the command line.

function normalizeMsysPath(value) {
  if (!value || process.platform !== "win32") {
    return value;
  }
  const match = value.match(/^\/([a-zA-Z])\/(.*)$/);
  if (!match) {
    return value;
  }
  return `${match[1].toUpperCase()}:/${match[2]}`;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {
    repo: process.cwd(),
    preset: null,
    phase: null,
    note: null,
    help: false
  };
  const positionals = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--") {
      for (let tail = index + 1; tail < rest.length; tail += 1) {
        positionals.push(rest[tail]);
      }
      break;
    }
    if (value === "--help" || value === "-h") {
      flags.help = true;
      continue;
    }
    if (value === "--repo") {
      flags.repo = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--preset") {
      flags.preset = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--phase") {
      flags.phase = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--note") {
      flags.note = rest[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`Unknown argument: ${value}`);
    }
    positionals.push(value);
  }

  if (!command || command === "--help" || command === "-h") {
    return { command: "help", flags, positionals };
  }
  return { command, flags, positionals };
}

function usage() {
  return [
    "autonomous-loop CLI",
    "",
    "Usage:",
    "  node scripts/autonomous-loop.mjs install --repo <path> [--preset <name>]",
    "  node scripts/autonomous-loop.mjs phase-gate --repo <path> [--phase <N>] [--note <text>]",
    "  node scripts/autonomous-loop.mjs status --repo <path>",
    "  node scripts/autonomous-loop.mjs list-presets",
    "",
    "Hard dependency: the `crew` plugin must be installed. Phase-gate writes its",
    "artifact through `crew write-validation-result`."
  ].join("\n");
}

async function main() {
  const { command, flags, positionals } = parseArgs(process.argv.slice(2));
  const repoPath = path.resolve(normalizeMsysPath(flags.repo));

  if (command === "help") {
    console.log(usage());
    return;
  }

  let result;
  if (command === "install") {
    const { installLoop } = await import("./lib/loop-installer.mjs");
    result = await installLoop(repoPath, { preset: flags.preset });
  } else if (command === "phase-gate") {
    const { runPhaseGate } = await import("./lib/phase-gate.mjs");
    result = await runPhaseGate(repoPath, { phase: flags.phase, note: flags.note });
  } else if (command === "status") {
    const { reportStatus } = await import("./lib/loop-installer.mjs");
    result = await reportStatus(repoPath);
  } else if (command === "list-presets") {
    const { listPresets } = await import("./lib/config-resolver.mjs");
    result = { presets: await listPresets() };
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
