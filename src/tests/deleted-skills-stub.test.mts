import { describe, expect, test } from "bun:test";

// Migration table: deleted skill name → replacement command pointer.
// Mirrors DELETED_SKILLS_MAP in src/scripts/loop.mts.
const DELETED_SKILLS: Array<[string, string]> = [
  ["backlog-add", "devcrew:intake"],
  ["backlog-enrich", "devcrew:intake"],
  ["backlog-list", "devcrew:brief"],
  ["backlog-promote", "devcrew:triage"],
  ["pm-review", "devcrew:intake --deep"],
  ["pm-decompose", "devcrew:intake --spec"],
  ["retriage", "devcrew:triage --ids"],
  ["spec-add", "devcrew:intake --spec"],
  ["spec-decompose", "devcrew:intake --spec"],
  ["spec-list", "devcrew:brief"],
  ["slice-from-feature", "devcrew:start FEAT-NNN"],
  ["derive-slice", "devcrew:start FEAT-NNN"],
  ["next-slice", "devcrew:start"],
  ["slice-plan", "devcrew:start (auto-runs plan)"],
  ["slice-link", "devcrew:close (auto-links)"],
  ["slice-grade", "devcrew:close"],
  ["slice-grade-write", "devcrew:close"],
  ["slice-post-builder-fanout", "internal-only"],
  ["slice-review-ladder", "internal-only"],
  ["sync-claims", "internal-only (claims-sync still runs)"],
  ["classify-slice-shape", "internal-only (runs during devcrew:start)"],
  ["release-plan", "devcrew:phase-gate"],
  ["competitor-audit", "devcrew:market-researcher"],
  ["architect", "devcrew:architect"],
  ["stop-check", "internal-only (devcrew:auto)"],
  // "snapshot-memory" removed from this table (FEAT-214 item 7) — it now
  // has a live handler again; see memory-snapshot-command.test.mts.
  ["decisions-list", "devcrew:decisions list"],
  ["decisions-show", "devcrew:decisions show"],
  ["decisions-relevant", "devcrew:decisions relevant"],
  ["decisions-supersede", "devcrew:decisions supersede"]
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
