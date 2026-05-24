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
// Returns [] when the file is missing or startedAt is null (no time-floor).
async function readEventsInWindow(repoPath, startedAt) {
  const eventsPath = path.join(repoPath, ...EVENTS_JSONL);
  const startMs = startedAt ? new Date(startedAt).getTime() : -Infinity;
  let raw;
  try {
    raw = await fs.readFile(eventsPath, "utf8");
  } catch {
    return [];
  }
  const events = [];
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
  return events;
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
    agentType: stopPayload.agent_type || "unknown",
    sessionId: stopPayload.session_id || null,
    startTs: startEntry?.ts || null,
    stopTs,
    transcriptPath: normalizePayloadPath(stopPayload.agent_transcript_path || null),
    backgroundTasks: Array.isArray(stopPayload.background_tasks)
      ? stopPayload.background_tasks.length
      : 0,
    stopHookActive: Boolean(stopPayload.stop_hook_active)
  };
}

// Correlate start and stop payloads by agent_id. Stops without a matching
// start (agent began before the slice window) are included with startTs: null.
function pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps) {
  const startByAgentId = new Map();
  for (let i = 0; i < startPayloads.length; i++) {
    const p = startPayloads[i];
    if (p?.agent_id) startByAgentId.set(p.agent_id, { payload: p, ts: startTimestamps[i] });
  }
  const pairs = [];
  for (let i = 0; i < stopPayloads.length; i++) {
    const stopPayload = stopPayloads[i];
    if (!stopPayload?.agent_id) continue;
    pairs.push(
      buildAgentPair(stopPayload, stopTimestamps[i], startByAgentId.get(stopPayload.agent_id))
    );
  }
  return pairs;
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
  const groups = [];
  for (const id of ids) {
    if (visited.has(id)) continue;
    const group = [];
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
        adj.get(withTs[i].agentId).add(withTs[j].agentId);
        adj.get(withTs[j].agentId).add(withTs[i].agentId);
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
      const members = group.map((id) => agentMap.get(id)?.agentType ?? id.slice(0, 8));
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

function buildBody(agents, groups) {
  return [
    "",
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
  ].join("\n");
}

async function collectEventPayloads(events) {
  const startPayloads = [];
  const startTimestamps = [];
  const stopPayloads = [];
  const stopTimestamps = [];
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
  const target = path.join(agentsDir, `${slug}-agent-report.md`);

  const events = await readEventsInWindow(repoPath, startedAt);
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
    slice: sliceId,
    feature: featureId || null,
    phase: phase || null,
    created_at: new Date().toISOString(),
    session_id: sessionId,
    agent_count: agentCount,
    total_turns: totalTurns,
    total_duration_ms: totalDurationMs
  };

  await fs.writeFile(target, serializeFrontmatter(fm, buildBody(agents, groups)));
  return { reportPath: target, agentCount, totalTurns, totalDurationMs };
}
