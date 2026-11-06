#!/usr/bin/env node
// @bun

// crew/hooks/lib/pre-tool-use-artifact-lock.mts
import fs2 from "fs/promises";
import path2 from "path";

// crew/scripts/lib/features-service.mts
import fs from "fs/promises";
import path from "path";
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

// crew/hooks/lib/warn-first-flag.mts
function resolveBlockMode(config, featureName) {
  if (config === null || typeof config !== "object" || !("features" in config) || config["features"] === null || typeof config["features"] !== "object") {
    return false;
  }
  const features = config["features"];
  const entry = features[featureName];
  if (entry === null || typeof entry !== "object" || !("enabled" in entry)) {
    return false;
  }
  const val = entry["enabled"];
  return typeof val === "boolean" ? val : false;
}

// crew/hooks/lib/pre-tool-use-artifact-lock.mts
var ARTIFACT_LOCK_FEATURE = "artifact-lock";
var LOCK_DIR = [".claude", "state", "loop", "artifact-locks"];
var DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;
function normalizeLockPath(p) {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}
function toRepoRelative(cwd, filePath) {
  const abs = path2.isAbsolute(filePath) ? filePath : path2.resolve(cwd, filePath);
  return normalizeLockPath(path2.relative(cwd, abs));
}
function isWellFormedLock(obj) {
  if (typeof obj !== "object" || obj === null)
    return false;
  const o = obj;
  return typeof o["sliceId"] === "string" && Array.isArray(o["lockedPaths"]) && o["lockedPaths"].every((p) => typeof p === "string") && typeof o["lockedBy"] === "string" && typeof o["createdAt"] === "string" && (o["expiresAt"] === undefined || typeof o["expiresAt"] === "string");
}
function isLockExpired(lock, nowMs) {
  if (lock.expiresAt !== undefined) {
    const exp = Date.parse(lock.expiresAt);
    if (!Number.isNaN(exp))
      return exp < nowMs;
  }
  const created = Date.parse(lock.createdAt);
  if (Number.isNaN(created))
    return true;
  return nowMs - created > DEFAULT_TTL_MS;
}
async function readActiveLocks(cwd, nowMs = Date.now()) {
  const dir = path2.join(cwd, ...LOCK_DIR);
  let names;
  try {
    names = (await fs2.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const locks = [];
  for (const name of names) {
    try {
      const raw = await fs2.readFile(path2.join(dir, name), "utf8");
      const obj = JSON.parse(raw);
      if (!isWellFormedLock(obj))
        continue;
      if (isLockExpired(obj, nowMs))
        continue;
      locks.push(obj);
    } catch {
      continue;
    }
  }
  return locks;
}
function findMatchingLock(locks, repoRelativePath) {
  for (const lock of locks) {
    for (const lockedPath of lock.lockedPaths) {
      if (normalizeLockPath(lockedPath) === repoRelativePath) {
        return { lock, matchedPath: lockedPath };
      }
    }
  }
  return null;
}
var FILE_PATH_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);
function parseInput(raw) {
  try {
    const obj = JSON.parse(raw);
    const toolName = obj["tool_name"];
    const toolInput = obj["tool_input"];
    if (typeof toolInput !== "object" || toolInput === null)
      return null;
    const inputRecord = toolInput;
    let filePath;
    if (typeof toolName === "string" && FILE_PATH_TOOLS.has(toolName)) {
      filePath = inputRecord["file_path"];
    } else if (toolName === "NotebookEdit") {
      filePath = inputRecord["notebook_path"];
    } else {
      return null;
    }
    if (typeof filePath !== "string" || filePath === "")
      return null;
    const cwd = typeof obj["cwd"] === "string" ? obj["cwd"] : process.cwd();
    const sessionId = typeof obj["session_id"] === "string" ? obj["session_id"] : "";
    return { sessionId, cwd, filePath };
  } catch {
    return null;
  }
}
async function logEvent(repoPath, code, sessionId, detail) {
  try {
    const dir = path2.join(repoPath, ".claude", "logs");
    await fs2.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: `artifact-lock:${code}`,
      session_id: sessionId,
      detail
    });
    await fs2.appendFile(path2.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}
async function runArtifactLockHook(raw) {
  const input = parseInput(raw);
  if (input === null)
    return null;
  const { sessionId, cwd, filePath } = input;
  try {
    const locks = await readActiveLocks(cwd);
    if (locks.length === 0)
      return null;
    const relPath = toRepoRelative(cwd, filePath);
    const match = findMatchingLock(locks, relPath);
    if (match === null)
      return null;
    const config = await readCrewConfig(cwd);
    const blockMode = resolveBlockMode(config, ARTIFACT_LOCK_FEATURE);
    const reason = `[crew:artifact-lock] "${relPath}" is locked by "${match.lock.lockedBy}" for ` + `${match.lock.sliceId}. Wait for the lock to clear (dispatch prune / slice-close removes ` + `it) or coordinate with the lock owner before editing this path. (ported from ` + `dev-team#257 piece 2 / runner-plugin FEAT-264 SLICE-4.)`;
    await logEvent(cwd, blockMode ? "denied" : "warned", sessionId, reason);
    if (!blockMode) {
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow"
        },
        systemMessage: reason
      });
    }
    return JSON.stringify({ decision: "block", reason });
  } catch (err) {
    await logEvent(cwd, "internal-error", sessionId, String(err));
    return null;
  }
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

// crew/hooks/pre-tool-use-artifact-lock.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
async function main() {
  const raw = await readStdin();
  const out = await runArtifactLockHook(raw);
  if (out !== null)
    process.stdout.write(out);
}
main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-tool-use-artifact-lock", err);
  process.exit(0);
});
