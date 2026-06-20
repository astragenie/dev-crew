// User-level token store for AstraRunner ingest bearer tokens.
//
// Pattern B (FEAT — track via separate decision): repo's .claude/loop.json
// carries identifiers only (appId, tenantId, url). The actual bearer lives
// outside any repo at ~/.astrarunner/tokens.json so it cannot be committed.
//
// File shape:
//   {
//     "version": 1,
//     "tokens": {
//       "<appId-guid>": { "bearer": "lrt_...", "label": "optional", "issuedAt": "ISO" },
//       ...
//     }
//   }
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
}

interface TokenStoreFile {
  version: number;
  tokens: Record<string, TokenEntry>;
}

// Overridable for tests.
export const _internals = {
  storePath: (): string => path.join(os.homedir(), ".astrarunner", "tokens.json")
};

export async function resolveBearer(appId: string): Promise<string | null> {
  if (!appId || typeof appId !== "string") return null;
  let raw: string;
  try {
    raw = await fs.readFile(_internals.storePath(), "utf8");
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
  const entry = parsed.tokens[appId];
  if (!entry || typeof entry !== "object") return null;
  if (typeof entry.bearer !== "string" || entry.bearer.length === 0) return null;
  return entry.bearer;
}
