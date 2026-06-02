import type { TaskStoreProvider } from "../provider-interface.mjs";

/**
 * LinearProvider — TaskStoreProvider stub for Linear.app integration.
 *
 * All methods throw "not implemented" — this is a shape-proof stub that
 * confirms the provider interface contract without requiring actual Linear
 * API credentials. A full implementation is a separate FEAT.
 *
 * Constructor accepted for future use: stores repoPath and config so callers
 * can instantiate the same way as GithubProvider.
 */
export class LinearProvider implements TaskStoreProvider {
  constructor(
    public readonly repoPath: string,
    public readonly config: any = {}
  ) {}

  async publishFeature(_feat: any): Promise<never> {
    throw new Error("LinearProvider: publishFeature not implemented");
  }

  async publishSlice(_slice: any, _parentExternalId: any): Promise<never> {
    throw new Error("LinearProvider: publishSlice not implemented");
  }

  async closeSlice(_externalId: any, _reason: string): Promise<never> {
    throw new Error("LinearProvider: closeSlice not implemented");
  }

  async postSliceComment(_externalId: any, _body: string): Promise<never> {
    throw new Error("LinearProvider: postSliceComment not implemented");
  }

  async updateStatus(_externalId: any, _status: string): Promise<never> {
    throw new Error("LinearProvider: updateStatus not implemented");
  }

  async syncPull(_repoPath: string): Promise<never> {
    throw new Error("LinearProvider: syncPull not implemented");
  }

  async bootstrap(_repoPath: string): Promise<never> {
    throw new Error("LinearProvider: bootstrap not implemented");
  }
}
