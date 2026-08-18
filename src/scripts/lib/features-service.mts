// Feature toggle service for runner behavior.
// Features are named flags read from config.features.<name>.enabled.
//
// Default policy: DEFAULT-ON. Missing features block, missing entry, or
// malformed entry all resolve to the registry's declared `default` (every
// entry currently defaults to true, preserving current behavior; disabling
// must be explicit). This fail-safe approach avoids accidentally disabling
// gates due to config drift or typos.
//
// Every gate evaluation emits a diagnostic line on stderr (feature name +
// resolved state) so stdout stays a clean machine-readable channel.
//
// Shape mirrors crew's sibling registry (scripts/lib/features-service.ts) —
// {version, default, description, scope, owner, since} — so the two
// registries can merge into one kernel service in Phase 2 (P1.0 of the
// architecture-hardening plan).

/**
 * Per-feature metadata. Each feature carries its own SemVer so we can
 * deprecate or rename one without touching the others. Add a new entry
 * here when a feature ships; bump `version` when you change its semantics.
 */
export interface FeatureMeta {
  version: string;
  default: boolean;
  description: string;
  scope: "runner" | "shared";
  owner: string;
  since: string;
  deprecates?: string[];
}

export const FEATURES: Readonly<Record<string, FeatureMeta>> = {
  "redundant-read-stop": {
    version: "1.0.0",
    default: true,
    description:
      "Warn/stop the loop when a session re-reads the same file content past the configured cap.",
    scope: "runner",
    owner: "platform",
    since: "0.37.0"
  },
  "dispatch-guard-block": {
    version: "1.0.0",
    default: true,
    description:
      "guard-feat-dispatch enforcement level: exit-2 (block) when true, warn-only (exit 0) when false.",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  },
  "close-refusal": {
    version: "1.0.0",
    default: true,
    description:
      "GATE_FAILED_AT_CLOSE gate at slice-close time. Registry entry lands in P1.0; consumer wiring lands in P1.4.",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  },
  "snapshot-autoregen": {
    version: "1.0.0",
    default: true,
    description:
      "Auto-regenerate the loop snapshot inside closeSlice. Registry entry lands in P1.0; consumer wiring lands in P1.6.",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  },
  "learnings-capture": {
    version: "1.0.0",
    default: true,
    description:
      "Capture slice-grade lessons into learnings.jsonl from writeGrade. Registry entry lands in P1.0; consumer wiring lands in P1.11.",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  },
  "version-check": {
    version: "1.0.0",
    default: true,
    description: "SessionStart hook: plugin version drift warning (bun + marketplace checks).",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  },
  "bootstrap-context": {
    version: "1.0.0",
    default: true,
    description: "SessionStart hook: inject compact HARD RULES bootstrap context.",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  },
  "parallel-fe-be-variant": {
    version: "1.0.0",
    default: true,
    description:
      "pickBuilderVariant fe+be two-agent parallel dispatch route. When disabled, fe+be tags fall through to the fullstack single-agent variant.",
    scope: "runner",
    owner: "platform",
    since: "0.61.0"
  }
} as const;

export type FeatureName = keyof typeof FEATURES;

export function getFeatureMeta(name: string): FeatureMeta | undefined {
  return FEATURES[name as FeatureName];
}

export function listFeatures(): ReadonlyArray<{ name: string } & FeatureMeta> {
  return Object.entries(FEATURES).map(([name, meta]) => ({ name, ...meta }));
}

/** Read loopConfig.features[name].enabled if it's a well-formed boolean entry, else undefined. */
function readExplicitOverride(name: string, loopConfig: unknown): boolean | undefined {
  if (!loopConfig || typeof loopConfig !== "object") return undefined;
  const features = (loopConfig as Record<string, unknown>).features;
  if (!features || typeof features !== "object") return undefined;
  const entry = (features as Record<string, unknown>)[name];
  if (!entry || typeof entry !== "object") return undefined;
  const enabled = (entry as Record<string, unknown>).enabled;
  return typeof enabled === "boolean" ? enabled : undefined;
}

/**
 * Check if a feature is enabled.
 *
 * Reads loopConfig.features?.[name]?.enabled.
 * Returns true if:
 *   - loopConfig is null/undefined
 *   - loopConfig.features is missing
 *   - loopConfig.features[name] is missing
 *   - loopConfig.features[name].enabled is not a boolean (malformed)
 *   (falls back to the registry's declared default, or true when name is unregistered)
 *
 * Returns false if:
 *   - loopConfig.features[name].enabled is explicitly false
 *
 * This default-ON policy ensures backward compatibility — features must be
 * explicitly disabled in config to be gated off.
 */
export function isFeatureEnabled(name: string, loopConfig: unknown): boolean {
  const registryDefault = FEATURES[name as FeatureName]?.default ?? true;
  const override = readExplicitOverride(name, loopConfig);
  const enabled = override ?? registryDefault;

  // Emit a diagnostic line on stderr (NOT stdout) so machine-readable CLI
  // JSON output stays clean. Mirrors dispatch-trace.mts's stderr convention.
  process.stderr.write(`[features] ${name}: ${enabled ? "enabled" : "disabled"}\n`);
  return enabled;
}

/**
 * Back-compat alias for the original FEAT-170 API. Existing consumers
 * (redundant-read-detector.mts) call `isEnabled(feature, config)` — kept as
 * a thin wrapper over `isFeatureEnabled` so no call sites need to change.
 */
export function isEnabled(feature: FeatureName, config: Record<string, any> | null): boolean {
  return isFeatureEnabled(feature, config);
}
