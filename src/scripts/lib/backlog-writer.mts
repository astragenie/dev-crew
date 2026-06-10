import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { backlogRoot, listBacklog, nextFeatureId, BACKLOG_STATES } from "./backlog-parser.mjs";
import { pathExists, ensureDir } from "./paths.mjs";
import { bust, clearAll } from "./cache.mjs";
import { assertStatePath } from "./state-paths.mjs";

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureBacklogScaffold(
  repoPath: string,
  config: Record<string, unknown> | null
) {
  const root = backlogRoot(repoPath, config);
  for (const state of BACKLOG_STATES) {
    const dir = path.join(root, state);
    await ensureDir(dir);
    const keep = path.join(dir, ".gitkeep");
    if (!(await pathExists(keep))) {
      await fs.writeFile(keep, "");
    }
  }
  return root;
}

/**
 * @param {string} repoPath
 * @param {{
 *   title?: string,
 *   body?: string,
 *   priority?: string | null,
 *   category?: string | null,
 *   target_release?: string | null,
 *   derived_from?: string | string[] | null,
 *   config?: any
 * }} [options]
 */
export async function addFeature(
  repoPath: string,
  {
    title,
    body = "",
    priority = null,
    category = null,
    target_release = null,
    derived_from = null,
    config = null
  }: Record<string, any> = {}
) {
  if (!title || typeof title !== "string") {
    throw new Error("addFeature requires a non-empty title.");
  }
  const root = await ensureBacklogScaffold(repoPath, config);
  const id = await nextFeatureId(repoPath, { config });
  const today = nowIsoDate();
  const frontmatter = {
    id,
    status: "pending",
    priority,
    category,
    target_release,
    created: today,
    updated: today,
    depends_on: [] as string[],
    slices: [] as string[],
    derived_from: derived_from || null
  };
  const docBody =
    body ||
    [
      `# ${id}: ${title}`,
      "",
      "## Description",
      "",
      "(describe the feature in PM-friendly language)",
      "",
      "## Acceptance hints",
      "",
      "- bullet 1",
      "- bullet 2",
      ""
    ].join("\n");
  const fullBody = docBody.startsWith("#") ? docBody : `# ${id}: ${title}\n\n${docBody}`;
  const contents = serializeFrontmatter(frontmatter, fullBody);
  const filePath = path.join(root, "pending", `${id}.md`);
  assertStatePath(repoPath, config, filePath);
  await fs.writeFile(filePath, contents);
  bust(`listBacklog:${repoPath}`);
  return { id, filePath, frontmatter };
}

export async function updateFeatureFrontmatter(
  filePath: string,
  updates: Record<string, any>,
  repoPath?: string,
  config?: Record<string, any> | null
) {
  if (repoPath) {
    assertStatePath(repoPath, config, filePath);
  }
  const content = await fs.readFile(filePath, "utf8");
  const merged = mergeFrontmatter(content, { ...updates, updated: nowIsoDate() });
  await fs.writeFile(filePath, merged);
  clearAll();
  return parseFrontmatter(merged).frontmatter;
}

export async function moveFeature(
  filePath: string,
  toState: string,
  updates: Record<string, any> = {},
  repoPath?: string,
  config?: Record<string, any> | null
) {
  if (!BACKLOG_STATES.includes(toState)) {
    throw new Error(`Unknown backlog state: ${toState}`);
  }
  const filename = path.basename(filePath);
  const targetDir = path.join(path.dirname(path.dirname(filePath)), toState);
  await ensureDir(targetDir);
  const targetPath = path.join(targetDir, filename);
  if (repoPath) {
    assertStatePath(repoPath, config, targetPath);
  }
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter: existingFm } = parseFrontmatter(content);
  // Lifecycle timestamps. Set started_at the FIRST time a feature enters
  // in-progress; completed_at the FIRST time it enters done. Idempotent —
  // don't overwrite values already set (so re-entering a state preserves
  // the original timeline).
  const lifecycle: Record<string, any> = {};
  if (toState === "in-progress" && !existingFm.started_at) {
    lifecycle.started_at = nowIsoDate();
  }
  if (toState === "done" && !existingFm.completed_at) {
    lifecycle.completed_at = nowIsoDate();
  }
  const merged = mergeFrontmatter(content, {
    ...updates,
    ...lifecycle,
    status: toState,
    updated: nowIsoDate()
  });
  await fs.writeFile(targetPath, merged);
  if (targetPath !== filePath) {
    await fs.unlink(filePath);
  }
  clearAll();
  return { from: filePath, to: targetPath };
}

export async function findFeatureById(
  repoPath: string,
  featureId: string,
  config: Record<string, any> | null = null
) {
  const entries = await listBacklog(repoPath, { config });
  return entries.find((e: Record<string, any>) => e.id === featureId) || null;
}
