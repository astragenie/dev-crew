import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig, writeConfigIfMissing } from "./config-resolver.mjs";
import {
  findCrewCli,
  getCrewVersion,
  compareSemver,
  MIN_CREW_VERSION,
  checkBunVersion
} from "./plugin-identity.mjs";
import { initializeIterationCounter } from "./loop-iteration.mjs";
import { pathExists } from "./paths.mjs";
import { buildTokens, buildSkillActivationBlock } from "./loop-installer-tokens.mjs";
import {
  writeBacklogScaffold,
  writeBacklogStateMachine,
  writeSpecsScaffold,
  writeGradesScaffold,
  writeDecisionsScaffold,
  writeLoopControlFiles,
  writeLoopRules,
  updateClaudeMd,
  MARKER_START,
  MARKER_END
} from "./loop-installer-scaffold.mjs";

export { buildContextRulesList } from "./loop-installer-tokens.mjs";
export { MARKER_START, MARKER_END } from "./loop-installer-scaffold.mjs";

export async function installLoop(
  repoPath: string,
  options: Record<string, any> = {}
): Promise<Record<string, any>> {
  if (!(await pathExists(repoPath))) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }
  if (!(await pathExists(path.join(repoPath, ".git")))) {
    throw new Error(`Not a git repository (missing .git): ${repoPath}`);
  }

  // Hard dependency: Bun must meet the minimum version.
  const bunCheck = await checkBunVersion(options.bunVersionOverride);
  if (!bunCheck.ok) {
    throw new Error(
      `loop requires bun >= ${bunCheck.required} (found: ${bunCheck.version ?? "not installed"}). ` +
        `Install: https://bun.sh — then re-run /loop:install.`
    );
  }

  // Hard dependency: crew CLI must be discoverable.
  // Test seam: options.crewCliOverride / options.crewVersionOverride let tests
  // pin the discovered CLI path and installed version deterministically
  // (mirrors the bunVersionOverride seam above). Both are undefined in
  // production, so real discovery still runs and behavior is unchanged.
  const crewCli =
    options.crewCliOverride !== undefined ? options.crewCliOverride : await findCrewCli();
  if (!crewCli) {
    throw new Error(
      "Hard dependency missing: the `crew` plugin is not installed in the Claude Code plugin cache. " +
        "Install `crew` first (it lives in the astra marketplace), then re-run /loop:install."
    );
  }
  const installedCrewVersion =
    options.crewVersionOverride !== undefined
      ? options.crewVersionOverride
      : await getCrewVersion(crewCli);
  if (installedCrewVersion && compareSemver(installedCrewVersion, MIN_CREW_VERSION) < 0) {
    throw new Error(
      `Incompatible crew plugin: found v${installedCrewVersion}, need >= v${MIN_CREW_VERSION}. ` +
        `Update crew (\`/plugin install crew@astra\`) and retry.`
    );
  }

  const writes: any[] = [];

  const config = await resolveConfig(repoPath, { preset: options.preset });
  const skillActivationBlock = await buildSkillActivationBlock(path.join(repoPath, "skills"));
  const tokens = buildTokens(config, { skillActivationBlock });

  await updateClaudeMd(repoPath, tokens, writes);
  await writeLoopRules(repoPath, tokens, writes);
  await writeLoopControlFiles(repoPath, tokens, writes);
  await writeBacklogScaffold(repoPath, tokens, writes);
  await writeBacklogStateMachine(repoPath, config, writes);
  await writeSpecsScaffold(repoPath, config, writes);
  await writeGradesScaffold(repoPath, config, writes);
  await writeDecisionsScaffold(repoPath, config, writes);

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
    writes
  };
}

export async function reportStatus(repoPath: string): Promise<Record<string, any>> {
  const config = await resolveConfig(repoPath);
  const skillActivationBlock = await buildSkillActivationBlock(path.join(repoPath, "skills"));
  const tokens = buildTokens(config, { skillActivationBlock });
  const claudePath = path.join(repoPath, "CLAUDE.md");
  const claudeMd = await fs.readFile(claudePath, "utf8").catch(() => "");

  const { probeMemory } = await import("./memory-doctor.mjs");
  const { renderMemoryStatusBlock } = await import("./memory-doctor-renderer.mjs");
  const memoryStatus = await probeMemory(repoPath);
  const memoryBlock = renderMemoryStatusBlock(memoryStatus);

  return {
    preset: config.preset,
    aiLoopRoot: tokens.aiLoopRoot,
    backlogPath: tokens.backlogPath,
    slicesRoot: tokens.slicesRoot,
    phaseGateArtifactDir: tokens.phaseGateArtifactDir,
    hasMarkerBlock: claudeMd.includes(MARKER_START) && claudeMd.includes(MARKER_END),
    hasApprovedSlices: await pathExists(
      path.join(repoPath, tokens.backlogPath!, "approved-slices.md")
    ),
    hasMasterPrompt: await pathExists(
      path.join(repoPath, tokens.aiLoopRoot!, "00-entry", "MASTER_PROMPT.md")
    ),
    crewCli: await findCrewCli(),
    bun: await checkBunVersion(),
    memory: memoryStatus,
    memoryBlock
  };
}
