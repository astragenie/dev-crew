import fs from "node:fs/promises";
import path from "node:path";

import {
  resolveConfig,
  writeConfigIfMissing,
  configPath,
  applyLightLadder,
  retrofitLightLadder
} from "./config-resolver.mjs";
import { checkBunVersion } from "./plugin-identity.mjs";
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
  writeLoopRulesReference,
  updateClaudeMd,
  MARKER_START,
  MARKER_END
} from "./loop-installer-scaffold.mjs";

export { buildContextRulesList } from "./loop-installer-tokens.mjs";
export { MARKER_START, MARKER_END } from "./loop-installer-scaffold.mjs";

// FEAT-271 / SLICE-168 (HIGH fix, 2026-08-02 review): --light against an
// ALREADY-installed repo is a retrofit, not a fresh scaffold, and needs a
// separate path. resolveConfig's non-preset "read .claude/loop.json as-is"
// runtime path never carries a preset's `light` block (so applyLightLadder
// would hard-throw whenever --preset is omitted on a refresh) — and even
// when --preset IS supplied, writeConfigIfMissing further down silently
// no-ops once the file exists, so the merged ladder never reaches disk
// either way. retrofitLightLadder bypasses that existence gate for just the
// light-ladder fields, independently of options.preset, so `--light` alone
// retrofits an already-installed repo as FEAT-271 intends. Extracted out of
// installLoop to keep that function's cognitive complexity under the
// biome-enforced cap.
async function applyLightFlag(
  repoPath: string,
  options: Record<string, any>,
  config: Record<string, any>,
  hasExistingConfig: boolean,
  writes: any[]
): Promise<Record<string, any>> {
  if (!options.light) {
    return config;
  }
  if (!hasExistingConfig) {
    // Fresh scaffold: merge the preset's light block into the in-memory
    // config before it is written below. Absent the flag, behavior is
    // byte-identical to today (AC-2).
    return applyLightLadder(config);
  }
  const retrofit = await retrofitLightLadder(repoPath, {
    presetOverride: options.preset ?? null
  });
  if (retrofit.written) {
    writes.push(path.relative(repoPath, retrofit.configPath));
  }
  return config;
}

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
        `Install: https://bun.sh — then re-run /devcrew:install.`
    );
  }

  // P2 seam-elimination (SLICE-13): crew is a same-repo subtree now, not an
  // installed plugin — the old "is crew installed / is it new enough" hard
  // dependency guard (findCrewCli/getCrewVersion/MIN_CREW_VERSION) no longer
  // applies. There is nothing to discover or version-gate: crew always
  // ships with this repo, at whatever version this repo's `crew/` tree is
  // pinned to.
  const writes: any[] = [];

  // FEAT-218 (Phase 2): presets are install-time templates only, and
  // resolveConfig no longer defaults to a hardcoded stack (AC-5) — a first
  // install with no existing .claude/loop.json MUST name a template
  // explicitly. Re-installing an already-configured repo may omit --preset;
  // resolveConfig then reads the existing (already self-contained) config.
  const hasExistingConfig = await pathExists(configPath(repoPath));
  if (!options.preset && !hasExistingConfig) {
    throw new Error(
      "No --preset given and no existing .claude/loop.json found. " +
        "Run `/devcrew:install --preset <name>` to scaffold one (see `/devcrew:list-presets` for options)."
    );
  }

  let config = await resolveConfig(repoPath, { preset: options.preset });
  config = await applyLightFlag(repoPath, options, config, hasExistingConfig, writes);
  const skillActivationBlock = await buildSkillActivationBlock(path.join(repoPath, "skills"));
  const tokens = buildTokens(config, { skillActivationBlock });

  await updateClaudeMd(repoPath, tokens, writes);
  await writeLoopRules(repoPath, tokens, writes);
  await writeLoopRulesReference(repoPath, tokens, writes);
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
    // presetName + schemaVersion are required by validatePreset's common
    // header — carried over so a future `resolve-skills --preset
    // .claude/loop.json` call validates against this file directly (AC-3),
    // without needing scripts/presets/<name>.json on disk.
    presetName: config.presetName,
    schemaVersion: config.schemaVersion,
    projectType: config.projectType,
    split: config.split,
    frontend: config.frontend,
    backend: config.backend,
    contract: config.contract,
    deployment: config.deployment,
    loop: config.loop,
    stack: config.stack,
    reviewers: config.reviewers,
    mandatoryDocs: config.mandatoryDocs,
    productName: config.productName,
    productDescription: config.productDescription,
    stackDescription: config.stackDescription,
    // Skill-injection payload (AC-3): inlined so builder/role dispatch reads
    // .claude/loop.json directly, with no scripts/presets/ file present.
    ...(config.split ? { fe: config.fe, be: config.be } : { skills: config.skills }),
    roles: config.roles
  });
  if (configResult.written) {
    writes.push(path.relative(repoPath, configResult.path));
  }

  return {
    mode: "install-loop",
    preset: config.preset,
    repoPath,
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
    bun: await checkBunVersion(),
    memory: memoryStatus,
    memoryBlock
  };
}
