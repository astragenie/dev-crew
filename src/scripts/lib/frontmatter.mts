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
// Zero deps — pure Node. Keeps the plugin install-light.

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
    return inner.split(",").map((item: string) => stripQuotes(item.trim()));
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
  const kv = itemRaw.match(KEY_VALUE_RE);
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

function extendLastArrayMapping(
  frontmatter: Frontmatter,
  state: ParseState,
  line: string
): boolean {
  const nm = line.match(NESTED_KV_RE);
  if (!nm) return false;
  const arr = frontmatter[state.currentArrayKey!];
  const last = arr[arr.length - 1];
  if (!last || typeof last !== "object" || Array.isArray(last)) return false;
  (last as Record<string, unknown>)[nm[1]!] = parseScalar(nm[2]!);
  return true;
}

// Try to consume the line as a continuation of the active array or map.
// Returns true if consumed.
function tryConsumeContinuation(
  frontmatter: Frontmatter,
  state: ParseState,
  line: string
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
    if (extendLastArrayMapping(frontmatter, state, line)) return true;
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
    if (tryConsumeContinuation(frontmatter, state, line)) continue;
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
