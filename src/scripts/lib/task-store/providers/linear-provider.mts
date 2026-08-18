import type { TaskStoreProvider } from "../provider-interface.mjs";
import { resolveLinearConfig, type LinearConfig } from "../linear-config.mjs";
import {
  createComment,
  createIssue,
  defaultLinearTransport,
  describeGraphQLFailure,
  fetchWorkflowStateByName,
  updateIssueState,
  type LinearGraphQLResult,
  type LinearTransport
} from "../linear-graphql.mjs";

/**
 * LinearProvider — TaskStoreProvider implementation backed by Linear's
 * GraphQL API (https://api.linear.app/graphql).
 *
 * Auth/config gating (LINEAR_API_KEY / token-store fallback, taskStore.linear
 * schema) lives in linear-config.mts. The raw GraphQL operations (issueCreate,
 * workflow-state lookup/transition, commentCreate) live in linear-graphql.mts
 * so IssueBroker (FEAT-245) can compose them without pulling in this class.
 * This module owns only the lifecycle mapping (soft-fail warn policy,
 * stateMap application) between the two.
 *
 * Per provider-interface.mts's soft-fail mandate every method resolves
 * without throwing — a disabled config, an HTTP error, or a GraphQL error
 * payload all become a warn + null/empty return, never a rejected promise.
 */
export class LinearProvider implements TaskStoreProvider {
  private _configPromise: Promise<LinearConfig> | null = null;

  constructor(
    public readonly repoPath: string,
    public readonly config: any = {}
  ) {}

  /** Resolve (and memoize) auth/config gating for this provider instance. */
  private _resolveConfig(): Promise<LinearConfig> {
    if (!this._configPromise) {
      this._configPromise = resolveLinearConfig(this.config);
    }
    return this._configPromise;
  }

  /** Injectable transport for tests (config.linearTransport); real network calls otherwise. */
  private _transport(): LinearTransport {
    return this.config?.linearTransport ?? defaultLinearTransport;
  }

  /** True when LINEAR_API_KEY (or its token-store fallback) and taskStore.linear are both resolvable. */
  async isEnabled(): Promise<boolean> {
    const cfg = await this._resolveConfig();
    return cfg.enabled;
  }

  /** Warn + return true when disabled, distinguishing "no config" from "no key". */
  private _warnIfDisabled(cfg: LinearConfig, method: string): boolean {
    if (cfg.enabled) return false;
    const reasonText =
      cfg.reason === "missing_api_key"
        ? "LINEAR_API_KEY not configured (env var or token-store)"
        : "taskStore.linear not configured";
    console.warn(`[LinearProvider] ${method}: not configured — ${reasonText}; skipping.`);
    return true;
  }

  private _warnCallFailed(method: string, result: LinearGraphQLResult): void {
    console.warn(`[LinearProvider] ${method}: call failed — ${describeGraphQLFailure(result)}`);
  }

  private _issueTitle(item: any, fallback: string): string {
    return typeof item?.frontmatter?.title === "string" && item.frontmatter.title.length > 0
      ? item.frontmatter.title
      : (item?.id ?? fallback);
  }

  async publishFeature(feat: any): Promise<number | string | null> {
    const cfg = await this._resolveConfig();
    if (this._warnIfDisabled(cfg, "publishFeature")) return null;

    const result = await createIssue(this._transport(), cfg.apiKey as string, {
      teamId: cfg.teamId as string,
      title: this._issueTitle(feat, "Untitled feature"),
      description: typeof feat?.body === "string" ? feat.body : undefined
    });

    if (!result.ok) {
      this._warnCallFailed("publishFeature", result);
      return null;
    }
    return result.data?.issueCreate?.issue?.identifier ?? null;
  }

  async publishSlice(
    slice: any,
    parentExternalId: number | string | null
  ): Promise<number | string | null> {
    const cfg = await this._resolveConfig();
    if (this._warnIfDisabled(cfg, "publishSlice")) return null;

    const result = await createIssue(this._transport(), cfg.apiKey as string, {
      teamId: cfg.teamId as string,
      title: this._issueTitle(slice, "Untitled slice"),
      description: typeof slice?.body === "string" ? slice.body : undefined,
      parentId: parentExternalId != null ? String(parentExternalId) : null
    });

    if (!result.ok) {
      this._warnCallFailed("publishSlice", result);
      return null;
    }
    return result.data?.issueCreate?.issue?.identifier ?? null;
  }

  /** Closing a slice is a workflow-state transition to the "done" mapping. */
  async closeSlice(externalId: number | string, _reason: string): Promise<void> {
    await this.updateStatus(externalId, "done");
  }

  async postSliceComment(externalId: number | string, body: string): Promise<void> {
    const cfg = await this._resolveConfig();
    if (this._warnIfDisabled(cfg, "postSliceComment")) return;

    const result = await createComment(
      this._transport(),
      cfg.apiKey as string,
      String(externalId),
      body
    );
    if (!result.ok) {
      this._warnCallFailed("postSliceComment", result);
    }
  }

  /**
   * Applies the resolved stateMap (default or taskStore.linear.stateMap
   * override, AC-4) and sends the corresponding workflow-state transition:
   * one query to resolve the named state's id, then one issueUpdate mutation.
   */
  async updateStatus(externalId: number | string, status: string): Promise<void> {
    const cfg = await this._resolveConfig();
    if (this._warnIfDisabled(cfg, "updateStatus")) return;

    const stateName = cfg.stateMap[status] ?? status;
    const transport = this._transport();

    const stateLookup = await fetchWorkflowStateByName(
      transport,
      cfg.apiKey as string,
      cfg.teamId as string,
      stateName
    );
    if (!stateLookup.ok) {
      this._warnCallFailed("updateStatus", stateLookup);
      return;
    }

    const stateId = stateLookup.data?.workflowStates?.nodes?.[0]?.id ?? null;
    if (!stateId) {
      console.warn(
        `[LinearProvider] updateStatus: call failed — no workflow state named "${stateName}" found for team`
      );
      return;
    }

    const updateResult = await updateIssueState(
      transport,
      cfg.apiKey as string,
      String(externalId),
      stateId
    );
    if (!updateResult.ok) {
      this._warnCallFailed("updateStatus", updateResult);
    }
  }

  /**
   * COND-C descope (SLICE-156): Linear has no existing sync engine like
   * github-sync.mjs — full sync needs cursor pagination + team/project
   * filtering + rate-limit handling (~1500 req/h), tracked as a follow-up
   * FEAT. Returns an empty-but-well-shaped result; makes no transport call.
   */
  async syncPull(_repoPath: string): Promise<{ features: any[]; slices: any[] }> {
    console.warn(
      "[LinearProvider] syncPull: out of scope for v1 (COND-C descope) — no Linear sync engine " +
        "yet; returning an empty result. See the FEAT-252 follow-up for cursor-paginated sync."
    );
    return { features: [], slices: [] };
  }

  /** COND-C descope (SLICE-156) — see syncPull. Makes no transport call. */
  async bootstrap(_repoPath: string): Promise<{ features: any[] }> {
    console.warn(
      "[LinearProvider] bootstrap: out of scope for v1 (COND-C descope) — no Linear sync engine " +
        "yet; returning an empty result. See the FEAT-252 follow-up for cursor-paginated sync."
    );
    return { features: [] };
  }
}
