/**
 * TaskStoreProvider — abstract interface for task/plan persistence backends.
 *
 * Implement this interface to connect the loop to any tracker (GitHub, Linear,
 * Jira, or a plain filesystem). Each method maps to a lifecycle event that the
 * loop ceremony emits when slices and features move through states.
 *
 * All methods are async and MUST resolve without throwing when the backend is
 * unavailable — return null / empty structures and log a warning instead.
 *
 * ## Method contract
 *
 * | Method              | Trigger                          | Returns                         |
 * |---------------------|----------------------------------|---------------------------------|
 * | publishFeature      | FEAT created / first sync        | external ID or null             |
 * | publishSlice        | SLICE created / first sync       | external ID or null             |
 * | closeSlice          | /loop:slice complete             | void                            |
 * | postSliceComment    | /loop:slice complete             | void                            |
 * | updateStatus        | slice-start or status change     | void                            |
 * | syncPull            | /loop github sync-pull           | { features, slices }            |
 * | bootstrap           | /loop github bootstrap           | { features }                    |
 *
 * ## Non-TS implementers
 *
 * If you are writing a JavaScript provider (no TypeScript), implement a plain
 * object or class that satisfies the same shape. The jsdoc above is the
 * canonical contract.
 */
export interface TaskStoreProvider {
  /**
   * Publish a feature to the external tracker.
   * @param feat - parsed feature object (id, frontmatter, body)
   * @returns external ID (e.g. GitHub issue number) or null if skipped
   */
  publishFeature(feat: any): Promise<number | string | null>;

  /**
   * Publish a slice sub-issue and attach it under the parent feature.
   * @param slice - parsed slice object (id, frontmatter, body)
   * @param parentExternalId - the external ID of the parent feature, or null
   * @returns external ID for the slice issue or null if skipped
   */
  publishSlice(
    slice: any,
    parentExternalId: number | string | null
  ): Promise<number | string | null>;

  /**
   * Close a slice in the external tracker (marks it done/completed).
   * @param externalId - the external ID of the slice issue
   * @param reason - human-readable reason / comment body
   */
  closeSlice(externalId: number | string, reason: string): Promise<void>;

  /**
   * Post a completion comment on the slice issue.
   * @param externalId - the external ID of the slice issue
   * @param body - markdown comment body
   */
  postSliceComment(externalId: number | string, body: string): Promise<void>;

  /**
   * Update the status label on a feature or slice issue.
   * @param externalId - the external ID of the issue
   * @param status - new status string (e.g. "in-progress", "done")
   */
  updateStatus(externalId: number | string, status: string): Promise<void>;

  /**
   * Pull remote changes back into the local backlog.
   * @param repoPath - absolute path to the repository root
   * @returns shallow summary of synced features and slices
   */
  syncPull(repoPath: string): Promise<{ features: any[]; slices: any[] }>;

  /**
   * Bootstrap local FEAT files from the remote tracker.
   * @param repoPath - absolute path to the repository root
   * @returns list of features created or updated locally
   */
  bootstrap(repoPath: string): Promise<{ features: any[] }>;
}
