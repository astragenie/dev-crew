import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";

export interface Rule {
  id: string;
  globs: string[];
  alwaysApply: boolean;
  description: string;
  body: string;
}

/**
 * Loads all rule files from a directory, parses their YAML frontmatter,
 * and returns an array of Rule objects.
 *
 * - Returns [] if rulesDir does not exist (no throw)
 * - Parses frontmatter to extract: id, globs (array), alwaysApply (boolean), description
 * - globs defaults to [] if absent
 * - alwaysApply defaults to false if absent
 * - description defaults to "" if absent
 * - body is the content after the frontmatter
 *
 * @param rulesDir - directory path containing rule *.md files
 * @returns array of Rule objects
 */
export async function loadRules(rulesDir: string): Promise<Rule[]> {
  try {
    const entries = await fs.readdir(rulesDir, { withFileTypes: true });
    const rules: Rule[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const filePath = path.join(rulesDir, entry.name);
      try {
        const content = await fs.readFile(filePath, "utf8");
        const { frontmatter, body } = parseFrontmatter(content);

        const id = frontmatter.id || "";
        const globs = Array.isArray(frontmatter.globs) ? frontmatter.globs : [];
        const alwaysApply = Boolean(frontmatter.alwaysApply);
        const description = frontmatter.description || "";

        if (id) {
          rules.push({
            id,
            globs,
            alwaysApply,
            description,
            body
          });
        }
      } catch {
        // File read or parse error, skip this rule
      }
    }

    return rules;
  } catch (err) {
    // Directory does not exist or is not readable
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}
