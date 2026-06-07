// Minimal YAML frontmatter parser/writer scoped to the schema this plugin uses.
// Handles:
//   - leading "---\n...\n---" block
//   - flat key: value pairs (string, number, ISO date)
//   - inline arrays [a, b, c]
//   - block arrays with "- item" continuation lines
//   - quoted strings (single or double)
//
// Rejects anything fancier (nested mappings, multiline scalars beyond strings,
// anchors/aliases). Schema enforcement happens at the caller.
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
const QUOTE_NEEDED_RE = /[:#[\]{}'",]/;
const LEADING_SPACE_RE = /^\s/;
const TRAILING_SPACE_RE = /\s$/;
const LEADING_NEWLINES_RE = /^\n+/;

function stripQuotes(value: string) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  if (typeof content !== "string") {
    return { frontmatter: {}, body: "" };
  }
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const block = match[1];
  const body = content.slice(match[0].length);
  const lines = block.split("\n");
  const frontmatter: Frontmatter = {};
  let currentArrayKey: string | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].replace(CRLF_STRIP_RE, "");
    if (line.trim() === "") {
      currentArrayKey = null;
      continue;
    }
    // Block-array continuation: leading whitespace then "- value"
    if (currentArrayKey && BLOCK_ARRAY_ITEM_RE.test(line)) {
      const itemRaw = line.replace(BLOCK_ARRAY_ITEM_STRIP_RE, "");
      frontmatter[currentArrayKey].push(stripQuotes(itemRaw));
      continue;
    }
    // key: value (possibly empty)
    const m = line.match(KEY_VALUE_RE);
    if (!m) {
      currentArrayKey = null;
      continue;
    }
    const key = m[1];
    const value = m[2];
    if (value === "") {
      // Empty value. Could be: (a) null/missing, (b) start of a block array.
      // Disambiguate by peeking at the next non-empty line. If it starts
      // with whitespace + "- ", we have a block array; otherwise null.
      let blockArray = false;
      for (let j = i + 1; j < lines.length; j += 1) {
        const peek = lines[j].replace(CRLF_STRIP_RE, "");
        if (peek.trim() === "") continue;
        if (BLOCK_ARRAY_ITEM_RE.test(peek)) blockArray = true;
        break;
      }
      if (blockArray) {
        frontmatter[key] = [];
        currentArrayKey = key;
      } else {
        frontmatter[key] = null;
        currentArrayKey = null;
      }
    } else {
      frontmatter[key] = parseScalar(value);
      currentArrayKey = null;
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
  // Quote when the value contains characters that confuse the parser
  if (QUOTE_NEEDED_RE.test(s) || LEADING_SPACE_RE.test(s) || TRAILING_SPACE_RE.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

export function serializeFrontmatter(frontmatter: Frontmatter, body = "") {
  const keys = Object.keys(frontmatter);
  const lines = ["---"];
  for (const key of keys) {
    const value = frontmatter[key];
    lines.push(`${key}: ${serializeScalar(value)}`);
  }
  lines.push("---", "");
  return `${lines.join("\n")}${body.replace(LEADING_NEWLINES_RE, "")}`;
}

export function mergeFrontmatter(content: string, updates: Frontmatter) {
  const { frontmatter, body } = parseFrontmatter(content);
  const merged = { ...frontmatter, ...updates };
  return serializeFrontmatter(merged, body);
}
