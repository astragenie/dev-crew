import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appendJsonl } from "./jsonl-append.mjs";
import type { AgentType } from "./memory-sink.mjs";
import { gitText } from "./run-git.mjs";

// Persistent JSONL operational learnings store.
// Each entry: { id, timestamp, key, insight, confidence, source, sliceId?,
// tags?, failure_class?, root_cause?, recommended_fix?, evidence?, status?,
// scope?, expires_at?, agentType }
// Store location: <repoPath>/.claude/artifacts/loop/learnings.jsonl
//
// FEAT-220: the 7 trailing optional fields enrich the write-shape for
// evidence-backed promotion / automated eval generation (FEAT-221/222). All
// are additive — omitted fields serialize as absent, never `null`, so the 5
// legacy rows parse unchanged and rankLearnings' ordering is untouched
// (see learnings-ranker.mts).
//
// FEAT-219 AC-1/AC-2: `agentType` is additive too, but always written —
// defaults to "unknown" when the caller omits it, matching status/scope's
// existing always-write-with-default pattern so agent-scoped recall never
// mistakes an omitted tag for a successfully scoped one.

export function learningsPath(repoPath: string): string {
  return path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl");
}

// FEAT-188 S1b root-cause fix: `slice close` / `slice grade-write` resolve
// their effective cwd to the active per-slice worktree (effective-cwd.mts)
// whenever a wave/worktree-mode run is in flight — the dominant path for
// this repo (`marathonRunner: "wave"`). A capture write keyed off that
// worktree-local repoPath lands in `<worktree>/.claude/artifacts/loop/
// learnings.jsonl`, a copy that never reaches main once the worktree is
// merged and pruned (git's line-based merge has no way to reconcile
// concurrent JSONL appends from sibling worktrees; the other side is
// silently dropped). grades.jsonl shows the identical symptom — this is a
// worktree-isolation problem, not something specific to the learnings
// store. Resolve to the MAIN worktree root before touching the store so
// every caller — regardless of which worktree it was invoked from —
// converges on one canonical file. Falls back to repoPath unchanged when
// git is unavailable/not a repo (plain test fixtures) or repoPath IS the
// main worktree already (no-op).
const canonicalRootCache = new Map<string, Promise<string>>();

// Exported for reuse by other stores keyed off repoPath that hit the same
// worktree-isolation problem (grade-jsonl-writer.mts / runner-plugin#326).
// Do NOT duplicate this helper — import it.
export async function resolveCanonicalRepoRoot(repoPath: string): Promise<string> {
  let cached = canonicalRootCache.get(repoPath);
  if (!cached) {
    cached = computeCanonicalRepoRoot(repoPath);
    canonicalRootCache.set(repoPath, cached);
  }
  return cached;
}

async function computeCanonicalRepoRoot(repoPath: string): Promise<string> {
  const [commonDir, gitDir] = await Promise.all([
    gitText(["rev-parse", "--git-common-dir"], { cwd: repoPath, maxBuffer: 64 * 1024 }),
    gitText(["rev-parse", "--git-dir"], { cwd: repoPath, maxBuffer: 64 * 1024 })
  ]);
  if (commonDir === null || gitDir === null) return repoPath; // not a git repo (or git unavailable) — use as-is
  const commonAbs = path.resolve(repoPath, commonDir);
  const gitAbs = path.resolve(repoPath, gitDir);
  if (commonAbs === gitAbs) return repoPath; // not a linked worktree
  // Standard layout: the common dir is <mainRepo>/.git — its parent is the
  // main worktree root. Anything else (bare repo, unusual layout) falls
  // back to repoPath rather than guessing.
  return path.basename(commonAbs) === ".git" ? path.dirname(commonAbs) : repoPath;
}

// Read and parse all lines from the learnings JSONL file.
// Returns empty array when the file is absent or all lines are invalid.
async function readAllEntries(filePath: string): Promise<any[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return [];
  }
  const entries: any[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && parsed.key && parsed.insight) {
        entries.push(parsed);
      }
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

// Mint a collision-safe learning id.
//
// Prior scheme was `max(existing ids) + 1` — a sequential counter computed
// from whatever the local store looked like at write time. Two branches (or
// two worktrees, per the canonical-root note above) that each log a learning
// before either side has seen the other's write independently compute the
// same "next" integer for two DIFFERENT insights; the collision surfaces only
// at merge time and required hand-renumbering to reconcile (observed 3x on
// 2026-07-10). A sequential counter fundamentally cannot be collision-safe
// across concurrent writers with no shared state — the fix is to stop
// deriving the id from existing entries at all.
//
// Format matches the dispatch runId convention (hierarchical-dispatch.mts)
// so it reads the same way elsewhere in this repo: an ISO timestamp with
// `:`/`.` swapped for `-` (filesystem/JSON-safe, still lexically sortable —
// e.g. "2026-07-10T00-28-49-710Z-d11484"), plus 3 random bytes to break ties
// within the same millisecond. Existing on-disk integer ids are left as-is;
// every reader below accepts both shapes (see id-comparison notes on
// deleteLearning).
function mintLearningId(): string {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
}

// FEAT-220 enum fields — kept here (not in a separate types module) since
// logLearning's whitelisting record builder is the single write path and
// validate-learnings-schema.mts imports these same lists for its checks.
export const FAILURE_CLASSES = [
  "stale_context",
  "bad_tool_use",
  "hallucinated_ref",
  "ignored_policy",
  "bad_patch",
  "review_fail",
  "validation_fail",
  "subagent_incomplete",
  "other"
] as const;
export type FailureClass = (typeof FAILURE_CLASSES)[number];

export const LEARNING_STATUSES = ["candidate", "validated", "promoted", "rejected"] as const;
export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export const LEARNING_SCOPES = ["agent", "workflow", "repo", "global"] as const;
export type LearningScope = (typeof LEARNING_SCOPES)[number];

export interface LogLearningEntry {
  key: string;
  insight: string;
  confidence?: number;
  source?: string;
  sliceId?: string;
  tags?: string[];
  failure_class?: FailureClass;
  root_cause?: string;
  recommended_fix?: string;
  evidence?: string[];
  status?: LearningStatus;
  scope?: LearningScope;
  expires_at?: string;
  agentType?: AgentType;
}

// Whitelists the optional fields onto the record one at a time. Extracted
// from logLearning to keep its cognitive complexity under the repo's
// noExcessiveCognitiveComplexity cap (15) now that FEAT-220 added 7 more
// optional fields. status/scope carry explicit defaults (per FEAT-220 scope
// doc) — always written, even when the caller omits them. The other 5 new
// fields stay purely absent-when-omitted since they have no default value.
// FEAT-219 AC-2: agentType joins status/scope as always-written-with-default
// — a caller that omits it must never silently produce an entry that later
// agent-scoped ranking treats as successfully scoped.
function applyOptionalFields(record: Record<string, unknown>, entry: LogLearningEntry): void {
  if (entry.sliceId) record.sliceId = entry.sliceId;
  if (Array.isArray(entry.tags) && entry.tags.length > 0) record.tags = entry.tags;
  if (entry.failure_class) record.failure_class = entry.failure_class;
  if (entry.root_cause) record.root_cause = entry.root_cause;
  if (entry.recommended_fix) record.recommended_fix = entry.recommended_fix;
  if (Array.isArray(entry.evidence) && entry.evidence.length > 0) record.evidence = entry.evidence;
  record.status = entry.status ?? "candidate";
  record.scope = entry.scope ?? "repo";
  if (entry.expires_at) record.expires_at = entry.expires_at;
  record.agentType = entry.agentType || "unknown";
}

// Append a new learning to the JSONL store.
// Required fields: key (string), insight (string).
// Optional: confidence (0–1), source (string), sliceId (string), tags (string[]),
// plus the FEAT-220 evidence/lifecycle fields (see applyOptionalFields).
// Throws when key or insight are missing/invalid.
export async function logLearning(repoPath: string, entry: LogLearningEntry): Promise<any> {
  if (!entry || typeof entry.key !== "string" || !entry.key.trim()) {
    throw new Error("logLearning: entry.key must be a non-empty string");
  }
  if (typeof entry.insight !== "string" || !entry.insight.trim()) {
    throw new Error("logLearning: entry.insight must be a non-empty string");
  }

  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  const id = mintLearningId();
  const record: any = {
    id,
    timestamp: new Date().toISOString(),
    key: entry.key.trim(),
    insight: entry.insight.trim(),
    confidence: typeof entry.confidence === "number" ? entry.confidence : null,
    source: entry.source || "agent"
  };
  applyOptionalFields(record, entry);

  await appendJsonl(filePath, record);

  // FEAT-217: mirror the learning into astramem (gated on memory.enabled,
  // fail-silent). Must never affect the learnings-store write contract.
  try {
    const { recordLesson } = await import("./memory-sink.mjs");
    await recordLesson(repoPath, {
      lesson: `${record.key}: ${record.insight}`,
      sliceId: typeof record.sliceId === "string" ? record.sliceId : undefined
    });
  } catch {
    // swallow — memory mirror is non-critical
  }

  return record;
}

// Return every entry in the store, unfiltered and unranked. Exposed for
// callers (failure-classifier.mts) that need the full corpus rather than a
// tail slice — mirrors recentLearnings' canonical-root resolution so both
// readers converge on the same file regardless of which worktree invoked them.
export async function listAllLearnings(repoPath: string): Promise<any[]> {
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  return readAllEntries(filePath);
}

// Return the last N entries from the store plus a markdown digest.
// Returns { count, items, digest } where digest is null when store is empty.
export async function recentLearnings(
  repoPath: string,
  n: number = 3
): Promise<{ count: number; items: any[]; digest: string | null }> {
  if (n <= 0) return { count: 0, items: [], digest: null };
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  const all = await readAllEntries(filePath);
  const items = all.slice(-n);
  const digest = items.length > 0 ? renderLearningsDigest(items) : null;
  return { count: items.length, items, digest };
}

// Search learnings by key prefix or substring match on key/insight.
export async function searchLearnings(
  repoPath: string,
  query: string
): Promise<{ count: number; items: any[] }> {
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  const all = await readAllEntries(filePath);
  const q = query.toLowerCase();
  const items = all.filter(
    (e) => e.key?.toLowerCase().includes(q) || e.insight?.toLowerCase().includes(q)
  );
  return { count: items.length, items };
}

// Delete a learning entry by its id. Accepts both id shapes the store may
// contain: a legacy numeric id (pre-existing rows) or a new mintLearningId()
// string (see mintLearningId above). Comparison goes through String() so a
// caller that parsed a legacy id off argv into a number still matches a
// stored numeric id, without requiring the caller to know which shape a
// given id is ahead of time.
// Returns the deleted record when found, or null when no entry with that id exists.
// Rewrites the entire JSONL file atomically (read → filter → write).
// Throws when the file cannot be read for reasons other than absence.
export async function deleteLearning(
  repoPath: string,
  id: number | string
): Promise<Record<string, unknown> | null> {
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  const all = await readAllEntries(filePath);
  const key = String(id);
  const target = all.find((e) => String(e.id) === key);
  if (!target) return null;
  const remaining = all.filter((e) => String(e.id) !== key);
  const content =
    remaining.map((e) => JSON.stringify(e)).join("\n") + (remaining.length > 0 ? "\n" : "");
  await fs.writeFile(filePath, content, "utf8");
  return target as Record<string, unknown>;
}

function renderLearningsDigest(items: any[]): string {
  const lines: string[] = [];
  lines.push(`## Operational learnings (last ${items.length})`);
  lines.push("");
  for (const item of items) {
    const conf = typeof item.confidence === "number" ? ` (confidence: ${item.confidence})` : "";
    const slice = item.sliceId ? ` [${item.sliceId}]` : "";
    lines.push(`- **${item.key}**${slice}: ${item.insight}${conf}`);
  }
  lines.push("");
  lines.push(
    "_Read these before dispatching the builder — they capture session-to-session operational observations._"
  );
  return lines.join("\n");
}
