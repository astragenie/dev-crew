import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";

const SPEC_FILE_RE = /^SPEC-(\d+)(?:-.*)?\.md$/;

export const SPEC_TYPES = ["prd", "user-journey", "sre", "research", "adr", "other"];
export const SPEC_STATUSES = ["draft", "approved", "decomposed", "satisfied", "archived"];

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export function specRoot(repoPath, config) {
  return path.join(repoPath, config?.specs?.root || "docs/specs");
}

async function readSpec(filePath) {
  const filename = path.basename(filePath);
  const match = filename.match(SPEC_FILE_RE);
  if (!match) return null;
  const idNumber = Number(match[1]);
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    id: frontmatter.id || `SPEC-${String(idNumber).padStart(3, "0")}`,
    idNumber,
    filePath,
    filename,
    frontmatter,
    body
  };
}

export async function listSpecs(repoPath, options = {}) {
  const root = specRoot(repoPath, options.config);
  if (!(await pathExists(root))) return [];
  const files = await fs.readdir(root);
  const specs = [];
  for (const file of files) {
    if (!file.endsWith(".md") || !SPEC_FILE_RE.test(file)) continue;
    const spec = await readSpec(path.join(root, file));
    if (spec) specs.push(spec);
  }
  specs.sort((a, b) => a.idNumber - b.idNumber);
  return specs;
}

export async function nextSpecId(repoPath, options = {}) {
  const specs = await listSpecs(repoPath, options);
  const max = specs.reduce((acc, s) => Math.max(acc, s.idNumber), 0);
  return `SPEC-${String(max + 1).padStart(3, "0")}`;
}

export function filterSpecs(specs, filters = {}) {
  return specs.filter((spec) => {
    if (filters.status && spec.frontmatter.status !== filters.status) return false;
    if (filters.type && spec.frontmatter.type !== filters.type) return false;
    if (filters.priority && spec.frontmatter.priority !== filters.priority) return false;
    if (filters.target_release && spec.frontmatter.target_release !== filters.target_release) return false;
    return true;
  });
}

export async function findSpecById(repoPath, specId, config = null) {
  const specs = await listSpecs(repoPath, { config });
  return specs.find((s) => s.id === specId) || null;
}

export async function updateSpecFrontmatter(filePath, updates) {
  const content = await fs.readFile(filePath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const merged = mergeFrontmatter(content, { ...updates, updated: today });
  await fs.writeFile(filePath, merged);
  return parseFrontmatter(merged).frontmatter;
}

export async function addSpec(repoPath, { type, title, body = "", priority = null, target_release = null, owner = null, config = null }) {
  if (!type || !SPEC_TYPES.includes(type)) {
    throw new Error(`spec type must be one of: ${SPEC_TYPES.join(", ")}`);
  }
  if (!title || typeof title !== "string") {
    throw new Error("addSpec requires a non-empty title.");
  }
  const root = specRoot(repoPath, config);
  await fs.mkdir(root, { recursive: true });
  const id = await nextSpecId(repoPath, { config });
  const today = new Date().toISOString().slice(0, 10);
  const frontmatter = {
    id,
    type,
    title,
    status: "draft",
    priority,
    target_release,
    created: today,
    updated: today,
    owner,
    derived_features: []
  };
  const docBody = body || [
    `# ${id}: ${title}`,
    "",
    "## Problem",
    "",
    "(describe the problem in PM-friendly language)",
    "",
    "## Goals",
    "",
    "- bullet 1",
    "- bullet 2",
    "",
    "## Non-goals",
    "",
    "- bullet 1",
    "",
    "## User stories / journeys",
    "",
    "(narrative)",
    "",
    "## Success metrics",
    "",
    "(narrative)",
    ""
  ].join("\n");
  const fullBody = docBody.startsWith("#") ? docBody : `# ${id}: ${title}\n\n${docBody}`;
  const contents = serializeFrontmatter(frontmatter, fullBody);
  const filePath = path.join(root, `${id}.md`);
  await fs.writeFile(filePath, contents);
  return { id, filePath, frontmatter };
}
