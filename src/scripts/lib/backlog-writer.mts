import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, mergeFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { backlogRoot, listBacklog, nextFeatureId, BACKLOG_STATES } from "./backlog-parser.mjs";
import { pathExists, ensureDir } from "./paths.mjs";
import { bust, clearAll } from "./cache.mjs";
import { clearFrontmatterCache } from "./frontmatter-cache.mjs";
import { assertStatePath } from "./state-paths.mjs";
import { validateFeat } from "./state-schemas.mjs";
import { emitBacklogStateChanged } from "./backlog-state-emitter.mjs";

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildFeatFrontmatter({
  id,
  today,
  priority,
  category,
  target_release,
  derived_from,
  github_issue,
  github_url
}: {
  id: string;
  today: string;
  priority: unknown;
  category: unknown;
  target_release: unknown;
  derived_from: unknown;
  github_issue: unknown;
  github_url: unknown;
}): Record<string, unknown> {
  const fm: Record<string, unknown> = {
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
  if (github_issue != null) fm.github_issue = github_issue;
  if (github_url != null) fm.github_url = github_url;
  return fm;
}

export async function ensureBacklogScaffold(
  repoPath: string,
  config: Record<string, unknown> | null
) {
  const root = backlogRoot(repoPath, config);
  assertStatePath(repoPath, config, root);
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
 *   github_issue?: number | null,
 *   github_url?: string | null,
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
    github_issue = null,
    github_url = null,
    config = null
  }: Record<string, any> = {}
) {
  if (!title || typeof title !== "string") {
    throw new Error("addFeature requires a non-empty title.");
  }
  const root = await ensureBacklogScaffold(repoPath, config);
  const id = await nextFeatureId(repoPath, { config });
  const today = nowIsoDate();
  const frontmatter = buildFeatFrontmatter({
    id,
    today,
    priority,
    category,
    target_release,
    derived_from,
    github_issue,
    github_url
  });
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

  const check = validateFeat(frontmatter);
  if (!check.ok) {
    throw new Error(`addFeature: schema-invalid frontmatter — ${check.issues.join("; ")}`);
  }

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
  // Windows mtime granularity (~16ms) lets rapid writes share an mtime with
  // the previous content, which leaves readFrontmatterCached pinned to the
  // stale parse. Clear the frontmatter cache so the next listBacklog read
  // sees the new content.
  clearFrontmatterCache();
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
  const fromDir = path.dirname(filePath);
  const fromState = path.basename(fromDir);
  const targetDir = path.join(path.dirname(fromDir), toState);
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
  // M5 / L5-3: emit loop.backlog_state_changed envelope. Fire only when
  // we actually moved between distinct state directories (no-op when
  // toState === fromState). featId from frontmatter, falling back to
  // filename stem (FEAT-NNN.md). repoPath derived from path structure
  // when not supplied — backlog files always live under
  // <repo>/.claude/artifacts/loop/backlog/<state>/<file>.md.
  if (fromState !== toState) {
    const featId =
      (typeof existingFm.id === "string" && existingFm.id) || filename.replace(/\.md$/i, "");
    const repoRoot = repoPath ?? deriveRepoRootFromBacklogPath(filePath);
    if (repoRoot) {
      await emitBacklogStateChanged(repoRoot, {
        featId,
        fromState,
        toState
      });
    }
  }
  return { from: filePath, to: targetPath };
}

/**
 * Derive the repo root from a backlog file path. Backlog files always live at
 * `<repoRoot>/<backlogRoot>/<state>/<feat>.md`. We walk up four levels from
 * the file to land on the repo root assuming the canonical default backlog
 * root (`.claude/artifacts/loop/backlog`). Returns null when the path shape
 * doesn't match — callers must treat that as "no signal".
 */
function deriveRepoRootFromBacklogPath(filePath: string): string | null {
  // .../backlog/<state>/<file>.md → walk up 5 levels to skip
  //   <file>.md → <state>/ → backlog/ → loop/ → artifacts/ → .claude/
  // and land on the repo root.
  const parts = filePath.split(/[/\\]/);
  const backlogIdx = parts.lastIndexOf("backlog");
  if (backlogIdx < 0) return null;
  // Expected: parts[backlogIdx-3] === ".claude"
  if (parts[backlogIdx - 3] !== ".claude") return null;
  const root = parts.slice(0, backlogIdx - 3).join(path.sep);
  return root.length > 0 ? root : null;
}

export async function findFeatureById(
  repoPath: string,
  featureId: string,
  config: Record<string, any> | null = null
) {
  const entries = await listBacklog(repoPath, { config });
  return entries.find((e: Record<string, any>) => e.id === featureId) || null;
}
