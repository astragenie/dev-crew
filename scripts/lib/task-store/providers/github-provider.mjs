// Types for the runtime-only github-sync modules live in ambient .d.mts
// files alongside this tree (see ../../github-sync.d.mts and
// ../../github-sync/*.d.mts). All imports stay dynamic so tsc does not
// pull the plain-JS implementations into the build graph.
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
        return import("../../github-sync/gh.mjs");
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
        const { detectRepo } = await import("../../github-sync/repo-detect.mjs");
        return detectRepo(this.config?.github?.repo ?? null, this.repoPath);
    }
    async publishFeature(feat) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping publishFeature");
            return null;
        }
        const { createFeatureIssue } = await import("../../github-sync/issue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        const milestoneTitle = feat.frontmatter?.phase ? `Phase ${feat.frontmatter.phase}` : null;
        return createFeatureIssue(repo, feat, milestoneTitle, { ghExec });
    }
    async publishSlice(slice, parentExternalId) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping publishSlice");
            return null;
        }
        const { createSliceIssue, attachSubIssue } = await import("../../github-sync/subissue-sync.mjs");
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
        const { closeSliceIssue } = await import("../../github-sync/subissue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        closeSliceIssue(repo, externalId, { ghExec });
    }
    async postSliceComment(externalId, body) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping postSliceComment");
            return;
        }
        const { postComment } = await import("../../github-sync/comment-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        postComment(repo, externalId, body, { ghExec });
    }
    async updateStatus(externalId, status) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping updateStatus");
            return;
        }
        const { updateIssueStatus } = await import("../../github-sync/issue-sync.mjs");
        const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
        updateIssueStatus(repo, externalId, status, { ghExec });
    }
    async syncPull(repoPath) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping syncPull");
            return { features: [], slices: [] };
        }
        const { syncPull: githubSyncPull } = await import("../../github-sync.mjs");
        const ghExec = await this._resolvedExec();
        const result = await githubSyncPull(repoPath, { ghExec, config: this.config });
        return { features: result.changes ?? [], slices: [] };
    }
    async bootstrap(repoPath) {
        if (!(await this._isInstalled())) {
            console.warn("[GithubProvider] gh CLI not found — skipping bootstrap");
            return { features: [] };
        }
        const { bootstrapFromGithub } = await import("../../github-sync.mjs");
        const ghExec = await this._resolvedExec();
        const result = await bootstrapFromGithub(repoPath, { ghExec, config: this.config });
        return { features: result.featIds ?? [] };
    }
}
