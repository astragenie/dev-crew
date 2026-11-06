#!/usr/bin/env node
// @bun

// crew/hooks/lib/dispatch-timing-pre-tap.mts
import fs2 from "fs/promises";
import path2 from "path";

// crew/scripts/lib/dispatch-timing.mts
function recordDispatchStart(meta) {
  return { ...meta, startMs: Date.now() };
}

// crew/hooks/lib/dispatch-handle-store.mts
import fs from "fs/promises";
import path from "path";
function storeDir(pluginRoot) {
  return path.join(pluginRoot, ".claude", "state", "crew", "dispatch-timing");
}
function storePath(pluginRoot, sessionId) {
  const safe = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return path.join(storeDir(pluginRoot), `${safe}.json`);
}
async function persistDispatchHandle(sessionId, handle, pluginRoot = process.env["CLAUDE_PLUGIN_ROOT"] ?? process.cwd()) {
  if (sessionId === "")
    return;
  const file = storePath(pluginRoot, sessionId);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(handle) + `
`, "utf-8");
}

// crew/hooks/lib/dispatch-timing-pre-tap.mts
function parseAgentPreInput(raw) {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj["tool_name"] !== "string" || obj["tool_name"] !== "Agent") {
      return null;
    }
    const toolInput = obj["tool_input"];
    if (typeof toolInput !== "object" || toolInput === null) {
      return null;
    }
    const ti = toolInput;
    const session_id = typeof obj["session_id"] === "string" ? obj["session_id"] : "";
    const subagent_type = typeof ti["subagent_type"] === "string" ? ti["subagent_type"] : "unknown";
    const description = typeof ti["description"] === "string" ? ti["description"] : "";
    return { session_id, subagent_type, description };
  } catch {
    return null;
  }
}
async function lookupAgentModel(subagentType) {
  const name = subagentType.includes(":") ? subagentType.split(":").pop() : subagentType;
  const candidates = [`agents/${name}.md`, `agents/3rdparty/${name}.md`];
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
  for (const rel of candidates) {
    const abs = path2.join(pluginRoot, rel);
    try {
      const content = await fs2.readFile(abs, "utf-8");
      const m = content.match(/^model:\s*(\S+)/m);
      if (m)
        return m[1] ?? "unknown";
    } catch {}
  }
  return "unknown";
}
async function resolveRunContext(pluginRoot) {
  try {
    const statePath = path2.join(pluginRoot, ".claude", "state", "crew", "workflow-state.json");
    const raw = await fs2.readFile(statePath, "utf-8");
    const obj = JSON.parse(raw);
    const currentRun = obj["currentRun"];
    const runId = typeof currentRun?.["runId"] === "string" ? currentRun["runId"] : "unknown";
    const sliceId = typeof currentRun?.["sliceId"] === "string" ? currentRun["sliceId"] : "unknown";
    return { runId, sliceId };
  } catch {
    return { runId: "unknown", sliceId: "unknown" };
  }
}
async function runDispatchTimingPreTap(raw, env) {
  if (env["CREW_DISPATCH_TIMING_LOG"] === "0")
    return null;
  const parsed = parseAgentPreInput(raw);
  if (parsed === null)
    return null;
  const { session_id, subagent_type } = parsed;
  const pluginRoot = env["CLAUDE_PLUGIN_ROOT"] ?? process.cwd();
  const [{ runId, sliceId }, model] = await Promise.all([
    resolveRunContext(pluginRoot),
    lookupAgentModel(subagent_type)
  ]);
  const handle = recordDispatchStart({
    runId,
    sliceId,
    agent: subagent_type,
    model
  });
  await persistDispatchHandle(session_id, handle, pluginRoot);
  return null;
}

// crew/hooks/hook-error.mts
import fs3 from "fs/promises";
import path3 from "path";
async function logHookError(repoPath, hookName, error) {
  try {
    const dir = path3.join(repoPath, ".claude", "logs");
    await fs3.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: "hook_error",
      hook: hookName,
      error: String(error)
    });
    await fs3.appendFile(path3.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}

// crew/hooks/pre-tool-use-agent.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
async function main() {
  if (process.env["CREW_DISPATCH_TIMING_LOG"] === "0") {
    process.stdin.resume();
    return;
  }
  const raw = await readStdin();
  await runDispatchTimingPreTap(raw, process.env);
}
main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-tool-use-agent", err);
  process.exit(0);
});
