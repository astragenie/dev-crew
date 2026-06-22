/**
 * intake: free-text → PM → FEAT/SPEC file.
 *
 * Extends the existing pending-FEAT intake (PM triage + architect enrich)
 * with a free-text creation path. Same skill, new entry point.
 */

export interface IntakeFromTextOpts {
  repoPath: string;
  text: string;
  flags: {
    deep: boolean;
    spec: boolean;
    dryRun: boolean;
    fromIssue?: string;
  };
}

export interface IntakeFromTextResult {
  featId: string;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  autonomousSafe: boolean;
  acCount: number;
  costUsd: number;
  filePath?: string;
  dryRunPreview?: string;
}

export async function intakeFromText(_opts: IntakeFromTextOpts): Promise<IntakeFromTextResult> {
  return {
    featId: "FEAT-000",
    priority: "P3",
    autonomousSafe: false,
    acCount: 0,
    costUsd: 0
  };
}

export interface BuildFeatOpts {
  id: string;
  title: string;
  pmScores: {
    customer_impact: number;
    effort_estimate: number;
    strategic_alignment: number;
    technical_risk: number;
    dependency_depth: number;
  };
  pmCompositePriority: "P0" | "P1" | "P2" | "P3" | "P4";
  pmAutonomousSafe: boolean;
  triageNotes: string;
  category: string;
  acs: string[];
}

import fsImpl from "node:fs/promises";
import pathImpl from "node:path";

export async function nextFeatId(repoPath: string): Promise<string> {
  const dirs = [
    pathImpl.join(repoPath, ".claude/artifacts/loop/backlog/pending"),
    pathImpl.join(repoPath, ".claude/artifacts/loop/backlog/triaged"),
    pathImpl.join(repoPath, ".claude/artifacts/loop/backlog/in-progress"),
    pathImpl.join(repoPath, ".claude/artifacts/loop/backlog/done"),
    pathImpl.join(repoPath, "docs/backlog/pending"),
    pathImpl.join(repoPath, "docs/backlog/done")
  ];
  let maxN = 0;
  for (const dir of dirs) {
    try {
      const entries = await fsImpl.readdir(dir);
      for (const name of entries) {
        const m = name.match(/^FEAT-(\d+)/);
        if (m) {
          maxN = Math.max(maxN, parseInt(m[1]!, 10));
        }
      }
    } catch {
      // dir does not exist — skip
    }
  }
  return `FEAT-${maxN + 1}`;
}

export function buildFeatFrontmatter(opts: BuildFeatOpts): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "---",
    `id: ${opts.id}`,
    "status: pending",
    `priority: ${opts.pmCompositePriority}`,
    `category: ${opts.category}`,
    "target_release: null",
    `created: ${today}`,
    `updated: ${today}`,
    "depends_on: []",
    "slices: []",
    "derived_from: null",
    "tags: []",
    "needs_contract: false",
    "needs_ux: false",
    "github_issue: null",
    "github_milestone: null",
    `pm_customer_impact: ${opts.pmScores.customer_impact}`,
    `pm_effort_estimate: ${opts.pmScores.effort_estimate}`,
    `pm_strategic_alignment: ${opts.pmScores.strategic_alignment}`,
    `pm_technical_risk: ${opts.pmScores.technical_risk}`,
    `pm_dependency_depth: ${opts.pmScores.dependency_depth}`,
    `pm_composite_priority: ${opts.pmCompositePriority}`,
    `pm_autonomous_safe: ${opts.pmAutonomousSafe}`,
    `pm_reviewed: ${today}`,
    `autonomous_safe: ${opts.pmAutonomousSafe}`,
    `triage_notes: ${JSON.stringify(opts.triageNotes)}`,
    "---",
    `# ${opts.id}: ${opts.title}`,
    "",
    opts.acs.length > 0
      ? "## Acceptance criteria\n\n" + opts.acs.map((ac, i) => `- AC-${i + 1}: ${ac}`).join("\n")
      : ""
  ].join("\n");
}
