// @bun
// src/scripts/watch-tick.mts
import path8 from "path";
import { fileURLToPath } from "url";

// src/scripts/lib/watch/sweep.mts
import { execFile as execFileCallback } from "child_process";
import { promisify } from "util";

// src/scripts/lib/watch/state.mts
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
function defaultWatchHome() {
  return process.env.LOOP_WATCH_HOME ?? path.join(os.homedir(), ".claude", "watch");
}
function ghSlugHash(ghSlug) {
  return crypto.createHash("sha256").update(ghSlug).digest("hex").slice(0, 16);
}
function tickStatePath(watchHome, ghSlug) {
  return path.join(watchHome, "state", `${ghSlugHash(ghSlug)}.tick.json`);
}
function tickLockPath(watchHome) {
  return path.join(watchHome, "tick.lock");
}
var DEFAULT_TICK_STATE = {
  lastSeenIssue: null,
  lastFailedRunIds: [],
  lastPrShas: {},
  lastTickAt: "",
  claims: {},
  skippedCeiling: [],
  lastSweepError: null
};
var LOCK_RETRY_MS = 25;
var LOCK_MAX_ATTEMPTS = 200;
async function acquireLockDir(lockDir) {
  for (let attempt = 0;attempt < LOCK_MAX_ATTEMPTS; attempt++) {
    try {
      await fs.mkdir(lockDir);
      return;
    } catch (err) {
      const code = err?.code;
      if (code !== "EEXIST")
        throw err;
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  throw new Error(`[watch/state] could not acquire lock ${lockDir} after ${LOCK_MAX_ATTEMPTS} attempts`);
}
async function releaseLockDir(lockDir) {
  await fs.rm(lockDir, { recursive: true, force: true });
}
async function readJsonOrDefault(filePath, defaultValue) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultValue);
  }
}
async function writeAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${path.basename(filePath)}-${process.pid}-${crypto.randomBytes(4).toString("hex")}`);
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(data, null, 2), "utf-8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, filePath);
}
var inProcessChains = new Map;
async function updateStateAtomic(filePath, defaultState, mutator) {
  const prior = inProcessChains.get(filePath) ?? Promise.resolve();
  const run = prior.catch(() => {}).then(() => updateStateAtomicLocked(filePath, defaultState, mutator));
  inProcessChains.set(filePath, run);
  try {
    return await run;
  } finally {
    if (inProcessChains.get(filePath) === run) {
      inProcessChains.delete(filePath);
    }
  }
}
async function updateStateAtomicLocked(filePath, defaultState, mutator) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const lockDir = `${filePath}.lock`;
  await acquireLockDir(lockDir);
  try {
    const current = await readJsonOrDefault(filePath, defaultState);
    const next = mutator(current);
    await writeAtomic(filePath, next);
    return next;
  } finally {
    await releaseLockDir(lockDir);
  }
}
async function readTickState(watchHome, ghSlug) {
  return readJsonOrDefault(tickStatePath(watchHome, ghSlug), DEFAULT_TICK_STATE);
}
async function updateTickState(watchHome, ghSlug, mutator) {
  return updateStateAtomic(tickStatePath(watchHome, ghSlug), DEFAULT_TICK_STATE, mutator);
}
async function acquireTickLock(watchHome) {
  await fs.mkdir(watchHome, { recursive: true });
  try {
    await fs.mkdir(tickLockPath(watchHome));
    return true;
  } catch (err) {
    const code = err?.code;
    if (code === "EEXIST")
      return false;
    throw err;
  }
}
async function releaseTickLock(watchHome) {
  await fs.rm(tickLockPath(watchHome), { recursive: true, force: true });
}

// src/scripts/lib/watch/claims.mts
var DEFAULT_CLAIM_TTL_SECONDS = 1800;
var DEFAULT_CLAIM_LABEL = "loop-claimed";
function isClaimActive(claim, now = new Date) {
  if (!claim)
    return false;
  const claimedAtMs = new Date(claim.claimedAt).getTime();
  if (Number.isNaN(claimedAtMs))
    return false;
  return now.getTime() - claimedAtMs < claim.ttlSeconds * 1000;
}
async function claimFinding(opts) {
  const ttlSeconds = opts.ttlSeconds ?? DEFAULT_CLAIM_TTL_SECONDS;
  const label = opts.label ?? DEFAULT_CLAIM_LABEL;
  const claimedAt = (opts.now ? opts.now() : new Date).toISOString();
  const entry = { findingId: opts.finding.findingId, claimedAt, ttlSeconds, label };
  await updateTickState(opts.watchHome, opts.ghSlug, (current) => ({
    ...current,
    claims: { ...current.claims, [entry.findingId]: entry }
  }));
  await opts.addClaimLabel(opts.ghSlug, opts.finding);
  return entry;
}
async function getActiveClaim(watchHome, ghSlug, findingId, now = new Date) {
  const state = await readTickState(watchHome, ghSlug);
  const claim = state.claims[findingId];
  return isClaimActive(claim, now) ? claim : undefined;
}
var FINDING_KIND_PREFIXES = {
  issue: "issue",
  run: "failed-run",
  pr: "red-pr"
};
function findingFromClaimId(findingId, ghSlug) {
  const prefix = findingId.split(":", 1)[0] ?? "";
  const kind = FINDING_KIND_PREFIXES[prefix] ?? "issue";
  return { kind, findingId, ghSlug };
}
function collectExpiredClaims(state, ghSlug, now = new Date) {
  return Object.values(state.claims).filter((claim) => !isClaimActive(claim, now)).map((claim) => findingFromClaimId(claim.findingId, ghSlug));
}

// src/scripts/lib/watch/spawn-gate.mts
var DEFAULT_SPAWN_GATE_CONFIG = {
  maxConcurrentReactions: 3,
  maxCostUsdPerWindow: 5
};
function evaluateSpawnGate(config, inFlightCount, costSpentUsd) {
  if (inFlightCount >= config.maxConcurrentReactions) {
    return { allow: false, reason: "concurrency-cap" };
  }
  if (costSpentUsd >= config.maxCostUsdPerWindow) {
    return { allow: false, reason: "cost-ceiling" };
  }
  return { allow: true };
}

// src/scripts/lib/watch/config.mts
import fs2 from "fs/promises";
import path2 from "path";
var DEFAULT_MACHINE_SHARD = 1;
function machineConfigPath(watchHome) {
  return path2.join(watchHome, "config.json");
}
function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string" && v.length > 0);
}
async function readMachineConfig(watchHome) {
  try {
    const raw = await fs2.readFile(machineConfigPath(watchHome), "utf-8");
    const parsed = JSON.parse(raw);
    const { machineShard, allowedTools } = parsed;
    const shard = typeof machineShard === "number" && Number.isInteger(machineShard) && machineShard > 0 ? machineShard : DEFAULT_MACHINE_SHARD;
    return isNonEmptyStringArray(allowedTools) ? { machineShard: shard, allowedTools } : { machineShard: shard };
  } catch {
    return { machineShard: DEFAULT_MACHINE_SHARD };
  }
}
async function resolveMachineShard(watchHome) {
  const { machineShard } = await readMachineConfig(watchHome);
  return machineShard;
}

// src/scripts/lib/watch/reaction-spawn.mts
import { spawn as nodeSpawn } from "child_process";
var CLAUDE_BIN = "claude";
var FORBIDDEN_FLAG = "--dangerously-skip-permissions";
function buildSpawnArgs(spawn, allowedTools) {
  if (spawn.action === "issue-broker-file")
    return null;
  const args = ["-p", spawn.promptArg];
  const safeTools = (allowedTools ?? []).filter((tool) => !tool.trimStart().startsWith("-"));
  if (safeTools.length > 0) {
    args.push("--allowedTools", safeTools.join(","));
  }
  if (args.includes(FORBIDDEN_FLAG)) {
    throw new Error(`[watch/reaction-spawn] refusing to spawn with ${FORBIDDEN_FLAG}`);
  }
  return { bin: CLAUDE_BIN, args, cwd: spawn.cwd };
}
var defaultSpawnFn = (bin, args, options) => nodeSpawn(bin, args, options);
function spawnReactionProcess(spawnArgs, spawnFn = defaultSpawnFn) {
  if (spawnArgs === null)
    return;
  const child = spawnFn(spawnArgs.bin, spawnArgs.args, {
    cwd: spawnArgs.cwd,
    detached: true,
    stdio: "ignore"
  });
  child.on("error", (err) => {
    console.error(`[watch/reaction-spawn] failed to spawn ${spawnArgs.bin}: ${err.message}`);
  });
  child.unref();
}

// src/scripts/lib/watch/ledger.mts
import path3 from "path";
var MAX_REACTION_RUNTIME_SECONDS = 1800;
var DEFAULT_COST_WINDOW_SECONDS = 3600;
var LEDGER_COST_RETENTION_SECONDS = 24 * 3600;
var DEFAULT_LEDGER = { inFlight: {}, costEntries: [] };
function ledgerPath(watchHome) {
  return path3.join(watchHome, "ledger.json");
}
function ledgerKey(ghSlug, findingId) {
  return `${ghSlug}::${findingId}`;
}
function isStale(startedAtIso, now, maxAgeSeconds) {
  const startedAtMs = new Date(startedAtIso).getTime();
  if (Number.isNaN(startedAtMs))
    return true;
  return now.getTime() - startedAtMs >= maxAgeSeconds * 1000;
}
function pruneStaleInFlight(inFlight, now) {
  const kept = {};
  for (const [key, entry] of Object.entries(inFlight)) {
    if (!isStale(entry.startedAt, now, MAX_REACTION_RUNTIME_SECONDS))
      kept[key] = entry;
  }
  return kept;
}
function pruneOldCostEntries(entries, now) {
  const cutoffMs = now.getTime() - LEDGER_COST_RETENTION_SECONDS * 1000;
  return entries.filter((entry) => new Date(entry.at).getTime() >= cutoffMs);
}
async function recordReactionStart(watchHome, finding, now = () => new Date) {
  const key = ledgerKey(finding.ghSlug, finding.findingId);
  const nowDate = now();
  await updateStateAtomic(ledgerPath(watchHome), DEFAULT_LEDGER, (current) => ({
    ...current,
    inFlight: {
      ...pruneStaleInFlight(current.inFlight, nowDate),
      [key]: {
        ghSlug: finding.ghSlug,
        findingId: finding.findingId,
        startedAt: nowDate.toISOString()
      }
    }
  }));
}
async function recordReactionFinish(watchHome, finding, costUsd, now = () => new Date) {
  const key = ledgerKey(finding.ghSlug, finding.findingId);
  const nowDate = now();
  await updateStateAtomic(ledgerPath(watchHome), DEFAULT_LEDGER, (current) => {
    const inFlight = pruneStaleInFlight(current.inFlight, nowDate);
    delete inFlight[key];
    return {
      inFlight,
      costEntries: [
        ...pruneOldCostEntries(current.costEntries, nowDate),
        { ghSlug: finding.ghSlug, findingId: finding.findingId, costUsd, at: nowDate.toISOString() }
      ]
    };
  });
}
async function countInFlight(watchHome, now = () => new Date) {
  const ledger = await readJsonOrDefault(ledgerPath(watchHome), DEFAULT_LEDGER);
  const nowDate = now();
  return Object.values(ledger.inFlight).filter((entry) => !isStale(entry.startedAt, nowDate, MAX_REACTION_RUNTIME_SECONDS)).length;
}
async function costSpentInWindow(watchHome, windowSeconds = DEFAULT_COST_WINDOW_SECONDS, now = () => new Date) {
  const ledger = await readJsonOrDefault(ledgerPath(watchHome), DEFAULT_LEDGER);
  const cutoffMs = now().getTime() - windowSeconds * 1000;
  return ledger.costEntries.filter((entry) => new Date(entry.at).getTime() >= cutoffMs).reduce((sum, entry) => sum + entry.costUsd, 0);
}

// src/scripts/lib/watch/sweep.mts
var execFile = promisify(execFileCallback);
function buildDefaultTickExec(watchHome = defaultWatchHome(), now = () => new Date, spawnFn) {
  return {
    listOpenIssues: async (entry) => {
      const { stdout } = await execFile("gh", [
        "issue",
        "list",
        "--repo",
        entry.ghSlug,
        "--state",
        "open",
        "--json",
        "number",
        "--limit",
        "100"
      ], { encoding: "utf8" });
      return JSON.parse(stdout);
    },
    listFailedRuns: async (entry) => {
      const { stdout } = await execFile("gh", [
        "run",
        "list",
        "--repo",
        entry.ghSlug,
        "--status",
        "failure",
        "--json",
        "databaseId",
        "--limit",
        "50"
      ], { encoding: "utf8" });
      return JSON.parse(stdout);
    },
    listOpenPrChecks: async (entry) => {
      const { stdout } = await execFile("gh", [
        "pr",
        "list",
        "--repo",
        entry.ghSlug,
        "--state",
        "open",
        "--json",
        "number,headRefOid,statusCheckRollup",
        "--limit",
        "50"
      ], { encoding: "utf8" });
      return JSON.parse(stdout);
    },
    addClaimLabel: async (ghSlug, finding) => {
      if (finding.kind === "failed-run")
        return;
      const number = finding.findingId.split(":")[1];
      try {
        await execFile("gh", ["issue", "edit", String(number), "--repo", ghSlug, "--add-label", DEFAULT_CLAIM_LABEL], { encoding: "utf8" });
      } catch {}
    },
    spawnReaction: async (spawn) => {
      const { allowedTools } = await readMachineConfig(watchHome);
      const spawnArgs = buildSpawnArgs(spawn, allowedTools);
      spawnReactionProcess(spawnArgs, spawnFn);
    },
    getInFlightReactionCount: async () => countInFlight(watchHome, now),
    getCostSpentUsd: async () => costSpentInWindow(watchHome, undefined, now)
  };
}
function detectIssueFindings(entry, issues, lastSeenIssue) {
  let max = lastSeenIssue;
  const findings = [];
  for (const issue of issues) {
    if (lastSeenIssue === null || issue.number > lastSeenIssue) {
      findings.push({ kind: "issue", findingId: `issue:${issue.number}`, ghSlug: entry.ghSlug });
    }
    if (max === null || issue.number > max)
      max = issue.number;
  }
  return { findings, newLastSeen: max };
}
function detectFailedRunFindings(entry, runs, lastFailedRunIds) {
  const priorSet = new Set(lastFailedRunIds);
  const findings = [];
  const currentIds = [];
  for (const run of runs) {
    currentIds.push(run.databaseId);
    if (!priorSet.has(run.databaseId)) {
      findings.push({
        kind: "failed-run",
        findingId: `run:${run.databaseId}`,
        ghSlug: entry.ghSlug
      });
    }
  }
  return { findings, newLastFailedRunIds: currentIds };
}
function detectRedPrFindings(entry, prs, lastPrShas) {
  const gatingChecks = entry.checks && entry.checks.length > 0 ? new Set(entry.checks) : null;
  const findings = [];
  const newLastPrShas = { ...lastPrShas };
  for (const pr of prs) {
    const failing = pr.statusCheckRollup.filter((c) => {
      if (gatingChecks && !gatingChecks.has(c.name))
        return false;
      return c.conclusion === "FAILURE" || c.conclusion === "ERROR";
    });
    const key = String(pr.number);
    if (failing.length > 0 && lastPrShas[key] !== pr.headRefOid) {
      findings.push({ kind: "red-pr", findingId: `pr:${pr.number}`, ghSlug: entry.ghSlug });
    }
    newLastPrShas[key] = pr.headRefOid;
  }
  return { findings, newLastPrShas };
}
function actionForFinding(finding, tier) {
  if (tier === 2)
    return "issue-broker-file";
  if (finding.kind === "issue")
    return "intake";
  if (finding.kind === "red-pr")
    return "pr-fix";
  return "crew-fix";
}
function promptForFinding(finding, action, entry) {
  const number = finding.findingId.split(":")[1];
  switch (action) {
    case "intake":
      return `/devcrew:intake --from-issue https://github.com/${entry.ghSlug}/issues/${number}`;
    case "pr-fix":
      return `/devcrew:pr-fix ${number}`;
    case "crew-fix":
      return `/devcrew:fix run:${number}`;
    case "issue-broker-file":
      return "";
  }
}
function commandForFinding(finding, action, entry) {
  if (action === "issue-broker-file") {
    return `# issue-broker-file: ${finding.findingId} (tier-2, watch-only \u2014 no headless spawn)`;
  }
  return `claude -p "${promptForFinding(finding, action, entry)}"`;
}
function assembleFindings(cursorFindings, expiredClaimFindings) {
  const seen = new Set(cursorFindings.map((f) => f.findingId));
  const stealCandidates = expiredClaimFindings.filter((f) => !seen.has(f.findingId));
  return [...cursorFindings, ...stealCandidates];
}
function extractGhErrorText(err) {
  if (err && typeof err === "object") {
    const { message, stderr } = err;
    return [message, stderr].filter((part) => typeof part === "string").join(" ");
  }
  return String(err);
}
function classifyGhErrorKind(err) {
  const text = extractGhErrorText(err);
  if (/\b403\b/.test(text) || /insufficient.?scope/i.test(text) || /resource not accessible/i.test(text)) {
    return "insufficient-scope";
  }
  if (/\b404\b/.test(text) || /not found/i.test(text)) {
    return "not-found";
  }
  return "other";
}
function buildSweepErrorState(err, priorError, now) {
  return {
    kind: classifyGhErrorKind(err),
    message: extractGhErrorText(err).trim() || "unknown gh failure",
    at: now().toISOString(),
    consecutiveCount: (priorError?.consecutiveCount ?? 0) + 1
  };
}
async function sweepEntry(entry, exec, watchHome, spawnGateConfig, now) {
  const priorState = await readTickState(watchHome, entry.ghSlug);
  let issues;
  let runs;
  let prs;
  try {
    [issues, runs, prs] = await Promise.all([
      exec.listOpenIssues(entry),
      exec.listFailedRuns(entry),
      exec.listOpenPrChecks(entry)
    ]);
  } catch (err) {
    const errorState = buildSweepErrorState(err, priorState.lastSweepError, now);
    await updateTickState(watchHome, entry.ghSlug, (current) => ({
      ...current,
      lastSweepError: errorState,
      lastTickAt: now().toISOString()
    }));
    return { findingsCount: 0, spawnedCount: 0, skippedCount: 0, error: errorState };
  }
  const issueResult = detectIssueFindings(entry, issues, priorState.lastSeenIssue);
  const runResult = detectFailedRunFindings(entry, runs, priorState.lastFailedRunIds);
  const prResult = detectRedPrFindings(entry, prs, priorState.lastPrShas);
  const cursorFindings = [
    ...issueResult.findings,
    ...runResult.findings,
    ...prResult.findings
  ];
  const expiredClaimFindings = collectExpiredClaims(priorState, entry.ghSlug, now());
  const findings = assembleFindings(cursorFindings, expiredClaimFindings);
  const claimTtlSeconds = entry.claimTtlSeconds ?? DEFAULT_CLAIM_TTL_SECONDS;
  let spawnedCount = 0;
  let skippedCount = 0;
  for (const finding of findings) {
    const activeClaim = await getActiveClaim(watchHome, entry.ghSlug, finding.findingId, now());
    if (activeClaim)
      continue;
    const inFlight = await exec.getInFlightReactionCount(entry.ghSlug);
    const costSpent = await exec.getCostSpentUsd(entry.ghSlug);
    const decision = evaluateSpawnGate(spawnGateConfig, inFlight, costSpent);
    if (decision.allow === false) {
      const reason = decision.reason;
      skippedCount++;
      await updateTickState(watchHome, entry.ghSlug, (current) => ({
        ...current,
        skippedCeiling: [
          ...current.skippedCeiling,
          { findingId: finding.findingId, reason, at: now().toISOString() }
        ]
      }));
      continue;
    }
    await claimFinding({
      watchHome,
      ghSlug: entry.ghSlug,
      finding,
      addClaimLabel: exec.addClaimLabel,
      ttlSeconds: claimTtlSeconds,
      now
    });
    const action = actionForFinding(finding, entry.tier);
    await recordReactionStart(watchHome, finding, now);
    try {
      await exec.spawnReaction({
        finding,
        action,
        command: commandForFinding(finding, action, entry),
        promptArg: promptForFinding(finding, action, entry),
        cwd: entry.path
      });
    } catch (err) {
      await recordReactionFinish(watchHome, finding, 0, now);
      console.error(`[watch/sweep] spawnReaction failed for ${finding.findingId}: ${err.message}`);
      continue;
    }
    spawnedCount++;
  }
  await updateTickState(watchHome, entry.ghSlug, (current) => ({
    ...current,
    lastSeenIssue: issueResult.newLastSeen,
    lastFailedRunIds: runResult.newLastFailedRunIds,
    lastPrShas: prResult.newLastPrShas,
    lastTickAt: now().toISOString(),
    lastSweepError: null
  }));
  return { findingsCount: findings.length, spawnedCount, skippedCount };
}

// src/scripts/lib/watch/registry.mts
import fs3 from "fs/promises";
import path4 from "path";
async function readRegistry(registryPath) {
  const resolved = path4.resolve(registryPath);
  let raw;
  try {
    raw = await fs3.readFile(resolved, "utf-8");
  } catch (err) {
    throw new Error(`[watch/registry] could not read registry at ${resolved}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`[watch/registry] could not parse registry JSON at ${resolved}: ${err.message}`);
  }
}
function requireNonEmptyString(value, label, field, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label}.${field} is required and must be a non-empty string`);
  }
}
function validateGhSlugUniqueness(ghSlug, label, idx, seenSlugs, errors) {
  if (typeof ghSlug !== "string" || ghSlug.length === 0) {
    errors.push(`${label}.ghSlug is required and must be a non-empty string`);
    return;
  }
  const priorIdx = seenSlugs.get(ghSlug);
  if (priorIdx !== undefined) {
    errors.push(`${label}.ghSlug "${ghSlug}" duplicates entries[${priorIdx}] \u2014 shard exclusivity ` + `violation (a repo cannot appear under two shards at once)`);
    return;
  }
  seenSlugs.set(ghSlug, idx);
}
function validateEntryShape(e, label, errors) {
  if (!Number.isInteger(e.shard) || e.shard <= 0) {
    errors.push(`${label}.shard must be a positive integer`);
  }
  if (e.tier !== 1 && e.tier !== 2) {
    errors.push(`${label}.tier must be 1 or 2`);
  }
  requireNonEmptyString(e.tenantId, label, "tenantId", errors);
  requireNonEmptyString(e.appId, label, "appId", errors);
  if (e.checks !== undefined && !Array.isArray(e.checks)) {
    errors.push(`${label}.checks must be an array of strings when present`);
  }
  if (e.claimTtlSeconds !== undefined && (typeof e.claimTtlSeconds !== "number" || e.claimTtlSeconds <= 0)) {
    errors.push(`${label}.claimTtlSeconds must be a positive number when present`);
  }
}
function validateEntry(entry, idx, seenSlugs) {
  const label = `entries[${idx}]`;
  if (!entry || typeof entry !== "object") {
    return [`${label}: must be an object`];
  }
  const e = entry;
  const errors = [];
  requireNonEmptyString(e.path, label, "path", errors);
  validateGhSlugUniqueness(e.ghSlug, label, idx, seenSlugs, errors);
  validateEntryShape(e, label, errors);
  return errors;
}
function validateRegistry(registry) {
  if (!registry || typeof registry !== "object") {
    return { ok: false, errors: ["registry root must be an object"] };
  }
  const errors = [];
  if (typeof registry.controlRepoPath !== "string" || registry.controlRepoPath.length === 0) {
    errors.push("controlRepoPath is required and must be a non-empty string");
  }
  if (!Array.isArray(registry.entries)) {
    errors.push("entries must be an array");
    return { ok: false, errors };
  }
  const seenSlugs = new Map;
  registry.entries.forEach((entry, idx) => {
    errors.push(...validateEntry(entry, idx, seenSlugs));
  });
  return { ok: errors.length === 0, errors };
}

// src/scripts/lib/event-notifier.mts
import fs6 from "fs/promises";
import path7 from "path";

// src/scripts/lib/env-profiles.mts
import fs4 from "fs/promises";
import os2 from "os";
import path5 from "path";
var _internals = {
  profilesDir: () => path5.join(os2.homedir(), ".astrarunner")
};
async function readProfile(env) {
  if (!env || typeof env !== "string")
    return null;
  const profilesPath = path5.join(_internals.profilesDir(), "profiles.json");
  let raw;
  try {
    raw = await fs4.readFile(profilesPath, "utf8");
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object")
    return null;
  if (!parsed.envs || typeof parsed.envs !== "object")
    return null;
  const entry = parsed.envs[env];
  if (!entry || typeof entry !== "object")
    return null;
  if (typeof entry.ingestUrl !== "string" || entry.ingestUrl.length === 0)
    return null;
  if (typeof entry.tokensFile !== "string" || entry.tokensFile.length === 0)
    return null;
  return {
    ingestUrl: entry.ingestUrl,
    tokensFile: entry.tokensFile,
    label: typeof entry.label === "string" ? entry.label : env
  };
}

// src/scripts/lib/plugin-options.mts
function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0)
      return v;
  }
  return;
}
function resolveIngestUrlOption() {
  return firstNonEmpty(process.env["LOOP_INGEST_URL"], process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"]);
}
function resolveIngestTokenOption() {
  return firstNonEmpty(process.env["LOOP_INGEST_TOKEN"], process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"]);
}
function resolveAstrarunnerEnvOption() {
  return firstNonEmpty(process.env["ASTRARUNNER_ENV"], process.env["CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"]);
}

// src/scripts/lib/token-store.mts
import fs5 from "fs/promises";
import os3 from "os";
import path6 from "path";
var _internals2 = {
  storePath: () => path6.join(os3.homedir(), ".astrarunner", "tokens.json"),
  profilesDir: () => path6.join(os3.homedir(), ".astrarunner")
};
async function readTokenFile(filePath) {
  let raw;
  try {
    raw = await fs5.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object")
    return null;
  if (!parsed.tokens || typeof parsed.tokens !== "object")
    return null;
  return parsed;
}
function extractBearer(store, appId) {
  const entry = store.tokens[appId];
  if (!entry || typeof entry !== "object")
    return null;
  if (typeof entry.bearer !== "string" || entry.bearer.length === 0)
    return null;
  return entry.bearer;
}
async function resolveBearer(appId, env, tokensFile) {
  if (!appId || typeof appId !== "string")
    return null;
  if (env && typeof env === "string") {
    const filename = typeof tokensFile === "string" && tokensFile.length > 0 ? tokensFile : `tokens.${env}.json`;
    const tierFile = path6.join(_internals2.profilesDir(), filename);
    const store2 = await readTokenFile(tierFile);
    if (!store2)
      return null;
    return extractBearer(store2, appId);
  }
  const store = await readTokenFile(_internals2.storePath());
  if (!store)
    return null;
  return extractBearer(store, appId);
}

// src/scripts/lib/webhook-sender.mts
var MAX_ATTEMPTS_5XX = 2;
var MAX_ATTEMPTS_429 = 3;
var BACKOFF_MS_429 = [1000, 2000, 4000];
function createWebhookSender(config, deps = {}) {
  const fetchFn = deps.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
  const retryDelayMs = deps.retryDelayMs ?? 250;
  let sessionDisabled = false;
  async function sleep(ms) {
    if (ms <= 0)
      return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function attempt(envelope) {
    return await fetchFn(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bearer}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope)
    });
  }
  async function send(envelope) {
    if (sessionDisabled) {
      return { ok: false, disabled: true, attempts: 0, error: "session-disabled" };
    }
    if (config.disabled) {
      return { ok: false, skipped: true, attempts: 0 };
    }
    let attempts = 0;
    while (true) {
      attempts += 1;
      let response;
      try {
        response = await attempt(envelope);
      } catch (err) {
        return { ok: false, attempts, error: err.message };
      }
      if (response.status >= 200 && response.status < 300) {
        return { ok: true, status: response.status, attempts };
      }
      if (response.status === 401 || response.status === 403) {
        sessionDisabled = true;
        return { ok: false, disabled: true, status: response.status, attempts };
      }
      if (response.status === 429) {
        if (attempts >= MAX_ATTEMPTS_429) {
          return { ok: false, status: response.status, attempts };
        }
        await sleep(retryDelayMs > 0 ? retryDelayMs : BACKOFF_MS_429[attempts - 1] ?? 0);
        continue;
      }
      if (response.status >= 500) {
        if (attempts >= MAX_ATTEMPTS_5XX) {
          return { ok: false, status: response.status, attempts };
        }
        await sleep(retryDelayMs);
        continue;
      }
      return { ok: false, status: response.status, attempts };
    }
  }
  return { send };
}

// src/scripts/lib/event-notifier.mts
async function applyEnvOverrides(webhook) {
  const activeEnv = resolveAstrarunnerEnvOption();
  const envOverrideUrl = resolveIngestUrlOption();
  let profileTokensFile;
  if (envOverrideUrl) {
    webhook.url = envOverrideUrl;
  } else if (activeEnv) {
    const profile = await readProfile(activeEnv);
    if (profile) {
      webhook.url = profile.ingestUrl;
      profileTokensFile = profile.tokensFile;
    }
  }
  if (webhook.appId && !webhook.bearer) {
    const resolved = await resolveBearer(webhook.appId, activeEnv, profileTokensFile);
    if (resolved)
      webhook.bearer = resolved;
  }
  if (!webhook.bearer) {
    const optToken = resolveIngestTokenOption();
    if (optToken)
      webhook.bearer = optToken;
  }
}
async function readNotifyConfig(repoPath) {
  let cfg;
  try {
    const configPath = path7.join(repoPath, ".claude", "loop.json");
    const raw = await fs6.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    const notifications = parsed?.loop?.notifications;
    if (!notifications || typeof notifications !== "object")
      return {};
    cfg = notifications;
  } catch {
    return {};
  }
  if (cfg.webhook)
    await applyEnvOverrides(cfg.webhook);
  return cfg;
}

// src/scripts/lib/webhook-fanout.mts
var _internals3 = {
  fetch: (...args) => globalThis.fetch(...args)
};
async function fanoutEnvelope(repoPath, kind, payload) {
  try {
    const cfg = await readNotifyConfig(repoPath);
    const wh = cfg.webhook;
    if (!wh?.url || !wh.bearer)
      return;
    const fetchFn = _internals3.fetch;
    const senderConfig = {
      url: wh.url,
      tenantId: wh.tenantId,
      appId: wh.appId,
      bearer: wh.bearer
    };
    if (wh.disabled !== undefined) {
      senderConfig.disabled = wh.disabled;
    }
    const sender = createWebhookSender(senderConfig, { fetchFn });
    const emittedAt = payload.resolvedAt ?? payload.ts ?? payload.timestamp ?? new Date().toISOString();
    await sender.send({
      tenantId: wh.tenantId,
      appId: wh.appId,
      kind,
      payload,
      emittedAt
    });
  } catch {}
}

// src/scripts/lib/watch/envelopes.mts
async function emitWatchTickEnvelope(registry, payload) {
  await fanoutEnvelope(registry.controlRepoPath, "watch.tick", payload);
}

// src/scripts/lib/watch/tick.mts
async function runTick(options) {
  const watchHome = options.watchHome ?? defaultWatchHome();
  const now = options.now ?? (() => new Date);
  const exec = options.exec ?? buildDefaultTickExec(watchHome, now);
  const spawnGateConfig = options.spawnGateConfig ?? DEFAULT_SPAWN_GATE_CONFIG;
  const locked = await acquireTickLock(watchHome);
  if (!locked) {
    return { outcome: "lock-held" };
  }
  try {
    const registry = await readRegistry(options.registryPath);
    const validation = validateRegistry(registry);
    if (!validation.ok) {
      throw new Error(`[watch/tick] invalid registry:
  ${validation.errors.join(`
  `)}`);
    }
    const assigned = registry.entries.filter((entry) => entry.shard === options.machineShard);
    let findingsCount = 0;
    let spawnedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const entry of assigned) {
      const result = await sweepEntry(entry, exec, watchHome, spawnGateConfig, now);
      findingsCount += result.findingsCount;
      spawnedCount += result.spawnedCount;
      skippedCount += result.skippedCount;
      if (result.error)
        errorCount++;
      await emitWatchTickEnvelope(registry, {
        ghSlug: entry.ghSlug,
        shard: entry.shard,
        tenantId: entry.tenantId,
        appId: entry.appId,
        tickAt: now().toISOString(),
        findingsCount: result.findingsCount,
        skippedCeilingCount: result.skippedCount,
        ...result.error ? {
          sweepErrorKind: result.error.kind,
          sweepErrorConsecutiveCount: result.error.consecutiveCount
        } : {}
      });
    }
    return { outcome: "swept", findingsCount, spawnedCount, skippedCount, errorCount };
  } finally {
    await releaseTickLock(watchHome);
  }
}
// src/scripts/watch-tick.mts
async function main(options = {}) {
  const watchHome = options.watchHome ?? defaultWatchHome();
  const machineShard = await resolveMachineShard(watchHome);
  const registryPath = path8.join(watchHome, "repos.json");
  const result = await runTick({
    registryPath,
    machineShard,
    watchHome,
    ...options.exec ? { exec: options.exec } : {}
  });
  if (result.outcome === "lock-held") {
    console.log("[watch-tick] lock held by another tick \u2014 exiting");
    return;
  }
  console.log(`[watch-tick] swept: findings=${result.findingsCount} spawned=${result.spawnedCount} skipped=${result.skippedCount}`);
}
function isMainEntry() {
  if (!process.argv[1])
    return false;
  return path8.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
if (isMainEntry()) {
  try {
    await main();
  } catch (err) {
    console.error("[watch-tick] failed:", err);
    process.exitCode = 1;
  }
}
export {
  main
};
