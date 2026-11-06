#!/usr/bin/env node
// @bun

// crew/hooks/lib/record-edit.mts
import fs3 from "fs/promises";
import path3 from "path";

// crew/scripts/lib/cost-hygiene/state.mts
import fs from "fs/promises";
import path from "path";
var STATE_DIR_REL = path.join(".claude", "state", "cost-hygiene");
function statePath(repoPath, sessionId) {
  return path.join(repoPath, STATE_DIR_REL, `${sessionId}.json`);
}
function emptyState(sessionId) {
  const nowIso = new Date().toISOString();
  return {
    session_id: sessionId,
    first_seen: nowIso,
    last_seen: nowIso,
    total_bytes: 0,
    entries: {}
  };
}
async function saveSession(repoPath, sessionId, state) {
  const file = statePath(repoPath, sessionId);
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const tempFile = `${file}.tmp.${process.pid}`;
  state.last_seen = new Date().toISOString();
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tempFile, file);
}
async function loadSession(repoPath, sessionId) {
  await cleanupStaleTempFiles(repoPath, sessionId);
  const file = statePath(repoPath, sessionId);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && typeof parsed.session_id === "string" && typeof parsed.entries === "object" && parsed.entries !== null) {
      return parsed;
    }
    return emptyState(sessionId);
  } catch {
    return emptyState(sessionId);
  }
}
var PER_FILE_CAP_BYTES = 50 * 1024;
function recordEdit(state, filePath, mtime, now) {
  const existing = state.entries[filePath];
  if (existing) {
    existing.last_edit_at = now;
    existing.mtime_at_last_edit = mtime;
  } else {
    state.entries[filePath] = {
      read_count: 0,
      first_read_at: now,
      last_read_at: now,
      mtime_at_last_read: mtime,
      size_at_last_read: 0,
      content_bytes: 0,
      content: null,
      last_edit_at: now,
      mtime_at_last_edit: mtime
    };
  }
  return state;
}
var SESSION_CAP_BYTES = 2000000;
function evictLRU(state, protectedPath = null) {
  if (state.total_bytes <= SESSION_CAP_BYTES)
    return state;
  const entries = Object.entries(state.entries).filter(([p]) => p !== protectedPath).sort(([, a], [, b]) => Date.parse(a.last_read_at) - Date.parse(b.last_read_at));
  for (const [evictPath, entry] of entries) {
    if (state.total_bytes <= SESSION_CAP_BYTES)
      break;
    state.total_bytes -= entry.content_bytes;
    delete state.entries[evictPath];
  }
  return state;
}
var TEMP_FILE_MAX_AGE_MS = 60000;
async function cleanupStaleTempFiles(repoPath, sessionId) {
  const dir = path.join(repoPath, STATE_DIR_REL);
  let files;
  try {
    files = await fs.readdir(dir);
  } catch {
    return;
  }
  const prefix = `${sessionId}.json.tmp.`;
  const cutoff = Date.now() - TEMP_FILE_MAX_AGE_MS;
  for (const name of files) {
    if (!name.startsWith(prefix))
      continue;
    const fullPath = path.join(dir, name);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(fullPath);
      }
    } catch {}
  }
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

// crew/hooks/lib/record-edit.mts
async function logEvent(repoPath, code, sessionId, detail) {
  try {
    const dir = path3.join(repoPath, ".claude", "logs");
    await fs3.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: `cost-hygiene:${code}`,
      session_id: sessionId,
      detail
    });
    await fs3.appendFile(path3.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}
function parseInput(raw) {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === "object" && obj !== null && typeof obj.session_id === "string" && typeof obj.cwd === "string" && typeof obj.tool_input === "object" && obj.tool_input !== null && typeof obj.tool_input.file_path === "string") {
      return {
        session_id: obj.session_id,
        file_path: obj.tool_input.file_path,
        cwd: obj.cwd
      };
    }
    return null;
  } catch {
    return null;
  }
}
async function readFileMtime(absPath) {
  try {
    const stat = await fs3.stat(absPath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}
async function loadState(cwd, sessionId, onError) {
  try {
    return await loadSession(cwd, sessionId);
  } catch (err) {
    await onError(String(err));
    return null;
  }
}
async function persistState(state, cwd, sessionId, onError) {
  try {
    await saveSession(cwd, sessionId, state);
  } catch (err) {
    await onError(String(err));
  }
}
async function runRecordEditHook(raw) {
  const input = parseInput(raw);
  if (input === null)
    return null;
  const { session_id, file_path, cwd } = input;
  const config = await readCrewConfig(cwd);
  if (!isEnabled("cost-hygiene", config))
    return null;
  if (!isEnabled("redundant-read-stop", config))
    return null;
  const absPath = path3.resolve(cwd, file_path);
  const mtimeIso = await readFileMtime(absPath);
  if (mtimeIso === null)
    return null;
  const state = await loadState(cwd, session_id, (msg) => logEvent(cwd, "state-load-fail", session_id, msg));
  if (state === null)
    return null;
  const updated = evictLRU(recordEdit(state, absPath, mtimeIso, new Date().toISOString()), absPath);
  await persistState(updated, cwd, session_id, (msg) => logEvent(cwd, "state-write-fail", session_id, msg));
  return null;
}

// crew/hooks/hook-error.mts
import fs4 from "fs/promises";
import path4 from "path";
async function logHookError(repoPath, hookName, error) {
  try {
    const dir = path4.join(repoPath, ".claude", "logs");
    await fs4.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: "hook_error",
      hook: hookName,
      error: String(error)
    });
    await fs4.appendFile(path4.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}

// crew/hooks/record-edit.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
async function main() {
  const raw = await readStdin();
  await runRecordEditHook(raw);
}
main().catch(async (err) => {
  await logHookError(process.cwd(), "record-edit", err);
  process.exit(0);
});
