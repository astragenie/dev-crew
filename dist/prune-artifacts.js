#!/usr/bin/env node
// @bun

// crew/scripts/prune-artifacts.mts
import fs from "fs/promises";
import path from "path";
import process from "process";
import { pathToFileURL } from "url";
var ARTIFACTS_SUBDIR = path.join(".claude", "artifacts", "crew");
var DEFAULT_DAYS = 90;
function isOlderThan(mtimeMs, nowMs, days) {
  return mtimeMs < nowMs - days * 86400000;
}
function parseArgs(argv) {
  let repo = process.cwd();
  let olderThan = DEFAULT_DAYS;
  let dryRun = false;
  for (let i = 0;i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--repo" && argv[i + 1] !== undefined) {
      repo = argv[i + 1];
      i += 1;
    } else if (arg === "--older-than" && argv[i + 1] !== undefined) {
      olderThan = Number(argv[i + 1]);
      i += 1;
    }
  }
  return { repo, olderThan, dryRun };
}
function validateDays(days) {
  if (!Number.isFinite(days) || Number.isNaN(days)) {
    return `--older-than must be a finite number; got ${days}`;
  }
  if (!Number.isInteger(days) || days <= 0) {
    return `--older-than must be a positive integer; got ${days}`;
  }
  return null;
}
async function collectFiles(artifactsDir) {
  const results = [];
  let subdirs;
  try {
    const entries = await fs.readdir(artifactsDir, { withFileTypes: true });
    subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (err.code === "ENOENT") {
      return results;
    }
    throw err;
  }
  for (const sub of subdirs) {
    const subPath = path.join(artifactsDir, sub);
    const entries = await fs.readdir(subPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        results.push(path.join(subPath, entry.name));
      }
    }
  }
  return results;
}
async function pruneFiles(files, nowMs, days, dryRun) {
  let count = 0;
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    if (!isOlderThan(stat.mtimeMs, nowMs, days))
      continue;
    if (dryRun) {
      process.stdout.write(`[dry-run] would delete: ${filePath}
`);
    } else {
      await fs.unlink(filePath);
      process.stdout.write(`deleted: ${filePath}
`);
    }
    count += 1;
  }
  return count;
}
async function main(argv) {
  const { repo, olderThan, dryRun } = parseArgs(argv);
  const validationError = validateDays(olderThan);
  if (validationError !== null) {
    process.stderr.write(`[prune-artifacts] ${validationError}
`);
    process.exit(1);
  }
  const artifactsDir = path.resolve(repo, ARTIFACTS_SUBDIR);
  const nowMs = Date.now();
  let files;
  try {
    files = await collectFiles(artifactsDir);
  } catch (err) {
    process.stderr.write(`[prune-artifacts] I/O error: ${err.message}
`);
    process.exit(2);
  }
  let count;
  try {
    count = await pruneFiles(files, nowMs, olderThan, dryRun);
  } catch (err) {
    process.stderr.write(`[prune-artifacts] I/O error: ${err.message}
`);
    process.exit(2);
  }
  const mode = dryRun ? "dry-run" : "deleted";
  process.stdout.write(`[prune-artifacts] ${mode}: ${count} file(s) older than ${olderThan} day(s)
`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`[prune-artifacts] fatal: ${err.message}
`);
    process.exit(2);
  });
}
export {
  validateDays,
  isOlderThan
};
