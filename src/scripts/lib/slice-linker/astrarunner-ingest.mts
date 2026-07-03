// Best-effort HTTP sink for posting slice.agent_completed envelopes to an
// AstraRunner ingest endpoint after the per-slice agent-report md has been
// written. Failures are swallowed — observability is non-critical and must
// never block slice completion.
//
// This is Path 2 (direct-POST). Since FEAT-215 it is repoPath-aware: when a
// repoPath is supplied it also reads .claude/loop.json's `loop.ingest` block
// for per-repo committed identity (appId -> live bearer via token-store.mts).
//
// URL resolution precedence (highest to lowest):
//   1. LOOP_INGEST_URL / CLAUDE_PLUGIN_OPTION_INGEST_URL — explicit, wins always
//   2. loop.json loop.ingest.url                          — per-repo committed (NEW)
//   3. ASTRARUNNER_ENV / plugin option -> profiles.json[env].ingestUrl
//   4. (none) — no-op when URL absent
//
// Token resolution precedence:
//   1. LOOP_INGEST_TOKEN / CLAUDE_PLUGIN_OPTION_INGEST_TOKEN — explicit, wins always
//   2. resolveBearer(effectiveAppId, effectiveEnv, profile.tokensFile) where
//      effectiveAppId is loop.ingest.appId, inheriting
//      loop.notifications.webhook.appId when absent (DECISION-2)
//   3. (none) — no-op when no token resolves
//
// IMPORTANT — intentional divergence from the webhook path (event-notifier.mts):
// the loop.ingest block outranks the ASTRARUNNER_ENV profile tier here, while
// the committed webhook.url is the FLOOR default there (profile wins). This is
// deliberate, not a bug — see DEC-062. Do not "fix" this asymmetry by editing
// tier order in either module without re-reading DEC-062 first.
//
// See ../plugin-options.mts for the explicit-tier env/plugin-option folding.

import fs from "node:fs/promises";
import path from "node:path";

import { readProfile } from "../env-profiles.mjs";
import {
  resolveAstrarunnerEnvOption,
  resolveIngestTokenOption,
  resolveIngestUrlOption
} from "../plugin-options.mjs";
import { resolveBearer } from "../token-store.mjs";

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
  /** New (FEAT-215). Optional so a caller without repo context still
   * degrades to the existing env-only behavior rather than throwing. Sole
   * production caller: agent-report-writer.mts::writeAgentReport. */
  repoPath?: string;
}

/**
 * .claude/loop.json -> loop.ingest. Per-repo committed identity for the
 * direct sink (Path 2). Bearer is NEVER stored here — always resolved live
 * via token-store.mts::resolveBearer(appId, env, tokensFile). Any `bearer`
 * or `token` literal present in the raw JSON is ignored (AC-8): this type
 * intentionally has no such field, and readIngestBlock() does not read one.
 */
export interface IngestBlock {
  /** Falls back to loop.notifications.webhook.appId when absent (DECISION-2). */
  appId?: string;
  /** Committed base URL. Overrides the ASTRARUNNER_ENV profile lookup but is
   * itself overridden by LOOP_INGEST_URL / CLAUDE_PLUGIN_OPTION_INGEST_URL.
   * Never inherited from webhook.url — different endpoint contract. */
  url?: string;
  /** Overrides ASTRARUNNER_ENV for THIS repo's ingest resolution only — both
   * the profile URL fallback and the token-store lookup use this value when
   * present (DECISION-1 refinement). */
  env?: string;
}

/**
 * Read .claude/loop.json and extract both loop.ingest and
 * loop.notifications.webhook.appId from a SINGLE fs.readFile + JSON.parse
 * (avoids a second file read for the DECISION-2 inheritance lookup).
 * Fail-silent: any error (missing file, malformed JSON, ingest not an
 * object) returns {} — mirrors event-notifier.mts::readNotifyConfig's
 * catch { return {} } shape exactly. Malformed `ingest` (e.g. a string)
 * yields `ingest: undefined`, not a thrown error.
 */
async function readIngestBlock(
  repoPath: string
): Promise<{ ingest?: IngestBlock; webhookAppId?: string }> {
  try {
    const configPath = path.join(repoPath, ".claude", "loop.json");
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    const rawIngest = parsed?.loop?.ingest;
    const ingest =
      rawIngest && typeof rawIngest === "object" && !Array.isArray(rawIngest)
        ? (rawIngest as IngestBlock)
        : undefined;
    const webhookAppId = parsed?.loop?.notifications?.webhook?.appId;
    const result: { ingest?: IngestBlock; webhookAppId?: string } = {};
    if (ingest) result.ingest = ingest;
    if (typeof webhookAppId === "string") result.webhookAppId = webhookAppId;
    return result;
  } catch {
    return {};
  }
}

/**
 * appId-inherit-with-override (DECISION-2). Private — only one call site
 * today (this module); do NOT extract to a shared module (rule of three).
 * Empty-string ingest.appId is falsy and correctly falls through to
 * webhookAppId (AC-5d: "appId present but empty" == "absent").
 */
function resolveEffectiveAppId(
  ingest: IngestBlock | undefined,
  webhookAppId: string | undefined
): string | undefined {
  return ingest?.appId || webhookAppId || undefined;
}

/**
 * Effective env for both the URL profile fallback and the token-store tier
 * (DECISION-1 refinement). ingest.env, when present, overrides
 * ASTRARUNNER_ENV for ingest resolution only.
 *
 * CAUTION (SLICE-140 review, Reviewer B MEDIUM): when a committed ingest block
 * supplies `url` but omits `env`, the bearer's effective env falls through to a
 * shell-global ASTRARUNNER_ENV. In a fleet where ASTRARUNNER_ENV is set org-wide
 * this can pair a wrong-tier bearer (e.g. staging token) with the committed
 * url's tier (e.g. prod). Always pair `ingest.url` with `ingest.env`. Tightening
 * the resolver so a committed url without env does NOT inherit the shell-global
 * tier is a precedence change tracked as a follow-up (see FEAT-215 close notes).
 */
function resolveEffectiveEnv(ingest: IngestBlock | undefined): string | undefined {
  return ingest?.env ?? resolveAstrarunnerEnvOption();
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
async function resolveIngestUrl(repoPath?: string): Promise<string> {
  // 1. Explicit URL: LOOP_INGEST_URL, then plugin-manager ingest_url. Wins
  // always — short-circuits before touching the ingest block, so AC-2/AC-3
  // ("block never drives URL") holds by construction.
  const explicit = resolveIngestUrlOption();
  if (explicit) return explicit;

  // 1.5. loop.json loop.ingest.url — per-repo committed default (NEW, FEAT-215).
  const block = repoPath ? await readIngestBlock(repoPath) : {};
  if (block.ingest?.url) return block.ingest.url;

  // 2. Effective env (ingest.env overrides ASTRARUNNER_ENV for this repo's
  // resolution only — DECISION-1 refinement) → profile lookup.
  const effectiveEnv = resolveEffectiveEnv(block.ingest);
  if (effectiveEnv) {
    try {
      const profile = await readProfile(effectiveEnv);
      if (profile?.ingestUrl) return profile.ingestUrl;
    } catch {
      // Fail-silent — no profile available.
    }
  }

  // 3. No URL available.
  return "";
}

/**
 * Resolve the ingest bearer token for Path 2. Tier 1 explicit env/plugin
 * option; tier 2 the loop.ingest-block-driven token-store lookup (appId
 * inherited from loop.notifications.webhook.appId when absent — DECISION-2).
 * Returns null when no token resolves. Fail-silent — never throws.
 */
async function resolveIngestToken(repoPath?: string): Promise<string | null> {
  // 1. Explicit token: LOOP_INGEST_TOKEN, then plugin-manager ingest_token.
  const explicit = resolveIngestTokenOption();
  if (explicit) return explicit;

  // 2. ingest-block-driven token-store lookup.
  const block = repoPath ? await readIngestBlock(repoPath) : {};
  const effectiveAppId = resolveEffectiveAppId(block.ingest, block.webhookAppId);
  if (effectiveAppId) {
    const effectiveEnv = resolveEffectiveEnv(block.ingest);
    let profileTokensFile: string | undefined;
    if (effectiveEnv) {
      try {
        const profile = await readProfile(effectiveEnv);
        profileTokensFile = profile?.tokensFile;
      } catch {
        // Fail-silent — profileTokensFile stays undefined; resolveBearer
        // falls back to its own default `tokens.<env>.json` naming.
      }
    }
    const token = await resolveBearer(effectiveAppId, effectiveEnv, profileTokensFile);
    if (token) return token;
  }

  // 3/4. Nothing resolved.
  return null;
}

export async function postAgentCompletions(
  opts: PostOpts
): Promise<{ posted: number; skipped: number; failed: number }> {
  const url = await resolveIngestUrl(opts.repoPath);
  const token = await resolveIngestToken(opts.repoPath);
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
