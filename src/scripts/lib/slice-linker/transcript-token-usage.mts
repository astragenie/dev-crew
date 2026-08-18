// transcript-token-usage.mts — events-read + transcript-parse pipeline,
// extracted out of agent-report-writer.mts (FEAT-220 SLICE-A) so it can be
// reused by both the per-slice agent-report writer and the hierarchical
// dispatch cost aggregator (dispatch-cost-aggregate.mts).
//
// Given a repo path and an optional time window, this module reads
// `.claude/logs/events.jsonl` subagent_start/subagent_stop events, pairs
// them by agent_id (deduping hook double-fires that share a transcript
// path), then enriches each pair with token usage parsed from its agent
// transcript JSONL. Behavior-preserving extraction: every function below
// is unchanged from its prior home in agent-report-writer.mts.

import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import readline from "node:readline";

const EVENTS_JSONL = [".claude", "logs", "events.jsonl"];

// Translate POSIX-style /c/work/... paths written by git-bash on Windows
// into native Windows paths. Native absolute paths pass through unchanged.
export function normalizePayloadPath(payloadPath: string): string | null {
  if (!payloadPath) return null;
  if (/^[A-Za-z]:[/\\]/.test(payloadPath)) return payloadPath;
  const m = payloadPath.match(/^\/([a-z])(\/.*)?$/);
  if (m) return `${m[1]!.toUpperCase()}:${(m[2] ?? "").replace(/\//g, "\\")}`;
  return payloadPath;
}

// Read events.jsonl filtered to subagent events at or after startedAt (and,
// when provided, at or before endedAt). Returns { events, fileFound }. When
// startedAt is null, startMs is -Infinity so all events pass the lower
// bound; when endedAt is omitted/null, endMs is Infinity so there is no
// upper bound (preserves the original slice-report call shape).
export async function readEventsInWindow(
  repoPath: string,
  startedAt: string | null,
  endedAt: string | null = null
) {
  const eventsPath = path.join(repoPath, ...EVENTS_JSONL);
  const startMs = startedAt ? new Date(startedAt).getTime() : -Infinity;
  const endMs = endedAt ? new Date(endedAt).getTime() : Infinity;
  let raw;
  try {
    raw = await fs.readFile(eventsPath, "utf8");
  } catch {
    return { events: [], fileFound: false };
  }
  const events: any[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj.event !== "subagent_start" && obj.event !== "subagent_stop") continue;
    const ts = new Date(obj.timestamp).getTime();
    if (ts < startMs || ts > endMs) continue;
    events.push(obj);
  }
  return { events, fileFound: true };
}

export async function loadPayload(payloadPath: string) {
  if (!payloadPath) return null;
  const normalized = normalizePayloadPath(payloadPath);
  if (!normalized) return null;
  try {
    return JSON.parse(await fs.readFile(normalized, "utf8"));
  } catch {
    return null;
  }
}

function buildAgentPair(
  stopPayload: Record<string, any>,
  stopTs: string | null,
  startEntry: Record<string, any> | undefined
) {
  return {
    agentId: stopPayload.agent_id,
    agentType: stopPayload.agent_type || startEntry?.payload?.agent_type || "unknown",
    sessionId: stopPayload.session_id || startEntry?.payload?.session_id || null,
    startTs: startEntry?.ts || null,
    stopTs,
    transcriptPath: normalizePayloadPath(stopPayload.agent_transcript_path || null),
    backgroundTasks: Array.isArray(stopPayload.background_tasks)
      ? stopPayload.background_tasks.length
      : 0,
    stopHookActive: Boolean(stopPayload.stop_hook_active)
  };
}

function buildPairFromStart(startPayload: Record<string, any>, startTs: string | null) {
  return {
    agentId: startPayload.agent_id,
    agentType: startPayload.agent_type || "unknown",
    sessionId: startPayload.session_id || null,
    startTs,
    stopTs: null as string | null,
    transcriptPath: null as string | null,
    backgroundTasks: 0,
    stopHookActive: false
  };
}

// Collapse pairs that point at the SAME transcript file. Some hook
// configurations emit two SubagentStart/SubagentStop event sequences for
// one logical dispatch (each gets a distinct agent_id but the same
// transcript path). Without dedupe the report shows every such dispatch
// twice with identical stats. Strategy: group by transcriptPath, keep
// the pair with the most complete data (prefer one with both timestamps;
// else keep first; merge null timestamps from siblings into the keeper).
export function dedupePairsByTranscript(pairs: any[]): any[] {
  const byTranscript = new Map<string, any[]>();
  const noTranscript: any[] = [];
  for (const pair of pairs) {
    if (!pair.transcriptPath) {
      noTranscript.push(pair);
      continue;
    }
    const bucket = byTranscript.get(pair.transcriptPath) ?? [];
    bucket.push(pair);
    byTranscript.set(pair.transcriptPath, bucket);
  }
  const deduped: any[] = [];
  for (const bucket of byTranscript.values()) {
    if (bucket.length === 1) {
      deduped.push(bucket[0]);
      continue;
    }
    const complete = bucket.find((p) => p.startTs && p.stopTs);
    const keeper = complete ?? bucket[0];
    if (!keeper.startTs) keeper.startTs = bucket.find((p) => p.startTs)?.startTs ?? null;
    if (!keeper.stopTs) keeper.stopTs = bucket.find((p) => p.stopTs)?.stopTs ?? null;
    deduped.push(keeper);
  }
  return [...deduped, ...noTranscript];
}

// Correlate start and stop payloads by agent_id over the union of both
// event streams. Stops without a matching start are included with
// startTs: null (agent began before the slice window). Starts without a
// matching stop are included with stopTs: null — the SubagentStop hook
// fires when the orchestrator returns control to the user, which can
// land after slice-complete runs, so this is the common case for the
// last-dispatched agent of a slice rather than an error.
//
// After pairing by agent_id, pairs are deduped by transcriptPath so that
// duplicate hook fires (which produce distinct agent_ids referencing the
// same dispatch) collapse to one row in the report.
export function pairAgentEvents(
  startPayloads: Record<string, any>[],
  stopPayloads: Record<string, any>[],
  startTimestamps: string[],
  stopTimestamps: string[]
) {
  const startByAgentId = new Map();
  for (let i = 0; i < startPayloads.length; i++) {
    const p = startPayloads[i];
    if (p?.agent_id) startByAgentId.set(p.agent_id, { payload: p, ts: startTimestamps[i] });
  }
  const stopByAgentId = new Map();
  for (let i = 0; i < stopPayloads.length; i++) {
    const p = stopPayloads[i];
    if (p?.agent_id) stopByAgentId.set(p.agent_id, { payload: p, ts: stopTimestamps[i] });
  }

  const allIds = new Set<string>([...startByAgentId.keys(), ...stopByAgentId.keys()]);
  const pairs: any[] = [];
  for (const id of allIds) {
    const stopEntry = stopByAgentId.get(id);
    const startEntry = startByAgentId.get(id);
    if (stopEntry) {
      pairs.push(buildAgentPair(stopEntry.payload, stopEntry.ts, startEntry));
    } else {
      pairs.push(buildPairFromStart(startEntry.payload, startEntry.ts));
    }
  }
  return dedupePairsByTranscript(pairs);
}

function accumulateToolUse(
  block: Record<string, any>,
  tools: Map<string, number>,
  skills: Set<string>
) {
  const toolName = block.name;
  if (!toolName) return;
  tools.set(toolName, (tools.get(toolName) || 0) + 1);
  if (toolName === "Skill" && block.input?.skill) skills.add(block.input.skill);
}

function accumulateTranscriptLine(state: Record<string, any>, obj: Record<string, any>) {
  if (obj.type !== "assistant") return;
  state.turns++;
  if (state.model === "n/a" && obj.message?.model) state.model = obj.message.model;
  // Accumulate token usage fields from assistant message usage block.
  // Treat absent fields as 0 per AC-1.
  const usage = obj.message?.usage;
  if (usage) {
    state.inputTokens += (usage.input_tokens as number | undefined) ?? 0;
    state.outputTokens += (usage.output_tokens as number | undefined) ?? 0;
    state.cacheReadInputTokens += (usage.cache_read_input_tokens as number | undefined) ?? 0;
    state.cacheCreationInputTokens +=
      (usage.cache_creation_input_tokens as number | undefined) ?? 0;
  }
  const content = obj.message?.content;
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (block.type === "tool_use") accumulateToolUse(block, state.tools, state.skills);
  }
}

// Stream the agent transcript JSONL line-by-line to avoid buffering large files.
// Returns zeroed stats on any I/O or parse failure (best-effort).
export async function parseTranscript(transcriptPath: string) {
  const empty = {
    turns: 0,
    model: "n/a",
    tools: new Map<string, number>(),
    skills: [] as string[],
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0
  };
  if (!transcriptPath) return { ...empty, error: "no transcript path" };
  try {
    await fs.access(transcriptPath);
  } catch {
    return { ...empty, error: "transcript not found" };
  }
  const state = {
    turns: 0,
    model: "n/a",
    tools: new Map(),
    skills: new Set(),
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0
  };
  try {
    const rl = readline.createInterface({
      input: createReadStream(transcriptPath),
      crlfDelay: Infinity
    });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      accumulateTranscriptLine(state, obj);
    }
  } catch (err: unknown) {
    return { ...empty, error: (err as Error).message };
  }
  return {
    turns: state.turns,
    model: state.model,
    tools: state.tools,
    skills: [...state.skills],
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    cacheReadInputTokens: state.cacheReadInputTokens,
    cacheCreationInputTokens: state.cacheCreationInputTokens
  };
}

export async function collectEventPayloads(events: Record<string, any>[]) {
  const startPayloads: any[] = [];
  const startTimestamps: any[] = [];
  const stopPayloads: any[] = [];
  const stopTimestamps: any[] = [];
  for (const event of events) {
    const payload = await loadPayload(event.payloadPath);
    if (event.event === "subagent_start") {
      startPayloads.push(payload);
      startTimestamps.push(event.timestamp);
    } else {
      stopPayloads.push(payload);
      stopTimestamps.push(event.timestamp);
    }
  }
  return { startPayloads, startTimestamps, stopPayloads, stopTimestamps };
}

export async function enrichPairsWithTranscripts(pairs: Record<string, any>[]) {
  return Promise.all(
    pairs.map(async (pair: Record<string, any>) => {
      const transcript = await parseTranscript(pair.transcriptPath);
      const startMs = pair.startTs ? new Date(pair.startTs).getTime() : null;
      const stopMs = pair.stopTs ? new Date(pair.stopTs).getTime() : null;
      const duration_ms = startMs !== null && stopMs !== null ? stopMs - startMs : null;
      return { ...pair, ...transcript, duration_ms };
    })
  );
}

export interface CollectWindowOptions {
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface CollectedAgentPairs {
  pairs: Record<string, any>[];
  fileFound: boolean;
}

// Convenience pipeline: events-read → pair → transcript-enrich, scoped to an
// optional [startedAt, endedAt] window. Used by writeAgentReport (per-slice,
// startedAt only) and dispatchCostAggregate (per dispatch-run window, both
// bounds) so neither caller re-implements the read/pair/parse sequence.
export async function collectEnrichedAgentPairs(
  repoPath: string,
  opts: CollectWindowOptions = {}
): Promise<CollectedAgentPairs> {
  const { events, fileFound } = await readEventsInWindow(
    repoPath,
    opts.startedAt ?? null,
    opts.endedAt ?? null
  );
  const { startPayloads, startTimestamps, stopPayloads, stopTimestamps } =
    await collectEventPayloads(events);
  const pairs = pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps);
  const enriched = await enrichPairsWithTranscripts(pairs);
  return { pairs: enriched, fileFound };
}
