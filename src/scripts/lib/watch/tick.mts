// watch/tick.mts — runTick(): the deterministic, zero-LLM sweep (Layer 1).
//
// Sweeps every registry entry assigned to this machine's shard (gh issue
// list delta, gh run list --status failure, open-PR statusCheckRollup),
// claims new findings (state write BEFORE any Layer 2 spawn — AC-3),
// respects the machine-wide spawn-gate cap/ceiling (AC-4), and never calls
// an LLM itself — Layer 2 dispatch is fully delegated to the injectable
// `exec.spawnReaction` (mirrors pr-watch.mts's PrWatchExec DI pattern; the
// production default just logs, same as pr-watch.mts::buildDefaultExec's
// dispatchBuilder — real headless `claude -p` wiring is the scheduler
// script's job, SLICE-146).

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import type {
  Finding,
  ReactionAction,
  ReactionSpawn,
  RegistryEntry,
  RegistryFile,
  SpawnGateConfig,
  TickResult
} from "./types.mjs";
import { claimFinding, DEFAULT_CLAIM_LABEL, getActiveClaim } from "./claims.mjs";
import { readRegistry, validateRegistry } from "./registry.mjs";
import { evaluateSpawnGate, DEFAULT_SPAWN_GATE_CONFIG } from "./spawn-gate.mjs";
import { emitWatchReactionEnvelope, emitWatchTickEnvelope } from "./envelopes.mjs";
import {
  acquireTickLock,
  defaultWatchHome,
  readTickState,
  releaseTickLock,
  updateReactionState,
  updateTickState
} from "./state.mjs";

const execFile = promisify(execFileCallback);

// ---------------------------------------------------------------------------
// gh call shapes — tolerant subsets of gh CLI JSON output.

export interface GhIssueLite {
  number: number;
}

export interface GhFailedRunLite {
  databaseId: number;
}

export interface GhPrCheckSnapshot {
  number: number;
  headRefOid: string;
  statusCheckRollup: Array<{ name: string; conclusion: string | null }>;
}

export interface WatchTickExec {
  listOpenIssues: (entry: RegistryEntry) => Promise<GhIssueLite[]>;
  listFailedRuns: (entry: RegistryEntry) => Promise<GhFailedRunLite[]>;
  listOpenPrChecks: (entry: RegistryEntry) => Promise<GhPrCheckSnapshot[]>;
  addClaimLabel: (ghSlug: string, finding: Finding) => Promise<void>;
  spawnReaction: (spawn: ReactionSpawn) => Promise<void>;
  getInFlightReactionCount: (ghSlug: string) => Promise<number>;
  getCostSpentUsd: (ghSlug: string) => Promise<number>;
}

export interface RunTickOptions {
  registryPath: string;
  machineShard: number;
  watchHome?: string;
  exec?: WatchTickExec;
  spawnGateConfig?: SpawnGateConfig;
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Production exec — gh CLI for sweeps + a logging stub for Layer 2 spawn.

export function buildDefaultTickExec(): WatchTickExec {
  return {
    listOpenIssues: async (entry) => {
      const { stdout } = await execFile(
        "gh",
        [
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
        ],
        { encoding: "utf8" }
      );
      return JSON.parse(stdout) as GhIssueLite[];
    },
    listFailedRuns: async (entry) => {
      const { stdout } = await execFile(
        "gh",
        [
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
        ],
        { encoding: "utf8" }
      );
      return JSON.parse(stdout) as GhFailedRunLite[];
    },
    listOpenPrChecks: async (entry) => {
      const { stdout } = await execFile(
        "gh",
        [
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
        ],
        { encoding: "utf8" }
      );
      return JSON.parse(stdout) as GhPrCheckSnapshot[];
    },
    addClaimLabel: async (ghSlug, finding) => {
      if (finding.kind === "failed-run") return; // no GH issue/PR surface to label
      const number = finding.findingId.split(":")[1];
      try {
        await execFile(
          "gh",
          ["issue", "edit", String(number), "--repo", ghSlug, "--add-label", DEFAULT_CLAIM_LABEL],
          { encoding: "utf8" }
        );
      } catch {
        // Best-effort — the state entry is the source of truth; the label
        // is a human-visible hint. Never block the tick on a label failure.
      }
    },
    spawnReaction: async (spawn) => {
      console.log(`[watch-tick] would spawn: ${spawn.command} (cwd=${spawn.cwd})`);
    },
    // Real in-flight tracking + a window-scoped cost ledger are SLICE-145
    // (watch/spawn-gate.mts full implementation). Stubbed per the contract's
    // "spawn-gate can be stubbed as interfaces" allowance for SLICE-143.
    getInFlightReactionCount: async () => 0,
    getCostSpentUsd: async () => 0
  };
}

// ---------------------------------------------------------------------------
// Finding detection — pure functions over gh snapshots + prior tick state.

function detectIssueFindings(
  entry: RegistryEntry,
  issues: GhIssueLite[],
  lastSeenIssue: number | null
): { findings: Finding[]; newLastSeen: number | null } {
  let max = lastSeenIssue;
  const findings: Finding[] = [];
  for (const issue of issues) {
    if (lastSeenIssue === null || issue.number > lastSeenIssue) {
      findings.push({ kind: "issue", findingId: `issue:${issue.number}`, ghSlug: entry.ghSlug });
    }
    if (max === null || issue.number > max) max = issue.number;
  }
  return { findings, newLastSeen: max };
}

function detectFailedRunFindings(
  entry: RegistryEntry,
  runs: GhFailedRunLite[],
  lastFailedRunIds: number[]
): { findings: Finding[]; newLastFailedRunIds: number[] } {
  const priorSet = new Set(lastFailedRunIds);
  const findings: Finding[] = [];
  const currentIds: number[] = [];
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

function detectRedPrFindings(
  entry: RegistryEntry,
  prs: GhPrCheckSnapshot[],
  lastPrShas: Record<string, string>
): { findings: Finding[]; newLastPrShas: Record<string, string> } {
  const gatingChecks = entry.checks && entry.checks.length > 0 ? new Set(entry.checks) : null;
  const findings: Finding[] = [];
  const newLastPrShas: Record<string, string> = { ...lastPrShas };
  for (const pr of prs) {
    const failing = pr.statusCheckRollup.filter((c) => {
      if (gatingChecks && !gatingChecks.has(c.name)) return false;
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

// ---------------------------------------------------------------------------
// Action / command mapping — tier-2 repos never spawn a headless reaction.

function actionForFinding(finding: Finding, tier: 1 | 2): ReactionAction {
  if (tier === 2) return "issue-broker-file";
  if (finding.kind === "issue") return "intake";
  if (finding.kind === "red-pr") return "pr-fix";
  return "crew-fix";
}

function commandForFinding(finding: Finding, action: ReactionAction, entry: RegistryEntry): string {
  const number = finding.findingId.split(":")[1];
  switch (action) {
    case "intake":
      return `claude -p "/runner:intake --from-issue https://github.com/${entry.ghSlug}/issues/${number}"`;
    case "pr-fix":
      return `claude -p "/runner:pr-fix ${number}"`;
    case "crew-fix":
      return `claude -p "/crew:fix run:${number}"`;
    case "issue-broker-file":
      return `# issue-broker-file: ${finding.findingId} (tier-2, watch-only — no headless spawn)`;
  }
}

// ---------------------------------------------------------------------------
// Per-entry sweep

async function sweepEntry(
  entry: RegistryEntry,
  exec: WatchTickExec,
  watchHome: string,
  spawnGateConfig: SpawnGateConfig,
  now: () => Date
): Promise<{ findingsCount: number; spawnedCount: number; skippedCount: number }> {
  const priorState = await readTickState(watchHome, entry.ghSlug);

  const [issues, runs, prs] = await Promise.all([
    exec.listOpenIssues(entry),
    exec.listFailedRuns(entry),
    exec.listOpenPrChecks(entry)
  ]);

  const issueResult = detectIssueFindings(entry, issues, priorState.lastSeenIssue);
  const runResult = detectFailedRunFindings(entry, runs, priorState.lastFailedRunIds);
  const prResult = detectRedPrFindings(entry, prs, priorState.lastPrShas);

  const findings: Finding[] = [
    ...issueResult.findings,
    ...runResult.findings,
    ...prResult.findings
  ];

  let spawnedCount = 0;
  let skippedCount = 0;

  for (const finding of findings) {
    const activeClaim = await getActiveClaim(watchHome, entry.ghSlug, finding.findingId, now());
    if (activeClaim) continue;

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
      continue; // finding stays unclaimed for next tick
    }

    // AC-3: claim write (state + label) MUST complete before spawn.
    await claimFinding({
      watchHome,
      ghSlug: entry.ghSlug,
      finding,
      addClaimLabel: exec.addClaimLabel,
      now
    });

    const action = actionForFinding(finding, entry.tier);
    await exec.spawnReaction({
      finding,
      action,
      command: commandForFinding(finding, action, entry),
      cwd: entry.path
    });
    spawnedCount++;
  }

  // Tick-owned detection fields, written once per entry — separate from the
  // per-finding claim/skip writes above (COND-2: tick never touches
  // reaction.json's attemptCounts/costSpent).
  await updateTickState(watchHome, entry.ghSlug, (current) => ({
    ...current,
    lastSeenIssue: issueResult.newLastSeen,
    lastFailedRunIds: runResult.newLastFailedRunIds,
    lastPrShas: prResult.newLastPrShas,
    lastTickAt: now().toISOString()
  }));

  return { findingsCount: findings.length, spawnedCount, skippedCount };
}

// ---------------------------------------------------------------------------
// Public entry point

export async function runTick(options: RunTickOptions): Promise<TickResult> {
  const watchHome = options.watchHome ?? defaultWatchHome();
  const exec = options.exec ?? buildDefaultTickExec();
  const spawnGateConfig = options.spawnGateConfig ?? DEFAULT_SPAWN_GATE_CONFIG;
  const now = options.now ?? (() => new Date());

  // AC-2: second tick on the same machine exits immediately, no sweeping.
  const locked = await acquireTickLock(watchHome);
  if (!locked) {
    return { outcome: "lock-held" };
  }

  try {
    const registry = await readRegistry(options.registryPath);
    const validation = validateRegistry(registry);
    if (!validation.ok) {
      throw new Error(`[watch/tick] invalid registry:\n  ${validation.errors.join("\n  ")}`);
    }

    const assigned = registry.entries.filter((entry) => entry.shard === options.machineShard);

    let findingsCount = 0;
    let spawnedCount = 0;
    let skippedCount = 0;

    for (const entry of assigned) {
      const result = await sweepEntry(entry, exec, watchHome, spawnGateConfig, now);
      findingsCount += result.findingsCount;
      spawnedCount += result.spawnedCount;
      skippedCount += result.skippedCount;

      await emitWatchTickEnvelope(registry, {
        ghSlug: entry.ghSlug,
        shard: entry.shard,
        tenantId: entry.tenantId,
        appId: entry.appId,
        tickAt: now().toISOString(),
        findingsCount: result.findingsCount,
        skippedCeilingCount: result.skippedCount
      });
    }

    return { outcome: "swept", findingsCount, spawnedCount, skippedCount };
  } finally {
    await releaseTickLock(watchHome);
  }
}

// ---------------------------------------------------------------------------
// Layer-2-side hook: records a reaction outcome into reaction.json (the
// reaction-owned file — COND-2) and emits watch.reaction. Callable by
// whatever ultimately spawns `claude -p` (the scheduler script / interactive
// /runner:watch command land in SLICE-146); exposed now so AC-5 can prove
// the tick/reaction write split holds against real state-module behavior.

export interface RecordReactionOutcomeOptions {
  watchHome: string;
  registry: RegistryFile;
  entryTenantId: string;
  entryAppId: string;
  spawn: ReactionSpawn;
  outcome: "spawned" | "circuit-broken" | "skipped-ceiling";
  costUsd: number;
}

export async function recordReactionOutcome(opts: RecordReactionOutcomeOptions): Promise<void> {
  const findingId = opts.spawn.finding.findingId;
  const updated = await updateReactionState(
    opts.watchHome,
    opts.spawn.finding.ghSlug,
    (current) => {
      const attemptCount = (current.attemptCounts[findingId] ?? 0) + 1;
      const costSpent = (current.costSpent[findingId] ?? 0) + opts.costUsd;
      return {
        attemptCounts: { ...current.attemptCounts, [findingId]: attemptCount },
        costSpent: { ...current.costSpent, [findingId]: costSpent },
        totalCostSpentUsd: current.totalCostSpentUsd + opts.costUsd
      };
    }
  );

  await emitWatchReactionEnvelope(opts.registry, {
    ghSlug: opts.spawn.finding.ghSlug,
    tenantId: opts.entryTenantId,
    appId: opts.entryAppId,
    findingId,
    action: opts.spawn.action,
    attemptCount: updated.attemptCounts[findingId] ?? 1,
    costUsd: opts.costUsd,
    outcome: opts.outcome
  });
}
