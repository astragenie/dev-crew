// FEAT: PM `--rescope` autonomous mode (GATE reject-loop integration).
//
// Validates `applyPmRescope` (the pm-apply.mts rescope entry point) and its
// CLI subcommand `backlog pm-rescope --file <results.json>`. The GATE
// workstream dispatches `runner:pm --rescope <FEAT-ID>` with a list of
// architect-reviewer objections; PM rewrites the FEAT's AC section to
// address them. This funnels through the SAME writer as `applyPmResults`
// (appendAcsSection's sibling `replaceAcsSection`, plus `updateFeatureFrontmatter`
// from backlog-writer.mjs) — no second writer touches FEAT frontmatter/body.
//
// Idempotency requirement: the gate may call rescope up to 2x for the same
// FEAT. Re-running MUST replace the AC section in place, never append a
// second "## Acceptance criteria" heading.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { applyPmRescope } from "../scripts/lib/pm-apply.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({}));
  return repo;
}

const EXISTING_AC_BODY = `## Description

Some feature body.

## Acceptance criteria (Given-When-Then)

- AC-1: Given the old context, When the old action, Then the old outcome.
- AC-2: Given another old context, When another action, Then another outcome.

## Notes

Trailing section that must survive a rescope rewrite untouched.
`;

test("applyPmRescope: valid entry replaces the AC section and funnels through the existing writer", async () => {
  const repo = await tmpRepo("pm-rescope-valid-");
  const a = await addFeature(repo, {
    title: "Alpha",
    body: EXISTING_AC_BODY,
    category: "feature"
  });

  const entries = [
    {
      featureId: a.id,
      objections: ["Scope too broad — touches auth and billing in one slice."],
      acs: [
        "AC-1: Given a narrowed scope limited to auth, When the slice runs, Then billing is untouched.",
        "AC-2: Given an invalid auth token, When the endpoint is called, Then a 401 is returned."
      ],
      scopeNotes: "Narrowed to auth-only per architect-reviewer objection.",
      reasoning: "Split billing out to a follow-up FEAT to address scope objection."
    }
  ];

  const result = await applyPmRescope(repo, entries, { allowedIds: [a.id] });
  assert.equal(
    result.failures.length,
    0,
    `expected no failures, got ${JSON.stringify(result.failures)}`
  );
  assert.equal(result.applied.length, 1);
  assert.equal(result.applied[0]!.rescopeCount, 1);

  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);

  // Old ACs are gone, new ACs are present, exactly one AC heading.
  assert.ok(!body.includes("old context"));
  assert.ok(body.includes("narrowed scope limited to auth"));
  assert.equal(
    (body.match(/^##\s+Acceptance criteria/gim) || []).length,
    1,
    "exactly one AC heading after rescope"
  );

  // Sibling sections survive untouched.
  assert.ok(body.includes("## Notes"));
  assert.ok(body.includes("Trailing section that must survive"));
  assert.ok(body.includes("## Description"));

  // Frontmatter audit trail.
  assert.equal(frontmatter.pm_rescope_count, 1);
  assert.ok(typeof frontmatter.pm_last_rescoped === "string");
  assert.deepEqual(frontmatter.rescope_objections, entries[0]!.objections);

  // Artifact written via the existing pm-artifact-writer funnel.
  const artifactContent = await fs.readFile(result.applied[0]!.artifactPath, "utf8");
  assert.ok(artifactContent.includes(a.id));
});

test("applyPmRescope: re-running (up to the gate's 2x cap) replaces the AC section, never appends a duplicate", async () => {
  const repo = await tmpRepo("pm-rescope-idempotent-");
  const a = await addFeature(repo, {
    title: "Alpha",
    body: EXISTING_AC_BODY,
    category: "feature"
  });

  const firstPass = [
    {
      featureId: a.id,
      objections: ["First objection."],
      acs: ["AC-1: Given first pass, When it runs, Then first outcome."],
      reasoning: "First rescope pass."
    }
  ];
  const secondPass = [
    {
      featureId: a.id,
      objections: ["Second objection — first pass still too broad."],
      acs: ["AC-1: Given second pass, When it runs, Then second outcome."],
      reasoning: "Second rescope pass, narrower still."
    }
  ];

  const first = await applyPmRescope(repo, firstPass, { allowedIds: [a.id] });
  assert.equal(first.failures.length, 0);
  assert.equal(first.applied[0]!.rescopeCount, 1);

  const second = await applyPmRescope(repo, secondPass, { allowedIds: [a.id] });
  assert.equal(second.failures.length, 0);
  assert.equal(second.applied[0]!.rescopeCount, 2);

  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);

  assert.equal(
    (body.match(/^##\s+Acceptance criteria/gim) || []).length,
    1,
    "second rescope must not append a second AC heading"
  );
  assert.ok(!body.includes("first pass"), "first-pass AC text must be gone after the second pass");
  assert.ok(body.includes("second pass"));
  assert.equal(frontmatter.pm_rescope_count, 2);
  assert.deepEqual(frontmatter.rescope_objections, secondPass[0]!.objections);
});

test("applyPmRescope: succeeds on an in-progress FEAT (mid-slice design reject) (FU)", async () => {
  const repo = await tmpRepo("pm-rescope-inprogress-");
  const a = await addFeature(repo, {
    title: "Alpha",
    body: EXISTING_AC_BODY,
    category: "feature"
  });
  const moved = await moveFeature(a.filePath, "in-progress");

  const entries = [
    {
      featureId: a.id,
      objections: ["Mid-slice design reject — scope drifted from the approved contracts artifact."],
      acs: [
        "AC-1: Given the narrowed mid-slice scope, When the slice resumes, Then only the approved contract surface is touched."
      ],
      reasoning: "Rescope requested by the architect gate mid-slice."
    }
  ];

  const result = await applyPmRescope(repo, entries, { allowedIds: [a.id] });
  assert.equal(
    result.failures.length,
    0,
    `expected no failures, got ${JSON.stringify(result.failures)}`
  );
  assert.equal(result.applied.length, 1);
  assert.equal(result.applied[0]!.filePath, moved.to);

  const content = await fs.readFile(moved.to, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  assert.equal(
    frontmatter.status,
    "in-progress",
    "rescope must not re-promote/demote the FEAT state"
  );
  assert.ok(body.includes("narrowed mid-slice scope"));
  assert.equal(frontmatter.pm_rescope_count, 1);
});

test("applyPmRescope: missing objections fails validation, writes nothing", async () => {
  const repo = await tmpRepo("pm-rescope-noobjections-");
  const a = await addFeature(repo, { title: "Alpha", body: EXISTING_AC_BODY, category: "feature" });

  const entries = [
    {
      featureId: a.id,
      acs: ["AC-1: Given x, When y, Then z."],
      reasoning: "no objections supplied"
    }
  ];

  const result = await applyPmRescope(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /objections/);

  const content = await fs.readFile(a.filePath, "utf8");
  assert.ok(content.includes("old context"), "original AC section must survive a failed entry");
});

test("applyPmRescope: acs missing Given/When/Then fails validation, writes nothing", async () => {
  const repo = await tmpRepo("pm-rescope-badgwt-");
  const a = await addFeature(repo, { title: "Alpha", body: EXISTING_AC_BODY, category: "feature" });

  const entries = [
    {
      featureId: a.id,
      objections: ["Some objection."],
      acs: ["Just do the thing, no GWT markers here."],
      reasoning: "malformed AC"
    }
  ];

  const result = await applyPmRescope(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /Given.*When.*Then|Given\/When\/Then/i);
});

test("applyPmRescope: featureId outside the allowed id set fails validation, writes nothing", async () => {
  const repo = await tmpRepo("pm-rescope-outofset-");
  const a = await addFeature(repo, { title: "Alpha", body: EXISTING_AC_BODY, category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: EXISTING_AC_BODY, category: "feature" });

  const entries = [
    {
      featureId: b.id,
      objections: ["Objection."],
      acs: ["AC-1: Given x, When y, Then z."],
      reasoning: "not in allowed set"
    }
  ];

  const result = await applyPmRescope(repo, entries, { allowedIds: [a.id] });
  assert.equal(result.applied.length, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0]!.issues.join(" "), /allowed set/);
});

test("CLI: backlog pm-rescope --file commits a fixture results file end-to-end", async () => {
  const repo = await tmpRepo("pm-rescope-cli-");
  const a = await addFeature(repo, { title: "Alpha", body: EXISTING_AC_BODY, category: "feature" });

  const resultsPath = path.join(repo, "rescope-results.json");
  await fs.writeFile(
    resultsPath,
    JSON.stringify([
      {
        featureId: a.id,
        objections: ["CLI fixture objection."],
        acs: ["AC-1: Given the CLI fixture, When it runs, Then it commits via pm-rescope."],
        reasoning: "cli fixture pass"
      }
    ])
  );

  const r = spawnSync(
    "bun",
    [LOOP_CLI, "backlog", "pm-rescope", "--file", resultsPath, "--ids", a.id, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.applied, 1);
  assert.equal(parsed.failed, 0);
});
