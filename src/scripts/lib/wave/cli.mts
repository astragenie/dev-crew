// src/scripts/lib/wave/cli.mts
// CLI dispatcher for the `wave` subcommand: plan / run / loop.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveWaveConfig, resolveMarathonRunner } from "./config.mjs";
import { loadCandidates, packWave, applyPreFlightDrops } from "./planner.mjs";
import { rankCandidates } from "./ranking.mjs";

function getFlag(argv: string[], name: string, fallback?: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx < 0) return fallback;
  return argv[idx + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

function readLoopJson(repoRoot: string): {
  wave?: Record<string, unknown>;
  marathonRunner?: string;
} {
  const p = join(repoRoot, ".claude", "loop.json");
  if (!existsSync(p)) return {};
  const raw = JSON.parse(readFileSync(p, "utf8")) as {
    loop?: { wave?: Record<string, unknown>; marathonRunner?: string };
  };
  return raw.loop ?? {};
}

export default async function waveCli(sub: string, argv: string[]): Promise<void> {
  // FEAT-020 / SLICE-37 follow-up (review 20260819T230000Z): `wave` is
  // short-circuited on rawArgv before loop.mts's parseArgs/flags.help
  // chokepoint ever runs, and the switch below only recognized
  // sub === "--help"|"-h" — `wave plan --help` (or run/loop) fell through to
  // the real case body and executed live plan/dispatch/merge logic instead
  // of printing usage. Check for help anywhere in the sub's own argv (not
  // just as the subcommand token itself) before doing any work — same
  // pattern dispatch.mts already uses safely.
  if (sub === "--help" || sub === "-h" || argv.includes("--help") || argv.includes("-h")) {
    console.log("loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]");
    return;
  }
  const repoRoot = getFlag(argv, "repo", process.cwd()) ?? process.cwd();
  const wantJson = hasFlag(argv, "json");
  const sizeOverride = getFlag(argv, "size");
  const loopJson = readLoopJson(repoRoot);
  const cfg = resolveWaveConfig({ wave: loopJson.wave as never });
  if (sizeOverride !== undefined) cfg.size = Number(sizeOverride);

  switch (sub) {
    case "plan": {
      const allCands = loadCandidates(repoRoot);
      const { passed: cands, dropped: preFlightDropped } = applyPreFlightDrops(allCands, repoRoot);
      const plan = packWave(rankCandidates(cands), {
        waveSize: cfg.size,
        sliceCommand: cfg.sliceCommand,
        waveId: new Date().toISOString().replace(/[:.]/g, "-")
      });
      plan.rejected.unshift(...preFlightDropped);
      if (wantJson) {
        console.log(JSON.stringify(plan, null, 2));
      } else {
        console.log(`Wave plan: size=${plan.size}, rejected=${plan.rejected.length}`);
        for (const item of plan.items) {
          console.log(`  - ${item.sliceId} (${item.featureId})`);
        }
      }
      return;
    }
    case "run": {
      const dryRun = hasFlag(argv, "dry-run");
      const { plan, cands } = planForRepo(repoRoot, cfg);
      if (dryRun) {
        console.log(JSON.stringify(plan, null, 2));
        return;
      }
      const { runWave } = await import("./runner.mjs");
      const { writeWaveArtifacts, updateIndex } = await import("./artifacts.mjs");
      const realDeps = await import("./real-deps.mjs");
      const candMap = new Map(cands.map((c) => [c.sliceId, c]));
      const outcome = await runWave(repoRoot, {
        gitStatusFn: realDeps.realGitStatus,
        stopCheckFn: realDeps.realStopCheck,
        planFn: () => plan,
        prepareFn: realDeps.realPrepare,
        dispatchFn: realDeps.realDispatch,
        finalizeFn: realDeps.realFinalize,
        postMergeTestFn: realDeps.realPostMergeTest,
        cfg,
        candidateLookupFn: (sliceId) => candMap.get(sliceId)
      });
      writeWaveArtifacts(repoRoot, outcome, cfg.artifactsRoot);
      updateIndex(repoRoot, outcome, cfg.artifactsRoot);
      if (outcome.haltReason !== null) {
        process.exitCode = haltExitCode(outcome.haltReason);
      }
      console.log(JSON.stringify({ haltReason: outcome.haltReason, wavesRun: 1 }, null, 2));
      return;
    }
    case "loop": {
      const maxWavesFlag = getFlag(argv, "max-waves");
      const maxWaves = maxWavesFlag !== undefined ? Number(maxWavesFlag) : undefined;
      const { runWave, loopWaves } = await import("./runner.mjs");
      const { writeWaveArtifacts, updateIndex } = await import("./artifacts.mjs");
      const realDeps = await import("./real-deps.mjs");
      const outcome = await loopWaves(repoRoot, {
        runWaveFn: async () => {
          const { plan: plan2, cands: cands2 } = planForRepo(repoRoot, cfg);
          const candMap2 = new Map(cands2.map((c) => [c.sliceId, c]));
          const r2 = await runWave(repoRoot, {
            gitStatusFn: realDeps.realGitStatus,
            stopCheckFn: realDeps.realStopCheck,
            planFn: () => plan2,
            prepareFn: realDeps.realPrepare,
            dispatchFn: realDeps.realDispatch,
            finalizeFn: realDeps.realFinalize,
            postMergeTestFn: realDeps.realPostMergeTest,
            cfg,
            candidateLookupFn: (sliceId) => candMap2.get(sliceId)
          });
          writeWaveArtifacts(repoRoot, r2, cfg.artifactsRoot);
          updateIndex(repoRoot, r2, cfg.artifactsRoot);
          return r2;
        },
        maxIterations: 25,
        maxWaves
      });
      if (outcome.haltReason) {
        process.exitCode = haltExitCode(outcome.haltReason);
      }
      console.log(JSON.stringify(outcome, null, 2));
      return;
    }
    case "--help":
    case "-h": {
      console.log("loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]");
      return;
    }
    default: {
      console.error(`unknown wave subcommand: ${sub}`);
      console.error("usage: loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]");
      process.exitCode = 1;
      return;
    }
  }
}

function haltExitCode(reason: string): number {
  if (reason === "backlog_exhausted" || reason === "max_iterations" || reason === "max_waves") {
    return 0;
  }
  if (reason === "escalated_to_human" || reason === "escalation_threshold_hit") {
    return 3;
  }
  return 2;
}

function planForRepo(
  repoRoot: string,
  cfg: { size: number; sliceCommand: string }
): {
  plan: ReturnType<typeof packWave>;
  cands: ReturnType<typeof loadCandidates>;
} {
  const allCands = loadCandidates(repoRoot);
  const { passed: cands, dropped: preFlightDropped } = applyPreFlightDrops(allCands, repoRoot);
  const plan = packWave(rankCandidates(cands), {
    waveSize: cfg.size,
    sliceCommand: cfg.sliceCommand,
    waveId: new Date().toISOString().replace(/[:.]/g, "-")
  });
  plan.rejected.unshift(...preFlightDropped);
  return { plan, cands };
}

export { resolveMarathonRunner };
