#!/usr/bin/env node
// migrate-adopter.mts — SLICE-26 (FEAT-006 P5 cutover).
//
// Migrates one adopter repo (a repo that installed the pre-merge
// `runner-plugin` and/or `crew` plugins) onto the unified `devcrew` plugin:
//   1. Regenerates CLAUDE.md's marker block(s) — any `<!-- runner:start -->`
//      and `<!-- crew:start -->` spans collapse into a single
//      `<!-- devcrew:start -->...<!-- devcrew:end -->` block, rendered via
//      the installer's own token pipeline (see lib/migrate-adopter-markers.mts).
//   2. Rewrites dispatch tokens (`/runner:`, `/crew:`, backtick-wrapped
//      `runner:x`/`crew:x` agent names) to `/devcrew:`/`devcrew:x` outside
//      marker blocks, in CLAUDE.md and AGENTS.md only.
//   3. Migrates .claude/loop.json + .claude/crew.json into .claude/devcrew.json
//      via the existing migrateToDevcrewConfig (devcrew-config.mts) — never
//      forked here.
//
// Deliberately contains NO marketplace write path (AC-3): the crew+runner ->
// devcrew marketplace-entry swap is a separate, operator-gated step owned by
// SLICE-27, not this script.
//
// Usage:
//   bun src/scripts/migrate-adopter.mts --repo <adopterPath> [--dry-run]

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pathExists } from "./lib/paths.mjs";
import { resolveConfig } from "./lib/config-resolver.mjs";
import { replaceMarkerBlocks, renderDevcrewBlock } from "./lib/migrate-adopter-markers.mjs";
import { rewriteDispatchTokens, type AmbiguousToken } from "./lib/migrate-adopter-tokens.mjs";
import { lineDiff } from "./lib/migrate-adopter-diff.mjs";
import {
  migrateToDevcrewConfig,
  readDevcrewConfigIfPresent,
  DEVCREW_CONFIG_FILENAME,
  LEGACY_LOOP_CONFIG_FILENAME,
  LEGACY_CREW_CONFIG_FILENAME,
  type DevcrewMigrationResult
} from "./lib/devcrew-config.mjs";

export interface FileChange {
  file: string;
  changed: boolean;
  diff?: string[];
}

function buildFileChange(file: string, before: string, after: string): FileChange {
  const changed = after !== before;
  return changed ? { file, changed, diff: lineDiff(before, after) } : { file, changed };
}

export interface ConfigPreview {
  action: "already-migrated" | "would-migrate" | "no-source-config";
  written: boolean;
  path: string;
}

export interface MigrateAdopterResult {
  repoPath: string;
  dryRun: boolean;
  claudeMdSkippedReason: string | null;
  changes: FileChange[];
  config: ConfigPreview | DevcrewMigrationResult;
  ambiguousTokens: AmbiguousToken[];
}

async function migrateClaudeMd(
  repoPath: string,
  dryRun: boolean,
  changes: FileChange[],
  ambiguousTokens: AmbiguousToken[]
): Promise<string | null> {
  const claudePath = path.join(repoPath, "CLAUDE.md");
  const before = await fs.readFile(claudePath, "utf8").catch((): null => null);
  if (before === null) {
    return "no CLAUDE.md in repo";
  }

  let devcrewBlock: string;
  try {
    // resolveConfig is called here, not inside lib/migrate-adopter-markers.mts —
    // this script is the sanctioned direct caller (like loop.mts), keeping lib
    // modules on the "config passed as a param" side of the boundary enforced
    // by dispatcher-config.test.mts.
    const config = await resolveConfig(repoPath);
    devcrewBlock = await renderDevcrewBlock(repoPath, config);
  } catch (err) {
    return `cannot render devcrew block: ${(err as Error).message}`;
  }

  const withMarkers = replaceMarkerBlocks(before, devcrewBlock);
  const { text: after, ambiguous } = rewriteDispatchTokens(withMarkers, "CLAUDE.md");
  ambiguousTokens.push(...ambiguous);

  const change = buildFileChange("CLAUDE.md", before, after);
  changes.push(change);
  if (!dryRun && change.changed) {
    await fs.writeFile(claudePath, after);
  }
  return null;
}

async function migrateAgentsMd(
  repoPath: string,
  dryRun: boolean,
  changes: FileChange[],
  ambiguousTokens: AmbiguousToken[]
): Promise<void> {
  const agentsPath = path.join(repoPath, "AGENTS.md");
  const before = await fs.readFile(agentsPath, "utf8").catch((): null => null);
  if (before === null) return;

  const { text: after, ambiguous } = rewriteDispatchTokens(before, "AGENTS.md");
  ambiguousTokens.push(...ambiguous);

  const change = buildFileChange("AGENTS.md", before, after);
  changes.push(change);
  if (!dryRun && change.changed) {
    await fs.writeFile(agentsPath, after);
  }
}

async function previewConfigMigration(repoPath: string): Promise<ConfigPreview> {
  const devcrewPath = path.join(repoPath, DEVCREW_CONFIG_FILENAME);
  const already = await readDevcrewConfigIfPresent(repoPath);
  if (already) {
    return { action: "already-migrated", written: false, path: devcrewPath };
  }
  const hasLoop = await pathExists(path.join(repoPath, LEGACY_LOOP_CONFIG_FILENAME));
  const hasCrew = await pathExists(path.join(repoPath, LEGACY_CREW_CONFIG_FILENAME));
  if (!hasLoop && !hasCrew) {
    return { action: "no-source-config", written: false, path: devcrewPath };
  }
  return { action: "would-migrate", written: false, path: devcrewPath };
}

// Runs the full migration (or its dry-run preview) against one adopter repo.
// Exported for tests and for the enumeration-driven bulk run.
export async function migrateAdopterRepo(
  repoPath: string,
  options: { dryRun?: boolean } = {}
): Promise<MigrateAdopterResult> {
  const dryRun = Boolean(options.dryRun);
  const changes: FileChange[] = [];
  const ambiguousTokens: AmbiguousToken[] = [];

  const claudeMdSkippedReason = await migrateClaudeMd(repoPath, dryRun, changes, ambiguousTokens);
  await migrateAgentsMd(repoPath, dryRun, changes, ambiguousTokens);

  const config = dryRun
    ? await previewConfigMigration(repoPath)
    : await migrateToDevcrewConfig(repoPath);

  return { repoPath, dryRun, claudeMdSkippedReason, changes, config, ambiguousTokens };
}

// Detects a linked git worktree (a checkout whose `.git` is a file pointing
// at `gitdir: <mainRepo>/.git/worktrees/<name>`, not a directory) — these
// share history with a repo already in the enumeration and must never be
// migrated/committed to independently (FEAT-006 P5 scope note).
async function isWorktreeCheckout(dirPath: string): Promise<boolean> {
  const gitPath = path.join(dirPath, ".git");
  try {
    const stat = await fs.stat(gitPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function hasLegacyMarkerBlock(dirPath: string): Promise<boolean> {
  const content = await fs
    .readFile(path.join(dirPath, "CLAUDE.md"), "utf8")
    .catch((): null => null);
  if (content === null) return false;
  // `loop:` included alongside `runner:`/`crew:` (reviewer-caught gap, SLICE-26
  // review) — a repo carrying only a `loop:start` block (pre-runner-plugin-rename
  // installer, no crew:/runner: block) would otherwise never be enumerated.
  return (
    content.includes("<!-- runner:start -->") ||
    content.includes("<!-- crew:start -->") ||
    content.includes("<!-- loop:start -->")
  );
}

// Scans each root in `scanRoots` one level deep for candidate adopter repos:
// has a CLAUDE.md with a legacy runner:/crew: marker block, is not a linked
// worktree, and its basename is not in `excludeNames`.
export async function enumerateAdopters(
  scanRoots: string[],
  excludeNames: string[] = []
): Promise<string[]> {
  const excluded = new Set(excludeNames);
  const found: string[] = [];
  for (const root of scanRoots) {
    const entries = await fs.readdir(root, { withFileTypes: true }).catch((): [] => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || excluded.has(entry.name)) continue;
      const dirPath = path.join(root, entry.name);
      if (await isWorktreeCheckout(dirPath)) continue;
      if (await hasLegacyMarkerBlock(dirPath)) found.push(dirPath);
    }
  }
  return found.sort();
}

function parseArgs(argv: string[]) {
  const flags: { repo: string | null; dryRun: boolean } = { repo: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo") {
      flags.repo = argv[i + 1] ?? null;
      i += 1;
    } else if (argv[i] === "--dry-run") {
      flags.dryRun = true;
    }
  }
  return flags;
}

function printResult(result: MigrateAdopterResult): void {
  const label = result.dryRun ? "[dry-run]" : "[applied]";
  console.log(`${label} ${result.repoPath}`);
  if (result.claudeMdSkippedReason) {
    console.log(`  CLAUDE.md: skipped (${result.claudeMdSkippedReason})`);
  }
  for (const change of result.changes) {
    if (!change.changed) {
      console.log(`  ${change.file}: no change`);
      continue;
    }
    console.log(`  ${change.file}: changed (${change.diff?.length ?? 0} diff lines)`);
    for (const line of change.diff ?? []) {
      console.log(`    ${line}`);
    }
  }
  console.log(`  config: ${JSON.stringify(result.config)}`);
  for (const token of result.ambiguousTokens) {
    console.log(`  ambiguous token left unrewritten: ${token.file}:${token.line}: ${token.text}`);
  }
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.repo) {
    console.error("Usage: bun src/scripts/migrate-adopter.mts --repo <adopterPath> [--dry-run]");
    process.exitCode = 1;
  } else {
    const repoPath = path.resolve(args.repo);
    if (!(await pathExists(repoPath))) {
      console.error(`Repository path does not exist: ${repoPath}`);
      process.exitCode = 1;
    } else {
      const result = await migrateAdopterRepo(repoPath, { dryRun: args.dryRun });
      printResult(result);
    }
  }
}
