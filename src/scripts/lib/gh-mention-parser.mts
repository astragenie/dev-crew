// gh-mention-parser.mts
// Parses @crew mention comments from GitHub PR / issue comment bodies.
//
// Supported intents (case-insensitive, leading whitespace OK):
//   @crew review         — triggers a code review
//   @crew fix <text>     — triggers a fix with optional description
//   @crew explain        — triggers an explanation
//
// Security note: the `body` field for "fix" intent is sanitized by
// stripping backticks and quotes before being returned. The caller MUST
// NOT pass it as a shell argument without further escaping. It is text
// only — not a shell command.
//
// Export surface:
//   parseMention(text: string): ParsedMention | null
//
// CLI surface (called from GitHub Action `run` step):
//   bun src/scripts/lib/gh-mention-parser.mts "<comment body>"
//   Exits 0 with JSON on stdout when a mention is found.
//   Exits 1 (exitCode, not process.exit) when no mention is detected.

export type MentionIntent = "review" | "fix" | "explain";

export interface ParsedMention {
  intent: MentionIntent;
  body: string;
}

// ---------------------------------------------------------------------------
// MENTION_RE — matches `@crew <intent> [optional body]` anywhere in the
// comment text. Flags: case-insensitive (i), multiline (m), dotAll (s).
// Group 1 = intent word, Group 2 = rest of line (may be empty).
// ---------------------------------------------------------------------------
const MENTION_RE = /^\s*@crew\s+(review|fix|explain)([^\n]*)/im;

// Characters that could be misused when the body is interpolated into
// shell scripts or template strings. Strip them out of the fix body.
const UNSAFE_CHARS_RE = /[`'"]/g;

/**
 * Parse a GitHub comment body for an @crew mention.
 *
 * Returns a ParsedMention when a supported intent is found, or null
 * when the comment contains no recognised @crew mention.
 *
 * The `body` field contains sanitized text only (backticks and quotes
 * removed) and MUST NOT be used as a raw shell argument.
 */
export function parseMention(text: string): ParsedMention | null {
  if (typeof text !== "string") return null;

  const match = MENTION_RE.exec(text);
  if (!match) return null;

  const intentRaw = (match[1] ?? "").toLowerCase().trim();
  if (!isValidIntent(intentRaw)) return null;

  const rawBody = (match[2] ?? "").trim();
  // Sanitize: strip backticks and quotes — fix body is text only.
  const body = rawBody.replace(UNSAFE_CHARS_RE, "").trim();

  return { intent: intentRaw, body };
}

function isValidIntent(value: string): value is MentionIntent {
  return value === "review" || value === "fix" || value === "explain";
}

// ---------------------------------------------------------------------------
// CLI entry point — called from GitHub Actions `run` step.
// bun src/scripts/lib/gh-mention-parser.mts "<comment body>"
// ---------------------------------------------------------------------------
if (process.argv[1]?.endsWith("gh-mention-parser.mts")) {
  const commentBody = process.argv[2] ?? "";
  const result = parseMention(commentBody);
  if (result === null) {
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result));
  }
}
