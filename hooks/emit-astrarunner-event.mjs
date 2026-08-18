#!/usr/bin/env node
// AstraRunner dev-activity hook emitter (best-effort, non-blocking).
//
// Registered in hooks.json for SessionStart / SubagentStart / SubagentStop /
// TaskCreated / TaskCompleted. Ships a minimal telemetry envelope to the
// AstraRunner ingest endpoint so EVERY repo using this plugin emits
// dev-activity telemetry — not just a repo with a hand-rolled local hook.
// (Reference/prior art: astramemory-local's .claude/hooks/log_event.sh
// emit_astrarunner() — a one-off bash implementation this generalizes and
// replaces for plugin consumers.)
//
// Wire contract: POST {kind, emittedAt: <ISO-8601 string>, repoPath} with
// header `Authorization: Bearer <token>` to `${url}/api/v2/ingest/loop-events`.
// Confirmed live 202 with exactly this flat shape (2026-07-08). Deliberately
// NOT the richer nested-payload envelope astrarunner-ingest.mts sends for
// `slice.agent_completed` — a generic lifecycle tick carries no payload data
// worth nesting, and the flat shape is what's been validated end-to-end.
//
// URL/token resolution mirrors the Path-2 direct-POST precedence in
// src/scripts/lib/slice-linker/astrarunner-ingest.mts (explicit env/plugin
// option -> .claude/loop.json `loop.ingest` block -> ASTRARUNNER_ENV profile
// lookup -> no-op) but is reimplemented dependency-free here: hooks/*.mjs run
// via plain `node` with no build step and cannot import the bun-oriented
// src/scripts/lib/**/*.mts tree (see feature-flag-lite.mjs header for the
// same constraint). Keep the two precedence chains in sync if either changes.
//
// Fail-open + non-blocking, exactly like the bash reference: the parent
// (gate) process does only synchronous, zero-network work and always exits 0
// immediately. When a cheap signal suggests ingest MIGHT be configured, it
// spawns a detached one-shot child (this same file, re-invoked with the
// SEND_MODE_FLAG) that performs the async URL/token resolution and a
// short-timeout POST, then exits on its own — the parent never awaits it, so
// hook latency is unaffected by network conditions (offline dev laptop,
// slow/unreachable ingest host, etc. can never block or fail the session).

import { readFileSync } from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SEND_MODE_FLAG = "--send";
const POST_TIMEOUT_MS = 4000;
const INGEST_PATH = "/api/v2/ingest/loop-events";

function readHookPayload() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

/** Sync, single small-file read — cheap enough for the gate path. */
function readLoopJsonSync(repoPath) {
  try {
    return JSON.parse(readFileSync(path.join(repoPath, ".claude", "loop.json"), "utf8"));
  } catch {
    return null;
  }
}

/** True when loop.json carries anything that could resolve a bearer for the
 * async path (loop.ingest.url/appId, or webhook.appId as the DECISION-2
 * inheritance fallback) — mirrors resolveEffectiveAppId's inputs. */
function hasRepoIngestSignal(repoPath) {
  const parsed = readLoopJsonSync(repoPath);
  const ingest = parsed?.loop?.ingest;
  const webhookAppId = parsed?.loop?.notifications?.webhook?.appId;
  const ingestSignal =
    ingest && typeof ingest === "object" && !Array.isArray(ingest) && (ingest.url || ingest.appId);
  return Boolean(ingestSignal || webhookAppId);
}

// ---- async (send-mode) resolution — mirrors astrarunner-ingest.mts --------

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function profilesDir() {
  return path.join(os.homedir(), ".astrarunner");
}

async function resolveIngestUrl(repoPath) {
  const explicit = process.env.LOOP_INGEST_URL || process.env.CLAUDE_PLUGIN_OPTION_INGEST_URL;
  if (explicit) return explicit;

  const loopJson = await readJsonSafe(path.join(repoPath, ".claude", "loop.json"));
  const ingest = loopJson?.loop?.ingest;
  if (ingest?.url) return ingest.url;

  const env = ingest?.env || process.env.ASTRARUNNER_ENV || process.env.CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV;
  if (env) {
    const profiles = await readJsonSafe(path.join(profilesDir(), "profiles.json"));
    const entry = profiles?.envs?.[env];
    if (entry?.ingestUrl) return entry.ingestUrl;
  }
  return "";
}

async function resolveIngestToken(repoPath) {
  const explicit = process.env.LOOP_INGEST_TOKEN || process.env.CLAUDE_PLUGIN_OPTION_INGEST_TOKEN;
  if (explicit) return explicit;

  const loopJson = await readJsonSafe(path.join(repoPath, ".claude", "loop.json"));
  const ingest = loopJson?.loop?.ingest;
  const webhookAppId = loopJson?.loop?.notifications?.webhook?.appId;
  const appId = ingest?.appId || webhookAppId || undefined;
  if (!appId) return null;

  // FEAT-216 / DEC-064 parity: a committed ingest.url without ingest.env must
  // NOT inherit the shell-global ASTRARUNNER_ENV tier.
  let tokenEnv;
  if (ingest?.env) tokenEnv = ingest.env;
  else if (ingest?.url) tokenEnv = undefined;
  else tokenEnv = process.env.ASTRARUNNER_ENV || process.env.CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV;

  let tokensFileName = "tokens.json";
  if (tokenEnv) {
    const profiles = await readJsonSafe(path.join(profilesDir(), "profiles.json"));
    tokensFileName = profiles?.envs?.[tokenEnv]?.tokensFile || `tokens.${tokenEnv}.json`;
  }
  const store = await readJsonSafe(path.join(profilesDir(), tokensFileName));
  const entry = store?.tokens?.[appId];
  return (entry && typeof entry.bearer === "string" && entry.bearer.length > 0 && entry.bearer) || null;
}

async function postEvent(url, token, envelope) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  try {
    await fetch(`${url.replace(/\/$/, "")}${INGEST_PATH}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal
    });
  } catch {
    // Best-effort — swallow all errors: network, timeout, DNS, TLS, etc.
    // Observability must never surface as a session-visible failure.
  } finally {
    clearTimeout(timer);
  }
}

async function runSend(eventKind, repoPath) {
  try {
    const [url, token] = await Promise.all([resolveIngestUrl(repoPath), resolveIngestToken(repoPath)]);
    if (!url || !token) return;
    await postEvent(url, token, { kind: eventKind, emittedAt: new Date().toISOString(), repoPath });
  } catch {
    // fail-open
  }
}

// ---- entry ------------------------------------------------------------

function main() {
  const eventKind = process.argv[2] || "unknown";

  if (process.argv[3] === SEND_MODE_FLAG) {
    const repoPath = process.argv[4] || process.cwd();
    runSend(eventKind, repoPath).finally(() => process.exit(0));
    return;
  }

  // Gate path: cheap, synchronous, no network. Reads the hook's stdin
  // payload only for `cwd` (repoPath) — never blocks on anything async.
  const payload = readHookPayload();
  const repoPath = (payload && typeof payload.cwd === "string" && payload.cwd) || process.cwd();

  const hasExplicitEnvToken =
    Boolean(process.env.LOOP_INGEST_TOKEN) || Boolean(process.env.CLAUDE_PLUGIN_OPTION_INGEST_TOKEN);

  if (!hasExplicitEnvToken && !hasRepoIngestSignal(repoPath)) {
    // No plausible way to resolve a bearer — no-op, matching the bash
    // reference's `[ -f "$env_file" ] || return 0` early-out.
    process.exit(0);
  }

  try {
    const self = fileURLToPath(import.meta.url);
    const child = spawn(process.execPath, [self, eventKind, SEND_MODE_FLAG, repoPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  } catch {
    // fail-open — never block the hook on spawn failure
  }
  process.exit(0);
}

main();
