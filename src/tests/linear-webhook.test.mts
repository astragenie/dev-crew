// @ts-nocheck — imports from scripts/linear-sync/ which is outside tsc rootDir.
// Bun resolves .mjs specifiers to the .mts source at runtime.

import { test, describe } from "bun:test";
import assert from "node:assert/strict";

import { parseMention } from "../../scripts/linear-sync/mention-parser.mjs";
import { handleLinearWebhook } from "../../scripts/linear-sync/webhook-handler.mjs";
import type { LinearWebhookPayload } from "../../scripts/linear-sync/linear-types.mjs";

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const ISSUE_ID = "abc-123";
const ISSUE_IDENTIFIER = "ENG-42";

function makeCommentPayload(body: string): LinearWebhookPayload {
  return {
    type: "Comment",
    action: "create",
    organizationId: "org-1",
    webhookTimestamp: "2026-06-13T00:00:00.000Z",
    data: {
      id: "comment-1",
      body,
      url: "https://linear.app/comment/1",
      issue: { id: ISSUE_ID, identifier: ISSUE_IDENTIFIER, title: "Test issue" },
      user: { id: "user-1", name: "Alice", email: "alice@example.com" }
    }
  };
}

function makeIssueUpdatePayload(): LinearWebhookPayload {
  return {
    type: "Issue",
    action: "update",
    organizationId: "org-1",
    webhookTimestamp: "2026-06-13T00:00:00.000Z",
    data: {
      id: ISSUE_ID,
      identifier: ISSUE_IDENTIFIER,
      title: "Test issue",
      url: "https://linear.app/issue/ENG-42",
      team: { id: "team-1", name: "Engineering" }
    }
  };
}

// ---------------------------------------------------------------------------
// parseMention tests
// ---------------------------------------------------------------------------

describe("parseMention", () => {
  test("@crew build → command=build", () => {
    const result = parseMention("@crew build", ISSUE_ID, ISSUE_IDENTIFIER);
    assert.ok(result !== null, "expected a CrewMention");
    assert.equal(result.command, "build");
    assert.equal(result.issueId, ISSUE_ID);
    assert.equal(result.issueIdentifier, ISSUE_IDENTIFIER);
    assert.equal(result.rawText, "@crew build");
  });

  test("@crew triage → command=triage", () => {
    const result = parseMention("Please @crew triage this issue", ISSUE_ID, ISSUE_IDENTIFIER);
    assert.ok(result !== null, "expected a CrewMention");
    assert.equal(result.command, "triage");
  });

  test("@crew status → command=status", () => {
    const result = parseMention("What's the status? @crew status", ISSUE_ID, ISSUE_IDENTIFIER);
    assert.ok(result !== null, "expected a CrewMention");
    assert.equal(result.command, "status");
  });

  test("case-insensitive: @Crew BUILD → command=build (normalised)", () => {
    const result = parseMention("@Crew BUILD", ISSUE_ID, ISSUE_IDENTIFIER);
    assert.ok(result !== null, "expected a CrewMention");
    assert.equal(result.command, "build");
  });

  test("no mention in body → null", () => {
    const result = parseMention(
      "Just a regular comment, no mention here.",
      ISSUE_ID,
      ISSUE_IDENTIFIER
    );
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// handleLinearWebhook tests
// ---------------------------------------------------------------------------

describe("handleLinearWebhook", () => {
  test("Comment/create with @crew build → returns CrewMention", () => {
    const payload = makeCommentPayload("@crew build");
    const result = handleLinearWebhook(payload);
    assert.ok(result !== null, "expected a CrewMention");
    assert.equal(result.command, "build");
    assert.equal(result.issueId, ISSUE_ID);
    assert.equal(result.issueIdentifier, ISSUE_IDENTIFIER);
  });

  test("Issue/update payload → null (not yet implemented)", () => {
    const payload = makeIssueUpdatePayload();
    const result = handleLinearWebhook(payload);
    assert.equal(result, null);
  });

  test("Comment/create with no @crew mention → null", () => {
    const payload = makeCommentPayload("Looking good, let's merge it.");
    const result = handleLinearWebhook(payload);
    assert.equal(result, null);
  });
});
