import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { TaskStoreProvider } from "../provider-interface.mjs";

// Types for the runtime-only github-sync modules live in ambient .d.mts
// files alongside this tree (see ../../github-sync.d.mts and
// ../../github-sync/*.d.mts). All imports stay dynamic so tsc does not
// pull the plain-JS implementations into the build graph.

// Helper to resolve github-sync paths for both compiled and src-direct layouts.
// When running under bun directly, src-relative paths need adjustment.
async function importGithubSyncModule(relPath: string): Promise<any> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Try candidate paths in order:
  // 1. Compiled/co-located layout: ../../github-sync/... (from scripts/lib/task-store/providers/)
  // 2. Src-direct layout, submodules: <repoRoot>/scripts/lib/github-sync/... (gh.mjs, issue-sync.mjs, ...)
  // 3. Src-direct layout, top-level file: <repoRoot>/scripts/lib/github-sync.mjs itself — it is a
  //    SIBLING of the github-sync/ submodule folder, not inside it (SLICE-155 fix: candidate 2 alone
  //    always 404s for relPath === "github-sync.mjs", silently swallowed by the catch below — masked
  //    pre-SLICE-155 because syncPull/bootstrap only reach this call after an _isInstalled() check
  //    that every existing test short-circuits via a throwing mock ghExec).
  const paths = [
    path.resolve(currentDir, "..", "..", "github-sync", relPath),
    path.resolve(
      currentDir,
      "..",
      "..",
      "..",
      "..",
      "..",
      "scripts",
      "lib",
      "github-sync",
      relPath
    ),
    path.resolve(currentDir, "..", "..", "..", "..", "..", "scripts", "lib", relPath)
  ];

  for (const modulePath of paths) {
    try {
      // pathToFileURL is required on Windows — a bare backslash path handed to
      // import() is parsed as a bare specifier, not a filesystem path, and fails.
      return await import(pathToFileURL(modulePath).href);
    } catch {}
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
    return importGithubSyncModule("gh.mjs");
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
    const { detectRepo } = await importGithubSyncModule("repo-detect.mjs");
    return detectRepo(this.config?.github?.repo ?? null, this.repoPath);
  }

  async publishFeature(feat: any): Promise<number | string | null> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping publishFeature");
      return null;
    }
    const { createFeatureIssue } = await importGithubSyncModule("issue-sync.mjs");
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
    const { createSliceIssue, attachSubIssue } = await importGithubSyncModule("subissue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    const sliceIssueNum = createSliceIssue(repo, slice, { ghExec });
    if (parentExternalId != null) {
      try {
        attachSubIssue(repo, parentExternalId, sliceIssueNum, { ghExec });
      } catch (err: any) {
        const detail = `${err.message ?? ""} ${err.stderr ?? ""}`;
        if (!detail.includes("422") && !detail.includes("duplicate")) {
          console.warn(
            `[GithubProvider] sub-issue attach failed: ${err.message?.split("\n")[0] ?? ""}`
          );
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
    const { closeSliceIssue } = await importGithubSyncModule("subissue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    closeSliceIssue(repo, externalId, { ghExec });
  }

  async postSliceComment(externalId: number | string, body: string): Promise<void> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping postSliceComment");
      return;
    }
    const { postComment } = await importGithubSyncModule("comment-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    postComment(repo, externalId, body, { ghExec });
  }

  async updateStatus(externalId: number | string, status: string): Promise<void> {
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping updateStatus");
      return;
    }
    const { updateIssueStatus } = await importGithubSyncModule("issue-sync.mjs");
    const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
    updateIssueStatus(repo, externalId, status, { ghExec });
  }

  async syncPull(repoPath: string): Promise<{ features: any[]; slices: any[] }> {
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

  async bootstrap(repoPath: string): Promise<{ features: any[] }> {
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

  // --- High-level, id-based operations below ---------------------------------
  //
  // These four methods are GithubProvider-specific (not part of the generic
  // TaskStoreProvider interface — Linear has no milestone concept and the CLI
  // `github` subcommand family is inherently GitHub-shaped). They exist so
  // loop.mts's auto-publish call sites and `github` subcommand can route
  // through getProvider() (SLICE-155 / FEAT-251 Phase 2) while staying
  // byte-for-byte identical to the pre-migration direct github-sync.mjs calls:
  // idempotency checks, milestone upserts, and frontmatter stamping all live
  // in github-sync.mjs's publishFeat/publishSlice/publishAll/syncMilestones,
  // which the interface's own publishFeature/publishSlice methods above do
  // NOT replicate (they only create the issue and return its number).

  /**
   * github-sync.mjs's own functions gate on `config.github.enabled` (their
   * pre-existing, still-live legacy check). getProvider() already decided
   * this call should reach GithubProvider — via taskStore.provider:"github"
   * OR the github.enabled back-compat branch (task-store/index.mts) — so by
   * the time a GithubProvider method runs, that decision must be authoritative.
   * Without this override, `taskStore.provider: "github"` set explicitly
   * without ALSO setting `github.enabled: true` would resolve a GithubProvider
   * here and then have every call silently no-op inside github-sync.mjs's own
   * isEnabled() check — a double-gate that breaks FEAT-251 AC-5.
   */
  private _enabledConfig(): any {
    return { ...this.config, github: { ...this.config?.github, enabled: true } };
  }

  async publishFeatureById(
    featId: string
  ): Promise<{ created: boolean; issueNum: number; url: string | null } | null> {
    const { publishFeat } = await importGithubSyncModule("github-sync.mjs");
    const ghExec = await this._resolvedExec();
    return publishFeat(this.repoPath, featId, { ghExec, config: this._enabledConfig() });
  }

  async publishSliceById(
    sliceId: string,
    featId: string
  ): Promise<{ created: boolean; issueNum: number; url: string | null } | null> {
    const { publishSlice } = await importGithubSyncModule("github-sync.mjs");
    const ghExec = await this._resolvedExec();
    return publishSlice(this.repoPath, sliceId, featId, {
      ghExec,
      config: this._enabledConfig()
    });
  }

  async publishAll(): Promise<{ milestones: number; issues: number; subissues: number }> {
    const { publishAll: publishAllImpl } = await importGithubSyncModule("github-sync.mjs");
    const ghExec = await this._resolvedExec();
    return publishAllImpl(this.repoPath, { ghExec, config: this._enabledConfig() });
  }

  async syncMilestones(): Promise<{ milestones: number; updated: number; closed: number }> {
    const { syncMilestones: syncMilestonesImpl } = await importGithubSyncModule("github-sync.mjs");
    const ghExec = await this._resolvedExec();
    return syncMilestonesImpl(this.repoPath, { ghExec, config: this._enabledConfig() });
  }

  async setup(options: { overwrite?: boolean } = {}): Promise<any> {
    const { setupGithubSync } = await importGithubSyncModule("github-sync.mjs");
    return setupGithubSync(this.repoPath, options);
  }

  /**
   * Read-only advisory drift check between GitHub issues and the local
   * backlog — see github-sync.mjs's checkSyncDrift for the contract. Never
   * writes to the local backlog or the tracker (unlike syncPull/bootstrap,
   * which patch/create local FEAT files). Soft-fails like every other method
   * here: gh CLI absent -> warn + a well-shaped "unsupported" result, never
   * a throw.
   */
  async checkDrift(repoPath: string): Promise<{
    supported: boolean;
    reason: string | null;
    checked: number;
    trackerOnly: Array<{ number: number | string; title: string }>;
    localOnly: Array<{ id: string; title: string }>;
    statusMismatches: Array<{
      id: string;
      number: number | string;
      localStatus: string;
      trackerState: string;
    }>;
    bodyDrift: Array<{ id: string; number: number | string; changes: string[] }>;
  }> {
    const empty = {
      supported: false,
      reason: "gh CLI not installed",
      checked: 0,
      trackerOnly: [],
      localOnly: [],
      statusMismatches: [],
      bodyDrift: []
    };
    if (!(await this._isInstalled())) {
      console.warn("[GithubProvider] gh CLI not found — skipping checkDrift");
      return empty;
    }
    const { checkSyncDrift } = await importGithubSyncModule("github-sync.mjs");
    const ghExec = await this._resolvedExec();
    return checkSyncDrift(repoPath, { ghExec, config: this._enabledConfig() });
  }

  /**
   * Best-effort search for a merged PR referencing the given local id (e.g.
   * a FEAT id) — used by `loop github reconcile` (runner#427) to name the
   * merged PR in a close-evidence comment "where resolvable" (per dispatch).
   * Never throws: gh CLI absent, a search failure, or zero results all
   * resolve to null so the caller can still post a comment without a PR
   * link rather than skip the close entirely.
   */
  async findMergedPrForId(
    id: string
  ): Promise<{ number: number; url: string; title: string } | null> {
    if (!(await this._isInstalled())) return null;
    try {
      const [repo, ghExec] = await Promise.all([this._repo(), this._resolvedExec()]);
      const raw = ghExec([
        "pr",
        "list",
        "--repo",
        repo,
        "--state",
        "merged",
        "--search",
        id,
        "--json",
        "number,url,title",
        "--limit",
        "5"
      ]);
      const prs = JSON.parse(raw) as Array<{ number: number; url: string; title: string }>;
      const match = prs.find((pr) => pr.title.includes(id)) ?? prs[0] ?? null;
      return match ? { number: match.number, url: match.url, title: match.title } : null;
    } catch (err: any) {
      console.warn(
        `[GithubProvider] findMergedPrForId(${id}) failed (non-fatal): ${err.message?.split("\n")[0] ?? err}`
      );
      return null;
    }
  }
}
