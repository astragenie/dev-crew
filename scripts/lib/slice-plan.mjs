/**
 * slice-plan: codebase research pre-flight for plan-mode.
 *
 * SLICE-10 (FEAT-006 SLICE-A): bare pre-flight primitive — no approval gate.
 * Ships the foundation that FEAT-006 SLICE-B (approval gate) and
 * FEAT-025 (/loop:auto) both depend on.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { slicesRoot as resolveSlicesRoot, ensureDir, locateSliceFile } from "./paths.mjs";
// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
/** Build a UTC timestamp in crew artifact format: YYYYMMDDTHHMMSSz */
function utcTimestamp() {
    return new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d+Z$/, "Z");
}
/** Plans directory for this repo. */
function plansRoot(repoPath) {
    return path.join(repoPath, ".claude/artifacts/loop/plans");
}
/**
 * Extract in-scope globs/paths from the slice content.
 *
 * Priority order:
 *   1. `in_scope_globs` frontmatter field (array of glob strings).
 *   2. Relative paths mentioned in the `## In scope` body section
 *      (lines starting with `- ` that look like a relative file path).
 *
 * Returns an array of path/glob strings, or [] when none found.
 */
function extractInScopeHints(frontmatter, body) {
    // 1. Frontmatter field
    if (Array.isArray(frontmatter.in_scope_globs) && frontmatter.in_scope_globs.length > 0) {
        return frontmatter.in_scope_globs;
    }
    // 2. Body section: extract lines between "## In scope" and the next ## heading.
    const inScopeMatch = body.match(/^##\s+In scope\s*\n([\s\S]*?)(?=\n##\s|\s*$)/im);
    if (!inScopeMatch)
        return [];
    const sectionText = inScopeMatch[1];
    const hints = [];
    for (const line of sectionText.split("\n")) {
        const trimmed = line.trim();
        // Match list items that look like relative paths (contain `/`, `.`, or are identifiable file refs)
        if (!trimmed.startsWith("-"))
            continue;
        const candidate = trimmed.replace(/^-\s+/, "").split(/\s/)[0];
        // A relative path hint: must contain a dot or slash and not be a bare word
        if (candidate && (candidate.includes("/") || candidate.includes("."))) {
            hints.push(candidate);
        }
    }
    return hints;
}
/**
 * Expand a single hint (file path or glob-like pattern) to a list of
 * real absolute file paths that exist under `repoPath`.
 *
 * Supports:
 *   - Literal relative paths (e.g. `src/scripts/lib/slice-plan.mts`)
 *   - Simple `**` prefix globs — resolves by scanning the tree
 *
 * Returns matched absolute paths (de-duped).
 */
async function resolveHint(repoPath, hint) {
    // Literal path check first
    const literal = path.resolve(repoPath, hint);
    try {
        await fs.access(literal);
        return [literal];
    }
    catch {
        // not a literal path
    }
    // Simple glob-style: extract a filename/suffix and scan the repo tree
    const suffix = hint.replace(/^\*+\//, "").replace(/\*/g, "");
    if (!suffix)
        return [];
    const found = [];
    const stack = [repoPath];
    while (stack.length > 0) {
        const dir = stack.pop();
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                // Skip noisy dirs
                if (["node_modules", ".git", "dist", ".claude"].includes(e.name))
                    continue;
                stack.push(full);
                continue;
            }
            if (full.endsWith(suffix) || e.name === suffix) {
                found.push(full);
            }
        }
    }
    return found;
}
/**
 * Read the first N lines of a file as a string.
 */
async function readFirstLines(filePath, n) {
    try {
        const content = await fs.readFile(filePath, "utf8");
        return content.split("\n").slice(0, n).join("\n");
    }
    catch {
        return "";
    }
}
/**
 * Extract exported symbol names from source text.
 * Matches: export function X, export class X, export const X =, export async function X
 */
function extractExports(source) {
    const re = /export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)/g;
    const names = [];
    let m;
    while ((m = re.exec(source)) !== null) {
        names.push(m[1]);
    }
    return names;
}
async function parseSliceFile(sliceFilePath, sliceId) {
    if (!sliceFilePath) {
        return { title: sliceId, objective: "", frontmatter: {}, body: "" };
    }
    const raw = await fs.readFile(sliceFilePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const h1 = body.match(/^#\s+(.+)$/m);
    const title = h1 ? h1[1].trim() : sliceId;
    const objMatch = body.match(/^##\s+Objective\s*\n([\s\S]*?)(?=\n##\s|\s*$)/im);
    const objective = objMatch ? objMatch[1].trim() : "";
    return { title, objective, frontmatter, body };
}
async function runResearchPass(repoPath, hints) {
    const allMatchedPaths = new Set();
    for (const hint of hints) {
        const matches = await resolveHint(repoPath, hint);
        for (const p of matches)
            allMatchedPaths.add(p);
    }
    const entries = [];
    for (const absPath of allMatchedPaths) {
        const relPath = path.relative(repoPath, absPath);
        const preview = await readFirstLines(absPath, 50);
        const exports = extractExports(preview);
        entries.push({ relPath, preview, exports });
    }
    return entries;
}
// -------------------------------------------------------------------
// Section builders
// -------------------------------------------------------------------
function buildContextSection(sliceId, title, objective, frontmatter) {
    const lines = [
        `**Slice:** ${sliceId}`,
        `**Title:** ${title}`,
        `**Status:** ${frontmatter.status || "unknown"}`,
        `**Feature:** ${frontmatter.feature || "n/a"}`,
        ""
    ];
    if (objective) {
        lines.push("**Objective:**", "", objective);
    }
    return lines.join("\n");
}
function buildFilesResearchedSection(entries) {
    if (entries.length === 0) {
        return "_No in-scope file hints found in slice — research pass skipped._";
    }
    const lines = [];
    for (const entry of entries) {
        lines.push(`### \`${entry.relPath}\``);
        if (entry.exports.length > 0) {
            lines.push("", `**Exports:** ${entry.exports.join(", ")}`, "");
        }
        lines.push("```", entry.preview.trim() || "(empty)", "```", "");
    }
    return lines.join("\n");
}
function buildProposedApproachSection(filesResearched) {
    const filesList = filesResearched.length > 0 ? filesResearched.join(", ") : "TBD";
    return [
        "_Fill in during planning — outline the implementation order, key decisions, and risk mitigations._",
        "",
        `**Files in scope:** ${filesList}`
    ].join("\n");
}
function composeArtifact(sliceId, title, sections, filesCount) {
    const generatedAt = new Date().toISOString();
    const artifactFrontmatter = {
        slice: sliceId,
        generated_at: generatedAt,
        files_count: filesCount
    };
    const artifactBody = [
        `# Plan: ${title}`,
        "",
        "## Context",
        "",
        sections.context,
        "",
        "## Files researched",
        "",
        sections.filesResearched,
        "",
        "## Open questions",
        "",
        sections.openQuestions,
        "",
        "## Proposed approach",
        "",
        sections.proposedApproach
    ].join("\n");
    return serializeFrontmatter(artifactFrontmatter, `\n${artifactBody}`);
}
// -------------------------------------------------------------------
// Main export
// -------------------------------------------------------------------
/**
 * Run the codebase research pre-flight for a slice and write a plan artifact.
 *
 * @param repoPath  Absolute path to the repository root.
 * @param sliceId   Slice identifier, e.g. "SLICE-10".
 * @param options   Optional config override.
 *
 * @returns `PlanPreflightResult` with `planPath`, `sections`, and `filesResearched`.
 */
export async function runPlanPreflight(repoPath, sliceId, options = {}) {
    if (!sliceId)
        throw new Error("runPlanPreflight requires sliceId");
    const config = options.config ?? null;
    const slicesRootDir = resolveSlicesRoot(repoPath, config);
    const sliceFilePath = await locateSliceFile(slicesRootDir, sliceId);
    const { title, objective, frontmatter, body } = await parseSliceFile(sliceFilePath, sliceId);
    const hints = extractInScopeHints(frontmatter, body);
    const researchEntries = await runResearchPass(repoPath, hints);
    const filesResearched = researchEntries.map((e) => e.relPath);
    const sections = {
        context: buildContextSection(sliceId, title, objective, frontmatter),
        filesResearched: buildFilesResearchedSection(researchEntries),
        openQuestions: "_Fill in during planning — questions that need answers before implementation can start._",
        proposedApproach: buildProposedApproachSection(filesResearched)
    };
    const artifactContent = composeArtifact(sliceId, title, sections, filesResearched.length);
    const plansDir = plansRoot(repoPath);
    await ensureDir(plansDir);
    const planFilename = `${utcTimestamp()}-plan-${sliceId}.md`;
    const planPath = path.join(plansDir, planFilename);
    await fs.writeFile(planPath, artifactContent, "utf8");
    return { planPath, sections, filesResearched };
}
