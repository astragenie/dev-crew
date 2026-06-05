import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PATH_DEFAULTS } from "./paths.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "..", "..", "templates");

export async function readTemplate(relativePath: string): Promise<string> {
  return fs.readFile(path.join(templateDir, relativePath), "utf8");
}

// Substitute {{token}} occurrences. Tokens are simple names (no expressions).
// Unknown tokens are left as-is so a missing key is visible in output rather
// than silently rendered as empty.
export function renderTemplate(template: string, tokens: Record<string, unknown>): string {
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
export function resolveLoopPath(config: Record<string, any>, key: string): string {
  return (config.loop && config.loop[key]) || PATH_DEFAULTS[key];
}

// Builds the numbered mandatory-docs list embedded in the CLAUDE.md block.
export function buildMandatoryDocsList(config: Record<string, any>, aiLoopRoot: string): string {
  const repoDocs = (config.mandatoryDocs || []).map((doc: string) => `\`${doc}\``);
  const loopControlDocs = [
    `\`${aiLoopRoot}/01-loop-control/WIGGIN_LOOP.md\``,
    `\`${aiLoopRoot}/01-loop-control/EVIDENCE_RULES.md\``,
    `\`${aiLoopRoot}/01-loop-control/STOP_CONDITIONS.md\``
  ];
  const allDocs = [...repoDocs, ...loopControlDocs];
  const list = allDocs.map((entry, index) => `${index + 2}. ${entry}`).join("\n");
  return list || "_(no mandatory docs configured)_";
}

export function buildContextRulesList(config: Record<string, any>): string {
  const rules: Array<{ globs: string[]; docs: string[] }> = config.contextRules || [];
  if (!Array.isArray(rules) || rules.length === 0) return "";
  const lines = rules.map((rule) => {
    const globs = (rule.globs || []).map((g: string) => `\`${g}\``).join(", ");
    const docs = (rule.docs || []).map((d: string) => `\`${d}\``).join(", ");
    return `- Globs: ${globs} → docs: ${docs}`;
  });
  return (
    `\n## Context rules\n\n` +
    `Before starting a slice, check its \`in_scope_globs\` frontmatter against these patterns ` +
    `and read the listed docs for any matching rule.\n\n` +
    lines.join("\n") +
    "\n"
  );
}

export function buildTokens(config: Record<string, any>): Record<string, string> {
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
    contextRulesList: buildContextRulesList(config)
  };
}
