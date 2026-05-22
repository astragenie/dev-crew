import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, mergeFrontmatter } from "./frontmatter.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "..", "..", "templates");

const DEC_FILE_RE = /^DEC-(\d+)\.md$/;

export function decisionsRoot(repoPath, config = null) {
  return path.join(repoPath, config?.decisions?.root || "docs/decisions");
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readTemplate(rel) {
  return fs.readFile(path.join(templateDir, rel), "utf8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function listDecisions(repoPath, { config = null, status = null } = {}) {
  const root = decisionsRoot(repoPath, config);
  if (!(await pathExists(root))) return [];
  const files = await fs.readdir(root);
  const decisions = [];
  for (const file of files) {
    if (!file.endsWith(".md") || !DEC_FILE_RE.test(file)) continue;
    const filePath = path.join(root, file);
    const content = await fs.readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    decisions.push({
      id: frontmatter.id,
      title: frontmatter.title,
      status: frontmatter.status,
      introduced_by_slice: frontmatter.introduced_by_slice,
      introduced_at: frontmatter.introduced_at,
      superseded_by: frontmatter.superseded_by,
      filePath,
      frontmatter,
      body
    });
  }
  const filtered = status ? decisions.filter((d) => d.status === status) : decisions;
  return filtered.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}

export async function nextDecisionId(repoPath, config = null) {
  const all = await listDecisions(repoPath, { config });
  let max = 0;
  for (const d of all) {
    const m = (d.id || "").match(/^DEC-(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return `DEC-${String(max + 1).padStart(3, "0")}`;
}

export async function writeDecisionFile(
  repoPath,
  { id, title, sliceId, rationale = "", consequences = "", config = null }
) {
  if (!id || !title || !sliceId) {
    throw new Error("writeDecisionFile requires id, title, sliceId");
  }
  const root = decisionsRoot(repoPath, config);
  await ensureDir(root);
  const tpl = await readTemplate("decisions/decision-template.md");
  let content = tpl
    .replace(/\bDEC-NNN\b/g, id)
    .replace(/SLICE-NN/g, sliceId)
    .replace(/YYYY-MM-DD/g, today())
    .replace(/^title: Short decision title$/m, `title: ${title.replace(/"/g, '\\"')}`)
    .replace(/^# DEC-(\d+): Short decision title/m, `# ${id}: ${title}`);
  // Splice in rationale and consequences narrative when provided
  if (rationale) {
    content = content.replace(
      /(## Context\n\n)(What forces[^\n]*\n[\s\S]*?(?=\n## Decision))/,
      `$1${rationale}\n\n`
    );
  }
  if (consequences) {
    // Drop user-supplied consequences into the Positive bucket (agent can re-sort later)
    content = content.replace(
      /(### Positive\n\n)(- bullet\n)/,
      `$1${consequences
        .split("\n")
        .map((l) => (l.trim().startsWith("-") ? l : `- ${l.trim()}`))
        .filter((l) => l !== "- ")
        .join("\n")}\n`
    );
  }
  const filePath = path.join(root, `${id}.md`);
  await fs.writeFile(filePath, content);
  return { id, filePath };
}

// Returns decisions whose `affects_files` frontmatter array matches any of
// the supplied changed files. Match is literal path-suffix. Used by reviewer
// to surface prior architectural decisions touching the same code.
export async function findRelevantDecisions(repoPath, changedFiles, config = null) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return [];
  const all = await listDecisions(repoPath, { config });
  const normalized = changedFiles.map((f) => f.replace(/\\/g, "/").toLowerCase());
  const matched = [];
  for (const d of all) {
    const affects = Array.isArray(d.frontmatter.affects_files) ? d.frontmatter.affects_files : [];
    if (affects.length === 0) continue;
    const hits = [];
    for (const a of affects) {
      const normA = String(a).replace(/\\/g, "/").toLowerCase();
      for (const c of normalized) {
        if (c === normA || c.endsWith(`/${normA}`) || normA.endsWith(`/${c}`)) {
          hits.push({ decisionFile: a, changedFile: c });
        }
      }
    }
    if (hits.length > 0) {
      matched.push({
        id: d.id,
        title: d.title,
        status: d.status,
        introduced_by_slice: d.introduced_by_slice,
        filePath: d.filePath,
        hits
      });
    }
  }
  return matched;
}

export async function showDecision(repoPath, decisionId, config = null) {
  const all = await listDecisions(repoPath, { config });
  return all.find((d) => d.id === decisionId) || null;
}

// Mark an existing decision as superseded by a newer one. Updates both files:
// - old: status = superseded, superseded_by = newDecId
// - new: nothing (caller can edit "supersedes: OLD" in body manually)
// Idempotent — re-running with same args is a no-op.
export async function supersedeDecision(repoPath, { oldId, newId, config = null }) {
  if (!oldId || !newId) throw new Error("supersedeDecision requires oldId and newId");
  if (oldId === newId) throw new Error("oldId and newId must differ");
  const all = await listDecisions(repoPath, { config });
  const old = all.find((d) => d.id === oldId);
  const next = all.find((d) => d.id === newId);
  if (!old) throw new Error(`Decision not found: ${oldId}`);
  if (!next) throw new Error(`Decision not found: ${newId}`);
  if (old.status === "superseded" && old.superseded_by === newId) {
    return { oldId, newId, alreadySuperseded: true };
  }
  await mergeFrontmatter; // ensure import retained
  const oldContent = await fs.readFile(old.filePath, "utf8");
  const merged = mergeFrontmatter(oldContent, {
    status: "superseded",
    superseded_by: newId
  });
  await fs.writeFile(old.filePath, merged);
  return { oldId, newId, alreadySuperseded: false };
}
