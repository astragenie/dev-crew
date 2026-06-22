// Best-effort HTTP sink for posting slice.agent_completed envelopes to an
// AstraRunner ingest endpoint after the per-slice agent-report md has been
// written. Failures are swallowed — observability is non-critical and must
// never block slice completion.
//
// Config (env, all optional; sink is a no-op when URL or token missing):
//   LOOP_INGEST_URL    — e.g. "http://localhost:5137"
//   LOOP_INGEST_TOKEN  — peppered AstraRunner app token (lrt_...)

interface AgentRow {
  agentType?: string;
  model?: string;
  turns?: number;
  duration_ms?: number;
  tools?: Map<string, number>;
  // FEAT-228 follow-up: skills tracked by agent-report-writer post-run from
  // tool_use blocks invoking the Skill tool. Set when transcript parsing finds
  // any Skill invocations; empty array when none. Empty array (not undefined)
  // signals "no skills used" semantically; undefined means "skills not tracked
  // for this row" (legacy callers).
  skills?: string[];
  inputTokens?: number;
  outputTokens?: number;
  firstOutputAt?: string | null;
  startTs?: string | null;
  stopTs?: string | null;
}

interface PostOpts {
  sliceId: string;
  featureId?: string | null;
  agents: AgentRow[];
}

function toolCallCount(tools: Map<string, number> | undefined): number {
  if (!tools) return 0;
  let total = 0;
  for (const c of tools.values()) total += c;
  return total;
}

function buildEnvelope(opts: PostOpts, row: AgentRow): Record<string, unknown> | null {
  const agent = row.agentType;
  if (!agent || !row.stopTs) return null;
  return {
    kind: "slice.agent_completed",
    emittedAt: row.stopTs,
    sourcePath: ".claude/artifacts/crew/agents/",
    schemaVersion: "v1",
    payload: {
      sliceId: opts.sliceId,
      featureId: opts.featureId ?? null,
      agent,
      ts: row.stopTs,
      dispatchedAt: row.startTs ?? row.stopTs,
      status: "ok",
      durationMs: row.duration_ms ?? null,
      toolCalls: toolCallCount(row.tools),
      firstOutputAt: row.firstOutputAt ?? null,
      model: row.model && row.model !== "n/a" ? row.model : null,
      turnCount: row.turns ?? null,
      inputTokens: row.inputTokens ?? null,
      outputTokens: row.outputTokens ?? null,
      // FEAT-228 / FEAT-230 — agent skills (Skill-tool invocations from transcript).
      // Runner-side AgentsBreakdown handler reads this for DistinctSkills field.
      // Always emit the array (even empty) so consumers can distinguish
      // "no skills used" from "skills not emitted by this version".
      skills: row.skills ?? []
    }
  };
}

async function postOne(
  url: string,
  token: string,
  envelope: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/v2/ingest/loop-events`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(envelope)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postAgentCompletions(
  opts: PostOpts
): Promise<{ posted: number; skipped: number; failed: number }> {
  const url = process.env.LOOP_INGEST_URL ?? "";
  const token = process.env.LOOP_INGEST_TOKEN ?? "";
  if (!url || !token) return { posted: 0, skipped: opts.agents.length, failed: 0 };

  let posted = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of opts.agents) {
    const envelope = buildEnvelope(opts, row);
    if (!envelope) {
      skipped++;
      continue;
    }
    const ok = await postOne(url, token, envelope);
    if (ok) posted++;
    else failed++;
  }
  return { posted, skipped, failed };
}
