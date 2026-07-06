// FEAT-214 / DEC-058 — pm-apply hybrid write-path.
//
// Validates the CLI subcommand `backlog pm-apply --file <results.json>`
// and its underlying `applyPmResults` library function: a failing entry
// writes nothing, a passing entry commits frontmatter + moves
// pending/ -> triaged/ + writes a pm-review artifact.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { applyPmResults } from "../scripts/lib/pm-apply.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  // FEAT-218 Phase 2: the loop.mts CLI dispatcher resolves config once for
  // every command (AC-5 — resolveConfig throws when .claude/loop.json is
  // absent instead of silently defaulting). Only the CLI-spawning test below
  // needs this, but seeding it here for every temp repo is harmless and
  // matches a real installed repo.
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({}));
  return repo;
}

function validScores() {
  return {
    customer_impact: 0.8,
    effort_estimate: 0.3,
    strategic_alignment: 0.7,
    technical_risk: 0.2,
    dependency_depth: 0.1
  };
}

test("applyPmResults: valid batch commits frontmatter, moves to triaged, writes pm-review artifact", async () => {
  const repo = await tmpRepo("pm-apply-valid-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P1",
      autonomousSafe: true,
      demandEvidence: "grade lesson X",
      reasoning: "high impact, low effort"
    },
    {
      featureId: b.id,
      scores: validScores(),
      compositePriority: "P2",
      autonomousSafe: false,
      reasoning: "moderate priority"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id, b.id] });
  assert.equal(
    result.failures.length,
    0,
    `expected no failures, got ${JSON.stringify(result.failures)}`
  );
  assert.equal(result.applied.length, 2);

  for (const applied of result.applied) {
    assert.match(applied.filePath, /triaged/);
    const content = await fs.readFile(applied.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.status, "triaged");
    assert.equal(typeof frontmatter.pm_customer_impact, "number");
    const artifactContent = await fs.readFile(applied.artifactPath, "utf8");
    assert.ok(artifactContent.includes(applied.featureId));
  }
});

test("applyPmResults: field-name mismatch (id/evidence instead of featureId/demandEvidence) fails validation, writes nothing", async () => {
  const repo = await tmpRepo("pm-apply-fieldname-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  const entries = [
    {
      // Wrong field names — mirrors the FEAT-214 AC-2 drift (result.id / result.evidence).
      id: a.id,
      evidence: "some evidence",
      scores: validScores(),
      compositePriority: "P1",
      autonomousSafe: true,
      reasoning: "should not apply"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /featureId/);

  // Original file must be unchanged — still pending, no pm_* fields.
  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "pending");
  assert.equal(frontmatter.pm_customer_impact, undefined);
});

test("applyPmResults: P4 without declined_per fails validation, writes nothing", async () => {
  const repo = await tmpRepo("pm-apply-p4-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P4",
      autonomousSafe: false,
      reasoning: "declined but no citation"
      // declined_per intentionally omitted
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /declined_per/);

  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "pending");
});

test("applyPmResults: featureId outside the allowed id set fails validation, writes nothing", async () => {
  const repo = await tmpRepo("pm-apply-outoflist-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const entries = [
    {
      featureId: b.id,
      scores: validScores(),
      compositePriority: "P2",
      autonomousSafe: true,
      reasoning: "not in allowed set"
    }
  ];

  // Allowed set only contains `a.id` — `b.id` must be rejected.
  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /allowed set/);

  const content = await fs.readFile(b.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "pending");
});

test("applyPmResults: re-running against the same results is idempotent (already-triaged entries update in place)", async () => {
  const repo = await tmpRepo("pm-apply-idempotent-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P1",
      autonomousSafe: true,
      reasoning: "first pass"
    }
  ];

  const first = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(first.applied.length, 1);
  assert.equal(first.applied[0]!.movedToTriaged, true);

  const second = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(second.applied.length, 1);
  assert.equal(
    second.applied[0]!.movedToTriaged,
    false,
    "already triaged — updates in place, no re-move"
  );
});

test("CLI: backlog pm-apply --file commits a fixture results file end-to-end", async () => {
  const repo = await tmpRepo("pm-apply-cli-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  const resultsPath = path.join(repo, "results.json");
  await fs.writeFile(
    resultsPath,
    JSON.stringify([
      {
        featureId: a.id,
        scores: validScores(),
        compositePriority: "P1",
        autonomousSafe: true,
        reasoning: "cli fixture pass"
      }
    ])
  );

  const r = spawnSync(
    "bun",
    [LOOP_CLI, "backlog", "pm-apply", "--file", resultsPath, "--ids", a.id, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.applied, 1);
  assert.equal(parsed.failed, 0);
});
