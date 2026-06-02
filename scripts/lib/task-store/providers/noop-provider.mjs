/**
 * NoopProvider — TaskStoreProvider implementation that silently does nothing.
 *
 * Use when taskStore.enabled is false or provider is "noop". All methods
 * resolve immediately with empty / null values. No warnings emitted — callers
 * that want a real backend should configure a non-noop provider.
 */
export class NoopProvider {
    async publishFeature(_feat) {
        return null;
    }
    async publishSlice(_slice, _parentExternalId) {
        return null;
    }
    async closeSlice(_externalId, _reason) {
        // noop
    }
    async postSliceComment(_externalId, _body) {
        // noop
    }
    async updateStatus(_externalId, _status) {
        // noop
    }
    async syncPull(_repoPath) {
        return { features: [], slices: [] };
    }
    async bootstrap(_repoPath) {
        return { features: [] };
    }
}
