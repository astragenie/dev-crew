#!/usr/bin/env node

// FEAT-167 AC-7: validates that every FEAT carrying an effort_points
// frontmatter field uses the Fibonacci values [1, 2, 3, 5, 8, 13],
// and that expected_usd (when present) is a non-negative number.
//
// Optional field — FEATs without effort_points pass. The check fires
// only when the field is present, so the validator is safe to wire
// into CI before backfill completes.
//
// validateEffortPoints() is exported so tests can call it without
// spawning. Entry-point sets process.exitCode on failure (never calls
// process.exit).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.mjs";
import { isEffortPoints } from "./lib/pm-effort-mapper.mjs";

const BACKLOG_DIRS = ["pending", "triaged", "in-progress", "done"] as const;
const EXPECTED_USD_TOLERANCE = 0.01;

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

function checkExpectedUsdConsistency(
  featId: string,
  effortPoints: number,
  expectedUsd: number,
  medianUsdPerPoint: number | null,
  errors: string[]
) {
  if (medianUsdPerPoint === null) return;
  const want = effortPoints * medianUsdPerPoint;
  if (Math.abs(expectedUsd - want) > EXPECTED_USD_TOLERANCE) {
    errors.push(
      `${featId}: expected_usd=${expectedUsd} but effort_points (${effortPoints}) ×` +
        ` median_usd_per_point (${medianUsdPerPoint}) = ${want} ` +
        `(tolerance ±${EXPECTED_USD_TOLERANCE})`
    );
  }
}

function checkOneFeat(
  featId: string,
  frontmatter: Record<string, unknown>,
  medianUsdPerPoint: number | null,
  errors: string[]
) {
  const effortRaw = frontmatter["effort_points"];
  if (effortRaw === undefined || effortRaw === null) return;

  if (!isEffortPoints(effortRaw)) {
    errors.push(
      `${featId}: effort_points=${JSON.stringify(effortRaw)} is not in the allowed Fibonacci set [1, 2, 3, 5, 8, 13]`
    );
    return;
  }

  const expectedUsd = frontmatter["expected_usd"];
  if (expectedUsd === undefined || expectedUsd === null) return;

  if (typeof expectedUsd !== "number" || !Number.isFinite(expectedUsd) || expectedUsd < 0) {
    errors.push(
      `${featId}: expected_usd=${JSON.stringify(expectedUsd)} is not a non-negative number`
    );
    return;
  }

  checkExpectedUsdConsistency(featId, effortRaw, expectedUsd, medianUsdPerPoint, errors);
}

export async function validateEffortPoints(
  repoRoot: string,
  opts: { medianUsdPerPoint?: number | null } = {}
): Promise<ValidateResult> {
  const errors: string[] = [];
  const backlogRoot = path.join(repoRoot, ".claude", "artifacts", "loop", "backlog");
  const medianUsdPerPoint = opts.medianUsdPerPoint ?? null;

  const featFiles: string[] = [];
  for (const dir of BACKLOG_DIRS) {
    const files = await listFeatFiles(path.join(backlogRoot, dir));
    featFiles.push(...files);
  }

  for (const filePath of featFiles) {
    const text = await fs.readFile(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(text);
    if (!frontmatter) continue;
    const featId = path.basename(filePath, ".md");
    checkOneFeat(featId, frontmatter, medianUsdPerPoint, errors);
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
  const result = await validateEffortPoints(repo);

  if (!result.ok) {
    console.error("effort_points validation failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `effort_points validation OK — scanned ${result.scanned} FEAT file(s), no violations.`
    );
  }
}
