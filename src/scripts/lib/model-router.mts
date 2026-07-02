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

// FEAT-205: slice-shape-aware tier routing.
//
// classify-slice-shape.mts buckets a slice's changed-file set into one of
// five shapes. Trivial/mechanical shapes (docs, config, a single small
// module, test-only) don't need judgment-heavy Opus reasoning — route them
// to the mid tier by default. "none" (mixed file types, large diffs,
// public-surface edits) has NO override: callers fall through to
// phase-based resolveModel() so genuinely complex slices keep whatever
// tier the phase (usually "build") is configured for.
//
// Expressed as data (this table), not per-call-site conditionals — new
// call sites reuse resolveShapeTier() instead of hardcoding a shape check.
export const SHAPE_TIER_MAP: Readonly<Record<string, string | null>> = Object.freeze({
  "doc-update": "sonnet",
  "config-tweak": "sonnet",
  "test-only": "sonnet",
  "single-module-edit": "sonnet",
  none: null
});

/**
 * Resolve the model tier for a classified slice shape (see
 * classify-slice-shape.mts::Shape). Config can override the built-in table
 * per-shape via `loop.modelRouting.byShape.<shape>`; unrecognized shapes and
 * shapes with no override (e.g. "none") return null so the caller falls
 * through to phase-based resolveModel()/FALLBACK_MODEL.
 */
export function resolveShapeTier(
  shape: string,
  config: Record<string, unknown> | null
): string | null {
  const loop = config?.loop as Record<string, unknown> | undefined;
  const routing = loop?.modelRouting as Record<string, unknown> | undefined;
  const overrides = routing?.byShape as Record<string, string> | undefined;
  if (overrides && typeof overrides[shape] === "string") {
    return overrides[shape] as string;
  }
  return SHAPE_TIER_MAP[shape] ?? null;
}

/**
 * Resolve the model for a wave-mode worktree dispatch: shape override first
 * (trivial shapes route to the mid tier), falling back to the phase-based
 * "build" routing (the editor pass wave dispatch stands in for) when the
 * shape has no override. Pure function — no I/O.
 */
export function resolveWaveDispatchModel(
  shape: string,
  config: Record<string, unknown> | null
): string {
  return resolveShapeTier(shape, config) ?? resolveModel("build", config);
}

export function resolveModel(phase: string, config: Record<string, unknown> | null): string {
  const loop = config?.loop as Record<string, unknown> | undefined;
  const routing = loop?.modelRouting as Record<string, string> | undefined;
  if (!routing) return FALLBACK_MODEL;
  return routing[phase] || routing.default || FALLBACK_MODEL;
}

// Returns the configured orchestrator session model, or null if not set.
// Used by startSlice to surface a model-mismatch gate to the orchestrator.
export function resolveOrchestratorModel(config: Record<string, unknown> | null): string | null {
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
export function resolveArchitectModels(config: Record<string, unknown> | null): {
  architectModel: string;
  editorModel: string;
} {
  const cfg = config ?? {};
  return {
    architectModel: resolveModel("architect", cfg) || resolveModel("sliceStart", cfg),
    editorModel: resolveModel("build", cfg)
  };
}
