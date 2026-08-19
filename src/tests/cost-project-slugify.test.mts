// SLICE-175: fixture coverage for the citylive zero-cost-telemetry root
// cause (docs/research/2026-08-02-citylive-zero-cost-telemetry.md).
//
// `tryWriteCostReport` (crew-bridge.mts) passed `config.loop.costProject`
// straight through to crew's `--source-project` flag with no
// normalization. Crew's session scanner uses that value verbatim as a
// `~/.claude/projects/<value>/` directory name and — because an explicit
// `sourceProject` is truthy — skips its own auto-detect safety net. A
// human-readable project name (e.g. "AstraGenie.CityLive") that was never
// slugified therefore silently scans zero session files, with no error
// surfaced (the citylive report's `usd: 0` / `Auto-detected: no`
// fingerprint).
//
// SLICE-11 (P2 seam-elimination): `tryWriteCostReport` no longer shells out
// to a `crew` CLI subprocess, so these tests were rewritten off the
// `$HERO_CREW_PATH` fake-CLI-plus-argv-inspection seam and now exercise the
// real `costSliceHandler`/`computeSessionCost` direct-import path end to
// end. `computeSessionCost`'s return echoes back the resolved slug as
// `cost.sourceProject` (session-cost.mts's `assembleCostResult`), which is
// what these tests assert on instead of inspecting a fake subprocess's argv.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { tryWriteCostReport } from "../scripts/lib/slice-linker/crew-bridge.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

// Seeds workflow-state.currentRun.startedAt so costSliceHandler has a
// window to scan (it throws without one) — same fixture pattern as
// cost-scan-window-regression.test.mts.
async function seedWorkflowState(repo: string, startedAt: string): Promise<void> {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ currentRun: { startedAt } })
  );
}

const STARTED_AT = "2026-08-01T00:00:00.000Z";

test("AC-2: an unslugified config.loop.costProject (citylive-shaped fixture) reaches computeSessionCost slugified", async () => {
  const repo = await tmpRepo("cps-citylive-repo-");
  await seedWorkflowState(repo, STARTED_AT);

  const config = { loop: { costProject: "AstraGenie.CityLive" } };
  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-1" }, config);
  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

  assert.equal(
    result.cost?.sourceProject,
    "AstraGenie-CityLive",
    "the raw human-readable project name must be slugified before it reaches the session scanner"
  );
});

test("AC-4: an already-slugified config.loop.costProject is unchanged (idempotent, no regression for the standard-path case)", async () => {
  const repo = await tmpRepo("cps-idempotent-repo-");
  await seedWorkflowState(repo, STARTED_AT);

  const alreadySlugged = "C--work-mega-runner-plugin";
  const config = { loop: { costProject: alreadySlugged } };
  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-2" }, config);
  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

  assert.equal(
    result.cost?.sourceProject,
    alreadySlugged,
    "an already-slugified value must pass through unchanged"
  );
});

test("AC-2/AC-4 combined: costProjectAliases present in config does not change the primary project actually scanned", async () => {
  const repo = await tmpRepo("cps-aliases-repo-");
  await seedWorkflowState(repo, STARTED_AT);

  // Under the old CLI/argv seam, aliases were pushed before the primary and
  // the CLI's last-flag-wins parser meant only the primary ever mattered
  // (see appendSourceProjectArgs' own unit tests). The direct-import flags
  // object never builds an argv array at all, so aliases have no
  // representation there either — this test locks that the primary is
  // still the one slugified value that reaches computeSessionCost,
  // regardless of whatever aliases are configured alongside it.
  const config = {
    loop: {
      costProject: "AstraGenie.CityLive",
      costProjectAliases: ["Old.Project.Name", "already-slugified-alias"]
    }
  };
  const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-3" }, config);
  assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

  assert.equal(
    result.cost?.sourceProject,
    "AstraGenie-CityLive",
    "the primary project must be slugified and used regardless of aliases present in config"
  );
});
