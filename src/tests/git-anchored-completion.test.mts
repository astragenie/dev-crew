// runner-plugin#392 — git-anchored slice-completion check.
// Unit coverage for ordinal parsing, reconcile-action planning, ref
// resolution, and git-evidence scanning, plus the end-to-end acceptance
// case from the issue: sliceFromFeature on a repo where SLICE-1/2 are
// already merged must scaffold SLICE-3, not SLICE-1.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import {
  ordinalFromIdSuffix,
  planReconcileAction,
  resolveMainRef,
  reconcileProposedSlicesAgainstGit,
  SliceAlreadyShippedError,
  type ShippedOrdinalEvidence
} from "../scripts/lib/slice-linker/git-anchored-completion.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import {
  addFeature,
  findFeatureById,
  updateFeatureFrontmatter
} from "../scripts/lib/backlog-writer.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
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

function git(repo: string, ...args: string[]): void {
  const out = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.equal(out.status, 0, `git ${args.join(" ")} failed: ${out.stderr}`);
}

/** tmpRepo + git init -b main + identity + one commit per given subject. */
async function tmpGitRepo(prefix: string, commitSubjects: string[]): Promise<string> {
  const repo = await tmpRepo(prefix);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Test");
  for (const subject of commitSubjects) {
    git(repo, "commit", "--allow-empty", "-m", subject);
  }
  return repo;
}

function evidence(ordinals: number[]): ShippedOrdinalEvidence[] {
  return ordinals.map((ordinal) => ({
    ordinal,
    idSuffix: `-SLICE-${ordinal}`,
    title: `Slice ${ordinal}`,
    commitSha: "a".repeat(40),
    commitSubject: `feat: FEAT-1 SLICE-${ordinal} — thing`
  }));
}

// --- ordinalFromIdSuffix -----------------------------------------------------

test("ordinalFromIdSuffix parses validated -SLICE-<n> suffixes", () => {
  assert.equal(ordinalFromIdSuffix("-SLICE-1"), 1);
  assert.equal(ordinalFromIdSuffix("-SLICE-42"), 42);
  assert.equal(ordinalFromIdSuffix("SLICE-3"), null);
  assert.equal(ordinalFromIdSuffix("-SLICE-"), null);
  assert.equal(ordinalFromIdSuffix("-slice-2"), null);
});

// --- planReconcileAction -----------------------------------------------------

test("planReconcileAction: no evidence → proceed", () => {
  assert.deepEqual(planReconcileAction(3, 0, []), { kind: "proceed" });
});

test("planReconcileAction: contiguous shipped prefix beyond materialized → advance", () => {
  const action = planReconcileAction(3, 0, evidence([1, 2]));
  assert.deepEqual(action, { kind: "advance", newStartIndex: 2 });
});

test("planReconcileAction: shipped prefix already covered by materialized slices → proceed", () => {
  assert.deepEqual(planReconcileAction(3, 2, evidence([1, 2])), { kind: "proceed" });
});

test("planReconcileAction: all proposed slices shipped → refuse", () => {
  const action = planReconcileAction(2, 0, evidence([1, 2]));
  assert.equal(action.kind, "refuse");
  assert.match((action as { reason: string }).reason, /fully shipped/);
});

test("planReconcileAction: non-contiguous evidence → refuse, never reorder", () => {
  const action = planReconcileAction(3, 0, evidence([1, 3]));
  assert.equal(action.kind, "refuse");
  assert.match((action as { reason: string }).reason, /non-contiguous/);
});

// --- resolveMainRef ----------------------------------------------------------

test("resolveMainRef finds local main and honors a valid loop.mainRef override", async () => {
  const repo = await tmpGitRepo("gac-ref-", ["chore: init"]);
  assert.equal(await resolveMainRef(repo, null), "main");
  assert.equal(await resolveMainRef(repo, { loop: { mainRef: "main" } }), "main");
  // Unresolvable override does not silently fall back to candidates.
  assert.equal(await resolveMainRef(repo, { loop: { mainRef: "release/nope" } }), null);
});

test("resolveMainRef prefers local main over a stale origin/main (no-push-from-loop posture)", async () => {
  const repo = await tmpGitRepo("gac-stale-origin-", ["chore: init"]);
  const staleSha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    encoding: "utf8"
  }).stdout.trim();
  // Simulate the loop's default posture: slice merged locally, never pushed —
  // origin/main is a stale remote-tracking ref behind local main.
  git(repo, "update-ref", "refs/remotes/origin/main", staleSha);
  git(repo, "commit", "--allow-empty", "-m", "feat: FEAT-7 SLICE-1 — merged locally, unpushed");

  assert.equal(await resolveMainRef(repo, null), "main");

  // And the reconcile scan actually sees the unpushed evidence.
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-7", [
    { id_suffix: "-SLICE-1", title: "Local-only", points: 2 }
  ]);
  assert.equal(res.gitError, null);
  assert.deepEqual(
    res.shipped.map((s) => s.ordinal),
    [1]
  );
});

test("resolveMainRef returns null (fail-open) outside a git repo", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gac-nogit-"));
  assert.equal(await resolveMainRef(dir, null), null);
});

// --- reconcileProposedSlicesAgainstGit ---------------------------------------

const PROPOSED_3 = [
  { id_suffix: "-SLICE-1", title: "Bridge", points: 2 },
  { id_suffix: "-SLICE-2", title: "ACL", points: 2 },
  { id_suffix: "-SLICE-3", title: "OAuth", points: 2 }
] satisfies { id_suffix: string; title: string; points: 2 }[];

test("reconcile finds shipped ordinals from FEAT+SLICE commit evidence", async () => {
  const repo = await tmpGitRepo("gac-hit-", [
    "feat(connectors): FEAT-312 SLICE-1 — bridge",
    "feat(connectors): SLICE-2 lands FEAT-312 ACL",
    "chore: unrelated"
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-312", PROPOSED_3);
  assert.equal(res.gitError, null);
  assert.deepEqual(
    res.shipped.map((s) => s.ordinal),
    [1, 2]
  );
  for (const s of res.shipped) assert.match(s.commitSha, /^[0-9a-f]{40}$/);
});

test("reconcile does not cross-match evidence for a different FEAT or ordinal", async () => {
  const repo = await tmpGitRepo("gac-miss-", [
    "feat: FEAT-999 SLICE-1 — other feature's slice",
    "feat: FEAT-312 SLICE-10 — ordinal ten only, no lower ordinal token here"
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-312", PROPOSED_3);
  assert.equal(res.gitError, null);
  assert.deepEqual(res.shipped, []);
});

test("reconcile fails open with gitError outside a git repo", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gac-open-"));
  const res = await reconcileProposedSlicesAgainstGit(dir, "FEAT-312", PROPOSED_3);
  assert.notEqual(res.gitError, null);
  assert.deepEqual(res.shipped, []);
});

// --- end-to-end acceptance (issue #392) --------------------------------------

test("sliceFromFeature skips shipped prefix: scaffolds SLICE-3 when 1/2 are merged", async () => {
  const repo = await tmpGitRepo("gac-e2e-", ["chore: init"]);
  const feat = await addFeature(repo, { title: "Connectors", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 6,
    proposed_slices: PROPOSED_3
  });
  git(repo, "commit", "--allow-empty", "-m", `feat: ${feat.id} SLICE-1 — bridge shipped`);
  git(repo, "commit", "--allow-empty", "-m", `feat: ${feat.id} SLICE-2 — ACL shipped`);

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 1, "must scaffold only the first unshipped slice");
  assert.equal(out.slices[0].title, "OAuth");

  // Durable stamp survives on the FEAT frontmatter.
  const updated = await findFeatureById(repo, feat.id);
  assert.deepEqual(updated.frontmatter.proposed_slices_shipped, ["-SLICE-1", "-SLICE-2"]);
  assert.equal(updated.frontmatter.proposed_slices_shipped_commits.length, 2);
});

test("sliceFromFeature refuses a fully-shipped FEAT and leaves backlog state untouched", async () => {
  const repo = await tmpGitRepo("gac-full-", ["chore: init"]);
  const feat = await addFeature(repo, { title: "Done already", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED_3.slice(0, 2)
  });
  git(repo, "commit", "--allow-empty", "-m", `feat: ${feat.id} SLICE-1 — bridge`);
  git(repo, "commit", "--allow-empty", "-m", `feat: ${feat.id} SLICE-2 — ACL`);

  await assert.rejects(
    () => sliceFromFeature(repo, feat.id),
    (err: unknown) => {
      assert.ok(err instanceof SliceAlreadyShippedError);
      assert.equal(err.featureId, feat.id);
      assert.equal(err.evidence.length, 2);
      return true;
    }
  );

  // Refuse happened before the in-progress move — feature still pending.
  const after = await findFeatureById(repo, feat.id);
  assert.equal(after.state, "pending");
  assert.deepEqual(after.frontmatter.slices ?? [], []);
});
