import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PATH_DEFAULTS } from "./paths.mjs";
import { parseSkillFrontmatter } from "./skill-frontmatter.mjs";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// Support two execution layouts:
// 1. Emitted (scripts/ tree): scripts/lib/ → templates
// 2. Direct (src/ tree): src/scripts/lib/ → templates (fallback)
let templateDir = path.resolve(scriptDir, "..", "..", "templates");
if (!existsSync(templateDir)) {
    templateDir = path.resolve(scriptDir, "..", "..", "..", "templates");
}
export async function readTemplate(relativePath) {
    return fs.readFile(path.join(templateDir, relativePath), "utf8");
}
// Substitute {{token}} occurrences. Tokens are simple names (no expressions).
// Unknown tokens are left as-is so a missing key is visible in output rather
// than silently rendered as empty.
export function renderTemplate(template, tokens) {
    return template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (match, key) => {
        if (Object.prototype.hasOwnProperty.call(tokens, key)) {
            const value = tokens[key];
            if (value === null || value === undefined) {
                return "";
            }
            return String(value);
        }
        return match;
    });
}
// Resolves a loop path token: prefer config.loop override, fall back to PATH_DEFAULTS.
export function resolveLoopPath(config, key) {
    const loopOverrides = config.loop;
    return (loopOverrides && loopOverrides[key]) || PATH_DEFAULTS[key];
}
// Builds the numbered mandatory-docs list embedded in the CLAUDE.md block.
export function buildMandatoryDocsList(config, aiLoopRoot) {
    const repoDocs = (config.mandatoryDocs || []).map((doc) => `\`${doc}\``);
    const loopControlDocs = [
        `\`${aiLoopRoot}/01-loop-control/WIGGIN_LOOP.md\``,
        `\`${aiLoopRoot}/01-loop-control/EVIDENCE_RULES.md\``,
        `\`${aiLoopRoot}/01-loop-control/STOP_CONDITIONS.md\``
    ];
    const allDocs = [...repoDocs, ...loopControlDocs];
    const list = allDocs.map((entry, index) => `${index + 2}. ${entry}`).join("\n");
    return list || "_(no mandatory docs configured)_";
}
export function buildContextRulesList(config) {
    const rules = config.contextRules || [];
    if (!Array.isArray(rules) || rules.length === 0)
        return "";
    const lines = rules.map((rule) => {
        const globs = (rule.globs || []).map((g) => `\`${g}\``).join(", ");
        const docs = (rule.docs || []).map((d) => `\`${d}\``).join(", ");
        return `- Globs: ${globs} → docs: ${docs}`;
    });
    return (`\n## Context rules\n\n` +
        `Before starting a slice, check its \`in_scope_globs\` frontmatter against these patterns ` +
        `and read the listed docs for any matching rule.\n\n` +
        lines.join("\n") +
        "\n");
}
export async function buildSkillActivationBlock(skillsDir) {
    try {
        const skillDirs = await fs.readdir(skillsDir, { withFileTypes: true });
        const skillMetas = [];
        for (const entry of skillDirs) {
            if (!entry.isDirectory()) {
                continue;
            }
            const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
            try {
                const content = await fs.readFile(skillMdPath, "utf8");
                const meta = parseSkillFrontmatter(content);
                skillMetas.push(meta);
            }
            catch {
                // SKILL.md not found or unreadable, skip
            }
        }
        // Filter to only manual and glob triggers
        const conditionalSkills = skillMetas.filter((m) => m.trigger === "manual" || m.trigger === "glob");
        if (conditionalSkills.length === 0) {
            return "";
        }
        const lines = [];
        lines.push("## Conditional skill activation");
        lines.push("");
        for (const skill of conditionalSkills) {
            if (skill.trigger === "manual") {
                lines.push(`- **${skill.name}** — invoke only when the user explicitly requests it.`);
            }
            else if (skill.trigger === "glob") {
                const globsStr = skill.globs.map((g) => `\`${g}\``).join(", ");
                lines.push(`- **${skill.name}** — activate when files match: ${globsStr}`);
            }
        }
        lines.push("");
        return lines.join("\n");
    }
    catch (err) {
        // skillsDir does not exist or is not readable
        if (err.code === "ENOENT") {
            return "";
        }
        throw err;
    }
}
function patternSubsumed(p1, p2) {
    if (!p1 || !p2)
        return false;
    return p1 === p2 || p1.includes(p2) || p2.includes(p1);
}
function dirPrefixOverlaps(p1, p2) {
    const dir1 = p1.split("*")[0];
    const dir2 = p2.split("*")[0];
    return Boolean(dir1 && dir2 && (dir1.startsWith(dir2) || dir2.startsWith(dir1)));
}
function extractExt(pattern) {
    return pattern.match(/\.[\w]+(\s|$|\*)/)?.[0]?.replace(/[\s*]/g, "") ?? "";
}
function extensionOverlap(p1, p2) {
    const ext1 = extractExt(p1);
    const ext2 = extractExt(p2);
    if (!ext1 || !ext2)
        return null;
    if (ext1 === ext2)
        return true;
    if (ext1.startsWith(".") && ext2.startsWith("."))
        return false;
    return null;
}
function globsOverlap(pattern1, pattern2) {
    if (patternSubsumed(pattern1, pattern2))
        return true;
    if (dirPrefixOverlaps(pattern1, pattern2))
        return true;
    const extResult = extensionOverlap(pattern1, pattern2);
    if (extResult !== null)
        return extResult;
    return false;
}
/**
 * Builds a rules block by filtering rules based on glob overlap with inScopeGlobs.
 *
 * Rules are included if:
 * - alwaysApply is true, OR
 * - any of the rule's globs overlaps with any of the inScopeGlobs (via pattern matching)
 *
 * Returns empty string if no rules match or if rules array is empty.
 *
 * @param rules - array of Rule objects
 * @param inScopeGlobs - array of glob patterns from the current slice
 * @returns markdown-formatted rules block or empty string
 */
export function buildRulesBlock(rules, inScopeGlobs) {
    if (!Array.isArray(rules) || rules.length === 0) {
        return "";
    }
    if (!Array.isArray(inScopeGlobs)) {
        inScopeGlobs = [];
    }
    // Filter rules that match: alwaysApply or any glob overlap
    const matchingRules = rules.filter((rule) => {
        if (rule.alwaysApply) {
            return true;
        }
        // Check if any rule glob matches any inScopeGlob
        if (rule.globs.length === 0) {
            return false;
        }
        return rule.globs.some((ruleGlob) => inScopeGlobs.some((scopeGlob) => globsOverlap(scopeGlob, ruleGlob)));
    });
    if (matchingRules.length === 0) {
        return "";
    }
    const lines = [];
    lines.push("## Auto-attached rules");
    lines.push("");
    for (const rule of matchingRules) {
        if (rule.description) {
            lines.push(`### ${rule.id}`);
            lines.push("");
            lines.push(rule.description);
            lines.push("");
        }
        lines.push(rule.body.trim());
        lines.push("");
    }
    return lines.join("\n");
}
export function buildTokens(config, extras) {
    const aiLoopRoot = resolveLoopPath(config, "aiLoopRoot");
    return {
        aiLoopRoot,
        backlogPath: resolveLoopPath(config, "backlogPath"),
        slicesRoot: resolveLoopPath(config, "slicesRoot"),
        backlogRoot: resolveLoopPath(config, "backlogRoot"),
        specsRoot: resolveLoopPath(config, "specsRoot"),
        gradesRoot: resolveLoopPath(config, "gradesRoot"),
        decisionsRoot: resolveLoopPath(config, "decisionsRoot"),
        phaseGateArtifactDir: resolveLoopPath(config, "phaseGateArtifactDir"),
        productName: config.productName || "Untitled product",
        productDescription: config.productDescription || "",
        stackDescription: config.stackDescription || "",
        mandatoryDocsList: buildMandatoryDocsList(config, aiLoopRoot),
        contextRulesList: buildContextRulesList(config),
        skillActivationBlock: extras?.skillActivationBlock || "",
        rulesBlock: extras?.rulesBlock || ""
    };
}
