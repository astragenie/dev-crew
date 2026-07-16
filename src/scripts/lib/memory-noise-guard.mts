// Sink-level meta-noise guard (Phase 3a memory hygiene,
// .claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md).
//
// Rejects content that is noise ABOUT the memory/tooling surface itself —
// a query echo, model-capability boilerplate, or a bare shell one-liner —
// rather than a durable lesson worth recalling later. Upstream
// astramem-local#371 tracks the daemon-side equivalent of this guard; this
// stays conservative (a false-positive rejection of a real lesson is worse
// than letting a stray noise atom through), so every pattern below is
// exercised against both an exemplar and a legitimate near-miss in
// src/tests/memory-sink.test.mts.

interface NoisePattern {
  name: string;
  pattern: RegExp;
}

/** Table-driven noise classes. Order does not matter — first match wins. */
export const NOISE_PATTERNS: NoisePattern[] = [
  {
    name: "query-echo",
    pattern: /\b(recall_memory|search_memory|agent_profile)\b.*\b(query|search string|k set to)\b/i
  },
  {
    name: "capability-boilerplate",
    pattern: /\bI (cannot|can't|do not have) (access|the ability)\b/i
  },
  {
    name: "training-data-boilerplate",
    pattern: /\bbased on (input and )?training data\b/i
  }
];

/** Runner CLI tools whose bare invocation (no surrounding prose) is noise. */
const COMMAND_TOOLS = new Set(["bun", "bunx", "git", "gh", "npm", "npx"]);

/** Common English words that mark a line as prose, not a shell invocation —
 * a command-line token set never contains these as whole tokens. Keeps the
 * bare-command check from misfiring on prose that merely opens with a tool
 * name (e.g. "Git commits should follow ..."). */
const PROSE_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "should",
  "must",
  "will",
  "would",
  "can",
  "cannot",
  "to",
  "for",
  "and",
  "but",
  "because",
  "this",
  "that",
  "when",
  "before",
  "after",
  "use",
  "using",
  "used",
  "need",
  "needs",
  "needed",
  "always",
  "never",
  "not",
  "if",
  "then",
  "so",
  "with",
  "without",
  "from",
  "lesson",
  "note",
  "remember"
]);

/** A command-token character set: word chars plus the punctuation shell
 * args commonly carry (paths, flags, versions). Deliberately excludes
 * sentence punctuation (commas, quotes, periods-followed-by-space) so
 * prose doesn't slip through disguised as "arguments". */
const COMMAND_TOKEN_RE = /^[\w./:@=+-]+$/;

/** True when `trimmed` is nothing but a shell invocation of one of
 * `COMMAND_TOOLS` — the full content, not a command embedded in prose. */
function looksLikeBareCommand(trimmed: string): boolean {
  if (!trimmed || trimmed.includes("\n")) return false;
  const tokens = trimmed.split(/\s+/);
  const first = tokens[0]?.toLowerCase();
  if (!first || !COMMAND_TOOLS.has(first)) return false;
  return tokens.every((t) => !PROSE_STOPWORDS.has(t.toLowerCase()) && COMMAND_TOKEN_RE.test(t));
}

/** Returns true when `content` is noise that should be rejected before it
 * ever reaches the provider. Pure/cheap — safe to call on every write. */
export function isNoiseContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (NOISE_PATTERNS.some((p) => p.pattern.test(trimmed))) return true;
  return looksLikeBareCommand(trimmed);
}
