import fs from "node:fs/promises";
import path from "node:path";

// Persistent JSONL operational learnings store.
// Each entry: { id, timestamp, key, insight, confidence, source, sliceId?, tags? }
// Store location: <repoPath>/.claude/artifacts/loop/learnings.jsonl

export function learningsPath(repoPath: string): string {
  return path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl");
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

  const filePath = learningsPath(repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

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

  await fs.appendFile(filePath, JSON.stringify(record) + "\n", "utf8");
  return record;
}

// Return the last N entries from the store plus a markdown digest.
// Returns { count, items, digest } where digest is null when store is empty.
export async function recentLearnings(
  repoPath: string,
  n: number = 3
): Promise<{ count: number; items: any[]; digest: string | null }> {
  const filePath = learningsPath(repoPath);
  const all = await readAllEntries(filePath);
  const items = all.slice(-Math.max(0, n));
  const digest = items.length > 0 ? renderLearningsDigest(items) : null;
  return { count: items.length, items, digest };
}

// Search learnings by key prefix or substring match on key/insight.
export async function searchLearnings(
  repoPath: string,
  query: string
): Promise<{ count: number; items: any[] }> {
  const filePath = learningsPath(repoPath);
  const all = await readAllEntries(filePath);
  const q = query.toLowerCase();
  const items = all.filter(
    (e) =>
      (e.key && e.key.toLowerCase().includes(q)) ||
      (e.insight && e.insight.toLowerCase().includes(q))
  );
  return { count: items.length, items };
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
