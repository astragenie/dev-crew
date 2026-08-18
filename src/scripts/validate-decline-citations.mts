#!/usr/bin/env node

// Validates that every P4 FEAT in the backlog carries a declined_per field
// citing known clause IDs from CLAUDE.md.
//
// validateDeclineCitations() is exported so tests can call it without spawning.
// Entry-point sets process.exitCode on failure (never calls process.exit).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractClauseIds } from "./lib/clause-registry.mjs";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const BACKLOG_DIRS = ["triaged", "done"] as const;

export { extractClauseIds };

interface ValidateResult {
  ok: boolean;
  errors: string[];
  scanned: number;
}

async function listFeatFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && /^FEAT-\d+[a-z]?\.md$/.test(e.name))
    .map((e) => path.join(dir, e.name));
}

function extractFeatId(filePath: string): string {
  return path.basename(filePath, ".md");
}

function normalizeDeclinedPer(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  return raw.filter((item) => typeof item === "string");
}

export async function validateDeclineCitations(repoRoot: string): Promise<ValidateResult> {
  const errors: string[] = [];
  const knownClauses = await extractClauseIds(repoRoot);

  const backlogRoot = path.join(repoRoot, ".claude", "artifacts", "loop", "backlog");

  const featFiles: string[] = [];
  for (const dir of BACKLOG_DIRS) {
    const files = await listFeatFiles(path.join(backlogRoot, dir));
    featFiles.push(...files);
  }

  for (const filePath of featFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    const priority = frontmatter["composite_priority"] as string | undefined;

    if (priority !== "P4") continue;

    const featId = extractFeatId(filePath);
    const declinedPer = normalizeDeclinedPer(frontmatter["declined_per"]);

    if (declinedPer === null || declinedPer.length === 0) {
      errors.push(
        `${featId}: composite_priority is P4 but declined_per is missing or empty — ` +
          `add declined_per: [<clause-id>] citing one or more clause IDs from CLAUDE.md`
      );
      continue;
    }

    for (const clauseId of declinedPer) {
      if (!knownClauses.has(clauseId)) {
        errors.push(
          `${featId}: declined_per references unknown clause "${clauseId}" — ` +
            `check CLAUDE.md for valid clause IDs`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, scanned: featFiles.length };
}

function parseArgs(argv: string[]): { repo: string } {
  let repo = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--repo" && argv[i + 1]) {
      repo = path.resolve(argv[i + 1] ?? ".");
      i++;
    }
  }
  return { repo };
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  const entryPath = path.resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

if (isMainEntry()) {
  const { repo } = parseArgs(process.argv.slice(2));
  const result = await validateDeclineCitations(repo);

  if (!result.ok) {
    console.error("Decline-citation validation failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Decline-citation validation OK — scanned ${result.scanned} FEAT file(s), no P4 violations.`
    );
  }
}
