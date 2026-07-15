// FEAT-219 SLICE-2 — buildMemoryContext: role-scoped pre-work memory injection helper.
//
// Wraps the EXISTING readers (rankLearnings, recentLessons, findRelevantDecisions,
// and optionally the shared astramem recall transport) into a single Markdown
// "Recent context" block meant to be spliced into a dispatch prompt. Introduces
// no new store — every entry still lives in learnings.jsonl / grade files /
// decisions/*.md / astramem.
//
// Contract:
// - AC-5 (noop / byte-identical dispatch): memory config absent/disabled
//   ("off"/falsy) -> returns "". Callers that don't opt in see zero change.
// - AC-6 (fail-open): any single reader (astramem recall in particular)
//   throwing never propagates -- the helper still returns whatever the other
//   readers found, matching the bestEffort() pattern already used at
//   start-slice.mts:535.
// - Output is hard-capped at opts.tokenCap (default 800, ~chars/4), truncating
//   deterministically by keeping the highest-ranked entries first.
//
// FEAT-231: the astramem source now calls the shared @astragenie/astramem-
// client's `recallSilent` — the same transport start-slice.mts's
// runRecallHook uses — instead of the legacy CLI-spawn `recallPrior`
// (memory-recall.mts). One astramem recall transport across every dispatch
// surface. `recallSilent` is itself fail-silent (resolves null on any
// failure); the `safe()` wrapper below still guards it so a thrown error
// can never escape.
//
// Wiring this helper into dispatch-assembly sites (start-slice, post-builder-
// fanout, pm/architect entry points) is SLICE-3 -- this module is standalone
// and not called from production code yet.

import fs from "node:fs/promises";
import path from "node:path";

// FEAT-238: `recallSilent` is imported dynamically (inside the memory-enabled
// safe() block below), NOT statically here. A top-level value import resolves
// @astragenie/astramem-client at module LOAD — before the `memory.enabled`
// gate runs — so in any repo where the package is absent from the runner
// plugin cache, merely importing this module (post-builder-fanout, wave
// dispatch, slice start) crashed with ENOENT, and `memory.enabled = "never"`
// could not bypass it. `import type` is erased at compile time and never
// triggers runtime resolution, so the RecallHit type import is safe to keep.
import type { AgentProfileResponse, RecallHit } from "@astragenie/astramem-client";
import { findRelevantDecisions } from "./decisions-store.mjs";
import { rankLearnings } from "./learnings-ranker.mjs";
import { recentLessons } from "./lessons-feed.mjs";
// Static import is safe: profile-feedback's sidecar writer touches only
// node:fs — it never imports @astragenie/astramem-client, so it cannot
// re-introduce the module-load ENOENT the dynamic profileSilent import avoids.
import { writeInjectedAtoms } from "./profile-feedback.mjs";

export interface BuildMemoryContextOptions {
  repoPath: string;
  agentType?: string;
  query?: string;
  tags?: string[];
  k?: number;
  tokenCap?: number;
  project?: string;
  config?: Record<string, any> | null;
  /** When set, profile-injected atom ids are recorded to a per-slice sidecar
   *  so slice-close can credit them on a gate PASS (memory.feedback.enabled). */
  sliceId?: string;
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

/** Opt-in gate for agent-scoped recall (`memory.recall.scopeByAgent`). Default
 * OFF: astramem's `--agent` is a HARD filter, so scoping before enough
 * agent-tagged history exists would return nothing (#309). */
function scopeByAgentEnabled(config: Record<string, any> | null | undefined): boolean {
  return config?.memory?.recall?.scopeByAgent === true;
}

/** Opt-in gate for agent-profile injection (`memory.profile.enabled`). Default
 * off — mirrors dev-team's inject-profile gate and the `scopeByAgent`/#309
 * caution (the profile is agent-scoped; loading it before an agent has a
 * warm usefulness signal ranks by importance, not usefulness). */
function profileEnabled(config: Record<string, any> | null | undefined): boolean {
  return config?.memory?.profile?.enabled === true;
}

/** Convert an agent-profile receipt into weighted context lines. Corrections
 * lead (highest weight → rendered first), then recent decisions, then top
 * lessons — the deterministic "what this agent got wrong / decided / learned"
 * ordering. Weights sit ABOVE the recall band (recallToLines uses <=100) so
 * the agent's own track record ranks ahead of task-scoped semantic recall. */
function profileToLines(profile: AgentProfileResponse, maxLessons: number): ContextLine[] {
  const lines: ContextLine[] = [];
  for (const c of profile.corrections) {
    const summary = String(c.text ?? "").trim();
    if (summary)
      lines.push({ kind: `correction:${c.action}`, summary, source: "profile", weight: 300 });
  }
  for (const d of profile.recent_decisions) {
    const summary = String(d.text ?? "").trim();
    if (summary) lines.push({ kind: "decision", summary, source: "profile", weight: 200 });
  }
  profile.top_lessons.slice(0, maxLessons).forEach((l, idx) => {
    const summary = String(l.text ?? "").trim();
    if (summary) lines.push({ kind: "lesson", summary, source: "profile", weight: 150 - idx });
  });
  return lines;
}

/** Atom ids of exactly what profileToLines injects, in the same order and
 * under the same text-non-empty filter and top-N lesson cap — so the recorded
 * "injected" set equals the rendered set, keeping close-time feedback honest. */
function profileAtomIds(profile: AgentProfileResponse, maxLessons: number): string[] {
  const ids: string[] = [];
  for (const c of profile.corrections) {
    if (c.id && String(c.text ?? "").trim()) ids.push(c.id);
  }
  for (const d of profile.recent_decisions) {
    if (d.id && String(d.text ?? "").trim()) ids.push(d.id);
  }
  profile.top_lessons.slice(0, maxLessons).forEach((l) => {
    if (l.id && String(l.text ?? "").trim()) ids.push(l.id);
  });
  return ids;
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

// Consumes recallSilent's RecallHit shape directly ({id,type,text,score,
// source?,...}) — no adapter needed beyond the field-name mapping below
// (text -> summary, source -> source). Keeps the rendered line format
// ("- [kind] summary — source") unchanged from the pre-FEAT-231 recallPrior
// path.
function recallToLines(results: RecallHit[]): ContextLine[] {
  const lines: ContextLine[] = [];
  results.forEach((r, idx) => {
    const summary = String(r.text ?? "").trim();
    if (!summary) return;
    lines.push({
      kind: typeof r.type === "string" && r.type ? r.type : "insight",
      summary,
      source: r.source || "astramem",
      weight: 100 - idx
    });
  });
  return lines;
}

/** Builds the recallSilent query string, mirroring start-slice.mts's
 * buildRecallRequest so both dispatch surfaces query astramem the same way. */
function buildAstramemQuery(featId: string, sliceId: string, touchesFiles: string[]): string {
  const filePart = touchesFiles.length > 0 ? ` files:${touchesFiles.slice(0, 5).join(",")}` : "";
  return `${featId} ${sliceId}${filePart} prior failures decisions lessons`;
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
 * rank/lessons/decisions readers (plus optional astramem recall via the
 * shared @astragenie/astramem-client's recallSilent).
 * Returns "" when memory is disabled/absent, or when no candidate entries exist.
 *
 * Fail-open (AC-6): any individual reader throwing — the astramem recall in
 * particular — never prevents the other sources' entries from appearing in
 * the output.
 */
export async function buildMemoryContext(opts: BuildMemoryContextOptions): Promise<string> {
  const config = opts.config ?? null;
  if (!isMemoryEnabled(config)) return "";

  const { repoPath } = opts;
  const k = opts.k ?? DEFAULT_K;
  const tokenCap = opts.tokenCap ?? DEFAULT_TOKEN_CAP;
  const tags = opts.tags ?? [];

  const [learningsEntries, lessonsResult, decisions, profileLines, recallResults] =
    await Promise.all([
      safe(() => readLearningsEntries(repoPath), [] as any[]),
      safe(() => recentLessons(repoPath, { limit: k, config }), {
        count: 0,
        items: [] as Record<string, any>[],
        digest: ""
      }),
      safe(() => findRelevantDecisions(repoPath, tags, config), [] as Record<string, any>[]),
      // Agent-profile injection (opt-in via memory.profile.enabled). Reads the
      // agent's ranked track record (corrections/decisions/lessons) from the
      // daemon via astramem-client's fail-silent profileSilent — same lazy-import
      // + safe() fail-open discipline as the recall reader above. Resolves to []
      // when disabled, agentless, unpaired, cold agent, or on any failure.
      safe(async () => {
        if (!profileEnabled(config) || !opts.agentType) return [] as ContextLine[];
        const { profileSilent } = await import("@astragenie/astramem-client");
        const timeoutMs: number =
          config?.memory?.profile?.timeoutMs ?? config?.memory?.recall?.timeoutMs ?? 5000;
        const profile = await profileSilent(opts.agentType, { capMs: timeoutMs });
        if (!profile) return [] as ContextLine[];
        const maxLessons: number = config?.memory?.profile?.topLessons ?? 10;
        // Record the injected atom ids so slice-close feedback can credit them
        // on a gate PASS. Fire-and-forget + fail-silent; only when a sliceId is
        // supplied (the dispatch call sites pass it; ad-hoc callers may not).
        if (opts.sliceId) {
          await writeInjectedAtoms(
            opts.repoPath,
            opts.sliceId,
            profileAtomIds(profile, maxLessons)
          );
        }
        return profileToLines(profile, maxLessons);
      }, [] as ContextLine[]),
      safe(async () => {
        // FEAT-238: resolve the shared client lazily. This only runs when memory
        // is enabled (the isMemoryEnabled early-return above guards it), and any
        // resolution failure (package absent from the plugin cache) is swallowed
        // by the enclosing safe() -> returns [] rather than throwing at load.
        const { recallSilent } = await import("@astragenie/astramem-client");
        const featId = opts.query || opts.agentType || "context";
        const sliceId = opts.agentType || "context";
        const timeoutMs: number = config?.memory?.recall?.timeoutMs ?? 5000;
        const response = await recallSilent(
          {
            query: buildAstramemQuery(featId, sliceId, tags),
            k,
            ...(opts.project !== undefined ? { project: opts.project } : {}),
            // Agent-scoped recall is OPT-IN (memory.recall.scopeByAgent). astramem
            // treats --agent as a HARD filter, so enabling it before enough
            // agent-tagged history exists would starve recall of untagged memories
            // (#309). Off by default → unscoped by role.
            ...(scopeByAgentEnabled(config) && opts.agentType ? { agent: opts.agentType } : {})
          },
          { capMs: timeoutMs }
        );
        return response?.hits ?? [];
      }, [] as RecallHit[])
    ]);

  const combined: ContextLine[] = [
    ...profileLines,
    ...safeLines(() => learningsToLines(learningsEntries, opts.query)),
    ...safeLines(() => lessonsToLines(lessonsResult.items)),
    ...safeLines(() => decisionsToLines(decisions)),
    ...safeLines(() => recallToLines(recallResults))
  ];

  return renderBlock(k, combined, tokenCap);
}
