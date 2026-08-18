// Agent prompt-version resolver (runner-plugin#288).
//
// Returns the short git sha7 of the most recent commit that touched a given
// agent markdown file. Used to stamp GEPA memory payloads with a
// `prompt_version` field so training consumers can correlate model behaviour
// against the exact agent prompt revision that produced it.
//
// Cached per process via a Map<agentName, sha7> — git is only called once
// per agent name per CLI invocation.

import { gitText } from "./run-git.mjs";

const _cache = new Map<string, string>();

/** Test seam: reset per-process cache. */
export function _resetVersionCache(): void {
  _cache.clear();
}

/**
 * Return the short git sha7 (7 hex chars) of the last commit that touched
 * `agents/<agentName>.md`. Falls back to `'unknown'` on git failure, missing
 * file, or empty output. Caches the result per agentName for the process
 * lifetime.
 */
export async function getPromptVersion(agentName: string): Promise<string> {
  const cached = _cache.get(agentName);
  if (cached !== undefined) return cached;

  const version = await resolveVersion(agentName);
  _cache.set(agentName, version);
  return version;
}

async function resolveVersion(agentName: string): Promise<string> {
  const sha = await gitText(["log", "-1", "--format=%h", `agents/${agentName}.md`]);
  return sha !== null && /^[0-9a-f]{7,}$/.test(sha) ? sha.slice(0, 7) : "unknown";
}
