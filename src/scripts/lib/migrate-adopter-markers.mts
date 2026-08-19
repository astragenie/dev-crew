import path from "node:path";

import {
  buildSkillActivationBlock,
  buildTokens,
  readTemplate,
  renderTemplate
} from "./loop-installer-tokens.mjs";

// SLICE-26 (FEAT-006 P5 cutover): adopter repos still carry the pre-merge
// `<!-- runner:start -->`/`<!-- crew:start -->` marker pairs this repo's own
// installer used before the devcrew unification. This module regenerates a
// single `<!-- devcrew:start -->`/`<!-- devcrew:end -->` block in an
// adopter's CLAUDE.md, reusing the installer's own token-rendering pipeline
// (resolveConfig + buildTokens + the claude-md-hard-rules.md template)
// rather than forking its Markdown body — the template itself is off-limits
// for this slice (product surface owned by the installer, not the migrator).

export const DEVCREW_MARKER_START = "<!-- devcrew:start -->";
export const DEVCREW_MARKER_END = "<!-- devcrew:end -->";

const LEGACY_MARKER_PAIRS = [
  { start: "<!-- crew:start -->", end: "<!-- crew:end -->" },
  { start: "<!-- runner:start -->", end: "<!-- runner:end -->" }
];

const ALL_MARKER_PAIRS = [
  ...LEGACY_MARKER_PAIRS,
  { start: DEVCREW_MARKER_START, end: DEVCREW_MARKER_END }
];

interface MarkerSpan {
  start: number;
  end: number;
}

// Collects every occurrence of every known marker literal, then pairs each
// START with the next END token that follows it (regardless of pair type —
// installed marker blocks are never nested, so sequential pairing is safe).
// Tolerant of an orphan trailing start (interrupted install) by extending
// that span to end-of-file, mirroring loop-installer-scaffold.mts's
// applyMarkerBlock tolerance for malformed state.
function findMarkerSpans(content: string): MarkerSpan[] {
  const tokens: Array<{ index: number; length: number; isStart: boolean }> = [];
  for (const { start, end } of ALL_MARKER_PAIRS) {
    for (const [literal, isStart] of [
      [start, true],
      [end, false]
    ] as const) {
      let idx = content.indexOf(literal);
      while (idx !== -1) {
        tokens.push({ index: idx, length: literal.length, isStart });
        idx = content.indexOf(literal, idx + 1);
      }
    }
  }
  tokens.sort((a, b) => a.index - b.index);

  const spans: MarkerSpan[] = [];
  let openStart: number | null = null;
  for (const token of tokens) {
    if (token.isStart) {
      if (openStart === null) openStart = token.index;
      continue;
    }
    if (openStart !== null) {
      spans.push({ start: openStart, end: token.index + token.length });
      openStart = null;
    }
  }
  if (openStart !== null) {
    spans.push({ start: openStart, end: content.length });
  }
  return spans;
}

// Renders the unified devcrew marker block for `repoPath` using the
// installer's own token pipeline. `config` is the adopter's OWN resolved
// config (its existing .claude/loop.json, or .claude/devcrew.json once
// migrated) so path tokens (aiLoopRoot, backlogPath, ...) reflect that
// adopter, not this repo — resolving it is the caller's job
// (migrate-adopter.mts, the script entry point) so this lib module stays out
// of the "no module outside loop.mts calls resolveConfig directly" boundary
// (dispatcher-config.test.mts) the same way loop-installer-tokens.mts's
// buildTokens already does.
export async function renderDevcrewBlock(
  repoPath: string,
  config: Record<string, unknown>
): Promise<string> {
  const skillActivationBlock = await buildSkillActivationBlock(path.join(repoPath, "skills"));
  const tokens = buildTokens(config, { skillActivationBlock });
  const blockTemplate = await readTemplate("claude-md-hard-rules.md");
  const rendered = renderTemplate(blockTemplate, tokens).trim();

  // The template's own literal wrapper is still the pre-rename
  // `<!-- runner:start -->`/`<!-- runner:end -->` pair (this repo's own
  // installer has not renamed it yet — see docs/planning/unification-plan.md).
  // Strip that literal wrapper and re-wrap with the unified devcrew marker so
  // the rendered body stays byte-identical to what /devcrew:install ships,
  // while satisfying AC-4's "exactly one devcrew:start/end block" contract.
  const inner = rendered
    .replace(/^<!-- runner:start -->\s*/, "")
    .replace(/\s*<!-- runner:end -->$/, "");
  return `${DEVCREW_MARKER_START}\n${inner}\n${DEVCREW_MARKER_END}`;
}

// Removes every legacy (`crew:`/`runner:`) marker span AND any pre-existing
// `devcrew:` span from `content`, then inserts one fresh `renderedBlock` at
// the position of the earliest removed span (or appends if none existed).
// Idempotent: a second call against already-migrated content (a single
// devcrew span, nothing else) removes that span and reinserts the same
// freshly-rendered text, producing byte-identical output when the rendered
// block itself is deterministic (SLICE-26 AC-2).
export function replaceMarkerBlocks(content: string, renderedBlock: string): string {
  const spans = findMarkerSpans(content);
  if (spans.length === 0) {
    return `${content.trimEnd()}\n\n${renderedBlock}\n`;
  }
  const firstStart = spans[0]!.start;
  const lastEnd = spans[spans.length - 1]!.end;
  const before = content.slice(0, firstStart).trimEnd();
  // Full trim (not just trimStart) — trailing blank lines/EOF newlines left
  // in `after` would otherwise survive un-touched inside the joined string
  // while the final template literal's own `\n` adds one more on top,
  // growing the file's trailing blank-line count by one on every run (a real
  // AC-2 idempotence regression found migrating 7/18 real adopters).
  const after = content.slice(lastEnd).trim();
  const parts = [before, renderedBlock];
  if (after) parts.push(after);
  return `${parts.join("\n\n")}\n`;
}

// True when `content` already carries exactly one devcrew span and zero
// legacy spans — used by the CLI to short-circuit AC-4's "no leftover
// runner:/crew: blocks" check without re-deriving it from findMarkerSpans.
export function hasOnlyDevcrewMarker(content: string): boolean {
  const hasLegacy = LEGACY_MARKER_PAIRS.some(
    ({ start, end }) => content.includes(start) || content.includes(end)
  );
  if (hasLegacy) return false;
  const startCount = content.split(DEVCREW_MARKER_START).length - 1;
  const endCount = content.split(DEVCREW_MARKER_END).length - 1;
  return startCount === 1 && endCount === 1;
}
