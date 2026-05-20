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

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n*/;

function stripQuotes(value) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "" || v === "~" || v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  // Inline array: [a, b, c]
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => stripQuotes(item.trim()));
  }
  return stripQuotes(v);
}

export function parseFrontmatter(content) {
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
  const frontmatter = {};
  let currentArrayKey = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].replace(/\r$/, "");
    if (line.trim() === "") {
      currentArrayKey = null;
      continue;
    }
    // Block-array continuation: leading whitespace then "- value"
    if (currentArrayKey && /^\s+-\s/.test(line)) {
      const itemRaw = line.replace(/^\s+-\s+/, "");
      frontmatter[currentArrayKey].push(stripQuotes(itemRaw));
      continue;
    }
    // key: value (possibly empty)
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
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
        const peek = lines[j].replace(/\r$/, "");
        if (peek.trim() === "") continue;
        if (/^\s+-\s/.test(peek)) blockArray = true;
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

function serializeScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map(serializeScalar).join(", ")}]`;
  }
  const s = String(value);
  if (s === "") return '""';
  // Quote when the value contains characters that confuse the parser
  if (/[:#\[\]{}'",]/.test(s) || /^\s/.test(s) || /\s$/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

export function serializeFrontmatter(frontmatter, body = "") {
  const keys = Object.keys(frontmatter);
  const lines = ["---"];
  for (const key of keys) {
    const value = frontmatter[key];
    lines.push(`${key}: ${serializeScalar(value)}`);
  }
  lines.push("---", "");
  return `${lines.join("\n")}${body.replace(/^\n+/, "")}`;
}

export function mergeFrontmatter(content, updates) {
  const { frontmatter, body } = parseFrontmatter(content);
  const merged = { ...frontmatter, ...updates };
  return serializeFrontmatter(merged, body);
}
