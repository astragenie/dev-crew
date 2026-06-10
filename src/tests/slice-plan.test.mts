// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { runPlanPreflight } from "../scripts/lib/slice-plan.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function writeSliceFile(repo, sliceId, content) {
  const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(slicesDir, { recursive: true });
  const filePath = path.join(slicesDir, `${sliceId}_TEST-SLICE.md`);
  await fs.writeFile(filePath, content);
  return filePath;
}

// AC-4 case 1: artifact-write path — runPlanPreflight writes a .md file under .claude/artifacts/loop/plans/
test("runPlanPreflight writes a plan artifact under .claude/artifacts/loop/plans/", async () => {
  const repo = await tmpRepo("al-slice-plan-write-");
  await writeSliceFile(
    repo,
    "SLICE-10",
    `---
id: SLICE-10
status: pending
---
# SLICE-10: Test slice

## Objective

Implement something.

## In scope

- src/scripts/lib/slice-plan.mts

## Out of scope

Nothing.

## Acceptance criteria

- [ ] AC-1: Tests pass
`
  );

  const result = await runPlanPreflight(repo, "SLICE-10");

  assert.ok(result.planPath, "planPath must be set");
  assert.match(result.planPath, /plans[/\\].*plan.*SLICE-10.*\.md$/i);

  // File must actually exist
  const stat = await fs.stat(result.planPath);
  assert.ok(stat.isFile(), "plan artifact must be a file on disk");
});

// AC-4 case 2: all-sections-present — artifact contains all 4 required sections
test("runPlanPreflight artifact contains all 4 required sections", async () => {
  const repo = await tmpRepo("al-slice-plan-sections-");
  await writeSliceFile(
    repo,
    "SLICE-10",
    `---
id: SLICE-10
status: pending
---
# SLICE-10: Sections test

## Objective

Build a feature.

## In scope

- src/scripts/lib/slice-plan.mts
- commands/slice-plan.md

## Acceptance criteria

- [ ] AC-1: Works
`
  );

  const result = await runPlanPreflight(repo, "SLICE-10");

  assert.ok(result.sections, "sections must be returned");
  assert.ok(result.sections.context !== undefined, "context section must be present");
  assert.ok(
    result.sections.filesResearched !== undefined,
    "filesResearched section must be present"
  );
  assert.ok(result.sections.openQuestions !== undefined, "openQuestions section must be present");
  assert.ok(
    result.sections.proposedApproach !== undefined,
    "proposedApproach section must be present"
  );

  // Verify the artifact file contains all 4 headings
  const content = await fs.readFile(result.planPath, "utf8");
  assert.match(content, /^## Context$/m, "artifact must contain ## Context section");
  assert.match(
    content,
    /^## Files researched$/m,
    "artifact must contain ## Files researched section"
  );
  assert.match(content, /^## Open questions$/m, "artifact must contain ## Open questions section");
  assert.match(
    content,
    /^## Proposed approach$/m,
    "artifact must contain ## Proposed approach section"
  );
});

// AC-4 case 3: no-in-scope-hint fallback — slice with no In scope section still produces artifact with Context section
test("runPlanPreflight handles slice with no in-scope hint (files_count=0, Context present)", async () => {
  const repo = await tmpRepo("al-slice-plan-noscopehint-");
  await writeSliceFile(
    repo,
    "SLICE-99",
    `---
id: SLICE-99
status: pending
---
# SLICE-99: No scope hint

## Objective

Something without scope.

## Acceptance criteria

- [ ] AC-1: Works
`
  );

  const result = await runPlanPreflight(repo, "SLICE-99");

  assert.ok(result.planPath, "planPath must be set even with no in-scope hint");
  assert.equal(
    result.filesResearched.length,
    0,
    "filesResearched should be empty when no hint given"
  );

  const content = await fs.readFile(result.planPath, "utf8");
  assert.match(
    content,
    /^## Context$/m,
    "artifact must contain ## Context even without in-scope hint"
  );
  assert.match(content, /^## Files researched$/m, "Files researched section must still appear");
});

// Extra case: frontmatter includes generated_at and slice id
test("runPlanPreflight artifact frontmatter includes slice and generated_at", async () => {
  const repo = await tmpRepo("al-slice-plan-frontmatter-");
  await writeSliceFile(
    repo,
    "SLICE-10",
    `---
id: SLICE-10
status: pending
---
# SLICE-10: Frontmatter test

## Objective

Check frontmatter.
`
  );

  const result = await runPlanPreflight(repo, "SLICE-10");
  const content = await fs.readFile(result.planPath, "utf8");
  assert.match(content, /^slice:\s*SLICE-10$/m, "frontmatter must include slice field");
  assert.match(content, /^generated_at:/m, "frontmatter must include generated_at field");
});
