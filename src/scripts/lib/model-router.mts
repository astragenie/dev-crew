export const MODEL_PHASES = [
  "sliceStart",
  "architect",
  "build",
  "review",
  "validate",
  "gradeWrite"
];

const FALLBACK_MODEL = "opus";

export function resolveModel(phase, config) {
  const routing = config?.loop?.modelRouting;
  if (!routing) return FALLBACK_MODEL;
  return routing[phase] || routing.default || FALLBACK_MODEL;
}

// Returns the configured orchestrator session model, or null if not set.
// Used by startSlice to surface a model-mismatch gate to the orchestrator.
export function resolveOrchestratorModel(config): string | null {
  return config?.loop?.orchestratorModel ?? null;
}

/**
 * Resolve the architect and editor models for the two-model split.
 *
 * - architectModel: `modelRouting.architect` → `modelRouting.sliceStart` → opus (design pass)
 * - editorModel:    `modelRouting.build` → `modelRouting.default` → opus (coding pass)
 *
 * Default split: architect=opus, editor=sonnet (when loop.json ships the standard preset).
 */
export function resolveArchitectModels(config: any): {
  architectModel: string;
  editorModel: string;
} {
  return {
    architectModel: resolveModel("architect", config) || resolveModel("sliceStart", config),
    editorModel: resolveModel("build", config)
  };
}
