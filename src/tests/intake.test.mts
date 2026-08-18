import { describe, expect, test } from "bun:test";
import { intakeFromText, type IntakeFromTextResult } from "../scripts/lib/intake.mjs";

describe("intakeFromText", () => {
  test("returns the canonical shape for a minimal free-text input", async () => {
    const result: IntakeFromTextResult = await intakeFromText({
      repoPath: "/tmp/fake-repo",
      text: "users want dark mode in the dashboard",
      flags: { deep: false, spec: false, dryRun: true }
    });
    expect(result).toHaveProperty("featId");
    expect(result).toHaveProperty("priority");
    expect(result).toHaveProperty("autonomousSafe");
    expect(result).toHaveProperty("acCount");
    expect(result).toHaveProperty("costUsd");
  });
});

import { buildFeatFrontmatter } from "../scripts/lib/intake.mjs";

describe("buildFeatFrontmatter", () => {
  test("produces minimum required keys", () => {
    const fm = buildFeatFrontmatter({
      id: "FEAT-300",
      title: "Dark mode toggle",
      pmScores: {
        customer_impact: 0.7,
        effort_estimate: 0.3,
        strategic_alignment: 0.5,
        technical_risk: 0.2,
        dependency_depth: 0.1
      },
      pmCompositePriority: "P1",
      pmAutonomousSafe: true,
      triageNotes: "PM 2026-06-21: clean UX win, low risk",
      category: "feature",
      acs: []
    });
    expect(fm).toContain("id: FEAT-300");
    expect(fm).toContain("status: pending");
    expect(fm).toContain("priority: P1");
    expect(fm).toContain("pm_customer_impact: 0.7");
    expect(fm).toContain("pm_composite_priority: P1");
    expect(fm).toContain("autonomous_safe: true");
  });
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nextFeatId } from "../scripts/lib/intake.mjs";

describe("nextFeatId", () => {
  test("returns FEAT-277-plus-one given a backlog with FEATs up to 276", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "intake-test-"));
    const backlog = path.join(dir, ".claude/artifacts/loop/backlog/done");
    await fs.mkdir(backlog, { recursive: true });
    await fs.writeFile(path.join(backlog, "FEAT-275.md"), "---\nid: FEAT-275\n---\n");
    await fs.writeFile(path.join(backlog, "FEAT-276.md"), "---\nid: FEAT-276\n---\n");

    const id = await nextFeatId(dir);

    expect(id).toBe("FEAT-277");

    await fs.rm(dir, { recursive: true, force: true });
  });
});
