import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveConfig, writeConfigIfMissing } from "./config-resolver.mjs";
import {
  findCrewCli,
  getCrewVersion,
  compareSemver,
  MIN_CREW_VERSION
} from "./plugin-identity.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "..", "..", "templates");

export const MARKER_START = "<!-- autonomous-loop:start -->";
export const MARKER_END = "<!-- autonomous-loop:end -->";

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readTemplate(relativePath) {
  return fs.readFile(path.join(templateDir, relativePath), "utf8");
}

// Substitute {{token}} occurrences. Tokens are simple names (no expressions).
// Unknown tokens are left as-is so a missing key is visible in output rather
// than silently rendered as empty.
function renderTemplate(template, tokens) {
  return template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(tokens, key)) {
      const value = tokens[key];
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    }
    return match;
  });
}

function buildTokens(config) {
  // Build a fully-numbered mandatory-reading list that includes the three
  // loop-control docs at the end. Item 1 is always CLAUDE.md (handled by the
  // template). Repo-specific mandatoryDocs entries fill the middle. The three
  // loop-control entries are always last so an agent reads them last.
  const aiLoopRoot = config.loop?.aiLoopRoot || "docs/architecture/ai-loop";
  const repoDocs = (config.mandatoryDocs || []).map((doc) => `\`${doc}\``);
  const loopControlDocs = [
    `\`${aiLoopRoot}/01-loop-control/WIGGIN_LOOP.md\``,
    `\`${aiLoopRoot}/01-loop-control/EVIDENCE_RULES.md\``,
    `\`${aiLoopRoot}/01-loop-control/STOP_CONDITIONS.md\``
  ];
  const allDocs = [...repoDocs, ...loopControlDocs];
  // Start numbering at 2 because item 1 (CLAUDE.md) is in the template body.
  const mandatoryDocsList = allDocs.map((entry, index) => `${index + 2}. ${entry}`).join("\n");

  return {
    aiLoopRoot,
    backlogPath: config.loop?.backlogPath || "docs/architecture/ai-loop/backlog",
    slicesRoot: config.loop?.slicesRoot || "docs/architecture/ai-loop/slices",
    phaseGateArtifactDir: config.loop?.phaseGateArtifactDir || ".claude/artifacts/crew/validations",
    productName: config.productName || "Untitled product",
    productDescription: config.productDescription || "",
    stackDescription: config.stackDescription || "",
    mandatoryDocsList: mandatoryDocsList || "_(no mandatory docs configured)_"
  };
}

// Replace the existing autonomous-loop marker block in CLAUDE.md, or append
// a new one if none is present. Preserves all content outside the marker block.
//
// Tolerant of malformed state from earlier installs:
// - Well-formed (single start + single end) → replace start-to-end.
// - Stacked starts + single end (field-observed bug from < 0.1.12) → replace
//   from FIRST start to LAST end, collapsing everything between.
// - Orphan start with no end (interrupted install / older plugin version) →
//   replace from FIRST start to EOF.
// - End without start → undefined input; treat as no marker and append.
//
// Idempotency requirement: running this function twice with the same
// renderedBlock must produce identical output on the second call.
function applyMarkerBlock(existing, renderedBlock) {
  const firstStartIdx = existing.indexOf(MARKER_START);
  if (firstStartIdx === -1) {
    return `${existing.trimEnd()}\n\n${renderedBlock}\n`;
  }
  const lastEndIdx = existing.lastIndexOf(MARKER_END);
  const before = existing.slice(0, firstStartIdx).trimEnd();
  const endCut =
    lastEndIdx !== -1 && lastEndIdx > firstStartIdx
      ? lastEndIdx + MARKER_END.length
      : existing.length;
  const after = existing.slice(endCut).trimStart();
  const parts = [before, renderedBlock];
  if (after) parts.push(after);
  return `${parts.join("\n\n")}\n`;
}

async function updateClaudeMd(repoPath, tokens, writes) {
  const claudePath = path.join(repoPath, "CLAUDE.md");
  const blockTemplate = await readTemplate("claude-md-hard-rules.md");
  const renderedBlock = renderTemplate(blockTemplate, tokens).trimEnd();

  const existing = await fs.readFile(claudePath, "utf8").catch(() => null);
  if (existing === null) {
    // Create a minimal CLAUDE.md if none exists.
    const initial = `# CLAUDE.md\n\nProject memory for Claude Code. Read this first before making changes.\n\n${renderedBlock}\n`;
    await fs.writeFile(claudePath, initial);
    writes.push("CLAUDE.md");
    return;
  }

  const next = applyMarkerBlock(existing, renderedBlock);
  if (next !== existing) {
    await fs.writeFile(claudePath, next);
    writes.push("CLAUDE.md");
  }
}

// Write the full HARD RULES out to a sibling file so the CLAUDE.md marker
// block can stay lean (~10 lines instead of ~35). Agents follow the
// reference and read this file when entering an autonomous loop run.
async function writeAutonomousLoopRules(repoPath, tokens, writes) {
  const tpl = await readTemplate("autonomous-loop-rules.md");
  const contents = renderTemplate(tpl, tokens);
  const target = path.join(repoPath, ".claude", "autonomous-loop", "rules.md");
  await ensureDir(path.dirname(target));
  const existing = await fs.readFile(target, "utf8").catch(() => null);
  if (existing !== contents) {
    await fs.writeFile(target, contents);
    writes.push(path.relative(repoPath, target));
  }
}

// Always overwrite plugin-owned loop-control files so version upgrades land
// cleanly. User customization belongs in .claude/autonomous-loop.json, not in
// these files.
async function writeLoopControlFiles(repoPath, tokens, writes) {
  const loopRoot = tokens.aiLoopRoot;
  const targets = [
    {
      template: "wiggin-loop.md",
      target: path.join(repoPath, loopRoot, "01-loop-control", "WIGGIN_LOOP.md"),
      tokenize: false
    },
    {
      template: "evidence-rules.md",
      target: path.join(repoPath, loopRoot, "01-loop-control", "EVIDENCE_RULES.md"),
      tokenize: false
    },
    {
      template: "stop-conditions.md",
      target: path.join(repoPath, loopRoot, "01-loop-control", "STOP_CONDITIONS.md"),
      tokenize: true
    },
    {
      template: "master-prompt.md",
      target: path.join(repoPath, loopRoot, "00-entry", "MASTER_PROMPT.md"),
      tokenize: true
    },
    {
      template: "slice-template.md",
      target: path.join(repoPath, "00-entry-only-marker", "SLICE_TEMPLATE.md"),
      tokenize: false,
      skipMarker: true
    }
  ];
  // Slice template actually goes into 00-entry/:
  targets[targets.length - 1].target = path.join(
    repoPath,
    loopRoot,
    "00-entry",
    "SLICE_TEMPLATE.md"
  );

  for (const { template, target, tokenize } of targets) {
    const tpl = await readTemplate(template);
    const contents = tokenize ? renderTemplate(tpl, tokens) : tpl;
    await ensureDir(path.dirname(target));
    const existing = await fs.readFile(target, "utf8").catch(() => null);
    if (existing !== contents) {
      await fs.writeFile(target, contents);
      writes.push(path.relative(repoPath, target));
    }
  }
}

// Backlog files are scaffolds — only write if missing. User-authored content
// must never be overwritten by an install.
async function writeBacklogScaffold(repoPath, tokens, writes) {
  const backlogPath = tokens.backlogPath;
  const targets = [
    {
      template: "backlog/approved-slices.md",
      target: path.join(repoPath, backlogPath, "approved-slices.md")
    },
    {
      template: "backlog/completed-slices.md",
      target: path.join(repoPath, backlogPath, "completed-slices.md")
    },
    {
      template: "backlog/product-backlog.md",
      target: path.join(repoPath, backlogPath, "product-backlog.md")
    }
  ];

  for (const { template, target } of targets) {
    if (await pathExists(target)) {
      continue;
    }
    const tpl = await readTemplate(template);
    const contents = renderTemplate(tpl, tokens);
    await ensureDir(path.dirname(target));
    await fs.writeFile(target, contents);
    writes.push(path.relative(repoPath, target));
  }

  // Ensure slices/pending/ exists as a trackable empty dir.
  const slicesPending = path.join(repoPath, tokens.slicesRoot, "pending");
  await ensureDir(slicesPending);
  const gitkeepPath = path.join(slicesPending, ".gitkeep");
  if (!(await pathExists(gitkeepPath))) {
    await fs.writeFile(gitkeepPath, "");
    writes.push(path.relative(repoPath, gitkeepPath));
  }
}

// Product-tier scaffolds: docs/backlog/ (state-machine dir for FEAT-NNN
// files) and docs/specs/ (flat dir for SPEC-NNN files). These live OUTSIDE
// the ai-loop tree because they're PM/strategic surfaces, not methodology.
// Only-if-missing per file — never clobber user content.
const BACKLOG_STATES = ["pending", "triaged", "in-progress", "done"];

async function writeBacklogStateMachine(repoPath, writes) {
  const root = path.join(repoPath, "docs", "backlog");
  await ensureDir(root);
  // Top-level README explaining the dir
  const readmePath = path.join(root, "README.md");
  if (!(await pathExists(readmePath))) {
    const tpl = await readTemplate("backlog/README.md");
    await fs.writeFile(readmePath, tpl);
    writes.push(path.relative(repoPath, readmePath));
  }
  // feature-template.md as reference
  const templatePath = path.join(root, "feature-template.md");
  if (!(await pathExists(templatePath))) {
    const tpl = await readTemplate("backlog/feature-template.md");
    await fs.writeFile(templatePath, tpl);
    writes.push(path.relative(repoPath, templatePath));
  }
  // Four state dirs with .gitkeep
  for (const state of BACKLOG_STATES) {
    const dir = path.join(root, state);
    await ensureDir(dir);
    const keep = path.join(dir, ".gitkeep");
    if (!(await pathExists(keep))) {
      await fs.writeFile(keep, "");
      writes.push(path.relative(repoPath, keep));
    }
  }
}

async function writeGradesScaffold(repoPath, writes) {
  const root = path.join(repoPath, "docs", "grades");
  await ensureDir(root);
  const items = [
    { template: "grades/README.md", target: "README.md" },
    { template: "grades/grade-template.md", target: "grade-template.md" }
  ];
  for (const { template, target } of items) {
    const targetPath = path.join(root, target);
    if (await pathExists(targetPath)) continue;
    const tpl = await readTemplate(template);
    await fs.writeFile(targetPath, tpl);
    writes.push(path.relative(repoPath, targetPath));
  }
}

async function writeDecisionsScaffold(repoPath, writes) {
  const root = path.join(repoPath, "docs", "decisions");
  await ensureDir(root);
  const items = [
    { template: "decisions/README.md", target: "README.md" },
    { template: "decisions/decision-template.md", target: "decision-template.md" }
  ];
  for (const { template, target } of items) {
    const targetPath = path.join(root, target);
    if (await pathExists(targetPath)) continue;
    const tpl = await readTemplate(template);
    await fs.writeFile(targetPath, tpl);
    writes.push(path.relative(repoPath, targetPath));
  }
}

async function writeSpecsScaffold(repoPath, writes) {
  const root = path.join(repoPath, "docs", "specs");
  await ensureDir(root);
  const items = [
    { template: "specs/README.md", target: "README.md" },
    { template: "specs/prd-template.md", target: "prd-template.md" },
    { template: "specs/user-journey-template.md", target: "user-journey-template.md" },
    { template: "specs/sre-template.md", target: "sre-template.md" },
    { template: "specs/research-template.md", target: "research-template.md" },
    { template: "specs/adr-template.md", target: "adr-template.md" }
  ];
  for (const { template, target } of items) {
    const targetPath = path.join(root, target);
    if (await pathExists(targetPath)) continue;
    const tpl = await readTemplate(template);
    await fs.writeFile(targetPath, tpl);
    writes.push(path.relative(repoPath, targetPath));
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
    throw new Error(
      "Hard dependency missing: the `crew` plugin is not installed in the Claude Code plugin cache. " +
        "Install `crew` first (it lives in the crew-dev marketplace), then re-run /autonomous-loop:install."
    );
  }
  const installedCrewVersion = await getCrewVersion(crewCli);
  if (installedCrewVersion && compareSemver(installedCrewVersion, MIN_CREW_VERSION) < 0) {
    throw new Error(
      `Incompatible crew plugin: found v${installedCrewVersion}, need >= v${MIN_CREW_VERSION}. ` +
        `Update crew (\`/plugin install crew@crew-dev\`) and retry.`
    );
  }

  // Optional ad-hoc migration. Imported lazily so installer also works in
  // tests that don't need it.
  const writes = [];
  if (options.migrateAdhoc !== false) {
    try {
      const { migrateAdhocInstall } = await import("./adhoc-migrator.mjs");
      const migration = await migrateAdhocInstall(repoPath);
      if (migration.extractedConfig) {
        await writeConfigIfMissing(repoPath, migration.extractedConfig);
      }
      if (migration.claudeMdRewritten) {
        writes.push("CLAUDE.md (ad-hoc HARD RULE blocks removed)");
      }
    } catch (error) {
      // Module may not exist yet during bootstrap; that's fine.
      if (!String(error.message || "").includes("Cannot find module")) {
        throw error;
      }
    }
  }

  const config = await resolveConfig(repoPath, { preset: options.preset });
  const tokens = buildTokens(config);

  await updateClaudeMd(repoPath, tokens, writes);
  await writeAutonomousLoopRules(repoPath, tokens, writes);
  await writeLoopControlFiles(repoPath, tokens, writes);
  await writeBacklogScaffold(repoPath, tokens, writes);
  await writeBacklogStateMachine(repoPath, writes);
  await writeSpecsScaffold(repoPath, writes);
  await writeGradesScaffold(repoPath, writes);
  await writeDecisionsScaffold(repoPath, writes);

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
    mode: "install-autonomous-loop",
    preset: config.preset,
    repoPath,
    crewCli,
    writes
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
    hasApprovedSlices: await pathExists(
      path.join(repoPath, tokens.backlogPath, "approved-slices.md")
    ),
    hasMasterPrompt: await pathExists(
      path.join(repoPath, tokens.aiLoopRoot, "00-entry", "MASTER_PROMPT.md")
    ),
    crewCli: await findCrewCli()
  };
}
