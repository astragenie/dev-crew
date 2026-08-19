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

import {
  addFeature,
  moveFeature,
  updateFeatureFrontmatter
} from "../scripts/lib/backlog-writer.mjs";
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

test("applyPmResults: refuses to write an in-progress FEAT (scoring/promotion must never touch in-progress) (FU)", async () => {
  const repo = await tmpRepo("pm-apply-inprogress-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const moved = await moveFeature(a.filePath, "in-progress");

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P2",
      autonomousSafe: true,
      reasoning: "should be refused — feature is already in-progress"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /in state "in-progress"/);

  const content = await fs.readFile(moved.to, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "in-progress");
  assert.equal(frontmatter.priority, null);
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

// ARCHITECT GATE read-guard (runner-plugin GATE workstream): a FEAT that is
// mid-gate or already deferred must not have pm-apply re-promote its
// priority or reset arch_attempt. Read-only skip — never a second writer of
// arch_* fields (see pm-apply.mts isArchGateActive).
test("applyPmResults: skips priority/promotion writes when arch_status is gate_in_progress (read-guard)", async () => {
  const repo = await tmpRepo("pm-apply-gate-inprogress-");
  const a = await addFeature(repo, {
    title: "Alpha",
    body: "x",
    category: "feature",
    priority: "P0"
  });
  await updateFeatureFrontmatter(
    a.filePath,
    { arch_status: "gate_in_progress", arch_attempt: 1 },
    repo,
    null
  );

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P2",
      autonomousSafe: true,
      reasoning: "routine re-triage while gate is mid-cycle"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 0, "a gated skip is not a validation failure");
  assert.equal(result.gated.length, 1);
  assert.equal(result.gated[0]!.archStatus, "gate_in_progress");

  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "pending", "not moved to triaged — write skipped");
  assert.equal(frontmatter.priority, "P0", "priority not re-promoted to P2");
  assert.equal(frontmatter.arch_attempt, 1, "arch_attempt not reset");
  assert.equal(frontmatter.arch_status, "gate_in_progress");
});

test("applyPmResults: skips priority/promotion writes when arch_status is deferred_design (read-guard)", async () => {
  const repo = await tmpRepo("pm-apply-gate-deferred-");
  const a = await addFeature(repo, {
    title: "Bravo",
    body: "x",
    category: "feature",
    priority: "P1"
  });
  await updateFeatureFrontmatter(
    a.filePath,
    { arch_status: "deferred_design", arch_attempt: 2, autonomous_safe: false },
    repo,
    null
  );

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P0",
      autonomousSafe: true,
      reasoning: "should not undo the gate's own defer"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.gated.length, 1);
  assert.equal(result.gated[0]!.archStatus, "deferred_design");

  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.priority, "P1", "priority not re-promoted to P0");
  assert.equal(frontmatter.autonomous_safe, false, "not flipped back to true");
  assert.equal(frontmatter.arch_attempt, 2, "arch_attempt not reset");
});

test("applyPmResults: a FEAT with no arch_status at all is unaffected by the read-guard", async () => {
  const repo = await tmpRepo("pm-apply-gate-none-");
  const a = await addFeature(repo, { title: "Charlie", body: "x", category: "feature" });

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "P1",
      autonomousSafe: true,
      reasoning: "normal triage, no gate in play"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 1);
  assert.equal(result.gated.length, 0);
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

// ---------------------------------------------------------------------
// Issue #402 — live-drift hardening.
//
// Bug 1: devcrew:pm emitted `featId` / `proposed_slices` instead of the
// documented `featureId` / `proposedSlices`, and pm-apply rejected 4/4
// entries. The recovered results file (FEAT-214 AC-5) was unappliable as
// written. `featId` and `proposed_slices` are now accepted as documented
// aliases; the bare `id` drift from FEAT-214 AC-2 stays rejected.
//
// Bug 2: `compositePriority: "needs-review"` is a legitimate PM verdict
// (agents/pm.md escape valve) but had no apply path — the entry hard-failed
// and the verdict left no on-disk trace. It now commits as a held
// disposition: FEAT stays in pending/, pm_* scores + pm_needs_review: true
// land in frontmatter, autonomous_safe is forced false, and no priority is
// assigned.
// ---------------------------------------------------------------------

test("applyPmResults: featId + proposed_slices aliases normalize to the documented keys (#402 bug 1)", async () => {
  const repo = await tmpRepo("pm-apply-alias-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  const entries = [
    {
      featId: a.id,
      scores: validScores(),
      compositePriority: "P1",
      autonomousSafe: true,
      reasoning: "emitted with drifted keys by a live devcrew:pm dispatch",
      acs: ["Given X, When Y, Then Z"],
      proposed_slices: [
        { id_suffix: "-SLICE-1", title: "Library + tests", points: 2 },
        { id_suffix: "-SLICE-2", title: "CLI wiring", points: 2 }
      ]
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(
    result.failures.length,
    0,
    `expected aliases to apply cleanly, got ${JSON.stringify(result.failures)}`
  );
  assert.equal(result.applied.length, 1);
  assert.equal(result.applied[0]!.featureId, a.id);
  assert.match(result.applied[0]!.filePath, /triaged/);

  const content = await fs.readFile(result.applied[0]!.filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "triaged");
  assert.equal(frontmatter.pm_composite_priority, "P1");
  assert.ok(Array.isArray(frontmatter.proposed_slices), "proposed_slices alias must be parsed");
  assert.match(body, /Given X, When Y, Then Z/);
});

test("applyPmResults: needs-review verdict commits as held-in-pending with pm_needs_review marker (#402 bug 2)", async () => {
  const repo = await tmpRepo("pm-apply-needsreview-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "needs-review",
      autonomousSafe: false,
      reasoning: "blocked on external research deliverable — human must size"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(
    result.failures.length,
    0,
    `expected needs-review to commit, got ${JSON.stringify(result.failures)}`
  );
  assert.equal(result.applied.length, 1);
  assert.equal(result.applied[0]!.movedToTriaged, false);
  assert.equal(result.applied[0]!.needsReview, true);
  assert.match(result.applied[0]!.filePath, /pending/);

  const content = await fs.readFile(result.applied[0]!.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.status, "pending");
  assert.equal(frontmatter.pm_needs_review, true);
  assert.equal(frontmatter.pm_composite_priority, "needs-review");
  assert.equal(frontmatter.autonomous_safe, false);
  // No real priority may be assigned — the verdict is "a human decides".
  assert.notEqual(frontmatter.priority, "needs-review");
  assert.ok(!VALID_PRIORITY_VALUES.has(String(frontmatter.priority)));
  assert.equal(typeof frontmatter.triage_notes, "string");

  // Verdict must be durable on disk via the pm-review artifact too.
  const artifactContent = await fs.readFile(result.applied[0]!.artifactPath, "utf8");
  assert.ok(artifactContent.includes(a.id));
});

const VALID_PRIORITY_VALUES = new Set(["P0", "P1", "P2", "P3", "P4"]);

test("applyPmResults: needs-review forces autonomous_safe false even when PM says true", async () => {
  const repo = await tmpRepo("pm-apply-needsreview-safe-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  const entries = [
    {
      featureId: a.id,
      scores: validScores(),
      compositePriority: "needs-review",
      autonomousSafe: true,
      reasoning: "contradictory flags — held verdict must stay human-gated"
    }
  ];

  const result = await applyPmResults(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 1);
  const content = await fs.readFile(result.applied[0]!.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.autonomous_safe, false);
  assert.equal(frontmatter.pm_autonomous_safe, false);
});
