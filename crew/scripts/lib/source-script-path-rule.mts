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
// This is the DUPLICATE copy. The canonical copy lives at
// src/scripts/lib/source-script-path-rule.mts. The crew-to-root import
// boundary (src/scripts/validate-repo-boundary.mts, zero-entry allowlist
// for crew-to-root imports) forbids crew/ from importing that file
// directly, so crew/scripts/validate-agents.mts (which applies this same
// rule to agents/*.md per its own CI gate) carries this copy instead.
// Mirror any change made to the canonical copy into this file in the same commit.
//
// "Invocation form" (vs. a plain prose mention, which passes):
//   - any occurrence of one of the five paths on a line inside a fenced
//     code block (``` ... ```), regardless of what precedes it on that
//     line; OR
//   - outside a fence, a line whose EFFECTIVE content (after stripping a
//     leading Markdown list/number marker, e.g. "1. " or "- ") is
//     entirely ONE inline-code span (`` `...` ``) whose content either
//       - starts with `bun `, `node `, or `bunx ` immediately followed by
//         one of the five paths, or
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
// optionally preceded by a quote/paren/start-of-string.
const RUNNER_PREFIX_RE = /(?:^|[\s"'(])(?:bun|node|bunx)\s+$/;
// "before" text ends with the plugin-root wrap, e.g. `${CLAUDE_PLUGIN_ROOT}/`.
const PLUGIN_ROOT_WRAP_RE = /\$\{CLAUDE_PLUGIN_ROOT\}\/$/;

const LIST_MARKER_RE = /^\s*(?:[-*+]|\d+\.)\s*/;
const WHOLE_LINE_CODE_SPAN_RE = /^`([^`]*)`$/;

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

/** Scans Markdown `content` for invocation-form references to the five legacy source-script paths. */
export function findSourceScriptPathFindings(content: string): SourceScriptPathFinding[] {
  const findings: SourceScriptPathFinding[] = [];
  const lines = content.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      const match = PATH_RE.exec(line);
      if (match) {
        findings.push({ line: i + 1, path: match[1] as string, snippet: line.trim() });
      }
      continue;
    }
    const span = wholeLineCodeSpan(stripListMarker(line));
    if (span === null) continue;
    const matchedPath = matchedPathInInvocationForm(span);
    if (matchedPath) {
      findings.push({ line: i + 1, path: matchedPath, snippet: span });
    }
  }
  return findings;
}
