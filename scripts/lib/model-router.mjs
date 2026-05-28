export const MODEL_PHASES = ["sliceStart", "build", "review", "validate", "gradeWrite"];
const FALLBACK_MODEL = "opus";
export function resolveModel(phase, config) {
    const routing = config?.loop?.modelRouting;
    if (!routing)
        return FALLBACK_MODEL;
    return routing[phase] || routing.default || FALLBACK_MODEL;
}
