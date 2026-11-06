import { readFileSync } from "node:fs";
import type { TouchesFilesResult } from "./types.mjs";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
// FEAT-034: widened from the original src/docs/scripts/commands/agents/
// skills prefix set to also recognize crew/, .github/, .claude-plugin/,
// hooks/, dist/, templates/ sub-paths, plus a fixed allowlist of bare
// root-level files (package.json, CLAUDE.md, AGENTS.md, .gitignore,
// README.md, CHANGELOG.md) that slice bodies commonly cite without any
// directory prefix at all. The negative lookbehind/lookahead around the
// root-file alternative stops a longer token merely ending in one of these
// names (e.g. "mypackage.json") from being misread as a real root file.
const INFERENCE_RE =
  /(?:src|docs|scripts|commands|agents|skills|crew|\.github|\.claude-plugin|hooks|dist|templates)\/[\w\-./]+\.(?:mts|md|json|yaml|yml|mjs|ts|js)|(?<![\w.-])(?:package\.json|CLAUDE\.md|AGENTS\.md|\.gitignore|README\.md|CHANGELOG\.md)(?![\w-])/g;

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

// Strips a single layer of matching double- or single-quotes from an inline
// array item. Writer-produced items are never quoted (createSlice's
// touchesFiles paths never contain a comma or other char that would trigger
// serializeScalar's QUOTE_NEEDED_RE), but a hand-authored slice frontmatter
// may quote entries — accept that form too rather than leaving the quotes in
// the returned path.
function stripQuotes(raw: string): string {
  const v = raw.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  return v;
}

// Splits an inline array's inner content on top-level commas only — a comma
// inside a quoted item does not split. Kept as a local copy rather than an
// import so this hot-path reader stays a self-contained, zero-dependency
// module.
//
// NOT equivalent to frontmatter.mts's splitInlineArrayItems, despite the shared
// name — corrected after SLICE-203 review found the two diverge. That one
// carries a backslash-escape lookahead so `\"` inside a double-quoted item does
// not prematurely close the quote, and pairs with an unescapeDoubleQuoted step;
// this copy has neither. Fed `["a\"b,c"]`, frontmatter.mts yields the single
// item `a"b,c` while this yields two garbled items.
//
// Acceptable here only because touches_files values are plain repo-relative
// paths, which never contain escaped quotes. Do NOT treat these two functions
// as interchangeable, and do not widen this one's input contract (e.g. reuse it
// for a field that can carry arbitrary strings) without porting the escape
// handling first.
function splitInlineArrayItems(inner: string): string[] {
  const items: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const ch of inner) {
    if (quote) {
      current += ch;
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

// Recognizes a genuine single-line YAML flow sequence (`[a, b, c]` / `[]`) —
// requires both a leading `[` and a trailing `]` on the trimmed value, so a
// scalar that merely starts with `[` (e.g. `[Draft] retitle`, which has no
// closing bracket at the end) is never misread as an array. Returns null for
// anything that isn't this shape, so the caller falls back to treating the
// value as a plain scalar instead of silently fabricating a path list out of
// a malformed or unrelated value.
function parseInlineArray(value: string): string[] | null {
  const v = value.trim();
  if (!v.startsWith("[") || !v.endsWith("]")) return null;
  const inner = v.slice(1, -1).trim();
  if (inner === "") return [];
  return splitInlineArrayItems(inner)
    .map((item) => stripQuotes(item))
    .filter((item) => item.length > 0);
}

// Resolves a non-empty single-line frontmatter value: an inline array parses
// to a string[], anything else stays the plain trimmed scalar string.
function resolveInlineValue(value: string): unknown {
  const inlineArray = parseInlineArray(value);
  return inlineArray !== null ? inlineArray : value.trim();
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(FRONTMATTER_RE);
  if (!m || !m[1]) return {};
  const lines = m[1].split("\n");
  const out: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let listAcc: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("  - ") && currentKey !== null && listAcc !== null) {
      listAcc.push(line.slice(4).trim());
      continue;
    }
    if (listAcc !== null && currentKey !== null) {
      out[currentKey] = listAcc;
      listAcc = null;
      currentKey = null;
    }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv || !kv[1]) continue;
    const key = kv[1];
    const value = kv[2] ?? "";
    if (value === "") {
      currentKey = key;
      listAcc = [];
    } else {
      out[key] = resolveInlineValue(value);
    }
  }
  if (listAcc !== null && currentKey !== null) {
    out[currentKey] = listAcc;
  }
  return out;
}

function inferFromBody(body: string): string[] {
  const matches = body.match(INFERENCE_RE) ?? [];
  const dedup = Array.from(new Set(matches.map(normalize)));
  dedup.sort();
  return dedup;
}

export function readTouchesFiles(slicePath: string, _repoRoot: string): TouchesFilesResult {
  const raw = readFileSync(slicePath, "utf8");
  const fm = parseFrontmatter(raw);
  const declared = fm["touches_files"];

  if (Array.isArray(declared) && declared.length > 0) {
    return {
      paths: declared.map((p) => normalize(String(p))),
      confidence: "declared"
    };
  }

  const body = raw.replace(FRONTMATTER_RE, "");
  const inferred = inferFromBody(body);
  if (inferred.length > 0) {
    return { paths: inferred, confidence: "inferred" };
  }

  return { paths: [], confidence: "missing" };
}
