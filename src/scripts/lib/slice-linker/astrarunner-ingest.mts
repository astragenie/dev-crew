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
//   2. resolveBearer(effectiveAppId, tokenEnv, profile.tokensFile) where
//      effectiveAppId is loop.ingest.appId, inheriting
//      loop.notifications.webhook.appId when absent (DECISION-2)
//   3. (none) — no-op when no token resolves
//
// tokenEnv (FEAT-216 / DEC-064) is NOT the same as the URL's effective env: the
// bearer tier inherits the shell-global ASTRARUNNER_ENV ONLY when the URL is not
// committed. A committed loop.ingest.url without loop.ingest.env pins the URL's
// tier, so its bearer must never be resolved from a shell-global ASTRARUNNER_ENV
// (that would pair a wrong-tier token with the committed url). See resolveTokenEnv.
//
// When LOOP_DEBUG is set (non-empty, not "0"/"false"), a skip emits one or more
// non-secret stderr lines naming the reason + appId — never a bearer/token
// value. A single postAgentCompletions call can log both a "no url" and a
// "no token"/"no appId" line when both resolutions fail.
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
   * present (DECISION-1 refinement). When absent, a committed `url` still pins
   * the URL's tier, so the token tier does NOT fall back to a shell-global
   * ASTRARUNNER_ENV (FEAT-216 / DEC-064) — pair `url` with `env` for a
   * tier-specific bearer. */
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
 * Effective env for the URL profile fallback (DECISION-1 refinement).
 * ingest.env, when present, overrides ASTRARUNNER_ENV; else the shell-global
 * ASTRARUNNER_ENV is used. Only reached when ingest.url is absent (a committed
 * url short-circuits before the profile tier), so the URL and its bearer are
 * tier-aligned by construction here. Do NOT reuse this for the token tier — see
 * resolveTokenEnv for the FEAT-216 divergence.
 */
function resolveEffectiveEnv(ingest: IngestBlock | undefined): string | undefined {
  return ingest?.env ?? resolveAstrarunnerEnvOption();
}

/**
 * Effective env for the bearer token tier (FEAT-216 / DEC-064). Differs from
 * resolveEffectiveEnv: a committed ingest.url pins the URL's tier, and the
 * resolver cannot verify tier alignment without an explicit ingest.env, so a
 * committed url WITHOUT env must NOT inherit the shell-global ASTRARUNNER_ENV —
 * otherwise a wrong-tier bearer (e.g. staging token) is paired with the
 * committed url (e.g. prod). The env-less default token store is still allowed
 * (tier-neutral); only the shell-global tier is refused.
 *
 *   1. ingest.env present            -> ingest.env (explicit tier wins)
 *   2. else ingest.url committed     -> undefined  (never inherit shell-global)
 *   3. else                          -> resolveAstrarunnerEnvOption() (URL also
 *                                       came from this profile tier — aligned)
 */
function resolveTokenEnv(ingest: IngestBlock | undefined): string | undefined {
  if (ingest?.env) return ingest.env;
  if (ingest?.url) return undefined;
  return resolveAstrarunnerEnvOption();
}

/**
 * LOOP_DEBUG gate for the non-secret skip signal (FEAT-216 Item 2). Enabled
 * when LOOP_DEBUG is set to a truthy-ish value; "", "0", "false" (any case)
 * count as disabled.
 */
function ingestDebugEnabled(): boolean {
  const v = process.env["LOOP_DEBUG"];
  return typeof v === "string" && v !== "" && v !== "0" && v.toLowerCase() !== "false";
}

/**
 * Emit a non-secret skip line to stderr when LOOP_DEBUG is enabled. The
 * `reason` MUST NOT contain a bearer/token value — callers pass an appId and a
 * static reason only. The reason is sanitized (control chars stripped, capped)
 * before interpolation so a config-sourced appId cannot forge extra log lines.
 */
function debugSkip(reason: string): void {
  if (!ingestDebugEnabled()) return;
  const safe = reason.replace(/[\p{Cc}\p{Cf}]/gu, " ").slice(0, 200);
  console.error(`[loop:ingest] skipped: ${safe}`);
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
  debugSkip("no url (explicit / loop.ingest.url / profile all empty)");
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
  if (!effectiveAppId) {
    debugSkip("no appId (loop.ingest.appId / webhook.appId both absent)");
    return null;
  }

  // Token tier env (FEAT-216 / DEC-064): a committed ingest.url without
  // ingest.env must NOT inherit the shell-global ASTRARUNNER_ENV tier.
  const tokenEnv = resolveTokenEnv(block.ingest);
  let profileTokensFile: string | undefined;
  if (tokenEnv) {
    try {
      const profile = await readProfile(tokenEnv);
      profileTokensFile = profile?.tokensFile;
    } catch {
      // Fail-silent — profileTokensFile stays undefined; resolveBearer
      // falls back to its own default `tokens.<env>.json` naming.
    }
  }
  const token = await resolveBearer(effectiveAppId, tokenEnv, profileTokensFile);
  if (token) return token;

  // 3/4. Nothing resolved for a well-formed appId.
  debugSkip(`no token for appId ${effectiveAppId}`);
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
