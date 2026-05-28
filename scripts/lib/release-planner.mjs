import fs from "node:fs/promises";
import path from "node:path";
import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { releasesRoot, backlogRoot } from "./paths.mjs";
// Plans a release: collects all FEAT entries whose target_release matches the
// supplied version, groups them by parent spec, and writes a markdown report
// to docs/releases/v<X.Y.Z>.md.
//
// "Plan" mode: includes pending + triaged + in-progress + done. Surfaces
// readiness — release is "ready to cut" only when every targeted feature is
// in done/. Otherwise lists what's still in flight.
function normalizeVersion(version) {
    if (!version)
        throw new Error("release plan requires --version");
    return version.startsWith("v") ? version : `v${version}`;
}
function statusBadge(state) {
    switch (state) {
        case "done":
            return "✓ shipped";
        case "in-progress":
            return "● in flight";
        case "triaged":
            return "○ triaged";
        case "pending":
            return "○ pending";
        default:
            return state;
    }
}
function groupFeaturesBySpec(features) {
    const grouped = new Map();
    for (const f of features) {
        const sid = f.frontmatter.derived_from || "_standalone_";
        if (!grouped.has(sid))
            grouped.set(sid, []);
        grouped.get(sid).push(f);
    }
    // _standalone_ last; specs in id order.
    const keys = [...grouped.keys()].sort((a, b) => {
        if (a === "_standalone_")
            return 1;
        if (b === "_standalone_")
            return -1;
        return a.localeCompare(b);
    });
    return { grouped, keys };
}
function renderGroupSection(sid, entries, specs) {
    const lines = [];
    if (sid === "_standalone_") {
        lines.push("## Standalone features");
    }
    else {
        const spec = specs.find((s) => s.id === sid);
        const title = spec?.frontmatter?.title || "(unknown spec)";
        const total = spec?.frontmatter?.derived_features?.length || entries.length;
        const done = entries.filter((e) => e.state === "done").length;
        lines.push(`## ${sid}: ${title}`);
        lines.push(`_Coverage in this release: ${done}/${total} done_`);
    }
    lines.push("");
    for (const entry of entries) {
        const title = (entry.body || "")
            .split("\n")
            .find((l) => l.startsWith("# "))
            ?.replace(/^#\s+[A-Z]+-\d+:\s*/, "") || entry.id;
        lines.push(`- **${entry.id}** ${statusBadge(entry.state)} — ${title.trim()}`);
    }
    lines.push("");
    return lines;
}
function renderReadyFooter(version, repoPath, config) {
    const doneRel = path
        .relative(repoPath, path.join(backlogRoot(repoPath, config), "done"))
        .replace(/\\/g, "/");
    return [
        "## Cutting the release",
        "",
        "All targeted features are in `done/`. Recommended next steps:",
        "",
        `1. Tag the commit: \`git tag ${version}\``,
        `2. Push the tag: \`git push origin ${version}\``,
        "3. Move the feature files from `done/` into a versioned subdir if you want to keep `done/` short:",
        `   \`mkdir ${doneRel}/${version} && git mv ${doneRel}/FEAT-*.md ${doneRel}/${version}/\``,
        ""
    ];
}
function buildReleaseBody({ version, features, specs, releaseStatus, generatedAt, repoPath, config }) {
    const { grouped, keys } = groupFeaturesBySpec(features);
    const lines = [
        `# Release ${version}`,
        "",
        `- Status: **${releaseStatus}**`,
        `- Generated: ${generatedAt}`,
        `- Features targeted: ${features.length}`,
        `- Shipped: ${features.filter((f) => f.state === "done").length}`,
        `- In flight: ${features.filter((f) => f.state !== "done").length}`,
        ""
    ];
    for (const sid of keys) {
        const entries = grouped.get(sid).sort((a, b) => a.idNumber - b.idNumber);
        lines.push(...renderGroupSection(sid, entries, specs));
    }
    if (releaseStatus === "READY") {
        lines.push(...renderReadyFooter(version, repoPath, config));
    }
    return lines.join("\n");
}
/**
 * @param {string} repoPath
 * @param {{ version?: string, config?: any }} [options]
 */
export async function planRelease(repoPath, { version, config = null } = {}) {
    const normalized = normalizeVersion(version);
    const [backlog, specs] = await Promise.all([
        listBacklog(repoPath, { config }),
        listSpecs(repoPath, { config })
    ]);
    const targeted = backlog.filter((f) => f.frontmatter.target_release === normalized);
    const releaseStatus = targeted.length === 0
        ? "EMPTY"
        : targeted.every((f) => f.state === "done")
            ? "READY"
            : "IN_PROGRESS";
    const generatedAt = new Date().toISOString();
    const body = buildReleaseBody({
        version: normalized,
        features: targeted,
        specs,
        releaseStatus,
        generatedAt,
        repoPath,
        config
    });
    const releasesDir = releasesRoot(repoPath, config);
    await fs.mkdir(releasesDir, { recursive: true });
    const target = path.join(releasesDir, `${normalized}.md`);
    await fs.writeFile(target, body);
    return {
        version: normalized,
        status: releaseStatus,
        artifactPath: target,
        featureCount: targeted.length,
        shipped: targeted.filter((f) => f.state === "done").length,
        inFlight: targeted.filter((f) => f.state !== "done").length,
        bySpec: [...new Set(targeted.map((f) => f.frontmatter.derived_from).filter(Boolean))]
    };
}
/**
 * @param {string} repoPath
 * @param {{ version?: string, config?: any }} [options]
 */
export async function releaseStatus(repoPath, { version, config = null } = {}) {
    const normalized = normalizeVersion(version);
    const backlog = await listBacklog(repoPath, { config });
    const targeted = backlog.filter((f) => f.frontmatter.target_release === normalized);
    return {
        version: normalized,
        total: targeted.length,
        done: targeted.filter((f) => f.state === "done").length,
        inProgress: targeted.filter((f) => f.state === "in-progress").length,
        triaged: targeted.filter((f) => f.state === "triaged").length,
        pending: targeted.filter((f) => f.state === "pending").length
    };
}
