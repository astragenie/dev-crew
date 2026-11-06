#!/usr/bin/env node
// @bun
var __defProp = Object.defineProperty;
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
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
var __require = import.meta.require;

// crew/scripts/lib/dispatch-timing-reader.mts
import fs from "fs/promises";
async function aggregateDispatchTiming(logPath, runId) {
  const empty = { rowCount: 0, totalWallMs: 0, topSlow: [], topTokens: [] };
  let raw = "";
  try {
    raw = await fs.readFile(logPath, "utf-8");
  } catch {
    return empty;
  }
  const rows = raw.split(`
`).filter(Boolean).flatMap((line) => {
    try {
      const parsed = JSON.parse(line);
      return parsed.runId === runId ? [parsed] : [];
    } catch {
      return [];
    }
  });
  const totalWallMs = rows.reduce((s, r) => s + (r.wallMs ?? 0), 0);
  const topSlow = [...rows].sort((a, b) => (b.wallMs ?? 0) - (a.wallMs ?? 0)).slice(0, 3);
  const topTokens = rows.map((r) => ({ ...r, totalTokens: (r.tokenIn ?? 0) + (r.tokenOut ?? 0) })).sort((a, b) => b.totalTokens - a.totalTokens).slice(0, 3);
  return { rowCount: rows.length, totalWallMs, topSlow, topTokens };
}
async function aggregateBashGates(logPath) {
  const empty = { rowCount: 0, totalMs: 0, timeoutCount: 0, byGate: {} };
  let raw = "";
  try {
    raw = await fs.readFile(logPath, "utf-8");
  } catch {
    return empty;
  }
  const rows = raw.split(`
`).filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const byGate = {};
  let totalMs = 0;
  let timeoutCount = 0;
  for (const r of rows) {
    totalMs += r.durationMs ?? 0;
    byGate[r.gate] = (byGate[r.gate] ?? 0) + (r.durationMs ?? 0);
    if (r.exitCode === 124)
      timeoutCount += 1;
  }
  return { rowCount: rows.length, totalMs, timeoutCount, byGate };
}
async function readRecentDispatchRows(logPath, limit) {
  let raw = "";
  try {
    raw = await fs.readFile(logPath, "utf-8");
  } catch {
    return [];
  }
  const rows = raw.split(`
`).filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  return limit > 0 ? rows.slice(-limit) : rows;
}
async function getLatestRunId(logPath) {
  let raw = "";
  try {
    raw = await fs.readFile(logPath, "utf-8");
  } catch {
    return;
  }
  const lines = raw.split(`
`).filter(Boolean);
  for (let i = lines.length - 1;i >= 0; i--) {
    const line = lines[i];
    if (!line)
      continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.runId)
        return parsed.runId;
    } catch {}
  }
  return;
}
function fmtTool(toolCalls, name) {
  return toolCalls?.[name] ?? 0;
}
function renderDispatchTable(rows) {
  if (rows.length === 0)
    return ["_(no data)_", ""];
  const lines = [
    "| Agent | Model | wallMs | Read | Edit | Bash | Skills |",
    "|-------|-------|--------|------|------|------|--------|"
  ];
  for (const r of rows) {
    lines.push(`| ${r.agent} | ${r.model ?? "-"} | ${r.wallMs} | ${fmtTool(r.toolCalls, "Read")} | ${fmtTool(r.toolCalls, "Edit")} | ${fmtTool(r.toolCalls, "Bash")} | ${r.skillLoadCount ?? 0} |`);
  }
  lines.push("");
  return lines;
}
function renderTokenTable(rows) {
  if (rows.length === 0)
    return ["_(no data)_", ""];
  const lines = [
    "| Agent | tokenIn | tokenOut | total |",
    "|-------|---------|----------|-------|"
  ];
  for (const r of rows) {
    lines.push(`| ${r.agent} | ${r.tokenIn} | ${r.tokenOut} | ${r.totalTokens} |`);
  }
  lines.push("");
  return lines;
}
function renderGateTable(byGate) {
  const entries = Object.entries(byGate).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0)
    return ["_(no data)_", ""];
  const lines = ["| Gate | Total ms |", "|------|----------|"];
  for (const [gate, ms] of entries) {
    lines.push(`| ${gate} | ${ms} |`);
  }
  lines.push("");
  return lines;
}
function renderDispatchBreakdownSection(dispatch, gates) {
  const hasDispatch = dispatch.rowCount > 0;
  const hasGates = gates.rowCount > 0;
  if (!hasDispatch && !hasGates)
    return "";
  const lines = ["", "## Per-dispatch breakdown", ""];
  if (hasDispatch) {
    lines.push(`- Total wall-clock: ${dispatch.totalWallMs}ms (${dispatch.rowCount} dispatches)`, "");
  } else {
    lines.push("- Total wall-clock: 0ms (0 dispatches)", "");
  }
  lines.push("### Top-3 slowest dispatches", "");
  lines.push(...renderDispatchTable(dispatch.topSlow));
  lines.push("### Top-3 token-heaviest dispatches", "");
  lines.push(...renderTokenTable(dispatch.topTokens));
  lines.push("### Bash gate breakdown", "");
  if (hasGates) {
    lines.push(`- Total: ${gates.totalMs}ms (${gates.rowCount} gate invocations, ${gates.timeoutCount} timeouts)`, "");
  } else {
    lines.push("- Total: 0ms (0 gate invocations, 0 timeouts)", "");
  }
  lines.push(...renderGateTable(gates.byGate));
  return lines.join(`
`);
}
var init_dispatch_timing_reader = () => {};

// crew/scripts/lib/agent-stats-aggregator.mts
var exports_agent_stats_aggregator = {};
__export(exports_agent_stats_aggregator, {
  writeAgentStatsArtifact: () => writeAgentStatsArtifact,
  windowSlug: () => windowSlug,
  aggregateAgentStats: () => aggregateAgentStats
});
import fs3 from "fs/promises";
import path2 from "path";
async function readJsonlFile(filePath) {
  let raw = "";
  try {
    raw = await fs3.readFile(filePath, "utf-8");
  } catch {
    return [];
  }
  return raw.split(`
`).filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}
function extractFm(md) {
  return /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? null;
}
function parseKv(line) {
  const m = /^(\w+):\s*(.+)$/.exec(line);
  const k = m?.[1];
  const v = m?.[2];
  return k && v !== undefined ? [k, v.replace(/^["']|["']$/g, "")] : null;
}
function parseScore(line) {
  const m = /^\s{2}(\w+):\s*([\d.]+)/.exec(line);
  const k = m?.[1];
  const v = m?.[2];
  return k && v ? [k, parseFloat(v)] : null;
}
function processFmLine(line, result, scoreMap, inS) {
  if (line.startsWith("scores:"))
    return true;
  if (inS) {
    const s = parseScore(line);
    if (s) {
      scoreMap[s[0]] = s[1];
      return true;
    }
    return false;
  }
  const kv = parseKv(line);
  if (kv)
    result[kv[0]] = kv[1];
  return false;
}
function parseFm(md) {
  const body = extractFm(md);
  if (!body)
    return null;
  const result = {};
  const scoreMap = {};
  let inS = false;
  for (const line of body.split(`
`))
    inS = processFmLine(line, result, scoreMap, inS);
  if (Object.keys(scoreMap).length > 0)
    result["scores"] = scoreMap;
  return result;
}
async function loadGrades(repo) {
  const dir = path2.join(repo, ".claude", "artifacts", "loop", "grades");
  let entries = [];
  try {
    entries = await fs3.readdir(dir);
  } catch {
    return [];
  }
  const grades = [];
  for (const e of entries) {
    if (!e.endsWith(".md"))
      continue;
    let c = "";
    try {
      c = await fs3.readFile(path2.join(dir, e), "utf-8");
    } catch {
      continue;
    }
    const g = parseFm(c);
    if (g?.["slice"] && g?.["graded_at"] && (g["scores"] === undefined || typeof g["scores"] === "object" && g["scores"] !== null)) {
      grades.push(g);
    }
  }
  return grades;
}
function avgScores(s) {
  if (!s)
    return 0;
  const v = Object.values(s);
  return v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
}
function fmDecision(body) {
  for (const line of body.split(`
`)) {
    const m = /^verdict:\s*(.+)$/i.exec(line);
    if (m?.[1])
      return m[1].trim();
    const m2 = /^decision:\s*(.+)$/i.exec(line);
    if (m2?.[1])
      return m2[1].trim();
  }
  return null;
}
function parseAD(content) {
  const body = extractFm(content);
  const dec = (body ? fmDecision(body) : null) ?? /^-\s*Decision:\s*(.+)$/im.exec(content)?.[1]?.trim() ?? "";
  const sliceId = body ? /^slice:\s*(.+)$/.exec(body.split(`
`).find((l) => /^slice:/.test(l)) ?? "")?.[1]?.trim() ?? null : null;
  return { slice: sliceId, decision: dec };
}
async function scanArtifacts(dir) {
  let entries = [];
  try {
    entries = await fs3.readdir(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.endsWith(".md"))
      continue;
    let c = "";
    try {
      c = await fs3.readFile(path2.join(dir, e), "utf-8");
    } catch {
      continue;
    }
    out.push(parseAD(c));
  }
  return out;
}
function windowSlug(w) {
  return `${w.kind}_${w.n}`;
}
function selectWindow(grades, w) {
  return new Set([...grades].sort((a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime()).slice(0, w.n).map((g) => g.slice));
}
function median(arr) {
  if (!arr.length)
    return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] ?? 0 : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}
function computeRow(agent, rows, w, grades, rework, fail) {
  const slices = new Set(rows.map((r) => r.sliceId).filter((s) => s != null));
  const n = rows.length;
  const sn = slices.size;
  const passCount = [...slices].filter((s) => (grades.get(s) ?? 0) >= 0.7).length;
  const round3 = (x) => Math.round(x * 1000) / 1000;
  return {
    agent,
    window: windowSlug(w),
    sample_count: n,
    pass_rate: round3(sn > 0 ? passCount / sn : 0),
    mean_wall_ms: Math.round(n > 0 ? rows.reduce((a, r) => a + (r.wallMs ?? 0), 0) / n : 0),
    mean_tokens: Math.round(n > 0 ? rows.reduce((a, r) => a + (r.tokenIn ?? 0) + (r.tokenOut ?? 0), 0) / n : 0),
    review_rework_rate: round3(sn > 0 ? [...slices].filter((s) => rework.has(s)).length / sn : 0),
    validation_fail_rate: round3(sn > 0 ? [...slices].filter((s) => fail.has(s)).length / sn : 0),
    median_dispatches_to_pass: median([...slices].map((s) => rows.filter((r) => r.sliceId === s).length))
  };
}
function hasSlice(a) {
  return a.slice !== null;
}
function decisionSet(ads, ws, re) {
  return new Set(ads.filter(hasSlice).filter((a) => ws.has(a.slice) && re.test(a.decision)).map((a) => a.slice));
}
function groupRows(rows) {
  const m = new Map;
  for (const r of rows) {
    const ex = m.get(r.agent);
    if (ex)
      ex.push(r);
    else
      m.set(r.agent, [r]);
  }
  return m;
}
async function aggregateAgentStats(opts) {
  const { window: w, agents } = opts;
  const grades = opts.grades ?? await loadGrades(opts.repo);
  const ws = selectWindow(grades, w);
  if (!ws.size)
    return [];
  const gradeMap = new Map(grades.filter((g) => ws.has(g.slice)).map((g) => [g.slice, avgScores(g.scores)]));
  const [allRows, revs, vals] = await Promise.all([
    readJsonlFile(opts.dispatchTimingPath ?? path2.join(opts.repo, ".claude", "logs", "dispatch-timing.jsonl")),
    scanArtifacts(opts.reviewsDir ?? path2.join(opts.repo, ".claude", "artifacts", "crew", "reviews")),
    scanArtifacts(opts.validationsDir ?? path2.join(opts.repo, ".claude", "artifacts", "crew", "validations"))
  ]);
  const byAgent = groupRows(allRows.filter((r) => r.sliceId != null && ws.has(r.sliceId)));
  const rework = decisionSet(revs, ws, /\b(needs.?fix|rejected)\b/i);
  const fail = decisionSet(vals, ws, /\bfail/i);
  const af = agents?.length ? new Set(agents) : null;
  const out = [];
  for (const [a, ar] of byAgent) {
    if (!af || af.has(a))
      out.push(computeRow(a, ar, w, gradeMap, rework, fail));
  }
  return out.sort((a, b) => a.agent.localeCompare(b.agent));
}
async function writeAgentStatsArtifact(repo, rows, window) {
  const dir = path2.join(repo, ".claude", "artifacts", "crew", "agent-stats");
  await fs3.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const fp = path2.join(dir, `${stamp}-agent-stats-${windowSlug(window)}.json`);
  await fs3.writeFile(fp, JSON.stringify({ generated_at: new Date().toISOString(), window: { kind: window.kind, n: window.n }, rows }, null, 2) + `
`);
  return fp;
}
var init_agent_stats_aggregator = () => {};

// crew/scripts/lib/workflow-state-gates.mts
function nowIso() {
  return new Date().toISOString();
}
function makeDefaultGates() {
  return {
    review: null,
    validation: null,
    deployment: { dev: null, prod: null },
    blocked: null,
    escalation: null,
    incident: null,
    help: null
  };
}
function makeDefaultArtifacts() {
  return {
    runBrief: null,
    handoffs: [],
    reviewResult: null,
    validationPlan: null,
    validationResult: null,
    deploymentChecks: { dev: null, prod: null },
    finalSynthesis: null
  };
}
function archiveRun(state, run) {
  if (!run) {
    return;
  }
  const archived = {
    title: run.title,
    goal: run.goal || "",
    mode: run.mode || "",
    status: run.status || "completed",
    startedAt: run.startedAt || run.updatedAt || nowIso(),
    updatedAt: run.updatedAt || nowIso(),
    completedAt: run.completedAt || run.updatedAt || nowIso(),
    next: run.next || "",
    gates: run.gates || makeDefaultGates(),
    artifacts: run.artifacts || makeDefaultArtifacts()
  };
  state.recentRuns = [archived, ...state.recentRuns || []].slice(0, MAX_RECENT_RUNS);
}
function createRun(fields = {}) {
  return {
    title: fields.title || "Workflow Run",
    goal: fields.goal || "",
    mode: fields.mode || "",
    status: fields.status || "active",
    startedAt: nowIso(),
    updatedAt: nowIso(),
    next: fields.next || "",
    gates: makeDefaultGates(),
    artifacts: {
      runBrief: fields.path ?? null,
      handoffs: [],
      reviewResult: null,
      validationPlan: null,
      validationResult: null,
      deploymentChecks: { dev: null, prod: null },
      finalSynthesis: null
    }
  };
}
function hasAnyWorkflowGate(run) {
  return Boolean(run?.gates?.review || run?.gates?.validation || run?.gates?.deployment?.dev || run?.gates?.deployment?.prod);
}
function hasPendingGates(run) {
  return PENDING_GATE_CHECKS.some((check) => check(run));
}
function hasReviewOrValidationArtifact(artifacts) {
  return Boolean(artifacts?.handoffs?.length || artifacts?.reviewResult || artifacts?.validationPlan || artifacts?.validationResult || artifacts?.deploymentChecks?.dev || artifacts?.deploymentChecks?.prod);
}
function hasSubstantialArtifact(artifacts) {
  return Boolean(artifacts?.handoffs?.length || artifacts?.validationPlan || artifacts?.validationResult || artifacts?.deploymentChecks?.dev || artifacts?.deploymentChecks?.prod);
}
function hasSubstantialGate(gates) {
  return Boolean(gates?.validation || gates?.deployment?.dev || gates?.deployment?.prod);
}
function hasSubstantialMode(mode) {
  return mode === "assisted single-session" || mode === "team run";
}
function hasMeaningfulProgress(run) {
  if (!run)
    return false;
  return Boolean(hasAnyWorkflowGate(run) || hasReviewOrValidationArtifact(run.artifacts) || run.next);
}
function isSubstantialRunHint(run) {
  if (!run)
    return false;
  return Boolean(hasSubstantialMode(run.mode) || hasSubstantialArtifact(run.artifacts) || hasSubstantialGate(run.gates));
}
function isGateResolved(status) {
  return Boolean(status) && RESOLVED_GATE_STATUSES.has(status);
}
function hasCompletedPhaseEvidence(run) {
  if (!run)
    return false;
  const gates = run.gates || makeDefaultGates();
  const artifacts = run.artifacts || makeDefaultArtifacts();
  const anyGateResolved = GATE_STATUS_GETTERS.some((get) => isGateResolved(get(gates)));
  const anyArtifactWritten = PHASE_ARTIFACT_GETTERS.some((get) => Boolean(get(artifacts)));
  return anyGateResolved || anyArtifactWritten;
}
function isDecided(status) {
  return status === "passed" || status === "failed";
}
function summarizeMissingArtifactWritesForRun(run) {
  if (!run)
    return [];
  const gates = run.gates || makeDefaultGates();
  const artifacts = run.artifacts || makeDefaultArtifacts();
  const missing = MISSING_WRITE_SPECS.filter((spec) => isDecided(spec.gate(gates)) && !spec.artifact(artifacts)).map((spec) => spec.code);
  const substantialRun = isSubstantialRunHint(run);
  if (substantialRun && hasMeaningfulProgress(run) && !artifacts.runBrief) {
    missing.push("run_brief_missing");
  }
  if (substantialRun && hasCompletedPhaseEvidence(run) && !hasPendingGates(run) && !artifacts.finalSynthesis) {
    missing.push("final_synthesis_missing");
  }
  return missing;
}
var MAX_RECENT_RUNS = 5, PENDING_GATE_CHECKS, RESOLVED_GATE_STATUSES, GATE_STATUS_GETTERS, PHASE_ARTIFACT_GETTERS, MISSING_WRITE_SPECS;
var init_workflow_state_gates = __esm(() => {
  PENDING_GATE_CHECKS = [
    (run) => run?.gates?.review?.status === "required",
    (run) => run?.gates?.validation?.status === "expected",
    (run) => run?.gates?.deployment?.dev?.status === "expected",
    (run) => run?.gates?.deployment?.prod?.status === "expected",
    (run) => run?.gates?.blocked?.status === "blocked",
    (run) => run?.gates?.escalation?.status === "escalated",
    (run) => run?.gates?.help?.status === "requested"
  ];
  RESOLVED_GATE_STATUSES = new Set(["passed", "failed", "skipped"]);
  GATE_STATUS_GETTERS = [
    (gates) => gates.review?.status,
    (gates) => gates.validation?.status,
    (gates) => gates.deployment?.dev?.status,
    (gates) => gates.deployment?.prod?.status
  ];
  PHASE_ARTIFACT_GETTERS = [
    (artifacts) => artifacts.reviewResult,
    (artifacts) => artifacts.validationResult,
    (artifacts) => artifacts.deploymentChecks?.dev,
    (artifacts) => artifacts.deploymentChecks?.prod
  ];
  MISSING_WRITE_SPECS = [
    {
      code: "review_result_missing",
      gate: (g) => g.review?.status,
      artifact: (a) => a.reviewResult
    },
    {
      code: "validation_result_missing",
      gate: (g) => g.validation?.status,
      artifact: (a) => a.validationResult
    },
    {
      code: "dev_deployment_check_missing",
      gate: (g) => g.deployment?.dev?.status,
      artifact: (a) => a.deploymentChecks?.dev
    },
    {
      code: "prod_deployment_check_missing",
      gate: (g) => g.deployment?.prod?.status,
      artifact: (a) => a.deploymentChecks?.prod
    }
  ];
});

// crew/scripts/lib/fs-utils.mts
import fs4 from "fs/promises";
async function pathExists(p) {
  return fs4.access(p).then(() => true, () => false);
}
async function readFileIfExists(filePath) {
  try {
    return await fs4.readFile(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT")
      return null;
    throw err;
  }
}
function normalizeMsysPath(value) {
  if (!value || process.platform !== "win32") {
    return value;
  }
  const match = value.match(/^\/([a-zA-Z])\/(.*)$/);
  if (!match) {
    return value;
  }
  return `${(match[1] ?? "").toUpperCase()}:/${match[2] ?? ""}`;
}
var init_fs_utils = () => {};

// ../../../crew/node_modules/@astragenie/plugin-std/dist/errors.js
var PluginError, DeterministicError, TransientError;
var init_errors = __esm(() => {
  PluginError = class PluginError extends Error {
    transient = false;
    status;
    constructor(message, ctx) {
      super(message, ctx?.cause !== undefined ? { cause: ctx.cause } : undefined);
      this.status = ctx?.status;
      Object.setPrototypeOf(this, new.target.prototype);
    }
  };
  DeterministicError = class DeterministicError extends PluginError {
    transient = false;
    code;
    constructor(message, ctx) {
      super(message, ctx);
      this.name = "DeterministicError";
      this.code = ctx?.code ?? "E_DETERMINISTIC";
    }
  };
  TransientError = class TransientError extends PluginError {
    transient = true;
    code;
    constructor(message, ctx) {
      super(message, ctx);
      this.name = "TransientError";
      this.code = ctx?.code ?? "E_TRANSIENT";
    }
  };
});

// ../../../crew/node_modules/@astragenie/plugin-std/dist/result.js
var ok = (value) => ({ ok: true, value }), err = (error) => ({ ok: false, error });

// ../../../crew/node_modules/@astragenie/plugin-std/dist/jsonl.js
import { appendFile, mkdir, readFile, rename, stat } from "fs/promises";
import { dirname } from "path";
function isEnoent(cause) {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT";
}
function serializeLines(records) {
  try {
    return records.map((record) => `${JSON.stringify(record)}
`).join("");
  } catch (cause) {
    throw new DeterministicError("jsonl: record is not JSON-serializable", {
      code: "E_JSONL_SERIALIZE",
      cause
    });
  }
}
async function writeLines(path3, lines) {
  try {
    await mkdir(dirname(path3), { recursive: true });
    await appendFile(path3, lines, "utf8");
  } catch (cause) {
    throw new TransientError(`jsonl: append failed for ${path3}`, {
      code: "E_JSONL_WRITE",
      cause
    });
  }
}
async function append(path3, record) {
  await writeLines(path3, serializeLines([record]));
}
async function readSafe(path3, parse = (raw) => JSON.parse(raw)) {
  let raw;
  try {
    raw = await readFile(path3, "utf8");
  } catch (cause) {
    if (isEnoent(cause))
      return { records: [], skipped: 0 };
    throw new TransientError(`jsonl: read failed for ${path3}`, { code: "E_JSONL_READ", cause });
  }
  const records = [];
  let skipped = 0;
  for (const line of raw.split(`
`)) {
    const trimmed = line.trim();
    if (trimmed.length === 0)
      continue;
    try {
      records.push(parse(trimmed));
    } catch {
      skipped++;
    }
  }
  return { records, skipped };
}
var init_jsonl = __esm(() => {
  init_errors();
});

// ../../../crew/node_modules/@astragenie/plugin-std/dist/http.js
var init_http = __esm(() => {
  init_errors();
});

// ../../../crew/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS((exports) => {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// ../../../crew/node_modules/yaml/dist/visit.js
var require_visit = __commonJS((exports) => {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path3) {
    const ctrl = callVisitor(key, node, visitor, path3);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path3, ctrl);
      return visit_(key, ctrl, visitor, path3);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path3 = Object.freeze(path3.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path3);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path3 = Object.freeze(path3.concat(node));
        const ck = visit_("key", node.key, visitor, path3);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path3);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path3) {
    const ctrl = await callVisitor(key, node, visitor, path3);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path3, ctrl);
      return visitAsync_(key, ctrl, visitor, path3);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path3 = Object.freeze(path3.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path3);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path3 = Object.freeze(path3.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path3);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path3);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path3) {
    if (typeof visitor === "function")
      return visitor(key, node, path3);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path3);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path3);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path3);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path3);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path3);
    return;
  }
  function replaceNode(key, path3, node) {
    const parent = path3[path3.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// ../../../crew/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// ../../../crew/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1;; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// ../../../crew/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS((exports) => {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length;i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver(reviver, val, String(i), v0);
          if (v1 === undefined)
            delete val[i];
          else if (v1 !== v0)
            val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            val.delete(k);
          else if (v1 !== v0)
            val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            delete val[k];
          else if (v1 !== v0)
            val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// ../../../crew/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS((exports) => {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res2) => {
        data.res = res2;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// ../../../crew/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS((exports) => {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// ../../../crew/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS((exports) => {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const { anchors: anchors2, doc, maxAliasCount } = ctx;
      const source = this.resolve(doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      let data = anchors2.get(source);
      if (!data) {
        toJS.toJS(source, null, ctx);
        data = anchors2.get(source);
      }
      if (data?.res === undefined) {
        const msg = "This should not happen: Alias anchor was not resolved?";
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc, source, anchors2);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
      return data.res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors2) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors2 && source && anchors2.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors2);
        if (c > count)
          count = c;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors2);
      const vc = getAliasCount(doc, node.value, anchors2);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// ../../../crew/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// ../../../crew/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node2 = new Scalar.Scalar(value);
        if (ref)
          ref.node = node2;
        return node2;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// ../../../crew/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS((exports) => {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path3, value) {
    let v = value;
    for (let i = path3.length - 1;i >= 0; --i) {
      const k = path3[i];
      if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = new Map([[k, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path3) => path3 == null || typeof path3 === "object" && !!path3[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path3, value) {
      if (isEmptyPath(path3))
        this.add(value);
      else {
        const [key, ...rest] = path3;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path3) {
      const [key, ...rest] = path3;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path3, keepScalar) {
      const [key, ...rest] = path3;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n = node.value;
        return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    hasIn(path3) {
      const [key, ...rest] = path3;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path3, value) {
      const [key, ...rest] = path3;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS((exports) => {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// ../../../crew/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS((exports) => {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1)
        end = i + endStep;
    }
    for (let ch;ch = text[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i;
        switch (text[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i += 1];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i2 = 0;i2 < folds.length; ++i2) {
      const fold = folds[i2];
      const end2 = folds[i2 + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end2)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end2)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== `
`);
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i = 0, start = 0;i < strLen; ++i) {
      if (str[i] === `
`) {
        if (i - start > limit)
          return true;
        start = i + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i = 0, ch = json[i];ch; ch = json[++i]) {
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
        str += json.slice(start, i) + "\\ ";
        i += 1;
        start = i;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              const code = json.substr(i + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
              i += 1;
            } else {
              str += json.slice(start, i) + `

`;
              while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                str += `
`;
                i += 2;
              }
              str += indent;
              if (json[i + 2] === " ")
                str += "\\";
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t);
      if (res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS((exports) => {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// ../../../crew/node_modules/yaml/dist/log.js
var require_log = __commonJS((exports) => {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
      for (const it of source.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(source))
      for (const it of source)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, source);
  }
  function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value2] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value2);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value: value2,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// ../../../crew/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS((exports) => {
  var log = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// ../../../crew/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify2(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment2 = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment2 = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
      if (comment2)
        str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
      if (chompKeep && comment2)
        chompKeep = false;
      lines.push(blockItemPrefix + str2);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1;i < lines.length; ++i) {
        const line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// ../../../crew/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS((exports) => {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1)
          this.items.push(_pair);
        else
          this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// ../../../crew/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map2, onError) {
      if (!identity.isMap(map2))
        onError("Expected a mapping for this tag");
      return map2;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// ../../../crew/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// ../../../crew/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq2, onError) {
      if (!identity.isSeq(seq2))
        onError("Expected a sequence for this tag");
      return seq2;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// ../../../crew/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS((exports) => {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// ../../../crew/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// ../../../crew/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS((exports) => {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
      let i = n.indexOf(".");
      if (i < 0) {
        i = n.length;
        n += ".";
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0)
        n += "0";
    }
    return n;
  }
  exports.stringifyNumber = stringifyNumber;
});

// ../../../crew/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// ../../../crew/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// ../../../crew/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// ../../../crew/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS((exports) => {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i = 0;i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i = 0;i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0;i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
      for (let i = 0;i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs2 = new YAMLSeq.YAMLSeq(schema);
    pairs2.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs2.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs2;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS((exports) => {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap2 = new this;
      omap2.items = pairs$1.items;
      return omap2;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError) {
      const pairs$1 = pairs.resolvePairs(seq, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n2 = BigInt(str);
      return sign === "-" ? BigInt(-1) * n2 : n2;
    }
    const n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set2 = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set2.items.push(Pair.createPair(value, null, ctx));
        }
      return set2;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// ../../../crew/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// ../../../crew/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags2, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags2.includes(tagObj))
        tags2.push(tagObj);
      return tags2;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// ../../../crew/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS((exports) => {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// ../../../crew/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// ../../../crew/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS((exports) => {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path3, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path3, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path3) {
      if (Collection.isEmptyPath(path3)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path3) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path3, keepScalar) {
      if (Collection.isEmptyPath(path3))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path3, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path3) {
      if (Collection.isEmptyPath(path3))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path3) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path3, value) {
      if (Collection.isEmptyPath(path3)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path3), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path3, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// ../../../crew/node_modules/yaml/dist/errors.js
var require_errors = __commonJS((exports) => {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "\u2026" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "\u2026";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `\u2026
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS((exports) => {
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// ../../../crew/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS((exports) => {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// ../../../crew/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS((exports) => {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// ../../../crew/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS((exports) => {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS((exports) => {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS((exports) => {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS((exports) => {
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0;i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i < fc.items.length - 1)
            onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key))
          onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// ../../../crew/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1;i >= 0; --i) {
      const content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      const value2 = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end2 = start + header.length;
      if (scalar.source)
        end2 += scalar.source.length;
      return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0;i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1;i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent)
        chompStart = i + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i = 0;i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart;i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart;i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header") {
      onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n)
          indent = n;
        else if (error === -1)
          error = offset + i;
      }
    }
    if (error !== -1)
      onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i = 1;i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
    const lines = [line0];
    for (let i = 1;i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// ../../../crew/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return foldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return foldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function foldLines(source) {
    let first, line;
    try {
      first = new RegExp(`(.*?)(?<![ 	])[ 	]*\r?
`, "sy");
      line = new RegExp(`[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`, "sy");
    } catch {
      first = /(.*?)[ \t]*\r?\n/sy;
      line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
    }
    let match = first.exec(source);
    if (!match)
      return source;
    let res = match[1];
    let sep = " ";
    let pos = first.lastIndex;
    line.lastIndex = pos;
    while (match = line.exec(source)) {
      if (match[1] === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + match[1];
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1;i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === "\r" && source[i + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === "\\") {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "\r" && source[i + 1] === `
`) {
          next = source[++i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = next === "x" ? 2 : next === "u" ? 4 : 8;
          res += parseCharCode(source, i + 1, length, onError);
          i += length;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i;
        let next = source[i + 1];
        while (next === " " || next === "\t")
          next = source[++i + 1];
        if (next !== `
` && !(next === "\r" && source[i + 2] === `
`))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "\x85",
    _: "\xA0",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok2 = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok2 ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code);
    } catch {
      const raw = source.substr(offset - 2, length + 2);
      onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// ../../../crew/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// ../../../crew/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS((exports) => {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1;i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// ../../../crew/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// ../../../crew/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS((exports) => {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// ../../../crew/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS((exports) => {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0;i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i + 1]?.[0] !== "#")
            i += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i = 0;i < this.errors.length; ++i)
          doc.errors.push(this.errors[i]);
        for (let i = 0;i < this.warnings.length; ++i)
          doc.warnings.push(this.warnings[i]);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// ../../../crew/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS((exports) => {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError)
          onError(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// ../../../crew/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS((exports) => {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// ../../../crew/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS((exports) => {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path3) => {
    let item = cst;
    for (const [field, index] of path3) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path3) => {
    const parent = visit.itemAtPath(cst, path3.slice(0, -1));
    const field = path3[path3.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path3, item, visitor) {
    let ctrl = visitor(item, path3);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path3.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path3);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path3) : ctrl;
  }
  exports.visit = visit;
});

// ../../../crew/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS((exports) => {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// ../../../crew/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS((exports) => {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i + 1] === `
`;
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ",") {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === "\\")
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i2 = this.pos;ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      ch = this.buffer[i];
      while (ch === " ")
        ch = this.buffer[++i];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i2 = nl - 1;
          let ch2 = this.buffer[i2];
          if (ch2 === "\r")
            ch2 = this.buffer[--i2];
          const lastChar = i2;
          while (ch2 === " ")
            ch2 = this.buffer[--i2];
          if (ch2 === `
` && i2 >= this.pos && i2 + 1 + indent > lastChar)
            nl = i2;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i]) {
        if (ch === ":") {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i += 1;
              ch = `
`;
              next = this.buffer[i + 1];
            } else
              end = i;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      let n = 0;
      loop:
        while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            case "?":
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
      return n;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
            ch = this.buffer[i += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === " " || allowTabs && ch === "\t");
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch))
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  exports.Lexer = Lexer;
});

// ../../../crew/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS((exports) => {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// ../../../crew/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS((exports) => {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i = 0;i < list.length; ++i)
      if (list[i].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0;i < list.length; ++i) {
      switch (list[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop:
      while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i]?.type === "space") {}
    return prev.splice(i, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i = 0;i < source.length; ++i)
        target.push(source[i]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              arrayPushArray(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            arrayPushArray(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last = token.items[token.items.length - 1];
          if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last.start;
            else
              top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i = 0;i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start2 = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start2 = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs5 = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs5, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs5);
            } else {
              Object.assign(it, { key: fs5, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs5 = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs5, sep: [] });
            else if (it.sep)
              this.stack.push(fs5);
            else
              Object.assign(it, { key: fs5, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// ../../../crew/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS((exports) => {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter2)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter2) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter2));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// ../../../crew/node_modules/yaml/dist/index.js
var composer, Document, Schema, errors, Alias, identity, Pair, Scalar, YAMLMap, YAMLSeq, cst, lexer, lineCounter, parser, publicApi, visit, $Composer, $Document, $Schema, $YAMLError, $YAMLParseError, $YAMLWarning, $Alias, $isAlias, $isCollection, $isDocument, $isMap, $isNode, $isPair, $isScalar, $isSeq, $Pair, $Scalar, $YAMLMap, $YAMLSeq, $Lexer, $LineCounter, $Parser, $parse, $parseAllDocuments, $parseDocument, $stringify, $visit, $visitAsync;
var init_dist = __esm(() => {
  composer = require_composer();
  Document = require_Document();
  Schema = require_Schema();
  errors = require_errors();
  Alias = require_Alias();
  identity = require_identity();
  Pair = require_Pair();
  Scalar = require_Scalar();
  YAMLMap = require_YAMLMap();
  YAMLSeq = require_YAMLSeq();
  cst = require_cst();
  lexer = require_lexer();
  lineCounter = require_line_counter();
  parser = require_parser();
  publicApi = require_public_api();
  visit = require_visit();
  $Composer = composer.Composer;
  $Document = Document.Document;
  $Schema = Schema.Schema;
  $YAMLError = errors.YAMLError;
  $YAMLParseError = errors.YAMLParseError;
  $YAMLWarning = errors.YAMLWarning;
  $Alias = Alias.Alias;
  $isAlias = identity.isAlias;
  $isCollection = identity.isCollection;
  $isDocument = identity.isDocument;
  $isMap = identity.isMap;
  $isNode = identity.isNode;
  $isPair = identity.isPair;
  $isScalar = identity.isScalar;
  $isSeq = identity.isSeq;
  $Pair = Pair.Pair;
  $Scalar = Scalar.Scalar;
  $YAMLMap = YAMLMap.YAMLMap;
  $YAMLSeq = YAMLSeq.YAMLSeq;
  $Lexer = lexer.Lexer;
  $LineCounter = lineCounter.LineCounter;
  $Parser = parser.Parser;
  $parse = publicApi.parse;
  $parseAllDocuments = publicApi.parseAllDocuments;
  $parseDocument = publicApi.parseDocument;
  $stringify = publicApi.stringify;
  $visit = visit.visit;
  $visitAsync = visit.visitAsync;
});

// ../../../crew/node_modules/@astragenie/plugin-std/dist/frontmatter.js
function stripBom(input) {
  return input.charCodeAt(0) === 65279 ? input.slice(1) : input;
}
function normalizeNewlines(input) {
  return input.replace(/\r\n?/g, `
`);
}
function parseFrontmatter(input) {
  const normalized = normalizeNewlines(stripBom(input));
  const lines = normalized.split(`
`);
  if (lines[0] !== FENCE) {
    return { data: {}, body: normalized };
  }
  let closeIndex = -1;
  for (let i = 1;i < lines.length; i++) {
    if (lines[i] === FENCE) {
      closeIndex = i;
      break;
    }
  }
  if (closeIndex === -1) {
    throw new DeterministicError("frontmatter: unterminated `---` fence", {
      code: "E_FRONTMATTER_UNTERMINATED"
    });
  }
  const yamlBlock = lines.slice(1, closeIndex).join(`
`);
  const body = lines.slice(closeIndex + 1).join(`
`);
  let parsed;
  try {
    parsed = $parse(yamlBlock);
  } catch (cause) {
    throw new DeterministicError("frontmatter: malformed YAML in frontmatter block", {
      code: "E_FRONTMATTER_YAML",
      cause
    });
  }
  const data = parsed ?? {};
  return { data, body };
}
var FENCE = "---";
var init_frontmatter = __esm(() => {
  init_dist();
  init_errors();
});

// ../../../crew/node_modules/@astragenie/plugin-std/dist/git.js
import { execFile } from "child_process";
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
var init_git = __esm(() => {
  init_errors();
});

// ../../../crew/node_modules/@astragenie/plugin-std/dist/index.js
var init_dist2 = __esm(() => {
  init_errors();
  init_jsonl();
  init_http();
  init_frontmatter();
  init_git();
});

// crew/scripts/lib/result.mts
var init_result = __esm(() => {
  init_dist2();
});

// crew/scripts/lib/workflow-state.mts
var exports_workflow_state = {};
__export(exports_workflow_state, {
  summarizeWorkflowState: () => summarizeWorkflowState,
  startWorkflowRun: () => startWorkflowRun,
  registerWorkflowArtifact: () => registerWorkflowArtifact,
  markWorkflowBadge: () => markWorkflowBadge,
  loadWorkflowState: () => loadWorkflowState,
  ensureWorkflowStateScaffold: () => ensureWorkflowStateScaffold
});
import fs5 from "fs/promises";
import path3 from "path";
function nowIso2() {
  return new Date().toISOString();
}
function defaultWorkflowState() {
  return {
    version: "1.0",
    updatedAt: nowIso2(),
    currentRun: null,
    recentRuns: []
  };
}
async function ensureDir(dirPath) {
  await fs5.mkdir(dirPath, { recursive: true });
}
async function ensureFile(filePath, contents) {
  try {
    await fs5.access(filePath);
  } catch {
    await ensureDir(path3.dirname(filePath));
    await fs5.writeFile(filePath, contents);
  }
}
async function resolveReviewerLadder(repoPath) {
  try {
    const raw = await fs5.readFile(path3.join(repoPath, ".claude", "loop.json"), "utf8");
    const parsed = JSON.parse(raw);
    const ladder = parsed.reviewers?.ladder;
    if (!Array.isArray(ladder))
      return [...DEFAULT_REVIEWER_LADDER];
    const seen = new Set;
    const resolved = [];
    for (const entry of ladder) {
      const role = typeof entry === "string" ? entry.trim() : "";
      if (role && !seen.has(role)) {
        seen.add(role);
        resolved.push(role);
      }
    }
    return resolved.length > 0 ? resolved : [...DEFAULT_REVIEWER_LADDER];
  } catch {
    return [...DEFAULT_REVIEWER_LADDER];
  }
}
async function ensureWorkflowStateScaffold(repoPath) {
  await ensureFile(path3.join(repoPath, ...WORKFLOW_STATE_PATH), `${JSON.stringify(defaultWorkflowState(), null, 2)}
`);
}
async function loadWorkflowState(repoPath, options = {}) {
  const workflowPath = path3.join(repoPath, ...WORKFLOW_STATE_PATH);
  const workflowText = await readFileIfExists(workflowPath);
  if (workflowText !== null) {
    return JSON.parse(workflowText);
  }
  const legacyPath = path3.join(repoPath, ...LEGACY_WORKFLOW_STATE_PATH);
  const legacyText = await readFileIfExists(legacyPath);
  if (legacyText !== null) {
    return JSON.parse(legacyText);
  }
  if (options.createIfMissing === false) {
    return defaultWorkflowState();
  }
  await ensureWorkflowStateScaffold(repoPath);
  return JSON.parse(await fs5.readFile(workflowPath, "utf8"));
}
async function acquireLock(lockPath, timeout = 5000) {
  const start = Date.now();
  const staleThreshold = 1e4;
  while (Date.now() - start < timeout) {
    try {
      await ensureDir(path3.dirname(lockPath));
      const fd = await fs5.open(lockPath, "wx");
      await fd.close();
      return;
    } catch (e) {
      const err2 = e;
      if (err2.code !== "EEXIST")
        throw e;
      try {
        const stat2 = await fs5.stat(lockPath);
        const age = Date.now() - stat2.mtimeMs;
        if (age > staleThreshold) {
          await fs5.unlink(lockPath).catch(() => {});
          continue;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  throw new Error("Workflow state lock timeout");
}
async function releaseLock(lockPath) {
  try {
    await fs5.unlink(lockPath);
  } catch {}
}
async function saveWorkflowState(repoPath, state, lockHeld = false) {
  const lockPath = path3.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  if (!lockHeld) {
    await acquireLock(lockPath);
  }
  try {
    const workflowPath = path3.join(repoPath, ...WORKFLOW_STATE_PATH);
    state.updatedAt = nowIso2();
    await ensureDir(path3.dirname(workflowPath));
    await fs5.writeFile(workflowPath, `${JSON.stringify(state, null, 2)}
`);
  } finally {
    if (!lockHeld) {
      await releaseLock(lockPath);
    }
  }
}
async function startWorkflowRun(repoPath, fields = {}) {
  const lockPath = path3.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  await acquireLock(lockPath);
  try {
    const state = await loadWorkflowState(repoPath);
    if (state.currentRun) {
      archiveRun(state, state.currentRun);
    }
    state.currentRun = createRun(fields);
    await saveWorkflowState(repoPath, state, true);
    return state.currentRun;
  } finally {
    await releaseLock(lockPath);
  }
}
function ensureCurrentRun(state, fields = {}) {
  if (!state.currentRun) {
    state.currentRun = createRun(fields);
  }
  return state.currentRun;
}
function applyBadge(run, badge, note = "", blockedBy = null) {
  const spec = BADGE_TABLE[badge];
  if (!spec) {
    throw new Error(`Unsupported workflow badge: ${badge}`);
  }
  const [parent, key] = spec.selector(run);
  if (spec.custom) {
    const gateObj = { status: spec.status, updatedAt: nowIso2(), note: note || "" };
    if ((badge === "blocked" || badge === "incident_blocked") && blockedBy !== null) {
      gateObj.blockedBy = blockedBy;
    }
    parent[key] = gateObj;
  } else {
    parent[key] = {
      status: spec.status,
      updatedAt: nowIso2(),
      note: note || ""
    };
  }
}
async function markWorkflowBadge(repoPath, options = {}) {
  const lockPath = path3.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  try {
    const badge = options.badge;
    if (!badge) {
      throw new Error("Workflow badge is required.");
    }
    await acquireLock(lockPath);
    try {
      const state = await loadWorkflowState(repoPath);
      const run = ensureCurrentRun(state, {
        title: options.title || "Workflow Run",
        goal: options.goal || "",
        mode: options.mode || "",
        next: options.next || ""
      });
      applyBadge(run, badge, options.note || "", options.blockedBy ?? null);
      run.updatedAt = nowIso2();
      if (options.next) {
        run.next = options.next;
      }
      await saveWorkflowState(repoPath, state, true);
      return ok(state.currentRun);
    } finally {
      await releaseLock(lockPath);
    }
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
function handleHandoff(run, artifact) {
  run.artifacts.handoffs = [...run.artifacts.handoffs || [], artifact.path].slice(-10);
}
function computeReviewGateStatus(reviewers, required) {
  const values = Object.values(reviewers);
  if (values.includes("rejected"))
    return "failed";
  const approving = values.filter((v) => v === "approved" || v === "approved_with_notes");
  if (required.length > 0) {
    return approving.length >= required.length ? "passed" : "required";
  }
  return values.length > 0 && approving.length === values.length ? "passed" : "required";
}
function applyReviewVerdict(run, reviewerKey, verdict, note) {
  const existing = run.gates.review;
  const reviewers = { ...existing?.reviewers ?? {}, [reviewerKey]: verdict };
  const required = existing?.required ?? [];
  run.gates.review = {
    status: computeReviewGateStatus(reviewers, required),
    updatedAt: nowIso2(),
    note: note || existing?.note || "",
    reviewers,
    required
  };
}
function handleReviewResult(run, artifact, fields) {
  run.artifacts.reviewResult = artifact.path;
  const verdict = fields.verdict;
  if (verdict === undefined) {
    return;
  }
  if (verdict !== "approved" && verdict !== "approved_with_notes" && verdict !== "rejected") {
    throw new Error(`handleReviewResult: unrecognized review verdict "${verdict}" \u2014 refusing to fail open to review_passed.`);
  }
  applyReviewVerdict(run, fields.reviewer || "reviewer", verdict, fields.summary || "");
}
function handleValidationPlan(run, artifact, fields) {
  run.artifacts.validationPlan = artifact.path;
  applyBadge(run, "validation_expected", fields.summary || fields.goal || "");
}
function computeValidationGateStatus(validators, required) {
  const values = Object.values(validators);
  if (values.includes("fail"))
    return "failed";
  const allWritten = required.length > 0 ? values.length >= required.length : values.length > 0;
  if (!allWritten)
    return "expected";
  return values.every((v) => v === "skipped") ? "skipped" : "passed";
}
function applyValidationVerdict(run, validatorKey, verdict, note) {
  const existing = run.gates.validation;
  const validators = { ...existing?.validators ?? {}, [validatorKey]: verdict };
  const required = existing?.required ?? [];
  run.gates.validation = {
    status: computeValidationGateStatus(validators, required),
    updatedAt: nowIso2(),
    note: note || existing?.note || "",
    validators,
    required
  };
}
function handleValidationResult(run, artifact, fields) {
  run.artifacts.validationResult = artifact.path;
  const verdict = fields.verdict;
  if (verdict === undefined) {
    return;
  }
  if (verdict !== "pass" && verdict !== "fail" && verdict !== "skipped") {
    throw new Error(`handleValidationResult: unrecognized validation verdict "${verdict}" \u2014 refusing to fail open to validation_passed.`);
  }
  const note = verdict === "skipped" && fields.skipReason ? `skipped: ${fields.skipReason}` : fields.summary || fields.goal || "";
  applyValidationVerdict(run, fields.validator || "verifier", verdict, note);
}
function handleDeploymentCheck(run, artifact, fields) {
  const environment = fields.environment === "prod" ? "prod" : "dev";
  run.artifacts.deploymentChecks[environment] = artifact.path;
  applyBadge(run, fields.decision === "failed" ? `${environment}_failed` : `${environment}_checked`, fields.summary || fields.goal || "");
}
function handleFinalSynthesis(run, artifact, fields) {
  const stateSnapshot = {
    currentRun: run,
    version: "",
    updatedAt: "",
    recentRuns: []
  };
  const pendingBadges = summarizeWorkflowState(stateSnapshot).pendingBadges;
  const hasEscalation = run?.gates?.escalation?.status === "escalated";
  const force = fields.force === true;
  if (pendingBadges.length > 0 && !force) {
    throw new Error(`Cannot finalize run while workflow badges are still pending: ${pendingBadges.join(", ")}`);
  }
  if (hasEscalation && !force) {
    throw new Error("Cannot finalize run while escalated to lead. Use --force to override.");
  }
  run.artifacts.finalSynthesis = artifact.path;
  run.status = fields.status || "completed";
  run.completedAt = nowIso2();
}
function applyArtifactToRun(run, artifact, fields) {
  const handler = ARTIFACT_HANDLERS[artifact.kind];
  if (handler) {
    handler(run, artifact, fields);
  }
}
async function registerWorkflowArtifact(repoPath, artifact, fields = {}) {
  const lockPath = path3.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  await acquireLock(lockPath);
  try {
    const state = await loadWorkflowState(repoPath);
    if (artifact.kind === "run-brief") {
      archiveRun(state, state.currentRun);
      state.currentRun = createRun({
        ...fields.title !== undefined ? { title: fields.title } : {},
        ...fields.goal !== undefined ? { goal: fields.goal } : {},
        ...fields.mode !== undefined ? { mode: fields.mode } : {},
        ...fields.next !== undefined ? { next: fields.next } : {},
        path: artifact.path
      });
      state.currentRun.gates.review = {
        status: "required",
        updatedAt: nowIso2(),
        reviewers: {},
        required: await resolveReviewerLadder(repoPath)
      };
      await saveWorkflowState(repoPath, state, true);
      return state.currentRun;
    }
    const run = ensureCurrentRun(state, {
      title: fields.title || artifact.title,
      goal: fields.goal || "",
      mode: fields.mode || "",
      next: fields.next || ""
    });
    applyArtifactToRun(run, artifact, fields);
    run.updatedAt = nowIso2();
    if (fields.next) {
      run.next = fields.next;
    }
    await saveWorkflowState(repoPath, state, true);
    return state.currentRun;
  } finally {
    await releaseLock(lockPath);
  }
}
function collectPendingBadges(currentRun) {
  return PENDING_BADGE_SPECS.filter((spec) => spec.check(currentRun)).map((spec) => spec.badge);
}
function summarizeWorkflowState(state) {
  const currentRun = state?.currentRun ?? null;
  if (!currentRun) {
    return {
      hasActiveRun: false,
      pendingBadges: [],
      missingArtifactWrites: [],
      currentRun: null
    };
  }
  const pendingBadges = collectPendingBadges(currentRun);
  const missingArtifactWrites = summarizeMissingArtifactWritesForRun(currentRun);
  return {
    hasActiveRun: currentRun.status !== "completed",
    pendingBadges,
    missingArtifactWrites,
    currentRun: {
      title: currentRun.title,
      goal: currentRun.goal,
      mode: currentRun.mode,
      status: currentRun.status,
      next: currentRun.next,
      gates: currentRun.gates,
      artifacts: currentRun.artifacts,
      updatedAt: currentRun.updatedAt
    }
  };
}
var STATE_DIR, WORKFLOW_STATE_PATH, WORKFLOW_STATE_LOCK_PATH, LEGACY_WORKFLOW_STATE_PATH, DEFAULT_REVIEWER_LADDER, BADGE_TABLE, ARTIFACT_HANDLERS, PENDING_BADGE_SPECS;
var init_workflow_state = __esm(() => {
  init_workflow_state_gates();
  init_fs_utils();
  init_result();
  STATE_DIR = [".claude", "state", "crew"];
  WORKFLOW_STATE_PATH = [...STATE_DIR, "workflow-state.json"];
  WORKFLOW_STATE_LOCK_PATH = [...STATE_DIR, "workflow-state.lock"];
  LEGACY_WORKFLOW_STATE_PATH = [
    ".claude",
    "state",
    "engineering-os",
    "workflow-state.json"
  ];
  DEFAULT_REVIEWER_LADDER = ["A", "B"];
  BADGE_TABLE = {
    review_required: { selector: (run) => [run.gates, "review"], status: "required" },
    review_passed: { selector: (run) => [run.gates, "review"], status: "passed" },
    review_failed: { selector: (run) => [run.gates, "review"], status: "failed" },
    review_skipped: { selector: (run) => [run.gates, "review"], status: "skipped" },
    validation_expected: { selector: (run) => [run.gates, "validation"], status: "expected" },
    validation_passed: { selector: (run) => [run.gates, "validation"], status: "passed" },
    validation_failed: { selector: (run) => [run.gates, "validation"], status: "failed" },
    validation_skipped: { selector: (run) => [run.gates, "validation"], status: "skipped" },
    validation_stale: { selector: (run) => [run.gates, "validation"], status: "stale", custom: true },
    dev_deploy_expected: {
      selector: (run) => [run.gates.deployment, "dev"],
      status: "expected"
    },
    dev_checked: { selector: (run) => [run.gates.deployment, "dev"], status: "passed" },
    dev_failed: { selector: (run) => [run.gates.deployment, "dev"], status: "failed" },
    dev_skipped: { selector: (run) => [run.gates.deployment, "dev"], status: "skipped" },
    prod_deploy_expected: {
      selector: (run) => [run.gates.deployment, "prod"],
      status: "expected"
    },
    prod_checked: { selector: (run) => [run.gates.deployment, "prod"], status: "passed" },
    prod_failed: { selector: (run) => [run.gates.deployment, "prod"], status: "failed" },
    prod_skipped: { selector: (run) => [run.gates.deployment, "prod"], status: "skipped" },
    blocked: { selector: (run) => [run.gates, "blocked"], status: "blocked", custom: true },
    specialist_recommended: {
      selector: (run) => [run.gates, "specialist"],
      status: "recommended",
      custom: true
    },
    escalated_to_dispatcher: {
      selector: (run) => [run.gates, "escalation"],
      status: "escalated",
      custom: true
    },
    escalated_to_lead: {
      selector: (run) => [run.gates, "escalation"],
      status: "escalated",
      custom: true
    },
    incident_resolved: {
      selector: (run) => [run.gates, "incident"],
      status: "resolved",
      custom: true
    },
    rollback_executed: {
      selector: (run) => [run.gates, "incident"],
      status: "rolled-back",
      custom: true
    },
    incident_blocked: {
      selector: (run) => [run.gates, "incident"],
      status: "blocked",
      custom: true
    },
    help_request: {
      selector: (run) => [run.gates, "help"],
      status: "requested",
      custom: true
    },
    help_resolved: {
      selector: (run) => [run.gates, "help"],
      status: "resolved",
      custom: true
    }
  };
  ARTIFACT_HANDLERS = {
    handoff: handleHandoff,
    "review-result": handleReviewResult,
    "validation-plan": handleValidationPlan,
    "validation-result": handleValidationResult,
    "deployment-check": handleDeploymentCheck,
    "final-synthesis": handleFinalSynthesis
  };
  PENDING_BADGE_SPECS = [
    { badge: "review_required", check: (run) => run?.gates?.review?.status === "required" },
    { badge: "validation_expected", check: (run) => run?.gates?.validation?.status === "expected" },
    {
      badge: "dev_deploy_expected",
      check: (run) => run?.gates?.deployment?.dev?.status === "expected"
    },
    {
      badge: "prod_deploy_expected",
      check: (run) => run?.gates?.deployment?.prod?.status === "expected"
    },
    { badge: "blocked", check: (run) => run?.gates?.blocked?.status === "blocked" },
    {
      badge: "escalated_to_dispatcher",
      check: (run) => run?.gates?.escalation?.status === "escalated"
    },
    { badge: "help_request", check: (run) => run?.gates?.help?.status === "requested" }
  ];
});

// crew/scripts/lib/pricing.json
var pricing_default;
var init_pricing = __esm(() => {
  pricing_default = {
    _comment: "USD per 1,000,000 tokens. Update when Anthropic prices change. FEAT-025: keys are matched EXACTLY (or exact-key + '-YYYYMMDD' date suffix) against the model field on assistant messages via priceFor() in session-cost.mts -- no more bare-prefix matching (that silently priced e.g. claude-opus-4-9 at claude-opus-4 rates).",
    _keys: {
      input: "Standard input tokens (non-cached prompt content).",
      cache_create_5m: "Tokens written to the ephemeral 5-minute prompt cache. Formula when not independently priced: 1.25x input.",
      cache_create_1h: "Tokens written to the ephemeral 1-hour prompt cache. Formula when not independently priced: 2x input.",
      cache_read: "Tokens served from the prompt cache.",
      output: "Generated output tokens.",
      source: 'Optional per-model provenance: "audit" = taken directly from docs/audits/2026-11-05/audit-synthesis.md \xA73.7; "assumed" = no exact-name quote in that audit for this model id, same-family (Opus/Sonnet/Haiku) rate reused. Absent = legacy table entry predating this field.'
    },
    models: {
      "claude-opus-4": {
        input: 15,
        cache_create_5m: 18.75,
        cache_create_1h: 30,
        cache_read: 1.5,
        output: 75
      },
      "claude-sonnet-4": {
        input: 3,
        cache_create_5m: 3.75,
        cache_create_1h: 6,
        cache_read: 0.3,
        output: 15
      },
      "claude-haiku-4": {
        input: 1,
        cache_create_5m: 1.25,
        cache_create_1h: 2,
        cache_read: 0.1,
        output: 5
      },
      "claude-fable-5-1": {
        input: 10,
        cache_create_5m: 12.5,
        cache_create_1h: 20,
        cache_read: 0.25,
        output: 50,
        source: "audit"
      },
      "claude-sonnet-5": {
        input: 2,
        cache_create_5m: 2.5,
        cache_create_1h: 4,
        cache_read: 0.1,
        output: 10,
        source: "assumed"
      },
      "claude-opus-5": {
        input: 4,
        cache_create_5m: 5,
        cache_create_1h: 8,
        cache_read: 0.2,
        output: 20,
        source: "assumed"
      },
      "claude-haiku-4-5": {
        input: 0.1,
        cache_create_5m: 0.125,
        cache_create_1h: 0.2,
        cache_read: 0.01,
        output: 0.5,
        source: "assumed"
      }
    },
    fallback: "claude-sonnet-4"
  };
});

// crew/scripts/lib/session-cost-scanner/compute.mts
function emptyTotals() {
  return {
    input: 0,
    cache_create_5m: 0,
    cache_create_1h: 0,
    cache_read: 0,
    output: 0
  };
}
function addTotals(target, source) {
  for (const k of Object.keys(target)) {
    target[k] = (target[k] ?? 0) + (source[k] ?? 0);
  }
}
function percentile(sortedArr, p) {
  if (sortedArr.length === 0)
    return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor(p / 100 * sortedArr.length));
  return sortedArr[idx] ?? 0;
}
function approxSize(value) {
  if (value == null)
    return 0;
  if (typeof value === "string")
    return value.length;
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}
function inspectContent(content) {
  const out = { toolUses: [], toolResults: [], textLen: 0 };
  if (!Array.isArray(content)) {
    if (typeof content === "string")
      out.textLen = content.length;
    return out;
  }
  for (const block of content) {
    if (!block || typeof block !== "object")
      continue;
    const b = block;
    if (b["type"] === "tool_use") {
      out.toolUses.push({
        id: b["id"],
        name: b["name"],
        input: b["input"]
      });
    } else if (b["type"] === "tool_result") {
      out.toolResults.push({
        id: b["tool_use_id"],
        size: approxSize(b["content"]),
        isError: Boolean(b["is_error"])
      });
    } else if (b["type"] === "text") {
      out.textLen += (b["text"] || "").length;
    }
  }
  return out;
}
function recordTokenUsage(ctx, model, tokens, file, fileToSlug) {
  addTotals(ctx.totals, tokens);
  if (!ctx.byModel[model]) {
    ctx.byModel[model] = { tokens: emptyTotals(), usd: 0, messages: 0 };
  }
  addTotals(ctx.byModel[model].tokens, tokens);
  ctx.byModel[model].messages += 1;
  ctx.counters.messagesCounted += 1;
  const srcSlug = fileToSlug.get(file);
  if (srcSlug) {
    const s = ctx.ensureSource(srcSlug);
    addTotals(s.tokens, tokens);
    if (!s.modelTokens[model])
      s.modelTokens[model] = emptyTotals();
    addTotals(s.modelTokens[model], tokens);
    s.messages += 1;
    s.touched = true;
  }
}
function recordToolUse(ctx, tu) {
  ctx.flags.sawFirstTool = true;
  ctx.toolUseCounts[tu.name] = (ctx.toolUseCounts[tu.name] ?? 0) + 1;
  if (tu.id)
    ctx.toolNameById.set(tu.id, tu.name);
  TOOL_COUNTERS[tu.name]?.(ctx);
  if (tu.name === "Read") {
    const inp = tu.input;
    const p = inp?.["file_path"];
    if (p)
      ctx.filesRead[p] = (ctx.filesRead[p] ?? 0) + 1;
  }
}
function attributeCachePrime(ctx, usage) {
  const pending = ctx.cachePrimeState.pendingToolUses;
  if (!pending.length || !usage)
    return;
  const cc = usage["cache_creation"];
  const cacheCreate = cc ? (cc["ephemeral_5m_input_tokens"] ?? 0) + (cc["ephemeral_1h_input_tokens"] ?? 0) : usage["cache_creation_input_tokens"] ?? 0;
  if (cacheCreate <= 0)
    return;
  const sizes = pending.map((tu) => ctx.cachePrimeState.pendingResultSizes[tu.id] ?? 0);
  const totalSize = sizes.reduce((a, b) => a + b, 0);
  for (let i = 0;i < pending.length; i += 1) {
    const tu = pending[i];
    const weight = totalSize > 0 ? (sizes[i] ?? 0) / totalSize : 1 / pending.length;
    const attributed = cacheCreate * weight;
    if (!ctx.toolCachePrime[tu.name]) {
      ctx.toolCachePrime[tu.name] = { calls: 0, totalResultBytes: 0, attributedCacheCreate: 0 };
    }
    ctx.toolCachePrime[tu.name].attributedCacheCreate += attributed;
  }
}
function isSyntheticModel(model) {
  if (!model)
    return false;
  return SYNTHETIC_MODEL_PREFIXES.some((p) => model.startsWith(p));
}
function tokensFromUsage(usage) {
  const out = {
    input: 0,
    cache_create_5m: 0,
    cache_create_1h: 0,
    cache_read: 0,
    output: 0
  };
  if (!usage || typeof usage !== "object")
    return out;
  out["input"] = usage["input_tokens"] ?? 0;
  out["cache_read"] = usage["cache_read_input_tokens"] ?? 0;
  out["output"] = usage["output_tokens"] ?? 0;
  const cc = usage["cache_creation"];
  if (cc && typeof cc === "object") {
    const cc2 = cc;
    out["cache_create_5m"] = cc2["ephemeral_5m_input_tokens"] ?? 0;
    out["cache_create_1h"] = cc2["ephemeral_1h_input_tokens"] ?? 0;
  } else {
    out["cache_create_5m"] = usage["cache_creation_input_tokens"] ?? 0;
  }
  return out;
}
function handleAssistantTurn(obj, file, fileToSlug, ctx) {
  const usage = obj?.message?.usage;
  const touched = Boolean(usage);
  if (usage) {
    const model = obj?.message?.model || "unknown";
    if (!isSyntheticModel(model)) {
      recordTokenUsage(ctx, model, tokensFromUsage(usage), file, fileToSlug);
      attributeCachePrime(ctx, usage);
    }
  }
  const insp = inspectContent(obj?.message?.content);
  if (insp.toolUses.length === 0 && !ctx.flags.sawFirstTool) {
    ctx.counters.turnsBeforeFirstTool += 1;
  }
  for (const tu of insp.toolUses) {
    recordToolUse(ctx, tu);
  }
  if (insp.toolUses.length > 0) {
    ctx.cachePrimeState.pendingToolUses = insp.toolUses.map((tu) => ({ id: tu.id, name: tu.name }));
    ctx.cachePrimeState.pendingResultSizes = {};
  }
  return touched;
}
function recordCachePrimeForTool(toolName, resultSize, ctx) {
  if (!ctx.toolCachePrime[toolName]) {
    ctx.toolCachePrime[toolName] = {
      calls: 0,
      totalResultBytes: 0,
      attributedCacheCreate: 0
    };
  }
  ctx.toolCachePrime[toolName].calls += 1;
  ctx.toolCachePrime[toolName].totalResultBytes += resultSize || 0;
}
function recordToolFailure(toolId, ctx) {
  const errToolName = ctx.toolNameById.get(toolId) || "unknown";
  ctx.toolFailureCounts[errToolName] = (ctx.toolFailureCounts[errToolName] ?? 0) + 1;
}
function processToolResult(tr, ctx) {
  ctx.toolResultSizes.push(tr.size);
  if (tr.id)
    ctx.cachePrimeState.pendingResultSizes[tr.id] = tr.size;
  const toolName = tr.id ? ctx.toolNameById.get(tr.id) : null;
  if (toolName)
    recordCachePrimeForTool(toolName, tr.size, ctx);
  if (tr.isError && tr.id)
    recordToolFailure(tr.id, ctx);
}
function handleUserTurn(obj, ctx) {
  if (obj.isMeta) {
    ctx.counters.compactionCount += 1;
    return;
  }
  const insp = inspectContent(obj?.message?.content);
  if (insp.toolResults.length > 0) {
    for (const tr of insp.toolResults)
      processToolResult(tr, ctx);
  } else {
    ctx.counters.userMsgCount += 1;
    ctx.counters.userMsgTotalLen += insp.textLen;
  }
}
var TOOL_COUNTERS, SYNTHETIC_MODEL_PREFIXES;
var init_compute = __esm(() => {
  TOOL_COUNTERS = {
    Skill: (ctx) => ctx.counters.skillInvocations += 1,
    Agent: (ctx) => ctx.counters.subagentDispatches += 1
  };
  SYNTHETIC_MODEL_PREFIXES = ["<synthetic>", "<", "synthetic"];
});

// crew/scripts/lib/session-cost-scanner.mts
import readline from "readline";
import { createReadStream } from "fs";
import path4 from "path";
import os from "os";
function resolveHomeDir() {
  const fromEnv = process.env.HOME || process.env.USERPROFILE;
  return fromEnv && fromEnv.trim() ? fromEnv : os.homedir();
}
function getProjectsRoot() {
  const override = process.env.CREW_PROJECTS_ROOT;
  return override ? path4.resolve(override) : path4.join(resolveHomeDir(), ".claude", "projects");
}
async function* readJsonlLines(file) {
  const stream = createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line)
      continue;
    try {
      yield JSON.parse(line);
    } catch {}
  }
}
async function scanOneSession(file, fileToSlug, ctx, startMs, endMs) {
  let touched = false;
  for await (const obj of readJsonlLines(file)) {
    const ts = obj?.timestamp;
    const tsMs = ts ? Date.parse(ts) : NaN;
    if (Number.isNaN(tsMs) || tsMs < startMs || tsMs > endMs)
      continue;
    if (obj?.type === "assistant") {
      touched = handleAssistantTurn(obj, file, fileToSlug, ctx) || touched;
      continue;
    }
    if (obj?.type === "user") {
      handleUserTurn(obj, ctx);
    }
  }
  return touched;
}
async function scanSessions({
  sessions,
  fileToSlug,
  startMs,
  endMs
}) {
  const totals = emptyTotals();
  const byModel = {};
  const toolUseCounts = {};
  const toolFailureCounts = {};
  const toolResultSizes = [];
  const filesRead = {};
  const toolNameById = new Map;
  const perSourceState = new Map;
  const counters = {
    messagesCounted: 0,
    sessionsScanned: 0,
    compactionCount: 0,
    userMsgCount: 0,
    userMsgTotalLen: 0,
    skillInvocations: 0,
    subagentDispatches: 0,
    turnsBeforeFirstTool: 0
  };
  const flags = { sawFirstTool: false };
  const toolCachePrime = {};
  const cachePrimeState = {
    pendingToolUses: [],
    pendingResultSizes: {}
  };
  const ensureSource = (slug) => {
    if (!perSourceState.has(slug)) {
      perSourceState.set(slug, {
        messages: 0,
        tokens: emptyTotals(),
        modelTokens: {},
        touched: false
      });
    }
    return perSourceState.get(slug);
  };
  const ctx = {
    totals,
    byModel,
    toolUseCounts,
    toolFailureCounts,
    toolResultSizes,
    filesRead,
    toolNameById,
    counters,
    flags,
    ensureSource,
    toolCachePrime,
    cachePrimeState
  };
  for (const file of sessions) {
    const touched = await scanOneSession(file, fileToSlug, ctx, startMs, endMs);
    if (touched)
      counters.sessionsScanned += 1;
  }
  return {
    totals,
    byModel,
    messagesCounted: counters.messagesCounted,
    sessionsScanned: counters.sessionsScanned,
    toolUseCounts,
    toolFailureCounts,
    toolResultSizes,
    filesRead,
    compactionCount: counters.compactionCount,
    userMsgCount: counters.userMsgCount,
    userMsgTotalLen: counters.userMsgTotalLen,
    skillInvocations: counters.skillInvocations,
    subagentDispatches: counters.subagentDispatches,
    turnsBeforeFirstTool: counters.turnsBeforeFirstTool,
    perSourceState,
    toolCachePrime
  };
}
var init_session_cost_scanner = __esm(() => {
  init_compute();
  init_compute();
});

// crew/scripts/lib/dir-cache.mjs
import fs6 from "fs/promises";
async function getCachedDirFiles(dirPath, filter) {
  let dirMtime;
  try {
    const stat2 = await fs6.stat(dirPath);
    dirMtime = stat2.mtimeMs;
  } catch (err2) {
    if (err2.code === "ENOENT")
      return [];
    throw err2;
  }
  const cached = _cache.get(dirPath);
  if (cached && cached.mtimeMs === dirMtime) {
    return cached.files;
  }
  let entries;
  try {
    entries = await fs6.readdir(dirPath, { withFileTypes: true });
  } catch (err2) {
    if (err2.code === "ENOENT")
      return [];
    throw err2;
  }
  const files = entries.filter((e) => e.isFile() && (!filter || filter(e.name))).map((e) => e.name).sort().reverse().map((name) => `${dirPath}/${name}`.replace(/\\/g, "/"));
  _cache.set(dirPath, { mtimeMs: dirMtime, files });
  return files;
}
var _cache;
var init_dir_cache = __esm(() => {
  _cache = new Map;
});

// crew/scripts/lib/session-cost.mts
var exports_session_cost = {};
__export(exports_session_cost, {
  slugifyRepoPath: () => slugifyRepoPath,
  priceFor: () => priceFor,
  loadPricing: () => loadPricing,
  computeSessionCost: () => computeSessionCost,
  autoDetectSourceProject: () => autoDetectSourceProject
});
import fs7 from "fs/promises";
import { readFileSync } from "fs";
import path5 from "path";
function slugifyRepoPath(repoPath) {
  return repoPath.replace(/[^A-Za-z0-9]/g, "-");
}
function loadPricingTable() {
  const override = process.env["PRICING_PATH"];
  if (override) {
    const raw = readFileSync(override, "utf8");
    return JSON.parse(raw);
  }
  return pricing_default;
}
async function loadPricing() {
  return loadPricingTable();
}
function matchPricingKey(model, models) {
  if (!model)
    return null;
  if (models[model])
    return model;
  const dateSuffixed = /^(.+)-\d{8}$/.exec(model);
  if (dateSuffixed) {
    const base = dateSuffixed[1];
    if (models[base])
      return base;
  }
  return null;
}
function priceFor(model) {
  const table = loadPricingTable();
  const matched = matchPricingKey(model, table.models);
  const rates = matched ? table.models[matched] : undefined;
  return {
    input: rates?.input ?? 0,
    output: rates?.output ?? 0,
    cacheRead: rates?.cache_read ?? 0,
    cacheWrite5m: rates?.cache_create_5m ?? 0,
    cacheWrite1h: rates?.cache_create_1h ?? 0,
    matched
  };
}
function ratesAsTokenKeys(rates) {
  return {
    input: rates.input,
    output: rates.output,
    cache_read: rates.cacheRead,
    cache_create_5m: rates.cacheWrite5m,
    cache_create_1h: rates.cacheWrite1h
  };
}
function priceTokens(tokens, modelRates) {
  let usd = 0;
  for (const k of Object.keys(tokens)) {
    const rate = modelRates[k] ?? 0;
    usd += (tokens[k] ?? 0) * rate / 1e6;
  }
  return usd;
}
async function listProjectSessions(repoPath, sourceProjectSlug = null) {
  const slug = sourceProjectSlug ?? slugifyRepoPath(repoPath);
  const dir = path5.join(getProjectsRoot(), slug);
  return getCachedDirFiles(dir, (name) => name.endsWith(".jsonl"));
}
async function listJsonlInDir(dir) {
  try {
    return (await fs7.readdir(dir)).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }
}
async function listProjectDirEntries() {
  try {
    const entries = await fs7.readdir(getProjectsRoot(), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
function isAssistantTurnInWindow(obj, startMs, endMs) {
  if (obj?.type !== "assistant")
    return false;
  if (!obj?.message?.usage)
    return false;
  const tsMs = obj.timestamp ? Date.parse(obj.timestamp) : NaN;
  if (Number.isNaN(tsMs))
    return false;
  return tsMs >= startMs && tsMs <= endMs;
}
async function countInWindowAssistantTurns(dir, startMs, endMs) {
  const files = await listJsonlInDir(dir);
  let count = 0;
  for (const f of files) {
    const full = path5.join(dir, f);
    for await (const obj of readJsonlLines(full)) {
      if (isAssistantTurnInWindow(obj, startMs, endMs))
        count += 1;
    }
  }
  return count;
}
async function autoDetectSourceProject({
  startedAt,
  completedAt
} = {}) {
  if (!startedAt)
    return null;
  const endIso = completedAt ?? new Date().toISOString();
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs))
    return null;
  const slugs = await listProjectDirEntries();
  let best = null;
  for (const slug of slugs) {
    const count = await countInWindowAssistantTurns(path5.join(getProjectsRoot(), slug), startMs, endMs);
    if (count > 0 && (best == null || count > best.count)) {
      best = { slug, count };
    }
  }
  return best ? best.slug : null;
}
async function listActiveProjectDirs({
  startMs,
  endMs
}) {
  const slugs = await listProjectDirEntries();
  const active = [];
  for (const slug of slugs) {
    const dir = path5.join(getProjectsRoot(), slug);
    const count = await countInWindowAssistantTurns(dir, startMs, endMs);
    if (count > 0)
      active.push({ slug, dir });
  }
  return active;
}
async function sessionsHaveInWindowAssistantTurns(files, startMs, endMs) {
  for (const file of files) {
    for await (const obj of readJsonlLines(file)) {
      if (isAssistantTurnInWindow(obj, startMs, endMs))
        return true;
    }
  }
  return false;
}
async function resolveAggregateAll(startMs, endMs) {
  const sessionsBySource = new Map;
  const active = await listActiveProjectDirs({ startMs, endMs });
  for (const { slug, dir } of active) {
    const files = (await fs7.readdir(dir)).filter((f) => f.endsWith(".jsonl")).map((f) => path5.join(dir, f));
    sessionsBySource.set(slug, files);
  }
  return sessionsBySource;
}
async function resolveSingleSource(repoPath, sourceProject, autoDetect, startedAt, endIso, startMs, endMs) {
  let effectiveSlug = sourceProject ?? slugifyRepoPath(repoPath);
  let autoDetected = false;
  let initialFiles = await listProjectSessions(repoPath, effectiveSlug);
  if (!sourceProject && autoDetect) {
    const hasActivity = await sessionsHaveInWindowAssistantTurns(initialFiles, startMs, endMs);
    if (!hasActivity) {
      const detected = await autoDetectSourceProject({ startedAt, completedAt: endIso });
      if (detected && detected !== effectiveSlug) {
        effectiveSlug = detected;
        initialFiles = await listProjectSessions(repoPath, effectiveSlug);
        autoDetected = true;
      }
    }
  }
  const sessionsBySource = new Map;
  sessionsBySource.set(effectiveSlug, initialFiles);
  return { sessionsBySource, effectiveSlug, autoDetected };
}
async function resolveScanSources({
  aggregateAll,
  sourceProject,
  autoDetect,
  repoPath,
  startedAt,
  endIso,
  startMs,
  endMs
}) {
  if (aggregateAll) {
    const sessionsBySource = await resolveAggregateAll(startMs, endMs);
    return { sessionsBySource, effectiveSlug: "aggregate", autoDetected: false };
  }
  return resolveSingleSource(repoPath, sourceProject, autoDetect, startedAt, endIso, startMs, endMs);
}
function priceByModel(byModel) {
  let totalUsd = 0;
  const unpriced = new Set;
  for (const model of Object.keys(byModel)) {
    const entry = byModel[model];
    if (entry == null)
      continue;
    const rates = priceFor(model);
    const usd = priceTokens(entry.tokens, ratesAsTokenKeys(rates));
    entry.usd = Number(usd.toFixed(4));
    entry.pricedAs = rates.matched;
    if (rates.matched == null)
      unpriced.add(model);
    totalUsd += usd;
  }
  return { totalUsd, unpricedModels: [...unpriced] };
}
function computeSourceBreakdown(perSourceState) {
  const out = [];
  for (const [slug, s] of perSourceState.entries()) {
    if (!s.touched)
      continue;
    let usd = 0;
    for (const [model, tokens] of Object.entries(s.modelTokens)) {
      const rates = priceFor(model);
      usd += priceTokens(tokens, ratesAsTokenKeys(rates));
    }
    out.push({ slug, messages: s.messages, usd: Number(usd.toFixed(4)) });
  }
  return out.sort((a, b) => b.usd - a.usd);
}
function buildModelMix(byModel, messagesCounted, totalUsd) {
  return Object.entries(byModel).map(([model, info]) => ({
    model,
    pricedAs: info.pricedAs,
    messages: info.messages,
    msgPct: messagesCounted > 0 ? Number((info.messages / messagesCounted * 100).toFixed(2)) : 0,
    usd: info.usd,
    usdPct: totalUsd > 0 ? Number((info.usd / totalUsd * 100).toFixed(2)) : 0
  })).sort((a, b) => b.usd - a.usd);
}
function computeSizeStats(toolResultSizes) {
  toolResultSizes.sort((a, b) => a - b);
  return {
    count: toolResultSizes.length,
    sumBytes: toolResultSizes.reduce((a, b) => a + b, 0),
    p50Bytes: percentile(toolResultSizes, 50),
    p90Bytes: percentile(toolResultSizes, 90),
    maxBytes: toolResultSizes[toolResultSizes.length - 1] ?? 0
  };
}
function collectFileReReadEntries(filesRead) {
  return Object.entries(filesRead).filter(([, c]) => c > 1).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
}
function buildToolUsage(toolUseCounts, toolFailureCounts) {
  return Object.entries(toolUseCounts).map(([name, count]) => ({ name, count, failures: toolFailureCounts[name] ?? 0 })).sort((a, b) => b.count - a.count);
}
function buildSessionFileMap(sessionsBySource) {
  const fileToSlug = new Map;
  const sessions = [];
  for (const [slug, files] of sessionsBySource.entries()) {
    for (const f of files) {
      fileToSlug.set(f, slug);
      sessions.push(f);
    }
  }
  return { fileToSlug, sessions };
}
function assembleCostResult(scan, sessions, effectiveSlug, autoDetected, aggregateAll, startedAt, endIso, startMs, endMs) {
  const {
    totals,
    byModel,
    messagesCounted,
    sessionsScanned,
    toolUseCounts,
    toolFailureCounts,
    toolResultSizes,
    filesRead,
    compactionCount,
    userMsgCount,
    userMsgTotalLen,
    skillInvocations,
    subagentDispatches,
    turnsBeforeFirstTool,
    perSourceState,
    toolCachePrime
  } = scan;
  const { totalUsd, unpricedModels } = priceByModel(byModel);
  const sources = computeSourceBreakdown(perSourceState);
  const modelMix = buildModelMix(byModel, messagesCounted, totalUsd);
  const sizeStats = computeSizeStats(toolResultSizes);
  const fileReReadEntries = collectFileReReadEntries(filesRead);
  const fileReReadCount = fileReReadEntries.reduce((a, [, c]) => a + ((c ?? 0) - 1), 0);
  const toolUsage = buildToolUsage(toolUseCounts, toolFailureCounts);
  const conversation = {
    userMsgCount,
    userMsgAvgLen: userMsgCount > 0 ? Math.round(userMsgTotalLen / userMsgCount) : 0,
    userMsgTotalLen,
    turnsBeforeFirstTool,
    compactionCount,
    skillInvocations,
    subagentDispatches
  };
  const toolCachePrimeArr = Object.entries(toolCachePrime).map(([name, v]) => ({
    name,
    calls: v.calls,
    totalResultBytes: v.totalResultBytes,
    attributedCacheCreate: Math.round(v.attributedCacheCreate),
    ratio: v.totalResultBytes > 0 ? Number((v.attributedCacheCreate / v.totalResultBytes).toFixed(2)) : null
  })).sort((a, b) => b.attributedCacheCreate - a.attributedCacheCreate);
  return {
    window: { start: startedAt, end: endIso, durationMs: endMs - startMs },
    totals,
    usd: Number(totalUsd.toFixed(4)),
    byModel,
    modelMix,
    messagesCounted,
    sessionsScanned,
    sessionsAvailable: sessions.length,
    sourceProject: effectiveSlug,
    autoDetected,
    aggregateAll,
    sources,
    unpriced_models: unpricedModels,
    toolUsage,
    toolResultSizes: sizeStats,
    fileReReadCount,
    fileReReadTopPaths: fileReReadEntries.slice(0, 5).map(([p, c]) => ({ path: p, reads: c })),
    conversation,
    toolCachePrime: toolCachePrimeArr
  };
}
async function computeSessionCost(repoPath, {
  startedAt,
  completedAt,
  sourceProject = null,
  autoDetect = true,
  aggregateAll = false
} = {}) {
  if (!startedAt)
    throw new Error("computeSessionCost requires startedAt");
  const endIso = completedAt ?? new Date().toISOString();
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new Error(`Invalid window: startedAt=${startedAt} completedAt=${endIso}`);
  }
  const { sessionsBySource, effectiveSlug, autoDetected } = await resolveScanSources({
    aggregateAll,
    sourceProject,
    autoDetect,
    repoPath,
    startedAt,
    endIso,
    startMs,
    endMs
  });
  const { fileToSlug, sessions } = buildSessionFileMap(sessionsBySource);
  const scan = await scanSessions({ sessions, fileToSlug, startMs, endMs });
  return assembleCostResult(scan, sessions, effectiveSlug, autoDetected, aggregateAll, startedAt, endIso, startMs, endMs);
}
var init_session_cost = __esm(() => {
  init_pricing();
  init_session_cost_scanner();
  init_dir_cache();
});

// crew/scripts/lib/outcome-linkage.mts
var exports_outcome_linkage = {};
__export(exports_outcome_linkage, {
  collectOutcomeLinkage: () => collectOutcomeLinkage
});
import fs8 from "fs/promises";
import path6 from "path";
function extractSliceId(text) {
  if (!text)
    return null;
  const m = String(text).match(SLICE_RE);
  return m ? `SLICE-${String(Number(m[1])).padStart(2, "0")}` : null;
}
async function readIfExists(file) {
  try {
    return await fs8.readFile(file, "utf8");
  } catch (err2) {
    if (err2.code === "ENOENT")
      return null;
    throw err2;
  }
}
async function listIfExists(dir) {
  try {
    return await fs8.readdir(dir);
  } catch {
    return [];
  }
}
function parseScoresFromBody(text) {
  if (!text)
    return null;
  const dimensions = [
    "architecture_quality",
    "reliability",
    "observability",
    "production_readiness",
    "security",
    "test_confidence",
    "product_completeness"
  ];
  const out = {};
  for (const dim of dimensions) {
    const re = new RegExp(`^-\\s+${dim}:\\s*([0-9.]+)`, "m");
    const m = text.match(re);
    if (m && m[1] !== undefined)
      out[dim] = Number(m[1]);
  }
  return Object.keys(out).length > 0 ? out : null;
}
function avgScores2(scores) {
  if (!scores)
    return null;
  const vals = Object.values(scores).filter((v) => typeof v === "number");
  if (vals.length === 0)
    return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3));
}
async function findLatestMatching(dir, sliceNumber) {
  const files = await listIfExists(dir);
  const pat = new RegExp(`slice[-_]?0*${sliceNumber}\\b`, "i");
  const matches = files.filter((f) => pat.test(f));
  if (matches.length === 0)
    return null;
  matches.sort();
  return path6.join(dir, matches[matches.length - 1]);
}
function parseDecision(text) {
  if (!text)
    return null;
  const m = text.match(/^-\s*Decision:\s*([\w_-]+)/im) || text.match(/^decision:\s*([\w_-]+)/im);
  return m && m[1] !== undefined ? m[1] : null;
}
function parseReviewReboundCount(text) {
  if (!text)
    return null;
  const m = text.match(/^review_rebound_count:\s*(\d+)\s*$/m);
  if (!m || m[1] === undefined)
    return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
async function findArtifactDecision(dir, sliceNumber) {
  const filePath = await findLatestMatching(dir, sliceNumber);
  const decision = parseDecision(await readIfExists(filePath ?? ""));
  return { filePath, decision };
}
async function collectOutcomeLinkage(repoPath, runTitle) {
  const sliceId = extractSliceId(runTitle);
  if (!sliceId)
    return { sliceId: null };
  const sliceNumber = sliceId.replace(/^SLICE-/, "").replace(/^0+/, "") || "0";
  const gradePath = path6.join(repoPath, "docs/grades", `${sliceId}-grade.md`);
  const gradeText = await readIfExists(gradePath);
  const scores = parseScoresFromBody(gradeText);
  const gradeAvg = avgScores2(scores);
  const reviewReboundCount = parseReviewReboundCount(gradeText);
  const reviewsDir = path6.join(repoPath, ".claude/artifacts/crew/reviews");
  const validationsDir = path6.join(repoPath, ".claude/artifacts/crew/validations");
  const review = await findArtifactDecision(reviewsDir, sliceNumber);
  const validation = await findArtifactDecision(validationsDir, sliceNumber);
  return {
    sliceId,
    gradePath: gradeText ? gradePath : null,
    scores,
    gradeAvg,
    reviewReboundCount,
    reviewPath: review.filePath,
    reviewDecision: review.decision,
    validationPath: validation.filePath,
    validationDecision: validation.decision
  };
}
var SLICE_RE;
var init_outcome_linkage = __esm(() => {
  SLICE_RE = /SLICE[-_](\d+)/i;
});

// crew/scripts/lib/cost-hygiene/decide.mts
function decideCostVerdict(unpricedModels) {
  return unpricedModels && unpricedModels.length > 0 ? "unknown" : "pass";
}

// crew/scripts/lib/cost-hygiene/render-frontmatter.mts
function nowIso3() {
  return new Date().toISOString();
}
function resolveVariantLines(breakdown, isSlice) {
  return {
    aggregateAllPredicate: isSlice ? true : Boolean(breakdown?.aggregateAll),
    aggregateAllLine: isSlice ? "aggregate_all: false" : "aggregate_all: true",
    sourceCountPredicate: isSlice ? true : Boolean(breakdown?.sources?.length),
    sourceCountLine: isSlice ? "source_count: 1" : `source_count: ${breakdown?.sources?.length ?? 0}`
  };
}
function buildOptionalLines(fields, breakdown, outcome, totalTokens, cacheHitPct, variant) {
  const durationMs = breakdown?.window?.durationMs ?? 0;
  const { aggregateAllPredicate, aggregateAllLine, sourceCountPredicate, sourceCountLine } = variant;
  return [
    [
      fields.phase != null && String(fields.phase).length > 0,
      () => `phase: ${JSON.stringify(String(fields.phase))}`
    ],
    [fields.feature, () => `feature: ${fields.feature}`],
    [outcome?.sliceId, () => `slice: ${outcome.sliceId}`],
    [true, () => `run_title: ${JSON.stringify(fields.runTitle || "")}`],
    [breakdown?.usd != null, () => `usd: ${breakdown.usd}`],
    [durationMs, () => `duration_ms: ${durationMs}`],
    [totalTokens, () => `total_tokens: ${totalTokens}`],
    [cacheHitPct !== "-", () => `cache_hit_pct: ${cacheHitPct}`],
    [outcome?.gradeAvg != null, () => `grade_avg: ${outcome.gradeAvg}`],
    [outcome?.reviewDecision, () => `review_decision: ${outcome.reviewDecision}`],
    [outcome?.validationDecision, () => `validation_decision: ${outcome.validationDecision}`],
    [breakdown?.sourceProject, () => `source_project: ${breakdown.sourceProject}`],
    [breakdown?.autoDetected, () => `auto_detected: true`],
    [aggregateAllPredicate, () => aggregateAllLine],
    [sourceCountPredicate, () => sourceCountLine],
    [
      (breakdown?.unpriced_models?.length ?? 0) > 0,
      () => `unpriced_models: ${JSON.stringify(breakdown.unpriced_models)}`
    ],
    [decideCostVerdict(breakdown?.unpriced_models) === "unknown", () => `verdict: unknown`],
    [fields.runId, () => `run_id: ${JSON.stringify(String(fields.runId))}`]
  ];
}
function renderCostReportFrontmatter(fields, breakdown, outcome, totalTokens, cacheHitPct, variant = null) {
  const variantLines = resolveVariantLines(breakdown, variant === "slice");
  const optional = buildOptionalLines(fields, breakdown, outcome, totalTokens, cacheHitPct, variantLines);
  return [
    "---",
    "kind: cost-report",
    ...optional.filter(([cond]) => cond).map(([, build]) => build()),
    `created_at: ${nowIso3()}`,
    "---"
  ];
}
var init_render_frontmatter = () => {};

// crew/scripts/lib/artifacts/read.mts
import fs9 from "fs/promises";
import path7 from "path";
async function safeReaddirStrings(dir) {
  try {
    return await fs9.readdir(dir);
  } catch {
    return [];
  }
}
async function readSkillDirs(repoPath) {
  try {
    const entries = await fs9.readdir(path7.join(repoPath, "skills"), {
      withFileTypes: true
    });
    const joined = entries.filter((e) => e.isDirectory()).map((e) => `${e.name}/`).join(", ");
    return joined || "(not found)";
  } catch {
    return "(not found)";
  }
}
async function readNpmScripts(repoPath) {
  try {
    const pkg = JSON.parse(await fs9.readFile(path7.join(repoPath, "package.json"), "utf8"));
    return Object.keys(pkg.scripts ?? {}).join(", ") || "(not found)";
  } catch {
    return "(not found)";
  }
}
async function buildRepoLayoutBlock(repoPath) {
  const scripts = (await safeReaddirStrings(path7.join(repoPath, "scripts"))).filter((e) => e.endsWith(".mjs")).join(", ") || "(not found)";
  const agents = (await safeReaddirStrings(path7.join(repoPath, "agents"))).filter((e) => e.endsWith(".md")).join(", ") || "(not found)";
  const skillDirs = await readSkillDirs(repoPath);
  const tests = (await safeReaddirStrings(path7.join(repoPath, "tests"))).filter((e) => e.endsWith(".mjs")).join(", ") || "(not found)";
  const npmScripts = await readNpmScripts(repoPath);
  return [
    "",
    "## Repo Layout (auto-discovered at handoff write time)",
    `scripts/: ${scripts}`,
    `agents/: ${agents}`,
    `skills/: ${skillDirs}`,
    `tests/: ${tests}`,
    `npm scripts: ${npmScripts}`,
    ""
  ].join(`
`);
}
var init_read = () => {};

// crew/scripts/lib/guarded-fire.mts
function timeoutAfter(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), ms);
    timer.unref?.();
  });
}
async function fireGuarded(run, timeoutMs = DEFAULT_GUARD_TIMEOUT_MS) {
  try {
    await Promise.race([run(), timeoutAfter(timeoutMs)]);
  } catch {}
}
var DEFAULT_GUARD_TIMEOUT_MS = 1500;

// ../../../crew/node_modules/zod/v3/helpers/util.js
var util, objectUtil, ZodParsedType, getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var init_util = __esm(() => {
  (function(util2) {
    util2.assertEqual = (_) => {};
    function assertIs(_arg) {}
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error;
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
      };
    };
  })(objectUtil || (objectUtil = {}));
  ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
});

// ../../../crew/node_modules/zod/v3/ZodError.js
var ZodIssueCode, quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, ZodError;
var init_ZodError = __esm(() => {
  init_util();
  ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  ZodError = class ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue.path.length) {
              const el = issue.path[i];
              const terminal = i === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };
});

// ../../../crew/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
}, en_default;
var init_en = __esm(() => {
  init_ZodError();
  init_util();
  en_default = errorMap;
});

// ../../../crew/node_modules/zod/v3/errors.js
function setErrorMap(map2) {
  overrideErrorMap = map2;
}
function getErrorMap() {
  return overrideErrorMap;
}
var overrideErrorMap;
var init_errors2 = __esm(() => {
  init_en();
  overrideErrorMap = en_default;
});

// ../../../crew/node_modules/zod/v3/helpers/parseUtil.js
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default ? undefined : en_default
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var makeIssue = (params) => {
  const { data, path: path8, errorMaps, issueData } = params;
  const fullPath = [...path8, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map2 of maps) {
    errorMessage = map2(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, EMPTY_PATH, INVALID, DIRTY = (value) => ({ status: "dirty", value }), OK = (value) => ({ status: "valid", value }), isAborted = (x) => x.status === "aborted", isDirty = (x) => x.status === "dirty", isValid = (x) => x.status === "valid", isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
var init_parseUtil = __esm(() => {
  init_errors2();
  init_en();
  EMPTY_PATH = [];
  INVALID = Object.freeze({
    status: "aborted"
  });
});

// ../../../crew/node_modules/zod/v3/helpers/typeAliases.js
var init_typeAliases = () => {};

// ../../../crew/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
var init_errorUtil = __esm(() => {
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));
});

// ../../../crew/node_modules/zod/v3/types.js
class ParseInputLazyPath {
  constructor(parent, value, path8, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path8;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result2 = this._parse(input);
    if (isAsync(result2)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result2;
  }
  _parseAsync(input) {
    const result2 = this._parse(input);
    return Promise.resolve(result2);
  }
  parse(data, params) {
    const result2 = this.safeParse(data, params);
    if (result2.success)
      return result2.data;
    throw result2.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result2 = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result2);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result2 = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result2) ? {
          value: result2.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err2) {
        if (err2?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result2) => isValid(result2) ? {
      value: result2.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result2 = await this.safeParseAsync(data, params);
    if (result2.success)
      return result2.data;
    throw result2.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result2 = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result2);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result2 = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result2 instanceof Promise) {
        return result2.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result2) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var handleResult = (ctx, result2) => {
  if (isValid(result2)) {
    return { success: true, data: result2.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
}, cuidRegex, cuid2Regex, ulidRegex, uuidRegex, nanoidRegex, jwtRegex, durationRegex, emailRegex, _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`, emojiRegex, ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex, base64Regex, base64urlRegex, dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`, dateRegex, ZodString, ZodNumber, ZodBigInt, ZodBoolean, ZodDate, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodArray, ZodObject, ZodUnion, getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodFunction, ZodLazy, ZodLiteral, ZodEnum, ZodNativeEnum, ZodPromise, ZodEffects, ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodNaN, BRAND, ZodBranded, ZodPipeline, ZodReadonly, late, ZodFirstPartyTypeKind, instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), stringType, numberType, nanType, bigIntType, booleanType, dateType, symbolType, undefinedType, nullType, anyType, unknownType, neverType, voidType, arrayType, objectType, strictObjectType, unionType, discriminatedUnionType, intersectionType, tupleType, recordType, mapType, setType, functionType, lazyType, literalType, enumType, nativeEnumType, promiseType, effectsType, optionalType, nullableType, preprocessType, pipelineType, ostring = () => stringType().optional(), onumber = () => numberType().optional(), oboolean = () => booleanType().optional(), coerce, NEVER;
var init_types = __esm(() => {
  init_ZodError();
  init_errors2();
  init_errorUtil();
  init_parseUtil();
  init_util();
  cuidRegex = /^c[^\s-]{8,}$/i;
  cuid2Regex = /^[0-9a-z]+$/;
  ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  nanoidRegex = /^[a-z0-9_-]{21}$/i;
  jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  dateRegex = new RegExp(`^${dateRegexSource}$`);
  ZodString = class ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus;
      let ctx = undefined;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  ZodNumber = class ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = undefined;
      const status = new ParseStatus;
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  ZodBigInt = class ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = undefined;
      const status = new ParseStatus;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  ZodBoolean = class ZodBoolean extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  ZodDate = class ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus;
      let ctx = undefined;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  ZodSymbol = class ZodSymbol extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  ZodUndefined = class ZodUndefined extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  ZodNull = class ZodNull extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  ZodAny = class ZodAny extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  ZodUnknown = class ZodUnknown extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  ZodNever = class ZodNever extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  ZodVoid = class ZodVoid extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  ZodArray = class ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : undefined,
            maximum: tooBig ? def.exactLength.value : undefined,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result3) => {
          return ParseStatus.mergeArray(status, result3);
        });
      }
      const result2 = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result2);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  ZodObject = class ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {} else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== undefined ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    extend(augmentation) {
      return new ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    merge(merging) {
      const merged = new ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    catchall(index) {
      return new ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodUnion = class ZodUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result2 of results) {
          if (result2.result.status === "valid") {
            return result2.result;
          }
        }
        for (const result2 of results) {
          if (result2.result.status === "dirty") {
            ctx.common.issues.push(...result2.ctx.common.issues);
            return result2.result;
          }
        }
        const unionErrors = results.map((result2) => new ZodError(result2.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = undefined;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result2 = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result2.status === "valid") {
            return result2;
          } else if (result2.status === "dirty" && !dirty) {
            dirty = { result: result2, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  ZodDiscriminatedUnion = class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    static create(discriminator, options, params) {
      const optionsMap = new Map;
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  ZodIntersection = class ZodIntersection extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  ZodTuple = class ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  ZodRecord = class ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  ZodMap = class ZodMap extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = new Map;
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = new Map;
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  ZodSet = class ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = new Set;
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  ZodFunction = class ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result2 = await Reflect.apply(fn, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result2, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result2, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result2 = Reflect.apply(fn, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result2, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result2, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  ZodLazy = class ZodLazy extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  ZodLiteral = class ZodLiteral extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  ZodEnum = class ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  ZodNativeEnum = class ZodNativeEnum extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  ZodPromise = class ZodPromise extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  ZodEffects = class ZodEffects extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result2 = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result2.status === "aborted")
              return INVALID;
            if (result2.status === "dirty")
              return DIRTY(result2.value);
            if (status.value === "dirty")
              return DIRTY(result2.value);
            return result2;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result2 = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result2.status === "aborted")
            return INVALID;
          if (result2.status === "dirty")
            return DIRTY(result2.value);
          if (status.value === "dirty")
            return DIRTY(result2.value);
          return result2;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result2 = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result2);
          }
          if (result2 instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result2 = effect.transform(base.value, checkCtx);
          if (result2 instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result2 };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result2) => ({
              status: status.value,
              value: result2
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  ZodOptional = class ZodOptional extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(undefined);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  ZodNullable = class ZodNullable extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  ZodDefault = class ZodDefault extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  ZodCatch = class ZodCatch extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result2 = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result2)) {
        return result2.then((result3) => {
          return {
            status: "valid",
            value: result3.status === "valid" ? result3.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  ZodNaN = class ZodNaN extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  BRAND = Symbol("zod_brand");
  ZodBranded = class ZodBranded extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  ZodPipeline = class ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  ZodReadonly = class ZodReadonly extends ZodType {
    _parse(input) {
      const result2 = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result2) ? result2.then((data) => freeze(data)) : freeze(result2);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  late = {
    object: ZodObject.lazycreate
  };
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  stringType = ZodString.create;
  numberType = ZodNumber.create;
  nanType = ZodNaN.create;
  bigIntType = ZodBigInt.create;
  booleanType = ZodBoolean.create;
  dateType = ZodDate.create;
  symbolType = ZodSymbol.create;
  undefinedType = ZodUndefined.create;
  nullType = ZodNull.create;
  anyType = ZodAny.create;
  unknownType = ZodUnknown.create;
  neverType = ZodNever.create;
  voidType = ZodVoid.create;
  arrayType = ZodArray.create;
  objectType = ZodObject.create;
  strictObjectType = ZodObject.strictCreate;
  unionType = ZodUnion.create;
  discriminatedUnionType = ZodDiscriminatedUnion.create;
  intersectionType = ZodIntersection.create;
  tupleType = ZodTuple.create;
  recordType = ZodRecord.create;
  mapType = ZodMap.create;
  setType = ZodSet.create;
  functionType = ZodFunction.create;
  lazyType = ZodLazy.create;
  literalType = ZodLiteral.create;
  enumType = ZodEnum.create;
  nativeEnumType = ZodNativeEnum.create;
  promiseType = ZodPromise.create;
  effectsType = ZodEffects.create;
  optionalType = ZodOptional.create;
  nullableType = ZodNullable.create;
  preprocessType = ZodEffects.createWithPreprocess;
  pipelineType = ZodPipeline.create;
  coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  };
  NEVER = INVALID;
});

// ../../../crew/node_modules/zod/v3/external.js
var exports_external = {};
__export(exports_external, {
  void: () => voidType,
  util: () => util,
  unknown: () => unknownType,
  union: () => unionType,
  undefined: () => undefinedType,
  tuple: () => tupleType,
  transformer: () => effectsType,
  symbol: () => symbolType,
  string: () => stringType,
  strictObject: () => strictObjectType,
  setErrorMap: () => setErrorMap,
  set: () => setType,
  record: () => recordType,
  quotelessJson: () => quotelessJson,
  promise: () => promiseType,
  preprocess: () => preprocessType,
  pipeline: () => pipelineType,
  ostring: () => ostring,
  optional: () => optionalType,
  onumber: () => onumber,
  oboolean: () => oboolean,
  objectUtil: () => objectUtil,
  object: () => objectType,
  number: () => numberType,
  nullable: () => nullableType,
  null: () => nullType,
  never: () => neverType,
  nativeEnum: () => nativeEnumType,
  nan: () => nanType,
  map: () => mapType,
  makeIssue: () => makeIssue,
  literal: () => literalType,
  lazy: () => lazyType,
  late: () => late,
  isValid: () => isValid,
  isDirty: () => isDirty,
  isAsync: () => isAsync,
  isAborted: () => isAborted,
  intersection: () => intersectionType,
  instanceof: () => instanceOfType,
  getParsedType: () => getParsedType,
  getErrorMap: () => getErrorMap,
  function: () => functionType,
  enum: () => enumType,
  effect: () => effectsType,
  discriminatedUnion: () => discriminatedUnionType,
  defaultErrorMap: () => en_default,
  datetimeRegex: () => datetimeRegex,
  date: () => dateType,
  custom: () => custom,
  coerce: () => coerce,
  boolean: () => booleanType,
  bigint: () => bigIntType,
  array: () => arrayType,
  any: () => anyType,
  addIssueToContext: () => addIssueToContext,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransformer: () => ZodEffects,
  ZodSymbol: () => ZodSymbol,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodSchema: () => ZodType,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPipeline: () => ZodPipeline,
  ZodParsedType: () => ZodParsedType,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNever: () => ZodNever,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEffects: () => ZodEffects,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCatch: () => ZodCatch,
  ZodBranded: () => ZodBranded,
  ZodBoolean: () => ZodBoolean,
  ZodBigInt: () => ZodBigInt,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  Schema: () => ZodType,
  ParseStatus: () => ParseStatus,
  OK: () => OK,
  NEVER: () => NEVER,
  INVALID: () => INVALID,
  EMPTY_PATH: () => EMPTY_PATH,
  DIRTY: () => DIRTY,
  BRAND: () => BRAND
});
var init_external = __esm(() => {
  init_errors2();
  init_parseUtil();
  init_typeAliases();
  init_util();
  init_types();
  init_ZodError();
});

// ../../../crew/node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/schema.js
var MAX_SUMMARY_LENGTH = 280, IsoTimestamp, MemorySeveritySchema, MemoryKindSchema, MemoryEntrySchema, MemoryEntryInputSchema, MemoryProviderKindSchema, MemoryEnabledModeSchema, RecallConfigSchema, DEFAULT_CAPTURE_EVENTS, CaptureConfigSchema, MemoryConfigSchema;
var init_schema = __esm(() => {
  init_zod();
  IsoTimestamp = exports_external.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "expected an ISO 8601 timestamp" });
  MemorySeveritySchema = exports_external.enum(["critical", "high", "medium", "low"]);
  MemoryKindSchema = exports_external.enum(["failure", "lesson", "decision", "standard_violation"]);
  MemoryEntrySchema = exports_external.object({
    id: exports_external.string().min(1),
    ts: IsoTimestamp,
    kind: MemoryKindSchema,
    severity: MemorySeveritySchema,
    agent: exports_external.string().nullable().optional(),
    tags: exports_external.array(exports_external.string()).default([]),
    summary: exports_external.string().min(1).max(MAX_SUMMARY_LENGTH),
    detail: exports_external.string().optional(),
    source: exports_external.string().min(1),
    supersedes: exports_external.string().optional()
  });
  MemoryEntryInputSchema = MemoryEntrySchema.extend({
    id: exports_external.string().min(1).optional(),
    ts: IsoTimestamp.optional()
  });
  MemoryProviderKindSchema = exports_external.enum(["none", "file", "astramem"]);
  MemoryEnabledModeSchema = exports_external.enum(["auto", "never"]);
  RecallConfigSchema = exports_external.object({
    enabled: exports_external.boolean().default(true),
    k: exports_external.number().int().positive().default(5),
    timeoutMs: exports_external.number().int().positive().default(5000),
    maxTokens: exports_external.number().int().positive().default(800)
  }).strict();
  DEFAULT_CAPTURE_EVENTS = [
    "slice_close",
    "review_fail",
    "validation_fail",
    "inline_return_warn",
    "subagent_incomplete",
    "incident_close"
  ];
  CaptureConfigSchema = exports_external.object({
    events: exports_external.array(exports_external.string()).default(DEFAULT_CAPTURE_EVENTS)
  }).strict();
  MemoryConfigSchema = exports_external.object({
    enabled: MemoryEnabledModeSchema.default("auto"),
    provider: MemoryProviderKindSchema.default("none"),
    dualWrite: exports_external.boolean().default(false),
    project: exports_external.string().optional(),
    recall: RecallConfigSchema.default({}),
    capture: CaptureConfigSchema.default({}),
    profile: exports_external.object({}).passthrough().optional(),
    feedback: exports_external.object({}).passthrough().optional()
  }).strict();
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/config.js
function parseMemoryConfig(raw) {
  return MemoryConfigSchema.parse(raw ?? {});
}
function resolveEffectiveConfig(config) {
  const providerDisabled = config.provider === "none";
  const enabledDisabled = config.enabled === "never";
  const captureEnabled = !providerDisabled && !enabledDisabled;
  return {
    captureEnabled,
    recallEnabled: captureEnabled && config.recall.enabled,
    provider: config.provider,
    dualWrite: config.dualWrite,
    recall: {
      k: config.recall.k,
      timeoutMs: config.recall.timeoutMs,
      maxTokens: config.recall.maxTokens
    },
    project: config.project
  };
}
var init_config = __esm(() => {
  init_schema();
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/noop-provider.js
function noopProvider() {
  return {
    describe: () => ({ provider: "noop" }),
    async capture() {},
    async recall() {
      return [];
    },
    async supersede() {},
    async invalidate() {},
    async profile() {
      return null;
    },
    async feedback() {
      return false;
    }
  };
}

// ../../../crew/node_modules/@astragenie/memory-provider/dist/ranking.js
function isDecayed(entry, now) {
  if (entry.severity === "critical")
    return false;
  const ageMs = now - Date.parse(entry.ts);
  return ageMs > DECAY_DAYS * MS_PER_DAY;
}
function estimateTokens(text) {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}
function collectSupersededIds(entries) {
  const superseded = new Set;
  for (const entry of entries) {
    if (entry.supersedes)
      superseded.add(entry.supersedes);
  }
  return superseded;
}
function matchesScope(entry, opts) {
  if (opts.agent && entry.agent && entry.agent !== opts.agent)
    return false;
  if (opts.tags && opts.tags.length > 0) {
    return entry.tags.some((tag) => opts.tags?.includes(tag));
  }
  return true;
}
function scoreEntry(entry, now) {
  const ageMs = Math.max(0, now - Date.parse(entry.ts));
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const recencyScore = 1 / (1 + ageDays);
  return SEVERITY_WEIGHT[entry.severity] * recencyScore;
}
function rankAndTruncate(entries, invalidatedIds, opts) {
  const supersededIds = collectSupersededIds(entries);
  const now = (opts.now ?? new Date).getTime();
  const eligible = entries.filter((entry) => !supersededIds.has(entry.id) && !invalidatedIds.has(entry.id) && !isDecayed(entry, now) && matchesScope(entry, opts));
  const scored = eligible.map((entry) => ({ entry, score: scoreEntry(entry, now) })).sort((a, b) => b.score - a.score || Date.parse(b.entry.ts) - Date.parse(a.entry.ts));
  const topK = scored.slice(0, opts.k).map((s) => s.entry);
  const truncated = [];
  let remainingBudget = opts.maxTokens;
  for (const entry of topK) {
    const cost = estimateTokens(entry.summary);
    if (cost > remainingBudget)
      break;
    truncated.push(entry);
    remainingBudget -= cost;
  }
  return truncated;
}
var SEVERITY_WEIGHT, CHARS_PER_TOKEN = 4, DECAY_DAYS = 45, MS_PER_DAY;
var init_ranking = __esm(() => {
  SEVERITY_WEIGHT = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  MS_PER_DAY = 24 * 60 * 60 * 1000;
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/jsonl.js
import { appendFile as appendFile2, mkdir as mkdir2, open } from "fs/promises";
import * as path8 from "path";
async function appendJsonlEntry(repoPath, segments, entry) {
  try {
    const targetPath = path8.join(repoPath, ...segments);
    await mkdir2(path8.dirname(targetPath), { recursive: true });
    await appendFile2(targetPath, `${JSON.stringify(entry)}
`, { flag: "a" });
  } catch {}
}
async function tailReadJsonl(filePath, count, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_TAIL_BYTES;
  let handle;
  try {
    handle = await open(filePath, "r");
  } catch (err2) {
    if (err2.code === "ENOENT")
      return [];
    throw err2;
  }
  try {
    const stat2 = await handle.stat();
    if (stat2.size === 0)
      return [];
    const start = Math.max(0, stat2.size - maxBytes);
    const length = stat2.size - start;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    let raw = buffer.toString("utf8");
    if (start > 0) {
      const firstNewline = raw.indexOf(`
`);
      raw = firstNewline === -1 ? "" : raw.slice(firstNewline + 1);
    }
    return raw.split(`
`).map((line) => line.trim()).filter(Boolean).slice(-count).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {};
      }
    });
  } finally {
    await handle.close();
  }
}
var DEFAULT_TAIL_BYTES;
var init_jsonl2 = __esm(() => {
  DEFAULT_TAIL_BYTES = 64 * 1024;
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/legacy-adapter.js
function isValidKind(value) {
  return typeof value === "string" && VALID_KINDS.includes(value);
}
function isValidSeverity(value) {
  return typeof value === "string" && ["critical", "high", "medium", "low"].includes(value);
}
function fromCaptureRepairShape(raw, indexHint) {
  const candidate = {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `legacy-gen2-${indexHint}`,
    ts: raw.ts,
    kind: isValidKind(raw.kind) ? raw.kind : "failure",
    severity: isValidSeverity(raw.severity) ? raw.severity : DEFAULT_SEVERITY,
    agent: typeof raw.agent === "string" ? raw.agent : null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    summary: raw.summary.slice(0, MAX_SUMMARY_LENGTH2),
    source: raw.source
  };
  const parsed = MemoryEntrySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
function fromPreCaptureRepairShape(raw, indexHint) {
  const candidate = {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `legacy-gen1-${indexHint}`,
    ts: raw.timestamp,
    kind: "lesson",
    severity: DEFAULT_SEVERITY,
    agent: null,
    tags: typeof raw.key === "string" ? [raw.key] : [],
    summary: raw.insight.slice(0, MAX_SUMMARY_LENGTH2),
    source: "legacy"
  };
  const parsed = MemoryEntrySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
function normalizeLegacyRow(raw, indexHint) {
  if (!raw || typeof raw !== "object")
    return null;
  const row = raw;
  const direct = MemoryEntrySchema.safeParse(row);
  if (direct.success)
    return direct.data;
  if (typeof row.summary === "string" && typeof row.source === "string" && typeof row.ts === "string") {
    return fromCaptureRepairShape(row, indexHint);
  }
  if (typeof row.insight === "string" && typeof row.timestamp === "string") {
    return fromPreCaptureRepairShape(row, indexHint);
  }
  return null;
}
var MAX_SUMMARY_LENGTH2 = 280, DEFAULT_SEVERITY = "medium", VALID_KINDS;
var init_legacy_adapter = __esm(() => {
  init_schema();
  VALID_KINDS = ["failure", "lesson", "decision", "standard_violation"];
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/file-provider.js
import { randomUUID } from "crypto";
import * as path9 from "path";
function toStoredEntry(input, supersedesOverride) {
  return MemoryEntrySchema.parse({
    id: input.id ?? randomUUID(),
    ts: input.ts ?? new Date().toISOString(),
    kind: input.kind,
    severity: input.severity,
    agent: input.agent ?? null,
    tags: input.tags ?? [],
    summary: input.summary.slice(0, MAX_SUMMARY_LENGTH3),
    detail: input.detail,
    source: input.source,
    supersedes: supersedesOverride ?? input.supersedes
  });
}
function fileProvider(repoPath, options = {}) {
  const defaultK = options.recall?.k ?? DEFAULT_K;
  const defaultMaxTokens = options.recall?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const storePath = options.storePath ?? DEFAULT_STORE_PATH;
  const normalizeRow = options.normalizeRow ?? normalizeLegacyRow;
  async function readAllRaw() {
    const targetPath = path9.join(repoPath, ...storePath);
    return tailReadJsonl(targetPath, FULL_STORE_RECORD_CAP, { maxBytes: FULL_STORE_MAX_BYTES });
  }
  return {
    describe: () => ({ provider: "file" }),
    async capture(input) {
      await appendJsonlEntry(repoPath, storePath, toStoredEntry(input));
    },
    async recall(query) {
      const raw = await readAllRaw();
      const invalidated = new Set;
      const entries = [];
      raw.forEach((row, index) => {
        if (row && row[TOMBSTONE_MARKER] === true && typeof row.targetId === "string") {
          invalidated.add(row.targetId);
          return;
        }
        const normalized = normalizeRow(row, index);
        if (normalized)
          entries.push(normalized);
      });
      return rankAndTruncate(entries, invalidated, {
        ...query.agent !== undefined ? { agent: query.agent } : {},
        ...query.tags !== undefined ? { tags: query.tags } : {},
        k: query.k ?? defaultK,
        maxTokens: query.maxTokens ?? defaultMaxTokens
      });
    },
    async supersede(id, replacement) {
      await appendJsonlEntry(repoPath, storePath, toStoredEntry(replacement, replacement.supersedes ?? id));
    },
    async invalidate(id) {
      await appendJsonlEntry(repoPath, storePath, {
        [TOMBSTONE_MARKER]: true,
        targetId: id,
        ts: new Date().toISOString()
      });
    },
    async profile() {
      return null;
    },
    async feedback() {
      return false;
    }
  };
}
var DEFAULT_K = 5, DEFAULT_MAX_TOKENS = 800, MAX_SUMMARY_LENGTH3 = 280, FULL_STORE_MAX_BYTES, FULL_STORE_RECORD_CAP, TOMBSTONE_MARKER = "__memory_invalidated__", DEFAULT_STORE_PATH;
var init_file_provider = __esm(() => {
  init_jsonl2();
  init_legacy_adapter();
  init_ranking();
  init_schema();
  FULL_STORE_MAX_BYTES = 16 * 1024 * 1024;
  FULL_STORE_RECORD_CAP = Number.MAX_SAFE_INTEGER;
  DEFAULT_STORE_PATH = [".claude", "artifacts", "loop", "learnings.jsonl"];
});

// ../../../crew/node_modules/@astragenie/astramem-client/dist/resolve.js
import { spawn } from "child_process";
import * as fs10 from "fs/promises";
import * as path10 from "path";
import { pathToFileURL } from "url";
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
  return new Promise((resolve) => {
    try {
      const proc = spawn(whichCmd, ["astramem"], { stdio: ["ignore", "pipe", "ignore"] });
      let out = "";
      proc.stdout?.on("data", (chunk) => {
        out += chunk.toString();
      });
      proc.on("close", (code) => {
        const line = out.split(/\r?\n/)[0]?.trim() ?? "";
        resolve(code === 0 && line.length > 0 ? line : null);
      });
      proc.on("error", () => resolve(null));
    } catch {
      resolve(null);
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
  if (_cache2 !== null)
    return _cache2 === false ? null : _cache2;
  const provider = await resolveUncached();
  _cache2 = provider ?? false;
  return provider;
}
var __rewriteRelativeImportExtension = function(path11, preserveJsx) {
  if (typeof path11 === "string" && /^\.\.?\//.test(path11)) {
    return path11.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
      return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
    });
  }
  return path11;
}, PLUGIN_PKG = "@astragenie/astramem-plugin", SELECTOR_SPECIFIER, PROVIDERS_LOCAL_SPECIFIER, PROVIDERS_SAAS_SPECIFIER, _cache2 = null, _injected;
var init_resolve = __esm(() => {
  SELECTOR_SPECIFIER = [PLUGIN_PKG, "selector"].join("/");
  PROVIDERS_LOCAL_SPECIFIER = [PLUGIN_PKG, "providers/local"].join("/");
  PROVIDERS_SAAS_SPECIFIER = [PLUGIN_PKG, "providers/saas"].join("/");
});

// ../../../crew/node_modules/@astragenie/astramem-client/dist/calls.js
var DEFAULT_CAP_MS = 2000;
var init_calls = __esm(() => {
  init_resolve();
});

// ../../../crew/node_modules/@astragenie/astramem-client/dist/daemon-error.js
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

// ../../../crew/node_modules/@astragenie/astramem-client/dist/daemon-client.js
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
    } catch (err2) {
      if (err2?.name === "AbortError") {
        if (signal?.aborted) {
          throw new DaemonError("Request aborted by caller signal", {
            band: "transient",
            cause: err2
          });
        }
        throw new DaemonError(`Request timed out after ${this.timeoutMs}ms`, {
          band: "transient",
          cause: err2
        });
      }
      throw new DaemonError(`Network error: ${err2?.message ?? String(err2)}`, {
        band: "transient",
        cause: err2
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
    } catch (err2) {
      if (err2 instanceof DaemonError && err2.isTransient && !opts.signal?.aborted) {
        return attempt();
      }
      throw err2;
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
var DEFAULT_TIMEOUT_MS = 5000;
var init_daemon_client = __esm(() => {
  init_daemon_error();
});

// ../../../crew/node_modules/@astragenie/astramem-client/dist/profile-calls.js
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

// ../../../crew/node_modules/@astragenie/astramem-client/dist/daemon-types.js
var init_daemon_types = () => {};

// ../../../crew/node_modules/@astragenie/astramem-client/dist/index.js
var init_dist3 = __esm(() => {
  init_resolve();
  init_calls();
  init_profile_calls();
  init_daemon_client();
  init_daemon_error();
  init_daemon_types();
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/astramem-provider.js
import { randomUUID as randomUUID2 } from "crypto";
function toStoredEntry2(input, supersedesOverride) {
  return MemoryEntrySchema.parse({
    id: input.id ?? randomUUID2(),
    ts: input.ts ?? new Date().toISOString(),
    kind: input.kind,
    severity: input.severity,
    agent: input.agent ?? null,
    tags: input.tags ?? [],
    summary: input.summary.slice(0, MAX_SUMMARY_LENGTH4),
    detail: input.detail,
    source: input.source,
    supersedes: supersedesOverride ?? input.supersedes
  });
}
function toIngestPayload(entry) {
  return {
    id: entry.id,
    type: entry.kind,
    text: entry.summary,
    source: entry.source,
    importance: SEVERITY_TO_IMPORTANCE[entry.severity],
    metadata: {
      tags: entry.tags,
      ts: entry.ts,
      ...entry.agent ? { agent: entry.agent } : {},
      ...entry.supersedes ? { supersedes: entry.supersedes } : {}
    }
  };
}
async function defaultResolveRemote() {
  const provider = await resolveWireProvider();
  return provider ? { provider, name: "local" } : null;
}
async function resolveAstramemRemote() {
  return defaultResolveRemote();
}
function mapHitsToEntries(hits, query, defaultMaxTokens) {
  const k = query.k ?? DEFAULT_K2;
  const maxTokens = query.maxTokens ?? defaultMaxTokens;
  const sorted = [...hits].sort((a, b) => b.score - a.score).slice(0, k);
  const entries = [];
  let remainingBudget = maxTokens;
  for (const hit of sorted) {
    const summary = hit.text.slice(0, MAX_SUMMARY_LENGTH4);
    const cost = Math.max(1, Math.ceil(summary.length / CHARS_PER_TOKEN2));
    if (cost > remainingBudget)
      break;
    remainingBudget -= cost;
    const kindResult = MemoryKindSchema.safeParse(hit.type);
    entries.push(MemoryEntrySchema.parse({
      id: hit.id,
      ts: new Date().toISOString(),
      kind: kindResult.success ? kindResult.data : "lesson",
      severity: "medium",
      tags: [],
      summary,
      source: hit.source ?? "astramem"
    }));
  }
  return entries;
}
function astramemProvider(repoPath, options = {}) {
  const dualWrite = options.dualWrite ?? false;
  const defaultMaxTokens = options.recall?.maxTokens ?? DEFAULT_MAX_TOKENS2;
  const fallbackOptions = {
    ...options.recall ? { recall: options.recall } : {},
    ...options.storePath ? { storePath: options.storePath } : {},
    ...options.normalizeRow ? { normalizeRow: options.normalizeRow } : {}
  };
  const fallback = fileProvider(repoPath, fallbackOptions);
  const resolveRemote = options.__resolveRemote ?? defaultResolveRemote;
  async function writeThrough(entry, supersedesOverride) {
    const stored = toStoredEntry2(entry, supersedesOverride);
    const remote = await resolveRemote();
    if (!remote) {
      await fallback.capture(stored).catch(() => {});
      return;
    }
    remote.provider.remember(toIngestPayload(stored)).catch(() => {});
    if (dualWrite) {
      await fallback.capture(stored).catch(() => {});
    }
  }
  return {
    describe: () => ({ provider: "astramem" }),
    async capture(entry) {
      await writeThrough(entry);
    },
    async recall(query) {
      const remote = await resolveRemote();
      if (!remote || dualWrite) {
        return fallback.recall(query);
      }
      try {
        const q = query.tags?.join(" ") || query.agent || "recent";
        const res = await remote.provider.recall({
          query: q,
          k: query.k ?? DEFAULT_K2,
          ...query.agent ? { agent: query.agent } : {}
        });
        return mapHitsToEntries(res.hits, query, defaultMaxTokens);
      } catch {
        return [];
      }
    },
    async supersede(id, replacement) {
      await writeThrough(replacement, replacement.supersedes ?? id);
    },
    async invalidate(id) {
      await fallback.invalidate(id).catch(() => {});
    },
    async profile(agent) {
      return profileSilent(agent);
    },
    async feedback(atomId, opts) {
      if (!opts.used)
        return false;
      return feedbackSilent(atomId);
    }
  };
}
var MAX_SUMMARY_LENGTH4 = 280, DEFAULT_K2 = 5, DEFAULT_MAX_TOKENS2 = 800, CHARS_PER_TOKEN2 = 4, SEVERITY_TO_IMPORTANCE;
var init_astramem_provider = __esm(() => {
  init_dist3();
  init_file_provider();
  init_schema();
  SEVERITY_TO_IMPORTANCE = {
    critical: 1,
    high: 0.75,
    medium: 0.5,
    low: 0.25
  };
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/resolve-provider.js
function resolveProvider(rawConfig, repoPath, options = {}) {
  const config = parseMemoryConfig(rawConfig);
  const effective = resolveEffectiveConfig(config);
  if (!effective.captureEnabled)
    return noopProvider();
  const fileOverrides = {
    ...options.file?.storePath ? { storePath: options.file.storePath } : {},
    ...options.file?.normalizeRow ? { normalizeRow: options.file.normalizeRow } : {}
  };
  if (effective.provider === "astramem") {
    return astramemProvider(repoPath, {
      dualWrite: effective.dualWrite,
      recall: { k: effective.recall.k, maxTokens: effective.recall.maxTokens },
      ...fileOverrides
    });
  }
  return fileProvider(repoPath, {
    recall: { k: effective.recall.k, maxTokens: effective.recall.maxTokens },
    ...fileOverrides
  });
}
var init_resolve_provider = __esm(() => {
  init_astramem_provider();
  init_config();
  init_file_provider();
});

// ../../../crew/node_modules/@astragenie/memory-provider/dist/index.js
var exports_dist = {};
__export(exports_dist, {
  tailReadJsonl: () => tailReadJsonl,
  resolveProvider: () => resolveProvider,
  resolveEffectiveConfig: () => resolveEffectiveConfig,
  resolveAstramemRemote: () => resolveAstramemRemote,
  rankAndTruncate: () => rankAndTruncate,
  parseMemoryConfig: () => parseMemoryConfig,
  normalizeLegacyRow: () => normalizeLegacyRow,
  noopProvider: () => noopProvider,
  fileProvider: () => fileProvider,
  estimateTokens: () => estimateTokens,
  astramemProvider: () => astramemProvider,
  appendJsonlEntry: () => appendJsonlEntry,
  MemoryEntrySchema: () => MemoryEntrySchema,
  MemoryEntryInputSchema: () => MemoryEntryInputSchema,
  MemoryConfigSchema: () => MemoryConfigSchema,
  DEFAULT_STORE_PATH: () => DEFAULT_STORE_PATH
});
var init_dist4 = __esm(() => {
  init_schema();
  init_config();
  init_ranking();
  init_jsonl2();
  init_legacy_adapter();
  init_file_provider();
  init_astramem_provider();
  init_resolve_provider();
});

// crew/scripts/lib/memory/inject-recall.mts
var exports_inject_recall = {};
__export(exports_inject_recall, {
  recallEntries: () => recallEntries,
  loadMemoryConfig: () => loadMemoryConfig,
  injectRecall: () => injectRecall,
  formatRecallBlock: () => formatRecallBlock,
  buildRecallBlock: () => buildRecallBlock
});
import fs11 from "fs/promises";
import path11 from "path";
async function loadMemoryConfig(repoPath) {
  try {
    const targetPath = path11.join(repoPath, ...LOOP_CONFIG_PATH);
    const content = await fs11.readFile(targetPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed["memory"];
  } catch {
    return;
  }
}
function formatEntry(entry) {
  const label = `[${entry.kind} ${entry.severity}]`;
  const origin = entry.source ? `${entry.source} ` : "";
  return `- **${label}** ${origin}${entry.summary}`;
}
function formatRecallBlock(entries) {
  if (entries.length === 0)
    return "";
  const lines = entries.map(formatEntry);
  return `## Prior context (from astramem)
${lines.join(`
`)}`;
}
function mapWireHitsToEntries(hits, k, maxTokens) {
  const sorted = [...hits].sort((a, b) => b.score - a.score).slice(0, k);
  const entries = [];
  let remainingBudget = maxTokens;
  for (const hit of sorted) {
    const summary = hit.text.slice(0, MAX_SUMMARY_LENGTH5);
    const cost = Math.max(1, Math.ceil(summary.length / CHARS_PER_TOKEN3));
    if (cost > remainingBudget)
      break;
    remainingBudget -= cost;
    const kindResult = MemoryEntrySchema.shape.kind.safeParse(hit.type);
    entries.push({
      id: hit.id,
      ts: new Date().toISOString(),
      kind: kindResult.success ? kindResult.data : "lesson",
      severity: "medium",
      tags: [],
      summary,
      source: hit.source ?? "astramem"
    });
  }
  return entries;
}
async function tryProjectScopedRecall(opts, effective, project) {
  try {
    const remote = await resolveAstramemRemote();
    if (!remote)
      return null;
    const query = opts.tags?.join(" ") || opts.agent || "recent";
    const res = await remote.provider.recall({
      query,
      k: effective.recall.k,
      project,
      ...opts.agent !== undefined ? { agent: opts.agent } : {}
    });
    return mapWireHitsToEntries(res.hits, effective.recall.k, effective.recall.maxTokens);
  } catch {
    return null;
  }
}
async function recallEntries(opts) {
  try {
    const rawConfig = opts.rawConfig !== undefined ? opts.rawConfig : await loadMemoryConfig(opts.repoPath);
    const config = parseMemoryConfig(rawConfig);
    const effective = resolveEffectiveConfig(config);
    if (!effective.recallEnabled)
      return [];
    const project = opts.project ?? effective.project;
    if (effective.provider === "astramem" && project !== undefined) {
      const scoped = await tryProjectScopedRecall(opts, effective, project);
      if (scoped !== null)
        return scoped;
    }
    const provider = resolveProvider(rawConfig, opts.repoPath);
    return await provider.recall({
      ...opts.agent !== undefined ? { agent: opts.agent } : {},
      ...opts.tags !== undefined ? { tags: opts.tags } : {},
      k: effective.recall.k,
      maxTokens: effective.recall.maxTokens
    });
  } catch {
    return [];
  }
}
async function buildRecallBlock(opts) {
  return formatRecallBlock(await recallEntries(opts));
}
async function injectRecall(dispatchText, opts) {
  const block = await buildRecallBlock(opts);
  if (!block)
    return dispatchText;
  return `${dispatchText}

${block}`;
}
var MAX_SUMMARY_LENGTH5 = 280, CHARS_PER_TOKEN3 = 4, LOOP_CONFIG_PATH;
var init_inject_recall = __esm(() => {
  init_dist4();
  LOOP_CONFIG_PATH = [".claude", "loop.json"];
});

// crew/scripts/lib/memory/inject-profile.mts
function atomMarker(id) {
  return ` <!--atom:${id}-->`;
}
function formatProfileBlock(profile, opts) {
  const lines = [];
  for (const c of profile.corrections) {
    lines.push(`- **[correction ${c.action}]** ${c.text}${atomMarker(c.id)}`);
  }
  for (const d of profile.recent_decisions) {
    lines.push(`- **[decision]** ${d.text}${atomMarker(d.id)}`);
  }
  const lessonLabel = opts.usefulnessWarm ? "lesson" : "lesson \xB7 importance-ranked";
  for (const l of profile.top_lessons) {
    lines.push(`- **[${lessonLabel}]** ${l.text}${atomMarker(l.id)}`);
  }
  if (lines.length === 0)
    return "";
  const header = `## Your track record (${opts.agent})`;
  let block = `${header}
${lines.join(`
`)}`;
  if (block.length > opts.maxChars) {
    const kept = [];
    let used = header.length;
    for (const line of lines) {
      if (used + 1 + line.length > opts.maxChars)
        break;
      kept.push(line);
      used += 1 + line.length;
    }
    block = kept.length === 0 ? header.slice(0, opts.maxChars) : `${header}
${kept.join(`
`)}`;
  }
  return block;
}
function num(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function parseProfileConfig(rawMemory) {
  if (typeof rawMemory !== "object" || rawMemory === null)
    return { ...PROFILE_DEFAULTS };
  const p = rawMemory.profile;
  if (typeof p !== "object" || p === null)
    return { ...PROFILE_DEFAULTS };
  const o = p;
  return {
    enabled: o.enabled === true,
    topLessons: num(o.topLessons, PROFILE_DEFAULTS.topLessons),
    maxTokens: num(o.maxTokens, PROFILE_DEFAULTS.maxTokens),
    minFeedbackSample: num(o.minFeedbackSample, PROFILE_DEFAULTS.minFeedbackSample)
  };
}
function usefulnessIsWarm(profile, minSample) {
  const moved = profile.top_lessons.filter((l) => l.usefulness !== 0.5).length;
  return moved >= minSample;
}
async function buildProfileBlock(opts) {
  const empty = { block: "", injectedIds: [] };
  try {
    const rawConfig = opts.rawConfig !== undefined ? opts.rawConfig : await loadMemoryConfig(opts.repoPath);
    const cfg = parseProfileConfig(rawConfig);
    if (!cfg.enabled)
      return empty;
    let provider = opts.provider;
    if (!provider) {
      const { resolveProvider: resolveProvider2 } = await Promise.resolve().then(() => (init_dist4(), exports_dist));
      provider = resolveProvider2(rawConfig, opts.repoPath);
    }
    if (typeof provider.profile !== "function")
      return empty;
    const profile = await provider.profile(opts.agent);
    if (!profile)
      return empty;
    const cappedLessons = profile.top_lessons.slice(0, cfg.topLessons);
    const cappedProfile = { ...profile, top_lessons: cappedLessons };
    const block = formatProfileBlock(cappedProfile, {
      agent: opts.agent,
      maxChars: cfg.maxTokens * 4,
      usefulnessWarm: usefulnessIsWarm(cappedProfile, cfg.minFeedbackSample)
    });
    if (!block)
      return empty;
    const injectedIds = [
      ...profile.corrections.map((c) => c.id),
      ...profile.recent_decisions.map((d) => d.id),
      ...cappedLessons.map((l) => l.id)
    ];
    return { block, injectedIds };
  } catch {
    return empty;
  }
}
var PROFILE_DEFAULTS;
var init_inject_profile = __esm(() => {
  init_inject_recall();
  PROFILE_DEFAULTS = {
    enabled: false,
    topLessons: 10,
    maxTokens: 400,
    minFeedbackSample: 5
  };
});

// crew/scripts/lib/memory/handoff-digest.mts
var exports_handoff_digest = {};
__export(exports_handoff_digest, {
  parseCreditLoopConfig: () => parseCreditLoopConfig,
  buildHandoffDigest: () => buildHandoffDigest
});
function num2(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function parseCreditLoopConfig(rawMemory) {
  if (typeof rawMemory !== "object" || rawMemory === null)
    return { ...CREDIT_LOOP_DEFAULTS };
  const feedback = rawMemory.feedback;
  if (typeof feedback !== "object" || feedback === null)
    return { ...CREDIT_LOOP_DEFAULTS };
  const c = feedback.creditLoop;
  if (typeof c !== "object" || c === null)
    return { ...CREDIT_LOOP_DEFAULTS };
  const o = c;
  return {
    enabled: o.enabled === true,
    k: Math.min(MAX_DIGEST_K, num2(o.k, CREDIT_LOOP_DEFAULTS.k))
  };
}
function formatDigestEntry(entry) {
  const label = `[${entry.kind} ${entry.severity}]`;
  const origin = entry.source ? `${entry.source} ` : "";
  return `- **${label}** ${origin}${entry.summary}${atomMarker(entry.id)}`;
}
function formatRecallDigestBlock(entries) {
  if (entries.length === 0)
    return "";
  const lines = entries.map(formatDigestEntry);
  return `## Recall (memory credit loop)
${lines.join(`
`)}`;
}
async function buildHandoffDigest(opts) {
  const rawConfig = opts.rawConfig !== undefined ? opts.rawConfig : await loadMemoryConfig(opts.repoPath);
  const { block: profileBlock, injectedIds: profileIds } = await buildProfileBlock({
    repoPath: opts.repoPath,
    agent: opts.agent,
    rawConfig,
    ...opts.provider !== undefined ? { provider: opts.provider } : {}
  });
  const creditCfg = parseCreditLoopConfig(rawConfig);
  if (!creditCfg.enabled) {
    return { block: profileBlock, ids: profileIds };
  }
  let recallBlock = "";
  let recallIds = [];
  try {
    const entries = await recallEntries({
      repoPath: opts.repoPath,
      agent: opts.agent,
      ...opts.project !== undefined ? { project: opts.project } : {},
      rawConfig
    });
    const capped = entries.slice(0, creditCfg.k);
    recallIds = capped.map((e) => e.id);
    recallBlock = formatRecallDigestBlock(capped);
  } catch {}
  const block = [profileBlock, recallBlock].filter(Boolean).join(`

`);
  return { block, ids: [...profileIds, ...recallIds] };
}
var MAX_DIGEST_K = 5, CREDIT_LOOP_DEFAULTS;
var init_handoff_digest = __esm(() => {
  init_inject_recall();
  init_inject_profile();
  CREDIT_LOOP_DEFAULTS = {
    enabled: false,
    k: MAX_DIGEST_K
  };
});

// crew/scripts/lib/memory/handoff-credit.mts
var exports_handoff_credit = {};
__export(exports_handoff_credit, {
  creditMemoriesUsed: () => creditMemoriesUsed
});
function sanitizeIds(ids) {
  if (!Array.isArray(ids))
    return [];
  const cleaned = ids.filter((x) => typeof x === "string" && x.trim().length > 0);
  return Array.from(new Set(cleaned)).slice(0, MAX_CREDIT_BATCH);
}
async function creditMemoriesUsed(opts) {
  const empty = { credited: [] };
  try {
    const ids = sanitizeIds(opts.ids);
    if (ids.length === 0)
      return empty;
    const rawConfig = opts.rawConfig !== undefined ? opts.rawConfig : await loadMemoryConfig(opts.repoPath);
    const creditCfg = parseCreditLoopConfig(rawConfig);
    if (!creditCfg.enabled)
      return empty;
    let provider = opts.provider;
    if (!provider) {
      const { resolveProvider: resolveProvider2 } = await Promise.resolve().then(() => (init_dist4(), exports_dist));
      provider = resolveProvider2(rawConfig, opts.repoPath);
    }
    if (typeof provider.feedback !== "function")
      return empty;
    const credited = [];
    for (const id of ids) {
      try {
        const ok2 = await provider.feedback(id, { used: true });
        if (ok2)
          credited.push(id);
      } catch {}
    }
    return { credited };
  } catch {
    return empty;
  }
}
var MAX_CREDIT_BATCH = 20;
var init_handoff_credit = __esm(() => {
  init_inject_recall();
  init_handoff_digest();
});

// crew/scripts/lib/memory/capture-learning.mts
var exports_capture_learning = {};
__export(exports_capture_learning, {
  captureFailureLearning: () => captureFailureLearning,
  appendJsonlEntry: () => appendJsonlEntry2,
  LEARNINGS_PATH: () => LEARNINGS_PATH
});
import { appendFile as appendFile3, mkdir as mkdir3 } from "fs/promises";
import path12 from "path";
async function appendJsonlEntry2(repoPath, segments, entry) {
  try {
    const targetPath = path12.join(repoPath, ...segments);
    await mkdir3(path12.dirname(targetPath), { recursive: true });
    await appendFile3(targetPath, `${JSON.stringify(entry)}
`, { flag: "a" });
  } catch {}
}
async function captureFailureLearning(repoPath, entry) {
  const ts = new Date;
  const summary = entry.summary.slice(0, MAX_SUMMARY_LENGTH6);
  const compactTs = ts.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const keyScope = entry.tags?.[0] ?? entry.agent ?? "unknown";
  await appendJsonlEntry2(repoPath, LEARNINGS_PATH, {
    kind: "failure",
    ts: ts.toISOString(),
    agent: entry.agent ?? null,
    severity: entry.severity ?? "medium",
    tags: entry.tags ?? [],
    summary,
    source: entry.source,
    key: `${entry.source}:${keyScope}:${compactTs}`,
    insight: summary
  });
}
var LEARNINGS_PATH, MAX_SUMMARY_LENGTH6 = 280;
var init_capture_learning = __esm(() => {
  LEARNINGS_PATH = [".claude", "artifacts", "loop", "learnings.jsonl"];
});

// crew/scripts/lib/artifacts/write.mts
var exports_write = {};
__export(exports_write, {
  writeArtifact: () => writeArtifact,
  resolveArtifactConfig: () => resolveArtifactConfig,
  __drainPendingCaptures: () => __drainPendingCaptures
});
import fs12 from "fs/promises";
import path13 from "path";
function nowIso4() {
  return new Date().toISOString();
}
function renderField(label, value) {
  return `- ${label}: ${value || "-"}`;
}
function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (!value || typeof value !== "string") {
    return [];
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function renderListField(label, value) {
  const items = toList(value);
  if (items.length === 0) {
    return `- ${label}: -`;
  }
  return [`- ${label}:`, ...items.map((item) => `  - ${item}`)].join(`
`);
}
function slugify(value) {
  return (value ?? "artifact").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "artifact";
}
function timestampSlug() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function renderOptionalFrontmatter(fields) {
  const lines = [];
  if (fields.phase !== null && fields.phase !== undefined && String(fields.phase).length > 0) {
    lines.push(`phase: ${JSON.stringify(String(fields.phase))}`);
  }
  if (fields.feature) {
    lines.push(`feature: ${fields.feature}`);
  }
  if (fields.slice) {
    lines.push(`slice: ${fields.slice}`);
  }
  if (fields.validationEvidence) {
    lines.push(`validation_evidence: ${JSON.stringify(fields.validationEvidence)}`);
  }
  if (fields.findings) {
    lines.push(`findings: ${JSON.stringify(fields.findings)}`);
  }
  if (fields.status) {
    lines.push(`status: ${fields.status}`);
  }
  if (fields.verdict) {
    lines.push(`decision: ${fields.verdict}`);
  }
  if (fields.skipReason) {
    lines.push(`skip_reason: ${JSON.stringify(fields.skipReason)}`);
  }
  if (fields.notChecked && fields.notChecked.length > 0) {
    lines.push(`not_checked: ${JSON.stringify(fields.notChecked)}`);
  }
  if (fields.authorId) {
    lines.push(`author_id: ${fields.authorId}`);
  }
  if (fields.judgeId) {
    lines.push(`judge_id: ${fields.judgeId}`);
  }
  if (fields.selfApproval !== undefined) {
    lines.push(`self_approval: ${fields.selfApproval}`);
  }
  if (lines.length === 0) {
    return "";
  }
  return ["---", ...lines, "---", ""].join(`
`);
}
function renderReviewResultScaffold(fields) {
  const lines = [
    `# Review Result: ${fields.title || "Untitled"}`,
    "",
    "## Verdict",
    "- decision: ",
    "- confidence: ",
    "",
    "## Test Summary",
    "- test-command: ",
    "- coverage: ",
    "",
    "## Changed Files",
    "- (auto-populated by git during review)",
    "",
    "## Findings",
    "- pass: 0",
    "- partial: 0",
    "- fail: 0",
    "",
    "## Not checked",
    "- (what was deliberately NOT covered by this review, or 'none')",
    "",
    "## Risks",
    "- (describe residual risks or 'none')",
    "",
    "## Notes",
    "- (reviewer judgment here)"
  ];
  return lines.join(`
`);
}
function renderValidationResultScaffold(fields) {
  const lines = [
    `# Validation Result: ${fields.title || "Untitled"}`,
    "",
    "## Environment",
    "- tested: local",
    "",
    "## Scenario",
    "- goal: ",
    "",
    "## Gates",
    "- lint: ",
    "- format: ",
    "- tests: ",
    "- verify:all: ",
    "",
    "## Evidence",
    "- (command output and observed behavior)",
    "",
    "## Findings",
    "- pass: 0",
    "- partial: 0",
    "- fail: 0",
    "",
    "## Risks",
    "- (residual risks or 'none')",
    "",
    "## Decision",
    "- outcome: "
  ];
  return lines.join(`
`);
}
function renderCostReportSources(breakdown) {
  if (!breakdown?.sources?.length || breakdown.sources.length < 2)
    return [];
  const lines = ["## Sources (aggregated)", ""];
  for (const src of breakdown.sources) {
    lines.push(`- ${src.slug}: ${src.messages} msgs, $${src.usd.toFixed(4)}`);
  }
  lines.push("");
  return lines;
}
function formatDuration(durationMs) {
  if (!durationMs)
    return "-";
  return `${(durationMs / 60000).toFixed(1)} min (${durationMs} ms)`;
}
function formatTokens(totalTokens) {
  return totalTokens ? totalTokens.toLocaleString() : "-";
}
function formatCacheHit(cacheHitPct) {
  return cacheHitPct !== "-" ? `${cacheHitPct}%` : "-";
}
function formatUsd(breakdown) {
  return breakdown ? `$${breakdown.usd?.toFixed(4) ?? "0.0000"}` : "-";
}
function formatBool(value) {
  return value ? "yes" : "no";
}
function formatCount(value) {
  return String(value ?? 0);
}
function renderCostReportHeader(fields, breakdown, totalTokens, cacheHitPct) {
  const window = breakdown?.window ?? {};
  return [
    `# Cost Report: ${fields.title || "Untitled"}`,
    "",
    renderField("Created", nowIso4()),
    renderField("Run Title", fields.runTitle),
    renderField("Window Start", window.start),
    renderField("Window End", window.end),
    renderField("Duration", formatDuration(window.durationMs ?? 0)),
    renderField("Sessions Scanned", formatCount(breakdown?.sessionsScanned)),
    renderField("Assistant Messages Counted", formatCount(breakdown?.messagesCounted)),
    renderField("Total Tokens", formatTokens(totalTokens)),
    renderField("Cache Hit %", formatCacheHit(cacheHitPct)),
    renderField("Total USD", formatUsd(breakdown)),
    renderField("Source Project", breakdown?.sourceProject),
    renderField("Auto-detected", formatBool(breakdown?.autoDetected)),
    renderField("Aggregate All", formatBool(breakdown?.aggregateAll)),
    ""
  ];
}
function renderCostReportOutcome(outcome) {
  if (!outcome?.sliceId)
    return [];
  const lines = ["## Outcome Linkage", ""];
  lines.push(renderField("Slice", outcome.sliceId));
  lines.push(renderField("Grade Avg", outcome.gradeAvg != null ? String(outcome.gradeAvg) : "-"));
  lines.push(renderField("Review Decision", outcome.reviewDecision ?? "-"));
  lines.push(renderField("Validation Decision", outcome.validationDecision ?? "-"));
  if (outcome.scores) {
    lines.push("- Scores:");
    for (const [k, v] of Object.entries(outcome.scores)) {
      lines.push(`  - ${k}: ${v}`);
    }
  }
  lines.push("");
  return lines;
}
function renderCostReportTokens(breakdown) {
  const lines = ["## Tokens (totals)", ""];
  if (breakdown?.totals) {
    for (const [k, v] of Object.entries(breakdown.totals)) {
      lines.push(`- ${k}: ${v.toLocaleString()}`);
    }
  } else {
    lines.push("- (none)");
  }
  return lines;
}
function renderCostReportModelMix(breakdown) {
  const lines = ["", "## Model Mix", ""];
  if (breakdown?.modelMix?.length) {
    for (const m of breakdown.modelMix) {
      lines.push(`- ${m.model} (priced as ${m.pricedAs}): ${m.messages} msgs (${m.msgPct}%), $${m.usd.toFixed(4)} (${m.usdPct}%)`);
    }
  } else {
    lines.push("- (none)");
  }
  return lines;
}
function renderCostReportConversation(breakdown) {
  const conv = breakdown?.conversation ?? {};
  const lines = [
    "",
    "## Conversation Shape",
    "",
    `- user_msg_count: ${conv.userMsgCount ?? 0}`,
    `- user_msg_avg_len: ${conv.userMsgAvgLen ?? 0}`,
    `- turns_before_first_tool: ${conv.turnsBeforeFirstTool ?? 0}`,
    `- compaction_count: ${conv.compactionCount ?? 0}`,
    `- skill_invocations: ${conv.skillInvocations ?? 0}`,
    `- subagent_dispatches: ${conv.subagentDispatches ?? 0}`
  ];
  if (conv.subagentDispatchesByRole && Object.keys(conv.subagentDispatchesByRole).length > 0) {
    lines.push("- subagent_dispatches_by_role:");
    const sorted = Object.entries(conv.subagentDispatchesByRole).sort((a, b) => b[1] - a[1]);
    for (const [role, count] of sorted) {
      lines.push(`  - ${role}: ${count}`);
    }
  }
  return lines;
}
function renderCostReportToolUsage(breakdown) {
  const lines = ["", "## Tool Usage", ""];
  if (breakdown?.toolUsage?.length) {
    for (const t of breakdown.toolUsage) {
      const failStr = t.failures > 0 ? ` (${t.failures} failed)` : "";
      lines.push(`- ${t.name}: ${t.count}${failStr}`);
    }
  } else {
    lines.push("- (none)");
  }
  return lines;
}
function renderCostReportToolResultSizes(breakdown) {
  const lines = ["", "## Tool Result Sizes (bytes)", ""];
  const trs = breakdown?.toolResultSizes;
  if (trs && trs.count > 0) {
    lines.push(`- count: ${trs.count}`);
    lines.push(`- sum: ${trs.sumBytes.toLocaleString()}`);
    lines.push(`- p50: ${trs.p50Bytes.toLocaleString()}`);
    lines.push(`- p90: ${trs.p90Bytes.toLocaleString()}`);
    lines.push(`- max: ${trs.maxBytes.toLocaleString()}`);
  } else {
    lines.push("- (none)");
  }
  return lines;
}
function renderCostReportFileReReads(breakdown) {
  const lines = ["", "## File Re-reads", ""];
  lines.push(`- redundant_read_count: ${breakdown?.fileReReadCount ?? 0}`);
  if (breakdown?.fileReReadTopPaths?.length) {
    lines.push("- top paths:");
    for (const p of breakdown.fileReReadTopPaths) {
      lines.push(`  - ${p.reads}\xD7 ${p.path}`);
    }
  }
  return lines;
}
function renderCostReportCachePriming(breakdown) {
  if (!breakdown?.toolCachePrime?.length)
    return [];
  const lines = ["", "## Cache Priming (per tool, approximate)", ""];
  lines.push("Attribution: each tool's tool_result size weighted against the NEXT assistant turn's cache_create tokens. Numbers are directional, not precise \u2014 system-prompt drift and prior-turn re-injection inflate ratios.");
  lines.push("");
  for (const t of breakdown.toolCachePrime) {
    const ratio = t.ratio != null ? `${t.ratio}\xD7` : "\u2014";
    lines.push(`- ${t.name}: ${t.calls} calls, ${t.totalResultBytes.toLocaleString()}B results, ~${t.attributedCacheCreate.toLocaleString()} cache_create tok (${ratio})`);
  }
  lines.push("");
  return lines;
}
function renderCostReportByModel(breakdown) {
  const lines = ["", "## By Model (token detail)", ""];
  if (breakdown?.byModel && Object.keys(breakdown.byModel).length) {
    for (const [model, info] of Object.entries(breakdown.byModel)) {
      lines.push(`### ${model} (priced as ${info.pricedAs ?? "unknown"})`);
      lines.push(`- messages: ${info.messages}`);
      lines.push(`- usd: $${info.usd.toFixed(4)}`);
      for (const [k, v] of Object.entries(info.tokens)) {
        lines.push(`- ${k}: ${v.toLocaleString()}`);
      }
      lines.push("");
    }
  }
  return lines;
}
function renderCostReportDispatchBreakdown(dispatchBreakdown) {
  if (!dispatchBreakdown)
    return [];
  const section = renderDispatchBreakdownSection(dispatchBreakdown.dispatch, dispatchBreakdown.gates);
  if (!section)
    return [];
  return [section];
}
function renderCostReportAgentStats(rows) {
  if (!rows || rows.length === 0)
    return [];
  const top = [...rows].sort((a, b) => b.sample_count - a.sample_count).slice(0, 5);
  const win = top[0]?.window ?? "";
  const fmtPct = (x) => `${(x * 100).toFixed(0)}%`;
  const out = [
    "## Agent stats (rolling)",
    "",
    `Window: \`${win}\` \xB7 top-5 by sample count`,
    "",
    "| Agent | N | pass% | wallMs | tokens | rework% | valfail% | medDisp |",
    "|---|---:|---:|---:|---:|---:|---:|---:|"
  ];
  for (const r of top) {
    out.push(`| ${r.agent} | ${r.sample_count} | ${fmtPct(r.pass_rate)} | ${r.mean_wall_ms} | ${r.mean_tokens} | ${fmtPct(r.review_rework_rate)} | ${fmtPct(r.validation_fail_rate)} | ${r.median_dispatches_to_pass} |`);
  }
  out.push("");
  return out;
}
function renderCostReportBody(fields, variant) {
  const breakdown = fields.cost;
  const outcome = fields.outcome ?? null;
  const totalTokens = breakdown?.totals ? Object.values(breakdown.totals).reduce((a, b) => a + b, 0) : 0;
  const promptTokens = breakdown?.totals != null ? (breakdown.totals["input"] ?? 0) + (breakdown.totals["cache_create_5m"] ?? 0) + (breakdown.totals["cache_create_1h"] ?? 0) + (breakdown.totals["cache_read"] ?? 0) : 0;
  const cacheHitPct = promptTokens > 0 && breakdown?.totals != null ? Number(((breakdown.totals["cache_read"] ?? 0) / promptTokens * 100).toFixed(1)) : "-";
  return [
    ...renderCostReportFrontmatter(fields, breakdown, outcome, totalTokens, cacheHitPct, variant),
    "",
    ...renderCostReportHeader(fields, breakdown, totalTokens, cacheHitPct),
    ...renderCostReportSources(breakdown),
    ...renderCostReportOutcome(outcome),
    ...renderCostReportTokens(breakdown),
    ...renderCostReportModelMix(breakdown),
    ...renderCostReportConversation(breakdown),
    ...renderCostReportToolUsage(breakdown),
    ...renderCostReportToolResultSizes(breakdown),
    ...renderCostReportFileReReads(breakdown),
    ...renderCostReportCachePriming(breakdown),
    ...renderCostReportByModel(breakdown),
    ...fields.notes ? ["## Notes", "", fields.notes, ""] : [],
    ...renderCostReportDispatchBreakdown(fields.dispatchBreakdown),
    ...renderCostReportAgentStats(fields.agentStats)
  ].join(`
`);
}
function resolveArtifactConfig(kind) {
  if (kind === "cost-report") {
    return {
      directory: "cost",
      prefix: "cost-report",
      render: (f) => renderCostReportBody(f, null)
    };
  }
  if (kind === "cost-report-slice") {
    return {
      directory: "cost",
      prefix: "cost-report-slice",
      render: (f) => renderCostReportBody(f, "slice")
    };
  }
  if (kind === "cost-report-aggregate") {
    return {
      directory: "cost",
      prefix: "cost-report-aggregate",
      render: (f) => renderCostReportBody(f, "aggregate")
    };
  }
  const config = SIMPLE_RENDERERS[kind];
  if (!config) {
    throw new Error(`Unsupported artifact kind: ${kind}`);
  }
  return config;
}
function isCostReportKind(kind) {
  return kind === "cost-report" || kind === "cost-report-slice" || kind === "cost-report-aggregate";
}
function resolveArtifactPath(artifactDir, kind, fields, config) {
  if (fields.updatePath && !isCostReportKind(kind))
    return fields.updatePath;
  const title = fields.title ?? fields.summary ?? kind;
  const fileName = `${timestampSlug()}-${config.prefix}-${slugify(title)}.md`;
  return path13.join(artifactDir, fileName);
}
function renderArtifactFrontmatter(kind, fields) {
  if (isCostReportKind(kind))
    return "";
  if (fields.scaffold)
    return renderOptionalFrontmatter({ ...fields, status: "in-progress" });
  return renderOptionalFrontmatter(fields);
}
function renderArtifactBody(kind, fields, config) {
  if (!fields.scaffold)
    return config.render(fields);
  if (kind === "review-result")
    return renderReviewResultScaffold(fields);
  if (kind === "validation-result")
    return renderValidationResultScaffold(fields);
  return config.render(fields);
}
function trackDetached(capture) {
  pendingCaptures.add(capture);
  capture.finally(() => pendingCaptures.delete(capture)).catch(() => {});
}
async function __drainPendingCaptures() {
  await Promise.allSettled([...pendingCaptures]);
}
function isFailingVerdict(kind, fields) {
  if (kind === "review-result")
    return fields.verdict === "rejected";
  if (kind === "validation-result")
    return fields.verdict === "fail";
  return false;
}
async function fireFailureCaptureSilent(repoPath, kind, fields) {
  if (!isFailingVerdict(kind, fields))
    return;
  const agent = kind === "review-result" ? fields.reviewer : fields.validator;
  const rationale = fields.findings || fields.summary || `${kind} verdict: ${fields.verdict}`;
  try {
    const { captureFailureLearning: captureFailureLearning2 } = await Promise.resolve().then(() => (init_capture_learning(), exports_capture_learning));
    await captureFailureLearning2(repoPath, {
      agent: agent ?? null,
      severity: "high",
      summary: rationale,
      tags: [kind, fields.slice, fields.feature].filter((t) => Boolean(t)),
      source: kind === "review-result" ? "review_fail" : "validation_fail"
    });
  } catch {}
}
async function fireMemoriesUsedCreditSilent(repoPath, kind, fields, overrides = {}) {
  if (kind !== "handoff")
    return;
  if (!fields.memoriesUsed || fields.memoriesUsed.length === 0)
    return;
  await fireGuarded(async () => {
    const loader = overrides.__creditMemoriesUsedLoader ?? defaultCreditMemoriesUsedLoader;
    const { creditMemoriesUsed: creditMemoriesUsed2 } = await loader();
    await creditMemoriesUsed2({ repoPath, ids: fields.memoriesUsed });
  }, overrides.__guardTimeoutMs);
}
async function writeArtifact(repoPath, kind, fields = {}, overrides = {}) {
  try {
    const config = resolveArtifactConfig(kind);
    const artifactDir = path13.join(repoPath, ...ARTIFACT_ROOT, config.directory);
    await fs12.mkdir(artifactDir, { recursive: true });
    const artifactPath = resolveArtifactPath(artifactDir, kind, fields, config);
    const fm = renderArtifactFrontmatter(kind, fields);
    let body = renderArtifactBody(kind, fields, config);
    if (kind === "handoff" && fields.repoContext) {
      body += await buildRepoLayoutBlock(repoPath);
    }
    await fs12.writeFile(artifactPath, `${fm}${body}
`);
    const artifact = {
      kind,
      path: artifactPath,
      title: fields.title ?? "Untitled"
    };
    if (!isCostReportKind(kind)) {
      await registerWorkflowArtifact(repoPath, artifact, fields);
    }
    trackDetached(fireFailureCaptureSilent(repoPath, kind, fields));
    trackDetached(fireMemoriesUsedCreditSilent(repoPath, kind, fields, overrides));
    return ok(artifact);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
var SIMPLE_RENDERERS, ARTIFACT_ROOT, defaultCreditMemoriesUsedLoader = () => Promise.resolve().then(() => (init_handoff_credit(), exports_handoff_credit)), pendingCaptures;
var init_write = __esm(() => {
  init_workflow_state();
  init_render_frontmatter();
  init_read();
  init_result();
  init_dispatch_timing_reader();
  SIMPLE_RENDERERS = {
    "run-brief": {
      directory: "runs",
      prefix: "run-brief",
      render: (f) => [
        `# Run Brief: ${f.title || "Untitled"}`,
        "",
        renderField("Created", nowIso4()),
        renderField("Tier", f.tier || "full"),
        renderField("Goal", f.goal),
        renderField("Mode", f.mode),
        renderField("Pace", f.pace),
        renderField("Owner", f.owner),
        renderField("Status", f.status || "active"),
        renderField("Summary", f.summary),
        renderListField("Scope", f.scope),
        renderListField("Out Of Scope", f.outOfScope),
        renderListField("Planned Files", f.files),
        renderField("Next Step", f.next),
        ""
      ].join(`
`)
    },
    handoff: {
      directory: "handoffs",
      prefix: "handoff",
      render: (f) => {
        const lines = [
          `# Task Handoff: ${f.title || "Untitled"}`,
          "",
          renderField("Created", nowIso4()),
          renderField("From", f.from),
          renderField("To", f.to),
          renderField("Objective", f.goal || f.summary)
        ];
        if (f.status) {
          lines.push(renderField("Status", f.status));
        }
        lines.push(renderListField("Allowed Scope", f.scope), renderListField("Forbidden Scope", f.outOfScope), renderField("Deliverable", f.deliverable), renderListField("Changed Files", f.files), renderField("Confidence", f.confidence), renderField("Risks", f.risks), renderField("Suggested Next Handoff", f.next), "");
        return lines.join(`
`);
      }
    },
    "review-result": {
      directory: "reviews",
      prefix: "review-result",
      render: (f) => {
        const lines = [
          `# Review Result: ${f.title || "Untitled"}`,
          "",
          renderField("Created", nowIso4()),
          renderField("Reviewer", f.reviewer || f.owner),
          renderField("Decision", f.decision || "approved_with_notes")
        ];
        if (f.status) {
          lines.push(renderField("Status", f.status));
        }
        lines.push(renderField("Summary", f.summary), renderListField("Evidence Checked", f.evidence), renderListField("Files Reviewed", f.files), renderField("Test Adequacy", f.testSummary));
        if (f.testSummarySkipReason) {
          lines.push(renderField("Test Adequacy Skip Reason", f.testSummarySkipReason));
        }
        if (f.nonCode) {
          lines.push(renderField("Non-Code Review", "yes"));
        }
        if (f.authorId) {
          lines.push(renderField("Author", f.authorId));
        }
        if (f.judgeId) {
          lines.push(renderField("Judge", f.judgeId));
        }
        if (f.selfApproval) {
          lines.push("\u26A0 self-approval: author and judge are the same identity");
        }
        if (f.notChecked && f.notChecked.length > 0) {
          lines.push(renderListField("Not Checked", f.notChecked));
        }
        if (f.validationEvidence) {
          lines.push("");
          lines.push("## Validation Evidence");
          lines.push("");
          lines.push(f.validationEvidence);
        }
        lines.push(renderField("Risks", f.risks));
        lines.push(renderField("Required Follow-up", f.next));
        lines.push("");
        return lines.join(`
`);
      }
    },
    "validation-plan": {
      directory: "validations",
      prefix: "validation-plan",
      render: (f) => [
        `# Validation Plan: ${f.title || "Untitled"}`,
        "",
        renderField("Created", nowIso4()),
        renderField("Owner", f.owner || f.validator),
        renderField("Environment", f.environment),
        renderField("Goal", f.goal || f.summary),
        renderListField("Scope", f.scope),
        renderListField("Out Of Scope", f.outOfScope),
        renderListField("Evidence To Collect", f.evidence),
        renderField("Next Step", f.next),
        ""
      ].join(`
`)
    },
    "validation-result": {
      directory: "validations",
      prefix: "validation-result",
      render: (f) => {
        const lines = [
          `# Validation Result: ${f.title || "Untitled"}`,
          "",
          renderField("Created", nowIso4()),
          renderField("Validator", f.validator || f.owner || "verifier"),
          renderField("Environment", f.environment),
          renderField("Decision", f.decision || "passed_with_notes")
        ];
        if (f.status) {
          lines.push(renderField("Status", f.status));
        }
        lines.push(renderField("Scenario", f.goal || f.summary), renderListField("Evidence Collected", f.evidence), renderListField("Files / Surfaces Checked", f.files), renderField("Risks", f.risks), renderField("Required Follow-up", f.next), "");
        return lines.join(`
`);
      }
    },
    "deployment-check": {
      directory: "deployments",
      prefix: "deployment-check",
      render: (f) => [
        `# Deployment Check: ${f.title || "Untitled"}`,
        "",
        renderField("Created", nowIso4()),
        renderField("Deployer", f.deployer || f.owner || "release-engineer"),
        renderField("Environment", f.environment),
        renderField("Resource", f.resource),
        renderField("Service URL", f.url),
        renderField("Revision", f.revision),
        renderField("Decision", f.decision || "passed_with_notes"),
        renderField("Action", f.goal || f.summary),
        renderListField("Evidence Collected", f.evidence),
        renderListField("Files / Surfaces Checked", f.files),
        renderField("Risks", f.risks),
        renderField("Required Follow-up", f.next),
        ""
      ].join(`
`)
    },
    "final-synthesis": {
      directory: "runs",
      prefix: "final-synthesis",
      render: (f) => [
        `# Final Synthesis: ${f.title || "Untitled"}`,
        "",
        renderField("Created", nowIso4()),
        renderField("Owner", f.owner),
        renderField("Outcome", f.status || "completed"),
        renderField("Summary", f.summary),
        renderListField("Changed Files / Evidence", f.files || f.evidence),
        renderListField("Run / Test Steps", f.runSteps),
        renderField("External Deltas", f.externalDeltas),
        renderField("Risks", f.risks),
        renderField("Next Step", f.next),
        ""
      ].join(`
`)
    }
  };
  ARTIFACT_ROOT = [".claude", "artifacts", "crew"];
  pendingCaptures = new Set;
});

// crew/scripts/lib/artifact-schemas.mts
function normalizeReviewDecision(input) {
  if (!input)
    return null;
  if (REVIEW_DECISIONS.includes(input)) {
    return { canonical: input };
  }
  const alias = REVIEW_DECISION_ALIASES[input];
  return alias ? { canonical: alias, aliasOf: input } : null;
}
function normalizeValidationDecision(input) {
  if (!input)
    return null;
  if (VALIDATION_DECISIONS.includes(input)) {
    return { canonical: input };
  }
  const alias = VALIDATION_DECISION_ALIASES[input];
  return alias ? { canonical: alias, aliasOf: input } : null;
}
function ok2(data) {
  return { success: true, data };
}
function fail(issues) {
  return { success: false, error: { issues } };
}
function isOptionalString(value) {
  return value === undefined || typeof value === "string";
}
var REVIEW_DECISIONS, VALIDATION_DECISIONS, REVIEW_DECISION_ALIASES, VALIDATION_DECISION_ALIASES, ReviewArtifactSchema, ValidationArtifactSchema;
var init_artifact_schemas = __esm(() => {
  REVIEW_DECISIONS = ["approved", "approved_with_notes", "rejected"];
  VALIDATION_DECISIONS = ["pass", "fail", "skipped"];
  REVIEW_DECISION_ALIASES = {
    needs_fix: "rejected",
    approved_with_conditions: "approved_with_notes",
    needs_revision: "rejected"
  };
  VALIDATION_DECISION_ALIASES = {
    passed: "pass",
    passed_with_notes: "pass",
    failed: "fail",
    skip: "skipped"
  };
  ReviewArtifactSchema = {
    safeParse(value) {
      const issues = [];
      if (value.decision !== undefined && !REVIEW_DECISIONS.includes(value.decision)) {
        issues.push({
          message: `Invalid enum value. Expected ${REVIEW_DECISIONS.map((d) => `'${d}'`).join(" | ")}, received '${value.decision}'`,
          path: ["decision"]
        });
      }
      for (const key of [
        "phase",
        "feature",
        "slice",
        "findings",
        "status",
        "author_id",
        "judge_id"
      ]) {
        if (!isOptionalString(value[key])) {
          issues.push({ message: `Expected string, received ${typeof value[key]}`, path: [key] });
        }
      }
      if (value.not_checked !== undefined) {
        if (!Array.isArray(value.not_checked) || value.not_checked.some((v) => typeof v !== "string")) {
          issues.push({ message: "Expected array of strings", path: ["not_checked"] });
        }
      }
      if (value.self_approval !== undefined && typeof value.self_approval !== "boolean") {
        issues.push({
          message: `Expected boolean, received ${typeof value.self_approval}`,
          path: ["self_approval"]
        });
      }
      return issues.length > 0 ? fail(issues) : ok2(value);
    }
  };
  ValidationArtifactSchema = {
    safeParse(value) {
      const issues = [];
      if (value.decision !== undefined && !VALIDATION_DECISIONS.includes(value.decision)) {
        issues.push({
          message: `Invalid enum value. Expected ${VALIDATION_DECISIONS.map((d) => `'${d}'`).join(" | ")}, received '${value.decision}'`,
          path: ["decision"]
        });
      }
      for (const key of [
        "skip_reason",
        "phase",
        "feature",
        "slice",
        "findings",
        "status",
        "validation_evidence"
      ]) {
        if (!isOptionalString(value[key])) {
          issues.push({ message: `Expected string, received ${typeof value[key]}`, path: [key] });
        }
      }
      if (value.decision === "skipped" && !value.skip_reason?.trim()) {
        issues.push({
          message: "skip_reason is required when decision is 'skipped'",
          path: ["skip_reason"]
        });
      }
      return issues.length > 0 ? fail(issues) : ok2(value);
    }
  };
});

// crew/scripts/lib/cost-advisor-grades.mts
function worseGrade(a, b) {
  return GRADE_ORDER.indexOf(a) >= GRADE_ORDER.indexOf(b) ? a : b;
}
function gradeCacheHit(cacheHit) {
  for (const [min, g] of GRADE_THRESHOLDS["cacheHitPct"] ?? []) {
    if (cacheHit >= min)
      return g;
  }
  return "F";
}
function gradeCountMetrics(targetMap) {
  const countMetrics = [
    ["compactionCount", GRADE_THRESHOLDS["compactionCount"] ?? []],
    ["subagentDispatches", GRADE_THRESHOLDS["subagentDispatches"] ?? []],
    ["fileRereadCount", GRADE_THRESHOLDS["fileRereadCount"] ?? []],
    ["toolFailureRate", GRADE_THRESHOLDS["toolFailureRate"] ?? []]
  ];
  let grade = "A";
  for (const [key, thresholds] of countMetrics) {
    const val = targetMap[key] ?? 0;
    let metricGrade = "F";
    for (const [max, g] of thresholds) {
      if (val <= max) {
        metricGrade = g;
        break;
      }
    }
    grade = worseGrade(grade, metricGrade);
  }
  return grade;
}
function computeGrade(target) {
  const targetMap = target;
  let grade = "A";
  grade = worseGrade(grade, gradeCacheHit(target.cacheHitPct ?? 0));
  grade = worseGrade(grade, gradeCountMetrics(targetMap));
  return grade;
}
var GRADE_THRESHOLDS, GRADE_ORDER;
var init_cost_advisor_grades = __esm(() => {
  GRADE_THRESHOLDS = {
    cacheHitPct: [
      [98, "A"],
      [95, "B"],
      [90, "C"],
      [80, "D"]
    ],
    compactionCount: [
      [1, "A"],
      [3, "B"],
      [6, "C"],
      [15, "D"]
    ],
    subagentDispatches: [
      [2, "A"],
      [4, "B"],
      [6, "C"],
      [10, "D"]
    ],
    fileRereadCount: [
      [3, "A"],
      [8, "B"],
      [15, "C"],
      [30, "D"]
    ],
    toolFailureRate: [
      [0.03, "A"],
      [0.05, "B"],
      [0.08, "C"],
      [0.15, "D"]
    ]
  };
  GRADE_ORDER = ["A", "B", "C", "D", "F"];
});

// crew/scripts/lib/cost-advisor-rules.mts
function findBash(s) {
  return s.cachePriming?.find((t) => t.name === "Bash");
}
function findSkill(s) {
  return s.cachePriming?.find((t) => t.name === "Skill");
}
function triggerCacheBusted(s) {
  return s.cacheHitPct > 0 && s.cacheHitPct < 95;
}
function severityCacheBusted(s) {
  return s.cacheHitPct < 60 ? "high" : s.cacheHitPct < 85 ? "medium" : "low";
}
function messageCacheBusted(s) {
  return `Cache hit ${s.cacheHitPct}% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.`;
}
function triggerOpusOveruse(s) {
  return s.opusUsdPct > 50;
}
function severityOpusOveruse(s) {
  return s.opusUsdPct > 80 ? "high" : "medium";
}
function messageOpusOveruse(s) {
  return `Opus accounts for ${s.opusUsdPct.toFixed(1)}% of spend \u2014 Opus is ~5x Sonnet on every token category.`;
}
function triggerOpusNoGradePayoff(s) {
  return s.opusUsdPct > 30 && s.gradeAvg != null && s.gradeAvg < 0.75;
}
function messageOpusNoGradePayoff(s) {
  return `Used Opus for ${s.opusUsdPct.toFixed(1)}% of cost but grade avg is ${s.gradeAvg}.`;
}
function triggerFileRereads(s) {
  return s.fileRereadCount >= 3;
}
function severityFileRereads(s) {
  return s.fileRereadCount >= 15 ? "high" : s.fileRereadCount >= 5 ? "medium" : "low";
}
function messageFileRereads(s) {
  return `${s.fileRereadCount} redundant Read calls of files already loaded this session.`;
}
function triggerLargeToolOutput(s) {
  return s.toolResultP90 > 4000;
}
function severityLargeToolOutput(s) {
  return s.toolResultP90 > 30000 ? "high" : s.toolResultP90 > 8000 ? "medium" : "low";
}
function messageLargeToolOutput(s) {
  return `90th-percentile tool result is ${s.toolResultP90.toLocaleString()} bytes.`;
}
function triggerSubagentOveruse(s) {
  return s.subagentDispatches > 2;
}
function severitySubagentOveruse(s) {
  return s.subagentDispatches > 6 ? "high" : s.subagentDispatches > 3 ? "medium" : "low";
}
function messageSubagentOveruse(s) {
  return `${s.subagentDispatches} subagent dispatches.`;
}
function triggerCompaction(s) {
  return s.compactionCount > 0;
}
function severityCompaction(s) {
  return s.compactionCount > 2 ? "high" : "medium";
}
function messageCompaction(s) {
  return `${s.compactionCount} compaction/meta event(s) \u2014 context was summarised mid-slice.`;
}
function triggerPreamble(s) {
  return s.turnsBeforeFirstTool > 3;
}
function severityPreamble(s) {
  return s.turnsBeforeFirstTool > 6 ? "medium" : "low";
}
function messagePreamble(s) {
  return `${s.turnsBeforeFirstTool} assistant turns before the first tool call.`;
}
function triggerToolFailureRate(s) {
  return s.totalToolCalls >= 10 && s.toolFailureRate > 0.05;
}
function severityToolFailureRate(s) {
  return s.toolFailureRate > 0.25 ? "high" : s.toolFailureRate > 0.1 ? "medium" : "low";
}
function messageToolFailureRate(s) {
  return `${(s.toolFailureRate * 100).toFixed(1)}% tool failure rate (${s.totalToolFailures}/${s.totalToolCalls}).`;
}
function triggerExplorationHeavy(s) {
  return Number.isFinite(s.explorationRatio) && s.explorationRatio > 4 && s.totalToolCalls >= 10;
}
function severityExplorationHeavy(s) {
  return s.explorationRatio > 8 ? "high" : "medium";
}
function messageExplorationHeavy(s) {
  return `Exploration:execution tool ratio is ${s.explorationRatio.toFixed(1)}:1 (Reads/Greps/Bashes vs Edits/Writes).`;
}
function triggerExpensiveFailure(s, base) {
  return base != null && s.usd > base.usdP75 && s.reviewDecision === "rejected";
}
function messageExpensiveFailure(s) {
  return `Spent $${s.usd.toFixed(2)} (>$${"top quartile"}) on a slice the review rejected.`;
}
function triggerCompactionCascade(s) {
  return s.compactionCount > 10 && s.subagentDispatches > 5;
}
function messageCompactionCascade(s) {
  return `${s.compactionCount} compactions + ${s.subagentDispatches} subagent dispatches \u2014 context overflow driven by excessive dispatching.`;
}
function triggerXrepoAttribution(s) {
  return s.autoDetected === true && !s.aggregateAll;
}
function messageXrepoAttribution(s) {
  return `Cost was auto-attributed to ${s.sourceProject} (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.`;
}
function triggerNonRepoDominant(s, _base, ctx) {
  if (!s.aggregateAll || !s.sources?.length || !ctx?.repoOwnSlug)
    return false;
  const own = s.sources.find((src) => src.slug === ctx.repoOwnSlug);
  const ownUsd = own?.usd ?? 0;
  const total = s.sources.reduce((a, b) => a + b.usd, 0);
  if (total === 0)
    return false;
  return ownUsd / total < 0.3;
}
function messageNonRepoDominant(s, _base, ctx) {
  const own = s.sources.find((src) => src.slug === ctx?.repoOwnSlug);
  const ownUsd = own?.usd ?? 0;
  const total = s.sources.reduce((a, b) => a + b.usd, 0);
  const pct = total > 0 ? (ownUsd / total * 100).toFixed(1) : "0";
  return `Only ${pct}% of spend ($${ownUsd.toFixed(2)} of $${total.toFixed(2)}) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.`;
}
function triggerManySources(s) {
  return s.aggregateAll && s.sourceCount >= 3;
}
function severityManySources(s) {
  return s.sourceCount >= 5 ? "high" : "low";
}
function messageManySources(s) {
  return `Slice spend spread across ${s.sourceCount} different Claude sessions. Hard to reason about; cache reuse is fragmented.`;
}
function triggerBashBloat(s) {
  const bash = findBash(s);
  if (!bash || bash.calls < 5)
    return false;
  const avgBytes = bash.resultBytes / bash.calls;
  return avgBytes > 5000;
}
function severityBashBloat(s) {
  const bash = findBash(s);
  const avg = bash ? bash.resultBytes / bash.calls : 0;
  return avg > 15000 ? "high" : avg > 8000 ? "medium" : "low";
}
function messageBashBloat(s) {
  const bash = findBash(s);
  const avg = bash ? Math.round(bash.resultBytes / bash.calls) : 0;
  return `Bash result size averages ${avg.toLocaleString()}B over ${bash?.calls ?? 0} calls. Big Bash output inflates cache_create.`;
}
function triggerDeadWeightSkill(s) {
  const skill = findSkill(s);
  if (!skill || skill.calls < 2)
    return false;
  return skill.ratio != null && skill.ratio > 5 && s.cacheHitPct > 0 && s.cacheHitPct < 95;
}
function messageDeadWeightSkill(s) {
  const skill = findSkill(s);
  return `Skill invocations have a ${skill?.ratio}\xD7 cache_create-to-result ratio while slice cache hit is only ${s.cacheHitPct}%. Skill prose is being injected but not amortized.`;
}
function applyRules(target, baseline, ctx = {}) {
  const fired = [];
  for (const rule of RULES) {
    try {
      if (rule.trigger(target, baseline, ctx)) {
        fired.push({
          id: rule.id,
          severity: rule.severity(target, baseline, ctx),
          message: rule.message(target, baseline, ctx),
          suggestion: rule.suggestion
        });
      }
    } catch {}
  }
  return fired;
}
var RULES;
var init_cost_advisor_rules = __esm(() => {
  RULES = [
    {
      id: "cache-busted",
      trigger: triggerCacheBusted,
      severity: severityCacheBusted,
      message: messageCacheBusted,
      suggestion: "Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache."
    },
    {
      id: "opus-overuse",
      trigger: triggerOpusOveruse,
      severity: severityOpusOveruse,
      message: messageOpusOveruse,
      suggestion: "Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors."
    },
    {
      id: "opus-no-grade-payoff",
      trigger: triggerOpusNoGradePayoff,
      severity: () => "high",
      message: messageOpusNoGradePayoff,
      suggestion: "Opus did not buy quality on this slice. Try Sonnet next time and invest the savings into more validation."
    },
    {
      id: "file-rereads",
      trigger: triggerFileRereads,
      severity: severityFileRereads,
      message: messageFileRereads,
      suggestion: "Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache."
    },
    {
      id: "large-tool-output",
      trigger: triggerLargeToolOutput,
      severity: severityLargeToolOutput,
      message: messageLargeToolOutput,
      suggestion: "Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create."
    },
    {
      id: "subagent-overuse",
      trigger: triggerSubagentOveruse,
      severity: severitySubagentOveruse,
      message: messageSubagentOveruse,
      suggestion: "Subagents cold-start with no cache reuse \u2014 each one re-derives session context. Reserve for genuinely independent parallel work."
    },
    {
      id: "compaction",
      trigger: triggerCompaction,
      severity: severityCompaction,
      message: messageCompaction,
      suggestion: "Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work."
    },
    {
      id: "preamble",
      trigger: triggerPreamble,
      severity: severityPreamble,
      message: messagePreamble,
      suggestion: "Long narration before action wastes output tokens. Skip narration on routine slices; act first, summarise after."
    },
    {
      id: "tool-failure-rate",
      trigger: triggerToolFailureRate,
      severity: severityToolFailureRate,
      message: messageToolFailureRate,
      suggestion: "Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first."
    },
    {
      id: "exploration-heavy",
      trigger: triggerExplorationHeavy,
      severity: severityExplorationHeavy,
      message: messageExplorationHeavy,
      suggestion: "Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts."
    },
    {
      id: "expensive-failure",
      trigger: triggerExpensiveFailure,
      severity: () => "high",
      message: messageExpensiveFailure,
      suggestion: "Mandate a written plan + brainstorming gate for similar slices before code is touched."
    },
    {
      id: "compaction-cascade",
      trigger: triggerCompactionCascade,
      severity: () => "high",
      message: messageCompactionCascade,
      suggestion: "Each subagent cold-starts the cache; the lead's context grows with each handoff read. Target \u22643 dispatches per slice. Bundle review + validation when scope is small. Write checkpoint handoffs at \u22653 compactions instead of dispatching more agents."
    },
    {
      id: "xrepo-attribution",
      trigger: triggerXrepoAttribution,
      severity: () => "medium",
      message: messageXrepoAttribution,
      suggestion: "Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug."
    },
    {
      id: "non-repo-dominant",
      trigger: triggerNonRepoDominant,
      severity: () => "medium",
      message: messageNonRepoDominant,
      suggestion: "Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context."
    },
    {
      id: "many-sources",
      trigger: triggerManySources,
      severity: severityManySources,
      message: messageManySources,
      suggestion: "Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes."
    },
    {
      id: "bash-bloat",
      trigger: triggerBashBloat,
      severity: severityBashBloat,
      message: messageBashBloat,
      suggestion: "Prefer Grep with head_limit, or pipe Bash through `| head -N`, or read a narrower file slice. Each broad Bash result is fresh cache_create on the next turn."
    },
    {
      id: "dead-weight-skill",
      trigger: triggerDeadWeightSkill,
      severity: () => "medium",
      message: messageDeadWeightSkill,
      suggestion: "Audit which skills auto-load. Heavy skills (caveman, crew, superpowers) inject 2-10KB of prose each \u2014 if they're not used in subsequent turns, disable autoload."
    }
  ];
});

// crew/scripts/lib/cost-advisor.mts
var exports_cost_advisor = {};
__export(exports_cost_advisor, {
  renderCostAdvisorMarkdown: () => renderCostAdvisorMarkdown,
  detectTrends: () => detectTrends,
  computeGrade: () => computeGrade,
  buildCostAdvisor: () => buildCostAdvisor
});
import fs14 from "fs/promises";
import path17 from "path";
function parseFrontmatter2(text) {
  const { data, body } = parseFrontmatter(text);
  return { fm: data, body };
}
function extractBodyMetric(body, label) {
  const m = body.match(new RegExp(`^-\\s+${label}:\\s*(.+)$`, "m"));
  return m ? m[1]?.trim() ?? null : null;
}
function extractCounter(body, label) {
  const m = body.match(new RegExp(`^-\\s+${label}:\\s*([\\d.,]+)`, "m"));
  return m ? Number(m[1]?.replace(/,/g, "")) : 0;
}
function extractToolUsage(body) {
  const section = body.split(/^##\s+/m).find((s) => s.startsWith("Tool Usage"));
  if (!section)
    return [];
  const out = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^-\s+([\w-]+):\s*([\d,]+)(?:\s*\((\d+)\s+failed\))?/);
    if (m && m[1] != null)
      out.push({
        name: m[1],
        count: Number(m[2]?.replace(/,/g, "")),
        failures: m[3] ? Number(m[3]) : 0
      });
  }
  return out;
}
function extractModelMix(body) {
  const section = body.split(/^##\s+/m).find((s) => s.startsWith("Model Mix"));
  if (!section)
    return [];
  const out = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^-\s+(\S+)\s+\(priced as\s+(\S+)\):\s*(\d+)\s+msgs\s+\(([\d.]+)%\),\s+\$([\d.]+)\s+\(([\d.]+)%\)/);
    if (m && m[1] != null && m[2] != null)
      out.push({
        model: m[1],
        pricedAs: m[2],
        messages: Number(m[3]),
        msgPct: Number(m[4]),
        usd: Number(m[5]),
        usdPct: Number(m[6])
      });
  }
  return out;
}
function median2(arr) {
  if (arr.length === 0)
    return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : s[mid] ?? 0;
}
function percentile2(arr, p) {
  if (arr.length === 0)
    return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] ?? 0;
}
async function collectReportFiles(dirs, nameFilter) {
  const files = [];
  for (const dir of dirs) {
    let entries;
    try {
      entries = await fs14.readdir(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (/-cost-report-.+\.md$/.test(e) && (nameFilter === null || nameFilter(e))) {
        files.push({ dir, name: e });
      }
    }
  }
  return files;
}
async function parseReportFiles(top) {
  const reports = [];
  for (const { dir, name } of top) {
    const f = path17.join(dir, name);
    try {
      const text = await fs14.readFile(f, "utf8");
      const { fm, body } = parseFrontmatter2(text);
      reports.push({ path: f, fm: fm ?? {}, body });
    } catch {}
  }
  return reports;
}
async function loadReports(repoPath, limit = 20, nameFilter = null) {
  const dirs = [
    path17.join(repoPath, ...REPORTS_DIR_PARTS),
    path17.join(repoPath, ...LEGACY_REPORTS_DIR_PARTS)
  ];
  const files = await collectReportFiles(dirs, nameFilter);
  files.sort((a, b) => b.name.localeCompare(a.name));
  return parseReportFiles(files.slice(0, limit));
}
function extractCachePriming(body) {
  const section = body.split(/^##\s+/m).find((s) => s.startsWith("Cache Priming"));
  if (!section)
    return [];
  const out = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^-\s+([\w-]+):\s+(\d+)\s+calls,\s+([\d,]+)B\s+results,\s+~([\d,]+)\s+cache_create\s+tok\s+\(([\d.]+|\u2014)/);
    if (m && m[1] != null) {
      const ratio = m[5] === "\u2014" ? null : Number(m[5]);
      out.push({
        name: m[1],
        calls: Number(m[2]),
        resultBytes: Number(m[3]?.replace(/,/g, "")),
        cacheCreateTokens: Number(m[4]?.replace(/,/g, "")),
        ratio
      });
    }
  }
  return out;
}
function extractSources(body) {
  const section = body.split(/^##\s+/m).find((s) => s.startsWith("Sources"));
  if (!section)
    return [];
  const out = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^-\s+(\S+):\s*(\d+)\s+msgs,\s+\$([\d.]+)/);
    if (m && m[1] != null)
      out.push({ slug: m[1], messages: Number(m[2]), usd: Number(m[3]) });
  }
  return out;
}
function repoOwnSlug(repoPath) {
  if (!repoPath)
    return null;
  return repoPath.replace(/[^A-Za-z0-9]/g, "-");
}
function toolCount(tools, name) {
  return tools.find((t) => t.name === name)?.count ?? 0;
}
function computeExplorationRatio(tools) {
  const exploration = toolCount(tools, "Read") + toolCount(tools, "Grep") + toolCount(tools, "Bash");
  const execution = toolCount(tools, "Write") + toolCount(tools, "Edit");
  if (execution > 0)
    return exploration / execution;
  return exploration > 0 ? Infinity : 0;
}
function summarizeToolStats(body) {
  const tools = extractToolUsage(body);
  const totalToolCalls = tools.reduce((a, t) => a + t.count, 0);
  const totalToolFailures = tools.reduce((a, t) => a + t.failures, 0);
  return {
    totalToolCalls,
    totalToolFailures,
    toolFailureRate: totalToolCalls > 0 ? totalToolFailures / totalToolCalls : 0,
    readCount: toolCount(tools, "Read"),
    bashCount: toolCount(tools, "Bash"),
    grepCount: toolCount(tools, "Grep"),
    writeCount: toolCount(tools, "Write"),
    editCount: toolCount(tools, "Edit"),
    explorationRatio: computeExplorationRatio(tools)
  };
}
function extractFmFields(r) {
  return {
    path: r.path,
    sliceId: r.fm["slice"] ?? null,
    usd: Number(r.fm["usd"]) || 0,
    durationMs: Number(r.fm["duration_ms"]) || 0,
    totalTokens: Number(r.fm["total_tokens"]) || 0,
    cacheHitPct: Number(r.fm["cache_hit_pct"]) || 0,
    gradeAvg: r.fm["grade_avg"] != null ? Number(r.fm["grade_avg"]) : null,
    reviewDecision: r.fm["review_decision"] ?? null,
    validationDecision: r.fm["validation_decision"] ?? null,
    sourceProject: r.fm["source_project"] ?? null,
    autoDetected: String(r.fm["auto_detected"] ?? "").toLowerCase() === "true",
    aggregateAll: String(r.fm["aggregate_all"] ?? "").toLowerCase() === "true",
    sourceCount: r.fm["source_count"] ? Number(r.fm["source_count"]) : 0
  };
}
function summarizeReport(r) {
  const body = r.body;
  const opusShare = extractModelMix(body).filter((m) => /opus/i.test(m.model)).reduce((a, b) => a + b.usdPct, 0);
  const tool = summarizeToolStats(body);
  return {
    ...extractFmFields(r),
    runTitle: r.fm["run_title"] ?? extractBodyMetric(body, "Run Title"),
    opusUsdPct: opusShare,
    ...tool,
    msgCount: extractCounter(body, "Assistant Messages Counted"),
    userMsgCount: extractCounter(body, "user_msg_count"),
    userMsgAvgLen: extractCounter(body, "user_msg_avg_len"),
    turnsBeforeFirstTool: extractCounter(body, "turns_before_first_tool"),
    compactionCount: extractCounter(body, "compaction_count"),
    skillInvocations: extractCounter(body, "skill_invocations"),
    subagentDispatches: extractCounter(body, "subagent_dispatches"),
    fileRereadCount: extractCounter(body, "redundant_read_count"),
    toolResultP90: extractCounter(body, "p90"),
    sources: extractSources(body),
    cachePriming: extractCachePriming(body)
  };
}
function checkCompactionDrift(r0, r1, r2) {
  if (!(r0.compactionCount > r1.compactionCount && r1.compactionCount > r2.compactionCount))
    return null;
  return {
    id: "compaction-drift",
    severity: "medium",
    message: `Compaction count has increased across the last 3 slices: ${r2.compactionCount} \u2192 ${r1.compactionCount} \u2192 ${r0.compactionCount}. Context window pressure is growing.`,
    suggestion: "Split work into smaller slices and write checkpoint handoffs earlier. If compaction hit once, treat it as a budget warning and wrap up that slice."
  };
}
function checkSubagentCreep(r0, r1, r2) {
  if (!(r0.subagentDispatches > r1.subagentDispatches && r1.subagentDispatches > r2.subagentDispatches))
    return null;
  return {
    id: "subagent-creep",
    severity: "medium",
    message: `Subagent dispatch count has grown across the last 3 slices: ${r2.subagentDispatches} \u2192 ${r1.subagentDispatches} \u2192 ${r0.subagentDispatches}. Each cold-start re-derives session context.`,
    suggestion: "Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work."
  };
}
function checkCostRegression(r0, r1, r2) {
  const med = median2([r0.usd, r1.usd, r2.usd]);
  if (!(med > 0 && r0.usd > med * 1.2))
    return null;
  const pctAbove = ((r0.usd - med) / med * 100).toFixed(0);
  return {
    id: "cost-regression",
    severity: "high",
    message: `Current slice cost $${r0.usd.toFixed(4)} is ${pctAbove}% above the last-3 median of $${med.toFixed(4)}.`,
    suggestion: "Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice."
  };
}
function detectTrends(reports) {
  if (!reports || reports.length < 3)
    return [];
  const r0 = reports[0];
  const r1 = reports[1];
  const r2 = reports[2];
  if (r0 == null || r1 == null || r2 == null)
    return [];
  const findings = [];
  const compaction = checkCompactionDrift(r0, r1, r2);
  if (compaction)
    findings.push(compaction);
  const subagent = checkSubagentCreep(r0, r1, r2);
  if (subagent)
    findings.push(subagent);
  const costReg = checkCostRegression(r0, r1, r2);
  if (costReg)
    findings.push(costReg);
  return findings;
}
function buildBaseline(history) {
  const usds = history.map((s) => s.usd).filter((v) => v > 0);
  const cacheHits = history.map((s) => s.cacheHitPct).filter((v) => v > 0);
  const opusShares = history.map((s) => s.opusUsdPct);
  return {
    n: history.length,
    usdMedian: median2(usds),
    usdP75: percentile2(usds, 75),
    cacheHitMedian: median2(cacheHits),
    opusShareMedian: median2(opusShares)
  };
}
function buildAggregateFlags(summaries, baseline) {
  const flags = [...detectTrends(summaries)];
  if (baseline.n >= 3 && baseline.cacheHitMedian > 0 && baseline.cacheHitMedian < 90) {
    flags.push({
      id: "trend-cache",
      severity: "medium",
      message: `Median cache hit across recent slices is ${baseline.cacheHitMedian.toFixed(1)}%.`,
      suggestion: "Recurring cache-bust pattern. Audit the workflow for steps that always inject fresh large content (e.g. broad Bash output before each Edit)."
    });
  }
  if (baseline.n >= 3 && baseline.opusShareMedian > 40) {
    flags.push({
      id: "trend-opus",
      severity: "medium",
      message: `Median Opus $ share is ${baseline.opusShareMedian.toFixed(1)}% across recent slices.`,
      suggestion: "Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped."
    });
  }
  return flags;
}
async function buildCostAdvisor(repoPath, {
  limit = 10,
  nameFilter = null
} = {}) {
  const reports = await loadReports(repoPath, limit, nameFilter);
  if (reports.length === 0) {
    return { reports: [], target: null, baseline: null, recommendations: [] };
  }
  const summaries = reports.map(summarizeReport);
  const target = summaries[0];
  const baseline = buildBaseline(summaries.slice(1));
  const slug = repoOwnSlug(repoPath);
  const recommendations = applyRules(target, baseline, ...slug != null ? [{ repoOwnSlug: slug }] : [{}]);
  const grade = computeGrade(target);
  const aggregateFlags = buildAggregateFlags(summaries, baseline);
  return { reports: summaries, target, baseline, recommendations, aggregateFlags, grade };
}
function renderFindingsSection(title, findings) {
  const lines = [title];
  if (findings.length === 0) {
    lines.push("- No rules fired. This slice is within healthy bounds.");
    return lines;
  }
  for (const r of findings) {
    lines.push(`### [${r.severity.toUpperCase()}] ${r.id}`);
    lines.push(`- ${r.message}`);
    lines.push(`- **Suggested action:** ${r.suggestion}`);
    lines.push("");
  }
  return lines;
}
function renderTargetHeader(advisor) {
  const lines = [];
  const t = advisor.target;
  if (advisor.grade)
    lines.push(`## Performance Grade: ${advisor.grade}`, "");
  lines.push(`Target slice: **${t.sliceId ?? t.runTitle ?? "?"}**`);
  lines.push(`Cost: $${t.usd.toFixed(4)} \xB7 duration ${(t.durationMs / 60000).toFixed(1)} min \xB7 cache hit ${t.cacheHitPct}% \xB7 grade avg ${t.gradeAvg ?? "-"}`);
  lines.push("");
  const b = advisor.baseline;
  if (b && b.n > 0) {
    lines.push("## Baseline (last " + b.n + " slices)");
    lines.push(`- median $: $${b.usdMedian.toFixed(2)}`);
    lines.push(`- p75 $: $${b.usdP75.toFixed(2)}`);
    lines.push(`- median cache hit: ${b.cacheHitMedian.toFixed(1)}%`);
    lines.push(`- median Opus share: ${b.opusShareMedian.toFixed(1)}%`);
    lines.push("");
  }
  return lines;
}
function renderCostAdvisorMarkdown(advisor) {
  const lines = ["# Cost Advisor", ""];
  if (!advisor.target) {
    lines.push("- No cost reports found. Run cost-slice first.");
    return lines.join(`
`);
  }
  lines.push(...renderTargetHeader(advisor));
  lines.push(...renderFindingsSection("## Per-slice findings", advisor.recommendations));
  if (advisor.aggregateFlags?.length) {
    lines.push(...renderFindingsSection("## Cross-slice trends", advisor.aggregateFlags));
  }
  return lines.join(`
`);
}
var REPORTS_DIR_PARTS, LEGACY_REPORTS_DIR_PARTS;
var init_cost_advisor = __esm(() => {
  init_dist2();
  init_cost_advisor_grades();
  init_cost_advisor_rules();
  init_cost_advisor_grades();
  REPORTS_DIR_PARTS = [".claude", "artifacts", "crew", "cost"];
  LEGACY_REPORTS_DIR_PARTS = [".claude", "artifacts", "crew", "runs"];
});

// crew/scripts/lib/build-bundle/types.mts
var SCHEMA_VERSION = 1, DEFAULT_SIZE_CAP_BYTES, SECTION_HEADERS;
var init_types2 = __esm(() => {
  DEFAULT_SIZE_CAP_BYTES = 200 * 1024;
  SECTION_HEADERS = {
    handoff: "## Handoff",
    diff: "## Diff",
    filesTouched: "## Files touched",
    filesRead: "## Files read"
  };
});

// crew/scripts/lib/build-bundle/assemble.mts
var exports_assemble = {};
__export(exports_assemble, {
  assembleBuildBundle: () => assembleBuildBundle
});
import fs15 from "fs/promises";
import path18 from "path";
import { execFileSync } from "child_process";
import crypto2 from "crypto";
function bundleDir(repo, sliceId) {
  const slice = sliceId === ORPHAN_SLICE ? "orphan" : sliceId;
  return path18.join(repo, BUNDLES_REL, slice);
}
function bundleFile(repo, inputs) {
  return path18.join(bundleDir(repo, inputs.sliceId), `${inputs.builderName}-${inputs.runId}-build-bundle.md`);
}
function isInsideRepo(repo, candidate) {
  const rel = path18.relative(repo, path18.resolve(repo, candidate));
  return !rel.startsWith("..") && !path18.isAbsolute(rel);
}
function computeDiffStat(repo) {
  try {
    const out = execFileSync("git", ["diff", "--numstat"], {
      cwd: repo,
      encoding: "utf8"
    });
    let files = 0;
    let additions = 0;
    let deletions = 0;
    for (const line of out.split(/\r?\n/)) {
      if (!line.trim())
        continue;
      const [a, d] = line.split(/\s+/, 2);
      const aNum = Number(a);
      const dNum = Number(d);
      if (Number.isFinite(aNum))
        additions += aNum;
      if (Number.isFinite(dNum))
        deletions += dNum;
      files += 1;
    }
    return { files, additions, deletions };
  } catch {
    return { files: 0, additions: 0, deletions: 0 };
  }
}
function gitDiff(repo) {
  try {
    return execFileSync("git", ["diff"], { cwd: repo, encoding: "utf8" });
  } catch {
    return "";
  }
}
async function readFileMaybeBinary(abs) {
  const stat2 = await fs15.stat(abs);
  const handle = await fs15.open(abs, "r");
  try {
    const buf = Buffer.alloc(Math.min(BINARY_DETECT_BYTES, stat2.size));
    await handle.read(buf, 0, buf.length, 0);
    if (buf.includes(0)) {
      const all = await fs15.readFile(abs);
      const sha = crypto2.createHash("sha256").update(all).digest("hex").slice(0, 16);
      return { content: "", isBinary: true, size: stat2.size, sha };
    }
  } finally {
    await handle.close();
  }
  const content = await fs15.readFile(abs, "utf8");
  return { content, isBinary: false, size: stat2.size };
}
async function buildFileListSection(repo, files, treatOutsideRepoAsSkip) {
  const skipped = [];
  const sorted = [...files].sort();
  const parts = [];
  for (const rel of sorted) {
    if (treatOutsideRepoAsSkip && !isInsideRepo(repo, rel)) {
      skipped.push({ path: rel, reason: "outside-repo" });
      continue;
    }
    const abs = path18.resolve(repo, rel);
    try {
      const { content, isBinary, size, sha } = await readFileMaybeBinary(abs);
      if (isBinary) {
        parts.push(`### ${rel}

\`\`\`
<binary file, ${size} bytes, sha=${sha}>
\`\`\`
`);
      } else {
        parts.push(`### ${rel}

\`\`\`
${content}
\`\`\`
`);
      }
    } catch (err2) {
      const code = err2.code;
      if (code === "ENOENT") {
        skipped.push({ path: rel, reason: "deleted" });
        continue;
      }
      throw err2;
    }
  }
  return { body: parts.join(`
`), skipped };
}
function yamlList(items) {
  if (items.length === 0)
    return "[]";
  return `[${items.map((s) => JSON.stringify(s)).join(", ")}]`;
}
function renderFrontmatter(fm) {
  const lines = ["---", `slice: ${fm.slice}`, `builder: ${fm.builder}`, `run_id: ${fm.run_id}`];
  if (fm.feat)
    lines.push(`feat: ${fm.feat}`);
  lines.push(`files_touched: ${yamlList(fm.files_touched)}`);
  lines.push(`files_read: ${yamlList(fm.files_read)}`);
  if (fm.files_read_skipped && fm.files_read_skipped.length > 0) {
    lines.push("files_read_skipped:");
    for (const s of fm.files_read_skipped) {
      lines.push(`  - { path: ${JSON.stringify(s.path)}, reason: ${s.reason} }`);
    }
  }
  lines.push(`diff_stat: { files: ${fm.diff_stat.files}, additions: ${fm.diff_stat.additions}, deletions: ${fm.diff_stat.deletions} }`);
  lines.push(`truncated: ${fm.truncated}`);
  lines.push(`truncation_reason: ${fm.truncation_reason ?? "null"}`);
  lines.push(`schema_version: ${fm.schema_version}`);
  lines.push("---");
  return lines.join(`
`);
}
async function atomicWrite(file, content) {
  await fs15.mkdir(path18.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}`;
  await fs15.writeFile(tmp, content, "utf8");
  await fs15.rename(tmp, file);
}
async function assembleBuildBundle(inputs) {
  const cap = inputs.sizeCapBytes ?? DEFAULT_SIZE_CAP_BYTES;
  const touched = await buildFileListSection(inputs.repoPath, inputs.filesTouched, false);
  const read = await buildFileListSection(inputs.repoPath, inputs.filesRead, true);
  const diffStat = computeDiffStat(inputs.repoPath);
  const diffBody = gitDiff(inputs.repoPath);
  const survivingTouched = inputs.filesTouched.filter((p) => !touched.skipped.some((s) => s.path === p));
  const survivingRead = inputs.filesRead.filter((p) => !read.skipped.some((s) => s.path === p)).sort();
  const allSkipped = [...touched.skipped, ...read.skipped];
  let truncated = false;
  let frontmatter2 = {
    slice: inputs.sliceId,
    builder: inputs.builderName,
    run_id: inputs.runId,
    ...inputs.feat !== undefined ? { feat: inputs.feat } : {},
    files_touched: [...survivingTouched].sort(),
    files_read: survivingRead,
    ...allSkipped.length > 0 ? { files_read_skipped: allSkipped } : {},
    diff_stat: diffStat,
    truncated,
    truncation_reason: null,
    schema_version: SCHEMA_VERSION
  };
  const composeBody = (handoff, diff, touchedBody, readBody) => [
    renderFrontmatter(frontmatter2),
    "",
    SECTION_HEADERS.handoff,
    "",
    handoff,
    SECTION_HEADERS.diff,
    "",
    "```diff",
    diff,
    "```",
    "",
    SECTION_HEADERS.filesTouched,
    "",
    touchedBody,
    SECTION_HEADERS.filesRead,
    "",
    readBody
  ].join(`
`);
  let body = composeBody(inputs.handoffBody, diffBody, touched.body, read.body);
  if (Buffer.byteLength(body, "utf8") > cap) {
    truncated = true;
    const dropResult = await truncateFilesReadToFitCap({
      inputs,
      cap,
      frontmatter: frontmatter2,
      composeBody,
      diffBody,
      touched,
      body
    });
    frontmatter2 = dropResult.frontmatter;
    body = dropResult.body;
    if (Buffer.byteLength(body, "utf8") > cap) {
      const touchedDropResult = await truncateFilesTouchedToFitCap({
        inputs,
        cap,
        frontmatter: frontmatter2,
        composeBody,
        diffBody,
        body
      });
      frontmatter2 = touchedDropResult.frontmatter;
      body = touchedDropResult.body;
    }
  }
  const file = bundleFile(inputs.repoPath, inputs);
  await atomicWrite(file, body);
  return {
    path: file,
    bytes: Buffer.byteLength(body, "utf8"),
    truncated,
    filesReadSkipped: allSkipped
  };
}
async function truncateFilesReadToFitCap(args) {
  let { frontmatter: frontmatter2, body } = args;
  const lru = args.inputs.ledger ? [...args.inputs.ledger].sort((a, b) => a.last_read_at.localeCompare(b.last_read_at)).map((e) => e.path) : [...frontmatter2.files_read];
  const keepRead = new Set(frontmatter2.files_read);
  while (Buffer.byteLength(body, "utf8") > args.cap && keepRead.size > 0 && lru.length > 0) {
    const drop = lru.shift();
    if (drop)
      keepRead.delete(drop);
    const filtered = await buildFileListSection(args.inputs.repoPath, [...keepRead], true);
    frontmatter2 = {
      ...frontmatter2,
      files_read: [...keepRead].sort(),
      truncated: true,
      truncation_reason: "size-cap"
    };
    body = args.composeBody(args.inputs.handoffBody, args.diffBody, args.touched.body, filtered.body);
  }
  return { frontmatter: frontmatter2, body };
}
async function truncateFilesTouchedToFitCap(args) {
  let { frontmatter: frontmatter2, body } = args;
  const keepTouched = [...frontmatter2.files_touched].sort();
  while (Buffer.byteLength(body, "utf8") > args.cap && keepTouched.length > 0) {
    keepTouched.pop();
    const filtered = await buildFileListSection(args.inputs.repoPath, keepTouched, false);
    frontmatter2 = {
      ...frontmatter2,
      files_touched: keepTouched,
      truncated: true,
      truncation_reason: "size-cap"
    };
    body = args.composeBody(args.inputs.handoffBody, args.diffBody, filtered.body, "");
  }
  return { frontmatter: frontmatter2, body };
}
var ORPHAN_SLICE = "unknown", BUNDLES_REL, BINARY_DETECT_BYTES = 8192;
var init_assemble = __esm(() => {
  init_types2();
  BUNDLES_REL = path18.join(".claude", "artifacts", "crew", "bundles");
});

// crew/scripts/lib/installer/util.mts
import fs16 from "fs/promises";
import path19 from "path";
function indentJson(value) {
  return `${JSON.stringify(value, null, 2)}
`;
}
async function ensureDir2(dirPath) {
  await fs16.mkdir(dirPath, { recursive: true });
}
async function writeFileIfChanged(filePath, contents, options = {}) {
  const existing = await fs16.readFile(filePath, "utf8").catch(() => null);
  if (existing === contents) {
    return false;
  }
  await ensureDir2(path19.dirname(filePath));
  await fs16.writeFile(filePath, contents, options);
  return true;
}
async function writeSeedIfMissing(filePath, contents, options = {}) {
  if (await pathExists(filePath)) {
    return false;
  }
  await ensureDir2(path19.dirname(filePath));
  await fs16.writeFile(filePath, contents, options);
  return true;
}
var init_util2 = __esm(() => {
  init_fs_utils();
  init_fs_utils();
});

// crew/scripts/lib/installer/templates.mts
function guardedHookCommand(script, args) {
  const scriptPath = `\${PWD}/.claude/hooks/${script}`;
  return `s="${scriptPath}"; [ -f "$s" ] || exit 0; exec "$s"${args ? ` ${args}` : ""}`;
}
var GLOBAL_MEMORY_VERSION = "1.1", GLOBAL_METADATA_TEMPLATE, CLAUDE_IMPORT_BLOCK, LEGACY_CLAUDE_MARKER_START = "<!-- engineering-os:start -->", LEGACY_CLAUDE_MARKER_END = "<!-- engineering-os:end -->", GITIGNORE_MARKER_START = "# crew:start", GITIGNORE_MARKER_END = "# crew:end", GITIGNORE_BLOCK, CONSTITUTION_TEMPLATE = `# Engineering OS Constitution

This repository uses the Engineering OS harness for structured software work inside Claude Code.

## Core Rules

1. Keep one owner per task. Shared ownership creates merge conflicts and confused accountability that cost the user time.
2. Keep task scope explicit. Ambiguous scope leads to wasted effort and work that has to be redone.
3. Retrieve bounded repo context before substantial work. Starting without it means paying for rediscovery that was already done.
4. Structured handoffs protect the user from lost context. Without them, the next agent or session starts blind.
5. Treat review as a gate, not a courtesy. Unreviewed code reaching the user's repo is a quality risk they cannot easily undo.
6. Treat validation and deployment evidence as separate gates when behavior or environments are involved. The user needs to know that changed behavior works, not just that code looks correct.
7. Leave durable artifacts and repo memory behind when work would matter later. Skipping them means the next session has no record of what happened or why.

## Team Roles

- dispatcher (concept, not agent): planning, delegation, synthesis via /crew:build \xB7 /crew:fix \xB7 /crew:ship
- builder: bounded implementation
- reviewer: independent change review
- validator: behavior and scenario verification
- deployer: deployment and environment evidence
- researcher: read-only investigation

## Memory And Artifact Habit

The user depends on artifacts to resume work after compaction, across sessions, or when context is lost.

Substantial work should start from bounded repo memory:

- \`CLAUDE.md\`
- \`.claude/crew/*.md\`
- latest relevant wake-up context and artifacts

Substantial work should leave inspectable artifacts under:

- \`.claude/artifacts/crew/runs/\`
- \`.claude/artifacts/crew/handoffs/\`
- \`.claude/artifacts/crew/reviews/\`
- \`.claude/artifacts/crew/validations/\`
- \`.claude/artifacts/crew/deployments/\`

For shipping work, keep durable repo deployment guidance in:

- \`.claude/crew/deployment.md\`

## Scope Discipline

These situations create merge conflicts, wasted effort, or confused ownership that costs the user time. Stop and re-scope if:

- two agents need the same file
- the assignment boundary is unclear
- the work needs a broader refactor than assigned

## Commit Discipline

Baseline: do not create commits unless the user explicitly asks. Unrequested commits in the user's repo are a quality and trust risk they cannot easily undo.

Exception \u2014 \`dev.stable\` opt-in:

- If the current repo's \`.claude/crew/deployment.md\` contains a \`dev.stable: true\` setting, the dispatcher and builder MAY create commits without asking on each individual edit, as long as ALL of the following hold:
  - the change came from a \`/crew:build\` or \`/crew:fix\` flow that reached the synthesis step
  - the latest review artifact for the run is \`PASS\` (or \`review_skipped\` was recorded with an explicit reason)
  - the latest validation artifact for the run is \`PASS\` (or \`validation_skipped\` was recorded with an explicit reason)
  - no \`help_request\` workflow badge is open
  - the work is local commits only \u2014 not a release tag, not a force-push, not a production deploy
- If any gate is missing or red, fall back to baseline (ask first).
- The user may override the flag at any time by saying "do not commit" or equivalent during the session. Session-level instruction always beats the repo flag.
- Production promotion, tag pushes, and force-pushes are NEVER unlocked by \`dev.stable\` \u2014 they still require explicit user approval per the release-engineer rules.

See \`agents/release-engineer.md\` \u2192 Deployment guidance schema for the field definition.
`, WORKFLOW_TEMPLATE = `# Engineering OS Workflow

## Preferred Sequence

1. verify the repo and current workspace
2. retrieve bounded wake-up context before substantial work
3. choose mode: single-session, assisted single-session, or team run
4. define task ownership and scope
5. implement or investigate in bounded chunks
6. review code-bearing work before calling it done
7. validate behavior when it can be exercised meaningfully
8. gather deployment evidence when shipping through environments
9. leave a final synthesis

## Default Gate Policy

Each gate protects the user from a different class of risk. Skipping a gate silently means the user assumes it passed when it did not.

- code changed -> independent review required (protects from regressions and quality erosion)
- runnable, observable, or user-visible behavior changed -> validation expected (protects from shipping broken behavior)
- deployment or promotion work -> deployment evidence expected (protects from unverified environment state)
- production promotion -> explicit user approval required (protects the user's production systems)

## Write-Back Discipline

The user depends on these artifacts to resume work after compaction, across sessions, or when context is lost. Skipping a write-back means the next session starts with no record of what happened.

- substantial run start -> run brief
- ownership change -> handoff
- review completion -> review result immediately
- validation completion -> validation result immediately
- meaningful deployment evidence -> deployment check immediately
- substantial completion -> final synthesis

## Handoff Format

Every substantial handoff should include:

- objective
- owner
- allowed scope
- forbidden scope
- deliverable
- changed files or evidence
- confidence level
- risks or open questions
- suggested next handoff

## Ownership And Tests

Builder owns code-bearing tasks, including tests for changed behavior when practical. Reviewer
owns independent change review. Validator owns behavior validation when behavior can be exercised
meaningfully. Deployer owns environment evidence when shipping through dev or prod.
`, PROTOCOL_TEMPLATE = `# Crew Agent Protocol

This document captures the shape of the structured communication artifacts agents leave behind
so the next agent or session can resume without rediscovery.

## Run Brief

Created at the start of a substantial run. Captures:

- title, goal, mode
- in-scope and out-of-scope summary
- first bounded work chunk
- whether tests were added or updated as part of this run
- next responsible step

## Handoff

Created whenever ownership changes or a teammate hands work back. Captures:

- objective and owner
- allowed scope and forbidden scope
- deliverable and changed files or evidence
- confidence level and open risks
- suggested next handoff

## Review Result

Created immediately when independent review materially completes. Captures:

- artifact or change reviewed
- standards applied (repo standards, language standards, configured review skills)
- decision: passed, failed, or skipped with a reason
- findings, risks, and required follow-ups
- whether tests were added or updated alongside the change

## Validation Plan And Validation Result

A validation plan describes the scenario, the environment, and the evidence to collect.
A validation result records what actually happened:

- scenario exercised
- evidence gathered (logs, screenshots, telemetry)
- decision: passed, failed, or skipped with a reason
- residual risk and the next responsible step

## Deployment Result

Created when an environment transition produces meaningful evidence. Captures:

- target environment (dev or prod)
- resource or service identity (URL, image, revision)
- decision: passed, failed, or skipped with a reason
- log or telemetry pointer for the change
- post-deploy validation status and the next responsible step

## Final Synthesis

Created at the end of a substantial run. Captures:

- what changed and why
- what was reviewed, validated, and deployed
- residual risk and the next recommended step
- whether tests were added or updated as part of this run
`, ARTIFACT_README_TEMPLATE = `# Crew Artifacts

This directory stores inspectable run artifacts for the Crew harness.

- \`runs/\` for run briefs and final syntheses
- \`handoffs/\` for task ownership and completion notes
- \`reviews/\` for review results and rejection notes
- \`validations/\` for validation plans and validation results
- \`deployments/\` for deployment checks and environment evidence
`, STATE_README_TEMPLATE = `# Crew State

This directory stores lightweight repo-local coordination state.

- \`claims.json\` tracks current file ownership claims
- \`history.jsonl\` stores append-only claim and release events
- \`workflow-state.json\` stores the current run and gate badge state
- \`sprint.json\` is an optional sprint or focus configuration
`, CLAIMS_TEMPLATE, SPRINT_TEMPLATE, HOOK_SCRIPT_TEMPLATE = `#!/usr/bin/env bash
set -euo pipefail

event_name="\${1:-unknown}"
project_dir="\${CLAUDE_PROJECT_DIR:-$PWD}"
log_dir="\${project_dir}/.claude/logs"
payload_dir="\${log_dir}/payloads"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
stamp="$(date -u +"%Y%m%dT%H%M%SZ")"
payload_path="\${payload_dir}/\${stamp}-$$-\${event_name}.json"
events_path="\${log_dir}/events.jsonl"

mkdir -p "$payload_dir"

if [ -t 0 ]; then
  printf '{}\\n' > "$payload_path"
else
  cat > "$payload_path"
fi

printf '{"schemaVersion":"1.0","source":"crew","timestamp":"%s","event":"%s","repoPath":"%s","payloadPath":"%s"}\\n' \\
  "$timestamp" \\
  "$event_name" \\
  "$project_dir" \\
  "$payload_path" >> "$events_path"
`, GIT_GATE_REMINDER_TEMPLATE = `#!/usr/bin/env bash
set -euo pipefail

payload="$(cat || true)"
if [ -z "$payload" ]; then
  exit 0
fi

HOOK_PAYLOAD="$payload" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

function hasCommitLikeCommand(command) {
  return /(^|[;&|()]|\\s)git\\s+commit(\\s|$)/.test(command);
}

function hasPrLikeCommand(command) {
  return /(^|[;&|()]|\\s)gh\\s+pr\\s+(create|merge)(\\s|$)/.test(command);
}

function pendingBadges(run) {
  const pending = [];
  if (run?.gates?.review?.status === "required") pending.push("review_required");
  if (run?.gates?.validation?.status === "expected") pending.push("validation_expected");
  if (run?.gates?.deployment?.dev?.status === "expected") pending.push("dev_deploy_expected");
  if (run?.gates?.deployment?.prod?.status === "expected") pending.push("prod_deploy_expected");
  return pending;
}

function missingArtifactWrites(run) {
  const missing = [];
  const hasPendingGates = Boolean(
    run?.gates?.review?.status === "required" ||
    run?.gates?.validation?.status === "expected" ||
    run?.gates?.deployment?.dev?.status === "expected" ||
    run?.gates?.deployment?.prod?.status === "expected"
  );
  const hasAnyGate = Boolean(
    run?.gates?.review ||
    run?.gates?.validation ||
    run?.gates?.deployment?.dev ||
    run?.gates?.deployment?.prod
  );
  const hasMeaningfulProgress = Boolean(
    hasAnyGate ||
    run?.artifacts?.handoffs?.length ||
    run?.artifacts?.reviewResult ||
    run?.artifacts?.validationPlan ||
    run?.artifacts?.validationResult ||
    run?.artifacts?.deploymentChecks?.dev ||
    run?.artifacts?.deploymentChecks?.prod ||
    run?.next
  );
  const hasCompletedPhaseEvidence = Boolean(
    run?.gates?.review?.status === "passed" ||
    run?.gates?.review?.status === "failed" ||
    run?.gates?.review?.status === "skipped" ||
    run?.gates?.validation?.status === "passed" ||
    run?.gates?.validation?.status === "failed" ||
    run?.gates?.validation?.status === "skipped" ||
    run?.gates?.deployment?.dev?.status === "passed" ||
    run?.gates?.deployment?.dev?.status === "failed" ||
    run?.gates?.deployment?.dev?.status === "skipped" ||
    run?.gates?.deployment?.prod?.status === "passed" ||
    run?.gates?.deployment?.prod?.status === "failed" ||
    run?.gates?.deployment?.prod?.status === "skipped" ||
    run?.artifacts?.reviewResult ||
    run?.artifacts?.validationResult ||
    run?.artifacts?.deploymentChecks?.dev ||
    run?.artifacts?.deploymentChecks?.prod
  );
  const substantialRun = Boolean(
    run?.mode === "assisted single-session" ||
    run?.mode === "team run" ||
    run?.artifacts?.handoffs?.length ||
    run?.artifacts?.validationPlan ||
    run?.artifacts?.validationResult ||
    run?.artifacts?.deploymentChecks?.dev ||
    run?.artifacts?.deploymentChecks?.prod ||
    run?.gates?.validation ||
    run?.gates?.deployment?.dev ||
    run?.gates?.deployment?.prod
  );

  if ((run?.gates?.review?.status === "passed" || run?.gates?.review?.status === "failed") && !run?.artifacts?.reviewResult) {
    missing.push("review-result artifact");
  }
  if ((run?.gates?.validation?.status === "passed" || run?.gates?.validation?.status === "failed") && !run?.artifacts?.validationResult) {
    missing.push("validation-result artifact");
  }
  if ((run?.gates?.deployment?.dev?.status === "passed" || run?.gates?.deployment?.dev?.status === "failed") && !run?.artifacts?.deploymentChecks?.dev) {
    missing.push("dev deployment-check artifact");
  }
  if ((run?.gates?.deployment?.prod?.status === "passed" || run?.gates?.deployment?.prod?.status === "failed") && !run?.artifacts?.deploymentChecks?.prod) {
    missing.push("prod deployment-check artifact");
  }
  if (substantialRun && hasMeaningfulProgress && !run?.artifacts?.runBrief) {
    missing.push("run-brief artifact");
  }
  if (substantialRun && hasCompletedPhaseEvidence && !hasPendingGates && !run?.artifacts?.finalSynthesis) {
    missing.push("final-synthesis artifact");
  }
  return missing;
}

const input = JSON.parse(process.env.HOOK_PAYLOAD || "{}");
if (input.hook_event_name !== "PreToolUse" || input.tool_name !== "Bash") {
  process.exit(0);
}

const command = input.tool_input?.command || "";
const isCommit = hasCommitLikeCommand(command);
const isPr = hasPrLikeCommand(command);
if (!isCommit && !isPr) {
  process.exit(0);
}

const cwd = input.cwd || process.cwd();
const crewWorkflowPath = path.join(cwd, ".claude", "state", "crew", "workflow-state.json");
const legacyWorkflowPath = path.join(cwd, ".claude", "state", "engineering-os", "workflow-state.json");
const workflowPath = fs.existsSync(crewWorkflowPath)
  ? crewWorkflowPath
  : (fs.existsSync(legacyWorkflowPath) ? legacyWorkflowPath : null);
if (!workflowPath) {
  process.exit(0);
}

const workflowState = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
const currentRun = workflowState.currentRun;
if (!currentRun) {
  process.exit(0);
}

const pending = pendingBadges(currentRun);
const missingWrites = missingArtifactWrites(currentRun);
if (pending.length === 0 && missingWrites.length === 0) {
  process.exit(0);
}

const action = isCommit ? "git commit" : "gh pr";
const messageParts = ["Crew reminder:"];
if (pending.length > 0) {
  messageParts.push(\`pending workflow gates before \${action}: \${pending.join(", ")}\`);
}
if (missingWrites.length > 0) {
  messageParts.push(\`phase-complete write-backs still missing before \${action}: \${missingWrites.join(", ")}\`);
}
messageParts.push("Recommended next step: write the matching review/validation/deployment artifact now, or record an explicit skip before moving on.");
const message = messageParts.join(" ");

process.stdout.write(JSON.stringify({
  continue: true,
  suppressOutput: true,
  systemMessage: message
}));
NODE
`, DEFAULT_SETTINGS;
var init_templates = __esm(() => {
  GLOBAL_METADATA_TEMPLATE = {
    managedBy: "crew",
    version: GLOBAL_MEMORY_VERSION,
    files: ["constitution.md", "workflow.md"]
  };
  CLAUDE_IMPORT_BLOCK = [
    "<!-- crew:start -->",
    "<!-- Crew framework memory. Run /crew:install after plugin updates that change framework memory. -->",
    "@.claude/crew/constitution.md",
    "<!-- crew:end -->"
  ].join(`
`);
  GITIGNORE_BLOCK = [
    GITIGNORE_MARKER_START,
    "# Crew framework local state. Generated; do not edit between markers.",
    ".claude/logs/",
    ".claude/state/crew/history.jsonl",
    ".claude.backup.*",
    GITIGNORE_MARKER_END
  ].join(`
`);
  CLAIMS_TEMPLATE = {
    version: "1.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
    claims: {},
    warnings: []
  };
  SPRINT_TEMPLATE = {
    focus: "P1",
    notes: [
      "Replace or remove this file if you do not use sprint-style priorities.",
      "Crew keeps this repo-local so coordination remains inspectable."
    ]
  };
  DEFAULT_SETTINGS = {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|clear|compact",
          hooks: [
            {
              type: "command",
              command: guardedHookCommand("log_event.sh", "session_start"),
              description: "crew:session-start"
            }
          ]
        }
      ],
      TaskCreated: [
        {
          hooks: [
            {
              type: "command",
              command: guardedHookCommand("log_event.sh", "task_created"),
              description: "crew:task-created"
            }
          ]
        }
      ],
      TaskCompleted: [
        {
          hooks: [
            {
              type: "command",
              command: guardedHookCommand("log_event.sh", "task_completed"),
              description: "crew:task-completed"
            }
          ]
        }
      ],
      SubagentStart: [
        {
          hooks: [
            {
              type: "command",
              command: guardedHookCommand("log_event.sh", "subagent_start"),
              description: "crew:subagent-start"
            }
          ]
        }
      ],
      SubagentStop: [
        {
          hooks: [
            {
              type: "command",
              command: guardedHookCommand("log_event.sh", "subagent_stop"),
              description: "crew:subagent-stop"
            }
          ]
        }
      ],
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            {
              type: "command",
              command: guardedHookCommand("check_git_gate.sh"),
              description: "crew:git-gate-reminder"
            }
          ]
        }
      ]
    }
  };
});

// crew/scripts/lib/installer/claude-md.mts
import fs17 from "fs/promises";
import path20 from "path";
function replaceLegacyMarkerBlock(existing) {
  const startIndex = existing.indexOf(LEGACY_CLAUDE_MARKER_START);
  const endIndex = existing.indexOf(LEGACY_CLAUDE_MARKER_END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }
  const before = existing.slice(0, startIndex).trimEnd();
  const after = existing.slice(endIndex + LEGACY_CLAUDE_MARKER_END.length).trimStart();
  const parts = [before, CLAUDE_IMPORT_BLOCK];
  if (after) {
    parts.push(after);
  }
  return `${parts.join(`

`)}
`;
}
async function updateClaudeMd(repoPath, writes) {
  const claudePath = path20.join(repoPath, "CLAUDE.md");
  const existing = await fs17.readFile(claudePath, "utf8").catch(() => null);
  if (existing === null) {
    const contents = [
      "# Repo Instructions",
      "",
      "This repository uses the Crew harness.",
      "",
      CLAUDE_IMPORT_BLOCK,
      ""
    ].join(`
`);
    await writeFileIfChanged(claudePath, contents);
    writes.push(path20.relative(repoPath, claudePath));
    return;
  }
  if (existing.includes("<!-- crew:start -->")) {
    return;
  }
  if (existing.includes(LEGACY_CLAUDE_MARKER_START)) {
    const upgraded = replaceLegacyMarkerBlock(existing);
    if (upgraded !== null) {
      await writeFileIfChanged(claudePath, upgraded);
      writes.push(path20.relative(repoPath, claudePath));
      return;
    }
  }
  const next = `${existing.trimEnd()}

${CLAUDE_IMPORT_BLOCK}
`;
  await writeFileIfChanged(claudePath, next);
  writes.push(path20.relative(repoPath, claudePath));
}
var init_claude_md = __esm(() => {
  init_util2();
  init_templates();
});

// crew/scripts/lib/installer/gitignore.mts
import fs18 from "fs/promises";
import path21 from "path";
async function updateGitignore(repoPath, writes) {
  const ignorePath = path21.join(repoPath, ".gitignore");
  const existing = await fs18.readFile(ignorePath, "utf8").catch(() => null);
  if (existing === null) {
    const contents = `${GITIGNORE_BLOCK}
`;
    await writeFileIfChanged(ignorePath, contents);
    writes.push(path21.relative(repoPath, ignorePath));
    return;
  }
  const startIdx = existing.indexOf(GITIGNORE_MARKER_START);
  const endIdx = existing.indexOf(GITIGNORE_MARKER_END);
  let next;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + GITIGNORE_MARKER_END.length);
    next = `${before}${GITIGNORE_BLOCK}${after}`;
  } else {
    next = `${existing.trimEnd()}

${GITIGNORE_BLOCK}
`;
  }
  const changed = await writeFileIfChanged(ignorePath, next);
  if (changed) {
    writes.push(path21.relative(repoPath, ignorePath));
  }
}
var init_gitignore = __esm(() => {
  init_util2();
  init_templates();
});

// crew/scripts/lib/installer/settings.mts
import fs19 from "fs/promises";
import path22 from "path";
function isCrewHook(entry) {
  const hooks = Array.isArray(entry?.hooks) ? entry.hooks : [];
  return hooks.some((hook) => {
    const command = hook?.command ?? "";
    const description = hook?.description ?? "";
    return command.includes(".claude/hooks/log_event.sh") || command.includes(".claude/hooks/check_git_gate.sh") || description.startsWith("crew:") || description.startsWith("engineering-os:");
  });
}
function mergeHooks(existingHooks = {}, desiredHooks = {}) {
  const result2 = { ...existingHooks };
  for (const [eventName, hookDefs] of Object.entries(desiredHooks)) {
    const current = Array.isArray(result2[eventName]) ? result2[eventName] : [];
    const preserved = current.filter((entry) => !isCrewHook(entry));
    const nextEntries = [...preserved];
    const seen = new Set(nextEntries.map((item) => JSON.stringify(item)));
    for (const hookDef of hookDefs) {
      const serialized = JSON.stringify(hookDef);
      if (!seen.has(serialized)) {
        nextEntries.push(hookDef);
        seen.add(serialized);
      }
    }
    result2[eventName] = nextEntries;
  }
  return result2;
}
async function updateSettings(repoPath, writes) {
  const settingsPath = path22.join(repoPath, ".claude", "settings.json");
  const existing = await fs19.readFile(settingsPath, "utf8").catch(() => null);
  const current = existing ? JSON.parse(existing) : {};
  const next = {
    ...current,
    hooks: mergeHooks(current.hooks, DEFAULT_SETTINGS.hooks)
  };
  const changed = await writeFileIfChanged(settingsPath, indentJson(next));
  if (changed) {
    writes.push(path22.relative(repoPath, settingsPath));
  }
}
var init_settings = __esm(() => {
  init_util2();
  init_templates();
});

// crew/scripts/lib/installer/harness-files.mts
import path23 from "path";
async function writeHarnessFiles(repoPath, writes) {
  const refreshFiles = [
    [
      path23.join(repoPath, ".claude", "artifacts", "crew", "README.md"),
      `${ARTIFACT_README_TEMPLATE}
`
    ],
    [path23.join(repoPath, ".claude", "state", "crew", "README.md"), `${STATE_README_TEMPLATE}
`],
    [path23.join(repoPath, ".claude", "hooks", "log_event.sh"), HOOK_SCRIPT_TEMPLATE],
    [path23.join(repoPath, ".claude", "hooks", "check_git_gate.sh"), GIT_GATE_REMINDER_TEMPLATE]
  ];
  for (const [filePath, contents] of refreshFiles) {
    const isHookScript = filePath.endsWith("log_event.sh") || filePath.endsWith("check_git_gate.sh");
    const changed = await writeFileIfChanged(filePath, contents, isHookScript ? { mode: 493 } : {});
    if (changed) {
      writes.push(path23.relative(repoPath, filePath));
    }
  }
  const seedFiles = [
    [
      path23.join(repoPath, ".claude", "state", "crew", "claims.json"),
      `${JSON.stringify(CLAIMS_TEMPLATE, null, 2)}
`
    ],
    [path23.join(repoPath, ".claude", "state", "crew", "history.jsonl"), ""],
    [
      path23.join(repoPath, ".claude", "state", "crew", "workflow-state.json"),
      `${JSON.stringify({
        version: "1.0",
        updatedAt: "2026-01-01T00:00:00.000Z",
        currentRun: null,
        recentRuns: []
      }, null, 2)}
`
    ],
    [
      path23.join(repoPath, ".claude", "state", "crew", "sprint.json"),
      `${JSON.stringify(SPRINT_TEMPLATE, null, 2)}
`
    ]
  ];
  for (const [filePath, contents] of seedFiles) {
    const changed = await writeSeedIfMissing(filePath, contents);
    if (changed) {
      writes.push(path23.relative(repoPath, filePath));
    }
  }
  const directories = [
    path23.join(repoPath, ".claude", "artifacts", "crew", "runs"),
    path23.join(repoPath, ".claude", "artifacts", "crew", "handoffs"),
    path23.join(repoPath, ".claude", "artifacts", "crew", "reviews"),
    path23.join(repoPath, ".claude", "artifacts", "crew", "validations"),
    path23.join(repoPath, ".claude", "artifacts", "crew", "deployments"),
    path23.join(repoPath, ".claude", "logs"),
    path23.join(repoPath, ".claude", "state", "crew")
  ];
  for (const directory of directories) {
    await ensureDir2(directory);
  }
}
var init_harness_files = __esm(() => {
  init_util2();
  init_templates();
});

// crew/scripts/lib/installer/repo-guides.mts
import path24 from "path";
async function writeRepoLocalGuides(repoPath, writes) {
  const guides = [
    [path24.join(repoPath, ".claude", "crew", "constitution.md"), `${CONSTITUTION_TEMPLATE}
`],
    [path24.join(repoPath, ".claude", "crew", "workflow.md"), `${WORKFLOW_TEMPLATE}
`],
    [path24.join(repoPath, ".claude", "crew", "protocol.md"), `${PROTOCOL_TEMPLATE}
`]
  ];
  for (const [filePath, contents] of guides) {
    const changed = await writeFileIfChanged(filePath, contents);
    if (changed) {
      writes.push(path24.relative(repoPath, filePath));
    }
  }
}
var init_repo_guides = __esm(() => {
  init_util2();
  init_templates();
});

// crew/scripts/lib/installer/legacy-migration.mts
import fs20 from "fs/promises";
import path25 from "path";
async function migrateLegacyHarness(repoPath, writes) {
  const moves = [
    [path25.join(repoPath, ".claude", "engineering-os"), path25.join(repoPath, ".claude", "crew")],
    [
      path25.join(repoPath, ".claude", "state", "engineering-os"),
      path25.join(repoPath, ".claude", "state", "crew")
    ],
    [
      path25.join(repoPath, ".claude", "artifacts", "engineering-os"),
      path25.join(repoPath, ".claude", "artifacts", "crew")
    ]
  ];
  for (const [legacyRoot, targetRoot] of moves) {
    if (!await pathExists(legacyRoot)) {
      continue;
    }
    await migrateDirectoryTree(legacyRoot, targetRoot, repoPath, writes);
    await removeEmptyTree(legacyRoot);
  }
}
async function migrateDirectoryTree(legacyDir, targetDir, repoPath, writes) {
  const entries = await fs20.readdir(legacyDir, { withFileTypes: true });
  for (const entry of entries) {
    const legacyPath = path25.join(legacyDir, entry.name);
    const targetPath = path25.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await ensureDir2(targetPath);
      await migrateDirectoryTree(legacyPath, targetPath, repoPath, writes);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await migrateOneFile(legacyPath, targetPath, repoPath, writes);
  }
}
async function migrateOneFile(legacyPath, targetPath, repoPath, writes) {
  const targetExists = await pathExists(targetPath);
  if (!targetExists) {
    await ensureDir2(path25.dirname(targetPath));
    const data = await fs20.readFile(legacyPath);
    await fs20.writeFile(targetPath, data);
    writes.push(path25.relative(repoPath, targetPath));
    await fs20.unlink(legacyPath);
    return;
  }
  const [legacyStat, targetStat] = await Promise.all([fs20.stat(legacyPath), fs20.stat(targetPath)]);
  if (legacyStat.mtimeMs > targetStat.mtimeMs) {
    const data = await fs20.readFile(legacyPath);
    await fs20.writeFile(targetPath, data);
    writes.push(path25.relative(repoPath, targetPath));
  }
  await fs20.unlink(legacyPath);
}
async function removeEmptyTree(dirPath) {
  if (!await pathExists(dirPath)) {
    return;
  }
  const entries = await fs20.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyTree(path25.join(dirPath, entry.name));
    }
  }
  const remaining = await fs20.readdir(dirPath);
  if (remaining.length === 0) {
    await fs20.rmdir(dirPath);
  }
}
var init_legacy_migration = __esm(() => {
  init_util2();
});

// crew/scripts/lib/installer/welcome.mts
function buildWelcome({ mode, repoScoped = false }) {
  const commands = repoScoped ? ["/crew:brief-me", "/crew:build", "/crew:fix", "/crew:ship"] : ["/crew:init", "/crew:adopt", "/crew:brief-me"];
  const headlineByMode = {
    init: "Crew is now wired into this repo. Excellent judgment.",
    bootstrap: "This repo is now on Crew. Tasteful choice.",
    "install-global": "Crew global memory is installed. Bold and correct."
  };
  const optional = [];
  return {
    headline: headlineByMode[mode] ?? "Crew is ready.",
    commands,
    guidance: repoScoped ? "Start with /crew:brief-me for a quick situational report, then /crew:build or /crew:fix for real work." : "Use /crew:init for a new repo, /crew:adopt for an existing repo, and /crew:brief-me once a repo is wired in.",
    optional
  };
}

// crew/scripts/lib/installer/global.mts
import fs21 from "fs/promises";
import path26 from "path";
function globalPaths(homeDir) {
  const globalDir = path26.join(homeDir, ".claude", "crew");
  return {
    globalDir,
    legacyGlobalDir: path26.join(homeDir, ".claude", "engineering-os"),
    constitution: path26.join(globalDir, "constitution.md"),
    workflow: path26.join(globalDir, "workflow.md"),
    metadata: path26.join(globalDir, "metadata.json"),
    claudeMd: path26.join(homeDir, ".claude", "CLAUDE.md")
  };
}
function resolveHomeDir2() {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"];
  if (!home)
    return err("no-home-dir");
  return ok(home);
}
async function inspectGlobalInstall() {
  const homeResult = resolveHomeDir2();
  if (!homeResult.ok)
    throw new Error("HOME or USERPROFILE not set");
  const homeDir = homeResult.value;
  const paths = globalPaths(homeDir);
  const metadata = await fs21.readFile(paths.metadata, "utf8").then((raw) => JSON.parse(raw)).catch(() => null);
  const hasImports = await fs21.readFile(paths.claudeMd, "utf8").then((raw) => GLOBAL_IMPORT_LINES.every((line) => raw.includes(line))).catch(() => false);
  const hasConstitution = await pathExists(paths.constitution);
  const hasWorkflow = await pathExists(paths.workflow);
  const hasGlobalMemory = hasConstitution && hasWorkflow && hasImports;
  const metadataVersion = metadata !== null && typeof metadata["version"] === "string" ? metadata["version"] : null;
  return {
    hasGlobalMemory,
    globalMemoryVersion: metadataVersion,
    expectedGlobalMemoryVersion: GLOBAL_MEMORY_VERSION,
    globalMemoryStale: hasGlobalMemory && metadataVersion !== GLOBAL_MEMORY_VERSION,
    hasGlobalImports: hasImports,
    globalMemoryPath: path26.join(homeDir, ".claude", "crew")
  };
}
async function writeGlobalFiles(paths, writes) {
  const constitutionChanged = await writeFileIfChanged(paths.constitution, `${CONSTITUTION_TEMPLATE}
`);
  if (constitutionChanged)
    writes.push("~/.claude/crew/constitution.md");
  const workflowChanged = await writeFileIfChanged(paths.workflow, `${WORKFLOW_TEMPLATE}
`);
  if (workflowChanged)
    writes.push("~/.claude/crew/workflow.md");
  const metadataChanged = await writeFileIfChanged(paths.metadata, `${JSON.stringify(GLOBAL_METADATA_TEMPLATE, null, 2)}
`);
  if (metadataChanged)
    writes.push("~/.claude/crew/metadata.json");
}
async function installGlobal() {
  const homeResult = resolveHomeDir2();
  if (!homeResult.ok)
    throw new Error("HOME or USERPROFILE not set");
  const homeDir = homeResult.value;
  const paths = globalPaths(homeDir);
  const writes = [];
  await migrateGlobalLegacy(paths, writes);
  await writeGlobalFiles(paths, writes);
  await ensureGlobalImports(paths, writes);
  return {
    mode: "install-global",
    writes,
    global: await inspectGlobalInstall(),
    welcome: buildWelcome({ mode: "install-global", repoScoped: false })
  };
}
async function ensureGlobalImports(paths, writes) {
  let existing = await fs21.readFile(paths.claudeMd, "utf8").catch(() => "");
  let claudeMdChanged = false;
  for (const legacyLine of LEGACY_GLOBAL_IMPORT_LINES) {
    if (existing.includes(legacyLine)) {
      const newLine = legacyLine.replace("engineering-os", "crew");
      existing = existing.replace(legacyLine, newLine);
      claudeMdChanged = true;
    }
  }
  if (claudeMdChanged) {
    await ensureDir2(path26.dirname(paths.claudeMd));
    await fs21.writeFile(paths.claudeMd, existing);
    writes.push("~/.claude/CLAUDE.md (imports migrated)");
  }
  const missingLines = GLOBAL_IMPORT_LINES.filter((line) => !existing.includes(line));
  if (missingLines.length > 0) {
    const prefix = missingLines.join(`
`);
    const next = existing ? `${prefix}

${existing}` : `${prefix}
`;
    await ensureDir2(path26.dirname(paths.claudeMd));
    await fs21.writeFile(paths.claudeMd, next);
    writes.push("~/.claude/CLAUDE.md");
  }
}
async function migrateGlobalLegacy(paths, writes) {
  if (!await pathExists(paths.legacyGlobalDir)) {
    return;
  }
  await ensureDir2(paths.globalDir);
  const entries = await fs21.readdir(paths.legacyGlobalDir);
  for (const entry of entries) {
    const legacyPath = path26.join(paths.legacyGlobalDir, entry);
    const targetPath = path26.join(paths.globalDir, entry);
    const stat2 = await fs21.stat(legacyPath);
    if (!stat2.isFile()) {
      continue;
    }
    const targetExists = await pathExists(targetPath);
    if (!targetExists) {
      await fs21.copyFile(legacyPath, targetPath);
    }
    await fs21.unlink(legacyPath);
  }
  const remaining = await fs21.readdir(paths.legacyGlobalDir);
  if (remaining.length === 0) {
    await fs21.rmdir(paths.legacyGlobalDir);
    writes.push("~/.claude/engineering-os/ (migrated to ~/.claude/crew/)");
  }
}
var GLOBAL_IMPORT_LINES, LEGACY_GLOBAL_IMPORT_LINES;
var init_global = __esm(() => {
  init_util2();
  init_templates();
  init_result();
  GLOBAL_IMPORT_LINES = ["@~/.claude/crew/constitution.md", "@~/.claude/crew/workflow.md"];
  LEGACY_GLOBAL_IMPORT_LINES = [
    "@~/.claude/engineering-os/constitution.md",
    "@~/.claude/engineering-os/workflow.md"
  ];
});

// crew/scripts/lib/installer/audit.mts
import path27 from "path";
async function auditRepo(repoPath) {
  const global = await inspectGlobalInstall();
  return {
    repoPath,
    exists: await pathExists(repoPath),
    hasClaudeMd: await pathExists(path27.join(repoPath, "CLAUDE.md")),
    hasDotClaude: await pathExists(path27.join(repoPath, ".claude")),
    hasSettings: await pathExists(path27.join(repoPath, ".claude", "settings.json")),
    hasHarnessLayer: await pathExists(path27.join(repoPath, ".claude", "artifacts", "crew")),
    hasStateLayer: await pathExists(path27.join(repoPath, ".claude", "state", "crew", "claims.json")),
    hasWorkflowState: await pathExists(path27.join(repoPath, ".claude", "state", "crew", "workflow-state.json")),
    global
  };
}
var init_audit = __esm(() => {
  init_util2();
  init_global();
});

// crew/scripts/lib/features-service.mts
var exports_features_service = {};
__export(exports_features_service, {
  readCrewConfig: () => readCrewConfig,
  listFeatures: () => listFeatures,
  isEnabled: () => isEnabled,
  getFeatureMeta: () => getFeatureMeta,
  FEATURES: () => FEATURES
});
import fs22 from "fs/promises";
import path28 from "path";
function getFeatureMeta(name) {
  return FEATURES[name];
}
function listFeatures() {
  return Object.entries(FEATURES).map(([name, meta]) => ({ name, ...meta }));
}
function isEnabled(feature, config) {
  const enabled = config && typeof config === "object" && "features" in config && config.features && typeof config.features === "object" && feature in config.features && config.features[feature] && typeof config.features[feature] === "object" && "enabled" in config.features[feature] && typeof config.features[feature].enabled === "boolean" ? config.features[feature].enabled === true : FEATURES[feature]?.default ?? true;
  process.stderr.write(`[features] ${feature}: ${enabled ? "enabled" : "disabled"}
`);
  return enabled;
}
async function readCrewConfig(cwd) {
  const configPath = path28.join(cwd, ".claude", "crew.json");
  try {
    const content = await fs22.readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return {};
  }
}
var FEATURES;
var init_features_service = __esm(() => {
  FEATURES = {
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
});

// crew/scripts/lib/cost-setup.mts
var exports_cost_setup = {};
__export(exports_cost_setup, {
  runCostSetup: () => runCostSetup,
  readCrewConfigOrEmpty: () => readCrewConfigOrEmpty,
  parseFeatureOverrides: () => parseFeatureOverrides
});
import fs23 from "fs/promises";
import path29 from "path";
function parseFeatureOverrides(raw) {
  if (!raw)
    return [];
  const parts = raw.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
  const result2 = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      throw new Error(`Invalid feature override "${part}". Expected NAME=on|off.`);
    }
    const feature = part.slice(0, eq).trim();
    const valueRaw = part.slice(eq + 1).trim().toLowerCase();
    if (!(feature in FEATURES)) {
      throw new Error(`Unknown feature "${feature}". Known: ${Object.keys(FEATURES).join(", ")}`);
    }
    let enabled;
    if (valueRaw === "on" || valueRaw === "true" || valueRaw === "1")
      enabled = true;
    else if (valueRaw === "off" || valueRaw === "false" || valueRaw === "0")
      enabled = false;
    else
      throw new Error(`Invalid value for "${feature}": "${valueRaw}". Use on|off.`);
    result2.push({ feature, enabled });
  }
  return result2;
}
async function readCrewConfigOrEmpty(repoPath) {
  const configPath = path29.join(repoPath, ".claude", "crew.json");
  try {
    const raw = await fs23.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null)
      return parsed;
    return {};
  } catch {
    return {};
  }
}
async function runCostSetup(repoPath, overrides = []) {
  const configPath = path29.join(repoPath, ".claude", "crew.json");
  const existing = await readCrewConfigOrEmpty(repoPath);
  const features = {
    ...existing.features ?? {}
  };
  for (const [name, meta] of Object.entries(FEATURES)) {
    if (!(name in features)) {
      features[name] = { enabled: meta.default };
    }
  }
  for (const ov of overrides) {
    features[ov.feature] = { enabled: ov.enabled };
  }
  const next = { ...existing, features };
  const nextSerialized = JSON.stringify(next, null, 2) + `
`;
  let prevSerialized = "";
  try {
    prevSerialized = await fs23.readFile(configPath, "utf8");
  } catch {
    prevSerialized = "";
  }
  let written = false;
  if (prevSerialized !== nextSerialized) {
    await fs23.mkdir(path29.dirname(configPath), { recursive: true });
    await fs23.writeFile(configPath, nextSerialized, "utf8");
    written = true;
  }
  const summary = Object.entries(features).map(([name, value]) => ({
    name,
    enabled: value.enabled,
    default: FEATURES[name]?.default ?? true
  }));
  return { configPath, written, features: summary };
}
var init_cost_setup = __esm(() => {
  init_features_service();
});

// crew/scripts/lib/installer.mts
var exports_installer = {};
__export(exports_installer, {
  installGlobal: () => installGlobal,
  initRepo: () => initRepo,
  bootstrapRepo: () => bootstrapRepo,
  auditRepo: () => auditRepo
});
import fs24 from "fs/promises";
import path30 from "path";
async function bootstrapRepo(repoPath) {
  if (!await pathExists(repoPath))
    return err("repo-not-found");
  const writes = [];
  await migrateLegacyHarness(repoPath, writes);
  await updateClaudeMd(repoPath, writes);
  await updateGitignore(repoPath, writes);
  await writeHarnessFiles(repoPath, writes);
  await writeRepoLocalGuides(repoPath, writes);
  await updateSettings(repoPath, writes);
  const costSetup = await runCostSetup(repoPath);
  if (costSetup.written)
    writes.push(path30.relative(repoPath, costSetup.configPath) || costSetup.configPath);
  return ok({
    mode: "bootstrap",
    repoPath,
    writes,
    audit: await auditRepo(repoPath),
    welcome: buildWelcome({ mode: "bootstrap", repoScoped: true })
  });
}
async function initRepo(repoPath, options = {}) {
  if (await pathExists(repoPath)) {
    const entries = await fs24.readdir(repoPath).catch(() => []);
    if (entries.length > 0 && !options.allowExisting) {
      throw new Error(`Target directory already exists and is not empty: ${repoPath}. Pass --allow-existing to reuse it.`);
    }
  } else {
    await ensureDir2(repoPath);
  }
  const writes = [];
  const gitPath = path30.join(repoPath, ".git");
  if (!await pathExists(gitPath)) {
    await ensureDir2(gitPath);
    writes.push(".git/");
  }
  const bootstrapResult = await bootstrapRepo(repoPath);
  if (!bootstrapResult.ok)
    throw new Error(`Repository path does not exist: ${repoPath}`);
  const result2 = bootstrapResult.value;
  return {
    mode: "init",
    repoPath,
    writes: [...writes, ...result2.writes],
    audit: result2.audit,
    welcome: buildWelcome({ mode: "init", repoScoped: true })
  };
}
var init_installer = __esm(() => {
  init_util2();
  init_result();
  init_claude_md();
  init_gitignore();
  init_settings();
  init_harness_files();
  init_repo_guides();
  init_legacy_migration();
  init_audit();
  init_global();
  init_cost_setup();
});

// crew/scripts/lib/repo-root.mts
import path31 from "path";
async function gitText(args, cwd) {
  try {
    const result2 = await runGit(args, { cwd, maxBuffer: 64 * 1024 });
    return result2.ok ? result2.stdout.trim() : null;
  } catch {
    return null;
  }
}
async function resolveCanonicalRepoRoot(repoPath) {
  let cached = canonicalRootCache.get(repoPath);
  if (!cached) {
    cached = computeCanonicalRepoRoot(repoPath);
    canonicalRootCache.set(repoPath, cached);
  }
  return cached;
}
async function computeCanonicalRepoRoot(repoPath) {
  const [commonDir, gitDir] = await Promise.all([
    gitText(["rev-parse", "--git-common-dir"], repoPath),
    gitText(["rev-parse", "--git-dir"], repoPath)
  ]);
  if (commonDir === null || gitDir === null)
    return repoPath;
  const commonAbs = path31.resolve(repoPath, commonDir);
  const gitAbs = path31.resolve(repoPath, gitDir);
  if (commonAbs === gitAbs)
    return repoPath;
  return path31.basename(commonAbs) === ".git" ? path31.dirname(commonAbs) : repoPath;
}
var canonicalRootCache;
var init_repo_root = __esm(() => {
  init_git();
  canonicalRootCache = new Map;
});

// crew/scripts/lib/claims.mts
var exports_claims = {};
__export(exports_claims, {
  releaseFiles: () => releaseFiles,
  loadClaimsState: () => loadClaimsState,
  listClaims: () => listClaims,
  inspectClaims: () => inspectClaims,
  ensureStateScaffold: () => ensureStateScaffold,
  claimFiles: () => claimFiles,
  checkDisjoint: () => checkDisjoint
});
import fs25 from "fs/promises";
import path32 from "path";
function nowIso5() {
  return new Date().toISOString();
}
function defaultClaimsState() {
  return {
    version: "1.0",
    updatedAt: nowIso5(),
    claims: {},
    warnings: []
  };
}
async function ensureDir3(dirPath) {
  await fs25.mkdir(dirPath, { recursive: true });
}
async function ensureFile2(filePath, contents) {
  try {
    await fs25.access(filePath);
  } catch {
    await ensureDir3(path32.dirname(filePath));
    await fs25.writeFile(filePath, contents);
  }
}
function toRepoRelative(repoPath, inputPath) {
  const absolute = path32.resolve(repoPath, inputPath);
  const relative = path32.relative(repoPath, absolute);
  if (relative.startsWith("..") || path32.isAbsolute(relative)) {
    throw new Error(`Claim path must stay inside the repo: ${inputPath}`);
  }
  return relative.split(path32.sep).join("/");
}
async function acquireClaimsLock(storageRoot) {
  const claimsPath = path32.join(storageRoot, ...CLAIMS_PATH);
  const lockPath = `${claimsPath}${LOCK_SUFFIX}`;
  await ensureDir3(path32.dirname(lockPath));
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;; ) {
    try {
      const handle = await fs25.open(lockPath, "wx");
      await handle.write(`${process.pid}
`);
      await handle.close();
      return lockPath;
    } catch (err2) {
      const nodeErr = err2;
      if (nodeErr.code !== "EEXIST") {
        throw err2;
      }
      try {
        const stat2 = await fs25.stat(lockPath);
        if (Date.now() - stat2.mtimeMs > LOCK_STALE_MS) {
          await fs25.unlink(lockPath).catch(() => {});
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring claims lock at ${lockPath} after ${LOCK_TIMEOUT_MS}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
}
async function releaseClaimsLock(lockPath) {
  await fs25.unlink(lockPath).catch(() => {});
}
async function withClaimsLock(storageRoot, fn) {
  const lockPath = await acquireClaimsLock(storageRoot);
  try {
    return await fn();
  } finally {
    await releaseClaimsLock(lockPath);
  }
}
async function saveClaimsState(storageRoot, state) {
  const claimsPath = path32.join(storageRoot, ...CLAIMS_PATH);
  state.updatedAt = nowIso5();
  await fs25.writeFile(claimsPath, `${JSON.stringify(state, null, 2)}
`);
}
async function appendHistoryEvent(storageRoot, event) {
  const historyPath = path32.join(storageRoot, ...HISTORY_PATH);
  await fs25.appendFile(historyPath, `${JSON.stringify({ timestamp: nowIso5(), ...event })}
`);
}
async function ensureStateScaffold(repoPath) {
  const storageRoot = await resolveCanonicalRepoRoot(repoPath);
  const stateDir = path32.join(storageRoot, ...STATE_DIR2);
  await ensureDir3(stateDir);
  await ensureFile2(path32.join(storageRoot, ...CLAIMS_PATH), `${JSON.stringify(defaultClaimsState(), null, 2)}
`);
  await ensureFile2(path32.join(storageRoot, ...HISTORY_PATH), "");
}
async function claimsStateExists(storageRoot) {
  try {
    await fs25.access(path32.join(storageRoot, ...CLAIMS_PATH));
    return true;
  } catch {
    return false;
  }
}
async function loadClaimsState(repoPath, options = {}) {
  const storageRoot = await resolveCanonicalRepoRoot(repoPath);
  if (options.createIfMissing === false && !await claimsStateExists(storageRoot)) {
    return defaultClaimsState();
  }
  await ensureStateScaffold(repoPath);
  const claimsPath = path32.join(storageRoot, ...CLAIMS_PATH);
  return JSON.parse(await fs25.readFile(claimsPath, "utf8"));
}
function normalizeOwnerAlias(owner) {
  return owner === "lead-session" ? "dispatcher-session" : owner;
}
async function claimFiles(repoPath, filePaths, options = {}) {
  try {
    const owner = options.owner || "dispatcher-session";
    const note = options.note || "";
    const storageRoot = await resolveCanonicalRepoRoot(repoPath);
    const value = await withClaimsLock(storageRoot, async () => {
      const state = await loadClaimsState(repoPath);
      const claimed = [];
      const alreadyOwned = [];
      const conflicts = [];
      for (const inputPath of filePaths) {
        const repoRelativePath = toRepoRelative(repoPath, inputPath);
        const existing = state.claims[repoRelativePath];
        if (!existing) {
          state.claims[repoRelativePath] = {
            owner,
            createdAt: nowIso5(),
            note
          };
          claimed.push(repoRelativePath);
          continue;
        }
        if (normalizeOwnerAlias(existing.owner) === normalizeOwnerAlias(owner)) {
          alreadyOwned.push(repoRelativePath);
          continue;
        }
        conflicts.push({
          path: repoRelativePath,
          owner: existing.owner,
          createdAt: existing.createdAt,
          note: existing.note || ""
        });
      }
      await saveClaimsState(storageRoot, state);
      if (claimed.length > 0) {
        await appendHistoryEvent(storageRoot, { event: "claim", owner, files: claimed, note });
      }
      return { owner, claimed, alreadyOwned, conflicts };
    });
    return ok(value);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
async function releaseFiles(repoPath, filePaths = [], options = {}) {
  try {
    const owner = options.owner ?? null;
    const storageRoot = await resolveCanonicalRepoRoot(repoPath);
    const value = await withClaimsLock(storageRoot, async () => {
      const state = await loadClaimsState(repoPath);
      const released = [];
      const skipped = [];
      const targets = filePaths.length > 0 ? filePaths.map((inputPath) => toRepoRelative(repoPath, inputPath)) : Object.keys(state.claims);
      for (const repoRelativePath of targets) {
        const existing = state.claims[repoRelativePath];
        if (!existing) {
          skipped.push({ path: repoRelativePath, reason: "not_claimed" });
          continue;
        }
        if (owner && normalizeOwnerAlias(existing.owner) !== normalizeOwnerAlias(owner)) {
          skipped.push({ path: repoRelativePath, reason: "owned_by_other", owner: existing.owner });
          continue;
        }
        delete state.claims[repoRelativePath];
        released.push(repoRelativePath);
      }
      await saveClaimsState(storageRoot, state);
      if (released.length > 0) {
        await appendHistoryEvent(storageRoot, { event: "release", owner, files: released });
      }
      return { owner, released, skipped };
    });
    return ok(value);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
async function listClaims(repoPath, options = {}) {
  const state = await loadClaimsState(repoPath, {
    ...options.createIfMissing !== undefined ? { createIfMissing: options.createIfMissing } : {}
  });
  return Object.entries(state.claims).sort(([left], [right]) => left.localeCompare(right)).map(([filePath, claim]) => ({
    path: filePath,
    owner: claim.owner,
    createdAt: claim.createdAt,
    note: claim.note || ""
  }));
}
function inspectAllClaims(claims, owner) {
  if (!owner) {
    return { owner, owned: [], conflicts: claims, available: [] };
  }
  const owned = [];
  const conflicts = [];
  for (const claim of claims) {
    if (normalizeOwnerAlias(claim.owner) === normalizeOwnerAlias(owner))
      owned.push(claim);
    else
      conflicts.push(claim);
  }
  return { owner, owned, conflicts, available: [] };
}
function classifyRequestedPaths(requested, claimsByPath, owner) {
  const owned = [];
  const conflicts = [];
  const available = [];
  for (const requestedPath of requested) {
    const claim = claimsByPath.get(requestedPath);
    if (!claim) {
      available.push({ path: requestedPath });
      continue;
    }
    if (owner && normalizeOwnerAlias(claim.owner) === normalizeOwnerAlias(owner)) {
      owned.push(claim);
      continue;
    }
    conflicts.push(claim);
  }
  return { owned, conflicts, available };
}
async function inspectClaims(repoPath, filePaths = [], options = {}) {
  const owner = options.owner ?? null;
  const claims = await listClaims(repoPath);
  if (filePaths.length === 0) {
    return inspectAllClaims(claims, owner);
  }
  const claimsByPath = new Map(claims.map((claim) => [claim.path, claim]));
  const requested = [...new Set(filePaths.map((inputPath) => toRepoRelative(repoPath, inputPath)))];
  const { owned, conflicts, available } = classifyRequestedPaths(requested, claimsByPath, owner);
  return { owner, owned, conflicts, available };
}
async function checkDisjoint(repoPath, candidateFiles, options = {}) {
  if (candidateFiles.length === 0) {
    return { disjoint: true, overlaps: [], available: [] };
  }
  const owner = options.owner ?? "quickwin-lane";
  const inspection = await inspectClaims(repoPath, candidateFiles, { owner });
  const available = [
    ...inspection.available.map((entry) => entry.path),
    ...inspection.owned.map((entry) => entry.path)
  ].sort();
  return { disjoint: inspection.conflicts.length === 0, overlaps: inspection.conflicts, available };
}
var STATE_DIR2, CLAIMS_PATH, HISTORY_PATH, LOCK_SUFFIX = ".lock", LOCK_RETRY_MS = 25, LOCK_TIMEOUT_MS = 5000, LOCK_STALE_MS = 30000;
var init_claims = __esm(() => {
  init_result();
  init_repo_root();
  STATE_DIR2 = [".claude", "state", "crew"];
  CLAIMS_PATH = [...STATE_DIR2, "claims.json"];
  HISTORY_PATH = [...STATE_DIR2, "history.jsonl"];
});

// crew/scripts/lib/worktree-manager.mts
var exports_worktree_manager = {};
__export(exports_worktree_manager, {
  spawnChoreLane: () => spawnChoreLane,
  choreLaneStatus: () => choreLaneStatus
});
import path33 from "path";
async function git2(args, cwd) {
  try {
    const r = await runGit(args, { cwd, maxBuffer: 1024 * 1024 });
    return { ok: r.ok, stdout: r.stdout.trim(), stderr: r.stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
}
async function refExists(cwd, ref) {
  return (await git2(["rev-parse", "--verify", "--quiet", ref], cwd)).ok;
}
async function resolveBase(mainRoot) {
  for (const ref of ["origin/main", "main"]) {
    if (await refExists(mainRoot, ref))
      return ref;
  }
  return "HEAD";
}
function laneName(date) {
  return { branch: `${CHORE_BRANCH_PREFIX}${date}`, dirName: `quickwins-${date}` };
}
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
async function worktreePathForBranch(mainRoot, branch) {
  const out = await git2(["worktree", "list", "--porcelain"], mainRoot);
  if (!out.ok)
    return null;
  let currentPath = null;
  for (const line of out.stdout.split(`
`)) {
    if (line.startsWith("worktree ")) {
      currentPath = line.slice("worktree ".length).trim();
    } else if (line.startsWith("branch ") && currentPath) {
      if (line.slice("branch ".length).trim() === `refs/heads/${branch}`)
        return currentPath;
    }
  }
  return null;
}
async function spawnChoreLane(repoPath, options = {}) {
  const mainRoot = await resolveCanonicalRepoRoot(repoPath);
  if (!(await git2(["rev-parse", "--git-dir"], mainRoot)).ok) {
    return err(new Error(`Not a git repository: ${repoPath}`));
  }
  const date = options.date ?? todayUtc();
  const { branch, dirName } = laneName(date);
  const worktreePath = path33.join(mainRoot, ...WORKTREES_SUBDIR, dirName);
  const existingPath = await worktreePathForBranch(mainRoot, branch);
  if (existingPath) {
    return ok({ branch, worktreePath: existingPath, base: branch, reused: true });
  }
  if (await refExists(mainRoot, `refs/heads/${branch}`)) {
    const add2 = await git2(["worktree", "add", worktreePath, branch], mainRoot);
    if (!add2.ok) {
      return err(new Error(`git worktree add (re-attach ${branch}) failed: ${add2.stderr}`));
    }
    return ok({ branch, worktreePath, base: branch, reused: true });
  }
  const base = await resolveBase(mainRoot);
  const add = await git2(["worktree", "add", "-b", branch, worktreePath, base], mainRoot);
  if (!add.ok) {
    return err(new Error(`git worktree add (new lane ${branch} from ${base}) failed: ${add.stderr}`));
  }
  return ok({ branch, worktreePath, base, reused: false });
}
async function choreLaneStatus(repoPath, options = {}) {
  const mainRoot = await resolveCanonicalRepoRoot(repoPath);
  const { branch } = laneName(options.date ?? todayUtc());
  const existingPath = await worktreePathForBranch(mainRoot, branch);
  return ok({ exists: existingPath !== null, branch, worktreePath: existingPath });
}
var WORKTREES_SUBDIR, CHORE_BRANCH_PREFIX = "chore/quickwins-";
var init_worktree_manager = __esm(() => {
  init_git();
  init_result();
  init_repo_root();
  WORKTREES_SUBDIR = [".claude", "worktrees"];
});

// crew/scripts/lib/artifact-cache.mjs
import fs26 from "fs/promises";
function parseFrontmatter3(body) {
  const result2 = {};
  if (!body.startsWith("---"))
    return result2;
  const endIdx = body.indexOf(`
---`, 3);
  if (endIdx === -1)
    return result2;
  const block = body.slice(4, endIdx);
  for (const line of block.split(`
`)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1)
      continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value)
      result2[key] = value;
  }
  return result2;
}
async function getCachedArtifact(absPath) {
  const stat2 = await fs26.stat(absPath);
  const mtimeMs = stat2.mtimeMs;
  const cached = _cache3.get(absPath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached;
  }
  const body = await fs26.readFile(absPath, "utf8");
  const fm = parseFrontmatter3(body);
  const entry = { fm, body, mtimeMs };
  _cache3.set(absPath, entry);
  return entry;
}
var _cache3;
var init_artifact_cache = __esm(() => {
  _cache3 = new Map;
});

// crew/scripts/lib/deployment-guidance/read.mts
var exports_read = {};
__export(exports_read, {
  readDeploymentGuidanceSummary: () => readDeploymentGuidanceSummary,
  guidancePath: () => guidancePath,
  discoverDeploymentClues: () => discoverDeploymentClues
});
import fs27 from "fs/promises";
import path34 from "path";
function fileLooksLikeDeploymentClue(relativePath) {
  const baseName = path34.basename(relativePath);
  if (ALWAYS_INCLUDE_FILES.some((pattern) => pattern.test(baseName))) {
    return true;
  }
  if (relativePath.startsWith(".github/workflows/")) {
    return baseName.endsWith(".yml") || baseName.endsWith(".yaml");
  }
  if (relativePath.startsWith(".circleci/")) {
    return true;
  }
  const segments = relativePath.split("/");
  const underDeploymentDir = segments.some((segment) => DEPLOYMENT_DIR_HINTS.has(segment));
  if (!underDeploymentDir) {
    return false;
  }
  return DEPLOYMENT_EXTENSIONS.has(path34.extname(baseName));
}
async function processDirEntry(entry, repoPath, relativeDir, depth, out) {
  const rawRelativePath = relativeDir ? path34.join(relativeDir, entry.name) : entry.name;
  const relativePath = rawRelativePath.split(path34.sep).join("/");
  if (entry.isDirectory()) {
    if (IGNORED_DIRS.has(entry.name))
      return;
    await collectDeploymentClues(repoPath, relativePath, depth - 1, out);
    return;
  }
  if (entry.isFile() && fileLooksLikeDeploymentClue(relativePath)) {
    out.add(relativePath);
  }
}
async function collectDeploymentClues(repoPath, relativeDir, depth, out) {
  if (depth < 0 || out.size >= MAX_CLUES)
    return;
  const absoluteDir = path34.join(repoPath, relativeDir);
  if (!await pathExists(absoluteDir))
    return;
  const entries = await fs27.readdir(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    if (out.size >= MAX_CLUES)
      return;
    await processDirEntry(entry, repoPath, relativeDir, depth, out);
  }
}
function guidancePath(repoPath) {
  return path34.join(repoPath, ...DEPLOYMENT_GUIDANCE_PATH);
}
async function readableGuidancePath(repoPath) {
  const primary = guidancePath(repoPath);
  if (await pathExists(primary)) {
    return primary;
  }
  const legacy = path34.join(repoPath, ...LEGACY_DEPLOYMENT_GUIDANCE_PATH);
  if (await pathExists(legacy)) {
    return legacy;
  }
  return null;
}
function extractField(body, label) {
  const match = body.match(new RegExp(`^- ${label}:\\s*(.+)$`, "m"));
  return match && match[1] !== undefined ? match[1].trim() : "";
}
async function discoverDeploymentClues(repoPath) {
  const clues = new Set;
  await collectDeploymentClues(repoPath, "", MAX_DEPTH, clues);
  return {
    repoPath,
    clues: [...clues].sort(),
    guidancePath: guidancePath(repoPath)
  };
}
async function readDeploymentGuidanceSummary(repoPath) {
  const filePath = await readableGuidancePath(repoPath);
  if (!filePath) {
    return null;
  }
  const { body, mtimeMs } = await getCachedArtifact(filePath);
  const [heading = ""] = body.split(`
`);
  return {
    path: filePath,
    title: heading.replace(/^#\s+/, "").trim(),
    summary: extractField(body, "Summary"),
    discoveryStatus: extractField(body, "Discovery Status"),
    updatedAt: new Date(mtimeMs).toISOString()
  };
}
var DEPLOYMENT_GUIDANCE_PATH, LEGACY_DEPLOYMENT_GUIDANCE_PATH, MAX_CLUES = 30, MAX_DEPTH = 3, IGNORED_DIRS, ALWAYS_INCLUDE_FILES, DEPLOYMENT_DIR_HINTS, DEPLOYMENT_EXTENSIONS;
var init_read2 = __esm(() => {
  init_artifact_cache();
  init_fs_utils();
  DEPLOYMENT_GUIDANCE_PATH = [".claude", "crew", "deployment.md"];
  LEGACY_DEPLOYMENT_GUIDANCE_PATH = [".claude", "engineering-os", "deployment.md"];
  IGNORED_DIRS = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    ".idea",
    ".vscode"
  ]);
  ALWAYS_INCLUDE_FILES = [
    /^Dockerfile(?:\..+)?$/,
    /^docker-compose(?:\..+)?\.ya?ml$/,
    /^compose(?:\..+)?\.ya?ml$/,
    /^cloudbuild(?:\..+)?\.ya?ml$/,
    /^skaffold(?:\..+)?\.ya?ml$/,
    /^render\.ya?ml$/,
    /^fly\.toml$/,
    /^railway\.json$/,
    /^Procfile$/,
    /^vercel\.json$/,
    /^netlify\.toml$/,
    /^wrangler\.toml$/
  ];
  DEPLOYMENT_DIR_HINTS = new Set([
    ".github",
    ".circleci",
    ".gitlab",
    "deploy",
    "deployment",
    "infra",
    "ops",
    "k8s",
    "helm",
    "charts",
    "terraform",
    "manifests"
  ]);
  DEPLOYMENT_EXTENSIONS = new Set([".yaml", ".yml", ".json", ".toml", ".tf", ".tfvars", ".sh"]);
});

// crew/scripts/lib/jsonl.mjs
import fs28 from "fs/promises";
async function tailReadJsonl2(filePath, count, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_TAIL_BYTES2;
  let handle;
  try {
    handle = await fs28.open(filePath, "r");
  } catch (err2) {
    if (err2.code === "ENOENT")
      return [];
    throw err2;
  }
  try {
    const stat2 = await handle.stat();
    if (stat2.size === 0)
      return [];
    const start = Math.max(0, stat2.size - maxBytes);
    const length = stat2.size - start;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    let raw = buffer.toString("utf8");
    if (start > 0) {
      const firstNewline = raw.indexOf(`
`);
      raw = firstNewline === -1 ? "" : raw.slice(firstNewline + 1);
    }
    return raw.split(`
`).map((line) => line.trim()).filter(Boolean).slice(-count).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {};
      }
    });
  } finally {
    await handle.close();
  }
}
var DEFAULT_TAIL_BYTES2;
var init_jsonl3 = __esm(() => {
  DEFAULT_TAIL_BYTES2 = 64 * 1024;
});

// crew/scripts/lib/briefing/git.mts
function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
async function runGit2(repoPath, args) {
  try {
    const result2 = await runGit(args, { cwd: repoPath });
    return result2.ok ? result2.stdout.trim() : null;
  } catch {
    return null;
  }
}
function parseStatusHeader(header) {
  const branchMatch = header.match(/^##\s+([^\s.]+|HEAD)(?:\.\.\.([^\s[]+))?(?:\s+\[(.+)\])?/);
  const details = branchMatch?.[3] ?? "";
  const aheadMatch = details.match(/ahead\s+(\d+)/);
  const behindMatch = details.match(/behind\s+(\d+)/);
  return {
    branch: branchMatch?.[1] ?? "",
    upstream: branchMatch?.[2] ?? "",
    ahead: aheadMatch ? parseInteger(aheadMatch[1] ?? "") : 0,
    behind: behindMatch ? parseInteger(behindMatch[1] ?? "") : 0
  };
}
function parseStatusCounts(entries) {
  let modifiedCount = 0;
  let untrackedCount = 0;
  let stagedCount = 0;
  const changedPaths = [];
  for (const entry of entries) {
    const code = entry.slice(0, 2);
    const relativePath = entry.slice(3).trim();
    if (!relativePath)
      continue;
    changedPaths.push(relativePath);
    if (code.includes("?")) {
      untrackedCount += 1;
      continue;
    }
    if (code.charAt(0) !== "" && code.charAt(0) !== " ")
      stagedCount += 1;
    if (code.charAt(1) !== "" && code.charAt(1) !== " ")
      modifiedCount += 1;
  }
  return { modifiedCount, untrackedCount, stagedCount, changedPaths };
}
function parseWorkingTree(statusOutput) {
  if (!statusOutput) {
    return {
      isGitRepo: false,
      branch: "",
      upstream: "",
      ahead: 0,
      behind: 0,
      modifiedCount: 0,
      untrackedCount: 0,
      stagedCount: 0,
      hasChanges: false,
      changedPaths: []
    };
  }
  const lines = statusOutput.split(`
`).filter(Boolean);
  const header = parseStatusHeader(lines[0] ?? "");
  const entries = lines.slice(1);
  const counts = parseStatusCounts(entries);
  return {
    isGitRepo: true,
    ...header,
    ...counts,
    hasChanges: entries.length > 0
  };
}
function parseCommits(stdout) {
  if (!stdout) {
    return [];
  }
  return stdout.split(`
`).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [hash = "", date = "", author = "", refs = "", subject = ""] = line.split("\t");
    return { hash, date, author, refs, subject };
  });
}
async function collectGitActivity(repoPath) {
  const statusOutput = await runGit2(repoPath, ["status", "--short", "--branch"]);
  const workingTree = parseWorkingTree(statusOutput);
  if (!workingTree.isGitRepo) {
    return {
      isGitRepo: false,
      workingTree,
      recentBranchCommits: [],
      recentRepoActivity: []
    };
  }
  const [recentBranchCommitsOutput, recentRepoActivityOutput] = await Promise.all([
    runGit2(repoPath, [
      "log",
      "--date=short",
      `--pretty=format:%h	%ad	%an		%s`,
      `-${BRANCH_COMMITS_LIMIT}`
    ]),
    runGit2(repoPath, [
      "log",
      "--all",
      "--date=short",
      `--pretty=format:%h	%ad	%an	%d	%s`,
      `-${REPO_ACTIVITY_LIMIT}`
    ])
  ]);
  return {
    isGitRepo: true,
    workingTree,
    recentBranchCommits: parseCommits(recentBranchCommitsOutput),
    recentRepoActivity: parseCommits(recentRepoActivityOutput)
  };
}
var BRANCH_COMMITS_LIMIT = 5, REPO_ACTIVITY_LIMIT = 8;
var init_git2 = __esm(() => {
  init_git();
});

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
function parseModelMix(text) {
  const out = [];
  const section = text.split(/^##\s+/m).find((s) => s.startsWith("Model Mix"));
  if (!section)
    return out;
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^-\s+(\S+)\s+\(priced as\s+\S+\):\s+(\d+)\s+msgs\s+\(([\d.]+)%\),\s+\$([\d.]+)\s+\(([\d.]+)%\)/);
    if (m)
      out.push({
        model: m[1],
        messages: Number(m[2]),
        msgPct: Number(m[3]),
        usd: Number(m[4]),
        usdPct: Number(m[5])
      });
  }
  return out;
}
function parseToolUsage(text) {
  let toolCalls = 0;
  let toolFailures = 0;
  const section = text.split(/^##\s+/m).find((s) => s.startsWith("Tool Usage"));
  if (section) {
    for (const line of section.split(/\r?\n/)) {
      const m = line.match(/^-\s+\S+:\s*([\d,]+)(?:\s*\((\d+)\s+failed\))?/);
      if (m) {
        toolCalls += Number(m[1].replace(/,/g, ""));
        if (m[2])
          toolFailures += Number(m[2]);
      }
    }
  }
  return { toolCalls, toolFailures };
}
function computeDominantModel(modelMix) {
  const dominantEntry = modelMix.find((m) => !/^<|unknown/i.test(m.model)) || modelMix[0] || null;
  if (!dominantEntry)
    return null;
  return { model: dominantEntry.model, pct: dominantEntry.msgPct };
}
function deriveFlags(metrics) {
  const flags = [];
  if (metrics.compactionCount > 0)
    flags.push(`compact:${metrics.compactionCount}`);
  if (metrics.subagentDispatches > 3)
    flags.push(`subagent:${metrics.subagentDispatches}`);
  if (metrics.fileReReadCount > 5)
    flags.push(`reread:${metrics.fileReReadCount}`);
  if (metrics.toolFailures > 3)
    flags.push(`fails:${metrics.toolFailures}`);
  if (metrics.toolResultP90 > 8000)
    flags.push(`p90:${metrics.toolResultP90}b`);
  if (metrics.turnsBeforeFirstTool > 5)
    flags.push(`preamble:${metrics.turnsBeforeFirstTool}`);
  if (metrics.gradeAvg != null && metrics.gradeAvg < 0.75)
    flags.push(`grade:${metrics.gradeAvg}`);
  if (metrics.reviewDecision === "rejected")
    flags.push("review:rejected");
  if (metrics.validationDecision === "failed")
    flags.push("validation:failed");
  if (metrics.autoDetected && metrics.sourceProject)
    flags.push(`xrepo:${metrics.sourceProject}`);
  if (metrics.aggregateAll && metrics.sourceCount > 1)
    flags.push(`multi-src:${metrics.sourceCount}`);
  return flags;
}
function bodyNum(text, re) {
  return Number(text.match(re)?.[1]?.replace(/,/g, "") || 0);
}
function parseRunTitle(text, fm) {
  const raw = fm["run_title"] ?? text.match(/^- Run Title:\s*(.+)$/m)?.[1] ?? "";
  const stripped = raw.replace(/^"|"$/g, "").trim();
  return stripped || null;
}
function parseUsd(text, fm) {
  if (fm["usd"] != null)
    return Number(fm["usd"]);
  const fromBody = Number(text.match(/^- Total USD:\s*\$([\d.]+)/m)?.[1] || 0);
  return fromBody || null;
}
function parseDurationMs(fm, windowStart, windowEnd) {
  if (fm["duration_ms"])
    return Number(fm["duration_ms"]);
  if (windowStart && windowEnd)
    return Date.parse(windowEnd) - Date.parse(windowStart);
  return 0;
}
function parseHeaderFields(text, fm) {
  const windowStart = text.match(/^- Window Start:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const windowEnd = text.match(/^- Window End:\s*(.+)$/m)?.[1]?.trim() ?? null;
  return {
    runTitle: parseRunTitle(text, fm),
    usd: parseUsd(text, fm),
    windowStart,
    windowEnd,
    durationMs: parseDurationMs(fm, windowStart, windowEnd)
  };
}
function parseTokenFields(text, fm) {
  const totalTokens = fm["total_tokens"] ? Number(fm["total_tokens"]) : bodyNum(text, /^- Total Tokens:\s*([\d,]+)/m);
  const cacheHitPct = fm["cache_hit_pct"] ? Number(fm["cache_hit_pct"]) : Number(text.match(/^- Cache Hit %:\s*([\d.]+)/m)?.[1] || 0);
  const inputTokens = bodyNum(text, /^- input:\s*([\d,]+)/m);
  const outputTokens = bodyNum(text, /^- output:\s*([\d,]+)/m);
  const cacheReadTokens = bodyNum(text, /^- cache_read:\s*([\d,]+)/m);
  const cacheCreate1h = bodyNum(text, /^- cache_create_1h:\s*([\d,]+)/m);
  const cacheCreate5m = bodyNum(text, /^- cache_create_5m:\s*([\d,]+)/m);
  return {
    totalTokens,
    cacheHitPct,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens: cacheCreate5m + cacheCreate1h
  };
}
function parseRoleDispatches(text) {
  const keyIdx = text.indexOf("- subagent_dispatches_by_role:");
  if (keyIdx === -1)
    return {};
  const out = {};
  const afterKey = text.slice(keyIdx + 1);
  for (const line of afterKey.split(/\r?\n/)) {
    const m = line.match(/^\s{2,}-\s+(.+):\s*(\d+)\s*$/);
    if (m) {
      out[m[1].trim()] = Number(m[2]);
    } else if (line.match(/^-\s+\S/) || line.match(/^##/)) {
      break;
    }
  }
  return out;
}
function parseDiagnosticFields(text) {
  return {
    compactionCount: bodyNum(text, /^- compaction_count:\s*(\d+)/m),
    subagentDispatches: bodyNum(text, /^- subagent_dispatches:\s*(\d+)/m),
    skillInvocations: bodyNum(text, /^- skill_invocations:\s*(\d+)/m),
    turnsBeforeFirstTool: bodyNum(text, /^- turns_before_first_tool:\s*(\d+)/m),
    userMsgAvgLen: bodyNum(text, /^- user_msg_avg_len:\s*(\d+)/m),
    fileReReadCount: bodyNum(text, /^- redundant_read_count:\s*(\d+)/m),
    sessionsScanned: bodyNum(text, /^- Sessions Scanned:\s*(\d+)/m),
    toolResultP90: bodyNum(text, /##\s+Tool Result Sizes[\s\S]*?-\s+p90:\s*([\d,]+)/),
    messages: Number(text.match(/^- Assistant Messages Counted:\s*(\d+)/m)?.[1] || 0),
    roleDispatches: parseRoleDispatches(text)
  };
}
function parseOutcomeFields(fm) {
  return {
    gradeAvg: fm["grade_avg"] != null ? Number(fm["grade_avg"]) : null,
    reviewDecision: fm["review_decision"] ?? null,
    validationDecision: fm["validation_decision"] ?? null,
    sourceProject: fm["source_project"] ?? null,
    autoDetected: String(fm["auto_detected"] ?? "").toLowerCase() === "true",
    aggregateAll: String(fm["aggregate_all"] ?? "").toLowerCase() === "true",
    sourceCount: fm["source_count"] ? Number(fm["source_count"]) : 0
  };
}
function parseCostReportText(filePath, text) {
  const fm = parseFrontmatterBlock(text);
  const header = parseHeaderFields(text, fm);
  const tokens = parseTokenFields(text, fm);
  const diag = parseDiagnosticFields(text);
  const outcome = parseOutcomeFields(fm);
  const modelMix = parseModelMix(text);
  const dominantModel = computeDominantModel(modelMix);
  const { toolCalls, toolFailures } = parseToolUsage(text);
  const toolFailureRate = toolCalls > 0 ? Number((toolFailures / toolCalls * 100).toFixed(1)) : 0;
  const toM = (n) => Number((n / 1e6).toFixed(3));
  const inputM = toM(tokens.inputTokens);
  const outputM = toM(tokens.outputTokens);
  const cacheReadM = toM(tokens.cacheReadTokens);
  const cacheWriteM = toM(tokens.cacheWriteTokens);
  const { runTitle, usd, windowStart, windowEnd, durationMs } = header;
  const {
    compactionCount,
    subagentDispatches,
    skillInvocations,
    turnsBeforeFirstTool,
    userMsgAvgLen,
    fileReReadCount,
    sessionsScanned,
    toolResultP90,
    messages,
    roleDispatches
  } = diag;
  const {
    gradeAvg,
    reviewDecision,
    validationDecision,
    sourceProject,
    autoDetected,
    aggregateAll,
    sourceCount
  } = outcome;
  const { totalTokens, cacheHitPct, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } = tokens;
  const flags = deriveFlags({
    compactionCount,
    subagentDispatches,
    fileReReadCount,
    toolFailures,
    toolResultP90,
    turnsBeforeFirstTool,
    gradeAvg,
    reviewDecision,
    validationDecision,
    autoDetected,
    sourceProject,
    aggregateAll,
    sourceCount
  });
  return {
    path: filePath,
    runTitle,
    usd,
    windowStart,
    windowEnd,
    durationMs,
    durationMin: durationMs ? Number((durationMs / 60000).toFixed(1)) : 0,
    messages,
    totalTokens,
    totalMillions: toM(totalTokens),
    cacheHitPct,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    inputMillions: inputM,
    outputMillions: outputM,
    cacheReadMillions: cacheReadM,
    cacheWriteMillions: cacheWriteM,
    ioMillionsStr: `${inputM} / ${outputM}`,
    cacheRWMillionsStr: `${cacheReadM} / ${cacheWriteM}`,
    dominantModel,
    dominantModelStr: dominantModel ? `${dominantModel.model} ${dominantModel.pct}%` : "-",
    modelMix,
    compactionCount,
    subagentDispatches,
    skillInvocations,
    turnsBeforeFirstTool,
    userMsgAvgLen,
    sourceProject,
    autoDetected,
    aggregateAll,
    sourceCount,
    fileReReadCount,
    sessionsScanned,
    toolCalls,
    toolFailures,
    toolFailureRate,
    toolResultP90,
    gradeAvg,
    reviewDecision,
    validationDecision,
    roleDispatches,
    flags,
    flagsStr: flags.join(" / "),
    hasFlags: flags.length > 0
  };
}
function dedupeForRollup(reports) {
  const bucketWinner = new Map;
  for (const r of reports) {
    const key = `${r.windowStart ?? ""}|${r.windowEnd ?? ""}`;
    const existing = bucketWinner.get(key);
    if (!existing) {
      bucketWinner.set(key, r);
    } else {
      if (!existing.aggregateAll && r.aggregateAll) {
        bucketWinner.set(key, r);
      }
    }
  }
  const winners = Array.from(bucketWinner.values());
  const aggregateWindows = winners.filter((r) => r.aggregateAll && r.windowStart && r.windowEnd).map((r) => ({ start: Date.parse(r.windowStart), end: Date.parse(r.windowEnd) }));
  function isContainedInAggregate(r) {
    if (r.aggregateAll)
      return false;
    if (!r.windowStart || !r.windowEnd)
      return false;
    const rStart = Date.parse(r.windowStart);
    const rEnd = Date.parse(r.windowEnd);
    return aggregateWindows.some((aw) => rStart >= aw.start && rEnd <= aw.end);
  }
  return winners.filter((r) => !isContainedInAggregate(r));
}
function aggregateRoleDispatches(reports) {
  const out = {};
  for (const r of reports) {
    if (!r.roleDispatches)
      continue;
    for (const [role, count] of Object.entries(r.roleDispatches)) {
      out[role] = (out[role] ?? 0) + count;
    }
  }
  return out;
}

// crew/scripts/lib/briefing/cost.mts
import fs29 from "fs/promises";
import path35 from "path";
async function statFiles(files) {
  const results = await Promise.all(files.map(async (f) => {
    try {
      const s = await fs29.stat(f);
      return { f, mtime: s.mtimeMs };
    } catch {
      return null;
    }
  }));
  return results.filter((s) => s !== null);
}
async function listCostReportFilesByMtime(dirs, limit) {
  const dirList = Array.isArray(dirs) ? dirs : [dirs];
  const perDirFiles = await Promise.all(dirList.map(async (dir) => {
    if (!await pathExists(dir))
      return [];
    let entries;
    try {
      entries = await fs29.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.filter((e) => e.isFile() && /-cost-report-.+\.md$/.test(e.name)).map((e) => path35.join(dir, e.name));
  }));
  const files = perDirFiles.flat();
  if (files.length === 0)
    return [];
  const stats = await statFiles(files);
  return stats.sort((a, b) => b.mtime - a.mtime).slice(0, limit).map((entry) => entry.f);
}
function computeModelBurn(rollupSet) {
  const modelBurnMap = new Map;
  for (const r of rollupSet) {
    if (!Array.isArray(r.modelMix))
      continue;
    for (const m of r.modelMix) {
      if (!modelBurnMap.has(m.model)) {
        modelBurnMap.set(m.model, { model: m.model, slices: 0, messages: 0, usd: 0 });
      }
      const agg = modelBurnMap.get(m.model);
      agg.slices += 1;
      agg.messages += m.messages || 0;
      agg.usd += m.usd || 0;
    }
  }
  return Array.from(modelBurnMap.values()).map((m) => ({ ...m, usd: Number(m.usd.toFixed(4)) })).sort((a, b) => b.usd - a.usd);
}
async function collectRecentCosts(repoPath, limit = 5) {
  const dirs = [
    path35.join(repoPath, ".claude", "artifacts", "crew", "cost"),
    path35.join(repoPath, ".claude", "artifacts", "crew", "runs")
  ];
  const sorted = await listCostReportFilesByMtime(dirs, limit);
  if (sorted.length === 0)
    return {
      recent: [],
      totalReports: 0,
      dedupedCount: 0,
      roleDispatches: {}
    };
  const results = await Promise.allSettled(sorted.map(async (filePath) => {
    const text = await fs29.readFile(filePath, "utf8");
    return parseCostReportText(filePath, text);
  }));
  const recent = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const rollupSet = dedupeForRollup(recent);
  const dedupedCount = rollupSet.length;
  let totalUsd = 0;
  for (const r of rollupSet) {
    if (r.usd != null)
      totalUsd += r.usd;
  }
  const avgUsd = dedupedCount ? Number((totalUsd / dedupedCount).toFixed(4)) : 0;
  const modelBurn = computeModelBurn(rollupSet);
  return {
    recent,
    totalReports: sorted.length,
    dedupedCount,
    sumUsdRecent: Number(totalUsd.toFixed(4)),
    avgUsdRecent: avgUsd,
    modelBurn,
    roleDispatches: aggregateRoleDispatches(rollupSet),
    diagnostics: recent.filter((r) => r.hasFlags)
  };
}
async function collectCostHealth(repoPath) {
  let advisor;
  try {
    advisor = await buildCostAdvisor(repoPath, {
      limit: 5,
      nameFilter: (name) => /-cost-report-slice-/.test(name)
    });
    if (!advisor.target) {
      advisor = await buildCostAdvisor(repoPath, { limit: 5 });
    }
  } catch {
    return null;
  }
  if (!advisor.target) {
    return null;
  }
  const { grade, recommendations = [], reports = [] } = advisor;
  const sorted = [...recommendations].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));
  const topConcern = sorted.length > 0 ? sorted[0]?.message ?? null : null;
  return {
    grade,
    topConcern,
    reportCount: reports.length
  };
}
async function collectCostAggregate(repoPath) {
  let advisor;
  try {
    advisor = await buildCostAdvisor(repoPath, {
      limit: 5,
      nameFilter: (name) => /-cost-report-aggregate-/.test(name)
    });
  } catch {
    return null;
  }
  if (!advisor.target) {
    return null;
  }
  const { grade, recommendations = [], reports = [] } = advisor;
  const sorted = [...recommendations].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));
  const topConcern = sorted.length > 0 ? sorted[0]?.message ?? null : null;
  return {
    grade,
    topConcern,
    reportCount: reports.length
  };
}
function computeModelCompliance(reports) {
  const valid = reports.filter((r) => Array.isArray(r.modelMix) && (r.modelMix?.length ?? 0) > 0);
  if (valid.length === 0)
    return null;
  const sonnetSlicePcts = valid.map((r) => {
    const entry = r.modelMix.find((m) => /sonnet/i.test(m.model));
    return entry ? entry.usdPct : 0;
  });
  const sonnetPct = sonnetSlicePcts.reduce((a, b) => a + b, 0) / sonnetSlicePcts.length;
  return {
    sonnetPct: Math.round(sonnetPct * 10) / 10,
    compliant: sonnetPct >= 60,
    sliceCount: valid.length
  };
}
async function collectModelCompliance(repoPath) {
  const costs = await collectRecentCosts(repoPath, 5);
  return computeModelCompliance(costs.recent);
}
var SEVERITY_RANK;
var init_cost = __esm(() => {
  init_cost_advisor();
  init_fs_utils();
  SEVERITY_RANK = { high: 0, medium: 1, low: 2 };
});

// crew/scripts/lib/briefing/workflow.mts
import { execFile as execFileCallback } from "child_process";
import { promisify } from "util";
function collectArtifactActivity(wakeUpBrief) {
  const labels = {
    runBrief: "Run brief",
    finalSynthesis: "Final synthesis",
    handoff: "Handoff",
    review: "Review result",
    validationPlan: "Validation plan",
    validationResult: "Validation result",
    deploymentCheck: "Deployment check"
  };
  return Object.entries(wakeUpBrief.latestArtifacts ?? {}).filter(([, artifact]) => Boolean(artifact)).map(([kind, artifact]) => {
    const a = artifact;
    return {
      kind,
      label: labels[kind] ?? kind,
      title: a.title ?? "",
      updatedAt: a.updatedAt ?? "",
      path: a.path ?? ""
    };
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
function extractMarkdownField(body, label) {
  const match = body.match(new RegExp(`^\\*\\*${label}\\*\\*:\\s*(.+)$`, "m"));
  return match ? (match[1] ?? "").trim() : "";
}
function stripFrontmatterBody(raw) {
  if (!raw.startsWith("---"))
    return raw;
  try {
    return parseFrontmatter(raw).body;
  } catch {
    return raw.slice(3);
  }
}
async function readArtifactSummary(filePath, fallbackTitle = "") {
  if (!filePath)
    return null;
  let cached;
  try {
    cached = await getCachedArtifact(filePath);
  } catch (err2) {
    if (err2.code === "ENOENT")
      return null;
    throw err2;
  }
  const { fm, body, mtimeMs } = cached;
  const bodyAfterFm = stripFrontmatterBody(body);
  const [heading = ""] = bodyAfterFm.split(`
`);
  return {
    path: filePath,
    title: heading.replace(/^#\s+/, "").trim() || fallbackTitle,
    updatedAt: new Date(mtimeMs).toISOString(),
    goal: extractMarkdownField(body, "Goal"),
    mode: extractMarkdownField(body, "Mode"),
    next: extractMarkdownField(body, "Next"),
    findings: fm["findings"] ?? null
  };
}
async function resolveRunArtifacts(runArtifacts, labels) {
  const candidates = [
    ["runBrief", runArtifacts.runBrief],
    ["finalSynthesis", runArtifacts.finalSynthesis],
    ["review", runArtifacts.reviewResult],
    ["validationPlan", runArtifacts.validationPlan],
    ["validationResult", runArtifacts.validationResult],
    ["deploymentCheck", runArtifacts.deploymentChecks?.dev ?? runArtifacts.deploymentChecks?.prod],
    ["handoff", runArtifacts.handoffs?.slice(-1)[0]]
  ];
  const summaries = await Promise.all(candidates.map(async ([kind, artifactPath]) => {
    const summary = await readArtifactSummary(artifactPath ?? "");
    if (!summary)
      return null;
    return {
      kind,
      label: labels[kind] ?? kind,
      title: summary.title,
      updatedAt: summary.updatedAt,
      path: summary.path,
      goal: summary.goal,
      mode: summary.mode,
      next: summary.next,
      findings: summary.findings ?? null
    };
  }));
  return summaries.filter((s) => s !== null);
}
async function findAutonomousLoopCli() {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"];
  if (!home)
    return null;
  const cacheDirs = [
    `${home}/.claude/plugins/cache/astra/loop`,
    `${home}/.claude/plugins/cache/autonomous-loop-dev/autonomous-loop`,
    `${home}/.claude/plugins/cache/autonomous-loop/autonomous-loop`
  ];
  const { promises: fsLocal } = await import("fs");
  const perDirCandidates = await Promise.all(cacheDirs.map(async (cacheDir) => {
    let entries;
    try {
      entries = await fsLocal.readdir(cacheDir);
    } catch {
      return null;
    }
    const versions = entries.sort().reverse();
    for (const v of versions) {
      const newName = `${cacheDir}/${v}/scripts/loop.mjs`;
      const legacyName = `${cacheDir}/${v}/scripts/autonomous-loop.mjs`;
      if (await pathExists(newName))
        return newName;
      if (await pathExists(legacyName))
        return legacyName;
    }
    return null;
  }));
  return perDirCandidates.find((c) => c !== null) ?? null;
}
async function collectRelevantArtifacts(wakeUpBrief) {
  const runArtifacts = wakeUpBrief.workflowState?.currentRun?.artifacts;
  if (!runArtifacts) {
    return collectArtifactActivity(wakeUpBrief);
  }
  const labels = {
    runBrief: "Run brief",
    finalSynthesis: "Final synthesis",
    handoff: "Handoff",
    review: "Review result",
    validationPlan: "Validation plan",
    validationResult: "Validation result",
    deploymentCheck: "Deployment check"
  };
  const present = await resolveRunArtifacts(runArtifacts, labels);
  return present.length > 0 ? present : collectArtifactActivity(wakeUpBrief);
}
async function fetchAutonomousLoopBrief(repoPath) {
  try {
    const cli = await findAutonomousLoopCli();
    if (!cli)
      return null;
    const { stdout } = await execFile2("node", [cli, "brief", "--repo", repoPath], {
      maxBuffer: 1048576
    });
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}
var execFile2;
var init_workflow = __esm(() => {
  init_dist2();
  init_artifact_cache();
  init_fs_utils();
  execFile2 = promisify(execFileCallback);
});

// crew/scripts/lib/briefing/hook.mts
import path36 from "path";
async function collectHookHealth(repoPath) {
  const eventsPath = path36.join(repoPath, ".claude", "logs", "events.jsonl");
  const raw = await tailReadJsonl2(eventsPath, HOOK_HEALTH_TAIL);
  const cutoff = Date.now() - HOOK_HEALTH_WINDOW_MS;
  const counts = new Map;
  for (const e of raw) {
    if (e["type"] !== "hook_error" || typeof e["hook"] !== "string")
      continue;
    const hookName = e["hook"];
    const tsVal = e["ts"];
    if (typeof tsVal !== "string")
      continue;
    const ts = new Date(tsVal).getTime();
    if (isNaN(ts) || ts < cutoff)
      continue;
    counts.set(hookName, (counts.get(hookName) ?? 0) + 1);
  }
  const hooks = KNOWN_HOOKS.map((name) => {
    const errorCount24h = counts.get(name) ?? 0;
    return {
      name,
      errorCount24h,
      status: errorCount24h > 0 ? "yellow" : "green"
    };
  });
  return { hooks };
}
var KNOWN_HOOKS, HOOK_HEALTH_TAIL = 100, HOOK_HEALTH_WINDOW_MS;
var init_hook = __esm(() => {
  init_jsonl3();
  KNOWN_HOOKS = [
    "check-redundant-read",
    "record-read-content",
    "preflight-shell",
    "check-subagent-return"
  ];
  HOOK_HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;
});

// crew/scripts/lib/briefing/bundle.mts
import fs30 from "fs/promises";
import path37 from "path";
async function readCurrentSliceId(repoPath) {
  const statePath = path37.join(repoPath, ".claude", "state", "crew", "workflow-state.json");
  try {
    const raw = await fs30.readFile(statePath, "utf8");
    const obj = JSON.parse(raw);
    const title = obj?.currentRun?.title;
    if (typeof title !== "string")
      return;
    const m = title.match(SLICE_RE_BRIEF);
    if (!m || !m[1])
      return;
    return `SLICE-${String(Number(m[1])).padStart(2, "0")}`;
  } catch {
    return;
  }
}
async function collectBundleStats(repoPath, sliceIdOverride) {
  const zero = { written: 0, malformed: 0, truncated: 0 };
  const sliceId = sliceIdOverride ?? await readCurrentSliceId(repoPath);
  if (!sliceId)
    return zero;
  const dir = path37.join(repoPath, ".claude", "artifacts", "crew", "bundles", sliceId);
  let entries;
  try {
    const all = await fs30.readdir(dir);
    entries = all.filter((n) => n.endsWith("-build-bundle.md"));
  } catch {
    return zero;
  }
  const statuses = await Promise.all(entries.map(async (name) => {
    try {
      const text = await fs30.readFile(path37.join(dir, name), "utf8");
      const hasFrontmatter = /^---\n[\s\S]*?\nschema_version:\s*\d+\n[\s\S]*?\n---/.test(text);
      if (!hasFrontmatter)
        return "malformed";
      if (/^truncated:\s*true$/m.test(text))
        return "truncated";
      return "ok";
    } catch {
      return "malformed";
    }
  }));
  const malformed = statuses.filter((s) => s === "malformed").length;
  const truncated = statuses.filter((s) => s === "truncated").length;
  return { written: entries.length, malformed, truncated };
}
var SLICE_RE_BRIEF;
var init_bundle = __esm(() => {
  SLICE_RE_BRIEF = /SLICE[-_](\d+)/i;
});

// crew/scripts/lib/briefing/collect.mts
var init_collect = __esm(() => {
  init_git2();
  init_cost();
  init_workflow();
  init_hook();
  init_bundle();
});

// crew/scripts/lib/wakeup.mjs
var exports_wakeup = {};
__export(exports_wakeup, {
  buildWakeUpBrief: () => buildWakeUpBrief
});
import fs31 from "fs/promises";
import path38 from "path";
async function readJson(filePath) {
  const text = await readFileIfExists(filePath);
  return text === null ? null : JSON.parse(text);
}
async function countFiles(dirPath) {
  if (!await pathExists(dirPath)) {
    return 0;
  }
  const entries = await fs31.readdir(dirPath, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).length;
}
async function listFilesNewestFirst(dirPath) {
  if (!await pathExists(dirPath)) {
    return [];
  }
  const entries = await fs31.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile());
  const stats = await Promise.all(files.map((e) => fs31.stat(path38.join(dirPath, e.name))));
  return files.map((e, i) => ({ path: path38.join(dirPath, e.name), mtimeMs: stats[i].mtimeMs })).sort((left, right) => right.mtimeMs - left.mtimeMs);
}
async function latestArtifactByPrefix(repoPath, subdir, prefix) {
  const dirPath = path38.join(repoPath, ...subdir);
  const files = await listFilesNewestFirst(dirPath);
  const match = files.find((file) => path38.basename(file.path).includes(`-${prefix}-`));
  if (!match) {
    return null;
  }
  const body = await fs31.readFile(match.path, "utf8");
  let content = body;
  if (body.startsWith("---")) {
    try {
      content = parseFrontmatter(body).body.trimStart();
    } catch {
      content = body;
    }
  }
  const [heading = ""] = content.split(`
`);
  return {
    path: match.path,
    title: heading.replace(/^#\s+/, "").trim(),
    updatedAt: new Date(match.mtimeMs).toISOString()
  };
}
async function collectGuideFiles(dirPath, guides) {
  if (!await pathExists(dirPath)) {
    return;
  }
  const entries = await fs31.readdir(dirPath);
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".md")) {
      continue;
    }
    guides.push({
      path: path38.join(dirPath, entry),
      kind: "repo-guide"
    });
  }
}
async function listRepoGuidance(repoPath) {
  const claudePath = path38.join(repoPath, "CLAUDE.md");
  const guides = [];
  if (await pathExists(claudePath)) {
    guides.push({
      path: claudePath,
      kind: "claude-md"
    });
  }
  await collectGuideFiles(path38.join(repoPath, ...REPO_GUIDES_DIR), guides);
  await collectGuideFiles(path38.join(repoPath, ...LEGACY_REPO_GUIDES_DIR), guides);
  return guides;
}
function newestOf(...artifacts) {
  return artifacts.filter(Boolean).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
}
function summarizeLatestArtifact(artifact) {
  if (!artifact) {
    return null;
  }
  return {
    title: artifact.title,
    updatedAt: artifact.updatedAt,
    path: artifact.path
  };
}
async function countArchive(repoPath) {
  const [runs, handoffs, reviews, validations, deployments] = await Promise.all([
    countFiles(path38.join(repoPath, ...RUNS_DIR)),
    countFiles(path38.join(repoPath, ...HANDOFFS_DIR)),
    countFiles(path38.join(repoPath, ...REVIEWS_DIR)),
    countFiles(path38.join(repoPath, ...VALIDATIONS_DIR)),
    countFiles(path38.join(repoPath, ...DEPLOYMENTS_DIR))
  ]);
  return { runs, handoffs, reviews, validations, deployments };
}
function buildMemoryBuckets({
  claims,
  sprint,
  workflow,
  latestDeploymentGuidance,
  latestRunBrief,
  latestFinalSynthesis,
  latestHandoff,
  latestReview,
  latestValidationPlan,
  latestValidationResult,
  latestDeploymentCheck,
  repoMemory,
  recentEvents,
  recentClaimHistory,
  archiveCounts
}) {
  return {
    policy: "bounded-v1",
    hot: {
      claims,
      sprint,
      workflow,
      repoGuidance: {
        deployment: latestDeploymentGuidance
      },
      repoMemory,
      latestArtifacts: {
        runBrief: latestRunBrief,
        finalSynthesis: latestFinalSynthesis,
        handoff: latestHandoff,
        validationPlan: latestValidationPlan,
        deploymentCheck: latestDeploymentCheck
      }
    },
    warm: {
      review: latestReview,
      validation: latestValidationResult,
      recentEvents,
      recentClaimHistory
    },
    cold: {
      archiveCounts,
      omittedByDefault: ["older_artifacts", "full_event_log", "full_history_log"]
    }
  };
}
async function buildWakeUpBrief(repoPath, options = {}) {
  const readOnly = options.readOnly === true;
  const [
    claims,
    sprint,
    workflowState,
    latestDeploymentGuidance,
    latestRunBrief,
    latestFinalSynthesis,
    latestHandoff,
    latestReview,
    latestValidationPlan,
    latestValidationResult,
    latestDeploymentCheck,
    hookHealth
  ] = await Promise.all([
    listClaims(repoPath, { createIfMissing: !readOnly }),
    readJson(await pathExists(path38.join(repoPath, ...SPRINT_PATH)) ? path38.join(repoPath, ...SPRINT_PATH) : path38.join(repoPath, ...LEGACY_SPRINT_PATH)),
    loadWorkflowState(repoPath, { createIfMissing: !readOnly }),
    readDeploymentGuidanceSummary(repoPath),
    latestArtifactByPrefix(repoPath, RUNS_DIR, "run-brief"),
    latestArtifactByPrefix(repoPath, RUNS_DIR, "final-synthesis"),
    latestArtifactByPrefix(repoPath, HANDOFFS_DIR, "handoff"),
    latestArtifactByPrefix(repoPath, REVIEWS_DIR, "review-result"),
    latestArtifactByPrefix(repoPath, VALIDATIONS_DIR, "validation-plan"),
    latestArtifactByPrefix(repoPath, VALIDATIONS_DIR, "validation-result"),
    latestArtifactByPrefix(repoPath, DEPLOYMENTS_DIR, "deployment-check"),
    collectHookHealth(repoPath)
  ]);
  const historyPath = path38.join(repoPath, ...HISTORY_PATH2);
  const resolvedHistoryPath = await pathExists(historyPath) ? historyPath : path38.join(repoPath, ...LEGACY_HISTORY_PATH);
  const [recentEventsRaw, recentClaimHistory, archiveCounts] = await Promise.all([
    tailReadJsonl2(path38.join(repoPath, ...EVENTS_PATH), RECENT_EVENTS_LIMIT),
    tailReadJsonl2(resolvedHistoryPath, RECENT_HISTORY_LIMIT),
    countArchive(repoPath)
  ]);
  const repoMemory = await listRepoGuidance(repoPath);
  const recentEvents = recentEventsRaw.map((event) => ({
    timestamp: event["timestamp"],
    event: event["event"],
    payloadPath: event["payloadPath"] || ""
  }));
  const latestArtifacts = {
    runBrief: latestRunBrief,
    finalSynthesis: latestFinalSynthesis,
    handoff: latestHandoff,
    review: latestReview,
    validationPlan: latestValidationPlan,
    validationResult: latestValidationResult,
    deploymentCheck: latestDeploymentCheck
  };
  const workflow = summarizeWorkflowState(workflowState);
  const memory = buildMemoryBuckets({
    claims,
    sprint,
    workflow,
    latestDeploymentGuidance,
    latestRunBrief,
    latestFinalSynthesis,
    latestHandoff,
    latestReview,
    latestValidationPlan,
    latestValidationResult,
    latestDeploymentCheck,
    repoMemory,
    recentEvents,
    recentClaimHistory,
    archiveCounts
  });
  return {
    repoPath,
    hasClaudeMd: await pathExists(path38.join(repoPath, "CLAUDE.md")),
    sprint,
    claims,
    workflow,
    repoGuidance: { deployment: latestDeploymentGuidance },
    repoMemory,
    recentClaimHistory,
    recentEvents,
    latestArtifacts,
    workflowState,
    hookHealth,
    memory,
    summary: buildWakeUpSummary({
      memory,
      claims,
      workflow,
      latestDeploymentGuidance,
      repoMemory,
      latestArtifacts,
      archiveCounts
    })
  };
}
function buildWakeUpSummary({
  memory,
  claims,
  workflow,
  latestDeploymentGuidance,
  repoMemory,
  latestArtifacts,
  archiveCounts
}) {
  const recentArtifactList = Object.values(latestArtifacts);
  const newest = newestOf(...recentArtifactList);
  return {
    memoryPolicy: memory["policy"],
    activeClaims: claims.length,
    hasActiveWorkflow: workflow.hasActiveRun,
    pendingWorkflowBadges: workflow.pendingBadges,
    hasDeploymentGuidance: Boolean(latestDeploymentGuidance),
    repoMemoryFiles: repoMemory.length,
    hasRecentRunMemory: recentArtifactList.some(Boolean),
    latestArtifact: summarizeLatestArtifact(newest),
    archiveCounts
  };
}
var RUNS_DIR, HANDOFFS_DIR, REVIEWS_DIR, VALIDATIONS_DIR, DEPLOYMENTS_DIR, EVENTS_PATH, HISTORY_PATH2, SPRINT_PATH, LEGACY_HISTORY_PATH, LEGACY_SPRINT_PATH, LEGACY_REPO_GUIDES_DIR, REPO_GUIDES_DIR, RECENT_EVENTS_LIMIT = 3, RECENT_HISTORY_LIMIT = 3;
var init_wakeup = __esm(() => {
  init_dist2();
  init_claims();
  init_read2();
  init_fs_utils();
  init_jsonl3();
  init_workflow_state();
  init_collect();
  RUNS_DIR = [".claude", "artifacts", "crew", "runs"];
  HANDOFFS_DIR = [".claude", "artifacts", "crew", "handoffs"];
  REVIEWS_DIR = [".claude", "artifacts", "crew", "reviews"];
  VALIDATIONS_DIR = [".claude", "artifacts", "crew", "validations"];
  DEPLOYMENTS_DIR = [".claude", "artifacts", "crew", "deployments"];
  EVENTS_PATH = [".claude", "logs", "events.jsonl"];
  HISTORY_PATH2 = [".claude", "state", "crew", "history.jsonl"];
  SPRINT_PATH = [".claude", "state", "crew", "sprint.json"];
  LEGACY_HISTORY_PATH = [".claude", "state", "engineering-os", "history.jsonl"];
  LEGACY_SPRINT_PATH = [".claude", "state", "engineering-os", "sprint.json"];
  LEGACY_REPO_GUIDES_DIR = [".claude", "engineering-os"];
  REPO_GUIDES_DIR = [".claude", "crew"];
});

// crew/scripts/lib/briefing/render.mts
function buildRetrievalGuide(wakeUpBrief, artifacts) {
  const guide = [];
  for (const entry of wakeUpBrief.repoMemory.slice(0, 3)) {
    guide.push({
      kind: entry.kind,
      path: entry.path
    });
  }
  if (wakeUpBrief.repoGuidance?.deployment?.path) {
    guide.push({
      kind: "deployment-guidance",
      path: wakeUpBrief.repoGuidance.deployment.path
    });
  }
  for (const artifact of artifacts.slice(0, 3)) {
    guide.push({
      kind: artifact.kind,
      path: artifact.path
    });
  }
  return guide.filter((entry, index, list) => list.findIndex((candidate) => candidate.path === entry.path) === index);
}
function buildCurrentObjective(wakeUpBrief, artifacts) {
  const currentRun = wakeUpBrief.workflow?.currentRun;
  if (currentRun) {
    return {
      source: "workflow",
      title: currentRun.title || "Workflow Run",
      goal: currentRun.goal || "",
      mode: currentRun.mode || "",
      status: currentRun.status || "",
      next: currentRun.next || ""
    };
  }
  const latestRun = artifacts.find((artifact) => artifact.kind === "runBrief");
  if (latestRun) {
    return {
      source: "run-artifact",
      title: latestRun.title,
      goal: latestRun.goal || "",
      mode: latestRun.mode || "",
      status: "idle",
      next: latestRun.next || ""
    };
  }
  const latestSynthesis = wakeUpBrief.latestArtifacts?.finalSynthesis;
  if (latestSynthesis) {
    return {
      source: "latest-final-synthesis",
      title: latestSynthesis.title,
      goal: "",
      mode: "",
      status: "completed",
      next: ""
    };
  }
  return {
    source: "none",
    title: "No active objective recorded",
    goal: "",
    mode: "",
    status: "idle",
    next: ""
  };
}
function gateFailureMessage(label, gate) {
  return `${label}${gate?.note ? `: ${gate.note}` : "."}`;
}
function collectGateFailureMessages(gates) {
  return GATE_FAILURE_SPECS.filter((spec) => spec.gate(gates)?.status === "failed").map((spec) => gateFailureMessage(spec.label, spec.gate(gates)));
}
function collectRepoStateMessages(wakeUpBrief, deploymentClues, gitActivity) {
  const out = [];
  if (!wakeUpBrief.hasClaudeMd) {
    out.push("This repo is not fully adopted into Crew yet.");
  }
  if (!wakeUpBrief.repoGuidance?.deployment && deploymentClues.clues.length > 0 && !wakeUpBrief.workflow?.hasActiveRun) {
    out.push("Deployment clues exist, but durable deployment guidance has not been recorded yet.");
  }
  if (gitActivity.workingTree.behind > 0) {
    out.push(`Current branch is behind ${gitActivity.workingTree.upstream || "upstream"} by ${gitActivity.workingTree.behind} commit(s).`);
  }
  return out;
}
function buildBlockedOrMissing(wakeUpBrief, deploymentClues, gitActivity) {
  const pending = wakeUpBrief.workflow?.pendingBadges ?? [];
  const missingWrites = wakeUpBrief.workflow?.missingArtifactWrites ?? [];
  const gates = wakeUpBrief.workflow?.currentRun?.gates ?? {};
  const isDefined = (v) => v !== undefined;
  return [
    ...pending.map((b) => PENDING_BADGE_MESSAGES[b]).filter(isDefined),
    ...collectGateFailureMessages(gates),
    ...missingWrites.map((w) => MISSING_WRITE_MESSAGES[w]).filter(isDefined),
    ...collectRepoStateMessages(wakeUpBrief, deploymentClues, gitActivity)
  ];
}
function buildImportantReminders(wakeUpBrief, deploymentClues, gitActivity, routingTable) {
  const ctx = {
    wakeUpBrief,
    deploymentClues,
    gitActivity,
    routingTable,
    missingWrites: new Set(wakeUpBrief.workflow?.missingArtifactWrites ?? [])
  };
  return REMINDER_RULES.filter((rule) => rule.when(ctx)).map((rule) => rule.message(ctx));
}
function repoStateNextStep(wakeUpBrief, deploymentClues, gitActivity) {
  const probes = [
    {
      cond: !wakeUpBrief.hasClaudeMd,
      msg: "Run /crew:adopt so the repo has the Crew harness, repo guidance, and local workflow state."
    },
    {
      cond: !wakeUpBrief.repoGuidance?.deployment && deploymentClues.clues.length > 0,
      msg: "Capture durable deployment guidance next so ship work can reuse repo-specific environment knowledge."
    },
    {
      cond: gitActivity.workingTree.behind > 0,
      msg: `Review or pull the ${gitActivity.workingTree.behind} upstream commit(s) before starting the next work chunk.`
    },
    {
      cond: gitActivity.workingTree.hasChanges,
      msg: "Decide whether the current uncommitted changes belong in the active work chunk or should be reviewed and split."
    }
  ];
  return probes.find((p) => p.cond)?.msg ?? null;
}
function collectGateFailureNextStep(gates) {
  const hit = GATE_NEXT_STEP_SPECS.find((spec) => spec.gate(gates)?.status === "failed");
  return hit ? hit.message : null;
}
function recommendedNextStep(wakeUpBrief, deploymentClues, gitActivity) {
  const pending = wakeUpBrief.workflow?.pendingBadges ?? [];
  const missingWrites = wakeUpBrief.workflow?.missingArtifactWrites ?? [];
  const currentRun = wakeUpBrief.workflow?.currentRun ?? undefined;
  const gates = currentRun?.gates ?? {};
  const repoNotAdopted = !wakeUpBrief.hasClaudeMd ? "Run /crew:adopt so the repo has the Crew harness, repo guidance, and local workflow state." : null;
  const ordered = [
    repoNotAdopted,
    NEXT_STEP_FROM_PENDING[pending[0] ?? ""],
    collectGateFailureNextStep(gates),
    NEXT_STEP_FROM_MISSING[missingWrites[0] ?? ""],
    currentRun?.next ?? null,
    repoStateNextStep(wakeUpBrief, deploymentClues, gitActivity)
  ];
  return ordered.find(Boolean) || "Start the next work chunk with /crew:build or /crew:fix, or just describe the task to the lead.";
}
function buildSecondaryOptions(wakeUpBrief, deploymentClues, gitActivity) {
  const options = [];
  if (gitActivity.isGitRepo && gitActivity.workingTree.hasChanges) {
    options.push("Inspect the current working tree and decide whether anything should be staged, split, or discarded.");
  }
  if (!wakeUpBrief.repoGuidance?.deployment && deploymentClues.clues.length > 0) {
    options.push("Write repo deployment guidance now so later ship work does not need to rediscover CI/CD from scratch.");
  }
  if (!wakeUpBrief.summary.hasRecentRunMemory) {
    options.push("Leave a run brief once substantial work starts so the next session has bounded context to recover.");
  }
  if (wakeUpBrief.workflow?.hasActiveRun && !wakeUpBrief.workflow.currentRun?.next) {
    options.push("Record a concrete next step in workflow state or the next artifact so recovery nudges stay specific.");
  }
  return options.slice(0, 3);
}
var PENDING_BADGE_MESSAGES, MISSING_WRITE_MESSAGES, GATE_FAILURE_SPECS, REMINDER_RULES, NEXT_STEP_FROM_PENDING, NEXT_STEP_FROM_MISSING, GATE_NEXT_STEP_SPECS;
var init_render = __esm(() => {
  PENDING_BADGE_MESSAGES = {
    review_required: "Independent review is still required before commit, PR, or final completion.",
    validation_expected: "Validation evidence is still expected for the current run.",
    dev_deploy_expected: "Dev deployment evidence is still missing for the current run.",
    prod_deploy_expected: "Production deployment evidence is still missing for the current run."
  };
  MISSING_WRITE_MESSAGES = {
    review_result_missing: "Independent review appears complete, but the review artifact write-back is still missing.",
    validation_result_missing: "Validation appears complete, but the validation-result artifact write-back is still missing.",
    dev_deployment_check_missing: "Dev deployment evidence exists in workflow state, but the deployment-check artifact is still missing.",
    prod_deployment_check_missing: "Production deployment evidence exists in workflow state, but the deployment-check artifact is still missing.",
    run_brief_missing: "This run has meaningful progress, but the run-brief artifact is still missing.",
    final_synthesis_missing: "Meaningful workflow phases completed, but the final synthesis artifact is still missing."
  };
  GATE_FAILURE_SPECS = [
    { label: "Independent review failed", gate: (g) => g.review },
    { label: "Validation failed", gate: (g) => g.validation },
    {
      label: "Dev deployment checks failed",
      gate: (g) => g.deployment?.dev
    },
    {
      label: "Production deployment checks failed",
      gate: (g) => g.deployment?.prod
    }
  ];
  REMINDER_RULES = [
    {
      when: (ctx) => ctx.gitActivity.isGitRepo && ctx.gitActivity.workingTree.hasChanges,
      message: (ctx) => `Working tree has ${ctx.gitActivity.workingTree.stagedCount} staged, ${ctx.gitActivity.workingTree.modifiedCount} modified, and ${ctx.gitActivity.workingTree.untrackedCount} untracked path(s).`
    },
    {
      when: (ctx) => !ctx.wakeUpBrief.summary.hasRecentRunMemory,
      message: () => "No recent run artifacts are recorded for this repo yet."
    },
    {
      when: (ctx) => !ctx.wakeUpBrief.repoGuidance?.deployment && ctx.deploymentClues.clues.length > 0,
      message: (ctx) => `Deployment clues were found in ${ctx.deploymentClues.clues.slice(0, 3).join(", ")}${ctx.deploymentClues.clues.length > 3 ? ", ..." : ""}.`
    },
    {
      when: (ctx) => ctx.wakeUpBrief.claims.length > 0,
      message: (ctx) => `${ctx.wakeUpBrief.claims.length} active claim(s) are still present in repo-local state.`
    },
    {
      when: (ctx) => ctx.wakeUpBrief.repoMemory.length <= 1,
      message: () => "Repo-specific memory is still thin; keep durable guidance and lessons learned up to date."
    },
    {
      when: (ctx) => ctx.missingWrites.size > 0,
      message: () => "A workflow phase appears complete, but the matching artifact write-back is still missing."
    },
    {
      when: (ctx) => (ctx.routingTable?.present ?? false) && (ctx.routingTable?.stale ?? false),
      message: (ctx) => `Routing table (docs/routing-table.md) is ${ctx.routingTable?.ageDays} days stale. Review against the last ~30 runs and refresh signal \u2192 role rows.`
    }
  ];
  NEXT_STEP_FROM_PENDING = {
    review_required: "Run independent review next before committing, opening a PR, or calling the work done.",
    validation_expected: "Run validation next and record the evidence before moving the work forward.",
    dev_deploy_expected: "Use /crew:ship to gather dev deployment evidence and verify the environment transition.",
    prod_deploy_expected: "Decide whether production promotion is appropriate, then use /crew:ship to collect prod evidence."
  };
  NEXT_STEP_FROM_MISSING = {
    review_result_missing: "Write the review-result artifact now so the run has an inspectable review gate record.",
    validation_result_missing: "Write the validation-result artifact now so the run keeps the evidence it already collected.",
    dev_deployment_check_missing: "Write the dev deployment-check artifact now so the environment evidence is recoverable next time.",
    prod_deployment_check_missing: "Write the production deployment-check artifact now so the rollout evidence is preserved.",
    run_brief_missing: "Write the run-brief artifact now so this workstream has a bounded starting point for recovery.",
    final_synthesis_missing: "Write the final synthesis now so the completed work and next step are preserved before you move on."
  };
  GATE_NEXT_STEP_SPECS = [
    {
      gate: (g) => g.review,
      message: "Address the failed review findings before moving the work forward."
    },
    {
      gate: (g) => g.validation,
      message: "Investigate the failed validation evidence and fix the issue before continuing."
    },
    {
      gate: (g) => g.deployment?.dev,
      message: "Investigate the failed dev deployment checks before attempting another rollout."
    },
    {
      gate: (g) => g.deployment?.prod,
      message: "Investigate the failed production checks immediately before any further promotion work."
    }
  ];
});

// crew/scripts/lib/briefing.mts
var exports_briefing = {};
__export(exports_briefing, {
  formatHookHealthSection: () => formatHookHealthSection,
  computeRunHealth: () => computeRunHealth,
  buildBriefingReport: () => buildBriefingReport
});
import fs32 from "fs/promises";
import path39 from "path";
async function checkRoutingTableStale(repoPath) {
  const candidate = path39.join(repoPath, "docs", "routing-table.md");
  try {
    const stat2 = await fs32.stat(candidate);
    const ageMs = Date.now() - stat2.mtimeMs;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    return {
      present: true,
      stale: ageDays > ROUTING_TABLE_STALE_DAYS,
      ageDays
    };
  } catch {
    return { present: false, stale: false, ageDays: null };
  }
}
function formatHookHealthSection(health) {
  const yellow = (health.hooks ?? []).filter((h) => h.status === "yellow");
  if (yellow.length === 0) {
    return `## Hook health

All hooks clean (0 errors in last 24h).
`;
  }
  const lines = yellow.map((h) => `- **${h.name}**: ${h.errorCount24h} error(s) in last 24h`);
  return `## Hook health

${lines.join(`
`)}
`;
}
function computeRunHealth(artifacts) {
  const relevant = artifacts.filter((a) => a && typeof a.findings === "string" && a.findings.length > 0);
  if (relevant.length === 0) {
    return null;
  }
  function parseFindings(findings) {
    return findings.split(",").map((part) => {
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1)
        return { key: part.trim(), count: 0 };
      const key = part.slice(0, colonIdx).trim();
      const count = Number.parseInt(part.slice(colonIdx + 1).trim(), 10);
      return { key, count: Number.isFinite(count) ? count : 0 };
    });
  }
  const parts = [];
  for (const artifact of relevant) {
    const label = artifact.label ?? artifact.kind ?? "artifact";
    const parsed = parseFindings(artifact.findings);
    const nonZero = parsed.filter((p) => p.count > 0);
    if (nonZero.length === 0)
      continue;
    const tokens = nonZero.map((p) => `${p.count}${p.key}`).join(" ");
    parts.push(`${tokens} across ${label.toLowerCase()}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}
function buildSummary(params) {
  const {
    gitActivity,
    wakeUpBrief,
    artifacts,
    deploymentClues,
    costs,
    routingTable,
    autonomousLoopBrief,
    runHealth,
    bundleStats
  } = params;
  const workflow = wakeUpBrief.workflow;
  return {
    isGitRepo: gitActivity.isGitRepo,
    hasActiveWorkflow: workflow?.hasActiveRun ?? false,
    pendingWorkflowBadges: workflow?.pendingBadges ?? [],
    hasRecentArtifacts: artifacts.length > 0,
    hasDeploymentGuidance: Boolean(wakeUpBrief.repoGuidance?.deployment),
    discoveredDeploymentClues: deploymentClues.clues?.length ?? 0,
    autonomousLoopInstalled: Boolean(autonomousLoopBrief),
    costReports: costs.dedupedCount,
    recentCostUsdSum: costs.sumUsdRecent ?? 0,
    recentCostUsdAvg: costs.avgUsdRecent ?? 0,
    routingTablePresent: routingTable.present,
    routingTableStale: routingTable.stale,
    routingTableAgeDays: routingTable.ageDays,
    runHealth,
    bundleStats
  };
}
async function buildBriefingReport(repoPath) {
  const [
    wakeUpBriefRaw,
    gitActivity,
    deploymentClues,
    autonomousLoopBrief,
    costs,
    routingTable,
    costHealth,
    costAggregate,
    modelCompliance,
    bundleStats
  ] = await Promise.all([
    buildWakeUpBrief(repoPath, { readOnly: true }),
    collectGitActivity(repoPath),
    discoverDeploymentClues(repoPath),
    fetchAutonomousLoopBrief(repoPath),
    collectRecentCosts(repoPath, 5),
    checkRoutingTableStale(repoPath),
    collectCostHealth(repoPath),
    collectCostAggregate(repoPath),
    collectModelCompliance(repoPath),
    collectBundleStats(repoPath)
  ]);
  const wakeUpBrief = wakeUpBriefRaw;
  const hookHealth = wakeUpBrief.hookHealth ?? {
    hooks: []
  };
  if (autonomousLoopBrief && costs.recent.length > 0) {
    autonomousLoopBrief["costs"] = costs;
  }
  const artifacts = await collectRelevantArtifacts(wakeUpBrief);
  const runHealth = computeRunHealth(artifacts);
  const currentObjective = buildCurrentObjective(wakeUpBrief, artifacts);
  const blockedOrMissing = buildBlockedOrMissing(wakeUpBrief, deploymentClues, gitActivity);
  const reminders = buildImportantReminders(wakeUpBrief, deploymentClues, gitActivity, routingTable);
  const nextStep = recommendedNextStep(wakeUpBrief, deploymentClues, gitActivity);
  const secondaryOptions = buildSecondaryOptions(wakeUpBrief, deploymentClues, gitActivity);
  const retrievalGuide = buildRetrievalGuide(wakeUpBrief, artifacts);
  const bundleSummaryLine = `bundles: ${bundleStats.written} written this slice, ${bundleStats.malformed} malformed, ${bundleStats.truncated} size-capped`;
  return {
    repoPath: wakeUpBrief.repoPath,
    wakeUp: wakeUpBrief,
    git: gitActivity,
    costHealth,
    costAggregate,
    modelCompliance,
    hookHealth,
    runHealth,
    bundleStats,
    sections: {
      hookHealth: formatHookHealthSection(hookHealth),
      currentObjective,
      recentActivity: {
        latestArtifacts: artifacts,
        repoMemory: wakeUpBrief.repoMemory,
        retrievalGuide,
        git: gitActivity
      },
      inProgress: {
        workflow: wakeUpBrief.workflow,
        activeClaims: wakeUpBrief.claims
      },
      blockedOrMissing,
      importantReminders: reminders,
      recommendedNextStep: nextStep,
      secondaryOptions,
      bundleSummary: bundleSummaryLine
    },
    summary: buildSummary({
      gitActivity,
      wakeUpBrief,
      artifacts,
      deploymentClues,
      costs,
      routingTable,
      autonomousLoopBrief,
      runHealth,
      bundleStats
    }),
    autonomousLoop: autonomousLoopBrief,
    costs,
    routingTable
  };
}
var ROUTING_TABLE_STALE_DAYS = 30;
var init_briefing = __esm(() => {
  init_read2();
  init_wakeup();
  init_collect();
  init_render();
});

// crew/scripts/lib/scope-estimate.mts
var exports_scope_estimate = {};
__export(exports_scope_estimate, {
  estimateScope: () => estimateScope
});
function estimateScope({ files }) {
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const fileCount = files.length;
  const hasEslintDisable = files.some((f) => f.eslintDisable === true);
  if (hasEslintDisable) {
    return { tier: "heavy", reason: "eslint-disable present in scope \u2014 complexity acknowledged" };
  }
  if (totalLines > HEAVY_LINES) {
    return {
      tier: "heavy",
      reason: `${totalLines} total lines exceeds heavy threshold (${HEAVY_LINES})`
    };
  }
  if (fileCount >= HEAVY_FILES) {
    return {
      tier: "heavy",
      reason: `${fileCount} files meets or exceeds heavy threshold (${HEAVY_FILES})`
    };
  }
  if (totalLines < LIGHT_LINES && fileCount <= 2) {
    return {
      tier: "light",
      reason: `${totalLines} total lines across ${fileCount} file(s) \u2014 well within light threshold`
    };
  }
  return { tier: "standard", reason: `${totalLines} total lines across ${fileCount} file(s)` };
}
var LIGHT_LINES = 300, HEAVY_LINES = 800, HEAVY_FILES = 6;

// crew/scripts/lib/fleet.mts
var exports_fleet = {};
__export(exports_fleet, {
  renderFleet: () => renderFleet,
  collectFleetWorktrees: () => collectFleetWorktrees,
  buildFleetReport: () => buildFleetReport
});
import fs33 from "fs/promises";
import path40 from "path";
function extractProgressFields(lines) {
  let updatedAt = null;
  let completedCount = null;
  let totalCount = null;
  let inProgressSlice = null;
  let inProgressTitle = null;
  for (const line of lines) {
    const updatedMatch = line.match(/^Updated:\s+(.+)$/);
    if (updatedMatch) {
      updatedAt = (updatedMatch[1] ?? "").trim();
      continue;
    }
    const progressMatch = line.match(/^Progress:\s+(\d+)\/(\d+)\s+completed/);
    if (progressMatch) {
      completedCount = Number(progressMatch[1] ?? "0");
      totalCount = Number(progressMatch[2] ?? "0");
      continue;
    }
    const parsed = parseInProgressLine(line);
    if (parsed) {
      inProgressSlice = parsed.slice;
      inProgressTitle = parsed.title;
    }
  }
  return { updatedAt, completedCount, totalCount, inProgressSlice, inProgressTitle };
}
function parseInProgressLine(line) {
  const m = line.match(/^-\s+(SLICE-\d+)\s*[\u2014\u2013-]+\s*(.+?)\s*[\u2014\u2013-]+\s*\*\*IN_PROGRESS\*\*/);
  if (!m)
    return null;
  return { slice: m[1] ?? "", title: (m[2] ?? "").trim() };
}
function parseSliceProgress(text, repoName) {
  const lines = text.split(/\r?\n/);
  const { updatedAt, completedCount, totalCount, inProgressSlice, inProgressTitle } = extractProgressFields(lines);
  return { repoName, inProgressSlice, inProgressTitle, completedCount, totalCount, updatedAt };
}
async function findSliceProgressFiles(roots) {
  const found = [];
  for (const root of roots) {
    if (!await pathExists(root))
      continue;
    let entries;
    try {
      entries = await fs33.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue;
      const candidate = path40.join(root, entry.name, ".claude", "state", "crew", "slice-progress.md");
      if (await pathExists(candidate)) {
        found.push({ repoName: entry.name, progressPath: candidate });
      }
    }
  }
  return found;
}
async function loadProgressItem(repoName, progressPath, isSelf) {
  try {
    const text = await fs33.readFile(progressPath, "utf8");
    return { ...parseSliceProgress(text, repoName), progressPath, isSelf };
  } catch {
    return { repoName, progressPath, isSelf, error: "unreadable" };
  }
}
async function deduplicateAndLoad(found, selfProgress, includeSelf) {
  const seen = new Set;
  const items = [];
  for (const { repoName, progressPath } of found) {
    const resolved = path40.resolve(progressPath);
    if (seen.has(resolved))
      continue;
    seen.add(resolved);
    const isSelf = resolved === path40.resolve(selfProgress);
    if (isSelf && !includeSelf)
      continue;
    items.push(await loadProgressItem(repoName, resolved, isSelf));
  }
  return { items, seen };
}
async function collectFleetWorktrees(currentRepoPath, { extraRoots = [], includeSelf = true } = {}) {
  const parent = path40.dirname(currentRepoPath);
  const scanRoots = [parent, ...extraRoots.map((r) => path40.resolve(r))];
  const found = await findSliceProgressFiles(scanRoots);
  const selfProgress = path40.join(currentRepoPath, ".claude", "state", "crew", "slice-progress.md");
  const { items, seen } = await deduplicateAndLoad(found, selfProgress, includeSelf);
  if (includeSelf && !seen.has(path40.resolve(selfProgress))) {
    const text = await readFileIfExists(selfProgress);
    if (text !== null) {
      const selfName = path40.basename(currentRepoPath);
      items.push({
        ...parseSliceProgress(text, selfName),
        progressPath: path40.resolve(selfProgress),
        isSelf: true
      });
    }
  }
  return items.sort((a, b) => a.repoName.localeCompare(b.repoName));
}
function formatAge(isoString) {
  if (!isoString)
    return "unknown";
  const ms = Date.now() - new Date(isoString).getTime();
  if (isNaN(ms) || ms < 0)
    return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1)
    return "just now";
  if (mins < 60)
    return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)
    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function renderErrorRow(item) {
  return `| ${item.repoName}${item.isSelf ? " *(this)*" : ""} | _(unreadable)_ | \u2014 | \u2014 |`;
}
function renderItemRow(item) {
  const sliceCol = item.inProgressSlice ? `**${item.inProgressSlice}** \u2014 ${item.inProgressTitle ?? ""}` : "_(idle)_";
  const progressCol = item.completedCount != null && item.totalCount != null ? `${item.completedCount}/${item.totalCount}` : "\u2014";
  const ageCol = formatAge(item.updatedAt);
  const nameCol = item.isSelf ? `${item.repoName} *(this)*` : item.repoName;
  return `| ${nameCol} | ${sliceCol} | ${progressCol} | ${ageCol} |`;
}
function renderFleet(items) {
  if (items.length === 0) {
    return `# Fleet

_(no active loops found \u2014 no sibling repos with \`.claude/state/crew/slice-progress.md\`)_
`;
  }
  const now = new Date().toISOString();
  const lines = [
    "# Fleet",
    "",
    `Generated: ${now}`,
    "",
    `| Repo | In Progress | Progress | Updated |`,
    `|------|------------|----------|---------|`
  ];
  for (const item of items) {
    lines.push(item.error ? renderErrorRow(item) : renderItemRow(item));
  }
  lines.push("");
  return lines.join(`
`);
}
async function buildFleetReport(currentRepoPath, { extraRoots = [], includeSelf = true } = {}) {
  const items = await collectFleetWorktrees(currentRepoPath, { extraRoots, includeSelf });
  const markdown = renderFleet(items);
  return { items, markdown };
}
var init_fleet = __esm(() => {
  init_fs_utils();
  init_fs_utils();
});

// crew/scripts/lib/deployment-guidance/write.mts
var exports_write2 = {};
__export(exports_write2, {
  writeDeploymentGuidance: () => writeDeploymentGuidance
});
import fs34 from "fs/promises";
import path41 from "path";
function nowIso6() {
  return new Date().toISOString();
}
function toList2(value) {
  if (!value) {
    return [];
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function uniq(values) {
  return [...new Set(values.filter((v) => Boolean(v)))];
}
function renderField2(label, value) {
  return `- ${label}: ${value || "-"}`;
}
function renderListField2(label, value) {
  const items = Array.isArray(value) ? value : toList2(value);
  if (items.length === 0) {
    return `- ${label}: -`;
  }
  return [`- ${label}:`, ...items.map((item) => `  - ${item}`)].join(`
`);
}
async function writeDeploymentGuidance(repoPath, fields = {}) {
  try {
    const filePath = guidancePath(repoPath);
    await fs34.mkdir(path41.dirname(filePath), { recursive: true });
    const discovered = await discoverDeploymentClues(repoPath);
    const mergedClues = uniq([...discovered.clues, ...toList2(fields.clues)]);
    const contents = [
      `# Deployment Guidance: ${fields.title || "Repo Deployment Model"}`,
      "",
      renderField2("Updated", nowIso6()),
      renderField2("Owner", fields.owner || "dispatcher-session"),
      renderField2("Discovery Status", fields.discoveryStatus || "repo-derived"),
      renderListField2("Verified From", fields.verifiedFrom),
      renderField2("Summary", fields.summary),
      renderField2("Build Path", fields.build),
      renderField2("Deploy Path", fields.deploy),
      renderListField2("Environments", fields.environments),
      renderField2("Logs", fields.logs),
      renderField2("Metrics", fields.metrics),
      renderField2("Alerts / Incidents", fields.alerts),
      renderField2("Telemetry / Events", fields.telemetry),
      renderListField2("Source Clues", mergedClues),
      renderListField2("Still Missing", fields.missing),
      renderField2("Refresh When", fields.refreshWhen || fields.next),
      ""
    ].join(`
`);
    await fs34.writeFile(filePath, `${contents}
`);
    return ok({
      kind: "deployment-guidance",
      path: filePath,
      title: fields.title || "Repo Deployment Model",
      clues: mergedClues
    });
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
var init_write2 = __esm(() => {
  init_result();
  init_read2();
});

// crew/scripts/lib/artifacts/validation-result-writer.mts
var exports_validation_result_writer = {};
__export(exports_validation_result_writer, {
  writeValidationResultArtifact: () => writeValidationResultArtifact,
  resolveValidationVerdict: () => resolveValidationVerdict,
  assertValidationFieldsValid: () => assertValidationFieldsValid
});
function resolveValidationVerdict(rawDecision) {
  if (!rawDecision)
    return;
  const normalized = normalizeValidationDecision(rawDecision);
  if (!normalized) {
    throw new Error(`write-validation-result refused: unknown decision "${rawDecision}". Valid values: pass, fail, skipped (passed, passed_with_notes, failed accepted as legacy aliases).`);
  }
  return normalized.canonical;
}
function assertDecisionProvided(rawDecision, scaffold, status) {
  if (scaffold || status === "in-progress")
    return;
  if (rawDecision)
    return;
  throw new Error("write-validation-result refused: --decision is required (pass|fail|skipped).");
}
function assertValidationFieldsValid(fields) {
  const result2 = ValidationArtifactSchema.safeParse(fields);
  if (result2.success === true)
    return;
  const messages = result2.error?.issues.map((i) => i.message).join("; ") ?? "unknown error";
  throw new Error(`write-validation-result refused: schema validation failed: ${messages}`);
}
function resolvePhase(rawPhase) {
  return rawPhase !== null && rawPhase !== undefined && String(rawPhase).length > 0 ? String(rawPhase) : undefined;
}
function buildSchemaCheckFields(input, verdict, phase) {
  return {
    decision: verdict,
    skip_reason: input.skipReason ?? undefined,
    phase,
    feature: input.feature ?? undefined,
    slice: input.slice ?? undefined,
    findings: input.findings ?? undefined,
    status: input.status ?? undefined,
    validation_evidence: input.validationEvidence ?? undefined
  };
}
function scaffoldField(scaffold) {
  return scaffold !== undefined ? { scaffold } : {};
}
function buildArtifactFields(input, rawDecision, verdict, phase) {
  return {
    title: input.title || "Validation Result",
    validator: input.validator || input.owner || "verifier",
    decision: rawDecision ?? undefined,
    verdict,
    skipReason: input.skipReason ?? undefined,
    status: input.status ?? undefined,
    findings: input.findings ?? null,
    ...scaffoldField(input.scaffold),
    environment: input.environment ?? undefined,
    goal: input.goal ?? undefined,
    summary: input.summary ?? undefined,
    evidence: input.evidence ?? undefined,
    files: input.files ?? undefined,
    risks: input.risks ?? undefined,
    next: input.next ?? undefined,
    feature: input.feature ?? undefined,
    phase,
    updatePath: input.updatePath ?? undefined
  };
}
async function writeValidationResultArtifact(repoPath, input) {
  const rawDecision = input.decision ?? null;
  assertDecisionProvided(rawDecision, input.scaffold === true, input.status ?? undefined);
  const verdict = resolveValidationVerdict(rawDecision);
  const phase = resolvePhase(input.phase);
  assertValidationFieldsValid(buildSchemaCheckFields(input, verdict, phase));
  const r = await writeArtifact(repoPath, "validation-result", buildArtifactFields(input, rawDecision, verdict, phase));
  if (r.ok === false)
    throw r.error;
  return r.value;
}
var init_validation_result_writer = __esm(() => {
  init_write();
  init_artifact_schemas();
});

// crew/scripts/lib/cost-watch.mts
var exports_cost_watch = {};
__export(exports_cost_watch, {
  summarizeSliceBurn: () => summarizeSliceBurn,
  summarizeDispatchBurn: () => summarizeDispatchBurn,
  renderCostWatchReport: () => renderCostWatchReport,
  readLoopCostCeiling: () => readLoopCostCeiling,
  buildCostWatch: () => buildCostWatch,
  DEFAULT_PER_DISPATCH_TOKEN_CAP: () => DEFAULT_PER_DISPATCH_TOKEN_CAP
});
import fs35 from "fs/promises";
import path42 from "path";
function summarizeDispatchBurn(rows, perDispatchTokenCap = DEFAULT_PER_DISPATCH_TOKEN_CAP) {
  let rollingTotalTokens = 0;
  let flaggedCount = 0;
  const out = rows.map((r) => {
    const totalTokens = (r.tokenIn ?? 0) + (r.tokenOut ?? 0);
    rollingTotalTokens += totalTokens;
    const flagged = totalTokens > perDispatchTokenCap;
    if (flagged)
      flaggedCount += 1;
    return {
      runId: r.runId,
      sliceId: r.sliceId,
      agent: r.agent,
      model: r.model ?? "unknown",
      tokenIn: r.tokenIn ?? 0,
      tokenOut: r.tokenOut ?? 0,
      totalTokens,
      wallMs: r.wallMs ?? 0,
      flagged
    };
  });
  return { rows: out, rollingTotalTokens, perDispatchTokenCap, flaggedCount };
}
function summarizeSliceBurn(reports, rollingUsd, ceilingUsd) {
  const flaggedPaths = new Set;
  if (ceilingUsd != null) {
    for (const r of reports) {
      if ((r.usd ?? 0) > ceilingUsd)
        flaggedPaths.add(r.path);
    }
  }
  return {
    reports,
    flaggedPaths,
    rollingUsd: Number(rollingUsd.toFixed(4)),
    ceilingUsd,
    ceilingExceeded: flaggedPaths.size > 0
  };
}
async function readLoopCostCeiling(repoPath) {
  try {
    const raw = await fs35.readFile(path42.join(repoPath, ".claude", "loop.json"), "utf8");
    const parsed = JSON.parse(raw);
    const v = parsed.loop?.cost?.ceilingUsd;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
async function buildCostWatch(repoPath, options = {}) {
  const limit = options.limit ?? 10;
  const perDispatchTokenCap = options.perDispatchTokenCap ?? DEFAULT_PER_DISPATCH_TOKEN_CAP;
  const dispatchLogPath = options.dispatchTimingLogPath ?? process.env["CREW_DISPATCH_TIMING_LOG"] ?? path42.join(process.env["CLAUDE_PLUGIN_ROOT"] ?? repoPath, ".claude", "logs", "dispatch-timing.jsonl");
  const [dispatchRows, costResult, ceilingUsd] = await Promise.all([
    readRecentDispatchRows(dispatchLogPath, limit),
    collectRecentCosts(repoPath, limit),
    readLoopCostCeiling(repoPath)
  ]);
  return {
    dispatch: summarizeDispatchBurn(dispatchRows, perDispatchTokenCap),
    slice: summarizeSliceBurn(costResult.recent, costResult.sumUsdRecent ?? 0, ceilingUsd)
  };
}
function renderDispatchSection(dispatch) {
  const lines = [
    `## Recent dispatches (${dispatch.rows.length}, token cap ${dispatch.perDispatchTokenCap.toLocaleString()})`,
    ""
  ];
  if (dispatch.rows.length === 0) {
    lines.push("_(no dispatch-timing data \u2014 the PreToolUse Agent hook may be disabled, or no Agent-tool dispatches recorded yet)_", "");
    return lines;
  }
  lines.push("| Agent | Model | Tokens (in/out) | Total | wallMs | Flag |", "|-------|-------|-----------------|-------|--------|------|");
  for (const r of dispatch.rows) {
    lines.push(`| ${r.agent} | ${r.model} | ${r.tokenIn.toLocaleString()}/${r.tokenOut.toLocaleString()} | ${r.totalTokens.toLocaleString()} | ${r.wallMs} | ${r.flagged ? "\u26A0 OVER CAP" : ""} |`);
  }
  lines.push("", `Rolling total (this window): ${dispatch.rollingTotalTokens.toLocaleString()} tokens`);
  if (dispatch.flaggedCount > 0) {
    lines.push(`\u26A0 ${dispatch.flaggedCount} dispatch(es) crossed the ${dispatch.perDispatchTokenCap.toLocaleString()}-token cap. Advisory only.`);
  }
  lines.push("");
  return lines;
}
function renderSliceSection(slice) {
  const lines = [`## Recent slices (${slice.reports.length})`, ""];
  if (slice.reports.length === 0) {
    lines.push("_(no cost-report-slice artifacts found under .claude/artifacts/crew/cost/)_", "");
    return lines;
  }
  lines.push("| Slice / Run | USD | Total tokens | Cache hit % | Flag |", "|-------------|-----|---------------|-------------|------|");
  for (const r of slice.reports) {
    const flagged = slice.flaggedPaths.has(r.path);
    lines.push(`| ${r.runTitle ?? "-"} | $${(r.usd ?? 0).toFixed(4)} | ${r.totalTokens.toLocaleString()} | ${r.cacheHitPct}% | ${flagged ? "\u26A0 OVER CEILING" : ""} |`);
  }
  lines.push("", `Rolling USD (deduped window, informational): $${slice.rollingUsd.toFixed(4)}`);
  if (slice.ceilingUsd == null) {
    lines.push("_(no loop.cost.ceilingUsd configured in .claude/loop.json \u2014 no ceiling flag available)_");
  } else if (slice.ceilingExceeded) {
    lines.push(`\u26A0 ${slice.flaggedPaths.size} report(s) exceeded loop.cost.ceilingUsd ($${slice.ceilingUsd}) on their own. Advisory only \u2014 not a hard stop.`);
  } else {
    lines.push(`OK \u2014 no single report in this window exceeded loop.cost.ceilingUsd ($${slice.ceilingUsd}).`);
  }
  lines.push("");
  return lines;
}
function renderCostWatchReport(data) {
  const lines = ["Crew cost-watch \u2014 burn summary", ""];
  lines.push(...renderDispatchSection(data.dispatch));
  lines.push(...renderSliceSection(data.slice));
  lines.push("## Data-gap notes", "", "- Per-dispatch `model` reflects the agent's frontmatter-pinned model at dispatch time (advisory per FEAT-194 S3), not a runtime-verified resolved model.", "- Per-dispatch cache-hit % is not captured anywhere; cache-hit is only available at slice/session granularity (cost-report-slice artifacts).", "");
  return lines.join(`
`);
}
var DEFAULT_PER_DISPATCH_TOKEN_CAP = 150000;
var init_cost_watch = __esm(() => {
  init_dispatch_timing_reader();
  init_cost();
});

// crew/scripts/lib/agent-registry.mts
var exports_agent_registry = {};
__export(exports_agent_registry, {
  routeByTags: () => routeByTags,
  loadAgentRegistry: () => loadAgentRegistry
});
import fs36 from "fs/promises";
import path43 from "path";
function parseEntry(name, relPath, md) {
  let data;
  try {
    ({ data } = parseFrontmatter(md));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object")
    return null;
  const obj = data;
  const caps = obj["capabilities"];
  if (!caps || typeof caps !== "object")
    return null;
  const capsRec = caps;
  const asStrArr = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : undefined;
  const asNum = (v) => typeof v === "number" ? v : undefined;
  const capabilities = {};
  const role = asStrArr(capsRec["role"]);
  const surfaces = asStrArr(capsRec["surfaces"]);
  const stacks = asStrArr(capsRec["stacks"]);
  const concerns = asStrArr(capsRec["concerns"]);
  const lens = asStrArr(capsRec["lens"]);
  const scopes = asStrArr(capsRec["scopes"]);
  const priority = asNum(capsRec["priority"]);
  if (role)
    capabilities.role = role;
  if (surfaces)
    capabilities.surfaces = surfaces;
  if (stacks)
    capabilities.stacks = stacks;
  if (concerns)
    capabilities.concerns = concerns;
  if (lens)
    capabilities.lens = lens;
  if (scopes)
    capabilities.scopes = scopes;
  if (priority !== undefined)
    capabilities.priority = priority;
  return { name, path: relPath, capabilities, priority: priority ?? 0 };
}
async function walkAgentDir(dir, repo) {
  let entries = [];
  try {
    entries = await fs36.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = path43.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walkAgentDir(full, repo));
      continue;
    }
    if (!e.isFile() || !e.name.endsWith(".md"))
      continue;
    let md = "";
    try {
      md = await fs36.readFile(full, "utf-8");
    } catch {
      continue;
    }
    const name = e.name.replace(/\.md$/, "");
    const rel = path43.relative(repo, full).split(path43.sep).join("/");
    const entry = parseEntry(name, rel, md);
    if (entry)
      out.push(entry);
  }
  return out;
}
async function loadAgentRegistry(repo, agentsSubdir = "agents") {
  const dir = path43.isAbsolute(agentsSubdir) ? agentsSubdir : path43.join(repo, agentsSubdir);
  const all = await walkAgentDir(dir, repo);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}
function matchDimension(values, needle, label, hits) {
  if (!needle)
    return true;
  if (!values || !values.includes(needle))
    return false;
  hits.push(`${label}:${needle}`);
  return true;
}
function routeByTags(registry, query) {
  const out = [];
  for (const entry of registry) {
    const matched = [];
    const c = entry.capabilities;
    const ok3 = matchDimension(c.role, query.role, "role", matched) && matchDimension(c.surfaces, query.surface, "surface", matched) && matchDimension(c.stacks, query.stack, "stack", matched) && matchDimension(c.concerns, query.concern, "concern", matched) && matchDimension(c.lens, query.lens, "lens", matched) && matchDimension(c.scopes, query.scope, "scope", matched);
    if (!ok3)
      continue;
    const askedFilters = Object.values(query).filter(Boolean).length;
    if (askedFilters > 0 && matched.length === 0)
      continue;
    out.push({ entry, matched, score: matched.length * 10 + (entry.priority ?? 0) });
  }
  return out.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
}
var init_agent_registry = __esm(() => {
  init_dist2();
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/score-result.js
var ScoreResultSchema;
var init_score_result = __esm(() => {
  init_zod();
  ScoreResultSchema = exports_external.object({
    pass: exports_external.boolean(),
    score: exports_external.number().min(0).max(1),
    rubric: exports_external.record(exports_external.string(), exports_external.number()).optional(),
    cost_usd: exports_external.number().nonnegative(),
    latency_ms: exports_external.number().int().nonnegative(),
    rationale: exports_external.string().optional()
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/trial.js
var TrialSchema;
var init_trial = __esm(() => {
  init_zod();
  init_score_result();
  TrialSchema = exports_external.object({
    id: exports_external.string().uuid(),
    agent: exports_external.string(),
    phase: exports_external.enum(["build", "review", "validate", "ship"]),
    candidate_prompt_hash: exports_external.string(),
    candidate_prompt_path: exports_external.string().nullable(),
    input: exports_external.unknown(),
    output: exports_external.unknown(),
    score: ScoreResultSchema,
    source: exports_external.enum(["eval", "captured", "soak"]),
    pareto_rank: exports_external.number().int().nullable(),
    created_at: exports_external.string().datetime()
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/eval-case.js
var EvalCaseSchema;
var init_eval_case = __esm(() => {
  init_zod();
  EvalCaseSchema = exports_external.object({
    id: exports_external.string(),
    input: exports_external.unknown(),
    expected_output: exports_external.unknown().nullable().optional(),
    rubric: exports_external.array(exports_external.string()).optional(),
    held_out: exports_external.boolean().default(false),
    notes: exports_external.string().optional()
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/crew-artifact.js
var CrewArtifactSchema;
var init_crew_artifact = __esm(() => {
  init_zod();
  CrewArtifactSchema = exports_external.object({
    agent: exports_external.string(),
    phase: exports_external.enum(["build", "review", "validate", "ship"]),
    input: exports_external.unknown(),
    output: exports_external.unknown(),
    score_hint: exports_external.object({
      pass: exports_external.boolean().optional(),
      rubric_signal: exports_external.record(exports_external.string(), exports_external.number()).optional(),
      cost_usd: exports_external.number().nonnegative().optional(),
      latency_ms: exports_external.number().int().nonnegative().optional()
    }).optional(),
    source_artifact_path: exports_external.string().optional(),
    dispatched_at: exports_external.string().datetime()
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/agent-run.js
var AgentRunSchema;
var init_agent_run = __esm(() => {
  init_zod();
  AgentRunSchema = exports_external.object({
    agent: exports_external.string(),
    candidate_prompt_path: exports_external.string(),
    case_id: exports_external.string(),
    raw_output: exports_external.unknown(),
    cost_usd: exports_external.number().nonnegative(),
    latency_ms: exports_external.number().int().nonnegative(),
    finished_at: exports_external.string().datetime()
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/candidate.js
var CandidateSchema;
var init_candidate = __esm(() => {
  init_zod();
  CandidateSchema = exports_external.object({
    id: exports_external.string().uuid(),
    agent: exports_external.string(),
    prompt_path: exports_external.string(),
    prompt_hash: exports_external.string(),
    prompt_size_lines: exports_external.number().int().positive(),
    derived_from_trials: exports_external.array(exports_external.string().uuid()),
    generator_cost_usd: exports_external.number().nonnegative(),
    created_at: exports_external.string().datetime()
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/gepa-config.js
var GepaConfigSchema;
var init_gepa_config = __esm(() => {
  init_zod();
  GepaConfigSchema = exports_external.object({
    capture: exports_external.object({
      enabled: exports_external.boolean().default(true),
      exclude: exports_external.array(exports_external.string()).default([]),
      walltime_ms: exports_external.number().int().positive().default(2000)
    }).default({}),
    storage: exports_external.object({
      backend: exports_external.enum(["file", "astramem"]).default("file"),
      file_root: exports_external.string().default(".claude/artifacts/crew/gepa/trials"),
      astramem_cli_path: exports_external.string().optional()
    }).default({}),
    runner: exports_external.object({
      backend: exports_external.enum(["sequential", "wave"]).default("sequential")
    }).default({}),
    judge: exports_external.object({
      provider: exports_external.enum(["ollama", "azure-openai", "gemini", "groq", "generic-openai"]).default("ollama"),
      model: exports_external.string().default("llama3.2:latest"),
      endpoint: exports_external.string().optional(),
      deployment: exports_external.string().optional(),
      api_key_env: exports_external.string().optional()
    }).default({}),
    judge_per_agent: exports_external.record(exports_external.string(), exports_external.object({
      provider: exports_external.enum(["ollama", "azure-openai", "gemini", "groq", "generic-openai"]),
      model: exports_external.string(),
      endpoint: exports_external.string().optional(),
      deployment: exports_external.string().optional(),
      api_key_env: exports_external.string().optional()
    })).default({}),
    budget: exports_external.object({
      daily_usd: exports_external.number().nonnegative().default(50),
      per_eval_default_usd: exports_external.number().nonnegative().default(2),
      per_optimize_default_usd: exports_external.number().nonnegative().default(5)
    }).default({}),
    optimize: exports_external.object({
      paused: exports_external.boolean().default(false),
      k: exports_external.number().int().positive().default(5)
    }).default({}),
    policy: exports_external.object({
      eligible_agents: exports_external.array(exports_external.string()).default([]),
      min_pass_delta: exports_external.number().min(0).max(1).default(0.05),
      min_case_score_floor: exports_external.number().min(0).max(1).default(0.6),
      soak_percent: exports_external.number().min(0).max(1).default(0.1),
      soak_days: exports_external.number().int().positive().default(7),
      min_soak_trials: exports_external.number().int().positive().default(20),
      max_soak_days: exports_external.number().int().positive().default(21),
      soak_epsilon: exports_external.number().min(0).max(1).default(0.02),
      allow_cost_regression: exports_external.boolean().default(false),
      allow_latency_regression: exports_external.boolean().default(false)
    }).default({}),
    champion_frozen: exports_external.array(exports_external.string()).default([])
  });
});
// ../../../crew/node_modules/@astragenie/gepa-core/dist/types/index.js
var init_types3 = __esm(() => {
  init_trial();
  init_score_result();
  init_eval_case();
  init_crew_artifact();
  init_agent_run();
  init_candidate();
  init_gepa_config();
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/store/file-store.js
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join as join4 } from "path";
function jsonlPathFor(root, agent) {
  if (!existsSync(root))
    mkdirSync(root, { recursive: true });
  return join4(root, `${agent}.jsonl`);
}
async function readJsonlSafe(path44) {
  const { records } = await readSafe(path44, (raw) => TrialSchema.parse(JSON.parse(raw)));
  return records;
}
function matches(trial2, filter) {
  if (filter.agent && trial2.agent !== filter.agent)
    return false;
  if (filter.phase && trial2.phase !== filter.phase)
    return false;
  if (filter.source && trial2.source !== filter.source)
    return false;
  if (filter.minScore !== undefined && trial2.score.score < filter.minScore)
    return false;
  if (filter.failuresOnly && trial2.score.pass)
    return false;
  if (filter.since && trial2.created_at < filter.since)
    return false;
  return true;
}
function fileStore(root) {
  return {
    async put(trial2) {
      const parsed = TrialSchema.safeParse(trial2);
      if (!parsed.success) {
        return err(new DeterministicError("Invalid trial: failed schema validation", {
          code: "E_TRIAL_SCHEMA",
          cause: parsed.error
        }));
      }
      const validated = parsed.data;
      await append(jsonlPathFor(root, validated.agent), validated);
      return ok(validated);
    },
    async recall(filter) {
      if (!existsSync(root))
        return [];
      const files = new Set;
      if (filter.agent) {
        files.add(jsonlPathFor(root, filter.agent));
      } else {
        for (const entry of readdirSync(root)) {
          if (entry.endsWith(".jsonl"))
            files.add(join4(root, entry));
        }
      }
      const trials = [];
      for (const p of files)
        trials.push(...await readJsonlSafe(p));
      const filtered = trials.filter((t) => matches(t, filter));
      filtered.sort((a, b) => a.created_at < b.created_at ? 1 : -1);
      return filter.limit ? filtered.slice(0, filter.limit) : filtered;
    },
    async invalidate(filter) {
      if (!existsSync(root))
        return 0;
      const files = readdirSync(root).filter((f) => f.endsWith(".jsonl")).map((f) => join4(root, f));
      let purgeCount = 0;
      for (const p of files) {
        const trials = await readJsonlSafe(p);
        const kept = trials.filter((t) => {
          if (filter.trial_ids?.includes(t.id)) {
            purgeCount++;
            return false;
          }
          if (filter.agent && t.agent === filter.agent) {
            purgeCount++;
            return false;
          }
          if (filter.since && t.created_at >= filter.since) {
            purgeCount++;
            return false;
          }
          return true;
        });
        const out = kept.map((t) => `${JSON.stringify(t)}
`).join("");
        writeFileSync(p, out);
      }
      return purgeCount;
    }
  };
}
var init_file_store = __esm(() => {
  init_dist2();
  init_trial();
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/validators/candidate-size.js
var init_candidate_size = () => {};

// ../../../crew/node_modules/@astragenie/gepa-core/dist/runner/sequential-runner.js
var init_sequential_runner = __esm(() => {
  init_trial();
  init_candidate_size();
});
// ../../../crew/node_modules/@astragenie/gepa-core/dist/budget/daily-cap-meter.js
var StateSchema;
var init_daily_cap_meter = __esm(() => {
  init_zod();
  StateSchema = exports_external.object({
    day: exports_external.string(),
    spent: exports_external.number().nonnegative(),
    reservations: exports_external.array(exports_external.object({
      id: exports_external.string(),
      amount: exports_external.number().nonnegative(),
      expiresAt: exports_external.number()
    }))
  });
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/lock/file-lock-manager.js
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, rmSync, writeFileSync as writeFileSync2 } from "fs";
import { join as join5 } from "path";
function lockPath(locksDir, agent, op) {
  const safeAgent = agent.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join5(locksDir, `${safeAgent}__${op}.lock`);
}
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function isLockStale(payload) {
  const heartbeatAge = Date.now() - payload.heartbeat;
  if (heartbeatAge > HEARTBEAT_STALE_MS)
    return true;
  if (!isPidAlive(payload.pid))
    return true;
  return false;
}
function tryAtomicWrite(path44, payload) {
  try {
    writeFileSync2(path44, JSON.stringify(payload), { flag: "wx" });
    return true;
  } catch (error) {
    if (error instanceof Error && error.code === "EEXIST") {
      return false;
    }
    throw new TransientError("Failed to acquire lock: unexpected filesystem error", {
      code: "E_LOCK_WRITE",
      cause: error
    });
  }
}
function fileLockManager(locksDir) {
  if (!existsSync2(locksDir)) {
    mkdirSync2(locksDir, { recursive: true });
  }
  return {
    async acquire(agent, op) {
      const path44 = lockPath(locksDir, agent, op);
      if (existsSync2(path44)) {
        let payload2 = null;
        try {
          const parsed = LockPayloadSchema.safeParse(JSON.parse(readFileSync2(path44, "utf8")));
          if (parsed.success) {
            payload2 = parsed.data;
          } else {
            rmSync(path44, { force: true });
          }
        } catch {
          rmSync(path44, { force: true });
        }
        if (payload2 !== null) {
          if (isLockStale(payload2)) {
            rmSync(path44, { force: true });
          } else {
            return ok(null);
          }
        }
      }
      const now = Date.now();
      const payload = {
        pid: process.pid,
        op,
        agent,
        heartbeat: now
      };
      const wrote = tryAtomicWrite(path44, payload);
      if (!wrote) {
        return ok(null);
      }
      const heartbeatInterval = setInterval(() => {
        if (!existsSync2(path44)) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          const updated = { ...payload, heartbeat: Date.now() };
          writeFileSync2(path44, JSON.stringify(updated));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      heartbeatInterval.unref();
      return ok({
        released: async () => {
          clearInterval(heartbeatInterval);
          rmSync(path44, { force: true });
        }
      });
    },
    async isLocked(agent) {
      for (const op of ["eval", "optimize"]) {
        const path44 = lockPath(locksDir, agent, op);
        if (!existsSync2(path44))
          continue;
        let payload = null;
        try {
          const parsed = LockPayloadSchema.safeParse(JSON.parse(readFileSync2(path44, "utf8")));
          if (parsed.success) {
            payload = parsed.data;
          } else {
            continue;
          }
        } catch {
          continue;
        }
        if (!isLockStale(payload))
          return true;
      }
      return false;
    }
  };
}
var HEARTBEAT_STALE_MS = 60000, LockPayloadSchema;
var init_file_lock_manager = __esm(() => {
  init_dist2();
  init_zod();
  LockPayloadSchema = exports_external.object({
    pid: exports_external.number().int().positive(),
    op: exports_external.enum(["eval", "optimize"]),
    agent: exports_external.string(),
    heartbeat: exports_external.number().nonnegative()
  });
});
// ../../../crew/node_modules/@astragenie/gepa-core/dist/validators/validate-trial-corpus.js
class TrialTally {
  tornLines = 0;
  trialIdCounts = new Map;
  agentCounts = new Map;
  missingMetricIds = [];
  add(trial2) {
    this.trialIdCounts.set(trial2.id, (this.trialIdCounts.get(trial2.id) ?? 0) + 1);
    this.agentCounts.set(trial2.agent, (this.agentCounts.get(trial2.agent) ?? 0) + 1);
    if (typeof trial2.score.cost_usd !== "number" || typeof trial2.score.latency_ms !== "number") {
      this.missingMetricIds.push(trial2.id);
    }
  }
  report(knownAgents) {
    const collidingTrialIds = [];
    for (const [id, count] of this.trialIdCounts) {
      if (count > 1)
        collidingTrialIds.push(id);
    }
    let orphanAgentRefs = 0;
    if (knownAgents) {
      for (const agent of this.agentCounts.keys()) {
        if (!knownAgents.has(agent))
          orphanAgentRefs++;
      }
    } else {
      for (const [, count] of this.agentCounts) {
        if (count === 1)
          orphanAgentRefs++;
      }
    }
    const collisions = collidingTrialIds.length;
    const missingMetrics = this.missingMetricIds.length;
    return {
      ok: this.tornLines === 0 && collisions === 0 && missingMetrics === 0 && orphanAgentRefs === 0,
      tornLines: this.tornLines,
      orphanAgentRefs,
      collisions,
      missingMetrics,
      agentsSeen: [...this.agentCounts.keys()].sort(),
      collidingTrialIds,
      trialIdsMissingMetrics: this.missingMetricIds
    };
  }
}
var init_validate_trial_corpus = __esm(() => {
  init_trial();
});
// ../../../crew/node_modules/@astragenie/gepa-core/dist/providers/redact-rationale.js
var init_redact_rationale = () => {};

// ../../../crew/node_modules/@astragenie/gepa-core/dist/providers/load-rubric.js
var init_load_rubric = () => {};

// ../../../crew/node_modules/@astragenie/gepa-core/dist/algorithms/soak-monitor.js
var SOAK_ROLLING_WINDOW_MS;
var init_soak_monitor = __esm(() => {
  SOAK_ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
});

// ../../../crew/node_modules/@astragenie/gepa-core/dist/algorithms/promotion-gate.js
var init_promotion_gate = () => {};

// ../../../crew/node_modules/@astragenie/gepa-core/dist/index.js
var init_dist5 = __esm(() => {
  init_file_store();
  init_sequential_runner();
  init_daily_cap_meter();
  init_file_lock_manager();
  init_candidate_size();
  init_validate_trial_corpus();
  init_redact_rationale();
  init_load_rubric();
  init_soak_monitor();
  init_promotion_gate();
  init_types3();
});

// crew/scripts/lib/gepa/history.mts
var exports_history = {};
__export(exports_history, {
  runGepaHistoryCmd: () => runGepaHistoryCmd
});
import { join as join6 } from "path";
async function runGepaHistoryCmd(repoPath, args) {
  const agent = args[0];
  if (!agent || agent.startsWith("--")) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `usage: gepa-history <agent> [--source eval|captured|soak] [--limit N]
`
    };
  }
  let source;
  let limit = 10;
  for (let i = 1;i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) {
      source = args[i + 1];
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(limit) || limit <= 0) {
        return { exitCode: 2, stdout: "", stderr: `invalid --limit
` };
      }
      i++;
    }
  }
  const storeRoot = join6(repoPath, ".claude/artifacts/crew/gepa/trials");
  const store = fileStore(storeRoot);
  const trials = await store.recall({
    agent,
    limit,
    ...source !== undefined ? { source } : {}
  });
  const rows = trials.map((t) => [
    t.id,
    t.source,
    String(t.score.pass),
    t.score.score.toFixed(3),
    t.score.cost_usd.toFixed(4),
    String(t.score.latency_ms),
    t.created_at
  ].join(" | "));
  return { exitCode: 0, stdout: `${rows.join(`
`)}
`, stderr: "" };
}
var init_history = __esm(() => {
  init_dist5();
});

// crew/scripts/lib/gepa/run-with-lock.mts
import path44 from "path";
async function runWithLock(opts, fn) {
  const manager = fileLockManager(opts.lockRoot ?? DEFAULT_LOCK_ROOT);
  const acquired = await manager.acquire(opts.agent, opts.phase);
  const handle = acquired.ok ? acquired.value : null;
  if (!handle) {
    return {
      status: "lock_held",
      agent: opts.agent,
      phase: opts.phase
    };
  }
  try {
    const result2 = await fn();
    return { status: "ok", result: result2 };
  } catch (error) {
    return { status: "error", error };
  } finally {
    await handle.released();
  }
}
var DEFAULT_LOCK_ROOT;
var init_run_with_lock = __esm(() => {
  init_dist5();
  DEFAULT_LOCK_ROOT = path44.join(".claude", "artifacts", "crew", "gepa", "locks");
});

// crew/scripts/lib/gepa/eval.mts
var exports_eval = {};
__export(exports_eval, {
  runGepaEvalCmd: () => runGepaEvalCmd,
  parseEvalArgs: () => parseEvalArgs
});
import { spawn as spawn2 } from "child_process";
import { join as join7 } from "path";
function readValueFlag(args, i) {
  const next = args[i + 1];
  if (!next || next.startsWith("--"))
    return null;
  return next;
}
function parseEvalArgs(args) {
  const parsed = { live: false, validate: false };
  let i = 0;
  while (i < args.length) {
    const arg = args[i] ?? "";
    const valueFlag = VALUE_FLAGS.find((v) => v.flag === arg);
    if (valueFlag) {
      const value = readValueFlag(args, i);
      if (value === null) {
        parsed.invalid = valueFlag.errorMessage;
        return parsed;
      }
      valueFlag.apply(parsed, value);
      i += 2;
      continue;
    }
    if (arg === "--live")
      parsed.live = true;
    else if (arg === "--validate")
      parsed.validate = true;
    else if (!arg.startsWith("--") && !parsed.agent)
      parsed.agent = arg;
    i += 1;
  }
  return parsed;
}
async function runGepaEvalCmd(repoPath, args) {
  const parsed = parseEvalArgs(args);
  if (parsed.invalid) {
    return { exitCode: 2, stdout: "", stderr: `${parsed.invalid}
` };
  }
  if (!parsed.agent) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `usage: gepa-eval <agent> [--live] [--judge <name>] [--validate] [--split N/M]
`
    };
  }
  const lockRoot = join7(repoPath, ".claude", "artifacts", "crew", "gepa", "locks");
  const outcome = await runWithLock({ agent: parsed.agent, phase: "eval", lockRoot }, async () => spawnEvals(repoPath, parsed));
  if (outcome.status === "lock_held") {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `lock_held_by_other_process: agent=${outcome.agent} phase=${outcome.phase}
`
    };
  }
  if (outcome.status === "error") {
    const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
    return { exitCode: 1, stdout: "", stderr: `${message}
` };
  }
  return outcome.result;
}
async function spawnEvals(repoPath, parsed) {
  const childArgs = ["run", "evals", "--prompt", parsed.agent ?? ""];
  if (parsed.live)
    childArgs.push("--live");
  else
    childArgs.push("--dry-run");
  if (parsed.judge)
    childArgs.push("--judge", parsed.judge);
  if (parsed.validate)
    childArgs.push("--validate");
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn2("bun", childArgs, { cwd: repoPath, shell: process.platform === "win32" });
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err2) => {
      resolve({ exitCode: 1, stdout, stderr: `${stderr}${err2.message}
` });
    });
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
var VALUE_FLAGS;
var init_eval = __esm(() => {
  init_run_with_lock();
  VALUE_FLAGS = [
    {
      flag: "--judge",
      errorMessage: "--judge requires a value",
      apply: (parsed, value) => {
        parsed.judge = value;
      }
    },
    {
      flag: "--split",
      errorMessage: "--split requires N/M",
      apply: (parsed, value) => {
        parsed.split = value;
      }
    }
  ];
});

// crew/scripts/lib/gepa/no-winner-streak-tracker.mts
import { existsSync as existsSync3, mkdirSync as mkdirSync3, renameSync, writeFileSync as writeFileSync3 } from "fs";
import { readFileSync as readFileSync3 } from "fs";
import { dirname as dirname4, join as join8 } from "path";
function defaultStreakPath(repoPath) {
  return join8(repoPath, ".claude", "artifacts", "crew", "gepa", "no-winner-streak.json");
}
function loadStreak(path45) {
  if (!existsSync3(path45))
    return {};
  try {
    const raw = readFileSync3(path45, "utf8");
    const parsed = StreakStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
function atomicWriteStreak(path45, state) {
  const dir = dirname4(path45);
  if (!existsSync3(dir)) {
    mkdirSync3(dir, { recursive: true });
  }
  const tmp = `${path45}.tmp.${process.pid}`;
  writeFileSync3(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, path45);
}
function resetStreak(agent, opts) {
  const path45 = opts.streakPath ?? defaultStreakPath(opts.repoPath);
  const state = loadStreak(path45);
  state[agent] = 0;
  atomicWriteStreak(path45, state);
}
var StreakStateSchema;
var init_no_winner_streak_tracker = __esm(() => {
  init_zod();
  StreakStateSchema = exports_external.record(exports_external.string(), exports_external.number().int().nonnegative());
});

// crew/scripts/lib/gepa/observability-events.mts
import { appendFileSync, existsSync as existsSync4, mkdirSync as mkdirSync4, readFileSync as readFileSync4 } from "fs";
import { join as join9 } from "path";
function eventsLogPath(repoPath) {
  return join9(repoPath, EVENTS_LOG_REL);
}
function isDuplicate(logPath, eventId) {
  if (!existsSync4(logPath))
    return false;
  try {
    const content = readFileSync4(logPath, "utf8");
    return content.includes(JSON.stringify(eventId));
  } catch {
    return false;
  }
}
function emitGepaEvent(repoPath, payload) {
  try {
    const logPath = eventsLogPath(repoPath);
    if (payload.event_id !== undefined && isDuplicate(logPath, payload.event_id)) {
      return;
    }
    const dir = join9(repoPath, ".claude", "logs");
    if (!existsSync4(dir))
      mkdirSync4(dir, { recursive: true });
    const line = `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}
`;
    appendFileSync(logPath, line, { flag: "a" });
  } catch {}
}
function emitSoakRevertEvent(repoPath, fields) {
  emitGepaEvent(repoPath, { event: "gepa_soak_revert", ...fields });
}
var EVENTS_LOG_REL = ".claude/logs/events.jsonl";
var init_observability_events = () => {};

// crew/scripts/lib/gepa/gepa-killswitch-cmds.mts
var exports_gepa_killswitch_cmds = {};
__export(exports_gepa_killswitch_cmds, {
  runGepaThawCmd: () => runGepaThawCmd,
  runGepaRevertCmd: () => runGepaRevertCmd,
  runGepaResumeCmdExtended: () => runGepaResumeCmdExtended,
  runGepaInvalidateCmd: () => runGepaInvalidateCmd
});
import { existsSync as existsSync5, readFileSync as readFileSync5, renameSync as renameSync2, writeFileSync as writeFileSync4 } from "fs";
import { join as join10 } from "path";
import { spawnSync as spawnSync2 } from "child_process";
function trialsRoot(repoPath) {
  return join10(repoPath, ".claude", "artifacts", "crew", "gepa", "trials");
}
function configPath(repoPath) {
  return join10(repoPath, "gepa.config.json");
}
function soakJsonPath(repoPath) {
  return join10(repoPath, ".claude", "artifacts", "crew", "gepa", "soak.json");
}
function runGit3(gitPath, args, cwd) {
  const r = spawnSync2(gitPath, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: process.env
  });
  if (r.error)
    throw r.error;
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    status: r.status ?? 1
  };
}
function readGepafrontmatter(agentPath) {
  if (!existsSync5(agentPath))
    return null;
  const content = readFileSync5(agentPath, "utf8");
  const lines = content.split(`
`);
  if (lines[0]?.trimEnd() !== "---")
    return null;
  if (!lines[1]?.trimStart().startsWith("gepa:"))
    return null;
  const fields = {};
  for (let i = 2;i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trimEnd() === "---")
      break;
    const m = line.match(/^\s+(\w+):\s*(.+)$/);
    if (m?.[1] && m?.[2]) {
      fields[m[1]] = m[2].trim();
    }
  }
  return fields;
}
function findPromotionCommit(gitPath, cwd, agentFile) {
  const logResult = runGit3(gitPath, ["log", "--format=%H", "--", agentFile], cwd);
  if (!logResult.ok || !logResult.stdout.trim())
    return null;
  const commits = logResult.stdout.trim().split(`
`).map((s) => s.trim()).filter((s) => s.length > 0);
  for (const sha of commits) {
    const msgResult = runGit3(gitPath, ["log", "--format=%s", "-1", sha], cwd);
    if (msgResult.ok && msgResult.stdout.trim().startsWith("chore(gepa): promote")) {
      return sha;
    }
  }
  return null;
}
function parseInvalidateArgs(args) {
  const parsed = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i] ?? "";
    if (arg === "--agent") {
      parsed.agent = args[i + 1];
      i += 2;
    } else if (arg === "--since") {
      parsed.since = args[i + 1];
      i += 2;
    } else if (arg === "--tag") {
      parsed.tag = args[i + 1];
      i += 2;
    } else if (!arg.startsWith("--") && !parsed.agent) {
      parsed.agent = arg;
      i++;
    } else {
      i++;
    }
  }
  return parsed;
}
async function runGepaInvalidateCmd(repoPath, args) {
  const { agent, since, tag } = parseInvalidateArgs(args);
  if (!agent) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `usage: gepa-invalidate --agent <name> [--since <iso>] [--tag <tag>] [--repo <path>]
`
    };
  }
  const store = fileStore(trialsRoot(repoPath));
  let count = 0;
  if (since !== undefined || tag !== undefined) {
    const trials = await store.recall({ agent });
    const sinceMs = since !== undefined ? Date.parse(since) : Number.NEGATIVE_INFINITY;
    const targetIds = trials.filter((t) => since === undefined ? true : Date.parse(t.created_at) >= sinceMs).filter((t) => {
      if (tag === undefined)
        return true;
      const tags = t.tags ?? [];
      return tags.includes(tag);
    }).map((t) => t.id);
    if (targetIds.length > 0) {
      count = await store.invalidate({ trial_ids: targetIds });
    }
  } else {
    count = await store.invalidate({ agent });
  }
  emitGepaEvent(repoPath, {
    event: "gepa_invalidate",
    agent,
    since: since ?? null,
    tag: tag ?? null,
    invalidated_count: count,
    invalidated_by_pid: process.pid,
    invalidated_at: new Date().toISOString(),
    reason: `manual kill-switch via gepa-invalidate`
  });
  const sinceLabel = since ? ` since ${since}` : "";
  const tagLabel = tag ? ` tag=${tag}` : "";
  return {
    exitCode: 0,
    stdout: `invalidated ${count} trials for ${agent}${sinceLabel}${tagLabel}
`,
    stderr: ""
  };
}
function removeSoakPointer(repoPath, agent) {
  const soakPath = soakJsonPath(repoPath);
  if (!existsSync5(soakPath))
    return;
  try {
    const raw = readFileSync5(soakPath, "utf8");
    const soakMap = JSON.parse(raw);
    if (!(agent in soakMap))
      return;
    delete soakMap[agent];
    const tmp = `${soakPath}.tmp.${process.pid}`;
    writeFileSync4(tmp, JSON.stringify(soakMap, null, 2), "utf8");
    renameSync2(tmp, soakPath);
  } catch {}
}
function applyGitRevert(repoPath, gitPath, agent, promotionSha, frontmatter2) {
  const revertResult = runGit3(gitPath, ["revert", "--no-edit", promotionSha], repoPath);
  if (!revertResult.ok) {
    emitSoakRevertEvent(repoPath, {
      agent,
      reason: `git revert failed: ${revertResult.stderr.trim()}`
    });
    return {
      exitCode: 1,
      stdout: "",
      stderr: `gepa-revert: git revert failed (possible merge conflict).
` + `Resolve manually:
  git revert --no-edit ${promotionSha}

` + `Stderr: ${revertResult.stderr.trim()}
`
    };
  }
  const headResult = runGit3(gitPath, ["rev-parse", "HEAD"], repoPath);
  const revertCommitSha = headResult.ok ? headResult.stdout.trim() : undefined;
  emitSoakRevertEvent(repoPath, {
    agent,
    reason: `manual kill-switch: gepa-revert reverted promotion commit ${promotionSha}`,
    ...revertCommitSha !== undefined ? { revert_commit: revertCommitSha } : {},
    ...frontmatter2?.champion_from_trial ? { trial_id: frontmatter2.champion_from_trial } : {}
  });
  const suffix = revertCommitSha ? ` \u2192 ${revertCommitSha}` : "";
  return {
    exitCode: 0,
    stdout: `gepa-revert: soak pointer removed for ${agent}
` + `gepa-revert: reverted promotion commit ${promotionSha}${suffix}
` + `gepa-revert: event gepa_soak_revert logged
`,
    stderr: ""
  };
}
async function runGepaRevertCmd(repoPath, args, opts = {}) {
  let agent;
  let gitPath = opts.gitPath ?? "git";
  let i = 0;
  while (i < args.length) {
    const arg = args[i] ?? "";
    if (arg === "--agent") {
      agent = args[i + 1];
      i += 2;
    } else if (arg === "--git") {
      gitPath = args[i + 1] ?? "git";
      i += 2;
    } else if (!arg.startsWith("--") && !agent) {
      agent = arg;
      i++;
    } else {
      i++;
    }
  }
  if (!agent) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `usage: gepa-revert --agent <name> [--repo <path>]
`
    };
  }
  const agentFile = `agents/${agent}.md`;
  const agentPath = join10(repoPath, agentFile);
  removeSoakPointer(repoPath, agent);
  const frontmatter2 = readGepafrontmatter(agentPath);
  const promotionSha = findPromotionCommit(gitPath, repoPath, agentFile);
  if (!promotionSha) {
    emitSoakRevertEvent(repoPath, {
      agent,
      reason: "no promotion commit found \u2014 soak pointer removed, no git revert needed"
    });
    return {
      exitCode: 0,
      stdout: `gepa-revert: soak pointer removed for ${agent}; no promotion commit found \u2014 no git revert needed
`,
      stderr: ""
    };
  }
  return applyGitRevert(repoPath, gitPath, agent, promotionSha, frontmatter2);
}
async function runGepaThawCmd(repoPath, positionals) {
  const agent = positionals[0];
  if (!agent || agent.startsWith("--")) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `usage: gepa-thaw <agent> [--repo <path>]
`
    };
  }
  const cfgPath = configPath(repoPath);
  if (!existsSync5(cfgPath)) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `gepa-thaw: gepa.config.json not found at ${cfgPath}
`
    };
  }
  let config;
  try {
    config = JSON.parse(readFileSync5(cfgPath, "utf8"));
  } catch (e) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `gepa-thaw: failed to parse gepa.config.json: ${e instanceof Error ? e.message : String(e)}
`
    };
  }
  const frozen = Array.isArray(config.champion_frozen) ? config.champion_frozen : [];
  if (!frozen.includes(agent)) {
    return {
      exitCode: 0,
      stdout: `gepa-thaw: ${agent} is not in champion_frozen \u2014 nothing to do
`,
      stderr: ""
    };
  }
  const newFrozen = frozen.filter((a) => a !== agent);
  const updated = { ...config, champion_frozen: newFrozen };
  const tmp = `${cfgPath}.tmp.${process.pid}`;
  writeFileSync4(tmp, JSON.stringify(updated, null, 2) + `
`, "utf8");
  renameSync2(tmp, cfgPath);
  emitGepaEvent(repoPath, {
    event: "gepa_thaw",
    agent,
    champion_frozen_before: frozen,
    champion_frozen_after: newFrozen,
    thawed_at: new Date().toISOString()
  });
  return {
    exitCode: 0,
    stdout: `gepa-thaw: removed ${agent} from champion_frozen (was: [${frozen.join(", ")}], now: [${newFrozen.join(", ")}])
`,
    stderr: ""
  };
}
async function runGepaResumeCmdExtended(repoPath, positionals) {
  const agent = positionals[0];
  if (agent && !agent.startsWith("--")) {
    resetStreak(agent, { repoPath });
    emitGepaEvent(repoPath, {
      event: "gepa_resume",
      agent,
      resumed_at: new Date().toISOString()
    });
    return {
      exitCode: 0,
      stdout: `gepa-resume: streak cleared for agent ${agent}
`,
      stderr: ""
    };
  }
  const cfgPath = configPath(repoPath);
  if (!existsSync5(cfgPath)) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `gepa-resume: gepa.config.json not found at ${cfgPath} \u2014 cannot clear global pause
`
    };
  }
  let config;
  try {
    config = JSON.parse(readFileSync5(cfgPath, "utf8"));
  } catch (e) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `gepa-resume: failed to parse gepa.config.json: ${e instanceof Error ? e.message : String(e)}
`
    };
  }
  const optimize = config.optimize ?? {};
  const wasPaused = optimize.paused === true;
  const updated = {
    ...config,
    optimize: { ...optimize, paused: false }
  };
  const tmp = `${cfgPath}.tmp.${process.pid}`;
  writeFileSync4(tmp, JSON.stringify(updated, null, 2) + `
`, "utf8");
  renameSync2(tmp, cfgPath);
  emitGepaEvent(repoPath, {
    event: "gepa_resume",
    global: true,
    was_paused: wasPaused,
    resumed_at: new Date().toISOString()
  });
  return {
    exitCode: 0,
    stdout: `gepa-resume: global optimize.paused cleared (was: ${wasPaused})
`,
    stderr: ""
  };
}
var init_gepa_killswitch_cmds = __esm(() => {
  init_dist5();
  init_no_winner_streak_tracker();
  init_observability_events();
});

// crew/scripts/lib/memory/injected-atoms.mts
var exports_injected_atoms = {};
__export(exports_injected_atoms, {
  writeInjectedAtoms: () => writeInjectedAtoms,
  readInjectedAtoms: () => readInjectedAtoms
});
import { mkdir as mkdir4, readFile as readFile2, writeFile } from "fs/promises";
import path45 from "path";
function sidecarPath(repoPath, runId) {
  const safe = runId.replace(/[^A-Za-z0-9._-]/g, "_");
  return path45.join(repoPath, ".claude", "state", "crew", "injected-atoms", `${safe}.json`);
}
async function writeInjectedAtoms(repoPath, runId, ids) {
  try {
    const target = sidecarPath(repoPath, runId);
    await mkdir4(path45.dirname(target), { recursive: true });
    const existing = await readInjectedAtoms(repoPath, runId);
    const merged = Array.from(new Set([...existing, ...ids]));
    await writeFile(target, JSON.stringify({ runId, ids: merged }), "utf8");
  } catch {}
}
async function readInjectedAtoms(repoPath, runId) {
  try {
    const parsed = JSON.parse(await readFile2(sidecarPath(repoPath, runId), "utf8"));
    return Array.isArray(parsed.ids) ? parsed.ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
var init_injected_atoms = () => {};

// crew/scripts/lib/memory/profile-feedback.mts
var exports_profile_feedback = {};
__export(exports_profile_feedback, {
  submitOutcomeFeedback: () => submitOutcomeFeedback
});
function feedbackEnabled(rawConfig) {
  if (typeof rawConfig !== "object" || rawConfig === null)
    return false;
  const f = rawConfig.feedback;
  return typeof f === "object" && f !== null && f.enabled === true;
}
async function submitOutcomeFeedback(opts) {
  const credited = [];
  try {
    if (opts.outcome !== "pass")
      return { credited };
    const { loadMemoryConfig: loadMemoryConfig2 } = await Promise.resolve().then(() => (init_inject_recall(), exports_inject_recall));
    const rawConfig = opts.rawConfig !== undefined ? opts.rawConfig : await loadMemoryConfig2(opts.repoPath);
    if (!feedbackEnabled(rawConfig))
      return { credited };
    let provider = opts.provider;
    if (!provider) {
      const { resolveProvider: resolveProvider2 } = await Promise.resolve().then(() => (init_dist4(), exports_dist));
      provider = resolveProvider2(rawConfig, opts.repoPath);
    }
    if (typeof provider.feedback !== "function")
      return { credited };
    const ids = await readInjectedAtoms(opts.repoPath, opts.runId);
    for (const id of ids) {
      try {
        const ok3 = await provider.feedback(id, { used: true });
        if (ok3)
          credited.push(id);
      } catch {}
    }
    return { credited };
  } catch {
    return { credited };
  }
}
var init_profile_feedback = __esm(() => {
  init_injected_atoms();
});

// crew/scripts/lib/memory/drift-check.mts
var exports_drift_check = {};
__export(exports_drift_check, {
  runDriftCheckCli: () => runDriftCheckCli,
  parseDriftCheckArgs: () => parseDriftCheckArgs,
  checkDrift: () => checkDrift
});
import { appendFileSync as appendFileSync2, mkdirSync as mkdirSync5 } from "fs";
import path46 from "path";
async function readEntriesInWindow(repoPath, windowDays, now) {
  const targetPath = path46.join(repoPath, ...LEARNINGS_PATH);
  const raw = await tailReadJsonl2(targetPath, FULL_STORE_RECORD_CAP2, {
    maxBytes: FULL_STORE_MAX_BYTES2
  });
  const cutoff = now - windowDays * MS_PER_DAY2;
  const entries = [];
  raw.forEach((row, index) => {
    const normalized = normalizeLegacyRow(row, index);
    if (normalized && Date.parse(normalized.ts) >= cutoff)
      entries.push(normalized);
  });
  return entries;
}
async function isPresentInAstramem(remote, entry) {
  try {
    const res = await remote.provider.recall({ query: entry.summary, k: PRESENCE_CHECK_K });
    return res.hits.some((hit) => hit.id === entry.id);
  } catch {
    return false;
  }
}
async function checkDrift(repoPath, remote, options = {}) {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const now = (options.now ?? new Date).getTime();
  const entries = await readEntriesInWindow(repoPath, windowDays, now);
  const missingFromAstramem = [];
  for (const entry of entries) {
    const present = await isPresentInAstramem(remote, entry);
    if (!present)
      missingFromAstramem.push(entry);
  }
  return { windowDays, checked: entries.length, missingFromAstramem };
}
function parseThreshold(raw) {
  const parsed = raw !== undefined ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--threshold must be a non-negative number, got: ${String(raw)}`);
  }
  return parsed;
}
function parseWindowDays(raw) {
  const parsed = raw !== undefined ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--window-days must be a positive number, got: ${String(raw)}`);
  }
  return parsed;
}
function parseDriftCheckArgs(argv) {
  let repo = process.cwd();
  let threshold = 0;
  let windowDays;
  for (let i = 0;i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--repo") {
      repo = argv[++i] ?? repo;
    } else if (a === "--threshold") {
      threshold = parseThreshold(argv[++i]);
    } else if (a === "--window-days") {
      windowDays = parseWindowDays(argv[++i]);
    }
  }
  return { repo, threshold, ...windowDays !== undefined ? { windowDays } : {} };
}
function emitDriftEvent(repoPath, report, threshold) {
  try {
    const logPath = path46.join(repoPath, ...EVENTS_LOG_REL2);
    mkdirSync5(path46.dirname(logPath), { recursive: true });
    const line = `${JSON.stringify({
      ts: new Date().toISOString(),
      event: "memory_drift",
      windowDays: report.windowDays,
      threshold,
      checked: report.checked,
      count: report.missingFromAstramem.length,
      ids: report.missingFromAstramem.map((entry) => entry.id)
    })}
`;
    appendFileSync2(logPath, line, { flag: "a" });
  } catch {}
}
async function runDriftCheckCli(argv, overrides = {}) {
  const { repo, threshold, windowDays } = parseDriftCheckArgs(argv);
  const resolveRemote = overrides.__resolveRemote ?? resolveAstramemRemote;
  const remote = await resolveRemote();
  if (!remote) {
    return {
      report: null,
      threshold,
      exitCode: 2,
      reason: "astramem is not paired/reachable \u2014 drift cannot be verified this run"
    };
  }
  const report = await checkDrift(repo, remote, windowDays !== undefined ? { windowDays } : {});
  const driftCount = report.missingFromAstramem.length;
  if (driftCount > threshold) {
    emitDriftEvent(repo, report, threshold);
    return { report, threshold, exitCode: 1 };
  }
  return { report, threshold, exitCode: 0 };
}
var EVENTS_LOG_REL2, DEFAULT_WINDOW_DAYS = 45, MS_PER_DAY2, FULL_STORE_MAX_BYTES2, FULL_STORE_RECORD_CAP2, PRESENCE_CHECK_K = 10, isMain;
var init_drift_check = __esm(async () => {
  init_jsonl3();
  init_dist4();
  init_capture_learning();
  EVENTS_LOG_REL2 = [".claude", "logs", "events.jsonl"];
  MS_PER_DAY2 = 24 * 60 * 60 * 1000;
  FULL_STORE_MAX_BYTES2 = 16 * 1024 * 1024;
  FULL_STORE_RECORD_CAP2 = Number.MAX_SAFE_INTEGER;
  isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("drift-check.ts");
  if (isMain) {
    const { report, threshold, exitCode, reason } = await runDriftCheckCli(process.argv.slice(2));
    if (reason) {
      process.stdout.write(`memory-drift-check: ${reason}
`);
    } else if (report) {
      const driftCount = report.missingFromAstramem.length;
      process.stdout.write(`memory-drift-check: checked ${report.checked} entr${report.checked === 1 ? "y" : "ies"} ` + `in the last ${report.windowDays}d window; ${driftCount} missing from astramem ` + `(threshold: ${threshold})
`);
      if (driftCount > 0) {
        for (const entry of report.missingFromAstramem) {
          process.stdout.write(`  - ${entry.id}: ${entry.summary}
`);
        }
      }
    }
    process.exit(exitCode);
  }
});

// crew/scripts/lib/models/resolve-model.mts
var exports_resolve_model = {};
__export(exports_resolve_model, {
  resolveShapeTier: () => resolveShapeTier,
  resolveModelForPhase: () => resolveModelForPhase,
  resolveDispatchModel: () => resolveDispatchModel,
  isModelRoutingEnabledInConfig: () => isModelRoutingEnabledInConfig,
  TRIVIAL_SHAPE_TIER: () => TRIVIAL_SHAPE_TIER
});
function isModelRoutingEnabledInConfig(config) {
  return config?.loop?.modelRouting?.["enabled"] !== false;
}
function resolveShapeTier(shape) {
  if (!shape)
    return null;
  return TRIVIAL_SHAPE_TIER[shape] ?? null;
}
function resolveModelForPhase(phase, config) {
  const routing = config?.loop?.modelRouting;
  if (!routing)
    return FALLBACK_MODEL;
  const phaseTier = routing[phase];
  const defaultTier = routing["default"];
  return (typeof phaseTier === "string" ? phaseTier : null) || (typeof defaultTier === "string" ? defaultTier : null) || FALLBACK_MODEL;
}
function resolveDispatchModel(phase, shape, config, modelRoutingEnabled = true) {
  if (!modelRoutingEnabled)
    return null;
  if (!isModelRoutingEnabledInConfig(config))
    return null;
  return resolveShapeTier(shape) ?? resolveModelForPhase(phase, config);
}
var FALLBACK_MODEL = "opus", TRIVIAL_SHAPE_TIER;
var init_resolve_model = __esm(() => {
  TRIVIAL_SHAPE_TIER = Object.freeze({
    "doc-update": "sonnet",
    "config-tweak": "sonnet",
    "test-only": "sonnet",
    "single-module-edit": "sonnet"
  });
});

// crew/scripts/lib/repair-signature.mts
var exports_repair_signature = {};
__export(exports_repair_signature, {
  normalizeSignature: () => normalizeSignature,
  createRepairSignatureTracker: () => createRepairSignatureTracker
});
function normalizeSignature(failureOutput) {
  if (!failureOutput)
    return "";
  const firstLine = failureOutput.split(`
`).map((line) => line.trim()).find((line) => line.length > 0);
  if (!firstLine)
    return "";
  return firstLine.replace(/[A-Za-z]:[\\/][^\s:]+(:\d+){0,2}|\/[^\s:]+(:\d+){0,2}|\b\d+:\d+(:\d+)?\b/g, "<path>").replace(/\s+/g, " ").trim();
}
function createRepairSignatureTracker(options = {}) {
  const stopAfterRepeats = options.stopAfterRepeats ?? 2;
  let lastSignature = null;
  let consecutiveCount = 0;
  return {
    shouldStop(signature) {
      if (!signature)
        return false;
      consecutiveCount = signature === lastSignature ? consecutiveCount + 1 : 1;
      lastSignature = signature;
      return consecutiveCount >= stopAfterRepeats;
    },
    reset() {
      lastSignature = null;
      consecutiveCount = 0;
    }
  };
}

// crew/scripts/crew.mts
import fs37 from "fs";
import path47 from "path";
import { pathToFileURL as pathToFileURL2 } from "url";

// crew/scripts/lib/cost-hygiene/emit-cost-report.mts
init_dispatch_timing_reader();
import path14 from "path";

// crew/scripts/lib/cost-hygiene/cost-report-guard.mts
import fs2 from "fs/promises";
import path from "path";
var DEFAULT_MAX_WINDOW_HOURS = 24;
function windowHoursBetween(startedAt, completedAt) {
  const ms = Date.parse(completedAt) - Date.parse(startedAt);
  if (Number.isNaN(ms))
    return 0;
  return ms / (1000 * 60 * 60);
}
function resolveRunId(run, startedAt, completedAt) {
  const explicit = run?.["runId"];
  if (typeof explicit === "string" && explicit.length > 0)
    return explicit;
  return `${startedAt}_${completedAt}`;
}
async function findDuplicateRunId(repoPath, runId, usd) {
  const costDir = path.join(repoPath, ".claude", "artifacts", "crew", "cost");
  let files;
  try {
    files = (await fs2.readdir(costDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return false;
  }
  const needleRunId = `run_id: ${JSON.stringify(runId)}`;
  const needleUsd = `usd: ${usd}`;
  for (const f of files) {
    try {
      const content = await fs2.readFile(path.join(costDir, f), "utf8");
      if (content.includes(needleRunId) && content.includes(needleUsd))
        return true;
    } catch {}
  }
  return false;
}
var PRESERVE_CURSOR_BY_REASON = {
  sessions_scanned_zero: false,
  window_too_wide: true,
  "duplicate run_id": false
};
function shouldPreserveCursorForReason(reason) {
  return PRESERVE_CURSOR_BY_REASON[reason] ?? true;
}
async function evaluateCostReportGuard(params) {
  const { repoPath, run, startedAt, completedAt, sessionsScanned, usd, allowWideWindow } = params;
  const maxWindowHours = params.maxWindowHours ?? DEFAULT_MAX_WINDOW_HOURS;
  if (sessionsScanned === 0) {
    return {
      refused: true,
      reason: "sessions_scanned_zero",
      preserveCursor: shouldPreserveCursorForReason("sessions_scanned_zero")
    };
  }
  const windowHours = windowHoursBetween(startedAt, completedAt);
  if (windowHours > maxWindowHours && !allowWideWindow) {
    return {
      refused: true,
      reason: "window_too_wide",
      preserveCursor: shouldPreserveCursorForReason("window_too_wide")
    };
  }
  const runId = resolveRunId(run, startedAt, completedAt);
  if (await findDuplicateRunId(repoPath, runId, usd)) {
    return {
      refused: true,
      reason: "duplicate run_id",
      preserveCursor: shouldPreserveCursorForReason("duplicate run_id")
    };
  }
  return { refused: false, runId };
}

// crew/scripts/lib/cost-hygiene/emit-cost-report.mts
async function collectAgentStatsForRun(repoPath) {
  if (process.env["CREW_COST_REPORT_AGENT_STATS"] === "0")
    return;
  try {
    const { aggregateAgentStats: aggregateAgentStats2 } = await Promise.resolve().then(() => (init_agent_stats_aggregator(), exports_agent_stats_aggregator));
    const n = Number.parseInt(process.env["CREW_AGENT_STATS_WINDOW"] ?? "10", 10);
    const rows = await aggregateAgentStats2({
      repo: repoPath,
      window: { kind: "last_n_slices", n: Number.isFinite(n) && n > 0 ? n : 10 }
    });
    return rows.length > 0 ? rows : undefined;
  } catch {
    return;
  }
}
async function collectDispatchBreakdownForRun(repoPath, runId) {
  try {
    const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"] ?? repoPath;
    const dispatchLog = process.env["CREW_DISPATCH_TIMING_LOG"] ?? path14.join(pluginRoot, ".claude", "logs", "dispatch-timing.jsonl");
    const bashLog = process.env["CREW_BASH_GATE_LOG"] ?? path14.join(pluginRoot, ".claude", "logs", "bash-gates.jsonl");
    const resolvedRunId = runId ?? await getLatestRunId(dispatchLog);
    const [dispatch, gates] = await Promise.all([
      resolvedRunId ? aggregateDispatchTiming(dispatchLog, resolvedRunId) : Promise.resolve({ rowCount: 0, totalWallMs: 0, topSlow: [], topTokens: [] }),
      aggregateBashGates(bashLog)
    ]);
    if (dispatch.rowCount === 0 && gates.rowCount === 0)
      return;
    return { dispatch, gates };
  } catch {
    return;
  }
}
async function maybeEmitAggregateCost(opts) {
  const {
    repoPath,
    title,
    startedAt,
    completedAt,
    outcome,
    feature,
    phase,
    writeArtifact: writeArtifact2,
    computeSessionCost: computeSessionCost2
  } = opts;
  const aggregateCost = await computeSessionCost2(repoPath, {
    startedAt,
    completedAt,
    aggregateAll: true
  });
  const sources = aggregateCost["sources"];
  if (!sources || sources.length <= 1)
    return null;
  return writeArtifact2(repoPath, "cost-report-aggregate", {
    title,
    runTitle: title,
    cost: aggregateCost,
    outcome,
    feature,
    phase
  });
}
async function emitCostReportInner(repoPath, runTitle, feature, phase, emitCostAdviseFn, options = {}) {
  const { loadWorkflowState: loadWorkflowState2 } = await Promise.resolve().then(() => (init_workflow_state(), exports_workflow_state));
  const { computeSessionCost: computeCost } = await Promise.resolve().then(() => (init_session_cost(), exports_session_cost));
  const { collectOutcomeLinkage: collectOutcomeLinkage2 } = await Promise.resolve().then(() => (init_outcome_linkage(), exports_outcome_linkage));
  const { writeArtifact: writeArt } = await Promise.resolve().then(() => (init_write(), exports_write));
  const computeSessionCost2 = computeCost;
  const writeArtifact2 = async (rp, kind, fields) => {
    const r = await writeArt(rp, kind, fields);
    if (!r.ok)
      throw r.error;
    return r.value;
  };
  const state = await loadWorkflowState2(repoPath);
  const run = state?.currentRun || null;
  if (!run?.startedAt)
    return null;
  const completedAt = run.completedAt || new Date().toISOString();
  const title = runTitle || run.title || "cost-report";
  const outcome = await collectOutcomeLinkage2(repoPath, title);
  const [sliceCost, dispatchBreakdown, agentStats] = await Promise.all([
    computeSessionCost2(repoPath, {
      startedAt: run.startedAt,
      completedAt,
      aggregateAll: false
    }),
    collectDispatchBreakdownForRun(repoPath, run["runId"]),
    collectAgentStatsForRun(repoPath)
  ]);
  const sessionsScanned = Number(sliceCost["sessionsScanned"] ?? 0);
  const usd = Number(sliceCost["usd"] ?? 0);
  const guard = await evaluateCostReportGuard({
    repoPath,
    run,
    startedAt: run.startedAt,
    completedAt,
    sessionsScanned,
    usd,
    allowWideWindow: options.allowWideWindow,
    maxWindowHours: options.maxWindowHours
  });
  if (guard.refused === true) {
    return {
      written: false,
      reason: guard.reason,
      preserveCursor: guard.preserveCursor,
      cost: sliceCost
    };
  }
  const runId = guard.runId;
  const sliceArtifact = await writeArtifact2(repoPath, "cost-report-slice", {
    title,
    runTitle: title,
    cost: sliceCost,
    outcome,
    runId,
    ...feature != null ? { feature } : {},
    ...phase != null ? { phase } : {},
    ...dispatchBreakdown != null ? { dispatchBreakdown } : {},
    ...agentStats != null ? { agentStats } : {}
  });
  const aggregateArtifact = await maybeEmitAggregateCost({
    repoPath,
    title,
    startedAt: run.startedAt,
    completedAt,
    outcome,
    feature,
    phase,
    writeArtifact: writeArtifact2,
    computeSessionCost: computeSessionCost2
  });
  const adviseArtifact = await emitCostAdviseFn(repoPath, { title: runTitle, feature, phase });
  return { report: sliceArtifact, aggregate: aggregateArtifact, advise: adviseArtifact };
}
async function maybeEmitCostReport(repoPath, options = {}, emitCostAdviseFn = async () => null) {
  const { runTitle, feature, phase, allowWideWindow, maxWindowHours } = options;
  try {
    return await emitCostReportInner(repoPath, runTitle || null, feature || null, phase || null, emitCostAdviseFn, {
      ...allowWideWindow !== undefined ? { allowWideWindow } : {},
      ...maxWindowHours !== undefined ? { maxWindowHours } : {}
    });
  } catch (err2) {
    return { error: err2.message };
  }
}

// crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
init_dispatch_timing_reader();
import path15 from "path";
async function maybeEmitAggregateSlice(opts) {
  const {
    repoPath,
    startedAt,
    completedAt,
    runTitle,
    outcome,
    feature,
    phase,
    notes,
    sourceProject,
    writeArtifact: writeArtifact2,
    computeSessionCost: computeSessionCost2
  } = opts;
  const aggregateCost = await computeSessionCost2(repoPath, {
    startedAt,
    completedAt,
    sourceProject,
    aggregateAll: true
  });
  const sources = aggregateCost["sources"];
  if (!sources || sources.length <= 1)
    return null;
  const artifact = await writeArtifact2(repoPath, "cost-report-aggregate", {
    title: runTitle,
    runTitle,
    cost: aggregateCost,
    outcome,
    notes,
    feature,
    phase
  });
  artifact["cost"] = aggregateCost;
  artifact["outcome"] = outcome;
  return artifact;
}
function resolveCostSliceParams(flags, run) {
  return {
    startedAt: flags["startedAt"] || run?.startedAt,
    completedAt: flags["completedAt"] || run?.completedAt || null,
    runTitle: flags["runTitle"] || flags["title"] || run?.title || "manual-cost-slice",
    notes: flags["summary"] || null,
    feature: flags["feature"],
    phase: flags["phase"],
    sourceProject: flags["sourceProject"]
  };
}
async function collectDispatchBreakdown(repoPath, runId) {
  try {
    const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"] ?? repoPath;
    const dispatchLog = process.env["CREW_DISPATCH_TIMING_LOG"] ?? path15.join(pluginRoot, ".claude", "logs", "dispatch-timing.jsonl");
    const bashLog = process.env["CREW_BASH_GATE_LOG"] ?? path15.join(pluginRoot, ".claude", "logs", "bash-gates.jsonl");
    const resolvedRunId = runId ?? await getLatestRunId(dispatchLog);
    const [dispatch, gates] = await Promise.all([
      resolvedRunId ? aggregateDispatchTiming(dispatchLog, resolvedRunId) : Promise.resolve({ rowCount: 0, totalWallMs: 0, topSlow: [], topTokens: [] }),
      aggregateBashGates(bashLog)
    ]);
    if (dispatch.rowCount === 0 && gates.rowCount === 0)
      return;
    return { dispatch, gates };
  } catch {
    return;
  }
}
function buildGuardParams(repoPath, run, flags, startedAt, completedAt, sliceCost) {
  const scanWindow = sliceCost["window"] ?? {};
  return {
    repoPath,
    run,
    startedAt: scanWindow.start ?? startedAt,
    completedAt: scanWindow.end ?? completedAt ?? new Date().toISOString(),
    sessionsScanned: Number(sliceCost["sessionsScanned"] ?? 0),
    usd: Number(sliceCost["usd"] ?? 0),
    allowWideWindow: flags["allowWideWindow"] === true,
    maxWindowHours: typeof flags["maxWindowHours"] === "number" ? flags["maxWindowHours"] : undefined
  };
}
async function costSliceHandler({
  repoPath,
  flags
}) {
  const { loadWorkflowState: loadWorkflowState2 } = await Promise.resolve().then(() => (init_workflow_state(), exports_workflow_state));
  const { computeSessionCost: computeCost } = await Promise.resolve().then(() => (init_session_cost(), exports_session_cost));
  const { collectOutcomeLinkage: collectOutcomeLinkage2 } = await Promise.resolve().then(() => (init_outcome_linkage(), exports_outcome_linkage));
  const { writeArtifact: writeArt } = await Promise.resolve().then(() => (init_write(), exports_write));
  const computeSessionCost2 = computeCost;
  const state = await loadWorkflowState2(repoPath);
  const run = state?.currentRun || null;
  const { startedAt, completedAt, runTitle, notes, feature, phase, sourceProject } = resolveCostSliceParams(flags, run);
  if (!startedAt) {
    throw new Error("cost-slice requires --started-at or an active/last run with startedAt");
  }
  const [sliceCost, dispatchBreakdown] = await Promise.all([
    computeSessionCost2(repoPath, {
      startedAt,
      completedAt,
      sourceProject,
      aggregateAll: false
    }),
    collectDispatchBreakdown(repoPath, run?.["runId"])
  ]);
  const outcome = await collectOutcomeLinkage2(repoPath, runTitle);
  const guard = await evaluateCostReportGuard(buildGuardParams(repoPath, run, flags, startedAt, completedAt, sliceCost));
  if (guard.refused === true) {
    return {
      written: false,
      reason: guard.reason,
      preserveCursor: guard.preserveCursor,
      cost: sliceCost
    };
  }
  const writeResult = await writeArt(repoPath, "cost-report-slice", {
    title: runTitle,
    runTitle,
    cost: sliceCost,
    outcome,
    runId: guard.runId,
    ...notes != null ? { notes } : {},
    ...feature != null ? { feature } : {},
    ...phase != null ? { phase } : {},
    ...dispatchBreakdown != null ? { dispatchBreakdown } : {}
  });
  if (writeResult.ok === false)
    throw writeResult.error;
  const sliceArtifact = { ...writeResult.value };
  sliceArtifact["cost"] = sliceCost;
  sliceArtifact["outcome"] = outcome;
  if (flags["aggregateAll"] !== true) {
    return sliceArtifact;
  }
  const writeArtifact2 = async (rp, kind, fields) => {
    const r = await writeArt(rp, kind, fields);
    if (r.ok === false)
      throw r.error;
    return r.value;
  };
  const aggregateArtifact = await maybeEmitAggregateSlice({
    repoPath,
    startedAt,
    completedAt,
    runTitle,
    outcome,
    feature: feature ?? null,
    phase: phase ?? null,
    notes: notes ?? null,
    sourceProject,
    writeArtifact: writeArtifact2,
    computeSessionCost: computeSessionCost2
  });
  return aggregateArtifact ? { slice: sliceArtifact, aggregate: aggregateArtifact } : sliceArtifact;
}

// crew/scripts/lib/cost-hygiene/cost-advise-writer.mts
import fs13 from "fs/promises";
import path16 from "path";
function buildCostAdviseSlug(title, advisor) {
  const t = advisor?.["target"];
  const source = title || t?.sliceId || t?.runTitle || "advise";
  return source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function buildOptionalFrontmatter(feature, phase) {
  const lines = [];
  if (phase !== null && phase !== undefined && String(phase).length > 0) {
    lines.push(`phase: ${JSON.stringify(String(phase))}`);
  }
  if (feature)
    lines.push(`feature: ${feature}`);
  if (lines.length === 0)
    return "";
  return ["---", ...lines, "---", ""].join(`
`);
}
async function writeCostAdviseArtifact(repoPath, md, advisor, options = {}) {
  const { title = null, feature = null, phase = null } = options;
  const dir = path16.join(repoPath, ".claude", "artifacts", "crew", "cost-insights");
  await fs13.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const slug = buildCostAdviseSlug(title, advisor);
  const fm = buildOptionalFrontmatter(feature, phase);
  const file = path16.join(dir, `${stamp}-cost-advise-${slug}.md`);
  await fs13.writeFile(file, fm + md + `
`);
  return file;
}

// crew/scripts/crew.mts
init_fs_utils();

// crew/scripts/lib/installer/bun-preflight.mts
import { spawnSync } from "child_process";
var INSTALL_URL = "https://bun.sh";
var MIN_MAJOR = 1;
var MIN_MINOR = 3;
function assertBunPresent(opts = {}) {
  const env = opts.env ?? process.env;
  const res = spawnSync("bun", ["--version"], {
    env,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  if (res.error || res.status !== 0) {
    throw new Error(`crew install requires Bun >= ${MIN_MAJOR}.${MIN_MINOR}. ` + `Install from ${INSTALL_URL} and re-run.`);
  }
  const version = (res.stdout ?? "").trim();
  const m = version.match(/^(\d+)\.(\d+)/);
  if (!m) {
    throw new Error(`Could not parse "bun --version" output: ${JSON.stringify(version)}. ` + `Install from ${INSTALL_URL}.`);
  }
  const major = Number.parseInt(m[1], 10);
  const minor = Number.parseInt(m[2], 10);
  if (major < MIN_MAJOR || major === MIN_MAJOR && minor < MIN_MINOR) {
    throw new Error(`crew install requires Bun >= ${MIN_MAJOR}.${MIN_MINOR}; detected ${version}. ` + `Upgrade from ${INSTALL_URL}.`);
  }
  return { version };
}

// crew/scripts/crew.mts
init_artifact_schemas();
var FLAG_SPEC = {
  "--aggregate-all": { key: "aggregateAll", boolean: true },
  "--allow-existing": { key: "allowExisting", boolean: true },
  "--artifact-only": { key: "artifactOnly", boolean: true },
  "--force": { key: "force", boolean: true },
  "--help": { key: "help", boolean: true },
  "-h": { key: "help", boolean: true },
  "--json": { key: "json", boolean: true },
  "--live": { key: "live", boolean: true },
  "--no-self": { key: "noSelf", boolean: true },
  "--non-code": { key: "nonCode", boolean: true },
  "--repo-context": { key: "repoContext", boolean: true },
  "--scaffold": { key: "scaffold", boolean: true },
  "--validate": { key: "validate", boolean: true },
  "--agent": { key: "agent" },
  "--alerts": { key: "alerts" },
  "--author-id": { key: "authorId" },
  "--budget": { key: "budget" },
  "--approver": { key: "approver" },
  "--badge": { key: "badge" },
  "--blocked-by": { key: "blockedBy" },
  "--build": { key: "build" },
  "--builder": { key: "builder" },
  "--clues": { key: "clues" },
  "--commit-pattern": { key: "commitPattern" },
  "--completed-at": { key: "completedAt" },
  "--confidence": { key: "confidence" },
  "--decision": { key: "decision" },
  "--deliverable": { key: "deliverable" },
  "--deploy": { key: "deploy" },
  "--deployer": { key: "deployer" },
  "--discovery-status": { key: "discoveryStatus" },
  "--environment": { key: "environment" },
  "--environments": { key: "environments" },
  "--evidence": { key: "evidence" },
  "--external-deltas": { key: "externalDeltas" },
  "--extra-root": { key: "extraRoot" },
  "--feat": { key: "feat" },
  "--feature": { key: "feature" },
  "--features": { key: "features" },
  "--files": { key: "files" },
  "--files-read": { key: "filesRead" },
  "--findings": { key: "findings" },
  "--from": { key: "from" },
  "--goal": { key: "goal" },
  "--handoff": { key: "handoff" },
  "--id": { key: "id" },
  "--k": { key: "gepaK" },
  "--kind": { key: "kind" },
  "--logs": { key: "logs" },
  "--memories-used": { key: "memoriesUsed" },
  "--metrics": { key: "metrics" },
  "--missing": { key: "missing" },
  "--mode": { key: "mode" },
  "--next": { key: "next" },
  "--note": { key: "note" },
  "--out-of-scope": { key: "outOfScope" },
  "--out": { key: "out" },
  "--outcome": { key: "outcome" },
  "--owner": { key: "owner" },
  "--pace": { key: "pace" },
  "--phase": { key: "phase" },
  "--preset": { key: "preset" },
  "--project": { key: "project" },
  "--reason": { key: "reason" },
  "--refresh-when": { key: "refreshWhen" },
  "--repo": { key: "repo" },
  "--requester": { key: "requester" },
  "--resolver": { key: "resolver" },
  "--resource": { key: "resource" },
  "--revision": { key: "revision" },
  "--reviewer": { key: "reviewer" },
  "--reviewer-label": { key: "reviewerLabel" },
  "--risks": { key: "risks" },
  "--run": { key: "run" },
  "--run-id": { key: "runId" },
  "--run-steps": { key: "runSteps" },
  "--run-title": { key: "runTitle" },
  "--source": { key: "gepaSource" },
  "--source-project": { key: "sourceProject" },
  "--scope": { key: "scope" },
  "--limit": { key: "limit" },
  "--token-cap": { key: "tokenCap" },
  "--judge": { key: "judge" },
  "--judge-id": { key: "judgeId" },
  "--not-checked": { key: "notChecked" },
  "--split": { key: "split" },
  "--severity": { key: "severity" },
  "--shape": { key: "shape" },
  "--skip-reason": { key: "skipReason" },
  "--slice": { key: "slice" },
  "--started-at": { key: "startedAt" },
  "--status": { key: "status" },
  "--summary": { key: "summary" },
  "--telemetry": { key: "telemetry" },
  "--test-summary": { key: "testSummary" },
  "--test-summary-skip-reason": { key: "testSummarySkipReason" },
  "--tier": { key: "tier" },
  "--title": { key: "title" },
  "--to": { key: "to" },
  "--trigger-filename": { key: "triggerFilename" },
  "--update": { key: "updatePath" },
  "--url": { key: "url" },
  "--validation-evidence": { key: "validationEvidence" },
  "--validator": { key: "validator" },
  "--verdict": { key: "decision" },
  "--verified-from": { key: "verifiedFrom" },
  "--weeks": { key: "weeks" },
  "--window": { key: "window" },
  "--role": { key: "role" },
  "--surface": { key: "surface" },
  "--stack": { key: "stack" },
  "--concern": { key: "concern" },
  "--date": { key: "date" },
  "--lens": { key: "lens" },
  "--since": { key: "since" },
  "--sibling": { key: "sibling" },
  "--tag": { key: "tag" },
  "--tags": { key: "tags" },
  "--failure-output": { key: "failureOutput" },
  "--prev-signature": { key: "prevSignature" }
};
function buildDefaultFlags() {
  return {
    repo: process.cwd(),
    allowExisting: false,
    help: false,
    force: false,
    owner: null,
    requester: null,
    approver: null,
    resolver: null,
    kind: null,
    severity: null,
    shape: null,
    summary: null,
    reason: null,
    note: null,
    status: "open",
    id: null,
    decision: null,
    title: null,
    goal: null,
    mode: null,
    pace: null,
    scope: null,
    outOfScope: null,
    files: null,
    evidence: null,
    externalDeltas: null,
    risks: null,
    runSteps: null,
    next: null,
    from: null,
    to: null,
    deliverable: null,
    confidence: null,
    reviewer: null,
    validator: null,
    deployer: null,
    environment: null,
    build: null,
    deploy: null,
    environments: null,
    logs: null,
    metrics: null,
    alerts: null,
    telemetry: null,
    clues: null,
    discoveryStatus: null,
    verifiedFrom: null,
    missing: null,
    refreshWhen: null,
    resource: null,
    url: null,
    revision: null,
    badge: null,
    preset: null,
    project: null,
    commitPattern: null,
    triggerFilename: null,
    reviewerLabel: null,
    startedAt: null,
    completedAt: null,
    runTitle: null,
    sourceProject: null,
    blockedBy: null,
    feature: null,
    features: null,
    nonCode: false,
    noSelf: false,
    aggregateAll: false,
    repoContext: false,
    scaffold: false,
    extraRoot: null,
    phase: null,
    testSummary: null,
    testSummarySkipReason: null,
    findings: null,
    validationEvidence: null,
    builder: null,
    feat: null,
    filesRead: null,
    handoff: null,
    run: null,
    slice: null,
    tier: null,
    updatePath: null,
    agent: null,
    window: null,
    role: null,
    surface: null,
    stack: null,
    concern: null,
    lens: null,
    gepaSource: null,
    limit: null,
    tokenCap: null,
    sibling: null,
    json: false,
    live: false,
    validate: false,
    judge: null,
    judgeId: null,
    authorId: null,
    notChecked: null,
    split: null,
    out: null,
    weeks: null,
    artifactOnly: false,
    budget: null,
    gepaK: null,
    since: null,
    tag: null,
    tags: null,
    skipReason: null,
    date: null,
    runId: null,
    outcome: null,
    memoriesUsed: null,
    failureOutput: null,
    prevSignature: null
  };
}
function stripSingleTrailingNewline(text) {
  return text.replace(/\r?\n$/, "");
}
function readFlagFileValue(filePath) {
  const raw = filePath === "-" ? fs37.readFileSync(0, "utf8") : fs37.readFileSync(filePath, "utf8");
  return stripSingleTrailingNewline(raw);
}
function tryApplyFileFlagToken(value, rest, index, flags) {
  if (!value.startsWith("--") || !value.endsWith("-file"))
    return null;
  const baseFlag = value.slice(0, -"-file".length);
  const baseSpec = FLAG_SPEC[baseFlag];
  if (!baseSpec || baseSpec.boolean)
    return null;
  const filePath = rest[index + 1];
  if (filePath === undefined) {
    throw new Error(`${value} requires a file path argument (use - to read from stdin)`);
  }
  const flagsRecord = flags;
  flagsRecord[baseSpec.key] = readFlagFileValue(filePath);
  return index + 2;
}
function applyFlagToken(rest, index, flags, positionals) {
  const value = rest[index];
  if (value === undefined)
    return index + 1;
  if (value === "--") {
    for (let tail = index + 1;tail < rest.length; tail += 1) {
      const tailVal = rest[tail];
      if (tailVal !== undefined)
        positionals.push(tailVal);
    }
    return -1;
  }
  const spec = FLAG_SPEC[value];
  if (spec) {
    const flagsRecord = flags;
    if (spec.boolean) {
      flagsRecord[spec.key] = true;
      return index + 1;
    }
    flagsRecord[spec.key] = rest[index + 1] ?? null;
    return index + 2;
  }
  const fileFlagResult = tryApplyFileFlagToken(value, rest, index, flags);
  if (fileFlagResult !== null)
    return fileFlagResult;
  if (value.startsWith("--")) {
    throw new Error(`Unknown argument: ${value}`);
  }
  positionals.push(value);
  return index + 1;
}
function resolveCommand(command, flags, positionals) {
  if (!command || command === "--help" || command === "-h") {
    return { command: "help", helpTarget: null, flags, positionals };
  }
  if (flags.help) {
    return { command: "help", helpTarget: command, flags, positionals };
  }
  return { command, helpTarget: null, flags, positionals };
}
function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = buildDefaultFlags();
  const positionals = [];
  let index = 0;
  while (index < rest.length) {
    const nextIndex = applyFlagToken(rest, index, flags, positionals);
    if (nextIndex === -1)
      break;
    index = nextIndex;
  }
  return resolveCommand(command, flags, positionals);
}
function usage(target = null) {
  const subcommands = {
    "install-global": "  node scripts/crew.mjs install-global",
    audit: "  node scripts/crew.mjs audit --repo <path>",
    bootstrap: "  node scripts/crew.mjs bootstrap --repo <path>",
    init: "  node scripts/crew.mjs init --repo <path> [--allow-existing]",
    claim: "  node scripts/crew.mjs claim --repo <path> [--owner <name>] <files...>",
    release: "  node scripts/crew.mjs release --repo <path> [--owner <name>] [files...]",
    "show-claims": "  node scripts/crew.mjs show-claims --repo <path>",
    "show-conflicts": "  node scripts/crew.mjs show-conflicts --repo <path> [--owner <name>] [files...]",
    "quickwin-lane": "  node scripts/crew.mjs quickwin-lane [spawn|status] --repo <path> [--date YYYY-MM-DD]",
    "claim-check": "  node scripts/crew.mjs claim-check --repo <path> [--owner <name>] <files...>",
    "wake-up": "  node scripts/crew.mjs wake-up --repo <path>",
    "brief-me": "  node scripts/crew.mjs brief-me --repo <path>",
    "scope-estimate": "  node scripts/crew.mjs scope-estimate --files <path:lines[:eslintDisable],...>",
    "discover-deployment": "  node scripts/crew.mjs discover-deployment --repo <path>",
    "write-deployment-guidance": "  node scripts/crew.mjs write-deployment-guidance --repo <path> --title <text> [--discovery-status repo-derived|partial|live-verified] [--verified-from <a,b>] [--missing <a,b>] [--summary <text>] [--build <text>] [--deploy <text>]",
    "show-workflow-state": "  node scripts/crew.mjs show-workflow-state --repo <path>",
    "mark-badge": "  node scripts/crew.mjs mark-badge --repo <path> --badge review_required|review_passed|review_failed|review_skipped|validation_expected|validation_passed|validation_failed|validation_skipped|validation_stale|dev_deploy_expected|dev_checked|dev_failed|dev_skipped|prod_deploy_expected|prod_checked|prod_failed|prod_skipped|blocked|specialist_recommended|escalated_to_dispatcher|incident_resolved|rollback_executed|incident_blocked|help_request|help_resolved [--note <text>] [--blocked-by <artifact-id>] (escalated_to_lead accepted as backward-compat alias)",
    "write-run-brief": "  node scripts/crew.mjs write-run-brief --repo <path> --title <text> [--goal <text>] [--mode <mode>] [--pace <pace>]",
    "write-build-bundle": "  node scripts/crew.mts write-build-bundle --repo <path> --slice <SLICE-NN> --builder <builder|builder-be|builder-fe> --run <YYYYMMDDTHHMMSSZ> --handoff <path> [--feat <FEAT-NNN>] [--files <a,b>] [--files-read <c,d>]",
    "write-handoff-and-bundle": "  node scripts/crew.mts write-handoff-and-bundle --repo <path> --title <text> --summary <text> --files <a,b> --confidence <high|medium|low> [--builder builder|builder-be|builder-fe] [--slice <SLICE-NN>] [--run <YYYYMMDDTHHMMSSZ>] [--feat <FEAT-NNN>] [--files-read <c,d>] [--risks <text>] [--next <text>]",
    "write-handoff": "  node scripts/crew.mts write-handoff --repo <path> --title <text> [--from <role>] [--to <role>] [--goal <text>] [--summary <text>] [--scope <text>] [--out-of-scope <text>] [--deliverable <text>] [--files <a,b>] [--confidence high|medium|low] [--risks <text>] [--next <text>] [--feature <FEAT-NNN>] [--phase <name>] [--status <text>]",
    "write-review-result": `  node scripts/crew.mjs write-review-result --repo <path> --title <text> [--reviewer <role>] [--decision approved|approved_with_notes|rejected|needs_fix] [--verdict <decision>] [--not-checked <a,b,c>] [--author-id <id>] [--judge-id <id>]
` + "    Prose bodies (--summary, --findings, --risks, --next, ...) accept a `--<flag>-file <path|->` companion\n" + "    (e.g. --summary-file /tmp/summary.md, or - for stdin) so apostrophes/backticks never ride shell argv (#152).",
    "write-validation-plan": "  node scripts/crew.mjs write-validation-plan --repo <path> --title <text> [--validator <role>] [--environment <name>]",
    "write-validation-result": "  node scripts/crew.mjs write-validation-result --repo <path> --title <text> [--validator <role>] [--environment <name>] [--decision pass|fail|skipped] [--skip-reason <text>]",
    "write-deployment-check": "  node scripts/crew.mjs write-deployment-check --repo <path> --title <text> [--deployer <role>] [--environment dev|prod] [--resource <name>] [--url <service-url>] [--revision <id>] [--decision <decision>]",
    "write-final-synthesis": `  node scripts/crew.mjs write-final-synthesis --repo <path> --title <text> --external-deltas <text|none> [--summary <text>] [--run-steps <a,b>] [--files <a,b>] [--force]
` + "    --summary accepts a --summary-file <path|-> companion for prose with apostrophes/backticks (#152).",
    "cost-slice": "  node scripts/crew.mjs cost-slice --repo <path> [--started-at <iso>] [--completed-at <iso>] [--run-title <text>] [--source-project <slug>] [--aggregate-all]",
    "cost-advise": "  node scripts/crew.mjs cost-advise --repo <path>",
    "cost-watch": `  node scripts/crew.mts cost-watch --repo <path> [--limit N] [--token-cap N]
` + `    Read-only operator burn-watch (FEAT-194 S4): recent per-dispatch agent/model/tokens
` + `    (.claude/logs/dispatch-timing.jsonl) + recent per-slice usd/tokens/cache-hit%
` + `    (.claude/artifacts/crew/cost/), with an advisory flag against loop.cost.ceilingUsd
` + "    and a per-dispatch token cap (default 150000). No new telemetry pipeline.",
    "agent-stats": "  node scripts/crew.mts agent-stats [--agent <name>] [--window last_n_slices:<N>] [--repo <path>]",
    "agent-route": "  node scripts/crew.mts agent-route [--role <r>] [--surface <s>] [--stack <s>] [--concern <c>] [--lens <l>] [--scope <s>] [--repo <path>]",
    "gepa-history": "  node scripts/crew.mts gepa-history <agent> [--source eval|captured|soak] [--limit N] [--repo <path>]",
    "gepa-eval": "  node scripts/crew.mts gepa-eval <agent> [--live] [--judge <name>] [--validate] [--split N/M] [--repo <path>]",
    "gepa-resume": `  node scripts/crew.mts gepa-resume [<agent>] [--repo <path>]
` + `    With <agent>: clears the no-winner streak counter for that agent.
` + "    Without <agent>: clears the global optimize.paused flag in gepa.config.json.",
    "gepa-invalidate": "  node scripts/crew.mts gepa-invalidate --agent <name> [--since <iso>] [--tag <tag>] [--repo <path>]",
    "gepa-revert": "  node scripts/crew.mts gepa-revert --agent <name> [--repo <path>]",
    "gepa-thaw": "  node scripts/crew.mts gepa-thaw <agent> [--repo <path>]",
    "recall-block": `  node scripts/crew.mts recall-block --repo <path> [--agent <name>] [--tags <a,b>] [--project <a,b>]
` + `    --project accepts a comma-list (OR-composed, FEAT-423); omitted falls back
` + "    to the configured memory.project in .claude/loop.json.",
    "memory-drift-check": `  node scripts/crew.mts memory-drift-check --repo <path> [--window <days>]
` + `    Read-only: compares learnings.jsonl entries in the window against astramem's
` + `    recall() results and reports entries not confirmed present remotely (S4
` + "    accepted-risk drift note). Never writes to astramem.",
    "resolve-model": `  node scripts/crew.mts resolve-model --phase <build|architect|...> [--shape <shape>] [--repo <path>]
` + `    Reads .claude/loop.json loop.modelRouting + the trivial-shape tier table and
` + `    prints the resolved model string (e.g. sonnet). Falls back to opus only when
` + `    no routing is configured. Prints the sentinel 'inherit' when routing is
` + `    disabled (crew.json features["model-routing"].enabled: false or
` + `    loop.modelRouting.enabled: false) \u2014 then OMIT the Agent-tool model: argument
` + "    so the agent's own model: frontmatter governs. FEAT-194 S2.",
    "repair-check": `  node scripts/crew.mts repair-check --failure-output <text> [--prev-signature <text>]
` + `    Bounded-retry-loop dedup helper (ported from dev-team#257): normalizes
` + `    --failure-output into a signature and reports shouldStop=true once it matches
` + `    --prev-signature (the signature returned by the prior call in the same retry
` + `    loop) \u2014 signals that retrying hit the same failure twice in a row and stopped
` + "    changing the outcome."
  };
  const subcommandsMap = subcommands;
  if (target && subcommandsMap[target]) {
    return ["Engineering OS installer", "", "Usage:", subcommandsMap[target]].join(`
`);
  }
  return ["Engineering OS installer", "", "Usage:", ...Object.values(subcommands)].join(`
`);
}
async function emitCostAdvise(repoPath, { title, feature, phase }) {
  try {
    const { buildCostAdvisor: buildCostAdvisor2, renderCostAdvisorMarkdown: renderCostAdvisorMarkdown2 } = await Promise.resolve().then(() => (init_cost_advisor(), exports_cost_advisor));
    const advisor = await buildCostAdvisor2(repoPath, { limit: 10 });
    const md = renderCostAdvisorMarkdown2(advisor);
    const advisePath = await writeCostAdviseArtifact(repoPath, md, advisor, {
      title,
      feature,
      phase
    });
    return {
      path: advisePath,
      recommendations: advisor.recommendations?.length || 0,
      aggregateFlags: advisor.aggregateFlags?.length || 0
    };
  } catch (err2) {
    const message = err2 instanceof Error ? err2.message : String(err2);
    return { error: message };
  }
}
function pickFlags(flags, keys) {
  const result2 = {};
  const view = flags;
  for (const key of keys) {
    const value = view[key];
    result2[key] = typeof value === "string" ? value : undefined;
  }
  return result2;
}
function assertBuilderName(builder, command) {
  const validBuilders = new Set(["fullstack-dev", "backend-dev", "frontend-dev"]);
  if (!validBuilders.has(builder)) {
    process.stderr.write(`[crew] ${command} refused: --builder must be one of ${[...validBuilders].join(", ")}.
`);
    process.exit(2);
  }
  return builder;
}
function resolveReviewVerdict(rawDecision) {
  if (!rawDecision)
    return;
  const normalized = normalizeReviewDecision(rawDecision);
  if (!normalized) {
    process.stderr.write(`[crew] write-review-result refused: unknown decision "${rawDecision}". Valid values: approved, approved_with_notes, rejected (needs_fix, needs_revision accepted as aliases for rejected; approved_with_conditions accepted as an alias for approved_with_notes).
`);
    process.exit(2);
  }
  return normalized.canonical;
}
function refuseIfReviewDecisionMissing(rawDecision, scaffold, status) {
  if (scaffold || status === "in-progress")
    return;
  if (rawDecision)
    return;
  process.stderr.write(`[crew] write-review-result refused: --decision is required (approved|approved_with_notes|rejected).
`);
  process.exit(2);
}
function refuseIfTestAdequacyMissing(verdict, flags) {
  const isApproved = verdict === "approved" || verdict === "approved_with_notes";
  const isCodeBearing = !flags.nonCode;
  if (!isApproved || !isCodeBearing || flags.testSummary || flags.testSummarySkipReason)
    return;
  process.stderr.write(`[crew] write-review-result refused: --test-summary or --test-summary-skip-reason is required for approved code-bearing reviews. Pass --non-code if the diff is doc-only.
`);
  process.exit(2);
}
function refuseIfSchemaInvalid(command, result2) {
  if (result2.success)
    return;
  const messages = result2.error?.issues.map((i) => i.message).join("; ") ?? "unknown error";
  process.stderr.write(`[crew] ${command} refused: schema validation failed: ${messages}
`);
  process.exit(2);
}
function splitCsv(value) {
  return (value ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function deriveReviewMetadataFields(flags) {
  const notChecked = splitCsv(flags.notChecked);
  const authorId = flags.authorId ?? undefined;
  const judgeId = flags.judgeId ?? undefined;
  const selfApproval = authorId !== undefined ? authorId === judgeId : undefined;
  return { notChecked, authorId, judgeId, selfApproval };
}
async function resolveSliceFromState(repoPath, sliceFlag) {
  if (sliceFlag)
    return sliceFlag;
  try {
    const fs38 = await import("fs/promises");
    const pathMod = await import("path");
    const statePath = pathMod.join(repoPath, ".claude", "state", "crew", "workflow-state.json");
    const state = JSON.parse(await fs38.readFile(statePath, "utf8"));
    return state?.currentRun?.slice ?? "unknown";
  } catch {
    return "unknown";
  }
}
function generateRunId(runFlag) {
  if (runFlag)
    return runFlag;
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}
async function tryAssembleBundle(input) {
  try {
    const fs38 = await import("fs/promises");
    const { assembleBuildBundle: assembleBuildBundle2 } = await Promise.resolve().then(() => (init_assemble(), exports_assemble));
    const handoffBody = await fs38.readFile(input.handoffPath, "utf8");
    const bundle = await assembleBuildBundle2({
      repoPath: input.repoPath,
      sliceId: input.sliceId,
      builderName: input.builderName,
      runId: input.runId,
      ...input.feat !== null ? { feat: input.feat } : {},
      handoffBody,
      filesTouched: input.filesTouched,
      filesRead: input.filesRead
    });
    return { path: bundle.path, error: null };
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : String(e) };
  }
}
async function writeHandoffAndBundle({ repoPath, flags, positionals }) {
  const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
  const r = await writeArtifact2(repoPath, "handoff", {
    title: flags.title || positionals.join(" ") || "Task Handoff",
    from: flags.from || flags.owner || "fullstack-dev",
    to: flags.to ?? "dispatcher",
    status: flags.status !== "open" ? flags.status ?? undefined : undefined,
    repoContext: flags.repoContext,
    ...pickFlags(flags, [
      "goal",
      "summary",
      "scope",
      "outOfScope",
      "deliverable",
      "files",
      "confidence",
      "risks",
      "next",
      "feature",
      "phase",
      "updatePath"
    ])
  });
  if (!r.ok)
    throw r.error;
  const handoff = r.value;
  const slice = await resolveSliceFromState(repoPath, flags.slice);
  const runId = generateRunId(flags.run);
  const builder = assertBuilderName(flags.builder ?? "fullstack-dev", "write-handoff-and-bundle");
  const bundle = await tryAssembleBundle({
    repoPath,
    sliceId: slice,
    builderName: builder,
    runId,
    feat: flags.feat,
    handoffPath: handoff.path,
    filesTouched: splitCsv(flags.files),
    filesRead: splitCsv(flags.filesRead)
  });
  return {
    kind: "handoff-and-bundle",
    handoff: handoff.path,
    bundle: bundle.path,
    bundleError: bundle.error
  };
}
var COMMANDS = {
  "install-global": async () => {
    assertBunPresent();
    const { installGlobal: installGlobal2 } = await Promise.resolve().then(() => (init_installer(), exports_installer));
    return installGlobal2();
  },
  audit: async ({ repoPath }) => {
    const { auditRepo: auditRepo2 } = await Promise.resolve().then(() => (init_installer(), exports_installer));
    return auditRepo2(repoPath);
  },
  bootstrap: async ({ repoPath }) => {
    assertBunPresent();
    const { bootstrapRepo: bootstrapRepo2 } = await Promise.resolve().then(() => (init_installer(), exports_installer));
    const result2 = await bootstrapRepo2(repoPath);
    if (!result2.ok) {
      console.error(`Repository path does not exist: ${repoPath}`);
      process.exit(1);
    }
    return result2.value;
  },
  init: async ({ repoPath, flags }) => {
    assertBunPresent();
    const { initRepo: initRepo2 } = await Promise.resolve().then(() => (init_installer(), exports_installer));
    return initRepo2(repoPath, { allowExisting: flags.allowExisting });
  },
  claim: async ({ repoPath, flags, positionals }) => {
    const { claimFiles: claimFiles2 } = await Promise.resolve().then(() => (init_claims(), exports_claims));
    const result2 = await claimFiles2(repoPath, positionals, {
      owner: flags.owner || "dispatcher-session"
    });
    if (!result2.ok) {
      console.error(result2.error.message);
      process.exit(1);
    }
    return result2.value;
  },
  release: async ({ repoPath, flags, positionals }) => {
    const { releaseFiles: releaseFiles2 } = await Promise.resolve().then(() => (init_claims(), exports_claims));
    const result2 = await releaseFiles2(repoPath, positionals, flags.owner !== null ? { owner: flags.owner } : {});
    if (!result2.ok) {
      console.error(result2.error.message);
      process.exit(1);
    }
    return result2.value;
  },
  "show-claims": async ({ repoPath }) => {
    const { listClaims: listClaims2 } = await Promise.resolve().then(() => (init_claims(), exports_claims));
    return { claims: await listClaims2(repoPath) };
  },
  "show-conflicts": async ({ repoPath, flags, positionals }) => {
    const { inspectClaims: inspectClaims2 } = await Promise.resolve().then(() => (init_claims(), exports_claims));
    return inspectClaims2(repoPath, positionals, { owner: flags.owner || "dispatcher-session" });
  },
  "claim-check": async ({ repoPath, flags, positionals }) => {
    const { checkDisjoint: checkDisjoint2 } = await Promise.resolve().then(() => (init_claims(), exports_claims));
    return checkDisjoint2(repoPath, positionals, {
      owner: flags.owner || "quickwin-lane"
    });
  },
  "quickwin-lane": async ({ repoPath, flags, positionals }) => {
    const { spawnChoreLane: spawnChoreLane2, choreLaneStatus: choreLaneStatus2 } = await Promise.resolve().then(() => (init_worktree_manager(), exports_worktree_manager));
    const dateOpt = flags.date ? { date: flags.date } : {};
    const action = positionals[0] ?? "spawn";
    if (action === "status") {
      const status = await choreLaneStatus2(repoPath, dateOpt);
      if (!status.ok) {
        console.error(status.error.message);
        process.exit(1);
      }
      return status.value;
    }
    if (action !== "spawn") {
      console.error(`Unknown quickwin-lane action: ${action} (expected spawn|status)`);
      process.exit(1);
    }
    const result2 = await spawnChoreLane2(repoPath, dateOpt);
    if (!result2.ok) {
      console.error(result2.error.message);
      process.exit(1);
    }
    return result2.value;
  },
  "wake-up": async ({ repoPath }) => {
    const { buildWakeUpBrief: buildWakeUpBrief2 } = await Promise.resolve().then(() => (init_wakeup(), exports_wakeup));
    return buildWakeUpBrief2(repoPath);
  },
  "brief-me": async ({ repoPath }) => {
    const { buildBriefingReport: buildBriefingReport2 } = await Promise.resolve().then(() => (init_briefing(), exports_briefing));
    return buildBriefingReport2(repoPath);
  },
  "scope-estimate": async ({ flags, positionals }) => {
    const { estimateScope: estimateScope2 } = await Promise.resolve().then(() => exports_scope_estimate);
    const rawFiles = (flags.files || positionals.join(",") || "").split(",").filter(Boolean);
    const files = rawFiles.map((entry) => {
      const [p, linesStr, eslintDisableStr] = entry.split(":");
      return {
        path: p || "",
        lines: parseInt(linesStr ?? "0", 10) || 0,
        eslintDisable: eslintDisableStr === "true"
      };
    });
    return estimateScope2({ files });
  },
  fleet: async ({ repoPath, flags }) => {
    const { buildFleetReport: buildFleetReport2 } = await Promise.resolve().then(() => (init_fleet(), exports_fleet));
    return buildFleetReport2(repoPath, {
      extraRoots: flags.extraRoot ? [flags.extraRoot] : [],
      includeSelf: !flags.noSelf
    });
  },
  "discover-deployment": async ({ repoPath }) => {
    const { discoverDeploymentClues: discoverDeploymentClues2 } = await Promise.resolve().then(() => (init_read2(), exports_read));
    return discoverDeploymentClues2(repoPath);
  },
  "write-deployment-guidance": async ({ repoPath, flags, positionals }) => {
    const { writeDeploymentGuidance: writeDeploymentGuidance2 } = await Promise.resolve().then(() => (init_write2(), exports_write2));
    const r = await writeDeploymentGuidance2(repoPath, {
      title: flags.title || positionals.join(" ") || "Repo Deployment Model",
      owner: flags.owner || "dispatcher-session",
      ...pickFlags(flags, [
        "summary",
        "build",
        "deploy",
        "environments",
        "logs",
        "metrics",
        "alerts",
        "telemetry",
        "clues",
        "discoveryStatus",
        "verifiedFrom",
        "missing",
        "refreshWhen",
        "next"
      ])
    });
    if (!r.ok)
      throw r.error;
    return r.value;
  },
  "show-workflow-state": async ({ repoPath }) => {
    const { loadWorkflowState: loadWorkflowState2, summarizeWorkflowState: summarizeWorkflowState2 } = await Promise.resolve().then(() => (init_workflow_state(), exports_workflow_state));
    const workflowState = await loadWorkflowState2(repoPath);
    return { workflowState, summary: summarizeWorkflowState2(workflowState) };
  },
  "mark-badge": async ({ repoPath, flags }) => {
    const { markWorkflowBadge: markWorkflowBadge2 } = await Promise.resolve().then(() => (init_workflow_state(), exports_workflow_state));
    const result2 = await markWorkflowBadge2(repoPath, {
      badge: flags.badge ?? undefined,
      note: flags.note || flags.reason || "",
      blockedBy: flags.blockedBy,
      title: flags.title ?? undefined,
      goal: flags.goal ?? undefined,
      mode: flags.mode ?? undefined,
      next: flags.next ?? undefined
    });
    if (!result2.ok) {
      console.error(result2.error.message);
      process.exit(1);
    }
    return { badge: flags.badge, currentRun: result2.value };
  },
  "write-run-brief": async ({ repoPath, flags, positionals }) => {
    const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
    const fields = {
      title: flags.title || positionals.join(" ") || "Run Brief",
      owner: flags.owner || "dispatcher-session",
      status: flags.status === "open" ? "active" : flags.status ?? undefined,
      ...pickFlags(flags, [
        "goal",
        "mode",
        "pace",
        "summary",
        "scope",
        "outOfScope",
        "files",
        "next",
        "feature",
        "phase"
      ])
    };
    if (flags.tier === "full" || flags.tier === "light") {
      fields.tier = flags.tier;
    }
    const r = await writeArtifact2(repoPath, "run-brief", fields);
    if (!r.ok)
      throw r.error;
    return r.value;
  },
  "write-build-bundle": async ({ repoPath, flags }) => {
    const { assembleBuildBundle: assembleBuildBundle2 } = await Promise.resolve().then(() => (init_assemble(), exports_assemble));
    const fs38 = await import("fs/promises");
    const slice = flags.slice ?? "unknown";
    const builder = flags.builder;
    const run = flags.run;
    const handoffPath = flags.handoff;
    if (!builder || !run || !handoffPath) {
      process.stderr.write(`[crew] write-build-bundle refused: --builder, --run, and --handoff are required.
`);
      process.exit(2);
    }
    const validBuilders = new Set(["fullstack-dev", "backend-dev", "frontend-dev"]);
    if (!validBuilders.has(builder)) {
      process.stderr.write(`[crew] write-build-bundle refused: --builder must be one of ${[...validBuilders].join(", ")}.
`);
      process.exit(2);
    }
    const handoffBody = await fs38.readFile(handoffPath, "utf8");
    const filesTouched = (flags.files ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const filesRead = (flags.filesRead ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const result2 = await assembleBuildBundle2({
      repoPath,
      sliceId: slice,
      builderName: builder,
      runId: run,
      ...flags.feat !== null ? { feat: flags.feat } : {},
      handoffBody,
      filesTouched,
      filesRead
    });
    return result2.path;
  },
  "write-handoff": async ({ repoPath, flags, positionals }) => {
    const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
    const memoriesUsed = splitCsv(flags.memoriesUsed);
    const r = await writeArtifact2(repoPath, "handoff", {
      title: flags.title || positionals.join(" ") || "Task Handoff",
      from: flags.from || flags.owner || "dispatcher-session",
      status: flags.status !== "open" ? flags.status ?? undefined : undefined,
      repoContext: flags.repoContext,
      ...memoriesUsed.length > 0 ? { memoriesUsed } : {},
      ...pickFlags(flags, [
        "to",
        "goal",
        "summary",
        "scope",
        "outOfScope",
        "deliverable",
        "files",
        "confidence",
        "risks",
        "next",
        "feature",
        "phase",
        "updatePath"
      ])
    });
    if (!r.ok)
      throw r.error;
    return r.value;
  },
  "write-handoff-and-bundle": async ({ repoPath, flags, positionals }) => writeHandoffAndBundle({ repoPath, flags, positionals }),
  "write-review-result": async ({ repoPath, flags, positionals }) => {
    const rawDecision = flags.decision;
    const status = flags.status !== "open" ? flags.status ?? undefined : undefined;
    refuseIfReviewDecisionMissing(rawDecision, flags.scaffold, status);
    const verdict = resolveReviewVerdict(rawDecision);
    refuseIfTestAdequacyMissing(verdict, flags);
    const { notChecked, authorId, judgeId, selfApproval } = deriveReviewMetadataFields(flags);
    refuseIfSchemaInvalid("write-review-result", ReviewArtifactSchema.safeParse({
      decision: verdict,
      phase: flags.phase ?? undefined,
      feature: flags.feature ?? undefined,
      slice: flags.slice ?? undefined,
      findings: flags.findings ?? undefined,
      status,
      not_checked: notChecked.length > 0 ? notChecked : undefined,
      author_id: authorId,
      judge_id: judgeId,
      self_approval: selfApproval
    }));
    const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
    const r = await writeArtifact2(repoPath, "review-result", {
      title: flags.title || positionals.join(" ") || "Review Result",
      reviewer: flags.reviewer || flags.owner || "reviewer",
      decision: rawDecision ?? undefined,
      verdict,
      status,
      nonCode: flags.nonCode ?? undefined,
      findings: flags.findings ?? null,
      scaffold: flags.scaffold ?? undefined,
      notChecked: notChecked.length > 0 ? notChecked : undefined,
      authorId,
      judgeId,
      selfApproval,
      ...pickFlags(flags, [
        "summary",
        "evidence",
        "files",
        "risks",
        "next",
        "feature",
        "phase",
        "testSummary",
        "testSummarySkipReason",
        "validationEvidence",
        "updatePath"
      ])
    });
    if (!r.ok)
      throw r.error;
    return r.value;
  },
  "write-validation-plan": async ({ repoPath, flags, positionals }) => {
    const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
    const r = await writeArtifact2(repoPath, "validation-plan", {
      title: flags.title || positionals.join(" ") || "Validation Plan",
      validator: flags.validator || flags.owner || "verifier",
      owner: flags.owner || "dispatcher-session",
      ...pickFlags(flags, [
        "environment",
        "goal",
        "summary",
        "scope",
        "outOfScope",
        "evidence",
        "next",
        "feature",
        "phase"
      ])
    });
    if (!r.ok)
      throw r.error;
    return r.value;
  },
  "write-validation-result": async ({ repoPath, flags, positionals }) => {
    const { writeValidationResultArtifact: writeValidationResultArtifact2 } = await Promise.resolve().then(() => (init_validation_result_writer(), exports_validation_result_writer));
    const status = flags.status !== "open" ? flags.status ?? undefined : undefined;
    try {
      return await writeValidationResultArtifact2(repoPath, {
        title: flags.title || positionals.join(" ") || "Validation Result",
        validator: flags.validator || flags.owner || "verifier",
        decision: flags.decision ?? undefined,
        status,
        findings: flags.findings ?? null,
        scaffold: flags.scaffold ?? undefined,
        slice: flags.slice ?? undefined,
        validationEvidence: flags.validationEvidence ?? undefined,
        ...pickFlags(flags, [
          "environment",
          "goal",
          "summary",
          "evidence",
          "files",
          "risks",
          "next",
          "feature",
          "phase",
          "updatePath",
          "skipReason"
        ])
      });
    } catch (e) {
      process.stderr.write(`[crew] ${e.message}
`);
      process.exit(2);
    }
  },
  "write-deployment-check": async ({ repoPath, flags, positionals }) => {
    const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
    const r = await writeArtifact2(repoPath, "deployment-check", {
      title: flags.title || positionals.join(" ") || "Deployment Check",
      deployer: flags.deployer || flags.owner || "release-engineer",
      findings: flags.findings ?? null,
      ...pickFlags(flags, [
        "environment",
        "resource",
        "url",
        "revision",
        "decision",
        "goal",
        "summary",
        "evidence",
        "files",
        "risks",
        "next",
        "feature",
        "phase"
      ])
    });
    if (!r.ok)
      throw r.error;
    return r.value;
  },
  "write-final-synthesis": async ({ repoPath, flags, positionals }) => {
    if (flags.externalDeltas === null || flags.externalDeltas === undefined) {
      throw new Error("write-final-synthesis requires --external-deltas. Enumerate sibling-config changes the synthesis depends on (env var renames, terraform/helm updates, sibling-repo PRs, feature flags, DB migrations, IAM). Pass --external-deltas none explicitly if there are none. A silent default is how renamed env vars silently fall back to old defaults in prod.");
    }
    const { writeArtifact: writeArtifact2 } = await Promise.resolve().then(() => (init_write(), exports_write));
    const synthResult = await writeArtifact2(repoPath, "final-synthesis", {
      title: flags.title || positionals.join(" ") || "Final Synthesis",
      owner: flags.owner || "dispatcher-session",
      status: flags.status === "open" ? "completed" : flags.status ?? undefined,
      force: flags.force ?? undefined,
      ...pickFlags(flags, [
        "summary",
        "files",
        "evidence",
        "externalDeltas",
        "runSteps",
        "risks",
        "next",
        "feature",
        "phase"
      ])
    });
    if (!synthResult.ok)
      throw synthResult.error;
    const synthesis = synthResult.value;
    const costArtifact = await maybeEmitCostReport(repoPath, {
      runTitle: flags.title || positionals.join(" ") || null,
      feature: flags.feature,
      phase: flags.phase
    }, emitCostAdvise);
    return costArtifact ? { ...synthesis, costReport: costArtifact } : synthesis;
  },
  "cost-advise": async ({ repoPath, flags }) => {
    const { buildCostAdvisor: buildCostAdvisor2, renderCostAdvisorMarkdown: renderCostAdvisorMarkdown2 } = await Promise.resolve().then(() => (init_cost_advisor(), exports_cost_advisor));
    const advisor = await buildCostAdvisor2(repoPath, { limit: 10 });
    const md = renderCostAdvisorMarkdown2(advisor);
    const writePath = await writeCostAdviseArtifact(repoPath, md, advisor, {
      title: flags.title,
      feature: flags.feature,
      phase: flags.phase
    });
    return {
      target: advisor.target?.sliceId || advisor.target?.runTitle || null,
      recommendations: advisor.recommendations,
      aggregateFlags: advisor.aggregateFlags || [],
      baseline: advisor.baseline,
      reportsAnalyzed: advisor.reports.length,
      artifactPath: writePath
    };
  },
  "cost-slice": ({ repoPath, flags }) => costSliceHandler({ repoPath, flags }),
  "cost-watch": async ({ repoPath, flags }) => {
    const { buildCostWatch: buildCostWatch2, renderCostWatchReport: renderCostWatchReport2 } = await Promise.resolve().then(() => (init_cost_watch(), exports_cost_watch));
    const limit = flags.limit ? parseInt(flags.limit, 10) : undefined;
    const tokenCap = flags.tokenCap ? parseInt(flags.tokenCap, 10) : undefined;
    const data = await buildCostWatch2(repoPath, {
      ...limit !== undefined && Number.isFinite(limit) ? { limit } : {},
      ...tokenCap !== undefined && Number.isFinite(tokenCap) ? { perDispatchTokenCap: tokenCap } : {}
    });
    return renderCostWatchReport2(data);
  },
  "cost-setup": async ({ repoPath, flags }) => {
    const { parseFeatureOverrides: parseFeatureOverrides2, runCostSetup: runCostSetup2 } = await Promise.resolve().then(() => (init_cost_setup(), exports_cost_setup));
    const featuresFlag = typeof flags.features === "string" ? flags.features : null;
    const overrides = parseFeatureOverrides2(featuresFlag);
    return runCostSetup2(repoPath, overrides);
  },
  "features-list": async () => {
    const { listFeatures: listFeatures2 } = await Promise.resolve().then(() => (init_features_service(), exports_features_service));
    return { features: listFeatures2() };
  },
  "agent-stats": async ({ repoPath, flags }) => {
    const { aggregateAgentStats: aggregateAgentStats2, writeAgentStatsArtifact: writeAgentStatsArtifact2, windowSlug: windowSlug2 } = await Promise.resolve().then(() => (init_agent_stats_aggregator(), exports_agent_stats_aggregator));
    const rawWindow = flags.window ?? `last_n_slices:${process.env["CREW_AGENT_STATS_WINDOW"] ?? "10"}`;
    const windowMatch = /^last_n_slices:(\d+)$/.exec(rawWindow);
    if (!windowMatch) {
      process.stderr.write(`[crew] agent-stats: unsupported window spec "${rawWindow}". Expected last_n_slices:<N>.
`);
      process.exit(2);
    }
    const n = parseInt(windowMatch[1] ?? "10", 10);
    const window = { kind: "last_n_slices", n };
    const agentFilter = flags.agent ? [flags.agent] : undefined;
    const rows = await aggregateAgentStats2(agentFilter ? { repo: repoPath, window, agents: agentFilter } : { repo: repoPath, window });
    const artifactPath = await writeAgentStatsArtifact2(repoPath, rows, window);
    const slug = windowSlug2(window);
    const lines = [
      `Agent stats \u2014 window: ${slug} (${rows.length} agent(s))`,
      "",
      "Agent".padEnd(30) + "N".padStart(4) + "  pass%".padStart(7) + "  wallMs".padStart(9) + "  tokens".padStart(9) + "  rework%".padStart(10) + "  valfail%".padStart(11) + "  medDisp".padStart(10),
      "-".repeat(90)
    ];
    for (const r of rows) {
      lines.push(r.agent.padEnd(30) + String(r.sample_count).padStart(4) + `  ${(r.pass_rate * 100).toFixed(1)}%`.padStart(7) + `  ${r.mean_wall_ms}`.padStart(9) + `  ${r.mean_tokens}`.padStart(9) + `  ${(r.review_rework_rate * 100).toFixed(1)}%`.padStart(10) + `  ${(r.validation_fail_rate * 100).toFixed(1)}%`.padStart(11) + `  ${r.median_dispatches_to_pass}`.padStart(10));
    }
    lines.push("", `Artifact written: ${artifactPath}`);
    process.stdout.write(lines.join(`
`) + `
`);
    return artifactPath;
  },
  "agent-route": async ({ repoPath, flags }) => {
    const { loadAgentRegistry: loadAgentRegistry2, routeByTags: routeByTags2 } = await Promise.resolve().then(() => (init_agent_registry(), exports_agent_registry));
    const registry = await loadAgentRegistry2(repoPath);
    const query = {};
    if (flags.role)
      query.role = flags.role;
    if (flags.surface)
      query.surface = flags.surface;
    if (flags.stack)
      query.stack = flags.stack;
    if (flags.concern)
      query.concern = flags.concern;
    if (flags.lens)
      query.lens = flags.lens;
    if (flags.scope)
      query.scope = flags.scope;
    const matches2 = routeByTags2(registry, query);
    const askedFilters = Object.values(query).filter(Boolean).length;
    const lines = [
      `Agent route \u2014 query: ${askedFilters === 0 ? "(none \u2014 listing all)" : JSON.stringify(query)} (${matches2.length} match(es))`,
      "",
      "Rank  Score  Agent".padEnd(60) + "Matched dimensions",
      "-".repeat(110)
    ];
    matches2.slice(0, 20).forEach((m, i) => {
      lines.push(`${String(i + 1).padStart(4)}  ${String(m.score).padStart(5)}  ${m.entry.name.padEnd(40)} ${m.matched.join(", ")}`);
    });
    if (matches2.length > 20)
      lines.push("", `... ${matches2.length - 20} more not shown`);
    process.stdout.write(lines.join(`
`) + `
`);
    return { registryCount: registry.length, matchCount: matches2.length };
  },
  "gepa-history": async ({ repoPath, flags, positionals }) => {
    const { runGepaHistoryCmd: runGepaHistoryCmd2 } = await Promise.resolve().then(() => (init_history(), exports_history));
    const rawArgs = [...positionals];
    if (flags.gepaSource)
      rawArgs.push("--source", flags.gepaSource);
    if (flags.limit)
      rawArgs.push("--limit", flags.limit);
    const result2 = await runGepaHistoryCmd2(repoPath, rawArgs);
    if (result2.stdout)
      process.stdout.write(result2.stdout);
    if (result2.stderr)
      process.stderr.write(result2.stderr);
    if (result2.exitCode !== 0)
      process.exit(result2.exitCode);
    return result2.stdout.trim();
  },
  "gepa-eval": async ({ repoPath, flags, positionals }) => {
    const { runGepaEvalCmd: runGepaEvalCmd2 } = await Promise.resolve().then(() => (init_eval(), exports_eval));
    const rawArgs = [...positionals];
    if (flags.live === true)
      rawArgs.push("--live");
    if (flags.validate === true)
      rawArgs.push("--validate");
    if (typeof flags.judge === "string" && flags.judge)
      rawArgs.push("--judge", flags.judge);
    if (typeof flags.split === "string" && flags.split)
      rawArgs.push("--split", flags.split);
    const result2 = await runGepaEvalCmd2(repoPath, rawArgs);
    if (result2.stdout)
      process.stdout.write(result2.stdout);
    if (result2.stderr)
      process.stderr.write(result2.stderr);
    if (result2.exitCode !== 0)
      process.exit(result2.exitCode);
    return result2.stdout.trim();
  },
  "gepa-resume": async ({ repoPath, positionals }) => {
    const { runGepaResumeCmdExtended: runGepaResumeCmdExtended2 } = await Promise.resolve().then(() => (init_gepa_killswitch_cmds(), exports_gepa_killswitch_cmds));
    const result2 = await runGepaResumeCmdExtended2(repoPath, positionals);
    if (result2.stdout)
      process.stdout.write(result2.stdout);
    if (result2.stderr)
      process.stderr.write(result2.stderr);
    if (result2.exitCode !== 0)
      process.exit(result2.exitCode);
    return result2.stdout.trim();
  },
  "gepa-invalidate": async ({ repoPath, flags, positionals }) => {
    const { runGepaInvalidateCmd: runGepaInvalidateCmd2 } = await Promise.resolve().then(() => (init_gepa_killswitch_cmds(), exports_gepa_killswitch_cmds));
    const rawArgs = [...positionals];
    if (typeof flags.agent === "string" && flags.agent)
      rawArgs.push("--agent", flags.agent);
    if (typeof flags.since === "string" && flags.since)
      rawArgs.push("--since", flags.since);
    if (typeof flags.tag === "string" && flags.tag)
      rawArgs.push("--tag", flags.tag);
    const result2 = await runGepaInvalidateCmd2(repoPath, rawArgs);
    if (result2.stdout)
      process.stdout.write(result2.stdout);
    if (result2.stderr)
      process.stderr.write(result2.stderr);
    if (result2.exitCode !== 0)
      process.exit(result2.exitCode);
    return result2.stdout.trim();
  },
  "gepa-revert": async ({ repoPath, flags, positionals }) => {
    const { runGepaRevertCmd: runGepaRevertCmd2 } = await Promise.resolve().then(() => (init_gepa_killswitch_cmds(), exports_gepa_killswitch_cmds));
    const rawArgs = [...positionals];
    if (typeof flags.agent === "string" && flags.agent)
      rawArgs.push("--agent", flags.agent);
    const result2 = await runGepaRevertCmd2(repoPath, rawArgs);
    if (result2.stdout)
      process.stdout.write(result2.stdout);
    if (result2.stderr)
      process.stderr.write(result2.stderr);
    if (result2.exitCode !== 0)
      process.exit(result2.exitCode);
    return result2.stdout.trim();
  },
  "gepa-thaw": async ({ repoPath, positionals }) => {
    const { runGepaThawCmd: runGepaThawCmd2 } = await Promise.resolve().then(() => (init_gepa_killswitch_cmds(), exports_gepa_killswitch_cmds));
    const result2 = await runGepaThawCmd2(repoPath, positionals);
    if (result2.stdout)
      process.stdout.write(result2.stdout);
    if (result2.stderr)
      process.stderr.write(result2.stderr);
    if (result2.exitCode !== 0)
      process.exit(result2.exitCode);
    return result2.stdout.trim();
  },
  "recall-block": async ({ repoPath, flags }) => {
    const { buildRecallBlock: buildRecallBlock2 } = await Promise.resolve().then(() => (init_inject_recall(), exports_inject_recall));
    const tags = splitCsv(flags.tags);
    const projects = splitCsv(flags.project);
    const project = projects.length > 1 ? projects : projects[0] ?? undefined;
    const block = await buildRecallBlock2({
      repoPath,
      ...typeof flags.agent === "string" && flags.agent ? { agent: flags.agent } : {},
      ...tags.length > 0 ? { tags } : {},
      ...project !== undefined ? { project } : {}
    });
    return { block };
  },
  "profile-block": async ({ repoPath, flags }) => {
    const { buildHandoffDigest: buildHandoffDigest2 } = await Promise.resolve().then(() => (init_handoff_digest(), exports_handoff_digest));
    const { loadMemoryConfig: loadMemoryConfig2 } = await Promise.resolve().then(() => (init_inject_recall(), exports_inject_recall));
    const { writeInjectedAtoms: writeInjectedAtoms2 } = await Promise.resolve().then(() => (init_injected_atoms(), exports_injected_atoms));
    const agent = typeof flags.agent === "string" ? flags.agent : "";
    if (!agent)
      return { block: "", injectedIds: [] };
    const projects = splitCsv(flags.project);
    const project = projects.length > 1 ? projects : projects[0] ?? undefined;
    const { block, ids: injectedIds } = await buildHandoffDigest2({
      repoPath,
      agent,
      ...project !== undefined ? { project } : {}
    });
    if (typeof flags.runId === "string" && flags.runId) {
      await writeInjectedAtoms2(repoPath, flags.runId, injectedIds);
    }
    const rawMemory = await loadMemoryConfig2(repoPath);
    const injectVia = rawMemory?.profile?.injectVia;
    return { block: injectVia === "command" ? block : "", injectedIds };
  },
  "profile-feedback": async ({ repoPath, flags }) => {
    const { submitOutcomeFeedback: submitOutcomeFeedback2 } = await Promise.resolve().then(() => (init_profile_feedback(), exports_profile_feedback));
    const runId = typeof flags.runId === "string" ? flags.runId : "";
    const outcome = flags.outcome === "pass" ? "pass" : "fail";
    if (!runId)
      return { credited: [] };
    return submitOutcomeFeedback2({ repoPath, runId, outcome });
  },
  "memory-drift-check": async ({ repoPath, flags }) => {
    const { resolveAstramemRemote: resolveAstramemRemote2 } = await Promise.resolve().then(() => (init_dist4(), exports_dist));
    const { checkDrift: checkDrift2 } = await init_drift_check().then(() => exports_drift_check);
    const remote = await resolveAstramemRemote2();
    if (!remote) {
      return {
        paired: false,
        message: "astramem is unpaired \u2014 no drift check possible (nothing to compare against)."
      };
    }
    const windowDays = typeof flags.window === "string" ? Number(flags.window) : undefined;
    const report = await checkDrift2(repoPath, remote, {
      ...windowDays !== undefined && Number.isFinite(windowDays) ? { windowDays } : {}
    });
    return { paired: true, provider: remote.name, ...report };
  },
  "resolve-model": async ({ repoPath, flags }) => {
    const phase = typeof flags.phase === "string" ? flags.phase : null;
    if (!phase) {
      throw new Error("resolve-model refused: --phase <build|architect|...> is required.");
    }
    const shape = typeof flags.shape === "string" ? flags.shape : null;
    const { resolveDispatchModel: resolveDispatchModel2 } = await Promise.resolve().then(() => (init_resolve_model(), exports_resolve_model));
    const { isEnabled: isEnabled2, readCrewConfig: readCrewConfig2 } = await Promise.resolve().then(() => (init_features_service(), exports_features_service));
    const fs38 = await import("fs/promises");
    const pathMod = await import("path");
    let config = null;
    try {
      const raw = await fs38.readFile(pathMod.join(repoPath, ".claude", "loop.json"), "utf8");
      config = JSON.parse(raw);
    } catch {
      config = null;
    }
    const crewConfig = await readCrewConfig2(repoPath);
    const modelRoutingEnabled = isEnabled2("model-routing", crewConfig);
    return resolveDispatchModel2(phase, shape, config, modelRoutingEnabled) ?? "inherit";
  },
  "repair-check": async ({ flags }) => {
    const { createRepairSignatureTracker: createRepairSignatureTracker2, normalizeSignature: normalizeSignature2 } = await Promise.resolve().then(() => exports_repair_signature);
    const failureOutput = typeof flags.failureOutput === "string" ? flags.failureOutput : null;
    if (!failureOutput) {
      throw new Error("repair-check refused: --failure-output <text> is required.");
    }
    const tracker = createRepairSignatureTracker2();
    const prevSignature = typeof flags.prevSignature === "string" ? flags.prevSignature : null;
    if (prevSignature)
      tracker.shouldStop(prevSignature);
    const signature = normalizeSignature2(failureOutput);
    const shouldStop = tracker.shouldStop(signature);
    if (shouldStop) {
      console.error(`repair-check: same failure signature repeated \u2014 stop retrying and escalate instead (signature: "${signature}")`);
    }
    return { signature, shouldStop };
  }
};
async function runCrew(argv) {
  try {
    const { command, helpTarget, flags, positionals } = parseArgs(argv);
    const repoPath = path47.resolve(normalizeMsysPath(flags.repo));
    if (command === "help") {
      return { code: 0, output: usage(helpTarget) };
    }
    const handler = COMMANDS[command];
    if (!handler) {
      return { code: 1, output: `Unknown command: ${command}` };
    }
    const result2 = await handler({ repoPath, flags, positionals });
    const output = typeof result2 === "string" ? result2 : JSON.stringify(result2, null, 2);
    return { code: 0, output };
  } catch (error) {
    return { code: 1, output: error.message };
  }
}
async function main() {
  const { code, output } = await runCrew(process.argv.slice(2));
  if (code === 0) {
    console.log(output);
  } else {
    console.error(output);
    process.exitCode = 1;
  }
}
var isDirectRun = process.argv[1] && import.meta.url === pathToFileURL2(path47.resolve(process.argv[1])).href;
if (isDirectRun) {
  main();
}
export {
  runCrew
};
