import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { specsRoot, pathExists } from "./paths.mjs";
import { cached, bust, clearAll } from "./cache.mjs";
import { emitSpecCreated } from "./spec-created-emitter.mjs";

export const specRoot = specsRoot;

const SPEC_FILE_RE = /^SPEC-(\d+)(?:-.*)?\.md$/;

export const SPEC_TYPES = ["prd", "user-journey", "sre", "research", "adr", "other"];
export const SPEC_STATUSES = ["draft", "approved", "decomposed", "satisfied", "archived"];

async function readSpec(filePath: string) {
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

export async function listSpecs(repoPath: string, options: Record<string, any> = {}) {
  const cacheKey = `listSpecs:${repoPath}`;
  return cached(cacheKey, async () => {
    const root = specRoot(repoPath, options.config);
    if (!(await pathExists(root))) return [];
    const files = await fs.readdir(root);
    const specs: any[] = [];
    for (const file of files) {
      if (!file.endsWith(".md") || !SPEC_FILE_RE.test(file)) continue;
      const spec = await readSpec(path.join(root, file));
      if (spec) specs.push(spec);
    }
    specs.sort((a, b) => a.idNumber - b.idNumber);
    return specs;
  });
}

export async function nextSpecId(repoPath: string, options: Record<string, any> = {}) {
  const specs = await listSpecs(repoPath, options);
  const max = specs.reduce((acc: number, s: { idNumber: number }) => Math.max(acc, s.idNumber), 0);
  return `SPEC-${String(max + 1).padStart(3, "0")}`;
}

export function filterSpecs(specs: Record<string, any>[], filters: Record<string, any> = {}) {
  return specs.filter((spec: Record<string, any>) => {
    if (filters.status && spec.frontmatter.status !== filters.status) return false;
    if (filters.type && spec.frontmatter.type !== filters.type) return false;
    if (filters.priority && spec.frontmatter.priority !== filters.priority) return false;
    if (filters.target_release && spec.frontmatter.target_release !== filters.target_release)
      return false;
    return true;
  });
}

export async function findSpecById(
  repoPath: string,
  specId: string,
  config: Record<string, any> | null = null
) {
  const specs = await listSpecs(repoPath, { config });
  return specs.find((s: { id: string }) => s.id === specId) || null;
}

export async function updateSpecFrontmatter(filePath: string, updates: Record<string, any>) {
  const content = await fs.readFile(filePath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const merged = mergeFrontmatter(content, { ...updates, updated: today });
  await fs.writeFile(filePath, merged);
  clearAll();
  return parseFrontmatter(merged).frontmatter;
}

export async function addSpec(
  repoPath: string,
  {
    type,
    title,
    body = "",
    priority = null,
    target_release = null,
    owner = null,
    config = null
  }: {
    type: string;
    title: string;
    body?: string;
    priority?: string | null;
    target_release?: string | null;
    owner?: string | null;
    config?: Record<string, any> | null;
  }
) {
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
    derived_features: [] as string[]
  };
  const docBody =
    body ||
    [
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
  bust(`listSpecs:${repoPath}`);
  const createdAt = new Date().toISOString();
  await emitSpecCreated(repoPath, { specId: id, createdAt });
  return { id, filePath, frontmatter };
}
