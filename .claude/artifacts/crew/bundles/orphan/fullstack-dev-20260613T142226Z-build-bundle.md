---
slice: unknown
builder: fullstack-dev
run_id: 20260613T142226Z
feat: FEAT-102
files_touched: ["docs/integrations/linear-teammate.md", "scripts/linear-sync/linear-types.mts", "scripts/linear-sync/mention-parser.mts", "scripts/linear-sync/webhook-handler.mts", "src/tests/linear-webhook.test.mts"]
files_read: []
diff_stat: { files: 0, additions: 0, deletions: 0 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-123: Linear teammate webhook handler + mention parser

- Created: 2026-06-13T14:22:26.422Z
- From: fullstack-dev
- To: lead
- Objective: Phase 1 foundation layer shipped: Linear webhook payload types, @crew mention parser, webhook router, 8 fixture-based unit tests, and setup guide doc.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - scripts/linear-sync/linear-types.mts
  - scripts/linear-sync/mention-parser.mts
  - scripts/linear-sync/webhook-handler.mts
  - src/tests/linear-webhook.test.mts
  - docs/integrations/linear-teammate.md
- Confidence: high
- Risks: scripts/linear-sync/ is outside tsc rootDir (intentional — files use @ts-nocheck); tsconfig TS2688 @types/node error is pre-existing not introduced here; LinearProvider stub at src/scripts/lib/task-store/providers/linear-provider.mts exists from FEAT-024 — not modified (follow-on slice concern); eslint bunx fails on Node due to missing @eslint/js package (pre-existing env issue; scripts/ is in ignores anyway); 1 pre-existing fail in full suite (slice-complete.test.mts path not found — unchanged)
- Suggested Next Handoff: SLICE-124: HTTP webhook server (bun serve) + Linear API reply client — POST /webhook/linear, signature verification via LOOP_LINEAR_WEBHOOK_SECRET, dispatch crew:builder on @crew build mention


## Diff

```diff

```

## Files touched

### docs/integrations/linear-teammate.md

```
# Linear Teammate Integration (FEAT-102)

> **Status:** Phase 1 — webhook handler + mention parser shipped. Full round-trip (issue → FEAT → PR → Linear status) in follow-on slice.

## Setup

1. Create a Linear webhook pointing to your server at `/webhook/linear`.
2. Set the `LOOP_LINEAR_WEBHOOK_SECRET` env var to your Linear webhook secret.
3. Run the webhook server (follow-on: `bun scripts/linear-sync/server.mts`).

## Supported @crew commands

| Mention | Action |
|---------|--------|
| `@crew triage` | Run PM triage on the issue body |
| `@crew build` | Dispatch crew:builder against the issue |
| `@crew status` | Post current slice status as a comment |

## Architecture

The mention parser (`scripts/linear-sync/mention-parser.mts`) extracts `@crew <cmd>` from comment bodies.
The webhook handler (`scripts/linear-sync/webhook-handler.mts`) routes Linear payloads to crew mentions.
A follow-on slice will add the HTTP webhook server and Linear API reply client.

```

### scripts/linear-sync/linear-types.mts

```
// @ts-nocheck — scripts/linear-sync/ is outside tsc rootDir; Bun runs directly.

export interface LinearWebhookPayload {
  type: "Issue" | "Comment" | "IssueLabel" | string;
  action: "create" | "update" | "remove" | string;
  organizationId: string;
  webhookTimestamp: string;
  data: LinearIssueData | LinearCommentData;
}

export interface LinearIssueData {
  id: string;
  identifier: string; // e.g. "ENG-123"
  title: string;
  description?: string;
  url: string;
  team: { id: string; name: string };
  assignee?: { id: string; name: string; email: string };
  state?: { name: string };
}

export interface LinearCommentData {
  id: string;
  body: string;
  url: string;
  issue: { id: string; identifier: string; title: string };
  user?: { id: string; name: string; email: string };
}

export type CrewCommand = "triage" | "build" | "status";

export interface CrewMention {
  command: CrewCommand;
  issueId: string;
  issueIdentifier: string;
  rawText: string;
}

```

### scripts/linear-sync/mention-parser.mts

```
// @ts-nocheck — scripts/linear-sync/ is outside tsc rootDir; Bun runs directly.

import type { CrewMention } from "./linear-types.mjs";

const MENTION_REGEX = /@crew\s+(triage|build|status)/i;

/**
 * Parse a `@crew <command>` mention from a Linear comment body.
 *
 * Returns a CrewMention when the body contains a recognised mention, or null
 * when no mention is present. Only the first match is returned — subsequent
 * mentions in the same comment are silently ignored.
 */
export function parseMention(
  body: string,
  issueId: string,
  issueIdentifier: string
): CrewMention | null {
  const match = body.match(MENTION_REGEX);
  if (!match) return null;
  return {
    command: match[1]!.toLowerCase() as CrewMention["command"],
    issueId,
    issueIdentifier,
    rawText: match[0]!
  };
}

```

### scripts/linear-sync/webhook-handler.mts

```
// @ts-nocheck — scripts/linear-sync/ is outside tsc rootDir; Bun runs directly.

import type { LinearWebhookPayload, LinearCommentData, CrewMention } from "./linear-types.mjs";
import { parseMention } from "./mention-parser.mjs";

/**
 * Route an inbound Linear webhook payload to a CrewMention action.
 *
 * Currently handles:
 *   - Comment / create: extract `@crew <cmd>` mention from comment body.
 *   - Issue / update: placeholder — assignment-to-crew-bot detection is a
 *     follow-on slice concern; returns null for now.
 *
 * All other payload types return null without throwing.
 */
export function handleLinearWebhook(payload: LinearWebhookPayload): CrewMention | null {
  if (payload.type === "Comment" && payload.action === "create") {
    const data = payload.data as LinearCommentData;
    if (data.body && data.issue) {
      return parseMention(data.body, data.issue.id, data.issue.identifier);
    }
  }
  if (payload.type === "Issue" && payload.action === "update") {
    // Detect assignment to crew bot — placeholder for future implementation.
    return null;
  }
  return null;
}

```

### src/tests/linear-webhook.test.mts

```
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

```

## Files read

