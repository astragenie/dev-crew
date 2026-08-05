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

/**
 * A fixture commit's file diff: repo-relative path -> file content. Absent
 * or empty means the commit touches no files (`--allow-empty`) — the
 * accidental-mention shape from the FEAT-284 repro. Present means the
 * commit actually changes those paths — the genuine-evidence shape.
 */
type FixtureFiles = Record<string, string>;

interface CommitSpec {
  subject: string;
  files?: FixtureFiles;
  // FEAT-284 AC-7: a separate paragraph from `subject`, distinct commit
  // trailer text — needed to fixture the "token pair only when subject+body
  // are concatenated" shape (the live 3bd6ab95 recurrence: subject mentions
  // only its own slice, body separately narrates a different FEAT/SLICE).
  body?: string;
}

/** A fixture commit input: a bare subject (empty commit, existing call-site
 * shape) or a { subject, files, body } spec for a real file-touching commit. */
type CommitInput = string | CommitSpec;

async function writeFixtureFiles(repo: string, files: FixtureFiles): Promise<void> {
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(repo, relPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
}

/** Commit `subject` (+ optional separate `body` paragraph) in `repo`. With
 * `files` given and non-empty, writes + stages those paths first (a real
 * file-touching commit); otherwise commits `--allow-empty` (the
 * accidental/no-op-diff shape the FEAT-284 repro exploited). Exported-in-file
 * so both `tmpGitRepo` and standalone mid-sequence commits (e.g. after
 * `addFeature`) can produce either shape. */
async function commitFixture(
  repo: string,
  subject: string,
  files?: FixtureFiles,
  body?: string
): Promise<void> {
  const messageArgs = body ? ["-m", subject, "-m", body] : ["-m", subject];
  if (files && Object.keys(files).length > 0) {
    await writeFixtureFiles(repo, files);
    git(repo, "add", "-A");
    git(repo, "commit", ...messageArgs);
  } else {
    git(repo, "commit", "--allow-empty", ...messageArgs);
  }
}

/** tmpRepo + git init -b main + identity + one commit per given input. Each
 * entry is either a plain subject string (empty commit — preserves every
 * pre-FEAT-284 call site unchanged) or a { subject, files } spec that writes
 * real files before committing. */
async function tmpGitRepo(prefix: string, commits: CommitInput[]): Promise<string> {
  const repo = await tmpRepo(prefix);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Test");
  // Commit the scaffold's own .claude/loop.json first so it's already
  // tracked before any fixture commit below. Otherwise it sits untracked
  // and the first `files`-bearing commit's `git add -A` (in commitFixture)
  // sweeps it in as an unintended extra changed path — invisible to fixtures
  // that only assert "shipped" (an extra path doesn't change that verdict),
  // but corrupting to FEAT-284 AC-6 fixtures that assert changed paths are
  // ALL non-implementing.
  git(repo, "add", ".claude/loop.json");
  git(repo, "commit", "-m", "chore: scaffold fixture repo");
  for (const entry of commits) {
    const spec: CommitSpec = typeof entry === "string" ? { subject: entry } : entry;
    await commitFixture(repo, spec.subject, spec.files, spec.body);
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
  // origin/main is a stale remote-tracking ref behind local main. Real file
  // change (not --allow-empty) so FEAT-284 AC-1's diff-corroboration
  // requirement doesn't strip this fixture's shipped evidence.
  git(repo, "update-ref", "refs/remotes/origin/main", staleSha);
  await commitFixture(repo, "feat: FEAT-7 SLICE-1 — merged locally, unpushed", {
    "src/scripts/lib/local-only.mts": "export const localOnly = 1;\n"
  });

  assert.equal(await resolveMainRef(repo, null), "main");

  // And the reconcile scan actually sees the unpushed evidence.
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-7", [
    { id_suffix: "-SLICE-1", title: "Local-only", points: 2, estimated_tokens: 100_000 }
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
  { id_suffix: "-SLICE-1", title: "Bridge", points: 2, estimated_tokens: 100_000 },
  { id_suffix: "-SLICE-2", title: "ACL", points: 2, estimated_tokens: 100_000 },
  { id_suffix: "-SLICE-3", title: "OAuth", points: 2, estimated_tokens: 100_000 }
] satisfies { id_suffix: string; title: string; points: 2; estimated_tokens: number }[];

test("reconcile finds shipped ordinals from FEAT+SLICE commit evidence", async () => {
  // Real file changes on the two matching commits — FEAT-284 AC-1 requires
  // diff corroboration, so an --allow-empty commit here would no longer
  // count regardless of how well its text matches.
  const repo = await tmpGitRepo("gac-hit-", [
    {
      subject: "feat(connectors): FEAT-312 SLICE-1 — bridge",
      files: { "src/scripts/lib/bridge.mts": "export const bridge = 1;\n" }
    },
    {
      subject: "feat(connectors): SLICE-2 lands FEAT-312 ACL",
      files: { "src/scripts/lib/acl.mts": "export const acl = 1;\n" }
    },
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

// --- diff-shape fixtures (FEAT-284) ------------------------------------------
//
// reconcileProposedSlicesAgainstGit used to treat a subject/body text match
// alone as shipped evidence — it never looked at what a commit actually
// changed. SLICE-188 rebuilt the fixtures below with real file-touching
// commits (see the live repro against commit 71604bb4); SLICE-189 (this
// slice) adds the diff-corroboration check itself (AC-1/AC-2/AC-6) and these
// tests assert its corrected behavior.

test("FEAT-284 AC-1: an --allow-empty commit that only mentions FEAT+SLICE tokens does NOT count as shipped evidence", async () => {
  const repo = await tmpGitRepo("gac-empty-evidence-", [
    { subject: "feat: FEAT-500 SLICE-1 — allow-empty, touches nothing" }
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-500", [
    { id_suffix: "-SLICE-1", title: "Empty", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.equal(res.gitError, null);
  assert.deepEqual(res.shipped, []);
  assert.equal(res.textOnlyMatches.length, 1);
  assert.equal(res.textOnlyMatches[0]!.reason, "no-diff-evidence");
});

test("FEAT-284 AC-6: a docs-only commit that mentions FEAT+SLICE tokens does NOT count as shipped evidence (the 71604bb4 repro shape)", async () => {
  // This is the exact shape of the live 71604bb4 repro: a docs-only commit
  // whose body prose incidentally mentions both tokens, and the proposed
  // slice declares no touches_files (matching all five of FEAT-259's real
  // entries) — so AC-6's non-implementing-path rule is what has to catch it,
  // not AC-1 or AC-2.
  const repo = await tmpGitRepo("gac-docs-evidence-", [
    {
      subject: "docs: run before committing FEAT-259's SLICE-1 to a design",
      files: { "docs/research/design-notes.md": "# design notes\n" }
    }
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-259", [
    { id_suffix: "-SLICE-1", title: "Design", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.equal(res.gitError, null);
  assert.deepEqual(res.shipped, []);
  assert.equal(res.textOnlyMatches.length, 1);
  assert.equal(res.textOnlyMatches[0]!.reason, "non-implementing-paths-only");
});

test("FEAT-284 AC-7: a token pair mentioned only in the commit BODY does NOT count as shipped evidence, even with real file changes (live SLICE-188/3bd6ab95 recurrence)", async () => {
  // Found live, not authored as a fixture: SLICE-188's own commit rebuilding
  // this test suite has a SUBJECT that mentions only "SLICE-188" (an
  // unrelated ordinal, its own slice) and a BODY that separately quotes
  // "FEAT-259's SLICE-1" as repro narration — while genuinely touching a
  // real src/tests/ file. That combination defeated AC-1 (real diff), AC-2
  // (FEAT-259's proposed slices declare no touches_files) and AC-6 (the
  // changed path isn't docs/artifacts) as first implemented, re-triggering
  // the exact silent-shipped-evidence defect FEAT-284 exists to kill —
  // discovered during this slice's own live FEAT-259 verification. AC-7's
  // subject-only check is what actually closes it: the pair appears only
  // once subject+body are concatenated, never within the subject alone.
  const repo = await tmpGitRepo("gac-body-only-evidence-", [
    {
      subject:
        "test(SLICE-188): rebuild git-anchored-completion fixtures with real file-touching commits",
      files: { "src/tests/some-other-suite.test.mts": "test('x', () => {});\n" },
      body: "tmpGitRepo's --allow-empty-only fixture helper made it structurally impossible for the suite to distinguish a commit that implements a slice from one that merely mentions it in prose — the exact gap that let commit 71604bb4 silently drop FEAT-259's SLICE-1."
    }
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-259", [
    { id_suffix: "-SLICE-1", title: "Design", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.equal(res.gitError, null);
  assert.deepEqual(res.shipped, []);
  assert.equal(res.textOnlyMatches.length, 1);
  assert.equal(res.textOnlyMatches[0]!.reason, "token-pair-in-body-only");
});

// --- squash-body bullet lines (FEAT-284 AC-8 / SLICE-194) -------------------
//
// AC-7 (above) requires the FEAT-id/SLICE-ordinal pair in the commit SUBJECT
// because a body-only mention is exactly the shape of the three known false
// positives. But a genuine squash-merge (GitHub's default squash format, and
// manual multi-commit squashes alike — the live 859be561 shape) folds each
// original commit's SUBJECT into the merge commit's BODY as one bullet line
// per commit. AC-8 treats those bullet lines as subject-equivalent, while a
// hard-wrapped prose line that merely starts with "-" stays non-qualifying.

test("FEAT-284 AC-8: squash-body bullet lines are recognized as subject-equivalent matches, while a prose line that merely starts with a dash is not (859be561 shape)", async () => {
  const repo = await tmpGitRepo("gac-squash-bullets-", [
    {
      subject: "FEAT-600: squash merge landing two slices (#600)",
      files: {
        "src/scripts/lib/thing-one.mts": "export const thingOne = 1;\n",
        "src/scripts/lib/thing-two.mts": "export const thingTwo = 1;\n"
      },
      body:
        "* fix(dispatch): implement thing one (FEAT-600 SLICE-1)\n" +
        "\n" +
        "Root cause notes about thing one, in ordinary prose describing rationale\n" +
        "and nothing else notable here.\n" +
        "\n" +
        "* feat(dispatch): implement thing two (FEAT-600 SLICE-2)\n" +
        "\n" +
        "More explanatory prose about thing two, still not itself a list.\n" +
        "\n" +
        "This paragraph provides closing context and eventually\n" +
        "- happens to wrap here mentioning FEAT-600 and its SLICE-4 nuance directly " +
        "inside prose, not as a list, before the sentence continues normally."
    }
  ]);

  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-600", [
    { id_suffix: "-SLICE-1", title: "Thing one", points: 2, estimated_tokens: 100_000 },
    { id_suffix: "-SLICE-2", title: "Thing two", points: 2, estimated_tokens: 100_000 },
    {
      id_suffix: "-SLICE-4",
      title: "Decoy — wrapped prose, not a real bullet",
      points: 2,
      estimated_tokens: 100_000
    }
  ]);

  assert.equal(res.gitError, null);
  assert.deepEqual(
    res.shipped.map((s) => s.ordinal).sort(),
    [1, 2],
    "both squash-bullet slices recognized as shipped"
  );
  assert.equal(res.textOnlyMatches.length, 1, "the wrapped-prose decoy must not be promoted");
  assert.equal(res.textOnlyMatches[0]!.ordinal, 4);
  assert.equal(res.textOnlyMatches[0]!.reason, "token-pair-in-body-only");
});

test("FEAT-284 AC-8a: all three known live false positives (71604bb4, c2e77fe7, 3bd6ab95) still downgrade with the bullet-line rule active", async () => {
  // Reconstructed from the actual commit bodies (git show -s <sha>) rather
  // than a paraphrase, since this is exactly the failure mode the rejected
  // "FEAT-id OR SLICE-token in subject" alternative would have reinstated.

  // 71604bb4: contains a genuine bulleted list, but the list items never
  // mention FEAT-259 — the FEAT-259/SLICE-1 pair sits only in an earlier,
  // non-bulleted prose sentence.
  const repo71604bb4 = await tmpGitRepo("gac-ac8a-71604bb4-", [
    {
      subject:
        "docs(research): architect classification for FEAT-281/282/283 + SubagentStop contract spike",
      files: { "docs/research/subagentstop-spike.md": "# spike\n" },
      body:
        "Also lands a research spike run before committing FEAT-259's SLICE-1 to a\n" +
        "design. A documentation review flagged an issue.\n" +
        "\n" +
        "Three findings that change SLICE-1's shape:\n" +
        "  - last_assistant_message carries the subagent's full final text.\n" +
        "  - agent_type carries the caller-chosen dispatch NAME, not the role.\n" +
        "  - No payload field enumerates tools called.\n"
    }
  ]);
  const res71604bb4 = await reconcileProposedSlicesAgainstGit(repo71604bb4, "FEAT-259", [
    { id_suffix: "-SLICE-1", title: "Design", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.deepEqual(res71604bb4.shipped, []);
  assert.equal(res71604bb4.textOnlyMatches.length, 1);
  assert.equal(res71604bb4.textOnlyMatches[0]!.reason, "token-pair-in-body-only");

  // c2e77fe7: FEAT-259 appears in the subject, but the SLICE-1 ordinal token
  // appears only mid-sentence in the body (never a bulleted line).
  const repoC2e77fe7 = await tmpGitRepo("gac-ac8a-c2e77fe7-", [
    {
      subject: "chore(backlog): slice FEAT-259; repair git-anchored false-positive; file FEAT-284",
      files: { ".claude/artifacts/loop/backlog/triaged/FEAT-259.md": "notes\n" },
      body:
        "It skipped -SLICE-1 (the SubagentStop report-gate hook, the highest-ROI\n" +
        "mechanism in the FEAT) and stamped proposed_slices_shipped onto the FEAT,\n" +
        "citing a docs-only commit."
    }
  ]);
  const resC2e77fe7 = await reconcileProposedSlicesAgainstGit(repoC2e77fe7, "FEAT-259", [
    { id_suffix: "-SLICE-1", title: "Report gate", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.deepEqual(resC2e77fe7.shipped, []);
  assert.equal(resC2e77fe7.textOnlyMatches.length, 1);
  assert.equal(resC2e77fe7.textOnlyMatches[0]!.reason, "token-pair-in-body-only");

  // 3bd6ab95: subject names an unrelated ordinal (SLICE-188); body is plain
  // prose (no bullets at all) narrating "FEAT-259's SLICE-1".
  const repo3bd6ab95 = await tmpGitRepo("gac-ac8a-3bd6ab95-", [
    {
      subject:
        "test(SLICE-188): rebuild git-anchored-completion fixtures with real file-touching commits",
      files: { "src/tests/some-other-suite.test.mts": "test('x', () => {});\n" },
      body:
        "tmpGitRepo's --allow-empty-only fixture helper made it structurally\n" +
        "impossible for the suite to distinguish a commit that implements a slice\n" +
        "from one that merely mentions it in prose — the exact gap that let commit\n" +
        "71604bb4 silently drop FEAT-259's SLICE-1."
    }
  ]);
  const res3bd6ab95 = await reconcileProposedSlicesAgainstGit(repo3bd6ab95, "FEAT-259", [
    { id_suffix: "-SLICE-1", title: "Design", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.deepEqual(res3bd6ab95.shipped, []);
  assert.equal(res3bd6ab95.textOnlyMatches.length, 1);
  assert.equal(res3bd6ab95.textOnlyMatches[0]!.reason, "token-pair-in-body-only");
});

test("FEAT-284 AC-8c: a bullet-line match still requires diff corroboration — it is not a promotion bypass", async () => {
  const repo = await tmpGitRepo("gac-ac8c-bullet-no-diff-", [
    {
      subject: "FEAT-700: squash merge (#700)",
      // No `files` — an --allow-empty commit, same as the AC-1 fixture above.
      body: "* fix(x): implement thing (FEAT-700 SLICE-1)\n\nprose describing the change.\n"
    }
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-700", [
    { id_suffix: "-SLICE-1", title: "Thing", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.equal(res.gitError, null);
  assert.deepEqual(res.shipped, []);
  assert.equal(res.textOnlyMatches.length, 1);
  assert.equal(
    res.textOnlyMatches[0]!.reason,
    "no-diff-evidence",
    "the bullet-line match must still be demoted by AC-1's no-diff-evidence check, not silently promoted"
  );
});

test("reconcile finds genuine shipped evidence from a commit that changes real source paths", async () => {
  const repo = await tmpGitRepo("gac-src-evidence-", [
    {
      subject: "feat: FEAT-501 SLICE-1 — implement thing",
      files: { "src/scripts/lib/thing.mts": "export const thing = 1;\n" }
    }
  ]);
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-501", [
    { id_suffix: "-SLICE-1", title: "Thing", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.equal(res.gitError, null);
  assert.deepEqual(
    res.shipped.map((s) => s.ordinal),
    [1]
  );
  assert.match(res.shipped[0]!.commitSha, /^[0-9a-f]{40}$/);
});

test("FEAT-284 AC-2: a candidate commit's changed paths overlapping a proposed slice's declared touches_files counts as shipped", async () => {
  const repo = await tmpGitRepo("gac-touches-overlap-", [
    {
      subject: "feat: FEAT-502 SLICE-1 — implement connector",
      files: { "src/scripts/lib/connector.mts": "export const connector = 1;\n" }
    }
  ]);
  const proposed = [
    {
      id_suffix: "-SLICE-1",
      title: "Connector",
      points: 2 as const,
      estimated_tokens: 100_000,
      touches_files: ["src/scripts/lib/connector.mts"]
    }
  ];
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-502", proposed);
  assert.equal(res.gitError, null);
  assert.deepEqual(
    res.shipped.map((s) => s.ordinal),
    [1]
  );
  assert.deepEqual(res.textOnlyMatches, []);
});

test("FEAT-284 AC-2: a candidate commit's changed paths sharing zero overlap with declared touches_files is downgraded, not shipped", async () => {
  // Contrast case for the fixture above — real file changes, but to a path
  // outside the slice's declared touch surface (docs, not the connector
  // module).
  const repo = await tmpGitRepo("gac-touches-no-overlap-", [
    {
      subject: "feat: FEAT-503 SLICE-1 — implement connector",
      files: { "docs/research/unrelated-note.md": "unrelated\n" }
    }
  ]);
  const proposed = [
    {
      id_suffix: "-SLICE-1",
      title: "Connector",
      points: 2 as const,
      estimated_tokens: 100_000,
      touches_files: ["src/scripts/lib/connector.mts"]
    }
  ];
  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-503", proposed);
  assert.equal(res.gitError, null);
  assert.deepEqual(res.shipped, []);
  assert.equal(res.textOnlyMatches.length, 1);
  assert.equal(res.textOnlyMatches[0]!.reason, "no-touches-files-overlap");
});

test("FEAT-284: fail-open when git cannot resolve a matched commit's diff", async () => {
  // The commit-log pre-filter succeeds (the commit object itself is intact,
  // so `git log --grep` can read its message fine) but the diff lookup for
  // that exact commit is made to fail by deleting its TREE object — `git
  // show --name-only` needs the tree to compute which paths changed and
  // errors without it, while `git log --grep` never touches the tree. The
  // reconciler must treat this as "no evidence", never crash, never mark the
  // slice shipped.
  const repo = await tmpGitRepo("gac-diff-lookup-fails-", [
    {
      subject: "feat: FEAT-504 SLICE-1 — implement thing",
      files: { "src/scripts/lib/thing.mts": "export const thing = 1;\n" }
    }
  ]);
  const treeSha = spawnSync("git", ["rev-parse", "HEAD^{tree}"], {
    cwd: repo,
    encoding: "utf8"
  }).stdout.trim();
  const treeObjectPath = path.join(repo, ".git", "objects", treeSha.slice(0, 2), treeSha.slice(2));
  await fs.rm(treeObjectPath, { force: true });

  const res = await reconcileProposedSlicesAgainstGit(repo, "FEAT-504", [
    { id_suffix: "-SLICE-1", title: "Thing", points: 2, estimated_tokens: 100_000 }
  ]);
  assert.equal(
    res.gitError,
    null,
    "outer reconcile must not surface the inner diff-lookup failure as gitError"
  );
  assert.deepEqual(res.shipped, []);
  assert.equal(res.textOnlyMatches.length, 1);
  assert.equal(res.textOnlyMatches[0]!.reason, "no-diff-evidence");
});

// --- end-to-end acceptance (issue #392) --------------------------------------

test("sliceFromFeature skips shipped prefix: scaffolds SLICE-3 when 1/2 are merged", async () => {
  const repo = await tmpGitRepo("gac-e2e-", ["chore: init"]);
  const feat = await addFeature(repo, { title: "Connectors", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 6,
    proposed_slices: PROPOSED_3
  });
  // Real file changes — FEAT-284 AC-1 requires diff corroboration, so an
  // --allow-empty commit would no longer register as shipped evidence.
  await commitFixture(repo, `feat: ${feat.id} SLICE-1 — bridge shipped`, {
    "src/scripts/lib/bridge.mts": "export const bridge = 1;\n"
  });
  await commitFixture(repo, `feat: ${feat.id} SLICE-2 — ACL shipped`, {
    "src/scripts/lib/acl.mts": "export const acl = 1;\n"
  });

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
  // Real file changes — see the sibling test above for why --allow-empty no
  // longer registers as shipped evidence under FEAT-284 AC-1.
  await commitFixture(repo, `feat: ${feat.id} SLICE-1 — bridge`, {
    "src/scripts/lib/bridge.mts": "export const bridge = 1;\n"
  });
  await commitFixture(repo, `feat: ${feat.id} SLICE-2 — ACL`, {
    "src/scripts/lib/acl.mts": "export const acl = 1;\n"
  });

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

// --- FEAT-284 SLICE-190: operator-visible skip/downgrade lines ---------------
//
// git-anchored-completion.mts stays a pure evaluator (no console output of
// its own) — reconcileProposedSlicesStartIndex in feature-lifecycle.mts is
// the one caller that both makes the reconcile decision and has an operator
// watching, so these tests exercise it via sliceFromFeature, the same public
// entry point runner:start uses.

async function withCapturedWarnings<T>(
  fn: () => Promise<T>
): Promise<{ result: T; warnings: string[] }> {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (msg: unknown) => {
    warnings.push(String(msg));
  };
  try {
    const result = await fn();
    return { result, warnings };
  } finally {
    console.warn = originalWarn;
  }
}

test("sliceFromFeature prints a demoted-match warning naming ordinal, title, and commit sha (AC-3)", async () => {
  const repo = await tmpGitRepo("gac-warn-demote-", ["chore: init"]);
  const feat = await addFeature(repo, { title: "Demote warning", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 2,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "Design", points: 2, estimated_tokens: 100_000 }
    ]
  });
  // FEAT-284 AC-7 shape: token pair only in the body (never the subject),
  // with a real file change — demoted, not shipped.
  await commitFixture(
    repo,
    "test(SLICE-188): rebuild git-anchored-completion fixtures",
    { "src/tests/some-other-suite.test.mts": "test('x', () => {});\n" },
    `mentions ${feat.id}'s SLICE-1 only in prose here, never in the subject`
  );

  const { result: out, warnings } = await withCapturedWarnings(() =>
    sliceFromFeature(repo, feat.id)
  );

  // Demoted, not shipped — the slice still materializes normally.
  assert.equal(out.slices.length, 1);

  const demoteLines = warnings.filter((w) => w.includes("demoted"));
  assert.ok(
    demoteLines.length > 0,
    `expected a demoted-match warning, got: ${JSON.stringify(warnings)}`
  );
  const detailLine = warnings.find((w) => w.includes("-SLICE-1"));
  assert.ok(detailLine, `expected a detail line naming -SLICE-1, got: ${JSON.stringify(warnings)}`);
  assert.match(detailLine!, /ordinal 1/);
  assert.match(detailLine!, /"Design"/);
  assert.match(detailLine!, /token-pair-in-body-only|body, not its subject/);
});

test("sliceFromFeature prints a skipped-shipped warning naming ordinal, title, and commit sha when the start index advances (AC-3)", async () => {
  const repo = await tmpGitRepo("gac-warn-skip-", ["chore: init"]);
  const feat = await addFeature(repo, { title: "Skip warning", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 6,
    proposed_slices: PROPOSED_3
  });
  await commitFixture(repo, `feat: ${feat.id} SLICE-1 — bridge shipped`, {
    "src/scripts/lib/bridge.mts": "export const bridge = 1;\n"
  });
  await commitFixture(repo, `feat: ${feat.id} SLICE-2 — ACL shipped`, {
    "src/scripts/lib/acl.mts": "export const acl = 1;\n"
  });

  const { result: out, warnings } = await withCapturedWarnings(() =>
    sliceFromFeature(repo, feat.id)
  );

  assert.equal(out.slices.length, 1, "must scaffold only the first unshipped slice (OAuth)");
  assert.equal(out.slices[0].title, "OAuth");

  const skipHeader = warnings.find((w) => w.includes("skipped as"));
  assert.ok(skipHeader, `expected a skipped-shipped header, got: ${JSON.stringify(warnings)}`);
  const ordinal1 = warnings.find((w) => w.includes("-SLICE-1"));
  const ordinal2 = warnings.find((w) => w.includes("-SLICE-2"));
  assert.ok(ordinal1, `expected a line naming -SLICE-1, got: ${JSON.stringify(warnings)}`);
  assert.ok(ordinal2, `expected a line naming -SLICE-2, got: ${JSON.stringify(warnings)}`);
  assert.match(ordinal1!, /ordinal 1/);
  assert.match(ordinal1!, /"Bridge"/);
  assert.match(ordinal1!, /[0-9a-f]{7}/);
  assert.match(ordinal2!, /ordinal 2/);
  assert.match(ordinal2!, /"ACL"/);
});

test("sliceFromFeature prints nothing when no proposed slice is demoted or skipped (AC-3, no noise)", async () => {
  const repo = await tmpGitRepo("gac-warn-silent-", [
    "feat: FEAT-999 SLICE-1 — other feature's slice",
    "chore: unrelated"
  ]);
  const feat = await addFeature(repo, { title: "Clean run", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED_3.slice(0, 2)
  });

  const { result: out, warnings } = await withCapturedWarnings(() =>
    sliceFromFeature(repo, feat.id)
  );

  assert.equal(
    out.slices.length,
    2,
    "no shipped evidence — both proposed slices scaffold normally"
  );
  const reconcileWarnings = warnings.filter((w) => w.includes("[git-anchored-completion]"));
  assert.deepEqual(
    reconcileWarnings,
    [],
    `expected no git-anchored-completion warnings, got: ${JSON.stringify(reconcileWarnings)}`
  );
});
