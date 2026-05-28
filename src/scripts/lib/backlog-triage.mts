import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { moveFeature } from "./backlog-writer.mjs";

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

function inferCategory(text) {
  if (BUG_HINTS.test(text)) return "bugfix";
  if (OPS_HINTS.test(text)) return "ops";
  if (DEBT_HINTS.test(text)) return "tech-debt";
  return "feature";
}

function inferPriority(text) {
  if (URGENT_HINTS.test(text)) return "P0";
  if (SOON_HINTS.test(text)) return "P1";
  return "P2";
}

// MVP target-release inference: use the priority + a "next minor" suggestion.
// User can override. Format follows whatever the repo uses ("v1.1.0", "v1.1",
// "1.1.0" — we keep the user-supplied value if any, otherwise return null).
function inferTargetRelease(_text) {
  // Without knowledge of the repo's current release line, we don't guess.
  // Leave null; PM/agent fills.
  return null;
}

export function triageEntry(entry) {
  const text = `${entry.body || ""}\n${entry.frontmatter.title || ""}`;
  const updates: Record<string, any> = {};
  if (!entry.frontmatter.category) updates.category = inferCategory(text);
  if (!entry.frontmatter.priority) updates.priority = inferPriority(text);
  if (!entry.frontmatter.target_release) {
    const tr = inferTargetRelease(text);
    if (tr) updates.target_release = tr;
  }
  const notes: any[] = [];
  if (updates.category) notes.push(`category inferred as ${updates.category} from body content`);
  if (updates.priority) notes.push(`priority inferred as ${updates.priority} from body content`);
  if (updates.target_release) notes.push(`target_release inferred as ${updates.target_release}`);
  if (notes.length === 0) notes.push("no fields needed inference");
  updates.triage_notes = notes.join("; ");
  return updates;
}

export async function triagePending(repoPath, config = null) {
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
