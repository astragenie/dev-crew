// Single chokepoint for "is this path loop-owned state?". Writers call
// assertStatePath before any fs.writeFile/rename of state files so a
// misrouted root fails loudly instead of silently forking a second tree.
import path from "node:path";
import {
  artifactRoot,
  backlogRoot,
  backlogPath,
  slicesRoot,
  specsRoot,
  gradesRoot,
  decisionsRoot,
  releasesRoot,
  retroRoot
} from "./paths.mjs";

type Config = Record<string, any> | null | undefined;

export function resolveStateRoots(repoPath: string, config: Config): string[] {
  const roots = [
    artifactRoot(repoPath, config),
    backlogRoot(repoPath, config),
    backlogPath(repoPath, config),
    slicesRoot(repoPath, config),
    specsRoot(repoPath, config),
    gradesRoot(repoPath, config),
    decisionsRoot(repoPath, config),
    releasesRoot(repoPath, config),
    retroRoot(repoPath, config)
  ];
  return [...new Set(roots.map((r) => path.resolve(r)))];
}

export function assertStatePath(repoPath: string, config: Config, target: string): void {
  const resolved = path.resolve(target);
  const roots = resolveStateRoots(repoPath, config);
  const inside = roots.some((root) => resolved === root || resolved.startsWith(root + path.sep));
  if (!inside) {
    throw new Error(
      `state write refused: ${resolved} is outside the resolved state roots:\n  ${roots.join("\n  ")}`
    );
  }
}
