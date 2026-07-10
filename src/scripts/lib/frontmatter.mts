// Minimal YAML frontmatter parser/writer scoped to the schema this plugin uses.
// Handles:
//   - leading "---\n...\n---" block
//   - flat key: value pairs (string, number, ISO date)
//   - inline arrays [a, b, c]
//   - block arrays with "- item" continuation lines
//   - quoted strings (single or double)
//
// Handles one level of nested mappings (`key:\n  inner: value`) so grade
// frontmatter blocks like `scores:`, `timing:`, `shape:` round-trip
// correctly. Also handles one level of arrays-of-mappings (FEAT-168 /
// SLICE-99) for `proposed_slices`-shaped data:
//   proposed_slices:
//     - id_suffix: -SLICE-1
//       title: Library
//       points: 5
// Rejects multi-level nesting beyond that (mappings inside mappings inside
// arrays etc.), multiline scalars beyond strings, anchors/aliases. Schema
// enforcement happens at the caller.
//
// An array-of-mappings item field (e.g. a `proposed_slices` entry's
// `acceptance_criteria`) that itself needs an array value MUST be authored
// as an inline array on one line (`acceptance_criteria: ["a", "b"]`) — a
// nested block list one level deeper (`acceptance_criteria:\n      - a`) is
// the "mappings inside arrays" case the paragraph above already rejects, and
// parseFrontmatter now throws FrontmatterNestingError with an actionable
// message on that shape instead of silently misparsing it (QW4 review,
// astragenie/runner-plugin). Comma-bearing inline-array items (GWT-style
// acceptance-criteria prose is the motivating case) round-trip correctly:
// serializeScalar already quotes any item containing a comma, and
// parseScalar's inline-array split is quote-aware so it doesn't split inside
// a quoted segment.
//
// Zero deps — pure Node. Keeps the plugin install-light.
//
// @astragenie/plugin-std/frontmatter adoption (issue #449, W2b S2) evaluated
// and REJECTED for this module — left fully local. Its `parseFrontmatter` is
// backed by a real YAML parser and would be a strict behavior CHANGE, not a
// drop-in, for content this repo already has on disk. Proved by parsing every
// .md file under this worktree with a frontmatter fence (2169 files) through
// both parsers and byte-comparing the JSON.stringify of the result:
//   - 47 files diverge in *parsed value*, not just formatting, e.g.:
//     - a `key: |` / `key: >-` block-scalar continuation is silently dropped
//       by this parser's line-oriented walk (kept as literal "|"/">-"); real
//       YAML folds the following indented lines into the full string
//       (docs/upstream-requests/2026-07-02-...md, agents/hierarchical-
//       dispatcher.md's multi-line `description:` truncates to its first
//       line here today).
//     - an unquoted `{ a: 1, b: 2 }` flow-mapping value (e.g. `diff_stat` in
//       .claude/artifacts/crew/bundles/orphan/*.md, an `id: X` item inside a
//       block array) is kept as a literal string here; real YAML parses it
//       as an object — this is the exact "findings"-as-JSON-string trap
//       dev-team hit in artifact-cache (PR #207/#209 precedent).
//     - inline-array scalars are never number-coerced here (`shipped_prs:
//       [311, 306]` round-trips as strings); real YAML coerces per-item.
//   - 7 files throw `DeterministicError` on plugin-std's parser for content
//     this parser accepts today (a value beginning with a backtick, a
//     reserved YAML plain-scalar indicator — e.g. DEC-055's
//     `` title: `camelTight` drops on overflow `` — is invalid YAML but a
//     completely ordinary string here).
// Given the "existing tests pass unmodified, no behavior change" constraint,
// none of this is a wrappable edge case — it's material divergence on real,
// current production files, so the swap does not happen. serializeFrontmatter
// / mergeFrontmatter were not evaluated further once parse was rejected (they
// sit downstream of the same parse contract). Revisit only if this module's
// hand-rolled scope is deliberately upgraded to real YAML as its own change.

// Tolerate CRLF line endings (Windows). Earlier this regex required LF only,
// silently returning {} on every CRLF-encoded backlog file. parseFrontmatter
// failed open and the auto-walker read autonomous_safe as undefined, skipping
// every FEAT. Confirmed 2026-06-07 on Windows checkout.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n*/;

// Module-scope regex constants for hot-path functions (Win 6 — perf).
const SCALAR_NUMBER_RE = /^-?\d+(\.\d+)?$/;
const CRLF_STRIP_RE = /\r$/;
const BLOCK_ARRAY_ITEM_RE = /^\s+-\s/;
const BLOCK_ARRAY_ITEM_STRIP_RE = /^\s+-\s+/;
const KEY_VALUE_RE = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/;
// Nested mapping item: indented "key: value" (no leading dash).
const NESTED_KV_RE = /^\s+([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/;
// Disambiguates a block-array item's own content: "id_suffix: -SLICE-1" (a
// one-entry nested mapping, used by proposed_slices) from a plain string that
// merely contains a colon, e.g. "surface:ui" (a surface/stack tag value).
// Mirrors real YAML's rule that a colon is a mapping indicator only when
// followed by whitespace or end-of-line — KEY_VALUE_RE's `\s*` (zero-or-more)
// doesn't enforce that, so `- surface:ui` was misread as `{surface: "ui"}`
// instead of the string "surface:ui" (found via the WS-3 surface/stack tag
// propagation round-trip, FU-6). Do NOT reuse KEY_VALUE_RE/NESTED_KV_RE here.
const BLOCK_ARRAY_MAPPING_ITEM_RE = /^([A-Za-z_][A-Za-z0-9_-]*):(\s+.*|)$/;
const QUOTE_NEEDED_RE = /[:#[\]{}'",]/;
const LEADING_SPACE_RE = /^\s/;
const TRAILING_SPACE_RE = /\s$/;
const LEADING_NEWLINES_RE = /^\n+/;
// An embedded line break would otherwise split a scalar across the hand-rolled
// parser's line-oriented `block.split("\n")` walk (see parseFrontmatter
// below), corrupting the frontmatter block or letting injected content
// masquerade as a new key/line. Anything matching this must be escaped
// inside a quoted scalar, not merely quoted.
const NEWLINE_RE = /[\n\r]/;
// Recognizes only the escape sequences this module itself emits when quoting
// a scalar (see serializeScalar) — safe to reverse unconditionally on any
// double-quoted scalar produced by this serializer.
const DOUBLE_QUOTE_ESCAPE_RE = /\\\\|\\n|\\r|\\"/g;

function unescapeDoubleQuoted(value: string): string {
  return value.replace(DOUBLE_QUOTE_ESCAPE_RE, (m) => {
    if (m === "\\\\") return "\\";
    if (m === "\\n") return "\n";
    if (m === "\\r") return "\r";
    return '"';
  });
}

function stripQuotes(value: string) {
  const v = value.trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    return unescapeDoubleQuoted(v.slice(1, -1));
  }
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1);
  }
  return v;
}

// Splits an inline array's inner content on top-level commas only — a comma
// inside a single- or double-quoted segment does not split. serializeScalar
// already quotes any array item containing a comma (QUOTE_NEEDED_RE), so a
// naive `.split(",")` here shredded quoted GWT-style prose ("Given X, when Y,
// then Z") into multiple garbled items with no error (astragenie/runner-plugin
// QW4 review — reproduced via acceptance_criteria nested in a proposed_slices
// item). Backslash-escapes inside a double-quoted segment (`\"`, `\\`) are
// passed through verbatim so they don't prematurely close the quote; stripQuotes
// / unescapeDoubleQuoted resolve them afterwards.
function splitInlineArrayItems(inner: string): string[] {
  const items: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]!;
    if (quote) {
      current += ch;
      if (quote === '"' && ch === "\\" && i + 1 < inner.length) {
        current += inner[i + 1];
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ",") {
      items.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  items.push(current);
  return items;
}

function parseScalar(raw: string) {
  const v = raw.trim();
  if (v === "" || v === "~" || v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (SCALAR_NUMBER_RE.test(v)) return Number(v);
  // Inline array: [a, b, c]
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return splitInlineArrayItems(inner).map((item: string) => stripQuotes(item.trim()));
  }
  return stripQuotes(v);
}

export type Frontmatter = Record<string, any>;

type ParseState = {
  currentArrayKey: string | null;
  currentMapKey: string | null;
  arrayItemsAreMappings: boolean;
};

function resetState(state: ParseState) {
  state.currentArrayKey = null;
  state.currentMapKey = null;
  state.arrayItemsAreMappings = false;
}

// Returns "array" | "map" | "scalar" by peeking at the next non-empty line.
function detectEmptyValueShape(lines: string[], fromIndex: number): "array" | "map" | "scalar" {
  for (let j = fromIndex; j < lines.length; j += 1) {
    const peek = lines[j]!.replace(CRLF_STRIP_RE, "");
    if (peek.trim() === "") continue;
    if (BLOCK_ARRAY_ITEM_RE.test(peek)) return "array";
    if (NESTED_KV_RE.test(peek)) return "map";
    return "scalar";
  }
  return "scalar";
}

function applyEmptyValue(
  frontmatter: Frontmatter,
  state: ParseState,
  key: string,
  shape: "array" | "map" | "scalar"
) {
  resetState(state);
  if (shape === "array") {
    frontmatter[key] = [];
    state.currentArrayKey = key;
  } else if (shape === "map") {
    frontmatter[key] = {};
    state.currentMapKey = key;
  } else {
    frontmatter[key] = null;
  }
}

function consumeBlockArrayItem(frontmatter: Frontmatter, state: ParseState, line: string): void {
  const itemRaw = line.replace(BLOCK_ARRAY_ITEM_STRIP_RE, "");
  const arr = frontmatter[state.currentArrayKey!];
  const kv = itemRaw.match(BLOCK_ARRAY_MAPPING_ITEM_RE);
  if (kv) {
    const obj: Record<string, unknown> = {};
    obj[kv[1]!] = parseScalar(kv[2]!);
    arr.push(obj);
    state.arrayItemsAreMappings = true;
  } else {
    arr.push(stripQuotes(itemRaw));
    state.arrayItemsAreMappings = false;
  }
}

// Thrown when an array-of-mappings item's own field looks like it opens a
// further-nested block list (`key:\n      - a\n      - b`), which this parser
// does not support — the module doc's "rejects multi-level nesting" rule
// applies one level deeper than proposed_slices items themselves. Before this
// check, that shape parsed silently and wrong: the empty `key:` value became
// `null`, and the following `- ...` lines were misread as new top-level items
// of the OUTER array (astragenie/runner-plugin QW4 review). Failing loudly
// here, with a message naming the actual authoring mistake, beats a
// downstream schema validator blaming the caller's data for a parser gap.
export class FrontmatterNestingError extends Error {
  constructor(
    public readonly arrayKey: string,
    public readonly field: string
  ) {
    super(
      `frontmatter parse error: "${arrayKey}" item field "${field}" is written as a ` +
        "nested block list, which this hand-rolled parser does not support one level " +
        `deep inside an array-of-mappings item — rewrite it as an inline array on one ` +
        `line instead, e.g. \`${field}: ["a", "b"]\`.`
    );
    this.name = "FrontmatterNestingError";
  }
}

function leadingWhitespaceLength(line: string): number {
  return line.match(/^[ \t]*/)?.[0].length ?? 0;
}

function extendLastArrayMapping(
  frontmatter: Frontmatter,
  state: ParseState,
  line: string,
  lines: string[],
  lineIndex: number
): boolean {
  const nm = line.match(NESTED_KV_RE);
  if (!nm) return false;
  const arr = frontmatter[state.currentArrayKey!];
  const last = arr[arr.length - 1];
  if (!last || typeof last !== "object" || Array.isArray(last)) return false;
  const field = nm[1]!;
  const rawValue = nm[2]!;
  if (rawValue.trim() === "") {
    // Peek ahead: an indented "- ..." line strictly deeper than this field's
    // own indentation is a nested block list under THIS field, not the outer
    // array's next item (which sits at this field's sibling indentation or
    // shallower). Only the deeper case is the unsupported shape.
    const shape = detectEmptyValueShape(lines, lineIndex + 1);
    if (shape === "array") {
      const nextLine = lines
        .slice(lineIndex + 1)
        .find((l) => l.replace(CRLF_STRIP_RE, "").trim() !== "");
      if (nextLine && leadingWhitespaceLength(nextLine) > leadingWhitespaceLength(line)) {
        throw new FrontmatterNestingError(state.currentArrayKey!, field);
      }
    }
  }
  (last as Record<string, unknown>)[field] = parseScalar(rawValue);
  return true;
}

// Try to consume the line as a continuation of the active array or map.
// Returns true if consumed.
function tryConsumeContinuation(
  frontmatter: Frontmatter,
  state: ParseState,
  line: string,
  lines: string[],
  lineIndex: number
): boolean {
  if (state.currentArrayKey && BLOCK_ARRAY_ITEM_RE.test(line)) {
    consumeBlockArrayItem(frontmatter, state, line);
    return true;
  }
  if (
    state.currentArrayKey &&
    state.arrayItemsAreMappings &&
    NESTED_KV_RE.test(line) &&
    !BLOCK_ARRAY_ITEM_RE.test(line)
  ) {
    if (extendLastArrayMapping(frontmatter, state, line, lines, lineIndex)) return true;
  }
  if (state.currentMapKey && NESTED_KV_RE.test(line) && !BLOCK_ARRAY_ITEM_RE.test(line)) {
    const nm = line.match(NESTED_KV_RE);
    if (nm) {
      frontmatter[state.currentMapKey][nm[1]!] = parseScalar(nm[2]!);
      return true;
    }
  }
  return false;
}

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  if (typeof content !== "string") {
    return { frontmatter: {}, body: "" };
  }
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const block = match[1]!;
  const body = content.slice(match[0].length);
  const lines = block.split("\n");
  const frontmatter: Frontmatter = {};
  const state: ParseState = {
    currentArrayKey: null,
    currentMapKey: null,
    arrayItemsAreMappings: false
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.replace(CRLF_STRIP_RE, "");
    if (line.trim() === "") {
      resetState(state);
      continue;
    }
    if (tryConsumeContinuation(frontmatter, state, line, lines, i)) continue;
    const m = line.match(KEY_VALUE_RE);
    if (!m) {
      resetState(state);
      continue;
    }
    const key = m[1]!;
    const value = m[2]!;
    if (value === "") {
      applyEmptyValue(frontmatter, state, key, detectEmptyValueShape(lines, i + 1));
    } else {
      resetState(state);
      frontmatter[key] = parseScalar(value);
    }
  }
  return { frontmatter, body };
}

function serializeScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map(serializeScalar).join(", ")}]`;
  }
  const s = String(value);
  if (s === "") return '""';
  // Embedded newlines/CRs must be escaped, not left raw — a raw line break
  // would split this scalar across multiple lines of the emitted block and
  // desync the hand-rolled parser (KEY_VALUE_RE / block-array detection).
  // Backslashes are escaped first so the subsequent \n / \r escapes stay
  // unambiguous on the way back through unescapeDoubleQuoted.
  if (NEWLINE_RE.test(s)) {
    const escaped = s
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
    return `"${escaped}"`;
  }
  // Quote when the value contains characters that confuse the parser
  if (QUOTE_NEEDED_RE.test(s) || LEADING_SPACE_RE.test(s) || TRAILING_SPACE_RE.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

function isPlainMapping(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value as object) === Object.prototype
  );
}

function isArrayOfMappings(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && value.every(isPlainMapping);
}

function emitArrayOfMappings(lines: string[], key: string, value: Array<Record<string, unknown>>) {
  lines.push(`${key}:`);
  for (const item of value) {
    const entries = Object.entries(item);
    if (entries.length === 0) {
      lines.push("  - {}");
      continue;
    }
    const [firstKey, firstVal] = entries[0]!;
    lines.push(`  - ${firstKey}: ${serializeScalar(firstVal)}`);
    for (let i = 1; i < entries.length; i += 1) {
      const [k, v] = entries[i]!;
      lines.push(`    ${k}: ${serializeScalar(v)}`);
    }
  }
}

export function serializeFrontmatter(frontmatter: Frontmatter, body = "") {
  const keys = Object.keys(frontmatter);
  const lines = ["---"];
  for (const key of keys) {
    const value = frontmatter[key];
    if (isArrayOfMappings(value)) {
      emitArrayOfMappings(lines, key, value);
    } else if (isPlainMapping(value)) {
      lines.push(`${key}:`);
      for (const [innerKey, innerVal] of Object.entries(value)) {
        lines.push(`  ${innerKey}: ${serializeScalar(innerVal)}`);
      }
    } else {
      lines.push(`${key}: ${serializeScalar(value)}`);
    }
  }
  lines.push("---", "");
  return `${lines.join("\n")}${body.replace(LEADING_NEWLINES_RE, "")}`;
}

export function mergeFrontmatter(content: string, updates: Frontmatter) {
  const { frontmatter, body } = parseFrontmatter(content);
  const merged = { ...frontmatter, ...updates };
  return serializeFrontmatter(merged, body);
}
