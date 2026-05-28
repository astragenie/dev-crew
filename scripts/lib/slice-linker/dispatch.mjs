import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.mjs";
import { locateSliceFile, backlogRoot as resolveBacklogRoot } from "../paths.mjs";
export function buildDispatchInstruction({ sliceId, title, sliceFile, repoPath, resolvedGoal, modelHint = null, featureId = null, sliceContent = null, featureExcerpt = null }) {
    const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;
    const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
    const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
    const modelLine = modelHint
        ? `\n\n> Preferred model: ${modelHint}. Use this model for the build subagent unless the task requires deeper reasoning.`
        : "";
    const lines = [
        `Dispatch /crew:build subagent with this prompt:`,
        "",
        `> Implement ${title}.${sliceRef}${goalLine} Follow the full crew build workflow (frame → implement → review → validate → synthesize). For review, dispatch a \`crew:reviewer\` subagent. For validation, dispatch a \`crew:validator\` subagent. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, pivot through /crew:fix before resuming.${modelLine}`
    ];
    if (sliceContent || featureExcerpt) {
        lines.push("", "## Slice context (pre-read — do not re-read these files)", "");
        if (rel && sliceContent) {
            lines.push(`### Slice: ${rel}`, "", sliceContent);
        }
        if (featureId && featureExcerpt) {
            lines.push("", `### Feature: ${featureId} (excerpt)`, "", featureExcerpt);
        }
    }
    return lines.join("\n");
}
// Locates the slice file under slicesRoot and reads frontmatter + objective
// text. Returns null fields when the slice file is missing — callers fall
// back gracefully (run-brief emits with bare sliceId; dispatchInstruction
// omits goalLine).
export async function readSliceContext(slicesRoot, sliceId) {
    let file = null;
    try {
        file = await locateSliceFile(slicesRoot, sliceId);
    }
    catch {
        file = null;
    }
    if (!file) {
        return { file: null, frontmatter: {}, goal: null };
    }
    const content = await fs.readFile(file, "utf8");
    const frontmatter = parseFrontmatter(content).frontmatter || {};
    const goal = extractObjective(content);
    const scope = extractSection(content, /^##\s+(In\s+scope|Acceptance\s+criteria)\s*$/i, {
        maxLen: 800,
        joinChar: "\n"
    });
    const outOfScope = extractSection(content, /^##\s+Out\s+of\s+scope\s*$/i, {
        maxLen: 400,
        joinChar: "\n"
    });
    return { file, frontmatter, goal, scope, outOfScope, content };
}
export async function readFeatureExcerpt(repoPath, featureId, config) {
    const root = resolveBacklogRoot(repoPath, config);
    for (const dir of ["in-progress", "triaged", "pending", "done"]) {
        const p = path.join(root, dir, `${featureId}.md`);
        const content = await fs.readFile(p, "utf8").catch(() => null);
        if (content) {
            return extractSection(content, /^##\s+Description\s*$/i, { maxLen: 400, joinChar: "\n" });
        }
    }
    return null;
}
export function extractSection(sliceContent, headingPattern, { maxLen = 500, joinChar = " " } = {}) {
    const lines = sliceContent.split(/\r?\n/);
    const startIdx = lines.findIndex((l) => headingPattern.test(l));
    if (startIdx === -1)
        return null;
    const body = [];
    for (let i = startIdx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^##\s+/.test(line))
            break;
        if (line.trim().length === 0 && body.length === 0)
            continue;
        body.push(line);
    }
    const text = body.join(joinChar).trim();
    return text.length > 0 ? text.slice(0, maxLen) : null;
}
function extractObjective(sliceContent) {
    return extractSection(sliceContent, /^##\s+Objective\s*$/i);
}
