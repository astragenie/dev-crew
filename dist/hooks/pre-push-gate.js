#!/usr/bin/env bun
// @bun
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// ../../../node_modules/@astragenie/astramem-client/dist/resolve.js
import { spawn } from "child_process";
import * as fs10 from "fs/promises";
import * as path10 from "path";
import { pathToFileURL } from "url";
function _setWireProvider(p) {
  if (!isTestEnv())
    return;
  _injected = p;
}
function _resetResolveCache() {
  if (!isTestEnv())
    return;
  _cache = null;
  _injected = undefined;
}
function isTestEnv() {
  return Boolean(process.env.BUN_TEST) || Boolean(process.env.VITEST);
}
function isProvider(value) {
  return typeof value === "object" && value !== null && typeof value.remember === "function";
}
async function resolveViaSelectorDep() {
  try {
    const mod = await import(__rewriteRelativeImportExtension(SELECTOR_SPECIFIER));
    if (typeof mod.resolveProvider !== "function")
      return null;
    const { provider } = await mod.resolveProvider();
    return isProvider(provider) ? provider : null;
  } catch {
    return null;
  }
}
async function healthOk(provider) {
  try {
    const res = await provider.health();
    return res?.ok === true;
  } catch {
    return false;
  }
}
async function resolveViaProviderDep() {
  try {
    const localMod = await import(__rewriteRelativeImportExtension(PROVIDERS_LOCAL_SPECIFIER));
    const local = localMod.createLocalProvider();
    if (isProvider(local) && await healthOk(local))
      return local;
  } catch {}
  try {
    const saasMod = await import(__rewriteRelativeImportExtension(PROVIDERS_SAAS_SPECIFIER));
    const saas = saasMod.createSaasProvider();
    if (isProvider(saas) && await healthOk(saas))
      return saas;
  } catch {}
  return null;
}
async function probeCliPath() {
  if (process.env.ASTRAMEM_DISABLE_PATH_PROBE)
    return null;
  const whichCmd = process.platform === "win32" ? "where" : "which";
  return new Promise((resolve2) => {
    try {
      const proc = spawn(whichCmd, ["astramem"], { stdio: ["ignore", "pipe", "ignore"] });
      let out = "";
      proc.stdout?.on("data", (chunk) => {
        out += chunk.toString();
      });
      proc.on("close", (code) => {
        const line = out.split(/\r?\n/)[0]?.trim() ?? "";
        resolve2(code === 0 && line.length > 0 ? line : null);
      });
      proc.on("error", () => resolve2(null));
    } catch {
      resolve2(null);
    }
  });
}
async function candidateRoots() {
  const roots = [];
  const envRoot = process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
  if (envRoot)
    roots.push(envRoot);
  const cliPath = await probeCliPath();
  if (cliPath)
    roots.push(path10.dirname(path10.dirname(cliPath)));
  return roots;
}
async function resolveFromRoot(root) {
  const selectorPath = path10.join(root, "src", "lib", "selector.ts");
  try {
    await fs10.access(selectorPath);
    const mod = await import(__rewriteRelativeImportExtension(pathToFileURL(selectorPath).href));
    if (typeof mod.resolveProvider === "function") {
      const { provider } = await mod.resolveProvider();
      if (isProvider(provider))
        return provider;
    }
  } catch {}
  try {
    const localPath = path10.join(root, "src", "providers", "local.ts");
    const mod = await import(__rewriteRelativeImportExtension(pathToFileURL(localPath).href));
    const local = mod.createLocalProvider();
    if (isProvider(local) && await healthOk(local))
      return local;
  } catch {}
  return null;
}
async function resolveUncached() {
  const viaSelector = await resolveViaSelectorDep();
  if (viaSelector)
    return viaSelector;
  const viaProviders = await resolveViaProviderDep();
  if (viaProviders)
    return viaProviders;
  for (const root of await candidateRoots()) {
    const viaRoot = await resolveFromRoot(root);
    if (viaRoot)
      return viaRoot;
  }
  return null;
}
async function resolveWireProvider() {
  if (_injected !== undefined)
    return _injected;
  if (_cache !== null)
    return _cache === false ? null : _cache;
  const provider = await resolveUncached();
  _cache = provider ?? false;
  return provider;
}
var __rewriteRelativeImportExtension = function(path11, preserveJsx) {
  if (typeof path11 === "string" && /^\.\.?\//.test(path11)) {
    return path11.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
      return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
    });
  }
  return path11;
}, PLUGIN_PKG = "@astragenie/astramem-plugin", SELECTOR_SPECIFIER, PROVIDERS_LOCAL_SPECIFIER, PROVIDERS_SAAS_SPECIFIER, _cache = null, _injected;
var init_resolve = __esm(() => {
  SELECTOR_SPECIFIER = [PLUGIN_PKG, "selector"].join("/");
  PROVIDERS_LOCAL_SPECIFIER = [PLUGIN_PKG, "providers/local"].join("/");
  PROVIDERS_SAAS_SPECIFIER = [PLUGIN_PKG, "providers/saas"].join("/");
});

// ../../../node_modules/@astragenie/astramem-client/dist/calls.js
async function withCap(p, fallback, capMs) {
  let timer;
  const capped = new Promise((resolve2) => {
    timer = setTimeout(() => resolve2(fallback), capMs);
  });
  try {
    return await Promise.race([p.catch(() => fallback), capped]);
  } finally {
    clearTimeout(timer);
  }
}
async function rememberSilent(payload, opts = {}) {
  const capMs = opts.capMs ?? DEFAULT_CAP_MS;
  const deadline = Date.now() + capMs;
  try {
    const provider = await withCap(resolveWireProvider(), null, capMs);
    if (!provider)
      return false;
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      return false;
    return await withCap(provider.remember(payload).then(() => true), false, remaining);
  } catch {
    return false;
  }
}
async function recallSilent(req, opts = {}) {
  const capMs = opts.capMs ?? DEFAULT_CAP_MS;
  const deadline = Date.now() + capMs;
  try {
    const provider = await withCap(resolveWireProvider(), null, capMs);
    if (!provider)
      return null;
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      return null;
    return await withCap(provider.recall(req).then((res) => res ?? null), null, remaining);
  } catch {
    return null;
  }
}
var DEFAULT_CAP_MS = 2000;
var init_calls = __esm(() => {
  init_resolve();
});

// ../../../node_modules/@astragenie/astramem-client/dist/daemon-error.js
var DaemonError;
var init_daemon_error = __esm(() => {
  DaemonError = class DaemonError extends Error {
    band;
    status;
    body;
    constructor(message, opts) {
      super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
      this.name = "DaemonError";
      this.band = opts.band;
      this.status = opts.status;
      this.body = opts.body;
    }
    get isDeterministic() {
      return this.band === "deterministic";
    }
    get isTransient() {
      return this.band === "transient";
    }
  };
});

// ../../../node_modules/@astragenie/astramem-client/dist/daemon-client.js
function joinList(value) {
  if (value === undefined)
    return;
  return Array.isArray(value) ? value.join(",") : value;
}

class AstramemDaemonClient {
  baseUrl;
  bearer;
  timeoutMs;
  retryIngestOnTransient;
  constructor(opts) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.bearer = opts.bearer;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryIngestOnTransient = opts.retryIngestOnTransient ?? false;
  }
  headers(idempotencyKey) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    if (this.bearer)
      headers.Authorization = `Bearer ${this.bearer}`;
    if (idempotencyKey)
      headers["Idempotency-Key"] = idempotencyKey;
    return headers;
  }
  async fetch(path11, init, signal) {
    const ctrl = new AbortController;
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    timer.unref?.();
    const onExternalAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onExternalAbort);
    try {
      const res = await fetch(`${this.baseUrl}${path11}`, { ...init, signal: ctrl.signal });
      return res;
    } catch (err) {
      if (err?.name === "AbortError") {
        if (signal?.aborted) {
          throw new DaemonError("Request aborted by caller signal", {
            band: "transient",
            cause: err
          });
        }
        throw new DaemonError(`Request timed out after ${this.timeoutMs}ms`, {
          band: "transient",
          cause: err
        });
      }
      throw new DaemonError(`Network error: ${err?.message ?? String(err)}`, {
        band: "transient",
        cause: err
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onExternalAbort);
    }
  }
  async readBody(res) {
    const text = await res.text().catch(() => {
      return;
    });
    if (text === undefined || text.length === 0)
      return;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  async assertOk(res, context) {
    if (res.ok)
      return;
    const body = await this.readBody(res);
    const statusText = res.statusText || String(res.status);
    const band = res.status >= 400 && res.status < 500 ? "deterministic" : "transient";
    throw new DaemonError(`${context}: ${res.status} ${statusText}`, {
      band,
      status: res.status,
      body
    });
  }
  async requestJson(path11, init, context, signal) {
    const res = await this.fetch(path11, init, signal);
    await this.assertOk(res, context);
    return await this.readBody(res);
  }
  buildQuery(params) {
    const qs = new URLSearchParams;
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined)
        qs.set(key, String(value));
    }
    const s = qs.toString();
    return s ? `?${s}` : "";
  }
  async health(opts = {}) {
    return this.requestJson("/health", { method: "GET", headers: this.headers() }, "health", opts.signal);
  }
  async version(opts = {}) {
    return this.requestJson("/version", { method: "GET", headers: this.headers() }, "version", opts.signal);
  }
  async ingestTranscript(envelope, opts = {}) {
    const attempt = () => this.requestJson("/ingest/transcript", {
      method: "POST",
      headers: this.headers(opts.idempotencyKey),
      body: JSON.stringify(envelope)
    }, "ingest/transcript", opts.signal);
    if (!this.retryIngestOnTransient)
      return attempt();
    try {
      return await attempt();
    } catch (err) {
      if (err instanceof DaemonError && err.isTransient && !opts.signal?.aborted) {
        return attempt();
      }
      throw err;
    }
  }
  async recall(req, opts = {}) {
    return this.requestJson("/recall", { method: "POST", headers: this.headers(), body: JSON.stringify(req) }, "recall", opts.signal);
  }
  async search(params, opts = {}) {
    const query = this.buildQuery({
      q: params.q,
      limit: params.limit,
      type: params.type?.join(","),
      repo: params.repo,
      project: joinList(params.project),
      agent: joinList(params.agent),
      agentMode: params.agentMode,
      since: params.since,
      as_of: params.as_of,
      entity: params.entity
    });
    return this.requestJson(`/search${query}`, { method: "GET", headers: this.headers() }, "search", opts.signal);
  }
  async remember(req, opts = {}) {
    const body = {
      text: req.text,
      type: req.type,
      metadata: {
        repo: req.repo,
        project: req.project,
        branch: req.branch,
        agent: req.agent,
        importance: req.importance,
        confidence: req.confidence
      }
    };
    return this.requestJson("/remember", { method: "POST", headers: this.headers(), body: JSON.stringify(body) }, "remember", opts.signal);
  }
  async invalidate(id, reason, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/invalidate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(reason !== undefined ? { reason } : {})
    }, "memory/invalidate", opts.signal);
  }
  async supersede(id, newId, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/supersede`, { method: "POST", headers: this.headers(), body: JSON.stringify({ new_id: newId }) }, "memory/supersede", opts.signal);
  }
  async promote(id, scope, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/promote`, { method: "POST", headers: this.headers(), body: JSON.stringify({ scope }) }, "memory/promote", opts.signal);
  }
  async restore(id, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/restore`, { method: "POST", headers: this.headers(), body: "{}" }, "memory/restore", opts.signal);
  }
  async erase(id, reason, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify(reason !== undefined ? { reason } : {})
    }, "memory/erase", opts.signal);
  }
  async markUsed(id, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/used`, { method: "POST", headers: this.headers(), body: "{}" }, "memory/used", opts.signal);
  }
  async history(id, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/history`, { method: "GET", headers: this.headers() }, "memory/history", opts.signal);
  }
  async agentProfile(agent, opts = {}) {
    return this.requestJson(`/agents/${encodeURIComponent(agent)}/profile`, { method: "GET", headers: this.headers() }, "agents/profile", opts.signal);
  }
  async sessionDigest(sessionId, opts = {}) {
    return this.requestJson(`/sessions/${encodeURIComponent(sessionId)}/digest`, { method: "GET", headers: this.headers() }, "sessions/digest", opts.signal);
  }
  async whyMemory(id, opts = {}) {
    return this.requestJson(`/memory/${encodeURIComponent(id)}/why`, { method: "GET", headers: this.headers() }, "memory/why", opts.signal);
  }
  async runConsolidation(runOpts = {}, opts = {}) {
    return this.requestJson("/consolidation/run", { method: "POST", headers: this.headers(), body: JSON.stringify(runOpts) }, "consolidation/run", opts.signal);
  }
  async listConsolidationProposals(status, opts = {}) {
    const query = this.buildQuery({ status });
    return this.requestJson(`/consolidation/proposals${query}`, { method: "GET", headers: this.headers() }, "consolidation/proposals", opts.signal);
  }
  async acceptProposal(id, opts = {}) {
    return this.requestJson(`/consolidation/proposals/${encodeURIComponent(id)}/accept`, { method: "POST", headers: this.headers(), body: "{}" }, "consolidation/accept", opts.signal);
  }
  async rejectProposal(id, opts = {}) {
    return this.requestJson(`/consolidation/proposals/${encodeURIComponent(id)}/reject`, { method: "POST", headers: this.headers(), body: "{}" }, "consolidation/reject", opts.signal);
  }
}
function createAstramemDaemonClient(opts) {
  return new AstramemDaemonClient(opts);
}
var DEFAULT_TIMEOUT_MS = 5000;
var init_daemon_client = __esm(() => {
  init_daemon_error();
});

// ../../../node_modules/@astragenie/astramem-client/dist/profile-calls.js
function resolveDaemonClient(capMs = DEFAULT_CAP_MS) {
  try {
    const baseUrl = process.env.ASTRAMEM_BASE_URL ?? DEFAULT_BASE_URL;
    const bearer = process.env.ASTRAMEM_BEARER ?? process.env.MEMORY_BEARER;
    return new AstramemDaemonClient(bearer === undefined ? { baseUrl, timeoutMs: capMs } : { baseUrl, bearer, timeoutMs: capMs });
  } catch {
    return null;
  }
}
async function profileSilent(agent, opts = {}) {
  const capMs = opts.capMs ?? DEFAULT_CAP_MS;
  try {
    const client = resolveDaemonClient(capMs);
    if (!client)
      return null;
    return await client.agentProfile(agent);
  } catch {
    return null;
  }
}
async function feedbackSilent(atomId, opts = {}) {
  const capMs = opts.capMs ?? DEFAULT_CAP_MS;
  try {
    const client = resolveDaemonClient(capMs);
    if (!client)
      return false;
    await client.markUsed(atomId);
    return true;
  } catch {
    return false;
  }
}
var DEFAULT_BASE_URL = "http://127.0.0.1:7777";
var init_profile_calls = __esm(() => {
  init_calls();
  init_daemon_client();
});

// ../../../node_modules/@astragenie/astramem-client/dist/daemon-types.js
var MEMORY_TYPES;
var init_daemon_types = __esm(() => {
  MEMORY_TYPES = [
    "decision",
    "fact",
    "lesson",
    "command",
    "todo",
    "note",
    "event",
    "preference",
    "task_result",
    "summary"
  ];
});

// ../../../node_modules/@astragenie/astramem-client/dist/index.js
var exports_dist = {};
__export(exports_dist, {
  resolveWireProvider: () => resolveWireProvider,
  resolveDaemonClient: () => resolveDaemonClient,
  rememberSilent: () => rememberSilent,
  recallSilent: () => recallSilent,
  profileSilent: () => profileSilent,
  feedbackSilent: () => feedbackSilent,
  createAstramemDaemonClient: () => createAstramemDaemonClient,
  _setWireProvider: () => _setWireProvider,
  _resetResolveCache: () => _resetResolveCache,
  DaemonError: () => DaemonError,
  DEFAULT_CAP_MS: () => DEFAULT_CAP_MS,
  DAEMON_MEMORY_TYPES: () => MEMORY_TYPES,
  AstramemDaemonClient: () => AstramemDaemonClient
});
var init_dist = __esm(() => {
  init_resolve();
  init_calls();
  init_profile_calls();
  init_daemon_client();
  init_daemon_error();
  init_daemon_types();
});

// src/scripts/lib/dispatch-tree-snapshot.mts
var exports_dispatch_tree_snapshot = {};
__export(exports_dispatch_tree_snapshot, {
  readDispatchTreeSnapshot: () => readDispatchTreeSnapshot
});
import fs13 from "fs/promises";
import { existsSync as existsSync2, statSync, readFileSync as readFileSync2 } from "fs";
import path13 from "path";
function dispatchRoot(repoRoot) {
  return path13.join(repoRoot, ".claude", "artifacts", "loop", "dispatch");
}
function parseRunIdDate(runId) {
  const m = runId.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d+)Z/);
  if (!m)
    return null;
  const [, date, hh, mm, ss, ms] = m;
  const iso = `${date}T${hh}:${mm}:${ss}.${ms}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
function runIdAgeDays(runId, dirPath, nowMs) {
  const fromId = parseRunIdDate(runId);
  if (fromId) {
    return (nowMs - fromId.getTime()) / (1000 * 60 * 60 * 24);
  }
  try {
    const s = statSync(dirPath);
    return (nowMs - s.mtimeMs) / (1000 * 60 * 60 * 24);
  } catch {
    return 0;
  }
}
async function isOpenRun(runDir, nowMs) {
  const summaryPath = path13.join(runDir, "summary.md");
  if (!existsSync2(summaryPath))
    return true;
  const tracePath = path13.join(runDir, "trace.jsonl");
  if (!existsSync2(tracePath))
    return false;
  try {
    const s = await fs13.stat(tracePath);
    return nowMs - s.mtimeMs < IN_FLIGHT_WINDOW_MS;
  } catch {
    return false;
  }
}
function countWorktreesInLog(runDir) {
  const logPath = path13.join(runDir, "worktrees.jsonl");
  if (!existsSync2(logPath))
    return 0;
  let raw;
  try {
    raw = readFileSync2(logPath, "utf8");
  } catch {
    return 0;
  }
  let count = 0;
  for (const line of raw.split(`
`)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    try {
      const entry = JSON.parse(trimmed);
      if (typeof entry.path === "string")
        count += 1;
    } catch {}
  }
  return count;
}
async function readDispatchTreeSnapshot(repoRoot) {
  const dispDir = dispatchRoot(repoRoot);
  let entries;
  try {
    entries = await fs13.readdir(dispDir);
  } catch {
    return { openRunIds: [], worktreeCount: 0, oldestRunAgeDays: null };
  }
  const nowMs = Date.now();
  const openRunIds = [];
  let worktreeCount = 0;
  let oldestAgeDays = null;
  for (const name of entries) {
    const runDir = path13.join(dispDir, name);
    let isDir = false;
    try {
      const s = await fs13.stat(runDir);
      isDir = s.isDirectory();
    } catch {
      continue;
    }
    if (!isDir)
      continue;
    const ageDays = runIdAgeDays(name, runDir, nowMs);
    if (oldestAgeDays === null || ageDays > oldestAgeDays) {
      oldestAgeDays = ageDays;
    }
    const open = await isOpenRun(runDir, nowMs);
    if (open) {
      openRunIds.push(name);
      worktreeCount += countWorktreesInLog(runDir);
    }
  }
  return { openRunIds, worktreeCount, oldestRunAgeDays: oldestAgeDays };
}
var IN_FLIGHT_WINDOW_MS;
var init_dispatch_tree_snapshot = __esm(() => {
  IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000;
});

// hooks/pre-push-gate.mts
import fs16 from "fs/promises";
import path15 from "path";
import { spawnSync, execFileSync } from "child_process";
import { fileURLToPath as fileURLToPath2 } from "url";

// crew/hooks/hook-error.mts
import fs from "fs/promises";
import path from "path";
async function logHookError(repoPath, hookName, error) {
  try {
    const dir = path.join(repoPath, ".claude", "logs");
    await fs.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: "hook_error",
      hook: hookName,
      error: String(error)
    });
    await fs.appendFile(path.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}

// crew/scripts/lib/features-service.mts
import fs2 from "fs/promises";
import path2 from "path";
var FEATURES = {
  "cost-hygiene": {
    version: "2.1.0",
    default: true,
    description: "Umbrella telemetry: read/edit tracking, redundant-read warn, TaskUpdate burst detection.",
    scope: "crew",
    owner: "platform",
    since: "0.38.0"
  },
  "redundant-read-stop": {
    version: "1.1.0",
    default: true,
    description: "Warn the agent when re-reading a file with identical content. Gates the warn-emit only; recording still happens under cost-hygiene.",
    scope: "crew",
    owner: "platform",
    since: "0.33.0"
  },
  "shell-preflight": {
    version: "2.1.0",
    default: true,
    description: "Pre-Bash hook: warn on $env: syntax, redirect anti-patterns, etc.",
    scope: "crew",
    owner: "safety",
    since: "0.33.11"
  },
  "subagent-inline-warn": {
    version: "2.1.0",
    default: true,
    description: "Warn when a subagent returns a large body without an artifact path. Threshold knob: features['subagent-inline-warn'].threshold (bytes, default 512).",
    scope: "crew",
    owner: "platform",
    since: "0.33.0"
  },
  "push-verify": {
    version: "1.0.0",
    default: false,
    description: "Gate git push and gh pr create behind a PASS validation artifact written within the last hour. Opt out per-repo via deployment.md `push.verify: false`. Enable via crew.json features['push-verify'].enabled=true.",
    scope: "crew",
    owner: "safety",
    since: "0.46.1"
  },
  "git-gate-block": {
    version: "1.0.0",
    default: false,
    description: "Enforcement level of the repo-side commit/PR gate hook (check_git_gate.sh). Default false = warn (advisory systemMessage on pending badges); flips to block (decision:block) after a 1-week bake. Guardrail: this flag may only soften block\u2192warn, never silence the gate.",
    scope: "shared",
    owner: "safety",
    since: "0.48.0"
  },
  "otel-telemetry": {
    version: "1.0.0",
    default: true,
    description: "Wraps the otel-post-tool-use / otel-stop / otel-subagent-stop hooks. Independent of the existing telemetry-config opt-in gate (cfg.enabled + CREW_OTEL_ENABLED) \u2014 both must pass for a span to emit.",
    scope: "crew",
    owner: "platform",
    since: "0.48.0"
  },
  "bash-gate-telemetry": {
    version: "1.0.0",
    default: true,
    description: "Wraps pre-tool-use-bash-gate / post-tool-use-bash-gate recording. Independent of the existing CREW_BASH_GATE_LOG=0 escape hatch \u2014 either one disables recording.",
    scope: "crew",
    owner: "platform",
    since: "0.48.0"
  },
  "task-update-burst-warn": {
    version: "1.0.0",
    default: true,
    description: "Wraps the check-task-update-burst hook. Sits alongside the cost-hygiene umbrella check \u2014 both must be enabled for burst detection to record.",
    scope: "crew",
    owner: "platform",
    since: "0.48.0"
  },
  "checkpoint-cadence": {
    version: "1.0.0",
    default: true,
    description: "dev-team#174: PostToolUse child-side hook. After the first Edit/Write in a builder session, every N post-edit tool calls it injects a systemMessage nudging the builder to write a resume scaffold (.claude/state/crew/checkpoint-<slice>.md) so a mid-job death loses no WIP. Cadence knob: features['checkpoint-cadence'].threshold (default 20).",
    scope: "crew",
    owner: "platform",
    since: "0.54.0"
  },
  "event-emit": {
    version: "1.0.0",
    default: true,
    description: "Future P2.2 artifact-event emission at ARTIFACT_HANDLERS (unify-event-stream). Registry entry only \u2014 no consumer wired yet.",
    scope: "shared",
    owner: "platform",
    since: "0.48.0"
  },
  "model-routing": {
    version: "1.0.0",
    default: true,
    description: "Gates model-tier routing for the `crew resolve-model` CLI (interactive /crew:build /crew:fix /crew:orchestrate-slice dispatch) and the pre-tool-use-model-enforce hook. Enabled (default): resolves .claude/loop.json loop.modelRouting as today (build -> sonnet). Disabled: resolve-model prints the sentinel 'inherit' and the hook stands down \u2014 dispatches omit the Agent-tool model: argument so each agent's own model: frontmatter (agents/*.md) governs.",
    scope: "crew",
    owner: "platform",
    since: "0.51.2"
  },
  "reviewer-decision-guard": {
    version: "1.0.0",
    default: true,
    description: "SubagentStop guard (dev-team#199): blocks a reviewer-tier subagent (crew:reviewer, crew:reviewer-lite, crew:typescript-reviewer, crew:csharp-reviewer, crew:architect-reviewer) from going idle with no delivered decision (decision: approved|approved_with_notes|rejected line, or a written review-result artifact path). Mitigates parallel reviewer fan-out idling that stalls the dispatcher's post-review gate.",
    scope: "crew",
    owner: "safety",
    since: "0.59.0"
  },
  "builder-terminal-state-guard": {
    version: "1.0.0",
    default: true,
    description: "SubagentStop guard (dev-team#187, #174 \u2014 Wave 3 Guard 1, 'deliver-before-die'): blocks a STATUS-line builder-tier subagent (crew:fullstack-dev, crew:backend-dev, crew:frontend-dev, crew:aiplugin-dev \u2014 crew:dev-lite is deliberately excluded, its receipt contract uses a different vocabulary, see dev-team#226) from going idle with no delivered terminal state (a DONE|BLOCKED|HELP|IN-PROGRESS Report-contract line, or a written handoff/artifact path). BLOCKED is itself a valid terminal state and is never blocked. One retry only (stop_hook_active re-entry guard). Mitigates a builder clipping its report after risky work (commit/push/PR) but before the STATUS line the dispatcher's gates look for.",
    scope: "crew",
    owner: "safety",
    since: "0.63.0"
  },
  "dispatch-size-gate": {
    version: "1.0.0",
    default: false,
    description: "A3 (8 agent deaths, all from oversized dispatches): enforcement level of the PreToolUse/Agent dispatch-size gate (hooks/pre-tool-use-dispatch-size.ts). The hook estimates a dispatch's token cost from tier + file/dir mentions + wide-scope markers in the prompt against a 150k warn line (deliberate headroom below the 200k hard cap) and always emits an advisory systemMessage on over-threshold dispatches regardless of this flag. Default false = warn-only bake period, mirroring the git-gate-block precedent; flips to true only after warn-phase estimates are joined against real scripts/lib/dispatch-timing.ts telemetry and the threshold is confirmed well-calibrated \u2014 this repo has not run that calibration pass yet (no historical dispatch-timing.jsonl in this checkout to join against). Guardrail: this flag may only soften block->warn, never silence the gate \u2014 the warn nudge fires unconditionally regardless of flag state.",
    scope: "crew",
    owner: "safety",
    since: "0.63.0"
  }
};
function isEnabled(feature, config) {
  const enabled = config && typeof config === "object" && "features" in config && config.features && typeof config.features === "object" && feature in config.features && config.features[feature] && typeof config.features[feature] === "object" && "enabled" in config.features[feature] && typeof config.features[feature].enabled === "boolean" ? config.features[feature].enabled === true : FEATURES[feature]?.default ?? true;
  process.stderr.write(`[features] ${feature}: ${enabled ? "enabled" : "disabled"}
`);
  return enabled;
}
async function readCrewConfig(cwd) {
  const configPath = path2.join(cwd, ".claude", "crew.json");
  try {
    const content = await fs2.readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return {};
  }
}

// crew/scripts/lib/briefing/collect-cost-parser.mts
function parseFrontmatterBlock(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const kv = line.match(/^([\w_]+):\s*(.*)$/);
      if (kv)
        fm[kv[1]] = kv[2].trim();
    }
  }
  return fm;
}

// ../../../crew/node_modules/@astragenie/plugin-std/dist/git.js
import { execFile } from "child_process";

// ../../../crew/node_modules/@astragenie/plugin-std/dist/errors.js
class PluginError extends Error {
  transient = false;
  status;
  constructor(message, ctx) {
    super(message, ctx?.cause !== undefined ? { cause: ctx.cause } : undefined);
    this.status = ctx?.status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class DeterministicError extends PluginError {
  transient = false;
  code;
  constructor(message, ctx) {
    super(message, ctx);
    this.name = "DeterministicError";
    this.code = ctx?.code ?? "E_DETERMINISTIC";
  }
}

class TransientError extends PluginError {
  transient = true;
  code;
  constructor(message, ctx) {
    super(message, ctx);
    this.name = "TransientError";
    this.code = ctx?.code ?? "E_TRANSIENT";
  }
}

// ../../../crew/node_modules/@astragenie/plugin-std/dist/git.js
function chomp(s) {
  return s.replace(/\r?\n$/, "");
}
async function runGit(args, opts = {}) {
  const execOpts = {
    encoding: "utf8",
    cwd: opts.cwd,
    signal: opts.signal,
    timeout: opts.timeoutMs,
    maxBuffer: opts.maxBuffer
  };
  return new Promise((resolve, reject) => {
    execFile("git", args, execOpts, (error, stdout, stderr) => {
      if (error === null) {
        resolve({ ok: true, stdout: chomp(stdout), stderr: chomp(stderr), status: 0 });
        return;
      }
      if (typeof error.code === "number") {
        resolve({
          ok: false,
          stdout: chomp(stdout),
          stderr: chomp(stderr),
          status: error.code
        });
        return;
      }
      if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        reject(new DeterministicError(`runGit: git ${args.join(" ")} produced more output than maxBuffer ` + `(${execOpts.maxBuffer ?? "1048576 (Node default)"} bytes) allows; raise opts.maxBuffer`, { code: "E_GIT_MAXBUFFER", cause: error }));
        return;
      }
      if (error.signal) {
        resolve({ ok: false, stdout: chomp(stdout), stderr: chomp(stderr), status: -1 });
        return;
      }
      reject(new TransientError(`runGit: failed to spawn git ${args.join(" ")}`, {
        code: "E_GIT_SPAWN",
        cause: error
      }));
    });
  });
}

// crew/scripts/lib/docs-only.mts
var DOCS_PATTERNS = [
  /\.mdx?$/i,
  /\.txt$/i,
  /^docs\//,
  /^\.claude\/artifacts\//,
  /(^|\/)CHANGELOG(\.[A-Za-z]+)?$/,
  /(^|\/)LICENSE(\.[A-Za-z]+)?$/
];
function isDocsPath(file) {
  const normalized = file.trim().split("\\").join("/");
  return DOCS_PATTERNS.some((pattern) => pattern.test(normalized));
}
function isDocsOnlyDiff(files) {
  const meaningful = files.map((f) => f.trim()).filter(Boolean);
  if (meaningful.length === 0)
    return false;
  return meaningful.every(isDocsPath);
}
async function gitText(args, cwd) {
  try {
    const result = await runGit(args, { cwd, maxBuffer: 1024 * 1024 });
    return result.ok ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}
async function resolveUpstream(repoRoot) {
  const tracked = await gitText(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoRoot);
  if (tracked)
    return tracked;
  for (const ref of ["origin/main", "origin/HEAD"]) {
    if (await gitText(["rev-parse", "--verify", "--quiet", ref], repoRoot))
      return ref;
  }
  return null;
}
async function pushedFileset(repoRoot) {
  const upstream = await resolveUpstream(repoRoot);
  if (!upstream)
    return null;
  const out = await gitText(["diff", "--name-only", `${upstream}...HEAD`], repoRoot);
  if (out === null)
    return null;
  return out.split(`
`).map((line) => line.trim()).filter(Boolean);
}
async function isDocsOnlyPush(repoRoot) {
  const files = await pushedFileset(repoRoot);
  if (files === null)
    return false;
  return isDocsOnlyDiff(files);
}

// src/scripts/validate-snapshot-freshness.mts
import fs15 from "fs/promises";

// src/scripts/lib/memory-snapshot.mts
import fs14 from "fs/promises";
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "fs";
import path14 from "path";

// src/scripts/lib/backlog-parser.mts
import fs4 from "fs/promises";
import { readFileSync } from "fs";
import path4 from "path";

// src/scripts/lib/frontmatter.mts
var FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n*/;
var SCALAR_NUMBER_RE = /^-?\d+(\.\d+)?$/;
var CRLF_STRIP_RE = /\r$/;
var BLOCK_ARRAY_ITEM_RE = /^\s+-\s/;
var BLOCK_ARRAY_ITEM_STRIP_RE = /^\s+-\s+/;
var KEY_VALUE_RE = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/;
var NESTED_KV_RE = /^\s+([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/;
var BLOCK_ARRAY_MAPPING_ITEM_RE = /^([A-Za-z_][A-Za-z0-9_-]*):(\s+.*|)$/;
var DOUBLE_QUOTE_ESCAPE_RE = /\\\\|\\n|\\r|\\"/g;
function unescapeDoubleQuoted(value) {
  return value.replace(DOUBLE_QUOTE_ESCAPE_RE, (m) => {
    if (m === "\\\\")
      return "\\";
    if (m === "\\n")
      return `
`;
    if (m === "\\r")
      return "\r";
    return '"';
  });
}
function stripQuotes(value) {
  const v = value.trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    return unescapeDoubleQuoted(v.slice(1, -1));
  }
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1);
  }
  return v;
}
function splitInlineArrayItems(inner) {
  const items = [];
  let current = "";
  let quote = null;
  for (let i = 0;i < inner.length; i += 1) {
    const ch = inner[i];
    if (quote) {
      current += ch;
      if (quote === '"' && ch === "\\" && i + 1 < inner.length) {
        current += inner[i + 1];
        i += 1;
        continue;
      }
      if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ",") {
      items.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  items.push(current);
  return items;
}
function parseScalar(raw) {
  const v = raw.trim();
  if (v === "" || v === "~" || v === "null")
    return null;
  if (v === "true")
    return true;
  if (v === "false")
    return false;
  if (SCALAR_NUMBER_RE.test(v))
    return Number(v);
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (inner === "")
      return [];
    return splitInlineArrayItems(inner).map((item) => stripQuotes(item.trim()));
  }
  return stripQuotes(v);
}
function resetState(state) {
  state.currentArrayKey = null;
  state.currentMapKey = null;
  state.arrayItemsAreMappings = false;
}
function detectEmptyValueShape(lines, fromIndex) {
  for (let j = fromIndex;j < lines.length; j += 1) {
    const peek = lines[j].replace(CRLF_STRIP_RE, "");
    if (peek.trim() === "")
      continue;
    if (BLOCK_ARRAY_ITEM_RE.test(peek))
      return "array";
    if (NESTED_KV_RE.test(peek))
      return "map";
    return "scalar";
  }
  return "scalar";
}
function applyEmptyValue(frontmatter, state, key, shape) {
  resetState(state);
  if (shape === "array") {
    frontmatter[key] = [];
    state.currentArrayKey = key;
  } else if (shape === "map") {
    frontmatter[key] = {};
    state.currentMapKey = key;
  } else {
    frontmatter[key] = null;
  }
}
function consumeBlockArrayItem(frontmatter, state, line) {
  const itemRaw = line.replace(BLOCK_ARRAY_ITEM_STRIP_RE, "");
  const arr = frontmatter[state.currentArrayKey];
  const kv = itemRaw.match(BLOCK_ARRAY_MAPPING_ITEM_RE);
  if (kv) {
    const obj = {};
    obj[kv[1]] = parseScalar(kv[2]);
    arr.push(obj);
    state.arrayItemsAreMappings = true;
  } else {
    arr.push(stripQuotes(itemRaw));
    state.arrayItemsAreMappings = false;
  }
}

class FrontmatterNestingError extends Error {
  arrayKey;
  field;
  constructor(arrayKey, field) {
    super(`frontmatter parse error: "${arrayKey}" item field "${field}" is written as a ` + "nested block list, which this hand-rolled parser does not support one level " + `deep inside an array-of-mappings item \u2014 rewrite it as an inline array on one ` + `line instead, e.g. \`${field}: ["a", "b"]\`.`);
    this.arrayKey = arrayKey;
    this.field = field;
    this.name = "FrontmatterNestingError";
  }
}
function leadingWhitespaceLength(line) {
  return line.match(/^[ \t]*/)?.[0].length ?? 0;
}
function extendLastArrayMapping(frontmatter, state, line, lines, lineIndex) {
  const nm = line.match(NESTED_KV_RE);
  if (!nm)
    return false;
  const arr = frontmatter[state.currentArrayKey];
  const last = arr[arr.length - 1];
  if (!last || typeof last !== "object" || Array.isArray(last))
    return false;
  const field = nm[1];
  const rawValue = nm[2];
  if (rawValue.trim() === "") {
    const shape = detectEmptyValueShape(lines, lineIndex + 1);
    if (shape === "array") {
      const nextLine = lines.slice(lineIndex + 1).find((l) => l.replace(CRLF_STRIP_RE, "").trim() !== "");
      if (nextLine && leadingWhitespaceLength(nextLine) > leadingWhitespaceLength(line)) {
        throw new FrontmatterNestingError(state.currentArrayKey, field);
      }
    }
  }
  last[field] = parseScalar(rawValue);
  return true;
}
function tryConsumeContinuation(frontmatter, state, line, lines, lineIndex) {
  if (state.currentArrayKey && BLOCK_ARRAY_ITEM_RE.test(line)) {
    consumeBlockArrayItem(frontmatter, state, line);
    return true;
  }
  if (state.currentArrayKey && state.arrayItemsAreMappings && NESTED_KV_RE.test(line) && !BLOCK_ARRAY_ITEM_RE.test(line)) {
    if (extendLastArrayMapping(frontmatter, state, line, lines, lineIndex))
      return true;
  }
  if (state.currentMapKey && NESTED_KV_RE.test(line) && !BLOCK_ARRAY_ITEM_RE.test(line)) {
    const nm = line.match(NESTED_KV_RE);
    if (nm) {
      frontmatter[state.currentMapKey][nm[1]] = parseScalar(nm[2]);
      return true;
    }
  }
  return false;
}
function parseFrontmatter(content) {
  if (typeof content !== "string") {
    return { frontmatter: {}, body: "" };
  }
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const block = match[1];
  const body = content.slice(match[0].length);
  const lines = block.split(`
`);
  const frontmatter = {};
  const state = {
    currentArrayKey: null,
    currentMapKey: null,
    arrayItemsAreMappings: false
  };
  for (let i = 0;i < lines.length; i += 1) {
    const line = lines[i].replace(CRLF_STRIP_RE, "");
    if (line.trim() === "") {
      resetState(state);
      continue;
    }
    if (tryConsumeContinuation(frontmatter, state, line, lines, i))
      continue;
    const m = line.match(KEY_VALUE_RE);
    if (!m) {
      resetState(state);
      continue;
    }
    const key = m[1];
    const value = m[2];
    if (value === "") {
      applyEmptyValue(frontmatter, state, key, detectEmptyValueShape(lines, i + 1));
    } else {
      resetState(state);
      frontmatter[key] = parseScalar(value);
    }
  }
  return { frontmatter, body };
}

// src/scripts/lib/frontmatter-cache.mts
var cache = new Map;
function readFrontmatterCached(filePath, mtime, parse, readFile) {
  const existing = cache.get(filePath);
  if (existing !== undefined && existing.mtime === mtime) {
    return existing.data;
  }
  const content = readFile(filePath);
  const data = parse(content);
  cache.set(filePath, { mtime, data });
  return data;
}

// src/scripts/lib/paths.mts
import path3 from "path";
import fs3 from "fs/promises";

// src/scripts/lib/cache.mts
var _store = new Map;
function cached(key, asyncFn) {
  if (_store.has(key))
    return _store.get(key);
  const promise = asyncFn();
  _store.set(key, promise);
  return promise;
}

// src/scripts/lib/paths.mts
var PATH_DEFAULTS = {
  artifactRoot: ".claude/artifacts/loop",
  aiLoopRoot: ".claude/artifacts/loop/ai-loop",
  backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
  slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
  backlogRoot: ".claude/artifacts/loop/backlog",
  specsRoot: ".claude/artifacts/loop/specs",
  gradesRoot: ".claude/artifacts/loop/grades",
  decisionsRoot: ".claude/artifacts/loop/decisions",
  releasesRoot: ".claude/artifacts/loop/releases",
  retrospectivesRoot: ".claude/artifacts/loop/retrospectives",
  miningRoot: ".claude/artifacts/loop/mining",
  learningRunsRoot: ".claude/artifacts/loop/learning-runs",
  snapshotPath: ".claude/artifacts/loop/loop-snapshot.md",
  phaseGateArtifactDir: ".claude/artifacts/crew/validations"
};
function resolve(key, config) {
  return config?.loop?.[key] || PATH_DEFAULTS[key];
}
function backlogRoot(repoPath, config) {
  return path3.join(repoPath, resolve("backlogRoot", config));
}
function specsRoot(repoPath, config) {
  return path3.join(repoPath, resolve("specsRoot", config));
}
function gradesRoot(repoPath, config) {
  return path3.join(repoPath, resolve("gradesRoot", config));
}
function decisionsRoot(repoPath, config) {
  return path3.join(repoPath, resolve("decisionsRoot", config));
}
function snapshotPath(repoPath, config) {
  return path3.join(repoPath, resolve("snapshotPath", config));
}
async function pathExists(p) {
  try {
    await fs3.access(p);
    return true;
  } catch {
    return false;
  }
}

// src/scripts/lib/backlog-parser.mts
var BACKLOG_STATES = ["pending", "triaged", "in-progress", "done"];
var FEATURE_FILE_RE = /^FEAT-(\d+)([a-z])?(?:-.*)?\.md$/;
async function readEntry(filePath, state) {
  const filename = path4.basename(filePath);
  const match = filename.match(FEATURE_FILE_RE);
  if (!match)
    return null;
  const idNumber = Number(match[1]);
  const idSuffix = match[2] || "";
  const mtime = (await fs4.stat(filePath)).mtimeMs;
  const result = readFrontmatterCached(filePath, mtime, parseFrontmatter, (p) => readFileSync(p, "utf8"));
  const { frontmatter, body } = result;
  return {
    id: frontmatter.id || `FEAT-${String(idNumber).padStart(3, "0")}${idSuffix}`,
    idNumber,
    idSuffix,
    state,
    filePath,
    filename,
    frontmatter: { ...frontmatter, status: state },
    body
  };
}
async function readStateEntries(root, state) {
  const dir = path4.join(root, state);
  if (!await pathExists(dir))
    return [];
  const files = await fs4.readdir(dir);
  const results = await Promise.all(files.filter((file) => file.endsWith(".md") && FEATURE_FILE_RE.test(file)).map((file) => readEntry(path4.join(dir, file), state)));
  return results.filter((e) => e !== null);
}
async function listBacklog(repoPath, options = {}) {
  const cacheKey = `listBacklog:${repoPath}`;
  return cached(cacheKey, async () => {
    const root = backlogRoot(repoPath, options.config);
    const perStateBatches = await Promise.all(BACKLOG_STATES.map((state) => readStateEntries(root, state)));
    const entries = perStateBatches.flat();
    entries.sort((a, b) => a.idNumber - b.idNumber || (a.idSuffix || "").localeCompare(b.idSuffix || ""));
    return entries;
  });
}
function comparePickOrder(a, b) {
  const ap = a.frontmatter.priority || "P3";
  const bp = b.frontmatter.priority || "P3";
  if (ap !== bp)
    return ap.localeCompare(bp);
  return a.idNumber - b.idNumber || (a.idSuffix || "").localeCompare(b.idSuffix || "");
}
function filterBacklog(entries, filters = {}) {
  return entries.filter((entry) => {
    if (filters.status && entry.state !== filters.status)
      return false;
    if (filters.priority && entry.frontmatter.priority !== filters.priority)
      return false;
    if (filters.category && entry.frontmatter.category !== filters.category)
      return false;
    if (filters.target_release && entry.frontmatter.target_release !== filters.target_release)
      return false;
    if (filters.derived_from) {
      const df = entry.frontmatter.derived_from;
      const list = Array.isArray(df) ? df : df ? [df] : [];
      if (!list.includes(filters.derived_from))
        return false;
    }
    return true;
  });
}

// src/scripts/lib/spec-parser.mts
import fs5 from "fs/promises";
import path5 from "path";
var specRoot = specsRoot;
var SPEC_FILE_RE = /^SPEC-(\d+)(?:-.*)?\.md$/;
async function readSpec(filePath) {
  const filename = path5.basename(filePath);
  const match = filename.match(SPEC_FILE_RE);
  if (!match)
    return null;
  const idNumber = Number(match[1]);
  const content = await fs5.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    id: frontmatter.id || `SPEC-${String(idNumber).padStart(3, "0")}`,
    idNumber,
    filePath,
    filename,
    frontmatter,
    body
  };
}
async function listSpecs(repoPath, options = {}) {
  const cacheKey = `listSpecs:${repoPath}`;
  return cached(cacheKey, async () => {
    const root = specRoot(repoPath, options.config);
    if (!await pathExists(root))
      return [];
    const files = await fs5.readdir(root);
    const specs = [];
    for (const file of files) {
      if (!file.endsWith(".md") || !SPEC_FILE_RE.test(file))
        continue;
      const spec = await readSpec(path5.join(root, file));
      if (spec)
        specs.push(spec);
    }
    specs.sort((a, b) => a.idNumber - b.idNumber);
    return specs;
  });
}

// src/scripts/lib/grade-parser.mts
import fs6 from "fs/promises";
import path6 from "path";
var GRADE_FILE_RE_LEGACY = /^SLICE-(\d+)-grade\.md$/i;
var GRADE_FILE_RE_NEW = /^\d{8}T\d{6}Z-.*-grade\.md$/i;
var SCORE_DIMENSIONS = [
  "architecture_quality",
  "reliability",
  "observability",
  "production_readiness",
  "security",
  "test_confidence",
  "product_completeness"
];
function parseScoresFromBody(body) {
  const scores = {};
  const lines = body.split(`
`);
  let inScores = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Scores\b/i.test(trimmed)) {
      inScores = true;
      continue;
    }
    if (inScores && /^##\s+/.test(trimmed))
      break;
    if (!inScores)
      continue;
    const m = trimmed.match(/^-\s+([a-z_]+)\s*:\s*([0-9]*\.?[0-9]+)/i);
    if (m) {
      scores[m[1]] = Number(m[2]);
    }
  }
  return scores;
}
function parseDecisionsFromBody(body) {
  const decisions = [];
  const lines = body.split(`
`);
  let inDecisions = false;
  let current = null;
  let buffer = [];
  function flush() {
    if (!current)
      return;
    const text = buffer.join(`
`);
    const rationaleMatch = text.match(/\*\*Rationale\*\*\s*:\s*([\s\S]*?)(?=\n\*\*|\n##|\n###|$)/i);
    current.rationale = rationaleMatch ? rationaleMatch[1].trim() : "";
    const consequencesMatch = text.match(/\*\*Consequences\*\*\s*:\s*([\s\S]*?)(?=\n\*\*|\n##|\n###|$)/i);
    current.consequences = consequencesMatch ? consequencesMatch[1].trim() : "";
    decisions.push(current);
    current = null;
    buffer = [];
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Decisions\b/i.test(trimmed)) {
      inDecisions = true;
      continue;
    }
    if (inDecisions && /^##\s+/.test(trimmed)) {
      flush();
      break;
    }
    if (!inDecisions)
      continue;
    const heading = trimmed.match(/^###\s+(DEC-(?:TBD|\d+))\s*:\s*(.+)$/i);
    if (heading) {
      flush();
      current = { id: heading[1].toUpperCase(), title: heading[2].trim() };
      continue;
    }
    if (current)
      buffer.push(line);
  }
  flush();
  return decisions;
}
async function readGrade(filePath) {
  const content = await fs6.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    filePath,
    frontmatter,
    body,
    scores: parseScoresFromBody(body),
    decisions: parseDecisionsFromBody(body),
    notChecked: Array.isArray(frontmatter.not_checked) ? frontmatter.not_checked : [],
    authorId: typeof frontmatter.author_id === "string" ? frontmatter.author_id : null,
    judgeId: typeof frontmatter.judge_id === "string" ? frontmatter.judge_id : null,
    selfApproval: typeof frontmatter.self_approval === "boolean" ? frontmatter.self_approval : null
  };
}
function isGradeFile(filename) {
  return GRADE_FILE_RE_LEGACY.test(filename) || GRADE_FILE_RE_NEW.test(filename);
}
async function listGrades(repoPath, options = {}) {
  const cacheKey = `listGrades:${repoPath}`;
  return cached(cacheKey, async () => {
    const root = gradesRoot(repoPath, options.config);
    if (!await pathExists(root))
      return [];
    const files = await fs6.readdir(root);
    const grades = [];
    for (const file of files) {
      if (!file.endsWith(".md") || !isGradeFile(file))
        continue;
      const g = await readGrade(path6.join(root, file));
      grades.push(g);
    }
    return grades.sort((a, b) => (a.frontmatter.slice || "").localeCompare(b.frontmatter.slice || ""));
  });
}

// src/scripts/lib/decisions-store.mts
import { existsSync } from "fs";
import fs7 from "fs/promises";
import path7 from "path";
import { fileURLToPath } from "url";
var scriptDir = path7.dirname(fileURLToPath(import.meta.url));
var templateDir = path7.resolve(scriptDir, "..", "..", "templates");
if (!existsSync(templateDir)) {
  templateDir = path7.resolve(scriptDir, "..", "..", "..", "templates");
}
var DEC_FILE_RE = /^DEC-(\d+)\.md$/;
async function listDecisions(repoPath, {
  config = null,
  status = null
} = {}) {
  const root = decisionsRoot(repoPath, config);
  if (!await pathExists(root))
    return [];
  const files = await fs7.readdir(root);
  const decisions = [];
  for (const file of files) {
    if (!file.endsWith(".md") || !DEC_FILE_RE.test(file))
      continue;
    const filePath = path7.join(root, file);
    const content = await fs7.readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    decisions.push({
      id: frontmatter.id,
      title: frontmatter.title,
      status: frontmatter.status,
      introduced_by_slice: frontmatter.introduced_by_slice,
      introduced_at: frontmatter.introduced_at,
      superseded_by: frontmatter.superseded_by,
      filePath,
      frontmatter,
      body
    });
  }
  const filtered = status ? decisions.filter((d) => d.status === status) : decisions;
  return filtered.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}

// src/scripts/lib/loop-iteration.mts
import fs8 from "fs/promises";
import path8 from "path";
var STATE_DIR = ".claude/state/loop";
var ITERATION_FILE = "iteration.json";
async function getIterationPath(repoPath) {
  return path8.join(repoPath, STATE_DIR, ITERATION_FILE);
}
async function readIterationState(repoPath) {
  try {
    const filePath = await getIterationPath(repoPath);
    const raw = await fs8.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function getIterationStatus(repoPath, maxIterations = 25) {
  const state = await readIterationState(repoPath);
  const count = Number(state?.count ?? 0);
  const exhausted = count >= maxIterations;
  return { count, cap: maxIterations, exhausted };
}

// src/scripts/lib/pause-telemetry.mts
import fs9 from "fs/promises";
import path9 from "path";
var PAUSE_EVENTS_RELATIVE = [".claude", "artifacts", "loop", "pause-events.jsonl"];
function pauseEventsPath(repoPath) {
  return path9.join(repoPath, ...PAUSE_EVENTS_RELATIVE);
}
async function readPauseTelemetry(repoPath) {
  let content;
  try {
    content = await fs9.readFile(pauseEventsPath(repoPath), "utf8");
  } catch {
    return [];
  }
  const records = [];
  for (const line of content.split(`
`)) {
    if (!line.trim())
      continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && (parsed.type === "pause_event" || parsed.type === "dispatch_outcome")) {
        records.push(parsed);
      }
    } catch {}
  }
  return records;
}
var DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS = 7;
var MS_PER_DAY = 24 * 60 * 60 * 1000;
function resolvePauseTelemetryStaleAfterDays(config) {
  const raw = config?.loop?.pauseTelemetryStaleAfterDays;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS;
}
async function evaluatePauseTelemetryStaleness(repoPath, config, now = Date.now()) {
  const thresholdDays = resolvePauseTelemetryStaleAfterDays(config);
  const records = await readPauseTelemetry(repoPath);
  if (records.length === 0) {
    return { stale: true, newestTs: null, thresholdDays };
  }
  let newestTs = records[0].ts;
  for (const r of records) {
    if (r.ts > newestTs)
      newestTs = r.ts;
  }
  const newestMs = Date.parse(newestTs);
  if (Number.isNaN(newestMs)) {
    return { stale: true, newestTs, thresholdDays };
  }
  const ageDays = (now - newestMs) / MS_PER_DAY;
  return { stale: ageDays >= thresholdDays, newestTs, thresholdDays };
}
async function summarizePauseRate(repoPath, windowN) {
  const records = await readPauseTelemetry(repoPath);
  const outcomes = records.filter((r) => r.type === "dispatch_outcome");
  const windowed = typeof windowN === "number" && windowN > 0 ? outcomes.slice(-windowN) : outcomes;
  const dispatches = windowed.length;
  const pauses = windowed.filter((r) => r.outcome === "paused").length;
  const pauseRate = dispatches === 0 ? 0 : pauses / dispatches;
  const pauseEvents = records.filter((r) => r.type === "pause_event");
  const pauseKindCount = pauseEvents.filter((r) => r.kind === "pause").length;
  const resumeSuccessCount = pauseEvents.filter((r) => r.kind === "resume_success").length;
  const resumeSuccessRate = pauseKindCount === 0 ? 0 : resumeSuccessCount / pauseKindCount;
  return { dispatches, pauses, pauseRate, resumeSuccessRate };
}

// src/scripts/lib/memory-sink.mts
import fs11 from "fs/promises";
import path11 from "path";

// src/scripts/lib/memory-noise-guard.mts
var COMMAND_TOOLS = new Set(["bun", "bunx", "git", "gh", "npm", "npx"]);
var PROSE_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "should",
  "must",
  "will",
  "would",
  "can",
  "cannot",
  "to",
  "for",
  "and",
  "but",
  "because",
  "this",
  "that",
  "when",
  "before",
  "after",
  "use",
  "using",
  "used",
  "need",
  "needs",
  "needed",
  "always",
  "never",
  "not",
  "if",
  "then",
  "so",
  "with",
  "without",
  "from",
  "lesson",
  "note",
  "remember"
]);

// src/scripts/lib/memory-transport.mts
init_dist();

// src/scripts/lib/memory-sink.mts
async function readMemoryConfig(repoPath, preParsed) {
  let parsed = preParsed ?? null;
  if (!parsed) {
    try {
      const raw = await fs11.readFile(path11.join(repoPath, ".claude", "loop.json"), "utf8");
      parsed = JSON.parse(raw);
    } catch {
      return { mode: "off" };
    }
  }
  const root = parsed;
  const mem = root?.memory;
  const memObj = mem && typeof mem === "object" ? mem : {};
  const enabled = memObj.enabled;
  const explicitProject = typeof memObj.project === "string" && memObj.project ? memObj.project : undefined;
  const productName = typeof root?.productName === "string" && root.productName ? root.productName : undefined;
  const capMs = typeof memObj.capMs === "number" && Number.isFinite(memObj.capMs) && memObj.capMs > 0 ? memObj.capMs : undefined;
  return {
    mode: normalizeMode(enabled),
    project: explicitProject ?? productName,
    capMs,
    scope: normalizeScope(memObj.scope)
  };
}
function normalizeMode(enabled) {
  if (enabled === true)
    return "on";
  if (typeof enabled === "string") {
    const v = enabled.toLowerCase();
    if (v === "on" || v === "always" || v === "true")
      return "on";
    if (v === "auto")
      return "auto";
  }
  return "off";
}
function normalizeScope(scope) {
  return scope === "private" || scope === "team" || scope === "org" ? scope : "team";
}

// src/scripts/lib/memory-usefulness.mts
var DEFAULT_USEFULNESS_FETCH_CAP_MS = 2000;
async function fetchMemoryUsefulness(repoPath, config, capMs = DEFAULT_USEFULNESS_FETCH_CAP_MS) {
  try {
    const memCfg = await readMemoryConfig(repoPath, config ?? null);
    if (memCfg.mode === "off")
      return null;
    const { resolveDaemonClient: resolveDaemonClient2 } = await Promise.resolve().then(() => (init_dist(), exports_dist));
    const client = resolveDaemonClient2(capMs);
    if (!client)
      return null;
    const health = await Promise.race([
      client.health(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("memory-usefulness-fetch-timeout")), capMs);
      })
    ]);
    return {
      served: health.usefulness?.served_7d ?? 0,
      used: health.usefulness?.used_7d ?? 0,
      rate: health.usefulness?.rate_7d ?? null
    };
  } catch {
    return null;
  }
}

// src/scripts/lib/hook-enforcement-snapshot.mts
import fs12 from "fs/promises";
import path12 from "path";
var HOOK_EVENTS_RELATIVE = [".claude", "logs", "events.jsonl"];
function hookEventsLogPath(repoPath) {
  return path12.join(repoPath, ...HOOK_EVENTS_RELATIVE);
}
function emptyCounts() {
  return { warn: 0, block: 0, other: 0, total: 0 };
}
function parseEventLine(line) {
  try {
    const obj = JSON.parse(line);
    if (typeof obj !== "object" || obj === null)
      return null;
    const event = obj.event;
    if (typeof event !== "string" || event.length === 0)
      return null;
    const ts = obj.ts;
    return { event, ts: typeof ts === "string" ? ts : null };
  } catch {
    return null;
  }
}
function classify(counts, code, warnCode, blockCode) {
  counts.total += 1;
  if (code === warnCode) {
    counts.warn += 1;
  } else if (code === blockCode) {
    counts.block += 1;
  } else {
    counts.other += 1;
  }
}
async function readHookEnforcementSummary(repoPath) {
  let content;
  try {
    content = await fs12.readFile(hookEventsLogPath(repoPath), "utf8");
  } catch {
    return null;
  }
  const gateGuard = emptyCounts();
  const artifactLock = emptyCounts();
  let lastEventAt = null;
  for (const line of content.split(`
`)) {
    if (!line.trim())
      continue;
    const parsed = parseEventLine(line);
    if (parsed === null)
      continue;
    if (parsed.event.startsWith("gate-guard:")) {
      classify(gateGuard, parsed.event, "gate-guard:warned-red-gate", "gate-guard:blocked-red-gate");
    } else if (parsed.event.startsWith("artifact-lock:")) {
      classify(artifactLock, parsed.event, "artifact-lock:warned", "artifact-lock:denied");
    } else {
      continue;
    }
    if (parsed.ts !== null && (lastEventAt === null || parsed.ts > lastEventAt)) {
      lastEventAt = parsed.ts;
    }
  }
  const totalEvents = gateGuard.total + artifactLock.total;
  if (totalEvents === 0)
    return null;
  return { gateGuard, artifactLock, totalEvents, lastEventAt };
}

// src/scripts/lib/memory-snapshot.mts
var PAUSE_RATE_WINDOW = 20;
function avg(values) {
  const nums = values.filter((v) => typeof v === "number");
  if (nums.length === 0)
    return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3));
}
function median(values) {
  const nums = values.filter((v) => typeof v === "number").sort((a, b) => a - b);
  if (nums.length === 0)
    return null;
  const mid = Math.floor(nums.length / 2);
  const m = nums.length % 2 === 1 ? nums[mid] ?? 0 : ((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2;
  return Number(m.toFixed(3));
}
function parseFrontmatter2(text) {
  if (!text.startsWith("---"))
    return { fm: null, body: text };
  const end = text.indexOf(`
---`, 3);
  if (end < 0)
    return { fm: null, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([\w_]+):\s*(.*)$/);
    if (!m)
      continue;
    const raw = (m[2] ?? "").trim();
    const v = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    fm[m[1]] = v;
  }
  return { fm, body };
}
async function listCostReportFiles(repoPath, limit) {
  const costDirParts = [".claude", "artifacts", "crew", "cost"];
  const legacyDirParts = [".claude", "artifacts", "crew", "runs"];
  const dirs = [path14.join(repoPath, ...costDirParts), path14.join(repoPath, ...legacyDirParts)];
  const files = [];
  for (const dir of dirs) {
    let entries;
    try {
      entries = await fs14.readdir(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (/-cost-report-.+\.md$/.test(e))
        files.push({ dir, name: e });
    }
  }
  files.sort((a, b) => b.name.localeCompare(a.name));
  return files.slice(0, limit);
}
async function loadCostReportEntries(files) {
  const loaded = [];
  for (const { dir, name } of files) {
    const f = path14.join(dir, name);
    try {
      const text = await fs14.readFile(f, "utf8");
      const { fm } = parseFrontmatter2(text);
      if (fm)
        loaded.push({ name, fm });
    } catch {}
  }
  return loaded;
}
function resolveCostReportUsd(entry, presentNames) {
  const { name, fm } = entry;
  if (typeof fm.usd !== "number")
    return null;
  if (fm.aggregate_all === true || fm.aggregate_all === "true")
    return null;
  const sharedWith = typeof fm.shared_with === "string" ? fm.shared_with : null;
  if (!sharedWith)
    return fm.usd;
  const sharedSessionOf = typeof fm.shared_session_of === "string" ? fm.shared_session_of : null;
  if (sharedSessionOf && presentNames.has(sharedSessionOf)) {
    return null;
  }
  console.warn(`[cost-dedup] orphaned shared_with reference ${name} -> ${sharedSessionOf ?? sharedWith}: ` + "primary report not in window, counting own usd as fallback");
  return fm.usd;
}
function sliceKeyOf(fm) {
  if (typeof fm.slice === "string" && fm.slice)
    return `slice:${fm.slice}`;
  if (typeof fm.feature === "string" && typeof fm.run_title === "string" && fm.run_title) {
    return `run:${fm.feature}|${fm.run_title}`;
  }
  return null;
}
function isAggregateAllReport(fm) {
  return fm.aggregate_all === true || fm.aggregate_all === "true";
}
async function loadCostReportStats(repoPath, limit = 20) {
  const files = await listCostReportFiles(repoPath, limit);
  const loaded = await loadCostReportEntries(files);
  const presentNames = new Set(loaded.map((entry) => entry.name));
  const usdValues = [];
  let aggregateExcludedCount = 0;
  const seenSliceKeys = new Set;
  for (const entry of loaded) {
    if (isAggregateAllReport(entry.fm))
      aggregateExcludedCount += 1;
    const usd = resolveCostReportUsd(entry, presentNames);
    if (usd === null)
      continue;
    const key = sliceKeyOf(entry.fm);
    if (key !== null) {
      if (seenSliceKeys.has(key))
        continue;
      seenSliceKeys.add(key);
    }
    usdValues.push(usd);
  }
  return { values: usdValues, aggregateExcludedCount };
}
var AUTO_GENERATED_HEADER = "<!-- AUTO-GENERATED \u2014 do not edit by hand. Regenerate: bun src/scripts/loop.mts snapshot-memory --repo <path> -->";
function renderSnapshotHeader(today) {
  return [
    AUTO_GENERATED_HEADER,
    `# Autonomous Loop snapshot \u2014 ${today}`,
    "",
    "_Generated by `bun src/scripts/loop.mts snapshot-memory`. Regenerate after material state changes._",
    ""
  ];
}
function renderBacklogState(backlog, inFlight) {
  return [
    "## Backlog state",
    "",
    `- Pending: ${filterBacklog(backlog, { status: "pending" }).length}`,
    `- Triaged: ${filterBacklog(backlog, { status: "triaged" }).length}`,
    `- In-progress: ${inFlight.length}`,
    `- Done: ${filterBacklog(backlog, { status: "done" }).length}`,
    ""
  ];
}
function renderInFlight(inFlight) {
  if (inFlight.length === 0)
    return [];
  const out = ["## In-flight features", ""];
  for (const f of inFlight) {
    out.push(`- **${f.id}** (${f.frontmatter.priority || "?"}) \u2014 slices: ${(f.frontmatter.slices || []).join(", ") || "(none yet \u2014 orphan)"}`);
  }
  out.push("");
  return out;
}
function renderTriagedTop(triagedTop) {
  if (triagedTop.length === 0)
    return [];
  const out = ["## Top triaged (next to slice)", ""];
  for (const f of triagedTop) {
    out.push(`- **${f.id}** (${f.frontmatter.priority}) ${f.frontmatter.category ? `[${f.frontmatter.category}]` : ""} \u2192 ${f.frontmatter.target_release || "(release tbd)"}`);
  }
  out.push("");
  return out;
}
function renderSpecs(specs, specsByStatus) {
  const out = [
    "## Specs",
    "",
    `- Total: ${specs.length} (draft: ${specsByStatus.draft}, approved: ${specsByStatus.approved}, decomposed: ${specsByStatus.decomposed}, satisfied: ${specsByStatus.satisfied})`
  ];
  const undecomposed = specs.filter((s) => s.frontmatter.status === "approved" && (!s.frontmatter.derived_features || s.frontmatter.derived_features.length === 0));
  if (undecomposed.length > 0) {
    out.push("- \u26A0 Approved + undecomposed specs need decomposition:");
    for (const s of undecomposed) {
      out.push(`  - ${s.id} (${s.frontmatter.type}): ${s.frontmatter.title}`);
    }
  }
  out.push("");
  return out;
}
function renderGradeSignal(grades, recentScoreAverages) {
  const out = [
    "## Recent grade signal",
    "",
    `- Total grades: ${grades.length}`,
    `- Last 5 averages:`
  ];
  for (const [dim, value] of Object.entries(recentScoreAverages)) {
    const flag = value !== null && value < 0.8 ? " \u26A0" : "";
    out.push(`  - ${dim}: ${value === null ? "n/a" : value}${flag}`);
  }
  out.push("");
  return out;
}
function renderDecisions(recentDecisions) {
  const out = ["## Recent decisions", ""];
  if (recentDecisions.length === 0) {
    out.push("_(none yet)_");
  } else {
    for (const d of recentDecisions) {
      out.push(`- **${d.id}** (${d.status}) \u2014 ${d.title} _(from ${d.introduced_by_slice || "n/a"})_`);
    }
  }
  out.push("");
  return out;
}
function formatMemoryUsefulnessLine(summary) {
  if (!summary)
    return "- Memory usefulness (7d): n/a";
  const rateStr = summary.rate === null ? "n/a" : `${(summary.rate * 100).toFixed(1)}%`;
  return `- Memory usefulness (7d): served=${summary.served} used=${summary.used} rate=${rateStr}`;
}
function renderLoopTelemetry(iterationStatus, costTrajectory, pauseSummary, pauseStaleness, memoryUsefulness, aggregateExcludedCount) {
  const out = ["## Loop telemetry", ""];
  const iterCount = iterationStatus?.count ?? 0;
  const iterCap = iterationStatus?.cap ?? 25;
  out.push(`- Iteration count: ${iterCount} / ${iterCap}`);
  if (costTrajectory.avgUSD === null || costTrajectory.medianUSD === null) {
    out.push("- In-window cost trajectory: n/a");
  } else {
    out.push(`- In-window cost trajectory: median $${costTrajectory.medianUSD.toFixed(3)} / mean $${costTrajectory.avgUSD.toFixed(3)} per cost-report (${costTrajectory.count} slice-close session scans)`);
  }
  if (aggregateExcludedCount > 0) {
    out.push(`- Aggregate reports excluded from cost trajectory: ${aggregateExcludedCount}`);
  }
  if (costTrajectory.lastCostAdvisorVerdict === null) {
    out.push("- Last cost-advisor verdict: n/a");
  } else {
    out.push(`- Last cost-advisor verdict: ${costTrajectory.lastCostAdvisorVerdict}`);
  }
  const PAUSE_RATE_LABEL = "Pause rate (reviewer/validator + wave dispatches";
  if (pauseSummary.dispatches > 0) {
    if (pauseStaleness.stale) {
      const lastRecord = pauseStaleness.newestTs ? pauseStaleness.newestTs.slice(0, 10) : "unknown";
      out.push(`- ${PAUSE_RATE_LABEL}, last ${pauseSummary.dispatches}): no data (stale, last record: ${lastRecord})`);
    } else {
      out.push(`- ${PAUSE_RATE_LABEL}, last ${pauseSummary.dispatches}): ${(pauseSummary.pauseRate * 100).toFixed(1)}%`);
    }
  }
  out.push(formatMemoryUsefulnessLine(memoryUsefulness));
  out.push("");
  return out;
}
function renderHookEnforcement(summary) {
  if (!summary)
    return [];
  const { gateGuard, artifactLock, lastEventAt } = summary;
  return [
    "## Hook enforcement",
    "",
    `- gate-guard: warn=${gateGuard.warn} block=${gateGuard.block} other=${gateGuard.other}`,
    `- artifact-lock: warn=${artifactLock.warn} block=${artifactLock.block} other=${artifactLock.other}`,
    `- Last event: ${lastEventAt ?? "n/a"}`,
    ""
  ];
}
function renderUsageFooter() {
  return [
    "## How to use this file",
    "",
    "- Reference from `CLAUDE.md` via `@.claude/artifacts/loop/loop-snapshot.md` so agents pick it up at session start.",
    "- Regenerate via `bun src/scripts/loop.mts snapshot-memory --repo <path>` whenever the picture shifts materially.",
    ""
  ];
}
function renderDispatchLifecycle(dispatchTree, pruneStaleAfterDays) {
  if (dispatchTree.openRunIds.length === 0 && dispatchTree.worktreeCount === 0) {
    return [];
  }
  const out = [
    "## Dispatch lifecycle",
    "",
    `- Open runIds (${dispatchTree.openRunIds.length}): ${dispatchTree.openRunIds.length > 0 ? dispatchTree.openRunIds.join(", ") : "(none)"}`,
    `- Worktree count (open runs): ${dispatchTree.worktreeCount}`,
    `- Oldest runId age: ${dispatchTree.oldestRunAgeDays !== null ? `${dispatchTree.oldestRunAgeDays.toFixed(1)}d` : "n/a"}`
  ];
  if (dispatchTree.oldestRunAgeDays !== null && dispatchTree.oldestRunAgeDays > pruneStaleAfterDays) {
    out.push(`- Hint: run \`bun src/scripts/loop.mts dispatch prune\` to reap stale runs (>${pruneStaleAfterDays}d)`);
  }
  out.push("");
  return out;
}
async function collectSnapshotData(repoPath, config) {
  const { readDispatchTreeSnapshot: readDispatchTreeSnapshot2 } = await Promise.resolve().then(() => (init_dispatch_tree_snapshot(), exports_dispatch_tree_snapshot));
  const [
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportStats,
    dispatchTree,
    pauseSummary,
    pauseStaleness,
    memoryUsefulness,
    hookEnforcement
  ] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    listGrades(repoPath, { config }),
    listDecisions(repoPath, { config }),
    getIterationStatus(repoPath),
    loadCostReportStats(repoPath),
    readDispatchTreeSnapshot2(repoPath).catch(() => ({
      openRunIds: [],
      worktreeCount: 0,
      oldestRunAgeDays: null
    })),
    summarizePauseRate(repoPath, PAUSE_RATE_WINDOW),
    evaluatePauseTelemetryStaleness(repoPath, config),
    fetchMemoryUsefulness(repoPath, config),
    readHookEnforcementSummary(repoPath)
  ]);
  return {
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportUSDValues: costReportStats.values,
    aggregateExcludedCount: costReportStats.aggregateExcludedCount,
    dispatchTree,
    pauseSummary,
    pauseStaleness,
    memoryUsefulness,
    hookEnforcement
  };
}
function buildSnapshotLines(repoPath, data, today, pruneStaleAfterDays = 7) {
  const {
    backlog,
    specs,
    grades,
    decisions,
    iterationStatus,
    costReportUSDValues,
    aggregateExcludedCount,
    dispatchTree,
    pauseSummary,
    pauseStaleness,
    memoryUsefulness,
    hookEnforcement
  } = data;
  const inFlight = filterBacklog(backlog, { status: "in-progress" });
  const triagedTop = filterBacklog(backlog, { status: "triaged" }).filter((f) => f.frontmatter.deferred !== true).sort(comparePickOrder).slice(0, 5);
  const specsByStatus = {
    draft: specs.filter((s) => s.frontmatter.status === "draft").length,
    approved: specs.filter((s) => s.frontmatter.status === "approved").length,
    decomposed: specs.filter((s) => s.frontmatter.status === "decomposed").length,
    satisfied: specs.filter((s) => s.frontmatter.status === "satisfied").length
  };
  const recentGrades = grades.slice(-5);
  const recentScoreAverages = {};
  for (const dim of SCORE_DIMENSIONS) {
    recentScoreAverages[dim] = avg(recentGrades.map((g) => g.scores?.[dim]));
  }
  const recentDecisions = decisions.slice(-5);
  const costTrajectory = {
    avgUSD: avg(costReportUSDValues),
    medianUSD: median(costReportUSDValues),
    count: costReportUSDValues.length,
    lastCostAdvisorVerdict: null
  };
  const waveTelemetry = renderWaveTelemetry(repoPath);
  return [
    ...renderSnapshotHeader(today),
    ...renderBacklogState(backlog, inFlight),
    ...renderInFlight(inFlight),
    ...renderTriagedTop(triagedTop),
    ...renderSpecs(specs, specsByStatus),
    ...renderGradeSignal(grades, recentScoreAverages),
    ...renderDecisions(recentDecisions),
    ...renderLoopTelemetry(iterationStatus, costTrajectory, pauseSummary, pauseStaleness, memoryUsefulness, aggregateExcludedCount),
    ...renderHookEnforcement(hookEnforcement),
    ...renderDispatchLifecycle(dispatchTree, pruneStaleAfterDays),
    ...waveTelemetry ? [waveTelemetry] : [],
    ...renderUsageFooter()
  ];
}
async function generateSnapshotContent(repoPath, { config = null, today } = {}) {
  const data = await collectSnapshotData(repoPath, config);
  const date = today ?? new Date().toISOString().slice(0, 10);
  const pruneStaleAfterDays = config?.loop?.dispatch?.pruneStaleAfterDays ?? 7;
  return buildSnapshotLines(repoPath, data, date, pruneStaleAfterDays).join(`
`);
}
function renderWaveTelemetry(repoRoot) {
  const indexPath = path14.join(repoRoot, ".claude/artifacts/loop/waves/index.json");
  if (!existsSync3(indexPath))
    return "";
  const idx = JSON.parse(readFileSync3(indexPath, "utf8"));
  if (idx.entries.length === 0)
    return "";
  const last = idx.entries[idx.entries.length - 1];
  const last10 = idx.entries.slice(-10);
  const sumPass = last10.reduce((s, e) => s + e.passCount, 0);
  const sumSize = last10.reduce((s, e) => s + e.size, 0);
  const passRate = sumPass / Math.max(1, sumSize);
  const widthText = last.waveSize === undefined ? `size=${last.size}` : `packed ${last.size}/${last.waveSize}`;
  const lines = [
    "## Wave telemetry",
    "",
    `- Last wave: ${last.waveId} (${widthText}, PASS=${last.passCount}, FAIL=${last.failCount})`,
    `- Recent ${last10.length} waves: avg PASS rate ${passRate.toFixed(2)}`
  ];
  if (last.rejectedConflict !== undefined || last.rejectedMissingConfidence !== undefined || last.rejectedOther !== undefined) {
    const conflict = last.rejectedConflict ?? 0;
    const missing = last.rejectedMissingConfidence ?? 0;
    const other = last.rejectedOther ?? 0;
    const total = conflict + missing + other;
    const otherPart = other > 0 ? `, other=${other}` : "";
    lines.push(`- Last wave rejections: ${total} (conflict=${conflict}, missing-confidence=${missing}${otherPart})`);
  }
  lines.push("");
  return lines.join(`
`);
}

// src/scripts/validate-snapshot-freshness.mts
var REGENERATE_HINT = "Run: bun src/scripts/loop.mts snapshot-memory --repo <path>";
function extractHeaderDate(onDisk) {
  const m = onDisk.match(/^# Autonomous Loop snapshot \u2014 (\d{4}-\d{2}-\d{2})/m);
  return m?.[1] ?? null;
}
function stripVolatileSections(text) {
  const out = [];
  let skipping = false;
  for (const line of text.split(`
`)) {
    if (line.startsWith("- Memory usefulness (7d):"))
      continue;
    if (line === "## Dispatch lifecycle") {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (line.startsWith("## "))
        skipping = false;
      else
        continue;
    }
    out.push(line);
  }
  return out.join(`
`);
}
async function validateSnapshotFreshness(repoRoot, opts = {}) {
  const config = opts.config ?? null;
  const target = snapshotPath(repoRoot, config);
  let onDisk;
  try {
    onDisk = await fs15.readFile(target, "utf8");
  } catch {
    return { ok: false, errors: [`loop-snapshot.md not found at ${target}. ${REGENERATE_HINT}`] };
  }
  const today = opts.today ?? extractHeaderDate(onDisk) ?? new Date().toISOString().slice(0, 10);
  const expected = await generateSnapshotContent(repoRoot, { config, today });
  if (stripVolatileSections(onDisk) === stripVolatileSections(expected)) {
    return { ok: true, errors: [] };
  }
  return {
    ok: false,
    errors: [
      `loop-snapshot.md is out of date at ${target} \u2014 regenerated content does not match the on-disk file.`,
      REGENERATE_HINT
    ]
  };
}
if (false) {}

// hooks/pre-push-gate.mts
var CACHE_WINDOW_MS = 60 * 60 * 1000;
var scriptDir2 = path15.dirname(fileURLToPath2(import.meta.url));
var srcScriptsDir = process.env["CLAUDE_PLUGIN_ROOT"] ? path15.join(process.env["CLAUDE_PLUGIN_ROOT"], "src", "scripts") : path15.join(scriptDir2, "..", "src", "scripts");
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
function parseInput(raw) {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj["session_id"] === "string" && typeof obj["cwd"] === "string" && typeof obj["tool_input"] === "object" && obj["tool_input"] !== null && typeof obj["tool_input"]["command"] === "string") {
      return {
        sessionId: obj["session_id"],
        command: obj["tool_input"]["command"],
        cwd: obj["cwd"]
      };
    }
    return null;
  } catch {
    return null;
  }
}
function isPushCommand(command) {
  const trimmed = command.trim();
  return /\bgit\s+push\b/.test(trimmed) || /\bgh\s+pr\s+create\b/.test(trimmed);
}
function isCommitCommand(command) {
  return /\bgit\s+commit\b/.test(command.trim());
}
function resolveCommandCwd(command, sessionCwd) {
  const cdMatch = command.match(/^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
  if (!cdMatch)
    return sessionCwd;
  const rawTarget = (cdMatch[1] ?? "").replace(/^["']|["']$/g, "");
  if (rawTarget === "")
    return sessionCwd;
  return path15.isAbsolute(rawTarget) ? rawTarget : path15.resolve(sessionCwd, rawTarget);
}
function resolveGitWorktreeRoot(dir) {
  try {
    const result = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result.status === 0 && result.stdout.trim() !== "") {
      return result.stdout.trim();
    }
  } catch {}
  return dir;
}
function resolveTargetRepoRoot(command, sessionCwd) {
  return resolveGitWorktreeRoot(resolveCommandCwd(command, sessionCwd));
}
async function isVerifyDisabledInDeployment(repoPath) {
  try {
    const content = await fs16.readFile(path15.join(repoPath, ".claude", "crew", "deployment.md"), "utf8");
    return /push\.verify:\s*false\b/i.test(content);
  } catch {
    return false;
  }
}
function resolveDecisionFromArtifactContent(content) {
  const fm = parseFrontmatterBlock(content);
  if (fm["decision"]) {
    const decision2 = fm["decision"].toLowerCase();
    return { decision: decision2, isPass: decision2 === "pass" };
  }
  const decisionMatch = content.match(/^[-\s]*Decision:\s*(\w+)/im);
  const decision = (decisionMatch?.[1] ?? "").toLowerCase() || null;
  return { decision, isPass: decision === "passed" || decision === "approved" };
}
async function scanValidationArtifacts(repoPath) {
  const validationsDir = path15.join(repoPath, ".claude", "artifacts", "crew", "validations");
  const cutoffMs = Date.now() - CACHE_WINDOW_MS;
  let entries;
  try {
    entries = await fs16.readdir(validationsDir, { withFileTypes: true });
  } catch {
    return {
      hasPassed: false,
      scannedDir: validationsDir,
      windowFileCount: 0,
      newestArtifactPath: null,
      newestDecision: null
    };
  }
  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => path15.join(validationsDir, e.name));
  mdFiles.sort((a, b) => b.localeCompare(a));
  let windowFileCount = 0;
  let newestArtifactPath = null;
  let newestDecision = null;
  for (const filePath of mdFiles) {
    let stat;
    try {
      stat = await fs16.stat(filePath);
    } catch {
      continue;
    }
    if (stat.mtimeMs < cutoffMs)
      continue;
    windowFileCount++;
    let content;
    try {
      content = await fs16.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    const { decision, isPass } = resolveDecisionFromArtifactContent(content);
    if (newestArtifactPath === null) {
      newestArtifactPath = filePath;
      newestDecision = decision;
    }
    if (isPass) {
      return {
        hasPassed: true,
        scannedDir: validationsDir,
        windowFileCount,
        newestArtifactPath: filePath,
        newestDecision: decision
      };
    }
    continue;
  }
  return {
    hasPassed: false,
    scannedDir: validationsDir,
    windowFileCount,
    newestArtifactPath,
    newestDecision
  };
}
async function runSoftChecks(command, repoRoot) {
  const isPush = isPushCommand(command);
  const isCommit = isCommitCommand(command);
  if (!isPush && !isCommit)
    return null;
  try {
    execFileSync("bun", [path15.join(srcScriptsDir, "validate-manifests.mts")], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    if (isPush) {
      execFileSync("bun", [path15.join(srcScriptsDir, "validate-content-length.mts")], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      execFileSync("bun", ["run", "format:check"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      const freshness = await validateSnapshotFreshness(repoRoot).catch(() => ({
        ok: true,
        errors: []
      }));
      if (!freshness.ok) {
        return `snapshot-freshness drift:
${freshness.errors.map((e) => `  ${e}`).join(`
`)}`;
      }
    }
    return null;
  } catch (e) {
    const err = e;
    const detail = (err.stderr || err.message || "unknown").toString().trim();
    return detail;
  }
}
async function runBlockingPushVerify(command, repoRoot) {
  if (process.env["CREW_PUSH_VERIFY"] === "0")
    return null;
  if (!isPushCommand(command))
    return null;
  const config = await readCrewConfig(repoRoot);
  if (!isEnabled("push-verify", config))
    return null;
  if (await isVerifyDisabledInDeployment(repoRoot))
    return null;
  const scan = await scanValidationArtifacts(repoRoot);
  if (scan.hasPassed)
    return null;
  if (await isDocsOnlyPush(repoRoot)) {
    process.stderr.write("[devcrew:pre-push-gate] docs-only push \u2014 validation skipped " + `(no runtime surface; #163 quick-win lane).
`);
    return null;
  }
  const artifactHint = scan.windowFileCount === 0 ? `
  Scanned: ${scan.scannedDir}` + `
  No validation artifacts (*.md) found within the last hour.` : `
  Scanned: ${scan.scannedDir}` + `
  ${scan.windowFileCount} validation artifact(s) found within the last hour.` + `
  Newest artifact (decision=${scan.newestDecision ?? "unparsed"}): ${scan.newestArtifactPath}`;
  return `[devcrew:pre-push-gate] Push blocked \u2014 no PASS validation within the last hour.` + artifactHint + `
  Note: this blocks the ENTIRE command as submitted, including any` + `
  non-push steps chained before/after it (e.g. \`cp x && git push\` blocks the cp too).` + `
  Run /devcrew:ship (dispatches devcrew:verifier + QA before pushing) or` + `
  dispatch devcrew:verifier manually, then retry the push.` + `
  To disable this gate: set features["push-verify"].enabled=false in .claude/crew.json` + `
  or run \`! CREW_PUSH_VERIFY=0 git push\` directly in your terminal.`;
}
async function main() {
  const raw = await readStdin();
  const input = parseInput(raw);
  if (input === null)
    return;
  if (!isPushCommand(input.command) && !isCommitCommand(input.command))
    return;
  const repoRoot = resolveTargetRepoRoot(input.command, input.cwd);
  const [softWarning, blockReason] = await Promise.all([
    runSoftChecks(input.command, repoRoot),
    runBlockingPushVerify(input.command, repoRoot)
  ]);
  if (blockReason !== null) {
    const message = softWarning ? `${blockReason}

  Additional (non-blocking) check output:
${softWarning}` : blockReason;
    process.stderr.write(message + `
`);
    process.stdout.write(JSON.stringify({ decision: "block", reason: message }) + `
`);
    return;
  }
  if (softWarning !== null) {
    const systemMessage = `devcrew pre-push validation warning (soft block \u2014 command proceeds, CI will enforce):
${softWarning}`;
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true, systemMessage }) + `
`);
  }
}
main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-push-gate", err);
  process.exit(0);
});
