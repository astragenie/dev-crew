// @ts-nocheck — scripts/linear-sync/ is outside tsc rootDir; Bun runs directly.

import type { CrewMention } from "./linear-types.mjs";

const MENTION_REGEX = /@crew\s+(triage|build|status)/i;

/**
 * Parse a `@crew <command>` mention from a Linear comment body.
 *
 * Returns a CrewMention when the body contains a recognised mention, or null
 * when no mention is present. Only the first match is returned — subsequent
 * mentions in the same comment are silently ignored.
 */
export function parseMention(
  body: string,
  issueId: string,
  issueIdentifier: string
): CrewMention | null {
  const match = body.match(MENTION_REGEX);
  if (!match) return null;
  return {
    command: match[1]!.toLowerCase() as CrewMention["command"],
    issueId,
    issueIdentifier,
    rawText: match[0]!
  };
}
