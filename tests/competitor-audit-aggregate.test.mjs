import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseBrief,
  AXES,
  dedupeAndRank,
  renderMatrixMarkdown,
  priorityFromComposite,
  runAudit
} from "../scripts/competitor-audit/aggregate.mjs";
import { findFeatureById } from "../scripts/lib/backlog-writer.mjs";

async function tmpBriefsDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

const SAMPLE_BRIEF = `---
competitor: superpowers
host: CC plugin
language: TypeScript
license: MIT
version_observed: 5.1.0
sources: [https://example.com/superpowers]
brief_version: 1
---

# superpowers — competitor brief

## Identity

- skill-based methodology layer.

## Matrix row

| Axis                 | Symbol | 1-line note                |
| -------------------- | ------ | -------------------------- |
| Workflow phases      | ●      | brainstorming + plans      |
| Roles / dispatch     | ◐      | subagent-driven dev        |
| Artifacts / state    | ○      | no on-disk artifact set    |
| Memory / retention   | ○      | none                       |
| Model routing        | ○      | none                       |
| Cost / telemetry     | ○      | none                       |
| Backlog / spec       | ◐      | writing-plans + specs only |
| Validation / gates   | ◐      | verification-before-completion |
| Deployment           | ○      | none                       |
| Install / distribution | ●    | marketplace                |

## Strengths vs loop / crew

- a strong strength

## Weaknesses vs loop / crew

- a weakness

## Gap candidates

### GAP-1: Verification-before-completion guard

- Description: blocks "done" claim until verification runs.
- Source: skills/verification-before-completion
- Impact (0-3): 3 — every workflow benefits
- Effort (0-3): 1 — small hook
- Fit (0-3): 3 — aligns with existing gates
- Composite: 3 + (3 - 1) + 3 = 8

## Inadvisable mimics

- nothing significant
`;

test("AXES lists all ten taxonomy axes in order", () => {
  assert.deepEqual(AXES, [
    "Workflow phases",
    "Roles / dispatch",
    "Artifacts / state",
    "Memory / retention",
    "Model routing",
    "Cost / telemetry",
    "Backlog / spec",
    "Validation / gates",
    "Deployment",
    "Install / distribution"
  ]);
});

test("parseBrief reads frontmatter + matrix row + gap candidates", async () => {
  const dir = await tmpBriefsDir("audit-parse-");
  const file = path.join(dir, "superpowers.md");
  await fs.writeFile(file, SAMPLE_BRIEF);
  const brief = await parseBrief(file);
  assert.equal(brief.competitor, "superpowers");
  assert.equal(brief.host, "CC plugin");
  assert.equal(brief.version_observed, "5.1.0");
  assert.equal(brief.matrix["Workflow phases"].symbol, "●");
  assert.match(brief.matrix["Workflow phases"].note, /brainstorming/);
  assert.equal(brief.matrix["Deployment"].symbol, "○");
  assert.equal(brief.gaps.length, 1);
  assert.equal(brief.gaps[0].id, "GAP-1");
  assert.equal(brief.gaps[0].impact, 3);
  assert.equal(brief.gaps[0].effort, 1);
  assert.equal(brief.gaps[0].fit, 3);
  assert.equal(brief.gaps[0].composite, 8);
});

test("parseBrief throws when a required axis row is missing", async () => {
  const dir = await tmpBriefsDir("audit-parse-bad-");
  const file = path.join(dir, "bad.md");
  // Drop the "Deployment" row entirely.
  await fs.writeFile(file, SAMPLE_BRIEF.replace(/^\| Deployment.*$\n/m, ""));
  await assert.rejects(() => parseBrief(file), /missing axis: Deployment/);
});

test("parseBrief strips UTF-8 BOM before parsing frontmatter", async () => {
  const dir = await tmpBriefsDir("audit-parse-bom-");
  const file = path.join(dir, "bom.md");
  // Editors on Windows commonly prepend a UTF-8 BOM (U+FEFF). Without
  // stripping, the leading invisible character breaks parseFrontmatter
  // and every required frontmatter field reads as undefined.
  await fs.writeFile(file, "\ufeff" + SAMPLE_BRIEF);
  const brief = await parseBrief(file);
  assert.equal(brief.competitor, "superpowers");
  assert.equal(brief.gaps.length, 1);
});

test("parseBrief extracts multiple gap candidates", async () => {
  const dir = await tmpBriefsDir("audit-parse-multigap-");
  const file = path.join(dir, "multi.md");
  const multiGapBrief = SAMPLE_BRIEF.replace(
    "## Inadvisable mimics",
    `### GAP-2: Subagent dispatch budget

- Description: caps tokens spent per dispatched subagent.
- Source: skills/dispatching-parallel-agents
- Impact (0-3): 2 — protects cost ceiling
- Effort (0-3): 2 — moderate plumbing
- Fit (0-3): 2 — fits crew dispatch model
- Composite: 2 + (3 - 2) + 2 = 5

## Inadvisable mimics`
  );
  await fs.writeFile(file, multiGapBrief);
  const brief = await parseBrief(file);
  assert.equal(brief.gaps.length, 2);
  assert.equal(brief.gaps[0].id, "GAP-1");
  assert.equal(brief.gaps[0].title, "Verification-before-completion guard");
  assert.equal(brief.gaps[0].impact, 3);
  assert.equal(brief.gaps[0].effort, 1);
  assert.equal(brief.gaps[0].fit, 3);
  assert.equal(brief.gaps[0].composite, 8);
  assert.equal(brief.gaps[1].id, "GAP-2");
  assert.equal(brief.gaps[1].title, "Subagent dispatch budget");
  assert.equal(brief.gaps[1].impact, 2);
  assert.equal(brief.gaps[1].effort, 2);
  assert.equal(brief.gaps[1].fit, 2);
  assert.equal(brief.gaps[1].composite, 5);
});

test("parseBrief throws when required frontmatter field is missing", async () => {
  const dir = await tmpBriefsDir("audit-parse-missing-fm-");
  const file = path.join(dir, "missing-license.md");
  // Drop the "license" frontmatter line entirely.
  await fs.writeFile(file, SAMPLE_BRIEF.replace(/^license:.*$\n/m, ""));
  await assert.rejects(() => parseBrief(file), /missing required frontmatter field: license/);
});

test("parseBrief throws on duplicate axis row", async () => {
  const dir = await tmpBriefsDir("audit-parse-dup-axis-");
  const file = path.join(dir, "dup.md");
  // Inject a second "Workflow phases" row right after the first.
  const dupBrief = SAMPLE_BRIEF.replace(
    "| Workflow phases      | ●      | brainstorming + plans      |",
    "| Workflow phases      | ●      | brainstorming + plans      |\n| Workflow phases      | ◐      | duplicate row              |"
  );
  await fs.writeFile(file, dupBrief);
  await assert.rejects(() => parseBrief(file), /duplicate axis row: Workflow phases/);
});

test("dedupeAndRank merges same-title gaps across competitors", () => {
  // A and B disagree on every dimension. We want:
  //   impact = MAX(3, 2) = 3  (most generous)
  //   effort = MIN(3, 1) = 1  (most generous — least work)
  //   fit    = MAX(2, 3) = 3  (most generous)
  //   composite = 3 + (3 - 1) + 3 = 8  (recomputed from merged components)
  // Stored composites are 5 and 7 — neither matches the merged composite,
  // so this also catches a buggy `Math.max(stored)` implementation.
  const briefs = [
    {
      competitor: "A",
      gaps: [
        { id: "GAP-1", title: "Verification guard", impact: 3, effort: 3, fit: 2, composite: 5 }
      ]
    },
    {
      competitor: "B",
      gaps: [
        { id: "GAP-1", title: "Verification guard", impact: 2, effort: 1, fit: 3, composite: 7 },
        { id: "GAP-2", title: "Cost dashboards", impact: 2, effort: 2, fit: 2, composite: 5 }
      ]
    }
  ];
  const ranked = dedupeAndRank(briefs);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].title, "Verification guard");
  assert.deepEqual(ranked[0].source_competitors.sort(), ["A", "B"]);
  assert.equal(ranked[0].impact, 3);
  assert.equal(ranked[0].effort, 1);
  assert.equal(ranked[0].fit, 3);
  // Composite is recomputed from merged components, not max of stored values.
  assert.equal(ranked[0].composite, 8);
  assert.equal(ranked[1].title, "Cost dashboards");
});

test("renderMatrixMarkdown produces an 8-column table (7 + loop/crew baseline)", () => {
  const briefs = [
    {
      competitor: "A",
      matrix: { "Workflow phases": { symbol: "●", note: "yes" } }
    },
    {
      competitor: "B",
      matrix: { "Workflow phases": { symbol: "○", note: "no" } }
    }
  ];
  const md = renderMatrixMarkdown(briefs, {
    baseline: { name: "loop+crew", matrix: { "Workflow phases": { symbol: "●", note: "native" } } },
    axes: ["Workflow phases"]
  });
  assert.match(md, /\| Axis\s+\| loop\+crew \| A \| B \|/);
  assert.match(md, /\| Workflow phases \| ● native \| ● yes \| ○ no \|/);
});

test("priorityFromComposite maps 9->P0, 8|7->P1, 6->P2, <6->P3", () => {
  assert.equal(priorityFromComposite(9), "P0");
  assert.equal(priorityFromComposite(8), "P1");
  assert.equal(priorityFromComposite(7), "P1");
  assert.equal(priorityFromComposite(6), "P2");
  assert.equal(priorityFromComposite(5), "P3");
  assert.equal(priorityFromComposite(0), "P3");
});

test("runAudit reads briefs dir, writes matrix.md, drafts FEATs for composite >= 6", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "audit-run-"));
  const briefsDir = path.join(repo, "docs/research/2026-05-28-competitor-gap-audit/briefs");
  await fs.mkdir(briefsDir, { recursive: true });
  // alpha.md gets a second composite-5 gap to exercise the `composite < 6` skip
  // branch in runAudit. Keep this modification inline — don't pollute SAMPLE_BRIEF
  // because other tests rely on its single-gap shape.
  const alphaBrief = SAMPLE_BRIEF.replace("superpowers", "alpha").replace(
    "## Inadvisable mimics",
    `### GAP-2: Low-value experimental knob

- Description: a knob with marginal value.
- Source: skills/example-low-value
- Impact (0-3): 2 — limited reach
- Effort (0-3): 2 — moderate plumbing
- Fit (0-3): 1 — weak alignment
- Composite: 2 + (3 - 2) + 1 = 4

## Inadvisable mimics`
  );
  await fs.writeFile(path.join(briefsDir, "alpha.md"), alphaBrief);
  await fs.writeFile(path.join(briefsDir, "beta.md"), SAMPLE_BRIEF.replace("superpowers", "beta"));

  const result = await runAudit(repo, {
    auditDir: "docs/research/2026-05-28-competitor-gap-audit",
    baselineName: "loop+crew",
    baselineMatrix: Object.fromEntries(AXES.map((a) => [a, { symbol: "●", note: "native" }]))
  });

  // matrix.md written
  const matrixContent = await fs.readFile(
    path.join(repo, "docs/research/2026-05-28-competitor-gap-audit/matrix.md"),
    "utf8"
  );
  assert.match(matrixContent, /\| Axis/);
  assert.match(matrixContent, /alpha/);
  assert.match(matrixContent, /beta/);

  // Only the composite-8 gap is drafted; composite-4 GAP-2 must be skipped.
  assert.equal(result.draftedFeats.length, 1);
  const feat = await findFeatureById(repo, result.draftedFeats[0].id);
  assert.ok(feat, "feat exists");
  assert.equal(feat.frontmatter.category, "competitor-gap");
  assert.equal(feat.frontmatter.priority, "P1");
  assert.equal(feat.frontmatter.composite_score, 8);
  assert.deepEqual(feat.frontmatter.source_competitors.sort(), ["alpha", "beta"]);
  assert.equal(feat.frontmatter.autonomous_safe, false);
});
