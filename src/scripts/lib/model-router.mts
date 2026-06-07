export const MODEL_PHASES = [
  "sliceStart",
  "architect",
  "build",
  "review",
  "validate",
  "gradeWrite",
  "decompose",
  "copywriter",
  "docwriter"
];

const FALLBACK_MODEL = "opus";

export function resolveModel(phase: string, config: Record<string, unknown>): string {
  const loop = config?.loop as Record<string, unknown> | undefined;
  const routing = loop?.modelRouting as Record<string, string> | undefined;
  if (!routing) return FALLBACK_MODEL;
  return routing[phase] || routing.default || FALLBACK_MODEL;
}

// Returns the configured orchestrator session model, or null if not set.
// Used by startSlice to surface a model-mismatch gate to the orchestrator.
export function resolveOrchestratorModel(config: Record<string, unknown>): string | null {
  const loop = config?.loop as Record<string, unknown> | undefined;
  return (loop?.orchestratorModel as string) ?? null;
}

/**
 * Resolve the architect and editor models for the two-model split.
 *
 * - architectModel: `modelRouting.architect` → `modelRouting.sliceStart` → opus (design pass)
 * - editorModel:    `modelRouting.build` → `modelRouting.default` → opus (coding pass)
 *
 * Default split: architect=opus, editor=sonnet (when loop.json ships the standard preset).
 */
export function resolveArchitectModels(config: Record<string, unknown>): {
  architectModel: string;
  editorModel: string;
} {
  return {
    architectModel: resolveModel("architect", config) || resolveModel("sliceStart", config),
    editorModel: resolveModel("build", config)
  };
}
