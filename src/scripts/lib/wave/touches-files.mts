import { readFileSync } from "node:fs";
import type { TouchesFilesResult } from "./types.mjs";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const INFERENCE_RE =
  /(?:src|docs|scripts|commands|agents|skills)\/[\w\-./]+\.(?:mts|md|json|yaml|yml|mjs|ts|js)/g;

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
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
      out[key] = value.trim();
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
