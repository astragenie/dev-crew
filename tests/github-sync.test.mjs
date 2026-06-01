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
