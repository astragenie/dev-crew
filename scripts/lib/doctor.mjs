// Detect (and with --fix, repair) loop-state divergence: stray trees,
// id collisions, schema-invalid files, config/reality mismatch,
// cross-tree state contradictions. Detection never mutates.
import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { resolveConfig } from "./config-resolver.mjs";
import { artifactRoot, backlogRoot, pathExists } from "./paths.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { validateFeat } from "./state-schemas.mjs";
const execFile = promisify(execFileCb);
const STATES = ["pending", "triaged", "in-progress", "done"];
// Known historical locations a backlog tree can appear in.
const LEGACY_ROOTS = ["docs/backlog", ".claude/artifacts/loop/backlog"];
async function scanTree(root) {
    const out = [];
    for (const state of STATES) {
        const dir = path.join(root, state);
        if (!(await pathExists(dir)))
            continue;
        let entries;
        try {
            entries = await fs.readdir(dir);
        }
        catch {
            continue;
        }
        for (const f of entries) {
            if (!/^FEAT-\d+\.md$/.test(f))
                continue;
            const file = path.join(dir, f);
            const content = await fs.readFile(file, "utf8");
            const { frontmatter } = parseFrontmatter(content);
            out.push({ id: String(frontmatter.id ?? f.replace(".md", "")), state, file, fm: frontmatter });
        }
    }
    return out;
}
async function treePopulated(root) {
    const entries = await scanTree(root);
    return entries.length > 0;
}
async function detectFindings(repoPath, authoritative) {
    const findings = [];
    const authEntries = await scanTree(authoritative);
    const authIds = new Map(authEntries.map((e) => [e.id, e]));
    for (const legacy of LEGACY_ROOTS) {
        const root = path.resolve(repoPath, legacy);
        if (root === authoritative)
            continue;
        if (!(await treePopulated(root)))
            continue;
        findings.push({
            kind: "stray-tree",
            path: root,
            detail: `populated backlog tree outside authoritative root ${authoritative}`
        });
        for (const e of await scanTree(root)) {
            const auth = authIds.get(e.id);
            if (!auth)
                continue;
            findings.push({ kind: "id-collision", path: e.file, detail: `${e.id} exists in both trees` });
            if (auth.state !== e.state) {
                findings.push({
                    kind: "state-contradiction",
                    path: e.file,
                    detail: `${e.id}: ${auth.state} (authoritative) vs ${e.state} (stray)`
                });
            }
        }
    }
    for (const e of authEntries) {
        const check = validateFeat(e.fm);
        if (!check.ok) {
            findings.push({ kind: "schema-invalid", path: e.file, detail: check.issues.join("; ") });
        }
    }
    if (!(await treePopulated(authoritative))) {
        for (const legacy of LEGACY_ROOTS) {
            const root = path.resolve(repoPath, legacy);
            if (root !== authoritative && (await treePopulated(root))) {
                findings.push({
                    kind: "config-mismatch",
                    path: authoritative,
                    detail: `configured root is empty but ${root} is populated`
                });
            }
        }
    }
    return findings;
}
export async function runDoctor(repoPath, opts) {
    const config = opts.config ?? (await resolveConfig(repoPath).catch(() => null));
    const authoritative = path.resolve(backlogRoot(repoPath, config ?? undefined));
    const findings = await detectFindings(repoPath, authoritative);
    let reportPath = null;
    if (opts.fix && findings.length > 0) {
        reportPath = await applyFix(repoPath, config, authoritative, findings);
    }
    return { findings, reportPath };
}
/**
 * Apply fixes for detected findings. Merges stray trees into authoritative root,
 * resolves conflicts based on newest transition, and writes a report before mutations.
 */
async function applyFix(repoPath, config, authoritative, findings) {
    // Ensure doctor artifact directory exists
    const doctorDir = path.join(artifactRoot(repoPath, config), "doctor");
    await fs.mkdir(doctorDir, { recursive: true });
    const conflictsDir = path.join(doctorDir, "conflicts");
    await fs.mkdir(conflictsDir, { recursive: true });
    // Generate timestamp for report
    const now = new Date().toISOString();
    const stamp = now.replace(/:/g, "-").replace(/\./g, "-");
    const reportPath = path.join(doctorDir, `${stamp}-report.md`);
    // Build report BEFORE any mutations
    const reportLines = [];
    reportLines.push(`# Doctor Report — ${now}`);
    reportLines.push(`Repository: ${repoPath}`);
    reportLines.push(`Authoritative root: ${authoritative}`);
    reportLines.push("");
    reportLines.push("## Findings");
    for (const f of findings) {
        reportLines.push(`- [${f.kind}] ${f.path} — ${f.detail}`);
    }
    // Write report first
    await fs.writeFile(reportPath, reportLines.join("\n"));
    // Process stray trees
    const strayTrees = new Set(findings.filter((f) => f.kind === "stray-tree").map((f) => f.path));
    for (const strayRoot of strayTrees) {
        // Scan the stray tree
        const strayEntries = await scanTree(strayRoot);
        const authEntries = await scanTree(authoritative);
        const authIds = new Map(authEntries.map((e) => [e.id, e]));
        for (const strayEntry of strayEntries) {
            const authEntry = authIds.get(strayEntry.id);
            if (!authEntry) {
                // No conflict: move stray to authoritative at same state
                const destStateDir = path.join(authoritative, strayEntry.state);
                await fs.mkdir(destStateDir, { recursive: true });
                const destFile = path.join(destStateDir, path.basename(strayEntry.file));
                await fs.rename(strayEntry.file, destFile);
            }
            else {
                // Conflict: resolve based on newest transition (lastTouched)
                const strayTime = await lastTouched(repoPath, strayEntry.file);
                const authTime = await lastTouched(repoPath, authEntry.file);
                if (strayTime > authTime) {
                    // Stray wins: move it to authoritative, move auth loser to conflicts
                    const winStateDir = path.join(authoritative, strayEntry.state);
                    await fs.mkdir(winStateDir, { recursive: true });
                    const winFile = path.join(winStateDir, path.basename(strayEntry.file));
                    await fs.rename(strayEntry.file, winFile);
                    // Move authoritative loser to conflicts
                    const loserContent = await fs.readFile(authEntry.file, "utf8");
                    const loserName = `${authEntry.id}-${authEntry.state}.md`;
                    const loserPath = path.join(conflictsDir, loserName);
                    await fs.writeFile(loserPath, loserContent);
                    await fs.unlink(authEntry.file);
                }
                else {
                    // Auth wins: move stray loser to conflicts, keep auth
                    const loserContent = await fs.readFile(strayEntry.file, "utf8");
                    const loserName = `${strayEntry.id}-${strayEntry.state}.md`;
                    const loserPath = path.join(conflictsDir, loserName);
                    await fs.writeFile(loserPath, loserContent);
                    await fs.unlink(strayEntry.file);
                }
            }
        }
        // Clean up only the known state dirs (their FEAT content was moved out).
        // Anything else in the stray root (product-backlog.md, READMEs, …) is
        // NOT ours to delete — leave it for manual inspection.
        for (const state of STATES) {
            await fs.rm(path.join(strayRoot, state), { recursive: true, force: true });
        }
        try {
            await fs.rmdir(strayRoot); // succeeds only when nothing else remains
        }
        catch {
            // Non-state files remain — preserved deliberately.
        }
    }
    return reportPath;
}
/**
 * Get the timestamp of the most recent commit that touched a file.
 * Falls back to filesystem mtime if not in git.
 */
async function lastTouched(repoPath, filePath) {
    try {
        // Use git log to get the last commit timestamp for this file
        const relativePath = path.relative(repoPath, filePath);
        const { stdout } = await execFile("git", ["-C", repoPath, "log", "-1", "--format=%cI", "--", relativePath], { timeout: 10_000 });
        const commitTime = stdout.trim();
        if (commitTime) {
            return new Date(commitTime).getTime();
        }
    }
    catch {
        // Not in git or git command failed; fall back to mtime
    }
    // Fall back to filesystem mtime
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
}
