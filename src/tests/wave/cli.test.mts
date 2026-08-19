// src/tests/wave/cli.test.mts
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const LOOP_CLI = "src/scripts/loop.mts";

function run(args: string[]) {
  return spawnSync("bun", [LOOP_CLI, ...args], { encoding: "utf8" });
}

describe("loop.mts wave subcommand", () => {
  test("wave --help mentions plan|run|loop", () => {
    const r = run(["wave", "--help"]);
    const out = `${r.stdout}${r.stderr}`.toLowerCase();
    expect(out).toContain("plan");
  });

  test("wave plan --repo <cwd> --json emits a plan JSON shape (or error mention)", () => {
    const r = run(["wave", "plan", "--repo", process.cwd(), "--json"]);
    const out = `${r.stdout}${r.stderr}`;
    expect(out).toMatch(/(waveId|"size"|error)/i);
  });

  test("wave with no subcommand prints usage and exits non-zero", () => {
    const r = run(["wave"]);
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`.toLowerCase()).toContain("usage");
  });

  test("wave run --dry-run prints plan JSON without dispatching", () => {
    const r = run(["wave", "run", "--repo", process.cwd(), "--dry-run"]);
    const out = `${r.stdout}${r.stderr}`;
    expect(out).toMatch(/(waveId|size)/);
  });

  // FEAT-020 / SLICE-37 review follow-up (20260819T230000Z): waveCli only
  // checked `sub === "--help"|"-h"` (the token right after "wave") — a
  // `--help` passed after the plan/run/loop subcommand, e.g. `wave plan
  // --help`, fell through to the real case body and ran actual plan/pack
  // logic instead of printing usage. Assert the usage text, not the
  // "Wave plan:"/JSON output the real plan case would have produced.
  test("wave plan --help prints usage instead of running the real plan logic", () => {
    const r = run(["wave", "plan", "--help", "--repo", process.cwd()]);
    const out = `${r.stdout}${r.stderr}`;
    expect(r.status).toBe(0);
    expect(out).toContain("plan|run|loop");
    expect(out).not.toMatch(/^Wave plan:/m);
    expect(out).not.toContain("waveId");
  });
});
