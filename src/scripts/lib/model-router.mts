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

/**
 * Config-level kill-switch: `loop.modelRouting.enabled: false` disables model
 * routing for the repo without deleting the tier config. When disabled, the
 * dispatch-surface resolvers (resolveWaveDispatchModel, resolveArchitectModels)
 * return null — meaning "do NOT pass a model: argument at all", so the
 * dispatched agent's own `model:` frontmatter (agents/*.md) governs instead
 * of a routed or fallback tier. Absent block or absent `enabled` key →
 * routing stays on (backward compatible).
 *
 * dev-team mirrors these semantics in scripts/lib/models/resolve-model.ts
 * (isModelRoutingEnabledInConfig) — keep the two in sync.
 */
export function isModelRoutingEnabled(config: Record<string, unknown> | null): boolean {
  const loop = config?.loop as Record<string, unknown> | undefined;
  const routing = loop?.modelRouting as Record<string, unknown> | undefined;
  return routing?.enabled !== false;
}

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
 *
 * Returns null when routing is disabled (`loop.modelRouting.enabled: false`)
 * — the caller must then OMIT the Agent-tool `model:` field so the agent's
 * own `model:` frontmatter governs.
 */
export function resolveWaveDispatchModel(
  shape: string,
  config: Record<string, unknown> | null
): string | null {
  if (!isModelRoutingEnabled(config)) return null;
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
 *
 * Both fields are null when routing is disabled (`loop.modelRouting.enabled:
 * false`) — dispatches must then omit `model:` so agent frontmatter governs.
 */
export function resolveArchitectModels(config: Record<string, unknown> | null): {
  architectModel: string | null;
  editorModel: string | null;
} {
  const cfg = config ?? {};
  if (!isModelRoutingEnabled(cfg)) {
    return { architectModel: null, editorModel: null };
  }
  return {
    architectModel: resolveModel("architect", cfg) || resolveModel("sliceStart", cfg),
    editorModel: resolveModel("build", cfg)
  };
}
