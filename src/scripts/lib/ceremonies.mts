import fs from "node:fs/promises";
import path from "node:path";

/** @typedef {{ type: string, id: string, timestamp: string, status: 'scaffold' }} CeremonyResult */

/**
 * @param {{ id: string, title: string }} phase
 * @returns {CeremonyResult}
 */
export function phaseStart(phase) {
  return {
    type: "phase-start",
    id: phase.id,
    timestamp: new Date().toISOString(),
    status: "scaffold"
  };
}

/**
 * @param {{ id: string, title: string }} phase
 * @returns {CeremonyResult}
 */
export function phaseEnd(phase) {
  return {
    type: "phase-end",
    id: phase.id,
    timestamp: new Date().toISOString(),
    status: "scaffold"
  };
}

/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @returns {CeremonyResult}
 */
export function featureStart(feat) {
  return {
    type: "feature-start",
    id: feat.id,
    timestamp: new Date().toISOString(),
    status: "scaffold"
  };
}

/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @param {{ simplifyRan?: boolean }} [opts]
 * @returns {{ type: string, id: string, timestamp: string, status: string, simplifyRan: boolean }}
 */
export function featureEnd(feat, opts: Record<string, any> = {}) {
  return {
    type: "feature-end",
    id: feat.id,
    timestamp: new Date().toISOString(),
    status: "scaffold",
    simplifyRan: opts.simplifyRan ?? false
  };
}

/**
 * @param {Array<{ id: string, title: string, status: string, features: Array<{ id: string, title: string, status: string, slices: Array<{ id: string, title: string, status: string }> }> }>} phases
 * @returns {string}
 */
export function renderTree(phases) {
  if (!phases || phases.length === 0) return "";

  const lines: any[] = [];

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    if (pi > 0) lines.push("");
    lines.push(`Phase ${phase.id} — ${phase.title} [${phase.status}]`);

    const features = phase.features ?? [];
    for (let fi = 0; fi < features.length; fi++) {
      const feat = features[fi];
      const isLastFeat = fi === features.length - 1;
      const featBranch = isLastFeat ? "└" : "├";
      lines.push(`${featBranch}── ${feat.id} ${feat.title} [${feat.status}]`);

      const slices = feat.slices ?? [];
      const sliceIndent = isLastFeat ? "    " : "│   ";
      for (let si = 0; si < slices.length; si++) {
        const slice = slices[si];
        const isLastSlice = si === slices.length - 1;
        const sliceBranch = isLastSlice ? "└" : "├";
        lines.push(`${sliceIndent}${sliceBranch}── ${slice.id} ${slice.title} [${slice.status}]`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * @param {string} repoPath
 * @param {{ type: string, id: string, timestamp: string, status: string, simplifyRan: boolean }} result
 * @returns {Promise<string>} written file path
 */
export async function writeFeatureEndCeremony(repoPath, result) {
  const dir = path.join(repoPath, ".claude", "artifacts", "crew", "ceremonies");
  await fs.mkdir(dir, { recursive: true });
  const stamp = result.timestamp.replace(/[^0-9]/g, "");
  const filename = `feature-end-${result.id}-${stamp}.json`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2));
  return filePath;
}

/**
 * @param {string} repoPath
 * @param {string} featureId
 * @returns {Promise<{ type: string, id: string, timestamp: string, status: string, simplifyRan: boolean } | null>}
 */
export async function readFeatureEndCeremony(repoPath, featureId) {
  const dir = path.join(repoPath, ".claude", "artifacts", "crew", "ceremonies");
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const prefix = `feature-end-${featureId}-`;
  const matches = entries.filter((e) => e.startsWith(prefix) && e.endsWith(".json"));
  if (matches.length === 0) return null;
  const ceremonies = (
    await Promise.all(
      matches.map(async (filename) => {
        const raw = await fs.readFile(path.join(dir, filename), "utf8");
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
    )
  ).filter((c) => c !== null);
  if (ceremonies.length === 0) return null;
  ceremonies.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return ceremonies[0];
}
