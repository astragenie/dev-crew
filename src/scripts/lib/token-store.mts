// User-level token store for AstraRunner ingest bearer tokens.
//
// Pattern B (FEAT — track via separate decision): repo's .claude/loop.json
// carries identifiers only (appId, tenantId, url). The actual bearer lives
// outside any repo at ~/.astrarunner/tokens.json so it cannot be committed.
//
// File shape (tokens.json and tokens.<env>.json share the same schema):
//   {
//     "version": 1,
//     "tokens": {
//       "<appId-guid>": { "bearer": "lrt_...", "label": "optional", "repoPath": "..." },
//       ...
//     }
//   }
//
// Env-aware lookup (ASTRARUNNER_ENV):
//   resolveBearer(appId, "staging") reads `tokens.staging.json` from the
//   profiles dir by default. The third arg lets the caller pass a custom
//   filename from profiles.json[env].tokensFile so user-configured names
//   (e.g. "tokens.staging-eu.json") are honored:
//
//     resolveBearer(appId, env, profile.tokensFile)
//
//   When an explicit env is supplied and the tier-specific file is missing
//   or has no entry, null is returned WITHOUT falling back to tokens.json.
//   This prevents accidental cross-tier sends — explicit env = explicit tier.
//
//   resolveBearer(appId) (no env arg) reads the default tokens.json exactly
//   as before; existing callers are unaffected.
//
// Lookups fail silent — missing file, malformed JSON, or unknown appId all
// return null. Consumers MUST treat null as "no auth available; skip send".

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface TokenEntry {
  bearer: string;
  label?: string;
  issuedAt?: string;
  repoPath?: string;
}

interface TokenStoreFile {
  version: number;
  tokens: Record<string, TokenEntry>;
}

// Overridable for tests. storePath returns the default (no-env) tokens.json path.
// profilesDir returns the directory that holds all tokens.* files; overriding
// it redirects both storePath and the env-specific file lookup.
export const _internals = {
  storePath: (): string => path.join(os.homedir(), ".astrarunner", "tokens.json"),
  profilesDir: (): string => path.join(os.homedir(), ".astrarunner")
};

async function readTokenFile(filePath: string): Promise<TokenStoreFile | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  let parsed: TokenStoreFile;
  try {
    parsed = JSON.parse(raw) as TokenStoreFile;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.tokens || typeof parsed.tokens !== "object") return null;
  return parsed;
}

function extractBearer(store: TokenStoreFile, appId: string): string | null {
  const entry = store.tokens[appId];
  if (!entry || typeof entry !== "object") return null;
  if (typeof entry.bearer !== "string" || entry.bearer.length === 0) return null;
  return entry.bearer;
}

/**
 * Resolve the bearer token for `appId`.
 *
 * When `env` is provided:
 *   - reads `<profilesDir>/<tokensFile>` if `tokensFile` is supplied, else
 *     falls back to the conventional `tokens.<env>.json`.
 *   - returns null if the file is missing or has no entry — does NOT fall back
 *     to tokens.json. Explicit env = explicit tier, no cross-tier bleed.
 *
 * When `env` is absent:
 *   - reads the default `~/.astrarunner/tokens.json` (unchanged legacy path).
 *   - `tokensFile` is ignored.
 */
export async function resolveBearer(
  appId: string,
  env?: string,
  tokensFile?: string
): Promise<string | null> {
  if (!appId || typeof appId !== "string") return null;

  if (env && typeof env === "string") {
    // Tier-specific lookup. No implicit fallback on miss.
    const filename =
      typeof tokensFile === "string" && tokensFile.length > 0 ? tokensFile : `tokens.${env}.json`;
    const tierFile = path.join(_internals.profilesDir(), filename);
    const store = await readTokenFile(tierFile);
    if (!store) return null;
    return extractBearer(store, appId);
  }

  // Default (no-env) path — identical to previous behaviour.
  const store = await readTokenFile(_internals.storePath());
  if (!store) return null;
  return extractBearer(store, appId);
}
