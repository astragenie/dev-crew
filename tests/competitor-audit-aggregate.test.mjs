import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseBrief, AXES } from "../scripts/competitor-audit/aggregate.mjs";

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
