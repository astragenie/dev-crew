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
    features: null,
    version: null,
    since: null,
    spanDays: null,
    until: null,
    by: null,
    artifact: null,
    kind: null,
    files: null,
    featuresJson: null
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
    if (value === "--version") { flags.version = rest[index + 1]; index += 1; continue; }
    if (value === "--since") { flags.since = rest[index + 1]; index += 1; continue; }
    if (value === "--span-days") { flags.spanDays = rest[index + 1]; index += 1; continue; }
    if (value === "--until") { flags.until = rest[index + 1]; index += 1; continue; }
    if (value === "--by") { flags.by = rest[index + 1]; index += 1; continue; }
    if (value === "--artifact") { flags.artifact = rest[index + 1]; index += 1; continue; }
    if (value === "--kind") { flags.kind = rest[index + 1]; index += 1; continue; }
    if (value === "--files") { flags.files = rest[index + 1]; index += 1; continue; }
    if (value === "--features-json") { flags.featuresJson = rest[index + 1]; index += 1; continue; }
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
  } else if (command === "release") {
    result = await runReleaseSubcommand(repoPath, positionals, flags);
  } else if (command === "slice") {
    result = await runSliceSubcommand(repoPath, positionals, flags);
  } else if (command === "decisions") {
    result = await runDecisionsSubcommand(repoPath, positionals, flags);
  } else if (command === "retrospective") {
    const { writeRetrospective } = await import("./lib/retrospective.mjs");
    result = await writeRetrospective(repoPath, {
      since: flags.since,
      spanDays: flags.spanDays,
      until: flags.until
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "retrospective", since: flags.since, span_days: flags.spanDays });
  } else if (command === "brief") {
    const { buildBrief } = await import("./lib/brief.mjs");
    result = await buildBrief(repoPath);
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
    if (!flags.features && !flags.featuresJson) {
      throw new Error('spec decompose requires --features "t1;t2" OR --features-json <JSON array>.');
    }
    let entries;
    if (flags.featuresJson) {
      try {
        entries = JSON.parse(flags.featuresJson);
      } catch (err) {
        throw new Error(`--features-json must be valid JSON: ${err.message}`);
      }
      if (!Array.isArray(entries)) throw new Error("--features-json must be a JSON array");
    } else {
      entries = flags.features.split(";").map((s) => s.trim()).filter(Boolean);
    }
    const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
    return await decomposeSpec(repoPath, specId, entries);
  }
  if (sub === "status") {
    const { specSatisfaction, reconcileSpecStatus } = await import("./lib/linkage.mjs");
    const before = await specSatisfaction(repoPath);
    const reconciled = await reconcileSpecStatus(repoPath);
    return { satisfaction: before, statusChanges: reconciled };
  }
  throw new Error(`Unknown spec subcommand: ${sub}`);
}

async function runReleaseSubcommand(repoPath, positionals, flags) {
  const [sub] = positionals;
  if (!sub) throw new Error("release requires a subcommand: plan | status");
  const { planRelease, releaseStatus } = await import("./lib/release-planner.mjs");
  if (sub === "plan") {
    if (!flags.version) throw new Error("release plan requires --version vX.Y.Z");
    return await planRelease(repoPath, { version: flags.version });
  }
  if (sub === "status") {
    if (!flags.version) throw new Error("release status requires --version vX.Y.Z");
    return await releaseStatus(repoPath, { version: flags.version });
  }
  throw new Error(`Unknown release subcommand: ${sub}`);
}

async function runSliceSubcommand(repoPath, positionals, flags) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("slice requires a subcommand: from-feature | grade | grade-write");
  if (sub === "from-feature") {
    const featureId = flags.id || rest[0];
    if (!featureId) throw new Error("slice from-feature requires --id FEAT-NNN.");
    const { sliceFromFeature } = await import("./lib/slice-linker.mjs");
    const out = await sliceFromFeature(repoPath, featureId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "slice from-feature", feature: featureId, slice: out.slice.id });
    return out;
  }
  if (sub === "grade") {
    const sliceId = flags.id || rest[0];
    if (!sliceId) throw new Error("slice grade requires --id SLICE-NN.");
    const { createGradeFile } = await import("./lib/grade-writer.mjs");
    const out = await createGradeFile(repoPath, sliceId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "slice grade", slice: sliceId, created: out.created });
    return out;
  }
  if (sub === "grade-write") {
    const sliceId = flags.id || rest[0];
    if (!sliceId) throw new Error("slice grade-write requires --id SLICE-NN.");
    const { writeGrade } = await import("./lib/grade-writer.mjs");
    return await writeGrade(repoPath, sliceId);
  }
  if (sub === "complete") {
    const sliceId = flags.id || rest[0];
    if (!sliceId) throw new Error("slice complete requires --id SLICE-NN.");
    const { completeSlice } = await import("./lib/slice-linker.mjs");
    const out = await completeSlice(repoPath, sliceId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice complete",
      slice: sliceId,
      feature: out.feature?.id || null,
      spec_status_changes: out.specStatusChanges?.length || 0,
      handoff_written: Boolean(out.handoff?.handoffPath)
    });
    return out;
  }
  if (sub === "link") {
    const sliceId = flags.id;
    if (!sliceId) throw new Error("slice link requires --id SLICE-NN.");
    if (!flags.artifact) throw new Error("slice link requires --artifact <path>.");
    if (!flags.kind) throw new Error("slice link requires --kind reviews|validations|deployments.");
    const { linkArtifactToSlice } = await import("./lib/artifact-linkage.mjs");
    return await linkArtifactToSlice(repoPath, {
      sliceId, artifactPath: flags.artifact, kind: flags.kind
    });
  }
  if (sub === "review-ladder") {
    const sliceId = flags.id || rest[0];
    if (!sliceId) throw new Error("slice review-ladder requires --id SLICE-NN.");
    const { buildReviewLadder } = await import("./lib/reviewer-ladder.mjs");
    return await buildReviewLadder(repoPath, sliceId);
  }
  throw new Error(`Unknown slice subcommand: ${sub}`);
}

async function runDecisionsSubcommand(repoPath, positionals, flags) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("decisions requires a subcommand: list | show");
  const { listDecisions, showDecision } = await import("./lib/decisions-store.mjs");
  if (sub === "list") {
    const decisions = await listDecisions(repoPath, { status: flags.status });
    return {
      count: decisions.length,
      decisions: decisions.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        introduced_by_slice: d.introduced_by_slice,
        introduced_at: d.introduced_at,
        superseded_by: d.superseded_by,
        filePath: d.filePath
      }))
    };
  }
  if (sub === "show") {
    const decId = flags.id || rest[0];
    if (!decId) throw new Error("decisions show requires --id DEC-NNN.");
    const dec = await showDecision(repoPath, decId);
    if (!dec) throw new Error(`Decision not found: ${decId}`);
    return dec;
  }
  if (sub === "supersede") {
    const { supersedeDecision } = await import("./lib/decisions-store.mjs");
    if (!flags.id || !flags.by) throw new Error("decisions supersede requires --id DEC-OLD --by DEC-NEW");
    const out = await supersedeDecision(repoPath, { oldId: flags.id, newId: flags.by });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "decisions supersede", old: flags.id, new: flags.by });
    return out;
  }
  if (sub === "relevant") {
    const { findRelevantDecisions } = await import("./lib/decisions-store.mjs");
    if (!flags.files) throw new Error("decisions relevant requires --files \"a.cs,b.cs,...\"");
    const files = flags.files.split(",").map((f) => f.trim()).filter(Boolean);
    const matches = await findRelevantDecisions(repoPath, files);
    return { count: matches.length, decisions: matches };
  }
  throw new Error(`Unknown decisions subcommand: ${sub}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
