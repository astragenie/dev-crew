// source-script-path-rule.mts — FEAT-037 SLICE-58
//
// Shared matcher: detects invocation-form references to the five legacy
// source-script entry points inside product-surface Markdown (commands/,
// agents/, skills/**/SKILL.md, templates/). FEAT-026 shipped self-contained
// dist/ bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js); SLICE-55..58
// rewrote every real invocation across commands/, agents/ (excl.
// agents/3rdparty/), skills/ and templates/ from a source path to
// `bun "${CLAUDE_PLUGIN_ROOT}/dist/<bundle>.js"`. This rule stops a
// source-path invocation from creeping back into that shipped surface.
//
// DUPLICATED at crew/scripts/lib/source-script-path-rule.mts. The
// crew-to-root import boundary (src/scripts/validate-repo-boundary.mts,
// zero-entry allowlist for crew-to-root imports) forbids crew/ from
// importing this file directly, so crew/scripts/validate-agents.mts
// (which must apply this same rule to agents/*.md per its own CI gate)
// carries its own copy. THIS file is the canonical one — mirror any
// change here into the crew/ copy in the same commit.
//
// "Invocation form" (vs. a plain prose mention, which passes):
//   - any occurrence of one of the five paths on a line inside a fenced
//     code block (``` ... ``` or ~~~ ... ~~~ — CommonMark: a fence opened
//     with one character is only closed by a matching line of the SAME
//     character; a stray ~~~ inside an open ``` fence — or vice versa — is
//     ordinary fence content, not a close), regardless of what precedes
//     it on that line; OR
//   - outside a fence, a CommonMark indented code block line (4+ leading
//     spaces, or a leading tab) whose content (after stripping just that
//     indent) is a runner-prefixed or `${CLAUDE_PLUGIN_ROOT}/`-wrapped
//     invocation per the same prefix check as the inline-code-span case
//     below; OR
//   - outside a fence and not indented, a line whose EFFECTIVE content
//     (after stripping a leading Markdown list/number marker, e.g. "1. "
//     or "- ") is entirely ONE inline-code span (`` `...` ``) whose
//     content either
//       - starts with `bun `, `bun.exe `, `node `, or `bunx ` immediately
//         followed by one of the five paths, or
//       - wraps the path as `${CLAUDE_PLUGIN_ROOT}/<path>` (optionally
//         inside quotes).
// A path mentioned mid-sentence in prose — even inside inline backticks,
// e.g. "The regex fallback path (`bun src/scripts/loop.mts backlog
// triage`) was removed ..." — does NOT match, because real invocations in
// this repo are always either a fenced command or a standalone bulleted
// command with nothing else sharing the line (see commands/adopt.md,
// commands/auto.md for the shipped dist/ examples this mirrors).

export const SOURCE_SCRIPT_PATHS = [
  "crew/scripts/crew.mts",
  "src/scripts/loop.mts",
  "crew/scripts/report-to-pr.mts",
  "crew/scripts/prune-artifacts.mts",
  "src/scripts/watch-tick.mts"
] as const;

export interface SourceScriptPathFinding {
  line: number;
  path: string;
  snippet: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PATH_RE = new RegExp(`(${SOURCE_SCRIPT_PATHS.map(escapeRegExp).join("|")})`);

// "before" text ends with a runner word + whitespace, e.g. "bun ", "node ",
// "bun.exe ", optionally preceded by a quote/paren/start-of-string.
const RUNNER_PREFIX_RE = /(?:^|[\s"'(])(?:bun(?:\.exe)?|node|bunx)\s+$/;
// "before" text ends with the plugin-root wrap, e.g. `${CLAUDE_PLUGIN_ROOT}/`.
const PLUGIN_ROOT_WRAP_RE = /\$\{CLAUDE_PLUGIN_ROOT\}\/$/;

const LIST_MARKER_RE = /^\s*(?:[-*+]|\d+\.)\s*/;
const WHOLE_LINE_CODE_SPAN_RE = /^`([^`]*)`$/;
// Opening/closing fence marker: 3+ backticks or 3+ tildes, optionally
// indented up to 3 spaces (CommonMark). Capture group 1's first character
// is the fence type ("`" or "~") used to require a matching close.
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;
// CommonMark indented code block: 4+ leading spaces, or a leading tab.
const INDENTED_CODE_RE = /^(?: {4,}|\t)/;

function stripListMarker(line: string): string {
  return line.replace(LIST_MARKER_RE, "").trim();
}

/** Returns the span's inner content when `trimmed` is entirely one inline-code span, else null. */
function wholeLineCodeSpan(trimmed: string): string | null {
  const match = trimmed.match(WHOLE_LINE_CODE_SPAN_RE);
  return match ? (match[1] ?? "") : null;
}

function matchedPathInInvocationForm(span: string): string | null {
  const match = PATH_RE.exec(span);
  if (!match) return null;
  const before = span.slice(0, match.index);
  if (RUNNER_PREFIX_RE.test(before) || PLUGIN_ROOT_WRAP_RE.test(before)) {
    return match[1] as string;
  }
  return null;
}

/** Returns the fence type ("`" or "~") this line opens/closes with, else null. */
function fenceMarkerOf(line: string): string | null {
  const match = FENCE_RE.exec(line);
  return match ? ((match[1] as string)[0] as string) : null;
}

/** Scans one line already known to be inside an open fence; pushes a finding on a bare path hit. */
function scanFencedLine(
  line: string,
  lineNumber: number,
  findings: SourceScriptPathFinding[]
): void {
  const match = PATH_RE.exec(line);
  if (match) {
    findings.push({ line: lineNumber, path: match[1] as string, snippet: line.trim() });
  }
}

/** Scans one non-fenced, 4-space/tab-indented line for a runner-prefixed invocation. */
function scanIndentedCodeLine(
  line: string,
  lineNumber: number,
  findings: SourceScriptPathFinding[]
): void {
  const matchedPath = matchedPathInInvocationForm(line.trimStart());
  if (matchedPath) {
    findings.push({ line: lineNumber, path: matchedPath, snippet: line.trim() });
  }
}

/** Scans one non-fenced, non-indented line for a whole-line inline-code-span invocation. */
function scanInlineCodeSpanLine(
  line: string,
  lineNumber: number,
  findings: SourceScriptPathFinding[]
): void {
  const span = wholeLineCodeSpan(stripListMarker(line));
  if (span === null) return;
  const matchedPath = matchedPathInInvocationForm(span);
  if (matchedPath) {
    findings.push({ line: lineNumber, path: matchedPath, snippet: span });
  }
}

/** Scans Markdown `content` for invocation-form references to the five legacy source-script paths. */
export function findSourceScriptPathFindings(content: string): SourceScriptPathFinding[] {
  const findings: SourceScriptPathFinding[] = [];
  const lines = content.split("\n");
  let fenceChar: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNumber = i + 1;
    const fenceMarker = fenceMarkerOf(line);
    if (fenceMarker !== null) {
      if (fenceChar === null) {
        fenceChar = fenceMarker;
      } else if (fenceMarker === fenceChar) {
        fenceChar = null;
      }
      // A stray marker of the OTHER fence character inside an open fence
      // doesn't close it — it's ordinary fence content (no path on a bare
      // fence-marker line, so nothing to scan either way).
      continue;
    }
    if (fenceChar !== null) {
      scanFencedLine(line, lineNumber, findings);
      continue;
    }
    if (INDENTED_CODE_RE.test(line)) {
      scanIndentedCodeLine(line, lineNumber, findings);
      continue;
    }
    scanInlineCodeSpanLine(line, lineNumber, findings);
  }
  return findings;
}
