#!/usr/bin/env node

import { ensureBunRuntime } from "./lib/node-bun-guard.mjs";
import path from "node:path";

// Must run before any import of this file's other internal .mjs-specifier
// modules — see node-bun-guard.mjs header. No-ops under Bun; exits under Node.
ensureBunRuntime(import.meta.url, process.argv.slice(2));

// CLI for the loop plugin. Mirrors scripts/crew.mjs argument-parsing
// conventions (--repo, --, MSYS path normalization) so the two plugins behave
// the same way at the command line. FLAG_SPEC + parseArgs live in
// lib/cli-args.mts (side-effect-free, unlike this file — see that module's
// header comment for why).
//
// `clearFrontmatterCache` / `resolveSkills` / `parseArgs` used to be loaded
// via a module-scope top-level `await import(...)` here. That pushed every
// binding declared below it (including the many `export`ed functions this
// file's own tests statically import, e.g. parseArchitectOutput,
// publishFeatureViaProvider) behind an async boundary. Bun 1.3.14 has a
// confirmed ESM-evaluator bug where such bindings can be read before
// initialization under `bun test --parallel`, even when the importer fully
// `await`s a dynamic `import()` (oven-sh/bun#30634, fix in flight:
// oven-sh/bun#30656). loadCliDeps() below loads the same three modules
// lazily, from inside main() — the only place they're used — keeping this
// module's top level synchronous end-to-end.
let cliDepsPromise: Promise<{
  clearFrontmatterCache: typeof import("./lib/frontmatter-cache.mjs").clearFrontmatterCache;
  resolveSkills: typeof import("./lib/skill-resolver.mjs").resolveSkills;
  parseArgs: typeof import("./lib/cli-args.mjs").parseArgs;
}> | null = null;
function loadCliDeps() {
  cliDepsPromise ??= Promise.all([
    import("./lib/frontmatter-cache.mjs"),
    import("./lib/skill-resolver.mjs"),
    import("./lib/cli-args.mjs")
  ]).then(([frontmatterCache, skillResolver, cliArgs]) => ({
    clearFrontmatterCache: frontmatterCache.clearFrontmatterCache,
    resolveSkills: skillResolver.resolveSkills,
    parseArgs: cliArgs.parseArgs
  }));
  return cliDepsPromise;
}

function normalizeMsysPath(value: string): string {
  if (!value || process.platform !== "win32") {
    return value;
  }
  const match = value.match(/^\/([a-zA-Z])\/(.*)$/);
  if (!match) {
    return value;
  }
  return `${(match[1] ?? "").toUpperCase()}:/${match[2] ?? ""}`;
}

type CmdCtx = {
  repoPath: string;
  flags: Record<string, any>;
  positionals: string[];
  config: Record<string, any> | null;
};

function usage() {
  return [
    "loop CLI",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts install --repo <path> [--preset <name>] [--light]",
    "  bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]",
    "  bun src/scripts/loop.mts status --repo <path>",
    "  bun src/scripts/loop.mts list-presets",
    "  bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]",
    "  bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)",
    "  bun src/scripts/loop.mts learn --repo <path>   (runs the continuous-learning cycle once)",
    "  bun src/scripts/loop.mts slice <subcommand> --repo <path> [args...]   (see: slice --help)",
    "  bun src/scripts/loop.mts backlog <subcommand> --repo <path> [args...]   (see: backlog --help)",
    "  bun src/scripts/loop.mts intake from-text --text <text> --repo <path>   (see: intake --help)",
    "  bun src/scripts/loop.mts config <get|migrate-devcrew> [--repo <path>]   (see: config --help)",
    "",
    "Pass --help (or -h) after any subcommand to print that subcommand's usage",
    "and return before any side effect — no filesystem write, no dispatch.",
    "",
    "Hard dependency: the `crew` plugin must be installed. Phase-gate writes its",
    "artifact through `crew write-validation-result`."
  ].join("\n");
}

// Per-subcommand --help text (FEAT-020 / SLICE-37). Every command routed
// through the COMMANDS registry below gets its side-effecting handler gated
// on flags.help at the single dispatch chokepoint in main() — see the
// `if (flags.help ...)` guard there. This map only supplies the *text*; it
// is not itself part of the gating logic, so a command missing from this map
// still gets a safe (generic) usage print, never a silent fall-through to a
// handler. `dispatch` and `config` are intercepted before parseArgs runs (see
// the rawArgv shortcuts at the top of main()) and are not gated by that
// chokepoint — both already refuse to touch the filesystem on missing/unknown
// sub-subcommands (dispatch forwards to dispatch.mts's own parser; config's
// unknown-sub branch is a pure `console.error` + exitCode). Their entries
// here are documentation only.
const SUBCOMMAND_USAGE: Record<string, string> = {
  install: [
    "loop CLI — install",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts install --repo <path> [--preset <name>] [--light]",
    "",
    "Scaffolds or refreshes the loop methodology layer (CLAUDE.md hard-rule",
    "block, loop-control docs, backlog scaffold, .claude/loop.json) in the",
    "target repo. --preset selects the stack preset (see: list-presets).",
    "--light trims to the single-reviewer ladder."
  ].join("\n"),
  slice: [
    "loop CLI — slice",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts slice <subcommand> --repo <path> [args...]",
    "",
    "Slice-lifecycle operations (from-feature, start, close, ...). Run the",
    "specific subcommand without --help to see its own usage/error output."
  ].join("\n"),
  backlog: [
    "loop CLI — backlog",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts backlog <subcommand> --repo <path> [args...]",
    "",
    "Backlog operations: add, pm-apply, pm-rescope, arch-gate-apply,",
    "list-pending-ids, slice-renumber, and more. Run the specific subcommand",
    "without --help to see its own usage/error output."
  ].join("\n"),
  intake: [
    "loop CLI — intake",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts intake from-text --text <text> --repo <path> [--deep] [--spec] [--dry-run]",
    "",
    "Free-text backlog intake: mechanically creates a new unscored FEAT from prose."
  ].join("\n"),
  dispatch: [
    "loop CLI — dispatch",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts dispatch <subcommand> [args...]",
    "",
    "Forwarded verbatim to src/scripts/dispatch.mts as a child process — its own",
    "argument parser governs subcommand flags (--plan, --parent-branch, --depth,",
    "--dry-run, --json, --run-id, --config); this file's FLAG_SPEC does not apply."
  ].join("\n"),
  config: [
    "loop CLI — config",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts config get <dotted.path> [--repo <path>]",
    "  bun src/scripts/loop.mts config migrate-devcrew [--repo <path>]",
    "",
    "Read or migrate .claude/loop.json. Neither sub-subcommand writes anything",
    "besides migrate-devcrew's documented backup+merge."
  ].join("\n"),
  decisions: [
    "loop CLI — decisions",
    "",
    "Usage:",
    "  bun src/scripts/loop.mts decisions <list|show|relevant|supersede> --repo <path> [args...]",
    "",
    "Decision-log operations: list, show, relevant, supersede. Run the",
    "specific subcommand without --help to see its own usage/error output."
  ].join("\n")
};

// AC-3: resolve --help text for any subcommand, falling back to the general
// usage() block for commands with no dedicated entry above.
function usageFor(command: string): string {
  return SUBCOMMAND_USAGE[command] ?? usage();
}

// Command registry. Each handler returns the result that gets JSON-stringified
// to stdout. Lazy imports stay per-handler to keep start-up cheap when a user
// only invokes one command.
const COMMANDS = {
  install: async ({ repoPath, flags }: CmdCtx) => {
    const { installLoop } = await import("./lib/loop-installer.mjs");
    return installLoop(repoPath, { preset: flags.preset, light: Boolean(flags.light) });
  },
  "cost-setup": async ({ repoPath, flags }: CmdCtx) => {
    const { parseCostOverrides, runCostSetup } = await import("./lib/cost-setup.mjs");
    const overridesRaw = typeof flags.features === "string" ? flags.features : null;
    const overrides = parseCostOverrides(overridesRaw);
    return runCostSetup(repoPath, overrides);
  },
  "memory-setup": async ({ repoPath, flags }: CmdCtx) => {
    const { parseMemoryOverrides, runMemorySetup } = await import("./lib/memory-setup.mjs");
    const overridesRaw = typeof flags.features === "string" ? flags.features : null;
    const overrides = parseMemoryOverrides(overridesRaw);
    return runMemorySetup(repoPath, overrides);
  },
  "phase-gate": async ({ repoPath, flags, config }: CmdCtx) => {
    const { runPhaseGate } = await import("./lib/phase-gate.mjs");
    return runPhaseGate(repoPath, {
      phase: flags.phase,
      note: flags.note,
      serial: Boolean(flags.serial),
      only: flags.only || undefined,
      config
    });
  },
  status: async ({ repoPath }: CmdCtx) => {
    const { reportStatus } = await import("./lib/loop-installer.mjs");
    return reportStatus(repoPath);
  },
  "list-presets": async () => {
    const { listPresets } = await import("./lib/config-resolver.mjs");
    return { presets: await listPresets() };
  },
  github: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags, config),
  "task-store": ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags, config),
  backlog: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runBacklogSubcommand(repoPath, positionals, flags, config),
  "backlog-audit": async ({ repoPath, flags }: CmdCtx) => runBacklogAudit(repoPath, flags),
  spec: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSpecSubcommand(repoPath, positionals, flags, config),
  slice: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSliceSubcommand(repoPath, positionals, flags, { config }),
  feature: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runFeatureSubcommand(repoPath, positionals, flags, config),
  decisions: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runDecisionsSubcommand(repoPath, positionals, flags, config),
  retrospective: async ({ repoPath, flags, config }: CmdCtx) => {
    const { writeRetrospective } = await import("./lib/retrospective.mjs");
    const result = await writeRetrospective(repoPath, {
      since: flags.since,
      spanDays: flags.spanDays,
      until: flags.until
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "retrospective",
      since: flags.since,
      span_days: flags.spanDays
    });
    // DEC-070: a written retrospective is the learning-loop cadence trigger
    // (FEAT-229 option a) — the marathon-checkpoint hard stop's own remedy is
    // "run a retrospective", so hooking here fires a cycle at exactly the
    // reflection point the loop already has. Fire-and-forget: runLearningCycle
    // never throws and is a no-op unless loop.learningLoop.enabled is true.
    const { runLearningCycle } = await import("./lib/learning-cycle.mjs");
    const learningCycle = await runLearningCycle(repoPath, config);
    return { ...result, learningCycle };
  },
  learn: async ({ repoPath, flags, config }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { runLearningCycle } = await import("./lib/learning-cycle.mjs");
    const result = await runLearningCycle(cwd, config);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "learn",
      ran: result !== null,
      clusters_processed: result?.clustersProcessed ?? 0,
      specs_written: result?.specResults.filter((r) => r.status === "written").length ?? 0
    });
    return (
      result ?? { skipped: true, reason: "loop.learningLoop.enabled is not true — see FEAT-229" }
    );
  },
  "mine-failures": async ({ repoPath, flags, config }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { mineFailures } = await import("./lib/failure-mining.mjs");
    const result = await mineFailures(cwd, {
      since: flags.since || null,
      sinceDays: flags.spanDays ? Number(flags.spanDays) : null,
      ...(flags.limit ? { maxLessons: Number(flags.limit) } : {}),
      config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "mine-failures",
      clusters: result.clusters.length,
      lessons_written: result.lessonsWritten.length
    });
    return result;
  },
  brief: async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });

    if (flags?.costBySkill) {
      const { buildCostBySkillReport } = await import("./lib/cost-by-skill.mjs");
      const report = await buildCostBySkillReport(cwd);
      console.log(report);
      return { _suppressDefaultOutput: true };
    }

    const { buildBrief } = await import("./lib/brief.mjs");
    const result = await buildBrief(cwd);
    if (flags?.explainHalts) {
      const { explainHalts } = await import("./lib/halt-badges.mjs");
      console.log(JSON.stringify(result, null, 2));
      console.log("");
      console.log(explainHalts(result));
      return { _suppressDefaultOutput: true };
    }
    return result;
  },
  "perf-report": async ({ repoPath, flags, config }: CmdCtx) => {
    const { buildPerfReport } = await import("./lib/perf-report.mjs");
    const windowSize =
      flags.window != null && flags.window !== "" ? Number.parseInt(String(flags.window), 10) : 10;
    return buildPerfReport(repoPath, { window: windowSize, config });
  },
  "classify-slice-shape": async ({ flags }: CmdCtx) => {
    const { classifySliceShape } = await import("./lib/classify-slice-shape.mjs");
    const filesArg = typeof flags.files === "string" ? flags.files : "";
    const files = filesArg
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ path: p, added: 0, removed: 0, exportDelta: 0 }));
    return classifySliceShape({ files });
  },
  "snapshot-memory": async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeMemorySnapshot } = await import("./lib/memory-snapshot.mjs");
    const result = await writeMemorySnapshot(cwd);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "snapshot-memory", grades: result.counts.grades });
    return result;
  },
  lessons: async ({ repoPath, positionals, flags }: CmdCtx) => {
    const [sub] = positionals;
    if (sub === "recent") {
      const { recentLessons } = await import("./lib/lessons-feed.mjs");
      const limit = positionals[1] ? Number(positionals[1]) : 5;
      return recentLessons(repoPath, { limit });
    }
    if (sub === "rank") {
      return runLessonsRankSubcommand(repoPath, flags);
    }
    throw new Error("lessons requires subcommand: recent | rank");
  },
  "sync-claims": async ({ repoPath }: CmdCtx) => {
    const { syncClaims } = await import("./lib/claims-sync.mjs");
    const result = await syncClaims(repoPath);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "sync-claims", actions: result.actions.length });
    return result;
  },
  "stop-check": async ({ repoPath, flags, config }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { checkStopConditions } = await import("./lib/stop-conditions.mjs");
    const result = await checkStopConditions(cwd, { config });
    if (result.shouldStop && result.blockers.length > 0) {
      try {
        const { readNotifyConfig, notifyEvent } = await import("./lib/event-notifier.mjs");
        const notifyCfg = await readNotifyConfig(cwd);
        await notifyEvent(
          {
            type: "halt-badge",
            details: result.blockers[0].category,
            timestamp: new Date().toISOString()
          },
          notifyCfg
        );
      } catch {
        // Notification must never crash the main loop
      }
    }
    return result;
  },
  auto: async ({ repoPath, flags, config }: CmdCtx) => {
    const { runAutoWalker } = await import("./lib/auto-walker.mjs");
    return runAutoWalker(repoPath, {
      ...(flags.maxFeatures ? { maxFeatures: Number(flags.maxFeatures) } : {}),
      dryRun: Boolean(flags.dryRun),
      autoMode: Boolean(flags.autoMode),
      allowCrossSession: Boolean(flags.allowCrossSession),
      config
    });
  },
  learnings: ({ repoPath, flags, positionals }: CmdCtx) =>
    runLearningsSubcommand(repoPath, positionals, flags),
  architect: async ({ repoPath, flags, config }: CmdCtx) =>
    runArchitectSubcommand(repoPath, flags, config),
  trajectory: async ({ repoPath, flags }: CmdCtx) => {
    const { readTrajectory, trajectoryPath } = await import("./lib/trajectory-writer.mjs");
    const sliceId = flags.id;
    if (!sliceId) throw new Error("trajectory requires --id SLICE-NN");
    const steps = await readTrajectory(repoPath, sliceId);
    return { sliceId, steps, count: steps.length, path: trajectoryPath(repoPath, sliceId) };
  },
  "pr-fix": async ({ repoPath, flags, config }: CmdCtx) => {
    const { runPrFix } = await import("./lib/pr-fixer.mjs");
    const prNumber = flags.pr;
    if (!prNumber) throw new Error("pr-fix requires --pr <number>");
    const priorAttempts = flags.body ? JSON.parse(flags.body) : {};
    return runPrFix(repoPath, prNumber, { priorAttempts, config });
  },
  doctor: async ({ repoPath, flags, config }: CmdCtx) => {
    const { runDoctor } = await import("./lib/doctor.mjs");
    const result = await runDoctor(repoPath, { fix: Boolean(flags.fix), config });
    if (flags.check && result.findings.length > 0) {
      console.error(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      return { _suppressDefaultOutput: true };
    }
    return result;
  },
  "lint-artifacts": async ({ repoPath, flags, config }: CmdCtx) => {
    const { checkArtifactLinks } = await import("./lib/artifact-linker.mjs");
    const report = await checkArtifactLinks(repoPath, config);
    if (flags.json) {
      process.exitCode = 0;
      console.log(JSON.stringify(report, null, 2));
      return { _suppressDefaultOutput: true };
    }
    const lines: string[] = [];
    lines.push("## Artifact link report");
    lines.push(`Broken: ${report.broken.length}, Orphaned: ${report.orphaned.length}`);
    if (report.broken.length > 0) {
      lines.push("");
      lines.push("### Broken links");
      for (const b of report.broken) {
        lines.push(`- ${b.sourceFile} [${b.field}] → ${b.referencedId}: ${b.reason}`);
      }
    }
    if (report.orphaned.length > 0) {
      lines.push("");
      lines.push("### Orphaned artifacts");
      for (const o of report.orphaned) {
        lines.push(`- ${o.file} (${o.type}): ${o.reason}`);
      }
    }
    if (report.mermaid) {
      lines.push("");
      lines.push("### Artifact graph");
      lines.push("```mermaid");
      lines.push(report.mermaid);
      lines.push("```");
    }
    process.stdout.write(lines.join("\n") + "\n");
    process.exitCode = report.broken.length > 0 ? 1 : 0;
    return { _suppressDefaultOutput: true };
  },
  pause: async ({ repoPath, flags }: CmdCtx) => {
    const reason = flags.reason;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw new Error("pause requires --reason <text>");
    }
    const stateDir = path.join(repoPath, ".claude", "state", "loop");
    const pausedFile = path.join(stateDir, "paused.json");
    const { default: nodeFs } = await import("node:fs/promises");
    await nodeFs.mkdir(stateDir, { recursive: true });
    const payload = {
      triggered: true,
      reason: reason.trim(),
      resumeHint: "Run: bun src/scripts/loop.mts resume --repo .",
      pausedAt: new Date().toISOString()
    };
    await nodeFs.writeFile(pausedFile, JSON.stringify(payload, null, 2), "utf8");
    process.exitCode = 0;
    return { paused: true, reason: payload.reason, pausedAt: payload.pausedAt, path: pausedFile };
  },
  resume: async ({ repoPath }: CmdCtx) => {
    const pausedFile = path.join(repoPath, ".claude", "state", "loop", "paused.json");
    const { default: nodeFs } = await import("node:fs/promises");
    try {
      await nodeFs.unlink(pausedFile);
    } catch {
      // File absent — idempotent, treat as success.
    }
    process.exitCode = 0;
    return { resumed: true };
  },
  "pr-watch": async ({ repoPath, flags, positionals, config }: CmdCtx) => {
    const prUrl = positionals[0] as string | undefined;
    if (!prUrl) {
      console.error("pr-watch requires a PR URL as the first positional argument");
      process.exitCode = 1;
      return { _suppressDefaultOutput: true };
    }
    const { runPrWatch, readPrWatchConfig, buildDefaultExec } = await import("./lib/pr-watch.mjs");
    const watchConfig = readPrWatchConfig(config);
    const allowHumanComments = Boolean(flags.allowHumanComments);

    if (allowHumanComments) {
      console.warn(
        "WARNING: human review comment text will be forwarded to devcrew:builder. " +
          "Ensure the PR is from a trusted source to avoid prompt injection."
      );
    }

    const exec = buildDefaultExec();
    const waitForMerge = Boolean(flags.waitForMerge);
    const result = await runPrWatch(prUrl, watchConfig, allowHumanComments, exec, waitForMerge);

    if (result.outcome === "all-green") {
      console.log("PR checks all green — watch complete");
      process.exitCode = 0;
      return { outcome: "all-green" };
    }
    if (result.outcome === "pr-merged") {
      console.log("PR merged — watch complete");
      const { emitPrMerged, buildPrMergedInput } = await import("./lib/pr-merged-emitter.mjs");
      await emitPrMerged(repoPath, buildPrMergedInput(prUrl, result, flags));
      process.exitCode = 0;
      return { outcome: "pr-merged" };
    }
    if (result.outcome === "no-checks") {
      console.log("no checks found on PR — watch exiting (nothing to fix)");
      process.exitCode = 0;
      return { outcome: "no-checks" };
    }
    if (result.outcome === "max-retries") {
      console.error(`pr-watch stopped: max retries (${watchConfig.maxRetries}) reached`);
      process.exitCode = 1;
      return {
        outcome: "max-retries",
        prWatch: { triggered: true, haltReason: "max-retries", retriesUsed: result.retriesUsed }
      };
    }
    if (result.outcome === "cost-exceeded") {
      console.error(
        `pr-watch stopped: cumulative cost $${result.cumulativeCostUsd.toFixed(2)} exceeds limit $${watchConfig.maxCostUsd.toFixed(2)}`
      );
      process.exitCode = 1;
      return {
        outcome: "cost-exceeded",
        prWatch: {
          triggered: true,
          haltReason: "cost-exceeded",
          cumulativeCostUsd: result.cumulativeCostUsd
        }
      };
    }
    // pr-closed
    console.error("PR is closed — watch aborted");
    process.exitCode = 1;
    return {
      outcome: "pr-closed",
      prWatch: { triggered: true, haltReason: "pr-closed" }
    };
  },
  "stuck-tick": async ({ repoPath, flags, positionals }: CmdCtx) => {
    const sliceArg = (flags.slice as string | undefined) ?? (positionals[0] as string | undefined);
    if (!sliceArg) {
      console.error("--slice <SLICE-ID> required");
      process.exitCode = 1;
      return { _suppressDefaultOutput: true };
    }
    const { default: nodeFs } = await import("node:fs/promises");
    const dir = path.join(repoPath, ".claude", "state", "loop");
    await nodeFs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, "stuck-detector.json");
    let existing: any = null;
    try {
      existing = JSON.parse(await nodeFs.readFile(filePath, "utf8"));
    } catch {
      /* absent — start fresh */
    }
    const attempts =
      existing?.sliceId === sliceArg && typeof existing?.attempts === "number"
        ? existing.attempts + 1
        : 1;
    const payload = { sliceId: sliceArg, attempts, lastAttemptAt: new Date().toISOString() };
    await nodeFs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    process.exitCode = 0;
    return { sliceId: sliceArg, attempts };
  },
  "stuck-reset": async ({ repoPath }: CmdCtx) => {
    const { default: nodeFs } = await import("node:fs/promises");
    const filePath = path.join(repoPath, ".claude", "state", "loop", "stuck-detector.json");
    try {
      await nodeFs.unlink(filePath);
    } catch {
      /* idempotent */
    }
    process.exitCode = 0;
    return { reset: true };
  },
  intake: async ({ repoPath, flags, positionals }: CmdCtx) => {
    const [sub] = positionals;
    if (sub === "from-text") {
      const { intakeFromText } = await import("./lib/intake.mjs");
      if (!flags.text) {
        process.stderr.write("intake from-text: --text required\n");
        process.exit(2);
      }
      const result = await intakeFromText({
        repoPath,
        text: flags.text,
        flags: {
          deep: !!flags.deep,
          spec: !!flags.spec,
          dryRun: !!flags.dryRun,
          fromIssue: flags.fromIssue
        }
      });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      process.exit(0);
    }
    process.stderr.write(`intake: unknown subcommand "${sub}"\n`);
    process.exit(2);
  }
};

async function runArchitectSubcommand(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const sliceId = flags.id;
  if (!sliceId) throw new Error("architect requires --id SLICE-NN");

  const { resolveArchitectModels } = await import("./lib/model-router.mjs");
  const { runPlanPreflight } = await import("./lib/slice-plan.mjs");

  const { architectModel, editorModel } = resolveArchitectModels(config);
  const planResult = await runPlanPreflight(repoPath, sliceId, { config });

  // null = routing disabled (loop.modelRouting.enabled: false) — dispatches
  // must omit `model:` so each agent's own frontmatter (agents/*.md) governs.
  const architectLabel = architectModel ?? "inherit (agent frontmatter — omit model:)";
  const editorLabel = editorModel ?? "inherit (agent frontmatter — omit model:)";
  const editorSentence =
    editorModel === null
      ? "Dispatch `devcrew:fullstack-dev` subagent for the editor phase WITHOUT a `model:` argument — model routing is disabled, so the agent's own `model:` frontmatter governs. After it returns, dispatch `devcrew:reviewer` (and `devcrew:verifier` if behavior changed) before closing the slice."
      : `Dispatch \`devcrew:fullstack-dev\` subagent for the editor phase, which will use the ${editorModel} model for implementation. After it returns, dispatch \`devcrew:reviewer\` (and \`devcrew:verifier\` if behavior changed) before closing the slice.`;

  const dispatchInstruction = [
    `## Two-Model Split Dispatch`,
    ``,
    `**Architect Model (Research/Plan):** ${architectLabel}`,
    `**Editor Model (Implementation):** ${editorLabel}`,
    ``,
    `The architect model has completed the codebase research pre-flight.`,
    `Plan artifact written to: ${planResult.planPath}`,
    ``,
    editorSentence,
    `The editor phase should reference the plan artifact to guide the implementation approach.`
  ].join("\n");

  const { logEvent } = await import("./lib/telemetry.mjs");
  await logEvent(repoPath, {
    command: "architect",
    slice: sliceId,
    architect_model: architectModel,
    editor_model: editorModel,
    plan_path: planResult.planPath,
    files_researched: planResult.filesResearched.length
  });

  return {
    sliceId,
    architectModel,
    editorModel,
    planPath: planResult.planPath,
    filesResearched: planResult.filesResearched,
    dispatchInstruction
  };
}

// Legacy --variant + --preset path. UNCHANGED from before FEAT-007/SLICE-35
// (verbatim body) — byte-stable for the 5 existing call sites
// (commands/orchestrate-slice.md x3, skills/pm-rescope/SKILL.md,
// skills/triage/SKILL.md), none of which migrate in this slice.
function runVariantResolveSkills(
  flags: Record<string, any>,
  resolveSkills: typeof import("./lib/skill-resolver.mjs").resolveSkills
): void {
  const VALID_VARIANTS = ["fe", "be", "single", "pm", "researcher", "architect", "document-writer"];
  if (!flags.variant) {
    process.stderr.write(`error: --variant <${VALID_VARIANTS.join("|")}> required\n`);
    process.exitCode = 1;
    return;
  }
  if (!VALID_VARIANTS.includes(flags.variant)) {
    process.stderr.write(
      `error: --variant must be one of ${VALID_VARIANTS.join(", ")} (got ${flags.variant})\n`
    );
    process.exitCode = 1;
    return;
  }

  const preset = flags.preset;
  if (!preset) {
    process.stderr.write("error: --preset <path> required\n");
    process.exitCode = 1;
    return;
  }

  if (flags.strict) {
    process.stderr.write(
      "warn: --strict is reserved for a future skill-ID-lint registry and is a no-op today\n"
    );
  }

  try {
    const resolved = resolveSkills({
      presetPath: preset,
      ...(flags.override ? { overridePath: flags.override } : {}),
      variant: flags.variant
    });
    if (resolved === null) {
      process.stderr.write(
        "warn: no skills resolved for this variant (split mismatch or empty array)\n"
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(JSON.stringify(resolved, null, 2) + "\n");
    process.exitCode = 0;
  } catch (err: unknown) {
    const msg = (err as { message?: string } | undefined)?.message ?? String(err);
    process.stderr.write(`error: ${msg}\n`);
    process.exitCode = 1;
  }
}

// Resolve the tags for a --slice/--tags task-signal resolve. Returns the
// tag array, or an { error } envelope on a hard failure (slice not found).
async function collectTaskSignalTags(
  flags: Record<string, any>,
  repoPath: string
): Promise<string[] | { error: string }> {
  if (flags.tags) {
    return String(flags.tags)
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);
  }

  const { resolveConfig } = await import("./lib/config-resolver.mjs");
  let config: Record<string, any> | null = null;
  try {
    config = await resolveConfig(repoPath);
  } catch {
    // Best-effort: --slice must work in a repo without .claude/loop.json too
    // (resolveConfig throws by design, DEC-069, for an unconfigured repo) —
    // fall back to the loop's own PATH_DEFAULTS below.
    config = null;
  }

  const { slicesRoot, locateSliceFile } = await import("./lib/paths.mjs");
  const slicesRootDir = slicesRoot(repoPath, config);
  const sliceFile = await locateSliceFile(slicesRootDir, flags.slice);
  if (!sliceFile) {
    return { error: `slice not found: ${flags.slice} (looked under ${slicesRootDir})` };
  }

  const fs = await import("node:fs/promises");
  const { parseFrontmatter } = await import("./lib/frontmatter.mjs");
  const raw = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(raw);
  return Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : [];
}

// NEW (FEAT-007 / SLICE-35): --slice/--tags task-signal matcher path.
// Additive — routes through skill-matcher.mjs against the live catalog
// (skill-catalog.mjs) instead of a preset. AC-1: falls back to the legacy
// pickBlock preset path only when both --preset AND --variant are also
// given (pickBlock has no signature that doesn't take a variant) — a
// documented, narrower reading of the contract's `--slice <id> [--preset
// <path>]` sketch, called out in the handoff.
async function runTaskSignalResolveSkills(
  flags: Record<string, any>,
  repoPath: string,
  resolveSkills: typeof import("./lib/skill-resolver.mjs").resolveSkills
): Promise<void> {
  const tagsResult = await collectTaskSignalTags(flags, repoPath);
  if (!Array.isArray(tagsResult)) {
    process.stderr.write(`error: ${tagsResult.error}\n`);
    process.exitCode = 1;
    return;
  }
  const tags = tagsResult;

  const { enumerateSkillCatalog } = await import("./lib/skill-catalog.mjs");
  const { matchSkills } = await import("./lib/skill-matcher.mjs");
  const { renderDispatchBlock } = await import("./lib/skill-resolver.mjs");

  let catalogResult: Awaited<ReturnType<typeof enumerateSkillCatalog>>;
  try {
    catalogResult = await enumerateSkillCatalog(repoPath);
  } catch (err: unknown) {
    const msg = (err as { message?: string } | undefined)?.message ?? String(err);
    process.stderr.write(`error: ${msg}\n`);
    process.exitCode = 1;
    return;
  }

  const match = matchSkills({ tags }, catalogResult.catalog);

  // AC-2: --strict fails loudly on any unresolved id, naming it.
  if (flags.strict && match.unresolved.length > 0) {
    process.stderr.write(
      `error: unresolved skill id(s) not present in the live catalog: ${match.unresolved.join(", ")}\n`
    );
    process.exitCode = 1;
    return;
  }

  if (match.skills.length === 0) {
    if (flags.preset && flags.variant) {
      runVariantResolveSkills(flags, resolveSkills);
      return;
    }
    if (match.unresolved.length > 0) {
      process.stderr.write(
        `warn: no skills resolved from tags (unresolved: ${match.unresolved.join(", ")})\n`
      );
    } else {
      process.stderr.write("warn: no skills resolved for the given tags\n");
    }
    process.exitCode = 2;
    return;
  }

  if (match.unresolved.length > 0) {
    process.stderr.write(
      `warn: unresolved skill id(s) not present in the live catalog: ${match.unresolved.join(", ")}\n`
    );
  }

  process.stdout.write(
    JSON.stringify(
      { ...match, dispatchInstructionBlock: renderDispatchBlock(match.skills) },
      null,
      2
    ) + "\n"
  );
  process.exitCode = 0;
}

async function runResolveSkillsCommand(
  flags: Record<string, any>,
  repoPath: string,
  resolveSkills: typeof import("./lib/skill-resolver.mjs").resolveSkills
): Promise<void> {
  if (flags.slice || flags.tags) {
    await runTaskSignalResolveSkills(flags, repoPath, resolveSkills);
    return;
  }
  runVariantResolveSkills(flags, resolveSkills);
}

async function runConfigGetSubcommand(argv: string[]): Promise<void> {
  const [sub, dotted, ...rest] = argv;
  if (sub !== "get" || !dotted) {
    console.error("usage: loop.mts config get <dotted.path> [--repo PATH]");
    process.exitCode = 1;
    return;
  }
  const repoIdx = rest.indexOf("--repo");
  const repoRoot = repoIdx >= 0 && rest[repoIdx + 1] ? rest[repoIdx + 1]! : process.cwd();
  const fs = await import("node:fs");
  const nodePath = await import("node:path");
  const p = nodePath.join(repoRoot, ".claude", "loop.json");
  if (!fs.existsSync(p)) return;
  const json = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
  const value = dotted.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, json);
  if (value !== undefined) console.log(String(value));
}

// devcrew.json schemaVersion 2 migrator (FEAT-003 / SLICE-13, contract §5).
// `bun loop.mts config migrate-devcrew [--repo PATH]` — in-place, idempotent;
// see src/scripts/lib/devcrew-config.mts for the merge/backup contract.
async function runConfigMigrateDevcrewSubcommand(argv: string[]): Promise<void> {
  const repoIdx = argv.indexOf("--repo");
  const repoRoot = repoIdx >= 0 && argv[repoIdx + 1] ? argv[repoIdx + 1]! : process.cwd();
  const { migrateToDevcrewConfig } = await import("./lib/devcrew-config.mjs");
  const result = await migrateToDevcrewConfig(repoRoot);
  console.log(JSON.stringify(result, null, 2));
}

async function runConfigSubcommand(argv: string[]): Promise<void> {
  // FEAT-020 / SLICE-37 follow-up (review 20260819T230000Z): `config` is
  // short-circuited on rawArgv before loop.mts's parseArgs/flags.help
  // chokepoint ever runs, and this router's own parsing only recognized
  // sub === "get"|"migrate-devcrew" — a bare "--help" anywhere else in argv
  // (e.g. `config migrate-devcrew --help`) fell through to
  // runConfigMigrateDevcrewSubcommand() and executed a real write. Mirror
  // dispatch.mts's own parser, which already resolves help from anywhere in
  // argv, before matching on `sub` at all.
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usageFor("config"));
    return;
  }
  const [sub, ...rest] = argv;
  if (sub === "get") {
    await runConfigGetSubcommand(argv);
    return;
  }
  if (sub === "migrate-devcrew") {
    await runConfigMigrateDevcrewSubcommand(rest);
    return;
  }
  console.error("usage: loop.mts config <get <dotted.path>|migrate-devcrew> [--repo PATH]");
  process.exitCode = 1;
}

async function main() {
  // Short-circuit `dispatch` before parseArgs — its flags (--plan, --parent-branch,
  // --depth, --dry-run, --json, --run-id, --config) are not registered in
  // FLAG_SPEC, and the parser would throw on them. Forward all remaining argv
  // verbatim to dispatch.mts as a child process (run under bun).
  const rawArgv = process.argv.slice(2);
  if (rawArgv[0] === "dispatch") {
    const { spawnSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const thisFile = fileURLToPath(import.meta.url);
    const dispatchCli = path.join(path.dirname(thisFile), "dispatch.mts");
    const result = spawnSync("bun", [dispatchCli, ...rawArgv.slice(1)], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    process.exitCode = result.status ?? 1;
    return;
  }

  if (rawArgv[0] === "wave") {
    const sub = rawArgv[1];
    if (!sub) {
      console.error("usage: loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]");
      process.exitCode = 1;
      return;
    }
    const { default: waveCli } = await import("./lib/wave/cli.mjs");
    await waveCli(sub, rawArgv.slice(2));
    return;
  }

  if (rawArgv[0] === "config") {
    await runConfigSubcommand(rawArgv.slice(1));
    return;
  }

  const { clearFrontmatterCache, resolveSkills, parseArgs } = await loadCliDeps();

  const { command, flags, positionals } = parseArgs(rawArgv);
  const repoPath = path.resolve(normalizeMsysPath(flags.repo));

  if (command === "help") {
    console.log(usage());
    return;
  }

  // AC-1/AC-3 (FEAT-020 / SLICE-37): single dispatch-level chokepoint — every
  // subcommand in the COMMANDS registry below (install, slice, backlog,
  // intake, ...) is gated here, before config resolution, before the
  // DELETED_SKILLS_MAP stub check, and before the handler lookup. This is
  // what closes the SLICE-31 near-miss: `install --help` used to reach
  // installLoop() and execute a real install (flags.help was parsed
  // correctly but never checked). Placed as early as possible so no
  // handler — including ones added later — can accidentally run a side
  // effect first.
  if (flags.help) {
    console.log(usageFor(command));
    return;
  }

  if (command === "resolve-skills") {
    await runResolveSkillsCommand(flags, repoPath, resolveSkills);
    clearFrontmatterCache();
    return;
  }

  clearFrontmatterCache(); // ensure cold start for each invocation

  // Hard-break stubs for skills deleted in v0.53 (FEAT-277). Exit non-zero
  // with a clear replacement pointer before any config resolution or handler
  // lookup so callers get actionable output even in a bare repo.
  const DELETED_SKILLS_MAP: Record<string, string> = {
    "backlog-add": "devcrew:intake",
    "backlog-enrich": "devcrew:intake",
    "backlog-list": "devcrew:brief",
    "backlog-promote": "devcrew:triage",
    "pm-review": "devcrew:intake --deep",
    "pm-decompose": "devcrew:intake --spec",
    retriage: "devcrew:triage --ids",
    "spec-add": "devcrew:intake --spec",
    "spec-decompose": "devcrew:intake --spec",
    "spec-list": "devcrew:brief",
    "slice-from-feature": "devcrew:start FEAT-NNN",
    "derive-slice": "devcrew:start FEAT-NNN",
    "next-slice": "devcrew:start",
    "slice-plan": "devcrew:start (auto-runs plan)",
    "slice-link": "devcrew:close (auto-links)",
    "slice-grade": "devcrew:close",
    "slice-grade-write": "devcrew:close",
    "slice-post-builder-fanout": "internal-only",
    "slice-review-ladder": "internal-only",
    "sync-claims": "internal-only (claims-sync still runs)",
    "classify-slice-shape": "internal-only (runs during devcrew:start)",
    "release-plan": "devcrew:phase-gate",
    "competitor-audit": "devcrew:market-researcher",
    architect: "devcrew:architect",
    "stop-check": "internal-only (devcrew:auto)",
    // "snapshot-memory" removed from this map (FEAT-214 item 7): a real
    // handler has existed since v0.53 (see COMMANDS["snapshot-memory"]
    // below) — this stub silently intercepted every invocation before the
    // handler lookup ever ran, and its replacement pointer was also wrong
    // (`devcrew:brief` never regenerates the snapshot; see
    // reportStatus() in loop-installer.mts).
    "decisions-list": "devcrew:decisions list",
    "decisions-show": "devcrew:decisions show",
    "decisions-relevant": "devcrew:decisions relevant",
    "decisions-supersede": "devcrew:decisions supersede"
  };
  if (DELETED_SKILLS_MAP[command]) {
    process.stderr.write(
      `runner:${command} removed in v0.53. Use ${DELETED_SKILLS_MAP[command]} instead.\n`
    );
    process.exit(2);
  }

  const handler = (COMMANDS as Record<string, (ctx: CmdCtx) => Promise<unknown>>)[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
  }

  // Resolve config once at dispatcher level and pass to handlers that read it.
  // Skipped for CONFIG_OPTIONAL_COMMANDS: their handlers never touch `config`
  // and must run on a fresh repo before `.claude/loop.json` exists —
  // `install` bootstraps the config itself (loop-installer does its own
  // preset-aware resolve) and `list-presets` is static. resolveConfig() throws
  // by design (DEC-069) when no config file exists, so pre-resolving it here
  // would block a fresh-repo `install` even with a valid --preset (#364).
  const CONFIG_OPTIONAL_COMMANDS = new Set(["install", "list-presets"]);
  let config: Record<string, any> | null = null;
  if (!CONFIG_OPTIONAL_COMMANDS.has(command)) {
    const { resolveConfig } = await import("./lib/config-resolver.mjs");
    config = await resolveConfig(repoPath);
  }

  try {
    const result = await handler({ repoPath, flags, positionals, config });
    if (result && (result as any)._suppressDefaultOutput) return;
    console.log(JSON.stringify(result, null, 2));
  } finally {
    // Win 10: flush buffered audit log lines in a single write per invocation.
    const { flushAuditLog } = await import("./lib/auto-dispatch.mjs");
    await flushAuditLog(repoPath).catch(() => {
      /* non-fatal: best-effort audit log flush */
    });
  }
}

type DispatchFn = typeof import("./lib/auto-dispatch.mjs").dispatchAgent;

// FEAT-251 Phase 2 (SLICE-155): tracker mirror traffic routes through
// getProvider() exclusively — taskStore.provider in loop.json is the single
// switch. These two helpers resolve the configured provider and, when it is
// a GithubProvider (explicit "github", or the "github.enabled" back-compat
// branch — see getProvider() in lib/task-store/index.mts), delegate to its
// id-based publish methods (identical behavior to the pre-migration direct
// github-sync.mjs calls: idempotency check, milestone upsert, frontmatter
// stamp). Any other resolved provider (noop, linear-stub) is a silent no-op
// here, mirroring the old "github.enabled: false" skip.
export async function publishFeatureViaProvider(
  repoPath: string,
  featId: string,
  config: Record<string, any> | null
): Promise<{ created: boolean; issueNum: number; url: string | null } | null> {
  const { getProvider, GithubProvider } = await import("./lib/task-store/index.mjs");
  const provider = getProvider(config, repoPath);
  if (provider instanceof GithubProvider) {
    return provider.publishFeatureById(featId);
  }
  return null;
}

export async function publishSliceViaProvider(
  repoPath: string,
  sliceId: string,
  featId: string,
  config: Record<string, any> | null
): Promise<{ created: boolean; issueNum: number; url: string | null } | null> {
  const { getProvider, GithubProvider } = await import("./lib/task-store/index.mjs");
  const provider = getProvider(config, repoPath);
  if (provider instanceof GithubProvider) {
    return provider.publishSliceById(sliceId, featId);
  }
  return null;
}

async function resolveBacklogAddBody(
  repoPath: string,
  _title: string,
  suppliedBody: string | null | undefined
): Promise<string> {
  if (suppliedBody) return suppliedBody;
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "devcrew:researcher",
    parentCommand: "backlog-add",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal-researcher-disabled",
    durationMs: 0
  });
  console.error(
    "[backlog add] researcher auto-dispatch removed (see DEC-011). " +
      "Creating FEAT with empty body — run /devcrew:backlog-add for researcher enrichment, " +
      "or pass --body explicitly."
  );
  return "";
}

async function runBacklogListPendingIds(repoPath: string, flags: Record<string, any> = {}) {
  // FEAT-201: mutual-exclusion guard — --ids and --include-triaged cannot be combined.
  if (flags.ids && flags.includeTriaged) {
    process.stderr.write("error: use either --ids or --include-triaged, not both\n");
    process.exit(2);
  }
  const { listPendingFeatureIds } = await import("./lib/backlog-list-ids.mjs");
  const ids = await listPendingFeatureIds(repoPath, {
    includeTriaged: Boolean(flags.includeTriaged),
    ...(flags.ids ? { ids: String(flags.ids) } : {})
  });
  return { ids };
}

async function runBacklogAdd(
  repoPath: string,
  flags: Record<string, any>,
  rest: string[],
  config: Record<string, any> | null
) {
  // --from-issue pre-fill: fetch title, body, and GitHub metadata from a GH issue URL.
  let githubIssue: number | null = null;
  let githubUrl: string | null = null;
  let issueBody: string | undefined;

  if (flags.fromIssue) {
    const { fetchIssue } = await import("./lib/from-issue.mjs");
    const issue = await fetchIssue(flags.fromIssue);
    // Only pre-fill title if not explicitly passed
    if (!flags.title) {
      flags = { ...flags, title: issue.title };
    }
    // Only pre-fill body if not explicitly passed
    if (!flags.body) {
      issueBody = issue.body || undefined;
    }
    githubIssue = issue.number;
    githubUrl = issue.url;
  }

  const title = flags.title || rest.join(" ");
  if (!title) throw new Error("backlog add requires a title (positional or --title).");
  if (flags.noResearch) {
    console.error(
      "[backlog add] --no-research is deprecated and now a no-op (see DEC-011). " +
        "Researcher auto-dispatch is already removed."
    );
  }
  const resolvedBody = await resolveBacklogAddBody(repoPath, title, flags.body ?? issueBody);
  const { addFeature } = await import("./lib/backlog-writer.mjs");
  const result = await addFeature(repoPath, {
    title,
    priority: flags.priority,
    category: flags.category,
    target_release: flags.targetRelease,
    body: resolvedBody,
    config,
    ...(githubIssue !== null ? { github_issue: githubIssue } : {}),
    ...(githubUrl !== null ? { github_url: githubUrl } : {})
  });
  try {
    await publishFeatureViaProvider(repoPath, result.id, config);
  } catch (e) {
    console.error(`[github] publish warning (backlog add): ${(e as Error).message}`);
  }
  return result;
}

// runBacklogPmWrite removed in v0.53 — backlog-pm-write.mts deleted (FEAT-277).
// Replaced by runBacklogPmApply below (FEAT-214 / DEC-058 hybrid write-path):
// PM writes a results file via its own scoped Write grant; this subcommand
// validates + commits it via pm-apply.mts, reusing backlog-writer.mts for
// the actual frontmatter/state mutation.

export async function runBacklogPmApply(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  if (!flags.file) {
    throw new Error("backlog pm-apply requires --file <path-to-pm-results.json>");
  }
  const resolvedPath = path.isAbsolute(flags.file)
    ? flags.file
    : path.resolve(repoPath, flags.file);

  const fs = await import("node:fs/promises");
  let raw: string;
  try {
    raw = await fs.readFile(resolvedPath, "utf8");
  } catch (err: unknown) {
    throw new Error(
      `backlog pm-apply: cannot read --file ${resolvedPath}: ${(err as Error).message}`
    );
  }

  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch (err: unknown) {
    throw new Error(
      `backlog pm-apply: --file ${resolvedPath} is not valid JSON: ${(err as Error).message}`
    );
  }

  let allowedIds: string[] | null;
  if (flags.ids) {
    allowedIds = String(flags.ids)
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  } else {
    const { listPendingFeatureIds } = await import("./lib/backlog-list-ids.mjs");
    allowedIds = await listPendingFeatureIds(repoPath, {});
  }

  const { applyPmResults } = await import("./lib/pm-apply.mjs");
  const result = await applyPmResults(repoPath, entries, { allowedIds, config });

  if (result.failures.length > 0) {
    // Entry point sets exitCode — pm-apply.mts itself never touches it
    // (docs/code-conventions.md "Error handling").
    process.exitCode = 1;
  }

  // Held needs-review verdicts (issue #402 bug 2) commit successfully but
  // do NOT count as triaged — the FEAT stays in pending/ awaiting a human.
  const heldForReview = result.applied.filter((a) => a.needsReview).length;

  return {
    triaged: result.applied.length - heldForReview,
    applied: result.applied.length,
    heldForReview,
    failed: result.failures.length,
    // ARCHITECT GATE read-guard (pm-apply.mts isArchGateActive): entries
    // skipped because the FEAT is mid-gate/deferred. Distinct from
    // `failed` — a gated skip is expected behavior, not a batch error, so
    // it never flips process.exitCode.
    gated: result.gated.length,
    path: "pm-apply",
    results: result.applied,
    failures: result.failures,
    gatedEntries: result.gated
  };
}

// runBacklogPmRescope: GATE reject-loop integration (autonomous --rescope
// mode). Mirrors runBacklogPmApply's read-file / validate / commit shape —
// PM writes a rescope-results JSON file via its own scoped Write grant
// (same `.claude/artifacts/loop/pm-reviews/` path as triage results); this
// subcommand is the sole caller of `applyPmRescope`, which is the sole
// writer of the FEAT's AC section + rescope frontmatter fields.
export async function runBacklogPmRescope(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  if (!flags.file) {
    throw new Error("backlog pm-rescope requires --file <path-to-rescope-results.json>");
  }
  const resolvedPath = path.isAbsolute(flags.file)
    ? flags.file
    : path.resolve(repoPath, flags.file);

  const fs = await import("node:fs/promises");
  let raw: string;
  try {
    raw = await fs.readFile(resolvedPath, "utf8");
  } catch (err: unknown) {
    throw new Error(
      `backlog pm-rescope: cannot read --file ${resolvedPath}: ${(err as Error).message}`
    );
  }

  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch (err: unknown) {
    throw new Error(
      `backlog pm-rescope: --file ${resolvedPath} is not valid JSON: ${(err as Error).message}`
    );
  }

  let allowedIds: string[] | null;
  if (flags.ids) {
    allowedIds = String(flags.ids)
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  } else {
    allowedIds = null;
  }

  const { applyPmRescope } = await import("./lib/pm-apply.mjs");
  const result = await applyPmRescope(repoPath, entries, { allowedIds, config });

  if (result.failures.length > 0) {
    // Entry point sets exitCode — pm-apply.mts itself never touches it
    // (docs/code-conventions.md "Error handling").
    process.exitCode = 1;
  }

  return {
    applied: result.applied.length,
    failed: result.failures.length,
    path: "pm-rescope",
    results: result.applied,
    failures: result.failures
  };
}

// Read a JSON-array-of-strings file for an arch-gate-apply flag
// (--objections / --risk-flags share this exact shape). Extracted so both
// flags get identical resolve/read/parse/validate error messages.
async function readStringArrayFlagFile(
  repoPath: string,
  flagName: string,
  rawPath: string
): Promise<string[]> {
  const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(repoPath, rawPath);
  const fs = await import("node:fs/promises");
  let raw: string;
  try {
    raw = await fs.readFile(resolvedPath, "utf8");
  } catch (err: unknown) {
    throw new Error(
      `backlog arch-gate-apply: cannot read --${flagName} ${resolvedPath}: ${(err as Error).message}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    throw new Error(
      `backlog arch-gate-apply: --${flagName} ${resolvedPath} is not valid JSON: ${(err as Error).message}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      `backlog arch-gate-apply: --${flagName} ${resolvedPath} must be a JSON array of strings`
    );
  }
  return parsed.filter((s): s is string => typeof s === "string");
}

// runBacklogArchGateApply: ARCHITECT GATE reject-loop integration. Sole CLI
// caller of `applyArchGateVerdict` (arch-gate.mts) — persists an
// architect-reviewer verdict (`arch_review`, normalized) plus risk flags
// (`arch_risk`) into FEAT frontmatter and advances the
// gate_in_progress/approved/deferred_design state machine. `--objections`
// and `--risk-flags` each point at a JSON file containing a string array
// (mirrors pm-rescope's results-file shape); `--risk-flags` is optional —
// when omitted, `applyArchGateVerdict` falls back to `--objections` as the
// risk-flag record (see arch-gate.mts ApplyArchGateVerdictOpts). Omit both
// for an approved verdict with no reviewer notes. `--spent-usd`, when
// supplied, is checked against `loop.archGateBudgetUsdPerFeat` BEFORE any
// frontmatter write — an exceeded budget halts (exit 1, `halt_reason:
// "budget_exceeded"`), never a silent defer.
export async function runBacklogArchGateApply(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  if (!flags.id) {
    throw new Error("backlog arch-gate-apply requires --id <FEAT-ID>");
  }
  if (!flags.verdict) {
    throw new Error(
      "backlog arch-gate-apply requires --verdict <approved|approved_with_notes|rejected|needs_revision>"
    );
  }

  const objections = flags.objections
    ? await readStringArrayFlagFile(repoPath, "objections", flags.objections)
    : [];
  const riskFlags = flags["risk-flags"]
    ? await readStringArrayFlagFile(repoPath, "risk-flags", flags["risk-flags"])
    : undefined;

  const actualUsdSpent =
    flags["spent-usd"] !== undefined && flags["spent-usd"] !== null
      ? Number(flags["spent-usd"])
      : null;

  const { applyArchGateVerdict, ArchGateBudgetExceededError } = await import("./lib/arch-gate.mjs");
  try {
    const result = await applyArchGateVerdict(repoPath, String(flags.id), String(flags.verdict), {
      objections,
      ...(riskFlags !== undefined ? { riskFlags } : {}),
      actualUsdSpent,
      config
    });
    return { path: "arch-gate-apply", halted: false, ...result };
  } catch (err: unknown) {
    if (err instanceof ArchGateBudgetExceededError) {
      // Entry point sets exitCode — halt-and-escalate to the operator,
      // never a silent defer (see arch-gate.mts checkArchGateBudget).
      process.exitCode = 1;
      return {
        path: "arch-gate-apply",
        halted: true,
        halt_reason: err.halt_reason,
        featureId: err.featureId,
        actualUsd: err.actualUsd,
        ceilingUsd: err.ceilingUsd
      };
    }
    throw err;
  }
}

// runBacklogSliceRenumber: FEAT-257 SLICE-B / DEC-079 residual-race
// remediation. `--from`/`--to` are required SLICE-NN ids; `--dry-run` lists
// what would be renamed/appended without mutating anything. Refuses
// (nonzero exit, propagated via main()'s catch) rather than clobbering when
// `--to` already exists as a slice file or a referencing artifact.
export async function runBacklogSliceRenumber(
  repoPath: string,
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  if (!flags.from) {
    throw new Error("backlog slice-renumber requires --from <SLICE-NN>");
  }
  if (!flags.to) {
    throw new Error("backlog slice-renumber requires --to <SLICE-NN>");
  }
  const { renumberSlice } = await import("./lib/slice-renumber.mjs");
  const result = await renumberSlice(repoPath, String(flags.from), String(flags.to), config, {
    dryRun: Boolean(flags.dryRun)
  });
  return { path: "slice-renumber", dryRun: Boolean(flags.dryRun), ...result };
}

function isUnclassifiedEntry(entry: Record<string, any>): boolean {
  const fm = entry.frontmatter;
  const tagsEmpty = !Array.isArray(fm.tags) || fm.tags.length === 0;
  const tagsNull = fm.tags == null || fm.tags === "";
  const noTags = tagsEmpty && tagsNull;
  return noTags && fm.needs_contract == null && fm.needs_ux == null;
}

export async function runBacklogAudit(repoPath: string, flags: Record<string, any>) {
  const { auditBacklog } = await import("./lib/backlog-auditor.mjs");
  const results = await auditBacklog(repoPath);
  if (flags.json) {
    process.exitCode = 0;
    return { results } as unknown as Record<string, unknown>;
  }
  // human-readable: one line per FEAT
  for (const r of results) {
    const ev = r.evidence.slice(0, 2).join(", ") || "no evidence";
    process.stdout.write(`${r.id} [${r.verdict}]: ${ev}\n`);
  }
  process.exitCode = 0;
  return {};
}

export async function runBacklogEnrich(repoPath: string, _flags: Record<string, any>) {
  const { listBacklog } = await import("./lib/backlog-parser.mjs");
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");

  const allEntries = await listBacklog(repoPath);
  const triaged = allEntries.filter((e: Record<string, any>) => e.state === "triaged");

  const needsClassify = triaged.filter(isUnclassifiedEntry);
  const alreadyTagged = triaged.length - needsClassify.length;

  if (needsClassify.length === 0) {
    console.log(`Enriched: 0 / Already tagged: ${alreadyTagged}`);
    return { enriched: 0, alreadyTagged, failed: 0 };
  }

  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "devcrew:architect",
    parentCommand: "backlog enrich",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal",
    durationMs: 0
  });
  console.error(
    `[backlog enrich] CLI auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /devcrew:backlog-enrich. ` +
      `${needsClassify.length} feature(s) need classification.`
  );
  process.exitCode = 1;
  return { enriched: 0, alreadyTagged, failed: 0, refused: true };
}

// Subcommands that are a pure (repoPath, flags, config) forward to a single
// handler — dispatched via one lookup instead of an `if (sub === ...)`
// branch apiece, so runBacklogSubcommand's cognitive complexity doesn't grow
// linearly with every new simple subcommand (extracted when adding
// slice-renumber pushed the if-chain over the repo's complexity cap).
const SIMPLE_BACKLOG_HANDLERS: Record<
  string,
  (
    repoPath: string,
    flags: Record<string, any>,
    config: Record<string, any> | null
  ) => Promise<unknown>
> = {
  "pm-apply": runBacklogPmApply,
  "pm-rescope": runBacklogPmRescope,
  "arch-gate-apply": runBacklogArchGateApply,
  "slice-renumber": runBacklogSliceRenumber,
  "list-pending-ids": (repoPath, flags) => runBacklogListPendingIds(repoPath, flags),
  enrich: (repoPath, flags) => runBacklogEnrich(repoPath, flags),
  audit: (repoPath, flags) => runBacklogAudit(repoPath, flags)
};

async function runBacklogSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "backlog requires a subcommand: add | list | list-pending-ids | triage | promote | pm-apply | pm-rescope | arch-gate-apply | slice-renumber"
    );
  const simpleHandler = SIMPLE_BACKLOG_HANDLERS[sub];
  if (simpleHandler) return simpleHandler(repoPath, flags, config);
  if (sub === "add") {
    return runBacklogAdd(repoPath, flags, rest, config);
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
    // TODO(2026-09-11): remove this stub. Kept one release cycle so
    // operators upgrading from <= v0.40 get a directive instead of a
    // bare "unknown subcommand" error. Triage is PM-only since
    // commit 505a8a5 (2026-06-11).
    throw new Error(
      "`backlog triage` (regex fallback) was removed on 2026-06-11. Triage is PM-only — invoke `/devcrew:triage` (skill) instead. On PM error, halt and surface to the operator."
    );
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

function parseFeatureEntries(flags: Record<string, any>): string[] {
  if (flags.featuresJson) {
    let entries;
    try {
      entries = JSON.parse(flags.featuresJson as string);
    } catch (err: unknown) {
      throw new Error(`--features-json must be valid JSON: ${(err as Error).message}`);
    }
    if (!Array.isArray(entries)) throw new Error("--features-json must be a JSON array");
    return entries;
  }
  return (flags.features as string)
    .split(";")
    .map((s: string) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Architect output parser — accepts semicolon-separated, newline-separated,
// or markdown-numbered-list titles from the agent. Each entry is trimmed,
// list markers and surrounding emphasis are stripped, empty entries
// discarded. Prefers semicolon split when present (back-compat with the
// original prompt format); falls back to newline split otherwise.
// ---------------------------------------------------------------------------

function stripListMarker(line: string): string {
  // Strip leading markdown list markers: "1.", "1)", "-", "*"
  let s = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
  // Strip surrounding bold/italic markers and backticks
  s = s.replace(/^[*_`]+|[*_`]+$/g, "");
  return s.trim();
}

export function parseArchitectOutput(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const hasSemicolon = raw.includes(";");
  const parts = hasSemicolon ? raw.split(";") : raw.split("\n");
  return parts.map(stripListMarker).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Incomplete-SPEC detection — checks frontmatter and body for objective/scope.
// Returns array of missing field names (empty when SPEC is complete).
// ---------------------------------------------------------------------------

export function detectMissingSpecFields(spec: {
  frontmatter: Record<string, any>;
  body: string;
}): string[] {
  const missing: string[] = [];
  const fm = spec.frontmatter;
  const body = spec.body ?? "";

  const hasObjective =
    (fm["objective"] != null && String(fm["objective"]).trim().length > 0) ||
    /##\s+objective/i.test(body) ||
    /##\s+goals/i.test(body) ||
    /##\s+problem/i.test(body);

  const hasScope =
    (fm["scope"] != null && String(fm["scope"]).trim().length > 0) ||
    /##\s+scope/i.test(body) ||
    /##\s+in[- ]scope/i.test(body) ||
    /##\s+non-goals/i.test(body);

  if (!hasObjective) missing.push("objective");
  if (!hasScope) missing.push("scope");
  return missing;
}

const SPEC_HANDLERS = {
  add: async (
    repoPath: string,
    flags: Record<string, any>,
    rest: string[],
    config: Record<string, any> | null
  ) => {
    const title = flags.title || rest.join(" ");
    if (!title) throw new Error("spec add requires a title (positional or --title).");
    if (!flags.type) {
      throw new Error("spec add requires --type prd|user-journey|sre|research|adr|other.");
    }
    const { addSpec } = await import("./lib/spec-parser.mjs");
    return addSpec(repoPath, {
      type: flags.type,
      title,
      priority: flags.priority,
      target_release: flags.targetRelease,
      body: flags.body || "",
      config
    });
  },
  list: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    config: Record<string, any> | null
  ) => {
    const { listSpecs, filterSpecs } = await import("./lib/spec-parser.mjs");
    const specs = await listSpecs(repoPath, { config });
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
  },
  decompose: async (
    repoPath: string,
    flags: Record<string, any>,
    rest: string[],
    config: Record<string, any> | null
  ) => {
    const specId = flags.id || rest[0];
    if (!specId) throw new Error("spec decompose requires --id SPEC-NNN.");

    // Fast path: caller supplied explicit feature list — skip architect entirely.
    if (flags.features || flags.featuresJson) {
      const entries = parseFeatureEntries(flags);
      const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
      const out = await decomposeSpec(repoPath, specId, entries, { config });
      for (const feat of out.created) {
        try {
          await publishFeatureViaProvider(repoPath, feat.id, config);
        } catch (e) {
          console.error(
            `[github] publish warning (spec decompose ${feat.id}): ${(e as Error).message}`
          );
        }
      }
      return out;
    }

    if (flags.noArchitect) {
      console.error(
        "[spec decompose] --no-architect is deprecated and now a no-op (see DEC-011). " +
          "Architect auto-dispatch is already removed."
      );
    }

    // No --features / --features-json supplied: refuse with clear message.
    const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
    await appendAuditLog(repoPath, {
      timestamp: new Date().toISOString(),
      agent: "devcrew:architect",
      parentCommand: "spec-decompose",
      ok: false,
      skipped: true,
      skipReason: "cli-refusal-architect-disabled",
      durationMs: 0
    });
    const msg =
      `[spec decompose] architect auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /devcrew:spec-decompose --id ${specId}, ` +
      `or pass --features 'Title 1; Title 2; ...'`;
    console.error(msg);
    process.exitCode = 1;
    return { error: "architect auto-dispatch removed; pass --features or use slash flow" };
  },
  status: async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    config: Record<string, any> | null
  ) => {
    const { specSatisfaction, reconcileSpecStatus } = await import("./lib/linkage.mjs");
    const before = await specSatisfaction(repoPath, { config });
    const reconciled = await reconcileSpecStatus(repoPath, { config });
    return { satisfaction: before, statusChanges: reconciled };
  }
};

async function runSpecSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("spec requires a subcommand: add | list | decompose | status");
  const handler = (SPEC_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown spec subcommand: ${sub}`);
  return handler(repoPath, flags, rest, config);
}

// runReleaseSubcommand removed in v0.53 — release-planner.mts deleted (FEAT-277).

// Resolves a required ID flag/positional or throws. Centralizes the
// "missing --id" error shape across slice subcommands.
function requireId(value: string | null | undefined, errMsg: string): string {
  if (!value) throw new Error(errMsg);
  return value;
}

const SLICE_HANDLERS = {
  "from-feature": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    featureId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(featureId, "slice from-feature requires --id FEAT-NNN.");
    const { sliceFromFeature } = await import("./lib/slice-linker.mjs");
    const { dispatchAgent, appendAuditLog } = await import("./lib/auto-dispatch.mjs");
    const { DecompositionRequiredError, InvalidProposedSlicesError } = await import(
      "./lib/proposed-slices.mjs"
    );
    const { AcceptanceCriteriaRequiredError, SliceAlreadyShippedError } = await import(
      "./lib/slice-linker/feature-lifecycle.mjs"
    );
    const dispatchFn = opts.dispatchFn ?? dispatchAgent;
    let out;
    try {
      out = await sliceFromFeature(repoPath, featureId, {
        noClassify: Boolean(flags.noClassify),
        dispatchFn,
        config: opts.config
      });
    } catch (err) {
      if (
        err instanceof DecompositionRequiredError ||
        err instanceof InvalidProposedSlicesError ||
        err instanceof AcceptanceCriteriaRequiredError ||
        err instanceof SliceAlreadyShippedError
      ) {
        await appendAuditLog(repoPath, {
          timestamp: new Date().toISOString(),
          parentCommand: "slice from-feature",
          featureId,
          error: (err as Error).message,
          ok: false,
          skipped: false
        });
      }
      throw err;
    }
    const slicesList = Array.isArray((out as any).slices) ? (out as any).slices : [out.slice];
    for (const sl of slicesList) {
      try {
        await publishSliceViaProvider(repoPath, sl.id, featureId, opts.config ?? null);
      } catch (e) {
        console.error(`[github] publish warning (slice from-feature): ${(e as Error).message}`);
      }
    }
    const { logEvent } = await import("./lib/telemetry.mjs");
    for (const sl of slicesList) {
      await logEvent(repoPath, {
        command: "slice from-feature",
        feature: featureId,
        slice: sl.id
      });
    }
    return out;
  },
  // FEAT-009 AC-2 (SLICE-193): CLI escape hatch to force-materialize one
  // named `proposed_slices` entry by id_suffix, so a gapped FEAT can be
  // repaired without calling BacklogStore directly.
  "force-materialize": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    featureId: string,
    opts: { config?: Record<string, any> | null } = {}
  ) => {
    requireId(featureId, "slice force-materialize requires --id FEAT-NNN.");
    const idSuffix = requireId(
      flags.idSuffix,
      "slice force-materialize requires --id-suffix -SLICE-N."
    );
    const { forceMaterializeProposedSlice } = await import(
      "./lib/slice-linker/feature-lifecycle.mjs"
    );
    const out = await forceMaterializeProposedSlice(repoPath, featureId, idSuffix, {
      config: opts.config
    });
    try {
      await publishSliceViaProvider(repoPath, out.slice.id, featureId, opts.config ?? null);
    } catch (e) {
      console.error(`[github] publish warning (slice force-materialize): ${(e as Error).message}`);
    }
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice force-materialize",
      feature: featureId,
      slice: out.slice.id
    });
    return out;
  },
  grade: async (repoPath: string, flags: Record<string, any>, _rest: string[], sliceId: string) => {
    requireId(sliceId, "slice grade requires --id SLICE-NN.");
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { createGradeFile } = await import("./lib/grade-writer.mjs");
    const out = await createGradeFile(cwd, sliceId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "slice grade", slice: sliceId, created: out.created });
    return out;
  },
  "grade-write": async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string
  ) => {
    requireId(sliceId, "slice grade-write requires --id SLICE-NN.");
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeGrade } = await import("./lib/grade-writer.mjs");
    return writeGrade(cwd, sliceId);
  },
  close: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice close requires --id SLICE-NN.");
    if (flags.noMerge && flags.dryRun) {
      throw new Error("slice close: --no-merge and --dry-run are mutually exclusive.");
    }
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { closeSlice } = await import("./lib/slice-linker.mjs");
    const out = await closeSlice(cwd, sliceId, {
      gradeYamlPath: flags.gradeYaml || null,
      keepFeatureOpen: Boolean(flags.keepFeatureOpen),
      forceClose: Boolean(flags.forceClose),
      skipValidationCheck: flags.skipValidationCheck || null,
      noDocWriter: Boolean(flags.noDocWriter),
      noMerge: Boolean(flags.noMerge),
      dryRun: Boolean(flags.dryRun),
      skipSimplify: Boolean(flags.skipSimplify),
      learningsPath: flags.learnings || null,
      learningsAgent: flags.learningsAgent || null,
      memoriesUsedPath: flags.memoriesUsed || null,
      config: opts.config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "slice close",
      slice: sliceId,
      scaffoldOnly: out.scaffoldOnly,
      gradeYamlProvided: Boolean(flags.gradeYaml)
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(cwd, sliceId);
    return out;
  },
  complete: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice complete requires --id SLICE-NN.");
    // SLICE-64: --no-merge and --dry-run are mutually exclusive
    if (flags.noMerge && flags.dryRun) {
      throw new Error("slice complete: --no-merge and --dry-run are mutually exclusive.");
    }
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { completeSlice } = await import("./lib/slice-linker.mjs");
    const out = await completeSlice(cwd, sliceId, {
      keepFeatureOpen: Boolean(flags.keepFeatureOpen),
      forceClose: Boolean(flags.forceClose),
      skipValidationCheck: flags.skipValidationCheck || null,
      noDocWriter: Boolean(flags.noDocWriter),
      // SLICE-64 additions:
      noMerge: Boolean(flags.noMerge),
      dryRun: Boolean(flags.dryRun),
      skipSimplify: Boolean(flags.skipSimplify),
      // FEAT-263 T2 / Phase 3b:
      learningsPath: flags.learnings || null,
      learningsAgent: flags.learningsAgent || null,
      memoriesUsedPath: flags.memoriesUsed || null,
      config: opts.config
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, {
      command: "slice complete",
      slice: sliceId,
      feature: (out as any).feature?.id || null,
      spec_status_changes: out.specStatusChanges?.length || 0,
      handoff_written: Boolean(out.handoff?.handoffPath),
      validation_gate_satisfied: Boolean(out.validationGate?.satisfied),
      validation_skipped_via_flag: Boolean(flags.skipValidationCheck)
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(cwd, sliceId);
    // Fire notification for slice-complete (FEAT-171 / SLICE-120)
    try {
      const { readNotifyConfig, notifyEvent } = await import("./lib/event-notifier.mjs");
      const notifyCfg = await readNotifyConfig(cwd);
      await notifyEvent(
        {
          type: "slice-complete",
          sliceId,
          featureId: (out as any).feature?.id || undefined,
          details: `${sliceId} completed`,
          timestamp: new Date().toISOString()
        },
        notifyCfg
      );
    } catch {
      // Notification must never crash the main loop
    }
    return out;
  },
  start: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice start requires --id SLICE-NN.");
    const { startSlice } = await import("./lib/slice-linker.mjs");
    const out = await startSlice(repoPath, sliceId, {
      goal: flags.goal || null,
      dispatch: flags.noDispatch !== true,
      config: opts.config ?? null
    });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice start",
      slice: sliceId,
      run_brief_written: Boolean(out.runBrief?.runBriefPath || out.runBrief?.artifactPath),
      slice_progress_written: Boolean(out.sliceProgress?.path),
      dispatch: out.dispatchInstruction ? "crew-build" : "inline"
    });
    const { flushTrajectory } = await import("./lib/trajectory-writer.mjs");
    await flushTrajectory(repoPath, sliceId);
    return out;
  },
  link: async (
    repoPath: string,
    flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    const id = requireId(flags.id || sliceId, "slice link requires --id SLICE-NN.");
    if (!flags.artifact) throw new Error("slice link requires --artifact <path>.");
    if (!flags.kind) throw new Error("slice link requires --kind reviews|validations|deployments.");
    const { linkArtifactToSlice } = await import("./lib/artifact-linkage.mjs");
    return linkArtifactToSlice(repoPath, {
      sliceId: id,
      artifactPath: flags.artifact,
      kind: flags.kind,
      config: opts.config
    });
  },
  "post-builder-fanout": async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice post-builder-fanout requires --id SLICE-NN.");
    const { buildPostBuilderFanout } = await import("./lib/post-builder-fanout.mjs");
    const result = await buildPostBuilderFanout(repoPath, sliceId, { config: opts.config ?? null });
    const { writeFanoutMarker } = await import("./lib/fanout-marker.mjs");
    await writeFanoutMarker(repoPath, sliceId, result.tasks.length); // best-effort
    return result;
  },
  plan: async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice plan requires --id SLICE-NN.");
    const { runPlanPreflight } = await import("./lib/slice-plan.mjs");
    const out = await runPlanPreflight(repoPath, sliceId, { config: opts.config ?? null });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice plan",
      slice: sliceId,
      plan_path: out.planPath,
      files_researched: out.filesResearched.length
    });
    return out;
  }
};

async function runSliceSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "slice requires a subcommand: from-feature | force-materialize | start | grade | grade-write | complete | link | review-ladder | post-builder-fanout | plan"
    );
  const handler = (SLICE_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown slice subcommand: ${sub}`);
  const id = flags.id || rest[0];
  return handler(repoPath, flags, rest, id, opts);
}

const DECISIONS_USAGE = `decisions subcommands:
  decisions list       [--repo PATH] [--status accepted|superseded|reverted]
  decisions show       --repo PATH --id DEC-NNN
  decisions relevant   --repo PATH --files "a.cs,b.cs,..."
  decisions supersede  --repo PATH --id DEC-OLD --by DEC-NEW`;

async function runDecisionsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (flags.help || !sub) {
    process.stdout.write(DECISIONS_USAGE + "\n");
    return { _suppressDefaultOutput: true };
  }
  const { listDecisions, showDecision } = await import("./lib/decisions-store.mjs");
  if (sub === "list") {
    const decisions = await listDecisions(repoPath, { status: flags.status, config });
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
    const dec = await showDecision(repoPath, decId, { config });
    if (!dec) throw new Error(`Decision not found: ${decId}`);
    return dec;
  }
  if (sub === "supersede") {
    const { supersedeDecision } = await import("./lib/decisions-store.mjs");
    if (!flags.id || !flags.by)
      throw new Error("decisions supersede requires --id DEC-OLD --by DEC-NEW");
    const out = await supersedeDecision(repoPath, { oldId: flags.id, newId: flags.by, config });
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, { command: "decisions supersede", old: flags.id, new: flags.by });
    return out;
  }
  if (sub === "relevant") {
    const { findRelevantDecisions } = await import("./lib/decisions-store.mjs");
    if (!flags.files) throw new Error('decisions relevant requires --files "a.cs,b.cs,..."');
    const files = flags.files
      .split(",")
      .map((f: string) => f.trim())
      .filter(Boolean);
    const matches = await findRelevantDecisions(repoPath, files, { config });
    return { count: matches.length, decisions: matches };
  }
  throw new Error(`Unknown decisions subcommand: ${sub}`);
}

async function runFeatureSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, featId] = positionals;
  if (!sub) throw new Error("feature requires a subcommand: simplify");
  if (sub !== "simplify") throw new Error(`Unknown feature subcommand: ${sub}`);
  if (!featId) throw new Error("feature simplify requires a feature ID: feature simplify FEAT-NNN");
  const id = (flags.id as string | null) || featId;
  const { featureSimplify } = await import("./lib/slice-linker.mjs");
  const opts: Record<string, any> = {
    skipSimplify: flags.skipSimplify as boolean,
    config
  };
  if (flags.slice) opts.sliceId = flags.slice as string;
  if (flags.since) opts.startedAt = flags.since as string;
  return featureSimplify(repoPath, id, opts);
}

async function runLearningsLog(
  repoPath: string,
  flags: Record<string, any>,
  logLearning: (r: string, e: any) => Promise<any>
) {
  if (!flags.key) throw new Error("learnings log requires --key <key>");
  if (!flags.insight) throw new Error("learnings log requires --insight <insight>");
  const entry: any = { key: flags.key, insight: flags.insight, source: "agent" };
  if (flags.confidence !== null && flags.confidence !== undefined) {
    const conf = Number(flags.confidence);
    if (!Number.isNaN(conf)) entry.confidence = conf;
  }
  if (flags.slice) entry.sliceId = flags.slice;
  return logLearning(repoPath, entry);
}

// FEAT-256-ish (ledger merge-driver hardening): learnings ids are either a
// legacy positive integer or a mintLearningId() string
// ("2026-07-10T00-28-49-710Z-d11484") — see learnings.mts. Try the legacy
// numeric shape first (unchanged CLI contract for existing callers/scripts);
// fall back to accepting the raw string for the new shape rather than
// rejecting it as "not a positive integer".
const LEARNING_ID_STRING_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z-[0-9a-f]+$/;

function parseLearningsPruneId(raw: string): number | string {
  const parsed = Number(raw);
  if (!Number.isNaN(parsed) && Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  if (LEARNING_ID_STRING_RE.test(raw.trim())) {
    return raw.trim();
  }
  throw new Error(
    "learnings prune --id must be a positive integer (legacy) or a mintLearningId string (e.g. 2026-07-10T00-28-49-710Z-d11484)"
  );
}

async function runLearningsPrune(
  repoPath: string,
  flags: Record<string, any>,
  deleteLearning: (r: string, id: number | string) => Promise<Record<string, unknown> | null>
) {
  if (flags.id === null || flags.id === undefined) {
    throw new Error("learnings prune requires --id <id>");
  }
  const parsed = parseLearningsPruneId(String(flags.id));
  const deleted = await deleteLearning(repoPath, parsed);
  return { deleted };
}

async function runLearningsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>
) {
  const [sub] = positionals;
  if (!sub)
    throw new Error("learnings requires a subcommand: log | recent | list | search | prune");
  const { logLearning, recentLearnings, searchLearnings, deleteLearning } = await import(
    "./lib/learnings.mjs"
  );
  if (sub === "log") return runLearningsLog(repoPath, flags, logLearning);
  if (sub === "recent") {
    const limit = flags.limit !== null && flags.limit !== undefined ? Number(flags.limit) : 3;
    return recentLearnings(repoPath, limit);
  }
  if (sub === "list") {
    const limit =
      flags.limit !== null && flags.limit !== undefined
        ? Number(flags.limit)
        : Number.MAX_SAFE_INTEGER;
    return recentLearnings(repoPath, limit);
  }
  if (sub === "search") {
    const query = positionals[1];
    if (!query || !query.trim()) throw new Error("learnings search requires a query string");
    return searchLearnings(repoPath, query);
  }
  if (sub === "prune") return runLearningsPrune(repoPath, flags, deleteLearning);
  throw new Error(`Unknown learnings subcommand: ${sub}`);
}

/**
 * `loop lessons rank [--query <text>] [--limit N] [--json]`
 * Reads learnings.jsonl, ranks entries by decay+utility, prints JSON array.
 * Exits 0 and prints [] when the store is absent or empty.
 */
async function runLessonsRankSubcommand(
  repoPath: string,
  flags: Record<string, any>
): Promise<{ _suppressDefaultOutput: true }> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const { rankLearnings } = await import("./lib/learnings-ranker.mjs");

  const storeFile = path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl");

  let raw: string;
  try {
    raw = await fs.readFile(storeFile, "utf8");
  } catch {
    process.stdout.write("[]\n");
    return { _suppressDefaultOutput: true };
  }

  const allEntries: any[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") allEntries.push(parsed);
    } catch {
      // skip malformed lines
    }
  }

  if (allEntries.length === 0) {
    process.stdout.write("[]\n");
    return { _suppressDefaultOutput: true };
  }

  const limitRaw =
    flags.limit !== null && flags.limit !== undefined ? Number(flags.limit) : undefined;
  const limit = limitRaw !== undefined && !Number.isNaN(limitRaw) ? limitRaw : undefined;

  const query: string | undefined =
    flags.query !== null && flags.query !== undefined ? String(flags.query) : undefined;

  // Rank ALL entries first, then cap to --limit (not before — pre-slicing by insertion order
  // would return the first N entries rather than the top N by decay+utility score).
  const rankedAll = rankLearnings(allEntries, {
    ...(query !== undefined ? { query } : {}),
    nowMs: Date.now()
  });
  const ranked = limit !== undefined ? rankedAll.slice(0, limit) : rankedAll;

  process.stdout.write(JSON.stringify(ranked, null, 2) + "\n");
  return { _suppressDefaultOutput: true };
}

// "setup" bootstraps github.enabled itself (writes loop.json, bulk-sets
// phases) — it must run before any provider would resolve to GithubProvider,
// so it always targets GithubProvider directly rather than going through
// getProvider()'s taskStore.provider/github.enabled gate. Matches the
// pre-migration behavior, which never gated setup on config at all.
async function runGithubSetup(repoPath: string, config: Record<string, any> | null) {
  const { GithubProvider } = await import("./lib/task-store/index.mjs");
  const provider = new GithubProvider(repoPath, config ?? {});
  const result = await provider.setup();
  console.log("[github-sync] Setup complete. Run 'github publish' next.");
  return result;
}

async function runGithubPublish(provider: any, GithubProvider: any) {
  if (!(provider instanceof GithubProvider)) return { milestones: 0, issues: 0, subissues: 0 };
  return provider.publishAll();
}

async function runGithubFeatPublish(
  provider: any,
  GithubProvider: any,
  positionals: any,
  flags: any
) {
  const featId = flags?.id || positionals[1];
  if (!featId) throw new Error("github feat-publish requires --id FEAT-NNN.");
  const result =
    provider instanceof GithubProvider ? await provider.publishFeatureById(featId) : null;
  if (!result) {
    console.log("[github-sync] GitHub sync disabled — skipped.");
    return { skipped: true };
  }
  console.log(
    result.created
      ? `Published: #${result.issueNum} ${result.url}`
      : `Already published: #${result.issueNum}`
  );
  return result;
}

async function runGithubStatus(provider: any, GithubProvider: any) {
  if (!(provider instanceof GithubProvider)) return { milestones: 0, updated: 0, closed: 0 };
  return provider.syncMilestones();
}

async function runGithubSyncOrBootstrap(provider: any, repoPath: string, sub: string) {
  console.log(`[task-store] provider: ${provider.constructor.name}`);
  return sub === "sync" ? provider.syncPull(repoPath) : provider.bootstrap(repoPath);
}

// Advisory, read-only cross-check (Phase 4.5 of the tracker-provider plan) —
// reports drift between the configured tracker and the local backlog without
// ever writing to either side. Only GithubProvider implements a sync engine
// today (Linear's syncPull is an intentional COND-C descope for v1); any
// other resolved provider degrades to a clear "not supported" result instead
// of throwing, matching runGithubStatus/runGithubPublish's existing
// `instanceof GithubProvider` gate above.
async function runGithubDrift(provider: any, GithubProvider: any, repoPath: string) {
  console.log(`[task-store] provider: ${provider.constructor.name}`);
  if (!(provider instanceof GithubProvider)) {
    const reason = `drift check not supported for provider "${provider.constructor.name}"`;
    console.log(`[task-store] ${reason} — no sync engine for this provider yet. No changes made.`);
    return {
      supported: false,
      reason,
      checked: 0,
      trackerOnly: [],
      localOnly: [],
      statusMismatches: [],
      bodyDrift: []
    };
  }

  const report = await provider.checkDrift(repoPath);
  if (!report.supported) {
    console.log(`[task-store] drift check skipped — ${report.reason}`);
    return report;
  }
  console.log(
    `[task-store] drift: ${report.checked} linked, ${report.trackerOnly.length} tracker-only, ` +
      `${report.localOnly.length} local-only, ${report.statusMismatches.length} status mismatches, ` +
      `${report.bodyDrift.length} body diffs. Read-only — no local or tracker writes made.`
  );
  return report;
}

// Prints the reconcile plan summary — split out of runGithubReconcile purely
// to keep that function's cognitive complexity within the repo's biome cap;
// no behavior lives here beyond formatting.
function logReconcilePlan(plan: any): void {
  console.log(
    `[task-store] reconcile plan: ${plan.close.length} to close, ${plan.publish.length} to publish, ` +
      `${plan.skippedPublish.length} publish-skipped, ${plan.trackerOnly.length} tracker-only ` +
      "(report-only, never touched)" +
      (plan.otherStatusMismatches.length
        ? `, ${plan.otherStatusMismatches.length} other-direction mismatch(es) (out of scope, not touched)`
        : "")
  );
  for (const c of plan.close as any[]) {
    console.log(
      `  close        #${c.number}  ${c.id}${c.completedAt ? ` (done ${c.completedAt})` : ""}` +
        (c.slices.length ? ` slices=${c.slices.join(",")}` : "")
    );
  }
  for (const p of plan.publish as any[]) {
    console.log(`  publish       ${p.id}  "${p.title}" (status=${p.status})`);
  }
  for (const s of plan.skippedPublish as any[]) {
    console.log(`  skip-publish  ${s.id}  — ${s.reason}`);
  }
  if (plan.trackerOnly.length) {
    const sample = (plan.trackerOnly as any[])
      .slice(0, 5)
      .map((t) => `#${t.number} ${t.title}`)
      .join(" | ");
    console.log(
      `  tracker-only: ${plan.trackerOnly.length} issue(s), never acted on. Sample: ${sample}`
    );
  }
}

// Resolves the reconcile CLI flags into buildReconcilePlan's options shape.
// Split out of runGithubReconcile alongside logReconcilePlan for the same
// cognitive-complexity reason.
function resolveReconcileOpts(flags: any) {
  const limitRaw = Number(flags.limit ?? Number.NaN);
  const limit = Number.isFinite(limitRaw) ? limitRaw : null;
  return {
    includeClose: !flags.noClose,
    includePublish: !flags.noPublish,
    limit,
    apply: Boolean(flags.apply)
  };
}

// `loop github reconcile` (runner#427) — the one-time (and re-runnable)
// backlog cleanup for drift `checkSyncDrift` (#485) can detect but never
// acts on. Reuses checkDrift as the sole detector (never reimplements drift
// detection) and reuses TaskStoreProvider's closeSlice/postSliceComment/
// publishFeature for every write — zero hand-rolled `gh` calls. Dry-run is
// the default; --apply is required to write anything. See
// tracker-reconcile.mts for the plan-building + apply logic.
async function runGithubReconcile(
  provider: any,
  GithubProvider: any,
  repoPath: string,
  config: Record<string, any> | null,
  flags: any
) {
  console.log(`[task-store] provider: ${provider.constructor.name}`);
  const unsupported = {
    supported: false,
    reason: "",
    applied: false,
    close: [],
    publish: [],
    skippedPublish: [],
    trackerOnly: [],
    otherStatusMismatches: []
  };
  if (!(provider instanceof GithubProvider)) {
    unsupported.reason = `reconcile not supported for provider "${provider.constructor.name}"`;
    console.log(
      `[task-store] ${unsupported.reason} — no sync engine for this provider yet. No changes made.`
    );
    return unsupported;
  }

  const report = await provider.checkDrift(repoPath);
  if (!report.supported) {
    unsupported.reason = report.reason;
    console.log(`[task-store] reconcile skipped — ${report.reason}`);
    return unsupported;
  }

  if (flags.dryRun && flags.apply) {
    throw new Error("github reconcile: --dry-run and --apply are mutually exclusive.");
  }

  const { buildReconcilePlan, applyReconcilePlan } = await import(
    "./lib/task-store/tracker-reconcile.mjs"
  );
  const { includeClose, includePublish, limit, apply } = resolveReconcileOpts(flags);

  const plan = await buildReconcilePlan(repoPath, config, report, {
    includeClose,
    includePublish,
    limit
  });
  logReconcilePlan(plan);

  if (!apply) {
    console.log(
      "[task-store] dry-run (default) — no writes made. Re-run with --apply to execute this plan."
    );
    return { ...plan, applied: false };
  }

  const findMergedPr = (id: string) => provider.findMergedPrForId(id);
  const result = await applyReconcilePlan(provider, plan, { findMergedPr });
  const closedOk = result.closed.filter((r: any) => r.ok).length;
  const publishedOk = result.published.filter((r: any) => r.ok).length;
  console.log(
    `[task-store] reconcile applied: closed ${closedOk}/${plan.close.length}, ` +
      `published ${publishedOk}/${plan.publish.length}.`
  );
  return { ...plan, applied: true, result };
}

export async function runGithubSubcommand(
  repoPath: any,
  positionals: any,
  flags: any,
  config: Record<string, any> | null = null
) {
  const [sub] = positionals;
  if (sub === "setup") return runGithubSetup(repoPath, config);

  const { getProvider, GithubProvider } = await import("./lib/task-store/index.mjs");
  const provider = getProvider(config, repoPath);

  if (sub === "publish") return runGithubPublish(provider, GithubProvider);
  if (sub === "feat-publish")
    return runGithubFeatPublish(provider, GithubProvider, positionals, flags);
  if (sub === "status") return runGithubStatus(provider, GithubProvider);
  if (sub === "sync" || sub === "bootstrap")
    return runGithubSyncOrBootstrap(provider, repoPath, sub);
  if (sub === "drift") return runGithubDrift(provider, GithubProvider, repoPath);
  if (sub === "reconcile")
    return runGithubReconcile(provider, GithubProvider, repoPath, config, flags);

  throw new Error(
    "github requires a subcommand: setup | publish | feat-publish | sync | status | bootstrap | drift | reconcile"
  );
}

main().catch((error) => {
  console.error(error.message);
  // FEAT-025: grade-write's "grade template unfilled" rejection (an
  // unreplaced <fill ...> scaffold token or an all-zero score block) is a
  // distinct, scriptable failure mode from a generic CLI error — exit 2
  // so callers (loop/CI) can tell "needs a real grade" apart from "crashed".
  process.exitCode = error?.code === "GRADE_TEMPLATE_UNFILLED" ? 2 : 1;
});
