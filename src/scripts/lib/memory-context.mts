// FEAT-219 SLICE-2 — buildMemoryContext: role-scoped pre-work memory injection helper.
//
// Wraps the EXISTING readers (rankLearnings, recentLessons, findRelevantDecisions,
// and optionally recallPrior) into a single Markdown "Recent context" block meant
// to be spliced into a dispatch prompt. Introduces no new store — every entry
// still lives in learnings.jsonl / grade files / decisions/*.md / astramem.
//
// Contract:
// - AC-5 (noop / byte-identical dispatch): memory config absent/disabled
//   ("off"/falsy) -> returns "". Callers that don't opt in see zero change.
// - AC-6 (fail-open): any single reader (recallPrior/astramem in particular)
//   throwing never propagates -- the helper still returns whatever the other
//   readers found, matching the bestEffort() pattern already used at
//   start-slice.mts:535.
// - Output is hard-capped at opts.tokenCap (default 800, ~chars/4), truncating
//   deterministically by keeping the highest-ranked entries first.
//
// Wiring this helper into dispatch-assembly sites (start-slice, post-builder-
// fanout, pm/architect entry points) is SLICE-3 -- this module is standalone
// and not called from production code yet.

import fs from "node:fs/promises";
import path from "node:path";

import { findRelevantDecisions } from "./decisions-store.mjs";
import { rankLearnings } from "./learnings-ranker.mjs";
import { recentLessons } from "./lessons-feed.mjs";
import { recallPrior } from "./memory-recall.mjs";

export interface BuildMemoryContextOptions {
  repoPath: string;
  agentType?: string;
  query?: string;
  tags?: string[];
  k?: number;
  tokenCap?: number;
  project?: string;
  config?: Record<string, any> | null;
}

interface ContextLine {
  kind: string;
  summary: string;
  source: string;
  /** Higher weight ranks earlier. Only meaningful for the sort within this call. */
  weight: number;
}

const DEFAULT_K = 5;
const DEFAULT_TOKEN_CAP = 800;

/**
 * Reads `memory.enabled` from the supplied config (shape: `.claude/loop.json`).
 * Falsy, absent, or the string "off"/"never" (case-insensitive) -> disabled.
 * Anything else (true, "on", "auto", ...) -> enabled.
 */
function isMemoryEnabled(config: Record<string, any> | null | undefined): boolean {
  const raw = config?.memory?.enabled;
  if (!raw) return false;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "off" || normalized === "never") return false;
  }
  return true;
}

/** Runs fn, swallowing any error/rejection and returning fallback instead. Never throws. */
async function safe<T>(fn: () => Promise<T> | T, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function readLearningsEntries(repoPath: string): Promise<any[]> {
  const filePath = path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl");
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
      if (parsed && typeof parsed === "object") entries.push(parsed);
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

// Adapts learnings.jsonl's persisted shape (insight/timestamp — see logLearning
// in learnings.mts) to the LearningEntry shape rankLearnings/decayConfidence
// expect (text/createdAt). Without this bridge, decayConfidence sees
// createdAt=undefined and tokenCost reads entry.text.length off undefined,
// throwing inside rankLearnings for every real-world learnings.jsonl entry.
function toLearningEntry(raw: any): any {
  return {
    ...raw,
    text: typeof raw.text === "string" ? raw.text : String(raw.insight ?? raw.key ?? ""),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.parse(raw.timestamp) || 0
  };
}

function learningsToLines(entries: any[], query: string | undefined): ContextLine[] {
  const normalized = entries.map(toLearningEntry);
  const ranked = rankLearnings(normalized, query ? { query } : {});
  const lines: ContextLine[] = [];
  ranked.forEach((e: any, idx: number) => {
    const summary = String(e.insight ?? e.text ?? e.key ?? "").trim();
    if (!summary) return;
    lines.push({
      kind: typeof e.kind === "string" && e.kind ? e.kind : "lesson",
      summary,
      source: e.sliceId || e.source || "learnings",
      weight: 400 - idx
    });
  });
  return lines;
}

function lessonsToLines(items: Record<string, any>[]): ContextLine[] {
  const lines: ContextLine[] = [];
  // Most-recent slice first — recentLessons returns chronological (oldest-first) order.
  const ordered = [...items].reverse();
  ordered.forEach((item, idx) => {
    const baseWeight = 300 - idx * 3;
    const source = item.slice || "grade";
    for (const lesson of item.lessons ?? []) {
      lines.push({ kind: "lesson", summary: lesson, source, weight: baseWeight });
    }
    for (const surprise of item.surprises ?? []) {
      lines.push({ kind: "surprise", summary: surprise, source, weight: baseWeight - 1 });
    }
    for (const followup of item.followups ?? []) {
      lines.push({ kind: "followup", summary: followup, source, weight: baseWeight - 2 });
    }
  });
  return lines;
}

function decisionsToLines(decisions: Record<string, any>[]): ContextLine[] {
  // findRelevantDecisions sorts ascending by id — reverse so the most recent
  // (highest-numbered) decision ranks first.
  const ordered = [...decisions].reverse();
  return ordered.map((d, idx) => ({
    kind: "decision",
    summary: `${d.id}: ${d.title}`,
    source: d.introduced_by_slice || d.id,
    weight: 200 - idx
  }));
}

function recallToLines(results: Record<string, any>[]): ContextLine[] {
  const lines: ContextLine[] = [];
  results.forEach((r, idx) => {
    const summary = String(r.content ?? "").trim();
    if (!summary) return;
    lines.push({
      kind: typeof r.type === "string" && r.type ? r.type : "insight",
      summary,
      source: r.slice_id || r.feat_id || "astramem",
      weight: 100 - idx
    });
  });
  return lines;
}

function tokenCost(text: string): number {
  return Math.ceil(text.length / 4);
}

function renderLine(line: ContextLine): string {
  return `- [${line.kind}] ${line.summary} — ${line.source}`;
}

/** Assembles the final Markdown block, hard-capped at tokenCap. Returns "" when nothing fits. */
function renderBlock(k: number, lines: ContextLine[], tokenCap: number): string {
  if (lines.length === 0) return "";

  const topK = [...lines].sort((a, b) => b.weight - a.weight).slice(0, k);
  const header = `## Recent context (top-${k})`;
  const out: string[] = [header];
  let used = tokenCost(header);

  for (const line of topK) {
    const rendered = renderLine(line);
    const cost = tokenCost(rendered);
    if (used + cost > tokenCap) break;
    out.push(rendered);
    used += cost;
  }

  return out.length > 1 ? out.join("\n") : "";
}

/** Synchronous variant of safe() for the pure-function line-mapping steps. Never throws. */
function safeLines(fn: () => ContextLine[]): ContextLine[] {
  try {
    return fn();
  } catch {
    return [];
  }
}

/**
 * Build a role-scoped "recent context" Markdown block by wrapping the existing
 * rank/lessons/decisions readers (plus optional astramem recall via recallPrior).
 * Returns "" when memory is disabled/absent, or when no candidate entries exist.
 *
 * Fail-open (AC-6): any individual reader throwing — recallPrior in particular,
 * which shells out to astramem — never prevents the other sources' entries
 * from appearing in the output.
 */
export async function buildMemoryContext(opts: BuildMemoryContextOptions): Promise<string> {
  const config = opts.config ?? null;
  if (!isMemoryEnabled(config)) return "";

  const { repoPath } = opts;
  const k = opts.k ?? DEFAULT_K;
  const tokenCap = opts.tokenCap ?? DEFAULT_TOKEN_CAP;
  const tags = opts.tags ?? [];

  const [learningsEntries, lessonsResult, decisions, recallResults] = await Promise.all([
    safe(() => readLearningsEntries(repoPath), [] as any[]),
    safe(() => recentLessons(repoPath, { limit: k, config }), {
      count: 0,
      items: [] as Record<string, any>[],
      digest: ""
    }),
    safe(() => findRelevantDecisions(repoPath, tags, config), [] as Record<string, any>[]),
    safe(
      () =>
        recallPrior({
          featId: opts.query || opts.agentType || "context",
          sliceId: opts.agentType || "context",
          touchesFiles: tags,
          k,
          ...(opts.project !== undefined ? { project: opts.project } : {})
        }),
      [] as Record<string, any>[]
    )
  ]);

  const combined: ContextLine[] = [
    ...safeLines(() => learningsToLines(learningsEntries, opts.query)),
    ...safeLines(() => lessonsToLines(lessonsResult.items)),
    ...safeLines(() => decisionsToLines(decisions)),
    ...safeLines(() => recallToLines(recallResults))
  ];

  return renderBlock(k, combined, tokenCap);
}
