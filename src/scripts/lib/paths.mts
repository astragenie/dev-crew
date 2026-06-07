import path from "node:path";
import fs from "node:fs/promises";
import { cached } from "./cache.mjs";

const PATH_DEFAULTS = {
  artifactRoot: ".claude/artifacts/loop",
  aiLoopRoot: ".claude/artifacts/loop/ai-loop",
  backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
  slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
  backlogRoot: ".claude/artifacts/loop/backlog",
  specsRoot: ".claude/artifacts/loop/specs",
  gradesRoot: ".claude/artifacts/loop/grades",
  decisionsRoot: ".claude/artifacts/loop/decisions",
  releasesRoot: ".claude/artifacts/loop/releases",
  retrospectivesRoot: ".claude/artifacts/loop/retrospectives",
  snapshotPath: ".claude/artifacts/loop/loop-snapshot.md",
  phaseGateArtifactDir: ".claude/artifacts/crew/validations"
};

function resolve(key: string, config: Record<string, any> | null | undefined) {
  return config?.loop?.[key] || PATH_DEFAULTS[key as keyof typeof PATH_DEFAULTS];
}

export function artifactRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("artifactRoot", config));
}
export function aiLoopRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("aiLoopRoot", config));
}
export function backlogPath(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("backlogPath", config));
}
export function slicesRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("slicesRoot", config));
}
export function backlogRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("backlogRoot", config));
}
export function specsRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("specsRoot", config));
}
export function gradesRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("gradesRoot", config));
}
export function decisionsRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("decisionsRoot", config));
}
export function releasesRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("releasesRoot", config));
}
export function retroRoot(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("retrospectivesRoot", config));
}
export function snapshotPath(repoPath: string, config: Record<string, any> | null | undefined) {
  return path.join(repoPath, resolve("snapshotPath", config));
}
export function phaseGateArtifactDir(
  repoPath: string,
  config: Record<string, any> | null | undefined
) {
  return path.join(repoPath, resolve("phaseGateArtifactDir", config));
}

export async function pathExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function locateSliceFile(slicesRootDir: string, sliceId: string) {
  const cacheKey = `locateSlice:${slicesRootDir}:${sliceId}`;
  return cached(cacheKey, async () => {
    if (!(await pathExists(slicesRootDir))) return null;
    const slicePattern = sliceId.replace("-", "[_-]");
    const re = new RegExp(`^${slicePattern}(_|$)`, "i");
    const stack = [slicesRootDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (!dir) continue;
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
  });
}

export { PATH_DEFAULTS };
