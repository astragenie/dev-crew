import { execFile as execFileCb } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { appendJsonl } from "./jsonl-append.mjs";

const execFile = promisify(execFileCb);

// Persistent JSONL operational learnings store.
// Each entry: { id, timestamp, key, insight, confidence, source, sliceId?, tags? }
// Store location: <repoPath>/.claude/artifacts/loop/learnings.jsonl

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

async function resolveCanonicalRepoRoot(repoPath: string): Promise<string> {
  let cached = canonicalRootCache.get(repoPath);
  if (!cached) {
    cached = computeCanonicalRepoRoot(repoPath);
    canonicalRootCache.set(repoPath, cached);
  }
  return cached;
}

async function computeCanonicalRepoRoot(repoPath: string): Promise<string> {
  try {
    const [{ stdout: commonDir }, { stdout: gitDir }] = await Promise.all([
      execFile("git", ["rev-parse", "--git-common-dir"], { cwd: repoPath, maxBuffer: 64 * 1024 }),
      execFile("git", ["rev-parse", "--git-dir"], { cwd: repoPath, maxBuffer: 64 * 1024 })
    ]);
    const commonAbs = path.resolve(repoPath, commonDir.trim());
    const gitAbs = path.resolve(repoPath, gitDir.trim());
    if (commonAbs === gitAbs) return repoPath; // not a linked worktree
    // Standard layout: the common dir is <mainRepo>/.git — its parent is the
    // main worktree root. Anything else (bare repo, unusual layout) falls
    // back to repoPath rather than guessing.
    return path.basename(commonAbs) === ".git" ? path.dirname(commonAbs) : repoPath;
  } catch {
    return repoPath; // not a git repo (or git unavailable) — use as-is
  }
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

// Compute the next monotonic ID given existing entries.
function nextId(entries: any[]): number {
  if (entries.length === 0) return 1;
  const max = entries.reduce((m, e) => Math.max(m, typeof e.id === "number" ? e.id : 0), 0);
  return max + 1;
}

// Append a new learning to the JSONL store.
// Required fields: key (string), insight (string).
// Optional: confidence (0–1), source (string), sliceId (string), tags (string[]).
// Throws when key or insight are missing/invalid.
export async function logLearning(
  repoPath: string,
  entry: {
    key: string;
    insight: string;
    confidence?: number;
    source?: string;
    sliceId?: string;
    tags?: string[];
  }
): Promise<any> {
  if (!entry || typeof entry.key !== "string" || !entry.key.trim()) {
    throw new Error("logLearning: entry.key must be a non-empty string");
  }
  if (typeof entry.insight !== "string" || !entry.insight.trim()) {
    throw new Error("logLearning: entry.insight must be a non-empty string");
  }

  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  const existing = await readAllEntries(filePath);
  const id = nextId(existing);
  const record: any = {
    id,
    timestamp: new Date().toISOString(),
    key: entry.key.trim(),
    insight: entry.insight.trim(),
    confidence: typeof entry.confidence === "number" ? entry.confidence : null,
    source: entry.source || "agent"
  };
  if (entry.sliceId) record.sliceId = entry.sliceId;
  if (Array.isArray(entry.tags) && entry.tags.length > 0) record.tags = entry.tags;

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

// Delete a learning entry by its numeric id.
// Returns the deleted record when found, or null when no entry with that id exists.
// Rewrites the entire JSONL file atomically (read → filter → write).
// Throws when the file cannot be read for reasons other than absence.
export async function deleteLearning(
  repoPath: string,
  id: number
): Promise<Record<string, unknown> | null> {
  const canonicalRoot = await resolveCanonicalRepoRoot(repoPath);
  const filePath = learningsPath(canonicalRoot);
  const all = await readAllEntries(filePath);
  const target = all.find((e) => e.id === id);
  if (!target) return null;
  const remaining = all.filter((e) => e.id !== id);
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
