// classify-parser.mts — parser for the constrained key:value block that the
// loop:architect agent returns when asked to classify a slice for the
// orchestrate-slice router.
//
// Output contract (from the classify prompt):
//   tags: [<label>, ...]
//   needs_contract: <true|false>
//   needs_ux: <true|false>
//
// Note: `stack` and `surface` are no longer FEAT-level fields. Project-level
// stack identity now lives in `scripts/presets/*.json` (consumed by
// `bun src/scripts/loop.mts resolve-skills`). The parser tolerates input lines
// for those fields (architect may still emit them transitionally) but does
// not surface them on the result — callers must not propagate stack/surface
// into FEAT or slice frontmatter.
//
// The parser is tolerant: it scans every line for recognisable patterns and
// ignores prose, headings, blank lines. Unrecognised or missing fields default
// to [] / null so callers can safely spread the result into frontmatter.

export interface ClassifyResult {
  tags: string[];
  needs_contract: boolean | null;
  needs_ux: boolean | null;
}

// Module-scope regex constants for hot-path functions (Win 6 — perf).
const QUOTE_STRIP_RE = /^["']|["']$/g;
const TAGS_LINE_RE = /^tags:\s*(.+)$/i;
const CONTRACT_LINE_RE = /^needs_contract:\s*(.+)$/i;
const UX_LINE_RE = /^needs_ux:\s*(.+)$/i;

const VALID_TAGS = new Set([
  "api-change",
  "storage",
  "workflow",
  "ux",
  "auth",
  "infra",
  "test",
  "docs",
  "refactor"
]);

function parseTags(raw: string): string[] {
  // Accept inline array: [a, b, c] or bare comma-separated: a, b, c
  let inner = raw.trim();
  if (inner.startsWith("[") && inner.endsWith("]")) {
    inner = inner.slice(1, -1);
  }
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((t) => t.trim().replace(QUOTE_STRIP_RE, ""))
    .filter((t) => t.length > 0);
}

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/**
 * Parse a classify-output block returned by loop:architect.
 *
 * Always returns a value — never throws. If the input is empty or
 * contains no recognisable fields, returns the zero-value defaults.
 */
export function parseClassifyOutput(raw: string): ClassifyResult {
  const result: ClassifyResult = {
    tags: [],
    needs_contract: null,
    needs_ux: null
  };
  if (!raw || typeof raw !== "string") return result;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // tags: [api-change, storage] or tags: api-change, storage
    const tagsMatch = trimmed.match(TAGS_LINE_RE);
    if (tagsMatch) {
      result.tags = parseTags(tagsMatch[1]!);
      continue;
    }

    // needs_contract: true|false
    const contractMatch = trimmed.match(CONTRACT_LINE_RE);
    if (contractMatch) {
      result.needs_contract = parseBool(contractMatch[1]!);
      continue;
    }

    // needs_ux: true|false
    const uxMatch = trimmed.match(UX_LINE_RE);
    if (uxMatch) {
      result.needs_ux = parseBool(uxMatch[1]!);
    }

    // surface / stack lines are intentionally not parsed — preset-driven
    // skill activation is the sole source of project-level stack identity
    // (see scripts/presets/*.json + `bun src/scripts/loop.mts resolve-skills`).
  }

  // Filter tags to known vocabularies so free-form prose tokens don't leak in.
  result.tags = result.tags.filter((t) => VALID_TAGS.has(t));

  return result;
}
