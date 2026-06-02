export const MODEL_PHASES = ["sliceStart", "build", "review", "validate", "gradeWrite"];
const FALLBACK_MODEL = "opus";
export function resolveModel(phase, config) {
    const routing = config?.loop?.modelRouting;
    if (!routing)
        return FALLBACK_MODEL;
    return routing[phase] || routing.default || FALLBACK_MODEL;
}
// Returns the configured orchestrator session model, or null if not set.
// Used by startSlice to surface a model-mismatch gate to the orchestrator.
export function resolveOrchestratorModel(config) {
    return config?.loop?.orchestratorModel ?? null;
}
