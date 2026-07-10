// watch/sweep.mts — per-entry sweep: gh detection, the production exec
// (gh CLI calls + logging spawn stub), and sweepEntry() itself (claim /
// steal / spawn-gate wiring for one registry entry's findings).
//
// Split out of watch/tick.mts (SLICE-144 follow-up from the SLICE-143
// grade — tick.mts had grown to 428 lines) so runTick() stays a thin
// per-entry loop + lock/envelope orchestrator and this module owns the
// zero-LLM detection + per-finding claim/spawn-gate decision logic. Both
// files live inside watch/ so they import each other directly — only
// callers OUTSIDE watch/ go through the watch.mts barrel
// (validate-imports.mts enforces this).

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import type {
  Finding,
  ReactionAction,
  ReactionSpawn,
  RegistryEntry,
  SpawnGateConfig
} from "./types.mjs";
import {
  claimFinding,
  collectExpiredClaims,
  DEFAULT_CLAIM_LABEL,
  DEFAULT_CLAIM_TTL_SECONDS,
  getActiveClaim
} from "./claims.mjs";
import { evaluateSpawnGate } from "./spawn-gate.mjs";
import { readTickState, updateTickState } from "./state.mjs";

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
// Finding assembly — gh-detected (cursor-based "new") findings merged with
// COND-1 self-heal candidates: claims whose TTL has expired are re-surfaced
// even when the gh-side cursor no longer considers them "new" (e.g. a killed
// reaction left an orphaned claim on an issue number the cursor already
// passed). De-duplicated by findingId so a finding that is both freshly
// re-opened AND still carrying a stale claim is only processed once.

function assembleFindings(cursorFindings: Finding[], expiredClaimFindings: Finding[]): Finding[] {
  const seen = new Set(cursorFindings.map((f) => f.findingId));
  const stealCandidates = expiredClaimFindings.filter((f) => !seen.has(f.findingId));
  return [...cursorFindings, ...stealCandidates];
}

// ---------------------------------------------------------------------------
// Per-entry sweep

export async function sweepEntry(
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

  const cursorFindings: Finding[] = [
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
      continue; // finding stays unclaimed (or, if stolen from an expired
      // claim, un-restolen) for next tick
    }

    // AC-3: claim write (state + label) MUST complete before spawn. When
    // `finding` came from collectExpiredClaims this is the COND-1 steal —
    // claimFinding overwrites unconditionally, so claiming IS stealing.
    await claimFinding({
      watchHome,
      ghSlug: entry.ghSlug,
      finding,
      addClaimLabel: exec.addClaimLabel,
      ttlSeconds: claimTtlSeconds,
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
