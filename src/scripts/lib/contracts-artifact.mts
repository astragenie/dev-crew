import path from "node:path";
import { pathExists } from "./paths.mjs";

const CONTRACTS_DIR = ".claude/artifacts/crew/designs";

/**
 * Returns the canonical path for a FEAT-scoped contracts artifact.
 * Path is shared with hero-crew's /crew:orchestrate-slice Step 1 — do not
 * rename this constant without a corresponding update in hero-crew.
 */
export function getContractsPath(repoPath: string, featureId: string): string {
  return path.posix.join(repoPath.replace(/\\/g, "/"), CONTRACTS_DIR, `${featureId}-contracts.md`);
}

/**
 * Returns true when the contracts artifact for the given featureId already
 * exists on disk. Read-only — no dispatch logic, no side effects.
 */
export async function contractsArtifactExists(
  repoPath: string,
  featureId: string
): Promise<boolean> {
  return pathExists(getContractsPath(repoPath, featureId));
}
