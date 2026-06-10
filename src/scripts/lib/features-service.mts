// Simple feature toggle service for loop behavior.
// Features are named flags read from config.features.<name>.enabled.
//
// Default policy: DEFAULT-ON. Missing features block, missing entry, or
// malformed entry all resolve to enabled=true (preserving current behavior;
// disabling must be explicit). This fail-safe approach avoids accidentally
// disabling gates due to config drift or typos.
//
// Every gate evaluation emits a diagnostic line on stderr (feature name +
// resolved state) so stdout stays a clean machine-readable channel.

/** Union of all known feature names. Add new names here as consumers are added. */
export type FeatureName = "redundant-read-stop";

/**
 * Check if a feature is enabled.
 *
 * Reads config.features?.[feature]?.enabled.
 * Returns true if:
 *   - config is null/undefined
 *   - config.features is missing
 *   - config.features[feature] is missing
 *   - config.features[feature].enabled is not a boolean (malformed)
 *
 * Returns false if:
 *   - config.features[feature].enabled is explicitly false
 *
 * This default-ON policy ensures backward compatibility — features must be
 * explicitly disabled in config to be gated off.
 */
export function isEnabled(feature: FeatureName, config: Record<string, any> | null): boolean {
  const enabled =
    config &&
    typeof config === "object" &&
    config.features &&
    typeof config.features === "object" &&
    feature in config.features &&
    config.features[feature] &&
    typeof config.features[feature] === "object" &&
    typeof config.features[feature].enabled === "boolean"
      ? config.features[feature].enabled
      : true;

  // Emit a diagnostic line on stderr (NOT stdout) so machine-readable CLI
  // JSON output stays clean. Mirrors dispatch-trace.mts's stderr convention.
  process.stderr.write(`[features] ${feature}: ${enabled ? "enabled" : "disabled"}\n`);

  return enabled;
}
