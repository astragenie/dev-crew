// AstraRunner ingest env-profile reader.
//
// Reads ~/.astrarunner/profiles.json to resolve the ingest URL and
// tier-specific tokens file path for a given ASTRARUNNER_ENV value.
//
// File shape (profiles.json):
//   {
//     "version": 1,
//     "envs": {
//       "local":   { "ingestUrl": "http://localhost:5137",      "tokensFile": "tokens.local.json",   "label": "Local-DEV" },
//       "staging": { "ingestUrl": "https://app-dev.example.com", "tokensFile": "tokens.staging.json", "label": "Stage"    },
//       "prod":    { "ingestUrl": "https://app.example.com",     "tokensFile": "tokens.prod.json",    "label": "PROD"     }
//     }
//   }
//
// Fail-silent contract: missing file, unknown env, or malformed JSON all
// return null. Callers MUST treat null as "profile unavailable; fall through".

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface EnvProfile {
  ingestUrl: string;
  tokensFile: string;
  label: string;
}

interface ProfilesFile {
  version: number;
  envs: Record<string, EnvProfile>;
}

// Overridable for tests — mirrors the _internals pattern used in token-store.
export const _internals = {
  profilesDir: (): string => path.join(os.homedir(), ".astrarunner")
};

/** Read ~/.astrarunner/profiles.json and return the entry for `env`, or null. */
export async function readProfile(env: string): Promise<EnvProfile | null> {
  if (!env || typeof env !== "string") return null;
  const profilesPath = path.join(_internals.profilesDir(), "profiles.json");
  let raw: string;
  try {
    raw = await fs.readFile(profilesPath, "utf8");
  } catch {
    return null;
  }
  let parsed: ProfilesFile;
  try {
    parsed = JSON.parse(raw) as ProfilesFile;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.envs || typeof parsed.envs !== "object") return null;
  const entry = parsed.envs[env];
  if (!entry || typeof entry !== "object") return null;
  if (typeof entry.ingestUrl !== "string" || entry.ingestUrl.length === 0) return null;
  if (typeof entry.tokensFile !== "string" || entry.tokensFile.length === 0) return null;
  return {
    ingestUrl: entry.ingestUrl,
    tokensFile: entry.tokensFile,
    label: typeof entry.label === "string" ? entry.label : env
  };
}
