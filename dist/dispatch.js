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

// src/scripts/lib/dispatch-types.mts
var DispatchDepthExceeded, DispatchFanoutExceeded, DispatchWorktreeError, DispatchConfigError;
var init_dispatch_types = __esm(() => {
  DispatchDepthExceeded = class DispatchDepthExceeded extends Error {
    constructor(message) {
      super(message);
      this.name = "DispatchDepthExceeded";
    }
  };
  DispatchFanoutExceeded = class DispatchFanoutExceeded extends Error {
    constructor(message) {
      super(message);
      this.name = "DispatchFanoutExceeded";
    }
  };
  DispatchWorktreeError = class DispatchWorktreeError extends Error {
    constructor(message) {
      super(message);
      this.name = "DispatchWorktreeError";
    }
  };
  DispatchConfigError = class DispatchConfigError extends Error {
    constructor(message) {
      super(message);
      this.name = "DispatchConfigError";
    }
  };
});

// src/scripts/lib/dispatch-config.mts
var exports_dispatch_config = {};
__export(exports_dispatch_config, {
  readDispatchConfig: () => readDispatchConfig
});
import fs from "fs";
function readDispatchConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  let raw;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    throw new DispatchConfigError(`config read failed: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DispatchConfigError(`config parse failed: ${err.message}`);
  }
  const limits = parsed.dispatchLimits ?? {};
  return {
    maxDepth: typeof limits.maxDepth === "number" ? limits.maxDepth : DEFAULT_CONFIG.maxDepth,
    maxChildrenPerBatch: typeof limits.maxChildrenPerBatch === "number" ? limits.maxChildrenPerBatch : DEFAULT_CONFIG.maxChildrenPerBatch,
    worktreeRoot: typeof limits.worktreeRoot === "string" ? limits.worktreeRoot : DEFAULT_CONFIG.worktreeRoot,
    pruneStaleAfterDays: typeof limits.pruneStaleAfterDays === "number" ? limits.pruneStaleAfterDays : DEFAULT_CONFIG.pruneStaleAfterDays,
    autoPruneOnStart: typeof limits.autoPruneOnStart === "boolean" ? limits.autoPruneOnStart : DEFAULT_CONFIG.autoPruneOnStart
  };
}
var DEFAULT_CONFIG;
var init_dispatch_config = __esm(() => {
  init_dispatch_types();
  DEFAULT_CONFIG = {
    maxDepth: 3,
    maxChildrenPerBatch: 8,
    worktreeRoot: null,
    pruneStaleAfterDays: 7,
    autoPruneOnStart: false
  };
});

// src/scripts/lib/dispatch-gates.mts
function checkDepth(depth, cfg) {
  const resolved = typeof depth === "number" ? depth : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new DispatchDepthExceeded(`invalid depth: ${depth ?? process.env.LOOP_DISPATCH_DEPTH}`);
  }
  if (resolved >= cfg.maxDepth) {
    throw new DispatchDepthExceeded(`depth ${resolved} >= cap ${cfg.maxDepth}`);
  }
}
function checkFanout(plans, cfg) {
  if (plans.length === 0) {
    throw new DispatchConfigError("plans[] is empty \u2014 nothing to dispatch");
  }
  if (plans.length > cfg.maxChildrenPerBatch) {
    throw new DispatchFanoutExceeded(`${plans.length} > cap ${cfg.maxChildrenPerBatch}`);
  }
}
function checkUniqueIds(plans) {
  const seen = new Set;
  for (const p of plans) {
    if (seen.has(p.id)) {
      throw new DispatchConfigError(`duplicate child id: ${p.id}`);
    }
    seen.add(p.id);
  }
}
function validateBranchName(name) {
  if (!name || INVALID_REF_CHARS.test(name)) {
    throw new DispatchConfigError(`invalid branch name: ${JSON.stringify(name)}`);
  }
  if (name.startsWith("-") || name.endsWith(".") || name.includes("..") || name.includes("@{")) {
    throw new DispatchConfigError(`invalid branch name: ${JSON.stringify(name)}`);
  }
}
var INVALID_REF_CHARS;
var init_dispatch_gates = __esm(() => {
  init_dispatch_types();
  INVALID_REF_CHARS = /[\s~^:?*[\\\x00-\x1f]/;
});

// src/scripts/lib/dispatch-prompt.mts
import path from "path";
function augmentPrompt(prompt, args) {
  const { runId, depth, childCwd, childBranch, childId, repoRoot } = args;
  const nextDepth = depth + 1;
  const markerPath = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, `${childId}.result.json`);
  const header = [
    "## Hierarchical dispatch context (injected by devcrew:swarm)",
    "",
    `- Run id: \`${runId}\` (set \`LOOP_DISPATCH_RUN_ID=${runId}\` when invoking nested dispatch)`,
    `- Your depth: ${nextDepth} (set \`LOOP_DISPATCH_DEPTH=${nextDepth}\` OR pass \`--depth ${nextDepth}\` to \`bun src/scripts/loop.mts dispatch\` if you spawn grandchildren)`,
    `- Your worktree cwd: \`${childCwd}\``,
    `- Your branch: \`${childBranch}\``,
    "",
    "### Result-write contract (REQUIRED before you return)",
    "",
    `Write a JSON file to the following ABSOLUTE path: \`${markerPath}\``,
    "",
    "The file must match the `DispatchResult` schema:",
    "",
    "```json",
    "{",
    `  "id": "${childId}",`,
    `  "status": "DONE" | "FAILED" | "BLOCKED",`,
    `  "branch": "${childBranch}",`,
    `  "worktreePath": "${childCwd}",`,
    `  "childResults": [],  // populate if you spawn grandchildren`,
    `  "artifactPath": "(optional path to your run artifact)",`,
    `  "error": "(only set on FAILED/BLOCKED)",`,
    `  "costUsd": null  // parent derives this from events.jsonl at finalize (FEAT-220); leave null here`,
    "}",
    "```",
    "",
    'If you don\'t write this file before returning, the parent will record your child as FAILED with `error: "no marker"`.',
    "",
    "---",
    ""
  ].join(`
`);
  return header + prompt;
}
var init_dispatch_prompt = () => {};

// node_modules/@astragenie/plugin-std/dist/errors.js
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

// node_modules/@astragenie/plugin-std/dist/jsonl.js
var init_jsonl = __esm(() => {
  init_errors();
});

// src/scripts/lib/jsonl-append.mts
import fs2 from "fs/promises";
import fsSync from "fs";
import path2 from "path";
function appendJsonlSync(filePath, record, opts = {}) {
  try {
    _internals.mkdirSync(path2.dirname(filePath));
    _internals.appendFileSync(filePath, `${JSON.stringify(record)}
`);
  } catch (err) {
    if (opts.swallowErrors)
      return;
    throw err;
  }
}
var _internals;
var init_jsonl_append = __esm(() => {
  init_jsonl();
  _internals = {
    mkdir: (dir) => fs2.mkdir(dir, { recursive: true }),
    appendFile: (filePath, data) => fs2.appendFile(filePath, data, "utf8"),
    mkdirSync: (dir) => {
      fsSync.mkdirSync(dir, { recursive: true });
    },
    appendFileSync: (filePath, data) => {
      fsSync.appendFileSync(filePath, data, "utf8");
    }
  };
});

// src/scripts/lib/dispatch-trace.mts
import fs3 from "fs";
import path3 from "path";
function readMarker(repoRoot, runId, childId) {
  const markerPath = path3.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, `${childId}.result.json`);
  if (!fs3.existsSync(markerPath)) {
    return null;
  }
  try {
    const raw = fs3.readFileSync(markerPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[dispatch] marker parse failed for ${childId}: ${err.message}
`);
    return null;
  }
}
function appendTrace(repoRoot, runId, entry) {
  const dir = path3.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  appendJsonlSync(path3.join(dir, "trace.jsonl"), { ts: new Date().toISOString(), ...entry });
}
var init_dispatch_trace = __esm(() => {
  init_jsonl_append();
});

// src/scripts/lib/dispatch-worktree.mts
import fs4 from "fs";
import path4 from "path";
import { execFileSync } from "child_process";
function resolveDispatchBase(repoRoot, explicitBase) {
  const ref = explicitBase && explicitBase.trim().length > 0 ? explicitBase.trim() : "HEAD";
  try {
    return execFileSync("git", ["rev-parse", "--verify", ref], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    }).toString().trim();
  } catch (err) {
    throw new DispatchWorktreeError(`could not resolve dispatch base ref "${ref}" in ${repoRoot}: ${err.message}`);
  }
}
function assertSliceExistsAtBase(repoRoot, baseRef, childId) {
  const match = childId.match(SLICE_OR_FEAT_ID);
  if (!match)
    return;
  const idPrefix = match[0];
  const candidates = BACKLOG_STATUS_DIRS.map((dir) => `.claude/artifacts/loop/backlog/${dir}/${idPrefix}.md`);
  for (const candidate of candidates) {
    try {
      execFileSync("git", ["cat-file", "-e", `${baseRef}:${candidate}`], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"]
      });
      return;
    } catch {}
  }
  const sliceDirs = ["pending", "in-progress", "completed", "done"].map((dir) => `.claude/artifacts/loop/ai-loop/slices/${dir}`);
  const underscoreId = idPrefix.replace(/-/g, "_");
  for (const dir of sliceDirs) {
    let listing;
    try {
      listing = execFileSync("git", ["ls-tree", "--name-only", `${baseRef}:${dir}`], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"]
      }).toString();
    } catch {
      continue;
    }
    const hit = listing.split(`
`).some((name) => name === `${idPrefix}.md` || name.startsWith(`${underscoreId}_`) || name.startsWith(`${idPrefix}_`));
    if (hit)
      return;
  }
  throw new DispatchWorktreeError(`stale dispatch base: "${idPrefix}" not found at base ${baseRef} in any of ` + `${candidates.join(", ")} or the ai-loop/slices status dirs. The base ref is ` + "likely stale (missing recent backlog commits) \u2014 refresh it (fetch/pull) or " + "pass an explicit base ref that contains this id.");
}
function preflightGitClean(repoRoot, parentBranch) {
  try {
    execFileSync("git", ["rev-parse", "--verify", parentBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new DispatchWorktreeError(`parentBranch not found: ${parentBranch}`);
  }
  const status = execFileSync("git", ["status", "--porcelain", "--", ".", `:(exclude)${LOOP_ARTIFACT_ALLOWLIST_PREFIX}**`], { cwd: repoRoot }).toString();
  if (status.trim().length > 0) {
    throw new DispatchWorktreeError(`working tree dirty on ${parentBranch}`);
  }
  execFileSync("git", ["worktree", "prune"], { cwd: repoRoot });
}
function childWorktreePath(repoRoot, childId, depth) {
  const absRepoRoot = path4.resolve(repoRoot);
  const baseName = path4.basename(absRepoRoot);
  return path4.join(path4.dirname(absRepoRoot), `${baseName}-${childId}-${depth}`);
}
function createChildWorktree(args) {
  const { repoRoot, parentBranch, childId, depth, runId, baseRef } = args;
  const childBranch = `${parentBranch}-${childId}`;
  validateBranchName(childBranch);
  const resolvedBase = resolveDispatchBase(repoRoot, baseRef);
  assertSliceExistsAtBase(repoRoot, resolvedBase, childId);
  const worktreePath = childWorktreePath(repoRoot, childId, depth);
  try {
    execFileSync("git", ["worktree", "add", worktreePath, resolvedBase, "-b", childBranch], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    throw new DispatchWorktreeError(`worktree add failed for ${childId}: ${err.message}`);
  }
  const logDir = path4.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  appendJsonlSync(path4.join(logDir, "worktrees.jsonl"), {
    ts: new Date().toISOString(),
    childId,
    branch: childBranch,
    path: worktreePath,
    depth,
    baseRef: resolvedBase
  });
  return { worktreePath, branch: childBranch, baseRef: resolvedBase };
}
function removeChildWorktree(repoRoot, worktreePath, branch) {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: repoRoot
    });
  } catch {}
  try {
    execFileSync("git", ["branch", "-D", branch], { cwd: repoRoot });
  } catch {}
}
function inventoryWorkerBranch(repoRoot, worktreePath, branch, parentBranch) {
  const filesOnBranchNotOnMain = listFilesOnBranchNotOnMain(repoRoot, branch, parentBranch);
  const uncommittedWip = listUncommittedWip(worktreePath);
  return { branch, worktreePath, filesOnBranchNotOnMain, uncommittedWip };
}
function listFilesOnBranchNotOnMain(repoRoot, branch, parentBranch) {
  try {
    const out = execFileSync("git", ["diff", "--name-only", "--diff-filter=AM", `${parentBranch}...${branch}`], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }).toString();
    return out.split(`
`).map((line) => line.trim()).filter((line) => line.length > 0);
  } catch {
    return [];
  }
}
function listUncommittedWip(worktreePath) {
  if (!fs4.existsSync(worktreePath))
    return [];
  try {
    const out = execFileSync("git", ["status", "--porcelain"], {
      cwd: worktreePath,
      stdio: ["ignore", "pipe", "pipe"]
    }).toString();
    return out.split(`
`).filter((line) => line.length > 0).map((line) => {
      const status = line.substring(0, 2);
      const filePath = line.substring(3).trim();
      return { path: filePath, status };
    });
  } catch {
    return [];
  }
}
function findHandoffCommits(repoRoot, branch, parentBranch) {
  const byCommit = new Map;
  let raw;
  try {
    raw = execFileSync("git", ["log", `${parentBranch}..${branch}`, "--name-only", "--diff-filter=A", "--format=%H"], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }).toString();
  } catch {
    return byCommit;
  }
  let currentSha = "";
  for (const line of raw.split(`
`)) {
    const trimmed = line.trim();
    if (trimmed.length === 0)
      continue;
    if (/^[0-9a-f]{40}$/.test(trimmed)) {
      currentSha = trimmed;
    } else if (currentSha && isHandoffCandidate(trimmed)) {
      const paths = byCommit.get(currentSha) ?? [];
      paths.push(trimmed);
      byCommit.set(currentSha, paths);
    }
  }
  for (const [sha, paths] of byCommit) {
    if (paths.length === 0)
      byCommit.delete(sha);
  }
  return byCommit;
}
function isHandoffCandidate(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes(".claude/artifacts/crew/handoffs/") && normalized.endsWith(".md")) {
    return true;
  }
  if (normalized.startsWith(".claude/artifacts/") && normalized.includes("handoff") && normalized.endsWith(".md")) {
    return true;
  }
  return false;
}
function cherryPickHandoffsFromBranch(repoRoot, branch, parentBranch) {
  const handoffCommits = findHandoffCommits(repoRoot, branch, parentBranch);
  const cherryPicked = [];
  const skippedConflict = [];
  let aborted = false;
  for (const [sha, paths] of handoffCommits) {
    const picked = tryCherryPick(repoRoot, sha);
    if (picked) {
      cherryPicked.push(...paths);
    } else {
      abortCherryPick(repoRoot);
      skippedConflict.push(...paths);
      aborted = true;
    }
  }
  return { cherryPicked, skippedConflict, aborted };
}
function tryCherryPick(repoRoot, sha) {
  try {
    execFileSync("git", ["cherry-pick", sha], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}
function abortCherryPick(repoRoot) {
  try {
    execFileSync("git", ["cherry-pick", "--abort"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {}
}
function appendInventoryLog(repoRoot, runId, entry) {
  const logDir = path4.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
  appendJsonlSync(path4.join(logDir, "inventory.jsonl"), { ts: new Date().toISOString(), ...entry }, { swallowErrors: true });
}
function writeWorkerPreservedArtifact(repoRoot, runId, childId, status, inventory, suggestedAction) {
  try {
    const dir = path4.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
    fs4.mkdirSync(dir, { recursive: true });
    const filesPreview = inventory.filesOnBranchNotOnMain.slice(0, 10);
    const wipPreview = inventory.uncommittedWip.slice(0, 10);
    const body = [
      `# Worker preserved \u2014 ${childId}`,
      "",
      `**status:** ${status}`,
      `**branch:** \`${inventory.branch}\``,
      `**worktree:** \`${inventory.worktreePath}\``,
      `**runId:** \`${runId}\``,
      "",
      `## Files on branch not on main (${inventory.filesOnBranchNotOnMain.length})`,
      "",
      filesPreview.length > 0 ? filesPreview.map((p) => `- \`${p}\``).join(`
`) : "_(none)_",
      inventory.filesOnBranchNotOnMain.length > filesPreview.length ? `
\u2026 ${inventory.filesOnBranchNotOnMain.length - filesPreview.length} more` : "",
      "",
      `## Uncommitted WIP in worktree (${inventory.uncommittedWip.length})`,
      "",
      wipPreview.length > 0 ? wipPreview.map((w) => `- \`${w.status}\` \`${w.path}\``).join(`
`) : "_(none)_",
      inventory.uncommittedWip.length > wipPreview.length ? `
\u2026 ${inventory.uncommittedWip.length - wipPreview.length} more` : "",
      "",
      `## Suggested next action`,
      "",
      suggestedAction,
      ""
    ].join(`
`);
    fs4.writeFileSync(path4.join(dir, `worker-preserved-${childId}.md`), body);
  } catch {}
}
function writeWorkerFailedArtifact(repoRoot, runId, childId, inventory, cherryPickResult) {
  try {
    const dir = path4.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
    fs4.mkdirSync(dir, { recursive: true });
    const filesPreview = inventory.filesOnBranchNotOnMain.slice(0, 10);
    const wipPreview = inventory.uncommittedWip.slice(0, 10);
    const body = `${[
      `# WORKER FAILED \u2014 ${childId}`,
      "",
      `**status:** FAIL`,
      `**branch:** \`${inventory.branch}\``,
      `**worktree:** \`${inventory.worktreePath}\``,
      `**runId:** \`${runId}\``,
      "",
      `## Files on branch not on main (${inventory.filesOnBranchNotOnMain.length})`,
      "",
      filesPreview.length > 0 ? filesPreview.map((p) => `- \`${p}\``).join(`
`) : "_(none)_",
      inventory.filesOnBranchNotOnMain.length > filesPreview.length ? `
\u2026 ${inventory.filesOnBranchNotOnMain.length - filesPreview.length} more` : "",
      "",
      `## Uncommitted WIP in worktree (${inventory.uncommittedWip.length})`,
      "",
      wipPreview.length > 0 ? wipPreview.map((w) => `- \`${w.status}\` \`${w.path}\``).join(`
`) : "_(none)_",
      inventory.uncommittedWip.length > wipPreview.length ? `
\u2026 ${inventory.uncommittedWip.length - wipPreview.length} more` : "",
      "",
      `## Cherry-pick result`,
      "",
      `- Picked: ${cherryPickResult.cherryPicked.length} handoff file(s)`,
      `- Skipped (conflict): ${cherryPickResult.skippedConflict.length} handoff file(s)`,
      cherryPickResult.cherryPicked.length > 0 ? cherryPickResult.cherryPicked.map((p) => `  - picked: \`${p}\``).join(`
`) : "",
      cherryPickResult.skippedConflict.length > 0 ? cherryPickResult.skippedConflict.map((p) => `  - skipped: \`${p}\``).join(`
`) : "",
      "",
      `## Next action`,
      "",
      "Manual review required \u2014 worktree preserved for inspection.",
      "Cherry-pick was attempted (see inventory.jsonl); resolve any skipped conflicts manually.",
      ""
    ].filter((line) => line !== "").join(`
`)}
`;
    fs4.writeFileSync(path4.join(dir, `worker-failed-${childId}.md`), body);
  } catch {}
}
var BACKLOG_STATUS_DIRS, SLICE_OR_FEAT_ID, LOOP_ARTIFACT_ALLOWLIST_PREFIX = ".claude/artifacts/loop/";
var init_dispatch_worktree = __esm(() => {
  init_dispatch_types();
  init_dispatch_gates();
  init_jsonl_append();
  BACKLOG_STATUS_DIRS = ["pending", "triaged", "in-progress", "done"];
  SLICE_OR_FEAT_ID = /^(FEAT|SLICE)-\d+/i;
});

// src/scripts/lib/dispatch-batch.mts
function buildAgentBatch(plans, args) {
  return plans.map((plan) => ({
    description: `dispatch ${plan.id}`,
    subagent_type: plan.agentType,
    prompt: augmentPrompt(plan.prompt, {
      runId: args.runId,
      depth: args.depth,
      childCwd: args.childCwdById[plan.id] ?? "",
      childBranch: args.childBranchById[plan.id] ?? "",
      childId: plan.id,
      repoRoot: args.repoRoot
    })
  }));
}
var init_dispatch_batch = __esm(() => {
  init_dispatch_prompt();
});

// src/scripts/lib/dispatch-aggregate.mts
function aggregateResults(repoRoot, runId, plans, branchById, cwdById) {
  return plans.map((plan) => {
    const marker = readMarker(repoRoot, runId, plan.id);
    if (marker)
      return marker;
    const worktreePath = cwdById[plan.id];
    if (worktreePath) {
      const wtMarker = readMarker(worktreePath, runId, plan.id);
      if (wtMarker)
        return wtMarker;
    }
    return {
      id: plan.id,
      status: "FAILED",
      branch: branchById[plan.id] ?? "",
      worktreePath: cwdById[plan.id] ?? "",
      error: "no marker",
      costUsd: null
    };
  });
}
var init_dispatch_aggregate = __esm(() => {
  init_dispatch_trace();
});

// src/scripts/lib/dispatch-merge.mts
import { execFileSync as execFileSync2 } from "child_process";
function collectInventories(repoRoot, parentBranch, results, runId) {
  const map = new Map;
  for (const child of results) {
    const inventory = inventoryWorkerBranch(repoRoot, child.worktreePath, child.branch, parentBranch);
    map.set(child.id, inventory);
    if (runId) {
      appendInventoryLog(repoRoot, runId, {
        ...inventory,
        childId: child.id,
        status: child.status
      });
    }
  }
  return map;
}
function cherryPickNonDoneHandoffs(repoRoot, parentBranch, results, runId, inventoryMap) {
  const map = new Map;
  for (const child of results) {
    if (child.status === "DONE")
      continue;
    const cpResult = cherryPickHandoffsFromBranch(repoRoot, child.branch, parentBranch);
    map.set(child.id, cpResult);
    if (runId) {
      const inventory = inventoryMap.get(child.id);
      appendInventoryLog(repoRoot, runId, {
        ...inventory,
        childId: child.id,
        status: `${child.status}:cherry-pick`,
        cherryPickResult: cpResult
      });
    }
  }
  return map;
}
function emitPreservedArtifacts(repoRoot, runId, results, inventoryMap) {
  for (const child of results) {
    if (child.status === "DONE")
      continue;
    if (child.status === "FAILED")
      continue;
    const inventory = inventoryMap.get(child.id);
    writeWorkerPreservedArtifact(repoRoot, runId, child.id, child.status, inventory, `Worker exited with status \`${child.status}\`. Worktree + branch preserved. Inspect, cherry-pick anything worth keeping, then clean up manually OR rerun via \`/devcrew:fix\`.`);
  }
}
function emitFailedArtifacts(repoRoot, runId, results, inventoryMap, cherryPickMap) {
  for (const child of results) {
    if (child.status !== "FAILED")
      continue;
    const inventory = inventoryMap.get(child.id);
    const cpResult = cherryPickMap.get(child.id) ?? {
      cherryPicked: [],
      skippedConflict: [],
      aborted: false
    };
    writeWorkerFailedArtifact(repoRoot, runId, child.id, inventory, cpResult);
  }
}
function mergeOne(repoRoot, parentBranch, runId, child, inventory, updated) {
  try {
    execFileSync2("git", ["merge", "--no-ff", child.branch, "-m", `merge ${child.id} (FEAT-020 dispatch)`], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    removeChildWorktree(repoRoot, child.worktreePath, child.branch);
    updated.set(child.id, { ...child, status: "DONE" });
  } catch {
    abortMerge(repoRoot);
    if (runId) {
      writeWorkerPreservedArtifact(repoRoot, runId, child.id, "CONFLICTED", inventory, `Merge against \`${parentBranch}\` conflicted. Worktree + branch left in place for inspection. Resolve conflicts manually OR rerun the slice via \`/devcrew:fix\`. Once resolved, run \`git worktree remove ${child.worktreePath}\` + \`git branch -D ${child.branch}\`.`);
    }
    updated.set(child.id, {
      ...child,
      status: "CONFLICTED",
      error: `merge conflict against ${parentBranch}`
    });
  }
}
function abortMerge(repoRoot) {
  try {
    execFileSync2("git", ["merge", "--abort"], { cwd: repoRoot });
  } catch {}
}
function mergeChildren(repoRoot, parentBranch, results, plans, runId) {
  const priorityById = new Map(plans.map((p) => [p.id, p.priority]));
  execFileSync2("git", ["checkout", parentBranch], { cwd: repoRoot });
  const inventoryMap = collectInventories(repoRoot, parentBranch, results, runId);
  const cherryPickMap = cherryPickNonDoneHandoffs(repoRoot, parentBranch, results, runId, inventoryMap);
  if (runId)
    emitPreservedArtifacts(repoRoot, runId, results, inventoryMap);
  if (runId)
    emitFailedArtifacts(repoRoot, runId, results, inventoryMap, cherryPickMap);
  const order = results.filter((r) => r.status === "DONE").map((r) => ({ r, p: priorityById.get(r.id) ?? 0 })).sort((a, b) => a.p - b.p).map((x) => x.r);
  const updated = new Map;
  for (const child of order) {
    mergeOne(repoRoot, parentBranch, runId, child, inventoryMap.get(child.id), updated);
  }
  return results.map((r) => updated.get(r.id) ?? r);
}
var init_dispatch_merge = __esm(() => {
  init_dispatch_worktree();
});

// src/scripts/lib/hierarchical-dispatch.mts
var exports_hierarchical_dispatch = {};
__export(exports_hierarchical_dispatch, {
  writeWorkerPreservedArtifact: () => writeWorkerPreservedArtifact,
  writeWorkerFailedArtifact: () => writeWorkerFailedArtifact,
  validateBranchName: () => validateBranchName,
  resolveDispatchBase: () => resolveDispatchBase,
  removeChildWorktree: () => removeChildWorktree,
  readMarker: () => readMarker,
  readDispatchConfig: () => readDispatchConfig,
  prepareDispatch: () => prepareDispatch,
  preflightGitClean: () => preflightGitClean,
  mergeChildren: () => mergeChildren,
  inventoryWorkerBranch: () => inventoryWorkerBranch,
  finalizeDispatch: () => finalizeDispatch,
  dispatchHierarchical: () => dispatchHierarchical,
  createChildWorktree: () => createChildWorktree,
  childWorktreePath: () => childWorktreePath,
  cherryPickHandoffsFromBranch: () => cherryPickHandoffsFromBranch,
  checkUniqueIds: () => checkUniqueIds,
  checkFanout: () => checkFanout,
  checkDepth: () => checkDepth,
  buildAgentBatch: () => buildAgentBatch,
  augmentPrompt: () => augmentPrompt,
  assertSliceExistsAtBase: () => assertSliceExistsAtBase,
  appendTrace: () => appendTrace,
  appendInventoryLog: () => appendInventoryLog,
  aggregateResults: () => aggregateResults,
  DispatchWorktreeError: () => DispatchWorktreeError,
  DispatchFanoutExceeded: () => DispatchFanoutExceeded,
  DispatchDepthExceeded: () => DispatchDepthExceeded,
  DispatchConfigError: () => DispatchConfigError
});
import fs5 from "fs";
import path5 from "path";
import crypto from "crypto";
function prepareDispatch(plans, opts) {
  const cfg = readDispatchConfig(opts.configPath ?? path5.join(opts.repoRoot, ".claude/loop.json"));
  checkDepth(opts.depth, cfg);
  checkFanout(plans, cfg);
  checkUniqueIds(plans);
  preflightGitClean(opts.repoRoot, opts.parentBranch);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const depth = typeof opts.depth === "number" ? opts.depth : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
  const branchById = {};
  const cwdById = {};
  for (const plan of plans) {
    const spawn = createChildWorktree({
      repoRoot: opts.repoRoot,
      parentBranch: opts.parentBranch,
      childId: plan.id,
      depth,
      runId,
      ...opts.baseRef !== undefined ? { baseRef: opts.baseRef } : {}
    });
    branchById[plan.id] = spawn.branch;
    cwdById[plan.id] = spawn.worktreePath;
  }
  const batch = buildAgentBatch(plans, {
    runId,
    depth,
    childCwdById: cwdById,
    childBranchById: branchById,
    repoRoot: opts.repoRoot
  });
  const startTimes = {};
  for (const plan of plans)
    startTimes[plan.id] = Date.now();
  return { runId, batch, branchById, cwdById, startTimes };
}
function finalizeDispatch(repoRoot, parentBranch, prepared, plans, depth) {
  const { runId, branchById, cwdById, startTimes } = prepared;
  let results = aggregateResults(repoRoot, runId, plans, branchById, cwdById);
  for (const r of results) {
    appendTrace(repoRoot, runId, {
      depth,
      childId: r.id,
      status: r.status,
      durationMs: Date.now() - (startTimes[r.id] ?? Date.now()),
      costUsd: r.costUsd ?? null
    });
  }
  results = mergeChildren(repoRoot, parentBranch, results, plans, runId);
  writeSummary(repoRoot, runId, parentBranch, depth, results);
  return results;
}
function writeSummary(repoRoot, runId, parentBranch, depth, results) {
  const lines = [
    `# Dispatch run ${runId}`,
    "",
    `- parent branch: \`${parentBranch}\``,
    `- depth: ${depth}`,
    `- children: ${results.length}`,
    "",
    "| id | status | branch | worktree | error |",
    "|----|--------|--------|----------|-------|",
    ...results.map((r) => `| ${r.id} | ${r.status} | \`${r.branch}\` | \`${r.worktreePath}\` | ${r.error ?? ""} |`),
    ""
  ];
  fs5.writeFileSync(path5.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, "summary.md"), lines.join(`
`));
}
async function dispatchHierarchical(plans, opts, runAgentBatch) {
  const prepared = prepareDispatch(plans, opts);
  await runAgentBatch(prepared.batch, {
    runId: prepared.runId,
    branchById: prepared.branchById,
    cwdById: prepared.cwdById
  });
  const depth = typeof opts.depth === "number" ? opts.depth : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
  return finalizeDispatch(opts.repoRoot, opts.parentBranch, prepared, plans, depth);
}
var init_hierarchical_dispatch = __esm(() => {
  init_dispatch_config();
  init_dispatch_gates();
  init_dispatch_worktree();
  init_dispatch_batch();
  init_dispatch_aggregate();
  init_dispatch_trace();
  init_dispatch_merge();
  init_dispatch_types();
  init_dispatch_config();
  init_dispatch_gates();
  init_dispatch_prompt();
  init_dispatch_trace();
  init_dispatch_worktree();
  init_dispatch_batch();
  init_dispatch_aggregate();
  init_dispatch_merge();
});

// src/scripts/lib/dispatch-metrics.mts
var exports_dispatch_metrics = {};
__export(exports_dispatch_metrics, {
  writeDispatchMetrics: () => writeDispatchMetrics,
  readDispatchMetrics: () => readDispatchMetrics,
  formatPartialChildrenNote: () => formatPartialChildrenNote
});
import fs6 from "fs";
import path6 from "path";
function metricsPath(repoRoot, runId) {
  return path6.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, "dispatch-metrics.json");
}
function writeDispatchMetrics(repoRoot, runId, metrics) {
  try {
    const filePath = metricsPath(repoRoot, runId);
    fs6.mkdirSync(path6.dirname(filePath), { recursive: true });
    fs6.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
  } catch (err) {
    process.stderr.write(`[dispatch-metrics] write failed: ${err.message}
`);
  }
}
function readDispatchMetrics(repoRoot, runId) {
  const filePath = metricsPath(repoRoot, runId);
  if (!fs6.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs6.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function formatPartialChildrenNote(metrics) {
  const partialChildren = metrics.partialChildren ?? [];
  if (partialChildren.length === 0)
    return null;
  return `[dispatch-metrics] partialChildren (cost unattributed): ${partialChildren.join(", ")}`;
}
var init_dispatch_metrics = () => {};

// src/scripts/lib/slice-linker/transcript-token-usage.mts
import fs7 from "fs/promises";
import path7 from "path";
import { createReadStream } from "fs";
import readline from "readline";
function normalizePayloadPath(payloadPath) {
  if (!payloadPath)
    return null;
  if (/^[A-Za-z]:[/\\]/.test(payloadPath))
    return payloadPath;
  const m = payloadPath.match(/^\/([a-z])(\/.*)?$/);
  if (m)
    return `${m[1].toUpperCase()}:${(m[2] ?? "").replace(/\//g, "\\")}`;
  return payloadPath;
}
async function readEventsInWindow(repoPath, startedAt, endedAt = null) {
  const eventsPath = path7.join(repoPath, ...EVENTS_JSONL);
  const startMs = startedAt ? new Date(startedAt).getTime() : -Infinity;
  const endMs = endedAt ? new Date(endedAt).getTime() : Infinity;
  let raw;
  try {
    raw = await fs7.readFile(eventsPath, "utf8");
  } catch {
    return { events: [], fileFound: false };
  }
  const events = [];
  for (const line of raw.split(`
`)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj.event !== "subagent_start" && obj.event !== "subagent_stop")
      continue;
    const ts = new Date(obj.timestamp).getTime();
    if (ts < startMs || ts > endMs)
      continue;
    events.push(obj);
  }
  return { events, fileFound: true };
}
async function loadPayload(payloadPath) {
  if (!payloadPath)
    return null;
  const normalized = normalizePayloadPath(payloadPath);
  if (!normalized)
    return null;
  try {
    return JSON.parse(await fs7.readFile(normalized, "utf8"));
  } catch {
    return null;
  }
}
function buildAgentPair(stopPayload, stopTs, startEntry) {
  return {
    agentId: stopPayload.agent_id,
    agentType: stopPayload.agent_type || startEntry?.payload?.agent_type || "unknown",
    sessionId: stopPayload.session_id || startEntry?.payload?.session_id || null,
    startTs: startEntry?.ts || null,
    stopTs,
    transcriptPath: normalizePayloadPath(stopPayload.agent_transcript_path || null),
    backgroundTasks: Array.isArray(stopPayload.background_tasks) ? stopPayload.background_tasks.length : 0,
    stopHookActive: Boolean(stopPayload.stop_hook_active)
  };
}
function buildPairFromStart(startPayload, startTs) {
  return {
    agentId: startPayload.agent_id,
    agentType: startPayload.agent_type || "unknown",
    sessionId: startPayload.session_id || null,
    startTs,
    stopTs: null,
    transcriptPath: null,
    backgroundTasks: 0,
    stopHookActive: false
  };
}
function dedupePairsByTranscript(pairs) {
  const byTranscript = new Map;
  const noTranscript = [];
  for (const pair of pairs) {
    if (!pair.transcriptPath) {
      noTranscript.push(pair);
      continue;
    }
    const bucket = byTranscript.get(pair.transcriptPath) ?? [];
    bucket.push(pair);
    byTranscript.set(pair.transcriptPath, bucket);
  }
  const deduped = [];
  for (const bucket of byTranscript.values()) {
    if (bucket.length === 1) {
      deduped.push(bucket[0]);
      continue;
    }
    const complete = bucket.find((p) => p.startTs && p.stopTs);
    const keeper = complete ?? bucket[0];
    if (!keeper.startTs)
      keeper.startTs = bucket.find((p) => p.startTs)?.startTs ?? null;
    if (!keeper.stopTs)
      keeper.stopTs = bucket.find((p) => p.stopTs)?.stopTs ?? null;
    deduped.push(keeper);
  }
  return [...deduped, ...noTranscript];
}
function pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps) {
  const startByAgentId = new Map;
  for (let i = 0;i < startPayloads.length; i++) {
    const p = startPayloads[i];
    if (p?.agent_id)
      startByAgentId.set(p.agent_id, { payload: p, ts: startTimestamps[i] });
  }
  const stopByAgentId = new Map;
  for (let i = 0;i < stopPayloads.length; i++) {
    const p = stopPayloads[i];
    if (p?.agent_id)
      stopByAgentId.set(p.agent_id, { payload: p, ts: stopTimestamps[i] });
  }
  const allIds = new Set([...startByAgentId.keys(), ...stopByAgentId.keys()]);
  const pairs = [];
  for (const id of allIds) {
    const stopEntry = stopByAgentId.get(id);
    const startEntry = startByAgentId.get(id);
    if (stopEntry) {
      pairs.push(buildAgentPair(stopEntry.payload, stopEntry.ts, startEntry));
    } else {
      pairs.push(buildPairFromStart(startEntry.payload, startEntry.ts));
    }
  }
  return dedupePairsByTranscript(pairs);
}
function accumulateToolUse(block, tools, skills) {
  const toolName = block.name;
  if (!toolName)
    return;
  tools.set(toolName, (tools.get(toolName) || 0) + 1);
  if (toolName === "Skill" && block.input?.skill)
    skills.add(block.input.skill);
}
function accumulateTranscriptLine(state, obj) {
  if (obj.type !== "assistant")
    return;
  state.turns++;
  if (state.model === "n/a" && obj.message?.model)
    state.model = obj.message.model;
  const usage = obj.message?.usage;
  if (usage) {
    state.inputTokens += usage.input_tokens ?? 0;
    state.outputTokens += usage.output_tokens ?? 0;
    state.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0;
    state.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0;
  }
  const content = obj.message?.content;
  if (!Array.isArray(content))
    return;
  for (const block of content) {
    if (block.type === "tool_use")
      accumulateToolUse(block, state.tools, state.skills);
  }
}
async function parseTranscript(transcriptPath) {
  const empty = {
    turns: 0,
    model: "n/a",
    tools: new Map,
    skills: [],
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0
  };
  if (!transcriptPath)
    return { ...empty, error: "no transcript path" };
  try {
    await fs7.access(transcriptPath);
  } catch {
    return { ...empty, error: "transcript not found" };
  }
  const state = {
    turns: 0,
    model: "n/a",
    tools: new Map,
    skills: new Set,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0
  };
  try {
    const rl = readline.createInterface({
      input: createReadStream(transcriptPath),
      crlfDelay: Infinity
    });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed)
        continue;
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      accumulateTranscriptLine(state, obj);
    }
  } catch (err) {
    return { ...empty, error: err.message };
  }
  return {
    turns: state.turns,
    model: state.model,
    tools: state.tools,
    skills: [...state.skills],
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    cacheReadInputTokens: state.cacheReadInputTokens,
    cacheCreationInputTokens: state.cacheCreationInputTokens
  };
}
async function collectEventPayloads(events) {
  const startPayloads = [];
  const startTimestamps = [];
  const stopPayloads = [];
  const stopTimestamps = [];
  for (const event of events) {
    const payload = await loadPayload(event.payloadPath);
    if (event.event === "subagent_start") {
      startPayloads.push(payload);
      startTimestamps.push(event.timestamp);
    } else {
      stopPayloads.push(payload);
      stopTimestamps.push(event.timestamp);
    }
  }
  return { startPayloads, startTimestamps, stopPayloads, stopTimestamps };
}
async function enrichPairsWithTranscripts(pairs) {
  return Promise.all(pairs.map(async (pair) => {
    const transcript = await parseTranscript(pair.transcriptPath);
    const startMs = pair.startTs ? new Date(pair.startTs).getTime() : null;
    const stopMs = pair.stopTs ? new Date(pair.stopTs).getTime() : null;
    const duration_ms = startMs !== null && stopMs !== null ? stopMs - startMs : null;
    return { ...pair, ...transcript, duration_ms };
  }));
}
async function collectEnrichedAgentPairs(repoPath, opts = {}) {
  const { events, fileFound } = await readEventsInWindow(repoPath, opts.startedAt ?? null, opts.endedAt ?? null);
  const { startPayloads, startTimestamps, stopPayloads, stopTimestamps } = await collectEventPayloads(events);
  const pairs = pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps);
  const enriched = await enrichPairsWithTranscripts(pairs);
  return { pairs: enriched, fileFound };
}
var EVENTS_JSONL;
var init_transcript_token_usage = __esm(() => {
  EVENTS_JSONL = [".claude", "logs", "events.jsonl"];
});

// src/scripts/lib/cost-rate-table.mts
function deriveCostUsd(usage, ratesOverride) {
  const rates = ratesOverride?.[usage.model] ?? HARDCODED_RATES[usage.model];
  if (!rates)
    return 0;
  return (usage.inputTokens * rates.input + usage.outputTokens * rates.output + usage.cacheReadInputTokens * rates.cacheRead + usage.cacheCreationInputTokens * rates.cacheCreation) / 1e6;
}
var HARDCODED_RATES;
var init_cost_rate_table = __esm(() => {
  HARDCODED_RATES = {
    "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheCreation: 3.75 },
    "claude-opus-4-7": { input: 15, output: 75, cacheRead: 1.5, cacheCreation: 18.75 },
    "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheCreation: 1.25 }
  };
});

// src/scripts/lib/dispatch-cost-aggregate.mts
var exports_dispatch_cost_aggregate = {};
__export(exports_dispatch_cost_aggregate, {
  aggregateDispatchCost: () => aggregateDispatchCost
});
import fs8 from "fs/promises";
import path8 from "path";
async function readLoopCostRates(repoRoot) {
  try {
    const raw = await fs8.readFile(path8.join(repoRoot, ".claude", "loop.json"), "utf8");
    const parsed = JSON.parse(raw);
    return parsed.loop?.costRates;
  } catch {
    return;
  }
}
function groupById(items, key) {
  const map = new Map;
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k) ?? [];
    bucket.push(item);
    map.set(k, bucket);
  }
  return map;
}
function zeroAggregate(childIds) {
  return {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    model: "unknown",
    partialChildren: [...childIds]
  };
}
function costForPair(pair, ratesOverride) {
  const inputTokens = pair.inputTokens ?? 0;
  const outputTokens = pair.outputTokens ?? 0;
  const cacheReadInputTokens = pair.cacheReadInputTokens ?? 0;
  const cacheCreationInputTokens = pair.cacheCreationInputTokens ?? 0;
  const pairModel = pair.model ?? "n/a";
  if (pairModel === "n/a") {
    return { inputTokens, outputTokens, costUsd: 0, model: null };
  }
  const costUsd = deriveCostUsd({ model: pairModel, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens }, ratesOverride);
  return { inputTokens, outputTokens, costUsd, model: pairModel };
}
function correlateAgentTypeGroup(typedPlans, candidates, ratesOverride, totals) {
  if (typedPlans.length !== 1 || candidates.length !== 1) {
    for (const plan of typedPlans)
      totals.partialChildren.push(plan.id);
    return;
  }
  const contribution = costForPair(candidates[0], ratesOverride);
  totals.totalInput += contribution.inputTokens;
  totals.totalOutput += contribution.outputTokens;
  totals.totalCost += contribution.costUsd;
  if (totals.model === "unknown" && contribution.model)
    totals.model = contribution.model;
}
async function aggregateDispatchCost(plans, opts) {
  const childIds = plans.map((p) => p.id);
  if (plans.length === 0)
    return zeroAggregate([]);
  let pairs;
  let fileFound;
  try {
    ({ pairs, fileFound } = await collectEnrichedAgentPairs(opts.repoRoot, {
      startedAt: opts.startedAt,
      endedAt: opts.completedAt
    }));
  } catch {
    return zeroAggregate(childIds);
  }
  if (!fileFound || pairs.length === 0)
    return zeroAggregate(childIds);
  const ratesOverride = opts.costRates ?? await readLoopCostRates(opts.repoRoot);
  const pairsByType = groupById(pairs, (p) => p.agentType || "unknown");
  const plansByType = groupById(plans, (p) => p.agentType || "unknown");
  const totals = {
    totalInput: 0,
    totalOutput: 0,
    totalCost: 0,
    model: "unknown",
    partialChildren: []
  };
  for (const [agentType, typedPlans] of plansByType) {
    correlateAgentTypeGroup(typedPlans, pairsByType.get(agentType) ?? [], ratesOverride, totals);
  }
  const { totalInput, totalOutput, totalCost, model, partialChildren } = totals;
  return {
    totalTokens: totalInput + totalOutput,
    promptTokens: totalInput,
    completionTokens: totalOutput,
    estimatedCostUsd: totalCost,
    model,
    partialChildren
  };
}
var init_dispatch_cost_aggregate = __esm(() => {
  init_transcript_token_usage();
  init_cost_rate_table();
});

// src/scripts/lib/dispatch-pr-mode.mts
var exports_dispatch_pr_mode = {};
__export(exports_dispatch_pr_mode, {
  dispatchFinalizePr: () => dispatchFinalizePr,
  _internals: () => _internals2
});
import { spawnSync as nodeSpawnSync } from "child_process";
async function dispatchFinalizePr(children, _repoPath) {
  const results = [];
  for (const child of children) {
    if (child.status !== "DONE") {
      continue;
    }
    const { branch, worktreePath } = child;
    let prUrl = null;
    let error;
    try {
      _internals2.execGit(["push", "origin", branch], worktreePath);
      const title = _internals2.execGit(["log", "-1", "--format=%s"], worktreePath);
      const logLines = _internals2.execGit(["log", "main..HEAD", "--oneline"], worktreePath);
      const bullets = logLines.split(`
`).filter((l) => l.trim().length > 0).map((l) => `- ${l}`).join(`
`);
      const body = bullets.length > 0 ? bullets : "No commits beyond main.";
      const ghOut = _internals2.execGh([
        "pr",
        "create",
        "--title",
        title || branch,
        "--body",
        body,
        "--head",
        branch,
        "--base",
        "main"
      ], worktreePath);
      const firstLine = ghOut.split(`
`).find((l) => l.trim().length > 0) ?? null;
      prUrl = firstLine;
    } catch (err) {
      error = err.message;
    }
    results.push({ branch, prUrl, ...error !== undefined ? { error } : {} });
  }
  return results;
}
var _internals2;
var init_dispatch_pr_mode = __esm(() => {
  _internals2 = {
    execGit: (args, cwd) => {
      const result = nodeSpawnSync("git", args, {
        cwd,
        encoding: "utf8",
        shell: process.platform === "win32"
      });
      if (result.status !== 0) {
        const msg = result.stderr ?? "";
        throw new Error(`git ${args.join(" ")} failed: ${msg.trim()}`);
      }
      return (result.stdout ?? "").trim();
    },
    execGh: (args, cwd) => {
      const result = nodeSpawnSync("gh", args, {
        cwd,
        encoding: "utf8",
        shell: process.platform === "win32"
      });
      if (result.status !== 0) {
        const msg = result.stderr ?? "";
        throw new Error(`gh ${args.join(" ")} failed: ${msg.trim()}`);
      }
      return (result.stdout ?? "").trim();
    }
  };
});

// src/scripts/lib/dispatch-recover.mts
var exports_dispatch_recover = {};
__export(exports_dispatch_recover, {
  recoverRun: () => recoverRun
});
import fs9 from "fs";
import path9 from "path";
function dispatchRunDir(repoRoot, runId) {
  return path9.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
}
function loadWorktreeLog(repoRoot, runId) {
  const wtLog = path9.join(dispatchRunDir(repoRoot, runId), "worktrees.jsonl");
  const branchById = {};
  const cwdById = {};
  for (const line of fs9.readFileSync(wtLog, "utf8").trim().split(`
`)) {
    if (line.trim().length === 0)
      continue;
    const e = JSON.parse(line);
    branchById[e.childId] = e.branch;
    cwdById[e.childId] = e.path;
  }
  return { branchById, cwdById };
}
function reclassifyInterrupted(repoRoot, parentBranch, results) {
  return results.map((r) => {
    if (r.status !== "FAILED" || r.error !== "no marker" || !r.worktreePath)
      return r;
    let hasWork = false;
    try {
      const inv = inventoryWorkerBranch(repoRoot, r.worktreePath, r.branch, parentBranch);
      hasWork = inv.filesOnBranchNotOnMain.length > 0 || inv.uncommittedWip.length > 0;
    } catch {
      hasWork = false;
    }
    if (!hasWork)
      return r;
    return {
      ...r,
      status: "CONFLICTED",
      error: "interrupted: work present, no DONE marker \u2014 needs manual review"
    };
  });
}
function classifyAction(r) {
  if (r.status === "DONE")
    return { action: "merge", reason: "DONE marker present" };
  if (r.status === "FAILED") {
    return { action: "skip", reason: "no marker and no recoverable work" };
  }
  return { action: "preserve", reason: r.error ?? "needs manual review" };
}
function writeRecoverSummary(repoRoot, runId, parentBranch, executed, children) {
  const lines = [
    `# Dispatch recover \u2014 run ${runId}`,
    "",
    `- parent branch: \`${parentBranch}\``,
    `- mode: ${executed ? "EXECUTED (merges applied)" : "DRY RUN (no git side effects)"}`,
    `- children: ${children.length}`,
    "",
    "| id | status | action | branch | reason |",
    "|----|--------|--------|--------|--------|",
    ...children.map((c) => `| ${c.id} | ${c.status} | ${c.action} | \`${c.branch}\` | ${c.reason} |`),
    ""
  ];
  const summaryPath = path9.join(dispatchRunDir(repoRoot, runId), executed ? "recover-summary.md" : "recover-summary.dry-run.md");
  fs9.writeFileSync(summaryPath, lines.join(`
`));
  return summaryPath;
}
function recoverRun(repoRoot, runId, parentBranch, opts = {}) {
  const executed = opts.execute === true;
  const wtLog = path9.join(dispatchRunDir(repoRoot, runId), "worktrees.jsonl");
  if (!fs9.existsSync(wtLog)) {
    throw new DispatchWorktreeError(`no worktrees.jsonl for run "${runId}" (looked in ${wtLog}) \u2014 nothing to recover`);
  }
  const { branchById, cwdById } = loadWorktreeLog(repoRoot, runId);
  for (const [childId, recordedBranch] of Object.entries(branchById)) {
    const expected = `${parentBranch}-${childId}`;
    if (recordedBranch !== expected) {
      throw new DispatchWorktreeError(`parent-branch mismatch: run "${runId}" recorded child "${childId}" on branch ` + `"${recordedBranch}", but --parent-branch "${parentBranch}" implies "${expected}". ` + "Pass the parent branch this run was actually dispatched from.");
    }
  }
  const plans = Object.keys(branchById).map((id) => ({
    id,
    priority: 0,
    agentType: "",
    prompt: ""
  }));
  let results = aggregateResults(repoRoot, runId, plans, branchById, cwdById);
  results = reclassifyInterrupted(repoRoot, parentBranch, results);
  const children = results.map((r) => {
    const { action, reason } = classifyAction(r);
    return {
      id: r.id,
      status: r.status,
      branch: r.branch,
      worktreePath: r.worktreePath,
      action,
      reason
    };
  });
  if (executed) {
    mergeChildren(repoRoot, parentBranch, results, plans, runId);
  }
  const summaryPath = writeRecoverSummary(repoRoot, runId, parentBranch, executed, children);
  return { runId, parentBranch, executed, children, summaryPath };
}
var init_dispatch_recover = __esm(() => {
  init_dispatch_aggregate();
  init_dispatch_merge();
  init_dispatch_worktree();
  init_dispatch_types();
});

// node_modules/@astragenie/plugin-std/dist/git.js
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

// src/scripts/lib/run-git.mts
var init_run_git = __esm(() => {
  init_git();
});

// src/scripts/lib/devcrew-config.mts
var init_devcrew_config = () => {};

// src/scripts/lib/config-resolver.mts
import fs10 from "fs";
import path10 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var scriptDir, presetDir;
var init_config_resolver = __esm(() => {
  init_devcrew_config();
  scriptDir = path10.dirname(fileURLToPath2(import.meta.url));
  if (process.env["CLAUDE_PLUGIN_ROOT"]) {
    presetDir = path10.join(process.env["CLAUDE_PLUGIN_ROOT"], "scripts", "presets");
  } else {
    presetDir = path10.resolve(scriptDir, "..", "presets");
    if (!fs10.existsSync(presetDir)) {
      presetDir = path10.resolve(scriptDir, "..", "..", "..", "scripts", "presets");
    }
  }
});

// src/scripts/lib/frontmatter.mts
var init_frontmatter = () => {};

// src/scripts/lib/cache.mts
var _store;
var init_cache = __esm(() => {
  _store = new Map;
});

// src/scripts/lib/paths.mts
var init_paths = __esm(() => {
  init_cache();
});

// src/scripts/lib/frontmatter-cache.mts
var cache;
var init_frontmatter_cache = __esm(() => {
  cache = new Map;
});

// src/scripts/lib/backlog-parser.mts
var init_backlog_parser = __esm(() => {
  init_frontmatter();
  init_frontmatter_cache();
  init_paths();
  init_cache();
});

// src/scripts/lib/state-paths.mts
var init_state_paths = __esm(() => {
  init_paths();
});

// src/scripts/lib/slice-title.mts
var init_slice_title = () => {};
// src/scripts/lib/backlog-store/shared.mts
var init_shared = __esm(() => {
  init_frontmatter();
  init_cache();
  init_frontmatter_cache();
  init_state_paths();
});

// src/scripts/lib/backlog-store/slice-id-allocator.mts
var init_slice_id_allocator = __esm(() => {
  init_paths();
  init_run_git();
});

// src/scripts/lib/backlog-store/slice-store.mts
var init_slice_store = __esm(() => {
  init_frontmatter();
  init_paths();
  init_state_paths();
  init_cache();
  init_frontmatter_cache();
  init_slice_title();
  init_shared();
  init_slice_id_allocator();
});

// src/scripts/lib/state-schemas.mts
var FEAT_STATUSES, PRIORITIES;
var init_state_schemas = __esm(() => {
  FEAT_STATUSES = new Set(["pending", "triaged", "in-progress", "done", "wont_fix"]);
  PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);
});

// src/scripts/lib/env-profiles.mts
var init_env_profiles = () => {};
// src/scripts/lib/token-store.mts
var init_token_store = () => {};

// src/scripts/lib/webhook-sender.mts
var init_webhook_sender = () => {};

// src/scripts/lib/event-notifier.mts
var init_event_notifier = __esm(() => {
  init_env_profiles();
  init_token_store();
  init_webhook_sender();
});

// src/scripts/lib/webhook-fanout.mts
var init_webhook_fanout = __esm(() => {
  init_event_notifier();
  init_webhook_sender();
});

// src/scripts/lib/backlog-state-emitter.mts
var init_backlog_state_emitter = __esm(() => {
  init_webhook_fanout();
});

// src/scripts/lib/backlog-store/feature-store.mts
var init_feature_store = __esm(() => {
  init_frontmatter();
  init_backlog_parser();
  init_paths();
  init_cache();
  init_state_paths();
  init_state_schemas();
  init_backlog_state_emitter();
  init_shared();
});

// src/scripts/lib/backlog-store.mts
var init_backlog_store = __esm(() => {
  init_backlog_parser();
  init_paths();
  init_slice_store();
  init_feature_store();
  init_slice_store();
});

// src/scripts/lib/backlog-writer.mts
var init_backlog_writer = __esm(() => {
  init_backlog_store();
  init_backlog_store();
});

// src/scripts/lib/pm-effort-mapper.mts
var BANDS;
var init_pm_effort_mapper = __esm(() => {
  BANDS = [
    { lo: 0, hi: 0.1, points: 1 },
    { lo: 0.1, hi: 0.25, points: 2 },
    { lo: 0.25, hi: 0.4, points: 3 },
    { lo: 0.4, hi: 0.6, points: 5 },
    { lo: 0.6, hi: 0.85, points: 8 },
    { lo: 0.85, hi: Number.POSITIVE_INFINITY, points: 13 }
  ];
});

// src/scripts/lib/proposed-slices.mts
var init_proposed_slices = __esm(() => {
  init_pm_effort_mapper();
});

// src/scripts/lib/classify-parser.mts
var VALID_TAGS;
var init_classify_parser = __esm(() => {
  VALID_TAGS = new Set([
    "api-change",
    "storage",
    "workflow",
    "ux",
    "auth",
    "infra",
    "test",
    "docs",
    "refactor"
  ]);
});

// src/scripts/lib/ceremonies.mts
var init_ceremonies = () => {};

// src/scripts/lib/slice-linker/git-anchored-completion.mts
var init_git_anchored_completion = __esm(() => {
  init_run_git();
});
// src/scripts/lib/slice-linker/feature-lifecycle.mts
var init_feature_lifecycle = __esm(() => {
  init_config_resolver();
  init_frontmatter();
  init_paths();
  init_backlog_writer();
  init_backlog_store();
  init_proposed_slices();
  init_classify_parser();
  init_ceremonies();
  init_proposed_slices();
  init_run_git();
  init_git_anchored_completion();
});

// src/scripts/lib/reviewer-timing.mts
var init_reviewer_timing = () => {};

// src/scripts/lib/crew-workflow-reader.mts
var init_crew_workflow_reader = () => {};

// src/scripts/lib/blocked-badge-staleness.mts
var MS_PER_DAY;
var init_blocked_badge_staleness = __esm(() => {
  init_crew_workflow_reader();
  MS_PER_DAY = 24 * 60 * 60 * 1000;
});

// crew/scripts/lib/workflow-state-gates.mts
var RESOLVED_GATE_STATUSES;
var init_workflow_state_gates = __esm(() => {
  RESOLVED_GATE_STATUSES = new Set(["passed", "failed", "skipped"]);
});

// crew/scripts/lib/fs-utils.mts
var init_fs_utils = () => {};

// crew/node_modules/@astragenie/plugin-std/dist/errors.js
var init_errors2 = () => {};
// crew/node_modules/@astragenie/plugin-std/dist/jsonl.js
var init_jsonl2 = __esm(() => {
  init_errors2();
});

// crew/node_modules/@astragenie/plugin-std/dist/http.js
var init_http = __esm(() => {
  init_errors2();
});

// crew/node_modules/yaml/dist/nodes/identity.js
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

// crew/node_modules/yaml/dist/visit.js
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
  function visit_(key, node, visitor, path11) {
    const ctrl = callVisitor(key, node, visitor, path11);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path11, ctrl);
      return visit_(key, ctrl, visitor, path11);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path11 = Object.freeze(path11.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path11);
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
        path11 = Object.freeze(path11.concat(node));
        const ck = visit_("key", node.key, visitor, path11);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path11);
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
  async function visitAsync_(key, node, visitor, path11) {
    const ctrl = await callVisitor(key, node, visitor, path11);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path11, ctrl);
      return visitAsync_(key, ctrl, visitor, path11);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path11 = Object.freeze(path11.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path11);
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
        path11 = Object.freeze(path11.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path11);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path11);
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
  function callVisitor(key, node, visitor, path11) {
    if (typeof visitor === "function")
      return visitor(key, node, path11);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path11);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path11);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path11);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path11);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path11);
    return;
  }
  function replaceNode(key, path11, node) {
    const parent = path11[path11.length - 1];
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

// crew/node_modules/yaml/dist/doc/directives.js
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

// crew/node_modules/yaml/dist/doc/anchors.js
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

// crew/node_modules/yaml/dist/doc/applyReviver.js
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

// crew/node_modules/yaml/dist/nodes/toJS.js
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

// crew/node_modules/yaml/dist/nodes/Node.js
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

// crew/node_modules/yaml/dist/nodes/Alias.js
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

// crew/node_modules/yaml/dist/nodes/Scalar.js
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

// crew/node_modules/yaml/dist/doc/createNode.js
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

// crew/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS((exports) => {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path11, value) {
    let v = value;
    for (let i = path11.length - 1;i >= 0; --i) {
      const k = path11[i];
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
  var isEmptyPath = (path11) => path11 == null || typeof path11 === "object" && !!path11[Symbol.iterator]().next().done;

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
    addIn(path11, value) {
      if (isEmptyPath(path11))
        this.add(value);
      else {
        const [key, ...rest] = path11;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path11) {
      const [key, ...rest] = path11;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path11, keepScalar) {
      const [key, ...rest] = path11;
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
    hasIn(path11) {
      const [key, ...rest] = path11;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path11, value) {
      const [key, ...rest] = path11;
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

// crew/node_modules/yaml/dist/stringify/stringifyComment.js
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

// crew/node_modules/yaml/dist/stringify/foldFlowLines.js
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

// crew/node_modules/yaml/dist/stringify/stringifyString.js
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
    let chomp2;
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
      chomp2 = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp2 = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp2 = "";
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
    let header = (startWithSpace ? indentSize : "") + chomp2;
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

// crew/node_modules/yaml/dist/stringify/stringify.js
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

// crew/node_modules/yaml/dist/stringify/stringifyPair.js
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

// crew/node_modules/yaml/dist/log.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/merge.js
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

// crew/node_modules/yaml/dist/nodes/addPairToJSMap.js
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

// crew/node_modules/yaml/dist/nodes/Pair.js
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

// crew/node_modules/yaml/dist/stringify/stringifyCollection.js
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

// crew/node_modules/yaml/dist/nodes/YAMLMap.js
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

// crew/node_modules/yaml/dist/schema/common/map.js
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

// crew/node_modules/yaml/dist/nodes/YAMLSeq.js
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

// crew/node_modules/yaml/dist/schema/common/seq.js
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

// crew/node_modules/yaml/dist/schema/common/string.js
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

// crew/node_modules/yaml/dist/schema/common/null.js
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

// crew/node_modules/yaml/dist/schema/core/bool.js
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

// crew/node_modules/yaml/dist/stringify/stringifyNumber.js
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

// crew/node_modules/yaml/dist/schema/core/float.js
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

// crew/node_modules/yaml/dist/schema/core/int.js
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

// crew/node_modules/yaml/dist/schema/core/schema.js
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

// crew/node_modules/yaml/dist/schema/json/schema.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/binary.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/omap.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/bool.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/float.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/int.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/set.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
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

// crew/node_modules/yaml/dist/schema/yaml-1.1/schema.js
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

// crew/node_modules/yaml/dist/schema/tags.js
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

// crew/node_modules/yaml/dist/schema/Schema.js
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

// crew/node_modules/yaml/dist/stringify/stringifyDocument.js
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

// crew/node_modules/yaml/dist/doc/Document.js
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
    addIn(path11, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path11, value);
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
    deleteIn(path11) {
      if (Collection.isEmptyPath(path11)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path11) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path11, keepScalar) {
      if (Collection.isEmptyPath(path11))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path11, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path11) {
      if (Collection.isEmptyPath(path11))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path11) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path11, value) {
      if (Collection.isEmptyPath(path11)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path11), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path11, value);
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

// crew/node_modules/yaml/dist/errors.js
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

// crew/node_modules/yaml/dist/compose/resolve-props.js
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

// crew/node_modules/yaml/dist/compose/util-contains-newline.js
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

// crew/node_modules/yaml/dist/compose/util-flow-indent-check.js
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

// crew/node_modules/yaml/dist/compose/util-map-includes.js
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

// crew/node_modules/yaml/dist/compose/resolve-block-map.js
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

// crew/node_modules/yaml/dist/compose/resolve-block-seq.js
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

// crew/node_modules/yaml/dist/compose/resolve-end.js
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

// crew/node_modules/yaml/dist/compose/resolve-flow-collection.js
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

// crew/node_modules/yaml/dist/compose/compose-collection.js
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

// crew/node_modules/yaml/dist/compose/resolve-block-scalar.js
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
    let chomp2 = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp2 && (ch === "-" || ch === "+"))
        chomp2 = ch;
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
    return { mode, indent, chomp: chomp2, comment, length };
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

// crew/node_modules/yaml/dist/compose/resolve-flow-scalar.js
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
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
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

// crew/node_modules/yaml/dist/compose/compose-scalar.js
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

// crew/node_modules/yaml/dist/compose/util-empty-scalar-position.js
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

// crew/node_modules/yaml/dist/compose/compose-node.js
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

// crew/node_modules/yaml/dist/compose/compose-doc.js
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

// crew/node_modules/yaml/dist/compose/composer.js
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

// crew/node_modules/yaml/dist/parse/cst-scalar.js
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

// crew/node_modules/yaml/dist/parse/cst-stringify.js
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

// crew/node_modules/yaml/dist/parse/cst-visit.js
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
  visit.itemAtPath = (cst, path11) => {
    let item = cst;
    for (const [field, index] of path11) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path11) => {
    const parent = visit.itemAtPath(cst, path11.slice(0, -1));
    const field = path11[path11.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path11, item, visitor) {
    let ctrl = visitor(item, path11);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path11.concat([[field, i]])), token.items[i], visitor);
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
          ctrl = ctrl(item, path11);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path11) : ctrl;
  }
  exports.visit = visit;
});

// crew/node_modules/yaml/dist/parse/cst.js
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

// crew/node_modules/yaml/dist/parse/lexer.js
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

// crew/node_modules/yaml/dist/parse/line-counter.js
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

// crew/node_modules/yaml/dist/parse/parser.js
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
            const fs11 = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs11, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs11);
            } else {
              Object.assign(it, { key: fs11, sep: [] });
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
            const fs11 = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs11, sep: [] });
            else if (it.sep)
              this.stack.push(fs11);
            else
              Object.assign(it, { key: fs11, sep: [] });
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

// crew/node_modules/yaml/dist/public-api.js
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

// crew/node_modules/yaml/dist/index.js
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

// crew/node_modules/@astragenie/plugin-std/dist/frontmatter.js
var init_frontmatter2 = __esm(() => {
  init_dist();
  init_errors2();
});

// crew/node_modules/@astragenie/plugin-std/dist/git.js
var init_git2 = __esm(() => {
  init_errors2();
});

// crew/node_modules/@astragenie/plugin-std/dist/index.js
var init_dist2 = __esm(() => {
  init_errors2();
  init_jsonl2();
  init_http();
  init_frontmatter2();
  init_git2();
});

// crew/scripts/lib/result.mts
var init_result = __esm(() => {
  init_dist2();
});

// crew/scripts/lib/workflow-state.mts
var STATE_DIR, WORKFLOW_STATE_PATH, WORKFLOW_STATE_LOCK_PATH;
var init_workflow_state = __esm(() => {
  init_workflow_state_gates();
  init_fs_utils();
  init_result();
  STATE_DIR = [".claude", "state", "crew"];
  WORKFLOW_STATE_PATH = [...STATE_DIR, "workflow-state.json"];
  WORKFLOW_STATE_LOCK_PATH = [...STATE_DIR, "workflow-state.lock"];
});
// crew/scripts/lib/cost-hygiene/render-frontmatter.mts
var init_render_frontmatter = () => {};

// crew/scripts/lib/artifacts/read.mts
var init_read = () => {};

// crew/scripts/lib/dispatch-timing-reader.mts
var init_dispatch_timing_reader = () => {};
// crew/scripts/lib/artifacts/write.mts
var pendingCaptures;
var init_write = __esm(() => {
  init_workflow_state();
  init_render_frontmatter();
  init_read();
  init_result();
  init_dispatch_timing_reader();
  pendingCaptures = new Set;
});

// crew/scripts/lib/cost-hygiene/cost-report-guard.mts
var init_cost_report_guard = () => {};

// crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
var init_cost_slice_handler = __esm(() => {
  init_dispatch_timing_reader();
  init_cost_report_guard();
});

// crew/scripts/lib/cost-hygiene/cost-advise-writer.mts
var init_cost_advise_writer = () => {};

// crew/scripts/lib/cost-advisor-grades.mts
var init_cost_advisor_grades = () => {};

// crew/scripts/lib/cost-advisor-rules.mts
var init_cost_advisor_rules = () => {};

// crew/scripts/lib/cost-advisor.mts
var init_cost_advisor = __esm(() => {
  init_dist2();
  init_cost_advisor_grades();
  init_cost_advisor_rules();
  init_cost_advisor_grades();
});

// src/scripts/lib/artifact-naming.mts
var KIND_REGISTRY;
var init_artifact_naming = __esm(() => {
  KIND_REGISTRY = new Set([
    "agentReport",
    "costReportSlice",
    "costReportAggregate",
    "costAdvise",
    "reviewResult",
    "validationResult",
    "finalSynthesis",
    "pmReview",
    "autoRun",
    "handoff",
    "grade",
    "plan",
    "retro",
    "trajectory",
    "fanoutMarker",
    "shapeMarker",
    "design"
  ]);
});

// src/scripts/lib/slice-linker/astrarunner-ingest.mts
var init_astrarunner_ingest = __esm(() => {
  init_env_profiles();
  init_token_store();
});

// src/scripts/lib/cost-by-skill.mts
var DISPATCH_KIND_SET;
var init_cost_by_skill = __esm(() => {
  DISPATCH_KIND_SET = new Set(["auto", "manual", "wave", "hierarchical"]);
});

// src/scripts/lib/audit-envelope-join.mts
var init_audit_envelope_join = __esm(() => {
  init_cost_by_skill();
});

// src/scripts/lib/auto-dispatch.mts
var VALID_DISPATCH_KINDS, pendingBatches;
var init_auto_dispatch = __esm(() => {
  init_webhook_fanout();
  init_jsonl_append();
  VALID_DISPATCH_KINDS = new Set(["auto", "manual", "wave", "hierarchical"]);
  pendingBatches = new Map;
});

// src/scripts/lib/slice-linker/agent-report-writer.mts
var init_agent_report_writer = __esm(() => {
  init_artifact_naming();
  init_frontmatter();
  init_astrarunner_ingest();
  init_cost_rate_table();
  init_audit_envelope_join();
  init_cost_by_skill();
  init_auto_dispatch();
  init_transcript_token_usage();
});

// src/scripts/lib/slice-linker/cost-report-dedup.mts
var SESSION_DEDUP_WINDOW_MS;
var init_cost_report_dedup = __esm(() => {
  init_frontmatter();
  SESSION_DEDUP_WINDOW_MS = 10 * 60 * 1000;
});

// src/scripts/lib/slice-id-guard.mts
var init_slice_id_guard = () => {};

// src/scripts/lib/slice-linker/cost-scan-cursor.mts
var init_cost_scan_cursor = __esm(() => {
  init_slice_id_guard();
});

// src/scripts/lib/slice-linker/crew-bridge.mts
var init_crew_bridge = __esm(() => {
  init_write();
  init_cost_slice_handler();
  init_cost_advise_writer();
  init_cost_advisor();
  init_workflow_state();
  init_artifact_naming();
  init_paths();
  init_webhook_fanout();
  init_run_git();
  init_crew_workflow_reader();
  init_agent_report_writer();
  init_cost_report_dedup();
  init_cost_scan_cursor();
});
// src/scripts/lib/artifact-verdict.mts
var init_artifact_verdict = __esm(() => {
  init_frontmatter();
});

// src/scripts/lib/validation-gate.mts
import path11 from "path";
var DEFAULT_VALIDATION_DIR;
var init_validation_gate = __esm(() => {
  init_crew_workflow_reader();
  init_artifact_verdict();
  init_paths();
  init_frontmatter();
  DEFAULT_VALIDATION_DIR = path11.join(".claude", "artifacts", "crew", "validations");
});

// src/scripts/lib/artifact-linkage.mts
var init_artifact_linkage = __esm(() => {
  init_frontmatter();
  init_config_resolver();
  init_paths();
  init_backlog_store();
});

// src/scripts/lib/test-adequacy-gate.mts
var init_test_adequacy_gate = __esm(() => {
  init_artifact_linkage();
});

// src/scripts/lib/slice-linker/slice-progress.mts
var init_slice_progress = __esm(() => {
  init_frontmatter();
  init_run_git();
  init_paths();
});

// src/scripts/lib/auto-merge.mts
var init_auto_merge = __esm(() => {
  init_crew_workflow_reader();
  init_run_git();
});

// src/scripts/lib/slice-linker/tracker-close-sync.mts
var init_tracker_close_sync = __esm(() => {
  init_frontmatter();
});

// src/scripts/lib/profile-feedback.mts
var init_profile_feedback = () => {};

// src/scripts/lib/features-service.mts
var init_features_service = () => {};
// src/scripts/lib/trajectory-writer.mts
var _buffer;
var init_trajectory_writer = __esm(() => {
  _buffer = new Map;
});

// src/scripts/lib/slice-events.mts
var init_slice_events = __esm(() => {
  init_jsonl_append();
  init_trajectory_writer();
  init_webhook_fanout();
});

// src/scripts/lib/slice-linker/artifact-lock-writer.mts
import fs11 from "fs/promises";
import path12 from "path";
function lockDir(repoPath) {
  return path12.join(repoPath, ...LOCK_DIR_SEGMENTS);
}
function lockFilePath(repoPath, sliceId) {
  return path12.join(lockDir(repoPath), `${sliceId}.json`);
}
async function removeArtifactLock(repoPath, sliceId) {
  try {
    await fs11.rm(lockFilePath(repoPath, sliceId), { force: true });
  } catch (err2) {
    console.warn(`[artifact-lock-writer] failed to remove lock for ${sliceId}: ${String(err2)}`);
  }
}
var LOCK_DIR_SEGMENTS, LOCK_TTL_MS;
var init_artifact_lock_writer = __esm(() => {
  LOCK_DIR_SEGMENTS = [".claude", "state", "loop", "artifact-locks"];
  LOCK_TTL_MS = 48 * 60 * 60 * 1000;
});

// src/scripts/lib/slice-linker/qa-gate-preflight.mts
import path13 from "path";
var VALIDATIONS_DIR;
var init_qa_gate_preflight = __esm(() => {
  init_frontmatter();
  init_slice_events();
  init_artifact_lock_writer();
  VALIDATIONS_DIR = path13.join(".claude", "artifacts", "crew", "validations");
});

// src/scripts/lib/slice-linker/dispatch.mts
var FRONTEND_STACK_TAGS, BACKEND_STACK_TAGS, CLASSIFY_UI_TAGS, CLASSIFY_API_TAGS;
var init_dispatch = __esm(() => {
  init_frontmatter();
  init_paths();
  init_features_service();
  init_qa_gate_preflight();
  FRONTEND_STACK_TAGS = new Set(["stack:react"]);
  BACKEND_STACK_TAGS = new Set([
    "stack:csharp",
    "stack:dotnet",
    "stack:node",
    "stack:python",
    "stack:go",
    "stack:java",
    "stack:rust"
  ]);
  CLASSIFY_UI_TAGS = new Set(["ux"]);
  CLASSIFY_API_TAGS = new Set(["api-change", "storage"]);
});

// src/scripts/lib/slice-linker/close-memory-capture.mts
var VALID_LEARNING_TYPES;
var init_close_memory_capture = __esm(() => {
  init_dispatch();
  VALID_LEARNING_TYPES = new Set(["lesson", "decision", "fact"]);
});

// src/scripts/lib/slice-linker/complete-slice.mts
var init_complete_slice = __esm(() => {
  init_config_resolver();
  init_frontmatter();
  init_reviewer_timing();
  init_backlog_writer();
  init_backlog_store();
  init_crew_workflow_reader();
  init_blocked_badge_staleness();
  init_ceremonies();
  init_crew_bridge();
  init_validation_gate();
  init_test_adequacy_gate();
  init_slice_progress();
  init_paths();
  init_auto_merge();
  init_slice_title();
  init_tracker_close_sync();
  init_profile_feedback();
  init_close_memory_capture();
});

// src/scripts/lib/spec-created-emitter.mts
var init_spec_created_emitter = __esm(() => {
  init_webhook_fanout();
});

// src/scripts/lib/spec-parser.mts
var init_spec_parser = __esm(() => {
  init_frontmatter();
  init_paths();
  init_cache();
  init_spec_created_emitter();
});

// src/scripts/lib/grade-parser.mts
var init_grade_parser = __esm(() => {
  init_frontmatter();
  init_paths();
  init_cache();
});

// src/scripts/lib/learnings.mts
var canonicalRootCache;
var init_learnings = __esm(() => {
  init_jsonl_append();
  init_run_git();
  canonicalRootCache = new Map;
});

// src/scripts/lib/grade-jsonl-writer.mts
import path14 from "path";
var GRADE_JSONL_RELATIVE;
var init_grade_jsonl_writer = __esm(() => {
  init_jsonl_append();
  init_learnings();
  GRADE_JSONL_RELATIVE = path14.join(".claude", "artifacts", "loop", "grades.jsonl");
});

// src/scripts/lib/lessons-feed.mts
var init_lessons_feed = __esm(() => {
  init_grade_parser();
});

// src/scripts/lib/grade-writer.mts
import { existsSync } from "fs";
import path15 from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var scriptDir2, templateDir;
var init_grade_writer = __esm(() => {
  init_frontmatter();
  init_backlog_writer();
  init_slice_linker();
  init_spec_parser();
  init_grade_parser();
  init_paths();
  init_artifact_naming();
  init_grade_jsonl_writer();
  init_webhook_fanout();
  init_features_service();
  init_lessons_feed();
  scriptDir2 = path15.dirname(fileURLToPath3(import.meta.url));
  if (process.env["CLAUDE_PLUGIN_ROOT"]) {
    templateDir = path15.join(process.env["CLAUDE_PLUGIN_ROOT"], "templates");
  } else {
    templateDir = path15.resolve(scriptDir2, "..", "..", "templates");
    if (!existsSync(templateDir)) {
      templateDir = path15.resolve(scriptDir2, "..", "..", "..", "templates");
    }
  }
});

// src/scripts/lib/grade-yaml-normalizer.mts
var init_grade_yaml_normalizer = __esm(() => {
  init_frontmatter();
  init_grade_parser();
});

// src/scripts/lib/slice-linker/close-dispatch-telemetry.mts
var init_close_dispatch_telemetry = () => {};

// src/scripts/lib/slice-linker/close-slice.mts
var init_close_slice = __esm(() => {
  init_complete_slice();
  init_grade_writer();
  init_grade_yaml_normalizer();
  init_paths();
  init_frontmatter();
  init_config_resolver();
  init_backlog_writer();
  init_cache();
  init_features_service();
  init_grade_parser();
  init_artifact_lock_writer();
  init_close_dispatch_telemetry();
});

// src/scripts/lib/grade-trend.mts
var init_grade_trend = () => {};

// src/scripts/lib/ac-linter.mts
var init_ac_linter = () => {};

// src/scripts/lib/contracts-artifact.mts
var init_contracts_artifact = __esm(() => {
  init_paths();
});

// src/scripts/lib/arch-gate.mts
var GATE_PRIORITIES, POSITIVE_FULLSTACK_VARIANTS, APPROVED_VERDICTS, REJECTED_VERDICTS;
var init_arch_gate = __esm(() => {
  init_frontmatter();
  init_backlog_writer();
  init_contracts_artifact();
  GATE_PRIORITIES = new Set(["P0", "P1"]);
  POSITIVE_FULLSTACK_VARIANTS = new Set(["fullstack", "parallel-fe-be"]);
  APPROVED_VERDICTS = new Set(["approved", "approved_with_notes"]);
  REJECTED_VERDICTS = new Set(["rejected", "needs_revision"]);
});

// src/scripts/lib/model-router.mts
var SHAPE_TIER_MAP;
var init_model_router = __esm(() => {
  SHAPE_TIER_MAP = Object.freeze({
    "doc-update": "sonnet",
    "config-tweak": "sonnet",
    "test-only": "sonnet",
    "single-module-edit": "sonnet",
    none: null
  });
});

// src/scripts/lib/slice-plan.mts
var init_slice_plan = __esm(() => {
  init_frontmatter();
  init_paths();
  init_slice_title();
});

// src/scripts/lib/acceptance-criteria.mts
var init_acceptance_criteria = () => {};

// src/scripts/lib/workflow-state-guard.mts
var init_workflow_state_guard = () => {};

// src/scripts/lib/session-drift.mts
var init_session_drift = __esm(() => {
  init_workflow_state_guard();
});

// src/scripts/lib/worktree-manager.mts
var init_worktree_manager = __esm(() => {
  init_run_git();
});

// src/scripts/lib/classify-slice-shape.mts
var PUBLIC_SURFACE;
var init_classify_slice_shape = __esm(() => {
  PUBLIC_SURFACE = new Set([
    "src/scripts/lib/auto-dispatch.mts",
    "src/scripts/lib/halt-badges.mts",
    "src/scripts/lib/auto-walker.mts"
  ]);
});

// src/scripts/lib/shape-marker.mts
var init_shape_marker = __esm(() => {
  init_slice_id_guard();
});

// src/scripts/lib/shape-event-emitter.mts
var init_shape_event_emitter = __esm(() => {
  init_slice_events();
});

// node_modules/@astragenie/astramem-client/dist/resolve.js
var PLUGIN_PKG = "@astragenie/astramem-plugin", SELECTOR_SPECIFIER, PROVIDERS_LOCAL_SPECIFIER, PROVIDERS_SAAS_SPECIFIER;
var init_resolve = __esm(() => {
  SELECTOR_SPECIFIER = [PLUGIN_PKG, "selector"].join("/");
  PROVIDERS_LOCAL_SPECIFIER = [PLUGIN_PKG, "providers/local"].join("/");
  PROVIDERS_SAAS_SPECIFIER = [PLUGIN_PKG, "providers/saas"].join("/");
});

// node_modules/@astragenie/astramem-client/dist/calls.js
var init_calls = __esm(() => {
  init_resolve();
});

// node_modules/@astragenie/astramem-client/dist/daemon-error.js
var init_daemon_error = () => {};

// node_modules/@astragenie/astramem-client/dist/daemon-client.js
var init_daemon_client = __esm(() => {
  init_daemon_error();
});

// node_modules/@astragenie/astramem-client/dist/profile-calls.js
var init_profile_calls = __esm(() => {
  init_calls();
  init_daemon_client();
});

// node_modules/@astragenie/astramem-client/dist/daemon-types.js
var init_daemon_types = () => {};

// node_modules/@astragenie/astramem-client/dist/index.js
var init_dist3 = __esm(() => {
  init_resolve();
  init_calls();
  init_profile_calls();
  init_daemon_client();
  init_daemon_error();
  init_daemon_types();
});

// src/scripts/lib/memory-transport.mts
var init_memory_transport = __esm(() => {
  init_dist3();
});

// src/scripts/lib/slice-linker/start-slice.mts
var RECALL_V1_KINDS;
var init_start_slice = __esm(() => {
  init_config_resolver();
  init_grade_trend();
  init_ac_linter();
  init_crew_bridge();
  init_slice_progress();
  init_paths();
  init_dispatch();
  init_arch_gate();
  init_learnings();
  init_model_router();
  init_slice_plan();
  init_backlog_writer();
  init_feature_lifecycle();
  init_acceptance_criteria();
  init_session_drift();
  init_worktree_manager();
  init_backlog_store();
  init_slice_title();
  init_classify_slice_shape();
  init_shape_marker();
  init_shape_event_emitter();
  init_memory_transport();
  init_workflow_state_guard();
  RECALL_V1_KINDS = new Set(["failure", "lesson", "decision", "standard_violation"]);
});

// src/scripts/lib/checkpoint-commit.mts
var init_checkpoint_commit = __esm(() => {
  init_run_git();
});

// src/scripts/lib/slice-linker.mts
var init_slice_linker = __esm(() => {
  init_feature_lifecycle();
  init_complete_slice();
  init_close_slice();
  init_start_slice();
  init_dispatch();
  init_agent_report_writer();
  init_artifact_lock_writer();
  init_checkpoint_commit();
});

// src/scripts/lib/dispatch-prune.mts
var exports_dispatch_prune = {};
__export(exports_dispatch_prune, {
  pruneStale: () => pruneStale,
  pruneRunId: () => pruneRunId,
  listStaleRunIds: () => listStaleRunIds
});
import fs12 from "fs/promises";
import { existsSync as existsSync2, statSync, readFileSync } from "fs";
import path16 from "path";
function dispatchRoot(repoRoot) {
  return path16.join(repoRoot, ".claude", "artifacts", "loop", "dispatch");
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
async function isInFlight(runDir, nowMs, ageDays, overrideAfterDays) {
  const summaryPath = path16.join(runDir, "summary.md");
  const missingSummary = !existsSync2(summaryPath);
  const tracePath = path16.join(runDir, "trace.jsonl");
  let traceRecentlyModified = false;
  if (existsSync2(tracePath)) {
    try {
      const s = await fs12.stat(tracePath);
      traceRecentlyModified = nowMs - s.mtimeMs < IN_FLIGHT_WINDOW_MS;
    } catch {
      traceRecentlyModified = false;
    }
  }
  if (!missingSummary) {
    return { inFlight: traceRecentlyModified, overrideFired: false };
  }
  if (ageDays >= overrideAfterDays && !traceRecentlyModified) {
    return { inFlight: false, overrideFired: true };
  }
  return { inFlight: true, overrideFired: false };
}
function readWorktreesFromLog(runDir) {
  const logPath = path16.join(runDir, "worktrees.jsonl");
  const worktreePaths = [];
  const branches = [];
  const childIds = [];
  if (!existsSync2(logPath))
    return { worktreePaths, branches, childIds };
  let raw;
  try {
    raw = readFileSync(logPath, "utf8");
  } catch {
    return { worktreePaths, branches, childIds };
  }
  for (const line of raw.split(`
`)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    try {
      const entry = JSON.parse(trimmed);
      if (typeof entry.path === "string")
        worktreePaths.push(entry.path);
      if (typeof entry.branch === "string")
        branches.push(entry.branch);
      if (typeof entry.childId === "string")
        childIds.push(entry.childId);
    } catch {}
  }
  return { worktreePaths, branches, childIds };
}
async function listStaleRunIds(repoRoot, olderThanDays) {
  const dispDir = dispatchRoot(repoRoot);
  let entries;
  try {
    entries = await fs12.readdir(dispDir);
  } catch {
    return [];
  }
  const nowMs = Date.now();
  const overrideAfterDays = olderThanDays * IN_FLIGHT_AGE_OVERRIDE_MULTIPLIER;
  const results = [];
  for (const name of entries) {
    const runDir = path16.join(dispDir, name);
    let isDir = false;
    try {
      const s = await fs12.stat(runDir);
      isDir = s.isDirectory();
    } catch {
      continue;
    }
    if (!isDir)
      continue;
    const ageDays = runIdAgeDays(name, runDir, nowMs);
    if (ageDays < olderThanDays)
      continue;
    const { inFlight, overrideFired } = await isInFlight(runDir, nowMs, ageDays, overrideAfterDays);
    if (overrideFired) {
      console.warn(`[dispatch-prune] age-override forced reap: ${name} has no summary.md but is ` + `${ageDays.toFixed(1)}d old (>= ${overrideAfterDays}d override threshold) \u2014 ` + "treating as stale, not in-flight");
    }
    if (inFlight)
      continue;
    const { worktreePaths, branches } = readWorktreesFromLog(runDir);
    results.push({
      runId: name,
      ageDays,
      worktreeCount: worktreePaths.length,
      branchCount: branches.length
    });
  }
  return results;
}
async function pruneRunId(repoRoot, runId) {
  const dispDir = dispatchRoot(repoRoot);
  const runDir = path16.join(dispDir, runId);
  const errors3 = [];
  let worktreesRemoved = 0;
  let branchesRemoved = 0;
  let dirRemoved = false;
  const { worktreePaths, branches, childIds } = readWorktreesFromLog(runDir);
  for (const childId of childIds)
    await removeArtifactLock(repoRoot, childId);
  for (const wt of worktreePaths) {
    try {
      const result2 = await runGit(["worktree", "remove", "--force", wt], { cwd: repoRoot });
      if (!result2.ok) {
        throw new Error(`git worktree remove --force ${wt} exited ${result2.status}: ${result2.stderr}`);
      }
      worktreesRemoved += 1;
    } catch (err2) {
      errors3.push(`worktree remove ${wt}: ${err2.message}`);
    }
  }
  for (const branch of branches) {
    try {
      const result2 = await runGit(["branch", "-D", branch], { cwd: repoRoot });
      if (!result2.ok) {
        throw new Error(`git branch -D ${branch} exited ${result2.status}: ${result2.stderr}`);
      }
      branchesRemoved += 1;
    } catch (err2) {
      errors3.push(`branch -D ${branch}: ${err2.message}`);
    }
  }
  try {
    await fs12.rm(runDir, { recursive: true, force: true });
    dirRemoved = true;
  } catch (err2) {
    errors3.push(`rm -rf ${runDir}: ${err2.message}`);
  }
  return { worktreesRemoved, branchesRemoved, dirRemoved, errors: errors3 };
}
async function pruneStale(repoRoot, opts = {}) {
  const { olderThanDays = 7, dryRun = false } = opts;
  const stale = await listStaleRunIds(repoRoot, olderThanDays);
  const allErrors = [];
  let pruned = 0;
  let failed = 0;
  if (dryRun) {
    return { listed: stale.length, pruned: 0, failed: 0, errors: [] };
  }
  for (const entry of stale) {
    const result2 = await pruneRunId(repoRoot, entry.runId);
    if (result2.errors.length > 0) {
      failed += 1;
      for (const e of result2.errors) {
        allErrors.push(`[${entry.runId}] ${e}`);
      }
    } else {
      pruned += 1;
    }
  }
  return { listed: stale.length, pruned, failed, errors: allErrors };
}
var IN_FLIGHT_WINDOW_MS, IN_FLIGHT_AGE_OVERRIDE_MULTIPLIER = 3;
var init_dispatch_prune = __esm(() => {
  init_run_git();
  init_slice_linker();
  IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000;
});

// src/scripts/dispatch.mts
import fs13 from "fs";
import path17 from "path";
import process2 from "process";

// src/scripts/lib/node-bun-guard.mjs
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
function ensureBunRuntime(entryUrl, argv) {
  if (process.versions?.bun) {
    return;
  }
  const entryPath = fileURLToPath(entryUrl);
  const result = spawnSync("bun", [entryPath, ...argv], { stdio: "inherit" });
  if (result.error) {
    process.stderr.write([
      "",
      `error: ${entryPath}`,
      "  requires the Bun runtime under Node \u2014 this CLI's internal imports use",
      "  .mjs specifiers that only Bun's resolver maps to the .mts source",
      "  (astragenie/runner-plugin#389).",
      "",
      "  Fix: install Bun <https://bun.sh>, then re-run, e.g.:",
      `    bun "${entryPath}"${argv.length ? ` ${argv.join(" ")}` : ""}`,
      ""
    ].join(`
`));
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

// src/scripts/dispatch.mts
ensureBunRuntime(import.meta.url, process2.argv.slice(2));
var dispatchDepsPromise = null;
function loadDispatchDeps() {
  dispatchDepsPromise ??= Promise.all([
    Promise.resolve().then(() => (init_hierarchical_dispatch(), exports_hierarchical_dispatch)),
    Promise.resolve().then(() => (init_dispatch_metrics(), exports_dispatch_metrics)),
    Promise.resolve().then(() => (init_dispatch_cost_aggregate(), exports_dispatch_cost_aggregate))
  ]).then(([hierarchicalDispatch, dispatchMetrics, dispatchCostAggregate]) => ({
    prepareDispatch: hierarchicalDispatch.prepareDispatch,
    finalizeDispatch: hierarchicalDispatch.finalizeDispatch,
    augmentPrompt: hierarchicalDispatch.augmentPrompt,
    writeDispatchMetrics: dispatchMetrics.writeDispatchMetrics,
    readDispatchMetrics: dispatchMetrics.readDispatchMetrics,
    formatPartialChildrenNote: dispatchMetrics.formatPartialChildrenNote,
    aggregateDispatchCost: dispatchCostAggregate.aggregateDispatchCost
  }));
  return dispatchDepsPromise;
}
var VALUE_FLAGS = {
  "--plan": "planPath",
  "--parent-branch": "parentBranch",
  "--repo": "repo",
  "--run-id": "runId",
  "--config": "configPath",
  "--older-than-days": "olderThanDays",
  "--base": "baseRef"
};
function parseArgs(argv) {
  const [subcommand, ...rest] = argv;
  const args = {
    subcommand: subcommand ?? "help"
  };
  for (let i = 0;i < rest.length; i++) {
    const flag = rest[i];
    const next = rest[i + 1];
    if (flag in VALUE_FLAGS) {
      if (next !== undefined) {
        args[VALUE_FLAGS[flag]] = next;
      }
      i++;
      continue;
    }
    if (flag === "--depth") {
      if (next !== undefined)
        args.depth = Number(next);
      i++;
      continue;
    }
    if (flag === "--older-than-days") {
      if (next !== undefined)
        args.olderThanDays = Number(next);
      i++;
      continue;
    }
    if (flag === "--dry-run")
      args.dryRun = true;
    else if (flag === "--json")
      args.json = true;
    else if (flag === "--pr")
      args.pr = true;
    else if (flag === "--execute")
      args.execute = true;
    else if (flag === "--help" || flag === "-h")
      args.subcommand = "help";
  }
  return args;
}
function readPlanFile(planPath) {
  let raw;
  if (planPath === "-") {
    raw = fs13.readFileSync(0, "utf8");
  } else {
    raw = fs13.readFileSync(planPath, "utf8");
  }
  const parsed = JSON.parse(raw);
  return parsed.plans;
}
function printHelp() {
  process2.stdout.write(`Usage:
  bun src/scripts/dispatch.mts prepare --plan <path|-> --parent-branch <name> [--repo <path>] [--depth N] [--dry-run] [--json] [--base <ref>]
  bun src/scripts/dispatch.mts finalize --run-id <id> --parent-branch <name> --plan <path|-> [--repo <path>] [--depth N] [--pr]
  bun src/scripts/dispatch.mts recover --run-id <id> --parent-branch <name> [--repo <path>] [--execute] [--json]
  bun src/scripts/dispatch.mts metrics --run-id <id> [--repo <path>]
  bun src/scripts/dispatch.mts prune [--dry-run] [--older-than-days N] [--repo <path>]

Subcommands:
  prepare   Run pre-flight gates, spawn worktrees, build Agent batch.
            Outputs: human-readable preview (default), or batch JSON (--json).
            --base    Explicit base ref for child worktrees (default: invoking
                      checkout's current HEAD \u2014 never a possibly-stale branch name).
  finalize  After the caller has invoked the Agent batch, aggregate results,
            merge children to parent branch, write summary.md.
            --pr  Also push each DONE child branch and open a GitHub PR via gh CLI.
  recover   Re-drive finalize for an INTERRUPTED run: read its worktrees.jsonl
            + result markers, merge DONE children, preserve children that have
            work but no DONE marker. DRY-RUN by default (previews the plan +
            writes a dry-run summary, no git side effects); pass --execute to
            apply the merges. Reconstructs plans from the run log \u2014 no --plan.
  metrics   Read and print the dispatch-metrics.json for a completed run.
  prune     List and remove stale closed runId directories, their worktrees,
            and their branches. --dry-run lists candidates without touching disk.
            --older-than-days overrides loop.dispatch.pruneStaleAfterDays (default 7).

`);
}
async function cmdPrepare(args) {
  if (!args.planPath || !args.parentBranch) {
    process2.stderr.write(`--plan and --parent-branch are required
`);
    return 1;
  }
  const { augmentPrompt: augmentPrompt2, prepareDispatch: prepareDispatch2 } = await loadDispatchDeps();
  const repo = args.repo ?? process2.cwd();
  const plans = readPlanFile(args.planPath);
  if (args.dryRun) {
    const runId = "DRYRUN";
    const depth = args.depth ?? 0;
    for (const plan of plans) {
      const childBranch = `${args.parentBranch}-${plan.id}`;
      const childCwd = `<dry-run-cwd-${plan.id}>`;
      const augmented = augmentPrompt2(plan.prompt, {
        runId,
        depth,
        childCwd,
        childBranch,
        childId: plan.id,
        repoRoot: repo
      });
      process2.stdout.write(`=== dispatch ${plan.id} (${plan.agentType}) ===
`);
      process2.stdout.write(augmented);
      process2.stdout.write(`

`);
    }
    return 0;
  }
  const opts = {
    parentBranch: args.parentBranch,
    repoRoot: repo
  };
  if (args.depth !== undefined)
    opts.depth = args.depth;
  if (args.configPath !== undefined)
    opts.configPath = args.configPath;
  if (args.baseRef !== undefined)
    opts.baseRef = args.baseRef;
  const prepared = prepareDispatch2(plans, opts);
  if (args.json) {
    process2.stdout.write(JSON.stringify({
      runId: prepared.runId,
      batch: prepared.batch,
      branchById: prepared.branchById,
      cwdById: prepared.cwdById
    }, null, 2));
    return 0;
  }
  process2.stdout.write(`Prepared run ${prepared.runId}
` + `Worktrees spawned: ${Object.keys(prepared.cwdById).join(", ")}
` + `Next: invoke Agent tool with the ${prepared.batch.length} calls, then run \`finalize --run-id ${prepared.runId}\`
`);
  return 0;
}
function loadWorktreeLog2(repo, runId) {
  const wtLog = path17.join(repo, ".claude/artifacts/loop/dispatch", runId, "worktrees.jsonl");
  const branchById = {};
  const cwdById = {};
  for (const line of fs13.readFileSync(wtLog, "utf8").trim().split(`
`)) {
    const e = JSON.parse(line);
    branchById[e.childId] = e.branch;
    cwdById[e.childId] = e.path;
  }
  return { branchById, cwdById };
}
async function writeFinalizeMetrics(repo, runId, plans, prepared, results) {
  const { aggregateDispatchCost: aggregateDispatchCost2, writeDispatchMetrics: writeDispatchMetrics2 } = await loadDispatchDeps();
  const completedAt = new Date().toISOString();
  const allFailedOrBlocked = results.every((r) => r.status === "FAILED" || r.status === "BLOCKED");
  const startTimestamps = Object.values(prepared.startTimes);
  const startedAt = new Date(startTimestamps.length > 0 ? Math.min(...startTimestamps) : Date.now()).toISOString();
  const costAggregate = await aggregateDispatchCost2(plans, {
    repoRoot: repo,
    startedAt,
    completedAt
  });
  const status = allFailedOrBlocked || costAggregate.partialChildren.length > 0 ? "partial" : "complete";
  const model = costAggregate.model !== "unknown" ? costAggregate.model : process2.env["CLAUDE_MODEL"] ?? "unknown";
  writeDispatchMetrics2(repo, runId, {
    runId,
    startedAt,
    completedAt,
    status,
    totalTokens: costAggregate.totalTokens,
    promptTokens: costAggregate.promptTokens,
    completionTokens: costAggregate.completionTokens,
    estimatedCostUsd: costAggregate.estimatedCostUsd,
    model,
    childCount: plans.length,
    partialChildren: costAggregate.partialChildren
  });
}
async function emitPrResults(results, repo) {
  const { dispatchFinalizePr: dispatchFinalizePr2 } = await Promise.resolve().then(() => (init_dispatch_pr_mode(), exports_dispatch_pr_mode));
  const children = results.map((r) => ({
    branch: r.branch,
    worktreePath: r.worktreePath,
    status: r.status === "DONE" ? "DONE" : r.status === "FAILED" ? "FAILED" : "SKIPPED"
  }));
  const prResults = await dispatchFinalizePr2(children, repo);
  for (const pr of prResults) {
    if (pr.prUrl) {
      process2.stdout.write(`PR created: ${pr.branch} \u2192 ${pr.prUrl}
`);
    } else {
      process2.stderr.write(`PR failed for ${pr.branch}: ${pr.error ?? "unknown error"}
`);
    }
  }
}
async function cmdFinalize(args) {
  if (!args.runId || !args.parentBranch || !args.planPath) {
    process2.stderr.write(`--run-id, --parent-branch, --plan are required
`);
    return 1;
  }
  const { finalizeDispatch: finalizeDispatch2 } = await loadDispatchDeps();
  const repo = args.repo ?? process2.cwd();
  const plans = readPlanFile(args.planPath);
  const { branchById, cwdById } = loadWorktreeLog2(repo, args.runId);
  const prepared = {
    runId: args.runId,
    batch: [],
    branchById,
    cwdById,
    startTimes: Object.fromEntries(plans.map((p) => [p.id, Date.now()]))
  };
  const results = finalizeDispatch2(repo, args.parentBranch, prepared, plans, args.depth ?? 0);
  const summary = path17.join(repo, ".claude/artifacts/loop/dispatch", args.runId, "summary.md");
  process2.stdout.write(`Summary: ${summary}
`);
  await writeFinalizeMetrics(repo, args.runId, plans, prepared, results);
  if (args.pr) {
    await emitPrResults(results, repo);
  }
  const allFailed = results.every((r) => r.status === "FAILED" || r.status === "BLOCKED");
  if (allFailed)
    return 2;
  return 0;
}
async function cmdRecover(args) {
  if (!args.runId || !args.parentBranch) {
    process2.stderr.write(`--run-id and --parent-branch are required
`);
    return 1;
  }
  const { recoverRun: recoverRun2 } = await Promise.resolve().then(() => (init_dispatch_recover(), exports_dispatch_recover));
  const repo = args.repo ?? process2.cwd();
  let outcome;
  try {
    outcome = recoverRun2(repo, args.runId, args.parentBranch, { execute: args.execute === true });
  } catch (err2) {
    process2.stderr.write(`[dispatch-recover] ${err2.message}
`);
    return 1;
  }
  if (args.json) {
    process2.stdout.write(`${JSON.stringify(outcome, null, 2)}
`);
  } else {
    const mode = outcome.executed ? "EXECUTED" : "DRY RUN (pass --execute to apply)";
    const lines = outcome.children.map((c) => `  ${c.id}: ${c.status} \u2192 ${c.action} (${c.reason})`);
    process2.stdout.write(`Recover run ${outcome.runId} on \`${outcome.parentBranch}\` \u2014 ${mode}
${lines.join(`
`)}
Summary: ${outcome.summaryPath}
`);
  }
  return 0;
}
async function cmdMetrics(args) {
  if (!args.runId) {
    process2.stderr.write(`--run-id is required
`);
    return 1;
  }
  const { readDispatchMetrics: readDispatchMetrics2, formatPartialChildrenNote: formatPartialChildrenNote2 } = await loadDispatchDeps();
  const repo = args.repo ?? process2.cwd();
  const metrics = readDispatchMetrics2(repo, args.runId);
  if (!metrics) {
    process2.stderr.write(`[dispatch-metrics] not found: ${args.runId}
`);
    return 1;
  }
  process2.stdout.write(`${JSON.stringify(metrics, null, 2)}
`);
  const note = formatPartialChildrenNote2(metrics);
  if (note)
    process2.stdout.write(`${note}
`);
  return 0;
}
async function cmdPrune(args) {
  const repo = args.repo ?? process2.cwd();
  const dryRun = args.dryRun ?? false;
  let olderThanDays = args.olderThanDays;
  if (olderThanDays === undefined) {
    try {
      const { readDispatchConfig: readDispatchConfig2 } = await Promise.resolve().then(() => (init_dispatch_config(), exports_dispatch_config));
      const cfgPath = path17.join(repo, ".claude", "loop.json");
      const cfg = readDispatchConfig2(cfgPath);
      olderThanDays = cfg.pruneStaleAfterDays;
    } catch {
      olderThanDays = 7;
    }
  }
  const { listStaleRunIds: listStaleRunIds2, pruneRunId: pruneRunId2 } = await Promise.resolve().then(() => (init_dispatch_prune(), exports_dispatch_prune));
  const stale = await listStaleRunIds2(repo, olderThanDays);
  if (stale.length === 0) {
    process2.stdout.write(`[dispatch prune] no stale runIds found (threshold: ${olderThanDays}d)
`);
    return 0;
  }
  process2.stdout.write(`[dispatch prune] ${dryRun ? "DRY-RUN: " : ""}${stale.length} stale runId(s) (>${olderThanDays}d)
`);
  process2.stdout.write(`${"runId".padEnd(40)} ${"ageDays".padEnd(10)} ${"worktrees".padEnd(10)} branches
`);
  process2.stdout.write(`${"-".repeat(75)}
`);
  for (const entry of stale) {
    process2.stdout.write(`${entry.runId.padEnd(40)} ${entry.ageDays.toFixed(1).padEnd(10)} ${String(entry.worktreeCount).padEnd(10)} ${entry.branchCount}
`);
  }
  if (dryRun) {
    process2.stdout.write(`[dispatch prune] --dry-run: no changes made
`);
    return 0;
  }
  let anyFailed = false;
  for (const entry of stale) {
    const result2 = await pruneRunId2(repo, entry.runId);
    if (result2.errors.length > 0) {
      anyFailed = true;
      for (const e of result2.errors) {
        process2.stderr.write(`[dispatch prune] error [${entry.runId}]: ${e}
`);
      }
    } else {
      process2.stderr.write(`[dispatch prune] pruned ${entry.runId} (worktrees=${result2.worktreesRemoved}, branches=${result2.branchesRemoved})
`);
    }
  }
  return anyFailed ? 1 : 0;
}
var parsedArgs = parseArgs(process2.argv.slice(2));
(async () => {
  try {
    switch (parsedArgs.subcommand) {
      case "prepare":
        process2.exitCode = await cmdPrepare(parsedArgs);
        break;
      case "finalize":
        process2.exitCode = await cmdFinalize(parsedArgs);
        break;
      case "recover":
        process2.exitCode = await cmdRecover(parsedArgs);
        break;
      case "metrics":
        process2.exitCode = await cmdMetrics(parsedArgs);
        break;
      case "prune":
        process2.exitCode = await cmdPrune(parsedArgs);
        break;
      case "help":
      default:
        printHelp();
        process2.exitCode = 0;
    }
  } catch (err2) {
    process2.stderr.write(`[dispatch] ${err2.name}: ${err2.message}
`);
    process2.exitCode = 1;
  }
})();
