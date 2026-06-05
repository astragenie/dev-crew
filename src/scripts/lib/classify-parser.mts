// classify-parser.mts — parser for the constrained key:value block that the
// loop:architect agent returns when asked to classify a slice for the
// orchestrate-slice router.
//
// Output contract (from the classify prompt):
//   tags: [<label>, ...]
//   needs_contract: <true|false>
//   needs_ux: <true|false>
//
// The parser is tolerant: it scans every line for recognisable patterns and
// ignores prose, headings, blank lines. Unrecognised or missing fields default
// to [] / null so callers can safely spread the result into frontmatter.

export interface ClassifyResult {
  tags: string[];
  needs_contract: boolean | null;
  needs_ux: boolean | null;
}

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
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
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
  const result: ClassifyResult = { tags: [], needs_contract: null, needs_ux: null };
  if (!raw || typeof raw !== "string") return result;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // tags: [api-change, storage] or tags: api-change, storage
    const tagsMatch = trimmed.match(/^tags:\s*(.+)$/i);
    if (tagsMatch) {
      result.tags = parseTags(tagsMatch[1]);
      continue;
    }

    // needs_contract: true|false
    const contractMatch = trimmed.match(/^needs_contract:\s*(.+)$/i);
    if (contractMatch) {
      result.needs_contract = parseBool(contractMatch[1]);
      continue;
    }

    // needs_ux: true|false
    const uxMatch = trimmed.match(/^needs_ux:\s*(.+)$/i);
    if (uxMatch) {
      result.needs_ux = parseBool(uxMatch[1]);
      continue;
    }
  }

  // Filter tags to the known vocabulary so free-form prose tokens don't leak in.
  result.tags = result.tags.filter((t) => VALID_TAGS.has(t));

  return result;
}
