import type { TaskStoreProvider } from "../provider-interface.mjs";

// All github-sync modules are plain .mjs files with no TypeScript source.
// They live under scripts/lib/github-sync/ (already compiled) and are
// imported dynamically so tsc does not try to resolve their types.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — github-sync.mjs has no TypeScript source; exists at runtime

/**
 * GithubProvider — TaskStoreProvider implementation backed by GitHub Issues via the gh CLI.
 *
 * Wraps the existing scripts/lib/github-sync layer behind the TaskStoreProvider interface.
 * Zero new behavior — each method delegates directly to the corresponding github-sync export.
 *
 * When the gh CLI is not installed, methods log a warning and resolve gracefully (no throw),
 * mirroring the existing github-sync.mjs behavior (see lines ~53, 138, 274, 401).
 */
export class GithubProvider implements TaskStoreProvider {
  constructor(
    public readonly repoPath: string,
    public readonly config: any = {}
  ) {}

  /** Return the gh executor — allows tests to inject a mock via config.ghExec. */
  private _ghExec() {
    return this.config?.ghExec ?? null; // null signals: load default from module
  }

  /**
   * Lazy-load the gh module and return { defaultGhExec, isGhInstalled }.
   * Using dynamic import so tsc does not try to resolve the plain-JS file.
   */
  private async _gh(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return import("../../github-sync/gh.mjs");
  }

  private async _isInstalled(): Promise<boolean> {
    const injected = this._ghExec();
    const { isGhInstalled, defaultGhExec } = await this._gh();
    return isGhInstalled({ ghExec: injected ?? defaultGhExec });
  }

  private async _resolvedExec(): Promise<any> {
    const injected = this._ghExec();
    if (injected) return injected;
    const { defaultGhExec } = await this._gh();
    return defaultGhExec;
  }

  private async _repo(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { detectRepo } = await import("../../github-sync/repo-detect.mjs");
    return detectRepo(this.config?.github?.repo ?? null, this.repoPath);
  }

  async publishFeature(feat: any): Promise<number | string | null> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping publishFeature");
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { createFeatureIssue } = await import("../../github-sync/issue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    const milestoneTitle = feat.frontmatter?.phase ? `Phase ${feat.frontmatter.phase}` : null;
    return createFeatureIssue(repo, feat, milestoneTitle, { ghExec });
  }

  async publishSlice(
    slice: any,
    parentExternalId: number | string | null
  ): Promise<number | string | null> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping publishSlice");
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { createSliceIssue, attachSubIssue } = await import("../../github-sync/subissue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    const sliceIssueNum = createSliceIssue(repo, slice, { ghExec });
    if (parentExternalId != null) {
      try {
        attachSubIssue(repo, parentExternalId, sliceIssueNum, { ghExec });
      } catch (err: any) {
        const detail = `${err.message ?? ""} ${err.stderr ?? ""}`;
        if (!detail.includes("422") && !detail.includes("duplicate")) {
          console.warn(`[GithubProvider] sub-issue attach failed: ${err.message?.split("\n")[0] ?? ""}`);
        }
      }
    }
    return sliceIssueNum;
  }

  async closeSlice(externalId: number | string, _reason: string): Promise<void> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping closeSlice");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { closeSliceIssue } = await import("../../github-sync/subissue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    closeSliceIssue(repo, externalId, { ghExec });
  }

  async postSliceComment(externalId: number | string, body: string): Promise<void> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping postSliceComment");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { postComment } = await import("../../github-sync/comment-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    postComment(repo, externalId, body, { ghExec });
  }

  async updateStatus(externalId: number | string, status: string): Promise<void> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping updateStatus");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { updateIssueStatus } = await import("../../github-sync/issue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    updateIssueStatus(repo, externalId, status, { ghExec });
  }

  async syncPull(repoPath: string): Promise<{ features: any[]; slices: any[] }> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping syncPull");
      return { features: [], slices: [] };
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { syncPull: githubSyncPull } = await import("../../github-sync.mjs");
    const ghExec = await this._resolvedExec();
    const result = await githubSyncPull(repoPath, { ghExec, config: this.config });
    return { features: result.changes ?? [], slices: [] };
  }

  async bootstrap(repoPath: string): Promise<{ features: any[] }> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping bootstrap");
      return { features: [] };
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { bootstrapFromGithub } = await import("../../github-sync.mjs");
    const ghExec = await this._resolvedExec();
    const result = await bootstrapFromGithub(repoPath, { ghExec, config: this.config });
    return { features: result.featIds ?? [] };
  }
}
