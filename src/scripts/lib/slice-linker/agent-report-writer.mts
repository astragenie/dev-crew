import fs from "node:fs/promises";
import path from "node:path";

import { buildArtifactSlug } from "../artifact-naming.mjs";
import { serializeFrontmatter } from "../frontmatter.mjs";
import { postAgentCompletions } from "./astrarunner-ingest.mjs";
import { deriveCostUsd } from "../cost-rate-table.mjs";
import { joinAuditToPairs } from "../audit-envelope-join.mjs";
import { readDispatchLog } from "../cost-by-skill.mjs";
import { resolveAuditLogPath } from "../auto-dispatch.mjs";
import { collectEnrichedAgentPairs } from "./transcript-token-usage.mjs";

function overlaps(a: Record<string, any>, b: Record<string, any>) {
  const aStart = new Date(a.startTs).getTime();
  const aStop = new Date(a.stopTs).getTime();
  const bStart = new Date(b.startTs).getTime();
  const bStop = new Date(b.stopTs).getTime();
  return aStart < bStop && bStart < aStop;
}

function connectedComponents(ids: string[], adj: Map<string, Set<string>>) {
  const visited = new Set();
  const groups: any[] = [];
  for (const id of ids) {
    if (visited.has(id)) continue;
    const group: any[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || visited.has(current)) continue;
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
function computeParallelGroups(agentPairs: Record<string, any>[]) {
  const withTs = agentPairs.filter(
    (p: Record<string, any>) => p.startTs !== null && p.stopTs !== null
  );
  if (withTs.length < 2) return [];
  const adj = new Map(withTs.map((p: Record<string, any>) => [p.agentId, new Set<string>()]));
  for (let i = 0; i < withTs.length; i++) {
    for (let j = i + 1; j < withTs.length; j++) {
      const pi = withTs[i]!;
      const pj = withTs[j]!;
      if (overlaps(pi, pj)) {
        adj.get(pi.agentId)!.add(pj.agentId);
        adj.get(pj.agentId)!.add(pi.agentId);
      }
    }
  }
  return connectedComponents([...adj.keys()], adj);
}

function formatDuration(ms: number) {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return "n/a";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min === 0 ? `${sec}s` : `${min}m ${sec}s`;
}

function topTools(toolMap: Map<string, number>, n = 3) {
  if (!toolMap || toolMap.size === 0) return "—";
  return [...toolMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => `${name}×${count}`)
    .join(", ");
}

function renderAgentRow(a: Record<string, any>) {
  const role = a.agentType || "unknown";
  const model = a.model || "n/a";
  const turns = a.turns ?? 0;
  const dur = formatDuration(a.duration_ms);
  const tools = topTools(a.tools);
  const skills = a.skills?.length > 0 ? a.skills.join(", ") : "—";
  return `| ${role} | ${model} | ${turns} | ${dur} | ${tools} | ${skills} |`;
}

function renderAgentTable(agents: Record<string, any>[]) {
  if (agents.length === 0) return "_No agents were dispatched during this slice._";
  const header = "| Role | Model | Turns | Duration | Top tools | Skills |";
  const sep = "|------|-------|-------|----------|-----------|--------|";
  return [header, sep, ...agents.map(renderAgentRow)].join("\n");
}

function renderParallelGroups(groups: string[][], agentPairs: Record<string, any>[]) {
  if (groups.length === 0) return "No parallel groups detected.";
  const agentMap = new Map(agentPairs.map((p: Record<string, any>) => [p.agentId, p]));
  return groups
    .map((group: string[], i: number) => {
      const members = group.map(
        (id: string) => (agentMap.get(id) as any)?.agentType ?? id.slice(0, 8)
      );
      return `**Group ${i + 1}** (${group.length} agents, concurrent): ${members.join(", ")}`;
    })
    .join("\n");
}

function aggregateTools(agents: Record<string, any>[]) {
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

function renderToolSummary(agents: Record<string, any>[]) {
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

export function renderIdentification(
  phase: string | null | undefined,
  featureId: string | null | undefined,
  sliceId: string | null | undefined
) {
  const parts: any[] = [];
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    parts.push(`**Phase:** ${phase}`);
  }
  if (featureId) parts.push(`**Feature:** ${featureId}`);
  if (sliceId) parts.push(`**Slice:** ${sliceId}`);
  return parts.length > 0 ? parts.join(" · ") : "";
}

function buildBody(
  agents: Record<string, any>[],
  groups: string[][],
  {
    phase,
    featureId,
    sliceId,
    eventsFound
  }: {
    phase?: string | null;
    featureId?: string | null;
    sliceId?: string | null;
    eventsFound?: boolean;
  } = {}
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

/**
 * Write a loop-owned agent-report artifact summarising which agents ran
 * during the slice, their turn counts, models, tool usage, and skill
 * invocations. Best-effort: I/O failures degrade to partial/zero data.
 *
 * @param {string} repoPath
 * @param {{ sliceId: string, featureId?: string|null, phase?: string|null, startedAt?: string|null }} opts
 * @returns {Promise<{ reportPath: string, agentCount: number, totalTurns: number, totalDurationMs: number }>}
 */
interface WriteAgentReportOpts {
  sliceId: string;
  featureId?: string | null;
  phase?: string | null;
  startedAt?: string | null;
}

// One report per slice: a rewrite for the same slug reuses the existing
// file (overwrite-in-place) instead of minting a second timestamped name,
// so repeated slice-complete runs cannot fork the artifact.
async function resolveReportPath(agentsDir: string, slug: string) {
  const suffix = `-agent-report-${slug}.md`;
  let existing: string | undefined;
  try {
    existing = (await fs.readdir(agentsDir)).find((f) => f.endsWith(suffix));
  } catch {
    existing = undefined;
  }
  if (existing) return path.join(agentsDir, existing);
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  return path.join(agentsDir, `${ts}${suffix}`);
}

export async function writeAgentReport(
  repoPath: string,
  { sliceId, featureId = null, phase = null, startedAt = null }: WriteAgentReportOpts
) {
  if (!sliceId) throw new Error("writeAgentReport requires sliceId");

  const agentsDir = path.join(repoPath, ".claude", "artifacts", "crew", "agents");
  await fs.mkdir(agentsDir, { recursive: true });

  const slug = buildArtifactSlug({ featureId, phase, sliceId });
  const target = await resolveReportPath(agentsDir, slug);

  const { pairs: enrichedWithTranscripts, fileFound } = await collectEnrichedAgentPairs(repoPath, {
    startedAt
  });

  // SLICE-137: join audit-log entries to pairs to thread real dispatchKind +
  // iterationIndex into the slice.agent_completed envelope. Best-effort: if
  // the audit log is missing or unreadable, readDispatchLog() returns [] and
  // pairs retain null/0 defaults. Failures are swallowed by readDispatchLog.
  const auditLogPath = resolveAuditLogPath(repoPath);
  const auditEntries = await readDispatchLog(auditLogPath);
  const agents = joinAuditToPairs(enrichedWithTranscripts, auditEntries, sliceId) as Record<
    string,
    any
  >[];
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

  // FEAT-228 / FEAT-230: best-effort emission of slice.agent_completed envelopes
  // to the AstraRunner ingest endpoint so the runner-side AgentRun table picks up
  // skills + tools + token data. Sink no-ops when LOOP_INGEST_URL/LOOP_INGEST_TOKEN
  // env vars are unset, so this is safe in environments without runner ingest.
  // Failures are swallowed internally — must never block slice completion.
  //
  // FEAT-203 (SLICE-136): load costRates override from loop.json for cost derivation.
  let loopCostRates: Record<string, import("../cost-rate-table.mjs").ModelRates> | undefined;
  try {
    const loopJsonPath = path.join(repoPath, ".claude", "loop.json");
    const loopJson = JSON.parse(await fs.readFile(loopJsonPath, "utf8")) as {
      loop?: { costRates?: Record<string, import("../cost-rate-table.mjs").ModelRates> };
    };
    loopCostRates = loopJson.loop?.costRates;
  } catch {
    // Not present or unreadable — proceed with hardcoded rates.
  }

  await postAgentCompletions({
    sliceId,
    featureId: featureId ?? null,
    repoPath,
    agents: agents.map((a): import("./astrarunner-ingest.mjs").AgentRow => {
      const cacheRead = (a.cacheReadInputTokens as number | undefined) ?? 0;
      const cacheCreation = (a.cacheCreationInputTokens as number | undefined) ?? 0;
      const inputT = (a.inputTokens as number | undefined) ?? 0;
      const outputT = (a.outputTokens as number | undefined) ?? 0;
      const rawModel = a.model as string | undefined;
      const model = rawModel && rawModel !== "n/a" ? rawModel : "";
      const costUsd = model
        ? deriveCostUsd(
            {
              model,
              inputTokens: inputT,
              outputTokens: outputT,
              cacheReadInputTokens: cacheRead,
              cacheCreationInputTokens: cacheCreation
            },
            loopCostRates
          )
        : null;
      const row: import("./astrarunner-ingest.mjs").AgentRow = {
        agentId: (a.agentId as string | undefined) ?? null,
        inputTokens: inputT,
        outputTokens: outputT,
        cacheReadInputTokens: cacheRead,
        cacheCreationInputTokens: cacheCreation,
        costUsd,
        firstOutputAt: (a.firstOutputAt as string | undefined) ?? null,
        startTs: (a.startTs as string | undefined) ?? null,
        stopTs: (a.stopTs as string | undefined) ?? null,
        // SLICE-137: threaded from joinAuditToPairs() above.
        dispatchKind:
          (a.dispatchKind as import("./astrarunner-ingest.mjs").AgentRow["dispatchKind"]) ?? null,
        iterationIndex: typeof a.iterationIndex === "number" ? a.iterationIndex : 0
      };
      if (a.agentType !== undefined) row.agentType = a.agentType as string;
      if (rawModel !== undefined) row.model = rawModel;
      if (a.turns !== undefined) row.turns = a.turns as number;
      if (a.duration_ms !== undefined) row.duration_ms = a.duration_ms as number;
      if (a.tools !== undefined) row.tools = a.tools as Map<string, number>;
      if (a.skills !== undefined) row.skills = a.skills as string[];
      return row;
    })
  });

  return { reportPath: target, agentCount, totalTurns, totalDurationMs };
}
