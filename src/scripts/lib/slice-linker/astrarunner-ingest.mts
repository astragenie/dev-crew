// Best-effort HTTP sink for posting slice.agent_completed envelopes to an
// AstraRunner ingest endpoint after the per-slice agent-report md has been
// written. Failures are swallowed — observability is non-critical and must
// never block slice completion.
//
// This is Path 2 (legacy direct-POST). It has no repoPath context, so it
// cannot use the Pattern-B webhook config from loop.json. It resolves config
// from env vars only.
//
// URL resolution precedence (highest to lowest):
//   1. LOOP_INGEST_URL  — explicit env override (legacy escape hatch, wins always)
//   2. ASTRARUNNER_ENV  — reads ~/.astrarunner/profiles.json[env].ingestUrl
//   3. (none)           — no repoPath available; sink is a no-op when URL absent
//
// Token resolution:
//   LOOP_INGEST_TOKEN only (Path 2 callers have no appId for Pattern-B lookup).
//   When LOOP_INGEST_TOKEN absent the sink is a no-op.
//
// Set ASTRARUNNER_ENV=local|staging|prod to route ingest to the correct tier
// without changing LOOP_INGEST_URL or committing anything to the repo.

import { readProfile } from "../env-profiles.mjs";

export interface AgentRow {
  agentType?: string;
  agentId?: string | null;
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
  cacheReadInputTokens?: number | null;
  cacheCreationInputTokens?: number | null;
  costUsd?: number | null;
  dispatchKind?: "auto" | "manual" | "wave" | "hierarchical" | null;
  iterationIndex?: number;
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
    schemaVersion: "v1.1",
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
      skills: row.skills ?? [],
      // FEAT-203 — enrichment fields (SLICE-136). All additive-optional.
      agentId: row.agentId ?? null,
      costUsd: row.costUsd ?? null,
      cacheReadInputTokens: row.cacheReadInputTokens ?? null,
      cacheCreationInputTokens: row.cacheCreationInputTokens ?? null,
      dispatchKind: row.dispatchKind ?? null,
      iterationIndex: row.iterationIndex ?? 0
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

/**
 * Resolve the ingest URL for Path 2 using the env precedence chain.
 * Returns empty string when no URL is available (caller treats as no-op).
 * Fail-silent — never throws.
 */
async function resolveIngestUrl(): Promise<string> {
  // 1. Explicit env override wins always.
  const explicit = process.env["LOOP_INGEST_URL"];
  if (explicit) return explicit;

  // 2. ASTRARUNNER_ENV → profile lookup.
  const activeEnv = process.env["ASTRARUNNER_ENV"];
  if (activeEnv) {
    try {
      const profile = await readProfile(activeEnv);
      if (profile?.ingestUrl) return profile.ingestUrl;
    } catch {
      // Fail-silent — no profile available.
    }
  }

  // 3. No URL available in Path 2 (no repoPath context).
  return "";
}

export async function postAgentCompletions(
  opts: PostOpts
): Promise<{ posted: number; skipped: number; failed: number }> {
  const url = await resolveIngestUrl();
  const token = process.env["LOOP_INGEST_TOKEN"] ?? "";
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
