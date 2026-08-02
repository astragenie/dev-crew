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
// These tests exercise the real `tryWriteCostReport` bridge function
// against a fake `crew` CLI (same $HERO_CREW_PATH seam as
// cost-scan-window-regression.test.mts) and assert on the argv the fake
// CLI actually receives.

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

/**
 * Writes a fake `crew` CLI at `<dir>/scripts/crew.mjs` that logs every
 * invocation's argv to `<dir>/calls.jsonl` and, for `cost-slice`, writes a
 * real cost-report markdown file into the target repo's
 * `.claude/artifacts/crew/cost/` directory — same shape as the fixture in
 * cost-scan-window-regression.test.mts, trimmed to what these tests need.
 */
async function writeFakeCrewCli(dir: string): Promise<{ cliDir: string; logPath: string }> {
  const scriptsDir = path.join(dir, "scripts");
  await fs.mkdir(scriptsDir, { recursive: true });
  const logPath = path.join(dir, "calls.jsonl");
  const scriptPath = path.join(scriptsDir, "crew.mjs");
  await fs.writeFile(
    scriptPath,
    `import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(argv) + "\\n");

function flag(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

const cmd = argv[0];
if (cmd === "cost-slice") {
  const repo = flag("--repo");
  const outDir = path.join(repo, ".claude", "artifacts", "crew", "cost");
  fs.mkdirSync(outDir, { recursive: true });
  const filename =
    Date.now() + "-" + Math.random().toString(36).slice(2) + "-cost-report-fake.md";
  const filePath = path.join(outDir, filename);
  const body = [
    "---",
    "kind: cost-report",
    "run_title: " + JSON.stringify(flag("--run-title") ?? ""),
    "usd: 1.23",
    "created_at: " + new Date().toISOString(),
    "---",
    "",
    "# Fake Cost Report",
    ""
  ].join("\\n");
  fs.writeFileSync(filePath, body);
  console.log(JSON.stringify({ path: filePath }));
} else if (cmd === "cost-advise") {
  console.log(JSON.stringify({ recommendations: [] }));
} else {
  console.log(JSON.stringify({}));
}
`
  );
  return { cliDir: dir, logPath };
}

async function readCalls(logPath: string): Promise<string[][]> {
  try {
    const raw = await fs.readFile(logPath, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function sourceProjectValues(argv: string[]): string[] {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source-project") values.push(argv[i + 1]);
  }
  return values;
}

async function withHeroCrewPath<T>(cliDir: string, fn: () => Promise<T>): Promise<T> {
  const saved = process.env.HERO_CREW_PATH;
  process.env.HERO_CREW_PATH = cliDir;
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env.HERO_CREW_PATH;
    else process.env.HERO_CREW_PATH = saved;
  }
}

test("AC-2: an unslugified config.loop.costProject (citylive-shaped fixture) reaches the crew argv slugified", async () => {
  const repo = await tmpRepo("cps-citylive-repo-");
  const cliHome = await tmpRepo("cps-citylive-cli-");
  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);

  await withHeroCrewPath(cliDir, async () => {
    const config = { loop: { costProject: "AstraGenie.CityLive" } };
    const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-1" }, config);
    assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

    const calls = await readCalls(logPath);
    const costSliceCall = calls.find((c) => c[0] === "cost-slice");
    assert.ok(costSliceCall, "expected a cost-slice invocation");

    const values = sourceProjectValues(costSliceCall!);
    assert.deepEqual(
      values,
      ["AstraGenie-CityLive"],
      "the raw human-readable project name must be slugified before it reaches --source-project"
    );
  });
});

test("AC-4: an already-slugified config.loop.costProject is unchanged (idempotent, no regression for the standard-path case)", async () => {
  const repo = await tmpRepo("cps-idempotent-repo-");
  const cliHome = await tmpRepo("cps-idempotent-cli-");
  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);

  await withHeroCrewPath(cliDir, async () => {
    const alreadySlugged = "C--work-mega-runner-plugin";
    const config = { loop: { costProject: alreadySlugged } };
    const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-2" }, config);
    assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

    const calls = await readCalls(logPath);
    const costSliceCall = calls.find((c) => c[0] === "cost-slice");
    assert.ok(costSliceCall, "expected a cost-slice invocation");

    const values = sourceProjectValues(costSliceCall!);
    assert.deepEqual(
      values,
      [alreadySlugged],
      "an already-slugified value must pass through unchanged"
    );
  });
});

test("AC-2/AC-4 combined: costProjectAliases are normalized the same way, primary still pushed last", async () => {
  const repo = await tmpRepo("cps-aliases-repo-");
  const cliHome = await tmpRepo("cps-aliases-cli-");
  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);

  await withHeroCrewPath(cliDir, async () => {
    const config = {
      loop: {
        costProject: "AstraGenie.CityLive",
        costProjectAliases: ["Old.Project.Name", "already-slugified-alias"]
      }
    };
    const result: any = await tryWriteCostReport(repo, { sliceId: "SLICE-CPS-3" }, config);
    assert.ok(!result?.error, `tryWriteCostReport must not error: ${JSON.stringify(result)}`);

    const calls = await readCalls(logPath);
    const costSliceCall = calls.find((c) => c[0] === "cost-slice");
    assert.ok(costSliceCall, "expected a cost-slice invocation");

    const values = sourceProjectValues(costSliceCall!);
    assert.deepEqual(
      values,
      ["Old-Project-Name", "already-slugified-alias", "AstraGenie-CityLive"],
      "aliases are slugified in place, order preserved, primary still last"
    );
  });
});
