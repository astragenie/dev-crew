import { resolveBearer } from "../token-store.mjs";

/**
 * linear-config — auth + config-schema resolution for LinearProvider.
 *
 * Key material never lives in loop.json. `LINEAR_API_KEY` is checked first;
 * if unset, `token-store.mts`'s user-level bearer store is consulted as a
 * fallback (keyed by the literal appId "linear"), matching the existing
 * env-first/token-store-second auth pattern used elsewhere in this repo.
 *
 * `taskStore.linear.teamKey` / `taskStore.linear.teamId` have no in-code
 * fallback values — this repo's actual defaults ("AST" /
 * "81cea472-33a9-4fbe-a797-147e17c6ca05") are meant to be set explicitly in
 * loop.json, not hardcoded here, so an unconfigured consumer repo fails
 * loudly instead of silently mirroring to Astragenie's workspace.
 */

const LINEAR_TOKEN_STORE_APP_ID = "linear";

export type LinearConfigDisabledReason = "missing_config" | "missing_api_key";

export interface LinearConfig {
  enabled: boolean;
  apiKey: string | null;
  teamKey: string | null;
  teamId: string | null;
  workspace: string | null;
  reason: LinearConfigDisabledReason | null;
  stateMap: Record<string, string>;
}

const CONFIG_HELP =
  'Set taskStore.linear.teamKey (e.g. "AST") and taskStore.linear.teamId ' +
  '(e.g. "81cea472-33a9-4fbe-a797-147e17c6ca05") in .claude/loop.json.';

/** Default backlog-state -> Linear workflow-state name mapping (AC-4). */
export const DEFAULT_LINEAR_STATE_MAP: Readonly<Record<string, string>> = Object.freeze({
  pending: "Backlog",
  triaged: "Todo",
  "in-progress": "In Progress",
  done: "Done"
});

function readStringField(raw: any, field: string): string | null {
  return typeof raw?.[field] === "string" && raw[field].length > 0 ? raw[field] : null;
}

/** Merge taskStore.linear.stateMap overrides onto the default map, per-key. */
function resolveStateMap(raw: any): Record<string, string> {
  const overrides = raw?.stateMap;
  const merged = { ...DEFAULT_LINEAR_STATE_MAP };
  if (!overrides || typeof overrides !== "object") return merged;
  for (const key of Object.keys(DEFAULT_LINEAR_STATE_MAP)) {
    if (typeof overrides[key] === "string" && overrides[key].length > 0) {
      merged[key] = overrides[key];
    }
  }
  return merged;
}

/**
 * Resolve LinearProvider's auth + config schema from a merged loop.json config.
 *
 * Never throws — callers that need "is Linear usable" gating should check
 * `.enabled`; `.reason` distinguishes a config problem from a missing key.
 */
export async function resolveLinearConfig(config: any): Promise<LinearConfig> {
  const raw = config?.taskStore?.linear ?? {};

  if (Object.hasOwn(raw, "apiKey")) {
    console.warn(
      "[linear-config] taskStore.linear.apiKey found in config — ignoring it. " +
        "Key material must not live in config files; set the LINEAR_API_KEY " +
        "environment variable instead (see token-store.mts for the file-backed fallback)."
    );
  }

  const teamKey = readStringField(raw, "teamKey");
  const teamId = readStringField(raw, "teamId");
  const workspace = readStringField(raw, "workspace");
  const stateMap = resolveStateMap(raw);

  if (teamKey == null || teamId == null) {
    console.warn(`[linear-config] taskStore.linear config missing or incomplete — ${CONFIG_HELP}`);
    return {
      enabled: false,
      apiKey: null,
      teamKey,
      teamId,
      workspace,
      reason: "missing_config",
      stateMap
    };
  }

  let apiKey =
    typeof process.env.LINEAR_API_KEY === "string" && process.env.LINEAR_API_KEY.length > 0
      ? process.env.LINEAR_API_KEY
      : null;

  if (!apiKey) {
    apiKey = await resolveBearer(LINEAR_TOKEN_STORE_APP_ID);
  }

  if (!apiKey) {
    console.warn(
      "[linear-config] LINEAR_API_KEY not set and no token-store fallback found " +
        '(~/.astrarunner/tokens.json entry "linear") — LinearProvider disabled.'
    );
    return {
      enabled: false,
      apiKey: null,
      teamKey,
      teamId,
      workspace,
      reason: "missing_api_key",
      stateMap
    };
  }

  return { enabled: true, apiKey, teamKey, teamId, workspace, reason: null, stateMap };
}
