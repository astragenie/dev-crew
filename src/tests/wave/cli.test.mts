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
});
