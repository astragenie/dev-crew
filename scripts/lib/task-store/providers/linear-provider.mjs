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
export class LinearProvider {
    repoPath;
    config;
    constructor(repoPath, config = {}) {
        this.repoPath = repoPath;
        this.config = config;
    }
    async publishFeature(_feat) {
        throw new Error("LinearProvider: publishFeature not implemented");
    }
    async publishSlice(_slice, _parentExternalId) {
        throw new Error("LinearProvider: publishSlice not implemented");
    }
    async closeSlice(_externalId, _reason) {
        throw new Error("LinearProvider: closeSlice not implemented");
    }
    async postSliceComment(_externalId, _body) {
        throw new Error("LinearProvider: postSliceComment not implemented");
    }
    async updateStatus(_externalId, _status) {
        throw new Error("LinearProvider: updateStatus not implemented");
    }
    async syncPull(_repoPath) {
        throw new Error("LinearProvider: syncPull not implemented");
    }
    async bootstrap(_repoPath) {
        throw new Error("LinearProvider: bootstrap not implemented");
    }
}
