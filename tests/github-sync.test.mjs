// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { detectRepo } from "../scripts/lib/github-sync/repo-detect.mjs";

// --- repo-detect ---

test("detectRepo returns override when set", () => {
  assert.equal(detectRepo("org/myrepo", "/any"), "org/myrepo");
});

test("detectRepo parses SSH remote URL", () => {
  const mockGit = () => "git@github.com:acme/widget.git";
  assert.equal(detectRepo(null, "/repo", { gitExec: mockGit }), "acme/widget");
});

test("detectRepo parses HTTPS remote URL with .git suffix", () => {
  const mockGit = () => "https://github.com/acme/widget.git";
  assert.equal(detectRepo(null, "/repo", { gitExec: mockGit }), "acme/widget");
});

test("detectRepo parses HTTPS remote URL without .git suffix", () => {
  const mockGit = () => "https://github.com/acme/widget";
  assert.equal(detectRepo(null, "/repo", { gitExec: mockGit }), "acme/widget");
});

test("detectRepo throws on unrecognised remote URL", () => {
  const mockGit = () => "https://gitlab.com/acme/widget.git";
  assert.throws(() => detectRepo(null, "/repo", { gitExec: mockGit }), /Cannot parse GitHub repo/);
});

import { extractSection, diffBody, patchBody } from "../scripts/lib/github-sync/body-diff.mjs";

// --- body-diff ---

const LOCAL_FEAT = `---
id: FEAT-001
status: triaged
updated: 2026-01-01
---

## Description

Original description text.

## Acceptance criteria

- [ ] AC-1: Must do X

## Notes

Some notes.
`;

const GH_BODY_UNCHANGED = `## Description

Original description text.

## Acceptance criteria

- [ ] AC-1: Must do X
`;

const GH_BODY_AC_CHANGED = `## Description

Original description text.

## Acceptance criteria

- [ ] AC-1: Must do X
- [ ] AC-2: Must also do Y
`;

test("extractSection returns content between heading and next heading", () => {
  const result = extractSection(GH_BODY_AC_CHANGED, "## Description");
  assert.equal(result, "Original description text.");
});

test("extractSection returns null when heading not found", () => {
  assert.equal(extractSection("## Other\n\nstuff", "## Description"), null);
});

test("diffBody reports no changes when content is identical", () => {
  const { changed, changes } = diffBody(LOCAL_FEAT, GH_BODY_UNCHANGED);
  assert.equal(changed, false);
  assert.deepEqual(changes, []);
});

test("diffBody detects changed acceptance criteria", () => {
  const { changed, changes } = diffBody(LOCAL_FEAT, GH_BODY_AC_CHANGED);
  assert.equal(changed, true);
  assert.ok(changes.includes("acceptance-criteria"));
});

test("patchBody updates AC section and updated date in frontmatter", () => {
  const patched = patchBody(LOCAL_FEAT, GH_BODY_AC_CHANGED, "2026-06-01");
  assert.ok(patched.includes("AC-2: Must also do Y"));
  assert.ok(patched.includes("updated: 2026-06-01"));
});

test("patchBody does not touch frontmatter fields other than updated", () => {
  const patched = patchBody(LOCAL_FEAT, GH_BODY_AC_CHANGED, "2026-06-01");
  assert.ok(patched.includes("id: FEAT-001"));
  assert.ok(patched.includes("status: triaged"));
});
