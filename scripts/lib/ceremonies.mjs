/** @typedef {{ type: string, id: string, timestamp: string, status: 'scaffold' }} CeremonyResult */

/**
 * @param {{ id: string, title: string }} phase
 * @returns {CeremonyResult}
 */
export function phaseStart(phase) {
  return { type: "phase-start", id: phase.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {{ id: string, title: string }} phase
 * @returns {CeremonyResult}
 */
export function phaseEnd(phase) {
  return { type: "phase-end", id: phase.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @returns {CeremonyResult}
 */
export function featureStart(feat) {
  return { type: "feature-start", id: feat.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @returns {CeremonyResult}
 */
export function featureEnd(feat) {
  return { type: "feature-end", id: feat.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {Array<{ id: string, title: string, status: string, features: Array<{ id: string, title: string, status: string, slices: Array<{ id: string, title: string, status: string }> }> }>} phases
 * @returns {string}
 */
export function renderTree(phases) {
  // stub — implemented in Task 4
  return "";
}
