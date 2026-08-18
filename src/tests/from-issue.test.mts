// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, beforeEach } from "bun:test";
import assert from "node:assert/strict";

import { fetchIssue, parseIssueUrl } from "../scripts/lib/from-issue.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// Builds a mock executor that returns the given JSON payload as stdout.
function mockExec(payload: unknown) {
  return async (_args: string[]) => JSON.stringify(payload);
}

// Builds a mock executor that simulates a missing `gh` binary (ENOENT).
function mockExecMissingGh() {
  return async (_args: string[]) => {
    const err = Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" });
    throw err;
  };
}

// Builds a mock executor that simulates a non-zero gh exit (private issue).
function mockExecGhFails(stderrText = "Could not resolve to an Issue with the number 9999.") {
  return async (_args: string[]) => {
    const err = Object.assign(new Error("Command failed"), {
      code: 1,
      stderr: stderrText
    });
    throw err;
  };
}

// Reset process.exitCode before each test to prevent state leakage
beforeEach(() => {
  process.exitCode = 0;
});

// ---------------------------------------------------------------------------
// parseIssueUrl
// ---------------------------------------------------------------------------

test("parseIssueUrl returns trimmed URL for a valid HTTPS issue URL", () => {
  const url = "  https://github.com/owner/repo/issues/42  ";
  assert.equal(parseIssueUrl(url), "https://github.com/owner/repo/issues/42");
});

test("parseIssueUrl throws for empty string", () => {
  assert.throws(() => parseIssueUrl(""), /must not be empty/);
});

test("parseIssueUrl throws for whitespace-only string", () => {
  assert.throws(() => parseIssueUrl("   "), /must not be empty/);
});

// ---------------------------------------------------------------------------
// fetchIssue — happy path
// ---------------------------------------------------------------------------

test("fetchIssue returns parsed title, body, number, url on success", async () => {
  const payload = {
    title: "Fix the widget bug",
    body: "Detailed description here.",
    number: 42,
    url: "https://github.com/acme/widget/issues/42"
  };

  const result = await fetchIssue("https://github.com/acme/widget/issues/42", {
    exec: mockExec(payload)
  });

  assert.equal(result.title, "Fix the widget bug");
  assert.equal(result.body, "Detailed description here.");
  assert.equal(result.number, 42);
  assert.equal(result.url, "https://github.com/acme/widget/issues/42");
});

test("fetchIssue handles empty body gracefully", async () => {
  const payload = {
    title: "Issue with no body",
    body: null,
    number: 7,
    url: "https://github.com/acme/widget/issues/7"
  };

  const result = await fetchIssue("https://github.com/acme/widget/issues/7", {
    exec: mockExec(payload)
  });

  assert.equal(result.title, "Issue with no body");
  assert.equal(result.body, "");
  assert.equal(result.number, 7);
});

test("fetchIssue passes correct gh args to executor", async () => {
  const seenArgs: string[][] = [];
  const exec = async (args: string[]) => {
    seenArgs.push(args);
    return JSON.stringify({
      title: "T",
      body: "B",
      number: 1,
      url: "https://github.com/a/b/issues/1"
    });
  };

  await fetchIssue("https://github.com/a/b/issues/1", { exec });

  assert.equal(seenArgs.length, 1);
  const [args] = seenArgs;
  assert.ok(args.includes("issue"), "args should include 'issue'");
  assert.ok(args.includes("view"), "args should include 'view'");
  assert.ok(args.includes("https://github.com/a/b/issues/1"), "args should include the URL");
  assert.ok(args.includes("--json"), "args should include --json");
});

// ---------------------------------------------------------------------------
// fetchIssue — missing gh CLI error (AC-3, AC-4)
// ---------------------------------------------------------------------------

test("fetchIssue throws clear error when gh is not on PATH (ENOENT)", async () => {
  await assert.rejects(
    () => fetchIssue("https://github.com/acme/widget/issues/42", { exec: mockExecMissingGh() }),
    (err: Error) => {
      assert.ok(
        err.message.includes("GitHub CLI") || err.message.includes("`gh`"),
        `expected message about gh CLI, got: ${err.message}`
      );
      assert.ok(
        err.message.includes("installed") || err.message.includes("PATH"),
        `expected message about installation, got: ${err.message}`
      );
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// fetchIssue — non-zero exit / inaccessible issue (AC-3, AC-4)
// ---------------------------------------------------------------------------

test("fetchIssue throws clear error when gh exits non-zero (private/inaccessible issue)", async () => {
  await assert.rejects(
    () =>
      fetchIssue("https://github.com/private/repo/issues/9999", {
        exec: mockExecGhFails("Could not resolve to an Issue with the number 9999.")
      }),
    (err: Error) => {
      assert.ok(
        err.message.includes("non-zero") || err.message.includes("failed"),
        `expected message about non-zero exit, got: ${err.message}`
      );
      assert.ok(
        err.message.includes("Could not resolve") ||
          err.message.includes("access") ||
          err.message.includes("correct"),
        `expected detail about the failure, got: ${err.message}`
      );
      return true;
    }
  );
});

test("fetchIssue error for non-zero exit includes gh stderr output", async () => {
  const stderrMsg = "HTTP 404: Not Found (https://api.github.com)";
  await assert.rejects(
    () =>
      fetchIssue("https://github.com/private/repo/issues/1", {
        exec: mockExecGhFails(stderrMsg)
      }),
    (err: Error) => {
      assert.ok(
        err.message.includes(stderrMsg),
        `expected stderr message in error, got: ${err.message}`
      );
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// fetchIssue — malformed JSON guard
// ---------------------------------------------------------------------------

test("fetchIssue throws when gh returns non-JSON output", async () => {
  const exec = async (_args: string[]) => "not json at all";

  await assert.rejects(
    () => fetchIssue("https://github.com/acme/widget/issues/1", { exec }),
    /parse JSON/
  );
});

test("fetchIssue throws when JSON is missing required fields", async () => {
  const exec = async (_args: string[]) => JSON.stringify({ foo: "bar" });

  await assert.rejects(
    () => fetchIssue("https://github.com/acme/widget/issues/1", { exec }),
    /unexpected JSON shape/
  );
});

// ---------------------------------------------------------------------------
// Integration: addFeature with github_issue + github_url fields (AC-2)
// ---------------------------------------------------------------------------

test("addFeature writes github_issue and github_url into FEAT frontmatter", async () => {
  const repo = await tmpRepo("fi-add-feature-");
  const { addFeature } = await import("../scripts/lib/backlog-writer.mjs");
  const { parseFrontmatter } = await import("../scripts/lib/frontmatter.mjs");

  const result = await addFeature(repo, {
    title: "Issue-backed feature",
    body: "From a GitHub issue.",
    github_issue: 42,
    github_url: "https://github.com/acme/widget/issues/42"
  });

  const content = await fs.readFile(result.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);

  assert.equal(frontmatter.github_issue, 42, "github_issue should be 42");
  assert.equal(
    frontmatter.github_url,
    "https://github.com/acme/widget/issues/42",
    "github_url should match"
  );
});

test("addFeature omits github_issue and github_url when not provided", async () => {
  const repo = await tmpRepo("fi-no-github-");
  const { addFeature } = await import("../scripts/lib/backlog-writer.mjs");
  const { parseFrontmatter } = await import("../scripts/lib/frontmatter.mjs");

  const result = await addFeature(repo, {
    title: "Plain feature without issue link",
    body: "No GitHub issue."
  });

  const content = await fs.readFile(result.filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);

  assert.ok(
    frontmatter.github_issue === undefined || frontmatter.github_issue === null,
    "github_issue should be absent"
  );
  assert.ok(
    frontmatter.github_url === undefined || frontmatter.github_url === null,
    "github_url should be absent"
  );
});
