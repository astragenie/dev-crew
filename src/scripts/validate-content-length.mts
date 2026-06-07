#!/usr/bin/env node

// Enforces max line counts for agent and skill markdown files.
//   agents/**/*.md         -> AGENT_MAX_LINES
//   skills/**/SKILL.md     -> SKILL_MAX_LINES
// validateContentLength() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AGENT_MAX_LINES = 300;
export const SKILL_MAX_LINES = 200;

// Paths under agents/ that are exempt from the line cap.
// 3rdparty/ holds vendored agents we do not author; pinning a cap on them
// would force us to fork-and-trim every upstream change. Owned agents stay
// under the strict cap.
export const AGENT_SKIP_PATHS = ["agents/3rdparty/"];

async function walk(
  dir: string,
  predicate: (full: string, name: string) => boolean,
  acc: string[] = []
) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return acc;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, predicate, acc);
    } else if (entry.isFile() && predicate(full, entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function countLines(content: string): number {
  // Match `wc -l` semantics: count of '\n' characters. Empty file = 0.
  return (content.match(/\n/g) || []).length;
}

export async function validateContentLength(
  repoRoot: string,
  opts: { agentMax?: number; skillMax?: number; agentSkipPaths?: string[] } = {}
) {
  const agentMax = opts.agentMax ?? AGENT_MAX_LINES;
  const skillMax = opts.skillMax ?? SKILL_MAX_LINES;
  const agentSkipPaths = opts.agentSkipPaths ?? AGENT_SKIP_PATHS;

  const agentsDir = path.join(repoRoot, "agents");
  const skillsDir = path.join(repoRoot, "skills");

  const agentFiles = await walk(agentsDir, (_full, name) => name.endsWith(".md"));
  const skillFiles = await walk(skillsDir, (_full, name) => name === "SKILL.md");

  const failures: any[] = [];
  const checks: any[] = [];

  for (const file of agentFiles) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
    const exempt = agentSkipPaths.some((prefix) => rel.startsWith(prefix));
    const content = await fs.readFile(file, "utf8");
    const lines = countLines(content);
    checks.push({ path: rel, lines, limit: agentMax, kind: "agent", exempt });
    if (!exempt && lines > agentMax) {
      failures.push(`${rel}: ${lines} lines exceeds agent cap of ${agentMax}`);
    }
  }

  for (const file of skillFiles) {
    const content = await fs.readFile(file, "utf8");
    const lines = countLines(content);
    const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
    checks.push({ path: rel, lines, limit: skillMax, kind: "skill" });
    if (lines > skillMax) {
      failures.push(`${rel}: ${lines} lines exceeds skill cap of ${skillMax}`);
    }
  }

  return { ok: failures.length === 0, failures, checks };
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  const entryPath = path.resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

if (isMainEntry()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await validateContentLength(repoRoot);
  const agentChecks = result.checks.filter((c) => c.kind === "agent");
  const skillChecks = result.checks.filter((c) => c.kind === "skill");
  if (!result.ok) {
    console.error("Content length validation failed:");
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    const agentEnforced = agentChecks.filter((c) => !c.exempt).length;
    const agentExempt = agentChecks.length - agentEnforced;
    console.log("Content length OK:");
    console.log(
      `  agents (${agentEnforced} enforced, ${agentExempt} exempt, cap=${AGENT_MAX_LINES} lines)`
    );
    console.log(`  skills (${skillChecks.length} files, cap=${SKILL_MAX_LINES} lines)`);
  }
}
