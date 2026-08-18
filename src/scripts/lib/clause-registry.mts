// Extracts stable clause IDs from CLAUDE.md HTML-comment markers.
// Used by validate-decline-citations and future PM auditing.
//
// A clause marker has the form:
//   <!-- clause: <kebab-case-id> -->
// It is expected immediately after an ## H2 heading in CLAUDE.md.

import fs from "node:fs/promises";
import path from "node:path";

const CLAUSE_RE = /<!--\s*clause:\s*([\w-]+)\s*-->/g;

/**
 * Reads CLAUDE.md from repoRoot and returns the Set of all clause IDs found.
 * Returns an empty Set when the file does not exist or has no markers.
 */
export async function extractClauseIds(repoRoot: string): Promise<Set<string>> {
  const claudePath = path.join(repoRoot, "CLAUDE.md");
  let content: string;
  try {
    content = await fs.readFile(claudePath, "utf8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    throw err;
  }
  const ids = new Set<string>();
  for (const match of content.matchAll(CLAUSE_RE)) {
    const id = match[1];
    if (id !== undefined) ids.add(id);
  }
  return ids;
}
