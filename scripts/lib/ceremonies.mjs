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
export function featureEnd(feat, opts = {}) {
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

  const lines = [];

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
