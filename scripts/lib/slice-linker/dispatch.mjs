import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.mjs";
import { locateSliceFile, backlogRoot as resolveBacklogRoot } from "../paths.mjs";
function buildBudgetLine(dispatchLimits) {
    if (!dispatchLimits)
        return "";
    const preferInline = (dispatchLimits.preferInlineFor || []).join(", ");
    return (`\n\n> **Dispatch budget (hard limit):** max ${dispatchLimits.maxSubagentsPerSlice} subagents this slice. ` +
        `Prefer inline (no subagent dispatch) for: ${preferInline}. ` +
        `Bundle review + validation into one pass when scope is small.`);
}
function appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath = null) {
    if (!sliceContent && !featureExcerpt)
        return;
    lines.push("", "## Slice context (pre-read — do not re-read these files)", "");
    if (rel && sliceContent) {
        lines.push(`### Slice: ${rel}`, "", sliceContent);
    }
    if (featureId && featureExcerpt) {
        lines.push("", `### Feature: ${featureId}`);
        if (featurePath)
            lines.push(`Path: ${featurePath}`);
        lines.push("", featureExcerpt);
    }
}
function appendProgressSignals(lines) {
    lines.push("", "## Progress signals", "", "Emit two advisory line-tags so the parent orchestrator has early visibility into your mode choice and per-AC progress. Advisory only — parent degrades gracefully on absence.", "", "- `[MODE] <single-session|assisted-single-session|team-run>` — emit exactly once, as the first line of your first response after dispatch. Optional free-form note after `—`, e.g. `[MODE] team-run — delegating crew:builder for src/foo/`.", "- `[CHECKPOINT] AC-<N>: <pass|fail|skip> — <≤80 char note>` — emit one per AC AFTER the AC is verified. Status `fail` is the parent's interrupt signal; status `skip` carries a reason in the note.");
}
export function buildDispatchInstruction({ sliceId, title, sliceFile, repoPath, resolvedGoal, featureId = null, sliceContent = null, featureExcerpt = null, featurePath = null, dispatchLimits = null }) {
    const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;
    const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
    const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
    const suffix = buildBudgetLine(dispatchLimits);
    const lines = [
        `Dispatch crew:builder subagent with this prompt:`,
        "",
        `> Implement ${title}.${sliceRef}${goalLine} You own implementation only — frame, edit, run the self-verify gates, and return a write-handoff artifact path. Do NOT dispatch crew:reviewer or crew:validator yourself; the parent loop drives those gates separately after you return. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch crew:reviewer, then crew:validator if behavior changed, then run /loop:slice complete --id ${sliceId}. If a needed cross-cutting change is out of scope, stop and surface it to the parent loop.${suffix}`
    ];
    appendProgressSignals(lines);
    appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath);
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
            const excerpt = extractSection(content, /^##\s+Description\s*$/i, {
                maxLen: 400,
                joinChar: "\n"
            });
            return { path: p, excerpt: excerpt ?? "" };
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
