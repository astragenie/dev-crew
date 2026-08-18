import type { TaskStoreProvider } from "../provider-interface.mjs";

/**
 * NoopProvider — TaskStoreProvider implementation that silently does nothing.
 *
 * Use when taskStore.enabled is false or provider is "noop". All methods
 * resolve immediately with empty / null values. No warnings emitted — callers
 * that want a real backend should configure a non-noop provider.
 */
export class NoopProvider implements TaskStoreProvider {
  /**
   * True when this noop was configured deliberately (taskStore.provider:
   * "noop", taskStore.enabled: false, or no taskStore config at all — the
   * documented default). False when getProvider() fell back to noop because
   * of an unrecognised provider name (SPEC-001 AC-3) — lets callers tell
   * "configured noop" apart from "accidental fallback due to bad config".
   */
  readonly isExplicit: boolean;

  constructor(isExplicit = true) {
    this.isExplicit = isExplicit;
  }

  async publishFeature(_feat: any): Promise<null> {
    return null;
  }

  async publishSlice(_slice: any, _parentExternalId: any): Promise<null> {
    return null;
  }

  async closeSlice(_externalId: any, _reason: string): Promise<void> {
    // noop
  }

  async postSliceComment(_externalId: any, _body: string): Promise<void> {
    // noop
  }

  async updateStatus(_externalId: any, _status: string): Promise<void> {
    // noop
  }

  async syncPull(_repoPath: string): Promise<{ features: any[]; slices: any[] }> {
    return { features: [], slices: [] };
  }

  async bootstrap(_repoPath: string): Promise<{ features: any[] }> {
    return { features: [] };
  }
}
