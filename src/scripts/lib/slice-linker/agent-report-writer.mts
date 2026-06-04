import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import readline from "node:readline";

import { buildArtifactSlug } from "../artifact-naming.mjs";
import { serializeFrontmatter } from "../frontmatter.mjs";

const EVENTS_JSONL = [".claude", "logs", "events.jsonl"];

// Translate POSIX-style /c/work/... paths written by git-bash on Windows
// into native Windows paths. Native absolute paths pass through unchanged.
function normalizePayloadPath(payloadPath) {
  if (!payloadPath) return null;
  if (/^[A-Za-z]:[/\\]/.test(payloadPath)) return payloadPath;
  const m = payloadPath.match(/^\/([a-z])(\/.*)?$/);
  if (m) return `${m[1].toUpperCase()}:${(m[2] || "").replace(/\//g, "\\")}`;
  return payloadPath;
}

// Read events.jsonl filtered to subagent events at or after startedAt.
// Returns { events, fileFound }. When startedAt is null, startMs is
// -Infinity so all events pass the time filter (no floor).
async function readEventsInWindow(repoPath, startedAt) {
  const eventsPath = path.join(repoPath, ...EVENTS_JSONL);
  const startMs = startedAt ? new Date(startedAt).getTime() : -Infinity;
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
    if (new Date(obj.timestamp).getTime() < startMs) continue;
    events.push(obj);
  }
  return { events, fileFound: true };
}

async function loadPayload(payloadPath) {
  if (!payloadPath) return null;
  const normalized = normalizePayloadPath(payloadPath);
  try {
    return JSON.parse(await fs.readFile(normalized, "utf8"));
  } catch {
    return null;
  }
}

function buildAgentPair(stopPayload, stopTs, startEntry) {
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

function buildPairFromStart(startPayload, startTs) {
  return {
    agentId: startPayload.agent_id,
    agentType: startPayload.agent_type || "unknown",
    sessionId: startPayload.session_id || null,
    startTs,
    stopTs: null,
    transcriptPath: null,
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
function dedupePairsByTranscript(pairs: any[]): any[] {
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
function pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps) {
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

function accumulateToolUse(block, tools, skills) {
  const toolName = block.name;
  if (!toolName) return;
  tools.set(toolName, (tools.get(toolName) || 0) + 1);
  if (toolName === "Skill" && block.input?.skill) skills.add(block.input.skill);
}

function accumulateTranscriptLine(state, obj) {
  if (obj.type !== "assistant") return;
  state.turns++;
  if (state.model === "n/a" && obj.message?.model) state.model = obj.message.model;
  const content = obj.message?.content;
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (block.type === "tool_use") accumulateToolUse(block, state.tools, state.skills);
  }
}

// Stream the agent transcript JSONL line-by-line to avoid buffering large files.
// Returns zeroed stats on any I/O or parse failure (best-effort).
async function parseTranscript(transcriptPath) {
  const empty = { turns: 0, model: "n/a", tools: new Map(), skills: [] };
  if (!transcriptPath) return { ...empty, error: "no transcript path" };
  try {
    await fs.access(transcriptPath);
  } catch {
    return { ...empty, error: "transcript not found" };
  }
  const state = { turns: 0, model: "n/a", tools: new Map(), skills: new Set() };
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
  } catch (err) {
    return { ...empty, error: err.message };
  }
  return { turns: state.turns, model: state.model, tools: state.tools, skills: [...state.skills] };
}

function overlaps(a, b) {
  const aStart = new Date(a.startTs).getTime();
  const aStop = new Date(a.stopTs).getTime();
  const bStart = new Date(b.startTs).getTime();
  const bStop = new Date(b.stopTs).getTime();
  return aStart < bStop && bStart < aStop;
}

function connectedComponents(ids, adj) {
  const visited = new Set();
  const groups: any[] = [];
  for (const id of ids) {
    if (visited.has(id)) continue;
    const group: any[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      group.push(current);
      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

// O(n²) sweep — n is typically < 20 agents per slice.
function computeParallelGroups(agentPairs) {
  const withTs = agentPairs.filter((p) => p.startTs !== null && p.stopTs !== null);
  if (withTs.length < 2) return [];
  const adj = new Map(withTs.map((p) => [p.agentId, new Set()]));
  for (let i = 0; i < withTs.length; i++) {
    for (let j = i + 1; j < withTs.length; j++) {
      if (overlaps(withTs[i], withTs[j])) {
        (adj.get(withTs[i].agentId) as any).add(withTs[j].agentId);
        (adj.get(withTs[j].agentId) as any).add(withTs[i].agentId);
      }
    }
  }
  return connectedComponents([...adj.keys()], adj);
}

function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return "n/a";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min === 0 ? `${sec}s` : `${min}m ${sec}s`;
}

function topTools(toolMap, n = 3) {
  if (!toolMap || toolMap.size === 0) return "—";
  return [...toolMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => `${name}×${count}`)
    .join(", ");
}

function renderAgentRow(a) {
  const role = a.agentType || "unknown";
  const model = a.model || "n/a";
  const turns = a.turns ?? 0;
  const dur = formatDuration(a.duration_ms);
  const tools = topTools(a.tools);
  const skills = a.skills?.length > 0 ? a.skills.join(", ") : "—";
  return `| ${role} | ${model} | ${turns} | ${dur} | ${tools} | ${skills} |`;
}

function renderAgentTable(agents) {
  if (agents.length === 0) return "_No agents were dispatched during this slice._";
  const header = "| Role | Model | Turns | Duration | Top tools | Skills |";
  const sep = "|------|-------|-------|----------|-----------|--------|";
  return [header, sep, ...agents.map(renderAgentRow)].join("\n");
}

function renderParallelGroups(groups, agentPairs) {
  if (groups.length === 0) return "No parallel groups detected.";
  const agentMap = new Map(agentPairs.map((p) => [p.agentId, p]));
  return groups
    .map((group, i) => {
      const members = group.map((id) => (agentMap.get(id) as any)?.agentType ?? id.slice(0, 8));
      return `**Group ${i + 1}** (${group.length} agents, concurrent): ${members.join(", ")}`;
    })
    .join("\n");
}

function aggregateTools(agents) {
  const totals = new Map();
  const attribution = new Map();
  for (const a of agents) {
    if (!a.tools) continue;
    for (const [toolName, count] of a.tools) {
      totals.set(toolName, (totals.get(toolName) || 0) + count);
      if (!attribution.has(toolName)) attribution.set(toolName, []);
      attribution.get(toolName).push(`${a.agentType}×${count}`);
    }
  }
  return { totals, attribution };
}

function renderToolSummary(agents) {
  const { totals, attribution } = aggregateTools(agents);
  if (totals.size === 0) return "_No tool usage recorded._";
  const header = "| Tool | Total calls | Top agents |";
  const sep = "|------|-------------|-----------|";
  const rows = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([toolName, total]) => {
      const attr = (attribution.get(toolName) || []).join(", ");
      return `| ${toolName} | ${total} | ${attr} |`;
    });
  return [header, sep, ...rows].join("\n");
}

export function renderIdentification(phase, featureId, sliceId) {
  const parts: any[] = [];
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    parts.push(`**Phase:** ${phase}`);
  }
  if (featureId) parts.push(`**Feature:** ${featureId}`);
  if (sliceId) parts.push(`**Slice:** ${sliceId}`);
  return parts.length > 0 ? parts.join(" · ") : "";
}

function buildBody(
  agents,
  groups,
  { phase, featureId, sliceId, eventsFound }: Record<string, unknown> = {}
) {
  const sections = [""];
  const id = renderIdentification(phase, featureId, sliceId);
  if (id) sections.push(id, "");
  if (!eventsFound) {
    sections.push(
      "> **Note:** No subagent events found in `.claude/logs/events.jsonl`. Ensure crew hooks (SubagentStart/SubagentStop) are installed via `crew init`.",
      ""
    );
  }
  const stoplessCount = (agents as any[]).filter((a) => a.stopTs === null).length;
  if (stoplessCount > 0) {
    sections.push(
      `> **Note:** ${stoplessCount} agent(s) have no \`subagent_stop\` event recorded. SubagentStop fires when the orchestrator returns to the user, which can land after slice-complete; duration and tool usage for these entries are partial.`,
      ""
    );
  }
  sections.push(
    "## Agents",
    "",
    renderAgentTable(agents),
    "",
    "## Parallel groups",
    "",
    renderParallelGroups(groups, agents),
    "",
    "## Tool summary",
    "",
    renderToolSummary(agents),
    ""
  );
  return sections.join("\n");
}

async function collectEventPayloads(events) {
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

async function enrichPairsWithTranscripts(pairs) {
  return Promise.all(
    pairs.map(async (pair) => {
      const transcript = await parseTranscript(pair.transcriptPath);
      const startMs = pair.startTs ? new Date(pair.startTs).getTime() : null;
      const stopMs = pair.stopTs ? new Date(pair.stopTs).getTime() : null;
      const duration_ms = startMs !== null && stopMs !== null ? stopMs - startMs : null;
      return { ...pair, ...transcript, duration_ms };
    })
  );
}

/**
 * Write a loop-owned agent-report artifact summarising which agents ran
 * during the slice, their turn counts, models, tool usage, and skill
 * invocations. Best-effort: I/O failures degrade to partial/zero data.
 *
 * @param {string} repoPath
 * @param {{ sliceId: string, featureId?: string|null, phase?: string|null, startedAt?: string|null }} opts
 * @returns {Promise<{ reportPath: string, agentCount: number, totalTurns: number, totalDurationMs: number }>}
 */
export async function writeAgentReport(
  repoPath,
  { sliceId, featureId = null, phase = null, startedAt = null }
) {
  if (!sliceId) throw new Error("writeAgentReport requires sliceId");

  const agentsDir = path.join(repoPath, ".claude", "artifacts", "crew", "agents");
  await fs.mkdir(agentsDir, { recursive: true });

  const slug = buildArtifactSlug({ featureId, phase, sliceId });
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const target = path.join(agentsDir, `${ts}-agent-report-${slug}.md`);

  const { events, fileFound } = await readEventsInWindow(repoPath, startedAt);
  const { startPayloads, startTimestamps, stopPayloads, stopTimestamps } =
    await collectEventPayloads(events);

  const pairs = pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps);
  const agents = await enrichPairsWithTranscripts(pairs);
  const groups = computeParallelGroups(agents);

  const agentCount = agents.length;
  const totalTurns = agents.reduce((sum, a) => sum + (a.turns || 0), 0);
  const totalDurationMs = agents.reduce((sum, a) => sum + (a.duration_ms || 0), 0);
  const sessionId = agents.find((a) => a.sessionId)?.sessionId ?? null;

  const fm = {
    kind: "agent-report",
    phase: phase || null,
    feature: featureId || null,
    slice: sliceId,
    created_at: new Date().toISOString(),
    session_id: sessionId,
    agent_count: agentCount,
    total_turns: totalTurns,
    total_duration_ms: totalDurationMs
  };

  await fs.writeFile(
    target,
    serializeFrontmatter(
      fm,
      buildBody(agents, groups, {
        phase,
        featureId,
        sliceId,
        eventsFound: fileFound
      })
    )
  );
  return { reportPath: target, agentCount, totalTurns, totalDurationMs };
}
