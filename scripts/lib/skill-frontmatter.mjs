import { parseFrontmatter } from "./frontmatter.mjs";
/**
 * Parses SKILL.md frontmatter to extract name, description, trigger, and globs.
 * - trigger defaults to "always_on" when absent
 * - globs defaults to [] when absent
 * - Returns a typed SkillMeta object
 */
export function parseSkillFrontmatter(content) {
    const { frontmatter } = parseFrontmatter(content);
    const name = frontmatter.name || "";
    const description = frontmatter.description || "";
    const trigger = frontmatter.trigger || "always_on";
    const globs = Array.isArray(frontmatter.globs) ? frontmatter.globs : [];
    return {
        name,
        description,
        trigger,
        globs
    };
}
