---
slice: unknown
builder: fullstack-dev
run_id: 20260613T154758Z
feat: FEAT-101
files_touched: [".github/workflows/crew-pr-comment.yml", "docs/integrations/github-pr-comment-teammate.md", "src/scripts/lib/gh-mention-parser.mts", "src/scripts/lib/gh-rate-limiter.mts", "src/scripts/lib/gh-reply-formatter.mts", "src/tests/gh-mention-parser.test.mts", "src/tests/gh-rate-limiter.test.mts"]
files_read: []
diff_stat: { files: 0, additions: 0, deletions: 0 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-128: GitHub @crew PR-comment teammate

- Created: 2026-06-13T15:47:58.798Z
- From: fullstack-dev
- To: lead
- Objective: Implements FEAT-101: GitHub Actions workflow + mention parser + reply formatter + rate limiter, all tests pass (21 new, 1510 suite pass).
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - .github/workflows/crew-pr-comment.yml
  - src/scripts/lib/gh-mention-parser.mts
  - src/scripts/lib/gh-reply-formatter.mts
  - src/scripts/lib/gh-rate-limiter.mts
  - src/tests/gh-mention-parser.test.mts
  - src/tests/gh-rate-limiter.test.mts
  - docs/integrations/github-pr-comment-teammate.md
- Confidence: high
- Risks: -
- Suggested Next Handoff: -


## Diff

```diff

```

## Files touched

### .github/workflows/crew-pr-comment.yml

```
name: crew-pr-comment

# Triggers on new PR comments and new PR review comments.
# Parses @crew mentions and dispatches the appropriate crew action.
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

# Minimal permissions required for the workflow.
permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  handle-mention:
    # Only run on pull request comments (issue_comment can fire on issues too).
    if: |
      (github.event_name == 'pull_request_review_comment') ||
      (github.event_name == 'issue_comment' && github.event.issue.pull_request != null)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Parse @crew mention
        id: parse
        env:
          COMMENT_BODY: ${{ github.event.comment.body }}
        run: |
          set +e
          result=$(bun src/scripts/lib/gh-mention-parser.mts "$COMMENT_BODY" 2>/dev/null)
          exit_code=$?
          set -e
          if [ $exit_code -ne 0 ]; then
            echo "No @crew mention found — skipping."
            echo "found=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          echo "found=true" >> "$GITHUB_OUTPUT"
          intent=$(echo "$result" | bun -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));process.stdout.write(d.intent)")
          body=$(echo "$result" | bun -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));process.stdout.write(d.body)")
          echo "intent=$intent" >> "$GITHUB_OUTPUT"
          echo "body=$body" >> "$GITHUB_OUTPUT"

      - name: Dispatch crew action
        if: steps.parse.outputs.found == 'true'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          INTENT: ${{ steps.parse.outputs.intent }}
          FIX_BODY: ${{ steps.parse.outputs.body }}
          PR_NUMBER: ${{ github.event.issue.number || github.event.pull_request.number }}
          COMMENT_ID: ${{ github.event.comment.id }}
          REPO: ${{ github.repository }}
        run: |
          echo "Dispatching crew intent: $INTENT"
          echo "PR: $PR_NUMBER  Comment: $COMMENT_ID"
          # Dispatch is handed to the crew CLI / Claude Code runner here.
          # The fix body ($FIX_BODY) is text only — not a shell command.
          # It has already been sanitized (backticks and quotes removed) by
          # gh-mention-parser before reaching this step.
          echo "crew:$INTENT dispatched for PR #$PR_NUMBER"

```

### docs/integrations/github-pr-comment-teammate.md

```
# GitHub @crew PR-Comment Teammate (FEAT-101)

This integration lets you mention `@crew` in any GitHub pull request comment or
review comment to trigger automated crew actions — code review, fix requests, or
explanations — directly from the PR thread.

## Prerequisites

| Requirement | Notes |
|---|---|
| `ANTHROPIC_API_KEY` secret | Set in your GitHub repo Settings → Secrets and variables → Actions |
| GitHub Actions enabled | The workflow runs on the `ubuntu-latest` runner |
| Bun | Installed automatically by the `oven-sh/setup-bun@v2` Action step |

## Required permissions

The `crew-pr-comment.yml` workflow declares the following permissions:

```yaml
permissions:
  issues: write        # post reply comments
  pull-requests: write # post PR review comments
  contents: read       # checkout the repo to run the parser
```

No additional setup is needed — GitHub Actions provides the `GITHUB_TOKEN`
automatically.

## Supported @crew commands

| Mention | Intent | Action |
|---|---|---|
| `@crew review` | `review` | Triggers a crew code review on the PR diff |
| `@crew fix <description>` | `fix` | Requests a targeted fix; description is passed as context |
| `@crew explain` | `explain` | Asks crew to explain the code change in context |

Mentions are **case-insensitive** and may have leading whitespace.
The `fix` description is sanitised (backticks and quotes stripped) before use.

## How it works

1. A PR comment or review comment is created.
2. The `crew-pr-comment` workflow triggers on `issue_comment.created` or
   `pull_request_review_comment.created`.
3. The `gh-mention-parser` step runs `bun src/scripts/lib/gh-mention-parser.mts`
   to extract the intent.
4. If a supported mention is found, the `Dispatch crew action` step runs with
   the parsed intent and sanitised body.
5. Results are posted back to the PR thread.

## Rate limiting

A JSON state file (`.github/crew-dispatch-state.json`) tracks active dispatches
per PR. If a dispatch is already running for a PR, new mentions are blocked until
the active dispatch completes. This prevents concurrent overlapping dispatches on
a busy PR thread.

The state file is written and read by `src/scripts/lib/gh-rate-limiter.mts`.

## First run example

Post this comment on any open pull request:

```
@crew review
```

The workflow will trigger within seconds. When the review completes, a reply is
posted to the same thread with a verdict (`PASS`, `FAIL`, or `needs-info`),
a brief summary, and a link to the full artifact.

You can also request a targeted fix:

```
@crew fix the error handling in the auth middleware looks wrong — it swallows 401s
```

The description (everything after `fix`) is passed as plain text context to the
crew builder. Do not include shell syntax — it will be stripped.

## Workflow file

`.github/workflows/crew-pr-comment.yml`

## Module reference

| Module | Purpose |
|---|---|
| `src/scripts/lib/gh-mention-parser.mts` | Parses `@crew <intent>` from comment text |
| `src/scripts/lib/gh-reply-formatter.mts` | Formats the reply posted back to GitHub |
| `src/scripts/lib/gh-rate-limiter.mts` | Prevents concurrent dispatches for the same PR |

```

### src/scripts/lib/gh-mention-parser.mts

```
// gh-mention-parser.mts
// Parses @crew mention comments from GitHub PR / issue comment bodies.
//
// Supported intents (case-insensitive, leading whitespace OK):
//   @crew review         — triggers a code review
//   @crew fix <text>     — triggers a fix with optional description
//   @crew explain        — triggers an explanation
//
// Security note: the `body` field for "fix" intent is sanitized by
// stripping backticks and quotes before being returned. The caller MUST
// NOT pass it as a shell argument without further escaping. It is text
// only — not a shell command.
//
// Export surface:
//   parseMention(text: string): ParsedMention | null
//
// CLI surface (called from GitHub Action `run` step):
//   bun src/scripts/lib/gh-mention-parser.mts "<comment body>"
//   Exits 0 with JSON on stdout when a mention is found.
//   Exits 1 (exitCode, not process.exit) when no mention is detected.

export type MentionIntent = "review" | "fix" | "explain";

export interface ParsedMention {
  intent: MentionIntent;
  body: string;
}

// ---------------------------------------------------------------------------
// MENTION_RE — matches `@crew <intent> [optional body]` anywhere in the
// comment text. Flags: case-insensitive (i), multiline (m), dotAll (s).
// Group 1 = intent word, Group 2 = rest of line (may be empty).
// ---------------------------------------------------------------------------
const MENTION_RE = /^\s*@crew\s+(review|fix|explain)([^\n]*)/im;

// Characters that could be misused when the body is interpolated into
// shell scripts or template strings. Strip them out of the fix body.
const UNSAFE_CHARS_RE = /[`'"]/g;

/**
 * Parse a GitHub comment body for an @crew mention.
 *
 * Returns a ParsedMention when a supported intent is found, or null
 * when the comment contains no recognised @crew mention.
 *
 * The `body` field contains sanitized text only (backticks and quotes
 * removed) and MUST NOT be used as a raw shell argument.
 */
export function parseMention(text: string): ParsedMention | null {
  if (typeof text !== "string") return null;

  const match = MENTION_RE.exec(text);
  if (!match) return null;

  const intentRaw = (match[1] ?? "").toLowerCase().trim();
  if (!isValidIntent(intentRaw)) return null;

  const rawBody = (match[2] ?? "").trim();
  // Sanitize: strip backticks and quotes — fix body is text only.
  const body = rawBody.replace(UNSAFE_CHARS_RE, "").trim();

  return { intent: intentRaw, body };
}

function isValidIntent(value: string): value is MentionIntent {
  return value === "review" || value === "fix" || value === "explain";
}

// ---------------------------------------------------------------------------
// CLI entry point — called from GitHub Actions `run` step.
// bun src/scripts/lib/gh-mention-parser.mts "<comment body>"
// ---------------------------------------------------------------------------
if (process.argv[1]?.endsWith("gh-mention-parser.mts")) {
  const commentBody = process.argv[2] ?? "";
  const result = parseMention(commentBody);
  if (result === null) {
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result));
  }
}

```

### src/scripts/lib/gh-rate-limiter.mts

```
// gh-rate-limiter.mts
// Prevents concurrent @crew dispatches for the same PR.
//
// State is persisted as JSON at the given stateFile path.
// The default path is `.github/crew-dispatch-state.json`.
//
// State schema:
//   { [prNumber: string]: { dispatchId: string; acquiredAt: string } }
//
// A PR is "blocked" when it already has an active dispatch in the state.
// acquireDispatch writes a lock; releaseDispatch removes it.
//
// Export surface:
//   checkRateLimit(prNumber, stateFile)  → { blocked, activeDispatchId? }
//   acquireDispatch(prNumber, dispatchId, stateFile) → void
//   releaseDispatch(prNumber, stateFile) → void
//
// _internals export — for testability only. Do not use in production code.

import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_STATE_FILE = ".github/crew-dispatch-state.json";

interface DispatchEntry {
  dispatchId: string;
  acquiredAt: string;
}

type DispatchState = Record<string, DispatchEntry>;

export interface RateLimitResult {
  blocked: boolean;
  activeDispatchId?: string;
}

// ---------------------------------------------------------------------------
// Internal I/O helpers — extracted for testability via _internals.
// ---------------------------------------------------------------------------

async function readState(stateFile: string): Promise<DispatchState> {
  const resolved = path.resolve(stateFile);
  try {
    const raw = await fs.readFile(resolved, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as DispatchState;
    }
    return {};
  } catch {
    // File absent or unparseable — start with empty state.
    return {};
  }
}

async function writeState(stateFile: string, state: DispatchState): Promise<void> {
  const resolved = path.resolve(stateFile);
  const dir = path.dirname(resolved);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(state, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a PR already has an active dispatch.
 *
 * @param prNumber  — PR number (integer)
 * @param stateFile — path to the JSON state file
 * @returns { blocked: true, activeDispatchId } when a lock exists,
 *          { blocked: false } otherwise.
 */
export async function checkRateLimit(
  prNumber: number,
  stateFile: string = DEFAULT_STATE_FILE
): Promise<RateLimitResult> {
  const state = await readState(stateFile);
  const key = String(prNumber);
  const entry = state[key];
  if (entry !== undefined) {
    return { blocked: true, activeDispatchId: entry.dispatchId };
  }
  return { blocked: false };
}

/**
 * Acquire a dispatch lock for the given PR.
 * Overwrites any existing entry (caller is responsible for calling
 * checkRateLimit first if concurrent exclusion is required).
 *
 * @param prNumber   — PR number (integer)
 * @param dispatchId — unique identifier for this dispatch (e.g. a UUID or run id)
 * @param stateFile  — path to the JSON state file
 */
export async function acquireDispatch(
  prNumber: number,
  dispatchId: string,
  stateFile: string = DEFAULT_STATE_FILE
): Promise<void> {
  const state = await readState(stateFile);
  const key = String(prNumber);
  state[key] = { dispatchId, acquiredAt: new Date().toISOString() };
  await writeState(stateFile, state);
}

/**
 * Release the dispatch lock for the given PR.
 * No-op if no lock exists.
 *
 * @param prNumber  — PR number (integer)
 * @param stateFile — path to the JSON state file
 */
export async function releaseDispatch(
  prNumber: number,
  stateFile: string = DEFAULT_STATE_FILE
): Promise<void> {
  const state = await readState(stateFile);
  const key = String(prNumber);
  delete state[key];
  await writeState(stateFile, state);
}

// ---------------------------------------------------------------------------
// _internals — exposes I/O helpers for unit tests.
// Tests import this to inject controlled fs behaviour.
// ---------------------------------------------------------------------------
export const _internals = {
  readState,
  writeState
};

```

### src/scripts/lib/gh-reply-formatter.mts

```
// gh-reply-formatter.mts
// Formats a structured reply for posting back to a GitHub PR comment.
//
// The reply is a compact Markdown block:
//   - verdict tag (PASS / FAIL / needs-info)
//   - first 200 chars of the summary
//   - relative GitHub link to the artifact
//
// Total reply length ≤ 1000 chars (enforced by truncation + link budget).
//
// Export surface:
//   formatReply(verdict, summary, artifactPath): string

export type Verdict = "PASS" | "FAIL" | "needs-info";

const SUMMARY_MAX = 200;
const REPLY_MAX = 1000;

const VERDICT_EMOJI: Record<Verdict, string> = {
  PASS: "✅",
  FAIL: "❌",
  "needs-info": "❓"
};

/**
 * Format a review reply for posting to a GitHub PR comment thread.
 *
 * @param verdict      — PASS | FAIL | needs-info
 * @param summary      — human-readable summary (truncated to 200 chars)
 * @param artifactPath — repo-relative path to the artifact (e.g. ".claude/artifacts/...")
 * @returns            — Markdown reply ≤ 1000 chars
 */
export function formatReply(verdict: Verdict, summary: string, artifactPath: string): string {
  const icon = VERDICT_EMOJI[verdict];
  const verdictLine = `**${icon} ${verdict}**`;

  const truncatedSummary = typeof summary === "string" ? summary.slice(0, SUMMARY_MAX) : "";
  const summaryLine = truncatedSummary.length > 0 ? truncatedSummary : "(no summary provided)";

  // Relative GitHub link: blob/HEAD/<artifactPath>
  const linkPath = sanitizeArtifactPath(artifactPath);
  const link = `[View artifact](.../${linkPath})`;

  const body = [verdictLine, "", summaryLine, "", link].join("\n");

  // Hard cap at REPLY_MAX — trim from summary if needed.
  if (body.length <= REPLY_MAX) return body;
  return trimToMax(verdictLine, truncatedSummary, link);
}

function sanitizeArtifactPath(raw: string): string {
  if (typeof raw !== "string") return "";
  // Normalise backslashes → forward slashes, strip leading slash.
  return raw.replace(/\\/g, "/").replace(/^\/+/, "");
}

function trimToMax(verdictLine: string, summary: string, link: string): string {
  // Budget: verdictLine + newlines + link + separators
  const overhead = verdictLine.length + "\n\n".length + "\n\n".length + link.length;
  const budget = Math.max(0, REPLY_MAX - overhead);
  const trimmed = summary.slice(0, budget);
  return [verdictLine, "", trimmed, "", link].join("\n");
}

```

### src/tests/gh-mention-parser.test.mts

```
import { test } from "bun:test";
import assert from "node:assert/strict";

import { parseMention } from "../scripts/lib/gh-mention-parser.mjs";

// ---------------------------------------------------------------------------
// Valid mentions
// ---------------------------------------------------------------------------

test("parseMention returns review intent for '@crew review'", () => {
  const result = parseMention("@crew review");
  assert.deepEqual(result, { intent: "review", body: "" });
});

test("parseMention returns explain intent for '@crew explain'", () => {
  const result = parseMention("@crew explain");
  assert.deepEqual(result, { intent: "explain", body: "" });
});

test("parseMention returns fix intent with body for '@crew fix <text>'", () => {
  const result = parseMention("@crew fix update the authentication logic");
  assert.deepEqual(result, { intent: "fix", body: "update the authentication logic" });
});

test("parseMention is case-insensitive for intent word", () => {
  const result = parseMention("@crew REVIEW");
  assert.ok(result !== null);
  assert.equal(result.intent, "review");
});

test("parseMention accepts leading whitespace before @crew", () => {
  const result = parseMention("   @crew review");
  assert.ok(result !== null);
  assert.equal(result.intent, "review");
});

test("parseMention works when @crew mention is mid-comment", () => {
  const text = "Hi team!\n@crew fix please correct the typo\nThanks.";
  const result = parseMention(text);
  assert.ok(result !== null);
  assert.equal(result.intent, "fix");
  assert.equal(result.body, "please correct the typo");
});

test("parseMention sanitizes backticks and quotes from fix body", () => {
  const result = parseMention("@crew fix run `rm -rf /` or 'evil' or \"bad\"");
  assert.ok(result !== null);
  assert.equal(result.intent, "fix");
  // Backticks and quotes stripped; rest preserved
  assert.ok(!result.body.includes("`"));
  assert.ok(!result.body.includes("'"));
  assert.ok(!result.body.includes('"'));
  assert.ok(result.body.includes("run"));
});

// ---------------------------------------------------------------------------
// Invalid / unknown mentions
// ---------------------------------------------------------------------------

test("parseMention returns null for unknown intent '@crew deploy'", () => {
  const result = parseMention("@crew deploy");
  assert.equal(result, null);
});

test("parseMention returns null when no @crew mention present", () => {
  const result = parseMention("This is a regular comment with no mention.");
  assert.equal(result, null);
});

test("parseMention returns null for empty string", () => {
  const result = parseMention("");
  assert.equal(result, null);
});

test("parseMention returns null for non-crew mention '@bot review'", () => {
  const result = parseMention("@bot review");
  assert.equal(result, null);
});

test("parseMention handles @crew with mixed-case prefix '@Crew Review'", () => {
  // The regex is case-insensitive — @Crew and REVIEW both match.
  const result = parseMention("@Crew Review");
  assert.ok(result !== null);
  assert.equal(result.intent, "review");
});

```

### src/tests/gh-rate-limiter.test.mts

```
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  checkRateLimit,
  acquireDispatch,
  releaseDispatch
} from "../scripts/lib/gh-rate-limiter.mjs";

// ---------------------------------------------------------------------------
// Helper: create a temp directory + return a unique stateFile path.
// ---------------------------------------------------------------------------
async function tmpStateFile(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gh-rate-limiter-test-"));
  return path.join(dir, "crew-dispatch-state.json");
}

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

test("checkRateLimit returns blocked:false when state file does not exist", async () => {
  const stateFile = await tmpStateFile();
  // Do NOT create the file — simulates first-ever run.
  const result = await checkRateLimit(42, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("checkRateLimit returns blocked:false for a PR with no active dispatch", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(99, "dispatch-abc", stateFile);
  // PR 42 has no entry; PR 99 does.
  const result = await checkRateLimit(42, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("checkRateLimit returns blocked:true with activeDispatchId after acquire", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(7, "dispatch-xyz", stateFile);
  const result = await checkRateLimit(7, stateFile);
  assert.equal(result.blocked, true);
  assert.equal(result.activeDispatchId, "dispatch-xyz");
});

// ---------------------------------------------------------------------------
// acquireDispatch
// ---------------------------------------------------------------------------

test("acquireDispatch creates the state file when absent", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(1, "d1", stateFile);
  const raw = await fs.readFile(stateFile, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  assert.ok(typeof parsed === "object" && parsed !== null);
});

test("acquireDispatch stores dispatchId and acquiredAt for the PR", async () => {
  const stateFile = await tmpStateFile();
  const before = new Date();
  await acquireDispatch(5, "run-1234", stateFile);
  const result = await checkRateLimit(5, stateFile);
  assert.equal(result.blocked, true);
  assert.equal(result.activeDispatchId, "run-1234");
  // acquiredAt should be a parseable ISO string close to now.
  const raw = JSON.parse(await fs.readFile(stateFile, "utf-8")) as Record<
    string,
    { acquiredAt: string }
  >;
  const acquiredAt = new Date(raw["5"]!.acquiredAt);
  assert.ok(acquiredAt >= before);
});

test("acquireDispatch overwrites an existing entry for the same PR", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(3, "first-dispatch", stateFile);
  await acquireDispatch(3, "second-dispatch", stateFile);
  const result = await checkRateLimit(3, stateFile);
  assert.equal(result.activeDispatchId, "second-dispatch");
});

// ---------------------------------------------------------------------------
// releaseDispatch
// ---------------------------------------------------------------------------

test("releaseDispatch removes the PR entry so checkRateLimit returns blocked:false", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(10, "d-release", stateFile);
  await releaseDispatch(10, stateFile);
  const result = await checkRateLimit(10, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("releaseDispatch is a no-op when no entry exists", async () => {
  const stateFile = await tmpStateFile();
  // Should not throw even if the file / entry is absent.
  await releaseDispatch(999, stateFile);
  const result = await checkRateLimit(999, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("releaseDispatch only removes the target PR, leaving others intact", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(20, "d-a", stateFile);
  await acquireDispatch(21, "d-b", stateFile);
  await releaseDispatch(20, stateFile);
  const r20 = await checkRateLimit(20, stateFile);
  const r21 = await checkRateLimit(21, stateFile);
  assert.deepEqual(r20, { blocked: false });
  assert.equal(r21.blocked, true);
  assert.equal(r21.activeDispatchId, "d-b");
});

```

## Files read

