import fs from "node:fs/promises";
import path from "node:path";

import { readTemplate, renderTemplate } from "./loop-installer-tokens.mjs";
import {
  pathExists,
  ensureDir,
  backlogRoot as resolveBacklogRoot,
  specsRoot as resolveSpecsRoot,
  gradesRoot as resolveGradesRoot,
  decisionsRoot as resolveDecisionsRoot
} from "./paths.mjs";

export const MARKER_START = "<!-- loop:start -->";
export const MARKER_END = "<!-- loop:end -->";

// Replace the existing loop marker block in CLAUDE.md, or append
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
function applyMarkerBlock(existing: string, renderedBlock: string): string {
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

export async function updateClaudeMd(
  repoPath: string,
  tokens: Record<string, string>,
  writes: string[]
): Promise<void> {
  const claudePath = path.join(repoPath, "CLAUDE.md");
  const blockTemplate = await readTemplate("claude-md-hard-rules.md");
  const renderedBlock = renderTemplate(blockTemplate, tokens).trimEnd();

  const existing = await fs.readFile(claudePath, "utf8").catch((): null => null);
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

// Register the read-guard PreToolUse hook in .claude/settings.json.
//
// The hook lives at ${CLAUDE_PLUGIN_ROOT}/hooks/read-guard.sh and runs
// on every Read/Edit/Write call. See hooks/read-guard.sh for behavior
// and the JSONL log schema.
//
// Idempotent: re-running on an already-registered repo is a no-op.
// Preserves any other PreToolUse hooks the user has added.
export async function registerReadGuardHook(repoPath: string, writes: string[]): Promise<void> {
  const settingsPath = path.join(repoPath, ".claude", "settings.json");
  await ensureDir(path.dirname(settingsPath));

  let settings: Record<string, any> = {};
  const existing = await fs.readFile(settingsPath, "utf8").catch((): null => null);
  if (existing !== null) {
    try {
      settings = JSON.parse(existing);
    } catch {
      // Don't clobber malformed user settings — bail loudly instead.
      throw new Error(
        `loop installer: ${settingsPath} exists but is not valid JSON. ` +
          "Fix or remove it before re-running /loop:install."
      );
    }
  }

  const hookCommand = "bash ${CLAUDE_PLUGIN_ROOT}/hooks/read-guard.sh";
  settings.hooks ??= {};
  settings.hooks.PreToolUse ??= [];

  // Check if our hook is already registered (idempotency).
  const alreadyRegistered = settings.hooks.PreToolUse.some((entry: any) => {
    if (!entry || !Array.isArray(entry.hooks)) return false;
    return entry.hooks.some(
      (h: any) => h && typeof h.command === "string" && h.command.includes("hooks/read-guard.sh")
    );
  });

  if (alreadyRegistered) return;

  settings.hooks.PreToolUse.push({
    matcher: "Read|Edit|Write",
    hooks: [
      {
        type: "command",
        command: hookCommand
      }
    ]
  });

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  writes.push(path.relative(repoPath, settingsPath));
}

// Write the full HARD RULES out to a sibling file so the CLAUDE.md marker
// block can stay lean (~10 lines instead of ~35). Agents follow the
// reference and read this file when entering an autonomous loop run.
export async function writeLoopRules(
  repoPath: string,
  tokens: Record<string, string>,
  writes: string[]
): Promise<void> {
  const tpl = await readTemplate("loop-rules.md");
  const contents = renderTemplate(tpl, tokens);
  const target = path.join(repoPath, ".claude", "loop", "rules.md");
  await ensureDir(path.dirname(target));
  const existing = await fs.readFile(target, "utf8").catch((): null => null);
  if (existing !== contents) {
    await fs.writeFile(target, contents);
    writes.push(path.relative(repoPath, target));
  }
}

// Always overwrite plugin-owned loop-control files so version upgrades land
// cleanly. User customization belongs in .claude/loop.json, not in
// these files.
export async function writeLoopControlFiles(
  repoPath: string,
  tokens: Record<string, string>,
  writes: string[]
): Promise<void> {
  const loopRoot = tokens.aiLoopRoot!;
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
  targets[targets.length - 1]!.target = path.join(
    repoPath,
    loopRoot,
    "00-entry",
    "SLICE_TEMPLATE.md"
  );

  for (const { template, target, tokenize } of targets) {
    const tpl = await readTemplate(template);
    const contents = tokenize ? renderTemplate(tpl, tokens) : tpl;
    await ensureDir(path.dirname(target));
    const existing = await fs.readFile(target, "utf8").catch((): null => null);
    if (existing !== contents) {
      await fs.writeFile(target, contents);
      writes.push(path.relative(repoPath, target));
    }
  }
}

// Backlog files are scaffolds — only write if missing. User-authored content
// must never be overwritten by an install.
export async function writeBacklogScaffold(
  repoPath: string,
  tokens: Record<string, string>,
  writes: string[]
): Promise<void> {
  const backlogPath = tokens.backlogPath!;
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
  const slicesPending = path.join(repoPath, tokens.slicesRoot!, "pending");
  await ensureDir(slicesPending);
  const gitkeepPath = path.join(slicesPending, ".gitkeep");
  if (!(await pathExists(gitkeepPath))) {
    await fs.writeFile(gitkeepPath, "");
    writes.push(path.relative(repoPath, gitkeepPath));
  }
}

// Product-tier scaffolds: backlog state-machine (FEAT-NNN files), specs,
// grades, and decisions. Paths resolved via paths.mjs — defaults to
// .claude/artifacts/loop/. Only-if-missing per file — never clobber user content.
const BACKLOG_STATES = ["pending", "triaged", "in-progress", "done"];

export async function writeBacklogStateMachine(
  repoPath: string,
  config: Record<string, any>,
  writes: string[]
): Promise<void> {
  const root = resolveBacklogRoot(repoPath, config);
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

export async function writeGradesScaffold(
  repoPath: string,
  config: Record<string, any>,
  writes: string[]
): Promise<void> {
  const root = resolveGradesRoot(repoPath, config);
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

export async function writeDecisionsScaffold(
  repoPath: string,
  config: Record<string, any>,
  writes: string[]
): Promise<void> {
  const root = resolveDecisionsRoot(repoPath, config);
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

export async function writeSpecsScaffold(
  repoPath: string,
  config: Record<string, any>,
  writes: string[]
): Promise<void> {
  const root = resolveSpecsRoot(repoPath, config);
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
