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
    help: false,
    status: null,
    priority: null,
    category: null,
    targetRelease: null,
    type: null,
    title: null,
    id: null,
    body: null,
    features: null
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
    if (value === "--status") { flags.status = rest[index + 1]; index += 1; continue; }
    if (value === "--priority") { flags.priority = rest[index + 1]; index += 1; continue; }
    if (value === "--category") { flags.category = rest[index + 1]; index += 1; continue; }
    if (value === "--target-release") { flags.targetRelease = rest[index + 1]; index += 1; continue; }
    if (value === "--type") { flags.type = rest[index + 1]; index += 1; continue; }
    if (value === "--title") { flags.title = rest[index + 1]; index += 1; continue; }
    if (value === "--id") { flags.id = rest[index + 1]; index += 1; continue; }
    if (value === "--body") { flags.body = rest[index + 1]; index += 1; continue; }
    if (value === "--features") { flags.features = rest[index + 1]; index += 1; continue; }
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
  } else if (command === "backlog") {
    result = await runBacklogSubcommand(repoPath, positionals, flags);
  } else if (command === "spec") {
    result = await runSpecSubcommand(repoPath, positionals, flags);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

async function runBacklogSubcommand(repoPath, positionals, flags) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("backlog requires a subcommand: add | list | triage | promote");
  if (sub === "add") {
    const title = flags.title || rest.join(" ");
    if (!title) throw new Error("backlog add requires a title (positional or --title).");
    const { addFeature } = await import("./lib/backlog-writer.mjs");
    return await addFeature(repoPath, {
      title,
      priority: flags.priority,
      category: flags.category,
      target_release: flags.targetRelease,
      body: flags.body || ""
    });
  }
  if (sub === "list") {
    const { listBacklog, filterBacklog } = await import("./lib/backlog-parser.mjs");
    const entries = await listBacklog(repoPath);
    const filtered = filterBacklog(entries, {
      status: flags.status,
      priority: flags.priority,
      category: flags.category,
      target_release: flags.targetRelease
    });
    return {
      count: filtered.length,
      entries: filtered.map((e) => ({
        id: e.id,
        state: e.state,
        priority: e.frontmatter.priority,
        category: e.frontmatter.category,
        target_release: e.frontmatter.target_release,
        created: e.frontmatter.created,
        updated: e.frontmatter.updated,
        derived_from: e.frontmatter.derived_from || null,
        slices: e.frontmatter.slices || [],
        filePath: e.filePath
      }))
    };
  }
  if (sub === "triage") {
    const { triagePending } = await import("./lib/backlog-triage.mjs");
    const results = await triagePending(repoPath);
    return { triaged: results.length, results };
  }
  if (sub === "promote") {
    const featureId = flags.id || rest[0];
    if (!featureId) throw new Error("backlog promote requires --id FEAT-NNN.");
    const { findFeatureById, moveFeature } = await import("./lib/backlog-writer.mjs");
    const entry = await findFeatureById(repoPath, featureId);
    if (!entry) throw new Error(`Feature not found: ${featureId}`);
    const moved = await moveFeature(entry.filePath, "in-progress");
    return { id: featureId, moved };
  }
  throw new Error(`Unknown backlog subcommand: ${sub}`);
}

async function runSpecSubcommand(repoPath, positionals, flags) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("spec requires a subcommand: add | list | decompose | status");
  if (sub === "add") {
    const title = flags.title || rest.join(" ");
    if (!title) throw new Error("spec add requires a title (positional or --title).");
    if (!flags.type) throw new Error("spec add requires --type prd|user-journey|sre|research|adr|other.");
    const { addSpec } = await import("./lib/spec-parser.mjs");
    return await addSpec(repoPath, {
      type: flags.type,
      title,
      priority: flags.priority,
      target_release: flags.targetRelease,
      body: flags.body || ""
    });
  }
  if (sub === "list") {
    const { listSpecs, filterSpecs } = await import("./lib/spec-parser.mjs");
    const specs = await listSpecs(repoPath);
    const filtered = filterSpecs(specs, {
      status: flags.status,
      type: flags.type,
      priority: flags.priority,
      target_release: flags.targetRelease
    });
    return {
      count: filtered.length,
      specs: filtered.map((s) => ({
        id: s.id,
        type: s.frontmatter.type,
        status: s.frontmatter.status,
        priority: s.frontmatter.priority,
        target_release: s.frontmatter.target_release,
        title: s.frontmatter.title,
        derived_features: s.frontmatter.derived_features || [],
        filePath: s.filePath
      }))
    };
  }
  if (sub === "decompose") {
    const specId = flags.id || rest[0];
    if (!specId) throw new Error("spec decompose requires --id SPEC-NNN.");
    if (!flags.features) {
      throw new Error('spec decompose requires --features "title1;title2;title3" (semicolon-separated).');
    }
    const titles = flags.features.split(";").map((s) => s.trim()).filter(Boolean);
    const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
    return await decomposeSpec(repoPath, specId, titles);
  }
  if (sub === "status") {
    const { specSatisfaction, reconcileSpecStatus } = await import("./lib/linkage.mjs");
    const before = await specSatisfaction(repoPath);
    const reconciled = await reconcileSpecStatus(repoPath);
    return { satisfaction: before, statusChanges: reconciled };
  }
  throw new Error(`Unknown spec subcommand: ${sub}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
