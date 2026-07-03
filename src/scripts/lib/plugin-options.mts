// Resolve AstraRunner ingest config from either the legacy env vars
// (LOOP_INGEST_URL / LOOP_INGEST_TOKEN / ASTRARUNNER_ENV) OR the Claude Code
// plugin-manager userConfig options, which Claude Code injects as
// CLAUDE_PLUGIN_OPTION_<KEY> env vars.
//
// Precedence: the explicit shell/env override wins over the stored plugin
// config, so an operator can always override a keychain-configured value for a
// single run. This mirrors the mem0 plugin pattern
// (MEM0_API_KEY ?? CLAUDE_PLUGIN_OPTION_API_KEY).
//
// userConfig keys (see .claude-plugin/plugin.json) → injected env var:
//   ingest_url      → CLAUDE_PLUGIN_OPTION_INGEST_URL
//   ingest_token    → CLAUDE_PLUGIN_OPTION_INGEST_TOKEN
//   astrarunner_env → CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV
//
// All resolvers return undefined when neither source is set. Fail-silent
// callers treat undefined as "not configured; skip send".

function firstNonEmpty(...vals: (string | undefined)[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

/** Ingest base URL: LOOP_INGEST_URL, then plugin-manager ingest_url. */
export function resolveIngestUrlOption(): string | undefined {
  return firstNonEmpty(
    process.env["LOOP_INGEST_URL"],
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"]
  );
}

/** Ingest bearer token: LOOP_INGEST_TOKEN, then plugin-manager ingest_token. */
export function resolveIngestTokenOption(): string | undefined {
  return firstNonEmpty(
    process.env["LOOP_INGEST_TOKEN"],
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"]
  );
}

/** Active tier: ASTRARUNNER_ENV, then plugin-manager astrarunner_env. */
export function resolveAstrarunnerEnvOption(): string | undefined {
  return firstNonEmpty(
    process.env["ASTRARUNNER_ENV"],
    process.env["CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"]
  );
}
