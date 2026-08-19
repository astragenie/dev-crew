// SLICE-26 (FEAT-006 P5 cutover): outside marker blocks, an adopter's
// CLAUDE.md/AGENTS.md still reference the pre-merge `/runner:`/`/crew:`
// slash-command and `runner:`/`crew:` agent-dispatch namespaces. This module
// rewrites ONLY the forms that are structurally unambiguous dispatch tokens
// — a slash-command invocation, or a namespace:name token wrapped in single
// backticks (the doc convention every template in this repo uses for agent
// names) — and leaves everything else untouched: prose mentions, repo names
// (`runner-plugin`, `dev-team`), and URLs never match either pattern because
// neither is preceded by `/` immediately before the namespace nor wrapped in
// bare backticks the way a dispatch token is.
//
// Deliberately conservative per the slice's ad-hoc dispatch instructions:
// when a bare `runner:xxx`/`crew:xxx` token survives after the two rewrite
// passes (not slash-prefixed, not backtick-wrapped), it is reported back as
// ambiguous rather than guessed at.

export interface AmbiguousToken {
  file: string;
  line: number;
  text: string;
}

export interface TokenRewriteResult {
  text: string;
  ambiguous: AmbiguousToken[];
}

const SLASH_COMMAND_RE = /\/(runner|crew):([a-zA-Z][\w-]*)/g;
const BACKTICK_TOKEN_RE = /`(runner|crew):([a-zA-Z][\w-]*)`/g;
const SUBAGENT_TYPE_RE = /(subagent_type:\s*["']?)(runner|crew):([a-zA-Z][\w-]*)/g;
// Post-rewrite leftover scan: anything still matching a bare namespace:name
// token once the two rewrite passes above have already consumed every
// slash-command and backtick-wrapped occurrence.
const LEFTOVER_RE = /\b(runner|crew):([a-zA-Z][\w-]*)/g;

function rewriteBody(text: string): string {
  return text
    .replace(SLASH_COMMAND_RE, "/devcrew:$2")
    .replace(BACKTICK_TOKEN_RE, "`devcrew:$2`")
    .replace(SUBAGENT_TYPE_RE, "$1devcrew:$3");
}

function findAmbiguous(text: string, file: string): AmbiguousToken[] {
  const found: AmbiguousToken[] = [];
  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    LEFTOVER_RE.lastIndex = 0;
    let match: RegExpExecArray | null = LEFTOVER_RE.exec(line);
    while (match !== null) {
      found.push({ file, line: idx + 1, text: line.trim().slice(0, 160) });
      match = LEFTOVER_RE.exec(line);
    }
  });
  return found;
}

// Rewrites dispatch tokens across the full `text` (a marker-block-free file,
// or a file with no marker blocks to begin with — the caller is responsible
// for regenerating marker blocks separately since that content is already
// rendered from the devcrew template and contains no legacy tokens to catch
// here). Returns the rewritten text plus any bare tokens left unrewritten.
export function rewriteDispatchTokens(text: string, file: string): TokenRewriteResult {
  const rewritten = rewriteBody(text);
  return { text: rewritten, ambiguous: findAmbiguous(rewritten, file) };
}
