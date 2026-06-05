import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig, writeConfigIfMissing } from "./config-resolver.mjs";
import { findCrewCli, getCrewVersion, compareSemver, MIN_CREW_VERSION } from "./plugin-identity.mjs";
import { initializeIterationCounter } from "./loop-iteration.mjs";
import { migrateLegacyAutonomousLoop } from "./legacy-migrator.mjs";
import { pathExists } from "./paths.mjs";
import { buildTokens } from "./loop-installer-tokens.mjs";
import { writeBacklogScaffold, writeBacklogStateMachine, writeSpecsScaffold, writeGradesScaffold, writeDecisionsScaffold, writeLoopControlFiles, writeLoopRules, registerReadGuardHook, updateClaudeMd, MARKER_START, MARKER_END } from "./loop-installer-scaffold.mjs";
export { buildContextRulesList } from "./loop-installer-tokens.mjs";
export { MARKER_START, MARKER_END } from "./loop-installer-scaffold.mjs";
function appendLegacyMigrationWrites(legacyMigration, writes) {
    if (!legacyMigration?.migrated)
        return;
    for (const step of legacyMigration.steps) {
        if (step.action === "renamed") {
            writes.push(`${step.from} -> ${step.to} (legacy rename)`);
        }
        else if (step.action === "rewritten") {
            writes.push(`${step.file} (legacy markers rewritten)`);
        }
    }
}
async function runAdhocMigration(repoPath, writes) {
    try {
        const { migrateAdhocInstall } = await import("./adhoc-migrator.mjs");
        const migration = await migrateAdhocInstall(repoPath);
        if (migration.extractedConfig) {
            await writeConfigIfMissing(repoPath, migration.extractedConfig);
        }
        if (migration.claudeMdRewritten) {
            writes.push("CLAUDE.md (ad-hoc HARD RULE blocks removed)");
        }
    }
    catch (error) {
        // Module may not exist yet during bootstrap; that's fine.
        if (!String(error.message || "").includes("Cannot find module")) {
            throw error;
        }
    }
}
export async function installLoop(repoPath, options = {}) {
    if (!(await pathExists(repoPath))) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
    }
    if (!(await pathExists(path.join(repoPath, ".git")))) {
        throw new Error(`Not a git repository (missing .git): ${repoPath}`);
    }
    // Hard dependency: crew CLI must be discoverable.
    const crewCli = await findCrewCli();
    if (!crewCli) {
        throw new Error("Hard dependency missing: the `crew` plugin is not installed in the Claude Code plugin cache. " +
            "Install `crew` first (it lives in the astra marketplace), then re-run /loop:install.");
    }
    const installedCrewVersion = await getCrewVersion(crewCli);
    if (installedCrewVersion && compareSemver(installedCrewVersion, MIN_CREW_VERSION) < 0) {
        throw new Error(`Incompatible crew plugin: found v${installedCrewVersion}, need >= v${MIN_CREW_VERSION}. ` +
            `Update crew (\`/plugin install crew@astra\`) and retry.`);
    }
    const writes = [];
    // Migrate legacy `autonomous-loop` state from < v0.3.0 BEFORE any other
    // install step runs. This renames the config file, rules dir, and CLAUDE.md
    // markers so the rest of the installer operates on the new identifiers.
    // Idempotent — re-running on an already-migrated repo is a no-op.
    const legacyMigration = await migrateLegacyAutonomousLoop(repoPath);
    appendLegacyMigrationWrites(legacyMigration, writes);
    // Optional ad-hoc migration. Imported lazily so installer also works in
    // tests that don't need it.
    if (options.migrateAdhoc !== false) {
        await runAdhocMigration(repoPath, writes);
    }
    const config = await resolveConfig(repoPath, { preset: options.preset });
    const tokens = buildTokens(config);
    await updateClaudeMd(repoPath, tokens, writes);
    await writeLoopRules(repoPath, tokens, writes);
    await writeLoopControlFiles(repoPath, tokens, writes);
    await writeBacklogScaffold(repoPath, tokens, writes);
    await writeBacklogStateMachine(repoPath, config, writes);
    await writeSpecsScaffold(repoPath, config, writes);
    await writeGradesScaffold(repoPath, config, writes);
    await writeDecisionsScaffold(repoPath, config, writes);
    // Register PreToolUse re-read guard hook in .claude/settings.json (FEAT-039).
    await registerReadGuardHook(repoPath, writes);
    // Initialize loop iteration counter for runaway halting (FEAT-001).
    await initializeIterationCounter(repoPath);
    const configResult = await writeConfigIfMissing(repoPath, {
        preset: config.preset,
        loop: config.loop,
        stack: config.stack,
        reviewers: config.reviewers,
        mandatoryDocs: config.mandatoryDocs,
        productName: config.productName,
        productDescription: config.productDescription,
        stackDescription: config.stackDescription
    });
    if (configResult.written) {
        writes.push(path.relative(repoPath, configResult.path));
    }
    return {
        mode: "install-loop",
        preset: config.preset,
        repoPath,
        crewCli,
        writes,
        legacyMigration
    };
}
export async function reportStatus(repoPath) {
    const config = await resolveConfig(repoPath);
    const tokens = buildTokens(config);
    const claudePath = path.join(repoPath, "CLAUDE.md");
    const claudeMd = await fs.readFile(claudePath, "utf8").catch(() => "");
    return {
        preset: config.preset,
        aiLoopRoot: tokens.aiLoopRoot,
        backlogPath: tokens.backlogPath,
        slicesRoot: tokens.slicesRoot,
        phaseGateArtifactDir: tokens.phaseGateArtifactDir,
        hasMarkerBlock: claudeMd.includes(MARKER_START) && claudeMd.includes(MARKER_END),
        hasApprovedSlices: await pathExists(path.join(repoPath, tokens.backlogPath, "approved-slices.md")),
        hasMasterPrompt: await pathExists(path.join(repoPath, tokens.aiLoopRoot, "00-entry", "MASTER_PROMPT.md")),
        crewCli: await findCrewCli()
    };
}
