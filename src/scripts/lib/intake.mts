/**
 * intake: free-text → pending FEAT file.
 *
 * FEAT-214 item 3: this CLI cannot dispatch an LLM (DEC-011 — CLI
 * subcommands never auto-dispatch role agents; the slash flow is the
 * dispatch boundary). So `intakeFromText` is NOT the "PM scores it inline"
 * step commands/intake.md originally sketched — it is the mechanical half:
 * normalize free text into a `pending/` FEAT file with `priority: null`
 * (unscored), reusing the same `addFeature` write path every other backlog
 * entry point uses. Scoring happens afterward via the normal PM/triage
 * phase (`/runner:triage` → `pm-apply`, see pm-apply.mts), which already
 * handles pending → triaged + `pm_*` frontmatter.
 *
 * `--spec` is explicitly NOT implemented here: a 10-section SPEC body
 * requires PM/LLM drafting judgment this CLI cannot perform on its own —
 * intakeFromText throws a clear `not_implemented`-shaped error rather than
 * silently writing a wrong artifact type (FEAT-214 AC-3 option b).
 * `--deep` is accepted but currently a no-op at this layer for the same
 * reason (AC drafting needs PM); it does not change what gets written.
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
  /** null = not yet scored; scoring happens via the normal PM/triage phase. */
  priority: "P0" | "P1" | "P2" | "P3" | "P4" | null;
  autonomousSafe: boolean;
  acCount: number;
  costUsd: number;
  filePath?: string;
  dryRunPreview?: string;
}

const TITLE_MAX_LEN = 80;

/** First non-empty line, truncated — used as the FEAT title when none is supplied. */
function deriveTitleFromText(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  const source = firstLine ?? text.trim();
  if (source.length <= TITLE_MAX_LEN) return source;
  return `${source.slice(0, TITLE_MAX_LEN - 1).trimEnd()}…`;
}

function buildIntakeBody(text: string): string {
  return [
    "## Description",
    "",
    text.trim(),
    "",
    "## Intake notes",
    "",
    'Created via free-text intake (`/runner:intake "<text>"`). Priority is',
    "unset — this FEAT has not been scored yet. Run `/runner:triage`",
    "(PM scoring + `backlog pm-apply`) to score it before slicing."
  ].join("\n");
}

export async function intakeFromText(opts: IntakeFromTextOpts): Promise<IntakeFromTextResult> {
  const { repoPath, text, flags } = opts;
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    throw new Error("intakeFromText requires non-empty text");
  }
  if (flags.spec) {
    throw new Error(
      "intakeFromText: --spec mode is not_implemented — a 10-section SPEC body needs PM/LLM " +
        "drafting judgment this CLI cannot dispatch (DEC-011). Use the documented agent-driven " +
        "flow instead: dispatch runner:pm with --spec from the intake skill, then write the " +
        "SPEC file directly."
    );
  }

  const title = deriveTitleFromText(trimmed);
  const body = buildIntakeBody(trimmed);

  if (flags.dryRun) {
    const { nextFeatureId } = await import("./backlog-parser.mjs");
    const previewId = await nextFeatureId(repoPath);
    return {
      featId: previewId,
      priority: null,
      autonomousSafe: false,
      acCount: 0,
      costUsd: 0,
      dryRunPreview: `# ${previewId}: ${title}\n\n${body}`
    };
  }

  const { addFeature } = await import("./backlog-writer.mjs");
  const result = await addFeature(repoPath, {
    title,
    body,
    priority: null,
    category: "feature",
    derived_from: null
  });

  return {
    featId: result.id,
    priority: null,
    autonomousSafe: false,
    acCount: 0,
    costUsd: 0,
    filePath: result.filePath
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
