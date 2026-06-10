#!/usr/bin/env node

import path from "node:path";
import { clearFrontmatterCache } from "./lib/frontmatter-cache.mjs";
import { resolveSkills } from "./lib/skill-resolver.mjs";

// CLI for the loop plugin. Mirrors scripts/crew.mjs argument-parsing
// conventions (--repo, --, MSYS path normalization) so the two plugins behave
// the same way at the command line.

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

// Flag schema. See hero-crew/scripts/crew.mjs for the same pattern.
const FLAG_SPEC = {
  "--help": { key: "help", boolean: true },
  "-h": { key: "help", boolean: true },
  "--repo": { key: "repo" },
  "--preset": { key: "preset" },
  "--variant": { key: "variant" },
  "--override": { key: "override" },
  "--strict": { key: "strict", boolean: true },
  "--phase": { key: "phase" },
  "--note": { key: "note" },
  "--status": { key: "status" },
  "--priority": { key: "priority" },
  "--category": { key: "category" },
  "--target-release": { key: "targetRelease" },
  "--type": { key: "type" },
  "--title": { key: "title" },
  "--id": { key: "id" },
  "--body": { key: "body" },
  "--features": { key: "features" },
  "--goal": { key: "goal" },
  "--no-dispatch": { key: "noDispatch", boolean: true },
  "--no-research": { key: "noResearch", boolean: true },
  "--no-architect": { key: "noArchitect", boolean: true },
  "--no-doc-writer": { key: "noDocWriter", boolean: true },
  "--no-classify": { key: "noClassify", boolean: true },
  "--keep-feature-open": { key: "keepFeatureOpen", boolean: true },
  "--force-close": { key: "forceClose", boolean: true },
  "--skip-validation-check": { key: "skipValidationCheck" },
  "--version": { key: "version" },
  "--since": { key: "since" },
  "--span-days": { key: "spanDays" },
  "--until": { key: "until" },
  "--by": { key: "by" },
  "--artifact": { key: "artifact" },
  "--kind": { key: "kind" },
  "--files": { key: "files" },
  "--features-json": { key: "featuresJson" },
  "--key": { key: "key" },
  "--insight": { key: "insight" },
  "--confidence": { key: "confidence" },
  "--slice": { key: "slice" },
  "--limit": { key: "limit" },
  "--max-features": { key: "maxFeatures" },
  "--dry-run": { key: "dryRun", boolean: true },
  "--auto-mode": { key: "autoMode", boolean: true },
  "--provider": { key: "provider" },
  "--pr": { key: "pr" },
  "--scores": { key: "scores" },
  "--autonomous-safe": { key: "autonomousSafe" },
  "--evidence": { key: "evidence" },
  "--reasoning": { key: "reasoning" },
  "--allow-cross-session": { key: "allowCrossSession", boolean: true },
  "--explain-halts": { key: "explainHalts", boolean: true },
  "--worktree": { key: "worktree" },
  // SLICE-64: auto-merge flags
  "--no-merge": { key: "noMerge", boolean: true },
  "--skip-simplify": { key: "skipSimplify", boolean: true },
  // doctor flags
  "--check": { key: "check", boolean: true },
  "--fix": { key: "fix", boolean: true }
};

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags: Record<string, any> = {
    repo: process.cwd(),
    preset: null,
    variant: null,
    override: null,
    strict: false,
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
    featuresJson: null,
    keepFeatureOpen: false,
    skipValidationCheck: null,
    key: null,
    insight: null,
    confidence: null,
    slice: null,
    limit: null,
    maxFeatures: null,
    dryRun: false,
    autoMode: false,
    provider: null,
    pr: null,
    noResearch: false,
    noArchitect: false,
    noDocWriter: false,
    noClassify: false,
    scores: null,
    autonomousSafe: null,
    evidence: null,
    reasoning: null,
    allowCrossSession: false,
    worktree: null,
    explainHalts: false,
    noMerge: false,
    skipSimplify: false,
    check: false,
    fix: false
  };
  const positionals: any[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]!;
    if (value === "--") {
      for (let tail = index + 1; tail < rest.length; tail += 1) {
        positionals.push(rest[tail]);
      }
      break;
    }
    const spec = FLAG_SPEC[value as keyof typeof FLAG_SPEC];
    if (spec) {
      if ("boolean" in spec && spec.boolean) {
        (flags as Record<string, any>)[spec.key] = true;
      } else {
        (flags as Record<string, any>)[spec.key] = rest[index + 1];
        index += 1;
      }
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
    "  node scripts/loop.mjs install --repo <path> [--preset <name>]",
    "  node scripts/loop.mjs phase-gate --repo <path> [--phase <N>] [--note <text>]",
    "  node scripts/loop.mjs status --repo <path>",
    "  node scripts/loop.mjs list-presets",
    "  node scripts/loop.mjs doctor --repo <path> [--check|--fix]",
    "  node scripts/loop.mjs dispatch <subcommand> [args...]   (see: dispatch --help)",
    "",
    "Hard dependency: the `crew` plugin must be installed. Phase-gate writes its",
    "artifact through `crew write-validation-result`."
  ].join("\n");
}

// Command registry. Each handler returns the result that gets JSON-stringified
// to stdout. Lazy imports stay per-handler to keep start-up cheap when a user
// only invokes one command.
const COMMANDS = {
  install: async ({ repoPath, flags }: CmdCtx) => {
    const { installLoop } = await import("./lib/loop-installer.mjs");
    return installLoop(repoPath, { preset: flags.preset });
  },
  "phase-gate": async ({ repoPath, flags, config }: CmdCtx) => {
    const { runPhaseGate } = await import("./lib/phase-gate.mjs");
    return runPhaseGate(repoPath, { phase: flags.phase, note: flags.note, config });
  },
  status: async ({ repoPath }: CmdCtx) => {
    const { reportStatus } = await import("./lib/loop-installer.mjs");
    return reportStatus(repoPath);
  },
  "list-presets": async () => {
    const { listPresets } = await import("./lib/config-resolver.mjs");
    return { presets: await listPresets() };
  },
  github: ({ repoPath, flags, positionals }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags),
  "task-store": ({ repoPath, flags, positionals }: CmdCtx) =>
    runGithubSubcommand(repoPath, positionals, flags),
  backlog: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runBacklogSubcommand(repoPath, positionals, flags, config),
  spec: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSpecSubcommand(repoPath, positionals, flags, config),
  release: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runReleaseSubcommand(repoPath, positionals, flags, config),
  slice: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runSliceSubcommand(repoPath, positionals, flags, { config }),
  feature: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runFeatureSubcommand(repoPath, positionals, flags, config),
  decisions: ({ repoPath, flags, positionals, config }: CmdCtx) =>
    runDecisionsSubcommand(repoPath, positionals, flags, config),
  retrospective: async ({ repoPath, flags }: CmdCtx) => {
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
    return result;
  },
  brief: async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
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
  "snapshot-memory": async ({ repoPath, flags }: CmdCtx) => {
    const { resolveEffectiveCwd } = await import("./lib/effective-cwd.mjs");
    const { cwd } = await resolveEffectiveCwd({ repoPath, worktreeOverride: flags.worktree });
    const { writeMemorySnapshot } = await import("./lib/memory-snapshot.mjs");
    const result = await writeMemorySnapshot(cwd);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(cwd, { command: "snapshot-memory", grades: result.counts.grades });
    return result;
  },
  lessons: async ({ repoPath, positionals }: CmdCtx) => {
    const [sub] = positionals;
    if (sub !== "recent") throw new Error("lessons requires subcommand: recent");
    const { recentLessons } = await import("./lib/lessons-feed.mjs");
    const limit = positionals[1] ? Number(positionals[1]) : 5;
    return recentLessons(repoPath, { limit });
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
    return checkStopConditions(cwd, { config });
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
  "pr-fix": async ({ repoPath, flags }: CmdCtx) => {
    const { runPrFix } = await import("./lib/pr-fixer.mjs");
    const prNumber = flags.pr;
    if (!prNumber) throw new Error("pr-fix requires --pr <number>");
    const priorAttempts = flags.body ? JSON.parse(flags.body) : {};
    return runPrFix(repoPath, prNumber, { priorAttempts });
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

  const dispatchInstruction = [
    `## Two-Model Split Dispatch`,
    ``,
    `**Architect Model (Research/Plan):** ${architectModel}`,
    `**Editor Model (Implementation):** ${editorModel}`,
    ``,
    `The architect model has completed the codebase research pre-flight.`,
    `Plan artifact written to: ${planResult.planPath}`,
    ``,
    `Dispatch \`crew:builder\` subagent for the editor phase, which will use the ${editorModel} model for implementation. After it returns, dispatch \`crew:reviewer\` (and \`crew:validator\` if behavior changed) before closing the slice.`,
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

function runResolveSkillsCommand(flags: Record<string, any>): void {
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

async function main() {
  // Short-circuit `dispatch` before parseArgs — its flags (--plan, --parent-branch,
  // --depth, --dry-run, --json, --run-id, --config) are not registered in
  // FLAG_SPEC, and the parser would throw on them. Forward all remaining argv
  // verbatim to scripts/dispatch.mjs as a child process.
  const rawArgv = process.argv.slice(2);
  if (rawArgv[0] === "dispatch") {
    const { spawnSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const thisFile = fileURLToPath(import.meta.url);
    const dispatchCli = path.join(path.dirname(thisFile), "dispatch.mjs");
    const result = spawnSync("node", [dispatchCli, ...rawArgv.slice(1)], {
      stdio: "inherit"
    });
    process.exitCode = result.status ?? 1;
    return;
  }

  const { command, flags, positionals } = parseArgs(rawArgv);
  const repoPath = path.resolve(normalizeMsysPath(flags.repo));

  if (command === "help") {
    console.log(usage());
    return;
  }

  if (command === "resolve-skills") {
    runResolveSkillsCommand(flags);
    clearFrontmatterCache();
    return;
  }

  clearFrontmatterCache(); // ensure cold start for each invocation

  // Resolve config once at dispatcher level and pass to all handlers
  const { resolveConfig } = await import("./lib/config-resolver.mjs");
  const config = await resolveConfig(repoPath);

  const handler = (COMMANDS as Record<string, (ctx: CmdCtx) => Promise<unknown>>)[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
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

async function resolveBacklogAddBody(
  repoPath: string,
  _title: string,
  suppliedBody: string | null | undefined
): Promise<string> {
  if (suppliedBody) return suppliedBody;
  const { appendAuditLog } = await import("./lib/auto-dispatch.mjs");
  await appendAuditLog(repoPath, {
    timestamp: new Date().toISOString(),
    agent: "loop:researcher",
    parentCommand: "backlog-add",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal-researcher-disabled",
    durationMs: 0
  });
  console.error(
    "[backlog add] researcher auto-dispatch removed (see DEC-011). " +
      "Creating FEAT with empty body — run /loop:backlog-add for researcher enrichment, " +
      "or pass --body explicitly."
  );
  return "";
}

async function runBacklogListPendingIds(repoPath: string) {
  const { listPendingFeatureIds } = await import("./lib/backlog-list-ids.mjs");
  const ids = await listPendingFeatureIds(repoPath);
  return { ids };
}

async function runBacklogAdd(
  repoPath: string,
  flags: Record<string, any>,
  rest: string[],
  config: Record<string, any> | null
) {
  const title = flags.title || rest.join(" ");
  if (!title) throw new Error("backlog add requires a title (positional or --title).");
  if (flags.noResearch) {
    console.error(
      "[backlog add] --no-research is deprecated and now a no-op (see DEC-011). " +
        "Researcher auto-dispatch is already removed."
    );
  }
  const resolvedBody = await resolveBacklogAddBody(repoPath, title, flags.body);
  const { addFeature } = await import("./lib/backlog-writer.mjs");
  const result = await addFeature(repoPath, {
    title,
    priority: flags.priority,
    category: flags.category,
    target_release: flags.targetRelease,
    body: resolvedBody,
    config
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { publishFeat } = await import("./lib/github-sync.mjs");
  await (publishFeat as any)(repoPath, result.id);
  return result;
}

async function runBacklogPmWrite(repoPath: string, flags: Record<string, any>, rest: string[]) {
  const featureId = flags.id || rest[0];
  if (!featureId) throw new Error("backlog pm-write requires --id FEAT-NNN.");
  if (!flags.scores) throw new Error("backlog pm-write requires --scores '{...}'.");
  const { parseJsonFlag } = await import("./lib/json-flag.mjs");
  const parsedScores: Record<string, number> = parseJsonFlag(flags.scores, "scores");
  const priority = flags.priority ?? null;
  const autonomousSafe =
    flags.autonomousSafe === "true"
      ? true
      : flags.autonomousSafe === "false"
        ? false
        : Boolean(flags.autonomousSafe);
  const triageNotes: string | undefined = flags.reasoning ?? flags.evidence ?? undefined;
  const { writePmScores } = await import("./lib/backlog-pm-write.mjs");
  return writePmScores(repoPath, {
    id: featureId,
    scores: parsedScores as any,
    priority,
    autonomousSafe,
    ...(triageNotes !== undefined ? { triageNotes } : {})
  });
}

function isUnclassifiedEntry(entry: Record<string, any>): boolean {
  const fm = entry.frontmatter;
  const tagsEmpty = !Array.isArray(fm.tags) || fm.tags.length === 0;
  const tagsNull = fm.tags == null || fm.tags === "";
  const noTags = tagsEmpty && tagsNull;
  return noTags && fm.needs_contract == null && fm.needs_ux == null;
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
    agent: "loop:architect",
    parentCommand: "backlog enrich",
    ok: false,
    skipped: true,
    skipReason: "cli-refusal",
    durationMs: 0
  });
  console.error(
    `[backlog enrich] CLI auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /loop:backlog-enrich. ` +
      `${needsClassify.length} feature(s) need classification.`
  );
  process.exitCode = 1;
  return { enriched: 0, alreadyTagged, failed: 0, refused: true };
}

async function runBacklogSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub)
    throw new Error(
      "backlog requires a subcommand: add | list | list-pending-ids | triage | promote"
    );
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
    const { triagePending } = await import("./lib/backlog-triage.mjs");
    const results = await triagePending(repoPath);
    return { triaged: results.length, results };
  }
  if (sub === "list-pending-ids") {
    return runBacklogListPendingIds(repoPath);
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
  if (sub === "pm-write") {
    return runBacklogPmWrite(repoPath, flags, rest);
  }
  if (sub === "enrich") {
    return runBacklogEnrich(repoPath, flags);
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

export { parseClassifyOutput } from "./lib/classify-parser.mjs";

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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { publishFeat } = await import("./lib/github-sync.mjs");
      for (const feat of out.created) {
        await (publishFeat as any)(repoPath, feat.id);
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
      agent: "loop:architect",
      parentCommand: "spec-decompose",
      ok: false,
      skipped: true,
      skipReason: "cli-refusal-architect-disabled",
      durationMs: 0
    });
    const msg =
      `[spec decompose] architect auto-dispatch removed (see DEC-011). ` +
      `Use the slash flow: /loop:spec-decompose --id ${specId}, ` +
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

async function runReleaseSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub] = positionals;
  if (!sub) throw new Error("release requires a subcommand: plan | status");
  const { planRelease, releaseStatus } = await import("./lib/release-planner.mjs");
  if (sub === "plan") {
    if (!flags.version) throw new Error("release plan requires --version vX.Y.Z");
    return await planRelease(repoPath, { version: flags.version, config });
  }
  if (sub === "status") {
    if (!flags.version) throw new Error("release status requires --version vX.Y.Z");
    return await releaseStatus(repoPath, { version: flags.version, config });
  }
  throw new Error(`Unknown release subcommand: ${sub}`);
}

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
    const { dispatchAgent } = await import("./lib/auto-dispatch.mjs");
    const dispatchFn = opts.dispatchFn ?? dispatchAgent;
    const out = await sliceFromFeature(repoPath, featureId, {
      noClassify: Boolean(flags.noClassify),
      dispatchFn,
      config: opts.config
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { publishSlice } = await import("./lib/github-sync.mjs");
    await (publishSlice as any)(repoPath, out.slice.id, featureId);
    const { logEvent } = await import("./lib/telemetry.mjs");
    await logEvent(repoPath, {
      command: "slice from-feature",
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
  "review-ladder": async (
    repoPath: string,
    _flags: Record<string, any>,
    _rest: string[],
    sliceId: string,
    opts: { dispatchFn?: DispatchFn; config?: Record<string, any> | null } = {}
  ) => {
    requireId(sliceId, "slice review-ladder requires --id SLICE-NN.");
    const { buildReviewLadder } = await import("./lib/reviewer-ladder.mjs");
    return buildReviewLadder(repoPath, sliceId, { config: opts.config ?? null });
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
      "slice requires a subcommand: from-feature | start | grade | grade-write | complete | link | review-ladder | plan"
    );
  const handler = (SLICE_HANDLERS as Record<string, (...args: any[]) => any>)[sub];
  if (!handler) throw new Error(`Unknown slice subcommand: ${sub}`);
  const id = flags.id || rest[0];
  return handler(repoPath, flags, rest, id, opts);
}

async function runDecisionsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>,
  config: Record<string, any> | null
) {
  const [sub, ...rest] = positionals;
  if (!sub) throw new Error("decisions requires a subcommand: list | show");
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
  const { featureSimplify } = await import("./lib/slice-linker/feature-lifecycle.mjs");
  const opts: Record<string, any> = {
    skipSimplify: flags.skipSimplify as boolean,
    config
  };
  if (flags.slice) opts.sliceId = flags.slice as string;
  if (flags.since) opts.startedAt = flags.since as string;
  return featureSimplify(repoPath, id, opts);
}

async function runLearningsSubcommand(
  repoPath: string,
  positionals: string[],
  flags: Record<string, any>
) {
  const [sub] = positionals;
  if (!sub) throw new Error("learnings requires a subcommand: log | recent");
  const { logLearning, recentLearnings } = await import("./lib/learnings.mjs");
  if (sub === "log") {
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
  if (sub === "recent") {
    const limit = flags.limit !== null && flags.limit !== undefined ? Number(flags.limit) : 3;
    return recentLearnings(repoPath, limit);
  }
  throw new Error(`Unknown learnings subcommand: ${sub}`);
}

async function runGithubSubcommand(repoPath: any, positionals: any, flags: any) {
  const [sub] = positionals;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — github-sync.mjs has no TypeScript source; exists at runtime
  const { publishAll, publishFeat, syncMilestones, setupGithubSync } =
    await import("./lib/github-sync.mjs");
  if (sub === "setup") {
    const result = await (setupGithubSync as any)(repoPath);
    console.log("[github-sync] Setup complete. Run 'github publish' next.");
    return result;
  }
  if (sub === "publish") return (publishAll as any)(repoPath);
  if (sub === "feat-publish") {
    const featId = flags?.id || positionals[1];
    if (!featId) throw new Error("github feat-publish requires --id FEAT-NNN.");
    const result = await (publishFeat as any)(repoPath, featId);
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
  if (sub === "status") return (syncMilestones as any)(repoPath);
  if (sub === "sync" || sub === "bootstrap") {
    const { resolveConfig } = await import("./lib/config-resolver.mjs");
    const { getProvider } = await import("./lib/task-store/index.mjs");
    const config = await resolveConfig(repoPath);
    const provider = getProvider(config, repoPath);
    console.log(`[task-store] provider: ${provider.constructor.name}`);
    return sub === "sync" ? provider.syncPull(repoPath) : provider.bootstrap(repoPath);
  }
  throw new Error(
    "github requires a subcommand: setup | publish | feat-publish | sync | status | bootstrap"
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
