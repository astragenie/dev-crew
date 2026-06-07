import fs from "node:fs/promises";
import path from "node:path";

import { getLinkedArtifacts } from "./artifact-linkage.mjs";

// Reads the "- Test Adequacy:" and "- Test Adequacy Skip Reason:" fields
// from a review-result artifact body (Markdown list format from crew CLI).
function parseTestAdequacyFields(content: string) {
  let testAdequacy: string | null = null;
  let skipReason: string | null = null;
  for (const line of content.split(/\r?\n/)) {
    if (/^-\s+Test Adequacy:/i.test(line)) {
      testAdequacy = line.replace(/^-\s+Test Adequacy:\s*/i, "").trim();
    } else if (/^-\s+Test Adequacy Skip Reason:/i.test(line)) {
      skipReason = line.replace(/^-\s+Test Adequacy Skip Reason:\s*/i, "").trim();
    }
  }
  return { testAdequacy, skipReason };
}

// An artifact satisfies the gate when:
//   - testAdequacy is non-empty and not the placeholder "-"
//   - OR testAdequacy is empty/"-" but skipReason is populated
function isTestAdequacySatisfied({
  testAdequacy,
  skipReason
}: {
  testAdequacy: string | null;
  skipReason: string | null;
}) {
  if (testAdequacy && testAdequacy !== "-") return true;
  return Boolean(skipReason && skipReason !== "-");
}

/**
 * Check whether all linked review artifacts for a slice have populated Test Adequacy.
 *
 * @returns {{ satisfied: boolean, reason: string, artifacts: string[], emptyArtifacts?: string[] }}
 */
export async function deriveTestAdequacyGate(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null = null
) {
  const artifactPaths = await getLinkedArtifacts(repoPath, sliceId, "reviews", config);
  if (artifactPaths.length === 0) {
    return { satisfied: true, reason: "no review artifacts linked", artifacts: [] };
  }

  const empty: any[] = [];
  for (const relPath of artifactPaths) {
    const absPath = path.join(repoPath, relPath);
    const content = await fs.readFile(absPath, "utf8").catch((): null => null);
    if (!content) continue;
    const fields = parseTestAdequacyFields(content);
    if (!isTestAdequacySatisfied(fields)) {
      empty.push(relPath);
    }
  }

  if (empty.length === 0) {
    return {
      satisfied: true,
      reason: "test adequacy populated in all linked reviews",
      artifacts: artifactPaths
    };
  }
  return {
    satisfied: false,
    reason:
      `test-adequacy-gate: ${empty.length} review artifact(s) missing Test Adequacy — ` +
      "populate --test-summary or add 'Test Adequacy Skip Reason:' before closing",
    artifacts: artifactPaths,
    emptyArtifacts: empty
  };
}
