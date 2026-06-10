// Detect (and with --fix, repair) loop-state divergence: stray trees,
// id collisions, schema-invalid files, config/reality mismatch,
// cross-tree state contradictions. Detection never mutates.
import fs from "node:fs/promises";
import path from "node:path";
import { resolveConfig } from "./config-resolver.mjs";
import { backlogRoot, pathExists } from "./paths.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { validateFeat } from "./state-schemas.mjs";
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
export async function runDoctor(repoPath, opts) {
    const config = opts.config ?? (await resolveConfig(repoPath).catch(() => null));
    const authoritative = path.resolve(backlogRoot(repoPath, config ?? undefined));
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
    let reportPath = null;
    if (opts.fix && findings.length > 0) {
        reportPath = await applyFix();
    }
    return { findings, reportPath };
}
// Task 6 implements this.
async function applyFix() {
    throw new Error("doctor --fix not implemented yet");
}
