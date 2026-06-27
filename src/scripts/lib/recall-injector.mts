// Recall injector (runner-plugin#291).
//
// Formats RecallResult[] from memory-recall into a Markdown context block
// suitable for prepending to a slice dispatch instruction.

import type { RecallResult } from "./memory-recall.mjs";

const MAX_BODY_CHARS = 200;

/**
 * Format a label prefix for a recall entry based on its type / content.
 * Priority: use `importance` or `score` to signal relevance tier.
 */
function formatLabel(mem: RecallResult): string {
  const score = mem.importance ?? mem.score;
  if (score !== undefined) {
    return `[${mem.type} ${score.toFixed(2)}]`;
  }
  return `[${mem.type}]`;
}

/** Truncate a string to maxChars, appending "..." when truncated. */
function truncate(text: string, maxChars = MAX_BODY_CHARS): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

/**
 * Format the top-K recalled memories as a Markdown block for injection into
 * a dispatch instruction. Returns empty string when memories is empty — no
 * header added, no whitespace gunk.
 */
export function formatRecallBlock(memories: RecallResult[]): string {
  if (memories.length === 0) return "";

  // Sort by importance ?? score ?? 0 descending.
  const sorted = [...memories].sort((a, b) => {
    const sa = a.importance ?? a.score ?? 0;
    const sb = b.importance ?? b.score ?? 0;
    return sb - sa;
  });

  const lines = sorted.map((mem) => {
    const label = formatLabel(mem);
    const origin = mem.slice_id ? `${mem.slice_id} ` : "";
    const body = truncate(mem.content);
    return `- **${label}** ${origin}${body}`;
  });

  return `## Prior context (from astramem)\n${lines.join("\n")}`;
}
