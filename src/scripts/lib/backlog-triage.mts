import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { moveFeature } from "./backlog-writer.mjs";
import { computeAutonomousSafe } from "./pm-scorer.mjs";

// Heuristic triage. Reads body + frontmatter, fills missing priority /
// category / target_release / depends_on. Leaves a triage_notes line so the
// agent (or PM) can audit. Designed to be cheap and deterministic — no LLM
// call. The actual LLM-driven decomposition / refinement is the agent's job;
// this is just the no-thinking baseline.

const BUG_HINTS = /\b(bug|broken|regress|crash|error|fix|defect)\b/i;
const OPS_HINTS = /\b(deploy|terraform|infra|ops|ci|cd|monitoring|alert|aca|azure)\b/i;
const DEBT_HINTS = /\b(refactor|cleanup|tech[-\s]?debt|simplify|deprecate)\b/i;
const URGENT_HINTS = /\b(urgent|critical|asap|p0|blocker|incident|outage)\b/i;
const SOON_HINTS = /\b(soon|next sprint|this week|deadline|due)\b/i;

// Legacy PM dimension keys that signal an old-schema FEAT.
const LEGACY_PM_KEYS = [
  "pm_strategic_fit",
  "pm_implementation_confidence",
  "pm_demand_signal",
  "pm_risk_level"
] as const;

// New PM dimension names used by pm-scorer.mts.
const NEW_PM_DIMENSIONS = [
  "customer_impact",
  "effort_estimate",
  "strategic_alignment",
  "technical_risk",
  "dependency_depth"
] as const;

// Default scores (medium) used when no PM data is available.
const DEFAULT_SCORES: Record<string, number> = {
  customer_impact: 0.5,
  effort_estimate: 0.5,
  strategic_alignment: 0.5,
  technical_risk: 0.5,
  dependency_depth: 0.5
};

/**
 * detectAcceptanceCriteria — scan `body` for a "## Acceptance criteria"
 * heading (case-insensitive) and count subsequent bullet lines matching
 * `^- (\[[ x]\] )?\S` until the next `##` heading.
 *
 * Returns { count, hasMin } where hasMin is count >= 3.
 */
export function detectAcceptanceCriteria(body: string): { count: number; hasMin: boolean } {
  const lines = body.split("\n");
  let inSection = false;
  let count = 0;

  for (const line of lines) {
    if (/^##\s+acceptance\s+criteria/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // Stop at the next ## heading.
      if (/^##/.test(line)) break;
      // Count bullet lines: bare "- " or "- [ ]" / "- [x]" forms.
      if (/^- (\[[ x]\] )?\S/.test(line)) count++;
    }
  }

  return { count, hasMin: count >= 3 };
}

/**
 * detectLegacySchema — returns true if the frontmatter object contains any
 * old-schema PM dimension key (pm_strategic_fit, pm_implementation_confidence,
 * pm_demand_signal, or pm_risk_level).
 */
export function detectLegacySchema(fm: Record<string, any>): boolean {
  return LEGACY_PM_KEYS.some((key) => Object.prototype.hasOwnProperty.call(fm, key));
}

/**
 * migrateLegacyScores — given a frontmatter object that has old-schema keys,
 * produces:
 *  - `legacyKeys`: the old values copied under pm_legacy_<name> keys
 *  - `defaultScores`: new PM dimension defaults (all 0.5)
 *  - `migrationNote`: a human-readable string including today's date
 *
 * The `today` parameter should be formatted as "YYYY-MM-DD".
 */
export function migrateLegacyScores(
  fm: Record<string, any>,
  today: string
): {
  legacyKeys: Record<string, any>;
  defaultScores: Record<string, number>;
  migrationNote: string;
} {
  const legacyKeys: Record<string, any> = {};

  // Copy all legacy keys (including pm_customer_impact if present in old schema).
  const allLegacyKeys = [...LEGACY_PM_KEYS, "pm_customer_impact"] as const;
  for (const key of allLegacyKeys) {
    if (Object.prototype.hasOwnProperty.call(fm, key)) {
      const shortName = key.replace(/^pm_/, "");
      legacyKeys[`pm_legacy_${shortName}`] = fm[key];
    }
  }

  const defaultScores = { ...DEFAULT_SCORES };
  const migrationNote = `legacy PM schema preserved as pm_legacy_*; new dimensions defaulted to 0.5 on ${today}`;

  return { legacyKeys, defaultScores, migrationNote };
}

function inferCategory(text: string): string {
  if (BUG_HINTS.test(text)) return "bugfix";
  if (OPS_HINTS.test(text)) return "ops";
  if (DEBT_HINTS.test(text)) return "tech-debt";
  return "feature";
}

function inferPriority(text: string): string {
  if (URGENT_HINTS.test(text)) return "P0";
  if (SOON_HINTS.test(text)) return "P1";
  return "P2";
}

// MVP target-release inference: use the priority + a "next minor" suggestion.
// User can override. Format follows whatever the repo uses ("v1.1.0", "v1.1",
// "1.1.0" — we keep the user-supplied value if any, otherwise return null).
function inferTargetRelease(_text: string): string | null {
  // Without knowledge of the repo's current release line, we don't guess.
  // Leave null; PM/agent fills.
  return null;
}

/**
 * Compute today's date as "YYYY-MM-DD".
 * Uses UTC to avoid timezone drift between machines.
 */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Apply legacy-schema migration updates and return resolved scores. */
function applyLegacyMigration(
  fm: Record<string, any>,
  today: string,
  updates: Record<string, any>
): Record<string, number> {
  const { legacyKeys, defaultScores, migrationNote } = migrateLegacyScores(fm, today);
  Object.assign(updates, legacyKeys);
  for (const dim of NEW_PM_DIMENSIONS) {
    updates[`pm_${dim}`] = defaultScores[dim];
  }
  updates.migration_note = migrationNote;
  return defaultScores;
}

/** Read existing new-schema pm_* scores from frontmatter into DEFAULT_SCORES copy. */
function resolveNewSchemaScores(fm: Record<string, any>): Record<string, number> {
  const scores = { ...DEFAULT_SCORES };
  for (const dim of NEW_PM_DIMENSIONS) {
    const val = fm[`pm_${dim}`];
    if (typeof val === "number" && !Number.isNaN(val)) {
      scores[dim] = val;
    }
  }
  return scores;
}

/** Build the triage_notes string. */
function buildTriageNotes(
  updates: Record<string, any>,
  acCount: number,
  derivedFrom: string | null | undefined,
  autonomousSafe: boolean
): string {
  const notes: string[] = [];
  if (updates.category) notes.push(`category inferred as ${updates.category} from body content`);
  if (updates.priority) notes.push(`priority inferred as ${updates.priority} from body content`);
  if (updates.target_release) notes.push(`target_release inferred as ${updates.target_release}`);
  const verdict = autonomousSafe ? "true" : "false";
  notes.push(
    `autonomous_safe inferred: AC count=${acCount}, derived_from=${derivedFrom ?? "null"} → ${verdict}`
  );
  return notes.join("; ");
}

export function triageEntry(entry: {
  body?: string;
  frontmatter: Record<string, any>;
}): Record<string, any> {
  const text = `${entry.body || ""}\n${entry.frontmatter.title || ""}`;
  const updates: Record<string, any> = {};

  if (!entry.frontmatter.category) updates.category = inferCategory(text);
  if (!entry.frontmatter.priority) updates.priority = inferPriority(text);
  if (!entry.frontmatter.target_release) {
    const tr = inferTargetRelease(text);
    if (tr) updates.target_release = tr;
  }

  // --- autonomous_safe heuristic ---

  const { count: acCount, hasMin: hasAcceptanceCriteria } = detectAcceptanceCriteria(
    entry.body || ""
  );

  const derivedFrom = entry.frontmatter.derived_from;
  const hasSpec =
    typeof derivedFrom === "string" && derivedFrom.length > 0 && derivedFrom.startsWith("SPEC-");

  const today = todayIso();
  const isLegacy = detectLegacySchema(entry.frontmatter);
  const resolvedScores = isLegacy
    ? applyLegacyMigration(entry.frontmatter, today, updates)
    : resolveNewSchemaScores(entry.frontmatter);

  const autonomousSafe = computeAutonomousSafe(resolvedScores, { hasSpec, hasAcceptanceCriteria });
  updates.autonomous_safe = autonomousSafe;

  updates.triage_notes = buildTriageNotes(updates, acCount, derivedFrom, autonomousSafe);

  return updates;
}

export async function triagePending(repoPath: string, config: any = null) {
  const entries = await listBacklog(repoPath, { config });
  const pending = filterBacklog(entries, { status: "pending" });
  const results: any[] = [];
  for (const entry of pending) {
    const updates = triageEntry(entry);
    const moved = await moveFeature(entry.filePath, "triaged", updates);
    results.push({ id: entry.id, ...updates, from: moved.from, to: moved.to });
  }
  return results;
}
