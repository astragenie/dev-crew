import path from "node:path";
import { fileURLToPath } from "node:url";
// Types for the runtime-only github-sync modules live in ambient .d.mts
// files alongside this tree (see ../../github-sync.d.mts and
// ../../github-sync/*.d.mts). All imports stay dynamic so tsc does not
// pull the plain-JS implementations into the build graph.
// Helper to resolve github-sync paths for both compiled and src-direct layouts.
// When running under bun directly, src-relative paths need adjustment.
async function importGithubSyncModule(relPath) {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    // Try relative paths in order:
    // 1. Compiled layout: ../../github-sync/... (from scripts/lib/task-store/providers/)
    // 2. Src layout: ../../../../../scripts/lib/github-sync/... (from src/scripts/lib/task-store/providers/)
    const paths = [
        path.resolve(currentDir, "..", "..", "github-sync", relPath),
        path.resolve(currentDir, "..", "..", "..", "..", "..", "scripts", "lib", "github-sync", relPath)
    ];
    for (const modulePath of paths) {
        try {
            // Use file:// URL for import to bypass relative path issues
            return await import(modulePath);
        }
        catch {
            // Continue to next path if this one fails
            continue;
        }
    }
    // If all paths fail, throw the error from the first path
    throw new Error(`Cannot find github-sync module: ${relPath}`);
}
/**
 * GithubProvider — TaskStoreProvider implementation backed by GitHub Issues via the gh CLI.
 *
 * Wraps the existing scripts/lib/github-sync layer behind the TaskStoreProvider interface.
 * Zero new behavior — each method delegates directly to the corresponding github-sync export.
 *
 * When the gh CLI is not installed, methods log a warning and resolve gracefully (no throw),
 * mirroring the existing github-sync.mjs behavior (see lines ~53, 138, 274, 401).
 */
export class GithubProvider {
    repoPath;
    config;
    constructor(repoPath, config = {}) {
        this.repoPath = repoPath;
        this.config = config;
    }
    /** Return the gh executor — allows tests to inject a mock via config.ghExec. */
    _ghExec() {
        return this.config?.ghExec ?? null; // null signals: load default from module
    }
    /**
     * Lazy-load the gh module and return { defaultGhExec, isGhInstalled }.
     * Using dynamic import so tsc does not try to resolve the plain-JS file.
     */
    async _gh() {
        return importGithubSyncModule("gh.mjs");
    }
    async _isInstalled() {
        const injected = this._ghExec();
        const { isGhInstalled, defaultGhExec } = await this._gh();
        return isGhInstalled({ ghExec: injected ?? defaultGhExec });
    }
    async _resolvedExec() {
        const injected = this._ghExec();
        if (injected)
            return injected;
        const { defaultGhExec } = await this._gh();
        return defaultGhExec;
    }
    async _repo() {
        const { detectRepo } = await importGithubSyncModule("repo-detect.mjs");
        return detectRepo(this.config?.github?.repo ?? null, this.repoPath);
    }
    async publishFeature(feat) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping publishFeature");
            return null;
        }
        const { createFeatureIssue } = await importGithubSyncModule("issue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        const milestoneTitle = feat.frontmatter?.phase ? `Phase ${feat.frontmatter.phase}` : null;
        return createFeatureIssue(repo, feat, milestoneTitle, { ghExec });
    }
    async publishSlice(slice, parentExternalId) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping publishSlice");
            return null;
        }
        const { createSliceIssue, attachSubIssue } = await importGithubSyncModule("subissue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        const sliceIssueNum = createSliceIssue(repo, slice, { ghExec });
        if (parentExternalId != null) {
            try {
                attachSubIssue(repo, parentExternalId, sliceIssueNum, { ghExec });
            }
            catch (err) {
                const detail = `${err.message ?? ""} ${err.stderr ?? ""}`;
                if (!detail.includes("422") && !detail.includes("duplicate")) {
                    console.warn(`[GithubProvider] sub-issue attach failed: ${err.message?.split("\n")[0] ?? ""}`);
                }
            }
        }
        return sliceIssueNum;
    }
    async closeSlice(externalId, _reason) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping closeSlice");
            return;
        }
        const { closeSliceIssue } = await importGithubSyncModule("subissue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        closeSliceIssue(repo, externalId, { ghExec });
    }
    async postSliceComment(externalId, body) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping postSliceComment");
            return;
        }
        const { postComment } = await importGithubSyncModule("comment-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        postComment(repo, externalId, body, { ghExec });
    }
    async updateStatus(externalId, status) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping updateStatus");
            return;
        }
        const { updateIssueStatus } = await importGithubSyncModule("issue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        updateIssueStatus(repo, externalId, status, { ghExec });
    }
    async syncPull(repoPath) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping syncPull");
            return { features: [], slices: [] };
        }
        // Import from ../../github-sync.mjs which needs dual-layout resolution
        const githubSync = await importGithubSyncModule("github-sync.mjs");
        const { syncPull: githubSyncPull } = githubSync;
        const ghExec = await this._resolvedExec();
        const result = await githubSyncPull(repoPath, { ghExec, config: this.config });
        return { features: result.changes ?? [], slices: [] };
    }
    async bootstrap(repoPath) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping bootstrap");
            return { features: [] };
        }
        // Import from ../../github-sync.mjs which needs dual-layout resolution
        const githubSync = await importGithubSyncModule("github-sync.mjs");
        const { bootstrapFromGithub } = githubSync;
        const ghExec = await this._resolvedExec();
        const result = await bootstrapFromGithub(repoPath, { ghExec, config: this.config });
        return { features: result.featIds ?? [] };
    }
}
