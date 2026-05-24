import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { resolveConfig } from "./config-resolver.mjs";
import { stripArtifactTimestamp } from "./artifact-naming.mjs";

// Bidirectional linkage between slice files and crew artifacts. Replaces
// the regex-scrape approach in score-inference.mjs with a frontmatter-walk
// path. Slice frontmatter gains arrays: reviews / validations / deployments;
// each holds repo-relative paths to crew artifacts associated with the
// slice. Idempotent — appending the same path twice is a no-op.

const SUPPORTED_KINDS = ["reviews", "validations", "deployments"];

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function relativize(repoPath, target) {
  const rel = path.relative(repoPath, target).replace(/\\/g, "/");
  return rel;
}

async function locateSliceFile(slicesRoot, sliceId) {
  if (!(await pathExists(slicesRoot))) return null;
  const slicePattern = sliceId.replace("-", "[_-]");
  const re = new RegExp(`^${slicePattern}(_|$)`, "i");
  const stack = [slicesRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (re.test(e.name)) return full;
    }
  }
  return null;
}

/**
 * @param {string} repoPath
 * @param {{ sliceId?: string, artifactPath?: string, kind?: string, config?: any }} [options]
 */
export async function linkArtifactToSlice(
  repoPath,
  { sliceId, artifactPath, kind, config = null } = {}
) {
  if (!sliceId) throw new Error("linkArtifactToSlice requires sliceId");
  if (!artifactPath) throw new Error("linkArtifactToSlice requires artifactPath");
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new Error(`kind must be one of: ${SUPPORTED_KINDS.join(", ")}`);
  }
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = path.resolve(repoPath, resolved.loop?.slicesRoot || "docs/ai-loop/slices");
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice not found: ${sliceId}`);

  const artifactAbsInput = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.resolve(repoPath, artifactPath);
  if (!(await pathExists(artifactAbsInput))) {
    throw new Error(`Artifact does not exist: ${artifactPath}`);
  }
  // Strip leading `<TS>-` prefix so linked artifact filenames stay uniform
  // with the tight repo-owned slug surface. No-op when the filename has no
  // TS prefix. Renames the file on disk and uses the new path going forward.
  const artifactAbs = await stripArtifactTimestamp(artifactAbsInput);
  const artifactRel = relativize(repoPath, artifactAbs);

  const content = await fs.readFile(sliceFile, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  const existing = Array.isArray(frontmatter[kind]) ? frontmatter[kind] : [];
  if (existing.includes(artifactRel)) {
    return { sliceFile, kind, artifactRel, alreadyLinked: true };
  }
  const updated = { ...frontmatter, [kind]: [...existing, artifactRel] };
  const newContent = serializeFrontmatter(updated, body);
  await fs.writeFile(sliceFile, newContent);
  return { sliceFile, kind, artifactRel, alreadyLinked: false };
}

// Returns the list of artifact paths linked to a slice for a given kind.
// Used by score-inference to walk frontmatter instead of scraping body text.
export async function getLinkedArtifacts(repoPath, sliceId, kind, config = null) {
  if (!SUPPORTED_KINDS.includes(kind)) return [];
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = path.resolve(repoPath, resolved.loop?.slicesRoot || "docs/ai-loop/slices");
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) return [];
  const content = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  return Array.isArray(frontmatter[kind]) ? frontmatter[kind] : [];
}
