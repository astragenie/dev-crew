import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { resolveConfig } from "./config-resolver.mjs";
import { pathExists, locateSliceFile, slicesRoot as resolveSlicesRoot } from "./paths.mjs";

const SUPPORTED_KINDS = ["reviews", "validations", "deployments", "agents"];

function relativize(repoPath, target) {
  return path.relative(repoPath, target).replace(/\\/g, "/");
}

/**
 * @param {string} repoPath
 * @param {{ sliceId?: string, artifactPath?: string, kind?: string, config?: any }} [options]
 */
export async function linkArtifactToSlice(
  repoPath,
  { sliceId, artifactPath, kind, config = null }: Record<string, any> = {}
) {
  if (!sliceId) throw new Error("linkArtifactToSlice requires sliceId");
  if (!artifactPath) throw new Error("linkArtifactToSlice requires artifactPath");
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new Error(`kind must be one of: ${SUPPORTED_KINDS.join(", ")}`);
  }
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice not found: ${sliceId}`);

  const artifactAbsInput = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.resolve(repoPath, artifactPath);
  if (!(await pathExists(artifactAbsInput))) {
    throw new Error(`Artifact does not exist: ${artifactPath}`);
  }
  const artifactAbs = artifactAbsInput;
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
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) return [];
  const content = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  return Array.isArray(frontmatter[kind]) ? frontmatter[kind] : [];
}
