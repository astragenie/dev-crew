import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { pathExists } from "./paths.mjs";

// Stores operator-promoted grade lessons as durable planning rules.
// Used by FEAT-179 to inject decay-ranked learnings at slice-start time.

export interface PlanningRule {
  slug: string;
  text: string;
  promotedAt: string;
  source: "grade-lesson";
}

const RULES_DIR_REL = path.join(".claude", "artifacts", "loop", "planning-rules");

function rulesDir(repoPath: string): string {
  return path.join(repoPath, RULES_DIR_REL);
}

/**
 * Load all planning rules from .claude/artifacts/loop/planning-rules/.
 * Returns an empty array when the directory does not exist.
 */
export async function loadRules(repoPath: string): Promise<PlanningRule[]> {
  const dir = rulesDir(repoPath);
  if (!(await pathExists(dir))) return [];
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const rules: PlanningRule[] = [];
  for (const filename of entries) {
    if (!filename.endsWith(".md")) continue;
    const filePath = path.join(dir, filename);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    const { frontmatter, body } = parseFrontmatter(raw);
    rules.push({
      slug: String(frontmatter.slug ?? ""),
      text: body.trim(),
      promotedAt: String(frontmatter.promotedAt ?? ""),
      source: (frontmatter.source as PlanningRule["source"]) ?? "grade-lesson"
    });
  }
  return rules;
}
