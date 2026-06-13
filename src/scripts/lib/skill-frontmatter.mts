import { parseFrontmatter } from "./frontmatter.mjs";

export interface SkillMeta {
  name: string;
  description: string;
  trigger: "always_on" | "glob" | "manual" | "model_decision";
  globs: string[];
  keywords?: string[];
}

/**
 * Parses SKILL.md frontmatter to extract name, description, trigger, globs, and keywords.
 * - trigger defaults to "always_on" when absent
 * - globs defaults to [] when absent
 * - keywords defaults to [] when absent
 * - Returns a typed SkillMeta object
 */
export function parseSkillFrontmatter(content: string): SkillMeta {
  const { frontmatter } = parseFrontmatter(content);

  const name = frontmatter.name || "";
  const description = frontmatter.description || "";
  const trigger = frontmatter.trigger || "always_on";
  const globs = Array.isArray(frontmatter.globs) ? frontmatter.globs : [];
  const keywords = Array.isArray(frontmatter.keywords) ? frontmatter.keywords : [];

  return {
    name,
    description,
    trigger,
    globs,
    keywords
  };
}
