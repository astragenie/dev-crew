#!/usr/bin/env node
// @bun

// crew/hooks/lib/check-subagent-return.mts
import fs3 from "fs/promises";
import path5 from "path";

// crew/scripts/lib/subagent-return/check.mts
var ARTIFACT_PATH_RE = /\.claude[\\/]artifacts[\\/]crew[\\/](?:handoffs|reviews|validations|deployments|runs|cost|cost-insights|agents)[\\/][^\s)"']+\.md/;
function hasArtifactPath(body) {
  return ARTIFACT_PATH_RE.test(body);
}
function checkSubagentReturn({ body, threshold }) {
  const byteLen = Buffer.byteLength(body, "utf8");
  if (byteLen <= threshold) {
    return { warnings: [] };
  }
  if (hasArtifactPath(body)) {
    return { warnings: [] };
  }
  return {
    warnings: [
      `subagent return body is ${byteLen} bytes with no handoff artifact path; write the report to .claude/artifacts/crew/handoffs/<ts>-handoff-*.md and return only the absolute path (cost-discipline rule #2)`
    ]
  };
}

// crew/scripts/lib/subagent-return/incomplete-detector.mts
var TERMINAL_STATUS_RE = /^(DONE|BLOCKED|HELP|HELP-REQUEST|IN-PROGRESS)\s*:/im;
function hasTerminalStatusMarker(body) {
  return TERMINAL_STATUS_RE.test(body);
}
function detectSubagentIncomplete(input) {
  const { body } = input;
  if (hasArtifactPath(body))
    return false;
  if (hasTerminalStatusMarker(body))
    return false;
  return true;
}

// crew/scripts/lib/features-service.mts
import fs from "fs/promises";
import path from "path";
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
  const configPath = path.join(cwd, ".claude", "crew.json");
  try {
    const content = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return {};
  }
}

// crew/scripts/lib/dispatch-timing.mts
import path2 from "path";

// crew/node_modules/@astragenie/plugin-std/dist/jsonl.js
import { appendFile, mkdir, readFile, rename, stat } from "fs/promises";
import { dirname } from "path";

// crew/node_modules/@astragenie/plugin-std/dist/errors.js
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

// crew/node_modules/@astragenie/plugin-std/dist/jsonl.js
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
async function writeLines(path2, lines) {
  try {
    await mkdir(dirname(path2), { recursive: true });
    await appendFile(path2, lines, "utf8");
  } catch (cause) {
    throw new TransientError(`jsonl: append failed for ${path2}`, {
      code: "E_JSONL_WRITE",
      cause
    });
  }
}
async function append(path2, record) {
  await writeLines(path2, serializeLines([record]));
}

// crew/scripts/lib/dispatch-timing.mts
function recordDispatchEnd(handle, end) {
  const row = {
    runId: handle.runId,
    sliceId: handle.sliceId,
    agent: handle.agent,
    model: handle.model,
    startMs: handle.startMs,
    wallMs: Date.now() - handle.startMs,
    ...end
  };
  const logPath = process.env.CREW_DISPATCH_TIMING_LOG ?? path2.join(process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd(), ".claude", "logs", "dispatch-timing.jsonl");
  append(logPath, row).catch(() => {
    return;
  });
}

// crew/hooks/lib/dispatch-handle-store.mts
import fs2 from "fs/promises";
import path3 from "path";
function storeDir(pluginRoot) {
  return path3.join(pluginRoot, ".claude", "state", "crew", "dispatch-timing");
}
function storePath(pluginRoot, sessionId) {
  const safe = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return path3.join(storeDir(pluginRoot), `${safe}.json`);
}
async function loadAndDeleteDispatchHandle(sessionId, pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"] ?? process.cwd()) {
  if (sessionId === "")
    return null;
  const file = storePath(pluginRoot, sessionId);
  let raw;
  try {
    raw = await fs2.readFile(file, "utf-8");
  } catch {
    return null;
  }
  try {
    await fs2.unlink(file);
  } catch {}
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

// crew/scripts/lib/memory/capture-learning.mts
import { appendFile as appendFile2, mkdir as mkdir2 } from "fs/promises";
import path4 from "path";
var LEARNINGS_PATH = [".claude", "artifacts", "loop", "learnings.jsonl"];
var MAX_SUMMARY_LENGTH = 280;
async function appendJsonlEntry(repoPath, segments, entry) {
  try {
    const targetPath = path4.join(repoPath, ...segments);
    await mkdir2(path4.dirname(targetPath), { recursive: true });
    await appendFile2(targetPath, `${JSON.stringify(entry)}
`, { flag: "a" });
  } catch {}
}
async function captureFailureLearning(repoPath, entry) {
  const ts = new Date;
  const summary = entry.summary.slice(0, MAX_SUMMARY_LENGTH);
  const compactTs = ts.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const keyScope = entry.tags?.[0] ?? entry.agent ?? "unknown";
  await appendJsonlEntry(repoPath, LEARNINGS_PATH, {
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

// crew/hooks/lib/check-subagent-return.mts
async function logEvent(repoPath, code, sessionId, detail) {
  try {
    const dir = path5.join(repoPath, ".claude", "logs");
    await fs3.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: `subagent-return:${code}`,
      session_id: sessionId,
      detail
    });
    await fs3.appendFile(path5.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}
function parseUsageMetrics(body) {
  const result = { totalTokens: 0, toolUses: 0, durationMs: 0 };
  const usageMatch = body.match(/<usage>([\s\S]*?)<\/usage>/);
  if (usageMatch === null)
    return result;
  const block = usageMatch[1] ?? "";
  const tokensMatch = block.match(/total_tokens:\s*(\d+)/);
  if (tokensMatch)
    result.totalTokens = parseInt(tokensMatch[1], 10);
  const toolUsesMatch = block.match(/tool_uses:\s*(\d+)/);
  if (toolUsesMatch)
    result.toolUses = parseInt(toolUsesMatch[1], 10);
  const durationMatch = block.match(/duration_ms:\s*(\d+)/);
  if (durationMatch)
    result.durationMs = parseInt(durationMatch[1], 10);
  return result;
}
function nonEmptyStringField(obj, key) {
  const value = obj[key];
  if (typeof value !== "string")
    return null;
  return value.length > 0 ? value : null;
}
function extractBody(toolResponse) {
  if (toolResponse === null || toolResponse === undefined)
    return null;
  if (typeof toolResponse === "string") {
    return toolResponse.length > 0 ? toolResponse : null;
  }
  if (typeof toolResponse !== "object")
    return null;
  const obj = toolResponse;
  return nonEmptyStringField(obj, "content") ?? nonEmptyStringField(obj, "body");
}
function parseInput(raw) {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === "object" && obj !== null && typeof obj.session_id === "string" && typeof obj.cwd === "string" && typeof obj.tool_name === "string") {
      const body = extractBody(obj.tool_response);
      if (body === null) {
        return null;
      }
      return {
        session_id: obj.session_id,
        cwd: obj.cwd,
        tool_name: obj.tool_name,
        body
      };
    }
    return null;
  } catch {
    return null;
  }
}
var DEFAULT_INLINE_THRESHOLD_BYTES = 512;
function readConfigThreshold(config) {
  if (!config || typeof config !== "object")
    return;
  const features = config.features;
  if (!features || typeof features !== "object")
    return;
  const feat = features["subagent-inline-warn"];
  if (!feat || typeof feat !== "object")
    return;
  const value = feat.threshold;
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : undefined;
}
async function runCheckSubagentReturnHook(raw) {
  const input = parseInput(raw);
  if (input === null)
    return null;
  const { session_id, cwd, body } = input;
  const config = await readCrewConfig(cwd);
  if (!isEnabled("subagent-inline-warn", config))
    return null;
  const threshold = readConfigThreshold(config) ?? DEFAULT_INLINE_THRESHOLD_BYTES;
  const { warnings } = checkSubagentReturn({ body, threshold });
  const handle = await loadAndDeleteDispatchHandle(session_id);
  if (handle !== null) {
    const usageMetrics = parseUsageMetrics(body);
    recordDispatchEnd(handle, {
      toolCalls: usageMetrics.toolUses > 0 ? { Total: usageMetrics.toolUses } : {},
      bashDurationMs: 0,
      skillLoadCount: 0,
      tokenIn: usageMetrics.totalTokens,
      tokenOut: 0
    });
  }
  if (warnings.length > 0) {
    const warning = warnings[0] ?? "";
    await logEvent(cwd, "inline-return-warn", session_id, warning);
    await captureFailureLearning(cwd, {
      severity: "medium",
      summary: warning,
      tags: ["inline-return-warn"],
      source: "inline-return-warn"
    });
    if (detectSubagentIncomplete({ body })) {
      const detail = "oversized pathless return with no terminal status marker";
      await logEvent(cwd, "subagent-incomplete", session_id, detail);
      await captureFailureLearning(cwd, {
        severity: "medium",
        summary: detail,
        tags: ["subagent-incomplete"],
        source: "subagent-incomplete"
      });
    }
    return JSON.stringify({ decision: "approve", systemMessage: warnings.join(`
`) });
  }
  return null;
}

// crew/hooks/hook-error.mts
import fs4 from "fs/promises";
import path6 from "path";
async function logHookError(repoPath, hookName, error) {
  try {
    const dir = path6.join(repoPath, ".claude", "logs");
    await fs4.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: "hook_error",
      hook: hookName,
      error: String(error)
    });
    await fs4.appendFile(path6.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}

// crew/hooks/check-subagent-return.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
async function main() {
  const raw = await readStdin();
  const out = await runCheckSubagentReturnHook(raw);
  if (out !== null)
    process.stdout.write(out);
}
main().catch(async (err) => {
  await logHookError(process.cwd(), "check-subagent-return", err);
  process.exit(0);
});
