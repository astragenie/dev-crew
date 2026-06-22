import { describe, expect, test } from "bun:test";

// Migration table: deleted skill name → replacement command pointer.
// Mirrors DELETED_SKILLS_MAP in src/scripts/loop.mts.
const DELETED_SKILLS: Array<[string, string]> = [
  ["backlog-add", "runner:intake"],
  ["backlog-enrich", "runner:intake"],
  ["backlog-list", "runner:status"],
  ["backlog-promote", "runner:triage"],
  ["pm-review", "runner:intake --deep"],
  ["pm-decompose", "runner:intake --spec"],
  ["retriage", "runner:triage --ids"],
  ["spec-add", "runner:intake --spec"],
  ["spec-decompose", "runner:intake --spec"],
  ["spec-list", "runner:status"],
  ["slice-from-feature", "runner:start FEAT-NNN"],
  ["derive-slice", "runner:start FEAT-NNN"],
  ["next-slice", "runner:start"],
  ["slice-plan", "runner:start (auto-runs plan)"],
  ["slice-link", "runner:close (auto-links)"],
  ["slice-grade", "runner:close"],
  ["slice-grade-write", "runner:close"],
  ["slice-post-builder-fanout", "internal-only"],
  ["slice-review-ladder", "internal-only"],
  ["sync-claims", "internal-only (claims-sync still runs)"],
  ["classify-slice-shape", "internal-only (runs during runner:start)"],
  ["release-plan", "runner:phase-gate"],
  ["competitor-audit", "crew:market-researcher"],
  ["architect", "crew:architect"],
  ["stop-check", "internal-only (runner:auto)"],
  ["snapshot-memory", "runner:status (includes snapshot)"],
  ["decisions-list", "runner:decisions list"],
  ["decisions-show", "runner:decisions show"],
  ["decisions-relevant", "runner:decisions relevant"],
  ["decisions-supersede", "runner:decisions supersede"]
];

describe("deleted skills hard-break stubs", () => {
  for (const [old, replacement] of DELETED_SKILLS) {
    test(`${old} exits non-zero with replacement pointer`, async () => {
      const proc = Bun.spawn(["bun", "src/scripts/loop.mts", old], {
        stdout: "pipe",
        stderr: "pipe"
      });
      const code = await proc.exited;
      expect(code).not.toBe(0);
      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain(`runner:${old} removed in v0.53`);
      expect(stderr).toContain(replacement);
    });
  }
});
