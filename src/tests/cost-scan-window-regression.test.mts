// SLICE-163: dedicated regression suite for the FEAT-268 cost-scan window
// fix (root cause: docs/research/2026-08-02-cost-window-freeze-root-cause-spike.md).
// SLICE-162 shipped the fix + unit-level coverage of `resolveCostScanWindow`
// in cost-scan-cursor.test.mts. This file adds the coverage that spike
// flagged as still missing:
//
//  1. AC-1 at the INTEGRATION level: a real (fake) `crew` CLI subprocess
//     spawned twice through the actual `tryWriteCostReport` bridge function,
//     proving the fix end-to-end rather than only at the
//     `resolveCostScanWindow` unit boundary.
//  2. The `resolveCostScanWindow` falsy-sliceId defensive branch (LOW nit
//     from the SLICE-162 review).
//  3. AC-4: memory-snapshot.mts's dedup key (resolveCostReportUsd /
//     sliceKeyOf, :124/:157) is an EXACT string match, never a fuzzy or
//     tolerance-band match -- locks the "do NOT loosen the dedup
//     fingerprint" constraint against future regression.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  readCostScanCursor,
  writeCostScanCursor,
  resolveCostScanWindow
} from "../scripts/lib/slice-linker/cost-scan-cursor.mjs";
import { tryWriteCostReport } from "../scripts/lib/slice-linker/crew-bridge.mjs";
import { loadCostReportUSDValues } from "../scripts/lib/memory-snapshot.mjs";
import { initGitRepo } from "./_fixtures.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

async function seedWorkflowState(repo: string, startedAt: string): Promise<void> {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ currentRun: { startedAt } })
  );
}

/**
 * Writes a fake `crew` CLI at `<dir>/scripts/crew.mjs` that logs every
 * invocation's argv to `<dir>/calls.jsonl` and, for `cost-slice`, writes a
 * real cost-report markdown file into the target repo's
 * `.claude/artifacts/crew/cost/` directory. `crew-bridge.mts::findHeroCrewCli`
 * resolves `$HERO_CREW_PATH/scripts/crew.mjs` BEFORE the plugin cache, so
 * pointing that env var here exercises `tryWriteCostReport`'s real
 * subprocess-spawn path rather than stubbing the function itself.
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
  const startedAt = flag("--started-at");
  const completedAt = flag("--completed-at");
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
    "total_tokens: 1000",
    "window_start: " + (startedAt ?? "null"),
    "window_end: " + completedAt,
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

function flagFromArgv(argv: string[], name: string): string | null {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? null) : null;
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

const STALE_STARTED_AT = "2026-07-03T10:50:26.134Z";

// ---------------------------------------------------------------------------
// AC-1, integration level: real tryWriteCostReport + fake crew subprocess
// ---------------------------------------------------------------------------

test("AC-1 integration: two consecutive tryWriteCostReport calls for the same slice in one session advance the window instead of freezing it", async () => {
  const repo = await tmpRepo("csw-int-repo-");
  const cliHome = await tmpRepo("csw-int-cli-");
  await initGitRepo(repo);
  await seedWorkflowState(repo, STALE_STARTED_AT);
  const { cliDir, logPath } = await writeFakeCrewCli(cliHome);

  await withHeroCrewPath(cliDir, async () => {
    const sliceId = "SLICE-CSW-INT";

    const firstResult: any = await tryWriteCostReport(repo, { sliceId }, null);
    assert.ok(!firstResult?.error, `first call must not error: ${JSON.stringify(firstResult)}`);

    const secondResult: any = await tryWriteCostReport(repo, { sliceId }, null);
    assert.ok(!secondResult?.error, `second call must not error: ${JSON.stringify(secondResult)}`);

    const calls = await readCalls(logPath);
    const costSliceCalls = calls.filter((c) => c[0] === "cost-slice");
    assert.equal(costSliceCalls.length, 2, "expected exactly two cost-slice invocations");

    const [firstArgv, secondArgv] = costSliceCalls as [string[], string[]];
    const firstStartedAt = flagFromArgv(firstArgv, "--started-at");
    const firstCompletedAt = flagFromArgv(firstArgv, "--completed-at");
    const secondStartedAt = flagFromArgv(secondArgv, "--started-at");
    const secondCompletedAt = flagFromArgv(secondArgv, "--completed-at");

    assert.equal(
      firstStartedAt,
      STALE_STARTED_AT,
      "first-ever scan for this slice has no cursor yet, so it falls back to currentRun.startedAt"
    );
    assert.ok(firstCompletedAt, "first call must supply --completed-at");

    // The exact regression this slice exists to pin: the SECOND invocation's
    // Window Start must be the FIRST invocation's Window End -- not the
    // still-frozen currentRun value. workflow-state.json is never rewritten
    // between the two calls here, which is exactly the "repeated
    // same-session scan" failure mode from the root-cause spike.
    assert.equal(
      secondStartedAt,
      firstCompletedAt,
      "second scan's Window Start must advance to the first scan's Window End"
    );
    assert.notEqual(
      secondStartedAt,
      STALE_STARTED_AT,
      "second scan must NOT re-read the frozen currentRun.startedAt"
    );
    assert.ok(secondCompletedAt, "second call must supply --completed-at");
    assert.notEqual(
      secondCompletedAt,
      firstCompletedAt,
      "the window must keep advancing, not repeat the same span"
    );

    // Cross-check against the actual written report files (not just argv) --
    // proves the persisted cursor really drove what crew was told to scan,
    // end to end through the bridge function under test.
    assert.equal(
      typeof firstResult.path,
      "string",
      "first result must carry a written report path"
    );
    assert.equal(
      typeof secondResult.path,
      "string",
      "second result must carry a written report path"
    );
    const firstReport = await fs.readFile(firstResult.path, "utf8");
    const secondReport = await fs.readFile(secondResult.path, "utf8");
    assert.ok(firstReport.includes(`window_start: ${STALE_STARTED_AT}`));
    assert.ok(secondReport.includes(`window_start: ${firstCompletedAt}`));

    // The persisted cursor must reflect the SECOND call's completedAt --
    // ready to hand the next (third) invocation an even later window.
    const cursor = await readCostScanCursor(repo, sliceId);
    assert.ok(cursor, "cursor should exist after two successful scans");
    assert.equal(cursor!.lastWindowEnd, secondCompletedAt);
  });
});

// ---------------------------------------------------------------------------
// resolveCostScanWindow: falsy-sliceId defensive branch (SLICE-162 review nit)
// ---------------------------------------------------------------------------

test("resolveCostScanWindow: falsy sliceId (null/undefined/empty) always falls back to currentRun.startedAt and never consults a persisted cursor", async () => {
  const repo = await tmpRepo("csw-falsy-slice-");
  // A cursor exists for a DIFFERENT, non-empty sliceId -- proves the falsy
  // branch short-circuits before any cursor lookup, rather than coincidentally
  // matching nothing.
  await writeCostScanCursor(repo, "SLICE-REAL", "2026-08-01T00:00:00.000Z");
  const workflowState = { currentRun: { startedAt: "2026-07-01T00:00:00.000Z" } };
  const now = () => "2026-08-02T00:00:00.000Z";

  const withNull = await resolveCostScanWindow(repo, null, workflowState, now);
  assert.equal(withNull.startedAt, "2026-07-01T00:00:00.000Z");
  assert.equal(withNull.completedAt, "2026-08-02T00:00:00.000Z");

  const withUndefined = await resolveCostScanWindow(repo, undefined, workflowState, now);
  assert.equal(withUndefined.startedAt, "2026-07-01T00:00:00.000Z");

  const withEmptyString = await resolveCostScanWindow(repo, "", workflowState, now);
  assert.equal(withEmptyString.startedAt, "2026-07-01T00:00:00.000Z");
});

test("resolveCostScanWindow: falsy sliceId with no currentRun.startedAt returns null startedAt (no crash, no fabricated window)", async () => {
  const repo = await tmpRepo("csw-falsy-slice-null-");
  const window = await resolveCostScanWindow(repo, null, null, () => "2026-08-02T00:00:00.000Z");
  assert.equal(window.startedAt, null);
  assert.equal(window.completedAt, "2026-08-02T00:00:00.000Z");
});

// ---------------------------------------------------------------------------
// AC-4: resolveCostReportUsd / sliceKeyOf dedup key is EXACT match, never a
// tolerance-band or fuzzy match (locks the "do NOT loosen the dedup
// fingerprint" constraint from the SLICE-163 objective).
// ---------------------------------------------------------------------------

async function writeCostReportFile(
  repo: string,
  timestampPrefix: string,
  fm: Record<string, string | number>
): Promise<void> {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "cost");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${timestampPrefix}-cost-report-${Math.random().toString(36).slice(2)}.md`;
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push("---", "", "# Cost Report", "");
  await fs.writeFile(path.join(dir, filename), lines.join("\n"));
}

test("AC-4: slice-id dedup key is an EXACT string match -- look-alike but distinct slice ids never collapse together", async () => {
  const repo = await tmpRepo("csw-ac4-exact-slice-");

  // Two reports with the IDENTICAL slice id -- must dedupe to exactly one
  // (never averaged: 5.0 and 500.0 differ 100x, so any blending would be
  // immediately visible).
  await writeCostReportFile(repo, "20260801T000004Z", {
    kind: "cost-report",
    slice: "SLICE-99",
    usd: 5.0
  });
  await writeCostReportFile(repo, "20260801T000003Z", {
    kind: "cost-report",
    slice: "SLICE-99",
    usd: 500.0
  });
  // Look-alike but textually DISTINCT slice ids -- an exact-match key must
  // keep every one of these as its own entry; a fuzzy/prefix/tolerance-band
  // key would wrongly fold some of them into SLICE-99's bucket.
  await writeCostReportFile(repo, "20260801T000002Z", {
    kind: "cost-report",
    slice: "SLICE-990",
    usd: 7.0
  });
  await writeCostReportFile(repo, "20260801T000001Z", {
    kind: "cost-report",
    slice: "SLICE-99A",
    usd: 9.0
  });
  await writeCostReportFile(repo, "20260801T000000Z", {
    kind: "cost-report",
    slice: "slice-99",
    usd: 11.0
  }); // case-distinct from SLICE-99

  const values = await loadCostReportUSDValues(repo, 20);

  assert.equal(
    values.filter((v) => v === 5.0 || v === 500.0).length,
    1,
    "identical slice id must dedupe to exactly one value, never both"
  );
  assert.ok(
    values.includes(5.0),
    "the newest SLICE-99 report wins the dedup (file-iteration order)"
  );
  assert.ok(
    !values.includes(500.0),
    "the older SLICE-99 duplicate must be dropped, not blended in"
  );
  assert.ok(values.includes(7.0), "SLICE-990 must count separately from SLICE-99");
  assert.ok(values.includes(9.0), "SLICE-99A must count separately from SLICE-99");
  assert.ok(
    values.includes(11.0),
    "lowercase slice-99 must count separately from SLICE-99 (case-sensitive exact match)"
  );
  assert.equal(
    values.length,
    4,
    "4 distinct dedup keys total: SLICE-99 (deduped from 2), SLICE-990, SLICE-99A, slice-99"
  );
});

test("AC-4: run-title fallback dedup key (run:feature|run_title) is exact match too -- a case-only difference does not collapse", async () => {
  const repo = await tmpRepo("csw-ac4-exact-runtitle-");

  // No `slice:` field on any of these -- forces sliceKeyOf's run:feature|title
  // fallback branch.
  await writeCostReportFile(repo, "20260801T000002Z", {
    kind: "cost-report",
    feature: "FEAT-268",
    run_title: "slice-163-regression",
    usd: 3.0
  });
  await writeCostReportFile(repo, "20260801T000001Z", {
    kind: "cost-report",
    feature: "FEAT-268",
    run_title: "slice-163-regression",
    usd: 30.0
  });
  // Case-distinct run_title -- exact string match must NOT collapse this
  // with the identical pair above.
  await writeCostReportFile(repo, "20260801T000000Z", {
    kind: "cost-report",
    feature: "FEAT-268",
    run_title: "Slice-163-Regression",
    usd: 300.0
  });

  const values = await loadCostReportUSDValues(repo, 20);

  assert.equal(
    values.length,
    2,
    "identical run_title dedupes to 1; the case-distinct run_title survives separately"
  );
  assert.ok(values.includes(3.0), "the newest identical-key report wins the dedup");
  assert.ok(
    !values.includes(30.0),
    "the older identical-key duplicate must be dropped, not averaged in"
  );
  assert.ok(values.includes(300.0), "the case-distinct run_title must count as its own key");
});
