#!/usr/bin/env node
import path from "node:path";
// CLI for the loop plugin. Mirrors scripts/crew.mjs argument-parsing
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
// Flag schema. See hero-crew/scripts/crew.mjs for the same pattern.
const FLAG_SPEC = {
    "--help": { key: "help", boolean: true },
    "-h": { key: "help", boolean: true },
    "--repo": { key: "repo" },
    "--preset": { key: "preset" },
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
    "--pr": { key: "pr" }
};
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
        noDocWriter: false
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
        const spec = FLAG_SPEC[value];
        if (spec) {
            if (spec.boolean) {
                flags[spec.key] = true;
            }
            else {
                flags[spec.key] = rest[index + 1];
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
function usage() {
    return [
        "loop CLI",
        "",
        "Usage:",
        "  node scripts/loop.mjs install --repo <path> [--preset <name>]",
        "  node scripts/loop.mjs phase-gate --repo <path> [--phase <N>] [--note <text>]",
        "  node scripts/loop.mjs status --repo <path>",
        "  node scripts/loop.mjs list-presets",
        "",
        "Hard dependency: the `crew` plugin must be installed. Phase-gate writes its",
        "artifact through `crew write-validation-result`."
    ].join("\n");
}
// Command registry. Each handler returns the result that gets JSON-stringified
// to stdout. Lazy imports stay per-handler to keep start-up cheap when a user
// only invokes one command.
const COMMANDS = {
    install: async ({ repoPath, flags }) => {
        const { installLoop } = await import("./lib/loop-installer.mjs");
        return installLoop(repoPath, { preset: flags.preset });
    },
    "phase-gate": async ({ repoPath, flags }) => {
        const { runPhaseGate } = await import("./lib/phase-gate.mjs");
        return runPhaseGate(repoPath, { phase: flags.phase, note: flags.note });
    },
    status: async ({ repoPath }) => {
        const { reportStatus } = await import("./lib/loop-installer.mjs");
        return reportStatus(repoPath);
    },
    "list-presets": async () => {
        const { listPresets } = await import("./lib/config-resolver.mjs");
        return { presets: await listPresets() };
    },
    github: ({ repoPath, flags, positionals }) => runGithubSubcommand(repoPath, positionals, flags),
    "task-store": ({ repoPath, flags, positionals }) => runGithubSubcommand(repoPath, positionals, flags),
    backlog: ({ repoPath, flags, positionals }) => runBacklogSubcommand(repoPath, positionals, flags),
    spec: ({ repoPath, flags, positionals }) => runSpecSubcommand(repoPath, positionals, flags),
    release: ({ repoPath, flags, positionals }) => runReleaseSubcommand(repoPath, positionals, flags),
    slice: ({ repoPath, flags, positionals }) => runSliceSubcommand(repoPath, positionals, flags),
    decisions: ({ repoPath, flags, positionals }) => runDecisionsSubcommand(repoPath, positionals, flags),
    retrospective: async ({ repoPath, flags }) => {
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
    brief: async ({ repoPath }) => {
        const { buildBrief } = await import("./lib/brief.mjs");
        return buildBrief(repoPath);
    },
    "snapshot-memory": async ({ repoPath }) => {
        const { writeMemorySnapshot } = await import("./lib/memory-snapshot.mjs");
        const result = await writeMemorySnapshot(repoPath);
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, { command: "snapshot-memory", grades: result.counts.grades });
        return result;
    },
    lessons: async ({ repoPath, positionals }) => {
        const [sub] = positionals;
        if (sub !== "recent")
            throw new Error("lessons requires subcommand: recent");
        const { recentLessons } = await import("./lib/lessons-feed.mjs");
        const limit = positionals[1] ? Number(positionals[1]) : 5;
        return recentLessons(repoPath, { limit });
    },
    "sync-claims": async ({ repoPath }) => {
        const { syncClaims } = await import("./lib/claims-sync.mjs");
        const result = await syncClaims(repoPath);
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, { command: "sync-claims", actions: result.actions.length });
        return result;
    },
    "stop-check": async ({ repoPath }) => {
        const { checkStopConditions } = await import("./lib/stop-conditions.mjs");
        const { resolveConfig } = await import("./lib/config-resolver.mjs");
        const config = await resolveConfig(repoPath);
        return checkStopConditions(repoPath, { config });
    },
    auto: async ({ repoPath, flags }) => {
        const { runAutoWalker } = await import("./lib/auto-walker.mjs");
        const { resolveConfig } = await import("./lib/config-resolver.mjs");
        const config = await resolveConfig(repoPath);
        return runAutoWalker(repoPath, {
            maxFeatures: flags.maxFeatures ? Number(flags.maxFeatures) : undefined,
            dryRun: Boolean(flags.dryRun),
            autoMode: Boolean(flags.autoMode),
            config
        });
    },
    learnings: ({ repoPath, flags, positionals }) => runLearningsSubcommand(repoPath, positionals, flags),
    architect: async ({ repoPath, flags }) => runArchitectSubcommand(repoPath, flags),
    trajectory: async ({ repoPath, flags }) => {
        const { readTrajectory, trajectoryPath } = await import("./lib/trajectory-writer.mjs");
        const sliceId = flags.id;
        if (!sliceId)
            throw new Error("trajectory requires --id SLICE-NN");
        const steps = await readTrajectory(repoPath, sliceId);
        return { sliceId, steps, count: steps.length, path: trajectoryPath(repoPath, sliceId) };
    },
    "pr-fix": async ({ repoPath, flags }) => {
        const { runPrFix } = await import("./lib/pr-fixer.mjs");
        const prNumber = flags.pr;
        if (!prNumber)
            throw new Error("pr-fix requires --pr <number>");
        const priorAttempts = flags.body ? JSON.parse(flags.body) : {};
        return runPrFix(repoPath, prNumber, { priorAttempts });
    }
};
async function runArchitectSubcommand(repoPath, flags) {
    const sliceId = flags.id;
    if (!sliceId)
        throw new Error("architect requires --id SLICE-NN");
    const { resolveConfig } = await import("./lib/config-resolver.mjs");
    const { resolveArchitectModels } = await import("./lib/model-router.mjs");
    const { runPlanPreflight } = await import("./lib/slice-plan.mjs");
    const config = await resolveConfig(repoPath);
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
        `Dispatch \`/crew:build\` for the editor phase, which will use the ${editorModel} model for implementation.`,
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
async function main() {
    const { command, flags, positionals } = parseArgs(process.argv.slice(2));
    const repoPath = path.resolve(normalizeMsysPath(flags.repo));
    if (command === "help") {
        console.log(usage());
        return;
    }
    const handler = COMMANDS[command];
    if (!handler) {
        throw new Error(`Unknown command: ${command}`);
    }
    const result = await handler({ repoPath, flags, positionals });
    console.log(JSON.stringify(result, null, 2));
}
function sanitizeResearcherBody(raw) {
    let text = raw;
    // Strip leading frontmatter block (--- ... ---).
    if (text.trimStart().startsWith("---")) {
        const after = text.trimStart().slice(3);
        const endIdx = after.indexOf("---");
        if (endIdx !== -1) {
            text = after.slice(endIdx + 3);
        }
    }
    // Strip leading # <heading> line (title heading; CLI adds its own).
    text = text.replace(/^\s*#[^\n]*\n/, "");
    return text.trim();
}
async function resolveBacklogAddBody(repoPath, title, suppliedBody, dispatchFn) {
    if (suppliedBody)
        return suppliedBody;
    const prompt = `Research repo context relevant to the new FEAT titled "${title}". ` +
        "Find prior FEATs in done/in-progress, recent grades mentioning this area, " +
        "decisions affecting it. Return a 200-400 word findings document with file:line " +
        "citations suitable for use as the FEAT body. Output only the body content " +
        "(no frontmatter, no title heading — those are added by the CLI).";
    try {
        const result = await dispatchFn({
            agent: "loop:researcher",
            prompt,
            parentCommand: "backlog-add",
            repoRoot: repoPath,
            argv: process.argv,
            skipFlag: "--no-research"
        });
        if (result.ok && !result.skipped && result.output && result.output.trim()) {
            const sanitized = sanitizeResearcherBody(result.output);
            if (sanitized.length > 0)
                return sanitized;
        }
    }
    catch {
        // Researcher failure must never block backlog add.
    }
    return "";
}
async function runBacklogSubcommand(repoPath, positionals, flags, opts = {}) {
    const [sub, ...rest] = positionals;
    if (!sub)
        throw new Error("backlog requires a subcommand: add | list | triage | promote");
    if (sub === "add") {
        const title = flags.title || rest.join(" ");
        if (!title)
            throw new Error("backlog add requires a title (positional or --title).");
        const { dispatchAgent } = await import("./lib/auto-dispatch.mjs");
        const dispatchFn = opts.dispatchFn ?? dispatchAgent;
        const resolvedBody = await resolveBacklogAddBody(repoPath, title, flags.body, dispatchFn);
        const { addFeature } = await import("./lib/backlog-writer.mjs");
        return await addFeature(repoPath, {
            title,
            priority: flags.priority,
            category: flags.category,
            target_release: flags.targetRelease,
            body: resolvedBody
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
        if (!featureId)
            throw new Error("backlog promote requires --id FEAT-NNN.");
        const { findFeatureById, moveFeature } = await import("./lib/backlog-writer.mjs");
        const entry = await findFeatureById(repoPath, featureId);
        if (!entry)
            throw new Error(`Feature not found: ${featureId}`);
        const moved = await moveFeature(entry.filePath, "in-progress");
        return { id: featureId, moved };
    }
    throw new Error(`Unknown backlog subcommand: ${sub}`);
}
function parseFeatureEntries(flags) {
    if (flags.featuresJson) {
        let entries;
        try {
            entries = JSON.parse(flags.featuresJson);
        }
        catch (err) {
            throw new Error(`--features-json must be valid JSON: ${err.message}`);
        }
        if (!Array.isArray(entries))
            throw new Error("--features-json must be a JSON array");
        return entries;
    }
    return flags.features
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
}
// ---------------------------------------------------------------------------
// Architect output parser — accepts semicolon-separated, newline-separated,
// or markdown-numbered-list titles from the agent. Each entry is trimmed,
// list markers and surrounding emphasis are stripped, empty entries
// discarded. Prefers semicolon split when present (back-compat with the
// original prompt format); falls back to newline split otherwise.
// ---------------------------------------------------------------------------
function stripListMarker(line) {
    // Strip leading markdown list markers: "1.", "1)", "-", "*"
    let s = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
    // Strip surrounding bold/italic markers and backticks
    s = s.replace(/^[*_`]+|[*_`]+$/g, "");
    return s.trim();
}
export function parseArchitectOutput(raw) {
    if (!raw || !raw.trim())
        return [];
    const hasSemicolon = raw.includes(";");
    const parts = hasSemicolon ? raw.split(";") : raw.split("\n");
    return parts.map(stripListMarker).filter(Boolean);
}
// ---------------------------------------------------------------------------
// Incomplete-SPEC detection — checks frontmatter and body for objective/scope.
// Returns array of missing field names (empty when SPEC is complete).
// ---------------------------------------------------------------------------
export function detectMissingSpecFields(spec) {
    const missing = [];
    const fm = spec.frontmatter;
    const body = spec.body ?? "";
    const hasObjective = (fm["objective"] != null && String(fm["objective"]).trim().length > 0) ||
        /##\s+objective/i.test(body) ||
        /##\s+goals/i.test(body) ||
        /##\s+problem/i.test(body);
    const hasScope = (fm["scope"] != null && String(fm["scope"]).trim().length > 0) ||
        /##\s+scope/i.test(body) ||
        /##\s+in[- ]scope/i.test(body) ||
        /##\s+non-goals/i.test(body);
    if (!hasObjective)
        missing.push("objective");
    if (!hasScope)
        missing.push("scope");
    return missing;
}
async function architectOptOut(repoPath, dispatchFn) {
    await dispatchFn({
        agent: "loop:architect",
        prompt: "",
        parentCommand: "spec-decompose",
        repoRoot: repoPath,
        argv: ["--no-architect"],
        skipFlag: "--no-architect"
    });
    const msg = "spec-decompose requires --features or architect dispatch; you opted out of architect with --no-architect";
    console.error(msg);
    process.exitCode = 1;
    return { error: msg };
}
async function dispatchArchitectForSpec(repoPath, specId, dispatchFn) {
    const { findSpecById } = await import("./lib/spec-parser.mjs");
    const spec = await findSpecById(repoPath, specId);
    if (!spec)
        throw new Error(`Spec not found: ${specId}`);
    for (const field of detectMissingSpecFields(spec)) {
        console.warn(`[spec-decompose] SPEC ${specId} missing ${field}; architect best-effort decomposition may produce low-quality FEATs`);
    }
    const prompt = `Decompose ${specId} (file: ${spec.filePath}) into 3-7 implementation FEATs. ` +
        "Return them as a semicolon-separated list of feature titles (no FEAT-NNN prefix; the CLI assigns ids). " +
        "Optionally include scope hints in parentheses, e.g. " +
        '"Audio ingestion pipeline (in-scope: src/audio/; out: streaming); Multi-tenant key scoping (depends_on: auth)". ' +
        "Output ONLY the semicolon-separated list — no preamble, no markdown headings.";
    const dispatchResult = await dispatchFn({
        agent: "loop:architect",
        prompt,
        parentCommand: "spec-decompose",
        repoRoot: repoPath,
        argv: process.argv,
        skipFlag: "--no-architect"
    });
    if (!dispatchResult.ok) {
        const msg = `architect dispatch failed: ${dispatchResult.error ?? "unknown error"}`;
        console.error(`[spec-decompose] ${msg}. Run with --features to skip architect.`);
        process.exitCode = 1;
        return { error: msg };
    }
    const titles = parseArchitectOutput(dispatchResult.output ?? "");
    if (titles.length === 0) {
        const msg = "architect returned empty feature list";
        console.error(`[spec-decompose] ${msg}. Run with --features to provide titles explicitly.`);
        process.exitCode = 1;
        return { error: msg };
    }
    return { titles };
}
const SPEC_HANDLERS = {
    add: async (repoPath, flags, rest) => {
        const title = flags.title || rest.join(" ");
        if (!title)
            throw new Error("spec add requires a title (positional or --title).");
        if (!flags.type) {
            throw new Error("spec add requires --type prd|user-journey|sre|research|adr|other.");
        }
        const { addSpec } = await import("./lib/spec-parser.mjs");
        return addSpec(repoPath, {
            type: flags.type,
            title,
            priority: flags.priority,
            target_release: flags.targetRelease,
            body: flags.body || ""
        });
    },
    list: async (repoPath, flags) => {
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
    },
    decompose: async (repoPath, flags, rest, opts = {}) => {
        const specId = flags.id || rest[0];
        if (!specId)
            throw new Error("spec decompose requires --id SPEC-NNN.");
        // Fast path: caller supplied explicit feature list — skip architect entirely.
        if (flags.features || flags.featuresJson) {
            const entries = parseFeatureEntries(flags);
            const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
            return decomposeSpec(repoPath, specId, entries);
        }
        const { dispatchAgent } = await import("./lib/auto-dispatch.mjs");
        const dispatchFn = opts.dispatchFn ?? dispatchAgent;
        // --no-architect opt-out: write audit log skip entry + exit non-zero.
        if (flags.noArchitect) {
            return architectOptOut(repoPath, dispatchFn);
        }
        // Neither flag: dispatch architect to produce feature list.
        const { titles, error } = await dispatchArchitectForSpec(repoPath, specId, dispatchFn);
        if (error)
            return { error };
        const { decomposeSpec } = await import("./lib/spec-decomposer.mjs");
        return decomposeSpec(repoPath, specId, titles);
    },
    status: async (repoPath) => {
        const { specSatisfaction, reconcileSpecStatus } = await import("./lib/linkage.mjs");
        const before = await specSatisfaction(repoPath);
        const reconciled = await reconcileSpecStatus(repoPath);
        return { satisfaction: before, statusChanges: reconciled };
    }
};
async function runSpecSubcommand(repoPath, positionals, flags, opts = {}) {
    const [sub, ...rest] = positionals;
    if (!sub)
        throw new Error("spec requires a subcommand: add | list | decompose | status");
    const handler = SPEC_HANDLERS[sub];
    if (!handler)
        throw new Error(`Unknown spec subcommand: ${sub}`);
    return handler(repoPath, flags, rest, opts);
}
async function runReleaseSubcommand(repoPath, positionals, flags) {
    const [sub] = positionals;
    if (!sub)
        throw new Error("release requires a subcommand: plan | status");
    const { planRelease, releaseStatus } = await import("./lib/release-planner.mjs");
    if (sub === "plan") {
        if (!flags.version)
            throw new Error("release plan requires --version vX.Y.Z");
        return await planRelease(repoPath, { version: flags.version });
    }
    if (sub === "status") {
        if (!flags.version)
            throw new Error("release status requires --version vX.Y.Z");
        return await releaseStatus(repoPath, { version: flags.version });
    }
    throw new Error(`Unknown release subcommand: ${sub}`);
}
// Resolves a required ID flag/positional or throws. Centralizes the
// "missing --id" error shape across slice subcommands.
function requireId(value, errMsg) {
    if (!value)
        throw new Error(errMsg);
    return value;
}
const SLICE_HANDLERS = {
    "from-feature": async (repoPath, _flags, _rest, featureId) => {
        requireId(featureId, "slice from-feature requires --id FEAT-NNN.");
        const { sliceFromFeature } = await import("./lib/slice-linker.mjs");
        const out = await sliceFromFeature(repoPath, featureId);
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, {
            command: "slice from-feature",
            feature: featureId,
            slice: out.slice.id
        });
        return out;
    },
    grade: async (repoPath, _flags, _rest, sliceId) => {
        requireId(sliceId, "slice grade requires --id SLICE-NN.");
        const { createGradeFile } = await import("./lib/grade-writer.mjs");
        const out = await createGradeFile(repoPath, sliceId);
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, { command: "slice grade", slice: sliceId, created: out.created });
        return out;
    },
    "grade-write": async (repoPath, _flags, _rest, sliceId) => {
        requireId(sliceId, "slice grade-write requires --id SLICE-NN.");
        const { writeGrade } = await import("./lib/grade-writer.mjs");
        return writeGrade(repoPath, sliceId);
    },
    complete: async (repoPath, flags, _rest, sliceId) => {
        requireId(sliceId, "slice complete requires --id SLICE-NN.");
        const { completeSlice } = await import("./lib/slice-linker.mjs");
        const out = await completeSlice(repoPath, sliceId, {
            keepFeatureOpen: Boolean(flags.keepFeatureOpen),
            forceClose: Boolean(flags.forceClose),
            skipValidationCheck: flags.skipValidationCheck || null,
            noDocWriter: Boolean(flags.noDocWriter)
        });
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, {
            command: "slice complete",
            slice: sliceId,
            feature: out.feature?.id || null,
            spec_status_changes: out.specStatusChanges?.length || 0,
            handoff_written: Boolean(out.handoff?.handoffPath),
            validation_gate_satisfied: Boolean(out.validationGate?.satisfied),
            validation_skipped_via_flag: Boolean(flags.skipValidationCheck)
        });
        return out;
    },
    start: async (repoPath, flags, _rest, sliceId) => {
        requireId(sliceId, "slice start requires --id SLICE-NN.");
        const { startSlice } = await import("./lib/slice-linker.mjs");
        const out = await startSlice(repoPath, sliceId, {
            goal: flags.goal || null,
            dispatch: flags.noDispatch !== true
        });
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, {
            command: "slice start",
            slice: sliceId,
            run_brief_written: Boolean(out.runBrief?.runBriefPath || out.runBrief?.artifactPath),
            slice_progress_written: Boolean(out.sliceProgress?.path),
            dispatch: out.dispatchInstruction ? "crew-build" : "inline"
        });
        return out;
    },
    link: async (repoPath, flags) => {
        const sliceId = requireId(flags.id, "slice link requires --id SLICE-NN.");
        if (!flags.artifact)
            throw new Error("slice link requires --artifact <path>.");
        if (!flags.kind)
            throw new Error("slice link requires --kind reviews|validations|deployments.");
        const { linkArtifactToSlice } = await import("./lib/artifact-linkage.mjs");
        return linkArtifactToSlice(repoPath, {
            sliceId,
            artifactPath: flags.artifact,
            kind: flags.kind
        });
    },
    "review-ladder": async (repoPath, _flags, _rest, sliceId) => {
        requireId(sliceId, "slice review-ladder requires --id SLICE-NN.");
        const { buildReviewLadder } = await import("./lib/reviewer-ladder.mjs");
        return buildReviewLadder(repoPath, sliceId);
    },
    plan: async (repoPath, _flags, _rest, sliceId) => {
        requireId(sliceId, "slice plan requires --id SLICE-NN.");
        const { runPlanPreflight } = await import("./lib/slice-plan.mjs");
        const out = await runPlanPreflight(repoPath, sliceId);
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
async function runSliceSubcommand(repoPath, positionals, flags) {
    const [sub, ...rest] = positionals;
    if (!sub)
        throw new Error("slice requires a subcommand: from-feature | start | grade | grade-write | complete | link | review-ladder | plan");
    const handler = SLICE_HANDLERS[sub];
    if (!handler)
        throw new Error(`Unknown slice subcommand: ${sub}`);
    const id = flags.id || rest[0];
    return handler(repoPath, flags, rest, id);
}
async function runDecisionsSubcommand(repoPath, positionals, flags) {
    const [sub, ...rest] = positionals;
    if (!sub)
        throw new Error("decisions requires a subcommand: list | show");
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
        if (!decId)
            throw new Error("decisions show requires --id DEC-NNN.");
        const dec = await showDecision(repoPath, decId);
        if (!dec)
            throw new Error(`Decision not found: ${decId}`);
        return dec;
    }
    if (sub === "supersede") {
        const { supersedeDecision } = await import("./lib/decisions-store.mjs");
        if (!flags.id || !flags.by)
            throw new Error("decisions supersede requires --id DEC-OLD --by DEC-NEW");
        const out = await supersedeDecision(repoPath, { oldId: flags.id, newId: flags.by });
        const { logEvent } = await import("./lib/telemetry.mjs");
        await logEvent(repoPath, { command: "decisions supersede", old: flags.id, new: flags.by });
        return out;
    }
    if (sub === "relevant") {
        const { findRelevantDecisions } = await import("./lib/decisions-store.mjs");
        if (!flags.files)
            throw new Error('decisions relevant requires --files "a.cs,b.cs,..."');
        const files = flags.files
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);
        const matches = await findRelevantDecisions(repoPath, files);
        return { count: matches.length, decisions: matches };
    }
    throw new Error(`Unknown decisions subcommand: ${sub}`);
}
async function runLearningsSubcommand(repoPath, positionals, flags) {
    const [sub] = positionals;
    if (!sub)
        throw new Error("learnings requires a subcommand: log | recent");
    const { logLearning, recentLearnings } = await import("./lib/learnings.mjs");
    if (sub === "log") {
        if (!flags.key)
            throw new Error("learnings log requires --key <key>");
        if (!flags.insight)
            throw new Error("learnings log requires --insight <insight>");
        const entry = { key: flags.key, insight: flags.insight, source: "agent" };
        if (flags.confidence !== null && flags.confidence !== undefined) {
            const conf = Number(flags.confidence);
            if (!Number.isNaN(conf))
                entry.confidence = conf;
        }
        if (flags.slice)
            entry.sliceId = flags.slice;
        return logLearning(repoPath, entry);
    }
    if (sub === "recent") {
        const limit = flags.limit !== null && flags.limit !== undefined ? Number(flags.limit) : 3;
        return recentLearnings(repoPath, limit);
    }
    throw new Error(`Unknown learnings subcommand: ${sub}`);
}
async function runGithubSubcommand(repoPath, positionals, _flags) {
    const [sub] = positionals;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — github-sync.mjs has no TypeScript source; exists at runtime
    const { publishAll, syncMilestones, setupGithubSync } = await import("./lib/github-sync.mjs");
    if (sub === "setup") {
        const result = await setupGithubSync(repoPath);
        console.log("[github-sync] Setup complete. Run 'github publish' next.");
        return result;
    }
    if (sub === "publish")
        return publishAll(repoPath);
    if (sub === "status")
        return syncMilestones(repoPath);
    if (sub === "sync" || sub === "bootstrap") {
        const { resolveConfig } = await import("./lib/config-resolver.mjs");
        const { getProvider } = await import("./lib/task-store/index.mjs");
        const config = await resolveConfig(repoPath);
        const provider = getProvider(config, repoPath);
        console.log(`[task-store] provider: ${provider.constructor.name}`);
        return sub === "sync" ? provider.syncPull(repoPath) : provider.bootstrap(repoPath);
    }
    throw new Error("github requires a subcommand: setup | publish | sync | status | bootstrap");
}
main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
